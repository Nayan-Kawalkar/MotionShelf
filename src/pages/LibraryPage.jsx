import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  // The frame only mounts once the card is on screen — a grid of live iframes
  // on first paint would stall the page for no benefit.
  const [visible, setVisible] = useState(false);
  const pageCount = item.pages?.length ?? 0;

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
        {visible ? (
          <iframe
            className="lcard__iframe"
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
        ) : (
          <div className="lcard__placeholder" aria-hidden="true" />
        )}

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

      <div className="lcard__meta">
        <div>
          <h2 className="lcard__name">{item.name}</h2>
          <p className="lcard__category">{item.category}</p>
        </div>
        <span className="lcard__stack">{item.framework ?? item.stack.join(" · ")}</span>
      </div>
    </article>
  );
}
