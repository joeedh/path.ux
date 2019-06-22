class Config {
  constructor() {
    this.EXAMPLE_PARAM = 128;
    this.EXAMPLE_OPTION = false;
    this.EXAMPLE_ENUM = 0;
  }
  
  copy() {
    let ret = JSON.parse(JSON.stringify(this));
    
    ret.copy = this.copy;
    ret.loadJSON = this.loadJSON;
    ret.toJSON = this.toJSON;
    
    return ret;
  }

  toJSON() {
    let ret = {};
    
    for (let k in this) {
      let v = this[k];
      
      if (typeof v != "function") {
        ret[k] = v;
      }
    }
    
    return ret;
  } 

  loadJSON(obj) {
    for (let k in obj) {
      let v = obj[k];
      
      if (typeof v == "function" || (typeof v == "object" && v.is_new_curve)) {
        continue;
      }
      
      if (!(k in this)) {
        console.log("unknown config key", k);
        continue;
      }
      
      this[k] = obj[k];
    }
    
    return this;
  }
}

var config = new Config();
export default config;
