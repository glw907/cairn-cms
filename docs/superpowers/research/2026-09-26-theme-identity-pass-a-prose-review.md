# Prose and fidelity review: theme identity pass A plan (at `5f7d3fd6`)

Artifact: docs/superpowers/plans/2026-09-26-theme-identity-pass-a.md. Audience: a Sonnet cairn-implementer that sees one task's text, the plan's global sections, and the spec; the diff reviewer sees only that task's criteria. Graded fidelity and plannability first, register last.

Verified accurate: all task 0 item 4 inventory counts (85 matches / 17 files, 24, 4, 1, 5, 8, 1, 16), the allowlist 18 entries and cap 19, every cited line (segmented-control.ts:22-24, cairn-admin.css:501, motion-vocabulary.ts:204-208, pass-execute.js:32-33 and 286-288, norms.ts:484 and 555-561, playwright.config.ts:29-32, the IconPicker/EditorToolbar/ListToolbar/MediaPicker/Pagination/CairnAdminShell lines, HISTORY.md, ROADMAP.md:880, the design-system and reference-page lines), daisyUI's 29 theme keys and the :checked selector, every script name, the 15.8M token sum, the renumbered task 0 items 1 to 10. No 17-for-16 cap slip, no leftover 15.6M.

## Blockers

B1 (lines 639, 645, 659-660). Task 5 contradicts itself. The Outcome announces "Four idiom rule groups" and lists five. The Acceptance says "each color variant match daisyUI's stock fill in every state", but btn-neutral is a color variant whose hover this task moves to var(--cairn-ink-hover), and btn-soft btn-primary is restyled here too. No acceptance line covers the btn-neutral hover. Replacements: line 639 "**Outcome:** Five idiom rule groups (spec, "Buttons"):". Lines 659-660: "- `btn-ghost`, `btn-outline`, and each color variant other than `btn-neutral` match daisyUI's stock fill in every state (the narrow selector); `btn-soft btn-primary` is asserted by its own line below." Add after 660: "- `btn-neutral`'s hover fill resolves to `var(--cairn-ink-hover)` through `resolveColor` in both themes; its rest, focus-visible, and active fills match daisyUI's stock."

B2 (line 1012). Task 13 cites src/tests/unit/audit/norms-bands.browser.test.ts, which does not exist. The file is src/tests/unit/audit/rules/rendered/norms-bands.browser.test.ts (sibling norms-bands.test.ts exists).

B3 (line 10). The spec is pinned to 48a87c62, which predates the second fold's spec edit in 5f7d3fd6; at 48a87c62 the Delivery section still says the pass branches after draft docs merges. Replace with: "**Spec:** `docs/superpowers/specs/2026-09-26-theme-identity-design.md` (commit `5f7d3fd6`), approved by Geoff 2026-09-26." Task 0 item 4's "Plan-time counts at 48a87c62" can stay (tree counts).

B4 (lines 1037-1041, 1052, task 15 line 1150). Task 13 stops the preview before norms:check runs, and norms:check runs the same generator as norms:generate, which never starts a server and falls back to http://localhost:4173 when BASE_URL is unset (generate-norms-manifest.mjs:32,124). Replace the order-of-steps sentence with: "run `norms:generate`, then `norms:check`, the rendered audit, and the two live checks against it, each with `BASE_URL=http://localhost:4391`; stop the preview and say so; confirm 4173 is free; then run the contrast e2e." Task 15 line 1150: "reruns `norms:generate` and `norms:check` with `BASE_URL` on the 4391 preview (the task 13 order of steps)".

B5 (lines 1046-1051). Task 13's page list breaks the before/after comparison: rendered.pages replaces the default list (config.ts:57-64: posts, pages, vocabulary, media, editors, login) that task 0's before-runs used, and the comparison is by finding identity. Three list items are regions, not routes. The config file is never named. Replacement: "The pages are added through `rendered.extraPages` in `examples/showcase/cairn-audit.config.json`, never `rendered.pages`, so the default core routes task 0 measured stay in the set: `/admin/theme-kit` and `/admin/posts/2026-06-hello` (the toolbar row). `/admin/posts` (27 posts at `pageSize` 10, so `Pagination` renders) already carries the `ListToolbar` filter join, the phone desk band, and the chip-beside-heading row. The record names the route that carries each region." Verify the region-to-route mapping before folding; the reviewer confirmed only the default list, ConceptList's pageSize of 10, and the 27 posts.

## Warnings

W1 (lines 111-114, 1003). The expected-red set omits missing-baseline failures: task 12 adds new admin-visual entries with no baseline, and with no updateSnapshots CI fails with "A snapshot doesn't exist", which the Haiku probe would classify as red. After line 114 add: "From task 12's push, a missing-baseline failure ("A snapshot doesn't exist") on a new `theme-kit` entry in `admin-visual.spec.ts` is also expected."

W2 (lines 916, 936-940). Task 11's pin test has no named home, and no gate is certain to run it; the unit project cannot build the showcase CSS and assert in a browser; if it lands in the showcase e2e, task 11 runs only styleguide.spec.ts. Replace "one new test that proves the pin" with "one new component test, `src/tests/component/starter-outline-pin.test.ts`, that builds the showcase's theme CSS and runs in the engine string's component project", or name an e2e spec and add it to task 11's test:e2e check.

W3 (line 518). Task 2's staleness guard has no fixture state and no mutation. Replace with: "A guard test compares the modification times of `dist/components/cairn-admin.css` and `src/lib/components/cairn-admin.css` and fails when the dist sheet is older. Mutation (in the ledger): with the `globalSetup` entry removed, touch `cairn-admin.css` and run the component project; the guard fails."

W4 (line 514). Task 2 asserts the source literal "0 .5px"; getComputedStyle serializes "0px 0.5px". Replace with: "the `active` read of `translate` differs from rest and equals the computed form of daisyUI's `translate: 0 .5px` (`0px 0.5px`)."

W5 (lines 433-435). Task 1's calendar assertion cannot fail (a set difference contains nothing from the excluded list by definition). Replace with: "The calendar classes are the difference between the lists with and without `exclude: ['calendar']`. That difference is non-empty, and every class in it is defined in `node_modules/daisyui/components/calendar/object.js`."

W6 (lines 1154-1157). Task 15 names task checks without quoting them, though reviewers see only criteria (plan lines 44-47), and is one packed block. Recast it in the standard template (Files, Outcome, Acceptance) and quote in full: the admin CSS set string as now; "if the run touches examples/showcase, the showcase set, CAIRN_GATE_LANE=light cairn-run-gate 'npm --prefix examples/showcase run check && npm --prefix examples/showcase run check:cairn && npm --prefix examples/showcase run format:check'"; "the port check (ss -ltnp 'sport = :4173' prints no listener), then cairn-run-gate 'npm --prefix examples/showcase run test:e2e -- theme-kit.spec.ts theme-kit-contrast.spec.ts'".

W7 (lines 636, 676, 727, 777). "The ledger" means three things (the plan's own Ledger section, the mutation ledger, the custom-surface ledger doc). Replace in all four Files lists with "docs/internal/design/2026-06-29-custom-surface-ledger.md".

W8 (lines 642-643). Task 5's focus-visible and active values are undefined ("hold the hairline family").

W9. Two idiom rules lack a loses-to-a-utility case the global constraint (line 240) requires. Add to task 7: "Loses to a utility: a Lucide icon carrying `stroke-[2.5]` (through `hostCss` in `@layer utilities`) computes 2.5." Add to task 6: "Loses to a utility: `btn-outline btn-active text-error` keeps the red ink."

W10 (line 1078). Task 14 cites "fold record, 'Errata owed'" when two fold records exist. Replace with "docs/superpowers/research/2026-09-26-theme-identity-fold.md, "Errata owed to ratified documents"".

W11 (line 330). The recorded draft-docs head is stale: draft-docs-0 is at 85efee59 (19:30), after the plan's d0639043. Replace with "the plan-time head was `85efee59`."

W12 (lines 1260, 1267). The close edits Vale-scoped pages under docs/reference/ and docs/extend/ but runs no check:vale; add check:vale to merge step 3 and the close's Acceptance.

W13 (lines 323-324, 375, 53-54). Item 8 makes the baseline the conductor's one heavy gate call, against the global rule that the full gate runs inside the chain, never in the main loop; the code-simplifier boundary gate names no runner.

W14 (lines 1203-1204). norms.yml is only workflow_call and workflow_dispatch; on a push it exists as the norms job inside e2e.yml. Replace with "the `e2e` run (its `norms` job included), and the `test` and `design` runs, for the ledger commit's SHA".

## Suggestions

- Lines 60 and 71: "Baseline agent" names nothing. Line 71: "Task 0's before-state capture agent (item 9) and its gate-wiring dispatch (item 6, about 0.2M)". Line 60: "Capture agents are Sonnet ...".
- Line 33: tasks 3 and 4 do not edit custom-surface-budget.json. Replace with "Tasks 2 to 8 all edit src/lib/components/cairn-admin.css, and tasks 2 and 5 to 8 also edit scripts/checks/custom-surface-budget.json".
- Lines 123-124: the runner does accept a task gate (t.gate || a.gate). Replace with "Set no task-level `gate`: the implementer runs the classifier's printed string, and for a pinned task the reviewer compares it against `t.gate || a.gate`."
- Line 110: a task has no push of its own. Replace with "from the segment C push, which carries task 11".
- Lines 387-388 and 1117-1119: admin-visual.spec.ts already captures /admin/login and /admin/signups; S1's parenthetical omits confirm, zen, drawer overlay, sidebar, delete dialog; HelpHome's route is /admin/help. For S1 use "every other page admin-visual.spec.ts captures (read the spec's test titles for the list), /admin/help, and the media library's bottom sheet open at 390".
- Line 738: list the switch's three checked forms: `:checked`, `[aria-checked='true']`, `:has(> input:checked)`.
- Line 926 and lines 16-22: "(fold verification)" should name 2026-09-26-theme-identity-fold-verification.md (the spec's); the evidence list should add this plan's own ...-pass-a-fold-verification.md, which produced decision 13.
- Line 1252: the resume trigger wording (decided above by the conductor).
- Task 13 edits src/lib/audit/norms.ts but never runs check:idioms; add "CAIRN_GATE_LANE=light cairn-run-gate 'npm run check:idioms'".
- Line 448: task 1 has no theme blocks or sublayer, so the right spike row is "All components, calendar excluded" (53.0 KB gzip), not the full spike's 53.2 KB.
- Lines 1079-1091: task 14's first bullet is one ~150-word sentence carrying ~15 deliverables; break it into a checklist, one erratum per line.
- Register: line 35 drop "genuinely"; line 1206 name the gotcha "CI-canonical baselines this workstation cannot reproduce"; line 554 "in today's two roots" becomes "in the two roots on main". The "X, not Y" frames at 303, 307, 520, 1059 are precise scoping and stay.

Scanner: 30 of 31 slop-hard hits are the directory name "showcase". No em dashes. Verdict: high fidelity; the five blockers are real build-or-assert traps, B1 and B4 most of all.
