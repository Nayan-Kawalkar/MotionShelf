// Scroll Assemble Image — no framework required.
//
//   import mount from "./scroll-assemble-image.vanilla.js";
//   const assemble = mount(document.getElementById("scroll-assemble-image"));
//   assemble.destroy();
//
// Drop it into the normal page flow (not an absolutely positioned layer, or
// the internal sticky pin cannot work) and give the page sections above and
// below it. The component builds its own scroll track: 100vh of pin plus
// `scrollDistance` of travel.
//
// Seven assembly styles and seven arrival orders. Framer Motion's useScroll,
// useSpring and per-tile useTransform are replaced by a scroll measurement off
// the bounding rect, a spring integrator, and direct style writes in one rAF
// loop. The single-file export strips the `export` and calls `mount` directly.

/* @controls:start */
const DEFAULTS = {
  image: "https://picsum.photos/id/106/1600/900",
  preset: "scatter",
  order: "auto",
  columns: 4,
  rows: 3,
  imageWidth: 800,
  imageHeight: 450,
  gap: 0,
  radius: 0,
  scrollDistance: 150,
  smoothing: 1.2,
  stagger: 0.6,
  duration: 0.5,
  easePower: 2,
  intensity: 1,
  spread: 60,
  scatterX: 120,
  scatterY: 120,
  depth: 900,
  perspective: 1200,
  turns: 1,
  scaleMin: 0.4,
  scaleRange: 0.4,
  rotation: 90,
  blur: 8,
  blurChance: 0.7,
  opacityMin: 0.2,
  opacityRange: 0.5,
  seed: 1,
  background: "#0d0d0d",
  showSwitcher: true,
  switcherItems: ["scatter", "depth", "edges", "spiral", "wave", "glitch", "iris"],
  switcherPosition: "bottom",
  switcherAccent: "#ffffff",
  switcherTint: "rgba(255,255,255,0.07)",
  previewDuration: 1.6,
};
/* @controls:end */

const STYLE_TITLES = {
  scatter: "Scatter",
  depth: "Depth",
  edges: "Edges",
  spiral: "Spiral",
  wave: "Wave",
  glitch: "Glitch",
  iris: "Iris",
};

const AUTO_ORDER = {
  scatter: "random",
  depth: "random",
  edges: "outward",
  spiral: "spiral",
  wave: "diagonal",
  glitch: "random",
  iris: "center",
};

const SWITCHER_FONT =
  "500 13px/1 -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

/* ------------------------------ helpers ------------------------------- */

// Small deterministic PRNG so the scatter is identical everywhere.
function mulberry32(a) {
  let s = Math.floor(a) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// The preview tween's ease, [0.22, 1, 0.36, 1], solved by bisection — close
// enough at 60fps and cheaper than carrying a full bezier solver.
function easeOutExpoish(t) {
  const cx = 3 * 0.22;
  const bx = 3 * (0.36 - 0.22) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * 1;
  const by = 3 * (1 - 1) - cy;
  const ay = 1 - cy - by;
  let lo = 0;
  let hi = 1;
  let u = t;
  for (let i = 0; i < 18; i++) {
    const x = ((ax * u + bx) * u + cx) * u;
    if (x < t) lo = u;
    else hi = u;
    u = (lo + hi) / 2;
  }
  return ((ay * u + by) * u + cy) * u;
}

/* ------------------------------ ordering ------------------------------ */

function computeOrder(kind, cols, rows, jitter, rand) {
  const n = cols * rows;
  const idx = Array.from({ length: n }, (_, i) => i);
  const rank = [];

  if (kind === "random") {
    shuffle(idx, rand).forEach((tile, slot) => {
      rank[tile] = slot;
    });
    return rank;
  }

  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const keys = idx.map((i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const dx = c - cx;
    const dy = r - cy;
    const dist = Math.hypot(dx, dy);
    switch (kind) {
      case "center":
        return dist + jitter[i];
      case "outward":
        return -dist + jitter[i];
      case "rows":
        return i;
      case "columns":
        return c * rows + r;
      case "diagonal":
        return (r + c) * 100 + c;
      case "spiral": {
        let a = Math.atan2(dy, dx);
        if (a < 0) a += Math.PI * 2;
        return a + dist * 1.35;
      }
      default:
        return i;
    }
  });

  idx
    .slice()
    .sort((a, b) => keys[a] - keys[b] || a - b)
    .forEach((tile, slot) => {
      rank[tile] = slot;
    });
  return rank;
}

/* ------------------------------ tile builder --------------------------- *
 * Every style produces the same shape: a resting tile plus the transform it
 * starts from. The scroll timeline just interpolates start → rest.
 * ----------------------------------------------------------------------- */
function buildTiles(p) {
  const rand = mulberry32(p.seed);
  const cols = Math.max(1, Math.round(p.columns));
  const rws = Math.max(1, Math.round(p.rows));
  const count = cols * rws;
  const k = p.intensity;

  const tileWidth = p.imageWidth / cols;
  const tileHeight = p.imageHeight / rws;

  // Pre-roll the randomness per tile so switching styles keeps the same
  // "personality" for each tile instead of reshuffling everything.
  const R = Array.from({ length: count }, () => [
    rand(),
    rand(),
    rand(),
    rand(),
    rand(),
    rand(),
  ]);
  const jitter = Array.from({ length: count }, () => rand() * 0.001);
  const rowShift = Array.from({ length: rws }, () => rand() - 0.5);

  // Arrival order → delay
  const orderKind = p.order === "auto" ? AUTO_ORDER[p.preset] : p.order;
  const rank = computeOrder(orderKind, cols, rws, jitter, rand);
  const total = p.stagger + p.duration;

  const cx = (cols - 1) / 2;
  const cy = (rws - 1) / 2;

  const list = [];
  for (let r = 0; r < rws; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const r0 = R[i][0];
      const r1 = R[i][1];
      const r2 = R[i][2];
      const r3 = R[i][3];
      const r4 = R[i][4];
      const r5 = R[i][5];
      const posX = c * tileWidth;
      const posY = r * tileHeight;

      // Rest state is identical for every style: a seamless grid.
      const t = {
        key: String(i),
        // +1px overlap kills sub-pixel seams (skipped when the design
        // deliberately shows a gap between tiles)
        width: tileWidth + (p.gap > 0 ? -p.gap : 1),
        height: tileHeight + (p.gap > 0 ? -p.gap : 1),
        left: posX + (p.gap > 0 ? p.gap / 2 : 0),
        top: posY + (p.gap > 0 ? p.gap / 2 : 0),
        bgPosX: -posX - (p.gap > 0 ? p.gap / 2 : 0),
        bgPosY: -posY - (p.gap > 0 ? p.gap / 2 : 0),
        xVal: 0,
        xUnit: "vw",
        yVal: 0,
        yUnit: "vh",
        z: 0,
        scale: 1,
        rotate: 0,
        rotateX: 0,
        rotateY: 0,
        skewX: 0,
        blur: 0,
        chroma: 0,
        opacity: 1,
        start: (rank[i] / Math.max(count - 1, 1)) * p.stagger,
      };

      switch (p.preset) {
        /* ---- the original ---- */
        case "scatter": {
          t.xVal = (r0 - 0.5) * p.scatterX * k;
          t.yVal = (r1 - 0.5) * p.scatterY * k;
          t.scale = p.scaleMin + r2 * p.scaleRange;
          t.rotate = (r3 - 0.5) * p.rotation * k;
          t.blur = r4 > 1 - p.blurChance ? p.blur : 0;
          t.opacity = p.opacityMin + r5 * p.opacityRange;
          break;
        }

        /* ---- fly in through 3D space ---- */
        case "depth": {
          // Roughly a third of the tiles rush past the lens from in front;
          // the rest climb out of the far distance.
          const front = r0 > 0.66;
          t.z = (front ? p.depth * 0.55 : -p.depth) * k * (0.4 + r1 * 0.6);
          t.xVal = (r2 - 0.5) * 24 * k;
          t.yVal = (r3 - 0.5) * 24 * k;
          t.rotateX = (r4 - 0.5) * 45 * k;
          t.rotateY = (r5 - 0.5) * 45 * k;
          t.rotate = (r0 - 0.5) * p.rotation * 0.25 * k;
          t.blur = p.blur * (front ? 1 : 0.5);
          t.opacity = 0;
          break;
        }

        /* ---- slide in from the nearest screen edge ---- */
        case "edges": {
          const dx = (c - cx) / Math.max(cx, 0.5);
          const dy = (r - cy) / Math.max(cy, 0.5);
          const horizontal = Math.abs(dx) >= Math.abs(dy);
          const travel = p.spread * (0.7 + r0 * 0.5) * k;
          if (horizontal) {
            t.xVal = Math.sign(dx || 1) * travel;
            t.yVal = (r1 - 0.5) * 6 * k;
          } else {
            t.yVal = Math.sign(dy || 1) * travel;
            t.xVal = (r1 - 0.5) * 6 * k;
          }
          t.scale = 0.86 + r2 * 0.1;
          t.rotate = (r3 - 0.5) * p.rotation * 0.15 * k;
          t.blur = p.blur * 0.6;
          t.opacity = 0;
          break;
        }

        /* ---- swing in along a spiral ---- */
        case "spiral": {
          const dx = c - cx;
          const dy = r - cy;
          let a = Math.atan2(dy, dx);
          const ring = Math.hypot(dx, dy) / Math.max(Math.hypot(cx, cy), 0.5);
          a += ring * Math.PI * p.turns;
          const radius = p.spread * (0.35 + ring * 0.65) * k;
          t.xVal = Math.cos(a) * radius;
          t.yVal = Math.sin(a) * radius * 0.62;
          t.scale = 0.25 + r0 * 0.2;
          t.rotate = (p.rotation + 180 * p.turns) * (r1 > 0.5 ? 1 : -1) * k * 0.5;
          t.blur = p.blur * 0.7;
          t.opacity = 0;
          break;
        }

        /* ---- a ripple rolling across the grid ---- */
        case "wave": {
          const phase = (r + c) % 2 === 0 ? 1 : -1;
          t.yVal = phase * p.spread * 0.5 * k * (0.8 + r0 * 0.4);
          t.xVal = 0;
          t.scale = 0.9 + r1 * 0.08;
          t.rotateX = 0;
          t.rotate = phase * p.rotation * 0.08 * k;
          t.blur = p.blur * 0.4;
          t.opacity = 0;
          break;
        }

        /* ---- rows shear sideways with an RGB split ---- */
        case "glitch": {
          t.xVal = rowShift[r] * p.spread * 1.4 * k;
          t.yVal = (r0 - 0.5) * 2 * k;
          t.skewX = rowShift[r] * 18 * k;
          t.scale = 1;
          t.chroma = (6 + r1 * 10) * k;
          t.blur = 0;
          t.opacity = 0.15 + r2 * 0.35;
          break;
        }

        /* ---- implode to a point, bloom back out ---- */
        case "iris": {
          // Measured in px so every tile lands exactly on centre.
          t.xVal = p.imageWidth / 2 - (posX + tileWidth / 2);
          t.xUnit = "px";
          t.yVal = p.imageHeight / 2 - (posY + tileHeight / 2);
          t.yUnit = "px";
          t.scale = 0.04;
          t.rotate = (r0 - 0.5) * p.rotation * 0.3 * k;
          t.blur = p.blur * 0.5;
          t.opacity = 0;
          break;
        }
      }

      t.end = (t.start + p.duration) / total;
      t.start = t.start / total;
      list.push(t);
    }
  }
  return list;
}

/* ------------------------------ mount --------------------------------- */

export default function mount(target, options) {
  const opts = { ...DEFAULTS, ...(options || {}) };

  const src = typeof opts.image === "string" ? opts.image : opts.image && opts.image.src;
  let active = opts.preset;

  /* ---------- DOM ---------- */
  const track = document.createElement("div");
  Object.assign(track.style, {
    position: "relative",
    width: "100%",
    height: "calc(100vh + " + opts.scrollDistance + "vh)",
    background: opts.background,
  });

  const pin = document.createElement("div");
  Object.assign(pin.style, {
    position: "sticky",
    top: "0px",
    height: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  });

  const frame = document.createElement("div");
  Object.assign(frame.style, {
    position: "relative",
    width: opts.imageWidth + "px",
    height: opts.imageHeight + "px",
    maxWidth: "100%",
  });

  pin.appendChild(frame);
  track.appendChild(pin);
  target.appendChild(track);

  /* ---------- Tiles ---------- */
  let tiles = [];
  let nodes = [];

  function rebuild() {
    const is3D = active === "depth";
    pin.style.perspective = is3D ? opts.perspective + "px" : "";
    frame.style.transformStyle = is3D ? "preserve-3d" : "";

    tiles = buildTiles({ ...opts, preset: active });
    frame.replaceChildren();
    nodes = tiles.map((tile) => {
      const node = document.createElement("div");
      Object.assign(node.style, {
        position: "absolute",
        width: tile.width + "px",
        height: tile.height + "px",
        left: tile.left + "px",
        top: tile.top + "px",
        borderRadius: opts.radius ? opts.radius + "px" : "",
        backgroundImage: src ? 'url("' + src + '")' : "",
        backgroundSize: opts.imageWidth + "px " + opts.imageHeight + "px",
        backgroundPosition: tile.bgPosX + "px " + tile.bgPosY + "px",
        backgroundRepeat: "no-repeat",
        willChange: "transform, opacity, filter",
        backfaceVisibility: "hidden",
        webkitBackfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
      });
      frame.appendChild(node);
      return node;
    });
    paint(progress);
  }

  /**
   * Writes one playhead position onto every tile. Local eased time per tile:
   * clamp to its slice, then power-ease out. GSAP's power2.out is
   * 1 - (1 - t)^3, hence the +1 on the exponent.
   */
  function paint(v) {
    const exponent = opts.easePower + 1;
    const is3D = active === "depth";

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const node = nodes[i];

      const span = tile.end - tile.start || 1;
      const raw = (v - tile.start) / span;
      const c = raw < 0 ? 0 : raw > 1 ? 1 : raw;
      const t = 1 - Math.pow(1 - c, exponent);
      const k = 1 - t;

      let transform =
        "translateX(" +
        tile.xVal * k +
        tile.xUnit +
        ") translateY(" +
        tile.yVal * k +
        tile.yUnit +
        ")";
      if (is3D) {
        transform +=
          " translateZ(" +
          tile.z * k +
          "px) rotateX(" +
          tile.rotateX * k +
          "deg) rotateY(" +
          tile.rotateY * k +
          "deg)";
      }
      transform += " rotate(" + tile.rotate * k + "deg)";
      if (tile.skewX) transform += " skewX(" + tile.skewX * k + "deg)";
      transform += " scale(" + (tile.scale + (1 - tile.scale) * t) + ")";

      node.style.transform = transform;
      node.style.opacity = String(tile.opacity + (1 - tile.opacity) * t);

      // blur + optional chromatic split, both resolving to zero at rest
      if (tile.blur > 0 || tile.chroma > 0) {
        let f = "";
        if (tile.blur > 0) f += "blur(" + (tile.blur * k).toFixed(3) + "px)";
        if (tile.chroma > 0) {
          const o = (tile.chroma * k).toFixed(2);
          f +=
            " drop-shadow(" +
            -o +
            "px 0 rgba(255,0,90,0.75)) drop-shadow(" +
            o +
            "px 0 rgba(0,225,255,0.75))";
        }
        node.style.filter = f.trim() || "none";
      } else if (node.style.filter) {
        node.style.filter = "";
      }
    }
  }

  /* ---------- Playhead ---------- *
   * One playhead, two possible drivers: the scroll position, or a one-shot
   * preview fired by the on-screen switcher. Scrolling always wins back
   * control the moment the visitor touches the wheel.
   */
  let progress = 0;
  let smoothed = 0;
  let velocity = 0;
  let previewing = false;
  let previewElapsed = 0;
  let anchor = 0;

  // useScroll({ offset: ["start start", "end end"] }) on the track.
  function rawScroll() {
    const rect = track.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / travel));
  }

  // useSpring({ stiffness: 90 / smoothing, damping: 40, mass: 1 }) — scrub.
  // smoothing = 0 gives a hard 1:1 lock.
  const stiffness = 90 / Math.max(opts.smoothing, 0.05);
  const damping = 40;

  function stepSpring(dt, targetV) {
    const force = -stiffness * (smoothed - targetV) - damping * velocity;
    velocity += force * dt;
    smoothed += velocity * dt;
    if (Math.abs(smoothed - targetV) < 0.0005 && Math.abs(velocity) < 0.0005) {
      smoothed = targetV;
      velocity = 0;
    }
  }

  function playPreview() {
    previewing = true;
    previewElapsed = 0;
    anchor = rawScroll();
    progress = 0;
  }

  let raf = 0;
  let last = 0;

  function frameLoop(time) {
    raf = requestAnimationFrame(frameLoop);
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;

    const raw = rawScroll();

    if (previewing) {
      // Takeover check runs on the RAW scroll value, never the spring — the
      // spring keeps drifting toward its target after a click and would look
      // like a scroll that never happened.
      if (Math.abs(raw - anchor) >= 0.002) {
        previewing = false;
        smoothed = raw;
        velocity = 0;
        progress = raw;
      } else {
        previewElapsed += dt;
        const u = Math.min(1, previewElapsed / Math.max(opts.previewDuration, 0.0001));
        // The preview keeps the playhead after it finishes, so the image holds
        // its assembled state until the visitor actually scrolls again.
        progress = easeOutExpoish(u);
      }
    } else if (opts.smoothing > 0) {
      stepSpring(dt, raw);
      progress = smoothed;
    } else {
      progress = raw;
    }

    paint(progress);
  }

  /* ---------- Switcher ---------- *
   * Picking a style also replays the assembly once so the visitor sees it
   * immediately, wherever they are in the scroll.
   */
  let switcher = null;
  const buttons = new Map();
  let pill = null;

  function movePill() {
    const btn = buttons.get(active);
    if (!btn || !pill) return;
    pill.style.width = btn.offsetWidth + "px";
    pill.style.height = btn.offsetHeight + "px";
    pill.style.transform = "translate(" + btn.offsetLeft + "px," + btn.offsetTop + "px)";
  }

  const items = (Array.isArray(opts.switcherItems) && opts.switcherItems.length
    ? opts.switcherItems
    : DEFAULTS.switcherItems
  ).filter((k) => STYLE_TITLES[k]);

  if (opts.showSwitcher && items.length > 1) {
    const pos = opts.switcherPosition;
    const vertical = pos.startsWith("left") || pos.startsWith("right");

    switcher = document.createElement("div");
    Object.assign(switcher.style, {
      position: "absolute",
      zIndex: "2",
      maxWidth: "92%",
      display: "flex",
      justifyContent: "center",
    });
    switcher.style[pos] = "24px";
    if (vertical) {
      switcher.style.top = "50%";
      switcher.style.transform = "translateY(-50%)";
    } else {
      switcher.style.left = "50%";
      switcher.style.transform = "translateX(-50%)";
    }

    const list = document.createElement("div");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Assembly style");
    Object.assign(list.style, {
      position: "relative",
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      gap: "2px",
      padding: "5px",
      // A full capsule reads well as a row; stacked vertically it over-rounds
      // and the active pill pokes past the corners.
      borderRadius: vertical ? "24px" : "999px",
      background: opts.switcherTint,
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: "blur(14px)",
      webkitBackdropFilter: "blur(14px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      maxWidth: "100%",
      overflowX: vertical ? "visible" : "auto",
      scrollbarWidth: "none",
    });

    // One shared pill that slides between tabs — the plain-DOM stand-in for
    // Framer Motion's shared `layoutId`.
    pill = document.createElement("span");
    Object.assign(pill.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      borderRadius: "999px",
      background: opts.switcherAccent,
      transition: "transform 0.32s cubic-bezier(0.22,1,0.36,1), width 0.32s, height 0.32s",
      pointerEvents: "none",
    });
    list.appendChild(pill);

    items.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(key === active));
      Object.assign(btn.style, {
        position: "relative",
        appearance: "none",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "9px 16px",
        borderRadius: "999px",
        font: SWITCHER_FONT,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        color: key === active ? "#0b0b0b" : "rgba(255,255,255,0.62)",
        transition: "color 0.25s ease",
        webkitTapHighlightColor: "transparent",
      });

      const label = document.createElement("span");
      label.style.position = "relative";
      label.textContent = STYLE_TITLES[key];
      btn.appendChild(label);

      btn.addEventListener("click", () => {
        if (key === active) return;
        active = key;
        buttons.forEach((b, k) => {
          b.setAttribute("aria-selected", String(k === active));
          b.style.color = k === active ? "#0b0b0b" : "rgba(255,255,255,0.62)";
        });
        movePill();
        rebuild();
        playPreview();
      });

      buttons.set(key, btn);
      list.appendChild(btn);
    });

    switcher.appendChild(list);
    pin.appendChild(switcher);
  }

  /* ---------- Start ---------- */
  // Sync once on mount in case the page loads already scrolled.
  smoothed = rawScroll();
  progress = smoothed;
  rebuild();
  movePill();

  raf = requestAnimationFrame(frameLoop);

  const onResize = () => movePill();
  window.addEventListener("resize", onResize);

  return {
    setStyle(key) {
      if (!STYLE_TITLES[key]) return;
      active = key;
      movePill();
      rebuild();
      playPreview();
    },
    replay: playPreview,
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      track.remove();
    },
  };
}
