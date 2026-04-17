import "./path-controller/util/polyfill";

export * from "./xmlpage/xmlpage";

export * from "./core/ui_base";
export * from "./core/ui";
export * from "./widgets/ui_widgets";
export * from "./widgets/ui_widgets2";
export * from "./core/cssfont";
export * from "./core/ui_theme";
export * from "./core/units";
export * from "./widgets/ui_button";
export * from "./widgets/ui_richedit";
export * from "./widgets/ui_curvewidget";
export * from "./widgets/ui_panel";
export * from "./widgets/ui_colorpicker2";
export * from "./widgets/ui_tabs";
export * from "./widgets/ui_listbox";
export * from "./widgets/ui_menu";
export * from "./widgets/ui_progress";
export { TableRow } from "./widgets/ui_table";
export * from "./widgets/ui_noteframe";
export * from "./widgets/ui_numsliders";
export * from "./widgets/ui_lasttool";
export * from "./widgets/ui_textbox";
export * from "./path-controller/util/graphpack";

export * from "./path-controller/util/html5_fileapi";
export * from "./path-controller/controller";

import * as controller from "./path-controller/controller";

export { controller };

import * as ui_noteframe from "./widgets/ui_noteframe";

controller.setNotifier(ui_noteframe);

export {
  PlatformAPI,
  getMime,
  isMimeText,
  mimeMap,
  textMimes,
  FileDialogArgs,
  FilePath,
} from "./platforms/platform_base";

import * as platform from "./platforms/platform";

export { platform };

import * as electron_api from "./platforms/electron/electron_api";

export { electron_api };

export * from "./widgets/theme_editor";
export * from "./widgets/ui_treeview";

export * from "./screen/FrameManager";
export * from "./screen/ScreenArea";
export * from "./util/ScreenOverdraw";

import cconst from "./config/const";

export { cconst };

import * as simple from "./simple/simple";

export { simple };

import "./global.d.ts";
