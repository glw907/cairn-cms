# cairn-cms history

The per-pass ledger for the cairn-cms engine, newest first. `docs/STATUS.md` holds only the
current state; a finished pass's detail moves here per the ledger rule (`~/.claude/CLAUDE.md`,
"Project ledgers"). Each entry condenses to what a later pass needs: what landed, what a gate
caught, and what would be wrong to rediscover. Read on demand, not at every session start.
Superseded `STATUS-archive-*.md` files under `docs/internal/history/` hold the pre-2026-08
detail this file only summarizes.

## Go tool pass A (`cairn-tool-A`), eleven tasks, 2026-09-14 to 2026-09-20

Branch `cairn-tool-a`, draft PR #60, UNMERGED at close by Geoff's ruling (the merge rides Pass
B1's close, because extend-2 was mid-flight on the same three ledger files). Plan and full
post-mortem: `docs/superpowers/plans/2026-09-14-cairn-tool-1-0-pass.md` on that branch. Decision
record for what follows: `docs/superpowers/plans/2026-09-20-cairn-tool-pass-b-recut-brief.md`.

**What landed.** The `tool/` Go module (`github.com/glw907/cairn-cms/tool`), foundation only:
`record`, `store`, `providers`, `spine`, `secrets`, `version`, and a `cmd/cairn` with `auth set`,
`auth list`, and a hidden `probe-token`. No command an operator would run yet. A three-platform
CI matrix from the first commit. `packages/create-cairn-site`'s test fakes now load bodies from
a JSON fixture corpus the Go tests also read. Geoff minted the tool's two read-only tokens.

**What the gate caught.** Every task from 4 to 8, and Task 10, took one fix round, five of the
six on a reviewer escalation the conductor ruled. Six were errors or contradictions in the plan
itself, not in the code: an unreachable directory-precedence branch, error 12000 misread as
"builds not connected", a fixture criterion nothing could satisfy, eighteen steps that were
nineteen, six Cloudflare permission groups where seven are needed, and a `term.IsTerminal` ban
written for a TUI launch gate that also banned color detection. At the close, seven
`go-architecture-reader` reads found a Windows hole (`store.Load` checked the record file for a
symlink but not the directory, and the first test for the fix could silently skip on the only
platform it guards) and a credential-resolution defect (`secrets.Env` and a private copy in
`cmd/cairn` disagreed on an empty variable). The fold's own single-table rewrite then put a
secret into a plain string field, which review caught before any caller existed.

**What a later pass would be wrong to rediscover.** A fine-grained GitHub token reads any PUBLIC
repository with no permissions at all; verify a mint against private `xcathletes-org`.
`accounts/{id}/tokens/verify` answers error 1000 for a user-owned token; use `user/tokens/verify`.
`os.Symlink` needs a privilege Windows CI runners lack; build a junction with
`FSCTL_SET_REPARSE_POINT`. `order := []string{}` in `record`'s `decodeObject` is load-bearing.
The key-set drift guard's parse side is hand-maintained mirror slices, a known residual the B1
rewrite closes. `vcs.revision` is absent from a `go install module@version` build.
`cairn-run-gate` has a light lane; this pass queued a one-minute Go gate behind other sessions'
browser gates for two to three hours before using it, which produced the workstation rule "a
rule lives where it executes".

**Budgets.** About 6.8M of 8M subagent tokens (the conductor's turns uncounted). About 15.5 clock
hours, five of them lost to a network drop that left the conductor unwoken. Six planning misses;
two execution sittings (the planned token mint, and one combined question of three decisions).
Two research audits on 2026-09-20 (CLI practice; bubbletea v2 readiness) reshaped Pass B: it
splits into B1 and B2, `context.Context` goes through `providers`, and severity ordering moves
into `spine`, all before the command tree is built.

## extend-2 pass, ten tasks, 2026-09-19 to 2026-09-20

Branch `extend-2` with `extend-2-skills` (chain B: tasks 5, 6, 7) merged into it; plan at
`docs/superpowers/plans/2026-09-14-extend-2-pass.md`; record at
`docs/internal/record/2026-09-14-extend-2-record.md`. The pass ships the guidance layer: a
developer using Claude Code on a cairn site now gets the engine's guidance from the package it
already has, installed or refreshed by one bin.

**What landed.** The `cairn-guidance` bin (`install`, `check`, `--strict`), with `.orig`
preserved on an edited destination, a `MANIFEST` naming what an install wrote, a `VERSION`
stamp, and `src/lib/guidance/` holding the relocated tree-hash install. The doctor's skill
install retired: `--fix` gone, the `skill.admin-screens-stale` condition removed. A packaged
`claude/` tree in the tarball: the `CLAUDE.md` fragment, the read-only `cairn-extension-reviewer`
agent (`tools: Read, Grep, Glob`, no `Bash`, no model pin), and `claude/snippets/`, each asserted
byte-identical to its in-repo source by an identity test. The bake writes the guidance into every
new site at scaffold time, and `create-site.yml` asserts the baked tree. `@glw907/cairn-cms/admin-sources.css`,
an engine-owned CSS file of `@source` lines, so a site's `src/admin.css` no longer names the
engine's `dist` layout. `check-skill-budget.mjs` now runs over every packaged skill, and
`check:docs` reaches `skills/**` and `claude/**`. The `cairn-extend` and `cairn-consult` skills.
Ten tasks (1a, 1b, 2, 3a, 3b, 3c, 4, 5, 6, 7) in two chains, all accepted; 1a and 3c each needed a
conductor ruling. Merged as PR #67.

**What the gate caught.** The blocking security read found `cairn-guidance install`'s containment
was lexical only: a symlinked `.claude` or `.claude/skills` directory redirected the install
outside the intended tree, and a dangling `X.orig` symlink took attacker-chosen bytes to an
arbitrary path. Fixed (`9aa7765a`): the working directory resolves through `realpath`, every path
component from `.claude` down is `lstat`-ed component by component, writes use `O_NOFOLLOW` and
`O_EXCL`, and a refused destination is refused by name rather than repaired; re-read, pass. The
prose read found the shipped guidance told a consumer's agent things untrue from a site checkout:
exemplar paths under `examples/` and `docs/internal/` that never ship in the tarball, a claim
that install wires the site's own gates, an instruction to edit a file the install overwrites, a
`cairn docs <query>` command that has not shipped, and relative doc links that break once
installed.

**What a later pass would be wrong to rediscover.** Shipped guidance names engine docs as
`node_modules/@glw907/cairn-cms/docs/...` paths from the site root, never relative links, since
the same file is read at two locations, the tarball and the installed `.claude/`. The template's
gitignore is derived from `examples/showcase/.gitignore` by the bake's rename, so a template-only
ignore line cannot be added without a bake change. `cairn-guidance check` decides staleness by
tree hash, never by `VERSION`, so a caret-resolved newer patch does not read as stale.
`check-surface.mjs` snapshots only exports carrying a `types` field, so the new CSS subpath
export is not surface drift. `gate-tier.mjs` computes `full` for any `package.json` touch, and a
local full e2e run is green when its only failures are the 20 site-visual baseline files from
`4de378ec`. `pass-execute-chains.js` hands the reviewer the plan's gate string for a pinned task,
so a pin reads as a gate MISMATCH that is a harness artifact, not a real one. Both transcript
re-captures this pass would have needed took the dated staleness-note fallback instead of a live
recapture. The fragment's `cairn docs` line returns once the Go tool ships that subcommand;
Blueprint stays the ruled paid recommendation.

**Budget score.** About 5.8M subagent tokens against a 6.5M ceiling, raised from 5.4M by Geoff
mid-run on 2026-09-20 (workflow run 1: 1.87M over four tasks; run 2: 2.18M over six; direct
dispatches and the close: about 1.75M; the conductor's own turns uncounted). The forecast of 500K
per task held, about 405K per task in the workflow runs; the overrun sat in the close, sized at
0.4M and costing about four times that, since the two pass-end reviewers each returned a fold's
worth of real findings. Planning misses 4: the 2026-09-19 amendment was never written as a task
section, so Task 3c was authored at dispatch; the plan predated `gate-tier.mjs` and carried a
fixed gate string the classifier superseded; the plan specified fragment content, relative links
and a `cairn docs` line, that was untrue from a consumer checkout; 3c's "no site names `dist`"
criterion read broader than the amendment's actual deliverable. Execution sittings 1: the ceiling
raise, Geoff's own initiative, not a question put to him. Merged as PR #67.

## extend-1 pass, nine tasks, 2026-09-16 to 2026-09-20

Branch `extend-1` with `extend-1-site` (chain B: tasks 7, 8a, 8b) merged into it; plan at
`docs/superpowers/plans/2026-09-14-extend-1-pass.md`; spec at
`docs/superpowers/specs/2026-09-12-extend-design.md` (revision 2); record at
`docs/internal/record/2026-09-14-extend-1-record.md`. The pass gives a consumer site cairn's own
gates over its own code and cairn's atoms to compose instead of reinventing. No new package, and no
change to `cairn-doctor`.

**What landed.** A public `/log` subpath exporting `createLogger`, `CAIRN_LOG_EVENTS`, and
`REDACTED_LOG_KEYS`, with the engine's own logger as one instance and three-level key-normalized
redaction. Two advisory `cairn-audit` static rules over source text, `log-event-grammar` and
`log-secret-field`, resolved over a new `static.sourceScope`, both promoting to error tier at
`0.98.0`. `Tooltip` in `/admin-toolkit`, replacing every native `title` on an admin action control
and reporting `cairn-btn-guarded` as retired through `stock-default-hazards`. Additive batch
actions on `AdminTable` (`selection` and `batchBar`), with no existing prop changed. The two
showcase exemplar routes rewritten onto one site-owned `createLogger`. The site admin stylesheet
seam on the showcase: a five-line Tailwind entry compiled to `.cairn/admin.css`, a
`cairn-audit.config.json` naming both sheets, and a `check:cairn` step in CI. The scaffold wiring
baked from it: a `.github/workflows/check.yml` in every new site, `workflows: write` on the App
manifest, and a watch compile in the dev shim. Five rows in `docs/internal/engine-rulings.md`
(`log-export`, `stylesheet-seam`, `tooltip-primitive`, `audit-rule-advisory-first-tier`,
`batch-actions-additive`).

**What the gate caught.** The seam's first four-line form defeated the engine's own `sm:` variants
on every admin screen and moved 58 of 90 admin-visual baselines, fixed by a fifth `@source` line
that makes the site sheet a superset of the engine's utility set in Tailwind's own emission order.
The source-text walk judged the engine's own test fixtures and doc comments as dead suppression
directives (41 false findings), fixed by `suppressionsOnly`. `log-event-grammar`'s collision arm
fires on 152 of the engine's own 154 legitimate call sites when the audit runs over the engine
itself, recorded as a precondition on the `0.98.0` promotion. The Tooltip's `allow-discrete` exit
fade tripped `motion-property` and exposed a comma-splitting defect in that rule. The pass-end
accessibility read found six real defects across `Tooltip` and `AdminTable`, and its re-read two
more; the security read found redaction one level deep and matching on exact spelling. Detail for
every one of these is in the record file.

**What a later pass would be wrong to rediscover.** The Tooltip's placement took three mechanisms
to land, and the shipped one is a native popover plus CSS anchor positioning with the trigger's
`anchor-name` appended rather than replaced, so a trigger that already anchors a menu keeps both
contracts. The stylesheet seam's superset requirement is a load-order fact about Tailwind's shared
`utilities` layer, not a cairn quirk; the two follow-ups it leaves (an engine-owned sources file, a
static gate for the superset invariant) are on the `stylesheet-seam` ledger row, and extend-2's
2026-09-19 amendment takes the sources file. Advisory tier and compiled-until-removed are
independent facts about `cairn-btn-guarded`: `0.98.0` promotes the finding, and a later release
removes the class.

**Budget score.** About 8.7M subagent tokens against a 9.0M ceiling, raised from 6.7M at the 84
percent checkpoint; roughly 1.0M of that was interruption waste (three network drops, one
usage-limit stop, one relayed-question misfire, one redundant re-dispatch by a workflow resume).
Planning misses 2: the seam proof assumed a `/posts` public route the showcase does not serve (it
serves `/` and `/archive/[page]`), and the proof utility first chosen had a real visual effect and
shipped into the scaffold template, where a no-effect utility (`scroll-mt-14`) was right. Execution
sittings 1: the combined checkpoint question (the ceiling, the docs-infra plan, the seam's
sources-file form). Review rounds: three on task 3, two each on tasks 2 and 7, two a11y reads and
two security reads at the fold. Merged as PR #66.

## Docs-to-facts pass, five tasks, 2026-09-15

Branch `docs-to-facts`; plan at `docs/superpowers/plans/2026-09-15-docs-to-facts-pass.md`;
review record at `docs/internal/record/2026-09-15-facts-container-review/`. This pass gates the
facts container instead of deleting the three narrative arms, the shape the three-lens
adversarial review overturned before execution.

**What landed.** Task 1 normalized every `docs/internal/facts/*.md` bullet to the colon-qualifier
tag grammar, retagged the page-only-sourced bullets `[candidate]`, resolved the 14
`[docs-drift]` bullets to 1 (the remainder is named in the container, a one-sentence fix would
not suffice), fixed the drifted line pointers, folded the non-fact sections under
`## Harvest record`, and deleted `gaps.md` into the friction log. Task 2 shipped
`scripts/checks/check-facts.mjs`, wired into CI (`.github/workflows/test.yml`) and the `docs` gate tier, walking every bullet outside a
`## Harvest record` section for a source, exactly one vocabulary tag, and a resolvable
`path:line` pointer (with quoted-anchor text re-read against the cited line). Task 3 rewrote
CLAUDE.md's docs section container-first (reference arm maintained and gated; the three
narrative arms and why-cairn frozen against rewrites, open to a same-pass discovered-deficiency
fix that is agent-facing, not register-graded; the cross-repo `site-docs/<site>-<pass>` batching
path; migration-notes and upgrade-cairn outside the freeze), amended both extend plans' docs
deliverables to file container bullets instead of editing frozen pages, and updated ROADMAP and
CHANGELOG. Task 4 (dotfiles) carried the same rule into `cairn-pass`, `engine-consult`,
`cairn-implementer`, and `site-implementer`. Task 5 shipped `scripts/checks/gate-tier.mjs`
(the `docs`/`scripts`/`engine`/`admin-visual`/`full` classifier the pass-execute runner calls),
its unit tests, and `docs/internal/pass-gate-tiers.md`.

**What the gate and reviews caught.** T1's retag script missed `.css` as a code path and
demoted 21 already-verified bullets to `[candidate]`, caught in the fix round. T3's implementer
compressed six CLAUDE.md sections outside its own scope to clear the workstation
claude-context-budget hook, dropping thirteen facts in the process; all thirteen restored in
the fix round (CLAUDE.md now sits at about 6377 tokens, over the 6000 budget, filed to ROADMAP's
Next tier rather than compressed again under this pass). T5 found the showcase's Playwright
config has no named projects, so the `admin-visual` gate string runs the spec file directly, not
a `--project` flag; the doc page and the gate string both record this. T2's first anchor check
compared a bullet's quoted snippet against a whole file, which never failed; a 10-line window
around the cited line replaced it and caught two real drifted container pointers (`EditPage.svelte:2076`, now `:2116`).

**What a later pass would be wrong to rediscover.** The container's shape holds even though the
review overturned the plan's original premise: the arms stay in the tree and the tarball
(seven check scripts and about 25 shipped `docsAnchor` values read them), `docs/reference/`
stays the maintained catalog, and the container is a gate, not a second source of truth. A
`git commit -a` from the conductor (`bb2e2dc3`) swept an implementer's in-progress edits under
an unrelated plan-amendment commit message, and three more index races followed before the pass
settled into strict stage-by-path discipline; the standing rule holds, one executor per
worktree or stage-by-path for every writer, and the conductor itself never runs `-a`.

**Evidence.** Close-ritual full gate green: 387 unit/integration test files (5243 tests), 81
component test files (1404 tests), `check:facts`, `check:docs`, `check:vale`, `check:reference`,
`check:reference:signatures` all exit 0. Spend about 2.1M subagent tokens against a 2.5M
ceiling (raised from 1.5M at the checkpoint); 0 planning misses, 1 execution sitting (the
ceiling raise) against the attended-time score.

**Two close-ritual findings.** The fold's full gate string omitted `check:arm-indexes`, so a new
`docs/internal/` page (`pass-gate-tiers.md`) reached CI unindexed and failed there; the ritual's
CI-only list should name it. And the conductor never armed the suspend inhibitor for a run that
went unattended for hours; the kernel reported the charger offline while plugged in, GNOME applied
the battery idle rule, and the machine slept twice (22:41 and 23:21) with a CI push stalled until
07:43 the next morning. Arm the inhibitor before the first long dispatch, every time. Merged as
PR #65.

## Admin motion language pass, nine tasks (chain A) plus one (chain B), 2026-09-15

Branch `admin-motion` (chain A) with `admin-motion-8` (chain B, task 8 alone) merged into it; plan
at `docs/superpowers/plans/2026-09-13-admin-motion-language-pass.md`; spec at
`docs/superpowers/specs/2026-09-13-admin-motion-language-design.md`. This pass writes the admin's
motion vocabulary (five durations, three curves, all Carbon aliases), migrates the admin's
seventeen shipped motion declarations onto it, ships three error-tier `cairn-audit` rules plus one
advisory rendered rule, and hands the result to the extend track as its first per-pattern recipe.

**What landed.** The token set on the two admin theme roots, with the two theme defaults
(`--default-transition-duration`, `--default-transition-timing-function`) pointed at them and two
shipped reduced-motion bugs fixed (`transition-delay`/`animation-delay` now zero under reduced
motion). `motion-property`, `motion-vocabulary`, and `motion-hover-gate` (static, error tier) and
`motion-reduced-delay` (rendered, advisory) join the audit, all three static rules `adminOnly` and
resolved over the new `static.adminScope` config key. The frame offset, zen mode's first instance,
gives a page-level mode change a neutral, borrowable motion case with one property allowance keyed
on `data-cairn-motion="frame-offset"` plus `margin-left`. The dropzone gains a drag-over paint
state it never had. Sixty new admin-visual baselines cover six surfaces at five widths in both
schemes, rendered for the first time. Eleven DaisyUI vendor disagreements are recorded rather than
fixed, and four named limitations join the design system's Motion section rather than being left
to inference. Chain A's nine planned tasks (1, 2, 3, 4, 6a, 6b, 7, 10, 11) were joined by four
conductor-inserted correction tasks (6a-fix, 7-fix, 10-fix, 11-fix).

**Five things a later pass would be wrong to rediscover.**

1. **The admin boundary is one mechanism, not two.** An `adminOnly` flag on the static rule type
   resolves over the audit config's `static.adminScope` roots inside `runStatic`, while
   `scopeReport` still filters a report by rule id alone and grew no path term of its own: a
   post-run filter can only subtract from a report `runStatic` already produced, and it can never
   restore a root the flag excluded upstream. A fold that left both standing side by side would
   have made the migration tasks' zero-findings criterion vacuous.
2. **`isReducedMotionGuarded` treated `(prefers-reduced-motion: no-preference)` as a guard.**
   A 3000ms transition authored inside an inverse media-feature gate read as reduced-motion-safe
   to `motion-band`, so it was exempt from the band check even though it never runs under reduced
   motion in the first place; the predicate now requires the guard to be the `reduce` feature, not
   its inverse.
3. **A reduced-motion restatement ties the blanket block on specificity, and source order
   decides.** The floor's selector, `[data-theme='cairn-admin'] *`, is `(0,1,0)`, the same
   specificity as a class-bearing restatement; both carry `!important`, so the tie is broken by
   which rule the built sheet places later. A consumer's own sheet loads after the engine's and
   wins by default; an engine-authored restatement would have to sit after `cairn-admin.css`'s own
   reduced-motion block in the same file. Measured in the built sheet, not asserted from the
   source order alone.
4. **`signature(el)` names a class of elements, not one element**, so the rendered differential
   `motion-reduced-delay` reports has no join key back to a single offending line: 483 rendered
   elements on `/admin/posts` collapse to 130 signatures, and a finding names the class and the
   page rather than a source position. This is why the rule reports at advisory tier rather than
   error.
5. **The emulation axis multiplies rendered contexts by two.** `EmulationAxis` is `'default' |
   'reduced-motion'`; registering one rule that declares the `reduced-motion` axis
   (`motion-reduced-delay`) doubles the browser contexts `runRendered` opens per page and theme
   combination, from one to two, since every other rule still runs under `'default'` alone and the
   reduced-motion pass runs beside it rather than replacing it.

**Two ritual findings from the close, for the next pass with a visual verifier.** The
`capture-surfaces` script waits only for `toBeVisible`, which passes at opacity 0, so both verify
capture sets shot every transient surface (zen, drawer overlay, delete dialog, command palette)
mid-transition; the verifier settled the resting-state read with a live probe after a 1500ms
settle, and a settle wait or `reducedMotion` emulation in the capture script would make the pairs
self-sufficient. The four reviewers' blocking findings, nine across them with one duplicate, went
to one fix dispatch, which cleared them in a single round; a list that wide is the accretion
signal, and the next ritual should split a second fix verdict rather than re-dispatch it whole.

**The live admin smoke is skipped, with the reason recorded here rather than omitted.** The pass
runs unattended, `docs/internal/admin-smoke-test.md` is an interactive walk-through, and the
motion it would exercise is proved instead by the two zen layout-count assertions, the sixty new
CI-canonical baselines, and the fresh-context `visual-verifier`. If Geoff's own before-and-after
read on the merged branch surfaces anything those three proofs missed, the smoke runs then.

## Polish-C (audit remediation slice 12, the breaking window), fifteen tasks complete on its worktree 2026-09-14

Branch `polish-c`, executed on `.claude/worktrees/polish-c` off post-11b-ii `main`; plan at
`docs/superpowers/plans/2026-09-08-polish-c-pass.md`; spec at
`docs/superpowers/specs/2026-09-08-polish-passes-design.md`. This is the initiative's one breaking
slice, and the last of the twelve.

**What landed.** Thirty renamed or removed public identifiers, every one of them in the window the
initiative's publish ruling promised would carry a single `Consumers must:` list. Four route
factories take one config bag with `runtime` a required member and no positional argument
(`createContentRoutes`, `createCairnAdmin`, `createNavRoutes`, `createMediaRoute`, the last two
gaining the new `NavRoutesConfig` and `MediaRouteConfig` types). Six parameter and load-data bags
rename onto the ruled `*Config` and `*Data` grammar (`AuthGuardConfig`, `RendererConfig`,
`FieldsetConfig`, `DevBackendConfig`, `NavData`, `VocabularyData`). Ten functions move onto a verb
(`formatManifest`, `buildExcerpt`, `buildNewlyPublished`, `buildCookieName`, `createGithubApp`,
`createAdminAction`, `mintPreview`, `revokePreview`, `loadPreview`, `loadHealth`), and
`parseManifest`'s canonical home moves to `.` beside its codec partner with a recorded re-export
keeping the old specifier resolving. Four discriminated results move onto the `outcome` idiom with
kebab-case values (`RequestOutcome`, `ChannelRequestOutcome`, `ChannelConfirmOutcome`,
`RevertOutcome`), the no-roster-leak encoding and the challenge-required-is-a-retry ruling both
intact. `EditorRow` becomes `UnresolvedEditor`, derived as `Omit<Editor, 'capability'>` so a member
added to `Editor` cannot silently miss the store type. Eight log events move onto the `refused`
verb or their true area, and the events header gains a two-verb table (`refused` for a decision the
engine made on policy, `failed` for a fault it did not choose) plus a clause admitting a dotted
subject. `OfficeList` retires, leaving `AdminTable` the toolkit's one scroll owner, and the extend
track's custom-screen example and its live reproduction compose `PageHeader` beside `AdminTable`
inside the design system's floating-card recipe instead. The ledger carries a polish-C `Note` on
every row this window renames, `f1-return-position-leak-sanction` closes against the landed
`check-surface-leaks` rider, and `docs/extend/migration-notes.md`'s `## Unreleased` section is
reconciled against the whole window with a closing subsection naming the four consumer sites,
their touched files, and the upgrade order.

**What the gate caught.** Task 4's config-bag rename (`054f9fc2`) introduced four `config.*`
property paths into `docs/reference/core.md` and `sveltekit.md` that `check-symbols`' extractor
reads as log-event names, turning `src/tests/unit/check-symbols.test.ts` red; Tasks 4, 5, and 6
each reported a green gate anyway, and Task 7 repaired it with four allowlist entries in
`scripts/checks/check-symbols-allowlist.mjs` (`ae51af02`). The plan's own gate string carries both
`npm test` and `npm run check:symbols`, so the string was not the gap; the three reports were.
Task 7's rename sweep also reached a RELEASED section, rewriting `previewLoad` inside
`migration-notes.md`'s `0.96.0` entry, which describes what shipped at that version; the review
caught it, `a3301094` restored both sentences, and the conductor amended the plan's residual
taxonomy so a form-action key or component prop sharing a renamed export's name is classified as a
distinct, immune surface rather than a blocking finding. Three smaller repairs rode their own
commits: three "an `createAdminAction`" article disagreements left by Task 6 (`dca8b344`), two
backticked retired event names in a migration-notes bullet that `check:symbols` resolved against
the live union (`d64f226b`), and two missing or two-step migration-notes bullets Task 14's first
pass left (`6aae02e8`).

The records were first closed at Task 15 (`8bd41850`), and the pass-end ritual's remaining steps
caught two more defects on top of it. **`b7694ba0`** is the `code-simplifier` pass over the
window's own config-bag reshape: `createNavRoutes`' bag argument and its two inner functions'
`const config = runtime.navMenu` both named `config`, so the inner binding renames to `navMenu`;
`createContentRoutesContext` took `runtime` as its own parameter while `ContentRoutesConfig` had
already gained a `runtime` member, so its one caller passed the same value twice; and
`createAuthGuard` aliased three bag members one line at a time instead of destructuring them
together. All three are behavior-identical. **`0422b1ff`** is a fix round over the `OfficeList`
replacement recipe itself: the floating-card composition dropped `overflow-hidden`, so
`AdminTable`'s square table painted over `card-shell`'s rounded corners in every documented call
site (`CustomScreen.svelte`, the extend guide, the admin-screens skill, the design system, the
reference page, and both migration fences), because `OfficeList.svelte`'s own retired
`overflow-x-auto` had computed both axes to `auto` and clipped as a side effect the replacement
recipe never named; the two `Consumers must:` fences in `CHANGELOG.md` and `migration-notes.md`
also omitted `AdminTable`'s required `rowCount` and `header` props, so the primary instruction for
`aksailingclub-org`'s eighteen-screen migration did not compile. The same commit discloses the
one silent break the window carries: a held `ChannelRequestResult` or `ChannelConfirmResult` read
via `if ('error' in result)` still compiles against the new outcome-only shape and now always
reads `false`, so every refused magic-link request or confirm silently reads as sent or confirmed;
both fences gained the grep-and-rewrite guidance, citing the showcase's own login route (rewritten
by this pass) as the pattern's origin. `officelist-retired-for-one-scroll-owner`
(`docs/internal/engine-rulings.md`) is corrected to state why `overflow-hidden` is needed and to
claim only what `check:snippets` proves, the fence's import line typechecks, not its markup.

**What a later pass would be wrong to rediscover.**
- `OfficeList` was retired on the double-scroll-container argument **against a CLOSED reshape
  row**, as a new proposal rather than a reopen: `audit-admin-officelist` was already executed by
  the 4b conformance pass with `Reopens on: closed`, so the retire is argued fresh in
  `officelist-retired-for-one-scroll-owner` (`docs/internal/engine-rulings.md`), which supersedes
  it. That row quotes the component's own both-stay sentence, "`PageHeader` and this component
  cover different shapes, a header primitive versus a full list-screen scaffold, and both stay:
  never a duplicate," and overrules it in its own text. A later reader who finds that sentence in
  the git history should read the new row before concluding the removal was an oversight.
- **`npm run check:surface -- --update` does not regenerate the surface.** `package.json`'s
  `check:surface` chains three commands and ends with `check-surface-leaks.mjs`, so npm appends the
  flag to the END of the chain, where that script receives it and `check-surface.mjs`, the only
  reader of the flag, never does. The working form is `npm run package && node scripts/checks/check-surface.mjs --update`.
  The script's own banner (`scripts/checks/check-surface.mjs:22`) and `docs/internal/README.md:31`
  still print the pre-rider single-command form; filed to `ROADMAP.md`'s Later tier rather than
  fixed here, since a non-breaking fix does not join a breaking window.
- **`check-symbols` resolves a backticked dotted-lowercase token against the LIVE log-event union**,
  so a doc that names a retired event, or that quotes a config member as `config.something`, goes
  red even when the prose is correct. Two shapes cost this pass a round each: unbacktick a retired
  event name in prose, and allowlist a real `config.*` property path with its reason.
- **A doc sentence describing a RELEASED version is immune to a rename sweep.** The
  `migration-notes.md` sections below `## Unreleased`, and a `CHANGELOG.md` entry's prose, record
  what was true at that version; only a link anchor a gate resolves is repaired. This is now
  written into the plan's residual taxonomy, and it is the one class a whole-tree grep-and-replace
  will always get wrong.
- The window is graded whole at the cut, not by its last pass. Polish-C's own eleven entries add
  no new subsystem and would size as a patch alone; the minor comes from the held passes'
  `MediaPicker`, `ToolbarDisclosure`, and the identity seam. The derivation, with the free number
  and the skill's own rule quoted, is at
  `docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md`.
- **A renamed discriminated result's old narrowing idiom fails silently, not loudly.** The four
  outcome renames drop the old `{ ok: true } | { error: ... }` split for one `outcome` field, and
  `result.ok` or `result.error` fails the build wherever TypeScript sees the literal type. But `if
  ('error' in result)` is a plain `in` check against an object shape, still compiles clean, and now
  always evaluates `false` because no member is named `error` anymore, so a held
  `ChannelRequestResult` or `ChannelConfirmResult` reads every refusal as a success. `check:symbols`
  and the type checker both stay green; only a grep for the literal `'error' in` pattern finds it.
  A consumer migrating this window greps for it before trusting the type checker's silence.
- **A `svelte` fence with a real `<AdminTable>` call typechecks on its import line alone.**
  `check:snippets` proves a documented fence's imports resolve against the built package; it does
  not run the markup, so a fence missing a required prop (`rowCount`, `header`) or a required
  wrapper class (`overflow-hidden`) can sit green in the gate while it fails to compile or paints
  wrong in a real consumer. `officelist-retired-for-one-scroll-owner`'s own `Verified` line now
  says exactly this, so a later reader does not read `check:snippets` green as more than it proves.

**Records.** `docs/HISTORY.md` gains this entry. `ROADMAP.md`'s any-site audit remediation entry
is closed and removed from the live tier, the initiative having shipped all twelve slices; the one
routed item no pass shipped, the `create-cairn-site` money narrative, was already filed as its own
`Now`-tier entry and stays there. Every live tier line that named a symbol this window renamed now
names the new one, one live bullet about `OfficeList`'s own heading level is deleted as no longer
true (the component it filed against is gone), one historical mention of the falsified
`csrf_rejected` log row is left verbatim because renaming it would falsify the record, and the
`check:surface` two-command chain is filed to the Later tier. Both live sections of
`docs/internal/docs-friction-log.md` still read "None open." and no polish-C task filed a finding
there. The release readiness the conductor's cut consumes is
`docs/internal/record/2026-09-08-polish-inputs/release-notes-draft.md`: the verified free number
(`0.97.0`), the derived size (minor, agreeing with `CHANGELOG.md:3`'s existing marker), all 81
`Consumers must:` lines in the window, and one paragraph per HISTORY entry in it. No version bump,
no tag, and no publish happened inside this pass; the cut is the conductor's separate step through
the `cairn-release` skill after the merge.

## Polish-11b-ii (audit remediation slice 11b-ii, the dev-backend access seam and the signups exemplar, non-breaking), six tasks complete on its worktree 2026-09-13

Branch `polish-11b-ii`, executed on `.claude/worktrees/polish-11b-ii` off post-11b-i `main`; plan
at `docs/superpowers/plans/2026-09-08-polish-11b-ii-pass.md`.

**What landed.** `devBackendHandle` (`@glw907/cairn-cms-dev`) accepts `access` and `roles`, so a
site's dev backend authorizes a `createSectionAction` form action the same way `createAuthGuard`
does in production, off the one access declaration the site already hands the guard. The showcase's
Signups admin screen, and the Waymark template that mirrors it byte-for-byte, drop their hand-rolled
`requireOwner`/`formData`/`fail` shape for `createSectionAction`, gain a visible stacked label on
each form field in place of an `sr-only` pair, an always-mounted `role="status"` outcome region that
progressively enhances via `use:enhance` instead of round-tripping a full-page POST, and a shared
safe-delete `<dialog role="alertdialog">` (no light dismiss) naming the row it will remove,
replacing a bare click-to-post Delete trigger. The route's own `load` moves from `requireOwner` to
`requireAccess`, so it shares the one fail-closed predicate the section actions already check.
`formatTimestamp` (`/admin-toolkit`) widens its accepted domain to two more ISO 8601 zone spellings,
a no-seconds variant and a colonless `+hhmm` offset alongside the ISO forms and lowercase `z` it
already took.

**What the gate caught.** The access-map handoff's own doc comment on `src/access.ts` named
`devBackendHandle` while describing the two hook branches; that module ships in the DEFAULT
(non-dev) build, so Rollup carried the comment into the deployed Worker bundle and the dev-fold
tripwire, which greps the deploy artifact for literal dev-backend names, caught the mention. No code
leaked, only a comment; the fix describes the dev branch without naming its package or its handle.
The pass-end `web-auth-security-reviewer` read of the seam and the adoption together caught the
load's stale `requireOwner`: with the section actions already resolving `requireAccess` on the same
route, a load left on the coarser owner-only gate could render page content a POST would have
refused, so the load moved to `requireAccess` to match. The pass-end `visual-verifier`, reading
Task 3's baselines against its own before set, caught two regressions the label change introduced
that Task 3's own render proof did not: wrapping each input in a visible `<label>` broke the
input's `clamp(3rem, 20rem, 100%)` width (the `100%` term could no longer resolve against the
label's own auto-sized containing block, collapsing each field from 320px to 185px at 768px and
above), and the taller labelled inputs grew past the Add button, which stayed pinned to
`flex-start`. Both are fixed in the shipped markup (the sizing constraint moved to the label as a
flex item, the form gained `items-end`), verified across three further capture rounds before the
verifier's read closed clean.

**What a later pass would be wrong to rediscover.**
- `DeleteDialog` cannot serve a developer's own table row as it stands: its props are shaped for
  cairn's own content entries, its action is a hardcoded `?/delete`, its dialog carries a fixed
  label id, and its `trigger` prop lets a caller swap the trigger markup without touching any of
  that. The signups screen's own safe-delete dialog is hand-built rather than reusing it.
- The dev handle deliberately leaves `locals.cairnAccess` undefined when no `access` is supplied,
  rather than defaulting to `{}` the way `guard.ts` does. `section-action.ts` treats an undefined
  map as a distinct, reachable "misconfigured wiring" signal from an empty map's "no rule matched"
  refusal; defaulting to `{}` under the dev backend would have collapsed that distinction and made
  the signal unreachable in local development. This diverges from the guard on purpose.
- The showcase carries no DOM test harness (no jsdom/Testing-Library setup for its own routes), so
  assertions against the signups route's rendered markup, labels, and dialog behavior belong in
  `examples/showcase/e2e/`, not a component test.
- `formatTimestamp`'s two new non-standard forms (the colonless offset, the lowercase `z`) are
  normalized to their canonical spelling before `new Date()` ever sees them, rather than reached by
  widening the parser's own regex to admit them directly. `new Date(input)` is deterministic across
  a Worker's SSR and a browser's hydration only for strings that already match the ECMAScript Date
  Time String Format; feeding it a non-standard spelling falls back to implementation-defined
  `Date.parse` behavior, which SSR and hydration are not guaranteed to agree on.
- A Tailwind utility class written only inside a showcase route compiles into no stylesheet the
  page loads: the showcase's own admin routes ride the engine's precompiled `cairn-admin.css`,
  which scans only `src/lib/components` and `src/lib/admin-toolkit`, so a route-local width fix
  needs a plain scoped style rule instead. This is what the input-width regression's own fix used,
  and it is a standing constraint on any route-level CSS in the showcase's admin surface, not
  particular to this fix.

**Records.** `docs/HISTORY.md` gains this entry; `ROADMAP.md`'s polish sub-bullet closes the
`formatTimestamp` widening and the `createSectionAction` adoption by name and leaves the
`OfficeList`/`AdminTable` item open for polish-C; the friction log carried no open finding to
triage. The entries 11a, 11b-i, and this pass wrote impose no consumer obligation, each now
reading "No consumer action." where it once read "Consumers must: nothing." The `##
Unreleased` block itself runs back to the `0.96.0` release, not only these three passes, and
still carries the earlier audit-remediation passes' breaking `Consumers must:` lines; the
release body cutting this window must gather those, not assume the block is clean.

## Polish-11b-i (audit remediation slice 11b-i, the design system and the engine admin surface, non-breaking), eleven tasks complete on its worktree 2026-09-13

Branch `polish-11b-i`, executed on `.claude/worktrees/polish-11b-i` off post-11a `main`; plan at
`docs/superpowers/plans/2026-09-08-polish-11b-i-pass.md`.

**What landed.** The design system gains a ruled busy idiom (native `disabled` plus an
always-mounted status region for a control mid-wait, `aria-disabled` plus `cairn-btn-guarded` for
a refusal, the upload recipe's own replace-the-control case kept as its own exception) and its
eight stale `AdminLayout` references corrected to `CairnAdminShell`, the component's real name.
`CairnAdminShell`'s two keyboard blockers are cleared: the editor card's chords call
`stopPropagation()` alongside `preventDefault()` so bold/italic/web-link no longer double-fire the
drawer or stack the palette, and the drawer's Open menu opener is a real `<button>` in place of a
bare `<label for>`. The command palette is now a real ARIA combobox (`role="combobox"`, always-
rendered `listbox`, arrow-key active-option movement, two always-mounted live regions), following
`MediaPicker`'s own shape. The pressed-segment cue (`segmentTintClass`) raises its active ring from
a 20 percent to a 55 percent `base-content` mix, clearing the WCAG 1.4.11 non-text floor; the
fixed bottom bar gains `scroll-margin-bottom`; `MediaHeroField`'s dropzone drops its own
focus-visible ring utilities in favor of the sheet's own outline. Five `role="status"` regions
mount unconditionally, and `ShareLinkPanel` converges onto the busy idiom's wait shape. The edit
page's desk band moves onto the admin toolkit's `StatusChip` vocabulary, and its Save/Publish pair
now renders unconditionally at every width with `inert` (not DOM presence) deciding reachability,
closing the first-paint composition swap. The login page drops its bracketed
`text-[var(--color-success)]` and inline style for named utilities, and its redundant
`aria-label="Email"` is removed. The small conformance sweep closes its second half: every bare
decorative Lucide glyph carries `aria-hidden="true"` directly, `ConceptList`'s four column headers
carry `scope="col"`, and `CairnAdminShell` no longer injects a `<style>` tag into the host head to
zero the body margin (the packaged sheet resets it itself).

**What the gate caught.** Task 5's own render proof was overstated on first draft: the
density-toggle crops it named came from an unmoved baseline (the old 20 percent ring), not the
raised one, so the record was corrected to name the footer-segmented crop as the one that actually
carries the raised-ring verdict, and `MediaHeroField.svelte`'s own render list was corrected to
drop it from the outline-only rendered-focus rule's false-positive count (three call sites clear a
Tailwind ring, not four, since one of the four the rule's comment named turned out not to). A
hoisted `role="status"` wrapper in `MediaReplaceDialog`'s replace step, made unconditional by the
live-region task, was adding a 12px flex gap in the idle and failed states; `display: contents`
on the wrapper closed it before the gate's visual suite could catch it as a moved baseline. Task 2
ran partway before a battery-floor stand-down (recorded, not gated) and resumed cleanly on AC. The
pass-end reviewer fan-out caught two nested-interactive blockers in Task 4's new combobox after
this entry's first draft: the active option's `role="option"` sat on the wrapping `<li>` while a
real focusable `<a>`/`<button>` nested inside it (invalid ARIA, since a listbox option is
children-presentational, and axe's own nested-interactive rule flags it), and ArrowDown/ArrowUp
moved `aria-activedescendant` with no visible highlight, so a sighted keyboard user could not see
which command Enter would run. Both are fixed: `role="option"` now lives on the row's own
`<a>`/`<button>`, `tabindex="-1"` keeps it out of the tab order, and the active row carries
`MediaPicker`'s own highlight tint plus a `scrollIntoView` so it follows the arrow keys past the
listbox's fold; the no-match row and `MediaPicker`'s own no-match row (the same listbox shape) both
gained the `role="presentation"` the fix's grep found missing; `aria-expanded` now reports the
popup's real display state instead of the result count. Covered by new component assertions in
`CairnAdminShell.test.ts` rather than a fresh visual capture, since the defect was structural
(DOM role placement, tab order) and the one visible change, the highlight tint, is exercised by an
assertion on the option's own class list.

**What a later pass would be wrong to rediscover.**
- `check:custom-surface`'s admin `retiredTokenPattern` reaches only `--color-muted` and
  `--color-subtle`. Widening it to every `--color-*` fill tone reached through a bracket utility or
  an inline style flagged **27 lines (41 occurrences) across nine files**, measured at this pass's
  parent commit before Task 9 converted `LoginPage`'s own bracketed success token; at this pass's
  head the population is **25 lines (38 occurrences) across eight files**: `CairnTidySettings` 1,
  `ComponentInsertDialog` 2, `EditPage` 2, `MediaBulkDeleteDialog` 2, `MediaHeroField` 8,
  `MediaOrphanTools` 5, `RepeatableField` 2, `TidyReview` 3 (filed to `ROADMAP.md`'s Later tier,
  below).
- `segmentTintClass` has **six callers across four files**, not the three the original sweep
  named: `CairnTidySettings.svelte:329,334`, `TidyReview.svelte:277`, `CairnMediaLibrary.svelte:609`,
  and `EditPage.svelte:477,482`. The edit page is a caller the pressed-cue paint had to reach even
  though the sweep never named it.
- The edit page's desk band composition at SSR is now resolved by **`inert`, not by DOM presence**:
  both the Save/Publish pairs for narrow and wide render unconditionally at every width. The HTML
  `hidden` attribute states the intent but does not itself compute to `display: none` there,
  because the admin sheet compiles with no Preflight
  (`scripts/build/admin-css.input.css` imports only `tailwindcss/theme.css` and
  `tailwindcss/utilities.css`), so the shipped `dist/components/cairn-admin.css` carries no
  `[hidden]` rule at all and `hidden` is declarative only inside the admin theme; the responsive
  `max-sm:hidden` / `sm:hidden` pair is what actually hides the unreachable branch, while `inert`
  is what removes it from the accessibility tree and tab order regardless of which branch CSS
  happens to show. A context that does load Preflight (the showcase's public chassis) would have
  Tailwind's own `[hidden]:where(:not([hidden='until-found'])) { display: none !important; }`
  beat a `flex` utility outright, so this reasoning does not carry over there. A later change
  that toggles a pair's presence with an `{#if}` instead of `inert` reintroduces the first-paint
  swap this task closed.
- The admin sheet's own `:focus-visible` rule (`cairn-admin.css`, `:where([data-theme='cairn-admin'],
  [data-theme='cairn-admin-dark']) :focus-visible`) is an **outline**
  (`outline: 2px solid var(--color-primary); outline-offset: 2px`), not a ring. An
  `outline-hidden` utility on an admin control silently removes the admin's whole focus
  indicator rather than merely clearing a decorative outline underneath a ring, which is why
  `MediaHeroField`'s dropzone needed its own ring utilities removed rather than layered.
- Task 1 inserted the busy-idiom section and the `AdminLayout` corrections into
  `docs/internal/admin-design-system.md`, moving every anchor below its insertion point by **20
  net lines** (1,299 to 1,319). Every later task in this pass located its own anchors by section
  heading and quoted phrase rather than by line number for exactly this reason, and any future
  citation of a line number in that file predating this pass's merge is stale.

## Polish-11a (audit remediation slice 11a, the engine and CLI half, non-breaking), thirteen tasks complete on its worktree 2026-09-12

Branch `polish-11a`, thirteen tasks executed on `.claude/worktrees/polish-11a` off post-chassis-B2
`main`; plan at `docs/superpowers/plans/2026-09-08-polish-11a-pass.md`.

**What landed.** Both retired route monoliths named on the audit's own monolith list split into
named cluster modules with the public surface byte-identical: `content-routes-entry.ts` (1,630
lines) into a read, write, destructive, and revert cluster plus the cross-cluster helpers in
`content-routes-shared.ts`; `content-routes-media.ts` (1,447 lines) into a shared module, a
library-read cluster, an ingest cluster, a delete cluster, and a metadata cluster. Three
`Refusal`/`Skip`-suffix retirements rode the split (`DeleteRefusal` to `DeleteFailure`,
`MediaDeleteRefusal` to `MediaDeleteFailure`, `BulkDeleteSkip` to `BulkDeleteSkippedAsset`),
closing the file's last holdouts against `convention-failure-suffix`. Product copy dropped a
misleading "Reload" instruction from four conflict-refusal messages and renamed
`VocabularyAdmin`'s counted things from "posts" to "entries"; `create-cairn-site`'s cost copy
stopped offering Workers Paid as a later or optional step, matching the standing "from first
deploy" ruling. The engine's own `src/lib/components/*.svelte` files joined the showcase's under
the `check:comments` TSDoc gate (eleven `tsdoc/syntax` errors fixed, zero `informative-docs`
warnings). Four `jsdoc/informative-docs` residuals closed. The state-reset coverage regex now
matches a declared state name whose type annotation carries its own generic comma inside balanced
angle brackets.

**What the gate caught.** Re-recording the two `cairn-doctor` transcript fixtures against the
current engine (Task 9) was reverted after landing: the capture scratch site has drifted off the
engine's re-architected render-authoring API (`glyph`, `iconSpan`, `cardShell`, `headRow`,
`strAttr`, `ContentRoutesOptions`), so the doctor's adapter read throws with or without a
Cloudflare token and the bare/credentialed contrast the task needed cannot be captured; that
task is deferred, not shipped, and its `CHANGELOG.md` line says so instead of naming a change.
This records step (Task 13) itself caught a drift the per-task gate never checks: eight of the
first ten tasks' own `CHANGELOG.md` entries wrote "Consumers must: nothing." literally, even
though this pass is non-breaking end to end, since `check:vale`, `check:prose`, and
`check:version` have no rule against the literal string appearing with a no-op payload. Fixed in
this commit by rewording each to plain "No consumer action." (Tasks 8, 11, and 12 had already
independently avoided the phrase.) A later pass whose gate wants to catch this mechanically
would need a lint on the literal string co-occurring with a non-breaking pass marker, which does
not exist today.

**What a later pass would be wrong to rediscover.** The doctor-transcript capture site
(`~/Projects/cairn-scratch/2026-08-16-capture/cairn-capture-scratch`) needs re-scaffolding or
repair against the current engine before Task 9's work can be redone; the five rename-only
drifts (`extractMenu`, `extractVocabulary`, `siteDescriptors`, `buildLinkResolver`,
`buildMediaResolver`) are already applied there, so only the render-authoring API gap remains.
`docs/admin/own-your-domain.md:92-99` still carries the free-until framing and quotes the old
Workers Paid prompt verbatim; Task 8 changed only the CLI copy, and no gate catches the page's
own drift from it. A "no `Consumers must:` line" constraint on a non-breaking pass is not
self-enforcing prose discipline; a task that reaches for the phrase out of habit needs a
sharper eye than a global constraint sentence alone provides. Every one of the twenty-four
ruling rows naming the two retired monolith paths by their old filename already carries its
`- **Note (polish-11a, Task N):**` line naming the new module (verified by
`check:rulings-format` plus a manual grep-and-cross-reference against every row's enclosing
heading); no row needed a fresh annotation at this final step. The pass-end
`code-simplifier` pass found and removed one further piece of dead surface,
`ContentRoutesContext.logCommitFailed`, superseded once every split module's calls moved to the
free `commit-log.ts` import (`0024b85f`); its sibling `commitFailure`, a separate three-call-style
finding recorded at `docs/internal/record/2026-08-26-any-site-audit/int-rank-sveltekit-internals.md:166`,
is untouched and still open. The three pass-end domain reviewers
(`cloudflare-workers-reviewer`, `svelte-reviewer`, `web-auth-security-reviewer`) returned zero
blocking findings against the whole diff; the full post-mortem in the plan file carries their
non-blocking findings verbatim, including one this repo's own `CLAUDE.md` should have a later pass
correct (the Authoring section still calls the engine's `src/lib/components/*.svelte` "unwired"
from the comment gate, which Task 10 wired). The pass's local `e2e` run showed 20 failures, all in
`site-visual.spec.ts`; a same-branch CI regen (`update_snapshots=true`) produced zero baseline
diffs, confirming the failures are this workstation's already-documented Chromium-rendering gap
against the CI runner, not a regression this pass introduced.

## Chassis-B2 (audit remediation slice 9b, the paint-changing half's second slice), code complete and reviewed 2026-09-09

Branch `chassis-b2`, eight tasks executed on `.claude/worktrees/chassis-b2` off `chassis-b`
across four `pass-execute-chains` workflow runs and one overnight halt-and-resume, 2026-09-08
to 2026-09-09; plan and post-mortem at
`docs/superpowers/plans/2026-09-07-chassis-b2-pass.md`; harvest at
`docs/internal/record/2026-09-04-chassis-inputs/chassis-b2-harvest.md`.

**What landed.** The paginated archive proven on a real 27-post corpus (thirteen 2025-dated
posts added and excluded from the scaffold by path; `ARCHIVE_PAGE_SIZE` drops from 50 to 13,
so `/archive/2` renders for real for the first time); site identity read from one server-side
source (`page.data.siteName`, sourced from `site-config.ts`) on one title convention; the
footer nav moved out of a component array into `site.config.yaml`'s `menus.footer`; `site.css`
brought under `check-public-tokens` with the two degenerate `--text-step` clamps collapsed to
the constants they resolved to; the three `platform!` assertions and the `feed.ts` guard mix
closed; and `templates/waymark` read as a first-time developer and rebaked (the showcase's
self-referential "the showcase"/"this showcase" language reworded to "this site," a hard-coded
description literal fixed to read the site's own config).

**What the gate caught.** The pass-end reviewer fan-out (`svelte-reviewer`,
`web-auth-security-reviewer`, `cloudflare-workers-reviewer`) returned four blocking findings
none of Task 3 through 6's own per-task `diff-reviewer` caught, since each read as correct in
isolation and only surfaced once the whole pass's diff was graded together: `/archive/2`
shipped with no page-level `h1` and an inverted heading order the first time it rendered past
page one; `App.PageData` never declared `siteName` despite nine new readers, typing it `any`;
the root layout's new `siteMeta` import pulled the full render adapter and three eager content
globs into every `/admin`, `/members`, and 404 request; and the showcase's own site
description silently regressed to the generic fallback. All four were fixed in one review-fix
round, verified against the code rather than the report. The six-surface `visual-verifier`
returned `pass: true` with two cosmetic findings (a pre-existing double-hairline gap above the
archive/home pagination block, an "N entries" count that reads the page rather than the
archive total) filed to `ROADMAP.md`'s Next tier at pass close, since the pass's own harvest
commit had already landed nearly three hours before the verifier ran. Individual task
`diff-reviewer` rounds caught Task 7's doc-completeness gaps against a freshly baked scaffold
and Task 8's own ROADMAP edit violating the repo's ledger rule (ten lines of shipped narrative
added instead of the tier entry leaving), both fixed same-task.

**What a later pass would be wrong to rediscover.** A pass-end reviewer fan-out catches
cross-cutting defects a per-task `diff-reviewer` structurally cannot, since the latter only
ever grades one task's diff against its own criteria; bank a pass's harvest and ROADMAP
routing only after the fan-out and verifier have run, or their findings need a second pass at
close to get filed. `admin/signups`'s post listing reads the dev backend's own seeded fixture,
never the public `src/content/posts/` directory, so a corpus-size change to the public archive
does not move an admin baseline; verify the actual data source before predicting a baseline
move. A local `CI=1` e2e run drifts permanently from a CI baseline regen by a fixed, nameable
file list (workstation-versus-CI font-hinting or subpixel differences); treat a local failure
outside that named list, not any failure at all, as the real gate, and do not try to
regenerate the drift away locally. Reconstructed subagent spend (input plus cache-creation
plus output tokens, cache-read excluded, an upper-bound approximation) put the pass near 12.7M
against its 6M ceiling, concentrated in the pass-end ritual: four of five tasks from 4 onward
needed a `diff-reviewer` fix round, and a mid-ritual wall-clock halt added a second cold start.
Full detail and the reviewer/verifier verdicts are in the plan's own post-mortem.

## Chassis-B1 (audit remediation slice 9a, the paint-changing half's first slice), merged 2026-09-08

Branch `chassis-b`, seven tasks executed on `.claude/worktrees/chassis-b` off post-chassis-A
`main`; plan and post-mortem at `docs/superpowers/plans/2026-09-07-chassis-b1-pass.md` (PR #51,
`58ed9d1f`); harvest at `docs/internal/record/2026-09-04-chassis-inputs/chassis-b1-harvest.md`.

**What landed.** The showcase, the chassis every theme copy and the scaffold descend from, now
uses the chassis it ships. The capture tool (`capture-surfaces.mjs`) and a committed
intended-moves manifest drove every paint task's before/after proof. The width matrix gained
`error404` and `admin/signups` at five widths in both schemes. The public chrome adopted the
chassis site shell (`.cairn-site-shell`/`.cairn-site-main`). The five composition primitives
landed: `cairn-hero`, `cairn-section`, and `cairn-band` on real site surfaces (the styleguide
masthead, the home page's `.index`, the root error page's message block), `cairn-card` and
`cairn-sidebar-layout` demonstrated on the styleguide's composition section (the sanctioned
exception, since neither primitive has a real call site in this theme). One focus-ring token
trio and a `cairn-focus-ring` utility replaced every hand-written ring. The entry row was
written once as `EntryRow.svelte`, retiring three duplicated markup blocks.

**What the gate caught.** Task 4's `.cairn-section` adoption on the home page's `.index` needed
a redesign-rule fix round (an inline `style="margin: 0;"` on the styleguide's Section demo beat
the primitive's own `@layer components` gap rule outright; moved to a named class with no
inline margin). Task 7's band-to-footer seam fix was a no-op on its first round: the cancel
rule lived in `@layer components` while the footer's `mt-2xl` was a Tailwind utility, and
Tailwind v4's layer order (theme, base, components, utilities) lets the utility win regardless
of selector specificity, no matter what the seam's own selector specificity says. The fix moved
the footer's margin itself into `@layer components`, giving both halves of the seam the same
layer. The pass-end verifier separately caught four `error404` baselines (768/1440, both
schemes) that had passed the unmodified suite's default per-pixel threshold on the first fix
round even though the render had moved: a 7-to-9-level color shift on tiles whose height was
already pinned by the suite's fixed viewport, invisible to `toHaveScreenshot` but visible to a
tile read and `magick compare -metric AE`.

**What a later pass would be wrong to rediscover.** A cross-file CSS conflict in a Tailwind v4
codebase is decided by cascade layer order, not selector specificity; a seam fix must put both
halves of the rule in the same layer or the higher-specificity half can still lose. A baseline
diff under the suite's own per-pixel threshold is not proof nothing moved; a color-only shift on
a height-pinned tile can pass the automated suite while a tile-level `magick compare` catches
it. The capture tool's output directories are write-once by design (refuses a non-empty target)
so a re-run reports the collision instead of silently overwriting a reference set. The exact
`magick montage`/`annotate` recipe that reproduces the `chassis-b-contact-sheets` PNGs
bit-for-bit lives in the `contact-sheet-montage-recipe` implementer memory, not in any plan or
commit; the next pass needing contact sheets should read it rather than re-deriving the
pipeline.

## Identity seam (slice 10), code complete and reviewed 2026-09-08

Branch `identity-seam`, seven tasks executed on `.claude/worktrees/identity-seam` off `main`, in
parallel with chassis-B1; plan and post-mortem at
`docs/superpowers/plans/2026-09-07-identity-seam-pass.md`; harvest at
`docs/internal/record/2026-09-07-identity-seam/harvest.md`.

**What landed.** The identity seam the charter promised but did not yet ship: `createAuthGuard({
identity })`, an `IdentityResolver` contract (`ResolvedIdentity` or `IdentityRefusal`) a site
supplies in place of magic-link, `locals.cairnIdentity` published unconditionally on every admin
path (public and guarded) so public handlers can read the flag without the resolver running,
the two branded pages (`sign-in-through-your-organization.md`, an extend recipe for the
Cloudflare Access verifier; the security-model section covering the seam's threat model), the
doctor probe's redirect classifier (`redirect: 'manual'`, a 3xx whose `Location` host matches the
Access domain pattern is the PASS case) and its workers.dev exposure arm, and the log vocabulary
for identity-mode events.

**What the gate caught.** The pass-end `web-auth-security-reviewer`, `cloudflare-workers-reviewer`,
and `svelte-reviewer` fan-out returned 22 findings, none rewrite-tier; the chief one was the
doctor probe failing every magic-link consumer until an info-exposure downgrade (a workers.dev
exposure detail must never mask a failing primary probe result). The security review separately
hardened the workers.dev exposure arm across two follow-up commits (real-exposure detection, then
a further hardening round) before it accepted. A `diff-reviewer` pass caught a regression where
an info-level finding was masking a failing primary check, fixed in the final commit.

**What a later pass would be wrong to rediscover.** The doctor probe's precedence rule: an info
finding (such as a workers.dev exposure detail) must never suppress or override a failing primary
probe result, only ride alongside it. Two concurrent worktree gates on this machine (this pass and
chassis-B1) produce one-off flaky failures in `rendered.test.ts` and
`reference-coverage.test.ts` from shared-machine contention, not real regressions; re-run the
single file in isolation before chasing a fix. The four review-subagents pin their own model
(`claude-opus-5`) in frontmatter, so a per-dispatch `model` override on them is rejected, not
silently ignored.

## Chassis-A (audit remediation slice 8, structural), merged 2026-09-08

Branch `chassis-a`, twelve tasks executed through four `pass-execute-chains` runs and direct
fix dispatches over 2026-09-05 to 2026-09-08; plan and post-mortem at
`docs/superpowers/plans/2026-09-04-chassis-a-pass.md`; harvest at
`docs/internal/record/2026-09-04-chassis-inputs/chassis-a-harvest.md`.

**What landed.** Prettier on the showcase's ts, js, and svelte with the scaffold format-checked in
both trees; the comment gate over the showcase; the two fixture routes excluded from the scaffold
with a CI content walk; dead components deleted; `cairn.config.ts` split into `icons.ts` and
`markdown-components.ts`; public routes and site metadata single-sourced through `siteMeta`; the
render trio (`iconSpan`, `cardShell`, `headRow`) deleted from the engine and re-homed in the
chassis, `/render` now type-only, with a `Consumers must:` line naming the four sites' imports;
the showcase's unit tests shipping to the scaffold; one import, handler, and error idiom; the
shipped comments purged of process citations and history narration.

**What the gate caught.** The mechanical reformat reflowed the `githubApp` literal
`create-cairn-site`'s finalize pins (fixed with a `prettier-ignore` line; the CLI suite joined
every gate). Inlining `cardShell` moved `card-body` and `card-title` into Tailwind's scan and
DaisyUI restyled every alert (fixed by renaming to `cairn-alert-body` and `cairn-head-title`).
The reviewer caught the conductor's consumer-import inventory wrong twice. An e2e spec's bare
class literals re-armed the same Tailwind collision (fixed by concatenation).

**What a later pass would be wrong to rediscover.** Any class literal in scanned source is a
Tailwind candidate, e2e specs included. The fresh-scaffold proof must repoint at the packed
engine and dev tarballs, as `create-site.yml` does, or it proves the registry. The CLI suite
needs `prepack` first in a fresh checkout. `devBackendOptIn`'s literal ships in the default
bundle, so it cannot be a dev-fold marker. Implementers polling a gate with no-op commands
trip the runaway guard.

## 2026-09-05: internals-C pass complete (audit-remediation slice 7, coherence)

Plan and post-mortem: `docs/superpowers/plans/2026-09-03-internals-c-pass.md` (worktree
`internals-c`, off post-B `main`). All thirteen tasks landed through the
implementer/diff-reviewer/gate chain: type-level exhaustiveness over `FieldDescriptor`'s five
dispatch sites (compile-time-only proof, permissive runtime fallback preserved on every Worker
request path); the `check:idioms` gate born green (leading-tab indentation, the
`process.exit(`-to-`process.exitCode` conversion across 18 `scripts/checks/*.mjs` files, three
comment-register rules); the pass-scoped comment-citation purge across all of `src/lib`; the
`ec-*` -> `cairn-*` emitted-class rename (the pass's one `Consumers must:` event); the full
`as never` retirement from `src/tests` (881 casts to zero, minus the annotated escape hatch);
truthful module headers and a unified `logCommitFailed` call style; the `docs/internal/
src-lib-map.md` contributor map; the `readPublicOrigin`/`csrfSecure` reconciliation at platform
depth only; and the `createSectionAction` docs repositioning. Final state: `npm run check` 0/0,
`npm test` exit 0, 22 named gates green, and a from-scratch showcase install/build/e2e (155
Playwright tests) exit 0.

What the gate caught: the three-reviewer pass-end fan-out (`cloudflare-workers-reviewer`,
`web-auth-security-reviewer`, `svelte-reviewer`) found no blocking architectural defect, but did
find the exhaustiveness rewrite had turned three permissive dispatch defaults into runtime
throws on a save/validate/form-load request path; the fix round (`994bf8e5`) restored the
permissive fallback on all three while keeping the proof compile-time-only, per the conductor's
own exhaustiveness rule. One asymmetry was flagged non-blocking and left deliberately:
`decodeField`'s default arm still throws `unreachable()` (its one live caller, genuinely
unreachable for any real value today), while its three siblings now degrade permissively; the
next pass touching a field descriptor's dispatch sites should decide this on purpose rather than
rediscover the split.

What a later pass would be wrong to rediscover: the workstation suspended for 8 hours 13 minutes
mid-pass when GNOME's 15-minute-on-battery rule fired because the runaway-work battery guard
(inhibitor plus watchdog) was never armed for this run; arm both before any unattended run past
roughly 30 minutes, battery or not. The measured build that ran concurrently with this pass's
close surfaced four engine defects and two undocumented inference traps, filed to `ROADMAP.md`'s
Next tier rather than fixed here, since none falls inside this pass's task list. Budget: ceiling
6.5M; planning misses 1 (Task 8's config-location escalation), execution sittings 0; the token
spend figure is recorded at STATUS close.

## 2026-09-04: internals-B pass complete (audit-remediation slice 6, four monolith splits), merged at `0ac9b40a` (PR #48)

Plan and post-mortem: `docs/superpowers/plans/2026-09-03-internals-b-pass.md` (worktree
`internals-b`, off `main` at `c95ff02d`). All fourteen tasks across five independent chains
landed through the implementer/diff-reviewer/gate chain: `content-routes-core.ts` retired
into five siblings behind the unchanged `content-routes.ts` composition root;
`audit/rendered.ts` became a directory barrel; `CairnMediaLibrary.svelte` shed five dialogs
into their own components; `EditPage.svelte` collapsed its 13 `EditorApi` holders onto one
identity-guarded `editor` grant (`registerEditor` now delivers `null` on destroy) and shed
`ShareLinkPanel`, `DetailsPanel`, and three `.svelte.ts` controllers; `FieldInput`'s
`ownership_invalid_mutation` warning is fixed; and `cairn-media-seed`'s read and write
containment now resolves symlinks and validates before any fetch. Final state: `npm run
check` 0/0, 374 files / 4,927 tests plus 78 files / 1,354 component tests exit 0, every
CI-only gate green by name.

What the gate caught: the five-reviewer fan-out (svelte, daisyui-a11y, cloudflare-workers,
web-auth-security, cleanliness) found no blocking architectural defect, but did find five
blocking a11y items in the extracted media dialogs (a live region mounting together with
its first content instead of present-and-empty, focus dropped on a step flip, an unbound
initial-focus ref, a tabbable invisible file input, and an unguarded Escape during an
in-flight upload), a comment-accuracy defect class in the split's own headers (a
re-export block claiming an importer that did not exist, a doc describing the wrong
function, a stale enumeration), and a write-before-validate ordering bug in `media-seed`.
All folded into three fixer commits; a fresh-context Opus `diff-reviewer` re-read all three
against their source findings and accepted every one. The diff review's own non-blocking
list, routed forward rather than fixed in this pass: the reset-coverage test's
declared-state regex misses a generic-comma type annotation, `ShareLinkPanel`'s
`aria-disabled` busy idiom now contradicts `EditPage`'s own native-`disabled` rule, and
`content-routes-entry.ts` is the one sibling still doing two jobs at 1,630 lines.

What a later pass would be wrong to rediscover: a pass-end fix round with more than one
parallel writer needs its own worktree per writer, never one shared worktree between
them; two of this pass's three fixers ran `git stash` in the same worktree and transiently
clobbered each other's uncommitted work before either committed (both recovered).
`content-routes-media.ts` at 1,447 lines is the one file left from the audit's original
monolith list; `content-routes-entry.ts` is larger at 1,630 lines but was created by this
split, so it enters the next slice as new work rather than carried work. The
`registerEditor` identity-guarded revocation rests on Svelte memoizing a call expression in
prop position (`registerEditor={bindEditorGrant()}` compiles to one `$.derived` per mount, so
`onMount` and `onDestroy` see the same closure); that assumption is now pinned by a re-key
harness test (`MarkdownEditor.test.ts`), not left resting on a comment alone. Budget:
ceiling 8M; spend unrecorded, since the session running the final fixer and gate sweep was
killed mid-ritual by a CLI update before a spend figure was captured. Interaction points:
two (the combined plan-approval question, 2026-09-03 evening; the resume instruction after
the CLI-update kill).

## 2026-09-03: internals pass complete (audit-remediation slice), branch pushed for PR

Plan and post-mortem: `docs/superpowers/plans/2026-09-01-internals-pass.md` (worktree
`internals`, off `main` at `a5352f0b`). All thirteen tasks landed through the
implementer/diff-reviewer/gate chain: the standing gates (`check:self-use`, the F-1
leak-class rider on `check:surface`, the `staleNames` per-subpath rescope, the
`check:editor-quotes` tripwire and vale reconciliation), the `MarkdownEditor` seam
collapse onto one `registerEditor(api)` prop and its `EditorApi`, the `list-role`/
`panel-width` audit-rule re-groundings, the indexed-access reference convention, the
`CAIRN_DEV_BACKEND` refuse-on-set-AND-non-local tripwire, the access-semantics
two-posture documentation, the `SITE_CONFIG_PATH` engine-owned data-file convention,
the six stale module-header fixes, the `previewRevoke` export half, and Task 13's
destroyed-row liveness plus the `formatTimestamp` two-shape contract. Final state:
`npm run check` 0/0, `npm test` exit 0, every CI-only gate green by name, and a
from-scratch showcase install/build/e2e (155 Playwright tests) exit 0. The close also
landed the browser test gate under an 8G MemoryMax systemd scope (`30cf36a3`,
`scripts/test/contained.mjs`, direct-spawn fallback where no user manager exists); the
browser-recycling investigation measured one recycled Chromium across all 78 component
files with summed RSS plateauing near 3.6G, so no vitest config change was needed.

What the gate caught: `check:snippets` found three problems in the access-model docs,
fixed in the same pass (`7604e2b3`). The five-reviewer fan-out (svelte, daisyui-a11y,
web-auth-security, cloudflare-workers, plus the standing cleanliness lens) produced a
three-round fix fold: round A reworked the `CAIRN_DEV_BACKEND` tripwire against the
security findings (a fail-open cache-latch bug, a dual env-source read, a
`PUBLIC_ORIGIN`-first locality discriminator through a new shared `isDeployedHost`);
round B folded 21 items across the audit rules, gate coherence, and the `EditorApi`
surface; round C answered an independent verifier's escalation, a regression in the
`existsSync` pre-filter that a green gate run had missed, fixed with a source-file
discriminator in both the gate and its test.

What a later pass would be wrong to rediscover: the dev-backend tripwire's threat
model is Host-header spoofability off Cloudflare, which is why `PUBLIC_ORIGIN`-first
locality is the fix, the same shape `csrfSecure` already used; the F-1 leak rider's
`/components` skip rests on the premise that the subpath's exports are structurally
enumerable elsewhere, and that premise now has its own resolution recorded in the
rider's own comments rather than left implicit; a type-only barrel re-export of a
DYNAMIC_ONLY editor module trips `editor-boundary.test.ts` unless the test exempts
`export type`/`import type` forms. Budget: ceiling 6.5M; chunk one's checkpoint
estimated 1.5-2M, chunks two and three ran unmetered, and the close session's
subagent spend alone sums to roughly 2.5M, landing an estimated 5-5.5M total under
ceiling with the metering gap itself recorded as a process defect. Interaction
points: plan approval plus the `CAIRN_DEV_BACKEND` letter-amendment confirmation (one
combined event); a deliberate reboot pause; zero questions during the close session's
fully autonomous review fold.

## 2026-09-02: conformance pass merged (audit-remediation slice 4b), PR #46, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-09-01-conformance-pass.md` (worktree
`conformance`, merged at `12330d71`). All fourteen tasks landed through the
implementer/diff-reviewer/gate chain: the 26 Tier 1 retires, alias prunes, the CairnHistory
reshapes, `TidyClient` narrowed, `previewMint` made safe (Opus), the `ReproContext`
`mediaBase` prop, `ctx.attr()`, the `normalizeAssets` hoist, the OfficeList-onto-PageHeader
collapse, the StatusChip badge tiers, the ten log-event evenness fixes (Opus), the two
audit-rule repairs, the five `rendered.*` renames, and the `variants` retirement on
five-repo sweep evidence. A mid-pass power loss killed the original workflow during Task
11; the fresh session salvaged the warm uncommitted tree by dispatching the same task with
take-over instructions, and the salvage held (the reviewer verified every step of the
partial work). Final state: `npm run check` 0/0, 6075 tests exit 0, every CI-only gate
green by name, PR CI fully green including the from-scratch consumer e2e.

What the reviews caught: Task 12's chroma repair overclaimed (the corpus had two
false-positive mechanisms and the chroma term closes only the hue class; the conductor
ruled the ratified 1.5 floor untouched and every claim scoped to the truth, with the
residual as a failing-test tripwire). The five-reviewer fan-out plus the Opus beauty lens
produced a 25-item fix round: verdict provenance stripped from four reference pages (a new
scar-tissue class this pass almost introduced), the one-chokepoint `preview.token.minted`
emit moved into `previewMint`, auth-before-origin restored at the action, `resolveSalt`
made read-first (no cold-isolate write on teardown), the "expired row leaves no record"
overclaim softened (ruled: no expiry predicate on the DELETEs), and eight missing
migration-notes entries landed. The a11y lens proved `badge-soft` sits under both of
`chip-ground-collision`'s own floors (documented as a deliberate boundary-less exemption)
and that the chroma term is CVD-blind (recorded; the CVD term rides the filed floor
recalibration).

What a later pass would be wrong to rediscover: the ratified `outcome`-discriminant
grammar is KEBAB-case (snake_case governs log-record `reason`/`scope` fields only; a
conductor ruling to the contrary was refused with evidence and the refusal upheld). A
vitest helper imported from another `*.test.ts` re-executes that file's whole suite under
the importer (extract to a plain module). Deleting archaeology from a component doc block
can silently drop a class from the compiled admin sheet (`gap-0` compiled only via prose;
the sheet-inventory test is the net). The whole-log friction triage (now a standing ritual
step) found twelve queued entries already shipped and one genuinely stranded
(toolkit-seams' `isUniqueViolation` defer was never ledgered). Local Vale 3.19.0 finds 16
real `Google.EmDash` errors CI's 3.15.1 misses; the internals pass fixes the pages and
records CI-as-arbiter. Budget: ceiling 6M; the crashed session's exact ledger is lost
(checkpoints show tasks 1-10 within pace), and the resumed session spent ~3.3M on 4b
chains, ritual, reviews, and fix rounds, so the pass ran at or slightly over ceiling with
the overrun in the five-lens ritual plus crash recovery, not the chains. Interaction
points: zero blocking questions to Geoff; five Geoff-initiated directives folded mid-pass
(the polish slice, the chassis mandate and its two consequences, the pre-merge internals
review, the friction-triage ritual step).

## 2026-09-01: conventions pass merged (audit-remediation slice 4a), PR #43, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-08-30-conventions-pass.md` (worktree
`conventions`, merged at `bc960fec`). All eleven tasks plus two doc residuals landed through
the implementer/diff-reviewer/gate chain in workflow mode, three sequential chunks: the
sitting's rulings written into the ledger, bags and contracts, verb renames, the outcome
idiom, the `ContentFormFailure` flatten, cookie posture, the login nonce and adminAction
authorization (both Opus-implemented), the channel fold, coupled pairs, doctor, and bins.
Final state: `npm run check` 0/0, 6017 tests exit 0, every CI-only gate green by name, and
the from-scratch consumer proof (fresh showcase install, build, 155 Playwright e2e under
CI=1) green. Budget: ~6.9M against the 7M ceiling Geoff raised from 5.5M mid-pass (the
overrun ruled review rigor, not waste); two scope grants, three ratifications, zero
corrections of landed work.

What the reviews caught: per-task Opus diff review found real defects in five of eleven
tasks (doc staleness twice, the dev-double SQL dispatch, a tautological register test, an
unrunnable CI example plus an incomplete exit matrix). The pass-end fresh-context fan-out
caught four findings no earlier layer saw: the absent-cookie short-circuit voiding the
`nonce_hash IS NULL` compat path (a shipping blocker refusing scaffold bootstrap, in-flight
upgrade links, and recovery rows); the rethrow-guard narrowing (a site limiter throwing
redirect/error degraded to open); the throttle/nonce login lockout (attacker rebinding plus
cooldown denies the only sign-in channel), resolved by Geoff as rebind-no-email
(last-requester-wins binding, unbound rows skipped so the hand-seeded recovery escape hatch
survives, `auth.token.rebound` records the rebind); and the pending-cookie TTL coincidence
(ordinary timeout misdiagnosed as wrong-browser, invisible to the Map-jar harness).

What a later pass would be wrong to rediscover: workflow suspend recovery is
verify-not-redo (journal cache makes stop-plus-resume near-free), and a stall guard must
watch the whole transcript dir, not `journal.jsonl` (the journal writes only at agent
boundaries). The integration cookie jar has no expiry semantics, so real-cookie timing
interactions ship green (ROADMAP: test-harness fidelity). `resolveRateLimit` is
kit-agnostic by design: redirect/HttpError rethrow lives at call sites. The
migration-adoption instruction is plain `wrangler d1 migrations apply` (idempotent DDL
makes re-apply the safe path), and an unbound token row is scanner-confirmable by design
(its pre-migration semantics; the scaffold depends on it). Local `check:vale` reports 18
errors in three docs main's CI passes; reconcile before trusting local vale as a gate.
`Outcome`-suffixed result-union names are accepted (results, not failure shapes; the
`Failure`-suffix ruling is not implicated).

## 2026-08-30: retires pass merged (audit-remediation slice 3), PR #42, CI green

Plan and post-mortem: `docs/superpowers/plans/2026-08-30-retires-pass.md` (worktree
`retires`, ten commits, merged at `d2c434ea`). The 56 ratified retires executed: 38
unsanctioned in three family batches plus 18 F-1 sanctioned leaks with the move record
(`docs/internal/record/2026-08-30-retires-move-record.md`), a compile-only fixture proving
every replacement expression, all 7 format-allowlist repairs (40 to 33), the four ledger
annotations, and the `f1-return-position-leak-sanction` standing-rule entry. Surface diff
against the branch point: 58 export rows removed, 0 added, 0 modified (53 names; 3 closes
were process proposals with no symbol). Ledger partition verified 2 + 56 + 36 = 94;
list (c)'s 36 (25/7/1/3 tiers) and `DEFAULT_ROLES` untouched. Budget: ~4.6M subagent spend
against the 4.5M ceiling; zero questions to Geoff mid-pass.

What the reviews caught: two shipped `skills/` pages still teaching deleted components
(the plan's drift-hunt scope omitted `skills/`, which ships in the npm tarball; the scope
now includes it); a repointed test gone tautological (fixed with an aggregate
reverse-containment test); the plan's pre-written `AdvisoryAction` replacement did not
compile (optional member; corrected with `NonNullable<...>`); the plan's "expected 20"
leak count contradicted its own predicate (actual: 17 rendered strict, 18 type graph, 19
and 20 including the un-verdicted `DictionaryAddFailure`/`TidyFailure`); and the
CHANGELOG's `devDelivery` migration snippet shipped ungated, which would have logged
production OTPs to Workers Logs for any site copying it (xcathletes will follow that
line) — replaced with the in-body-refusal form and pinned executable by a new showcase
spec.

What a later pass would be wrong to rediscover: the move record is the internals pass's
rider brief and now states its own limits — the predicate is subpath-blind
(`NavIcon`/`EngineScreenId` carry their own `/sveltekit` export rows and need a
per-subpath clause; only `SlotKind` is absent-everywhere), the
`RemoveIndex`/`ValueOf`/`StandardResult` vs `DictionaryAddFailure`/`TidyFailure` split is
inherited rather than derived, and "retire-verdicted" deliberately narrows F-1's
"retire-or-absent" wording. `buildSurfaceModel()` expands shapes one hop only, so a
rendered-text derivation misses `AdvisoryAction`; the rider must derive against the type
checker. Local `check:vale` red (18 errors, three files untouched since the branch point)
was Vale version drift, not a regression; CI's pinned Vale is the arbiter. Two small
follow-ups: a reference-page convention for naming the indexed-access form beside shapes
that print un-importable members (18 sites), and the per-story `has a matching manifest
entry` assertion in `reproductions-stories.test.ts` is vacuous now that the aggregate
test carries the guarantee.

## 2026-08-30: foundations B pass closed on its worktree (audit-remediation slice 2b), awaiting Geoff's ratification and merge

Plan and post-mortem: `docs/superpowers/plans/2026-08-28-foundations-b-pass.md` (worktree
`.claude/worktrees/foundations-b`, pushed, ten commits `e743f624..014872b2`). T1 narrowed the
public `createContentRoutes` declared return to a 25-member `Pick`-derived `ContentRoutes`
(ten media-janitorial members internal-only; unexported-from-barrels
`createContentRoutesInternal` keeps the wide shape for the composer; compile-only hand-mount
fixture; `audit-sveltekit-contentroutes` closed, no retire consumed). T2 wrote the R4
re-derivation record (`docs/internal/record/2026-08-30-r4-rederivation.md`): partition
0 + 63 + 31 = 94 exact, `DEFAULT_ROLES` the OUT-OF-94 exclusion; one fix cycle on fabricated
type-composition citations. T3 swept the ten names' drift across the reference arms (real
drift found and fixed in three files; the gates structurally cannot see prose drift). All
eleven gates green; branch pushed for the CI consumer-build proof. Budget overrun recorded
honestly: ~2.3M subagent spend against a 1.8M ceiling, the conductor missing the trajectory
at the Task 3 checkpoint.

What the reviews caught: the Task 2 record quoted a fabricated eight-arm `ContentFormFailure`
composition (the real one is eleven arms at `content-routes.ts:97-99`), caught only because
the diff reviewer re-derived instead of reading; the new fixture wired a `listDelete` action
name no engine component posts (the svelte-reviewer's W1). The pass-end `engine-triage`
dispatch produced F-1: 19 of list (b)'s 63 retires are named inside keep-verdicted exports'
rendered shapes (`EditData`/`AdminData` family), so executing list (b) as written
manufactures 19 closure leaks of the `NavIcon` class; the record now carries the 19-row
keep-parent table and a neutral A/B resolution awaiting Geoff at the ratification gate.

What a later pass would be wrong to rediscover: `check-surface.mjs` renders a callable's
declared NAMED return collapsed to the alias name (`CALLABLE_FLAGS` omits `InTypeAlias`), so
narrowing proofs live on the alias's own snapshot entry, not the factory line. The narrowing
is type-level only: the wrapper returns the wide runtime object, so a spread still mounts all
35 actions and the withdrawn thing is the supported seam, not reachability. Only the
keep-parent formulation (a retire-verdicted name inside a keep-verdicted export's rendered
shape) finds all 19 F-1 rows; fixed points from `createCairnAdmin`'s line miss two
(`ReproInstance`, `AdminActionOptions`, the latter an argument-position leak). No compile in
the repo exercises the hand-mount path against generated `./$types` (carried follow-up).

## 2026-08-29: foundations A pass closed on its worktree (audit-remediation slice 2a), awaiting merge

Plan and post-mortem: `docs/superpowers/plans/2026-08-28-foundations-a-pass.md`. Three tasks on
worktree `.claude/worktrees/foundations-a`, gates green, per-task diffs accepted, pass-end
`engine-triage` verdict "holds" on all three artifacts. T1 repaired 14 truncated ledger shapes
and landed `check:rulings-format` (`632cca35`). T2 ratified R-0 (an unused-but-usable export is
a shape defect until argued otherwise) and executed R-1 (canonical home follows the publishing
barrel), moving 18 duplicate publications and recording 120 R4-justified re-exports under a new
`check:surface` canonical-home rule, including a gated `--update` path and a checked `home`
field (`a7f9510a`). T3 swept for residual moved-name drift (zero hits) and removed 14 stale
rows from `docs/reference/delivery-data.md` (`b065ea51`). Budget: ~1.6M of a 2M ceiling.

What the gates caught: the diff review on T2 found `MediaResolve`'s canonical home mislabeled
as `/media` instead of `.` across three docs (ledger, move-set record, reference page), fixed
in one cycle (`35dea8b0`). `check:consumers` failed in the recovered worktree on the known
worktree showcase symlink collision (`examples/showcase/node_modules` resolving to `main`'s
build), an environmental failure repaired with a from-scratch `npm ci`, not a code defect.

What a later pass would be wrong to rediscover: a green `check:surface` proves a duplicate
publication is RECORDED, never that its `Why it survives` justification still holds; appending
a record entry launders any duplicate green, so a later slice re-deriving the R4 closure must
not read the gate as evidence. The audit's literal R-1 ask (fail on any name published from two
or more subpaths) shipped as fail-unless-recorded, not fail: the surface still carries 122
multi-subpath names after this pass, the same count as before it, with only
publications-per-name falling; this is a deliberate, documented divergence; foundations B's
list (b) is measured against it, not against a false "audit ask satisfied" reading. The
reference-coverage gate's `staleNames` check is union-over-all-subpaths, not per-subpath, so a
reference page can list a name its own subpath does not export as long as some other subpath
exports it anywhere; this is exactly how the 14 dead `delivery-data.md` rows survived
undetected, and B should scope it per-subpath before `/sveltekit` narrows to ~30 leaves.
Crash-recovery pattern: when a session dies mid-pass, triage-assess the warm uncommitted tree
against the gate before re-dispatching from scratch; Task 2 here was substantively complete and
needed only one fix cycle, not a redo.

## 2026-08-30: csrf-hardening pass merged (remediation slice 1)

Plan and post-mortem: `docs/superpowers/plans/2026-08-27-csrf-hardening-pass.md`. Merged via
PR #40, all checks green, holding unpublished. Four tasks (Lax cookie with re-anchored
Max-Age and one `csrfSecure` derivation; the unreadable failure paths; the
detail/witness/hasSession rejection discriminator; ledger hygiene) plus a pass-end security
review that caught a blocking defect no per-task review could see. Budget: ~2.1M against a
1.8M ceiling, the overrun accepted to land that fix.

What a later pass would be wrong to rediscover: `csrfSecure` must stay MONOTONIC (an https
request always mints Secure/`__Host-`; `PUBLIC_ORIGIN` can only raise, never lower) because a
leftover dev `http://localhost:8788` in `PUBLIC_ORIGIN` passes `requireOrigin` and would
otherwise strip the prefix that is the sole sibling-subdomain defense under Lax. The CSRF
token rotates once at successful login, a ruled deviation from the plan's no-rotate line: the
no-rotation posture made the token permanent per browser, and the one honest cost (an
already-signed-in browser re-authenticating 403s another tab's form once, self-healing) is
stated in the code comment and security-model.md. SvelteKit's `cookies.delete` defaults
Secure over non-localhost http, so a delete must pass its setter's `secure` flag or the
browser discards it. `platform` is required-but-nullable on the CSRF helpers so omission is a
compile error; `CookieJar.delete` widened publicly to carry `secure` (bivariant, non-breaking,
changelog carries it). The live smoke's stale-cookie check works and is the template for
diagnosing consumer 403s: `guard.rejected` with `detail`/`witness`/`hasSession` and never
token material.

## 2026-08-29: harvest-detection pass merged; main's CI red healed

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-harvest-detection-pass.md`. Merged as
`445e350f` (PR #39), holding unpublished. Six tasks: the `config.no-referrer-blanket` doctor
check, `sheet` as a source list, four audit rules (stripe/trim parity, unlayered font clobber,
`list-role` with in-tree `role="list"` adoption, `panel-width` with the new `row-expanded`
rendered state), showcase smooth-scroll with router-scroll exclusion, and the two admin
recipes. The pass-end domain reviews drove four fix rounds; the deflake of the scaffolder
grace-window tests and the healing of main's inherited CI red (stale visual baselines and
norms manifest from the toolkit-seams merge, regenerated at `3a5e2f3b`/`268c315e`) rode the
same close.

What a later pass would be wrong to rediscover: `no-referrer` scoped onto an
`originMatches`-guarded route 403s its own POSTs (`Origin: null`), so the remedy for
origin-guarded routes is `same-origin`; only the admin's double-submit routes tolerate
`no-referrer` (ledger: `originmatches-strict-guard`). `panel-width` measures nothing at rest
for panels (the `row-expanded` state exists for exactly this) and cannot see a closed
`<select>`'s clipped value (`scrollWidth` never grows; painted-width follow-up filed).
`list-role` covers own-class triggers only; DaisyUI's descendant-selector styling
(`.menu :where(li)`) leaves nine engine lists outside it (inventory in the friction log,
routed to the remediation initiative). `html { scroll-behavior: smooth }` animates Kit's own
`scrollTo` after every navigation; the chassis excludes router scrolls via a
`beforeNavigate`/`afterNavigate` class toggle, with `navigation.complete.catch` covering
cancelled navigations (`onNavigate` cleanup never fires on an aborted nav). Node `setTimeout`
can fire sub-millisecond early at small scales, so wall-clock grace-window assertions flake on
CI; the deflaked tests use `node:test` mock timers. A stale local showcase install (the npm
`file:`-dep cache trap) masks norms drift: regenerate the manifest only from a clean
`npm ci --prefix examples/showcase`. Baselines regenerate via
`gh workflow run e2e.yml --ref main -f update_snapshots=true`, which commits the result.

## 2026-08-27: toolkit-seams pass merged

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-toolkit-seams-pass.md`. Six ASC-harvest
behavior absorptions (media picker seam, ExpandableRow inert-cell escape, ToolbarDisclosure,
CsrfField hardening, StatusChip three-register grammar with tone/dot retired, admin sheet
contrast fixes), holding unpublished. What a later pass would be wrong to rediscover: the
CsrfField "reset blanks the token" defect is spec-impossible for hidden inputs (value setter IS
the default-value setter); daisyUI `.list` does NOT suppress list markers (its baggage is
flex-column plus forced .875rem type); daisyUI `.menu`'s display rule beats the UA `[hidden]`
rule, so hiding needs an explicit scoped rule; the e2e visual suite renders no chip-bearing
surface (blind to chip changes, friction-logged); the facet-chrome contrast deferral's real
numbers are 1.192/1.203 (earlier 1.50/1.75 figures were measured without the Svelte scope
class); and the strongest CSRF-403 candidate is the confirm-load `SameSite=Strict` re-mint,
not the header path. `isUniqueViolation` deferred with reopen triggers in the ledger.

## 2026-08-26: engine-consultation pass closed

Plan and post-mortem: `docs/superpowers/plans/2026-08-26-engine-consultation-pass.md`; spec
`docs/superpowers/specs/2026-08-26-engine-consultation-design.md`. Landed on `main` directly
(docs and Claude infrastructure only). Shipped the consultation protocol: the
`engine-consult` skill, the `engine-triage` agent, both pass-skill hooks (cold-start tested
with a negative control), the rulings ledger, the consultations arm, and both CLAUDE.md
edits. Ran both audits under Geoff's thoroughness ruling: the whole-surface any-site audit
(535 items, 384 keep / 57 reshape / 94 retire, trustworthy on run 2 after its own auditor
condemned run 1 for a conductor script bug) and the mid-pass-directed internals+chassis
audit (175 findings, 10 rewrite-tier, trustworthy; the FieldDescriptor exhaustiveness gap
proven by a live mutation experiment). Re-reviewed both held absorption plans against the
rulings; verdicts appended in each plan file.

What a later pass would be wrong to rediscover: the five conductor adjudications over
recorded verification dissent are in the audit record's "merge repair" section, argued, not
just tallied; the R4 export closure is over-applied and its re-derivation (with the
`ContentRoutes` narrowing) re-tests adapter's ~22 C2_READDED keeps; the admin-toolkit field
tier retired because the shipped sheet's class inventory is a de facto public API
(`admin-css-safelist.ts:104`), the same ground that keeps `FieldLabel`; workflow subagent
file writes with `/`-carrying names create nested directories (four verify files landed
under mangled paths and were normalized into the record dir); and a condemned workflow run
resumes from cache, so fix-and-resume costs only the re-run agents, never the fleet.

## 2026-08-22: newest-toolchain pass merged

Plan and post-mortem: `docs/superpowers/plans/2026-08-21-newest-toolchain-before-beta.md`.
Worktree `newest-toolchain` off `main` at `13726d57`, merged as `d2972d11`. Pushed every floor
to current: Node `>=24`, `@sveltejs/kit ^2.70`, `svelte ^5.56.10`, DaisyUI 5.7.20, Tailwind
4.3.3, Wrangler 4.125.0, Vite 8.2.2, ESLint 10, `@anthropic-ai/sdk` 0.120 (peer widened to
`>=0.105.0 <1`), `actions/checkout`/`setup-node` v7, `compatibility_date` `2026-08-21`. Shipped
the admin upgrade map (`docs/admin/what-to-run-and-when.md` + `check:target-stack`), an advisory
weekly `check:tsgo` job, Cloudflare Images' `aspect-crop`/`scale-up`/`upscale` fit modes, and
moved Tidy's default model to `claude-sonnet-5` at `effort: low`.

Scope grew from 7 planned tasks to 16 plus roughly a dozen pass-end folds (~7.5M subagent
tokens against a 1.5M ceiling raised twice, to 3M then 4.5M); every addition traced to a real
Geoff ruling, but the lesson banked is to split at the chain-2 boundary next time a ruling adds
genuinely new surface mid-pass. `secrets.required` for the GitHub App key was tried and
withdrawn at review (wrangler 4.125 filters `.dev.vars` once a `secrets` block exists, and a
first deploy of a not-yet-existing Worker throws on an unset required secret); the redesign
brief is in `ROADMAP.md` Next, "Declare required Worker secrets without breaking local dev."
`check:transcripts` and `check:symbols` both caught locally-green work; the `cairn-pass`
ritual's CI-only gate list grew from four to six. A weekly rate-limit outage cost roughly 8
hours of wall clock and one duplicated dispatch; a stall guard now runs on every large single
dispatch, not only workflow-mode runs. Full evidence, every falsifiability proof, and the
decisions locked in are in the plan's own post-mortem section.

## 2026-08-21: dependency upgrade landed, e2e baselines regenerated

Three commits (`9b30e756`, `d633ad5f`, `8c9de10f`) took DaisyUI 5.7.20, Tailwind 4.3.3,
SvelteKit 2.70.3, Svelte 5.56.10, Vite 8.2.2, Wrangler 4.125, ESLint 10,
`@cloudflare/workers-types` 5, and `@cloudflare/vitest-pool-workers` 0.22. All local gates and
the `test`/`scaffold`/`design`/`create-site` workflows went green; `e2e` was red only on visual
baselines, an upstream DaisyUI `.alert` grid improvement rather than a regression. The
regeneration dispatch lost a push race to a STATUS handoff commit; the re-dispatch landed
baselines as `25dae7ad`, and `e2e.yml` now rebases before its bot push so the race cannot
recur. A `tsgo`-flagged implicit `any` in `check-snippets.mjs` was a JSDoc comment whose triple
backticks hid the `@param` from the Go compiler; reworded, not a real type gap.

## 2026-08-20: release `0.95.0` cut and published

`0.95.0` published on npm for both `@glw907/cairn-cms` and `@glw907/cairn-cms-dev`; GitHub
release `v0.95.0` cut against `main` at `e0033063`. All five CI workflows were green before the
tag.

Three things the cut decided, one it could not. **`create-cairn-site` held, never shipped**
(`npm view` still 404s): the GitHub App's "Only select repositories" mode strands a first run,
and recovery needs a `delete_repo` permission a reader may not have; its cost-narrative plan is
drafted, not approved. **The dev backend's first OIDC publish 422'd** because
`packages/cairn-cms-dev/package.json` carried no `repository` field; fixed in `48961469`, now
asserted by `check:dev-package`, and the publish job gained an already-published guard so a
recovery run no longer dies on the half that already landed. **The `--strip-dev-backend` watch
fired and is discharged** (`ae839697`): `0.95.0` published the dev backend unstripped through
the release path, so the weekly drift compare stopped stripping. **What the cut could not do:**
the public template repo sync failed (`glw907/cairn-waymark-template` never existed,
`TEMPLATE_REPO_TOKEN` unset); Geoff ruled the fix instead of chasing the credential: the
template moved in-repo to `templates/waymark/`, emitted by `emit-template-dir.mjs` and gated by
`check:template`, and `sync-template.yml`, its `publish.yml` job, and `sync-template-repo.mjs`
are deleted.

What consumers owe on this window: five compile-time breaks (`SiteConfig` lost its index
signature; `AdminShellData.mediaBase` and `EditData.singular` are new required fields;
`DeleteDialog`/`RenameDialog` renamed `label` to `singular`) plus one operational fact, stated
plainly per Geoff's 2026-08-19 ruling: a cairn site runs on Cloudflare Workers Paid ($5/month)
from its first deploy.

Watches from this window: the SvelteKit `checkOrigin` deprecation FIRED in a real build
(`ROADMAP.md` Now); `check:surface` proved blind to a removed index signature (`ROADMAP.md`
Now, both still open); TypeScript 7 and `vitest-browser-svelte` 3 were both held with named
triggers (both later resolved, see 2026-08-21 and 2026-08-22 above); `@cloudflare/workers-types`
5's `Buffer: any` scar is marked with a `WATCH` comment on `scripts/build/emit-template.mjs`.

## 2026-08-20: Go `cairn` tool, sub-project 1 opened (parallel track)

Design approved by Geoff in a Fable brainstorm, written to
`docs/superpowers/specs/2026-08-20-cairn-tool-spine-and-hud-design.md`, then revised after a
five-vantage adversarial review and a 24-agent verify pass (chapter spine as Go types, a
read-only health HUD, poplar's root-model-plus-registry shape, a split credential model,
`tool/` in-repo). Plan: `docs/superpowers/plans/2026-08-20-cairn-tool-spine-and-hud.md`, three
passes (A foundation, B checks and CLI, C the HUD), 29 tasks. Runs independently of the engine
window; does not block site updates or the editors rewrite.

## 2026-08-19: live-reproduction seam built, both halves

Plan and five post-mortems: `docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`.
The delivery half shipped in `cairn-pub` on `pass-d-docs-tracks` (`8bef4f0`..`e182f36`); two
load-bearing engine commits landed here alongside it: `42b9d105` lets a prerendered route mount
`EditPage` (four of 25 story pages emitted no HTML at all without it), and `a5a069a8` binds a
story's chip numbers rather than only its marker keys.

Two of three pre-embed obligations closed engine-side. `ReproStory.pose` now receives the
mounted component's own exports as a required second argument (`media/insert-panel` no longer
pictures a control the real admin never renders; the handoff runs synchronously inside the
mount, not from an effect). `tags/screen`'s declared column height grew from 700 to 940, proven
by a new geometric gate, `src/tests/component/reproductions-marker-crop.test.ts` (its blind spot:
a `column` story is proven at the docs measure only, filed `ROADMAP.md` Now). The third
obligation, a longer accessible-name standard for the three locate-many-controls screens, is
filed to `ROADMAP.md` Now and belongs to the editors rewrite, not the engine.

`cairn-pub`'s next engine install must thread the instance through
`repro-story-lifecycle.ts` and the `[...story]` route's `ReproContext` mount, since widening
`pose` is a compile-time break. A four-lens review found 54 findings; five folded here, the rest
filed as `cairn-pub` Pass 7.

## 2026-08-15 to 2026-08-19: visual layer, diagram pages, capture pass, `cairn-pub` prepared

Geoff ruled 2026-08-15 that release one waits for the visual layer: no hurry to release, docs go
out at best quality with the beta release. The editors-track read was deferred, not skipped,
after a first-contact question about missing images and diagrams; prose written to stand alone
without a picture needs rewriting, not illustrating. Research banked at
`docs/internal/record/2026-08-15-docs-visual-practice-research.md`; the rulings at
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md`.

The diagram-pages pass merged 2026-08-16 (`817d155a`): eleven mermaid diagrams across ten
pages, nine page rewrites, and the `check:visuals` gate, reviewed by eleven register-editor
fan-outs. The capture pass ran 2026-08-17 (plan and post-mortems:
`docs/superpowers/plans/2026-08-16-capture-pass.md`); transcript fixtures now exist and both
admin pages quote them. The admin-screen reference capture (2026-08-15) banked 44 captures under
`docs/internal/reference-captures/2026-08-15-admin-screens/`, internal-only and excluded from
the npm `files` whitelist.

`cairn-pub` branch `pass-d-docs-tracks` pushed 2026-08-15: 81 prerendered pages, zero broken
links, a clean rebuild against a packed tarball. It was deliberately left unmerged until release
one shipped the docs-restructure payload its build depends on (now satisfied, see the
2026-08-20 release entry above). Its own open item, not yet resolved: the `cairn-cms` GitHub App
installation does not cover `glw907/cairn-pub`, needing Geoff in a browser at the App's own
installation settings.

The `.gitignore` scaffold defect (npm's packlist strips any file literally named `.gitignore`
from a tarball, wherever it sits) was fixed 2026-08-15: `bakeForPacking()` stores it dot-free,
`scaffold.mjs` renames it back in the scaffolded site, proven red-then-green plus an end-to-end
`npm pack`.

## 2026-08-20: nine hand-credential chores, six done or ruled closed

A standing operational list, independent of any pass. Closed by Geoff's ruling rather than
action: the Advanced Certificate Manager line item (copy hedges instead, with a test pinning
the hedge) and the estate Cloudflare token exposure (screen was secured, nobody reached it).
Torn down and verified by listing: the capture-pass scratch estate (repo, worker, two D1
databases, R2 bucket, local state, wrangler session), all 2026-08-17. `TEMPLATE_REPO_TOKEN` is
no longer owed, since the 2026-08-20 template move deleted the sync that needed it. Still open
as of this date, none urgent: delete GitHub Apps `cairn-t4b-live-03cd31`, `cairn-t5-scratch`
(id `4585219`), and `cairn-cairn-capture-scratch` (three Apps total); revoke the T4c spike API
token `d07b2a25f05151591830c45053186979` and remove its local config files; revoke three
Cloudflare API tokens named for `create-cairn-site` at dash.cloudflare.com/profile/api-tokens;
confirm the Workers Paid opt-in taken at T5 run 2; 907-life's push-to-deploy has been broken
since 2026-07-14 (`ROADMAP.md` line on the build-token risk).

## Earlier (2026-05 through 2026-08-14): the rebuild, `create-cairn-site`, and the pre-visual window

The numbered rebuild plans (00 through 08) landed and merged to `main`; stable `0.6.0` shipped
and both original sites ran it. The whole `create-cairn-site` initiative (T1 through T5)
shipped as history, each pass's post-mortem holding the detail; the T4c live spike record
(`docs/internal/record/2026-08-12-t4c-builds-spike.md`) is the fixture source for every Builds
fake body and carries its teardown table. Pass D, the release-debt engine pass, closed
2026-08-14.

By this point every carry-forward defect STATUS had tracked by hand (admin error statuses
flattening to HTTP 200 under the streamed pending count, upstream `sveltejs/kit#12987`; the
SvelteKit `checkOrigin` deprecation; engine-rendered markup depending on classes Tailwind may
never emit; the `/admin/help` first-steps card overlap; the `sideEffects` coverage gate) had
already been filed into `ROADMAP.md` with its own entry and trigger, so this ledger does not
duplicate them; `ROADMAP.md` is their live home.

Superseded `STATUS-archive-*.md` files, oldest first, all still live under
`docs/internal/history/`:

- `STATUS-archive-2026-05-to-2026-07.md`: pre-standalone-repo history.
- `STATUS-archive-2026-07-02-to-2026-07-16.md`
- `STATUS-archive-2026-07-17-to-2026-07-18.md`: the `cairn.pub` step-5 launch and the Waymark
  final-review entries.
- `STATUS-archive-2026-07-19-to-2026-07-20.md`: the chassis-nav pass and the `0.88.3` safelist
  publish.
- `STATUS-archive-2026-07-21-to-2026-07-28.md`: design-infrastructure Passes 1 and 2, the
  `0.89.x` and `0.90.x` publishes, the admin-toolkit organization pass.
- `STATUS-archive-2026-07-29-to-2026-08-01.md`: the `0.91.0` publish, the `0.91.1` hotfix and
  ASC harvest fold, the `0.92.0` design-ratchet minor, the xcathletes seams pass.
- `STATUS-archive-2026-08-02-to-2026-08-03.md`: the C1 seam-shape pass, the refusal-channel
  convergence, the C2 window before merging.
- `STATUS-archive-2026-08-04-to-2026-08-05.md`: the auth-channel window, the AI-posture pass, up
  to the `0.94.0-rc.1` cut.
- `STATUS-archive-2026-08-06-to-2026-08-07.md`: the rc.2 cut, the ASC end-to-end verification,
  the RC window to the stable `0.94.0` cut.
- `STATUS-archive-2026-08-08.md`: the stable `0.94.0` window, ASC's adoption, the
  vertical-alignment pass.
- `STATUS-archive-2026-08-09-to-2026-08-11.md`: the T1 completion, the docs-refactor pass-start,
  the T3-built entries.
- `STATUS-archive-2026-08-12-t4b1-close.md`, `STATUS-archive-2026-08-12-t4c-planned.md`: the
  T4b.1 close; the state T4c's execution session started from.
- `STATUS-archive-2026-08-13-t5-task8-close.md`, `STATUS-archive-2026-08-13-t4d-close.md`: the
  T5 Task 8 live-e2e close and the T5a split; the T4d close with the live-proof and teardown
  record.
- `STATUS-archive-2026-08-14-pass-d.md`: Pass D's planning entry, its Phase 1 close, its
  Phase 3 start, and the production-gate failure that blocked Phase 3 until its fold landed.

## Registry housekeeping, not yet acted on

A stale `rc` dist-tag still points at `0.6.0-rc.1` from the pre-rebuild era, so
`npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses `next`, so `rc`
should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an outward-facing
registry change nobody asked for.
