# admin-rest plan: mechanics and feasibility review

**Target:** `277f6d8c8`, worktree `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/admin-rest`.

**Verdict:** not ready to launch. Two defects make a shipped feature wrong, and five more would redden an acceptance check or a lane as the plan is written. #237's mechanism itself is sound.

**Method:**
- Everything below comes from reading the source, except one headless Chromium probe (playwright's `chromium_headless_shell-1248`) for #237.
- No repo test ran, because there is no `node_modules`.
- Line citations in the plan not named below matched at or near the cited line.

## Blockers

### 1. T6: the migrations check fails every scaffolded site (`correctness`)
**Location:** plan:402-405; design:30.

**Defect:** "each `.sql` name in the package must be in the migrations directory" also covers `migrations/0002_audit.sql`.
- That file is opt-in and deliberately withheld from the template. `emit-template-tree.test.ts:163` says the numbering "has a deliberate gap at 0002".
- `templates/waymark/migrations` and `examples/showcase/migrations` both lack it.
- Its documented install path is `migrations/audit/` (`skills/cairn-extending-a-site/references/admin-access.md:149`), a different folder.
- `adopt-cairn.md:98` also calls `0001_roles` opt-in.

So `cairn doctor` would warn and exit 1 on a fresh site, telling the owner to copy a table they don't need. No test in the table catches this, because the fixtures invent their own file lists.

**Fold:**
- Name a required set, or exclude opt-in files with a one-line exclusion constant. Decide `0001_roles` explicitly.
- Add one test that lists the real `migrations/` names against `templates/waymark/migrations`.

### 2. T3, ergonomics 15: the text never fires under `npm run dev`, the audit's scenario (`correctness`)
**Location:** plan:266-270; design:29.

**Defect, two independent causes:**
- **The flag isn't on the Worker env.** `templates/waymark/scripts/dev.mjs:28` sets it in `process.env` only. `dev-gate.ts` says the flag "reaches only `process.env`" under `vite dev`. The engine reads the Worker env alone, and `devBackendHandle`'s `doubles` (`handle.ts:208-214`) don't add it. So `isDevBackendFlagSet(env[...])` is false.
- **`!isDeployedHost` is the wrong witness.** `handle.ts:155-157` says so: "PUBLIC_ORIGIN cannot witness here, since a scaffolded site's wrangler.jsonc names its deployed origin while `npm run dev` runs on localhost." A real site's origin forces the deployed verdict on localhost.

The planned test table passes with a stubbed env while the feature is dead. It would fire only under `wrangler dev --var`.

**Not the fix:** adding the flag to `doubles` looks simple, but `auth-channel/factory.ts:123` would then refuse a member sign-in on localhost for a site with a real origin.

**Fold:**
- The dev handle marks the request, for example a `locals` field set beside `cairnAccess`. It only ever runs behind the opt-in and already refused non-local hosts.
- The helper reads that marker, for `no_rule` only.
- This departs from the audit's "reuse that helper", so record it. Add `packages/cairn-cms-dev/src/handle.ts` and its test to T3.
- Prove it under the dev handle, not with a fake env. `handle.test.ts` is the place.

**Ruling:** the entry `dev-flag-strict-read` says "Reopens on: A scaffold path delivers the flag through a shell", and `dev.mjs` is such a path. The ruling governs truthiness, so the marker doesn't reverse it. The ledger still needs a line, and a reversal would be an owner call.

## Majors

### 3. T6: the clean fixtures break, and "exactly the one new line" is false (`correctness`)
**Location:** plan:410-413.

**Defect:** `cleanSiteFiles` (`report_test.go`) and `doctorCleanSiteFiles` (`tool/cmd/cairn/doctor_test.go:41`) carry the engine's `package.json` but no `migrations/`.
- The new check returns UNCHECKED, which folds to Unknown.
- The `a clean run exits 0` test then fails on both its exit code and its "no UNCHECKED" assertion.
- `all-clean.txt` stops being clean.
- Its totals line changes too (`9 passed` etc.), so one new line is impossible even with fixed fixtures.
- `-update` would cut the wrong golden without complaint.
- I did not read `corpus_test.go`, so check whether its corpus reacts the same way.

**Fold:** add `node_modules/@glw907/cairn-cms/migrations/*.sql` and a matching `migrations/` to both fixtures. Restate the acceptance as one new line plus the totals line. State that `all-clean` stays exit 0.

### 4. T6: a new check needs registrations the plan doesn't name (`correctness`)
**Location:** plan:381-383, 398-406.

**Missing:**
- `condition.go` needs the constant and the `conditions` slice. The plan says only "the constant".
- A `PassTitle` (`TestEveryCheckDeclaresAPassTitle`), and the check's own `ID`, which the plan never names.
- `tool/cmd/cairn/messages.go:315-318`: the `doctor --help` check list with severities, plus "eleven" at `:348`.
- `tool/testdata/copy.golden.md`, through `make copy-list`. The `-update` command doesn't cut it, and `TestRenderMatchesCommittedGolden` fails without it.
- `src/tests/unit/conditions.test.ts:105`: `toHaveLength(23)` becomes 24.
- `scripts/checks/tool-check-ids.mjs:12-13`: "eleven", and the list.
- `docs/admin/is-it-working.md`: a row in the "Find a check by its title" table, and the `:186` sentence ("Six conditions... No command checks the first five"), which goes false rather than staying true.
- "eleven" in the `doctor_test.go` comments.

**No registration needed:**
- `shipped-anchors.json`: the anchor `provision-the-auth-store` is already listed.
- `check_labels_test.go`'s fixed list is optional.

**`cairn-implementer` constraint:** it commits "only the files the task lists", so these omissions become BLOCKED reports.

**Class:** `scripts/checks/**` is a `runner` path (`cairn-running-passes/SKILL.md:31`), and hand-editing `tool-check-ids.mjs` isn't the sheet's api-surface exemption. Add a per-task class note to T6. The merge word already covers the PR.

**Minutes:** T6 is closer to 60 than 35. The pair's path stays 90.

### 5. T2: "stays on the failure arm" describes a type that doesn't exist (`correctness`)
**Location:** plan:197, 207-209.

**Defect:** `form` in `CairnAdmin.svelte:41-49` has one arm: `ContentFormFailure & {...}`.
- Making `error` required stops `{ sent }`, `{ ok: true }`, and a `RevertOutcome` from matching it. `{ outcome: 'ref-unknown' }` has no `error`.
- That breaks a site's `<CairnAdmin {form}>` under svelte-check, plus `CairnAdmin.test.ts:225`.
- Widening the prop to optional then breaks the six `{form}` forwards typed `ContentFormFailure | null`: ConceptList, EditPage, NavTree, CairnMediaLibrary, CairnTidySettings, VocabularyAdmin.
- "If the type needs it" understates this: it always needs it.

**Claims that hold:**
- Each redirect sets one parameter (`saved=1` may add `drafts`, which stays separate).
- Every `fail()` on `ContentFormFailure` that I read carries `error`.

**Fold:**
- Type `CairnAdmin`'s prop on `Partial<ContentFormFailure>`, and narrow at each view mount the way `:79` and `:104` already do.
- Rewrite the doc comments at `content-routes-shared.ts:31-37` ("every field optional") and `CairnAdmin.svelte:34-40`.
- Add `src/lib/reproductions/fixtures.ts` only if it holds an edit shape. `saved: false` at `:260` is the vocabulary's, so leave it.
- Raise the estimate to about 35. That makes the path 295, still under the ceiling.

### 6. T5: a string #193 names is missing (`correctness`)
**Location:** plan:337-342.

**Defect:** `EditPage.svelte:1844` reads `{...'page' : 'pages'} now link to it`. It is #193's own example and it isn't in the table. Its twin at `ConceptList.svelte:359` is listed only under "read each". The acceptance grep has no `page` term, so nothing catches it, and #193 may not be set aside.

**Fold:**
- Add `:1844` and promote `ConceptList:359` to a stated rule.
- Add `examples/showcase/e2e/media-figure.spec.ts`, which pins `Upload an image` at `:59` and isn't in the Files list.
- Add a grep for `pages? (now )?links?`.

### 7. Clock rule: no standing answer for its cheap case (`correctness`)
**Location:** executor prompt:18.

**Defect:** "Past twice the estimate, stop for `cairn-cms-9b`" stops on a count. The sheet's approved rule is "gets twice its estimate once if its cause is traced, and otherwise it is set aside if the pass allows". T1, T5, and T8 can't be set aside, so the unattended path needs an answer.

**Fold:**
- A traced cause extends the task once.
- An untraced cause sets the task aside if allowed.
- Stop only for an untraced cause on a may-not-set-aside task.

Line 19's and line 20's "a red stops the line" also needs the traced-cause answer written on line 20.

### 8. T3 and T5 omit `scripts/checks/api-surface.md` (`correctness`)
**Location:** plan:219-226, 325-333.

**Defect:** T3 adds to the public `CairnLogEvent`, and T5 changes `pendingEntries` on the public shell type. `check:surface` is selected through `exportSurface`, and the plan regenerates only after each pair merges. The implementer's own lane is therefore likely red, and its contract says report BLOCKED. Pair disjointness holds, since neither partner touches the file, so nothing stops listing it on those tasks.

**Fold:** add it to both tasks' Files, or tell each dispatch to run `npm run check:surface -- --update`.

### 9. T1's red commit contradicts `cairn-implementer` (`correctness`)
**Location:** plan:167-168; prompt:16-17; `.claude/agents/cairn-implementer.md`.

**Defect:** the agent says "report BLOCKED... instead of committing a red one", and it only runs a mandatory failing test on `auth-data` tasks. T1 asks for a tests-only commit.

Line 134's "this plan's path" also conflicts with "you do not read the plan file". That is harmless, because line 134's task text is quoted.

**Fold:** T1's brief states the exception in words: this one commit may be red, and it isn't reported BLOCKED.

### 10. Set-asides for pass 7 are partly mislabeled (`correctness`)
**Location:** plan:26, 513-514; design:32-43; prompt:24.

**Item 8 verdict:**
- **#180 claim 5:** honest. `ROADMAP.md:1871` names "the create dialog's typed title/slug/date".
- **#238 server focus:** honest ("no screen moving focus to the banner").
- **`aria-invalid` from the server:** weakly covered. ROADMAP doesn't name it. Acceptable beside the focus move.
- **Paste and trim:** not a dependency. The design itself says "the fix wants a design". T9's sentence calling the halves "real dependencies the map missed" overstates it.
- **Two invalid controls:** plan:26 sends it to pass 7, but the design note and prompt:24 omit it. It has nothing to do with the cluster. T1 also makes it easier to hit, since collapsed rows now validate, so a title plus a row can both be invalid and `onFormInvalid` opens the aside over the focused title at 320 and 390.

**Fold:**
- Record paste and trim under the sheet's "new product question... set it aside" row, not the dependency row.
- Fix the two-invalid case in T7, or set it aside the same way. If the fix is a one-branch change in `onFormInvalid`, take it.
- Keep plan, design, and prompt listing the same halves.

### 11. T2's acceptance grep can't pass (`correctness`)
**Location:** plan:212.

**Defect:** I ran the docs half. On the unchanged tree, `docs` already matches the plan and the executor prompt, both of which name these words, and they stay until T9. It can't print nothing at T2.

**Fold:** use `grep -rn 'publishedFlash\|discardedFlash' src skills docs --exclude-dir=plans`.

### 12. T9 runs the docs gate before the last docs edit (`correctness`)
**Location:** plan:495-497, 506-507.

**Defect:** `check:docs-gate` is step 2. Step 3 fixes docs, step 5's fix chain can edit docs, and step 8 writes `MIGRATION-NOTES.md`. `emit:template` and `check:surface` have the same ordering gap after the fix chain.

**Fold:** move all three to after step 9, and write each out again at that step.

## Minors

13. **`correctness`, plan:446.** `stringLengthError` returns a message only when a value violates the bound, so it can't produce a hint.
    - It takes a value and returns null when satisfied. "Using its wording" needs a new exported helper, and `field-rules.ts` isn't in T7's Files.
    - T7's cited `:227-228` are the number field's `min`/`max`. The length attributes are at `:212` and `:371`.
14. **`correctness`, plan:182, test 6.** The wrapper is classless, so `toBeHidden` passes with or without the admin sheet. The regression it claims to catch, `hidden` moving onto the `flex` body, fails only if the test loads the compiled sheet. Say to import `cairn-admin.css`, which the component project redirects to the compiled sheet.
15. **`correctness`, plan:184-185.** "An entry with rows opens clean" has no listed test. `--grep collapsed` needs that word in each new title, so state it, or the run selects nothing.
16. **`correctness`, plan:185.** "CI's e2e job is green" conflicts with prompt:20 "No task waits for CI". Move it to the close.
17. **`correctness`, plan:169.** Playwright sets `reuseExistingServer: !CI`, and this worktree's port is fixed at 4391.
    - A server left by another session or an earlier run passes silently against the wrong engine. This check reads state outside the worktree.
    - Name the rule: confirm the port is free before the proof, and rerun once after stopping a server the session owns.
18. **`correctness`, plan:363-364.** A manifest read failure now hides Publish all, though the branch list succeeded. Catch that read alone and fall back to ids. "One subrequest" holds.
19. **`correctness`, plan:371-373.** The grep will hit items no table row disposes of:
    - The sentence `Upload an image and it shows up here` (`CairnMediaLibrary.svelte:668`).
    - Two comments in `content-routes-shell.ts` that say `Publish site (N)`.
    - Also, the grep omits `Revert` and `Shown`. Add both, and rule on `:668`.
20. **`correctness`, plan:232-236.** #136 names `reason` but no values, and `log-events.md` needs them. Enumerate them. "Every 409" should exclude commit conflicts another chokepoint already logs, or the same event is logged twice.
21. **`correctness`, plan:402-404.** Three states carry no named report:
    - A `migrations_dir` that escapes the directory.
    - An absent or empty site folder.
    - A `wrangler.jsonc` parse error.

    The likely answers are unchecked, fail naming all, and unchecked. In the TOML parser, `migrations_dir` may precede `binding` in its block, so buffer it as `flushD1` does.
22. **`correctness`, plan:57, 465, 486.**
    - Only two PNGs change names (`trailhead-view`, `trail-map`), not five.
    - The T8 regex misses `trail-map`, `Trail Map`, and `trail conditions`. Add them.
    - The T8 grep is seen to print on the unchanged tree. T5's hits are confirmed by the grep above.
23. **`correctness`, plan:501.** The render read gives no command, port, or flags for starting the showcase. The T1 line gives the pattern. Write it out in full.
24. **`correctness`, prompt:11.** `2026-11-01-admin-rest-fold.md` doesn't exist at this commit. Commit it before launch, or the first read fails.
25. **`optional`, plan:12.** The sheet's Merge procedure says the executor merges `ordinary`, while the plan says the conductor does. That is stricter and fine, but `## Decisions` should say so.
26. **`optional`, plan:14-17.** The plan names no escalation. Add a line: a `BLOCKED` implementer on T1 or T5 may be re-dispatched once at `model: opus` without changing the outcome.
27. **`optional`, plan:246.** `target.concept` from a route param now reaches the `auth.access.refused` log unvalidated. It is harmless, but worth one line for the security read.
28. **`optional`, over-ceremony, plan:179-182.** T1's test 4 repeats what e2e tests 1 and 2 prove. Keep it only as the fast lane's proof, or drop it. The cost is small.

## OWNER FORK

**#193 titles, design:24.** A never-published entry keeps showing its raw address, and a new post is a common pending item, so the confirmation only partly meets "lists titles in place of raw addresses".

| Option | Cost |
|---|---|
| (a) Keep the fallback, listed in `## Decisions` | None. Recommended, as the design has it. |
| (b) Read each branch's file | One subrequest per entry on the stream |
| (c) Humanize the slug | Shows a guessed title, not a real one |

## Checked and sound

**#237:**
- The headless Chromium probe confirmed a bare `hidden` wrapper computes `display:none`, and the control stays in `FormData`.
- A `hidden` element carrying a `flex` class computes `flex`, so the plan's reasoning is right.
- `invalid` reaches both the form's and the `<li>`'s capture listeners.
- With no reveal: "An invalid form control... is not focusable", and focus goes nowhere. With the reveal, focus lands on the control.
- The form's handler fires first and does not interfere.

**Mounted bodies:**
- `dirty` changes only through `oninput` and `markFieldsDirty`.
- Neither `MediaHeroField` nor `ReferenceField` calls `ondirty` on mount.
- `grep` found no autosave.
- Each mounted hero reports needs-alt on mount, but `heroRows` filters to top-level image fields, so the notice is unchanged.
- `$props.id()` keeps ids stable across SSR.
- The hidden `<dialog>` is closed while its row is hidden.
- `ReferenceField` has no `$effect` or `onMount`.
- The seeded `hello` post now mounts a gallery field. `dialog[aria-labelledby^="cairn-hero-title"]` at `media-hero.spec.ts:70` runs on a fresh post, so it is unaffected.

**T1 test 1:** it fails on old code with count 0. `decodeRows` gets nothing, and the declared key is excluded from the undeclared merge.

**Pairs:** T3/T4, T5/T6, and T7/T8 stay disjoint, generated outputs included, with the Files fixes above.

**Other doctor facts:**
- `SkipTitle` isn't on `origin/main` yet.
- `readUnder` needs a `listUnder` twin as planned.
- `go test ./internal/doctor -run TestGolden -update` exists.
- `validator` is already in the sheet inventory.

**T5 minutes:** 90 is credible for the pair, given about 45 string rows plus the docs.
