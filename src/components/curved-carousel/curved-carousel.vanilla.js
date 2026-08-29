// Curved Carousel — no framework required.
//
//   import mount from "./curved-carousel.vanilla.js";
//   const ring = mount(document.getElementById("curved-carousel"));
//   ring.destroy();
//
// All styling is injected by this file — no stylesheet needed.

const DEFAULT_IMAGES = [
  "https://picsum.photos/id/1080/900/650",
  "https://picsum.photos/id/1074/900/650",
  "https://picsum.photos/id/1048/900/650",
  "https://picsum.photos/id/1039/900/650",
  "https://picsum.photos/id/106/900/650",
  "https://picsum.photos/id/1043/900/650",
  "https://picsum.photos/id/1076/900/650",
  "https://picsum.photos/id/1069/900/650",
  "https://picsum.photos/id/1044/900/650",
  "https://picsum.photos/id/1015/900/650",
];

/* @controls:start */
const DEFAULTS = {
  autoSpeed: 5,
  dragSensitivity: 0.35,
  panelWidth: 320,
  panelAspect: 0.72,
  panelRadius: 6,
  background: "#ffffff",
  textColor: "#1c1a16",
  accent: "#8b7f6e",
  kicker: "Studio Editions — Architecture & Interiors",
  heading: "The space you imagined",
  headingEmphasis: "has never been built before.",
  showKicker: true,
  showHeading: true,
  showHint: true,
};
/* @controls:end */

const SANS = '"Helvetica Neue",Arial,sans-serif';
const SERIF = '"Iowan Old Style","Georgia",serif';

function el(tag, styles, text) {
  const node = document.createElement(tag);
  if (styles) Object.assign(node.style, styles);
  if (text != null) node.textContent = text;
  return node;
}

export default function mount(target, options) {
  const opts = { ...DEFAULTS, images: DEFAULT_IMAGES, ...options };
  const images = opts.images;
  const N = images.length;
  const ANGLE_STEP = 360 / N;

  const root = el("div", {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "38px",
    padding: "40px 0",
    minHeight: "600px",
    background: opts.background,
    color: opts.textColor,
    fontFamily: SERIF,
    userSelect: "none",
    overflow: "hidden",
  });
  root.className = "curved-carousel";

  // The edge fades have to match the background, so they are generated here.
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    .curved-carousel-stage::before,
    .curved-carousel-stage::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      width: 14%;
      z-index: 5;
      pointer-events: none;
    }
    .curved-carousel-stage::before {
      left: 0;
      background: linear-gradient(90deg, ${opts.background} 12%, transparent);
    }
    .curved-carousel-stage::after {
      right: 0;
      background: linear-gradient(270deg, ${opts.background} 12%, transparent);
    }
    .curved-carousel-stage.dragging { cursor: grabbing; }
    @media (max-width: 640px) {
      .curved-carousel-stage::before,
      .curved-carousel-stage::after { width: 8%; }
    }
  `;
  root.appendChild(styleTag);

  if (opts.showKicker) {
    root.appendChild(
      el(
        "div",
        {
          fontFamily: SANS,
          fontSize: "11px",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: opts.accent,
          textAlign: "center",
        },
        opts.kicker
      )
    );
  }

  if (opts.showHeading) {
    const h1 = el("h1", {
      margin: "0",
      fontWeight: "400",
      fontSize: "clamp(22px, 3.4vw, 40px)",
      textAlign: "center",
      letterSpacing: "0.01em",
      maxWidth: "820px",
      lineHeight: "1.15",
    });
    h1.appendChild(document.createTextNode(opts.heading));
    h1.appendChild(document.createElement("br"));
    h1.appendChild(el("em", { fontStyle: "italic", color: opts.accent }, opts.headingEmphasis));
    root.appendChild(h1);
  }

  const stage = el("div", {
    width: "100%",
    height: "clamp(260px, 52vh, 480px)",
    perspective: "clamp(720px, 120vw, 1700px)",
    perspectiveOrigin: "50% 38%",
    cursor: "grab",
    position: "relative",
    touchAction: "pan-y",
  });
  stage.className = "curved-carousel-stage";

  const ring = el("div", {
    position: "absolute",
    top: "0",
    left: "50%",
    width: "0",
    height: "100%",
    transformStyle: "preserve-3d",
    willChange: "transform",
  });

  const panels = images.map((src) => {
    const panel = el("div", {
      position: "absolute",
      top: "50%",
      left: "0",
      backfaceVisibility: "hidden",
      borderRadius: opts.panelRadius + "px",
      overflow: "hidden",
      boxShadow: "0 30px 60px -20px rgba(20,16,8,0.35)",
      background: "#111",
    });

    const img = el("img", {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      pointerEvents: "none",
    });
    img.src = src;
    img.alt = "";
    img.draggable = false;

    panel.appendChild(img);
    panel.appendChild(
      el("div", {
        position: "absolute",
        inset: "0",
        background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)",
      })
    );

    ring.appendChild(panel);
    return panel;
  });

  stage.appendChild(ring);
  root.appendChild(stage);

  if (opts.showHint) {
    const hint = el("div", {
      fontFamily: SANS,
      fontSize: "11px",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: opts.accent,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    });
    hint.appendChild(document.createTextNode("Drag to explore"));
    hint.appendChild(
      el("span", {
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        background: opts.accent,
        display: "inline-block",
      })
    );
    hint.appendChild(
      document.createTextNode(opts.autoSpeed > 0 ? "Auto-playing" : "Paused")
    );
    root.appendChild(hint);
  }

  target.appendChild(root);

  // ---- layout -------------------------------------------------------------
  function layout() {
    const w = stage.clientWidth;
    const frac = w < 640 ? 0.34 : w < 1024 ? 0.3 : 0.26;
    const pw = Math.min(opts.panelWidth, w * frac);
    const ph = pw * opts.panelAspect;
    const radius = pw / 2 / Math.tan(Math.PI / N);

    panels.forEach((panel, i) => {
      panel.style.width = pw + "px";
      panel.style.height = ph + "px";
      panel.style.marginTop = -ph / 2 + "px";
      panel.style.marginLeft = -pw / 2 + "px";
      panel.style.transform =
        "rotateY(" + i * ANGLE_STEP + "deg) translateZ(" + radius + "px)";
    });
  }

  layout();

  // ---- rotation -----------------------------------------------------------
  let rotation = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartRotation = 0;
  let velocity = 0;
  let lastMoveTime = 0;
  let lastMoveX = 0;
  let resumeAutoAt = 0;
  let lastTs = performance.now();
  let rafId = null;

  function render() {
    ring.style.transform = "translateX(-50%) rotateY(" + rotation + "deg)";
  }

  function tick(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (dragging) {
      // handled in onMove
    } else if (Math.abs(velocity) > 0.5) {
      rotation -= velocity * dt;
      velocity *= 1 - Math.min(1, dt * 3.2);
      if (Math.abs(velocity) < 0.5) velocity = 0;
    } else if (ts > resumeAutoAt) {
      rotation -= opts.autoSpeed * dt;
    }

    render();
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  function onMove(e) {
    if (!dragging) return;
    const x = e.clientX;
    rotation = dragStartRotation + (x - dragStartX) * opts.dragSensitivity;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    const instV = ((x - lastMoveX) * opts.dragSensitivity) / (dt / 1000);
    velocity = velocity * 0.7 + -instV * 0.3;
    lastMoveX = x;
    lastMoveTime = now;
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("dragging");
    resumeAutoAt = performance.now() + 1400;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  }

  function onDown(e) {
    if (opts.dragSensitivity <= 0) return;
    dragging = true;
    velocity = 0;
    stage.classList.add("dragging");
    dragStartX = e.clientX;
    dragStartRotation = rotation;
    lastMoveX = e.clientX;
    lastMoveTime = performance.now();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  stage.addEventListener("pointerdown", onDown);
  window.addEventListener("resize", layout);
  render();

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", layout);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      root.remove();
    },
  };
}
