# cairn-cms status

The rolling status for the cairn-cms engine: where the work is now, what is next, and the open
decisions. The `cairn-pass` skill reads this at pass-start and updates it at pass-end. Durable
orientation is this repo's `CLAUDE.md`. Locked architecture decisions and the test plan are in
the functional spec (`docs/superpowers/specs/2026-05-28-cairn-rebuild-functional-spec.md`).
Per-plan detail lives in each plan's post-mortem under `docs/superpowers/plans/`. This doc holds
ONLY the current entry; a superseded entry moves to the archives under `docs/internal/history/`
(see the Archives section at the end of this file),
never accumulates here.

**Standalone repo (2026-06-04).** cairn-cms now lives at `~/Projects/cairn-cms` as a standalone repo.
Its consumer sites (ecnordic-ski, 907-life) install `@glw907/cairn-cms` from the npm registry by
version range. The old `~/Projects/cairn/` meta-workspace and its symlink-dev loop are retired, and the
library's own development proves changes against `examples/showcase`.


## Immediate next action (2026-08-17: the capture pass, PART A COMPLETE, Part B next)

**Part A is complete and verified (2026-08-17); the fixtures exist.** Six captures plus their
README are committed at `packages/create-cairn-site/test/fixtures/transcripts/` (`8d9871eb`),
and every scratch resource is torn down and confirmed gone by listing (`c1aef442`). The live
run took four invocations to reach a live site, and the README accounts for all of them; the
short version is that a first run cannot succeed with a GitHub App installed on "Only select
repositories" (it creates the repository itself, so there is nothing to select yet), and the
resume then refuses a repository it created rather than adopting it. Both are filed in the
friction log for ROADMAP triage at B4, alongside the scaffold's placeholder from-address.

**Which fixture carries which block, correcting the plan.** The plan assumed one capture, so
B1's block list points at `01-create-cairn-site.txt` throughout. That holds for the cost
preamble and the GitHub App prompt, which print before anything can fail and so are identical
to a happy run's bytes. **It does not hold for the deploy summary and the live address, which
live in `01d-resume.txt`**, the invocation that reached `printLiveInfo`. B2's doctor block
quotes `03-doctor-credentialed.txt` as planned (8 passed, 3 failed, 8 skipped, all three line
types in one report). `01b-resume.txt`, `01c-resume.txt`, and `02-doctor-bare.txt` are the
deliberately-unconsumed list the README declares and `check:transcripts` must accept as their
citation. No A4 interrupt-resume fixture was captured, so B4 files no ROADMAP line for one.

**One B2 premise is now confirmed by real output:** the credentialed report shows
`PASS Framework CSRF handoff`, so `docs/reference/doctor.md`'s claim that `config.csrf-disable`
skips on every scaffold is false exactly as B2 assumes, and the correction can cite the fixture.

**Immediate next action: Part B** (Tasks B1 through B4 of
`docs/superpowers/plans/2026-08-16-capture-pass.md`), on a feature worktree off `main`,
dispatching each task to `cairn-implementer` per the `cairn-pass` skill, the main loop
reviewing each diff and confirming the full gate between dispatches. Part A needed no worktree
because it only added fixtures; Part B changes pages and adds a gate, so it takes one. Launch
from `~/Projects/cairn-cms` in a fresh Opus 5 session.

**A0b, now history.** Both packages are on the registry at
`0.95.0-rc.1` under the `next` dist-tag: the engine published over OIDC via a
`workflow_dispatch` of `publish.yml` (run green; `sync-template-repo` self-skipped on the
non-release event as designed), and `@glw907/cairn-cms-dev` made its first-ever publish by
hand (npm cannot bind a trusted publisher to a nonexistent package). Its trusted publisher is
now configured (id `5bc9f6a9-a653-4ed2-9d42-5c17a8f496da`, repo `glw907/cairn-cms`, workflow
`publish.yml`, publish allowed), and `publish.yml` gained a `publish-dev` job with an
already-published guard, so every future cut carries both packages over OIDC with no
credential anywhere. Engine `latest` is untouched at `0.94.0`; the published tarball carries
`previewLoad`/`PreviewBanner` (verified by listing). Tag `v0.95.0-rc.1` is pushed. Acceptance
per the plan: met in full. One recorded quirk: the dev package's `latest` also points at the
rc, because a FIRST publish sets `latest` regardless of `--tag`; harmless (nothing installs it
bare, the scaffold pins the caret-rc) and self-healing at the first stable cut. The npm login
session was logged out after the cut; nothing on this machine holds an npm credential.

The bake's DEFAULT specs resolve to `^0.95.0-rc.1` for both packages, so Part A's explicit
`--engine-spec`/`--dev-spec` flags were belt-and-braces rather than load-bearing.

**Owed at the pass close (Task B4), not now:** the `code-simplifier` pass over this window's
changed code (the bake test, the `publish-dev` job), alongside everything B4 already lists.

**The pass context:** execute the capture pass
(`docs/superpowers/plans/2026-08-16-capture-pass.md`), in a fresh Opus 5 session launched
from `~/Projects/cairn-cms`, per the `cairn-pass` skill. **Geoff's 2026-08-16 call moved this
pass ahead of seam Pass 1** (his attended availability plus the publish ruling below); Task
B4 of the plan restores the seam pointer when the pass closes. Order inside the pass: Task
A0b first, a deliberate `--tag next` prerelease cut of the engine window plus the first
`@glw907/cairn-cms-dev` publish via `cairn-release` (Geoff's F1 ruling: publish so the
registry carries `previewLoad`/`PreviewBanner`, then capture; `latest` never moves and
release one stays behind the visual layer). Then Part A, the attended capture run (Geoff
present; four browser moments), then Part B on a worktree off `main`. The plan was
adversarially reviewed 2026-08-16 (three Opus lenses; two blockers found and folded,
including the registry-install blocker that forced the publish ruling). Seam Pass 1
(`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`) runs next after this
pass, per the queue below.

**Pass D, the documentation reset, is complete across all three phases.** Phase 1 (PR #34) and
Phase 2 (PR #35) merged earlier; Phase 3 (Tasks 9 through 14) closes the pass. The published
corpus is now four audience tracks, counted as files including each arm's index:
`docs/admin/` at 8, `docs/editors/` at 8, `docs/extend/` at 31, and the kept `docs/reference/`
arm at 24 (its 23 pages plus the index), alongside `docs/why-cairn.md` and the rewritten front
doors. The old guides, tutorial, and explanation arms are deleted, every
published path redirected, and every gate in the cutover bill rewired and proven red once.
Plan and post-mortem: `docs/superpowers/plans/2026-08-14-pass-d-docs-reset.md`.

**The Task 13 production gate ran all five stages and its findings are folded.** 118 findings:
114 folded as CONFIRMED or NARROWED, 3 refuted, 1 with no owning fold (its target is outside
this repo). Three routed to `ROADMAP.md` as engine or cross-repo fixes rather than docs fixes.
The four blind persona walks all failed their first run, which was the gate's highest-value
result, and each failure is fixed in its own track: the editors track now says where the sign-in
page is, `is-it-working.md` separates the checks an admin can run from the ones nobody can,
`restrict-admin-access` states the roles precondition `defineAccess` needs, and the reference arm
settles which config key names the code actually uses. Record with per-finding dispositions:
`docs/internal/record/2026-08-14-pass-d-task-13-production-gate.md`.

**One lesson from the close worth carrying, since it cost a whole extra round.** Two fold agents
reported completion for nine CONFIRMED or NARROWED findings they never applied, and the close-out
caught it only by grepping the tree for each finding's quoted text instead of reading the fold
reports. All nine are folded and grep-verified now. **A fold report is a claim; confirming a fold
landed costs one grep against the text the finding said was there.** The re-fold dispatches
carried that proof requirement, and `ROADMAP.md` keeps the caution rather than the work.

### The visual layer runs before release one (Geoff, 2026-08-15)

**The editors-track read is deferred, not skipped (Geoff, 2026-08-15).** On first contact with the
finished track he asked why the docs carry no images or diagrams, and the answer changes the pages
themselves rather than adding to them: the corpus ships zero visuals, the screenshot half was a
real ruling whose live-reproduction replacement was never built, and the diagram half was never
decided at all (eight diagrams went out with the deleted arms). **Prose written to stand alone
without a picture is substantially different prose**, so pages like
`write-in-the-editor.md`'s `## The screen`, which is a screenshot rendered in words, get rewritten
and shortened rather than illustrated. Reading the track closely now would grade prose that is
expected to change. The full finding, the evidence, and what the decision owes are the
visual-layer entry at the top of `ROADMAP.md`'s Now tier.

**The sitting's research is done and banked (2026-08-15, Opus 5 session).** Eight readers ran
the three-tier brief; the findings, with the cross-cutting synthesis and Geoff's added
polish constraint (diagrams carry understated professional polish, never stock-theme output),
are at `docs/internal/record/2026-08-15-docs-visual-practice-research.md`. Headlines: the
live-reproduction and transcript vocabularies are strongly confirmed; the extend track's
"mermaid-first at density" default is pressured (Astro ships one diagram in 418 pages and
zero mermaid; only Kubernetes is diagram-rich, with a caption mandate); no standard,
platform, or style guide binds diagram legibility at 320px, and WCAG explicitly exempts
diagrams from reflow. The Fable sitting now rules rather than researches.

**The Fable sitting ran and ruled (2026-08-15).** The rulings are banked at
`docs/internal/record/2026-08-15-docs-visual-layer-rulings.md` and the ROADMAP Now entry
summarizes them: the 320/390 bar released for authored diagrams (containment plus a complexity
budget plus a two-part text alternative replace it), themed mermaid with a designed cairn diagram
theme built first, the diagram inventory re-tested from seventeen down to twelve, a gated
alt-and-caption standard, motion out by decision (trigger filed in Later), and numbered
callouts with keyed lists for the three locate-many-controls screens. The per-page contracts in
`2026-08-15-docs-outlines-with-visuals.md` stand as amended by those rulings.

**The diagram-pages pass is MERGED (2026-08-16, merge `817d155a`).** Branch
`docs-diagram-pages`: the eleven mermaid diagrams across ten pages, the nine page rewrites
(plus `configure-rendering.md`'s link), and the `check:visuals` gate, all reviewed on the
branch by the eleven `cairn-register-editor` fan-outs and the must-survive sweep. The merge
gate ran in full in themed cairn-pub: tarball-installed branch payload, full-page reads of all
ten diagram pages in both schemes, the end-to-end accessibility proof (the SVG's computed name
is the authored `accTitle`, its description the authored `accDescr`), the containment probe
green with the gantt holding its date axis at 320/390 (so its caption's placeholder-axis
clause stays), and Geoff's before/after on the two marquee diagrams (approved; his one
finding, cluster-title spacing, fixed as cairn-pub `d4e7575`). Merge hygiene re-verified the
full must-survive set and the four code-derived diagrams against current `main`, and
regenerated the scaffold tree from a fresh bake (the `.gitignore` packlist fix has landed, so
the page's kept dotfile entries are real). Post-merge full gate green on `main`: svelte-check
0/0, every doc gate including the four CI-only checks, 5322 tests exit 0. Post-mortem in the
plan file: `docs/superpowers/plans/2026-08-15-docs-diagram-pages-pass.md`. The theme-side
mechanic the gate surfaced (post-measurement metric drift in mermaid HTML labels) is filed at
`docs/internal/record/2026-08-16-diagram-theme-harvest-findings.md`; its fixes live in
cairn-pub (`eae4033`, `d4e7575`).

**The transcript-fixtures question is resolved, in the negative (2026-08-15).** No consumable
recorded-run fixtures exist anywhere in the repo; the T-series stdout lives uncommitted in
`~/Projects/cairn-scratch/`, and no `cairn-doctor` report was ever captured at all. So
`create-your-site.md` and `is-it-working.md` wait for a dedicated **capture pass** (a fresh
end-to-end `create-cairn-site` run plus a doctor run against the deployed result, stdout
committed as fixtures), which costs real Cloudflare resources and GitHub App browser moments
and therefore **needs scheduling with Geoff**. Each page rewrites once, so the setup-journey
diagram rides that pass too. Full evidence in the ROADMAP transcript-gate entry. The editors
track stays blocked on the live-reproduction seam: reproduction content is decided by the
render (fixture data, crop, widths), not by an authorable source, so writing it now would mean
writing it twice.

**The admin-screen reference capture is banked (2026-08-15).** The sitting ended by capturing
the real admin screens as writer-facing reference material for the editors rewrite and the seam
work. The run was cut short twice, first by a transient connection error and then by the laptop
losing power, and the recovery session re-ran it clean. The set is 44 captures under
`docs/internal/reference-captures/2026-08-15-admin-screens/` (1440 and 390, light plus two dark
states, one capture per editors-track visual contract), with `.capture-state.json` recording
each capture's page contract and posed state, zero gaps. The one-off driver is
`examples/showcase/scripts/reference-capture.mjs`; it stays in-tree until the editors rewrite
consumes the set, then gets deleted per its own header. This is internal reference only: the
npm `files` whitelist excludes `docs/internal`, so none of it ships.

**Geoff ruled the sequencing (2026-08-15): release one waits for the visual layer.** There is no
hurry to release, and the docs go out at best quality with the beta release. The visual work runs
first, in the rulings record's order (the cairn diagram theme in cairn-pub, then the extend and
admin diagrams with their gates, then the live-reproduction seam, then the editors rewrite), then
the deferred editors-track read happens against the rewritten pages, then release one is cut. The
same-cut obligations and the `.gitignore` defect are unchanged and wait with the cut. **The beta
framing carries two standing items if release one is that beta:** the `Consumers must:`
parseable-changelog API is filed to land before the beta (Geoff's own call, per the ROADMAP), and
the churn-free-until-beta era closes with it; confirm both ride the release-one bill when the cut
is planned.

**When the read does happen**, record it here as a line reading `Editors-track read: done <date>`,
immediately below this paragraph, before `cairn-release` is invoked. No agent pass substitutes for
it; a cold session that finds no such line treats the read as outstanding and stops, rather than
re-asking or standing in for it.

**Release one is cut directly from `main`**, which is where this doc and the whole window now
live; the `cairn-release` skill needs no worktree of its own, unlike a development pass. **Then
invoke `cairn-release`**, verifying the next number is free first
(`npm view @glw907/cairn-cms versions --json`; numbers are immutable). Release one rolls this
window plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs
reset. **Its same-cut obligations, all four in one publish**, so no shipped page describes
tooling that is not installable: the engine window, `create-cairn-site`,
`@glw907/cairn-cms-dev`, and the template repo, plus T5a' (the public repo, the first sync, the
button spike, the C3 check). Task 7's staged button block consumes the button spike.

**The `.gitignore` scaffold defect is FIXED (2026-08-15).** npm's packlist strips any file
literally named `.gitignore` from a tarball wherever it sits, so the bake now stores it dot-free
(`gitignore`) via a new `bakeForPacking()` (the `prepack` entry point; plain `bake()` stays
dotted for `sync-template-repo.mjs`'s git-publish overlay), and `scaffold.mjs` renames it back
in the scaffolded site, fail-loud in both directions. Red-then-green tests plus an end-to-end
`npm pack` proof; changelog entry under Unreleased. This also clears the capture pass's tool
prerequisite.

Queue (reordered on Geoff's 2026-08-15 parallelization call): **the diagram-pages pass and the
cairn-pub theme both LANDED: the pass merged here 2026-08-16 (`817d155a`), and the theme holds
on cairn-pub's `pass-d-docs-tracks` for the site walk after release one. The seam DESIGN
sitting ran 2026-08-15 and is DONE:** the spec is ratified at cairn-pub
`docs/superpowers/specs/2026-08-15-live-reproduction-seam-design.md` (branch
`pass-d-docs-tracks`, pushed) and the two-pass implementation plan at
`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md` (this repo, `main`). Both
survived a 20-plus-agent adversarial review each (spec: 16 verified findings folded, 0 refuted,
which moved fence delivery to the rehype stage past the sanitize floor and made posing the rule;
plan: 16 verified folded, 0 refuted, which relocated the mount tests to the browser vitest
project, added the fixture-asset route, and declared the pass split). The capture pass runs as
soon as Geoff schedules his attended run (brief and protocol:
`docs/internal/record/2026-08-15-capture-pass-brief.md`; its tool prerequisite, the `.gitignore`
fix, is done). Then: the seam build (two passes, plan above) -> the editors rewrite -> the
editors read -> release one -> the three-site walk -> P.** Launch prompt for the seam build
Pass 1, a fresh Opus 5 session (its `docs-diagram-pages` merge precondition landed
2026-08-16), from `~/Projects/cairn-cms`: "Execute Pass 1 of
the live-reproduction seam plan, docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md,
per the cairn-pass skill."

### cairn-pub is PREPARED and deliberately not merged

Branch `pass-d-docs-tracks` in `~/Projects/cairn-pub`, **pushed to origin as of 2026-08-15**
(Geoff's push instruction at the seam sitting close supersedes plan ruling 3's never-push;
the branch now also carries the seam spec, and the merge gate below is unchanged). Proven against a packed tarball: 81 prerendered pages, zero broken links, a
clean rebuild. **The site walk merges it after release one**, and the ordering is forced rather
than a preference: that branch reads the docs payload out of its installed
`@glw907/cairn-cms`, and the published `0.94.0-rc.1` predates the restructure, so a build against
the registry fails on the pages the restructure added until release one ships the new payload. It also fixed a defect the rebuild
introduced there: the reference index's new "also for site admins" grouping relists three pages
and the loader walked every bullet list, so the second occurrence won the prev/next map. Its
link policy is a build-time throw.

### Hand steps for Geoff, independent of the queue above

These are not gated on release one, the site walk, or each other. Item (1) in particular should be
actioned now rather than batched with the rest; it is listed first because it is a live credential
exposure, not because it is first in any sequence.

**TEN outstanding, one urgent.** (1) **URGENT: rotate the estate
Cloudflare token** (`Cloudflare Admin 2026-07`), leaked into a transcript and still active; mint
a replacement, run `~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, delete the
old one. (2) Delete the GitHub App `cairn-t4b-live-03cd31`. (3) Revoke the T4c spike API token
`d07b2a25f05151591830c45053186979`, then `rm -f ~/.config/cairn/t4c-spike-token
~/.config/cairn/store-t4c-token.sh`. (4) 907-life's push-to-deploy has been broken since
2026-07-14. (5) Mint the fine-grained `TEMPLATE_REPO_TOKEN` PAT at release one. (6) The button
spike's browser moment, owed at release one with T5a'. (7) Delete the GitHub App
`cairn-t5-scratch` (id 4585219), which uninstalls installation 153531337 with it; with (2) and
(10) the ledger stands at three Apps awaiting deletion. (8) Revoke three Cloudflare API tokens at
dash.cloudflare.com/profile/api-tokens, all named for `create-cairn-site`: T5 run 1's five-key
token, T5 run 2's eight-key token, and the eight-key token minted 2026-08-13 for T4d's live proof
and teardown. (9) Check the Workers Paid opt-in taken at T5 run 2's prompt, in case the account
was not already on it via 907-life. (10) Delete the GitHub App `cairn-cairn-capture-scratch`,
created 2026-08-17 by the capture pass on the personal account, which uninstalls its
installation with it; this is the THIRD App awaiting hand-deletion.

**Capture-pass scratch estate (2026-08-17), torn down in-session at Task A6, not by hand.** The
GitHub repository `glw907/cairn-capture-scratch`; the worker `cairn-capture-scratch`; D1
`cairn-capture-scratch-auth` (`e8e4e453-25bc-4f26-a427-680211fa7623`) and
`cairn-capture-scratch-app` (`7acae31b-366a-496c-a8e1-38c352770b1d`); R2 bucket
`cairn-capture-scratch-media`; the local state record
`~/.config/cairn/sites/cairn-capture-scratch-e9ad36.json`; and the wrangler OAuth session.
**TORN DOWN AND VERIFIED BY LISTING, 2026-08-17.** Worker, both databases, bucket, and
repository all confirmed gone; the state record is deleted and wrangler is logged out
(`wrangler whoami` reports not authenticated). Only the App above needs Geoff. **No doctor
token was minted**, so none is owed: the credentialed report's output is identical under any
token (its zone checks fail because `showcase.test` exists nowhere, and its D1 checks skip
structurally), so the run reused the existing account token rather than minting and revoking
one for no change in bytes.

**Carry-forwards (the tool initiative), verified against this list, not a remembered one.**
(1) An externally registered domain still owes the branches the scratch domain cannot reach.
(2) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(3) `check:comments` and the root type-check cover `src/lib` only, so `packages/create-cairn-site`
has neither a comment gate nor a type gate; its own `npm test` is the real gate. (4) The
`paid-plan-missing` mapping keys on entitlement wording rather than a code. (5) The deferred
defect list per the T4a spec's ruling 2. (6) Root `CLAUDE.md` has no context headroom left; the
next addition there must trim first. (7) `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved token
that fails validation throws rather than re-validating, a deliberate narrowing. (8) `runStep`
exists as an identical one-liner in four modules; the hoist is right but is a cross-cutting
refactor of pre-existing code. (9) A first `--yes` run cannot reach `builds-live`, since the
reconcile hash gate has no prior hash. (10) The bake couples the template's installability to the
publish window. (11) No gate proves a scaffold against the registry. (12) The console scenario is
mirrored in `test/console-hold.test.mjs` and `.github/workflows/create-site.yml` with nothing
linking them. (13) No spawned-child test covers the pre-first-probe interrupt window. **CLOSED by
Pass D:** the browser-moment counts (the admin track's domain page states them) and the
umbrella's resume table (now `docs/admin/setup-recovery.md`).

## Standing state (release ordering, consumers, open items, carry-forwards)

**The whole `create-cairn-site` initiative is shipped history**, T4a through T4d plus T5: the
detail lives in each plan's post-mortem and the archived entries. The T4c live spike at
`docs/internal/record/2026-08-12-t4c-builds-spike.md` stays the fixture source for every Builds
fake body and carries its teardown table. Pass D is now history too, on the same terms; the
entry above holds what release one still needs from it.

**Release one is the next cut, now waiting behind the visual layer** (Geoff, 2026-08-15; the
2026-08-09 ordering otherwise stands). The entry above carries the same-cut obligations and the
one human read still owed.

**cairn-pub's open item, not yet resolved:** the `cairn-cms` GitHub App installation does not
carry `glw907/cairn-pub`, so a save or publish on that site cannot commit. Adding a repository to
an App installation needs a token that can modify the App (the `gh` OAuth token and the stored bot
PAT both refuse), which needs Geoff, in a browser, at the App's own installation settings.

**One registry loose end, not acted on.** A stale `rc` dist-tag still points at `0.6.0-rc.1` from
the pre-rebuild era, so `npm install @glw907/cairn-cms@rc` serves something ancient. The scheme uses
`next`, so `rc` should be removed (`npm dist-tag rm @glw907/cairn-cms rc`). Left alone as an
outward-facing registry change nobody asked for.

**A watch routine is live** for the two external AI-crawler triggers: `trig_01SLdXarWCJX2LD2FB8b3Dqk`,
monthly on the 1st, first run 2026-09-01, emailing only when a condition trips. It watches Cloudflare's
2026-09-15 crawler-default change and the crawler table's staleness. **It carries a correction to the
plan:** whether that change reaches backward into zones with an existing configuration is genuinely
ambiguous in Cloudflare's own post, which the ROADMAP had asserted as settled fact.

**FOUR consumer sites.** ASC is current on `^0.94.0`; the other three sit on their own `0.x`
carets and move only by migration (a caret admits only its own minor in `0.x`), which waits for
release one per the ordering above:

| Repo | Range | Behind |
|---|---|---|
| `907-life` | `^0.84.4` | 0.85 through 0.93, plus this window |
| `cairn-pub` | `0.94.0-rc.1` (pinned exact) | this window only. **Corrected 2026-08-14 at Pass D Task 12**, which found this row claiming `^0.87.4`: a prior pass already landed the full upgrade, so the six-minor gap this table asserted does not exist. The `Consumers must:` work is done, blocked only on the GitHub App item above |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site.** It is current on the engine, pinned at
`0.94.0-rc.1`; what it is behind on is the docs restructure, which its prepared
`pass-d-docs-tracks` branch carries and the site walk merges.

**A THIRD worktree exists and holds warm uncommitted work: `.claude/worktrees/repro-seam`**
(branch `live-repro-seam-pass1`, created 2026-08-16). It carries an early start on seam Pass 1
that the reordering stranded: `src/lib/reproductions/manifest.ts`, two unit tests, a 28K
`docs/internal/record/repro-story-audit.md`, and edits to `package.json` and `vitest.config.ts`,
none of it committed. No executor is running against it (`pgrep` clean as of the capture-pass
session). Leave it alone until seam Pass 1 starts, then treat it as that pass's starting point
rather than re-deriving; per the one-executor-per-worktree rule, warm uncommitted code is a
stop-and-investigate signal, so verify it against the plan before building on it.

**Two further worktrees survive the Pass D cleanup, and neither is live work.**
`.claude/worktrees/wayfinder-retheme-lab` and `.claude/worktrees/wayfinder-fixtures` hold
token-layer design experiments from 2026-07-02, left unmerged on purpose as a reference for a
later retheme. Nothing branches from them and no executor runs in them; the one-executor-per-worktree
check clears against them trivially. Every other worktree and every merged branch was pruned at the
Pass D close, so `main` plus these two is the whole local picture.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock. **One docs-rendering carry-forward retired here:** the section-index
breadcrumb duplication rode the old arm structure, so it re-verifies against the rebuilt cairn-pub
loader at the site walk rather than standing as a known defect. **The mermaid-legibility item is
moot for the wrong reason, and the reason is now the open item** (see the visual-layer entry in
`ROADMAP.md`): no published page carries a diagram because the rebuild deleted all eight along
with the arms that held them, not because anything was fixed.

## Archives

Superseded entries live under `docs/internal/history/`:
`STATUS-archive-2026-08-09-to-2026-08-11.md` (the T1 completion, docs-refactor pass-start, and T3-built entries),
`STATUS-archive-2026-05-to-2026-07.md`, `STATUS-archive-2026-07-02-to-2026-07-16.md`,
`STATUS-archive-2026-07-17-to-2026-07-18.md` (the cairn.pub step-5 launch and the Waymark
final-review entries), `STATUS-archive-2026-07-19-to-2026-07-20.md` (the chassis-nav pass and the
v0.88.3 safelist publish), `STATUS-archive-2026-07-21-to-2026-07-28.md` (design-infrastructure
Passes 1 and 2 phase by phase, the `0.89.x` and `0.90.x` publishes, and the admin-toolkit
organization pass), and `STATUS-archive-2026-07-29-to-2026-08-01.md` (the `0.91.0` publish, the
`0.91.1` hotfix and ASC harvest fold, the `0.92.0` design-ratchet minor, and the xcathletes seams
pass as planned).
The C1 seam-shape pass, the refusal-channel convergence, and the C2 window as it stood before
merging are in `STATUS-archive-2026-08-02-to-2026-08-03.md`. The auth-channel window and the
AI-posture pass, as STATUS carried them up to the `0.94.0-rc.1` cut, are in
`STATUS-archive-2026-08-04-to-2026-08-05.md`. The stable `0.94.0` window, ASC's adoption, and the
vertical-alignment pass as STATUS carried them are in `STATUS-archive-2026-08-08.md`. The T4b.1
close, T4b's delivery-unproven standing note, and the pre-merge urgency it carried are in
`STATUS-archive-2026-08-12-t4b1-close.md`. The rc.2 cut, the ASC end-to-end verification, and
the RC window as STATUS carried them to the stable `0.94.0` cut are in
`STATUS-archive-2026-08-06-to-2026-08-07.md`. The T4c-planned entry, the state its execution
session started from, is in `STATUS-archive-2026-08-12-t4c-planned.md`. The T5 Task 8 live-e2e
close, the T5a split record, and the state T4d's execution session started from are in
`STATUS-archive-2026-08-13-t5-task8-close.md`. The T4d close entry, with the live-proof and
teardown record as STATUS carried them to the Pass D planning sitting, is in
`STATUS-archive-2026-08-13-t4d-close.md`. The four entries Pass D itself ran through, the
planning entry, the Phase 1 close, the Phase 3 start, and the production-gate failure that
blocked Phase 3 until its fold landed, are in `STATUS-archive-2026-08-14-pass-d.md`.
