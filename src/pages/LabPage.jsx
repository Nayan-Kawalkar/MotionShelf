import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import entries, { TYPES, errors, typeCounts } from "../lab/content";
import { TypeMark } from "../lab/ui";
import { formatDate } from "../lab/format";
import "./lab-page.css";

export default function LabPage() {
  const [type, setType] = useState(null);
  const counts = useMemo(typeCounts, []);
  const shown = type ? entries.filter((e) => e.type === type) : entries;

  return (
    <div className="lab">
      <header className="lab__head">
        <span className="lab__slug">
          Lab / {String(entries.length).padStart(2, "0")} entries
        </span>
        <h1 className="lab__title">Lab</h1>
        <p className="lab__lede">
          Case studies, pipelines, agents and automation — how the work was actually
          built, written up.
        </p>
      </header>

      {import.meta.env.DEV && errors.length > 0 && (
        <div className="lab__errors" role="alert">
          <strong>Skipped {errors.length} file{errors.length === 1 ? "" : "s"}</strong>
          <ul>
            {errors.map((e) => (
              <li key={e.file}>
                <code>content/lab/{e.file}</code> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {counts.length > 1 && (
            <div className="lab__types" role="group" aria-label="Type">
              <button
                type="button"
                className={`filter${type === null ? " filter--on" : ""}`}
                onClick={() => setType(null)}
              >
                All <span className="filter__count">{entries.length}</span>
              </button>
              {counts.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`filter${type === t.id ? " filter--on" : ""}`}
                  onClick={() => setType(type === t.id ? null : t.id)}
                >
                  {t.plural} <span className="filter__count">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="lab__grid">
            {shown.map((entry) => (
              <LabCard key={entry.slug} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LabCard({ entry }) {
  const [ready, setReady] = useState(false);

  return (
    <Link to={`/lab/${entry.slug}`} className={`labcard labcard--${entry.type}`}>
      <div className="labcard__media">
        {entry.cover ? (
          <>
            <span className={`skeleton${ready ? " skeleton--done" : ""}`} aria-hidden="true" />
            <img src={entry.cover} alt="" loading="lazy" onLoad={() => setReady(true)} />
          </>
        ) : (
          // No cover: the type mark stands in, so the grid never shows a hole.
          <span className="labcard__mark" aria-hidden="true">
            <TypeMark type={entry.type} />
          </span>
        )}
        <span className="labcard__type">{TYPES[entry.type].label}</span>
      </div>

      <div className="labcard__body">
        <h2 className="labcard__title">{entry.title}</h2>
        {entry.summary && <p className="labcard__summary">{entry.summary}</p>}
        <div className="labcard__foot">
          {entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}
          {entry.tags.length > 0 && (
            <span className="labcard__tags">{entry.tags.slice(0, 3).join(" · ")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="lab__empty">
      <h2>No entries yet</h2>
      <p>
        Add a markdown file to <code>content/lab/</code> and commit it — it appears here
        as <code>/lab/&lt;file-name&gt;</code>.
      </p>
      <p>
        Copy a starter to begin: <code>_case-study.md</code>, <code>_pipeline.md</code>,{" "}
        <code>_agent.md</code> or <code>_automation.md</code>. Every field is listed in{" "}
        <code>content/lab/README.md</code>.
      </p>
    </div>
  );
}
