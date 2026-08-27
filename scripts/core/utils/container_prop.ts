import { Check } from "../../widgets/ui_widgets";
import { UIBase, PackFlags } from "../ui_base";
import type { IContextBase } from "../context_base";
import type { KnownDataPath } from "../datapath_registry";
import {
  ToolProperty,
  PropFlags,
  PropSubTypes,
  ToolPropertyTypes,
} from "../../path-controller/toolsys";
import { PropTypes } from "../../path-controller/toolsys/toolprop";
import { DataPathError } from "../../path-controller/controller/controller_base";
import type { NumSliderTypes } from "../../widgets/ui_numsliders";
import cconst from "../../config/const";
import type { Container, SliderArgs } from "../ui";

export function propImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath: KnownDataPath,
  packflag = 0,
  mass_set_path?: string
): UIBase<CTX> {
  if (!self.ctx) {
    console.warn(self.id + ".ctx was undefined");
    let p = self.parentWidget as UIBase<CTX> | undefined;

    while (p) {
      if (p.ctx) {
        console.warn("Fetched self.ctx from parent");
        self.ctx = p.ctx;
        break;
      }

      p = p.parentWidget as UIBase<CTX> | undefined;
    }

    if (!self.ctx) {
      throw new Error("ui.Container.prototype.prop(): self.ctx was undefined");
    }
  }

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const rdef = self.ctx.api.resolvePath(self.ctx, self._joinPrefix(inpath)!, true);

  if (rdef?.prop === undefined) {
    const fullpath = self._joinPrefix(inpath);
    const detail = self.ctx.api.lastResolveError ? ": " + self.ctx.api.lastResolveError : "";
    console.warn("Unknown property at path", fullpath, detail);
    throw new DataPathError(`Unknown property at path "${fullpath}"${detail}`);
  }
  const prop = rdef.prop as ToolPropertyTypes;
  const useDataPathUndo = self.useDataPathUndo && !(prop.flag & PropFlags.NO_UNDO);

  const uiName = prop.uiname ?? ToolProperty.makeUIName(prop.apiname ?? inpath);

  if (prop.type === PropTypes.REPORT) {
    return self.pathlabel(inpath, uiName);
  } else if (prop.type === PropTypes.STRING) {
    let ret: UIBase<CTX>;

    if (prop.flag & PropFlags.READ_ONLY) {
      ret = self.pathlabel(inpath, uiName);
    } else if (prop.multiLine) {
      ret = self.textarea(inpath, rdef.value as string, packflag, mass_set_path);
      ret.useDataPathUndo = useDataPathUndo;
    } else {
      const strip = self.strip();

      strip.label(uiName);

      ret = strip.textbox(inpath) as UIBase<CTX>;
      ret.useDataPathUndo = useDataPathUndo;

      mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }
    }

    ret.packflag |= packflag;
    return ret;
  } else if (prop.type === PropTypes.CURVE) {
    const ret = self.curve1d(inpath, packflag, mass_set_path);
    ret.useDataPathUndo = useDataPathUndo;
    return ret;
  } else if (prop.type === PropTypes.INT || prop.type === PropTypes.FLOAT) {
    let ret: UIBase<CTX>;
    if (packflag & PackFlags.SIMPLE_NUMSLIDERS) {
      ret = self.simpleslider(inpath, { packflag: packflag });
    } else {
      ret = self.slider(inpath, { packflag: packflag });
    }

    ret.useDataPathUndo = useDataPathUndo;
    ret.packflag |= packflag;

    mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

    if (mass_set_path) {
      ret.setAttribute("mass_set_path", mass_set_path);
    }

    return ret;
  } else if (prop.type === PropTypes.BOOL) {
    const ret = self.check(inpath, uiName, packflag, mass_set_path);
    ret.useDataPathUndo = useDataPathUndo;
    return ret;
  } else if (prop.type === PropTypes.ENUM) {
    if (rdef.subkey !== undefined) {
      const subkey = rdef.subkey as string;
      let name = prop.ui_value_names[rdef.subkey as string];

      if (name === undefined) {
        name = ToolProperty.makeUIName("" + rdef.subkey);
      }

      const check = self.check(inpath, name, packflag, mass_set_path);
      const tooltip = prop.descriptions[subkey];

      check.useDataPathUndo = useDataPathUndo;

      check.description = tooltip ?? prop.ui_value_names[subkey] ?? ToolProperty.makeUIName(subkey);
      if (check instanceof Check) {
        check.icon = prop.iconmap[rdef.subkey as string];
      }
      return check;
    }

    if (
      !(packflag & PackFlags.USE_ICONS) &&
      !(prop.flag & (PropFlags.USE_ICONS | PropFlags.FORCE_ENUM_CHECKBOXES))
    ) {
      return self
        .listenum(inpath, { name: "listenum", packflag, mass_set_path })
        .setUndo(useDataPathUndo);
    } else {
      if (prop.flag & PropFlags.USE_ICONS) {
        packflag |= PackFlags.USE_ICONS;
      } else if (prop.flag & PropFlags.FORCE_ENUM_CHECKBOXES) {
        packflag &= ~PackFlags.USE_ICONS;
      }

      if (packflag & PackFlags.FORCE_PROP_LABELS) {
        const strip = self.strip();
        strip.label(uiName);

        return strip.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
      } else {
        return self.checkenum(inpath, undefined, packflag).setUndo(useDataPathUndo);
      }
    }
  } else if (prop.type & (PropTypes.VEC2 | PropTypes.VEC3 | PropTypes.VEC4)) {
    if (rdef.subkey !== undefined) {
      let ret: UIBase<CTX>;

      if (packflag & PackFlags.SIMPLE_NUMSLIDERS)
        ret = self.simpleslider(inpath, { packflag: packflag });
      else ret = self.slider(inpath, { packflag: packflag });

      ret.packflag |= packflag;

      mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);
      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      return ret.setUndo(useDataPathUndo);
    } else if ((prop.subtype as number) === PropSubTypes.COLOR) {
      return self.colorbutton(inpath, packflag, mass_set_path).setUndo(useDataPathUndo);
      //return self.colorPicker(inpath, packflag, mass_set_path);
    } else {
      const ret = UIBase.createElement("vector-panel-x") as UIBase<CTX> & {
        inherit_packflag: number;
      };

      mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

      ret.packflag |= packflag | (self.inherit_packflag & ~PackFlags.NO_UPDATE);
      ret.inherit_packflag |= packflag | (self.inherit_packflag & ~PackFlags.NO_UPDATE);

      if (inpath) {
        ret.setAttribute("datapath", self._joinPrefix(inpath)!);
      }

      if (mass_set_path) {
        ret.setAttribute("mass_set_path", mass_set_path);
      }

      self.add(ret as UIBase<CTX>);
      return (ret as UIBase<CTX>).setUndo(useDataPathUndo);
    }
  } else if (prop.type === PropTypes.FLAG) {
    if (rdef.subkey !== undefined) {
      const tooltip = prop.descriptions[rdef.subkey as string];
      let name = prop.ui_value_names[rdef.subkey as string];

      if (typeof rdef.subkey === "number") {
        name = prop.keys[rdef.subkey] as string;
        if (name && name in prop.ui_value_names) {
          name = prop.ui_value_names[name];
        } else {
          name = ToolProperty.makeUIName(name ? name : "(error)");
        }
      }

      if (name === undefined) {
        name = "(error)";
      }

      const ret = self.check(inpath, name, packflag, mass_set_path);
      ret.icon = prop.iconmap[rdef.subkey as string];

      if (tooltip) {
        ret.description = tooltip;
      }

      return ret.setUndo(useDataPathUndo);
    } else {
      let con: Container<CTX> = self;

      if (packflag & PackFlags.FORCE_PROP_LABELS) {
        con = self.strip();
        con.label(uiName);
      }

      if (packflag & PackFlags.PUT_FLAG_CHECKS_IN_COLUMNS) {
        let i = 0;
        const row = con.row();
        const col1 = row.col();
        const col2 = row.col();

        for (const k in prop.values) {
          let name = prop.ui_value_names[k];
          const tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = ToolProperty.makeUIName(k);
          }

          const con2 = i & 1 ? col2 : col1;
          const check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);

          if (tooltip) {
            check.description = tooltip;
          }

          check.setUndo(useDataPathUndo);

          i++;
        }

        return row;
      }

      if (packflag & PackFlags.WRAP_CHECKBOXES) {
        let isrow = self.style["flexDirection"] === "row";
        isrow = isrow || self.style["flexDirection"] === "row-reverse";

        let wrapChars: number;

        let strip2: Container<CTX>;
        let con2: Container<CTX>;

        if (isrow) {
          wrapChars = self.getDefault("checkRowWrapLimit", undefined, 24) as number;
          strip2 = self.col().strip();
          strip2.packflag |= packflag;
          strip2.inherit_packflag |= packflag;

          con2 = strip2.row();
        } else {
          wrapChars = self.getDefault("checkColWrapLimit", undefined, 5) as number;
          strip2 = self.row().strip();
          strip2.packflag |= packflag;
          strip2.inherit_packflag |= packflag;

          con2 = strip2.col();
        }

        let x = 0;
        let y = 0;

        for (const k in prop.values) {
          let name = prop.ui_value_names[k];
          const tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = ToolProperty.makeUIName(k);
          }

          const check = con2.check(`${inpath}[${k}]`, name, packflag, mass_set_path);
          check.setUndo(useDataPathUndo);

          if (tooltip) {
            check.description = tooltip;
          }

          x += name.length;
          y += 1;

          if (isrow && x > wrapChars) {
            x = 0;
            con2 = strip2.row();
          } else if (!isrow && y > wrapChars) {
            y = 0;
            con2 = strip2.col();
          }
        }

        return strip2;
      }

      if (con === self) {
        con = self.strip();
      }

      const rebuild = () => {
        con.clear();

        for (const k in prop.values) {
          let name = prop.ui_value_names[k];
          const tooltip = prop.descriptions[k];

          if (name === undefined) {
            name = ToolProperty.makeUIName(k);
          }

          const check = con.check(`${inpath}[${k}]`, name, packflag, mass_set_path);
          check.useDataPathUndo = useDataPathUndo;

          if (tooltip) {
            check.description = tooltip;
          }

          check.setUndo(useDataPathUndo);
        }
      };

      rebuild();
      let last_hash = prop.calcHash();

      con.updateAfter(() => {
        const hash = prop.calcHash();

        if (last_hash !== hash) {
          last_hash = hash;
          rebuild();
        }
      });

      return con;
    }
  }

  throw new DataPathError(`Unsupported property: ${inpath}`);
}

export function simplesliderImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  datapath: KnownDataPath | undefined,
  name?: string | SliderArgs,
  defaultval?: number,
  min?: number,
  max?: number,
  step?: number,
  isInt?: boolean,
  do_redraw?: boolean,
  callback?: Function,
  packflag = 0
) {
  if (typeof name === "object") {
    return self.slider(datapath, {
      ...name,
      packflag: (name.packflag ?? 0) | PackFlags.SIMPLE_NUMSLIDERS,
    });
    //new-style api call
  } else {
    return self.slider(
      datapath,
      name,
      defaultval,
      min,
      max,
      step,
      isInt,
      do_redraw,
      callback,
      packflag | PackFlags.SIMPLE_NUMSLIDERS
    );
  }
}

/**
 *
 * usage: .slider(inpath, {
 *  name : bleh,
 *  defaultval : number,
 *  etc...
 * });
 * */
export function sliderImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  datapath: KnownDataPath | undefined,
  name?: string | SliderArgs,
  defaultval?: number,
  min?: number,
  max?: number,
  step?: number,
  is_int?: boolean,
  do_redraw?: boolean,
  callback?: Function,
  packflag = 0,
  decimalPlaces?: number
) {
  if (typeof name === "object") {
    //new-style api call

    const args = name;
    decimalPlaces = args.decimalPlaces;
    name = args.name;
    defaultval = args.defaultval;
    min = args.min;
    max = args.max;
    step = args.step;
    is_int = args.is_int || args.isInt;
    do_redraw = args.do_redraw;
    callback = args.callback;
    packflag = args.packflag ?? 0;
  }

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;
  let ret: NumSliderTypes<CTX>;

  if (datapath) {
    datapath = self._joinPrefix(datapath)!;

    const rdef = self.ctx.api.resolvePath(self.ctx, datapath, true);
    if (rdef?.prop && rdef.prop.flag & PropFlags.SIMPLE_SLIDER) {
      packflag |= PackFlags.SIMPLE_NUMSLIDERS;
    }
    if (rdef?.prop && rdef.prop.flag & PropFlags.FORCE_ROLLER_SLIDER) {
      packflag |= PackFlags.FORCE_ROLLER_SLIDER;
    }
  }

  let simple: boolean | number = packflag & PackFlags.SIMPLE_NUMSLIDERS || cconst.simpleNumSliders;
  simple = simple && !(packflag & PackFlags.FORCE_ROLLER_SLIDER);

  const extraTextBox = cconst.useNumSliderTextboxes && !(packflag & PackFlags.NO_NUMSLIDER_TEXTBOX);

  if (extraTextBox) {
    if (simple) {
      ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-simple-x");
    } else {
      ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-textbox-x");
    }
  } else {
    if (simple) {
      ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-simple-x");
    } else {
      ret = UIBase.createElement<NumSliderTypes<CTX>>("numslider-x");
    }
  }

  ret.packflag |= packflag;

  if (datapath) {
    ret.setAttribute("datapath", datapath);
  }

  if (name) {
    ret.setAttribute("name", name as string);
  }

  if (min !== undefined) {
    ret.setAttribute("min", "" + min);
  }
  if (max !== undefined) {
    ret.setAttribute("max", "" + max);
  }

  if (defaultval !== undefined) {
    ret.setValue(defaultval);
  }

  if (is_int) {
    ret.setAttribute("integer", "" + is_int);
  }

  if (decimalPlaces !== undefined) {
    ret.decimalPlaces = decimalPlaces;
  }

  if (step) {
    ret.setAttribute("step", "" + step);
  }
  if (callback) {
    ret.on_change = callback as typeof ret.on_change;
  }

  self._add(ret);

  if (self.ctx) {
    ret.setCSS();
    ret.update();
  }

  if (do_redraw) {
    ret._redraw();
  }

  return ret;
}
