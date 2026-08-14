# create-cairn-site Pass T4d: the localhost console

> **For agentic workers:** each implementable task is dispatched to `cairn-implementer`
> (pinned Sonnet), test-first. The main loop reviews each diff and confirms the full gate
> (targeted test, root `npm run check` 0/0, `npm test` exit 0 in
> `packages/create-cairn-site`) before the next dispatch. Tasks marked **[main loop]** are
> live, browser-bound, or credential-bearing. A task instruction naming a concrete code
> shape or file state is a claim to verify at the first task that touches it, never an
> instruction to follow blind (the T4a through T5 lesson, five times now).

**This plan was revised at its adversarial gate** (2026-08-13, four lenses: wrong-premise,
conformance, deletion-test, cold-implementer executability; 32 ranked findings, 12
blocking-tier, folded below and into the spec the same day). The largest corrections: the
secret prefix is console-mounts-only (a server-wide prefix breaks GitHub's baked
`callback_urls`; `oauth.mjs` pins the port-only leniency), the hold gate lives in the
caller with one documented force seam, both integration proofs target the Builds hold (the
propagation probe deliberately has no env seam), a wiring task now owns the production
call path, and Task 7's provocation is a local reconciled-file edit (the `builds-live`
re-entry gates on the local hash, not the repo).

**Pass-size note (the sizing rule applied at plan time):** ten implementable tasks plus two
main-loop tasks is a full plate. The clean cut, if execution splits any task again, is
**after Task 3**: Tasks 1 through 3 are the three self-contained extractions (a "T4d-prep"
half that leaves `main` releasable), and everything from Task 4 on is the console proper.
A second in-flight task split means proposing that pass split, not absorbing it.

**Goal:** the server-rendered localhost console over a run's waits: held waits with live
views and auto-resume for the propagation and Builds classes, parks unchanged everywhere
else, plus the three extract-and-reuse moves and the `hostname.mjs` diagnosis upgrade
(carry-forwards 1 and 7 close in this pass).

**Spec:** `docs/superpowers/specs/2026-08-13-create-cairn-site-t4d-design.md`, as revised
at both gates. Its decision record and ten acceptance criteria govern. The estate fact
(case 1, inherited from Task 8) was checked at the sitting; **re-verify
`~/.config/cairn/sites/` at execution start** before Task 7 plans on it.

## Global constraints

- The runtime library (`src/lib`) is untouched; `package.json` versions are untouched;
  the changelog entry stays under `## Unreleased`.
- **The default path is today's path.** Absent an injected `waitForClear`, behavior is
  byte-identical to today. **Licensed edits to existing tests, exhaustively:** the GitHub
  loopback tests may gain mechanical URL threading only; `hostname.test.mjs`,
  `catalogue.test.mjs`, and any resume test may change exactly where Task 2's split
  renames an outcome code, no other assertion touched. Every other pre-existing test
  passes byte-identically.
- **The hold gate lives in the caller.** A chapter composes `waitForClear` only for an
  interactive run (`!yes && stdout.isTTY && !CI`). The one override is
  `CAIRN_FORCE_HOLD=1`, honored only when a fake API base is also set, existing for the
  two integration proofs; it rides the sentinel sweep like every env read.
- No secret in any rendered byte or printed line: per-view field allowlists, never a
  record spread; the sentinel sweep enforces it, proven red once by interpolating the
  record whole.
- Fakes refuse what the real service refuses; fixture bodies carry provenance.
- Comment style: TSDoc-shaped doc blocks; the em dash is banned in comments. The Go
  successor pre-design's "tune for the port" section applies to every new module.
- Hand steps for Geoff land in STATUS's hand-step list at creation time.
- **Named constants, exported and asserted:** propagation budget 40 minutes, propagation
  poll 30s, display cadence ~30s propagation / ~5s build; the build class reuses chapter
  3's existing poll/budget constants. Budget expiry is tested on an injected clock; each
  view's rendered `meta refresh` value is asserted.

### Task 1: The loopback core, extracted and completed

**Files:** create `packages/create-cairn-site/src/loopback-core.mjs` (verify naming idiom
against the tree) and its test file; modify `src/github/loopback.mjs`, `oauth.mjs`,
`install.mjs`, `manifest.mjs`, and `src/github/chapter.mjs` (the loopback start call
site) to consume it.

- [ ] **Step 1: failing tests first** for the core alone: binds loopback and reports its
  port; routes by path map; **fixed-path mounts and prefixed mounts are distinct
  capabilities** (GitHub's `/callback` and `/manifest` mount fixed and unprefixed, with a
  test that `/callback` stays identical across two core starts; console mounts carry the
  per-start `randomBytes(16).toString('base64url')` prefix and an unprefixed console path
  404s); every mount enforces the Host allowlist (`127.0.0.1[:port]`, `localhost[:port]`,
  `[::1][:port]`; 403 otherwise, positive control that allowed forms 200); shutdown
  closes the socket. A regression test asserts `reauthorize`'s redirect_uri path is
  exactly `/callback` (cite `oauth.mjs`'s port-only-leniency comment in the core's own
  doc block so the fixed mount is never "unified" away).
- [ ] **Step 2: implement; migrate the GitHub chapter** with redirect URIs, behavior, and
  tests unchanged (mechanical threading only where the core's start signature differs).
- [ ] **Step 3: gate.** The exit render and grace window are NOT this task's; they belong
  to Task 5a.

### Task 2: The shared DNS helper and the hostname diagnosis split

**Files:** create the shared DNS helper module and tests (lift `defaultResolve`,
`readNsNames`, `firstAuthoritativeAddress`, `RECURSIVE_SERVERS`, and the
authoritative-selection block out of `src/cloudflare/records.mjs`; verify the current
shapes first); modify `records.mjs`, `src/cloudflare/hostname.mjs`,
`src/cloudflare/hostname.test.mjs`, `src/cloudflare/catalogue.mjs`,
`src/cloudflare/catalogue.test.mjs`, and the outcome-union docs in
`src/cloudflare/chapter2.mjs` and `chapter3.mjs`.

- [ ] **Step 1: failing tests first.** The helper: authoritative answer against the
  zone's own nameservers via an optional `nameServers` parameter (callers with
  `record.cloudflare.nameServers` pass it; recursive NS discovery is only the fallback
  and sets `lowConfidence`); recursive answer beside it; the delegation-refusal logic
  stays in `records.mjs`, out of the helper. `hostname.mjs`: `confirmHostname` gains an
  optional DNS context (`{ resolve, nameServers }`, absent-safe so `chapter3.mjs`'s call
  is untouched); the two new codes are named exactly **`hostname-records-absent`** and
  **`hostname-resolver-lagging`**, both `kind: 'wait'`, each with its catalogue row
  (message plus `Next:` line) and `EXPECTED_KIND`/`SAMPLE_PARAMS` entries in the same
  commit; **`hostname-propagating` is RETIRED**, with a red-first test that no fixture in
  the parameterized set can still produce it; the disagreement fixture (authoritative
  serves, resolver empty) maps to resolver-lagging; records-absent maps to
  records-absent; a fixture with authoritative-present but marker-failing must NOT be
  `live` (the marker pair stays the sole verdict).
- [ ] **Step 2: implement.** `readCurrentRecords` consumes the helper with unchanged
  behavior (its tests are the regression net).
- [ ] **Step 3: gate.**

### Task 3: The fake HTTP plumbing extraction (carry-forward 7)

**Files:** create the shared fake-server helper under `test/`; modify
`test/fake-github.mjs` and `test/fake-cloudflare.mjs` to consume it.

- [ ] **Step 1:** extract with the existing fake suites as the regression net (pass
  unchanged); the helper's own test proves a refusal path still refuses.
- [ ] **Step 2: gate.** Unblocks Tasks 5a/5b/6.

### Task 4a: The hold loop, its policy, and the hostname seam

**Files:** create the hold-loop module beside `src/runner.mjs` plus tests; modify
`src/cloudflare/hostname.mjs` (`cutOverHostname`).

- [ ] **Step 1: the observation contract, typedef'd first.** The loop's product is the
  handoff to the console: a common envelope `{ class, at, cleared, attempt }` plus a
  per-class `detail` (propagation: `{ authoritative, recursive, lowConfidence,
  markerOutcome }`; builds: `{ buildUuid, status, outcome, commitSha }`). The typedef and
  an exported fixture factory live with the loop; Task 5b's fixtures come from that
  factory, never hand-rolled.
- [ ] **Step 2: failing tests first**, injected probe and injected `{ start, stop }`
  server handle, no network: a probe scripted not-clear on polls 1 and 2 and clear on 3
  resumes after exactly 3 probes with the server started once; budget expiry on an
  injected clock returns today's park verbatim (exact row and message equality against
  the no-seam path); a `hostname-not-serving` observation mid-hold is recorded and
  retried, surfacing as today's throw only if still the verdict at expiry; the
  non-interactive refusal oracle (no `waitForClear` invocation, no URL line, return
  before one poll interval) plus the `CAIRN_FORCE_HOLD` override beside a fake base;
  SIGINT and SIGTERM during a hold stop the server handle, persist the loop's findings,
  print the same park row, exit 0, restore disposition after.
- [ ] **Step 3: the hostname seam.** The loop wraps **the pre-redeploy `confirmOrThrow`
  only** (the post-redeploy re-check stays one-shot: a completed redeploy has already
  proven the hostname once, and a park there is rare and terminal as today; assert the
  choice). With the scripted three-poll probe: `attachCustomDomain` called exactly once.
- [ ] **Step 4: gate.**

### Task 4b: The chapter-3 seam

**Files:** modify `src/cloudflare/chapter3.mjs` (`watchAndComplete`'s discovery branch)
plus its tests.

- [ ] **Step 1: failing tests first.** The hold polls **`listBuildsForWorker` only**;
  `kickBuild` and its `updateSite` stay outside the loop (scripted probe: no build on
  polls 1 and 2, a build on 3; `kickBuild` called at most once, `listBuildsForWorker`
  three times). The re-discovery predicate is the same one the branch uses today
  (commit-hash match when the reconcile changed; newest build on the resumed path).
  `build-not-started` becomes this held poll within the build budget, composing with the
  existing `pollBuildToStop` (never a second loop over one build).
- [ ] **Step 2: gate.**

### Task 5a: The console core

**Files:** create `src/console/` (module, render helpers, header, park-page shell) plus
tests; the directory name is load-bearing (AC9's glob entry).

- [ ] **Step 1: failing tests first:** routing over the Task 1 core under the console
  prefix; the one-line chapter/hop header; allowlist rendering (the sentinel sweep over
  every route, error page, and the printed URL line, **proven red first by interpolating
  the record whole**); the serves-during-a-run-only sentence on every page; the exit
  render (no refresh meta, served through the grace window: one fetch or a few seconds,
  then shutdown); render purity (rendering never issues an API or DNS call, asserted by
  a fake-and-resolver pair that fail the test on any request).
- [ ] **Step 2: implement; gate.**

### Task 5b: The views and park pages

**Files:** extend `src/console/` (the three views, park pages) plus tests, consuming
Task 4a's observation factory.

- [ ] **Step 1: failing tests first:** the propagation view from factory observations
  (both answers labeled, `lowConfidence` surfaced, marker outcome shown), including the
  `delegated`-step no-hold fixture (the delegation-park rendering, also the CI probe's
  fixture); the builds view (discovery versus state, queued -> running -> outcome, the
  matched commit); park-page output equality over the enumerated catalogue (**the
  enumeration source is the catalogue module's wait-kind rows, via a small exported
  enumeration added there; completeness proven red by deleting one page**); the display
  cadence per class asserted in the rendered `meta refresh`; the stdin rule (the server
  is closed by the time the hold's caller resumes into any prompting hop).
- [ ] **Step 2: implement; gate.**

### Task 5c: The production wiring

**Files:** modify `src/cloudflare/chapter2.mjs`, `src/cloudflare/chapter3.mjs`, and
`bin.mjs`.

- [ ] **Step 1: failing tests first**, chapter-level: an interactive run's chapter 2
  threads `waitForClear` into `cutOverHostname` and chapter 3 into `watchAndComplete`
  (the seam ARRIVES, asserted with an injected loop recording its invocation); the
  chapter's `log` prints the console URL line exactly once per hold; the hop title
  prints exactly once across a three-poll hold; a `--yes` run composes no loop at all.
- [ ] **Step 2: implement; gate.** After this task, a real interactive run can hold;
  before it, every seam is dead code by design.

### Task 6: Integration tests and the CI probe

**Files:** create the child-process console test under `test/`; modify
`.github/workflows/create-site.yml` and `packages/create-cairn-site/package.json` (the
test-script glob list gains `src/console/`).

- [ ] **Step 1: the child-process test, red first**, targeting the **Builds hold**:
  `spawn` (a stdout line reader resolving on the console URL line, `t.after` killing the
  child; the resume tests' `execFile` idiom cannot fetch mid-run) with the fakes,
  `CAIRN_STATE_DIR` seeded at chapter 3's watch step, `CAIRN_FORCE_HOLD=1`; fetch the
  URL asserting state-derived content; flip the fake's build state; assert the changed
  cell on re-fetch; separately drive SIGINT asserting the park row, exit 0, state save.
- [ ] **Step 2: the CI probe** in `create-site.yml` per the spec's mechanism (same
  fixture, fake base, force seam, packed CLI, two-fetch assertion); existing jobs
  untouched.
- [ ] **Step 3: gate, including the glob addition proven** (a deliberately failing test
  under `src/console/` fails `npm test`, then passes once fixed).

### Task 7: The live proof **[main loop]**

Re-verify the estate first. **The provocation is a local edit** to a reconciled file in
`~/Projects/cairn-scratch/t5-scratch` (the `builds-live` re-entry gates on the local
reconcile hash; a push or kick cannot open it): drift the hash, re-enter with
`--connect`, ride the reconcile (the reauthorize trip) and its push into the held build
watch with the console up. Expect a fresh token paste if the terminal outcome cleared
the saved one. Evidence per hop, raw reads: the console URL line, one re-render showing
state change, the auto-resume line, a `builds/workers/{tag}/builds` read matching the
same `build_uuid`. Record in the pass post-mortem.

### Task 8: Teardown, docs, and pass close **[main loop]**

- [ ] **Step 1: teardown per the Task 8 table** (spec AC10): API-deletable rows
  performed and verified by re-listing; browser-only rows to STATUS's hand-step list;
  the App ledger note updated to five hand-deleted.
- [ ] **Step 2: docs.** The package README's console section (what it is, when it
  serves, during-a-run-only, the non-interactive rule); the `## Unreleased` changelog
  entry; the friction log for surfaced design friction.
- [ ] **Step 3: the pass-end ritual** (`cairn-pass`): code-simplifier; reviewer fan-out
  including, by name, the deletion-test lens; the PR-gating list re-derived with
  `grep -l pull_request`; the four CI-only gates by name; post-mortem here; budgets
  scored; the cold-start clear prep.

## Exit criteria

The spec's ten acceptance criteria, all green, plus: pre-existing tests pass under the
licensed-edit list only, carry-forwards 1 and 7 marked closed in STATUS, and the estate
torn down with the ledger settled.

## Post-mortem (2026-08-13, Opus execution session)

**Built: Tasks 1 through 6, plus four rounds of review and repair.** The console ships over both
held wait classes, with the three extractions (loopback core, DNS helper, fake HTTP plumbing) and
the hostname diagnosis split.

**Tasks 7 and 8 closed later the same night, in a second session** (see the Task 7 and 8
addendum at the end of this post-mortem). The console is live-proven, the estate is torn down,
and every acceptance criterion is met.

**Final gate, verified in the main loop rather than taken from an agent's report.** Package suite
821 pass, exit 0 (701 at pass start). Root `npm run check`: 1601 files, 0 errors, 0 warnings.
`check:docs`: 188 files, every relative link and anchor resolves. PR-gating list re-derived with
`grep -l pull_request .github/workflows/*`: `design`, `e2e`, `create-site`, `scaffold`, `test`.
The `create-site.yml` console probe was extracted verbatim and RUN against HEAD (exit 0, stable
over four consecutive runs), then falsified by reinstating the pre-fix assertion and watching it
fail. Both interrupt shapes were driven against the real packed `bin.mjs` behind a latency proxy.

**The headline, and it is the same lesson as the previous pass wearing different clothes: nine
tasks landed with 801 tests passing and BOTH headline features inert in a real run.** Chapter 2
never threaded a DNS context, so the propagation split (the entire point of carry-forward 1 and
the measured 27-minute defect) could not execute and the park message asserted what an unmade
lookup had shown. The Builds hold cleared the instant a build was FOUND, so the console shut down
exactly when the six-minute build it existed to display began. Park pages were built, tested
against the catalogue, and mounted on no route. The secret-sentinel sweep, which is the security
gate for AC6, rendered through a test-local copy of the view that did its own allowlisting, so it
could never fail for the reason it claimed. Every one of these passed every mechanical gate.

**The dominant defect class, four instances in one pass: a test proves a function while nothing
proves the call path reaches it.** DNS context (chapter 2, then again chapter 3), the park-page
forwarding, and the sentinel sweep were all of this shape. The fix that generalizes: a test for a
wiring must be proven red BY MUTATION, deleting the production argument or forwarding and watching
a named test fail. Round 3 and the tail round adopted that as the standard rather than an
escalation, and it immediately caught that round 2's own chapter-3 DNS fix was unpinned.

**The fixes introduced two regressions of their own, which is worth planning for rather than
treating as a surprise.** Four of the five round-2 fixes touched one hold loop, and the probe race
added for SIGINT responsiveness made `observation === null` reachable at the interrupt path, so an
interrupt before the first probe exited 1 with a TypeError instead of parking. Separately, the
Builds-hold widening updated the in-repo mirror of an assertion and not its copy in
`create-site.yml`, leaving a PR-gating workflow red. Asking the verifier specifically for
regressions introduced by the fixes is what surfaced both.

**A mirrored assertion across a test file and a workflow YAML drifts silently.** The console
scenario exists twice by design (once as an in-repo test, once as the CI probe against the packed
CLI). Nothing links them, so changing the behavior updated one. Any future edit to that scenario
has to touch both, and the only reliable check is extracting the workflow's script and running it.

**Decisions locked this pass.** The hold gate lives in the caller, with `CAIRN_FORCE_HOLD=1`
honored only beside a fake API base. `defaultPark` belongs with the composer, not the loop, since
only the composer knows both the class's earliest honest verdict and the run's own params; chapter
2 supplies `hostname-resolver-lagging` (the attach has already returned, so the record does exist
at the zone's nameservers) and chapter 3 supplies `build-running` or `build-not-started` depending
on whether a uuid is known at hold entry. The interrupt races the in-flight probe rather than
threading an AbortSignal through the probe contract, because decision 6 requires the loop to stop
waiting, not the underlying call to be cancelled.

**Deviations from the plan, all verified against the code rather than followed blind.** Task 1's
four named callers needed zero edits, since the loopback core's boundary sat below them. Task 2's
claimed `chapter3.mjs` outcome-union doc comment did not exist. Task 5b found the plan and spec
contradicting each other on the CI probe's fixture (the plan said the delegated-step propagation
fixture, the spec said a Builds-hold state); the spec governed and the Task 6 dispatch already
specified the Builds fixture, so it resolved without intervention.

**Process notes.** A runaway guard must be retired when its workflow completes, or it alarms on
the finished run; this happened twice. A guard watching `journal.jsonl` reads a legitimately long
agent as a stall, because the journal only ticks on agent transitions; watch the newest
`agent-*.jsonl` mtime instead. `prettier` reformats whole files here, since the repo carries no
`prettierrc` and prettier is in no gate.

**Budgets.** Roughly 4.6M subagent tokens across six workflows (nine task agents, three review
lenses, eight fix agents, three verifiers, one simplifier), plus the main loop. Human interaction
points: zero blocking questions. Geoff opened a design conversation on the Go successor tool of his
own initiative, which is not a defect. One genuine correction he had to prompt: an initial
"separate repo, agreed" was given too quickly and reversed on the evidence when he asked for the
real assessment, which is a defect against the standing rule to answer a design question rather
than agree with it.

## Task 7 and 8 addendum (2026-08-13 night, Opus session)

**Task 7 is proven and Task 8 Step 1 is done.** Full evidence, with the raw reads, is in
[`docs/internal/2026-08-13-t4d-task7-live-proof.md`](../../internal/2026-08-13-t4d-task7-live-proof.md);
the settled teardown table is in
[`docs/internal/2026-08-13-t5-task8-live-e2e.md`](../../internal/2026-08-13-t5-task8-live-e2e.md).
Every acceptance criterion is now met, AC5, AC9, and AC10 included.

**The proof.** Three provocations drifted the local reconcile hash on the inherited `builds-live`
record; each opened the re-entry, rode the reauthorize trip (instant, on an authorized browser
session) and its push into the held build watch. The clean third run captured the whole arc from
one console: 19 samples, `initializing` to `running` to the `Cleared` exit render, the live pages
all carrying the build class's 5-second `meta refresh` and the exit render deliberately carrying
none. The console's rendered `build_uuid` and commit match an independent
`builds/workers/{tag}/builds` read, whose `build_trigger_source` is `push_event`: the reconcile
push triggered the build, no kick. The hold spanned the build in all three runs, each exiting
within seconds of its build settling, which is the live confirmation of the fix round's
"hold across the build, not just its discovery".

**The pass's own headline lesson recurred during the teardown, in the verification rather than
the code.** The first teardown-verification pass read `GET /accounts/{id}/builds/triggers` and
`GET .../builds/repos/connections` and got `12000 Not found` on both, which looks exactly like
"already gone". The rows were live. The T4c spike had already recorded that no connections list
route exists and that triggers list per worker. **A verification reading the wrong route reports
success for the wrong reason**, the same shape as the sentinel sweep that rendered through a
test-local copy of the view. The check that caught it was reading the spike's own findings table
before trusting an empty result.

**A live proof driven by an agent needs a rehearsed harness, and the harness cost two runs.**
The hold gate reads `stdout.isTTY`, so the run needs a pty; `script` provides one, and T5's own
runs 3 and 4 used the same idiom. Three faults, all in the harness and none in cairn: `script`
buffers its typescript unless given `-f`, so a feeder watching the transcript for the paste
prompt never fires; a pty with no window size wraps clack's prompt one character per line, so no
plain grep matches it; and two samplers sharing filenames had one deleting the other's captures.
Answering a clack `password` prompt from a pipe needs a pty, a write that lands after the prompt
attaches, and a writer held open afterwards, since the prompt reads EOF as a cancel. All three
were rehearsed against a standalone prompt before the live run, which is why the first run could
be recovered by hand rather than lost.

**One process note on the credential handoff.** The token arrived damaged twice: once as the
literal placeholder out of the instructions, once wrapped in bracketed-paste escape markers.
Both were caught by checking shape and calling `/user/tokens/verify` before use rather than by
watching the run fail. A file handoff should validate before it drives anything.

**Budgets for this session.** Human interaction points: two (one batched question with two
decisions, plus two exchanges resolving the damaged token file). The token question was
unavoidable, since minting a Cloudflare API token is dashboard-only and neither the estate token
nor wrangler's OAuth session carries `workers_ci`. Three real Workers Builds deploys were spent
on a scratch site that was torn down minutes later, which is the right trade for capturing the
console's state change cleanly rather than claiming it from one sample.
