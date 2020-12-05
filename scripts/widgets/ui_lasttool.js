import {UIBase} from "../core/ui_base.js";
import {ColumnFrame} from "../core/ui.js";
import {PropTypes, PropFlags} from "../toolsys/toolprop.js";

import {UndoFlags} from "../toolsys/simple_toolsys.js";
import {DataPath, DataTypes} from "../controller/simple_controller.js";

import * as util from '../util/util.js';
import cconst from '../config/const.js';

const LastKey = Symbol("LastToolPanelId");
let tool_idgen = 0;

/*
*
* This panel shows the most recently executed ToolOp's
* settings.  It assumes that recent toolops are accessible
* in ctx.last_tool.
* */
export class LastToolPanel extends ColumnFrame {
  constructor() {
    super();

    this._tool_id = undefined;
    this.useDataPathUndo = false;
  }

  init() {
    super.init();

    this.useDataPathUndo = false;
    this.rebuild();
  }

  /** client code can subclass and override this method */
  getToolStackHead(ctx) {
    //don't process the root toolop
    let bad = ctx.toolstack.length === 0 || ctx.toolstack.cur >= ctx.toolstack.length;
    bad = bad || ctx.toolstack.cur < 0;
    bad = bad || ctx.toolstack[ctx.toolstack.cur].undoflag & UndoFlags.IS_UNDO_ROOT;

    if (bad) {
      return undefined;
    }

    return ctx.toolstack[ctx.toolstack.cur];
  }

  rebuild() {
    let ctx = this.ctx;
    if (ctx === undefined) {
      this._tool_id = -1; //wait for .ctx
      return;
    }

    this.clear();

    this.label("Recent Command Settings");

    let tool = this.getToolStackHead(ctx);

    if (!tool) {
      this.setCSS();
      return;
    }

    let def = tool.constructor.tooldef();
    let name = def.uiname !== undefined ? def.uiname : def.name;

    let panel = this.panel(def.uiname);

    this.buildTool(ctx, tool, panel);
  }

  /** client code can subclass and override this method */
  buildTool(ctx, tool, panel) {
    let fakecls = {};
    fakecls.constructor = fakecls;

    //in theory it shouldn't matter if multiple last tool panels
    //override _last_tool, since they all access the same data
    this.ctx.state._last_tool = fakecls;
    let lastkey = tool[LastKey];

    let getTool = () => {
      let tool = this.ctx.toolstack[this.ctx.toolstack.cur];
      if (!tool || tool[LastKey] !== lastkey) {
        return undefined;
      }

      return tool;
    };

    let st = this.ctx.api.mapStruct(fakecls, true);
    let paths = [];

    function defineProp(k, key) {
      Object.defineProperty(fakecls, key, {
        get : function() {
          let tool = getTool();
          if (tool) {
            return tool.inputs[k].getValue();
          }
        },

        set : function(val) {
          let tool = getTool();
          if (tool) {
            tool.inputs[k].setValue(val);
            ctx.toolstack.rerun(tool);

            window.redraw_viewport();
          }
        }
      });
    }

    for (let k in tool.inputs) {
      let prop = tool.inputs[k];

      if (prop.flag & (PropFlags.PRIVATE|PropFlags.READ_ONLY)) {
        continue;
      }

      let uiname = prop.uiname !== undefined ? prop.uiname : k;

      prop.uiname = uiname;
      let apikey = k.replace(/[\t ]/g, "_");

      let dpath = new DataPath(apikey, apikey, prop, DataTypes.PROP);
      st.add(dpath);

      paths.push(dpath);

      defineProp(k, apikey);
    }

    for (let dpath of paths) {
      let path = "last_tool." + dpath.path;

      panel.label(dpath.data.uiname);
      panel.prop(path);
    }
    this.setCSS();

    //console.log("Building last tool settings");
  }

  update() {
    super.update();
    let ctx = this.ctx;

    if (!ctx) {
      return;
    }

    let tool = this.getToolStackHead(ctx);

    if (tool && (!(LastKey in tool) || tool[LastKey] !== this._tool_id)) {
      tool[LastKey] = tool_idgen++;
      this._tool_id = tool[LastKey];

      this.rebuild();
    }
  }

  static define() {return {
    tagname : "last-tool-panel-x"
  }}
}
UIBase.internalRegister(LastToolPanel);
