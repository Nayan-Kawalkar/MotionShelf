/**
 * Helpers shared by every hosted library — Sections and Templates today.
 *
 * An entry in either registry is pure metadata pointing at something already
 * hosted and already on GitHub:
 *
 *   hostedUrl  the live page, iframed for previews and opened by "Full preview"
 *   repo       "owner/name" — the GitHub link, and what the zip is built from.
 *              Optional: an entry that is only hosted, with no public source,
 *              leaves it null and the GitHub link and zip download are hidden
 *   branch     which branch the zip downloads (GitHub assembles it)
 *   dir        optional subdirectory the entry lives in
 *
 * Nothing here knows which library it is serving; the noun ("section",
 * "template") is passed in wherever wording depends on it.
 */

export function repoUrl(item) {
  if (!item.repo) return null;
  const base = `https://github.com/${item.repo}`;
  return item.dir ? `${base}/tree/${item.branch}/${item.dir}` : base;
}

/**
 * GitHub assembles the archive itself, so there is nothing to bundle here and
 * no zip library to ship. It is always the whole repository at that branch — a
 * subdirectory cannot be downloaded on its own, which is why the prompt and the
 * detail page both name `dir`.
 */
export function zipUrl(item) {
  if (!item.repo) return null;
  return `https://github.com/${item.repo}/archive/refs/heads/${item.branch}.zip`;
}

/**
 * An agent reading the prompt is not on this site, so a path like
 * "/demo/index.html" means nothing to it. Resolve against the page's own
 * origin; absolute URLs pass through unchanged.
 */
function absoluteUrl(url) {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

/** Categories with counts, in first-seen order, for a filter row. */
export function categoriesOf(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** The paste-into-an-agent brief for pulling one entry into a project. */
export function buildPrompt(item, noun) {
  const pages = item.pages?.length > 1 ? item.pages.map((p) => p.name).join(", ") : null;

  return [
    `Add the "${item.name}" ${noun} to my project.`,
    "",
    item.description,
    "",
    item.repo ? `Source: ${repoUrl(item)}` : null,
    item.repo && item.dir ? `It lives in the \`${item.dir}\` directory of that repo.` : null,
    `Live reference: ${absoluteUrl(item.hostedUrl)}`,
    item.framework ? `Framework: ${item.framework}` : null,
    `Built with: ${item.stack.join(", ")}`,
    pages ? `Pages: ${pages}` : null,
    "",
    item.repo
      ? "Fetch that source, then recreate it in my codebase:"
      : "There is no public source, so work from the live reference and recreate it in my codebase:",
    "- match the surrounding project's markup conventions and styling system",
    "- keep the layout, spacing and motion of the original",
    "- replace the placeholder copy and images with mine, which I will name next",
    "- keep it responsive and accessible",
  ]
    // Optional lines are null; "" is a deliberate blank line and stays.
    .filter((line) => line !== null)
    .join("\n");
}
