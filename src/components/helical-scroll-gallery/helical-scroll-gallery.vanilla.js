// 3D Helical Scroll Gallery — no framework required.
//
//   import mount from "./helical-scroll-gallery.vanilla.js";
//   const gallery = mount(document.getElementById("helical-scroll-gallery"));
//   gallery.destroy();
//
// Three.js is pulled from a CDN at run time — the same r128 UMD build the
// Framer component uses — so there is nothing to bundle and no import to
// resolve. The single-file export strips the `export` below and calls `mount`
// directly.

/* @controls:start */
const DEFAULTS = {
  title: "Design In\nMotion",
  subtitle: "Scroll to explore sequence",
  background: "#111111",
  fogDensity: 0.05,
  scrollLength: 600,
  smoothing: 0.6,
  cardCount: 12,
  cards: [],
  cardWidth: 1.6,
  cardHeight: 2.0,
  radiusX: 3.8,
  radiusZ: 2.5,
  pitch: 1.2,
  turns: 2.5,
  zOffset: -1.5,
  yOffset: -2.5,
  minScale: 0.6,
  maxScale: 1.3,
  tilt: 0.15,
  fov: 45,
  cameraZ: 10,
  autoPlayOnCanvas: true,
};
/* @controls:end */

const THREE_SRC = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const FALLBACK_COLORS = ["#1a1a1a", "#222222", "#2a2a2a", "#333333", "#111111"];
const UI_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

let threePromise = null;

function loadThree() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;

  threePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="' + THREE_SRC + '"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.THREE));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = THREE_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(window.THREE);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return threePromise;
}

const clamp = (min, max, v) => Math.min(max, Math.max(min, v));

function el(tag, styles, text) {
  const node = document.createElement(tag);
  if (styles) Object.assign(node.style, styles);
  if (text != null) node.textContent = text;
  return node;
}

/**
 * The React build reads scroll through Framer Motion's `useScroll` with
 * offset ["start start", "end end"] — the root's travel through its own
 * sticky range, which is what this measures off the bounding rect.
 */
function scrollProgress(root) {
  const rect = root.getBoundingClientRect();
  const travel = rect.height - window.innerHeight;
  if (travel <= 0) return 0;
  return clamp(0, 1, -rect.top / travel);
}

export default function mount(target, options) {
  const opts = { ...DEFAULTS, ...(options || {}) };

  /* ---------- DOM ---------- */
  const root = el("div", {
    position: "relative",
    width: "100%",
    height: opts.scrollLength + "vh",
    backgroundColor: opts.background,
    color: "#fff",
  });

  const sticky = el("div", {
    position: "sticky",
    top: 0,
    width: "100%",
    height: "100vh",
    overflow: "hidden",
  });

  const stage = el("div", {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
  });

  const overlay = el("div", {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "3rem",
    fontFamily: UI_FONT,
  });

  const titleEl = el(
    "div",
    {
      fontSize: "5rem",
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "-0.03em",
      opacity: 0.15,
      lineHeight: 0.9,
      whiteSpace: "pre-line",
    },
    opts.title
  );

  const subtitleEl = el(
    "div",
    {
      fontSize: "0.9rem",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      opacity: 0.5,
    },
    opts.subtitle
  );

  overlay.append(titleEl, subtitleEl);
  sticky.append(stage, overlay);
  root.appendChild(sticky);
  target.appendChild(root);

  /* ---------- Scene ---------- */
  let disposed = false;
  let frameId = 0;
  let teardown = () => {};

  loadThree().then((THREE) => {
    if (!THREE || disposed) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(opts.background).getHex(), opts.fogDensity);

    let width = stage.clientWidth || 1;
    let height = stage.clientHeight || 1;

    const camera = new THREE.PerspectiveCamera(opts.fov, width / height, 0.1, 100);
    camera.position.set(0, 0, opts.cameraZ);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    stage.appendChild(renderer.domElement);

    function getHelixPoint(t) {
      const angle = t * Math.PI * opts.turns;
      return new THREE.Vector3(
        Math.sin(angle) * opts.radiusX,
        t * opts.pitch * 4 + opts.yOffset,
        Math.cos(angle) * opts.radiusZ + opts.zOffset
      );
    }

    // Label-on-colour card, shown until the artwork arrives — and kept as the
    // card's face when no image was supplied at all.
    function placeholderTexture(text, color) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 640;
      const ctx = c.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "Bold 40px Sans-Serif";
      ctx.textAlign = "center";
      ctx.fillText(text, c.width / 2, c.height / 2);
      return new THREE.CanvasTexture(c);
    }

    const items = Array.isArray(opts.cards) ? opts.cards : [];
    const total = Math.max(1, Math.round(opts.cardCount));
    const meshes = [];
    const textures = [];
    const materials = [];

    // Anchored bottom-centre so the helix threads the base of each card.
    const geometry = new THREE.PlaneGeometry(opts.cardWidth, opts.cardHeight);
    geometry.translate(0, opts.cardHeight / 2, 0);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    for (let i = 0; i < total; i++) {
      const item = items.length ? items[i % items.length] : undefined;
      const label = (item && item.label) || "CARD " + (i + 1);
      const color = (item && item.color) || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

      const texture = placeholderTexture(label, color);
      textures.push(texture);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      materials.push(material);

      const raw = item && item.image;
      const src = typeof raw === "string" ? raw : raw && raw.src ? raw.src : null;
      if (src) {
        loader.load(src, (tex) => {
          if (disposed) {
            tex.dispose();
            return;
          }
          tex.minFilter = THREE.LinearFilter;
          material.map = tex;
          material.needsUpdate = true;
          textures.push(tex);
        });
      }

      const card = new THREE.Mesh(geometry, material);
      card.userData = { offset: i / total };
      scene.add(card);
      meshes.push(card);
    }

    let smoothed = scrollProgress(root);
    let lastTime = performance.now();

    function animate() {
      frameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const progress = scrollProgress(root);

      // Exponential catch-up standing in for GSAP's `scrub: <seconds>`.
      const tau = Math.max(0.0001, opts.smoothing / 3);
      smoothed += (progress - smoothed) * (1 - Math.exp(-dt / tau));

      meshes.forEach((card) => {
        let t = (card.userData.offset + smoothed) % 1;
        if (t < 0) t += 1;

        const pos = getHelixPoint(t);
        card.position.copy(pos);

        card.lookAt(getHelixPoint((t + 0.01) % 1));
        card.rotation.y += Math.PI / 2; // alignment correction
        card.rotation.z += Math.sin(t * Math.PI) * opts.tilt;

        const scale = clamp(opts.minScale, opts.maxScale, (pos.z + 4) / 5);
        card.scale.set(scale, scale, scale);
      });

      if (scene.fog) scene.fog.density = opts.fogDensity;

      renderer.render(scene, camera);
    }

    animate();

    const resize = () => {
      width = stage.clientWidth || 1;
      height = stage.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(stage);
    window.addEventListener("resize", resize);

    teardown = () => {
      cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", resize);
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === stage) stage.removeChild(renderer.domElement);
    };
  });

  return {
    destroy() {
      disposed = true;
      teardown();
      root.remove();
    },
  };
}
