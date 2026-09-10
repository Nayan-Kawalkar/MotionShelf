const BLOCK = /(\/\*\s*@controls:start\s*\*\/)([\s\S]*?)(\/\*\s*@controls:end\s*\*\/)/;

export function serialize(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Rewrites the `@controls` DEFAULTS block of a source file so it carries the
 * visitor's current settings. Keys the block declares but the schema doesn't
 * expose are left untouched, and formatting is preserved line by line.
 *
 * Returns the source unchanged if it has no marked block.
 */
export function bakeDefaults(source, values) {
  const match = source.match(BLOCK);
  if (!match) return source;

  const [, open, body, close] = match;

  const baked = Object.entries(values).reduce((acc, [key, value]) => {
    // Match `key: <anything up to the line-ending comma>` inside the block only.
    const line = new RegExp(`(^\\s*${escapeKey(key)}\\s*:\\s*)([^\\n]*?)(,?\\s*$)`, "m");
    return line.test(acc) ? acc.replace(line, `$1${serialize(value)}$3`) : acc;
  }, body);

  return source.replace(BLOCK, open + baked + close);
}

/** A readable settings list for prompts and comment headers. */
export function describeValues(item, values) {
  return item.controls
    .map((c) => `- ${c.label} (${c.key}): ${values[c.key]}${c.unit ?? ""}`)
    .join("\n");
}

function escapeKey(key) {
  return key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FRAMER_IMPORT = /^[ \t]*import\s*\{[^}]*\}\s*from\s*["']framer["'][ \t]*;?[ \t]*\r?\n/m;

// Framer's canvas/preview switch. Outside Framer a component always runs live,
// so the stub reports the preview target.
const RENDER_TARGET_STUB = `// Framer's render-target switch, stubbed for use outside Framer.
const RenderTarget = {
    canvas: "CANVAS",
    thumbnail: "THUMBNAIL",
    preview: "PREVIEW",
    current: () => "PREVIEW",
}
`;

// Framer resolves URL imports at build time, so code components pull packages
// straight from a CDN. A bundler cannot, and expects the bare specifier — the
// package the registry entry already lists as a dependency.
const CDN_IMPORT = /(from\s*["'])https:\/\/esm\.sh\/((?:@[^/"'@]+\/)?[^/"'@]+)(?:@[^/"']*)?(["'])/g;

/**
 * Turns a Framer code component into a source file that compiles in a plain
 * React project.
 *
 * The `framer` module only exists inside Framer, so the import has to go. Its
 * two consumers are handled differently: `addPropertyControls` builds Framer's
 * properties panel and is meaningless elsewhere, so the whole trailing call is
 * dropped along with the `ControlType` values it uses; `RenderTarget` is read
 * in the component body, so it is replaced by a stub.
 *
 * Sources that never imported from `framer` pass through untouched.
 */
export function toReactSource(source) {
  if (!FRAMER_IMPORT.test(source)) return source;

  let out = source.replace(FRAMER_IMPORT, "").replace(CDN_IMPORT, "$1$2$3");

  // The property controls are always the final statement in the file.
  const call = out.lastIndexOf("addPropertyControls(");
  if (call !== -1) out = out.slice(0, call).replace(/\s+$/, "") + "\n";

  if (/\bRenderTarget\b/.test(out)) {
    // Sit the stub after the last import so it can't land above one.
    const imports = [...out.matchAll(/^import[^\n]*\n/gm)];
    const at = imports.length ? imports[imports.length - 1].index + imports[imports.length - 1][0].length : 0;
    out = out.slice(0, at) + "\n" + RENDER_TARGET_STUB + out.slice(at);
  }

  return out;
}
