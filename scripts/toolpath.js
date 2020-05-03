import {ToolClasses, ToolOp, ToolFlags, UndoFlags, ToolMacro} from './simple_toolsys.js';
import {tokdef, lexer, parser, PUTLParseError} from './parseutil.js';
import {DataPathError} from './controller.js';
import {cachering} from './util.js';

export let ToolPaths = {};

var initToolPaths_run = false;

export function buildParser() {
  let t = (name, re, func) => new tokdef(name, re, func);

  let tokens = [
    t('ID', /[a-zA-Z_$]+[a-zA-Z0-9_$]*/, (t) => {
      if (t.value == "true" || t.value == "false") {
        t.type = "BOOL";
        t.value = t.value == "true";
      }

      return t;
    }),
    t('LPAREN', /\(/),
    t('RPAREN', /\)/),
    t('LSBRACKET', /\[/),
    t('RSBRACKET', /\]/),
    t('DOT', /\./),
    t('COMMA', /\,/),
    t('EQUALS', /\=/),
    t('STRLIT', /"[^"]*"/, (t) => {
      t.value = t.value.slice(1, t.value.length-1);
      return t;
    }),
    t('STRLIT', /'[^']*'/, (t) => {
      t.value = t.value.slice(1, t.value.length-1);
      return t;
    }),
    t('NUMBER', /-?[0-9]+/, (t) => {
      t.value = parseInt(t.value);
      return t;
    }),
    t('NUMBER', /[0-9]+\.[0-9]*/, (t) => {
      t.value = parseFloat(t.value);
      return t;
    }),
    t('WS', /[ \n\r\t]/, (t) => undefined) //ignore whitespace
  ];

  let lexerror = (t) => {
    console.warn("Parse error");
    return true;
  };

  let valid_datatypes = {
    "STRLIT" : 1, "NUMBER" : 1, "BOOL" : 1
  };

  function p_Start(p) {
    let args = {};

    while (!p.at_end()) {
      let keyword = p.expect("ID");

      p.expect("EQUALS");

      let t = p.next();
      if (!(t.type in valid_datatypes)) {
        throw new PUTLParseError("parse error: unexpected " + t.type);
      }

      args[keyword] = t.value;
    }

    return args;
  }

  let lex = new lexer(tokens, lexerror)
  let p = new parser(lex);
  p.start = p_Start;

  return p;
}

export let Parser = buildParser();
/*
let parse_rets = new cachering(() => return {
  toolclass : undefined,
  args : {}
}, 64);
//*/

export function parseToolPath(str, check_tool_exists=true) {
  if (!initToolPaths_run) {
    initToolPaths_run = true;
    initToolPaths();
  }

  let i1 = str.search(/\(/);
  let i2 = str.search(/\)/);
  let args = "";

  if (i1 >= 0 && i2 >= 0) {
    args = str.slice(i1+1, i2).trim();
    str = str.slice(0, i1).trim();
  }

  if (!(str in ToolPaths) && check_tool_exists) {
    throw new DataPathError("unknown tool " + str);
  }

  let ret = Parser.parse(args);

  return {
    toolclass : ToolPaths[str],
    args      : ret
  };
}

export function testToolParser() {
  let ret = parseToolPath("view3d.sometool(selectmode=1 str='str' bool=true)", false);

  return ret;
}

window.parseToolPath = parseToolPath;
//window._ToolPaths = ToolPaths;

//tool path parser for simple_toolsys.js
export function initToolPaths() {
  for (let cls of ToolClasses) {
    if (!cls.hasOwnProperty("tooldef")) { //ignore abstract classes
      continue;
    }

    let def = cls.tooldef();
    let path = def.toolpath;

    ToolPaths[path] = cls;
  }
}