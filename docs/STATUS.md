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


## Immediate next action (2026-08-18: seam Pass 2 SPLIT; its Task B0 is CLOSED and MERGED)

**The reproduction seam now contains what it mounts, and that half is on `main`** (commits
`f252bf71` and `9ce23df2`, merged). Plan and all three post-mortems:
`docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`.

**Pass 2 was split at the B0/B1 boundary (Geoff, 2026-08-18).** B0 was owed before the `/repro`
route could ship and had to merge to `main` before B1 could pack a tarball from it, so it closed as
its own pass. **B1 through B5, the cairn-pub delivery half, are the next pass.**

**Immediate next action: the seam's delivery half, in a different repo.** Launch prompt, a fresh
Opus 5 session from `~/Projects/cairn-pub`: "Execute Tasks B1 through B5 of the live-reproduction
seam plan, cairn-cms `docs/superpowers/plans/2026-08-15-live-reproduction-seam-plan.md`. Read that
plan's Task B0 post-mortem first: it changes B3's acceptance criteria and adds a third cairn-pub
spec amendment."

**BRANCH TOPOLOGY, the thing a cold session gets wrong by default.** That pass runs in
`~/Projects/cairn-pub` on the existing branch `pass-d-docs-tracks`, NOT in this repo and not off a
fresh branch. It consumes the engine through a packed tarball (`npm pack` plus a `file:` pin), which
is Task B1's whole job, because the registry's published `0.95.0-rc.1` predates all of this and
carries no `reproductions` subpath at all. Run the one-executor check there first
(`pgrep -f cairn-pub`, warm `git status`).

**What B0 shipped.** Containment lives in `ReproContext`, registered from the instance body so it is
in place before any child's mount effect runs, and holding from first paint rather than after a
pose, which the engine does not run. Three mechanisms: an `inert` `display: contents` wrapper over
all 25 stories; a capture-phase `focusin` firewall marking an opening modal dialog `inert`, since a
modal escapes an ancestor's inertness by design; and a window capture firewall over `keydown`,
`pointerdown`, `dragover`, `drop`, and `beforeunload`, with `preventDefault` on the two drag types
only. No admin component was edited and nothing new was exported. A second commit hedged
`create-cairn-site`'s cost total on Geoff's ruling, which **cleared the last live finding in the
friction log**.

**Three things the B1-B5 pass is owed, and the first one grew.**

1. **THREE cairn-pub spec amendments, not the two previously recorded here.** The route's
   responsibility clause ("marks the mounted content `inert` after any pose completes") is now false
   in both halves, since the engine does it and it does not wait for a pose. The gate-1 bullet still
   reads "`width` one of the two listed values" while the fence-body table lists three and the
   implemented rule enumerates none. And the focus-restore obligation below is new.
2. **The route applies no containment of its own, and owns one repair the engine cannot make.**
   B3's acceptance changes from "applies `inert` after the pose" to "applies none, because the
   content is contained at first paint." Measured across Chromium, Firefox, and WebKit at B0's review
   gate: a frame that loads and focuses a control takes the reader's focus, and NO host-side `iframe`
   attribute prevents it. Geoff ruled the mitigation: the embedding page records
   `document.activeElement` before the frame loads and restores it after. B5's probe verifies it.
3. `check:visuals` still runs `npm run package` itself, a third redundant rebuild in `test.yml`
   where `check:package` and `check:surface` already package before it. Correctness unaffected; a
   later pass may dedupe.

**Four accessibility findings from B0's review gate are filed to `ROADMAP.md`'s Now tier**, each
with a real trigger rather than a someday note. Two of them trigger on this next pass: the iframe
should carry `role="img"` rather than being announced as an enterable frame containing nothing, and
marker chips must render inside `[data-cairn-picture]` or they become the only accessibility-tree
content in the frame.

**Gate state at the close.** Every PR-gating workflow re-derived with `grep -l pull_request` rather
than recalled: five workflows, every `check:*` target they invoke run by name, including the four
CI-only gates. `npm run check` 0/0 across 1634 files; full suite 425 files, 5625 tests, exit 0;
`packages/create-cairn-site` 827 tests, exit 0. `norms:check` ran post-merge on `main` against a
live showcase preview and reports the manifest fresh; **it cannot run in a worktree**, where the
showcase's symlinked `node_modules` resolves `main`'s engine and would prove the wrong thing.
`CHANGELOG.md`'s `## Unreleased` window carries this pass; no version bump, no publish.

**The `repro-containment` worktree is merged and pruned.** Nothing branches from it.

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

**The transcript-fixtures question, carried here since 2026-08-15 as resolved in the negative,
is now resolved in the positive (2026-08-17).** The capture pass ran; the fixtures exist and both
admin pages quote them. The editors track stays blocked on the live-reproduction seam, unchanged:
reproduction content is decided by the render (fixture data, crop, widths), not by an authorable
source, so writing it now would mean writing it twice.

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
project, added the fixture-asset route, and declared the pass split). **The capture pass ran
2026-08-17 and is history** (plan and post-mortems:
`docs/superpowers/plans/2026-08-16-capture-pass.md`; the brief it ran from is
`docs/internal/record/2026-08-15-capture-pass-brief.md`). What remains: the seam build (two
passes, plan above) -> the editors rewrite -> the editors read -> release one -> the three-site
walk -> P.** The seam build Pass 1 is the immediate next action; its launch prompt and its
warm-worktree precondition are at the top of this doc.

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

**TEN outstanding, one urgent.** (The former item 11, a browser glance at the Advanced Certificate Manager line item, is CLOSED 2026-08-18: Geoff ruled the copy hedges instead, so `money.mjs` and two admin pages now scope the total to the two confirmed figures and disclose the open item, with a test pinning the hedge. The friction log holds no live finding.) (1) **URGENT: rotate the estate
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

**Carry-forwards (the tool initiative). AUDITED ONE BY ONE 2026-08-18 against the code, not against
these sentences.** Three are hereby dropped rather than carried a sixth window, each checked and
judged not worth filing: (3) `packages/create-cairn-site` having neither a comment nor a type gate
(the package is plain JS by design, its own suite is the real gate, and no pass has reported a defect
slipping through), (4) the `paid-plan-missing` mapping keyed on entitlement wording (the call site's
docstring and its test name both already state the risk and the reason), and (6) the root `CLAUDE.md`
context-headroom note (housekeeping, outside any tracking doc's charter). Of the rest, (1) and (2)
moved to `ROADMAP.md` with real triggers, and (2) grew: four published assertions across two extend
pages state a commit attribution that live commits disprove, which the carry-forward's source-comment
scope never covered. **The dropped three are gone from the list below, which the 2026-08-18 entry declared and then
contradicted by relisting them** (found and fixed at the B0 close; the friction log's own closing
paragraph had asked for exactly this). The remainder stand as written, renumbered:
(1) An externally registered domain still owes the branches the scratch domain cannot reach.
(2) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(3) The deferred defect list per the T4a spec's ruling 2. (4) `--yes` with `CAIRN_CF_API_TOKEN`
equal to a saved token that fails validation throws rather than re-validating, a deliberate
narrowing. (5) `runStep` exists as an identical one-liner in four modules; the hoist is right but
is a cross-cutting refactor of pre-existing code. (6) A first `--yes` run cannot reach
`builds-live`, since the reconcile hash gate has no prior hash. (7) The bake couples the template's
installability to the publish window. (8) No gate proves a scaffold against the registry. (9) The
console scenario is mirrored in `test/console-hold.test.mjs` and
`.github/workflows/create-site.yml` with nothing linking them. (10) No spawned-child test covers
the pre-first-probe interrupt window. **CLOSED by
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

**The seam worktree `.claude/worktrees/repro-seam` is MERGED (`bd716ac7`) and can be pruned.**
Nothing branches from it. Pass 2 does not run here at all; it runs in `~/Projects/cairn-pub` on
`pass-d-docs-tracks`.

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
