import TarotCarousel from "./TarotCarousel";

/**
 * Workbench adapter for the Tarot Carousel.
 *
 * Most showcased components take flat props, so the control panel can spread
 * its values straight onto them. This one takes grouped object props
 * (`geometry`, `motion`, `deal`), so the flat keys the panel produces get
 * folded back into those groups here.
 *
 * It also supplies an explicit size — the source measures itself from its
 * own box.
 *
 * Only the keys the control schema exposes are listed. Everything the panel
 * leaves out falls through to the component's own GEOMETRY / MOTION / DEAL
 * defaults, which it merges field by field.
 */
export default function TarotCarouselPreview({
  // geometry
  cardSize,
  aspect,
  spread,
  perspective,
  restYaw,
  push,
  bump,
  lean,
  // motion
  duration,
  // deal
  tiltMin,
  tiltMax,
  alternate,
  ...flat
}) {
  return (
    <TarotCarousel
      {...flat}
      geometry={{ cardSize, aspect, spread, perspective, restYaw, push, bump, lean }}
      motion={{ duration }}
      deal={{ tiltMin, tiltMax, alternate }}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
