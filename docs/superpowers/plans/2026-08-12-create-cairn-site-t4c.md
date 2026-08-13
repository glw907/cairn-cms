# create-cairn-site Pass T4c: Builds connect plus deploy-config reconciliation

> **For agentic workers:** each task is dispatched to `cairn-implementer` (pinned Sonnet),
> test-first. The main loop reviews each diff and confirms the full gate (targeted test,
> `npm run check` 0/0 at the root, `npm test` exit 0 in `packages/create-cairn-site`) before
> the next dispatch. Tasks marked **[spike]** must not be dispatched before Task 1 has
> answered their question; a spike answer of "no" or "unknown" re-plans its dependent task
> rather than implementing against the closest guess. A task instruction naming a concrete
> code shape, property path, or document state is a claim to verify at the first task that
> touches it, never an instruction to follow blind (the T4a/T4b/T4b.1 lesson, three times).

This plan was amended at the adversarial gate (2026-08-12, three-agent review of the spec
and this plan). The review's blockers are folded into the task text below rather than
carried as a separate amendments list; the plan as written supersedes the pre-review draft.

**Goal:** take a scaffolded site from chapter 2's finish (or `--connect` from an allowlisted
state at or past `live`) to push-to-deploy: repo connected to Workers Builds, deploy-learned
config reconciled into the repo, and the first Builds deploy watched to success.

**Architecture:** a third chapter on the existing step and state-machine idiom
(`builds-connected` → `config-reconciled` → `builds-live`, plus `builds-connect-declined`),
reusing T4a's REST seam, prefill, catalogue, runner, and state store, plus
`src/github/oauth.mjs`'s `reauthorize` and a `base_tree` Git Data commit for the reconcile.
No new subsystem; no engine change.

**Spec:** `docs/superpowers/specs/2026-08-12-create-cairn-site-t4c-design.md`. Its platform
claims are dated 2026-08-12 and Task 1 re-verifies every one this pass leans on.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, `@clack/prompts`, the Cloudflare REST API v4
(`/accounts/{id}/builds/*`), the GitHub REST and Git Data APIs.

## Global Constraints

- The runtime library (`src/lib`) is untouched. No engine reference page changes.
- No secret lands under the project directory. The pasted token lives only in the 0600 state
  record and never appears in argv. The OAuth user token is a local variable, never persisted.
- The chapter-3 token key set is the **union** of the five verified T4a keys plus the Builds
  keys (spec ruling 1): the seam validates with `listZones`, and the saved token must stay
  adoptable by a later chapter-2 re-entry.
- The token is deleted when chapter 3 reaches a terminal state (`builds-live` or
  `builds-connect-declined`). A park is not terminal and keeps the token. Early clearing only
  on `token-scope-missing` / `token-invalid`, read at `error.cause.catalogue.code` outside
  `runStep` (the `runner.mjs:58` rewrap).
- Only the chapter orchestration writes `step` or calls the state store; step functions are
  pure over the in-memory record. Token deletion reuses chapter 2's `deleteApiToken`
  (currently unexported in `chapter2.mjs`; export or lift it, never re-implement it — its
  reload-before-rebuild behavior is load-bearing).
- A `wait` row is returned, exits 0, and prints the re-entry command. A `declined` row is
  returned and exits 0. Only `act` and `ask-someone` rows throw and exit 1.
- Every exit prints a next step. Every wait prints a heartbeat.
- Builds state lives as **flat keys under `cloudflare`** (`buildsConnectionUuid`,
  `buildsTriggerUuid`, `buildsLastBuildUuid`, `buildsLastBuildOutcome`), never a nested
  object: `updateSite`'s merge is one level deep, and T4b already locked this rule.
- **The reconcile commit always passes `base_tree`** (the repo's current head tree) and
  touches only the two tool-owned files. `pushScaffold`'s full-tree shape is correct for a
  first push and destructive here; a reconcile built like it wipes the repo.
- `--yes` never opens a browser: the browser-bound reconcile hop parks with a wait row
  (spec ruling 6).
- Read before write for every non-idempotent Cloudflare call: list and adopt before any PUT
  or POST (the T4b.1 rule; `ensureZone` and `ensureSendingDomain` are the exemplars).
- New catalogue codes must not collide with existing ones (`build-failed` is already
  chapter 1's local-build row), proven by a count assertion, not by reading.
- `--dry-run` prints the whole chapter and performs none of it: zero shell-outs, zero network.
- No suite may touch the operator's desktop (the PATH-controlled `openBrowser` pattern;
  `test/no-desktop.mjs` stays loaded).
- Every fake fixture body is copied verbatim from a response Task 1 captured; anything
  unobservable is called out in-file (the standing `fake-cloudflare.mjs` discipline).
- Owner-facing copy claims what the tool observed. The completion says content commits
  deploy themselves; it does not claim the laptop is disposable, because engine migrations
  still run through the CLI, and the README carries that caveat. Cost copy states the
  Builds free tier (3,000 build-minutes a month, 1 concurrent build) with its date.
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`); the em dash is
  banned in comments.
- Production domains and production repos are untouchable. The live e2e uses the scratch
  domain and a scratch site only.
- Root `CLAUDE.md` is at its context ceiling; if any step must add there, it trims first.

### Task 1: The spike (main loop; gates Tasks 2, 3, 4, 6, 7; one sitting)

**Files:** Create `docs/internal/2026-08-12-t4c-builds-spike.md`.

Run against the real glw907 account with a token minted from the union key set (Global
Constraints). Capture every response body verbatim into the spike doc as the pass's fixture
source. Record amendments to this plan in a "Spike amendments" section above Task 2,
superseding task text where they conflict, exactly as T4b did.

- [ ] **Step 1: The token path.** Mint the token, then the cheapest documented `/builds/`
  read against a real Worker. This settles the open community report of a blanket 401
  (`code 12006`) on `/builds/*`. **If the refusal reproduces with correct permissions, the
  pass stops here and reports; nothing downstream is built against a broken platform path.**
- [ ] **Step 2: Existing-usage census, before any uninstall.** Enumerate the account's
  existing Builds connections and triggers, and whether the "Cloudflare Workers and Pages"
  GitHub App is authorized for glw907. If any production site uses Builds, the account's
  App install is not touched at any point.
- [ ] **Step 3: Both refusal shapes, scratch context first.** Capture the connections PUT
  refusal (a) with the App not authorized at all and (b) with the App authorized but the
  repository not selected. Prefer a scratch GitHub org or account (T2 created one) so the
  glw907 install is never cycled; fall back to a temporary uninstall only if Step 2 proved
  nothing depends on it; record either shape as unobservable in the fixtures if it cannot
  be produced safely.
- [ ] **Step 4: The API surface for fixtures.** Capture `config_autofill` for a real cairn
  scaffold repo, the worker-scripts list with its `tag`, the build-tokens read — including
  whether a clean account has any token and whether any create route exists (if the list
  can be empty with no API-side create, Task 2's `builds-no-build-token` wait row is real;
  if not, it is dropped by amendment) — the connections PUT success, the trigger create, a
  manual build kick, one full poll to `stopped` (noting `initializing`), and the logs read.
- [ ] **Step 5: The id-less-binding probe, before anything is built on it.** Kick one
  manual build against a minimal scratch repo carrying a cairn-shaped `wrangler.jsonc`
  (id-less D1 bindings, no `account_id`) and read the deploy log: does the Builds
  container's `wrangler deploy` resolve auto-provisioned bindings non-interactively, and
  does it require `account_id` in the config? The whole pass rests on this; a "no" on the
  first question re-plans the pass, and the second question decides what `writeAccountId`
  must produce.
- [ ] **Step 6: The prefill keys.** Verify the Builds permission-group key names against
  the live dashboard prefill template. Only the new keys are owed (the five T4a keys were
  confirmed 2026-08-11, recorded in `prefill.mjs`). Record the exact `permissionGroupKeys`
  strings Task 6 will ship. Opportunistic, not required: if a scratch context from Step 3
  is handy, note whether an install made through the raw GitHub link
  (`github.com/apps/cloudflare-workers-and-pages/installations/new`) is visible to the
  connections API, for the copy upgrade ruling 5 leaves open.
- [ ] **Step 7: Bank the doc and amend the plan.** Commit the spike doc; write the
  amendments section; state plainly which dependent tasks are cleared.

## Spike amendments (2026-08-12, Task 1 complete; these supersede the task text below)

Full evidence, every captured body, and the teardown list:
`docs/internal/2026-08-12-t4c-builds-spike.md`. **Task 1's stop condition did not fire** (the
`12006` report does not reproduce), so Tasks 2, 3, 4, 6, and 7 are cleared. Where an amendment
conflicts with a task's text, the amendment wins.

1. **The permission is `Workers CI`; the template key is `workers_ci`**, verified filling its
   row on the live dashboard. The spec's "Workers Builds Configuration" does not exist.
2. **The union key set is EIGHT keys**: the five T4a keys (`zone`, `dns`, `workers_scripts`,
   `ssl_and_certificates`, `email_sending`) plus `workers_ci`, `d1`, and `workers_r2`. A Builds
   deploy resolves cairn's id-less bindings by calling the D1 and R2 APIs directly, so a token
   without them fails the deploy. **D1 is observed; R2 is inferred** (the failing build died at
   the first D1 binding and never reached the bucket). Say which is which in `prefill.mjs`.
   `d1` and `workers_r2` still owe one live dashboard confirmation before ship.
3. **`writeAccountId` is DELETED from Task 5.** A Builds deploy does not need `account_id`;
   wrangler resolves the account from the build token. Task 5's remaining deliverables are
   `reconcileRepo` and the OAuth call path. Task 8 Step 1 drops "`writeAccountId` runs before
   the diff". If it was already built, remove it.
4. **`builds-no-build-token` is DELETED** (Task 2's row; Task 7 Step 3's park test).
   `POST /builds/tokens` requires `build_token_name`, `build_token_secret`, and
   `cloudflare_token_id`: it registers a token the caller already holds rather than minting
   one. **The chapter registers the admin's own pasted token as the build token**, taking
   `cloudflare_token_id` from `GET /user/tokens/verify`'s `result.id`. Deleting the tool's
   local copy at the terminal step stays correct, because Cloudflare holds the secret. A later
   revoke breaks Builds silently; the README names that.
5. **Both authorization refusals are HTTP 404, not 403**, with distinct codes: `8000008` = the
   Git account never authorized the App (→ `builds-app-not-authorized`); `8000012` = authorized
   but this repository is not in the selection (→ `builds-repo-not-selected`). Task 3 Step 1's
   prescribed narrower-pre-check inside the blanket-403 branch is **unnecessary and dropped**:
   404s never reach that branch, so `token-scope-missing` was never at risk. Still test that a
   genuinely underscoped token on a Builds route maps to `token-scope-missing`.
6. **Neither refusal's platform message may be shown to the admin.** Both are Pages-era and
   factually wrong here (`8000012` says the repository "no longer exists" about one that
   exists). Task 2's "follow Task 1's captured wording where a row quotes the platform" is
   superseded for these two rows: state the real condition in cairn's own words, print the
   link. The codes are the contract, the messages are not.
7. **There is NO connections list route.** Drop `listBuildConnections()`. Only
   `PUT .../builds/repos/connections` (a proven upsert: the identical PUT twice returns the
   same `repo_connection_uuid`, only `modified_on` advancing) and `DELETE .../{uuid}`. Adoption
   is structural. A worker's triggers each embed the whole `repo_connection` object, which is
   the other way to discover an existing connection. Task 7 Step 2's "zero PUTs on re-run"
   assertion becomes "the returned uuid is stable across two PUTs".
8. **`listBuildTriggers()` takes a worker tag**: `GET .../builds/workers/{tag}/triggers`, not an
   account-wide list.
9. **`kickBuild` requires a body**, `{"branch": "<default branch>"}`; an empty body is `12002`.
   The response is the full build record, already `status: "queued"`.
10. **Build discovery splits by trigger source.** A push build carries
    `build_trigger_metadata.commit_hash`, so the reconcile push is found by matching it (as
    planned). A **manual kick carries an empty `commit_hash`, `commit_message`, and `author`**,
    so the no-diff branch must take `build_uuid` straight from the kick response instead. Task 8
    Step 2 covers both entries into the poll.
11. **`config_autofill` needs `?branch=`** and returns only `config_file`,
    `default_worker_name`, `env_worker_names`, `package_manager`, `scripts`. Cross-check only.
12. **Build log shape**: `{cursor, truncated, lines: [[epochMillis, text], ...], events: [...]}`.
    The `builds-deploy-failed` tail is the last `lines` entries.
13. **A production site is already on Builds** (907-life, two triggers), so the account's
    GitHub App install must not be cycled. It was not. The install is repo-selected, and
    `cairn-t4c-spike` was added to it for the spike; **Task 10's teardown owes its removal**,
    along with everything in the spike doc's teardown table.

### Task 2: The catalogue: the Builds rows **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/catalogue.mjs` (+ its test)
- Modify: `packages/create-cairn-site/src/github/catalogue.mjs` (+ its test) only if the
  OAuth-denied row lands there (implementer's call by module fit; one home, not both)

**Interfaces:**
- Produces catalogue codes consumed by Tasks 3, 7, 8, 9. Cloudflare catalogue:
  `builds-app-not-authorized` (wait: the App is not authorized; prints the dashboard link
  and the re-run command), `builds-repo-not-selected` (wait: the App is authorized but this
  repository is not selected; prints the GitHub installation-settings link and the re-run
  command), `builds-connect-declined` (declined: records the choice, exits 0, names
  `--connect` as the way back in), `builds-no-build-token` (wait: no build token exists and
  the API cannot create one; prints the dashboard link; dropped by amendment if Task 1
  Step 4 disproves the condition), `build-not-started` (wait: the push landed but no
  matching build has appeared yet), `build-running` (wait: the poll budget elapsed with the
  build still in flight — `queued`, `initializing`, or `running`), `builds-deploy-failed`
  (act: `fail` and `terminated`; carries the final log lines and the dashboard deep link),
  `builds-not-runnable` (act: `skipped` and `cancelled`, naming which),
  `builds-reconcile-parked` (wait: `--yes` with a real config diff; names the interactive
  re-run), `builds-oauth-denied` (act: the admin denied the sign-in consent; names the
  re-run), `builds-push-refused` (act: the ref update was rejected, a protected or diverged
  default branch; names the branch and the dashboard). **`build-failed` and
  `build-not-runnable` must NOT be used as names: `build-failed` already belongs to
  chapter 1's local build.**

- [ ] **Step 1: Failing tests.** Every new row builds and carries the right `kind`; every
  row's message ends in exactly one `Next:` line; `CATALOGUE_CODES.length` grew by exactly
  the number of new rows (the collision guard); message text follows Task 1's captured
  wording where a row quotes the platform.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 3: The API seam's Builds routes **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/api.mjs` (+ its test)

**Interfaces:**
- Consumes: `makeApi({token, accountId, dir, sleep})` (`api.mjs:304`) and the existing v4
  envelope handling. New calls are **methods on the returned client**, matching the
  existing idiom (the client closes over `accountId`; do not add free functions that
  re-pass it).
- Produces, for Tasks 7 and 8: client methods `listBuildConnections()`,
  `putBuildConnection(repo)` (repo = `{providerAccountId, providerAccountName, repoId,
  repoName}`), `listBuildTriggers()`, `createBuildTrigger(trigger)`, `getBuildTokens()`,
  `findWorkerTag(workerName)`, `listBuildsForWorker(tag)` (the build-discovery seam ruling
  3 needs), `kickBuild(triggerUuid, branch)`, `getBuild(buildUuid)`,
  `getBuildLogs(buildUuid)`. Names may be simplified at implementation; these are the
  reference for the later dispatches.

- [ ] **Step 1: Failing tests** against the fake, using Task 1's captured bodies: each read
  and write; the two authorization refusals mapping to their wait rows; a genuinely
  underscoped token on a Builds route still mapping to `token-scope-missing`. **The
  discriminator is NOT the email shape**: `EMAIL_OPERATION_CODES` routes skip the blanket
  403 branch entirely, which would delete `token-scope-missing` for Builds. Instead, keep
  Builds routes inside the blanket 403 branch and add a narrower pre-check keyed on the
  refusal's own `errors[].code` as Task 1 captured it, so the authorization refusals divert
  and every other 403 still reads as a scope failure. Both directions get tests.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 4: The fakes: Builds routes and the GitHub read path **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/test/fake-cloudflare.mjs` (+ its test)
- Modify: `packages/create-cairn-site/test/fake-github.mjs` (+ its test)

**Interfaces:**
- Produces, fake-cloudflare: routes for connections (list/PUT), triggers (list/create),
  build tokens, worker-scripts list (with `tag`), build kick, builds-for-worker list,
  build read (scriptable status sequence so a poll test can walk
  `queued` → `initializing` → `running` → `stopped` and set `build_outcome`), logs, and
  `failNext`-style toggles for both authorization refusals.
- Produces, fake-github: `GET /repos/:owner/:repo` returning `.id` and `.owner.id`
  (no `/users/:login` route is needed; the repo response carries both ids), and the Git
  Data **read path** the reconcile diff requires: read the head ref's commit, its tree,
  and file content (tree/blob or contents route, implementer's call matched to what
  Task 5's `reconcileRepo` actually calls), served from what the write handlers stored.
  Where the fake's existing Git Data read shapes drift from the real API (the stored
  commit's `tree` is a bare sha; the real API returns `{sha, url}`), align the fake to the
  real shape and fix any dependent test in the same change.

- [ ] **Step 1: Failing tests.** Each route's success and its refusal variant; the build
  status sequence is drivable per test; the Git Data read path round-trips what
  `pushScaffold` wrote; fixture bodies match Task 1's captures with unobservable shapes
  flagged in-file.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 5: The reconcile: local config writes and the `base_tree` commit

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/config.mjs` (+ test): `writeAccountId`
- Create: `packages/create-cairn-site/src/github/reconcile.mjs` (+ test)
- Modify (only if extraction is needed): `packages/create-cairn-site/src/github/repo.mjs`

**Interfaces:**
- Consumes: the persisted `github` record (`clientId`, `clientSecret`, `installationId`,
  `repo.{id, owner, repo, defaultBranch}`); **`src/github/oauth.mjs`'s `reauthorize`**,
  which already runs the whole user-token trip (its own loopback, `state` check, exchange)
  from what persists — the OAuth deliverable is calling it with the right arguments
  (`openBrowser` and `log` are mandatory under the no-desktop rule), **not** building
  anything new, and **not** touching `install.mjs` (whose entry needs the deleted PEM) or
  `loopback.mjs`'s internals (T4d's territory). STATUS carry-forward: the reauthorize race
  in `src/github/install.test.mjs` is known flaky; this pass makes that machinery
  load-bearing, so fix or quarantine the flake in this task and say which.
- Produces, for Task 8: `writeAccountId(dir, accountId)` (rewrite of `wrangler.jsonc` with
  BOTH an insert path and a replace path — no `account_id` key exists anywhere today, so
  `writePublicOrigin`'s replace-only regex idiom is half the job; anchor the insert on the
  `"name"` key, which `nameWranglerResources` already rewrites; byte-stable on re-run;
  result still parses as JSONC; dropped or narrowed by spike amendment if Task 1 Step 5
  says Builds does not need it); and `reconcileRepo({record, dir, userToken})` returning
  `{changed: boolean, commitSha?}`, which reads the repo's current head, fetches the two
  tool-owned files from it, compares to disk, and when different commits both files in one
  Git Data commit **with `base_tree` set to the head commit's tree** and updates the
  default-branch ref. Idempotence is the diff itself; no commit-message sentinel is
  written or read (the admin's own commits move HEAD, so a HEAD-message check would be
  wrong in both directions). A missing repo file counts as differing; a repo ahead of
  local disk is safe by construction (`base_tree` preserves everything the commit does not
  name); a rejected ref update surfaces as `builds-push-refused`.

- [ ] **Step 1: Failing tests for `writeAccountId`**: inserts when absent, replaces when
  present, byte-stable on re-run, result parses.
- [ ] **Step 2: Failing tests for `reconcileRepo`** against fake-github: a differing file
  commits (one commit, two files, `base_tree` set to the current head tree, ref advanced);
  a file the admin added after the scaffold push **survives** the reconcile (the
  base_tree proof, asserted by reading the fake's stored tree after the commit); an
  identical repo returns `{changed: false}` with zero write calls (request-log
  assertion); a missing repo file is treated as differing; a rejected ref PATCH maps to
  `builds-push-refused`.
- [ ] **Step 3: Failing test for the OAuth call path**: `reauthorize` is driven against
  fake-github's authorize redirect (existing seams), a denied consent
  (`error=access_denied`, no code) maps to `builds-oauth-denied` rather than a raw Error,
  and the token never lands in the state file (disk re-read plus sweep for the token
  string, the falsifiable-probe discipline).
- [ ] **Step 4: Implement; suite green; commit.**

### Task 6: The prefill extension **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/prefill.mjs` (+ its test)

**Interfaces:**
- Consumes: Task 1 Step 6's verified key strings.
- Produces: a parameterized URL seam — today `PREFILL_URL` is a module-level constant built
  once from `PREFILL_PERMISSION_KEYS` in an import-time IIFE, and `ensureApiToken`
  hardcodes it, so the seam does NOT take a per-call key list and must grow one. Smallest
  change: `prefillUrl(keys = PREFILL_PERMISSION_KEYS)` plus an optional `permissionKeys`
  input on `ensureApiToken`, keeping the existing exports so chapter 2 is untouched.
  Chapter 3 passes the union set (Global Constraints); the chapter-2 URL stays
  byte-identical.

- [ ] **Step 1: Failing tests.** The chapter-3 URL carries the five T4a keys plus the
  verified Builds keys; the chapter-2 URL is byte-for-byte unchanged; a token failing
  `listZones` still maps to the existing rows (the union set makes the validator
  legitimate; assert the validation call is unchanged).
- [ ] **Step 2: Implement; suite green; commit.**

### Task 7: Chapter 3 spine: admission, token, connect, trigger **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/chapter3.mjs` (+ test)
- Modify: `packages/create-cairn-site/src/cloudflare/chapter2.mjs` (export
  `deleteApiToken`; no behavior change)

**Interfaces:**
- Consumes: Tasks 2, 3, 4, 6; the state store; `ensureAccountId` (`account.mjs:55`,
  reusable, but it shells out to `wrangler whoami` when no id is saved, so it stays inside
  a `runStep` execute for dry-run cleanliness); chapter 2's `deleteApiToken` (exported
  here).
- Produces: `runChapter3({siteId, record, dir, args, log, dryRun, ...seams})` (the
  signature mirrors `runChapter2`, including `siteId`, which every `updateSite` call
  needs) advancing `step` through `builds-connected`; exports
  `CHAPTER3_TERMINAL_STEPS = ['builds-live', 'builds-connect-declined']` and
  `CHAPTER3_RESUMABLE_STEPS = ['builds-connected', 'config-reconciled']` for Task 9's
  `bin.mjs` routing (alias on import; `bin.mjs` already imports chapter 2's
  `TERMINAL_STEPS`). Entry admission is an **explicit allowlist** of admitted steps
  (`live`, chapter 2's resumable and terminal steps, and chapter 3's own steps), never an
  index comparison: chapter 2's `stepIndex` treats unknown steps as fresh-from-`live`,
  which would admit a half-scaffolded record. Flat state keys per the Global Constraints,
  one hop per write.

- [ ] **Step 1: Failing admission tests.** Interactive consent proceeds; a decline records
  `builds-connect-declined`, exits 0, deletes the token, keeps the site untouched, and
  names `--connect` as the way back; the admission copy states the App authorization, the
  token paste, the sign-in click, and the free-tier figures with their date; `--yes`
  consents silently and reads `CAIRN_CF_API_TOKEN`.
- [ ] **Step 2: Failing connect tests.** The two numeric ids come from one
  `GET /repos/{owner}/{repo}`; an existing connection is adopted with zero PUTs
  (request-log assertion); each authorization refusal parks on its own row (exit 0, link
  printed) and a re-run after the fake flips to authorized proceeds without repeated
  writes.
- [ ] **Step 3: Failing trigger tests.** The Worker tag resolves by the name in the local
  `wrangler.jsonc`; a matching existing trigger is adopted; a created trigger carries the
  default branch only, the scaffold's build command, and the default deploy command; an
  empty build-token list with no create route parks on `builds-no-build-token` (skipped by
  amendment if Task 1 disproved it); `buildsConnectionUuid`/`buildsTriggerUuid` land on
  the record and `builds-connected` is recorded once, after the trigger; a two-hop partial
  write preserves sibling `cloudflare` fields.
- [ ] **Step 4: Implement; suite green; commit.**

### Task 8: Chapter 3 finish: reconcile, watch, completion

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/chapter3.mjs` (+ test)
- Modify: `packages/create-cairn-site/src/cloudflare/hostname.mjs` (export
  `confirmHostname`; no behavior change)

**Interfaces:**
- Consumes: Task 5's `writeAccountId` and `reconcileRepo`, `oauth.mjs`'s `reauthorize`,
  Task 3's build methods. The live check reuses `confirmHostname` (today module-private in
  `hostname.mjs`; export it — it returns `'live' | 'hostname-propagating' |
  'certificate-pending' | 'hostname-not-serving'` and throws nothing — and note it takes a
  bare domain, so a workers.dev origin needs the scheme stripped by the caller).
- Produces: the finished chapter for Task 9's wiring.

- [ ] **Step 1: Failing reconcile-hop tests.** `writeAccountId` runs before the diff; a
  differing repo triggers exactly one `reauthorize` call and one commit and records
  `config-reconciled`; an identical repo skips the OAuth trip entirely (zero authorize
  requests in the fake's log) and, when no successful build is recorded, kicks a manual
  build; the commit push is not followed by a manual kick (one build, not two); under
  `--yes` a real diff parks on `builds-reconcile-parked` with zero browser opens (the
  no-desktop seam asserts).
- [ ] **Step 2: Failing watch tests.** The push's build is found via `listBuildsForWorker`
  matched on the reconcile commit; no matching build yet parks on `build-not-started`; the
  poll walks `queued` → `initializing` → `running` → `stopped` with a heartbeat;
  `success` re-runs `confirmHostname` and records `builds-live` and deletes `apiToken`
  (disk re-read assertion); `fail` surfaces `builds-deploy-failed` carrying the fake's log
  tail; `skipped` surfaces `builds-not-runnable`; a budget-exceeded poll parks as
  `build-running` (exit 0) and a re-run resumes polling `buildsLastBuildUuid` rather than
  kicking another.
- [ ] **Step 3: Failing completion and re-entry tests.** The closing copy names
  push-to-deploy on the default branch and the admin URL, claims only what was observed,
  and does not claim the laptop is disposable; a `builds-live` re-entry re-runs the diff
  (the stale-origin remedy: a record whose local `PUBLIC_ORIGIN` changed after
  `builds-live` commits the change on re-entry, and reports "nothing to reconcile" only
  when the diff is empty); a later re-entry needing Builds writes re-runs the prefill and
  says so.
- [ ] **Step 4: Implement; suite green; commit.**

### Task 9: The CLI wiring: `--connect`, routing, refusals, dry-run

**Files:**
- Modify: `packages/create-cairn-site/src/args.mjs`, `packages/create-cairn-site/bin.mjs`
  (+ tests, including the spawned-CLI suites under `test/`)

**Interfaces:**
- Consumes: Task 7's exported step lists and `runChapter3`; Task 8's finished chapter.
- Produces: `--connect` as a real flag (replacing the reserved comment at `args.mjs:27-28`)
  and chapter-3 routing at **all three `bin.mjs` hook sites**: the fresh-run fall-through
  (`continueIntoChapter2`'s terminal outcome), the later re-entry branch (where
  `email-live` today prints and returns, and `paid-plan-declined` re-enters chapter 2),
  and the `--start-over` refusal list. The `--connect` branch sits **before** the
  `CHAPTER2_RESUMABLE_STEPS` branch, which would otherwise swallow `domain-live`.

- [ ] **Step 1: Failing routing tests, through `bin.mjs`'s own entry** (the seam the
  module tests cannot see): a plain re-run at `builds-connected` and at
  `config-reconciled` resumes the chapter — and the test **fails when the step is removed
  from the routing list** (the falsifiable-gate rule; today's fall-through is
  `collectAnswers()` + `scaffold()`, which would scaffold over a finished site); a plain
  re-run at `builds-live` and `builds-connect-declined` routes to the terminal branch,
  not the scaffolder.
- [ ] **Step 2: Failing entry-matrix tests.** The fall-through enters chapter 3 after
  `email-live` and after `paid-plan-declined`; `--connect` enters from `live`, from
  `domain-live`, from `email-live`, and from `builds-connect-declined` (the declined
  re-entry, the T4b amendment-14 lesson); `--connect` refuses at `scaffolded` and at
  `deployed` by the explicit allowlist, naming what must finish first; `--connect` at
  `builds-live` runs the re-reconcile path (Task 8 Step 3), not a no-op.
- [ ] **Step 3: Failing preservation tests.** `--sign-in` works at every chapter-3 state
  (the site is live throughout); the declined-email re-offer keys on the record's fields
  (`emailDeclinedAt` present, `emailOnboardedAt` absent), not on the step, so a record
  advanced to `builds-live` still gets it; `--start-over` from any chapter-3 state
  refuses naming the connection, trigger, and live site.
- [ ] **Step 4: Failing dry-run tests**, following the in-process chapter-2 pattern
  (`chapter2.test.mjs`, the zero-shell-outs zero-requests test): every chapter-3 hop title
  prints from `record: null`, and `--connect --dry-run` prints the chapter without a
  record (resume detection is skipped under `--dry-run` at `bin.mjs:298`; match that
  behavior, do not fight it).
- [ ] **Step 5: Implement; suite green; commit.**

### Task 10: The live e2e (main loop plus Geoff's moments, scratch domain)

- [ ] **Step 0: Enumerate what exists before assuming** (the T4b amendment-11 lesson):
  list `~/.config/cairn/sites`, the scratch domain's zone state, the account's Builds
  connections, and what the Task 1 spike left in place (App authorization, scratch repos,
  build tokens). Adapt the run plan to what is actually there and record the delta.
- [ ] **Step 1: Run the chapters to chapter 3's admission** on a fresh scratch site
  (chapter 1's two browser moments; chapter 2 on the already-active zone takes the adopt
  short-circuit; email may be declined to prove the `paid-plan-declined` fall-through if
  faster, or completed if the domain's sending state allows; either terminal is a valid
  entry and the choice is recorded).
- [ ] **Step 2: Run chapter 3 end to end**: token paste (union keys), connect (capturing
  an authorization park live if one occurs), trigger, reconcile commit (the OAuth click),
  and the watched first build to `success` with the marker checks passing. Count and
  record every browser moment for Pass D's docs.
- [ ] **Step 3: Prove push-to-deploy once more without the tool**: a trivial commit
  through the GitHub UI (or API) fires a second build that deploys with no local
  involvement. This is the umbrella's actual promise, observed.
- [ ] **Step 4: Tear down and verify by listing**: delete the trigger and connection by
  uuid, retire the site per the standing teardown (Worker, D1, R2, repo), leave the App
  authorization in place (recorded), and add the run's GitHub App to the hand-delete list
  for the pass report.

### Task 11: Docs, tracking, and pass close

**Files:** `packages/create-cairn-site/README.md`, `CHANGELOG.md`, chapter 2's closing
copy, `ROADMAP.md`, `docs/STATUS.md`, `docs/internal/docs-friction-log.md`, this plan
(post-mortem).

- [ ] **Step 1: README**: the chapter's section (`--connect`, the park-and-resume story,
  the token lifecycle, the manual moments — the "single manual step" phrasing only if
  Task 1 proved the build token needs no dashboard visit — the free-tier figures with
  their date, and the migrations caveat: engine migrations still run through the CLI).
- [ ] **Step 2: Changelog** under `## Unreleased` (non-breaking; no `Consumers must:`
  line); chapter 2's closing copy gains the forward pointer to `--connect`; a friction-log
  entry records that `docs/guides/deploy-to-cloudflare.md` now has a second, unmentioned
  deploy path (triage, not fix, per the log's rules).
- [ ] **Step 3: Roadmap, carry-forwards, and T4d's inputs.** Mark the umbrella's
  push-to-deploy item where the roadmap carries it. Re-verify STATUS carry-forward
  numbering against the current file before retiring anything (the numbering trap, three
  times now); the items this pass touches, named by content so the executor has something
  to match: the `PUBLIC_ORIGIN` reconciliation gap (closed here) and the
  `install.test.mjs` reauthorize flake (fixed or explicitly kept by Task 5). File T4d's
  two new inputs where its brief will find them: the build watch as a second long wait,
  and the grown fake surface its extraction must cover.
- [ ] **Step 4: The gates and reviews.** Re-derive the CI gate list with
  `grep -l pull_request .github/workflows/` and run what those workflows run rather than
  a remembered subset (the `cairn-ci-only-gates` rule). **`create-site.yml` is this
  pass's load-bearing gate** — it packs the tarball, installs it, and runs the CLI against
  the baked template, which nothing local reaches — so push the branch and watch it, or
  run the packed-tarball flow locally first. Fan out `web-auth-security-reviewer` over the
  token and OAuth lifecycle (this pass handles a pasted API token, a short-lived OAuth
  user token, and a `state`-validated redirect). Run `code-simplifier` over the pass's
  changed code, and commit.
- [ ] **Step 5: Post-mortem in this file; STATUS updated** (T4c done; next is the T4d
  planning sitting); prep the context clear per the pass ritual, including branch topology
  if the merge is deferred.

## Exit criteria

The spec's acceptance criteria, verified with evidence in the post-mortem: connect and
trigger adopted-not-recreated on re-run; the repo's two config files matching disk
including `account_id` (as the spike ruled) and current `PUBLIC_ORIGIN` via an
admin-attributed `base_tree` commit that leaves every other repo file untouched; the first
Builds deploy found by commit, watched to `success`, with marker checks passing; every
park exiting 0 and resuming by plain re-run through `bin.mjs`; a `builds-live` re-entry
re-running the diff; the pasted token 0600 during the chapter and absent everywhere after
the terminal steps; the OAuth token never persisted; every new catalogue row triggered by
a test; `--dry-run` clean; the runtime library untouched; suite green at the full gate
including `create-site.yml`.
