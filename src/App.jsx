import { Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import GalleryPage from "./pages/GalleryPage";
import PreviewPage from "./pages/PreviewPage";
import ComponentPage from "./pages/ComponentPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

// Sections / Templates / Docs / Pricing are placeholders for now — the gallery
// and the component workbench are what this phase builds.
const NAV_LINKS = [
  { to: "/", label: "Components", end: true },
  { to: "/sections", label: "Sections" },
  { to: "/templates", label: "Templates" },
  { to: "/docs", label: "Docs" },
  { to: "/pricing", label: "Pricing" },
];

function BrandMark() {
  return (
    <span className="topnav__mark" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M1 4h10M1 8h10M4 1v10M8 1v10" />
      </svg>
    </span>
  );
}

function SignInIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function App() {
  // Preview documents render inside an iframe and must carry no app chrome.
  const { pathname } = useLocation();
  if (pathname.startsWith("/preview/")) {
    return (
      <Routes>
        <Route path="/preview/:id" element={<PreviewPage />} />
      </Routes>
    );
  }

  return (
    <div className="shell">
      <div className="sheet">
      <nav className="topnav">
        <Link to="/" className="topnav__brand">
          <BrandMark />
          Comp Shope
          <span className="topnav__ref">Idx / 01</span>
        </Link>

        <div className="topnav__links">
          {NAV_LINKS.map((link, i) => (
            <span key={link.to} style={{ display: "contents" }}>
              {i === NAV_LINKS.length - 1 && <span className="topnav__sep" />}
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `topnav__link${isActive ? " topnav__link--active" : ""}`
                }
              >
                {link.label}
              </NavLink>
            </span>
          ))}
        </div>

        <div className="topnav__actions">
          <button type="button" className="topnav__signin">
            <SignInIcon />
            Sign In
          </button>
        </div>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/component/:id" element={<ComponentPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      </div>
    </div>
  );
}

export default App;
