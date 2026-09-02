import {
  StringPropertyBase,
  EnumProperty,
  FlagProperty,
  IntProperty,
  FloatProperty,
  ToolProperty,
  BoolProperty,
  Vec4Property,
  Vec3Property,
} from "../path-controller/toolsys/toolprop";
import type { DataAPI } from "../path-controller/controller/controller";
import { HashDigest } from "../util/util";
import type { IContextBase } from "./context_base";
import type { ThemeVar } from "./ui_theme_utils";

export interface TypedThemeObjectConstructor<T> {
  _cachedDataAPI?: DataAPI<IContextBase>;

  new (args?: { [k: string]: unknown }, validate?: boolean): T;
  Props: Record<string, ToolProperty<unknown>>;
}

export type ThemeTypeArgsWithVars<T extends {}> = {
  [k in keyof T]: T[k] | ThemeVar<string, NonNullable<T[k]>>;
};

export abstract class TypedThemeObject<
  Child,
  Props extends { [k: string]: ToolProperty<unknown> },
> {
  // Note: Props is *not* used to create default values!
  // values of the toolproperties are however used for
  // validating arguments passed to constructors
  declare static Props: Record<string, ToolProperty<unknown>>;

  abstract copyTo(b: Child): void;
  abstract copy(): Child;
  abstract calcHashUpdate(digest?: HashDigest): number;

  declare ["constructor"]: TypedThemeObjectConstructor<Child>;

  /* Child classes MUST add a withVars static method!
    E.g.: 
    
    static withVars(args?: ThemeTypeArgsWithVars<SomeArgs>): ThemeRecord { 
      return new this(args as unknown as SomeArgs, false); 
    }
   */

  /**
   * Does NOT load values of args into properties, derived classes do that.
   * Also doesn't enforce optionality, since the meaning of props has to do
   * with the properties in the class itself, not the arguments.
   */
  constructor(args?: Partial<Record<keyof Props, unknown>>, validate?: boolean) {
    if (args && validate) {
      const props = this.getProps();

      const check = (ok: boolean, key: string, val: any) => {
        if (!ok) {
          throw new Error(`invalid value for "${key}": ${val}`);
        }
      };

      for (const key in props) {
        const prop = props[key];
        const value = args[key as keyof Props];
        if (value === undefined) {
          continue;
        }

        if (prop instanceof StringPropertyBase) {
          check(typeof value === "string", key, value);
        } else if (prop instanceof EnumProperty) {
          check(typeof value === typeof prop.getValue(), key, value);
        } else if (prop instanceof FlagProperty) {
          check(typeof value === "boolean", key, value);
        } else if (prop instanceof IntProperty) {
          check(typeof value === "number" && Number.isInteger(value), key, value);
        } else if (prop instanceof FloatProperty) {
          check(typeof value === "number" && !isNaN(value) && isFinite(value), key, value);
        } else if (prop instanceof BoolProperty) {
          check(typeof value === "boolean", key, value);
        } else if (prop instanceof Vec4Property || prop instanceof Vec3Property) {
          // we don't actually store Vec4 values here
          check(typeof value === "string", key, value);
        } else {
          console.warn(
            `Warning: unsupported property type for "${key} in ${this.constructor.name}"`
          );
        }
      }
    }
  }

  getProps() {
    return (this.constructor as typeof TypedThemeObject).Props as Props;
  }
  getLiteral() {
    const ret: Record<keyof Props, unknown> = {} as Record<keyof Props, unknown>;
    for (const key of Object.keys(this.getProps())) {
      ret[key as keyof Props] = (this as any)[key].getValue();
    }
    return ret;
  }
}
