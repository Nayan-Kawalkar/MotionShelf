import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react"

/**
 * CURVED CARD MARQUEE
 *
 * A card river bent along a real curve. Every card is placed on a
 * mathematical path (arc / valley / wave / tilt / cross), so it rises,
 * rotates, scales and fades according to where it sits across the frame.
 *
 * Two motion modes, for the two ways this section gets used:
 *
 *   TICKER  — for a page with other sections. The cards loop continuously on
 *             their own, page scroll gives them a push (faster the faster you
 *             scroll, backwards if you scroll up), and you can grab and flick
 *             them by hand. The section scrolls past like any other section:
 *             nothing is pinned, nothing waits.
 *
 *   PINNED  — for a section that owns the screen. It sticks to the viewport
 *             while page scroll runs the cards sideways — endlessly looping,
 *             so there is no first or last card — then releases the page once
 *             the section's scroll length is used up. Drag nudges within it.
 *             Set "Travels: Whole deck" if it should instead stop at the end.
 *
 * CONTAINER HEIGHT
 *   Ticker  — give the container the height you want the band to be
 *             (e.g. 480–720px, or 70vh). Width 100%.
 *   Pinned  — let the container's height be auto. The component builds its own
 *             tall scroll length ("Pin scroll" screens) and sticks a
 *             viewport-tall pane inside it. A fixed frame height clips that
 *             spacer and nothing will pin. No ancestor may have overflow
 *             hidden, or position:sticky is dead.
 */
export default function CurvedCardMarquee(props) {
    const {
        cards = DEFAULTS.cards,

        /* motion */
        mode = DEFAULTS.mode,
        tickerSpeed = DEFAULTS.tickerSpeed,
        tickerReverse = DEFAULTS.tickerReverse,
        scrollBoost = DEFAULTS.scrollBoost,
        pauseOnHover = DEFAULTS.pauseOnHover,
        pinTravel = DEFAULTS.pinTravel,
        pinScroll = DEFAULTS.pinScroll,
        pinLoops = DEFAULTS.pinLoops,
        pinPace = DEFAULTS.pinPace,
        dragRange = DEFAULTS.dragRange,
        dragReturn = DEFAULTS.dragReturn,
        dragToScroll = DEFAULTS.dragToScroll,
        smoothing = DEFAULTS.smoothing,

        /* layout */
        rowCount = DEFAULTS.rowCount,
        curve = DEFAULTS.curve,
        curveAmount = DEFAULTS.curveAmount,
        crossReach = DEFAULTS.crossReach,
        tiltAmount = DEFAULTS.tiltAmount,
        rowSpacing = DEFAULTS.rowSpacing,
        rowOffset = DEFAULTS.rowOffset,
        invertRow2 = DEFAULTS.invertRow2,

        /* size */
        sizing = DEFAULTS.sizing,
        cardsPerView = DEFAULTS.cardsPerView,
        cardAspect = DEFAULTS.cardAspect,
        minCardWidth = DEFAULTS.minCardWidth,
        maxCardWidth = DEFAULTS.maxCardWidth,
        scaleText = DEFAULTS.scaleText,
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        cardRadius = DEFAULTS.cardRadius,
        cardGap = DEFAULTS.cardGap,
        mediaRatio = DEFAULTS.mediaRatio,
        titleSize = DEFAULTS.titleSize,
        titleLines = DEFAULTS.titleLines,

        /* depth */
        depthScale = DEFAULTS.depthScale,
        centerBoost = DEFAULTS.centerBoost,
        edgeFade = DEFAULTS.edgeFade,
        focusColor = DEFAULTS.focusColor,
        baseGrayscale = DEFAULTS.baseGrayscale,

        /* look */
        theme = DEFAULTS.theme,
        bgColor = DEFAULTS.bgColor,
        cardBg = DEFAULTS.cardBg,
        cardBorder = DEFAULTS.cardBorder,
        accentColor = DEFAULTS.accentColor,
        textMain = DEFAULTS.textMain,
        textMuted = DEFAULTS.textMuted,
        transparentBg = DEFAULTS.transparentBg,
        showMeta = DEFAULTS.showMeta,
        showIndex = DEFAULTS.showIndex,
        edgeMask = DEFAULTS.edgeMask,
        spotlight = DEFAULTS.spotlight,
        glowOrbs = DEFAULTS.glowOrbs,
        guideLine = DEFAULTS.guideLine,
        showProgress = DEFAULTS.showProgress,

        style,
    } = props

    /* ---------------------------- mode -------------------------------- */
    const isTicker = mode !== "Pinned"
    // a ticker is endless by nature; a pinned section loops endlessly too
    // unless it is set to walk once through the deck and stop at the last card
    const isLoop = isTicker || pinTravel !== "Deck"

    const list = cards && cards.length ? cards : DEFAULT_CARDS
    const rows = Math.max(1, Math.min(3, Math.round(rowCount)))
    const isCross = curve === "Cross"
    const isCanvas = false

    /* ---------------------------- theme ------------------------------- */
    const c = useMemo(
        () =>
            theme === "Custom"
                ? {
                      bg: bgColor,
                      card: cardBg,
                      border: cardBorder,
                      accent: accentColor,
                      text: textMain,
                      muted: textMuted,
                  }
                : THEMES[theme] || THEMES.Emerald,
        [theme, bgColor, cardBg, cardBorder, accentColor, textMain, textMuted]
    )

    const uid = useMemo(
        () => "ccm" + Math.random().toString(36).slice(2, 8),
        []
    )

    /* ---------------------------- refs -------------------------------- */
    const pinRef = useRef<HTMLDivElement>(null) // tall spacer (pinned only)
    const paneRef = useRef<HTMLDivElement>(null) // the visible pane
    const stageRef = useRef<HTMLDivElement>(null)
    const rowRefs = useRef<any[]>([])
    const spotRef = useRef<HTMLDivElement>(null)
    const barRef = useRef<HTMLDivElement>(null)
    const maskState = useRef(-1)

    const currentX = useRef(0) // what is drawn
    const boost = useRef(0) // ticker: push from page scroll
    const flick = useRef(0) // ticker: momentum left by a drag
    const speedNow = useRef(0) // ticker: eased base speed
    const scrollBase = useRef(0) // pinned: position the page asks for
    const dragOffset = useRef(0) // pinned: how far the hand pulled it
    const dragging = useRef(false)
    const hovering = useRef(false)
    const onScreen = useRef(true)
    const lastDrawn = useRef(NaN)
    const settling = useRef(true)
    const geom = useRef({ vw: 1, setW: 1, maxScroll: 0, travel: 0 })

    /* ------------- the frame's own size drives the card size ---------- */
    const [box, setBox] = useState({ w: 1200, h: 720 })
    const [travel, setTravel] = useState(0)

    useLayoutEffect(() => {
        const el = paneRef.current
        if (!el) return
        const read = () => {
            const w = el.clientWidth || 1
            const h = el.clientHeight || 1
            setBox((b) =>
                Math.abs(b.w - w) > 1 || Math.abs(b.h - h) > 1 ? { w, h } : b
            )
        }
        read()
        const ro = new ResizeObserver(read)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const fit = useMemo(() => {
        const cl = (v, a, b) => (v < a ? a : v > b ? b : v)
        const cross = curve === "Cross"

        if (sizing === "Fixed") {
            return {
                cw: cardWidth,
                ch: cardHeight,
                gap: cross ? Math.round(cardGap * 1.6) : cardGap,
                rowGap: cross ? 0 : rowSpacing,
                curveA: cross ? 0 : curveAmount,
                crossA: cross
                    ? Math.min(
                          Math.max(0, (box.h - cardHeight) / 2) * crossReach,
                          box.w * 0.38
                      )
                    : 0,
                fs: scaleText ? cl(cardWidth / 220, 0.7, 1.8) : 1,
            }
        }

        const vScale = cl(box.h / 720, 0.55, 1.7)
        const curveA = cross ? 0 : curveAmount * vScale
        const rowGap = cross ? 0 : Math.round(rowSpacing * vScale)

        // width: how many cards should be in view, floored by a minimum
        let gap = cardGap
        const per = cl(
            Math.min(cardsPerView, box.w / (minCardWidth + gap)),
            1.05,
            12
        )
        let cw = cl(box.w / per - gap, 80, maxCardWidth)
        gap = Math.round(cl(cardGap * (cw / 220), 6, cardGap * 2))
        if (cross) gap = Math.round(gap * 1.6)
        cw = cl(box.w / per - gap, 80, maxCardWidth)

        let ch = cw / cl(cardAspect, 0.35, 2.2)

        // height: the rows must never spill out of the frame
        const availH = Math.max(
            120,
            cross ? box.h - 24 : box.h - (curveA + 28) - rowGap * (rows - 1)
        )
        const maxH = cross
            ? availH * (rows === 1 ? 0.38 : rows === 2 ? 0.32 : 0.24)
            : availH / rows
        if (ch > maxH) {
            ch = maxH
            cw = ch * cl(cardAspect, 0.35, 2.2)
            gap = Math.round(cl(cardGap * (cw / 220), 6, cardGap * 2))
            if (cross) gap = Math.round(gap * 1.6)
        }

        return {
            cw: Math.round(cw),
            ch: Math.round(ch),
            gap,
            rowGap,
            curveA,
            crossA: cross
                ? Math.min(
                      Math.max(0, (box.h - ch) / 2) * cl(crossReach, 0.1, 1.4),
                      box.w * 0.38
                  )
                : 0,
            fs: scaleText ? cl(cw / 220, 0.7, 1.8) : 1,
        }
    }, [
        sizing,
        curve,
        crossReach,
        box.w,
        box.h,
        cardsPerView,
        cardAspect,
        minCardWidth,
        maxCardWidth,
        cardWidth,
        cardHeight,
        cardGap,
        rowSpacing,
        curveAmount,
        rows,
        scaleText,
    ])

    const { cw, ch, gap, rowGap, curveA, crossA, fs } = fit

    // Only build as many repeats of the set as the frame can actually show.
    // Four was always enough but usually two or three too many, and every
    // extra copy is real DOM that the loop has to walk.
    const REPEAT = useMemo(() => {
        if (!isLoop) return 1
        const setBase = Math.max(1, list.length * (cw + gap))
        return Math.max(2, Math.min(4, Math.ceil((box.w * 1.6) / setBase) + 1))
    }, [isLoop, list.length, cw, gap, box.w])

    // a pinned section with nothing to travel would just be a dead spacer
    const pinActive = !isTicker && travel > 8

    useEffect(() => {
        maskState.current = -1
    }, [isTicker, edgeMask, isLoop])

    /* ---- don't burn frames while the section is off screen ----------- */
    useEffect(() => {
        const el = paneRef.current
        if (!el || typeof IntersectionObserver === "undefined") return
        const io = new IntersectionObserver(
            ([e]) => {
                onScreen.current = e.isIntersecting
                settling.current = true
            },
            { rootMargin: "250px 0px" }
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

    /* --------------------- measure the track -------------------------- */
    useLayoutEffect(() => {
        const measure = () => {
            const stage = stageRef.current
            const first = rowRefs.current[0]
            if (!stage || !first || !first.track) return

            const vw = stage.clientWidth || 1
            geom.current.vw = vw
            geom.current.setW = Math.max(
                1,
                (first.track.scrollWidth + gap) / REPEAT
            )

            let maxScroll = 0
            rowRefs.current.forEach((row) => {
                if (!row || !row.wrapper) return
                row.wrapperLeft = row.wrapper.offsetLeft
                row.lefts = row.items.map((el) => (el ? el.offsetLeft : 0))
                row.max = Math.max(
                    0,
                    (row.track ? row.track.scrollWidth : 0) - vw
                )
                if (row.max > maxScroll) maxScroll = row.max
            })
            geom.current.maxScroll = maxScroll

            const t = isLoop
                ? geom.current.setW *
                  (isTicker ? 1 : Math.max(0.1, pinLoops))
                : maxScroll
            geom.current.travel = t
            setTravel((prev) => (Math.abs(prev - t) > 2 ? t : prev))
        }

        measure()
        const ro = new ResizeObserver(measure)
        if (stageRef.current) ro.observe(stageRef.current)
        if (rowRefs.current[0]?.track) ro.observe(rowRefs.current[0].track)
        return () => ro.disconnect()
    }, [list.length, cw, ch, gap, rows, rowGap, isLoop, REPEAT, isTicker, pinLoops])

    /* ------------------------- pointer -------------------------------- */
    useEffect(() => {
        const el = paneRef.current
        if (!el || isCanvas) return

        let lastX = 0

        const down = (e: PointerEvent) => {
            if (!dragToScroll) return
            dragging.current = true
            flick.current = 0
            lastX = e.clientX
            el.setPointerCapture?.(e.pointerId)
            el.style.cursor = "grabbing"
        }

        const move = (e: PointerEvent) => {
            if (!dragging.current) return
            let d = (lastX - e.clientX) * 1.6
            lastX = e.clientX

            if (isTicker) {
                // 1:1 with the hand, and the throw carries on after release
                currentX.current += d
                flick.current = d
            } else {
                // pinned: a bounded nudge that stiffens toward its limit
                const lim = Math.max(
                    120,
                    Math.min(dragRange, geom.current.travel || dragRange)
                )
                const slack =
                    1 - Math.min(1, Math.abs(dragOffset.current) / lim)
                d *= 0.35 + 0.65 * slack
                dragOffset.current = Math.max(
                    -lim,
                    Math.min(lim, dragOffset.current + d)
                )
            }
        }

        const up = (e: PointerEvent) => {
            dragging.current = false
            el.releasePointerCapture?.(e.pointerId)
            el.style.cursor = dragToScroll ? "grab" : "default"
        }

        // cache the pane's box instead of measuring it on every move
        let rect = el.getBoundingClientRect()
        const remeasure = () => (rect = el.getBoundingClientRect())

        const enter = () => {
            hovering.current = true
            settling.current = true
            remeasure()
        }
        const leave = () => {
            hovering.current = false
            settling.current = true
        }

        const spot = (e: PointerEvent) => {
            if (!spotRef.current) return
            spotRef.current.style.transform = `translate3d(${
                e.clientX - rect.left - 300
            }px, ${e.clientY - rect.top - 300}px, 0)`
        }

        window.addEventListener("scroll", remeasure, { passive: true })
        window.addEventListener("resize", remeasure)

        el.addEventListener("pointerdown", down)
        el.addEventListener("pointermove", move)
        el.addEventListener("pointermove", spot)
        el.addEventListener("pointerup", up)
        el.addEventListener("pointercancel", up)
        el.addEventListener("pointerenter", enter)
        el.addEventListener("pointerleave", leave)
        return () => {
            el.removeEventListener("pointerdown", down)
            el.removeEventListener("pointermove", move)
            el.removeEventListener("pointermove", spot)
            el.removeEventListener("pointerup", up)
            el.removeEventListener("pointercancel", up)
            el.removeEventListener("pointerenter", enter)
            el.removeEventListener("pointerleave", leave)
            window.removeEventListener("scroll", remeasure)
            window.removeEventListener("resize", remeasure)
        }
    }, [dragToScroll, isCanvas, isTicker, dragRange])

    /* ------------------------ page scroll ----------------------------- */
    useEffect(() => {
        if (isCanvas) return
        let last = window.scrollY || 0

        const onScroll = () => {
            const y = window.scrollY || 0

            if (isTicker) {
                // scroll speed becomes ticker speed: the harder you scroll
                // the faster it runs, and it runs backwards going up
                const d = y - last
                boost.current = Math.max(
                    -60,
                    Math.min(60, boost.current + d * 0.28 * scrollBoost)
                )
            } else {
                const el = pinRef.current
                if (el) {
                    const vh = window.innerHeight || 1
                    const total = Math.max(1, el.offsetHeight - vh)
                    const p = Math.min(
                        1,
                        Math.max(0, -el.getBoundingClientRect().top / total)
                    )
                    scrollBase.current = p * geom.current.travel
                }
            }
            last = y
        }

        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
        }
    }, [isTicker, isCanvas, scrollBoost, pinActive])

    /* ------------------------ render loop ----------------------------- */
    useEffect(() => {
        let frame = 0
        let prev = 0
        lastDrawn.current = NaN
        settling.current = true
        const mod = (n: number, m: number) => ((n % m) + m) % m
        // Every rate below is written for a 60Hz frame and then corrected by
        // the real frame time, so the motion is identical on a 120Hz screen
        // and simply carries on across a dropped frame instead of stuttering.
        const decay = (k: number, f: number) => Math.pow(k, f)
        const ease = (k: number, f: number) => 1 - Math.pow(1 - k, f)
        const clamp = (v: number, a: number, b: number) =>
            v < a ? a : v > b ? b : v

        const path = (t: number) => {
            const A = curveA
            switch (curve) {
                case "Arc":
                    return -A * (1 - t * t)
                case "Valley":
                    return A * (1 - t * t)
                case "Wave":
                    return -A * Math.cos(t * Math.PI * 1.5)
                case "Tilt":
                    return A * t
                default:
                    return 0
            }
        }

        // Cross: 2 rows → an X, 3 → an X with a level band, 1 → one ribbon
        const crossSign = (ri: number) =>
            rows === 3 ? [-1, 0, 1][ri] : ri % 2 === 0 ? -1 : 1

        const yFix =
            curve === "Arc"
                ? curveA * 0.72
                : curve === "Valley"
                  ? -curveA * 0.72
                  : 0

        const tick = (now: number) => {
            if (!onScreen.current) {
                prev = 0
                frame = requestAnimationFrame(tick)
                return
            }

            // frames per 60Hz frame — 1 at 60fps, 0.5 at 120fps
            const dt = prev ? Math.min(50, Math.max(1, now - prev)) : 16.667
            prev = now
            const f = dt / 16.667

            /* ---------------- advance the position --------------------- */
            if (isTicker) {
                const want =
                    hovering.current && pauseOnHover && !dragging.current
                        ? 0
                        : tickerSpeed * (tickerReverse ? -1 : 1)
                speedNow.current += (want - speedNow.current) * ease(0.06, f)

                boost.current *= decay(0.92, f)
                if (Math.abs(boost.current) < 0.02) boost.current = 0

                if (dragging.current) {
                    flick.current *= decay(0.9, f)
                } else {
                    currentX.current +=
                        (speedNow.current + boost.current + flick.current) * f
                    flick.current *= decay(0.94, f)
                    if (Math.abs(flick.current) < 0.05) flick.current = 0
                }
            } else {
                if (!dragging.current && dragReturn) {
                    dragOffset.current *= decay(0.93, f)
                    if (Math.abs(dragOffset.current) < 0.5)
                        dragOffset.current = 0
                }
                let target = scrollBase.current + dragOffset.current
                if (!isLoop) {
                    const capped = clamp(target, 0, geom.current.maxScroll)
                    // never bank overshoot at an end, or coming back sticks
                    dragOffset.current += capped - target
                    target = capped
                }
                currentX.current +=
                    (target - currentX.current) * ease(smoothing, f)
            }

            /* --------------------- draw the cards ---------------------- */
            // nothing moved and no hover is mid-transition: skip the pass
            if (
                !settling.current &&
                Math.abs(currentX.current - lastDrawn.current) < 0.01
            ) {
                frame = requestAnimationFrame(tick)
                return
            }
            lastDrawn.current = currentX.current
            let busy = false

            const { vw, setW } = geom.current

            rowRefs.current.forEach((row, ri) => {
                if (!row || !row.track) return

                const dir = ri % 2 === 1 && invertRow2 ? -1 : 1
                const raw = currentX.current * dir * row.speed
                const wrapX = isLoop
                    ? mod(raw, setW)
                    : clamp(raw, 0, row.max || 0)

                row.track.style.transform = `translate3d(${-wrapX}px,0,0)`

                const lefts = row.lefts || []
                for (let i = 0; i < row.items.length; i++) {
                    const el = row.items[i]
                    if (!el) continue

                    const x = row.wrapperLeft + lefts[i] - wrapX + cw / 2
                    const t = clamp((x / vw) * 2 - 1, -2, 2)
                    const ta = Math.min(1, Math.abs(t))

                    // A card past this point is fully outside the frame, so
                    // there is nothing to see and nothing worth computing.
                    // The band is wider on the way out than on the way in, so
                    // a card resting on the boundary can't thrash its layer.
                    const at = Math.abs(t)
                    const near = row.lit[i] ? at < 1.55 : at < 1.4
                    if (!near) {
                        if (row.lit[i]) {
                            el.style.willChange = "auto"
                            row.lit[i] = false
                        }
                        continue
                    }
                    // only cards in play get their own compositor layer
                    if (!row.lit[i]) {
                        el.style.willChange = "transform, opacity"
                        row.lit[i] = true
                    }

                    if (typeof row.hover[i] !== "number") row.hover[i] = 0
                    const wantH = row.want[i] || 0
                    row.hover[i] += (wantH - row.hover[i]) * ease(0.18, f)
                    const h = row.hover[i]
                    if (Math.abs(wantH - h) > 0.002) busy = true

                    const sign = isCross ? crossSign(ri) : 0
                    const y = isCross ? crossA * t * sign : path(t) + yFix
                    const slope = isCross
                        ? crossA * sign * (2 / vw)
                        : ((path(t + 0.02) - path(t - 0.02)) / 0.04) * (2 / vw)
                    const lim = isCross ? 45 : 18
                    const rot = clamp(
                        ((Math.atan(slope) * 180) / Math.PI) * tiltAmount,
                        -lim,
                        lim
                    )

                    const scale =
                        1 - depthScale * ta + centerBoost * (1 - ta) + 0.04 * h
                    const op = clamp(1 - edgeFade * ta, 0, 1)

                    const next =
                        `translate3d(0,${(y - 14 * fs * h).toFixed(1)}px,0) ` +
                        `rotate(${rot.toFixed(2)}deg) ` +
                        `scale(${scale.toFixed(3)})`

                    if (next !== row.lastT[i]) {
                        el.style.transform = next
                        row.lastT[i] = next
                    }
                    const opS = op.toFixed(2)
                    if (opS !== row.lastO[i]) {
                        el.style.opacity = opS
                        row.lastO[i] = opS
                    }

                    // Greyscale is a second, permanently-grey copy of the
                    // image fading in and out over the colour one. Animating
                    // opacity is a compositor job; animating `filter` is a
                    // repaint of every card, every frame — that was the lag.
                    const media = row.media[i]
                    if (media) {
                        const g = focusColor
                            ? Math.min(
                                  1,
                                  (baseGrayscale +
                                      ta * (100 - baseGrayscale)) /
                                      100
                              ) *
                              (1 - h)
                            : (baseGrayscale / 100) * (1 - h)
                        const step = Math.round(g * 40) / 40
                        if (step !== row.lastG[i]) {
                            media.style.opacity = String(step)
                            row.lastG[i] = step
                        }
                    }
                }
            })

            settling.current = busy

            /* --------------- edges + progress indicator ---------------- */
            if (!isLoop && edgeMask && stageRef.current) {
                const max = geom.current.maxScroll
                const atStart = currentX.current < 8
                const atEnd = currentX.current > max - 8
                const key = (atStart ? 2 : 0) + (atEnd ? 1 : 0)
                if (key !== maskState.current) {
                    maskState.current = key
                    const g = `linear-gradient(90deg, ${
                        atStart ? "#000 0%" : "transparent 0%, #000 12%"
                    }, ${atEnd ? "#000 100%" : "#000 88%, transparent 100%"})`
                    stageRef.current.style.webkitMaskImage = g
                    stageRef.current.style.maskImage = g
                }
            }

            if (barRef.current) {
                if (isLoop) {
                    const p = mod(currentX.current / (setW * 2), 1)
                    barRef.current.style.transform = `translate3d(${
                        p * 100
                    }%,0,0)`
                } else {
                    const max = geom.current.maxScroll || 1
                    const p = clamp(currentX.current / max, 0, 1)
                    const share = clamp(vw / (vw + max), 0.12, 1)
                    barRef.current.style.width = `${share * 100}%`
                    barRef.current.style.transform = `translate3d(${
                        (p * (1 - share) * 100) / share
                    }%,0,0)`
                }
            }

            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [
        isTicker,
        isLoop,
        tickerSpeed,
        tickerReverse,
        pauseOnHover,
        dragReturn,
        smoothing,
        curve,
        curveA,
        crossA,
        isCross,
        tiltAmount,
        depthScale,
        centerBoost,
        edgeFade,
        focusColor,
        baseGrayscale,
        edgeMask,
        cw,
        fs,
        rows,
        invertRow2,
    ])

    /* --------------------------- markup ------------------------------- */
    const mediaH = Math.round(ch * mediaRatio)

    const buildRow = (ri: number) => {
        const items: any[] = []

        if (isLoop) {
            // repeated sets, each row starting elsewhere so rows never mirror
            const shift = Math.floor((list.length / rows) * ri + rowOffset * ri)
            for (let r = 0; r < REPEAT; r++)
                for (let i = 0; i < list.length; i++) {
                    const src = (i + shift) % list.length
                    items.push({ data: list[src], i: src, key: `${r}-${i}` })
                }
        } else {
            // one pass: deal the cards across the rows so each appears once
            for (let i = ri; i < list.length; i += rows)
                items.push({ data: list[i], i, key: `f-${i}` })
        }

        if (!rowRefs.current[ri])
            rowRefs.current[ri] = {
                items: [],
                media: [],
                lefts: [],
                hover: [],
                want: [],
                lastT: [],
                lastO: [],
                lastG: [],
                lit: [],
                wrapperLeft: 0,
                max: 0,
            }
        const store = rowRefs.current[ri]
        store.speed = isLoop ? 1 + ri * 0.12 : 1

        const wide = isLoop ? "160%" : "100%"

        return (
            <div
                key={ri}
                ref={(el) => (store.wrapper = el)}
                style={
                    isCross
                        ? {
                              position: "absolute",
                              // half-pitch stagger so the ribbons interleave
                              left: isLoop
                                  ? `calc(-30% + ${
                                        (ri % 2) * ((cw + gap) / 2)
                                    }px)`
                                  : 0,
                              width: wide,
                              top: "50%",
                              marginTop: -ch / 2,
                              display: "flex",
                              whiteSpace: "nowrap",
                              zIndex: 2 + ri,
                          }
                        : {
                              position: "relative",
                              width: wide,
                              display: "flex",
                              whiteSpace: "nowrap",
                              marginTop: ri === 0 ? 0 : rowGap,
                              zIndex: 2,
                          }
                }
            >
                <div
                    ref={(el) => (store.track = el)}
                    style={{
                        display: "flex",
                        gap: gap,
                        willChange: "transform",
                    }}
                >
                    {items.map((it, idx) => (
                        <div
                            key={it.key}
                            ref={(el) => (store.items[idx] = el)}
                            onMouseEnter={() => {
                                store.want[idx] = 1
                                settling.current = true
                            }}
                            onMouseLeave={() => {
                                store.want[idx] = 0
                                settling.current = true
                            }}
                            onClick={() => {
                                const url = it.data?.link
                                if (url) window.open(url, "_blank")
                            }}
                            style={{
                                flex: `0 0 ${cw}px`,
                                height: ch,
                            }}
                        >
                            <CardFace
                                data={it.data}
                                n={it.i}
                                mediaRef={(el) => (store.media[idx] = el)}
                                mediaH={mediaH}
                                radius={Math.round(cardRadius * fs)}
                                fs={fs}
                                c={c}
                                showMeta={showMeta}
                                showIndex={showIndex}
                                titleSize={titleSize}
                                titleLines={titleLines}
                                uid={uid}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    rowRefs.current.length = rows

    const pane = (
        <div
            ref={paneRef}
            style={{
                width: "100%",
                height: "100%",
                ...style,
                // pinned: the frame is tall, and this pane is what sticks
                ...(pinActive
                    ? { top: 0, left: 0, width: "100%", height: "100vh" }
                    : null),
                position: pinActive ? ("sticky" as any) : "relative",
                // a ticker set to "Fit" height would otherwise collapse
                ...(pinActive ? null : { minHeight: 200 }),
                overflow: "hidden",
                background: transparentBg ? "transparent" : c.bg,
                color: c.text,
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "pan-y",
                cursor: dragToScroll ? "grab" : "default",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <style>{`
                .${uid}-card:hover { border-color: ${c.accent} !important;
                    box-shadow: 0 24px 50px rgba(0,0,0,.45),
                                0 0 34px -6px ${c.accent}66 !important; }
                @keyframes ${uid}-dash { to { stroke-dashoffset: -400; } }
                @keyframes ${uid}-orbA {
                    0%,100% { transform: translate3d(-12%,-6%,0) scale(1); }
                    50%     { transform: translate3d(8%,6%,0) scale(1.18); } }
                @keyframes ${uid}-orbB {
                    0%,100% { transform: translate3d(10%,8%,0) scale(1.12); }
                    50%     { transform: translate3d(-8%,-8%,0) scale(.92); } }
            `}</style>

            {glowOrbs && (
                <>
                    <div
                        style={{
                            position: "absolute",
                            width: "55%",
                            height: "80%",
                            left: "-5%",
                            borderRadius: "50%",
                            // a radial gradient is already soft; blurring it
                            // only asks the GPU to re-render it every frame
                            background: `radial-gradient(circle, ${c.accent}22 0%, transparent 68%)`,
                            pointerEvents: "none",
                            animation: `${uid}-orbA 18s ease-in-out infinite`,
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            width: "50%",
                            height: "70%",
                            right: "-5%",
                            borderRadius: "50%",
                            background: `radial-gradient(circle, ${c.accent}18 0%, transparent 68%)`,
                            pointerEvents: "none",
                            animation: `${uid}-orbB 22s ease-in-out infinite`,
                        }}
                    />
                </>
            )}

            {spotlight && (
                <div
                    ref={spotRef}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 600,
                        height: 600,
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${c.accent}26 0%, transparent 60%)`,
                        pointerEvents: "none",
                        willChange: "transform",
                        zIndex: 3,
                    }}
                />
            )}

            <div
                ref={stageRef}
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    WebkitMaskImage: edgeMask
                        ? "linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)"
                        : undefined,
                    maskImage: edgeMask
                        ? "linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)"
                        : undefined,
                }}
            >
                {guideLine && (
                    <svg
                        viewBox="0 0 1000 400"
                        preserveAspectRatio="none"
                        style={{
                            position: "absolute",
                            width: "120%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: 1,
                            opacity: 0.35,
                        }}
                    >
                        {(isCross
                            ? rows === 1
                                ? ["M 0 380 L 1000 20"]
                                : ["M 0 380 L 1000 20", "M 0 20 L 1000 380"]
                            : [
                                  curve === "Valley"
                                      ? "M 0 150 Q 500 330 1000 150"
                                      : "M 0 250 Q 500 70 1000 250",
                              ]
                        ).map((d, i) => (
                            <path
                                key={i}
                                d={d}
                                stroke={c.accent}
                                strokeWidth={1.5}
                                fill="none"
                                strokeDasharray="10 14"
                                style={{
                                    animation: `${uid}-dash 14s linear infinite`,
                                }}
                            />
                        ))}
                    </svg>
                )}

                {Array.from({ length: rows }, (_, i) => buildRow(i))}
            </div>

            {showProgress && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 18,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 160,
                        height: 2,
                        borderRadius: 2,
                        background: `${c.muted}33`,
                        overflow: "hidden",
                        zIndex: 5,
                    }}
                >
                    <div
                        ref={barRef}
                        style={{
                            width: "34%",
                            height: "100%",
                            borderRadius: 2,
                            background: c.accent,
                        }}
                    />
                </div>
            )}
        </div>
    )

    if (!pinActive) return pane

    // the tall spacer is what the sticky pane travels through: the section
    // holds still until the cards finish, then lets the page carry on
    return (
        <div
            ref={pinRef}
            style={{
                position: "relative",
                width: "100%",
                // Infinite: the hold is measured in screens of scrolling and
                // the cards simply keep looping for as long as it lasts.
                // Whole deck: the hold is exactly as long as the deck is.
                height: isLoop
                    ? `${(1 + Math.max(0.3, pinScroll)) * 100}vh`
                    : `calc(100vh + ${Math.round(
                          Math.max(240, travel * Math.max(0.2, pinPace))
                      )}px)`,
            }}
        >
            {pane}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Card face                                                          */
/* ------------------------------------------------------------------ */

function CardFace({
    data,
    n,
    mediaRef,
    mediaH,
    radius,
    fs,
    c,
    showMeta,
    showIndex,
    titleSize,
    titleLines,
    uid,
}) {
    const src =
        data?.image?.src ||
        `https://picsum.photos/600/400?random=${(n % 20) + 1}`

    return (
        <div
            className={`${uid}-card`}
            style={{
                width: "100%",
                height: "100%",
                background: c.card,
                border: `1px solid ${c.border}`,
                borderRadius: radius,
                padding: Math.round(16 * fs),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 20px 40px rgba(0,0,0,.4)",
                transition: "border-color .35s ease, box-shadow .35s ease",
                boxSizing: "border-box",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: mediaH,
                    borderRadius: radius - 6 > 0 ? radius - 6 : 0,
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                {/* colour underneath, grey on top: only the grey layer's
                    opacity moves, so neither filter is ever recomputed */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url('${src}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "saturate(115%)",
                    }}
                />
                <div
                    ref={mediaRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url('${src}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "grayscale(100%)",
                        opacity: 0.8,
                    }}
                />
                {showIndex && (
                    <div
                        style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            padding: `${Math.round(3 * fs)}px ${Math.round(
                                7 * fs
                            )}px`,
                            borderRadius: Math.round(6 * fs),
                            fontSize: Math.round(10 * fs),
                            fontWeight: 700,
                            letterSpacing: ".5px",
                            color: c.bg,
                            background: c.accent,
                        }}
                    >
                        {String(n + 1).padStart(2, "0")}
                    </div>
                )}
            </div>

            <div
                style={{
                    fontSize: Math.round(titleSize * fs),
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: c.text,
                    marginTop: Math.round(12 * fs),
                    whiteSpace: "normal",
                    display: "-webkit-box",
                    WebkitLineClamp: titleLines,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                {data?.title}
            </div>

            {showMeta && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: Math.round(10 * fs),
                        marginTop: "auto",
                        paddingTop: Math.round(10 * fs),
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            width: Math.round(28 * fs),
                            height: Math.round(28 * fs),
                            borderRadius: "50%",
                            flexShrink: 0,
                            backgroundColor: c.accent,
                            backgroundImage: `url('${
                                data?.avatar?.src || src
                            }')`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                            style={{
                                fontSize: Math.round(12 * fs),
                                fontWeight: 600,
                            }}
                        >
                            {data?.name}
                        </span>
                        <span
                            style={{
                                fontSize: Math.round(10 * fs),
                                color: c.muted,
                            }}
                        >
                            {data?.role}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Themes + defaults                                                  */
/* ------------------------------------------------------------------ */

const THEMES = {
    Emerald: {
        bg: "#061514",
        card: "#0b2220",
        border: "rgba(255,255,255,.12)",
        accent: "#2ed5a3",
        text: "#e0f2f1",
        muted: "#6b8c88",
    },
    Violet: {
        bg: "#0a0714",
        card: "#150f2a",
        border: "rgba(255,255,255,.12)",
        accent: "#a78bfa",
        text: "#ede9fe",
        muted: "#7c74a0",
    },
    Amber: {
        bg: "#140d06",
        card: "#241708",
        border: "rgba(255,255,255,.12)",
        accent: "#f5a524",
        text: "#fdf3e3",
        muted: "#9a8467",
    },
    Ice: {
        bg: "#060d14",
        card: "#0c1a26",
        border: "rgba(255,255,255,.12)",
        accent: "#38bdf8",
        text: "#e0f2fe",
        muted: "#6b8494",
    },
    Mono: {
        bg: "#0a0a0a",
        card: "#161616",
        border: "rgba(255,255,255,.14)",
        accent: "#ffffff",
        text: "#f5f5f5",
        muted: "#8a8a8a",
    },
}

const DEFAULT_CARDS = [
    {
        title: "Inventing a new design language",
        name: "Wesly Haar",
        role: "MONKS",
    },
    {
        title: "The call I didn't expect",
        name: "Liva Grinberga",
        role: "NOT ON SALE",
    },
    {
        title: "Three stories about digital space",
        name: "Fernando Olmos",
        role: "ANITA & VEGA",
    },
    {
        title: "A moment of sudden inspiration",
        name: "Luciana Capriotti",
        role: "CONSULTANT",
    },
    {
        title: "Give it a little more time",
        name: "Uros Mikic",
        role: "FLOW NINJA",
    },
    { title: "The clip born out of panic", name: "Rob Ford", role: "THE FWA" },
    {
        title: "Building the airplane mid-air",
        name: "Dave Benton",
        role: "METALAB",
    },
]

/* ------------------------------------------------------------------ */
/*  Property controls                                                  */
/* ------------------------------------------------------------------ */

/* @controls:start */
const DEFAULTS = {
    cards: DEFAULT_CARDS,
    mode: "Ticker",
    tickerSpeed: 1.2,
    tickerReverse: false,
    scrollBoost: 1,
    pauseOnHover: true,
    pinTravel: "Loop",
    pinScroll: 2,
    pinLoops: 1.5,
    pinPace: 1,
    dragRange: 500,
    dragReturn: true,
    dragToScroll: true,
    smoothing: 0.08,
    rowCount: 2,
    curve: "Arc",
    curveAmount: 60,
    crossReach: 0.85,
    tiltAmount: 1,
    rowSpacing: 30,
    rowOffset: 2,
    invertRow2: true,
    sizing: "Fit",
    cardsPerView: 4.6,
    cardAspect: 0.82,
    minCardWidth: 150,
    maxCardWidth: 380,
    scaleText: true,
    cardWidth: 220,
    cardHeight: 260,
    cardRadius: 16,
    cardGap: 24,
    mediaRatio: 0.43,
    titleSize: 15,
    titleLines: 2,
    depthScale: 0.12,
    centerBoost: 0.06,
    edgeFade: 0.45,
    focusColor: true,
    baseGrayscale: 80,
    theme: "Emerald",
    bgColor: "#061514",
    cardBg: "#0b2220",
    cardBorder: "rgba(255,255,255,.12)",
    accentColor: "#2ed5a3",
    textMain: "#e0f2f1",
    textMuted: "#6b8c88",
    transparentBg: false,
    showMeta: true,
    showIndex: false,
    edgeMask: true,
    spotlight: true,
    glowOrbs: true,
    guideLine: true,
    showProgress: false,
}
/* @controls:end */
