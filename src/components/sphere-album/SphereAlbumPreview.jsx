import SphereAlbum from "./SphereAlbum";

/**
 * Workbench adapter for the Sphere Album.
 *
 * The component's `items` prop defaults to an empty array — inside Framer the
 * property panel supplies the starting cards, and there is no panel here. This
 * fills that gap with the same twenty-card lattice the panel would hand over,
 * and gives the component the size Framer's frame would otherwise provide.
 *
 * Every tunable the control schema exposes is flat and passes straight through.
 */

// Mirrors `defaultItems` in SphereAlbum.tsx: two in every three portrait, so
// the sphere reads as a mixed album rather than a grid of identical tiles.
const DEFAULT_ITEMS = Array.from({ length: 20 }, (_, i) => {
  const portrait = i % 3 !== 1;
  return {
    title: `Card ${i + 1}`,
    image: { src: `https://picsum.photos/seed/sphere-album-${i}/320/420` },
    width: portrait ? 76 : 104,
    height: portrait ? 100 : 79,
  };
});

export default function SphereAlbumPreview(props) {
  return (
    <SphereAlbum
      items={DEFAULT_ITEMS}
      {...props}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
