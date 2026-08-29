// CurvedCarousel.tsx — Framer Code Component
// 3D curved ring carousel with drag, inertia and auto-play.
// Fully responsive inside its frame.
//
// Usage in Framer:
//   1. Insert > Code > Create Code Component
//   2. Paste this file
//   3. Drag the component onto your canvas, resize freely

import { addPropertyControls, ControlType } from "framer"
import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

// ────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────
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
]

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────
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
}
/* @controls:end */

interface CurvedCarouselProps {
    images?: string[]
    showKicker?: boolean
    showHeading?: boolean
    kicker?: string
    heading?: string
    headingEmphasis?: string
    showHint?: boolean
    autoSpeed?: number
    dragSensitivity?: number
    panelWidth?: number
    panelAspect?: number
    panelRadius?: number
    background?: string
    textColor?: string
    accent?: string
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────
export default function CurvedCarousel(props: CurvedCarouselProps) {
    const {
        images = DEFAULT_IMAGES,
        showKicker = DEFAULTS.showKicker,
        showHeading = DEFAULTS.showHeading,
        kicker = DEFAULTS.kicker,
        heading = DEFAULTS.heading,
        headingEmphasis = DEFAULTS.headingEmphasis,
        showHint = DEFAULTS.showHint,
        autoSpeed = DEFAULTS.autoSpeed,
        dragSensitivity = DEFAULTS.dragSensitivity,
        panelWidth = DEFAULTS.panelWidth,
        panelAspect = DEFAULTS.panelAspect,
        panelRadius = DEFAULTS.panelRadius,
        background = DEFAULTS.background,
        textColor = DEFAULTS.textColor,
        accent = DEFAULTS.accent,
    } = props

    const stageRef = useRef<HTMLDivElement>(null)
    const ringRef = useRef<HTMLDivElement>(null)
    const panelRefs = useRef<(HTMLDivElement | null)[]>([])

    const N = images.length

    useEffect(() => {
        const stage = stageRef.current
        const ring = ringRef.current
        if (!stage || !ring || N === 0) return

        let pw = 0
        let ph = 0
        let radius = 0

        function panelSize() {
            const w = stage.clientWidth
            const frac = w < 640 ? 0.34 : w < 1024 ? 0.3 : 0.26
            const width = Math.min(panelWidth, w * frac)
            const height = width * panelAspect
            return { width, height }
        }

        function layout() {
            const size = panelSize()
            pw = size.width
            ph = size.height
            radius = pw / 2 / Math.tan(Math.PI / N)

            panelRefs.current.forEach((panel, i) => {
                if (!panel) return
                panel.style.width = pw + "px"
                panel.style.height = ph + "px"
                panel.style.marginTop = -ph / 2 + "px"
                panel.style.marginLeft = -pw / 2 + "px"
                const angle = i * (360 / N)
                panel.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`
            })
        }

        layout()

        let rotation = 0
        let dragging = false
        let dragStartX = 0
        let dragStartRotation = 0
        let velocity = 0
        let lastMoveTime = 0
        let lastMoveX = 0
        let resumeAutoAt = 0
        let lastTs = performance.now()
        let rafId: number | null = null

        function render() {
            ring.style.transform = `translateX(-50%) rotateY(${rotation}deg)`
        }

        function tick(ts: number) {
            const dt = Math.min(0.05, (ts - lastTs) / 1000)
            lastTs = ts

            if (dragging) {
                // handled directly in pointermove
            } else if (Math.abs(velocity) > 0.5) {
                rotation -= velocity * dt
                velocity *= 1 - Math.min(1, dt * 3.2)
                if (Math.abs(velocity) < 0.5) velocity = 0
            } else if (ts > resumeAutoAt) {
                rotation -= autoSpeed * dt
            }

            render()
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)

        function getX(e: PointerEvent) {
            return e.clientX
        }

        function onMove(e: PointerEvent) {
            if (!dragging || dragSensitivity <= 0) return
            const x = getX(e)
            const dx = x - dragStartX
            rotation = dragStartRotation + dx * dragSensitivity

            const now = performance.now()
            const dt = Math.max(1, now - lastMoveTime)
            const instV = ((x - lastMoveX) * dragSensitivity) / (dt / 1000)
            velocity = velocity * 0.7 + -instV * 0.3
            lastMoveX = x
            lastMoveTime = now
        }

        function onUp() {
            if (!dragging) return
            dragging = false
            stage.classList.remove("dragging")
            resumeAutoAt = performance.now() + 1400
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }

        function onDown(e: PointerEvent) {
            if (dragSensitivity <= 0) return
            dragging = true
            velocity = 0
            stage.classList.add("dragging")
            const x = getX(e)
            dragStartX = x
            dragStartRotation = rotation
            lastMoveX = x
            lastMoveTime = performance.now()
            window.addEventListener("pointermove", onMove)
            window.addEventListener("pointerup", onUp)
            window.addEventListener("pointercancel", onUp)
        }

        stage.addEventListener("pointerdown", onDown)

        function onResize() {
            layout()
        }
        window.addEventListener("resize", onResize)

        render()

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId)
            stage.removeEventListener("pointerdown", onDown)
            window.removeEventListener("resize", onResize)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
        }
    }, [N, autoSpeed, dragSensitivity, panelWidth, panelAspect])

    const wrap: CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 24,
        minHeight: 320,
        width: "100%",
        height: "100%",
        background: background,
        color: textColor,
        fontFamily: '"Iowan Old Style","Georgia",serif',
        userSelect: "none",
        WebkitUserSelect: "none",
        overflow: "hidden",
    }

    const stage: CSSProperties = {
        width: "100%",
        flex: "1 1 auto",
        minHeight: 220,
        perspective: "clamp(720px, 120vw, 1700px)",
        perspectiveOrigin: "50% 38%",
        cursor: dragSensitivity > 0 ? "grab" : "default",
        position: "relative",
        touchAction: "pan-y",
        WebkitTapHighlightColor: "transparent",
    }

    return (
        <div style={wrap}>
            <style>{`
                .curved-framer-stage::before,
                .curved-framer-stage::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 12%;
                    z-index: 5;
                    pointer-events: none;
                }
                .curved-framer-stage::before {
                    left: 0;
                    background: linear-gradient(90deg, ${background} 20%, rgba(0,0,0,0));
                }
                .curved-framer-stage::after {
                    right: 0;
                    background: linear-gradient(270deg, ${background} 20%, rgba(0,0,0,0));
                }
                .curved-framer-stage.dragging { cursor: grabbing; }
                @media (max-width: 640px) {
                    .curved-framer-stage::before,
                    .curved-framer-stage::after { width: 8%; }
                }
            `}</style>

            {(showKicker || showHeading) && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "center",
                    }}
                >
                    {showKicker && <div
                        style={{
                            fontFamily: '"Helvetica Neue",Arial,sans-serif',
                            fontSize: 11,
                            letterSpacing: "0.28em",
                            textTransform: "uppercase",
                            color: accent,
                        }}
                    >
                        {kicker}
                    </div>}
                    {showHeading && <h1
                        style={{
                            margin: 0,
                            fontWeight: 400,
                            fontSize: "clamp(22px, 3.4vw, 40px)",
                            textAlign: "center",
                            letterSpacing: "0.01em",
                            maxWidth: 820,
                            lineHeight: 1.15,
                        }}
                    >
                        {heading}
                        <br />
                        <em style={{ fontStyle: "italic", color: accent }}>
                            {headingEmphasis}
                        </em>
                    </h1>}
                </div>
            )}

            <div ref={stageRef} className="curved-framer-stage" style={stage}>
                <div
                    ref={ringRef}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        width: 0,
                        height: "100%",
                        transformStyle: "preserve-3d",
                        willChange: "transform",
                    }}
                >
                    {images.map((src, i) => (
                        <div
                            key={i}
                            ref={(el) => {
                                panelRefs.current[i] = el
                            }}
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: 0,
                                backfaceVisibility: "hidden",
                                borderRadius: panelRadius,
                                overflow: "hidden",
                                boxShadow: "0 30px 60px -20px rgba(20,16,8,0.35)",
                                background: "#111",
                            }}
                        >
                            <img
                                src={src}
                                alt=""
                                draggable={false}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    pointerEvents: "none",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background:
                                        "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)",
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {showHint && (
                <div
                    style={{
                        fontFamily: '"Helvetica Neue",Arial,sans-serif',
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: accent,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    {dragSensitivity > 0 ? "Drag to explore" : "Carousel"}
                    <span
                        style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: accent,
                            display: "inline-block",
                        }}
                    />
                    {autoSpeed > 0 ? "Auto-playing" : "Paused"}
                </div>
            )}
        </div>
    )
}

// ────────────────────────────────────────────────────────────────
// Framer property controls
// ────────────────────────────────────────────────────────────────
addPropertyControls(CurvedCarousel, {
    images: {
        type: ControlType.Array,
        itemControl: { type: ControlType.String },
        defaultValue: DEFAULT_IMAGES,
        title: "Images",
    },
    showKicker: {
        type: ControlType.Boolean,
        title: "Kicker",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showKicker,
    },
    kicker: {
        type: ControlType.String,
        title: "Kicker Text",
        defaultValue: DEFAULTS.kicker,
        hidden: (props) => !props.showKicker,
    },
    showHeading: {
        type: ControlType.Boolean,
        title: "Heading",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showHeading,
    },
    heading: {
        type: ControlType.String,
        title: "Heading Text",
        defaultValue: DEFAULTS.heading,
        hidden: (props) => !props.showHeading,
    },
    headingEmphasis: {
        type: ControlType.String,
        title: "Emphasis",
        defaultValue: DEFAULTS.headingEmphasis,
        hidden: (props) => !props.showHeading,
    },
    showHint: {
        type: ControlType.Boolean,
        title: "Hint",
        enabledTitle: "Show",
        disabledTitle: "Hide",
        defaultValue: DEFAULTS.showHint,
    },
    autoSpeed: {
        type: ControlType.Number,
        title: "Auto Speed",
        min: 0,
        max: 30,
        step: 0.5,
        unit: "°/s",
        defaultValue: DEFAULTS.autoSpeed,
    },
    dragSensitivity: {
        type: ControlType.Number,
        title: "Drag",
        min: 0,
        max: 1.2,
        step: 0.05,
        defaultValue: DEFAULTS.dragSensitivity,
    },
    panelWidth: {
        type: ControlType.Number,
        title: "Panel Width",
        min: 120,
        max: 520,
        step: 4,
        unit: "px",
        defaultValue: DEFAULTS.panelWidth,
    },
    panelAspect: {
        type: ControlType.Number,
        title: "Panel Ratio",
        min: 0.4,
        max: 1.6,
        step: 0.02,
        defaultValue: DEFAULTS.panelAspect,
    },
    panelRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
        defaultValue: DEFAULTS.panelRadius,
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: DEFAULTS.background,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: DEFAULTS.textColor,
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: DEFAULTS.accent,
    },
})
