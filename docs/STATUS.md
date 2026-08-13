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

## Immediate next action (2026-08-13: T5a is BUILT and green; next is T4d, or Task 8's e2e when Geoff has a browser)

**T5a is complete on branch `t5-browser-door`**, in the worktree
`.claude/worktrees/t4c-builds-connect` (a T4c-era directory name; the branch is what matters),
cut from `origin/main` at `5ae9eeee`. **A cold session must `git fetch` first: the `main` ref in
the `~/Projects/cairn-cms` checkout is stale at `5a37c7cb` while `origin/main` is `5ae9eeee`.**
The branch is unmerged and unpushed. `package.json` is untouched, the runtime library is
untouched, and the changelog entry sits under `## Unreleased`.

**T5a is pushed and on draft PR #30**, with all five gating workflows running
(`scaffold`, `design`, `test`, `e2e`, `create-site`). **Note for anyone pushing a feature branch
here: a push alone runs nothing.** All five restrict their `push` trigger to `main` and
`rebuild`, so CI on a feature branch comes only from `pull_request`. The two workflow YAML files
this pass added have no local gate, so that PR is their first real validation, and the
`release: published` path stays unproven until release one.

**Two things are next and neither blocks the other.**

1. **Task 8, the live CLI e2e.** Still owed from T5, unaffected by the split, and the only T5
   hand step actionable today. It needs Geoff's browser for the fifth GitHub App's creation and
   the `reauthorize` OAuth trip. Running it before T4d is worth real money: T4d's brief was
   written assuming it inherits this estate.
2. **T4d, the localhost console.** Its brief is in
   `docs/superpowers/specs/2026-08-11-create-cairn-site-t4a-design.md`, amended 2026-08-13 with
   the correction below. **It needs a spec and a plan before execution, and that sitting belongs
   on Fable** per the model economy: the console is a UI surface whose open questions are taste
   (whether the delegation view polls or asks for a refresh; whether it retrofits the GitHub
   chapter's one-shot pages, which the research recommends against as cosmetic). An Opus
   execution session should not author it.

**A rotted assumption, corrected at T5a's close.** T4d's brief said it inherits T5's live site,
minted GitHub App, and saved state, and owns the single teardown. **None of that exists**:
`~/.config/cairn/sites` is empty and the App ledger still stands at four hand-deleted, not five,
because T5a did not run Task 8. The brief now states both cases and tells the planning sitting to
check the directory rather than trust the paragraph. Order matters here: Task 8 first means one
App and one teardown; T4d first means T4d mints the fifth itself.

**Gate at close, verified in the main loop rather than taken from an agent's report:**
`packages/create-cairn-site` 701 pass exit 0; root `npm test` 412 files / 5275 tests exit 0;
`npm run check` 0 errors 0 warnings over 1601 files; `check:comments`, `check:docs` (187 files),
`check:reference`, `check:package`, and all four CI-only gates
(`check:reference:signatures`, `check:surface`, `check:snippets` at 209 blocks, `check:comments`)
green. PR-gating workflows re-derived with `grep -l pull_request`: `scaffold`, `create-site`,
`e2e`, `test`, `design`. Neither sync path is PR-gating, which is correct.

**What T5a shipped.** The sync script that generates the template repo wholesale from the bake
plus an overlay (normal commits, never a force push, a remote guard covering https, http, ssh and
scp spellings, and a credential carried as an injected `http.extraheader` rather than in the
remote URL or argv); the overlay skeleton; two push gates, registry resolvability and a real
install-and-build of the composed tree; the GitHub Actions wiring (a `needs: publish` release job,
a manual dispatch, and a weekly cron that now checks drift **and** buildability), sharing a
concurrency group with a 15-minute timeout; and `docs/guides/deploy-to-cloudflare.md`'s paths
framing, which resolved and removed T4c's friction-log entry. One defect outside the pass's own
code was fixed because the guide documents that surface: **a site whose owner declined Workers
Builds could never reconnect**, though the decline message and `bin.mjs`'s own comment both named
`--connect` as the way back in. Nothing in 698 tests covered it.

**Why the pass split (Geoff, 2026-08-13), and what T5a' owes at release one.** Rehearsing Task 2
Step 1 locally showed the synced tree installs and will not build: it imports `previewLoad` and
`PreviewBanner`, which published `0.94.0` does not export. Spec ruling 6 assumed the strip made
the acceptance criterion reachable before release one; the strip addresses the dev backend and has
no bearing on the engine. **The sync therefore refuses to push today, which is correct.** T5a'
carries Task 4 Step 2 (the PAT), Task 5 (create and first-sync the repo), Task 7 (the C3
contract), Task 2 (the live button spike), Task 3 (the overlay's spike-derived content), Task 6's
button section rewritten from observation, and the checklist with its match test. Two
release-checklist obligations are in the changelog for `cairn-release` to read: drop
`--strip-dev-backend` from the cron and its dispatch input default, and drop the README's
pre-release notice. **Ruling 2's adopt probe was retired rather than rescheduled**: `--connect` is
gated on a state record a button-created site never has, so the probe was never runnable; the
spec's T5b section now records what reading settled and what only the button can show.

**T4c's own record, now history:** chapter 3 exists end to end: admission, the
eight-key token paste, connect, trigger, the `base_tree` reconcile commit, the build watch, and
completion, wired into `bin.mjs` at all three hook sites with `--connect` as a real flag.
**667 tests pass and all 18 gates are green**, including the four that normally only run on CI
(`check:reference:signatures`, `check:surface`, `check:snippets`, `check:comments`). The
superseded entry is archived at
`docs/internal/history/STATUS-archive-2026-08-12-t4c-planned.md`. The runtime library is
untouched; `package.json` is untouched; the changelog entry sits under `## Unreleased`.

**Two things from this pass are worth carrying into every future one.** First, the live spike
produced **thirteen amendments and deleted two planned deliverables** (`writeAccountId`, the
`builds-no-build-token` row), and settled the pass's premise with an A/B that no amount of
reading could have replaced. Second, **the review gate caught what every mechanical gate
missed**: nine tasks landed with 596 tests green and a chapter that could not connect a single
real site, because the connect hop read GitHub with no credential, every scaffolded repo is
private, and the fake served private repos anonymously. The lens that found it was the one
asked "would this test still pass if the feature were deleted." Keep that third reviewer.
Full detail is in the plan's post-mortem.

**The one named gap: the live CLI e2e (plan Task 10) did not run.** The spike proved the whole
platform path live (connect, upsert idempotence, build-token registration, trigger, kick, poll
to `success`, both refusal shapes, and push-to-deploy with no tool involved). What is unproven
against real services is the tool's own orchestration and the `reauthorize` OAuth trip, both
covered only by fakes whose fixtures are copied verbatim from real captures. A full CLI run
needs chapter 1, which mints a GitHub App only Geoff can hand-delete, and
`~/.config/cairn/sites` is empty so no App state could be reused. **It folds into T5's run**
(decided with the reorder below), so one App is minted instead of two.

**The T5-before-T4d question is DECIDED (Geoff, 2026-08-12): T5 jumps ahead**, and the T5 spec
and plan are both approved (the plan at the adversarial gate). The queue is now T5 -> T4d ->
Pass D -> release one -> site walk -> P. The live CLI e2e (the gap below) folds into T5, not
T4d; the e2e estate T5 mints persists across both passes with its teardown after T4d, while
T5's spike estate is torn down at T5's own end (spec ruling 7). **Amended by the T5a split
above:** the spike, and the estate it would have created, move to release one, so nothing needs
tearing down from T5a. The live CLI e2e (Task 8) is still T5's and still unrun. The
adopt-existing-repo path is still deferred to a T5b brief, but its `--connect` adopt probe was
retired rather than rescheduled, since the probe was never runnable. T4d's brief is unchanged
(the T4a spec, plus the two T4c inputs: the build watch as a second long wait, and the grown
fake surface its plumbing extraction must cover).

**Hand steps for Geoff, EIGHT outstanding, one urgent.** Steps 6 through 8 are T5's and are
listed after the five carried in. (6) **Mint a fine-grained PAT** scoped to the single repo
`glw907/cairn-waymark-template` with contents read/write, run
`~/.dotfiles/scripts/secrets/secret-set.sh TEMPLATE_REPO_TOKEN`, add the registry entry **with
expiry and rotation date**, and set `TEMPLATE_REPO_TOKEN` as an Actions secret on
`glw907/cairn-cms`. **Not blocking anything now**: the split moved Task 5 to release one, so this
is owed at that cut rather than today. The recorded store check the spec asks for is done,
name-only: the registry does hold `CMS_BOT_PAT`, but its entry reads "GitHub repository write
access for CMS automation" rotating at `github.com/settings/tokens`, a broad classic-shaped bot
credential, so against the standing narrow-token rule it is not reused. (7) **The button spike's
browser moment** (Task 2), now owed at release one with the rest of T5a', not before: the tree it
would deploy cannot build until the engine it names is on the registry. (8) **The live CLI e2e's
browser moments** (Task 8), batched: the fifth GitHub App's creation and the `reauthorize` OAuth
trip. **This is the only T5 hand step that is actionable today**, and it is unaffected by the
split.

The five carried in: (1) **URGENT: rotate the estate
Cloudflare token** (`Cloudflare Admin 2026-07`): leaked into a transcript, still active. Mint a
replacement, run `~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, delete the
old one. (2) Delete the GitHub App `cairn-t4b-live-03cd31` at github.com/settings/apps.
(3) **NEW: remove `cairn-t4c-spike` from the Cloudflare "Workers and Pages" App's repository
selection** at github.com/settings/installations, leaving `glw907/907-life` selected; it was
added for the spike. (4) **NEW: revoke the T4c spike API token**, id
`d07b2a25f05151591830c45053186979`, at dash.cloudflare.com/profile/api-tokens, then
`rm -f ~/.config/cairn/t4c-spike-token ~/.config/cairn/store-t4c-token.sh`. (5) **NEW, and
unrelated to cairn's own work: 907-life's push-to-deploy has been broken since 2026-07-14.**
Both recent builds failed with "The build token selected for this build has been deleted or
rolled"; the site has had no automatic deploy for a month. Found while censusing the account.
It is the production instance of the coupling chapter 3 now takes on deliberately, and the
README's caveat is written from it.

**The spike's scratch estate is TORN DOWN and verified by listing** (2026-08-13, after Geoff took
the fold-into-T4d option above). Deleted: the trigger, the repo connection, the spike build token,
the Worker `cairn-t4c-spike`, D1 `cairn-t4c-spike-auth` and `-app`, R2 `cairn-t4c-spike-media`, and
the GitHub repo `glw907/cairn-t4c-spike`. Confirmed by re-listing rather than by trusting the
delete calls: build tokens now show only 907-life's two, no Worker matches `t4c-spike`, and the
repo 404s. Only hand steps 3 and 4 above remain, both browser-only.

**Standing note on e2e cost, unchanged:** every live e2e mints a GitHub App only Geoff can
delete. Four hand-deleted so far. T4c minted **none** (its spike used the API directly), so the
count is still four; T5's run will add the fifth, and T4d reuses it.

**A second watch routine is live.** `trig_01G4gNi4RbR4vmhTLa8jCmk9`, "cairn Artifacts GA watch",
monthly on the 1st at 18:00 UTC, first run 2026-09-01, emailing only when it trips. It watches
whether **Cloudflare Artifacts** (Git-compatible storage on Cloudflare) loses its access gate,
which is the one thing that would make it a candidate to replace GitHub. It judges the gate, not
the label, so a public beta anyone can use trips it. It is explicitly told **not** to report a
missing content-write REST endpoint: that was investigated 2026-08-13 and closed. The binding
and REST API are read-only for content, Cloudflare documents an isomorphic-git-in-a-Worker write
path instead, and a GitHub-style write endpoint is judged unlikely in a git-native store. The
objection no API change resolves is that the developer's own site code lives in that repo, so
moving off GitHub costs them pull requests, Actions, and collaborators.

**Carry-forwards (the tool initiative), renumbered this entry; verify against this list, not a
remembered one.** (1) The cutover confirm resolves through `fetch` and the system resolver, so a
stale negative DNS cache can park the owner on a serving hostname; belongs to a pass owning
`hostname.mjs`. (2) The T4a prefill URL's permission keys are verified, but amendment 9's Task 7
obligation (the interactive-paste path against the live dashboard) stands open, and **T4c adds
to it: `d1` and `workers_r2` ship in the chapter-3 key set without a live dashboard
confirmation**, and R2's requirement is inferred rather than observed (the failing probe build
died at the first D1 binding and never reached the bucket). (3) An externally registered domain
still owes the branches the scratch domain cannot reach. (4) Chapter 2's browser-moment count is
one and Pass D's admin-track domain page should state it; **chapter 3's count is two** (the App
authorization, once per account, and the reconcile sign-in). (5) The engine committer-attribution
drift from T3 (`src/lib/github/repo.ts` versus spec 7.4). (6) `check:comments` and the root
type-check cover `src/lib` only, so `packages/create-cairn-site` has neither a comment gate nor a
type gate; its own `npm test` is the real gate. (7) `test/fake-cloudflare.mjs` copies its HTTP
plumbing from `test/fake-github.mjs`; the extraction stays filed for T4d, whose brief also gains
the grown fake surface. (8) The `paid-plan-missing` mapping keys on entitlement wording rather
than a code. (9) The deferred defect list per the T4a spec's ruling 2. (10) The umbrella's resume
table, still unowned, noted for Pass D. (11) Root `CLAUDE.md` has no context headroom left; the
next addition there must trim first. (12) `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved
token that fails validation throws that failure rather than re-validating; a deliberate
narrowing. (13) **NEW: `runStep` now exists in four modules** as identical one-liners
(`github/chapter.mjs`, `cloudflare/chapter.mjs`, `chapter2.mjs`, `chapter3.mjs`); hoisting it
into `runner.mjs` is right but is a cross-cutting refactor of pre-existing code, flagged by
`code-simplifier` rather than done. (14) **NEW: a first `--yes` run cannot reach `builds-live`.**
The reconcile hash gate has no prior hash on a first run, so an unattended run parks at the
sign-in. Documented in the README and changelog; revisit only if an unattended full run is
actually wanted. (15) **NEW, and the pass's headline: the bake couples the template's
installability to the publish window.** The emitted tree and the emitted engine spec must come
from the same release, or the tree imports symbols the resolved engine does not export. Harmless
whenever a baked tree is used against the release its spec names; it breaks only in the
ship-before-release case, which is exactly the template repo's. Full evidence and the three
candidate resolutions: `docs/internal/2026-08-13-t5-button-spike.md`, Step 1. (16) **NEW: no gate
proves a scaffold against the registry.** `create-site.yml` and `scaffold.yml` both pack the
engine from the checkout and rewrite the scaffolded site to point at that tarball, so a
published-surface gap in the emitted tree is invisible to every existing gate. This is the same
blind-spot family as the worktree-symlink and Vite-8 gotchas in `CLAUDE.md`, and it is what let
(15) reach a live-spike rehearsal undetected. **Retired this entry:** the old (7), `install.test.mjs`'s reauthorize flake,
which was diagnosed and fixed rather than quarantined; and the `PUBLIC_ORIGIN` reconciliation
gap, which is what this pass closed.

## Standing state (release ordering, consumers, open items, carry-forwards)

**T4c is BUILT** (2026-08-13; the entry above carries its state, gaps, and hand steps). T4b and
T4b.1 are shipped history: their detail lives in their plans' post-mortems and the archived
entries. T4c's own execution record is its plan's post-mortem plus the live spike at
`docs/internal/2026-08-12-t4c-builds-spike.md`, which is the fixture source for every Builds
fake body and carries the teardown table.

**THEN release one, AFTER Pass D** (amended ordering, Geoff 2026-08-09): it rolls this window
plus the history/revert, preview, vertical-alignment, and cleanup passes plus the docs reset, and
**`create-cairn-site` and the template repo publish in the same cut** so no shipped page
describes an uninstallable tool. Invoke `cairn-release`; verify the next number is free first.

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
| `cairn-pub` | `^0.87.4` | 0.88 through 0.93, plus this window (migration ran against `rc.1`; the `Consumers must:` work is done, blocked only on the GitHub App item above) |
| `aksailingclub-org` | `^0.94.0` | current (adoption merged, deployed, and smoked 2026-08-07) |
| `ecxc-ski` | `^0.93.0` | this window only |

(`~/Projects/asc-site` is a second checkout of `aksailingclub-org`, not a fifth consumer.)
**cairn.pub is a consumer and the project's own site**, a docs shell six minors behind the engine it
documents.

**Carry-forwards (live):** admin error statuses flattening to HTTP 200 under the shell's streamed
pending count (upstream sveltejs/kit#12987, OPEN); `config.kit.csrf.checkOrigin` is an ACTIVE
deprecation warning in the toolchain this repo builds against (kit#15992, watched by a scheduled
routine) and prints on every showcase build; engine-rendered markup depending on classes Tailwind
may never emit (ROADMAP Now, and resolving it moves the approved visual baseline, so it runs through
`visual-fidelity` with Geoff's before/after); mermaid diagrams near-illegible at 320/390;
section-index breadcrumbs duplicating the arm name; the `/admin/help` first-steps card overlap; the
`sideEffects` coverage gate filed as mechanical hardening. The xcathletes pass-1 plan amendment
(ruling 3) still rides the next session that touches `~/Projects/ecxc-ski`. ASC's own retrofits run
in that repo on its own clock.

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
session started from, is in `STATUS-archive-2026-08-12-t4c-planned.md`.
