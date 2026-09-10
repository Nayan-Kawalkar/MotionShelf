import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import sections, { getSection, repoUrl, sectionPrompt, zipUrl } from "../sections/registry";
import useCopy from "../lib/useCopy";
import "./section-page.css";

const WIDTHS = [
  { id: "full", label: "Full", width: null },
  { id: "tablet", label: "Tablet", width: 834 },
  { id: "phone", label: "Phone", width: 414 },
];

export default function SectionPage() {
  const { id } = useParams();
  const section = getSection(id);
  const [width, setWidth] = useState("full");
  const [tab, setTab] = useState("prompt");

  if (!section) {
    return (
      <div className="empty">
        <h1>Nothing here</h1>
        <p>That section doesn’t exist, or it moved.</p>
        <Link to="/sections" className="empty__link">
          Browse all sections
        </Link>
      </div>
    );
  }

  const active = WIDTHS.find((w) => w.id === width);
  const related = sections.filter((s) => s.id !== section.id).slice(0, 4);

  return (
    <div className="section-page">
      <header className="section-page__head">
        <div>
          <Link to="/sections" className="section-page__back">
            ‹ All sections
          </Link>
          <h1 className="section-page__title">{section.name}</h1>
          <p className="section-page__desc">{section.description}</p>

          <div className="section-page__facts">
            <span className="fact">{section.category}</span>
            <span className="fact">{section.stack.join(" · ")}</span>
            <span className="fact">{section.views.toLocaleString()} views</span>
            {section.pro && <span className="fact fact--pro">Pro</span>}
          </div>
        </div>

        <div className="section-page__links">
          <a
            className="btn btn--primary"
            href={zipUrl(section)}
            // GitHub serves the archive with Content-Disposition, so this
            // downloads rather than navigating away.
            download
          >
            <ZipIcon /> Download zip
          </a>
          <a
            className="btn"
            href={section.hostedUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalIcon /> Full preview
          </a>
          <a className="btn" href={repoUrl(section)} target="_blank" rel="noreferrer noopener">
            <GitHubIcon /> GitHub
          </a>
        </div>
      </header>

      <div className="stage-bar">
        <span className="stage-bar__label">Preview</span>
        <div className="stage-bar__widths">
          {WIDTHS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`stage-bar__width${width === w.id ? " stage-bar__width--on" : ""}`}
              onClick={() => setWidth(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
        <span className="stage-bar__px">{active.width ? `${active.width}px` : "fluid"}</span>
      </div>

      <div className="section-stage">
        <iframe
          className="section-stage__frame"
          style={active.width ? { width: active.width } : undefined}
          src={section.hostedUrl}
          title={`${section.name} live preview`}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </div>

      <section className="get">
        <div className="get__tabs" role="tablist" aria-label="Get this section">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "prompt"}
            className={`get__tab${tab === "prompt" ? " get__tab--on" : ""}`}
            onClick={() => setTab("prompt")}
          >
            AI Prompt
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "zip"}
            className={`get__tab${tab === "zip" ? " get__tab--on" : ""}`}
            onClick={() => setTab("zip")}
          >
            Download
          </button>
        </div>

        {tab === "prompt" ? <PromptPanel section={section} /> : <ZipPanel section={section} />}
      </section>

      {related.length > 0 && (
        <section className="related">
          <h2 className="related__title">More sections</h2>
          <div className="related__list">
            {related.map((other) => (
              <Link key={other.id} to={`/section/${other.id}`} className="related__item">
                <span className="related__name">{other.name}</span>
                <span className="related__cat">{other.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PromptPanel({ section }) {
  const text = sectionPrompt(section);
  const { copy, copied } = useCopy();

  return (
    <div className="panel">
      <div className="panel__bar">
        <span className="panel__name">prompt.md</span>
        <button type="button" className="panel__copy" onClick={() => copy(text)}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="panel__body">{text}</pre>
      <p className="panel__note">
        Paste into Claude Code, Cursor, or any coding agent. It points the agent at the
        repository and tells it to match your codebase rather than paste blindly.
      </p>
    </div>
  );
}

function ZipPanel({ section }) {
  const { copy, copied } = useCopy();
  const url = zipUrl(section);

  return (
    <div className="panel">
      <div className="panel__bar">
        <span className="panel__name">{section.branch}.zip</span>
        <button type="button" className="panel__copy" onClick={() => copy(url)}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <pre className="panel__body">{url}</pre>
      <p className="panel__note">
        GitHub builds the archive on request, so it is always current with{" "}
        <code>{section.branch}</code>. It contains the whole repository
        {section.dir ? (
          <>
            {" "}
            — this section is the <code>{section.dir}</code> directory inside it.
          </>
        ) : (
          "."
        )}
      </p>
      <a className="btn btn--primary panel__cta" href={url} download>
        <ZipIcon /> Download zip
      </a>
    </div>
  );
}

function ZipIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
