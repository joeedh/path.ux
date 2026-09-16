import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { markdownDocFromText, markdownText } from "../../scripts/widgets/richtext/markdown";
import type { MdBlock } from "../../scripts/widgets/richtext/markdown";

// The syntax guide is the fixture: every markdown fence in it is parsed, and the
// `<!-- expect: … -->` comment under the fence names what the prose around it claims.

const GUIDE = join(import.meta.dirname, "../../documentation/markdown_syntax.md");

interface Sample {
  line: number;
  source: string;
  kinds: string;
  marks: string;
  images?: number;
  out: "same" | "next";
}

/** The guide's markdown fences in order, each with the expectation written under it. */
function samples(): Sample[] {
  const text = readFileSync(GUIDE, "utf8").replace(/\r\n/g, "\n");
  const out: Sample[] = [];
  const fence = /^(`{3,})markdown\n([\s\S]*?)\n\1\n((?:\n|<!--[^\n]*-->\n)*)/gm;

  for (const m of text.matchAll(fence)) {
    const line = text.slice(0, m.index).split("\n").length;
    const expect = /<!-- expect: (.*?) -->/.exec(m[3]);
    if (expect === null) {
      throw new Error(`markdown_syntax.md:${line}: fence has no expect comment`);
    }

    const fields = new Map<string, string>();
    for (const field of expect[1].split(";")) {
      const [key, value] = field.trim().split("=");
      fields.set(key, value);
    }
    const kinds = fields.get("kinds");
    const marks = fields.get("marks");
    const outMode = fields.get("out");
    if (kinds === undefined || marks === undefined || (outMode !== "same" && outMode !== "next")) {
      throw new Error(`markdown_syntax.md:${line}: expect needs kinds, marks and out=same|next`);
    }

    const images = fields.get("images");
    out.push({
      line,
      source: `${m[2]}\n`,
      kinds,
      marks,
      images: images === undefined ? undefined : Number(images),
      out   : outMode,
    });
  }

  return out;
}

/** The guide's name for a block: its kind, with a heading's level and an item's or quote's depth. */
function kindToken(b: MdBlock): string {
  switch (b.kind) {
    case "heading":
      return `heading${b.level}`;
    case "listItem": {
      const base = b.task ? (b.checked ? "task-done" : "task") : b.ordered ? "numbered" : "bullet";
      return b.depth > 0 ? `${base}@${b.depth}` : base;
    }
    case "quote":
      return b.depth > 0 ? `quote@${b.depth}` : "quote";
    default:
      return b.kind;
  }
}

describe("markdown_syntax.md", () => {
  const all = samples();

  test("the guide holds samples", () => {
    expect(all.length).toBeGreaterThan(20);
  });

  test.each(all.map((s, i) => [s.line, s, all[i + 1]] as const))(
    "the fence at line %i parses as its prose says",
    (_line, sample, next) => {
      const doc = markdownDocFromText(sample.source);

      expect(doc.blocks.map(kindToken).join(",")).toBe(sample.kinds);

      const names = [...new Set(doc.blocks.flatMap((b) => b.marks.map((m) => m.name)))].sort();
      expect(names.length === 0 ? "none" : names.join(",")).toBe(sample.marks);

      if (sample.images !== undefined) {
        expect(doc.blocks.reduce((n, b) => n + b.atoms.length, 0)).toBe(sample.images);
      }

      const written = markdownText(doc);
      if (sample.out === "same") {
        expect(written).toBe(sample.source);
      } else {
        expect(next, "out=next needs a following fence").toBeDefined();
        expect(written).toBe(next!.source);
      }
    }
  );
});
