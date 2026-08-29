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
