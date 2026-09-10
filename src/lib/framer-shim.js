/**
 * Stand-in for Framer's own `framer` module.
 *
 * The showcased components are authored as Framer code components, so they
 * import `addPropertyControls`, `ControlType` and `RenderTarget` from "framer".
 * Outside Framer that module does not exist. Vite aliases it here so the same
 * source renders live on this site AND stays a valid paste-into-Framer file —
 * the export modal hands out the original text, untouched.
 */

/** Framer reads these to build its properties panel. Here they are inert. */
export function addPropertyControls() {}

/** Mirrors Framer's ControlType enum. Values only need to be distinct. */
export const ControlType = Object.freeze({
  Array: "array",
  Boolean: "boolean",
  Color: "color",
  ComponentInstance: "componentinstance",
  Date: "date",
  Enum: "enum",
  EventHandler: "eventhandler",
  File: "file",
  Font: "font",
  Image: "image",
  Link: "link",
  Number: "number",
  Object: "object",
  Padding: "padding",
  PageScope: "pagescope",
  ResponsiveImage: "responsiveimage",
  RichText: "richtext",
  BorderRadius: "borderradius",
  Border: "border",
  BoxShadow: "boxshadow",
  Transition: "transition",
  String: "string",
});

/**
 * Components branch on this to stay still on the Framer canvas and animate in
 * preview. This site is always the live case, so it always reports `canvas`
 * as *not* current.
 */
export const RenderTarget = Object.freeze({
  canvas: "CANVAS",
  export: "EXPORT",
  thumbnail: "THUMBNAIL",
  preview: "PREVIEW",
  current: () => "PREVIEW",
  hasRestrictions: () => false,
});

/**
 * Framer's hook form of the same switch, used by components that need to know
 * whether they are being rendered to a still image. This site always renders
 * live, so it is always false.
 */
export function useIsStaticRenderer() {
  return false;
}

export const Frame = null;
export const Scroll = null;
