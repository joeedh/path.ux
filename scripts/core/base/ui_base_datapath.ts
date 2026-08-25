import {
  DataPathError,
  getDataPathToolOp,
  normalizePath,
} from "../../path-controller/controller/controller";
import type {
  DataPathWatcher,
  DataPathWatcherOpts,
  PathWatchCallback,
} from "../../path-controller/controller/controller";
import type { DataPathSetOp } from "../../path-controller/controller/controller_ops";
import * as toolprop from "../../path-controller/toolsys/toolprop";
import { IntProperty, NumberConstraints, PropFlags } from "../../path-controller/toolsys/toolprop";
import type { IContextBase } from "../context_base";
import type { UIBase } from "../ui_base";

type AnyUIBase = UIBase<any, any, any>;

export function setPathValueUndo(elem: AnyUIBase, ctx: any, path: string, val: unknown): void {
  elem.pathSocketUpdate(ctx, path);

  const mass_set_path = elem.getAttribute("mass_set_path");
  const rdef = ctx.api.resolvePath(ctx, path)!;
  const prop = rdef.prop!;

  if (ctx.api.getValue(ctx, path) === val) {
    return;
  }

  const toolstack = elem.ctx.toolstack;
  let head = toolstack.head;

  const bad =
    head === undefined ||
    !(head instanceof getDataPathToolOp()) ||
    head!.hashThis() !== head!.hash(mass_set_path, path, prop.type, elem._id) ||
    elem.pathUndoGen !== elem._lastPathUndoGen;

  if (!bad) {
    toolstack.undo(ctx);
    const tool = head as InstanceType<ReturnType<typeof getDataPathToolOp>>;
    tool.setValue(ctx, val, rdef.obj);
    toolstack.redo(ctx);
  } else {
    elem._lastPathUndoGen = elem.pathUndoGen;

    const toolop = getDataPathToolOp().create(ctx, path, val, elem._id, mass_set_path ?? undefined);

    /* getDataPathToolOp.create can return false in case of no-op paths. */
    if (!toolop) {
      return;
    }

    ctx.toolstack.execTool(elem.ctx, toolop);
    head = toolstack.head;
  }

  if (!head || (head as unknown as DataPathSetOp).hadError) {
    throw new Error("toolpath error");
  }
}

export function loadNumConstraints(
  elem: AnyUIBase,
  prop: toolprop.ToolProperty | undefined,
  dom: HTMLElement | AnyUIBase = elem,
  onModifiedCallback?: (this: AnyUIBase) => void
): void {
  let modified = false;

  if (!prop) {
    let path;

    if (dom.hasAttribute("datapath")) {
      path = dom.getAttribute("datapath");
    }

    if (path === undefined && elem.hasAttribute("datapath")) {
      path = elem.getAttribute("datapath");
    }

    if (typeof path === "string") {
      prop = elem.getPathMeta(elem.ctx, path) ?? prop;
    }
  }

  const loadAttr = (propkey: string, domkey: string, thiskey: string) => {
    const anyElem = elem as any;
    const old = anyElem[thiskey];

    if (dom.hasAttribute(domkey)) {
      anyElem[thiskey] = parseFloat(dom.getAttribute(domkey)!);
    } else if (prop) {
      anyElem[thiskey] = prop[propkey as keyof typeof prop];
    }

    if (anyElem[thiskey] !== old) {
      modified = true;
    }
  };

  for (const key of NumberConstraints) {
    const thiskey = key;
    const domkey = key;

    if (key === "range") {
      //handled later
      continue;
    }

    loadAttr(key, domkey, thiskey);
  }

  if (elem.range === undefined) {
    elem.range = [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  }

  const oldmin = elem.range[0];
  const oldmax = elem.range[1];

  const range = prop ? prop.range : undefined;
  if (range && !dom.hasAttribute("min")) {
    elem.range[0] = range[0];
  } else if (dom.hasAttribute("min")) {
    elem.range[0] = parseFloat(dom.getAttribute("min")!);
  }

  if (range && !dom.hasAttribute("max")) {
    elem.range[1] = range[1];
  } else if (dom.hasAttribute("max")) {
    elem.range[1] = parseFloat(dom.getAttribute("max")!);
  }

  if (elem.range[0] !== oldmin || elem.range[1] !== oldmax) {
    modified = true;
  }

  const oldint = elem.isInt;

  if (dom.getAttribute("integer")) {
    let val = dom.getAttribute("integer");
    val = ("" + val).toLowerCase();

    //handles anonymouse <numslider-x integer> case
    elem.isInt = val === "null" || val === "true" || val === "yes" || val === "1";
  } else if (prop && prop instanceof IntProperty) {
    elem.isInt = true;
  }

  if (!elem.isInt !== !oldint) {
    modified = true;
  }

  const oldedit = elem.editAsBaseUnit;

  if (elem.editAsBaseUnit === undefined) {
    if (prop && prop.flag & PropFlags.EDIT_AS_BASE_UNIT) {
      elem.editAsBaseUnit = true;
    } else {
      elem.editAsBaseUnit = false;
    }
  }

  if (!elem.editAsBaseUnit !== !oldedit) {
    modified = true;
  }

  if (modified) {
    elem.setCSS();

    if (onModifiedCallback) {
      onModifiedCallback.call(elem);
    }
  }
}

export function pushReportContext(elem: AnyUIBase, key: string): void {
  const api = elem.ctx.api;
  if (api.pushReportContext) {
    api.pushReportContext(key);
  }
}

export function popReportContext(elem: AnyUIBase): void {
  const api = elem.ctx.api;
  if (api.popReportContext) api.popReportContext();
}

export function setPathValue<T = unknown>(elem: AnyUIBase, ctx: any, path: string, val: T): void {
  elem.pathSocketUpdate(ctx, path);

  if (elem.useDataPathUndo) {
    elem.pushReportContext(elem._reportCtxName);

    try {
      elem.setPathValueUndo(ctx, path, val);
    } catch (error) {
      elem.popReportContext();

      if (!(error instanceof DataPathError)) {
        throw error;
      } else {
        return;
      }
    }

    elem.popReportContext();
    return;
  }

  elem.pushReportContext(elem._reportCtxName);

  try {
    if (elem.hasAttribute("mass_set_path")) {
      ctx.api.massSetProp(ctx, elem.getAttribute("mass_set_path")!, val);
      ctx.api.setValue(ctx, path, val);
    } else {
      ctx.api.setValue(ctx, path, val);
    }
  } catch (error) {
    elem.popReportContext();

    if (!(error instanceof DataPathError)) {
      throw error;
    }

    return;
  }

  elem.popReportContext();
}

export function getPathMeta(elem: AnyUIBase, ctx: any, path: string) {
  elem.pushReportContext(elem._reportCtxName);
  const ret = ctx.api.resolvePath(ctx, path);
  elem.popReportContext();

  return ret !== undefined ? ret.prop : undefined;
}

export function getPathDescription(elem: AnyUIBase, ctx: any, path: string): string | undefined {
  let ret;
  elem.pushReportContext(elem._reportCtxName);

  try {
    ret = ctx.api.getDescription(ctx, path);
  } catch (error) {
    elem.popReportContext();

    if (error instanceof DataPathError) {
      return undefined;
    } else {
      throw error;
    }
  }

  elem.popReportContext();
  return ret;
}

export function addPathWatch<CTX extends IContextBase>(
  elem: UIBase<CTX, any, any>,
  pathOrAttr: string = "datapath",
  opts?: DataPathWatcherOpts & { onChange?: PathWatchCallback }
): DataPathWatcher<CTX> | undefined {
  if (!elem._ctx) {
    return undefined;
  }

  const raw = elem.hasAttribute(pathOrAttr) ? elem.getAttribute(pathOrAttr)! : pathOrAttr;
  const path = normalizePath(raw);

  if (!path) {
    return undefined;
  }

  for (const w of elem._pathWatchers) {
    if (w.path === path) {
      return w;
    }
  }

  const onChange: PathWatchCallback = opts?.onChange ?? ((v, info) => elem.updateFromPath(v, info));

  /* ctx is passed as a getter so watchers survive context swaps */
  const w = elem._ctx.api.watch(() => elem._ctx, path, onChange, opts);
  elem._pathWatchers.push(w);

  return w;
}

export function refreshPathWatches(elem: AnyUIBase): void {
  for (const w of elem._pathWatchers) {
    w.refresh();
  }
}

export function clearPathWatches(elem: AnyUIBase): void {
  for (const w of elem._pathWatchers) {
    w.remove();
  }

  elem._pathWatchers.length = 0;
  elem._pathWatchInit = false;
}

export function updatePathWatchers(elem: AnyUIBase, dataPathPolling: boolean): void {
  if (!elem._ctx) {
    return;
  }

  const dp = elem.getAttribute("datapath");

  if (!elem._pathWatchInit || dp !== elem._watchedDataPathAttr) {
    elem.clearPathWatches();

    elem._pathWatchInit = true;
    elem._watchedDataPathAttr = dp;

    elem.watchPath();
  }

  const poll = elem.pollDataPath === true || (dataPathPolling && elem.pollDataPath !== false);

  if (poll) {
    for (const w of elem._pathWatchers) {
      w.tick();
    }
  }
}
