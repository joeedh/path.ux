import type { TextBox } from "../../widgets/ui_textbox";
import { Button, IconButton } from "../../widgets/ui_widgets";
import * as util from "../../path-controller/util/util";
import { UIBase, iconSheetFromPackFlag, PackFlags, Icons } from "../ui_base";
import type { IContextBase } from "../context_base";
import type { KnownDataPath } from "../datapath_registry";
import type { RichViewer, RichEditor } from "../../widgets/ui_richedit";
import type { ColorPicker, ColorPickerButton } from "../../widgets/ui_colorpicker2";
import type { Container, Label } from "../ui";
import type { TextArea } from "../../widgets/ui_textarea";

export function textboxImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath?: KnownDataPath,
  text?: string,
  cb?: typeof self.on_change,
  packflag = 0
) {
  let path: string | undefined;

  if (inpath) {
    path = self._joinPrefix(inpath);
  }

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const ret = UIBase.createElement("textbox-x") as TextBox<CTX>;

  if (path !== undefined) {
    ret.setAttribute("datapath", path);
  }

  ret.ctx = self.ctx;
  ret.parentWidget = self;
  ret._init();
  self._add(ret);

  ret.setCSS();
  ret.update();

  ret.packflag |= packflag;
  ret.on_change = cb ?? null;

  /* `update()` above already subscribed the datapath and delivered its first
   * value, so an unconditional assignment here would overwrite it — with the
   * string "undefined" when no literal was passed. Only an explicit literal
   * wins over the binding. */
  if (text !== undefined) {
    ret.text = "" + text;
  }

  return ret;
}

export function pathlabelImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath?: KnownDataPath,
  label?: string,
  packflag = 0
) {
  let path: string | undefined;

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  if (inpath) {
    path = self._joinPrefix(inpath);
  }

  const ret = UIBase.createElement("label-x") as Label<CTX>;

  if (label === undefined && inpath) {
    const rdef = self.ctx.api.resolvePath(self.ctx, path!);
    if (rdef) {
      label = rdef.prop!.uiname ?? rdef.dpath.apiname;
    } else {
      console.warn(
        `pathlabel: bad path "${path}"` +
          (self.ctx.api.lastResolveError ? ": " + self.ctx.api.lastResolveError : "")
      );
      label = "(error)";
    }
  }

  ret.text = label!;
  ret.packflag = packflag;
  ret.setAttribute("datapath", path!);

  self._add(ret);
  ret.setCSS();

  return ret;
}

export function labelImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  text: string
) {
  const ret = UIBase.createElement("label-x") as Label<CTX>;

  ret.text = text;
  self._add(ret);
  return ret;
}

/**
 * Makes a button that starts the help picker: point at anything to read what it does, which is
 * the only way to reach a tooltip on a device that cannot hover. Tap empty space to leave.
 */
export function helppickerImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>
) {
  const ret = self.iconbutton(
    Icons.HELP,
    "Read what a control does by pointing at it; tap empty space to stop",
    () => {
      self.getScreen()?.hintPickerTool();
    }
  );

  if (util.isMobile()) {
    //ret.iconsheet = 2;
    //XXX look up in mobile theme properly
  }

  if (ret.ctx) {
    ret._init();
    ret.setCSS();
  }

  return ret;
}

export function iconbuttonImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  icon: number,
  description: string,
  cb?: () => void,
  thisvar?: unknown,
  packflag = 0
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const ret = UIBase.createElement("iconbutton-x") as IconButton<CTX>;

  ret.packflag |= packflag;

  ret.setAttribute("icon", "" + icon);
  ret.description = description;
  ret.icon = icon;

  ret.iconsheet = iconSheetFromPackFlag(packflag);

  ret.onclick = cb ?? null;

  self._add(ret);

  return ret;
}

export function buttonImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  label: string,
  cb?: (e?: PointerEvent) => void,
  thisvar?: unknown,
  id?: string | number,
  packflag = 0
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  const ret = UIBase.createElement("button-x") as Button<CTX>;

  ret.packflag |= packflag;

  ret.setAttribute("name", label);
  ret.setAttribute("buttonid", "" + id); //XXX no longer used?
  ret.onclick = (cb && thisvar ? cb.bind(thisvar) : cb) ?? null;

  self._add(ret);
  return ret;
}

export function colorbuttonImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath: string | undefined,
  packflag?: number,
  mass_set_path?: string
) {
  packflag = (packflag ?? 0) | (self.inherit_packflag & ~PackFlags.NO_UPDATE);

  mass_set_path = inpath !== undefined ? self._getMassPath(self.ctx, inpath, mass_set_path) : "";

  const ret = UIBase.createElement("color-picker-button-x") as ColorPickerButton<CTX>;

  if (inpath !== undefined) {
    inpath = self._joinPrefix(inpath)!;
    ret.setAttribute("datapath", inpath);
  }

  if (mass_set_path !== undefined) {
    ret.setAttribute("mass_set_path", mass_set_path);
  }

  ret.packflag |= packflag;

  self._add(ret);
  return ret;
}

export function noteframeImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  packflag = 0
) {
  const ret = UIBase.createElement("noteframe-x") as UIBase<CTX>;

  ret.packflag |= (self.inherit_packflag & ~PackFlags.NO_UPDATE) | packflag;

  self._add(ret as UIBase<CTX>);
  return ret as UIBase<CTX>;
}

export function curve1dImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath?: string,
  packflag = 0,
  mass_set_path?: string
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

  const ret = UIBase.createElement("curve-widget-x") as UIBase<CTX>;

  ret.ctx = self.ctx;
  ret.packflag |= packflag;

  if (inpath) {
    inpath = self._joinPrefix(inpath)!;
    ret.setAttribute("datapath", inpath);
  }

  if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

  self.add(ret as UIBase<CTX>);

  return ret as UIBase<CTX>;
}

export function vecpopupImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath?: string,
  packflag = 0,
  mass_set_path?: string
) {
  const button = UIBase.createElement("vector-popup-button-x") as UIBase<CTX>;

  mass_set_path = self._getMassPath(self.ctx, inpath, mass_set_path);

  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;
  let name = "vector";

  if (inpath) {
    inpath = self._joinPrefix(inpath)!;

    button.setAttribute("datapath", inpath);
    if (mass_set_path) {
      button.setAttribute("mass_set_path", mass_set_path);
    }

    const rdef = self.ctx.api.resolvePath(self.ctx, inpath);
    if (rdef?.prop) {
      name = rdef.prop.uiname ?? rdef.prop.apiname ?? name;
    }
  }

  button.setAttribute("name", name);
  button.packflag |= packflag;

  self.add(button as UIBase<CTX>);
  return button as UIBase<CTX>;
}

export function colorPickerImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  inpath?: string,
  packflag_or_args:
    | number
    | { packflag?: number; massSetPath?: string; themeOverride?: string } = 0,
  mass_set_path?: string,
  themeOverride?: string
) {
  let packflag: number;

  if (typeof packflag_or_args === "object") {
    const args = packflag_or_args;

    packflag = args.packflag ?? 0;
    mass_set_path = args.massSetPath;
    themeOverride = args.themeOverride;
  } else {
    packflag = packflag_or_args;
  }

  let path: string | undefined;

  if (inpath) {
    path = self._joinPrefix(inpath);
  }

  const ret = UIBase.createElement("colorpicker-x") as ColorPicker<CTX>;

  if (themeOverride) {
    ret.overrideClass(themeOverride);
  }

  packflag |= PackFlags.SIMPLE_NUMSLIDERS;

  self._container_inherit(ret, packflag);

  ret.ctx = self.ctx;
  ret.parentWidget = self;
  ret._init();
  ret.packflag |= packflag;
  ret.inherit_packflag |= packflag;
  ret.constructor.setDefault(ret);

  if (path !== undefined) {
    ret.setAttribute("datapath", path);
  }

  if (mass_set_path) {
    ret.setAttribute("mass_set_path", mass_set_path);
  }

  self._add(ret);
  return ret;
}

export function textareaImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  datapath?: string,
  value = "",
  packflag = 0,
  mass_set_path?: string,
  isRichText?: boolean
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  mass_set_path = self._getMassPath(self.ctx, datapath, mass_set_path);

  const prop = datapath ? self.getPathMeta(self.ctx, datapath) : undefined;
  if (prop !== undefined) {
    isRichText = isRichText ?? Boolean(prop.flag & PropFlags.RICH_TEXT_STRING);
  }

  const ret = UIBase.createElement(isRichText ? "rich-text-editor-x" : "text-area-x") as
    | RichEditor<CTX>
    | TextArea<CTX>;
  ret.ctx = self.ctx;

  ret.packflag |= packflag;

  if (value !== undefined) {
    ret.value = value;
  }

  if (datapath) ret.setAttribute("datapath", datapath);
  if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

  self.add(ret);
  return ret;
}

/**
 * html5 viewer
 * */
export function viewerImpl<CTX extends IContextBase, SELF extends string>(
  self: Container<CTX, SELF>,
  datapath?: string,
  value = "",
  packflag = 0,
  mass_set_path?: string
) {
  packflag |= self.inherit_packflag & ~PackFlags.NO_UPDATE;

  mass_set_path = self._getMassPath(self.ctx, datapath, mass_set_path);

  const ret = UIBase.createElement("html-viewer-x") as RichViewer<CTX>;
  ret.ctx = self.ctx;

  ret.packflag |= packflag;

  if (value !== undefined) {
    ret.value = value;
  }

  if (datapath) ret.setAttribute("datapath", datapath);
  if (mass_set_path) ret.setAttribute("mass_set_path", mass_set_path);

  self.add(ret);
  return ret;
}

import "../../widgets/ui_textarea";
import { PropFlags } from "../../path-controller/toolsys/toolprop";
