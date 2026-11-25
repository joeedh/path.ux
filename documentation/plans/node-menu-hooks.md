# Node editor: menu hooks for hosts that limit types

Status: implemented, not merged. Pressure-tested and revised before that (see the last section).

| Stage                                            | Status |
| ------------------------------------------------ | ------ |
| 1. A copied editor's designer has a context      | done   |
| 2. `nodeItems` and `socketTypes`, tests and docs | done   |

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

Known gaps:

- Replace… and Delete on a proxy node are accepted, as before. Replace… removes the proxy. It's in
  todos.md.
- The socket types are read when a row is built, so a change later shows when the level changes.
- Replace… in a read-only level lists types that are all refused, as before.
