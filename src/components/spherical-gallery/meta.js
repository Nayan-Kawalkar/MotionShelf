import SphericalGalleryPreview from "./SphericalGalleryPreview";
import source from "./SphericalGallery.tsx?raw";
import htmlSource from "./gallery.html?raw";

// Flat keys, one per tunable. Each key matches a line inside the component's
// `@controls` DEFAULTS block — nested there, but uniquely named — so the
// exporters can bake the visitor's settings straight back into it.
// SphericalGalleryPreview folds these back into the object groups the Framer
// component expects.
export const controls = [
  { key: "background", label: "Background", type: "color", default: "#000000" },
  { key: "rows", label: "Rows", type: "range", min: 3, max: 14, step: 1, default: 7 },
  { key: "columns", label: "Columns", type: "range", min: 6, max: 30, step: 1, default: 16 },
  { key: "cardWidth", label: "Card Size", type: "range", min: 2, max: 10, step: 0.1, default: 5 },
  { key: "cardAspect", label: "Card Ratio", type: "range", min: 0.3, max: 3.5, step: 0.01, default: 1.6 },
  { key: "cornerRadius", label: "Corners", type: "range", min: 0, max: 0.5, step: 0.005, default: 0.045 },
  { key: "distance", label: "Distance", type: "range", min: 6, max: 70, step: 0.5, default: 23 },
  { key: "density", label: "Fill", type: "range", min: 0.2, max: 1, step: 0.02, default: 1 },
  { key: "tilt", label: "Tilt", type: "range", min: 0, max: 0.3, step: 0.005, default: 0 },
  { key: "fieldOfView", label: "FOV", type: "range", min: 25, max: 115, step: 1, unit: "°", default: 74 },
  { key: "fogColor", label: "Fog Color", type: "color", default: "#000000" },
  { key: "fog", label: "Fog", type: "range", min: 0, max: 0.08, step: 0.001, default: 0.016 },
  { key: "glowColor", label: "Glow Color", type: "color", default: "#ffffff" },
  { key: "vignette", label: "Vignette", type: "range", min: 0, max: 1, step: 0.05, default: 1 },
  { key: "vignetteSize", label: "Vignette Size", type: "range", min: 60, max: 200, step: 5, unit: "%", default: 115 },
  { key: "autoDrift", label: "Auto Drift", type: "range", min: 0, max: 3, step: 0.01, default: 0.28 },
  {
    key: "driftDirection",
    label: "Direction",
    type: "select",
    options: [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ],
    default: "left",
    when: (v) => v.autoDrift > 0,
  },
  { key: "dragSpeed", label: "Drag Speed", type: "range", min: 0.0005, max: 0.012, step: 0.0001, default: 0.0032 },
  { key: "friction", label: "Glide", type: "range", min: 0.75, max: 0.995, step: 0.005, default: 0.935 },
  { key: "startPitch", label: "Start Pitch", type: "range", min: -40, max: 40, step: 1, unit: "°", default: 0 },
  { key: "wheel", label: "Wheel", type: "toggle", on: "On", off: "Off", default: true },
  { key: "enabled", label: "Hover", type: "toggle", on: "On", off: "Off", default: true },
  { key: "scale", label: "Hover Grow", type: "range", min: 0, max: 0.8, step: 0.01, default: 0.16, when: (v) => v.enabled },
  { key: "brightness", label: "Hover Brighten", type: "range", min: 0, max: 2, step: 0.05, default: 0.45, when: (v) => v.enabled },
  { key: "dim", label: "Dim Others", type: "range", min: 0, max: 0.9, step: 0.01, default: 0.3, when: (v) => v.enabled },
  { key: "showTitle", label: "Overlay", type: "toggle", on: "Show", off: "Hide", default: true },
  { key: "title", label: "Title", type: "text", default: "Made with\nSquarespace", when: (v) => v.showTitle },
  { key: "titleColor", label: "Title Color", type: "color", default: "#ffffff", when: (v) => v.showTitle },
  { key: "subtitle", label: "Caption", type: "text", default: "Drag to explore", when: (v) => v.showTitle },
  { key: "subtitleColor", label: "Caption Color", type: "color", default: "rgba(255,255,255,0.42)", when: (v) => v.showTitle },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Variant 2 — Close Wall",
    values: {
      distance: 14,
      rows: 5,
      columns: 12,
      cardWidth: 6.2,
      cornerRadius: 0,
      autoDrift: 0.6,
      vignette: 0.6,
      title: "Step\ninside",
    },
  },
  {
    id: "v3",
    name: "Variant 3 — Wide Dome",
    values: {
      distance: 38,
      rows: 11,
      columns: 24,
      cardWidth: 3.4,
      cardAspect: 1.1,
      tilt: 0.08,
      fieldOfView: 92,
      fog: 0.028,
      autoDrift: 0.12,
    },
  },
  {
    id: "v4",
    name: "Variant 4 — Bare",
    values: {
      showTitle: false,
      autoDrift: 0,
      vignette: 0.35,
      density: 0.7,
      cornerRadius: 0.12,
      background: "#0a0a0b",
      fogColor: "#0a0a0b",
    },
  },
];

const meta = {
  id: "spherical-gallery",
  name: "Spherical Gallery",
  category: "Image Gallery",
  tags: ["3d", "webgl", "drag", "gallery", "three"],
  description:
    "A room of cards wrapped around the viewer. Drag to look around, hover a card to bring it forward.",
  component: SphericalGalleryPreview,
  controls,
  variants,
  previewBox: [1200, 700],
  previewHeight: 620,
  views: 0,
  likes: 190,
  copies: 0,
  addedAt: "2026-09-02",
  pro: false,
  // Pulled from esm.sh in the Framer flavour and from a CDN in the HTML one,
  // so only a React install needs it on the package list.
  dependencies: ["three"],
  sources: {
    jsx: { name: "SphericalGallery.tsx", lang: "tsx", code: source },
    // Already a complete standalone page, so the vanilla flavour hands it over
    // as-is rather than assembling one.
    html: { name: "index.html", lang: "html", code: htmlSource },
  },
};

export default meta;
