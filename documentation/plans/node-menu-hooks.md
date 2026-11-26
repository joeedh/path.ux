# Node editor: menu hooks for hosts that limit types

Status: done, merged in PR #24 on 2026-11-25. Pressure-tested and revised before that (see the last
section).

| Stage                                            | Status |
| ------------------------------------------------ | ------ |
| 1. A copied editor's designer has a context      | done   |
| 2. `nodeItems` and `socketTypes`, tests and docs | done   |
| 3. A definition keeps its proxy nodes            | done   |

## Problem

A host whose delegate only accepts some node and socket types can filter the add menu it builds
itself. It can't filter three menus that path.ux builds, so these offer types that the delegate
refuses after they're picked:

- **Replace…** in a frame's context menu (`NodeGraphView`, `buildAddNodeMenu` without items)
- **Add input…** and **Add output…** in the group designer (`buildGroupDesigner`)
- the same rows on a definition's proxy nodes (`NodeGraphView`, `buildAddSocketRow`)

An app with its own socket classes also sees path.ux's `FloatSocket` next to its own, both
called "Float".

## Changes

- **Stage 1.** `NodeEditor.init` renders the designer after the view is initialized, and not before.
  A copied editor has its graph and level before `init`, so it built the designer while the view had
  no context, and nothing built it again.
- `NodeGraphView.nodeItems: () => AddMenuItem[]`, by default `addMenuItems`. It's called each time
  a menu opens. Replace… and `view.openAddMenu` use it.
- `DefinitionEditOpts.socketTypes?: readonly string[]` holds registered socket type names. The menus
  list these, in this order. Repeated names and names that aren't registered are left out. Undefined
  lists every registered type, as before. An empty list offers none.
- `socketTypeMenuTemplate(onPick, types?)` takes the same list.
- `NodeGraphView.socketTypes` is passed to the proxy nodes' rows. The `NodeEditor` shell passes it to
  its group designer.
- The host sets the fields before the editor is initialized. For a `NodeEditor` subclass that means
  before `super.init()`. `copy()` doesn't carry them, nor `delegate` and `lazyEditors`.
- The Replace… entry has the id "replace".
- The delegate's check stays what decides. These lists only keep the menus from offering what it
  would refuse.
- **Stage 3.** A definition uses the first `GroupInputNode` and the first `GroupOutputNode` of its
  subgraph. Those two can't be deleted or replaced, and no proxy node of a definition can be
  duplicated:
  - `ToolOpDelegate.check` refuses `deleteNode`, `replaceNode` and `duplicateNode` there, and
    `canRun` of `DeleteNodeOp`, `ReplaceNodeOp` and `DuplicateNodeOp` refuses the same. An id that
    doesn't parse or isn't in the graph is left to `exec`.
  - The refusal is one function in `graph/proxies.ts`, which isn't exported from the barrel.
  - The node menu leaves the three entries out on these nodes. A menu without entries doesn't open.
  - Any further proxy in a definition (from an earlier Duplicate, or an `addNode`) can still be
    deleted, and so can a proxy in a graph that is no definition.
  - Deleting a selection skips the proxies and deletes the rest. Duplicating one skips them too.
    The skipped nodes are not reported, and Duplicate deselects them.
  - A gesture with nothing left to do adds no undo entry (`undoStepEnd` skips an empty macro).
  - `AsyncGateOp` releases its input lock when `undoStepEnd` throws. A delegate that accepts what an
    op's `canRun` refuses could reach that.
  - `grouping.ts` removes and adds nodes without these ops, so grouping, ungrouping and their undo
    don't change.

Not changed: menus aren't filtered by asking the delegate about each item. It would also refuse
every item in a read-only level, and a host's check may be expensive.

## Compatibility

- Without the new fields, each menu lists what it did.
- No new name in the barrel; the fields and parameters use types it already exports.

## Tests

tests/nodeeditor_menu_hooks.test.ts:

- Replace… and `openAddMenu` list the host's items, asked for each time, and all without the hook.
- A designer, a proxy row and the template list `socketTypes` in order, without unknown names.
- An editor copied on a definition level builds its designer and rows with its own context,
  delegate and types.

tests/nodeeditor_proxies.test.ts covers stage 3: the delegate, the ops, the menu, a mixed selection,
an extra proxy, and the gesture's undo step.

## Pressure test

A fresh agent attacked the draft, with temporary tests in path.ux and in the app.

Survived: the menus listed above are the only ones that offer types without a filter; the field
defaults, the names, STRUCT loading, undo and the barrel are as the draft assumed.

| Broke                                                          | Change                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| "Set it before adding nodes": a copied editor builds in `init` | The fields are set before `super.init()`                    |
| A copied editor's designer had no context, and stayed that way | Stage 1                                                     |
| The app's filter offers output nodes inside a definition       | The app looks at `view.currentLevel()` each time it's asked |
| A test that only the delegate decides would test nothing new   | Dropped                                                     |
| Empty lists and repeated names weren't specified               | Specified above                                             |

A second fresh agent attacked stage 3, with a prototype.

| Broke                                                              | Change                                         |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `canRun` threw on an empty node id                                 | It answers true, and `exec` reports the id     |
| Delete on proxies alone added an empty undo entry and dropped redo | `undoStepEnd` skips an empty macro             |
| A throw in `undoStepEnd` left the input locked                     | `AsyncGateOp` catches it and always ends       |
| A duplicate of an extra proxy made more of them                    | No proxy in a definition can be duplicated     |
| The refusals aren't shown                                          | Specified above; a host can show `lastRefusal` |

Survived: redo and undo don't ask `canRun`, a mixed selection is one undo entry, `grouping.ts`
doesn't use these ops, no import cycle, and nothing new in the barrel.

Known gaps:

- `addNode` and `replaceNode` to a proxy type are accepted, as before. It's in todos.md.
- Deleting a duplicated proxy's original, and undoing that, put the original last. A file saved like
  that keeps the wrong one: the unused proxy can't be deleted. New edits can't produce that order.
- The socket types are read when a row is built, so a change later shows when the level changes.
- Replace… in a read-only level lists types that are all refused, as before.
