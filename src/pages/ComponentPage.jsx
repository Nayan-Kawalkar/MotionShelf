import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getComponent, isScrollDriven, previewVars, similarTo } from "../registry";
import useComponentState from "../lib/useComponentState";
import ControlPanel from "../components/ui/ControlPanel";
import ExportModal from "../components/ui/ExportModal";
import Stage from "../components/ui/Stage";
import PreviewFrame from "../components/ui/PreviewFrame";
import NotFoundPage from "./NotFoundPage";
import "./component-page.css";

export default function ComponentPage() {
  const { id } = useParams();
  const item = getComponent(id);
  // Remounting per component keeps each workbench's history and variant its own.
  return item ? <Workbench key={item.id} item={item} /> : <NotFoundPage />;
}

function Workbench({ item }) {
  const state = useComponentState(item);
  const [showExport, setShowExport] = useState(false);
  const [helperMode, setHelperMode] = useState(false);
  const [responsive, setResponsive] = useState(false);

  const Component = item.component;
  const similar = similarTo(item);
  // Scroll-driven components need their own document to scroll — see PreviewFrame.
  const scrollDriven = isScrollDriven(item, state.values);
  const variantName =
    state.variants.find((v) => v.id === state.variantId)?.name ?? item.variants[0].name;

  return (
    <div className="workbench">
      <aside className="rail">
        <Link to="/" className="rail__back">
          <span aria-hidden="true">‹</span> Go back
        </Link>

        {similar.length > 0 && (
          <>
            <h2 className="rail__title">Similar Components</h2>
            <div className="rail__list">
              {similar.map((other) => (
                // Container plus a stretched link, not a link wrapping the
                // preview: some components render their own anchors, and an
                // <a> inside an <a> is invalid HTML React refuses to hydrate.
                <div key={other.id} className="rail__card">
                  <Link
                    to={`/component/${other.id}`}
                    className="rail__hit"
                    aria-label={other.name}
                  />
                  <div className="rail__preview" style={previewVars(other)}>
                    <div className="rail__scale">
                      <other.component />
                    </div>
                  </div>
                  <span className="rail__name">{other.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      <section className="work">
        <header className="work__head">
          <div className="work__titles">
            <h1 className="work__title">{item.name}</h1>
            <p className="work__stats">
              <span title="Views">
                <EyeIcon /> {item.views.toLocaleString()}
              </span>
              <span aria-hidden="true">•</span>
              <span title="Copies">
                <CopiesIcon /> {item.copies}
              </span>
            </p>
          </div>

          <button type="button" className="work__get" onClick={() => setShowExport(true)}>
            Get this Component
          </button>
        </header>

        <Stage
          onReset={state.reset}
          responsive={responsive}
          onResponsive={setResponsive}
          scroll={scrollDriven}
          height={item.previewHeight}
        >
          {scrollDriven ? (
            <PreviewFrame item={item} values={state.values} />
          ) : (
            <Component {...state.values} />
          )}
        </Stage>
      </section>

      <ControlPanel
        item={item}
        state={state}
        helperMode={helperMode}
        onHelperMode={setHelperMode}
      />

      {showExport && (
        <ExportModal
          item={item}
          values={state.values}
          variantName={variantName}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
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

function CopiesIcon() {
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
