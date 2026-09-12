import { useEffect, useMemo, useRef, useState } from "react"
import {
    animate,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
    type MotionValue,
} from "framer-motion"

/**
 * SCROLL ASSEMBLE IMAGE
 *
 * A port of the GSAP + ScrollTrigger "seamless scroll image assemble" effect,
 * rebuilt on framer-motion so it runs natively in Framer with no external
 * scripts — plus seven assembly styles and seven arrival orders.
 *
 * STYLES
 *   Scatter · the original: random drift, spin, scale and blur
 *   Depth   · true 3D — tiles fly in from far behind and in front of the lens
 *   Edges   · every tile enters from the nearest screen edge
 *   Spiral  · tiles swing in along a spiral, rotating as they land
 *   Wave    · a ripple that rolls diagonally across the grid
 *   Glitch  · rows shear sideways with chromatic RGB split
 *   Iris    · the whole image implodes to a point and blooms back out
 *
 * HOW TO USE
 * 1. Drop this onto a page inside the normal page flow (page body or a stack —
 *    NOT an absolutely positioned layer, or the internal sticky pin can't work).
 * 2. Width: Fill. Height: Auto — the component builds its own scroll track
 *    (100vh of pin + "Scroll" of travel).
 * 3. Add your own sections above and below it.
 */
export default function ScrollAssembleImage(props) {
    const {
        image = DEFAULTS.image,
        preset = DEFAULTS.preset,
        order = DEFAULTS.order,
        columns = DEFAULTS.columns,
        rows = DEFAULTS.rows,
        imageWidth = DEFAULTS.imageWidth,
        imageHeight = DEFAULTS.imageHeight,
        gap = DEFAULTS.gap,
        radius = DEFAULTS.radius,
        scrollDistance = DEFAULTS.scrollDistance,
        smoothing = DEFAULTS.smoothing,
        stagger = DEFAULTS.stagger,
        duration = DEFAULTS.duration,
        easePower = DEFAULTS.easePower,
        intensity = DEFAULTS.intensity,
        spread = DEFAULTS.spread,
        scatterX = DEFAULTS.scatterX,
        scatterY = DEFAULTS.scatterY,
        depth = DEFAULTS.depth,
        perspective = DEFAULTS.perspective,
        turns = DEFAULTS.turns,
        scaleMin = DEFAULTS.scaleMin,
        scaleRange = DEFAULTS.scaleRange,
        rotation = DEFAULTS.rotation,
        blur = DEFAULTS.blur,
        blurChance = DEFAULTS.blurChance,
        opacityMin = DEFAULTS.opacityMin,
        opacityRange = DEFAULTS.opacityRange,
        seed = DEFAULTS.seed,
        background = DEFAULTS.background,
        showSwitcher = DEFAULTS.showSwitcher,
        switcherItems = DEFAULTS.switcherItems,
        switcherPosition = DEFAULTS.switcherPosition,
        switcherAccent = DEFAULTS.switcherAccent,
        switcherTint = DEFAULTS.switcherTint,
        previewDuration = DEFAULTS.previewDuration,
        style,
    } = props

    const trackRef = useRef<HTMLDivElement>(null)
    const onCanvas = false

    // The style the visitor is currently looking at. Starts from the property
    // control and follows it whenever a designer changes it on the canvas.
    const [active, setActive] = useState(preset)
    useEffect(() => setActive(preset), [preset])

    // An image prop may be a plain string or a
    // { src, srcSet } object in others — support both.
    const src =
        typeof image === "string" ? image : (image && image.src) || undefined

    /* ------------------------------------------------------------------ *
     * Scroll progress
     * Mirrors ScrollTrigger { start: "top top", end: "+=150%", pin: true }.
     * The track is 100vh (the pinned view) + scrollDistance of travel, and
     * progress runs 0 → 1 exactly across the sticky element's travel.
     * ------------------------------------------------------------------ */
    const { scrollYProgress } = useScroll({
        target: trackRef,
        offset: ["start start", "end end"],
    })

    // scrub: 1.2 — the playhead eases toward the scroll position rather than
    // snapping to it. smoothing = 0 gives a hard 1:1 lock.
    const smoothed = useSpring(scrollYProgress, {
        stiffness: 90 / Math.max(smoothing, 0.05),
        damping: 40,
        mass: 1,
        restDelta: 0.0005,
    })

    /* ------------------------------------------------------------------ *
     * One playhead, two possible drivers: the scroll position, or a one-shot
     * preview fired by the on-screen switcher. Scrolling always wins back
     * control the moment the visitor touches the wheel.
     * ------------------------------------------------------------------ */
    const progress: MotionValue<number> = useMotionValue(onCanvas ? 1 : 0)
    const scrollSource = smoothing > 0 ? smoothed : scrollYProgress
    const previewing = useRef(false)
    const playback = useRef<any>(null)
    const anchor = useRef(0)

    // Driver 1: the scroll position (through the scrub spring), unless a
    // preview currently owns the playhead.
    useMotionValueEvent(scrollSource, "change", (v) => {
        if (onCanvas || previewing.current) return
        progress.set(v)
    })

    // Takeover check runs on the RAW scroll value, never the spring — the
    // spring keeps drifting toward its target after a click and would look
    // like a scroll that never happened.
    useMotionValueEvent(scrollYProgress, "change", (raw) => {
        if (!previewing.current) return
        if (Math.abs(raw - anchor.current) < 0.002) return
        playback.current?.stop()
        previewing.current = false
        progress.set(scrollSource.get())
    })

    // Sync once on mount in case the page loads already scrolled.
    useEffect(() => {
        progress.set(onCanvas ? 1 : scrollSource.get())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onCanvas])

    function playPreview() {
        if (onCanvas) return
        playback.current?.stop()
        previewing.current = true
        anchor.current = scrollYProgress.get()
        progress.set(0)
        // The preview keeps the playhead after it finishes, so the image holds
        // its assembled state until the visitor actually scrolls again.
        playback.current = animate(progress, 1, {
            duration: previewDuration,
            ease: [0.22, 1, 0.36, 1],
        })
    }

    useEffect(() => () => playback.current?.stop(), [])

    /* ------------------------------------------------------------------ *
     * Tiles — deterministic scatter (seeded, so canvas, preview and the
     * published site agree, and a designer can reshuffle by number).
     * ------------------------------------------------------------------ */
    const tiles = useMemo(
        () =>
            buildTiles({
                preset: active,
                order,
                columns,
                rows,
                imageWidth,
                imageHeight,
                gap,
                stagger,
                duration,
                intensity,
                spread,
                scatterX,
                scatterY,
                depth,
                turns,
                scaleMin,
                scaleRange,
                rotation,
                blur,
                blurChance,
                opacityMin,
                opacityRange,
                seed,
            }),
        [
            active,
            order,
            columns,
            rows,
            imageWidth,
            imageHeight,
            gap,
            stagger,
            duration,
            intensity,
            spread,
            scatterX,
            scatterY,
            depth,
            turns,
            scaleMin,
            scaleRange,
            rotation,
            blur,
            blurChance,
            opacityMin,
            opacityRange,
            seed,
        ]
    )

    const is3D = active === "depth"

    const items = (
        Array.isArray(switcherItems) && switcherItems.length
            ? switcherItems
            : DEFAULTS.switcherItems
    ).filter((k) => STYLE_TITLES[k])

    return (
        <div
            ref={trackRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: `calc(100vh + ${scrollDistance}vh)`,
                background,
            }}
        >
            {/* The pin */}
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    perspective: is3D ? `${perspective}px` : undefined,
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: imageWidth,
                        height: imageHeight,
                        maxWidth: "100%",
                        transformStyle: is3D ? "preserve-3d" : undefined,
                    }}
                >
                    {tiles.map((tile) => (
                        <Tile
                            key={tile.key}
                            tile={tile}
                            progress={progress}
                            src={src}
                            imageWidth={imageWidth}
                            imageHeight={imageHeight}
                            easePower={easePower}
                            radius={radius}
                            is3D={is3D}
                        />
                    ))}
                </div>

                {showSwitcher && items.length > 1 && (
                    <Switcher
                        items={items}
                        active={active}
                        position={switcherPosition}
                        accent={switcherAccent}
                        tint={switcherTint}
                        onSelect={(key) => {
                            setActive(key)
                            playPreview()
                        }}
                    />
                )}
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------------- *
 * On-screen style switcher. Picking a style also replays the assembly once
 * so the visitor sees it immediately, wherever they are in the scroll.
 * ---------------------------------------------------------------------- */
function Switcher({ items, active, position, accent, tint, onSelect }) {
    const vertical = position.startsWith("left") || position.startsWith("right")
    const edge = { top: "top", bottom: "bottom", left: "left", right: "right" }[
        position
    ]

    return (
        <div
            style={{
                position: "absolute",
                zIndex: 2,
                [edge]: 24,
                ...(vertical
                    ? { top: "50%", transform: "translateY(-50%)" }
                    : { left: "50%", transform: "translateX(-50%)" }),
                maxWidth: "92%",
                display: "flex",
                justifyContent: "center",
            }}
        >
            <div
                role="tablist"
                aria-label="Assembly style"
                style={{
                    display: "flex",
                    flexDirection: vertical ? "column" : "row",
                    gap: 2,
                    padding: 5,
                    // A full capsule reads well as a row; stacked vertically it
                    // over-rounds and the active pill pokes past the corners.
                    borderRadius: vertical ? 24 : 999,
                    background: tint,
                    border: "1px solid rgba(255,255,255,0.14)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                    maxWidth: "100%",
                    overflowX: vertical ? "visible" : "auto",
                    scrollbarWidth: "none",
                }}
            >
                {items.map((key) => {
                    const isActive = key === active
                    return (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onSelect(key)}
                            style={{
                                position: "relative",
                                appearance: "none",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                padding: "9px 16px",
                                borderRadius: 999,
                                font: "500 13px/1 -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
                                letterSpacing: "0.01em",
                                whiteSpace: "nowrap",
                                color: isActive
                                    ? "#0b0b0b"
                                    : "rgba(255,255,255,0.62)",
                                transition: "color 0.25s ease",
                                WebkitTapHighlightColor: "transparent",
                            }}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="assemble-switcher-pill"
                                    transition={{
                                        type: "spring",
                                        stiffness: 420,
                                        damping: 34,
                                    }}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        borderRadius: 999,
                                        background: accent,
                                    }}
                                />
                            )}
                            <span style={{ position: "relative" }}>
                                {STYLE_TITLES[key]}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ---------------------------------------------------------------------- *
 * A single tile. Each one owns its own motion values, so changing the grid
 * size never changes the hook count of the parent.
 * ---------------------------------------------------------------------- */
function Tile({
    tile,
    progress,
    src,
    imageWidth,
    imageHeight,
    easePower,
    radius,
    is3D,
}) {
    // Local eased time for this tile: clamp to its slice, then power-ease out.
    // GSAP's power2.out === 1 - (1 - t)^3, hence the +1 on the exponent.
    const exponent = easePower + 1
    const t = useTransform(progress, (v: number) => {
        const span = tile.end - tile.start || 1
        const raw = (v - tile.start) / span
        const c = raw < 0 ? 0 : raw > 1 ? 1 : raw
        return 1 - Math.pow(1 - c, exponent)
    })

    const x = useTransform(
        t,
        (v: number) => `${tile.xVal * (1 - v)}${tile.xUnit}`
    )
    const y = useTransform(
        t,
        (v: number) => `${tile.yVal * (1 - v)}${tile.yUnit}`
    )
    const z = useTransform(t, (v: number) => tile.z * (1 - v))
    const scale = useTransform(
        t,
        (v: number) => tile.scale + (1 - tile.scale) * v
    )
    const rotate = useTransform(t, (v: number) => tile.rotate * (1 - v))
    const rotateX = useTransform(t, (v: number) => tile.rotateX * (1 - v))
    const rotateY = useTransform(t, (v: number) => tile.rotateY * (1 - v))
    const skewX = useTransform(t, (v: number) => tile.skewX * (1 - v))
    const opacity = useTransform(
        t,
        (v: number) => tile.opacity + (1 - tile.opacity) * v
    )

    // blur + optional chromatic split, both resolving to zero at rest
    const needsFilter = tile.blur > 0 || tile.chroma > 0
    const filter = useTransform(t, (v: number) => {
        const k = 1 - v
        let f = ""
        if (tile.blur > 0) f += `blur(${(tile.blur * k).toFixed(3)}px)`
        if (tile.chroma > 0) {
            const o = (tile.chroma * k).toFixed(2)
            f += ` drop-shadow(${-o}px 0 rgba(255,0,90,0.75)) drop-shadow(${o}px 0 rgba(0,225,255,0.75))`
        }
        return f.trim() || "none"
    })

    return (
        <motion.div
            style={{
                position: "absolute",
                width: tile.width,
                height: tile.height,
                left: tile.left,
                top: tile.top,
                borderRadius: radius || undefined,
                backgroundImage: src ? `url("${src}")` : undefined,
                backgroundSize: `${imageWidth}px ${imageHeight}px`,
                backgroundPosition: `${tile.bgPosX}px ${tile.bgPosY}px`,
                backgroundRepeat: "no-repeat",
                x,
                y,
                z: is3D ? z : undefined,
                scale,
                rotate,
                rotateX: is3D ? rotateX : undefined,
                rotateY: is3D ? rotateY : undefined,
                skewX: tile.skewX ? skewX : undefined,
                opacity,
                // Only pay for the filter on tiles that actually need one
                filter: needsFilter ? filter : undefined,
                willChange: "transform, opacity, filter",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformStyle: "preserve-3d",
            }}
        />
    )
}

/* ------------------------------ tile builder --------------------------- *
 * Every style produces the same shape: a resting tile plus the transform it
 * starts from. The scroll timeline just interpolates start → rest.
 * ----------------------------------------------------------------------- */
function buildTiles(p) {
    const rand = mulberry32(p.seed)
    const cols = Math.max(1, Math.round(p.columns))
    const rws = Math.max(1, Math.round(p.rows))
    const count = cols * rws
    const k = p.intensity

    const tileWidth = p.imageWidth / cols
    const tileHeight = p.imageHeight / rws

    // Pre-roll the randomness per tile so switching styles keeps the same
    // "personality" for each tile instead of reshuffling everything.
    const R = Array.from({ length: count }, () => [
        rand(),
        rand(),
        rand(),
        rand(),
        rand(),
        rand(),
    ])
    const jitter = Array.from({ length: count }, () => rand() * 0.001)
    const rowShift = Array.from({ length: rws }, () => rand() - 0.5)

    // Arrival order → delay
    const orderKind = p.order === "auto" ? AUTO_ORDER[p.preset] : p.order
    const rank = computeOrder(orderKind, cols, rws, jitter, rand)
    const total = p.stagger + p.duration

    const cx = (cols - 1) / 2
    const cy = (rws - 1) / 2

    const list = []
    for (let r = 0; r < rws; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c
            const [r0, r1, r2, r3, r4, r5] = R[i]
            const posX = c * tileWidth
            const posY = r * tileHeight

            // Rest state is identical for every style: a seamless grid.
            const t: any = {
                key: `${i}`,
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
            }

            switch (p.preset) {
                /* ---- the original ---- */
                case "scatter": {
                    t.xVal = (r0 - 0.5) * p.scatterX * k
                    t.yVal = (r1 - 0.5) * p.scatterY * k
                    t.scale = p.scaleMin + r2 * p.scaleRange
                    t.rotate = (r3 - 0.5) * p.rotation * k
                    t.blur = r4 > 1 - p.blurChance ? p.blur : 0
                    t.opacity = p.opacityMin + r5 * p.opacityRange
                    break
                }

                /* ---- fly in through 3D space ---- */
                case "depth": {
                    // Roughly a third of the tiles rush past the lens from
                    // in front; the rest climb out of the far distance.
                    const front = r0 > 0.66
                    t.z = (front ? p.depth * 0.55 : -p.depth) * k * (0.4 + r1 * 0.6)
                    t.xVal = (r2 - 0.5) * 24 * k
                    t.yVal = (r3 - 0.5) * 24 * k
                    t.rotateX = (r4 - 0.5) * 45 * k
                    t.rotateY = (r5 - 0.5) * 45 * k
                    t.rotate = (r0 - 0.5) * p.rotation * 0.25 * k
                    t.blur = p.blur * (front ? 1 : 0.5)
                    t.opacity = 0
                    break
                }

                /* ---- slide in from the nearest screen edge ---- */
                case "edges": {
                    const dx = (c - cx) / Math.max(cx, 0.5)
                    const dy = (r - cy) / Math.max(cy, 0.5)
                    const horizontal = Math.abs(dx) >= Math.abs(dy)
                    const travel = p.spread * (0.7 + r0 * 0.5) * k
                    if (horizontal) {
                        t.xVal = Math.sign(dx || 1) * travel
                        t.yVal = (r1 - 0.5) * 6 * k
                    } else {
                        t.yVal = Math.sign(dy || 1) * travel
                        t.xVal = (r1 - 0.5) * 6 * k
                    }
                    t.scale = 0.86 + r2 * 0.1
                    t.rotate = (r3 - 0.5) * p.rotation * 0.15 * k
                    t.blur = p.blur * 0.6
                    t.opacity = 0
                    break
                }

                /* ---- swing in along a spiral ---- */
                case "spiral": {
                    const dx = c - cx
                    const dy = r - cy
                    let a = Math.atan2(dy, dx)
                    const ring = Math.hypot(dx, dy) / Math.max(Math.hypot(cx, cy), 0.5)
                    a += ring * Math.PI * p.turns
                    const radius = p.spread * (0.35 + ring * 0.65) * k
                    t.xVal = Math.cos(a) * radius
                    t.yVal = Math.sin(a) * radius * 0.62
                    t.scale = 0.25 + r0 * 0.2
                    t.rotate = (p.rotation + 180 * p.turns) * (r1 > 0.5 ? 1 : -1) * k * 0.5
                    t.blur = p.blur * 0.7
                    t.opacity = 0
                    break
                }

                /* ---- a ripple rolling across the grid ---- */
                case "wave": {
                    const phase = (r + c) % 2 === 0 ? 1 : -1
                    t.yVal = phase * p.spread * 0.5 * k * (0.8 + r0 * 0.4)
                    t.xVal = 0
                    t.scale = 0.9 + r1 * 0.08
                    t.rotateX = 0
                    t.rotate = phase * p.rotation * 0.08 * k
                    t.blur = p.blur * 0.4
                    t.opacity = 0
                    break
                }

                /* ---- rows shear sideways with an RGB split ---- */
                case "glitch": {
                    t.xVal = rowShift[r] * p.spread * 1.4 * k
                    t.yVal = (r0 - 0.5) * 2 * k
                    t.skewX = rowShift[r] * 18 * k
                    t.scale = 1
                    t.chroma = (6 + r1 * 10) * k
                    t.blur = 0
                    t.opacity = 0.15 + r2 * 0.35
                    break
                }

                /* ---- implode to a point, bloom back out ---- */
                case "iris": {
                    // Measured in px so every tile lands exactly on centre.
                    t.xVal = p.imageWidth / 2 - (posX + tileWidth / 2)
                    t.xUnit = "px"
                    t.yVal = p.imageHeight / 2 - (posY + tileHeight / 2)
                    t.yUnit = "px"
                    t.scale = 0.04
                    t.rotate = (r0 - 0.5) * p.rotation * 0.3 * k
                    t.blur = p.blur * 0.5
                    t.opacity = 0
                    break
                }
            }

            t.end = (t.start + p.duration) / total
            t.start = t.start / total
            list.push(t)
        }
    }
    return list
}

/* ------------------------------ ordering ------------------------------ */

const STYLE_KEYS = [
    "scatter",
    "depth",
    "edges",
    "spiral",
    "wave",
    "glitch",
    "iris",
]

const STYLE_TITLES = {
    scatter: "Scatter",
    depth: "Depth",
    edges: "Edges",
    spiral: "Spiral",
    wave: "Wave",
    glitch: "Glitch",
    iris: "Iris",
}

const AUTO_ORDER = {
    scatter: "random",
    depth: "random",
    edges: "outward",
    spiral: "spiral",
    wave: "diagonal",
    glitch: "random",
    iris: "center",
}

function computeOrder(kind, cols, rows, jitter, rand) {
    const n = cols * rows
    const idx = Array.from({ length: n }, (_, i) => i)
    const rank: number[] = []

    if (kind === "random") {
        shuffle(idx, rand).forEach((tile, slot) => (rank[tile] = slot))
        return rank
    }

    const cx = (cols - 1) / 2
    const cy = (rows - 1) / 2
    const keys = idx.map((i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const dx = c - cx
        const dy = r - cy
        const dist = Math.hypot(dx, dy)
        switch (kind) {
            case "center":
                return dist + jitter[i]
            case "outward":
                return -dist + jitter[i]
            case "rows":
                return i
            case "columns":
                return c * rows + r
            case "diagonal":
                return (r + c) * 100 + c
            case "spiral": {
                let a = Math.atan2(dy, dx)
                if (a < 0) a += Math.PI * 2
                return a + dist * 1.35
            }
            default:
                return i
        }
    })

    idx.slice()
        .sort((a, b) => keys[a] - keys[b] || a - b)
        .forEach((tile, slot) => (rank[tile] = slot))
    return rank
}

/* ------------------------------ helpers ------------------------------- */

// Small deterministic PRNG so the scatter is identical everywhere.
function mulberry32(a: number) {
    let s = Math.floor(a) >>> 0
    return function () {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

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
    switcherItems: STYLE_KEYS,
    switcherPosition: "bottom",
    switcherAccent: "#ffffff",
    switcherTint: "rgba(255,255,255,0.07)",
    previewDuration: 1.6,
}
/* @controls:end */

// The component also destructures these.
ScrollAssembleImage.defaultProps = DEFAULTS
