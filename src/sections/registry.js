import { categoriesOf } from "../library/shared";

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

export const sectionCategories = () => categoriesOf(sections);

export function getSection(id) {
  return sections.find((s) => s.id === id);
}
