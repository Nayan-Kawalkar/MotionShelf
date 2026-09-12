import { useEffect, useRef } from "react"

/**
 * PAINT SPREAD WORDMARK
 *
 * Blueprint letterforms that flood with wet paint under the cursor.
 * Ink bleeds outward behind the pointer, the wet zone travels with it,
 * and everything left behind dries oldest-first in three stages.
 */

interface Props {
    text: string
    fontFamily: string
    fontWeight: number
    sizeMode: "fit" | "fixed"
    fontSize: number
    fitWidth: number
    align: "left" | "center" | "right"
    tracking: number
    loadGoogleFont: boolean
    background: string
    lineColor: string
    paintColor: string
    wetColor: string
    accent: string
    showMarks: boolean
    showRuler: boolean
    outlineWidth: number
    brush: number
    flow: number
    dry: number
    rate: number
    inkStyle: "bleed" | "flood" | "dry" | "spray" | "scribble"
    wetZone: number
    smoothing: number
    edgeWobble: number
    dripChance: number
    wetOpacity: number
    stainOpacity: number
    trigger: "hover" | "press"
    showCursor: boolean
    cursorSize: number
    seedOnLoad: boolean
    autoDemo: boolean
    demoSpeed: number
    quality: "low" | "medium" | "high"
    style?: React.CSSProperties
}

type Stamp = {
    x: number
    y: number
    r0: number
    r1: number
    seed: number
    born: number
    pause: number
    dur: number
    ey: number
    dy: number
    gx: number
    gy: number
    jit: number
    ang: number
    dir: number
}


/* @controls:start */
const DEFAULTS: Props = {
    text: "HERON AI",
    fontFamily: "Archivo",
    fontWeight: 600,
    sizeMode: "fit",
    fontSize: 120,
    fitWidth: 89,
    align: "center",
    tracking: 0.055,
    loadGoogleFont: true,
    background: "#EFEDE6",
    lineColor: "#2A2A26",
    paintColor: "#1E1E1B",
    wetColor: "#B6B3A8",
    accent: "#E8471C",
    showMarks: true,
    showRuler: true,
    outlineWidth: 1.05,
    brush: 30,
    flow: 58,
    dry: 26,
    rate: 34,
    inkStyle: "bleed",
    wetZone: 2.6,
    smoothing: 45,
    edgeWobble: 45,
    dripChance: 28,
    wetOpacity: 50,
    stainOpacity: 34,
    trigger: "hover",
    showCursor: true,
    cursorSize: 9,
    seedOnLoad: true,
    autoDemo: false,
    demoSpeed: 100,
    quality: "high",
}
/* @controls:end */

export default function PaintSpreadWordmark(incoming: Partial<Props>) {
    const given: any = {}
    for (const k in incoming) {
        const v = (incoming as any)[k]
        if (v !== undefined) given[k] = v
    }
    const props: Props = { ...DEFAULTS, ...given }

    const {
        text,
        fontFamily,
        fontWeight,
        tracking,
        loadGoogleFont,
        background,
        lineColor,
        paintColor,
        wetColor,
        accent,
        sizeMode,
        fontSize,
        fitWidth,
        align,
        showMarks,
        showRuler,
        outlineWidth,
        showCursor,
        seedOnLoad,
        autoDemo,
        quality,
        wetOpacity,
        stainOpacity,
        style,
    } = props

    const host = useRef<HTMLDivElement>(null)
    const draftRef = useRef<HTMLCanvasElement>(null)
    const greyRef = useRef<HTMLCanvasElement>(null)
    const dryRef = useRef<HTMLCanvasElement>(null)
    const paintRef = useRef<HTMLCanvasElement>(null)
    const overRef = useRef<HTMLCanvasElement>(null)

    // live values the loop reads every frame, so dragging a slider never
    // resets the paint that is already on the letters
    const live = useRef(props)
    live.current = props

    /* ---------- webfont ---------- */
    useEffect(() => {
        if (!loadGoogleFont) return
        const family = fontFamily.split(",")[0].trim().replace(/["']/g, "")
        const id = "psw-font-" + family.replace(/\s+/g, "-").toLowerCase()
        if (document.getElementById(id)) return
        const link = document.createElement("link")
        link.id = id
        link.rel = "stylesheet"
        link.href =
            "https://fonts.googleapis.com/css2?family=" +
            encodeURIComponent(family).replace(/%20/g, "+") +
            ":wght@300;400;500;600;700;800&display=swap"
        document.head.appendChild(link)
    }, [loadGoogleFont, fontFamily])

    /* ---------- the whole effect ---------- */
    useEffect(() => {
        const el = host.current
        const cDraft = draftRef.current
        const cGrey = greyRef.current
        const cDry = dryRef.current
        const cPaint = paintRef.current
        const cOver = overRef.current
        if (!el || !cDraft || !cGrey || !cDry || !cPaint || !cOver) return

        const xDraft = cDraft.getContext("2d")!
        const xGrey = cGrey.getContext("2d")!
        const xDry = cDry.getContext("2d")!
        const xPaint = cPaint.getContext("2d")!
        const xOver = cOver.getContext("2d")!

        // union masks — every live stamp is filled opaque into these, so
        // overlapping blobs never seam; colour is applied once, to the union
        const maskP = document.createElement("canvas")
        const maskG = document.createElement("canvas")
        const maskD = document.createElement("canvas")
        const glyph = document.createElement("canvas")
        const xMP = maskP.getContext("2d")!
        const xMG = maskG.getContext("2d")!
        const xMD = maskD.getContext("2d")!
        const xGL = glyph.getContext("2d")!

        const isStatic =
            false
        const reduce =
            typeof matchMedia === "function" &&
            matchMedia("(prefers-reduced-motion: reduce)").matches

        let W = 0,
            H = 0,
            DPR = 1,
            fs = 100,
            baseline = 0
        let glyphs: {
            ch: string
            x: number
            left: number
            right: number
            top: number
            bottom: number
        }[] = []
        let stamps: Stamp[] = []
        let last: { x: number; y: number } | null = null
        let target: { x: number; y: number } | null = null   // raw pointer
        let pointer: { x: number; y: number } | null = null  // smoothed tip
        let inside = false
        let lastMoveAt = 0,
            lastEmit = 0,
            prevT = 0
        let raf = 0
        let alive = true
        let pressed = false
        let demoT = 0

        const Q = live.current.quality
        const DPR_CAP = Q === "low" ? 1 : Q === "medium" ? 1.5 : 2
        const MAX_STAMPS = Q === "low" ? 240 : Q === "medium" ? 380 : 520

        const fontOf = (size: number) => {
            const raw = (live.current.fontFamily || "sans-serif").trim()
            const fam = raw.includes(",") || /^["']/.test(raw) ? raw : `"${raw}"`
            return `${live.current.fontWeight} ${size}px ${fam}, "Helvetica Neue", Arial, sans-serif`
        }

        /* ---------- deterministic wobble ---------- */
        const rnd = (seed: number) => {
            const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453
            return v - Math.floor(v)
        }

        function blobPath(
            ctx: CanvasRenderingContext2D,
            cx: number,
            cy: number,
            rx: number,
            ry: number,
            seed: number,
            wob: number
        ) {
            const n = 13
            const pts: [number, number][] = []
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2
                const k = 1 + (rnd(seed + i * 3.37) - 0.42) * wob
                const k2 = 1 + (rnd(seed + i * 7.11) - 0.5) * wob * 0.55
                pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * k2])
            }
            ctx.beginPath()
            ctx.moveTo(pts[0][0], pts[0][1])
            for (let i = 0; i < n; i++) {
                const p0 = pts[(i - 1 + n) % n]
                const p1 = pts[i]
                const p2 = pts[(i + 1) % n]
                const p3 = pts[(i + 2) % n]
                ctx.bezierCurveTo(
                    p1[0] + (p2[0] - p0[0]) / 6,
                    p1[1] + (p2[1] - p0[1]) / 6,
                    p2[0] - (p3[0] - p1[0]) / 6,
                    p2[1] - (p3[1] - p1[1]) / 6,
                    p2[0],
                    p2[1]
                )
            }
            ctx.closePath()
        }

        /* One mark, drawn five ways. Every style fills white into a union mask,
           so overlaps never seam and the colour is applied once at the end. */
        function drawShape(
            ctx: CanvasRenderingContext2D,
            s: Stamp,
            cx: number,
            cy: number,
            rx: number,
            ry: number,
            wob: number,
            seedOff: number
        ) {
            if (rx <= 0.3 || ry <= 0.3) return
            const seed = s.seed + seedOff
            switch (live.current.inkStyle) {
                // smooth, high surface tension — a pool rather than a blot
                case "flood":
                    blobPath(ctx, cx, cy, rx, ry, seed, wob * 0.3)
                    ctx.fill()
                    break

                // broken streaks raked along the direction of travel
                case "dry": {
                    const n = 5
                    ctx.save()
                    ctx.translate(cx, cy)
                    ctx.rotate(s.dir)
                    for (let i = 0; i < n; i++) {
                        if (rnd(seed + i * 11.3) > 0.8) continue // gaps in the bristle
                        const t = i / (n - 1) - 0.5
                        const off = t * ry * 1.9
                        const len = rx * (0.7 + rnd(seed + i * 5.1) * 0.8)
                        const th = ry * (0.08 + rnd(seed + i * 3.7) * 0.15)
                        blobPath(
                            ctx,
                            (rnd(seed + i * 2.3) - 0.5) * rx * 0.5,
                            off,
                            len,
                            th,
                            seed + i * 13.1,
                            wob * 1.3
                        )
                        ctx.fill()
                    }
                    ctx.restore()
                    break
                }

                // airbrush speckle, denser at the centre
                case "spray": {
                    const n = Math.max(4, Math.min(28, Math.round(rx * 0.6)))
                    const squash = ry / rx
                    for (let i = 0; i < n; i++) {
                        const a = rnd(seed + i * 2.1) * Math.PI * 2
                        const rr = Math.pow(rnd(seed + i * 4.7), 0.62) * rx * 1.15
                        const dr = Math.max(0.6, rx * (0.05 + rnd(seed + i * 9.3) * 0.13))
                        ctx.beginPath()
                        ctx.arc(
                            cx + Math.cos(a) * rr,
                            cy + Math.sin(a) * rr * squash,
                            dr,
                            0,
                            Math.PI * 2
                        )
                        ctx.fill()
                    }
                    break
                }

                // marker scribble: one thick cross-stroke per mark
                case "scribble": {
                    const a = s.dir + Math.PI / 2 + (rnd(seed) - 0.5) * 1.5
                    ctx.save()
                    ctx.lineCap = "round"
                    ctx.lineJoin = "round"
                    ctx.strokeStyle = ctx.fillStyle as string
                    ctx.lineWidth = Math.max(1, ry * 0.55)
                    ctx.beginPath()
                    ctx.moveTo(cx - Math.cos(a) * rx * 1.35, cy - Math.sin(a) * ry * 1.35)
                    ctx.lineTo(cx + Math.cos(a) * rx * 1.35, cy + Math.sin(a) * ry * 1.35)
                    ctx.stroke()
                    ctx.restore()
                    break
                }

                // wet bleed — the default blot
                default:
                    blobPath(ctx, cx, cy, rx, ry, seed, wob)
                    ctx.fill()
            }
        }

        const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)

        // base edge irregularity; every layer scales off this
        const wobble = () => 0.14 + (live.current.edgeWobble / 100) * 0.36

        /* Dry  -> how long ink stays put before it starts to go (0 = never)
           Rate -> how long the going takes once it starts */
        const holdNow = () => {
            const d = live.current.dry / 100
            return d <= 0 ? Infinity : 380 + Math.pow(1 - d, 1.7) * 8200
        }
        const fadeNow = () => 320 + Math.pow(1 - live.current.rate / 100, 1.6) * 5400

        /* A stamp bleeds outward, sits, then dries in three overlapping stages:
           the damp fringe lifts first, the black core retracts off-centre with a
           crustier edge, and a pale stain outlives both. */
        function geom(s: Stamp, now: number, hold: number, fade: number) {
            const age = now - s.born // bleed clock: always runs
            const dage = age - s.pause // dry clock: frozen in the wet zone
            const p = s.dur <= 0 ? 1 : Math.min(1, age / s.dur)
            const e = reduce ? 1 : easeOut(p)
            const r = s.r0 + (s.r1 - s.r0) * e
            const ry = r * (1 + (s.ey - 1) * e)
            const cy = s.y + s.dy * e

            if (!isFinite(hold))
                return { r, ry, cy, q: 0, gk: 1, kP: 1, kD: 0, ox: 0, oy: 0, dead: false }

            const h = hold * s.jit
            let q = 0
            if (dage > h) q = Math.min(1, (dage - h) / (fade * s.jit))

            const gk =
                dage < h
                    ? Math.min(1, (h - dage) / (h * 0.22))
                    : Math.max(0, 1 - q * 3.2)
            const kP = 1 - Math.pow(q, 0.72) // core: goes early
            const kD = 1 - Math.pow(q, 2.3) // stain: goes last
            const pull = r * 0.16 * q
            return {
                r,
                ry,
                cy,
                q,
                gk,
                kP,
                kD,
                dead: q >= 1,
                ox: Math.cos(s.ang) * pull,
                oy: Math.sin(s.ang) * pull,
            }
        }

        let strokeDir = 0

        function addStamp(x: number, y: number, now: number, dir?: number) {
            const brush = live.current.brush
            const flow = live.current.flow / 100
            const r0 = brush * (0.52 + rnd(x * 0.13 + y * 0.31) * 0.22)
            const st = live.current.inkStyle
            const canDrip = st === "bleed" || st === "flood"
            const drip =
                canDrip &&
                rnd(x * 0.7 + y * 1.9 + now * 0.001) >
                    1 - (live.current.dripChance / 100) * 0.1
            stamps.push({
                x,
                y,
                r0,
                r1: r0 * (1.05 + flow * 0.85),
                seed: (x * 13.7 + y * 7.3 + stamps.length * 3.1) % 1000,
                born: now,
                pause: 0,
                dur: reduce ? 0 : 420 + flow * 520,
                ey: drip ? 1.55 + flow * 0.85 : 1,
                dy: drip ? r0 * (0.45 + flow * 0.75) : 0,
                gx: (rnd(x + 3.1) - 0.5) * brush * 0.2,
                gy: (rnd(y + 8.4) - 0.4) * brush * 0.2,
                jit: 0.86 + rnd(x * 2.7 + y * 5.3) * 0.28, // no two marks dry in lockstep
                ang: rnd(x * 1.9 + y * 0.7) * Math.PI * 2,
                dir: dir === undefined ? strokeDir : dir,
            })
            if (stamps.length > MAX_STAMPS) stamps.shift()
        }

        function strokeTo(x: number, y: number, now: number) {
            if (!last) {
                last = { x, y }
                addStamp(x, y, now)
                return
            }
            const dx = x - last.x,
                dy = y - last.y
            const d = Math.hypot(dx, dy)
            const step = Math.max(4, live.current.brush * 0.32)
            if (d < step) return
            strokeDir = Math.atan2(dy, dx)
            const n = Math.min(20, Math.floor(d / step))
            for (let i = 1; i <= n; i++)
                addStamp(
                    last.x + dx * (i / n),
                    last.y + dy * (i / n),
                    now - (n - i) * 5,
                    strokeDir
                )
            last = { x, y }
        }

        /* ---------- blueprint ---------- */
        function measure() {
            const P = live.current
            const word = P.text || " "
            const tr = P.tracking
            xDraft.setTransform(DPR, 0, 0, DPR, 0, 0)

            const box = W * Math.min(1, Math.max(0.2, P.fitWidth / 100))
            const pad = (W - box) / 2
            if (P.sizeMode === "fixed") {
                fs = Math.max(8, P.fontSize)
            } else {
                xDraft.font = fontOf(100)
                let w100 = 0
                for (const ch of word) w100 += xDraft.measureText(ch).width
                w100 += 100 * tr * (word.length - 1)
                fs = Math.max(8, Math.min(box / (w100 / 100), H * 0.78))
            }

            const track = fs * tr
            xDraft.font = fontOf(fs)
            const widths: number[] = []
            let total = 0
            for (const ch of word) {
                const w = xDraft.measureText(ch).width
                widths.push(w)
                total += w
            }
            total += track * (word.length - 1)

            baseline = H / 2 + xDraft.measureText("H").actualBoundingBoxAscent / 2

            glyphs = []
            let x =
                P.align === "left"
                    ? pad
                    : P.align === "right"
                      ? W - pad - total
                      : (W - total) / 2
            ;[...word].forEach((ch, i) => {
                if (ch !== " ") {
                    const mm = xDraft.measureText(ch)
                    glyphs.push({
                        ch,
                        x,
                        left: x - mm.actualBoundingBoxLeft,
                        right: x + mm.actualBoundingBoxRight,
                        top: baseline - mm.actualBoundingBoxAscent,
                        bottom: baseline + mm.actualBoundingBoxDescent,
                    })
                }
                x += widths[i] + track
            })
        }

        const tick = (
            ctx: CanvasRenderingContext2D,
            x1: number,
            y1: number,
            x2: number,
            y2: number
        ) => {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
        }

        function drawDraft() {
            const P = live.current
            xDraft.setTransform(DPR, 0, 0, DPR, 0, 0)
            xDraft.clearRect(0, 0, W, H)
            xDraft.font = fontOf(fs)
            xDraft.textBaseline = "alphabetic"

            if (P.showMarks) {
                const u = Math.max(6, fs * 0.075)
                const off = Math.max(4, fs * 0.045)
                xDraft.strokeStyle = P.lineColor
                xDraft.lineWidth = 0.9
                xDraft.globalAlpha = 0.62
                xDraft.beginPath()
                for (const g of glyphs) {
                    const { left: L, right: R, top: T, bottom: B } = g
                    ;([
                        [L, T, -1, -1],
                        [R, T, 1, -1],
                        [L, B, -1, 1],
                        [R, B, 1, 1],
                    ] as const).forEach(([px, py, sx, sy]) => {
                        tick(xDraft, px, py - sy * off, px, py - sy * (off + u))
                        tick(xDraft, px - sx * off, py, px - sx * (off + u), py)
                    })
                    const my = (T + B) / 2,
                        mx = (L + R) / 2
                    tick(xDraft, L - off, my, L - off - u * 0.7, my)
                    tick(xDraft, R + off, my, R + off + u * 0.7, my)
                    tick(xDraft, mx, T - off, mx, T - off - u * 0.7)
                    tick(xDraft, mx, B + off, mx, B + off + u * 0.7)
                    if ("ORQ0".includes(g.ch)) {
                        tick(xDraft, mx - u * 0.34, my, mx + u * 0.34, my)
                        tick(xDraft, mx, my - u * 0.34, mx, my + u * 0.34)
                    }
                }
                xDraft.stroke()
            }

            // outline letters, doubled faintly for a reprographic wobble
            xDraft.lineJoin = "round"
            xDraft.strokeStyle = P.lineColor
            xDraft.lineWidth = P.outlineWidth
            xDraft.globalAlpha = 0.92
            for (const g of glyphs) xDraft.strokeText(g.ch, g.x, baseline)
            xDraft.globalAlpha = 0.28
            xDraft.lineWidth = P.outlineWidth * 0.67
            for (const g of glyphs) xDraft.strokeText(g.ch, g.x + 0.55, baseline + 0.45)
            xDraft.globalAlpha = 1

            if (P.showRuler) {
                xDraft.strokeStyle = P.lineColor
                xDraft.globalAlpha = 0.34
                xDraft.lineWidth = 0.8
                xDraft.beginPath()
                const y0 = H - 6
                for (let x = 0; x <= W; x += 7)
                    tick(xDraft, x, y0, x, y0 - (Math.round(x / 7) % 10 === 0 ? 6 : 3))
                xDraft.stroke()
                xDraft.globalAlpha = 1
            }

            xGL.setTransform(DPR, 0, 0, DPR, 0, 0)
            xGL.clearRect(0, 0, W, H)
            xGL.font = fontOf(fs)
            xGL.textBaseline = "alphabetic"
            xGL.fillStyle = "#000"
            for (const g of glyphs) xGL.fillText(g.ch, g.x, baseline)
        }

        /* ---------- frame ---------- */
        function tintTo(
            ctx: CanvasRenderingContext2D,
            mask: HTMLCanvasElement,
            color: string
        ) {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.globalCompositeOperation = "source-over"
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.drawImage(mask, 0, 0)
            ctx.globalCompositeOperation = "source-in"
            ctx.fillStyle = color
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
            ctx.globalCompositeOperation = "destination-in"
            ctx.drawImage(glyph, 0, 0) // ink can only live inside the letters
            ctx.globalCompositeOperation = "source-over"
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
        }

        function frame(now: number) {
            const P = live.current
            const hold = holdNow(),
                fade = fadeNow()
            const dt = Math.min(64, now - (prevT || now))
            prevT = now

            /* Nobody at the controls: trace the word by itself so touch
               devices and first impressions still show the effect. */
            if (P.autoDemo && !inside && glyphs.length) {
                demoT += (dt / 1000) * (P.demoSpeed / 100) * 0.55
                const a = glyphs[0],
                    z = glyphs[glyphs.length - 1]
                const x0 = a.left,
                    x1 = z.right
                const u = 0.5 - 0.5 * Math.cos(demoT)
                target = {
                    x: x0 + (x1 - x0) * u,
                    y: H / 2 + Math.sin(demoT * 2.3) * fs * 0.22,
                }
                if (!pointer) pointer = { x: target.x, y: target.y }
            }

            const painting = P.trigger === "press" ? pressed : true
            const engaged = (inside && painting) || (P.autoDemo && !inside)

            /* The tip chases the raw pointer on an exponential ease, and every
               mark is laid from the tip — so the stroke stays smooth whatever
               rate the pointer events arrive at. */
            if (engaged && target) {
                if (!pointer) pointer = { x: target.x, y: target.y }
                const tau = 1 + (P.smoothing / 100) * 190
                const k = 1 - Math.exp(-dt / tau)
                pointer.x += (target.x - pointer.x) * k
                pointer.y += (target.y - pointer.y) * k
                strokeTo(pointer.x, pointer.y, now)
            }

            // resting the cursor keeps feeding paint: the longer the dwell,
            // the wider the pool creeps out from under it
            const settled =
                !target || !pointer
                    ? false
                    : Math.hypot(target.x - pointer.x, target.y - pointer.y) < 1.5
            if (engaged && pointer && settled && now - lastMoveAt > 80 && now - lastEmit > 90) {
                const d = Math.min(1, (now - lastMoveAt) / 2600)
                const spread = P.brush * (0.22 + d * 0.95)
                const a = rnd(now * 0.0007) * Math.PI * 2
                const rr = Math.sqrt(rnd(now * 0.0013)) * spread
                addStamp(pointer.x + Math.cos(a) * rr, pointer.y + Math.sin(a) * rr, now)
                lastEmit = now
            }

            const wetR = P.brush * P.wetZone
            const wob = wobble()
            ;[
                [xMP, maskP],
                [xMG, maskG],
                [xMD, maskD],
            ].forEach(([c, cv]: any) => {
                c.setTransform(1, 0, 0, 1, 0, 0)
                c.clearRect(0, 0, cv.width, cv.height)
                c.setTransform(DPR, 0, 0, DPR, 0, 0)
                c.fillStyle = "#fff"
            })

            const keep: Stamp[] = []
            for (let i = 0; i < stamps.length; i++) {
                const s = stamps[i]

                // the wet zone travels with the cursor: marks inside it hold
                // their dry clock, and one already going re-wets when passed over
                if (engaged && pointer) {
                    const dx = s.x - pointer.x,
                        dy = s.y - pointer.y
                    const d2 = dx * dx + dy * dy
                    if (d2 < wetR * wetR) {
                        const k = 1 - d2 / (wetR * wetR)
                        s.pause = Math.min(now - s.born, s.pause + dt * k * 1.6)
                    }
                }

                const g = geom(s, now, hold, fade)
                if (g.dead) continue // oldest reach this first
                keep.push(s)

                if (g.gk > 0.02)
                    drawShape(
                        xMG,
                        s,
                        s.x + s.gx,
                        g.cy + s.gy,
                        g.r * 1.13 * g.gk,
                        g.ry * 1.11 * g.gk,
                        wob * 1.45,
                        41.3
                    )
                if (g.q > 0.01 && g.kD > 0.02)
                    drawShape(
                        xMD,
                        s,
                        s.x + g.ox,
                        g.cy + g.oy,
                        g.r * g.kD,
                        g.ry * g.kD,
                        wob + g.q * 0.3,
                        9.7
                    )
                if (g.r * g.kP > 0.4)
                    drawShape(
                        xMP,
                        s,
                        s.x + g.ox,
                        g.cy + g.oy,
                        g.r * g.kP,
                        g.ry * g.kP,
                        wob + g.q * 0.55,
                        0
                    )
            }
            stamps = keep

            tintTo(xGrey, maskG, P.wetColor)
            tintTo(xDry, maskD, P.paintColor)
            tintTo(xPaint, maskP, P.paintColor)

            xOver.setTransform(DPR, 0, 0, DPR, 0, 0)
            xOver.clearRect(0, 0, W, H)
            if (P.showCursor && pointer && (inside || (P.autoDemo && engaged))) {
                const cs = P.cursorSize
                xOver.fillStyle = P.accent
                xOver.fillRect(pointer.x - cs / 2, pointer.y - cs / 2, cs, cs)
            }

            if (alive && !isStatic) raf = requestAnimationFrame(frame)
        }

        /* ---------- opening state ---------- */
        function seed() {
            stamps = []
            if (!live.current.seedOnLoad || glyphs.length < 5) return
            const a = glyphs[3],
                b = glyphs[4]
            const y = (a.top + a.bottom) / 2
            const now = performance.now()
            const x0 = a.left + (a.right - a.left) * 0.35
            const x1 = b.right - (b.right - b.left) * 0.1
            const n = 24
            for (let i = 0; i <= n; i++) {
                const t = i / n
                addStamp(x0 + (x1 - x0) * t, y + Math.sin(t * 4.1) * fs * 0.16, now - 900 + t * 760)
            }
        }

        function resize() {
            const r = el!.getBoundingClientRect()
            W = Math.max(1, Math.round(r.width))
            H = Math.max(1, Math.round(r.height))
            DPR = Math.min(DPR_CAP, window.devicePixelRatio || 1)
            ;[cDraft, cGrey, cDry, cPaint, cOver, maskP, maskG, maskD, glyph].forEach(c => {
                c.width = W * DPR
                c.height = H * DPR
            })
            ;[xGrey, xDry, xPaint, xOver, xMP, xMG, xMD, xGL].forEach(c =>
                c.setTransform(DPR, 0, 0, DPR, 0, 0)
            )
            measure()
            drawDraft()
            seed()
            if (isStatic) frame(performance.now())
        }

        /* ---------- input ---------- */
        const localPt = (e: PointerEvent) => {
            const r = el!.getBoundingClientRect()
            return { x: e.clientX - r.left, y: e.clientY - r.top }
        }
        const onEnter = (e: PointerEvent) => {
            inside = true
            last = null
            target = localPt(e)
            pointer = { x: target.x, y: target.y } // no lerp in from the last exit
            lastMoveAt = performance.now()
        }
        const onLeave = () => {
            inside = false
            pressed = false
            last = null
            if (!live.current.autoDemo) target = null
        }
        const onMove = (e: PointerEvent) => {
            const p = localPt(e)
            if (!target || Math.hypot(p.x - target.x, p.y - target.y) > 0.6)
                lastMoveAt = performance.now()
            target = p
            inside = true
        }
        const onDown = (e: PointerEvent) => {
            pressed = true
            last = null
            target = localPt(e)
            if (live.current.trigger === "press") pointer = { x: target.x, y: target.y }
            lastMoveAt = performance.now()
            try {
                el!.setPointerCapture(e.pointerId)
            } catch {}
        }
        const onUp = () => {
            pressed = false
            last = null
        }

        if (!isStatic) {
            el.addEventListener("pointerenter", onEnter)
            el.addEventListener("pointerleave", onLeave)
            el.addEventListener("pointermove", onMove)
            el.addEventListener("pointerdown", onDown)
            el.addEventListener("pointerup", onUp)
            el.addEventListener("pointercancel", onUp)
        }

        const ro = new ResizeObserver(() => resize())
        ro.observe(el)

        const start = () => {
            if (!alive) return
            resize()
            if (!isStatic) raf = requestAnimationFrame(frame)
        }

        const family = live.current.fontFamily.split(",")[0].trim().replace(/["']/g, "")
        if (document.fonts && (document.fonts as any).load) {
            ;(document.fonts as any)
                .load(`${live.current.fontWeight} 100px "${family}"`)
                .catch(() => {})
                .then(() => document.fonts.ready)
                .then(start)
                .catch(start)
        } else {
            start()
        }

        return () => {
            alive = false
            cancelAnimationFrame(raf)
            ro.disconnect()
            el.removeEventListener("pointerenter", onEnter)
            el.removeEventListener("pointerleave", onLeave)
            el.removeEventListener("pointermove", onMove)
            el.removeEventListener("pointerdown", onDown)
            el.removeEventListener("pointerup", onUp)
            el.removeEventListener("pointercancel", onUp)
        }
    }, [
        text,
        fontFamily,
        fontWeight,
        sizeMode,
        fontSize,
        fitWidth,
        align,
        tracking,
        outlineWidth,
        quality,
        autoDemo,
        lineColor,
        paintColor,
        wetColor,
        accent,
        showMarks,
        showRuler,
        seedOnLoad,
    ])

    const layer: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        pointerEvents: "none",
    }

    return (
        <div
            ref={host}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                cursor: showCursor ? "none" : "crosshair",
                touchAction: "none",
                userSelect: "none",
                ...style,
            }}
        >
            <canvas ref={draftRef} style={layer} />
            <canvas ref={greyRef} style={{ ...layer, opacity: wetOpacity / 100 }} />
            <canvas ref={dryRef} style={{ ...layer, opacity: stainOpacity / 100 }} />
            <canvas ref={paintRef} style={layer} />
            <canvas ref={overRef} style={layer} />
        </div>
    )
}

PaintSpreadWordmark.defaultProps = DEFAULTS
