import SphereAlbumPreview from "./SphereAlbumPreview";
import source from "./SphereAlbum.tsx?raw";
import htmlSource from "./index.html?raw";

// Flat keys, one per tunable. Names match the component's own props, which is
// what the workbench passes straight through.
export const controls = [
  { key: "radius", label: "Radius", type: "range", min: 20, max: 70, step: 1, unit: "%", default: 46 },
  { key: "autoSpin", label: "Idle Spin", type: "range", min: 0, max: 1, step: 0.01, default: 0.11 },
  { key: "dragSpeed", label: "Drag Speed", type: "range", min: 0.1, max: 2, step: 0.01, default: 0.58 },
  { key: "wheelSpeed", label: "Scroll Speed", type: "range", min: 0, max: 1, step: 0.01, default: 0.26 },
  { key: "damping", label: "Glide", type: "range", min: 0.85, max: 0.99, step: 0.005, default: 0.945 },
  { key: "depthFade", label: "Depth Fade", type: "range", min: 0, max: 1, step: 0.01, default: 0.34 },
  { key: "depthBlur", label: "Depth Blur", type: "range", min: 0, max: 6, step: 0.1, unit: "px", default: 2.2 },
  { key: "hoverLift", label: "Hover Lift", type: "range", min: 0, max: 160, step: 1, unit: "px", default: 46 },
  { key: "introMs", label: "Intro", type: "range", min: 0, max: 3000, step: 50, unit: "ms", default: 900 },
  { key: "cardBackground", label: "Card Fill", type: "color", default: "#ffffff" },
  { key: "cardPadding", label: "Card Inset", type: "range", min: 0, max: 32, step: 1, unit: "px", default: 8 },
  { key: "cardRadius", label: "Card Radius", type: "range", min: 0, max: 40, step: 1, unit: "px", default: 0 },
  { key: "shadow", label: "Shadow", type: "toggle", on: "On", off: "Off", default: true },
  { key: "captureWheel", label: "Scroll Spins", type: "toggle", on: "Spin", off: "Page", default: true },
  { key: "enableZoom", label: "Pinch Zoom", type: "toggle", on: "On", off: "Off", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Tight Ball",
    values: { radius: 30, hoverLift: 80, depthFade: 0.55, depthBlur: 3.6, cardPadding: 4 },
  },
  {
    id: "v3",
    name: "Slow Drift",
    values: { autoSpin: 0.04, damping: 0.975, wheelSpeed: 0.12, introMs: 1800, radius: 58 },
  },
  {
    id: "v4",
    name: "Dark Cards",
    values: { cardBackground: "#111113", cardRadius: 14, shadow: false, depthFade: 0.6 },
  },
];

const meta = {
  id: "sphere-album",
  name: "Sphere Album",
  category: "Image Gallery",
  tags: ["3d", "sphere", "drag", "gallery", "inertia"],
  description:
    "A sphere of image cards on a Fibonacci lattice. Scroll spins it, drag tumbles it in any direction with inertia, click opens the card's link.",
  component: SphereAlbumPreview,
  controls,
  variants,
  previewBox: [900, 700],
  previewHeight: 660,
  views: 0,
  likes: 126,
  copies: 0,
  addedAt: "2026-09-11",
  pro: false,
  dependencies: [],
  sources: {
    jsx: { name: "SphereAlbum.tsx", lang: "tsx", code: source },
    // Already a complete standalone page, so the vanilla flavour hands it over
    // as-is rather than assembling one.
    html: { name: "index.html", lang: "html", code: htmlSource },
  },
};

export default meta;
