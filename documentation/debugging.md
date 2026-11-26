# Debugging guide

Lessons learned while debugging path.ux, one entry per symptom. Add to it when a bug cost
more than a few minutes to find.

## A "Paste" button keeps appearing at the caret in Firefox

- **Symptom.** A small dark "Paste" bubble pops up at the caret every few hundred
  milliseconds while the page has focus, in any editable and in none in particular.
- **Cause.** `scripts/config/const.ts` polls `navigator.clipboard.read()` so number sliders
  and the colour picker can paste from other apps. Firefox 127 and later answer every
  `read()` with that button instead of a permission prompt, and Firefox throws on the
  `clipboard-read` permission query, so the "permission API unsupported" branch used to
  start the poller unconditionally.
- **Fix.** Where the permission query is unsupported, nothing polls; the app's own copies
  still work through `setClipboardData`. Chromium keeps polling while permission is granted.
- **Workaround while debugging.** `about:config`, `dom.events.asyncClipboard.clipboardItem`
  to false removes `navigator.clipboard.read`, and the poller no-ops.
- **How to tell it is not your widget.** The rich text editor and every other widget paste
  through the `beforeinput` or `paste` event's `DataTransfer`, which never prompts. Grep for
  `clipboard.read` before suspecting a widget.

## A widget has a description but never shows a tooltip

- **Symptom.** `elem.description` reads back the text, `useNativeToolTips` is false, the
  pointer rests on the widget, and no `pathux-tool-tip-x` popup appears. Under native
  tooltips the same widget shows one, because `setDescription` writes `title` directly.
- **Cause.** The widget's `update()` does not chain `super.update()`. `UIBase.update` is
  what installs the own-tooltip hover handlers and pops the tip after 500 ms, and it is
  also what builds the path watchers. `Button.update` skipped the chain from the day it was
  written, so every `Button` and `ToolButton` in own-tooltip mode was mute.
- **How to tell.** In the console, `elem._has_own_tooltips` is undefined after a hover; a
  chained widget has it set. `elem.ctx.screen.pickElement(x, y) === elem` and
  `elem._tooltip_ref` are the next things to check, in that order.
- **Locating the popup from a test.** The registered tag carries the `pathux-` prefix, so
  `page.locator("pathux-tool-tip-x div")`; the text is in the shadow root's `div`, not in
  the host's `textContent`.

## Embedded controls lose focus or restart an iframe

Keeping an element reference does not preserve browser state when its subtree detaches.
Use `moveBefore()` between connected parents. Remove obsolete wrappers only after all affected
mounts have moved; removing the source block first breaks cross-block moves. The local
experiment is in buildtools/richtext-movement.mjs. Widget acceptance also checks a canvas-fed
video inside an opted-in local iframe. Hold ordinary reconciliation during composition;
policy invalidation cancels the mounted generation.

Serve parallel browser fixtures from an in-memory bundle per worker. Writing every worker's
bundle to the same path can serve a partial script and look like intermittent missing controls.

A newer pnpm can try reinstalling before running scripts. Set the process-local
`pnpm_config_verify_deps_before_run=false` to use installed dependencies; do not accept a
module-directory purge merely to run tests.

### GFM cells and browser clipboard fixtures

GFM `tableCell.position` spans separator pipes. To retain inline source, slice between the
first and last inline child's positions; an empty cell has no children. Using the cell's
outer range duplicates separators when serialized. Test code spans with escaped pipes,
empty cells, body rows shorter than the header, and rows with extra authored cells.

Firefox's constructed `ClipboardEvent` ignores a DataTransfer supplied by its initializer.
The original DataTransfer retains text while `event.clipboardData.getData()` is empty. For
synthetic clipboard routing tests, define the event's `clipboardData` property explicitly.
Also test real keyboard copy/paste in Chromium so fixture behavior cannot mask clipboard
ownership failures.

A clipboard table at the first entry used to be spliced into paragraph text, which discarded
its opaque kind when the paragraph was nonempty. Table clipboard parsing now reserves empty
prose entries at the outer edges. The existing editor allocator supplies IDs for the table
and suffix before dispatch, so snapshots and redo include all blocks. Exercise a real paste
into the middle of text; testing only adoption by an empty paragraph misses this loss.

## Reserved Markdown widget source

The Markdown parser normalizes line endings before mdast assigns offsets. Retaining a
reserved fence verbatim requires mapping those offsets back to the original source. Track
CRLF positions and count preceding pairs with a binary search; slicing normalized text loses
unsupported payload formatting. Duplicate-ID repair should replace only the envelope ID
token, rather than parsing and reserializing an unavailable plugin payload.

Browser fixture readiness must include completion of fixture initialization. A visible first
editor does not prove later sessions initialized; a missing required block-ID factory can
throw after the first view appears. Typecheck fixtures before running their browser cases.

Markdown browser screenshots use `test.info().outputPath()` so each project and case writes
its own artifacts. Repeated Windows runs could fail with an `UNKNOWN` file-open error while
overwriting shared tracked PNGs even when their attributes and ACL allowed writes. Per-test
output also keeps diagnostics from changing the repository's committed screenshots.

## Form drafts and retained Markdown source

Form field parsing and full schema validation serve different purposes. Saving an empty
required answer must not invoke a schema transform or write defaults. Preserve untouched
authored keys, encode only edited controls, and return transformed values only from explicit
validation. A plugin draft must return the exact prepared command from its scoped host;
wrapping that command breaks the host's command-identity check.

Retained source must travel with provider snapshots to survive undo. Keep a copy on the
first body block as well as front matter so deleting metadata does not normalize an untouched
body. Exclude runtime media IDs when comparing body projections: mounting an image allocates
an ID without editing authored content. Strip retention metadata when serializing a clipboard
fragment, or a copied block may acquire the document BOM or unrelated source.

Empty YAML front matter has adjacent opening and closing delimiter lines. A splitter that
requires another newline between them misclassifies the prefix. Test empty metadata,
metadata without a final newline, CRLF, BOM/blank prefixes, and duplicate plugin ID repairs.
Source retention must include those repairs or saving restores duplicate IDs that the parser
already fixed in its projected blocks.

### Optional schema adapters

nstructjs 0.8.12 exposes parsed fields through `manager.get_struct(name)` and numeric type
identifiers through `parser.StructEnum`. Its JSON reader constructs classes and can apply
migrations, so schema-only forms should inspect metadata without invoking readers. Optional
values accept null as well as absence. General JSON integer validation does not enforce every
binary type's range; the form adapter must state its numeric boundary policy explicitly.
The package ships type declarations for its internal modules without corresponding standalone
JavaScript files. Derive descriptor types from `NStructInterface` and use the public runtime
exports instead of importing a nonexistent internal JavaScript module.

Struct helper tokens extend to the end of their line. Put fixture fields and the closing
brace on separate lines when checking helper diagnostics; otherwise a parser failure can hide
the adapter behavior being tested. The example YAML codec expects complete front-matter
separators, even in isolated projection tests.

Schema migration must settle drafts before capturing its source snapshot. A document operation
can replace the schema and answers together, but the application must also invalidate views
when undo or redo restores a different schema. Compare schema descriptions rather than all
answer values so ordinary field edits preserve mounted controls and focus.

### External widget resources

Keep external form drafts registered with the session, but refuse their save preparation.
A document save barrier must never call a remote write. A form submission carries its
resource version and, when fetched separately, its schema version; adopting a conflict's
new version would permit a stale retry to overwrite current values.

Guard the validation phase as well as the transport phase against repeated submissions.
Two click handlers can await validation together before either sets a transport-busy flag.
A handler that returns from the second validation must not clear the first request's busy
state in `finally`. The external view uses a separate validation guard and tests rapid clicks.

Cancellation should race the transport promise so a service that ignores `AbortSignal` cannot
hold the view indefinitely. Remove abort listeners when cancellation settles, reject late data
by record and generation, and keep detached drafts discardable even if disposal interrupted a
pending request. An aborted remote write can already have committed; show its uncertain outcome
and require host-side version/idempotency handling rather than replaying it through undo.

A failed schema refresh must disable the previously loaded form. Keeping its old fields visible
is useful for diagnosis, but they cannot remain writable against an unsupported newer schema.
Likewise, an offline document snapshot is readable data, not a fresh external write baseline.

### Inline widget source and caret boundaries

Tokenize reserved inline syntax before Markdown unescapes text. Searching decoded text can
activate an escaped token or associate it with a later identical source occurrence. Use a raw
micromark token with source positions, and test escaped braces and character references beside
an active token. Adjacent code spans merge at their backticks; braced hexadecimal tokens avoid
that boundary problem without inserting document characters.

An inline widget exits to its atom offset, not its containing block's edge. Backward Tab enters
the last focusable control; a test expecting the first input would incorrectly report a focus
failure. Both directions need assertions over document positions and control focus.

## Menus: submenus that close on the way to them

A parent menu holds the hover on an open submenu's row while the pointer is inside a
triangle toward the submenu (`scripts/menu/menu_aim.ts`). Set
`window.DEBUG.drawMenuTri = true` to draw it. A triangle hidden behind the menu means the
overlay's z-index was lowered: menus float inside popups at `ZIndexes.popup`, not
`ZIndexes.menu`.

## Building many sliders at once is slow

Profile the build with the DevTools Performance panel or a CDP `Profiler` session. Forced
layout shows up as `getBoundingClientRect` or `offsetHeight` self time under a widget's
`_redraw`. A redraw that reads layout costs one synchronous layout per widget, because the
style writes in between invalidate it each time.

`NumSlider._redraw` used to call `overArrow` on every redraw, and `overArrow` reads the
slider's bounding rect. `_redraw` needs that result to pick the arrow colors on hover and
the pressed state, but every pointer event already passes through `setMpos`, which caches
it in `_last_overarrow`. `_redraw` now reads that cache. A slider is also redrawn about 15
times while its container builds, so a read that looks cheap in one redraw is multiplied
by that.

`tests/numslider_arrows.test.ts` covers both halves: the arrow hover highlight, and that
`_redraw` doesn't call `getBoundingClientRect`.

## Vector inputs of a node are back at their defaults after a load

- **Symptom.** A node's vec2, vec3, vec4, quat or matrix inputs hold the definition's defaults
  after a file load, an undo that restores a snapshot, or `copyGraph`. Float inputs and the
  node's `props` keep their values, and the saved bytes are correct.
- **Cause.** `Node._loadSockets` read the value, let the definition's `defaultProp` overwrite
  the property with `copyTo`, and wrote the value back. `getValue` on these properties returns
  the property's own object, and their `copyTo` loads into that object, so the value written
  back was already the default.
- **Fix.** The value is read from a copy of the property.
- **How to tell.** `prop.getValue() === prop.data` is true for every such property. Code that
  keeps a value across `copyTo` has to copy the value first. The `keeps its value on load`
  tests in `tests/graph_node.test.ts` cover each type.

## An idle node editor keeps syncing its graph

- **Symptom.** A node editor with many nodes uses a lot of CPU while nothing happens, and panning
  and slider drags stutter. `syncGraph` shows up in an idle CPU profile.
- **Cause.** `DataPathWatcher.check` compared the stored snapshot with the live value. A graph's
  `[CreateSnapshot]` returns an array, which is never equal to the graph, so every poll called
  back.
- **Fix.** A new snapshot is compared with the stored one. An object that was replaced counts as a
  change too.
- **How to tell.** Wrap the watcher's callback and count calls while idle. The test "a view resyncs
  when the graph's structure changed" in `tests/nodeeditor_view.test.ts` does that. A snapshot now
  has to hold everything its watchers react to. If a view stops following a change, look in
  `Node.structureSnapshot` first.

## Panning a page with many canvases is slow

- **Symptom.** A trace shows nearly the whole frame in `Layerize`, under
  `PaintArtifactCompositor::Update`, with little script time.
- **Cause.** Chromium gives each accelerated 2D canvas a compositor layer, and what overlaps one
  gets a layer too. 1,000 sliders made 1,890 layers.
- **Fix.** Small widgets get their context from `widgetContext2D`, which asks for a software
  canvas.
- **How to tell.** Count the layers of `LayerTree.layerTreeDidChange`, and ask
  `LayerTree.compositingReasons` about one of them. Reload the page before each variant: after a
  while the page can become fast by itself, which makes every variant look like a fix.

## A copied node editor's group designer refuses every edit

- **Symptom.** After an area with a `NodeEditor` is split while a definition is open, the copy's
  designer adds and removes no sockets. The original works.
- **Cause.** `copy()` gives the new editor its graph and level before `init`. `init` built the
  designer before the view was initialized, so the designer held no context, and nothing built it
  again.
- **Fix.** `init` builds the designer after `view.checkInit()` (PR #24).
- **How to tell.** Use the copy, not the original. A host's fields on the view (`delegate`,
  `nodeItems`, `socketTypes`, `lazyEditors`) have to be set before `super.init()` for the same
  reason, since `copy()` doesn't carry them. The last test in `tests/nodeeditor_menu_hooks.test.ts`
  covers both.

## A refused Delete drops the redo steps

- **Symptom.** After an undo, pressing Delete or Shift+D on nodes that are all refused leaves the
  graph as it was, but redo does nothing.
- **Cause.** `ToolOpDelegate.undoStepEnd` ran the gesture's macro even when it held no tools. An
  empty macro is still an undo entry, and adding one drops the redo entries.
- **Fix.** `undoStepEnd` skips an empty macro (PR #24).
- **How to tell.** Compare `toolstack.length` and `toolstack.cur` before and after the gesture.
  `tests/nodeeditor_proxies.test.ts` does that.

## The node editor stops taking input after a failed delete

- **Symptom.** After a Delete, the editor ignores every key and click.
- **Cause.** `AsyncGateOp` holds a modal lock during a gesture's undo step. When `undoStepEnd`
  threw, the `finally` block stopped before `modalEnd`. A delegate whose check accepts an edit that
  the op's `canRun` refuses makes `undoStepEnd` throw, since the macro's `canRun` refuses it whole.
- **Fix.** `AsyncGateOp` catches that error, always ends, and rejects the gesture's promise with it
  (PR #24).
- **How to tell.** `ctx.toolstack.modalRunning` stays above 0 after the gesture. The last test in
  `tests/nodeeditor_proxies.test.ts` covers it.

## An enum dropdown lists numbers, and picking an entry stores its name

- **Symptom.** A dropdown for a numeric TypeScript `enum` lists "0" and "1" next to the real
  names. Picking an entry can store the member's name, a string, in place of its number.
- **Cause.** `enum Mode { A = 0 }` compiles to `{ A: 0, "0": "A" }`. `EnumPropertyBase` took every
  entry as a value, so `"0"` became one whose value is `"A"`.
- **Fix.** `stripEnumReverseMapping` (path-controller) leaves the reverse entries out, and the enum
  and flag properties apply it to what they are given.
- **How to tell.** Look at `prop.values` of the path: a key that is a number with a string value
  is a reverse entry. `tests/toolprop_enum_reverse.test.ts` covers the property and the dropdown.
