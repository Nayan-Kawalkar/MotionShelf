// Carousel.tsx — Framer Code Component
// 3D coverflow-style image carousel with keyboard, arrow and dot navigation.
//
// Usage in Framer:
//   1. Insert > Code > Create Code Component
//   2. Paste this file
//   3. Drag the component onto your canvas, resize freely
//
// The React build of this component ships a carousel.css alongside it. Framer
// code components are a single file, so everything that can be an inline style
// is one, and the handful of rules that cannot — :focus-visible, :hover and the
// phone breakpoint — live in the scoped <style> block near the bottom.

import { addPropertyControls, ControlType } from "framer"
import { useState, useRef, useCallback, useEffect } from "react"
import type { CSSProperties } from "react"

/**
 * @framerIntrinsicWidth 768
 * @framerIntrinsicHeight 520
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

// ────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────
interface Slide {
    id?: string | number
    title: string
    subtitle: string
    image: string
}

const DEFAULT_SLIDES: Slide[] = [
    {
        id: 1,
        title: "Kyoto, Japan",
        subtitle: "Maples along the Philosopher's Path",
        image: "https://picsum.photos/seed/kyoto-path/900/1100",
    },
    {
        id: 2,
        title: "Faroe Islands",
        subtitle: "Grass-roofed villages above the fjord",
        image: "https://picsum.photos/seed/faroe-islands/900/1100",
    },
    {
        id: 3,
        title: "Marrakech",
        subtitle: "Spice stalls in the Jemaa el-Fnaa souk",
        image: "https://picsum.photos/seed/marrakech-souk/900/1100",
    },
    {
        id: 4,
        title: "Patagonia",
        subtitle: "Granite towers over Lago Torre",
        image: "https://picsum.photos/seed/patagonia-towers/900/1100",
    },
    {
        id: 5,
        title: "Lofoten",
        subtitle: "Fishing huts under the midnight sun",
        image: "https://picsum.photos/seed/lofoten-huts/900/1100",
    },
]

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────
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
}
/* @controls:end */

interface Props {
    slides: Slide[]
    accent: string
    dotColor: string
    cardWidth: number
    cardHeight: number
    radius: number
    spacing: number
    sideScale: number
    speed: number
    showArrows: boolean
    showDots: boolean
    showCaption: boolean
    style?: CSSProperties
}

// Shortest signed distance from `index` to `i` on a ring of size `count`.
function ringOffset(i: number, index: number, count: number) {
    let d = i - index
    if (d > count / 2) d -= count
    if (d < -count / 2) d += count
    return d
}

function Chevron({ direction }: { direction: "left" | "right" }) {
    const points = direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"
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
    )
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
export default function Carousel(props: Partial<Props>) {
    const {
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
        style,
    } = props

    const [index, setIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const count = slides.length

    const goTo = useCallback(
        (i: number) => setIndex(((i % count) + count) % count),
        [count]
    )
    const next = useCallback(() => goTo(index + 1), [goTo, index])
    const prev = useCallback(() => goTo(index - 1), [goTo, index])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") prev()
            if (e.key === "ArrowRight") next()
        }
        el.addEventListener("keydown", onKey)
        return () => el.removeEventListener("keydown", onKey)
    }, [next, prev])

    // Only render cards close enough to the center to matter.
    const visible = slides
        .map((slide, i) => ({ slide, i, offset: ringOffset(i, index, count) }))
        .filter((s) => Math.abs(s.offset) <= 2)

    const styleFor = (offset: number): CSSProperties => {
        const abs = Math.abs(offset)
        // Each step further out keeps shrinking by the same falloff ratio.
        const scale =
            offset === 0 ? 1 : abs === 1 ? sideScale : sideScale * sideScale
        const step = spacing + (abs - 1) * (spacing * 0.65)
        const shift = offset === 0 ? 0 : offset > 0 ? step : -step
        const opacity = abs > 2 ? 0 : abs === 2 ? 0.35 : abs === 1 ? 0.75 : 1
        const blur = abs >= 2 ? 1 : 0
        return {
            transform: `translate(-50%, -50%) translateX(${shift}%) scale(${scale})`,
            opacity,
            zIndex: 10 - abs,
            filter: blur ? `blur(${blur}px)` : "none",
            transition: `transform ${speed}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${speed}ms ease, filter ${speed}ms ease`,
        }
    }

    const cssVars = {
        "--carousel-accent": accent,
        "--carousel-card-w": `${cardWidth}px`,
        "--carousel-card-h": `${cardHeight}px`,
    } as CSSProperties

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className="framer-coverflow"
            style={{
                ...cssVars,
                position: "relative",
                width: "100%",
                maxWidth: 768,
                margin: "0 auto",
                outline: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                ...style,
            }}
        >
            <style>{SCOPED_CSS}</style>

            <div className="framer-coverflow__stage">
                {visible.map(({ slide, i, offset }) => (
                    <button
                        key={slide.id ?? i}
                        onClick={() => offset !== 0 && goTo(i)}
                        aria-label={
                            offset === 0
                                ? `${slide.title}, current slide`
                                : `Go to ${slide.title}`
                        }
                        className="framer-coverflow__card"
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            padding: 0,
                            border: `3px solid ${offset === 0 ? accent : "transparent"}`,
                            borderRadius: radius,
                            overflow: "hidden",
                            background: "#000",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
                            WebkitTapHighlightColor: "transparent",
                            cursor: offset === 0 ? "default" : "pointer",
                            ...styleFor(offset),
                        }}
                    >
                        <img
                            src={slide.image}
                            alt={slide.title}
                            draggable={false}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background:
                                    "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.05) 45%, transparent 70%)",
                            }}
                        />
                        {showCaption && offset === 0 && (
                            <div
                                className="framer-coverflow__info"
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: 20,
                                    textAlign: "left",
                                    color: "#fff",
                                }}
                            >
                                <span
                                    style={{
                                        color: "rgba(255,255,255,0.7)",
                                        fontSize: 10,
                                        letterSpacing: "0.2em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {String(i + 1).padStart(2, "0")} /{" "}
                                    {String(count).padStart(2, "0")}
                                </span>
                                <h3
                                    className="framer-coverflow__title"
                                    style={{
                                        margin: "4px 0 0",
                                        fontSize: 20,
                                        lineHeight: 1.25,
                                        fontWeight: 600,
                                    }}
                                >
                                    {slide.title}
                                </h3>
                                <p
                                    className="framer-coverflow__subtitle"
                                    style={{
                                        margin: "2px 0 0",
                                        fontSize: 14,
                                        color: "rgba(255,255,255,0.8)",
                                    }}
                                >
                                    {slide.subtitle}
                                </p>
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
                        className="framer-coverflow__control framer-coverflow__control--prev"
                        style={CONTROL_STYLE}
                    >
                        <Chevron direction="left" />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next slide"
                        className="framer-coverflow__control framer-coverflow__control--next"
                        style={CONTROL_STYLE}
                    >
                        <Chevron direction="right" />
                    </button>
                </>
            )}

            {showDots && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 20,
                    }}
                >
                    {slides.map((slide, i) => (
                        <button
                            key={slide.id ?? i}
                            onClick={() => goTo(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            aria-current={i === index}
                            style={{
                                height: 6,
                                border: "none",
                                borderRadius: 9999,
                                padding: 0,
                                cursor: "pointer",
                                transition: "width 200ms ease",
                                width: i === index ? 22 : 8,
                                backgroundColor: i === index ? accent : dotColor,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const CONTROL_STYLE: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    display: "grid",
    placeItems: "center",
    width: 44,
    height: 44,
    border: "none",
    borderRadius: "50%",
    background: "rgba(0, 0, 0, 0.5)",
    color: "#fff",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    transition: "background-color 150ms ease",
    zIndex: 20,
}

// The rules inline styles cannot express: card sizing that reads the CSS vars,
// hover and focus states, and the phone breakpoint that stops a wide card
// setting from overflowing the screen.
const SCOPED_CSS = `
.framer-coverflow__stage {
    position: relative;
    height: calc(var(--carousel-card-h) + 80px);
    perspective: 1200px;
}
.framer-coverflow__card {
    width: var(--carousel-card-w);
    height: var(--carousel-card-h);
}
.framer-coverflow__card:focus-visible {
    outline: 3px solid var(--carousel-accent);
    outline-offset: 2px;
}
.framer-coverflow__control:hover {
    background: rgba(0, 0, 0, 0.7) !important;
}
.framer-coverflow__control:focus-visible {
    outline: 2px solid var(--carousel-accent);
    outline-offset: 2px;
}
.framer-coverflow__control--prev { left: -16px; }
.framer-coverflow__control--next { right: -16px; }
@media (max-width: 640px) {
    .framer-coverflow__card {
        width: min(var(--carousel-card-w), 68vw);
        height: min(var(--carousel-card-h), 96vw);
    }
    .framer-coverflow__stage {
        height: calc(min(var(--carousel-card-h), 96vw) + 60px);
    }
    .framer-coverflow__control--prev { left: 0; }
    .framer-coverflow__control--next { right: 0; }
    .framer-coverflow__info { padding: 16px; }
    .framer-coverflow__title { font-size: 18px; }
    .framer-coverflow__subtitle { font-size: 12px; }
}
`

// ────────────────────────────────────────────────────────────────
// Framer property controls
// ────────────────────────────────────────────────────────────────
addPropertyControls(Carousel, {
    slides: {
        type: ControlType.Array,
        title: "Slides",
        defaultValue: DEFAULT_SLIDES,
        control: {
            type: ControlType.Object,
            controls: {
                title: {
                    type: ControlType.String,
                    title: "Title",
                    defaultValue: "Kyoto, Japan",
                },
                subtitle: {
                    type: ControlType.String,
                    title: "Subtitle",
                    defaultValue: "",
                },
                image: { type: ControlType.Image, title: "Image" },
            },
        },
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: DEFAULTS.accent,
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dot",
        defaultValue: DEFAULTS.dotColor,
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card Width",
        min: 140,
        max: 420,
        step: 2,
        unit: "px",
        defaultValue: DEFAULTS.cardWidth,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card Height",
        min: 200,
        max: 560,
        step: 4,
        unit: "px",
        defaultValue: DEFAULTS.cardHeight,
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 40,
        step: 1,
        unit: "px",
        defaultValue: DEFAULTS.radius,
    },
    spacing: {
        type: ControlType.Number,
        title: "Spread",
        min: 20,
        max: 130,
        step: 1,
        unit: "%",
        defaultValue: DEFAULTS.spacing,
    },
    sideScale: {
        type: ControlType.Number,
        title: "Falloff",
        min: 0.4,
        max: 1,
        step: 0.02,
        defaultValue: DEFAULTS.sideScale,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        min: 150,
        max: 1200,
        step: 10,
        unit: "ms",
        defaultValue: DEFAULTS.speed,
    },
    showArrows: {
        type: ControlType.Boolean,
        title: "Arrows",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showArrows,
    },
    showDots: {
        type: ControlType.Boolean,
        title: "Dots",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showDots,
    },
    showCaption: {
        type: ControlType.Boolean,
        title: "Caption",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showCaption,
    },
})
