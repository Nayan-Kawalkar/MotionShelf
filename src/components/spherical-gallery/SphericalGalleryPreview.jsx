import SphericalGallery from "./SphericalGallery";

/**
 * Workbench adapter for the Spherical Gallery.
 *
 * Every other showcased component takes flat props, so the control panel can
 * spread its values straight onto it. This one is authored against Framer's
 * grouped object controls (`grid`, `look`, `motion`, …), so the flat keys the
 * panel produces get folded back into those groups here.
 *
 * It also supplies the size Framer would otherwise give the component: the
 * source sizes itself from its `style` prop, and with none it collapses to
 * nothing.
 *
 * Only the keys the control schema exposes are listed. Everything else falls
 * through to the component's own DEFAULTS, which it fills in per group.
 */
export default function SphericalGalleryPreview({
  // grid
  rows,
  columns,
  cardWidth,
  cardAspect,
  cornerRadius,
  distance,
  density,
  tilt,
  // lens
  fieldOfView,
  // look
  background,
  fogColor,
  fog,
  glowColor,
  vignette,
  vignetteSize,
  // motion
  autoDrift,
  driftDirection,
  dragSpeed,
  friction,
  wheel,
  startPitch,
  // hover
  enabled,
  scale,
  brightness,
  dim,
  // overlay
  showTitle,
  title,
  titleColor,
  subtitle,
  subtitleColor,
  style,
}) {
  return (
    <SphericalGallery
      grid={{ rows, columns, cardWidth, cardAspect, cornerRadius, distance, density, tilt }}
      lens={{ fieldOfView }}
      look={{ background, fogColor, fog, glowColor, vignette, vignetteSize }}
      motion={{ autoDrift, driftDirection, dragSpeed, friction, wheel, startPitch }}
      hover={{ enabled, scale, brightness, dim }}
      overlay={{ showTitle, title, titleColor, subtitle, subtitleColor }}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}
