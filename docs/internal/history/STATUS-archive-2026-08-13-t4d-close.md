# STATUS archive: the T4d close entry (2026-08-13 night)

The "immediate next action" entry as STATUS carried it from T4d's close to the Pass D
planning sitting (2026-08-14), which merged PR #33 and superseded this entry.

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

