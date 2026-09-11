import yaml from "js-yaml";

/**
 * Lab entries are markdown files in /content/lab. Adding one is dropping a file
 * in and committing — there is no backend, no upload step, and every change is
 * versioned in git.
 *
 *   content/lab/my-post.md      → /lab/my-post
 *   content/lab/_agent.md       → ignored: underscore files are starters to copy
 *   content/lab/README.md       → ignored
 *
 * Each file opens with a YAML frontmatter block between `---` fences. The
 * fields every type shares, and the extras each type adds, are listed in TYPES
 * below and in content/lab/README.md.
 *
 * A file that fails to parse or validate is left out and reported in `errors`
 * rather than thrown, so one bad post never takes the whole Lab page down.
 */

export const TYPES = {
  "case-study": { label: "Case Study", plural: "Case Studies" },
  pipeline: { label: "Pipeline", plural: "Pipelines" },
  agent: { label: "Agent", plural: "Agents" },
  automation: { label: "Automation", plural: "Automation" },
};

// Vite inlines every matching file at build time, so this works on a static
// deploy with nothing to fetch at runtime. Starters and the README are
// excluded here so they never reach the bundle; the name check in the loop
// below is only a safety net.
const files = import.meta.glob(["/content/lab/*.md", "!/content/lab/_*.md", "!/content/lab/README.md"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function slugOf(path) {
  return path.split("/").pop().replace(/\.md$/, "");
}

function asList(value) {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => String(v).trim()).filter(Boolean);
}

function parse(path, raw) {
  const slug = slugOf(path);
  const match = raw.match(FENCE);
  if (!match) throw new Error("missing the --- frontmatter block at the top");

  let data;
  try {
    data = yaml.load(match[1]) ?? {};
  } catch (e) {
    throw new Error(`frontmatter is not valid YAML: ${e.reason ?? e.message}`);
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("frontmatter must be key: value pairs");
  }

  if (!TYPES[data.type]) {
    throw new Error(`type must be one of ${Object.keys(TYPES).join(", ")} — got "${data.type}"`);
  }
  if (!data.title) throw new Error("title is required");

  // js-yaml turns an unquoted 2026-09-12 into a Date; either form is fine.
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");

  return {
    slug,
    type: data.type,
    title: String(data.title),
    summary: data.summary ? String(data.summary) : "",
    date,
    tags: asList(data.tags),
    cover: data.cover ? String(data.cover) : null,
    links: {
      repo: data.repo ? String(data.repo) : null,
      live: data.live ? String(data.live) : null,
    },

    // case-study
    client: data.client ? String(data.client) : null,
    role: data.role ? String(data.role) : null,
    duration: data.duration ? String(data.duration) : null,
    outcomes: asList(data.outcomes),

    // agent
    model: data.model ? String(data.model) : null,
    tools: asList(data.tools),

    // pipeline / automation
    trigger: data.trigger ? String(data.trigger) : null,
    steps: asList(data.steps),

    stack: asList(data.stack),
    body: match[2].trim(),
  };
}

const entries = [];
export const errors = [];

for (const [path, raw] of Object.entries(files)) {
  const name = path.split("/").pop();
  if (name.startsWith("_") || name.toLowerCase() === "readme.md") continue;
  try {
    entries.push(parse(path, raw));
  } catch (e) {
    errors.push({ file: name, message: e.message });
  }
}

if (import.meta.env.DEV && errors.length) {
  for (const { file, message } of errors) {
    console.warn(`[lab] skipped content/lab/${file}: ${message}`);
  }
}

// Newest first; undated posts sink to the end.
entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

export default entries;

export function getEntry(slug) {
  return entries.find((e) => e.slug === slug);
}

/** Types that actually have entries, with counts, in TYPES order. */
export function typeCounts() {
  return Object.entries(TYPES)
    .map(([id, t]) => ({ id, ...t, count: entries.filter((e) => e.type === id).length }))
    .filter((t) => t.count > 0);
}
