import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import sections, { sectionCategories } from "../sections/registry";
import "./sections-page.css";

const SORTS = [
  { id: "recent", label: "Newest" },
  { id: "views", label: "Most viewed" },
  { id: "likes", label: "Most liked" },
];

export default function SectionsPage() {
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("recent");

  const cats = useMemo(sectionCategories, []);

  const results = useMemo(() => {
    const list = sections.filter((s) => !category || s.category === category);
    const sorted = [...list];
    if (sort === "views") sorted.sort((a, b) => b.views - a.views);
    else if (sort === "likes") sorted.sort((a, b) => b.likes - a.likes);
    else sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return sorted;
  }, [category, sort]);

  return (
    <div className="sections">
      <header className="sections__head">
        <div>
          <span className="sections__slug">
            Sections / {String(results.length).padStart(2, "0")} listed
          </span>
          <h1 className="sections__title">Section Library</h1>
          <p className="sections__lede">
            Hosted page sections you can preview live, open on GitHub, and pull into a
            project as a zip or an agent prompt.
          </p>
        </div>
      </header>

      <div className="sections__filters">
        <div className="filter-row" role="group" aria-label="Category">
          <button
            type="button"
            className={`filter${category === null ? " filter--on" : ""}`}
            onClick={() => setCategory(null)}
          >
            All <span className="filter__count">{sections.length}</span>
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

      <div className="sections__grid">
        {results.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section }) {
  // The frame only mounts once the card is on screen — six live iframes on
  // first paint would stall the page for no benefit.
  const [visible, setVisible] = useState(false);

  return (
    <article className="scard">
      <div
        className="scard__frame"
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
            className="scard__iframe"
            src={section.hostedUrl}
            title={`${section.name} preview`}
            loading="lazy"
            // Sandboxed so a hosted page cannot navigate this one, submit
            // forms, or open popups. `allow-same-origin` is what lets it load
            // its own stylesheets — without it the frame renders unstyled.
            // It grants nothing against this page for a genuinely external
            // section, since the frame is a different origin either way.
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            tabIndex={-1}
          />
        ) : (
          <div className="scard__placeholder" aria-hidden="true" />
        )}

        {/* The frame is inert; the whole card is the link. */}
        <Link
          to={`/section/${section.id}`}
          className="scard__hit"
          aria-label={`${section.name} — ${section.category}`}
        />

        {section.pro && <span className="scard__pro">Pro</span>}
      </div>

      <div className="scard__meta">
        <div>
          <h2 className="scard__name">{section.name}</h2>
          <p className="scard__category">{section.category}</p>
        </div>
        <span className="scard__stack">{section.stack.join(" · ")}</span>
      </div>
    </article>
  );
}
