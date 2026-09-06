# A `ToolRegistry` object

Moves the module-level tool tables onto an object, with the current module globals kept as
aliases onto a default instance. Task 3 of [`toolsys-tasks.md`](toolsys-tasks.md).

Status: not started. This step is additive and changes no behaviour; the isolated-registry
features it exists to enable are named under [Later, not here](#later-not-here) and are
deliberately out of scope.

<!-- toc -->

- [Why](#why)
- [What is there today](#what-is-there-today)
- [The design](#the-design)
- [The three seams](#the-three-seams)
- [Hard constraints](#hard-constraints)
- [What deliberately does not change](#what-deliberately-does-not-change)
- [Risk](#risk)
- [Stages](#stages)
  - [Stage 1 — the class, and the cycle](#stage-1--the-class-and-the-cycle)
  - [Stage 2 — move the tables, keep the aliases](#stage-2--move-the-tables-keep-the-aliases)
  - [Stage 3 — give `ModelInterface` a registry reference](#stage-3--give-modelinterface-a-registry-reference)
  - [Stage 4 — prove a second registry is reachable](#stage-4--prove-a-second-registry-is-reachable)
  - [Stage 5 — document](#stage-5--document)
- [Later, not here](#later-not-here)
- [Repos](#repos)
- [Findings](#findings)
  <!-- regenerate with pnpm markdown-toc -->

<!-- tocstop -->

## Why

An app embedding path.ux cannot give a subsystem its own tool namespace. Registration is a
push onto a module array, path lookup is a module map, and the defaults cache is a module
singleton, so every `ToolOp.register` in a process lands in the same three tables. The
motivating case is a desktop app whose real toolstack lives in another process and whose
editors want their own tool catalogs — see
`c:/dev/visualnovel/docs/research/ux-behaviour-model.md`.

That end state needs parent chaining, disposal and a serializable catalog. None of it is
reachable while the tables are module bindings, because a binding cannot be substituted per
caller. This plan does the substitutability and nothing else.

## What is there today

A census, because it decides how expensive this is. The tables are:

| Table               | Declared at               | Holds                       |
| ------------------- | ------------------------- | --------------------------- |
| `ToolClasses`       | `toolsys/toolop.ts:79`    | every registered class      |
| `ToolPaths`         | `toolsys/toolpath.ts:5`   | toolpath string → class     |
| `initToolPaths_run` | `toolsys/toolpath.ts:7`   | whether the scan has run    |
| `MacroClasses`      | `toolsys/toolmacro.ts:9`  | macro key → generated class |
| `macroidgen`        | `toolsys/toolmacro.ts:24` | next macro type id          |
| `SavedToolDefaults` | `toolsys/tooldefaults.ts` | one `ToolPropertyCache`     |

**Nothing outside `scripts/path-controller/toolsys/` reads any of them**, with one exception:
`controller.ts:1734` calls `initToolPaths()`. Every other consumer — menus, the node editor,
the simple app framework, and the desktop app — reaches tools through `ctx.api.getToolDef`,
`ctx.api.parseToolPath` or `ctx.api.createTool`. Verified by grep across `scripts/` and
across `apps/` and `packages/` in the superproject.

That is the finding this plan rests on: the public surface is already `ModelInterface`, so
the aliases have almost nothing to keep working.

Two stale things to clean up while in here, neither load-bearing:

- `toolsys.ts:11` claims window globals `_ToolClasses` / `_MacroClasses` are declared in
  `global.d.ts`. They are not, anywhere. The comment goes.
- `toolpath.ts` sets `window.parseToolPath`. That one is real and stays; it is a debugging
  hook a registry does not change.

## The design

```ts
export class ToolRegistry {
  readonly classes: IToolOpConstructor[] = [];
  readonly paths: Record<string, typeof ToolOp> = {};
  readonly macros: Record<string, MacroClassType> = {};
  readonly defaults = new ToolPropertyCache();

  register(cls: IToolOpConstructor): void;
  unregister(cls: IToolOpConstructor): void;
  isRegistered(cls: IToolOpConstructor): boolean;
  parseToolPath(str: string, checkExists?: boolean): ParseToolPathResult;
  buildAPI(api: DataAPI, ...): void;   // today's buildToolSysAPI
}

export const defaultRegistry = new ToolRegistry();
```

The existing exports become aliases onto that instance, so no call site changes:

```ts
export const ToolClasses = defaultRegistry.classes;
export const ToolPaths = defaultRegistry.paths;
export const MacroClasses = defaultRegistry.macros;
export const SavedToolDefaults = defaultRegistry.defaults;
```

The aliases are the same object identity, not copies — `ToolClasses.push(cls)` in a consumer
still mutates the registry's array. That is what makes this step behaviour-free, and it is
also why the aliases are a migration aid rather than the end state: an alias cannot be
repointed, so anything that wants a second registry has to reach it by another route.

`macroidgen` becomes a private counter on the registry. It is the one piece of state where
per-registry is arguably wrong — a macro type id that repeats across registries would
collide in a saved file — so it stays process-global behind the registry's back until
someone can say what a macro id must be unique against. Recorded, not decided.

## The three seams

The sketch's key point, and the part most likely to be got wrong: the three ways a caller
reaches the registry do not have the same owner, because they do not have the same
information in hand.

**Path → class.** `parseToolPath`, `createTool`, `getToolDef`, `getToolPathHotkey` and the
menu templates are all reached through `ctx.api`, and `ctx.api` is a `ModelInterface`. So
`ModelInterface` holds a registry reference, defaulting to `defaultRegistry`. Every current
consumer is already on this path, which is why no path.ux-side change is needed.

**Class → defaults.** `ToolOp.hasDefault`, `getDefault` and `saveDefaultInputs`
(`toolop.ts:739-762`) run with no ctx available — `saveDefaultInputs` is called from
`modalEnd` and from `_execTool`, neither of which can supply one. So the registry is stamped
on the class at `register()` time and read off `this.constructor`. A class registered in two
registries is therefore a thing that cannot work; `register` should say so rather than
silently taking the last one.

**Registry → `DataAPI`.** `buildToolSysAPI(api)` becomes `registry.buildAPI(api)`, with the
free function kept as a wrapper over `defaultRegistry`. This is the seam task 2 needs: once
the cache is per registry rather than per process, `_buildAccessors` reassigning
`this.api`/`this.dstruct` on every call stops being able to steal another API's binding. Task
2 gets easier if this lands first, which is why this plan goes first.

## Hard constraints

- **nstructjs registers by class name, globally.** Saved files in consumer projects carry
  those names. Registries are a runtime concept; struct names are never namespaced, not now
  and not in the later steps. This is the constraint that kills the obvious "prefix the
  registry name" design, so it is stated here rather than left to be rediscovered.
- **`IToolStack` is not loosened.** Nothing in this plan touches it.
- **path.ux is a shared library.** A consumer that never asks for a second registry must see
  no change at all — same tables, same identities, same registration order.

## What deliberately does not change

- The module exports stay, and stay public. Removing them is a separate decision with a
  deprecation cycle behind it.
- No parent chaining, no `dispose()`, no catalog projection. Those are the reason the object
  exists, but each needs its own design, and shipping them together would make the additive
  step unreviewable.
- `ToolOp.register` keeps its current signature. A registry-taking overload is a later step.

## Risk

Low, and the reason is the census: the tables are internal, and the one external caller is
`initToolPaths()`. The failure mode to watch for is registration order — module-load-time
`ToolOp.register(...)` calls at the bottom of many modules run before anything constructs a
registry, so `defaultRegistry` must be constructed at module scope in `toolop.ts` and must
not import anything that imports `toolop.ts` back. That is a real cycle risk:
`tooldefaults.ts` imports `IToolOpConstructor` from `toolop.ts`, and `toolop.ts` would now
import `ToolPropertyCache` from `tooldefaults.ts`.

Resolving that is stage 1's actual work, not an afterthought. Options, cheapest first: keep
`ToolRegistry` in its own module that both import; or have the registry hold the cache
lazily. Stage 1 picks one and says why.

## Stages

Each stage is green under `pnpm typecheck`, `pnpm test` and `pnpm format:check` on its own.

### Stage 1 — the class, and the cycle

- New `toolsys/toolregistry.ts` holding `ToolRegistry` and `defaultRegistry`.
- Resolve the `toolop.ts` ↔ `tooldefaults.ts` import cycle; record which option was taken.
- Nothing consumes it yet. This stage exists on its own so the cycle question is answered
  before any table moves.

### Stage 2 — move the tables, keep the aliases

- `ToolClasses`, `ToolPaths`, `initToolPaths_run`, `MacroClasses`, `macroidgen` and
  `SavedToolDefaults` become registry members; the module exports become aliases.
- `ToolOp.register` / `unregister` / `isRegistered` delegate.
- The existing suite is the regression net: it exercises registration, toolpath parsing and
  saved defaults already, and none of it should change. If a test needs editing, that is a
  behaviour change and the stage is wrong.

### Stage 3 — give `ModelInterface` a registry reference

- A `registry` field defaulting to `defaultRegistry`; `parseToolPath`, `createTool`,
  `getToolDef` and `getToolPathHotkey` read it.
- `buildToolSysAPI` becomes `registry.buildAPI`, with the free function as a wrapper.
- Still one registry in play, so still no behaviour change.

### Stage 4 — prove a second registry is reachable

- A test that builds a second `ToolRegistry`, registers a tool into it, points a `DataAPI` at
  it, and resolves the toolpath through that API without the default registry seeing the
  class.
- This is the stage that says whether the seams were cut in the right places. If it needs a
  fifth seam, the answer is to add it here rather than to widen an existing one.
- Also pins the negative: the same class registered into two registries is refused.

### Stage 5 — document

- `CLAUDE.md` gains a short section on the registry and the nstructjs constraint.
- `documentation/` — wherever the tool system is written up — says the module exports are the
  default registry's tables.
- Tick `todos.md`.

## Later, not here

Named so the additive step is not mistaken for the whole idea: parent chaining so an isolated
registry inherits the built-ins; `dispose()` for test isolation; a serializable catalog
projection for a toolstack in another process; and a decision on whether macro type ids are
per-registry or process-global.

## Repos

Submodule only. `toolop.ts`, `toolpath.ts`, `toolmacro.ts`, `tooldefaults.ts`, `toolsys.ts`
and `controller.ts` are all under `scripts/path-controller/`. No path.ux changes and no
gitlink bump, except for stage 5's documentation, which is path.ux.

## Findings

The fresh-context pressure test has not run yet. Its findings, and the disposition of each,
go here before stage 1 starts.
