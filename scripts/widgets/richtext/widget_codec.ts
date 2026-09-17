import type { JsonValue } from "./provider";
import type { WidgetRecord } from "./plugin_types";

export { WIDGET_CLIPBOARD_MIME } from "./widget_mime";
const MAX_BYTES = 65536;
export const INLINE_WIDGET_MAX_SOURCE = MAX_BYTES * 2 + 256;
const NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TYPE = /^[a-zA-Z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+)+$/;
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);

/** Validates and freezes a detached JSON value without invoking getters or serializers. */
export function widgetJson(value: unknown, maxBytes = MAX_BYTES): JsonValue {
  let nodes = 0;
  let characters = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++nodes > 10000 || depth > 32)
      throw new Error("Widget JSON exceeds its depth or node limit");
    characters += typeof value === "string" ? value.length : 1;
    if (characters > maxBytes) throw new Error("Widget JSON exceeds its byte limit");
    if (typeof value === "string" && value.length > maxBytes)
      throw new Error("Widget string is oversized");
    if (value === null || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "object" || ancestors.has(value))
      throw new Error("Widget values must be JSON");
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error("Widget objects must be plain JSON");
    ancestors.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result: JsonValue[] | Record<string, JsonValue> = Array.isArray(value) ? [] : {};
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== "string" || FORBIDDEN.has(key)) throw new Error("Unsafe widget key");
      if (Array.isArray(value) && key === "length") continue;
      characters += key.length;
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !("value" in descriptor))
        throw new Error("Widget JSON cannot contain accessors");
      if (Array.isArray(result)) {
        if (key !== String(result.length)) throw new Error("Widget arrays must be dense");
        result.push(visit(descriptor.value, depth + 1));
      } else result[key] = visit(descriptor.value, depth + 1);
    }
    if (Array.isArray(value) && Array.isArray(result) && value.length !== result.length)
      throw new Error("Widget arrays must be dense");
    ancestors.delete(value);
    return Object.freeze(result);
  };
  const result = visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(result)).length > maxBytes)
    throw new Error("Widget JSON exceeds its byte limit");
  return result;
}

function object(value: JsonValue): value is Record<string, JsonValue> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Checks the portable envelope independently of registry membership and payload support. */
export function widgetRecord(value: unknown): WidgetRecord {
  const json = widgetJson(value);
  if (
    !object(json) ||
    Object.keys(json).sort().join(",") !== "id,payload,type,version" ||
    typeof json.id !== "string" ||
    !NAME.test(json.id) ||
    typeof json.type !== "string" ||
    !TYPE.test(json.type) ||
    json.type.length > 128 ||
    typeof json.version !== "number" ||
    !Number.isSafeInteger(json.version) ||
    json.version < 1 ||
    json.version > 2147483647
  ) {
    throw new Error("Invalid widget envelope");
  }
  return json as unknown as WidgetRecord;
}

/** Bounds nesting and allocation before JSON.parse materializes a document payload. */
function parseJson(text: string, limit: number): JsonValue {
  if (text.length > limit || new TextEncoder().encode(text).length > limit)
    throw new Error("Widget JSON is oversized");
  let depth = 0;
  let tokens = 0;
  let quoted = false;
  let escaped = false;
  let stringStart = 0;
  const keys: (Set<string> | undefined)[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') {
        quoted = false;
        let next = index + 1;
        while (/\s/.test(text[next] ?? "")) next++;
        if (text[next] === ":") {
          const key = JSON.parse(text.slice(stringStart, index + 1)) as string;
          const current = keys.at(-1);
          if (!current || current.has(key)) throw new Error("Duplicate JSON member");
          current.add(key);
        }
      }
    } else if (char === '"') {
      quoted = true;
      stringStart = index;
      tokens++;
    } else if (char === "{" || char === "[") {
      if (++depth > 32) throw new Error("Widget JSON is too deep");
      keys.push(char === "{" ? new Set() : undefined);
      tokens++;
    } else if (char === "}" || char === "]") {
      depth--;
      keys.pop();
    } else if (char === "," || char === ":") tokens++;
    if (tokens > 30000) throw new Error("Widget JSON has too many tokens");
  }
  const parsed: unknown = JSON.parse(text);
  return widgetJson(parsed, limit);
}

/** Decodes only a closed, exact v1 fence; unsupported source remains the provider's data. */
export function decodeWidgetFence(source: string): WidgetRecord | undefined {
  if (source.length > MAX_BYTES * 3 + 256) return undefined;
  const match = /^(`{3,}|~{3,})pathux-widget-v1[ \t]*\r?\n([\s\S]*)\r?\n\1[ \t]*$/.exec(source);
  if (!match) return undefined;
  try {
    return widgetRecord(parseJson(match[2], MAX_BYTES));
  } catch {
    return undefined;
  }
}

/** Emits a fence longer than every run of backticks in the bounded canonical JSON. */
export function encodeWidgetFence(record: WidgetRecord): string {
  const text = JSON.stringify(widgetRecord(record));
  let length = 3;
  for (const match of text.matchAll(/`+/g)) length = Math.max(length, match[0].length + 1);
  const fence = "`".repeat(length);
  return `${fence}pathux-widget-v1\n${text}\n${fence}`;
}

/** Changes only the top-level ID token, preserving unknown payload source byte for byte. */
export function reidentifyWidgetFence(source: string, id: string): string {
  if (!decodeWidgetFence(source) || !NAME.test(id)) throw new Error("Invalid widget source or ID");
  let depth = 0;
  const start = source.indexOf("\n") + 1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{" || source[i] === "[") depth++;
    else if (source[i] === "}" || source[i] === "]") depth--;
    else if (source[i] === '"') {
      const tokenStart = i++;
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") i++;
        i++;
      }
      const token = source.slice(tokenStart, i + 1);
      if (depth !== 1 || JSON.parse(token) !== "id") continue;
      let p = i + 1;
      while (/\s/.test(source[p] ?? "")) p++;
      if (source[p++] !== ":") continue;
      while (/\s/.test(source[p] ?? "")) p++;
      const valueStart = p++;
      while (p < source.length && source[p] !== '"') {
        if (source[p] === "\\") p++;
        p++;
      }
      return source.slice(0, valueStart) + JSON.stringify(id) + source.slice(p + 1);
    }
  }
  throw new Error("Widget ID is missing");
}

export type WidgetTransferItem = { text: string } | { widget: WidgetRecord };

/** Encodes ordered blocks for capable providers; text items are lossless source fallbacks. */
export function encodeWidgetTransfer(blocks: readonly WidgetTransferItem[]): string {
  if (blocks.length > 1024) throw new Error("Too many clipboard blocks");
  const source = JSON.stringify(
    widgetJson({ format: "pathux-widgets", version: 1, blocks }, 262144)
  );
  if (!decodeWidgetTransfer(source)) throw new Error("Invalid clipboard transfer");
  return source;
}

export function decodeWidgetTransfer(source: string): readonly WidgetTransferItem[] | undefined {
  try {
    const value = parseJson(source, 262144);
    if (
      !object(value) ||
      value.format !== "pathux-widgets" ||
      value.version !== 1 ||
      Object.keys(value).sort().join(",") !== "blocks,format,version" ||
      !Array.isArray(value.blocks) ||
      value.blocks.length > 1024
    )
      return undefined;
    return value.blocks.map((entry) => {
      if (!object(entry) || Object.keys(entry).length !== 1)
        throw new Error("Invalid clipboard entry");
      if (typeof entry.text === "string") return { text: entry.text };
      return { widget: widgetRecord(entry.widget) };
    });
  } catch {
    return undefined;
  }
}

/** Encodes bounded JSON as hexadecimal UTF-8 inside a reserved inline token. */
export function encodeInlineWidget(record: WidgetRecord): string {
  return inlineJson(JSON.stringify(widgetRecord(record)));
}

function inlineJson(json: string): string {
  const hex = Array.from(new TextEncoder().encode(json), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return "{{pathux-widget-v1:" + hex + "}}";
}

/** Recognizes bounded reserved containers, including malformed and future envelopes. */
export function isInlineWidget(source: string): boolean {
  return (
    source.length <= INLINE_WIDGET_MAX_SOURCE &&
    /^\{\{pathux-widget-v[0-9]+:[A-Za-z0-9%_.~-]*\}\}$/.test(source)
  );
}

function inlineJsonText(source: string): string {
  const hex = source.slice(19, -2);
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) throw new Error("Invalid inline encoding");
  const bytes = Uint8Array.from(hex.match(/../g)!, (pair) => Number.parseInt(pair, 16));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Decodes only the current container and validates the portable record independently. */
export function decodeInlineWidget(source: string): WidgetRecord | undefined {
  if (!isInlineWidget(source) || !source.startsWith("{{pathux-widget-v1:")) return undefined;
  try {
    return widgetRecord(parseJson(inlineJsonText(source), MAX_BYTES));
  } catch {
    return undefined;
  }
}

/** Changes an inline ID without normalizing unknown payload JSON. */
export function reidentifyInlineWidget(source: string, id: string): string {
  if (!decodeInlineWidget(source)) throw new Error("Invalid inline widget");
  const json = inlineJsonText(source);
  let fence = "```";
  while (json.includes(fence)) fence += "`";
  const updated = reidentifyWidgetFence(fence + "pathux-widget-v1\n" + json + "\n" + fence, id);
  return inlineJson(updated.slice(updated.indexOf("\n") + 1, updated.lastIndexOf("\n")));
}
