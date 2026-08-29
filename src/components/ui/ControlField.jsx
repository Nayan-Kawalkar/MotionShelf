import { useId } from "react";

/**
 * Renders one entry of a component's control schema. `disabled` dims a field
 * whose `when` predicate currently fails, matching the panel in the reference.
 */
export default function ControlField({ control, value, onChange, disabled = false }) {
  const id = useId();
  const label = (
    <label className="field__label" htmlFor={id}>
      {control.label}
      {control.unit && <span className="field__unit"> ({control.unit})</span>}
    </label>
  );

  return (
    <div className={`field${disabled ? " field--disabled" : ""}`}>
      {label}
      <div className="field__input">{renderInput({ id, control, value, onChange, disabled })}</div>
    </div>
  );
}

function renderInput({ id, control, value, onChange, disabled }) {
  switch (control.type) {
    case "color":
      return (
        <div className="field__color">
          <input
            id={id}
            type="color"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="field__swatch"
            aria-label={`${control.label} colour`}
          />
          <input
            type="text"
            value={String(value).toUpperCase()}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.value.trim();
              // Only push valid hex up — otherwise the preview flickers to black
              // while the visitor is mid-typing.
              if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(next)) onChange(next);
            }}
            className="field__hex"
            aria-label={`${control.label} hex value`}
            spellCheck={false}
          />
        </div>
      );

    case "range":
      return (
        <div className="field__range">
          <input
            id={id}
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <input
            type="number"
            min={control.min}
            max={control.max}
            step={control.step}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isNaN(next)) onChange(clamp(next, control.min, control.max));
            }}
            className="field__number"
            aria-label={`${control.label} value`}
          />
        </div>
      );

    case "toggle":
      return (
        <div className="field__toggle" role="group" aria-label={control.label}>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value === true}
            className={`field__seg${value ? " field__seg--on" : ""}`}
            onClick={() => onChange(true)}
          >
            {control.on ?? "On"}
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={value === false}
            className={`field__seg${value ? "" : " field__seg--on"}`}
            onClick={() => onChange(false)}
          >
            {control.off ?? "Off"}
          </button>
        </div>
      );

    case "select":
      return (
        <select
          id={id}
          value={value}
          disabled={disabled}
          className="field__select"
          onChange={(e) => onChange(e.target.value)}
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "text":
    default:
      return (
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          className="field__text"
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function clamp(n, min, max) {
  if (typeof min === "number" && n < min) return min;
  if (typeof max === "number" && n > max) return max;
  return n;
}
