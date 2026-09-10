import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import registry, { categories, previewVars, variantValues } from "../registry";
import "./gallery-page.css";

const SORTS = [
  { id: "trending", label: "Trending", icon: "📈" },
  { id: "recent", label: "Recently Added", icon: "✦" },
  { id: "copied", label: "Most Copied", icon: "◆" },
];

export default function GalleryPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("trending");
  const [category, setCategory] = useState(null);
  const [livePreviews, setLivePreviews] = useState(true);
  const searchRef = useRef(null);

  // "/" focuses search, the way the reference site does.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.target.matches("input, textarea, select")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const cats = useMemo(categories, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = registry.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      return [item.name, item.description, item.category, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sorted = [...matches];
    if (sort === "copied") sorted.sort((a, b) => b.copies - a.copies);
    else if (sort === "recent") sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    else sorted.sort((a, b) => b.views - a.views);
    return sorted;
  }, [query, sort, category]);

  return (
    <div className="gallery">
      <aside className="sidebar">
        <div className="search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search"
            aria-label="Search components"
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="search__key">/</kbd>
        </div>

        <h2 className="sidebar__title">Explore</h2>
        <div className="sidebar__group">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip chip--wide${sort === option.id ? " chip--active" : ""}`}
              onClick={() => setSort(option.id)}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        <hr className="sidebar__rule" />

        <h2 className="sidebar__title">Categories</h2>
        <div className="sidebar__group sidebar__group--wrap">
          <button
            type="button"
            className={`chip${category === null ? " chip--active" : ""}`}
            onClick={() => setCategory(null)}
          >
            All <span className="chip__count">{registry.length}</span>
          </button>
          {cats.map((cat) => (
            <button
              key={cat.name}
              type="button"
              className={`chip${category === cat.name ? " chip--active" : ""}`}
              onClick={() => setCategory(category === cat.name ? null : cat.name)}
            >
              {cat.name} <span className="chip__count">{cat.count}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="results">
        <header className="results__head">
          <div>
            <span className="results__slug">
              Index / {String(results.length).padStart(2, "0")} plates
            </span>
            <h1 className="results__count">Component Register</h1>
          </div>

          <div className="preview-toggle">
            <span className="preview-toggle__label">Preview Type:</span>
            <button
              type="button"
              aria-pressed={!livePreviews}
              className={`preview-toggle__btn${livePreviews ? "" : " preview-toggle__btn--on"}`}
              onClick={() => setLivePreviews(false)}
              title="Static previews"
            >
              <StillIcon />
            </button>
            <button
              type="button"
              aria-pressed={livePreviews}
              className={`preview-toggle__btn${livePreviews ? " preview-toggle__btn--on" : ""}`}
              onClick={() => setLivePreviews(true)}
              title="Live previews"
            >
              <LiveIcon />
            </button>
          </div>
        </header>

        {results.length === 0 ? (
          <p className="results__empty">
            No components match “{query}”. Try a different search or clear the category filter.
          </p>
        ) : (
          <div className="grid">
            {results.map((item, i) => (
              <ComponentCard key={item.id} item={item} live={livePreviews} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Masonry only reads as masonry if the tiles differ in height. The previews
// are all near 16:10, so the shelf heights come from a fixed cycle keyed to
// position — deterministic, so the grid never reshuffles between renders.
const CARD_RATIOS = ["16 / 10", "16 / 13", "16 / 9", "16 / 11", "4 / 3", "16 / 10"];

function ComponentCard({ item, live, index }) {
  const Component = item.component;
  const [liked, toggleLike] = useLike(item.id);
  // Cards show a component at its first variant, not the visitor's edits.
  const previewValues = useMemo(() => variantValues(item, item.variants[0].id), [item]);

  const previewStyle = {
    ...previewVars(item),
    "--card-ratio": CARD_RATIOS[index % CARD_RATIOS.length],
  };

  // The card is a plain container with a stretched link over it, not a <Link>
  // wrapping everything: some components render their own anchors, and an <a>
  // inside an <a> is invalid HTML that React refuses to hydrate.
  return (
    <div className="card">
      <Link
        to={`/component/${item.id}`}
        className="card__hit"
        aria-label={`${item.name} — ${item.category}`}
      />
      <button
        type="button"
        className={`card__like${liked ? " card__like--on" : ""}`}
        aria-pressed={liked}
        aria-label={liked ? `Unlike ${item.name}` : `Like ${item.name}`}
        onClick={(e) => {
          // The whole card is a stretched link; a control sitting on top of it
          // has to stop the click reaching it.
          e.preventDefault();
          e.stopPropagation();
          toggleLike();
        }}
      >
        <span className="card__like-count">{formatCount(item.likes + (liked ? 1 : 0))}</span>
        <HeartIcon filled={liked} />
      </button>

      <div className="card__preview" style={previewStyle}>
        {live ? (
          <div className="card__live">
            <Component {...previewValues} />
          </div>
        ) : (
          <div className="card__still">{item.name}</div>
        )}
      </div>

      <div className="card__meta">
        <span>
          <span className="card__name">{item.name}</span>
          <span className="card__category">{item.category}</span>
        </span>

        <span className="card__stats">
          {item.pro && (
            <span className="card__badge card__badge--pro" title="Pro component">
              <CrownIcon />
            </span>
          )}

          <span className="card__views" title={`${item.views.toLocaleString()} views`}>
            <EyeIcon /> {formatCount(item.views)}
          </span>
        </span>
      </div>
    </div>
  );
}

function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function SearchIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 8.5 6.8 12 12 5l5.2 7L21 8.5V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5Z" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const LIKES_KEY = "compshope:likes";

function readLikes() {
  try {
    const raw = window.localStorage.getItem(LIKES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Private windows and blocked site data both throw here.
    return {};
  }
}

/** A like is this visitor's own mark, kept in their browser and nowhere else. */
function useLike(id) {
  const [liked, setLiked] = useState(() => !!readLikes()[id]);

  const toggle = () => {
    setLiked((was) => {
      const next = !was;
      try {
        const all = readLikes();
        if (next) all[id] = true;
        else delete all[id];
        window.localStorage.setItem(LIKES_KEY, JSON.stringify(all));
      } catch {
        // Storage is a convenience; the toggle still works for this session.
      }
      return next;
    });
  };

  return [liked, toggle];
}

function StillIcon() {
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
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  );
}

function LiveIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none" />
    </svg>
  );
}
