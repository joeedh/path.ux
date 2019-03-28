var _config = undefined;

define([
], function() {
  'use strict';
  
  var exports = _config = {};
  
  exports.EXAMPLE_PARAM = 128;
  exports.EXAMPLE_OPTION = false;
  exports.EXAMPLE_ENUM = 0;
  
  exports.copy = function() {
    let ret = JSON.parse(JSON.stringify(this));
    
    ret.copy = this.copy;
    ret.loadJSON = this.loadJSON;
    ret.toJSON = this.toJSON;
    
    return ret;
  }
  
  exports.toJSON = function() {
    let ret = {};
    
    for (let k in this) {
      let v = this[k];
      
      if (typeof v != "function") {
        ret[k] = v;
      }
    }
    
    return ret;
  } 
  
  exports.loadJSON = function(obj) {
    for (let k in obj) {
      let v = obj[k];
      
      if (typeof v == "function" || (typeof v == "object" && v.is_new_curve)) {
        continue;
      }
      
      if (!(k in exports)) {
        console.log("unknown config key", k);
        continue;
      }
      
      this[k] = obj[k];
    }
    
    return this;
  }
  
  return exports;
});
