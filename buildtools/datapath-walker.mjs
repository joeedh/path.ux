/**
 * Pure walker over a path.ux DataAPI.
 *
 * Reads only duck-typed fields (rootContextStruct, members, type, apiname,
 * data, data.cb.getStruct, prop.constructor.name, prop metadata), so it has no
 * imports and can run against an API built from either TS source (jest) or a
 * bundled app (the gen-datapaths CLI).
 *
 * Path segments use `apiname` because the runtime resolver keys
 * `DataStruct.pathmap` by apiname (controller.ts).
 */

// Mirror of DataTypes in controller_base.ts.
export const DataTypes = {
  STRUCT: 0,
  DYNAMIC_STRUCT: 1,
  PROP: 2,
  ARRAY: 3,
};

const RANGE_SENTINEL = 1e16; // floats default range is +/-1e17; treat as "no range"

function readPropMeta(prop) {
  const meta = { propType: prop?.constructor?.name ?? "unknown" };
  if (!prop) {
    return meta;
  }

  if (prop.uiname) {
    meta.uiname = String(prop.uiname);
  }
  if (prop.description) {
    meta.description = String(prop.description);
  }

  if (
    Array.isArray(prop.range) &&
    Math.abs(prop.range[0]) < RANGE_SENTINEL &&
    Math.abs(prop.range[1]) < RANGE_SENTINEL
  ) {
    meta.range = [prop.range[0], prop.range[1]];
  }
  if (
    Array.isArray(prop.uiRange) &&
    Math.abs(prop.uiRange[0]) < RANGE_SENTINEL &&
    Math.abs(prop.uiRange[1]) < RANGE_SENTINEL
  ) {
    meta.uiRange = [prop.uiRange[0], prop.uiRange[1]];
  }

  const unit = prop.baseUnit;
  if (unit && unit !== "none" && unit !== "undefined") {
    meta.unit = String(unit);
  }

  if (typeof prop.decimalPlaces === "number") {
    meta.decimalPlaces = prop.decimalPlaces;
  }
  if (typeof prop.step === "number") {
    meta.step = prop.step;
  }

  // EnumProperty / FlagProperty expose a name->value map in `.values`.
  if (prop.values && typeof prop.values === "object" && !Array.isArray(prop.values)) {
    const items = Object.keys(prop.values);
    if (items.length) {
      meta.enumItems = items;
    }
  }

  return meta;
}

function getListElementStruct(api, dpath) {
  const cb = dpath?.data?.cb;
  if (!cb || typeof cb.getStruct !== "function") {
    return undefined;
  }
  // getStruct(api, list, key); list/key are usually ignored for static defs.
  try {
    const st = cb.getStruct(api, undefined, 0);
    return st && Array.isArray(st.members) ? st : undefined;
  } catch {
    return undefined;
  }
}

function walkStruct(api, struct, prefix, depth, opts, out, visited) {
  if (!struct || !Array.isArray(struct.members)) {
    return;
  }

  for (const dpath of struct.members) {
    const seg = dpath.apiname || dpath.path || "";
    if (!seg) {
      continue; // anonymous member (e.g. list element placeholder)
    }

    const path = prefix ? `${prefix}.${seg}` : seg;

    switch (dpath.type) {
      case DataTypes.PROP: {
        out.push({ path, kind: "prop", indexed: prefix.includes("["), ...readPropMeta(dpath.data) });
        break;
      }

      case DataTypes.STRUCT:
      case DataTypes.DYNAMIC_STRUCT: {
        const dynamic = dpath.type === DataTypes.DYNAMIC_STRUCT;
        out.push({
          path,
          kind: dynamic ? "dynamicStruct" : "struct",
          indexed: prefix.includes("["),
          dynamic,
        });

        const childStruct = dpath.data;
        const seen = visited.has(childStruct);
        if (!seen && depth + 1 <= opts.maxDepth && childStruct && Array.isArray(childStruct.members)) {
          walkStruct(api, childStruct, path, depth + 1, opts, out, new Set(visited).add(childStruct));
        }
        break;
      }

      case DataTypes.ARRAY: {
        out.push({ path, kind: "list", indexed: prefix.includes("[") });

        const elemStruct = getListElementStruct(api, dpath);
        const elemPrefix = `${path}[n]`;
        const seen = elemStruct && visited.has(elemStruct);
        if (elemStruct && !seen && depth + 1 <= opts.maxDepth) {
          walkStruct(api, elemStruct, elemPrefix, depth + 1, opts, out, new Set(visited).add(elemStruct));
        }
        break;
      }

      default:
        break;
    }
  }
}

/**
 * Walk a DataAPI from its root context struct.
 * @returns {Array<{path:string, kind:string, indexed:boolean, propType?:string,
 *   uiname?:string, description?:string, range?:number[], uiRange?:number[],
 *   unit?:string, decimalPlaces?:number, step?:number, enumItems?:string[],
 *   dynamic?:boolean}>}
 */
export function walkAPI(api, opts = {}) {
  const maxDepth = opts.maxDepth ?? 8;
  const root = api?.rootContextStruct;
  const out = [];
  if (!root) {
    return out;
  }
  walkStruct(api, root, "", 0, { maxDepth }, out, new Set([root]));
  return out;
}

/** Stable, index-free path string for matching `foo[0].bar` against `foo[n].bar`. */
export function normalizePath(path) {
  return path.replace(/\[[^\]]*\]/g, "[n]");
}
