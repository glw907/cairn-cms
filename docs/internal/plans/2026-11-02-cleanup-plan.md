# cleanup task plan

- **Slice:** `cleanup`, run sheet pass 8, with every open BACKLOG item placed in the Cleanup round or
  Pass 8.
- **Class:** `ordinary` plus `runner`, `auth-data` by item (T5, T7's `chapter3.mjs`, T15's `chapter2.mjs`,
  T8's `[token]` commit if it must change). Security read and live smoke at close.
- **Base:** `main` at `9ea74f78a`, with `p2-p4` merging first (see "p2-p4 overlaps"). The executor launches
  after that merge.
- **Plan branch:** `worktree-cleanup`. **Run branch:** `worktree-cleanup-run`, cut from `origin/main`.
- **Push target:** `glw907/cairn-cms`.
- **Design:** `docs/internal/plans/2026-11-02-cleanup-design.md`. Read it first.
- **Quotes:** `2026-11-02-cleanup-sweep.md` (backlog items, by item number) and
  `2026-11-02-cleanup-state-read.md` (sheet items, by its numbered section) hold every cited line quoted
  at `9ea74f78a`. Each task names its section. A dispatch quotes that section into its brief, since
  implementers start with nothing.
- **Estimate:** 420 from the sheet. **Path:** 839 calibrated, 1,173 at reader sizes. **Ceiling:** 840.
  **The launch is held on S1.** Tasks are written to S1's option (a), since a recut only removes items.
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
reading, so each folds on S2 and S3. It read #211 as a fold; it moves after the release (S5). It read #249
as a fold; see Keep.

**Done, for the scope audit.** #166, #75, #55, #85, #90, #92, #93, #94, and ergonomics 22 are closed already.

**Full sweep.** The due rule fired on 39 of 67 items at `p2-p4`'s planning. T17 runs it at close, as the
sheet places it.

**`standards:log-issue` number collision.** The fix belongs in `glw907/standards`
(`plugins/standards/skills/log-issue/SKILL.md`, Step 3 reads the highest number on the current branch), so
it's not in this plan. The PR's `## Tooling` lists it for the conductor.

## S1, the one stop

The launch prompt says: "A plan still over its ceiling after its cuts, or a finding that changes the design,
stops: write one question to your branch's docs/STATUS.md and report to the conductor." This is that stop.
The launch waits on the answer.

**S1. Does the plan answer to the calibrated path or to reader sizes?** At the two readers' sizes the path is
1,173 after the folds, over the 840 ceiling. The sheet's three cuts save 13 on that path, to 1,160: R8's shard
work and ergonomics 14 shorten T9 and T10, and ergonomics 12 sits in T8, the shorter of its pair. Applying a
factor changes the ceiling's unit, and a planner can't rule that alone.

- **(a) Accept the calibrated path, 839, as the plan's estimate against the 840 ceiling. Recommended.** Ten
  recent passes ran at 0.35 to 0.74 of plan path, 0.58 weighted (actual 1,639 against 2,840, from their PR
  scores). Each task estimate here is the reader's size at 0.7, the upper end of that range, so the clock
  stop at twice an estimate sits at 1.4 of the reader's size. No cut is taken: the folds land at 839. The pace
  trigger under "Set-aside order" holds it during the run.
- **(b) Recut to 840 at reader sizes.** The whole Set-aside order leaves, in order, and saves 116 of path, to
  1,057, because most of it sits in a pair's shorter task. Reaching 840 then takes these too, which no May-not
  protects: all of T1 and T2 (-126, to 931); #199, #200, #259, and #262, the rest of T6 (-37, to 894); and
  ergonomics 1, ergonomics 7, and #203 from T7 (-60). That gives about 834. R1, R9, #196's majors, the measures,
  T11's trace, #271, `/styleguide`, the notice, `--yes`, and every other unlisted item stay. Each moved item's
  Placement becomes After the release.

Run limit: the eleven passes read about 2,090 actual, with `tool-gates` and `p2-p4` inferred. The 0.58 belongs
to reader-sized path, so this pass should take about 680 (1,173 at 0.58), ending about 2,770, against the
2,900 line. If it runs at the 840 ceiling it ends about 2,930, which would fire that line at the release
boundary. The conductor holds it, so it needs to know.

## Recommended readings

S2 to S7 are not stops. The sheet's "What can't be settled now" row lets the plan take a reversible reading,
listed in the PR's `## Decisions`, so they need no answer before launch. The plan is written to each
recommended reading, and the conductor may overrule any.

**S2. #248, the sign-in rate limit.** `throttled` reveals membership by design (`auth-routes.ts:204-206`),
and no ledger entry rules on it.

- **Recommended:** keep the oracle and add `auth.rateLimit` as an optional binding resolver, degrade-to-open
  like `createSectionAction`'s `rateLimit`. It's a bare resolver, since the key is fixed. Key on
  `cf-connecting-ip` as `login:<address>`. A limited `requestAction` answers the existing `throttled` outcome,
  with no new `LoginRequestOutcome` arm, so a limited non-editor reads `throttled` too, which blurs the oracle
  a little. `confirmAction` takes no limit: its token is 32 random bytes and single use, so a limit protects
  nothing the consume doesn't, and it would make a live link read as failed. #248's closure names that
  departure from its text. A new ruling entry records all of it.
- Defer to after the release. T5 falls by 30.

**S3. #247, session residuals.**

- **Recommended:** hash session ids in `store.ts`, as `magic_token` already stores `token_hash`, which signs
  everyone out once at deploy, and delete this browser's prior row on re-login. Accept the confirm page's
  token and the `frame-ancestors`-only CSP, as two triage rows for Geoff.
- Defer the whole item. T5 falls by 35, and hashing then signs rebuilt sites out once later.

**S4. #246, the Worker key's permissions.** Telling an owner to reduce the App to Contents is the natural
answer, but #245 hasn't proved that a Contents-only token can write refs on a repository with workflow
files. **Recommended:** hold the ruling, and move #246's Placement to the real install beside #245. #203's
closing line says only to narrow the installation.

**S5. #211, tidy latency.** #211 moves after the release. No task touches it.

**S6. `tool/v2` module path (new find).** It lands in T15 under the sheet's cutoff, because pass 9's step
17 needs it. It is the one item outside the sheet's scope and the launch list. Go's module reference: "If
there are no tagged versions, `latest` selects a pseudo-version for the commit at the tip of the repository's
default branch", and a module's subdirectory is "the part of the module path that names the directory, not
including the major version suffix", so `tool/v2.0.0` is a valid tag for `.../tool/v2`. Before the merge, the
printed `go install .../tool/v2/cmd/cairn@latest` line can't resolve. After it, that should resolve to `main`'s
tip, unstamped; that reading is inferred and not run, so the conductor runs one `go install` of the line after
the merge. `@latest` on the old path serves a doctor that fails a rebuilt site (`tool/CHANGELOG.md:74-75`). The
rename can be reverted before the tag and not after. **Recommended:** land it.

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
    `cairn-running-passes/references/pass-gate-tiers.md`, `cairn-writing-engine-code/references/durable-gotchas.md`,
    `cairn-writing-docs/evals/site-fixture.mjs`
  - T12: `cairn-writing-docs/evals/**`
  - T17: `cairn-releasing/SKILL.md`
- `CLAUDE.md` files: T9 edits `claude/CLAUDE.md`. No task edits the root `CLAUDE.md`, which
  `.claude/rules/evals-docs-process.md` would also catch. No task edits `.claude/rules/`.
- `claude/agents/cairn-extension-reviewer.md` (T9) is packaged text outside the sheet's named paths. Pass
  1a's write probe passed on it. A refusal sets #196's P2 minor aside; it is not a major.
- `.github/workflows/**` (T7, T10, T15), a `runner` path that earlier passes pushed.
- T16 dispatches `e2e.yml` with `update_snapshots=true`, once, plus once more only if a `main` merge or a T18
  fold moves a baseline. T18 dispatches `tool.yml` once for the release job's dry run. Auto mode refused a
  repeated dispatch in `tool-fixes`, so no task dispatches a workflow to sample a flake. A refused dispatch is
  a stop, and an empty commit is never a substitute.
- T18 runs `wrangler d1 --local` for the smoke's session row, and stops the test process it started.
- The conductor's merge under the merge word.
- `ci-green` exit 4 with actor `github-actions[bot]`: run the approve command it prints.
- T17 writes the triage JSON under `~/.local/state/cairn-agent-first/`. If that write is refused, the rows
  go in the PR body. T13 writes nothing outside the PR body; the session files its defect rows.

A credential refused by one path is a stop. No task reads a credential.

## p2-p4 overlaps

`p2-p4` merges first. Its plan is on `worktree-p2-p4`, its run on `worktree-p2-p4-run` (86 files through
T8 at `0bb291833`). Quotes here are `main`'s, so after that merge a task finds a line by its quoted text.

| Where | p2-p4 | This pass | Handling |
| --- | --- | --- | --- |
| `src/lib/admin/EditPage.svelte` | T6, T7; `flash` moves from `:1277` to `:1308` | T1: #263, #268, #275, #289 | Different lines. Re-find by text |
| `src/lib/sveltekit/content-routes-entry-write.ts` | T7, `field` on the refusal | T6: #199, #200 | The `saveRefusal` call may gain a field. Re-read |
| `src/lib/sveltekit/auth-routes.ts` | Comments, T4 | T5: #243's tag, #247, #248 | Text merge |
| `src/lib/admin/LoginPage.svelte`, `refusal-codes.ts` | T4's one wording | T5 reuses `throttled` | Reuse, no new string |
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
| A `BACKLOG.md` conflict at T0 | Keep `p2-p4`'s closures and this branch's stamps and placements, and take numbers past the highest on `main`. |
| A `toHaveScreenshot` failure on an image the task listed as intended, before T16 | Not a red. Any other failure on that head is. |
| A conflict in `templates/waymark/**`, `guidance-hashes.json`, or `scripts/checks/api-surface.md` while merging a pair or `main` | Take either side and rerun `npm run emit:template` or `npm run check:surface -- --update`. It's generated. |
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
Trigger: at each pair's close, spent plus remaining plan past 840 sets aside the next not-yet-started item,
in this order, or a returning cause survives its structural fix. No finished work is reverted for pace.

1. R8's shard work. 2. Ergonomics 14. 3. Ergonomics 12. 4. R7's fold of the two audit wrappers. 5. The
rest of R8. 6. Ergonomics 11. 7. #191. 8. #188. 9. #281. 10. #260. 11. #265. 12. #248. 13. #247. 14. #283.
15. #282.

Each set-aside item stays open with its Placement moved to After the release. The order goes past the sheet's
May-set-aside list, which names only R7's `check-admin-prose` question, R8, and ergonomics 11, 12, and 14. The
sheet's event row says "Set aside if the plan allows", so the plan allows it; the PR's `## Decisions` lists it.

**May not set aside:** R1, R3 (done), R9, #196's majors, the measures. Also, by the planner, T11's trace
and T5's #271.

## Tasks

Every task commits path-limited, then runs the fast lane per `cairn-pass`. A pair goes to two
`cairn-implementer` subagents, `isolation: "worktree"`, each named `cleanup task <n>`, naming model and
effort. Sonnet medium unless a task says otherwise. No task touches `CHANGELOG.md` or `MIGRATION-NOTES.md`:
each reports its lines, the session keeps them in the draft PR's body, and T17 writes them once. Each item
commits on its own, so a set-aside can revert one commit. BACKLOG closes in T17, in one edit. A task that
edits a skill or a template source re-emits, so `templates/waymark` and `guidance-hashes.json` are in its Files.

**Path:** T0 10, T1+T2 88, T3+T4 80, T5+T6 108, T7+T8 103, T9+T10 110, T11+T12 69, T14+T15 70, T16 34, T17
77, T18 90 = 839. T13 runs in the background beside T11 through T15, so it adds no path, though its runs hold
the heavy gate lock and queue against T11's e2e runs. The eval suite runs beside them, and the #207 grade runs
in the session beside T16's CI wait.

### T0. Set up the run branch (10)

Files: none. Class: `ordinary`. Enter the worktree named `cleanup-run`, run the setup command, merge
`origin/worktree-cleanup` under the standing `BACKLOG.md` row, and open a draft PR with `## Tooling` seeded
from this plan.

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

**Acceptance:** a component test fails before each fix and passes after: one visible notice with
`politeMessage` carrying both; a second submit disabled on each form, and `onpageshow` re-enabling it; the list
role on both lists; one case for each of #289's four names, with the count silent on an empty query; an
attribute's `help` rendered and referenced. Grep `docs/editors`, `examples/showcase/e2e`, and `src/tests` for
each changed string. **Test:** `npx vitest run --project component` on `EditPage.test.ts`,
`ComponentForm.test.ts`, and the other named files.

#### T2. Content and manifest fixes (88)

Items: #264, #240, #239, #232, #261. Quotes: sweep Group E. Class: `ordinary`.
Files: `src/lib/content/body-scan.ts`, `media-rewrite.ts`, `fieldset.ts`, `src/lib/delivery/manifest.ts`,
`src/lib/vite/internal.ts`, `skills/cairn-extending-a-site/references/log-events.md`, `content-model.md`,
their unit tests, `src/tests/unit/delivery-manifest.test.ts`, `vite-manifest-dev-server.test.ts`,
`content-media-rewrite.test.ts`, `templates/waymark` and `guidance-hashes.json` (emit).

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
- #261: `applyManifest` gains an option the dev path sets, which holds the write only when a committed row
  with `publishedAt` is absent from `built.manifest` and a problem names it. A bad filename or a dead link keeps
  its row, so it doesn't hold. A held write's report says `held: true` and counts against `committed`.
  `cairn-manifest` is unchanged, and that report line states that limit.

**Acceptance:** each case from the item fails first. `<a title="a>b" href="cairn:posts/one">` is found and
`<a title="see href=cairn:x">` isn't. A BOM file gets its hero `src` repointed in both rewriters with the BOM
restored, and a BOM file with a non-matching hash returns byte-identical input in both. `{ length: 5, max: 3 }`,
`min > max`, and a non-calendar date bound throw at declaration. `scope` is gone from the record. A dev start
over an invalid published entry leaves `index.json` byte-identical and reports held; a published entry with a
dead link, and an invalid entry with no `publishedAt`, still write. `npm run emit:template` if a skill changed.
**Test:** the named unit files.

### T3 and T4 (pair)

#### T3. Fast-lane selection (75)

Items: #265, #266, #267, #285, #260 (cut text). Quotes: sweep Group B. Class: `runner`.
Files: `scripts/checks/gate-tier.mjs`, `gate-table.json`, `src/tests/unit/gate-tier.test.ts`,
`vitest.config.ts`, a new global-setup file beside it and its test.

Current source:

- `gate-tier.mjs:488`: `if (reach.length === 0) return { mode: 'full', reason: 'nothing under src/ to select from', reach: [] };`
- `gate-tier.mjs:672`: ``const npmPaths = paths.filter((path) => !path.startsWith('tool/'));`` (again at `:580`)
- `check-symbols.mjs:412`: `const path = join(root, 'tool/testdata/flags.json');`
- `vitest.config.ts:124`: `name: 'unit-dist-spawn',`

Outcome:

- #265: at classify time, each changed `src/` path adds the unit tests whose text names that repo-relative
  path. A test that walks the tree stays with CI.
- #266: `mode: 'skip'` at `:488`. `component-rerun-triggers.mjs:30,34,35` already holds the vitest config,
  `package.json`, and the lockfile.
- #267: `tool/testdata/flags.json` stays in `npmPaths` at both lines and maps to `check:symbols`.
- #285: `src/lib/internal.ts` in the range pushes `npx vitest run --project unit-dist-spawn` after the unit leg.
- #260: the unit project's global setup prints one line when the newest `src/lib` mtime passes `dist`'s. It
  warns and never throws.

**Acceptance:** #265, #266, #267, and #285 are each a `gate-tier.test.ts` case that fails first, on a synthetic
range. #260 is its own small test, with one case for a missing `dist`, which warns and doesn't throw. `node
scripts/checks/gate-tier.mjs --fast --range <base>..HEAD` over a `scripts/`-only commit prints no component leg.
Touching `src/lib` in a scratch run prints the warning. **Test:** `npx vitest run --project unit
src/tests/unit/gate-tier.test.ts` and the new test.

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
pass. The five names are gone from `api-surface.md`, and `git grep cleanup-hide-internals` shows the ledger
entry's new line. A `check-surface-leaks.test.ts` case with a leak behind a conditional fails before the walk.
Each removed name has no hit in `skills/`, `docs/admin`, `docs/editors`, `docs/architecture.md`,
`docs/why-cairn.md`, `claude/`, or `README.md`. **Test:** the named unit files.

### T5 and T6 (pair)

#### T5. Auth items (105)

Items: #271, #243, #280 (second line), #247, #248. Quotes: sweep Groups H and L. Class: `auth-data`. Model:
**opus at medium**, since #247 and #248 carry correctness logic a plan can't fully specify. Failing test
first on each item that adds behavior; #243 is a removal, so its proof is below. `standards:diff-reviewer` reads
each commit while CI runs. Never `RUN_GATE_IF_BUSY=defer`.
Files: `src/lib/auth/access.ts`, `store.ts`, `roles.ts`, `src/lib/sveltekit/auth-routes.ts`, `cairn-admin.ts`,
`src/lib/log/events.ts`, `events-list.ts`, `tool/internal/logs/events.go`,
`skills/cairn-extending-a-site/references/log-events.md`, `admin-access.md`,
`packages/cairn-cms-dev/src/fake-auth-db.ts` and test, `.claude/skills/cairn-running-passes/references/admin-smoke-test.md`,
`SECURITY.md`, `scripts/checks/api-surface.md`, `docs/internal/engine-rulings.md`, `templates/waymark` and
`guidance-hashes.json` (emit), `src/tests/unit/auth-access.test.ts`, `src/tests/unit/cairn-admin-actions.test.ts`,
`src/tests/integration/auth-store.test.ts`, `auth-request.test.ts`, `one-map-four-readers.test.ts`, the other
`auth-*` tests.

Current source:

- `access.ts:198-199`: `const admitted = access[target];` / `return admitted === undefined ? true : admitted.includes(editor.role);`
- `access.ts:215`: `return Object.hasOwn(access, target);`
- `store.ts:503`: `export async function removeOwnerIfNotLast(`; `:609`: `export async function demoteOwnerIfNotLast(`; `:353`: `export type OwnerGuardOutcome =`
- `store.ts:241`: `.prepare('INSERT INTO session (id, email, expires_at, created_at) VALUES (?, ?, ?, ?)')`
- `store.ts:228`: `await db.batch([`, in `createSession`; `:255`: `WHERE s.id = ? AND s.expires_at > ?`, in `resolveSession`; `:275`: `.prepare('DELETE FROM session WHERE id = ? RETURNING email, expires_at')`, in `deleteSession`
- `store.ts:396`: `ownerRoles?: string[],`, in `editorRowStillPresent`
- `auth-routes.ts:196`: `const nonce = mintOrReusePendingNonce(event);`; `:198`: `const editor = email ? await findEditor(db, email) : null;`
- `auth-routes.ts:206`: `if (await recentlyIssued(db, email, now - SEND_COOLDOWN_MS)) {`
- `auth-routes.ts:339`: `const email = await consumeToken(db, await hashToken(token), now, nonce ? await hashToken(nonce) : null);`
- `auth-routes.ts:360`: `await createSession(db, id, email, now + SESSION_TTL_MS, now);`
- `auth-routes.ts:444-445`: `const id =` / `event.cookies.get(sessionCookieName(secure)) ?? event.cookies.get(sessionCookieName(!secure));`
- `auth-routes.ts:486`: ` * @beta` above `export interface AuthRoutes {`
- `cairn-admin.ts:42`: `auth?: Pick<AuthRoutesConfig, 'send'>;`
- `section-action.ts:66`: `resolve: (env: Env | undefined) => RateLimitLike | undefined;`
- `rate-limit.ts:27-31`: `allowed`, `limited`, `no-binding`, `failed`
- `rate-limit.ts:56`: `IP component from `CF-Connecting-IP` only, never a client-forwardable header such as`
- `@sveltejs/adapter-cloudflare/files/worker.js`: `return /** @type {string} */ (req.headers.get('cf-connecting-ip'));`, inside `getClientAddress()`. `CairnEvent` has `request` and no `getClientAddress`, so the header is read directly.
- `auth-store.test.ts:133`: `it('counts across a two-owner-level-name vocabulary, not the literal owner string', async () => {`
- `cairn-admin-actions.test.ts:229`: `c.args[0] === 'sid'`
- `admin-smoke-test.md:74`: `VALUES ('smoke-owner', 'smoke-owner@example.com', 4070908800000, 0);`; `:134`: `DELETE FROM session WHERE id LIKE 'smoke%';`

Outcome, in this order, one commit each:

1. #271: `const admitted = Object.hasOwn(access, target) ? access[target] : undefined;`, with `constructor`
   and `__proto__` tests. A prototype name then answers as any unmapped target, which `access.ts:176` documents
   as the any-editor floor. That is the reading of #271's "Read the map as `hasAccessRule` does", and today's
   500 goes. The PR names it for T18's security read.
2. #243 and #280: first port `auth-store.test.ts:133-154` to `deleteEditor` and `setEditorRole`, since they are
   the only two-name last-owner proofs and those functions are what production runs. Then remove the two
   helpers, `OwnerGuardOutcome`, their tests, their doc links, `ownerRoles` from `editorRowStillPresent`
   (`store.ts:393-408`), and the fake's matching SQL branches, including the `role IN` one at
   `fake-auth-db.ts:123-128`, keeping any `deleteEditor` shares. Drop the `@public` and `@beta` tags left on
   names no barrel exports. Edit no comment in the `0003_preview.sql` copies, which are applied migrations.
3. #247, on S3: `createSession`, `resolveSession`, and `deleteSession` hash the id through `hashToken`, so
   callers keep the raw id. `createSession` takes an optional `priorId`, hashed, and deletes it in the same
   `db.batch` as the expired sweep and the insert. `confirmAction` reads the prior id with `logoutAction`'s
   two-name read, after `consumeToken` returns an email, so a failed confirm changes nothing. These tests really
   change: `cairn-admin-actions.test.ts:229` asserts the digest and stays a logout proof, and
   `one-map-four-readers.test.ts:61` seeds through `createSession`. `auth-cleanup.test.ts:30` needs no change,
   since that row is only swept and counted. In `admin-smoke-test.md`, `:74` and `:90-99` seed the id's digest,
   with the command that produced it (`hashToken` is lowercase SHA-256 hex, `crypto.ts:115-119`), and `:134` cleans
   up by `email`. `SECURITY.md:21` says the store keeps only a digest. The sign-out goes in T17's section as a
   sentence, and the PR's `## Tooling` names `907-life/scripts/mint-session.mjs` for that site's rebuild.
4. #248, on S2: `AuthRoutesConfig.rateLimit?: (env) => RateLimitLike | undefined`, reached by widening
   `cairn-admin.ts:42`'s `Pick`, documented for `check:options`, with the doc comment stating the address-key
   warning below and telling a site to set a generous budget. In `requestAction`, immediately after
   `mintOrReusePendingNonce` and before `findEditor`, one guarded helper reads
   `event.request.headers.get('cf-connecting-ip')` and runs the resolver and `resolveRateLimit` under `login:<address>`.
   An absent header skips the limiter, so a null can't become a shared bucket. `limited` returns
   `{ outcome: 'throttled' }` and logs `auth.rate_limited`, carrying `scope`. `no-binding` lets the request
   through. A throw or `failed` lets it through and logs `auth.rate_limit_failed` at warn. Neither event carries
   the address. `confirmAction` takes no limit (S2). A limited editor exits before `rebindToken`, so someone on
   the same address can pause the anti-lockout recovery for the window, and that is accepted. Update the
   `LoginRequestOutcome` doc and the `:205` comment. The ruling entry records the oracle, no confirm limit, that
   residual, the `throttled` copy a limited first-time reader sees, and Cloudflare's published warning: "It is
   not recommended to use IP addresses or locations (regions or countries)", which stands here because no
   identity exists before sign-in and an email key is attacker-chosen.

**Acceptance:** `canReach` with `constructor` and `__proto__` answers as an unmapped target for owner, editor,
and `none` capability, with no `TypeError`. #243: `git grep` on the three names prints nothing, the fake's tests
pass, and the ported two-name cases pass. A raw id no longer selects a row by direct SQL, while `resolveSession`
on the raw id still returns it. Logout removes the row, by direct SQL, and the cookie no longer resolves.
Re-login leaves one row per browser, and a second device's row survives. A failed confirm with a session cookie
leaves that row. With a fixed pending cookie, a limited request's serialized result and `Set-Cookie` equal a
`throttled` answer's, for an editor and a non-editor alike, extending the jar comparison at
`auth-request.test.ts:159`; a fresh nonce is random, so the bytes are comparable only on a reused cookie. One case
runs through `createCairnAdmin({ auth: { rateLimit } })`. With no binding, no header, a `failed` result, or a
throwing resolver, the flow is unchanged, and the two failure paths log. The event carries its fields and no
address. `check:options` passes, the `tool` gate passes for the events, and `git grep` finds the new ruling's slug
in `engine-rulings.md`. **Test:** the `auth-*` integration files, `src/tests/unit/auth-access.test.ts`,
`src/tests/unit/cairn-admin-actions.test.ts`, `one-map-four-readers.test.ts`.

#### T6. Save path, media, and block wording (95)

Items: #199, #200, #259, #262, #283. Quotes: sweep Groups F, G, and J. Class: `ordinary`.
Files: `src/lib/sveltekit/content-routes-entry-write.ts`, `content-routes-entry-destructive.ts`,
`skills/cairn-extending-a-site/references/media.md`, `src/lib/admin/client-ingest.ts`,
`CairnMediaLibrary.svelte`, `MarkdownEditor.svelte`, `src/lib/render/registry.ts`, `src/lib/content/adapter.ts`,
`examples/showcase/src/routes/(site)/styleguide/+page.svelte`, `docs/editors/manage-the-media-library.md`,
`examples/showcase/e2e/media-pass-c.spec.ts`, `src/tests/unit/render-registry.test.ts`,
`templates/waymark` and `guidance-hashes.json` (emit), tests.

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
- #200: log a new event on the failed read; both rename refusals answer 503. T6 doesn't edit the log files, so
  the pair stays disjoint: it reports the event's name and fields, and after T5 merges the session adds it to
  `events.ts`, `events-list.ts`, `events.go`, and `log-events.md`. Drop the `:169` head reuse at `:316`: it would
  move the check before several GitHub reads to save one, and a stale null makes `createBranch` fail outside the
  `:326` catch. Leave the two-indexes half.
- #259: add `image/avif` to the web-native passthrough, with `decode-unsupported` catching a browser that
  can't, and update the docs lines. This is a method call.
- #262: keep the input as a pointer target with `tabindex="-1"` and `aria-hidden="true"`. `aria-selected` and
  Space carry the state. Update `media-pass-c.spec.ts:54-55`.
- #283: "block" in the four messages, `render-registry.test.ts:146`, the styleguide's lines 257-261, and the
  `MarkdownEditor.svelte` names.

**Acceptance:** a save with `new=1` over an existing entry keeps undeclared keys, failing first. A read that
throws on a `new=1` save answers 503 with the body kept. A failed read logs the event once the session adds it.
Rename answers 503. An AVIF sniff passes through the ingest, and an undecodable one reports
`decode-unsupported`. `getByRole('option')` reports selection while no checkbox role sits inside it. The four
messages say block. `tool` gate passes after the session's commit. **Test:** the named files.

### T7 and T8 (pair)

Both re-emit the template, so "A conflict in `templates/waymark/**`" applies.

#### T7. Scaffold (103)

Items: ergonomics 1, 7, `/styleguide`, the template-repo notice, #203, `--yes`. Quotes: state read 8, 9, 10,
11, and sweep Group J. Class: `ordinary`; `chapter3.mjs` is `auth-data`, so its commit takes
`standards:diff-reviewer` and a failing test first.
Files: `packages/create-cairn-site/scripts/bake-template.mjs`, `bake-template.test.mjs`, `bin.mjs` and test,
`src/cloudflare/chapter3.mjs`, `test/email-reoffer.test.mjs`, `README.md`, `template-repo/README.md`,
`examples/showcase/.cairn-template.json`, `src/theme/site.config.yaml`, `src/routes/(site)/+page.svelte`,
`src/chassis/README.md`, `prose.css`, `composition.css`, `markdown-blocks.ts`,
`scripts/lab/theme-fixture.mjs`, `theme-fixture-e2e/theme-fixture.spec.ts`, `.github/workflows/create-site.yml`,
`skills/cairn-styling-public-pages/references/checking-a-theme.md`, `directive-alert.md` and siblings,
`skills/cairn-extending-a-site/SKILL.md`, a new reference for the checklist,
`.claude/skills/cairn-releasing/SKILL.md`, `docs/admin/setup-recovery.md`, `own-your-domain.md`,
`templates/waymark` and `guidance-hashes.json` (emit).

Current source:

- `bake-template.mjs:149-154`: `const TEMPLATE_CLAUDE_MD = `, ending `never this file.`
- `(site)/+page.svelte:53-55`: "The cairn showcase. You write in markdown and publish a static page that reads the way a publication should."
- `site.config.yaml:7-8`: `- label: Styleguide` / `url: /styleguide`
- `theme-fixture.mjs:81`: `const PAGES = ['/', '/posts/the-reading-surface', '/styleguide'];`
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
  `create-site.yml`'s leftover list, and repoint `checking-a-theme.md:113` and the directive pages. Reword or
  mark the emitted mentions at `chassis/README.md:62,191,196,261`, `prose.css:149,681,683`, `composition.css:75`,
  and `markdown-blocks.ts:92,234`.
- The notice: `:14-15` becomes a statement with no promise, `:1` drops "pre-release", and the WATCH and
  `cairn-releasing:191-193` stop ordering a retirement at publish.
- #203: one closing-block line naming `https://github.com/settings/installations`. Leave `install.mjs` and
  `catalogue.mjs`, per Geoff's ruling.
- `--yes`: with `args.yes` and `hasOpenEmailDecline(record)` and no `args.connect`, chapter 3 skips Builds
  with no consent, logging the way `chapter2.mjs:436-441` does, and returns a new non-terminal outcome,
  `builds-skipped`, with no step, so `bin.mjs:250` prints nothing extra. `--connect` still connects. Write no
  `builds-connect-declined` for a skip nobody answered. The check sits inside `if (!alreadyAdmitted)`, so a run
  whose `buildsTokenSavedAt` survives from an earlier `--connect` still connects, and the docs say so.
  `README.md:269-271,307-311`, `setup-recovery.md:72`, and `own-your-domain.md:87` state it. "The manual path" is
  turning email on before Builds, because after Builds none exists: a terminal run, or `--email --yes`.

**Acceptance:** four cases in `test/email-reoffer.test.mjs`, the first failing first: `--yes` with an open
decline leaves Builds unconnected and the email offer open; with `--connect` it connects; with no decline it
connects; with `buildsTokenSavedAt` kept it connects. `npm run emit:template` deletes the three template
styleguide files and `check:template` passes. `create-site.yml` proves it on CI, and `design.yml` proves
`theme-fixture`'s template arm. A `bin` test asserts #203's closing line. A home render assertion reads
`description`. `git grep -n 'land once\|pre-release' -- packages/create-cairn-site/template-repo/README.md` prints
nothing. The bake test asserts the new block, with `# Your site` kept. Docs run the fact-checker. **Test:** `npm
test -w packages/create-cairn-site`, then CI on `create-site.yml` and `design.yml`.

#### T8. Showcase narration and the shared view (85)

Items: ergonomics 3, 11, 12, 20's worked case, #282. Quotes: state read 8, sweep Group I. Class: `ordinary`, with
`preview.ts` treated as sensitive (#272): `standards:diff-reviewer` reads the commit. If
`(site)/preview/[token]/+page.server.ts` must change, that commit is `auth-data`, and the type assertion below
is its failing test.
Files: `examples/showcase/src/theme/cairn.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`,
`scripts/build/emit-template.mjs` and test, `skills/cairn-extending-a-site/references/public-routes.md`,
`src/lib/sveltekit/preview.ts`, `src/theme/components/ArticleView.svelte`, `src/chassis/entry-data.ts`,
`src/tests/unit/env-genericity.test.ts`, `scripts/checks/api-surface.md`, `templates/waymark` and
`guidance-hashes.json` (emit).

Current source:

- `cairn.config.ts:99-100`: "A closed select exercising a brand-new v2 scalar arm end to end"
- `cairn.config.ts:152`: "finalize.mjs matches this line character for character (TEMPLATE_GITHUB_APP_LITERAL)"
- `vite.config.ts:53-55`: "The showcase consumes the engine through a file:../.. dist symlink."
- `package.json:14`: `"build": "vite build",`
- `emit-template.mjs:199`: `pkg.scripts = { ...pkg.scripts, 'cf-typegen': command };`
- `preview.ts:387-390`: `export async function loadPreview(`, returning `Promise<PreviewData>`
- `ArticleView.svelte:28`: ``* Untyped on purpose: `loadPreview` returns the default `EntryData`, so this template takes the``

Outcome:

- Ergonomics 3: rewrite surviving comments for a site reader. The `:154` literal stays byte-exact and
  `// prettier-ignore` stays adjacent. The dev-only `dedupe` and `fs.allow` lines take a
  `cairn-template:exclude` pair; if `create-site.yml` goes red on that, restore them and say so. Demo fields
  stay, as a light taste call, because the e2e suite reaches them.
- Ergonomics 11: `"build": "vite build --logLevel warn"`, plus a one-line success if the emitted build prints
  none. Leave the frozen transcripts.
- Ergonomics 12: set `precheck` at emit, beside `:199`, chained after the existing `npm run build:admin-css` so
  it isn't replaced, with the `cf-typegen` flags and `--check`. Wrangler's reference: "Compare the generated
  file's recorded environment/configuration hash and runtime header with the current Wrangler configuration",
  "This does not compare or validate the generated file body", and "Exits with code 0 if types are up-to-date,
  or code 1 if types are out-of-date." So a hand edit of the body stays uncaught, by design, and a setup rewrite
  of `wrangler.jsonc` may read as out of date. If that fails `npm run check`, set it aside as the sheet allows.
  `--env-file` isn't listed under `types`, so prove that the flag passes.
- Ergonomics 20's worked case: `public-routes.md` adds a second-concept feed mapped by hand, as its `:76-78`
  teaches. No `concept` option; the template pass chose to throw (#45).
- #282: `loadPreview<S extends SiteResolver>` with one boundary cast, then narrow both `ArticleView.svelte`
  sources and `chassis/entry-data.ts`.

**Acceptance:** `git grep -nE 'e2e pins|exercising' -- templates/waymark ':!templates/waymark/.claude'` prints
nothing. `git grep -n showcase` over the emitted `cairn.config.ts`, `vite.config.ts`, and `tsconfig.json` prints
only the config values (`showcase.test`, `owner: 'showcase'`). `create-site.yml` green. The emitted build prints
at warn with its one-line success. A setup-rewritten `wrangler.jsonc` doesn't fail `npm run check`, or ergonomics
12 is set aside. `public-routes.md` carries the case. A type assertion beside `env-genericity.test.ts:124`, failing
at base, shows `EntryData` narrows through `loadPreview`; `check` passes with `ArticleView` typed. **Test:** the
showcase `check`, `env-genericity.test.ts`.

### T9 and T10 (pair)

#### T9. Packaged guidance (108)

Items: #196, #70, ergonomics 8, 10, 14. Quotes: sweep Group K, state read 8. Class: `runner`.
Files: `claude/CLAUDE.md`, `claude/snippets/settings-hook.json`, `src/tests/unit/packaging-guidance.test.ts`,
`claude/agents/cairn-extension-reviewer.md`, `skills/cairn-extending-a-site/SKILL.md`,
`references/adopt-cairn.md`, `references/preflight.md`, `skills/cairn-building-admin-screens/SKILL.md`,
`references/custom-screen.md`, `skills/cairn-styling-public-pages/SKILL.md`,
`skills/cairn-consulting-the-engine/SKILL.md`, `templates/waymark` and `guidance-hashes.json` (emit).

Current source:

- `claude/CLAUDE.md:42`: `## The Stop hook`, to `:56`: `"command": "npm run check:cairn --if-present"`, and `claude/snippets/settings-hook.json:9`, the same
- `packaging-guidance.test.ts:114`: "settings-hook.json is byte-identical to the fragment's own hook block"
- Claude Code hooks reference: "The `stop_hook_active` field is `true` when Claude Code is already continuing as a result of a stop hook"; "A hook that blocks by exiting 2 routes the same way as `reason`: Claude receives the stderr message as the explanation for why it should continue."; "Exit code 1 without valid JSON output is a non-blocking error"
- `skills/cairn-extending-a-site/SKILL.md:21`: `dated ruling in cairn's rulings ledger.`
- `claude/agents/cairn-extension-reviewer.md:21-23`: `component is a finding unless a comment or commit message in the diff names the DaisyUI defect`
- `skills/cairn-extending-a-site/SKILL.md:39`: the row `| Mount the admin, gate a custom screen or action, roles and access map, refusal shape, audit table | `references/admin-access.md` |`
- `skills/cairn-building-admin-screens/SKILL.md:37`: `**Static, advisory tier:** `radius-scale` (promoted to error at 0.99.0), and three rules that`
- `claude/agents/cairn-extension-reviewer.md:4`: `tools: Read, Grep, Glob`
- `skills/cairn-building-admin-screens/references/custom-screen.md:59`: `  requireAccess(event);`

Outcome:

- #196, majors: one owner per job, with `admin-access.md` staying in `cairn-building-admin-screens`'
  router. Move the hook and DaisyUI text to `adopt-cairn.md`, repointing the `packaging-guidance.test.ts:114` pin
  at that text. Wrap the snippet's command to exit 2 with a `stop_hook_active` guard, sending findings to stderr
  and reading stdin with `node`, since a site may have no `jq`. Align `references/preflight.md:44`.
- #196, minors: third-person descriptions, the time-bound lines, the reviewer's way to receive a diff, H1s,
  "daisyUI" casing, and the ruling text in `:21`. The root `CLAUDE.md` minor is out: no task edits that file.
- #70: read each route, confirm the target, and reach or cut the rest. Check whether
  `cairn-styling-public-pages`' 30 unnamed references are routed by pattern.
- Ergonomics 8: the done-gate gains "if `cairn` is on `PATH`, run `cairn doctor`". The `check.yml` step needs
  a resolvable tag, so T9 reports it and the session files it with Placement after step 17.
- Ergonomics 10: a third done-gate step, per `create-site.yml:228-254`: `npm run dev`, `curl -sL` the new
  route, and check it didn't land on `/admin/login`.
- Ergonomics 14: `const editor = requireAccess(event);` and the owner-only control.

**Acceptance:** `check:public-skill`, `check:package` (which runs the skill budget), and `check:template` pass.
Piping a payload with `stop_hook_active: true` to the snippet's own command exits 0, and a finding exits 2 with
the finding on stderr. `git grep '"Stop"' -- claude/CLAUDE.md` prints nothing. A grep of each router shows each job
in one skill. The report lists #70's routes read and each reached or cut, and the 30 pattern-routed references'
answer. `git grep` finds the ergonomics 8, 10, and 14 lines. **Test:** `npm run check:public-skill` through the
lane, `packaging-guidance.test.ts`.

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
  tree, proved by a diff of both reports; otherwise set it aside. `check-admin-prose` stays through this PR,
  and T13's table carries its verdict.
- R8: one job in `e2e.yml`, with `--reporter=dot,html,json`, no blob upload, and no `e2e-report`. The remaining
  upload's `if: failure()` becomes "not cancelled", so a green run keeps its report for T11's retries. In
  `test.yml`, replace the eight single-node scripts with direct `node` calls after the one `npm run package`.
  Move `scaffold.yml`'s two dev-fold steps into `create-site.yml`, then delete it and update `ci-green.json`
  and the readers. The dev-fold steps run last, since the flagged rebuild leaves the tree flagged.
- #272: add `src/lib/sveltekit/{guard,preview}.ts` to the `auth-data` map.
- #286, #273: nine gotcha entries and the file's index. Skip the `emit-tool-conditions.mjs` trap, which `:318`
  has.

**Acceptance:** `gate-tier.test.ts` and `workflow-yaml.test.ts` pass. CI on the head shows `e2e` as one job
with no `e2e report`, `create-site` with both dev-fold steps, and no `scaffold` workflow. `git grep -n
'SHARD_TOTAL\|e2e report' -- .github scripts src .claude` prints nothing, and it fails on the unchanged tree. The
next `check:close` still reports the same labels. `npm ls tsx` at the root prints no direct dependency. Tell
`cairn-cms-9b` the job name changed, since a watcher may grep `e2e report`. **Test:** the named unit files, CI.

### T11 and T12 (pair), with T13 in the background

#### T11. Trace the first-click flake (69)

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
   and whether the dialog opened. Run it through this line, adding the spec's name:
   `cairn-run-gate "export E2E_PORT=4392 && ! ss -Htln 'sport = :4392' | grep -q . && ! ss -Htln 'sport = :4394' | grep -q . && npm --prefix examples/showcase run test:e2e -- --retries=0 e2e/<spec>"`.
   A listener on either port: another session's, wait and rerun; your own stale server, kill the PID you started.
3. Run the same on an idle CPU for the base rate, and note what else held the machine (T13's runs).

**Proven** means, on the probe step 1 settles: at least 5 throttled failures, every failure with the handler
absent at click, and no failure on the idle run. Anything else is not proven. This rule is set before the run.

Outcome, proven: one helper in `editor-helpers.ts` waits for the handler the read in step 1 names and then
clicks, used at the palette tests, `container-fields.spec.ts:174`, and `media-library.spec.ts:137`. It replaces no
assertion and adds no re-click. The scratch spec through the helper at 20x opens 50 of 50. If `openCreateDialog`'s
re-click is then unnecessary, leave it for #208's next read. The drop-once-recorded comment comes out, and #208
closes.

Outcome, not proven: the palette tests go through a helper in the `openCreateDialog` shape that logs
`[palette-trace]`, `container-fields.spec.ts:174` takes `openCreateDialog`, and #208 stays open and records what
the throttled run showed. Not a stop, per the sheet's retried-test answer.

**Acceptance:** #208 states the cause or the throttled result, with figures. The PR lists each head's retries,
and T18 reports the palette count over this PR's heads against 7 of 15; on the unproven arm that count is labeled
"masked by re-click". **Test:** the e2e line on `admin-visual.spec.ts --grep 'command palette'`,
`container-fields.spec.ts`, and `media-library.spec.ts`.

**Acceptance:** #208 states the cause or the throttled result, with figures. Once fixed, the PR lists each
head's retries, and T18 reports the palette count over this PR's heads. **Test:** the e2e line on
`admin-visual.spec.ts --grep 'command palette'` and `container-fields.spec.ts`.

#### T12. Eval cases and the sandbox (69)

Items: #188, #191. Quotes: sweep Group K. Class: `runner`. `.claude/rules/evals-docs-process.md` applies: the
PR carries the table.
Files: `.claude/skills/cairn-writing-docs/evals/evals.json`, `setups/`, `run.mjs`, `run.test.mjs`.

Current source:

- `run.mjs:45`: `'Bash(tail *)', 'Bash(head *)', 'Bash(echo *)', 'Bash(sed -n *)', 'Bash(wc *)', 'Bash...`
- `run.mjs:41`: `'Bash(git -C * diff *)', 'Bash(git -C * grep *)', 'Bash(git -C * show *)',`
- `run.mjs:56`: `export const DENIED_TOOLS = [`
- `run.mjs:67`: ``const NEEDED_COMMAND = /^\s*(npm run check|node scripts\/checks\/|cairn-run-gate )/;``
- `run.mjs:874`: `await exec('cp', ['-al', join(modulesDir, 'node_modules'), join(root, 'node_modules')]);`
- `judgeTrial` at `run.mjs:1020`
- `run.mjs:1304-1307`: on a usage limit, `resume after the reset with --resume ${runId}`, `process.exitCode` 4
- Claude Code permissions: "Rules are evaluated in order: deny, then ask, then allow."; "The `*` stands in for whatever text is in its place."; "Deny and ask rules apply when any subcommand matches them"; `acceptEdits` "Automatically accepts file edits and common filesystem commands"

Outcome:

- #188: one regression and one capability case against an editor page.
- #191: add these to `DENIED_TOOLS`: `Bash(sed *)`, with `Bash(sed -n *)` out of `ALLOWED_TOOLS`;
  `Bash(git diff *--output*)`, `Bash(git -C * diff *--output*)`; `Bash(git grep *-O*)`,
  `Bash(git grep *--open-files-in-pager*)`; `Bash(sort *-o*)`; `Bash(git difftool*)`, `Bash(git -C * difftool*)`.
  `sed` is denied whole because a glob can't tell a `w` command from a `w` in a path. A session keeps `Read`,
  `head`, and `tail`, and a denied filter isn't a fault under `NEEDED_COMMAND`. A denied compound is denied whole,
  and `deniedFaults` (`run.mjs:478-499`) counts a session that reissues the leading command as recovered. Fence
  the reply in the judge prompt. `cp -a` replaces `cp -al` at `:874`, since a `chmod` on a hard link changes the
  shared inode.
- Probe: one real `claude -p` session under these rules tries each form plus a plain `sort`, `git diff --stat`,
  and `git grep`, and `permission_denials` lists every denied form and no plain one. The plan's fold couldn't
  run this probe (the worktree guard refused it), so this is its first run. A pattern that fails its probe is
  fixed before the suite starts. `run.test.mjs` pins the list only.

Then start `node .claude/skills/cairn-writing-docs/evals/run.mjs main <branch>` as a background Bash task. It
adds no path. Measured: the last two 60-trial runs took a median of 18 and 19 seconds per near-miss trial, 2
minutes at worst, and an `E1`-shaped trial took a median of 220 seconds, so 72 sessions at four in flight is
about 20 minutes plus judging. An `Agent` call in a session stays in that session's process. Exit 4 is the usage
limit: rerun with `--resume <runId>` after the reset, and it's never a set-aside.

**The rule's reading,** a `## Decisions` line: this change has no target capability, because it changes cases
and a harness and nothing a docs session reads, and one `run.mjs` serves both arms. So "its target capability
case improves" can't be met and isn't the bar. The bar is: no regression drop, per the rule's rerun; the
capability case graded on the branch arm; and every failing trial's transcript read. Since both arms run under
the new harness, `main <branch>` can't measure #191, so it compares each regression case's pass rate against the
last recorded run, `20261101-191925-cb19`.

**Acceptance:** `run.test.mjs` pins the deny list, the probe's denials are recorded, and the judge prompt fences
a reply holding a fake instruction. The table meets the bar above. A real drop that survives the rerun, or a
broken run, sets #191, then #188, aside, reverting those commits, and that's read before T17. **Test:** `node
--test` on `run.test.mjs`.

#### T13. The measures (75, background)

Items: R6's table, the gates read. Quotes: state read 12, 13. Class: `ordinary`. No commit. One
`cairn-implementer` subagent, `isolation: "worktree"`, told to commit nothing and revert every injection, and to
return the two tables and no SHA or lane. Its first call is Bash; if it has no Bash, the session runs T13 as a
background Bash task. May not be set aside.

First, in the session's state dir, read the local close log state read 13 names, before a reboot loses it.

R6. In that worktree, after the setup command, `npm install --no-save --no-package-lock
@vitest/coverage-v8@4.1.11`, matching the lockfile's `vitest`, then `git status` to confirm a clean tree. Nine
`unit` runs through `cairn-run-gate`, baseline and one with each file excluded, each with its own output
directory outside the tree:

```
npx vitest run --project unit --coverage.enabled --coverage.provider=v8 \
  --coverage.include='src/lib/**' --coverage.reporter=json-summary --coverage.reportsDirectory=<out> \
  --reporter=json --outputFile=<times>.json [--exclude src/tests/unit/<file>]
```

Run one excluded file first and confirm the test count drops, since `--exclude` across a multi-project run is
unprobed. A clean timing run gives each file's seconds. The table: file, lines, seconds, branch delta, projects
run, and what else proves it (`check:surface` for the barrels; `retires-task2`'s `expect(true).toBe(true)` is
type-level, so coverage can't see it). Add a unique-branches column only if `json-summary` can name a branch. A
non-zero delta reruns with `component` and `integration` where they can run. Mutation data stays unmeasured, as
the sheet says.

Gates. For `check-custom-surface`, `check-cm-internals`, `check-idioms`, `check-rulings-format`,
`check-tool-heuristics`, `check-public-skill`, `check-audit-pack`, and `check-consumers`, plus `check-admin-prose`:
(a) can it fire: read its test for a red case against the real input path; `check-audit-pack` and
`check-consumers` have no test, so inject per state read 13 and revert, and a pass is a non-zero exit with a named
finding; (b) has it fired: the CI count over 120 `test.yml` failures, which is 0 of 8, the gate-log lines, and
`runs.jsonl`, noting that a lane's failure is not the gate's; (c) cost: seconds per close and lines of script and
test. Each row cites its source. The verdict is one of: "keep, has fired", which needs a cited run where the gate
named a real finding; "defect, can't fire", which needs an injection or test that exits clean on a real fault; or
"read at sitting", which is every other row, with the reason stated, a missing install or a test with no real-path
red case included.

**Acceptance:** both tables in the PR body under `## Measured for the release sitting`, 8 file rows and 9 gate
rows, each naming the head SHA, retirements in no commit, and `package.json` and `package-lock.json` unchanged on
the branch. The session files each defect row in `BACKLOG.md`.

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

**Acceptance:** `grep -n 'one release\|Release one\|xcathletes-org\|site migrations\|migrat\|sequence in .docs/STATUS.md'`
over `ROADMAP.md`, with each hit read against state read 6's keep list, prints nothing that survives as live
wording, and `:97-111` and `:172` are read. Every deleted bullet has a proof line. **Test:** `npm run
check:docs-gate`, `check:symbols`.

#### T15. Tool path, doctor check, and doc facts (58)

Items: `tool/v2` module path (S6), #270, #287, #288, the claims and the rubric sentence for #207. Quotes: sweep
Groups I and J, state read 8. Class: `ordinary` plus `runner` for `tool.yml`, which prints `ciWait`; the
`chapter2.mjs:950` string is `auth-data`, so that commit takes `standards:diff-reviewer` and a failing string
assertion on `/tool/v2/cmd/cairn`. Load `standards:go-conventions` for `tool/`. `tool/` commits run `make -C tool
check`, on `CAIRN_GATE_LANE=light`, which `cairn-run-gate` keeps for a browserless gate.
Files: `tool/go.mod`, every `tool/**/*.go` import (132 files), `tool/Makefile`, `.github/workflows/tool.yml`,
`tool/README.md`, `tool/scripts/install-check.sh`, `tool/CHANGELOG.md`, `tool/internal/doctor/check_roles.go` and
test, `packages/create-cairn-site/bin.mjs`, `src/scaffold.mjs`, `src/scaffold.test.mjs`,
`src/cloudflare/chapter2.mjs` and its test, `docs/admin/is-it-working.md`, `src/lib/sveltekit/admin-response.ts`,
`skills/cairn-extending-a-site/references/admin-access.md`, `docs/editors/write-in-the-editor.md`,
`docs/architecture.md`, `docs/internal/plans/2026-11-02-cleanup-claims.md`, `templates/waymark` and
`guidance-hashes.json` (emit).

Current source:

- `tool/go.mod:1`: `module github.com/glw907/cairn-cms/tool`
- `tool/Makefile:7`: `MODULE := github.com/glw907/cairn-cms/tool`; `.github/workflows/tool.yml:176`: `module="github.com/glw907/cairn-cms/tool"`
- `go doc cmd/link`: `-X importpath.name=value` "Set the value of the string variable in importpath named name to value. This is only effective if the variable is declared in the source code", so a stale path ships an unstamped binary with no error
- `bin.mjs:90`: ``'it with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from the ' +``
- `check_roles.go:61`: ``var wiringWordPattern = regexp.MustCompile(`\b(?:runtime|roles)\b`)``
- `admin-response.ts:40`: `headers.set('Strict-Transport-Security', 'max-age=63072000');`
- `preview.ts:441`: `const branch = pendingBranch(concept.id, row.entryId);`
- `docs/architecture.md:48`: "This section is where the security model is documented. The design assumes the likeliest attacker holds an editor's account, through a stolen or phished sign-in link."

Outcome:

- `tool/v2`: the module path becomes `github.com/glw907/cairn-cms/tool/v2`, every import follows, and the
  printed `go install` lines and `install-check.sh`'s `MODULE` name `.../tool/v2/cmd/cairn`. `tool/Makefile:7` and
  `tool.yml:176` follow, as do the non-import strings (`internalPackagePrefix`, the `const path` and `const
  cairn` strings). `tool/tools/go.mod` stays: it's its own module. `01-create-cairn-site.txt` stays for the
  recapture, listed. `tool/CHANGELOG.md`'s `## Unreleased` says so.
- #270: match `\bruntime\b`, update the comments, and flip `check_roles_test.go:68,190`.
- #287: state that the zone's setting overrides the admin's header, from the sweep's reads of `ecxc.ski`,
  `907.life`, and `cairn.pub`, with the limit that those run older engines. Update `admin-response.ts:27`'s
  comment and `admin-access.md`. The notes line goes to the PR body for T17.
- #288: one sentence in the Share preview row at `write-in-the-editor.md:250-252`. The link shows the entry's
  latest saved draft, later drafts included, until it expires or you revoke it.
- #207's claims: one short testable core claim for each of `brief-map.md`'s nine items, committed as
  `docs/internal/plans/2026-11-02-cleanup-claims.md` before any trial text is extracted. The commit is the proof of
  order, and T18's glob deletes the file. This task's brief quotes only state read `:264-267`, the item list, and
  `~/.local/state/cairn-agent-first/brief-map.md`, with no line from state read 7's "Grade blind needs", and the
  implementer opens no `next-pass-design.md`, `packet-pass-4-close.md`, ledger, PR #170, or trial answer.
- The rubric sentence: delete `docs/architecture.md:48`'s first sentence. The grade reads `04c6036ac`, so the
  deletion can't affect it.

**Acceptance:** `make -C tool check` passes, and `go list -m` in `tool/` prints the `/v2` path. `git grep -n
'cairn-cms/tool$\|cairn-cms/tool"'` prints only `tool/tools` and changelogs, and `git grep 'cairn-cms/tool/cmd'`
prints only the transcripts, the changelogs, and the historical notes. `make -C tool build` then `tool/cairn
--version` prints a stamped version. `check_roles_test.go`'s `createAuthGuard({ roles })` case reads as unwired. The
fact-checker passes on each docs edit, with the #287 limit stated. `git grep 'where the security model is
documented'` prints nothing. The claims file is committed. **Test:** `make -C tool check`, `npm test -w
packages/create-cairn-site`.

### T16. Regenerate baselines and read them, with the #207 grade beside it (34)

Files: baselines, by CI only. Class: `ordinary`. Merge `main` first. Dispatch `e2e.yml` with
`update_snapshots=true` on the branch, once. It covers the home change (ergonomics 7), `styleguide-*` (#283),
and anything #275 or #262 moved. Read the render of each changed image in the main loop. The bot's commit may
show a red or 0-job run on itself: what proves it is the next `e2e` run on the pushed head. Never commit a
local baseline. **Acceptance:** a green `e2e` here compares images to themselves, so the read is the proof. The PR
lists each changed image with its cause, and the set sits inside home, `styleguide-*`, and #275's and #262's
surfaces. An image outside that set is traced, not accepted.

**The #207 grade.** The session runs it, not an implementer, since `cairn-implementer` has no Agent tool. In CI's
wait, after the claims commit:

1. Extract each trial's final `result` text and its `tool_use` list from
   `~/.local/state/cairn-agent-first/e2e/out/evaluate/trial-{1,2,3}.jsonl`, under shuffled neutral labels. The
   session keeps the label map.
2. Extract the allowed pages with `git archive 04c6036ac` into an empty scratch directory outside the repo.
3. Dispatch one fresh Opus medium agent, with the claims, the labeled texts, and the tool lists inline, and that
   directory as the only place it reads. It returns met or unmet per item per trial, with the quote and the source
   page. Its brief quotes nothing from state read 7 or this plan, since `docs/internal/plans/` holds both.
4. Read the agent's tool calls afterward and record that none left that directory.
5. Over `tool_use` inputs only, since `CONTRIBUTING.md:204` names the tag and whole-transcript hits are false:
   confirm no fetch of a `pre-agent-first` URL, and report every read outside the allowed pages. Those are reported,
   not failing.

**Acceptance:** the PR's `## Decisions` carries the frozen claims and the 9-by-3 table, and states the bar: met means
all nine items on all three trials, each sourced to an allowed page that trial opened, with no such fetch. The first
run's unblind "nine of nine" is named as not evidence. An unmet grade is recorded, fixes nothing here, and goes on
the lists for the release sitting.

### T17. Reset the history files (77)

Items: R1, the full backlog sweep beside it, BACKLOG closures, STATUS. Quotes: state read 1. Class: `ordinary`
plus `runner`. Runs last, after a final `main` merge. May not be set aside.
Files: `CHANGELOG.md`, `MIGRATION-NOTES.md`, `scripts/checks/consumers-must-baseline.json`,
`check-symbols-allowlist.mjs`, `src/tests/unit/github-slug-contract.test.ts`, `CONTRIBUTING.md`,
`docs/admin/before-you-start.md`, `docs/admin/own-your-domain.md`, `docs/architecture.md`, `docs/why-cairn.md`,
`tool/docs/release-candidate-notes.md`, `tool/internal/health/check_engine_test.go`,
`.claude/skills/cairn-releasing/SKILL.md`, `claude/CLAUDE.md` if needed, `BACKLOG.md`, `docs/STATUS.md`,
`templates/waymark` and `guidance-hashes.json` (emit).

Current source:

- `check-version.mjs:161-165`: the top heading must equal `package.json`'s version
- `docs-links.mjs:171-178`, `unreleasedParityMismatch`: both or neither carry `## Unreleased`
- `github-slug-contract.test.ts:82-86`: requires `## 0.94.0` in `MIGRATION-NOTES.md`
- `check-consumers-must.mjs:22`: `export const LINE = /^(?:  )?Consumers must: ([^\t\n\f\r ].*)$/s;`
- `CONTRIBUTING.md:98-120`, which describes a `LEGACY_PATH_MAP` that no longer exists
- `check-symbols-allowlist.mjs:38`: `'env-var:CAIRN_AUDIT_COOKIES', // MIGRATION-NOTES.md history; the reader was removed in 1b; R1's reset drops this line`

Outcome:

- Before anything, read the eval table. #188 and #191 close, or set aside, only on it. If it isn't in, T18 takes
  those two closures. Record this head as the pre-reset SHA in STATUS.
- `CHANGELOG.md`: `## Unreleased` stays on line 1, consolidated into plain sections a rebuilder reads, naming
  every public break in a sentence, behavior breaks too, starting with the one sign-out and the new limiter, plus
  the PR body's collected lines. It carries one actionable line, at column 0, a paragraph of its own:
  ``Consumers must: rebuild the site from `create-cairn-site`; this release has no upgrade path from an earlier version.``
  No `release-size` marker, since pass 9 derives it. `## 0.98.0` stays as the top numbered heading. Its stub
  carries the full GitHub URL `blob/v0.98.0/CHANGELOG.md`, and the pre-reset SHA for the `## Unreleased` detail no
  tag holds. Everything below it goes.
- `MIGRATION-NOTES.md`: rewrite the intro and `:193-195`. `## Unreleased` and a `## 0.98.0` stub stay. The notes
  aren't in `v0.98.0` under that name, so the stub's URL is `blob/v0.98.0/docs/extend/migration-notes.md`, again with
  the pre-reset SHA. The four "When your range crosses" sections and the older per-version sections go. Keep the
  general procedure only if it still reads true. Check that `migrations/0000_auth.sql:29`'s and `store.ts:235`'s
  pointers hold, or repoint them.
- `node scripts/checks/check-consumers-must.mjs --update`, expecting `[]`. Repoint `github-slug-contract` to
  `## 0.98.0`, id `0980`. Prune the allowlist by running `check:symbols`.
- `check_engine_test.go` gains a case with the reset's shape: `## Unreleased`, a `## 0.98.0` stub, and a site on a
  skipped version, expecting OK.
- `CONTRIBUTING.md:98-120` takes the `isDatedRecord` rule. The docs lines stay true or are repointed, including
  `docs/architecture.md:44` and `docs/why-cairn.md:69`, which say each break sits in `Consumers must:` lines.
- `cairn-releasing` step 3 gains one line for this window only: the sweep's changelog input is
  `git show <pre-reset sha>:CHANGELOG.md`. The STATUS note tells pass 9 the same.
- Full sweep, as a read-only agent in the background, at this head: at most 40 items, oldest unswept first, per
  `standards:backlog-sweep`. It folds nothing. Write `~/.local/state/cairn-agent-first/<date>-backlog-triage.json`
  in the shape of `2026-11-01-backlog-triage.json` (`headline`, `lede`, `rows` of `action`, `why`, `proposed`,
  `detail`), and add #190, #284, and #247's two accepted residuals as drop rows. Land nothing from it: the release
  sitting does.
- Close each folded item in `## Done` with its commit. #196 leaves a one-line remainder for the root `CLAUDE.md`
  minor, with its Placement moved. Move the Placement of every other item left open from this round: #250, #190,
  #284, #246, #274, and each set-aside. Set `docs/STATUS.md`: `:22`'s stale state, the Evaluate line, and the three
  lists waiting for the sitting, with #207's grade.

**Acceptance:** `check:version`, `check:consumers-must`, `check:docs`, `check:leaks`, `check:symbols`,
`check:snippets`, `check:package`, `make -C tool check`, `github-slug-contract.test.ts`, and the new
`check_engine_test.go` case pass. `git ls-files tool/docs/design/render-reference` prints the one file. `git diff
--name-status origin/main...HEAD` shows no deleted `-snapshots/` path. Every `Consumers must:` in Unreleased but the
rebuild line is gone. `scripts/checks/api-surface.md` isn't in `v0.98.0`, so the break check's proxy is the backticked
names in `## Removed` and the `Consumers must:` lines at the pre-reset SHA: each one a rebuilder could write is grepped
in the new section, misses are listed as read, and `createNavRoutes` is the seeded name that must hit. No folded item
stays open, and the triage rows include #190, #284, and both residuals, or sit in the PR. **Test:** `npm run
check:close` through the lane.

### T18. Close (90)

Class: as above. Fetch `main`, merge it if it moved, follow the standing answer. Dispatch
`standards:diff-reviewer` at whole-branch scope, `standards:web-auth-security-reviewer`,
`standards:svelte-reviewer`, `standards:daisyui-a11y-reviewer`, and `standards:cloudflare-workers-reviewer`
for T5's D1 change. Load `standards:go-conventions` in the session for the `tool/` diff; it's a skill, not an
agent. Fold what they find. Dispatch `tool.yml` once for the release job's dry run (`:231-257`). Run
`docs-fact-checker` over the changed `docs/` lines, then `check:docs-gate` after the last docs edit. Run the live
admin smoke per `references/admin-smoke-test.md`, with `no-pending-request` as a note. Read the render in the main
loop. Take the eval closures if T17 couldn't. A late entry from a merge or a fold joins the reset's section as prose.
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

**Acceptance:** green CI on the head, every review folded with no open finding, the smoke passed, `grep -c 'Consumers
must:' CHANGELOG.md` prints 1, the plan files gone, and the PR reported to `cairn-cms-9b` as ready. No merge, no
bump, no publish.