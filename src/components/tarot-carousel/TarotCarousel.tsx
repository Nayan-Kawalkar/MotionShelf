import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * THE EIGHT — 3D card carousel
 *
 * Cards sit on one shared rotation. As the deck advances every card's
 * angle moves the same way — like cards on a single drum, at different
 * points in the same turn. Passing 90 degrees is what swaps the face,
 * so there is no separate flip to fall out of sync.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 760
 * @framerDisableUnlink
 */

// ---------------------------------------------------------------- types

interface CardItem {
    image?: { src: string; srcSet?: string; alt?: string } | string
    title?: string
    pip?: string
    /** leave 0 to let the deck deal this card an angle */
    tilt?: number
}

interface Geometry {
    cardSize: number
    aspect: number
    spread: number
    perspective: number
    restYaw: number
    push: number
    bump: number
    lean: number
}

interface Motion {
    duration: number
    flipFrom: number
    flipTo: number
}

interface Deal {
    tiltMin: number
    tiltMax: number
    seed: number
    alternate: boolean
}

const GEOMETRY: Geometry = {
    cardSize: 84,
    aspect: 1.535,
    spread: 0.494,
    perspective: 1.147,
    restYaw: 9,
    push: 170,
    bump: 90,
    lean: 2,
}
const MOTION: Motion = { duration: 1000, flipFrom: 0.1, flipTo: 0.9 }
const DEAL: Deal = { tiltMin: 2.5, tiltMax: 10, seed: 20260908, alternate: true }
const CARDS: CardItem[] = [
    { title: "The Waterfall", pip: "8", tilt: 0 },
    { title: "The Rearing", pip: "8", tilt: 0 },
    { title: "The Gallop", pip: "8", tilt: 0 },
    { title: "The Crossing", pip: "8", tilt: 0 },
    { title: "The Watchers", pip: "8", tilt: 0 },
    { title: "The Return", pip: "8", tilt: 0 },
]
const BACKDROP =
    "radial-gradient(115% 80% at 50% 46%, #240409 0%, #1b0206 38%, #140004 72%, #0f0003 100%)"

interface Props {
    cards: CardItem[]
    background: string
    cream: string
    backField: string
    patternRed: string
    patternInner: string
    responsive: boolean
    wheelControl: boolean
    showHeader: boolean
    headerTitle: string
    headerFont: string
    membersLabel: string
    showArrows: boolean
    showCounter: boolean
    autoPlay: boolean
    autoPlayDelay: number
    geometry: Geometry
    motion: Motion
    deal: Deal
    style?: React.CSSProperties
}

// ------------------------------------------------------------- helpers

/** 6t^5-15t^4+10t^3 — zero velocity AND acceleration at both ends */
function smootherstep(edge0: number, edge1: number, x: number) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
    return t * t * t * (t * (t * 6 - 15) + 10)
}

const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Merge that ignores holes. Object spread copies `undefined` straight over
    a default, so a control that hands back an untouched field would wipe the
    value it was meant to fall back to. */
function merge<T extends object>(base: T, patch?: Partial<T>): T {
    const out = { ...base }
    if (!patch) return out
    for (const k in patch) {
        const v = patch[k] as unknown
        if (v === undefined || v === null) continue
        if (typeof v === "number" && !isFinite(v)) continue
        out[k] = v as T[Extract<keyof T, string>]
    }
    return out
}

/** splitmix32 — a good spread, unlike a bare xorshift on small seeds */
function hashed(seed: number, i: number) {
    let h = (seed + (i + 1) * 0x9e3779b9) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x21f0aaad) >>> 0
    h = Math.imul(h ^ (h >>> 15), 0x735a2d97) >>> 0
    h = (h ^ (h >>> 15)) >>> 0
    return h / 0xffffffff
}

function srcOf(image: CardItem["image"]) {
    if (!image) return ""
    return typeof image === "string" ? image : image.src || ""
}

/** stand-in plate so the component never renders empty in the panel */
function placeholder(i: number) {
    const S = [
        [0.3, 0.62, 0.2],
        [0.52, 0.44, 0.34],
        [0.18, 0.7, 0.26],
        [0.66, 0.38, 0.44],
        [0.42, 0.56, 0.15],
        [0.24, 0.5, 0.38],
    ][i % 6]
    const [a, b, c] = S
    const R = Math.round
    const ridge = (y: number, amp: number, fill: string) =>
        `<path d="M0 ${R(y)} L${R(58 + a * 70)} ${R(y - amp)} L${R(132 + b * 46)} ${R(
            y - amp * 0.34
        )} L${R(214 + c * 70)} ${R(y - amp * 1.15)} L${R(312 + a * 40)} ${R(
            y - amp * 0.42
        )} L400 ${R(y - amp * 0.86)} L400 470 L0 470Z" fill="${fill}"/>`
    const water = Array.from(
        { length: 12 },
        (_, k) =>
            `<path d="M${R(18 + k * 34)} ${R(474 + ((k * 43) % 50))} q ${R(
                26 + a * 20
            )} -10 60 2"/>`
    ).join("")
    const fall = Array.from(
        { length: 6 },
        (_, k) =>
            `<path d="M${R(44 + c * 170 + k * 6)} ${R(298 + a * 40)} v ${R(
                80 + k * 10
            )}"/>`
    ).join("")

    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 614" preserveAspectRatio="xMidYMid slice">` +
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#faf5ec"/><stop offset="1" stop-color="#dcccb9"/></linearGradient>` +
        `<pattern id="h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(${R(
            24 + a * 38
        )})"><line x1="0" y1="0" x2="0" y2="5" stroke="#1a0206" stroke-width="1" opacity=".2"/></pattern>` +
        `<pattern id="h2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(${R(
            -30 - b * 30
        )})"><line x1="0" y1="0" x2="0" y2="4" stroke="#1a0206" stroke-width="1" opacity=".32"/></pattern></defs>` +
        `<rect width="400" height="614" fill="url(#s)"/>` +
        `<g fill="#a4907e" opacity=".5">` +
        `<ellipse cx="${R(88 + a * 150)}" cy="${R(80 + b * 34)}" rx="88" ry="26"/>` +
        `<ellipse cx="${R(206 + b * 110)}" cy="${R(112 + a * 26)}" rx="106" ry="30"/>` +
        `<ellipse cx="${R(52 + c * 190)}" cy="${R(136 + c * 26)}" rx="72" ry="21"/></g>` +
        ridge(318 + a * 44, 122, "#8e261b") +
        ridge(318 + a * 44, 122, "url(#h)") +
        ridge(358 + b * 30, 60, "#6d1c14") +
        `<path d="M0 ${R(408 + b * 22)} L118 ${R(378 + a * 24)} L258 ${R(
            418 + c * 20
        )} L400 ${R(386 + b * 18)} L400 614 L0 614Z" fill="#1a0206"/>` +
        `<path d="M0 ${R(408 + b * 22)} L118 ${R(378 + a * 24)} L258 ${R(
            418 + c * 20
        )} L400 ${R(386 + b * 18)} L400 614 L0 614Z" fill="url(#h2)" opacity=".55"/>` +
        `<path d="M${R(
            176 + a * 44
        )} 108 l6 -44 6 44 44 6 -44 6 -6 44 -6 -44 -44 -6z" fill="#1a0206"/>` +
        `<g stroke="#f7f1e6" stroke-width="1.6" fill="none" opacity=".8">${fall}</g>` +
        `<g stroke="#f7f1e6" stroke-width="1.1" fill="none" opacity=".5">${water}</g>` +
        `</svg>`

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
}

// ----------------------------------------------------------- component

export default function TarotCarousel(props: Partial<Props>) {
    const {
        cards = CARDS,
        background = BACKDROP,
        cream = "#f7f1e6",
        backField = "#1f0308",
        patternRed = "rgba(168,48,42,.46)",
        patternInner = "rgba(126,32,28,.34)",
        responsive = true,
        wheelControl = true,
        showHeader = true,
        headerTitle = "The Eight",
        headerFont = "Italianno, 'Snell Roundhand', cursive",
        membersLabel = "Members",
        showArrows = true,
        showCounter = true,
        autoPlay = false,
        autoPlayDelay = 3600,
        style,
    } = props

    /* Merged field by field. A grouped control can hand back an object whose
       untouched fields are undefined, and a plain spread would let those
       holes overwrite the defaults. */
    const geometry = merge(GEOMETRY, props.geometry)
    const motion = merge(MOTION, props.motion)
    const deal = merge(DEAL, props.deal)

    const onCanvas = RenderTarget.current() === RenderTarget.canvas
    const N = Math.max(1, cards.length)

    const rootRef = React.useRef<HTMLDivElement>(null)
    const stageRef = React.useRef<HTMLDivElement>(null)
    const cardRefs = React.useRef<(HTMLDivElement | null)[]>([])
    const innerRefs = React.useRef<(HTMLDivElement | null)[]>([])

    const [active, setActive] = React.useState(0)
    const lastActive = React.useRef(0)
    const [box, setBox] = React.useState({ w: 1200, h: 760 })

    // live values the rAF loop reads without re-subscribing
    const pos = React.useRef(0)
    const tween = React.useRef({ from: 0, to: 0, t0: 0, dur: 0, running: false })
    const drag = React.useRef({
        active: false,
        startX: 0,
        startPos: 0,
        moved: 0,
        lastX: 0,
        lastT: 0,
        vel: 0,
    })
    const cfg = React.useRef({ geometry, motion, deal, N, spreadPx: 0 })

    // resting angles: direction alternates, only the amount is dealt
    const tilts = React.useMemo(() => {
        const out: number[] = []
        for (let i = 0; i < N; i++) {
            const given = cards[i]?.tilt
            if (typeof given === "number" && given !== 0) {
                out.push(given)
                continue
            }
            const amount =
                deal.tiltMin + hashed(deal.seed, i) * (deal.tiltMax - deal.tiltMin)
            const dir = deal.alternate ? (i % 2 ? -1 : 1) : hashed(deal.seed, i + 99) < 0.5 ? -1 : 1
            out.push(dir * amount)
        }
        // an odd deck wraps two same-leaning cards together — break the tie
        if (deal.alternate && N % 2 === 1 && !cards[N - 1]?.tilt) out[N - 1] *= -1
        return out
    }, [cards, N, deal.tiltMin, deal.tiltMax, deal.seed, deal.alternate])

    const tiltsRef = React.useRef(tilts)
    tiltsRef.current = tilts

    // ---- measure the container (Framer resizes freely) ----
    React.useEffect(() => {
        const el = rootRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(() => {
            const r = el.getBoundingClientRect()
            if (r.width && r.height) setBox({ w: r.width, h: r.height })
        })
        ro.observe(el)
        const r = el.getBoundingClientRect()
        if (r.width && r.height) setBox({ w: r.width, h: r.height })
        return () => ro.disconnect()
    }, [])

    /* ---------------- RESPONSIVE SIZING ----------------------------
       Two things break when the frame is not a wide desktop rectangle:

       1. `spread` is a fraction of FRAME width, but so is the card. On a
          portrait frame the card outgrows the gap and the neighbours land
          ON TOP of it — measured at -110px on a 390-wide phone. So the
          spread also gets a floor expressed in CARD widths, which is the
          only reference that guarantees clearance at any frame shape.

       2. On a very short frame the counter collides with the card, so the
          card height is capped to leave that strip alone.

       Each guard is a max()/min() against the existing value, so a normal
       desktop frame is completely unaffected and still matches the HTML
       build pixel for pixel.                                            */

    const narrow = responsive && box.w <= 820
    const geo = narrow
        ? { ...geometry, cardSize: 64, spread: 0.6, push: 120, bump: 60 }
        : geometry

    /* the same clamps the stylesheet spells in vh / vw */
    const clamp = (lo: number, v: number, hi: number) =>
        Math.max(lo, Math.min(hi, v))
    const barY = clamp(16, 0.03 * box.h, 32)
    const barX = clamp(20, 0.034 * box.w, 52)
    const wordSize = clamp(30, 0.029 * box.w, 48)
    const countB = clamp(18, 0.04 * box.h, 40)

    /* keep the counter's strip clear at the top and bottom of the card */
    const countZone = showCounter ? countB + 26 : 0

    /* A portrait frame must not let the card eat the whole width, or the
       neighbours get pushed clean off screen and the three-card
       composition is lost. 0.86 leaves a visible sliver either side. */
    const widthCap = narrow ? 0.86 : 0.72

    const cardH = Math.max(
        120,
        Math.min(
            (geo.cardSize / 100) * box.h,
            widthCap * box.w,
            box.h - 2 * countZone
        )
    )
    const cardW = cardH / Math.max(0.5, geometry.aspect)

    /* The floor that stops neighbours overlapping the centre card.
       It has to use the card's INFLATED width: a resting lean of up to
       --tilt-max widens a tall card's footprint by about a quarter
       (w·cos + h·sin), and ignoring that still left a ~20px overlap on
       every portrait frame. */
    const tiltRad = (deal.tiltMax * Math.PI) / 180
    const effW = cardW * Math.cos(tiltRad) + cardH * Math.sin(tiltRad)
    const spreadPx = Math.max(geo.spread * box.w, effW * 0.99 + 18)

    /* prefers-reduced-motion: the HTML shortens the move and drops the bump */
    const [reduced, setReduced] = React.useState(false)
    React.useEffect(() => {
        if (typeof matchMedia === "undefined") return
        const mq = matchMedia("(prefers-reduced-motion: reduce)")
        const on = () => setReduced(mq.matches)
        on()
        mq.addEventListener?.("change", on)
        return () => mq.removeEventListener?.("change", on)
    }, [])

    const mot = reduced
        ? { duration: 200, flipFrom: 0.42, flipTo: 0.58 }
        : motion
    const geoActive = reduced ? { ...geo, bump: 0 } : geo

    cfg.current = { geometry: geoActive, motion: mot, deal, N, spreadPx }

    // ---- the render loop ----
    React.useEffect(() => {
        let raf = 0
        let stopped = false

        const offsetOf = (i: number, p: number, n: number) => {
            let d = i - p
            d -= Math.round(d / n) * n
            return d
        }

        const paint = () => {
            const { geometry: g, motion: m, N: n, spreadPx: sp } = cfg.current
            const W = rootRef.current?.clientWidth || 1200
            const p = pos.current

            if (stageRef.current) {
                stageRef.current.style.perspective = g.perspective * W + "px"
            }

            for (let i = 0; i < n; i++) {
                const el = cardRefs.current[i]
                const inner = innerRefs.current[i]
                if (!el || !inner) continue

                const off = offsetOf(i, p, n)
                const A = Math.abs(off)

                // ONE angle, odd in `off`, so every card turns the same way
                const turn = smootherstep(m.flipFrom, m.flipTo, A)
                const face = -180 * (off < 0 ? -1 : 1) * turn

                if (A > 1.5) {
                    if (el.style.visibility !== "hidden") {
                        el.style.visibility = "hidden"
                        el.style.opacity = "0"
                    }
                    continue
                }
                el.style.visibility = "visible"
                el.style.opacity = (
                    A > 1.12 ? Math.max(0, 1 - (A - 1.12) / 0.38) : 1
                ).toFixed(3)

                const arch = Math.sin(Math.PI * A)
                const x = sp * off
                const z = (g.push * A + g.bump * arch) * (W / 1918)
                const ry = face - g.restYaw * off
                const rz = (tiltsRef.current[i] || 0) - g.lean * off

                el.style.setProperty(
                    "--tc-shade",
                    (Math.abs(Math.sin((ry * Math.PI) / 180)) * 0.42).toFixed(3)
                )
                // rotateZ stays outside the turn: the resting lean is a
                // screen-space angle and must not invert past 90 degrees
                el.style.transform =
                    `translate3d(${x.toFixed(1)}px,0,${z.toFixed(1)}px) ` +
                    `rotateZ(${rz.toFixed(2)}deg)`
                // the turn goes INSIDE — .card carries opacity, which groups
                // and would stop a rotation above it counting toward
                // backface-visibility
                inner.style.transform = `rotateY(${ry.toFixed(2)}deg)`
            }

            const a = ((Math.round(p) % n) + n) % n
            if (a !== lastActive.current) {
                lastActive.current = a
                setActive(a)
            }
        }

        const tick = (now: number) => {
            if (stopped) return
            const t = tween.current
            if (t.running && !drag.current.active) {
                const u = Math.min(1, (now - t.t0) / t.dur)
                pos.current = t.from + (t.to - t.from) * easeInOut(u)
                if (u === 1) {
                    pos.current = t.to
                    t.running = false
                }
            }
            paint()
            raf = requestAnimationFrame(tick)
        }

        paint()
        raf = requestAnimationFrame(tick)
        return () => {
            stopped = true
            cancelAnimationFrame(raf)
        }
    }, [N, cardW, cardH, spreadPx])

    // ---- navigation ----
    const goTo = React.useCallback((next: number) => {
        const t = tween.current
        t.from = pos.current
        t.to = next
        const span = Math.max(1, Math.abs(t.to - t.from))
        t.dur = cfg.current.motion.duration * (1 + (span - 1) * 0.4)
        t.t0 = performance.now()
        t.running = true
    }, [])

    const go = React.useCallback(
        (d: number) => {
            const t = tween.current
            goTo(Math.round(t.running ? t.to : pos.current) + d)
        },
        [goTo]
    )

    // ---- autoplay ----
    React.useEffect(() => {
        if (!autoPlay || onCanvas || N < 2) return
        const id = setInterval(() => {
            if (!drag.current.active) go(1)
        }, Math.max(600, autoPlayDelay))
        return () => clearInterval(id)
    }, [autoPlay, autoPlayDelay, onCanvas, N, go])

    // ---- keyboard ----
    React.useEffect(() => {
        if (onCanvas) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") go(1)
            if (e.key === "ArrowLeft") go(-1)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onCanvas, go])

    // ---- pointer drag ----
    const DRAG_PER_CARD = 430   /* px of drag that equals one card */

    const onPointerDown = (e: React.PointerEvent) => {
        if (onCanvas) return
        const d = drag.current
        d.active = true
        d.moved = 0
        d.vel = 0
        d.startX = d.lastX = e.clientX
        d.startPos = pos.current
        d.lastT = performance.now()
        tween.current.running = false
        const node = e.currentTarget as HTMLElement
        node.dataset.drag = "1"
        node.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current
        if (!d.active) return
        const dx = e.clientX - d.startX
        d.moved = Math.abs(dx)
        pos.current = d.startPos - dx / DRAG_PER_CARD
        const now = performance.now()
        const dt = now - d.lastT
        if (dt > 8) {
            d.vel = -(e.clientX - d.lastX) / DRAG_PER_CARD / dt
            d.lastX = e.clientX
            d.lastT = now
        }
    }

    const endDrag = () => {
        const d = drag.current
        if (stageRef.current) stageRef.current.dataset.drag = "0"
        if (!d.active) return
        d.active = false
        const nearest = Math.round(pos.current)
        // a quick flick always carries at least one card
        if (Math.abs(d.vel) > 0.0012 && nearest === Math.round(d.startPos)) {
            goTo(nearest + Math.sign(d.vel))
        } else {
            goTo(nearest)
        }
    }

    /* WHEEL.
       Deltas accumulate into a gesture, and the next turn cannot start
       until the current one has finished easing. Re-arming sooner than the
       tween duration restarts the animation from its own midpoint, which
       is what makes a trackpad scroll lurch and skip the card angles. */
    const wheel = React.useRef({ accum: 0, last: 0, until: 0 })
    const WHEEL_STEP = 90 /* delta that adds up to one card  */
    const WHEEL_GAP = 220 /* ms of quiet that ends a gesture */

    const onWheel = (e: React.WheelEvent) => {
        if (onCanvas || !wheelControl) return
        const w = wheel.current
        const now = performance.now()
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY

        /* a pause starts a fresh count, so a momentum tail cannot chain */
        if (now - w.last > WHEEL_GAP) w.accum = 0
        w.last = now

        if (now < w.until) return // a turn is still easing

        w.accum += d
        if (Math.abs(w.accum) < WHEEL_STEP) return

        const dir = Math.sign(w.accum)
        w.accum = 0
        w.until = now + cfg.current.motion.duration
        go(dir)
    }

    // ---- per-instance CSS variables ----
    const vars = {
        "--tc-cream": cream,
        "--tc-back": backField,
        "--tc-red": patternRed,
        "--tc-red2": patternInner,
        "--tc-bar-y": barY + "px",
        "--tc-bar-x": barX + "px",
        "--tc-count-b": countB + "px",
        "--tc-card-w": cardW + "px",
        "--tc-card-h": cardH + "px",
    } as React.CSSProperties

    const css = `
.tc-root,.tc-root *{box-sizing:border-box}
.tc-root{position:relative;overflow:hidden;isolation:isolate;
  -webkit-font-smoothing:antialiased;}
.tc-root::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;
  background:radial-gradient(80% 66% at 50% 50%, transparent 38%, rgba(6,0,2,.72) 100%);}
.tc-bar{position:absolute;inset:0 0 auto 0;z-index:8;display:grid;
  grid-template-columns:1fr auto 1fr;align-items:center;
  padding:var(--tc-bar-y) var(--tc-bar-x);pointer-events:none;}
.tc-bar>*{pointer-events:auto}
.tc-menu{justify-self:start;width:30px;height:14px;padding:0;border:0;background:none;
  cursor:pointer;display:flex;flex-direction:column;justify-content:space-between;}
.tc-menu span{display:block;height:1px;background:var(--tc-cream);opacity:.85;
  transition:width .35s cubic-bezier(.22,.61,.24,1);}
.tc-menu span:last-child{width:60%}
.tc-menu:hover span:last-child{width:100%}
.tc-word{margin:0;justify-self:center;font-weight:400;line-height:1;letter-spacing:.01em;
  color:var(--tc-cream);white-space:nowrap;user-select:none;
  text-shadow:0 0 30px rgba(247,241,230,.16);}
.tc-members{justify-self:end;font-size:11px;letter-spacing:.36em;
  text-transform:uppercase;color:var(--tc-cream);text-decoration:none;opacity:.9;
  transition:opacity .3s;font-family:ui-sans-serif,system-ui,Arial,sans-serif;}
.tc-members:hover{opacity:.55}
.tc-stage{position:absolute;inset:0;z-index:2;perspective-origin:50% 50%;
  cursor:grab;touch-action:pan-y;}
.tc-stage[data-drag="1"]{cursor:grabbing}
.tc-ring{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;}
.tc-card{position:absolute;width:var(--tc-card-w);height:var(--tc-card-h);
  margin-left:calc(var(--tc-card-w) / -2);margin-top:calc(var(--tc-card-h) / -2);
  transform-style:preserve-3d;will-change:transform;}
.tc-inner{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform;}
.tc-face{position:absolute;inset:0;backface-visibility:hidden;
  -webkit-backface-visibility:hidden;border-radius:calc(var(--tc-card-w) * .045);
  background:var(--tc-cream);padding:calc(var(--tc-card-w) * .033);
  box-shadow:0 1px 1px rgba(0,0,0,.4), 0 30px 70px rgba(0,0,0,.6);}
.tc-back{transform:rotateY(180deg)}
.tc-face::before{content:"";position:absolute;inset:0;z-index:4;pointer-events:none;
  border-radius:inherit;background:#0b0002;opacity:var(--tc-shade,0);}
.tc-plate{position:relative;width:100%;height:100%;overflow:hidden;background:#2a0407;
  border-radius:calc(var(--tc-card-w) * .018);box-shadow:0 0 0 1px rgba(30,3,7,.55);}
.tc-plate img{display:block;width:100%;height:100%;object-fit:cover}
.tc-plate::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.34;
  mix-blend-mode:multiply;background-size:140px 140px, cover;
  background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E"),
    radial-gradient(120% 92% at 50% 32%, transparent 52%, rgba(26,1,5,.34));}
.tc-pip{position:absolute;z-index:2;display:grid;place-items:center;
  width:calc(var(--tc-card-w) * .095);height:calc(var(--tc-card-w) * .125);
  background:var(--tc-cream);border:1px solid rgba(26,2,6,.55);
  border-radius:calc(var(--tc-card-w) * .008);
  font-size:calc(var(--tc-card-w) * .09);line-height:1;color:#1a0206;
  padding-bottom:.1em;}
.tc-pip-tr{top:calc(var(--tc-card-w) * .058);right:calc(var(--tc-card-w) * .058)}
.tc-pip-bl{bottom:calc(var(--tc-card-w) * .058);left:calc(var(--tc-card-w) * .058)}
.tc-weave{--t:calc(var(--tc-card-w) * .175);position:relative;width:100%;height:100%;
  overflow:hidden;border-radius:calc(var(--tc-card-w) * .018);
  background-color:var(--tc-back);
  background-image:
    radial-gradient(circle, transparent 45%, var(--tc-red) 45.6%, var(--tc-red) 47.6%, transparent 48.2%),
    radial-gradient(circle, transparent 45%, var(--tc-red) 45.6%, var(--tc-red) 47.6%, transparent 48.2%),
    radial-gradient(circle, transparent 26%, var(--tc-red2) 26.6%, var(--tc-red2) 28.2%, transparent 28.8%);
  background-size:var(--t) var(--t), var(--t) var(--t), var(--t) var(--t);
  background-position:0 0, calc(var(--t)/2) calc(var(--t)/2), calc(var(--t)/2) calc(var(--t)/2);}
.tc-weave::after{content:"";position:absolute;inset:0;
  background:radial-gradient(72% 58% at 50% 44%, rgba(132,30,26,.18), transparent 72%);}
.tc-nav{position:absolute;top:50%;z-index:9;width:24px;height:24px;margin-top:-12px;
  padding:0;display:grid;place-items:center;border:0;border-radius:50%;
  background:var(--tc-cream);color:#1a0206;cursor:pointer;opacity:.88;
  transition:transform .35s cubic-bezier(.22,.61,.24,1),opacity .3s;}
.tc-nav:hover{transform:scale(1.2);opacity:1}
.tc-nav:active{transform:scale(.92)}
.tc-nav svg{width:8px;height:8px}
.tc-count{position:absolute;left:0;right:0;bottom:var(--tc-count-b);z-index:8;text-align:center;
  pointer-events:none;font-size:10px;letter-spacing:.32em;opacity:.28;
  color:var(--tc-cream);font-family:ui-sans-serif,system-ui,Arial,sans-serif;}
@media (prefers-reduced-motion:reduce){.tc-nav{transition:none}}
`

    return (
        <div
            ref={rootRef}
            className="tc-root"
            style={{
                width: "100%",
                height: "100%",
                background,
                ...vars,
                ...style,
            }}
        >
            <style>{css}</style>

            {showHeader && (
                <header className="tc-bar">
                    <button className="tc-menu" aria-label="Menu" type="button">
                        <span />
                        <span />
                    </button>
                    <h1
                        className="tc-word"
                        style={{
                            fontFamily: headerFont,
                            fontSize: wordSize,
                        }}
                    >
                        {headerTitle}
                    </h1>
                    <span className="tc-members">{membersLabel}</span>
                </header>
            )}

            <div
                ref={stageRef}
                className="tc-stage"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                onWheel={onWheel}
            >
                <div className="tc-ring">
                    {cards.map((c, i) => {
                        const src = srcOf(c.image) || placeholder(i)
                        return (
                            <div
                                key={i}
                                className="tc-card"
                                ref={(el) => {
                                    cardRefs.current[i] = el
                                }}
                                onClick={() => {
                                    if (drag.current.moved > 6) return
                                    let d = i - pos.current
                                    d -= Math.round(d / N) * N
                                    if (Math.abs(d) > 0.5) go(Math.sign(d))
                                }}
                            >
                                <div
                                    className="tc-inner"
                                    ref={(el) => {
                                        innerRefs.current[i] = el
                                    }}
                                >
                                    <div className="tc-face">
                                        <div className="tc-plate">
                                            <img
                                                src={src}
                                                alt={c.title || ""}
                                                draggable={false}
                                            />
                                            <span
                                                className="tc-pip tc-pip-tr"
                                                style={{ fontFamily: headerFont }}
                                            >
                                                {c.pip}
                                            </span>
                                            <span
                                                className="tc-pip tc-pip-bl"
                                                style={{ fontFamily: headerFont }}
                                            >
                                                {c.pip}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="tc-face tc-back">
                                        <div className="tc-weave" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {showArrows && (
                <>
                    <button
                        type="button"
                        className="tc-nav"
                        aria-label="Previous card"
                        style={
                            narrow
                                ? { left: 16 }
                                : { left: `calc(50% - ${cardW * 0.62}px)` }
                        }
                        onClick={() => go(-1)}
                    >
                        <svg
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                        >
                            <path d="M6.3 1.4 2.9 5l3.4 3.6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="tc-nav"
                        aria-label="Next card"
                        style={
                            narrow
                                ? { left: "auto", right: 16 }
                                : { left: `calc(50% + ${cardW * 0.62}px)` }
                        }
                        onClick={() => go(1)}
                    >
                        <svg
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                        >
                            <path d="M3.7 1.4 7.1 5l-3.4 3.6" />
                        </svg>
                    </button>
                </>
            )}

            {showCounter && (
                <div className="tc-count">
                    {String(active + 1).padStart(2, "0")} /{" "}
                    {String(N).padStart(2, "0")}
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------- property controls

addPropertyControls(TarotCarousel, {
    /* EVERY control carries a defaultValue. Without one Framer supplies its
       own — for a Number control that is the `min` — so an untouched panel
       would hand back aspect 1, spread 0.2 and restYaw/push/bump 0: square
       cards, no depth, no 3D. The constants above are the single source of
       truth for these values. */

    cards: {
        type: ControlType.Array,
        title: "Cards",
        defaultValue: CARDS,
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.ResponsiveImage, title: "Art" },
                title: { type: ControlType.String, title: "Name", defaultValue: "" },
                pip: { type: ControlType.String, title: "Numeral", defaultValue: "8" },
                tilt: {
                    type: ControlType.Number,
                    title: "Lean",
                    min: -20, max: 20, step: 0.5,
                    defaultValue: 0,
                    description: "0 lets the deck deal an angle",
                },
            },
        },
    },

    background: {
        type: ControlType.String,
        title: "Backdrop",
        defaultValue: BACKDROP,
        description: "Any CSS background — a colour or a gradient",
    },
    cream: { type: ControlType.Color, title: "Frame", defaultValue: "#f7f1e6" },
    backField: { type: ControlType.Color, title: "Card back", defaultValue: "#1f0308" },
    patternRed: { type: ControlType.Color, title: "Lattice", defaultValue: "rgba(168,48,42,.46)" },
    patternInner: { type: ControlType.Color, title: "Lattice dot", defaultValue: "rgba(126,32,28,.34)" },

    showHeader: { type: ControlType.Boolean, title: "Header", defaultValue: true },
    headerTitle: {
        type: ControlType.String, title: "Title", defaultValue: "The Eight",
        hidden: (p: Props) => !p.showHeader,
    },
    headerFont: {
        type: ControlType.String, title: "Title font",
        defaultValue: "Italianno, 'Snell Roundhand', cursive",
        description: "Also used for the card numerals",
    },
    membersLabel: {
        type: ControlType.String, title: "Link", defaultValue: "Members",
        hidden: (p: Props) => !p.showHeader,
    },

    showArrows: { type: ControlType.Boolean, title: "Arrows", defaultValue: true },
    showCounter: { type: ControlType.Boolean, title: "Counter", defaultValue: true },
    responsive: {
        type: ControlType.Boolean, title: "Adapt", defaultValue: true,
        description: "Below 820px wide, use the compact layout",
    },
    wheelControl: {
        type: ControlType.Boolean, title: "Scroll", defaultValue: true,
        description: "Let the wheel or trackpad turn the deck",
    },

    autoPlay: { type: ControlType.Boolean, title: "Autoplay", defaultValue: false },
    autoPlayDelay: {
        type: ControlType.Number, title: "Every",
        min: 800, max: 12000, step: 100, unit: "ms",
        defaultValue: 3600,
        hidden: (p: Props) => !p.autoPlay,
    },

    geometry: {
        type: ControlType.Object,
        title: "Geometry",
        defaultValue: GEOMETRY,
        controls: {
            cardSize: {
                type: ControlType.Number, title: "Card size",
                min: 20, max: 100, step: 1, unit: "%",
                defaultValue: GEOMETRY.cardSize,
                description: "Height of the centre card, against the frame",
            },
            aspect: {
                type: ControlType.Number, title: "Aspect",
                min: 0.6, max: 2.2, step: 0.005,
                defaultValue: GEOMETRY.aspect,
                description: "Height ÷ width. 1.535 is a tarot card",
            },
            spread: {
                type: ControlType.Number, title: "Spread",
                min: 0.2, max: 1, step: 0.001,
                defaultValue: GEOMETRY.spread,
                description: "Where a neighbour parks, as a share of width",
            },
            perspective: {
                type: ControlType.Number, title: "Camera",
                min: 0.5, max: 3, step: 0.01,
                defaultValue: GEOMETRY.perspective,
            },
            restYaw: {
                type: ControlType.Number, title: "Rest yaw",
                min: 0, max: 30, step: 0.5, unit: "°",
                defaultValue: GEOMETRY.restYaw,
            },
            push: {
                type: ControlType.Number, title: "Push",
                min: 0, max: 500, step: 5,
                defaultValue: GEOMETRY.push,
            },
            bump: {
                type: ControlType.Number, title: "Bump",
                min: 0, max: 400, step: 5,
                defaultValue: GEOMETRY.bump,
            },
            lean: {
                type: ControlType.Number, title: "Lean",
                min: 0, max: 10, step: 0.25, unit: "°",
                defaultValue: GEOMETRY.lean,
            },
        },
    },

    motion: {
        type: ControlType.Object,
        title: "Motion",
        defaultValue: MOTION,
        controls: {
            duration: {
                type: ControlType.Number, title: "Duration",
                min: 200, max: 2400, step: 20, unit: "ms",
                defaultValue: MOTION.duration,
            },
            flipFrom: {
                type: ControlType.Number, title: "Turn from",
                min: 0, max: 0.5, step: 0.01,
                defaultValue: MOTION.flipFrom,
            },
            flipTo: {
                type: ControlType.Number, title: "Turn to",
                min: 0.5, max: 1, step: 0.01,
                defaultValue: MOTION.flipTo,
                description: "Narrow the span for a snappier turn",
            },
        },
    },

    deal: {
        type: ControlType.Object,
        title: "Resting angles",
        defaultValue: DEAL,
        controls: {
            alternate: {
                type: ControlType.Boolean, title: "Alternate",
                defaultValue: DEAL.alternate,
                description: "Lean right, left, right…",
            },
            tiltMin: {
                type: ControlType.Number, title: "Min",
                min: 0, max: 20, step: 0.5, unit: "°",
                defaultValue: DEAL.tiltMin,
            },
            tiltMax: {
                type: ControlType.Number, title: "Max",
                min: 0, max: 25, step: 0.5, unit: "°",
                defaultValue: DEAL.tiltMax,
            },
            seed: {
                type: ControlType.Number, title: "Seed",
                min: 1, max: 99999999, step: 1, displayStepper: false,
                defaultValue: DEAL.seed,
                description: "Change it to re-deal",
            },
        },
    },
})
