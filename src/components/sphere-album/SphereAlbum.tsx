import { useEffect, useMemo, useRef } from "react"

/* =====================================================================
   ORIENTATION — a quaternion, not two Euler angles.

   Two angles (yaw + pitch) cannot do this job. Yaw spins around the
   OBJECT's own vertical axis, and once the sphere is tilted that axis no
   longer points up the screen — so a sideways drag starts to roll it, and
   past 90° of tilt it runs backwards. A quaternion has no preferred axis:
   every drag builds its own rotation about the screen-space axis
   perpendicular to the gesture, so the sphere always travels exactly the
   way you pushed it, from any orientation.
===================================================================== */
type Quat = { x: number; y: number; z: number; w: number }

const qMul = (a: Quat, b: Quat): Quat => ({
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
})
const qNorm = (q: Quat): Quat => {
    const l = Math.hypot(q.x, q.y, q.z, q.w) || 1
    return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l }
}
const qAxis = (ax: number, ay: number, az: number, ang: number): Quat => {
    const h = ang / 2,
        s = Math.sin(h)
    return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) }
}
const qMatrix = (q: Quat) => {
    const { x, y, z, w } = q
    return [
        1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
        2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
        2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ]
}

/* A screen gesture -> the rotation it should produce.
   right => spin about (0,1,0)   down => spin about (-1,0,0)
   Anything between is the normalised blend, so diagonals work too. */
const gestureAxis = (dx: number, dy: number) => {
    const h = Math.hypot(dx, dy)
    return h < 1e-6 ? null : { x: -dy / h, y: dx / h, z: 0, len: h }
}

/* Fibonacci sphere — the even, non-clumping way to scatter N points.
   Band MIDPOINTS (i + 0.5), never endpoints: a point landing exactly on a
   pole would sit on the rotation axis and stay frozen while everything
   around it moved. */
function fibonacciSphere(n: number) {
    const pts: { x: number; y: number; z: number }[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / n) * 2
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const t = golden * i
        pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r })
    }
    return pts
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

interface Item {
    image?: { src: string; srcSet?: string; alt?: string }
    title?: string
    link?: string
    width: number
    height: number
}

interface Props {
    items: Item[]
    radius: number
    autoSpin: number
    dragSpeed: number
    wheelSpeed: number
    damping: number
    captureWheel: boolean
    enableZoom: boolean
    depthFade: number
    depthBlur: number
    hoverLift: number
    cardPadding: number
    cardRadius: number
    cardBackground: string
    shadow: boolean
    openInNewTab: boolean
    introMs: number
    style?: React.CSSProperties
}

/**
 * Sphere Album — a 3D sphere of image cards. Scroll spins it, drag tumbles it
 * in any direction with inertia, click opens the card's link.
 */
export default function SphereAlbum(props: Partial<Props>) {
    const {
        items = [],
        radius = 46,
        autoSpin = 0.11,
        dragSpeed = 0.58,
        wheelSpeed = 0.26,
        damping = 0.945,
        captureWheel = true,
        enableZoom = true,
        depthFade = 0.34,
        depthBlur = 2.2,
        hoverLift = 46,
        cardPadding = 8,
        cardRadius = 0,
        cardBackground = "#ffffff",
        shadow = true,
        openInNewTab = false,
        introMs = 900,
        style,
    } = props

    const isStatic = false
    const stageRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLAnchorElement | null)[]>([])
    const points = useMemo(() => fibonacciSphere(Math.max(1, items.length)), [items.length])

    // live config — read by the loop each frame, so tweaking a slider in the
    // properties panel never restarts the animation or resets the orientation
    const cfg = useRef<any>({})
    cfg.current = {
        radius: radius / 100,          // panel is a percentage of the stage
        autoSpin: autoSpin / 100,
        dragSpeed: dragSpeed / 100,
        wheelSpeed: wheelSpeed / 1000,
        damping, captureWheel, enableZoom, depthFade, depthBlur, hoverLift, introMs,
        maxSpin: 0.11, clickSlop: 6, zoomMin: 0.62, zoomMax: 1.7,
    }

    // orientation + motion survive re-renders
    const st = useRef({
        q: qNorm(qAxis(-1, 0, 0, 0.12)),
        spin: { x: 0, y: 0.0011, z: 0 },
        lift: [] as number[],
        liftTarget: [] as number[],
        blur: [] as number[],
        pe: [] as (string | null)[],
        zoom: 1,
        dragging: false,
        moved: 0,
        introStart: 0,
    }).current

    useEffect(() => {
        const stage = stageRef.current
        if (!stage) return
        const pts = points
        const n = pts.length
        st.lift = new Array(n).fill(0)
        st.liftTarget = new Array(n).fill(0)
        st.blur = new Array(n).fill(-1)
        st.pe = new Array(n).fill(null)
        st.introStart = performance.now()

        let baseRadius = 300
        const fit = () => {
            const r = stage.getBoundingClientRect()
            baseRadius = Math.max(80, Math.min(r.width, r.height) * cfg.current.radius)
        }
        fit()

        const setCursor = (c: string) => {
            if (stageRef.current) stageRef.current.style.cursor = c
        }

        /* ---------------- render ---------------- */
        function render(now: number) {
            const c = cfg.current
            const m = qMatrix(st.q)
            const t0 = c.introMs > 0 ? clamp((now - st.introStart) / c.introMs, 0, 1) : 1
            const R = baseRadius * st.zoom

            for (let k = 0; k < n; k++) {
                const el = cardRefs.current[k]
                if (!el) continue
                const p = pts[k]
                const intro = easeOut(clamp(t0 * 1.6 - (k / n) * 0.6, 0, 1))

                const vx = m[0] * p.x + m[1] * p.y + m[2] * p.z
                const vy = m[3] * p.x + m[4] * p.y + m[5] * p.z
                const vz = m[6] * p.x + m[7] * p.y + m[8] * p.z

                st.lift[k] += (st.liftTarget[k] - st.lift[k]) * 0.18

                const rr = R * intro
                const X = vx * rr,
                    Y = vy * rr,
                    Z = vz * rr + st.lift[k]

                const depth = (vz + 1) / 2 // 0 far -> 1 near
                el.style.transform = `translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,${Z.toFixed(2)}px)`
                el.style.opacity = ((1 - (1 - depth) * c.depthFade) * intro).toFixed(3)

                // write-on-change only: blur and hit-testing are expensive
                if (c.depthBlur > 0) {
                    const far = Math.max(0, (0.55 - depth) / 0.55) // front 45% stays sharp
                    const b = Math.round(far * far * c.depthBlur * 4) / 4
                    if (b !== st.blur[k]) {
                        st.blur[k] = b
                        el.style.filter = b ? `blur(${b}px)` : ""
                    }
                } else if (st.blur[k] !== 0) {
                    st.blur[k] = 0
                    el.style.filter = ""
                }
                // don't let the back of the sphere swallow clicks meant for the front
                const pe = vz > -0.15 ? "auto" : "none"
                if (pe !== st.pe[k]) {
                    st.pe[k] = pe
                    el.style.pointerEvents = pe
                }
            }
        }

        /* ---------------- physics: delta-time, identical at 60/120/144Hz ---------------- */
        let raf = 0
        let last = performance.now()
        function step(now: number) {
            const c = cfg.current
            const dt = Math.min(now - last, 50)
            last = now
            const f = dt / 16.667

            if (!st.dragging) {
                const mag = Math.hypot(st.spin.x, st.spin.y, st.spin.z)
                if (mag > 1e-7) {
                    st.q = qNorm(qMul(qAxis(st.spin.x / mag, st.spin.y / mag, st.spin.z / mag, mag * f), st.q))
                }
                const decay = Math.pow(c.damping, f)
                st.spin.x *= decay
                st.spin.z *= decay
                st.spin.y = c.autoSpin + (st.spin.y - c.autoSpin) * decay // settle into the drift
                if (Math.abs(st.spin.x) < 1e-6) st.spin.x = 0
                if (Math.abs(st.spin.z) < 1e-6) st.spin.z = 0
            }
            render(now)
            raf = requestAnimationFrame(step)
        }

        if (isStatic) {
            // canvas / export: one finished frame, no loop
            st.introStart = -1e7
            render(performance.now())
        } else {
            raf = requestAnimationFrame(step)
        }

        /* ---------------- input ---------------- */
        const pointers = new Map<number, { x: number; y: number }>()
        let primaryId: number | null = null
        let lastX = 0,
            lastY = 0
        let pinchDist = 0,
            pinchZoom = 1
        const samples: { t: number; x: number; y: number }[] = []

        function rotateBy(dx: number, dy: number) {
            const g = gestureAxis(dx, dy)
            if (!g) return
            st.q = qNorm(qMul(qAxis(g.x, g.y, g.z, g.len * cfg.current.dragSpeed), st.q))
        }

        function onDown(e: PointerEvent) {
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
            for (let k = 0; k < n; k++) st.liftTarget[k] = 0

            if (pointers.size === 2) {
                st.dragging = false
                const [a, b] = [...pointers.values()]
                pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
                pinchZoom = st.zoom
                return
            }
            if (pointers.size > 2) return

            st.dragging = true
            st.moved = 0
            primaryId = e.pointerId
            lastX = e.clientX
            lastY = e.clientY
            samples.length = 0
            samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY })
            st.spin.x = st.spin.y = st.spin.z = 0
            setCursor("grabbing")
            // NB: no setPointerCapture — it would retarget the click away from the
            // <a>, breaking real link navigation. Window listeners instead.
            window.addEventListener("pointermove", onMove)
            window.addEventListener("pointerup", onUp)
            window.addEventListener("pointercancel", onUp)
        }

        function onMove(e: PointerEvent) {
            if (!pointers.has(e.pointerId)) return
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

            if (pointers.size === 2) {
                if (!cfg.current.enableZoom) return
                const [a, b] = [...pointers.values()]
                const d = Math.hypot(a.x - b.x, a.y - b.y)
                if (pinchDist > 0)
                    st.zoom = clamp(pinchZoom * (d / pinchDist), cfg.current.zoomMin, cfg.current.zoomMax)
                return
            }
            if (!st.dragging || e.pointerId !== primaryId) return

            const dx = e.clientX - lastX,
                dy = e.clientY - lastY
            lastX = e.clientX
            lastY = e.clientY
            st.moved += Math.abs(dx) + Math.abs(dy)
            rotateBy(dx, dy)

            // keep a short history so the throw uses real gesture speed, not just
            // the last frame (which is 0 if you pause before letting go)
            samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY })
            while (samples.length > 2 && e.timeStamp - samples[0].t > 90) samples.shift()
        }

        function onUp(e: PointerEvent) {
            pointers.delete(e.pointerId)
            if (pointers.size < 2) pinchDist = 0
            if (!st.dragging || e.pointerId !== primaryId) return
            st.dragging = false
            primaryId = null
            setCursor("grab")
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)

            // throw
            st.spin.x = st.spin.y = st.spin.z = 0
            if (samples.length < 2) return
            const a = samples[0],
                b = samples[samples.length - 1]
            if (e.timeStamp - b.t > 120) return // held still -> no throw
            const dtms = Math.max(8, b.t - a.t)
            const g = gestureAxis(b.x - a.x, b.y - a.y)
            if (!g) return
            const rate = clamp(g.len * cfg.current.dragSpeed * (16.667 / dtms), 0, cfg.current.maxSpin)
            st.spin.x = g.x * rate
            st.spin.y = g.y * rate
        }

        function onWheel(e: WheelEvent) {
            const c = cfg.current
            if (c.enableZoom && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                st.zoom = clamp(st.zoom * (1 - e.deltaY * 0.01), c.zoomMin, c.zoomMax)
                return
            }
            if (c.captureWheel) e.preventDefault()
            const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
            st.spin.y = clamp(st.spin.y + d * c.wheelSpeed, -c.maxSpin, c.maxSpin)
        }

        // a drag that ends on a card must not follow the card's link
        function onClickCapture(e: MouseEvent) {
            if (st.moved > cfg.current.clickSlop) {
                e.preventDefault()
                e.stopPropagation()
            }
        }

        function onOver(e: PointerEvent) {
            const el = (e.target as HTMLElement)?.closest?.("[data-sa-index]") as HTMLElement | null
            if (el) st.liftTarget[+el.dataset.saIndex!] = cfg.current.hoverLift
        }
        function onOut(e: PointerEvent) {
            const el = (e.target as HTMLElement)?.closest?.("[data-sa-index]") as HTMLElement | null
            if (el) st.liftTarget[+el.dataset.saIndex!] = 0
        }

        if (!isStatic) {
            stage.addEventListener("pointerdown", onDown)
            stage.addEventListener("wheel", onWheel, { passive: false })
            stage.addEventListener("click", onClickCapture, true)
            stage.addEventListener("pointerover", onOver)
            stage.addEventListener("pointerout", onOut)
        }

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null
        ro?.observe(stage)

        // pause when scrolled out of view or the tab is hidden
        let inView = true
        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(([en]) => {
                      const now = en.isIntersecting
                      if (now === inView) return
                      inView = now
                      if (now && !isStatic) {
                          last = performance.now()
                          raf = requestAnimationFrame(step)
                      } else {
                          cancelAnimationFrame(raf)
                      }
                  })
                : null
        io?.observe(stage)

        return () => {
            cancelAnimationFrame(raf)
            stage.removeEventListener("pointerdown", onDown)
            stage.removeEventListener("wheel", onWheel)
            stage.removeEventListener("click", onClickCapture, true)
            stage.removeEventListener("pointerover", onOver)
            stage.removeEventListener("pointerout", onOut)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            ro?.disconnect()
            io?.disconnect()
        }
    }, [points, isStatic])

    return (
        <div
            ref={stageRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                perspective: 1400,
                perspectiveOrigin: "50% 50%",
                touchAction: "none",
                cursor: "grab",
                userSelect: "none",
                WebkitUserSelect: "none",
                ...style,
            }}
            onDragStart={(e) => e.preventDefault()}
        >
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 0,
                    height: 0,
                    transformStyle: "preserve-3d",
                }}
            >
                {items.map((item, i) => (
                    <a
                        key={i}
                        data-sa-index={i}
                        ref={(el) => {
                            cardRefs.current[i] = el
                        }}
                        href={item.link || undefined}
                        target={item.link && openInNewTab ? "_blank" : undefined}
                        rel={item.link && openInNewTab ? "noopener noreferrer" : undefined}
                        aria-label={item.title || undefined}
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            display: "block",
                            width: item.width,
                            height: item.height,
                            marginLeft: -item.width / 2,
                            marginTop: -item.height / 2,
                            padding: cardPadding,
                            borderRadius: cardRadius,
                            background: cardBackground,
                            boxShadow: shadow ? "0 6px 24px rgba(0,0,0,.08)" : "none",
                            backfaceVisibility: "hidden",
                            willChange: "transform, opacity, filter",
                            textDecoration: "none",
                            cursor: item.link ? "pointer" : "grab",
                            // gradient plate stands in until an image is chosen
                            backgroundImage: item.image?.src
                                ? undefined
                                : `linear-gradient(150deg, hsl(${(i * 47) % 360} 10% 93%), hsl(${(i * 47) % 360} 12% 83%) 48%, hsl(${(i * 47) % 360} 8% 95%))`,
                        }}
                    >
                        {item.image?.src ? (
                            <img
                                src={item.image.src}
                                srcSet={item.image.srcSet}
                                alt={item.image.alt || item.title || ""}
                                draggable={false}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: Math.max(0, cardRadius - cardPadding),
                                    pointerEvents: "none",
                                }}
                            />
                        ) : null}
                    </a>
                ))}
            </div>
        </div>
    )
}

SphereAlbum.displayName = "Sphere Album"
