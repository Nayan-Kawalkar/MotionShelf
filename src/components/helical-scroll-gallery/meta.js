import HelicalScrollGallery from "./HelicalScrollGallery";
import source from "./HelicalScrollGallery.tsx?raw";
import vanillaSource from "./helical-scroll-gallery.vanilla.js?raw";

export const controls = [
  { key: "background", label: "Background", type: "color", default: "#111111" },
  { key: "title", label: "Title", type: "text", default: "Design In\nMotion" },
  { key: "subtitle", label: "Subtitle", type: "text", default: "Scroll to explore sequence" },
  { key: "cardCount", label: "Cards", type: "range", min: 1, max: 60, step: 1, default: 12 },
  { key: "scrollLength", label: "Scroll Length", type: "range", min: 100, max: 2000, step: 50, unit: "vh", default: 600 },
  { key: "smoothing", label: "Scrub", type: "range", min: 0, max: 3, step: 0.05, unit: "s", default: 0.6 },
  { key: "radiusX", label: "Arch Width", type: "range", min: 0, max: 12, step: 0.1, default: 3.8 },
  { key: "radiusZ", label: "Spiral Depth", type: "range", min: 0, max: 12, step: 0.1, default: 2.5 },
  { key: "turns", label: "Turns", type: "range", min: 0.5, max: 10, step: 0.5, default: 2.5 },
  { key: "pitch", label: "Climb Rate", type: "range", min: 0, max: 5, step: 0.1, default: 1.2 },
  { key: "tilt", label: "Roll", type: "range", min: 0, max: 1, step: 0.01, default: 0.15 },
  { key: "fogDensity", label: "Fog", type: "range", min: 0, max: 0.3, step: 0.005, default: 0.05 },
  { key: "fov", label: "FOV", type: "range", min: 10, max: 120, step: 1, unit: "°", default: 45 },
  { key: "cameraZ", label: "Camera Z", type: "range", min: 1, max: 40, step: 0.5, default: 10 },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Tight Spiral",
    values: { radiusX: 2.2, radiusZ: 1.6, turns: 6, cardCount: 24, pitch: 0.8, tilt: 0.35 },
  },
  {
    id: "v3",
    name: "Wide Arc",
    values: { radiusX: 6.4, radiusZ: 3.6, turns: 1.5, fov: 62, cardCount: 16, cameraZ: 12 },
  },
  {
    id: "v4",
    name: "Fog Bank",
    values: { background: "#05060a", fogDensity: 0.16, cardCount: 30, turns: 4, smoothing: 1.4 },
  },
];

const meta = {
  id: "helical-scroll-gallery",
  name: "Helical Scroll Gallery",
  category: "Scroll",
  tags: ["3d", "scroll", "gallery", "webgl", "three"],
  description:
    "Cards ride a 3D helix driven by scroll position, rendered in WebGL with depth fog and focal scaling.",
  component: HelicalScrollGallery,
  controls,
  variants,
  // Builds its own 100vh scroll track and pins itself, so the stage has to
  // scroll rather than clip.
  scroll: true,
  // Three.js is pulled from a CDN at runtime by the component itself.
  dependencies: ["framer-motion"],
  views: 3400,
  likes: 604,
  copies: 96,
  addedAt: "2026-08-29",
  pro: true,
  sources: {
    jsx: { name: "HelicalScrollGallery.tsx", lang: "tsx", code: source },
    vanilla: { name: "helical-scroll-gallery.vanilla.js", lang: "js", code: vanillaSource },
  },
};

export default meta;
