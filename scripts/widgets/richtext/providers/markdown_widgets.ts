import { markdownDocFromText } from "./markdown_parse";
import { moveAtomOp } from "./markdown_image";
import type { WidgetStorage, WidgetSnapshot } from "../plugin_types";
import type { BlockId, BlockSnapshot, DocPos, EditOp } from "../provider";
import type { MdAtom, MdBlock, MdDoc } from "./markdown_model";
import { mdBlock } from "./markdown_model";
import {
  decodeInlineWidget,
  encodeInlineWidget,
  decodeWidgetFence,
  encodeWidgetFence,
} from "../widget_codec";

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
  atInline,
  insertInline(doc, position, record) {
    if (!acceptsInline(doc, position)) return undefined;
    return {
      type     : "insertContent",
      at       : { anchor: position, head: position },
      content  : { blocks: [encodeInlineWidget(record)] },
      newBlocks: [],
    };
  },
  moveInline(doc, expected, position) {
    if (
      expected.placement !== "inline" ||
      expected.offset === undefined ||
      !acceptsInline(doc, position)
    )
      return undefined;
    if (
      position.block === expected.block &&
      (position.offset === expected.offset || position.offset === expected.offset + 1)
    )
      return undefined;
    return moveAtomOp(
      doc.blocks.map((block) => block.id),
      { block: expected.block, offset: expected.offset },
      position
    );
  },
  read(doc, id) {
    for (const block of doc.blocks) {
      for (const atom of block.atoms) {
        const found = inlineSnapshot(block.id, atom);
        if (found?.record.id === id) return found;
      }
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
    if (expected.placement === "inline") {
      const block = structuredClone(doc.blocks[index]);
      const atom = block.atoms.find((atom) => atom.offset === expected.offset);
      if (atom?.widget === undefined) throw new Error("Missing inline widget");
      atom.widget = encodeInlineWidget(record);
      return {
        type  : "replaceBlocks",
        after : doc.blocks[index - 1]?.id ?? null,
        remove: [block.id],
        blocks: [snapshot(block)],
      };
    }
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
    if (expected.placement === "inline" && expected.offset !== undefined)
      return {
        type : "deleteRange",
        range: {
          anchor: { block: expected.block, offset: expected.offset },
          head  : { block: expected.block, offset: expected.offset + 1 },
        },
      };
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
    return content.blocks.flatMap((source) =>
      markdownDocFromText(source).blocks.flatMap((block) => {
        const records = block.atoms.flatMap((atom) => {
          const record = atom.widget === undefined ? undefined : decodeInlineWidget(atom.widget);
          return record ? [record] : [];
        });
        const record = block.kind === "widget" ? decodeWidgetFence(block.source) : undefined;
        return record ? [record, ...records] : records;
      })
    );
  },
};

function atInline(doc: MdDoc, position: DocPos): WidgetSnapshot | undefined {
  const atom = doc.blocks
    .find((block) => block.id === position.block)
    ?.atoms.find((atom) => atom.offset === position.offset);
  return atom ? inlineSnapshot(position.block, atom) : undefined;
}

function inlineSnapshot(block: BlockId, atom: MdAtom): WidgetSnapshot | undefined {
  if (atom.widget === undefined) return undefined;
  const record = decodeInlineWidget(atom.widget);
  return record
    ? Object.freeze({
        placement: "inline",
        block,
        offset  : atom.offset,
        revision: atom.widget,
        record,
      })
    : undefined;
}

function acceptsInline(doc: MdDoc, position: DocPos): boolean {
  const block = doc.blocks.find((block) => block.id === position.block);
  return (
    !!block &&
    ["paragraph", "heading", "quote", "listItem"].includes(block.kind) &&
    Number.isSafeInteger(position.offset) &&
    position.offset >= 0 &&
    position.offset <= block.text.length
  );
}
