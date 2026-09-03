import { Check, IconCheck } from "../../widgets/ui_widgets";
import { UIBase, iconSheetFromPackFlag, PackFlags } from "../ui_base";
import type { IContextBase } from "../context_base";
import type { KnownDataPath } from "../datapath_registry";
import { FlagProperty, EnumProperty, ToolProperty } from "../../path-controller/toolsys";
import { EnumDef, IconMap } from "../../path-controller/toolsys/toolprop";
import type { DropBox } from "../../menu/dropbox";
import type { Container } from "../ui";

/* Style coercion: CSSStyleDeclaration doesn't allow arbitrary string indexing. */
function styl(el: { style: CSSStyleDeclaration }) {
  return el.style;
}

export function iconcheckImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  inpath: string | undefined,
  icon: number,
  description?: string,
  mass_set_path?: string
) {
  const ret = UIBase.createElement("iconcheck-x") as IconCheck<CTX>;
  ret.icon = icon;
  ret.description = name ?? "";

  if (inpath) {
    ret.setAttribute("datapath", inpath);
  }

  if (mass_set_path) {
    ret.setAttribute("mass_set_path", mass_set_path);
  }

  self.add(ret);

  return ret;
}

export function checkImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  inpath: KnownDataPath | undefined,
  name?: string,
  packflag = 0,
  mass_set_path?: string
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const path = inpath !== undefined ? self._joinPrefix(inpath) : undefined;

  if (name === undefined && path) {
    const prop = self.getPathMeta(self.ctx, path);
    if (prop) {
      name = prop.getUIName();
    }
  }
  name = name ?? "(error)";

  //let prop = self.ctx.getProp(path);
  let ret: Check<CTX> | IconCheck<CTX>;
  if (packflag & PackFlags.USE_ICONS) {
    ret = UIBase.createElement("iconcheck-x") as IconCheck<CTX>;
    ret.iconsheet = iconSheetFromPackFlag(packflag);
  } else {
    ret = UIBase.createElement("check-x") as Check<CTX>;
    ret.label = name;
  }

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

  ret.packflag |= packflag;
  ret.noMarginsOrPadding();

  if (inpath) {
    ret.setAttribute("datapath", path!);
  }

  if (mass_set_path) {
    ret.setAttribute("mass_set_path", mass_set_path);
  }

  self._add(ret);
  return ret;
}

/*
 *
 * new (optional) form: checkenum(inpath, args)
 * */
export function checkenumImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  inpath: KnownDataPath | undefined,
  name?:
    | string
    | {
        name?: string;
        packflag?: number;
        enummap?: unknown;
        defaultval?: unknown;
        callback?: Function;
        iconmap?: unknown;
        mass_set_path?: string;
      },
  packflag?: number,
  enummap?: unknown,
  defaultval?: unknown,
  callback?: Function,
  iconmap?: unknown,
  mass_set_path?: string
): UIBase<CTX> {
  if (typeof name === "object" && name !== null) {
    const args = name;

    name = args.name as string | undefined;
    packflag = args.packflag as number | undefined;
    enummap = args.enummap;
    defaultval = args.defaultval;
    callback = args.callback as Function | undefined;
    iconmap = args.iconmap;
    mass_set_path = args.mass_set_path as string | undefined;
  }

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

  packflag = packflag === undefined ? 0 : packflag;
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const path = self._joinPrefix(inpath);

  let prop: EnumProperty | FlagProperty | undefined;
  let frame: Container<CTX> | undefined;

  if (path !== undefined) {
    const resolved = self.ctx.api.resolvePath(self.ctx, path, true);
    prop = resolved !== undefined ? (resolved.prop as EnumProperty | FlagProperty) : undefined;
  }

  if (path !== undefined) {
    if (prop === undefined) {
      console.warn("Bad path in checkenum", path);
      return self.label("(error)");
    }

    frame = self.strip();
    frame.oneAxisPadding();

    const makeIconCheck = (key: string) => {
      const check = frame!.check(inpath + "[" + key + "]", "", packflag) as IconCheck<CTX>;

      check.packflag |= PackFlags.HIDE_CHECK_MARKS;

      check.icon = prop.iconmap[key];
      check.drawCheck = false;

      check.style["padding"] = "0px";
      check.style["margin"] = "0px";

      styl(check.dom)["padding"] = "0px";
      styl(check.dom)["margin"] = "0px";

      return check;
    };
    const makeCheck = (key: string) => {
      return frame!.check(`${inpath}[${key}]`, prop.ui_value_names[key]);
    };

    const useIcons = packflag & PackFlags.USE_ICONS;
    if (!useIcons) {
      if (name === undefined) {
        name = prop.uiname ?? ToolProperty.makeUIName(prop.apiname ?? inpath ?? "error");
      }
      frame!.label(name!).font = "TitleText";
    }

    const checks: Record<string, IconCheck<CTX> | Check<CTX>> = {};

    let ignorecb = false;
    function makecb(key: string) {
      return () => {
        if (ignorecb) return;

        ignorecb = true;
        for (const k in checks) {
          if (k !== key) {
            checks[k].checked = false;
          }
        }
        ignorecb = false;

        if (callback) {
          callback(key);
        }
      };
    }

    for (const key in prop.values) {
      const check = useIcons ? makeIconCheck(key) : makeCheck(key);
      checks[key] = check;

      if (mass_set_path) {
        check.setAttribute("mass_set_path", mass_set_path);
      }

      check.description = prop.descriptions[prop.keys[parseInt("" + key)]];
      if (!check.description) {
        check.description = "" + prop.ui_value_names[key];
      }
      check.on_change = makecb(key);
    }
  }

  return frame!;
}

export function checkenumPanelImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  inpath: string,
  name?: string,
  packflag = 0,
  callback?: Function,
  mass_set_path?: string,
  prop?: FlagProperty | EnumProperty
): Container<CTX> | undefined {
  packflag = packflag === undefined ? 0 : packflag;
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const path = self._joinPrefix(inpath);
  let frame: Container<CTX> | undefined;

  if (path !== undefined && prop === undefined) {
    const resolved = self.ctx.api.resolvePath(self.ctx, path, true);
    prop = resolved !== undefined ? (resolved.prop as FlagProperty | EnumProperty) : undefined;
  }

  if (!name && prop) {
    name = prop.getUIName();
  }

  if (path !== undefined) {
    if (prop === undefined) {
      console.warn("Bad path in checkenum", path);
      return undefined;
    }

    frame = self.panel(name!, name, packflag);
    frame.oneAxisPadding();
    frame.setCSSAfter(() => (frame!.background = self.getDefault("BoxSub2BG") as string));

    if (packflag & PackFlags.USE_ICONS) {
      for (const key in prop.values) {
        const check = frame.check(
          inpath + " == " + prop.values[key],
          "",
          packflag
        ) as IconCheck<CTX>;

        check.icon = prop.iconmap[key];
        check.drawCheck = false;

        check.style["padding"] = "0px";
        check.style["margin"] = "0px";

        styl(check.dom)["padding"] = "0px";
        styl(check.dom)["margin"] = "0px";

        check.description = prop.descriptions[key];
      }
    } else {
      if (name === undefined) {
        name = prop.getUIName();
      }

      frame.label(name!).font = "TitleText";

      const checks: Record<string, IconCheck<CTX> | Check<CTX>> = {};

      let ignorecb = false;

      function makecb(key: string) {
        return () => {
          if (ignorecb) return;

          ignorecb = true;
          for (const k in checks) {
            if (k !== key) {
              checks[k].checked = false;
            }
          }
          ignorecb = false;

          if (callback) {
            callback(key);
          }
        };
      }

      for (const key in prop.values) {
        const check = frame.check(inpath + " = " + prop.values[key], prop.ui_value_names[key]);
        checks[key] = check;

        if (mass_set_path) {
          check.setAttribute("mass_set_path", mass_set_path);
        }

        check.description = prop.descriptions[prop.keys[parseInt("" + key)]];
        if (!check.description) {
          check.description = "" + prop.ui_value_names[key];
        }
        check.on_change = makecb(key);
      }
    }
  }

  return frame;
}

/**
  enummap is an object that maps
  ui names to keys, e.g.:

  ui.listenum("color", "Color", {
    RED   : 0,
    GREEN : 1,
    BLUE  : 2
  });

  path can be undefined, in which case, use callback,
  which gets the current enum as an argument

  defaultval cannot be undefined
*/
export function listenumImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  inpath: KnownDataPath | undefined,
  name?:
    | string
    | {
        name?: string;
        enumDef?:
          | EnumProperty
          | FlagProperty
          | EnumDef
          | (() => EnumProperty | EnumDef | Promise<EnumProperty | EnumDef>);
        defaultval?: string | number;
        callback?: DropBox["on_select"];
        iconmap?: Record<string, number>;
        packflag?: number;
        mass_set_path?: string;
      },
  enumDef?:
    | EnumProperty
    | FlagProperty
    | EnumDef
    | (() => EnumProperty | EnumDef | Promise<EnumProperty | EnumDef>),
  defaultval?: number | string,
  callback?: DropBox["on_select"],
  iconmap?: IconMap,
  packflag = 0
): DropBox<CTX> {
  let mass_set_path: string | undefined;

  if (name && typeof name === "object") {
    const args = name;

    name = args.name;
    enumDef = args.enumDef;
    defaultval = args.defaultval;
    callback = args.callback;
    iconmap = args.iconmap;
    packflag = args.packflag ?? 0;
    mass_set_path = args.mass_set_path;
  }

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

  let path: string | undefined;
  let label = name as string | undefined;

  if (inpath !== undefined) {
    path = self._joinPrefix(inpath);
  }

  const ret = UIBase.createElement("dropbox-x") as DropBox<CTX>;

  if (enumDef !== undefined) {
    if (typeof enumDef === "function") {
      const def = enumDef();
      if (!(def instanceof EnumProperty) && !(def instanceof Promise)) {
        enumDef = () => new EnumProperty(undefined, def);
      }

      ret.uiProp = enumDef;
      label ??= (enumDef() as EnumProperty).getUIName();
    } else if (enumDef instanceof EnumProperty) {
      ret.uiProp = enumDef;
      label ??= enumDef.getUIName();
    } else {
      ret.uiProp = new EnumProperty(defaultval, enumDef as EnumDef, path, name as string);
    }

    if (iconmap && typeof ret.uiProp === "object") {
      ret.uiProp!.addIcons(iconmap);
    }
  } else {
    const res = self.ctx.api.resolvePath(self.ctx, path!, true);

    if (res !== undefined) {
      ret.prop = res.prop as EnumProperty;

      name ??= res.prop!.getUIName();
      label ??= name;
    }
  }

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);
  if (path !== undefined) {
    ret.setAttribute("datapath", path);
  }
  if (mass_set_path !== undefined) {
    ret.setAttribute("mass_set_path", mass_set_path);
  }

  // Left unset when there is no name, rather than written as the string "undefined", which is
  // what the button would then draw until the value's own label arrives.
  if (name !== undefined) {
    ret.setAttribute("name", name as string);
  }

  // Tested against undefined rather than for truth: "" and 0 are ordinary enum values, and a
  // dropbox left unset draws the field's own label where its value should be.
  if (defaultval !== undefined) {
    ret.setValue(defaultval);
  }

  ret.on_select = callback;
  ret.packflag |= packflag;

  return ret;
}
