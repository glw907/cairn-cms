# create-cairn-site Pass T4c: Builds connect plus deploy-config reconciliation

> **For agentic workers:** each task is dispatched to `cairn-implementer` (pinned Sonnet),
> test-first. The main loop reviews each diff and confirms the full gate (targeted test,
> `npm run check` 0/0 at the root, `npm test` exit 0 in `packages/create-cairn-site`) before
> the next dispatch. Tasks marked **[spike]** must not be dispatched before Task 1 has
> answered their question; a spike answer of "no" or "unknown" re-plans its dependent task
> rather than implementing against the closest guess. A task instruction naming a concrete
> code shape, property path, or document state is a claim to verify at the first task that
> touches it, never an instruction to follow blind (the T4a/T4b/T4b.1 lesson, three times).

**Goal:** take a scaffolded site from chapter 2's finish (or `--connect` from any state at or
past `live`) to push-to-deploy: repo connected to Workers Builds, deploy-learned config
reconciled into the repo, and the first Builds deploy watched to success.

**Architecture:** a third chapter on the existing step and state-machine idiom
(`builds-connected` → `config-reconciled` → `builds-live`), reusing T4a's REST seam, prefill,
catalogue, runner, and state store, plus chapter 1's OAuth authorize trip and Git Data API
push machinery for the reconcile commit. No new subsystem; no engine change.

**Spec:** `docs/superpowers/specs/2026-08-12-create-cairn-site-t4c-design.md`. Its platform
claims are dated 2026-08-12 and Task 1 re-verifies every one this pass leans on.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, `@clack/prompts`, the Cloudflare REST API v4
(`/accounts/{id}/builds/*`), the GitHub REST and Git Data APIs.

## Global Constraints

- The runtime library (`src/lib`) is untouched. No engine reference page changes.
- No secret lands under the project directory. The pasted token lives only in the 0600 state
  record and never appears in argv. The OAuth user token is a local variable, never persisted.
- The token is deleted when chapter 3 reaches a terminal state (`builds-live`, or a recorded
  connect decline). A park is not terminal and keeps the token. Early clearing only on
  `token-scope-missing` / `token-invalid`, read at `error.cause.catalogue.code` outside
  `runStep` (the `runner.mjs` rewrap).
- Only the chapter orchestration writes `step` or calls the state store; step functions are
  pure over the in-memory record.
- A `wait` row is returned, exits 0, and prints the re-entry command. A `declined` row is
  returned and exits 0. Only `act` and `ask-someone` rows throw and exit 1.
- Every exit prints a next step. Every wait prints a heartbeat.
- Builds state lives as **flat keys under `cloudflare`** (`buildsConnectionUuid`,
  `buildsTriggerUuid`, `buildsLastBuildUuid`, `buildsLastBuildOutcome`), never a nested
  object: `updateSite`'s merge is one level deep, and T4b already locked this rule.
- Read before write for every non-idempotent Cloudflare call: list and adopt before any PUT
  or POST (the T4b.1 rule; `ensureZone` and `ensureSendingDomain` are the exemplars).
- `--dry-run` prints the whole chapter and performs none of it: zero shell-outs, zero network.
- No suite may touch the operator's desktop (the PATH-controlled `openBrowser` pattern;
  `test/no-desktop.mjs` stays loaded).
- Every fake fixture body is copied verbatim from a response Task 1 captured; anything
  unobservable is called out in-file (the standing `fake-cloudflare.mjs` discipline).
- Owner-facing copy claims what the tool observed (a build succeeded, the site answers),
  never delivery-class promises. Cost copy states the Builds free tier (3,000 build-minutes
  a month, 1 concurrent build) with its date.
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`); the em dash is
  banned in comments.
- Production domains and production repos are untouchable. The live e2e uses the scratch
  domain and a scratch site only.
- Root `CLAUDE.md` is at its context ceiling; if any step must add there, it trims first.

### Task 1: The spike (main loop; gates Tasks 3, 6, 7; one sitting)

**Files:** Create `docs/internal/2026-08-12-t4c-builds-spike.md`.

Run against the real glw907 account with a token minted for exactly **Workers Builds
Configuration: Edit** plus **Workers Scripts: Read** (user-scoped). Capture every response
body verbatim into the spike doc as the pass's fixture source. Record amendments to this
plan in a "Spike amendments" section above Task 2, superseding task text where they
conflict, exactly as T4b did.

- [ ] **Step 1: The token path.** Mint the token, then `GET
  /accounts/{id}/builds/workers/{tag}/builds` (or the cheapest read the reference names)
  against a real Worker. This settles the open community report of a blanket 401
  (`code 12006`) on `/builds/*`. **If the refusal reproduces with correct permissions, the
  pass stops here and reports; nothing downstream is built against a broken platform path.**
- [ ] **Step 2: Existing-usage census, before any uninstall.** Enumerate the account's
  existing Builds connections and triggers, and check whether the "Cloudflare Workers and
  Pages" GitHub App is already authorized for glw907. If any production site uses Builds,
  the App is **not** uninstalled at any point and Step 3's refusal capture is recorded as
  unobservable in the fixtures.
- [ ] **Step 3: The not-authorized refusal.** On a context without the App authorized
  (uninstall temporarily only if Step 2 proved nothing depends on it, and reinstall after),
  attempt the connections PUT and capture the exact HTTP status and error body. This is the
  park row's trigger fixture.
- [ ] **Step 4: `config_autofill` for a real cairn scaffold repo**, raw JSON, plus the
  connections PUT success body, the build-tokens read, the trigger create, a manual build
  kick, one full build poll to `stopped`, and the logs read. These are Tasks 3 and 4's
  fixture set.
- [ ] **Step 5: The raw GitHub install link.** Record whether an installation created via
  `github.com/apps/cloudflare-workers-and-pages/installations/new` is visible to the
  connections API. If unproven, the dashboard link stands in all copy.
- [ ] **Step 6: The prefill keys.** Verify the Builds permission-group key names against the
  live dashboard prefill template (the template silently drops unrecognized keys). Record
  the exact `permissionGroupKeys` strings Task 6 will ship.
- [ ] **Step 7: Bank the doc and amend the plan.** Commit the spike doc; write the
  amendments section; state plainly which dependent tasks are cleared.

### Task 2: The catalogue: the Builds rows

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/catalogue.mjs` (+ its test)

**Interfaces:**
- Produces catalogue codes consumed by Tasks 3, 7, 8: `builds-app-not-authorized` (wait:
  prints the dashboard authorization link and the re-run command), `builds-connect-declined`
  (declined: records the choice, exits 0, names `--connect` as the way back in),
  `build-running` (wait: the poll budget elapsed with the build still `queued` or `running`;
  prints the re-run command), `build-failed` (act: carries the final log lines and the
  dashboard deep link; covers `fail` and `terminated`), `build-not-runnable` (act: covers
  `skipped` and `cancelled`, naming which and pointing at the dashboard).

- [ ] **Step 1: Failing tests.** Every new row builds and carries the right `kind`; every
  row's message ends in exactly one `Next:` line; `CATALOGUE_CODES` coverage stays exact.
  Message text follows Task 1's captured wording where a row quotes the platform.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 3: The API seam's Builds routes **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/api.mjs` (+ its test)

**Interfaces:**
- Consumes: `makeApi(token)` and the existing v4 envelope handling and 403 discrimination
  in `api.mjs` (verify the T4b email-403 tie-break shape before extending it).
- Produces, for Task 7: `listBuildConnections(api, accountId)`,
  `putBuildConnection(api, accountId, repo)` (repo = `{providerAccountId,
  providerAccountName, repoId, repoName}`), `listBuildTriggers(api, accountId)` and
  `createBuildTrigger(api, accountId, trigger)`, `getBuildToken(api, accountId)`,
  `findWorkerTag(api, accountId, workerName)`, `kickBuild(api, accountId, triggerUuid,
  branch)`, `getBuild(api, accountId, buildUuid)`, `getBuildLogs(api, accountId,
  buildUuid)`. Exact names may be simplified at implementation; the plan's names are the
  reference for Task 7's dispatch.

- [ ] **Step 1: Failing tests** against the fake, using Task 1's captured bodies: each read
  and write; the not-authorized refusal mapping to `builds-app-not-authorized` rather than
  the generic 403 `token-scope-missing` rule (a discriminator ahead of the blanket rule,
  the T4b amendment-12 shape, keyed on whatever Task 1's captured refusal actually carries);
  a genuinely underscoped token still mapping to `token-scope-missing`.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 4: The fakes: Builds routes and the GitHub id lookup

**Files:**
- Modify: `packages/create-cairn-site/test/fake-cloudflare.mjs` (+ its test)
- Modify: `packages/create-cairn-site/test/fake-github.mjs` (+ its test)

**Interfaces:**
- Produces: fake-cloudflare routes for connections (list/PUT), triggers (list/create),
  build tokens, worker-scripts list (with `tag`), build kick, build read (scriptable
  status sequence so a poll test can walk `queued` → `running` → `stopped` and set
  `build_outcome`), and logs; a `failNext`-style not-authorized toggle. Fake-github gains
  `GET /repos/{owner}/{repo}` returning `.id` and `.owner.id` if the existing route does
  not already carry them.
- No third fake server: Builds routes join the existing fake-cloudflare server; the
  plumbing-extraction trigger stays unfired (filed for T4d).

- [ ] **Step 1: Failing tests.** Each route's success and its refusal variant; the build
  status sequence is drivable per test; fixture bodies match Task 1's captures with
  unobservable shapes flagged in-file.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 5: The reconcile: local config writes, the OAuth trip, and the diff commit

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/config.mjs` (+ test): `writeAccountId`
- Create: `packages/create-cairn-site/src/github/reconcile.mjs` (+ test)
- Modify (as needed, reuse-first): `packages/create-cairn-site/src/github/install.mjs`,
  `packages/create-cairn-site/src/github/repo.mjs`

**Interfaces:**
- Consumes: the persisted `github` record (`clientId`, `clientSecret`, `installationId`,
  `repo`), `loopback.mjs`, the authorize-and-exchange halves of `install.mjs`, and
  `repo.mjs`'s Git Data helpers. **Reuse or extract; do not copy.** The implementer
  verifies the real exported shapes first (the plan's function names are claims).
- Produces, for Task 8: `writeAccountId(dir, accountId)` (idempotent rewrite of
  `wrangler.jsonc`, preserving comments and formatting like `writePublicOrigin` does);
  `reconcileRepo({record, dir, userToken})` returning `{changed: boolean, commitSha?}`,
  which fetches the repo's current `wrangler.jsonc` and `src/theme/cairn.config.ts`,
  compares to disk, and when different commits both in one Git Data commit (fixed message
  sentinel, e.g. `cairn: reconcile deploy config`) and updates the default-branch ref; and
  `collectUserToken({record, loopback})` running the authorize trip against the site's own
  App and returning the short-lived token without persisting it.

- [ ] **Step 1: Failing tests for `writeAccountId`**: adds the field when absent, replaces
  when present, is byte-stable on re-run, and the result still parses as JSONC.
- [ ] **Step 2: Failing tests for `reconcileRepo`** against fake-github: a differing file
  commits (one commit, two files, sentinel message, ref advanced); an identical repo
  returns `{changed: false}` with zero write calls (asserted via the fake's invocation
  log); a repo file missing entirely is treated as differing.
- [ ] **Step 3: Failing test for `collectUserToken`**: the trip round-trips against
  fake-github's authorize redirect and the token never appears in the state file afterward
  (re-read the record from disk and sweep for the token string, the falsifiable-probe
  discipline).
- [ ] **Step 4: Implement; suite green; commit.**

### Task 6: The prefill extension **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/prefill.mjs` (+ its test)

**Interfaces:**
- Consumes: Task 1 Step 6's verified key strings.
- Produces: `PREFILL_PERMISSION_KEYS` extended with the Builds keys for Task 7's prefill
  trip; the URL-shape test updated. The chapter-2 key set must be unchanged for a
  chapter-2 run (chapter 3 re-runs the prefill with its own set; verify whether the seam
  takes a per-call key list or needs one adding, and prefer the smallest seam change).

- [ ] **Step 1: Failing tests.** The chapter-3 prefill URL carries the verified Builds keys;
  the chapter-2 URL is unchanged.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 7: Chapter 3 spine: admission, token, connect, trigger **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/chapter3.mjs` (+ test)

**Interfaces:**
- Consumes: Tasks 2, 3, 6; the state store; the runner; `ensureAccountId`.
- Produces: `runChapter3({record, ...seams})` advancing `step` through `builds-connected`,
  with `STEP_ORDER` and `TERMINAL_STEPS` (`builds-live`) exported for `bin.mjs`; flat
  state keys per the global constraint, one hop per write; deliverables for Task 8 to
  extend (the module owns the whole chapter; Task 8 adds the later hops).

- [ ] **Step 1: Failing admission tests.** Interactive consent proceeds; a decline records
  `builds-connect-declined`, exits 0, keeps the site untouched, and names `--connect` as
  the way back; the admission copy states the one-time App authorization, the single token
  paste, and the free-tier figures with their date; `--yes` consents silently and reads
  `CAIRN_CF_API_TOKEN`.
- [ ] **Step 2: Failing connect tests.** Repo ids resolve from the record plus the GitHub
  lookup; an existing connection is adopted with zero PUTs (invocation-log assertion); the
  not-authorized refusal parks (`builds-app-not-authorized`, exit 0, dashboard link
  printed) and a re-run after the fake flips to authorized proceeds without repeated
  writes.
- [ ] **Step 3: Failing trigger tests.** The Worker tag resolves by the name in the local
  `wrangler.jsonc`; a matching existing trigger is adopted; a created trigger carries the
  default branch only, the scaffold's build command, and the default deploy command;
  `buildsConnectionUuid`/`buildsTriggerUuid` land on the record and `builds-connected` is
  recorded once, after the trigger.
- [ ] **Step 4: Implement; suite green; commit.**

### Task 8: Chapter 3 finish: reconcile, watch, completion, and the wiring

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/chapter3.mjs` (+ test)
- Modify: `packages/create-cairn-site/src/args.mjs`, `packages/create-cairn-site/bin.mjs`
  (+ tests)

**Interfaces:**
- Consumes: Task 5's `writeAccountId`, `reconcileRepo`, `collectUserToken`; Task 3's build
  read/kick/logs; the marker checks used by the T4a cutover (reuse the existing live-check
  helper, verify its real name in `hostname.mjs` before dispatch).
- Produces: the finished chapter; `--connect` as a real flag; the `bin.mjs` fall-through.

- [ ] **Step 1: Failing reconcile-hop tests.** `writeAccountId` runs before the diff; a
  differing repo triggers exactly one OAuth trip and one commit and records
  `config-reconciled`; an identical repo skips the OAuth trip entirely (zero authorize
  calls in the fake's log) and, when no successful build is recorded, kicks a manual
  build; the commit push is not followed by a manual kick (one build, not two).
- [ ] **Step 2: Failing watch tests.** The poll walks the fake's status sequence with a
  heartbeat; `success` re-runs the marker checks and records `builds-live` and deletes
  `apiToken` (disk re-read assertion); `fail` surfaces `build-failed` carrying the fake's
  log tail; a budget-exceeded poll parks as `build-running` (exit 0) and a re-run resumes
  polling the same build rather than kicking another.
- [ ] **Step 3: Failing entry and wiring tests.** The fall-through enters chapter 3 after
  `email-live` and after `paid-plan-declined`; `--connect` enters from `live` and from
  `domain-live`, refuses below `live` naming what must finish first, and is a stated no-op
  at `builds-live`; `--start-over` from any chapter-3 state refuses naming the connection,
  trigger, and live site; `--dry-run` prints every chapter-3 hop with zero shell-outs and
  zero network (extend the existing dry-run suite pattern).
- [ ] **Step 4: Failing completion-copy tests.** The closing copy names push-to-deploy on
  the default branch, the admin URL, and claims only what was observed; a later re-entry
  needing Builds writes re-runs the prefill and says so.
- [ ] **Step 5: Implement; suite green; commit.**

### Task 9: The live e2e (main loop plus Geoff's moments, scratch domain)

- [ ] **Step 0: Enumerate what exists before assuming** (the T4b amendment-11 lesson):
  list `~/.config/cairn/sites`, the scratch domain's zone state, the account's Builds
  connections, and whether the App authorization survives from Task 1. Adapt the run plan
  to what is actually there and record the delta in the run notes.
- [ ] **Step 1: Run the chapters to chapter 3's admission** on a fresh scratch site
  (chapter 1's two browser moments; chapter 2 on the already-active zone takes the adopt
  short-circuit; email may be declined to prove the `paid-plan-declined` fall-through if
  faster, or completed if the domain's sending state allows; either terminal is a valid
  chapter-3 entry and the choice is recorded).
- [ ] **Step 2: Run chapter 3 end to end**: token paste (Builds keys), connect (capturing
  the App-authorization park live if the App is not yet authorized), trigger, reconcile
  commit (the OAuth click), and the watched first build to `success` with the marker
  checks passing. Count and record every browser moment for Pass D's docs.
- [ ] **Step 3: Prove push-to-deploy once more without the tool**: make a trivial commit
  through the GitHub UI (or API) and confirm a second build fires and deploys with no
  local involvement. This is the umbrella's actual promise, observed.
- [ ] **Step 4: Tear down and verify by listing**: delete the trigger and connection by
  uuid, retire the site per the standing teardown (Worker, D1, R2, repo), leave the App
  authorization in place (recorded), and add the run's GitHub App to the hand-delete list
  for the pass report.

### Task 10: Docs, tracking, and pass close

**Files:** `packages/create-cairn-site/README.md`, `CHANGELOG.md`, chapter 2's closing
copy, `ROADMAP.md`, `docs/STATUS.md`, this plan (post-mortem).

- [ ] **Step 1: README**: the chapter's section (`--connect`, the park-and-resume story,
  the token lifecycle, the one-time App authorization as the single manual step, the
  free-tier figures with their date).
- [ ] **Step 2: Changelog** under `## Unreleased` (non-breaking; no `Consumers must:`
  line), and chapter 2's closing copy gains the forward pointer to `--connect`.
- [ ] **Step 3: Roadmap and carry-forwards.** Mark the umbrella's push-to-deploy item as
  shipped where the roadmap carries it; re-verify STATUS carry-forward numbering against
  the current file before retiring anything (the numbering trap, three times now).
- [ ] **Step 4: Run the full gate** including the four CI-only checks by name
  (`check:comments`, `check:reference:signatures`, `check:surface`, `check:snippets`),
  run `code-simplifier` over the pass's changed code, and commit.
- [ ] **Step 5: Post-mortem in this file; STATUS updated** (T4c done; next is the T4d
  planning input); prep the context clear per the pass ritual, including branch topology
  if the merge is deferred.

## Exit criteria

The spec's acceptance criteria, verified with evidence in the post-mortem: connect and
trigger adopted-not-recreated on re-run; the repo's two config files matching disk
including `account_id` and current `PUBLIC_ORIGIN` via an admin-attributed commit; a
watched first build to `success` with marker checks passing; both parks exiting 0 and
resuming; the pasted token 0600 during the chapter and absent everywhere after
`builds-live`; the OAuth token never persisted; every new catalogue row triggered by a
test; `--dry-run` clean; the runtime library untouched; suite green at the full gate.
