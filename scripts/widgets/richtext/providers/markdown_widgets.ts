import type { WidgetStorage, WidgetSnapshot } from "../plugin_types";
import type { BlockId, BlockSnapshot, EditOp } from "../provider";
import type { MdBlock, MdDoc } from "./markdown_model";
import { mdBlock } from "./markdown_model";
import { decodeWidgetFence, encodeWidgetFence } from "../widget_codec";

function atBlock(doc: MdDoc, id: BlockId): WidgetSnapshot | undefined {
  const block = doc.blocks.find((block) => block.id === id);
  if (block?.kind !== "widget") return undefined;
  const record = decodeWidgetFence(block.source);
  return record
    ? Object.freeze({ placement: "block", block: id, revision: block.source, record })
    : undefined;
}

const snapshot = (block: MdBlock): BlockSnapshot => ({
  id   : block.id,
  state: structuredClone(block),
});

/** Uses complete block snapshots so replay never needs a plugin implementation. */
export const markdownWidgetStorage: WidgetStorage<MdDoc> = {
  atBlock,
  read(doc, id) {
    for (const block of doc.blocks) {
      if (block.kind !== "widget") continue;
      const record = decodeWidgetFence(block.source);
      if (record?.id === id)
        return Object.freeze({
          placement: "block",
          block    : block.id,
          revision : block.source,
          record,
        });
    }
    return undefined;
  },
  insert(_doc, after, block, record) {
    return {
      type: "replaceBlocks",
      after,
      remove: [],
      blocks: [snapshot(mdBlock(block, { kind: "widget", source: encodeWidgetFence(record) }))],
    };
  },
  update(doc, expected, record) {
    const index = doc.blocks.findIndex((block) => block.id === expected.block);
    return {
      type  : "replaceBlocks",
      after : doc.blocks[index - 1]?.id ?? null,
      remove: [expected.block],
      blocks: [
        snapshot(mdBlock(expected.block, { kind: "widget", source: encodeWidgetFence(record) })),
      ],
    };
  },
  remove(doc, expected) {
    const index = doc.blocks.findIndex((block) => block.id === expected.block);
    return {
      type  : "replaceBlocks",
      after : doc.blocks[index - 1]?.id ?? null,
      remove: [expected.block],
      blocks: [],
    };
  },
  move(doc, expected, after): EditOp {
    const from = doc.blocks.findIndex((block) => block.id === expected.block);
    const to = after === null ? -1 : doc.blocks.findIndex((block) => block.id === after);
    const first = Math.min(from, to + 1);
    const last = Math.max(from, to);
    const span = doc.blocks.slice(first, last + 1);
    const moving = doc.blocks[from];
    const next = span.filter((block) => block !== moving);
    if (to < from) next.unshift(moving);
    else next.push(moving);
    return {
      type  : "replaceBlocks",
      after : doc.blocks[first - 1]?.id ?? null,
      remove: span.map((block) => block.id),
      blocks: next.map(snapshot),
    };
  },
  pasted(content) {
    return content.blocks.flatMap((source) => {
      const record = decodeWidgetFence(source);
      return record ? [record] : [];
    });
  },
};
