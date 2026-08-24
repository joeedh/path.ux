import {
  HotKey,
  KeyMap,
  Screen,
  ToolClasses,
  UIBase,
  createMenu,
  nstructjs,
  startMenu,
} from "../pathux.js";
import type { ContextLike } from "../pathux.js";

export class AppScreen extends Screen {
  constructor() {
    super();

    this.defineKeymap();
  }

  defineKeymap() {
    this.keymap = new KeyMap([
      new HotKey("Z", ["ctrl"], () => {
        console.log("undo hotkey");
        _appstate.toolstack.undo();
      }),
      new HotKey("Z", ["ctrl", "shift"], () => {
        console.log("redo hotkey");
        _appstate.toolstack.redo();
      }),
      new HotKey("Y", ["ctrl"], () => {
        console.log("redo hotkey");
        _appstate.toolstack.redo();
      }),
      new HotKey("S", [], () => {
        _appstate.screen!.splitTool();
      }),
      new HotKey("P", ["ctrl", "alt"], (ctx) => {
        this.showCommandPalette(ctx);
      }),
    ]);
  }

  /**
   * Opens a searchable menu over every registered tool, so any toolpath can
   * be run by name. Bound to Ctrl-Alt-P.
   */
  showCommandPalette(ctx: ContextLike) {
    const paths: string[] = [];
    for (const cls of ToolClasses) {
      const path = cls.tooldef().toolpath;
      if (path === undefined) {
        continue;
      }
      // A path the context's API cannot resolve would render as an error row.
      try {
        ctx.api.getToolDef(path);
      } catch {
        continue;
      }
      paths.push(path);
    }
    paths.sort();

    const menu = createMenu(ctx, "Commands", paths);
    startMenu(menu, this.size[0] * 0.4, this.size[1] * 0.2, true);
  }

  init() {
    super.init();
  }

  static define() {
    return {
      tagname: "app-screen-x",
    };
  }
}
AppScreen.STRUCT =
  nstructjs.STRUCT.inherit(AppScreen, Screen, "app.AppScreen") +
  `
}`;
nstructjs.register(AppScreen);
UIBase.register(AppScreen);
