import * as platform from '../platforms/platform.js';

import {ToolOp, UndoFlags} from '../path-controller/toolsys/toolsys.js';
import {ToolProperty, BoolProperty, StringProperty} from '../path-controller/toolsys/toolprop.js';

import {sendNote, error, warning, message} from '../widgets/ui_noteframe.js';

export class SimpleAppNewOp extends ToolOp {
  static tooldef() {
    return {
      uiname  : "New",
      toolpath: "app.new",
      inputs  : {},
      undoflag: UndoFlags.NO_UNDO
    }
  }

  exec(ctx) {
    _appstate.createNewFile();
  }
}

export class SimpleAppSaveOp extends ToolOp {
  static tooldef() {
    return {
      uiname  : "Save",
      toolpath: "app.save",
      inputs  : {
        forceDialog: new BoolProperty()
      },
      undoflag: UndoFlags.NO_UNDO
    }
  }

  exec(ctx) {
    let ext = _appstate.fileExt;
    let useJSON = _appstate.startArgs.saveFilesInJSON;

    _appstate.saveFile({
      doScreen  : true,
      useJSON,
      fromFileOp: true
    }).then(data => {

      function save() {
        return data;
      }

      platform.platform.showSaveDialog("Save As", save, {
        multi          : false,
        addToRecentList: true,
        filters        : [{
          name      : "File",
          mime      : useJSON ? "text/json" : "application/x-octet-stream",
          extensions: ["." + ext.toLowerCase()]
        }]
      }).then(path => {
        _appstate.currentFileRef = path;
        message("File saved");
      }).catch(err => {
        if (typeof err === "object" && err.message) {
          err = err.message;
        }

        error("Failed to save file " + err);
      });
    });
  }
}

export class SimpleAppOpenOp extends ToolOp {
  static tooldef() {
    return {
      uiname  : "Open",
      toolpath: "app.open",
      inputs  : {
        forceDialog: new BoolProperty()
      },
      undoflag: UndoFlags.NO_UNDO
    }
  }

  exec(ctx) {
    let ext = _appstate.fileExt;
    let useJSON = _appstate.startArgs.saveFilesInJSON;
    let mime = useJSON ? "text/json" : "application/x-octet-stream";

    platform.platform.showOpenDialog("Open File", {
      multi          : false,
      addToRecentList: true,
      filters        : [{
        name      : "File",
        mime,
        extensions: ["." + ext.toLowerCase()]
      }]
    }).then(paths => {
      for (let path of paths) {
        platform.platform.readFile(path, mime).then(data => {
          console.log("got data!", data);

          _appstate.loadFile(data, {useJSON, doScreen: true, fromFileOp: true})
            .catch(err => {
              error("File error: " + err.message);
            });
        });
      }
    });
  }
}

export function register() {
  ToolOp.register(SimpleAppSaveOp);
  ToolOp.register(SimpleAppOpenOp);
  ToolOp.register(SimpleAppNewOp);
}
