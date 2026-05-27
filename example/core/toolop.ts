import { ToolOp } from "../pathux.js";

// The example uses file-based (whole-datalib) undo, stashing the serialized undo
// file on the tool instance. Named _fileUndo (not _undo) to avoid colliding with
// library ToolOp subclasses that declare their own _undo with a different type.
declare module "../pathux.js" {
  interface ToolOp {
    _fileUndo?: number[];
  }
}

/*
 * make base undo handlers
 * */
ToolOp.prototype.undoPre = function (ctx) {
  this._fileUndo = _appstate.createUndoFile();
};

ToolOp.prototype.undo = function (ctx) {
  if (this._fileUndo) {
    _appstate.loadUndoFile(this._fileUndo);
  }
};
