import * as platform_mod from "../platforms/platform";
import type { PlatformAPI } from "../platforms/platform_base";

import { ToolOp, UndoFlags, type PropertySlots } from "../path-controller/toolsys/toolsys";
import { BoolProperty } from "../path-controller/toolsys/toolprop";

import { error, message } from "../widgets/ui_noteframe";

import { getLastAppState, type AppState } from "./app";

declare const _appstate: AppState;

/** Cast the lazily-loaded platform singleton to its typed API. */
function getPlatform() {
  return platform_mod.platform as unknown as typeof PlatformAPI;
}

export class SimpleAppNewOp extends ToolOp<PropertySlots, PropertySlots> {
  static tooldef() {
    return {
      uiname  : "New",
      toolpath: "app.new",
      inputs  : {},
      undoflag: UndoFlags.NO_UNDO,
    };
  }

  exec(_ctx: unknown) {
    _appstate.createNewFile();
  }
}

export class SimpleAppSaveOp extends ToolOp<{ forceDialog: BoolProperty }, PropertySlots> {
  static tooldef() {
    return {
      uiname  : "Save",
      toolpath: "app.save",
      inputs: {
        forceDialog: new BoolProperty(),
      },
      undoflag: UndoFlags.NO_UNDO,
    };
  }

  exec(_ctx: unknown) {
    const ext = _appstate.fileExt;
    const useJSON = _appstate.startArgs!.saveFilesInJSON;

    _appstate
      .saveFile(undefined, {
        doScreen: true,
        useJSON,
        fromFileOp: true,
      })
      .then((data) => {
        function save() {
          return data;
        }

        getPlatform()
          .showSaveDialog("Save As", save, {
            multi          : false,
            addToRecentList: true,
            filters: [
              {
                name      : "File",
                mime      : useJSON ? "text/json" : "application/x-octet-stream",
                extensions: ["." + ext.toLowerCase()],
              },
            ],
          })
          .then((path: unknown) => {
            _appstate.currentFileRef = path;
            message(getLastAppState()!.screen!, "File saved");
          })
          .catch((err: unknown) => {
            let msg: unknown = err;
            if (typeof err === "object" && err !== null && "message" in err) {
              msg = (err as { message: string }).message;
            }

            error(getLastAppState()!.screen!, "Failed to save file " + String(msg));
          });
      });
  }
}

export class SimpleAppOpenOp extends ToolOp<{ forceDialog: BoolProperty }, PropertySlots> {
  static tooldef() {
    return {
      uiname  : "Open",
      toolpath: "app.open",
      inputs: {
        forceDialog: new BoolProperty(),
      },
      undoflag: UndoFlags.NO_UNDO,
    };
  }

  exec(ctx: unknown) {
    const ext = _appstate.fileExt;
    const useJSON = _appstate.startArgs!.saveFilesInJSON;
    const mime = useJSON ? "text/json" : "application/x-octet-stream";

    getPlatform()
      .showOpenDialog("Open File", {
        multi          : false,
        addToRecentList: true,
        filters: [
          {
            name: "File",
            mime,
            extensions: ["." + ext.toLowerCase()],
          },
        ],
      })
      .then((paths: unknown) => {
        for (const path of paths as Iterable<unknown>) {
          getPlatform()
            .readFile(path as string, mime)
            .then((data: unknown) => {
              console.log("got data!", data);

              _appstate.loadFile(data, { useJSON, doScreen: true, fromFileOp: true }).catch((err: unknown) => {
                error(getLastAppState()!.screen!, "File error: " + (err as Error).message);
              });
            });
        }
      })
      .catch((loadError: unknown) => {
        (ctx as { error(msg: string): void }).error((loadError as Error).message);
      });
  }
}

export function register() {
  ToolOp.register(SimpleAppSaveOp as unknown as Parameters<typeof ToolOp.register>[0]);
  ToolOp.register(SimpleAppOpenOp as unknown as Parameters<typeof ToolOp.register>[0]);
  ToolOp.register(SimpleAppNewOp as unknown as Parameters<typeof ToolOp.register>[0]);
}
