import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { previewFor } from "../previews";
import usePosterReady from "../lib/usePosterReady";
import "./library-page.css";

const SORTS = [
  { id: "recent", label: "Newest" },
  { id: "views", label: "Most viewed" },
  { id: "likes", label: "Most liked" },
];

/**
 * The index page for one hosted library — Sections or Templates. Everything
 * that differs between them arrives on `library` (see library/libraries.js).
 */
export default function LibraryPage({ library }) {
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("recent");

  const cats = useMemo(() => library.categories(), [library]);

  const results = useMemo(() => {
    const list = library.items.filter((item) => !category || item.category === category);
    const sorted = [...list];
    if (sort === "views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "likes") sorted.sort((a, b) => b.likes - a.likes);
    else sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return sorted;
  }, [library, category, sort]);

  return (
    <div className="library">
      <header className="library__head">
        <span className="library__slug">
          {library.plural} / {String(results.length).padStart(2, "0")} listed
        </span>
        <h1 className="library__title">{library.title}</h1>
        <p className="library__lede">{library.lede}</p>
      </header>

      <div className="library__filters">
        <div className="filter-row" role="group" aria-label="Category">
          <button
            type="button"
            className={`filter${category === null ? " filter--on" : ""}`}
            onClick={() => setCategory(null)}
          >
            All <span className="filter__count">{library.items.length}</span>
          </button>
          {cats.map((c) => (
            <button
              key={c.name}
              type="button"
              className={`filter${category === c.name ? " filter--on" : ""}`}
              onClick={() => setCategory(category === c.name ? null : c.name)}
            >
              {c.name} <span className="filter__count">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="filter-row" role="group" aria-label="Sort">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`filter${sort === s.id ? " filter--on" : ""}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`library__grid library__grid--${library.shape}`}>
        {results.map((item) => (
          <LibraryCard key={item.id} item={item} library={library} />
        ))}
      </div>
    </div>
  );
}

function LibraryCard({ item, library }) {
  // Without a recording the card falls back to framing the live site, and that
  // frame only mounts once the card is on screen — a grid of live iframes on
  // first paint would stall the page for no benefit.
  const [visible, setVisible] = useState(false);
  const pageCount = item.pages?.length ?? 0;
  const preview = previewFor(item.id);
  const videoRef = useRef(null);
  const posterReady = usePosterReady(preview?.poster);
  // The fallback frames the live site, which does report its own load.
  const [frameReady, setFrameReady] = useState(false);

  const play = () => {
    const v = videoRef.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };

  if (preview) {
    return (
      <article
        className={`lcard lcard--${library.shape}`}
        onMouseEnter={play}
        onMouseLeave={stop}
        onFocus={play}
        onBlur={stop}
      >
        <div className="lcard__frame">
          <span className={`skeleton${posterReady ? " skeleton--done" : ""}`} aria-hidden="true" />

          <video
            ref={videoRef}
            className="lcard__video"
            poster={preview.poster}
            muted
            loop
            playsInline
            preload="none"
            aria-label={`${item.name} preview`}
          >
            <source src={preview.video} type="video/mp4" />
          </video>

          <Link
            to={`${library.itemPath}/${item.id}`}
            className="lcard__hit"
            aria-label={`${item.name} — ${item.category}`}
          />

          {item.pro && <span className="lcard__pro">Pro</span>}
          {pageCount > 1 && <span className="lcard__pages">{pageCount} pages</span>}
        </div>

        <LibraryCardMeta item={item} />
      </article>
    );
  }

  return (
    <article className={`lcard lcard--${library.shape}`}>
      <div
        className="lcard__frame"
        ref={(node) => {
          if (!node || visible) return;
          const io = new IntersectionObserver(
            ([entry]) => {
              if (!entry.isIntersecting) return;
              setVisible(true);
              io.disconnect();
            },
            { rootMargin: "300px" }
          );
          io.observe(node);
        }}
      >
        <span className={`skeleton${frameReady ? " skeleton--done" : ""}`} aria-hidden="true" />

        {visible ? (
          <iframe
            className="lcard__iframe"
            onLoad={() => setFrameReady(true)}
            src={item.hostedUrl}
            title={`${item.name} preview`}
            loading="lazy"
            // Sandboxed so a hosted page cannot navigate this one, submit
            // forms, or open popups. `allow-same-origin` is what lets it load
            // its own stylesheets — without it the frame renders unstyled.
            // It grants nothing against this page for a genuinely external
            // entry, since the frame is a different origin either way.
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            tabIndex={-1}
          />
        ) : null}

        {/* The frame is inert; the whole card is the link. */}
        <Link
          to={`${library.itemPath}/${item.id}`}
          className="lcard__hit"
          aria-label={`${item.name} — ${item.category}`}
        />

        {item.pro && <span className="lcard__pro">Pro</span>}
        {pageCount > 1 && (
          <span className="lcard__pages">
            {pageCount} pages
          </span>
        )}
      </div>

      <LibraryCardMeta item={item} />
    </article>
  );
}

function LibraryCardMeta({ item }) {
  return (
    <div className="lcard__meta">
      <div>
        <h2 className="lcard__name">{item.name}</h2>
        <p className="lcard__category">{item.category}</p>
      </div>
      <span className="lcard__stack">{item.framework ?? item.stack.join(" · ")}</span>
    </div>
  );
}
