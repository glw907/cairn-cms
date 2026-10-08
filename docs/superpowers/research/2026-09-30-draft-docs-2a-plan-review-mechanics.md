# Stage 2a plan review: mechanics and feasibility

Reviewer lens: can each task be built as stated against the real tree and tools. Target: the plan
`docs/superpowers/plans/2026-09-30-draft-docs-stage-2a.md` at `f3a013d7`. Everything below was
checked against the tree, the dotfiles runner and helper, or a run, never recalled.

## What I verified

- **Docs gate.** `scripts/checks/docs-gate.mjs` holds a 16-step `buildSteps` list that CI
  (`.github/workflows/test.yml:115`), the gate-tier classifier's `DOCS_GATE`
  (`scripts/checks/gate-tier.mjs:53`, also inside the engine tier), and the page chain all read. A new
  component joins by one entry in `buildSteps` plus `src/tests/unit/docs-gate.test.ts:37`, which pins
  the list in order. `dist` is built once at the top, so a `dist`-reading walker fits. I ran
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:docs-gate'` at `f3a013d7`. It returned
  `check:docs-gate: OK (16 check(s))`, so tasks 2 and 5 start from green. The gate is browserless,
  so the light lane is correct.
- **Walker inputs.** `surfaceSubpaths` (`scripts/checks/check-surface.mjs:31`) and `moduleExports`
  (`scripts/checks/reference-coverage.mjs:34`) exist, and three checks and several tests already
  import them. `api-surface.md` is a flat, one-line-per-export render with no member paths, so it
  cannot be an input. It does show that types repeat across subpaths (`CairnRuntime` at `:18` and
  `:464`, `PreviewConfig` at `:83` and `:539`). The earlier mechanics probe
  (`2026-09-30-docs-code-sync-review-mechanics.md:20-27`) measured 7,497 paths unfiltered and
  1,379 declarations after a crude filter, with keys that are root-qualified
  (`editor.publishActions[].href`), not keyed by declaring type.
- **Page chain today** (`~/.dotfiles/claude/.claude/workflows/docs-page-chain.js`, 788 lines):
  - `frictionFiled` sits only on `DRAFT_SCHEMA` (`:149`). The drafter's friction instruction
    lives in the runner's `draftPrompt` (`:606-610`), not in the `cairn-docs-drafter` definition,
    which says nothing about friction.
  - The record already stores the whole page-inputs object (`record.pageInputs`, `:742`) and the
    whole draft object (`rounds[].draft`, `:747`). The drafter's `frictionFiled` therefore reaches
    the record today, and page inputs' will reach it once the schema has the field.
  - Reads are reduced to `{read, verdict, summary, blocking}` (`:748`, `:758`). Only the fact
    read's value needs a copy step.
  - Page inputs and the fact read are `general-purpose` agents (`:218`, `:702`). Their
    instructions live wholly in the runner.
- **The outline helper** (`~/.dotfiles/bin/.local/bin/cairn-docs-outline`, 386 lines).
  - `resolve` emits reduced entries with FNV checksums.
  - `canonicalEntry` must stay identical to the runner's copy, and
    `tests/docs-page-chain-outline.test.mjs` pins that.
  - A low-effort Sonnet probe transcribes the JSON verbatim, and `mergeOutline` (`:347-361`)
    throws on any checksum mismatch.
  - The dry-run harness with stubbed `agent`/`parallel` already exists in that test (`:419-506`).
  - `~/.dotfiles/scripts/check.sh` runs that test and the derivation test.
- **`cairn-release`** (`~/.dotfiles/claude/.claude/skills/cairn-release/SKILL.md`, 191 lines) has
  numbered steps 1 to 7, and step 3 picks the version. The sweep fits as a step between 2 and 3.
  `docs/HISTORY.md` records no release sweep yet. `v0.98.0` (2026-09-30 03:04) is an ancestor of
  the planning sweep `86fd134c` (07:17).
- **The S1-boundary merge is clean.** `main` is one commit past the merge base `5c47a6e3`
  (`bd8ab1fe`, `docs/internal/docs-friction-log.md` only). This branch never touches that file, and
  tasks 2 to 4 do not either.
- **Task 5 inputs exist.**
  - `LEGACY_PATH_MAP` is at `scripts/checks/docs-links.mjs:167`. The slug case is pinned to
    `docs/extend/build-a-site-by-hand.md` at `src/tests/unit/github-slug-contract.test.ts:80-82`.
  - The kept set is the three extend pages, so `docs/extend/README.md` alone flips extend to
    `rebuilt`.
  - `check-arm-indexes.mjs:41` expects that exact index path.
- **Outline.** `docs/internal/outlines/extend.json` carries `slug` and `batch` per page (6 pilot, 5
  `2a`, 14 `2b`). The runner does not carry `slug`, but `p.id` or the path's basename equals it.

## Findings

### PM-1 (major): the key rule for anonymous types is unstated, and the obvious implementation collides

**Location:** plan `:236-239`, acceptance `:258-260`.

**Defect.** "Keyed by its declaring type" breaks down when the declaring type has no name.
`CairnAdapter.editor` and `CairnAdapter.rendering` are inline object literals
(`src/lib/content/types.ts:233-246`), and so is `PreviewConfig.byConcept`'s value. The compiler
names every anonymous literal's symbol `__type`. A walker that keys by the declaring symbol's
name would therefore key `editor.supportContact` as `__type.supportContact`. It would then fold
every same-named member of every inline literal into one row through the "listed once" dedupe,
silently dropping paths. The plan also does not say how arrays (`publishActions?:
PublishActionEntry[]`), `Record<string, T>` values (`content`), or unions of named types
(`FieldDescriptor`) are unwrapped, or which export the failure message names when a type is
re-exported from several subpaths.

**Fold.** Add one outcome sentence to task 2 with these rules:

- An anonymous literal's members are keyed by the path from the nearest named type
  (`CairnAdapter.editor.supportContact`).
- Arrays, `Record` values, optionality, and unions are unwrapped to their named element types.
- The failure message names the root export and subpath the walk reached the type from, or the
  first one in `surfaceSubpaths` order.

Add two fixture cases: two inline literals that share a member name must yield two rows, and a
member behind an array element type must be reached.

### PM-2 (major): the root set is unpinned, so nothing bounds a wide walk

**Location:** plan `:236-239`, review focus 2 at `:186-188`.

**Defect.** "The `define*` helpers, and the route-factory config types" can match about 20
`*Config` types in `api-surface.md`: `EditorRoutesConfig`, `ContentRoutesConfig`,
`AuthRoutesConfig`, `PublicRoutesConfig`, `NavRoutesConfig`, `MediaRouteConfig`,
`CairnAdminConfig`, `AuthGuardConfig`, `AuthChannelConfig`, `PreviewTokenConfig`,
`SectionActionConfig`, `RendererConfig`, `SiteConfig`, and others. `defineRegistry` takes
`ComponentDef[]`, but registries are excluded. Review focus 2 claims that "the recorded counts pin
both" failure directions. A recorded count only pins the early-stop direction, through the planted
member. Nothing fails a walk that runs wide, and the width drives the pilot's disposal cost (FV-11)
and the slug-assignment dispatch.

**Fold.** The walker's header lists its roots by name. Task 2's report states the root list and
the generated count before any slug is assigned. The acceptance adds a bound: the generated
count is at or below the 1,379 the crude filter measured, or the conductor sees the list before
the map is written. Folding this costs no new machinery.

### PM-3 (major): nothing downstream verifies the initial fact-id seeding

**Location:** plan `:242-245`.

**Defect.** "A fact id only where an existing `[verified]` fact states that exact option" asks a
Sonnet agent to match about 1,000+ paths against 1,525 fact bullets. A wrong match passes the gate,
because the fact exists and is `[verified]`. It also takes the option out of every page's pending
rows. Page inputs only receives such a row if the fact id happens to be in its outline `factIds`,
and then only as information. That is the exact hole the mechanism exists to close, and no
reviewer can read about 1,000 rows.

**Fold.** Seed a fact-id row only on mechanical evidence the diff-reviewer can re-run: the fact
bullet names the member in backticks, and its `Source:` cites the declaring type's file. Seed every
other non-excluded path `pending <slug>`. Page inputs then disposes such rows to the existing fact
cheaply, and the pilot measures that cost.

### PM-4 (major): a fact-read retag strands a pending row that no step disposes

**Location:** plan `:160-161`, `:282-284`; task 6 acceptance `:384-385`.

**Defect.** Under FV-10, the fact read retags a mapped fact `[docs-drift]` and rewrites its row
to `pending <this page>`. The fact read runs after page inputs, and the redraft never re-runs page
inputs (runner `:740-760`). The page can then be `accepted` with a pending row naming its own slug.
Task 6's acceptance ("no pending row naming a pilot slug") fails, and no task owns the fix.

**Fold.** When the fact read retags a mapped fact, it names the row in its findings. The runner
escalates that page, and the conductor re-runs page inputs for it, the route the drafter's
`couldNotDo` already uses. Task 6's acceptance then reads "or escalated naming the row". This
adds no new machinery.

### PM-5 (major): the shared-map edit order is unspecified, so concurrent pages see transient reds

**Location:** plan `:158-161` ("in the same edit"), review focus 3 at `:189-192`.

**Defect.** The map is sorted by path. A row and the pending constant therefore sit apart, and
"the same edit" is two Edit calls. The plan also never says where the constant lives. Each of
three pages' drafters runs the whole-tree option gate while other pages' page inputs and fact
reads are mid-sequence. Some orders leave a transient red: a row naming a fact before it is filed,
a row naming a fact already retagged, or a pending count above the constant after a retag. The
whole-tree rule in the runner (`:456-461`) only discounts a red that "names another in-flight
page's file". Even then the drafter reports `fail`, and the runner (`:750`) spends a redraft round
on it, then escalates on a second fail.

**Fold.** The constant is one line inside the map file. The plan names the order so every
intermediate state is green:

- A disposal files the fact, then rewrites the row, then lowers the constant.
- A retag raises the constant, then rewrites the row to pending, then retags the fact.

The Edit tool's stale-read re-read stays the guard against lost writes.

### PM-6 (major): routing map rows through the outline probe raises run-start failure risk for no gain

**Location:** plan `:271-281`.

**Defect.** The spec only says that page inputs "receives its page's rows" (spec `:128`). It does
not require the helper route. Adding rows to the probe grows the JSON that a low-effort Sonnet
probe must transcribe verbatim for all six pages. A single mistranscribed row fails
`mergeOutline`'s checksum and kills the whole run before any page starts. The route also changes
`canonicalEntry` in two pinned copies and the outline test, and it snapshots rows at run start
for pages that run later. Page inputs is a `general-purpose` agent with filesystem access.

**Fold.**

- The runner gives page inputs the map path, the page's slug, and its `factIds`, and page inputs
  reads its rows live.
- `PAGE_INPUTS_SCHEMA` gains `rowsReceived` and `rowsDisposed` for FV-11.
- The helper stays untouched.
- The dry-run acceptance becomes: the prompt names the map path and the slug, and the record
  carries both counts.

Also fix the Files line at `:271-273`. The drafter definition carries no friction instruction, so
drop that conditional file. The runner's `draftPrompt` is the one place to widen. The drafter's
`frictionFiled` already reaches the record (`rounds[].draft`). Only the fact read's value needs a
copy step at `:748`/`:758`, or a fact-read-only schema so the register editor cannot return the
field at all. With this fold, task 3 no longer needs its `model: opus` upshift justification
beyond the runner edit.

### PM-7 (major): task 3's gate is the wrong repo's gate

**Location:** plan `:268-269`.

**Defect.** Task 3 edits only `~/.dotfiles`, yet its gate names `npm run check:docs-gate` in the
cairn worktree, which proves nothing about the runner. The gate that does prove it is
`~/.dotfiles/scripts/check.sh`. That script runs `tests/docs-page-chain-outline.test.mjs` (the
existing dry-run harness, where task 3's proof belongs), the derivation test, the ratchet, and
`claude-tooling-sync lint`.

**Fold.** Replace the gate with `bash ~/.dotfiles/scripts/check.sh`, with task 3's dry-run cases
added to the existing outline test.

### PM-8 (major): the independence marking breaks the one-executor-per-worktree rule

**Location:** plan `:95-97`.

**Defect.** Task 4 is marked independent of tasks 2, 3, and 5, but the file sets overlap:

- Tasks 3 and 4 both edit and commit in `~/.dotfiles`. Each implementer's `check.sh` (ratchet,
  gitleaks, tooling lint) and each diff-reviewer's `git status` would see the other's warm changes.
- Task 4 also edits two files in this cairn worktree (`:307-308`) while task 2 or task 5 works
  here.

Per the global rule, warm uncommitted changes you did not author are a reason to stop, never free
progress.

**Fold.** Run S1 serially: 2, then 3, then 4. The tasks are small, and clock time is not budgeted.
Mark no pair independent unless their repos and worktrees are disjoint.

### PM-9 (major): a pending row that the page cuts has no legal rewrite

**Location:** plan `:278-280`, `:158-161`.

**Defect.** A cut pending row may only become a fact id or an exclusion. The initial slug
assignment is by declaring type, so some rows will land on the wrong page. For such a row, page
inputs has three choices, and each is wrong:

- State the option on the wrong page (overlap).
- File a fact and cut it, which satisfies the gate while the option reaches no page, because the
  new id is in no outline's `factIds`.
- Exclude a real option (a hole).

**Fold.** Allow one count-neutral disposal: re-point the row to `pending <other slug>` for a page
not yet drafted, with the reason in the claim inventory. The gate already accepts any slug in a
committed outline.

### PM-10 (minor): the release sweep's first window has no start

**Location:** plan `:312-313`.

**Defect.** "From the last engine tag whose sweep `docs/HISTORY.md` records" matches nothing today.
The first capability release would sweep the whole history and stop at the 1M cap.

**Fold.** The skill names `v0.98.0` as the seed window start, because the planning sweep
`86fd134c` ran after it. Task 10's HISTORY entry records that seed.

### PM-11 (minor): gate redundancy and a missing local-close entry

**Location:** plan `:339-340`, `:425-426`; `package.json:83`.

**Defect.**

- Tasks 5 and 9 list `check:facts` and `check:provenance` beside `check:docs-gate`, which already
  runs both, so each adds a second run.
- `check:close` lists its checks individually and never calls `docs-gate.mjs`, so the new option
  gate runs in CI and in every tier gate but not in the close's local `check:close`.

**Fold.** Drop the duplicate commands. Either add the new gate to `check:close` in task 2's Files
(with `package.json`) or state that CI and the tier gate cover it.

## Lean-guard verdicts (mechanics view)

| Mechanism | Prior art | Sweep failure | Rides | Verdict |
| --- | --- | --- | --- | --- |
| Option coverage (walker, map, gate) | typescript-eslint `docs.test.mts`; Betterer | the sweep's option class (`editor.publishActions`, `refine`, `media`) | `docs-gate.mjs` and page inputs | Passes. Buildable once PM-1 to PM-3 are folded. |
| Map rows via the outline helper | none named | none | the probe | Fails condition 1. It is invented plumbing: drop it (PM-6). |
| Friction route | Rust RFC guide-level explanation | DAD-1, EXB-4, EXB-5 | the drafter's existing `frictionFiled` | Passes. About half of it already exists in the runner. |
| Release sweep | Kubernetes and Rust docs deadlines, READU | SCF-1 to SCF-25, CLN-1 to CLN-15 | `cairn-release` | Passes. It needs the seed start (PM-10). |

## Counts

Blockers 0, majors 9, minors 2. No owner forks: each finding has one correct answer.
