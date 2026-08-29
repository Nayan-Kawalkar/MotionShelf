import CurvedCardMarquee from "./CurvedCardMarquee";
import source from "./CurvedCardMarquee.tsx?raw";

export const controls = [
  {
    key: "mode",
    label: "Mode",
    type: "select",
    default: "Ticker",
    options: [
      { value: "Ticker", label: "Ticker" },
      { value: "Pinned", label: "Pinned section" },
    ],
  },
  {
    key: "curve",
    label: "Curve",
    type: "select",
    default: "Arc",
    options: ["Arc", "Valley", "Wave", "Tilt", "Cross", "Flat"].map((v) => ({ value: v, label: v })),
  },
  {
    key: "theme",
    label: "Theme",
    type: "select",
    default: "Emerald",
    options: ["Emerald", "Violet", "Amber", "Ice", "Mono", "Custom"].map((v) => ({ value: v, label: v })),
  },
  {
    key: "tickerSpeed",
    label: "Speed",
    type: "range",
    min: 0,
    max: 8,
    step: 0.1,
    default: 1.2,
    when: (v) => v.mode === "Ticker",
  },
  {
    key: "pinScroll",
    label: "Pin Scroll",
    type: "range",
    min: 0.5,
    max: 8,
    step: 0.25,
    unit: "×vh",
    default: 2,
    when: (v) => v.mode === "Pinned",
  },
  {
    key: "curveAmount",
    label: "Depth",
    type: "range",
    min: 0,
    max: 220,
    step: 1,
    unit: "px",
    default: 60,
    when: (v) => v.curve !== "Flat" && v.curve !== "Cross",
  },
  { key: "tiltAmount", label: "Card Tilt", type: "range", min: 0, max: 3, step: 0.05, default: 1 },
  { key: "rowCount", label: "Rows", type: "range", min: 1, max: 3, step: 1, default: 2 },
  { key: "cardsPerView", label: "Cards In View", type: "range", min: 1.5, max: 10, step: 0.1, default: 4.6 },
  { key: "cardAspect", label: "Aspect W:H", type: "range", min: 0.4, max: 2, step: 0.01, default: 0.82 },
  { key: "cardGap", label: "Gap", type: "range", min: 0, max: 120, step: 1, unit: "px", default: 24 },
  { key: "cardRadius", label: "Radius", type: "range", min: 0, max: 48, step: 1, unit: "px", default: 16 },
  { key: "depthScale", label: "Edge Shrink", type: "range", min: 0, max: 0.5, step: 0.01, default: 0.12 },
  { key: "edgeFade", label: "Edge Fade", type: "range", min: 0, max: 1, step: 0.05, default: 0.45 },
  { key: "baseGrayscale", label: "Greyscale", type: "range", min: 0, max: 100, step: 1, unit: "%", default: 80 },
  { key: "spotlight", label: "Spotlight", type: "toggle", on: "On", off: "Off", default: true },
  { key: "glowOrbs", label: "Glow Orbs", type: "toggle", on: "On", off: "Off", default: true },
  { key: "guideLine", label: "Guide Line", type: "toggle", on: "On", off: "Off", default: true },
  { key: "showProgress", label: "Progress", type: "toggle", on: "Show", off: "Hide", default: false },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Cross Ribbons",
    values: { curve: "Cross", theme: "Violet", rowCount: 2, tiltAmount: 1.4, guideLine: true },
  },
  {
    id: "v3",
    name: "Pinned Section",
    values: { mode: "Pinned", theme: "Ice", pinScroll: 3, curve: "Valley", showProgress: true },
  },
  {
    id: "v4",
    name: "Mono Flat",
    values: {
      theme: "Mono",
      curve: "Flat",
      rowCount: 1,
      glowOrbs: false,
      spotlight: false,
      guideLine: false,
      baseGrayscale: 100,
      cardsPerView: 6,
    },
  },
];

const meta = {
  id: "curved-card-marquee",
  name: "Curved Card Marquee",
  category: "Interactive Elements",
  tags: ["marquee", "ticker", "cards", "curve", "scroll"],
  description:
    "A card river bent along a real curve — arc, valley, wave, tilt or cross — running as a ticker or as a pinned scroll section.",
  component: CurvedCardMarquee,
  controls,
  variants,
  // Only the pinned mode builds its own scroll track; the ticker runs happily
  // inside a fixed stage.
  scroll: (values) => values.mode === "Pinned",
  previewHeight: 620,
  views: 2200,
  copies: 84,
  addedAt: "2026-08-29",
  pro: false,
  sources: {
    jsx: { name: "CurvedCardMarquee.tsx", lang: "tsx", code: source },
    framer: { name: "CurvedCardMarquee.tsx", lang: "tsx", code: source },
  },
};

export default meta;
