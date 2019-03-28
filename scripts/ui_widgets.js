"use strict";

let _ui_widgets = undefined;

define([
  "util", "vectormath", "ui_base", './icon_enum', 'events'
], function(util, vectormath, ui_base, icon_enum, events) {
  "use strict";
  
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
        
      this._name = "";
      this._namePad = undefined;
      
      let dpi = UIBase.getDPI();
      this._last_dpi = dpi;
      
      this._lastw = undefined;
      this._lasth = undefined;
      
      this.dom = document.createElement("canvas");
      this.g = this.dom.getContext("2d");
      
      this.dom.setAttribute("class", "canvas1");
      
      //set default dimensions
      let width = ui_base.getDefault("numslider_width");
      let height = ui_base.getDefault("numslider_height");
      
      this.dom.style["width"] = width + "px";
      this.dom.style["height"] = height + "px";
      
      this.dom.width = Math.ceil(width*dpi); //getpx(this.dom.style["width"])*dpi;
      this.dom.height = Math.ceil(getpx(this.dom.style["height"])*dpi);
      
      let style = document.createElement("style")
      style.textContent = ui_base.getWidgetStyle("numslider-x", `.canvas1 {
        
      }
      `);
      
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.dom);
      
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
      
      this.addEventListener("mouseover", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        this.dom._background = ui_base.getDefault("BoxHighlight");
        this._repos_canvas();
        this._redraw();
      })
      
      this.addEventListener("mouseout", (e) => {
        if (this.getAttribute("disabed")) 
          return;
        
        this.dom._background = ui_base.getDefault("BoxBG");
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
    
    updateWidth() {
      let dpi = UIBase.getDPI();
      
      let pack = this.packflag;
      
      if (this.parentNode !== undefined && (this.packflag & PackFlags.INHERIT_WIDTH)) {
        let p = this.parentNode;
        
        if (this._lastw != p.clientWidth) {
          console.log(p.clientWidth);
          
          this.dom.style["width"] = p.clientWidth + "px";
          this._lastw = p.clientWidth;
          
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
    
    _redraw() {
      //console.log("button draw");
      
      let dpi = UIBase.getDPI();
      
      ui_base.drawRoundBox(this.dom, this.g);

      let r = ui_base.getDefault("BoxRadius") * dpi;
      let pad = ui_base.getDefault("BoxMargin") * dpi;
      let ts = ui_base.getDefault("DefaultTextSize");
      
      let text = this._genLabel();
      
      //console.log(text, "text", this._name);
      
      let tw = ui_base.measureText(text, this.dom, this.g).width;
      let cx = this.dom.width/2 - tw/2;
      let cy = this.dom.height/2;
      
      ui_base.drawText(cx, cy + ts/2, text, this.dom, this.g);
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
          }
          
          ul.menu {
            display : block;
            
            margin : 0px;
            padding : 0px;
            border-style : solid;
            border-width : 1px;
            border-color: grey;
            background-color: ${ui_base.getDefault("MenuBG")};
          }
          
          .menuitem {
            display : block;
            
            list-style-type:none;
            
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
    }
    
    static define() {return {
      tagname : "menu-x"
    };}
    
    start(prepend, setActive=true) {
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
       
        hotkey = "ctrl-A"
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
        //let dom = document.createElement("dom");
        //dom.textContent = item;
        //item = dom;
        return this.addItemExtra(item);
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
          console.log(this.activeItem);
          console.log("focus", li.getAttribute("tabindex"));
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
      
      this._menu = undefined;
    }
    
    set menu(val) {
      this._menu = val;
      
      this._name = val.title;
      this.updateName();
    }
    
    get menu() {
      return this._menu;
    }
    
    static define() {return {
      tagname : "dropbox-x"
    };}
  }
  
  UIBase.register(DropBox);
  
  return exports;
});
