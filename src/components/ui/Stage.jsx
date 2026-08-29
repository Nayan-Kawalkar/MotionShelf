import { useEffect, useRef, useState } from "react";

const WIDTHS = [
  { id: "full", label: "Full", width: null },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 390 },
];

/**
 * The preview surface: renders the live component, and can go fullscreen or be
 * constrained to a device width so responsive behaviour is testable.
 */
export default function Stage({
  children,
  onReset,
  responsive,
  onResponsive,
  scroll = false,
  height,
}) {
  const [size, setSize] = useState("full");
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else ref.current?.requestFullscreen?.();
  };

  const width = WIDTHS.find((w) => w.id === size)?.width;
  const sized = !!height && !scroll;

  return (
    <div className="stage" ref={ref}>
      <div className="stage__tools stage__tools--left">
        <button
          type="button"
          className="stage__tool"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <ExpandIcon />
        </button>
      </div>

      <div className="stage__tools stage__tools--right">
        <button
          type="button"
          className={`stage__tool${responsive ? " stage__tool--on" : ""}`}
          onClick={() => onResponsive(!responsive)}
          aria-pressed={responsive}
          aria-label="Responsive editor"
          title="Responsive editor"
        >
          <DevicesIcon />
        </button>
        <button
          type="button"
          className="stage__tool"
          onClick={onReset}
          aria-label="Reset to variant defaults"
          title="Reset"
        >
          <ResetIcon />
        </button>
      </div>

      {responsive && (
        <div className="stage__widths" role="group" aria-label="Preview width">
          {WIDTHS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`stage__width${size === w.id ? " stage__width--active" : ""}`}
              onClick={() => setSize(w.id)}
            >
              {w.label}
              {w.width && <span className="stage__px">{w.width}</span>}
            </button>
          ))}
        </div>
      )}

      {scroll && (
        <div className="stage__badge">
          <ScrollIcon />
          Scroll inside the frame
        </div>
      )}

      {/* Scroll-driven components pin themselves against their nearest
          scrolling ancestor, so the frame becomes that ancestor rather than
          clipping them. */}
      <div className={`stage__frame${scroll ? " stage__frame--scroll" : ""}`}>
        {/* A component sized by its frame needs a definite height here. Left
            auto, its height:100% resolves against an auto-height parent, and
            any ResizeObserver inside it feeds back into its own size. */}
        <div
          className={`stage__canvas${sized ? " stage__canvas--sized" : ""}`}
          style={{
            ...(width ? { width, maxWidth: "100%" } : null),
            ...(sized ? { height } : null),
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ScrollIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="2" width="10" height="20" rx="5" />
      <line x1="12" y1="7" x2="12" y2="11" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 14 4 20 10 20" />
      <polyline points="20 10 20 4 14 4" />
      <line x1="4" y1="20" x2="11" y2="13" />
      <line x1="20" y1="4" x2="13" y2="11" />
    </svg>
  );
}

function DevicesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="13" height="11" rx="2" />
      <rect x="16" y="9" width="6" height="11" rx="1.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 10 9 10" />
    </svg>
  );
}
