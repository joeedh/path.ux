# Migration records

A migration record is a document, tied to a commit range on `master`, that tells a
consumer pinned to an older path.ux commit what changed for them and how to move. This
plan adds the directory that holds them, the tool that checks and composes them, the
authoring rule that makes them part of every plan, and the consumer-side step that reads
them.

## Context

- path.ux is consumed by four superprojects, every one of them as a git submodule pin:
  `visualnovel` (`vendor/path.ux`, tracks HEAD closely), `webgl-app-framework`
  (`scripts/path.ux`, 41 first-parent commits behind at the time of writing),
  `fairmotion` (`src/path.ux`, 282 behind) and `noise_fractal_stuff` (`app/path.ux`, 342
  behind). All four pins sit on first-parent `master` today; nothing guarantees that a
  future pin does (a consumer that pulled `origin/master` at `df8fa7d7`, before
  `e39b9afa` merged it, is pinned off the line).
- Consumers import deep module paths far more than the barrel. `webgl-app-framework` has
  133 imports of `path.ux/scripts/pathux` and about 220 of `path.ux/scripts/<module>/…`
  (`util`, `path-controller`, `core`, `widgets`, `screen`); `fairmotion` is similar.
  `package.json`'s `./*` export exists for exactly this. A module split, move or rename
  is therefore a consumer-visible change even when the barrel is untouched.
- Large structural changes are planned (the UX language work; a rewrite of `ToolProperty`
  and `ToolOp`). Without a record of what each change means to a consumer, bringing a
  pinned consumer forward means an agent reading a diff of hundreds of commits and
  guessing.
- `ToolProperty` and `ToolOp` live in `scripts/path-controller`, a submodule of path.ux.
  Consumers reach it only through path.ux's gitlink, so records live in path.ux and a
  record's range includes the path-controller bump it depends on.
- `tests/fixtures/barrel-surface.json` (since `7f252764`, 2026-09-09) is a committed
  snapshot of every name the `pathux` barrel exports, split into values and types, and
  `tests/barrelSurface.test.ts` fails when the barrel drifts from it. Reading that file
  with `git show` at any two commits is therefore an exact, zero-cost oracle for
  name-level API change, for every commit since the fixture landed.
  Between `7f252764` and HEAD (52 first-parent commits) it shows 45 names added (17
  values, 28 types) and 2 removed (`RichEditor`, `Refusal`).
- `example/` imports the library the way a consumer does and is the only thing that
  type-checks the public surface (`CLAUDE.md`, Build). A diff of `example/` over a
  record's range is a ready-made seed for the mechanical-rewrite part of the record.
- `master` is linear from the `## Git history` section of `CLAUDE.md` onward. That
  section is written but uncommitted at the time of writing; stage 1 lands it. Existing
  merge commits stay (33 of them, one inside the fixture window), so ranges are read along
  a first-parent line.
- Plans already carry their own lifecycle (`documentation/plans/`, pressure test on
  creation, status tracked in the file). A record hooks onto that lifecycle rather than
  adding a new one.

## Goals

- A consumer's agent, given `old = gitlink` and `new = target`, gets the ordered list of
  records that intersect the range and a report of where each one touches the consumer's
  tree, without reading path.ux's git history.
- A plan that changes the public surface cannot land on `master` without a record: the
  lint says so, on the commit that makes the change.
- The record is written by the agent implementing the plan, at the moment it knows why
  each change was made, and from the consumer's perspective.

## Non-goals

- Executable codemods. The front matter and search patterns carry the machine-readable
  part; rewrites stay prose until a pattern has recurred often enough to be worth code.
- Records for history before `7f252764`. A consumer pinned earlier than that bumps to
  `7f252764` the old way first.
- Records in `path-controller` itself. Nothing pins it directly today; if something does,
  the same design applies there.
- Signature-level API diffs. See "What `check` cannot catch".

## Design

### Where a record lives

- `documentation/migrations/<plan-name>.md`, one per plan that changes any consumer-visible
  surface. The name matches the plan file's name in `documentation/plans/`.
- A multi-stage plan whose stages land on `master` separately gets one record with a
  sub-section per stage that changed the surface, in landing order. A consumer bumps across
  a whole plan far more often than across one stage, and one record composes more cheaply
  than five.
- `documentation/migrations/README.md` holds the record template and one paragraph on how
  to read the directory. `documentation/index.md` links to it.
- There is no committed manifest. Every SHA a record is tied to is derived from the
  record file's own git history (below), so a committed list of SHAs would go stale on
  every rebase. `plan` and `check` build the manifest in memory from the records at the
  commit they are reading.

### A record's range is derived, not written

A record carries no SHAs. Its range comes from the history of the file itself:

- `base` is the first-parent parent of the commit that added the record file
  (`git log --diff-filter=A --format=%H -- documentation/migrations/<name>.md`).
- A record is **open** while its front matter says `"status": "open"`, and **closed**
  once a commit flips it to `"closed"`. `result` is that closing commit, inclusive, so the
  closing commit may also carry the plan's last code change.
- The **epoch** is the first-parent parent of the commit that added
  `documentation/migrations/README.md`, found the same way. Nothing hand-copies a SHA.
- Every SHA is resolved on the first-parent line of whatever commit the tool is reading
  (`--first-parent HEAD` in `check`, `--first-parent <to>` in `plan`), never the `master`
  ref, so the tool means the same thing on a feature branch, after rebase-landing, and in
  a consumer's detached submodule checkout that has no local `master`.

This is what makes the design survive the landing rule: a branch is rebased before it
lands, every SHA on it changes, and a record that named its own base would be wrong the
moment it landed. A record that is _added_ by a commit moves with that commit.

### Opening and closing

- A plan opens its record — commits the file with `"status": "open"` and the front
  matter filled in — in or before the first commit that changes a surface. The prose
  sections may be stubs at that point; the front matter may not.
- The plan's last stage closes it: fills in the prose, pastes in the generated **Barrel
  delta** and **Module delta** sections, flips `status`.
- At most one record is open at a time. Two plans that both change a surface land
  sequentially, not interleaved. This is a real constraint on the workflow and is stated
  in `CLAUDE.md` so a reviewer of the next plan knows it.

### Surfaces

A record names which of these it changes. The tool verifies the first two; the rest are
the author's declaration, and the pressure-test reviewer's job to doubt.

- `api` — names reachable from the `pathux` barrel. Verified against the fixture.
- `modules` — files under `scripts/` that were deleted or renamed, which is what a
  consumer's deep import breaks on. Verified with
  `git diff --name-status --diff-filter=DR <base> <result> -- scripts/`.
- `behaviour` — same signature, different semantics ("type ids can no longer be ORed").
- `dom` — element structure, custom-element tag names and CSS class names a consumer's
  stylesheet or `querySelector` can reach.
- `theme` — theme keys and their meaning. `buildtools/gen-themes.mjs` output is a
  candidate oracle later; not verified in this plan.
- `struct` — nstructjs STRUCT scripts for anything a consumer's save file can contain. The
  record says whether files written before the change still load, and if so through what.

### Record shape

The file opens with a fenced `json` block, then a fixed set of headings. The fenced
block is the machine-readable part; `JSON.parse` reads it and prettier formats it the same
way the tool writes it (two-space indent), so `format:check` and the tool agree.

````markdown
```json
{
  "name"    : "property-type-descriptors",
  "plan"    : "documentation/plans/property-type-descriptors.md",
  "status"  : "open",
  "surfaces": ["api", "modules", "behaviour"],
  "searches": ["PropTypes\\.", "\\.PROP_TYPE_ID\\b", "getClass\\("],
  "shims"   : [{ "name": "PropTypes", "until": "unscheduled" }]
}
```
````

- `searches` are regular expressions in the dialect JavaScript and `git grep -E` share.
  They double as the applicability test: a consumer tree that matches none of them is not
  affected by the record, and the tool says so. A `modules` record seeds them from the
  deleted and renamed paths.
- `shims[].until` names the record that removes the shim, or `"unscheduled"`.
- Names added and removed are not in the front matter. They are derivable from the
  delta, and state that is derivable is state `check` would otherwise have to police.

Headings, in order. Any that does not apply is kept, with one line saying so, so a reader
knows it was considered rather than forgotten.

- **Barrel delta** — a fenced `text` block generated by `migration barrel-diff` and
  pasted in verbatim: names added, names removed, split into values and types. Prettier
  leaves a fenced block alone, and `check` requires it to equal a regeneration. The author
  annotates below it, never edits it.
- **Module delta** — the same, for `scripts/` files deleted or renamed in the range, with
  the rename target where git detected one.
- **What changed** — the change as a consumer sees it, in one paragraph per change.
  OLD/NEW pairs for anything with a direct replacement.
- **Mechanical rewrites** — the substitutions that can be done without reading the
  surrounding code, as a list of `from` → `to`. `git diff <base> <result> -- example/`
  is the seed.
- **Semantic changes** — what a rewrite cannot express: an invariant that stopped
  holding, a call that now does something different, an ordering that changed.
- **Save files** — present when `struct` is a surface: what an old file contains, whether
  it loads, what it becomes.
- **Compatibility** — every shim the range introduces, what it papers over, and which
  record removes it. Removed shims from earlier records are listed here too, so a consumer
  leaning on one finds out from the record that took it away.
- **Validation** — the commands a consumer runs to know it is done, and the searches that
  must come back empty.

The record is written from the consumer's perspective. It records what the changes mean
to code that uses path.ux, not a summary of the implementation diff. A record that reads
like a commit message is sent back.

### The tool: `buildtools/migration.mjs`

Plain `node`, no dependencies beyond `node:` and `git`. Every subcommand takes
`--root <dir>` (default: the repo containing the script) so the tests can point it at a
throwaway repository.

- `barrel-diff <a> [<b>]` — reads `tests/fixtures/barrel-surface.json` at `a` and at `b`
  (default: the working tree, so an author closing a record can diff against the commit
  they are about to make) and prints the fenced block the record pastes in. Refuses when
  `a` predates the fixture.
- `module-diff <a> [<b>]` — the same for `scripts/` deletions and renames.
- `manifest` — resolves every record's `base`, `result` and `status` from the file
  history along `--first-parent HEAD`, and prints them as JSON. `check` and `plan` call
  it; nobody commits its output.
- `check` — the enforcement, run from `lint:check`:
  - every record's fenced block parses and names a plan file that exists;
  - `base` and `result` are on the first-parent line and `base` is an ancestor of
    `result`; ranges do not overlap; at most one record is open;
  - a closed record's **Barrel delta** and **Module delta** equal a regeneration over its
    range;
  - the barrel and the `scripts/` file set are invariant across every gap: from the epoch
    to the first `base`, from each `result` to the next `base`, and from the last
    `result` (or the epoch, when there are no records) to `HEAD` — unless a record is
    open, in which case the last gap runs to that record's `base` and the open range is
    exempt.

  The last rule is the one that makes a record mandatory, and it is sound at every commit
  of a plan: a surface change with no open record is a change inside a gap, and it fails
  on the commit that introduces it. It cannot be laundered by a later record, because the
  gap before that record is checked too.

- `plan <from> <to> [consumer-dir]` — the consumer's entry point, run with the submodule
  checked out at `<to>` so the tool and the records are in the working tree:
  - resolves `from` to the nearest commit on `<to>`'s first-parent line that is an
    ancestor of it (`git merge-base`), and says which commit it chose when that differs
    from what was given; refuses only when no such commit exists after `7f252764`;
  - lists the records whose range intersects `(from, to]`, in order, and names any part
    of the range no record covers — including everything before the epoch;
  - prints the barrel and module deltas for `(from, to]` itself, not the records'
    stored deltas, so a consumer whose pin sits inside a record's range is not told about
    names it already has;
  - with a `consumer-dir`, runs each record's `searches` over `git ls-files` there, with
    the path.ux submodule path excluded and any `--exclude <pathspec>` honoured, and
    prints per record whether it applies and the hit count per file;
  - prints the applicable records' bodies in order, so the output is one document the
    consumer's agent can work from.

Searching over `git ls-files` rather than a directory walk is what keeps ignored copies
of path.ux (fairmotion's `dist/` carries two) and untracked build output out of the
report for free. Tracked vendored code (`webgl-app-framework`'s `scripts/extern/`,
fairmotion's tracked PhoneGap bundles) is what `--exclude` is for.

### What `check` cannot catch

- A `behaviour`, `dom`, `theme` or `struct` change with no record. Neither oracle moves,
  so the lint passes. The plan author owns the decision, and the pressure-test reviewer
  for the plan reads the record (or its absence) as part of what they attack. This is
  stated in `CLAUDE.md` rather than hidden.
- A signature change. The fixture holds names only. `emitTypes` (`tsconfigDecl.json`)
  gives signatures, but only for a checked-out tree, so a signature diff means two
  temporary worktrees and two `tsgo` runs. Deferred here; the `ToolProperty` rewrite
  plan should decide for itself whether to add it first, since that plan changes
  signatures more than names and its path.ux range will show little beyond a
  path-controller gitlink bump.

### Authoring rule (`CLAUDE.md`)

Added to the `## Plans` section:

- A plan that changes any consumer-visible surface — `api`, `modules`, `behaviour`,
  `dom`, `theme` or `struct` — opens a record in `documentation/migrations/` before its
  first surface-changing commit and closes it in its last stage. Closing the record is
  one of the plan's tracked stages. The lint enforces `api` and `modules`; the author
  decides the rest.
- At most one record is open at a time, so two surface-changing plans land one after the
  other.
- The record is written from the consumer's perspective: what the change means to code
  that uses path.ux, not a summary of the diff.
- The fresh-context pressure test of the plan reads the record too.
- A shim is introduced only when the alternative is an atomic change across repos, and
  it names the record that removes it.

`## Git history` already says a range is read along a first-parent line; stage 1 lands
that section and this one together.

### Epoch and the retrospective record

- The epoch is the parent of the commit that adds `README.md` (stage 1). Records cover
  `master` from there forward.
- One retrospective record, `pre-epoch`, covers `7f252764..<epoch>` — the 52 commits
  since the fixture landed. It is added and closed in the same commit, which is the one
  case where `base` is not the file's own add-parent: its fenced block carries
  `"base": "7f252764…"` explicitly, and `check` honours an explicit `base` only on a
  record whose add-parent is the epoch. Its **Barrel delta** and **Module delta** are
  exact; its prose is written from what actually landed in that window:
  - the meta-tag plan, stages 2/8 through 8/8;
  - the removal of the typedoc docs, `DocsBrowser`, the docs RPC endpoint,
    `simple_docsys` and both tinymce trees (`96285aeb`, `9e4fdeb7`, `73cd2196`);
  - the rich-text provider (`d40f8b5d` … `9ca76021`, which deletes `RichEditor`), the
    rich-text IME plan, and the rich-text markdown plan, stages 1–7;
  - the loose commits: the pen/touch menu click-through fix (`1d7438b3`), the clipboard
    polling guard (`229f1754`), and the `DropBox` search-mode and label changes.
- Nothing before `7f252764` is covered. `plan` names the uncovered part of a range, and
  `fairmotion` and `noise_fractal_stuff` bump to `7f252764` the old way before the records
  take over.

### Consumer side

- Bumping the gitlink is: `git -C <path.ux> fetch origin`, check out the target in the
  submodule, then `node <path.ux>/buildtools/migration.mjs plan <old> HEAD .` from the
  consumer's root. Records apply → the consumer's agent writes a local migration plan
  under that repo's plan convention, pressure-tested like any plan, and the bump lands
  with it as one branch. Nothing applies → a plain bump commit.
- `visualnovel` gets one line for this beside its existing gitlink-bump guidance. The
  other three superprojects get the same line in their own `CLAUDE.md` when they are next
  touched; that is outside this plan.

### Compatibility shims

- Few by default. Every consumer is agent-maintained and pinned, so a shim earns its
  place only when the alternative is an atomic change across repos.
- Every shim names the record that removes it. `manifest` lists live shims (those whose
  `until` record is not yet closed), so a consumer can see what it is leaning on.

### Cost to undo

- The directory, the script, the lint line and the `CLAUDE.md` sections are all
  reversible in one commit each.
- SHAs are never written into a record except `pre-epoch`'s explicit `base`, so a
  history rewrite before publication costs nothing; after publication `## Git history`
  already forbids it.
- The real cost is the workflow: surface-changing plans land sequentially, and a plan
  cannot make its first surface change before it has opened a record. Relaxing either
  later means allowing several open records and losing the ability to attribute a gap
  change to one of them; that is the one decision here that is expensive to reverse.

### Deferred

- Signature-level diff through `emitTypes` in temporary worktrees (see above).
- A `theme` oracle from `gen-themes.mjs`.
- Structured `changes[]` entries and codemods, once a rewrite pattern has recurred.
- A record for `path-controller` in its own right.

## Stages

Each stage lands as one commit on `master`, green under `typecheck`, `test` and
`lint:check`.

1. **Directory, template, rules.** `documentation/migrations/README.md` with the
   template; `documentation/index.md` entry; the `## Git history` section and the
   `## Plans` additions to `CLAUDE.md`. The parent of this commit is the epoch.
2. **`barrel-diff`, `module-diff`, `manifest`, `check`.** `buildtools/migration.mjs`
   with those subcommands and `check` wired into `lint:check`. A vitest test,
   `tests/migrationRecords.test.ts`, builds a throwaway git repository under `tmpdir`
   (`git init`, a README commit, two fixture commits, one record opened and closed, one
   unrecorded barrel change) and runs each subcommand against it with `--root`, so the
   test depends on no live history and `check` runs in one gate only.
3. **`plan`.** The `plan` subcommand with the `git ls-files` search and the composed
   output, tested against a synthetic consumer tree added to the same throwaway
   repository.
4. **The `pre-epoch` record.** Written from the plans and commits listed above, checked
   by `check`.
5. **Acceptance: `webgl-app-framework`.** In that repo, bump to the epoch: run `plan`,
   act on its output, land the bump. The expected output is "nothing applies" — its range
   crosses only the `RichEditor` and `Refusal` removals, which it does not use — so this
   stage tests the applicability filter, the range trimming and the uncovered-range
   report, not the prose. It is a weak test and is named as one; the first real test of a
   record's prose is the first surface-changing plan that lands after this one, and that
   plan's acceptance is a consumer crossing it. Anything this stage finds wrong goes back
   into `pre-epoch` and the template.
6. **Consumer-side line in `visualnovel`.** One bullet beside its gitlink-bump guidance.

## Status

- [x] Plan written
- [x] Pressure-tested; findings folded in below
- [ ] Stage 1: directory, template, rules
- [ ] Stage 2: `barrel-diff`, `module-diff`, `manifest`, `check`
- [ ] Stage 3: `plan`
- [ ] Stage 4: `pre-epoch` record
- [ ] Stage 5: acceptance against `webgl-app-framework`
- [ ] Stage 6: consumer-side line in `visualnovel`

## Pressure test

A fresh-context review returned fifteen findings. What each changed:

1. Enforcement was unsound: a record needed its own `result` SHA, which does not exist
   until the plan's last commit, so every earlier stage was red, and rebase-landing
   invalidated any SHA written on a branch. Fixed by deriving `base`, `result` and the
   epoch from file history, an open/closed status, one open record at a time, and reading
   the line as `--first-parent HEAD`.
2. An unrecorded change could be laundered by the next record landing. Fixed by checking
   that both oracles are invariant across every gap, not only the last one.
3. Deep-module imports outnumber barrel imports in every consumer, and a module move is
   invisible to the barrel. Fixed by adding the `modules` surface with a
   `--diff-filter=DR` oracle.
4. The list of plans in the fixture window was wrong (`gallery-list-mode`,
   `tool-registry`, `datapath-set-fold`, `menu-item-disabling` all predate `7f252764`).
   Fixed from `git log --first-parent 7f252764..HEAD`.
5. The acceptance stage cannot exercise a record's prose, and a pin inside a record's
   range was told about names it already had. Fixed by having `plan` compute the delta
   for the actual range, and by naming stage 5 as the weak test it is.
6. `plan` was invoked from a checkout where neither the tool nor the records existed, and
   `--first-parent master` is undefined in a detached submodule. Fixed: check out `<to>`
   first, read along `--first-parent HEAD`, plain `node`.
7. A gitignore-respecting walker is both a rabbit hole and insufficient (fairmotion
   tracks its bundles). Fixed: search `git ls-files`, add `--exclude`.
8. Refusing a non-first-parent `from` was the wrong response. Fixed: resolve through
   `git merge-base` and say what was chosen.
9. A commit cannot contain its own SHA, and `check` with no records was undefined. Fixed
   by deriving the epoch from `README.md`'s add commit and defining the no-record case.
10. YAML front matter with escaped regexes and no parser; `adds`/`removes` redundant and
    the example violated its own rule. Fixed: fenced JSON block, deltas as fenced text,
    `adds`/`removes` dropped.
11. The test was specified as synthetic while `check` read live history, and `check` ran
    in two gates. Fixed with `--root` and a throwaway repository; `check` runs in
    `lint:check` only.
12. The `## Git history` section the plan relied on was uncommitted. Fixed: stage 1 lands
    it.
13. "`result` is reachable from `base`" was backwards. Fixed.
14. `example/` is an unused oracle. Added as the seed for **Mechanical rewrites**; the
    signature diff stays deferred, with the `ToolProperty` plan told to decide for itself.
15. Cost to undo was not stated. Added.
