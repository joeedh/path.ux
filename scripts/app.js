"use strict";

/**
 Test app
*/

import * as simple_controller from './simple_controller.js';

import * as util from './util.js';
import * as icon_enum from './icon_enum.js';
import * as events from './events.js';
import * as simple_events from './simple_events.js';
import * as toolsys from './simple_toolsys.js';
import * as ui from './ui.js';
import * as image from './image.js';
import * as FrameManager from './FrameManager.js';
import * as FrameManager_ops from './FrameManager_ops.js';
import * as ScreenArea from './ScreenArea.js';
import * as ui_widgets from './ui_widgets.js';
import * as controller from './controller.js';
import * as ui_base from './ui_base.js';
import * as cconst from './const.js';
import * as config from './config.js';
import * as ui_menu from './ui_menu.js';
import * as toolpath from './toolpath.js';

let Icons = icon_enum.Icons;
ui_base.setIconMap(Icons);

import './struct.js';

let PackFlags = ui_base.PackFlags;

window.STARTUP_FILE_NAME = "startup_file_pathux";

ScreenArea.Area.prototype.getScreen = function() {
  return _appstate.screen;
}

export class CanvasArea extends ScreenArea.Area {
  constructor() {
    super();
    
    this.canvas = document.createElement("canvas");
    this.g = this.canvas.getContext("2d");
    
    this.shadow.appendChild(this.canvas);
    
    let mstart = (e) => {
      let sa = this.owning_sarea;
      
      if (!sa) return e;
      
      e = events.copyMouseEvent(e);
      
      e.x -= sa.pos[0];
      e.y -= sa.pos[1];
      e.pageX -= sa.pos[0];
      e.pageY -= sa.pos[1];
      e.clientX -= sa.pos[0];
      e.clientY -= sa.pos[1];
      
      //console.log(e.x, e.y, _appstate.screen.sareas.active.pos === sa);
      
      return e;
    }

    this.canvas.addEventListener("mousedown", (e) => {
      e = mstart(e);
    });
    
    this.canvas.addEventListener("mousemove", (e) => {
      e = mstart(e);
    });
    
    this.canvas.addEventListener("mouseup", (e) => {
      e = mstart(e);
    });      
  }

  init() {
    super.init();
    this.remakeUI();
  }

  remakeUI() {
    if (this.ui !== undefined) {
      this.ui.remove();
      this.canvas.remove();
      this.ui = undefined;
    }
    
    let ui = this.ui = document.createElement("container-x");
    let header = this.makeHeader(ui);
    ui = header;
    //ui = this.headerRow;

    ui.ctx = _appstate.ctx;
    ui.style["width"] = "100%";
    //ui.style["height"] = "245px";
    
    this.shadow.appendChild(ui);
    
    let row = ui.row();
    
    row.tool("screen.area.split", PackFlags.USE_ICONS|PackFlags.SMALL_ICON, (cls) => new cls(_appstate.screen));
    row.tool("screen.area.split", 0, (cls) => new cls(_appstate.screen));
    let SEP = ui_menu.Menu.SEP;
    
    row.menu("File", [
      ["Open", () => console.log("yay open")],
      "screen.area.split",
      "screen.area.drag",
      SEP,
      ["Close", () => console.log("yay close")],
    ]);

    row.menu("File", [
      "screen.area.split",
      SEP,
      ["Open", () => console.log("yay open")],
      ["Close", () => console.log("yay close")],
      "screen.area.drag",
    ]);

    row.checkenum("state.enumval", "Enum", ui_base.PackFlags.USE_ICONS|ui_base.PackFlags.SMALL_ICON);
    row.listenum("state.enumval", "Enum");
    //*/
    
    row = ui.row();
    let tabs = row.tabs("right");
    tabs.style["width"] = "300px";
    tabs.style["height"] = "400px";
    tabs.float(1, 75*ui_base.UIBase.getDPI(), 7);
    //*
    
    let tab = tabs.tab("yay");

    //tab.float(1, 1, 7);
    //tab.slider("EXAMPLE_PARAM", "Example", 128, 1, 512, true, false);
    tab.prop("state.color");

    tab = tabs.tab("Display");
    
    tabs.tab("one");
    tabs.tab("two");
    tabs.tab("three");
    //*/
    
    ui.update();
    
    let mpos = [0, 0];
    let start_mpos = [0, 0];
    let mdown = false;
    
    ui.addEventListener("mousedown", (e) => {
      mpos[0] = e.x;
      mpos[1] = e.y;
      
      start_mpos[0] = mpos[0];
      start_mpos[1] = mpos[1];
      
      mdown = true;
    });
    
    ui.addEventListener("mouseup", (e) => {
      mpos[0] = e.x;
      mpos[1] = e.y;
      mdown = false;
    });

    this.shadow.appendChild(this.canvas);
  }
  
  static define() { return {
    tagname  : "canvasarea-x",
    areaname : "canvas_area",
    uiname   : "Canvas Area",
    areatype : ScreenArea.AreaTypes.TEST_CANVAS_EDITOR
  };}
  
  copy() {
    let ret = document.createElement("canvasarea-x");
    
    ret.ctx = this.ctx;
    
    return ret;
  }

  draw() {
    if (this.ctx !== undefined) {
      this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  on_resize(size) {
    super.on_resize();
    
    this.canvas.width = size[0];
    this.canvas.height = size[1];
    
    if (window.redraw_all)
      window.redraw_all();
  }
  
  update() {
    //console.log("update");
    
    //this.canvas.style["left"] = this.pos[0];
    //this.canvas.style["top"] = this.pos[1];
    super.update();
    this.ui.update();
  }
  
  static fromSTRUCT(reader) {
    let ret = document.createElement("canvasarea-x");
    ret.ctx = _appstate.ctx;
    
    reader(ret);
    ret.remakeUI();
    ret.afterSTRUCT();
    
    return ret;
  }

}

CanvasArea.STRUCT = nstructjs.STRUCT.inherit(CanvasArea, ScreenArea.Area) + `
  }
`;

nstructjs.manager.add_class(CanvasArea);
ScreenArea.Area.register(CanvasArea);

export class AppState extends events.EventHandler {
  constructor() {
    super();
    
    this.lastsize = [0, 0];
    
    this.last_save = 0;
    
    this.ctx = new toolsys.ContextExample();
    this.toolstack = new toolsys.ToolStack();
    
    this._modal_dom_root = undefined;
    
    this.initAPI();

    //this.makeGUI();
    this.image = undefined;
    this.enumval = 0;
    this.color = [1, 0, 0, 1];
  }
  
  initAPI() {
    this.api = new simple_controller.DataAPI();
    
    toolpath.initToolPaths();
    window._ToolPaths = toolpath.ToolPaths;
    
    let stt = this.api.rootContextStruct = this.api.mapStruct(toolsys.ContextExample);
    stt = stt.struct("state", "state", "state", this.api.mapStruct(AppState));
    
    let def = stt.enum("enumval",  "enumval", {A : 0, Test : 1, Triangle : 2, Bleh : 3, Yay : 4});
    def.icons({
      A : Icons.DELETE,
      Test : Icons.UNDO,
      Triangle : Icons.REDO,
      Bleh : Icons.FOLDER,
      Yay : Icons.BACKSPACE
    });

    stt.color4("color", "color", "color", "color");
  }
  
  makeScreen() {
    this.screen = this.gui = document.createElement("screen-x");
    this.screen.ctx = this.ctx;
    this.screen.listen();
    
    this.screen.size = [window.innerWidth, window.innerHeight];
    
    let sarea = document.createElement("screenarea-x");
    
    sarea.size[0] = window.innerWidth;
    sarea.size[1] = window.innerHeight;
    
    this.screen.makeBorders();
    
    sarea.setCSS();
    this.screen.setCSS();
    
    document.body.appendChild(this.screen);
    this.screen.appendChild(sarea);
    
    sarea.switch_editor(CanvasArea);
    
    let canvas = sarea.area.canvas;
    this.canvas = canvas;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    //canvas.style["width"] = "100%";
    //canvas.style["height"] = "100%";
    //canvas.style["z-index"] = 2;
    
    //this.g = canvas.getContext("2d");
    
    console.log(sarea, "SAREA!");
    
    this.screen.makeBorders();
    this._modal_dom_root = this.screen;
    
    this.screen.splitArea(this.screen.sareas[0], 0.333, false)
    this.screen.splitArea(this.screen.sareas[0], 0.333, true)
  }
  
  makeGUI() {
    this.gui = document.createElement("container-x")
    this.gui.ctx = this.ctx;
    this.gui.style["width"] = "300px";

    document.body.appendChild(this.gui);
    this.gui.float(300, 10, 1);
  }
  
  setsize() {
    var w = window.innerWidth, h = window.innerHeight;
    
    var eventfire = this.lastsize[0] != w || this.lastsize[1] != h;
    
    this.lastsize[0] = w;
    this.lastsize[1] = h;
    
    //if (this.canvas.width != w)
    //  this.canvas.width = w;
    //if (this.canvas.height != h)
    //  this.canvas.height = h;
    
    if (eventfire)
      this.screen.on_resize([w, h]);
  }
  
  draw() {
    if (this.canvas === undefined) {
      window.redraw_all();
      return;
    }
    
    this.setsize();

    this.screen.draw();
    
    //this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);

    //if (this.image !== undefined) {
    //  this.g.putImageData(this.image, 20, 20);
    //}

  }
  
  genFile() {
    return JSON.stringify(this);
  }
  
  save() {
    localStorage[STARTUP_FILE_NAME] = this.genFile();
  }
      
  load(buf) {
    buf = buf === undefined ?  localStorage[STARTUP_FILE_NAME] : buf;
    
    try {
      this.loadJSON(JSON.parse(buf));
      this.gui.load();
    } catch (error) {
      util.print_stack(error);
      
      console.warn("Failed to load start-up file");
      return false;
    }
    
    this.gui.update();
    return true;
  }
  
  toJSON() {
    return {
      version : cconst.APP_VERSION,
      config  : config
    };
  }
  
  loadJSON(obj) {
    
    //console.log(obj.config, "yay");
    
    if (obj.config !== undefined) {
      config.loadJSON(obj.config);
    }
    
    window.redraw_all();
    return this;
  }
  
  on_resize(newsize) {
    console.log("resize event");
    
    this.screen.on_resize(newsize);
  }
  
  on_mousedown(e) {
  }
  
  on_mousemove(e) {
  }
  
  on_mouseup(e) {
  }
  
  menuTest() {
    console.log("menu test!");
    
    let menu = document.createElement("menu-x");
    
    menu.addItem("one");
    menu.addItem("two");
    menu.addItem("three");
    menu.addItem("test");
    menu.addItem("Item");
    menu.addItem("Triangle");
    menu.addItem("Vertex");
    
    this.screen.appendChild(menu);
    let mpos = this.screen.mpos;
    let x = mpos[0], y = mpos[1];
    
    menu.start();
    menu.float(x, y, 50);
    return;
    
    let dpi = ui_base.UIBase.getDPI();
    let rect = menu.dom.getClientRects();
    let maxy = window.innerHeight - 10;
    let maxx = window.innerWidth - 10;
    
    console.log(rect.length > 0 ? rect[0] : undefined)
    
    if (rect.length > 0) {
      rect = rect[0];
      console.log(y + rect.height);
      if (y + rect.height > maxy) {
        console.log("greater");
        y = maxy - rect.height - 1;
      }
      
      if (x + rect.width > maxx) {
        console.log("greater");
        x = maxx - rect.width - 1;
      }
    }
    
    menu.float(x, y, 50);
  }
  
  on_tick() {
    this.setsize();
    
    /*
    if (util.time_ms() - this.last_save > 900) {
      console.log("autosaving");
      this.save();
      
      this.last_save = util.time_ms();
    }
    //*/
  }
  
  on_keydown(e) {
    console.log(e.keyCode);
    
    switch (e.keyCode) {
      case 87: //wkey
        this.menuTest();
        break;
      case 75: //kkey
        this.screen.splitTool();
        break;
      case 67: //ckey
        this.screen.areaDragTool();
        break;
      case 90: //zkey
        if (e.ctrlKey && e.shiftKey && !e.altKey) {
          this.toolstack.redo();
          window.redraw_all();
        } else if (e.ctrlKey && !e.altKey) {
          this.toolstack.undo();
          window.redraw_all();
        }
        break;
      case 89: //ykey
        if (e.ctrlKey && !e.shiftKey && !e.altKey) {
          this.toolstack.redo();
          window.redraw_all();
        }
        break;
    }
  }
}

export function start() {
  if (window._appstate !== undefined) { 
    //already initialized
    return;
  }
  
  window._appstate = new AppState();
  _appstate.makeScreen();
  
  //_appstate.pushModal(_appstate.screen, true);
  
  var animreq = undefined;
  function dodraw() {
    animreq = undefined;
    _appstate.draw();
  }
  
  window.redraw_all = function redraw_all() {
    if (animreq !== undefined) {
      return;
    }
    
    animreq = requestAnimationFrame(dodraw);
  }
  
  if (STARTUP_FILE_NAME in localStorage) {
    _appstate.load();
    window.redraw_all();
  }
  
  window.setInterval(function() {
    _appstate.on_tick();
  }, 250);
}
