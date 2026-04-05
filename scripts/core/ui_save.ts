//this code is currently disabled
//XXX todo: review this rewritten version of saveUIData/loadUIData

import { tokdef, parser, lexer, PUTLParseError, token } from "../path-controller/util/parseutil.js";
import type { TokFunc, ParserErrFunc } from "../path-controller/util/parseutil.js";

export const UI_SAVE_VERSION = 2;

interface UIBaseNode extends HTMLElement {
  constructor: { define(): { tagname: string } };
  saveData(): unknown;
  loadData(json: unknown): unknown;
  shadow?: ShadowRoot;
}

function debuglog(...args: unknown[]): void {
  if (window.DEBUG && typeof window.DEBUG === "object" && (window.DEBUG as Record<string, boolean>).uipaths) {
    console.warn(...args);
  }
}

//avoid circular module ref
let UIBase: (new () => UIBaseNode) | undefined;
export function setUIBase(cls: new () => UIBaseNode): void {
  UIBase = cls;
}

export function saveUIData(node: HTMLElement, key: string): string {
  if (key === undefined) {
    throw new Error("ui_base.saveUIData(): key cannot be undefined");
  }

  let paths = new Map<string, unknown>();

  let rec = (path: string, n: Node) => {
    if (!(n instanceof HTMLElement)) {
      return;
    }

    if (UIBase && n instanceof UIBase) {
      let uiNode = n as unknown as UIBaseNode;
      let path2 = uiNode.constructor.define().tagname + "|" + path;
      paths.set(path2, uiNode.saveData());
    }

    let ni = 0;
    for (let n2 of Array.from(n.childNodes)) {
      let path2 = path + `[${ni}]`;
      rec(path2, n2);
      ni++;
    }

    if ((n as unknown as UIBaseNode).shadow) {
      let ni = 0;

      for (let n2 of Array.from((n as unknown as UIBaseNode).shadow!.childNodes)) {
        let path2 = path + `{${ni}}`;
        rec(path2, n2);
        ni++;
      }
    }
  };

  rec("", node);

  let paths2: Record<string, unknown> = {};
  for (let [path, data] of paths) {
    let bad = !data;
    bad = bad || (typeof data === "object" && Object.keys(data as object).length === 0);

    if (!bad) {
      paths2[path] = data;
    }
  }

  return JSON.stringify({
    version: UI_SAVE_VERSION,
    key,
    paths: paths2,
  });
}

//window._saveUIData = saveUIData;

export function makeParser(): parser {
  const tk = (name: string, re: RegExp, func?: TokFunc) => new tokdef(name, re, func);
  let p: parser;

  const tokens = [
    tk("LSBRACKET", /\[/),
    tk("RSBRACKET", /\]/),
    tk("LBRACE", /\{/),
    tk("RBRACE", /\}/),
    tk("NUM", /[0-9]+/, (t: token) => t.setValue(String(parseInt(t.value)))),
    tk("WS", /[ \t]/, (token: token) => undefined), //drop token
  ];

  function p_error(t: token | undefined): boolean {
    console.warn(t);

    p.userdata = undefined; //prevent reference leak
    throw new PUTLParseError("Parse error");
  }

  const l = new lexer(tokens);
  p = new parser(l, p_error);

  function consumeAll(): void {
    while (!p.at_end()) {
      p.next();
    }
  }

  function p_Start(): HTMLElement | undefined {
    let node = p.userdata as HTMLElement;

    while (!p.at_end()) {
      let t = p.peeknext();

      //console.log(node.tagName.toLowerCase());

      if (t && t.type === "LSBRACKET") {
        p.next();
        let idx = parseInt(p.expect("NUM"));

        if (idx >= node.childNodes.length || !(node.childNodes[idx] instanceof HTMLElement)) {
          let li = p.lexer.lexpos;
          let path = p.lexer.lexdata;

          debuglog(idx, p.lexer.lexpos, path.slice(li - 3, path.length), node.childNodes);

          consumeAll();
          return undefined;
        }

        node = node.childNodes[idx] as HTMLElement;

        p.expect("RSBRACKET");
      } else if (t && t.type === "LBRACE") {
        p.next();
        let idx = parseInt(p.expect("NUM"));
        let shadow = (node as unknown as UIBaseNode).shadow;

        if (!shadow || idx >= shadow.childNodes.length || !(shadow.childNodes[idx] instanceof HTMLElement)) {
          let li = p.lexer.lexpos;
          let path = p.lexer.lexdata;

          debuglog(idx, p.lexer.lexpos, path.slice(li - 3, path.length), node, shadow ? shadow.childNodes : undefined);
          consumeAll();
          return undefined;
        }

        node = shadow.childNodes[idx] as HTMLElement;

        p.expect("RBRACE");
      } else {
        p.expect("LBRACE");
      }
    }

    return node;
  }

  p.start = p_Start;

  return p;
}

const pathParser = makeParser();

export function loadPath(node: UIBaseNode, key: string, json: unknown): void {
  console.log(key);
  let parts = key.split("|");
  let tagname = parts[0].trim();
  let path = (parts[1] || "").trim();

  if (path === "") {
    if (tagname === node.constructor.define().tagname) {
      node.loadData(json);
    } else {
      debuglog("Failed to load ui save path", key);
    }

    return;
  }

  pathParser.userdata = node;
  let child: unknown;

  try {
    child = pathParser.parse(path);
  } catch (error) {
    if (error instanceof PUTLParseError) {
      console.error("Parse error parsing ui save path " + path);
    } else {
      throw error;
    }
  }

  if (child && (child as UIBaseNode).constructor.define().tagname !== tagname) {
    debuglog("Failed to load ui save path", key);
    child = undefined;
  } else if (!child) {
    debuglog("Failed to load ui save path", key);
  }

  pathParser.userdata = undefined; //prevent reference leak

  if (child) {
    (child as UIBaseNode).loadData(json);
  }
}

interface UISaveData {
  version: number;
  key: string;
  paths: Record<string, unknown>;
}

export function loadUIData(node: UIBaseNode, json: string | UISaveData): void {
  if (typeof json === "string") {
    json = JSON.parse(json) as UISaveData;
  }

  for (let k in json.paths) {
    let v = json.paths[k];

    //paranoia check
    if (v === undefined) {
      continue;
    }

    loadPath(node, k, v);
  }
}
//window._loadUIData = loadUIData;
