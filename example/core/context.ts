import {WorkspaceEditor} from "../editors/workspace/workspace.js";
import {Editor} from "../editors/editor_base.js";

import {Context, ContextOverlay, ContextFlags, Area, getLastToolStruct, ContextLike} from '../pathux.js';
import {DocsBrowserEditor} from "../editors/docbrowser/docbrowser.js";

import {message, warning, error, sendNote, SavedToolDefaults} from '../pathux.js';

import type {AppState} from "./app.js";
import type {ModelData} from "./state.js";
import type {DataAPI, ToolStack} from '../pathux.js';
import type {DataLib} from "./datablock.js";
import type {AppScreen} from "../editors/screen.js";
import type {Canvas} from "../draw/draw.js";

// The application context surfaced to tools and the data API. The runtime values are
// forwarded from BaseOverlay/ViewOverlay getters; this interface gives consumers
// (draw_ops, workspace_ops, editors) real types for those forwarded members. It extends
// the library ContextLike so it can be used as a ToolOp CTX/ModalCTX generic argument.
export interface AppContext extends ContextLike<AppState, ToolStack> {
  datalib: DataLib;
  data: ModelData | undefined;
  canvas: Canvas;
  workspace: WorkspaceEditor | undefined;
  editor: Area | undefined;
  docsbrowser: DocsBrowserEditor | undefined;
}

export class BaseOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get toolstack() {
    return (this.state as AppState).toolstack;
  }

  //toolDefaults is used by path.ux, see api_define.js
  get toolDefaults() {
    return SavedToolDefaults;
  }

  toolDefaults_save() {
    return SavedToolDefaults;
  }

  toolDefaults_load() {
    return SavedToolDefaults;
  }

  //set up last_tool for path.ux
  get last_tool() {
    return getLastToolStruct(this as unknown as ContextLike);
  }

  get api() {
    return (this.state as AppState).api;
  }

  get datalib() {
    return (this.state as AppState).datalib;
  }

  get data(): ModelData | undefined {
    return (this.state as AppState).datalib.getBlockSet("model_data")!.active as ModelData | undefined;
  }

  get canvas() {
    return this.data!.canvas;
  }

  get workspace() {
    return Area.getActiveArea(WorkspaceEditor);
  }

  workspace_save() {
    return Area.getActiveArea(WorkspaceEditor);
  }

  workspace_load(ctx: unknown, data: unknown) {
    return data;
  }
}

Context.register(BaseOverlay);

export class ViewOverlay extends ContextOverlay {
  static contextDefine() {return {
    name : "view",
    flag : ContextFlags.IS_VIEW
  }}

  get screen() {
    return (this.state as AppState).screen;
  }

  get editor() {
    return Area.getActiveArea();
  }

  get docsbrowser() {
    return Area.getActiveArea(DocsBrowserEditor);
  }
}

export class ContextBase extends Context {
  // These context properties are forwarded from the overlays (BaseOverlay /
  // ViewOverlay) at runtime; declaring them lets ToolContext/ViewContext satisfy
  // the library's ContextLike contract.
  declare state: AppState;
  declare api: DataAPI;
  declare toolstack: ToolStack;
  declare screen: AppScreen;
  declare datalib: DataLib;

  saveProperty(k: string) {
    const v = this[k];

    if (v instanceof Editor) {
      return ["Editor", k, v._area_id];
    }

    return ["object", k];
  }

  //send notification to user
  report(message: string, color: string, timeout?: number | undefined) {
    sendNote(_appstate.screen!, message, color, timeout);
  }

  loadProperty(ctx: unknown, key: string, data: unknown) {
    const arr = data as [string, string, number?];
    const context = ctx as ContextLike & Record<string, unknown>;

    if (arr[0] === "object") {
      return context[arr[1]];
    } else if (arr[0] === "Editor") {
      for (const sarea of context.screen.sareas) {
        if (sarea.area && sarea.area._area_id === arr[2]) {
          return sarea.area;
        }
        for (const area of sarea.editors) {
          if (area._area_id === arr[2]) {
            return area;
          }
        }
      }

      //fallback
      console.log("Failed to find editor", arr, arr[2]);
      return context[arr[1]];
    }
  }
}

export class ToolContext extends ContextBase {
  constructor(appstate: AppState) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
  }
}

export class ViewContext extends ContextBase {
  constructor(appstate: AppState) {
    super(appstate);

    this.reset();
  }

  reset() {
    this.pushOverlay(new BaseOverlay(this.state));
    this.pushOverlay(new ViewOverlay(this.state));
  }
}
