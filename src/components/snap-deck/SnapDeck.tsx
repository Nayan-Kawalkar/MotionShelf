import { addPropertyControls, ControlType, RenderTarget } from "framer"
import type { CSSProperties } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

/**
 * SNAP-TO-CENTER INFINITE DECK
 *
 * A Framer port of the GSAP prototype. The GSAP engine (gsap.set / gsap.to
 * with a power2.out ease) is reimplemented with plain requestAnimationFrame
 * + transforms, so there is no external dependency.
 *
 * Layout is solved analytically rather than by flexbox, which is what lets
 * the horizontal and vertical arrangements be *interpolated* — switching
 * mode animates every card from its row slot to its column slot instead of
 * cutting between two static layouts.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerDisableUnlink
 */

/* ------------------------------------------------------------------ *
 *  Types
 * ------------------------------------------------------------------ */

type CardData = {
    variant: "text" | "icon"
    number: string
    title: string
    titleSize: number
    centerTitle: boolean
    titleColor: string
    footerLeft: string
    footerRight: string
    background: string
    color: string
    borderColor: string
    iconOuter: string
    iconInner: string
    // Framer's Image control hands back a URL string on older versions and a
    // ResponsiveImage object on newer ones.
    image?: string | { src?: string }
    link?: string
}

const imageSrc = (image?: string | { src?: string }) =>
    typeof image === "string" ? image : image?.src || ""

// Radius that carries a centred circle out past the corners.
const revealRadius = (w: number, h: number) =>
    Math.sqrt(w * w + h * h) / 2 + 2

type Props = {
    cards: CardData[]
    cardWidth: number
    cardHeight: number
    verticalCardWidth: number
    gap: number
    startMode: "horizontal" | "vertical"
    loop: "infinite" | "finite"
    showSwitcher: boolean
    verticalLabel: string
    horizontalLabel: string
    background: string
    accent: string
    inactive: string
    scrollSpeed: number
    touchSpeed: number
    snapDuration: number
    morphDuration: number
    morphEase: "inOut" | "out" | "linear"
    thumbDesaturate: number
    thumbDim: number
    focusDuration: number
    textAboveImage: boolean
    showMeta: boolean
    showCardText: boolean
    metaTitleSize: number
    metaColor: string
    metaInset: number
    metaGap: number
    metaOffset: number
    clickAction: "focus" | "open"
    linkTarget: "same" | "new"
    mobileBreakpoint: number
    mobileGap: number
    mobilePadding: number
    interruptSnap: boolean
    force3D: boolean
    scrollTarget: "component" | "window"
    style?: CSSProperties
}

/* ------------------------------------------------------------------ *
 *  Easing / math
 * ------------------------------------------------------------------ */

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const clamp = (min: number, max: number, v: number) =>
    v < min ? min : v > max ? max : v

// GSAP "power2.out" === cubic ease out
const power2Out = (t: number) => 1 - Math.pow(1 - t, 3)

// GSAP "power2.inOut"
const power2InOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/* ------------------------------------------------------------------ *
 *  Colour
 *
 *  Cards away from the anchor read as thumbnails: drained of saturation and
 *  sunk toward the deck background. The card that lands on the anchor blooms
 *  back to its real colours. Interpolating needs numbers, so each colour is
 *  parsed once; anything unparseable (a Framer variable, a gradient, a named
 *  colour) is passed through untouched rather than guessed at.
 * ------------------------------------------------------------------ */

type RGBA = [number, number, number, number]

function parseColor(input?: string): RGBA | null {
    if (!input) return null
    const s = input.trim()

    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .split("")
                .map((c) => c + c)
                .join("")
        if (h.length !== 6 && h.length !== 8) return null
        const n = parseInt(h.slice(0, 6), 16)
        if (!isFinite(n)) return null
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
    }

    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    if (fn) {
        const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
        if (parts.length < 3) return null
        const num = (v: string, max: number) =>
            v.endsWith("%") ? (parseFloat(v) / 100) * max : parseFloat(v)
        const out: RGBA = [
            num(parts[0], 255),
            num(parts[1], 255),
            num(parts[2], 255),
            parts[3] === undefined ? 1 : num(parts[3], 1),
        ]
        return out.every((v) => isFinite(v)) ? out : null
    }

    return null
}

const rgbaStr = (c: RGBA) =>
    `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${+c[3].toFixed(3)})`

const mixRGBA = (a: RGBA, b: RGBA, t: number): RGBA => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
]

function muteColor(c: RGBA, bg: RGBA | null, desat: number, dim: number): RGBA {
    // Rec. 709 luma, so the drained colour keeps its perceived lightness
    // instead of flattening light and dark cards to the same grey.
    const luma = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    let r = lerp(c[0], luma, desat)
    let g = lerp(c[1], luma, desat)
    let b = lerp(c[2], luma, desat)
    if (bg) {
        r = lerp(r, bg[0], dim)
        g = lerp(g, bg[1], dim)
        b = lerp(b, bg[2], dim)
    }
    return [r, g, b, c[3]]
}

type PaletteEntry = { full: RGBA | null; muted: RGBA | null; raw: string }
type Palette = Record<string, PaletteEntry>

// key on the card -> CSS custom property the markup reads
const PALETTE_VARS: [string, string][] = [
    ["bg", "--sd-bg"],
    ["fg", "--sd-fg"],
    ["bd", "--sd-bd"],
    ["title", "--sd-title"],
    ["ringO", "--sd-ring-o"],
    ["ringI", "--sd-ring-i"],
]

const paletteValue = (p: Palette | undefined, key: string, f: number) => {
    const e = p?.[key]
    if (!e) return ""
    if (!e.full || !e.muted) return e.raw
    return rgbaStr(mixRGBA(e.muted, e.full, f))
}

const paletteStyle = (p: Palette | undefined, f: number) => {
    const out: Record<string, string> = {}
    for (const [key, cssVar] of PALETTE_VARS) out[cssVar] = paletteValue(p, key, f)
    return out
}

/* ------------------------------------------------------------------ *
 *  Frame solver
 *
 *  Produces the full visual state of every card for one frame. It mirrors
 *  the original's read-from-the-DOM loop, one-frame lag included: the
 *  original measured each card with getBoundingClientRect(), which reports
 *  the position the *previous* frame gave it, so the lagged shift and scale
 *  are fed back in through `lag`.
 * ------------------------------------------------------------------ */

type Lag = {
    shiftX: number[]
    shiftY: number[]
    scaleY: number[]
    rotX: number[]
}

type Frame = {
    x: number
    y: number
    w: number
    scaleX: number
    scaleY: number
    rotateX: number
    rotateY: number
    opacity: number
    originX: number
    originY: number
}

function solveFrame(
    total: number,
    count: number,
    m: number, // 0 = horizontal, 1 = vertical
    scrollPos: number,
    normalizedVelocity: number,
    W: number,
    H: number,
    cardW: number,
    cardH: number,
    vCardW: number,
    gap: number,
    infinite: boolean,
    lag: Lag,
    commit: boolean
): { frames: Frame[]; layoutDelta: number } {
    const item = lerp(cardW + gap, cardH + gap, m)
    const period = count * item

    // Infinite: the deck is rendered three times over and the scroll is taken
    // modulo one deck, so the seam never comes into view. Finite: a single
    // deck, scrolled straight and bounded by the first and last card.
    const wrapped = infinite
        ? period
            ? -(((scrollPos % period) + period) % period)
            : 0
        : -scrollPos

    const cardWcur = lerp(cardW, vCardW, m)

    // Anchors. Horizontal: 10% in from the left, vertically centred.
    // Vertical: horizontally centred, starting halfway down.
    const padH = W * 0.1
    const topH = (H - cardH) / 2
    const leftV = (W - cardWcur) / 2
    const padV = H * 0.5

    const maxDistH = W * 0.85
    const maxDistV = H * 0.6
    const focusV = H * 0.5

    let shiftX = 0
    let shiftY = 0
    let layoutDelta = 0

    const frames: Frame[] = new Array(total)

    for (let i = 0; i < total; i++) {
        const along = i * item + wrapped

        const baseX = lerp(padH + along, leftV, m)
        const baseY = lerp(topH, padV + along, m)

        // Where this card *appears* right now — the lagged position the
        // original read back off the DOM.
        const measuredX = baseX + (lag.shiftX[i] ?? 0)
        const measuredY = baseY + (lag.shiftY[i] ?? 0)
        // The original fed getBoundingClientRect().height back in, which is
        // the *projected* height — foreshortened by the spring's rotateX.
        const measuredH =
            cardH *
            (lag.scaleY[i] ?? 1) *
            Math.cos(((lag.rotX[i] ?? 0) * Math.PI) / 180)

        const progressH = clamp(
            0,
            1,
            maxDistH ? Math.max(measuredX - padH, 0) / maxDistH : 0
        )
        const progressV = clamp(
            0,
            1,
            maxDistV
                ? Math.abs(measuredY + measuredH / 2 - focusV) / maxDistV
                : 0
        )
        const progress = lerp(progressH, progressV, m)

        const smoothFactor = 0.5 * (1 + Math.cos(progress * Math.PI))

        const baseScale = 0.45 + 0.55 * smoothFactor
        const opacity = 0.25 + 0.75 * smoothFactor

        // Dynamic trapezoid spring. The axis it acts on rotates with the
        // morph, so a card springs sideways in row mode and forwards in
        // column mode, blending through the transition.
        const si = normalizedVelocity * opacity
        const absSi = Math.abs(si)

        frames[i] = {
            x: baseX + shiftX,
            y: baseY + shiftY,
            w: cardWcur,
            scaleX:
                baseScale * (1 + absSi * 0.12 * (1 - m) - absSi * 0.08 * m),
            scaleY:
                baseScale * (1 - absSi * 0.08 * (1 - m) + absSi * 0.12 * m),
            rotateX: si * 24 * m,
            rotateY: si * -24 * (1 - m),
            opacity,
            // left bottom (0% 100%) → center top (50% 0%)
            originX: m * 50,
            originY: 100 - m * 100,
        }

        // Each card pulls the rest of the deck back by the space its own
        // shrinkage freed up, along whichever axis the deck currently runs.
        shiftX -= cardW * (1 - baseScale) * (1 - m)
        shiftY -= cardH * (1 - baseScale) * m

        if (commit) {
            layoutDelta = Math.max(
                layoutDelta,
                Math.abs(baseScale - (lag.scaleY[i] ?? Infinity))
            )
            lag.shiftX[i] = frames[i].x - baseX
            lag.shiftY[i] = frames[i].y - baseY
            lag.scaleY[i] = frames[i].scaleY
            lag.rotX[i] = frames[i].rotateX
        }
    }

    return { frames, layoutDelta }
}

function transformOf(f: Frame, force3D: boolean) {
    const t = force3D
        ? `translate3d(${f.x}px, ${f.y}px, 0px)`
        : `translate(${f.x}px, ${f.y}px)`
    return `${t} rotateX(${f.rotateX}deg) rotateY(${f.rotateY}deg) scaleX(${f.scaleX}) scaleY(${f.scaleY})`
}

/* ------------------------------------------------------------------ *
 *  Card pieces
 *
 *  Shared by both layouts. The desktop deck feeds them CSS custom
 *  properties, which the animation loop rewrites per frame; the mobile list
 *  feeds them literal values and lets CSS transitions do the work.
 * ------------------------------------------------------------------ */

function CardFace({
    card,
    showText,
    titleColor,
    ringOuter,
    ringInner,
    transition,
}: {
    card: CardData
    showText: boolean
    titleColor: string
    ringOuter: string
    ringInner: string
    transition?: string
}) {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                ...(card.variant === "icon"
                    ? { justifyContent: "center", alignItems: "center" }
                    : null),
            }}
        >
            {card.variant === "icon" ? (
                <svg
                    viewBox="0 0 100 100"
                    style={{ width: 60, height: 60, fill: "none", strokeWidth: 2 }}
                >
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        style={{ stroke: ringOuter, transition }}
                        strokeDasharray="6 4"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="25"
                        style={{ stroke: ringInner, transition }}
                    />
                </svg>
            ) : showText ? (
                <>
                    <div
                        style={{
                            fontSize: 13.6,
                            fontWeight: 600,
                            letterSpacing: 1,
                            opacity: 0.7,
                            textAlign: "right",
                        }}
                    >
                        {card.number}
                    </div>
                    <div
                        style={{
                            fontSize: card.titleSize,
                            fontWeight: 800,
                            letterSpacing: -0.5,
                            color: card.titleColor ? titleColor : undefined,
                            ...(card.centerTitle
                                ? { textAlign: "center", margin: "auto" }
                                : null),
                        }}
                    >
                        {card.title}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12.8,
                            opacity: 0.8,
                        }}
                    >
                        <span>{card.footerLeft}</span>
                        <span>{card.footerRight}</span>
                    </div>
                </>
            ) : null}
        </div>
    )
}

function CardPicture({
    src,
    radius,
    transition,
}: {
    src: string
    radius: string
    transition?: string
}) {
    if (!src) return null
    // Clipped, never resized, so the framing is fixed while the circle opens.
    const clip = `circle(${radius} at 50% 50%)`
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url("${src}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                clipPath: clip,
                WebkitClipPath: clip,
                pointerEvents: "none",
                transition,
            }}
        />
    )
}

// A percentage radius in circle() resolves against √(w²+h²)/√2, so the
// radius that just reaches the corners is 100/√2 ≈ 70.7% — 72% clears it
// without needing to know the rendered size.
const REVEAL_PCT = "72%"

/* ------------------------------------------------------------------ *
 *  Component
 * ------------------------------------------------------------------ */

export default function SnapDeck(props: Partial<Props>) {
    const {
        cards = DEFAULTS.cards,
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        verticalCardWidth = DEFAULTS.verticalCardWidth,
        gap = DEFAULTS.gap,
        startMode = DEFAULTS.startMode,
        loop = DEFAULTS.loop,
        showSwitcher = DEFAULTS.showSwitcher,
        verticalLabel = DEFAULTS.verticalLabel,
        horizontalLabel = DEFAULTS.horizontalLabel,
        background = DEFAULTS.background,
        accent = DEFAULTS.accent,
        inactive = DEFAULTS.inactive,
        scrollSpeed = DEFAULTS.scrollSpeed,
        touchSpeed = DEFAULTS.touchSpeed,
        snapDuration = DEFAULTS.snapDuration,
        morphDuration = DEFAULTS.morphDuration,
        morphEase = DEFAULTS.morphEase,
        thumbDesaturate = DEFAULTS.thumbDesaturate,
        thumbDim = DEFAULTS.thumbDim,
        focusDuration = DEFAULTS.focusDuration,
        textAboveImage = DEFAULTS.textAboveImage,
        showMeta = DEFAULTS.showMeta,
        showCardText = DEFAULTS.showCardText,
        metaTitleSize = DEFAULTS.metaTitleSize,
        metaColor = DEFAULTS.metaColor,
        metaInset = DEFAULTS.metaInset,
        metaGap = DEFAULTS.metaGap,
        metaOffset = DEFAULTS.metaOffset,
        clickAction = DEFAULTS.clickAction,
        linkTarget = DEFAULTS.linkTarget,
        mobileBreakpoint = DEFAULTS.mobileBreakpoint,
        mobileGap = DEFAULTS.mobileGap,
        mobilePadding = DEFAULTS.mobilePadding,
        interruptSnap = DEFAULTS.interruptSnap,
        force3D = DEFAULTS.force3D,
        scrollTarget = DEFAULTS.scrollTarget,
        style,
    } = props

    const [isVertical, setIsVertical] = useState(startMode === "vertical")
    const [dims, setDims] = useState({ w: 0, h: 0 })

    const rootRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const metaRef = useRef<HTMLDivElement>(null)
    const metaHRef = useRef<HTMLDivElement>(null)
    const metaVRef = useRef<HTMLDivElement>(null)
    const metaGapRef = useRef<HTMLDivElement>(null)

    // Only the label's *text* needs React; its position and fade stay in the
    // loop. One re-render per landing, not per frame.
    const [metaCard, setMetaCard] = useState(0)

    // Mobile has no anchor to be nearest to, so selection is just a tap.
    const [tapped, setTapped] = useState(0)

    const count = cards.length
    const repeats = loop === "infinite" ? [0, 1, 2] : [0]
    const total = count * repeats.length

    // Below the breakpoint the deck becomes a plain scrollable column: no
    // virtual scroll, no snapping, no per-frame transforms — the browser
    // scrolls it natively and a tap does the selecting.
    const isMobile = dims.w > 0 && dims.w <= mobileBreakpoint

    // Every mutable value the render loop touches lives here so React
    // re-renders never reset the scroll state.
    const engine = useRef({
        scrollPos: 0,
        targetScrollPos: 0,
        currentVelocity: 0,
        lastScrollPos: 0,
        isUserScrolling: false,
        scrollTimeout: null as any,
        snap: null as null | { from: number; to: number; t0: number },
        raf: 0,
        running: false,
        lastTick: 0,
        dirtyShape: true,
        m: startMode === "vertical" ? 1 : 0,
        morph: null as null | {
            from: number
            to: number
            t0: number
            fromScroll: number
            index: number
            // Solved once at morph start and interpolated, so the bisection
            // never runs inside the animation loop.
            pinFrom: number
            pinTo: number
            boundsFrom: { min: number; max: number } | null
            boundsTo: { min: number; max: number } | null
        },
        startMorph: null as null | ((toVertical: boolean) => void),
        wake: null as null | (() => void),
        // Which rendered element currently holds the anchor, -1 for none,
        // plus the snap-grid index it came from (used only to notice that
        // the deck is now heading at a different card).
        focusIndex: -1,
        focusGrid: 0,
        focusVal: [] as number[],
        focusTween: [] as (null | { from: number; to: number; t0: number })[],
        dirtyPalette: true,
        // The label lives outside the cards, so it needs the anchor card's
        // box and its own fade — it has to survive the focused card being
        // cleared, or the text would vanish before it finished fading.
        metaVal: 0,
        metaTween: null as null | { from: number; to: number; t0: number },
        metaBox: { x: 0, y: 0, w: 0 },
        onMeta: null as null | ((cardIndex: number) => void),
        goToCard: null as null | ((cardIndex: number) => void),
        lastInputAt: -1e9,
        // What the loop last painted, so a React re-render repaints exactly
        // that instead of a freshly-solved (unconverged) guess.
        lastFrames: null as Frame[] | null,
        lag: { shiftX: [], shiftY: [], scaleY: [], rotX: [] } as Lag,
    }).current

    // Layout constants the loop reads without having to re-subscribe.
    const conf = useRef({
        cardW: cardWidth,
        cardH: cardHeight,
        vCardW: verticalCardWidth,
        gap,
        snapDuration,
        morphDuration,
        morphEase,
        focusDuration,
        metaOffset,
        palettes: [] as Palette[],
        interruptSnap,
        force3D,
        infinite: loop === "infinite",
        count,
        total,
    }).current
    conf.cardW = cardWidth
    conf.cardH = cardHeight
    conf.vCardW = verticalCardWidth
    conf.gap = gap
    conf.snapDuration = snapDuration
    conf.morphDuration = morphDuration
    conf.morphEase = morphEase
    conf.focusDuration = focusDuration
    conf.metaOffset = metaOffset
    conf.interruptSnap = interruptSnap
    conf.force3D = force3D
    conf.infinite = loop === "infinite"
    conf.count = count
    conf.total = total

    /* ---------------- palettes ---------------- */

    const palettes = useMemo<Palette[]>(() => {
        const deck = parseColor(background)
        return cards.map((card) => {
            const pal: Palette = {}
            const add = (key: string, raw: string) => {
                const full = parseColor(raw)
                pal[key] = {
                    full,
                    muted: full
                        ? muteColor(full, deck, thumbDesaturate, thumbDim)
                        : null,
                    raw: raw ?? "",
                }
            }
            add("bg", card.background)
            add("fg", card.color)
            add("bd", card.borderColor || card.background)
            add("title", card.titleColor || card.color)
            add("ringO", card.iconOuter)
            add("ringI", card.iconInner)
            return pal
        })
    }, [cards, background, thumbDesaturate, thumbDim])

    conf.palettes = palettes

    // A colour edit in Framer has to repaint cards the loop is not currently
    // animating, so wake it for one pass.
    useEffect(() => {
        engine.dirtyPalette = true
        engine.wake?.()
    }, [palettes])

    /* ---------------- measure ---------------- */

    useEffect(() => {
        // Measured on the root, not the stage: the stage only exists in the
        // desktop layout, and the breakpoint has to be readable from both.
        const stage = rootRef.current
        if (!stage) return
        const measure = () =>
            setDims((d) => {
                const w = stage.clientWidth
                const h = stage.clientHeight
                return d.w === w && d.h === h ? d : { w, h }
            })
        measure()
        if (typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(measure)
        ro.observe(stage)
        return () => ro.disconnect()
    }, [])

    /* ---------------- engine ---------------- */

    useEffect(() => {
        const stage = stageRef.current
        const track = trackRef.current
        if (!stage || !track) return

        const isCanvas = RenderTarget.current() === RenderTarget.canvas

        const itemFor = (m: number) =>
            lerp(conf.cardW + conf.gap, conf.cardH + conf.gap, m)

        const startSnap = (to: number) => {
            const now = performance.now()
            engine.snap = {
                from: engine.targetScrollPos,
                to,
                // GSAP schedules a tween against the ticker's last tick, so
                // its first frame already carries ~one frame of progress.
                t0: now - Math.min(now - engine.lastTick, 34),
            }
        }

        /* --- finite bounds ---------------------------------------------
         *
         * The scroll value that brings card `i` to the focus anchor cannot
         * be written down as i * item: each card ahead of the anchor shrinks
         * and drags the whole deck back by the space it frees. In horizontal
         * mode that never bites, because distance is measured forward only
         * and everything behind the anchor stays full size. In vertical mode
         * distance is measured from a centre, so cards on *both* sides shrink
         * and the deck bunches upward — scrolling to (count-1) * item throws
         * the last card clean off the top.
         *
         * So solve for it instead. A card's offset from the anchor is strictly
         * decreasing in scroll — winding forward can only move it further
         * back, and shrinks the cards ahead of it, which moves it back faster
         * still. That rules out a Newton step (it overshoots by exactly the
         * amount the shrinkage adds) but makes bisection reliable. Results
         * are cached per layout.
         */
        const offsetOfCard = (
            i: number,
            s: number,
            m: number,
            W: number,
            H: number
        ) => {
            // Let the lag feedback settle before reading a position. Five
            // passes is not enough — an unconverged reading is not even
            // monotonic in scroll, which hands bisection a spurious root.
            const lag: Lag = { shiftX: [], shiftY: [], scaleY: [], rotX: [] }
            let frames: Frame[] = []
            for (let c = 0; c < 24; c++) {
                frames = solveFrame(
                    conf.count, conf.count, m, s, 0, W, H,
                    conf.cardW, conf.cardH, conf.vCardW, conf.gap,
                    false, lag, true
                ).frames
            }
            const f = frames[i]
            if (!f) return 0
            return lerp(
                f.x - W * 0.1,
                f.y + (conf.cardH * f.scaleY) / 2 - H * 0.5,
                m
            )
        }

        const scrollForCard = (i: number, m: number, W: number, H: number) => {
            let lo = -(H + conf.cardH)
            let hi = (conf.count - 1) * itemFor(m) + conf.cardH + H
            for (let k = 0; k < 30; k++) {
                const mid = (lo + hi) / 2
                if (offsetOfCard(i, mid, m, W, H) > 0) lo = mid
                else hi = mid
            }
            return (lo + hi) / 2
        }

        // Bisection is only cheap because it is cached. Outside a morph `m`
        // is always 0 or 1, so this holds a couple of entries.
        const solveCache = new Map<string, number>()

        const layoutKey = (m: number, W: number, H: number) =>
            `${m}|${W}|${H}|${conf.cardW}|${conf.cardH}|${conf.vCardW}|${conf.gap}|${conf.count}`

        const scrollForCardCached = (
            i: number,
            m: number,
            W: number,
            H: number
        ) => {
            const key = `${i}|${layoutKey(m, W, H)}`
            let v = solveCache.get(key)
            if (v === undefined) {
                if (solveCache.size > 64) solveCache.clear()
                v = scrollForCard(i, m, W, H)
                solveCache.set(key, v)
            }
            return v
        }

        const boundsFor = (m: number, W: number, H: number) => {
            if (conf.infinite || conf.count < 1) return null
            const min = scrollForCardCached(0, m, W, H)
            return {
                min,
                max: Math.max(min, scrollForCardCached(conf.count - 1, m, W, H)),
            }
        }

        const clampScroll = (v: number, m: number) => {
            const bounds = boundsFor(m, stage.clientWidth, stage.clientHeight)
            return bounds ? clamp(bounds.min, bounds.max, v) : v
        }

        // Where a snap should land card `index`. Infinite mode keeps the
        // original's plain index * item grid. Finite mode solves for the
        // anchor instead — identical in horizontal (the solved value *is*
        // index * item there, since nothing behind the anchor shrinks), but
        // in vertical it is what makes both ends of the deck reachable.
        const snapTargetFor = (index: number, m: number) =>
            conf.count < 1
                ? 0
                : conf.infinite
                ? index * itemFor(m)
                : scrollForCardCached(
                      clamp(0, conf.count - 1, index),
                      m,
                      stage.clientWidth,
                      stage.clientHeight
                  )

        // Which card is nearest the anchor for a given scroll. Infinite mode
        // can divide, because there the grid *is* uniform. Finite vertical
        // cannot: scrollForCard(3) and 3 * item are hundreds of pixels apart,
        // so dividing picks the wrong card near the end of the deck.
        const nearestIndex = (scroll: number, m: number) => {
            const item = itemFor(m)
            if (conf.infinite) return item ? Math.round(scroll / item) : 0
            let best = 0
            let bestDist = Infinity
            for (let i = 0; i < conf.count; i++) {
                const dist = Math.abs(snapTargetFor(i, m) - scroll)
                if (dist < bestDist) {
                    bestDist = dist
                    best = i
                }
            }
            return best
        }

        /* --- focus bloom -----------------------------------------------
         *
         * Which card is *at* the anchor is a geometric question, not an
         * arithmetic one. Horizontally the snap grid answers it — scroll
         * k * item puts element (k mod count) exactly on the anchor. In
         * vertical mode it does not: the grid is uniform but the deck is
         * compressed by the shrinkage of every card above, so by the third
         * card the grid index and the card sitting on the anchor have come
         * apart, and the wrong card lights up. So solve the frame the snap
         * is heading for and take the element nearest the anchor.
         */
        const focusElementFor = (scroll: number, m: number) => {
            if (conf.count < 1) return -1
            const W = stage.clientWidth
            const H = stage.clientHeight

            const lag: Lag = { shiftX: [], shiftY: [], scaleY: [], rotX: [] }
            let frames: Frame[] = []
            for (let c = 0; c < 24; c++) {
                frames = solveFrame(
                    conf.total, conf.count, m, scroll, 0, W, H,
                    conf.cardW, conf.cardH, conf.vCardW, conf.gap,
                    conf.infinite, lag, true
                ).frames
            }

            let best = -1
            let bestOff = Infinity
            for (let i = 0; i < frames.length; i++) {
                const f = frames[i]
                if (!f) continue
                const off = Math.abs(
                    lerp(
                        f.x - W * 0.1,
                        f.y + (conf.cardH * f.scaleY) / 2 - H * 0.5,
                        m
                    )
                )
                if (off < bestOff) {
                    bestOff = off
                    best = i
                }
            }
            return best
        }

        const setFocus = (element: number) => {
            if (engine.focusIndex === element) return
            const now = performance.now()
            const tween = (i: number, to: number) => {
                if (i < 0) return
                const from = engine.focusVal[i] ?? 0
                if (from === to) {
                    engine.focusTween[i] = null
                    return
                }
                engine.focusTween[i] = { from, to, t0: now }
            }
            tween(engine.focusIndex, 0)
            tween(element, 1)
            engine.focusIndex = element

            // The label fades out on its way to no-focus but keeps its text,
            // so it reads as one card handing over to the next.
            const metaTo = element >= 0 ? 1 : 0
            if (element >= 0) engine.onMeta?.(element)
            if (engine.metaVal !== metaTo)
                engine.metaTween = { from: engine.metaVal, to: metaTo, t0: now }

            ensureRunning()
        }

        const applyPalette = (el: HTMLElement, cardIndex: number, f: number) => {
            const pal = conf.palettes[cardIndex]
            for (const [key, cssVar] of PALETTE_VARS) {
                el.style.setProperty(cssVar, paletteValue(pal, key, f))
            }
        }

        const snapToIndex = (index: number) => {
            const landing = clampScroll(snapTargetFor(index, engine.m), engine.m)
            startSnap(landing)
            engine.focusGrid = index
            setFocus(focusElementFor(landing, engine.m))
            ensureRunning()
        }

        const snapToClosestCard = () => {
            if (!itemFor(engine.m)) return
            snapToIndex(nearestIndex(engine.targetScrollPos, engine.m))
        }

        // Clicking a thumbnail asks the inverse of focusElementFor: not
        // "which card lands here" but "which scroll lands this card". There
        // is no closed form once the vertical grid stops matching the card
        // positions, so try the grid indices around the current one and take
        // the nearest that focuses the card asked for.
        engine.goToCard = (cardIndex: number) => {
            if (conf.count < 1) return
            const item = itemFor(engine.m)
            const cur = item ? Math.round(engine.targetScrollPos / item) : 0
            const span = conf.count + 1

            let best: number | null = null
            let bestDist = Infinity
            for (let k = cur - span; k <= cur + span; k++) {
                if (!conf.infinite && (k < 0 || k > conf.count - 1)) continue
                const landing = clampScroll(snapTargetFor(k, engine.m), engine.m)
                const el = focusElementFor(landing, engine.m)
                if (el < 0 || el % conf.count !== cardIndex) continue
                const d = Math.abs(k - cur)
                if (d < bestDist) {
                    bestDist = d
                    best = k
                }
            }
            if (best !== null) snapToIndex(best)
        }

        const handleScrollInput = (delta: number) => {
            if (engine.morph) return // the deck is reflowing; ignore input
            engine.lastInputAt = performance.now()
            if (conf.interruptSnap) engine.snap = null
            engine.targetScrollPos = clampScroll(
                engine.targetScrollPos + delta,
                engine.m
            )
            // Drop the bloom as soon as the deck is heading somewhere else,
            // so cards travel muted and only the one that lands lights up.
            // Compared on the grid index: cheap, and it changes exactly when
            // the landing card would.
            if (nearestIndex(engine.targetScrollPos, engine.m) !== engine.focusGrid) {
                setFocus(-1)
            }
            engine.isUserScrolling = true
            ensureRunning()

            clearTimeout(engine.scrollTimeout)
            engine.scrollTimeout = setTimeout(() => {
                engine.isUserScrolling = false
                snapToClosestCard()
            }, 120)
        }

        const render = () => {
            const now = performance.now()

            /* --- morph between the two layouts --- */
            if (engine.morph) {
                const mo = engine.morph
                const p = clamp(
                    0,
                    1,
                    conf.morphDuration > 0
                        ? (now - mo.t0) / (conf.morphDuration * 1000)
                        : 1
                )
                const eased =
                    conf.morphEase === "linear"
                        ? p
                        : conf.morphEase === "out"
                          ? power2Out(p)
                          : power2InOut(p)

                engine.m = lerp(mo.from, mo.to, eased)

                // Keep the focused card pinned to the anchor throughout, so
                // the deck reflows *around* it rather than sliding past it.
                const pinned = lerp(mo.pinFrom, mo.pinTo, eased)
                engine.targetScrollPos = lerp(mo.fromScroll, pinned, eased)

                if (mo.boundsFrom && mo.boundsTo) {
                    engine.targetScrollPos = clamp(
                        lerp(mo.boundsFrom.min, mo.boundsTo.min, eased),
                        lerp(mo.boundsFrom.max, mo.boundsTo.max, eased),
                        engine.targetScrollPos
                    )
                }
                engine.scrollPos = engine.targetScrollPos

                if (p >= 1) {
                    engine.m = mo.to
                    engine.targetScrollPos = clampScroll(mo.pinTo, mo.to)
                    engine.scrollPos = engine.targetScrollPos
                    engine.morph = null
                    engine.focusGrid = mo.index
                    setFocus(focusElementFor(engine.targetScrollPos, mo.to))
                }
            } else if (engine.snap) {
                /* --- snap tween --- */
                const p = clamp(
                    0,
                    1,
                    (now - engine.snap.t0) / (conf.snapDuration * 1000)
                )
                engine.targetScrollPos = lerp(
                    engine.snap.from,
                    engine.snap.to,
                    power2Out(p)
                )
                if (p >= 1) engine.snap = null
            }

            // Guards against a stale position when the loop mode, card count
            // or component size changes underneath us. During a morph the
            // bounds are interpolated above instead.
            if (!engine.morph) {
                engine.targetScrollPos = clampScroll(
                    engine.targetScrollPos,
                    engine.m
                )
            }

            if (!engine.morph) {
                engine.scrollPos = lerp(
                    engine.scrollPos,
                    engine.targetScrollPos,
                    engine.isUserScrolling ? 0.08 : 0.12
                )
            }

            engine.currentVelocity = engine.scrollPos - engine.lastScrollPos
            engine.lastScrollPos = engine.scrollPos

            const { frames, layoutDelta } = solveFrame(
                conf.total,
                conf.count,
                engine.m,
                engine.scrollPos,
                clamp(-80, 80, engine.currentVelocity) / 80,
                stage.clientWidth,
                stage.clientHeight,
                conf.cardW,
                conf.cardH,
                conf.vCardW,
                conf.gap,
                conf.infinite,
                engine.lag,
                true
            )

            const items = track.children

            // Focus bloom: a one-shot per card, so only the handful mid-tween
            // touch the DOM on any given frame.
            let focusActive = false
            const focusMs = Math.max(1, conf.focusDuration * 1000)
            for (let i = 0; i < items.length; i++) {
                const tw = engine.focusTween[i]
                if (!tw && !engine.dirtyPalette) continue
                let f = engine.focusVal[i] ?? 0
                if (tw) {
                    const p = clamp(0, 1, (now - tw.t0) / focusMs)
                    f = lerp(tw.from, tw.to, power2Out(p))
                    engine.focusVal[i] = f
                    if (p >= 1) engine.focusTween[i] = null
                    else focusActive = true
                }
                const el = items[i] as HTMLElement
                applyPalette(el, conf.count ? i % conf.count : 0, f)
                // The cover peels back as a circle growing from the middle,
                // so the radius has to reach the corners, not the edges.
                const fr = frames[i]
                el.style.setProperty(
                    "--sd-reveal",
                    `${(f * revealRadius(fr ? fr.w : conf.cardW, conf.cardH)).toFixed(2)}px`
                )
            }
            engine.dirtyPalette = false

            /* --- label ---------------------------------------------------- */
            if (engine.focusIndex >= 0 && frames[engine.focusIndex]) {
                const bf = frames[engine.focusIndex]
                engine.metaBox = { x: bf.x, y: bf.y, w: bf.w }
            }

            if (engine.metaTween) {
                const tp = clamp(0, 1, (now - engine.metaTween.t0) / focusMs)
                engine.metaVal = lerp(
                    engine.metaTween.from,
                    engine.metaTween.to,
                    power2Out(tp)
                )
                if (tp >= 1) engine.metaTween = null
                else focusActive = true
            }

            const meta = metaRef.current
            if (meta) {
                const vert = engine.m > 0.5
                const box = engine.metaBox
                meta.style.opacity = String(engine.metaVal)
                meta.style.transform = `translateY(${((1 - engine.metaVal) * 12).toFixed(2)}px)`

                const mh = metaHRef.current
                if (mh) {
                    mh.style.display = vert ? "none" : "block"
                    if (!vert) {
                        mh.style.transform = `translate(${box.x}px, ${box.y}px)`
                        mh.style.width = `${box.w}px`
                        mh.style.height = `${conf.cardH}px`
                    }
                }
                const mv = metaVRef.current
                if (mv) {
                    mv.style.display = vert ? "flex" : "none"
                    if (vert) {
                        mv.style.transform = `translateY(${box.y + conf.cardH / 2}px) translateY(-50%)`
                        const gapEl = metaGapRef.current
                        if (gapEl)
                            gapEl.style.width = `${box.w + conf.metaOffset * 2}px`
                    }
                }
            }

            const reshaping = !!engine.morph || engine.dirtyShape
            for (let i = 0; i < items.length; i++) {
                const el = items[i] as HTMLElement
                const f = frames[i]
                if (!f) continue
                el.style.opacity = String(f.opacity)
                el.style.transform = transformOf(f, conf.force3D)
                // Width and origin only move while the deck is morphing.
                if (reshaping) {
                    el.style.width = `${f.w}px`
                    el.style.transformOrigin = `${f.originX}% ${f.originY}%`
                }
            }
            engine.dirtyShape = false
            engine.lastFrames = frames

            const settled =
                !engine.morph &&
                !engine.snap &&
                !engine.isUserScrolling &&
                Math.abs(engine.targetScrollPos - engine.scrollPos) < 0.01 &&
                Math.abs(engine.currentVelocity) < 0.01 &&
                !focusActive &&
                layoutDelta < 0.00005

            if (settled) {
                engine.scrollPos = engine.targetScrollPos
                engine.lastScrollPos = engine.targetScrollPos
                engine.running = false
                engine.lastTick = now

                // GSAP's force3D:"auto" drops back to a 2D matrix once a
                // tween ends so the browser re-rasterises the layer. Without
                // this, downscaled cards keep the blurry raster they were
                // given mid-motion and small type never sharpens up.
                if (conf.force3D) {
                    for (let i = 0; i < items.length; i++) {
                        const el = items[i] as HTMLElement
                        el.style.transform = el.style.transform.replace(
                            /translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)/,
                            "translate($1, $2)"
                        )
                    }
                }
                return
            }

            engine.lastTick = now
            engine.raf = requestAnimationFrame(render)
        }

        function ensureRunning() {
            if (engine.running) return
            engine.running = true
            engine.raf = requestAnimationFrame(render)
        }

        /* ---------------- mode morph ---------------- */

        engine.startMorph = (toVertical: boolean) => {
            const from = engine.morph ? engine.m : engine.m
            const to = toVertical ? 1 : 0

            const item = itemFor(from)
            const period = conf.count * item

            // Fold the scroll position back into the first repetition. This
            // is visually free (position is modulo one deck) but keeps the
            // pinned index small, so the reflow is a short move rather than
            // a long slide through the loop.
            let scroll = engine.scrollPos
            if (conf.infinite && period)
                scroll -= Math.floor(scroll / period) * period

            engine.snap = null
            engine.isUserScrolling = false
            clearTimeout(engine.scrollTimeout)
            setFocus(-1) // the deck reflows muted, then the landing card blooms

            const index = nearestIndex(scroll, from)
            const W = stage.clientWidth
            const H = stage.clientHeight

            engine.morph = {
                from,
                to,
                t0: performance.now(),
                fromScroll: scroll,
                index,
                pinFrom: snapTargetFor(index, from),
                pinTo: snapTargetFor(index, to),
                boundsFrom: boundsFor(from, W, H),
                boundsTo: boundsFor(to, W, H),
            }
            engine.dirtyShape = true
            ensureRunning()
        }

        /* ---------------- input ---------------- */

        // Listen on the component root, not the stage: the mode switcher is
        // a sibling of the stage, so a stage-level listener would miss the
        // wheel whenever the pointer sat over the buttons.
        const target: any =
            scrollTarget === "window" && typeof window !== "undefined"
                ? window
                : (rootRef.current ?? stage)

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            handleScrollInput(e.deltaY * scrollSpeed)
        }

        let touchStartY = 0
        const onTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY
        }
        const onTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY
            const deltaY = (touchStartY - touchY) * touchSpeed
            touchStartY = touchY
            handleScrollInput(deltaY)
        }

        if (!isCanvas) {
            target.addEventListener("wheel", onWheel, { passive: false })
            target.addEventListener("touchstart", onTouchStart, {
                passive: true,
            })
            target.addEventListener("touchmove", onTouchMove, { passive: true })
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => {
                      engine.dirtyShape = true
                      ensureRunning()
                  })
                : null
        ro?.observe(stage)

        engine.wake = ensureRunning
        engine.onMeta = (cardIndex: number) =>
            setMetaCard(conf.count ? cardIndex % conf.count : 0)

        // Land inside the finite bounds on mount rather than sliding into
        // them over the first half-second.
        engine.targetScrollPos = clampScroll(engine.targetScrollPos, engine.m)
        engine.scrollPos = engine.targetScrollPos
        engine.lastScrollPos = engine.targetScrollPos

        // Cards paint muted; bloom whichever one starts on the anchor.
        engine.focusIndex = -1
        engine.focusGrid = nearestIndex(engine.targetScrollPos, engine.m)
        setFocus(focusElementFor(engine.targetScrollPos, engine.m))

        engine.dirtyShape = true
        engine.running = false
        ensureRunning()

        return () => {
            cancelAnimationFrame(engine.raf)
            engine.running = false
            engine.startMorph = null
            engine.wake = null
            engine.onMeta = null
            engine.goToCard = null
            clearTimeout(engine.scrollTimeout)
            if (!isCanvas) {
                target.removeEventListener("wheel", onWheel)
                target.removeEventListener("touchstart", onTouchStart)
                target.removeEventListener("touchmove", onTouchMove)
            }
            ro?.disconnect()
        }
        // Everything else is read off `conf`, so the loop only needs tearing
        // down when the listeners themselves change.
    }, [scrollTarget, scrollSpeed, touchSpeed, count, isMobile])

    /* ---------------- mode switching ---------------- */

    const switchTo = (vertical: boolean) => {
        if (vertical === isVertical) return
        setIsVertical(vertical)
        engine.startMorph?.(vertical)
    }

    /* ---------------- first paint ---------------- */

    // A re-render (the label changing text) must not repaint the cards from
    // a freshly-solved frame: the lag feedback would not have converged and
    // every card would jump. Repaint what the loop last wrote instead.
    const painted =
        engine.lastFrames && engine.lastFrames.length === total
            ? engine.lastFrames
            : null

    // Solve one frame up front so the very first paint is already laid out
    // rather than flashing a stack of cards at the origin.
    const initial =
        painted === null && dims.w > 0
            ? solveFrame(
                  total,
                  count,
                  engine.m,
                  engine.scrollPos,
                  0,
                  dims.w,
                  dims.h,
                  cardWidth,
                  cardHeight,
                  verticalCardWidth,
                  gap,
                  loop === "infinite",
                  { shiftX: [], shiftY: [], scaleY: [], rotX: [] },
                  false
              ).frames
            : null

    /* ---------------- styles ---------------- */

    const btnStyle = (active: boolean): CSSProperties => ({
        background: "none",
        border: "none",
        color: active ? accent : inactive,
        cursor: "pointer",
        paddingBottom: 6,
        position: "relative",
        fontFamily: "inherit",
        fontSize: "inherit",
        letterSpacing: "inherit",
        transition: "color 0.3s ease",
    })

    const label = cards[Math.min(metaCard, Math.max(0, count - 1))]

    const metaTitle: CSSProperties = {
        fontSize: metaTitleSize,
        fontWeight: 500,
        letterSpacing: -0.5,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
    }

    const metaSmall: CSSProperties = {
        fontFamily: "monospace",
        fontSize: 13.6,
        letterSpacing: 1,
        opacity: 0.55,
        whiteSpace: "nowrap",
    }

    const metaRowStyle = (
        side: "above" | "below",
        offset: number
    ): CSSProperties => ({
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: side === "above" ? "flex-end" : "flex-start",
        ...(side === "above"
            ? { bottom: "100%", paddingBottom: offset }
            : { top: "100%", paddingTop: offset }),
    })

    const linkTargetAttr = linkTarget === "new" ? "_blank" : undefined
    const linkRel = linkTarget === "new" ? "noopener noreferrer" : undefined

    // A tap that ends a swipe must not count as a click on whatever card
    // happens to be under the finger when the momentum stops.
    const scrolledJustNow = () => performance.now() - engine.lastInputAt < 250

    // The label always shows the focused card, so its title is a direct
    // link — no focus step to walk through first.
    const MetaTitle = () => {
        const href = label?.link || ""
        if (!href) return <span style={{ ...metaTitle, ...metaClip }}>{label?.title}</span>
        return (
            <a
                href={href}
                target={linkTargetAttr}
                rel={linkRel}
                onClick={(e) => {
                    if (scrolledJustNow()) e.preventDefault()
                }}
                style={{
                    ...metaTitle,
                    ...metaClip,
                    color: "inherit",
                    textDecoration: "none",
                    pointerEvents: "auto",
                    cursor: "pointer",
                }}
            >
                {label?.title}
            </a>
        )
    }

    const metaClip: CSSProperties = {
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
    }

    const metaGroup = (gap: number): CSSProperties => ({
        display: "flex",
        alignItems: "baseline",
        gap,
    })

    if (isMobile) {
        const rowStyle: CSSProperties = {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
        }
        const colourMs = `${focusDuration}s`

        return (
            <div
                ref={rootRef}
                style={{
                    ...style,
                    position: style?.position ?? "relative",
                    overflowY: "auto",
                    overflowX: "hidden",
                    // Must not be "none" here or native scrolling dies.
                    touchAction: "pan-y",
                    WebkitOverflowScrolling: "touch",
                    backgroundColor: background,
                    color: metaColor,
                    fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: mobileGap,
                        padding: mobilePadding,
                        boxSizing: "border-box",
                    }}
                >
                    {cards.map((card, i) => {
                        const on = tapped === i ? 1 : 0
                        const pal = palettes[i]
                        const href = card.link || ""
                        const Tag: any = href ? "a" : "div"

                        return (
                            <Tag
                                key={i}
                                href={href || undefined}
                                target={href ? linkTargetAttr : undefined}
                                rel={href ? linkRel : undefined}
                                onClick={(e: any) => {
                                    if (clickAction === "focus" && tapped !== i) {
                                        e.preventDefault()
                                        setTapped(i)
                                        return
                                    }
                                    if (!href) e.preventDefault()
                                }}
                                style={{
                                    display: "block",
                                    textDecoration: "none",
                                    color: "inherit",
                                    cursor: href ? "pointer" : undefined,
                                    WebkitTapHighlightColor: "transparent",
                                }}
                            >
                                <div style={{ ...rowStyle, marginBottom: metaOffset }}>
                                    <span
                                        style={{
                                            ...metaTitle,
                                            ...metaClip,
                                            fontSize: Math.min(metaTitleSize, 28),
                                        }}
                                    >
                                        {card.title}
                                    </span>
                                    <span style={metaSmall}>{card.number}</span>
                                </div>

                                <div
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        aspectRatio: `${cardWidth} / ${cardHeight}`,
                                        boxSizing: "border-box",
                                        backgroundColor: paletteValue(pal, "bg", on),
                                        color: paletteValue(pal, "fg", on),
                                        border: card.borderColor
                                            ? `1px solid ${paletteValue(pal, "bd", on)}`
                                            : undefined,
                                        transition: `background-color ${colourMs} ease, color ${colourMs} ease, border-color ${colourMs} ease`,
                                        overflow: "hidden",
                                    }}
                                >
                                    <CardFace
                                        card={card}
                                        showText={showCardText}
                                        titleColor={paletteValue(pal, "title", on)}
                                        ringOuter={paletteValue(pal, "ringO", on)}
                                        ringInner={paletteValue(pal, "ringI", on)}
                                        transition={`stroke ${colourMs} ease`}
                                    />
                                    {/* A percentage radius means the reveal
                                        needs no measurement — it scales with
                                        whatever width the phone gives it. */}
                                    <CardPicture
                                        src={imageSrc(card.image)}
                                        radius={on ? REVEAL_PCT : "0%"}
                                        transition={`clip-path ${colourMs} cubic-bezier(0.22, 1, 0.36, 1)`}
                                    />
                                </div>

                                <div style={{ ...rowStyle, marginTop: metaOffset }}>
                                    <span style={metaSmall}>{card.footerLeft}</span>
                                    <span style={metaSmall}>{card.footerRight}</span>
                                </div>
                            </Tag>
                        )
                    })}
                </div>
            </div>
        )
    }

    const underline: CSSProperties = {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 2,
        backgroundColor: accent,
    }

    return (
        <div
            ref={rootRef}
            style={{
                ...style,
                position: style?.position ?? "relative",
                overflow: "hidden",
                touchAction: "none",
                backgroundColor: background,
                color: "#ffffff",
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
            }}
        >
            <div
                ref={stageRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    perspective: 1000,
                    touchAction: "none",
                }}
            >
                {/* preserve-3d so the stage's perspective reaches the cards
                    — without it rotateX/rotateY render flat. */}
                <div
                    ref={trackRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        transformStyle: "preserve-3d",
                    }}
                >
                    {repeats.map((r) =>
                        cards.map((card, i) => {
                            const idx = r * count + i
                            const f = painted?.[idx] ?? initial?.[idx]
                            const fv = engine.focusVal[idx] ?? 0
                            const src = imageSrc(card.image)
                            const w = f ? f.w : cardWidth

                            const cover = (
                                <CardFace
                                    card={card}
                                    showText={showCardText}
                                    titleColor="var(--sd-title)"
                                    ringOuter="var(--sd-ring-o)"
                                    ringInner="var(--sd-ring-i)"
                                />
                            )

                            const picture = (
                                <CardPicture
                                    src={src}
                                    radius="var(--sd-reveal, 0px)"
                                />
                            )

                            const href = card.link || ""
                            const Tag: any = href ? "a" : "div"
                            const clickable = !!href || clickAction === "focus"

                            return (
                                <Tag
                                    key={`${r}-${i}`}
                                    href={href || undefined}
                                    target={href ? linkTargetAttr : undefined}
                                    rel={href ? linkRel : undefined}
                                    onClick={(e: any) => {
                                        if (scrolledJustNow()) {
                                            e.preventDefault()
                                            return
                                        }
                                        const focusedCard =
                                            engine.focusIndex >= 0 && count
                                                ? engine.focusIndex % count
                                                : -1
                                        // First click brings a thumbnail to
                                        // the anchor; only the card already
                                        // there opens its link.
                                        if (
                                            clickAction === "focus" &&
                                            focusedCard !== i
                                        ) {
                                            e.preventDefault()
                                            engine.goToCard?.(i)
                                            return
                                        }
                                        if (!href) e.preventDefault()
                                    }}
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        width: w,
                                        display: "block",
                                        textDecoration: "none",
                                        cursor: clickable
                                            ? "pointer"
                                            : undefined,
                                        height: cardHeight,
                                        borderRadius: 0,
                                        boxSizing: "border-box",
                                        willChange: "transform, opacity",
                                        userSelect: "none",
                                        WebkitUserSelect: "none",
                                        transformStyle: "preserve-3d",
                                        backfaceVisibility: "hidden",
                                        transformOrigin: f
                                            ? `${f.originX}% ${f.originY}%`
                                            : "left bottom",
                                        transform: f
                                            ? transformOf(f, force3D)
                                            : undefined,
                                        opacity: f ? f.opacity : 0,
                                        // Colours come in through custom
                                        // properties so the focus bloom is a
                                        // handful of setProperty calls on the
                                        // card, never a walk of its children.
                                        ...paletteStyle(palettes[i], fv),
                                        ["--sd-reveal" as any]: `${
                                            fv * revealRadius(w, cardHeight)
                                        }px`,
                                        background: "var(--sd-bg)",
                                        color: "var(--sd-fg)",
                                        border: card.borderColor
                                            ? "1px solid var(--sd-bd)"
                                            : undefined,
                                    }}
                                >
                                    {textAboveImage ? (
                                        <>
                                            {picture}
                                            {cover}
                                        </>
                                    ) : (
                                        <>
                                            {cover}
                                            {picture}
                                        </>
                                    )}
                                </Tag>
                            )
                        })
                    )}
                </div>
            </div>

            {showMeta && count > 0 && (
                <div
                    ref={metaRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        zIndex: 50,
                        opacity: 0,
                        color: metaColor,
                    }}
                >
                    {/* Horizontal: the label straddles the card box, one row
                        riding above it and one below, both spanning its
                        width. Positioned by the loop from the live frame. */}
                    <div
                        ref={metaHRef}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: 0,
                            height: 0,
                        }}
                    >
                        <div style={metaRowStyle("above", metaOffset)}>
                            <MetaTitle />
                            <span style={metaSmall}>{label?.number}</span>
                        </div>
                        <div style={metaRowStyle("below", metaOffset)}>
                            <span style={metaSmall}>{label?.footerLeft}</span>
                            <span style={metaSmall}>{label?.footerRight}</span>
                        </div>
                    </div>

                    {/* Vertical: one full-width row on the card's centre
                        line, the card floating in the gap between the two
                        groups. */}
                    <div
                        ref={metaVRef}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            display: "none",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: `0 ${metaInset}px`,
                            boxSizing: "border-box",
                        }}
                    >
                        <div
                            style={{
                                ...metaGroup(metaGap),
                                flex: "1 1 0",
                                minWidth: 0,
                                justifyContent: "flex-start",
                            }}
                        >
                            <span style={metaSmall}>{label?.number}</span>
                            <MetaTitle />
                        </div>
                        {/* Stands in for the card, so a long title runs out
                            of room instead of running underneath it. */}
                        <div ref={metaGapRef} style={{ flex: "0 0 auto" }} />
                        <div
                            style={{
                                ...metaGroup(metaGap),
                                flex: "1 1 0",
                                minWidth: 0,
                                justifyContent: "flex-end",
                            }}
                        >
                            <span style={metaSmall}>{label?.footerLeft}</span>
                            <span style={metaSmall}>{label?.footerRight}</span>
                        </div>
                    </div>
                </div>
            )}

            {showSwitcher && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 32,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 32,
                        zIndex: 100,
                        fontFamily: "monospace",
                        fontSize: 14.4,
                        letterSpacing: 1.5,
                        userSelect: "none",
                        WebkitUserSelect: "none",
                    }}
                >
                    <button
                        style={btnStyle(isVertical)}
                        onClick={() => switchTo(true)}
                    >
                        {verticalLabel}
                        {isVertical && <span style={underline} />}
                    </button>
                    <button
                        style={btnStyle(!isVertical)}
                        onClick={() => switchTo(false)}
                    >
                        {horizontalLabel}
                        {!isVertical && <span style={underline} />}
                    </button>
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ *
 *  Defaults — the six cards from the original deck
 * ------------------------------------------------------------------ */

const emptyCard: CardData = {
    variant: "text",
    number: "",
    title: "",
    titleSize: 35.2,
    centerTitle: false,
    titleColor: "",
    footerLeft: "",
    footerRight: "",
    background: "#dcd3b8",
    color: "#1a1a1a",
    borderColor: "",
    iconOuter: "#ff4b72",
    iconInner: "#ffffff",
    image: "",
    link: "",
}

const defaultCards: CardData[] = [
    {
        ...emptyCard,
        number: "001",
        title: "PRODUX",
        footerLeft: "Overview",
        footerRight: "2026",
        background: "#dcd3b8",
        color: "#1a1a1a",
    },
    {
        ...emptyCard,
        number: "002",
        title: "g",
        titleSize: 64,
        centerTitle: true,
        footerLeft: "Gather AI",
        footerRight: "Full case",
        background: "#e8eaed",
        color: "#1a1a1a",
    },
    {
        ...emptyCard,
        number: "003",
        title: "Jurni AI",
        footerLeft: "Full case",
        footerRight: "2026",
        background: "#ff4500",
        color: "#ffffff",
    },
    {
        ...emptyCard,
        variant: "icon",
        background: "#140306",
        color: "#ffffff",
        borderColor: "#3d0510",
        iconOuter: "#ff4b72",
        iconInner: "#ffffff",
    },
    {
        ...emptyCard,
        number: "005",
        title: "N",
        titleSize: 48,
        titleColor: "#6a75ca",
        footerLeft: "System",
        footerRight: "2026",
        background: "#12131c",
        color: "#7b82b0",
        borderColor: "#222538",
    },
    {
        ...emptyCard,
        number: "006",
        title: "⚡",
        titleSize: 40,
        footerLeft: "Kinetic",
        footerRight: "Studio",
        background: "#ccff00",
        color: "#000000",
    },
]

/* ------------------------------------------------------------------ *
 *  Property controls
 * ------------------------------------------------------------------ */

/* @controls:start */
const DEFAULTS = {
    cards: defaultCards,
    cardWidth: 420,
    cardHeight: 280,
    verticalCardWidth: 460,
    gap: 16,
    startMode: "horizontal",
    loop: "infinite",
    showSwitcher: true,
    verticalLabel: "VERTICAL",
    horizontalLabel: "HORIZONTAL",
    background: "#0d0d0d",
    accent: "#ccff00",
    inactive: "#444444",
    scrollSpeed: 1,
    touchSpeed: 1.5,
    snapDuration: 0.45,
    morphDuration: 0.9,
    morphEase: "inOut",
    thumbDesaturate: 0.8,
    thumbDim: 0.35,
    focusDuration: 0.5,
    textAboveImage: false,
    showMeta: true,
    showCardText: false,
    metaTitleSize: 36,
    metaColor: "#ffffff",
    metaInset: 104,
    metaGap: 118,
    metaOffset: 18,
    clickAction: "focus",
    linkTarget: "same",
    mobileBreakpoint: 700,
    mobileGap: 56,
    mobilePadding: 20,
    interruptSnap: false,
    force3D: true,
    scrollTarget: "component",
}
/* @controls:end */

addPropertyControls(SnapDeck, {
    cards: {
        type: ControlType.Array,
        title: "Cards",
        defaultValue: defaultCards,
        control: {
            type: ControlType.Object,
            controls: {
                variant: {
                    type: ControlType.Enum,
                    title: "Type",
                    options: ["text", "icon"],
                    optionTitles: ["Text", "Icon"],
                    defaultValue: "text",
                    displaySegmentedControl: true,
                },
                number: {
                    type: ControlType.String,
                    title: "Number",
                    defaultValue: "001",
                    hidden: (p) => p.variant === "icon",
                },
                title: {
                    type: ControlType.String,
                    title: "Title",
                    defaultValue: "PRODUX",
                    hidden: (p) => p.variant === "icon",
                },
                titleSize: {
                    type: ControlType.Number,
                    title: "Title Size",
                    defaultValue: 35.2,
                    min: 8,
                    max: 160,
                    step: 0.1,
                    displayStepper: false,
                    hidden: (p) => p.variant === "icon",
                },
                centerTitle: {
                    type: ControlType.Boolean,
                    title: "Center Title",
                    defaultValue: false,
                    hidden: (p) => p.variant === "icon",
                },
                titleColor: {
                    type: ControlType.Color,
                    title: "Title Color",
                    defaultValue: "",
                    optional: true,
                    hidden: (p) => p.variant === "icon",
                },
                footerLeft: {
                    type: ControlType.String,
                    title: "Footer L",
                    defaultValue: "Overview",
                    hidden: (p) => p.variant === "icon",
                },
                footerRight: {
                    type: ControlType.String,
                    title: "Footer R",
                    defaultValue: "2026",
                    hidden: (p) => p.variant === "icon",
                },
                image: {
                    type: ControlType.Image,
                    title: "Image",
                },
                link: {
                    type: ControlType.Link,
                    title: "Link",
                },
                background: {
                    type: ControlType.Color,
                    title: "Background",
                    defaultValue: "#dcd3b8",
                },
                color: {
                    type: ControlType.Color,
                    title: "Text",
                    defaultValue: "#1a1a1a",
                },
                borderColor: {
                    type: ControlType.Color,
                    title: "Border",
                    defaultValue: "",
                    optional: true,
                },
                iconOuter: {
                    type: ControlType.Color,
                    title: "Ring Outer",
                    defaultValue: "#ff4b72",
                    hidden: (p) => p.variant !== "icon",
                },
                iconInner: {
                    type: ControlType.Color,
                    title: "Ring Inner",
                    defaultValue: "#ffffff",
                    hidden: (p) => p.variant !== "icon",
                },
            },
        },
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card W",
        defaultValue: 420,
        min: 80,
        max: 1200,
        step: 1,
        displayStepper: false,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card H",
        defaultValue: 280,
        min: 80,
        max: 1200,
        step: 1,
        displayStepper: false,
    },
    verticalCardWidth: {
        type: ControlType.Number,
        title: "Vert Card W",
        defaultValue: 460,
        min: 80,
        max: 1200,
        step: 1,
        displayStepper: false,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 16,
        min: 0,
        max: 200,
        step: 1,
        displayStepper: false,
    },
    startMode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["horizontal", "vertical"],
        optionTitles: ["Horizontal", "Vertical"],
        defaultValue: "horizontal",
        displaySegmentedControl: true,
    },
    loop: {
        type: ControlType.Enum,
        title: "Loop",
        options: ["infinite", "finite"],
        optionTitles: ["Infinite", "Finite"],
        defaultValue: "infinite",
        displaySegmentedControl: true,
    },
    morphDuration: {
        type: ControlType.Number,
        title: "Morph (s)",
        defaultValue: 0.9,
        min: 0,
        max: 3,
        step: 0.05,
        displayStepper: false,
    },
    morphEase: {
        type: ControlType.Enum,
        title: "Morph Ease",
        options: ["inOut", "out", "linear"],
        optionTitles: ["In Out", "Out", "Linear"],
        defaultValue: "inOut",
    },
    thumbDesaturate: {
        type: ControlType.Number,
        title: "Thumb Desat",
        defaultValue: 0.8,
        min: 0,
        max: 1,
        step: 0.05,
        displayStepper: false,
    },
    thumbDim: {
        type: ControlType.Number,
        title: "Thumb Dim",
        defaultValue: 0.35,
        min: 0,
        max: 1,
        step: 0.05,
        displayStepper: false,
    },
    showMeta: {
        type: ControlType.Boolean,
        title: "Card Label",
        defaultValue: true,
    },
    showCardText: {
        type: ControlType.Boolean,
        title: "Text On Card",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    metaTitleSize: {
        type: ControlType.Number,
        title: "Label Size",
        defaultValue: 36,
        min: 10,
        max: 120,
        step: 1,
        displayStepper: false,
        hidden: (p) => !p.showMeta,
    },
    metaColor: {
        type: ControlType.Color,
        title: "Label Color",
        defaultValue: "#ffffff",
        hidden: (p) => !p.showMeta,
    },
    metaInset: {
        type: ControlType.Number,
        title: "Label Inset",
        defaultValue: 104,
        min: 0,
        max: 400,
        step: 2,
        displayStepper: false,
        hidden: (p) => !p.showMeta,
    },
    metaGap: {
        type: ControlType.Number,
        title: "Label Gap",
        defaultValue: 118,
        min: 0,
        max: 400,
        step: 2,
        displayStepper: false,
        hidden: (p) => !p.showMeta,
    },
    metaOffset: {
        type: ControlType.Number,
        title: "Label Offset",
        defaultValue: 18,
        min: 0,
        max: 200,
        step: 1,
        displayStepper: false,
        hidden: (p) => !p.showMeta,
    },
    textAboveImage: {
        type: ControlType.Boolean,
        title: "Text Over Img",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    focusDuration: {
        type: ControlType.Number,
        title: "Bloom (s)",
        defaultValue: 0.5,
        min: 0,
        max: 3,
        step: 0.05,
        displayStepper: false,
    },
    showSwitcher: {
        type: ControlType.Boolean,
        title: "Switcher",
        defaultValue: true,
    },
    verticalLabel: {
        type: ControlType.String,
        title: "Label V",
        defaultValue: "VERTICAL",
        hidden: (p) => !p.showSwitcher,
    },
    horizontalLabel: {
        type: ControlType.String,
        title: "Label H",
        defaultValue: "HORIZONTAL",
        hidden: (p) => !p.showSwitcher,
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#0d0d0d",
    },
    accent: {
        type: ControlType.Color,
        title: "Accent",
        defaultValue: "#ccff00",
    },
    inactive: {
        type: ControlType.Color,
        title: "Inactive",
        defaultValue: "#444444",
        hidden: (p) => !p.showSwitcher,
    },
    scrollSpeed: {
        type: ControlType.Number,
        title: "Wheel Speed",
        defaultValue: 1,
        min: 0.1,
        max: 5,
        step: 0.1,
        displayStepper: false,
    },
    touchSpeed: {
        type: ControlType.Number,
        title: "Touch Speed",
        defaultValue: 1.5,
        min: 0.1,
        max: 5,
        step: 0.1,
        displayStepper: false,
    },
    snapDuration: {
        type: ControlType.Number,
        title: "Snap (s)",
        defaultValue: 0.45,
        min: 0,
        max: 2,
        step: 0.05,
        displayStepper: false,
    },
    mobileBreakpoint: {
        type: ControlType.Number,
        title: "Mobile Below",
        defaultValue: 700,
        min: 0,
        max: 1400,
        step: 10,
        displayStepper: false,
    },
    mobileGap: {
        type: ControlType.Number,
        title: "Mobile Gap",
        defaultValue: 56,
        min: 0,
        max: 200,
        step: 2,
        displayStepper: false,
    },
    mobilePadding: {
        type: ControlType.Number,
        title: "Mobile Pad",
        defaultValue: 20,
        min: 0,
        max: 120,
        step: 2,
        displayStepper: false,
    },
    clickAction: {
        type: ControlType.Enum,
        title: "On Click",
        options: ["focus", "open"],
        optionTitles: ["Focus, then open", "Open directly"],
        defaultValue: "focus",
    },
    linkTarget: {
        type: ControlType.Enum,
        title: "Open In",
        options: ["same", "new"],
        optionTitles: ["Same tab", "New tab"],
        defaultValue: "same",
        displaySegmentedControl: true,
    },
    interruptSnap: {
        type: ControlType.Boolean,
        title: "Interrupt Snap",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    force3D: {
        type: ControlType.Boolean,
        title: "GPU Layers",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    scrollTarget: {
        type: ControlType.Enum,
        title: "Capture",
        options: ["component", "window"],
        optionTitles: ["Component", "Page"],
        defaultValue: "component",
        displaySegmentedControl: true,
    },
})
