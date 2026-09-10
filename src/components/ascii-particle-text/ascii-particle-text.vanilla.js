// ASCII Particle Text — no framework required.
//
//   import mount from "./ascii-particle-text.vanilla.js";
//   const field = mount(document.getElementById("ascii-particle-text"));
//   field.destroy();
//
// Give the host element a height — the canvas fills it. Three states, cycled
// by clicking: 0 pile at the bottom · 1 assembled text · 2 bounded scatter.
//
// Self-contained: the GSAP tweens (power eases, delays, yoyo/repeat,
// onComplete chains) are reproduced by the small tween engine below, so
// there is nothing to load. The single-file export strips the `export` and
// calls `mount` directly.

/* @controls:start */
const DEFAULTS = {
  text: "DIGITAL STUDIO",
  charSet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&$%",
  fontFamily: "monospace",
  textWidthFraction: 0.125,
  maxTextSize: 110,
  sidePadding: 0.06,
  gridSpacing: 0.09,
  charScale: 0.11,
  scramble: true,
  scrambleInterval: 1,
  background: "#000000",
  particleColor: "rgb(220, 220, 220)",
  particleOpacity: 0.85,
  highlightColor: "rgb(255, 255, 255)",
  glowColor: "#ffffff",
  glowBlur: 8,
  mouseRadius: 55,
  pushStrength: 0.95,
  followSpeed: 0.18,
  scatterBandFraction: 0.45,
  maxScatterBand: 280,
  startDelay: 0.4,
  showHint: true,
  hintText: "Click to interact",
  hintColor: "rgba(255, 255, 255, 0.9)",
  hintBackground: "rgba(0, 0, 0, 0.85)",
  hintBorderColor: "rgba(255, 255, 255, 0.25)",
  playOnCanvas: false,
};
/* @controls:end */

/* ------------------------------------------------------------------ */
/* Tween engine (GSAP-compatible subset)                               */
/* ------------------------------------------------------------------ */

const EASES = {
  none: (t) => t,
  linear: (t) => t,
  "power1.in": (t) => t * t,
  "power1.out": (t) => 1 - (1 - t) * (1 - t),
  "power1.inOut": (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  "power2.in": (t) => t * t * t,
  "power2.out": (t) => 1 - Math.pow(1 - t, 3),
  "power2.inOut": (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  "power3.in": (t) => t * t * t * t,
  "power3.out": (t) => 1 - Math.pow(1 - t, 4),
};

const RESERVED = new Set(["duration", "delay", "ease", "yoyo", "repeat", "onComplete"]);

class Tweener {
  constructor() {
    this.tweens = [];
  }

  to(target, vars) {
    const duration = Math.max(vars.duration != null ? vars.duration : 0.5, 0.0001);
    const delay = vars.delay != null ? vars.delay : 0;
    const ease = EASES[vars.ease != null ? vars.ease : "power1.out"] || EASES.linear;
    const yoyo = vars.yoyo != null ? vars.yoyo : false;
    const repeat = vars.repeat != null ? vars.repeat : 0;
    const onComplete = vars.onComplete;

    const props = Object.keys(vars).filter(
      (k) => !RESERVED.has(k) && typeof vars[k] === "number"
    );

    if (props.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    let remaining = props.length;
    const onDone = () => {
      remaining--;
      if (remaining === 0 && onComplete) onComplete();
    };

    for (const prop of props) {
      // Later tweens overwrite earlier ones on the same property.
      for (const t of this.tweens) {
        if (t.target === target && t.prop === prop) t.dead = true;
      }
      this.tweens.push({
        target,
        prop,
        from: 0,
        to: vars[prop],
        duration,
        delay,
        ease,
        yoyo,
        repeat,
        elapsed: 0,
        started: false,
        dead: false,
        onDone,
      });
    }
  }

  update(dt) {
    if (this.tweens.length === 0) return;
    let needsSweep = false;

    for (let i = 0; i < this.tweens.length; i++) {
      const t = this.tweens[i];
      if (t.dead) {
        needsSweep = true;
        continue;
      }

      t.elapsed += dt;
      if (t.elapsed < t.delay) continue;

      if (!t.started) {
        t.started = true;
        t.from = t.target[t.prop];
      }

      const local = t.elapsed - t.delay;
      const cycles = t.repeat + 1;
      const total = t.duration * cycles;
      const delta = t.to - t.from;

      if (local >= total) {
        // A yoyo that ends on a reverse cycle lands back on `from`.
        const endsReversed = t.yoyo && cycles % 2 === 0;
        t.target[t.prop] = endsReversed ? t.from : t.to;
        t.dead = true;
        needsSweep = true;
        t.onDone();
        continue;
      }

      const cycleIndex = Math.floor(local / t.duration);
      let ct = (local % t.duration) / t.duration;
      if (t.yoyo && cycleIndex % 2 === 1) ct = 1 - ct;
      t.target[t.prop] = t.from + delta * t.ease(ct);
    }

    if (needsSweep) this.tweens = this.tweens.filter((t) => !t.dead);
  }

  killAll() {
    this.tweens.length = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Mount                                                               */
/* ------------------------------------------------------------------ */

export default function mount(target, options) {
  const opts = { ...DEFAULTS, ...(options || {}) };

  /* ---------- DOM ---------- */
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position: "relative",
    width: "100%",
    // Fills the host when it has a height of its own; the min-height keeps the
    // standalone single-file export from collapsing to nothing on a bare page.
    height: "100%",
    minHeight: "500px",
    overflow: "hidden",
    backgroundColor: opts.background,
    cursor: "pointer",
    fontFamily: opts.fontFamily,
  });

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
  wrap.appendChild(canvas);

  let hintEl = null;
  if (opts.showHint) {
    hintEl = document.createElement("div");
    hintEl.textContent = opts.hintText;
    Object.assign(hintEl.style, {
      position: "absolute",
      top: 0,
      left: 0,
      pointerEvents: "none",
      color: opts.hintColor,
      background: opts.hintBackground,
      border: "1px solid " + opts.hintBorderColor,
      padding: "4px 8px",
      borderRadius: "3px",
      fontSize: "10px",
      fontFamily: opts.fontFamily,
      letterSpacing: "0.5px",
      opacity: "0",
      transform: "translate(-50%, -140%)",
      transition: "opacity 0.2s ease, transform 0.05s linear",
      zIndex: "10",
      whiteSpace: "nowrap",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
    });
    wrap.appendChild(hintEl);
  }

  target.appendChild(wrap);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      destroy() {
        wrap.remove();
      },
    };
  }

  /* ---------- State ---------- */
  const chars = opts.charSet && opts.charSet.length > 0 ? opts.charSet : "#";
  const randChar = () => chars[Math.floor(Math.random() * chars.length)];

  // Derived from the fitted headline size on every (re)build, so the number
  // of rows and columns of letters scales with the text.
  let step = 10;
  let charPx = 12;

  let width = 0;
  let height = 0;
  let particles = [];
  const tweener = new Tweener();
  const mouse = { x: -1000, y: -1000, radius: opts.mouseRadius };

  let isAnimatingSequence = false;
  // 0: bottom pile · 1: assembled text · 2: bounded scatter
  let currentState = 0;
  let generation = 0;
  let raf = 0;
  let lastTime = 0;
  let startTimer;
  let restartTimer;

  class Particle {
    constructor(targetX, targetY) {
      this.targetX = targetX;
      this.targetY = targetY;

      this.bottomX = targetX + (Math.random() - 0.5) * 40;
      this.bottomY = height - 12 - Math.random() * 25;

      // Restrict scatter to a tight horizontal band around centre.
      this.scatterX = Math.random() * width;
      const band = Math.min(height * opts.scatterBandFraction, opts.maxScatterBand);
      this.scatterY = height / 2 + (Math.random() - 0.5) * band;

      this.baseX = this.bottomX;
      this.baseY = this.bottomY;
      this.x = this.bottomX;
      this.y = this.bottomY;

      this.scaleX = 1;
      this.scaleY = 1;

      this.char = randChar();
      this.baseSize = charPx;
      this.alpha = opts.particleOpacity;
      // Staggered start so the field shimmers instead of blinking in unison.
      this.charTimer = Math.random() * opts.scrambleInterval;
    }

    tickChar(dt) {
      this.charTimer -= dt;
      if (this.charTimer <= 0) {
        this.char = randChar();
        this.charTimer = opts.scrambleInterval * (0.7 + Math.random() * 0.6);
      }
    }

    update() {
      const dx = this.baseX - mouse.x;
      const dy = this.baseY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetRenderX = this.baseX;
      let targetRenderY = this.baseY;

      if (dist < mouse.radius && dist > 0) {
        const angle = Math.atan2(dy, dx);
        const pushDist = (mouse.radius - dist) * opts.pushStrength;
        targetRenderX = this.baseX + Math.cos(angle) * pushDist;
        targetRenderY = this.baseY + Math.sin(angle) * pushDist;
      }

      this.x += (targetRenderX - this.x) * opts.followSpeed;
      this.y += (targetRenderY - this.y) * opts.followSpeed;
    }

    draw() {
      this.update();

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.scaleX, this.scaleY);

      ctx.font = "bold " + this.baseSize + "px " + opts.fontFamily;

      if (dist < mouse.radius + 8 && dist >= mouse.radius - 12) {
        ctx.fillStyle = opts.highlightColor;
        ctx.shadowColor = opts.glowColor;
        ctx.shadowBlur = opts.glowBlur;
      } else {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = opts.particleColor;
        ctx.shadowBlur = 0;
      }

      ctx.fillText(this.char, 0, 0);
      ctx.restore();
    }
  }

  function createTextParticles() {
    particles = [];
    if (width < 2 || height < 2) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    // --- Fit the headline to the frame ---
    let fontSize = Math.min(width * opts.textWidthFraction, opts.maxTextSize);
    offCtx.font = "bold " + fontSize + "px " + opts.fontFamily;

    const measured = offCtx.measureText(opts.text).width;
    const maxLineWidth = width * (1 - opts.sidePadding * 2);
    if (measured > maxLineWidth && measured > 0) {
      fontSize *= maxLineWidth / measured;
    }
    fontSize = Math.max(6, Math.min(fontSize, height * 0.85));

    // Grid resolution follows the fitted size, so the letter rows and columns
    // get denser as the text grows and stay readable when it shrinks.
    step = Math.max(2, Math.round(fontSize * opts.gridSpacing));
    charPx = Math.max(3, fontSize * opts.charScale);

    offCtx.font = "bold " + fontSize + "px " + opts.fontFamily;
    offCtx.fillStyle = "#ffffff";
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    offCtx.fillText(opts.text, width / 2, height / 2);

    const imageData = offCtx.getImageData(0, 0, width, height).data;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (imageData[index + 3] > 128) {
          particles.push(new Particle(x, y));
        }
      }
    }
  }

  function fallToBottom(onCompleteCallback) {
    currentState = 0;
    const gen = generation;
    let completedCount = 0;

    const checkFinished = () => {
      completedCount++;
      if (completedCount >= particles.length && onCompleteCallback && gen === generation) {
        onCompleteCallback();
      }
    };

    particles.forEach((p) => {
      const distanceToFall = p.bottomY - p.baseY;
      const fallDuration = Math.sqrt(Math.max(0.1, distanceToFall) / height) * 1.1;
      const currentX = p.baseX;

      tweener.to(p, {
        baseX: currentX,
        baseY: p.bottomY,
        duration: fallDuration,
        ease: "power2.in",
        delay: Math.random() * 0.15,
        onComplete: () => {
          const hasBounce = Math.random() > 0.3;
          if (hasBounce) {
            const bounceHeight = 8 + Math.random() * 15;
            tweener.to(p, {
              scaleY: 0.6,
              scaleX: 1.3,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            tweener.to(p, {
              baseY: p.bottomY - bounceHeight,
              duration: 0.18,
              ease: "power1.out",
              onComplete: () => {
                tweener.to(p, {
                  baseY: p.bottomY,
                  duration: 0.18,
                  ease: "power1.in",
                  onComplete: checkFinished,
                });
              },
            });
          } else {
            tweener.to(p, {
              scaleY: 0.7,
              scaleX: 1.2,
              duration: 0.1,
              yoyo: true,
              repeat: 1,
              onComplete: checkFinished,
            });
          }
        },
      });
    });

    if (particles.length === 0 && onCompleteCallback) {
      onCompleteCallback();
    }
  }

  function assembleToText() {
    currentState = 1;
    particles.forEach((p) => {
      tweener.to(p, {
        baseX: p.targetX,
        baseY: p.targetY,
        scaleX: 1,
        scaleY: 1,
        duration: 1.2 + Math.random() * 0.6,
        ease: "power2.out",
        delay: Math.random() * 0.2,
        onComplete: () => {
          isAnimatingSequence = false;
        },
      });
    });
    if (particles.length === 0) isAnimatingSequence = false;
  }

  function scatterLetters() {
    currentState = 2;
    particles.forEach((p) => {
      // Recalculate scatter bounds for the current size.
      const band = Math.min(height * opts.scatterBandFraction, opts.maxScatterBand);
      p.scatterX = Math.random() * width;
      p.scatterY = height / 2 + (Math.random() - 0.5) * band;

      tweener.to(p, {
        baseX: p.scatterX,
        baseY: p.scatterY,
        scaleX: 1,
        scaleY: 1,
        duration: 1.0 + Math.random() * 0.5,
        ease: "power3.out",
        delay: Math.random() * 0.1,
      });
    });
  }

  function drawFrame(dt) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      if (opts.scramble && dt > 0) particles[i].tickChar(dt);
      particles[i].draw();
    }
  }

  function init() {
    generation++;
    tweener.killAll();
    window.clearTimeout(startTimer);
    window.clearTimeout(restartTimer);
    isAnimatingSequence = false;
    createTextParticles();

    startTimer = window.setTimeout(
      () => assembleToText(),
      Math.max(0, opts.startDelay * 1000)
    );
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    if (nextW === width && nextH === height) return;

    width = nextW;
    height = nextH;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    init();
  }

  /* ---------- Interaction ---------- */

  const onPointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    if (!hintEl) return;

    let isHoveringText = false;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = mouse.x - p.baseX;
      const dy = mouse.y - p.baseY;
      if (Math.sqrt(dx * dx + dy * dy) < mouse.radius) {
        isHoveringText = true;
        break;
      }
    }

    if (isHoveringText && !isAnimatingSequence) {
      hintEl.style.left = mouse.x + "px";
      hintEl.style.top = mouse.y + "px";
      hintEl.style.opacity = "1";
    } else {
      hintEl.style.opacity = "0";
    }
  };

  const onPointerLeave = () => {
    mouse.x = -1000;
    mouse.y = -1000;
    if (hintEl) hintEl.style.opacity = "0";
  };

  const onClick = () => {
    if (isAnimatingSequence) return;

    if (currentState === 1) {
      scatterLetters();
      if (hintEl) hintEl.style.opacity = "0";
    } else if (currentState === 2) {
      isAnimatingSequence = true;
      if (hintEl) hintEl.style.opacity = "0";
      const gen = generation;
      fallToBottom(() => {
        restartTimer = window.setTimeout(() => {
          if (gen === generation) assembleToText();
        }, 300);
      });
    }
  };

  const animate = (time) => {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    tweener.update(dt);
    drawFrame(dt);
    raf = requestAnimationFrame(animate);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  wrap.addEventListener("pointermove", onPointerMove);
  wrap.addEventListener("pointerleave", onPointerLeave);
  wrap.addEventListener("click", onClick);

  raf = requestAnimationFrame(animate);

  return {
    scatter: scatterLetters,
    assemble: assembleToText,
    destroy() {
      generation++;
      cancelAnimationFrame(raf);
      window.clearTimeout(startTimer);
      window.clearTimeout(restartTimer);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("click", onClick);
      tweener.killAll();
      wrap.remove();
    },
  };
}
