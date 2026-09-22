# retire-2a: the removal pass (the doctor leaves the engine)

> **For agentic workers:** six tasks plus a small close, in four segments. Tasks 1 through 6 run as
> the per-task chain (`cairn-implementer` on `sonnet`, then `diff-reviewer` on `claude-opus-5`, then
> the task's gate inside the chain). Task 7, the close, is authored by one fold agent with one
> independent `diff-reviewer` read. At seven tasks the plan names
> `~/.claude/workflows/pass-execute.js` as the execution mode; the task table marks the independent
> pair and names the contended resource everywhere else.
>
> **Line numbers in this plan are stale by construction.** Docs pass A lands between this plan's
> writing and this pass's branch point, and it edits `docs/reference/README.md`,
> `scripts/checks/check-symbols.mjs`, and the tool's contract pages. **Every `file:line` citation
> here is a starting point: re-find the site by content, never by line.** That rule is repeated in
> each task block that carries one.

**Date:** 2026-09-21.

**Spec:** [`docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`](../specs/2026-09-21-doctor-retirement-design.md),
the "retire-2: the engine pass" section and the "Pre-task and retire-2" acceptance bullets. This
plan carries the **removal half** of retire-2. The records half is
[`2026-09-21-doctor-retire-2b-records.md`](2026-09-21-doctor-retire-2b-records.md), which runs after
this pass merges and which alone writes the unblock line. The pre-task
([`2026-09-21-doctor-pretask.md`](2026-09-21-doctor-pretask.md)), retire-1 (the Go pass), and draft
docs pass A ([`2026-09-21-draft-docs-pass-a.md`](2026-09-21-draft-docs-pass-a.md)) are other plans,
and their outputs are preconditions here, never work.

**Inputs:** [`docs/internal/record/2026-09-21-doctor-retirement-inventory.md`](../../internal/record/2026-09-21-doctor-retirement-inventory.md)
(the engine-side survey; the spec corrects it in places, and the Pre-flight findings below correct
both).

**Why this pass is half of one.** The undivided retire-2 ran nine tasks, past the eight-task
sizing rule, and its 3.2M ceiling was judged to carry no slack. The split follows the rule: split
the pass, not the tasks. This half removes; 2b records. The cut point is a commit where every gate
is green, the doctor is gone from source, scaffolder, and published docs, and the removal predicate
is empty.

---

## Pre-flight findings

Every claim below was re-verified against this worktree. Findings marked **EXTENDS** or
**CONTRADICTS** change what a task must do; the tasks are written against the truth, not against the
spec's line numbers.

### Verified as the spec states

- **`src/lib/doctor/` is sixteen files**, exactly the inventory's list.
- **Three scaffolder print sites.** `packages/create-cairn-site/src/scaffold.mjs:249`,
  `src/cloudflare/chapter2.mjs:805`, and `bin.mjs:88`'s `doctorLine`, consumed from **five** closing
  blocks (`bin.mjs:102`/`:121`, `:154`/`:164`, `:180`/`:190`, `:208`/`:214`, `:262`/`:263`), with a
  doc comment at `:74` and `:80-81` and a second prose mention at `:146`.
- **`transcript-blocks.mjs` `PAGE_FLOORS`** is at `:32-35`: `docs/admin/create-your-site.md: 3` and
  `docs/admin/is-it-working.md: 1`.
- **`readAdapterFacts`'s doctor-only fields** are `owner`, `repo`, and `from`
  (`src/lib/vite/internal.ts:292`, `:294`, `:296`). `mediaBucketBinding`, `roles`, and `aiPosture`
  already exist and are the facts writer's inputs. `readAdapterFacts`'s only non-test caller today
  is `src/lib/doctor/bin.ts:60-61`; after the pre-task, the facts writer is the surviving caller.
- **The ledger format** is `docs/internal/engine-rulings.md:8-22`, gated by
  `scripts/checks/check-rulings-format.mjs`.

### EXTENDS or CONTRADICTS the spec

1. **CONTRADICTS: `01-create-cairn-site.txt` and `01d-resume.txt` cannot be regenerated.** The spec
   says both are "regenerated". They are real pty captures from a live 2026-08-17 run against
   `cairn-capture-scratch`, **a site torn down after capture**, through a `ptycapture.py` harness
   that lives outside this repo. The fixtures README states two governing rules in its own opening:
   "**No invented output, ever**" and "**A fixture is never edited**". The README already carries a
   2026-09-19 staleness note for the same situation (the scaffold gained a `check:cairn` step the
   captures predate). **Both fixtures stay byte-identical**, and the README gains a second staleness
   note saying the captures predate the retirement and still print the old `npx cairn-doctor`
   reminder. Task 5 owns that note.

2. **CONTRADICTS: the removal predicate cannot be empty.** The spec's acceptance bullet is
   `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples` returning nothing
   outside generated lockfiles. Finding 1 keeps two transcript fixtures that carry the literal
   string (`01-create-cairn-site.txt:58`, `01d-resume.txt:969`), and the fixtures README will carry
   it too, in a staleness note whose whole job is to name the retired command. **The predicate gains
   one carve-out**, `packages/create-cairn-site/test/fixtures/transcripts/`, and nowhere else. The
   carve-out is stated in the criterion so it stays auditable rather than becoming a silent excuse.

3. **EXTENDS: `check:facts` goes red the instant `src/lib/doctor/` is deleted, so the repair runs
   FIRST, at HEAD, before the removal.** `scripts/checks/check-facts.mjs` resolves every `Source:`
   pointer's path and line range (`validatePointer`; `resolvePointerPath` around `:224`, a literal
   path then a basename fallback a deleted file cannot satisfy). Measured: **50 pointer occurrences
   naming `src/lib/doctor/*`**, across `facts/admin.md` (25 lines), `facts/reference.md` (15,
   including the whole `## docs/reference/doctor.md` section at `:469-566`), and `facts/extend.md`
   (8). **Deleting a bullet early never goes red**, so the repair is a clean HEAD task (Task 2)
   rather than a scramble inside the removal commit.

4. **EXTENDS: five doctor modules import `readWranglerConfig`, so the reader cannot MOVE in one
   step.** Verified importers: `checks-cloudflare.ts:20`, `check-posture.ts:20`, `bin.ts:12`,
   `check-probe.ts:13`, `checks-local.ts:15`. Task 3 therefore **adds** a trimmed
   `src/lib/media-seed/wrangler-config.ts` and repoints media-seed; the original leaves with the
   directory in Task 4.

5. **EXTENDS: `src/lib/doctor/site-config-path.json` leaves with the directory, not before it.**
   It sits inside `src/lib/doctor/`, and `src/tests/unit/doctor-checks-local.test.ts:465` reads it.
   Deleting it in Task 3 would red a test Task 4 deletes anyway. Task 4 owns it, together with
   `packages/create-cairn-site/src/substitute.mjs:15`'s comment and `substitute.test.mjs:184`'s twin
   assertion, which both name the engine copy and would red `npm --prefix packages/create-cairn-site
   test` at the same commit.

6. **EXTENDS: `check:docs` reads `CHANGELOG.md`, which links `docs/reference/doctor.md` from
   past-version entries that must not be edited.** `scripts/checks/docs-links.mjs:18` puts
   `CHANGELOG.md` in `ROOT_DOCS`. Verified inbound links from past-version entries: `:2816`,
   `:3524`, `:4501`, `:6703`. The gate's escape hatch is `LEGACY_PATH_MAP` (around `:155`), whose
   three invariants are checked on every run (`legacyMapProblems`, documented at `:144-149`): the
   **value** must name a file that exists, the **key** must NOT name a file that exists, and every
   key must still be cited by a `CHANGELOG.md` link. All three hold for a
   `'docs/reference/doctor.md': 'docs/reference/cli-cairn-doctor.md'` entry after Task 6, and the
   anchor half of a mapped link is deliberately unchecked, which is what saves `#the-checks` and
   `#status-vocabulary`.

7. **EXTENDS: `docs/reference/README.md` names the doctor three times, not twice.** `:55` and `:86`
   are links; **`:94` is a bare bin-name mention** inside the packaged-bins sentence, which no link
   gate catches and which becomes false the moment the bin goes.

8. **EXTENDS: twelve inbound references to `docs/reference/doctor.md`, not seven**, and the retarget
   destination is `docs/reference/cli-cairn-doctor.md`, the page **docs pass A creates**:

   | Site | Form |
   | --- | --- |
   | `docs/admin/is-it-working.md:20` | link, "The full command reference is [`cairn-doctor`]" |
   | `docs/extend/README.md:132` | link, inside "Three reference pages serve the admin track" |
   | `docs/extend/rotate-the-github-app-key.md:97` | link to `#the-checks` |
   | `docs/extend/security-model.md:288` | link to `#the-opt-in-live-probe` |
   | `docs/extend/sign-in-through-your-organization.md:114` | link to `#the-opt-in-live-probe` |
   | `docs/extend/upgrade-cairn.md:54` | link |
   | `docs/extend/migration-notes.md:151` | bare path with `#status-vocabulary`, inside a past-version entry |
   | `docs/reference/cli-cairn-media-seed.md:83` | link |
   | `docs/reference/core.md:1092` | link, inside the `Editor` row |
   | `docs/reference/guidance.md:155` | link |
   | `docs/reference/README.md:55` | link, the subpath list |
   | `docs/reference/README.md:86` | link, the "Also for site admins" list |

   `migration-notes.md:151` sits in a past-version entry, which the spec puts out of scope; it is
   the one hit that stays as written, and the task says so rather than editing it.

9. **CONTRADICTS: the App-key replacement step the spec dictates is wrong.**
   `github.unreachable` is raised **only on best-effort reads**: `content-routes-shell.ts:174`
   (`scope: 'shell'`), `:271` (`scope: 'help'`), and `content-routes-entry-write.ts:371`
   (`scope: 'publish_advisories'`). `docs/reference/log-events.md:43` says the same. A bad App key
   on the **publish** path does not take that route: `appCredentials`
   (`src/lib/github/credentials.ts`, the throw at `:20`) throws a `CairnError` named
   `github.app-unreachable`, and the failure is logged as `publish.failed` or `commit.failed` at
   error level through `src/lib/sveltekit/commit-log.ts:36`/`:57`. Task 6 writes the truthful step,
   and it must demand a **positive** artifact before step 6's irreversible old-key deletion.

10. **EXTENDS: eight of the twenty amended `audit-cli-*` slugs are inside
    `check-rulings-format.mjs`'s `ORIGINAL_TRUNCATED_SLUGS` exit ratchet**, which requires a real
    `- **Shape:**` line for any slug that has left the allowlist. Counted, not estimated. This
    constrains the **ledger task, which lives in 2b**; recorded here so the two halves agree.

11. **EXTENDS: `check-idioms.mjs:323-325` cites a file that leaves.** Its
    `DOTTED_IDENTIFIER_ALLOWANCES` comment grounds `github.app` in two declaring sites,
    `src/lib/diagnostics/conditions.ts` and `src/lib/doctor/checks-github.ts`. The condition stays
    and the allowance stays; the second source must go.

12. **EXTENDS: four source comments the spec names carry no `lib/doctor` token** and are found by a
    bare `doctor` grep, not the removal predicate: `src/lib/sveltekit/guard.ts`,
    `src/lib/sveltekit/condition-response.ts`, `src/lib/dev-flag.ts`,
    `src/lib/delivery/robots.ts`. A task running only the predicate grep will miss all four.

13. **EXTENDS: `CONTENT_SIGNAL` loses its last cross-module consumer.**
    `src/lib/delivery/robots.ts:22` exports it; its importers are `robots.ts` itself and
    `src/lib/doctor/check-posture.ts:16`. After the removal only the declaring module uses it, so
    Task 4 must **rule on whether the `export` keyword stays**, checking `check:surface` and any
    other importer rather than assuming.

14. **EXTENDS: the allowlist re-grounding is six entries, not four.** The spec names
    `check-symbols-allowlist.mjs` `:36`, `:69`, `:83`, `:106-107`. Corrected: `:37` and `:38`
    (`_INSTALLATION_ID`, `_PRIVATE_KEY_B64`) say "same CI workflow", which is doctor.md's workflow
    and falls with `:36`; `:106-107` is the **comment above `:109`**, the entry itself. Separately,
    `cli-flag:--repo` (`:21`) must be **removed**, not reworded: no other engine bin declares
    `--repo`, and the allowlist's own header rule at `:1-8` forbids an entry with no true reason.
    `cli-flag:--from` (`:20`) survives on `cairn-media-seed` and `cli-flag:--help` (`:23`) on the
    three remaining bins; both reasons need their doctor clause cut, as does the header's bin list
    at `:11`.

15. **EXTENDS: `docs/reference/README.md` is gated by `scripts/checks/check-arm-indexes.mjs`.**
    `check:arm-indexes` is not in the spec's gate list and belongs there.

16. **EXTENDS: `check:cairn` and `format:check` do not exist at the repo root.** Both are
    `examples/showcase` scripts and are written `npm --prefix examples/showcase run <name>`.

---

## Header

| Field | Value |
| --- | --- |
| **Goal** | `cairn-doctor` leaves the engine: the bin, `src/lib/doctor/`, the printed commands, the published docs, and every gate that read the directory. The pass ends gate-green on `main` with the removal predicate empty. It does **not** write the unblock line. |
| **Spec** | `docs/superpowers/specs/2026-09-21-doctor-retirement-design.md`, the "retire-2" section and the "Pre-task and retire-2" acceptance bullets, minus the records half (the `## Unreleased` window, the ledger, ROADMAP, the STATUS unblock line), which is 2b's. |
| **Preconditions (all five, verified by the conductor before branching)** | (1) the `tool/v1.1.0` **tag** exists on origin; (2) its **GitHub release** exists on origin with the `tool` workflow green on its SHA; (3) the pre-task is merged to `main`; (4) retire-1 is merged to `main`; (5) **draft docs pass A is merged to `main`**, so `docs/reference/cli-cairn-doctor.md` exists and the tool's contract pages sit under `docs/reference/`. Task 1 builds the machine check for (1) and (2). The conductor verifies (3), (4), and (5) with `git log origin/main -- tool/ scripts/build/emit-tool-conditions.mjs` and `git ls-tree origin/main docs/reference/cli-cairn-doctor.md`; an empty result for (5) is a stop, because Task 6's retarget destination would not exist. |
| **Branch and worktree** | Branch `doctor-engine`, cut off **`origin/main` at a commit that is a descendant of the commit the `tool/v1.1.0` tag points at**. Verify with `git merge-base --is-ancestor tool/v1.1.0^{commit} origin/main`. There is no "merge SHA of `v1.1.0`" to find: the tag is cut from a commit carrying retire-1 and pass A, and what this pass needs is that `origin/main` descends from it. Worktree `.claude/worktrees/doctor-engine`. |
| **Worktree setup, mandatory** | A from-scratch `npm install` in the worktree's `examples/showcase` before any showcase build or e2e is trusted. `examples/showcase/node_modules` symlinks back to the main checkout and otherwise proves **main's** engine (CLAUDE.md, "a worktree showcase e2e proves MAIN's engine"). `rm -rf examples/showcase/node_modules examples/showcase/package-lock.json`, `npm install` at the root, then `npm install --prefix examples/showcase`. |
| **Token ceiling** | **2.6M**. The 80 percent decision point is **2.08M**, checked at each segment boundary, the only place a decision can land. Sized against the undivided pass's 3.2M, which a reviewer judged to carry no slack: this half keeps the two full-gate runs, the largest dispatch (Task 4), and the highest-volume dispatch (Task 6), and sheds the three prose tasks to 2b. |
| **Checkpoint interval** | Three tasks, plus a STATUS-shaped write at every segment boundary. |
| **Execution mode** | Seven tasks, so `~/.claude/workflows/pass-execute.js` is the mode. Per-task chain: `cairn-implementer` (`model: sonnet`), then `diff-reviewer` (`model: claude-opus-5`), then the task's gate **inside the chain**. One re-dispatch on a `fix` verdict; a second `fix` is the conductor's decision. Task 7 is the fold agent, not an implementer. |
| **Parallelism** | Tasks 2 and 3 are the only genuinely independent pair (disjoint files, disjoint gates). Every other task is serialized and names its contended resource in its own block. |
| **Segments** | Four, each ending on a gate-green commit. **A:** 1, 2, 3 (preconditions and the two preparations). **B:** 4 alone, the irreversible removal. **C:** 5, 6. **D:** 7. The count rule caps a segment at three to four; the placement is overridden here by an irreversible task, which takes its own boundary. |
| **Merge** | By PR into `main`. Before the PR, `git merge origin/main` into `doctor-engine` and re-gate; `docs/STATUS.md` is the expected conflict. |
| **What this pass does not do** | It does not touch `CHANGELOG.md`, `docs/internal/engine-rulings.md`, `ROADMAP.md`, or `docs/internal/facts/` **additions** (as opposed to the Task 2 repair). It does not write "the `0.97.0` cut is unblocked". All four belong to 2b. |

### The gate

Gates run through `cairn-run-gate '<command string>'`. **On exit 75, re-issue the same command
unchanged until it prints `gate exit:`.** Never poll a log. Act on any NOTE the tool prints before
the next dispatch.

**The lane is read from `cairn-run-gate`'s OWN environment, not from the quoted command string.**
Write a light gate as `CAIRN_GATE_LANE=light cairn-run-gate '<string>'`, with the assignment
**outside** the quotes. An assignment inside the string sets it for the inner shell only, and the
gate takes the heavy lock anyway.

**`npm test` launches headless Chromium** (the vitest `component` project, `browser.enabled` with a
playwright chromium instance). **Any task whose gate string contains `npm test` is heavy lane, with
no exception.** Heavy lane here: Tasks 3, 4, 5, 6, and the post-merge re-gate. Light lane: Tasks 1
and 2.

**One full gate at a time**, this pass's and any other session's: the runner is cgroup-capped at 8G
and a browser-bearing gate is what the cap is for. The light lane takes its own lock and a 3G cap,
so it never queues behind another session's browser gate.

**The full gate list for this pass**, the spec's list minus the records gates (`check:version`,
`check:rulings-format`), plus the three the pre-flight added:

- The two roots: `npm run check` (0 errors, 0 warnings) and `npm test` (exit 0).
- Package and surface: `check:package`, `check:surface --update`, `check:self-use`,
  `check:custom-surface`, `check:dev-package`, `check:chassis-boundary`, `check:cm-internals`.
- Docs and reference: `check:reference`, `check:reference:signatures`, `check:docs`,
  `check:arm-indexes` (**added, finding 15**), `check:facts`, `check:readiness`, `check:symbols`,
  `check:snippets`, `check:transcripts`, `check:prose`, `check:vale`, `check:comments`,
  `check:editor-quotes`, `check:visuals`, `check:target-stack`.
- Craft and admin: `check:idioms`, `check:invisible-craft`, `check:admin-css-classes`.
- Template: `check:template`, `test:emit`, and `npm --prefix packages/create-cairn-site test`
  (after the `template/` bake, as `test.yml` does it).
- Tool mirrors: `check:tool-conditions` (from the pre-task) and `check:tool-heuristics` (new in
  Task 4).
- Consumer-facing: `check:consumers`, then `npm --prefix examples/showcase run check`,
  `npm --prefix examples/showcase run check:cairn`, `npm --prefix examples/showcase run test:unit`,
  and `npm --prefix examples/showcase run format:check`. **None of these four exists at the repo
  root** (finding 16).

**Sequencing, mandatory.** `npm test`, `check:custom-surface`, and `check:consumers` all repackage
`dist`, so they run strictly sequentially, never concurrently with each other.

**Scope, and the contradiction it resolves.** A per-task gate is **scoped to that task's blast
radius**, and each task names its scope; a task is not required to run the whole list. **The full
list runs at each segment boundary**: at the end of Task 4 (closing Segment B), at the end of Task 6
(closing Segment C), and again at Task 7 after the merge from `main`, plus on CI. Where an earlier
draft said both "full gate list green" per task and "limited full-gate runs", this is the rule that
governs.

**`tool.yml` path-triggers on `src/lib/diagnostics/conditions.ts` and `docs/admin/is-it-working.md`,
so an engine PR touching either also runs the Go gate. That is expected, not a fault.**

### Two standing gotchas

- **The worktree showcase gotcha**, above, is mandatory before Task 4's, 5's, and 6's gates.
- **The baseline gotcha.** Visual baselines are CI-canonical. **No task in this pass should move a
  baseline at all**: nothing here changes rendered admin markup except one sentence of body copy in
  `CairnTidySettings.svelte`. **A visual baseline move is therefore a halt, not a classification
  exercise**, and committing a locally generated baseline is forbidden.

### The conductor's rules

- **The conductor never reads a source file, a diff, a test log, or a gate transcript during
  execution.** It consumes each implementer's report and each `diff-reviewer` verdict and decides
  only accept, re-dispatch with a correction, split, upshift, or stop.
- **Before each dispatch, the live-executor sweep.** `git -C <path> status --porcelain` is empty for
  every entry `git worktree list` reports except `doctor-engine` itself; `pgrep -f
  .claude/worktrees/doctor-engine` returns nothing; warm uncommitted code this pass did not author
  is stop-and-investigate, never free progress.
- **One executor per worktree.** No docs pass and no site pass shares `doctor-engine`.

### Releases

**This pass does not cut `0.97.0`, does not bump a version, and does not write a CHANGELOG entry.**
It leaves `package.json`'s `version` untouched, runs no `npm version`, no `gh release create`, and
no publish. The changelog window is 2b's task.

### Halts

Stop, write STATUS, and ask one combined question on any of these. Everything else runs to
completion with no check-in.

- **Task 1's release check red.** A missing `tool/v1.1.0` tag or a missing GitHub release stops the
  pass before any removal commit.
- **`docs/reference/cli-cairn-doctor.md` absent from `origin/main`.** Docs pass A has not merged,
  and Task 6's retarget destination does not exist.
- Any red gate that a single fix round does not clear. A second `fix` verdict from `diff-reviewer`
  is the conductor's decision, not an automatic third dispatch.
- Any visual baseline move.
- A `docsAnchor` in `conditions.ts` that `check:readiness` can no longer pin to a heading, since
  this pass deletes no registry entry and lowers no floor.
- The 80 percent ceiling flag tripping at a segment boundary.

### Pass-end reviewer fan-out

Matched to what this diff actually contains, which is a deletion, a file copy, and prose.

- **`web-auth-security-reviewer` runs.** The removal takes out the containment helper
  (`src/lib/doctor/bin.ts:46`'s `readFileUnderCwd`), the live sign-in probe (`check-probe.ts`), and
  the live send (`check-send.ts`), and it rewords comments in `src/lib/sveltekit/csrf.ts`,
  `guard.ts`, and `condition-response.ts`. The one question worth an independent skeptical read is
  whether any auth, CSRF, or guard **behavior** changed rather than only its documentation. The
  expected verdict is that none did; a finding to the contrary is a halt.
- **`svelte-reviewer` does not run.** The pass touches exactly one `.svelte` file,
  `CairnTidySettings.svelte`, and only the body copy inside an existing element.
- **`daisyui-a11y-reviewer` does not run.** No markup structure, class, token, ARIA, or focus
  behavior changes. `cairn-admin.css` is untouched.
- **`cloudflare-workers-reviewer` does not run.** The pass **deletes** Cloudflare API and D1 calling
  code and adds none.
- **`code-simplifier`** (plugin agent, pins Opus) runs at Task 7 over the code this pass changed:
  Task 3's new media-seed module and Task 4's trimmed `AdapterFacts`.

---

## Task table

| Task | Runs as | Segment | Independent of | Contended resource when serialized |
| --- | --- | --- | --- | --- |
| 1, the release precondition check | implementer chain, **light** | A | everything (it adds one new file) | none; it must land **first** because its red result stops the pass |
| 2, the facts-container HEAD repair | implementer chain, **light** | A | **3** | `docs/internal/facts/**` only; it must land **before** Task 4 |
| 3, the wrangler reader's copy into media-seed | implementer chain, heavy | A | **2** | `src/lib/media-seed/`; Task 4 deletes the original |
| 4, the removal and the script gates | implementer chain, heavy | B | nothing | the whole source tree; `check:symbols` crashes the instant `src/lib/doctor/` goes |
| 5, the scaffolder and the transcripts | implementer chain, heavy | C | nothing | the transcript fixtures and `is-it-working.md`'s one block |
| 6, the published docs arms | implementer chain, heavy | C | nothing | `docs/admin/is-it-working.md`, whose transcript block Task 5 swapped |
| 7, the small close | fold agent, then one `diff-reviewer` | D | nothing | `docs/STATUS.md` on `main`, possibly held by another session |

Tasks 2 and 3 touch disjoint files (`docs/internal/facts/**` against `src/lib/media-seed/`) and run
disjoint gates (`check:facts` against the package and test gates), and neither reads the other's
output. `pass-execute.js` may take them in parallel. Every other pair is serialized for the reason
its row names.

---

## Task 1: the release precondition check

**Runs as:** `cairn-implementer` chain, `model: sonnet`. **Light lane.**

**Files:** `scripts/checks/check-tool-release.mjs` (new), `package.json` (one script entry),
`src/tests/unit/check-tool-release.test.ts` (new).

**Deliverable count:** 2 (the script, its test). Under four.

**Outcome.** A committed gate that asserts the `tool/v1.1.0` tag **and its GitHub release** exist on
origin, exiting nonzero when either is absent. It is wired as an npm script the pass can invoke by
name, and the plan runs it **before any removal commit**. A red result stops the pass.

**Constraints.**

- The script checks **both** facts. A tag alone can exist on a branch that never merged, and a
  release alone cannot exist without a tag, so the release is the stronger of the two and neither
  substitutes for the other.
- The tag check reads **origin**, not the local ref store, so a stale local clone cannot pass it.
- The script is **not** added to `npm run check` and **not** added to CI. It is a pass precondition,
  not a standing gate; every future CI run would query GitHub for a fact that never changes again.
- It degrades honestly with no network or no `gh` auth: it exits nonzero and says which fact it
  could not establish, never exits 0 on an unknown.
- The version it checks is a constant in the script, not an argument, so the assertion is committed
  rather than supplied at the call site.

**Acceptance criteria.**

- `node scripts/checks/check-tool-release.mjs` exits 0 against the real origin, and its output names
  both the tag and the release. Command: `node scripts/checks/check-tool-release.mjs; echo "exit:$?"`.
- The unit test proves a nonzero exit for each of three cases with the GitHub reads stubbed: tag
  absent, tag present and release absent, and the read itself failing. Command:
  `npx vitest run src/tests/unit/check-tool-release.test.ts`.
- `npm run check:tool-release` resolves.
- **The "not wired into a standing gate" claim is proven by grep, not asserted.** Both commands
  return nothing: `node -p "JSON.stringify(require('./package.json').scripts)" | grep -o
  'check:tool-release[^"]*' | grep -v '^check:tool-release$'` (no composed script names it), and
  `grep -n 'check:tool-release' .github/workflows/test.yml`.
- Scoped gate green, light lane:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check && npm run test:unit && npm run check:comments'`.
  (`npm test` is deliberately not in this string: it would make the task heavy lane for a change
  that touches one new script and one new unit test.)

**Implementer's report shape.** Files touched; the gate result verbatim; the real-origin exit and
its output; the two grep outputs proving the script is unwired; decisions the plan did not cover;
anything it could not do.

**Halt:** the real-origin run exits nonzero. That is the precondition failing, and the pass stops.

---

## Task 2: the facts-container HEAD repair

**Runs as:** `cairn-implementer` chain, `model: sonnet`. **Light lane.**
**Independent of Task 3.** Must land **before Task 4**.

**Files.** `docs/internal/facts/admin.md`, `docs/internal/facts/extend.md`,
`docs/internal/facts/reference.md`. **Line numbers below are a starting point: re-find every bullet
by content.**

**Deliverable count:** 1 (the repair), spanning roughly fifty pointers across three files. Under
four by count; **size the dispatch by volume.**

**This task exists because of pre-flight finding 3, which the spec does not carry.** `check:facts`
resolves every `Source:` pointer's path and line range, so every bullet sourced to
`src/lib/doctor/*` goes red the moment Task 4 lands. **Running it at HEAD, before the removal, is
what makes it cheap: deleting or re-sourcing a bullet while the directory still exists can never go
red**, and the gate re-resolves every pointer on the same run.

**Outcome.** No facts bullet names `src/lib/doctor` any more, and `check:facts` is green both at
this commit and after Task 4's deletion.

**Constraints.**

- **Complete-or-move, per bullet, verified against the code first.** Three dispositions and no
  fourth:
  - **Delete**, when the claim is no longer true because the subject is gone (most of
    `admin.md`'s condition-id bullets sourced to `checks-local.ts` and `checks-cloudflare.ts`; the
    whole `reference.md` `## docs/reference/doctor.md` section, around `:469-566`, whose page Task 6
    deletes).
  - **Re-source**, when the claim is still true of a surviving subject at a new location (a
    condition id that lives in `src/lib/diagnostics/conditions.ts`).
  - **Restate**, when the claim is true of the Go tool instead.
- **A restated bullet sources to the engine's own committed conditions mirror
  (`src/lib/diagnostics/conditions.ts`, or the pre-task's generated mirror) or to the spec, NOT into
  `tool/internal/doctor/`.** A pointer into the Go package's internal layout couples an engine gate
  to another module's file structure, so a Go refactor would red the engine's docs gate. If a bullet
  genuinely cannot be stated without such a pointer, the task uses one **and records the coupling
  explicitly in its report**, naming the bullet and why no engine-side source carries the claim.
- **The format is the container's own** (`docs/internal/facts/README.md`): one claim, a `Source:`
  resolving to `path:line`, exactly one status tag, tag last. A bullet whose truth this task cannot
  establish gets a `[candidate: ...]` tag, never a `[verified]` it did not earn.
- **This task writes no published-arm page and adds no new bullets** for what this pass changes.
  Task 6 owns the pages; **2b owns the additions.** This task only repairs what the removal would
  break.
- `admin.md`'s transcript assertion ("three blocks, two fixtures") is **not** touched here: Task 5
  keeps the two `01` fixtures byte-identical, so it stays true. If the task finds it already false,
  it reports that rather than fixing it.

**Acceptance criteria.**

- `grep -rn 'src/lib/doctor' docs/internal/facts/` returns nothing.
- `npm run check:facts` green at this commit. Command:
  `CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:facts && npm run check:docs && npm run check:vale'`.
- **The repair is proven forward, not just at HEAD**: with `src/lib/doctor/` temporarily moved aside
  (`git stash`-free: `mv src/lib/doctor /tmp/doctor-probe && npm run check:facts; mv
  /tmp/doctor-probe src/lib/doctor`), `check:facts` is still green. The report carries both runs.
- **The report lists every restated bullet with its new `Source:` pointer**, and states for each
  that the pointer resolves. This replaces any "[verified]" self-assertion: the claim is the list,
  and `check:facts` re-resolves it mechanically.
- A disposition count per file (deleted / re-sourced / restated) that sums to the number of bullets
  the task touched.

**Implementer's report shape.** Files touched; the disposition count per file; the full list of
restated bullets with their new pointers; any bullet that had to point into `tool/`, with the
coupling stated; both `check:facts` runs verbatim; decisions the plan did not cover; anything it
could not do.

---

## Task 3: the wrangler reader's copy into media-seed

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.
**Independent of Task 2.**

**Files.** `src/lib/media-seed/wrangler-config.ts` (**new**), `src/lib/media-seed/assemble.ts`,
`src/lib/media-seed/bin.ts`, `src/lib/media-seed/index.ts`, `src/tests/unit/media-seed.test.ts`,
`src/tests/unit/emit-template-tree.test.ts`, `src/tests/unit/media-seed-dist-spawn.test.ts`
(**new**), `vitest.config.ts`. **Re-find each import site by content.**

**Deliverable count:** 3 (the new module, the repoint, the dist-spawn proof). Under four.

**Outcome.** `readR2Buckets` and `R2BucketEntry` live under `src/lib/media-seed/`, their one
remaining consumer, with the `DoctorContext['readFile']` type **inlined** so nothing under
`media-seed/` imports a doctor type. `cairn-media-seed` still reads R2 buckets from a real wrangler
config, proven against the built bin.

**Constraints.**

- **This is a COPY, not a move.** Five doctor modules import `readWranglerConfig` from
  `src/lib/doctor/wrangler-config.ts` (pre-flight finding 4: `checks-cloudflare.ts`,
  `check-posture.ts`, `bin.ts`, `check-probe.ts`, `checks-local.ts`). The original stays untouched
  and **leaves with the directory in Task 4**. No re-export shim, no temporary bridge: two files
  coexist for exactly one commit span, and the duplication is deliberate and named.
- **The new module exports exactly `readR2Buckets` and `R2BucketEntry`.** `readWranglerConfig` and
  `WranglerFacts` are not copied; the doctor's copy keeps them until it goes.
- The copied code keeps the doctor's **line-anchored shallow read**, not a TOML parser, and keeps
  jsonc winning silently when both wrangler files exist. This is the behavior retire-1 ported to Go;
  a change here would diverge the two.
- **`src/lib/doctor/site-config-path.json` is NOT touched by this task** (pre-flight finding 5). It
  lives inside the directory and leaves with it in Task 4, together with `substitute.mjs`'s comment
  and `substitute.test.mjs`'s twin assertion.
- `emit-template-tree.test.ts`'s comment cross-reference is reworded to the new path, not deleted;
  the comparison it draws (the emitter's narrower reader against the tolerant one) is still true.
- **The dist spawn proof is its own file**, `src/tests/unit/media-seed-dist-spawn.test.ts`, following
  the `delivery-data-dist-spawn` precedent. `vitest.config.ts` gains it in **two** places: the
  `unit-dist-spawn` project's `include`, and the `unit` project's `exclude`, so it runs exactly once
  and on a single non-concurrent fork. It runs on CI unconditionally, never behind a `skipIf`.

**Acceptance criteria.**

- The new module exists, exports exactly the two names, and imports nothing from the doctor:
  `grep -rn "from '.*doctor" src/lib/media-seed/` returns nothing, and
  `grep -n '^export' src/lib/media-seed/wrangler-config.ts` lists exactly `R2BucketEntry` and
  `readR2Buckets`.
- `grep -rn 'doctor/wrangler-config' src/lib/media-seed src/tests/unit/media-seed*.ts` returns
  nothing.
- **`src/lib/doctor/wrangler-config.ts` still exists and still compiles**, and the five doctor
  importers are unchanged: `git diff --stat src/lib/doctor/` is empty for this task.
- **The built bin spawn:** `npm run package`, then the new spec spawns `dist/media-seed/bin.js`
  under plain Node against a fixture site carrying an `r2_buckets` entry and asserts it resolves the
  bucket. Command: `npx vitest run --project unit-dist-spawn`.
- `vitest.config.ts` carries the new file in both lists:
  `grep -c 'media-seed-dist-spawn' vitest.config.ts` returns 2.
- Scoped gate green, **heavy lane** (it runs `npm test`):
  `cairn-run-gate 'npm run check && npm test && npm run check:package && npm run check:surface -- --update && npm run check:reference && npm run check:reference:signatures && npm run check:comments && npm run check:symbols && npm run check:idioms && npm run check:template && npm run test:emit'`.

**Implementer's report shape.** Files touched; confirmation that the doctor copy is untouched, with
the `git diff --stat` output; the spawn assertion's output; the gate result verbatim; decisions the
plan did not cover; anything it could not do.

---

## Task 4: the removal, and the script gates that break with it

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane. **Its own segment.**

**Files.** `package.json` (the `chmod` in `package` and the `cairn-doctor` bin entry);
`src/lib/doctor/**` (**deleted**, including `site-config-path.json`); the ten dedicated tests
`src/tests/unit/doctor-{bin,check-floors,check-posture,check-probe,checks-admin-mount,
checks-cloudflare,checks-github,checks-local,derive,run}.test.ts` (**deleted**);
`src/lib/vite/internal.ts` (the `AdapterFacts` trim and its doc comments); the facts writer's test
file the pre-task created; `src/lib/components/CairnTidySettings.svelte`;
`src/lib/sveltekit/csrf.ts`; `src/lib/sveltekit/guard.ts`; `src/lib/sveltekit/condition-response.ts`;
`src/lib/dev-flag.ts`; `src/lib/delivery/robots.ts`; `src/lib/vite/{assemble,bin,index}.ts`;
`src/lib/media-seed/{assemble,index}.ts`; `src/tests/unit/media-seed.test.ts`;
`packages/create-cairn-site/src/substitute.mjs`; `packages/create-cairn-site/src/substitute.test.mjs`;
`scripts/checks/check-symbols.mjs`; `scripts/checks/check-symbols-allowlist.mjs`;
`scripts/checks/check-idioms.mjs`; a new committed check-id list file under `scripts/checks/`;
`scripts/checks/check-tool-heuristics.mjs` (new); `package.json` (the `check:tool-heuristics`
script); `src/tests/unit/check-symbols.test.ts`; `src/tests/unit/check-tool-heuristics.test.ts`
(new).

**Every line citation in this block is stale by construction: docs pass A edits
`scripts/checks/check-symbols.mjs`. Re-find `doctorCheckIds` and every allowlist entry by content.**

**Deliverable count: 6. FLAGGED, over four.** The six: the bin and directory removal (with the
site-config path consolidation riding it); the `AdapterFacts` trim and its test migration; the
comment rewordings including the tidy sentence; the `check-symbols` id-vocabulary move; the
allowlist re-grounding; and `check:tool-heuristics` with its `// WATCH:` comments. They are one task
because **a task must end gate-green and `check:symbols` crashes on `readdirSync` of a deleted
directory the instant the removal lands**. Splitting them produces a task that cannot be proven.
The conductor should expect this to be the pass's largest dispatch and consider `model: opus` if
the first implementer report hedges on the id vocabulary.

**Outcome.** `cairn-doctor` is gone from the engine: no bin, no source, no dedicated tests, no stale
comment naming it. Every script gate that read `src/lib/doctor` reads a committed list instead. A
new gate fails if a symbol the Go heuristics key on disappears from `src/lib`.

**Constraints.**

- **`npm run check:tool-release` runs green before the first removal commit.** A red result stops
  the pass.
- **No `REGISTRY` entry in `src/lib/diagnostics/conditions.ts` is deleted.**
  `config.tidy-key-missing` and `admin.login-probe-failed` become unraised and stay, because
  `check:readiness` pins each to a frozen-page heading. `github.app-unreachable` keeps its runtime
  raiser at `src/lib/github/credentials.ts:20`. 2b files their eventual removal to `ROADMAP.md`.
- **`src/lib/doctor/site-config-path.json` leaves with the directory**, and in the **same commit**
  `packages/create-cairn-site/src/substitute.mjs`'s comment and `substitute.test.mjs`'s twin
  assertion are re-grounded on the scaffolder's own copy as the one source. Otherwise
  `npm --prefix packages/create-cairn-site test` is red at this commit.
- **The check-id vocabulary becomes a committed list the script reads**, replacing `doctorCheckIds`'s
  directory walk. The list holds the eleven surviving ids plus the deferred and dropped ids docs
  history still cites, so a page quoting a retired check id does not become a hallucination. The
  eleven: `config.bindings`, `config.observability`, `config.csrf-disable`, `config.public-origin`,
  `config.site-config`, `config.no-referrer-blanket`, `config.dependency-floors`,
  `admin.mount-shape`, `config.media-bucket`, `auth.role-wiring`, `ai.posture-effective`. The
  deferred and dropped set it must also carry: `auth.store`, `auth.role-vocabulary`,
  `auth.email-normalization`, `edge.https-forced`, `email.sender-onboarded`, `github.app`,
  `config.tidy-key`, `admin.login-probe`. The task seeds the list from this plan and states that
  Task 6's `check:symbols` run is the proof that the docs cite nothing outside it.
- **The allowlist re-grounding**, per pre-flight finding 14. Every surviving entry keeps a **true**
  reason, which is the allowlist's own rule at its header. `cli-flag:--repo` is **removed**, not
  reworded. The `_INSTALLATION_ID` and `_PRIVATE_KEY_B64` entries fall with `CAIRN_GITHUB_APP_ID`'s
  "same CI workflow" grounding. The `file-path:src/site.config.yaml` entry is re-grounded on the new
  `cairn doctor` transcript Task 5 captures, or removed. The header's bin list drops `cairn-doctor`.
- **`check:tool-heuristics`**, scoped to `src/lib` and pinned to **exact forms**, not loose words.
  Three are real engine symbols: `CairnAdminShell` (the component the Go heuristic matches by name),
  `.shellLoad` (the member access the mount heuristic proves the layout makes), and
  `createAuthGuard` (whose argument shape the role-wiring heuristic reads). **The fourth,
  `checkOrigin: false`, is a SvelteKit config key the engine never exports**, so there is no engine
  symbol to watch. The Go heuristic's assumption instead rests on the engine **telling sites to set
  it**, which lives in `src/lib/diagnostics/conditions.ts`'s `config.csrf-disable` entry: its `why`
  and `remediation` both carry the literal `checkOrigin: false`. The gate pins **that literal, in
  that file**, as the fourth watch. If the implementer judges that pin unsound, it drops to three
  symbols and **states plainly in its report why the fourth has no engine-side anchor**; it never
  invents one.
- Each watched site carries a co-located `// WATCH:` comment naming the gate, so the next editor
  sees the dependency in context. The gate joins `npm run check`'s composition.
- **`AdapterFacts` keeps `mediaBucketBinding`, `roles`, and `aiPosture`** and loses `owner`, `repo`,
  and `from`. Its doc comment and `adapterFactsSource`'s are reworded to name the facts writer, not
  the doctor. **`readAdapterFacts` and `AdapterFacts` are not deleted**:
  `src/tests/unit/delivery-media-vite-barrel-prune.test.ts` pins both names, and the pre-task's
  facts writer is the surviving caller.
- **`doctor-derive.test.ts`'s `readAdapterFacts` coverage moves to the facts writer's tests** before
  that file is deleted. `deriveMissingInputs` and `DerivationSources` leave with the directory and
  their coverage goes with them.
- **`CONTENT_SIGNAL`'s `export` gets a ruling, not an assumption** (pre-flight finding 13). After
  `src/lib/doctor/check-posture.ts` goes, its only user is its own declaring module
  `src/lib/delivery/robots.ts`. The task greps for every importer, checks `check:surface` and the
  delivery barrels, and **either drops the `export` keyword or keeps it with a stated reason**. One
  line in the report, either way.
- **`CairnTidySettings.svelte`**: the sentence telling an editor to run `cairn-doctor` is rewritten
  to stop at "reload this page". It does **not** point at `cairn doctor` instead: `config.tidy-key`
  no longer exists in any tool, so nothing confirms the key. `check:prose` gates the result, and the
  change is body copy inside the existing element, with no class or structural edit.
- **The four bare-`doctor` comment sites of pre-flight finding 12** (`guard.ts`,
  `condition-response.ts`, `dev-flag.ts`, `delivery/robots.ts`) are reworded even though the
  removal-predicate grep does not find them. Each names `cairn doctor` or the condition, whichever
  is true.
- `scripts/checks/check-rulings-format.mjs` is **not touched by this pass at all.** Its `:65` slug is
  a ratchet entry, not a doctor dependency.

**Acceptance criteria.**

- `npm run check:tool-release` exits 0, recorded before the first removal commit.
- `test ! -e src/lib/doctor; echo "exit:$?"` prints `exit:0`.
- **The removal predicate is empty outside `packages/create-cairn-site`** (Task 5 owns the rest):
  `grep -rn 'cairn-doctor\|lib/doctor' src scripts templates examples | grep -v package-lock.json`
  returns nothing.
- `node -p "Object.keys(require('./package.json').bin)"` contains no `cairn-doctor`, and
  `node -p "require('./package.json').scripts.package"` names no `dist/doctor/bin.js`.
- `npm run check:symbols` green with `src/lib/doctor` absent, proving the vocabulary now comes from
  the committed list.
- **The new gate goes red on a removed symbol**: rename one watched site in a scratch copy, run
  `npm run check:tool-heuristics`, and show the nonzero exit and the message naming it. Restore,
  then show the green run. Both outputs go in the report.
- Every watch carries its comment: `grep -rn 'WATCH:' src/lib | grep -c tool-heuristics` returns the
  number of watched sites the task settled on (4, or 3 with the stated reason).
- `npm run check:readiness` green, proving no `docsAnchor` was orphaned and no registry entry left.
- `npm run check:idioms` green with the `github.app` allowance's second source removed.
- `npm --prefix packages/create-cairn-site test` green, including `substitute.test.mjs`.
- **The full gate list is green**, the whole list under "The gate", run sequentially where the
  sequencing rule applies. This closes Segment B.
- **No visual baseline moves.** `git status --porcelain examples/showcase/` shows no `*-snapshots/`
  change.

**Implementer's report shape.** Files touched; the removal-predicate output verbatim; the two
`check:tool-heuristics` runs (red and green) verbatim; how the check-id list was seeded and which ids
it carries; the `CONTENT_SIGNAL` export ruling in one line with its evidence; which allowlist
entries were re-grounded and which removed, one line each with the reason; the full gate result;
decisions the plan did not cover; anything it could not do.

**Halt:** a `check:readiness` failure, a visual baseline move, or a second `fix` verdict.

---

## Task 5: the scaffolder and the transcripts

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.

**Files.** `packages/create-cairn-site/bin.mjs`; `.../src/scaffold.mjs`;
`.../src/cloudflare/chapter2.mjs`; `.../src/cloudflare/chapter2.test.mjs`;
`.../test/resume-chapter2.test.mjs`; `.../test/resume-cloudflare.test.mjs`;
`.../test/fixtures/transcripts/02-doctor-bare.txt` (**deleted**);
`.../test/fixtures/transcripts/03-doctor-credentialed.txt` (**deleted**);
`.../test/fixtures/transcripts/04-cairn-doctor.txt` (**new capture**, name the task's choice);
`.../test/fixtures/transcripts/README.md`; `docs/admin/is-it-working.md` (**the transcript block and
its immediately adjacent narration only**). **Re-find each print site and assertion by content.**

**Deliverable count: 4.** The three print sites; the two fixture deletions; the new capture with its
README procedure and staleness note; the block swap on `is-it-working.md`. At the limit, not over.

**Outcome.** The scaffolder prints `cairn doctor` with an install pointer and never detects the
binary. Chapter 2's closing line drops `--from` and `--send-test`, keeps the fact that the installer
just sent a test message, and names `cairn adopt` then `cairn health` as the step that reaches the
https and email checks. The doctor's two golden transcripts leave, replaced by one real
`cairn doctor` capture, and `check:transcripts` never dips under a floor.

**Constraints.**

- **`01-create-cairn-site.txt` and `01d-resume.txt` are NOT regenerated and NOT edited**
  (pre-flight finding 1). They are real pty captures against a torn-down site, through a harness
  outside this repo, and the fixtures README's own two rules forbid both editing and invention.
  `git diff --stat` on both files is **empty**.
- **The README gains a second staleness note instead**, in the shape of the existing 2026-09-19
  one: the captures predate the doctor's retirement and still print the old
  `Run \`npx cairn-doctor\` any time ...` reminder, which the scaffolder no longer prints.
  `check:transcripts` compares quoted blocks against fixtures, not against current behavior, so it
  stays green either way; the note says that too.
- **The reminder text**, at all three print sites: run `cairn doctor` any time; install with
  `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from the release page, whose URL
  is written **literally**, not assembled at runtime.
- **The scaffolder never detects the binary.** No `which`, no spawn, no conditional message. It
  prints the pointer unconditionally, which is spec ruling 10.
- **Chapter 2's line** keeps "the installer just sent a test message" as a statement of what already
  happened (spec ruling 1). It names no re-run command, because none exists until 1.x.
- **`02-doctor-bare.txt`'s "Deliberately unconsumed" bullet goes with the file.** That bullet is the
  fixture's only citation, and `transcript-blocks.mjs` reports a `fixture-uncited` violation for an
  unlisted fixture; a bullet naming a deleted fixture is the same check's staleness.
- **`03-doctor-credentialed.txt`'s deletion and the new capture are the SAME change.**
  `docs/admin/is-it-working.md` quotes `03` as its only transcript block and its floor is 1, so the
  deletion cannot precede the replacement. This task lands both, plus the block swap on the page.
- **How the new transcript is captured**, and the procedure goes in the README:
  - Install the released binary: `go install github.com/glw907/cairn-cms/tool/cmd/cairn@v1.1.0`.
    The tagged release, not `@latest`, so the capture names a version a reader can reproduce.
  - Run it against a site that has been **built**, with `npx cairn-manifest` run, so
    `src/content/.cairn/site-facts.json` exists. Without that file the three facts checks report
    `unknown` with "needs engine 0.97.0 or later, and one build", and a capture of that state would
    publish a degraded run as the normal one.
  - **A plain shell redirect is acceptable.** `transcript-blocks.mjs` is capture-agnostic: it
    normalizes a pty control stream when one is present and compares normalized text, so a capture
    with no control bytes compares fine. No pty harness is needed for a non-interactive command,
    which is why this capture is reproducible where the `01` ones are not. The README says so.
  - The "no invented output, ever" and "a fixture is never edited" rules apply to the new fixture
    exactly as to the old ones.
- **`is-it-working.md`'s scope in THIS task is the block and its adjacent narration only.** The
  marker, the fenced content, and the paragraphs that narrate what the capture shows (today the
  `CLOUDFLARE_API_TOKEN` paragraph and the skip arithmetic, which describe a credentialed run that
  no longer exists). **Everything else on that page is Task 6's.** The task states the boundary it
  drew.
- **The floor is not lowered.** `transcript-blocks.mjs` keeps `docs/admin/is-it-working.md: 1` and
  `docs/admin/create-your-site.md: 3`.

**Acceptance criteria.**

- `git diff --stat -- packages/create-cairn-site/test/fixtures/transcripts/01-create-cairn-site.txt
  packages/create-cairn-site/test/fixtures/transcripts/01d-resume.txt` is **empty**.
- **The removal predicate is empty with exactly one carve-out** (pre-flight finding 2):
  `grep -rn 'cairn-doctor\|lib/doctor' src packages scripts templates examples | grep -v
  package-lock.json | grep -v 'packages/create-cairn-site/test/fixtures/transcripts/'` returns
  nothing. The report enumerates the surviving hits inside the carve-out and states that each is a
  historical capture or the note that explains one.
- `grep -rn 'go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest' packages/create-cairn-site`
  finds the literal install line, and the release-page URL is present as a literal string.
- The new fixture exists, was produced by the released binary, and its first line names the command
  run. The report carries the exact capture command line.
- `npm run check:transcripts` green, proving both floors met, no uncited fixture, and no stale
  "Deliberately unconsumed" entry.
- `npm --prefix packages/create-cairn-site test` green, all string-assertion files updated.
- `npm run check:docs`, `npm run check:symbols`, `npm run check:vale`, `npm run check:prose` green.
- Scoped gate green, heavy lane:
  `cairn-run-gate 'npm run check && npm test && npm run check:transcripts && npm run check:symbols && npm run check:docs && npm run check:facts && npm run check:prose && npm run check:vale && npm run check:template && npm run test:emit && npm --prefix packages/create-cairn-site test'`.

**Implementer's report shape.** Files touched; the exact capture command line and the site it ran
against, including that `npx cairn-manifest` had been run; the `check:transcripts` output verbatim;
the boundary it drew on `is-it-working.md`; the carve-out grep output; the gate result; decisions
the plan did not cover; anything it could not do.

**Halt:** the released binary cannot be installed or produces no clean capture. That is a retire-1
or release defect, not something this task works around with a hand-written transcript.

---

## Task 6: the published docs arms

**Runs as:** `cairn-implementer` chain, `model: sonnet`. Heavy lane.

**Files.** **21 files across 11 distinct pages of substantive edit, plus one gate script.**
**admin (4)** `is-it-working.md`, `setup-recovery.md`, `troubleshooting.md`,
`what-to-run-and-when.md`; **extend (9)** `README.md`, `add-cairn-to-a-sveltekit-app.md`,
`enable-tidy.md`, `build-a-site-by-hand.md`, `rotate-the-github-app-key.md`, `upgrade-cairn.md`,
`security-model.md`, `migration-notes.md`, `sign-in-through-your-organization.md`;
**reference (8)** `README.md`, `cli-cairn-media-seed.md`, `core.md`, `components.md`, `vite.md`,
`doctor.md` (**deleted**), `guidance.md`, `sveltekit.md`; plus `scripts/checks/docs-links.mjs`
(the `LEGACY_PATH_MAP` entry).

**Every line citation below is stale by construction: docs pass A rewrote `docs/reference/README.md`
and moved the tool's contract pages under `docs/reference/`. Re-find every site by content.**

**Deliverable count: 4.** The page deletion with its twelve inbound references and the
`LEGACY_PATH_MAP` entry; the stale-step replacements; `is-it-working.md`'s sections and label table;
the two per-version extend records. **At the limit by count and the pass's highest by volume: 21
files, 11 pages. The conductor sizes this dispatch by volume and should expect it to be the
likeliest re-dispatch of the pass.** If the first implementer report hedges on the
`rotate-the-github-app-key.md` rewrite, split the dispatch at the page boundary rather than
re-dispatching the whole thing.

**Outcome.** No published-arm page instructs a reader to run a command or a flag that does not
exist. `docs/reference/doctor.md` is gone and every inbound reference resolves.

**Constraints.**

- **The narrative-arm freeze holds, with the stale-step allowance.** This task fixes only what is
  **false**: a missing step, a wrong warning, a stale command. No prose is rewritten for its own
  sake, and nothing here is register-graded; it is agent-facing, gated by each page's own gates.
  `migration-notes.md` and `upgrade-cairn.md` are per-version records **outside** the freeze.
- **`docs/reference/doctor.md` is deleted**, and its twelve inbound references (pre-flight finding 8)
  are retargeted to **`docs/reference/cli-cairn-doctor.md`**, the page docs pass A created, or
  unlinked, one decision per site. An anchor that page does not carry (`#the-checks`,
  `#the-opt-in-live-probe`, `#status-vocabulary`) is dropped rather than guessed:
  `check:docs` resolves anchors on a live link.
  **`docs/extend/migration-notes.md:151` is the exception**: it sits in a past-version entry, which
  the spec puts out of scope, and stays as written. The task states that explicitly.
- **`docs/reference/README.md` names the doctor three times** (pre-flight finding 7): two links and
  a bare bin-name mention in the packaged-bins sentence. All three go, and `check:arm-indexes` plus
  `check:docs` are the proof.
- **`CHANGELOG.md`'s past-version links are saved by a `LEGACY_PATH_MAP` entry, not by an edit**
  (pre-flight finding 6). `scripts/checks/docs-links.mjs` gains
  `'docs/reference/doctor.md': 'docs/reference/cli-cairn-doctor.md'`. The task **states in its report
  that all three `legacyMapProblems` invariants hold**: the value names a file that exists
  (pass A's page), the key names a file that does not (this task deleted it), and the key is still
  cited by a `CHANGELOG.md` link (the past-version entries, which nothing edits). It does **not**
  edit `CHANGELOG.md`; that file belongs to 2b.
- **The App-key step is rewritten against what the engine actually logs** (pre-flight finding 9),
  and this is the one replacement the task must not paraphrase from the spec:
  - `github.unreachable` fires **only** on best-effort reads (`scope: 'shell'`, `'help'`,
    `'publish_advisories'`). It is **not** what a bad key on publish produces.
  - A bad key on the publish path throws `github.app-unreachable` from
    `src/lib/github/credentials.ts:20` and logs `publish.failed` or `commit.failed` at error level
    through `src/lib/sveltekit/commit-log.ts`.
  - **Step 4 must demand a POSITIVE artifact before step 6's irreversible old-key deletion**: a
    successful publish that produces a commit on `main` authored by `cairn-cms[bot]`. An absence of
    error logs is not evidence.
  - The step says plainly that **an empty log proves nothing unless `observability.enabled` is on**
    in the site's `wrangler.jsonc`.
  - **The later references to "step 4's local doctor run" are fixed in the same edit**, or the
    procedure contradicts itself mid-page.
  - Where the page names an event, it names `publish.failed` / `commit.failed` for the publish path
    and `github.unreachable` with `scope: 'shell'` for the sign-in path.
- **The workers.dev exposure gap is stated plainly, not elided.** Both
  `docs/extend/sign-in-through-your-organization.md` and `docs/extend/security-model.md` (its "The
  doctor arms" passage) must say that **no tool checks the workers.dev exposure until the CLI's
  1.x**, and each carries the manual check: an **unauthenticated GET of
  `<worker-name>.<subdomain>.workers.dev/admin`**, plus the same against the preview alias. A reader
  left with "the doctor used to check this" and no substitute is worse off than before the pass.
- **`security-model.md`'s out-of-band first-owner instruction must survive.** Its instruction to seed
  the first owner before enabling `identity` currently rides on the sentence about the `auth.store`
  check. Removing the `auth.store` sentence must not remove the instruction: it is re-expressed as
  its own statement. The task quotes the surviving sentence in its report.
- **The other stale-step replacements**, each a truthful verification step verified against the
  current text: `enable-tidy.md` (run one tidy; a bad key fails there with its log event);
  `add-cairn-to-a-sveltekit-app.md` and `build-a-site-by-hand.md` (`cairn doctor`, then the first
  publish); and, under the same allowance because each names a command that will not exist,
  `upgrade-cairn.md`, `extend/README.md`, `admin/troubleshooting.md`, `admin/setup-recovery.md`,
  `admin/what-to-run-and-when.md`. The task reports each as a stale-step fix with its line and the
  false statement it replaced, so the freeze's boundary stays auditable.
- **`is-it-working.md` keeps every heading.** `check:readiness` pins each `docsAnchor` to a real
  heading, and this pass deletes no registry entry, so deleting a heading is an automatic red. Four
  sections each gain **one line** saying which command checks it now or that none does until 1.x:
  the Tidy API key (none; run one tidy), the GitHub App (none; publish an edit and read
  `publish.failed` / `commit.failed`), the deployed-admin probe (none; the login probe is dropped,
  and the workers.dev arm needs the manual check above), and the auth store (deferred to the CLI's
  1.x). Two more are reachable only after adoption and get the same treatment naming `cairn health`:
  forcing HTTPS at the edge, and onboarding the sending domain.
- **The label-to-section table** marks the rows for the dropped and deferred checks. Every printed
  label in the surviving rows must still equal its condition's registry `title`, which is what
  retire-1's port preserved.
- **The page's running instructions** name `cairn doctor` with the install pointer. The transcript
  block and its immediately adjacent narration were already swapped by Task 5; this task does not
  re-touch them.
- Vale runs Google on the admin, extend, and reference arms. A replacement step that trips a new
  Vale error is fixed in the same task, never allowlisted.
- **This task writes no facts bullet and no changelog entry.** Task 2 repaired the container; 2b adds
  to it.

**Acceptance criteria.**

- `test ! -e docs/reference/doctor.md; echo "exit:$?"` prints `exit:0`.
- `grep -rn 'reference/doctor' docs --include='*.md' | grep -v '^docs/internal/' | grep -v
  '^docs/superpowers/'` returns exactly one line, `docs/extend/migration-notes.md:151`, with its
  past-version exemption stated in the report.
- `grep -rn 'cairn-doctor' docs/admin docs/extend docs/reference docs/editors docs/why-cairn.md`
  returns nothing except inside `migration-notes.md`'s past-version entries, which the report
  enumerates by line.
- `grep -n "docs/reference/doctor.md" scripts/checks/docs-links.mjs` shows the `LEGACY_PATH_MAP`
  entry, and the report states all three invariants with its evidence for each.
- **The App-key page's positive artifact is present**: the report quotes the rewritten step 4
  verbatim, and it demands a commit on `main` authored by `cairn-cms[bot]`.
- **The workers.dev manual check is present on both pages**:
  `grep -rn 'workers.dev' docs/extend/sign-in-through-your-organization.md
  docs/extend/security-model.md` finds the unauthenticated-GET instruction on each.
- **The first-owner instruction survives**: the report quotes the surviving sentence from
  `security-model.md`.
- `npm run check:readiness` green, proving every heading survived and every anchor still resolves.
- `npm run check:docs`, `check:arm-indexes`, `check:snippets`, `check:symbols`, `check:transcripts`,
  `check:vale`, `check:prose`, `check:editor-quotes`, `check:visuals` all green.
- `npm run check:reference` and `check:reference:signatures` green with the page gone, proving the
  doctor carried no exported subpath.
- **The full gate list is green**, closing Segment C.
- Every changed page is reported with its line and the false statement it replaced.

**Implementer's report shape.** Files touched, grouped by page; one line per retargeted or unlinked
reference with its decision; one line per stale-step fix with the false statement it replaced; the
rewritten App-key step 4 verbatim; the surviving first-owner sentence verbatim; the three
`legacyMapProblems` invariants with evidence; the `check:readiness` output; the full gate result;
decisions the plan did not cover; anything it could not do.

**Halt:** a `check:readiness` failure, a Vale error a truthful replacement cannot avoid without
rewriting frozen prose, or `docs/reference/cli-cairn-doctor.md` turning out not to exist.

---

## Task 7: the small close

**Runs as:** **one fold agent**, which commits its own draft and then folds, followed by **one
independent `diff-reviewer` read (`model: claude-opus-5`) over the fold's diff**. Not an implementer
dispatch. The conductor reads the reviewer's verdict, not the diff.

**Files.** `docs/HISTORY.md`, `docs/STATUS.md` (**one line only**), this plan file (the
post-mortem).

**It migrates nothing else.** No ROADMAP edit, no friction-log triage, no ledger entry, no changelog
entry, no STATUS-to-HISTORY migration of unrelated history. **All of those are 2b's**, and doing
them here would put two writers on one file across two passes.

**Order.**

1. **`code-simplifier`** (plugin agent, pins Opus) over the code this pass changed: Task 3's new
   media-seed module and Task 4's trimmed `AdapterFacts`. Apply its refinements, then proceed.
2. **`web-auth-security-reviewer`** over the whole diff, on the one question named in the header's
   fan-out section: did any auth, CSRF, or guard **behavior** change, as opposed to its
   documentation. A finding that behavior changed is a halt.
3. **`docs/HISTORY.md`** gains this pass's entry, newest first: what landed, what the gate caught,
   and **what a later pass would be wrong to rediscover from scratch**. That last clause carries
   this pass's real lessons: that `check:facts` resolves pointers into deleted source and so the
   container is repaired at HEAD, before the removal; that `check-symbols.mjs`'s directory walk is
   the gate that crashes first; that the `02-doctor-bare.txt` citation lived in a README bullet
   rather than on a page; and that the `01` captures are unreproducible fixtures that take a
   staleness note instead of a regeneration.
4. **`git merge origin/main`** into `doctor-engine`. `docs/STATUS.md` is the expected conflict.
5. **Re-gate after the merge with the FULL gate list**, sequentially where the sequencing rule
   applies. **Heavy lane.** Then open the PR and merge it on green CI.
6. **Message whichever session holds `main`** before the STATUS write. Confirm who holds it rather
   than assuming. Two conductors never both write STATUS on one branch.
7. **The STATUS line, written last and written once**, and **it is not the unblock line.**
   `docs/STATUS.md` gains, under its immediate next action, one line saying **the doctor is removed
   on `main`, and the records pass (retire-2b) is pending**, naming this removal's merge SHA.
   **"The `0.97.0` cut is unblocked" is 2b's close to write, and writing it here would be a false
   claim**: the changelog window still describes the doctor as present, the ledger has no entries,
   and the cut's own precondition reads both.
8. **The post-mortem** appended to this plan file, with both budget scores: tokens against the 2.6M
   ceiling (`/cost`), and attended time as two counts (planning misses, execution sittings).

**Acceptance criteria.**

- The PR is merged and CI on `main` is fully green on the exact merge SHA. Command:
  `gh run list --commit "$(git rev-parse origin/main)" --json workflowName,conclusion,status`. An
  absent run counts as red.
- `docs/STATUS.md` is at or under 60 lines, present tense, and **does not** carry the unblock line:
  `grep -c '0.97.0 cut is unblocked' docs/STATUS.md` returns 0.
- The STATUS line names this removal's merge SHA, and it resolves: `git cat-file -t <sha>`.
- `git ls-tree origin/main src/lib/doctor` prints nothing, and
  `node -p "Object.keys(require('./package.json').bin)"` at `origin/main` shows no `cairn-doctor`.
- `docs/HISTORY.md` has this pass's entry, newest first, carrying the rediscovery clause.
- The `diff-reviewer` read over the fold's diff returns accept.
- `git diff --stat package.json` shows no `version` change, `git tag --points-at HEAD` is empty, and
  `git diff --stat origin/main -- CHANGELOG.md docs/internal/engine-rulings.md ROADMAP.md` is empty
  (this pass touches none of the three).

**Halt:** a red gate after the merge; a merge conflict in anything other than `docs/STATUS.md` or
`docs/HISTORY.md`; a `web-auth-security-reviewer` finding that behavior changed; or another session
holding `main` that has not acknowledged the handoff.

---

## Sizing

**Seven tasks, within the eight-task guideline**, where the undivided retire-2 ran nine. The split,
not a task split, is what got it there: the changelog window, the ledger, and the full close left
the pass rather than being rearranged inside it.

**One task is flagged over four deliverables: Task 4, at six.** The reason is structural, not
accretive: a task must end gate-green, and `check-symbols.mjs`'s directory walk makes the removal
and the gate repair one atomic change. No scope was added to it by adjacency.

**One task is flagged by volume rather than count: Task 6, at 21 files and 11 pages.** It is the
likeliest re-dispatch of the pass, and the block names the page boundary to split on.

**Where this half hands off.** Segment C ends on a commit where every gate is green, the doctor is
gone from source, scaffolder, and published docs, and the removal predicate is empty but for the two
historical captures. What `main` then lacks is the record: the `## Unreleased` window still describes
a doctor that gains features, no ledger entry exists for any ruled item, and ROADMAP carries nothing
this pass deferred. **That gap is exactly 2b's scope, and it is why 2b must run before the cut, not
after.**

---

## Spec coverage

Every retire-2 requirement this half carries, mapped to its task. **Requirements marked "2b" are
carried by [`2026-09-21-doctor-retire-2b-records.md`](2026-09-21-doctor-retire-2b-records.md); every
retire-2 requirement maps to exactly one task across the two plans.**

| Spec requirement (retire-2 section) | Task |
| --- | --- |
| First task commits `check-tool-release.mjs`, asserting the tag **and** the release; run before any removal commit; red stops the pass | 1 |
| `check:facts` survives the removal (pre-flight finding 3; not in the spec) | 2 |
| Ruling 6: `wrangler-config.ts` reaches `src/lib/media-seed/`, trimmed, `DoctorContext['readFile']` inlined | 3 (copy), 4 (original deleted) |
| `media-seed/assemble.ts`, `bin.ts`, and the `media-seed.test.ts` mock repoint | 3 |
| Acceptance spawns the built `cairn-media-seed` bin | 3 |
| `package.json`: the `cairn-doctor` bin entry and its `chmod` | 4 |
| `src/lib/doctor/**` and the ten dedicated doctor tests | 4 |
| `doctor-derive.test.ts`'s `readAdapterFacts` coverage moves to the facts writer's tests | 4 |
| Ruling 6: the engine's `site-config-path.json` leaves; the scaffolder's copy is the one source | 4 |
| `CairnTidySettings.svelte` rewritten to stop at "reload this page"; `check:prose` gates it | 4 |
| Comments in `src/lib/vite`, `sveltekit/csrf.ts`, `guard.ts`, `condition-response.ts`, `dev-flag.ts`, `delivery/robots.ts`, and the incidental tests reworded | 4 |
| No `REGISTRY` entry deleted; two conditions stay unraised; `github.app-unreachable` keeps its raiser | 4 (kept), 2b (filed to ROADMAP) |
| `check-symbols.mjs`'s check-id vocabulary moves to a committed list | 4 |
| The `check-symbols-allowlist.mjs` entries excused by `docs/reference/doctor.md` re-grounded or removed | 4 |
| `check:tool-heuristics` added, with a `// WATCH:` comment at each watched site | 4 |
| `CONTENT_SIGNAL`'s `export` ruled on (pre-flight finding 13; not in the spec) | 4 |
| The removal-predicate grep returns nothing outside generated lockfiles **and the transcript-fixture carve-out** | 4 (source), 5 (packages) |
| Three scaffolder print sites; the reminder names `cairn doctor`, the `go install` line, and the literal release-page URL | 5 |
| Chapter 2's line drops `--from` and `--send-test`, keeps the sent-test fact, names `cairn adopt` then `cairn health` | 5 |
| Transcripts `02` and `03` leave; the `01` captures **stay and gain a README staleness note** (spec correction) | 5 |
| A new `cairn doctor` transcript meets `is-it-working.md`'s floor of 1; the capture procedure is in the README; the floor is not lowered | 5 |
| The string-assertion tests follow; `substitute.test.mjs`'s twin assertion follows | 5 (strings), 4 (the twin, with the JSON) |
| The 21 published-arm files are in scope; `docs/internal` and `docs/superpowers` are not swept; past-version `migration-notes.md` entries are not swept | 6 |
| `docs/reference/doctor.md` leaves; the cross-arm links retargeted to `docs/reference/cli-cairn-doctor.md` or unlinked; `CHANGELOG.md`'s past-version links saved by `LEGACY_PATH_MAP` | 6 |
| A reference page for `site-facts.json` arrives | pre-task (precondition) |
| The five stale-step replacements, the App-key step's positive artifact, and the workers.dev manual check | 6 |
| `is-it-working.md` keeps every heading; the named sections gain one line; the label table marks those rows | 6 |
| `upgrade-cairn.md`'s live procedure and a new `migration-notes.md` entry | 6 |
| Facts bullets in `admin.md`, `extend.md`, `reference.md` (**additions**) | 2b |
| The site upgrade brief's four mentions corrected | 2b |
| The `## Unreleased` reconciliation and its `Consumers must:` list | 2b |
| Ledger entries and the `audit-cli-*` dispositions | 2b |
| cairn-pub's hardcoded `/docs/reference/doctor` link filed | 2b |
| Close: HISTORY, ROADMAP, then the STATUS unblock line | 7 (HISTORY, the removal STATUS line), 2b (ROADMAP, the unblock line) |

| Spec acceptance bullet ("Pre-task and retire-2") | Task |
| --- | --- |
| `check:tool-conditions` goes red on a hand-edited mirror, and the third workflow runs it | pre-task (precondition; this pass runs `check:tool-conditions` in its gate list) |
| A build with a changed adapter and a stale `site-facts.json` fails | pre-task (precondition) |
| The removal predicate grep is empty | 4, 5 (with the carve-out of pre-flight finding 2) |
| The built `cairn-media-seed` bin reads R2 buckets | 3 |
| Every gate in the list is green | 4, 6, 7 (the three full-list runs) |
| The ledger entries pass `check:rulings-format` | 2b |
| The facts bullets exist | 2 (repair), 2b (additions) |
| The `Consumers must:` line exists | 2b |
| The ROADMAP entries exist | 2b |
| No published-arm page instructs a reader to run a command or flag that does not exist | 6 |
| STATUS carries the unblock line, written once | 2b |

**The coverage row "the docs conductor briefed" is deliberately absent.** Draft docs pass A runs
**before** this pass branches, so briefing its conductor is not work this pass can carry; it is a
precondition, recorded in the Header.

---

## Post-mortem

Written at pass end by the fold agent.

**Token budget.** About 2.75M against the 2.6M ceiling, over by roughly 150K. Segments A and
B spent 1.55M of subagent tokens, Segment C spent 1.11M, and the close's `code-simplifier`
run and `web-auth-security-reviewer` read add to that base. The conductor's own fold and
reviewer totals land on top of this figure. Geoff ruled the pass through at the Segment C
boundary rather than splitting it, since every task had already landed and only the close
remained.

**Attended time.** Two planning misses, one execution sitting.

- Planning miss 1: Task 5's removal-predicate grep needed a second carve-out for the
  permanent rulings-ledger id `audit-cli-skill-admin-screens-check-and-cairn-doctor-fix`,
  which a pre-flight grep against `check-rulings-format.mjs` would have found before the
  task ran.
- Planning miss 2: Task 6's literal-grep criterion needed to exclude pass A's own filenames,
  `cli-cairn-doctor.md` and `cairn-doctor.schema.json`, which a pre-flight grep against the
  reference arm's file list would have found the same way.
- Execution sitting 1: one combined question to Geoff at the Segment C ceiling boundary,
  asking whether to split the remaining close out of the pass or run it through at the
  over-ceiling spend; Geoff ruled through.

**What was built.** `src/lib/doctor/` (sixteen files) and its `cairn-doctor` bin entry are
gone from the engine; the R2 bucket reader it owned moved into `media-seed`; the scaffolder
and the published docs arms point at the Go `cairn` tool instead; the facts container's
pointers into the doctor were repaired before the deletion so the container never carried an
unresolvable citation.

**What was verified, with evidence.** Each of Tasks 1 through 6 cleared its own gate inside
the implementer chain before the next task started (recorded per task in this plan's task
sections and the close package). The close's `web-auth-security-reviewer` read returned
`behavior-unchanged`: no auth, CSRF, or guard behavior changed, only its documentation and
comments. The fold's own re-gate after the merge with `origin/main` is recorded in the
close report this post-mortem accompanies.

**Decisions locked.**

- Task 5 accepted on an `escalate` verdict: the removal-predicate criterion gains a second
  permanent carve-out for the rulings-ledger id, the diff (`28eeacc2`, `138cec5c`) stands
  unchanged, and Task 5's fixture is named `04-doctor-report.txt` rather than the plan's
  suggested `04-cairn-doctor.txt`, which would have matched the removal predicate itself.
- Task 6 accepted after one fix round (six false statements caught by the first review,
  confirmed fixed by the second); its literal-grep criterion is a wording defect, not an
  intent violation, since the retired bin name survives only in `migration-notes.md`'s
  past-version entries.
- The security verdict is `behavior-unchanged`; no halt.
- Three items carried forward to 2b's friction log rather than fixed in this pass: no
  scaffolder test pins the setup command's install literal or release URL in printed output;
  `cairn doctor` v1.1.0's PASS lines are titled with the failure condition, worth filing
  against the Go tool's render; `is-it-working.md`'s symlink paragraph addresses a
  contributor rather than a site operator, a register slip for whichever pass next touches
  those lines.

**Blockers.** None.
