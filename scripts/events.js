"use strict";

import * as util from './util.js';

export function copyMouseEvent(e) {
  let ret = {};
  
  function bind(func, obj) {
    return function() {
      return this._orig.apply(func, arguments);
    }
  }
  
  let exclude = new Set([
    //"prototype",
    //"constructor",
    "__proto__"
  ]);
  
  ret._orig = e;
  
  for (let k in e) {
    let v = e[k];
    
    if (exclude.has(k)) {
      continue;
    }
    
    if (typeof v == "function") {
      v = bind(v);
    }
    
    ret[k] = v;
  }
  
  return ret;
}

export const DomEventTypes = {
  on_mousemove   : 'mousemove',
  on_mousedown   : 'mousedown',
  on_mouseup     : 'mouseup',
  on_touchstart  : 'touchstart',
  on_touchcancel : 'touchcanel',
  on_touchmove   : 'touchmove',
  on_touchend    : 'touchend',
  on_mousewheel  : 'mousewheel',
  on_keydown     : 'keydown',
  on_keyup       : 'keyup',
  //on_keypress    : 'keypress'
};

function getDom(dom, eventtype) {
  if (eventtype.startsWith("key"))
    return window;
  return dom;
}

export let modalStack = [];
export function isModalHead(owner) {
  return modalStack.length == 0 || 
         modalStack[modalStack.length-1] === owner;
}

export class EventHandler {
  pushModal(dom, _is_root) {
    if (!_is_root) {
      console.trace("pushModal called");
    }
    
    if (this.modal_pushed) {
      console.trace("Error: pushModal called twice", this, dom);
      return;
    }
    
    var this2 = this;
    
    this.modal_pushed = true;
    modalStack.push(this);
    
    let stop_prop = (func) => {
      return (e) => {
        //XXX this isModalHead call really shouldn't be necassary.  argh!
        if (!isModalHead(this))
          return;
        
        if (!_is_root) {
          e.stopPropagation();
          e.preventDefault();
        }
        
          func.call(this, e);
      }
    }
    
    for (var k in DomEventTypes) {
      var type = DomEventTypes[k];
      
      if (this[k] === undefined)
        continue;
      
      if (this["__"+k] === undefined) {
        this["__"+k] = stop_prop(this[k]);
      }
      
      getDom(dom, type).addEventListener(type, this["__"+k], true);
    }
  }
  
  popModal(dom) {
    console.trace("popModal called");
    
    var ok = modalStack[modalStack.length-1] === this;
    ok = ok && this.modal_pushed;
    
    if (!ok) {
      console.trace("Error: popModal called but pushModal wasn't", this, dom);
      return;
    }
    
    modalStack.pop();
    
    for (var k in DomEventTypes) {
      if (this["__"+k] === undefined)
        continue;

      var type = DomEventTypes[k];
      
      getDom(dom, type).removeEventListener(type, this["__"+k], true);
    }
    
    this.modal_pushed = false;
  }
}

export function pushModal(dom, handlers) {
  console.warn("Deprecated call to pathux.events.pushModal; use api in simple_events.js instead");
  let h = new EventHandler();
  
  for (let k in handlers) {
    h[k] = handlers[k];
  }
  
  handlers.popModal = () => {
    return h.popModal(dom);
  }
  
  h.pushModal(dom, false);
  
  return h;
}

export var keymap_latin_1 = {
  "Space": 32,
  "Escape" : 27,
  "Enter": 13,
  "Up" : 38,
  "Down" : 40,
  "Left": 37,
  "Right": 39,

  "Num0": 96,
  "Num1": 97,
  "Num2": 98,
  "Num3": 99,
  "Num4": 100,
  "Num5": 101,
  "Num6": 102,
  "Num7": 103,
  "Num8": 104,
  "Num9": 105,
  "Home": 36,
  "End": 35,
  "Delete": 46,
  "Backspace": 8,
  "Insert": 45,
  "PageUp": 33,
  "PageDown": 34,
  "Tab" : 9,
  "-" : 189,
  "=" : 187,
  "NumPlus" : 107,
  "NumMinus" : 109,
  "Shift" : 16,
  "Ctrl" : 17,
  "Control" : 17,
  "Alt" : 18
}

for (var i=0; i<26; i++) {
  keymap_latin_1[String.fromCharCode(i+65)] = i+65
}
for (var i=0; i<10; i++) {
  keymap_latin_1[String.fromCharCode(i+48)] = i+48
}

for (var k in keymap_latin_1) {
  keymap_latin_1[keymap_latin_1[k]] = k;
}

var keymap_latin_1_rev = {}
for (var k in keymap_latin_1) {
  keymap_latin_1_rev[keymap_latin_1[k]] = k
}

export var keymap = keymap_latin_1;
export var reverse_keymap = keymap_latin_1_rev;
