# Engine pass B before stage 2b: plan fold record (2026-10-08)

Target: `docs/superpowers/plans/2026-10-08-engine-pass-pre-2b-b.md`, plan commit `57baf01b`, folded
on `main` at `7a777e5e` (uncommitted). Inputs: the three reviews in this directory (`-contract`,
`-mechanics`, `-risk`), the spec and its rulings file, pass A's plan, and one cross-plan blocker the
conductor routed from `2026-10-08-engine-pass-pre-2b-a-plan-review-mechanics.md`. The conductor's
rulings for this fold are treated as decisions, not forks.

Every finding was checked against `main` before a disposition was written. Evidence read: the
plan's cited lines, `src/lib/sveltekit/types.ts:55-72`, `content-routes-shell.ts:133-200`,
`github/backend.ts:25-75`, `ambient.ts`, `hast-util-sanitize/lib/index.js:360-395`,
`render/sanitize-schema.ts`, `render/pipeline.ts:113`, `packages/cairn-cms-dev/{package.json,src/handle.ts}`,
`~/.claude/workflows/pass-execute.js:410-425,600-615,684-709`, `~/.claude/agents/{cairn-implementer,diff-reviewer}.md`,
`scripts/checks/gate-tier.mjs` (classifier, and a probe of the empty-range exit), `docs-gate.mjs`'s
check list, `relink.json`'s shape, `publish.yml`'s `publish-dev` job, the two `create-cairn-site`
test fixtures, `facts/admin.md`, `durable-gotchas.md`, `engine-rulings.md`, and `xcathletes-org`'s
hooks.

IDs: `C-` contract, `M-` mechanics, `R-` risk, `X-` cross-plan. Forty-three IDs: contract 12,
mechanics 18, risk 10, cross-plan 3.

## Convergent roots (fixed once)

| Root | IDs | Disposition | Where |
| --- | --- | --- | --- |
| The owner's Firefox click proves nothing pass B changed | C-M2, M-M1, R-m6 | folded | Decision 11 (pass A's Decision 14 wording), owner-gated list, Close intro and step 6. |
| The dev package's `svelte` export condition | C-M4, M-m9 | folded | Task 4 Outcome (every condition into `dist/`) and a per-condition table test. |
| The smoke's "site without `editor.nav`" | C-m2, M-m12 (second part), R-m5 | folded | Close step 6 reworded: the showcase's Settings save through the engine default after Task 9. Kept, not dropped: it costs nothing on a session the smoke already mints. |
| Task 11 before Task 10 has no records split | M-M4, C-m1 | folded | Decision 1, Task 10 Files and Acceptance, Task 11 throughout, Close step 9 (the Now entry). |
| Stock `npm test` at the close | M-M5, X-2 | folded | Close step 2: F only if the simplifier changed code, never the stock `npm test`. |
| Task 0's gate print and PR order | M-m1, M-m2, X-3 | folded | "Gates" (print from `TIER_GATES`), Task 0 items 4 and 6. |
| Gate floors and light lanes the runner cannot hold | M-M2, C-m7 | folded | Execution mode, "Gates" (S and D removed), every task's Gate line, Tasks 2 and 11 Acceptance. |

## Per-finding dispositions

### Contract and criteria

| ID | Disposition | Note |
| --- | --- | --- |
| C-M1 | folded | Verified: `shellLoad` takes `CairnEvent`, whose `locals` is the public structural mirror (`types.ts:66-72`, `api-surface.md:183`), so an `App.Locals` member alone needed a third unnamed member. The leaner fold holds: `CairnEvent.locals` already types `cairnBackend?: Backend`. Decision 3 now names `Backend.ephemeral`, read straight from `event.locals.cairnBackend` (never through the provider resolve, which mints a token in production). Task 10 Files (`backend.ts`, `core.md`), Outcome, a `check:surface` criterion (exactly two new members), Task 11's reference bullet, and the close's security brief follow. |
| C-M2 | folded | Root, owner click. |
| C-M3 | folded | Verified the four ids at `facts/admin.md:10,40,51,116`. Added to Task 11's candidate set; Task 0's re-grep runs over all of `docs/internal/facts/` with `two (D1 )?databases` and `-app\b`; `f:xw0bit`'s correction notes the stale capture. |
| C-M4 | folded | Root, `svelte` condition. Verified `package.json:20-24`. |
| C-M5 | owner fork 3 | Verified the record (`2026-10-03-sveltekit-3-upgrade.md:1562`). The basis sentence now quotes it, and the table prices chains at 0.55M and the close at 2.95M: 12.05M, held at 12.0M, 80 percent at 9.6M. Geoff rules the number. |
| C-m1 | folded (root) | The contradiction is fixed at its root by giving Task 10 every ruling-5 record. The proposed alternative, fork 1 as a Task 0 precondition, is refused: it would block S1 to S3 on a fork that governs only Task 10, which is Decision 1's whole point. |
| C-m2 | folded | Root, smoke bullet. |
| C-m3 | folded | Task 10 Acceptance: "after a save, a disk edit to that same file does not show until restart". |
| C-m4 | folded | Task 5 Outcome names the channels and keeps `process.cwd()` (verified `templates/waymark/vite.config.ts:29`); a `.env.production`-only case; the close's security brief names the channels. |
| C-m5 | folded | Verified `skipLibCheck: true` at `templates/waymark/tsconfig.json:14`. "(no `TS2451`)" replaced with what the 0/0 does prove. |
| C-m6 | folded | Verified `xcathletes-org/src/hooks.server.ts:62-63`. The `Consumers may:` clause lives in Task 10's records. |
| C-m7 | folded | Root, gate floors. The floor is gone; the classifier still computes `full` for Task 1 (`src/theme/` and `wrangler.jsonc`), which is the runner's rule, so the full run stays. |

### Mechanics and feasibility

| ID | Disposition | Note |
| --- | --- | --- |
| M-M1 | folded | Root, owner click. |
| M-M2 | folded | Verified `pass-execute.js:418-421,684-709` and `gate-tier.mjs:120-147`. Per the conductor's ruling: the computed tier rules, no pins, no light lanes; S's extras (`test:emit`, `check:template`) are a quoted command in Task 2's Acceptance, D's extras (`check:surface`, `check:rulings-format`) in Task 11's. `check:facts` and `check:transcripts` already sit in `check:docs-gate` (verified `docs-gate.mjs:84,92`), so they are not repeated. |
| M-M3 | folded | Verified `scaffold.test.mjs:23-26,268` and `repo.test.mjs:67-70`. Task 2 Files and the S1 pre-flight name both. |
| M-M4 | folded | Root, records split. Task 10 owns every ruling-5 record (conductor's ruling), including the B12 row and the `MEDIA_BUCKET` watch verdict; the Now entry leaves at the close, which runs only after both tasks. |
| M-M5 | folded | Root, stock `npm test`. Verified `durable-gotchas.md:80-100`. |
| M-m1 | folded | Probed: `--range HEAD..HEAD --pin full` exits 1. F and E print from the module's `TIER_GATES` export (verified present). |
| M-m2 | folded | Task 0 item 6 commits the Ledger entry before push and PR. |
| M-m3 | folded | Per the conductor's ruling: one block wraps the whole `access` member and replaces pass A's inner block (verified the nested-start throw at `emit-template.mjs:36`). The `SiteLogEvent` split (verified one line at `log.ts:7`) and the `APP_DB` comma (verified `wrangler.jsonc:34-43`) are in Task 1's Outcome. Owed erratum E1 below. |
| M-m4 | folded | Verified: no script parses `relink.json` (only a comment at `docs-links.mjs:168`); the file is `{ _note, entries }` with existing `stage: "2b"` link-repair entries. The docs-links clause is gone from precondition 5 and Task 11; Task 11's Acceptance is a quoted `node -e` assertion; the precondition probe counts only entries with a `facts` array. |
| M-m5 | folded | Task 0 copies pass A's hand-off list into the Ledger; Task 11 reads it there. |
| M-m6 | folded | Close step 6 cites the unit tests and CI, and names the transcripts stale. |
| M-m7 | folded | Verified `config.mjs:71-79,115`. "Independent" dropped from Tasks 1 and 2; the seams paragraph says they land together. |
| M-m8 | folded | Verified the guard at `publish.yml:108-111`. Task 4 replays install and build, then a direct `npm publish --dry-run --access public`. |
| M-m9 | folded | Root, `svelte` condition. |
| M-m10 | folded | Verified `content-routes-settings.ts:124` and the 2026-09-02 amendment under `audit-cli-config-site-config-check`. Decision 6 retitled "a pinned twin"; Task 9 deletes the third copy. |
| M-m11 | folded | One Global constraints line: a fresh directory and `npm install --prefer-online` for every tarball probe. |
| M-m12 | folded | First part (B3 in the showcase): verified the showcase has no root `.dev.vars.example` and its `worker-configuration.d.ts:2` points at the template repo; Task 3 edits `transformPackageJson` only. Second part: root, smoke bullet. |
| M-m13 | folded | Probed on `main`: the three added alternatives match exactly `README.md:138` and `config.mjs:36,48`. |

### Domain risk

| ID | Disposition | Note |
| --- | --- | --- |
| R-M1 | folded | Verified `hast-util-sanitize/lib/index.js:367-370` (absent `tagNames` admits every element) and `:390-393` (`strip` read only for an unsafe element), the measured defect the conductor's ruling cites. Task 8: throw at renderer construction (`pipeline.ts:113`) naming `sanitizeSchema`, plus the acceptance case; Task 11's `Consumers must:` clause names the requirement. |
| R-M2 | folded | Verified the seeds at `handle.ts:100-132` on `main` (the review's `:83-109` had drifted; the plan cites the verified range). Per the conductor's ruling: every seed runs only in `'fixtures'`, a construction-time read check, and a whole-tree snapshot (paths, bytes, mtimes) across the full operation sequence. The snapshot replaces the narrower save-only mtime line. |
| R-M3 | folded | Per the conductor's ruling: the stop list names any blocking second-`fix` finding on Tasks 2, 5, and C5, any behavior defect that survives its fix round, and a third `fix`; the accept-alone rule excludes those items; the Opus upshift is the resume path after Geoff's go (Models line). |
| R-M4 | owner fork 1 | Verified `handle.ts:39-42` and `dev-gate.ts:31-36`. The three costs are listed in fork 1's existing text. "Under the other answer" carries them as constraints and runs the rewritten task as `auth-data`. |
| R-m1 | refused | A `prepack` guard is new mechanism with no measured defect behind it: the one hand publish was the bootstrap `publish.yml:82-88` records, every release since runs `publish-dev`, and Task 4 fixes that path with a dry-run proof. The review names no team or published source that runs the guard. |
| R-m2 | folded | Verified `index.js:391` keeps an unsafe non-`strip` element's children. Task 8 asserts the script's body text is absent, adds the second mutation proof (drop the `strip` union), and moves the isolation case to a nested non-`strip` array. |
| R-m3 | folded | Verified the plugin's `configResolved` only captures `root` and `buildStart` does not run under `resolveConfig`. Task 5 proves both orders through `resolveConfig`. |
| R-m4 | folded (decided) | One answer dominates: Decision 12 accepts the window. It needs a setup interrupted across the one release after stage 5, and the alternative adds mechanism to `auth-data` provisioning code. The HISTORY entry records it. |
| R-m5 | folded | Root, smoke bullet. |
| R-m6 | folded (decided) | Root, owner click; the conductor ruled it. |

### Cross-plan (routed from pass A's mechanics review, blocker 1)

Source: `docs/superpowers/research/2026-10-08-engine-pass-pre-2b-a-plan-review-mechanics.md`, B1.

| ID | Disposition | Note |
| --- | --- | --- |
| X-1 | folded | True of pass B: its Execution mode mapped no `criteria` at all. Verified the agents never read the plan (`cairn-implementer.md:12`, `diff-reviewer.md:11`). One refinement over the routed fold, from the code: the reviewer's prompt renders `criteria` alone and never `notes` (`pass-execute.js:602-615`), so a cited Decision pasted only into `notes` would reach the implementer and not the reviewer. The plan maps `criteria` = Outcome, then Acceptance, then each cited Decision verbatim; `notes` keeps the task's own notes. Tasks 2, 3, and 11 now cite their Decisions in their headers so the mapping finds them. |
| X-2 | folded | Same as M-M5 (root, stock `npm test`). |
| X-3 | folded | Same as M-m1 and M-m2 (root, Task 0). |

## Owed cross-plan errata for pass A

Pass A's plan is not this fold's to edit. The conductor routes these to pass A's fold.

- **E1 (marker mechanics, wording only).** Pass A's Decision 2 says pass B "removes the scaffold's
  `/admin/signups` rule with markers alone". That still holds, but pass B does it with one block
  around the whole `access` member that replaces pass A's inner `theme-kit` block, since the emitter
  refuses nested markers (`scripts/build/emit-template.mjs:36`). Suggested addition to Decision 2:
  "Pass B replaces the inner `theme-kit` block with one block around the whole member." No pass A
  task changes. Pass A must keep the `access` member contiguous, with nothing else excluded inside
  it, which its Decision 2 already implies.
- **E2 (close step 2).** Pass A's close step 2 names the stock `cairn-run-gate 'npm test'` when the
  simplifier changed code. That is the known local stall. Pass A's own mechanics review raises it
  (the routed item (a)); listed here so the two folds land the same wording: "F again if step 1
  changed code; never the stock `npm test`".
- **E3 (Task 0 items 4 and 6).** Pass A's Task 0 prints F and E with `--pin` on a range that is
  empty at branch creation, and opens the PR before any commit. Pass A's own mechanics review raises
  both (the routed item (b)); pass B's wording is the `TIER_GATES` print and the commit-first order.

At fold time, `git status` showed uncommitted edits to pass A's plan that this fold did not make,
presumably pass A's own fold in flight. This fold did not read or touch them.

## Measures

- **Dispositions:** 43 IDs. Folded 40 (2 of them decided forks: R-m4, R-m6), refused 1 (R-m1),
  owner fork 2 (C-M5 as fork 3, R-M4 into fork 1). C-m1 folds at its root, and its precondition
  alternative is refused within the row.
- **New-mechanism findings:** 5 proposed. Folded 2: R-M1's construction-time throw (measured
  defect `hast-util-sanitize/lib/index.js:367-370`), and C-M1's `Backend.ephemeral`, a swap that
  leaves one fewer public member than the drafted plan (measured defect `types.ts:66-72`). Folded
  conditionally 1: R-M4's three disk-write constraints, which exist only if Geoff rules fork 1 "No"
  (measured hazards `handle.ts:39-42`, `dev-gate.ts:31-36`). Refused 2: R-m1's `prepack` guard,
  and R-m4's derived migration set (Decision 12).
- **Plan line count:** 1047 before (`57baf01b`), 1225 after.
- **Ceiling:** 10.8M to 12.0M recommended (the 80 percent stop from 8.64M to 9.6M), pending fork 3.

## Second fold (verification read, 2026-10-08)

Each finding was verified against its cited source before the edit. Plan line count: 1225 before,
1237 after.

- **V-M1: folded.** Verified: `engine-logic` sets `coverageBlocks: false` (`pass-execute.js:264-267`),
  and `applyClassBar` demotes `coverageOnly` findings and turns an emptied `fix` into `accept`
  (`:345-360`). Task 8 now runs as `auth-data` in the header class paragraph and its own class line.
  The args mapping lists Tasks 1, 2, 5, 8, and 11 as the per-task overrides. The stop wording reads
  "Task 2, Task 5, or Task 8". The chain line carries +0.10M (chains 5.35M).
- **V-m1: folded.** Verified: `connect` wraps the token getter lazily (`backend.ts:176-178`). Decision 3
  keeps the direct `locals.cairnBackend` read and states the true reason: the notice describes the dev
  store, production carries no `cairnBackend`, and the shell load needs no backend call.
- **V-m2: folded.** The table sums to 12.10M after V-M1 (0.30 + 5.35 + 0.90 + 1.20 + 0.30 + 1.10 +
  2.95). The ceiling is 12.1M and the 80 percent stop is 9.68M, in the header, the table, fork 3, and
  the close's budget-score line. Nothing was trimmed. The "No" alternative for fork 3 (10.8M, 8.64M)
  is unchanged.
- **V-m3: folded.** Task 1's header now carries "Decision 9", so the `criteria` mapping finds it.
- **V-m4: folded as the short line, not per-task criteria.** The unchecked constraints (comment
  hygiene, no new surface) apply to nearly every task, so repeating them in nine criteria blocks adds
  bulk and drift. The args mapping now says `commonNotes` reaches the implementer only, and names the
  gap: those constraints bind the implementer and the close's reviewers, not the per-task reviewer.
- **V-m5: folded.** Fork 1's "No" text now poses the second choice (pull the R2 read-through forward,
  or disable broken-asset cleanup under the dev backend), recommending the disable.

Ceiling: 12.1M with the 80 percent stop at 9.68M (recommended), up from 12.0M and 9.6M; "No" on fork 3
keeps 10.8M and 8.64M.
