import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getComponent, variantValues } from "../registry";
import "./preview-page.css";

/**
 * The bare page rendered inside a preview iframe: one component, no chrome.
 *
 * Scroll-driven components read their progress from `window` — framer-motion's
 * useScroll defaults its container to the window, and the marquee listens on it
 * directly. A scrolling <div> in the parent page cannot drive them, because
 * scroll events do not bubble. Giving each one its own document means its
 * window, `100vh` and `position: sticky` all mean what they mean on a real page.
 *
 * The parent posts prop values in; nothing is read back out.
 */
export default function PreviewPage() {
  const { id } = useParams();
  const item = getComponent(id);
  const [values, setValues] = useState(() =>
    item ? variantValues(item, item.variants[0].id) : null
  );

  // Marks this document as a preview so preview-page.css's resets apply here
  // and nowhere else — the app shell shares the same injected stylesheet.
  useEffect(() => {
    document.documentElement.classList.add("preview-doc");
    return () => document.documentElement.classList.remove("preview-doc");
  }, []);

  useEffect(() => {
    if (!item) return;

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "compshope:values") return;
      setValues(event.data.values);
    };

    window.addEventListener("message", onMessage);
    // Tell the parent we can receive values now.
    window.parent?.postMessage({ type: "compshope:ready", id }, window.location.origin);

    return () => window.removeEventListener("message", onMessage);
  }, [id, item]);

  if (!item) return <p className="preview-missing">Unknown component: {id}</p>;

  const Component = item.component;
  return <Component {...values} />;
}
