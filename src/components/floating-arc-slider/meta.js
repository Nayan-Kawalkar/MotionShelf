import FloatingArcCardSlider from "./FloatingArcCardSlider";
import source from "./FloatingArcCardSlider.tsx?raw";

export const controls = [
  { key: "bgInner", label: "BG Center", type: "color", default: "#0c2b27" },
  { key: "bgOuter", label: "BG Edge", type: "color", default: "#041413" },
  { key: "cardBg", label: "Card", type: "color", default: "#09201e" },
  { key: "accent", label: "Accent", type: "color", default: "#2bdca3" },
  { key: "textMain", label: "Text", type: "color", default: "#e3f2ef" },
  { key: "cardWidth", label: "Card Width", type: "range", min: 60, max: 400, step: 1, unit: "px", default: 135 },
  { key: "cardHeight", label: "Card Height", type: "range", min: 80, max: 500, step: 1, unit: "px", default: 185 },
  { key: "cardGap", label: "Gap", type: "range", min: 0, max: 200, step: 1, unit: "px", default: 30 },
  { key: "cardRadius", label: "Radius", type: "range", min: 0, max: 40, step: 1, unit: "px", default: 10 },
  { key: "row1Depth", label: "Arc Depth", type: "range", min: -0.5, max: 0.5, step: 0.01, default: 0.12 },
  { key: "autoScroll", label: "Auto Scroll", type: "range", min: -8, max: 8, step: 0.1, default: 0 },
  { key: "hoverSpeed", label: "Hover Drift", type: "range", min: 0, max: 1, step: 0.01, default: 0.12 },
  { key: "floatAmount", label: "Float", type: "range", min: 0, max: 40, step: 0.5, unit: "px", default: 4.5 },
  { key: "opacityFalloff", label: "Fade Edges", type: "range", min: 0, max: 2, step: 0.01, default: 0.75 },
  { key: "rotateZAmount", label: "Tilt Z", type: "range", min: -45, max: 45, step: 0.5, unit: "°", default: 8 },
  { key: "grayscale", label: "Grayscale", type: "toggle", on: "On", off: "Off", default: true },
  { key: "glowEnabled", label: "Cursor Glow", type: "toggle", on: "On", off: "Off", default: true },
  {
    key: "glowRadius",
    label: "Glow Size",
    type: "range",
    min: 20,
    max: 400,
    step: 5,
    unit: "px",
    default: 100,
    when: (v) => v.glowEnabled,
  },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Mono",
    values: {
      bgInner: "#161616",
      bgOuter: "#0a0a0a",
      cardBg: "#161616",
      accent: "#ffffff",
      textMain: "#f5f5f5",
      cardRadius: 2,
    },
  },
  {
    id: "v3",
    name: "Amber Drift",
    values: {
      bgInner: "#241708",
      bgOuter: "#140d06",
      cardBg: "#241708",
      accent: "#f5a524",
      textMain: "#fdf3e3",
      autoScroll: 1.4,
      grayscale: false,
    },
  },
  {
    id: "v4",
    name: "Flat",
    values: { row1Depth: 0, floatAmount: 0, rotateZAmount: 0, glowEnabled: false, opacityFalloff: 0.3 },
  },
];

const meta = {
  id: "floating-arc-slider",
  name: "Floating Arc Card Slider",
  category: "Interactive Elements",
  tags: ["slider", "marquee", "drag", "cards", "arc"],
  description:
    "Two infinite card rows riding an inverted parabola, with drag momentum, hover drift and a cursor-tracking spotlight border.",
  component: FloatingArcCardSlider,
  controls,
  variants,
  previewHeight: 620,
  views: 2600,
  likes: 297,
  copies: 138,
  addedAt: "2026-08-29",
  pro: false,
  sources: {
    jsx: { name: "FloatingArcCardSlider.tsx", lang: "tsx", code: source },
  },
};

export default meta;
