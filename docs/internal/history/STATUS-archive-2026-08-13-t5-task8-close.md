## Immediate next action (2026-08-13 evening: Task 8 ran to `builds-live`; next is T4d's Fable spec-and-plan sitting)

**Task 8, the live CLI e2e, is COMPLETE.** PR #30 merged first (six checks green, merge
`95227bed`), then chapters 1 through 3 ran cold against real services to `builds-live`: four
invocations, three parks (DNS propagation, App repo-selection, build queue), every park exit 0
with a correct re-entry, every resume entering at the right hop. The per-hop evidence, all raw
reads with the no-fake preflight, is `docs/internal/2026-08-13-t5-task8-live-e2e.md`; the
post-mortem is in the T5 plan. Now live-proven: the tool's whole orchestration, the
`reauthorize` OAuth trip (instant on an authorized browser session), a full scaffold building
green on Workers Builds, the eight-key interactive paste (**carry-forward 2 cleared**, all
eight dashboard rows confirmed), and the email chapter end to end (Geoff opted into Workers
Paid, so the planned decline became coverage). **The App ledger stands at five**
(`cairn-t5-scratch`, id 4585219). The e2e estate persists for T4d (spec ruling 1); its
teardown table, everything marked "after T4d", is in the evidence doc.

**Next: EXECUTE the T4d plan** (`docs/superpowers/plans/2026-08-13-create-cairn-site-t4d.md`)
**in a fresh Opus session**, per the model economy: the Fable sitting that authored it ended at
plan approval. Spec and plan both passed an adversarial gate the same day (three lenses on the
spec, four on the plan, 56 ranked findings folded; the gates' largest catches are recorded in
each document's header, including a correction OF the T4a brief: `loopback.mjs` never had the
secret path or Host guard the brief claimed). Method: task-by-task `cairn-implementer`
dispatches (pinned Sonnet), test-first, full gate between dispatches, on this same worktree
branch `t5-browser-door` off merged `main`; Tasks 7 and 8 are main-loop. The plan's pass-size
note names the cut point (after Task 3) if execution splits a task again. T4d inherits the
live site, the fifth App, and the state record at `builds-live` (re-verify the directory at
execution start), and owns the single teardown. Task 8's observed inputs are folded into the
spec's decision record already; the sitting also banked, opportunistically: the Go
successor-tool pre-design (with its effective-now "tune for the port" standing input), the
`checkOrigin` pre-P migration pass (ROADMAP Next), and the missing-`.gitignore` defect (filed
above, owed before release one).

**A defect owed before release one, found by Task 8's freshness check: a tarball-installed
scaffold ships no `.gitignore`.** npm always drops `.gitignore` from tarballs, `scaffold.mjs`
copies the template verbatim, and nothing restores it, so on the published-tool path
`pushScaffold`'s only protection against uploading `.svelte-kit/`, `.wrangler/`, and
`.dev.vars` silently vanishes — and the scaffold's own hand-over text sends users to
`npm install && npm run dev` before the push. The run mitigated by restoring the baked file;
the fix (bake to a neutral name, scaffold renames it back, tested through the packed-tarball
path) is small, well-specified, and owed before the tool publishes. Filed here rather than
ROADMAP so the release-one checklist cannot miss it.

**Banked opportunistically during Task 8's DNS wait:** the Go successor-tool pre-design
(`docs/superpowers/specs/2026-08-13-go-successor-tool-design.md`, its ROADMAP Later entry, and
its "standing input for the current track" section, which tunes the Node tool's docs, comments,
and structure so a post-1.0 Go port reads them as a spec — passes should honor it starting
now); and the `checkOrigin` migration pass, moved Later -> Next as pre-P launch polish (the
deprecation warning prints six-plus times in every owner build; step 1 re-verifies the recorded
kit-2.61 blocker against current kit).

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

**Hand steps for Geoff, SIX outstanding, one urgent.** Two settled 2026-08-13 during Task 8:
the old (3) (`cairn-t4c-spike` removed from the "Workers and Pages" App's selection, done in the
same visit that added `t5-scratch` for the connect), and the old (8) (Task 8's browser moments,
all spent: the fifth App's creation and the `reauthorize` trip). Remaining, renumbered:

(1) **URGENT: rotate the estate Cloudflare token** (`Cloudflare Admin 2026-07`): leaked into a
transcript, still active. Mint a replacement, run
`~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`, delete the old one.
(2) Delete the GitHub App `cairn-t4b-live-03cd31` at github.com/settings/apps.
(3) **Revoke the T4c spike API token**, id `d07b2a25f05151591830c45053186979`, at
dash.cloudflare.com/profile/api-tokens, then
`rm -f ~/.config/cairn/t4c-spike-token ~/.config/cairn/store-t4c-token.sh` (both files still
present, verified 2026-08-13). (4) **907-life's push-to-deploy has been broken since
2026-07-14** ("build token … deleted or rolled"); unrelated to cairn's own work but a month
without automatic deploys, and the production instance of the coupling chapter 3 takes on
deliberately. (5) **Mint the fine-grained `TEMPLATE_REPO_TOKEN` PAT** at release one (Task 5
moved there with the split): scoped to `glw907/cairn-waymark-template` contents read/write,
through `secret-set.sh`, registry entry with expiry, Actions secret on `glw907/cairn-cms`. The
store check is done, name-only: `CMS_BOT_PAT` exists but is broad and classic-shaped, not
reused. (6) **The button spike's browser moment** (Task 2), owed at release one with T5a'.

**The spike's scratch estate is TORN DOWN and verified by listing** (2026-08-13, after Geoff took
the fold-into-T4d option above). Deleted: the trigger, the repo connection, the spike build token,
the Worker `cairn-t4c-spike`, D1 `cairn-t4c-spike-auth` and `-app`, R2 `cairn-t4c-spike-media`, and
the GitHub repo `glw907/cairn-t4c-spike`. Confirmed by re-listing rather than by trusting the
delete calls: build tokens now show only 907-life's two, no Worker matches `t4c-spike`, and the
repo 404s. Only hand steps 3 and 4 above remain, both browser-only.

**Standing note on e2e cost:** every live e2e mints a GitHub App only Geoff can delete. Four
hand-deleted so far; **Task 8 minted the fifth (`cairn-t5-scratch`, id 4585219), which is live
and persists for T4d to reuse**, joining the teardown table rather than the hand-delete count
until after T4d.

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
`hostname.mjs`. **Task 8 observed it live: 26 minutes parked with the authoritative answer
serving the whole time**, so the fix now has a measured cost attached. (2) **CLEARED
2026-08-13:** the interactive-paste path ran against the live dashboard in Task 8's run 2, and
Geoff confirmed all eight rows filled on the eight-key prefill page; `prefill.mjs`'s comment now
records the confirmation. The one residue, stated there: R2's *requirement* stays a conservative
inference (no request has ever exercised `workers_r2` alone). (3) An externally registered domain
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
