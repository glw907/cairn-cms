# Theme identity pass B plan: review fold

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md`, reviewed at `07035110`
and folded on branch `theme-b-plan`. **Reviews:**
`2026-09-27-theme-pass-b-plan-review-contract.md` (C1 to C17),
`...-mechanics.md` (M1 to M11, O1 and O2), and `...-risk.md` (R1 to R14, O1 and O2, F1, F2, A1).

**Counts:** 49 findings. 40 folded, 1 refused, 8 ruled. Every blocker and major is folded or ruled.

**Method.** Each finding was checked against the tree before it was acted on. The checks:

- **`static.scope` replaces the defaults.** `config.ts:215` (`asPathList`) returns a configured list
  as is. `run.ts:64-72` fails the run on a configured root the tree lacks.
- **The guarded arm fires on the engine.** It fires four times in `EditPage.svelte`, and
  `stock-default-hazards.ts:139-143` records that the engine keeps the class there by design.
- **The guidance fences.** A probe parsed all 13 guidance fences with Svelte's parser, in
  `pb-fold/fences.mjs` under the session scratchpad. Five fail raw, and two still fail after
  normalization. The only retired pattern in a fence is `badge-ghost` at
  `exemplar-detail.md:115`.
- **The fifth grep.** Its pattern matches 14 live lines that the four existing greps miss.
- **The mermaid node.** It sits at `docs/extend/architecture.md:19`.
- **`norms.yml` never runs on push.** It runs only on `workflow_dispatch` and `workflow_call`.
- **The reviewer model is args-level.** `pass-execute.js` reads it at `:481` from
  `a.reviewerModel || cls.reviewerModel`, never from a task.
- **The reviewer prompt.** It carries only `criteria` (`:396`).
- **Vale.** `Cairn/Names.yml` has no `ignorecase`, and its message is the Go-tool one.
- **Pass C's stale topology text.** Pass C's header paragraph still reads "Pass A has merged to
  `main`" (`:34-36`). Its task 0 item 1 already carries the new topology.
- **`upgrade-cairn.md`.** It is a 71-line, version-free procedure.
- **The admin stylesheets.** The showcase and template `admin.css` scan only `./routes/admin`,
  under `source(none)`.
- **The headless flags.** `claude --help` confirms `--setting-sources`.

## Geoff's rulings (2026-09-27, binding)

- **F1 (ruled):** pass B's ceiling rises to 19M, with the flag at 15.2M. The close also drops its
  duplicate Opus read of the audit code (risk O1). Recorded in: the header "Token ceiling" and the
  projection (now about 13.5M); "Pass class"; task 8; "Rulings for Geoff".
- **A1 (ruled):** `stripe-trim-parity` and `unlayered-font-clobber` stay admin-only. The
  narrowing is accepted and disclosed, and it is permanent under pass C's one-scope-per-file rule.
  Recorded in: decision 9; "What pass C receives"; task 8's changelog and migration note.
- **F2 (ruled, the recommended default accepted without objection):** the three `0.98.0`
  promises are decided per rule at pass C's owner sitting, from measured finding counts on the
  five sites. Pass B lands `promotion-versions.test.ts`. It stays green on `0.97.0` and turns red
  on a `0.98.0` version commit. Recorded in: decision 13 (rewritten); task 3; "What pass C
  receives"; task 8's STATUS step.

## Contract lens

- **C1 (major, folded):** each task's `criteria` now carries four parts verbatim: its Outcome, its
  Acceptance, the full text of every decision it names, and the sentinel note. `notes` carries the
  plan path and the spec sections. Location: "Execution mode", "What each task's `criteria`
  carries". Task 1's header now names decisions 23 and 25, so they reach its reviewer.
- **C2 (major, folded; = R1 = M4):** fixed at the root in decision 23. The restore form sets
  `static.scope` to the default roots the site has plus `src/lib/components`. It says why: a list
  replaces the defaults, and a missing root fails the run. The same sentence goes into decision
  2, `cairn-audit.md` (task 1), the `Consumers must:` line and the migration note (task 8), and
  Review focus 2. Review focus 2 and `config.test.ts` pin three cases: the defaults, the restore
  form reading both roots, and the lone-root form leaving `src/routes/admin` unread.
- **C3 (major, folded):**
  - The probe now proves the audit read its output. Every `.svelte` file that `git status
    --porcelain` lists must sit under a scanned root, and `/admin/probe` must be among the
    rendered pages (decision 20, S1).
  - Task 5 adds a placement line to `cairn-admin-screens/SKILL.md` and `daisyui-first.md`.
- **C4 (major, ruled by F2):** the tripwire test replaces the STATUS-only watch. The
  `cairn-release` checklist step C4 proposed is not added: the test enforces the same trigger
  where it executes, and R11 moves every dotfiles edit to pass C.
- **C5 (minor, folded; = M8):** a fifth grep covers bare `components/` paths and `'components'`
  literals. It excludes daisyUI's group directory, and the insert dialog's plural UI string sits on
  the allowlist. The demoted `./components/...` keys in `admin-barrel-prune.test.ts` are
  repointed to `./admin/...` (decision 6, task 1 acceptance).
- **C6 (minor, folded; = R6):** task 1's reviewer runs on `claude-opus-5-5`, set through segment
  A's `reviewerModel`, since the runner reads the reviewer model per invocation. Four files are held
  at the `engine-logic` bar: `config.ts`, `reference-coverage.mjs`, `gate-tier.mjs`, and the new
  barrel test. Location: "Pass class", "Execution mode", "Models", task 1's header.
- **C7 (minor, folded; = M5 = R10):** a new "guidance tests" gate entry runs decision 14's test
  and the sync test in the light lane. It is a task check on task 5 and task 7. The file name
  `own-tree-and-guidance.test.ts` is fixed, so the checks can name it.
- **C8 (minor, folded):**
  - A fence may carry no retired pattern at all, and decision 14's test is the check.
  - A prose code span may name one as a pattern to flag or avoid.
  - Task 5 quotes a named grep and classifies each hit.
- **C9 (minor, folded):** each of the parent spec's two full recipes raises exactly one finding. A
  recipe arm takes precedence, and the `shadow-none` arm is silent where a recipe arm fired.
  `radius-scale` raises one finding per offending token, with a two-token fixture. Location:
  decisions 11 and 12, task 3 acceptance.
- **C10 (minor, folded):** both tests now have non-vacuity checks:
  - Decision 14's test asserts a nonzero file count and at least 13 fences.
  - The sync test fails on a missing heading or an empty table, naming the file.
  - It fails on a malformed row, naming the file and the row.
  - It requires the seven kit sections, and it reports every mismatch before failing.

  Location: decisions 14 and 19, task 6.
- **C11 (minor, folded):** a whitespace-only line counts as blank. The pre-mount fallback calls
  the pure function with the caret at the end of `value`. The unit table gains that row and a
  whitespace-only row, and the reviewer confirms both call sites. A component test for the
  pre-mount path was judged unneeded, since the table covers the case the fallback passes.
  Location: decision 10, task 2.
- **C12 (minor, folded):** every `radius-scale` and new-arm message is asserted to contain
  `0.99.0`. One table test covers all eight class-to-role mappings (task 3).
- **C13 (minor, folded, first half adjusted):** task 4's `norms:check` is dropped (see M3). The
  typo check asserts each Write-string token appears in the committed sheet inventory or in the
  theme-kit fixture's source. The reviewer suggested the sheet inventory alone. A recipe class
  compiled only by the showcase, such as a kit-only daisyUI modifier, would then fail falsely,
  and the theme-kit route is already proven to render (decision 15, task 4).
- **C14 (minor, folded):** the note now points at pass C's header paragraph "Branch topology"
  (`:34-36`). Task 0 item 1 already reads the new topology ("What pass C receives", task 8
  step 4).
- **C15 (minor, folded):** task 8's facts line lists one bullet per frozen-page fix.
- **C16 (minor, folded):** a positive `git grep` for `@glw907/cairn-cms/public` must print exactly
  the two preview routes, which were verified present (task 1 acceptance).
- **C17 (minor, folded):** only `src/lib/admin`'s place in `DEFAULT_ADMIN_SCOPE` is conditional.
  Location: decision 1, task 1 outcome.

## Mechanics lens

- **M1 (blocker, folded):** the test could not pass as written, and three fixes make it pass
  honestly:
  - **Scope.** Decision 14's test now asserts zero `radius-scale` findings, zero findings from the
    three new arms, and zero error-tier `stock-default-hazards` findings. One stated exemption
    remains, the guarded-retirement advisory. It fires on four `EditPage.svelte` controls, which
    the engine keeps by design, and its future is an F2 question.
  - **The fence strategy.** The test normalizes `{...}` and bare `...` lines and prefixes a
    TypeScript script tag. It fails a fence that still does not parse, and never skips one.
  - **The guidance repairs.** Task 3 repairs the two unparseable fences and replaces the
    `badge-ghost` fence line with `<StatusChip label="Archived" />`. The prose keeps `badge-ghost`
    in a code span. Task 3's Files gains both exemplar pages, and task 5's list gains
    `badge-ghost`.

  Task 0 item 4's false claim is corrected to the measured facts. The fix is correct because the
  repair keeps the test's full strength on every new rule and on the error-tier arms, and exempts
  only a finding whose tier is itself under ruling.
- **M2 (major, folded; = R3, C15-adjacent):** fixed at the root in decision 6. The greps gain a
  named rename allowlist of six items. Each is a line this plan requires to name the old path. The
  pathspec also excludes `ROADMAP.md` and `docs/STATUS.md`. The post-condition becomes "nothing
  outside the allowlist", with each remaining hit classified. The version record goes to
  `migration-notes.md` alone, and `upgrade-cairn.md` drops out of the close (task 8). Task 1's
  acceptance, the merge-forward step 3, and the branch close's step 3 and acceptance all use the
  same rule.
- **M3 (major, folded; = O1 = C13):** task 4's `norms:check` is dropped, and the Gates list now
  says no task runs it locally. Task 4 proves the manifest unchanged with `git diff
  --exit-code`. Segment B's boundary dispatches `norms.yml` on the branch for CI proof, since the
  workflow never runs on push.
- **M4 (major, folded; = C2 = R1):** folded with C2. It also removes "the admin scope" as a label
  for `static.scope`, and says "every non-`adminOnly` static rule" in Review focus 2 and task 1.
- **M5 (minor, folded; = C7 = R10):** see C7.
- **M6 (minor, folded):** `radius-scale` covers `rounded-(--x)` and its side forms, and a role
  variable names its role class. The shorthand fixtures sit in task 3, and Review focus 5 names it
  (decision 11).
- **M7 (minor, folded; with R8):** merge-forward step 2 names git's `CONFLICT (file location)`
  and its resolution. Step 3 adds `test ! -e src/lib/components`.
- **M8 (minor, folded; = C5):** see C5. Decision 6 lists every form M8 named.
- **M9 (minor, folded):** the tokens move to two new rule files,
  `Cairn/ComponentNames.yml` (error) and `ComponentNamesRetired.yml` (warning). Both are
  `ignorecase`, and each message points at the Names grid. `.vale.ini` already loads the whole
  style. Task 1's Vale proof includes a sentence-initial token (decision 8, task 1).
- **M10 (minor, folded; = R2):** see R2. It also names the two environment flags.
- **M11 (minor, folded):** task 3's Files cites `cairn-audit.md:73` and `:31` as changing and `:275`
  as unchanged. Task 0 re-verifies all three.
- **O1 (over-ceremony, folded):** same as M3.
- **O2 (over-ceremony, refused):** trimming task 1's local e2e to `preview.spec.ts` saves little.
  The leg's cost is dominated by the one showcase build, which any spec count pays. The four
  dropped specs are the likeliest to catch the rename's breaks locally: `custom-screen`,
  `theme-kit`, `admin-sheet` (the sheet's new `dist/admin/` path), and `golden-path`. They catch
  those breaks before a push and re-dispatch cycle.

## Risk lens

- **R1 (major, folded; = C2 = M4):** see C2. R1's "add it under `static.adminScope` too"
  suggestion appears as the note that the motion rules read that separate key.
- **R2 (major, folded; = M10):** decision 20 and S1 are rewritten:
  - **Emit.** The template is emitted from packed tarballs into a probe directory under the
    session scratchpad, outside `~/Projects`, using `scaffold.yml`'s recipe. `npm pack
    --pack-destination` keeps the tarballs out of the worktree.
  - **Probe.** The probe runs headless as `claude -p --model sonnet --setting-sources
    project,local` in that site, so it loads only the template's `CLAUDE.md` and `.claude/`.
  - **Serve.** The audit serves the site with `VITE_CAIRN_E2E=1` and `CAIRN_DEV_BACKEND=1` on port
    4391.
  - **Limit.** Any user-scope context that still loads is recorded as the probe's stated limit.
- **R3 (major, folded; = M2):** see M2.
- **R4 (major, ruled by F2):** the tripwire is landed as R4 proposed. See decision 13 and "What
  pass C receives".
- **R5 (major, folded):** decision 25 adds `@source "./lib/admin";` to the showcase's `admin.css`,
  and through `emit:template`, to the template's. Task 1 proves the compiled admin CSS
  byte-identical before and after. The `Consumers must:` line's move branch names the same line
  for a site's own stylesheet.
- **R6 (minor, folded; = C6):** see C6.
- **R7 (minor, folded):** part 4 of the line covers any path into `dist/components/`, whether an
  audit config's `sheet` (including a `--config` file) or a site script. The
  `verify-chip-registers.mjs:55` example was verified (decision 23, task 8).
- **R8 (minor, folded; with M7):** the conductor resolves only STATUS, HISTORY, and the plan
  ledger. Any other conflict aborts the merge and goes to one `cairn-implementer` (class `sweep`).
- **R9 (minor, folded):** grep 3 also matches `<code>/components</code>` (decision 6, task 1).
- **R10 (minor, folded; = C7 = M5):** see C7.
- **R11 (minor, folded):** pass B makes no dotfiles edit. Pass C's close repoints
  `cairn-release/SKILL.md:107` in its existing dotfiles commit (decision 24, "What pass C
  receives", task 8).
- **R12 (minor, folded):** "What pass C receives" carries a cairn-pub redirect from
  `/docs/reference/components` to `/docs/reference/admin` at the `0.98` pin bump.
- **R13 (minor, ruled by A1):** see A1.
- **R14 (minor, folded):** task 0 item 4 re-verifies every plan fact in a file that pass A changed
  after `1486f3f7`. That includes the theme-kit fixture's line count and its template exclusion
  (`cfab5c4c`).
- **O1 (over-ceremony, ruled by F1):** the close's Opus audit read is dropped.
- **O2 (over-ceremony, ruled by F1):** the ceiling is 19M and the flag 15.2M, against a projected
  13.5M.
- **F1, F2, A1 (ruled):** see "Geoff's rulings".

## Refusals

One refusal, mechanics O2, with the reason given above. Most findings were folded because
verification confirmed them. Every blocker and major reproduced against the tree, and the
convergent ones were found independently by two or three lenses. The minors were cheap, testable
tightenings of the plan's own acceptance. C13's typo check and C11's pre-mount coverage were
folded in adjusted forms, and the reasons are given at each.

## Owed errata to the approved spec

The spec stays unedited. These changes to its meaning are owed at the next spec touch, or recorded
in pass B's HISTORY entry:

1. **Pass B spec, "The audit scopes" and "Consumers must" (`:85-99`).** "Name that root under the
   admin scope" becomes "set `static.scope` to the default roots the site has plus
   `src/lib/components`", with two reasons stated: a configured list replaces the defaults, and a
   configured root the tree lacks fails the run. The move branch also names the `@source
   "./lib/admin";` line the site's admin stylesheet needs. Part 4 covers any path into
   `dist/components/`, not only a config's `sheet`. The four parts are unchanged.
2. **Pass B spec, "The audit scopes":** removing `src/lib/components` from the defaults also removes
   `stripe-trim-parity`'s and `unlayered-font-clobber`'s reach over a site's public components.
   Under Geoff's A1 ruling that narrowing is permanent. The spec implies it and never states it.
3. **Pass B spec, "Proof", probe 1 (`:448-450`):** "a fresh Sonnet agent given only the shipped
   guidance" is realized as a headless `claude -p` session in an emitted template outside the
   repo. The probe now has the same "scanned set includes every file the probe created or edited"
   criterion that probes 2 and 3 have.
4. **Parent spec, "Corners" and "The markup sweep" post-condition pattern:** `radius-scale` also
   flags Tailwind v4's `rounded-(--x)` variable shorthand, which the pattern omits.

## Second fold (2026-09-28)

Source: `2026-09-28-theme-pass-b-plan-fold-verification.md` (0 blockers, 1 major, 3 minors). All
four are folded; each was checked against the tree first, and each command written into the plan
was run in the session scratchpad.

1. **Major, vacuous scanned-root check (decision 20, S1): folded.** Confirmed: in a scratch repo, a
   probe that adds `src/routes/admin/probe/+page.svelte` and `src/lib/components/Chip.svelte`
   shows `?? src/routes/admin/probe/` and `?? src/lib/components/` under plain
   `git status --porcelain`, with no `.svelte` path. The plan now reads the probe's changes from
   `git ls-files -mo --exclude-standard` (setup step, Pass clause, S1 outcome), and the Pass
   clause and S1 acceptance require the list to be nonempty and to contain
   `src/routes/admin/probe/+page.svelte`. Proven: the probe tree lists all three changed files;
   a clean tree fails "changed no files"; a tree with only `Chip.svelte` fails "no /admin/probe
   route file".
2. **Minor, probe command (decision 20): folded.** The brief moves to `<probe dir>/brief.txt`,
   written with a quoted heredoc and fed on stdin; the file sits outside the site so it never
   reads as a probe change. Proven with the plan's exact flag set on Haiku: a brief carrying
   `` `/admin/probe` `` came back verbatim, exit 0.
3. **Minor, tripwire floor (decision 13): folded.** The floor becomes at least one constant, plus
   the two constants this pass adds, now named `RADIUS_SCALE_PROMOTION_VERSION` and
   `RETIRED_PATCH_PROMOTION_VERSION`, by name while the package version is below `0.99.0`. The
   version leg is unchanged, so the `0.98.0` version commit still reds on any undecided `0.98.0`
   constant, and pass C may delete a promoted one without tripping non-vacuity. The by-name leg
   lapses at `0.99.0`, when those two constants are themselves due for promotion or re-dating.
   Neither name exists in `src/` today.
4. **Minor, allowlist item 1 (decision 6): folded.** Confirmed: `readScope` (`run.ts:44`) walks
   the roots and `config.ts` only resolves the list (`asPathList`, `:157`, `:215`). Item 1 now
   covers `config.test.ts` or `run.test.ts`. Review focus 2 and task 1's acceptance, which named
   `config.test.ts` alone for the three cases, are widened to match, so the allowlist and the
   acceptance agree.
