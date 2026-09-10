import ScrollAssembleImage from "./ScrollAssembleImage";
import source from "./ScrollAssembleImage.tsx?raw";
import vanillaSource from "./scroll-assemble-image.vanilla.js?raw";

const STYLES = ["scatter", "depth", "edges", "spiral", "wave", "glitch", "iris"];
const STYLE_LABELS = ["Scatter", "Depth (3D)", "Edges", "Spiral", "Wave", "Glitch", "Iris"];

export const controls = [
  {
    key: "preset",
    label: "Style",
    type: "select",
    default: "scatter",
    options: STYLES.map((value, i) => ({ value, label: STYLE_LABELS[i] })),
  },
  {
    key: "order",
    label: "Order",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto" },
      { value: "random", label: "Random" },
      { value: "center", label: "Center → Out" },
      { value: "outward", label: "Out → Center" },
      { value: "rows", label: "Rows" },
      { value: "columns", label: "Columns" },
      { value: "diagonal", label: "Diagonal" },
      { value: "spiral", label: "Spiral" },
    ],
  },
  { key: "image", label: "Image URL", type: "text", default: "https://picsum.photos/id/106/1600/900" },
  { key: "background", label: "Backdrop", type: "color", default: "#0d0d0d" },
  { key: "columns", label: "Columns", type: "range", min: 1, max: 16, step: 1, default: 4 },
  { key: "rows", label: "Rows", type: "range", min: 1, max: 16, step: 1, default: 3 },
  { key: "imageWidth", label: "Width", type: "range", min: 100, max: 1600, step: 10, unit: "px", default: 800 },
  { key: "imageHeight", label: "Height", type: "range", min: 100, max: 1200, step: 10, unit: "px", default: 450 },
  { key: "gap", label: "Gap", type: "range", min: 0, max: 40, step: 1, unit: "px", default: 0 },
  { key: "radius", label: "Radius", type: "range", min: 0, max: 60, step: 1, unit: "px", default: 0 },
  { key: "intensity", label: "Intensity", type: "range", min: 0, max: 2.5, step: 0.05, default: 1 },
  { key: "scrollDistance", label: "Scroll", type: "range", min: 25, max: 400, step: 5, unit: "vh", default: 150 },
  { key: "smoothing", label: "Scrub", type: "range", min: 0, max: 3, step: 0.1, default: 1.2 },
  { key: "stagger", label: "Stagger", type: "range", min: 0, max: 3, step: 0.05, default: 0.6 },
  { key: "duration", label: "Tile Time", type: "range", min: 0.05, max: 3, step: 0.05, default: 0.5 },
  { key: "blur", label: "Blur", type: "range", min: 0, max: 40, step: 1, unit: "px", default: 8 },
  { key: "seed", label: "Seed", type: "range", min: 1, max: 999, step: 1, default: 1 },
  { key: "showSwitcher", label: "Switcher", type: "toggle", on: "Show", off: "Hide", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Depth Dive",
    values: { preset: "depth", columns: 6, rows: 4, intensity: 1.4, scrollDistance: 220 },
  },
  {
    id: "v3",
    name: "Glitch Rows",
    values: { preset: "glitch", columns: 2, rows: 10, gap: 0, stagger: 0.25, smoothing: 0.4 },
  },
  {
    id: "v4",
    name: "Mosaic Iris",
    values: { preset: "iris", columns: 10, rows: 6, gap: 3, radius: 4, duration: 0.8 },
  },
];

const meta = {
  id: "scroll-assemble-image",
  name: "Scroll Assemble Image",
  category: "Scroll",
  tags: ["scroll", "image", "tiles", "reveal", "pin"],
  description:
    "An image shatters into tiles that reassemble as you scroll, across seven assembly styles and seven arrival orders.",
  component: ScrollAssembleImage,
  controls,
  variants,
  scroll: true,
  dependencies: ["framer-motion"],
  views: 3800,
  likes: 452,
  copies: 152,
  addedAt: "2026-08-29",
  pro: false,
  sources: {
    jsx: { name: "ScrollAssembleImage.tsx", lang: "tsx", code: source },
    vanilla: { name: "scroll-assemble-image.vanilla.js", lang: "js", code: vanillaSource },
  },
};

export default meta;
