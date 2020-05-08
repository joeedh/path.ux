import {ToolOp} from "../pathux.js";

/*
* make base undo handlers
* */
ToolOp.prototype.undoPre = function(ctx) {
  this._undo = _appstate.createUndoFile();
};

ToolOp.prototype.undo = function(ctx) {
  _appstate.loadUndoFile(this._undo);
};
