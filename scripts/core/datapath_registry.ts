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

export interface DataPathRegistry {}

/**
 * Indexed paths (`foo.bar[n].baz`), kept apart from {@link DataPathRegistry}
 * because no caller writes the literal `[n]`. They exist so a container carrying
 * a data-path prefix can offer the tails under that prefix — see
 * {@link PathsUnderPrefix}. `npm run gen:paths` emits this alongside the other
 * registry.
 */
export interface IndexedDataPathRegistry {}

export type KnownDataPath = [keyof DataPathRegistry] extends [never]
  ? string
  : (keyof DataPathRegistry & string) | (string & {});

/** Every registered path, indexed ones included, with no open-string fallback. */
type RegisteredPath = (keyof DataPathRegistry & string) | (keyof IndexedDataPathRegistry & string);

/** Distributes over `Paths`, keeping what follows `Prefix` in each one. */
type TailUnder<Prefix extends string, Paths> = Paths extends `${Prefix}${infer Tail}`
  ? Tail
  : never;

/**
 * Paths a container whose data-path prefix is `Prefix` accepts. Autocompletes
 * the tails of the registered paths starting with that prefix while still
 * accepting any string, so runtime-resolved paths keep type-checking; the
 * `pathux/valid-datapath` ESLint rule reports the ones that do not resolve.
 * With the default empty prefix this is exactly {@link KnownDataPath}.
 */
export type PathsUnderPrefix<Prefix extends string> = [RegisteredPath] extends [never]
  ? string
  : TailUnder<Prefix, RegisteredPath> | (string & {});
