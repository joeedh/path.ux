import { isAlias, isMap, isNode, isScalar, isSeq, parseDocument, visit } from "yaml";
import type { Node } from "yaml";
import type { FrontmatterCodec } from "../../../scripts/widgets/richtext/form_native";
import { formObject } from "../../../scripts/widgets/richtext/form_schema";
import type { JsonValue } from "../../../scripts/widgets/richtext/provider";
import { widgetJson } from "../../../scripts/widgets/richtext/widget_codec";

function read(source: string) {
  if (new TextEncoder().encode(source).length > 65536)
    throw new Error("Front matter exceeds 64 KiB");
  const opening = /^---[ \t]*\r?\n/.exec(source);
  const closing = /(?:^|\n)(?:---|\.\.\.)[ \t]*$/.exec(source);
  if (!opening || !closing || closing.index < opening[0].length - 1)
    throw new Error("Invalid front-matter delimiters");
  const end = closing.index + (source[closing.index] === "\n" ? 1 : 0);
  const yaml = source.slice(opening[0].length, end);
  const doc = parseDocument(yaml, { strict: true, uniqueKeys: true, schema: "core" });
  if (doc.errors.length || doc.warnings.length) throw new Error("Malformed or unsupported YAML");
  let count = 0;
  visit(doc, (_key, node, path) => {
    if (++count > 10000 || path.length > 32) throw new Error("YAML exceeds depth or node limits");
    if (isAlias(node) || (isNode(node) && (node.tag || ("anchor" in node && node.anchor))))
      throw new Error("YAML aliases, anchors and tags require raw source editing");
  });
  if (doc.contents && !isMap(doc.contents)) throw new Error("Front matter must be a mapping");
  const value = widgetJson(doc.toJS({ maxAliasCount: 0 }) ?? {});
  if (!formObject(value)) throw new Error("Front matter must be an object");
  return { doc, value, yaml, start: opening[0].length, end };
}

function hasComments(node: Node): boolean {
  let found = false;
  visit(node, (_key, value) => {
    if (isNode(value) && (value.comment || value.commentBefore)) found = true;
  });
  return found;
}

/** The example host accepts bounded core YAML and patches supported source ranges only. */
export const exampleYamlCodec: FrontmatterCodec = {
  read: (source) => read(source).value,
  patch(source, input) {
    const values = widgetJson(input);
    if (!formObject(values)) throw new Error("Form values must be an object");
    const { doc, value, yaml, start, end } = read(source);
    const eol = source.includes("\r\n") ? "\r\n" : "\n";
    const edits: { from: number; to: number; text: string }[] = [];
    const replace = (node: unknown, before: JsonValue, after: JsonValue) => {
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      if (!isNode(node) || !node.range) throw new Error("Value has no safe source range");
      if (
        isMap(node) &&
        formObject(before) &&
        formObject(after) &&
        Object.keys(before).join("\0") === Object.keys(after).join("\0")
      ) {
        for (const [key, next] of Object.entries(after))
          replace(node.get(key, true), before[key], next);
        return;
      }
      if (
        isSeq(node) &&
        Array.isArray(before) &&
        Array.isArray(after) &&
        before.length === after.length
      ) {
        after.forEach((next, index) => replace(node.items[index], before[index], next));
        return;
      }
      if (
        (!isScalar(node) && hasComments(node)) ||
        (isScalar(node) && (node.type === "BLOCK_FOLDED" || node.type === "BLOCK_LITERAL"))
      )
        throw new Error("This collection or block scalar requires raw source editing");
      let text = JSON.stringify(after);
      if (isScalar(node) && typeof after === "string" && !/[\r\n]/.test(after)) {
        if (node.type === "QUOTE_SINGLE") text = "'" + after.replaceAll("'", "''") + "'";
        else if (
          node.type === "PLAIN" &&
          /^[A-Za-z_][A-Za-z0-9 _./-]*$/.test(after) &&
          after.trim() === after &&
          parseDocument(after).toJS() === after
        )
          text = after;
      }
      edits.push({ from: node.range[0], to: node.range[1], text });
    };
    for (const [key, before] of Object.entries(value)) {
      if (Object.hasOwn(values, key)) {
        replace(doc.get(key, true), before, values[key]);
      } else {
        const pair = isMap(doc.contents)
          ? doc.contents.items.find((p) => isScalar(p.key) && p.key.value === key)
          : undefined;
        if (
          !pair ||
          !isNode(pair.key) ||
          !pair.key.range ||
          !isNode(pair.value) ||
          !pair.value.range ||
          hasComments(pair.key) ||
          hasComments(pair.value)
        )
          throw new Error("Removing this field requires raw source editing");
        const from = yaml.lastIndexOf("\n", pair.key.range[0] - 1) + 1;
        const newline = yaml.indexOf("\n", pair.value.range[2]);
        const to =
          pair.value.range[2] > 0 && yaml[pair.value.range[2] - 1] === "\n"
            ? pair.value.range[2]
            : newline < 0
              ? yaml.length
              : newline + 1;
        if (yaml.slice(from, pair.key.range[0]).trim())
          throw new Error("Flow-map removal requires raw source editing");
        edits.push({ from, to, text: "" });
      }
    }
    let additions = "";
    for (const [key, next] of Object.entries(values)) {
      if (!Object.hasOwn(value, key))
        additions += `${JSON.stringify(key)}: ${JSON.stringify(next)}${eol}`;
    }
    if (additions && isMap(doc.contents) && doc.contents.flow)
      throw new Error("Flow-map insertion requires raw source editing");
    let patched = yaml;
    for (const edit of edits.sort((a, b) => b.from - a.from))
      patched = patched.slice(0, edit.from) + edit.text + patched.slice(edit.to);
    if (additions) patched += (patched && !patched.endsWith("\n") ? eol : "") + additions;
    const result = source.slice(0, start) + patched + source.slice(end);
    if (JSON.stringify(read(result).value) !== JSON.stringify(values))
      throw new Error("YAML patch did not preserve the requested values");
    return result;
  },
};
