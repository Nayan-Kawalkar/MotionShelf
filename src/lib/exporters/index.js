import { bakeDefaults, describeValues, serialize } from "./bake";

/**
 * Every export flavour produces the same shape:
 *   { id, label, files: [{ name, lang, code }], note? }
 * so the modal can render them all through one code viewer.
 */

export function generateCode(item, values) {
  const { jsx, css } = item.sources;
  const files = [{ ...jsx, code: bakeDefaults(jsx.code, values) }];
  if (css) files.push(css);
  return {
    id: "code",
    label: "Code",
    files,
    note: "Drop these into your React project. Your settings are baked into the defaults.",
  };
}

export function generateFramer(item, values) {
  const { framer, jsx } = item.sources;
  const source = framer ?? jsx;
  const name = framer ? source.name : source.name.replace(/\.jsx$/, ".tsx");
  const files = [{ name, lang: "tsx", code: bakeDefaults(source.code, values) }];

  // A hand-written Framer flavour already declares its own property controls;
  // only the React fallback needs them generated.
  if (!framer) {
    files.push({
      name: "propertyControls.ts",
      lang: "ts",
      code: framerPropertyControls(item, values),
    });
  }

  return {
    id: "framer",
    label: "Framer",
    files,
    note: "Paste into a Framer code component. The property controls expose the same settings in Framer's UI.",
  };
}

export function generateVanilla(item, values) {
  const { vanilla, css } = item.sources;
  if (!vanilla) {
    return {
      id: "vanilla",
      label: "Vanilla",
      files: [],
      note: "No vanilla build for this component yet.",
    };
  }
  const files = [
    { name: "index.html", lang: "html", code: vanillaHtml(item, css) },
    { ...vanilla, code: bakeDefaults(vanilla.code, values) },
  ];
  if (css) files.push(css);
  return {
    id: "vanilla",
    label: "Vanilla JS",
    files,
    note: "No framework required — open index.html and it runs.",
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

function framerPropertyControls(item, values) {
  const entries = item.controls
    .map((c) => `  ${c.key}: ${framerControl(c, values[c.key])},`)
    .join("\n");

  return [
    'import { ControlType, addPropertyControls } from "framer"',
    `import ${componentName(item)} from "./${componentName(item)}"`,
    "",
    `addPropertyControls(${componentName(item)}, {`,
    entries,
    "})",
    "",
  ].join("\n");
}

function framerControl(control, value) {
  const defaultValue = serialize(value);
  switch (control.type) {
    case "color":
      return `{ type: ControlType.Color, title: ${JSON.stringify(control.label)}, defaultValue: ${defaultValue} }`;
    case "range":
      return `{ type: ControlType.Number, title: ${JSON.stringify(control.label)}, min: ${control.min}, max: ${control.max}, step: ${control.step}, defaultValue: ${defaultValue} }`;
    case "toggle":
      return `{ type: ControlType.Boolean, title: ${JSON.stringify(control.label)}, enabledTitle: ${JSON.stringify(control.on ?? "On")}, disabledTitle: ${JSON.stringify(control.off ?? "Off")}, defaultValue: ${defaultValue} }`;
    case "select":
      return `{ type: ControlType.Enum, title: ${JSON.stringify(control.label)}, options: ${JSON.stringify(control.options.map((o) => o.value))}, optionTitles: ${JSON.stringify(control.options.map((o) => o.label))}, defaultValue: ${defaultValue} }`;
    case "text":
    default:
      return `{ type: ControlType.String, title: ${JSON.stringify(control.label)}, defaultValue: ${defaultValue} }`;
  }
}

function vanillaHtml(item, css) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${item.name}</title>`,
    css ? `    <link rel="stylesheet" href="./${css.name}" />` : "",
    "  </head>",
    "  <body>",
    `    <div id="${item.id}"></div>`,
    `    <script type="module">`,
    `      import mount from "./${item.sources.vanilla.name}";`,
    `      mount(document.getElementById("${item.id}"));`,
    "    </script>",
    "  </body>",
    "</html>",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function componentName(item) {
  return item.sources.jsx.name.replace(/\.\w+$/, "");
}

/** All file-based flavours, in the order the modal lists them. */
export function buildExports(item, values, variantName) {
  return {
    cli: generateCli(item, variantName),
    code: generateCode(item, values),
    framer: generateFramer(item, values),
    vanilla: generateVanilla(item, values),
    prompt: generatePrompt(item, values),
  };
}
