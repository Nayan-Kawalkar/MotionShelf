import carousel from "./components/carousel/meta";
import curvedCarousel from "./components/curved-carousel/meta";
import helicalScrollGallery from "./components/helical-scroll-gallery/meta";
import floatingArcSlider from "./components/floating-arc-slider/meta";
import snapDeck from "./components/snap-deck/meta";
import asciiParticleText from "./components/ascii-particle-text/meta";
import scrollAssembleImage from "./components/scroll-assemble-image/meta";
import curvedCardMarquee from "./components/curved-card-marquee/meta";

// Every showcased component lives here. Each entry is the component folder's
// `meta.js` — id, presentation copy, the control schema, variants and the raw
// sources the export modal hands out. The `id` is what appears in the URL
// (e.g. /component/carousel).
const registry = [
  asciiParticleText,
  snapDeck,
  helicalScrollGallery,
  scrollAssembleImage,
  floatingArcSlider,
  curvedCardMarquee,
  carousel,
  curvedCarousel,
];

/**
 * Whether a component drives itself from page scroll at these settings, and so
 * needs a scrolling stage instead of a clipped one. `scroll` may be a flag or a
 * predicate — the curved marquee only pins in one of its modes.
 */
export function isScrollDriven(item, values) {
  return typeof item.scroll === "function" ? item.scroll(values) : !!item.scroll;
}

export function getComponent(id) {
  return registry.find((item) => item.id === id);
}

/** The control schema's defaults as a plain values object. */
export function defaultValues(item) {
  return Object.fromEntries(item.controls.map((c) => [c.key, c.default]));
}

/** Defaults with a variant's overrides applied on top. */
export function variantValues(item, variantId) {
  const variant = item.variants.find((v) => v.id === variantId);
  return { ...defaultValues(item), ...(variant ? variant.values : null) };
}

/** Controls whose `when` predicate passes for the given values. */
export function activeControls(item, values) {
  return item.controls.filter((c) => (c.when ? c.when(values) : true));
}

/**
 * CSS vars sizing a component's off-stage preview box. Components whose
 * content has a natural size read better in a smaller box, since the whole
 * box is then scaled up to card width.
 */
export function previewVars(item) {
  const [w, h] = item.previewBox ?? [1280, 800];
  return { "--preview-w": `${w}px`, "--preview-h": `${h}px`, "--preview-wn": w };
}

export function categories() {
  const counts = new Map();
  for (const item of registry) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** Components sharing a category or a tag, excluding the component itself. */
export function similarTo(item, limit = 6) {
  return registry
    .filter((other) => other.id !== item.id)
    .map((other) => ({
      other,
      score:
        (other.category === item.category ? 2 : 0) +
        other.tags.filter((t) => item.tags.includes(t)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.other);
}

export default registry;
