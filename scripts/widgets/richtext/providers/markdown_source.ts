import { markdownDocFromText } from "./markdown_parse";
import type { MarkdownParseOptions } from "./markdown_parse";
import { markdownText } from "./markdown_serialize";
import { markdownBodyKey, mdBlock } from "./markdown_model";
import type { MdDoc } from "./markdown_model";
import { newBlockId } from "../provider";
import type { DocumentCommand } from "../widget";

/** Splits a front-matter prefix without interpreting YAML or normalizing line endings. */
export function splitMarkdownSource(source: string) {
  const prefix = /^(?:\uFEFF)?(?:[ \t]*\r?\n)*/.exec(source)![0];
  const rest = source.slice(prefix.length);
  const match = /^---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?=\r?\n|$)/.exec(rest);
  if (!match)
    return {
      prefix     : source.startsWith("\uFEFF") ? "\uFEFF" : "",
      frontmatter: "",
      separator  : "",
      body       : source.replace(/^\uFEFF/, ""),
    };
  const tail = rest.slice(match[0].length);
  const separator = /^(?:[ \t]*\r?\n)*/.exec(tail)![0];
  return { prefix, frontmatter: match[0], separator, body: tail.slice(separator.length) };
}

/**
 * Opts a document into exact untouched-body and front-matter source retention. The body is
 * kept as written until a block changes, so a source read under `softBreaks: "reflow"` keeps
 * its wrapped lines on disk until the first edit, which writes the paragraphs reflowed.
 */
export function markdownSourceDoc(source: string, options: MarkdownParseOptions = {}): MdDoc {
  const split = splitMarkdownSource(source);
  const repairs: { from: number; to: number; source: string }[] = [];
  const doc = markdownDocFromText(
    split.frontmatter + split.separator + split.body,
    newBlockId,
    (from, to, source) => repairs.push({ from, to, source }),
    options
  );
  const bodyStart = split.frontmatter.length + split.separator.length;
  const unmappedRepair = repairs.some((repair) => repair.from < 0);
  for (const repair of repairs.filter((repair) => repair.from >= 0).reverse()) {
    split.body =
      split.body.slice(0, repair.from - bodyStart) +
      repair.source +
      split.body.slice(repair.to - bodyStart);
  }
  if (!doc.blocks.length) doc.blocks.push(mdBlock(newBlockId(), { kind: "paragraph" }));
  if (!split.frontmatter && doc.blocks[0].kind === "frontmatter")
    doc.blocks[0] = { ...doc.blocks[0], kind: "raw" };
  const front = doc.blocks[0]?.kind === "frontmatter" ? doc.blocks[0] : undefined;
  if (split.frontmatter && !front) {
    split.body = split.frontmatter + split.separator + split.body;
    split.frontmatter = "";
    split.separator = "";
  }
  if (front) front.source = split.frontmatter;
  const body = front ? doc.blocks.slice(1) : doc.blocks;
  if (unmappedRepair) split.body = markdownText({ blocks: body });
  const retained = {
    prefix   : split.prefix,
    separator: split.frontmatter ? split.separator : source.includes("\r\n") ? "\r\n\r\n" : "\n\n",
    body     : split.body,
    bodyKey  : markdownBodyKey(body),
    eol      : source.includes("\r\n") ? "\r\n" : "\n",
  };
  doc.blocks[0].retainedSource = retained;
  if (front && body[0]) body[0].retainedSource = retained;
  return doc;
}

/** Replaces raw source under a whole-document precondition, with source in both snapshots. */
export function markdownSourceCommand(
  doc: MdDoc,
  expected: string,
  source: string,
  options: MarkdownParseOptions = {}
): DocumentCommand {
  const next = markdownSourceDoc(source, options);
  return {
    resolve: () =>
      markdownText(doc) === expected
        ? {
            type  : "replaceBlocks",
            after : null,
            remove: doc.blocks.map((b) => b.id),
            blocks: next.blocks.map((b) => ({ id: b.id, state: structuredClone(b) })),
          }
        : undefined,
  };
}
