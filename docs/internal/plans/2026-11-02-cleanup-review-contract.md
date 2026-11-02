# cleanup plan review: contract and criteria lens

Target: `2026-11-02-cleanup-plan.md` at `4e87a478d`. "Plan" line numbers are that file's. Findings run in
order of consequence. Each carries a severity and a tag (`correctness` or `optional`). Nothing was built or run
beyond `git grep`, file reads, and one count of `pre-agent-first` lines in the trials. No trial answer was read.

**Totals:** 1 blocker, 14 major (F1 included), 14 minor (F2 included), and 3 over-ceremony, also minor. Two findings
are owner forks. What held up is under "Checked and clean".

## Blockers

### 1. T15's #207 blind grade can be unblinded by its own steps, and step 2 can't run as dispatched

**Severity:** blocker. **Tag:** correctness. **Location:** `2026-11-02-cleanup-plan.md:794-801`, `:14`, `:214-215`, `:806`.

Four separate leaks or breaks:

- **The dispatcher has no dispatch tool.** T15 goes to `cairn-implementer` as a pair (`:214-215`). Its definition
  reads `tools: Read, Write, Edit, Bash, Grep, Glob, Skill` (`.claude/agents/cairn-implementer.md:4`), so it has no
  Agent tool and can't do step 2's "Dispatch one fresh Opus medium agent".
- **The claim writer gets the unblind result.** Plan `:14` says a dispatch quotes the task's section into its
  brief, and T15 names state read 7. That section holds "core claims are nine of nine, by the agent's own line"
  (`2026-11-02-cleanup-state-read.md:289`), and T15's own Acceptance repeats "nine of nine" (`:806`). Step 1
  forbids opening `next-pass-design.md`, then the brief hands over its verdict line.
- **The judge's blindness is only a prompt instruction.** "Only the claims" isn't enforced. A dispatched agent
  starts in the worktree, where `docs/internal/plans/` holds the plan and state read until T18 deletes them.
  State read need 2 reads "no state dir, no `next-pass-design.md`..." (`:286`).
- **The claims are never frozen.** State read need 1: "committed or held before grading" (`:285`). The plan orders
  the steps but leaves no artifact to show the order held.

**Fold:**

1. Move T15's #207 out of the pair and into the session, which runs steps 2 to 5. The implementer writes claims only.
2. Quote the claim writer only state read `:264-267`, the brief item list, and `brief-map.md`. Strike `:806`'s
   "nine of nine" into T18's PR text, which the session writes after the grade.
3. Commit the claims as `docs/internal/plans/2026-11-02-cleanup-claims.md`, before any trial text is extracted.
   T18's existing glob deletes it, and the commit is the proof of order.
4. Give the judge the claims and shuffled texts inline, and the pages as `git archive 04c6036ac` output in an empty
   scratch directory, read from nowhere else. After the run, the session lists the judge's tool calls and records
   that none left that directory. The session keeps the label map.

## Majors

### 2. #207's grade drops half the bar, and its `pre-agent-first` grep will false-positive

**Severity:** major. **Tag:** correctness. **Location:** `:797-799`, `:806`.

- **The grep hits already.** Step 3 greps whole transcripts. `grep -c pre-agent-first` prints 4, 2, and 2 lines for
  trials 1, 2, and 3. `CONTRIBUTING.md:204` names the tag ("dated planning record is at the `pre-agent-first`
  tag"), so a trial that reads an allowed page can match. The bar is narrower: "No transcript fetches a
  `pre-agent-first` URL" (state read `:265`). State read need 4 says "over the tool uses".
- **The reported half is missing.** The bar says "Other reads are reported, not failing". The steps don't report them.
- **The sourcing input changed.** State read need 2 gives the judge "the trial's tool output". The plan substitutes
  the allowed pages, so a judge can source a claim to a page that trial never opened.
- **"The grade's result is recorded" passes on any result.** It names no bar.

**Fold:** step 3 reads `tool_use` inputs only and lists every non-allowed read. The judge also gets each trial's
tool-call list. The acceptance states the bar: met means all nine items on all three trials, each sourced to an
allowed page the trial opened, with no such fetch. It records the frozen claims and the 9-by-3 table. F1 covers
what an unmet result does.

### F1. OWNER FORK: what an unmet #207 grade does to the release

**Severity:** major. **Tag:** correctness. **Location:** `:799`, `:806`.

The plan records the result and goes on. The original stop reads "After one structural fix, Evaluate reads unmet"
(state read `:266`), the sheet's owed text says only "record the result", and `docs/STATUS.md:26-28` holds Evaluate
"unmet until its re-cut". This is a priority call on a bar Geoff re-cut, so this review doesn't rule it.

- **Option A:** record it, go on, and list the unmet items in the release packet.
- **Option B:** one docs fix and a regrade inside this pass, which needs new trials because the transcripts are
  fixed at `04c6036ac`.
- **Option C:** hold the first candidate on it.

**Recommendation:** Option A. The sheet's event table prefers set-aside over stop, and new trials are out of scope.

### 3. T5's #271 line and its acceptance contradict each other

**Severity:** major. **Tag:** correctness. **Location:** `:392-393`, `:410`.

The Outcome keeps the next line: `return admitted === undefined ? true : admitted.includes(editor.role);`
(`src/lib/auth/access.ts:199`). With the plan's `Object.hasOwn` read, `constructor` is `undefined`, so `canReach`
returns `true` for an editor. Acceptance says it "fails closed". Today it does fail closed: "It fails closed with a
500" (`BACKLOG.md:82`). The fix as written moves a refusal to an admit, under an item titled "Refuse". A failing-first
test written to the acceptance can't pass on the plan's code.

**Fold:** pick one and state it. Recommended: keep the plan's line, because `access.ts:176` documents "the zero-config
any-editor floor an unmapped target admits", and rewrite the acceptance as "`constructor` and `__proto__` answer as
any unmapped target, with no `TypeError`, for owner, editor, and `none` capability". Name it for the security read
at T18. If that read prefers a refusal, the line becomes `Object.hasOwn(...) ? ... : false` for prototype names only.

### 4. T5's #247 misses session-id readers, and "every test reads the same" is false

**Severity:** major. **Tag:** correctness. **Location:** `:397-400`, `:411`, `:414`.

- **Logout isn't named.** The Outcome says "insert and lookup", but `deleteSession` (`store.ts:273-275`) keys on `id`.
- **Tests do change.** `src/tests/unit/cairn-admin-actions.test.ts:229` asserts `c.args[0] === 'sid'` on the delete,
  and `src/tests/integration/one-map-four-readers.test.ts:62` inserts directly.
- **The smoke has two more lines.** The plan names `admin-smoke-test.md:94`. `:74` inserts `'smoke-owner'` raw, so
  T18's smoke fails sign-in in a new way, which is a line stop. `:134`'s `DELETE ... WHERE id LIKE 'smoke%'` no longer
  matches a hash, so rows survive cleanup.
- **The re-login test has no refusal case.** "Re-login leaves one row" passes if `confirmAction` deletes the prior
  row before the `if (!email)` refusal at `auth-routes.ts:350`, which would let a bad token sign someone out.

`auth-store.test.ts:318-320` does catch a raw delete, so this is major and not a blocker.

**Fold:** name `deleteSession`, the four test and smoke lines, and add to the acceptance: logout removes the hashed
row, and a failed confirm with a session cookie leaves the row in place. Add `cairn-admin-actions.test.ts` to Test.

### 5. T5's #248 rests on an absent member, and half its Outcome is unchecked

**Severity:** major. **Tag:** correctness. **Location:** `:401-408`, `:412-413`.

- **`getClientAddress` isn't on `CairnEvent`.** `git grep getClientAddress -- src/lib` prints nothing, and the
  interface at `src/lib/sveltekit/types.ts:55-60` has `url`, `request`, `params`, `route`, `cookies`. "Confirm ... before
  using it" has no branch for this result. Adding a member widens a `@public` type.
- **A wiring test is missing.** `cairn-admin.ts:42` is `auth?: Pick<AuthRoutesConfig, 'send'>`. A test on
  `createAuthRoutes` directly passes while the mount drops the option.
- **"Bytes equal" can't hold as written.** A fresh request mints a random nonce, and the existing test compares
  cookie shape across jars (`auth-request.test.ts:159-183`).
- **Unchecked:** `failed`, the limited confirm redirect, `auth.rate_limited`'s fields, and `check:options`. "`check:rulings-format`
  passes" also passes with no new entry. S2 says "same shape" as `createSectionAction`'s `rateLimit`, which is
  an object with `resolve`, `key`, and `message` (`section-action.ts:64-75`), while `:401` is a bare function.
- **The rebind is unaddressed.** A limited editor gets `throttled` without `rebindToken`, the step `auth-routes.ts:207-214`
  says prevents a lockout. Neither the Outcome nor the acceptance says which is intended.

**Fold:** state the address source (recommended: an optional `getClientAddress?()` on `CairnEvent`, with a missing one
reading as `no-binding`, tier and `check:surface` noted). Extend `auth-request.test.ts:159`'s jar comparison, compare
serialized results, and add one case through `createCairnAdmin({ auth: { rateLimit } })`. Add `failed` open, limited
confirm, the event's fields, `check:options`, and the ruling slug by `git grep`. State the rebind reading.

### 6. T11's two outcomes can't be told apart, and its pass passes before the fix

**Severity:** major. **Tag:** correctness. **Location:** `:655-674`.

- **No decision rule.** Nothing says what "proven" means, while step 1 may change the probe itself. History already
  holds `handler=false opened=true` (`BACKLOG.md:137`) and "150 of 150 unloaded clicks opened it" (`:135`), so a mixed
  result is the likely one.
- **Acceptance passes on both arms.** "#208 states the cause or the throttled result, with figures."
- **The Test can't see the fix.** A bare local run has `retries: 0` but no throttle. CI has
  `retries: process.env.CI ? 2 : 0` (`playwright.config.ts:30`). The plan's baseline is 7 of 15 heads, so a clean
  run proves little.
- **The T18 count is misleading on the second arm.** That arm uses a re-click helper, and #208 itself says the helper
  "may have masked it". A zero then means masked, not fixed.
- **Other gaps.** `media-library.spec.ts:137` is in the proven Outcome but not the Test. The proven arm says it
  "adds no re-click" while routing `container-fields.spec.ts:174` through `openCreateDialog`, which re-clicks
  (`editor-helpers.ts:18-37`). Neither arm says whether #208 closes.

**Fold:** write the rule before the run. Proven means, on the probe step 1 settles, at least 5 throttled failures,
every failure with the handler absent at click, and no failure on the idle run. Anything else is not proven. The proven
arm reruns the scratch spec through the helper at 20x and must open 50 of 50, closes #208, and reports the count against
7 of 15. The unproven arm keeps #208 open and labels the count "masked by re-click". Add `media-library.spec.ts` to Test.

### 7. T12's bar can't be met, and the verdict arrives after T17 closes the items

**Severity:** major. **Tag:** correctness. **Location:** `:694-700`, `:818-821`, `:854`.

The rule's merge bar includes "its target capability case improves" (`.claude/rules/evals-docs-process.md:5`). The
runner reads cases from one `evals.json` for both arms (`run.mjs:1199-1208`), so a new case runs on both, and the
plan changes nothing a docs session reads: #188 adds cases and #191 hardens the harness. No improvement is expected,
which trips T12's "A refused or broken run sets #191, then #188, aside" reading or forces a fudge. Separately, T18
reads the table, after T17 has closed both items and reset the history, so a set-aside there undoes T17's edits.
The arms pin at start (`run.mjs:1219`), so a moving branch isn't a problem.

**Fold:** state that this change has no target capability. Its bar is no regression drop, the new cases graded on the
branch arm, and every failing transcript read, listed under `## Decisions` as the rule's reading. T17 closes #188
and #191 only once the table is in, or T18 takes those two closures.

### 8. T17 doesn't hold four of the sheet's five Stops, and one check is vacuous

**Severity:** major. **Tag:** correctness. **Location:** `:857-861`, with sheet lines 431-435.

| Sheet stop | T17 check | Verdict |
| --- | --- | --- |
| `cairn health` reads nothing owed | `check_engine_test.go` passes | Vacuous. Its strings are synthetic (state read `:54`), so the reset can't change it |
| `measurements.txt` stays | None, in any task | Gap |
| `check-version`, `check-leaks`, `check-package-files`, `check-snippets` follow | `check:version`, `check:leaks`, `check:package`, `check:snippets` | Holds. `check:package` runs `check-package-files.mjs` (`package.json:37`) |
| Baselines stay as chosen | None | Gap |
| Template notice reworded | None; T7 has none either | Gap |

**Fold:** add a `check_engine_test.go` case with the reset's shape (`## Unreleased`, a `## 0.98.0` stub, a site on a
skipped version) that expects OK. Add `git ls-files tool/docs/design/render-reference` printing the one file;
`git diff --name-status origin/main...HEAD` showing no deleted `-snapshots/` path; and `git grep -n 'land once\|pre-release'
-- packages/create-cairn-site/template-repo/README.md` printing nothing.

### 9. T18 runs after R1 and never rechecks the reset

**Severity:** major. **Tag:** correctness. **Location:** `:865`, `:870`, `:859-860`, `:400`.

The sheet says "R1 last, so the reset sees every entry". T18 merges `main`, folds review findings, and "Finalize[s] the
`## Unreleased` entries", all after T17. `check:consumers-must` tests grammar, not count, so a late entry passes.
T5 adds a `Consumers must:` line at `:400`, and T17 deletes every such line, so that sign-out notice is lost: the
rebuild line doesn't say it, and T17's acceptance only reads `api-surface.md`.

**Fold:** T18's acceptance adds `grep -c 'Consumers must:' CHANGELOG.md` printing 1. T5 replaces its line with a
prose sentence. T17's "every public break" names behavior breaks too, starting with the one sign-out and the new limiter.

### 10. T16's green can't fail

**Severity:** major. **Tag:** correctness. **Location:** `:811-816`.

An `e2e` run on a head whose baselines CI just regenerated compares images to themselves, so "no `toHaveScreenshot`
failure" holds for any unintended change. What proves the work is the read, and it has no criterion.

**Fold:** the acceptance lists each changed image with its cause and requires the set to sit inside the expected set
(home, `styleguide-*`, #275's and #262's surfaces). An image outside that set is traced, not accepted.

### 11. T13's verdict column can't be applied the same way by two readers

**Severity:** major. **Tag:** correctness. **Location:** `:719-726`, `:618-619`, `:145`.

- **"Has fired" is undefined.** CI gives 0 of 8. `runs.jsonl` "don't measure the named gate" (state read `:567`). The one
  log naming gates is "a missing showcase install, not a defect" (`:565`), and it names `check:consumers` and
  `check:public-skill`. By that log they fired, by the state read they didn't.
- **That log can vanish.** It lives under `/tmp`, "overwritten per key and gone on reboot", with "Read that log before
  it's lost". T13 doesn't order that.
- **"Can it fire" can pass on an environment failure.** State read's bar is "a non-zero exit and a named finding"
  (`:575`). T13 dropped it, and `check-audit-pack` "needs the registry", `check-consumers` the showcase install.
- **A test read proves the function, not the wiring.** Nothing says what a test with no real-path red case gets.
- **`check-admin-prose` is decided twice.** T10 says it "stays", and T13 gives it a verdict.
- **The plan contradicts itself.** `:145` says "T13 writes nothing outside the PR body", and `:726` files a BACKLOG item.
- **Acceptance doesn't count rows.** A short table passes.

**Fold:** define the column in T13. "keep, has fired" needs a cited run where the gate named a real finding. "defect,
can't fire" needs an injection or test that exits clean on a real fault. Everything else is "read at sitting", and a
row with no real-path evidence is that verdict with the reason stated. Each row cites its source. Injections need
non-zero and a named finding. Read the log first, in the state dir. T10 reads "stays through this PR, verdict in T13".
The session files defect rows, and `:145` says so. Acceptance: 8 file rows, 9 gate rows, the head SHA.

### 12. T13's R6 command dropped the flags that keep nine runs apart

**Severity:** major. **Tag:** correctness. **Location:** `:709-715`.

State read `:522-524` carries `--coverage.reportsDirectory=<out>`, `--outputFile=<times>.json`, and `--exclude`. The
plan's line has none of the three. Vitest's defaults are `clean: true` and `reportsDirectory: "./coverage"`
(`p2-p4-run/node_modules/vitest/dist/chunks/defaults.9aQKnqFk.js:18-20`), so each run clears the last, and the baseline is
gone when the deltas are computed. "Branch delta" and "unique branches" may also be one number: confirm `json-summary`
can name a branch before promising the second column. "Where they can run" leaves a non-zero delta unreadable when
`integration` doesn't run (state read `:534` is "unverified here").

**Fold:** quote state read's command whole, with one output directory per run. Add a "projects run" column.

### 13. T8's acceptance can't pass, and its uncaught branch can't fail

**Severity:** major. **Tag:** correctness. **Location:** `:544-547`, `:537-538`, `:510-511`.

- **The grep is out of reach.** `git grep -c -E 'e2e pins|showcase|exercising' -- templates/waymark ':!templates/waymark/.claude'`
  hits 16 files today, including `wrangler.jsonc` (3), `index.json` (5), content pages, and `robots.txt/server.test.ts`. T8
  edits three sources and T7 one. A bare `grep -c` also prints per-file counts, not one 0.
- **"Either fails `npm run check` or is listed as uncaught" passes on both results.** The Outcome's real proof, that a
  setup-rewritten `wrangler.jsonc` doesn't fail `check`, isn't in the acceptance.
- **`loadPreview`'s check can pass on `any`.** "`check` passes with `ArticleView` typed" has no assertion that `EntryData`
  narrows. The conditional `[token]` commit names no failing test or fixture, and a type change has no runtime red.
- **Unchecked:** ergonomics 11, a missing concept still throwing, the `public-routes.md` case.

**Fold:** scope the grep to emitted comments in the named files, or to `e2e pins|exercising` over the tree with
`showcase` over those files. Replace the either-or with the rewrite test. Add a type assertion beside
`src/tests/unit/env-genericity.test.ts:124` that fails at base, used as the failing test if `[token]` changes.

### 14. T7's `--yes` test has no guard against skipping too much

**Severity:** major. **Tag:** correctness. **Location:** `:496-500`, `:502-505`.

The `chapter3.mjs` failing test is named, and it fails for the right reason (`consented = true`, `chapter3.mjs:940-942`).
But an implementation that skips on every `--yes` passes. The Outcome also promises "`--connect` still connects" with
no check. It names no return for the skip: the branch at `:948-954` writes `builds-connect-declined`, which the Outcome
forbids, and the caller needs an `outcome`. The rest of T7's Outcome has no check: ergonomics 7, the nav strip,
`theme-fixture`'s template arm, #203, the notice, and the `checking-a-theme.md` repoint. The `theme-fixture` break shows
on `design.yml` (state read `:424`), which T7's Test doesn't name.

**Fold:** three cases in `test/email-reoffer.test.mjs`: open decline with `--yes` skips, the same with `--connect`
connects, no decline with `--yes` connects. Name the new outcome. Add `design.yml` to Test, the closing line to the
`bin` test, and a home render assertion on `description`.

## Minors

### 15. T4's and T10's greps fail on their own plan

**Severity:** minor. **Tag:** correctness. **Location:** `:361-362`, `:629-630`.

T4 says each removed name has no hit in `docs/`. Today `docs/internal/engine-rulings.md` and two plan files hit, and T4
adds to the ledger itself. T10's `git grep 'SHARD_TOTAL\|e2e report'` over the repo hits this plan and state read until
T18 deletes them.

**Fold:** T4 scopes to `docs/admin docs/editors docs/architecture.md docs/why-cairn.md`. T10 adds `-- ':!docs/internal/plans'`.

### 16. T4's checks pass with the work undone

**Severity:** minor. **Tag:** correctness. **Location:** `:360-361`, `:171`.

`check:surface` passes after any `--update`, `check:rulings-format` passes with no application recorded, and `check:self-use`
isn't shown to fail on #198's row. T9's `check:public-skill`, `check:skill-budget`, and `check:template` pass today.

**Fold:** add "the five names are gone from `api-surface.md`" and the ledger entry's new line by `git grep`.

### 17. T2's #261 passes if the dev path always holds the write

**Severity:** minor. **Tag:** correctness. **Location:** `:291-293`.

The fixture proves the held write only. Also uncovered: the report line, `cairn-manifest` unchanged, #232, `min > max`,
a date bound, and #240's second rewriter (`media-rewrite.ts:321` and `:572`) with the BOM restored.

**Fold:** add an invalid entry with no `publishedAt`, which must still write, plus one case each.

### 18. T1's cases cover part of the Outcome, and "both notices" reads backward

**Severity:** minor. **Tag:** correctness. **Location:** `:249-260`.

#263 promises one visible notice and a combined polite message, and "both notices at once" could be read as two
visible ones. #289 has four names and one case. #268's `onpageshow` reset and #275's second list have none.

**Fold:** "one visible notice, `politeMessage` carries both". Add one case each. Name `EditPage.test.ts` and `ComponentForm.test.ts`.

### 19. T3 places #260 in a test file that can't hold it

**Severity:** minor. **Tag:** correctness. **Location:** `:322-324`.

"Each is a `gate-tier.test.ts` case" can't cover a global setup, and `--range` has no value. "Warns and never throws" has
no case for a missing `dist`.

**Fold:** give #260 its own small test with a missing `dist`, and write out the range.

### 20. T6 has no check for #283 or #259's fallback

**Severity:** minor. **Tag:** correctness. **Location:** `:448-450`.

#283 has no acceptance line, and `render-registry.test.ts:146` isn't in Files. The rename refusals are checked, but `decode-unsupported`
on an undecodable AVIF isn't.

**Fold:** add `render-registry.test.ts` and "the four messages say block", plus one undecodable case.

### 21. T9's hook lives in a file T9 doesn't list

**Severity:** minor. **Tag:** correctness. **Location:** `:554-557`, `:572-573`, `:584-586`.

The snippet is `claude/snippets/settings-hook.json:9` as well as `claude/CLAUDE.md:56`, and it isn't in Files. The hook test
names no fixture for an inline command. #70, ergonomics 8, 10, and 14, and the move out of `claude/CLAUDE.md` have no check.

**Fold:** add the file, run the snippet's own command in the test, and add `git grep '"Stop"' -- claude/CLAUDE.md` printing nothing.

### 22. T17 would close #196 with a named minor undone

**Severity:** minor. **Tag:** correctness. **Location:** `:575`, `:854`.

T9 rules out the root `CLAUDE.md` minor, and #196 names it (`BACKLOG.md:229`). "Close each folded item" closes it anyway.

**Fold:** T17 leaves a one-line reworded remainder, with its Placement moved.

### 23. Three T17 promises have no acceptance, and one promise has no owner

**Severity:** minor. **Tag:** correctness. **Location:** `:849-855`, `:791`, `:861`.

BACKLOG closures and STATUS have no check. "The triage file exists" passes on an empty file. "Every open item ... at most
40" conflicts with itself; the sheet says "at most 40 items, oldest unswept first". `:791` says "T17 carries the notes line"
for #287, and T17's Outcome doesn't mention it.

**Fold:** check that the rows include #190, #284, and both residuals, and that no folded item stays open. Add #287's line.

### 24. T17's name check is a judgment, and 400 lines has no source

**Severity:** minor. **Tag:** correctness. **Location:** `:859-861`.

"Could write" has no procedure, and #249, which would catch it, moved after the release. "Under 400" appears in no source
and may fight "naming every public break".

**Fold:** print removed names from `git diff v0.98.0 -- scripts/checks/api-surface.md`, grep each in Unreleased, and list
misses as read. Drop the line count.

### 25. T14's grep misses the wording it promises

**Severity:** minor. **Tag:** correctness. **Location:** `:758-760`.

`site migrations` doesn't match `:166`, `:188`, or `:189`'s "one migration per site", "migrates", and "their migrations"
(state read `:224-226`), nor `:190`'s STATUS pointer. "Live wording" is a reading, and `:97-111` and `:172` are unchecked.
"If the docs arms read it" leaves the Test open.

**Fold:** grep `migrat` and read each hit against state read's keep list, and add `sequence in .docs/STATUS.md`.

### 26. T15's auth-data string has no test mandate

**Severity:** minor. **Tag:** correctness. **Location:** `:765`, `:800`.

`chapter2.mjs:950` is `auth-data`, and `cairn-implementer.md:38` says such a task "writes the failing test first". T15 names
only the reviewer. Plan `:5` also omits T8's conditional `auth-data` commit. Nothing checks that the rubric sentence left.

**Fold:** name a string assertion, or record a text-only exemption. Add T8 to `:5`, and `git grep 'where the security model is documented'` printing nothing.

### 27. T5's "failing test first on each" can't apply to a removal

**Severity:** minor. **Tag:** correctness. **Location:** `:369`, `:394-396`.

#243 deletes code, so no test fails first, and it has no acceptance line.

**Fold:** state that #243's proof is `git grep` on the three names printing nothing and the fake's tests passing.

### F2. OWNER FORK: T8 restores an option the approved design dropped

**Severity:** minor. **Tag:** optional. **Location:** `:539-540`, `design.md:268`.

`design.md` reads "Ergonomics 20, the concept-id option: the template pass chose to throw (#45). The worked case
remains." T8 adds `concept = 'posts'`, and no Stop or Decision names the reversal. The state read justifies it (`:402`).

- **Option A:** worked case only, mapping a second concept by hand as `public-routes.md:76-78` teaches.
- **Option B:** keep the option and list the reversal in Stops.

**Recommendation:** Option A, which needs no change to a template file.

## Over-ceremony

### 28. T10's audit-wrapper fold costs more than it returns

**Severity:** minor. **Tag:** optional. **Location:** `:617-618`.

It takes 25 extra minutes plus a two-report diff, and "A folded script saves about 40 lines" with a changed scan
scope (state read `:145`, `:153`). The set-aside order already lists it fourth.

**Fold:** cut it now and file it. Saves 25 minutes.

### 29. T5 reads each commit, then T18 reads them all again

**Severity:** minor. **Tag:** optional. **Location:** `:370`, `:866`.

Four `standards:diff-reviewer` dispatches sit before T18's whole-branch and security reads. I found no rule requiring the
per-commit form in `cairn-running-passes/SKILL.md`, but I didn't read `pass-core`.

**Fold:** if `pass-core` doesn't require it, one task-scope read over T5's range. Saves three agent dispatches.

### 30. T18 "dispatches" a skill

**Severity:** minor. **Tag:** optional. **Location:** `:868`.

`standards:go-conventions` is a skill, per `cairn-running-passes/SKILL.md:38`, and no agent carries that name.

**Fold:** "load `standards:go-conventions`". No clock cost beyond a failed dispatch.

## Checked and clean

- **Failing-first on T7's `chapter3.mjs`:** stated at `:460` and `:502-503`, with a fixture and a true reason (see 14 for its limits).
- **T8 ordering:** T8 runs before T10's #272 (`preview.ts` joins the map), which the sweep requires. `**/preview/\[token\]/**` is on the map.
- **Item coverage:** all 43 folds sit in a task, the list counts to 43, and #166, #75, #55, #85, #90, #92, #93, and #94 are `[x]` in `BACKLOG.md`.
- **Gate names:** every `check:*` the acceptances name exists in `package.json`, except `check:skill-budget`, which my grep didn't
  match. `check:package` runs `check-skill-budget.mjs`, so T9 should run that or `check:package`.
- **Eval arms:** they pin by SHA at start (`run.mjs:1219`), so running beside T13 to T17 is safe.
