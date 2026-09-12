import { bakeDefaults, describeValues, toBundlerSource } from "./bake";

/**
 * Every export flavour produces the same shape:
 *   { id, label, files: [{ name, lang, code }], note? }
 * so the modal can render them all through one code viewer.
 */

export function generateCode(item, values) {
  const { jsx, css } = item.sources;
  // CDN URL imports become bare specifiers here, or the file will not
  // compile in the React project the visitor pastes it into.
  const files = [{ ...jsx, code: toBundlerSource(bakeDefaults(jsx.code, values)) }];
  if (css) files.push(css);
  return {
    id: "code",
    label: "Code",
    files,
    note: "Drop these into your React project. Your settings are baked into the defaults.",
  };
}

export function generateVanilla(item, values) {
  const { vanilla, css, html } = item.sources;

  // Some components are authored as a standalone page rather than a mountable
  // module. There is nothing to assemble — hand the page over as it stands.
  //
  // Deliberately not baked: a hand-written page keeps its own config block,
  // whose names and units are its own, so writing the panel's values into it
  // by key would land some settings in the wrong place and miss the rest.
  if (html) {
    return {
      id: "vanilla",
      label: "Vanilla JS",
      files: [html],
      note: "One file — HTML, CSS and JS combined. Save it and open it in a browser. Its own config block sits at the top of the script; the panel's settings are not baked in.",
    };
  }

  if (!vanilla) {
    return {
      id: "vanilla",
      label: "Vanilla",
      files: [],
      note: "No vanilla build for this component yet.",
    };
  }
  // One self-contained page: the stylesheet inlined into <style>, the module
  // inlined into <script>. Nothing to unzip, nothing to serve.
  const code = vanillaHtml(item, css, bakeDefaults(vanilla.code, values));
  return {
    id: "vanilla",
    label: "Vanilla JS",
    files: [{ name: "index.html", lang: "html", code }],
    note: "One file — HTML, CSS and JS combined. Save it and open it in a browser.",
  };
}

export function generateCli(item, variantName) {
  const flag = variantName ? ` --variant "${variantName}"` : "";
  return {
    id: "cli",
    label: "CLI",
    commands: {
      bun: `bunx --bun comp-shope@latest add ${item.id}${flag}`,
      npm: `npx comp-shope@latest add ${item.id}${flag}`,
      yarn: `yarn dlx comp-shope@latest add ${item.id}${flag}`,
      pnpm: `pnpm dlx comp-shope@latest add ${item.id}${flag}`,
    },
    note: "Pulls the component source straight into your project.",
  };
}

export function generatePrompt(item, values) {
  const code = generateCode(item, values);
  const body = code.files
    .map((f) => "```" + f.lang + "\n// " + f.name + "\n" + f.code + "\n```")
    .join("\n\n");

  const text = [
    `Add the "${item.name}" component to my project.`,
    "",
    item.description,
    "",
    "Settings I picked:",
    describeValues(item, values),
    "",
    "Here is the source, with those settings already applied as defaults:",
    "",
    body,
    "",
    "Create these files in my project, wire the component into the page I name next,",
    "and adapt the imports and styling conventions to match the surrounding codebase.",
  ].join("\n");

  return {
    id: "prompt",
    label: "AI Prompt",
    files: [{ name: "prompt.md", lang: "markdown", code: text }],
    note: "Paste into Claude Code, Cursor, or any coding agent.",
  };
}

/**
 * The whole component as one HTML file: page chrome, the component's
 * stylesheet (when it has one) and its mount module, all inlined.
 *
 * Embedded CSS and JS are written flush left rather than indented to match the
 * surrounding markup — re-indenting would rewrite the inside of any template
 * literal the source uses to inject its own styles.
 */
function vanillaHtml(item, css, js) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${item.name}</title>`,
    "    <style>",
    PAGE_CSS,
    css ? `/* ${css.name} */\n${css.code}` : "",
    "    </style>",
    "  </head>",
    "  <body>",
    `    <div id="${item.id}"></div>`,
    `    <script type="module">`,
    `/* ${item.sources.vanilla.name} */`,
    inlineModule(js),
    "",
    `mount(document.getElementById(${JSON.stringify(item.id)}));`,
    "    </script>",
    "  </body>",
    "</html>",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Enough to make the standalone file look deliberate rather than unstyled.
const PAGE_CSS = `/* page */
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: #f4f4f5;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
body > div { width: 100%; }`;

/**
 * Strips ES module exports so the source can live inside an inline
 * `<script type="module">`, where an `export` is a syntax error. The mount
 * function stays a plain declaration the trailing call can reach.
 */
function inlineModule(code) {
  return code
    .replace(/^export default (?=(async )?function\b|class\b)/m, "")
    .replace(/^export (?=(const|let|var|function|class|async)\b)/gm, "");
}


/** All file-based flavours, in the order the modal lists them. */
export function buildExports(item, values, variantName) {
  return {
    cli: generateCli(item, variantName),
    code: generateCode(item, values),
    vanilla: generateVanilla(item, values),
    prompt: generatePrompt(item, values),
  };
}
