# Theme identity pass B plan review: domain risk lens

**Target:** `docs/superpowers/plans/2026-09-27-theme-identity-pass-b.md` at `07035110`
(branch `theme-b-plan`), against the pass B spec and its parent spec.
**Lens:** what the pass could break for the production sites, the Waymark template, cairn.pub,
and the single `0.98.0` release that carries passes A, B, and C. Proportionality is checked too.
**Method:** read the plan, the spec, `CLAUDE.md`, and the pass-core class table. Verified against
the tree at `07035110`, `theme-identity-a` (head `cfab5c4c`), `theme-c-plan`'s plan, the five
consumer checkouts under `~/Projects`, `~/.dotfiles`, and CI workflows. Ran Tailwind 4.3.3 once
in the scratchpad to settle R5's premise.

**Counts:** 0 blocker, 5 major, 9 minor, 2 over-ceremony, 2 owner forks, 1 architecture.

## Where the plan is sound (verified, not assumed)

- **The clean break reaches no site by accident.** The site ranges are `^0.95.0` (ecxc-ski),
  `^0.84.4` (907-life), `^0.96.0` (aksailingclub-org, xcathletes-org), and `0.94.0-rc.1` pinned
  (cairn-pub). Under 0.x caret semantics none of them admits `0.98.0`, so the `./components`
  removal breaks a site only when its owner bumps the dependency on purpose. Every site does
  import `./components` (`CairnAdminShell`, `CairnAdmin`, `CsrfField`, and `PreviewBanner` on two
  sites), so the `Consumers must:` line's first two parts are the right ones.
- **Decisions 1 and 9 change nothing on any site today.** No site has `src/lib/components` or
  `src/lib/admin`. Waymark keeps public components in `src/theme/components`, which no static
  scope reads. The narrowing and the new motion-rule root affect only future trees, and the
  plan discloses both.
- **The old sheet path fails loudly.** The template, the showcase, and the shipped snippet all name
  `node_modules/@glw907/cairn-cms/dist/components/cairn-admin.css` under `sheet`. A missing sheet
  path is a hard config error, and Review focus 1 pins that behavior.
- **Stale shipped guidance has a standing fix.** `upgrade-cairn.md` step 4 already tells a site
  to run `npx cairn-guidance install` on every upgrade. The template's `.claude/` copies are
  regenerated through `emit:template`, and grep 4 catches the `components.md` pointer in
  `templates/waymark/.claude/cairn/CLAUDE.md:23`.
- **Nothing else outside the audit and docs names the old paths.** The Go doctor keys on the name
  `CairnAdminShell`. `packages/*` names no old path. Under `src/lib`, only audit config and
  comments do. The frozen-page list (three `docs/extend` pages) matches what I found by grep.
  `draft-docs-0` adds no old-path reference.
- **Advisory tiers are safe on sites.** `cairn-audit` exits 1 only on an error-tier finding
  (`bin.ts:5-7`), so `radius-scale` and the three new arms cannot turn a site's `check:cairn` red
  before `0.99.0`.
- **The charter holds.** The pass adds no surface that belongs to a site. `./public` is spec-settled,
  `ROLE_RECIPES` is internal, and the insert fix is core editor behavior. No consumer calls
  `EditorApi.insert`.
- **The topology works at the git level.** Pass C's plan continues the merge-forward from pass A at
  its close (`theme-c-plan` plan `:1520-1521`). `run.ts:99` matches roots with a trailing slash,
  so `src/lib/admin` never swallows `src/lib/admin-toolkit`. Decision 4 uses the slash form too.

## Findings, ranked by consequence

### R1. Major. The restore instruction silently narrows a site's audit if followed literally

`plan:965-970` (task 8's `Consumers must:`), decision 23 (`plan:432-435`), Review focus 2
(`plan:536-538`).

The line says "name `src/lib/components` under the admin scope (`static.scope`)". Two facts break
this. First, `static.scope` replaces the defaults (`config.ts:215`, `asPathList` returns the
configured list). A site that writes `"scope": ["src/lib/components"]` therefore drops
`src/routes/admin` from every static rule, with no message. Second, a configured root the tree
lacks throws (`staticScopeFromConfig`), so copying the full default list fails on a site without
`src/lib/admin`. The config also has a separate `static.adminScope` key, so calling `static.scope`
"the admin scope" misleads.

**Fold:** reword the fourth part and the migration note along these lines: "or list it under
`static.scope` together with each default root your site has (`src/routes/admin`, and
`src/lib/admin` or `src/lib/admin-toolkit` where they exist). A configured list replaces the
defaults, and a root that does not exist fails the run. Add it under `static.adminScope` too if
the motion rules should read it." Extend Review focus 2's `config.test.ts` case to assert that
naming only `src/lib/components` leaves `src/routes/admin` unread. That test pins the documented
trap.

### R2. Major. Probe 1 cannot prove "only the shipped guidance"

Decision 20 (`plan:413-422`), S1 (`plan:925-937`).

The probe runs as a subagent of the conductor in a worktree of the engine repo, and works in
`examples/showcase`. Three leaks follow:

- A subagent inherits the conductor project's `CLAUDE.md`, which points at
  `docs/internal/admin-design-system.md` and carries the DaisyUI-first rule.
- `docs/internal/**` is readable on disk.
- The showcase holds `/admin/theme-kit`, a near answer key for the brief (segmented control, form,
  switch, chip, card). Pass A's `cfab5c4c` ("keep the theme-kit fixture out of the Waymark
  template") confirms that a site never receives it.

A pass on this probe would not show that the guidance teaches the look.

**Fold:** emit the template into a scratch directory outside the repo, the way `scaffold.yml` does
with packed tarballs (`emit-template.mjs <dir> file:<engine.tgz> file:<dev.tgz>`). Run the probe
as a headless `claude -p` process with that directory as its working directory, so it loads only
the template's `CLAUDE.md` and `.claude/`. Brief it for `src/routes/admin/probe`. The audit agent
serves that site's preview on 4391 with `CAIRN_DEV_BACKEND=1` (the `norms.yml:55` pattern), since
without it every page redirects to login and the redirect trap exits 2.

### R3. Major. The close writes old-path text into a page the acceptance greps cover

`plan:974-977` and `plan:1015`.

Task 8 writes "the same four actions, the old subpath named" into both `migration-notes.md` and
`upgrade-cairn.md`. The spec's exclusion list covers only `migration-notes.md`. As a result, the
close's own acceptance ("the four rename greps empty on the final head") fails on
`upgrade-cairn.md`. The page is also the wrong home. It is a 71-line generic procedure with no
version sections, and its steps 3 and 4 already send a reader to the `Consumers must:` lines and
the guidance refresh.

**Fold:** drop `upgrade-cairn.md` from the close's list. The four actions live in
`migration-notes.md` under `## Unreleased`, the heading the `0.97.0` window used.

### R4. Major. The three `0.98.0` promises reach the release only through a STATUS watch

Decision 13 (`plan:357-365`), "What pass C receives" (`plan:447-479`).

Three constants name `0.98.0`: `log-event-grammar.ts:20`, `log-secret-field.ts:25`, and
`stock-default-hazards.ts:45`. Each finding message says it stays advisory "until 0.98.0 promotes
the finding to error". Pass C's plan cuts `0.98.0` (`theme-c-plan` plan `:1533-1540`) with no step
for these promises. Unless someone acts, the release ships messages that contradict themselves.
`CLAUDE.md`'s watch-item rule turns a machine-detectable condition into a test, and prose is only
the fallback. Decision 13 rejects the tripwire because it "would red pass C's release commit".
That red is the forcing function this case needs, and pass C's S3 owner sitting comes before
its cut.

**Fold:** land the version tripwire now. It stays green on B, since `package.json` stays
`0.97.0`. Add a "What pass C receives" bullet saying the `0.98.0` cut must promote or re-date
all three, and ask that pass C's S3 combined question carry the choice (see F2). The `0.99.0`
constants this pass adds fall under the same test.

### R5. Major. The migration's sanctioned home for custom admin components is not compiled

The Names grid, `plan:705-711`. The `Consumers must:` line's third part.

The template's `src/admin.css` scans `@source "./routes/admin"` only, and it imports utilities
with `source(none)`. A site that follows the line and moves custom admin components into
`src/lib/admin` gets no compiled utility that appears only there. `no-uncompiled-class` then
fails its `check:cairn`, and the message does not point at the missing `@source`.

**Fold:** in task 1, add `@source "./lib/admin";` to `examples/showcase/src/admin.css`, which
reaches the template through `emit:template`. I checked the premise on Tailwind 4.3.3: an
`@source` path that does not exist is ignored without error, and scanning still works, so the
showcase's compiled sheet stays identical and no render moves.

### R6. Minor. Task 1's review bar is lighter than its behavior changes

`plan:45-47` and `plan:93-94`.

The `sweep` class means a Sonnet reviewer and "existing tests stay green". Task 1 also changes
consumer-facing audit defaults (decisions 1 and 9), adds a public subpath, adds a second barrel
to the reference-coverage props check, and edits the gate classifier. These are the pass's only
silent-narrowing risks.

**Fold:** keep the `sweep` gate and run task 1's `diff-reviewer` on `claude-opus-5-5` at the
`engine-logic` bar. The extra cost is small.

### R7. Minor. The `Consumers must:` line names one channel for the old dist path

`plan:965-970`.

A sheet path can also come from a config file passed with `--config` (`config.ts`, the argv
parser). Site scripts can also read the dist layout directly, for example
`aksailingclub-org/scripts/verify-chip-registers.mjs:55`.

**Fold:** widen the fourth part to "any path into `@glw907/cairn-cms/dist/components/` (an audit
config, including one passed with `--config`, or a script) becomes `dist/admin/`".

### R8. Minor. The merge-forward protocol has no resolver for a code conflict

`plan:154-167`.

Step 2 resolves STATUS, HISTORY, and the ledger only. A pass A edit to a line that task 1
rewrote conflicts, for example a path-bearing comment or the barrel header. So does a new
pass A file under the old folder, because git's default `merge.directoryRenames=conflict`
stops the merge rather than leaving the file in place. The conductor stays thin and must not
resolve source by hand.

**Fold:** on any conflict outside those three files, run `git merge --abort`, then dispatch one
`cairn-implementer` (class `sweep`) to perform the merge and resolve it. Step 3's greps and
step 4's gate follow.

### R9. Minor. A fifth blind form escapes the four greps

`plan:719-726`.

`docs/extend/architecture.md:19` carries `<code>/components</code>` inside a mermaid node. None of
the four greps matches it, and cairn.pub renders this frozen page.

**Fold:** widen grep 3 to ``(`|<code>)\.?/components(`|</code>)``.

### R10. Minor. Task 5 asserts a unit test its gate never runs

`plan:897-899`.

"Decision 14's test still passes" has no command, because the docs string runs no vitest.

**Fold:** add `npx vitest run --project unit <decision 14's test file>` to task 5's gate. It
stays in the light lane.

### R11. Minor. The dotfiles edit takes effect before `main` has the new folder

Decision 24, `plan:988-990`.

A user-scope skill is live the moment it is committed. Repointing `cairn-release:107` to
`src/lib/admin/*.svelte` at pass B's close means any cut from `main` before pass C merges
(a hotfix, say) reads an admin-surface path that `main` lacks.

**Fold:** make the edit at pass C's close, which already edits `cairn-release` for the
audit-count step. If it stays in pass B, name both paths until the merge.

### R12. Minor. cairn.pub loses `/docs/reference/components` at the `0.98` pin bump

cairn.pub derives routes from the tarball's files, so the old URL returns 404 once it pins
`0.98.0`. The engine needs no change.

**Fold:** the close files a cairn-pub carry-forward (a redirect to `/docs/reference/admin` at the
pin bump) in STATUS's handoff to pass C, the pass that cuts `0.98.0`.

### R13. Minor. After pass C, the two Tailwind-general rules stop reaching public roots

This is decision 9 (`plan:314-320`), carried forward. See A1.

### R14. Minor. The pass A worktree was active during this review

`theme-identity-a` committed `cfab5c4c` minutes before this review. Task 0 item 1's stop
condition covers this. Re-verify each plan-time fact that pass A's late commits touch, among them
the theme-kit fixture's emit exclusion and its line count (`plan:603-605`).

## Over-ceremony

- **O1.** The close's Opus `general-purpose` read of `radius-scale`, the arms, and the recipe
  source (`plan:955-958`) repeats the Opus `diff-reviewer` reads that tasks 3 and 4 already run
  against the same parent-spec sections. Drop it, or limit it to cross-task interplay (the rule
  against the recipe rows). This saves about 0.2M.
- **O2.** The projection of 13.3M sits 2% under the 13.6M flag (`plan:99-122`). The 80% question
  will very likely fire and stop a run meant to go without the owner. See F1.

## Owner forks

- **F1. The token ceiling (budget).** (a) Raise the ceiling to about 19M, which puts the flag near
  15.2M and clears the projection with margin. (b) Keep 17M and accept a likely mid-run stop at a
  segment boundary. (c) Keep 17M and apply O1. **Recommendation:** (a) with O1. The pass is
  planned to run unattended, and a budget question is a real interruption of the owner.
- **F2. The three `0.98.0` promises at the cut (release).** (a) Promote all three to error in
  `0.98.0` as the shipped messages say. (b) Re-date all three to `0.99.0` with a disclosed
  changelog line. (c) Promote each rule the five sites already report zero findings on, and
  re-date the rest. **Recommendation:** (c), decided at pass C's S3 from measured site counts.
  Pass B's only job is R4's fold, so the question reaches that sitting through a test and not
  only through STATUS.

## Architecture

- **A1. Should the Tailwind-general static rules also run in pass C's public scope?**
  `stripe-trim-parity` and `unlayered-font-clobber` justify their reach by a site's public
  components (`stripe-trim-parity.ts:13-16`, `unlayered-font-clobber.ts:9-14`). Pass B removes
  that reach. Pass C's one-scope-per-file rule then makes the loss permanent: a site that follows
  decision 9's restore takes `src/lib/components` out of the public defaults. It trades the public
  rules for the two general ones and cannot keep both. The spec settles which three rules the
  public scope runs, but it never asks this question. The consequence today is low, since
  Waymark sites keep public components in `src/theme`, which neither scope has read.
  **Recommendation:** pass B adds this question to "What pass C receives" and records it as a
  `ROADMAP.md` item. Pass C's task 7 decides whether the public scope also runs the two rules. No
  change to pass B's scope.
