# Rich text

The `rich-text-x` widget edits a document through a `DocumentProvider`. The rest of this page
arrives with the last stage of `documentation/plans/rich-text-provider-tasks.md`; this section
is here first because the composition tests reference it.

## Composition (IME and dead keys)

The first implementation refuses composition: on `compositionend` the editor re-renders the
block from the provider, puts the caret back where the composition started, and dispatches a
`refused` event with `{ inputType: "insertCompositionText" }`. Nothing typed through an IME or a
dead key reaches the document. `documentation/plans/rich-text-provider.md` says why, and task 4
of its tasklist is the plan that lifts it.

`playwright/richtext/composition.spec.ts` drives Chromium's IME over the Chrome DevTools
Protocol and records the event sequences at the top of the file. Firefox has no synthetic IME
path, so it is checked by hand.

### Manual steps

Install the input methods on Windows under Settings, Time & language, Language & region, by
adding a language and its keyboard:

- Japanese: the Microsoft IME that comes with the language pack.
- Chinese (Simplified): Microsoft Pinyin.
- Korean: Microsoft IME.
- English (United States): add the United States-International keyboard for dead keys, where
  `'` then `e` composes `é`.

Then, with the example app's Rich Text tab open in Firefox and the caret inside the editor:

1. Switch to the Japanese IME, type `kan`, press Space to convert and Enter to commit. The text
   must stay unchanged, the caret must stay put, and one `refused` event must fire; the
   example logs it to the console.
2. Repeat with Pinyin (`ni hao`, Space) and Korean (`han`).
3. Switch to United States-International and type `'e`. The same refusal must apply to the dead
   key, and a plain `e` must still land in the document.
4. Start a composition and press Escape. The document must stay unchanged and the caret stay put.
