import { useEffect, useMemo, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { useScroll } from "framer-motion"

/**
 * 3D HELICAL SCROLL GALLERY
 * A 1:1 Framer port of the Three.js + GSAP ScrollTrigger original.
 * GSAP ScrollTrigger is replaced by Framer Motion's useScroll + an
 * exponential smoother that reproduces `scrub: 0.6`.
 *
 * HOW TO USE IN FRAMER
 * 1. Insert on a page, set Width = Fill.
 * 2. Set Height = Fit (the component sizes itself from "Scroll Length").
 * 3. Everything else is in the properties panel on the right.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 3600
 * @framerSupportsResizeMode false
 * @framerDisableUnlink
 */

/* ------------------------------------------------------------------ */
/* Three.js loader (r128 UMD — same build the original HTML used)      */
/* ------------------------------------------------------------------ */

const THREE_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"

let threePromise: Promise<any> | null = null

function loadThree(): Promise<any> {
    if (typeof window === "undefined") return Promise.resolve(null)
    const w = window as any
    if (w.THREE) return Promise.resolve(w.THREE)
    if (threePromise) return threePromise

    threePromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(
            `script[src="${THREE_SRC}"]`
        ) as HTMLScriptElement | null

        if (existing) {
            existing.addEventListener("load", () => resolve(w.THREE))
            existing.addEventListener("error", reject)
            return
        }

        const script = document.createElement("script")
        script.src = THREE_SRC
        script.async = true
        script.crossOrigin = "anonymous"
        script.onload = () => resolve(w.THREE)
        script.onerror = reject
        document.head.appendChild(script)
    })

    return threePromise
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type CardItem = {
    image?: { src?: string } | string | null
    label?: string
    color?: string
}

type Props = {
    title: string
    subtitle: string
    background: string
    fogDensity: number
    scrollLength: number
    smoothing: number
    cardCount: number
    cards: CardItem[]
    cardWidth: number
    cardHeight: number
    radiusX: number
    radiusZ: number
    pitch: number
    turns: number
    zOffset: number
    yOffset: number
    minScale: number
    maxScale: number
    tilt: number
    fov: number
    cameraZ: number
    autoPlayOnCanvas: boolean
    style?: React.CSSProperties
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function HelicalScrollGallery(props: Props) {
    const {
        title = DEFAULTS.title,
        subtitle = DEFAULTS.subtitle,
        background = DEFAULTS.background,
        fogDensity = DEFAULTS.fogDensity,
        scrollLength = DEFAULTS.scrollLength,
        smoothing = DEFAULTS.smoothing,
        cardCount = DEFAULTS.cardCount,
        cards = DEFAULTS.cards,
        cardWidth = DEFAULTS.cardWidth,
        cardHeight = DEFAULTS.cardHeight,
        radiusX = DEFAULTS.radiusX,
        radiusZ = DEFAULTS.radiusZ,
        pitch = DEFAULTS.pitch,
        turns = DEFAULTS.turns,
        zOffset = DEFAULTS.zOffset,
        yOffset = DEFAULTS.yOffset,
        minScale = DEFAULTS.minScale,
        maxScale = DEFAULTS.maxScale,
        tilt = DEFAULTS.tilt,
        fov = DEFAULTS.fov,
        cameraZ = DEFAULTS.cameraZ,
        autoPlayOnCanvas = DEFAULTS.autoPlayOnCanvas,
        style,
    } = props

    const scrollRef = useRef<HTMLDivElement>(null)
    const stageRef = useRef<HTMLDivElement>(null)

    // Framer Motion replacement for GSAP ScrollTrigger
    // start: "top top"  →  "start start"
    // end:   "bottom bottom" → "end end"
    const { scrollYProgress } = useScroll({
        target: scrollRef,
        offset: ["start start", "end end"],
    })

    // Latest props inside the RAF loop without re-creating the scene
    const settings = useRef<any>({})
    settings.current = {
        fogDensity,
        smoothing,
        radiusX,
        radiusZ,
        pitch,
        turns,
        zOffset,
        yOffset,
        minScale,
        maxScale,
        tilt,
        autoPlayOnCanvas,
        background,
    }

    const isCanvas =
        RenderTarget.current() === RenderTarget.canvas ||
        RenderTarget.current() === RenderTarget.thumbnail

    // Framer hands us a fresh array object every render, so key the scene
    // rebuild off the actual content instead of object identity.
    const cardsKey = useMemo(() => {
        const list = Array.isArray(cards) ? cards : []
        return JSON.stringify(
            list.map((c) => [
                typeof c?.image === "string" ? c.image : c?.image?.src ?? "",
                c?.label ?? "",
                c?.color ?? "",
            ])
        )
    }, [cards])

    useEffect(() => {
        let disposed = false
        let frameId = 0
        let cleanup = () => {}

        loadThree().then((THREE) => {
            if (!THREE || disposed || !stageRef.current) return

            const container = stageRef.current

            /* ---------- 1. Scene Setup ---------- */
            const scene = new THREE.Scene()
            const fogColor = new THREE.Color(background)
            scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity)

            let width = container.clientWidth || 1
            let height = container.clientHeight || 1

            const camera = new THREE.PerspectiveCamera(
                fov,
                width / height,
                0.1,
                100
            )
            camera.position.set(0, 0, cameraZ)

            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
            })
            renderer.setSize(width, height)
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.domElement.style.display = "block"
            renderer.domElement.style.width = "100%"
            renderer.domElement.style.height = "100%"
            container.appendChild(renderer.domElement)

            /* ---------- 2. Helical Curve Logic ---------- */
            function getHelixPoint(t: number) {
                const s = settings.current
                const angle = t * Math.PI * s.turns

                const x = Math.sin(angle) * s.radiusX
                const y = t * s.pitch * 4 + s.yOffset
                const z = Math.cos(angle) * s.radiusZ + s.zOffset

                return new THREE.Vector3(x, y, z)
            }

            /* ---------- 3. Fallback textures ---------- */
            function createDummyTexture(text: string, color: string) {
                const c = document.createElement("canvas")
                c.width = 512
                c.height = 640
                const ctx = c.getContext("2d")!

                ctx.fillStyle = color
                ctx.fillRect(0, 0, c.width, c.height)

                ctx.fillStyle = "#ffffff"
                ctx.font = "Bold 40px Sans-Serif"
                ctx.textAlign = "center"
                ctx.fillText(text, c.width / 2, c.height / 2)

                return new THREE.CanvasTexture(c)
            }

            const fallbackColors = [
                "#1a1a1a",
                "#222222",
                "#2a2a2a",
                "#333333",
                "#111111",
            ]

            const items: CardItem[] = Array.isArray(cards) ? cards : []
            const total = Math.max(1, Math.round(cardCount))
            const meshes: any[] = []
            const textures: any[] = []
            const materials: any[] = []

            /* Card Geometry with Anchor Offset (Bottom Center) */
            const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight)
            geometry.translate(0, cardHeight / 2, 0)

            const loader = new THREE.TextureLoader()
            loader.setCrossOrigin("anonymous")

            for (let i = 0; i < total; i++) {
                const item = items.length ? items[i % items.length] : undefined
                const label = item?.label || `CARD ${i + 1}`
                const color =
                    item?.color || fallbackColors[i % fallbackColors.length]

                const texture = createDummyTexture(label, color)
                textures.push(texture)

                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: true,
                })
                materials.push(material)

                // Swap in the real artwork when it arrives
                const raw = item?.image
                const src =
                    typeof raw === "string" ? raw : raw && raw.src ? raw.src : null

                if (src) {
                    loader.load(src, (tex: any) => {
                        if (disposed) {
                            tex.dispose()
                            return
                        }
                        tex.minFilter = THREE.LinearFilter
                        material.map = tex
                        material.needsUpdate = true
                        textures.push(tex)
                    })
                }

                const card = new THREE.Mesh(geometry, material)
                card.userData = { offset: i / total }

                scene.add(card)
                meshes.push(card)
            }

            /* ---------- 4. Scroll driven animation ---------- */
            let smoothed = scrollYProgress.get() || 0
            let lastTime = performance.now()
            let autoT = 0

            /* ---------- 5. Render loop ---------- */
            const clamp = (min: number, max: number, v: number) =>
                Math.min(max, Math.max(min, v))

            function animate() {
                frameId = requestAnimationFrame(animate)

                const s = settings.current
                const now = performance.now()
                const dt = Math.min((now - lastTime) / 1000, 0.1)
                lastTime = now

                let target = scrollYProgress.get() || 0

                if (isCanvas && s.autoPlayOnCanvas) {
                    autoT = (autoT + dt * 0.06) % 1
                    target = autoT
                }

                // Equivalent of GSAP's `scrub: <seconds>` catch-up easing
                const tau = Math.max(0.0001, s.smoothing / 3)
                smoothed += (target - smoothed) * (1 - Math.exp(-dt / tau))

                meshes.forEach((card) => {
                    // Loop parameter t (0..1) relative to scroll position
                    let t = (card.userData.offset + smoothed) % 1
                    if (t < 0) t += 1

                    // Position along the 3D helix
                    const pos = getHelixPoint(t)
                    card.position.copy(pos)

                    // Orient along the curve tangent
                    const tangentPoint = getHelixPoint((t + 0.01) % 1)
                    card.lookAt(tangentPoint)
                    card.rotation.y += Math.PI / 2 // alignment correction
                    card.rotation.z += Math.sin(t * Math.PI) * s.tilt

                    // Focal point proximity scaling
                    const depthFactor = (pos.z + 4) / 5
                    const scale = clamp(s.minScale, s.maxScale, depthFactor)
                    card.scale.set(scale, scale, scale)
                })

                if (scene.fog) scene.fog.density = s.fogDensity

                renderer.render(scene, camera)
            }

            animate()

            /* ---------- 6. Responsive handling ---------- */
            const resize = () => {
                if (!container) return
                width = container.clientWidth || 1
                height = container.clientHeight || 1
                camera.aspect = width / height
                camera.updateProjectionMatrix()
                renderer.setSize(width, height)
            }

            const observer =
                typeof ResizeObserver !== "undefined"
                    ? new ResizeObserver(resize)
                    : null
            observer?.observe(container)
            window.addEventListener("resize", resize)

            cleanup = () => {
                cancelAnimationFrame(frameId)
                observer?.disconnect()
                window.removeEventListener("resize", resize)
                textures.forEach((t) => t.dispose())
                materials.forEach((m) => m.dispose())
                geometry.dispose()
                renderer.dispose()
                if (renderer.domElement.parentNode === container) {
                    container.removeChild(renderer.domElement)
                }
            }
        })

        return () => {
            disposed = true
            cleanup()
        }
        // Scene is rebuilt only when structural props change.
        // Everything else is read live from `settings`.
    }, [
        cardsKey,
        cardCount,
        cardWidth,
        cardHeight,
        fov,
        cameraZ,
        background,
        isCanvas,
    ])

    return (
        <div
            ref={scrollRef}
            style={{
                position: "relative",
                width: "100%",
                height: `${scrollLength}vh`,
                backgroundColor: background,
                color: "#fff",
                ...style,
            }}
        >
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    width: "100%",
                    height: "100vh",
                    overflow: "hidden",
                }}
            >
                {/* WebGL canvas mount */}
                <div
                    ref={stageRef}
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 1,
                        pointerEvents: "none",
                    }}
                />

                {/* UI Overlay */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        zIndex: 2,
                        pointerEvents: "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "3rem",
                        fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    }}
                >
                    <div
                        style={{
                            fontSize: "5rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "-0.03em",
                            opacity: 0.15,
                            lineHeight: 0.9,
                            whiteSpace: "pre-line",
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            fontSize: "0.9rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            opacity: 0.5,
                        }}
                    >
                        {subtitle}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* @controls:start */
const DEFAULTS = {
    title: "Design In\nMotion",
    subtitle: "Scroll to explore sequence",
    background: "#111111",
    fogDensity: 0.05,
    scrollLength: 600,
    smoothing: 0.6,
    cardCount: 12,
    cards: [],
    cardWidth: 1.6,
    cardHeight: 2.0,
    radiusX: 3.8,
    radiusZ: 2.5,
    pitch: 1.2,
    turns: 2.5,
    zOffset: -1.5,
    yOffset: -2.5,
    minScale: 0.6,
    maxScale: 1.3,
    tilt: 0.15,
    fov: 45,
    cameraZ: 10,
    autoPlayOnCanvas: true,
}
/* @controls:end */

// React 19 ignores defaultProps on function components; the real
// defaults are applied when destructuring above.
HelicalScrollGallery.defaultProps = DEFAULTS

/* ------------------------------------------------------------------ */
/* Property controls                                                   */
/* ------------------------------------------------------------------ */

addPropertyControls(HelicalScrollGallery, {
    title: {
        type: ControlType.String,
        title: "Title",
        displayTextArea: true,
        defaultValue: "Design In\nMotion",
    },
    subtitle: {
        type: ControlType.String,
        title: "Subtitle",
        defaultValue: "Scroll to explore sequence",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#111111",
    },
    scrollLength: {
        type: ControlType.Number,
        title: "Scroll Length",
        description: "Total scroll distance in vh. Higher = slower.",
        defaultValue: 600,
        min: 100,
        max: 2000,
        step: 50,
        unit: "vh",
    },
    smoothing: {
        type: ControlType.Number,
        title: "Scrub",
        description: "Seconds the motion takes to catch up to the scroll.",
        defaultValue: 0.6,
        min: 0,
        max: 3,
        step: 0.05,
        unit: "s",
    },
    cardCount: {
        type: ControlType.Number,
        title: "Cards",
        defaultValue: 12,
        min: 1,
        max: 60,
        step: 1,
        displayStepper: true,
    },
    cards: {
        type: ControlType.Array,
        title: "Content",
        description: "Leave empty for the generated placeholder cards.",
        control: {
            type: ControlType.Object,
            controls: {
                image: { type: ControlType.ResponsiveImage, title: "Image" },
                label: {
                    type: ControlType.String,
                    title: "Label",
                    defaultValue: "",
                },
                color: {
                    type: ControlType.Color,
                    title: "Fallback",
                    defaultValue: "#1a1a1a",
                },
            },
        },
        defaultValue: [],
    },
    cardWidth: {
        type: ControlType.Number,
        title: "Card W",
        defaultValue: 1.6,
        min: 0.2,
        max: 6,
        step: 0.1,
    },
    cardHeight: {
        type: ControlType.Number,
        title: "Card H",
        defaultValue: 2.0,
        min: 0.2,
        max: 8,
        step: 0.1,
    },
    radiusX: {
        type: ControlType.Number,
        title: "Arch Width",
        defaultValue: 3.8,
        min: 0,
        max: 12,
        step: 0.1,
    },
    radiusZ: {
        type: ControlType.Number,
        title: "Spiral Depth",
        defaultValue: 2.5,
        min: 0,
        max: 12,
        step: 0.1,
    },
    pitch: {
        type: ControlType.Number,
        title: "Climb Rate",
        defaultValue: 1.2,
        min: 0,
        max: 5,
        step: 0.1,
    },
    turns: {
        type: ControlType.Number,
        title: "Turns",
        description: "Rotations across the loop (× π).",
        defaultValue: 2.5,
        min: 0.5,
        max: 10,
        step: 0.5,
    },
    yOffset: {
        type: ControlType.Number,
        title: "Y Offset",
        defaultValue: -2.5,
        min: -10,
        max: 10,
        step: 0.1,
    },
    zOffset: {
        type: ControlType.Number,
        title: "Z Offset",
        defaultValue: -1.5,
        min: -10,
        max: 10,
        step: 0.1,
    },
    tilt: {
        type: ControlType.Number,
        title: "Roll",
        defaultValue: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
    },
    minScale: {
        type: ControlType.Number,
        title: "Min Scale",
        defaultValue: 0.6,
        min: 0.1,
        max: 2,
        step: 0.05,
    },
    maxScale: {
        type: ControlType.Number,
        title: "Max Scale",
        defaultValue: 1.3,
        min: 0.1,
        max: 4,
        step: 0.05,
    },
    fogDensity: {
        type: ControlType.Number,
        title: "Fog",
        defaultValue: 0.05,
        min: 0,
        max: 0.3,
        step: 0.005,
    },
    fov: {
        type: ControlType.Number,
        title: "FOV",
        defaultValue: 45,
        min: 10,
        max: 120,
        step: 1,
    },
    cameraZ: {
        type: ControlType.Number,
        title: "Camera Z",
        defaultValue: 10,
        min: 1,
        max: 40,
        step: 0.5,
    },
    autoPlayOnCanvas: {
        type: ControlType.Boolean,
        title: "Preview Spin",
        description: "Slowly animate inside the Framer canvas.",
        defaultValue: true,
    },
})
