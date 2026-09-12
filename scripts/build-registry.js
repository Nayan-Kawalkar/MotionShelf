/**
 * Emits the public registry the CLI installs from.
 *
 * The component metadata lives in `src/components/<id>/meta.js`, which imports
 * its sources with Vite's `?raw` suffix — those only exist inside a bundle, so
 * a plain Node script cannot read them. Loading the registry through Vite's own
 * SSR pipeline resolves `?raw`, JSX and CSS imports for us, which keeps
 * `meta.js` the single source of truth: add a component to the registry and it
 * becomes installable, with no second list to maintain.
 *
 * Output:
 *   public/r/index.json    every component, for `list` and name suggestions
 *   public/r/<id>.json     one component: its files, deps and variants
 */
import { createServer } from "vite";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/r");

/** Control schema minus anything that cannot cross a JSON boundary. */
function serializableControl(control) {
  // `when` is a predicate used to dim dependent fields in the web panel; it has
  // no meaning to the CLI.
  const { when, ...rest } = control;
  return { ...rest, ...(when ? { dependent: true } : null) };
}

function entryFor(item, toBundlerSource) {
  const { jsx, css, vanilla, html } = item.sources;

  const files = [
    { path: jsx.name, target: "component", content: toBundlerSource(jsx.code) },
  ];
  if (css) files.push({ path: css.name, target: "styles", content: css.code });

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    tags: item.tags,
    pro: !!item.pro,
    dependencies: item.dependencies ?? [],
    controls: item.controls.map(serializableControl),
    variants: item.variants.map((v) => ({ id: v.id, name: v.name, values: v.values })),
    files,
    // Flavours the CLI does not install but the site offers.
    alternates: {
      // A component authored as a standalone page has no mountable module; the
      // page itself is its vanilla flavour.
      vanilla: (vanilla ?? html)?.name ?? null,
    },
  };
}

async function main() {
  const server = await createServer({
    // No watcher: it would react to the files we are writing as we close.
    server: { middlewareMode: true, watch: null },
    appType: "custom",
    logLevel: "warn",
  });

  try {
    const { default: registry } = await server.ssrLoadModule("/src/registry.js");
    const { toBundlerSource } = await server.ssrLoadModule("/src/lib/exporters/bake.js");

    await rm(OUT_DIR, { recursive: true, force: true });
    await mkdir(OUT_DIR, { recursive: true });

    const index = [];
    for (const item of registry) {
      const entry = entryFor(item, toBundlerSource);
      await writeFile(
        path.join(OUT_DIR, `${entry.id}.json`),
        JSON.stringify(entry, null, 2) + "\n"
      );
      index.push({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        description: entry.description,
        pro: entry.pro,
        variants: entry.variants.map((v) => v.id),
      });
      console.log(`  ${entry.id.padEnd(24)} ${entry.files.length} file(s), ${entry.dependencies.length} dep(s)`);
    }

    await writeFile(
      path.join(OUT_DIR, "index.json"),
      JSON.stringify({ version: 1, components: index }, null, 2) + "\n"
    );
    console.log(`\nWrote ${index.length} components to public/r/`);
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
