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
