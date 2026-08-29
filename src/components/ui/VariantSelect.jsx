import { useEffect, useRef, useState } from "react";

/** Variant dropdown with "Create New" and per-variant delete for saved styles. */
export default function VariantSelect({ variants, variantId, onSelect, onCreate, onDelete }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = variants.find((v) => v.id === variantId) ?? variants[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="variant" ref={rootRef}>
      <button
        type="button"
        className="variant__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <DiamondIcon />
        <span className="variant__name">{current.name}</span>
        <ChevronsIcon />
      </button>

      {open && (
        <div className="variant__menu" role="listbox">
          {onCreate && (
            <button
              type="button"
              className="variant__create"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <PlusIcon />
              Create New
            </button>
          )}

          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`variant__row${variant.id === variantId ? " variant__row--active" : ""}`}
            >
              <button
                type="button"
                role="option"
                aria-selected={variant.id === variantId}
                className="variant__option"
                onClick={() => {
                  onSelect(variant.id);
                  setOpen(false);
                }}
              >
                <DiamondIcon />
                {variant.name}
              </button>
              {variant.custom && onDelete && (
                <button
                  type="button"
                  className="variant__delete"
                  aria-label={`Delete ${variant.name}`}
                  onClick={() => onDelete(variant.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiamondIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 22 12 12 22 2 12Z" opacity="0.75" />
    </svg>
  );
}

function ChevronsIcon() {
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
      <polyline points="7 15 12 20 17 15" />
      <polyline points="7 9 12 4 17 9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="3 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
