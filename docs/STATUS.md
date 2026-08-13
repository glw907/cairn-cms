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

## Immediate next action (2026-08-13: T4c is BUILT and green; next is the T4d planning sitting)

**T4c is code-complete on `worktree-t4c-builds-connect`** (off `main` at `5a37c7cb`), seventeen
commits, `ff3a1699` through the post-mortem. Chapter 3 exists end to end: admission, the
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
`~/.config/cairn/sites` is empty so no App state could be reused. **Recommendation: fold it
into T4d's run**, which needs a live site anyway, so one App is minted instead of two.

**Next is the T4d planning sitting** (the localhost console; its brief lives in the T4a spec and
now carries two T4c inputs: the build watch as a second long wait, and the grown fake surface
its plumbing extraction must cover). Queue after that: T5 -> Pass D -> release one -> site walk
-> P. Note the T5 question raised this pass and not yet decided: Cloudflare's own deploy button
creates the repo and the Builds connection in one click, which overlaps a real fraction of what
chapter 3 does by hand for a brand-new site, so T5 may deserve to come before T4d.

**Hand steps for Geoff, FIVE outstanding, one urgent.** (1) **URGENT: rotate the estate
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

**The spike's scratch estate still needs teardown** and a script is ready but unrun, pending the
e2e decision above (the spike repo and Worker are the natural target if a run happens):
`glw907/cairn-t4c-spike`, Worker `cairn-t4c-spike`, D1 `cairn-t4c-spike-auth` and
`-app`, R2 `cairn-t4c-spike-media`, connection `c3b2f3e1-5639-4e5e-95cb-cb6bc12bf9b5`, trigger
`218d9fa8-79ba-4121-80c2-a8ccabce7165`, build token `34d0cf5f-082b-44a2-9b04-7b24be3a4fd9`. The
full table, including the estate-wrapping build token already deleted, is in the spike doc.

**Standing note on e2e cost, unchanged:** every live e2e mints a GitHub App only Geoff can
delete. Four hand-deleted so far. T4c minted **none** (its spike used the API directly), so the
count is still four; T4d's run will add the fifth.

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
actually wanted. **Retired this entry:** the old (7), `install.test.mjs`'s reauthorize flake,
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
