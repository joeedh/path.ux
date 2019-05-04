"use sitrict";

let _ui_widgets = undefined;

define([
  "util", "vectormath", "ui_base", './icon_enum', 'events', './simple_toolsys',
  './toolprop'
], function(util, vectormath, ui_base, icon_enum, events, simple_toolsys, toolprop) {
  "use strict";
  
  let EnumProperty = toolprop.EnumProperty,
      PropTypes = toolprop.PropTypes;
  
  let exports = _ui_widgets = {};
  let UIBase = ui_base.UIBase, 
      PackFlags = ui_base.PackFlags,
      IconSheets = ui_base.IconSheets;
  
  function getpx(css) {
    return parseFloat(css.trim().replace("px", ""))
  }

  //use .setAttribute("linear") to disable nonlinear sliding
  let Button = exports.Button = class Button extends UIBase {
    constructor() {
      super();
        
      this.boxpad = ui_base.getDefault("BoxMargin", 4);
      let dpi = UIBase.getDPI();

      this.r = ui_base.getDefault("BoxRadius");
      this._name = "";
      this._namePad = undefined;
      
      this._last_dpi = dpi;
      
      this._lastw = undefined;
      this._lasth = undefined;
      
      this.dom = document.createElement("canvas");
      this.g = this.dom.getContext("2d");
      
      this.dom.setAttribute("class", "canvas1");
      this.dom.tabIndex = 0;
      
      this.addEventListener("keydown", (e) => {
        console.log(e.keyCode);
        
        switch (e.keyCode) {
          case 32: //spacebar
          case 13: //enter
            this.click();
            break;
        }
        
        e.preventDefault();
        e.stopPropagation();
      });
      
      this.addEventListener("focusin", () => {
        this._focus = 1;
        this._redraw();
        this.focus();
        console.log("focus2");
      });
      
      this.addEventListener("blur", () => {
        this._focus = 0;
        this._redraw();
        console.log("blur2");
      });
      
      //set default dimensions
      let width = ui_base.getDefault("numslider_width");
      let height = ui_base.getDefault("numslider_height");
      
      this.dom.style["width"] = width + "px";
      this.dom.style["height"] = height + "px";
      
      this.dom.width = Math.ceil(width*dpi); //getpx(this.dom.style["width"])*dpi;
      this.dom.height = Math.ceil(getpx(this.dom.style["height"])*dpi);
      
      let style = document.createElement("style")
      style.textContent = ui_base.getWidgetStyle("numslider-x", `.canvas1 {
        -moz-user-focus: normal;
        moz-user-focus: normal;
        user-focus: normal;
      }
      `);
      
      this.shadow.appendChild(style);
      let form = document.createElement("div");
      form.style["tabindex"] = 4;
      form.setAttribute("type", "hidden");
      form.type ="hidden";
      form.style["-moz-user-focus"] = "normal";
      form.setAttribute("class", "canvas1");
      form.appendChild(this.dom);
      
      this.shadow.appendChild(form);
      
      this.bindEvents();
      this._redraw();
    }
    
    setAttribute(key, val) {
      super.setAttribute(key, val);
      
      if (key == "name") {
        this.updateName();
        this.updateWidth();
      }
    }
    
    bindEvents() {
      let background = this.dom._background;
      let press = (e) => {
          background = this.dom._background;
          this.dom._background = ui_base.getDefault("BoxDepressed");
          this._redraw();
          
          if (this._onpress) {
            this._onpress(this);
          }
          
          e.preventDefault();
          e.stopPropagation();
      }
      
      let depress = (e) => {
          this.dom._background = background;
          this._redraw();
          
          e.preventDefault();
          e.stopPropagation();
          
          if (e.type == "mouseup" && this.button != 0) {
            return;
          }
          
          if (this.onclick) {
            this.onclick(this);
          }
      }
      
      this.addEventListener("mousedown", press, {captured : true, passive : false});
      this.addEventListener("touchstart", press, {captured : true, passive : false});
      
      this.addEventListener("touchend", depress);
      this.addEventListener("mouseup", depress);
      
      let holdbg = this.dom._background;
      
      this.addEventListener("mouseover", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        holdbg = this.dom._background;
        
        this.dom._background = ui_base.getDefault("BoxHighlight");
        this._repos_canvas();
        this._redraw();
      })
      
      this.addEventListener("mouseout", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        this.dom._background = holdbg; //ui_base.getDefault("BoxBG");
        this._repos_canvas();
        this._redraw();
      })
    }
    
    update() {
      this.updateWidth();
      this.updateDPI();
      this.updateName();
    }
    
    updateName() {
      let name = this.getAttribute("name");
      
      if (name !== this._name) {
        this._name = name;
        let dpi = UIBase.getDPI();
        
        let ts = ui_base.getDefault("DefaultTextSize");
        let tw = ui_base.measureText(this._genLabel(), this.dom, this.g).width/dpi + ts*2;
        
        if (this._namePad !== undefined) {
          tw += this._namePad;
        }
        
        let w = ui_base.getDefault("numslider_width");
        
        w = Math.max(w, tw);
        this.dom.style["width"] = w+"px";
        
        this._repos_canvas();
        this._redraw();
      }
    }
    
    updateWidth(w_add=0) {
      let dpi = UIBase.getDPI();
      
      let pack = this.packflag;
      
      if (this.parentNode !== undefined && (this.packflag & PackFlags.INHERIT_WIDTH)) {
        let p = this.parentNode;
        
        if (this._lastw != p.clientWidth + w_add) {
          console.log(p.clientWidth+w_add);
          
          this.dom.style["width"] = Math.ceil(p.clientWidth+w_add) + "px";
          this._lastw = p.clientWidth + w_add;
          
          this._repos_canvas();
        }
      }
    }
    
    _repos_canvas() {
      let dpi = UIBase.getDPI();
      
      this.dom.width = Math.ceil(getpx(this.dom.style["width"])*dpi);
      this.dom.height = Math.ceil(getpx(this.dom.style["height"])*dpi);
    }
    
    updateDPI() {
      let dpi = UIBase.getDPI();
      
      if (this._last_dpi != dpi) {
        console.log("update dpi", dpi);
        
        this._last_dpi = dpi;
        
        this.g.font = undefined; //reset font

        this._repos_canvas();        
        this._redraw();
      }
      
      if (this.style["background-color"]) {
        this.dom._background = this.style["background-color"];
        this.style["background-color"] = "";
      }
      
      //console.log(">", this.dom.style["background-color"], "-----");
      //console.log("width:", this.clientWidth)
    }
    
    _genLabel() {
      let text = "" + this._name;
      
      return text;
    }
    
    _redraw(draw_text=true) {
      //console.log("button draw");
      
      let dpi = UIBase.getDPI();
      
      ui_base.drawRoundBox(this.dom, this.g, undefined, undefined, this.r, undefined, undefined, this.boxpad);
      
      if (this._focus) {
        let w = this.dom.width, h = this.dom.height;
        let p = 1/dpi;
        
        //XXX remove this.g.translate lines after refactoring drawRoundBox, see comment in ui_base.js
        this.g.translate(p, p);
        let lw = this.g.lineWidth;
        this.g.lineWidth = 2*dpi;
        ui_base.drawRoundBox(this.dom, this.g, w-p*2, h-p*2, this.r, "stroke", ui_base.getDefault("BoxHighlight"));
        this.g.lineWidth = lw;
        this.g.translate(-p, -p);       
      }
      
      if (draw_text) {
        this._draw_text();
      }
    }
    
    _draw_text() {
      let dpi = UIBase.getDPI();
      
      let pad = ui_base.getDefault("BoxMargin") * dpi;
      let ts = ui_base.getDefault("DefaultTextSize");
      
      let text = this._genLabel();
      
      //console.log(text, "text", this._name);
      
      let tw = ui_base.measureText(text, this.dom, this.g).width;
      let cx = this.dom.width/2 - tw/2;
      let cy = this.dom.height;
      
      cx = ~~cx;
      
      ui_base.drawText(~~cx + 0.5, ~~(cy - ts*0.6*dpi) + 0.5, text, this.dom, this.g);
    }
    
    static define() {return {
      tagname : "button-x"
    };}
  }
  UIBase.register(Button);
  
  let ValueButtonBase = exports.ValueButtonBase = class ValueButtonBase extends Button {
    constructor() {
      super();
    }
    
    get value() {
      return this._value;
    }
    
    set value(val) {
      this._value = val;
      
      if (this.ctx && this.hasAttribute("datapath")) {
        this.ctx.setProp(this.getAttribute("datapath"), this._value);
      }
    }
    
    updateDataPath() {
      if (!this.hasAttribute("datapath")) return;
      if (this.ctx === undefined) return;
      
      let prop = this.ctx.getProp(this.getAttribute("datapath"));
      let val = prop[0]
      
      if (val !== this._value) {
        this._value = val;
        this.updateWidth();
        this._redraw();
      }
    }
    
    update() {
      this.updateDataPath();
      
      super.update();
    }
  }
  
  //use .setAttribute("linear") to disable nonlinear sliding
  let NumSlider = exports.NumSlider = class NumSlider extends ValueButtonBase {
    constructor() {
      super();
        
      this._name = "";
      this._step = 0.1;
      this._value = 0.0;
      
      this._redraw();
    }
    
    bindEvents() {
      this.addEventListener("mousedown", (e) => {
        if (e.button == 0 && e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          
          let tbox = document.createElement("textbox-x");
          tbox.text = this.value.toFixed(5);
          tbox.select();
          
          this.parentNode.insertBefore(tbox, this);
          //this.remove();
          this.hidden = true;
          //this.dom.hidden = true;
          
          let finish = (ok) => {
            tbox.remove();
            this.hidden = false;
            
            if (ok) {
              let val = parseFloat(tbox.text);
              
              if (isNaN(val)) {
                console.log("EEK!");
                this.flash(ui_base.ErrorColors.ERROR);
              } else {
                this.setValue(val);
                
                if (this.onchange !== undefined) {
                  this.onchange(this);
                }
              }
            }
          }
          
          tbox.addEventListener("keydown", (e) => {
            console.log(e.keyCode);
            switch (e.keyCode) {
              case 27: //escape
                finish(false);
                break;
              case 13: //enter
                finish(true);
                break;
            }
          });
          
          //this.shadow.appendChild(tbox);
          return;
        }
        
        if (e.button == 0) {
          this.dragStart(e);
          
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      this.addEventListener("touchstart", (e) => {
        console.log(e)
        
        e.x = e.touches[0].screenX;
        e.y = e.touches[0].screenY;
        
        this.dragStart(e);
        
        e.preventDefault();
        e.stopPropagation();
      }, {passive : false});
      
      //this.addEventListener("touchstart", (e) => {
      //  console.log(e);
      //});
      
      this.addEventListener("mouseover", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        this.dom._background = ui_base.getDefault("BoxHighlight");
        this._repos_canvas();
        this._redraw();
        //console.log("mouse enter");
      })
      
      this.addEventListener("mouseout", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        this.dom._background = ui_base.getDefault("BoxBG");
        this._repos_canvas();
        this._redraw();
        //console.log("mouse leave!");
      })
    }
    
    doRange() {
      if (this.hasAttribute("min")) {
        let min = this.getAttribute("min");
        this.value = Math.max(this.value, min);
      }
      
      if (this.hasAttribute("max")) {
        let max = this.getAttribute("max");
        this.value = Math.min(this.value, max);
      }
    }
    
    setValue(value) {
      this.value = value;
      this.doRange();
      
      this._redraw();
    }
    
    dragStart(e) {
      let last_background = this.dom._background;
      let cancel;
      
      let startvalue = this.value;
      let value = startvalue;
      
      let startx = e.x, starty = e.y;
      
      this.dom._background = ui_base.getDefault("BoxDepressed");
        
      let keydown = (e) => {
        switch (e.keyCode) {
          case 27: //escape key
            cancel(true);
          case 13: //enter key
            cancel(false);
            break;
        }
        
        e.preventDefault();
        e.stopPropagation();
      }
      
      let fire = () => {
        if (this.onchange) {
          this.onchange(this);
        }
      }
      
      let mousemove = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        let dx = e.x - startx;
        startx = e.x;
        
        if (e.shiftKey) {
          dx *= 0.1;
        }
        
        value += dx*this._step*0.1;
        
        let dvalue = value - startvalue;
        let dsign = Math.sign(dvalue);
        
        if (!this.hasAttribute("linear")) {
          dvalue = Math.pow(Math.abs(dvalue), 1.333)*dsign;
        }
        
        this.value = startvalue + dvalue;
        this.doRange();
        
        /*
        if (e.shiftKey) {
          dx *= 0.1;
          this.value = startvalue2 + dx*0.1*this._step;
          startvalue3 = this.value;
        } else {
          startvalue2 = this.value;
          this.value = startvalue3 + dx*0.1*this._step;
        }*/
        
        this.updateWidth();
        this._redraw();
        fire();
      }
      
      let mouseup = (e) => {
        cancel(false);
        e.preventDefault();
        e.stopPropagation();
      }
      
      let mouseout = (e) => {
        console.log("leave");
        last_background = ui_base.getDefault("BoxBG");
        
        e.preventDefault();
        e.stopPropagation();
      }
      
      let touchmove = (e) => {
        e.x = e.touches[0].screenX;
        e.y = e.touches[0].screenY;
        
        mousemove(e);
        
        //e.preventDefault();
        e.stopPropagation();
      }
      
      let touchend = (e) => {
        cancel(false);
        //e.preventDefault();
        e.stopPropagation();
      }
      
      let touchcancel = (e) => {
        cancel(true);
        //e.preventDefault();
        e.stopPropagation();
      }
      
      let mouseover = (e) => {
        console.log("over");
        last_background = ui_base.getDefault("BoxHighlight");
        
        e.preventDefault();
        e.stopPropagation();
      }
      
      let handlers = {
        on_keydown : keydown,
        on_mouseup : mouseup,
        on_mousedown : (e) => {
          if (this.popModal !== undefined) {
            this.popModal(); //popModal is added to handlers by events.pushModal()
          }
        },
        on_touchend : touchend,
        on_touchcancel : touchcancel,
        on_mousemove : mousemove
      }
      
      events.pushModal(_appstate.screen, handlers);
      
      cancel = (restore_value) => {
        if (restore_value) {
          this.value = startvalue;
          this.updateWidth();
          fire();
        }
        
        this.dom._background = last_background; //ui_base.getDefault("BoxBG");
        this._redraw();
        
        console.trace("end");
        
        //popModal is added to handlers by events.pushModal()
        handlers.popModal(); 
      }
      
      /*
      cancel = (restore_value) => {
        if (restore_value) {
          this.value = startvalue;
          this.updateWidth();
          fire();
        }
        
        this.dom._background = last_background; //ui_base.getDefault("BoxBG");
        this._redraw();
        
        console.trace("end");
        
        window.removeEventListener("keydown", keydown, true);
        window.removeEventListener("mousemove", mousemove, {captured : true, passive : false});
        
        window.removeEventListener("touchend", touchend, true);
        window.removeEventListener("touchmove", touchmove, {captured : true, passive : false});
        window.removeEventListener("touchcancel", touchcancel, true);
        window.removeEventListener("mouseup", mouseup, true);
        
        this.removeEventListener("mouseover", mouseover, true);
        this.removeEventListener("mouseout", mouseout, true);
      }
      
      window.addEventListener("keydown", keydown, true);
      window.addEventListener("mousemove", mousemove, true);
      window.addEventListener("touchend", touchend, true);
      window.addEventListener("touchmove", touchmove, {captured : true, passive : false});
      window.addEventListener("touchcancel", touchcancel, true);
      window.addEventListener("mouseup", mouseup, true);

      this.addEventListener("mouseover", mouseover, true);
      this.addEventListener("mouseout", mouseout, true);
      //*/
    }
    
    updateName() {
      let name = this.getAttribute("name");
      
      if (name !== this._name) {
        this._name = name;
        let dpi = UIBase.getDPI();
        
        let ts = ui_base.getDefault("DefaultTextSize");
        let tw = ui_base.measureText(this._genLabel(), this.dom, this.g).width/dpi + ts*2;
        
        let w = ui_base.getDefault("numslider_width");
        
        w = Math.max(w, tw);
        this.dom.style["width"] = w+"px";
        
        this._repos_canvas();
        this._redraw();
      }
    }
    
    _genLabel() {
      let val = this.value;
      
      val = val === undefined ? 0.0 : val;
      val = val.toFixed(3);
      
      let text = val;
      if (this._name) {
        text = this._name + ": " + text;
      }
      
      return text;
    }
    
    _redraw() {
      //console.log("numslider draw");
      
      let dpi = UIBase.getDPI();
      
      ui_base.drawRoundBox(this.dom, this.g);

      let r = ui_base.getDefault("BoxRadius") * dpi;
      let pad = ui_base.getDefault("BoxMargin") * dpi;
      let ts = ui_base.getDefault("DefaultTextSize");
      
      if (this.value !== undefined) {
        let text = this._genLabel();
        
        let dpi = UIBase.getDPI();
        
        let tw = ui_base.measureText(text, this.dom, this.g).width;
        let cx = this.dom.width/2 - tw/2;
        let cy = this.dom.height/2;
        
        ui_base.drawText(cx, cy + ts/2, text, this.dom, this.g);
      }
    }
    
    static define() {return {
      tagname : "numslider-x"
    };}
  }
  UIBase.register(NumSlider);
  
  let Check = exports.Check = class Check extends UIBase {
    constructor() {
      super();
      
      this._checked = false;
      
      let shadow = this.shadow;
      
      //let form = document.createElement("form");
      
      let span = document.createElement("span");
      span.setAttribute("class", "checkx");
      
      //span.style["background"] = ui_base.iconmanager.getCSS(1);

      let check = document.createElement("input");
      check.setAttribute("type", "checkbox");
      check.setAttribute("class", "checkx");
      check.setAttribute("id", check._id);
      check.setAttribute("name", check._id);
      
      check.addEventListener("click", (e) => {
        let val = check.checked;
        
        if (this.onclick) {
          this.onclick(val);
        }
        
        if (this.hasAttribute("datapath")) {
          UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), !!val);
        }
      });
      
      this.checkbox = check;
      
      span.appendChild(check);
      let label = this._label = document.createElement("label");
      
      label.setAttribute("for", check._id);
      label.setAttribute("class", "DefaultText");
      
      span.appendChild(label);
      
      let style = document.createElement("style");
      style.textContent = `
        .checkx {
          height: 25px;
          width: 25px;
          color : "${ui_base.getDefault("DefaultTextColor")}";
          border-radius: 50%;
        }
      `
//          background-color: #eee;
      
      //icontest 
      //form.appendChild(this.dom);
      //shadow.appendChild(form);
      shadow.appendChild(style);
      shadow.appendChild(span);
    }
    
    updateDataPath() {
      let val = !!UIBase.getPathValue(this.ctx, this.getAttribute("datapath"));
      if (!!this._checked != !!val) {
        this._checked = val;
        this.checkbox.checked = val;
      }
    }
    
    set checked(v) {
      if (!!this._checked != !!v) {
        this._checked = v;
        this.dom.checked = v;
      }
    }
    
    get checked() {
      return this._checked;
    }
    
    update() {
      if (this.hasAttribute("datapath")) {
        this.updateDataPath();
      }
    }
    
    get label() {
      return this._label.textContent;
    }
    
    set label(l) {
      this._label.textContent = l;
    }
    
    static define() {return {
      tagname : "check-x"
    };}
  }
  UIBase.register(Check);
  
  let IconCheck  = exports.IconCheck = class IconCheck extends Button {
    constructor() {
      super();
      
      this.boxpad = 1;
      this._checked = undefined;
      this.r = 5;
      this._icon = 0;
      this._icon_pressed = undefined;
      this.iconsheet = 0;
    }
    
    get icon() {
      return this._icon;
    }
    
    set icon(val) {
      this._icon = val;
      this._repos_canvas();
      this._redraw();
    }
    
    get checked() {
      return this._checked;
    }
    
    set checked(val) {
      if (!!val != !!this._checked) {
        this._checked = val;
        this._redraw();
      }
    }
    
    updateDataPath() {
      let val = !!UIBase.getPathValue(this.ctx, this.getAttribute("datapath"));
      
      if (!!val != !!this._checked) {
        this._checked = val;
        this._redraw();
      }
    }
    
    update() {
      if (this.description !== undefined && this.title != this.description) {
        this.title = this.description;
      }
      
      if (this.hasAttribute("datapath")) {
        this.updateDataPath();
      }
      
      super.update();
    }

    _getsize() {
      return ui_base.iconmanager.getTileSize(this.iconsheet);
    }
    
    _repos_canvas() {
      this.dom.style["height"] = this._getsize() + "px";
      this.dom.style["width"] = this._getsize() + "px";
      
      super._repos_canvas();
    }
    
    _onpress() {
      this.checked ^= 1;
      
      if (this.hasAttribute("datapath")) {
        UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), this.checked);
      }

      console.log("click!", this.checked);
      this._redraw();
    }
    
    _redraw() {
      this._repos_canvas();
      
      this.dom._background = this._checked ? ui_base.getDefault("BoxDepressed") : ui_base.getDefault("BoxBG");
      //
      super._redraw(false);
      let icon = this._icon;
      
      if (this._checked && this._icon_pressed !== undefined) {
        icon = this._icon_pressed;
      }
      
      ui_base.iconmanager.canvasDraw(this.dom, this.g, icon, undefined, undefined, this.iconsheet);
    }
    
    static define() {return {
      tagname : "iconcheck-x"
    };}
  }
  
  UIBase.register(IconCheck);
    
  let Check1 = exports.Check1 = class Check1 extends Button {
    constructor() {
      super();
      
      this._namePad = 40;
      this._value = undefined;
    }
    
    _redraw() {
      //console.log("button draw");
      
      let dpi = UIBase.getDPI();
      
      let box = 40;
      ui_base.drawRoundBox(this.dom, this.g, box);

      let r = ui_base.getDefault("BoxRadius") * dpi;
      let pad = ui_base.getDefault("BoxMargin") * dpi;
      let ts = ui_base.getDefault("DefaultTextSize");
      
      let text = this._genLabel();
      
      //console.log(text, "text", this._name);
      
      let tw = ui_base.measureText(text, this.dom, this.g).width;
      let cx = this.dom.width/2 - tw/2;
      let cy = this.dom.height/2;
      
      ui_base.drawText(box, cy + ts/2, text, this.dom, this.g);
    }

    static define() {return {
      tagname : "check1-x"
    };}
  }
  
  UIBase.register(Check1);

  let Menu = exports.Menu = class Menu extends UIBase {
      constructor() {
        super();
        
        this.items = [];
        
        this.itemindex = 0;
        this.closed = false;
        this.activeItem = undefined;
        
        //we have to make a container for any submenus to
        this.container = document.createElement("span");

        //this.container.style["background-color"] = "red";
        this.container.setAttribute("class", "menucon");
        
        this.dom = document.createElement("ul");
        this.dom.setAttribute("class", "menu");
/*
            place-items: start start;
            flex-wrap : nowrap;
            align-content : start;
            place-content : start;
            justify-content : start;
            
            align-items : start;
            place-items : start;
            justify-items : start;
*/        
        let style = document.createElement("style");
        style.textContent = `
          .menucon {
            position:absolute;
            float:left;
            
            display: block;
            -moz-user-focus: normal;
          }
          
          ul.menu {
            display : block;
            
            margin : 0px;
            padding : 0px;
            border-style : solid;
            border-width : 1px;
            border-color: grey;
            -moz-user-focus: normal;
            background-color: ${ui_base.getDefault("MenuBG")};
          }
          
          .menuitem {
            display : block;
            
            list-style-type:none;
            -moz-user-focus: normal;
            
            margin : 0;
            padding : 0px;
            padding-right: 24px;
            padding-left: 4px;
            padding-top : 4px;
            padding-bottom : 4px;
            font : ${ui_base._getFont()};
            background-color: ${ui_base.getDefault("MenuBG")};
          }
          
          .menuitem:focus {
            background-color: rgba(155, 220, 255, 1.0);
            -moz-user-focus: normal;
          }
        `;
        
        this.dom.setAttribute("tabindex", -1);
        
        this.dom.addEventListener("keydown", (e) => {
          console.log("key", e.keyCode);
          
          switch (e.keyCode) {
            case 38: //up
            case 40: //down
              let item = this.activeItem;
              if (!item) {
                item = this.dom.childNodes[0];
              }
              if (!item) {
                return;
              }
              
              console.log(item);
              let item2;
              
              if (e.keyCode == 38) {
                item2 = item.previousElementSibling;
              } else {
                item2 = item.nextElementSibling;
              }
              console.log("item2:", item2);
              
              if (item2) {
                this.activeItem = item2;
                
                item.blur();
                item2.focus();
              }
              break;
            case 13: //return key
            case 32: //space key
              this.click(this.activeItem);
            case 27: //escape key
              this.close();
          }
        }, false);
        
        this.container.addEventListener("mouseleave", (e) => {
          console.log("menu out");
          this.close();
        }, false);
        
        //this.container.appendChild(this.dom);
        
        this.shadow.appendChild(style);
        this.shadow.appendChild(this.container);
    }
  
    click() {
      if (this.activeItem == undefined)
        return;
      
      if (this.activeItem !== undefined && this.activeItem._isMenu)
        //ignore
        return;
      
      if (this.onselect) {
        try {
          console.log(this.activeItem._id, "-----");
          this.onselect(this.activeItem._id);
        } catch (error) {
          util.print_stack(error);
          console.log("Error in menu callback");
        }
      }
      
      console.log("menu select");
      this.close();
    }
    
    close() {
      //XXX
      //return;
      
      this.closed = true;
      console.log("menu close");
      
      this.remove();
      this.dom.remove();
      
      if (this.onclose) {
        this.onclose(this);
      }
    }
    
    static define() {return {
      tagname : "menu-x"
    };}
    
    start_fancy(prepend, setActive=true) {
      console.log("menu fancy start");
      
      let dom2 = document.createElement("div");
      //let dom2 = document.createElement("div");
      
      this.dom.setAttribute("class", "menu");
      dom2.setAttribute("class", "menu");
      
      let sbox = document.createElement("textbox-x");
      
      dom2.appendChild(sbox);
      dom2.appendChild(this.dom);
      
      dom2.style["height"] = "300px";
      this.dom.style["height"] = "300px";
      this.dom.style["overflow"] = "scroll";
      
      if (prepend) {
        this.container.prepend(dom2);
      } else {
        this.container.appendChild(dom2);
      }
      
      sbox.focus();
      sbox.onchange = () => {
        let t = sbox.text.trim().toLowerCase();
        
        console.log("applying search", t);
        
        for (let item of this.items) {
          item.remove();
        }
        
        for (let item of this.items) {
          let ok = t == "";
          ok = ok || item.innerHTML.toLowerCase().search(t) >= 0;
          
          if (ok) {
            this.dom.appendChild(item);
          }
          //item.hidden = !ok;
        }
      }
      
      sbox.addEventListener("keydown", (e) => {
        console.log(e.keyCode);
        switch (e.keyCode) {
          case 27: //escape key
            this.close();
            break;
          case 13: //enter key
            this.click(this.activeItem);
            this.close();
            break;
        }
      });
      
      if (!setActive)
        return;
    }
    
    start(prepend, setActive=true) {
      if (this.items.length > 10) {
        return this.start_fancy(prepend, setActive);
      }
      
      console.log("menu start");
      
      if (prepend) {
        this.container.prepend(this.dom);
      } else {
        this.container.appendChild(this.dom);
      }
      
      if (!setActive)
        return;
      
      window.setTimeout(() => {
        //select first child
        //TODO: cache last child entry
        
        if (this.activeItem === undefined) {
          this.activeItem = this.dom.childNodes[0];
        }
        
        if (this.activeItem === undefined) {
          return;
        }
        
        this.activeItem.focus();
      }, 0);
    }
    
    addItemExtra(text, id=undefined, hotkey, icon=-1, add=true) {
        let dom = document.createElement("span");
       
        hotkey = ""
        dom.style["display"] = "inline-flex";
        
        let icon_div;
        
        if (icon_div != -1) {
          icon_div = ui_base.makeIconDiv(icon, IconSheets.SHEET16);
        } else {
          let tilesize = ui_base.iconmanager.getTileSize(IconSheets.SHEET16);
          
          //tilesize *= window.devicePixelRatio;
          
          icon_div = document.createElement("span");
          icon_div.style["padding"] = icon_div.style["margin"] = "0px";
          icon_div.style["width"] = tilesize + "px";
          icon_div.style["height"] = tilesize + "px";
        }
        
        icon_div.style["display"] = "inline-flex";
        icon_div.style["margin-right"] = "15px";
        icon_div.style["align"] = "left";
        
        let span = document.createElement("span");
        
        //stupid css doesn't get width right. . .
        span.style["font"] = ui_base._getFont("DefaultText");
        let dpi = UIBase.getDPI();
        let tsize = ui_base.getDefault("DefaultTextSize");
        let twid = Math.ceil(text.length * tsize * 1.1);
        
        span.style["width"] = twid + "px";
        //span.style["padding"] = "50px"
        //span.style["margin"] = "50px"
        span.innerText = text;
        
        dom.style["width"] = "100%";
        
        dom.appendChild(icon_div);
        dom.appendChild(span);
        
        if (hotkey) {
          let hotkey_span = document.createElement("span");
          hotkey_span.innerText = hotkey;
          hotkey_span.style["margin-left"] = "24px";
          
          let al = "right";
          
          hotkey_span.style["font"] = ui_base._getFont("HotkeyText");
          hotkey_span.style["color"] = ui_base.getDefault("HotkeyTextColor");
          
          hotkey_span.style["width"] = "100%";
          hotkey_span.style["text-align"] = al;
          hotkey_span.style["flex-align"] = al;
          //hotkey_span.style["display"] = "inline";
          //hotkey_span.style["float"] = "right";
          hotkey_span["flex-wrap"] = "nowrap";
          
          dom.appendChild(hotkey_span);
        }
        
        return this.addItem(dom, id, add);
    }
    
    //item can be menu or text
    addItem(item, id, add=true) {
      id = id === undefined ? item : id;
      
      if (typeof item == "string" || item instanceof String) {
        let dom = document.createElement("dom");
        dom.textContent = item;
        item = dom;
        //return this.addItemExtra(item, id);
      }
      
      let li = document.createElement("li");
      
      li.setAttribute("tabindex", this.itemindex++);
      li.setAttribute("class", "menuitem");
      
      if (item instanceof Menu) {
        console.log("submenu!");

        let dom = this.addItemExtra(""+item.title, id, "", -1, false);
        
        //dom = document.createElement("div");
        //dom.innerText = ""+item.title;
        
        //dom.style["display"] = "inline-block";
        li.style["width"] = "100%"
        li.appendChild(dom);
        
        li._isMenu = true;
        li._menu = item;
        
        item.hidden = false;
        item.container = this.container;
      } else {
        li._isMenu = false;
        li.appendChild(item);
      }
      
      li._id = id;
      this.items.push(li);
      
      if (add) {
        li.addEventListener("click", (e) => {
          console.log("menu click!");
          
          if (this.activeItem !== undefined && this.activeItem._isMenu) {
            console.log("menu ignore");
            //ignore
            return;
          }
          
          this.click();
        });
        
        li.addEventListener("blur", (e) => {
          //console.log("blur", li.getAttribute("tabindex"));
          if (this.activeItem && !this.activeItem._isMenu) {
            this.activeItem = undefined;
          }
        });
        
        li.addEventListener("focus", (e) => {
          if (this.activeItem !== undefined && this.activeItem._isMenu) {
            let active = this.activeItem;
            
            window.setTimeout(() => {
              if (this.activeItem && this.activeItem !== active) {
                active._menu.close();
              }
            }, 500);
          }
          if (li._isMenu) {
            li._menu.start(false, false);
          }
          
          this.activeItem = li;
        })
        
        li.addEventListener("mouseenter", (e) => {
          //console.log("mouse over");
          li.focus();
        });
        
        this.dom.appendChild(li);
      }
      
      return li;
    }
    
    separator() {
      return this;
    }
    
    menu(title) {
      let ret = document.createElement("menu-x");
      
      ret.setAttribute("title", title);
      this.addItem(ret);
      
      return ret;
    }
  }
  UIBase.register(Menu);
  
  let DropBox = exports.DropBox = class DropBox extends Button {
    constructor() {
      super();
      
      this.r = 5;
      this._menu = undefined;
      //this.prop = new ui_base.EnumProperty(undefined, {}, "", "", 0);
      
      this.onclick = this._onclick.bind(this);
      this.updateWidth();
    }
    
    updateWidth() {
      //let ret = super.updateWidth(10);
      let dpi = UIBase.getDPI();
        
      let ts = ui_base.getDefault("DefaultTextSize");
      let tw = ui_base.measureText(this._genLabel(), this.dom, this.g).width/dpi + ts*2;
      tw = ~~tw;
      
      tw += 30;
      
      if (tw != this._last_w) {
        this._last_w = tw;
        this.dom.style["width"] = tw + "px";
        this._repos_canvas();
        this._redraw();
      }
      
      return 0;
    }
    
    
    updateDataPath() {
      if (this.ctx === undefined) {
        return;
      }
      
      let prop = UIBase.getPathMeta(this.ctx, this.getAttribute("datapath"));
      let val = UIBase.getPathValue(this.ctx, this.getAttribute("datapath"));
      
      if (prop === undefined) {
        return;
      }
      
      if (this.prop !== undefined) {
        prop = this.prop;
      }
      
      let name = prop.ui_value_names[prop.keys[val]];
      if (name != this.getAttribute("name")) {
        this.setAttribute("name", name);
        this.updateName();
      }
      
      //console.log(name, val);
    }
    
    update() {
      super.update();
      
      if (this.hasAttribute("datapath")) {
        this.updateDataPath();
      }
    }
    
    _build_menu() {
      let prop = this.prop;
      
      if (this.prop === undefined) {
        return;
      }
      
      if (this._menu !== undefined && this._menu.parentNode !== undefined) {
        this._menu.remove();
      }
      
      let menu = this._menu = document.createElement("menu-x");
      menu.setAttribute("title", name);
      
      let valmap = {};
      let enummap = prop.values;
      let iconmap = prop.iconmap;
      let uimap = prop.ui_value_names;
      
      console.log("   UIMAP", uimap);
      
      for (let k in enummap) {
        let uk = k;
        
        valmap[enummap[k]] = k;
        
        if (uimap !== undefined && k in uimap) {
          uk = uimap[k];
        }
        
        //menu.addItem(k, enummap[k], ":");
        if (iconmap && iconmap[k]) {
          menu.addItemExtra(uk, enummap[k], undefined, iconmap[k]);
        } else {
          menu.addItem(uk, enummap[k]);
        }
      }
      
      menu.onclose = () => {
        this._menu = undefined;
      }
      
      menu.onselect = (id) => {
        console.trace("got click!", id, ":::");
        
        this._menu = undefined;
        this.prop.setValue(id);
        
        this.setAttribute("name", this.prop.ui_value_names[valmap[id]]);
        if (this.onselect !== undefined) {
          this.onselect(id);
        }
        
        if (this.hasAttribute("datapath") && this.ctx) {
          UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), id);
        }
      };
    }
    
    _onclick(e) {
      console.log("menu dropbox click");
      
      if (this._menu !== undefined) {
        this._menu.close();
        this._menu = undefined;
        return;
      }
      
      this._build_menu();
      
      if (this._menu === undefined) {
        return;
      }
      
      let menu = this._menu;
      
      document.body.appendChild(menu);
      let dpi = UIBase.getDPI();
      
      let x = e.x, y = e.y;
      let rects = this.getClientRects();
      
      x = rects[0].x;
      y = rects[0].y + 10;//dpi + 20*dpi;//Math.ceil(150/dpi);
      
      menu.float(x, y, 8);
      
      menu.start();
    }
    
    _redraw() {
      super._redraw(false);
      
      let g = this.g;
      let w = this.dom.width, h = this.dom.height;
      
      let p = 10*UIBase.getDPI();
      let p2 = 4*UIBase.getDPI();
      
      g.fillStyle = "rgba(250, 250, 250, 0.7)";
      g.beginPath();
      g.rect(p2, p2, this.dom.width-p2 - h, this.dom.height-p2*2);
      g.fill();
      
      g.fillStyle = "rgba(50, 50, 50, 0.2)";
      g.strokeStyle = "rgba(50, 50, 50, 0.8)";
      g.beginPath();
      /*
      g.moveTo(w-p, p);
      g.lineTo(w-(p+h*0.25), h-p);
      g.lineTo(w-(p+h*0.5), p);
      g.closePath();
      //*/
      
      let sz = 0.3;
      g.moveTo(w-h*0.5-p, p);
      g.lineTo(w-p, p);
      g.moveTo(w-h*0.5-p, p+sz*h/3);
      g.lineTo(w-p, p+sz*h/3);
      g.moveTo(w-h*0.5-p, p+sz*h*2/3);
      g.lineTo(w-p, p+sz*h*2/3);
      
      g.lineWidth = 1;
      g.stroke();
      
      this._draw_text();
    }
    
    set menu(val) {
      this._menu = val;
      
      if (val !== undefined) {
        this._name = val.title;
        this.updateName();
      }
    }
    
    get menu() {
      return this._menu;
    }
    
    static define() {return {
      tagname : "dropbox-x"
    };}
  }
  
  UIBase.register(DropBox);
  
  let TextBox = exports.TextBox = class TextBox extends UIBase {
    constructor() {
      super();
      
      this.addEventListener("focusin", () => {
        this._focus = 1;
      });
      
      this.addEventListener("blur", () => {
        this._focus = 0;
      });
      
      let margin = Math.ceil(3 * UIBase.getDPI());
      
      this._had_error = false;
      
      this.decimalPlaces = 4;
      
      this.dom = document.createElement("input");
      this.dom.style["margin"] = margin + "px";
      this.dom.setAttribute("type", "textbox");
      this.dom.onchange = (e) => {
        this._change(this.dom.value);
      }
      
      this.radix = 16;
      
      this.dom.oninput = (e) => {
        this._change(this.dom.value);
      }
      
      this.shadow.appendChild(this.dom);
    }
    
    updateDataPath() {
      if (this.ctx === undefined) {
        return;
      }
      if (this._focus || this._flashtimer !== undefined || (this._had_error && this._focus)) {
        return;
      }
      
      let val = ui_base.UIBase.getPathValue(this.ctx, this.getAttribute("datapath"));
      if (val === undefined || val === null)
        return;
      
      let prop = ui_base.UIBase.getPathMeta(this.ctx, this.getAttribute("datapath"));
      
      let text = this.text;
      
      if (prop !== undefined && (prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
        let is_int = prop.type == PropTypes.INT;
        
        if (is_int) {
          this.radix = prop.radix;
          text = val.toString(this.radix);
          
          if (this.radix == 2) {
            text = "0b" + text;
          } else if (this.radix == 16) {
            text += "h";
          }
        } else {
          text = val.toFixed(this.decimalPlaces);
        }
      } else if (prop !== undefined && prop.type == PropTypes.STRING) {
        text = val;
      }
      
      if (this.text != text) {
        this.text = text;
      }
    }
    
    update() {
      if (this.hasAttribute("datapath")) {
        this.updateDataPath();
      }
    }
    
    select() {
      this.dom.select();
      //return this.dom.select.apply(this, arguments);
    }
    
    focus() {
      return this.dom.focus();
    }
    
    blur() {
      return this.dom.blur();
    }
    
    static define() {return {
      tagname : "textbox-x"
    };}
    
    get text() {
      return this.dom.value;
    }
    
    set text(value) {
      this.dom.value = value;
    }
    
    _prop_update(prop, text) {
      if ((prop.type == PropTypes.INT || prop.type == PropTypes.FLOAT)) {
        let val = parseFloat(this.text);
        
        if (!toolprop.isNumber(this.text.trim())) {
          this.flash(ui_base.ErrorColors.ERROR, this.dom);
          this.focus();
          this.dom.focus();
          this._had_error = true;
        } else {
          if (this._had_error) {
            this.flash(ui_base.ErrorColors.OK, this.dom);
          }
          
          this._had_error = false;
          ui_base.UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), val);
        }
      } else if (prop.type == PropTypes.STRING) {
          ui_base.UIBase.setPathValue(this.ctx, this.getAttribute("datapath"), this.text);
      }
    }
 
     
    _change(text) {
      //console.log("onchange", this.ctx, this, this.dom.__proto__, this.hasFocus);
      //console.log("onchange", this._focus);
      
      if (this.hasAttribute("datapath") && this.ctx !== undefined) {
        let prop = UIBase.getPathMeta(this.ctx, this.getAttribute("datapath"));
        //console.log(prop);
        if (prop) {
          this._prop_update(prop, text);
        }
      }
      
      if (this.onchange) {
        this.onchange(text);
      }
    }
  }
  
  UIBase.register(TextBox);
  
  return exports;
});
