"use strict";
/*
a basic, simple tool system implementation
*/

import * as events from '../util/events.js';
import {keymap} from '../util/simple_events.js';
import {PropFlags, PropTypes} from './toolprop.js';
import {DataPath} from '../controller/controller_base.js';

export let ToolClasses = [];
window._ToolClasses = ToolClasses;
export function setContextClass(cls) {
  console.warn("setContextClass is deprecated");
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

let modalstack = [];

export class ToolPropertyCache {
  constructor() {
    this.map = new Map();
    this.pathmap = new Map();
    this.accessors = {};

    this.userSetMap = new Set();

    this.api = undefined;
    this.dstruct = undefined;
  }

  _buildAccessors(cls, key, prop, dstruct, api) {
    let tdef = cls._getFinalToolDef();

    this.api = api;
    this.dstruct = dstruct;

    if (!tdef.toolpath) {
      console.warn("Bad tool property", cls, "it's tooldef was missing a toolpath field");
      return;
    }

    let path = tdef.toolpath.trim().split(".").filter(f => f.trim().length > 0);
    let obj = this.accessors;

    let st = dstruct;
    let partial = "";

    for (let i=0; i<path.length; i++) {
      let k = path[i];
      let pathk = k;

      if (i === 0) {
        pathk = "accessors." + k;
      }

      if (i > 0) {
        partial += ".";
      }
      partial += k;

      if (!(k in obj)) {
        obj[k] = {};
      }

      let st2 = api.mapStruct(obj[k], true, k);
      if (!(k in st.pathmap)) {
        st.struct(pathk, k, k, st2);
      }
      st = st2;

      this.pathmap.set(partial, obj[k]);

      obj = obj[k];
    }

    let name = prop.apiname !== undefined && prop.apiname.length > 0 ? prop.apiname : key;
    let prop2 = prop.copy()

    let dpath = new DataPath(name, name, prop2);
    let uiname = prop.uiname;

    if (!uiname || uiname.trim().length === 0) {
      uiname = prop.apiname;
    }
    if (!uiname || uiname.trim().length === 0) {
      uiname = key;
    }

    uiname = ToolProperty.makeUIName(uiname);

    prop2.uiname = uiname;
    prop2.description = prop2.description ?? prop2.uiname;

    st.add(dpath);

    obj[name] = prop2.getValue();
  }


  _getAccessor(cls) {
    let toolpath = cls.tooldef().toolpath.trim();
    return this.pathmap.get(toolpath);
  }

  static getPropKey(cls, key, prop) {
    return prop.apiname && prop.apiname.length > 0 ? prop.apiname : key;
  }

  useDefault(cls, key, prop) {
    key = this.userSetMap.has(cls.tooldef().trim() + "." + this.constructor.getPropKey(key));
    key = key.trim();

    return key;
  }

  has(cls, key, prop) {
    let obj = this._getAccessor(cls);

    key = this.constructor.getPropKey(cls, key, prop);
    return obj && key in obj;
  }

  get(cls, key, prop) {
    let obj = this._getAccessor(cls);
    key = this.constructor.getPropKey(cls, key, prop);

    if (obj) {
      return obj[key];
    }

    return undefined;
  }

  set(cls, key, prop) {
    let toolpath = cls.tooldef().toolpath.trim();
    let obj = this._getAccessor(cls);

    if (!obj) {
      console.warn("Warning, toolop " + cls.name + " was not in the default map; unregistered?");
      this._buildAccessors(cls, key, prop, this.dstruct, this.api);

      obj = this.pathmap.get(toolpath);
    }

    if (!obj) {
      console.error("Malformed toolpath in toolop definition: " + toolpath);
      return;
    }

    key = this.constructor.getPropKey(cls, key, prop);

    //copy prop first in case we're a non-primitive-value type, e.g. vector properties
    obj[key] = prop.copy().getValue();

    let path = toolpath + "." + key;
    this.userSetMap.add(path);

    return this;
  }
}

export const SavedToolDefaults = new ToolPropertyCache();

export class ToolOp extends events.EventHandler {
  /**
  ToolOp definition.

  An example:
  <pre>
  static tooldef() {return {
      uiname   : "Tool Name",
      toolpath : "logical_module.tool", //logical_module need not match up to a real module
      icon     : -1, //tool's icon, or -1 if there is none
      description : "tooltip",
      is_modal : false, //tool is interactive and takes control of events
      hotkey : undefined,
      undoflag : 0, //see UndoFlags
      flag     : 0,
      inputs   : ToolOp.inherit({
        f32val : new Float32Property(1.0),
        path   : new StringProperty("./path");
      }),
      outputs  : {}
  }}
  </pre>
  */
  static tooldef() {
    if (this === ToolOp) {
      throw new Error("Tools must implemented static tooldef() methods!");
    }
    
    return {};
  }

  getDefault(toolprop) {
    //return SavedToolDefaults.get(this.constructor,
  }

  static Equals(a, b) {
    if (!a || !b) return false;
    if (a.constructor !== b.constructor) return false;

    let bad = false;

    for (let k in a.inputs) {
      bad = bad || !(k in b.inputs);
      bad = bad || a.inputs[k].constructor !== b.inputs[k];
      bad = bad || !a.inputs[k].equals(b.inputs[k]);

      if (bad) {
        break;
      }
    }

    return !bad;
  }

  saveDefaultInputs() {
    for (let k in this.inputs) {
      let prop = this.inputs[k];

      if (prop.flag & PropFlags.SAVE_LAST_VALUE) {
        SavedToolDefaults.set(this.constructor, k, prop);
      }
    }

    return this;
  }

  static inherit(slots={}) {
    return new InheritFlag(slots);
  }
  
  /**

   Creates a new instance of this toolop from args and a context.
   This is often use to fill properties with default arguments
   stored somewhere in the context.

   */
  static invoke(ctx, args) {
    let tool = new this();

    for (let k in args) {
      if (!(k in tool.inputs)) {
        console.warn("Unknown tool argument " + k);
        continue;
      }

      let prop = tool.inputs[k];
      let val = args[k];

      if ((typeof val === "string") && prop.type & (PropTypes.ENUM|PropTypes.FLAG)) {
        if (val in prop.values) {
          val = prop.values[val];
        } else {
          console.warn("Possible invalid enum/flag:", val);
          continue;
        }
      }

      tool.inputs[k].setValue(val);
    }

    return tool;
  }

  genToolString() {
    let def = this.constructor.tooldef();
    let path = def.toolpath + "(";

    for (let k in this.inputs) {
      let prop = this.inputs[k];

      path += k + "=";
      if (prop.type === PropTypes.STRING)
        path += "'";

      if (prop.type === PropTypes.FLOAT) {
        path += prop.getValue().toFixed(3);
      } else {
        path += prop.getValue();
      }
      
      if (prop.type === PropTypes.STRING)
        path += "'";
      path += " ";
    }
    path +=")";
    return path;
  }
  
  static register(cls) {
    if (ToolClasses.indexOf(cls) >= 0) {
      console.warn("Tried to register same ToolOp class twice:", cls.name, cls);
      return;
    }

    ToolClasses.push(cls);
  }

  static isRegistered(cls) {
    return ToolClasses.indexOf(cls) >= 0;
  }

  static unregister(cls) {
    if (ToolClasses.indexOf(cls) >= 0) {
      ToolClasses.remove(cls);
    }
  }

  static _getFinalToolDef() {
    let def = this.tooldef();

    let getSlots = (slots, key) => {
      if (slots === undefined)
        return {};

      if (!(slots instanceof InheritFlag)) {
        return slots;
      }

      slots = {};
      let p = this

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

    def.inputs = dinputs;
    def.outputs = doutputs;

    return def;
  }

  /**
   Main ToolOp constructor.  It reads the inputs/outputs properteis from
   this.constructor.tooldef() and copies them to build this.inputs and this.outputs.
   If inputs or outputs are wrapped in ToolOp.inherit(), it will walk up the class
   chain to fetch parent class properties.


   Default input values are loaded from SavedToolDefaults.  If initialized (buildToolSysAPI
   has been called) SavedToolDefaults will have a copy of all the default
   property values of all registered ToolOps.
   **/

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
        let prop = dinputs[k].copy();
        prop.apiname = prop.apiname && prop.apiname.length > 0 ? prop.apiname : k;

        if (SavedToolDefaults.has(this.constructor, k, prop)) {
          try {
            prop.setValue(SavedToolDefaults.get(this.constructor, k, prop));
          } catch (error) {
            console.log(error.stack);
            console.log(error.message);
          }
        }

        this.inputs[k] = prop;
      }
    }
    
    if (doutputs) {
      for (let k in doutputs) {
        let prop = doutputs[k].copy();
        prop.apiname = prop.apiname && prop.apiname.length > 0 ? prop.apiname : k;

        this.outputs[k] = prop;
      }
    }

    this.drawlines = [];
  }

  static onTick() {
    for (let toolop of modalstack) {
      toolop.on_tick();
    }
  }

  on_tick() {

  }

  /**default on_keydown implementation for modal tools,
  no need to call super() to execute this if you don't want to*/
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

  static searchBoxOk(ctx) {
    let flag = this.tooldef().flag;
    let ret = !(flag && (flag & ToolFlags.PRIVATE));
    ret = ret && this.canRun(ctx);

    return ret;
  }

  static canRun(ctx) {
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

  /**for use in modal mode only*/
  resetTempGeom() {
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

  /**for use in modal mode only*/
  makeTempLine(v1, v2, style) {
    let line = this.getOverdraw().line(v1, v2, style);
    this.drawlines.push(line);
    return line;
  }

  pushModal(node) {
    throw new Error("cannot call this; use modalStart")
  }

  popModal() {
    throw new Error("cannot call this; use modalEnd");
  }

  /**returns promise to be executed on modalEnd*/
  modalStart(ctx) {
    if (this.modalRunning) {
      console.warn("Warning, tool is already in modal mode consuming events");
      return this._promise;
    }
    
    //console.warn("tool modal start");
    
    this.modal_ctx = ctx;
    this.modalRunning = true

    this._promise = new Promise((accept, reject) => {
      this._accept = accept;
      this._reject = reject;

      modalstack.push(this);
      super.pushModal(ctx.screen);
    });

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
    if (this._modalstate) {
      modalstack.pop();
    }

    if (this._overdraw !== undefined) {
      this._overdraw.end();
      this._overdraw = undefined;
    }

    //console.log("tool modal end");
    
    if (was_cancelled && this._on_cancel !== undefined) {
      this._accept(this.modal_ctx, true);
      this._on_cancel(this);
    }
    
    this.resetTempGeom();
    
    var ctx = this.modal_ctx;
    
    this.modal_ctx = undefined;
    this.modalRunning = false;
    this.is_modal = false;
    
    super.popModal();
    
    this._promise = undefined;
    this._accept(ctx, false); //Context, was_cancelled
    this._accept = this._reject = undefined;

    this.saveDefaultInputs();
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

  static canRun(ctx) {
    return true;
  }

  /*
  canRun(ctx) {
    if (this.tools.length == 0)
      return false;
    
    //poll first tool only in list
    return this.tools[0].constructor.canRun(ctx);
  }//*/
  
  modalStart(ctx) {
    this._promise = new Promise((function(accept, reject) {
      this._accept = accept;
      this._reject = reject;
    }).bind(this));
    
    this.curtool = 0;

    let i;

    for (i=0; i<this.tools.length; i++) {
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
    this.ctx = ctx;
    this.modalRunning = 0;
  }

  get head() {
    return this[this.cur];
  }

  setRestrictedToolContext(ctx) {
    this.toolctx = ctx;
  }

  reset(ctx) {
    if (ctx !== undefined) {
      this.ctx = ctx;
    }

    this.modalRunning = 0;
    this.cur = -1;
    this.length = 0;
  }

  /**
   * runs .undo,.redo if toolstack head is same as tool
   *
   * otherwise, .execTool(ctx, tool) is called.
   *
   * @param compareInputs : check if toolstack head has identical input values, defaults to false
   * */
  execOrRedo(ctx, tool, compareInputs=false) {
    let head = this.head;

    let ok = compareInputs ? ToolOp.Equals(head, tool) : head && head.constructor === tool.constructor;

    if (ok) {
      //console.warn("Same tool detected");

      this.undo();

      //can inputs differ? in that case, execute new tool
      if (!compareInputs) {
        this.execTool(ctx, tool);
      } else {
        this.redo();
      }

      return false;
    } else {
      this.execTool(ctx, tool);
      return true;
    }
  }

  execTool(ctx, toolop) {
    if (this.ctx === undefined) {
      this.ctx = ctx;
    }

    if (!toolop.constructor.canRun(ctx)) {
      console.log("toolop.constructor.canRun returned false");
      return;
    }

    let tctx = this.toolctx !== undefined ? this.toolctx : ctx;
    tctx = tctx.toLocked();

    toolop._execCtx = tctx;

    if (!(toolop.undoflag & UndoFlags.NO_UNDO)) {
      this.cur++;

      //truncate
      this.length = this.cur+1;
      
      this[this.cur] = toolop;
      //let undoPre use full context
      //needed by DataPathSetOp
      toolop.undoPre(ctx.toLocked());
    }
    
    if (toolop.is_modal) {
      this.modalRunning = true;
      
      toolop._on_cancel = (function(toolop) {
        this.pop_i(this.cur);
        this.cur--;
      }).bind(this);
      
      //will handle calling .exec itself
      toolop.modalStart(ctx.toLocked());
    } else {
      toolop.execPre(tctx);
      toolop.exec(tctx);
      toolop.execPost(tctx);
      toolop.saveDefaultInputs();
    }
  }
  
  undo() {
    if (this.cur >= 0 && !(this[this.cur].undoflag & UndoFlags.IS_UNDO_ROOT)) {
      let tool = this[this.cur];
      tool.undo(tool._execCtx);
      this.cur--;
    }
  }
  
  redo() {
    if (this.cur >= -1 && this.cur+1 < this.length) {
      this.cur++;

      let tool = this[this.cur];
      let ctx = tool._execCtx;
      //ctx = this.ctx;

      tool.undoPre(ctx);
      tool.execPre(ctx);
      tool.exec(ctx);
      tool.execPost(ctx);
    }
  }
}

export function buildToolSysAPI(api) {
  let datastruct = api.mapStruct(ToolPropertyCache, true);

  for (let cls of ToolClasses) {
    let def = cls._getFinalToolDef();

    for (let k in def.inputs) {
      let prop = def.inputs[k];

      if (!(prop.flag & (PropFlags.PRIVATE|PropFlags.READ_ONLY))) {
        SavedToolDefaults._buildAccessors(cls, k, prop, datastruct, api);
      }
    }

  }
}
