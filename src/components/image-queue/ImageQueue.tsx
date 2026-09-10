import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { motion, animate, useMotionValue, useTransform } from "framer-motion"

/**
 * IMAGE QUEUE — drag to throw, or step with Next / Prev
 *
 * A stack of image cards queued behind each other. Drag the front card in any
 * direction and release: it keeps your momentum, falls out of frame and rejoins
 * the back of the queue while the next card steps forward. Next does the same
 * without a drag; Prev pulls the last card back up into the front.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 900
 * @framerIntrinsicHeight 760
 */

// ---------------------------------------------------------------- types

interface Slide {
    image?: { src: string; srcSet?: string; alt?: string }
    caption?: string
}

interface Props {
    slides: Slide[]
    background: string
    accent: string
    font: any
    aspect: number
    scale: number
    band: number
    shrink: number
    fade: number
    radius: number
    grayscale: boolean
    tilt: number
    threshold: number
    fallSpeed: number
    showNav: boolean
    navPlacement: "bottomLeft" | "bottomCenter" | "bottomRight" | "sides"
    navSize: number
    showCounter: boolean
    counterPlacement: "left" | "topLeft" | "bottomLeft"
    showCaption: boolean
    style?: React.CSSProperties
}

// ---------------------------------------------------------------- helpers

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const EASE_FALL: [number, number, number, number] = [0.42, 0, 1, 1] // accelerating = gravity
const SPRING = { type: "spring" as const, stiffness: 260, damping: 34, mass: 0.9 }

/** Measures the component frame so the stack can size itself to it. */
function useSize() {
    const ref = React.useRef<HTMLDivElement>(null)
    const [size, setSize] = React.useState({ w: 0, h: 0 })
    React.useEffect(() => {
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(([entry]) => {
            const r = entry.contentRect
            setSize({ w: r.width, h: r.height })
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return [ref, size] as const
}

// ---------------------------------------------------------------- card

function Card({
    slide,
    index,
    depth,
    count,
    cardH,
    band,
    shrink,
    fade,
    radius,
    grayscale,
    tilt,
    threshold,
    fallSpeed,
    interactive,
    isFlying,
    isReturning,
    nextSeq,
    onThrow,
    onLanded,
    onReturned,
    showCaption,
    font,
}: any) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const spin = useMotionValue(0)
    const opacity = useMotionValue(1)
    const rotate = useTransform([x, spin] as any, ([xv, s]: number[]) => xv * tilt + s)

    const wasFlying = React.useRef(false)
    const wasReturning = React.useRef(false)
    const seenSeq = React.useRef(nextSeq)
    const [snap, setSnap] = React.useState(false)

    /* Every animation this card starts is tracked so it can be stopped.
       Without this, a tween that finishes a frame late overwrites the reset
       below and the card is stranded at its fall target for good. */
    const dragRef = React.useRef(false)
    const running = React.useRef<any[]>([])
    const stopAll = React.useCallback(() => {
        running.current.forEach((a) => a && typeof a.stop === "function" && a.stop())
        running.current = []
    }, [])
    const track = React.useCallback((a: any) => {
        running.current.push(a)
        return a
    }, [])
    React.useEffect(() => stopAll, [stopAll])

    /* Resting pose for this depth. Every card behind peeks out by exactly one
       `band` above the one in front of it, and shrinks by `shrink` per step. */
    const s = Math.pow(shrink, depth)
    const restY = (cardH * (s - 1)) / 2 - depth * band * cardH
    const restOpacity = Math.max(0, 1 - depth * fade)

    // mid-animation the pose stays frozen at the front; the inner layer moves
    const busy = isFlying || isReturning
    const poseY = busy ? 0 : restY
    const poseScale = busy ? 1 : s
    const poseOpacity = busy ? 1 : restOpacity

    const dur = clamp(0.95 / fallSpeed, 0.3, 2)
    const dropDistance = () =>
        (typeof window !== "undefined" ? window.innerHeight : 900) + cardH * 1.4

    /* ---- the drop: momentum out, gravity down, then rejoin at the back ---- */
    const release = React.useCallback(
        (offset: { x: number; y: number }, velocity: { x: number; y: number }) => {
            const dist = Math.hypot(offset.x, offset.y)

            stopAll()

            // not thrown far enough — settle back into the queue
            if (dist < threshold) {
                track(animate(x, 0, SPRING))
                track(animate(y, 0, SPRING))
                track(animate(spin, 0, SPRING))
                return
            }

            const dir = offset.x >= 0 ? 1 : -1
            const vx = clamp(velocity.x, -1800, 1800)

            onThrow() // the rest of the queue steps forward straight away

            track(animate(x, x.get() + vx * 0.42, { duration: dur, ease: [0.22, 0.5, 0.6, 1] }))
            track(animate(spin, spin.get() + dir * 42 + vx * 0.015, { duration: dur, ease: "linear" }))
            track(animate(opacity, 0, { duration: dur * 0.62, delay: dur * 0.3, ease: "easeIn" }))
            const fall = track(animate(y, dropDistance(), { duration: dur, ease: EASE_FALL }))

            // land off the fall itself, never off a timer racing it
            const done = fall && fall.finished ? fall.finished : fall
            Promise.resolve(done)
                .catch(() => {})
                .then(() => {
                    stopAll() // kill anything still ticking before we reset
                    x.set(0)
                    y.set(0)
                    spin.set(0)
                    setSnap(true) // outer jumps to the back pose without animating
                    onLanded(index)
                })
        },
        [threshold, dur, cardH, index, onThrow, onLanded, x, y, spin, opacity, stopAll, track]
    )

    /* ---- Next: throw the front card without a drag ---- */
    React.useEffect(() => {
        if (nextSeq === seenSeq.current) return
        seenSeq.current = nextSeq
        if (depth !== 0 || busy) return
        const dir = nextSeq % 2 ? 1 : -1
        release({ x: dir * 90, y: 16 }, { x: dir * 380, y: 160 })
    }, [nextSeq, depth, busy, release])

    /* ---- Prev: the last card climbs back up into the front ---- */
    React.useLayoutEffect(() => {
        const was = wasReturning.current
        wasReturning.current = isReturning
        if (isReturning && !was) {
            stopAll()
            const dir = index % 2 ? 1 : -1
            x.set(dir * 70)
            y.set(dropDistance())
            spin.set(dir * 34)
            opacity.set(0)
            const raf = requestAnimationFrame(() => {
                const t = { duration: dur * 1.05, ease: EASE_OUT }
                track(animate(x, 0, t))
                track(animate(spin, 0, t))
                track(animate(opacity, 1, { duration: dur * 0.45, ease: "easeOut" }))
                const rise = track(animate(y, 0, t))
                const done = rise && rise.finished ? rise.finished : rise
                Promise.resolve(done)
                    .catch(() => {})
                    .then(() => {
                        stopAll()
                        x.set(0)
                        y.set(0)
                        spin.set(0)
                        opacity.set(1)
                        onReturned(index)
                    })
            })
            return () => cancelAnimationFrame(raf)
        }
    }, [isReturning, dur, index, x, y, spin, opacity, onReturned, stopAll, track])

    /* ---- fade back in once a thrown card has rejoined the tail ---- */
    React.useEffect(() => {
        const was = wasFlying.current
        wasFlying.current = isFlying
        if (was && !isFlying) {
            const t = window.setTimeout(() => setSnap(false), 50)
            track(animate(opacity, 1, { duration: 0.5, delay: 0.12, ease: "easeOut" }))
            return () => window.clearTimeout(t)
        }
    }, [isFlying, opacity, track])

    /* ---- safety net ----
       Whenever a card is at rest in the queue its drag layer must be neutral.
       This catches any transform a cancelled or late animation left behind, so
       a card can never come back round to the front already thrown. */
    React.useEffect(() => {
        if (busy || dragRef.current) return
        if (x.get() !== 0) x.set(0)
        if (y.get() !== 0) y.set(0)
        if (spin.get() !== 0) spin.set(0)
    }, [busy, depth, x, y, spin])

    const src = slide?.image?.src
    const label = slide?.caption

    return (
        <motion.div
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: cardH,
                zIndex: busy ? count + 5 : count - depth,
                transformOrigin: "50% 50%",
                pointerEvents: interactive && depth === 0 && !busy ? "auto" : "none",
            }}
            animate={{ y: poseY, scale: poseScale, opacity: poseOpacity }}
            transition={busy || snap ? { duration: 0 } : SPRING}
        >
            <motion.div
                drag={interactive && depth === 0 && !busy}
                dragMomentum={false}
                dragElastic={1}
                onDragStart={() => { dragRef.current = true; stopAll() }}
                onDragEnd={(_, info) => {
                    dragRef.current = false
                    release(info.offset, info.velocity)
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    x,
                    y,
                    rotate,
                    opacity,
                    cursor: interactive && depth === 0 && !busy ? "grab" : "default",
                    touchAction: "pan-y",
                }}
                whileDrag={{ cursor: "grabbing", scale: 1.015 }}
            >
                {src ? (
                    <img
                        src={src}
                        srcSet={slide?.image?.srcSet}
                        alt={slide?.image?.alt || label || ""}
                        draggable={false}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: radius,
                            display: "block",
                            filter: grayscale ? "grayscale(1) contrast(1.02)" : "none",
                            userSelect: "none",
                            pointerEvents: "none",
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: radius,
                            background: `hsl(0 0% ${72 - index * 9}%)`,
                            display: "grid",
                            placeItems: "center",
                            color: "rgba(0,0,0,.35)",
                            ...font,
                            fontSize: 13,
                            letterSpacing: "0.14em",
                        }}
                    >
                        {String(index + 1).padStart(2, "0")}
                    </div>
                )}

                {showCaption && label && depth === 0 && !busy && (
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            top: "100%",
                            marginTop: 14,
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            opacity: 0.6,
                            whiteSpace: "nowrap",
                            ...font,
                        }}
                    >
                        {label}
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}

// ---------------------------------------------------------------- nav button

function NavButton({ dir, onClick, size, accent, disabled }: any) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={dir === -1 ? "Previous image" : "Next image"}
            whileHover={disabled ? undefined : { backgroundColor: accent, color: "#fff" }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            transition={{ duration: 0.18 }}
            style={{
                width: size,
                height: size,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: `1px solid ${accent}`,
                borderRadius: size,
                background: "transparent",
                color: accent,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.3 : 1,
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <svg
                width={size * 0.34}
                height={size * 0.34}
                viewBox="0 0 16 16"
                fill="none"
                style={{ transform: dir === -1 ? "scaleX(-1)" : "none" }}
            >
                <path
                    d="M2 8h12M9.5 3.5 14 8l-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="square"
                />
            </svg>
        </motion.button>
    )
}

// ---------------------------------------------------------------- component

export default function ImageQueue(props: Props) {
    const {
        slides,
        background,
        accent,
        font,
        aspect,
        scale,
        band,
        shrink,
        fade,
        radius,
        grayscale,
        tilt,
        threshold,
        fallSpeed,
        showNav,
        navPlacement,
        navSize,
        showCounter,
        counterPlacement,
        showCaption,
        style,
    } = props

    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const interactive = !onCanvas

    const list: Slide[] = slides && slides.length ? slides : [{}, {}, {}, {}]
    const count = list.length

    const [ref, size] = useSize()
    const [order, setOrder] = React.useState<number[]>(() => list.map((_, i) => i))
    const [flying, setFlying] = React.useState<number[]>([])
    const [returning, setReturning] = React.useState<number[]>([])
    const [nextSeq, setNextSeq] = React.useState(0)

    // refs mirror the queue so the move handlers stay identity-stable
    const orderRef = React.useRef(order)
    const flyingRef = React.useRef(flying)
    const returningRef = React.useRef(returning)
    flyingRef.current = flying
    returningRef.current = returning

    // keep the queue in sync if slides are added/removed in the panel
    React.useEffect(() => {
        const fresh = list.map((_, i) => i)
        orderRef.current = fresh
        setOrder(fresh)
        setFlying([])
        setReturning([])
        setNextSeq(0)
    }, [count])

    /* card box: fits the frame, leaving room for the cards peeking above,
       for the caption under the front card, and for the arrows below it */
    const stackTop = band * (count - 1)
    const navBelow = showNav && count > 1 && navPlacement !== "sides"
    const reserve = (showCaption ? 42 : 0) + (navBelow ? navSize + 30 : 0)
    const cardH = Math.max(
        40,
        Math.min(
            Math.max(0, size.h * 0.94 - reserve) / (1 + stackTop),
            (size.w * 0.92) / aspect
        ) * scale
    )
    const cardW = cardH * aspect
    const stageH = cardH * (1 + stackTop)

    /* ---- queue moves ---- */

    /** front card leaves; everyone steps forward; it rejoins the tail */
    const throwFront = React.useCallback(() => {
        const o = orderRef.current
        if (o.length < 1) return
        const id = o[0]
        orderRef.current = [...o.slice(1), id]
        setOrder(orderRef.current)
        setFlying((f) => [...f, id])
    }, [])

    /* remove by id, not by position — flights can finish out of order */
    const landed = React.useCallback(
        (id: number) => setFlying((f) => f.filter((v) => v !== id)),
        []
    )

    /** Next — same throw, no drag needed */
    const goNext = React.useCallback(() => setNextSeq((n) => n + 1), [])

    /** Prev — the tail card climbs back up into the front */
    const goPrev = React.useCallback(() => {
        const o = orderRef.current
        if (o.length < 2) return
        const last = o[o.length - 1]
        if (flyingRef.current.includes(last) || returningRef.current.includes(last)) return
        orderRef.current = [last, ...o.slice(0, -1)]
        setOrder(orderRef.current)
        setReturning((r) => [...r, last])
    }, [])

    const returned = React.useCallback(
        (id: number) => setReturning((r) => r.filter((v) => v !== id)),
        []
    )

    /* keyboard: ← / → step the queue */
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); goPrev() }
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext() }
    }

    const current = (order[0] ?? 0) + 1
    const tail = order[order.length - 1]
    const prevBusy = flying.includes(tail) || returning.includes(tail)

    /* ---- chrome positioning ---- */
    const edge = "clamp(16px, 4%, 56px)"
    const counterStyle: React.CSSProperties =
        counterPlacement === "topLeft"
            ? { left: edge, top: edge }
            : counterPlacement === "bottomLeft"
            ? { left: edge, bottom: edge }
            : { left: edge, top: "50%", transform: "translateY(-50%)" }

    const navWrapStyle: React.CSSProperties =
        navPlacement === "sides"
            ? {
                  left: edge, right: edge, top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex", justifyContent: "space-between",
              }
            : navPlacement === "bottomLeft"
            ? { left: edge, bottom: edge, display: "flex", gap: 10 }
            : navPlacement === "bottomRight"
            ? { right: edge, bottom: edge, display: "flex", gap: 10 }
            : {
                  left: "50%", bottom: edge,
                  transform: "translateX(-50%)",
                  display: "flex", gap: 10,
              }

    return (
        <div
            ref={ref}
            tabIndex={interactive ? 0 : -1}
            onKeyDown={onKeyDown}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                WebkitUserSelect: "none",
                outline: "none",
                color: accent,
                ...font,
                ...style,
            }}
        >
            {showCounter && (
                <div
                    style={{
                        position: "absolute",
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "0.04em",
                        zIndex: 20,
                        ...counterStyle,
                    }}
                >
                    {String(current).padStart(2, "0")}
                    <span style={{ opacity: 0.4 }}>/{String(count).padStart(2, "0")}</span>
                </div>
            )}

            <div
                style={{
                    position: "relative",
                    width: cardW,
                    height: stageH,
                    marginBottom: reserve, // lifts the stack to clear the caption + arrows
                }}
            >
                <div style={{ position: "absolute", left: 0, top: cardH * stackTop, width: "100%" }}>
                    {list.map((slide, i) => {
                        const d = order.indexOf(i)
                        return (
                            <Card
                                key={i}
                                index={i}
                                slide={slide}
                                depth={d < 0 ? count - 1 : d}
                                count={count}
                                cardH={cardH}
                                band={band}
                                shrink={shrink}
                                fade={fade}
                                radius={radius}
                                grayscale={grayscale}
                                tilt={tilt}
                                threshold={threshold}
                                fallSpeed={fallSpeed}
                                interactive={interactive}
                                isFlying={flying.includes(i)}
                                isReturning={returning.includes(i)}
                                nextSeq={nextSeq}
                                onThrow={throwFront}
                                onLanded={landed}
                                onReturned={returned}
                                showCaption={showCaption}
                                font={font}
                            />
                        )
                    })}
                </div>
            </div>

            {showNav && count > 1 && (
                <div style={{ position: "absolute", zIndex: 20, ...navWrapStyle }}>
                    <NavButton
                        dir={-1}
                        onClick={goPrev}
                        size={navSize}
                        accent={accent}
                        disabled={!interactive || prevBusy}
                    />
                    <NavButton
                        dir={1}
                        onClick={goNext}
                        size={navSize}
                        accent={accent}
                        disabled={!interactive}
                    />
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------- controls

addPropertyControls(ImageQueue, {
    slides: {
        type: ControlType.Array,
        title: "Slides",
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.ResponsiveImage, title: "Image" },
                caption: { type: ControlType.String, title: "Caption", defaultValue: "" },
            },
        },
        defaultValue: [{}, {}, {}, {}],
        maxCount: 24,
    },
    background: { type: ControlType.Color, title: "Background", defaultValue: "#C9C9C9" },
    accent: { type: ControlType.Color, title: "Text", defaultValue: "#111111" },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: 13, letterSpacing: "0.14em" },
    },
    aspect: {
        type: ControlType.Number,
        title: "Ratio",
        description: "Card width ÷ height",
        min: 0.4, max: 2.5, step: 0.01, defaultValue: 1,
    },
    scale: {
        type: ControlType.Number, title: "Size",
        min: 0.2, max: 1, step: 0.01, defaultValue: 0.86, displayStepper: false,
    },
    band: {
        type: ControlType.Number,
        title: "Peek",
        description: "How far each card behind pokes out, as a share of card height",
        min: 0, max: 0.4, step: 0.005, defaultValue: 0.082,
    },
    shrink: { type: ControlType.Number, title: "Shrink", min: 0.5, max: 1, step: 0.01, defaultValue: 0.79 },
    fade: { type: ControlType.Number, title: "Fade", min: 0, max: 0.5, step: 0.01, defaultValue: 0.2 },
    radius: { type: ControlType.Number, title: "Radius", min: 0, max: 80, step: 1, defaultValue: 0 },
    grayscale: { type: ControlType.Boolean, title: "B&W", defaultValue: true },
    tilt: {
        type: ControlType.Number,
        title: "Tilt",
        description: "Degrees of rotation per pixel dragged",
        min: 0, max: 0.2, step: 0.005, defaultValue: 0.05,
    },
    threshold: {
        type: ControlType.Number,
        title: "Throw at",
        description: "Drag distance (px) needed to release the card",
        min: 10, max: 300, step: 5, defaultValue: 60,
    },
    fallSpeed: { type: ControlType.Number, title: "Fall speed", min: 0.4, max: 3, step: 0.05, defaultValue: 1 },
    showNav: { type: ControlType.Boolean, title: "Arrows", defaultValue: true },
    navPlacement: {
        type: ControlType.Enum,
        title: "Arrows at",
        options: ["bottomCenter", "bottomLeft", "bottomRight", "sides"],
        optionTitles: ["Bottom center", "Bottom left", "Bottom right", "Sides"],
        defaultValue: "bottomCenter",
        hidden: (p) => !p.showNav,
    },
    navSize: {
        type: ControlType.Number, title: "Arrow size",
        min: 28, max: 88, step: 1, defaultValue: 46,
        hidden: (p) => !p.showNav,
    },
    showCounter: { type: ControlType.Boolean, title: "Counter", defaultValue: true },
    counterPlacement: {
        type: ControlType.Enum,
        title: "Counter at",
        options: ["left", "topLeft", "bottomLeft"],
        optionTitles: ["Left", "Top left", "Bottom left"],
        defaultValue: "left",
        hidden: (p) => !p.showCounter,
    },
    showCaption: { type: ControlType.Boolean, title: "Captions", defaultValue: true },
})
