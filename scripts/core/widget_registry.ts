/**
 * Compile-time registry of registered custom-widget tag names, mirroring
 * {@link DataPathRegistry}.
 *
 * Out of the box {@link KnownWidgetTag} is the permissive `${string}-x` pattern,
 * so any custom element is accepted in JSX. After `npm run gen:paths` augments
 * {@link WidgetTagRegistry} with the app's registered tags, JSX checks custom
 * widget tag names exactly (typo protection) — regenerate when you add widgets.
 *
 * ```ts
 * declare module "path.ux" {
 *   interface WidgetTagRegistry {
 *     "theme-editor-x": true;
 *   }
 * }
 * ```
 */

export interface WidgetTagRegistry {}

export type KnownWidgetTag = [keyof WidgetTagRegistry] extends [never]
  ? `${string}-x`
  : keyof WidgetTagRegistry & string;
