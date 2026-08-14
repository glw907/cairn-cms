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


## Immediate next action (2026-08-13 night: T4d is DONE, live-proven, CI-green, and torn down; next is Pass D)

**T4d is COMPLETE, all eight tasks.** The localhost console ships over both held wait classes,
with the three extractions (loopback core, DNS helper, fake HTTP plumbing) and the hostname
diagnosis split. **Carry-forwards 1 and 7 are CLOSED.** The post-mortem, with the full lesson set
and the Task 7/8 addendum, is in the plan
(`docs/superpowers/plans/2026-08-13-create-cairn-site-t4d.md`).

**The console is live-proven.** Three provocations drifted the local reconcile hash on the
inherited `builds-live` record, each riding the reauthorize trip and its push into a real held
build watch. The clean run captured the whole arc from one console: 19 samples, `initializing` to
`running` to the `Cleared` exit render, the live pages carrying the 5-second `meta refresh` and
the exit render carrying none, with the rendered `build_uuid` and commit matching an independent
`builds/workers/{tag}/builds` read (`build_trigger_source: push_event`). The hold spanned the
build in all three runs. Evidence, raw reads, and the harness findings:
`docs/internal/2026-08-13-t4d-task7-live-proof.md`.

**The estate is torn down and verified by re-listing**, not by trusting a delete's success code:
Builds trigger and connection, the Worker and its secret, both D1 databases, the R2 bucket, the
custom domain, the Email Sending subdomain with its four `cf-bounce` records and the `_dmarc` it
leaves behind, the GitHub repo, the state record, and the wrangler OAuth session. The settled
table is in `docs/internal/2026-08-13-t5-task8-live-e2e.md`. `~/Projects/cairn-scratch/` went
from 550M to 376K, holding only the run transcripts and the Task 7 console samples.

**Next: Pass D.**

**The branch is CI-verified.** PR #33 (`t5-browser-door` to `main`) is open with all six checks
green: `create-site`, `design`, `e2e`, `norms`, `scaffold`, `test`. That closes the ungated gap
this entry used to carry, including the three the local gate cannot prove (`e2e`, `scaffold`,
`create-site` against a real install). **The PR is green but NOT merged**; merging it is the next
mechanical step before Pass D branches off `main`.

**Gate at close, verified in the main loop rather than taken from an agent's report.**
`packages/create-cairn-site` 821 pass exit 0 (701 at pass start). Root `npm run check` 0 errors 0
warnings over 1601 files. `check:docs` 188 files, every relative link and anchor resolving. The
PR-gating list re-derived with `grep -l pull_request .github/workflows/*`: `design`, `e2e`,
`create-site`, `scaffold`, `test`. The `create-site.yml` console probe was extracted verbatim and
RUN against HEAD (exit 0, four consecutive runs), then falsified by reinstating the pre-fix
assertion. Both SIGINT shapes were driven against the real packed `bin.mjs` behind a latency proxy.

**The pass's headline, and it repeats the previous pass's lesson exactly: nine tasks landed with
801 tests passing and BOTH marquee features inert in a real run.** Chapter 2 never threaded a DNS
context, so the propagation split could not execute and its park message asserted what an unmade
lookup had shown. The Builds hold cleared the instant a build was FOUND, so the console shut down
precisely when the build it existed to display began. Park pages were built, tested, and mounted on
no route. The sentinel sweep, the security gate for AC6, rendered through a test-local copy of the
view and could never fail for the reason it claimed. **The dominant defect class, four instances in
one pass: a test proves a function while nothing proves the call path reaches it.** The standard
that generalizes, adopted mid-pass: a wiring test is proven red BY MUTATION, deleting the production
argument and watching a named test fail. It immediately caught that one fix round's own DNS wiring
was unpinned. **Keep the deletion-test lens on every review gate**; it found five of these by
mutating a scratch copy.

**Two regressions came from the fixes themselves**, both found by asking the verifier specifically
for them: a probe race made a null observation reachable at the interrupt path (SIGINT before the
first probe exited 1 with a TypeError), and the Builds-hold widening updated an assertion's in-repo
mirror but not its copy in `create-site.yml`, leaving a PR-gating workflow red. **A scenario
mirrored across a test file and a workflow YAML drifts silently**, and the only reliable check is
extracting the workflow's script and running it.

**The Go successor tool grew a settled scope this session (Geoff, in conversation).** It is
multi-site, named **`cairn`**, and lives **in this repo** rather than its own. Decisions 7 through 9
plus the sequencing, the adopt-is-feature-one finding, the credential caution, and five new open
questions are folded into
`docs/superpowers/specs/2026-08-13-go-successor-tool-design.md`, whose status header no longer says
post-1.0: **the dashboard half starts once T4d closes.** The changelog `Consumers must:` convention
becomes a machine-readable contract before the beta cut, filed as **ROADMAP P9**, scoped
forward-only with no backfill.

**The docs friction log stands at 19 open findings across 367 lines, last cleared 2026-07-29.**
Nothing has left since while roughly nine arrived, which is the wrong direction by its own
complete-or-move rule. Four of the five `editor` entries are one theme (how a refused action reports
itself), and the sharpest is a refused save preserving the body while silently discarding
frontmatter field edits. **Recommendation: a triage session first** (dispatchable, verify all 19
against current code, delete the stale, promote the rest with triggers), and let what survives decide
whether the editor cluster is worth its own pass. Deliberately NOT folded into T4d.

**Hand steps for Geoff, NINE outstanding, one urgent. T4d's teardown added three.** (1) **URGENT:
rotate the estate Cloudflare token** (`Cloudflare Admin 2026-07`), leaked into a transcript and still
active; mint a replacement, run `~/.dotfiles/scripts/secrets/secret-set.sh CLOUDFLARE_API_TOKEN`,
delete the old one. (2) Delete the GitHub App `cairn-t4b-live-03cd31`. (3) Revoke the T4c spike API
token `d07b2a25f05151591830c45053186979`, then
`rm -f ~/.config/cairn/t4c-spike-token ~/.config/cairn/store-t4c-token.sh`. (4) 907-life's
push-to-deploy has been broken since 2026-07-14. (5) Mint the fine-grained `TEMPLATE_REPO_TOKEN` PAT
at release one. (6) The button spike's browser moment, owed at release one with T5a'.
**(7) NEW: delete the GitHub App `cairn-t5-scratch` (id 4585219)** at github.com/settings/apps, which
uninstalls installation 153531337 with it. **This is the fifth hand-deleted App**, and with (2) the
ledger stands at two awaiting deletion. **(8) NEW: revoke three Cloudflare API tokens** at
dash.cloudflare.com/profile/api-tokens, all named for `create-cairn-site`: T5 run 1's five-key token,
T5 run 2's eight-key token, and the eight-key token minted 2026-08-13 for T4d's live proof and
teardown (its local file is already deleted). **(9) NEW: check the Workers Paid opt-in** taken at T5
run 2's prompt, in case the account was not already on it via 907-life. Everything else in the T5
teardown table is done and verified.

**Carry-forwards (the tool initiative). CLOSED this pass: 1 (the resolver negative-cache
diagnosis) and 7 (the fake HTTP plumbing extraction).** Renumbered survivors: (1) an externally
registered domain still owes the branches the scratch domain cannot reach. (2) Chapter 2's
browser-moment count is one and chapter 3's is two; Pass D's admin-track domain page should state
both. (3) The engine committer-attribution drift from T3 (`src/lib/github/repo.ts` versus spec 7.4).
(4) `check:comments` and the root type-check cover `src/lib` only, so `packages/create-cairn-site`
has neither a comment gate nor a type gate; its own `npm test` is the real gate, and this pass leaned
on that fact repeatedly. (5) The `paid-plan-missing` mapping keys on entitlement wording rather than
a code. (6) The deferred defect list per the T4a spec's ruling 2. (7) The umbrella's resume table,
still unowned, noted for Pass D. (8) Root `CLAUDE.md` has no context headroom left; the next addition
there must trim first. (9) `--yes` with `CAIRN_CF_API_TOKEN` equal to a saved token that fails
validation throws rather than re-validating, a deliberate narrowing. (10) `runStep` exists as an
identical one-liner in four modules; the hoist is right but is a cross-cutting refactor of
pre-existing code, and this pass explicitly declined it as a fourth extraction. (11) A first `--yes`
run cannot reach `builds-live`, since the reconcile hash gate has no prior hash. (12) The bake couples
the template's installability to the publish window. (13) No gate proves a scaffold against the
registry. (14) **NEW: the console scenario is mirrored in `test/console-hold.test.mjs` and
`.github/workflows/create-site.yml` with nothing linking them.** (15) **NEW: no spawned-child test
covers the pre-first-probe interrupt window**; it is held by a unit test plus two composer wiring
assertions, and an end-to-end proof needs a latency proxy or a hang-the-first-request capability in
the fake.

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
session started from, is in `STATUS-archive-2026-08-12-t4c-planned.md`. The T5 Task 8 live-e2e
close, the T5a split record, and the state T4d's execution session started from are in
`STATUS-archive-2026-08-13-t5-task8-close.md`.
