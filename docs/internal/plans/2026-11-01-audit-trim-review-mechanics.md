# Mechanics review: audit-trim plan (HEAD 2d256f484)

`standards:plan-reviewer`, Opus at medium, saved by the planning session. Line refs without a path are
to `2026-11-01-audit-trim-plan.md`. Verdict: one blocker, three majors, the rest minor. No owner forks.

## Blocker

**1. T4 turns `check:symbols` red at its own commit and every head after it (`correctness`). Plan:177-229, T5 acceptance :273-274.**
`MIGRATION-NOTES.md:466` names `CAIRN_AUDIT_COOKIES` in code voice, and `MIGRATION-NOTES.md` is in
`check-symbols`' SCOPE. The env-var class resolves only against `src packages migrations
examples/showcase scripts .github` (`check-symbols.mjs:639`). The token's only readers there are
`src/lib/audit/rendered.ts` and `rendered/bootstrap.ts`, which T4 deletes. Probed in a scratch copy:
removing those trees added exactly `MIGRATION-NOTES.md:466 [env-var] CAIRN_AUDIT_COOKIES`.
`check:symbols` sits in the `engine` and `docs` buckets (`gate-table.json:77`) and in `docs-gate`.
Fold: in T4, add `'env-var:CAIRN_AUDIT_COOKIES', // MIGRATION-NOTES.md history; the reader was removed
in 1b; R1's reset drops this line` to `scripts/checks/check-symbols-allowlist.mjs`. Rewording the note
also works, but the allowlist keeps history intact until pass 8. T5 edits the same file after T4.

## Major

**2. `npm run check:skill-budget` does not exist (`correctness`). Plan:227, :273.** The script runs only
as the last leg of `check:package`. Fold: T4 drops the phrase. T5 uses `npm run package && node
scripts/checks/check-skill-budget.mjs`. Without a fresh `dist` the tier-map half skips silently
(`distRulesAvailable`), so the `package` step is what lets the check fail.

**3. T5 misses live rendered teaching in packaged skills, and no grep catches it (`correctness`). Plan:240-276.**

- `skills/cairn-extending-a-site/references/preflight.md:49`: "(the static and rendered `cairn-audit` passes)". Not in T5's list.
- `skills/cairn-extending-a-site/references/audit.md:38`: "the rendered pass catches a parent selector".
- `skills/cairn-building-admin-screens/references/audit-rules.md:89`: "caught only by the rendered `list-role`".
- `skills/cairn-building-admin-screens/references/grader-prompt.md:14`: "step 3 of the done-gate" goes stale when T5 renumbers. Not in T5's list.
- `skills/cairn-styling-public-pages/references/checking-a-theme.md:4`: the contents line lists "the rendered check", and no such section exists. Not in T5's list.
- `references/extension-grammar.md:35`: a `one-filled-action` mention outside T5's listed lines.

Fold: add these to T5's Files. Widen T5's acceptance grep with ``rendered \`?cairn-audit|rendered
pass|rendered (mode|audit)|the rendered \`|rendered check|step 3 of the done-gate``.

**4. T2 loses a recipe proof its Outcome says keeps running (`correctness`). Plan:118, :132-136, standing answer :47-49.**
`src/tests/unit/audit/norms.test.ts:544`, "attests every Write token against the admin sheet inventory
or the theme-kit fixture source", is the only test keeping a hand-typed `ROLE_RECIPES` row honest
(comment at `norms.ts:305-310`). T4 deletes it. Fold: T2 moves that test into
`guidance-recipes-sync.test.ts`, reading `src/tests/unit/fixtures/admin-sheet-inventory.txt`. Also,
`checkRoleRows` has two tests, at `guidance-recipes-sync.test.ts:179` and `:244`. Name both. Header
comment lines 3-6 change too.

## Minor: correctness

**5. Quoted lines that are wrong.** Plan:101: the text is at `engine-rulings.md` lines 380-381.
Plan:126: `resolveColors` is 81-90 and `resolveColorsInPage` is 96-136. Plan:164: the `job.uses` branch
is `workflow-yaml.test.ts:89-97`; the `seen` parameter (86) and doc comment (83-84) go too. Plan:219:
`config.test.ts`'s rendered block starts at line 60, and the import at line 12 goes. Plan:141: after
`ensurePageHelpers` goes, `vertical-metrics.ts` calls only `page.evaluate` (:1566). Plan:188-189 shows
a three-line statement as one line, harmless.

**6. T2's helper page type won't compile as written. Plan:124-130.** Three tests import `type
RenderedPage` and cast with it at about a dozen sites. Fold: `export type RenderedPage = { evaluate: ... }`.

**7. T4's acceptance grep can't print "nothing". Plan:228.** After T2, `from '.*color\.js'` matches
`./_canvas-color.js`. Fold: use `from '.*/(rendered|norms|color)\.js'`.

**8. "No `rendered` path in `dist/audit`" isn't asserted. Plan:227.** T4 removes the only check that
looked. Fold: add `find dist/audit \( -path '*rendered*' -o -name 'norms*' -o -name color.js \)` prints nothing.

**9. `AuditArgs` is ambiguous. Plan:199, :220.** Fold: drop `command`, and change the `toEqual`s at
`config.test.ts:339,348,378,383,391` and `fail-on.test.ts:44-45`.

**10. T4 leaves stale text it doesn't name. Plan:186-217.** `bin.ts:64-69`;
`check-package-files.mjs:338,344,370` (the error tells a developer to register in
`rules/rendered/index.ts`); `check-package-files.mjs:265`; `check-skill-budget.mjs:10-11` and the
`checkTierMap` comment; `src/lib/audit/index.ts:1` ("two substrates"); `check-package-files.test.ts:359`
needs the new arity.

**11. T7's Outcome reaches past its grep. Plan:306, :329.** The grep skips `src/tests`, where these stay
live: `packaging-guidance.test.ts:94-95`, `status-chip-register-tuning.test.ts:13-14`, `run.test.ts:578`,
`BtnActiveDarkGround.test.ts:7,193`, `vertical-metrics.ts:1548,1554`. `admin-design-system.md:636` is
also missed. Fold: add `src/tests` to the grep and line 636 to the list.

**12. T1's table can't produce "each slug". Plan:71, :76, :82.** All 49 named slugs exist. Three items
have no slug. Fold: enumerate.

- Row 1 "the rendered rule keeps": `audit-cli-one-filled-action-focus-renders-interactive-contrast-viewpor`,
  `audit-cli-touch-targets-rendered-rule`, `audit-cli-border-contrast-weight-budget-screen-anatomy-relational-spac`,
  `audit-cli-chip-ground-collision-rendered-rule`, `audit-cli-form-font-parity-rendered-rule`,
  `audit-cli-container-inset-asymmetry-and-field-edge-alignment-rendered-` (these three are reshapes),
  `audit-cli-cairn-audit-cookies-environment-seam`. Design says "three tag-era keeps"; the count is
  larger, so list it in `## Decisions`.
- Row 8 "`cairn-media-seed` keeps": `audit-cli-cairn-media-seed-header-repeatable`,
  `audit-cli-cairn-media-seed-bucket-and-the-wrangler-r2-buckets-resoluti`,
  `audit-cli-cairn-media-seed-command-exit-contract-content-addressed-wri`.
- Row 8 "`audit-auth-*` keeps on `/auth-store`": pick them from the tag ledger's 24 `audit-auth-*` entries.

**13. T1 goes past the Decide blocks. Plan:82-86.** Row 12's "Reverses" lists eight keeps, but the design
says each kept case is still met, so label them as reshapes that honor the case. Row 9's
`audit-log-editor-bootstrapped` is inferred. Row 9's `audit-sveltekit-authguardoptions` is a whole-type
keep; word it "in part". Row 8 calls `audit-admin-formattimestamp`, `audit-admin-listtoolbar` (reshape)
and `polish-formattimestamp-domain` (accept) "keeps". Rows 8 and 12's last clauses aren't reopen
evidence; move them to Verdict or Record. `engine-rulings.md:19` says a `retire` entry is a heading plus
Reopens; the extra Verdict line passes the gate, so list it as a deviation.

**14. `<base>` and `ciWait`. Plan:4, :168.** `ciWait` holds, but `<base>` is never defined and the header
gives two values. With the pass base, every task from T4 on also prints `ciWait`, which
`pass-gate-tiers.md:180` reads as "this task waits", contradicting cairn-pass's "no task waits". Fold:
define the pass base as `2d256f484`, moved to the merge commit after the 1a merge, and run `--protected`
only on the T3 pair's own range.

**15. Gates bypass the shared lanes. Plan:58, :145, :171, :225-227, :354.** 1a runs beside this pass.
Fold: one standing answer: legs go through `cairn-run-gate`, and a lone contention failure with another
worktree's process in `ps` reruns alone once and is listed as flake.

**16. `emit:template` needs a `dist`. Plan:270, :296, :53.** `bake-template.mjs:225-227` throws in a fresh
pair worktree. Fold: `npm run package && npm run emit:template`.

**17. T8 details. Plan:339, :346.** `docs/STATUS.md` has no step, and the sheet updates STATUS after
merge, so remove it. BACKLOG Done entries are `- [x]` with `Done:`. T8's new `--rendered` text must stay
out of a shell fence, since T5 removes the allowlist entry and `check:symbols` scans
`MIGRATION-NOTES.md` fences.

**18. Design note item 9 and T1 overlap with 1a. Design:53-56, plan:64.** `durable-gotchas.md` is on 1a's
clean-up list and T7's. "Pass 1a leaves this file to this task" isn't in 1a's prompt. This pass's prompt
assigns the 12 calls to T1, but no 1a plan exists to confirm it. Check 1a's plan before launch.

**19. Lens items with no text.** The plan doesn't say each accepted-task report names the CI verdict on
that head, and no executor prompt is in the review set. Add it to the prompt.

**20. Class.** T5 and T7 are labeled `ordinary`. `pass-core` counts skills as `runner`, but the repo map
wins, and the pass is already `runner`. No change.

## Minor: optional

- **21. Plan:162-164:** removing the `job.uses` branch isn't required; only the test must go.
- **22. Plan:146:** the manual "deliberately removed row" ablation repeats `guidance-recipes-sync.test.ts:215`.
- **23. Plan:276:** "prints nothing new": it prints nothing at HEAD.
- **24. Plan:167:** `.github .github/ci-green.json` searches the same file twice.

## Checked and holding

At T4, `check-skill-budget` stays green, since `parseTierMap` ignores SKILL.md's leftover rendered
blocks. After T5, the 21 static rules split 17 and 4. T3 ahead of T4 is right. Both pairs are disjoint
once generated output counts. No importer of what T4 deletes is missed in `vitest.config.ts`,
`component-rerun-triggers.mjs`, `_rerun-trigger-paths.ts`, `knip.jsonc`, tsconfig, `check-leaks`,
`gate-table.json`, `scripts/lab`, `packages/`, or `tool/`. The workflow quotes and line numbers are right.
T6's and T7's other citations are right. All verdict words pass the gate, `grep -c` gives 12. The docs
grep prints nothing at HEAD. The sum of estimates on the path is 195.
