# Theme identity pass A: plan review fold

Target: `docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md` at `c260832f`, folded in
place. Inputs: the three lens reviews
(`2026-09-26-theme-identity-pass-a-review-{contract,mechanics,risk}.md`), the arc log's last
entries, and four settled decisions handed to the fold (sequencing reversed, `:checked` as the
fifth selected form, `0.98.0` as the next release, sweep-removed classes to the safelist).

Every finding was checked against the tree, the runner, or `node_modules` before it was folded.
Spot checks run for this fold:
- `gate-tier.mjs` on `main` builds the engine string as `DOCS_GATE && npm run check && npm test`.
- `pass-execute.js:286-288` returns `t.gate || a.gate` for a pinned task.
- `IMPL_SCHEMA` has a required `summary` field (`pass-execute.js:107-109`). Task-check lines still
  go in `gateOutput`, beside the tier gate's evidence. (Corrected in the second fold. This line
  first said the schema had no summary field.)
- `norms.ts:555-561` holds the manifest against `RATIFIED_NORMS`.
- daisyUI 5.7.44 `button.css` carries `.btn:where(:checked:not(.filter [type=radio].btn))`, which
  sets `--btn-color` primary and `--btn-fg` primary-content.
- The showcase's `playwright.config.ts:29-32` reuses a server on 4173.
- `test.yml` and `design.yml` have no `workflow_dispatch`.
- `shadow-lg`, `rounded-none`, and `border-error` are absent from the current `dist` sheet.
- The inventory test's issue-#12 contract is at `admin-sheet-inventory.test.ts:7-15`.
- `PreviewBanner.svelte:95` reads `var(--cairn-preview-radius, 0.5rem)`.
- `CustomScreen.svelte` exists outside the swept trees.
- The two plain-button `font-semibold` sites are `IconPicker.svelte:72,84`.
- `draft-docs-0`'s head is `d0639043`.

ID prefixes: `C-` contract, `X-` mechanics, `R-` risk.

## Dispositions

Counts: 55 finding IDs across the three reviews, folded into 45 dispositions. 45 folded, 0
refused, 0 owner forks. Three reviewer-raised forks (X-M1, R-M3, R-m6) were settled by the owner
before the fold and are folded as decisions 9, 10, and 11.

### Blockers

| IDs | Disposition |
| --- | --- |
| C-B2, X-B1, R-B1 | **Folded.** The runner's `gate` arg is the exact engine string. The plan states it under Gates, task 0 item 6 confirms it, and Execution mode says why a different string draws a MISMATCH on every pinned task. Task 14 stays computed. |
| C-B1, X-B2 | **Folded.** `RATIFIED_NORMS` leaves task 4 and moves to task 13, in the same commit as the regenerated manifest. Task 4 now asserts `norms.test.ts` still passes. Task 13 asserts `norms.test.ts` passes on the new manifest and that no radius row carries `ratified-drift`. |

### Majors

| IDs | Disposition |
| --- | --- |
| C-M1, R-m1 | **Folded.** A Global constraint requires every idiom test to cover rest, hover, focus-visible, and active in both themes, plus disabled where not excluded, and to prove stock where the rule defers. Tasks 2, 5, 6, 7, and 11 say "all four states". |
| C-M2 | **Folded** into task 2's `styleOf` interface: named mechanisms per state (`userEvent.hover`, keyboard focus, CDP `mousePressed` through `cdp()`), an `el.matches(...)` assertion before each read, and a probe self-test reading daisyUI's `:active` translate. |
| C-M3, X-M4 | **Folded** into task 3. Two expectation files, bare and hostile, are generated before the edit, and each run compares with its twin. The wrapper is a `div` and the child a `span`. The mutation is adjusted: C-M3 proposed moving `font-family` into the plugin block, but the completeness test forbids a non-theme key there, so that mutation would fail the wrong test. The mutation used instead moves `color-scheme` into the block alone, which the hostile `div` rule then beats. |
| C-M4, R-M1 | **Folded.** Task 2 gives the component project a pre-run build of the admin sheet and a staleness guard test (decision 6). A Global constraint says no test result, a mutation included, counts without a fresh sheet. Task 2 is chosen over task 3 because task 2's tests are the first to need it. |
| C-M5, X-M3, R-M4 | **Folded** as a Global constraint. Every served preview uses 4391 through `BASE_URL`, has its listener's cwd checked, and is stopped. Every heavy showcase e2e first proves 4173 is free and quotes it. Task 13 gains an explicit order of steps. Tasks 0, S1, and S3 follow the port rule. |
| C-M6 | **Folded.** Task 13 carries a pair table in which every row names a foreground, a background, a compositing ground, and a floor. Task 6 reads its hairline rows from it. Task 12 puts the joins on a `base-100` card. |
| C-M7 | **Folded** into task 12 and Review focus 2. The host sheets are injected before and after the admin sheet. The host CSS source is named as the stylesheets `/` links. The outline cases are asserted per order, and a host-after loss to `site-theme` is a finding, not a patch. |
| C-M8 | **Folded.** `_idiom-probe.ts` gains `resolveColor`, a Global constraint makes it the one color oracle, and task 8's stock oracle is daisyUI's own formula resolved through it. |
| C-M9, X-m4 | **Folded.** `componentsLayerCap` drops from 19 to 16, with the reason: the dead lift is two selectors plus the modal repair. |
| X-M1 | **Folded** as decision 10 (settled by the owner; this was the reviewer's fork). Sweep-removed classes join the compatibility safelist. Tasks 7, 9, and 10 regenerate additions and assert the inventory green. The close's CHANGELOG notes the safelist growth. |
| X-M2 | **Folded.** A Global constraint requires every "loses to a utility" case to use a compiled utility, or to supply it through `hostCss` in `@layer utilities`. Tasks 2, 5, and 7 name the `hostCss` route for `shadow-lg`, `rounded-none`, and `border-error`. |
| X-M5 | **Folded** into S4. The worktree runs `git pull --ff-only` after the regen. The conductor's ledger commit and push starts `pull_request` CI, since `test` and `design` cannot be dispatched. Acceptance reads only the runs for that SHA. |
| R-M2 | **Folded.** Task 7 says the knob and the ring share `currentColor` and asserts the switch's focus-ring color in all three checked forms. Task 13's pair table measures both switches' rings at 3:1. Review focus 5 names the switch. |
| R-M3 | **Folded** as decision 9 (settled by the owner as the fifth selected form; the reviewer had recommended exclusion). The selected rule, rule 11, and the hairline exclusion key on all five forms. On a plain checked segment the rule neutralizes daisyUI's primary-content ink, which was the readability defect R-M3 found. Tasks 5, 6, 12, and 13 test a radio join. |
| R-M5 | **Folded.** S1 adds every other `admin-visual` page, the login page, `HelpHome`, and the media sheet at 390, at 1440 and 390. S4 adds one `visual-verifier` read of the rewritten PNGs outside S1's set. |
| R-M6 | **Folded** into task 10. `PreviewBanner` keeps `--cairn-preview-radius` outermost with the ladder as fallback. The post-condition grep accepts that chain, and a component test proves the override. |
| R-M7, C-m7 | **Folded** into task 10. The re-key keys on the resolved `--radius-selector` and excludes interactive elements. Negative fixtures cover a `btn-sm`, a `kbd`, a non-chip at selector radius, and a theme whose selector radius equals its field radius. |
| R-M8 | **Folded.** The ceiling is re-derived (below). If the flag trips in segment E, its question rides S3's sitting. |
| R-M9 | **Folded** with settled decision 1. Task 0 verifies the draft docs pause instead of waiting for a merge. The close's merge step re-runs the widened executor check, merges `origin/main`, and re-runs the doc gates on the merged head. |
| R-M10 | **Folded.** `site-visual` joins the expected-red set only from task 11's push. The CI probe reports whether each visual-spec failure is a `toHaveScreenshot` mismatch; any other failure type is red. |

### Minors

| IDs | Disposition |
| --- | --- |
| C-m1 | **Folded.** Task 4's Files list `cairn-idiom-surface.test.ts`. |
| C-m2 | **Folded.** `listDaisyuiClasses` takes a `root`. The empty-root case throws, and "no calendar class" is the difference between the lists with and without `exclude`. |
| C-m3 | **Folded.** Decision 3 and task 2 spell the dark lift literal. |
| C-m4 | **Folded.** The equivalence test carries an update mode, named in its header; task 4 uses it and diffs the result. |
| C-m5 | **Folded.** Task 9 ties its counts to task 0's recount and names `IconPicker.svelte:72,84`. |
| C-m6 | **Folded** with a correction. The reviewer's pattern `border-radius:\s*(?!...)` lets `\s*` backtrack past the lookahead and matches every `var(--radius-*)` line. The plan's pattern holds the whitespace inside the lookahead. It prints 7 lines at plan time (HelpHome 6, Tooltip 1), which task 10 drives to 0. |
| C-m8 | **Folded.** Task 10 sweeps `CustomScreen.svelte`, the reproduction a developer copies. |
| C-m9 | **Folded.** Task 13 names the rendered page list in `rendered.pages` and states the `Pagination` fixture condition. |
| X-m1 | **Folded.** Each task's criteria carry its task-check strings and the blocking rule. The `gate exit:` lines go in `gateOutput`. |
| X-m2 | **Folded.** The conductor dispatches `code-simplifier` at each boundary A to D, with one gate and one commit. It is budgeted. |
| X-m3 | **Folded.** Task 0's baseline runs the engine string. A stall that a serialized rerun does not clear stops the pass. |
| X-m5 | **Folded.** Task 0 uses `npm ci --prefix examples/showcase`, and a Global constraint packages before every showcase build outside `test:e2e`. |
| X-m6 | **Folded.** Task 15 reruns norms and the affected pair-table rows when a value moves. |
| X-m7 | **Folded.** The showcase set runs in tasks 11, 12, 13, and 15, and the comments check in tasks 3, 9, 10, 12, and 13. |
| X-m8 | **Folded.** Task 2 asserts `--btn-shadow`, not the whole `box-shadow`. |
| X-m9 | **Folded.** Task 13's Files list `norms-bands.browser.test.ts`. |
| X-m10 | **Folded.** Task 3 forbids loading the raw partial beside the compiled sheet, and its guard asserts an idiom rule wins in a mounted document. |
| R-m2 | **Folded.** Tasks 0 and 13 compare five named audit rules by finding identity, with `/admin/theme-kit` in task 13's set. Task 13 labels the two live checks as public-site checks. |
| R-m3 | **Folded.** The fixture gains checkbox, radio, a static `modal-box`, and the radio join, with assertions. |
| R-m4 | **Folded.** The close adds `admin-toolkit.md`'s class inventories and `sveltekit.md`'s pill geometry wording. |
| R-m5 | **Folded.** Task 6 lists the selected-form call sites before the move. |
| R-m6 | **Folded** as decision 11 (settled by the owner). The next release is `0.98.0`, recorded in the close's CHANGELOG entry and STATUS. The heading stays `## Unreleased`, and a hotfix before the cut branches from `v0.97.0`. |
| R-m7 | **Folded.** A sanctioned resume point sits before S3, and the D-to-E boundary is a fallback close point. The `motion-vocabulary` fix moves from task 3 to task 1, which lightens the Opus task without reordering. |

## Settled decisions folded (not forks)

1. **Sequencing reversed.** The worktree branches from `main` now. Task 0 item 1 verifies the
   pause: `draft-docs-0`'s head matches its recorded pause commit, its worktree is clean, and no
   process runs from it. Task 0 item 5 records that `main` carries the full narrative-arm freeze,
   since `draft-docs-0`'s freeze lift is unmerged. The close's arm fixes also land as facts
   bullets so the paused pass inherits them. STATUS records how the paused pass resumes.
2. **`:checked` is the fifth selected form** (decision 9). The selector is confirmed in
   `node_modules/daisyui/components/button.css`.
3. **`0.98.0` is the next release** (decision 11).
4. **Sweep-removed classes go on the safelist** (decision 10).

## Token ceiling: what changed

The old plan set a 14.5M ceiling with the flag at 11.6M, below its own 11.9M planned spend. The
re-derived plan sets a 20M ceiling and a 16M flag, above a planned spend of about 15.6M. The
changes:
- **Implementer chains:** 0.45M to 0.5M each (+0.7M), for the added state, pair, and host-order
  coverage.
- **`code-simplifier`:** four boundary passes (+0.8M), a cost the old plan left with the
  implementer, who cannot dispatch it.
- **S1:** widened page set (+0.3M).
- **S4:** the `visual-verifier` read of the regen set (+0.3M).
- **Task 15:** two runs (+0.5M).
- **The close:** 0.7M to 1.5M (+0.8M), per the recorded close overrun.
- **The conductor:** across the resume point (+0.2M).
- **CI probes:** now itemized (+0.1M).

## Task count

The count is unchanged: tasks 0 to 16 and steps S1 to S4. The one move is the `motion-vocabulary`
fix, from task 3 to task 1. The segments are A (0 to 4), B (5 to 8), C (9 to 11), D (12 to 14),
E (S1, S2, task 15), a resume point, F (S3, task 15, S4), and G (task 16).

## Forks

None. Every finding had an answer in the tree, daisyUI's own model, or the runner's source. The
three findings a reviewer flagged as owner forks were settled by the owner before this fold.

## Second fold

Input: the fold verification
(`docs/superpowers/research/2026-09-26-theme-identity-pass-a-fold-verification.md`), 1 major and
10 minors. Each finding was checked against the tree before it was folded. The only spec edit is
the Delivery section's sequencing sentence. No gate was run.

| ID | Disposition |
| --- | --- |
| M1 | **Folded, decided (decision 13).** Task 0 gains item 6, a `cairn-implementer` dispatch before the baseline. `gate-tier.mjs`'s scripts and engine string now ends `npm run test:node-projects && npm run test:component -- --no-file-parallelism`. `package.json` gains `test:node-projects`, and `npm test` runs the same projects as before. The Gates section quotes the new string. The stall note now says stock `npm test` is not a gate. Item 8 (the baseline) stops the pass on any stall of the serialized string, with one message to Geoff; the remedy is a reboot and a retest. CI is unchanged: `test.yml` still runs `npm test`, parallel. |
| m1 | **Folded.** Item 7 runs `--range HEAD~1..HEAD --pin engine`. After item 6's commit that range is non-empty. |
| m2 | **Folded.** Decision 12 records the sequencing reversal and cites the arc log. The spec's Delivery sentence now states the reversal and cites the arc log. |
| m3 | **Folded.** Task 6 computes both hairline ratios itself, through `resolveColor`, the file's `paintedRgba`, and `composite` and `contrastRatio` from `color.ts:30,51`. Task 13 re-measures on canvas. |
| m4 | **Folded.** `resolveColor` takes an optional `context` element and paints the probe inside it. The task 2 self-test proves both placements. Task 8's alert oracles pass the alert as `context`. |
| m5 | **Folded.** `styleOf`'s CDP press offsets the element's rect center by `window.frameElement`'s rect and any frame scale. |
| m6 | **Folded.** Task 7's switch colors are asserted at rest, hover, focus-visible, and active. |
| m7 | **Folded.** Task 13's order of steps starts with the `RATIFIED_NORMS` edit. |
| m8 | **Folded.** The admin CSS set appends `npm run check:idioms` at its definition and at every task that quotes it. Task 12 runs the admin CSS set. Item 6's dispatch also runs `check:idioms`, since it edits `scripts/checks/`. |
| m9 | **Folded.** Task 2 requires a project-level `globalSetup` on the component project. An npm pre-step no longer qualifies. vitest 4.1.11 carries `TestProject._globalSetups`. |
| m10 | **Folded, record only.** The spot-check line on `IMPL_SCHEMA` above is corrected. The plan does not change. |

### M1: the mechanism and its source

vitest 4.1.11 caps a browser project's page count in `getThreadsCount`
(`node_modules/vitest/dist/chunks/cli-api.CnMVyzaz.js:2479-2483`):

```js
if (!config.headless || !config.fileParallelism || !project.browser.provider.supportsParallelism) return 1;
if (project.config.maxWorkers) return project.config.maxWorkers;
```

The CLI flag reaches that check through `resolved.browser.fileParallelism ??=
options.fileParallelism` (`coverage.DM_a_rWm.js:493`). So `--no-file-parallelism` gives one page
at a time, the form the memory records as clean. The same option set in `vitest.config.ts` would
serialize CI's `npm test` as well. CI shows no stall, so that would lengthen every CI run for a
workstation fault. `gate-tier.mjs` runs only locally, since no workflow calls it. Putting the flag
in the tool's string therefore serializes exactly the runs that stall. It also keeps the runner's
forced string and the implementer's run identical.

### Token effect

Item 6's dispatch adds about 0.2M. The task 0 row is now 0.5M, and the planned total is about
15.8M. The 16M flag still sits above planned spend.

## Prose review fold

Input: the prose and fidelity review
(`docs/superpowers/research/2026-09-26-theme-identity-pass-a-prose-review.md`), 5 blockers, 14
warnings, and 12 suggestions. Each finding was checked against the tree before it was folded. The
conductor decided W8, W13, W2, and the resume trigger; those are applied as decided. Only the
plan changed. No gate was run.

| ID | Disposition |
| --- | --- |
| B1 | **Folded.** Task 5's Outcome says five groups. The variant line excludes `btn-neutral` and points `btn-soft btn-primary` to its own line. A new line asserts `btn-neutral`'s hover at `var(--cairn-ink-hover)` and its other states at stock. Added: the Outcome says the hover rule excludes `:active`. A press also matches `:hover`, and the idiom layer outranks daisyUI's `:active` rule, so the stock-active assertion needs that exclusion. |
| B2 | **Folded.** The path is `src/tests/unit/audit/rules/rendered/norms-bands.browser.test.ts`, confirmed in the tree. |
| B3 | **Folded.** The spec pin is `5f7d3fd6`, the last commit to touch the spec. Task 0 item 4's `48a87c62` tree counts stay. |
| B4 | **Folded.** Confirmed at `generate-norms-manifest.mjs:32,124`. Task 13 runs `norms:check` with `BASE_URL` before the preview stops, and its Acceptance line carries the `BASE_URL`. Task 15 reruns both against the 4391 preview. |
| B5 | **Folded, mapping corrected.** Pages go through `rendered.extraPages` in `examples/showcase/cairn-audit.config.json` (`config.ts:227-228` appends them). The review placed the phone desk band and the chip-beside-heading row on `/admin/posts`. Both are elsewhere. The desk band is the edit route's header (`admin-design-system.md`, "The desk band"), so it lives on `/admin/posts/2026-06-hello`. The only chip-beside-heading row (`cairn-line-slot`) is the "Set by your developer" chip in `CairnTidySettings.svelte:410`, on `/admin/settings`. The added pages are `/admin/theme-kit`, `/admin/posts/2026-06-hello`, and `/admin/settings`. `/admin/posts` keeps the filter join and `Pagination`. The identity comparison covers the shared default routes. |
| W1 | **Folded.** The expected-red set names the missing-baseline failure from task 12's push, and the Haiku probe reports it apart from a mismatch. |
| W2 | **Folded as an e2e spec** (`examples/showcase/e2e/starter-outline-pin.spec.ts`), added to task 11's `test:e2e` check. The component project cannot build the showcase CSS. It runs in a browser with no Tailwind plugin. A node-side compile of `theme.css` needs the showcase's `@fontsource-variable` packages, and CI's `test.yml` installs the showcase only after `npm test`. The spec probes `/styleguide`, which already carries an uncolored `btn-outline` and `badge-outline`. |
| W3 | **Folded** as written, with "the ledger" read as the mutation ledger. |
| W4 | **Folded** as written. |
| W5 | **Folded** as written. `calendar/object.js` exists and defines the `.cally` selectors. |
| W6 | **Folded.** Task 15 takes the Files, Outcome, and Acceptance template, and quotes each task check in full. |
| W7 | **Folded** in all four Files lists. Task 2's two "ledger" mentions now say the custom-surface ledger. |
| W8 | **Folded as decided.** Task 5 carries a state table: rest, hover at 5% fill with the 22% edge, focus-visible at the rest values, and active at the hover values. No state takes daisyUI's base-200 restatement. |
| W9 | **Folded** in tasks 6 and 7. |
| W10 | **Folded.** Task 14 cites the spec's fold record by full path and section. |
| W11 | **Folded.** `draft-docs-0`'s head is `85efee59` (19:30), confirmed. |
| W12 | **Folded.** Merge step 3 and the close's Acceptance run `check:vale`. |
| W13 | **Folded as decided.** A new "The gate agent" paragraph covers item 8 and each boundary `code-simplifier` re-gate: one Sonnet agent per call at `high`, returning the `gate exit:` line and the log tail. Task 0's preamble, item 8, the Models paragraph, and the Gates stall note now say the main loop runs no heavy gate. |
| W14 | **Folded.** Confirmed: `norms.yml` has only `workflow_call` and `workflow_dispatch`, and `e2e.yml` calls it as the `norms` job. |
| S: line 60, 71 | **Folded.** The token row names the capture agent, the new baseline gate agent, and the gate-wiring dispatch. The gate agent is an addition, since W13 created it. |
| S: line 33 | **Folded.** Tasks 3 and 4 do not touch the budget file. |
| S: line 123 | **Folded** as written. The runner's `resolveGate` returns `t.gate \|\| a.gate` for a pinned task. |
| S: line 110 | **Folded** as written. |
| S: S1 page set | **Folded** in task 0 item 9 and S1. Item 9 keeps the signups delete dialog, which `admin-visual.spec.ts` does not open. |
| S: line 738 | **Folded** as written; the forms match `toggle.css`. |
| S: fold verification cites | **Folded** at task 11 and in the evidence list, which now also names this plan's fold verification and prose review. |
| S: resume trigger | **Folded as decided.** Decision 12 records the conductor's reading: draft docs resumes after pass B merges. S3 asks Geoff to confirm it, and the close's STATUS line cites the confirmed trigger. |
| S: `check:idioms` in task 13 | **Folded.** |
| S: line 448 | **Folded.** The spike's row reads 53,015 bytes minified gzip. |
| S: task 14 bullet | **Folded** as a checklist, one deliverable per line. Three errata lines gained the action the fold record implies. The `:1301-1303` count is read from `unlayeredAllowlist`, since the fold record's "fourteen" and the plan's 18 count different things. |
| S: register | **Folded.** "Genuinely" dropped, the gotcha named, and "today's two roots" reworded. The four "X, not Y" frames stay. |
