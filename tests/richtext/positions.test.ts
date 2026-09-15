import { describe, expect, test } from "vitest";
import {
  blockElement,
  fromDocPos,
  mapThroughPending,
  toDocPos,
  type PendingDocView,
} from "../../scripts/widgets/richtext/positions";
import {
  CARET_SLOT,
  type DocPos,
  type EditOp,
  type ProviderContext,
} from "../../scripts/widgets/richtext/provider";
import { PlainProvider, type PlainDoc } from "../../scripts/widgets/richtext/providers/plain";

const ATOM = '<span data-doc-atom="" contenteditable="false"><img alt="x">chip</span>';
const SLOT = CARET_SLOT;

interface Fixture {
  name: string;
  html: string;
  /** The flattened text the block should map over. */
  text: string;
}

const handBuilt: Fixture[] = [
  {
    name: "one atom",
    html: `<p data-doc-block="atom">ab${SLOT}${ATOM}${SLOT}cd</p>`,
    text: "ab*cd",
  },
  {
    name: "adjacent atoms",
    html: `<p data-doc-block="atoms">${SLOT}${ATOM}${SLOT}${ATOM}${SLOT}x</p>`,
    text: "**x",
  },
  {
    name: "atom at the end",
    html: `<p data-doc-block="tail">ab${SLOT}${ATOM}${SLOT}</p>`,
    text: "ab*",
  },
  {
    name: "empty block",
    html: `<p data-doc-block="empty">${SLOT}</p>`,
    text: "",
  },
  {
    name: "marks three deep",
    html: '<p data-doc-block="deep">a<b>b<i>c<u>de</u>f</i>g</b>h</p>',
    text: "abcdefgh",
  },
];

const OPAQUE =
  '<div data-doc-block="table" contenteditable="false"><table><tr><td>1</td></tr></table></div>';

function makeRoot(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

const ctx = undefined as unknown as ProviderContext;

function renderedRoot() {
  const provider = new PlainProvider();
  const doc: PlainDoc = {
    blocks: [
      {
        id   : "a",
        text : "Hello world",
        marks: [
          { from: 0, to: 5, name: "bold" },
          { from: 3, to: 8, name: "italic" },
          { from: 4, to: 6, name: "underline" },
        ],
      },
      { id: "b", text: "", marks: [] },
    ],
  };
  const root = document.createElement("div");
  for (const id of provider.blocks(doc)) {
    root.append(provider.renderBlock(doc, id, ctx));
  }

  return { root, doc };
}

/** Every DOM position of a block in document order, atom subtrees excluded. */
function domPositions(el: Element) {
  const out: { node: Node; offset: number }[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      const data = (node as Text).data;
      for (let i = 0; i <= data.length; i++) {
        out.push({ node, offset: i });
      }
      return;
    }
    if ((node as Element).hasAttribute("data-doc-atom")) {
      return;
    }
    out.push({ node, offset: 0 });
    node.childNodes.forEach((child, i) => {
      visit(child);
      out.push({ node, offset: i + 1 });
    });
  };
  visit(el);

  return out;
}

describe("round trips", () => {
  test.each(handBuilt)("$name", ({ html, text }) => {
    const root = makeRoot(html);
    const el = root.firstElementChild!;
    const block = el.getAttribute("data-doc-block")!;

    for (let offset = 0; offset <= text.length; offset++) {
      const dom = fromDocPos(root, { block, offset });
      expect(dom).toBeDefined();
      expect(toDocPos(root, dom!.node, dom!.offset)).toEqual({ block, offset });
    }

    // every DOM position maps into range, and the map is monotonic in document order
    let last = -1;
    for (const { node, offset } of domPositions(el)) {
      const pos = toDocPos(root, node, offset);
      expect(pos?.block).toBe(block);
      expect(pos!.offset).toBeGreaterThanOrEqual(0);
      expect(pos!.offset).toBeLessThanOrEqual(text.length);
      expect(pos!.offset).toBeGreaterThanOrEqual(last);
      last = pos!.offset;
    }
  });

  test("blocks rendered by the plain provider", () => {
    const { root, doc } = renderedRoot();

    for (const b of doc.blocks) {
      for (let offset = 0; offset <= b.text.length; offset++) {
        const dom = fromDocPos(root, { block: b.id, offset });
        expect(toDocPos(root, dom!.node, dom!.offset)).toEqual({ block: b.id, offset });
      }
    }
  });
});

describe("toDocPos", () => {
  test("a text offset inside nested marks", () => {
    const root = makeRoot(handBuilt[4].html);
    const u = root.querySelector("u")!;
    expect(toDocPos(root, u.firstChild!, 1)).toEqual({ block: "deep", offset: 4 });
    expect(toDocPos(root, u, 1)).toEqual({ block: "deep", offset: 5 });
  });

  test("a child index on the block element", () => {
    const root = makeRoot(handBuilt[0].html);
    const p = root.firstElementChild!;
    // innerHTML merges each slot into its neighbouring text: "ab"+slot, atom, slot+"cd"
    expect(p.childNodes.length).toBe(3);
    expect(toDocPos(root, p, 0)).toEqual({ block: "atom", offset: 0 });
    expect(toDocPos(root, p, 1)).toEqual({ block: "atom", offset: 2 });
    expect(toDocPos(root, p, 2)).toEqual({ block: "atom", offset: 3 });
    expect(toDocPos(root, p, 3)).toEqual({ block: "atom", offset: 5 });
  });

  test("a position inside an atom maps to just before it", () => {
    const root = makeRoot(handBuilt[0].html);
    const chip = root.querySelector("[data-doc-atom]")!;
    expect(toDocPos(root, chip.lastChild!, 2)).toEqual({ block: "atom", offset: 2 });
  });

  test("an opaque block answers 0 or 1", () => {
    const root = makeRoot(OPAQUE);
    const div = root.firstElementChild!;
    const td = root.querySelector("td")!;
    expect(toDocPos(root, div, 0)).toEqual({ block: "table", offset: 0 });
    expect(toDocPos(root, div, 1)).toEqual({ block: "table", offset: 1 });
    expect(toDocPos(root, td.firstChild!, 0)).toEqual({ block: "table", offset: 1 });
  });

  test("a node outside every block maps to nothing", () => {
    const root = makeRoot('<p data-doc-block="a">x</p><span>outside</span>');
    const span = root.querySelector("span")!;
    expect(toDocPos(root, span.firstChild!, 2)).toBeUndefined();
    expect(toDocPos(root, document.createTextNode("loose"), 0)).toBeUndefined();
  });

  test("a block element under another root is not ours", () => {
    const root = makeRoot('<p data-doc-block="a">x</p>');
    const other = makeRoot('<p data-doc-block="a">y</p>');
    expect(toDocPos(root, other.firstElementChild!.firstChild!, 0)).toBeUndefined();
  });
});

describe("fromDocPos", () => {
  test("an offset beside an atom lands on the slot side of the merged text", () => {
    const root = makeRoot(handBuilt[0].html);
    const p = root.firstElementChild!;
    expect(fromDocPos(root, { block: "atom", offset: 2 })).toEqual({
      node  : p.childNodes[0],
      offset: 2,
    });
    expect(fromDocPos(root, { block: "atom", offset: 3 })).toEqual({
      node  : p.childNodes[2],
      offset: 0,
    });
  });

  test("separate slot nodes, as the provider renders them", () => {
    const root = document.createElement("div");
    const p = document.createElement("p");
    p.setAttribute("data-doc-block", "built");
    const atom = document.createElement("span");
    atom.setAttribute("data-doc-atom", "");
    atom.setAttribute("contenteditable", "false");
    atom.textContent = "chip";
    p.append("ab", SLOT, atom, SLOT, "cd");
    root.append(p);

    expect(fromDocPos(root, { block: "built", offset: 2 })).toEqual({
      node  : p.childNodes[0],
      offset: 2,
    });
    expect(fromDocPos(root, { block: "built", offset: 3 })).toEqual({
      node  : p.childNodes[3],
      offset: 0,
    });
    for (let offset = 0; offset <= 5; offset++) {
      const dom = fromDocPos(root, { block: "built", offset })!;
      expect(toDocPos(root, dom.node, dom.offset)).toEqual({ block: "built", offset });
    }
  });

  test("between adjacent atoms lands in the slot between them", () => {
    const root = makeRoot(handBuilt[1].html);
    const p = root.firstElementChild!;
    expect(fromDocPos(root, { block: "atoms", offset: 1 })).toEqual({
      node  : p.childNodes[2],
      offset: 0,
    });
  });

  test("an empty block lands in its slot", () => {
    const root = makeRoot(handBuilt[3].html);
    const p = root.firstElementChild!;
    expect(fromDocPos(root, { block: "empty", offset: 0 })).toEqual({
      node  : p.firstChild,
      offset: 0,
    });
  });

  test("an atom with nothing beside it returns the parent and child index", () => {
    const root = makeRoot(`<p data-doc-block="bare">ab${ATOM}cd</p>`);
    const p = root.firstElementChild!;
    expect(fromDocPos(root, { block: "bare", offset: 2 })).toEqual({
      node  : p.childNodes[0],
      offset: 2,
    });
    expect(fromDocPos(root, { block: "bare", offset: 3 })).toEqual({
      node  : p.childNodes[2],
      offset: 0,
    });
  });

  test("an offset past the end clamps to the last text node", () => {
    const root = makeRoot(handBuilt[4].html);
    const p = root.firstElementChild!;
    expect(fromDocPos(root, { block: "deep", offset: 99 })).toEqual({
      node  : p.lastChild,
      offset: 1,
    });
  });

  test("an opaque block returns its root", () => {
    const root = makeRoot(OPAQUE);
    const div = root.firstElementChild!;
    expect(fromDocPos(root, { block: "table", offset: 0 })).toEqual({ node: div, offset: 0 });
    expect(fromDocPos(root, { block: "table", offset: 1 })).toEqual({ node: div, offset: 1 });
  });

  test("an unrendered block maps to nothing", () => {
    const root = makeRoot('<p data-doc-block="a">x</p>');
    expect(fromDocPos(root, { block: "zzz", offset: 0 })).toBeUndefined();
    expect(blockElement(root, "a")?.tagName).toBe("P");
  });
});

describe("mapThroughPending", () => {
  const texts: Record<string, string> = { a: "Hello world", b: "second line", c: "third" };
  const view: PendingDocView = { blocks: ["a", "b", "c"], blockText: (id) => texts[id] };
  const pos = (block: string, offset: number): DocPos => ({ block, offset });
  const caret = (block: string, offset: number) => ({
    anchor: pos(block, offset),
    head  : pos(block, offset),
  });
  const map = (p: DocPos, ...ops: EditOp[]) => mapThroughPending(p, ops, view);

  test("insertText shifts positions at and after the insertion", () => {
    const op: EditOp = { type: "insertText", at: caret("a", 5), text: "!!" };
    expect(map(pos("a", 4), op)).toEqual(pos("a", 4));
    expect(map(pos("a", 5), op)).toEqual(pos("a", 7));
    expect(map(pos("a", 11), op)).toEqual(pos("a", 13));
    expect(map(pos("b", 5), op)).toEqual(pos("b", 5));
  });

  test("insertText over a range replaces it first", () => {
    const op: EditOp = {
      type: "insertText",
      at  : { anchor: pos("a", 8), head: pos("a", 2) },
      text: "X",
    };
    expect(map(pos("a", 5), op)).toEqual(pos("a", 3));
    expect(map(pos("a", 10), op)).toEqual(pos("a", 5));
  });

  test("deleteRange within a block", () => {
    const op: EditOp = { type: "deleteRange", range: { anchor: pos("a", 2), head: pos("a", 6) } };
    expect(map(pos("a", 1), op)).toEqual(pos("a", 1));
    expect(map(pos("a", 4), op)).toEqual(pos("a", 2));
    expect(map(pos("a", 9), op)).toEqual(pos("a", 5));
  });

  test("deleteRange across blocks moves the tail into the start block", () => {
    const op: EditOp = { type: "deleteRange", range: { anchor: pos("c", 2), head: pos("a", 6) } };
    expect(map(pos("a", 9), op)).toEqual(pos("a", 6));
    expect(map(pos("b", 4), op)).toEqual(pos("a", 6));
    expect(map(pos("c", 1), op)).toEqual(pos("a", 6));
    expect(map(pos("c", 4), op)).toEqual(pos("a", 8));
  });

  test("splitBlock moves positions past the split into the new block", () => {
    const op: EditOp = { type: "splitBlock", at: pos("a", 5), newBlock: "n" };
    expect(map(pos("a", 3), op)).toEqual(pos("a", 3));
    expect(map(pos("a", 5), op)).toEqual(pos("n", 0));
    expect(map(pos("a", 8), op)).toEqual(pos("n", 3));
  });

  test("joinWithPrevious moves positions after the previous block's text", () => {
    const op: EditOp = { type: "joinWithPrevious", block: "b" };
    expect(map(pos("b", 3), op)).toEqual(pos("a", 14));
    expect(map(pos("a", 3), op)).toEqual(pos("a", 3));
    expect(map(pos("a", 0), { type: "joinWithPrevious", block: "a" })).toEqual(pos("a", 0));
  });

  test("insertContent with one line is an insertion", () => {
    const op: EditOp = {
      type     : "insertContent",
      at       : caret("a", 5),
      content  : { blocks: ["XYZ"] },
      newBlocks: [],
    };
    expect(map(pos("a", 6), op)).toEqual(pos("a", 9));
  });

  test("insertContent with three lines moves the tail into the last new block", () => {
    const op: EditOp = {
      type     : "insertContent",
      at       : caret("b", 6),
      content  : { blocks: ["X", "Y", "Z"] },
      newBlocks: ["n1", "n2"],
    };
    expect(map(pos("b", 3), op)).toEqual(pos("b", 3));
    expect(map(pos("b", 8), op)).toEqual(pos("n2", 3));
  });

  test("toggleMark and replaceBlocks leave positions alone", () => {
    expect(map(pos("a", 3), { type: "toggleMark", range: caret("a", 1), mark: "bold" })).toEqual(
      pos("a", 3)
    );
    expect(
      map(pos("a", 3), { type: "replaceBlocks", after: null, blocks: [], remove: ["b"] })
    ).toEqual(pos("a", 3));
  });

  test("a custom op moves positions by its shifts and by nothing else", () => {
    const custom = (delta: number): EditOp => ({
      type  : "custom",
      name  : "prefix",
      blocks: ["a"],
      data  : {},
      shifts: [{ block: "a", at: 0, delta }],
    });

    expect(map(pos("a", 3), custom(2))).toEqual(pos("a", 5));
    expect(map(pos("a", 3), custom(-2))).toEqual(pos("a", 1));
    expect(map(pos("a", 1), custom(-2))).toEqual(pos("a", 0));
    expect(map(pos("b", 3), custom(2))).toEqual(pos("b", 3));
    expect(
      map(pos("a", 3), { type: "custom", name: "upper", blocks: ["a"], data: { touch: ["a"] } })
    ).toEqual(pos("a", 3));

    // a later op sees the length the shift changed
    expect(map(pos("b", 1), custom(2), { type: "joinWithPrevious", block: "b" })).toEqual(
      pos("a", 14)
    );
  });

  test("a queue is applied in order, tracking the lengths earlier ops changed", () => {
    // type two characters, split at the caret, then join the new block back
    const typed = pos("a", 5);
    expect(
      map(
        typed,
        { type: "insertText", at: caret("a", 5), text: "!!" },
        { type: "splitBlock", at: pos("a", 7), newBlock: "n" },
        { type: "joinWithPrevious", block: "n" }
      )
    ).toEqual(pos("a", 7));

    // a join whose previous block grew from a pending insert
    expect(
      map(
        pos("b", 1),
        { type: "insertText", at: caret("a", 11), text: "abc" },
        { type: "joinWithPrevious", block: "b" }
      )
    ).toEqual(pos("a", 15));
  });
});
