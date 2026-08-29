import { useState } from "react";
import ControlField from "./ControlField";
import VariantSelect from "./VariantSelect";
import "./control-panel.css";

/** The right-hand workbench panel: variant picker, history, and every control. */
export default function ControlPanel({ item, state, helperMode, onHelperMode }) {
  const { values, setValue, variants, variantId, selectVariant, undo, redo, canUndo, canRedo, save, remove } = state;
  const [naming, setNaming] = useState(null);

  const handleCreate = () => setNaming(`Custom ${variants.length + 1}`);

  const confirmSave = (e) => {
    e.preventDefault();
    save(naming.trim());
    setNaming(null);
  };

  return (
    <aside className="panel">
      <header className="panel__head">
        <VariantSelect
          variants={variants}
          variantId={variantId}
          onSelect={selectVariant}
          onCreate={handleCreate}
          onDelete={remove}
        />

        <div className="panel__history">
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo">
            <UndoIcon />
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo">
            <UndoIcon flip />
          </button>
        </div>

        <button type="button" className="panel__save" onClick={handleCreate}>
          Save
        </button>
      </header>

      {naming !== null && (
        <form className="panel__naming" onSubmit={confirmSave}>
          <input
            autoFocus
            value={naming}
            aria-label="Style name"
            onChange={(e) => setNaming(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setNaming(null)}
          />
          <button type="submit" disabled={naming.trim() === ""}>
            Save style
          </button>
          <button type="button" onClick={() => setNaming(null)}>
            Cancel
          </button>
        </form>
      )}

      <div className="panel__fields">
        {item.controls.map((control) => {
          const disabled = control.when ? !control.when(values) : false;
          return (
            <ControlField
              key={control.key}
              control={control}
              value={values[control.key]}
              disabled={disabled}
              onChange={(next) => setValue(control.key, next)}
            />
          );
        })}
      </div>

      <div className="panel__extras">
        <label className="switch">
          <span>Helper Mode</span>
          <input
            type="checkbox"
            checked={helperMode}
            onChange={(e) => onHelperMode(e.target.checked)}
          />
          <span className="switch__track" aria-hidden="true" />
        </label>
        {helperMode && (
          <p className="panel__hint">
            Every control maps to a prop of the same name. Whatever you set here is baked into the
            defaults of the code you export.
          </p>
        )}
      </div>
    </aside>
  );
}

function UndoIcon({ flip = false }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}
