import { useState, useRef, useCallback, useEffect } from "react";
import "./carousel.css";

// Demo content — swap `slides` for your own data (title + subtitle + image url).
const DEFAULT_SLIDES = [
  { id: 1, title: "Kyoto, Japan", subtitle: "Maples along the Philosopher's Path", image: "https://picsum.photos/seed/kyoto-path/900/1100" },
  { id: 2, title: "Faroe Islands", subtitle: "Grass-roofed villages above the fjord", image: "https://picsum.photos/seed/faroe-islands/900/1100" },
  { id: 3, title: "Marrakech", subtitle: "Spice stalls in the Jemaa el-Fnaa souk", image: "https://picsum.photos/seed/marrakech-souk/900/1100" },
  { id: 4, title: "Patagonia", subtitle: "Granite towers over Lago Torre", image: "https://picsum.photos/seed/patagonia-towers/900/1100" },
  { id: 5, title: "Lofoten", subtitle: "Fishing huts under the midnight sun", image: "https://picsum.photos/seed/lofoten-huts/900/1100" },
];

/* @controls:start */
const DEFAULTS = {
  accent: "#ffffff",
  dotColor: "#d4d4d8",
  cardWidth: 280,
  cardHeight: 400,
  radius: 16,
  spacing: 62,
  sideScale: 0.74,
  speed: 520,
  showArrows: true,
  showDots: true,
  showCaption: true,
};
/* @controls:end */

// Shortest signed distance from `index` to `i` on a ring of size `count`.
function ringOffset(i, index, count) {
  let d = i - index;
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  return d;
}

function Chevron({ direction }) {
  const points = direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points={points} />
    </svg>
  );
}

export default function Carousel({
  slides = DEFAULT_SLIDES,
  accent = DEFAULTS.accent,
  dotColor = DEFAULTS.dotColor,
  cardWidth = DEFAULTS.cardWidth,
  cardHeight = DEFAULTS.cardHeight,
  radius = DEFAULTS.radius,
  spacing = DEFAULTS.spacing,
  sideScale = DEFAULTS.sideScale,
  speed = DEFAULTS.speed,
  showArrows = DEFAULTS.showArrows,
  showDots = DEFAULTS.showDots,
  showCaption = DEFAULTS.showCaption,
}) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const count = slides.length;

  const goTo = useCallback(
    (i) => setIndex(((i % count) + count) % count),
    [count]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Only render cards close enough to the center to matter.
  const visible = slides
    .map((slide, i) => ({ slide, i, offset: ringOffset(i, index, count) }))
    .filter((s) => Math.abs(s.offset) <= 2);

  const styleFor = (offset) => {
    const abs = Math.abs(offset);
    // Each step further out keeps shrinking by the same falloff ratio.
    const scale = offset === 0 ? 1 : abs === 1 ? sideScale : sideScale * sideScale;
    const step = spacing + (abs - 1) * (spacing * 0.65);
    const shift = offset === 0 ? 0 : offset > 0 ? step : -step;
    const opacity = abs > 2 ? 0 : abs === 2 ? 0.35 : abs === 1 ? 0.75 : 1;
    const zIndex = 10 - abs;
    const blur = abs >= 2 ? 1 : 0;
    return {
      transform: `translate(-50%, -50%) translateX(${shift}%) scale(${scale})`,
      opacity,
      zIndex,
      filter: blur ? `blur(${blur}px)` : "none",
      transition: `transform ${speed}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${speed}ms ease, filter ${speed}ms ease`,
    };
  };

  const cssVars = {
    "--carousel-accent": accent,
    "--carousel-card-w": `${cardWidth}px`,
    "--carousel-card-h": `${cardHeight}px`,
    "--carousel-radius": `${radius}px`,
  };

  return (
    <div ref={containerRef} tabIndex={0} className="carousel" style={cssVars}>
      <div className="carousel-stage">
        {visible.map(({ slide, i, offset }) => (
          <button
            key={slide.id}
            onClick={() => offset !== 0 && goTo(i)}
            aria-label={offset === 0 ? `${slide.title}, current slide` : `Go to ${slide.title}`}
            className={`carousel-card${offset === 0 ? " carousel-card--active" : ""}`}
            style={{
              ...styleFor(offset),
              cursor: offset === 0 ? "default" : "pointer",
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="carousel-card__img"
              draggable={false}
            />
            <div className="carousel-card__shade" />
            {showCaption && offset === 0 && (
              <div className="carousel-card__info">
                <span className="carousel-card__count">
                  {String(i + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                </span>
                <h3 className="carousel-card__title">{slide.title}</h3>
                <p className="carousel-card__subtitle">{slide.subtitle}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="carousel-control carousel-control--prev"
          >
            <Chevron direction="left" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="carousel-control carousel-control--next"
          >
            <Chevron direction="right" />
          </button>
        </>
      )}

      {showDots && (
        <div className="carousel-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className="carousel-dot"
              style={{
                width: i === index ? 22 : 8,
                backgroundColor: i === index ? accent : dotColor,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
