import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildPrompt, repoUrl, zipUrl } from "../library/shared";
import useCopy from "../lib/useCopy";
import "./library-item-page.css";

const WIDTHS = [
  { id: "full", label: "Full", width: null },
  { id: "tablet", label: "Tablet", width: 834 },
  { id: "phone", label: "Phone", width: 414 },
];

/**
 * The detail page for one entry in a hosted library. Keyed on the entry id by
 * the router, so moving between entries remounts and resets the page picker,
 * width and tab rather than carrying one entry's state into the next.
 */
export default function LibraryItemPage({ library }) {
  const { id } = useParams();
  const item = library.get(id);
  return item ? (
    <ItemDetail key={item.id} item={item} library={library} />
  ) : (
    <div className="empty">
      <h1>Nothing here</h1>
      <p>
        That {library.noun} doesn’t exist, or it moved.
      </p>
      <Link to={library.indexPath} className="empty__link">
        Browse all {library.plural}
      </Link>
    </div>
  );
}

function ItemDetail({ item, library }) {
  const pages = item.pages?.length ? item.pages : [{ name: "Page", url: item.hostedUrl }];
  const [pageIndex, setPageIndex] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const [width, setWidth] = useState("full");
  const [tab, setTab] = useState("prompt");

  const page = pages[pageIndex];
  const hasSource = Boolean(item.repo);
  const active = WIDTHS.find((w) => w.id === width);
  const related = library.items.filter((other) => other.id !== item.id).slice(0, 4);

  return (
    <div className="item-page">
      <header className="item-page__head">
        <div>
          <Link to={library.indexPath} className="item-page__back">
            ‹ All {library.plural}
          </Link>
          <h1 className="item-page__title">{item.name}</h1>
          <p className="item-page__desc">{item.description}</p>

          <div className="item-page__facts">
            <span className="fact">{item.category}</span>
            {item.framework && <span className="fact">{item.framework}</span>}
            <span className="fact">{item.stack.join(" · ")}</span>
            {pages.length > 1 && <span className="fact">{pages.length} pages</span>}
            <span className="fact">{item.views.toLocaleString()} views</span>
            {item.pro && <span className="fact fact--pro">Pro</span>}
          </div>
        </div>

        <div className="item-page__links">
          {/* Hosted-only entries have no public source: no zip, no GitHub. */}
          {hasSource && (
            <a
              className="btn btn--primary"
              href={zipUrl(item)}
              // GitHub serves the archive with Content-Disposition, so this
              // downloads rather than navigating away.
              download
            >
              <ZipIcon /> Download zip
            </a>
          )}
          <a
            className={`btn${hasSource ? "" : " btn--primary"}`}
            href={page.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalIcon /> Full preview
          </a>
          {hasSource && (
            <a className="btn" href={repoUrl(item)} target="_blank" rel="noreferrer noopener">
              <GitHubIcon /> GitHub
            </a>
          )}
        </div>
      </header>

      <div className="stage-bar">
        {pages.length > 1 ? (
          <div className="stage-bar__pages" role="tablist" aria-label={`${item.name} pages`}>
            {pages.map((p, i) => (
              <button
                key={p.url}
                type="button"
                role="tab"
                aria-selected={i === pageIndex}
                className={`stage-bar__page${i === pageIndex ? " stage-bar__page--on" : ""}`}
                onClick={() => {
                  if (i === pageIndex) return;
                  setFrameReady(false);
                  setPageIndex(i);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="stage-bar__label">Preview</span>
        )}

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

      <div className="item-stage">
        <span className={`skeleton${frameReady ? " skeleton--done" : ""}`} aria-hidden="true" />

        <iframe
          className="item-stage__frame"
          onLoad={() => setFrameReady(true)}
          style={active.width ? { width: active.width } : undefined}
          src={page.url}
          title={`${item.name} — ${page.name}`}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      </div>

      <section className="get">
        <div className="get__tabs" role="tablist" aria-label={`Get this ${library.noun}`}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "prompt"}
            className={`get__tab${tab === "prompt" ? " get__tab--on" : ""}`}
            onClick={() => setTab("prompt")}
          >
            AI Prompt
          </button>
          {hasSource && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "zip"}
              className={`get__tab${tab === "zip" ? " get__tab--on" : ""}`}
              onClick={() => setTab("zip")}
            >
              Download
            </button>
          )}
        </div>

        {tab === "prompt" || !hasSource ? (
          <PromptPanel item={item} noun={library.noun} />
        ) : (
          <ZipPanel item={item} noun={library.noun} />
        )}
      </section>

      {related.length > 0 && (
        <section className="related">
          <h2 className="related__title">More {library.plural}</h2>
          <div className="related__list">
            {related.map((other) => (
              <Link
                key={other.id}
                to={`${library.itemPath}/${other.id}`}
                className="related__item"
              >
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

function PromptPanel({ item, noun }) {
  const text = buildPrompt(item, noun);
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
        Paste into Claude Code, Cursor, or any coding agent.{" "}
        {item.repo
          ? "It points the agent at the repository and tells it to match your codebase rather than paste blindly."
          : "There is no public source, so it points the agent at the live page and tells it to rebuild in your codebase's conventions."}
      </p>
    </div>
  );
}

function ZipPanel({ item, noun }) {
  const { copy, copied } = useCopy();
  const url = zipUrl(item);

  return (
    <div className="panel">
      <div className="panel__bar">
        <span className="panel__name">{item.branch}.zip</span>
        <button type="button" className="panel__copy" onClick={() => copy(url)}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <pre className="panel__body">{url}</pre>
      <p className="panel__note">
        GitHub builds the archive on request, so it is always current with{" "}
        <code>{item.branch}</code>. It contains the whole repository
        {item.dir ? (
          <>
            {" "}
            — this {noun} is the <code>{item.dir}</code> directory inside it.
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
