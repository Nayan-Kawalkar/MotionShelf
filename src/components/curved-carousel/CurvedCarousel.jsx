import { useEffect, useRef } from "react";

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

export default function CurvedCarousel({
  images = DEFAULT_IMAGES,
  autoSpeed = DEFAULTS.autoSpeed,
  dragSensitivity = DEFAULTS.dragSensitivity,
  panelWidth = DEFAULTS.panelWidth,
  panelAspect = DEFAULTS.panelAspect,
  panelRadius = DEFAULTS.panelRadius,
  background = DEFAULTS.background,
  textColor = DEFAULTS.textColor,
  accent = DEFAULTS.accent,
  kicker = DEFAULTS.kicker,
  heading = DEFAULTS.heading,
  headingEmphasis = DEFAULTS.headingEmphasis,
  showKicker = DEFAULTS.showKicker,
  showHeading = DEFAULTS.showHeading,
  showHint = DEFAULTS.showHint,
}) {
  const stageRef = useRef(null);
  const ringRef = useRef(null);
  const panelRefs = useRef([]);

  const N = images.length;

  // Live tunables read by the animation loop, so dragging a slider retunes the
  // running carousel instead of tearing it down and restarting the rotation.
  const opts = useRef(null);
  opts.current = { autoSpeed, dragSensitivity, panelWidth, panelAspect };

  useEffect(() => {
    const stage = stageRef.current;
    const ring = ringRef.current;
    if (!stage || !ring) return;

    const ANGLE_STEP = 360 / N;
    let pw = 0;
    let ph = 0;
    let radius = 0;

    function panelSize() {
      const w = stage.clientWidth;
      const frac = w < 640 ? 0.34 : w < 1024 ? 0.3 : 0.26;
      const width = Math.min(opts.current.panelWidth, w * frac);
      const height = width * opts.current.panelAspect;
      return { width, height };
    }

    function layout() {
      const size = panelSize();
      pw = size.width;
      ph = size.height;
      radius = pw / 2 / Math.tan(Math.PI / N);

      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;
        panel.style.width = pw + "px";
        panel.style.height = ph + "px";
        panel.style.marginTop = -ph / 2 + "px";
        panel.style.marginLeft = -pw / 2 + "px";
        const angle = i * ANGLE_STEP;
        panel.style.transform = "rotateY(" + angle + "deg) translateZ(" + radius + "px)";
      });
    }

    layout();

    // ---- rotation state ----
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
    let lastGeometry = "";

    function render() {
      ring.style.transform = "translateX(-50%) rotateY(" + rotation + "deg)";
    }

    function tick(ts) {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      // Re-layout when a sizing control changes underneath us.
      const geometry = opts.current.panelWidth + "|" + opts.current.panelAspect;
      if (geometry !== lastGeometry) {
        lastGeometry = geometry;
        layout();
      }

      if (dragging) {
        // handled directly in pointermove
      } else if (Math.abs(velocity) > 0.5) {
        rotation -= velocity * dt;
        velocity *= 1 - Math.min(1, dt * 3.2);
        if (Math.abs(velocity) < 0.5) velocity = 0;
      } else if (ts > resumeAutoAt) {
        rotation -= opts.current.autoSpeed * dt;
      }

      render();
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function getX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function onMove(e) {
      if (!dragging) return;
      const sensitivity = opts.current.dragSensitivity;
      const x = getX(e);
      const dx = x - dragStartX;
      rotation = dragStartRotation + dx * sensitivity;

      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTime);
      const instV = ((x - lastMoveX) * sensitivity) / (dt / 1000);
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
      dragging = true;
      velocity = 0;
      stage.classList.add("dragging");
      const x = getX(e);
      dragStartX = x;
      dragStartRotation = rotation;
      lastMoveX = x;
      lastMoveTime = performance.now();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }

    stage.addEventListener("pointerdown", onDown);

    function onResize() {
      layout();
    }
    window.addEventListener("resize", onResize);

    render();

    return () => {
      cancelAnimationFrame(rafId);
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [N]);

  const styles = makeStyles({ background, textColor, accent, panelRadius });

  return (
    <div className="curved-carousel" style={styles.wrap}>
      <style>{edgeStyles(background)}</style>

      {showKicker && <div style={styles.kicker}>{kicker}</div>}

      {showHeading && (
        <h1 style={styles.heading}>
          {heading}
          <br />
          <em style={styles.emphasis}>{headingEmphasis}</em>
        </h1>
      )}

      <div ref={stageRef} className="curved-carousel-stage" style={styles.stage}>
        <div ref={ringRef} style={styles.ring}>
          {images.map((src, i) => (
            <div
              key={i}
              ref={(el) => (panelRefs.current[i] = el)}
              style={styles.panel}
            >
              <img src={src} alt="" draggable={false} style={styles.img} />
              <div style={styles.sheen} />
            </div>
          ))}
        </div>
      </div>

      {showHint && (
        <div style={styles.hint}>
          Drag to explore <span style={styles.dot} /> Auto-playing
        </div>
      )}
    </div>
  );
}

// The fading side edges have to match the surrounding background, so they are
// generated rather than living in a static stylesheet.
function edgeStyles(background) {
  return `
    .curved-carousel {
      padding: 40px 0;
      gap: 38px;
      min-height: 600px;
    }
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
      background: linear-gradient(90deg, ${background} 12%, transparent);
    }
    .curved-carousel-stage::after {
      right: 0;
      background: linear-gradient(270deg, ${background} 12%, transparent);
    }
    .curved-carousel-stage.dragging { cursor: grabbing; }

    @media (max-width: 640px) {
      .curved-carousel {
        padding: 20px 8px;
        gap: 20px;
        min-height: 540px;
      }
      .curved-carousel-stage::before,
      .curved-carousel-stage::after { width: 8%; }
      .curved-carousel-stage::before {
        background: linear-gradient(90deg, ${background} 30%, transparent);
      }
      .curved-carousel-stage::after {
        background: linear-gradient(270deg, ${background} 30%, transparent);
      }
    }
    @media (min-width: 641px) and (max-width: 1024px) {
      .curved-carousel {
        padding: 28px 12px;
        gap: 28px;
      }
      .curved-carousel-stage::before,
      .curved-carousel-stage::after { width: 11%; }
    }
  `;
}

function makeStyles({ background, textColor, accent, panelRadius }) {
  return {
    wrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background,
      color: textColor,
      fontFamily: '"Iowan Old Style","Georgia",serif',
      userSelect: "none",
      WebkitUserSelect: "none",
      overflow: "hidden",
    },
    kicker: {
      fontFamily: '"Helvetica Neue",Arial,sans-serif',
      fontSize: "11px",
      letterSpacing: "0.28em",
      textTransform: "uppercase",
      color: accent,
      textAlign: "center",
    },
    heading: {
      margin: 0,
      fontWeight: 400,
      fontSize: "clamp(22px, 3.4vw, 40px)",
      textAlign: "center",
      letterSpacing: "0.01em",
      maxWidth: "820px",
      lineHeight: 1.15,
    },
    emphasis: {
      fontStyle: "italic",
      color: accent,
    },
    stage: {
      width: "100%",
      height: "clamp(260px, 52vh, 480px)",
      perspective: "clamp(720px, 120vw, 1700px)",
      perspectiveOrigin: "50% 38%",
      cursor: "grab",
      position: "relative",
      touchAction: "pan-y",
      WebkitTapHighlightColor: "transparent",
    },
    ring: {
      position: "absolute",
      top: 0,
      left: "50%",
      width: 0,
      height: "100%",
      transformStyle: "preserve-3d",
      willChange: "transform",
    },
    panel: {
      position: "absolute",
      top: "50%",
      left: 0,
      backfaceVisibility: "hidden",
      borderRadius: `${panelRadius}px`,
      overflow: "hidden",
      boxShadow: "0 30px 60px -20px rgba(20,16,8,0.35)",
      background: "#111",
    },
    img: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      pointerEvents: "none",
    },
    sheen: {
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)",
    },
    hint: {
      fontFamily: '"Helvetica Neue",Arial,sans-serif',
      fontSize: "11px",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: accent,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    dot: {
      width: "4px",
      height: "4px",
      borderRadius: "50%",
      background: accent,
      display: "inline-block",
    },
  };
}
