import { categoriesOf } from "../library/shared";

/**
 * Templates are whole sites rather than single bands, but the same kind of
 * entry: pure metadata pointing at something hosted and on GitHub. Two fields
 * sections do not have:
 *
 *   framework  what it is built on, shown on the card and in the prompt
 *   pages      every page the template ships, each with its own hosted path —
 *              the detail page's preview switches between them, and
 *              `hostedUrl` is simply the first one
 *
 * Swapping a placeholder for a real template: point each page `url` at the
 * live page and `repo` at the real repository.
 */

// SCAFFOLD: these point at demo pages served from this project's own /public
// so the multi-page preview is visible end to end. Replace with real URLs.
const DEMO = "/templates-demo";

function pagesFor(slug, names) {
  return names.map((name) => ({
    name,
    url: `${DEMO}/${slug}/${name.toLowerCase().replace(/\s+/g, "-")}.html`,
  }));
}

const templates = [
  {
    // A real, live template — not scaffold. Hosted-only for now: no public
    // repository is linked from the site, so `repo` stays null (GitHub link
    // and zip download are hidden) until the source URL is known.
    id: "luxeria",
    name: "Luxeria",
    category: "Automotive",
    tags: ["3d", "webgl", "automotive", "showcase", "luxury"],
    description:
      "A luxury car showcase built around real-time 3D models — a single-page collection of performance cars with cinematic scroll motion.",
    pages: [{ name: "Home", url: "https://luxeriaa.vercel.app/" }],
    repo: null,
    branch: null,
    framework: "React",
    stack: ["React", "Three.js", "GSAP", "Vite"],
    addedAt: "2026-09-12",
    views: 0,
    likes: 0,
    pro: false,
  },
  {
    id: "northwind-saas",
    name: "Northwind",
    category: "SaaS",
    tags: ["saas", "landing", "pricing", "dark"],
    description:
      "A dark SaaS site with a product-first hero, a feature grid, three-tier pricing and a docs-style changelog.",
    pages: pagesFor("northwind-saas", ["Home", "Pricing", "Changelog"]),
    repo: "Nayan-Kawalkar/MotionShelf-templates",
    branch: "main",
    dir: "northwind-saas",
    framework: "Astro",
    stack: ["Astro", "CSS"],
    addedAt: "2026-09-11",
    views: 3120,
    likes: 486,
    pro: true,
  },
  {
    id: "folio-studio",
    name: "Folio",
    category: "Portfolio",
    tags: ["portfolio", "studio", "case-study", "editorial"],
    description:
      "An editorial studio portfolio: oversized project index, full-bleed case studies and a quiet contact page.",
    pages: pagesFor("folio-studio", ["Home", "Work", "Contact"]),
    repo: "Nayan-Kawalkar/MotionShelf-templates",
    branch: "main",
    dir: "folio-studio",
    framework: "HTML",
    stack: ["HTML", "CSS", "JS"],
    addedAt: "2026-09-10",
    views: 2280,
    likes: 351,
    pro: false,
  },
  {
    id: "harbor-agency",
    name: "Harbor",
    category: "Agency",
    tags: ["agency", "services", "team", "light"],
    description:
      "A services agency site with a statement hero, a numbered services list and a team page.",
    pages: pagesFor("harbor-agency", ["Home", "Services"]),
    repo: "Nayan-Kawalkar/MotionShelf-templates",
    branch: "main",
    dir: "harbor-agency",
    framework: "Next.js",
    stack: ["Next.js", "Tailwind"],
    addedAt: "2026-09-09",
    views: 1760,
    likes: 244,
    pro: false,
  },
  {
    id: "ledger-docs",
    name: "Ledger Docs",
    category: "Documentation",
    tags: ["docs", "sidebar", "search", "reference"],
    description:
      "A documentation site with a persistent sidebar, reading-width articles and an API reference layout.",
    pages: pagesFor("ledger-docs", ["Home", "Guide"]),
    repo: "Nayan-Kawalkar/MotionShelf-templates",
    branch: "main",
    dir: "ledger-docs",
    framework: "Astro",
    stack: ["Astro", "MDX"],
    addedAt: "2026-09-08",
    views: 1390,
    likes: 197,
    pro: false,
  },
];

// Every template's preview and "Full preview" link use its first page.
for (const t of templates) t.hostedUrl = t.pages[0].url;

export default templates;

export const templateCategories = () => categoriesOf(templates);

export function getTemplate(id) {
  return templates.find((t) => t.id === id);
}
