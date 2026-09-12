import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { marked } from "marked";
import entries, { TYPES, getEntry } from "../lab/content";
import { TypeMark } from "../lab/ui";
import { formatDate } from "../lab/format";
import "./lab-entry-page.css";

marked.setOptions({ gfm: true });

export default function LabEntryPage() {
  const { slug } = useParams();
  const entry = getEntry(slug);

  // Lab content is committed to this repo by its owner — it is first-party,
  // not user input, so the rendered HTML is trusted and not sanitised.
  const html = useMemo(() => (entry ? marked.parse(entry.body) : ""), [entry]);

  if (!entry) {
    return (
      <div className="empty">
        <h1>Nothing here</h1>
        <p>That entry doesn’t exist, or it moved.</p>
        <Link to="/lab" className="empty__link">
          Back to the Lab
        </Link>
      </div>
    );
  }

  const type = TYPES[entry.type];
  const hasFlow = (entry.type === "pipeline" || entry.type === "automation") && entry.steps.length > 0;
  const more = entries.filter((e) => e.slug !== entry.slug && e.type === entry.type).slice(0, 3);

  return (
    <article className={`entry entry--${entry.type}`}>
      <header className="entry__head">
        <Link to="/lab" className="entry__back">
          ‹ Lab
        </Link>
        <span className="entry__type">
          <TypeMark type={entry.type} /> {type.label}
        </span>
        <h1 className="entry__title">{entry.title}</h1>
        {entry.summary && <p className="entry__summary">{entry.summary}</p>}
        <div className="entry__meta">
          {entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}
          {entry.tags.map((t) => (
            <span key={t} className="entry__tag">
              {t}
            </span>
          ))}
        </div>
      </header>

      {entry.cover && <Cover src={entry.cover} />}

      {hasFlow && <Flow trigger={entry.trigger} steps={entry.steps} />}

      <div className="entry__layout">
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />

        <aside className="entry__facts" aria-label={`${type.label} details`}>
          <Facts entry={entry} />
        </aside>
      </div>

      {more.length > 0 && (
        <section className="entry__more">
          <h2 className="entry__more-title">More {type.plural.toLowerCase()}</h2>
          <div className="entry__more-list">
            {more.map((e) => (
              <Link key={e.slug} to={`/lab/${e.slug}`} className="entry__more-item">
                <span className="entry__more-name">{e.title}</span>
                {e.date && <span className="entry__more-date">{formatDate(e.date)}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

/** The hero image, with a skeleton holding its space until it paints. */
function Cover({ src }) {
  const [ready, setReady] = useState(false);
  return (
    <div className="entry__cover-wrap">
      <span className={`skeleton${ready ? " skeleton--done" : ""}`} aria-hidden="true" />
      <img className="entry__cover" src={src} alt="" onLoad={() => setReady(true)} />
    </div>
  );
}

/** Pipelines and automations: the trigger, then each step, left to right. */
function Flow({ trigger, steps }) {
  return (
    <ol className="flow" aria-label="Flow">
      {trigger && (
        <li className="flow__node flow__node--trigger">
          <span className="flow__label">Trigger</span>
          <span className="flow__text">{trigger}</span>
        </li>
      )}
      {steps.map((step, i) => (
        <li key={i} className="flow__node">
          <span className="flow__label">Step {String(i + 1).padStart(2, "0")}</span>
          <span className="flow__text">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Facts({ entry }) {
  const rows = [];
  if (entry.type === "case-study") {
    if (entry.client) rows.push(["Client", entry.client]);
    if (entry.role) rows.push(["Role", entry.role]);
    if (entry.duration) rows.push(["Duration", entry.duration]);
  }
  if (entry.type === "agent" && entry.model) rows.push(["Model", entry.model]);
  if ((entry.type === "pipeline" || entry.type === "automation") && entry.trigger) {
    rows.push(["Trigger", entry.trigger]);
  }

  return (
    <>
      {rows.length > 0 && (
        <dl className="facts">
          {rows.map(([k, v]) => (
            <div key={k} className="facts__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {entry.outcomes.length > 0 && (
        <FactList title="Outcomes" items={entry.outcomes} emphasis />
      )}
      {entry.tools.length > 0 && <FactList title="Tools" items={entry.tools} />}
      {entry.stack.length > 0 && <FactList title="Stack" items={entry.stack} chips />}

      {(entry.links.repo || entry.links.live) && (
        <div className="facts__links">
          {entry.links.live && (
            <a className="btn btn--primary" href={entry.links.live} target="_blank" rel="noreferrer noopener">
              View live
            </a>
          )}
          {entry.links.repo && (
            <a className="btn" href={entry.links.repo} target="_blank" rel="noreferrer noopener">
              Source on GitHub
            </a>
          )}
        </div>
      )}
    </>
  );
}

function FactList({ title, items, emphasis, chips }) {
  return (
    <div className="factlist">
      <h3 className="factlist__title">{title}</h3>
      <ul className={`factlist__items${chips ? " factlist__items--chips" : ""}${emphasis ? " factlist__items--emphasis" : ""}`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
