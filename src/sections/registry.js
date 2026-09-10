/**
 * Sections are not built in this repo. Each entry is pure metadata pointing at
 * something already hosted and already on GitHub:
 *
 *   hostedUrl  the live section, iframed for the preview and opened by
 *              "Full preview"
 *   repo       "owner/name" — the GitHub link, and what the zip is built from
 *   branch     which branch the zip downloads (GitHub assembles it)
 *   dir        optional subdirectory, shown in the prompt so an agent knows
 *              where in the repo the section lives
 *
 * Swapping a placeholder for a real section is a one-field change: point
 * `hostedUrl` at the live URL and `repo` at the real repository.
 */

// SCAFFOLD: these point at demo pages served from this project's own /public
// so the preview flow is visible end to end. Replace with real hosted URLs.
const DEMO = "/sections-demo";

const sections = [
  {
    id: "aurora-hero",
    name: "Aurora Hero",
    category: "Hero",
    tags: ["hero", "gradient", "dark", "cta"],
    description:
      "A full-height hero with a drifting aurora gradient, an oversized headline and a paired call to action.",
    hostedUrl: `${DEMO}/aurora-hero.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "aurora-hero",
    stack: ["HTML", "CSS"],
    addedAt: "2026-09-11",
    views: 2100,
    likes: 318,
    pro: false,
  },
  {
    id: "ledger-pricing",
    name: "Ledger Pricing",
    category: "Pricing",
    tags: ["pricing", "table", "tiers", "toggle"],
    description:
      "Three tiers on a hairline grid with a monthly/annual toggle and a highlighted middle plan.",
    hostedUrl: `${DEMO}/ledger-pricing.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "ledger-pricing",
    stack: ["HTML", "CSS", "JS"],
    addedAt: "2026-09-10",
    views: 1640,
    likes: 247,
    pro: false,
  },
  {
    id: "marquee-logos",
    name: "Marquee Logos",
    category: "Social Proof",
    tags: ["logos", "marquee", "loop", "clients"],
    description:
      "An edge-faded logo wall that loops seamlessly and pauses when the pointer rests on it.",
    hostedUrl: `${DEMO}/marquee-logos.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "marquee-logos",
    stack: ["HTML", "CSS"],
    addedAt: "2026-09-09",
    views: 980,
    likes: 132,
    pro: false,
  },
  {
    id: "stacked-faq",
    name: "Stacked FAQ",
    category: "FAQ",
    tags: ["faq", "accordion", "disclosure", "a11y"],
    description:
      "An accessible disclosure list built on native details/summary, with a measured open-and-close.",
    hostedUrl: `${DEMO}/stacked-faq.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "stacked-faq",
    stack: ["HTML", "CSS"],
    addedAt: "2026-09-08",
    views: 1220,
    likes: 176,
    pro: false,
  },
  {
    id: "split-testimonial",
    name: "Split Testimonial",
    category: "Testimonial",
    tags: ["testimonial", "quote", "portrait", "split"],
    description:
      "A two-column quote block: portrait on one side, oversized pull quote and attribution on the other.",
    hostedUrl: `${DEMO}/split-testimonial.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "split-testimonial",
    stack: ["HTML", "CSS"],
    addedAt: "2026-09-07",
    views: 1450,
    likes: 209,
    pro: true,
  },
  {
    id: "grid-footer",
    name: "Grid Footer",
    category: "Footer",
    tags: ["footer", "grid", "links", "newsletter"],
    description:
      "A four-column footer with a newsletter capture, legal row and a quiet oversized wordmark.",
    hostedUrl: `${DEMO}/grid-footer.html`,
    repo: "Nayan-Kawalkar/MotionShelf-sections",
    branch: "main",
    dir: "grid-footer",
    stack: ["HTML", "CSS"],
    addedAt: "2026-09-06",
    views: 870,
    likes: 118,
    pro: false,
  },
];

export default sections;

export function getSection(id) {
  return sections.find((s) => s.id === id);
}

/** Categories with counts, for the filter row. */
export function sectionCategories() {
  const counts = new Map();
  for (const s of sections) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

export function repoUrl(section) {
  const base = `https://github.com/${section.repo}`;
  return section.dir ? `${base}/tree/${section.branch}/${section.dir}` : base;
}

/**
 * GitHub assembles the archive itself, so there is nothing to bundle here and
 * no zip library to ship. It is always the whole repository at that branch —
 * a subdirectory cannot be downloaded on its own, which is why the prompt and
 * the detail page both name `dir`.
 */
export function zipUrl(section) {
  return `https://github.com/${section.repo}/archive/refs/heads/${section.branch}.zip`;
}

/** The paste-into-an-agent brief for pulling one section into a project. */
export function sectionPrompt(section) {
  return [
    `Add the "${section.name}" section to my project.`,
    "",
    section.description,
    "",
    `Source: ${repoUrl(section)}`,
    section.dir ? `The section lives in the \`${section.dir}\` directory of that repo.` : "",
    `Live reference: ${section.hostedUrl}`,
    `Built with: ${section.stack.join(", ")}`,
    "",
    "Fetch that source, then recreate the section in my codebase:",
    "- match the surrounding project's markup conventions and styling system",
    "- keep the layout, spacing and motion of the original",
    "- replace the placeholder copy and images with mine, which I will name next",
    "- keep it responsive and accessible",
  ]
    .filter(Boolean)
    .join("\n");
}
