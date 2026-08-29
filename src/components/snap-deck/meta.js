import SnapDeck from "./SnapDeck";
import source from "./SnapDeck.tsx?raw";

export const controls = [
  { key: "background", label: "Background", type: "color", default: "#0d0d0d" },
  { key: "accent", label: "Accent", type: "color", default: "#ccff00" },
  { key: "metaColor", label: "Label", type: "color", default: "#ffffff" },
  {
    key: "startMode",
    label: "Layout",
    type: "select",
    default: "horizontal",
    options: [
      { value: "horizontal", label: "Horizontal" },
      { value: "vertical", label: "Vertical" },
    ],
  },
  {
    key: "loop",
    label: "Loop",
    type: "select",
    default: "infinite",
    options: [
      { value: "infinite", label: "Infinite" },
      { value: "finite", label: "Finite" },
    ],
  },
  { key: "cardWidth", label: "Card Width", type: "range", min: 160, max: 700, step: 10, unit: "px", default: 420 },
  { key: "cardHeight", label: "Card Height", type: "range", min: 120, max: 600, step: 10, unit: "px", default: 280 },
  { key: "gap", label: "Gap", type: "range", min: 0, max: 120, step: 2, unit: "px", default: 16 },
  { key: "scrollSpeed", label: "Scroll Speed", type: "range", min: 0.1, max: 4, step: 0.1, default: 1 },
  { key: "snapDuration", label: "Snap", type: "range", min: 0.1, max: 2, step: 0.05, unit: "s", default: 0.45 },
  { key: "morphDuration", label: "Morph", type: "range", min: 0.1, max: 3, step: 0.05, unit: "s", default: 0.9 },
  { key: "focusDuration", label: "Bloom", type: "range", min: 0.1, max: 2, step: 0.05, unit: "s", default: 0.5 },
  { key: "thumbDesaturate", label: "Desaturate", type: "range", min: 0, max: 1, step: 0.05, default: 0.8 },
  { key: "thumbDim", label: "Dim", type: "range", min: 0, max: 1, step: 0.05, default: 0.35 },
  { key: "metaTitleSize", label: "Label Size", type: "range", min: 12, max: 80, step: 1, unit: "px", default: 36 },
  { key: "showMeta", label: "Label", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showCardText", label: "Card Text", type: "toggle", on: "Show", off: "Hide", default: false },
  { key: "showSwitcher", label: "Switcher", type: "toggle", on: "Show", off: "Hide", default: true },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Vertical",
    values: { startMode: "vertical", cardWidth: 460, morphDuration: 1.2 },
  },
  {
    id: "v3",
    name: "Finite Deck",
    values: { loop: "finite", showSwitcher: false, thumbDim: 0.55, accent: "#ffffff" },
  },
  {
    id: "v4",
    name: "Bare Cards",
    values: { showMeta: false, showCardText: true, thumbDesaturate: 0, thumbDim: 0, gap: 40 },
  },
];

const meta = {
  id: "snap-deck",
  name: "Snap Deck",
  category: "Interactive Elements",
  tags: ["deck", "snap", "carousel", "cards", "morph"],
  description:
    "An infinite card deck that snaps to a focal anchor and interpolates between row and column layouts, blooming the focused card back to full colour.",
  component: SnapDeck,
  controls,
  variants,
  previewHeight: 640,
  previewBox: [1100, 688],
  views: 4100,
  copies: 187,
  addedAt: "2026-08-29",
  pro: true,
  sources: {
    jsx: { name: "SnapDeck.tsx", lang: "tsx", code: source },
    framer: { name: "SnapDeck.tsx", lang: "tsx", code: source },
  },
};

export default meta;
