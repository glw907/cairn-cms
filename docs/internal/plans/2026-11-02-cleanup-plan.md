# cleanup task plan

- **Slice:** `cleanup`, run sheet pass 8, with every open BACKLOG item placed in the Cleanup round or
  Pass 8.
- **Class:** `ordinary` plus `runner`, `auth-data` by item (T5, T7's `chapter3.mjs`, T15's `chapter2.mjs`).
  Security read and live smoke at close.
- **Base:** `main` at `9ea74f78a`, with `p2-p4` merging first (see "p2-p4 overlaps"). The executor launches
  after that merge.
- **Plan branch:** `worktree-cleanup`. **Run branch:** `worktree-cleanup-run`, cut from `origin/main`.
- **Push target:** `glw907/cairn-cms`.
- **Design:** `docs/internal/plans/2026-11-02-cleanup-design.md`. Read it first.
- **Quotes:** `2026-11-02-cleanup-sweep.md` (backlog items, by item number) and
  `2026-11-02-cleanup-state-read.md` (sheet items, by its numbered section) hold every cited line quoted
  at `9ea74f78a`. Each task names its section. A dispatch quotes that section into its brief, since
  implementers start with nothing.
- **Estimate:** 420 from the sheet. **Path:** 825 (S1 says how). **Ceiling:** 840. No cut at planning.
- **Executor:** Sonnet medium, session `cairn-cms-cleanup`. It takes instructions only from the session
  named `cairn-cms-9b`.
- **Review:** three lenses, fold, verification read (`auth-data` depth), beside this plan.
- **Merge:** the conductor, under Geoff's merge word, with a record packet. The executor stops at
  PR-ready. It never bumps or publishes, and it finalizes its `## Unreleased` entry.
- **Clock:** `.pass-task-clock` at the worktree root, per `pass-core` "Clock stop".
- **Planning requirement:** "Avoid over-engineering" and "Deliver what was asked, at the scope
  intended" apply to every task. Extras go to `BACKLOG.md`, never into a task.

## Sweep verdicts

Scoped sweep at `9ea74f78a`, one fresh read-only agent, 55 items. The planner overrode four verdicts and
says why. The backlog commit on this branch lands the keeps, rewords, placements, and done.

- **Fold (43, plus #207):** #198, #199, #200, #203, #232, #234, #235, #239, #240, #243, #247, #248, #259,
  #261, #262, #263, #264, #265, #266, #267, #268, #269, #270, #271, #272, #273, #275, #277, #278, #279,
  #280, #281, #282, #283, #285, #286, #287, #288, #289, #70, #188, #191, #196.
- **Reword, fold the cut (1):** #260, to a warning when a unit run reads a `dist` older than `src/lib`.
- **Keep (6):**
  - #208: traced in T11, stays open if the cause isn't proven.
  - #250: home is Claude Code's guard, not this repo. Listed under `## Tooling`.
  - #274: moves to the real install's recapture.
  - #246: moves to the real install, S4.
  - #211: moves after the release, S5.
  - #249: moves after the release. Neither the sheet nor the launch list names it, and the reset removes
    the text it would tune against.
- **Done (2):** #236 (`.claude/skills/cairn-running-passes/SKILL.md:17,20`). #276 closes in `p2-p4`'s T11.
- **Proposed drop, for the triage file (2):** #190 and #284. A drop needs Geoff, so each goes in T17's
  triage rows. Neither is built.

**Planner overrides.** The sweep read #207 as "cannot settle" because it looked under the repo. The
transcripts are at `~/.local/state/cairn-agent-first/e2e/out/evaluate/` (state read 7), so it folds. It read
#247 and #248 as waiting on a ruling. The sheet's "new product or taste question" row covers a reversible
reading, so each folds on S2 and S3. It read #211 as a fold; the key isn't reachable (S5). It read #249 as
a fold; see Keep.

**Full sweep.** The due rule fired on 39 of 67 items at `p2-p4`'s planning. T17 runs it at close, as the
sheet places it.

**`standards:log-issue` number collision.** The fix belongs in `glw907/standards`
(`plugins/standards/skills/log-issue/SKILL.md`, Step 3 reads the highest number on the current branch), so
it's not in this plan. The PR's `## Tooling` lists it for the conductor.

## Stops for `cairn-cms-9b`

Answer before launch. The plan is written to the recommended readings. Each is reversible, so the sheet's
"What can't be settled now" row lets the conductor take it, and the PR's `## Decisions` lists the reading.

**S1. The path is calibrated, not raw.** The two readers' sizes give a path of 1,153 at plan size, over the
840 ceiling. The sheet's three cuts save 25 on that path. Ten recent passes ran at 0.35 to 0.74 of plan
path, 0.58 weighted (actual 1,639 against 2,840, from their PR scores). Each task estimate here is the
reader's size at 0.7, the upper end of that range, so the clock stop at twice an estimate sits at 1.4 of
the reader's size. That gives 825.

- **Recommended: accept 825 and hold the actual clock to 840.** Past 840 actual minutes from the first
  execution commit, the run sets items aside in the order under "Set-aside order". So 840 binds the run,
  not just the plan.
- Refuse the calibration: the plan reads 1,153, the sheet's cuts don't reach 840, and the sheet's answer is
  to stop for Geoff. Name what leaves and the plan recuts.

Run limit: the eleven passes read about 2,090 actual, with `tool-gates` and `p2-p4` inferred. At the 840
hold the run ends at most about 2,930, past the 2,900 line, which would fire at the release boundary. At
the recent ratio it ends about 2,580. The conductor holds that line, so it needs to know.

**S2. #248, the sign-in rate limit.** `throttled` reveals membership by design (`auth-routes.ts:204-206`),
and no ledger entry rules on it.

- **Recommended:** keep the oracle, add `auth.rateLimit` as an optional binding resolver in the same
  degrade-to-open shape as `createSectionAction`'s `rateLimit`, keyed on client address, and answer a limited
  request with the existing `throttled` outcome after the pending-nonce cookie, with no new
  `LoginRequestOutcome` arm. A limited non-editor then reads `throttled` too, which blurs the oracle a
  little. A limited confirm redirects to `/admin/login?error=expired`. A new ruling entry records both.
- Defer to after the release. T5 falls by 40.

**S3. #247, session residuals.**

- **Recommended:** hash session ids in `store.ts`, as `magic_token` already stores `token_hash`, which signs
  everyone out once at deploy, and delete the prior row on re-login when the cookie is present. Accept the
  confirm page's token and the `frame-ancestors`-only CSP, as two triage rows for Geoff.
- Defer the whole item. T5 falls by 30, and hashing then signs rebuilt sites out once later.

**S4. #246, the Worker key's permissions.** Telling an owner to reduce the App to Contents is the natural
answer, but #245 hasn't proved that a Contents-only token can write refs on a repository with workflow
files. **Recommended:** hold the ruling, and move #246's Placement to the real install beside #245. #203's
closing line says only to narrow the installation.

**S5. #211, tidy latency.** It needs real API calls, and `source ~/.local/secrets` is refused to a worktree
session. A credential refused by one path is a stop, so no task reads it. **Recommended:** move #211 after
the release, with a line saying it needs `ANTHROPIC_API_KEY` in a session's environment. Fold it instead
only if the conductor can launch the executor with the key already in its environment.

**S6. `tool/v2` module path (new find).** It lands in T15 under the sheet's cutoff, because pass 9's step
17 needs it. It is the one item outside the sheet's scope and the launch list. Between the merge and step
17, the printed `go install .../tool/v2/cmd/cairn@latest` line can't resolve; `@latest` on the old path
serves a doctor that fails a rebuilt site (`tool/CHANGELOG.md:74-75`), so no choice works in that window.
Step 12 of the real install doesn't need the tool. **Recommended:** land it.

**S7. `/styleguide` leaves dev too.** An exclude is the smallest way, and it removes the page from a
fresh site's `npm run dev`, while the design says "production". A build-time guard is more code on a
page a site doesn't need. **Recommended:** exclude, and repoint `checking-a-theme.md:113`.

## Pre-flight

**Nothing for Geoff.** Every task was read for owner steps. No sign-in, secret, dialog, or new permission
rule is needed. The stable-release rule (`Bash(gh release create v* --target main *)`) is in
`settings.json`; pass 9 reads it, and no task here uses it. The smoke runs on local `wrangler dev`.

**Auto-mode items, named anyway.** `autoMode.allow` covers these under the sheet since workstation#192. A
refusal on any is a stop, never a thing to route around.

- `.claude/skills/` edits:
  - T5: `cairn-running-passes/references/admin-smoke-test.md`
  - T7: `cairn-releasing/SKILL.md`
  - T10: `cairn-following-admin-design/references/admin-design-system.md`, `cairn-running-passes/SKILL.md`,
    `cairn-running-passes/references/pass-gate-tiers.md`, `cairn-writing-engine-code/references/durable-gotchas.md`
  - T12: `cairn-writing-docs/evals/**`
- `CLAUDE.md` files: T9 edits `claude/CLAUDE.md`. No task edits the root `CLAUDE.md`, which
  `.claude/rules/evals-docs-process.md` would also catch. No task edits `.claude/rules/`.
- `claude/agents/cairn-extension-reviewer.md` (T9) is packaged text outside the sheet's named paths. Pass
  1a's write probe passed on it. A refusal sets #196's P2 minor aside; it is not a major.
- `.github/workflows/**` (T7, T10), a `runner` path that earlier passes pushed.
- T16 dispatches `e2e.yml` with `update_snapshots=true`, once, plus once more only if a `main` merge moves
  a baseline. Auto mode refused a repeated dispatch in `tool-fixes`, so no task dispatches a workflow to
  sample a flake. A refused dispatch is a stop, and an empty commit is never a substitute.
- T18 runs `wrangler d1 --local` for the smoke's session row, and stops the test process it started.
- The conductor's merge under the merge word.
- `ci-green` exit 4 with actor `github-actions[bot]`: run the approve command it prints.
- T17 writes the triage JSON under `~/.local/state/cairn-agent-first/`. If that write is refused, the rows
  go in the PR body. T13 writes nothing outside the PR body.

A credential refused by one path is a stop. No task reads a credential.

## p2-p4 overlaps

`p2-p4` merges first. Its plan is on `worktree-p2-p4`, its run on `worktree-p2-p4-run` (86 files through
T8 at `0bb291833`). Quotes here are `main`'s, so after that merge a task finds a line by its quoted text.

| Where | p2-p4 | This pass | Handling |
| --- | --- | --- | --- |
| `src/lib/admin/EditPage.svelte` | T6, T7; `flash` moves from `:1277` to `:1308` | T1: #263, #268, #275, #289 | Different lines. Re-find by text |
| `src/lib/sveltekit/content-routes-entry-write.ts` | T7, `field` on the refusal | T6: #199, #200 | The `saveRefusal` call may gain a field. Re-read |
| `src/lib/sveltekit/auth-routes.ts` | Comments, T4 | T5: #243's tag, #247, #248 | Text merge |
| `src/lib/admin/LoginPage.svelte`, `refusal-codes.ts` | T4's one wording | T5 reuses `throttled` and `expired` | Reuse, no new string. Read `RefusalCode`, which loses `expired` as a code in T4 |
| `src/lib/auth/roles.ts`, `src/lib/github/**` | T5's next steps | T5: `roles.ts:126` tag only | Text merge |
| `src/lib/content/fields.ts`, `FieldInput.svelte` | T7 | T2: #239 stays in `fieldset.ts` | None |
| `src/lib/sveltekit/nav-routes.ts` | Refusal strings | T4: #277 touches only the barrel | None |
| `src/lib/admin-toolkit/ListToolbar.svelte` | T8's cue, closing #276 | None | None |
| `src/lib/log/events.ts`, `events-list.ts`, `tool/internal/logs/events.go`, `log-events.md` | T3 adds `auth.link.sent` | T5, T6 add events | Keep both |
| `examples/showcase/e2e/admin-visual.spec.ts` | T1, T8, T10 add tests and screenshots | T11 changes palette tests | Text merge; T11 reads the merged file |
| `examples/showcase/playwright.config.ts`, `hooks.server.ts`, `dev-gate.ts`, `app.d.ts` | T1 | None | None |
| Admin baselines | T10 | T16 | T16 merges `main` first |
| `CHANGELOG.md`, `MIGRATION-NOTES.md` | Entries through its T11 | T17 resets them | The reset runs after `p2-p4`, so it sees every entry |
| `docs/admin/troubleshooting.md`, `docs/editors/**` | T3, T4 | T6 (#259), T14 (#288) | Different pages or lines |
| `BACKLOG.md`, `docs/STATUS.md` | T11 | T14, T17 | `p2-p4` filed #290. Numbers run past the highest on `main` at merge |
| `scripts/checks/api-surface.md` | Regenerated | T4, T5, T8 | Never by hand. `check:surface -- --update` after each `main` merge |

## Standing answers

The sheet's apply. These add what this pass can foresee.

| Stop | Answer |
| --- | --- |
| A test pins old behavior | Change it, list it in `## Decisions`. |
| An item breaks a site | One `Consumers must:` line in T17's rebuild line. No shim. Every site rebuilds. |
| A retried test | List it in the PR as flake evidence. |
| CI red | Trace it and fix forward. A returning cause gets one structural fix, then set the item aside by the order below. Each accepted-task report names the CI verdict on its head. |
| A red on the bot's regeneration commit | Not a red. T16 says what proves it. |
| `p2-p4` isn't merged at launch | Hold the launch. |
| A `main` merge at any point | Keep both `## Unreleased` entries, `npm run emit:template`, `npm run check:surface -- --update`, rerun the fast lane, grep `examples/showcase/e2e` for every string this pass changed. |
| A conflict in `templates/waymark/**` or `guidance-hashes.json` while merging a pair | Take either side and rerun `npm run emit:template`. It's generated. |
| A conflict in `events.ts`, `events-list.ts`, `events.go`, or `log-events.md` while merging a pair | Keep both lines. |
| Any other merge conflict | Stops the line. |
| A conflicting PR fires no `pull_request` CI | Tell `cairn-cms-9b`; merge `main` on its word. |
| A review `fix` | Fix forward. |
| Fact-checker finds a wrong claim | Fix it. No docs review. |
| A stale transcript block | Leave it and list it for the recapture, which #185 and #274 carry. |
| An intended visual change | Regenerate on CI in T16, read the render, list it. |
| New work found | `/standards:log-issue`, list it. It takes a number past the highest on `main` at merge, and the PR names placeholders. |
| A new product or taste question | Write it to STATUS and wait for `cairn-cms-9b`. Never `notify-send`. |
| A heavy gate lane is busy | Wait through `cairn-run-gate`. `RUN_GATE_IF_BUSY=defer` only on ordinary tasks, never T5. |
| A compound shell line is refused | Run the command plainly from the worktree, or use Read and Write. Note it for `## Tooling`. |
| The smoke's known `no-pending-request` FAIL | Counts as a pass with a note, per the sheet. Anything else that fails is a stop. |
| A refusal of any kind other than the shell guard | A stop. Never get the refused effect another way. |

**Set-aside order.** The sheet's cuts come first, then the items no May-not protects, cheapest loss first.
Trigger: the actual clock passes 840, or a returning cause survives its structural fix.

1. R8's shard work. 2. Ergonomics 14. 3. Ergonomics 12. 4. R7's fold of the two audit wrappers. 5. The
rest of R8. 6. Ergonomics 11. 7. #191. 8. #188. 9. #281. 10. #260. 11. #265. 12. #247. 13. #283. 14. #282.

Each set-aside item stays open with its Placement moved to After the release.

**May not set aside:** R1, R3 (done), R9, #196's majors, the measures. Also, by the planner, T11's trace
and T5's #271.

## Tasks

Every task commits path-limited, then runs the fast lane per `cairn-pass`. A pair goes to two
`cairn-implementer` subagents, `isolation: "worktree"`, each named `cleanup task <n>`, naming model and
effort. Sonnet medium unless a task says otherwise. Inside a pair, neither touches `CHANGELOG.md` or
`MIGRATION-NOTES.md`: each reports its lines and the session writes them after the merge. Each item commits
on its own, so a set-aside can revert one commit. BACKLOG closes in T17, in one edit.

**Path:** T0 10, T1+T2 85, T3+T4 80, T5+T6 105, T7+T8 100, T9+T10 110, T11+T12 65, T14+T15 80, T16 30, T17
70, T18 90 = 825. T13 runs in the background beside T11 through T15, so it adds nothing. The eval suite
does the same.

### T0. Set up the run branch (10)

Files: none. Class: `ordinary`. Enter the worktree named `cleanup-run`, run the setup command, merge
`origin/worktree-cleanup`, and open a draft PR with `## Tooling` seeded from this plan.
**Acceptance:** `git log` shows the plan commits; the draft PR exists on `glw907/cairn-cms`; `p2-p4`'s merge
commit is an ancestor of `HEAD`.

### T1 and T2 (pair)

#### T1. Editor form fixes (75)

Items: #263, #268, #275, #289, #269. Quotes: sweep Group A. Class: `ordinary`.
Files: `src/lib/admin/EditPage.svelte`, `RenameDialog.svelte`, `RepeatableField.svelte`,
`ComponentInsertDialog.svelte`, `editor-highlight.ts`, `ComponentForm.svelte`, their component tests.

Current source:

- `EditPage.svelte:1277`: `if (data.flash === 'saved' && !draftWarning)`
- `EditPage.svelte:2787`: `<form method="POST" action="?/discard" class="flex justify-end gap-2" onsubmit={() => (leaving = true)}>`
- `RenameDialog.svelte:81`: `<form method="POST" action="?/rename" class="flex flex-col gap-3" onsubmit={() => onsubmitting?.()}>`
- `RepeatableField.svelte:211`: `<ul class="flex flex-col gap-2">`
- `ComponentForm.svelte:362`: ``{#if slot.help}<p id={`hint-${slot.name}`} class="type-body text-muted mt-1">{slot.help}</p>{/if}``

Outcome:

- #263: one notice for a save with a reference warning; `politeMessage` announces both when both are set.
- #268: Discard and Rename take `DeleteDialog`'s in-flight shape, with its `onpageshow` reset.
- #275: `role="list"` with `list-none p-0`, in the shape `CairnTidySettings.svelte:581` uses, on
  `RepeatableField.svelte:211` and `EditPage.svelte:2500`. A bare `list-none` breaks the rule at
  `cairn-admin.css:633-634`.
- #289: the four accessible names, per the sweep. The disabled block control keeps one stable name, "Edit
  block", with the reason in its tooltip.
- #269: a hint after each attribute control, with `aria-describedby` from the `slotDescribedBy` shape.

**Acceptance:** a component test fails before each fix and passes after: both notices at once, a second
submit disabled, the list role present, the count silent on an empty query, an attribute's `help` rendered
and referenced. Grep `docs/editors`, `examples/showcase/e2e`, and `src/tests` for each changed string.
**Test:** `npx vitest run --project component` on the named files.

#### T2. Content and manifest fixes (85)

Items: #264, #240, #239, #232, #261. Quotes: sweep Group E. Class: `ordinary`.
Files: `src/lib/content/body-scan.ts`, `media-rewrite.ts`, `fieldset.ts`, `src/lib/delivery/manifest.ts`,
`src/lib/vite/internal.ts`, `skills/cairn-extending-a-site/references/log-events.md`, `content-model.md`,
their unit tests, `src/tests/unit/delivery-manifest.test.ts`, `vite-manifest-dev-server.test.ts`,
`content-media-rewrite.test.ts`.

Current source:

- `body-scan.ts:20`: `const HTML_CAIRN_HREF = /<[a-z][^>]*[\s"'](?:href|src)\s*=\s*["']?(cairn:[^"'\s>]*)/gi;`
- `media-rewrite.ts:321`, `:572`: `const { fmBlock, body } = splitFrontmatter(markdown);`
- `references.ts:124`: `const text = hasBom ? source.slice(BOM.length) : source;`
- `field-rules.ts:21-23`, and `concepts.ts:95`: `defineFieldset(concept.fields, { refine: concept.refine, behavior: concept.behavior });`
- `manifest.ts:65`: `scope: 'manifest',`
- `vite/internal.ts:438`: `const next = carryPublishStamps(built.manifest, committed);`

Outcome:

- #264: a tag walker consumes each attribute whole, quoted values included, and tests `href` and `src` by
  name. No new dependency.
- #240: hold a BOM as a prefix in both rewriters and restore it on return, as `references.ts:121-168` does.
- #239: `checkBounds` beside `checkSeoImageFields`, run from `defineFieldset`, throwing a `cairn:`-prefixed
  error for `min > max`, a `length` that conflicts with either, and a non-calendar date bound.
- #232: delete `scope` and its readers.
- #261: `applyManifest` gains an option the dev path sets, which holds the write when a problem names a
  committed row with `publishedAt`, and the report says so. `cairn-manifest` is unchanged.

**Acceptance:** each case from the item fails first. `<a title="a>b" href="cairn:posts/one">` is found and
`<a title="see href=cairn:x">` isn't. A BOM file gets its hero `src` repointed. `{ length: 5, max: 3 }`
throws at declaration. A dev start over an invalid published entry leaves `index.json` byte-identical.
`npm run emit:template` if a skill changed. **Test:** the named unit files.

### T3 and T4 (pair)

#### T3. Fast-lane selection (75)

Items: #265, #266, #267, #285, #260 (cut text). Quotes: sweep Group B. Class: `runner`.
Files: `scripts/checks/gate-tier.mjs`, `gate-table.json`, `src/tests/unit/gate-tier.test.ts`,
`vitest.config.ts`, a new global-setup file beside it.

Current source:

- `gate-tier.mjs:488`: `if (reach.length === 0) return { mode: 'full', reason: 'nothing under src/ to select from', reach: [] };`
- `gate-tier.mjs:672`: ``const npmPaths = paths.filter((path) => !path.startsWith('tool/'));`` (again at `:580`)
- `check-symbols.mjs:412`: `const path = join(root, 'tool/testdata/flags.json');`
- `vitest.config.ts:124`: `name: 'unit-dist-spawn',`

Outcome:

- #265: at classify time, each changed `src/` path adds the unit tests whose text names that repo-relative
  path. A test that walks the tree stays with CI.
- #266: `mode: 'skip'` at `:488`, once `package.json`, the lockfile, and the vitest config are confirmed in
  `scripts/test/component-rerun-triggers.mjs`. If one isn't, add it there first.
- #267: `tool/testdata/flags.json` stays in `npmPaths` at both lines and maps to `check:symbols`.
- #285: `src/lib/internal.ts` in the range pushes `npx vitest run --project unit-dist-spawn` after the unit leg.
- #260: the unit project's global setup prints one line when the newest `src/lib` mtime passes `dist`'s. It
  warns and never throws.

**Acceptance:** each is a `gate-tier.test.ts` case that fails first, on a synthetic range. `node
scripts/checks/gate-tier.mjs --fast --range` over a `scripts/`-only commit prints no component leg. Touching
`src/lib` in a scratch run prints the warning. **Test:** `npx vitest run --project unit src/tests/unit/gate-tier.test.ts`.

#### T4. Surface and small checks (80)

Items: #277, #279, #280 (first line), #198, #234, #235, #278, #281. Quotes: sweep Group D. Class: `runner`.
Files: `src/lib/sveltekit/index.ts`, `src/lib/admin-toolkit/index.ts`, `src/lib/delivery/index.ts`,
`src/lib/delivery/public-routes.ts`, `scripts/checks/api-surface.md`, `check-self-use-allowlist.json`,
`check-idioms.mjs`, `fixtures/idioms/process-reference.ts`, `check-surface-leaks.mjs`,
`check-surface-leaks.json`, `docs/internal/engine-rulings.md`, tests.

Current source:

- `sveltekit/index.ts:40`: `export { createNavRoutes, type NavRoutes, type NavRoutesConfig } from './nav-routes.js';`
- `admin-toolkit/index.ts:20`: `type FormatTimestampOptions,`
- `delivery/index.ts:35`: `export type { PublicRoutesConfig, PublicRoutes, EntryData, EntryDataOverrides } from './public-routes.js';`
- `public-routes.ts:170`: ` * @beta` above `export async function composeEntryData(`
- `check-surface-leaks.mjs:164`: `if (type.isUnion?.() || type.isIntersection?.()) {`
- `check-idioms.mjs:265`: `if (token === 'R4') {`
- `skill-references-compile.test.ts:91`: `const CLI_INVOCATION_PREFIXES = new Set(['npx', 'cairn-audit']);`
- `delivery-media-vite-barrel-prune.test.ts:80`: `'variantUrl',`

Outcome:

- #277, #279: hide `createNavRoutes`, `NavRoutes`, `NavRoutesConfig`, `FormatTimestampOptions`, and
  `EntryDataOverrides`. `cleanup-hide-internals` already sets the rule, no site's `src/` names them, and its
  entry records the application.
- #280: drop the `composeEntryData` tag. T5 takes `AuthRoutes`.
- #198: delete the allowlist row.
- #234: delete `variantUrl` and fix the count at `:86`.
- #235: add `'npm'`, with a test line.
- #278: remove the branch, the comment text, the test lines, and the fixture line, and add a test that
  `R4 re-export` now flags.
- #281: `visit` walks a deferred conditional's true and false arms, `ConceptFrontmatter` is recorded as a
  leak, and the `standing-unverdicted` row becomes a sanction: `ConceptEntryData` stays unexported, since a
  site names one arm through `Extract` on `concept`.

**Acceptance:** `check:surface`, `check:self-use`, `check:idioms`, `check:rulings-format`, and `check:tiers`
pass. A `check-surface-leaks.test.ts` case with a leak behind a conditional fails before the walk. Each
removed name has no hit in `skills/`, `docs/`, `claude/`, or `README.md`. **Test:** the named unit files.

### T5 and T6 (pair)

#### T5. Auth items (105)

Items: #271, #243, #280 (second line), #247, #248. Quotes: sweep Groups H and L. Class: `auth-data`. Model:
**opus at medium**, since #247 and #248 carry correctness logic a plan can't fully specify. Failing test
first on each. `standards:diff-reviewer` reads each commit while CI runs. Never `RUN_GATE_IF_BUSY=defer`.
Files: `src/lib/auth/access.ts`, `store.ts`, `roles.ts`, `src/lib/sveltekit/auth-routes.ts`, `cairn-admin.ts`,
`src/lib/log/events.ts`, `events-list.ts`, `tool/internal/logs/events.go`,
`skills/cairn-extending-a-site/references/log-events.md`, `admin-access.md`,
`packages/cairn-cms-dev/src/fake-auth-db.ts` and test, `.claude/skills/cairn-running-passes/references/admin-smoke-test.md`,
`scripts/checks/api-surface.md`, `docs/internal/engine-rulings.md`, tests.

Current source:

- `access.ts:198-199`: `const admitted = access[target];` / `return admitted === undefined ? true : admitted.includes(editor.role);`
- `access.ts:215`: `return Object.hasOwn(access, target);`
- `store.ts:503`: `export async function removeOwnerIfNotLast(`; `:609`: `export async function demoteOwnerIfNotLast(`; `:353`: `export type OwnerGuardOutcome =`
- `store.ts:241`: `.prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')`
- `auth-routes.ts:206`: `if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {`
- `auth-routes.ts:360`: `await createSession(db, id, email, now + SESSION_TTL_MS, now);`
- `auth-routes.ts:486`: ` * @beta` above `export interface AuthRoutes {`
- `cairn-admin.ts:42`: `auth?: Pick<AuthRoutesConfig, 'send'>;`
- `section-action.ts:64`: `rateLimit?: {`, with `resolve: (env: Env | undefined) => RateLimitLike | undefined;`
- `rate-limit.ts:27-31`: `allowed`, `limited`, `no-binding`, `failed`

Outcome, in this order, one commit each:

1. #271: `const admitted = Object.hasOwn(access, target) ? access[target] : undefined;`, with `constructor`
   and `__proto__` tests.
2. #243 and #280: remove the two helpers, `OwnerGuardOutcome`, their tests, their doc links, and the fake's
   matching SQL branches, keeping any `deleteEditor` shares. Drop the `@public` and `@beta` tags left on
   names no barrel exports.
3. #247, on S3: the store hashes a session id through `hashToken` on insert and lookup, so `createSession`
   and its callers keep the raw id and every test reads the same. Update `auth-cleanup.test.ts:30`'s direct
   insert and `admin-smoke-test.md:94`, which then inserts the hash. `confirmAction` deletes the prior row
   when a session cookie is present. A `Consumers must:` line says everyone signs in again once.
4. #248, on S2: `AuthRoutesConfig.rateLimit?: (env) => RateLimitLike | undefined`, reached through
   `createCairnAdmin({ auth })`, documented for `check:options`. `requestAction` checks it after
   `mintOrReusePendingNonce`, keyed on client address, so every exit keeps its byte-identical `Set-Cookie`,
   and `limited` returns `{ outcome: 'throttled' }`. `no-binding` and `failed` let the request through.
   `confirmAction` redirects a limited call to `/admin/login?error=expired`, unless T4 of `p2-p4` changed
   that code, in which case it takes that pass's single wording. One new event, `auth.rate_limited`,
   carrying `scope` and never the address's token or session data. Confirm `event.getClientAddress()` is on
   `CairnEvent` before using it, and quote it.

**Acceptance:** `canReach` with `constructor` fails closed with no `TypeError`. A raw id no longer selects a
row by direct SQL, while `getSession` on the raw id still returns it. Re-login leaves one row. A limited
request's response bytes equal a `throttled` answer's, for an editor and a non-editor alike. With no binding,
the flow is unchanged. `tool` gate passes for the event. `check:rulings-format` passes. **Test:** the
`auth-*` integration files, `src/tests/unit/auth-access.test.ts`.

#### T6. Save path, media, and block wording (105)

Items: #199, #200, #259, #262, #283. Quotes: sweep Groups F, G, and J. Class: `ordinary`.
Files: `src/lib/sveltekit/content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`,
`src/lib/log/events.ts`, `events-list.ts`, `tool/internal/logs/events.go`,
`skills/cairn-extending-a-site/references/log-events.md`, `media.md`, `src/lib/admin/client-ingest.ts`,
`CairnMediaLibrary.svelte`, `MarkdownEditor.svelte`, `src/lib/render/registry.ts`, `src/lib/content/adapter.ts`,
`examples/showcase/src/routes/(site)/styleguide/+page.svelte`, `docs/editors/manage-the-media-library.md`,
`examples/showcase/e2e/media-pass-c.spec.ts`, tests.

Current source:

- `content-routes-entry-write.ts:152`: `const isNew = form.get('new') === '1';`; `:166`: `if (!isNew) {`
- `content-routes-entry-write.ts:173`: `return fail(503, saveRefusal("Couldn't read the current version of this entry. Try saving again.", body));`
- `content-routes-entry-destructive.ts:363`: `return fail(409, { error: 'Could not verify references. Try again.' } satisfies RenameFailure);`; `:391` the same for includes
- `client-ingest.ts`, `ingestFile`: `if (sniffed === 'image/jpeg' || sniffed === 'image/png' || sniffed === 'image/webp') {`
- `CairnMediaLibrary.svelte:736`: `role="option"`; `:751`: `type="checkbox"`
- `registry.ts:220`: `` `cairn: component "${c.name}" uses "${c.name}", a reserved directive name handled by the engine render step: ...``
- `MarkdownEditor.svelte:18`: `interface ComponentAtCaret {`

Outcome:

- #199: remove `isNew` and read the prior file always. `new` stays on the form for `editLoad`.
- #200: log a new event on the failed read; both rename refusals answer 503; reuse the `:169` head at `:316`
  unless a concurrent create makes that a worse failure, in which case drop that half and say so. Leave the
  two-indexes half.
- #259: add `image/avif` to the web-native passthrough, with `decode-unsupported` catching a browser that
  can't, and update the docs lines. This is a method call.
- #262: keep the input as a pointer target with `tabindex="-1"` and `aria-hidden="true"`. `aria-selected` and
  Space carry the state. Update `media-pass-c.spec.ts:54-55`.
- #283: "block" in the four messages, the styleguide's lines 257-261, and the `MarkdownEditor.svelte` names.

**Acceptance:** a save with `new=1` over an existing entry keeps undeclared keys, failing first. A failed
read logs the event. Rename answers 503. An AVIF sniff passes through the ingest. `getByRole('option')`
reports selection while no checkbox role sits inside it. `tool` gate passes. **Test:** the named files.

### T7 and T8 (pair)

Both re-emit the template, so "A conflict in `templates/waymark/**`" applies.

#### T7. Scaffold (100)

Items: ergonomics 1, 7, `/styleguide`, the template-repo notice, #203, `--yes`. Quotes: state read 8, 9, 10,
11, and sweep Group J. Class: `ordinary`; `chapter3.mjs` is `auth-data`, so its commit takes
`standards:diff-reviewer` and a failing test first.
Files: `packages/create-cairn-site/scripts/bake-template.mjs`, `bake-template.test.mjs`, `bin.mjs` and test,
`src/cloudflare/chapter3.mjs`, `test/email-reoffer.test.mjs`, `README.md`, `template-repo/README.md`,
`examples/showcase/.cairn-template.json`, `src/theme/site.config.yaml`, `src/routes/(site)/+page.svelte`,
`scripts/lab/theme-fixture.mjs`, `theme-fixture-e2e/theme-fixture.spec.ts`, `.github/workflows/create-site.yml`,
`skills/cairn-styling-public-pages/references/checking-a-theme.md`, `directive-alert.md` and siblings,
`skills/cairn-extending-a-site/SKILL.md`, a new reference for the checklist,
`.claude/skills/cairn-releasing/SKILL.md`, `docs/admin/setup-recovery.md`, `own-your-domain.md`, `templates/waymark` (emit).

Current source:

- `bake-template.mjs:149-154`: `const TEMPLATE_CLAUDE_MD = `, ending `never this file.`
- `(site)/+page.svelte:53-55`: "The cairn showcase. You write in markdown and publish a static page that reads the way a publication should."
- `site.config.yaml:7-8`: `- label: Styleguide` / `url: /styleguide`
- `theme-fixture.mjs:16`: `const PAGES = ['/', '/posts/the-reading-surface', '/styleguide'];`
- `template-repo/README.md:14-15`: "This template is pre-release. The Deploy button, the completion checklist, and the rest of this file's user-facing content land once the button flow has been verified live."
- `cairn-releasing/SKILL.md:191-193`: "Once the package publishes, retire the template repository's pre-release notice in the same change"
- `chapter3.mjs:938-943`: the `if (args.yes) { consented = true; return; }` block
- `chapter2.mjs:144-148`: `hasOpenEmailDecline(record)`
- `bin.mjs:83`: `function closingInfoLines(state) {`
- `install.mjs:237`: `'choose "All repositories" so the repository this run creates is covered, and approve.',`

Outcome:

- Ergonomics 1: `TEMPLATE_CLAUDE_MD` adds aliases with "not `$lib`", the four commands, and one line each
  for `src/theme`, `src/chassis`, `src/routes`, and `src/content`. `# Your site` stays.
- Ergonomics 7: a make-it-yours checklist in `SITE_README` and a reference the router names. The home page
  reads `description` from site config in place of its fixed copy. Grep e2e for `The cairn showcase` first.
  The home baselines regenerate in T16. Ship no new command.
- `/styleguide`, on S7: exclude the route in `.cairn-template.json`, strip the two nav lines with a
  `# cairn-template:exclude` pair, give `theme-fixture` a template-arm page list, add the path to
  `create-site.yml`'s leftover list, and repoint `checking-a-theme.md:113` and the directive pages.
- The notice: `:14-15` becomes a statement with no promise, `:1` drops "pre-release", and the WATCH and
  `cairn-releasing:191-193` stop ordering a retirement at publish.
- #203: one closing-block line naming `https://github.com/settings/installations`. Leave `install.mjs` and
  `catalogue.mjs`, per Geoff's ruling.
- `--yes`: with `args.yes` and `hasOpenEmailDecline(record)` and no `args.connect`, chapter 3 skips Builds
  with no consent, logging the way `chapter2.mjs:436-441` does. `--connect` still connects. Write no
  `builds-connect-declined` for a skip nobody answered. `README.md:269-271,307-311`,
  `setup-recovery.md:72`, and `own-your-domain.md:87` state it. "The manual path" is turning email on before
  Builds, because after Builds none exists: a terminal run, or `--email --yes`.

**Acceptance:** a `--yes` run with an open decline leaves Builds unconnected and the email offer open,
failing first. `npm run emit:template` deletes the three template styleguide files and `check:template`
passes. `create-site.yml` proves it on CI. The bake test asserts the new block, with `# Your site` kept.
Docs run the fact-checker. **Test:** `npm test -w packages/create-cairn-site`, then CI on `create-site.yml`.

#### T8. Showcase narration and the shared view (95)

Items: ergonomics 3, 11, 12, 20, #282. Quotes: state read 8, sweep Group I. Class: `ordinary`, with
`preview.ts` treated as sensitive (#272): `standards:diff-reviewer` reads the commit. If
`(site)/preview/[token]/+page.server.ts` must change, that commit is `auth-data` with a failing test first.
Files: `examples/showcase/src/theme/cairn.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`,
`scripts/build/emit-template.mjs` and test, `examples/showcase/src/chassis/feed-items.ts` and test,
`skills/cairn-extending-a-site/references/public-routes.md`, `src/lib/sveltekit/preview.ts`,
`src/theme/components/ArticleView.svelte`, `src/chassis/entry-data.ts`, `scripts/checks/api-surface.md`,
`templates/waymark` (emit).

Current source:

- `cairn.config.ts:99-100`: "A closed select exercising a brand-new v2 scalar arm end to end"
- `cairn.config.ts:152`: "finalize.mjs matches this line character for character (TEMPLATE_GITHUB_APP_LITERAL)"
- `vite.config.ts:53-55`: "The showcase consumes the engine through a file:../.. dist symlink."
- `package.json:14`: `"build": "vite build",`
- `emit-template.mjs:199`: `pkg.scripts = { ...pkg.scripts, 'cf-typegen': command };`
- `feed-items.ts:30`: `const posts = site.concept('posts');`
- `preview.ts:387-390`: `export async function loadPreview(`, returning `Promise<PreviewData>`
- `ArticleView.svelte:28`: ``* Untyped on purpose: `loadPreview` returns the default `EntryData`, so this template takes the``

Outcome:

- Ergonomics 3: rewrite surviving comments for a site reader. The `:154` literal stays byte-exact and
  `// prettier-ignore` stays adjacent. The dev-only `dedupe` and `fs.allow` lines take a
  `cairn-template:exclude` pair; if `create-site.yml` goes red on that, restore them and say so. Demo fields
  stay, as a light taste call, because the e2e suite reaches them.
- Ergonomics 11: `"build": "vite build --logLevel warn"`, plus a one-line success if the emitted build prints
  none. Leave the frozen transcripts.
- Ergonomics 12: set `precheck` at emit, beside `:199`, with the `cf-typegen` flags and `--check`. Prove a
  setup-rewritten `wrangler.jsonc` doesn't fail `npm run check`. If it does, set it aside as the sheet allows.
- Ergonomics 20: `FeedSource` gains `concept = 'posts'`, and `public-routes.md` adds a second-concept feed
  as a worked case. A missing concept still throws.
- #282: `loadPreview<S extends SiteResolver>` with one boundary cast, then narrow both `ArticleView.svelte`
  sources and `chassis/entry-data.ts`.

**Acceptance:** `grep -c` over `templates/waymark` for `e2e pins`, `showcase`, and `exercising` prints 0
outside `templates/waymark/.claude`. `create-site.yml` green. A hand-edited `worker-configuration.d.ts`
either fails `npm run check` or is listed as uncaught. A `feed-items.test.ts` case takes a second concept.
`check` passes with `ArticleView` typed. **Test:** the showcase `check`, `feed-items.test.ts`.

### T9 and T10 (pair)

#### T9. Packaged guidance (105)

Items: #196, #70, ergonomics 8, 10, 14. Quotes: sweep Group K, state read 8. Class: `runner`.
Files: `claude/CLAUDE.md`, `claude/agents/cairn-extension-reviewer.md`, `skills/cairn-extending-a-site/SKILL.md`,
`references/adopt-cairn.md`, `references/preflight.md`, `skills/cairn-building-admin-screens/SKILL.md`,
`references/custom-screen.md`, `skills/cairn-styling-public-pages/SKILL.md`,
`skills/cairn-consulting-the-engine/SKILL.md`, `templates/waymark` and `guidance-hashes.json` (emit).

Current source:

- `claude/CLAUDE.md:42`: `## The Stop hook`, to `:64`: `"command": "npm run check:cairn --if-present"`
- `skills/cairn-extending-a-site/SKILL.md:21`: `dated ruling in cairn's rulings ledger.`
- `claude/agents/cairn-extension-reviewer.md:21-23`: `component is a finding unless a comment or commit message in the diff names the DaisyUI defect`
- `skills/cairn-extending-a-site/SKILL.md:39`: the row `| Mount the admin, gate a custom screen or action, roles and access map, refusal shape, audit table | `references/admin-access.md` |`
- `skills/cairn-building-admin-screens/SKILL.md:37`: `**Static, advisory tier:** `radius-scale` (promoted to error at 0.99.0), and three rules that`
- `claude/agents/cairn-extension-reviewer.md:4`: `tools: Read, Grep, Glob`
- `skills/cairn-building-admin-screens/references/custom-screen.md:59`: `  requireAccess(event);`

Outcome:

- #196, majors: one owner per job, with `admin-access.md` staying in `cairn-building-admin-screens`'
  router. Move the hook and DaisyUI text to `adopt-cairn.md`. Wrap the hook to exit 2 with a
  `stop_hook_active` guard, and align `references/preflight.md:44`.
- #196, minors: third-person descriptions, the time-bound lines, the reviewer's way to receive a diff, H1s,
  "daisyUI" casing, and the ruling text in `:21`. The root `CLAUDE.md` minor is out: no task edits that file.
- #70: read each route, confirm the target, and reach or cut the rest. Check whether
  `cairn-styling-public-pages`' 30 unnamed references are routed by pattern.
- Ergonomics 8: the done-gate gains "if `cairn` is on `PATH`, run `cairn doctor`". The `check.yml` step needs
  a resolvable tag, so file it with Placement after step 17.
- Ergonomics 10: a third done-gate step, per `create-site.yml:228-254`: `npm run dev`, `curl -sL` the new
  route, and check it didn't land on `/admin/login`.
- Ergonomics 14: `const editor = requireAccess(event);` and the owner-only control.

**Acceptance:** `check:public-skill`, `check:skill-budget`, and `check:template` pass. A piped hook payload
with `stop_hook_active: true` exits 0, and a finding exits 2. A grep of each router shows each job in one
skill. **Test:** `npm run check:public-skill` through the lane.

#### T10. CI and repo machinery (110)

Items: R2, R7, R8, #286, #273, #272. Quotes: state read 2, 4, 5, sweep Group C. Class: `runner`. Each
`.github/workflows` commit prints `ciWait`.
Files: the R2 deletions, `vitest.config.ts`, `package.json`, `package-lock.json`,
`examples/showcase/package-lock.json`, `scripts/checks/check-tool-release.mjs` and test,
`check-chassis-boundary.mjs` and test, `check-visuals.mjs`, `transcript-blocks.mjs`, `check-leaks.mjs`,
`check-invisible-craft.mjs`, `check-admin-css-classes.mjs`, `audit-gate.mjs`, `close-prebuilt.mjs`,
`gate-tier.mjs`, `gate-table.json`, `.github/workflows/{e2e,test,scaffold,create-site}.yml`, `.github/ci-green.json`,
`src/tests/unit/workflow-yaml.test.ts`, `dev-fold-markers.test.ts`, `.claude/skills/cairn-writing-docs/evals/site-fixture.mjs`,
`.claude/skills/cairn-following-admin-design/references/admin-design-system.md`,
`.claude/skills/cairn-running-passes/SKILL.md`, `references/pass-gate-tiers.md`,
`.claude/skills/cairn-writing-engine-code/references/durable-gotchas.md`.

Current source:

- `e2e.yml:32`: `shardIndex: [1]`; `:34`: `SHARD_TOTAL: 1`
- `test.yml:55`: `- run: npm run package`, and nine later steps with the `npm run package && ` prefix (state read 5)
- `check-visuals.mjs:33`: `const INDEX_FILES = ['docs/README.md', 'docs/why-cairn.md', 'docs/architecture.md'];`
- `package.json:278`: `"tsx": "^4.23.15",`
- `.claude/skills/cairn-running-passes/SKILL.md:30`: `` - `auth-data`: `src/lib/{auth,auth-crypto,github}/**`, ``
- `admin-design-system.md:1335`: "`src/tests/lab/vertical-metrics.ts` is the executable form of this table."

Outcome:

- R2: delete `probe-vertical-alignment.mjs`, `vertical-metrics.ts`, its test, `measure-status-inks.mjs`,
  `measure-prose.mjs`, and `tsx`. Regenerate both lockfiles by `npm install`, keeping them otherwise
  unchanged. Rewrite `admin-design-system.md:1335-1337`.
- R7: delete `check-tool-release`. Narrow `check-chassis-boundary` to `[CANONICAL_SRC]`. Drop `docs/README.md`
  from the four lists. Fold the two audit wrappers only if the fold's findings are identical on the current
  tree, proved by a diff of both reports; otherwise set it aside. `check-admin-prose` stays: it is the only
  guard on shipped admin copy, and T13's table carries the read.
- R8: one job in `e2e.yml`, with `--reporter=dot,html,json`, no blob upload, and no `e2e-report`. In
  `test.yml`, replace the eight single-node scripts with direct `node` calls after the one `npm run package`.
  Move `scaffold.yml`'s two dev-fold steps into `create-site.yml`, then delete it and update `ci-green.json`
  and the readers. The dev-fold steps run last, since the flagged rebuild leaves the tree flagged.
- #272: add `src/lib/sveltekit/{guard,preview}.ts` to the `auth-data` map.
- #286, #273: nine gotcha entries and the file's index. Skip the `emit-tool-conditions.mjs` trap, which `:318`
  has.

**Acceptance:** `gate-tier.test.ts` and `workflow-yaml.test.ts` pass. CI on the head shows `e2e` as one job
with no `e2e report`, `create-site` with both dev-fold steps, and no `scaffold` workflow. `git grep -n
'SHARD_TOTAL\|e2e report'` over the repo prints nothing. The next `check:close` still reports the same
labels. `npm ls tsx` at the root prints no direct dependency. Tell `cairn-cms-9b` the job name changed, since
a watcher may grep `e2e report`. **Test:** the named unit files, CI.

### T11 and T12 (pair), with T13 in the background

#### T11. Trace the first-click flake (65)

Items: the `admin-visual` command palette retry, #208. Class: `ordinary`.
Files: `examples/showcase/e2e/editor-helpers.ts`, `admin-visual.spec.ts`, `container-fields.spec.ts`,
`media-library.spec.ts`, `gate-table.json` if a spec is added, `BACKLOG.md`.

Current source:

- `admin-visual.spec.ts:419`: `await page.getByRole('button', { name: /Search or jump to/ }).click();`, then `:420`: `await expect(page.getByRole('dialog', { name: 'Commands' })).toBeVisible();`
- `CairnAdminShell.svelte:869`: `onclick={openPalette}`; `:931`: `<dialog bind:this={paletteDialog} class="modal" aria-label="Commands">`
- `container-fields.spec.ts:174`: `await page.locator('header').getByRole('button', { name: 'New post' }).click();`, the site `tool-fixes`' swap missed
- `media-library.spec.ts:137-139`, `grid.getByText(USED.name, { exact: true }).click();`, then the region's `toBeVisible()`
- `editor-helpers.ts:25-27`, whose `handler` probe reads `Object.getOwnPropertySymbols(el).length > 0`

Evidence: 7 of 15 `small-api` heads retried a palette test, at every width and in both themes, each as
`element(s) not found` at the 5 second `toBeVisible`. No retry failed its screenshot.

Steps:

1. Read `node_modules/svelte/src/internal/client/dom/elements/events.js` for how a delegated `onclick` is
   attached, and quote it. The `tool-fixes` probe may read the wrong property, since it logged two
   `handler=false opened=true` clicks.
2. In a scratch spec, never committed, apply CDP `Emulation.setCPUThrottlingRate` at 20 and click the palette
   trigger at first actionability on a fresh `goto`, 50 times, recording the handler check at click time
   and whether the dialog opened. Run it through the e2e line from `p2-p4`'s plan, with its ports.
3. Compare `opened` against the handler. Run the same on an idle CPU for the base rate.

Outcome, on a proven cause: one helper in `editor-helpers.ts` waits for the handler the read in step 1 names
and then clicks, used at the palette tests, `container-fields.spec.ts:174` (through `openCreateDialog`), and
`media-library.spec.ts:137`. It replaces no assertion, and adds no re-click. If `openCreateDialog`'s re-click
is then unnecessary, leave it for #208's next read. The drop-once-recorded comment comes out.

Outcome, on no proof: the palette tests go through a helper in the `openCreateDialog` shape that logs
`[palette-trace]`, `container-fields.spec.ts:174` takes `openCreateDialog`, and #208 records what the
throttled run showed. Not a stop, per the sheet's retried-test answer.

**Acceptance:** #208 states the cause or the throttled result, with figures. Once fixed, the PR lists each
head's retries, and T18 reports the palette count over this PR's heads. **Test:** the e2e line on
`admin-visual.spec.ts --grep 'command palette'` and `container-fields.spec.ts`.

#### T12. Eval cases and the sandbox (65)

Items: #188, #191. Quotes: sweep Group K. Class: `runner`. `.claude/rules/evals-docs-process.md` applies: the
PR carries the table.
Files: `.claude/skills/cairn-writing-docs/evals/evals.json`, `setups/`, `run.mjs`, `run.test.mjs`.

Current source:

- `run.mjs:45`: `'Bash(tail *)', 'Bash(head *)', 'Bash(echo *)', 'Bash(sed -n *)', 'Bash(wc *)', 'Bash...`
- `run.mjs:41`: `'Bash(git -C * diff *)', 'Bash(git -C * grep *)', 'Bash(git -C * show *)',`
- `judgeTrial` at `run.mjs:1020`

Outcome:

- #188: one regression and one capability case against an editor page.
- #191: deny `sed -n` scripts with `w`, `git diff --output`, `git grep -O`, `sort -o`, and `git difftool`;
  fence the reply in the judge prompt; make the hard-linked `node_modules` read-only per trial, or copy it.

Then start `node .claude/skills/cairn-writing-docs/evals/run.mjs main <branch>` as a background Bash task.
It runs beside T13 to T17. The suite adds no path, and T18 reads the table.

**Acceptance:** `run.test.mjs` proves each denied form is refused, and the judge prompt fences a reply
holding a fake instruction. The table meets the rule's bar: no regression drop, the target capability case
improves, and every failing trial's transcript is read. A drop follows the rule's rerun. A refused or broken
run sets #191, then #188, aside, reverting those commits. **Test:** `node --test` on `run.test.mjs`.

#### T13. The measures (75, background)

Items: R6's table, the gates read. Quotes: state read 12, 13. Class: `ordinary`. No commit. One
`cairn-implementer` subagent, `isolation: "worktree"`, told to commit nothing and revert every injection. May
not be set aside.

R6. In that worktree, `npm install --no-save --no-package-lock @vitest/coverage-v8@4.1.11`, matching
the lockfile's `vitest`, then `git status` to confirm a clean tree. Nine `unit` runs through `cairn-run-gate`:
baseline, and one with each file excluded, with `--coverage.enabled --coverage.provider=v8
--coverage.include='src/lib/**' --coverage.reporter=json-summary --reporter=json`. A clean timing run gives each
file's seconds. The table: file, lines, seconds, branch delta, unique branches, and what else proves it
(`check:surface` for the barrels; `retires-task2`'s `expect(true).toBe(true)` is type-level, so coverage can't
see it). A non-zero delta reruns with `component` and `integration` where they can run. Mutation data stays
unmeasured, as the sheet says.

Gates. For `check-custom-surface`, `check-cm-internals`, `check-idioms`, `check-rulings-format`,
`check-tool-heuristics`, `check-public-skill`, `check-audit-pack`, and `check-consumers`, plus `check-admin-prose`:
(a) can it fire: read its test for a red case against the real input path; `check-audit-pack` and
`check-consumers` have no test, so inject per state read 13 and revert; (b) has it fired: the CI count over
120 `test.yml` failures, which is 0 of 8, the gate-log lines, and `runs.jsonl`, noting that a lane's failure
is not the gate's; (c) cost: seconds per close and lines of script and test. The verdict column is one of
"keep, has fired", "read at sitting", or "defect, can't fire".

**Acceptance:** both tables in the PR body under `## Measured for the release sitting`, retirements in no
commit, and `package.json` and `package-lock.json` unchanged on the branch. A defect row files a BACKLOG item.

### T14 and T15 (pair)

#### T14. ROADMAP (70)

Item: R9, with the wording rulings. Quotes: state read 6, 10. Class: `ordinary`. May not be set aside.
Files: `ROADMAP.md`, `BACKLOG.md` (#185, #195 wording only).

Current source:

- `ROADMAP.md:189-191`: "The path, with each pass in its slot, is the sequence in `docs/STATUS.md`. "Release one" elsewhere in this file means the one release."
- `ROADMAP.md:161`: "consumer site (ecxc-ski, 907-life, aksailingclub-org, xcathletes-org, cairn-pub) is to be"
- `ROADMAP.md:182`: heading `### The pre-beta pass series, now the one-release path`
- `ROADMAP.md:213`: "`migrate` wording is left to pass 8's R9."
- `ROADMAP.md:220`: "- **After the release and the site migrations:** the widened go-public pass, the dress rehearsal, and"
- `ROADMAP.md:423`: "**The template repo's pre-release notice comes off when `create-cairn-site` publishes.**"
- `ROADMAP.md:652`: "**After the one release:**"

Outcome:

- History: read each of the 214 bullets under `Now`, `Next`, and `Later` plus the `:182-255` sections.
  Delete a bullet when the code or a closed backlog item shows it done, or an open BACKLOG item covers it,
  and record the proof in the commit body. Keep the rest. 2,000 lines is a ceiling, not a target. A bullet
  in doubt stays.
- Wording: `migrate` becomes `rebuild` on the site-migration lines the state read lists, and the D1 and code
  hits stay. Rewrite `:189-191` to state the sequence, not point at STATUS: run the sheet's passes, that
  release is the first, 907.life's rebuild drives the next, and each later rebuild may drive its own. The
  eight "Release one" lines follow. Drop `xcathletes-org`, and check "all five sites" at `:172`. `:97-111`
  and `:423-430` move the button and template repo after the release.
- `BACKLOG.md:206` and #185, #195: "the one release" reads "the release".

**Acceptance:** `grep -n 'one release\|Release one\|xcathletes-org\|site migrations'` over `ROADMAP.md` prints
nothing that survives as live wording. Every deleted bullet has a proof line. **Test:** `npm run check:docs-gate`
if the docs arms read it, `check:symbols`.

#### T15. Tool path, doctor check, and doc facts (80)

Items: `tool/v2` module path (S6), #270, #287, #288, #207. Quotes: state read 7, 8, sweep Groups I and J.
Class: `ordinary`; the `chapter2.mjs:950` string is `auth-data`, so that commit takes `standards:diff-reviewer`.
Load `standards:go-conventions` for `tool/`. `tool/` commits run `make -C tool check`.
Files: `tool/go.mod`, every `tool/**/*.go` import (132 files), `tool/README.md`, `tool/scripts/install-check.sh`,
`tool/CHANGELOG.md`, `tool/internal/doctor/check_roles.go` and test, `packages/create-cairn-site/bin.mjs`,
`src/scaffold.mjs`, `src/scaffold.test.mjs`, `src/cloudflare/chapter2.mjs`, `docs/admin/is-it-working.md`,
`src/lib/sveltekit/admin-response.ts`, `skills/cairn-extending-a-site/references/admin-access.md`,
`docs/editors/write-in-the-editor.md`, `docs/architecture.md`.

Current source:

- `tool/go.mod:1`: `module github.com/glw907/cairn-cms/tool`
- `bin.mjs:90`: ``'it with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from the ' +``
- `check_roles.go:61`: ``var wiringWordPattern = regexp.MustCompile(`\b(?:runtime|roles)\b`)``
- `admin-response.ts:40`: `headers.set('Strict-Transport-Security', 'max-age=63072000');`
- `preview.ts:441`: `const branch = pendingBranch(concept.id, row.entryId);`
- `docs/architecture.md:48`: "This section is where the security model is documented. The design assumes the likeliest attacker holds an editor's account, through a stolen or phished sign-in link."

Outcome:

- `tool/v2`: the module path becomes `github.com/glw907/cairn-cms/tool/v2`, every import follows, and the
  printed `go install` lines and `install-check.sh`'s `MODULE` name `.../tool/v2/cmd/cairn`. `tool.yml` and any
  `-ldflags` path are checked and follow. `tool/tools/go.mod` stays: it's its own module. `01-create-cairn-site.txt`
  stays for the recapture, listed. `tool/CHANGELOG.md`'s `## Unreleased` says so.
- #270: match `\bruntime\b`, update the comments, and flip `check_roles_test.go:68,190`.
- #287: state that the zone's setting overrides the admin's header, from the sweep's reads of `ecxc.ski`,
  `907.life`, and `cairn.pub`, with the limit that those run older engines. Update `admin-response.ts:27`'s
  comment and `admin-access.md`. T17 carries the notes line.
- #288: one sentence in the Share preview row at `write-in-the-editor.md:250-252`. The link shows the entry's
  latest saved draft, later drafts included, until it expires or you revoke it.
- #207, in this order. (1) Write one short testable core claim for each of `brief-map.md`'s nine items, without
  opening `next-pass-design.md`, `packet-pass-4-close.md`, the ledger, or PR #170, and before reading any trial
  answer. (2) Dispatch one fresh Opus medium agent with only the claims, each trial's final `result` text from
  `~/.local/state/cairn-agent-first/e2e/out/evaluate/trial-{1,2,3}.jsonl` under shuffled neutral labels, and the
  allowed pages at `04c6036ac`. It returns met or unmet per item per trial, with the quote and source page.
  (3) Grep the three transcripts for `pre-agent-first`. (4) Record the result in the PR body under `## Decisions`
  and in STATUS. (5) Delete the rubric sentence, `docs/architecture.md:48`'s first sentence. The grade reads
  `04c6036ac`, so the deletion can't affect it.

**Acceptance:** `make -C tool check` passes, and `go list -m` in `tool/` prints the `/v2` path. `git grep
'cairn-cms/tool/cmd'` prints only the transcripts, the changelogs, and the historical notes. `check_roles_test.go`'s
`createAuthGuard({ roles })` case reads as unwired. The fact-checker passes on each docs edit, with the
#287 limit stated. The grade's result is recorded, and the first run's unblind "nine of nine" is named as not
evidence. **Test:** `make -C tool check`, `npm test -w packages/create-cairn-site`.

### T16. Regenerate baselines and read them (30)

Files: baselines, by CI only. Class: `ordinary`. Merge `main` first. Dispatch `e2e.yml` with
`update_snapshots=true` on the branch, once. It covers the home change (ergonomics 7), `styleguide-*` (#283),
and anything #275 or #262 moved. Read the render of each changed image in the main loop. The bot's commit may
show a red or 0-job run on itself: what proves it is the next `e2e` run on the pushed head. Never commit a
local baseline. **Acceptance:** an `e2e` run on the head is green with no `toHaveScreenshot` failure, and the
PR lists the changed images.

### T17. Reset the history files (70)

Items: R1, the full backlog sweep beside it, BACKLOG closures, STATUS. Quotes: state read 1. Class: `ordinary`
plus `runner`. Runs last, after a final `main` merge. May not be set aside.
Files: `CHANGELOG.md`, `MIGRATION-NOTES.md`, `scripts/checks/consumers-must-baseline.json`,
`check-symbols-allowlist.mjs`, `src/tests/unit/github-slug-contract.test.ts`, `CONTRIBUTING.md`,
`docs/admin/before-you-start.md`, `docs/admin/own-your-domain.md`, `tool/docs/release-candidate-notes.md`,
`claude/CLAUDE.md` if needed, `BACKLOG.md`, `docs/STATUS.md`, `templates/waymark` (emit).

Current source:

- `check-version.mjs:161-165`: the top heading must equal `package.json`'s version
- `docs-links.mjs:171-178`, `unreleasedParityMismatch`: both or neither carry `## Unreleased`
- `github-slug-contract.test.ts:82-86`: requires `## 0.94.0` in `MIGRATION-NOTES.md`
- `check-consumers-must.mjs:22`: `export const LINE = /^(?:  )?Consumers must: ([^\t\n\f\r ].*)$/s;`
- `CONTRIBUTING.md:98-120`, which describes a `LEGACY_PATH_MAP` that no longer exists
- `check-symbols-allowlist.mjs:38`: `'env-var:CAIRN_AUDIT_COOKIES', // MIGRATION-NOTES.md history; the reader was removed in 1b; R1's reset drops this line`

Outcome:

- `CHANGELOG.md`: `## Unreleased` stays on line 1, consolidated into plain sections a rebuilder reads, naming
  every public break in a sentence. It carries one actionable line, at column 0, a paragraph of its own:
  ``Consumers must: rebuild the site from `create-cairn-site`; this release has no upgrade path from an earlier version.``
  No `release-size` marker, since pass 9 derives it. `## 0.98.0` stays as the top numbered heading, with one
  line pointing at tag `v0.98.0` for this and earlier versions. Everything below it goes.
- `MIGRATION-NOTES.md`: rewrite the intro and `:193-195`. `## Unreleased` and a `## 0.98.0` stub stay. The four
  "When your range crosses" sections and the older per-version sections go. Keep the general procedure only if
  it still reads true. Check that `migrations/0000_auth.sql:29`'s and `store.ts:235`'s pointers hold, or repoint them.
- `node scripts/checks/check-consumers-must.mjs --update`, expecting `[]`. Repoint `github-slug-contract` to
  `## 0.98.0`, id `0980`. Prune the allowlist by running `check:symbols`.
- `CONTRIBUTING.md:98-120` takes the `isDatedRecord` rule. The docs lines stay true or are repointed.
- Full sweep, as a read-only agent in the background, at this head: every open item, oldest unswept first, at
  most 40, per `standards:backlog-sweep`. It folds nothing. Write
  `~/.local/state/cairn-agent-first/<date>-backlog-triage.json` in the shape of `2026-11-01-backlog-triage.json`
  (`headline`, `lede`, `rows` of `action`, `why`, `proposed`, `detail`), and add #190, #284, and #247's two
  accepted residuals as drop rows. Land nothing from it: the release sitting does.
- Close each folded item in `## Done` with its commit. Set `docs/STATUS.md`: `:22`'s stale state, the Evaluate
  line, and the three lists waiting for the sitting.

**Acceptance:** `check:version`, `check:consumers-must`, `check:docs`, `check:leaks`, `check:symbols`,
`check:snippets`, `check:package`, `make -C tool check`, and `github-slug-contract.test.ts` pass. `cairn health`'s
`check_engine_test.go` passes. `wc -l` on both files is under 400. Every `Consumers must:` in Unreleased but the
rebuild line is gone, and every breaking name in `api-surface.md`'s diff from `v0.98.0` that a rebuilder could
write is named. The triage file exists, or its rows are in the PR. **Test:** `npm run check:close` through the lane.

### T18. Close (90)

Class: as above. Fetch `main`, merge it if it moved, follow the standing answer. Dispatch
`standards:diff-reviewer` at whole-branch scope, `standards:web-auth-security-reviewer`,
`standards:svelte-reviewer`, `standards:daisyui-a11y-reviewer`, `standards:cloudflare-workers-reviewer`
for T5's D1 change, and `standards:go-conventions` over `tool/`. Fold what they find. Run `docs-fact-checker`
over the changed `docs/` lines. Run the live admin smoke per `references/admin-smoke-test.md`, with `no-pending-request`
as a note. Read the render in the main loop. Read the eval table. Finalize the `## Unreleased` entries.
List every retried test. Delete every `docs/internal/plans/2026-11-02-cleanup-*` file in a final commit. Write
the PR body per `pass-core` "Close": `## Brief`, what landed, `## Decisions`, `## Planning misses`, `## Tooling`,
`## Measured for the release sitting`, found items, and the score.

`## Tooling` starts with these seeds, each with its fix or number:

- `standards:log-issue` Step 3 takes numbers per branch, so parallel branches collide. Fix: `glw907/standards`.
- The worktree guard (#250) refused a `for` loop, `$(...)`, `source`, a `jq` filter with `\(`, and `git -C` on a
  sibling repo, in the planner's session and in both its read agents, on commands that ran no git. Its source
  isn't in `workstation`, so its home is Claude Code.
- `run-sheet`'s class line missed the map's `auth-data` paths again, as `small-api` noted. The planner's dependency
  map should run the path map over each item's files.
- `cairn-run-gate`'s run record has no per-gate failure labels, so the gates read can't count a gate's own
  failures (state read 13).
- `tool-fixes`' swap missed `container-fields.spec.ts:174`, and no gate reads for a bare click. T11's helper
  closes that if the cause is proved.
- The sheet's reader list for R1 missed `github-slug-contract.test.ts`, and its pass 9 step 17 missed `tool/go.mod`.

**Acceptance:** green CI on the head, every review folded with no open finding, the smoke passed, the plan
files gone, and the PR reported to `cairn-cms-9b` as ready. No merge, no bump, no publish.
