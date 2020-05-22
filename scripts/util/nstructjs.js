(function () {
  if (typeof window === "undefined" && typeof global != "undefined") {
    global._nGlobal = global;
  } else if (typeof self !== "undefined") {
    self._nGlobal = self;
  } else {
    window._nGlobal = window;
  }
  
  let exports;
  
  //nodejs?
  if (typeof window === "undefined" && typeof global !== "undefined") {
    console.log("Nodejs!");
  } else {
    exports = {};
    _nGlobal.module = {};
  }
  
  
'use strict';

"use strict";

//zebra-style class system, see zebkit.org

function ClassGetter(func) {
  this.func = func;
}

function ClassSetter(func) {
  this.func = func;
}

var prototype_idgen = 1;
var defined_classes = [];

var StaticMethod = function StaticMethod(func) {
  this.func = func;
};

//parent is optional
var handle_statics = function (cls, methods, parent) {
  for (var i = 0; i < methods.length; i++) {
    var m = methods[i];

    if (m instanceof StaticMethod) {
      cls[m.func.name] = m.func;
    }
  }

  //inherit from parent too.
  //only inherit static methods added to parent with this module, though
  if (parent != undefined) {
    for (var k in parent) {
      var v = parent[k];

      if ((typeof v == "object" || typeof v == "function")
        && "_is_static_method" in v && !(k in cls)) {
        cls[k] = v;
      }
    }
  }
};

var Class = function Class(methods) {
  var construct = undefined;
  var parent = undefined;

  if (arguments.length > 1) {
    //a parent was passed in

    parent = methods;
    methods = arguments[1];
  }

  for (var i = 0; i < methods.length; i++) {
    var f = methods[i];

    if (f.name == "constructor") {
      construct = f;
      break;
    }
  }

  if (construct == undefined) {
    console.trace("Warning, constructor was not defined", methods);

    if (parent != undefined) {
      construct = function () {
        parent.apply(this, arguments);
      };
    } else {
      construct = function () {
      };
    }
  }

  if (parent != undefined) {
    construct.prototype = Object.create(parent.prototype);
  }

  construct.prototype.__prototypeid__ = prototype_idgen++;
  construct.__keystr__ = function () {
    return this.prototype.__prototypeid__;
  };

  construct.__parent__ = parent;
  construct.__statics__ = [];

  var getters = {};
  var setters = {};
  var getset = {};

  //handle getters/setters
  for (var i = 0; i < methods.length; i++) {
    var f = methods[i];
    if (f instanceof ClassSetter) {
      setters[f.func.name] = f.func;
      getset[f.func.name] = 1;
    } else if (f instanceof ClassGetter) {
      getters[f.func.name] = f.func;
      getset[f.func.name] = 1;
    }
  }

  for (var k in getset) {
    var def = {
      enumerable: true,
      configurable: true,
      get: getters[k],
      set: setters[k]
    };

    Object.defineProperty(construct.prototype, k, def);
  }

  handle_statics(construct, methods, parent);

  if (parent != undefined)
    construct.__parent__ = parent;

  for (var i = 0; i < methods.length; i++) {
    var f = methods[i];

    if (f instanceof StaticMethod || f instanceof ClassGetter || f instanceof ClassSetter)
      continue;

    construct.prototype[f.name] = f;
  }

  return construct;
};

Class.getter = function (func) {
  return new ClassGetter(func);
};
Class.setter = function (func) {
  return new ClassSetter(func);
};

Class.static_method = function (func) {
  func._is_static_method = true;

  return new StaticMethod(func);
};

var EmptySlot = {};

var set$1 = Class([
  function constructor(input) {
    this.items = [];
    this.keys = {};
    this.freelist = [];

    this.length = 0;

    if (input != undefined) {
      input.forEach(function (item) {
        this.add(item);
      }, this);
    }
  },

  function add(item) {
    var key = item.__keystr__();

    if (key in this.keys) return;

    if (this.freelist.length > 0) {
      var i = this.freelist.pop();

      this.keys[key] = i;
      items[i] = i;
    } else {
      var i = this.items.length;

      this.keys[key] = i;
      this.items.push(item);
    }

    this.length++;
  },

  function remove(item) {
    var key = item.__keystr__();

    if (!(key in this.keys)) {
      console.trace("Warning, item", item, "is not in set");
      return;
    }

    var i = this.keys[key];
    this.freelist.push(i);
    this.items[i] = EmptySlot;

    delete this.items[i];
    this.length--;
  },

  function has(item) {
    return item.__keystr__() in this.keys;
  },

  function forEach(func, thisvar) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];

      if (item === EmptySlot)
        continue;

      thisvar != undefined ? func.call(thisvar, time) : func(item);
    }
  }
]);

var struct_typesystem = /*#__PURE__*/Object.freeze({
  __proto__: null,
  defined_classes: defined_classes,
  Class: Class,
  set: set$1
});

var Class$1 = Class;
var _o_basic_types = {"String": 0, "Number": 0, "Array": 0, "Function": 0};

function isNodeJS() {
  ret = typeof process !== "undefined";
  ret = ret && process.release;
  ret = ret && process.release.name === "node";
  ret = ret && process.version;

  return !!ret;
}

let is_obj_lit = function is_obj_lit(obj) {
  if (typeof obj !== "object") {
    return false;
  }
  
  let good = obj.__proto__ && obj.__proto__.constructor && obj.__proto__.constructor === Object;

  if (good) {
    return true;
  }

  let bad = typeof obj !== "object";
  bad = bad || obj.constructor.name in _o_basic_types;
  bad = bad || obj instanceof String;
  bad = bad || obj instanceof Number;
  bad = bad || obj instanceof Boolean;
  bad = bad || obj instanceof Function;
  bad = bad || obj instanceof Array;
  bad = bad || obj instanceof Set;
  bad = bad || (obj.__proto__.constructor && obj.__proto__.constructor !== Object);

  return !bad;
};
_nGlobal.is_obj_lit = is_obj_lit;

function set_getkey(obj) {
  if (typeof obj == "number" || typeof obj == "boolean")
    return "" + obj;
  else if (typeof obj == "string")
    return obj;
  else
    return obj.__keystr__();
}

const _export_get_callstack_ = function get_callstack(err) {
  var callstack = [];
  var isCallstackPopulated = false;

  var err_was_undefined = err == undefined;

  if (err == undefined) {
    try {
      _idontexist.idontexist += 0; //doesn't exist- that's the point
    } catch (err1) {
      err = err1;
    }
  }

  if (err != undefined) {
    if (err.stack) { //Firefox
      var lines = err.stack.split('\n');
      var len = lines.length;
      for (var i = 0; i < len; i++) {
        if (1) {
          lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|");
          var l = lines[i].split("|");
          lines[i] = l[1] + ": " + l[0];
          lines[i] = lines[i].trim();
          callstack.push(lines[i]);
        }
      }

      //Remove call to printStackTrace()
      if (err_was_undefined) {
        //callstack.shift();
      }
      isCallstackPopulated = true;
    }
    else if (window.opera && e.message) { //Opera
      var lines = err.message.split('\n');
      var len = lines.length;
      for (var i = 0; i < len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i + 1]) {
            entry += ' at ' + lines[i + 1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to printStackTrace()
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
  }

  var limit = 24;
  if (!isCallstackPopulated) { //IE and Safari
    var currentFunction = arguments.callee.caller;
    var i = 0;
    while (currentFunction && i < 24) {
      var fn = currentFunction.toString();
      var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
      callstack.push(fname);
      currentFunction = currentFunction.caller;

      i++;
    }
  }

  return callstack;
};

const _export_print_stack_ = function print_stack(err) {
  try {
    var cs = _export_get_callstack_(err);
  } catch (err2) {
    console.log("Could not fetch call stack.");
    return;
  }

  console.log("Callstack:");
  for (var i = 0; i < cs.length; i++) {
    console.log(cs[i]);
  }
};

var set$2 = Class$1([
  function constructor(input) {
    this.items = [];
    this.keys = {};
    this.freelist = [];

    this.length = 0;

    if (input != undefined && input instanceof Array) {
      for (var i = 0; i < input.length; i++) {
        this.add(input[i]);
      }
    } else if (input != undefined && input.forEach != undefined) {
      input.forEach(function (item) {
        this.add(input[i]);
      }, this);
    }
  },
  function add(obj) {
    var key = set_getkey(obj);
    if (key in this.keys) return;

    if (this.freelist.length > 0) {
      var i = this.freelist.pop();
      this.keys[key] = i;
      this.items[i] = obj;
    } else {
      this.keys[key] = this.items.length;
      this.items.push(obj);
    }

    this.length++;
  },
  function remove(obj, raise_error) {
    var key = set_getkey(obj);

    if (!(keystr in this.keys)) {
      if (raise_error)
        throw new Error("Object not in set");
      else
        console.trace("Object not in set", obj);
      return;
    }

    var i = this.keys[keystr];

    this.freelist.push(i);
    this.items[i] = undefined;

    delete this.keys[keystr];
    this.length--;
  },

  function has(obj) {
    return set_getkey(obj) in this.keys;
  },

  function forEach(func, thisvar) {
    for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];

      if (item == undefined) continue;

      if (thisvar != undefined)
        func.call(thisvar, item);
      else
        func(item);
    }
  }
]);

var IDGen = Class$1([
  function constructor() {
    this.cur_id = 1;
  },

  function gen_id() {
    return this.cur_id++;
  },

  Class$1.static_method(function fromSTRUCT(reader) {
    var ret = new IDGen();
    reader(ret);
    return ret;
  })
]);

IDGen.STRUCT = [
  "struct_util.IDGen {",
  "  cur_id : int;",
  "}"
].join("\n");

var struct_util = /*#__PURE__*/Object.freeze({
  __proto__: null,
  is_obj_lit: is_obj_lit,
  get_callstack: _export_get_callstack_,
  print_stack: _export_print_stack_,
  set: set$2,
  IDGen: IDGen
});

const _module_exports_ = {};
_module_exports_.STRUCT_ENDIAN = true; //little endian

var Class$2 = Class;

var temp_dataview = new DataView(new ArrayBuffer(16));
var uint8_view = new Uint8Array(temp_dataview.buffer);

var unpack_context = _module_exports_.unpack_context = Class$2([
  function constructor() {
    this.i = 0;
  }
]);

var pack_byte = _module_exports_.pack_byte = function (array, val) {
  array.push(val);
};

var pack_bytes = _module_exports_.pack_bytes = function (array, bytes) {
  for (var i = 0; i < bytes.length; i++) {
    array.push(bytes[i]);
  }
};

var pack_int = _module_exports_.pack_int = function (array, val) {
  temp_dataview.setInt32(0, val, _module_exports_.STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
};

_module_exports_.pack_float = function (array, val) {
  temp_dataview.setFloat32(0, val, _module_exports_.STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
};

_module_exports_.pack_double = function (array, val) {
  temp_dataview.setFloat64(0, val, _module_exports_.STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
  array.push(uint8_view[4]);
  array.push(uint8_view[5]);
  array.push(uint8_view[6]);
  array.push(uint8_view[7]);
};

_module_exports_.pack_short = function (array, val) {
  temp_dataview.setInt16(0, val, _module_exports_.STRUCT_ENDIAN);

  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
};

var encode_utf8 = _module_exports_.encode_utf8 = function encode_utf8(arr, str) {
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);

    while (c != 0) {
      var uc = c & 127;
      c = c >> 7;

      if (c != 0)
        uc |= 128;

      arr.push(uc);
    }
  }
};

var decode_utf8 = _module_exports_.decode_utf8 = function decode_utf8(arr) {
  var str = "";
  var i = 0;

  while (i < arr.length) {
    var c = arr[i];
    var sum = c & 127;
    var j = 0;
    var lasti = i;

    while (i < arr.length && (c & 128)) {
      j += 7;
      i++;
      c = arr[i];

      c = (c & 127) << j;
      sum |= c;
    }

    if (sum == 0) break;

    str += String.fromCharCode(sum);
    i++;
  }

  return str;
};

var test_utf8 = _module_exports_.test_utf8 = function test_utf8() {
  var s = "a" + String.fromCharCode(8800) + "b";
  var arr = [];

  encode_utf8(arr, s);
  var s2 = decode_utf8(arr);

  if (s != s2) {
    throw new Error("UTF-8 encoding/decoding test failed");
  }

  return true;
};

function truncate_utf8(arr, maxlen) {
  var len = Math.min(arr.length, maxlen);

  var last_codepoint = 0;
  var last2 = 0;

  var incode = false;
  var i = 0;
  var code = 0;
  while (i < len) {
    incode = arr[i] & 128;

    if (!incode) {
      last2 = last_codepoint + 1;
      last_codepoint = i + 1;
    }

    i++;
  }

  if (last_codepoint < maxlen)
    arr.length = last_codepoint;
  else
    arr.length = last2;

  return arr;
}

var _static_sbuf_ss = new Array(2048);
var pack_static_string = _module_exports_.pack_static_string = function pack_static_string(data, str, length) {
  if (length == undefined)
    throw new Error("'length' paremter is not optional for pack_static_string()");

  var arr = length < 2048 ? _static_sbuf_ss : new Array();
  arr.length = 0;

  encode_utf8(arr, str);
  truncate_utf8(arr, length);

  for (var i = 0; i < length; i++) {
    if (i >= arr.length) {
      data.push(0);
    } else {
      data.push(arr[i]);
    }
  }
};

var _static_sbuf = new Array(32);

/*strings are packed as 32-bit unicode codepoints*/
var pack_string = _module_exports_.pack_string = function pack_string(data, str) {
  _static_sbuf.length = 0;
  encode_utf8(_static_sbuf, str);

  pack_int(data, _static_sbuf.length);

  for (var i = 0; i < _static_sbuf.length; i++) {
    data.push(_static_sbuf[i]);
  }
};

var unpack_bytes = _module_exports_.unpack_bytes = function unpack_bytes(dview, uctx, len) {
  var ret = new DataView(dview.buffer.slice(uctx.i, uctx.i + len));
  uctx.i += len;

  return ret;
};

var unpack_byte = _module_exports_.unpack_byte = function (dview, uctx) {
  return dview.getUint8(uctx.i++);
};

var unpack_int = _module_exports_.unpack_int = function (dview, uctx) {
  uctx.i += 4;
  return dview.getInt32(uctx.i - 4, _module_exports_.STRUCT_ENDIAN);
};

_module_exports_.unpack_float = function (dview, uctx) {
  uctx.i += 4;
  return dview.getFloat32(uctx.i - 4, _module_exports_.STRUCT_ENDIAN);
};

_module_exports_.unpack_double = function (dview, uctx) {
  uctx.i += 8;
  return dview.getFloat64(uctx.i - 8, _module_exports_.STRUCT_ENDIAN);
};

_module_exports_.unpack_short = function (dview, uctx) {
  uctx.i += 2;
  return dview.getInt16(uctx.i - 2, _module_exports_.STRUCT_ENDIAN);
};

var _static_arr_us = new Array(32);
_module_exports_.unpack_string = function (data, uctx) {
  var str = "";

  var slen = unpack_int(data, uctx);
  var arr = slen < 2048 ? _static_arr_us : new Array(slen);

  arr.length = slen;
  for (var i = 0; i < slen; i++) {
    arr[i] = unpack_byte(data, uctx);
  }

  return decode_utf8(arr);
};

var _static_arr_uss = new Array(2048);
_module_exports_.unpack_static_string = function unpack_static_string(data, uctx, length) {
  var str = "";

  if (length == undefined)
    throw new Error("'length' cannot be undefined in unpack_static_string()");

  var arr = length < 2048 ? _static_arr_uss : new Array(length);
  arr.length = 0;

  var done = false;
  for (var i = 0; i < length; i++) {
    var c = unpack_byte(data, uctx);

    if (c == 0) {
      done = true;
    }

    if (!done && c != 0) {
      arr.push(c);
      //arr.length++;
    }
  }

  truncate_utf8(arr, length);
  return decode_utf8(arr);
};

let _export_parser_;
"use strict";

var t;

var Class$3 = Class;

const _export_token_ = class token {
  constructor(type, val, lexpos, lineno, lexer, parser) {
    this.type = type;
    this.value = val;
    this.lexpos = lexpos;
    this.lineno = lineno;
    this.lexer = lexer;
    this.parser = parser;
  }

  toString() {
    if (this.value != undefined)
      return "token(type=" + this.type + ", value='" + this.value + "')";
    else
      return "token(type=" + this.type + ")";
  }
};

const _export_tokdef_ = class tokdef {
  constructor(name, regexpr, func) {
    this.name = name;
    this.re = regexpr;
    this.func = func;
  }
};

var PUTIL_ParseError = class PUTIL_ParseError extends Error {
  constructor(msg) {
    Error.call(this);
  }
};

const _export_lexer_ = class lexer {
  constructor(tokdef, errfunc) {
    this.tokdef = tokdef;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.lineno = 0;
    this.errfunc = errfunc;
    this.tokints = {};
    for (var i = 0; i < tokdef.length; i++) {
      this.tokints[tokdef[i].name] = i;
    }
    this.statestack = [["__main__", 0]];
    this.states = {"__main__": [tokdef, errfunc]};
    this.statedata = 0;
  }

  add_state(name, tokdef, errfunc) {
    if (errfunc == undefined) {
      errfunc = function (lexer) {
        return true;
      };
    }
    this.states[name] = [tokdef, errfunc];
  }

  tok_int(name) {
  }

  push_state(state, statedata) {
    this.statestack.push([state, statedata]);
    state = this.states[state];
    this.statedata = statedata;
    this.tokdef = state[0];
    this.errfunc = state[1];
  }

  pop_state() {
    var item = this.statestack[this.statestack.length - 1];
    var state = this.states[item[0]];
    this.tokdef = state[0];
    this.errfunc = state[1];
    this.statedata = item[1];
  }

  input(str) {
    while (this.statestack.length > 1) {
      this.pop_state();
    }
    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = new Array();
    this.peeked_tokens = [];
  }

  error() {
    if (this.errfunc != undefined && !this.errfunc(this))
      return;

    console.log("Syntax error near line " + this.lineno);

    var next = Math.min(this.lexpos + 8, this.lexdata.length);
    console.log("  " + this.lexdata.slice(this.lexpos, next));

    throw new PUTIL_ParseError("Parse error");
  }

  peek() {
    var tok = this.next(true);
    if (tok == undefined)
      return undefined;
    this.peeked_tokens.push(tok);
    return tok;
  }

  peeknext() {
    if (this.peeked_tokens.length > 0) {
      return this.peeked_tokens[0];
    }

    return this.peek();
  }

  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length == 0;
  }

  //ignore_peek is optional, false
  next(ignore_peek) {
    if (!ignore_peek && this.peeked_tokens.length > 0) {
      var tok = this.peeked_tokens[0];
      this.peeked_tokens.shift();
      return tok;
    }

    if (this.lexpos >= this.lexdata.length)
      return undefined;

    var ts = this.tokdef;
    var tlen = ts.length;
    var lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
    var results = [];

    for (var i = 0; i < tlen; i++) {
      var t = ts[i];
      if (t.re == undefined)
        continue;
      var res = t.re.exec(lexdata);
      if (res != null && res != undefined && res.index == 0) {
        results.push([t, res]);
      }
    }

    var max_res = 0;
    var theres = undefined;
    for (var i = 0; i < results.length; i++) {
      var res = results[i];
      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }

    if (theres == undefined) {
      this.error();
      return;
    }

    var def = theres[0];
    var token = new _export_token_(def.name, theres[1][0], this.lexpos, this.lineno, this, undefined);
    this.lexpos += token.value.length;

    if (def.func) {
      token = def.func(token);
      if (token == undefined) {
        return this.next();
      }
    }

    return token;
  }
};

const parser = _export_parser_ = class parser {
  constructor(lexer, errfunc) {
    this.lexer = lexer;
    this.errfunc = errfunc;
    this.start = undefined;
  }

  parse(data, err_on_unconsumed) {
    if (err_on_unconsumed == undefined)
      err_on_unconsumed = true;

    if (data != undefined)
      this.lexer.input(data);

    var ret = this.start(this);

    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() != undefined) {
      this.error(undefined, "parser did not consume entire input");
    }
    return ret;
  }

  input(data) {
    this.lexer.input(data);
  }

  error(token, msg) {
    if (msg == undefined)
      msg = "";
    if (token == undefined)
      var estr = "Parse error at end of input: " + msg;
    else
      estr = "Parse error at line " + (token.lineno + 1) + ": " + msg;
    var buf = "1| ";
    var ld = this.lexer.lexdata;
    var l = 1;
    for (var i = 0; i < ld.length; i++) {
      var c = ld[i];
      if (c == '\n') {
        l++;
        buf += "\n" + l + "| ";
      }
      else {
        buf += c;
      }
    }
    console.log("------------------");
    console.log(buf);
    console.log("==================");
    console.log(estr);
    if (this.errfunc && !this.errfunc(token)) {
      return;
    }
    throw new PUTIL_ParseError(estr);
  }

  peek() {
    var tok = this.lexer.peek();
    if (tok != undefined)
      tok.parser = this;
    return tok;
  }

  peeknext() {
    var tok = this.lexer.peeknext();
    if (tok != undefined)
      tok.parser = this;
    return tok;
  }

  next() {
    var tok = this.lexer.next();
    if (tok != undefined)
      tok.parser = this;
    return tok;
  }

  optional(type) {
    var tok = this.peek();
    if (tok == undefined)
      return false;
    if (tok.type == type) {
      this.next();
      return true;
    }
    return false;
  }

  at_end() {
    return this.lexer.at_end();
  }

  expect(type, msg) {
    var tok = this.next();
    if (msg == undefined)
      msg = type;
    if (tok == undefined || tok.type != type) {
      this.error(tok, "Expected " + msg);
    }
    return tok.value;
  }
};

function test_parser() {
  var basic_types = new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string"]);
  var reserved_tokens = new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string", "static_string", "array"]);

  function tk(name, re, func) {
    return new _export_tokdef_(name, re, func);
  }

  var tokens = [tk("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function (t) {
    if (reserved_tokens.has(t.value)) {
      t.type = t.value.toUpperCase();
    }
    return t;
  }), tk("OPEN", /\{/), tk("CLOSE", /}/), tk("COLON", /:/), tk("JSCRIPT", /\|/, function (t) {
    var js = "";
    var lexer = t.lexer;
    while (lexer.lexpos < lexer.lexdata.length) {
      var c = lexer.lexdata[lexer.lexpos];
      if (c == "\n")
        break;
      js += c;
      lexer.lexpos++;
    }
    if (js.endsWith(";")) {
      js = js.slice(0, js.length - 1);
      lexer.lexpos--;
    }
    t.value = js;
    return t;
  }), tk("LPARAM", /\(/), tk("RPARAM", /\)/), tk("COMMA", /,/), tk("NUM", /[0-9]/), tk("SEMI", /;/), tk("NEWLINE", /\n/, function (t) {
    t.lexer.lineno += 1;
  }), tk("SPACE", / |\t/, function (t) {
  })];
  var __iter_rt = __get_iter(reserved_tokens);
  var rt;
  while (1) {
    var __ival_rt = __iter_rt.next();
    if (__ival_rt.done) {
      break;
    }
    rt = __ival_rt.value;
    tokens.push(tk(rt.toUpperCase()));
  }
  var a = "\n  Loop {\n    eid : int;\n    flag : int;\n    index : int;\n    type : int;\n\n    co : vec3;\n    no : vec3;\n    loop : int | eid(loop);\n    edges : array(e, int) | e.eid;\n\n    loops : array(Loop);\n  }\n  ";

  function errfunc(lexer) {
    return true;
  }

  var lex = new _export_lexer_(tokens, errfunc);
  console.log("Testing lexical scanner...");
  lex.input(a);
  var token;
  while (token = lex.next()) {
    console.log(token.toString());
  }
  var parser = new _export_parser_(lex);
  parser.input(a);

  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    var arraytype = p_Type(p);
    var itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype;
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return {type: "array", data: {type: arraytype, iname: itername}}
  }

  function p_Type(p) {
    var tok = p.peek();
    if (tok.type == "ID") {
      p.next();
      return {type: "struct", data: "\"" + tok.value + "\""}
    }
    else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return {type: tok.type.toLowerCase()}
    }
    else if (tok.type == "ARRAY") {
      return p_Array(p);
    }
    else {
      p.error(tok, "invalid type " + tok.type);
    }
  }

  function p_Field(p) {
    var field = {};
    console.log("-----", p.peek().type);
    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");
    field.type = p_Type(p);
    field.set = undefined;
    field.get = undefined;
    var tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.get = tok.value;
      p.next();
    }
    tok = p.peek();
    if (tok.type == "JSCRIPT") {
      field.set = tok.value;
      p.next();
    }
    p.expect("SEMI");
    return field;
  }

  function p_Struct(p) {
    var st = {};
    st.name = p.expect("ID", "struct name");
    st.fields = [];
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(undefined);
      }
      else if (p.optional("CLOSE")) {
        break;
      }
      else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }

  var ret = p_Struct(parser);
  console.log(JSON.stringify(ret));
}

var struct_parseutil = /*#__PURE__*/Object.freeze({
  __proto__: null,
  get parser () { return _export_parser_; },
  token: _export_token_,
  tokdef: _export_tokdef_,
  PUTIL_ParseError: PUTIL_ParseError,
  lexer: _export_lexer_
});

"use strict";

//the discontinuous id's are to make sure
//the version I originally wrote (which had a few application-specific types)
//and this one do not become totally incompatible.
var StructEnum = {
  T_INT    : 0,
  T_FLOAT  : 1,
  T_DOUBLE : 2,
  T_STRING : 7,
  T_STATIC_STRING : 8, //fixed-length string
  T_STRUCT : 9, 
  T_TSTRUCT : 10,
  T_ARRAY   : 11,
  T_ITER    : 12,
  T_SHORT   : 13,
  T_BYTE    : 14,
  T_BOOL    : 15
};

var StructTypes = {
  "int": StructEnum.T_INT, 
  "float": StructEnum.T_FLOAT, 
  "double": StructEnum.T_DOUBLE, 
  "string": StructEnum.T_STRING,
  "static_string": StructEnum.T_STATIC_STRING, 
  "struct": StructEnum.T_STRUCT, 
  "abstract": StructEnum.T_TSTRUCT, 
  "array": StructEnum.T_ARRAY, 
  "iter": StructEnum.T_ITER,
  "short": StructEnum.T_SHORT,
  "byte": StructEnum.T_BYTE,
  "bool": StructEnum.T_BOOL
};

var StructTypeMap = {};

for (var k in StructTypes) {
  StructTypeMap[StructTypes[k]] = k;
}

function gen_tabstr(t) {
  var s="";
  for (var i=0; i<t; i++) {
      s+="  ";
  }
  return s;
}

function StructParser() {
  var basic_types=new set$2([
    "int", "float", "double", "string", "short", "byte", "bool"
  ]);
  
  var reserved_tokens=new set$2([
    "int", "float", "double", "string", "static_string", "array", 
    "iter", "abstract", "short", "byte", "bool"
  ]);

  function tk(name, re, func) {
    return new _export_tokdef_(name, re, func);
  }
  
  var tokens=[
    tk("ID", /[a-zA-Z_]+[a-zA-Z0-9_\.]*/, function(t) {
      if (reserved_tokens.has(t.value)) {
          t.type = t.value.toUpperCase();
      }
      return t;
    }), tk("OPEN", /\{/), 
    tk("EQUALS", /=/), 
    tk("CLOSE", /}/), 
    tk("COLON", /:/), 
    tk("SOPEN", /\[/), 
    tk("SCLOSE", /\]/), 
    tk("JSCRIPT", /\|/, function(t) {
      var js="";
      var lexer=t.lexer;
      while (lexer.lexpos<lexer.lexdata.length) {
        var c=lexer.lexdata[lexer.lexpos];
        if (c=="\n")
          break;
        js+=c;
        lexer.lexpos++;
      }
      if (js.endsWith(";")) {
          js = js.slice(0, js.length-1);
          lexer.lexpos--;
      }
      t.value = js.trim();
      return t;
    }), 
    tk("LPARAM", /\(/), 
    tk("RPARAM", /\)/), 
    tk("COMMA", /,/), 
    tk("NUM", /[0-9]+/), 
    tk("SEMI", /;/), 
    tk("NEWLINE", /\n/, function(t) {
      t.lexer.lineno+=1;
    }),
    tk("SPACE", / |\t/, function(t) {
    })
  ];
  
  reserved_tokens.forEach(function(rt) {
    tokens.push(tk(rt.toUpperCase()));
  });
  
  function errfunc(lexer) {
    return true;
  }
  
  var lex=new _export_lexer_(tokens, errfunc);
  var parser=new _export_parser_(lex);
  
  function p_Static_String(p) {
    p.expect("STATIC_STRING");
    p.expect("SOPEN");
    var num=p.expect("NUM");
    p.expect("SCLOSE");
    return {type: StructEnum.T_STATIC_STRING, data: {maxlength: num}}
  }
  
  function p_DataRef(p) {
    p.expect("DATAREF");
    p.expect("LPARAM");
    var tname=p.expect("ID");
    p.expect("RPARAM");
    return {type: StructEnum.T_DATAREF, data: tname}
  }
  
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    var arraytype=p_Type(p);
    
    var itername="";
    if (p.optional("COMMA")) {
        itername = arraytype.data.replace(/"/g, "");
        arraytype = p_Type(p);
    }
    
    p.expect("RPARAM");
    return {type: StructEnum.T_ARRAY, data: {type: arraytype, iname: itername}}
  }
  
  function p_Iter(p) {
    p.expect("ITER");
    p.expect("LPARAM");
    var arraytype=p_Type(p);
    var itername="";
    
    if (p.optional("COMMA")) {
        itername = arraytype.data.replace(/"/g, "");
        arraytype = p_Type(p);
    }
    
    p.expect("RPARAM");
    return {type: StructEnum.T_ITER, data: {type: arraytype, iname: itername}}
  }
  
  function p_Abstract(p) {
    p.expect("ABSTRACT");
    p.expect("LPARAM");
    var type=p.expect("ID");
    p.expect("RPARAM");
    return {type: StructEnum.T_TSTRUCT, data: type}
  }
  
  function p_Type(p) {
    var tok=p.peek();
    
    if (tok.type=="ID") {
        p.next();
        return {type: StructEnum.T_STRUCT, data: tok.value}
    } else if (basic_types.has(tok.type.toLowerCase())) {
        p.next();
        return {type: StructTypes[tok.type.toLowerCase()]}
    } else if (tok.type=="ARRAY") {
        return p_Array(p);
    } else if (tok.type=="ITER") {
        return p_Iter(p);
    } else if (tok.type=="STATIC_STRING") {
        return p_Static_String(p);
    } else if (tok.type=="ABSTRACT") {
        return p_Abstract(p);
    } else if (tok.type=="DATAREF") {
        return p_DataRef(p);
    } else {
      p.error(tok, "invalid type "+tok.type);
    }
  }
  
  function p_ID_or_num(p) {
    let t = p.peeknext();

    if (t.type == "NUM") {
      p.next();
      return t.value;
    } else {
      return p.expect("ID", "struct field name");
    }
  }
  
  function p_Field(p) {
    var field={};
    
    field.name = p_ID_or_num(p);
    p.expect("COLON");
    
    field.type = p_Type(p);
    field.set = undefined;
    field.get = undefined;
    
    var tok=p.peek();
    if (tok.type=="JSCRIPT") {
        field.get = tok.value;
        p.next();
    }
    
    tok = p.peek();
    if (tok.type=="JSCRIPT") {
        field.set = tok.value;
        p.next();
    }
    
    p.expect("SEMI");
    return field;
  }
  
  function p_Struct(p) {
    var st={};
    
    st.name = p.expect("ID", "struct name");
    
    st.fields = [];
    st.id = -1;
    var tok=p.peek();
    var id=-1;
    if (tok.type=="ID"&&tok.value=="id") {
        p.next();
        p.expect("EQUALS");
        st.id = p.expect("NUM");
    }
    
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
          p.error(undefined);
      }
      else 
        if (p.optional("CLOSE")) {
          break;
      }
      else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  parser.start = p_Struct;
  return parser;
}

const _export_struct_parse_ = StructParser();

var struct_parser = /*#__PURE__*/Object.freeze({
  __proto__: null,
  StructEnum: StructEnum,
  StructTypes: StructTypes,
  StructTypeMap: StructTypeMap,
  struct_parse: _export_struct_parse_
});

let _export_manager_;
"use strict";

let warninglvl = 2;

/*

class SomeClass {
  static newSTRUCT() {
    //returns a new, empty instance of SomeClass
  }
  
  loadSTRUCT(reader) {
    reader(this); //reads data into this instance
  }
  
  //the old api, that both creates and reads
  static fromSTRUCT(reader) {
    let ret = new SomeClass();
    reader(ret);
    return ret;
  }
}
SomeClass.STRUCT = `
SomeClass {
}
`
nstructjs.manager.add_class(SomeClass);

*/
var StructTypeMap$1 = StructTypeMap;
var StructTypes$1 = StructTypes;
var Class$4 = Class;

var struct_parse = _export_struct_parse_;
var StructEnum$1 = StructEnum;

var _static_envcode_null = "";
var debug_struct = 0;
var packdebug_tablevel = 0;

function gen_tabstr$1(tot) {
  var ret = "";

  for (var i = 0; i < tot; i++) {
    ret += " ";
  }

  return ret;
}

let packer_debug, packer_debug_start, packer_debug_end;

if (debug_struct) {
  packer_debug = function (msg) {
    if (msg !== undefined) {
      var t = gen_tabstr$1(packdebug_tablevel);
      console.log(t + msg);
    } else {
      console.log("Warning: undefined msg");
    }
  };
  packer_debug_start = function (funcname) {
    packer_debug("Start " + funcname);
    packdebug_tablevel++;
  };

  packer_debug_end = function (funcname) {
    packdebug_tablevel--;
    packer_debug("Leave " + funcname);
  };
}
else {
  packer_debug = function () {
  };
  packer_debug_start = function () {
  };
  packer_debug_end = function () {
  };
}


const _export_setWarningMode_ = (t) => {
  if (typeof t !== "number" || isNaN(t)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }

  warninglvl = t;
};

const _export_setDebugMode_ = (t) => {
  debug_struct = t;

  if (debug_struct) {
    packer_debug = function (msg) {
      if (msg != undefined) {
        var t = gen_tabstr$1(packdebug_tablevel);
        console.log(t + msg);
      } else {
        console.log("Warning: undefined msg");
      }
    };
    packer_debug_start = function (funcname) {
      packer_debug("Start " + funcname);
      packdebug_tablevel++;
    };

    packer_debug_end = function (funcname) {
      packdebug_tablevel--;
      packer_debug("Leave " + funcname);
    };
  }
  else {
    packer_debug = function () {
    };
    packer_debug_start = function () {
    };
    packer_debug_end = function () {
    };
  }
};

var _ws_env = [[undefined, undefined]];
var pack_callbacks = [
  function pack_int(data, val) {
    packer_debug("int " + val);

    _module_exports_.pack_int(data, val);
  }, function pack_float(data, val) {
    packer_debug("float " + val);

    _module_exports_.pack_float(data, val);
  }, function pack_double(data, val) {
    packer_debug("double " + val);

    _module_exports_.pack_double(data, val);
  }, 0, 0, 0, 0,
  function pack_string(data, val) {
    if (val == undefined)
      val = "";
    packer_debug("string: " + val);
    packer_debug("int " + val.length);

    _module_exports_.pack_string(data, val);
  }, function pack_static_string(data, val, obj, thestruct, field, type) {
    if (val == undefined)
      val = "";
    packer_debug("static_string: '" + val + "' length=" + type.data.maxlength);

    _module_exports_.pack_static_string(data, val, type.data.maxlength);
  }, function pack_struct(data, val, obj, thestruct, field, type) {
    packer_debug_start("struct " + type.data);

    thestruct.write_struct(data, val, thestruct.get_struct(type.data));

    packer_debug_end("struct");
  }, function pack_tstruct(data, val, obj, thestruct, field, type) {
    var cls = thestruct.get_struct_cls(type.data);
    var stt = thestruct.get_struct(type.data);

    //make sure inheritance is correct
    if (val.constructor.structName != type.data && (val instanceof cls)) {
      //if (DEBUG.Struct) {
      //    console.log(val.constructor.structName+" inherits from "+cls.structName);
      //}
      stt = thestruct.get_struct(val.constructor.structName);
    } else if (val.constructor.structName == type.data) {
      stt = thestruct.get_struct(type.data);
    } else {
      console.trace();
      throw new Error("Bad struct " + val.constructor.structName + " passed to write_struct");
    }

    if (stt.id == 0) {
    }

    packer_debug_start("tstruct '" + stt.name + "'");
    packer_debug("int " + stt.id);

    _module_exports_.pack_int(data, stt.id);
    thestruct.write_struct(data, val, stt);

    packer_debug_end("tstruct");
  }, function pack_array(data, val, obj, thestruct, field, type) {
    packer_debug_start("array");

    if (val == undefined) {
      console.trace();
      console.log("Undefined array fed to struct struct packer!");
      console.log("Field: ", field);
      console.log("Type: ", type);
      console.log("");
      packer_debug("int 0");
      _module_exports_.pack_int(data, 0);
      return;
    }

    packer_debug("int " + val.length);
    _module_exports_.pack_int(data, val.length);

    var d = type.data;

    var itername = d.iname;
    var type2 = d.type;

    var env = _ws_env;
    for (var i = 0; i < val.length; i++) {
      var val2 = val[i];
      if (itername != "" && itername != undefined && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = thestruct._env_call(field.get, obj, env);
      }
      var f2 = {type: type2, get: undefined, set: undefined};
      do_pack(data, val2, obj, thestruct, f2, type2);
    }
    packer_debug_end("array");
  }, function pack_iter(data, val, obj, thestruct, field, type) {
    //this was originally implemented to use ES6 iterators.

    packer_debug_start("iter");

    if (val == undefined || val.forEach == undefined) {
      console.trace();
      console.log("Undefined iterable list fed to struct struct packer!", val);
      console.log("Field: ", field);
      console.log("Type: ", type);
      console.log("");
      packer_debug("int 0");
      _module_exports_.pack_int(data, 0);
      return;
    }

    var len = 0.0;
    val.forEach(function (val2) {
      len++;
    }, this);

    packer_debug("int " + len);
    _module_exports_.pack_int(data, len);

    var d = type.data, itername = d.iname, type2 = d.type;
    var env = _ws_env;

    var i = 0;
    val.forEach(function (val2) {
      if (i >= len) {
        if (warninglvl > 0) 
          console.trace("Warning: iterator returned different length of list!", val, i);
        return;
      }

      if (itername != "" && itername != undefined && field.get) {
        env[0][0] = itername;
        env[0][1] = val2;
        val2 = thestruct._env_call(field.get, obj, env);
      }

      var f2 = {type: type2, get: undefined, set: undefined};
      do_pack(data, val2, obj, thestruct, f2, type2);

      i++;
    }, this);

    packer_debug_end("iter");
  }, function pack_short(data, val) {
    packer_debug("short " + val);

    _module_exports_.pack_short(data, Math.floor(val));
  }, function pack_byte(data, val) {
    packer_debug("byte " + val);

    _module_exports_.pack_byte(data, Math.floor(val));
  }, function pack_bool(data, val) {
    packer_debug("bool " + val);

    _module_exports_.pack_byte(data, !!val);
  }];

function do_pack(data, val, obj, thestruct, field, type) {
  pack_callbacks[field.type.type](data, val, obj, thestruct, field, type);

}

function define_empty_class(name) {
  var cls = function () {
  };

  cls.prototype = Object.create(Object.prototype);
  cls.constructor = cls.prototype.constructor = cls;

  cls.STRUCT = name + " {\n  }\n";
  cls.structName = name;

  cls.prototype.loadSTRUCT = function (reader) {
    reader(this);
  };

  cls.newSTRUCT = function () {
    return new this();
  };

  return cls;
}

var STRUCT = class STRUCT {
  constructor() {
    this.idgen = new IDGen();

    this.structs = {};
    this.struct_cls = {};
    this.struct_ids = {};

    this.compiled_code = {};
    this.null_natives = {};

    function define_null_native(name, cls) {
      var obj = define_empty_class(name);

      var stt = struct_parse.parse(obj.STRUCT);

      stt.id = this.idgen.gen_id();

      this.structs[name] = stt;
      this.struct_cls[name] = cls;
      this.struct_ids[stt.id] = stt;

      this.null_natives[name] = 1;
    }

    define_null_native.call(this, "Object", Object);
  }

  forEach(func, thisvar) {
    for (var k in this.structs) {
      var stt = this.structs[k];

      if (thisvar != undefined)
        func.call(thisvar, stt);
      else
        func(stt);
    }
  }

  //defined_classes is an array of class constructors
  //with STRUCT scripts, *OR* another STRUCT instance
  //
  //defaults to structjs.manager
  parse_structs(buf, defined_classes) {
    if (defined_classes === undefined) {
      defined_classes = _export_manager_;
    }

    if (defined_classes instanceof STRUCT) {
      var struct2 = defined_classes;
      defined_classes = [];

      for (var k in struct2.struct_cls) {
        defined_classes.push(struct2.struct_cls[k]);
      }
    }

    if (defined_classes == undefined) {
      defined_classes = [];
      for (var k in _export_manager_.struct_cls) {
        defined_classes.push(_export_manager_.struct_cls[k]);
      }
    }

    var clsmap = {};

    for (var i = 0; i < defined_classes.length; i++) {
      var cls = defined_classes[i];

      if (cls.structName == undefined && cls.STRUCT != undefined) {
        var stt = struct_parse.parse(cls.STRUCT.trim());
        cls.structName = stt.name;
      } else if (cls.structName == undefined && cls.name != "Object") {
        if (warninglvl > 0) 
          console.log("Warning, bad class in registered class list", cls.name, cls);
        continue;
      }

      clsmap[cls.structName] = defined_classes[i];
    }

    struct_parse.input(buf);

    while (!struct_parse.at_end()) {
      var stt = struct_parse.parse(undefined, false);

      if (!(stt.name in clsmap)) {
        if (!(stt.name in this.null_natives))
        if (warninglvl > 0) 
          console.log("WARNING: struct " + stt.name + " is missing from class list.");

        var dummy = define_empty_class(stt.name);

        dummy.STRUCT = STRUCT.fmt_struct(stt);
        dummy.structName = stt.name;

        dummy.prototype.structName = dummy.name;

        this.struct_cls[dummy.structName] = dummy;
        this.structs[dummy.structName] = stt;

        if (stt.id != -1)
          this.struct_ids[stt.id] = stt;
      } else {
        this.struct_cls[stt.name] = clsmap[stt.name];
        this.structs[stt.name] = stt;

        if (stt.id != -1)
          this.struct_ids[stt.id] = stt;
      }

      var tok = struct_parse.peek();
      while (tok != undefined && (tok.value == "\n" || tok.value == "\r" || tok.value == "\t" || tok.value == " ")) {
        tok = struct_parse.peek();
      }
    }
  }

  register(cls, structName) {
    return this.add_class(cls, structName);
  }

  add_class(cls, structName) {
    if (!cls.STRUCT) {
      throw new Error("class " + cls.name + " has no STRUCT script");
    }

    var stt = struct_parse.parse(cls.STRUCT);

    cls.structName = stt.name;

    //create default newSTRUCT
    if (cls.newSTRUCT === undefined) {
      cls.newSTRUCT = function () {
        return new this();
      };
    }

    if (structName !== undefined) {
      stt.name = cls.structName = structName;
    } else if (cls.structName === undefined) {
      cls.structName = stt.name;
    } else if (cls.structName !== undefined) {
      stt.name = cls.structName;
    } else {
      throw new Error("Missing structName parameter");
    }

    if (stt.id == -1)
      stt.id = this.idgen.gen_id();

    this.structs[cls.structName] = stt;
    this.struct_cls[cls.structName] = cls;
    this.struct_ids[stt.id] = stt;
  }

  get_struct_id(id) {
    return this.struct_ids[id];
  }

  get_struct(name) {
    if (!(name in this.structs)) {
      console.trace();
      throw new Error("Unknown struct " + name);
    }
    return this.structs[name];
  }

  get_struct_cls(name) {
    if (!(name in this.struct_cls)) {
      console.trace();
      throw new Error("Unknown struct " + name);
    }
    return this.struct_cls[name];
  }

  static inherit(child, parent, structName = child.name) {
    if (!parent.STRUCT) {
      return structName + "{\n";
    }

    var stt = struct_parse.parse(parent.STRUCT);
    var code = structName + "{\n";
    code += STRUCT.fmt_struct(stt, true);
    return code;
  }

  /** invoke loadSTRUCT methods on parent objects.  note that
   reader() is only called once.  it is called however.*/
  static Super(obj, reader) {
    if (warninglvl > 0) 
      console.warn("deprecated");

    reader(obj);

    function reader2(obj) {
    }

    let cls = obj.constructor;
    let bad = cls === undefined || cls.prototype === undefined || cls.prototype.__proto__ === undefined;

    if (bad) {
      return;
    }

    let parent = cls.prototype.__proto__.constructor;
    bad = bad || parent === undefined;

    if (!bad && parent.prototype.loadSTRUCT && parent.prototype.loadSTRUCT !== obj.loadSTRUCT) { //parent.prototype.hasOwnProperty("loadSTRUCT")) {
      parent.prototype.loadSTRUCT.call(obj, reader2);
    }
  }

  /** deprecated.  used with old fromSTRUCT interface. */
  static chain_fromSTRUCT(cls, reader) {
    if (warninglvl > 0) 
      console.warn("Using deprecated (and evil) chain_fromSTRUCT method, eek!");

    var proto = cls.prototype;
    var parent = cls.prototype.prototype.constructor;

    var obj = parent.fromSTRUCT(reader);
    let obj2 = new cls();

    let keys = Object.keys(obj).concat(Object.getOwnPropertySymbols(obj));
    //var keys=Object.keys(proto);

    for (var i = 0; i < keys.length; i++) {
      let k = keys[i];

      try {
        obj2[k] = obj[k];
      } catch (error) {
        if (warninglvl > 0) 
          console.warn("  failed to set property", k);
      }
      //var k=keys[i];
      //if (k=="__proto__")
      // continue;
      //obj[k] = proto[k];
    }

    /*
    if (proto.toString !== Object.prototype.toString)
      obj2.toString = proto.toString;
    //*/

    return obj2;
  }

  static formatStruct(stt, internal_only, no_helper_js) {
    return this.fmt_struct(stt, internal_only, no_helper_js);
  }

  static fmt_struct(stt, internal_only, no_helper_js) {
    if (internal_only == undefined)
      internal_only = false;
    if (no_helper_js == undefined)
      no_helper_js = false;

    var s = "";
    if (!internal_only) {
      s += stt.name;
      if (stt.id != -1)
        s += " id=" + stt.id;
      s += " {\n";
    }
    var tab = "  ";

    function fmt_type(type) {
      if (type.type == StructEnum$1.T_ARRAY || type.type == StructEnum$1.T_ITER) {
        if (type.data.iname != "" && type.data.iname != undefined) {
          return "array(" + type.data.iname + ", " + fmt_type(type.data.type) + ")";
        }
        else {
          return "array(" + fmt_type(type.data.type) + ")";
        }
      } else if (type.type == StructEnum$1.T_STATIC_STRING) {
        return "static_string[" + type.data.maxlength + "]";
      } else if (type.type == StructEnum$1.T_STRUCT) {
        return type.data;
      } else if (type.type == StructEnum$1.T_TSTRUCT) {
        return "abstract(" + type.data + ")";
      } else {
        return StructTypeMap$1[type.type];
      }
    }

    var fields = stt.fields;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      s += tab + f.name + " : " + fmt_type(f.type);
      if (!no_helper_js && f.get != undefined) {
        s += " | " + f.get.trim();
      }
      s += ";\n";
    }
    if (!internal_only)
      s += "}";
    return s;
  }

  _env_call(code, obj, env) {
    var envcode = _static_envcode_null;
    if (env != undefined) {
      envcode = "";
      for (var i = 0; i < env.length; i++) {
        envcode = "var " + env[i][0] + " = env[" + i.toString() + "][1];\n" + envcode;
      }
    }
    var fullcode = "";
    if (envcode !== _static_envcode_null)
      fullcode = envcode + code;
    else
      fullcode = code;
    var func;

    //fullcode = fullcode.replace(/\bthis\b/, "obj");

    if (!(fullcode in this.compiled_code)) {
      var code2 = "func = function(obj, env) { " + envcode + "return " + code + "}";
      try {
        func = _structEval(code2);
      }
      catch (err) {
        _export_print_stack_(err);

        console.log(code2);
        console.log(" ");
        throw err;
      }
      this.compiled_code[fullcode] = func;
    }
    else {
      func = this.compiled_code[fullcode];
    }
    try {
      return func.call(obj, obj, env);
    }
    catch (err) {
      _export_print_stack_(err);

      var code2 = "func = function(obj, env) { " + envcode + "return " + code + "}";
      console.log(code2);
      console.log(" ");
      throw err;
    }
  }

  write_struct(data, obj, stt) {
    function use_helper_js(field) {
      if (field.type.type == StructEnum$1.T_ARRAY || field.type.type == StructEnum$1.T_ITER) {
        return field.type.data.iname == undefined || field.type.data.iname == "";
      }
      return true;
    }

    var fields = stt.fields;
    var thestruct = this;
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var t1 = f.type;
      var t2 = t1.type;

      if (use_helper_js(f)) {
        var val;
        var type = t2;
        if (f.get != undefined) {
          val = thestruct._env_call(f.get, obj);
        }
        else {
          val = obj[f.name];
        }
        do_pack(data, val, obj, thestruct, f, t1);
      }
      else {
        var val = obj[f.name];
        do_pack(data, val, obj, thestruct, f, t1);
      }
    }
  }

  write_object(data, obj) {
    var cls = obj.constructor.structName;
    var stt = this.get_struct(cls);

    if (data === undefined) {
      data = [];
    }

    this.write_struct(data, obj, stt);
    return data;
  }

  read_object(data, cls_or_struct_id, uctx) {
    var cls, stt;

    if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }

    if (typeof cls_or_struct_id == "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else {
      cls = cls_or_struct_id;
    }

    if (cls === undefined) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }

    stt = this.structs[cls.structName];

    if (uctx == undefined) {
      uctx = new _module_exports_.unpack_context();

      packer_debug("\n\n=Begin reading " + cls.structName + "=");
    }
    var thestruct = this;

    var unpack_funcs = [
      function t_int(type) { //int
        var ret = _module_exports_.unpack_int(data, uctx);

        packer_debug("-int " + (debug_struct > 1 ? ret : ""));

        return ret;
      }, function t_float(type) {
        var ret = _module_exports_.unpack_float(data, uctx);

        packer_debug("-float " + (debug_struct > 1 ? ret : ""));

        return ret;
      }, function t_double(type) {
        var ret = _module_exports_.unpack_double(data, uctx);

        packer_debug("-double " + (debug_struct > 1 ? ret : ""));

        return ret;
      }, 0, 0, 0, 0,
      function t_string(type) {
        packer_debug_start("string");

        var s = _module_exports_.unpack_string(data, uctx);

        packer_debug("data: '" + s + "'");
        packer_debug_end("string");
        return s;
      }, function t_static_string(type) {
        packer_debug_start("static_string");

        var s = _module_exports_.unpack_static_string(data, uctx, type.data.maxlength);

        packer_debug("data: '" + s + "'");
        packer_debug_end("static_string");

        return s;
      }, function t_struct(type) {
        packer_debug_start("struct " + type.data);

        var cls2 = thestruct.get_struct_cls(type.data);
        var ret = thestruct.read_object(data, cls2, uctx);

        packer_debug_end("struct");
        return ret;
      }, function t_tstruct(type) {
        packer_debug_start("tstruct");

        var id = _module_exports_.unpack_int(data, uctx);

        packer_debug("-int " + id);
        if (!(id in thestruct.struct_ids)) {
          packer_debug("struct id: " + id);
          console.trace();
          console.log(id);
          console.log(thestruct.struct_ids);
          packer_debug_end("tstruct");
          throw new Error("Unknown struct type " + id + ".");
        }

        var cls2 = thestruct.get_struct_id(id);

        packer_debug("struct name: " + cls2.name);
        cls2 = thestruct.struct_cls[cls2.name];

        var ret = thestruct.read_object(data, cls2, uctx);

        packer_debug_end("tstruct");
        return ret;
      }, function t_array(type) {
        packer_debug_start("array");

        var len = _module_exports_.unpack_int(data, uctx);
        packer_debug("-int " + len);

        var arr = new Array(len);
        for (var i = 0; i < len; i++) {
          arr[i] = unpack_field(type.data.type);
        }

        packer_debug_end("array");
        return arr;
      }, function t_iter(type) {
        packer_debug_start("iter");

        var len = _module_exports_.unpack_int(data, uctx);
        packer_debug("-int " + len);

        var arr = new Array(len);
        for (var i = 0; i < len; i++) {
          arr[i] = unpack_field(type.data.type);
        }

        packer_debug_end("iter");
        return arr;
      }, function t_short(type) { //int
        var ret = _module_exports_.unpack_short(data, uctx);

        packer_debug("-short " + ret);

        return ret;
      }, function t_byte(type) {
        var ret = _module_exports_.unpack_byte(data, uctx);

        packer_debug("-byte " + ret);

        return ret;
      }, function t_bool(type) {
        var ret = _module_exports_.unpack_byte(data, uctx);

        packer_debug("-bool " + ret);

        return !!ret;
      }
    ];

    function unpack_field(type) {
      return unpack_funcs[type.type](type);
    }

    let was_run = false;

    function load(obj) {
      if (was_run) {
        return;
      }

      was_run = true;

      var fields = stt.fields;
      var flen = fields.length;
      for (var i = 0; i < flen; i++) {
        var f = fields[i];
        var val = unpack_field(f.type);
        obj[f.name] = val;
      }
    }

    if (cls.prototype.loadSTRUCT !== undefined) {
      let obj;

      if (cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT();
      } else {
        obj = new cls();
      }

      obj.loadSTRUCT(load);
      return obj;
    } else if (cls.fromSTRUCT !== undefined) {
      if (warninglvl > 1) 
        console.warn("Warning: class " + cls.name + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead");
      return cls.fromSTRUCT(load);
    } else { //default case, make new instance and then call load() on it
      let obj;
      if (cls.newSTRUCT !== undefined) {
        obj = cls.newSTRUCT();
      } else {
        obj = new cls();
      }

      load(obj);

      return obj;
    }
  }
};

//main struct script manager
var manager = _export_manager_ = new STRUCT();

/**
 * Write all defined structs out to a string.
 *
 * @param manager STRUCT instance, defaults to nstructjs.manager
 * @param include_code include save code snippets
 * */
var write_scripts = function write_scripts(manager, include_code = false) {
  if (manager === undefined)
    manager = _export_manager_;

  var buf = "";

  manager.forEach(function (stt) {
    buf += STRUCT.fmt_struct(stt, false, !include_code) + "\n";
  });

  var buf2 = buf;
  buf = "";

  for (var i = 0; i < buf2.length; i++) {
    var c = buf2[i];
    if (c === "\n") {
      buf += "\n";
      var i2 = i;
      while (i < buf2.length && (buf2[i] === " " || buf2[i] === "\t" || buf2[i] === "\n")) {
        i++;
      }
      if (i !== i2)
        i--;
    }
    else {
      buf += c;
    }
  }

  return buf;
};

var struct_intern = /*#__PURE__*/Object.freeze({
  __proto__: null,
  get manager () { return _export_manager_; },
  setWarningMode: _export_setWarningMode_,
  setDebugMode: _export_setDebugMode_,
  STRUCT: STRUCT,
  write_scripts: write_scripts
});

"use strict";

if (typeof btoa === "undefined") {
  _nGlobal.btoa = function btoa(str) {
    let buffer = new Buffer("" + str, 'binary');
    return buffer.toString('base64');
  };

  _nGlobal.atob = function atob(str) {
    return new Buffer(str, 'base64').toString('binary');
  };
}

/*
file format:
  magic signature              : 4 bytes
  file version major           : 2 bytes
  file version minor           : 1 bytes
  file version micro           : 1 bytes
  length of struct scripts     : 4 bytes
  struct scripts for this file : ...
  
  block:
    magic signature for block              : 4 bytes
    length of data  (not including header) : 4 bytes
    id of struct type                      : 4 bytes
    
    data                                   : ...
*/

const _export_versionToInt_ = function(v) {
  v = _export_versionCoerce_(v);
  let mul = 64;
  return ~~(v.major*mul*mul*mul + v.minor*mul*mul + v.micro*mul);
};

let ver_pat = /[0-9]+\.[0-9]+\.[0-9]+$/;

const _export_versionCoerce_ = function(v) {
  if (!v) {
    throw new Error("empty version: " + v);
  }

  if (typeof v === "string") {
    if (!ver_pat.exec(v)) {
      throw new Error("invalid version string " + v);
    }

    let ver = v.split(".");
    return {
      major : parseInt(ver[0]),
      minor : parseInt(ver[1]),
      micro : parseInt(ver[2])
    }
  } else if (Array.isArray(v)) {
    return {
      major : v[0],
      minor : v[1],
      micro : v[2]
    }
  } else if (typeof v === "object") {
    let test = (k) => k in v && typeof v[k] === "number";

    if (!test("major") || !test("minor") || !test("micro")) {
      throw new Error("invalid version object: " + v);
    }

    return v;
  } else {
    throw new Error("invalid version " + v);
  }
};

const _export_versionLessThan_ = function(a, b) {
  return _export_versionToInt_(a) < _export_versionToInt_(b);
};

let versionLessThan = _export_versionLessThan_;

let FileParams = class FileParams {
  constructor() {
    this.magic = "STRT";
    this.ext = ".bin";
    this.blocktypes = ["DATA"];

    this.version = {
      major: 0,
      minor: 0,
      micro: 1
    };
  }
};

//used to define blocks
let Block = class Block {
  constructor(type_magic, data) {
    this.type = type_magic;
    this.data = data;
  }
};

let FileError = class FileeError extends Error {
};

let FileHelper = class FileHelper {
  //params can be FileParams instance, or object literal
  //(it will convert to FileParams)
  constructor(params) {
    if (params === undefined) {
      params = new FileParams();
    } else {
      let fp = new FileParams();

      for (let k in params) {
        fp[k] = params[k];
      }
      params = fp;
    }

    this.version = params.version;
    this.blocktypes = params.blocktypes;
    this.magic = params.magic;
    this.ext = params.ext;
    this.struct = undefined;
    this.unpack_ctx = undefined;
  }

  read(dataview) {
    this.unpack_ctx = new _module_exports_.unpack_context();

    let magic = _module_exports_.unpack_static_string(dataview, this.unpack_ctx, 4);

    if (magic !== this.magic) {
      throw new FileError("corrupted file");
    }

    this.version = {};
    this.version.major = _module_exports_.unpack_short(dataview, this.unpack_ctx);
    this.version.minor = _module_exports_.unpack_byte(dataview, this.unpack_ctx);
    this.version.micro = _module_exports_.unpack_byte(dataview, this.unpack_ctx);

    let struct = this.struct = new STRUCT();

    let scripts = _module_exports_.unpack_string(dataview, this.unpack_ctx);
    this.struct.parse_structs(scripts, _export_manager_);

    let blocks = [];
    let dviewlen = dataview.buffer.byteLength;

    while (this.unpack_ctx.i < dviewlen) {
      //console.log("reading block. . .", this.unpack_ctx.i, dviewlen);

      let type = _module_exports_.unpack_static_string(dataview, this.unpack_ctx, 4);
      let datalen = _module_exports_.unpack_int(dataview, this.unpack_ctx);
      let bstruct = _module_exports_.unpack_int(dataview, this.unpack_ctx);
      let bdata;

      //console.log(type, datalen, bstruct);

      if (bstruct == -2) { //string data, e.g. JSON
        bdata = _module_exports_.unpack_static_string(dataview, this.unpack_ctx, datalen);
      } else {
        bdata = _module_exports_.unpack_bytes(dataview, this.unpack_ctx, datalen);
        bdata = struct.read_object(bdata, bstruct, new _module_exports_.unpack_context());
      }

      let block = new Block();
      block.type = type;
      block.data = bdata;

      blocks.push(block);
    }

    this.blocks = blocks;
    return blocks;
  }

  doVersions(old) {
    let blocks = this.blocks;

    if (versionLessThan(old, "0.0.1")) {
      //do something
    }
  }

  write(blocks) {
    this.struct = _export_manager_;
    this.blocks = blocks;

    let data = [];

    _module_exports_.pack_static_string(data, this.magic, 4);
    _module_exports_.pack_short(data, this.version.major);
    _module_exports_.pack_byte(data, this.version.minor & 255);
    _module_exports_.pack_byte(data, this.version.micro & 255);

    let scripts = write_scripts();
    _module_exports_.pack_string(data, scripts);

    let struct = this.struct;

    for (let block of blocks) {
      if (typeof block.data === "string") { //string data, e.g. JSON
        _module_exports_.pack_static_string(data, block.type, 4);
        _module_exports_.pack_int(data, block.data.length);
        _module_exports_.pack_int(data, -2); //flag as string data
        _module_exports_.pack_static_string(data, block.data, block.data.length);
        continue;
      }

      let structName = block.data.constructor.structName;
      if (structName === undefined || !(structName in struct.structs)) {
        throw new Error("Non-STRUCTable object " + block.data);
      }

      let data2 = [];
      let stt = struct.structs[structName];

      struct.write_object(data2, block.data);

      _module_exports_.pack_static_string(data, block.type, 4);
      _module_exports_.pack_int(data, data2.length);
      _module_exports_.pack_int(data, stt.id);

      _module_exports_.pack_bytes(data, data2);
    }

    return new DataView(new Uint8Array(data).buffer);
  }

  writeBase64(blocks) {
    let dataview = this.write(blocks);

    let str = "";
    let bytes = new Uint8Array(dataview.buffer);

    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }

    return btoa(str);
  }

  makeBlock(type, data) {
    return new Block(type, data);
  }

  readBase64(base64) {
    let data = atob(base64);
    let data2 = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      data2[i] = data.charCodeAt(i);
    }

    return this.read(new DataView(data2.buffer));
  }
};

var struct_filehelper = /*#__PURE__*/Object.freeze({
  __proto__: null,
  versionToInt: _export_versionToInt_,
  versionCoerce: _export_versionCoerce_,
  versionLessThan: _export_versionLessThan_,
  FileParams: FileParams,
  Block: Block,
  FileError: FileError,
  FileHelper: FileHelper
});

if (typeof window !== "undefined") {
  window._nGlobal = window;
} else if (typeof self !== "undefined") {
  self._nGlobal = self;
} else {
  global._nGlobal = global;
}

_nGlobal._structEval = eval;

const _module_exports_$1 = {};
Object.defineProperty(_module_exports_$1, "STRUCT_ENDIAN", {
  get: function () {
    return _module_exports_.STRUCT_ENDIAN;
  },
  set: function (val) {
    _module_exports_.STRUCT_ENDIAN = val;
  }
});

for (let k in struct_intern) {
  _module_exports_$1[k] = struct_intern[k];
}

var StructTypeMap$2 = StructTypeMap;
var StructTypes$2 = StructTypes;
var Class$5 = Class;

//forward struct_intern's exports
for (var k$1 in struct_intern) {
  _module_exports_$1[k$1] = struct_intern[k$1];
}

/** Register a class with nstructjs **/
_module_exports_$1.register = function register(cls, name) {
  return _module_exports_$1.manager.register(cls, name);
};
_module_exports_$1.inherit = function () {
  return _module_exports_$1.STRUCT.inherit(...arguments);
};

_module_exports_$1.setDebugMode = _export_setDebugMode_;
_module_exports_$1.setWarningMode = _export_setWarningMode_;

/*
import * as _require___$tinyeval$tinyeval_js_ from "../tinyeval/tinyeval.js";
_module_exports_.tinyeval = _require___$tinyeval$tinyeval_js_;

_module_exports_.useTinyEval = function() {
  _nGlobal._structEval = (buf) => {
    return _module_exports_.tinyeval.eval(buf);
  }
};
*/
   _module_exports_$1.useTinyEval = () => {};


//export other modules
_module_exports_$1.binpack = _module_exports_;
_module_exports_$1.util = struct_util;
_module_exports_$1.typesystem = struct_typesystem;
_module_exports_$1.parseutil = struct_parseutil;
_module_exports_$1.parser = struct_parser;
_module_exports_$1.filehelper = struct_filehelper;

module.exports = _module_exports_$1;
  if (!(typeof window === "undefined" && typeof global !== "undefined")) {
    //not nodejs?
    _nGlobal.nstructjs = module.exports;    
    _nGlobal.module = undefined;
  }
  
  return exports;
})();

