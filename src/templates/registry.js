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
 * Adding a template: one entry with each page's live `url` and its `repo`.
 */

const templates = [
  // ---- Real templates ------------------------------------------------------
  // Live sites with public repositories. Checked against the GitHub API: all
  // public, all on `main`, and every site allows being framed (no
  // X-Frame-Options, no frame-ancestors) so the previews embed.
  {
    id: "luxeria",
    name: "Luxeria",
    category: "3D Showcase",
    tags: ["3d", "webgl", "automotive", "showcase", "gltf"],
    description:
      "A luxury car showcase built around real-time 3D models: AI-generated vehicle concepts turned into GLTF models you can inspect directly in the browser.",
    pages: [{ name: "Home", url: "https://luxeriaa.vercel.app/" }],
    repo: "Nayan-Kawalkar/Luxeriaa",
    branch: "main",
    framework: "React",
    stack: ["React", "Three.js", "GSAP", "Vite"],
    addedAt: "2026-09-12",
    views: 0,
    likes: 0,
    pro: false,
  },
  {
    id: "nexbot",
    name: "NexBot",
    category: "3D Showcase",
    tags: ["3d", "webgl", "robots", "showcase", "gltf"],
    description:
      "A gallery of futuristic robot concepts, each one a real-time 3D model you can turn and explore in the browser.",
    pages: [{ name: "Home", url: "https://nex-bot-delta.vercel.app/" }],
    repo: "Nayan-Kawalkar/NexBot",
    branch: "main",
    framework: "React",
    stack: ["React", "Three.js", "GSAP", "Vite"],
    addedAt: "2026-09-12",
    views: 0,
    likes: 0,
    pro: false,
  },
  {
    id: "axiom-sneaker",
    name: "Axiom",
    category: "3D Showcase",
    tags: ["3d", "webgl", "product", "sneaker", "gltf"],
    description:
      "A single-product sneaker launch page centred on one interactive 3D shoe model. No build step — plain HTML, CSS and JavaScript with Three.js from a CDN.",
    pages: [{ name: "Home", url: "https://3-d-shoe-web.vercel.app/" }],
    repo: "Nayan-Kawalkar/3D-shoe-web",
    branch: "main",
    framework: "HTML",
    stack: ["HTML", "CSS", "JS", "Three.js"],
    addedAt: "2026-09-12",
    views: 0,
    likes: 0,
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
