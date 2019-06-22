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
