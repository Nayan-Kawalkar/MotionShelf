import PaintSpreadWordmark from "./PaintSpreadWordmark";
import source from "./PaintSpreadWordmark.tsx?raw";
import htmlSource from "./index.html?raw";

// Flat keys, one per tunable. Each matches a line in the component's
// `@controls` DEFAULTS block, so the exporters bake settings straight back in.
export const controls = [
  { key: "text", label: "Text", type: "text", default: "HERON AI" },
  { key: "background", label: "Ground", type: "color", default: "#EFEDE6" },
  { key: "paintColor", label: "Paint", type: "color", default: "#1E1E1B" },
  { key: "lineColor", label: "Blueprint", type: "color", default: "#2A2A26" },
  { key: "wetColor", label: "Wet Edge", type: "color", default: "#B6B3A8" },
  { key: "accent", label: "Cursor", type: "color", default: "#E8471C" },
  {
    key: "inkStyle",
    label: "Ink",
    type: "select",
    options: [
      { value: "bleed", label: "Bleed" },
      { value: "flood", label: "Flood" },
      { value: "dry", label: "Dry" },
      { value: "spray", label: "Spray" },
      { value: "scribble", label: "Scribble" },
    ],
    default: "bleed",
  },
  { key: "brush", label: "Brush", type: "range", min: 8, max: 80, step: 1, default: 30 },
  { key: "flow", label: "Flow", type: "range", min: 0, max: 100, step: 1, default: 58 },
  { key: "dry", label: "Dry", type: "range", min: 0, max: 100, step: 1, default: 26 },
  { key: "rate", label: "Rate", type: "range", min: 0, max: 100, step: 1, default: 34 },
  { key: "wetZone", label: "Wet Zone", type: "range", min: 1, max: 6, step: 0.1, default: 2.6 },
  { key: "smoothing", label: "Smoothing", type: "range", min: 0, max: 100, step: 1, default: 45 },
  { key: "edgeWobble", label: "Edge Wobble", type: "range", min: 0, max: 100, step: 1, default: 45 },
  { key: "dripChance", label: "Drips", type: "range", min: 0, max: 100, step: 1, default: 28 },
  { key: "wetOpacity", label: "Wet Opacity", type: "range", min: 0, max: 100, step: 1, default: 50 },
  { key: "stainOpacity", label: "Stain Opacity", type: "range", min: 0, max: 100, step: 1, default: 34 },
  { key: "fitWidth", label: "Fit Width", type: "range", min: 20, max: 100, step: 1, unit: "%", default: 89 },
  { key: "tracking", label: "Tracking", type: "range", min: 0, max: 0.3, step: 0.005, default: 0.055 },
  { key: "outlineWidth", label: "Outline", type: "range", min: 0, max: 6, step: 0.05, unit: "px", default: 1.05 },
  {
    key: "align",
    label: "Align",
    type: "select",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "center",
  },
  {
    key: "trigger",
    label: "Trigger",
    type: "select",
    options: [
      { value: "hover", label: "Hover" },
      { value: "press", label: "Press" },
    ],
    default: "hover",
  },
  { key: "showCursor", label: "Cursor", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "cursorSize",
    label: "Cursor Size",
    type: "range",
    when: (v) => v.showCursor,
    min: 2,
    max: 40,
    step: 1,
    unit: "px",
    default: 9,
  },
  { key: "showMarks", label: "Crop Marks", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showRuler", label: "Ruler", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "autoDemo", label: "Auto Demo", type: "toggle", on: "On", off: "Off", default: false },
  {
    key: "demoSpeed",
    label: "Demo Speed",
    type: "range",
    when: (v) => v.autoDemo,
    min: 10,
    max: 300,
    step: 5,
    default: 100,
  },
  {
    key: "quality",
    label: "Quality",
    type: "select",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
    default: "high",
  },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Flood",
    values: { inkStyle: "flood", brush: 54, flow: 84, dripChance: 62, wetZone: 4.2 },
  },
  {
    id: "v3",
    name: "Dry Scribble",
    values: { inkStyle: "scribble", brush: 14, dry: 78, flow: 30, wetOpacity: 18, edgeWobble: 80 },
  },
  {
    id: "v4",
    name: "Bare Plate",
    values: { showMarks: false, showRuler: false, showCursor: false, background: "#111113", paintColor: "#f4f4f5", lineColor: "#3a3a3a" },
  },
];

const meta = {
  id: "paint-spread-wordmark",
  name: "Paint Spread Wordmark",
  category: "Text",
  tags: ["canvas", "hover", "paint", "wordmark", "type"],
  description:
    "A blueprint wordmark that floods with wet paint as the cursor passes, bleeding outward from the stroke with drips and a drying stain behind it.",
  component: PaintSpreadWordmark,
  controls,
  variants,
  previewBox: [1200, 420],
  previewHeight: 420,
  views: 0,
  likes: 233,
  copies: 0,
  addedAt: "2026-09-11",
  pro: false,
  dependencies: [],
  sources: {
    jsx: { name: "PaintSpreadWordmark.tsx", lang: "tsx", code: source },
    // Already a complete standalone page, so the vanilla flavour hands it over
    // as-is rather than assembling one.
    html: { name: "index.html", lang: "html", code: htmlSource },
  },
};

export default meta;
