import CurvedCarousel from "./CurvedCarousel";
import jsxSource from "./CurvedCarousel.jsx?raw";
import framerSource from "./CurvedCarousel.framer.tsx?raw";
import vanillaSource from "./curved-carousel.vanilla.js?raw";

export const controls = [
  { key: "background", label: "Background", type: "color", default: "#ffffff" },
  { key: "textColor", label: "Text", type: "color", default: "#1c1a16" },
  { key: "accent", label: "Accent", type: "color", default: "#8b7f6e" },
  { key: "autoSpeed", label: "Auto Speed", type: "range", min: 0, max: 30, step: 0.5, unit: "°/s", default: 5 },
  { key: "dragSensitivity", label: "Drag", type: "range", min: 0.05, max: 1.2, step: 0.05, unit: "°/px", default: 0.35 },
  { key: "panelWidth", label: "Panel Width", type: "range", min: 120, max: 520, step: 4, unit: "px", default: 320 },
  { key: "panelAspect", label: "Panel Ratio", type: "range", min: 0.4, max: 1.6, step: 0.02, default: 0.72 },
  { key: "panelRadius", label: "Radius", type: "range", min: 0, max: 48, step: 1, unit: "px", default: 6 },
  { key: "showKicker", label: "Kicker", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "kicker",
    label: "Kicker Text",
    type: "text",
    default: "Studio Editions — Architecture & Interiors",
    when: (v) => v.showKicker,
  },
  { key: "showHeading", label: "Heading", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "heading",
    label: "Heading Text",
    type: "text",
    default: "The space you imagined",
    when: (v) => v.showHeading,
  },
  {
    key: "headingEmphasis",
    label: "Emphasis",
    type: "text",
    default: "has never been built before.",
    when: (v) => v.showHeading,
  },
  { key: "showHint", label: "Hint", type: "toggle", on: "Show", off: "Hide", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Variant 2 — Noir",
    values: {
      background: "#0a0a0b",
      textColor: "#f4f4f5",
      accent: "#ec5228",
      panelRadius: 2,
      autoSpeed: 8,
    },
  },
  {
    id: "v3",
    name: "Variant 3 — Wide",
    values: { panelWidth: 460, panelAspect: 0.56, panelRadius: 0, autoSpeed: 3, showKicker: false },
  },
  {
    id: "v4",
    name: "Variant 4 — Bare",
    values: { showKicker: false, showHeading: false, showHint: false, autoSpeed: 12, panelRadius: 20 },
  },
];

const meta = {
  id: "curved-carousel",
  name: "Curved Carousel",
  category: "Image Gallery",
  tags: ["carousel", "3d", "drag", "ring"],
  description: "3D curved carousel with drag momentum and auto-play rotation.",
  component: CurvedCarousel,
  controls,
  variants,
  previewBox: [1100, 688],
  views: 1500,
  copies: 74,
  addedAt: "2026-08-08",
  pro: false,
  sources: {
    jsx: { name: "CurvedCarousel.jsx", lang: "jsx", code: jsxSource },
    framer: { name: "CurvedCarousel.tsx", lang: "tsx", code: framerSource },
    vanilla: { name: "curved-carousel.vanilla.js", lang: "js", code: vanillaSource },
  },
};

export default meta;
