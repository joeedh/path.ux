[x]: the 'replace' popup menu should not popup in a mode where
pointer up closes the menu.
[x]: default values for sockets should be editable right next to the node
sockets they belong to, as is the case with most node editors.
[x]: holding shift and dragging a node should drag all selected nodes, if
the node is already selected it should not deselected if it dragged.
[x]: you should be able to select node edges.
[x]: value sockets in the node editor in the example app
constantly flash between 0 and the real value.
[x]: the height of nodes occasionally grows 2x then snaps back
[x]: add a delete hotkey in the node editor binding to the delete
node toolop.
[x]: split scripts/core/ui_base.ts into scripts/core/base/, per
documentation/plans/ui-base-split-plan.md.
[ ]: thread the Container DataPrefix type parameter through the child
containers (RowFrame, ColumnFrame, PanelFrame, TwoColumnFrame,
TableFrame) so con.row().prop(...) keeps strict valid-datapath
checking instead of dropping to suffix matching. See CLAUDE.md
"Data-path prefixes".
[x]: resynchronize setPathValueUndo with the async toolstack
(regression from 336424c), per documentation/plans/toolsys-tasks.md
task 0.
[x]: fold DataPathSetOp writes onto the toolstack (foldOrExec), per
documentation/plans/datapath-set-fold.md.
[x]: bind tool defaults per DataAPI instead of per process, per
documentation/plans/per-api-structs.md (task 2). Landed narrowed, as the
plan recommended: the registry follows its built APIs and the
useGlobalRegistry opt-out got real per-api storage, rather than
_map_structs going per-api.
[x]: move ToolClasses/ToolPaths/MacroClasses onto a ToolRegistry with the
module globals as its default instance, per
documentation/plans/tool-registry.md (task 3).
[x]: give ModelInterface an ordered list of registries plus a merged
toolpath table, move the tool-defaults binding onto the api, and pin and
document the macro defaults policy, per
documentation/plans/per-api-tool-tables.md.
[x]: give menu items a disabled state and let ToolOp.canRun return a refusal
sentence, per documentation/plans/menu-item-disabling.md.
[x]: rich text editing over a document provider (beforeinput, DocEditOp,
per-document toolstacks), per documentation/plans/rich-text-provider.md and
its tasklist rich-text-provider-tasks.md. IME is a follow-up plan, written as
the tasklist's last task.
[x]: accept IME and dead-key composition in rich-text-x, per
documentation/plans/rich-text-ime.md (four stages). All four done: the editor
accepts composition on desktop and Android (Samsung Keyboard recorded), and
stage 4 needed no code. Gboard and macOS remain unrecorded but are expected to
work; their manual steps stay in documentation/richtext.md.
[x]: remove the docs system (simple_docsys, servers/rpc.js, DocsBrowser and
the pathux_with_docbrowser bundle, the example docs pane, both lib/tinymce
trees, and the marked/parse5/diff dependencies), per
documentation/plans/rich-text-provider-tasks.md task 3.
[x]: rich text provider protocol for the markdown work (stage 1 of
documentation/plans/rich-text-markdown.md): custom ops, the editor bridge,
provider toolbars, readOnly, viewState, session.dispatch and typed change
notification.
[x]: markdown model, parse and serialize (stage 2 of the same plan):
`richtext/markdown.ts` with the mdast chain as the library's first runtime
dependencies, the HTML table and sanitizer, and a fixture corpus that round
trips.
[x]: the markdown provider (stage 3 of the same plan): `MarkdownProvider`
and the block renderer behind `richtext/markdown.ts`, the `markdown` format
registered on `RichTextArea`, rich text theme keys, a bare Markdown tab in
the example, and the markdown Playwright spec in Chromium and Firefox.
[x]: the markdown toolbar and inline editors (stage 4 of the same plan):
`buildToolbar` with the kind dropdown, mark, list and Link buttons, the
`link-popup-x` link editor, `md-image-x` with its modal resize and move ops,
their theme keys, the Playwright tests and screenshots, and the Electron
pass.
[x]: markdown binding, example and docs (stage 5 of the same plan):
`RichTextArea.format` from the property's `richTextFormat`, the example's
Markdown tab with its outline, Read-only toggle, Save and status line, and
the rich text doc's Render-only, Link clicks and Markdown sections. Stages
6 and 7 (the optional follow-ups and the syntax reference) remain.
[ ]: better wrappers around the web file system APIs, to cover what
simple_docsys did for locally served, Electron and NW.js apps. Unrelated to
the rich text work; noted here so it is not lost when simple_docsys goes.
