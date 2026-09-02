import { PackFlags, iconSheetFromPackFlag } from "../ui_base";
import type { IContextBase } from "../context_base";
import { Menu } from "../../menu/menu";
import { createMenu } from "../../menu/menu_ops";
import type { DropBox } from "../../menu/dropbox";
import type { MenuTemplate } from "../../menu/menu_types";
import { InheritFlag, ToolOp } from "../../path-controller/toolsys/toolsys";
import { PropFlags } from "../../path-controller/toolsys";
import { ToolOpAny } from "../../path-controller/controller/controller_abstract";
import type { Button, IconButton } from "../../widgets/ui_widgets";
import { UIBase } from "../ui_base";
import type { Container } from "../ui";

export function dynamicMenuImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  title: string,
  list: MenuTemplate,
  packflag = 0
) {
  //actually, .menu works for now
  return self.menu(title, list, packflag);
}

/**example usage:

 .menu([
 "some_tool_path.tool()|CustomLabel",
 ui_widgets.Menu.SEP,
 "some_tool_path.another_tool()",
 "some_tool_path.another_tool()|CustomLabel::Custom Hotkey String",
 ["Name", () => {console.log("do something")}]
 ])

 **/
export function menuImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  title: string,
  list: MenuTemplate,
  packflag = 0
) {
  const dbox = UIBase.createElement("dropbox-x") as DropBox<CTX>;

  dbox._name = title;
  dbox.setAttribute("simple", "true");
  dbox.setAttribute("name", title);

  if (list instanceof Menu) {
    dbox._build_menu = async function (this: DropBox<CTX>) {
      if (this._menu?.parentNode !== undefined) {
        this._menu.remove();
      }

      this._menu = createMenu(this.ctx, title, list);
      return;
    };
  } else if (list) {
    dbox.template = list;
  }

  self._container_inherit(dbox, packflag);

  self._add(dbox);
  return dbox;
}

export function toolPanelImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  path_or_cls: string | typeof ToolOp,
  args: {
    label?: string;
    packflag?: number;
    createCb?: (cls: typeof ToolOp) => ToolOpAny;
    /** @deprecated */
    create_cb?: (cls: typeof ToolOp) => ToolOpAny;
    container?: Container<CTX>;
    defaultsPath?: string;
  } = {}
) {
  let cls: any;

  if (typeof path_or_cls === "string") {
    cls = self.ctx.api.parseToolPath(path_or_cls);
  } else {
    cls = path_or_cls;
  }

  const tdef = cls._getFinalToolDef();
  const packflag = (args.packflag as number) ?? 0;
  const label = args.label ?? tdef.uiname ?? tdef.toolpath!;
  const createCb = (args.createCb ?? args.create_cb) as Function | undefined;
  const container = (args.container ?? self.panel(label)) as Container<CTX>;
  let defaultsPath = (args.defaultsPath as string) ?? "toolDefaults";

  if (defaultsPath.length > 0 && !defaultsPath.endsWith(".")) {
    defaultsPath += ".";
  }

  const path = defaultsPath + tdef.toolpath;

  container.useIcons(false);

  const inputs = (tdef.inputs instanceof InheritFlag ? tdef.inputs.slots : tdef.inputs) ?? {};
  for (const k in inputs) {
    const prop = inputs[k];

    if (prop.flag & PropFlags.PRIVATE) {
      continue;
    }

    const apiname = prop.apiname ?? k;
    const path2 = path + "." + apiname;

    container.prop(path2);
  }

  container.tool(path_or_cls, packflag, createCb, label);
  return container;
}

export function toolImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF, string>,
  path_or_cls: string | typeof ToolOp,
  packflag_or_args:
    | number
    | { packflag?: number; createCb?: (cls: typeof ToolOp) => ToolOpAny; label?: string } = 0,
  createCb?: Function,
  label?: string
) {
  let cls: typeof ToolOp | undefined;
  let packflag: number;

  if (typeof packflag_or_args === "object") {
    const args = packflag_or_args;

    packflag = args.packflag ?? 0;
    createCb = args.createCb;
    label = args.label;
  } else {
    packflag = packflag_or_args ?? 0;
  }

  if (typeof path_or_cls == "string") {
    if (path_or_cls.search(/\|/) >= 0) {
      const parts = path_or_cls.split("|");

      if (label === undefined && parts.length > 1) {
        label = parts[1].trim();
      }

      path_or_cls = parts[0].trim();
    }

    if (self.ctx === undefined) {
      console.warn("self.ctx was undefined in tool()");
      return;
    }

    cls = self.ctx.api.parseToolPath(path_or_cls);

    if (cls === undefined) {
      console.warn('Unknown tool for toolpath "' + path_or_cls + '"');
      return;
    }
  } else {
    cls = path_or_cls;
  }

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  if (createCb === undefined) {
    const toolpath =
      typeof path_or_cls === "string" ? path_or_cls : path_or_cls.tooldef().toolpath!;
    createCb = (cls: typeof ToolOp) => {
      return self.ctx.api.createTool(self.ctx, toolpath);
    };
  }

  const cb = () => {
    const toolob = createCb!(cls);
    self.ctx.api.execTool(self.ctx, toolob);
  };

  const def =
    typeof path_or_cls === "string" ? self.ctx.api.getToolDef(path_or_cls) : cls.tooldef();
  let tooltip = def.description ?? def.uiname ?? "";

  //is there a hotkey hardcoded in the class?
  if (def.hotkey !== undefined) {
    tooltip += "\n\t" + def.hotkey;
  } else {
    //if not, use getToolPathHotkey api
    let path = path_or_cls;

    if (typeof path != "string") {
      path = def.toolpath!;
    }

    const hotkey = self.ctx.api.getToolPathHotkey(self.ctx, path);
    if (hotkey) {
      tooltip += "\n\tHotkey: " + hotkey;
    }
  }

  let ret: IconButton<CTX> | Button<CTX>;

  if (def.icon !== undefined && packflag & PackFlags.USE_ICONS) {
    label = label === undefined ? tooltip : label;

    const check = self.iconbutton(def.icon ?? -1, label, cb);

    check.iconsheet = iconSheetFromPackFlag(packflag);
    check.packflag |= packflag;
    check.description = tooltip;
    ret = check;
  } else {
    label = label === undefined ? def.uiname ?? def.toolpath! : label;

    ret = self.button(label, cb);
    ret.description = tooltip;
    ret.packflag |= packflag;
  }

  return ret;
}
