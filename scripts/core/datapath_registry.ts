/**
 * Compile-time registry of valid data-path strings.
 *
 * `container.prop(...)` and related widget methods accept a {@link KnownDataPath}.
 * Out of the box that is just `string`, so there is no behavior change. To get
 * typo-checking and autocomplete in your app, augment {@link DataPathRegistry}
 * via declaration merging with your valid paths as keys — `npm run gen:paths`
 * emits such a file for you from your `defineAPI()`:
 *
 * ```ts
 * declare module "path.ux" {
 *   interface DataPathRegistry {
 *     "workspace.brush.size": true;
 *     // ...
 *   }
 * }
 * ```
 *
 * Once augmented, exact known paths are checked/autocompleted while arbitrary
 * strings (relative/prefixed paths resolved at runtime) are still accepted.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataPathRegistry {}

export type KnownDataPath = [keyof DataPathRegistry] extends [never]
  ? string
  : (keyof DataPathRegistry & string) | (string & {});
