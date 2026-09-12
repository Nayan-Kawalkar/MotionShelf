import ImageQueue from "./ImageQueue";

/**
 * Workbench adapter for the Image Queue.
 *
 * The component destructures `slides` and `font` with no fallbacks, so both
 * arrive undefined unless something passes them and the deck falls back to
 * four blank cards. This supplies a real set, plus the label type.
 *
 * Everything the control schema exposes is flat and passes straight through.
 */

const SLIDES = [
  { image: { src: "https://picsum.photos/seed/queue-dunes/900/900" }, caption: "Dunes, Erg Chebbi" },
  { image: { src: "https://picsum.photos/seed/queue-atrium/900/900" }, caption: "Atrium, Lisbon" },
  { image: { src: "https://picsum.photos/seed/queue-pier/900/900" }, caption: "Pier at low tide" },
  { image: { src: "https://picsum.photos/seed/queue-quarry/900/900" }, caption: "Marble quarry" },
  { image: { src: "https://picsum.photos/seed/queue-pines/900/900" }, caption: "Pines before rain" },
];

const FONT = { fontSize: 13, letterSpacing: "0.14em" };

export default function ImageQueuePreview(props) {
  return (
    <ImageQueue
      slides={SLIDES}
      font={FONT}
      {...props}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
