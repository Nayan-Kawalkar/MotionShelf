import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
// @ts-ignore — URL import, resolved by Framer at build time
import * as THREE from "https://esm.sh/three@0.160.1"

/* @controls:start */
const DEFAULTS = {
    images: [] as any[],
    imageFit: "cover",
    seed: 7,
    placeholder: {
        lightRatio: 0.82,
        chrome: 0.38,
        names:
            "Myrtle Village\nSecond Story\nFlaneur\nBathhouse\nXanadu\nPotted\nStretch Squared\nMargaret Rajic\nNaughty Nancy\nEveryday\nDreamscape\nFat Cherry\nSunny Studio\nAtelier Nord\nField Notes\nRitual\nThe Green Room\nSuperbloom\nNorthsound\nCopper & Oak\nWildflower\nHalcyon\nMarlow\nPaper Plane\nStudio Verde\nLantern\nHollow",
        headlines:
            "A ritual best shared.\nForming deeper relationships.\nYou're not stuck, you're overthinking.\nLet's connect.\nMade to be lived in.\nSlow mornings, good light.\nBuilt for the long game.\nEverything in its place.\nDesigned for the everyday.\nWhere the light lands.\nSmall batch, made slowly.\nCome as you are.\nA quiet kind of luxury.\nNew work, twice a year.",
    },
    grid: {
        rows: 7,
        columns: 16,
        cardWidth: 5,
        cardAspect: 1.6,
        cornerRadius: 0.045,
        edgeLight: 0.28,
        distance: 23,
        gapMode: false,
        gapX: 4,
        gapY: 3.1,
        bandTop: 0.24,
        bandBottom: 0.76,
        stagger: 0,
        density: 1,
        sizeVariation: 0,
        depthVariation: 0,
        angleJitter: 0,
        tilt: 0,
    },
    lens: {
        fieldOfView: 74,
        maxPixelRatio: 2,
        antialias: true,
    },
    look: {
        background: "#000000",
        fogColor: "#000000",
        fog: 0.016,
        glow: 0.16,
        glowColor: "#ffffff",
        fadeStart: 0.4,
        fadeEnd: 0.985,
        fadeCurve: 1.12,
        minBrightness: 0.05,
        vignette: 1,
        vignetteColor: "#000000",
        vignetteSize: 115,
    },
    motion: {
        drag: true,
        dragSpeed: 0.0032,
        invert: false,
        lockVertical: false,
        wheel: true,
        wheelSpeed: 0.0016,
        friction: 0.935,
        smoothing: 0.1,
        dragSmoothing: 0.32,
        pitchLimit: 0.4,
        rubber: 0.28,
        overshoot: 0.09,
        autoDrift: 0.28,
        driftDirection: "left",
        driftDelay: 0.6,
        parallax: 0.02,
        startAngle: 0,
        startPitch: 0,
    },
    hover: {
        enabled: true,
        scale: 0.16,
        lift: 0.055,
        brightness: 0.45,
        glow: 3.2,
        dim: 0.3,
        speed: 0.16,
        pauseDrift: true,
        cursor: true,
    },
    overlay: {
        showTitle: true,
        title: "Made with\nSquarespace",
        titleFont: {
            fontSize: 64,
            fontWeight: 400,
            lineHeight: "1.05em",
            fontFamily: "Georgia, serif",
        },
        titleColor: "#ffffff",
        textShadow: 1,
        subtitle: "Drag to explore",
        subtitleColor: "rgba(255,255,255,0.42)",
        subtitleSize: 11,
        subtitleSpacing: 3.5,
        subtitleUppercase: true,
        subtitleGap: 18,
        offsetY: 0,
        backdrop: 1,
    },
}
/* @controls:end */

// Framer hands object-groups over as partial objects, so every value gets
// filled in from DEFAULTS rather than trusting the prop to be complete.
function fill(base: any, over: any) {
    const out = { ...base }
    if (over && typeof over === "object") {
        for (const k in over) {
            if (over[k] !== undefined && over[k] !== null) out[k] = over[k]
        }
    }
    return out
}

/**
 * 3D SPHERICAL GALLERY
 *
 * A room of cards wrapped around the viewer. Drag to look around, hover a
 * card to bring it forward. Drop your own images into the Images control —
 * with none set it draws placeholder "site screenshots", so the component
 * looks right the moment it lands on the canvas.
 *
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 700
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function SphericalGallery(props: any) {
    const style = props.style
    const images = props.images ?? DEFAULTS.images
    const imageFit = props.imageFit ?? DEFAULTS.imageFit
    const seed = props.seed ?? DEFAULTS.seed
    const placeholder = fill(DEFAULTS.placeholder, props.placeholder)
    const grid = fill(DEFAULTS.grid, props.grid)
    const lens = fill(DEFAULTS.lens, props.lens)
    const look = fill(DEFAULTS.look, props.look)
    const motion = fill(DEFAULTS.motion, props.motion)
    const hover = fill(DEFAULTS.hover, props.hover)
    const overlay = fill(DEFAULTS.overlay, props.overlay)
    const overlayFont = fill(DEFAULTS.overlay.titleFont, overlay.titleFont)

    const [error, setError] = React.useState<string | null>(null)

    const hostRef = React.useRef<HTMLDivElement>(null)

    // live, fully-populated values for the render loop — tweaking motion /
    // hover / colour never rebuilds the scene
    const live = React.useRef<any>(null)
    live.current = {
        images, imageFit, seed, placeholder, grid, lens, look, motion, hover, overlay,
    }

    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const imageKey = React.useMemo(
        () =>
            (images || [])
                .map((i: any) => (typeof i === "string" ? i : i?.src || ""))
                .join("|"),
        [images]
    )

    // only these force a rebuild of the sphere
    const structuralKey = JSON.stringify([
        imageKey,
        imageFit,
        seed,
        placeholder,
        grid,
        lens.fieldOfView,
        lens.antialias,
        isCanvas,
    ])

    React.useEffect(() => {
        const host = hostRef.current
        if (!host) return
        let teardown: (() => void) | null = null

        try {
        const P0 = live.current
        const G = P0.grid
        const PH = P0.placeholder

        /* ---------------------------------------------------------------
           SEEDED RANDOM — layout and placeholder art stay identical
           across re-renders until you change the Seed control
        --------------------------------------------------------------- */
        const mulberry32 = (a: number) => () => {
            a |= 0
            a = (a + 0x6d2b79f5) | 0
            let t = Math.imul(a ^ (a >>> 15), 1 | a)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
        let rngState = (seed | 0) || 1
        const rnd = () => {
            rngState = (rngState * 1664525 + 1013904223) | 0
            return mulberry32(rngState)()
        }
        const rand = (a: number, b: number) => a + rnd() * (b - a)
        const pick = (a: any[]) => a[(rnd() * a.length) | 0]
        const shuffle = (a: any[]) => {
            for (let i = a.length - 1; i > 0; i--) {
                const j = (rnd() * (i + 1)) | 0
                ;[a[i], a[j]] = [a[j], a[i]]
            }
            return a
        }

        /* ---------------------------------------------------------------
           SCENE
        --------------------------------------------------------------- */
        const scene = new THREE.Scene()
        scene.fog = new THREE.FogExp2(0x000000, P0.look.fog)

        // Framer can mount the component before layout settles — fall back
        // to the intrinsic size and let the ResizeObserver correct it
        const sizeOf = () => ({
            w: host.clientWidth || host.offsetWidth || 1200,
            h: host.clientHeight || host.offsetHeight || 700,
        })
        const s0 = sizeOf()

        const camera = new THREE.PerspectiveCamera(
            P0.lens.fieldOfView,
            s0.w / s0.h,
            0.1,
            400
        )

        const renderer = new THREE.WebGLRenderer({
            antialias: P0.lens.antialias,
            alpha: true,
        })
        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, P0.lens.maxPixelRatio)
        )
        renderer.setSize(s0.w, s0.h)
        renderer.setClearColor(0x000000, 0)
        if ("outputColorSpace" in renderer && (THREE as any).SRGBColorSpace) {
            ;(renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace
        } else if ((THREE as any).sRGBEncoding !== undefined) {
            ;(renderer as any).outputEncoding = (THREE as any).sRGBEncoding
        }

        const canvas = renderer.domElement
        canvas.style.display = "block"
        canvas.style.width = "100%"
        canvas.style.height = "100%"
        canvas.style.touchAction = "none"
        host.appendChild(canvas)

        const group = new THREE.Group()
        scene.add(group)

        const disposables: any[] = []
        const tagSRGB = (t: any) => {
            if ("colorSpace" in t && (THREE as any).SRGBColorSpace) {
                t.colorSpace = (THREE as any).SRGBColorSpace
            } else if ((THREE as any).sRGBEncoding !== undefined) {
                t.encoding = (THREE as any).sRGBEncoding
            }
            return t
        }
        const mip =
            (THREE as any).LinearMipmapLinearFilter ??
            (THREE as any).LinearMipMapLinearFilter

        const TEX_W = 512
        const TEX_H = Math.round(512 / G.cardAspect)
        const CORNER = Math.min(TEX_W, TEX_H) * G.cornerRadius

        function roundRect(c: any, x: number, y: number, w: number, h: number, r: number) {
            r = Math.min(r, w / 2, h / 2)
            c.beginPath()
            c.moveTo(x + r, y)
            c.arcTo(x + w, y, x + w, y + h, r)
            c.arcTo(x + w, y + h, x, y + h, r)
            c.arcTo(x, y + h, x, y, r)
            c.arcTo(x, y, x + w, y, r)
            c.closePath()
        }

        /* ---------------------------------------------------------------
           ROUNDED MASK + EDGE-LIGHT FRAME
           (alpha mask keeps cross-origin images from tainting a canvas)
        --------------------------------------------------------------- */
        const maskTex = (() => {
            const cv = document.createElement("canvas")
            cv.width = TEX_W
            cv.height = TEX_H
            const c = cv.getContext("2d")!
            c.fillStyle = "#000"
            c.fillRect(0, 0, TEX_W, TEX_H)
            c.fillStyle = "#fff"
            roundRect(c, 0, 0, TEX_W, TEX_H, CORNER)
            c.fill()
            const t = new THREE.CanvasTexture(cv)
            disposables.push(t)
            return t
        })()

        const frameTex =
            G.edgeLight > 0
                ? (() => {
                      const cv = document.createElement("canvas")
                      cv.width = TEX_W
                      cv.height = TEX_H
                      const c = cv.getContext("2d")!
                      c.strokeStyle = "#fff"
                      c.lineWidth = Math.max(2, TEX_W * 0.006)
                      roundRect(c, 1.5, 1.5, TEX_W - 3, TEX_H - 3, CORNER)
                      c.stroke()
                      const t = new THREE.CanvasTexture(cv)
                      disposables.push(t)
                      return t
                  })()
                : null

        /* ---------------------------------------------------------------
           PLACEHOLDER ARTWORK
        --------------------------------------------------------------- */
        const PALETTES = [
            { bg: "#f5f2ec", ink: "#16150f", accent: "#2f4f36", soft: "#e3ddd0" },
            { bg: "#ffffff", ink: "#101114", accent: "#2f6df6", soft: "#eaeef6" },
            { bg: "#0d0d0d", ink: "#ffffff", accent: "#ccff2f", soft: "#1b1b1b" },
            { bg: "#e9f0e4", ink: "#1e2b1c", accent: "#6f9455", soft: "#d4e2ca" },
            { bg: "#f8e6ea", ink: "#3a1e26", accent: "#e35d84", soft: "#f0cfd8" },
            { bg: "#efe8dc", ink: "#2a251d", accent: "#b9773a", soft: "#e0d4bf" },
            { bg: "#171b25", ink: "#eef2f8", accent: "#6ea8ff", soft: "#252c3a" },
            { bg: "#fdfbf6", ink: "#121212", accent: "#0f7268", soft: "#e9e4d9" },
            { bg: "#f1eeff", ink: "#1b1436", accent: "#7a5cff", soft: "#e0dafa" },
            { bg: "#fff7e8", ink: "#241a09", accent: "#f0a02a", soft: "#f4e6cb" },
            { bg: "#101010", ink: "#f6f6f6", accent: "#ff4d3d", soft: "#1d1d1d" },
            { bg: "#e6eef2", ink: "#0f2029", accent: "#2f7f9c", soft: "#d3e2e9" },
        ]
        const LIGHT = [0, 1, 3, 4, 5, 7, 8, 9, 11]
        const DARK = [2, 6, 10]
        const pickPalette = () =>
            PALETTES[rnd() < PH.lightRatio ? pick(LIGHT) : pick(DARK)]

        const NAMES = (PH.names || "")
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
        const LINES = (PH.headlines || "")
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)

        function cycler(arr: any[]) {
            let bag: any[] = []
            return () => {
                if (!arr.length) return ""
                if (!bag.length) bag = shuffle(arr.slice())
                return bag.pop()
            }
        }
        const nextName = cycler(NAMES)
        const nextLine = cycler(LINES)

        function fitText(c: any, text: string, maxW: number, px: number, weight: any, family: string) {
            let size = px
            do {
                c.font = `${weight} ${Math.round(size)}px ${family}`
                if (c.measureText(text).width <= maxW) break
                size *= 0.94
            } while (size > 8)
        }
        function textBlock(c: any, x: number, y: number, w: number, lines: number, size: number, gap: number, color: string, alpha: number) {
            c.fillStyle = color
            c.globalAlpha = alpha
            for (let i = 0; i < lines; i++) {
                const lw = w * (i === lines - 1 ? rand(0.4, 0.7) : rand(0.85, 1))
                c.fillRect(x, y + i * (size + gap), lw, size)
            }
            c.globalAlpha = 1
        }
        function drawNav(c: any, w: number, dark: boolean) {
            c.fillStyle = dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.72)"
            const y = w * 0.055
            c.fillRect(w * 0.05, y, w * 0.1, w * 0.014)
            let x = w * 0.6
            for (let i = 0; i < 4; i++) {
                c.globalAlpha = 0.55
                c.fillRect(x, y, w * 0.055, w * 0.012)
                x += w * 0.085
            }
            c.globalAlpha = 1
        }

        function makePlaceholder() {
            const w = TEX_W, h = TEX_H
            const cv = document.createElement("canvas")
            cv.width = w
            cv.height = h
            const ctx = cv.getContext("2d")!
            const p = pickPalette()
            const dark = parseInt(p.bg.slice(1, 3), 16) < 90

            ctx.fillStyle = p.bg
            ctx.fillRect(0, 0, w, h)

            const q = rnd()
            const kind =
                q < 0.28 ? "hero" :
                q < 0.5 ? "editorial" :
                q < 0.66 ? "grid" :
                q < 0.82 ? "product" :
                q < 0.94 ? "split" : "type"

            if (kind === "hero") {
                const g = ctx.createLinearGradient(0, 0, w, h * 0.9)
                g.addColorStop(0, p.accent)
                g.addColorStop(1, p.soft)
                ctx.fillStyle = g
                ctx.fillRect(0, 0, w, h * 0.72)
                ctx.fillStyle = "rgba(0,0,0,0.28)"
                ctx.fillRect(0, h * 0.32, w, h * 0.4)
                ctx.fillStyle = "#fff"
                const nm = nextName()
                fitText(ctx, nm, w * 0.88, h * 0.115, 600, "Georgia, serif")
                ctx.fillText(nm, w * 0.06, h * 0.6)
                textBlock(ctx, w * 0.06, h * 0.8, w * 0.55, 2, h * 0.028, h * 0.035, p.ink, 0.45)
                drawNav(ctx, w, true)
            } else if (kind === "editorial") {
                drawNav(ctx, w, dark)
                ctx.fillStyle = p.ink
                const line = nextLine()
                ctx.textAlign = "center"
                fitText(ctx, line, w * 0.84, h * 0.135, 400, "Georgia, serif")
                ctx.fillText(line, w / 2, h * 0.44)
                ctx.textAlign = "left"
                ctx.fillStyle = p.soft
                ctx.fillRect(w * 0.3, h * 0.58, w * 0.4, h * 0.26)
                ctx.fillStyle = p.accent
                ctx.globalAlpha = 0.85
                ctx.fillRect(w * 0.3, h * 0.58, w * 0.4, h * 0.05)
                ctx.globalAlpha = 1
            } else if (kind === "grid") {
                drawNav(ctx, w, dark)
                const cols = 3, gr = 2
                const pad = w * 0.05, gx = w * 0.025
                const cw = (w - pad * 2 - gx * (cols - 1)) / cols
                const ch = (h * 0.62 - gx * (gr - 1)) / gr
                for (let y = 0; y < gr; y++) {
                    for (let x = 0; x < cols; x++) {
                        const qq = pickPalette()
                        ctx.fillStyle = rnd() > 0.35 ? qq.accent : p.ink
                        ctx.globalAlpha = rnd() > 0.35 ? rand(0.65, 1) : 0.14
                        const hh = ch * rand(0.72, 1)
                        roundRect(ctx, pad + x * (cw + gx), h * 0.2 + y * (ch + gx), cw, hh, CORNER * 0.5)
                        ctx.fill()
                        ctx.globalAlpha = 0.18
                        ctx.strokeStyle = p.ink
                        ctx.lineWidth = Math.max(1, w * 0.002)
                        ctx.stroke()
                    }
                }
                ctx.globalAlpha = 1
            } else if (kind === "product") {
                drawNav(ctx, w, dark)
                const g = ctx.createRadialGradient(w * 0.5, h * 0.48, 4, w * 0.5, h * 0.48, h * 0.42)
                g.addColorStop(0, p.accent)
                g.addColorStop(1, p.soft)
                ctx.fillStyle = g
                ctx.beginPath()
                ctx.arc(w * 0.5, h * 0.48, h * 0.26, 0, Math.PI * 2)
                ctx.fill()
                textBlock(ctx, w * 0.36, h * 0.8, w * 0.28, 2, h * 0.026, h * 0.03, p.ink, 0.5)
                ctx.fillStyle = p.accent
                roundRect(ctx, w * 0.41, h * 0.9, w * 0.18, h * 0.06, h * 0.03)
                ctx.fill()
            } else if (kind === "type") {
                ctx.fillStyle = p.accent
                ctx.fillRect(0, 0, w, h)
                ctx.fillStyle = dark ? "#0b0b0b" : rnd() > 0.5 ? "#0b0b0b" : "#fff"
                const word = (nextName() || "Studio").split(" ")[0].toUpperCase()
                ctx.textAlign = "center"
                fitText(ctx, word, w * 0.86, h * 0.34, 800, "Helvetica, Arial, sans-serif")
                ctx.fillText(word, w / 2, h * 0.6)
                ctx.textAlign = "left"
                ctx.globalAlpha = 0.4
                ctx.fillRect(w * 0.08, h * 0.72, w * 0.84, h * 0.01)
                ctx.globalAlpha = 1
                textBlock(ctx, w * 0.08, h * 0.8, w * 0.42, 2, h * 0.022, h * 0.028, dark ? "#fff" : "#0b0b0b", 0.42)
                drawNav(ctx, w, !dark)
            } else {
                ctx.fillStyle = p.soft
                ctx.fillRect(0, 0, w * 0.48, h)
                ctx.fillStyle = p.accent
                ctx.globalAlpha = 0.9
                ctx.fillRect(w * 0.48, h * 0.16, w * 0.52, h * 0.68)
                ctx.globalAlpha = 1
                ctx.fillStyle = p.ink
                const nm = (nextName() || "Studio").split(" ")[0]
                fitText(ctx, nm, w * 0.38, h * 0.1, 500, "Georgia, serif")
                ctx.fillText(nm, w * 0.06, h * 0.42)
                textBlock(ctx, w * 0.06, h * 0.52, w * 0.34, 3, h * 0.022, h * 0.028, p.ink, 0.4)
                drawNav(ctx, w, dark)
            }

            if (rnd() < PH.chrome) {
                ctx.fillStyle = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)"
                ctx.fillRect(0, 0, w, h * 0.075)
                ;["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
                    ctx.fillStyle = c
                    ctx.globalAlpha = 0.75
                    ctx.beginPath()
                    ctx.arc(w * 0.035 + i * w * 0.028, h * 0.038, h * 0.012, 0, Math.PI * 2)
                    ctx.fill()
                })
                ctx.globalAlpha = 1
            }

            const t = new THREE.CanvasTexture(cv)
            tagSRGB(t)
            t.minFilter = mip
            disposables.push(t)
            return t
        }

        /* ---------------------------------------------------------------
           TEXTURES
        --------------------------------------------------------------- */
        let dirty = true
        const urls: string[] = (images || [])
            .map((i: any) => (typeof i === "string" ? i : i?.src))
            .filter(Boolean)

        const maxAniso = renderer.capabilities.getMaxAnisotropy
            ? renderer.capabilities.getMaxAnisotropy()
            : 1
        const byTexture = new Map<any, any[]>()

        function loadImageTexture(url: string) {
            const loader = new THREE.TextureLoader()
            loader.setCrossOrigin("anonymous")
            const tex = loader.load(
                url,
                (t: any) => {
                    const ia = t.image.width / t.image.height
                    if (imageFit === "cover") {
                        if (ia > G.cardAspect) {
                            t.repeat.set(G.cardAspect / ia, 1)
                            t.offset.set((1 - G.cardAspect / ia) / 2, 0)
                        } else {
                            t.repeat.set(1, ia / G.cardAspect)
                            t.offset.set(0, (1 - ia / G.cardAspect) / 2)
                        }
                        t.needsUpdate = true
                    } else {
                        // contain — reshape the card itself to the image
                        const list = byTexture.get(t) || []
                        list.forEach((c: any) => {
                            if (ia > G.cardAspect) c.baseScale[1] = G.cardAspect / ia
                            else c.baseScale[0] = ia / G.cardAspect
                        })
                    }
                    dirty = true
                },
                undefined,
                () => { dirty = true }
            )
            tagSRGB(tex)
            tex.anisotropy = maxAniso
            tex.minFilter = mip
            disposables.push(tex)
            return tex
        }

        const TEXTURES: any[] = []
        if (urls.length) {
            urls.forEach((u) => TEXTURES.push(loadImageTexture(u)))
        } else {
            for (let i = 0; i < 26; i++) TEXTURES.push(makePlaceholder())
            shuffle(TEXTURES)
        }

        const glowTex = (() => {
            const s = 128
            const cv = document.createElement("canvas")
            cv.width = cv.height = s
            const c = cv.getContext("2d")!
            const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
            g.addColorStop(0, "rgba(255,255,255,0.55)")
            g.addColorStop(0.45, "rgba(255,255,255,0.16)")
            g.addColorStop(1, "rgba(255,255,255,0)")
            c.fillStyle = g
            c.fillRect(0, 0, s, s)
            const t = new THREE.CanvasTexture(cv)
            disposables.push(t)
            return t
        })()

        /* ---------------------------------------------------------------
           SPACING — either you set the card size and the gaps fall out,
           or you set the gaps and the card size is solved for.

           Rows near the top and bottom sit on a narrower circle, so the
           horizontal gap is honoured at the TIGHTEST row: card width and
           the vertical band depend on each other, and a few passes settle
           it (each pass converges quickly — 6 is far more than enough).
        --------------------------------------------------------------- */
        const ring = (phi: number) =>
            (2 * Math.PI * G.distance * Math.sin(phi)) / G.columns

        let CARD_W = G.cardWidth
        let BAND_TOP = G.bandTop
        let BAND_BOTTOM = G.bandBottom

        if (G.gapMode) {
            let phiTop = Math.PI / 2
            CARD_W = Math.max(0.2, ring(Math.PI / 2) - G.gapX)
            for (let i = 0; i < 6; i++) {
                const ch = CARD_W / G.cardAspect
                const span = Math.max(0, G.rows - 1) * (ch + G.gapY) // world units
                const half = span / 2 / G.distance                   // radians
                phiTop = Math.max(0.05 * Math.PI, Math.PI / 2 - half)
                CARD_W = Math.max(0.2, ring(phiTop) - G.gapX)
            }
            BAND_TOP = phiTop / Math.PI
            BAND_BOTTOM = 1 - BAND_TOP
        }

        const cards: any[] = []
        const CARD_H = CARD_W / G.cardAspect
        const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)
        disposables.push(cardGeo)

        let seq = 0
        for (let row = 0; row < G.rows; row++) {
            const t = G.rows === 1 ? 0.5 : row / (G.rows - 1)
            const phiBase = (BAND_TOP + t * (BAND_BOTTOM - BAND_TOP)) * Math.PI
            const rowOffset = (row % 2) * ((Math.PI / G.columns) * G.stagger)

            for (let col = 0; col < G.columns; col++) {
                const tex = TEXTURES[seq % TEXTURES.length]
                seq++
                if (rnd() > G.density) continue // deliberate hole

                const step = (Math.PI * 2) / G.columns
                const theta =
                    col * step + rowOffset + rand(-1, 1) * step * G.angleJitter
                const phi = phiBase + rand(-1, 1) * 0.035 * Math.PI * G.angleJitter
                const rad = G.distance + rand(-1, 1) * G.depthVariation
                const s = 1 + rand(-1, 1) * G.sizeVariation

                const mat = new THREE.MeshBasicMaterial({
                    map: tex,
                    alphaMap: maskTex,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.FrontSide,
                    fog: true,
                })
                disposables.push(mat)

                const mesh = new THREE.Mesh(cardGeo, mat)
                mesh.position.set(
                    rad * Math.sin(phi) * Math.sin(theta),
                    rad * Math.cos(phi),
                    rad * Math.sin(phi) * Math.cos(theta)
                )
                mesh.lookAt(0, 0, 0)
                if (G.tilt) mesh.rotateZ(rand(-G.tilt, G.tilt))
                group.add(mesh)

                // edge light
                let frameMat: any = null
                if (frameTex) {
                    frameMat = new THREE.MeshBasicMaterial({
                        map: frameTex,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        opacity: 0,
                        fog: true,
                    })
                    disposables.push(frameMat)
                    const frame = new THREE.Mesh(cardGeo, frameMat)
                    frame.position.set(0, 0, 0.002)
                    mesh.add(frame)
                }

                // halo
                const glowMat = new THREE.SpriteMaterial({
                    map: glowTex,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    opacity: 0,
                })
                disposables.push(glowMat)
                const glow = new THREE.Sprite(glowMat)
                glow.position.copy(mesh.position).multiplyScalar(1.012)
                group.add(glow)

                const card = {
                    mesh, mat, frameMat, glow, glowMat, tex,
                    basePos: mesh.position.clone(),
                    dir: mesh.position.clone().normalize(),
                    baseScale: [s, s],
                    hover: 0,
                    glowW: CARD_W * 1.9 * s,
                    glowH: CARD_H * 2.2 * s,
                }
                mesh.scale.set(s, s, 1)
                glow.scale.set(card.glowW, card.glowH, 1)
                ;(mesh as any).userData.card = card
                cards.push(card)

                const list = byTexture.get(tex) || []
                list.push(card)
                byTexture.set(tex, list)
            }
        }
        const meshes = cards.map((c) => c.mesh)

        /* ---------------------------------------------------------------
           INPUT
        --------------------------------------------------------------- */
        let targetY = (P0.motion.startAngle * Math.PI) / 180
        let targetX = (P0.motion.startPitch * Math.PI) / 180
        let currentY = targetY
        let currentX = targetX
        let velY = 0, velX = 0
        let dragging = false
        let idle = 0
        let lastX = 0, lastY = 0
        let pendingDX = 0, pendingDY = 0     // input collected between frames
        let parallaxX = 0, parallaxY = 0     // where the cursor is
        let parX = 0, parY = 0               // eased parallax actually applied

        const raycaster = new THREE.Raycaster()
        const ndc = new THREE.Vector2()
        let hoverEnabled = false
        let hovered: any = null
        let hoverMix = 0

        const sens = () =>
            live.current.motion.dragSpeed *
            (1400 / Math.max(host.clientWidth, 700)) *
            (live.current.motion.invert ? -1 : 1)

        const setCursor = (c: string) => {
            canvas.style.cursor = live.current.hover.cursor ? c : "default"
        }
        setCursor("grab")

        const onPointerDown = (e: PointerEvent) => {
            if (!live.current.motion.drag) return
            dragging = true
            idle = 0
            velY = velX = 0
            pendingDX = pendingDY = 0
            clock.getDelta()          // drop the idle gap so frame 1 is normal
            lastX = e.clientX
            lastY = e.clientY
            canvas.setPointerCapture(e.pointerId)
            setCursor("grabbing")
        }

        const onPointerMove = (e: PointerEvent) => {
            hoverEnabled = e.pointerType === "mouse"
            const r = canvas.getBoundingClientRect()
            ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
            ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
            parallaxX = ndc.x
            parallaxY = -ndc.y
            if (!dragging) return

            // Collect movement and let the frame apply it. Several pointer
            // events can land between two frames; summing them keeps the
            // throw speed honest and the motion even.
            const events: any[] =
                (e as any).getCoalescedEvents?.() || [e]
            for (const ev of events) {
                pendingDX += ev.clientX - lastX
                pendingDY += ev.clientY - lastY
                lastX = ev.clientX
                lastY = ev.clientY
            }
            idle = 0
        }

        const endDrag = (e: PointerEvent) => {
            if (!dragging) return
            dragging = false
            const TOP = live.current.motion.pitchLimit
            targetX = Math.max(-TOP, Math.min(TOP, targetX))
            setCursor(hovered ? "pointer" : "grab")
            try { canvas.releasePointerCapture(e.pointerId) } catch (_) {}
        }

        const onPointerLeave = () => {
            hoverEnabled = false
            hovered = null
        }

        const onWheel = (e: WheelEvent) => {
            if (!live.current.motion.wheel) return
            e.preventDefault()
            idle = 0
            const d = e.deltaY * live.current.motion.wheelSpeed * 0.35
            targetY -= d
            velY = -d * 0.6
        }

        canvas.addEventListener("pointerdown", onPointerDown)
        canvas.addEventListener("pointermove", onPointerMove)
        canvas.addEventListener("pointerup", endDrag)
        canvas.addEventListener("pointercancel", endDrag)
        canvas.addEventListener("pointerleave", onPointerLeave)
        canvas.addEventListener("wheel", onWheel, { passive: false })

        /* ---------------------------------------------------------------
           LOOP
        --------------------------------------------------------------- */
        const clock = new THREE.Clock()
        const q3 = new THREE.Quaternion()
        const eu = new THREE.Euler(0, 0, 0, "XYZ")
        const v3 = new THREE.Vector3()
        const smoothstep = (a: number, b: number, x: number) => {
            const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
            return t * t * (3 - 2 * t)
        }

        let lastFog = -1
        let lastFogColor = ""
        let warmup = 90        // always draw the first ~1.5s
        let raf = 0

        function frame() {
            raf = requestAnimationFrame(frame)
            const P = live.current
            const M = P.motion
            const H = P.hover
            const L = P.look
            const dt = Math.min(clock.getDelta(), 0.05)
            const f = Math.min(dt * 60, 2)   // never take a giant step after a stall
            const TOP = M.pitchLimit

            // ---- apply the drag collected since the last frame
            if (dragging) {
                if (pendingDX || pendingDY) {
                    const k = sens()
                    const dx = pendingDX * k
                    const dy = (M.lockVertical ? 0 : pendingDY) * k
                    pendingDX = pendingDY = 0

                    targetY -= dx
                    velY = -dx * 0.9

                    let next = targetX - dy
                    if (next > TOP) next = TOP + (next - TOP) * M.rubber
                    else if (next < -TOP) next = -TOP + (next + TOP) * M.rubber
                    velX = (next - targetX) * 0.9
                    targetX = next
                } else {
                    // finger held still — bleed off the throw so releasing
                    // after a pause does not fling
                    velY *= Math.pow(0.8, f)
                    velX *= Math.pow(0.8, f)
                }
            }

            if (!dragging) {
                targetY += velY * f
                targetX += velX * f
                velY *= Math.pow(M.friction, f)
                velX *= Math.pow(M.friction, f)
                if (Math.abs(velY) < 1e-5) velY = 0
                if (Math.abs(velX) < 1e-5) velX = 0

                if (targetX > TOP) targetX += (TOP - targetX) * 0.12 * f
                if (targetX < -TOP) targetX += (-TOP - targetX) * 0.12 * f

                idle += dt
                if (!isCanvas && M.autoDrift) {
                    const ramp =
                        smoothstep(M.driftDelay, M.driftDelay + 1.6, idle) *
                        (1 - Math.min(1, Math.abs(velY) * 200)) *
                        (H.pauseDrift ? 1 - hoverMix : 1)
                    targetY -=
                        M.autoDrift * 0.001 * ramp * f *
                        (M.driftDirection === "right" ? -1 : 1)
                }
            } else {
                idle = 0
            }

            // follow the pointer closely while dragging, coast gently after
            const ease = 1 - Math.pow(1 - (dragging ? M.dragSmoothing : M.smoothing), f)
            const prevY = currentY, prevX = currentX
            currentY += (targetY - currentY) * ease
            currentX += (targetX - currentX) * ease

            // parallax eases to zero on press instead of snapping there
            const pEase = 1 - Math.pow(1 - 0.08, f)
            const wantX = dragging ? 0 : parallaxX * M.parallax
            const wantY = dragging ? 0 : parallaxY * M.parallax * 0.75
            parX += (wantX - parX) * pEase
            parY += (wantY - parY) * pEase

            group.rotation.y = currentY + parX
            group.rotation.x = Math.max(
                -TOP - M.overshoot,
                Math.min(TOP + M.overshoot, currentX + parY)
            )

            // hover pick
            if (!H.enabled || !hoverEnabled || dragging || isCanvas) {
                hovered = null
            } else {
                raycaster.setFromCamera(ndc, camera)
                const hit = raycaster.intersectObjects(meshes, false)[0]
                hovered = hit ? (hit.object as any).userData.card : null
            }
            if (!dragging) setCursor(hovered ? "pointer" : "grab")

            const hEase = 1 - Math.pow(1 - H.speed, f)
            const prevMix = hoverMix
            hoverMix += ((hovered ? 1 : 0) - hoverMix) * hEase

            // live look values
            if (L.fog !== lastFog) {
                ;(scene.fog as any).density = L.fog
                lastFog = L.fog
                dirty = true
            }
            if (L.fogColor !== lastFogColor) {
                ;(scene.fog as any).color.set(L.fogColor)
                lastFogColor = L.fogColor
                dirty = true
            }

            eu.set(group.rotation.x, group.rotation.y, 0, "XYZ")
            q3.setFromEuler(eu)

            for (let i = 0; i < cards.length; i++) {
                const c = cards[i]
                v3.copy(c.dir).applyQuaternion(q3)
                const facing = -v3.z
                const k = smoothstep(L.fadeStart, L.fadeEnd, facing)
                let b = L.minBrightness + (1 - L.minBrightness) * Math.pow(k, L.fadeCurve)

                const want = c === hovered ? 1 : 0
                if (c.hover !== want) {
                    c.hover += (want - c.hover) * hEase
                    if (Math.abs(want - c.hover) < 0.001) c.hover = want
                }
                const hv = c.hover

                b *= 1 - H.dim * hoverMix * (1 - hv)
                b *= 1 + H.brightness * hv

                c.mat.color.setScalar(b)
                if (c.frameMat) c.frameMat.opacity = b * G.edgeLight
                c.glowMat.color.set(L.glowColor)
                c.glowMat.opacity = Math.pow(k, 2.4) * L.glow * (1 + H.glow * hv)

                const s = 1 + H.scale * hv
                c.mesh.scale.set(c.baseScale[0] * s, c.baseScale[1] * s, 1)
                if (hv > 0) {
                    c.mesh.position.copy(c.basePos).multiplyScalar(1 - H.lift * hv)
                    c.glow.position.copy(c.mesh.position).multiplyScalar(1.012)
                    c.glow.scale.set(c.glowW * s, c.glowH * s, 1)
                } else if (c.glow.scale.x !== c.glowW) {
                    c.mesh.position.copy(c.basePos)
                    c.glow.position.copy(c.basePos).multiplyScalar(1.012)
                    c.glow.scale.set(c.glowW, c.glowH, 1)
                }
            }

            const moved =
                dragging ||
                Math.abs(currentY - prevY) > 1e-6 ||
                Math.abs(currentX - prevX) > 1e-6 ||
                Math.abs(parX - wantX) > 1e-6 ||
                Math.abs(hoverMix - prevMix) > 1e-4
            if (moved || dirty || warmup > 0) {
                renderer.render(scene, camera)
                dirty = false
                if (warmup > 0) warmup--
            }
        }
        frame()

        /* ---------------------------------------------------------------
           RESIZE + CLEANUP
        --------------------------------------------------------------- */
        const ro = new ResizeObserver(() => {
            const { w, h } = sizeOf()
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setPixelRatio(
                Math.min(window.devicePixelRatio, live.current.lens.maxPixelRatio)
            )
            renderer.setSize(w, h)
            dirty = true
            warmup = Math.max(warmup, 5)
        })
        ro.observe(host)

        teardown = () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
            canvas.removeEventListener("pointerdown", onPointerDown)
            canvas.removeEventListener("pointermove", onPointerMove)
            canvas.removeEventListener("pointerup", endDrag)
            canvas.removeEventListener("pointercancel", endDrag)
            canvas.removeEventListener("pointerleave", onPointerLeave)
            canvas.removeEventListener("wheel", onWheel)
            disposables.forEach((d) => d.dispose && d.dispose())
            renderer.dispose()
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
        }
        setError(null)
        } catch (err: any) {
            // surface the problem instead of leaving an empty black frame
            console.error("[SphericalGallery]", err)
            setError(String(err?.message || err))
        }
        return () => { if (teardown) teardown() }
    }, [structuralKey])

    /* -------------------------------------------------------------------
       DOM
    ------------------------------------------------------------------- */
    const O = overlay
    return (
        <div
            style={{
                position: "relative",
                overflow: "hidden",
                background: look.background,
                userSelect: "none",
                WebkitUserSelect: "none",
                ...style,
            }}
        >
            <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />

            {error && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        textAlign: "center",
                        font: "500 13px/1.5 Inter, sans-serif",
                        color: "#ff6b6b",
                        background: "rgba(0,0,0,0.6)",
                    }}
                >
                    3D Gallery could not start: {error}
                </div>
            )}

            {look.vignette > 0 && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        opacity: look.vignette,
                        background: `radial-gradient(${look.vignetteSize}% ${
                            look.vignetteSize * 0.68
                        }% at 50% 50%, transparent 32%, ${look.vignetteColor} 100%)`,
                    }}
                />
            )}

            {O.showTitle && (
                <div
                    style={{
                        position: "absolute",
                        top: `calc(50% + ${O.offsetY}px)`,
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        pointerEvents: "none",
                        padding: "8% 12%",
                        background: O.backdrop
                            ? `radial-gradient(closest-side, rgba(0,0,0,${
                                  0.85 * O.backdrop
                              }) 0%, rgba(0,0,0,${0.55 * O.backdrop}) 45%, rgba(0,0,0,0) 100%)`
                            : "none",
                    }}
                >
                    <div
                        style={{
                            color: O.titleColor,
                            whiteSpace: "pre-line",
                            textShadow: `0 2px 18px rgba(0,0,0,${
                                0.95 * O.textShadow
                            }), 0 12px 60px rgba(0,0,0,${0.85 * O.textShadow})`,
                            ...overlayFont,
                        }}
                    >
                        {O.title}
                    </div>
                    {O.subtitle ? (
                        <div
                            style={{
                                marginTop: O.subtitleGap,
                                color: O.subtitleColor,
                                fontSize: O.subtitleSize,
                                letterSpacing: O.subtitleSpacing,
                                textTransform: O.subtitleUppercase
                                    ? "uppercase"
                                    : "none",
                                fontFamily: "Inter, sans-serif",
                            }}
                        >
                            {O.subtitle}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}

SphericalGallery.defaultProps = DEFAULTS

addPropertyControls(SphericalGallery, {
    /* ---------------- CONTENT ---------------- */
    images: {
        type: ControlType.Array,
        title: "Images",
        control: { type: ControlType.ResponsiveImage },
        defaultValue: DEFAULTS.images,
        description:
            "Leave empty to draw generated placeholder screenshots instead.",
    },
    imageFit: {
        type: ControlType.Enum,
        title: "Fit",
        defaultValue: DEFAULTS.imageFit,
        options: ["cover", "contain"],
        optionTitles: ["Cover", "Contain"],
        displaySegmentedControl: true,
    },
    seed: {
        type: ControlType.Number,
        title: "Seed",
        defaultValue: DEFAULTS.seed,
        min: 1,
        max: 9999,
        step: 1,
        description: "Re-rolls the placeholder art and any layout randomness.",
    },

    /* ---------------- GRID ---------------- */
    grid: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).grid,
        title: "Grid",
        controls: {
            rows: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.rows, title: "Rows", min: 1, max: 16, step: 1, displayStepper: true },
            columns: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.columns, title: "Columns", min: 3, max: 40, step: 1, displayStepper: true },
            gapMode: {
                type: ControlType.Boolean,
                defaultValue: (DEFAULTS as any).grid.gapMode,
                title: "Set By",
                enabledTitle: "Gap",
                disabledTitle: "Card",
                description:
                    "Card: you pick the card size, gaps fall out. Gap: you pick the gaps, the card size is solved for.",
            },
            cardWidth: {
                type: ControlType.Number,
                defaultValue: (DEFAULTS as any).grid.cardWidth,
                title: "Card Size", min: 0.5, max: 14, step: 0.1,
                hidden: (p: any) => !!p.gapMode,
            },
            gapX: {
                type: ControlType.Number,
                defaultValue: (DEFAULTS as any).grid.gapX,
                title: "Gap X", min: 0, max: 14, step: 0.1,
                hidden: (p: any) => !p.gapMode,
            },
            gapY: {
                type: ControlType.Number,
                defaultValue: (DEFAULTS as any).grid.gapY,
                title: "Gap Y", min: 0, max: 14, step: 0.1,
                hidden: (p: any) => !p.gapMode,
            },
            cardAspect: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.cardAspect, title: "Card Ratio", min: 0.3, max: 3.5, step: 0.01 },
            cornerRadius: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.cornerRadius, title: "Corners", min: 0, max: 0.5, step: 0.005 },
            edgeLight: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.edgeLight, title: "Edge Light", min: 0, max: 1, step: 0.02 },
            distance: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.distance, title: "Distance", min: 6, max: 70, step: 0.5 },
            bandTop: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.bandTop, title: "Band Top", min: 0.02, max: 0.5, step: 0.01, hidden: (p: any) => !!p.gapMode },
            bandBottom: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.bandBottom, title: "Band Bottom", min: 0.5, max: 0.98, step: 0.01, hidden: (p: any) => !!p.gapMode },
            stagger: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.stagger, title: "Stagger", min: 0, max: 1, step: 0.05 },
            density: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.density, title: "Fill", min: 0.2, max: 1, step: 0.02 },
            sizeVariation: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.sizeVariation, title: "Size Mix", min: 0, max: 0.6, step: 0.01 },
            depthVariation: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.depthVariation, title: "Depth Mix", min: 0, max: 6, step: 0.1 },
            angleJitter: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.angleJitter, title: "Scatter", min: 0, max: 0.6, step: 0.01 },
            tilt: { type: ControlType.Number, defaultValue: (DEFAULTS as any).grid.tilt, title: "Tilt", min: 0, max: 0.3, step: 0.005 },
        },
    },

    /* ---------------- LENS ---------------- */
    lens: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).lens,
        title: "Lens",
        controls: {
            fieldOfView: { type: ControlType.Number, defaultValue: (DEFAULTS as any).lens.fieldOfView, title: "FOV", min: 25, max: 115, step: 1, unit: "°" },
            maxPixelRatio: { type: ControlType.Number, defaultValue: (DEFAULTS as any).lens.maxPixelRatio, title: "Max DPR", min: 1, max: 3, step: 0.5 },
            antialias: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).lens.antialias, title: "Antialias" },
        },
    },

    /* ---------------- LOOK ---------------- */
    look: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).look,
        title: "Look",
        controls: {
            background: { type: ControlType.Color, defaultValue: (DEFAULTS as any).look.background, title: "Background" },
            fogColor: { type: ControlType.Color, defaultValue: (DEFAULTS as any).look.fogColor, title: "Fog Color" },
            fog: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.fog, title: "Fog", min: 0, max: 0.08, step: 0.001 },
            glow: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.glow, title: "Glow", min: 0, max: 0.8, step: 0.01 },
            glowColor: { type: ControlType.Color, defaultValue: (DEFAULTS as any).look.glowColor, title: "Glow Color" },
            fadeStart: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.fadeStart, title: "Fade In", min: 0, max: 1, step: 0.01 },
            fadeEnd: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.fadeEnd, title: "Fade Out", min: 0, max: 1, step: 0.005 },
            fadeCurve: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.fadeCurve, title: "Fade Curve", min: 0.3, max: 4, step: 0.02 },
            minBrightness: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.minBrightness, title: "Floor", min: 0, max: 0.5, step: 0.01 },
            vignette: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.vignette, title: "Vignette", min: 0, max: 1, step: 0.05 },
            vignetteColor: { type: ControlType.Color, defaultValue: (DEFAULTS as any).look.vignetteColor, title: "Vig. Color" },
            vignetteSize: { type: ControlType.Number, defaultValue: (DEFAULTS as any).look.vignetteSize, title: "Vig. Size", min: 60, max: 200, step: 5, unit: "%" },
        },
    },

    /* ---------------- MOTION ---------------- */
    motion: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).motion,
        title: "Motion",
        controls: {
            drag: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).motion.drag, title: "Drag" },
            dragSpeed: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.dragSpeed, title: "Drag Speed", min: 0.0005, max: 0.012, step: 0.0001 },
            invert: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).motion.invert, title: "Invert" },
            lockVertical: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).motion.lockVertical, title: "Lock Y" },
            wheel: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).motion.wheel, title: "Wheel" },
            wheelSpeed: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.wheelSpeed, title: "Wheel Speed", min: 0, max: 0.01, step: 0.0001 },
            friction: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.friction, title: "Glide", min: 0.75, max: 0.995, step: 0.005 },
            smoothing: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.smoothing, title: "Coast Smoothing", min: 0.02, max: 0.5, step: 0.01 },
            dragSmoothing: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.dragSmoothing, title: "Drag Follow", min: 0.05, max: 1, step: 0.01 },
            pitchLimit: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.pitchLimit, title: "Tilt Limit", min: 0, max: 1.2, step: 0.01 },
            rubber: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.rubber, title: "Rubber Band", min: 0, max: 1, step: 0.02 },
            overshoot: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.overshoot, title: "Overshoot", min: 0, max: 0.3, step: 0.01 },
            autoDrift: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.autoDrift, title: "Auto Drift", min: 0, max: 3, step: 0.01 },
            driftDirection: {
                type: ControlType.Enum,
                defaultValue: (DEFAULTS as any).motion.driftDirection,
                title: "Direction",
                options: ["left", "right"],
                optionTitles: ["Left", "Right"],
                displaySegmentedControl: true,
            },
            driftDelay: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.driftDelay, title: "Drift Delay", min: 0, max: 6, step: 0.1, unit: "s" },
            parallax: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.parallax, title: "Parallax", min: 0, max: 0.12, step: 0.005 },
            startAngle: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.startAngle, title: "Start Angle", min: -180, max: 180, step: 1, unit: "°" },
            startPitch: { type: ControlType.Number, defaultValue: (DEFAULTS as any).motion.startPitch, title: "Start Pitch", min: -40, max: 40, step: 1, unit: "°" },
        },
    },

    /* ---------------- HOVER ---------------- */
    hover: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).hover,
        title: "Hover",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).hover.enabled, title: "Enabled" },
            scale: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.scale, title: "Grow", min: 0, max: 0.8, step: 0.01 },
            lift: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.lift, title: "Step Forward", min: 0, max: 0.3, step: 0.005 },
            brightness: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.brightness, title: "Brighten", min: 0, max: 2, step: 0.05 },
            glow: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.glow, title: "Halo", min: 0, max: 10, step: 0.1 },
            dim: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.dim, title: "Dim Others", min: 0, max: 0.9, step: 0.01 },
            speed: { type: ControlType.Number, defaultValue: (DEFAULTS as any).hover.speed, title: "Speed", min: 0.03, max: 0.6, step: 0.01 },
            pauseDrift: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).hover.pauseDrift, title: "Pause Drift" },
            cursor: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).hover.cursor, title: "Cursors" },
        },
    },

    /* ---------------- OVERLAY ---------------- */
    overlay: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).overlay,
        title: "Overlay",
        controls: {
            showTitle: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).overlay.showTitle, title: "Show" },
            title: { type: ControlType.String, defaultValue: (DEFAULTS as any).overlay.title, title: "Title", displayTextArea: true },
            titleFont: { type: ControlType.Font, defaultValue: (DEFAULTS as any).overlay.titleFont, title: "Font", controls: "extended" },
            titleColor: { type: ControlType.Color, defaultValue: (DEFAULTS as any).overlay.titleColor, title: "Color" },
            textShadow: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.textShadow, title: "Shadow", min: 0, max: 1, step: 0.05 },
            subtitle: { type: ControlType.String, defaultValue: (DEFAULTS as any).overlay.subtitle, title: "Caption" },
            subtitleColor: { type: ControlType.Color, defaultValue: (DEFAULTS as any).overlay.subtitleColor, title: "Caption Color" },
            subtitleSize: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.subtitleSize, title: "Caption Size", min: 6, max: 32, step: 1 },
            subtitleSpacing: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.subtitleSpacing, title: "Tracking", min: 0, max: 12, step: 0.1 },
            subtitleUppercase: { type: ControlType.Boolean, defaultValue: (DEFAULTS as any).overlay.subtitleUppercase, title: "Uppercase" },
            subtitleGap: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.subtitleGap, title: "Caption Gap", min: 0, max: 80, step: 1 },
            offsetY: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.offsetY, title: "Offset Y", min: -400, max: 400, step: 1 },
            backdrop: { type: ControlType.Number, defaultValue: (DEFAULTS as any).overlay.backdrop, title: "Backdrop", min: 0, max: 1, step: 0.05 },
        },
    },

    /* ---------------- PLACEHOLDERS ---------------- */
    placeholder: {
        type: ControlType.Object,
        defaultValue: (DEFAULTS as any).placeholder,
        title: "Placeholders",
        description: "Only used while the Images list is empty.",
        controls: {
            lightRatio: { type: ControlType.Number, defaultValue: (DEFAULTS as any).placeholder.lightRatio, title: "Light Mix", min: 0, max: 1, step: 0.02 },
            chrome: { type: ControlType.Number, defaultValue: (DEFAULTS as any).placeholder.chrome, title: "Browser Bar", min: 0, max: 1, step: 0.02 },
            names: { type: ControlType.String, defaultValue: (DEFAULTS as any).placeholder.names, title: "Names", displayTextArea: true },
            headlines: { type: ControlType.String, defaultValue: (DEFAULTS as any).placeholder.headlines, title: "Headlines", displayTextArea: true },
        },
    },
})
