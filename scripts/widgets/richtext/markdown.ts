// The markdown side of the rich text editor, reached as `path.ux/scripts/widgets/richtext/markdown`
// and never through the `pathux` barrel, so an app that does not edit markdown does not bundle
// the mdast chain.

import { markdownDocFromText } from "./providers/markdown_parse";
import { markdownText } from "./providers/markdown_serialize";
import { MarkdownProvider } from "./providers/markdown_provider";
import { RichTextArea } from "./textarea";
import type { MdDoc } from "./providers/markdown_model";

export * from "./providers/markdown_model";
export { markdownDocFromText } from "./providers/markdown_parse";
export type { MarkdownParseOptions } from "./providers/markdown_parse";
export { markdownText, markdownTree } from "./providers/markdown_serialize";
export { sanitizeAttrs, sanitizeStyle, safeUrl } from "./providers/markdown_html";
export { MarkdownProvider } from "./providers/markdown_provider";
export type { MarkdownProviderOptions, WikilinkStart } from "./providers/markdown_provider";
export { markdownOps } from "./providers/markdown_ops";
export type { MdKindTarget } from "./providers/markdown_ops";
export { TableEditor } from "./table_editor";
export type { TableAdapter, TableSnapshot } from "./table_editor";
export { changeTable } from "./table_model";
export type { TableModel, TableChange } from "./table_model";
export {
  parseMarkdownTable,
  serializeMarkdownTable,
  tableCommand,
} from "./providers/markdown_table";
export { renderMarkdownBlock, markdownStyles } from "./providers/markdown_render";
export type { MarkdownRenderOptions } from "./providers/markdown_render";
export { MdImageWidget, ImageResizeOp, ImageMoveOp } from "./providers/markdown_image";
export { LinkPopup, openLinkPopup, setLinkOp } from "./link_popup";
export { ToolButton, addSeparator, addToolButton } from "./providers/toolbar";
export type { LinkEdit } from "./link_popup";

RichTextArea.registerFormat<MdDoc>("markdown", {
  provider: () => new MarkdownProvider(),
  fromText: (text) => markdownDocFromText(text),
  toText  : (doc) => markdownText(doc),
});
