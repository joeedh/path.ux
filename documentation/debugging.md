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
