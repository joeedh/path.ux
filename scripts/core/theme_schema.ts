/**
 * Theme schema tokens.
 *
 * Elements declare the theme keys they consume in `static define().theme` as a
 * map from key to one of the `t.*` tokens below (nested objects describe
 * sub-records such as `disabled`/`highlight`). The tokens are tiny runtime
 * objects carrying a phantom TS type, so:
 *
 *   - the `gen:themes` build step can read them (via `.kind`) to collate
 *     per-element key catalogs and cross-check them against `theme.ts`, and
 *   - `typeof define().theme` recovers the declared TS types (see `TokenType`).
 *
 * `t.color` and `t.string` both map to `string`; the distinct `.kind` lets the
 * generator validate intent and document call sites. Declare the *returned*
 * type — e.g. a key stored as "12px" is read back as a number, so use
 * `t.number` (see `getDefault`'s px-coercion in ui_base.ts).
 */
import type { CSSFont } from "./cssfont";
import type { ThemeScrollBars } from "./ui_theme";

/** A schema entry carrying a phantom TS type `T`. `__type` is never read at runtime. */
export interface TypeToken<T> {
  readonly kind: string;
  readonly __type?: T;
}

function token<T>(kind: string): TypeToken<T> {
  return { kind };
}

export const t = {
  string    : token<string>("string"),
  number    : token<number>("number"),
  bool      : token<boolean>("bool"),
  /** a CSS color string; same TS type as `string`, distinct intent */
  color     : token<string>("color"),
  font      : token<CSSFont>("font"),
  scrollbars: token<ThemeScrollBars>("scrollbars"),
} as const;

/**
 * A theme-key schema: each key maps to a leaf token or a nested sub-record
 * schema (e.g. `button.disabled`).
 */
export interface ThemeSchema {
  [key: string]: TypeToken<unknown> | ThemeSchema;
}

/** Recover the declared TS type from a token or nested schema. */
export type TokenType<X> =
  X extends TypeToken<infer T>
    ? T
    : X extends ThemeSchema
      ? { [K in keyof X]: TokenType<X[K]> }
      : never;

/**
 * Catalog seam: maps a widget class name to its resolved (own + inherited +
 * base) theme-key → value-type record. Empty here so the library typechecks
 * standalone; `gen:themes` emits `generated/themes.ts` which augments this
 * interface. Include that file (tsconfig.themes.json) to make
 * {@link UIBase.getDefault}'s typed overload strict.
 */
export interface ThemeKeyRegistry {}

/** Resolved theme keys for class `S`, or `{}` if `S` isn't in the catalog. */
export type ThemeKeysFor<S extends string> = S extends keyof ThemeKeyRegistry
  ? ThemeKeyRegistry[S]
  : {};
