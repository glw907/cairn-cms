# Theme identity pass C plan: review fold

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-c.md` on `theme-c-plan`, folded
from HEAD `8c7616c8`. **Inputs:** the three lens reviews in this directory, `-contract` (C1 to C24),
`-mechanics` (M1 to M12, O1), and `-risk` (R1 to R18). **Spec:**
`docs/superpowers/specs/2026-09-27-theme-identity-pass-b-design.md`, unedited.

**Counts:** 55 finding IDs. 51 folded, 2 refused (O1, R13), 2 routed to one owner fork (C10 and R18,
ruling 1). Three folded findings also refuse a sub-part (R1, R6, R8), each named below.

## Verification before folding

Each mechanics claim was probed or read, not taken from memory. Probes ran under the session
scratchpad `pc-fold/`, against the repo's installed daisyUI 5.7.44, Tailwind 4.3.3, and culori 4.0.2.

- **M1/R1.** `templates/waymark/cairn-audit.config.json` is byte-identical to the showcase's.
  `src/lib/audit/run.ts:54` throws on a configured root the tree lacks. R1's "nothing catches it" is
  overstated: `create-site.yml:202` runs `npm run check:cairn` in a scaffolded site, so CI would go
  red at the segment C boundary (M1's reading). The bin takes `--config`, resolved against the
  working directory, so a repo-owned config works.
- **M2/C1/R2.** `test.yml:67` runs `check:surface`; the engine string does not include it.
- **M3.** Confirmed. `color-mix(in oklab, oklch(25% 0 0) 60%, transparent)` at the mix point gives
  `l` 0.15 under `interpolate` and 0.25 under `interpolateWithPremultipliedAlpha`, alpha 0.6 both.
- **M5.** Confirmed. `require.resolve('tailwindcss')` gives `dist/lib.js`; the exports entry maps
  `style` to `./index.css`.
- **M6.** Confirmed. `collectRules` resets the prelude at `;`, so a block-less `@import` never
  becomes a rule.
- **M8.** The showcase's `check:cairn` runs the `cairn-audit` bin from the `file:../..` link, which
  reads the engine's `dist`.
- **M9.** `examples/showcase/vitest.config.ts` sets `environment: 'node'`; no DOM library is a
  showcase dependency.
- **M12/R10.** `daisyui/theme/object` has 35 themes with 29 keys; the one non-custom-property key is
  `color-scheme`. Waymark's two blocks already declare it (`theme.css:100,148`).
- **R4.** No `<variant>:cairn-focus-ring` use in `examples/showcase/src`; 11 files use the class. The
  pass-core `paint` row mandates "one cascade test per rule (renders, a utility beats it)".
- **R17.** `check:close` contains every leg of the engine string except the two test legs, and the
  close's full gate adds those, so a separate engine gate on the simplifier's commit is redundant.
- **R13.** The spec's charter bullet (spec:489) scopes the edit to the rule-count line.
- **R5.** `cairn-release`'s sweep rule has a skip clause: skip when "the window already contains such
  a sweep and `npm outdated` at every manifest returns only the held majors". The spec does not place
  the sweep.

## Dispositions

Convergent findings fold once, at the root, and list every ID.

### Convergent

| IDs | Disposition | Where |
| --- | --- | --- |
| M1 (blocker), R1 (blocker) | Folded. The engine's public roots move to a repo-owned `scripts/checks/public-scope.config.json`, read with `--config` from the showcase directory; the showcase config gains no public key; `check:template` fails on an emitted config path starting with `..`. R1's sub-fold "add `check:cairn` to `scaffold.yml`" is refused: `create-site.yml:202` already runs it on a site scaffolded from the real template. | Decision 27; task 6 (gate, fixture); task 7 (Files, outcome, acceptance: template config byte-identical, scanned count via `--config`); task 8 and 9 acceptance; decision 17 |
| C1, M2, R2 (blocker) | Folded. Task 6 regenerates `api-surface.md` with the export; the "only at the close" constraint becomes "the task that changes a typed export"; the close re-runs `--update` only if `code-simplifier` changed a declaration, before the full gate. | Global constraints; Gates (surface check); task 6; task 15 |
| C4, R9, M4 | Folded. Decision 1 gains a hard constraint applied first (stripped Waymark and the fixture pass every pair, both schemes, three grounds; else task 3 stops). M4's float boundary: the chroma floor takes a 0.005 tolerance and is computed with culori over parsed values; the record carries neighboring pass counts. M4's floor value stays Claude's (not a fork). | Decision 1; task 3 acceptance |
| C3, M7 | Folded. The frame check emulates the OS scheme, compares the frame `body` with the frame document's own `--color-base-100`, asserts not white under dark, and carries a revert mutation. | Task 4 acceptance |
| C10, R18 | Owner fork: ruling 1. The folded projection is about 24.1M (up from 23.5M: folds add about 0.8M, R17 saves 0.2M, the sweep move is neutral). The recommendation is 30M rather than the reviewers' 27M to 29M, since at 29M the flag (23.2M) would sit below the projection. | Rulings for Geoff |
| C21, R16 | Folded. The segment B boundary publishes one non-blocking Artifact (banner before and after, both schemes, styleguide kit); the `paint` row mandates the mid-pass glance. | Segments; budget table |
| M12, R10 | Folded. The toggle falls back to `matchMedia` on any `color-scheme` other than exactly `light` or `dark`; completeness names `color-scheme`; the fixture's blocks declare it. | Task 5 outcome and acceptance; task 8; task 3 outcome |
| C16, R7 | Folded. The peers load lazily, only when a selected rule needs them (decision 16's logic), so a full run still fails with the spec's named message and an admin-only selection runs clean. The pack fixture carries one daisyUI block so it reaches peer resolution. | Decisions 16 and 20 |

### Contract lens

| ID | Disposition | Where |
| --- | --- | --- |
| C2 | Folded. No color literal anywhere in the banner, fallbacks included (today's file fails); the e2e compares computed colors with named contract tokens and names the draft and published fixture states. | Task 4 outcome and acceptance |
| C5 | Folded. `acme` and `acme-night` fixtures, a secondary-fallback fixture, a `prefersdark` media fixture, and nonzero per-scheme pair counts equal to the expected list. | Task 9 acceptance; successor prints counts |
| C6 | Folded. A four-state exit-logic unit test and two reverted mutations. | Task 9 Files and acceptance |
| C7 | Folded. `check:public-tokens` gains the fixture variant in task 10, which quotes its counts. | Task 10 Files, outcome, acceptance |
| C8 | Folded. Inks are measured as rendered `color` against a Chromium-evaluated reference element; the nesting assertion names its comparison; a reverted selector mutation. | Task 10 outcome and acceptance |
| C9 | Folded. `--theme-dir`, `--build-only`, and the template arm's served `--probe` mode; one run of each in task 10; S2 uses them. | Decision 4; task 10; S2 |
| C11 | Folded. The spec iterates the committed expectation's keys and holds no unexplained empty value. | Task 2 outcome and acceptance |
| C12 | Folded into one bullet each: the per-form table with the mixed-`style` offset, and the missing-root pair. The "never double-fires" case lands with R3's test. | Task 7 acceptance |
| C13 | Folded. Replaces the likely-empty committed-list criterion: `token-colors.test.ts` passes unmodified, plus one `oklch` case. | Task 7 acceptance |
| C14 | Folded. The guard's empty and missing-key injections and the two message variants. | Task 8 acceptance |
| C15 | Folded. A role on its `-content` fixture. | Task 9 acceptance |
| C17 | Folded. The first `font-family` entry, and cleanup checked after the failing mutation run. | Task 10 outcome and acceptance |
| C18 | Folded. The sentence grep, the stale-exception failure, and the scanned count. | Task 6 acceptance |
| C19 | Folded. The routing-line grep; the compile scans the showcase's sources only. | Task 12 outcome and acceptance |
| C20 | Folded. One sentence names task 2's untyped export as the sanctioned exception. | Global constraints |
| C22 | Folded. The draft and published grounds differ in each scheme, in the same e2e spec. | Task 4 acceptance |
| C23 | Folded. The exact plan-time README phrase is grepped. | Task 13 acceptance |
| C24 | Folded. `check:audit-pack` greps the installed `.d.ts` for `culori`; the survey record's presence is in task 9's acceptance. | Decision 20; task 9 acceptance |

### Mechanics lens

| ID | Disposition | Where |
| --- | --- | --- |
| M3 | Folded. The resolver names `interpolateWithPremultipliedAlpha`; the Chromium pairs include a `transparent` operand and an achromatic `oklch` operand, with the powerless-hue fallback. | Task 9 outcome and acceptance |
| M5 | Folded. Package specifiers resolve under the `style` condition; a non-CSS target is a named finding; `tailwindcss` is not traversed; one `style`-only fixture. | Task 8 outcome and acceptance |
| M6 | Folded. `sheet.ts` gains a sibling export for statement at-rules, listed in task 8's Files. | Task 8 Files and outcome |
| M8 | Folded. The showcase legs package first, and the three task gate strings that embed them (tasks 2, 3, 5) gained `npm run package`. | Gates; tasks 2, 3, 5 |
| M9 | Folded. `vi.stubGlobal`, no dependency. | Task 5 acceptance; Global constraints |
| M10 | Folded. The harness mirrors the Playwright `webServer` environment. | Decision 4 |
| M11 | Folded. Both installs go under `os.tmpdir()`, removed on exit, with a resolve guard before the no-peers run. | Decisions 4 and 20 |
| O1 | Refused. With R5 folded, the sweep runs in task 0, and the baseline gate is the only proof of the swept tree before task 1; pass B's CI proves only the unswept head. Its reviewer role stays. | Task 0 item 7 (reason stated) |

### Risk lens

| ID | Disposition | Where |
| --- | --- | --- |
| R3 | Folded. A configured `public.exclude` merges with the default; the public scope never claims a file under any admin-scope root. Clear on the merits (an error-tier guard cannot be downgraded by config), so a decision, not a fork. Owed erratum 2. | Decision 6; task 7 outcome and acceptance |
| R4 | Folded. The equivalence spec checks every `cairn-focus-ring` element; one cascade test (the `paint` mandate); a changelog clause. | Task 2; task 15 changelog |
| R5 | Folded, at task 0 rather than R5's "after task 13": swept first, the equivalence expectation, the ink measurement, and the baselines are all captured on the release's dependencies, whereas a sweep after task 13 could move the committed expectation mid-pass. The cut runs `npm outdated` under the skill's skip clause; a new minor or patch stops the cut until it lands through a short branch. Sweep-moved captures join the expected-red set with the sweep as owner. | Decision 28; task 0 items 3, 4, 7; expected-red set; release paragraph; budget |
| R6 | Folded into task 15's two bullets (banner palette and preview ground, the focus-ring precedence, the copied `prose.css` outlines, `check:cairn`'s new output, the import position, the hand-ported template fixes). Sub-part refused: adding the import position as a clause to the `Consumers must:` line, which the spec gives verbatim; it goes to the migration notes instead. | Task 15 |
| R8 | Folded: every `cairn-public.css` role the banner reads carries a daisyUI-variable fallback. Sub-parts refused: the no-CSS component test (with no CSS loaded, neither daisyUI's variables nor the roles exist, so the states could differ only by a literal, which the public scope forbids) and a fixture-arm banner contrast check (the harness serves no preview route; S3 shows the banner in both schemes). | Task 4 outcome |
| R11 | Folded. The dotfiles step names the `npm exec --package=...@<version>` invocation, writes nothing, and records peer versions. | Task 15 dotfiles bullet |
| R12 | Folded. The cut waits on green `test` and `scaffold` runs on the release commit; a red full gate on `main` stops the release with STATUS recording merged-but-unreleased. | Task 15 release paragraph |
| R13 | Refused. The spec scopes the charter edit to the rule-count line (spec:489). The engine's new defaults are design-free by the spec's own definition, so "public output stays design-agnostic" stays true, and the `public-css-export` ruling records the change. Rewording the charter's positioning is outside this pass. | None |
| R14 | Folded. One STATUS carry-forward for cairn-pub's pin bump. | Task 15 STATUS |
| R15 | Folded once as a global constraint, not per task: every later report quotes an empty diff of the expectation, and update mode refuses under `CI`. | Global constraints |
| R17 | Folded. The simplifier's commit takes the full gate directly; about 0.2M saved. | `code-simplifier` section; gate agent; task 15; budget |

## Why so little is refused

Two of 55 are refused outright, and three more lose a sub-part. The reviews were unusually well
grounded: the mechanics lens probed every claim it made, and most contract and risk findings name
a criterion that would pass vacuously or a promise with no check. Each such fold tightens an
existing acceptance line; the fold adds no task and one decision pair (27, 28), and one fold (R17)
removes a heavy gate. The weighing for over-ceremony: R15 folds once globally instead of per task,
C12 and C14 fold as single bullets, R4's cascade test is the class mandate rather than extra
ceremony, and the mid-pass glance (C21, R16) is non-blocking at about 0.1M.

## Owed errata (the spec is not edited here)

1. **Spec line 58**, "Audit scope: the public scope, rooted at the engine's `src/lib/public/` by
   the showcase config," and **spec lines 313-315**, "The audit runs from the showcase, whose
   `cairn-audit.config.json` adds the engine's `src/lib/public/` to the public roots." The plan
   roots it through a repo-owned config
   (`scripts/checks/public-scope.config.json`), since the showcase config ships to every scaffolded
   site (decision 27).
2. **Spec line 307**, "The admin static scope skips any file the public scope claims." The plan
   narrows the precedence: the public scope never claims a file under an admin-scope root, and a
   configured `exclude` merges with the default. The sentence still holds, since overlap can no
   longer occur (decision 6).
3. **Spec line 373**, "When either peer cannot be resolved, the audit fails with a named message."
   The plan fails that way only when a selected rule needs the peer; an admin-only `--rule`
   selection runs clean (decision 16). A full run behaves as the spec says.

## Rulings for Geoff

1. **Raise the token ceiling to 30M (flag 24M) at approval?** Recommendation: yes. Full text,
   with what each answer builds, in the plan's "Rulings for Geoff" section.

Decision 7's `app.html` regex was flagged by the plan author as a possible taste call. It is not a
fork: keeping the two theme names gives a returning visitor's stale cookie a graceful fallback
instead of pinning them to the default block for up to a year, a behavioral trade with a clear
answer, and the plan keeps it as a decision.

## Second fold

Source: `2026-09-27-theme-pass-c-plan-fold-verification.md` (0 blockers, 3 majors, 5 minors).
Each claim was checked against the tree before folding. No task was added and no scope changed.

| ID | Disposition | Location |
| --- | --- | --- |
| V1 | Folded. Verified: `package.json:40` chains `package`, `check-surface.mjs`, and `check-surface-leaks.mjs`, and only `check-surface.mjs` reads `--update` (`process.argv.includes('--update')`, `:425`), so the npm-forwarded flag lands on the leaks script. Every regeneration now names `npm run package && node scripts/checks/check-surface.mjs --update`, which works whether or not the chores fix has merged. | Global constraints (the reference-entry bullet, with the reason); task 6 outcome; task 15 outcome |
| V2 | Folded. Verified: `runStatic` throws when the static scope (default `src/routes/admin` among its roots) and `static.cssFiles` are both empty (`run.ts:157-163`), before any rule runs. The fixture site gains one clean `src/routes/admin/+page.svelte`, and the report quotes each run's message. The throw stays unconditional. | Decision 20 |
| V3 | Folded. New task 0 item 9: after item 7's green baseline, the conductor pushes the swept head, opens the draft PR there, and one Haiku probe names that SHA's visual mismatches as the sweep's set before task 1. The boundary paragraph and the expected-red set point at it; the acceptance and stop list cover item 9. About 0.1M, not added to the table (see V5). | Segments paragraph; expected-red set; task 0 items 3, 7, 9 and acceptance |
| V4 | Folded. Verified: `examples/showcase/src/lib` holds only `log.ts`, and a configured root the tree lacks throws (`run.ts:54`). The repo-owned config names `src/theme`, `src/chassis`, `src/routes`, and `../../src/lib/public`. | Decision 27; task 7 outcome |
| V5 | Folded. The rows sum to 24.2M. The projection line, the "above the ceiling" sentence, and ruling 1's numbers are corrected: the 24M ceiling's flag trips around S2 (segment E), and 30M's 24M flag sits 0.2M under the projection, so on plan it trips in the release tail. The 30M recommendation stands. V3's 0.1M would bring the sum to about 24.3M, which does not change the ruling. | Token ceiling table and following sentence; Rulings for Geoff, ruling 1 |
| V6 | Folded. Erratum 1 now cites spec:58 and spec:313-315 (verified). | Owed errata, erratum 1 (this file) |
| V7 | Folded. The sweep dispatch re-emits the template and runs `check:template` when a showcase manifest changes, and files every refactor without taking one. | Task 0 item 3 |
| V8 | Folded. Decision 5 reads every focused `cairn-focus-ring` element on the pages it loads. | Decision 5 |
