"use strict";
/*
a basic, simple tool system implementation
*/

import * as util from './util.js';
import * as events from './events.js';
import {keymap} from './simple_events.js';

export let ToolClasses = [];

//XXX need to get rid of this ContextExample class
export class ContextExample {
  constructor() {
  }
  
  execTool(tool) {
    return this.state.toolstack.execTool(tool);
  }
  
  get api() {
    return _appstate.api;
  }
  
  get screen() {
    return _appstate.screen;
  }
  
  get state() {
    return _appstate;
  }
  
  save() {
    _appstate.save();
  }
  
  get editor() {
    throw new Error("implement me");
  }
}

//XXX we don't need access to a Context class in this file, get rid of this crap
let ContextCls = ContextExample;
export function setContextClass(cls) {
  ContextCls = cls;
}

export const ToolFlags = {
  PRIVATE : 1
};


export const UndoFlags = {
  NO_UNDO       : 2,
  IS_UNDO_ROOT  : 4,
  UNDO_BARRIER  :  8,
  HAS_UNDO_DATA : 16
};

class InheritFlag {
  constructor(slots={}) {
    this.slots = slots;
  }
}

export class ToolOp extends events.EventHandler {
  static tooldef() {return {
    uiname   : "!untitled tool",
    toolpath : "logical_module.tool", //logical_module need not match up to real module name
    icon     : -1,
    description : undefined,
    is_modal : false,
    hotkey : undefined,
    undoflag : 0,
    flag     : 0,
    inputs   : {}, //tool properties, enclose in ToolOp.inherit({}) to inherit from parent classes
    outputs  : {}  //tool properties, enclose in ToolOp.inherit({}) to inherit from parent classes
  }}

  static inherit(slots) {
    return new InheritFlag(slots);
  }
  
  //creates a new instance from args
  static invoke(ctx, args) {
    return new this();
  }
  
  static register(cls) {
    ToolClasses.push(cls);
  }
  
  constructor() {
    super();

    this._overdraw = undefined;

    var def = this.constructor.tooldef();

    if (def.undoflag !== undefined) {
      this.undoflag = def.undoflag;
    }

    if (def.flag !== undefined) {
      this.flag = def.flag;
    }

    this._accept = this._reject = undefined;
    this._promise = undefined;
    
    for (var k in def) {
      this[k] = def[k];
    }

    let getSlots = (slots, key) => {
      if (slots === undefined)
        return {};

      if (!(slots instanceof InheritFlag)) {
        return slots;
      }

      slots = {};
      let p = this.constructor;

      while (p !== undefined && p !== Object && p !== ToolOp) {
        if (p.tooldef) {
          let def = p.tooldef();

          if (def[key] !== undefined) {
            let slots2 = def[key];
            let stop = !(slots2 instanceof InheritFlag);

            if (slots2 instanceof InheritFlag) {
              slots2 = slots2.slots;
            }

            for (let k in slots2) {
              if (!(k in slots)) {
                slots[k] = slots2[k];
              }
            }

            if (stop) {
              break;
            }
          }

        }
        p = p.prototype.__proto__.constructor;
      }

      return slots;
    };

    let dinputs = getSlots(def.inputs, "inputs");
    let doutputs = getSlots(def.outputs, "outputs");

    this.inputs = {};
    this.outputs = {};
    
    if (dinputs) {
      for (let k in dinputs) {
        this.inputs[k] = dinputs[k].copy();
      }
    }
    
    if (doutputs) {
      for (let k in doutputs) {
        this.outputs[k] = doutputs[k].copy();
      }
    }

    this.drawlines = [];
  }

  //default on_keydown implementation for modal tools,
  //no need to call super() to execute this if you don't want to
  on_keydown(e) {
    switch (e.keyCode) {
      case keymap["Enter"]:
      case keymap["Space"]:
        this.modalEnd(false);
        break;
      case keymap["Escape"]:
        this.modalEnd(true);
        break;
    }
  }

  /** for compatibility with fairmotion, don't use */
  can_call(ctx) {
    return this.canRun(ctx);
  }

  canRun(ctx) {
    return true;
  }
  
  undoPre(ctx) {
    this._undo = _appstate.genUndoFile();
  }
  
  undo(ctx) {
    _appstate.loadUndoFile(this._undo);
  }

  //for compatibility with fairmotion
  exec_pre(ctx) {
    this.execPre(ctx);
  }

  execPre(ctx) {
  }
  exec(ctx) {
  }
  execPost(ctx) {

  }

  //for use in modal mode only
  resetDrawLines() {
    var ctx = this.modal_ctx;
    
    for (var dl of this.drawlines) {
      dl.remove();
    }
    
    this.drawlines.length = 0;
  }
  
  error(msg) {
    console.warn(msg);
  }

  getOverdraw() {
    if (this._overdraw === undefined) {
      this._overdraw = document.createElement("overdraw-x");
      this._overdraw.start(this.modal_ctx.screen);
    }

    return this._overdraw;
  }
  //for use in modal mode only
  addDrawLine(v1, v2, style) {
    let line = this.getOverdraw().line(v1, v2, style);
    this.drawlines.push(line);
    return line;
  }
  
  //returns promise to be executed on modalEnd
  modalStart(ctx) {
    if (this.modalRunning) {
      console.warn("Warning, tool is already in modal mode consuming events");
      return this._promise;
    }
    
    console.warn("tool modal start");
    
    this.modal_ctx = ctx;
    this.modalRunning = true
    
    this.pushModal(ctx.screen);

    this._promise = new Promise((function(accept, reject) {
      this._accept = accept;
      this._reject = reject;
    }).bind(this));
    
    return this._promise;
  }

  /*eek, I've not been using this.
    guess it's a non-enforced contract, I've been naming
    cancel methods 'cancel' all this time.

    XXX fix
  */
  toolCancel() {
  }
  
  modalEnd(was_cancelled) {
    if (this._overdraw !== undefined) {
      this._overdraw.end();
      this._overdraw = undefined;
    }

    console.log("tool modal end");
    
    if (was_cancelled && this._on_cancel !== undefined) {
      this._accept(this.modal_ctx, true);
      this._on_cancel(this);
    }
    
    this.resetDrawLines();
    
    var ctx = this.modal_ctx;
    
    this.modal_ctx = undefined;
    this.modalRunning = false;
    this.is_modal = false;
    
    this.popModal(_appstate._modal_dom_root);
    
    this._promise = undefined;
    this._accept(ctx, false); //Context, was_cancelled
    this._accept = this._reject = undefined;
  }
}

export class ToolMacro extends ToolOp {
  static tooldef() {return {
    uiname : "Tool Macro"
  }}
  
  constructor() {
    super();
    
    this.tools = [];
    this.curtool = 0;
    this.has_modal = false;
    this.connects = [];
  }
  
  connect(srctool, dsttool, callback, thisvar) {
    this.connects.push({
      srctool  : srctool,
      dsttool  : dsttool,
      callback : callback,
      thisvar  : thisvar
    });
    
    return this;
  }
  
  add(tool) {
    if (tool.is_modal) {
      this.is_modal = true;
    }
    
    this.tools.push(tool);
    
    return this;
  }
  
  _do_connections(tool) {
    for (var c of this.connects) {
      if (c.srctool === tool) {
        c.callback.call(c.thisvar, c.srctool, c.dsttool);
      }
    }
  }
  
  canRun(ctx) {
    if (this.tools.length == 0)
      return false;
    
    //poll first tool only in list
    return this.tools[0].canRun(ctx);
  }
  
  modalStart(ctx) {
    this._promise = new Promise((function(accept, reject) {
      this._accept = accept;
      this._reject = reject;
    }).bind(this));
    
    this.curtool = 0;
    
    for (var i=0; i<this.tools.length; i++) {
      if (this.tools[i].is_modal)
        break;
      
      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }
    
    var on_modal_end = (function on_modal_end() {
        this._do_connections(this.tools[this.curtool]);
        this.curtool++;
        
        while (this.curtool < this.tools.length && 
               !this.tools[this.curtool].is_modal) 
        {
            this.tools[this.curtool].undoPre(ctx);
            this.tools[this.curtool].execPre(ctx);
            this.tools[this.curtool].exec(ctx);
            this.tools[this.curtool].execPost(ctx);
            this._do_connections(this.tools[this.curtool]);
            
            this.curtool++;
        }
        
        if (this.curtool < this.tools.length) {
          this.tools[this.curtool].undoPre(ctx);
          this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
        } else {
          this._accept(this, false);
        }
    }).bind(this);
    
    if (i < this.tools.length) {
      this.curtool = i;
      this.tools[this.curtool].undoPre(ctx);
      this.tools[this.curtool].modalStart(ctx).then(on_modal_end);
    }
    
    return this._promise;
  }
  
  exec(ctx) {
    for (var i=0; i<this.tools.length; i++) {
      this.tools[i].undoPre(ctx);
      this.tools[i].execPre(ctx);
      this.tools[i].exec(ctx);
      this.tools[i].execPost(ctx);
      this._do_connections(this.tools[i]);
    }
  }
  
  undoPre() {
    return; //undoPre is handled in exec() or modalStart()
  }
  
  undo(ctx) {
    for (var i=this.tools.length-1; i >= 0; i--) {
      this.tools[i].undo(ctx);
    }
  }
}

export class ToolStack extends Array {
  constructor(ctx) {
    super();
    
    this.cur = -1;
    this.ctx = ctx === undefined ? new ContextCls() : ctx;  //XXX get rid of ContextCls crap
    this.modalRunning = 0;
  }

  reset(ctx) {
    if (ctx !== undefined) {
      this.ctx = ctx;
    }

    this.modalRunning = 0;
    this.cur = -1;
    this.length = 0;
  }

  execTool(toolop, ctx=this.ctx) {
    if (!toolop.canRun(ctx)) {
      console.log("toolop.canRun returned false");
      return;
    }
    
    if (!(toolop.undoflag & UndoFlags.NO_UNDO)) {
      this.cur++;

      //truncate
      this.length = this.cur+1;
      
      this[this.cur] = toolop;
      toolop.undoPre(ctx);
    }
    
    if (toolop.is_modal) {
      this.modalRunning = true;
      
      toolop._on_cancel = (function(toolop) {
        this.pop_i(this.cur);
        this.cur--;
      }).bind(this);
      
      //will handle calling .exec itself
      toolop.modalStart(ctx);
    } else {
      toolop.execPre(ctx);
      toolop.exec(ctx);
      toolop.execPost(ctx);
    }
  }
  
  undo() {
    if (this.cur >= 0 && !(this[this.cur].undoflag & UndoFlags.IS_UNDO_ROOT)) {
      console.log("undo!", this.cur, this.length);
      
      this[this.cur].undo(this.ctx);
      this.cur--;
      this.ctx.save();
    }
  }
  
  redo() {
    if (this.cur >= -1 && this.cur+1 < this.length) {
      console.log("redo!", this.cur, this.length);
      
      this.cur++;
      
      this[this.cur].undoPre(this.ctx);
      this[this.cur].execPre(this.ctx);
      this[this.cur].exec(this.ctx);
      this[this.cur].execPost(this.ctx);
      this.ctx.save();
    }
  }
}
