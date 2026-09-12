import { useEffect, useRef, useState } from "react";

/**
 * Renders a component inside an iframe pointed at /preview/:id, and keeps its
 * props in sync over postMessage.
 *
 * Used for scroll-driven components: they read progress from `window`, so they
 * need a document of their own to scroll. See PreviewPage for the detail.
 */
export default function PreviewFrame({ item, values, title }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  // The frame announces itself once mounted; until then postMessage would land
  // on a document that has no listener yet.
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "compshope:ready") return;
      if (event.source !== ref.current?.contentWindow) return;
      setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A reload (component change, dev HMR) means a fresh document to hand values to.
  useEffect(() => setReady(false), [item.id]);

  useEffect(() => {
    if (!ready) return;
    ref.current?.contentWindow?.postMessage(
      { type: "compshope:values", values },
      window.location.origin
    );
  }, [ready, values]);

  return (
    <div className="preview-frame__wrap">
      {/* `ready` is the frame's own handshake, so the skeleton lifts when the
          component is actually live — not merely when the document loaded. */}
      <span className={`skeleton${ready ? " skeleton--done" : ""}`} aria-hidden="true" />

      <iframe
        ref={ref}
        src={`/preview/${item.id}`}
        title={title ?? `${item.name} preview`}
        className="preview-frame"
        loading="eager"
      />
    </div>
  );
}
