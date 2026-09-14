# Rich text: accepting composition (IME and dead keys)

Task 4 of [rich-text-provider-tasks.md](rich-text-provider-tasks.md). Lifts the composition
refusal that [rich-text-provider.md](rich-text-provider.md) put in scope's "out" column, so an
IME commit and a dead-key accent reach the document as ordinary edits. Read that design's
"What the browser still does", "Position mapping" and the Findings first; this plan assumes
them.

Status: written and pressure tested (18 findings, all folded in; see the end). Not started.
Stage status is recorded under each stage as it lands.

## What the browsers do

Chromium was recorded through CDP (`playwright/richtext/composition.spec.ts`, header comment),
Firefox by hand on Windows 11 (tasklist, task 2 stage 5). The two agree on the shape and differ
in the order:

- `insertCompositionText` is never cancelable. The browser mutates the DOM under the caret for
  every update and for the commit, whatever `preventDefault` says.
- The commit never arrives as `insertText`. It is one more `insertCompositionText` carrying
  the committed text (Chromium sends a `compositionupdate` before it, Firefox does not), then
  `compositionend` whose `data` repeats the committed text.
- An abandoned composition is an `insertCompositionText` with empty `data`, then
  `compositionend` with `data: ""`. `deleteCompositionText` was never seen.
- Chromium fires `compositionend` after the commit's `input`; Firefox fires it before, the
  spec order. In Chromium the DOM holds the committed text at `compositionend`. In Firefox the
  commit's mutation precedes `compositionend` too, with one `input` still to come; whether an
  abandoned composition's text is gone from the DOM by `compositionend` in Firefox is not
  recorded, and stage 1 records it.
- Korean, one observation (`ㅜ` then `ㅑ`, two vowels that cannot combine): each keystroke was
  its own composition, the next key committed the previous one and opened a new one, and Space
  committed and then arrived as an ordinary `insertText` with a space. Whether a combining
  sequence (`han` then `a`, where the final consonant moves to the next syllable) re-opens
  composition over the committed syllable is not recorded.
- The CDP dead-key scenario is synthetic: the spec sends `´` then `é` itself. Whether a real
  US-International dead key on Windows goes through composition at all is not recorded. On
  Windows the keyboard layout composes dead keys before the browser sees a key, so it may
  arrive as a plain `insertText`; macOS composes them as marked text.

Assumed, not recorded, and marked where the plan leans on them:

- Replacing the element under a composition cancels the composition in Chromium. The render
  hold below rests on this.
- Android: Gboard keeps a word in composition until a space, edits it with Backspace, and
  re-opens composition over an already-committed word when the caret lands in it. Stage 4
  rests on this and waits for stage 1.
- macOS press-and-hold accents may arrive as composition or as `insertReplacementText` over
  the base letter. Safari is unrecorded on either platform.

## Approach: reconcile the composed block at `compositionend`

The editor lets the browser compose, and at `compositionend` reads what the composition did to
the one block it happened in, expressed as an ordinary `EditOp`, and submits that through the
same path a keystroke takes. Nothing new reaches the provider.

- At `compositionstart` the editor takes a snapshot in DOM coordinates: the composed block's
  id, its flattened text read by the same walk the position map uses (atoms count one
  `ATOM_CHAR`, caret slots count nothing), the selection as `domRange()` reads it, unmapped,
  the list of ops pending at that moment, and a frozen `PendingDocView` (block order and every
  block's text as `view()` answers then). It does not end the typing run.
- At `compositionend` it flattens the block again, diffs against the snapshot text, and gets one
  replaced range and one inserted string in snapshot coordinates. The op is `insertText { at:
range, text }` when text was inserted, `deleteRange` when only text went away, and nothing
  when the two texts are equal.
- The range is mapped through every op that was pending at the snapshot plus every op submitted
  during the composition, resolved or not, against the frozen view. Those ops are the ones the
  composed block's DOM does not reflect: a result that arrived during the composition changed
  the document but its render was held. The mapping is the existing `PendingMapper` fed that
  list and that view instead of `pending` and live `view()`.
- The op is submitted through `submit()`, so a collapsed insertion folds into the typing run in
  progress: `café` typed on US-International is one undo entry, and Ctrl+Z after `abc` then a
  Japanese commit undoes all of it as one run. A replacement (a non-collapsed range) ends the
  run, as it does for typing over a selection.
- The provider applies it as any `insertText`: marks at a collapsed caret extend as they do for
  typing, a replaced range takes the marks the provider gives a replacement. The tasklist's
  sketch of a `replaceBlockText` op with marks carried over by offset is not needed, since
  the diff turns the composition back into the edit it was and mark handling is already the
  provider's for that edit. Recorded as a deviation from the sketch.
- The `EditResult` re-renders the block and places the caret, as for every edit. Between
  `compositionend` and the result the DOM shows the browser's version, which is the same
  text, so there is no flicker.

Invariant, stated because the rest of the editor assumes its opposite: outside a composition,
the DOM reflects the document before any pending op, and every DOM-derived position maps
through `pending`. During a composition, and from `compositionend` until the composition op
renders, the composed block's DOM is ahead of that: it reflects the snapshot plus the browser's
edits, and then the composition op as well. So:

- Each `pending` entry carries a `reflected` flag. The composition op is pushed with it set and
  the mapper skips reflected ops. A position read from the block between `compositionend` and
  the render, which is where the next Korean `compositionstart`, a click and the toolbar all
  read, is not shifted by an op the DOM already contains.
- During the composition, DOM-derived positions in the composed block go through the snapshot's
  frozen view and op list, never through live `view()` and `pending`.

The refusal path stays as the fallback, and the `refused` event with it. It now fires only when
the reconcile cannot vouch for what the browser did, and it reconciles the whole root rather
than one block: every root child must be a block element and their ids must equal
`view().blocks` in order, else `renderAll()` runs and the caret is clamped into the document.
That covers a composition that landed text outside any block, a selection across blocks that
the browser joined, and a held removal of the composed block.

### The diff, precisely

`composedEdit(base, dom, selection)` in `scripts/widgets/richtext/composition.ts`, a pure
function over two strings and the snapshot selection `[selStart, selEnd]`, unit tested on its
own:

- `p` is the longest common prefix, `s` the longest common suffix not overlapping `p`. The
  minimal edit replaces `[p, base.length - s)` with `dom.slice(p, dom.length - s)`.
- The range is seeded with the selection: `start = min(p, selStart)`, `end = max(base.length -
s, selEnd)`, inserted text `dom.slice(start, dom.length - (base.length - end))`. The browser
  deletes the selection on the first update, and the minimal diff undercounts the replaced
  range whenever the selection's edge characters recur in the composed text (`aab` with the
  middle `a` selected, composed `ac`: minimal says insert `c` at 2 and the old `a` keeps its
  marks; seeded says replace `[1,2)` with `ac`, which is what typing does).
- When the inserted text is periodic the edit can sit at more than one start (`abab` to
  `ababab` is `ab` at 0, 2 or 4, and `ba` at 1 or 3). The set of starts that produce `dom` is
  a contiguous interval; the one nearest `selStart` is taken, with the inserted text recomputed
  as `dom.slice(start, start + insertedLength)` for that start. Moving the start without
  recomputing the text corrupts the block.
- Verification, all of which must hold or the reconcile refuses: the inserted text contains no
  `ATOM_CHAR` and no `CARET_SLOT`; the replaced range contains the snapshot caret or is
  adjacent to it (a Korean recomposition of the previous syllable is a `[k-1, k)` replacement
  and passes); the composed block is the only block whose text differs from the frozen view.
- A replaced range that covers an `ATOM_CHAR` is allowed: the selection at `compositionstart`
  covered an atom and the composition replaced it, which is what typing over that selection
  does too.

### During the composition

- `beforeinput` while `composing` returns without calling `preventDefault` and without
  mapping. A cancelable `beforeinput` inside a composition (Gboard's Backspace, an IME's own
  `deleteContentBackward`) must reach the DOM, since the diff is the handler for it.
- Every other input path returns early while `composing`, or when the event carries
  `isComposing`: the `keydown` shortcuts (Escape, Tab, Ctrl+Z/Y, Ctrl+Shift+S), the toolbar's
  `toggleMark`, and cut in `onCopy`. On Windows these keys arrive as `Process` during an IME
  session; on macOS and Linux they do not, so the guard is needed. `selectionchange` is
  already ignored while composing.
- Results that arrive while composing, own or from another editor over the session, apply to
  the document as always, but three things are held for the composed block: its render, its
  removal, and the result's `selection`. `docChanged`'s own caret restore is held for the same
  reason. Other blocks render at once. The browser owns the composed element and the caret
  until `compositionend`.
- `onCompositionEnd` calls `observer.takeRecords()` first. In Firefox the commit's mutation
  records are queued before `compositionend` and delivered after the listener returns, when
  `composing` is already false; the current refusal path avoids the false positive the same
  way.
- A held render is discharged by the composition op's own result, which re-renders the block.
  When there is no op and a render was held, the block is re-rendered at `compositionend` and
  the caret restored through the map. When the composition op fails in `commit`, the editor
  takes the refusal path instead of dropping the op, since the DOM has text the document
  lacks and every later position in the block would be off.
- The mutation observer keeps ignoring records while `composing`. The reconcile replaces it for
  the duration: a composition that did anything other than edit one region of one block fails
  verification and is refused with the records logged.

### Answers the tasklist asked for

- **Marks in a marked run.** The composition becomes `insertText` at the snapshot caret, so the
  provider extends marks exactly as for a keystroke there. `PlainProvider`'s existing rule
  (`from < pos <= to`) applies; no new mark logic.
- **The pending queue.** Ops pending at `compositionstart` and ops submitted during the
  composition resolve as they do now; only their DOM writes to the composed block are held. The
  composition op's range is mapped through all of them against the frozen view, so order is
  kept whether or not the toolstack was held. Nothing waits on the composition.
- **The observer.** Ignored during composition; verification and the root reconcile instead.
- **Android.** Under the assumption above, every keystroke inside a word is a composition
  update, so the document lags the DOM by a word until the space. That is accepted for the
  first landing: undo granularity is the word, a second editor over the session sees the word
  when it commits. A per-update commit is sketched in stage 4 and waits on the recording.
- **`replaceBlockText` and atoms.** No such op. Atoms inside a composed block are untouched
  (they are `contenteditable="false"` and the walk counts them as one character on both
  sides of the diff); an atom inside the replaced range is a selected atom being typed over.

## Stages

Each stage is one commit, records its status here, and holds the same gates as the tasklist:
`pnpm run typecheck`, `pnpm run test`, `pnpm run lint:check`, `pnpm run format:check` at the
recorded baseline, and `pnpm exec playwright test` for the stages that touch the spec (restore
`playwright/screenshots/` afterwards).

### Stage 1 — ground truth for what is not yet recorded

- The recorder in `playwright/richtext/composition.ts` also captures the target's text at
  `compositionstart` and `compositionend`, not only at `input`, and a console-pasteable form of
  it goes into `documentation/richtext.md` so the manual runs produce the same lines.
- Record on Chromium through CDP and on Firefox by hand, into the tasklist's stage 5 note:
  - a real US-International dead key on Windows (`'` then `e`), which decides whether stage 3's
    dead-key test is a composition at all;
  - Korean `han` then `a`, the combining case;
  - Escape mid-composition in Firefox, reading the target text at `compositionend`.
- Manual steps for Android (Chrome via `chrome://inspect` over USB, Gboard: type a word,
  Backspace inside it, tap into a committed word and change it) and for macOS press-and-hold.
  Stage 4 waits on the Android one; nothing else waits on this stage's macOS result.

### Stage 2 — the diff

- `scripts/widgets/richtext/composition.ts`: `composedEdit(base, dom, selection)` returning
  `{ range: [start, end], text }` or a refusal reason; the seeding, the interval-of-starts rule,
  and the string-level verification (`ATOM_CHAR`, `CARET_SLOT`, adjacency).
- `tests/richtext/composition.test.ts`, table-driven: insertion at the caret; replacement of a
  selection, including the `aab` case; deletion; no change; `abab` to `ababab` with the caret
  at 0, at 2 and at 4; an inserted `ATOM_CHAR` refused; a replaced atom allowed; a change not
  adjacent to the caret refused; text that is not in any block, handled by the root reconcile.

### Stage 3 — the editor accepts composition

- `positions.ts` exports the block text walk (`blockTextOf(element)`), `PendingMapper` takes
  its op list and view as parameters, and `pending` entries carry `reflected`.
- `onCompositionStart` takes the snapshot (block, text, unmapped selection, pending list, frozen
  view) and no longer calls `endRun`.
- `applyResult` and `docChanged` hold the composed block's render, its removal, and every caret
  write while composing; `commit`'s catch takes the refusal path for a composition op.
- `onBeforeInput`, `onKeyDown`, `toggleMark` and `onCopy` return early while composing.
- `onCompositionEnd`: `takeRecords()`, flatten, `composedEdit`, map through the snapshot's op
  list against the frozen view, push as reflected and submit, or re-render, or refuse through
  the root reconcile.
- `playwright/richtext/composition.spec.ts`, the `rich-text-x` half: the three CDP scenarios
  now assert the committed text is in the document as one undo entry, the caret sits after it,
  and no `refused` fired; the abandoned one asserts nothing changed and no `refused`. Added:
  composing inside a bold run extends bold; composing over a selection replaces it; `caf` typed
  then a composed `é` is one undo entry, or a plain `é` keystroke if stage 1 shows Windows
  dead keys never compose; a composition while the toolstack is held (`protect`) with one
  keystroke pending, the hold released between the last update and the commit, lands after the
  keystroke; two compositions back to back with no render between them, the Korean shape; the
  second editor over the session shows the commit.
- `documentation/richtext.md`: the composition section describes acceptance and the fallback;
  the manual steps flip to expecting the text to land, one undo entry, no `refused`. The
  example page's label that says composition is refused goes.
- `rich-text-provider.md`: the `mapInput` table row and "What the browser still does" gain a
  sentence pointing here; the Scope bullet moves composition from out to in with the fallback
  stated.

### Stage 4 — Android, after stage 1's recording

- Decide from the recording whether word-level latency is acceptable or a per-update commit is
  needed. If needed: on each `compositionupdate` run the diff against the previous update, apply
  the op to the document through the toolstack, and skip the DOM write when the block's
  flattened DOM already equals the document's new text, so the composition is not cancelled;
  marks may render stale until `compositionend` re-renders.
- Each update replaces the previous composed text, which is a non-collapsed `insertText`, and
  `submit` ends the run for those while `foldFrom` concatenates only collapsed inserts. So a
  per-update word is one undo entry only if each update is expressed as a delete of the
  changed tail plus a collapsed insert, or `DocEditOp` gains a fold rule for a replacement
  whose range ends at the head's run anchor. Decide which with the recording in hand.
- If the recording shows Gboard re-opening composition over committed text with a selection the
  editor did not make, the snapshot's selection comes from `getTargetRanges()` on the first
  `insertCompositionText` when the browser supplies one.

## Risks

- **The diff misattributes a composition that also normalizes text elsewhere in the block**
  (a browser collapsing whitespace or merging text nodes). The flattened walk ignores node
  structure, so only character changes count, and any change outside one region fails
  verification and refuses rather than corrupting. Loud, not wrong.
- **Holding a render during a long composition shows stale marks** from an op that resolved
  meanwhile. Text is right, since the browser's edit sits on the text the op produced; only
  styling lags until `compositionend`. Accepted.
- **Firefox's trailing `input` after our re-render.** Not seen to do anything in stage 5's run;
  the composition spec cannot cover Firefox, so the manual steps keep the check.
- **The reconcile reads the DOM instead of `compositionend.data`.** The event's `data` names
  the committed text and nothing else. When a composition replaces existing text, only the
  diff can say which text. The editor logs `data` alongside the diff so a mismatch between the
  two is visible.
- **The render hold rests on an assumption** (replacing the composed element cancels the
  composition). If it is wrong the hold is merely unnecessary; nothing corrupts.

## Pressure test

A fresh-context agent found 18 problems against the code and the recordings. All accepted and
folded in above; the disposition of each:

1. The composition op is the one pending op the DOM already reflects, so `mapThroughPending`
   shifted every later DOM read by its length. `pending` entries now carry `reflected`.
2. An own pending op that resolved during the composition left `pending` but not the DOM, so
   the diff range was mapped through too few ops. The snapshot freezes the op list and the
   view, and every op pending or submitted during the composition is mapped through.
3. The snapshot mixed a mapped caret with unmapped text. Everything is in DOM coordinates and
   mapped once at the end.
4. The slide rule corrupted periodic insertions (`abab` to `ababab`). Replaced by the
   interval-of-starts rule with the text recomputed per start.
5. A non-collapsed selection was not fed into the diff, so a replaced edge character kept its
   marks. The range is seeded with the selection; the uncheckable "widened by nothing more than
   the composition's own updates" clause is gone.
6. A held result that removed the composed block still removed its element, and the one-block
   refusal left zombies. Removals are held and the fallback reconciles the whole root; the
   block-count check is gone.
7. `docChanged` re-set the caret mid-composition through a clamp on the document's length. Its
   caret write is held too.
8. Escape, Tab, Ctrl+Z/Y, Ctrl+Shift+S, the toolbar and cut bypassed the `composing` gate. All
   return early while composing.
9. `preventDefault` ran before the `composing` check and would cancel a cancelable
   `beforeinput` inside a composition. Neither prevented nor mapped while composing.
10. Firefox's commit mutation records arrive after `compositionend` returns, a false positive
    for the observer. `takeRecords()` first thing in `onCompositionEnd`.
11. "The DOM holds the committed text at `compositionend` in both browsers" was inferred for
    Firefox, and for Escape it matters. Stage 1 records the target text at `compositionend`.
12. The dead-key recording is synthetic and a Windows dead key may never compose. Stage 1
    records a real one; stage 3's test follows the recording.
13. Korean was generalised from two non-combining vowels. Stage 1 records `han` then `a`;
    verification's adjacency clause admits the recomposition.
14. The Chromium cancel-on-replace, Android and Gboard claims were unrecorded. Marked as
    assumptions where the plan leans on them.
15. Undo granularity was misdescribed and stage 4's fold claim was wrong. Reworded; stage 4
    states the two ways to keep a per-update word one entry.
16. A failed composition op wedged the block. `commit`'s catch takes the refusal path.
17. Text composed outside any block was lost silently. Covered by the root reconcile and a
    stage 2 case.
18. "The document before any pending op" was false during a composition. The invariant is now
    stated, with the reflected flag and the frozen view as its two halves.
