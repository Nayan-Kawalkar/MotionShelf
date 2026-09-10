import ImageQueuePreview from "./ImageQueuePreview";
import source from "./ImageQueue.tsx?raw";
import htmlSource from "./index.html?raw";

// Flat keys, one per tunable. Names match the component's own props, which the
// workbench spreads straight onto it.
export const controls = [
  { key: "background", label: "Background", type: "color", default: "#C9C9C9" },
  { key: "accent", label: "Text", type: "color", default: "#111111" },
  { key: "aspect", label: "Ratio", type: "range", min: 0.4, max: 2.5, step: 0.01, default: 1 },
  { key: "scale", label: "Size", type: "range", min: 0.2, max: 1, step: 0.01, default: 0.86 },
  { key: "band", label: "Peek", type: "range", min: 0, max: 0.4, step: 0.005, default: 0.082 },
  { key: "shrink", label: "Shrink", type: "range", min: 0.5, max: 1, step: 0.01, default: 0.79 },
  { key: "fade", label: "Fade", type: "range", min: 0, max: 0.5, step: 0.01, default: 0.2 },
  { key: "radius", label: "Radius", type: "range", min: 0, max: 80, step: 1, unit: "px", default: 0 },
  { key: "tilt", label: "Tilt", type: "range", min: 0, max: 0.2, step: 0.005, default: 0.05 },
  { key: "threshold", label: "Throw At", type: "range", min: 10, max: 300, step: 5, unit: "px", default: 60 },
  { key: "fallSpeed", label: "Fall Speed", type: "range", min: 0.4, max: 3, step: 0.05, default: 1 },
  { key: "grayscale", label: "B&W", type: "toggle", on: "Mono", off: "Colour", default: true },
  { key: "showNav", label: "Arrows", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "navPlacement",
    label: "Arrows At",
    type: "select",
    when: (v) => v.showNav,
    options: [
      { value: "bottomCenter", label: "Bottom center" },
      { value: "bottomLeft", label: "Bottom left" },
      { value: "bottomRight", label: "Bottom right" },
      { value: "sides", label: "Sides" },
    ],
    default: "bottomCenter",
  },
  {
    key: "navSize",
    label: "Arrow Size",
    type: "range",
    when: (v) => v.showNav,
    min: 28,
    max: 88,
    step: 1,
    unit: "px",
    default: 46,
  },
  { key: "showCounter", label: "Counter", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "counterPlacement",
    label: "Counter At",
    type: "select",
    when: (v) => v.showCounter,
    options: [
      { value: "left", label: "Left" },
      { value: "topLeft", label: "Top left" },
      { value: "bottomLeft", label: "Bottom left" },
    ],
    default: "left",
  },
  { key: "showCaption", label: "Captions", type: "toggle", on: "Show", off: "Hide", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Wide Colour",
    values: { aspect: 1.6, grayscale: false, radius: 14, scale: 0.92, band: 0.05 },
  },
  {
    id: "v3",
    name: "Tall Stack",
    values: { aspect: 0.7, band: 0.18, shrink: 0.66, fade: 0.34, navPlacement: "sides" },
  },
  {
    id: "v4",
    name: "Bare",
    values: { showNav: false, showCounter: false, showCaption: false, background: "#111113" },
  },
];

const meta = {
  id: "image-queue",
  name: "Image Queue",
  category: "Image Gallery",
  tags: ["drag", "deck", "queue", "cards", "throw"],
  description:
    "A stack of cards you can throw away by dragging, or step through with arrows. Each release drops the card and pulls the queue forward.",
  component: ImageQueuePreview,
  controls,
  variants,
  previewBox: [900, 760],
  previewHeight: 700,
  views: 0,
  likes: 148,
  copies: 0,
  addedAt: "2026-09-11",
  pro: false,
  dependencies: ["framer-motion"],
  sources: {
    jsx: { name: "ImageQueue.tsx", lang: "tsx", code: source },
    // Already a complete standalone page, so the vanilla flavour hands it over
    // as-is rather than assembling one.
    html: { name: "index.html", lang: "html", code: htmlSource },
  },
};

export default meta;
