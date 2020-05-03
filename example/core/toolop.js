import {ToolOp} from "../../scripts/simple_toolsys.js";

/*
* make base undo handlers
* */
ToolOp.prototype.undoPre = function(ctx) {
  this._undo = _appstate.createUndoFile();
};

ToolOp.prototype.undo = function(ctx) {
  _appstate.loadUndoFile(this._undo);
};
