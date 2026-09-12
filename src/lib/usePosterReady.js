import { useEffect, useState } from "react";

/**
 * Whether a poster image has painted.
 *
 * A `<video poster>` fires no load event of its own while `preload="none"` —
 * the browser fetches no video data at all — so a skeleton waiting on
 * `loadeddata` would never lift. Loading the poster separately gives a signal
 * that arrives whatever the video's preload setting is; the browser serves the
 * second request from cache.
 */
export default function usePosterReady(src) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!src) {
      setReady(true);
      return;
    }

    setReady(false);
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    const img = new Image();
    img.onload = done;
    // A poster that 404s must still clear the skeleton, or the card is stuck
    // behind it for good.
    img.onerror = done;
    img.src = src;
    // A cached image can be complete before the handlers are attached.
    if (img.complete) done();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return ready;
}
