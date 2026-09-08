# Adversarial review: `docs/superpowers/plans/2026-09-07-chassis-b-pass.md` and the spec's Chassis-B section

Four read-only lenses run in parallel on 2026-09-07 (Opus 5, fresh context each), against `main` at `fece567c` with chassis-A at Task 4 of 12 in its worktree. Grounding, risk and boundary, and hygiene and sizing repeat chassis-A's round; visual method and gate integrity is new for a changed-by-design pass. The fold brief and the folded plan follow in the same record directory. Write-once.

---


Objects: `docs/superpowers/specs/2026-09-04-chassis-passes-design.md` ("Chassis-B", "Out of
scope for both", "Risks") and `docs/superpowers/plans/2026-09-07-chassis-b-pass.md`.
Read-only, against `main` at the session head plus `.claude/worktrees/chassis-a` (five commits
landed: A's Tasks 1-4). Shape and rigor follow the chassis-A round (`spec-review.md`,
`plan-review.md`); a finding that undoes a correction those reviews already made is marked
REGRESSION. None is: see "Prior corrections held" at the end.

Findings are ranked within the lens, most consequential first.

---

## G1. Task 10 cannot pass: the showcase has no access map, and the dev backend never attaches one

**Claim** (plan, Task 10 Files): "`src/routes/admin/signups/+page.server.ts` (both actions through
`createSectionAction` per `docs/extend/add-a-custom-admin-screen.md`; the `load` through
`requireAccess` as the doc pairs it ...)".

**Evidence.**

- `src/lib/sveltekit/section-action.ts:288-291`: `const access = siteEvent.locals.cairnAccess; if
  (access === undefined) return misconfigured('rejected: access map not attached',
  'access_map_not_attached');`, and `misconfigured` returns `fail(500, ...)`
  (`section-action.ts:223-227`).
- `src/lib/sveltekit/admin-action.ts:120-129` (`authorizeAdminTarget`): `if
  (!hasAccessRule(access, opts.target)) return { outcome: 'no-rule' };` **before** any capability
  test. There is no owner bypass at that stage.
- `src/lib/auth/access.ts:182-190` (`hasAccessRule`): `if (!access) return false;` and otherwise
  `Object.hasOwn(access, target)`.
- `src/lib/sveltekit/guard.ts:194` sets `event.locals.cairnAccess = access ?? {}`, but the
  showcase never runs that guard under e2e: `examples/showcase/src/hooks.server.ts:18-20` replaces
  the whole handle with `devBackendHandle()`.
- `packages/cairn-cms-dev/src/handle.ts:128-137` sets **only** `event.locals.cairnEditor`. A grep
  for `cairnAccess` across that file returns nothing.
- `examples/showcase/src/theme/cairn.config.ts` declares no `access` / `defineAccess` /
  `defineRoles` (grep returns zero hits).

So under the showcase's own e2e build: `createSectionAction`'s wrapped `create`/`remove` return
`fail(500)` ("access map not attached"), and `requireAccess(event)`
(`src/lib/sveltekit/guard.ts:302-310`) throws `error(403)` for **every** editor including the
owner, because `hasAccessRule(undefined, '/admin/signups')` is false. `e2e/custom-screen.spec.ts`
goes red, and Task 9's `/admin/signups` baseline captures a 403.

**Correction.** Either (a) add `examples/showcase/src/theme/cairn.config.ts` to Task 10's Files
with an `editor.access` map naming `/admin/signups`, AND
`packages/cairn-cms-dev/src/handle.ts` to attach `locals.cairnAccess` from the adapter (which the
plan's "No engine code changes" constraint currently forbids, so the constraint has to be
amended and the dev package's own tests updated); or (b) drop the `requireAccess` half, adopt
`createSectionAction` only, and still do (a)'s dev-handle half, since the wrapper's
access-map-absent branch bites regardless; or (c) leave the raw shape and move the adoption to
the pass that can change the dev package. Whichever is chosen, state it as a ruled input, because
the current text reads as a drop-in.

## G2. Task 10's new e2e case ("the 403 branch for a non-owner through the access map, driven the way `access-map.spec.ts` mints roles") has no mechanism

**Claim** (plan, Task 10 Files and Step 1): "`e2e/custom-screen.spec.ts` (test-first: ... plus one
new case for the behavior adoption makes reachable, the 403 branch for a non-owner through the
access map, driven the way `access-map.spec.ts` mints roles)".

**Evidence.**

- `packages/cairn-cms-dev/src/handle.ts:129-137`: "The dev backend always mints an owner session,
  so capability is the literal 'owner'". The role and capability are hard-coded literals with no
  env, cookie, or header override anywhere in the file.
- `examples/showcase/e2e/access-map.spec.ts:1-45` does not mint a browser session at all. Its own
  header says so: "canReach is pure, so no page or browser fixture is needed". It imports
  `defineRoles`/`defineAccess`/`canReach` from the package and asserts on return values. There is
  no role-minting a browser spec could copy.

An HTTP 403 from a non-owner is unreachable in the showcase e2e without new dev-backend
machinery.

**Correction.** Replace the case with one the tree can drive: either a pure assertion in the style
of `access-map.spec.ts` (that the showcase's declared access map denies a non-owner role for
`/admin/signups`), or a unit test against `authorizeAdminTarget`. If a real 403 round-trip is
wanted, name the dev-package change that makes the minted role configurable and price it as its
own task.

## G3. Task 8's `site.css` gate extension names three literals the gate cannot see, and misses the one it will fail on

**Claim** (plan, Task 8 Files): "`scripts/checks/check-public-tokens.mjs` (`site.css` joins the
scanned set at about `:79`; the literal scan and the resolution check both read it),
`src/theme/site.css` (the three size literals at about `:140`, `:193`, `:194` tokenized ...)" and
the acceptance criterion "`site.css` inside both halves of `check:public-tokens` and green".

**Evidence.**

- `scripts/checks/check-public-tokens.mjs:47` (`COLOR_LITERAL`) and `:60-62`
  (`ARBITRARY_FONT_SIZE`, `FONT_SIZE_DECL`) are the only two rules the literal scan applies. It
  bans literal **colours** and absolute **font-sizes**. Nothing else.
- The three named lines are `examples/showcase/src/theme/site.css:140` `max-height: 32rem;`,
  `:193` `border-left: 3px solid var(--cairn-info-ink);`, `:194` `border-radius: 0.25rem;`.
  None is a colour and none is a font-size, so none is a violation under either rule. Fixing them
  moves the gate not at all.
- Running the gate's own two regexes over `site.css` returns exactly one hit: **`:34`
  `font-size: clamp(1rem, 0.7631rem + 0.2631vw, 1.125rem);`**, the root fluid-type formula,
  whose own comment at `:24-32` explains it as the deliberate intercept-and-slope constant. The
  plan never mentions it.

So the task as written both does busywork and walks into a red gate on an unmentioned line that
cannot be "tokenized" (it is the definition of the root rem).

**Correction.** Rewrite the Task 8 item as: add `site.css` to `scannedFiles` (`:79`) and decide
`:34` explicitly, either exempt `html { font-size }` in the rule with a stated reason (site.css
becomes a partial definitions layer, the same argument `theme.css` and `tokens.css` already carry
at `:66-67, 80-81`), or exclude the `html` rule by name. Drop `:140`, `:193`, `:194` from the gate
justification; if they are still wanted as tokens, say plainly that this is hygiene the gate does
not enforce. The acceptance criterion should name what makes `:34` green.

## G4. Task 8 changes `checkTokenResolution`'s signature and breaks its second caller, which is not in the Files list

**Claim** (plan, Task 8): "the literal scan and the resolution check both read it".

**Evidence.** `checkTokenResolution(themeCss, proseCss, chassisTokensCss)` is exported at
`scripts/checks/check-public-tokens.mjs:579`. Adding `site.css` to the `sources` array
(`:588-591`) means a fourth parameter. The function has a second caller outside the gate:
`scripts/lab/reskin-fixture.mjs:136-140` calls it with exactly three arguments. Task 8's Files
list does not include `scripts/lab/reskin-fixture.mjs`.

Note also that `src/tests/unit/check-public-tokens.test.ts:5-10` imports four other exports and
not this one, so the unit suite would not catch the break; `scripts/lab/reskin-fixture.mjs` is
run by the `design.yml` workflow, not by the per-task gate.

**Correction.** Add `scripts/lab/reskin-fixture.mjs` to Task 8's Files and its Step 1, or make the
new parameter optional with a documented default. Say which, and add `design.yml`'s fixture run
to the pass-end CI-only gate list by name.

## G5. Task 5 puts `footerNav` in the wrong layout load, and that file no longer ships to the scaffold

**Claim** (plan, Task 5 Files): "`src/routes/(site)/+layout.server.ts` (passes `footerNav` if the
header's path is through `page.data`)".

**Evidence.**

- `primaryNav` is loaded by the **root** `examples/showcase/src/routes/+layout.server.ts:13-18`,
  not the `(site)` one. That file's own header says why: "the primary nav SiteHeader renders (both
  mounts of it: the (site) group's layout and the root `+error.svelte`, which sit above and beside
  that layout respectively, so only a root-level load reaches both)".
- `SiteFooter.svelte` is imported by both `src/routes/(site)/+layout.svelte:40` and
  `src/routes/+error.svelte:17`. A `(site)`-scoped load never reaches the error page, which is
  exactly the surface Tasks 3 and 9 baseline.
- Worse, chassis-A Task 4 has already landed (`b126d892`): `.cairn-template.json`'s exclude list
  now carries `"src/routes/(site)/+layout.server.ts"`, and
  `templates/waymark/src/routes/(site)/` no longer contains the file. Site identity wired there
  would not exist in any scaffolded site.

**Correction.** Replace the file with `src/routes/+layout.server.ts` and have its `load` return
`{ hasIslands, nav: primaryNav, footerNav }`. State that the `(site)` layout server is now a
template-excluded fixture and must not gain product wiring.

## G6. Task 5's `siteConfig.siteName` in the two chrome components ships the YAML parser to the browser

**Claim** (plan, Task 5 Files): "`src/theme/components/SiteHeader.svelte` and `SiteFooter.svelte`
(the wordmark reads `siteConfig.siteName`)".

**Evidence.** `siteConfig` is `parseSiteConfig(siteYaml)` in
`examples/showcase/src/theme/site-config.ts:10`, and `parseSiteConfig` lives in
`src/lib/nav/site-config.ts`, whose first import is `import { parse as parseYaml, parseDocument }
from 'yaml'` (`:5`). Importing `$theme/site-config.js` from a `.svelte` component pulls
`parseSiteConfig`, the raw YAML string, and the `yaml` package into the client bundle. The root
layout server's header comment (`+layout.server.ts:1-12`) records this as the deliberate reason
the nav is read server-side: "SvelteKit never ships a `+layout.server.ts` module (or anything it
imports) to the client". `SiteHeader.svelte:63-64` correspondingly reads `page.data.nav`.

**Correction.** Route `siteName` through `page.data` from the root layout server load, alongside
`nav` and `footerNav`, and say in the task that a direct `siteConfig` import into a `.svelte`
component is forbidden for this reason.

## G7. Task 7's `admin-office-*` enumeration is false: the office list paginates at ten rows

**Claim** (plan, Task 7 Step 2): "enumerate: ... `admin-office-*` grows by thirteen rows; nothing
else moves." (Inherited from the chassis-A plan review's own G2 point 3, which asserted the same.)

**Evidence.** `e2e/admin-visual.spec.ts:11-22` screenshots `/admin/posts`. That screen renders
`ConceptList.svelte`, which paginates client-side: `:66` `let pageSize = $state(10);`, `:178`
`pageCount = Math.ceil(sorted.length / pageSize)`, `:183` `pageRows = sorted.slice((page - 1) *
pageSize, page * pageSize)`. `e2e/golden-path.spec.ts:50` records the same fact in prose ("The
list paginates at ten rows newest-first"). Going from 14 to 27 posts leaves the visible row count
at ten; what moves is the entry counter and the pager's page count.

Because a baseline that moves for an unenumerated change is a stop-and-report under the plan's own
global constraint, this wording will halt the task.

**Correction.** Rewrite as: "`admin-office-*` moves only in the list's count line and pagination
control; the visible row count stays at ten (`ConceptList.svelte:66`)."

## G8. The 404's renderability is asserted as a known expectation in Task 1 and left open in Task 9, and Task 3 depends on the answer

**Claim** (plan, Task 1 Step 1): "record ... which surfaces wrote `.missing` (the 404 under `vite
preview` and `/archive/2` at page size 50 are the expected two; a third is a finding)". Task 9
Step 1 then says "determine whether the root `+error.svelte` renders under `vite preview` for an
unmatched path (Task 1's before set says)". Task 3 Step 1 requires before/after captures of
`error404`.

**Evidence.** The `/archive/2` half is verified true:
`examples/showcase/src/chassis/archive.ts:10` is `ARCHIVE_PAGE_SIZE = 50`, the home paginates
`entries.slice(1)` = 13 entries (`(site)/+page.server.ts:15`), so `totalPages` is 1 and
`archive/[page]/+page.server.ts:27-29` throws `error(404)` for any requested page whose clamp does
not match. Correct.

The 404 half is unsourced. The banked inputs (`chassis-b-inputs.md`) never establish it; grepping
that document for "vite preview" and "404" turns up only the recorded finding that the 404 has no
baseline, never a claim that it does not render. SvelteKit's own preview server runs the SSR
`respond` for an unmatched path and returns the app's rendered error page, so the likely truth is
the opposite of what the plan pre-declares, in which case Task 1 would record an expected
`.missing` that never appears, and a real missing capture in a later task would read as expected
rather than as a finding.

Task 3 makes this load-bearing: it adopts `.cairn-band` on the error page's message block and asks
for before/after captures of `error404`. If `error404` really were `.missing`, Task 3 has no before
capture and its enumerated move ("the 404 message gains the band ground") cannot be graded.

**Correction.** Delete the pre-declared expectation from Task 1 Step 1. Say instead: "record every
`.missing`; `/archive/2` at page size 50 is the one known expectation, and any other is a finding
the task reports before proceeding." Move the "does the 404 render" determination into Task 1's
report (it is the first task that can answer it) and make Task 3's error-page adoption conditional
on that answer, not on Task 9's.

## G9. Task 9's alignment spec has no devices to measure: the doc it cites records zero

**Claim** (plan, Task 9 Files): "`e2e/public-alignment.spec.ts` (new: the computed-style
compensation for the public template, two devices named in `docs/internal/public-design-system.md`'s
'Vertical alignment mechanics' section, asserted with numbers the way
`src/tests/component/vertical-alignment-recipes.test.ts` does for the admin)".

**Evidence.** `docs/internal/public-design-system.md:253-312` is that section. Line 260 reads:
"**The measured public corpus found ZERO rows above the 2px bar.**" and `:262-264` "What follows
is doctrine for the next theme port, not a record of repairs". The section's substance is a
two-class diagnosis, a metric table, and four measurement traps. It names no Waymark device that
needs compensating, so "two devices named in that section" does not exist.

**Correction.** Adopt the plan's own fallback as the primary path: the doc says why the floor is
uncompensated on the public template and what would trigger a measurement. Remove
`e2e/public-alignment.spec.ts` from the Files list, or respecify it as an invariant test that
would catch a regression (for example, the header's wordmark-to-nav row measured once and pinned),
and name the row it measures rather than deferring the choice to dispatch.

## G10. Task 3's sidebar-layout condition tests the wrong thing: `ArticleView` renders `related`, but not as a rail

**Claim** (plan, Ruled inputs): "`.cairn-sidebar-layout` on the article's related-posts rail if
`ArticleView` renders `related`, else on the styleguide composition section only."

**Evidence.** `examples/showcase/src/theme/components/ArticleView.svelte:50` derives `related`, and
`:129-138` renders it, as `<nav class="related" aria-label="Related posts">` with an `<h2>` and a
`<ul>`, placed **inside** `<article>` after `{@html data.html}`. It is a block in the reading flow,
not a rail. Turning it into a two-column sidebar layout is a redesign of the article template, not
an adoption, and it contradicts the pass's own rule that every adoption is "a real site use, never
a demonstration bolted on".

Second, it would not appear in any capture: only `src/content/posts/2026-01-15-hello.md` carries a
`related:` key, and the plan's `article` capture surface is `/posts/the-reading-surface`
(`2026-04-05-the-reading-surface.md`), which does not.

**Correction.** Resolve the condition now: the article has no sidebar-shaped region, so
`.cairn-sidebar-layout` lands on the styleguide composition section only. If an article rail is
wanted, propose it as a design change with its own before/after, not as a primitive adoption. If
the article surface is meant to exercise `related` at all, change the capture surface to
`/posts/hello` and say so.

## G11. The `.js`-specifier ruled input depends on a chassis-A grep that cannot match `$theme/cairn.config`

**Claim** (plan, Ruled inputs): "`siteConfig`'s one door already holds (all eight imports resolve
to `$theme/cairn.config`; chassis-A Task 10 adds `.js` to the bare four), so review 1.2 is closed
by A and this pass only verifies."

**Evidence.** The eight imports are real and verified (see the Verified section). But chassis-A's
Task 10 enumerates its targets as `grep -rn "from '\$chassis/[a-z-]*'" examples/showcase/src`
"and the `$theme` twin" (chassis-A plan, Task 10 Files). `[a-z-]*` cannot match `cairn.config`:
the `.` is outside the class, so the pattern stops at `cairn` and never reaches the closing quote.
All four bare sites are `$theme/cairn.config`, `(site)/+page.server.ts:4`, `feed.xml/+server.ts:4`,
`feed.json/+server.ts:4`, `(site)/[...path=md]/+server.ts:4`, and A's grep returns none of them.
A fifth bare site for the same specifier, `(site)/styleguide/+page.server.ts:2` (`import { cairn }`),
is likewise invisible to it.

Chassis-A Task 10 has not landed yet (`git -C .claude/worktrees/chassis-a log --oneline` shows
Tasks 1 to 4), so this is still correctable upstream.

**Correction.** Either raise it to the chassis-A conductor now, or change the chassis-B ruled input
to "verify at dispatch; if A's grep missed the dotted specifier, chassis-B closes the five bare
`$theme/cairn.config` sites itself" and add the five files to a task's Files list.

## G12. Task 1's "four CSS files Prettier reflows" is three, and the CSS exclusion is three lines

**Claim** (plan, Task 1 Files): "`examples/showcase/.prettierignore` (the CSS exclusion removed) ...
the four CSS files Prettier reflows (`src/chassis/prose.css`, `src/chassis/tokens.css`,
`src/theme/theme.css`, `src/routes/probe-craft/probe-craft.css`; `composition.css` and `site.css`
are already clean)".

**Evidence.** Run against chassis-A's head, bypassing the ignore file:
`prettier --ignore-path <empty> --check 'src/**/*.css'` inside
`.claude/worktrees/chassis-a/examples/showcase` reports exactly three files , 
`src/chassis/prose.css`, `src/chassis/tokens.css`, `src/theme/theme.css`.
`src/routes/probe-craft/probe-craft.css` is already Prettier-clean, as are `composition.css` and
`site.css`.

Separately, chassis-A's `.prettierignore` carries **three** CSS lines, not one: `*.css`,
`src/chassis/*.css`, `src/theme/*.css`. (`*.css` alone already covers every level, so the other two
are redundant, but all three must go.)

**Correction.** "the three CSS exclusion lines removed" and "the three CSS files Prettier reflows
(`prose.css`, `tokens.css`, `theme.css`; `composition.css`, `site.css`, and `probe-craft.css` are
already clean)". The acceptance criterion "the four files differ from their parents by whitespace
only" becomes three.

## G13. The capture tool's admin and members surfaces need the flagged build, and there is no "e2e session helper"

**Claim** (plan, Task 1 Create): "a Playwright script against the preview server on 4173 ... for the
surface list ... `members-login` `/members/login`, `signups` `/admin/signups` **with the e2e
session helper**, at `320 390 768 1440 2560` in `light` and `dark`". Task 9 repeats it: "`/admin/signups`
at the five widths in both schemes, **through the suite's session helper**". Task 1 Step 1 says
"build and preview the untouched tree".

**Evidence.**

- There is no session helper. `e2e/admin-visual.spec.ts` has no login step at all; admin access
  comes from `packages/cairn-cms-dev/src/handle.ts:128-137`, which mints the editor directly.
  `e2e/custom-screen.spec.ts:3-4` states it: "The cms-dev handle mints an owner editor".
- That handle only runs behind the flagged build:
  `examples/showcase/src/hooks.server.ts:18` gates on `__CAIRN_DEV_BUILD__ && devBackendOptIn()`,
  and `playwright.config.ts:29-34` supplies both halves, `VITE_CAIRN_E2E=1 npm run build && npm
  run preview -- --port 4173` with `env: { CAIRN_DEV_BACKEND: '1' }`. A plain "build and preview"
  produces a build with the dev backend folded out, so `/admin/signups` and the `/members/*`
  fixtures (whose `membersDevHandle` sits inside the same branch, `hooks.server.ts:26-28`) do not
  render as captured.
- The admin's colour scheme is **cookie**-driven, not media-driven:
  `e2e/admin-visual.spec.ts:2-7` and every test there set `cairn-admin-theme` to `cairn-admin` /
  `cairn-admin-dark`. `page.emulateMedia({ colorScheme })` alone will capture the light admin twice.

**Correction.** Task 1's tool spec should say: the preview is the flagged build
(`VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173` with `CAIRN_DEV_BACKEND=1`,
matching `playwright.config.ts:29-34`); admin surfaces need no login, only the
`cairn-admin-theme` cookie per scheme; public surfaces use `emulateMedia`. Delete both references
to a "session helper".

## G14. The site-visual baseline count is 31, not 30, and the 1920 baseline is outside the capture matrix

**Claim.** The plan inherits the banked inputs' count.
`chassis-b-inputs.md:760` says "30 files" and `:934` "That's 5 x 2 x 3 = 30 baselines, confirmed by
the snapshot directory".

**Evidence.** `ls examples/showcase/e2e/site-visual.spec.ts-snapshots | wc -l` returns **31**. The
matrix produces 30, and `site-article-light-1920-linux.png` is a 31st, written by the standalone
clamp-slope test at `e2e/site-visual.spec.ts:66-73`. The inputs doc's own raw listing at `:763`
enumerates six article-light widths (1440, 1920, 2560, 320, 390, 768) while calling the total 30,
and its `:760` gloss openly hedges ("trust the raw `ls` output over this arithmetic gloss"), the
raw output is 31.

Consequence for the plan: the capture tool's width list (`320 390 768 1440 2560`) never renders
1920, so the pass-end `visual-verifier` set omits the one baseline that guards the clamp slope,
and any Task 8 clamp edit that shifts the root formula would move a baseline no capture shows.

**Correction.** Say 31 wherever the count appears. Add 1920 to the capture tool's article surface
(or state explicitly that the clamp-slope baseline is graded by the e2e suite alone and why that
is sufficient), and name `site-article-light-1920` in Task 8's "every baseline unchanged" check.

## G15. `packages/create-cairn-site`'s suite collects 741 tests on `main`, not 806

**Claim** (plan, Global constraints): "`npm --prefix packages/create-cairn-site run prepack && npm
--prefix packages/create-cairn-site test` (806 of 806; chassis-A's Task 1 omission)".

**Evidence.** Running that exact pair from the main checkout reports `tests 741` (with failures,
because the bake needs the engine `dist` this checkout does not carry). The collected count is the
number the plan pins, and it is 741, not 806.

**Correction.** Drop the hard number or re-derive it at dispatch against post-A `main` (chassis-A
Task 2 adds scaffold and bake-only `format:check` assertions, which will move it again). "Green,
with the count recorded in the task report" is the durable form.

## G16. Task 10's "the existing four assertions" misdescribes `custom-screen.spec.ts`

**Claim** (plan, Task 10 Files and Step 1): "the existing four assertions green unchanged".

**Evidence.** `examples/showcase/e2e/custom-screen.spec.ts` holds **two** tests. The first carries
four `expect` calls (`:14-16`, `:18`, `:28`, `:30`); the second carries one (`:35`). Five
assertions across two tests.

**Correction.** "the two existing tests (five assertions) green unchanged".

## G17. The design-system doc has four stale showcase paths, not three, and three correct engine paths that must not be repointed

**Claim** (plan, Task 10 Files): "`docs/internal/public-design-system.md` (the three stale
`src/lib/*` paths at about `:5` and `:316-317` repointed to `src/theme/theme.css`,
`src/chassis/prose.css`, `src/theme/components/`)".

**Evidence.** Stale showcase paths: `:5` `examples/showcase/src/lib/theme.css`; `:316`
`examples/showcase/src/lib/theme.css`; `:317` `examples/showcase/src/lib/prose.css`; `:317`
`examples/showcase/src/lib/components/`. That is four occurrences over three distinct targets.
`:5` also refers to "`prose.css`" and "the `(site)` chrome components" without a path, which the
same edit should make explicit.

Correct and load-bearing engine paths in the same file, which a blanket `src/lib/*` sweep would
wrongly repoint: `:46` `src/lib/render/highlight.ts`, `:47` `src/lib/render/sanitize-schema.ts`,
`:237` `src/lib/components/cairn-admin.css`, `:321` `src/lib/render/highlight.ts`.

**Correction.** "the four stale `examples/showcase/src/lib/*` occurrences at `:5`, `:316`, and
`:317` ... ; the engine's own `src/lib/render/*` and `src/lib/components/cairn-admin.css`
references at `:46-47`, `:237`, and `:321` are correct and stay."

## G18. Tasks 3 and 9 adopt and baseline `/members/*`, which chassis-A's own rule excludes from the scaffold

**Claim** (plan, Ruled inputs): "`.cairn-card` on the `/members/login` and `/members` card
(replacing the DaisyUI `.card` there, since the chassis card is the theme's own recipe)"; Task 9
adds `members-login` to the width matrix.

**Evidence.** `examples/showcase/.cairn-template.json` (chassis-A head) excludes `src/members` and
`src/routes/members`. The members routes are fixtures that never reach a scaffolded site. The
pass's own first organizing rule is "the fixture job is excluded by path or marked", and its goal
sentence is "the exemplar uses the chassis **it ships**".

The markup itself is as the plan says: `src/routes/members/+page.svelte:27` and
`src/routes/members/login/+page.svelte:32` both carry `class="card w-full max-w-sm bg-base-100
shadow"`.

**Correction.** Either drop the members adoption and its baselines (the chassis card is already
proven on the styleguide section and the 404 band), or state explicitly that a fixture route is a
sanctioned second exception alongside the styleguide, and say what the baseline buys. Do not leave
it unremarked, since the rest of the plan treats fixture surfaces as out of the ship set.

## G19. `status: published` on the thirteen new posts diverges from all fourteen existing posts

**Claim** (plan, Ruled inputs): the thirteen posts carry "`status: published`".

**Evidence.** `grep -H "^status:" examples/showcase/src/content/posts/*.md` returns nothing: not
one of the fourteen existing posts carries the key. `grep -rn "status" examples/showcase/src/content/`
returns nothing at all. The field exists only as an editor-arm exercise in the schema
(`src/theme/cairn.config.ts:412`, `fields.select({ options: ['draft','published'], default:
'draft' })`) and nothing in delivery reads it, `src/chassis/content.ts` hands the raw globs to
`createSiteIndexes` with no filter, and `src/content/.cairn/index.json` records `"draft": false`
for every entry.

So the key is inert, and adding it to thirteen of twenty-seven posts makes the starter corpus
inconsistent for no behavior.

**Correction.** Drop `status: published` from the ruled input, or add it to all twenty-seven and
say why the exemplar now demonstrates the field. Either is defensible; the split is not.

## G20. Task 7's content-index regeneration is conditional on a fact that is already settled, and the command is unnamed

**Claim** (plan, Task 7 Files): "`src/content/.cairn/index.json` if the index is committed
(regenerate through the repo's index command, never by hand)".

**Evidence.** `examples/showcase/src/content/.cairn/index.json` is committed (7,635 bytes, tracked).
The manifest is verified at build time, so a stale one fails the build red
(`svelte.config.js:20-22` records exactly that). The command is
`npm --prefix examples/showcase run cairn:manifest` (`examples/showcase/package.json` script
`cairn:manifest` -> `cairn-manifest`, mapped at the root `package.json:177` to
`./dist/vite/bin.js`, whose header at `src/lib/vite/bin.ts:2-3` says it writes the canonical
content manifest; default path `/src/content/.cairn/index.json`, `src/lib/vite/internal.ts:46`).

**Correction.** Make it unconditional and name the command: "`src/content/.cairn/index.json`
regenerated with `npm --prefix examples/showcase run cairn:manifest` (committed; a stale manifest
fails the build)."

## G21. Task 12 lists a file under Modify that does not exist

**Claim** (plan, Task 12 Files, "Modify"): "`docs/internal/record/2026-09-04-chassis-inputs/chassis-b-harvest.md`".

**Evidence.** `ls docs/internal/record/2026-09-04-chassis-inputs/` returns `chassis-b-inputs.md`,
`figure-grades`, `plan-review.md`, `plan-review-round2.md`, `routed-inputs.md`,
`showcase-review-at-the-exemplar-bar.md`, `spec-review.md`. No harvest file.

**Correction.** Move it to a `Create:` line.

## G22. The `@utility` fallback has one hard constraint the plan does not state

**Claim** (plan, Ruled inputs and Task 4): "a `cairn-focus-ring` utility (Tailwind v4 `@utility` if
the layering permits, else `.cairn-focus-ring:focus-visible` in `composition.css`) ... or the
`@utility` in `tokens.css` if that is where Tailwind's layer is activated; the implementer verifies
which file the activation lives in before choosing".

**Evidence.** The activation is `@import 'tailwindcss'` at
`examples/showcase/src/chassis/tokens.css:42`, and `composition.css` is imported two lines later
(`:44`), so both files are inside the Tailwind-processed tree and either can host an `@utility`
(tailwindcss `^4.3.2`, `examples/showcase/package.json`). The real constraint is different:
`composition.css` wraps its **entire** body in `@layer components { ... }` (`:15` to the closing
brace at the file's last line), and Tailwind v4 requires `@utility` at the top level of a
stylesheet, never nested in an at-rule. An `@utility` added inside that block will not register.

**Correction.** Replace the "which file hosts the activation" instruction with the actual rule:
`@utility` goes at the top level, above `composition.css`'s `@layer components` block (or in
`tokens.css` outside its own `@layer components` at `:146`). Keep the plain-class fallback.

## G23. Two paint-neutral edits in Tasks 2 and 3 have unstated carriers

**Claim** (plan, Task 2): "`main` becomes `cairn-site-main site-main`". (Plan, Task 3): the
`composition.css` row of the chassis README "now names the adopters".

**Evidence.**

- `(site)/+layout.svelte:84` is `<main id="main" tabindex="-1" class="site-main flex-1">` while
  `+error.svelte:29` is `<main id="main" class="site-main flex-1">`. The `tabindex="-1"` is
  load-bearing and documented as such at `docs/internal/public-design-system.md:125-126`
  ("without it, Firefox and Safari move the position but not keyboard focus"). A blanket "the same
  two lines" rewrite risks dropping it.
- Two more places assert that nothing uses the primitives, beyond the removal-table row Task 3
  names: `src/chassis/composition.css:5-6` ("Nothing in the showcase's current markup uses any of
  these yet") and `src/chassis/README.md:196` ("nothing else references it today, since no theme
  markup in this showcase currently uses `.cairn-card`/`.cairn-band`/..."). Both become false in
  Task 3, and `README.md:196` is a different line from the `:38` and `:122` rows.

**Correction.** Task 2: "the `main` element gains `cairn-site-main`; `(site)`'s `tabindex="-1"` is
preserved." Task 3 Files: add `src/chassis/composition.css` (its header sentence) and name
`README.md:196` alongside the removal-table row.

## G24. The "degenerate clamp" rule as stated covers only one of the two clamps (values are correct)

**Claim** (plan, Ruled inputs): "Degenerate clamps become the constants they already resolve to
(`clamp(a, a, b)` with `b < a` resolves to `a`)"; Task 8: "`--text-step--1` and `--text-step-0`
become the constants they resolve to, `0.84rem` and `1.06rem`".

**Evidence.** `examples/showcase/src/theme/theme.css:227` is
`--text-step--1: clamp(0.84rem, 0.84rem, 0.80rem)`, here `b < a`, and
`max(0.84, min(0.84, 0.80)) = 0.84rem`. The stated rule fits.
`:228` is `--text-step-0: clamp(1.06rem, 1.06rem, 1.0625rem)`, here `b > a`, so the parenthetical
does not describe it; it resolves to `1.06rem` because the preferred value is the constant `a` and
`a <= b`. Both target values in the plan are **arithmetically correct**; only the stated reason is
partial.

**Correction.** "Both clamps have a constant preferred value and so resolve to that constant:
`clamp(0.84rem, 0.84rem, 0.80rem)` -> `0.84rem` (the max is below the min), and
`clamp(1.06rem, 1.06rem, 1.0625rem)` -> `1.06rem`."

---

## Anchors and assumptions verified as CORRECT

Nothing below needs re-derivation at dispatch.

| Claim | Verdict | Evidence |
|---|---|---|
| Five renderable "Waymark" literals | correct | `+error.svelte:23`, `(site)/archive/[page]/+page.svelte:17`, `(site)/styleguide/+page.svelte:107`, `SiteFooter.svelte:52`, `SiteHeader.svelte:112`. The grep as written also returns `ArticleView.svelte:2`, a comment, so it prints six lines for five renderable hits |
| 22 hand-written focus rings today, 20 after A's deletions | correct | `grep -rn "outline: 2px solid var(--color-primary)" examples/showcase/src` returns 22; chassis-A Task 5 deletes `IntroLedger.svelte` (ring at `:187`) and `Carousel.svelte` (`:182`), leaving 20 |
| `prose.css` holds six of them | correct | `prose.css:150, 377, 615, 713, 744, 801` |
| Fourteen posts today | correct | `ls examples/showcase/src/content/posts` returns 14 files, all 2026-dated (2026-01-15 to 2026-07-03) |
| `ARCHIVE_PAGE_SIZE` is 50 | correct | `src/chassis/archive.ts:10` |
| The home excludes the featured post from pagination | correct | `(site)/+page.server.ts:14-15`, `paginateArchive(entries.slice(1), 1)`; `archive/[page]/+page.server.ts:11` uses the same slice so the page counts agree |
| 27 posts at page size 13 gives TWO pages, not three | correct | 27 - 1 featured = 26; `Math.ceil(26/13) = 2` (`archive.ts:36`). The plan's own dichotomy ("three if the featured post is paginated, two if not") resolves to two |
| Thirteen 2025-dated posts give the claimed shape | correct | sorted newest-first the 14 2026 posts lead; featured = `2026-07-03-trail-mix`; page 1 = the other 13 2026 posts under one "2026" heading; `/archive/2` = the 13 2025 posts under one "2025" heading |
| The home baseline moves only by the pagination block | correct | `visibleCount` is `pageEntries.length` = 13 before and after (`(site)/+page.svelte:34`), and the tag filter gate `pageEntries.length > 12` (`:16`, `:94`) holds both ways. The pagination `nav` is gated on `totalPages > 1` (`:159`) and is absent today |
| `tag-filter.spec.ts` stays green | correct | it counts `[data-cairn-post]` across lead plus index = 1 + 13 = 14 |
| `readMenu(siteConfig, 'footer', 1)` is valid | correct | `src/lib/nav/site-config.ts:345-349`; `validateNavTree`'s doc at `:39-40` states "depth within `maxDepth` (1 is flat)" |
| `menus.footer` needs three entries verbatim | correct | `SiteFooter.svelte:33-37`: Writing `/`, Admin `/admin`, Feed `/feed.xml`. All three pass `SAFE_URL` |
| `/admin/nav` edits only `primary` | correct | `runtime.navMenu` is a single config (`nav-routes.ts:71-75, 89`), and `cairn.config.ts:483` sets `menuName: 'primary'`. A `menus.footer` block survives a nav save, since `setMenu` round-trips the document (`site-config.ts:357-364`), though YAML comments do not (`:355`) |
| `siteName: Waymark` is in the yaml | correct | `src/theme/site.config.yaml:1` |
| Five vocabulary values | correct | `site.config.yaml`: trail-reports, gear, weather, routes, season-notes |
| Eight `siteConfig` imports, four of them bare | correct | bare: `(site)/+page.server.ts:4`, `feed.xml/+server.ts:4`, `feed.json/+server.ts:4`, `(site)/[...path=md]/+server.ts:4`. With `.js`: `public-routes.ts:12`, `content.ts:6`, `cairn.server.ts:7`, `entry-data.ts:6`. (But see G11 on whether A's grep reaches them) |
| `ORIGIN` is a literal in `src/chassis/content.ts` | correct | `content.ts:29`, `export const ORIGIN = 'https://showcase.test'` |
| `check-public-tokens.mjs`'s literal-scan filter is at `:79` | correct | `scannedFiles`'s `name.endsWith('.svelte') \|\| name === 'prose.css' \|\| name === 'composition.css'` |
| The resolution check reads the WHOLE of `tokens.css` for definitions | correct | `checkTokenResolution:580-584` calls `collectDefinedTokens(chassisTokensCss)`, not `codeRampBody`. New `--cairn-focus-ring-*` tokens defined there will resolve for `prose.css` references |
| `e2e.yml`'s regen dispatch | correct | `workflow_dispatch.inputs.update_snapshots` (`:6-12`); the regen step runs both visual specs by file path (`:126-128`) and the bot commits both snapshot dirs back to the dispatched ref (`:129-141`). `gh workflow run e2e.yml --ref chassis-b -f update_snapshots=true` is the right invocation |
| Three `<article class="entry">` blocks, two stylesheets | correct | `(site)/+page.svelte:119`, `:140`, `archive/[page]/+page.svelte:34`; `.entry*` rules in both files |
| No e2e selector reads `.entry` | correct | grep over `e2e/` returns only prose uses of the word |
| The focus assertion targets `.lead__title a` | correct | `e2e/site-visual.spec.ts:103-116`; it accepts outline **or** box-shadow, so a token-valued outline keeps it green |
| The shell wrapper strings, verbatim | correct | `(site)/+layout.svelte:70` and `+error.svelte:26` are both `site-shell flex min-h-screen flex-col bg-base-100 font-body text-base-content`; both `main` elements carry `site-main flex-1` |
| The `.site-main` width block and its re-derivation comment | correct | `src/theme/site.css:77-89`, including the cross-axis explanation the chassis README `:133-141` and `composition.css:97-105` also carry |
| The chassis README's removal table and the AstroPaper aside | correct | `README.md:38`, `:122`, `:133-141`, `:194`, `:196` |
| `--cairn-focus-ring-radius: 2px` and `--cairn-caption-tracking: 0.09em` in `theme.css` | correct | `:311` and `:312`, exactly the anchors the plan gives |
| `--text-step-1` and `-2` are byte-identical | correct | `theme.css:229-230`, both `clamp(1.27rem, 1.25rem + 0.10vw, 1.33rem)` |
| The five composition primitives exist with the names the plan uses | correct | `composition.css`: `.cairn-card:20`, `.cairn-band:34`, `.cairn-section:44`, `.cairn-hero:55` with `.cairn-hero-title:61` / `.cairn-hero-lead:69`, `.cairn-sidebar-layout:82`, plus the site-shell pair |
| `feed.ts`'s mixed `?.`/`!` | correct | `src/chassis/feed.ts:14` `posts?.all() ?? []` and `:19` `posts!.byId(p.id)!.body` |
| Three `platform!` assertions in the exemplar | correct | `admin/signups/+page.server.ts` in `load`, `create`, `remove` |
| `add-a-custom-admin-screen.md` teaches `createSectionAction` and `requireAccess`, with no shipped wirer | correct | "The recommended path is `createSectionAction` ... Follow this shape even though no shipped example wires it yet", and the worked `load` uses `requireAccess(event)` |
| `(site)/+page.svelte` and `(site)/[...path]/+page.svelte` carry no `<title>` | correct | neither has a `<svelte:head>`; `ArticleView.svelte` has none either. The `(site)` layout's head (`:65-68`) carries only stylesheets |
| The title separators genuinely disagree | correct | `+error.svelte:23` uses `\| Waymark`; archive `:17` and styleguide `:107` use `·`; `members/+page.svelte:23` and `members/login/+page.svelte:28` carry no suffix |
| `scripts/` is template-excluded, so `capture-surfaces.mjs` cannot leak into the scaffold | correct | `.cairn-template.json` excludes `scripts` |
| Every gate the plan names exists | correct | `check:public-tokens`, `check:chassis-boundary`, `check:template`, `check:consumers`, `check:reference`, `check:docs`, `check:comments`, `check:idioms`, `check:cm-internals`, `check:rulings-format`, `check:vale`, `check:surface`, `emit:template` all present in the root `package.json` scripts |
| `~/.claude/workflows/pass-execute-chains.js` exists | correct, and NOT a regression | the chassis-A plan review's G1 said it did not; the file was created 2026-09-04 14:58, after that review. Both plans' execution lines are now accurate |
| Every named artifact exists | correct | `showcase-review-at-the-exemplar-bar.md`, `int-rank-site-chassis.md`, `src/tests/component/vertical-alignment-recipes.test.ts`, `docs/internal/public-design-system.md`, `docs/extend/what-the-scaffold-wrote.md`, `examples/showcase/README.md`, `docs/internal/engine-rulings.md`, `docs/internal/docs-friction-log.md`. The ROADMAP's "chassis improvement round" tier entry is at `ROADMAP.md:319` |
| chassis-A's landed set, as of this review | correct | `git -C .claude/worktrees/chassis-a log --oneline` shows Tasks 1 to 4 landed (`e2eafc4`, `8fecf730`, `de93536c`, `c2290d69`, `b126d892`). Tasks 5 and 10, on which two chassis-B ruled inputs depend, have not landed |

## Prior corrections held (no REGRESSION found)

- **spec-review R1** (page size versus the tag filter): the plan takes option (a) exactly, grow to
  27 posts, `ARCHIVE_PAGE_SIZE = 13`, which keeps page one at 13 entries and the filter above its
  threshold. Verified arithmetically above.
- **spec-review R2** (keep the `handleUnseenRoutes` exception, rewrite the stale 220-post comment):
  the plan keeps it and rewrites the comment (Task 7 Files).
- **plan-review G6** (the showcase has no content guide): the chassis-B ruled input names the real
  authority instead, the `content-draft` / `content-review` skill files read directly, with the
  fourteen existing posts as the voice brief.
- **plan-review G2 point 2** (the new posts interleaving and changing the home's visible rows): the
  2026-09-07 ruling dates them across 2025, which resolves it; the home's 13 index rows are
  unchanged.
- **plan-review G1** (`pass-execute-chains.js` missing): the file now exists.

One inherited imprecision rather than a regression: **plan-review G2 point 3** asserted that the
posts list "going from 14 rows to 27 moves both" admin-office baselines, and the chassis-B plan
carries that forward as "grows by thirteen rows". See G7: `ConceptList.svelte` paginates at ten.

---

## Ranked top five

1. **G1**, Task 10's `createSectionAction` + `requireAccess` adoption cannot pass: the showcase
   declares no access map and `packages/cairn-cms-dev/src/handle.ts` never sets
   `locals.cairnAccess`, so the wrapped actions `fail(500)` and `requireAccess` 403s even the
   owner. It also poisons Task 9's `/admin/signups` baseline.
2. **G3**, Task 8's `site.css` gate extension: the three literals it names are invisible to
   `check:public-tokens` (colour and font-size only), while the one line that will fail the gate,
   `site.css:34`'s root `font-size: clamp(...)`, goes unmentioned and cannot be tokenized.
3. **G5**, Task 5 wires `footerNav` into `(site)/+layout.server.ts`: the wrong load (the root one
   reaches `+error.svelte`, and its own comment says why), and chassis-A has already excluded that
   file from the scaffold.
4. **G2**, Task 10's test-first 403 case has no mechanism: the dev backend hard-mints an owner and
   `access-map.spec.ts` mints no browser session at all.
5. **G4**, Task 8 adds a parameter to `checkTokenResolution` and silently breaks its second
   caller, `scripts/lab/reskin-fixture.mjs:136`, which is absent from the Files list.

Runners-up, in order: G8 (the 404's renderability pre-declared, and Task 3 depends on it),
G7 (the admin office list paginates at ten), G6 (the YAML parser into the client bundle),
G9 (no measurable public alignment device exists).

---


Read-only. Objects: the spec's "Chassis-B", "Out of scope for both" and "Risks" sections
(`docs/superpowers/specs/2026-09-04-chassis-passes-design.md:208-274`) and the plan
(`docs/superpowers/plans/2026-09-07-chassis-b-pass.md`). Verified against `main` at `cb63056a`
with the `chassis-a` branch at `b126d892` (Tasks 1 to 4 landed, Tasks 5 to 12 outstanding).
Every `file:line` below was opened. Findings that regress a correction the chassis-A spec review
(`spec-review.md`) or plan review (`plan-review.md`) already made are marked **REGRESSION**.

The shape and rigor follow `plan-review.md`'s Lens 2. Findings are ranked within the lens.

---

## R1. Task 10 adopts two fail-closed guards against a showcase that declares no access map, so the route 403s for every session including the owner

**Mechanism.** The showcase declares no access map. `grep -rn "defineAccess\|defineRoles\|cairnAccess"
examples/showcase/src` returns nothing; `cairn.config.ts` mentions `signups` only as a nav entry
(`examples/showcase/src/theme/cairn.config.ts:491,506`). `createAuthGuard` still attaches an EMPTY
map (`src/lib/sveltekit/guard.ts:194`, `event.locals.cairnAccess = access ?? {}`), so the presence
check passes and the failure is not loud at startup. It is loud at request time:

- `requireAccess` (`src/lib/sveltekit/guard.ts:302-311`) requires BOTH `hasAccessRule` and
  `canReach`. Its own doc comment at `:288-291` states the contract: "this helper's contract is
  'this route opted into the map and the map has no opinion on it,' a misconfiguration made loud
  rather than an access decision, so `canReach`'s owner bypass does not apply here." With an empty
  map, `hasAccessRule({}, '/admin/signups')` is false and every session, owner included, gets
  `throw error(403, 'Access denied')`.
- `createSectionAction` (`src/lib/sveltekit/section-action.ts:286-298`) runs
  `authorizeAdminTarget(access, ctx.editor, { target, ownerOnly })`, fail-closed unconditionally
  (unlike `adminAction`'s opt-in `access` at `:166-168`), returning `deny()` → `fail(403)`.

The plan's Task 10 takes both branches: "both actions through `createSectionAction` …; the `load`
through `requireAccess` as the doc pairs it" (`plan:420-422`). Its Files list names
`admin/signups/+page.server.ts`, `custom-screen.spec.ts`, `feed.ts` and three docs. It does NOT
name `examples/showcase/src/theme/cairn.config.ts`, the only file that could declare the map.

**Consequence.** The route stops rendering and both actions stop working. Task 10's own Step 1
acceptance, "the four existing cases green unchanged" (`plan:437-438`), is unachievable: all four
assertions in `e2e/custom-screen.spec.ts` (nav link visible, heading visible, create round-trip,
delete round-trip) fail. The implementer meets a red suite it cannot fix inside the task's stated
file set and escalates, which is the mid-pass human stop the process exists to remove. The fix an
implementer would reach for on its own, adding `defineRoles`/`defineAccess` to the adapter, is a
substantive change to the showcase's auth model that ships into every scaffolded site's
`cairn.config.ts` and was never scoped, reviewed, or ruled.

There is a second, quieter consequence even once a map exists. Today the route is
`requireOwner` (`admin/signups/+page.server.ts:18,27,40`), owner-capability only, and it reads and
writes a D1 table of names and email addresses (`SELECT id, name, email FROM signups`,
`INSERT INTO signups (name, email) VALUES (?, ?)`, `DELETE FROM signups WHERE id = ?`). Swapping to
`requireAccess` replaces "owner only" with "whatever roles the map admits," and the plan never
states the intended posture, nor whether `createSectionAction` gets `ownerOnly: true`.

**REGRESSION** of `plan-review.md` R4, which routed this item to chassis-B precisely because
"adopting `createSectionAction` in `admin/signups` is not an idiom swap … the adopt branch changes
the route's auth and audit path" and asked that the adopt branch be taken "test-first" with its own
acceptance line. Chassis-B takes the adopt branch and still prices only the mechanical half.

**Correction.** Add to Task 10's Ruled input and Files: the showcase gains a `defineRoles` /
`defineAccess` declaration in `cairn.config.ts` naming a rule for `/admin/signups`, and the plan
states the posture (recommended: the map admits `owner` only, and `createSectionAction` is passed
`ownerOnly: true`, so adoption is authorization-neutral against today's `requireOwner`). Add an
acceptance line: "the route's admitted role set before and after adoption is identical, named in
the report." Give the access-map declaration its own step, since it ships to every scaffolded site.

---

## R2. Task 10's new 403 test names a minting mechanism that does not exist, and no mechanism in the tree can produce a non-owner HTTP session

**Mechanism.** `plan:425-428` requires "one new case for the behavior adoption makes reachable, the
403 branch for a non-owner through the access map, driven the way `access-map.spec.ts` mints roles."
`e2e/access-map.spec.ts` mints nothing. It imports `defineRoles`, `defineAccess`, `canReach` and the
`Editor` type from the package and constructs plain objects in TypeScript
(`access-map.spec.ts:26-28`, `function makeEditor(role, capability): Editor { return { email:
'editor@showcase.test', … } }`), then calls `canReach` as a pure function. Its own comment at
`:15-16` says so: "`canReach` is pure, so no page or browser fixture is needed." There is no page, no
navigation, no cookie, no request.

The only session-minting path any showcase spec has is the dev backend, which assigns locals
directly and unconditionally as an owner: `packages/cairn-cms-dev/src/handle.ts:128-137`,
`event.locals.cairnEditor = { email: 'editor@showcase.test', displayName: 'Demo Editor', role:
'owner', capability: 'owner' }`. It exposes no per-test role or capability selection.
`custom-screen.spec.ts` never logs in; it rides that backdoor.

**Consequence.** The one test the plan adds to cover the auth change cannot be written as
specified. An implementer either writes a pure `canReach` assertion (which exercises the
authorization function, not the route's 403 branch, and would pass identically before adoption, so
it verifies nothing about the change) or invents a role-selection mechanism in the dev backend,
which is engine work in a pass whose Architecture says "No engine code changes" (`plan:23-24`). The
acceptance criterion "the 403 branch covered" (`plan:443`) is then satisfied by a test that does not
cover it, which is the "a grep that can't fail verifies nothing" failure named in the
`visual-fidelity` skill.

**Correction.** Replace the test instruction with what is reachable and say why: keep
`custom-screen.spec.ts`'s four owner-path cases green, and cover the denial branch as a showcase
unit test (chassis-A Task 9's vitest config) asserting `canReach`/`hasAccessRule` against the
showcase's own committed access map for the `/admin/signups` target, with a comment naming the
dev-backend owner-only limitation as the reason the HTTP 403 is not driven end to end. If an HTTP
403 case is wanted, that is a dev-backend role-selection seam and belongs in its own pass with an
engine consultation, not inside Task 10.

---

## R3. Task 3's paint-move enumeration omits the two largest moves its own adoptions make, and the task's stop rule then fires

The plan's global constraint is strict and correct: "A baseline that moves for a change the report
does not enumerate is a stop-and-report" (`plan:118-119`), and Task 3 Step 1 repeats it, "any move
outside that list is a stop-and-report" (`plan:221`). The enumerated list at `plan:218-221` is: the
styleguide gains a section and its masthead rhythm "may shift by the hero gap"; the home lead/index
spacing "may shift by the section gap"; the members card border replaces the shadow; the 404 message
gains the band ground. Two mechanisms produce moves outside that list.

**(a) `.cairn-section` on `.index` adds geometry where none exists, and restyles every child gap.**
`.cairn-section` is not a margin wrapper. It is two rules
(`examples/showcase/src/chassis/composition.css:44-50`):

```
.cairn-section { --cairn-section-gap: var(--spacing-l); margin-block: var(--cairn-section-gap); }
.cairn-section > * + * { margin-top: var(--cairn-section-gap); }
```

On the home page, `.lead` carries `padding-bottom: var(--spacing-l); margin-bottom:
var(--spacing-l); border-bottom: var(--border) solid var(--color-card-border)`
(`(site)/+page.svelte:192-196`) and no top spacing at all. `.index` (the element at
`(site)/+page.svelte:82`) carries no box geometry whatsoever; only its descendants
(`.index__head`, `.index__count`, `.index__year`) are styled. So `plan:203-204`'s "the scoped
margins those blocks hand-roll deleted" describes something `.index` does not have, and the
adoption is pure addition there: a `margin-block` on both edges where zero existed, plus a
`margin-top: var(--spacing-l)` between `.index__head` and every year group. On `.lead` it adds a
top margin that does not exist today and swaps a non-collapsing `padding-bottom` for a
collapsible `margin-block-end`, which can then collapse against `.listing`'s own margins.

"May shift by the section gap" is not an enumeration of those moves; it is a hedge. At 320 and 390
the added `--spacing-l` (`clamp(2rem, 1.91rem + 0.43vw, 2.25rem)`, `theme.css:238`) is roughly 32px
of new vertical space per boundary on a full-page capture.

**(b) `.cairn-card` on the members pages doubles the card padding.** The current markup is
`<div class="card w-full max-w-sm bg-base-100 shadow">` with the padding on an INNER wrapper,
`<div class="flex flex-col gap-4 p-6">` (`members/+page.svelte:26-27`,
`members/login/+page.svelte:31-32`); no `card-body` is used. `.cairn-card`
(`composition.css:20-29`) declares `padding: var(--cairn-card-padding)` (= `var(--spacing-m)`)
on the card element itself. Adopting it without removing the inner `p-6` gives `--spacing-m`
(≈24 to 27px) PLUS 24px on every edge. `.cairn-card` also declares no `width`/`max-width` and no
`box-shadow`, so `w-full max-w-sm` must stay and `shadow` must be dropped explicitly. The
enumerated move, "the members card border replaces the shadow," names one of four differences.

**Consequence.** Task 3 halts on its own stop rule at Step 1, or, worse, an implementer reads the
hedging "may shift" as covering whatever it sees and accepts an unreviewed redesign of the home
page's vertical rhythm.

**Correction.** Replace the hedges with numbers. For each adoption, the plan states the delta:
`.lead` gains `margin-block-start: var(--spacing-l)` and its `padding-bottom` becomes
`margin-block-end` (or the adoption is declined for `.lead` because the border-bottom is the
device, not the gap); `.index` gains `margin-block` and `> * + *` inter-child spacing, and the
report names which children move; the members card drops `shadow` and `p-6` moves off the inner
wrapper. Add the sentence the ruled input already carries for the general case, applied here by
name: "A site where adoption forces a visible redesign is reported, not forced" (`plan:87-88`) is
the right rule; Task 3 should say which of the five adoptions is expected to trip it.

---

## R4. Task 3 proves two primitives on routes the template excludes, and Task 9 adds one of them to the width matrix as a "public surface"

**Mechanism.** `examples/showcase/.cairn-template.json` excludes `src/members`,
`src/routes/members` and `migrations-members` from the emitted set (verified: `emit-template.mjs`'s
filter reads only that `exclude` array plus a fixed `alwaysSkip` list). The members pages are
fixture routes for the engine's own member-channel e2e; no scaffolded site receives them.

Task 3 adopts `.cairn-card` on `/members/login` and `/members` and nowhere else
(`plan:205-207`). Task 1's capture surface list includes `members-login` (`plan:148-149`). Task 9
puts `members-login` into the width loop as one of "the four unproven surfaces"
(`plan:392-393`), and its acceptance criterion reads "every public surface in the width matrix"
(`plan:413`).

**Consequence.** This inverts both of the spec's organizing rules at once. Rule 1 says "the fixture
job is marked or excluded" (`spec:52`); Task 9 promotes an excluded fixture into the pass's public
width matrix and calls it a public surface. Rule 2 says "A primitive the chassis provides is used
by the showcase's own markup, rendered, baselined, and proven at 320 and 2560" (`spec:61-63`) so
that the exemplar uses the chassis it ships; `.cairn-card`'s only real-site adoption is on markup
that never reaches a scaffolded site, so the scaffold inherits the primitive with zero call sites,
exactly the state the pass exists to end. The plan's own Ruled input, "Every adoption in this pass
is a real site use, never a demonstration bolted on for the baseline's sake" (`plan:50-51`), is
violated by its own named call site, and the one sanctioned exception it carves out is the
styleguide, not the members pages.

Ten baselines of an excluded fixture also enter the committed set and become permanent CI cost and
permanent regeneration surface for a page no consumer sees.

**Correction.** Move `.cairn-card`'s real adoption to a surface the scaffold receives (the
styleguide's composition section already covers the demonstration; a card device on the home page's
`.lead` or the article's related-posts rail is the candidate for a real use), or state plainly that
`.cairn-card` has no real site use in this theme and record that as a chassis harvest item rather
than manufacturing one. Drop `members-login` from Task 9's width matrix and from the pass's surface
list, or keep it and rename the acceptance criterion to "every emitted public surface plus the
members fixture," with one sentence saying why a fixture is baselined.

---

## R5. Thirteen posts written to prove a pagination feature ship as every scaffolded site's starter corpus, which is the spec's own rule 1 inverted

**Mechanism.** `src/content/` is not in `.cairn-template.json`'s exclude list, and
`bake-template.mjs`'s `bake()` (lines 176-199) touches only `package.json`, `README.md` and
`scripts/dev.mjs`. It never reads `src/content/`. `templates/waymark/src/content/posts/` therefore
holds all 14 showcase posts today, filename for filename. Task 7 adds thirteen more and re-emits
(`plan:341-342`, "`templates/waymark` (regenerated; the posts ship as the starter corpus)"), so a
scaffolded site starts with 27.

The thirteen exist for one reason, stated in the spec: "a page size under 13 kills a taught feature
and fails `tag-filter.spec.ts` … The corpus grows from 14 to 27 posts" (`spec:95-101`). They are
sized to make `totalPages > 1`. That is the engine's fixture job, and the spec's rule 1 is that "the
fixture job is marked or excluded" (`spec:52`), with exclusion the default.

**Consequence.** Three costs, none priced. A new site owner deletes 27 sample posts instead of 14
before writing their own, and the ruled input makes them harder to delete casually by requiring
they be REAL posts at 150 to 300 words each (`plan:53-56`), roughly 2,600 to 3,900 words of invented
outdoors content in every scaffolded repo. The docs go stale: `docs/extend/what-the-scaffold-wrote.md:48`
reads `└── … (14 sample entries)`, and Task 7's Files list does not include that file, so the count
is wrong from Task 7 until Task 11 catches it. And the spec's own diagnosis of the showcase's
central failure, "The showcase carries three jobs at once … Every top-ranked finding is one of the
other two leaking into the first" (`spec:32-35`), describes what this task does: a fixture need
leaking into the exemplar template, at the largest scale in the pass.

There is no ledger ruling on the showcase corpus or on what content a scaffold ships (searched:
no entry addresses sample-post count or scaffold seed content), so this is an unruled product
decision being made inside an execution pass.

**Correction.** Rule it explicitly in the Ruled inputs with the trade named, and pick one of three:
(a) the thirteen ship, and the plan says in one sentence why 27 starter posts serve a scaffolded
site better than 14 (the honest case: a starter that demonstrates pagination); (b) the thirteen are
marked with the `cairn-template:exclude-start`/`-end` idiom or added to `.cairn-template.json`'s
exclude list so the showcase proves the archive and the scaffold still ships 14, with
`ARCHIVE_PAGE_SIZE` documented as the site's own knob; (c) the corpus grows by the minimum that
crosses the boundary rather than to a round 27. Whichever is chosen, add
`docs/extend/what-the-scaffold-wrote.md` to Task 7's Files so the count never lies.

---

## R6. The 6M ceiling is below chassis-A's for a pass with strictly more work per task, and reinstates the figure A's own review rejected

**Mechanism.** `plan:40` sets 6M for twelve tasks, inherited verbatim from `spec:252`. Chassis-A
is twelve tasks at 7.5M (`2026-09-04-chassis-a-pass.md:38-39`), raised from 6.5M by
`plan-review.md` H2, whose argument was that 6.5M sat at internals-C's observed 0.55M per task
"before accounting for the two things that make this pass heavier." Every one of those pressures
applies to chassis-B and several more are added:

- The per-task gate is chassis-A's gate plus the showcase visual suite regenerated by file path,
  plus a before/after capture run through `capture-surfaces.mjs`, plus the CI regen dispatch and
  pull on Task 7 (`plan:125-132`, `plan:355-357`).
- The per-task `diff-reviewer` reads up to twelve images (`plan:120-122`). Across twelve tasks
  that is ~144 image reads.
- The pass-end `visual-verifier` reads "every public surface at all five widths in both schemes"
  for BOTH the before set and the after set: seven surfaces × 5 widths × 2 schemes × 2 sets = 140
  images per iteration, and it is specified as a LOOP that "exits only on PASS" (`plan:496-501`)
  with no iteration cap and no budget line. At vision-model rates that is roughly 0.2M tokens per
  iteration before any prose.
- Task 7 authors thirteen posts through `content-draft` and `content-review` gates run per post
  (`plan:346-348`), an unbounded-volume task of the kind H2 named.
- The conductor runs at Fable rates.

**Consequence.** Roughly 0.9M to 1.2M of the ceiling is image reads alone, leaving under 0.4M per
task against internals-C's observed 0.55M and chassis-A's budgeted 0.63M. The 80-per-cent combined
question fires at the second checkpoint for a reason that is arithmetic at authoring time, which is
the failure the ceiling rule exists to prevent. **REGRESSION** of `plan-review.md` H2's correction,
which chassis-A absorbed and chassis-B silently un-absorbed by copying the spec's pre-revision
number.

**Correction.** Raise to 8M and say why (the gate is A's plus the visual loop; images dominate).
Cap the verifier loop at three iterations with an explicit escalate-to-conductor on the third, and
give it its own budget line. State the per-iteration image count (140) in the header so the cost is
visible where the ceiling is set.

---

## R7. Baseline provenance is unenforceable: local and CI renders share one filename, only two of twelve tasks get a CI regen, and sub-floor drift accumulates invisibly

**Mechanism.** `examples/showcase/playwright.config.ts` sets no `snapshotPathTemplate`, so
Playwright's default naming applies and every baseline is `<name>-linux.png`. The workstation is
Fedora and CI is `ubuntu-latest`; both are `linux`. Nothing in the filename, the file, or the tree
records which renderer produced an image. `maxDiffPixels: 120` is the acceptance floor, documented
in the config as absorbing CI anti-aliasing jitter with the measured cost noted ("a 1.5px shift on
a 16px icon measured 51 differing pixels … passes at 120").

The plan's protocol is: every task regenerates its moved baselines LOCALLY by file path and commits
them (`plan:62-64`, `plan:117-118`), with the canonical CI regen dispatched exactly twice, after
Task 7 and at pass end (`plan:64-66`). Ten of the twelve tasks therefore commit workstation renders
under CI-canonical filenames. The plan's only guard is "a local render drifting past the 120 px
floor against the CI baseline is reported, never tuned" (`plan:67-68`).

**Consequence.** The guard catches the loud case and misses the one that matters. A local render
that differs from CI's by 40 pixels passes locally, passes on CI, and is committed as canonical.
Ten tasks of that, each within the floor, compound: two independent sub-floor shifts on the same
surface can exceed 120 against the true CI render while every intermediate gate stayed green. This
is precisely the defect class the config's own comment measured. The pass-end regen does overwrite
everything (`e2e.yml:128` runs both specs with `--update-snapshots`), so the final tree is clean,
but that means the per-task `diff-reviewer` reviews and the intermediate baseline diffs the task
reports rest on were all graded against images that the final commit replaces. Nobody re-reads what
changed in that final bot commit.

A second ordering hole sits at pass end. The ritual lists "Code-simplifier over the pass diff"
first, then the verifier loop, then "The canonical baseline regen dispatch, pull, and a green CI run
at the head" (`plan:496-502`). The simplifier can change markup. If it does, the verifier graded a
tree that the regen then re-baselines, and Geoff's before/after captures are of a head that is not
the merged head.

**Correction.** Three sentences in the Ruled input. First: a task's locally regenerated baselines
are provisional, and the pass-end CI regen's diff over them is READ, with any surface whose CI image
differs from the committed local one named in the pass-end report (this is the sub-floor detector
the protocol currently lacks). Second: pin the pass-end order as simplifier → CI regen → pull →
capture the after set from the pulled head → verifier loop → Geoff's read, so every artifact
downstream of the last write. Third: add a third CI regen after Task 9 (which adds four new
surfaces, all locally baselined, that would otherwise ride to pass end unverified).

---

## R8. The baseline dispatch's failure modes are unaddressed: `e2e.yml` is in no task's Files, its dispatch input's description is wrong, and the workflow does not run on this branch's pushes

**Mechanism.** Three separate facts about `.github/workflows/e2e.yml`, none of which the plan
records:

1. The `workflow_dispatch` input's description (lines 8-12) reads "Regenerate the admin-visual
   baseline snapshots instead of asserting against them," while the step it gates (line 128) runs
   `test:e2e -- e2e/admin-visual.spec.ts e2e/site-visual.spec.ts --update-snapshots`, both specs.
   Chassis-B is the pass that makes site-visual regeneration routine and adds a surface to it, and
   `e2e.yml` appears in no task's Files list.
2. `on:` is `push` to `branches: [main, rebuild]`, `pull_request` (any), and `workflow_dispatch`
   (lines 3-12). A push to `chassis-b` triggers nothing. The bot's own commit
   (`github-actions[bot]`, lines 129-142, `git pull --rebase && git push`, no `[skip ci]`) therefore
   fires no run on this branch either, which is fortunate for loops and fatal for the plan's
   pass-end claim of "a green CI run at the head" (`plan:502`): that requires an open PR, which the
   plan opens only in the final sentence of the ritual (`plan:508-509`).
3. The dispatch runs against the pushed ref, not the local worktree. Task 7 Step 3 orders it
   correctly ("re-emit; full gate; commit. Then push, `gh workflow run` …", `plan:355-357`), but it
   places the dispatch and the wait INSIDE a task executed by a workflow implementer, while the
   Ruled input assigns the pull to the conductor ("each followed by `git pull` before the next
   dispatch", `plan:66`). Who holds the branch during the ten-plus minutes the CI browsers run is
   unstated, and the global rule is one writer per worktree.

**Consequence.** (1) leaves a wrong description on the control the pass depends on twice, for the
next reader. (2) means the merge gate's green-CI evidence does not exist until a PR is open, and the
plan's ordering produces it last; the pass can reach "push and PR" with no CI signal ever having run
on the branch's content. (3) is a two-writer window on the contended resource in a pass that
declares "no parallel chains" (`plan:44`).

**Correction.** Add `.github/workflows/e2e.yml` to Task 12's Files with the one-line description fix
("Regenerate the admin-visual and site-visual baselines instead of asserting against them"). Move
the PR open to immediately after Task 1's commit, so every push carries a `pull_request` run and the
merge gate accumulates evidence rather than needing it manufactured at the end. In the Ruled input,
state that a regen dispatch suspends the chain: the implementer commits and pushes, the CONDUCTOR
dispatches, waits, pulls, and only then dispatches the next task.

---

## R9. `/archive/3` may exist, unbaselined and unproven, and the plan admits it does not know the page count while hardcoding the surface list

**Mechanism.** The plan's own Task 7 says the archive test's new case is "three pages if the
featured post is paginated, two if not; the implementer reads `(site)/+page.server.ts` to learn
which" (`plan:334-336`). The home page paginates `entries.slice(1)`, 26 entries, so 2 pages
(verified in `plan-review.md` G2). The `/archive/[page]` route has its OWN server load
(`(site)/archive/[page]/+page.server.ts`) and is not established by the plan to slice off the
featured entry. If it paginates all 27, `ceil(27/13) = 3` and `/archive/3` exists, carrying one
entry.

Yet the surface list is fixed at `archive2` `/archive/2` (`plan:148-150`), the width loop gains
"`archive2` `/archive/2` … as a fourth surface" (`plan:338-339`), and the acceptance criterion reads
"`/archive/2` renders and is baselined at five widths in both schemes" (`plan:360-361`). Nothing
covers a third page.

**Consequence.** A prerendered public route ships unbaselined and unread, at a corpus size the pass
chose. Worse, the home page's pagination status would read "Page 1 of 2" while the archive route's
reads "Page 1 of 3" for the same corpus, a visible inconsistency in a pass whose whole point is
that the exemplar is exemplary. The plan's stop rule does not fire because a new route is not a
moved baseline.

**Correction.** Resolve the arithmetic in the Ruled inputs rather than at dispatch: state whether
the archive route paginates 26 or 27 entries and therefore how many pages exist. If three, add
`archive3` to the capture surface list, the width loop, and the acceptance criterion, and state
whether a one-entry final page is the shape the exemplar wants (it argues for a corpus of 26 or 27
sized to fill both pages). Add an acceptance line: "the home page's and the archive route's page
counts agree, asserted in `archive.test.ts`."

---

## R10. Task 5's `menus.footer` is invisible to `/admin/nav` by construction, so the fork is not removed, it is moved somewhere less honest

**Mechanism.** `/admin/nav` edits exactly one menu. `createNavRoutes` reads and writes
`runtime.navMenu.menuName` and nothing else (`src/lib/sveltekit/nav-routes.ts:72,75,89,114,147`;
the config type is `menuName: string`, `src/lib/content/types.ts:134`). `readMenu`
(`src/lib/nav/site-config.ts:345-349`) looks up only `config.menus?.[name]`. `setMenu`
(`:357-364`) uses `yaml`'s `setIn(['menus', name], tree)`, which preserves sibling keys, so a
`menus.footer` is neither clobbered nor read. The showcase declares one menu config, `primary`.

Today the footer nav is an honest hardcoded array with an honest comment: `SiteFooter.svelte:32-37`,
`/** The footer's nav targets. A scaffolded site owner edits this list. */`.

**Consequence.** After Task 5, `site.config.yaml` carries two menus that look symmetric and are not:
an editor opening `/admin/nav` sees and edits `primary`, and `footer` sits beside it in the same
file, reachable only by hand-editing YAML in the repo. That is a worse affordance than a labelled
array in a component, because the colocation implies editability that does not exist. The plan's own
stated goal, "the footer nav stops forking from the header nav" (`spec:232`), is met on the storage
axis and missed on the axis that matters to the site owner. And it ships to every scaffolded site.

The plan does not rule this; it defers it to the implementer's report: "verify `/admin/nav`
tolerates a second menu; if it edits only `primary`, say so in the report and the footer still reads
the yaml" (`plan:285-286`). The answer is knowable now, and the ledger has no ruling on footer nav,
menus beyond one, or `readMenu` scope (searched; `audit-adapter-navmenuconfig` at
`engine-rulings.md:1049-1054` rules only that declaring `editor.nav` turns `/admin/nav` on).

**Correction.** Decide it in the Ruled inputs. The lean answer that stays inside the pass: move the
footer list into `site.config.yaml` as `menus.footer`, AND write the yaml comment that says it is
developer-edited because the nav editor is bound to one menu, AND record the second-menu editing
question as a chassis harvest item for the engine (Task 12 already banks a harvest). Do not leave
the affordance question inside a task report. If the answer is instead "the footer stays a code
array," say so and close review 4.7's nav half as declined with the reason.

---

## R11. Task 8 changes an engine gate script, contradicting the plan's own "no engine code changes" constraint, and does so against the gate's stated reasoning

**Mechanism.** `plan:113` is a global constraint: "`check:surface` unchanged; no engine code
changes; no public export added or removed." `plan:22-24` repeats it: "No engine code changes."
Task 8's Files list then names `scripts/checks/check-public-tokens.mjs` (`plan:371-372`), adding
`site.css` to the scanned set at about `:79`, "the literal scan and the resolution check both read
it." `scripts/checks/` is engine code by every other reckoning in this repo (`check:reference`,
`check:template`, `check:consumers` all live there and all count as the engine's gate estate).

The substance is also contested. That script's own header reasons that the token definition layers
are excluded on purpose: "Its own generic defaults are unconditionally overridden by theme.css's
later declarations, so it is a definitions layer the same way theme.css is, and is excluded from
the no-literals walk on that basis." `site.css` is the Waymark THEME's chrome stylesheet, one layer
out from `theme.css`. Bringing it under an engine gate makes the engine's gate estate police a
theme's own choices, which the charter assigns to the site. The ledger carries no ruling on
`check:public-tokens` scope (searched; the nearest,
`audit-cli-type-scale-gap-scale-token-colors-grammar-boundary-static-gr` at `engine-rulings.md:4965-4970`,
rules the palette-versus-grammar boundary, not this gate's file set).

**Consequence.** A reviewer holding the plan's stated architecture rejects the diff, or accepts an
engine-gate scope change reviewed as CSS conformance. Either way the boundary the pass declared is
not the boundary it keeps.

**Correction.** Either drop the gate extension and record it as a chassis harvest item routed to
polish with the definitions-layer argument attached, or keep it and amend `plan:22-24` and
`plan:113` to read "one engine gate script changes (`check-public-tokens.mjs`'s scanned set); no
engine runtime code and no public export changes," with a sentence answering the definitions-layer
reasoning (`site.css` is a consumer of tokens, not a definer of them, which is the honest and
probably winning argument). Task 8's Step 1 already requires proving the gate bites on a planted
literal, which is the right evidence; the boundary statement just has to match.

---

## R12. Chassis-A is mid-flight at Task 4 of 12, and five of chassis-B's Ruled inputs assert unlanded A outcomes as settled facts with no fallback

**Mechanism.** `chassis-a` is at `b126d892`; `git log main..chassis-a` shows five commits covering
Tasks 1 to 4 (reformat, scaffold format check, the `prettier-ignore` remedy, the comment gate, the
fixture exclusions). Tasks 5 to 12 have not run. Chassis-B's Ruled inputs state several of their
outcomes in the perfect tense:

- "`createSectionAction` IS adopted in `admin/signups` (… chassis-A Task 10 recorded the raw shape
  as deliberate pending this pass)" (`plan:99-101`). A Task 10 has not run; the comment does not
  exist (grep for the phrase across `examples/showcase/` returns nothing; it appears only in
  planning records). Task 10's Files list instructs the deletion of a comment that may never be
  written in the wording assumed.
- "`siteConfig`'s one door already holds … chassis-A Task 10 adds `.js` to the bare four … so
  review 1.2 is closed by A and this pass only verifies" (`plan:102-104`). Same unlanded task.
- "chassis-A Task 9's table gains the 27-entry case" (`plan:334-335`) presumes A Task 9 writes
  `archive.test.ts` table-driven. A's Task 9 does say table-driven, but if A Task 9 is re-scoped the
  instruction dangles with no fallback.
- "chassis-A Task 5 deleted two carriers, so re-count at dispatch; the spec's arithmetic says 20
  remain" (`plan:240-241`). A Task 5 has not run. (The arithmetic itself is sound: 22 rings today,
  including `Carousel.svelte:182` and `IntroLedger.svelte:187`, so 20 after A's deletions.)
- `plan:130-131` pins the `// prettier-ignore` line above `backend:` in `cairn.config.ts`, which is
  the A Task 1 remedy at `de93536c`, correctly. But A Task 6 SPLITS `cairn.config.ts`, moving the
  icon set and nine `defineComponent` declarations out. Whether the pinned literal survives that
  move in the same file, and whether Prettier's ignore comment travels, is not addressed anywhere.

Two of A's outstanding tasks also double-write files chassis-B plans to edit. A Task 11 rewrites the
type-scale derivation at `theme.css:191-225` and both stale 220-post comments
(`archive.ts:7-9`, `svelte.config.js:39-46`); B Task 8 says the `--text-step` clamps land "with the
derivation comment updated" (`plan:367-369`) and B Task 7 rewrites both of those same comments
again (`plan:332-338`). A Task 7 creates `siteMeta` in `$chassis/content.ts` holding title,
description AND origin as the single composition point for site metadata; B Task 5 then edits the
same file's `ORIGIN` comment and adds five NEW direct `siteConfig.siteName` reads in the header,
footer and four titles (`plan:265-278`) without saying whether those should route through `siteMeta`
instead.

**Consequence.** The header's blanket instruction, "every anchor below is re-verified at dispatch
against post-A `main`" (`plan:10-11`), covers file:line drift. It does not cover a premise that A
never established, a comment whose wording differs from what B expects to delete, or a
single-source rule A created that B's additions quietly fork. Chassis-A has already produced one
escalation and one remedy commit at Tasks 1 and 2 (STATUS, `docs/STATUS.md`, "Immediate next
action"), so re-scoping is a live possibility, not a hypothetical.

**Correction.** Add a "Reconciliation at dispatch" block naming each dependency, what A task
produces it, and the fallback if A did not land it: (1) the `createSectionAction` comment, fallback
is that Task 10 deletes whatever comment exists or none; (2) the `.js` specifiers, fallback is that
Task 5 does the sweep; (3) `archive.test.ts`'s shape, fallback is that Task 7 writes the 27-entry
case in whatever shape A left; (4) the ring count, re-derived by the task's own grep; (5) the
`prettier-ignore` pin, re-located after A Task 6's split. And add one sentence to Task 5: whether
the wordmark and titles read `siteConfig.siteName` directly or `siteMeta.title`, decided against
A Task 7's single-source rule.

---

## R13. The pass's before set and its intended-change record live outside the repo, so a session loss destroys the only gate the pass has

**Mechanism.** The pass's entire visual evidence base is `~/.cache/cairn-chassis-b/pass/before/`
(`plan:157-159`) plus per-task `~/.cache/cairn-chassis-b/<task>/{before,after}/` (`plan:115-117`),
and the pass-end verifier's input is that before set plus "the consolidated list of intended changes
from every task report" (`plan:498-499`). Task reports are agent transcripts. Neither the images nor
the enumerations are committed.

The `visual-fidelity` skill is explicit on this point: the enumeration of the original "is a
committed file" and "verifiers verify against the MANIFEST, never against the plan"
(`~/.claude/skills/visual-fidelity/SKILL.md`, step 1).

**Consequence.** A context clear, a machine reboot, a cache eviction, or a worktree relocation
between Task 1 and pass end leaves the verifier with an after set and no before set and no
consolidated intent list, and the gate cannot run. Rebuilding the before set means checking out
Task 1's parent, installing, building, and re-capturing, which is expensive and, once the corpus has
grown, no longer reproducible for every surface. The pass runs unattended with guards armed for
overnight windows, which is exactly when this happens. STATUS's own resume prompt anticipates a cold
session; it has no instruction for recovering the visual evidence.

**Correction.** Make the intended-change enumeration a committed file:
`docs/internal/record/2026-09-04-chassis-inputs/chassis-b-visual-manifest.md`, created by Task 1
with the before-set inventory (surface, width, scheme, and the `.missing` entries) and appended by
every paint-changing task with its enumerated moves, committed in the same commit as the change.
The verifier reads that file. Keep the PNGs in `~/.cache` (they are large and regenerable from a
commit), but record in the manifest the commit sha each before capture came from, so the set can be
rebuilt deterministically. Add one line to the resume prompt in STATUS naming the manifest as the
recovery artifact.

---

## R14. Full-page captures of a 27-post home page at 320 and 2560 may be unreadable to the grader, and the one-check rule's main-loop read is missing from the ritual

**Mechanism.** `capture-surfaces.mjs` writes "`<surface>-<scheme>-<width>.png` full-page"
(`plan:145-149`), and `admin-visual.spec.ts` already captures `/admin/posts` with `fullPage: true`.
After Task 7 the home page's page 1 carries a featured lead plus thirteen entry rows and a pagination
block, and `/admin/posts` carries 27 rows. A full-page capture at 320 wide is an extremely tall,
narrow image; vision models downscale to a bounded long edge, so the 320-wide capture arrives with
its content at a fraction of legible size, and the 2560-wide capture arrives with each row a few
pixels tall. The `visual-fidelity` skill's grading contract is per-width verdicts per visual device
from "SEPARATE LABELED image blocks."

Separately, `CLAUDE.md`'s visual rule and the skill's step 5 both require that "the main loop READS
the final renders itself" before anything ships. The pass-end ritual (`plan:494-509`) runs the
simplifier, the verifier loop, the regen, the reviewer fan-out, the gates, and then "push and PR
with the before/after captures … attached for Geoff's read; **Geoff merges.**" The conductor's own
read is not in the list, and the global conducting rule ("the conductor … never reads a source file,
a diff, a test log") pulls the other way, so the omission reads as deliberate rather than accidental
and nobody is assigned it.

**Consequence.** The verifier can return PASS on images in which the differences are below its
resolution, which is the self-grading failure one level down: a gate that cannot fail. And the
one-check rule, which CLAUDE.md states as family-wide and non-optional, is unmet, leaving Geoff's
read as the only human-eye gate on a pass that changes rendered output by design.

**Correction.** Give the capture tool a viewport-clipped mode alongside full-page and require the
verifier to grade the clipped above-the-fold capture plus a named region crop per enumerated
change, with full-page reserved for layout-level checks. State the maximum capture height beyond
which a surface is graded in sections. And add one line to the ritual: "the conductor reads the
final full-page renders of the changed surfaces at 390 and 1440 in both schemes itself before the
PR opens (the one-check rule); this is the one execution-phase read the conductor performs, and it
is a visual read, not a diff read."

---

## R15. The spec's Risks section carries no chassis-B risk at all

**Mechanism.** `spec:264-274` lists four risks: the comment gate's finding volume, the render trio's
public-surface removal, the whole-showcase reformat's diff size, and the `prose.css` contention
between chassis-A and internals-C. All four are chassis-A risks. Chassis-B is the pass that changes
rendered output by design, grows the shipped corpus by 93 per cent, adopts two fail-closed auth
guards, and depends on a two-shot CI baseline regeneration; none of that appears.

**Consequence.** The spec is the document a later reader consults to learn what this work could cost.
It currently implies chassis-B is the safer of the two passes, which is the opposite of true: A is
structural and output-neutral, B moves pixels, auth, and shipped content.

**Correction.** Add four bullets to Risks, each naming the trigger and the mitigation: the primitive
adoptions can force a visible redesign (mitigation: the task reports it rather than forcing it,
`plan:87-88`); the auth adoption changes the signups route's authorization (mitigation: the access
map declares the same admitted set, R1); thirteen posts enter every scaffolded site (mitigation:
whichever of R5's three options is ruled); baselines are regenerated locally per task and
CI-canonically twice, so sub-floor drift can accumulate (mitigation: R7's read of the final regen
diff).

---

## R16. Task 2's ".site-main width block deleted" is ambiguous, and eighteen rules depend on the rest of that declaration

**Mechanism.** `plan:180-182` says `site.css`'s "`.site-main` width and min-width block and its
comment admitting the re-derivation deleted; `.site-main` keeps only what is not the shell mechanic."
The actual rule (`examples/showcase/src/theme/site.css:77-100`) is one declaration block holding, in
order, a long comment, `width: 100%`, `min-width: 0`, a second comment, `max-width:
var(--container-measure)`, `margin-inline: auto`, and `padding: var(--spacing-l) var(--spacing-m)`.
"The block" reads as the rule. Only the first two properties are the shell mechanic; the last three
are the theme's measure and gutter, and eighteen descendant rules depend on them:
`.site-main figure` and its img/figcaption rules (`site.css:109-130`),
`.site-main figure:not(.cairn-place-center) img` (`:139-142`), `.site-main .cairn-place-center`
(`:145-151`), `.site-main .cairn-place-wide` (`:155-160`, which uses `left: 50%; transform:
translateX(-50%)` measured against `.site-main`'s box), and `.site-main .cairn-place-full`
(`:164-179`).

**Consequence.** An over-deletion breaks every full-bleed and wide image treatment on the reading
surface. The mitigation does hold: the article is baselined at five widths in both schemes, so
`site-article-*` moves and Step 1's stop rule fires. So this is a cost risk (a wasted dispatch and a
re-run), not a correctness risk, but it is avoidable with one clause.

**Correction.** Write the two properties by name: "the `width: 100%` and `min-width: 0`
declarations and the comment above them are deleted from `.site-main` (they become the chassis
pair's job); `max-width`, `margin-inline` and `padding` stay, since eighteen `.site-main`-scoped
figure and breakout rules measure against them."

---

## R17. Task 6's "the two style blocks deleted" over-reaches: the pagination and index rules live in the same blocks

**Mechanism.** The extraction claim itself checks out, and this is worth recording as verified: a
`diff` of `(site)/+page.svelte:333-425` against `archive/[page]/+page.svelte:103-187` shows the two
rule sets are byte-identical in every declaration, including the `@media (max-width: 34rem)` block;
only comment lines and blank lines differ. So `plan:314-317`'s "a pure extraction; every baseline
unchanged" is well founded for the `.entry*` rules.

But those line ranges are not only `.entry*`. They also hold `.pagination`, `.pagination__link`
(+ `:hover`, `:focus-visible`), `.pagination__status`, `.index__head`, `.index__count`,
`.index__year` and `.index__year--first`, none of which belong to the extracted component and all of
which must stay on the pages. `plan:314-315`'s instruction, "the three call sites; the two style
blocks deleted," would take them with it.

A smaller residue: the plan renames `entry--undated` to `site-entry--undated` and the root to
`site-entry` (`plan:301-303`) but leaves `.entry__date`, `.entry__title` and `.entry__excerpt`
un-renamed, so the component ships a half-migrated BEM family under a namespace convention the same
pass states in Task 8.

**Consequence.** The pagination block Task 7 is about to reveal loses its styling, on the home page
and the archive route both, and the failure surfaces as a baseline move in the very task whose
acceptance criterion is "every baseline unchanged."

**Correction.** Name the rules that move: "`.entry`, `.entry--undated`, `.entry__date`,
`.entry__title` (with its `a`, `:hover` and `:focus-visible`), `.entry__excerpt` and the
`@media (max-width: 34rem)` block move into the component, renamed under the `site-*` convention;
`.pagination*` and `.index__*` stay on their pages." Add the acceptance line "`grep -n
'pagination__link' examples/showcase/src/routes` still returns both pages."

---

## Ranked top five

1. **R1.** Task 10 adopts `requireAccess` and `createSectionAction` against a showcase that declares
   no access map (`grep` for `defineAccess`/`defineRoles` over `examples/showcase/src` returns
   nothing; `guard.ts:194` attaches `{}`), and both are fail-closed on an unmapped target
   (`guard.ts:302-311`, `:288-291`; `section-action.ts:286-298`). The route 403s for every session
   including the owner, all four `custom-screen.spec.ts` assertions fail, and the only file that
   could fix it, `cairn.config.ts`, is absent from the task's Files. The swap also widens the
   route's authorization from owner-only to whatever the map admits, on a D1 table of names and
   email addresses, with no stated posture. REGRESSION of `plan-review.md` R4.
2. **R3 with R4.** Task 3's enumerated paint moves miss the two largest ones its own adoptions make:
   `.cairn-section` (`composition.css:44-50`) adds `margin-block` plus `> * + *` inter-child spacing
   to `.index`, which carries no box geometry at all today, and `.cairn-card`
   (`composition.css:20-29`) adds `padding: var(--spacing-m)` on top of the members card's existing
   inner `p-6` (`members/+page.svelte:26-27`). The task halts on its own stop rule at Step 1. And
   `.cairn-card`'s only real adoption is on `src/routes/members`, which `.cairn-template.json`
   excludes from the scaffold, so the primitive gains a proof no consuming site inherits while Task 9
   promotes an excluded fixture into the public width matrix, inverting both of the spec's
   organizing rules.
3. **R6 with R7.** 6M for twelve tasks reinstates the figure `plan-review.md` H2 rejected for
   chassis-A, which sits at 7.5M for the same count with a strictly lighter gate; chassis-B adds
   ~144 per-task image reads, an uncapped pass-end verifier loop reading 140 images per iteration,
   and thirteen content-gated posts. Underneath it, the baseline protocol is unenforceable: local
   and CI renders share the `-linux.png` filename (no `snapshotPathTemplate`, both hosts Linux),
   ten of twelve tasks commit workstation renders, and the only guard catches drift PAST the 120px
   floor while sub-floor drift is the documented defect class the floor exists to absorb.
4. **R5.** Thirteen posts authored to make `totalPages > 1` ship as every scaffolded site's starter
   corpus: `src/content/` is in no exclude list and `bake-template.mjs` never touches it, so
   `templates/waymark/src/content/posts/` goes from 14 to 27, at 150 to 300 real words each, while
   `docs/extend/what-the-scaffold-wrote.md:48` keeps saying "(14 sample entries)" and is in no
   task's Files until Task 11. This is the spec's own rule 1 ("the fixture job is marked or
   excluded", `spec:52`) inverted at the largest scale in the pass, and the ledger has no ruling on
   scaffold seed content.
5. **R12 with R2.** Chassis-A is at Task 4 of 12, yet five of chassis-B's Ruled inputs assert A's
   unlanded outcomes as settled (the `createSectionAction` comment that does not exist, the `.js`
   specifier sweep, `archive.test.ts`'s table shape, the 20-ring count, the `prettier-ignore` pin
   that A Task 6 will move), and A Tasks 7 and 11 double-write four files chassis-B edits. The
   header's "re-verify every anchor at dispatch" covers line drift, not an unestablished premise.
   The same absent-mechanism problem sinks Task 10's new test: `access-map.spec.ts` mints no session
   at all (it is a pure `canReach` unit test, `:15-16,26-28`) and the dev backend mints owner
   unconditionally with no role selection (`packages/cairn-cms-dev/src/handle.ts:128-137`), so the
   403 branch cannot be driven as written.

---


Read-only. Verified against the working tree at `main` (`d565ab77`, the same baseline the plan
declares) plus chassis-A's plan as the declared delta. Every `file:line` was opened, not inferred.
Context read in full: the spec's "Chassis-B", "Out of scope for both" and "Risks" sections; the
banked inputs (`chassis-b-inputs.md`); the chassis-A round's three-lens review (`plan-review.md`),
whose Lens 3 shape this report imitates; the chassis-A plan as the house exemplar;
`~/.claude/workflows/pass-execute-chains.js`; `~/.claude/skills/cairn-pass/SKILL.md`; the sizing
rules in `~/.claude/CLAUDE.md`; and `docs/HISTORY.md` for the observed per-task rate. Findings that
regress a correction the chassis-A round already made are marked **REGRESSION**.

The one thing to say first, because it colours every finding below: this plan is better authored
than chassis-A's was at the same stage. It folds the archive item it inherited, it names the primitive
call sites in the Ruled inputs instead of leaving them to dispatch, it states the baseline-regen
protocol per task and CI-canonically, and it carries zero em dashes (`grep -c ', '` = 0). The findings
are about size and about what a zero-context Sonnet can actually reach, not about direction.

---

## H1. The ceiling is 20 per cent BELOW chassis-A's for a strictly heavier pass, REGRESSION

`plan:40` sets **6M for twelve tasks** (0.50M per task). Chassis-A, at `2026-09-04-chassis-a-pass.md:38-39`,
sets **7.5M for twelve tasks** and says why in its own fold note: "review fold: 6.5M sat at the
observed per-task rate". That fold is the chassis-A round's H2 correction, and chassis-B silently
reverses it, to a number lower than the one H2 rejected.

The reversal runs the wrong way against every cost driver:

- Chassis-A's per-task gate (`chassis-a:101-104`) is `format:check`, the showcase `check`,
  `test:unit`, `test:e2e`, and the engine gates. Chassis-B's (`plan:126-132`) adds
  `check:consumers`, `check:comments`, and a full `packages/create-cairn-site` `prepack` plus its
  806-test suite, per task.
- Chassis-B adds image reads, which chassis-A had none of. The per-task budget is 4 images per
  changed surface (`plan:120-122`); Task 3 changes five surfaces (20 images), Task 7 two plus the
  admin office (8 to 12), Task 9 two new (8). The pass-end verifier reads **every public surface at
  five widths in both schemes, before and after**: the capture tool's surface list (`plan:146-151`)
  is seven surfaces, so 7 x 5 x 2 x 2 = **140 full-page images in one agent**, and `plan:496-502`
  makes it a LOOP that re-grades from scratch on FAIL.
- Task 7 authors thirteen posts through two skill files and a per-post review gate, and Task 11 is
  an unbounded cover-to-cover scaffold read (H2).
- Observed rate: internals-C ran ~0.55M per task at a lighter gate (`HISTORY.md:43-45`, and the
  chassis-A round's H2 arithmetic). internals-B's own entry records ceiling 6.5M for fourteen tasks
  and a metering gap (`HISTORY.md:131-134`); the 2026-08 workflow pass ran "at or slightly over
  ceiling" at 6M (`HISTORY.md:178-180`).

Twelve tasks at chassis-A's own accepted 0.63M, plus one 140-image verifier loop, lands at 8.5M to
9.5M. The pass blows the 80-per-cent stop at Task 8 or 9, on a number that was predictable while
writing the header. That is exactly the failure the ceiling rule exists to prevent.

**Rewrite:** if the pass holds at twelve tasks, `plan:40` reads "**Token ceiling:** 9M (12 tasks; the
gate is heavier than chassis-A's by the create-cairn-site suite and image reads dominate; the pass-end
verifier alone reads 140 images and may loop)". If the pass splits (H2), each half takes 5M. Either
way, name in the header the four tasks expected to exceed 0.7M (3, 7, 9, 11) with their split points
pre-agreed, so the checkpoint has a decision rather than a question.

## H2. Three tasks carry more than four deliverables, one is unbounded, and the split count says
split the PASS

Counting deliverables as "a thing a reviewer could reject on its own":

- **Task 3** (`plan:197-228`): the styleguide masthead onto `.cairn-hero`; a NEW styleguide
  composition section with captions; two `.cairn-section` adoptions on the home page; `.cairn-band`
  on the error page; `.cairn-card` on two members pages; the conditional `.cairn-sidebar-layout`;
  the README table; the baselines. That is **eight**, across six route files and five surfaces, and
  it is the pass's single largest paint mover.
- **Task 5** (`plan:262-296`): the wordmark; eight title sites on a new convention; a new
  `footerNav` export; a new `menus.footer` yaml block; the footer component rewired; a possible
  `+layout.server.ts` change; the `ORIGIN` comment; the `email.from` decision. That is **eight**,
  across twelve files, and it mixes purely mechanical title work with a behavioural change (the
  footer's data source, plus an unverified assumption about `/admin/nav`).
- **Task 7** (`plan:325-362`): thirteen authored posts through two skill files and a content gate;
  the page-size constant; two comment rewrites in two files; the `archive.test.ts` case; the fourth
  e2e surface; three baseline families regenerated; the content index regen; and a push-plus-CI
  dispatch with a wait. That is **eight**, and one of them (the corpus) is the pass's largest single
  unit of authored output.
- **Task 11** (`plan:446-469`) has no bound at all: "read the scaffold as a first-time developer …
  List every sentence that describes the showcase rather than a scaffolded site, every header that
  is still process narration, every doc tree line that does not match a real file." The finding
  population is whatever the tree holds, in a Sonnet dispatch, at the end of a pass. Chassis-A's
  round flagged the same shape (its Task 2) as "unbounded volume" and the plan header there names it.

Task 1, 2, 4, 6, 8, 9, 10, 12 are each one coherent unit (Task 8 and 9 sit at five, borderline).

The workstation rule is explicit: "a second task split in one pass is the prompt to propose splitting
the pass; a third means the proposal is overdue" (`~/.claude/CLAUDE.md`, "Pass sizing is the
orchestrator's job"). Three tasks need splitting here, and a fourth needs a bound. Splitting all three
in place makes this a **fifteen-task** pass, which is the accretion signal, not discipline.

**Rewrite:** split the pass at the Task 6/7 boundary.

- **Chassis-B (adoption, seven tasks):** Task 1 (capture tool), Task 1b (the CSS reformat), Task 9
  (the width matrix, moved forward per H6), Task 2 (shell), Task 3a (the five site adoptions), Task 3b
  (the styleguide composition section), Task 4 (focus ring), Task 6 (entry row). Its verifier grades
  five surfaces, not seven.
- **Chassis-B2 (corpus and conformance, six tasks):** Task 7a (the thirteen posts alone, already its
  own commit at `plan:346-348`), Task 7b (page size, comments, test, the archive surface and its
  baselines), Task 5 (identity, split into titles and footer-nav), Task 8 (CSS conformance), Task 10
  (idioms and the exemplar), Task 11 (waymark), Task 12 (records).

If Geoff wants one pass, the cut list instead: drop Task 9's `public-alignment.spec.ts` (H4), drop
Task 3's styleguide composition section to B2 (it is the one sanctioned non-site adoption, so it is
also the one item that is not "the exemplar uses its chassis"), and bound Task 11 to the README, the
`src/chassis` and `src/theme` file headers, and `what-the-scaffold-wrote.md` only.

## H3. Task 4 Step 2 asks the implementer to do something its toolset cannot do

`plan:254-255`: "keyboard-tab through the home, article, and styleguide in the preview and confirm the
ring draws on the first three controls of each (the report names them)."

`cairn-implementer`'s tools are Read, Write, Edit, Bash, Grep, Glob. There is no browser, no
claude-in-chrome, no MCP. A Sonnet implementer meeting this either stops (best case, one wasted
round-trip and a `couldNotDo` entry the conductor then has to adjudicate) or writes the sentence
without doing it (worse case, an unfalsifiable claim inside the one task whose whole subject is
a state screenshots cannot capture, which the existing suite says explicitly at
`e2e/site-visual.spec.ts:76-79`).

**Rewrite:** make it a test, not a claim. Step 2 becomes "extend `e2e/site-visual.spec.ts`'s focus
assertion into a loop over the home, article, and styleguide: `page.keyboard.press('Tab')` three
times per page, asserting a non-`none` computed `outline-style` and the token-resolved
`outline-offset` on each `:focus-visible` element; the spec is the report's evidence." That is
runnable under `Bash`, it survives the pass, and it is the only form the diff-reviewer can check.
The same objection applies in miniature to `plan:223` ("read by the implementer and named in the
report"), which IS reachable (the implementer can `Read` a PNG), so leave that one.

## H4. Task 9's alignment spec is built on a premise the doc contradicts

`plan:397-401` creates `e2e/public-alignment.spec.ts`, "the computed-style compensation for the
public template, **two devices named in** `docs/internal/public-design-system.md`'s 'Vertical
alignment mechanics' section".

That section (`docs/internal/public-design-system.md:253-265`) names no devices to compensate. It
says the opposite, in bold: "**The measured public corpus found ZERO rows above the 2px bar.** The
2026-08 cairn-wide inventory rendered the `(site)` chrome, the representative article page, and
`/styleguide` at all five viewports in both themes and found nothing to fix. What follows is
doctrine for the next theme port, not a record of repairs."

So the plan's own fallback branch ("if the section names no measurable device, it instead says why
the floor is uncompensated") is the branch that applies, and the plan could have determined that by
opening the file. As written, a zero-context implementer reads "two devices named in the doc", opens
the doc, finds none, and has to choose between inventing two and taking the fallback, mid-task.

**Rewrite:** delete the spec file from Task 9's Files list and replace both items with one: "in
`docs/internal/public-design-system.md`, the 'Vertical alignment mechanics' section gains one sentence
stating that the public corpus measured zero rows above the 2px bar in 2026-08, that no numeric
compensation test exists for that reason, and that the trigger for writing one is the first public row
that fails a read (the admin's `src/tests/component/vertical-alignment-recipes.test.ts` is the shape it
would take)." This is a cut of one deliverable and one new e2e file, and it is more honest than the
test would have been.

## H5. Task 1's single commit mixes a mechanical reformat with a new Playwright tool, defeating
the reason the reformat is first

`plan:166-167`: "re-emit; full gate; ONE commit whose subject says it is the mechanical CSS reformat
plus the capture tool." A commit subject naming two unrelated things is the tell.

The spec's own risk register explains why this matters (`spec:271-272`): "The whole-showcase reformat
is a one-time large diff; it is first on the branch and reviewed as mechanical so no later review reads
reflow." A commit that also carries a novel ~150-line Playwright script (seven surfaces, an auth
session helper, ten viewport/scheme combinations, a `.missing` sentinel) is not reviewable as
mechanical, and the diff-reviewer gets exactly one diff for both.

**Rewrite:** two commits in one task, or two tasks. Step order becomes: (1) the capture tool alone,
committed; (2) the before set banked with it; (3) the ignore and target-set edits, `format` run,
whitespace-only proof, committed separately as the mechanical reformat; (4) re-emit and gate. Say
"two commits" in the step text, since the workflow's implementer prompt commits "at each step
boundary the plan marks Commit" (`pass-execute-chains.js:78`) and will otherwise fold them.

## H6. Ordering: Task 3 changes two surfaces that Task 9 has not yet baselined

`plan:216-227` adopts `.cairn-band` on the root error page and `.cairn-card` on both members pages,
and accepts on "the report's enumerated moves **match the baseline diff exactly**" (`plan:227`).

There is no baseline diff for either surface at Task 3. `e2e/site-visual.spec.ts:26-55` covers exactly
three surfaces (home, article, styleguide), and its snapshot directory holds exactly those 31 files
(`ls e2e/site-visual.spec.ts-snapshots`). `error404` and `members-login` do not enter the matrix until
**Task 9** (`plan:391-392`). So Task 3's acceptance criterion is unsatisfiable for two of its five
surfaces, and worse, the pass never gets a committed before/after baseline pair for the 404 band or the
members card: Task 9 baselines them in their already-changed state.

Two smaller instances of the same class:

- `plan:393` baselines `/admin/signups` at Task 9; `plan:420-425` then rewrites that route's `load`
  through `requireAccess` and both actions through `createSectionAction` at Task 10. If the access
  path changes what renders under the suite's session helper, the baseline moves in a task whose
  Files list names no snapshot and whose steps enumerate no visual move.
- `plan:307` (Task 6) puts `cairn-focus-ring` on the entry title link, which Task 4 produces. That
  order is correct and needs no change; noting it because it is the one dependency the plan got right
  and it should not be disturbed by any reordering.

**Rewrite:** move Task 9 to run immediately after Task 1 (it only needs the capture tool and Task 1's
answer to the preview-404 question), renumber, and let every later adoption land against a complete
matrix. Then Task 3's acceptance criterion is real, and Task 10 gains one line: "the
`admin-office-*` and `admin-signups-*` baselines are unchanged; if either moves, the access-path
change altered the render and the move is enumerated."

## H7. A later task consumes a finding that lives only in an earlier task's report, which no later
implementer can see

`plan:406-407` (Task 9, Step 1): "determine whether the root `+error.svelte` renders under `vite
preview` for an unmatched path (**Task 1's before set says**)".

Task 9's implementer is a fresh Sonnet dispatch. `pass-execute-chains.js:65-84` builds its prompt from
the repo path, the plan path, the task id, the condensed criteria, files, notes, and the gate command.
It carries **no prior task's report**. The implementer report (`IMPL_SCHEMA:17-27`) goes to the
diff-reviewer and to the conductor's return value, never to the next implementer. So "Task 1's before
set says" resolves to either a `.missing` file the implementer must find in `~/.cache` (outside the
worktree, uncommitted, and the path is only in Global constraints as `<task>`), or nothing.

**Rewrite:** make the finding an artifact, not a report line. Task 1 Step 1 gains: "record the surface
availability findings as a comment block at the top of `scripts/capture-surfaces.mjs` (which surfaces
render under `vite preview`, which need a different server, and why), so a later task reads it from the
tree." Then Task 9 Step 1 cites `scripts/capture-surfaces.mjs`'s header instead of a report. Apply the
same fix wherever a task says "the report says": `plan:286` (Task 5's `/admin/nav` finding, which Task
12's harvest is supposed to pick up) has the same defect.

## H8. Interfaces blocks declare what is produced and never what is consumed

Tasks 1 and 4 carry `Produces` lines. No task in the pass carries a `Consumes` line, and four
consumptions cross task boundaries:

- Task 6 consumes `cairn-focus-ring` from Task 4 (`plan:302` names it inside a Files parenthetical).
- Tasks 3, 5, 6, 7 and 9 consume `scripts/capture-surfaces.mjs` from Task 1 (via Global constraints).
- Task 7 consumes chassis-A Task 9's `archive.test.ts` table (`plan:334`), a cross-PASS dependency.
- Task 12 consumes every task's enumerated moves and the Task 5 `/admin/nav` finding.

The exemplar does this correctly: `chassis-a:331` reads "Consumes: `alert` from
`$theme/markdown-components.js` (Task 6)". The chassis-A round's H3 is the finding that produced that
line, so its absence here is **REGRESSION**.

**Rewrite:** add to Task 6 "Consumes: the `cairn-focus-ring` utility (Task 4)"; to Tasks 3, 5, 7, 9
"Consumes: `scripts/capture-surfaces.mjs` (Task 1)"; to Task 7 "Consumes: the `archive.test.ts`
table (chassis-A Task 9); if chassis-A's table is absent at dispatch, write the case standalone and
report it." No name in the plan is produced under a different name than it is consumed, which is the
one thing this lens checks that passes clean.

## H9. The screenshot budget is stated in prose the reviewer prompt cannot enforce

`plan:120-122` states the budget as "the `diff-reviewer` reads at most the changed surfaces at 320,
1440, and 2560 in light plus 390 in dark". The diff-reviewer does read Global constraints
(`pass-execute-chains.js:99`, "plus the 'Global constraints' section"), so the sentence is reachable.
Three things stop it from being enforceable:

1. The capture directory is `~/.cache/cairn-chassis-b/<task>/{before,after}/` (`plan:116-118`), with
   `<task>` never defined. `Task 3`? `task-3`? `3`? A reviewer that guesses wrong reads nothing and
   verdicts on the diff alone, silently, which is the failure mode the visual method exists to prevent.
2. `REVIEW_SCHEMA` (`pass-execute-chains.js:30-62`) has no field for images read or moves matched, so
   "the reviewer honoured the budget" is not machine-checkable and the conductor cannot tell a
   verdict that read the images from one that did not.
3. The reviewer prompt says "The task's diff is exactly the commits the implementer reports below"
   (`:104`). Captures are outside the repo and outside the diff. Nothing tells the reviewer to leave
   the diff.

**Rewrite:** pin the directory literally in Global constraints (`~/.cache/cairn-chassis-b/task-<N>/`,
with `<N>` the plan's task number), and state in the plan's execution header the exact `notes` string
the conductor passes for each paint-changing task: "Before verdicting, read the before/after pairs
under `~/.cache/cairn-chassis-b/task-<N>/` for the surfaces the implementer's summary enumerates, at
320, 1440 and 2560 light plus 390 dark, and no others; a baseline the summary does not enumerate is a
blocking finding." Then add to each paint task's acceptance criteria "the reviewer's summary names
each image pair it read", which is the only enforcement the schema affords.

## H10. Five acceptance criteria are not testable by a command or a read, or do not match their steps

- **Task 3** (`plan:228`): "the `daisyui-a11y-reviewer` finds no regression on the members card or the
  404 **at pass end**." A task's criteria are the diff-reviewer's contract; this one cannot be
  evaluated until the ritual runs. Move it to the pass-end ritual list, where `plan:503` already names
  that reviewer for Task 3.
- **Task 3** (`plan:227`): the baseline-diff match, unsatisfiable for two surfaces (H6).
- **Task 5** (`plan:294`): "zero renderable 'Waymark' literals", against a step whose grep excludes
  "comments and content" (`plan:288-289`). No grep distinguishes those. Rewrite as a runnable command:
  `grep -rn "Waymark" examples/showcase/src --include='*.svelte' --include='*.ts' | grep -v "^.*://" | grep -v src/content` and state the expected hit list, or drop to "the five renderable sites named in
  the Files list read `siteConfig.siteName`", which a read verifies.
- **Task 7** (`plan:359`): "thirteen dated 2025 and **reviewed**". Reviewed is unfalsifiable from a
  diff. Rewrite as "each post's `content-review` findings are recorded in the report with the fix or
  the reason it was declined" (a report obligation the schema's `summary` can carry), plus the two
  mechanical halves that ARE checkable: thirteen files matching `src/content/posts/2025-*.md`, each
  150 to 300 words by `wc -w` on the body.
- **Task 11** (`plan:468-469`): "no scaffold file describes itself as the showcase". Unbounded and
  unverifiable as stated. Bound it to a grep the reviewer can run:
  `grep -rn "showcase\|examples/" <scaffold>/src <scaffold>/README.md` returns nothing outside a named
  allowlist.

## H11. Six steps describe without specifying, and four of them the plan can settle by a read it
did not do

The plan is unusually good about this (the Ruled inputs block settles the primitive call sites, the
clamp handling and the focus-ring shape, all of which chassis-A's round had to ask for). These six
remain:

1. **Task 7's page arithmetic** (`plan:334-336`): "three pages if the featured post is paginated, two
   if not; the implementer reads `(site)/+page.server.ts` to learn which". The plan can settle this:
   `(site)/+page.server.ts:15` paginates `entries.slice(1)`, and
   `(site)/archive/[page]/+page.server.ts:11` slices the same way, with the header comment "the same
   slice the home route paginates page one from, so this route's page count always agrees". 27 posts
   minus the featured lead is 26; at page size 13 that is **exactly two pages of thirteen**, and
   `/archive/3` correctly 404s via the clamp guard at `:27-29`. Write that into the Ruled inputs and
   the test asserts a known number instead of a discovered one.
2. **Task 3's sidebar conditional** (`plan:208`): "only if it renders `related`". It does:
   `src/theme/components/ArticleView.svelte:50` derives `related` and `:129-134` renders the
   `<nav class="related">`. Replace the conditional with the instruction.
3. **Task 5's `email.from`** (`plan:278-280`): "derived from `ORIGIN`'s host or given a one-line
   comment … the implementer reads `src/lib/email.ts`'s sender rules before choosing". This is a
   config-shape decision with a durable gotcha attached (the repo's own CLAUDE.md carries the
   Cloudflare sender-verification trap). Make the call in the Ruled inputs; the safe one is "stays its
   own literal, with a comment naming the verified-sender constraint", since deriving a sender from a
   URL host is exactly what `E_SENDER_NOT_VERIFIED` punishes.
4. **Task 4's utility location** (`plan:234-236`): "`composition.css` … or the `@utility` in
   `tokens.css` if that is where Tailwind's layer is activated; the implementer verifies". Fine to
   leave as a verified branch, but say which file wins on a tie and why, so two implementers on a fix
   round do not choose differently.
5. **Task 8's `site.css` literals** (`plan:373-375`): "tokenized where a token carries the value, or
   declared as a named `--site-*` custom property … with a one-line reason". Acceptable as a rule
   with a stated default; add "default to the named `--site-*` property; reach for an existing token
   only where its name means the same thing the rule means".
6. **Task 8's `--text-step-1`/`-2` pair** (`plan:90-92`): "keeps both declarations … or derives one
   from the other, the implementer's call". A coin flip inside a conformance task. Pick one: keeping
   both with a comment is the smaller diff and the honest record.

The converse defect (the plan deciding something that should be the implementer's) appears once and
mildly: `plan:332` fixes `ARCHIVE_PAGE_SIZE = 13` as a constant AND dictates the comment's content.
That is correct here, since the number is load-bearing for the whole pass.

## H12. The checkpoint interval is named and its content is not, REGRESSION

`plan:41` gives the interval ("every four tasks (checkpoints at 4, 8, 12)") and never says what a
checkpoint writes. The chassis-A round's H7 raised exactly this and gave the sentence; chassis-A did
not fold it (`chassis-a:38-40` has the same gap), and chassis-B inherits it. With a ceiling this tight
(H1), the checkpoint's spend line is the mechanism that catches the overrun before the 80-per-cent
stop, so this is not cosmetic here.

`plan:475` compounds it: Task 12 says STATUS gets "only the stale wording; the immediate-next-action
entry is the conductor's at pass end", which reads as if STATUS is written once, at the end. The
global rule writes STATUS at every checkpoint, at every split, and before every question.

**Rewrite:** `plan:41` gains "At each checkpoint, at any split, and before any question to Geoff, the
conductor writes STATUS: the task ledger, decisions taken, spend against the ceiling, and the next
task, then continues." Task 12's line becomes "the pass-end STATUS rewrite (the checkpoints already
wrote the ledger)".

## H13. The pass-end ritual is missing five named gates, the migration record, and the two closing
steps

`plan:494-509` is a good ritual and better than chassis-A's on the visual half (the verifier loop with
a fresh grader on each round is right). Against `~/.claude/skills/cairn-pass/SKILL.md` it drops:

- **The six CI-only gates are invoked by the phrase, not by name** (`plan:132`, `plan:506`: "the six
  CI-only gates BY NAME"). The skill's whole point is that the phrase fails and the list works
  (`SKILL.md:92-96`, `:139-141`, `:165-170`): `check:comments`, `check:reference:signatures`,
  `check:surface`, `check:snippets`, `check:transcripts`, `check:symbols`. `check:snippets` in
  particular short-circuits five later gates in `test.yml`. Write the six names into the ritual, the
  way the plan already writes `check:idioms` and `check:cm-internals`.
- **`check:package`, `check:reference`, `check:reference:signatures`, `check:docs` as the four doc
  gates** (`SKILL.md:145-155`). The per-task gate has `check:reference` and `check:docs`; the ritual
  should name all four once.
- **`docs/extend/migration-notes.md`** (`SKILL.md:126-131`). Task 12 writes `CHANGELOG.md` and states
  no `Consumers must:` line is needed, which is right, but the skill requires a per-version record
  entry for a behaviour change "not only a rename". Task 10's `createSectionAction` adoption changes
  the exemplar's auth and audit path, and Task 5 adds a `menus.footer` key to the site config schema.
  Both are behaviour a scaffolded-site owner meets.
- **The live admin smoke** (`SKILL.md:100-106`), required "for any plan touching the `/admin`
  surface". Task 9 baselines `/admin/signups` and Task 10 rewrites its actions and `load`. Either run
  it or say in the ritual why the e2e session helper substitutes here.
- **Steps 8 and 9: draft the next plan, and pre-bake the context clear** (`SKILL.md:262-306`), both
  unconditional. The plan's "What this pass hands forward" section is the raw material for the next
  plan but is not the step.

## H14. Two instructed comments would violate the repo's own comment rules

The plan carries zero em dashes and its comment instructions are mostly clean. Two are not:

- **`plan:105-106`** instructs a comment saying `ORIGIN` is "literal **by ledger ruling**". A shipped
  comment that cites a ruling document is exactly what internals-C's pass-scoped comment-citation
  purge removed from `src/lib` (`HISTORY.md:17-19`), and this one ships into every scaffolded site.
  Write the constraint, not its provenance: "The public origin as a literal: it is read at build time
  by the feed and sitemap, and `PUBLIC_ORIGIN` in `wrangler.jsonc` is the Worker's runtime value for
  the same host."
- **`plan:337-338`** instructs the `svelte.config.js` comment to say "**this corpus now produces**
  `/archive/2`". "Now" is process narration in a file the scaffold ships: it dates the comment to this
  pass and reads as a changelog. Write the state: "The starter corpus spans two archive pages, so
  `/archive/2` is a real prerendered route." The same applies to `plan:332-333`'s "sized so the
  starter corpus crosses one page boundary", which is fine as written because it states a property,
  not an event.

Everything else checks: `@component` blocks are required with purpose, contract and failure mode
(`plan:304`), TSDoc is named in Global constraints (`plan:123-124`), and `check:comments` is in the
per-task gate.

## H15. Two smaller hygiene items

- **`SiteFooter.svelte` appears twice in Task 5's Files list** (`plan:265` and `plan:275-277`), once
  for the wordmark and once for the nav array. A cold implementer reading the list top to bottom
  edits it, moves on, and meets it again eight lines later. Merge them.
- **Task 7 Step 3 makes the implementer push a branch and wait on CI** (`plan:355-357`: "push,
  `gh workflow run e2e.yml`, wait for the bot's commit, `git pull`"). No polling command is given, so
  the wait is unbounded inside a Sonnet dispatch, and it puts a push inside a task while the pass's
  merge discipline is the conductor's. Move the CI regen to the conductor, between Task 7 and Task 8,
  as a named checkpoint action; the plan already treats the pass-end regen that way (`plan:504`).

---

## Ranked top five

1. **H2 with H1.** Tasks 3, 5 and 7 each carry eight deliverables and Task 11 is unbounded; splitting
   all three in place makes a fifteen-task pass, which is the sizing rule's stop signal. The ceiling
   compounds it: 6M is below chassis-A's 7.5M for a pass with a heavier per-task gate, 140 images in
   a looping pass-end verifier, and an authored thirteen-post corpus. Split the pass at the Task 6/7
   boundary, or hold twelve tasks at a 9M ceiling with Tasks 3, 7, 9 and 11 pre-split at the
   checkpoints.
2. **H6 with H7.** Task 3 changes the 404 and the members card, and accepts on a baseline diff that
   does not exist until Task 9 adds those surfaces to the matrix, so the pass never captures a
   committed before state for two surfaces it redesigns. Task 9 in turn reads a finding that lives
   only in Task 1's report, which `pass-execute-chains.js` never hands a later implementer. Move Task
   9 to run right after Task 1, and make Task 1's preview-404 finding a comment block in
   `scripts/capture-surfaces.mjs`.
3. **H3 with H4.** Task 4 Step 2 asks a tools-limited Sonnet implementer to keyboard-tab through a
   browser it does not have, and Task 9 builds an alignment spec on "two devices named in" a doc
   section that says in bold that the measured corpus found zero rows to fix
   (`public-design-system.md:260-264`). Convert the first to a Playwright focus loop; cut the second
   to one doc sentence.
4. **H9.** The screenshot budget is stated in prose the reviewer can read but cannot act on: the
   capture directory's `<task>` token is undefined, `REVIEW_SCHEMA` has no field that records images
   read, and the reviewer prompt tells it the diff is the commits. Pin the literal path, specify the
   `notes` string the conductor passes per paint task, and make "the reviewer names each pair it
   read" an acceptance line.
5. **H13 with H12 and H14.** The ritual invokes the six CI-only gates by phrase instead of by name
   (the one habit the skill exists to break), and drops `migration-notes.md`, the admin smoke for a
   pass that rewrites `/admin/signups`, and the two closing steps; the checkpoint interval still
   never says what a checkpoint writes (REGRESSION of the chassis-A round's H7, unfolded twice); and
   two instructed comments ship a ledger citation and a "now" into every scaffolded site.

---

## Sizing verdict

**Split the pass, at the Task 6/7 boundary.** Twelve tasks is not itself the problem; the problem is
that three of them carry eight deliverables each, a fourth has no bound, and the honest fix for all
four is four more tasks, which the sizing rule names as the moment to split the pass rather than the
tasks. The cut falls cleanly because the pass already contains two different kinds of work with
different cost profiles and different risk: Tasks 1 through 6 are chassis ADOPTION (the shell, the
five primitives, the focus ring, the entry row), all paint-adjacent, all provable against the existing
three-surface matrix plus the two surfaces Task 9 should be adding first, and all cheap in images
because the verifier grades five surfaces; Tasks 7 through 12 are CORPUS AND CONFORMANCE (thirteen
authored posts, the page size and its baselines, identity, CSS conformance, the width matrix
extension, idioms, the waymark rebake, records), which is where the authored-output cost, the CI
regen round-trips and the seven-surface verifier live. Chassis-B ships the adoption at a 5M ceiling
with a five-surface verifier; chassis-B2 ships the corpus and conformance at 5M with the full matrix,
and it is the half that should carry the `/archive/2` proof, since that is the item whose baselines
move most. If Geoff would rather hold one pass, the minimum honest version is twelve tasks at **9M**,
with Task 9's `public-alignment.spec.ts` cut (H4), Task 3's styleguide composition section deferred
(it is the pass's one sanctioned non-site adoption, so deferring it costs nothing the goal statement
claims), Task 11 bounded to a named file list, and Tasks 5 and 7 split at dispatch with their split
points written into the header now rather than discovered at the checkpoint. What should NOT happen
is the current shape at the current ceiling: it blows 80 per cent around Task 8, at which point the
work still ahead is the corpus, the width matrix, the rebake and the records, and the combined
question Geoff gets asked will be the one this review is asking now.

---


Objects: `docs/superpowers/specs/2026-09-04-chassis-passes-design.md` "Chassis-B" (:208-247);
`docs/superpowers/plans/2026-09-07-chassis-b-pass.md` (518 lines).

The pass is honest about being visual work and reaches for the right machinery. The gap is
between the machinery it names and the machinery that exists: the capture format cannot be
read by the grader, the "nothing else moved" claim has no named instrument, the reviewer is
told by its own agent card not to read the file that carries the protocol, and the verifier
is pointed at a method whose verdict vocabulary inverts on a changed-by-design pass. Findings
are ranked within the lens.

---

## V1. The capture format the whole protocol rests on is unreadable by any grader

**Evidence.** Plan :144-151 (Task 1) specifies the tool writes `<surface>-<scheme>-<width>.png`
**full-page**. Plan :120-122 budgets the reviewer twelve of those and the pass-end verifier
"every public surface at all five widths in both schemes." Measured, from the committed
baselines that are the same renders:

```
site-home-light-320    320 x  4120   184K
styleguide-light-320   320 x 12516   576K   (39:1)
styleguide-light-2560 2560 x 10083   904K
site-article-light-2560 2560 x 9713   3.5M
```

A vision model resizes to a ~1568px long edge. `styleguide-light-320` arrives as roughly
**40 x 1568**: a vertical smear in which no type, no spacing, no border and no focus ring is
resolvable. `site-article-light-2560` is 3.5 MB and 9713px tall, at or past the per-image size
and dimension limits. The skill's own settled lesson is the opposite of this (`SKILL.md:115-119`:
"One grader opening the PNGs at 4x to 8x zoom resolved all ten definitively"; "NO row gets a
disposition without its crop being seen").

**Consequence.** Every verdict downstream, the reviewer's twelve images per task and the
pass-end verifier's whole set, is rendered from unreadable input. The gate returns PASS shaped
verdicts with no evidentiary content. This is the single largest integrity hole in the plan:
the pass would ship having "run the visual-fidelity method" while nobody ever saw the pixels.

**Rewrite** (Task 1, Files/Create, replacing "writes `<surface>-<scheme>-<width>.png` full-page"):

> writes, per surface/scheme/width, BOTH `full/<surface>-<scheme>-<width>.png` (fullPage, the
> archival record and the Playwright-comparable artifact) AND a readable tile set
> `tiles/<surface>-<scheme>-<width>-<nn>.png`, the full-page image sliced into bands of at most
> 1400 CSS px of height with a 60px overlap, numbered from the top. A grader reads TILES, never
> a full-page file: a 320-wide full-page capture of the styleguide is 320x12516, which any vision
> model resizes to about 40x1568 and which therefore carries no evidence. The tool also writes
> `manifest.json` (every file, its surface, scheme, width, tile index, pixel dimensions, and
> sha256) so a consumer can name exactly which tiles it read.

Add to Global constraints (plan :120): "Every image budget below counts TILES, and every dispatch
that hands a grader images names the tile paths, never a directory."

---

## V2. "Nothing else moved" has no instrument, and the instrument that exists is not named

**Evidence.** Plan :117-119: "the intended changes enumerated in the task report by surface and
width... A baseline that moves for a change the report does not enumerate is a stop-and-report."
Task 3 acceptance (:227-229): "the report's enumerated moves match the baseline diff exactly."
Task 3 Step 1 (:216-222) ends "any move outside that list is a stop-and-report." Nowhere does the
plan name the command that produces the moved-baseline list, and the `diff-reviewer` sees only
binary PNGs in `git diff` (agent card :16-17: `git status --short`, `git diff`).

An Opus reviewer reading a diff of binary PNGs plus a JSON report **cannot** verify "nothing else
moved." It can verify the file NAMES that changed. That is actually most of what is needed, and
the plan never says so.

**Consequence.** The pass's central per-task visual claim is unfalsifiable as specified, and the
reviewer is left to accept the implementer's prose. The countermeasure the whole skill exists to
supply (SKILL.md:76-78, "acceptance criteria containing 'looks like X' cannot be graded by the
context that built X") is defeated at the task gate.

**Rewrite** (new bullet in Global constraints, after plan :119):

> **The moved-baseline list is produced, not asserted.** Before any regeneration, the implementer
> runs the visual suite unmodified (`CI=1 npx playwright test e2e/site-visual.spec.ts
> e2e/admin-visual.spec.ts`) and pastes the exact list of FAILING snapshot names into the report
> under the fixed line `MOVED BASELINES:` , one name per line. Only then does it regenerate. The
> report's `INTENDED MOVES:` list and its `MOVED BASELINES:` list are compared name by name by the
> reviewer; a name in one and not the other is a blocking finding. For surfaces not yet in the
> baseline matrix (`error404`, `members-login`, `signups` before Task 9; `archive2` before Task 7)
> the instrument is instead an exact pixel compare of the captured before/after tiles:
> `magick compare -metric AE before.png after.png null:` (ImageMagick is on the workstation), whose
> per-tile count goes in the report as `TILE DIFF:`. A non-zero count on a tile the report does not
> enumerate is a stop-and-report.

No new dependency is needed: the repo has no `pixelmatch`/`pngjs` (`examples/showcase/package.json`
devDependencies carry neither, and Playwright's copy is vendored, not importable), but
`/home/linuxbrew/.linuxbrew/bin/compare` and `magick` are installed, and Playwright's own
`toHaveScreenshot` already is the pixel diff for every surface in the matrix.

---

## V3. Paint-neutrality claims rest on a gate the repo documents as blind to them

**Evidence.** Tasks 2, 4, 6 and 8 each accept on "every baseline unchanged" (plan :194-195,
:259-261, :321-322, :386-388). `playwright.config.ts:4-14` states the opposite in the repo's own
words: `maxDiffPixels: 120`, "a 1.5px shift on a 16px icon measured 51 differing pixels, which
passes at 120 and never rewrites the baseline... a green screenshot run is not evidence that a
small-footprint defect class is absent." `SKILL.md:123-125`: "An approved snapshot baseline
certifies STABILITY, never correctness."

Task 2 (the shell swap), Task 4 (the focus ring, whose entire footprint is a 2px outline, exactly
the sub-floor class) and Task 8 (clamp collapse, token moves) are precisely the changes the floor
cannot see. Task 4 goes further: "every baseline unchanged (focus states are not captured)" (:253)
concedes the ring is outside the screenshot gate entirely, and then Step 2 has **the implementer
tab through and confirm the ring draws** (:255-257), which is the builder grading its own work.

**Consequence.** Four tasks can regress paint and pass every stated criterion.

**Rewrite** (replace "every baseline unchanged" in the acceptance criteria of Tasks 2, 4, 6, 8):

> every baseline unchanged AND paint proven identical at the floor-free level: the task's
> before/after tiles for every touched surface compare at `magick compare -metric AE` = 0 for
> every tile, reported per tile. A non-zero count is enumerated and justified or it is a
> stop-and-report. ("Baseline unchanged" alone cannot carry this claim: `playwright.config.ts:4-14`
> documents a 120px floor a 2px ring change sits under.)

And for Task 4 Step 2, replace the implementer's own tab-through with:

> the focus ring is graded by the pass-end `visual-verifier`, not by the implementer: the capture
> tool gains a `--focus <selector>` mode that focuses the named control before shooting, and Task 4
> banks focused tiles for the three named controls on home, article and styleguide in both schemes
> at 390 and 1440. The implementer reports the paths and makes no fidelity claim.

---

## V4. The reviewer is told by its own agent card not to read the file that carries the protocol

**Evidence.** `~/.claude/agents/diff-reviewer.md:10-12`: "The dispatch gives you the task's
acceptance criteria, the repo's gate command, and the implementer's report. **You do not read the
plan file** and you do not implement or edit anything." The workflow's `reviewPrompt`
(`pass-execute-chains.js:91-103`) says the opposite ("Read the plan's 'Task N' section... plus the
'Global constraints' section"), and passes only: repo, planPath, task id/title, condensed criteria,
gate, and the implementer JSON. `t.notes` is passed to the implementer (:74) and **not** to the
reviewer.

The plan's entire visual protocol lives in Global constraints (:115-122) and in each task's Steps.
The condensed `criteria` string is the only channel the reviewer is guaranteed to honor.

**Consequence.** With a card that forbids the plan file and a prompt that requires it, the reviewer's
behavior is a coin flip. On the forbidding branch it reviews the diff against a one-line criteria
string and never opens a single image, and the per-task visual gate silently does not exist.

**Rewrite** (add to plan Execution, :41-45):

> **Dispatch shape for a paint task.** The workflow's `criteria` string is the only text the
> `diff-reviewer` is guaranteed to read (its agent card forbids the plan file; the workflow prompt
> asks for it; do not rely on the conflict resolving the right way). Every paint task's `criteria`
> therefore carries, inline and verbatim: the acceptance criteria; the capture root
> `~/.cache/cairn-chassis-b/<task>/`; the sentence "Read the tiles named in the report's `READ ME:`
> line (at most twelve) and verify the report's `INTENDED MOVES:` list equals its
> `MOVED BASELINES:` list name for name"; and the stop-and-report rule. The conductor writes these
> strings when it assembles the chain, from this plan's per-task text.

Also add to Global constraints a fixed report contract, since `IMPL_SCHEMA`
(`pass-execute-chains.js:16-28`) has no field for any of this and `unspecifiedDecisions` is the
wrong semantics:

> The implementer's `summary` field carries these lines verbatim, in this order:
> `CAPTURES: <before dir> <after dir>` / `INTENDED MOVES:` (one `surface width scheme: what moves`
> per line) / `MOVED BASELINES:` / `TILE DIFF:` / `READ ME:` (at most twelve tile paths, the changed
> surfaces at 320, 1440 and 2560 light plus 390 dark).

---

## V5. The pass-end verifier is pointed at a method whose verdicts invert on this pass, and the loop cannot exit

**Evidence.** Plan :97-103 dispatches `visual-verifier` with the before set as reference, the after
set, and "the consolidated list of intended changes... with the intended changes MATCHED and
everything else unchanged, COSMETIC versus STRUCTURAL," in a loop that "exits only on PASS."
The agent's actual method (`visual-verifier.md:16-34`) is: inventory the REFERENCE's devices, then
grade the render MATCHED / COSMETIC / **STRUCTURAL** ("state exactly what a viewer sees instead"),
and its mandate is "you owe it no charity... never soften a structural finding."

On this pass the reference is the before-state and roughly a dozen changes are intended and correct.
An unadapted verifier reports the new styleguide composition section, the `.cairn-band` ground on the
404, the members card border, the pagination block and thirteen new posts as STRUCTURAL differences
and returns FAIL. A "loop that exits only on PASS" then never exits, or exits because a fix agent
reverted intended work.

**Consequence.** Either an unbounded loop or the pass's own goal graded as a defect.

**Rewrite** (replace plan :97-103's verifier sentence):

> The fresh-context `visual-verifier` runs with an ADAPTED verdict vocabulary, stated in the
> dispatch because the agent's own card is written for reference-versus-render fidelity and its
> default reading of this pass's intended changes is STRUCTURAL-FAIL. The dispatch gives it three
> inputs, not two: the before tiles, the after tiles, and the committed intended-moves manifest
> (V6). Per surface and width it returns one of: **INTENDED-AND-CORRECT** (the manifest names this
> change and the after tile shows it, composed, at this width), **INTENDED-BUT-WRONG** (the manifest
> names it and the render is not what it describes), **UNINTENDED** (a visible difference the
> manifest does not name; the STRUCTURAL/COSMETIC split applies here), or **UNCHANGED**. The
> contrast probe of `visual-verifier.md:26-31` stays MANDATORY and is called out by name in the
> dispatch: this pass changes a card recipe, a full-bleed band ground and the focus ring, which is
> exactly the color-on-same-color class that probe exists to catch. The loop is bounded: verify,
> fix, FRESH verify; a second FAIL is the conductor's decision, not a third round.

---

## V6. The intended-moves list, the artifact the whole pass is graded against, is never written down

**Evidence.** The list lives only in twelve implementer JSON reports (plan :117-118, :218-222,
:342-345), which live only in the workflow's return value and the conductor's context. The pass-end
verifier is to receive "the consolidated list of intended changes from every task report" (:99-100).
The conductor is thin and compacts. `SKILL.md:17-35` requires the manifest to be **a committed file**
and requires verifiers to verify against the manifest, "never against the plan (the plan is a lossy
compression of the original; three builds under-matched because their reviews checked the
compression)."

**Consequence.** By Task 12 the consolidated list either does not exist or is a reconstruction from
memory, and the pass-end verifier gets the plan's prose instead: the exact failure the skill names.

**Rewrite** (new Global constraint, and a line in every paint task's final step):

> **The intended-moves manifest is a committed file**, `docs/internal/record/2026-09-04-chassis-inputs/
> chassis-b-intended-moves.md`, created by Task 1 with one section per surface and appended by every
> paint task in the same commit as its change: surface, width, scheme, what moves, why, and the
> baseline names it moves. The pass-end verifier reads this file, never the task reports. A task that
> moves a baseline without appending its row fails `check`-equivalent review at the diff gate.

---

## V7. The capture tool as specified will not render the admin surface, and captures the wrong theme in dark

**Evidence.** Task 1 (:145-151) specifies "a Playwright script against the preview server on 4173"
covering `/admin/signups` "with the e2e session helper," at five widths "in `light` and `dark`."
Step 1 says "build and preview the untouched tree" (:157-158).

Three defects, each provable from the repo:

1. A default build folds the dev backend OUT (`.github/workflows/e2e.yml:48-52`, and
   `playwright.config.ts:29-34` uses `VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port
   4173` with `env: { CAIRN_DEV_BACKEND: '1' }`). A plain `npm run build && npm run preview` renders
   no owner session, so `/admin/signups` writes `.missing` and nobody learns why.
2. There is no "e2e session helper." `e2e/custom-screen.spec.ts:9-10` navigates straight to
   `/admin/signups` with no auth step, because the dev handle mints the owner. The plan invents a
   mechanism to compensate for the flag it omitted.
3. The admin's scheme is selected by a COOKIE, not by `emulateMedia`
   (`e2e/admin-visual.spec.ts:3-7`: "The SSR theme is selected by the `cairn-admin-theme` COOKIE, not
   by emulateMedia"). A tool that only calls `emulateMedia` writes a light admin render into every
   `signups-dark-*.png`, and the verifier grades a mislabeled image.

Related: `examples/showcase/scripts/reference-capture.mjs` (531 lines) already does all of this
correctly, header included: "Drives the real showcase preview server (VITE_CAIRN_E2E=1 build,
CAIRN_DEV_BACKEND=1) with playwright-core, reusing the same selectors and dev-backend seed facts the
e2e specs use," with a `newPage` helper that sets the theme cookie AND `emulateMedia`
(`scripts/reference-capture.mjs:26-37`). The plan neither cites it nor says why a second tool is
written. (Its own header says it was to be "deleted after the pass"; it was not.)

**Rewrite** (Task 1, Create, and Step 1):

> `capture-surfaces.mjs` derives from `scripts/reference-capture.mjs`, which already solves the
> server recipe and the theme cookie; read it first and reuse its `newPage`/`shot` shape. The server
> is started with the EXACT `playwright.config.ts:29-34` recipe (`VITE_CAIRN_E2E=1 npm run build`,
> then `npm run preview -- --port 4173` with `CAIRN_DEV_BACKEND=1`), never a default build: a default
> build folds the dev backend out and every `/admin` surface would silently write `.missing`. There is
> no session helper and none is needed (`e2e/custom-screen.spec.ts:9`). For the `signups` surface the
> scheme is set by the `cairn-admin-theme` cookie (`cairn-admin` / `cairn-admin-dark`) AND
> `emulateMedia`; for the public surfaces `emulateMedia` alone. Task 11 or 12 deletes
> `reference-capture.mjs` if it is now dead, or the report says why it stays.

---

## V8. `.missing` is defined for the writer and undefined for every reader

**Evidence.** Task 1 (:150-151): "a surface that does not render is written as a one-line `.missing`
file, never a silent skip." Task 1 Step 1 expects two (`error404` under `vite preview`,
`/archive/2` at the current page size). Nothing tells the `diff-reviewer` or the `visual-verifier`
what to do with one. The pass-end verifier is told to grade "every public surface" against the before
set (:97-99), and for `archive2`, `error404` and `members-login` at least part of that before set is
by design absent.

**Consequence.** A verifier handed a missing reference either invents one, skips the surface silently
(the exact failure `.missing` was invented to prevent, one level up), or FAILs a surface that is
legitimately new.

**Rewrite** (Global constraints):

> A `.missing` marker in the BEFORE set means the surface is NEW in this pass. A new surface is not
> graded as a change: it is graded on its own against the five-viewport standard, "composed at the
> extremes, never merely unbroken," at 320 and 2560 in both schemes, by the fresh verifier, and its
> verdict line is `NEW: composed | NEW: unbroken-only | NEW: broken`. A `.missing` in the AFTER set
> is always a stop-and-report. Task 1's report lists the before-set markers by name, and Task 12
> confirms every one of them is gone from the final after set or says why.

---

## V9. Composition at the extremes has one judge in the plan, and it is the builder

**Evidence.** The standard (CLAUDE.md "Visual work"; `docs/internal/record/2026-07-18-docs-on-site-topo-brief.md:22`
and the 2026-07-05 family ruling) is "composed at the extremes, never merely unbroken." The plan
touches four surfaces that have never been composed at 320 or 2560: the styleguide's new composition
section, `/archive/2`, the 404, and `/members/login`. The only judgment named is Task 3 Step 2
(:223-225): "a 320 and a 2560 capture of the styleguide's composition section **read by the
implementer** and named in the report as proven at the extremes." Task 9's acceptance (:413-416) asks
only that the surfaces be "in the width matrix" and "baselined" (existence, not composition). Task 7's
(:460-463) asks that `/archive/2` "renders and is baselined."

`SKILL.md:76-78` forbids exactly this: "Acceptance criteria containing 'looks like X' cannot be graded
by the context that built X."

**Consequence.** Four new surfaces enter the family's flagship exemplar with a baseline that certifies
they are stable and nothing that certifies they are composed. Per V3's citation, a baseline written over
a bad composition makes that composition permanent and invisible.

**Rewrite** (Task 3 Step 2, and new criteria on Tasks 7 and 9):

> The implementer captures the extremes and names the tile paths; it makes NO composition claim.
> Composition at 320 and 2560 is judged by the pass-end `visual-verifier` alone, which returns a
> per-surface `COMPOSED | UNBROKEN-ONLY | BROKEN` line for every surface new to the matrix (the
> styleguide composition section, `/archive/2`, the 404, `/members/login`, `/admin/signups`).
> `UNBROKEN-ONLY` is a FAIL for a surface this pass adds. Add to Tasks 7 and 9's acceptance criteria:
> "the surface is captured at 320 and 2560 in both schemes and queued for the pass-end composition
> verdict; the task does not self-certify composition."

---

## V10. Geoff's five-viewport merge read has no artifact, and PNGs cannot be attached to a PR from the CLI

**Evidence.** Plan :29 ("Geoff's five-viewport before/after read is the merge gate"), :60-62 ("run to a
green PR with the before/after captures and the `visual-verifier` verdict banked"), :108-110 ("push and
PR with the before/after captures of the changed surfaces at the five widths attached for Geoff's read").
Spec :245-247 repeats it. No task builds that artifact: Task 12 (:472-487) writes records only. The
captures live in `~/.cache/cairn-chassis-b/`, which exists on one workstation and is in no commit.

`gh` cannot upload images to a PR body or comment; image attachment is a browser drag-and-drop. So
"attached for Geoff's read" is not executable as written, and the fallback (Geoff pulls the branch,
builds, and browses ten surfaces at five widths in two schemes) is the hour this gate is supposed to
cost minutes.

**Consequence.** The single human gate in the pass has no deliverable, and the pass ends with a
conductor discovering it cannot hand over what it promised.

**Rewrite** (new Task 12 step, before the records step):

> **Step 1 (the merge-read artifact).** Build one contact sheet per changed surface: for each of the
> five widths, the before tile and the after tile side by side with a width label and a one-line
> caption from the intended-moves manifest, light scheme, plus a dark-scheme sheet for any surface
> whose dark render moved. Composed with ImageMagick (`magick montage`, installed) into
> `docs/internal/record/2026-09-04-chassis-inputs/chassis-b-contact-sheets/<surface>.png`, committed
> (binary in-repo has precedent: the baselines themselves). The PR body links each sheet by its
> `raw.githubusercontent.com` URL under the branch, lists the surfaces that did not move, and carries
> the `visual-verifier` verdict inline. Acceptance: Geoff's read is one page per changed surface, in
> order, with no build step on his side.

---

## V11. `--update-snapshots` by file path rewrites every baseline in the file, not the moved ones

**Evidence.** Plan :63-66: "the implementer regenerates the moved baselines locally
(`CI=1 npx playwright test e2e/site-visual.spec.ts --update-snapshots` by FILE PATH...)"; Task 3 Step 2
and Task 7 Step 2 repeat "regenerated by file path." Task 3's acceptance (:227-228) then requires "the
report's enumerated moves match the baseline diff exactly."

`@playwright/test` is `^1.60.0`, resolved `playwright-core 1.62.1` (`examples/showcase/package-lock.json:19,
3036-3038`). Modern Playwright accepts `--update-snapshots=[all|changed|missing|none]`, and the bare flag's
default has moved between releases. If it resolves to `all`, that command rewrites **every one of the 30
site-visual baselines** with a workstation render. The plan's own rule is that baselines are CI-canonical
and "a workstation render never substitutes for the CI one" (:67-68); it then prescribes a command that may
do exactly that, and the acceptance criterion that would catch it ("matches the baseline diff exactly")
would fail for reasons the implementer would then be tempted to explain away.

**Consequence.** Either a silent 30-file workstation overwrite of CI-canonical baselines, or a task that
cannot meet its own acceptance criterion.

**Rewrite** (Ruled inputs, "Baselines are CI-canonical"):

> ...regenerates the moved baselines locally with the mode pinned explicitly,
> `CI=1 npx playwright test e2e/site-visual.spec.ts --update-snapshots=changed`, by FILE PATH. The mode
> is pinned because the bare flag's default has changed across Playwright releases and `all` would
> rewrite all thirty site-visual baselines with a workstation render, in direct violation of the
> CI-canonical rule two sentences above. Task 1 verifies the installed Playwright accepts the `=changed`
> form and reports the version; if it does not, the implementer regenerates by deleting only the named
> baseline files and re-running, and says so.

---

## V12. The "before" for a task and the "before" for the pass are conflated in one directory scheme

**Evidence.** Plan :115-117 requires per-task "before captures from the task's parent commit"; Task 1
Step 1 banks a separate pass-wide before at `~/.cache/cairn-chassis-b/pass/before/` (:157-160).

The distinction is right and the plan never states WHY, so an implementer will economize on the wrong one.
It matters: the reviewer's question is "did this task move only what it said," which needs the parent
commit; the verifier's question is "is the pass's whole delta intended," which needs pass start. Also, a
"before capture from the parent commit" as literally written means checking out the parent, building
(about two minutes), previewing, and capturing, per task. The identical and far cheaper artifact is the
capture taken at the START of the task, when the worktree is clean at that same parent.

Second-order: `~/.cache/cairn-chassis-b/` is durable on this workstation and reachable by every local
subagent, so the mechanism works, but it is one fixed path shared across every run of this pass. A
re-dispatch, a fix round, or a second attempt after a reset silently overwrites the before set that the
pass-end verdict depends on.

**Rewrite** (Global constraints):

> **Two before sets, on purpose.** The PASS before set (`~/.cache/cairn-chassis-b/pass/before/`) is
> captured once by Task 1 at the branch point and is the `visual-verifier`'s reference at pass end: its
> question is whether the pass's whole delta is intended. The TASK before set
> (`~/.cache/cairn-chassis-b/<task>/before/`) is captured at the START of the task, on the clean worktree
> at the task's parent commit (equivalent to and far cheaper than checking the parent out), and is the
> `diff-reviewer`'s reference: its question is whether THIS task moved only what it enumerated. A task
> whose upstream neighbors moved no paint may symlink the pass before set instead of re-capturing, and
> the report says it did. Both directories are write-once: the tool refuses to write into a non-empty
> directory and the implementer reports the collision rather than clearing it, since a silently
> overwritten before set is an unfalsifiable after set.

---

## V13. The one-check rule and the thin-conductor rule collide, unreconciled

**Evidence.** `SKILL.md:55-57`: "The main loop READS the final renders itself... Nothing deploys
unlooked-at." CLAUDE.md's "Conducting a pass": "during execution it never reads a source file, a diff, a
test log, or a gate transcript." The plan carries Geoff's read (:29) and the verifier loop (:97-103) but
never says the conductor looks at anything, and by the thin rule it will not.

**Consequence.** The one-check rule is quietly dropped, and the countermeasure that exists because two
production misses passed every mechanical gate is absent from a pass that changes paint on the family's
exemplar.

**Rewrite** (pass-end ritual, after the verifier loop):

> **The one-check read (the conductor's one sanctioned image read).** The thin-conductor rule excludes
> source files, diffs and gate transcripts; it does not excuse the one-check rule, which exists because
> two production misses passed every mechanical gate. After the verifier returns PASS and before the PR,
> the conductor reads a bounded set with its own eyes: each changed surface's after tiles at 320 and 2560,
> light, one screenful each, from the contact sheets of V10. That is the read, it is bounded, and it is
> named here so it is neither skipped nor allowed to grow into a diff read.

---

## V14. Two enumerations the reviewer will be handed are internally inconsistent

**Evidence.** Task 7 Step 2 (:150-155) enumerates "the home page's page 1 shows the fourteen 2026 posts
and the pagination block," while the same task sets `ARCHIVE_PAGE_SIZE = 13` (:133). Fourteen posts on a
page of thirteen is only possible if the featured post is excluded from pagination, which the plan itself
flags as unknown two lines later (":135-137, the implementer reads `(site)/+page.server.ts` to learn
which"). Under V2's rewrite, the enumerated list is the contract the reviewer compares against the moved
baselines, so an enumeration that cannot be true guarantees a mismatch and burns a fix round.

Similarly Task 9 Step 1 (:406-410) makes the 404 baseline conditional ("if not, the 404 baseline is
captured through the route that does render it... the implementer tries `wrangler dev`... and reports the
cost") while the acceptance criteria (:414-415) state flatly "the 404 included." The escape hatch and the
criterion contradict each other, and the reviewer grades against the criterion.

**Rewrite.** Task 7 Step 2: "enumerate the home page 1 delta AFTER reading `(site)/+page.server.ts`; the
plan does not pre-state the row count, because page size 13 and a featured post make it 13 or 14 depending
on whether the feature is paginated. The report states the rule it found, then the count." Task 9
acceptance: "the 404 is either baselined at five widths in both schemes, or the report names the server
recipe that cannot render it under the suite's webServer, records the cost of the `wrangler dev` second
server, and the 404 is carried to polish by name. The criterion is a decision with evidence, not an
outcome the implementer cannot control."

---

## Ranked top five

1. **V1** Full-page PNGs are the capture format; a 320-wide styleguide render is 320x12516 and reaches a
   grader as a ~40x1568 smear, so every image-based verdict in the pass is evidence-free. Emit readable
   tiles alongside the full-page archival file.
2. **V2** "Nothing else moved" names no instrument, and an Opus reviewer reading binary PNG diffs cannot
   supply one. Require the pre-regen failing-baseline list as the produced artifact, with `magick compare
   -metric AE` for surfaces not yet in the matrix. No new dependency; `pixelmatch` is absent from the repo,
   ImageMagick is installed.
3. **V5** The `visual-verifier`'s method grades difference-from-reference as STRUCTURAL, so on a
   changed-by-design pass it FAILs the pass's own goal and the "exit only on PASS" loop cannot terminate.
   The dispatch must redefine the verdicts (INTENDED-AND-CORRECT / INTENDED-BUT-WRONG / UNINTENDED /
   UNCHANGED), keep the contrast probe explicitly, and bound the loop at two rounds.
4. **V4** The `diff-reviewer`'s agent card forbids reading the plan file, which is where the entire visual
   protocol lives; the workflow passes the reviewer neither `notes` nor image paths. Put the protocol in the
   `criteria` string and fix the implementer's report contract, since `IMPL_SCHEMA` has no field for it.
5. **V7** The capture tool as specified uses a default build (dev backend folded out, so `/admin/signups`
   writes `.missing`), invokes a session helper that does not exist, and sets the admin scheme with
   `emulateMedia` when the admin reads a cookie, mislabeling every dark admin capture. All three are already
   solved in `examples/showcase/scripts/reference-capture.mjs`, which the plan does not cite.
