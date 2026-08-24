# Task list: node graph and node editor

Master checklist for the node-graph work. The design source is
[documentation/research/nodeEditor.md](../research/nodeEditor.md); the two implementation
plans are [node-editor.md](node-editor.md) (the library) and
[node-editor-view.md](node-editor-view.md) (the editor). Every stage is one commit, green
on its own under `pnpm run typecheck`, `pnpm run test` and `pnpm run format:check`; stage
V4 adds the example app's own gates on top.

Order: library stages 1–7 first, in order. View stages V1–V4 follow, in order; they depend
on library stages 5 and 7 and on nothing later, so V1 (pan/zoom, self-contained) may land
any time after stage 1 if useful.

## Library ([node-editor.md](node-editor.md))

- [x] **Stage 1 — `equals()` completions.** The one path-controller submodule commit
      (`FloatArrayProperty`, `ArrayBufferProperty`, `Curve1DProperty`), plus the parent's
      gitlink bump and registry-sweep test. Committing the submodule's default branch is
      confirmed with the user first, per CLAUDE.md.
- [x] **Stage 2 — sockets.** `NodeSocketBase`, `FloatSocket`/`Vec3Socket`,
      `registerSocketType`, dirty propagation, coercion, socket STRUCT.
- [x] **Stage 3 — nodes and the type registry.** `Node`, `NodeDef`, `graphDef()` merge,
      `registerNodeType`, props-key ≡ `apiname` invariant, node STRUCT with socket
      reconciliation.
- [x] **Stage 4 — graph and sort.** `Graph`, per-graph ids, Tarjan `sort()` with
      `{order, cycles}`, link records, graph STRUCT.
- [x] **Stage 5 — groups.** `GroupDef`, proxy nodes, `GroupNode`,
      `groupLoader`/`groupSaver`/`resolveGroups`, reconciliation and hooks, flattened sort,
      `structuralEditsRefused()`, group STRUCT.
- [x] **Stage 6 — LLM DSL.** `validateGraphDSL` / `buildGraphFromDSL`, diagnostics never
      throw.
- [x] **Stage 7 — ToolOps and the data API.** The op set including `ReplaceNodeOp` and the
      dematerializing `SetNodePropOp` undo; the group-descent datapath
      (`DataList` + `customGetSet`).
- [x] **Addendum — headless contract test.** A test that imports `scripts/graph` in plain
      Node (no DOM, no happy-dom) and builds, sorts and serializes a small graph, so the
      graph module's freedom from module-scope DOM access is a stated contract rather than
      an incidental property. Asked for by the first embedding consumer (the VN Generator
      desktop app), whose Electron main process and CLI import the module outside a
      browser.

## Editor ([node-editor-view.md](node-editor-view.md))

- [x] **Stage V1 — pan/zoom container.** `PanZoomContainer` with the pure
      `PanZoomTransform` math.
- [x] **Stage V2 — view widget and editor shell.** `NodeGraphView`, the hostable widget
      owning frames, link underlay, breadcrumb descent and selection, with moves routed
      through the `NodeGraphDelegate` seam (default: the stage-7 ops); `NodeEditor extends
      Area` as a thin shell around one view, shipped unregistered (the consumer calls
      `Area.register`).
- [x] **Stage V3 — editor editing.** Link drag, add-node menu, replace, auto-arrange, the
      group designer dock panel, forwarded UI on instances; every mutating gesture goes
      through the stage-V2 delegate.
- [ ] **Stage V4 — example-app tab.** Consumer-side registration exercised for real: demo
      node/socket types, a demo group behind a stub loader/saver, verified live over CDP.

## After both plans

- [ ] Sweep for `CLAUDENOTE:` comments and remove any that remain.
- [ ] Follow-ons parked deliberately: undo history UI, copy/paste between graphs, a stock
      socket library beyond `FloatSocket`/`Vec3Socket`, a `simple.Editor` convenience
      wrapper.
