# Doctor retirement pre-task: the conditions mirror, `site-facts.json`, and the two rewordings

> **For agentic workers:** four tasks, one segment, in the one `doctor-pretask` worktree. Execution
> is a per-task chain (`cairn-implementer` on `sonnet`, then `diff-reviewer` on `claude-opus-5`,
> then the full gate inside the chain), dispatched one task at a time with the Agent tool. Below six
> tasks, so no `pass-execute.js`. **The conductor never reads a diff, a test log, or a gate
> transcript**; it consumes the implementer's report and the reviewer's verdict and decides accept,
> re-dispatch, split, or stop. One re-dispatch on a `fix` verdict; a second `fix` is the conductor's
> decision.

**Date:** 2026-09-21.

**Spec:** `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, the "Pre-task" section
and the pre-task half of "Acceptance". This plan covers that scope only. The engine removal is
`docs/superpowers/plans/2026-09-21-doctor-retire-2-engine.md`; the Go pass is retire-1.

**This pass does not cut a release.** No `npm version`, no tag, no publish. Every entry lands under
`CHANGELOG.md`'s `## Unreleased` and `package.json` is untouched.

---

## Pre-flight findings

Every claim below was verified against this worktree's tree on 2026-09-21. **Three spec claims are
wrong and the plan is written against the truth**; they are marked CONTRADICTS.

1. **How `scripts/` reaches TypeScript in `src/lib`: through the built `dist/`, never a loader.**
   There is no `tsx`, `ts-node`, `jiti`, or register hook anywhere in `scripts/`. The established
   pattern is `npm run package` first, then a dynamic `import()` of the built JS:
   `scripts/checks/check-readiness.mjs:14` declares `const CONDITIONS_JS = 'dist/diagnostics/conditions.js'`,
   `:67-73` resolves it, errors with `missing ${CONDITIONS_JS}; run "npm run package" first` when it
   is absent, and imports `{ allConditions }` from it. Siblings do the same
   (`scripts/build/update-admin-sheet-inventory.mjs:18`, `scripts/checks/check-skill-budget.mjs:210`).
   **This is the mechanism the generator uses.** The spec's "the built `dist` or the loader the
   other `scripts/` use" resolves to the built `dist`, and `check-readiness.mjs` is the exact model:
   it already imports this very module.
2. **CONTRADICTS the spec: `check:tool-conditions` cannot "join `npm run check`".** `npm run check`
   is `svelte-check --tsconfig ./tsconfig.json` and nothing else (`package.json`, the `check`
   script). It composes no other check script. The gate list is composed as individual steps in
   `.github/workflows/test.yml` (`:36` `npm run check`, `:47` `npm test`, then `:64-88` the
   `check:*` steps, `check:readiness` at `:75`). **The plan therefore adds `check:tool-conditions`
   as a root `package.json` script AND as a step in `test.yml` beside `check:readiness`**, which is
   what the spec's intent ("joins the repo gate") means in this repo.
3. **`src/lib/vite/internal.ts`, exactly.** `virtualSource(opts, mode)` at `:53` builds the manifest
   virtual module; verify mode imports the committed file as `?raw` (`:62`) and the generated source
   runs `(verifyManifest(built, committed), verifyReferences(built), "ok")` (`:70`), so a drift
   throws **inside the evaluated module**, surfaced by `evalVirtual` (`:91`) and re-thrown by the
   plugin's `buildStart` through `this.error(...)` (`:171-177`). The **write** half is a different
   entry point: `writeManifest` (`:195`) is called by the `cairn-manifest` bin, resolves the out
   path against the Vite root (`:212`), and writes through `carryPublishStamps` (`:217`).
   **CONTRADICTS the spec's "Written by the Vite plugin through the same chokepoint that writes and
   verifies `index.json`":** the plugin only *verifies*; the *bin* writes. `site-facts.json`
   therefore needs both halves wired, and `virtualSource` itself is manifest-specific and is not
   reusable as-is. The reusable pieces are `evalVirtual`, `findCairnOptions`, `resolveViteRoot`, and
   the `buildStart` hook.
4. **Where `readAdapterFacts` gets its three values.** `adapterFactsSource` (`:320-340`) is a
   *separate* generated source, not `virtualSource`; it imports `{ cairn }` from `opts.configModule`
   and emits `mediaBucketBinding` from `cairn.media.bucketBinding` (`:335`), `roles` from
   `cairn.roles` (`:336`), and `aiPosture` from `cairn.aiPosture` (`:337`). `readAdapterFacts`
   (`:350-381`) evaluates it through `evalVirtual` and re-validates each field (`:370-376`,
   `aiPosture` narrowed to `'invite' | 'decline'`). **The facts writer reuses `adapterFactsSource`
   plus `readAdapterFacts`'s validation**, and must not re-derive the fields independently.
   `AdapterFacts` (`:290-312`) also carries `owner`, `repo`, `from`, which retire-2 trims; the
   pre-task does not write them into `site-facts.json`.
5. **`media.json` is not written by the Vite plugin at all.** It is committed by the admin
   save/publish path (`src/lib/sveltekit/content-routes-entry-write.ts:220,347`) and read at
   `src/lib/content/compose.ts:13`. The spec's "beside `index.json` and `media.json`" is positional
   (the same `.cairn/` directory) and carries no mechanism. No `media.json` code is touched.
6. **Workflow triggers.** `test.yml` (`:1-8`) triggers on push to `main`/`rebuild` and on every PR,
   with `paths-ignore: ['tool/**']`. `tool.yml` (`:8-27`) triggers on `tool/**`,
   `.github/workflows/tool.yml`, `packages/create-cairn-site/src/**`,
   `packages/create-cairn-site/fixtures/**`, `src/lib/diagnostics/conditions.ts`,
   `src/lib/log/events.ts`, `docs/admin/is-it-working.md`, and `tool/v*` tags; it installs Go and
   Vale and runs `make -C tool check`, with **no Node and no `npm ci`**. **The third workflow is
   justified, but not for the reason the spec gives:** `paths-ignore` suppresses a run only when
   *every* changed path matches, so a PR touching both `conditions.ts` and the mirror still runs
   `test.yml`. The uncovered case is a commit that touches **only** the generated files under
   `tool/`, which `test.yml` ignores and `tool.yml` cannot check without Node.
7. **`check-symbols-allowlist.mjs`** carries the `.cairn` entries at `:112-114`, all three in the
   `file-path:` form with a trailing `// ...by convention` comment:
   `file-path:src/content/.cairn/index.json`, `.../media.json`, `.../dictionary.txt`. The new entry
   goes beside them in the same form.
8. **`check:reference` does not require a page for a non-export file contract.** Its `CONFIG`
   (`scripts/checks/reference-coverage.mjs:535-555`) maps importable subpaths to pages and ignores
   every other page in the arm; `doctor.md`, `cli-cairn-manifest.md`, `cli-cairn-media-seed.md`,
   `admin-routes.md`, `log-events.md`, and `supported-toolchain.md` all live in the arm with no
   `CONFIG` entry. A new page needs **no** `CONFIG` change. What it does need is a link from
   `docs/reference/README.md`, enforced by `check:arm-indexes`
   (`scripts/checks/check-arm-indexes.mjs:29-34`, which set-differences every `.md` in the arm
   against the index). **Closest model:** `docs/reference/cli-cairn-manifest.md`, which already
   documents `/src/content/.cairn/index.json`, its writer, and its build-time verify; the new page
   is its file-format sibling and cross-links to it and to `vite.md`.
9. **`conditions.ts` lines 2 and 131 confirmed.** `:2` reads "the shared identity the readiness
   checklist, the doctor probe, and the runtime renderer all draw from". `:131` is
   `config.tidy-key-missing`'s `why`, naming "the doctor" twice ("anywhere the doctor can read",
   "the doctor could read locally"). **A third mention the spec does not name:** `:235`'s
   `remediation` says "run the full doctor against the same site". **No test pins any of those
   three strings**, which is what the spec's "no test pins the text" means and all it means.
   `src/tests/unit/conditions.test.ts:123` asserts only `c.why).toMatch(/ANTHROPIC_API_KEY/)` for
   `config.tidy-key-missing`, and `:125` pins its `docsAnchor`. Both rewordings are safe as long as
   `ANTHROPIC_API_KEY` survives in the `why`. **The registry's SIZE is pinned, though** (finding
   13), so "no test pins anything" would be the wrong reading.
10. **The showcase and the template both commit `.cairn/*.json`.** `git ls-files` shows
    `examples/showcase/src/content/.cairn/{index,media}.json` and
    `templates/waymark/src/content/.cairn/{index,media}.json`. `templates/waymark` is **generated
    wholesale** from `examples/showcase` by `packages/create-cairn-site/scripts/emit-template-dir.mjs`
    (`npm run emit:template`; `npm run check:template` is the same emitter under `--check`), so a new
    committed file in the showcase's `.cairn/` **fails `check:template` until the template is
    re-emitted**. `npm run test:emit` exercises `scripts/build/emit-template.mjs` and is a separate
    emitter; it is run as a gate but needs no change.
11. **`tool/` state, and the precondition.** `tool/internal/spine/` exists on `main` today
    (`condition.go`, `kind.go`, `outcome.go`, `park.go`, `step.go` and their tests).
    `tool/internal/doctor/` does **not** exist. **No `tool/v*` tag exists on origin**
    (`git ls-remote --tags origin 'refs/tags/tool/*'` returns nothing), so the ordering precondition
    is currently unsatisfied, exactly as the ordering note predicts. There is **no `go:embed`
    anywhere under `tool/`** yet; retire-1 adds the embed, not this pass.
12. **`config.media-bucket` needs a new condition id, and the spec does not cost it.**
    `src/lib/doctor/checks-local.ts:43-45` sets `configMediaBucket.conditionId` to
    `'config.bindings-missing'`, and the comment at `:38-41` states the borrow outright ("It reuses
    the config.bindings-missing condition rather than registering a new one, so the readiness count
    holds"). Since ruling 3 makes the mirror the tool's only source of remediation text, keyed by
    condition id, the Go check cannot print its own remediation without its own id. **The hidden
    cost:** `scripts/checks/check-readiness.mjs:34-64` fails closed on any condition whose
    `docsAnchor` names no heading in `docs/admin/is-it-working.md`, and its `ALLOWLIST` (`:23`) is
    deliberately empty. A new id therefore needs a new checklist section on a frozen page. **The
    precedent is exact and in the ledger:** `docs/internal/engine-rulings.md:5061` records the
    conventions pass, Task 10 doing this same split for `config.tidy-key`, giving it
    `config.tidy-key-missing` with its own `docsAnchor` (`is-it-working.md#configure-the-tidy-api-key`)
    and its own checklist section. Task 1 follows it. See "Decisions this plan makes".
13. **BLOCKER the spec does not cost: the new condition id breaks the Go gate unless Task 1 also
    edits Go.** Two assertions pin the id set from the other side.
    `tool/internal/spine/condition.go` declares 24 typed `Condition` constants (`:20-44`) and lists
    all 24 again in the `conditions` slice backing `Conditions()` (`:47-73`).
    `tool/internal/spine/condition_test.go`'s `TestConditionsMatchRegistry` (`:52-85`) reads
    `src/lib/diagnostics/conditions.ts` through `providers.RepoRoot()`, scrapes `REGISTRY`'s own
    keys with a regex, sorts both, and `slices.Equal`s them. **Set equality, not containment**, so
    adding `config.media-bucket-missing` to `REGISTRY` alone turns `make -C tool check` red, and
    with it `tool.yml`, which path-triggers on `src/lib/diagnostics/conditions.ts`. Task 1
    therefore edits Go in the same commit. On the TypeScript side,
    `src/tests/unit/conditions.test.ts:117` pins `allConditions()` at 24 with a comment reciting
    every addition and retirement; it moves to 25 with its comment extended.
14. **BLOCKER the spec does not cost: an absent `site-facts.json` would break every upgrading
    site's build.** The build only ever **verifies**; the `cairn-manifest` bin **writes**. No
    site's `build` script runs the bin: `examples/showcase/package.json:9` is `vite build`, and
    the bin sits behind a separate `cairn:manifest` script (`:12`, and the same in
    `templates/waymark/package.json:12`). Verify mode imports the committed file as `?raw`
    (`src/lib/vite/internal.ts:62`), which throws at `buildStart` when the file is absent. A site
    upgrading to `0.97.0` has no `site-facts.json` until it runs the bin, so a verify that treats
    absent as drift breaks the build of every consumer on the upgrade, before they can act. Task 3
    splits the two cases: **absent is not drift**; **stale is**.

---

## Verified facts, recorded so no task re-derives them

Each was checked against this worktree on 2026-09-21. An implementer takes these as given and
spends no turns re-proving them.

- **Template emit needs no change of its own.** `templates/waymark/src/theme/cairn.config.ts:50`
  carries the same `media = { bucketBinding: 'MEDIA_BUCKET' }` the showcase does, declares no
  custom roles, and leaves `aiPosture` commented out (`:158-160`), so the emitted facts file is
  the showcase's. The copy walk carries any new file under `src/content/.cairn`: `isExcluded`
  (`scripts/build/emit-template.mjs:99-101`) matches a repo-relative path exactly or as a
  directory prefix, and `.cairn-template.json`'s `.cairn` entry is therefore the **root-level**
  directory, never `src/content/.cairn`. The proof is already committed:
  `templates/waymark/src/content/.cairn/index.json` and `media.json` both exist.
- **The e2e visual baselines are unaffected.** Nothing in this pass renders a pixel: no Svelte
  component, no admin CSS, no public route. No baseline is regenerated, and the CI-canonical
  baseline gotcha in `CLAUDE.md` does not apply to any task here.
- **`dist/` freshness is sound.** `check:readiness` is `npm run package && node
  scripts/checks/check-readiness.mjs` (`package.json:42`), so a check script that reads the built
  registry already owns its own build. `check:tool-conditions` takes the identical shape, and no
  task needs a separate freshness guard.

### Drift mechanisms: after this pass there are two

Both watch the same registry, and they are not redundant.

1. **The Go regex test**, `TestConditionsMatchRegistry`, reads `conditions.ts` directly and pins
   the **id set**. It stays canonical for the id set through this pass and retire-1, until
   retire-1 repoints it at the embedded mirror, which is where the spec's "replacing the regex
   read of `conditions.ts`" lands.
2. **The JSON mirror gate**, `check:tool-conditions`, regenerates the mirror and compares bytes.
   It is canonical for the **text** (`title`, `why`, `remediation`, `docsAnchor`), which the Go
   test does not read at all.

Neither task in this pass may delete or weaken the other mechanism. A change that makes one of
them red is a real finding, not noise from the other.

---

## Header

| Field | Value |
| --- | --- |
| **Goal** | Land the three pre-task deliverables on `main` so retire-1 can branch: the committed conditions mirror under `tool/` with its drift gate and CI workflow, the built-and-verified `site-facts.json` cross-language contract, and the two `conditions.ts` rewordings of ruling 3a. |
| **Spec** | `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md` ("Pre-task"; the pre-task bullets of "Acceptance"). |
| **Place in the order** | Step 2 of the spec's five-step Choreography: B2's tool 1.0 merges, **this pass**, retire-1 merges untagged, draft docs pass A, `tool/v1.1.0` tagged and released, retire-2 last. |
| **Pass precondition** | See below: one check to execute, two more to merge. Execution may start before B2 merges; the merge may not. |
| **Branch** | `doctor-pretask`, off `origin/main`. |
| **Worktree** | `.claude/worktrees/doctor-pretask`, created by the conductor before Task 1. No task touches the main checkout, the `doctor-retirement` worktree, or any other worktree. |
| **Token ceiling** | **700K.** The 80 percent decision point is **560K**. Raised from 600K by the adversarial review's two blockers: Task 1 now carries a Go edit and a second gate, and Task 3 carries two behavioral arms with a test each. |
| **Checkpoint interval** | Four tasks, so one checkpoint, at Task 3's accept. One STATUS write at that checkpoint. |
| **Execution mode** | Per-task chain via the Agent tool: `cairn-implementer` (`model: sonnet`), then `diff-reviewer` (`model: claude-opus-5`), with the full gate run **inside** the chain. No workflow runner. **Serial, one task at a time, one executor in the worktree.** |
| **Segments** | One. Every task boundary is a commit the gate proved green, so any of them is a safe stop. |
| **Merge** | By PR. Before the PR, `git merge origin/main` into `doctor-pretask` and re-gate; another session may push STATUS to `main`. Merge on green CI. |

### The pass precondition

**Revised 2026-09-21 (Geoff): this pass may EXECUTE before B2 merges; it must not MERGE before
B2 merges.** The first draft held the whole pass behind B2 on the belief that B2's branch also
edits `tool/internal/spine/condition.go`. Checked against B2's head `df27a34d` on 2026-09-21, it
does not: B2 touches none of `condition.go`, `src/lib/diagnostics/conditions.ts`,
`docs/admin/is-it-working.md`, `src/lib/vite`, `package.json`, or any workflow. Its one nearby
change is seven lines in `tool/internal/spine/condition_test.go`, a file no task here edits.

To execute, the conductor needs only this, before Task 1 is dispatched:

- `git fetch origin && git ls-tree -d origin/main tool/internal/spine` prints a tree entry.
  (Verified present on 2026-09-21.)

To merge, the PR stays open until both of these hold; merging earlier would put an unused constant
and the mirror file into the tree B2 tags as 1.0, and would make the B2 conductor pull `main` into
a head it is holding still for CI and live verification:

- `docs/STATUS.md` on `origin/main` carries B2's close line naming `tool/v1.0.0`, and
  `git ls-remote --tags origin 'tool/v1.0.0'` prints a non-empty result.
- After B2's merge: `git merge origin/main` into `doctor-pretask`, re-run Task 1's light Go gate
  (`CAIRN_GATE_LANE=light cairn-run-gate 'make -C <abs worktree>/tool check'`) and the heavy gate
  once, then merge on green CI. If `tool/internal/spine/condition.go` or `condition_test.go`
  conflicts, resolve by keeping B2's text and re-adding this pass's one constant and its
  `Conditions()` slot.

A failure here is a halt: write STATUS, say which check failed, and stop. No task in this pass
reads, writes, or assumes any path under `tool/` other than `tool/internal/spine/` and the new
`tool/internal/doctor/` directory it creates.

### The gate

Every gate runs through `cairn-run-gate '<command>'`. **On exit 75, re-issue the same command
unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints before
the next dispatch.

**The heavy lane is the default here:** `cairn-run-gate 'npm run check && npm test'`. `npm test`
runs the component project in real Chromium, so it is browser-bearing and must never share the lane
with another session's browser gate. A task whose blast radius launches no browser may add
`CAIRN_GATE_LANE=light` to its **scoped** check runs only, never to the `npm test` run.

Each task names its own scoped check list on top of the heavy gate. The **full CI list** (every
step in `.github/workflows/test.yml`, plus `design.yml` and `norms.yml`) runs at Task 4 after the
merge from `main`, and on CI.

**Sequencing, mandatory.** `npm test`, `check:custom-surface`, and `check:consumers` each repackage
`dist/`, so they run strictly sequentially, never concurrently with each other.

### Before each dispatch: the live-executor sweep

1. `git -C <path> status --porcelain` is empty for every entry `git worktree list` reports, except
   `doctor-pretask` itself.
2. `pgrep -f .claude/worktrees/doctor-pretask` prints nothing (`pgrep` exits 1 on no match, the
   same as `grep`; read the output, not the exit status).
3. Warm uncommitted code in `doctor-pretask` this pass did not author is stop-and-investigate,
   never free progress.

### Halts

Stop, write STATUS, and ask one combined question on any of these. Everything else runs to
completion with no check-in.

- The pass precondition failing (see "The pass precondition" above).
- A second `fix` verdict on any task.
- A red gate that a single fix round does not clear.
- A `diff-reviewer` finding that a task changed a published condition id, a `docsAnchor`, or an
  export signature the plan did not authorize.
- Discovering that `site-facts.json` cannot be verified without evaluating the adapter in the
  request lifecycle (it must stay build-time and bin-time only).

---

## Decisions this plan makes, which the spec does not

1. **`config.media-bucket` gets a new condition id, `config.media-bucket-missing`, and a new
   checklist section.** Finding 12 shows the Go check cannot print its own remediation otherwise,
   and that `check:readiness` fails closed on a condition with no heading. The alternative, a
   `check-readiness.mjs` `ALLOWLIST` entry, is rejected: the allowlist is deliberately empty and its
   comment demands "a comment naming why the doc cannot carry the condition", and the doc plainly
   can. The `config.tidy-key-missing` split (`engine-rulings.md:5061`) is the precedent and the
   shape. The new section is an **addition** to a frozen page, not a rewrite of its prose, and the
   freeze governs rewrites.
2. **The gate is wired in two places, not one.** Finding 2: `check:tool-conditions` becomes a root
   script and a `test.yml` step; the third workflow covers only the tool-only-commit case.
3. **`tool/internal/doctor/site-config-path.json` lands in a directory with no Go file.** Go's
   `./...` skips a directory that declares no package, so `make -C tool check` is unaffected.
   retire-1 fills the directory.
4. **The reference page is `docs/reference/site-facts.md`**, its own page rather than a section of
   `vite.md`, because the arm's rule is one page per reader-facing contract and the file is read by
   a different program than the plugin. It cross-links to `cli-cairn-manifest.md` and `vite.md`.

---

## Task table

| Task | Runs as | Files | Serial after |
| --- | --- | --- | --- |
| 1, the `conditions.ts` rewordings and the media-bucket condition id | `cairn-implementer` chain, `sonnet` | `src/lib/diagnostics/conditions.ts`, `src/lib/doctor/checks-local.ts`, `tool/internal/spine/condition.go`, `src/tests/unit/conditions.test.ts`, `src/tests/unit/doctor-checks-local.test.ts`, `docs/admin/is-it-working.md`, `docs/internal/facts/admin.md`, `CHANGELOG.md` | the pass precondition |
| 2, the conditions mirror, its gate, and the third workflow | `cairn-implementer` chain, `sonnet` | `scripts/build/emit-tool-conditions.mjs`, `scripts/checks/check-tool-conditions.mjs`, `tool/internal/spine/conditions.json`, `tool/internal/doctor/site-config-path.json`, `package.json`, `.github/workflows/test.yml`, `.github/workflows/tool-conditions.yml`, `docs/internal/facts/reference.md`, `CHANGELOG.md` | Task 1 |
| 3, `site-facts.json` | `cairn-implementer` chain, `sonnet` | `src/lib/vite/internal.ts`, `src/lib/vite/index.ts`, `src/lib/vite/bin.ts`, `src/tests/unit/vite/*`, `examples/showcase/src/content/.cairn/site-facts.json`, `templates/waymark/src/content/.cairn/site-facts.json`, `docs/reference/site-facts.md`, `docs/reference/README.md`, `docs/reference/cli-cairn-manifest.md`, `docs/reference/vite.md`, `scripts/checks/check-symbols-allowlist.mjs`, `docs/internal/facts/reference.md`, `docs/extend/migration-notes.md`, `CHANGELOG.md` | Task 2 |
| 4, close | ritual, conductor's own turns plus one `code-simplifier` and one `diff-reviewer` | `docs/STATUS.md`, `docs/HISTORY.md`, `ROADMAP.md`, this plan file | Task 3 |

**Ordering. Every task in this pass is serial; none is independent, and none may be split into a
second worktree.** Three reasons, each sufficient:

- The one-executor rule: one worktree, one executor, always.
- Task 2 must follow Task 1. The generator copies `why` and `remediation` verbatim, so the mirror
  is built once against the final registry text and against the new condition id.
- **Tasks 2 and 3 contend on two files: `docs/internal/facts/reference.md` and `CHANGELOG.md`.**
  Both write a bullet to the first and an entry to the second. An earlier draft of this plan
  called their Files disjoint and marked Task 3 independent; that was wrong, and the two contended
  files are why.

---

## Task 1: the `conditions.ts` rewordings and the media-bucket condition id

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first. **The pass precondition is the
conductor's check, already cleared before this dispatch; the implementer does not re-run it.**

### Outcome

The condition registry names `cairn doctor` (or no tool at all) rather than "the doctor", so the
generator copies no stale actor into the Go tool's printed output; and `config.media-bucket` raises
a condition of its own carrying its own remediation, **with the Go side's id set moved in the same
commit** so neither language's gate goes red.

### Constraints

- **Only the text named here changes.** No condition id is renamed. No `severity`, no `logEvent`,
  and no existing `docsAnchor` moves. An id rename is a breaking change to the observable contract
  (`conditions.ts:4-5`) and is out of scope.
- `config.tidy-key-missing`'s `why` keeps the literal string `ANTHROPIC_API_KEY`
  (`src/tests/unit/conditions.test.ts:123` pins it) and keeps its `docsAnchor` unchanged (`:125`).
- The em dash is banned in code comments; TSDoc rules apply to every comment touched.
- `docs/admin/is-it-working.md` gains a section and a label-to-section row. **No other prose
  on that page is rewritten**; the freeze governs rewrites, and an addition required by a new
  condition is not one.
- **The new section adds no transcript block.** `scripts/checks/transcript-blocks.mjs:34` floors
  that page at exactly one block, and the existing capture at the top of the page is it. A second
  block in the new section would be a change to a floor this pass has no business moving, and
  retire-2 owns the page's transcript story.
- The new condition id is `config.media-bucket-missing`, severity `warning`, matching the existing
  check's non-blocking stance (`checks-local.ts:38-41` states a no-media site must never fail).
- `checks-local.ts:38-41`'s comment asserting the borrow becomes false and is rewritten.
- **`go-conventions` is mandatory for the Go edit**, as it is for every file under `tool/`. The
  edit is two lines and one comment, and it still conforms: Go Doc Comments, no em dash, the
  existing naming pattern.
- The Go edit changes **only** the constant block and the `conditions` slice in
  `tool/internal/spine/condition.go`. No other Go file, no new Go package, no `go:embed`; retire-1
  owns those.

### What changes

- `src/lib/diagnostics/conditions.ts:2`: the header comment's "the doctor probe" names the surface
  without the retiring bin's identity.
- `src/lib/diagnostics/conditions.ts:131`: both occurrences of "the doctor" in
  `config.tidy-key-missing`'s `why`.
- `src/lib/diagnostics/conditions.ts:235`: "run the full doctor against the same site" in that
  entry's `remediation`. **Found in pre-flight, not named by the spec**; the generator copies
  `remediation` verbatim too, so it carries the same defect as `:131`.
- A new `config.media-bucket-missing` entry in `REGISTRY`, with
  `docsAnchor: 'is-it-working.md#declare-the-media-bucket-binding'`.
- `src/lib/doctor/checks-local.ts:44`: `configMediaBucket.conditionId` repoints to the new id, and
  the comment above it is rewritten.
- `src/tests/unit/conditions.test.ts:117`: the registry-size pin moves from 24 to 25, and its
  comment gains one clause naming `config.media-bucket-missing` and why (its own condition id, no
  longer borrowing `config.bindings-missing`), in the shape the existing clauses use.
- **`tool/internal/spine/condition.go`, both lists.** A new typed constant
  `ConditionConfigMediaBucketMissing Condition = "config.media-bucket-missing"` in the constant
  block (`:20-44`), and the same identifier in the `conditions` slice (`:47-73`) at the matching
  slot. Finding 13: `TestConditionsMatchRegistry` asserts **set equality** with `REGISTRY`, so
  omitting either list turns `make -C tool check` and `tool.yml` red. Place it beside
  `ConditionConfigBindingsMissing` in both lists, since the two ids are siblings and the file
  groups by prefix.
- **`docs/admin/is-it-working.md`, three named edits and nothing else:**
  1. A new section, heading exactly `## Declare the media bucket binding`, anchor
     `#declare-the-media-bucket-binding`. Place it immediately after
     `## Deploy the Worker with its bindings` and before `## Turn on observability`. Follow the
     `## Configure the Tidy API key` section's shape: a bolded lead naming the id and its
     severity (`**config.media-bucket-missing**, a warning.`), what the check found, then an
     **Ask a developer:** paragraph with the fix.
  2. The label-to-section list, which sits under "Match what your doctor printed to the section
     that explains it" (currently around `:130-165`). Today one row reads
     `` `Wrangler bindings`, `Media bucket binding`—[Deploy the Worker with its bindings](#deploy-the-worker-with-its-bindings), `config.bindings-missing` ``.
     Split it: that row keeps `` `Wrangler bindings` `` and `config.bindings-missing` alone, and a
     new row directly beneath reads
     `` `Media bucket binding`—[Declare the media bucket binding](#declare-the-media-bucket-binding), `config.media-bucket-missing` ``.
  3. The closing paragraph of `## Deploy the Worker with its bindings` (currently `:258-261`),
     which tells the reader "This same condition id also covers one other check", becomes false
     the moment the split lands and is removed or rewritten to point at the new section. That is
     a stale-warning fix under the freeze's stale-step allowance, not a rewrite.

### Acceptance criteria

- `grep -n 'the doctor\|cairn-doctor' src/lib/diagnostics/conditions.ts` **prints nothing (grep
  exits 1)**. A grep that matches nothing exits nonzero, so read the output, never the exit
  status, and never chain this one with `&&`.
- `node -e "..."` over the built registry, or a unit test, shows `config.media-bucket-missing`
  present with `severity: 'warning'` and
  `docsAnchor === 'is-it-working.md#declare-the-media-bucket-binding'`. A test in
  `src/tests/unit/conditions.test.ts` asserts it, written before the entry exists and failing at
  `HEAD`.
- `src/tests/unit/conditions.test.ts`'s registry-size pin reads 25, and `npm test` proves it.
- `src/tests/unit/doctor-checks-local.test.ts` asserts
  `configMediaBucket.conditionId === 'config.media-bucket-missing'`, failing at `HEAD`.
- **The Go gate is green:** `CAIRN_GATE_LANE=light cairn-run-gate 'make -C <abs worktree>/tool
  check'`, with the absolute path of this worktree's `tool/` directory. It launches no browser, so
  the light lane is correct and required; the heavy lane would queue it behind a browser gate for
  no reason. `TestConditionsMatchRegistry` passing is the proof the Go and TypeScript id sets
  agree at 25.
- `npm run check:readiness` is green (it fails closed on a `docsAnchor` naming no heading, so this
  is the proof the new section exists and the anchor matches).
- `npm run check:vale`, `npm run check:comments`, `npm run check:docs`, `npm run check:arm-indexes`,
  `npm run check:facts`, `npm run check:symbols`, `npm run check:transcripts` all green.
- The heavy gate is green: `cairn-run-gate 'npm run check && npm test'`, `npm run check` reporting
  0 errors and 0 warnings and `npm test` exiting 0.
- A bullet in `docs/internal/facts/admin.md` records the new condition id in the file's existing
  format (one claim, `Source:` resolving to `path:line`, exactly one status tag, tag last; the
  neighbours at `facts/admin.md:53,64-66` are the model). Gated by `check:facts`.
- A `CHANGELOG.md` entry under `## Unreleased` naming the new condition id. It carries no
  `Consumers must:` line unless the reviewer finds one is owed; a new condition id is additive and
  the registry is exported from no public subpath (`conditions.ts:3-4`).

### The implementer reports

Files touched; the gate result, **both gates, the heavy one and the Go one**; whether any other
`remediation` or `why` in the registry names a retiring actor that this task did not change; the
disposition of the stale "This same condition id also covers one other check" paragraph (removed
or rewritten, and the wording if rewritten); anything the plan did not cover.

**Halt:** a second fix round; a red gate in either language.

---

## Task 2: the conditions mirror, `check:tool-conditions`, and the third workflow

**Runs as:** `cairn-implementer` chain, `model: sonnet`.

### Outcome

A neutral JSON mirror of the condition registry is committed under `tool/`, regenerable from the
engine, and a gate fails when the committed file is not what regeneration produces. A third CI
workflow runs that gate on the commits the other two workflows cannot see.

### What is built

- **`scripts/build/emit-tool-conditions.mjs`** writes `tool/internal/spine/conditions.json` from
  `REGISTRY`. It reads the registry the way `scripts/checks/check-readiness.mjs:67-73` does: resolve
  `dist/diagnostics/conditions.js`, error with a "run `npm run package` first" message when it is
  absent, and dynamic-`import()` it. **Never a regex over the `.ts` source.** Each entry carries
  exactly `id`, `severity`, `title`, `why`, `remediation`, `docsAnchor`, `logEvent`, and nothing
  else. The output is deterministic: a stable key order, entries ordered by `id`, two-space indent,
  one trailing newline, so regeneration is byte-identical run to run.
- **The second artifact**, `tool/internal/doctor/site-config-path.json`, copied from
  `packages/create-cairn-site/src/site-config-path.json` (the scaffolder's copy is the one source
  per ruling 6; its content today is `{ "path": "src/theme/site.config.yaml" }`). A path is not a
  condition and does not ride in the conditions file. The same generator emits it, or a named
  sibling does; the choice is the implementer's and is stated in its report.
- **`scripts/checks/check-tool-conditions.mjs`** regenerates both artifacts into memory and compares
  them byte-for-byte against the committed files, failing with a diff-shaped message naming the
  offending file and the command to fix it.
- **`package.json`**: a `check:tool-conditions` script. It runs `npm run package` first, the same
  shape `check:readiness` uses, since the generator reads `dist/`.
- **`.github/workflows/test.yml`**: one `- run: npm run check:tool-conditions` step, placed beside
  `check:readiness` (currently `:75`).
- **`.github/workflows/tool-conditions.yml`**, the third workflow. It triggers on push to
  `main`/`rebuild` and on `pull_request`, with `paths` covering exactly:
  `src/lib/diagnostics/conditions.ts`, `packages/create-cairn-site/src/site-config-path.json`,
  `tool/internal/spine/conditions.json`, `tool/internal/doctor/site-config-path.json`,
  `scripts/build/emit-tool-conditions.mjs`, `scripts/checks/check-tool-conditions.mjs`, and
  `.github/workflows/tool-conditions.yml`. It installs Node (`actions/setup-node@v7`, `node-version:
  24`, `cache: npm`, matching `test.yml:16-26`), runs `npm ci`, and runs
  `npm run check:tool-conditions`. **It installs no Playwright and no showcase lockfile**; the
  generator needs `dist/`, which `npm ci`'s `prepare` hook already builds.

### Constraints

- The mirror is **generated output, committed**. It is never hand-edited, and the gate is what says
  so.
- The generator emits no field the spec does not name, and no engine-internal detail. `logEvent` and
  `docsAnchor` are optional in the registry (`conditions.ts:27,29`) and are omitted from an entry
  that carries none, rather than written as `null`.
- **This task adds no new Go package and no `go:embed`**, and creates no `.go` file under
  `tool/internal/doctor/` beyond the JSON artifact. retire-1 adds both. This is narrower than "the
  pre-task adds no Go code", which an earlier draft said and which is now false: Task 1 edits
  `tool/internal/spine/condition.go` because the Go id set must move with the registry
  (finding 13).
- This task's PR touches `tool/**`, so `tool.yml` will run its three-platform `make -C tool check`.
  That is expected and must be green; it is not a new gate this task authors.

### Acceptance criteria

- `npm run check:tool-conditions` is green on the committed tree.
- **The gate is proven red on a hand-edited mirror**, which is the spec's own acceptance bullet: the
  implementer edits one `why` string in `tool/internal/spine/conditions.json`, runs
  `npm run check:tool-conditions`, records the nonzero exit and the message, then restores the file
  with the generator and re-runs green. Both outputs go in the report.
- Regeneration is a no-op twice in a row: running the generator, then `git status --porcelain
  tool/internal/`, prints nothing (this one exits 0 either way, so the output is the signal).
- `tool/internal/spine/conditions.json` contains one entry per `REGISTRY` id, proven by comparing
  its length against `allConditions().length` from the built dist.
- `tool/internal/doctor/site-config-path.json` is byte-identical to
  `packages/create-cairn-site/src/site-config-path.json`, proven with `diff`.
- `.github/workflows/tool-conditions.yml` parses and runs, proven two ways. **Never with
  `gh workflow list`:** it lists the workflows on the repository's default branch, so a workflow
  that exists only on `doctor-pretask` is absent from it, and an absent row would read as a parse
  failure that never happened.
  1. Locally, parse the file as YAML and print its top-level keys, for example
     `node -e "import('js-yaml')"` against the committed file, or `python3 -c "import
     yaml,sys; print(list(yaml.safe_load(open(sys.argv[1])).keys()))" .github/workflows/tool-conditions.yml`.
     A parse error is a red.
  2. After the PR opens, `gh run list --branch doctor-pretask --workflow tool-conditions.yml`
     lists at least one run, and it concluded success. The run happens because the PR touches
     `conditions.ts` (Task 1) and the mirror. **The third workflow running on this very PR is the
     proof the spec asks for**, and this command is how it is read. The PR must exist first, so
     the conductor collects this criterion at Task 4, after the push, and records it there.
- The heavy gate is green: `cairn-run-gate 'npm run check && npm test'`. Scoped checks on top:
  `npm run check:readiness`, `npm run check:docs`, `npm run check:facts`, `npm run check:comments`,
  `npm run check:vale`, `npm run check:package`.
- `make -C <abs worktree>/tool check` is green, run through `cairn-run-gate` with
  `CAIRN_GATE_LANE=light` (it launches no browser).
- A bullet in `docs/internal/facts/reference.md` records the mirror as a committed generated
  artifact with its generator and its gate, in the container's format, gated by `check:facts`.
- A `CHANGELOG.md` entry under `## Unreleased`. No `Consumers must:` line: nothing under `tool/` or
  `scripts/` ships in the npm tarball's consumer surface, which the implementer confirms against
  `package.json`'s `files` field and reports.

### The implementer reports

Files touched; the red-then-green mirror proof verbatim; whether the second artifact rides the same
generator or a sibling, and why; the gate results including the Go gate; the exact `paths` list it
wrote into the third workflow; anything the plan did not cover.

**Halt:** a second fix round; a red gate; the generator needing anything other than the built
`dist/` to read the registry.

---

## Task 3: `site-facts.json`

**Runs as:** `cairn-implementer` chain, `model: sonnet`, test-first.
**Serial after:** Task 2. It is **not** independent: it contends with Task 2 on
`docs/internal/facts/reference.md` and `CHANGELOG.md`. See "Ordering".

### Outcome

Every cairn site's build writes and verifies `src/content/.cairn/site-facts.json`, a committed,
cross-language contract carrying the three adapter-derived values no Go process can evaluate. A
stale file fails the build exactly as a stale manifest does.

### Shape

`{ "version": 1, "mediaBucketBinding": ..., "roles": ..., "aiPosture": ... }`. Each of the three is
omitted when the adapter declares none. All three already sit in committed adapter source, so the
file leaks nothing; the implementer confirms this by reading `adapterFactsSource`
(`src/lib/vite/internal.ts:320-340`) and reports it.

### Constraints

- **Reuse the existing derivation, do not re-derive.** The three values come from
  `adapterFactsSource` (`internal.ts:335-337`) through `evalVirtual`, with `readAdapterFacts`'s
  field-by-field validation (`internal.ts:370-376`, including the `aiPosture` narrowing to
  `'invite' | 'decline'`). `owner`, `repo`, and `from` are **not** written to the file.
- **Two halves, per pre-flight finding 3.** The *verify* rides the `cairnManifest` plugin's
  `buildStart` (`internal.ts:171-177`), beside the manifest verify, and throws through
  `this.error(...)` so a drift fails the build. The *write* rides the same bin path that writes the
  manifest (`writeManifest`, `internal.ts:195-218`, invoked by the `cairn-manifest` bin), resolving
  the out path against the Vite root the same way (`internal.ts:207,212`). Do **not** reuse
  `virtualSource`; it is manifest-shaped.
- **Absent is not drift; stale is. Two arms, both mandatory** (finding 14). The manifest's verify
  can assume its file exists because every site has committed one; `site-facts.json` cannot,
  because no site has one until it runs the bin, and no site's `build` script runs the bin
  (`examples/showcase/package.json:9` is `vite build`; the bin hides behind the separate
  `cairn:manifest` script at `:12`). So:
  - **Absent:** the verify is **skipped**, the build proceeds, and at most **one** warning reaches
    the build log, naming `npx cairn-manifest` as the command that creates the file. One warning,
    not one per module and not one per concept. Do not import the committed file as `?raw`
    unconditionally the way `virtualSource` does at `internal.ts:62`; that import is what would
    throw at `buildStart` on every upgrading site.
  - **Present and stale:** a build **error**, in the manifest's own shape and through the same
    `this.error(...)` path (`internal.ts:171-177`), naming the file and the command that fixes it.
- This runs at build time and on the bin path only, **never in the request lifecycle**
  (`internal.ts:348-349` states the same constraint for `readAdapterFacts`). A design that requires
  evaluating the adapter in a request is a halt.
- A site with no `cairnManifest()` plugin, or an adapter that throws, degrades the way
  `readAdapterFacts` already does rather than crashing a build for a reason unrelated to facts. The
  implementer states the chosen degradation and its justification in its report.
- The file is **additive**: a site gains it at its next build on `0.97.0`. No existing behavior
  changes.
- Serialization is deterministic (stable key order, one trailing newline) so the verify compares
  byte-for-byte without normalization surprises.

### Docs and gates this task must carry

- **`docs/reference/site-facts.md`**, a new reference page: what the file is, who writes it, who
  verifies it, the three fields and where each comes from in the adapter, what a stale file does to
  a build, and that a Go program reads it. It cross-links to `cli-cairn-manifest.md` and `vite.md`,
  and both of those gain a one-line pointer back. Google Developer Documentation Style Guide,
  enforced by `check:vale`, and the register standard at `docs/internal/docs-register.md`: lead with
  a one-paragraph brief, one section per read.
- **`docs/reference/README.md`** links the new page, or `check:arm-indexes` goes red
  (`check-arm-indexes.mjs:29-34`).
- **`scripts/checks/check-symbols-allowlist.mjs`**: a `file-path:src/content/.cairn/site-facts.json`
  entry beside `:112-114`, in the same form with the same `// ...by convention` comment shape.
- **`docs/internal/facts/reference.md`**: a bullet under a new `## docs/reference/site-facts.md`
  heading, placed in the file's existing alphabetical page order: after
  `## docs/reference/reproductions.md` (`:809`) and before
  `## docs/reference/supported-toolchain.md` (`:863`). One claim per bullet, `Source:` resolving to `path:line`,
  exactly one status tag, tag last. Gated by `check:facts`.
- **`docs/extend/migration-notes.md`**: a bullet under its `## Unreleased` section. That file is a
  per-version record outside the docs freeze and is maintained every pass.
- **`CHANGELOG.md`** under `## Unreleased`, **with a `Consumers must:` line**. The wording is the
  bin, not the build, because the build does not write the file: **run `npx cairn-manifest` once
  and commit the new `src/content/.cairn/site-facts.json`.** "Build once on the new version so
  `site-facts.json` exists" would be wrong, and an earlier draft of this plan said it.
- **The showcase and the template both commit the file** (pre-flight finding 10). Generate the
  showcase's copy by running the bin against `examples/showcase`, then re-emit the template with
  `npm run emit:template` and prove it with `npm run check:template`. **Do not hand-write
  `templates/waymark/src/content/.cairn/site-facts.json`;** the emitter would discard the edit.
  The emitter needs no change of its own, and the template's facts equal the showcase's: see
  "Verified facts", above, which settles both and is not to be re-derived.

### Acceptance criteria

- **A build with a changed adapter and a stale `site-facts.json` fails**, the spec's own acceptance
  bullet. The implementer proves it in a test: change a fact in the fixture adapter, leave the
  committed file, run the build or the verify entry point, and assert the throw and its message.
  The test fails at `HEAD`.
- **The absent arm, one test:** with no `site-facts.json` on disk, the build (or the verify entry
  point) **succeeds**, and the build log carries exactly one warning whose text names
  `cairn-manifest`. The test asserts both the success and the warning count. This is the upgrading
  consumer's case and the single most important criterion in the task.
- **The stale arm, one test:** it is the criterion directly above, the changed-adapter throw. The
  two arms are proven separately; a test that only covers one does not satisfy this task.
- A build against an unchanged tree passes, and regenerating with the bin is a no-op:
  `git status --porcelain examples/showcase/src/content/.cairn/site-facts.json` prints nothing after
  a regenerate.
- A site with no facts at all (no media, no custom roles, no posture) produces a valid file carrying
  `"version": 1` and no other key, proven by a unit test.
- `owner`, `repo`, and `from` appear nowhere in the written file, proven by a unit test asserting
  the exact key set.
- `npm run check:template` green, after `npm run emit:template`.
- `npm run check:symbols` green (the allowlist entry is what makes it so; removing the entry and
  re-running must go red, and the implementer reports that check).
- `npm run check:reference` and `npm run check:reference:signatures` green. Per pre-flight finding
  8, **no `reference-coverage.mjs` `CONFIG` entry is added**; if the implementer believes one is
  needed, that is a finding to report, not a change to make.
- `npm run check:arm-indexes`, `npm run check:docs`, `npm run check:vale`, `npm run check:facts`,
  `npm run check:snippets`, `npm run check:comments`, `npm run check:transcripts` all green.
- The heavy gate is green: `cairn-run-gate 'npm run check && npm test'`.
- `npm --prefix examples/showcase run check` and `npm --prefix examples/showcase run build` green.
  **The worktree gotcha applies:** `examples/showcase/node_modules` symlinks back to the main
  checkout, so a from-scratch `npm install --prefix examples/showcase` in **this worktree** is
  required before either result is trusted. The implementer runs it and says so.

### The implementer reports

Files touched; the stale-file failure message verbatim; the absent-file warning text verbatim, with
the count of warnings the build emitted; the chosen degradation for a site with no plugin or a
throwing adapter, and why; the exact key set written for the showcase; confirmation that the
showcase reinstall was from scratch; the gate result; anything the plan did not cover.

**Halt:** a second fix round; a red gate; a design that needs the adapter evaluated in a request; a
`check:template` red that re-emitting does not clear.

---

## Task 4: close

Runs in the conductor's own turns, plus one `code-simplifier` dispatch and one `diff-reviewer` read
over the fold's own diff.

- [ ] **`code-simplifier`** (plugin agent, pins Opus) over the TypeScript and `.mjs` this pass
      changed: Tasks 1, 2, and 3's source diffs. Apply its refinements before the merge.
- [ ] **Review fan-out matched to what changed.** `svelte-reviewer`, `daisyui-a11y-reviewer`, and
      `cloudflare-workers-reviewer` are **not** dispatched: no Svelte component, no admin markup,
      no Worker code changed. `web-auth-security-reviewer` is not matched either; nothing touches
      auth, sessions, or the write path. State this in the post-mortem rather than dispatching for
      form.
- [ ] **Friction-log triage** on `docs/internal/docs-friction-log.md`, complete-or-move: fixed and
      deleted, promoted to the `ROADMAP.md` tier where it bites, or deleted as no longer true after
      verifying against the code.
- [ ] **`docs/STATUS.md`** rewritten present tense, at or under 60 lines. It names the pre-task as
      merged and retire-1 as the immediate next action. **It does not write, and does not
      anticipate, "the `0.97.0` cut is unblocked"**; retire-2's close is that line's only writer
      (spec Brief, and "Acceptance": written once, by retire-2's close).
- [ ] **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate
      caught, and what a later pass would be wrong to rediscover from scratch. The two spec
      contradictions in pre-flight findings 2 and 3 belong in that last clause.
- [ ] **`ROADMAP.md`**: a line for anything this pass filed rather than took. Nothing this pass
      shipped is left listed.
- [ ] **A post-mortem** appended to this plan file, with both budget scores: tokens against the
      700K ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).
- [ ] **`git merge origin/main`** into `doctor-pretask`; `docs/STATUS.md` is the expected conflict.
- [ ] **Re-gate after the merge with the full CI list** (every step in `test.yml`, plus `design.yml`
      and `norms.yml`), sequentially where the sequencing rule applies. Then open the PR and merge
      on green CI.
- [ ] **Collect Task 2's deferred criterion** once the PR is open:
      `gh run list --branch doctor-pretask --workflow tool-conditions.yml` lists at least one run,
      concluded success. Record the output in the post-mortem. Never `gh workflow list`, which
      reads the default branch only and would show nothing.

### Acceptance criteria

- The PR is merged and CI on `main` is fully green on the exact merge SHA, checked with
  `gh run list --commit "$(git rev-parse origin/main)" --json workflowName,conclusion,status`. An
  absent required run counts as red. The required set for this pass's SHA is `test`, `e2e`,
  `create-site`, `scaffold`, `design`, `tool` (the PR touches `tool/**`), and the new
  `tool-conditions`.
- `docs/STATUS.md` is at or under 60 lines, carries no past tense, and carries no unblock line.
- `ROADMAP.md` lists no item this pass shipped and lists every item it filed.

**Halt:** a red gate after the merge; a merge conflict in anything other than `docs/STATUS.md`,
`docs/HISTORY.md`, or `ROADMAP.md`.

---

## Spec coverage

| Pre-task spec requirement (`2026-09-21-doctor-retirement-design.md`) | Task |
| --- | --- |
| `scripts/build/emit-tool-conditions.mjs` writes `tool/internal/spine/conditions.json` from `REGISTRY` with the seven named fields | 2 |
| The generator reads `conditions.ts` through the repo's existing TS-capable path, never a regex over source (resolved in pre-flight to the built `dist/`, the `check-readiness.mjs` model) | 2 |
| `tool/internal/doctor/site-config-path.json` carries the scaffolder's site-config path, outside the conditions file | 2 |
| `check:tool-conditions` fails when regeneration is not a no-op | 2 |
| `check:tool-conditions` joins the repo gate (pre-flight finding 2: a root script plus a `test.yml` step, since `npm run check` is svelte-check only) | 2 |
| A third workflow triggering on `conditions.ts`, the scaffolder's path file, and the two generated files, running that one check | 2 |
| Acceptance: the gate proven red on a hand-edited mirror | 2 |
| `site-facts.json` written and verified through the manifest machinery, a stale file failing the build | 3 |
| Shape: `"version": 1`, `mediaBucketBinding`, `roles`, `aiPosture` | 3 |
| Its reference page | 3 |
| Its facts bullet (gated by `check:facts`) | 3 |
| Its `check-symbols-allowlist` path entry beside the other `.cairn` files | 3 |
| Its CHANGELOG line, additive, a site gaining the file at its next build | 3 |
| `readAdapterFacts` keeps this caller and is not dead code after the removal | 3 (the writer reuses it; the `from`/`owner`/`repo` trim is retire-2's) |
| The two `conditions.ts` rewordings of ruling 3a (`:2` and `:131`) | 1 |
| A third stale mention at `:235`, found in pre-flight and not named by the spec | 1 |
| A new condition id if `config.media-bucket`'s remediation needs one (pre-flight finding 12: it does) | 1 |
| The new id's `is-it-working.md` section, following the `config.tidy-key-missing` precedent | 1 (heading, anchor, placement, and the label row are named in the task) |
| The Go id set moving with the registry (finding 13, costed by neither spec nor first draft) | 1 (`tool/internal/spine/condition.go`, proven by the light-lane Go gate) |
| Absent versus stale `site-facts.json` (finding 14, costed by neither spec nor first draft) | 3 (two arms, one test each) |
| Acceptance: a build with a changed adapter and a stale `site-facts.json` fails | 3 |
| Acceptance: the third workflow runs `check:tool-conditions` | 2 (local YAML parse) and 4 (`gh run list --branch`, after the PR opens) |
| Choreography step 2: this pass runs after B2's `tool/v1.0.0` and before retire-1 branches | Header ("Place in the order", "The pass precondition") |
| Branch `doctor-pretask` off `main`, heavy gate, one PR, merging before retire-1 branches | Header, Task 4 |
