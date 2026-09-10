import { useEffect, useMemo, useState } from "react";
import CodeBlock, { CopyIcon } from "./CodeBlock";
import useCopy from "../../lib/useCopy";
import { buildExports } from "../../lib/exporters";
import "./export-modal.css";

const METHODS = [
  { id: "cli", label: "CLI", icon: "▢" },
  { id: "code", label: "Code", icon: "</>" },
  { id: "vanilla", label: "Vanilla JS", icon: "{ }" },
  { id: "prompt", label: "AI Prompt", icon: "✦" },
];

const PACKAGE_MANAGERS = ["bun", "npm", "yarn", "pnpm"];

export default function ExportModal({ item, values, variantName, onClose }) {
  const [method, setMethod] = useState("code");
  const exports = useMemo(
    () => buildExports(item, values, variantName),
    [item, values, variantName]
  );

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const current = exports[method];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Get this component">
      <div className="modal__scrim" onClick={onClose} />

      <div className="modal__card">
        <header className="modal__head">
          <h2 className="modal__title">Get this component</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="modal__crumbs">
          <span>{item.name}</span>
          <span className="modal__chevron">›</span>
          <span className="modal__variant">{variantName}</span>
        </p>

        <h3 className="modal__section">Installation Method</h3>
        <div className="modal__methods" role="radiogroup" aria-label="Installation method">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={method === m.id}
              className={`method${method === m.id ? " method--active" : ""}`}
              onClick={() => setMethod(m.id)}
            >
              <span className="method__radio" aria-hidden="true" />
              <span className="method__icon" aria-hidden="true">
                {m.icon}
              </span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="modal__body">
          {method === "cli" ? (
            <CliPanel data={current} />
          ) : (
            <>
              {current.note && <p className="modal__note">{current.note}</p>}
              {current.files.length > 0 ? (
                <CodeBlock files={current.files} />
              ) : (
                <p className="modal__note">Nothing to export in this format yet.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CliPanel({ data }) {
  const [manager, setManager] = useState("bun");
  const { copy, copied } = useCopy();
  const command = data.commands[manager];

  return (
    <div className="cli">
      <h4 className="cli__title">Install with CLI</h4>
      <p className="modal__note">{data.note}</p>

      <div className="cli__managers">
        {PACKAGE_MANAGERS.map((pm) => (
          <button
            key={pm}
            type="button"
            className={`cli__pm${manager === pm ? " cli__pm--active" : ""}`}
            onClick={() => setManager(pm)}
          >
            {pm}
          </button>
        ))}
      </div>

      <div className="cli__command">
        <span className="cli__prompt" aria-hidden="true">
          $
        </span>
        <code className="cli__text">{command}</code>
        <button type="button" className="code__copy" onClick={() => copy(command)}>
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
