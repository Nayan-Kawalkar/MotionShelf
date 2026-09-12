import TarotCarouselPreview from "./TarotCarouselPreview";
import source from "./TarotCarousel.tsx?raw";
import htmlSource from "./index.html?raw";

// Flat keys, uniquely named across the component's grouped controls
// (geometry / motion / deal). TarotCarouselPreview folds them back into the
// object groups the component expects.
export const controls = [
  { key: "cream", label: "Frame", type: "color", default: "#f7f1e6" },
  { key: "backField", label: "Card Back", type: "color", default: "#1f0308" },
  { key: "patternRed", label: "Lattice", type: "color", default: "rgba(168,48,42,.46)" },
  { key: "patternInner", label: "Lattice Dot", type: "color", default: "rgba(126,32,28,.34)" },
  { key: "cardSize", label: "Card Size", type: "range", min: 20, max: 100, step: 1, unit: "%", default: 84 },
  { key: "aspect", label: "Aspect", type: "range", min: 0.6, max: 2.2, step: 0.005, default: 1.535 },
  { key: "spread", label: "Spread", type: "range", min: 0.2, max: 1, step: 0.001, default: 0.494 },
  { key: "perspective", label: "Camera", type: "range", min: 0.5, max: 3, step: 0.01, default: 1.147 },
  { key: "restYaw", label: "Rest Yaw", type: "range", min: 0, max: 30, step: 0.5, unit: "°", default: 9 },
  { key: "push", label: "Push", type: "range", min: 0, max: 500, step: 5, default: 170 },
  { key: "bump", label: "Bump", type: "range", min: 0, max: 400, step: 5, default: 90 },
  { key: "lean", label: "Lean", type: "range", min: 0, max: 10, step: 0.25, unit: "°", default: 2 },
  { key: "duration", label: "Turn Duration", type: "range", min: 200, max: 2400, step: 20, unit: "ms", default: 1000 },
  { key: "tiltMin", label: "Deal Tilt Min", type: "range", min: 0, max: 20, step: 0.5, unit: "°", default: 2.5 },
  { key: "tiltMax", label: "Deal Tilt Max", type: "range", min: 0, max: 20, step: 0.5, unit: "°", default: 10 },
  { key: "alternate", label: "Alternate Deal", type: "toggle", on: "On", off: "Off", default: true },
  { key: "headerTitle", label: "Title", type: "text", default: "The Eight" },
  { key: "membersLabel", label: "Link Label", type: "text", default: "Members" },
  { key: "showHeader", label: "Header", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showArrows", label: "Arrows", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "showCounter", label: "Counter", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "wheelControl", label: "Scroll Steps", type: "toggle", on: "On", off: "Off", default: true },
  { key: "autoPlay", label: "Autoplay", type: "toggle", on: "On", off: "Off", default: false },
  {
    key: "autoPlayDelay",
    label: "Every",
    type: "range",
    when: (v) => v.autoPlay,
    min: 800,
    max: 12000,
    step: 100,
    unit: "ms",
    default: 3600,
  },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Tight Fan",
    values: { spread: 0.28, cardSize: 68, restYaw: 18, push: 260, bump: 140 },
  },
  {
    id: "v3",
    name: "Flat Deck",
    values: { perspective: 0.7, restYaw: 0, lean: 0, tiltMin: 0, tiltMax: 0, aspect: 1.4 },
  },
  {
    id: "v4",
    name: "Auto Turn",
    values: { autoPlay: true, autoPlayDelay: 2200, duration: 700, showHeader: false },
  },
];

const meta = {
  id: "tarot-carousel",
  name: "Tarot Carousel",
  category: "Interactive Elements",
  tags: ["3d", "cards", "carousel", "flip", "deck"],
  description:
    "A fanned deck of tarot-style cards in 3D. Stepping through turns the active card face-up mid-flight while the fan re-deals around it.",
  component: TarotCarouselPreview,
  controls,
  variants,
  previewBox: [1200, 760],
  previewHeight: 700,
  views: 0,
  likes: 526,
  copies: 0,
  addedAt: "2026-09-11",
  pro: true,
  dependencies: [],
  sources: {
    jsx: { name: "TarotCarousel.tsx", lang: "tsx", code: source },
    // Already a complete standalone page, so the vanilla flavour hands it over
    // as-is rather than assembling one.
    html: { name: "index.html", lang: "html", code: htmlSource },
  },
};

export default meta;
