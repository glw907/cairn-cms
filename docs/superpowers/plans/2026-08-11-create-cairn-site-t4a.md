# create-cairn-site Pass T4a (the domain-and-email half of chapter 2) Implementation Plan

> **For agentic workers:** execute task-by-task by dispatching `cairn-implementer` per task
> (the repo default), test-first, full gate per task; the main loop reviews each diff and
> confirms the gate before the next dispatch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** take a site from `live` (chapter 1's finish line) to serving on the admin's own
domain with sign-in email working, through token-prefill, the MX-preserving carry-over gate,
delegation park-and-resume, email onboarding, and the custom-hostname cutover, with the
localhost console taking its full form on the chapter's waits.

**Architecture:** the T2/T3 step and state-machine idiom, extended past `live`. One new
credential (the pasted, prefilled API token) lives in the 0600 state record for the
chapter's lifetime and is deleted at completion. A thin fetch-based Cloudflare API seam
(injectable base URL) carries zone, DNS, and onboarding calls; wrangler's session keeps
carrying what it already carries. Console pages render server-side from the state record on
the existing loopback server.

**Tech stack:** plain Node `.mjs` (no TypeScript, no framework), `node:test`, the T2/T3
fake-bin pattern plus a new fake Cloudflare API fixture server, wrangler `^4` via the
site's own devDependency.

**Spec:** `docs/superpowers/specs/2026-08-11-create-cairn-site-t4a-design.md`. The four
rulings up top govern; the umbrella's chapter 2 section is the parent.

## Global Constraints

- The runtime library (`src/lib`) is untouched; no engine public-API change.
- No secret ever lands under the project directory; the pasted token lives only in the
  0600 state record and is deleted at chapter completion.
- Every exit prints a next step; every wait prints a heartbeat; every catalogue row is
  triggered by a test, never merely read.
- `--dry-run` prints the whole chapter and performs none of it: zero shell-outs, zero
  network.
- No suite may touch the operator's desktop (the PATH-controlled `openBrowser` pattern
  from `open.test.mjs` is the required idiom).
- "Already done" detection keys on recorded state, never on a value that can legitimately
  collide (the T3 idempotence rule, now standing).
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`), em dash
  banned in comments.
- Production domains are untouchable. The live e2e uses only the scratch domain named at
  execution time; every created resource is torn down and verified gone by listing.
- Every platform claim in this plan carries the spike's date and rots; Task 1 re-verifies
  before any dependent task dispatches.

## File Structure

```
packages/create-cairn-site/
  src/cloudflare/api.mjs         fetch seam for the Cloudflare REST API (+ .test.mjs)
  src/cloudflare/account.mjs     account listing + selection (+ .test.mjs)
  src/cloudflare/prefill.mjs     create-token deep link, paste prompt, validation (+ .test.mjs)
  src/cloudflare/zone.mjs        zone create + status + nameserver read (+ .test.mjs)
  src/cloudflare/records.mjs     authoritative-record read + carry-over writes (+ .test.mjs)
  src/cloudflare/email-onboard.mjs  onboarding deep link + state poll (+ .test.mjs)
  src/cloudflare/hostname.mjs    custom-hostname cutover: origin, route, redeploy (+ .test.mjs)
  src/cloudflare/chapter2.mjs    orchestration: admission, hops, parks, completion (+ .test.mjs)
  src/console/pages.mjs          server-rendered progress pages (+ .test.mjs)
  src/console/serve.mjs          mounting pages on the existing loopback server (+ .test.mjs)
  test/fake-cloudflare.mjs       REST fixture server: accounts, zones, records, onboarding
Modified: src/args.mjs, bin.mjs, src/cloudflare/catalogue.mjs, src/cloudflare/chapter.mjs
  (account-id read on deploy), src/github/loopback.mjs (mount seam only), state fields via
  src/state.mjs consumers, package.json (test glob if needed), README.md
```

State shape after this pass (`step` remains the resume key):

```js
{
  name, dir, step,      // step gains: 'zone-created' | 'delegated' | 'email-onboarded'
                        //   | 'domain-live'  ('domain-live' is final for T4a)
  ownerEmail,
  github: { ... },      // unchanged
  cloudflare: {
    url, workerName,    // T3 fields
    accountId,          // new: chosen in Task 5, read by chapter 1's deploy path too
    zoneId, domain,     // new: Task 7
    apiToken,           // new: Task 6; DELETED at chapter completion (Task 12)
  },
}
```

The runtime order is admission → account selection → token prefill → zone create →
carry-over gate → nameserver instructions (park) → delegation re-detect → email onboarding
(park) → custom-hostname cutover → completion (token deleted). Parks are ordinary exits at
a recorded step; a re-run re-detects and continues.

---

### Task 1: The spike (main loop; estate account plus current docs; decision gate for Tasks 5-10)

**Files:**
- Create: `docs/internal/2026-08-11-t4a-domain-email-spike.md`

Rehearse the chapter's platform premises by hand before any task is drafted against a stale
one, the T3 pattern. Every claim gets a date and observed output. The estate account and a
throwaway zone candidate are enough; nothing touches production zones.

- [ ] **Step 1: The prefill URL.** Establish the dashboard create-token page's actual
  prefill parameter shape (the T3 spike named the mechanism but not the parameters).
  Produce a URL that lands on the create-token form with name and Zone:Edit + DNS:Edit
  scopes pre-filled, and record which parts (account scoping, TTL) the admin must still
  click. If prefill turns out unsupported for any needed field, record the closest
  deep-link and what the copy must say instead. **Gate for Task 6.**
- [ ] **Step 2: Zone creation's token needs.** With a token minted from that template,
  create a zone for a scratch name on the estate account, read its assigned nameservers,
  and delete it. Record the exact scope set that sufficed and the error body a
  wrong-scoped token returns. **Gate for Tasks 6 and 7.**
- [ ] **Step 3: The records read.** Confirm how the tool reads a domain's CURRENT
  authoritative records before delegation (external DNS query, not the Cloudflare API,
  since the zone holds nothing yet): pick the mechanism (`node:dns` resolver against the
  domain's current nameservers) and record what MX/TXT/A/CNAME lookups return for a real
  domain. **Gate for Task 7.**
- [ ] **Step 4: Email onboarding surface.** Re-read the current Email Service docs and
  record: the onboarding flow's dashboard URL shape, whatever status API exists for
  polling onboarding state, and the verified-destination answer of ruling 4 (can a site
  send magic-link mail to verified editor addresses on the free plan, and does an
  onboarded sending domain require Workers Paid). **Gate for Task 9 and for the admission
  copy in Task 12; also produces the `CLAUDE.md` gotcha rewrite text for Task 15.**
- [ ] **Step 5: Accounts and routes.** Record the memberships/accounts list endpoint's
  response shape for a multi-account token, and the Workers route-creation call the
  cutover needs (route on the new zone pointing at the existing Worker), including
  whether the standing wrangler session or the pasted token covers it. **Gate for Tasks
  5 and 10.**
- [ ] **Step 6: Write the verdict doc and amend this plan.** Every task below marked
  **[spike]** gets its premise confirmed or corrected in place, the T3 idiom (the
  amendment block at the top of File Structure).

### Task 2: The fake Cloudflare API (test helper)

**Files:**
- Create: `packages/create-cairn-site/test/fake-cloudflare.mjs`,
  `packages/create-cairn-site/test/fake-cloudflare.test.mjs`

**Interfaces:**
- Produces: `makeFakeCloudflare()` returning `{ baseUrl, state, failNext(route, body),
  close() }`, the `fake-github.mjs` idiom: an in-process HTTP server whose routes cover
  accounts list, zone create/get, DNS record create/list, and the onboarding status the
  spike found; `state` exposes what was created for assertions; `failNext` primes one
  error response.

- [ ] **Step 1: Write the helper and its self-test.** Routes return the REAL response
  shapes recorded in the spike doc, pretty-printed the way the API returns them (the T3
  e2e's lesson: a fake whose output shape diverges from the real tool hides real
  behavior). The self-test proves each route, `failNext`, and that `close()` frees the
  port.
- [ ] **Step 2: Full package suite green; commit.**

### Task 3: The catalogue rows

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/catalogue.mjs`,
  `packages/create-cairn-site/src/cloudflare/catalogue.test.mjs`

**Interfaces:**
- Produces: rows keyed `token-invalid`, `token-scope-missing`, `zone-already-exists`,
  `zone-create-failed`, `delegation-pending`, `records-read-failed`,
  `onboarding-parked`, `onboarding-rejected`, `route-create-failed`,
  `account-ambiguous`, each with literal message text, a wait / act / ask-someone class,
  and the one next command, the existing row shape.

- [ ] **Step 1: Write the failing tests** asserting each new row exists, carries
  non-empty literal text, names its class, and ends in a next command (the existing
  catalogue test idiom).
- [ ] **Step 2: Write the rows; suite green; commit.** Copy follows the T2/T3 register:
  plain, no blame, states what happened and the single next action. `delegation-pending`
  and `onboarding-parked` are wait-class and name the re-run command; they are the two
  park exits, not failures.

### Task 4: The API seam

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/api.mjs`,
  `packages/create-cairn-site/src/cloudflare/api.test.mjs`

**Interfaces:**
- Consumes: catalogue rows from Task 3 (`token-invalid`, `token-scope-missing`).
- Produces: `makeApi({ token, baseUrl })` returning an object with one method per call
  the chapter makes (accounts list, zone create/get, records create, onboarding status,
  route create; exact set finalized by the spike). Every method returns parsed JSON or
  throws the mapped catalogue error; a 401/403 maps to `token-invalid` /
  `token-scope-missing` at this seam so no caller re-implements it. `baseUrl` defaults
  to the real API and is injected by every test (fake-cloudflare's).

- [ ] **Step 1: Failing tests against the fake** for the success path, the 401 and 403
  mappings, and a network-refused failure mapping.
- [ ] **Step 2: Implement with bare `fetch`; no retry logic beyond one retry on a 5xx
  (the chapter's calls are all idempotent reads or creates the caller guards); suite
  green; commit.**

### Task 5: Account selection **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/account.mjs`,
  `packages/create-cairn-site/src/cloudflare/account.test.mjs`
- Modify: `packages/create-cairn-site/src/cloudflare/chapter.mjs` (chapter 1's deploy
  reads the saved id), `packages/create-cairn-site/src/cloudflare/chapter2.mjs` arrives
  in Task 12

**Interfaces:**
- Consumes: `makeApi` (Task 4); the wrangler session's account list per the spike.
- Produces: `ensureAccountId({ record, api, prompt, log })` returning the account id:
  the saved one if present; the only one if single; otherwise a prompt listing name and
  id, the answer saved to `record.cloudflare.accountId`.

- [ ] **Step 1: Failing tests**: single account saves silently; multi-account prompts
  once and saves; a saved id short-circuits the list call entirely (resume never
  re-asks); the `account-ambiguous` row fires when non-interactive with no saved id.
- [ ] **Step 2: Implement; suite green.**
- [ ] **Step 3: Chapter 1 reads it.** Failing test: a deploy in a record carrying
  `accountId` exports `CLOUDFLARE_ACCOUNT_ID` into the wrangler spawn env (the
  documented wrangler mechanism for exactly this), closing the inherited multi-account
  deploy defect. Implement in the existing deploy path; suite green; commit.

### Task 6: Token prefill **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/prefill.mjs`,
  `packages/create-cairn-site/src/cloudflare/prefill.test.mjs`

**Interfaces:**
- Consumes: `makeApi` (validation call), `openBrowser`, catalogue rows.
- Produces: `ensureApiToken({ record, promptSecret, log, openBrowser })` returning the
  token: the saved one if it still validates; otherwise open the spike's prefill URL,
  prompt for the paste (input hidden, the secret-prompt idiom), validate with a
  scope-proving call (the spike's choice), save to `record.cloudflare.apiToken`, and
  persist 0600.

- [ ] **Step 1: Failing tests**: a saved valid token is reused without a browser open; an
  invalid saved token re-runs the prefill rather than failing; a pasted token that fails
  the scope probe raises `token-scope-missing` and re-prompts once before exiting with
  the row; the token never appears in any log line (assert on captured log output); the
  browser open uses the PATH-controlled pattern.
- [ ] **Step 2: Implement; suite green; commit.** The prefill URL string lives here with
  the spike's date in its doc block.

### Task 7: Zone create and the carry-over gate **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/zone.mjs`,
  `packages/create-cairn-site/src/cloudflare/zone.test.mjs`,
  `packages/create-cairn-site/src/cloudflare/records.mjs`,
  `packages/create-cairn-site/src/cloudflare/records.test.mjs`

**Interfaces:**
- Consumes: `makeApi`, catalogue rows, the spike's records-read mechanism.
- Produces: `ensureZone({ record, api, log })` creating or finding the zone and saving
  `zoneId` + assigned nameservers; `readCurrentRecords({ domain, resolve })` returning
  the domain's live authoritative records (resolver injectable for tests);
  `carryOverRecords({ api, zoneId, records, confirm, log })` writing them only after
  `confirm` resolves true.

- [ ] **Step 1: Failing tests for `ensureZone`**: creates and saves; an already-existing
  zone on this account is adopted, not an error; `zone-already-exists` fires only when
  the zone belongs to another account (the spike records the distinguishing response).
- [ ] **Step 2: Failing tests for the read**: MX, A, CNAME, TXT records come back typed;
  a resolver failure raises `records-read-failed`, never an empty "nothing to carry".
  An empty read that the resolver reports as authoritative-and-empty is distinct from a
  failure and is presented as "no records found" to the gate.
- [ ] **Step 3: Failing tests for the gate**: nothing writes before `confirm`; declining
  writes nothing and exits with a next step; confirming writes every record and the MX
  set is byte-identical to what was read (the umbrella's botched-delegation guard).
- [ ] **Step 4: Implement all three; suite green; commit.**

### Task 8: Delegation park and re-detect

**Files:**
- Create: covered inside `zone.mjs` + `zone.test.mjs` (detection), `chapter2.mjs`
  wiring arrives in Task 12

**Interfaces:**
- Produces: `checkDelegation({ record, api })` returning `'pending' | 'active'` from the
  zone's status; pure read, no waiting loop anywhere in the tool.

- [ ] **Step 1: Failing tests**: pending → the `delegation-pending` wait row (with the
  registrar instructions rendered once, not repeated); active → proceed; the park exit
  records step `'zone-created'` so the re-run lands here directly.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 9: Email onboarding **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/email-onboard.mjs`,
  `packages/create-cairn-site/src/cloudflare/email-onboard.test.mjs`

**Interfaces:**
- Consumes: `makeApi` (the status poll the spike found), `openBrowser`, catalogue rows.
- Produces: `ensureEmailOnboarding({ record, api, openBrowser, log })` returning
  `'onboarded' | 'parked' | 'rejected'`, deep-linking the dashboard step, polling once
  per run (park-and-resume, not a wait loop), and offering the verified-destination
  path first if ruling 4's spike answer confirms it.

- [ ] **Step 1: Failing tests**: not-started → browser open + `onboarding-parked` park
  exit at step `'delegated'`; in-progress → same park without a second browser open;
  complete → proceed and record `'email-onboarded'`; rejected → the
  `onboarding-rejected` act row. The verified-destination branch (if confirmed) offers
  the editor addresses the record already knows and marks the money framing accordingly.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 10: The custom-hostname cutover **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/hostname.mjs`,
  `packages/create-cairn-site/src/cloudflare/hostname.test.mjs`

**Interfaces:**
- Consumes: `writePublicOrigin` (existing `config.mjs`), the deploy path (existing
  `deploy.mjs`), route creation via `makeApi` or wrangler per the spike, catalogue rows.
- Produces: `cutOverHostname({ record, api, exec, log })`: origin rewrite to
  `https://<domain>`, route (or the spike's chosen mechanism) pointing the zone at the
  Worker, redeploy, and a reachability confirm against the new hostname; `workers.dev`
  keeps serving.

- [ ] **Step 1: Failing tests**: the origin write reuses `config.mjs` (no second
  implementation); a route-create failure raises `route-create-failed` and leaves the
  record at its prior step (the site keeps working on `workers.dev`); success records
  `'domain-live'`; the reachability confirm treats a still-propagating DNS answer as
  wait-class, not failure.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 11: The console **[spike-free]**

**Files:**
- Create: `packages/create-cairn-site/src/console/pages.mjs`,
  `packages/create-cairn-site/src/console/pages.test.mjs`,
  `packages/create-cairn-site/src/console/serve.mjs`,
  `packages/create-cairn-site/src/console/serve.test.mjs`
- Modify: `packages/create-cairn-site/src/github/loopback.mjs` (a mount seam: the
  loopback server accepts additional route handlers; its existing behavior unchanged)

**Interfaces:**
- Consumes: the state record (read-only), the loopback server.
- Produces: `renderPage(record)` returning HTML for the chapter's current step (one
  page, sections per step: done, current, waiting, next), and `mountConsole(server,
  { readRecord })` serving it at `/` with a meta-refresh on the two wait steps. The
  terminal stays complete on its own; pages render the same state, never hold their own.

- [ ] **Step 1: Failing tests for `renderPage`**: each step renders its section state;
  the two waits render the re-detection state and instructions; no page ever contains
  the token or any secret (assert against the rendered HTML with a planted
  distinctive-secret record, the falsifiable sweep idiom).
- [ ] **Step 2: Failing tests for the mount**: the loopback server's existing manifest
  and OAuth routes are byte-identical in behavior (regression assertions), the console
  route serves, and closing the chapter closes cleanly.
- [ ] **Step 3: Implement; suite green; commit.** Server-rendered strings, no framework,
  no build step; styling is one inline style block in the T2 landing-page idiom.

### Task 12: Chapter orchestration, admission, completion

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/chapter2.mjs`,
  `packages/create-cairn-site/src/cloudflare/chapter2.test.mjs`
- Modify: `packages/create-cairn-site/src/args.mjs` (`--domain <name>`, `--connect` to
  opt into chapter 2 unattended, mirroring `--deploy`), `packages/create-cairn-site/bin.mjs`

**Interfaces:**
- Consumes: every Producer above, in the runtime order of File Structure.
- Produces: `runChapter2({ record, args, ... })`, the resume-aware orchestration; the
  admission copy (spike-gated money framing per ruling 4); completion deletes
  `cloudflare.apiToken` from the record and says where the site now lives.

- [ ] **Step 1: Failing tests for admission**: interactive consent, `--yes` skip,
  `--connect` opt-in; declining parks with chapter 1's site intact and a next step
  printed; the admission copy states the spike's actual cost answer.
- [ ] **Step 2: Failing tests for the hop order and resume**: a record at each step
  resumes at exactly the next hop with zero repeated actions (the T3
  zero-redeploys idiom, asserted per hop via the fakes' invocation logs); `--start-over`
  keeps its meaning; `--dry-run` prints every hop and performs none (zero fake-bin
  invocations, zero fake-API requests).
- [ ] **Step 3: Failing test for completion**: `apiToken` is absent from the record
  after `'domain-live'`, the file is still 0600, and the closing copy names the domain,
  the admin URL, and the email state.
- [ ] **Step 4: Implement; wire into `bin.mjs`; suite green; commit.**

### Task 13: The cross-cutting safety net

**Files:**
- Modify: `packages/create-cairn-site/test/resume-cloudflare.test.mjs` (extend, or a
  sibling `resume-chapter2.test.mjs` if the file would grow past its own shape)

- [ ] **Step 1: The interruption matrix.** One test per hop boundary: kill after each
  hop (simulated by a record written at that step), re-run, assert completion with no
  repeated side effects, the T3 matrix idiom.
- [ ] **Step 2: The secret sweep.** With a run driven end to end against the fakes using
  a distinctive planted token value, sweep the scaffold tree, every log line, and every
  rendered console page for it: present only in the state record before completion,
  nowhere after. Prove the sweep can fail by planting the value in a page fixture once
  (the falsifiable-probe rule), then remove the plant.
- [ ] **Step 3: Suite green; commit.**

### Task 14: The live e2e (main loop + Geoff's moments, scratch domain)

**Files:**
- Create: evidence in this plan's post-mortem; divergences appended to the Task 1 spike
  doc

Prerequisite, named at dispatch: the scratch domain exists at an external registrar
(ruling 3; Geoff registers it once, outside the tool). The T3-proven install pattern
(tarball rewrite at the chapter boundary) carries over.

- [ ] **Step 1: Full run.** From `live` state on a fresh scaffolded site: admission,
  prefill (Geoff pastes the token), zone create, carry-over gate against the scratch
  domain's real current records, nameserver change at the registrar (Geoff's browser),
  park, re-run re-detect, email onboarding per the spike's answer, cutover. Verify: the
  site answers on the domain, `workers.dev` still answers, MX intact, sign-in email
  arrives to the owner address, the record at `'domain-live'` with no `apiToken`.
- [ ] **Step 2: Interrupted resume.** Re-run after a kill mid-chapter; confirm zero
  repeated writes (the fakes prove it in CI; the live run proves it once against the
  real API by reading the zone's records twice).
- [ ] **Step 3: Teardown.** Zone deleted via the API, domain left parked at its
  registrar, Worker/D1/R2 from the run torn down by the T3 API path, repo and App per
  the T2/T3 hand steps. Verify by listing, never by assuming.
- [ ] **Step 4: Record the evidence**; any fake-vs-real divergence is a Task 2/4 bug to
  fix in this pass with the fakes corrected and the suite re-run.

### Task 15: Docs, tracking, and pass close

**Files:**
- Modify: `packages/create-cairn-site/README.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `CLAUDE.md` (the email gotcha, from the spike's answer), `docs/STATUS.md`, this plan
  (post-mortem), `docs/internal/docs-friction-log.md` (triage check)

- [ ] **Step 1: README**: the chapter's flags (`--domain`, `--connect`), the
  park-and-resume story, the token's lifecycle (prefilled, pasted, deleted), the money
  framing per the spike.
- [ ] **Step 2: CHANGELOG** under `## Unreleased`; `Consumers must: nothing` (tool
  unpublished, engine untouched).
- [ ] **Step 3: The admin track's chapter 2 page** in the docs arm the T2/T3 pages live
  in, same register.
- [ ] **Step 4: CLAUDE.md email gotcha** rewritten from the spike's ruling-4 answer,
  dated.
- [ ] **Step 5: ROADMAP**: T4a marked done in place; T4b and T5 entries current.
- [ ] **Step 6: Doc gates by name**: `check:reference`, `check:reference:signatures`,
  `check:docs`, `check:package`; `check:snippets` only if a fenced block under
  `docs/guides` or `docs/reference` was touched.
- [ ] **Step 7: Pass-end ritual** per `cairn-pass`: code-simplifier over the pass's
  files; root `npm run check` 0/0; root `npm test` exit 0; `check:comments`;
  `check:surface` (no engine change expected; a flag is a leak to understand); push,
  PR, re-derive the CI workflow list with `grep -l pull_request`, confirm green; append
  the post-mortem; update STATUS (T4a done, T4b sitting next); prep the context clear.
