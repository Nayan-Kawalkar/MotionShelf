import { useState } from "react";
import useCopy from "../../lib/useCopy";

/** File tabs plus a copy button over a scrollable source view. */
export default function CodeBlock({ files }) {
  const [active, setActive] = useState(0);
  const { copy, copied } = useCopy();
  const file = files[Math.min(active, files.length - 1)];

  if (!file) return null;

  return (
    <div className="code">
      <div className="code__bar">
        <div className="code__tabs" role="tablist">
          {files.map((f, i) => (
            <button
              key={f.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`code__tab${i === active ? " code__tab--active" : ""}`}
              onClick={() => setActive(i)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <button type="button" className="code__copy" onClick={() => copy(file.code)}>
          <CopyIcon />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="code__body">
        <code>{file.code}</code>
      </pre>
    </div>
  );
}

export function CopyIcon() {
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
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
