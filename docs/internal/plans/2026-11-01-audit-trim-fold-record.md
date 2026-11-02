# Fold record: audit-trim plan review

Fold of `2026-11-01-audit-trim-review-mechanics.md` into the plan and design note, plan depth with no
verification read. Counts: 21 folded (18 in part), 1 refused, 1 carried to the prompt, 1 kept as it stands. No
owner fork. Path: 215 minutes (T2 +5, T4 +5, T5 +10, T7 +5), against 300 and the design's 150.

| # | Disposition | Where, or why |
|---|---|---|
| 1 | folded | T4 Files adds the allowlist entry; T4 acceptance adds `check:symbols`. Probed in a scratch copy with T4's deletions and T5's allowlist removal: the only new line is `MIGRATION-NOTES.md:466 [env-var] CAIRN_AUDIT_COOKIES`. |
| 2 | folded | T4 drops the phrase, since `check:package` runs it. T5 uses `npm run package && node scripts/checks/check-skill-budget.mjs`. |
| 3 | folded | T5 Files, its bullets, and its acceptance grep. The review's grep missed bare rendered rule ids (`extension-grammar.md:35`, `:41-43`), so T5 adds a second grep over backticked ids. |
| 4 | folded | T2 Outcome and bullets: moves `norms.test.ts:544`, names lines 152, 179, 244, and header 3-6. |
| 5 | folded | T1 line 380-381, T2 `:81-90` and `:96-136` and the one-method page type, T3 `89-97`, `86`, `83-84`, T4 config lines 12 and 60, and the three-line statement. |
| 6 | folded | T2: `_canvas-color.ts` exports `type RenderedPage`. |
| 7 | folded | T4 acceptance grep, `from '.*/(rendered|norms|color)\.js'`; the exception clause goes, since nothing can hit it. |
| 8 | folded | T4 acceptance `find`. No static rule file matches: `ls rules/static` shows only `token-colors.ts`, which the patterns miss. |
| 9 | folded | T4: `command` goes, with the `toEqual` lines named. |
| 10 | folded | T4 names each line. Added what the review missed: `check-skill-budget.mjs:237`, `check-package-files.mjs:381,399`, and `check-skill-budget.test.ts:176,181`, which moves to the static advisory rule `radius-scale`. |
| 11 | folded | T7 Files adds the test comments, plus `status-chip-register-tuning.test.ts:48`; the grep adds `src/tests`; `admin-design-system.md:636` joins the list. |
| 12 | folded, corrected | T1 rows 1 and 8. `/auth-store` exports six functions and four types; the entries are `audit-auth-listeditors`, `-inserteditor`, `-editorrow` (now `UnresolvedEditor`) as keeps, and `-seteditorrole`, `-deleteeditor`, `-demoteownerifnotlast`, `-removeownerifnotlast` as reshapes. The three outcome types have no entry. The review was wrong that `container-inset-asymmetry` is a reshape: the heading says keep. Added `audit-cli-the-post-hydration-page-identity-guard` (keep) and, in part, the config contract (reshape). The count is nine keeps and three reshapes, listed under `## Decisions`. |
| 13 | folded | T1: rows say keep, reshape, or accept. Row 12 reads "Reshapes that honor the kept case". Row 9 drops `audit-log-editor-bootstrapped` (no Decide block names it) and says "in part". The `tooltip-primitive` and `audit-adapter-createrenderer` clauses move to the Reverses cell, so to `Record:`. The `engine-rulings.md:19` deviation is listed under `## Decisions`. |
| 14 | folded | Header defines `<base>`; T3 uses `<pair-base>` and scopes `--protected`; the standing answer moves `<base>` after a 1a merge. |
| 15 | folded | One standing answer, "Gates", from `cairn-pass`. Commands stay as written. |
| 16 | folded | T5, T6 acceptance, and the 1a standing answer. `bake-template.mjs:225-227` throws without `dist`. |
| 17 | folded | T8: `docs/STATUS.md` leaves Files, #120 takes the `- [x]` and `Done:` form, and `--rendered` stays out of a shell fence (`extractCliFlags` reads shell fences only). |
| 18 | folded in part | The review's "isn't in 1a's prompt" is wrong: `auth-removal-plan.txt` says pass 1b records the calls, "so this pass doesn't edit that file except for a ruling only it can word". T1 now carries that exception. No 1a plan exists (`auth-removal` is at `d71e4401e`, with no plans directory or plan commit). Design item 9 names `durable-gotchas.md`, from design.md's clean-up list. |
| 19 | carried to the prompt | The line: "Each accepted-task report names the CI verdict on that task's head." |
| 20 | refused | No change, as the review says: `cairn-running-passes` maps `runner` to `scripts/checks/**`, `.github/workflows/**`, and `.github/ci-green.json`, not skills. |
| 21 | kept as it stands | The dead-branch removal holds: after `norms.yml` goes, no job has `uses: ./.github/workflows/`, per `grep`. |
| 22 | folded | T2 acceptance sentence cut. |
| 23 | folded | T5 "nothing new" becomes "nothing". |
| 24 | folded | T3 grep is `.github` alone. |
