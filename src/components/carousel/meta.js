import Carousel from "./Carousel";
import jsxSource from "./Carousel.jsx?raw";
import cssSource from "./carousel.css?raw";
import vanillaSource from "./carousel.vanilla.js?raw";

// Every tunable prop the workbench exposes. `default` must match the component's
// own DEFAULTS block — the exporters bake these values back into that block.
export const controls = [
  { key: "accent", label: "Accent", type: "color", default: "#ffffff" },
  { key: "dotColor", label: "Dot", type: "color", default: "#d4d4d8" },
  { key: "cardWidth", label: "Card Width", type: "range", min: 140, max: 420, step: 2, unit: "px", default: 280 },
  { key: "cardHeight", label: "Card Height", type: "range", min: 200, max: 560, step: 4, unit: "px", default: 400 },
  { key: "radius", label: "Radius", type: "range", min: 0, max: 40, step: 1, unit: "px", default: 16 },
  { key: "spacing", label: "Spread", type: "range", min: 20, max: 130, step: 1, unit: "%", default: 62 },
  { key: "sideScale", label: "Falloff", type: "range", min: 0.4, max: 1, step: 0.02, default: 0.74 },
  { key: "speed", label: "Speed", type: "range", min: 150, max: 1200, step: 10, unit: "ms", default: 520 },
  { key: "showArrows", label: "Arrows", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showDots", label: "Dots", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showCaption", label: "Caption", type: "toggle", on: "Show", off: "Hide", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Variant 2",
    values: { accent: "#ec5228", radius: 4, spacing: 84, sideScale: 0.62, showCaption: false },
  },
  {
    id: "v3",
    name: "Variant 3",
    values: { accent: "#111113", dotColor: "#9ca3af", cardWidth: 200, cardHeight: 300, radius: 32, spacing: 46, speed: 320 },
  },
  {
    id: "v4",
    name: "Variant 4",
    values: { accent: "#38bdf8", cardWidth: 340, cardHeight: 480, radius: 8, spacing: 110, sideScale: 0.52, speed: 780, showArrows: false },
  },
];

const meta = {
  id: "carousel",
  name: "Coverflow Carousel",
  category: "Image Gallery",
  tags: ["carousel", "gallery", "3d", "slider"],
  description: "3D coverflow-style image carousel with keyboard and dot navigation.",
  component: Carousel,
  controls,
  variants,
  previewBox: [820, 512],
  views: 2900,
  copies: 112,
  addedAt: "2026-08-08",
  pro: false,
  sources: {
    jsx: { name: "Carousel.jsx", lang: "jsx", code: jsxSource },
    css: { name: "carousel.css", lang: "css", code: cssSource },
    vanilla: { name: "carousel.vanilla.js", lang: "js", code: vanillaSource },
  },
};

export default meta;
