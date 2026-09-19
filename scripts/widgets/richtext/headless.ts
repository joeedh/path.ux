// The rich text document without an editor: sessions, history, the markdown model, parsing,
// serializing and source retention, reached as `path.ux/scripts/widgets/richtext/headless` by
// a host that runs documents outside a browser (a node test, an Electron main process). Nothing
// here touches the DOM at import time, and `tests/richtext/headless.test.ts` keeps it so. One
// runtime dependency remains: a document containing HTML parses through `DOMParser`, which a
// headless host has to supply on the global before it opens such a document.
//
// The provider a session needs is the host's: `MarkdownProvider` renders, so it stays in
// `markdown.ts` with the editor, and a headless host passes a provider of its own.

export * from "./provider";
export * from "./context";
export * from "./drafts";
export * from "./widget";
export { ToolStack } from "../../path-controller/toolsys/toolstack";
export * from "./providers/markdown_model";
export { markdownDocFromText } from "./providers/markdown_parse";
export { markdownText, markdownTree } from "./providers/markdown_serialize";
export {
  markdownSourceDoc,
  markdownSourceCommand,
  splitMarkdownSource,
} from "./providers/markdown_source";
