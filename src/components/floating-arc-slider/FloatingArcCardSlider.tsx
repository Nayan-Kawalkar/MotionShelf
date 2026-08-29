import { addPropertyControls, ControlType } from "framer"
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
} from "react"

/**
 * FLOATING ARC CARD SLIDER
 *
 * A 1:1 port of the "/nk — Floating Arc Card Slider" HTML prototype.
 * Two infinite rows of cards ride an inverted parabola across the frame,
 * drifting on hover, dragging on pointer-down, scrubbing on wheel, with a
 * cursor-tracking spotlight border on every card.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 620
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface CardData {
    /** Image only — no title, no author, image edge to edge. */
    imageOnly?: boolean
    /** Where the image sits when the card has text. ("full" is the old
     *  spelling of imageOnly and still works.) */
    type: "image" | "text" | "full"
    title: string
    name: string
    role: string
    image: string
    avatar?: string
    /** Optional destination. Set one and the card becomes clickable. */
    link?: string
}

interface Props {
    // content
    cards: CardData[]
    rowOffset: number
    repeatCount: number
    linkTarget: "_self" | "_blank"

    // card
    cardWidth: number
    cardHeight: number
    cardGap: number
    cardRadius: number
    cardPadding: number
    scaleTypography: boolean
    grayscale: boolean
    serifFont: string
    sansFont: string
    loadGoogleFonts: boolean

    // rows
    row1Top: number
    row1Depth: number
    row2Top: number
    row2Depth: number
    row2Speed: number

    // motion
    easing: number
    dragEasing: number
    momentum: number
    wheelSpeed: number
    dragSpeed: number
    hoverSpeed: number
    touchSpeed: number
    speedBoost: boolean
    autoScroll: number
    floatAmount: number
    floatSpeed: number
    lockPageScroll: boolean

    // depth falloff
    opacityFalloff: number
    scaleFalloff: number
    rotateZAmount: number
    rotateYAmount: number
    perspective: number

    // colors
    showBackground: boolean
    bgInner: string
    bgOuter: string
    cardBg: string
    cardBorder: string
    accent: string
    textMain: string
    textMuted: string

    // glow
    glowEnabled: boolean
    glowRadius: number
    glowThickness: number
    glowFill: number

    style?: CSSProperties
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parses hex / rgb() / rgba() into [r, g, b, a]. Returns null for anything
 *  else (design tokens, hsl, named colours) so callers can fall back. */
function toRgb(color: string): [number, number, number, number] | null {
    if (!color) return null
    const c = color.trim()

    if (c[0] === "#") {
        let hex = c.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .split("")
                .map((ch) => ch + ch)
                .join("")
        }
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
        if (![r, g, b].some((n) => Number.isNaN(n))) return [r, g, b, a]
        return null
    }

    const m = c.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat)
        if (p.length >= 3)
            return [p[0], p[1], p[2], p[3] !== undefined ? p[3] : 1]
    }

    return null
}

/** `color` at `alpha` opacity. Falls back to color-mix for exotic values. */
function withAlpha(color: string, alpha: number): string {
    const rgb = toRgb(color)
    if (!rgb) {
        return `color-mix(in srgb, ${color} ${Math.round(
            alpha * 100
        )}%, transparent)`
    }
    const [r, g, b, a] = rgb
    return `rgba(${r}, ${g}, ${b}, ${a * alpha})`
}

/** `color` multiplied toward black — used for the outer background stop. */
function shade(color: string, factor: number): string {
    const rgb = toRgb(color)
    if (!rgb) return color
    const [r, g, b, a] = rgb
    const f = (n: number) => Math.max(0, Math.min(255, Math.round(n * factor)))
    return `rgba(${f(r)}, ${f(g)}, ${f(b)}, ${a})`
}

const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap"

const STYLE_ID = "fa-arc-slider-styles"

const BASE_CSS = `
.fa-arc-card, .fa-arc-card * { box-sizing: border-box; }
a.fa-arc-card {
  text-decoration: none;
  color: inherit;
  -webkit-user-drag: none;
  -webkit-tap-highlight-color: transparent;
}
.fa-arc-card {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  will-change: transform, opacity;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  contain: layout paint style;
  transition: box-shadow 0.3s ease;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
}
/* The two spotlight layers are expensive to composite, so they only exist
   while a card is actually being hovered. */
.fa-arc-card.fa-glow::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: var(--fa-glow-thickness, 1.5px);
  background: radial-gradient(
    var(--fa-glow-radius, 100px) circle at var(--fa-mx, -200px) var(--fa-my, -200px),
    var(--fa-glow-a) 0%,
    var(--fa-glow-b) 45%,
    transparent 80%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: var(--fa-glow-opacity, 0);
  transition: opacity 0.25s ease;
  z-index: 5;
}
.fa-arc-card.fa-glow::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    calc(var(--fa-glow-radius, 100px) * 1.2) circle at var(--fa-mx, -200px) var(--fa-my, -200px),
    var(--fa-glow-c) 0%,
    var(--fa-glow-d) 50%,
    transparent 80%
  );
  pointer-events: none;
  opacity: var(--fa-glow-opacity, 0);
  transition: opacity 0.25s ease;
  z-index: 1;
}
.fa-arc-card:hover { box-shadow: 0 20px 45px var(--fa-hover-shadow); }
.fa-arc-card[data-off="1"] { display: none; }
.fa-arc-media {
  position: relative;
  z-index: 2;
  width: 100%;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  filter: var(--fa-media-filter, none);
  transition: filter 0.3s ease;
}
.fa-arc-card:hover .fa-arc-media { filter: none; }
.fa-arc-avatar {
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  filter: var(--fa-avatar-filter, none);
}
`

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function FloatingArcCardSlider(userProps: Partial<Props>) {
    const props = useMemo(() => {
        const merged: any = { ...DEFAULTS }
        for (const k in userProps) {
            const v = (userProps as any)[k]
            if (v !== undefined) merged[k] = v
        }
        return merged as Props
    }, [userProps])

    const {
        cards,
        rowOffset,
        repeatCount,
        linkTarget,
        cardWidth,
        cardHeight,
        cardGap,
        cardRadius,
        cardPadding,
        scaleTypography,
        grayscale,
        serifFont,
        sansFont,
        loadGoogleFonts,
        row1Top,
        row1Depth,
        row2Top,
        row2Depth,
        row2Speed,
        easing,
        dragEasing,
        momentum,
        wheelSpeed,
        dragSpeed,
        hoverSpeed,
        touchSpeed,
        speedBoost,
        autoScroll,
        floatAmount,
        floatSpeed,
        lockPageScroll,
        opacityFalloff,
        scaleFalloff,
        rotateZAmount,
        rotateYAmount,
        perspective,
        showBackground,
        bgInner,
        bgOuter,
        cardBg,
        cardBorder,
        accent,
        textMain,
        textMuted,
        glowEnabled,
        glowRadius,
        glowThickness,
        glowFill,
        style,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const row1Refs = useRef<(HTMLDivElement | null)[]>([])
    const row2Refs = useRef<(HTMLDivElement | null)[]>([])

    const scroll = useRef(0)
    const target = useRef(0)
    const size = useRef({ w: 1200, h: 620 })
    const dragging = useRef(false)
    const lastX = useRef<number | null>(null)
    const lastT = useRef(0)
    const vel = useRef(0)
    const moved = useRef(0)
    const captured = useRef(false)
    const pointerId = useRef(0)
    const dirty = useRef(true)
    const onScreen = useRef(true)

    const list = cards && cards.length ? cards : []
    const slots = useMemo(
        () => Array.from({ length: Math.max(1, Math.round(repeatCount)) }),
        [repeatCount]
    )

    const itemSpacing = cardWidth + cardGap
    const trackWidth = slots.length * itemSpacing

    // Drop refs for cards that no longer exist.
    row1Refs.current.length = slots.length
    row2Refs.current.length = slots.length

    // Live config for the animation loop. Written every render, read inside
    // rAF — so prop tweaks apply instantly without restarting the loop.
    const cfg = useRef<any>({})
    cfg.current = {
        cardWidth,
        itemSpacing,
        trackWidth,
        easing,
        dragEasing,
        momentum,
        autoScroll,
        floatAmount,
        floatSpeed,
        row1Top,
        row1Depth,
        row2Top,
        row2Depth,
        row2Speed,
        opacityFalloff,
        scaleFalloff,
        rotateZAmount,
        rotateYAmount,
    }
    dirty.current = true

    /* ---------------- stylesheet + webfonts ---------------- */
    useEffect(() => {
        if (typeof document === "undefined") return
        if (!document.getElementById(STYLE_ID)) {
            const el = document.createElement("style")
            el.id = STYLE_ID
            el.textContent = BASE_CSS
            document.head.appendChild(el)
        }
    }, [])

    useEffect(() => {
        if (!loadGoogleFonts || typeof document === "undefined") return
        if (document.querySelector(`link[href="${FONT_HREF}"]`)) return
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = FONT_HREF
        document.head.appendChild(link)
    }, [loadGoogleFonts])

    /* ---------------- measure ---------------- */
    useEffect(() => {
        const node = containerRef.current
        if (!node || typeof ResizeObserver === "undefined") return
        const measure = () => {
            const r = node.getBoundingClientRect()
            size.current = { w: r.width || 1, h: r.height || 1 }
            dirty.current = true
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(node)

        // Stop animating while the section is off-screen.
        let io: IntersectionObserver | null = null
        if (typeof IntersectionObserver !== "undefined") {
            io = new IntersectionObserver(
                ([e]) => {
                    onScreen.current = e.isIntersecting
                    dirty.current = true
                },
                { rootMargin: "120px" }
            )
            io.observe(node)
        }

        return () => {
            ro.disconnect()
            io?.disconnect()
        }
    }, [])

    /* ---------------- wheel ---------------- */
    useEffect(() => {
        const node = containerRef.current
        if (!node) return
        const onWheel = (e: WheelEvent) => {
            if (lockPageScroll) e.preventDefault()
            target.current += e.deltaY * wheelSpeed
        }
        node.addEventListener("wheel", onWheel, { passive: !lockPageScroll })
        return () => node.removeEventListener("wheel", onWheel)
    }, [wheelSpeed, lockPageScroll])

    /* ---------------- render loop ----------------
     * Reads everything through `cfg`, so changing a property control never
     * tears down and restarts the loop mid-scroll. */
    useEffect(() => {
        let raf = 0
        let prev = 0

        const opCache: number[][] = [[], []]
        const offCache: number[][] = [[], []]

        const round = (n: number) => Math.round(n * 100) / 100

        const placeRow = (
            row: 0 | 1,
            refs: (HTMLDivElement | null)[],
            scrollValue: number,
            phaseOffset: number,
            topY: number,
            depth: number,
            jiggleOffset: number,
            time: number,
            W: number
        ) => {
            const c = cfg.current
            const { cardWidth: cw, itemSpacing: gap, trackWidth: track } = c
            const half = W / 2
            const margin = cw * 1.4
            const ops = opCache[row]
            const offs = offCache[row]

            for (let i = 0; i < refs.length; i++) {
                const el = refs[i]
                if (!el) continue

                let rawX = (i * gap - scrollValue + phaseOffset) % track
                if (rawX < -cw) rawX += track
                if (rawX > track - cw) rawX -= track

                const x = rawX - cw / 2

                // Cull: the track is several screens wide, so most cards sit
                // far off to the side. Hidden cards cost nothing to composite.
                const visible = x > -margin && x < W + margin
                const offFlag = visible ? 0 : 1
                if (offs[i] !== offFlag) {
                    offs[i] = offFlag
                    el.setAttribute("data-off", offFlag ? "1" : "0")
                }
                if (!visible) continue

                const normX = (x + cw / 2 - half) / half
                const curve = 1 - normX * normX
                const y =
                    topY +
                    curve * depth +
                    Math.sin(time * c.floatSpeed + (i + jiggleOffset) * 0.7) *
                        c.floatAmount

                const absN = normX < 0 ? -normX : normX
                const t = 1 - (absN * c.opacityFalloff > 1 ? 1 : absN * c.opacityFalloff)
                const opacity = Math.max(0.05, t * t)
                const scale = 1 - absN * c.scaleFalloff
                const rotateZ = normX * -c.rotateZAmount
                const rotateY = normX * -c.rotateYAmount

                el.style.transform = `translate3d(${round(x)}px, ${round(
                    y
                )}px, 0px) scale(${round(scale * 1000) / 1000}) rotateZ(${round(
                    rotateZ
                )}deg) rotateY(${round(rotateY)}deg)`

                // opacity is stable while idle — only write it when it moves
                const op = Math.round(opacity * 1000) / 1000
                if (ops[i] !== op) {
                    ops[i] = op
                    el.style.opacity = op as unknown as string
                }
            }
        }

        const render = (time: number) => {
            raf = requestAnimationFrame(render)

            if (!onScreen.current) {
                prev = 0
                return
            }

            const c = cfg.current
            if (!prev) prev = time
            let dt = time - prev
            prev = time
            if (!(dt > 0)) dt = 16.667
            // frame factor, clamped so a dropped frame can't fling the track
            const f = Math.min(3, dt / 16.6667)

            if (c.autoScroll) target.current += c.autoScroll * f

            // flick momentum: keep gliding after the pointer lets go
            if (!dragging.current && (vel.current > 0.02 || vel.current < -0.02)) {
                target.current += vel.current * f
                vel.current *= Math.pow(c.momentum, f)
            }

            const gap = target.current - scroll.current
            const idle = gap < 0.02 && gap > -0.02

            if (idle) {
                scroll.current = target.current
            } else {
                // frame-rate independent easing: identical feel at 60 and 120Hz
                const e = dragging.current ? c.dragEasing : c.easing
                scroll.current += gap * (1 - Math.pow(1 - Math.min(0.999, e), f))
            }

            // nothing to draw: parked, no float, no resize since last frame
            if (idle && !c.floatAmount && !dirty.current) return
            dirty.current = false

            const { w: W, h: H } = size.current
            const r1TopY = H * c.row1Top
            const r1Depth = H * c.row1Depth

            placeRow(0, row1Refs.current, scroll.current, 0, r1TopY, r1Depth, 0, time, W)
            placeRow(
                1,
                row2Refs.current,
                scroll.current * c.row2Speed,
                c.itemSpacing / 2,
                H * c.row2Top,
                H * c.row2Depth,
                5,
                time,
                W
            )
        }

        raf = requestAnimationFrame(render)
        return () => cancelAnimationFrame(raf)
    }, [])

    /* ---------------- pointer drag + hover drift ---------------- */
    const boostFactor = useCallback(
        (delta: number, dt: number) => {
            if (!speedBoost) return 1
            const speed = Math.abs(delta) / dt
            return 1 + Math.min(Math.pow(speed, 1.2) * 1.2, 3.5)
        },
        [speedBoost]
    )

    const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        const t = e.target as HTMLElement
        if (t.closest("[data-nodrag]")) return
        dragging.current = true
        moved.current = 0
        vel.current = 0
        lastX.current = e.clientX
        lastT.current = performance.now()
        pointerId.current = e.pointerId
        captured.current = false
        e.currentTarget.style.cursor = "grabbing"
    }, [])

    /** Pointer capture is taken only once the gesture is really a drag.
     *  Capturing on pointerdown would retarget the click and break card links. */
    const captureIfDragging = useCallback((el: HTMLElement) => {
        if (captured.current || moved.current <= 6) return
        try {
            el.setPointerCapture(pointerId.current)
            captured.current = true
        } catch (err) {}
    }, [])

    /** One pointer sample -> scroll delta. Called once per coalesced sample so
     *  a 120Hz trackpad or stylus feeds every point into the motion. */
    const applySample = useCallback(
        (clientX: number, now: number, touch: boolean) => {
            if (lastX.current === null) {
                lastX.current = clientX
                lastT.current = now
                return
            }
            const dt = Math.max(1, now - lastT.current)
            const raw = lastX.current - clientX
            lastX.current = clientX
            lastT.current = now
            if (!raw) return

            const boost = boostFactor(raw, dt)

            if (dragging.current) {
                moved.current += raw < 0 ? -raw : raw
                const delta = raw * (touch ? touchSpeed : dragSpeed) * boost
                target.current += delta
                // exponential average -> a stable flick velocity, in px/frame
                const perFrame = (delta / dt) * 16.6667
                vel.current = vel.current * 0.7 + perFrame * 0.3
            } else if (hoverSpeed) {
                target.current += -raw * hoverSpeed * boost
            }
        },
        [dragSpeed, hoverSpeed, touchSpeed, boostFactor]
    )

    const onPointerMove = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            const touch = e.pointerType === "touch"
            const native: any = e.nativeEvent
            const coalesced =
                dragging.current && typeof native.getCoalescedEvents === "function"
                    ? native.getCoalescedEvents()
                    : null

            if (coalesced && coalesced.length > 1) {
                for (let i = 0; i < coalesced.length; i++) {
                    const s = coalesced[i]
                    applySample(s.clientX, s.timeStamp || performance.now(), touch)
                }
            } else {
                applySample(e.clientX, performance.now(), touch)
            }

            if (dragging.current) captureIfDragging(e.currentTarget)
        },
        [applySample, captureIfDragging]
    )

    const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return
        dragging.current = false
        // stale grip (finger held still before release) shouldn't fling
        if (performance.now() - lastT.current > 120) vel.current = 0
        e.currentTarget.style.cursor = "grab"
        if (captured.current) {
            captured.current = false
            try {
                ;(e.currentTarget as HTMLElement).releasePointerCapture(
                    e.pointerId
                )
            } catch (err) {}
        }
    }, [])

    const onPointerLeave = useCallback(() => {
        dragging.current = false
        lastX.current = null
    }, [])

    /** Swallow the click that ends a drag, so flicking the track never
     *  navigates. A real click (under ~6px of travel) goes through. */
    const onCardClick = useCallback((e: ReactMouseEvent<HTMLElement>) => {
        if (moved.current > 6) {
            e.preventDefault()
            e.stopPropagation()
        }
    }, [])

    /* ---------------- card glow ----------------
     * The spotlight layers are attached on enter and detached ~after the fade
     * out, so only the hovered card ever carries them. */
    const glowTimers = useRef(new WeakMap<HTMLElement, number>())

    const onCardMove = useCallback(
        (e: ReactMouseEvent<HTMLElement>) => {
            if (!glowEnabled) return
            const el = e.currentTarget
            const timer = glowTimers.current.get(el)
            if (timer) {
                clearTimeout(timer)
                glowTimers.current.delete(el)
            }
            const rect = el.getBoundingClientRect()
            el.style.setProperty("--fa-mx", `${e.clientX - rect.left}px`)
            el.style.setProperty("--fa-my", `${e.clientY - rect.top}px`)
            if (!el.classList.contains("fa-glow")) {
                el.classList.add("fa-glow")
                // next frame, so the opacity transition has a 0 to start from
                requestAnimationFrame(() =>
                    el.style.setProperty("--fa-glow-opacity", "1")
                )
            }
        },
        [glowEnabled]
    )

    const onCardLeave = useCallback((e: ReactMouseEvent<HTMLElement>) => {
        const el = e.currentTarget
        el.style.setProperty("--fa-glow-opacity", "0")
        const timer = window.setTimeout(() => {
            el.classList.remove("fa-glow")
            glowTimers.current.delete(el)
        }, 300)
        glowTimers.current.set(el, timer)
    }, [])

    /* ---------------- derived styling ---------------- */
    const ts = scaleTypography ? cardWidth / 135 : 1
    const hs = scaleTypography ? cardHeight / 185 : 1

    const cardStyle: CSSProperties = {
        width: cardWidth,
        height: cardHeight,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: cardRadius,
        padding: cardPadding,
    }

    const titleStyle: CSSProperties = {
        position: "relative",
        zIndex: 2,
        fontFamily: `${serifFont}, Georgia, serif`,
        fontSize: 11.5 * ts,
        lineHeight: 1.25,
        color: textMain,
        fontWeight: 400,
        letterSpacing: -0.1 * ts,
    }

    const footerStyle: CSSProperties = {
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        gap: 6 * ts,
        marginTop: "auto",
    }

    const nameStyle: CSSProperties = {
        fontSize: 9 * ts,
        fontWeight: 500,
        color: textMain,
        lineHeight: 1.1,
    }

    const roleStyle: CSSProperties = {
        fontSize: 7.5 * ts,
        color: textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.4 * ts,
        marginTop: 1,
    }

    const renderCard = (row: 0 | 1, i: number) => {
        const data =
            list.length === 0
                ? null
                : list[
                      (row === 0 ? i : i + Math.round(rowOffset)) % list.length
                  ]

        const img = data?.image ?? ""
        const avatar = data?.avatar || img
        const isFull = data?.imageOnly === true || data?.type === "full"
        const isImageFirst = data?.type === "image"
        const link = data?.link || ""

        const media = (
            <div
                className="fa-arc-media"
                style={
                    isFull
                        ? {
                              // full-bleed: one image, edge to edge, nothing else
                              height: "100%",
                              flex: 1,
                              borderRadius: "inherit",
                              zIndex: 0,
                              backgroundImage: img ? `url("${img}")` : undefined,
                              backgroundColor: img
                                  ? undefined
                                  : withAlpha(textMuted, 0.2),
                          }
                        : {
                              height: (isImageFirst ? 72 : 65) * hs,
                              borderRadius: 6 * ts,
                              backgroundImage: img ? `url("${img}")` : undefined,
                              backgroundColor: img
                                  ? undefined
                                  : withAlpha(textMuted, 0.2),
                              ...(isImageFirst
                                  ? { marginBottom: 6 * hs }
                                  : { margin: `${6 * hs}px 0` }),
                          }
                }
            />
        )

        const title = (
            <div
                style={{
                    ...titleStyle,
                    fontSize: (isImageFirst ? 11 : 11.5) * ts,
                }}
            >
                {data?.title ?? ""}
            </div>
        )

        const footer = (
            <div style={footerStyle}>
                <div
                    className="fa-arc-avatar"
                    style={{
                        width: 20 * ts,
                        height: 20 * ts,
                        backgroundImage: avatar ? `url("${avatar}")` : undefined,
                        backgroundColor: avatar
                            ? undefined
                            : withAlpha(textMuted, 0.3),
                    }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={nameStyle}>{data?.name ?? ""}</span>
                    <span style={roleStyle}>{data?.role ?? ""}</span>
                </div>
            </div>
        )

        // `key` is kept out of this object: React 19 warns when a key arrives
        // through a spread, so it is passed explicitly at each call site.
        const key = `${row}-${i}`
        const shared = {
            className: "fa-arc-card",
            ref: (el: HTMLElement | null) => {
                if (row === 0) row1Refs.current[i] = el as HTMLDivElement
                else row2Refs.current[i] = el as HTMLDivElement
            },
            style: {
                ...cardStyle,
                ...(isFull ? { padding: 0 } : null),
                ...(link ? { cursor: "pointer" } : null),
            },
            onMouseMove: onCardMove,
            onMouseLeave: onCardLeave,
            draggable: false,
        }

        const body = isFull ? (
            media
        ) : (
            <>
                {isImageFirst ? (
                    <>
                        {media}
                        {title}
                    </>
                ) : (
                    <>
                        {title}
                        {media}
                    </>
                )}
                {footer}
            </>
        )

        // A real anchor when a link is set, so it behaves like one (middle
        // click, open in new tab, right-click copy). A drag never navigates.
        return link ? (
            <a
                key={key}
                {...shared}
                href={link}
                target={linkTarget}
                rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
                onClick={onCardClick}
            >
                {body}
            </a>
        ) : (
            <div key={key} {...shared}>{body}</div>
        )
    }

    const rootStyle: CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        perspective: perspective,
        cursor: "grab",
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        fontFamily: `${sansFont}, -apple-system, sans-serif`,
        background: showBackground
            ? `radial-gradient(circle at 50% 50%, ${bgInner} 0%, ${bgOuter} 70%, ${shade(
                  bgOuter,
                  0.5
              )} 100%)`
            : undefined,
        // CSS custom properties consumed by the injected stylesheet
        ["--fa-glow-radius" as any]: `${glowRadius}px`,
        ["--fa-glow-thickness" as any]: `${glowThickness}px`,
        ["--fa-glow-a" as any]: withAlpha(accent, 1),
        ["--fa-glow-b" as any]: withAlpha(accent, 0.5),
        ["--fa-glow-c" as any]: withAlpha(accent, 0.22 * glowFill),
        ["--fa-glow-d" as any]: withAlpha(accent, 0.05 * glowFill),
        ["--fa-hover-shadow" as any]: withAlpha(accent, 0.15),
        ["--fa-media-filter" as any]: grayscale
            ? "grayscale(100%) contrast(1.05)"
            : "none",
        ["--fa-avatar-filter" as any]: grayscale ? "grayscale(100%)" : "none",
        ...style,
    }

    return (
        <div
            ref={containerRef}
            style={rootStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={onPointerLeave}
        >
            {slots.map((_, i) => [renderCard(0, i), renderCard(1, i)])}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=300&q=80`

/** True when a card shows nothing but its image. */
const imageOnlyCard = (c: Partial<CardData>) =>
    c?.imageOnly === true || c?.type === "full"

const DEFAULT_CARDS: CardData[] = [
    { type: "text", title: "Liderar desde la cocina", name: "Mar Castagno", role: "FREELANCE", image: U("1534528741775-53994a69daeb") },
    { type: "text", title: "Hacerlo bien aunque nadie lo vea", name: "Marcos Llerena", role: "MANDARINA", image: U("1507003211169-0a1dd7228f2d") },
    { type: "image", title: "Tres historias sobre el...", name: "Fernando Vega Olmos", role: "ANITA & VEGA", image: U("1472099645785-5658abf4ff4e") },
    { type: "image", title: "La llamada que no esperaba", name: "Liva Grinberga", role: "NOT ON SALE", image: U("1544005313-94ddf0286df2") },
    { type: "text", title: "Inventando un nuevo lenguaje", name: "Wesly Haar", role: "MONKS", image: U("1500648767791-00dcc994a43e") },
    { type: "text", title: "Momento de inspiración: una historia", name: "Luciana Capriotti", role: "CONSULTANT", image: U("1573496359142-b8d87734a5a2") },
    { type: "image", title: "La calma también es un...", name: "Hernan Puente", role: "INDICIUS", image: U("1519085360753-af0119f7cbe7") },
    { type: "image", title: "Construir lo posible", name: "Lucas Davison", role: "DHNN", image: U("1506794778202-cad84cf45f1d") },
    { type: "image", title: "La comunidad como motor", name: "Alan Buscaglia", role: "GENTLEMAN PROGRAMMING", image: U("1522075469751-3a6694fb2f61") },
    { type: "text", title: "Crear, soltar, volver a empezar", name: "Ramón Vasquez Mansilla", role: "PRIMATE CLAN", image: U("1501196354995-cbb51c65aaea") },
    { type: "image", title: "La tecnología no alcanza", name: "Lucas Llorente", role: "ZETENTA", image: U("1522071820081-009f0129c71c") },
    { type: "text", title: "Contar cuentitos", name: "Lucia Aguilar", role: "TRYOLABS", image: U("1534528741775-53994a69daeb") },
    { type: "text", title: "La inspiración que nace desde la fricción", name: "Emiliano Tomas", role: "UNKNOWN LABS", image: U("1539571696357-5a69c17a67c6") },
    // Image-only cards: no title, no author — just the picture, edge to edge.
    { imageOnly: true, type: "text", title: "", name: "", role: "", image: U("1517841905240-472988babdf9") },
    { imageOnly: true, type: "text", title: "", name: "", role: "", image: U("1524504388940-b1c1722653e1") },
]

/* @controls:start */
const DEFAULTS: Omit<Props, "style"> = {
    cards: DEFAULT_CARDS,
    rowOffset: 7,
    repeatCount: 22,
    linkTarget: "_self",

    cardWidth: 135,
    cardHeight: 185,
    cardGap: 30,
    cardRadius: 10,
    cardPadding: 10,
    scaleTypography: true,
    grayscale: true,
    serifFont: "Playfair Display",
    sansFont: "Inter",
    loadGoogleFonts: true,

    row1Top: 0.08,
    row1Depth: 0.12,
    row2Top: 0.46,
    row2Depth: 0.12,
    row2Speed: 1.05,

    easing: 0.1,
    dragEasing: 0.24,
    momentum: 0.94,
    wheelSpeed: 0.85,
    dragSpeed: 0.75,
    hoverSpeed: 0.12,
    touchSpeed: 1.2,
    speedBoost: true,
    autoScroll: 0,
    floatAmount: 4.5,
    floatSpeed: 0.0018,
    lockPageScroll: false,

    opacityFalloff: 0.75,
    scaleFalloff: 0.1,
    rotateZAmount: 8,
    rotateYAmount: 6,
    perspective: 1200,

    showBackground: true,
    bgInner: "#0c2b27",
    bgOuter: "#041413",
    cardBg: "#09201e",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    accent: "#2bdca3",
    textMain: "#e3f2ef",
    textMuted: "#5e837f",

    glowEnabled: true,
    glowRadius: 100,
    glowThickness: 1.5,
    glowFill: 1,

}
/* @controls:end */

/* ------------------------------------------------------------------ */
/* Property controls                                                   */
/* ------------------------------------------------------------------ */

addPropertyControls(FloatingArcCardSlider, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        control: {
            type: ControlType.Object,
            controls: {
                imageOnly: {
                    type: ControlType.Boolean,
                    title: "Content",
                    enabledTitle: "Image",
                    disabledTitle: "Text + Image",
                    defaultValue: false,
                },
                type: {
                    type: ControlType.Enum,
                    title: "Layout",
                    options: ["text", "image"],
                    optionTitles: ["Title first", "Image first"],
                    defaultValue: "text",
                    displaySegmentedControl: true,
                    hidden: (c: CardData) => imageOnlyCard(c),
                },
                title: {
                    type: ControlType.String,
                    title: "Title",
                    defaultValue: "Liderar desde la cocina",
                    displayTextArea: true,
                    hidden: (c: CardData) => imageOnlyCard(c),
                },
                name: {
                    type: ControlType.String,
                    title: "Name",
                    defaultValue: "Mar Castagno",
                    hidden: (c: CardData) => imageOnlyCard(c),
                },
                role: {
                    type: ControlType.String,
                    title: "Role",
                    defaultValue: "FREELANCE",
                    hidden: (c: CardData) => imageOnlyCard(c),
                },
                image: { type: ControlType.Image, title: "Image" },
                avatar: {
                    type: ControlType.Image,
                    title: "Avatar",
                    hidden: (c: CardData) => imageOnlyCard(c),
                },
                link: { type: ControlType.Link, title: "Link" },
            },
        },
        defaultValue: DEFAULT_CARDS,
    },
    rowOffset: {
        type: ControlType.Number,
        title: "Row 2 Offset",
        description: "How far into the list the second row starts.",
        min: 0,
        max: 50,
        step: 1,
        defaultValue: 7,
    },
    linkTarget: {
        type: ControlType.Enum,
        title: "Open In",
        description: "Where a card's link opens. Dragging never navigates.",
        options: ["_self", "_blank"],
        optionTitles: ["Same tab", "New tab"],
        defaultValue: "_self",
        displaySegmentedControl: true,
    },
    repeatCount: {
        type: ControlType.Number,
        title: "Cards / Row",
        description: "Cards rendered per row. Higher = longer loop.",
        min: 4,
        max: 60,
        step: 1,
        defaultValue: 22,
    },

    /* ---- card ---- */
    cardWidth: {
        type: ControlType.Number,
        title: "Card W",
        min: 60,
        max: 400,
        step: 1,
        defaultValue: 135,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card H",
        min: 80,
        max: 500,
        step: 1,
        defaultValue: 185,
    },
    cardGap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 200,
        step: 1,
        defaultValue: 30,
    },
    cardRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 10,
    },
    cardPadding: {
        type: ControlType.Number,
        title: "Padding",
        min: 0,
        max: 40,
        step: 1,
        defaultValue: 10,
    },
    scaleTypography: {
        type: ControlType.Boolean,
        title: "Scale Type",
        description: "Scale text and media with the card size.",
        defaultValue: true,
    },
    grayscale: {
        type: ControlType.Boolean,
        title: "Grayscale",
        description: "Desaturate images until hover.",
        defaultValue: true,
    },
    serifFont: {
        type: ControlType.String,
        title: "Serif",
        defaultValue: "Playfair Display",
    },
    sansFont: {
        type: ControlType.String,
        title: "Sans",
        defaultValue: "Inter",
    },
    loadGoogleFonts: {
        type: ControlType.Boolean,
        title: "Google Fonts",
        description: "Load Inter + Playfair Display from Google Fonts.",
        defaultValue: true,
    },

    /* ---- rows ---- */
    row1Top: {
        type: ControlType.Number,
        title: "Row 1 Y",
        min: -0.5,
        max: 1,
        step: 0.01,
        displayStepper: true,
        defaultValue: 0.08,
    },
    row1Depth: {
        type: ControlType.Number,
        title: "Row 1 Arc",
        min: -0.5,
        max: 0.5,
        step: 0.01,
        displayStepper: true,
        defaultValue: 0.12,
    },
    row2Top: {
        type: ControlType.Number,
        title: "Row 2 Y",
        min: -0.5,
        max: 1.5,
        step: 0.01,
        displayStepper: true,
        defaultValue: 0.46,
    },
    row2Depth: {
        type: ControlType.Number,
        title: "Row 2 Arc",
        min: -0.5,
        max: 0.5,
        step: 0.01,
        displayStepper: true,
        defaultValue: 0.12,
    },
    row2Speed: {
        type: ControlType.Number,
        title: "Row 2 Speed",
        description: "Parallax multiplier against row 1.",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 1.05,
    },

    /* ---- motion ---- */
    easing: {
        type: ControlType.Number,
        title: "Smoothing",
        description: "Lower = heavier, floatier glide. Frame-rate independent.",
        min: 0.01,
        max: 1,
        step: 0.01,
        defaultValue: 0.1,
    },
    dragEasing: {
        type: ControlType.Number,
        title: "Drag Follow",
        description: "How tightly the track sticks to the cursor while dragging.",
        min: 0.02,
        max: 1,
        step: 0.01,
        defaultValue: 0.24,
    },
    momentum: {
        type: ControlType.Number,
        title: "Momentum",
        description: "Glide after a flick. 0 = stop dead, 0.98 = long coast.",
        min: 0,
        max: 0.98,
        step: 0.01,
        defaultValue: 0.94,
    },
    wheelSpeed: {
        type: ControlType.Number,
        title: "Wheel",
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 0.85,
    },
    dragSpeed: {
        type: ControlType.Number,
        title: "Drag",
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 0.75,
    },
    hoverSpeed: {
        type: ControlType.Number,
        title: "Hover Drift",
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 0.12,
    },
    touchSpeed: {
        type: ControlType.Number,
        title: "Touch",
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 1.2,
    },
    speedBoost: {
        type: ControlType.Boolean,
        title: "Speed Boost",
        description: "Amplify fast flicks up to 4.5×.",
        defaultValue: true,
    },
    autoScroll: {
        type: ControlType.Number,
        title: "Auto Scroll",
        description: "Idle drift per frame. 0 = off (matches original).",
        min: -8,
        max: 8,
        step: 0.1,
        defaultValue: 0,
    },
    floatAmount: {
        type: ControlType.Number,
        title: "Float",
        min: 0,
        max: 40,
        step: 0.5,
        defaultValue: 4.5,
    },
    floatSpeed: {
        type: ControlType.Number,
        title: "Float Speed",
        min: 0,
        max: 0.01,
        step: 0.0001,
        defaultValue: 0.0018,
    },
    lockPageScroll: {
        type: ControlType.Boolean,
        title: "Capture Wheel",
        description: "Stop the page scrolling while the cursor is over it.",
        defaultValue: false,
    },

    /* ---- depth ---- */
    opacityFalloff: {
        type: ControlType.Number,
        title: "Fade Edges",
        min: 0,
        max: 2,
        step: 0.01,
        defaultValue: 0.75,
    },
    scaleFalloff: {
        type: ControlType.Number,
        title: "Shrink Edges",
        min: 0,
        max: 0.6,
        step: 0.01,
        defaultValue: 0.1,
    },
    rotateZAmount: {
        type: ControlType.Number,
        title: "Tilt Z",
        min: -45,
        max: 45,
        step: 0.5,
        defaultValue: 8,
    },
    rotateYAmount: {
        type: ControlType.Number,
        title: "Tilt Y",
        min: -45,
        max: 45,
        step: 0.5,
        defaultValue: 6,
    },
    perspective: {
        type: ControlType.Number,
        title: "Perspective",
        min: 200,
        max: 4000,
        step: 50,
        defaultValue: 1200,
    },

    /* ---- colors ---- */
    showBackground: {
        type: ControlType.Boolean,
        title: "Background",
        defaultValue: true,
    },
    bgInner: {
        type: ControlType.Color,
        title: "BG Center",
        defaultValue: "#0c2b27",
        hidden: (p: Props) => !p.showBackground,
    },
    bgOuter: {
        type: ControlType.Color,
        title: "BG Edge",
        defaultValue: "#041413",
        hidden: (p: Props) => !p.showBackground,
    },
    cardBg: {
        type: ControlType.Color,
        title: "Card BG",
        defaultValue: "#09201e",
    },
    cardBorder: {
        type: ControlType.Color,
        title: "Card Border",
        defaultValue: "rgba(255, 255, 255, 0.08)",
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#2bdca3",
    },
    textMain: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#e3f2ef",
    },
    textMuted: {
        type: ControlType.Color,
        title: "Muted",
        defaultValue: "#5e837f",
    },

    /* ---- glow ---- */
    glowEnabled: {
        type: ControlType.Boolean,
        title: "Cursor Glow",
        defaultValue: true,
    },
    glowRadius: {
        type: ControlType.Number,
        title: "Glow Size",
        min: 20,
        max: 400,
        step: 5,
        defaultValue: 100,
        hidden: (p: Props) => !p.glowEnabled,
    },
    glowThickness: {
        type: ControlType.Number,
        title: "Glow Border",
        min: 0,
        max: 6,
        step: 0.1,
        defaultValue: 1.5,
        hidden: (p: Props) => !p.glowEnabled,
    },
    glowFill: {
        type: ControlType.Number,
        title: "Glow Fill",
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 1,
        hidden: (p: Props) => !p.glowEnabled,
    },
})
