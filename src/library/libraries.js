import sections, { getSection, sectionCategories } from "../sections/registry";
import templates, { getTemplate, templateCategories } from "../templates/registry";

/**
 * One entry per hosted library. LibraryPage and LibraryItemPage render
 * whichever they are handed — everything that differs between Sections and
 * Templates lives here, not in the components.
 *
 *   shape  "band" for single sections (wide 16:10 previews, two-up), "page"
 *          for whole templates (taller 4:3 previews showing the top of a site)
 */
export const SECTIONS = {
  key: "sections",
  noun: "section",
  plural: "sections",
  indexPath: "/sections",
  itemPath: "/section",
  title: "Section Library",
  lede:
    "Hosted page sections you can preview live, open on GitHub, and pull into a project as a zip or an agent prompt.",
  shape: "band",
  items: sections,
  categories: sectionCategories,
  get: getSection,
};

export const TEMPLATES = {
  key: "templates",
  noun: "template",
  plural: "templates",
  indexPath: "/templates",
  itemPath: "/template",
  title: "Template Library",
  lede:
    "Complete multi-page sites. Walk through every page live, open the source on GitHub, and take it as a zip or an agent prompt.",
  shape: "page",
  items: templates,
  categories: templateCategories,
  get: getTemplate,
};
