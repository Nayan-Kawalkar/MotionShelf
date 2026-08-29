import ASCIIParticleText from "./ASCIIParticleText";
import source from "./ASCIIParticleText.tsx?raw";

export const controls = [
  { key: "text", label: "Text", type: "text", default: "DIGITAL STUDIO" },
  { key: "background", label: "Background", type: "color", default: "#000000" },
  { key: "particleColor", label: "Particles", type: "color", default: "rgb(220, 220, 220)" },
  { key: "highlightColor", label: "Highlight", type: "color", default: "rgb(255, 255, 255)" },
  { key: "glowColor", label: "Glow", type: "color", default: "#ffffff" },
  { key: "charSet", label: "Charset", type: "text", default: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#&$%" },
  { key: "textWidthFraction", label: "Text Size", type: "range", min: 0.02, max: 0.5, step: 0.005, default: 0.125 },
  { key: "maxTextSize", label: "Max Size", type: "range", min: 10, max: 400, step: 1, unit: "px", default: 110 },
  { key: "gridSpacing", label: "Grid Spacing", type: "range", min: 0.03, max: 0.3, step: 0.005, default: 0.09 },
  { key: "charScale", label: "Char Size", type: "range", min: 0.03, max: 0.4, step: 0.005, default: 0.11 },
  { key: "particleOpacity", label: "Opacity", type: "range", min: 0, max: 1, step: 0.01, default: 0.85 },
  { key: "glowBlur", label: "Glow Blur", type: "range", min: 0, max: 40, step: 1, default: 8 },
  { key: "mouseRadius", label: "Cursor Radius", type: "range", min: 0, max: 300, step: 1, unit: "px", default: 55 },
  { key: "pushStrength", label: "Push", type: "range", min: 0, max: 3, step: 0.05, default: 0.95 },
  { key: "followSpeed", label: "Follow", type: "range", min: 0.01, max: 1, step: 0.01, default: 0.18 },
  { key: "startDelay", label: "Start Delay", type: "range", min: 0, max: 5, step: 0.1, unit: "s", default: 0.4 },
  { key: "scramble", label: "Scramble", type: "toggle", on: "On", off: "Off", default: true },
  {
    key: "scrambleInterval",
    label: "Every",
    type: "range",
    min: 0.05,
    max: 5,
    step: 0.05,
    unit: "s",
    default: 1,
    when: (v) => v.scramble,
  },
  { key: "showHint", label: "Hint", type: "toggle", on: "Show", off: "Hide", default: true },
  {
    key: "hintText",
    label: "Hint Text",
    type: "text",
    default: "Click to interact",
    when: (v) => v.showHint,
  },
];

export const variants = [
  { id: "v1", name: "Variant 1", values: {} },
  {
    id: "v2",
    name: "Terminal",
    values: {
      particleColor: "rgb(60, 255, 130)",
      highlightColor: "rgb(200, 255, 220)",
      glowColor: "#3cff82",
      charSet: "01",
      glowBlur: 16,
      scrambleInterval: 0.15,
    },
  },
  {
    id: "v3",
    name: "Dense",
    values: { gridSpacing: 0.05, charScale: 0.07, textWidthFraction: 0.2, mouseRadius: 90, scramble: false },
  },
  {
    id: "v4",
    name: "Ember",
    values: {
      background: "#160a04",
      particleColor: "rgb(255, 138, 61)",
      highlightColor: "#fff3e6",
      glowColor: "#ff6a1f",
      glowBlur: 22,
      pushStrength: 1.8,
      showHint: false,
    },
  },
];

const meta = {
  id: "ascii-particle-text",
  name: "ASCII Particle Text",
  category: "Text",
  tags: ["text", "particles", "ascii", "canvas", "interactive"],
  description:
    "Headline text sampled into a field of ASCII characters that pile, assemble and scatter, scrambling and recoiling from the cursor.",
  component: ASCIIParticleText,
  controls,
  variants,
  previewHeight: 520,
  previewBox: [880, 550],
  views: 5200,
  copies: 241,
  addedAt: "2026-08-29",
  pro: false,
  sources: {
    jsx: { name: "ASCIIParticleText.tsx", lang: "tsx", code: source },
    framer: { name: "ASCIIParticleText.tsx", lang: "tsx", code: source },
  },
};

export default meta;
