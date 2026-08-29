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
          <h1 className="results__count">
            Discover {results.length} Component{results.length === 1 ? "" : "s"}
          </h1>

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
            {results.map((item) => (
              <ComponentCard key={item.id} item={item} live={livePreviews} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ComponentCard({ item, live }) {
  const Component = item.component;
  // Cards show a component at its first variant, not the visitor's edits.
  const previewValues = useMemo(() => variantValues(item, item.variants[0].id), [item]);

  return (
    <Link to={`/component/${item.id}`} className="card">
      <div className="card__preview" style={previewVars(item)}>
        {live ? (
          <div className="card__live">
            <Component {...previewValues} />
          </div>
        ) : (
          <div className="card__still">{item.name}</div>
        )}
        {item.pro && (
          <span className="card__pro" title="Pro component" aria-label="Pro component">
            ♛
          </span>
        )}
      </div>

      <div className="card__foot">
        <span className="card__name">{item.name}</span>
        <span className="card__views">
          <EyeIcon /> {formatCount(item.views)}
        </span>
      </div>
    </Link>
  );
}

function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
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

function EyeIcon() {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
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
