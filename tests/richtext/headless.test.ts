// @vitest-environment node

// The rich text document's headless contract: importing scripts/widgets/richtext/headless
// performs no DOM access, so a host can open, edit, undo and serialize a markdown document
// in a node test or an Electron main process. Runs in vitest's node environment, without
// happy-dom, so a module-scope `document` or `HTMLElement` read anywhere in the import graph
// fails this file.
import { expect, test } from "vitest";
import {
  DocumentSession,
  ToolStack,
  markdownSourceCommand,
  markdownSourceDoc,
  markdownText,
} from "../../scripts/widgets/richtext/headless";
import type {
  BlockId,
  BlockSnapshot,
  DocumentProvider,
  EditOp,
  MdBlock,
  MdDoc,
} from "../../scripts/widgets/richtext/headless";

/** A provider that supports only the whole-document replacement a headless host issues. */
class ReplaceOnlyProvider implements DocumentProvider<MdDoc> {
  blocks(doc: MdDoc) {
    return doc.blocks.map((b) => b.id);
  }
  blockText() {
    return "";
  }
  isOpaque() {
    return true;
  }
  marks() {
    return [];
  }
  renderBlock(): HTMLElement {
    throw new Error("headless");
  }
  applyEdit(doc: MdDoc, op: EditOp) {
    if (op.type !== "replaceBlocks") throw new Error(`unsupported edit ${op.type}`);
    const removing = new Set(op.remove);
    const removed = doc.blocks.filter((b) => removing.has(b.id)).map((b) => b.id);
    doc.blocks = doc.blocks.filter((b) => !removing.has(b.id));
    const restored = op.blocks.map((s) => structuredClone(s.state) as MdBlock);
    const index = op.after === null ? 0 : doc.blocks.findIndex((b) => b.id === op.after) + 1;
    doc.blocks.splice(index, 0, ...restored);
    return { dirtyBlocks: restored.map((b) => b.id), removedBlocks: removed };
  }
  inverse(doc: MdDoc, op: EditOp): EditOp {
    if (op.type !== "replaceBlocks") throw new Error(`unsupported edit ${op.type}`);
    return {
      type  : "replaceBlocks",
      after : null,
      blocks: this.snapshots(doc),
      remove: [...this.blocks(doc), ...op.blocks.map((b) => b.id)],
    };
  }
  snapshots(doc: MdDoc, blocks: readonly BlockId[] = this.blocks(doc)): BlockSnapshot[] {
    return blocks.map((id) => ({
      id,
      state: structuredClone(doc.blocks.find((b) => b.id === id)),
    }));
  }
  toClipboard() {
    return { blocks: [] };
  }
  fromClipboard() {
    return undefined;
  }
  emitDocFile(doc: MdDoc) {
    return new Blob([markdownText(doc)], { type: "text/markdown" });
  }
}

const original = "---\nname: Ada # keep\n---\n\n# Ada\n\nSome *prose*.\n";

test("a source-retained document opens, replaces, undoes and serializes without a DOM", async () => {
  // path-controller's polyfill aliases window to globalThis headlessly, so the DOM-absence
  // check is on document
  expect(typeof document).toBe("undefined");
  expect(typeof HTMLElement).toBe("undefined");

  const doc = markdownSourceDoc(original);
  expect(doc.blocks[0].kind).toBe("frontmatter");
  expect(markdownText(doc)).toBe(original);

  const stack = new ToolStack();
  const session = new DocumentSession(doc, new ReplaceOnlyProvider(), stack);
  const ctx = { api: {} as never, screen: {} as never, state: {}, toolstack: stack };
  const edited = original.replace("Some *prose*.", "More prose.");
  const result = await session.command(markdownSourceCommand(session.doc, original, edited), ctx);
  expect(result.status).toBe("applied");
  expect(markdownText(session.doc)).toBe(edited);
  expect(session.revision).toBe(1);

  const stale = await session.command(markdownSourceCommand(session.doc, original, edited), ctx);
  expect(stale.status).toBe("refused");

  await stack.undo();
  expect(markdownText(session.doc)).toBe(original);
  await stack.redo();
  expect(markdownText(session.doc)).toBe(edited);

  expect((await session.prepareSave()).status).toBe("ready");
});
