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
