# create-cairn-site Pass T5: the browser door (template repo plus Deploy button)

> **For agentic workers:** each implementable task is dispatched to `cairn-implementer`
> (pinned Sonnet), test-first. The main loop reviews each diff and confirms the full gate
> (targeted test, `npm run check` 0/0 at the root, `npm test` exit 0 in
> `packages/create-cairn-site`) before the next dispatch. Tasks marked **[main loop]** run in
> the orchestrating session because they are live, browser-bound, or credential-bearing.
> Tasks marked **[spike]** must not be dispatched before Task 2 has answered their question; a
> spike answer of "no" or "unknown" re-plans its dependent task rather than implementing
> against the closest guess. A task instruction naming a concrete code shape, file path, or
> document state is a claim to verify at the first task that touches it, never an instruction
> to follow blind (the T4a/T4b/T4b.1/T4c lesson, four times now).

This plan was amended at the adversarial gate (2026-08-12, three-agent review of the spec and
this plan: wrong-premise, conformance, and deletion-test lenses). The review's findings are
folded into the task text below rather than carried as a separate list; the plan as written
supersedes the pre-review draft. The largest structural change: the sync script now precedes
the spike, so the spike deploys the tree the sync ships, by construction.

**Goal:** ship the browser door: the public `glw907/cairn-waymark-template` repo with the
Deploy-to-Cloudflare button, generated wholesale from the bake plus an overlay, synced by a
post-publish workflow, finished by a printed checklist, plus the live CLI e2e T4c left unrun.

**Architecture:** no new CLI surface and no engine change. One new script
(`sync-template-repo.mjs`) composes the existing bake with a small overlay directory and
pushes the result to the template repo; one workflow job drives it after the npm publish; the
checklist is prose in two places bound by a match test; the rest of the pass is live
verification with evidence.

**Spec:** `docs/superpowers/specs/2026-08-12-create-cairn-site-t5-design.md`, as amended at
the adversarial gate. Task 2 exists to observe the umbrella's button claim; every downstream
copy claim waits for it.

**Prerequisite:** T4c is merged to `main` and this pass runs in a fresh worktree off `main`.
The live e2e proves chapter 3, which exists only post-merge.

## Execution amendment 1: the pass splits (2026-08-13, Geoff)

**Supersedes the task text below wherever they conflict.** Task 2 Step 1's install-and-build check
was rehearsed locally, against a bare fixture remote, before spending a browser session on the live
run. It failed. The synced tree installs and will not build: it imports `previewLoad` and
`PreviewBanner`, which published `@glw907/cairn-cms@0.94.0` does not export. Evidence, scope
(exactly two symbols, measured across all 57 engine imports rather than inferred from the build's
two errors), and why no existing gate could have caught it are in
[`docs/internal/2026-08-13-t5-button-spike.md`](../../internal/2026-08-13-t5-button-spike.md),
Step 1.

**Spec ruling 6 is wrong on its central claim.** It reasoned that moving the strip into the sync is
what makes `npm install && npm run build` reachable before release one. The strip removes the
`@glw907/cairn-cms-dev` devDependency and has no bearing on the engine, so the acceptance criterion
was never reachable as written. The bake emits the showcase's current tree while the emitted engine
spec resolves to the last published version, and the showcase has adopted unpublished-window
features.

**The split.** STATUS already recorded that `create-cairn-site` and the template repo publish in
the same cut as release one, so the repo was always going public then; only this plan's "installable
today" criterion assumed otherwise.

- **T5a, this session:** Task 1, Task 4 Step 1, the guide's three doors (Task 6, with its button
  section naming the door as not yet available and citing the vendor rather than observation), and
  a **new build gate on the sync** (below). The friction-log entry Task 6 owns is triaged here,
  since `--connect` is what resolves it.
- **T5a', at release one:** Task 4 Step 2 (the PAT), Task 5 (create and first-sync the repo),
  Task 7 (the C3 contract), Task 2 (the live button spike), Task 3 (the overlay's spike-derived
  content), Task 6's button section rewritten from observation, and the checklist plus its
  cross-file match test. The T5b brief (Task 9 Step 2) moves with the spike that feeds it.
- **Task 8 (the live CLI e2e) is unaffected by the finding** and stays browser-gated. It is not
  blocked by the split; it is blocked only on Geoff's browser.

**New in T5a, approved with the split: the sync gates on a real build, not only on registry
resolvability.** `npm view` answers whether a spec resolves, which it does; nothing asked whether
the tree builds. A sync that can push an unbuildable tree is the underlying defect, and the weekly
drift cron would never detect it. The gate runs only when a real sync is about to commit, so a
no-op or a `--dry-run` never pays for an install and a build. Its consequence is deliberate: **the
sync now refuses to push until the preview symbols publish**, which is the correct behavior under
the split and makes Task 5 genuinely blocked rather than quietly shipping a broken tree.

Two acceptance criteria in the spec are therefore not met by T5a and move to T5a' with the work
that earns them: the repo existing and building from a clean clone, and the button reaching a
serving `workers.dev` site.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, the existing `bake-template.mjs` /
`emitTemplate` pipeline, git over HTTPS with a fine-grained PAT, GitHub Actions.

## Global Constraints

- The runtime library (`src/lib`) is untouched; `package.json` (root and package) versions are
  untouched. No engine reference page changes.
- **The bake's default invocation throws today** (`@glw907/cairn-cms-dev` is `0.0.0`;
  `assertInstallableSpec` rejects it, and it checks shape, not publication). Every bake this
  pass runs passes explicit `--engine-spec`/`--dev-spec` derived from the root version, the
  way `test.yml` and `create-site.yml` already do, and every `npm pack` of the tool package
  uses `--ignore-scripts` after an explicit bake. No step may rely on `prepack`.
- No secret lands in any repo. The sync credential reaches the script only as the
  **`TEMPLATE_REPO_TOKEN`** environment variable, never argv; the script composes the
  authenticated remote internally and redacts it from all output, asserted by test.
- **Never a force push, anywhere.** The sync replaces the generated tree via a normal commit
  on the template repo's `main`; history accumulates, asserted live by ancestor checks.
- The single source is enforced: no file in the template repo is ever hand-edited; the sync
  regenerates the whole tree. Idempotence, eradication, and the positive controls are
  asserted by the Task 1 test list, not by reading.
- The sync script reuses the existing bake; it never forks or re-implements the emit or
  prune logic. It refuses a github.com remote that is not `cairn-waymark-template` unless
  `--allow-any-remote` is passed (the spike's scratch repo passes it; local fixture paths
  are always allowed).
- Sync-script tests run against local bare-repo fixtures: zero network, no GitHub, no PAT;
  registry resolvability is tested through an injected resolver. No suite may touch the
  operator's desktop (`test/no-desktop.mjs` stays loaded).
- Gallery conventions are read from Cloudflare's current `cloudflare/templates` contribution
  docs at execution time, recorded with URL and date, and **linked, never restated**; if the
  conventions put metadata inside `package.json`, the overlay applies a keyed merge, not a
  file replace.
- Every platform claim written this pass carries a date. Every fixture or copy claim about
  the button flow cites the spike doc.
- Owner-facing copy claims what the spike observed, in the T4b admission-copy register: each
  checklist item names its surface (dashboard page or CLI command) and its cost.
- Production domains, production repos, and the account's existing Builds wiring are
  untouchable. The spike and the e2e use scratch repos, a scratch site, and the scratch
  domain only. The "Cloudflare Workers and Pages" App install for glw907 is not cycled
  (T4c's census: 907-life depends on it). Every scratch artifact lands in the teardown
  table at creation time.
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`); the em dash is
  banned in comments.
- Root `CLAUDE.md` is at its context ceiling; if any step must add there, it trims first.
- Hand steps for Geoff are batched and named per task; every one lands in STATUS's hand-step
  list the moment it is created, not at pass end.

### Task 1: The sync script and overlay skeleton

**Files:** Create `packages/create-cairn-site/scripts/sync-template-repo.mjs` and
`packages/create-cairn-site/scripts/sync-template-repo.test.mjs`; create
`packages/create-cairn-site/template-repo/` holding the overlay skeleton (a placeholder-free
minimal README stating the repo is generated and pre-release, `LICENSE` (MIT),
`.dev.vars.example` with the site's secret names, and the `.gitignore` negation
`!.dev.vars.example`). The overlay's final README prose and gallery metadata land in Task 3,
after the spike; the mechanics land here so the spike can publish through this script.

**Interfaces:** Produces a CLI-invocable script:
`node scripts/sync-template-repo.mjs --remote <url-or-path> [--dry-run]
[--strip-dev-backend] [--engine-spec <spec>] [--dev-spec <spec>] [--allow-any-remote]`,
reading `TEMPLATE_REPO_TOKEN` from env when the remote is HTTPS. Exit 0 on success and on
no-op with **distinct asserted output** (a sync prints the commit sha and changed-file
count; a no-op prints a "no changes" line naming the matched sha); exit 1 with a printed
reason otherwise. Task 2 publishes the spike repo with it; Task 4's workflow and Task 5's
dispatches invoke it exactly as stated here.

- [ ] **Step 1: Failing tests first**, against local bare-repo fixtures, with the
  independent-oracle discipline throughout (the expectation comes from a direct `bake()`
  call in the test, never from a helper the script exports):
  (a) a first sync produces one commit whose tree is bake output plus overlay, with content
  anchors: `wrangler.jsonc` present, the engine dependency matching a caret-version shape, a
  file-count floor, the overlay README replacing the bake's;
  (b) idempotence: a second sync makes no commit, and prints the no-op line;
  (c) the hand-edit trio, each planted in the remote's `main` and **proven present before
  the sync** (positive control): a modified generated file, an added stray file, a deleted
  generated file; all three corrected after, `git rev-list --count` grown by exactly one,
  the pre-sync sha still an ancestor;
  (d) a positive control on change detection: an overlay edit lands as a second commit
  carrying the change;
  (e) `--dry-run` names the files it would change and pushes nothing (the remote ref is
  proven unmoved), and a subsequent real run's commit touches exactly that set;
  (f) the strip: with `--strip-dev-backend`, the dev devDependency, the `dev` script, and
  the dev shim are absent and every other file is byte-identical to the unstripped tree;
  (g) the resolvability gate: with an injected resolver reporting a spec unpublished, the
  sync exits 1 and commits nothing;
  (h) no token substring appears in any output, dry-run or real, when `TEMPLATE_REPO_TOKEN`
  is set on a fixture run;
  (i) `.dev.vars.example` survives into the synced tree (the negation holds);
  (j) a github.com remote other than the template repo is refused without
  `--allow-any-remote`.
- [ ] **Step 2: Implement.** Reuse the bake with explicit specs (Global Constraints); apply
  the overlay; clone, compare, commit, push. Verify `bake-template.mjs`'s export shape
  before wiring; follow the existing scripts idiom for subprocess use.
- [ ] **Step 3: Gate and commit.** Targeted tests, root `npm run check` 0/0, package
  `npm test` exit 0 (the suite is run by `test.yml`, which bakes first; the new test must
  bake its own fixtures rather than assuming a pre-baked `template/`). Commit.

### Task 2: The button spike **[main loop]** (gates Tasks 3, 6, and the T5b brief; needs Geoff's browser)

**Files:** Create `docs/internal/<run-date>-t5-button-spike.md` (dated the day it runs).

The live observation of the umbrella's claim, findings captured verbatim as the pass's copy
and fixture source. Record amendments to this plan in a "Spike amendments" section above
Task 3, superseding task text where they conflict, exactly as T4c did. The spike's floor
(spec): every question ends with a recorded answer or an explicit "unanswered"; every
scratch artifact lands in the teardown table at creation; every gated task is marked cleared
or re-planned by name.

- [ ] **Step 1: Publish the scratch repo through the sync script.** Bake with explicit
  specs, run `sync-template-repo.mjs --remote <scratch> --strip-dev-backend
  --allow-any-remote` against a new public scratch repo (`glw907/cairn-t5-spike`; record
  whether the button actually requires public). First assert
  `npm view @glw907/cairn-cms@<emitted spec> version` resolves, then verify
  `npm install && npm run build` from a clean clone: a broken build would make every button
  observation ambiguous.
- [ ] **Step 2: The button run.** Construct the deploy URL, record the format actually
  honored, and hand Geoff the browser. Capture, with screenshots or transcribed dashboard
  text, the spec's questions 1 through 4 and 8: provisioning of the two D1s and R2 from the
  zero-UUID shape (repo diff plus account listings), the `send_email` binding's fate (the
  vendor doc's auto-provision list, read and dated, predicts skip-or-fail), any
  name-prompting and `wrangler.jsonc` rewriting (repo diff), the `.dev.vars.example` secrets
  prompt and where values land (names-only Worker-secrets API read, plus a full-history
  sweep of the created repo grepped for each pasted value's distinctive prefix; a
  key-presence check is not a sweep), and the plan/authorization/browser-moment ledger.
- [ ] **Step 3: The build and the commands.** Questions 6 and 7: does the deployed site
  build and serve on `workers.dev` (if the build dies, capture the log tail and where; T4c
  proved id-less bindings resolve and its one dead build was token-scope, so a SvelteKit
  build on Builds is genuinely unproven), and what build and deploy commands did the button
  configure (T4c's captured trigger had an empty `build_command`, which against this
  template's gitignored `main` artifact is a deterministic deploy failure).
- [ ] **Step 4: The Builds wiring and the adopt probe.** Question 5: read back the
  connection, trigger, and build token through the same Builds API reads T4c used. Then run
  chapter 3's `--connect` against the button-created site and record whether it adopts or
  recreates the wiring; this is the one observation that can falsify T5b's premise before
  its brief is written.
- [ ] **Step 5: Bank and amend.** Commit the spike doc; write the amendments section; mark
  each gated task cleared or re-planned; state which checklist items the run proved
  necessary; complete the teardown table (the App-selection entry for `cairn-t5-spike` is a
  browser-only Geoff hand step; add it to STATUS's hand-step list now, per Global
  Constraints).

### Task 3: The overlay content **[spike]**

**Files:** Modify `packages/create-cairn-site/template-repo/README.md`; add gallery metadata
files (or the `package.json` merge fragment) per verified conventions; extend
`packages/create-cairn-site/scripts/sync-template-repo.test.mjs`.

- [ ] **Step 0: The conventions, pinned.** Read the current `cloudflare/templates`
  contribution docs; record the URL and date read in the spike-amendments section; state
  the concrete file list and metadata keys they require, so Step 2's tests assert against a
  known answer. Decide ruling 9's README question on the evidence (root README stays the
  overlay's unless conventions let the button and gallery target a non-root document);
  record the decision.
- [ ] **Step 1: The README.** The Deploy button (URL format from the spike, verbatim), what
  the button does and does not do (spike-cited), the completion checklist (first item:
  replace this README with the site README; each item: surface plus cost), the C3
  invocation, the pre-release notice (removed at release one by editing the overlay; that
  obligation is filed in the changelog entry by Task 9).
- [ ] **Step 2: Tests.** Extend the suite: the metadata files or merged keys the
  conventions require are present in the synced tree with the bake's own keys intact, and
  the README's checklist parses as an ordered step list (the structure the checklist-match
  test will read). The cross-file checklist-match test itself lands in Task 6 with the
  guide edit, so the suite never sits red between tasks.
- [ ] **Step 3: Gate and commit.**

### Task 4: The sync workflow

**Files:** Modify or create under `.github/workflows/`: the sync runs as a job downstream of
the npm publish (read `publish.yml` first: its `publish` job is gated by `needs: norms` on
`release: published`; add the sync as a further `needs:` job there, or an equivalent
`workflow_run` chain, whichever the file's shape supports cleanly), plus `workflow_dispatch`
with a strip-flag input, plus a weekly cron invoking `--dry-run` compare mode that **fails
on drift** (the staleness tripwire; a red run reaches Geoff through GitHub's failure
notification).

**Interfaces:** Consumes Task 1's script invocation verbatim, with `TEMPLATE_REPO_TOKEN`
from the Actions secret of the same name. Release path: checkout pinned to the release tag,
no strip flag (the release publishes the dev backend, and the script's own resolvability
gate proves it). Dispatch and cron paths: checkout of `main`, strip flag from the input
(default on until release one).

- [ ] **Step 1: The workflow.** As above; Node pinned to the repo's engines floor; `npm ci`;
  the PAT only in env. No force-push flag exists anywhere in it.
- [ ] **Step 2: The credential's paper trail.** Hand step for Geoff, batched with Task 2's
  browser moment: first the recorded store check (the registry holds `CMS_BOT_PAT`; record
  why it is rejected against the narrow-token rule, or reuse it if the check finds it
  acceptable), then mint the fine-grained PAT (single repo, contents read/write), run
  `secret-set.sh`, add the registry entry **with expiry and rotation date**, set the Actions
  secret. Task 5 does not start until the secret is set.
- [ ] **Step 3: Honest gate and commit.** Root `npm run check` does not parse YAML and no
  workflow linter exists in the repo's gates; say plainly in the commit body that Task 5's
  manual dispatch is this workflow's first real gate, and that the `release: published` path
  stays unproven until release one (a named gap, carried to the post-mortem).

### Task 5: The template repo, created and first-synced **[main loop]**

**Files:** none in this repo. Creates `glw907/cairn-waymark-template` on GitHub. Blocked on
Task 4 Step 2 (the Actions secret).

- [ ] **Step 1: Create the repo** (public, description, no initial commit) with `gh`.
- [ ] **Step 2: First sync by manual dispatch** (strip on). Verify against a named baseline:
  `diff -r --exclude=.git` between a fresh clone and a locally baked tree at a recorded sha
  with recorded specs plus the overlay; record sha, specs, and file count in the
  post-mortem. Then verify `npm install && npm run build` succeeds from that clean clone
  (the acceptance criterion ruling 6 makes reachable).
- [ ] **Step 3: Idempotence and eradication, live.** Dispatch again; verify the no-op line
  and no second commit. Then plant a trivial file via `gh api`, dispatch, and verify: the
  file is gone, the commit count grew by exactly one, the pre-plant sha is still an
  ancestor (the only live proof the single-source claim gets).
- [ ] **Step 4: The button href.** Record the HTTP status and landing-page title of a GET on
  the README's rendered button URL. Do not click through to a second live deploy; the spike
  owns that evidence for the identical tree, and this step records why that identity holds
  (same script, same strip flag).

### Task 6: The guide's three doors **[spike]**

**Files:** Modify `docs/guides/deploy-to-cloudflare.md`; delete the resolved entry from
`docs/internal/docs-friction-log.md`.

- [ ] **Step 1: The three-door framing.** The guide today documents only the manual door;
  T4c's friction-log entry names the gap. The guide gains all three doors (manual,
  `create-cairn-site --connect`, the button) and when to choose each, plus the button
  section: the deploy URL and the completion checklist, same steps as the README with the
  guide carrying the detail; the Workers-plan cost framing follows
  `configure-auth-and-d1.md`'s existing section rather than restating it. Copy cites only
  spike-observed behavior.
- [ ] **Step 2: The friction-log triage.** Delete the resolved entry (complete-or-move);
  verify no other entry in the log now touches this guide.
- [ ] **Step 3: Register, the match test, and gates.** The docs register standard applies;
  Vale's Google package must pass (`guides/` is in scope). Add the checklist-match test now
  (it reads the overlay README and this guide and asserts the two checklists' step headings
  match as an ordered set) and see it pass; `npm run check` 0/0. Verify the tutorial and readiness guide only if their current copy
  contradicts the three-door story; do not add pointers for symmetry. Commit.

### Task 7: The C3 contract, verified live **[main loop]**

**Files:** evidence into the pass post-mortem; no code expected. Depends on Task 5 (the real
synced repo), not on the spike.

- [ ] **Step 1:** `npm create cloudflare -- --template glw907/cairn-waymark-template` into a
  scratch directory, against the real repo. Record the exact invocation and what C3 prompts
  for, then assert the resulting tree **installs and builds** (the strip makes this
  reachable pre-release). If C3 refuses the repo shape, that is a Task 3 amendment (overlay
  structure), not a documentation note.

### Task 8: The live CLI e2e **[main loop]** (the T4c fold; needs Geoff's browser)

**Files:** evidence per hop into the pass post-mortem; teardown-table additions marked
"after T4d".

- [ ] **Step 1: Preconditions and the honest tarball.** Confirm `~/.config/cairn/sites` is
  empty (a cold run is the point) and T4c is merged. Bake explicitly with recorded specs at
  the tested commit, `npm pack --ignore-scripts`, then verify the tarball's freshness before
  the run: `tar -tf` file count matches the fresh bake, and the packed tree carries one
  string introduced by this pass's bake. Record all three. The scaffolded site's
  dev-backend dependency is satisfied the way `create-site.yml` does it (pack the dev
  backend locally, `file:` rewrite), recorded as the pre-release workaround it is.
- [ ] **Step 2: The no-fake preflight.** Record that no fake is in the loop: the
  fake-server environment variables absent from the process env, and the resolved GitHub
  and Cloudflare API base URLs logged. Every hop's evidence in this task is a raw read from
  the real service; a hop that cannot run live is named as a gap in T4c's "Not verified"
  register, never counted proven.
- [ ] **Step 3: Chapters 1 through 3, cold.** A scratch site on the scratch domain:
  scaffold, GitHub chapter (this mints the **fifth** GitHub App; the App creation and OAuth
  trips are Geoff's browser moments, batched), chapter 2 to a terminal step, chapter 3
  through connect, trigger, reconcile (the `reauthorize` trip, the one surface no fake has
  proven), and the build watch to `builds-live` with the marker checks passing. Each hop:
  state-record transition plus the raw read. A park records the park, the printed re-entry
  command, and the resume.
- [ ] **Step 4: Preserve, do not tear down.** The e2e estate (site, App, saved state)
  persists for T4d (spec ruling 1); every artifact joins the teardown table marked "after
  T4d"; STATUS's App ledger ticks to five.

### Task 9: Teardown, T5b brief, records, and pass close **[main loop]**

**Files:** Modify `docs/superpowers/specs/2026-08-12-create-cairn-site-t5-design.md` (the
T5b brief lands as a dated addition), `ROADMAP.md`, `docs/STATUS.md`, `CHANGELOG.md`
(`## Unreleased`), this file (post-mortem); the spike doc's teardown table gains its
verified column.

- [ ] **Step 1: The spike-estate teardown** (spec ruling 7): the scratch repo, the button's
  provisioned resources, the spike Worker, wiring, and build token. Verify by re-listing,
  never by trusting deletes. The App-selection removal and any other browser-only step stay
  on STATUS's hand-step list for Geoff, already filed at creation time.
- [ ] **Step 2: The T5b brief.** Written from the spike's findings, including the adopt
  probe's direct observation, into the spec's T5b section: what the button leaves undone,
  the admission states, the dedupe obligations, the park shapes, and its queue slot (after
  T4d unless argued otherwise). If the button leaves nothing material undone, the brief
  says so and T5b dies; that outcome is legitimate.
- [ ] **Step 3: Records.** ROADMAP: T5's line moves to done; the gallery submission and T5b
  filed into the tiers where they bite. STATUS: next action points at T4d with the
  estate-reuse note; browser-moment counts, the App ledger, and the hand-step list settle.
  CHANGELOG (`## Unreleased`): the template repo, the sync workflow, and the two
  release-checklist obligations ruling 6 names (drop the strip flag; drop the pre-release
  notice), stated as `Consumers must:`-adjacent release notes so `cairn-release` cannot
  miss them.
- [ ] **Step 4: The pass-end ritual** (`cairn-pass`): `code-simplifier` over the changed
  code; the reviewer fan-out **including, by name, the deletion-test lens** ("would this
  still pass if the feature were deleted"), which caught T4c's worst defect and this pass's
  pre-review root defect; the CI gate list re-derived with
  `grep -l pull_request .github/workflows/*`; post-mortem in this file; budgets scored;
  cold-start test for the context clear.
