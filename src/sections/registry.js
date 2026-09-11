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

const sections = [
  // ---- Real sections -------------------------------------------------------
  {
    id: "moving-garden",
    name: "Moving Garden",
    category: "Hero",
    tags: ["hero", "parallax", "scroll", "layers", "nature"],
    description:
      "A scroll-driven hero that reveals a garden scene in stacked parallax layers, each frame drifting at its own depth as you scroll.",
    hostedUrl: "https://moving-gardern.vercel.app/",
    repo: "Nayan-Kawalkar/Moving-Gardern",
    branch: "main",
    stack: ["React", "Tailwind", "Vite"],
    addedAt: "2026-09-12",
    views: 0,
    likes: 0,
    pro: false,
  },

];

export default sections;

export const sectionCategories = () => categoriesOf(sections);

export function getSection(id) {
  return sections.find((s) => s.id === id);
}
