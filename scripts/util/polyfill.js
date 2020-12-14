if (typeof window === "undefined" && typeof global !== "undefined") {
  global.window = global;
}

(function() {
  let visitgen = 0;

  window.destroyAllCSS = function() {
    visitgen++;

    let visit = (n) => {
      if (n.__visit === visitgen) {
        return;
      }

      n.__visit = visitgen;
      if (n.tagName === "STYLE") {
        n.textContents = '';
      }

      if (n.style) {
        for (let k in n.style) {
          try {
            n.style[k] = "";
          } catch (error) {
            
          }
        }
      }

      if (!n.childNodes) {
        return;
      }

      for (let c of n.childNodes) {
        visit(c);
      }
    }

    visit(document.head);
    visit(document.body);

    for (let sheet of document.styleSheets) {
      for (let i=0; i<sheet.rules.length; i++) {
        sheet.removeRule(sheet.rules[0]);
      }
    }
  }
})();

window.eventDebugModule = (function() {
  "use strict";

  return {
    start() {
      window.debugEventLists = {
      }
      window.debugEventList = [];

      this._addEventListener = EventTarget.prototype.addEventListener;
      this._removeEventListener = EventTarget.prototype.removeEventListener;
      this._dispatchEvent = EventTarget.prototype.dispatchEvent;
      
      EventTarget.prototype.addEventListener = this.onadd;
      EventTarget.prototype.removeEventListener = this.onrem;
      EventTarget.prototype.dispatchEvent = this.ondispatch;
    },

    add(type, data) {
      if (!(type in debugEventLists)) {
        debugEventLists[type] = [];
      }

      debugEventLists[type].push(data);
    },

    ondispatch() {
      let a = arguments;
      
      eventDebugModule.add("Dispatch", {
        event : a[0],
        thisvar : a[4],
        line : a[5],
        filename : a[6].replace(/\\/g, "/"),
        filepath : location.origin + a[6].replace(/\\/g, "/") + ":" + a[5],
        ownerpath : a[7]
      });

      return eventDebugModule._dispatchEvent.apply(this, arguments);
    },

    onadd() {
      let a = arguments;
      
      eventDebugModule.add("Add", {
        type : a[0],
        cb : a[1],
        args : a[2],
        thisvar : a[4],
        line : a[5],
        filename : a[6].replace(/\\/g, "/"),
        filepath : location.origin + a[6].replace(/\\/g, "/") + ":" + a[5],
        ownerpath : a[7]
      });
      

      return eventDebugModule._addEventListener.apply(this, arguments);
    },

    pruneConnected() {
      for (let k in debugEventLists) {
        let list = debugEventLists[k];

        for (let i=0; i<list.length; i++) {
          let e = list[i];

          if (!e.thisvar || !(e.thisvar instanceof Node)) {
            continue;
          }

          if (!e.thisvar.isConnected) {
            list[i] = list[list.length-1];
            list[list.length-1] = undefined;
            list.length--;
            i--;
          }
        }
      }
    },
    

    onrem() {
      let a = arguments;
      
      eventDebugModule.add("Rem", {
        type : a[0],
        cb : a[1],
        args : a[2],
        thisvar : a[4],
        line : a[5],
        filename : a[6].replace(/\\/g, "/"),
        filepath : location.origin + a[6].replace(/\\/g, "/") + ":" + a[5],
        ownerpath : a[7]
      });
      

      return eventDebugModule._removeEventListener.apply(this, arguments);
    }
  }
})();

if (typeof _debug_event_listeners !== "undefined" && _debug_event_listeners) {
  eventDebugModule.start();
}

/*
if (navigator.userAgent.toLowerCase().search("chrome") >= 0) {
  console.warn("Patching Google Chrome scrollbar bug");

  let cb = (e) => {
    if (e.touches.length == 1) {
      let e2 = Object.create(e);
      e2.pageX = e.touches[0].pageX;
      e2.pageY = e.touches[0].pageY;
      e2.x = e2.screenX = e2.pageX;
      e2.y = e2.screenY = e2.pageY;
      e2.button = 0;
      e2.buttons = 1;

      let type;
      if (e.type === "touchstart")
        type = "mousedown";
      else 
        type = "mousemove";

      console.log(e2);
        //console.log(e.target);
      e2 = new MouseEvent(type, e);
      e.target.dispatchEvent(e2);
    }
  };

  window.addEventListener("touchstart", (e) => cb(e));
  window.addEventListener("touchmove", (e) => cb(e));

  document.addEventListener("touchstart", (e) => cb(e));
  document.addEventListener("touchmove", (e) => cb(e));
}
//*/

if (window._disable_all_listeners) {
  console.warn("Disabling all event listeners");
  EventTarget.prototype.addEventListener = () => {};
  EventSource.prototype.addEventListener = () => {};
}

if (typeof visualViewport === "undefined") {
  (function() {
    class MyVisualViewport {
      get width() {
        return window.innerWidth;
      }
      get height() {
        return window.innerHeight;
      }

      get offsetLeft() {
        return 0;
      }
      get offsetTop() {
        return 0;
      }
      get pageLeft() {
        return 0;
      }
      get pageTop() {
        return 0;
      }
      get scale() {
        return 1.0;
      }
    }

    window.visualViewport = new MyVisualViewport();
  })();
}

if (Array.prototype.set === undefined) {
    Array.prototype.set = function set(array, src, dst, count) {
        src = src === undefined ? 0 : src;
        dst = dst === undefined ? 0 : dst;
        count = count === undefined ? array.length :  count;
        
        if (count < 0) {
            throw new RangeError("Count must be >= zero");
        }
        
        let len = Math.min(this.length-dst, array.length-src);
        len = Math.min(len, count);
        
        for (let i=0; i<len; i++) {
            this[dst+i] = array[src+i];
        }
        
        return this;
    }

    if (Float64Array.prototype.set === undefined) {
      Float64Array.prototype.set = Array.prototype.set;
      Float32Array.prototype.set = Array.prototype.set;
      Uint8Array.prototype.set = Array.prototype.set;
      Uint8ClampedArray.prototype.set = Array.prototype.set;
      Int32Array.prototype.set = Array.prototype.set;
      Int16Array.prototype.set = Array.prototype.set;
      Int8Array.prototype.set = Array.prototype.set;
    }
}

if (Array.prototype.reject === undefined) {
    Array.prototype.reject = function reject(func) {
        return this.filter((item) => !func(item));
    }
}

if (window.Symbol == undefined) { //eek!
  window.Symbol = {
    iterator : "$__iterator__$",
    keystr   : "$__keystr__$"
  }
} else if (Symbol.keystr === undefined) {
  Symbol.keystr = Symbol("keystr");
}

window.list = function list(iter) {
  var ret = [];
  
  if (typeof iter == "string") {
    iter = new String();
  }
  
  if (Symbol.iterator in iter) {
    for (var item of iter) {
      ret.push(item);
    }
  } else {
    iter.forEach(function(item) {
      ret.push(item);
    }, this);
  }
  
  return ret;
};

//XXX surely browser vendors have fixed this by now. . .
/*Override array iterator to not allocate too much*/

/*
function ArrayIter(array) {
  this.array = array;
  this.i = 0;
  this.ret = {done : false, value : undefined};
}

ArrayIter.prototype[Symbol.iterator] = function() {
  return this;
}

ArrayIter.prototype.next = function() {
  var ret = this.ret;
  
  if (this.i >= this.array.length) {
    ret.done = true;
    ret.value = undefined;
    return ret;
  }
  
  ret.value = this.array[this.i++];
  return ret;
};//*/


//Array.prototype[Symbol.iterator] = function() {
//  return new ArrayIter(this);
//}

if (Math.fract === undefined) {
  Math.fract = function fract(f) {
    return f - Math.floor(f);
  };
}

if (Math.tent === undefined) {
  Math.tent = function tent(f) {
    return 1.0 - Math.abs(Math.fract(f)-0.5)*2.0;
  };
}

if (Math.sign === undefined) {
  Math.sign = function sign(f) {
    return (f>0.0)*2.0-1.0;
  };
}

if (Array.prototype.pop_i == undefined) {
  Array.prototype.pop_i = function(idx) {
    if (idx < 0 || idx >= this.length) {
      throw new Error("Index out of range");
    }
    
    while (idx < this.length) {
      this[idx] = this[idx+1];
      idx++;
    }
    
    this.length -= 1;
  }
}

if (Array.prototype.remove === undefined) {
  Array.prototype.remove = function(item, suppress_error) {
    var i = this.indexOf(item);
    
    if (i < 0) {
      if (suppress_error)
        console.trace("Warning: item not in array", item);
      else
        throw new Error("Error: item not in array " + item);
      
      return;
    }
    
    this.pop_i(i);
  }
}

if (String.prototype.contains === undefined) {
  String.prototype.contains = function(substr) {
    return String.search(substr) >= 0;
  }
}

String.prototype[Symbol.keystr] = function() {
  return this;
};

Number.prototype[Symbol.keystr] = Boolean.prototype[Symbol.keystr] = function() {
  return ""+this;
};

Array.prototype[Symbol.keystr] = function() {
  let key = "";
  for (let item of this) {
    key += item[Symbol.keystr]() + ":";
  }

  return key;
};
