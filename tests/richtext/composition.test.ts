import { describe, expect, test } from "vitest";
import { composedEdit, rootReflects } from "../../scripts/widgets/richtext/composition";
import { ATOM_CHAR, CARET_SLOT } from "../../scripts/widgets/richtext/provider";

const KA = String.fromCharCode(0x304b);
const KANJI = String.fromCharCode(0x6f22);
const HA = String.fromCharCode(0xd558);
const HAN = String.fromCharCode(0xd55c);
const NA = String.fromCharCode(0xb098);

interface Case {
  name: string;
  base: string;
  dom: string;
  selection: [number, number];
  expected: ReturnType<typeof composedEdit>;
}

const cases: Case[] = [
  {
    name     : "insertion at the caret",
    base     : "Hello, world.",
    dom      : `Hello,${KANJI} world.`,
    selection: [6, 6],
    expected : { range: [6, 6], text: KANJI },
  },
  {
    name     : "insertion at the end",
    base     : "caf",
    dom      : "café",
    selection: [3, 3],
    expected : { range: [3, 3], text: "é" },
  },
  {
    name     : "replacement of a selection",
    base     : "Hello, world.",
    dom      : `Hello, ${KA}.`,
    selection: [7, 12],
    expected : { range: [7, 12], text: KA },
  },
  {
    name     : "a backward selection reads the same as a forward one",
    base     : "Hello, world.",
    dom      : `Hello, ${KA}.`,
    selection: [12, 7],
    expected : { range: [7, 12], text: KA },
  },
  {
    name     : "a selected edge character that recurs in the composed text is still replaced",
    base     : "aab",
    dom      : "aacb",
    selection: [1, 2],
    expected : { range: [1, 2], text: "ac" },
  },
  {
    name     : "deletion",
    base     : "Hello, world.",
    dom      : "Hello, .",
    selection: [7, 12],
    expected : { range: [7, 12], text: "" },
  },
  {
    name     : "no change",
    base     : "Hello, world.",
    dom      : "Hello, world.",
    selection: [6, 6],
    expected : undefined,
  },
  {
    name     : "no change over a selection",
    base     : "Hello, world.",
    dom      : "Hello, world.",
    selection: [7, 12],
    expected : undefined,
  },
  {
    name     : "a periodic insertion with the caret at 0",
    base     : "abab",
    dom      : "ababab",
    selection: [0, 0],
    expected : { range: [0, 0], text: "ab" },
  },
  {
    name     : "a periodic insertion with the caret at 2",
    base     : "abab",
    dom      : "ababab",
    selection: [2, 2],
    expected : { range: [2, 2], text: "ab" },
  },
  {
    name     : "a periodic insertion with the caret at 4",
    base     : "abab",
    dom      : "ababab",
    selection: [4, 4],
    expected : { range: [4, 4], text: "ab" },
  },
  {
    name     : "a periodic insertion with the caret at 1 is the same text shifted",
    base     : "abab",
    dom      : "ababab",
    selection: [1, 1],
    expected : { range: [1, 1], text: "ba" },
  },
  {
    name     : "the Korean recomposition of the previous syllable",
    base     : `x${HAN}`,
    dom      : `x${HA}${NA}`,
    selection: [2, 2],
    expected : { range: [1, 2], text: `${HA}${NA}` },
  },
  {
    name     : "an inserted atom is refused",
    base     : "ab",
    dom      : `a${ATOM_CHAR}b`,
    selection: [1, 1],
    expected : { refused: "the composed text contains an atom" },
  },
  {
    name     : "an inserted caret slot is refused",
    base     : "ab",
    dom      : `a${CARET_SLOT}b`,
    selection: [1, 1],
    expected : { refused: "the composed text contains a caret slot" },
  },
  {
    name     : "a selected atom typed over is allowed",
    base     : `a${ATOM_CHAR}b`,
    dom      : `a${KA}b`,
    selection: [1, 2],
    expected : { range: [1, 2], text: KA },
  },
  {
    name     : "a change away from the caret is refused",
    base     : "Hello, world.",
    dom      : `Hello, world${KA}.`,
    selection: [2, 2],
    expected : { refused: "the change at 12 is away from the selection at 2" },
  },
  {
    name     : "a change adjacent to the caret is allowed",
    base     : "abc",
    dom      : "aXc",
    selection: [2, 2],
    expected : { range: [1, 2], text: "X" },
  },
];

describe("composedEdit", () => {
  for (const c of cases) {
    test(c.name, () => {
      expect(composedEdit(c.base, c.dom, c.selection)).toEqual(c.expected);
    });
  }

  test("the edit it answers with turns the snapshot into the composed text", () => {
    for (const c of cases) {
      const edit = composedEdit(c.base, c.dom, c.selection);
      if (edit === undefined || "refused" in edit) {
        continue;
      }
      const [from, to] = edit.range;
      expect(c.base.slice(0, from) + edit.text + c.base.slice(to)).toBe(c.dom);
    }
  });
});

describe("rootReflects", () => {
  const root = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div;
  };

  test("holds when the children are the blocks in order", () => {
    expect(
      rootReflects(root('<p data-doc-block="a"></p><p data-doc-block="b">x</p>'), ["a", "b"])
    ).toBe(true);
  });

  test("fails on text outside any block", () => {
    expect(rootReflects(root('<p data-doc-block="a"></p>stray'), ["a"])).toBe(false);
  });

  test("fails when a block is missing or out of order", () => {
    expect(rootReflects(root('<p data-doc-block="a"></p>'), ["a", "b"])).toBe(false);
    expect(
      rootReflects(root('<p data-doc-block="b"></p><p data-doc-block="a"></p>'), ["a", "b"])
    ).toBe(false);
  });

  test("fails on an element that is not a block", () => {
    expect(rootReflects(root('<p data-doc-block="a"></p><br>'), ["a"])).toBe(false);
  });
});
