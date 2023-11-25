import {PackFlags, UIBase} from "../core/ui_base.js";
import {ColumnFrame} from "../core/ui.js";
import {PropTypes, PropFlags} from "../path-controller/toolsys/toolprop.js";

import {UndoFlags, ToolFlags} from "../path-controller/toolsys/toolsys.js";
import {DataPath, DataTypes} from "../path-controller/controller/controller.js";

import {ToolProperty} from '../path-controller/toolsys/toolprop.js';

import * as util from '../path-controller/util/util.js';
import cconst from '../config/const.js';

const LastKey = Symbol("LastToolPanelId");
let tool_idgen = 0;

export function getLastToolStruct(ctx) {
  let ret = ctx.state._last_tool;

  if (!ret) {
    ret = ctx.toolstack.head;
  } else {
    let msg = "Passing the last tool to last-tool-panel via appstate._last_tool is deprecated;";
    msg += "\nctx.toolstack.head is now used instead.";

    console.warn(msg);
  }

  return ret;
}

const last_tool_eventmap = [];
window.last_tool_eventmap = []

/* Try to avoid memory leaks when last tool panels are hidden. */
window.setInterval(() => {
  for (const entry of last_tool_eventmap) {
    const panel = entry.panel;
    if (!panel.isConnected || panel.hidden) {
      if (window.DEBUG && window.DEBUG.lastToolPanel) {
        console.log("Disconnecting last tool panel from toolstack.");
      }

      panel.unlinkEvents();
      panel.needsRebuild = true;
      break;
    }
  }
}, 500);

/*
*
* This panel shows the most recently executed ToolOp's
* settings.  It assumes that recent toolops are accessible
* in ctx.last_tool.
* */
export class LastToolPanel extends ColumnFrame {
  constructor() {
    super();

    this.ignoreOnChange = false;
    this.on_change = null;
    this._tool_id = undefined;
    this.useDataPathUndo = false;
    this.needsRebuild = false;
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

    this.needsRebuild = false;

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

    this.on_change = () => {
      if (this.ignoreOnChange) {
        return;
      }

      if (tool.modalRunning) {
        return;
      }

      if (tool === ctx.toolstack.head) {
        this.ignoreOnChange = true;
        ctx.toolstack.rerun(tool);
        this.ignoreOnChange = false;
      } else {
        this.unlinkEvents();
      }
    };

    this.buildTool(ctx, tool, panel);
    this.flushUpdate();
    this.flushUpdate();
  }

  unlinkEvents() {
    for (const entry of Array.from(last_tool_eventmap)) {
      if (entry.panel === this || !entry.panel.isConnected) {
        entry.prop.off("change", entry.cb);
        last_tool_eventmap.remove(entry);

        if (entry.panel !== this) {
          entry.panel.needsRebuild = true;
        }
      }
    }
  }

  /** client code can subclass and override this method */
  buildTool(ctx, tool, panel) {
    if (tool.flag & ToolFlags.PRIVATE) {
      return;
    }

    this.unlinkEvents();
    this.last_tool = tool;

    panel.useDataPathUndo = false;
    for (let k in tool.inputs) {
      let prop = tool.inputs[k];

      if (prop.flag & (PropFlags.PRIVATE | PropFlags.READ_ONLY)) {
        continue;
      }

      prop.on("change", this.on_change);
      last_tool_eventmap.push({
        panel: this,
        cb   : this.on_change,
        prop
      })

      let path = `last_tool.${k}`;
      let uiname = prop.uiname ?? ToolProperty.makeUIName(k);

      panel.label(uiname);
      let packflag = 0;

      /* Default to roller number sliders. */
      if (!(prop.flag & PropFlags.SIMPLE_SLIDER)) {
        packflag |= PackFlags.FORCE_ROLLER_SLIDER;
      }

      let ret = panel.prop(path, packflag);

      if (ret) {
        //ret.onchange = function() {
        //ctx.toolstack.rerun(tool);
        //}
      }
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

    this.needsRebuild |= tool && (!(LastKey in tool) || tool[LastKey] !== this._tool_id);

    if (this.needsRebuild) {
      tool[LastKey] = tool_idgen++;
      this._tool_id = tool[LastKey];

      this.rebuild();
    }
  }

  static define() {
    return {
      tagname: "last-tool-panel-x"
    }
  }
}

UIBase.internalRegister(LastToolPanel);
