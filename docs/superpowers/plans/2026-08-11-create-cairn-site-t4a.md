# create-cairn-site Pass T4a (the domain half of chapter 2) Implementation Plan

> **For agentic workers:** execute task-by-task by dispatching `cairn-implementer` per task
> (the repo default), test-first, full gate per task; the main loop reviews each diff and
> confirms the gate before the next dispatch. Steps use checkbox (`- [ ]`) syntax.

**Goal:** take a site from `live` (chapter 1's finish line) to serving on the admin's own
domain: token-prefill, zone create, the best-effort records read behind the MX-preserving
carry-over gate, delegation park-and-resume with four-state detection, and a
rollback-safe custom-hostname cutover, with terminal-only parks (the console is T4b's).

**Architecture:** the T2/T3 step and state-machine idiom, extended past `live` with four
new states (`zone-created`, `records-carried`, `delegated`, `domain-live`). One new
credential (the pasted, prefilled API token) lives in the 0600 state record for the
chapter's lifetime and is deleted at completion by an explicit non-merge save. A thin
fetch-based Cloudflare API seam (injectable base URL, error mapping by `errors[].code`)
carries zone and DNS calls; accounts enumerate through the wrangler session, which exists
before any token. **Only `chapter2.mjs` writes `step` or persists the record; every step
function is pure over an in-memory record and returns its outcome.**

**Tech stack:** plain Node `.mjs` (no TypeScript, no framework), `node:test`, the T2/T3
fake-bin pattern plus a new fake Cloudflare API fixture server whose fixtures are copied
verbatim from spike-captured bodies, wrangler `^4` via the site's own devDependency.

**Spec:** `docs/superpowers/specs/2026-08-11-create-cairn-site-t4a-design.md`. The five
rulings govern; the umbrella's chapter 2 section is the parent.

## Global Constraints

- The runtime library (`src/lib`) is untouched; no engine public-API change.
- No secret ever lands under the project directory; the pasted token lives only in the
  0600 state record, is scrubbed from any record `retireSite` sets aside, never appears
  in argv (unattended runs supply `CAIRN_CF_API_TOKEN` by env only), and is deleted at
  chapter completion.
- Only `chapter2.mjs` writes `step` or calls the state store; step functions are pure
  over the in-memory record.
- A park (wait-class row) is returned, exits 0, and prints the re-entry command; only
  act and ask-someone rows throw and exit 1.
- Every exit prints a next step; the cutover redeploy prints the `deploy.mjs` heartbeat.
- `--dry-run` prints the whole chapter and performs none of it: zero shell-outs, zero
  network, via a synthesized placeholder record (chapter 1's `dryRun ? null` precedent).
- No suite may touch the operator's desktop (the PATH-controlled `openBrowser` pattern).
- "Already done" detection keys on recorded state; the carry-over gate has its own
  recorded outcome, distinct from the delegation park.
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`), em dash
  banned in comments.
- Production domains are untouchable. The live e2e uses only the scratch domain, seeded
  with MX and a DKIM-shaped TXT before the run; every created resource is torn down and
  verified gone by listing.
- Every platform claim carries the spike's date; a spike question that answers "no" or
  "unknown" re-plans its dependent task before dispatch, never "implement against the
  closest guess."

## Spike amendments (2026-08-11, from Task 1)

The spike (`docs/internal/2026-08-11-t4a-domain-spike.md`) ran in the main loop and corrected
eight premises below. Two of them would have shipped a defect: the cutover mechanism and the
wrong-scope error code. Read the spike doc before dispatching any task marked **[spike]**.

1. **Task 9 attaches a Workers Custom Domain, not a Workers Route.** A route alone does not make
   a hostname resolve, so the ordered flow as written could never have confirmed. Every cairn site
   in production (`907.life`, `ecxc.ski`, `cairn.pub`, two ASC subdomains) is attached by Custom
   Domain. Recommended call: `PUT /accounts/:id/workers/domains`, which keeps the spec's
   rollback-safe ordering with one redeploy. Rows rename: `route-create-failed` becomes
   `custom-domain-failed`; `route-not-serving` keeps its meaning, worded about the hostname.
2. **Task 5 maps insufficient scope on HTTP 403 regardless of `errors[].code`.** The
   account-scoped zone-create refusal reports code **0**, not 9109, with the missing permission
   named in the message; 9109 appears on other resources. Surface the permission name in the
   `token-scope-missing` row. Handle `error_chain` nesting (400/6003 wraps 6111).
3. **Task 6 reads `wrangler whoami --json`** (the flag exists; it exits non-zero when not
   authenticated) and parses from the first `{`, because the command prints non-JSON preamble
   lines before its JSON. Do not parse the ASCII table. `CLOUDFLARE_ACCOUNT_ID` in the spawn env
   is confirmed honored.
4. **Task 8 translates CAA** between `node:dns`'s `{ critical, type, issue }` and Cloudflare's
   `data: { flags, tag, value }`; the shapes do not line up. It probes **both TXT and CNAME** for
   every DKIM selector (Google publishes TXT, Fastmail publishes CNAME). TXT values reassemble
   with `join('')`: a real DKIM value arrived chunked `[255, 155]`. `ENODATA` and `ENOTFOUND` are
   authoritative absence; any other code is `records-read-failed`.
5. **Task 8's registrar instructions read `original_registrar` off the zone object** rather than
   asking the admin. The delegation check compares the live NS lookup against both
   `name_servers` and `original_name_servers`.
6. **Task 8's carry-over gate copy gains a second caveat.** On a domain answering with a
   wildcard, every probed subdomain resolves, so the probe can list records the admin never
   created. The gate says the list may be both incomplete and overcomplete.
7. **Task 3's fixtures are copied from the spike appendix**, which now carries the zone object,
   `result_info` pagination, a DNS record, a Custom Domain, and three error bodies, all verbatim.
   The fake's random per-zone `name_servers` pair stays as a **test device**: real assignment is
   account-stable (all nine zones on this account share one pair), and the doc block should say
   the randomness exists so a wrong-nameserver test can fail. Because an account has exactly one
   pair, `delegation-wrong-nameservers` means "Cloudflare nameservers belonging to another
   account", so its copy tells the admin to move the domain rather than to retype two hostnames.
8. **Task 1's prerequisites include the scratch domain and a zone-create-capable token.** The
   estate token deliberately cannot create zones or mint tokens. Three captures remain blocked on
   that credential: a new zone's birth `status` and whether `name_servers` is populated at
   creation, the 1061 duplicate body and whether it distinguishes same-account from
   foreign-account ownership, and the Custom Domain attach call with its duplicate error.

## Spike amendments, part two (2026-08-12, from the minted token and the scratch domain)

The blocked half of the spike ran once Geoff minted the token and registered `carin-test.org`.
Both addenda in `docs/internal/2026-08-11-t4a-domain-spike.md` carry the evidence. **Amendments 5
and 8 above are superseded**, 5 by Geoff's ruling in 16 and 8 by what the credential unblocked.
One of these, 15, prevents a silent data-loss defect.

9. **Task 7 verifies every prefill key against the live dashboard before shipping the URL.** Of
   the four keys in the spike URL, three resolved and `ssl_certs` rendered an empty control with
   no error. A key the dashboard does not recognize costs the admin an invisible gap in a token
   they paste back with confidence. Two consequences: the shipped URL carries only keys proven to
   resolve, and the chapter never assumes a pasted token holds what the URL requested. The 403
   scope path from amendment 2 is load-bearing, not a backstop. **Task 7 also adds the Email
   Sending permission** (T4b's amendment; the picker offers "Email Sending", "Email Routing
   Addresses", and "Email Security" under Account scope, and the first is ours), so chapter 2 asks
   for one token rather than two.
10. **Task 8's adopt-versus-error branch reads a zone lookup, not the 1061 body.** The duplicate
    body is `{"code":1061,"message":"<name> already exists"}` and carries no ownership field, so
    it cannot distinguish a zone this account holds from one held elsewhere. On 1061, call
    `GET /zones?name=<domain>`: a hit is ours to adopt, a miss belongs to someone else.

    **This rewrites the landed `zone-already-exists` row rather than adding one.** Its current
    copy tells the admin to remove the zone and re-run, which is now wrong for the same-account
    case that gets adopted silently. Keep the key, cut the own-account branch from the copy, and
    let the row mean the foreign-owner case alone.
11. **The catalogue gains three rows, and one landed row is rewritten. Task 4 has already landed,
    so each arrives with the task that raises it**: `zone-hold` and `domain-invalid` in Task 8
    (plus the `zone-already-exists` rewrite from amendment 10), `certificate-pending` in Task 9. `zone-hold` (1428): a zone hold blocks creation, and the
    copy must say the hold clears at the domain's current Cloudflare account rather than at the
    registrar, which makes it `ask-someone`. `domain-invalid` (1002): the domain arrives as free
    text from the admin, so a malformed name deserves better than a generic failure.
12. **Task 9 loses its duplicate-error branch, and the pasted token covers the attach.** The
    Custom Domain `PUT` is idempotent: an identical second call returns HTTP 200 with the same
    domain `id` and `cert_id`. Re-running after a failure is safe by construction. No wrangler
    session is involved, so the credential split in amendment 1 holds. **The attach writes a
    proxied `AAAA` at the apex pointing at `100::` and no `A` record**, so Task 8 must state what
    happens when the admin's apex already carries an address record.
13. **Task 9's confirm must survive a missing certificate.** On a zone minutes old, HTTPS fails
    the TLS handshake immediately after a successful attach while HTTP serves correctly. The
    plan's ordered flow confirms over HTTPS right after attaching, so it would fail on every new
    zone, and fail with an OpenSSL error rather than a status code. Distinguish "attached,
    certificate issuing" from "broken" and hand the owner a `wait` row. The marker pair is
    verified: `/` answers 200 and `/admin` answers 303 to `/admin/login`. **Issuance cannot be
    polled through the API** with this token: `ssl/certificate_packs` and `ssl/verification` both
    return 9109 even with SSL and Certificates Edit granted, so progress is observed by probing
    the hostname.
14. **`route-not-serving` has an observed shape.** A proxied hostname with no Worker behind it
    answers `error code: 522` in 16 plain-text bytes, not an HTML page. A hostname that is proxied
    but not serving answers 5xx, so the marker pair's 200 check discriminates.
15. **Task 8 reads the authoritative nameservers, and treats recursive-resolver absence as low
    confidence.** A stale negative DNS cache reads exactly like an absent record, and it bites in
    the window this chapter runs in. Observed twice: seeded MX records returned nothing from
    `1.1.1.1` while the apex `AAAA` on the same name resolved in the same batch, then returned
    normally minutes later with nothing changed in DNS. The negative is cached **per record
    type**, so the apex resolving proves nothing about a missing MX, and the failure is silent
    because an empty list is what a domain with no mail legitimately looks like. A carry-over that
    trusts it stops the admin's mail and reports success. Read the domain's authoritative
    nameservers directly where they are known. Where the probe falls back to a recursive resolver,
    the gate copy says the list may be incomplete for this reason as well as amendment 6's
    wildcard reason.
16. **The registrar table is cut, and the external-registrar path ships general instructions**
    (Geoff, 2026-08-12). This supersedes amendment 5. A domain registered at Cloudflare arrives
    with an active zone: created to active in 0.36 seconds, never `pending`, with
    `original_name_servers` and `original_registrar` both null. Rather than branch per registrar,
    Task 8 renders generic delegation copy naming the assigned pair, and detects the
    already-active case so it never stages a wait that cannot end. `registrars.mjs` and its test
    leave the file structure.

    **The premise this leaves unobserved, and where it lands.** No externally registered domain
    was tested, so the `POST /zones` success body, the birth `status`, and whether `name_servers`
    is populated at creation remain uncaptured. The instructions are generic, but the zone-creation
    code path still runs for those admins. Task 8 therefore **re-reads the zone rather than
    trusting the create response** to populate `name_servers`, and treats the birth `status` as
    unknown rather than assuming `pending`. The fixture for that body is marked unobserved in
    `fake-cloudflare.mjs` so a later session does not mistake it for a captured one.

## File Structure

```
packages/create-cairn-site/
  src/cloudflare/api.mjs         fetch seam for the Cloudflare REST API (+ .test.mjs)
  src/cloudflare/account.mjs     wrangler-session account enumeration + selection (+ .test.mjs)
  src/cloudflare/prefill.mjs     create-token deep link, paste, validation (+ .test.mjs)
  src/cloudflare/zone.mjs        zone create/adopt, nameservers, 4-state delegation,
                                 generic delegation copy (+ .test.mjs)
  src/cloudflare/records.mjs     probe-list read + carry-over gate writes (+ .test.mjs)
  src/cloudflare/hostname.mjs    rollback-safe cutover: attach, confirm, origin, redeploy (+ .test.mjs)
  src/cloudflare/chapter2.mjs    orchestration: admission, hops, parks, completion (+ .test.mjs)
  test/fake-cloudflare.mjs       REST fixture server from the spike's captured bodies
Modified: src/state.mjs + src/state.test.mjs (deep-merge cloudflare, token-removal save),
  src/cloudflare/exec.mjs + test/fake-bin.mjs (env plumbing + env capture),
  src/cloudflare/deploy.mjs (account-id env), src/cloudflare/chapter.mjs (chapter 1 reads
  the saved account id), src/cloudflare/catalogue.mjs (kind widening + new rows),
  src/prompts.mjs + src/prompts.test.mjs (promptSecret), src/args.mjs (--domain), bin.mjs
  (dispatcher: new resumable steps, live reopens, terminal branch, stale copy),
  test/resume-cloudflare.test.mjs (or sibling), README.md
```

State shape after this pass (`step` remains the resume key; one writer):

```js
{
  name, dir, step,       // step gains: 'zone-created' | 'records-carried' | 'delegated'
                         //   | 'domain-live'  ('domain-live' is final for T4a)
  ownerEmail,
  github: { ... },       // unchanged
  cloudflare: {
    url, workerName,     // T3 fields
    accountId,           // Task 6; chapter 1's deploy exports it into the spawn env
    apiToken,            // Task 7; DELETED at completion by explicit non-merge save
    zoneId, nameServers, // Task 8 (ensureZone); the assigned per-zone pair
    domain,              // Task 10 (admission prompt or --domain flag)
    carryOver,           // Task 8: { outcome: 'carried' | 'declined', at, count, types }
  },
}
```

The runtime order is admission → account selection → token prefill → zone create →
records read + carry-over gate → nameserver instructions (park, exit 0) → delegation
re-detect (four states) → cutover (route, confirm, origin, redeploy) → completion (token
deleted). Parks are ordinary exits at a recorded step; a re-run re-detects and continues.

## Review-gate findings (2026-08-11, pre-execution)

Three adversarial reviewers (premise-check, trustworthiness, spec-plan consistency) ran
against the first draft of this plan and its spec. Their convergent findings forced the
three-pass re-cut (spec ruling 1) and the corrections now baked into the tasks below:
the `updateSite` shallow-merge clobber and the one-writer rule (Task 2); the
account-selection circularity and the missing env plumbing (Tasks 2, 6); the carry-over
gate's missing state key and the post-delegation re-read trap (Task 8); DNS's
non-enumerability and the honest gate copy (spec ruling 4, Task 8); the cutover's
write-then-verify order, rollback, and false-positive confirm (Task 9); the token
lifecycle contradiction with teardown and undefined re-entry (Tasks 10, 13); park exit
semantics (spec ruling 5, Tasks 4, 11); fake-fidelity requirements and error-code
mapping (Tasks 1, 3, 5); `bin.mjs`'s re-scaffold fallthrough (Task 11); `promptSecret`'s
missing producer and the argv exposure (Task 7); the registrar-instructions deliverable
and the nameservers field (Task 8); and roughly a dozen wording, attribution, and
file-list corrections applied in place. Deferred with reasons: the resume table (an
umbrella debt predating this pass, noted for Pass D); the console and email findings
(moved with their work to T4b). Rejected: none.

---

### Task 1: The spike (main loop; estate account; decision gate for Tasks 5-10)

**Files:**
- Create: `docs/internal/2026-08-11-t4a-domain-spike.md`

Rehearse the chapter's platform premises by hand before any task is drafted against a
stale one. Every claim gets a date and observed output; **every response body the chapter
will consume is captured verbatim into an appendix, and Task 3's fixtures are copied from
that appendix, never written from memory.** A spike question that answers "no" or
"unknown" re-plans its dependent task before dispatch.

- [ ] **Step 1: Account enumeration before any token.** How does the tool list accounts
  through the wrangler session alone: `wrangler whoami` output (record it verbatim,
  pinned by wrangler version, noting the output-string risk T3 filed) or a
  session-authenticated API call? Also observe `CLOUDFLARE_ACCOUNT_ID` in a spawn env
  selecting the account on a multi-account session, and record the observed behavior.
  **Gate for Tasks 2 and 6.**
- [ ] **Step 2: Zone creation, verbatim.** With a token minted for the purpose, create a
  zone for a scratch name, capture the full success body (`name_servers`,
  `original_name_servers`, `status` vocabulary including `initializing`, `account.id`,
  `type`), the wrong-scope error body, the malformed-token body, and the 1061
  zone-already-exists body, asking specifically whether 1061 distinguishes
  same-account from foreign-account ownership; if it does not, Task 8's adopt-vs-error
  branch re-plans on the zone-list lookup instead. Delete the zone. **Gate for Tasks 3,
  5, and 8.**
- [ ] **Step 3: The records probe.** Fix the probe list (apex A/AAAA/MX/TXT/CAA/NS,
  `www`, `mail`, `autodiscover`, `_dmarc`, and a named DKIM-selector list), run it via
  `node:dns` against a real domain with mail, and record the raw shapes: `resolveTxt`'s
  `string[][]` chunking against a long DKIM value, `resolveMx`'s
  `{ exchange, priority }`, and the DNS-record create call's counterpart fields
  (`priority` distinct from `content`; CAA's `data` object). **Gate for Task 8.**
- [ ] **Step 4: Routes and the cutover.** Record the route-creation call the cutover
  needs, which credential covers it (the wrangler session or the pasted token: this
  decides the prefill template), the verbatim duplicate-route error, and what a proxied
  hostname with no matching route serves (the 1016/522/parked-page shapes the confirm
  must not read as success). **Gate for Task 9, and an input to Step 5.**
- [ ] **Step 5: The prefill URL, authored last.** With every call the chapter makes now
  enumerated (zone create, DNS writes, and whatever Step 4 added), establish the
  create-token page's prefill parameter shape and produce a URL covering the full scope
  set, recording which parts the admin still clicks. If prefill is unsupported for any
  needed field, record the closest deep-link and the copy that bridges the gap. **Gate
  for Task 7.**
- [ ] **Step 6: Write the verdict doc and amend this plan.** Every task below marked
  **[spike]** gets its premise confirmed or corrected in place, the T3 idiom (the
  amendment block at the top of File Structure).

### Task 2: State and spawn-seam foundations

**Files:**
- Modify: `packages/create-cairn-site/src/state.mjs`,
  `packages/create-cairn-site/src/state.test.mjs`,
  `packages/create-cairn-site/src/cloudflare/exec.mjs`,
  `packages/create-cairn-site/src/cloudflare/exec.test.mjs`,
  `packages/create-cairn-site/test/fake-bin.mjs`,
  `packages/create-cairn-site/test/fake-bin.test.mjs`

**Interfaces:**
- Produces: `updateSite` deep-merging `cloudflare` the way it merges `github`;
  `replaceSite(id, record)` (or an equivalent explicit whole-record save) for the
  token's deletion, which a merge can never express; `runWrangler`/`runNpm` accepting
  `env` (merged over `process.env`); the fake bin recording `env` alongside
  `{ argv, cwd, stdin }`.

- [ ] **Step 1: Failing state tests.** A two-hop partial write
  (`{ cloudflare: { accountId } }` then `{ cloudflare: { zoneId } }`) preserves both
  fields plus T3's `url`/`workerName`; `replaceSite` removes a key and the removal is
  asserted against `loadSite()` re-read from disk plus a scan of the raw file bytes;
  `retireSite` on a record carrying `apiToken` scrubs the token from the retired file.
- [ ] **Step 2: Failing exec/fake-bin tests.** `runWrangler` passes `env` through to the
  spawn; the fake bin's self-test proves a planted env var is recorded in its invocation
  log (prove the test can fail by asserting a var the caller never set, then fix the
  assertion).
- [ ] **Step 3: Implement all; suite green; commit.**

### Task 3: The fake Cloudflare API (test helper) **[spike]**

**Files:**
- Create: `packages/create-cairn-site/test/fake-cloudflare.mjs`,
  `packages/create-cairn-site/test/fake-cloudflare.test.mjs`

**Interfaces:**
- Produces: `startFakeCloudflare()` (the `startFakeGithub` naming) returning
  `{ apiBase, state, requests, failNext(route, status, body), close() }`, plus the
  `CAIRN_CLOUDFLARE_API_BASE` env seam read at call time by `api.mjs`, so both
  in-process tests and spawned-`bin.mjs` tests can point at it (the
  `pointAtFake` idiom).

- [ ] **Step 1: Write the helper and its self-test.** Routes cover zone create/get/list,
  DNS record create/list, and routes-create, with bodies copied from the spike appendix:
  the v4 envelope, `success: false` under HTTP 200, error codes as data, `result_info`
  pagination on list routes (with a page-2 fixture), and a **random per-zone
  `name_servers` pair** (a fixed pair would hide wrong-nameserver detection). The
  self-test proves each route, `failNext`'s status/body form, pagination, and port
  cleanup.
- [ ] **Step 2: Full package suite green; commit.**

### Task 4: The catalogue rows

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/catalogue.mjs`,
  `packages/create-cairn-site/src/cloudflare/catalogue.test.mjs`

**Interfaces:**
- Produces: the `ErrorKind` typedef widened to `'wait' | 'act' | 'ask-someone'` (the
  header comment's "every row is act" and its hardcoded row count both rewritten); rows
  keyed `token-invalid`, `token-scope-missing`, `zone-already-exists`,
  `zone-create-failed`, `records-read-failed`, `carry-over-declined`,
  `delegation-pending` (wait), `delegation-wrong-nameservers` (act, prints the zone's
  assigned pair), `hostname-propagating` (wait), `route-not-serving` (act),
  `route-create-failed`, `cutover-deploy-failed`, `account-ambiguous`; every row carries
  a literal `Next:` line (`extractNext` throws without one).

- [ ] **Step 1: Failing tests** asserting each row exists, carries non-empty literal
  text, names its kind, and ends in a next command; the existing all-rows-are-act
  assertion is replaced by a per-row kind table, not deleted.
- [ ] **Step 2: Write the rows; suite green; commit.** The two wait rows read as normal
  outcomes, not failures, per spec ruling 5.

### Task 5: The API seam **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/api.mjs`,
  `packages/create-cairn-site/src/cloudflare/api.test.mjs`

**Interfaces:**
- Consumes: catalogue rows (Task 4); the spike's captured error bodies.
- Produces: `makeApi({ token, accountId })` reading `CAIRN_CLOUDFLARE_API_BASE` at call
  time, with one method per call the chapter makes (zone create/get/list, records
  create/list, route create; the spike finalizes the set). Mapping is by
  `errors[].code` first, HTTP status second: malformed token (400/6003) →
  `token-invalid`; insufficient scope (403/9109) → `token-scope-missing`; expired
  (401/10000) → `token-invalid`; `success: false` under 200 is a failure; 429 waits out
  `Retry-After` once, then reports. **Retry only GET; a failed POST/PUT reports to the
  caller, which re-reads and reconciles before any second write.** A `redactToken`
  scrubber runs over every error message this seam constructs.

- [ ] **Step 1: Failing tests against the fake** for the success path, each code mapping,
  `success: false` under 200, pagination traversal (the page-2 account fixture), the
  429 path, and the no-second-POST rule (`failNext` a 5xx on a record create; assert
  exactly one POST in `requests`).
- [ ] **Step 2: The redaction test.** Construct a failure whose upstream body echoes a
  planted token-shaped value; assert the constructed message and any thrown error's
  text carry the redacted form. Prove it can fail first.
- [ ] **Step 3: Implement; suite green; commit.**

### Task 6: Account selection, wired into chapter 1 **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/account.mjs`,
  `packages/create-cairn-site/src/cloudflare/account.test.mjs`
- Modify: `packages/create-cairn-site/src/cloudflare/chapter.mjs`,
  `packages/create-cairn-site/src/cloudflare/deploy.mjs`

**Interfaces:**
- Consumes: the spike's Step 1 enumeration mechanism (wrangler session, pre-token);
  `runWrangler`'s `env` option (Task 2); catalogue rows.
- Produces: `ensureAccountId({ record, prompt, log })` returning the account id: saved →
  reused with no enumeration; single → saved silently; multiple → one prompt, saved;
  non-interactive with no saved id → `account-ambiguous`. `deployWorker` (and the other
  wrangler calls in chapter 1's deploy group) gain an optional `accountId` exported as
  `CLOUDFLARE_ACCOUNT_ID` in the spawn env.

- [ ] **Step 1: Failing tests for `ensureAccountId`** per the four branches; the saved-id
  branch asserts zero enumeration calls.
- [ ] **Step 2: Failing test for the chapter-1 fix**: a deploy with a record carrying
  `accountId` shows `CLOUDFLARE_ACCOUNT_ID` in the fake bin's recorded env; a record
  without one shows no such var (the falsifiable pair).
- [ ] **Step 3: Implement; suite green; commit.**

### Task 7: Token prefill **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/prefill.mjs`,
  `packages/create-cairn-site/src/cloudflare/prefill.test.mjs`,
  `packages/create-cairn-site/src/prompts.test.mjs` (none exists today)
- Modify: `packages/create-cairn-site/src/prompts.mjs`

**Interfaces:**
- Consumes: `makeApi` (the scope-proving validation call the spike names),
  `openBrowser`, catalogue rows, the spike's Step 5 URL.
- Produces: `promptSecret(message)` in `prompts.mjs`, wrapping `@clack/prompts`'
  `password` with the `exitOnCancel` contract (new export, its own test);
  `ensureApiToken({ record, log, openBrowser })` returning the token: saved-and-valid →
  reused with no browser; invalid → re-prefill; pasted-but-underscoped →
  `token-scope-missing`, one re-prompt, then the row. Unattended runs read
  `CAIRN_CF_API_TOKEN` from env; a token-shaped command-line flag is rejected with a
  message naming the env var.

- [x] **Step 1: Failing tests**: the four branches; the env-var path; the flag
  rejection; the token absent from every captured log line and every error message (a
  planted distinctive value, proven able to fail); the browser open uses the
  PATH-controlled pattern.
- [x] **Step 2: Implement; suite green; commit.** The prefill URL lives here with the
  spike's date in its doc block. Per amendment 9 it carries **only keys proven to
  resolve in the dashboard**, plus the Email Sending permission T4b rides. A test pins
  the URL's key list so a later edit cannot quietly add an unverified key.

### Task 8: Zone, records, and the carry-over gate **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/zone.mjs`,
  `packages/create-cairn-site/src/cloudflare/zone.test.mjs`,
  `packages/create-cairn-site/src/cloudflare/records.mjs`,
  `packages/create-cairn-site/src/cloudflare/records.test.mjs`

**Interfaces:**
- Consumes: `makeApi`, catalogue rows, the spike's probe list and captured bodies.
- Produces: `ensureZone({ record, api, log })` creating or adopting the zone, returning
  `{ zoneId, nameServers, alreadyActive }`. Per amendment 10 a 1061 sends it to
  `GET /zones?name=`, adopting a hit and raising `zone-already-exists` on a miss; per
  amendment 16 it **re-reads the zone** rather than trusting the create response to
  populate `name_servers`, and reports `alreadyActive` for the arrives-active case.
  `readCurrentRecords({ domain, resolve })` running the probe list, returning typed
  records (MX with distinct `priority`; TXT values joined per the spike's observed
  chunking), distinguishing authoritative-empty from failure (`records-read-failed`),
  reading the **authoritative nameservers** where known per amendment 15 and flagging
  `lowConfidence` when it fell back to a recursive resolver, and **refusing to run once
  delegation is active** (it would read the tool's own writes; the persisted carry-over
  snapshot is the source after that point); `carryOverRecords({ api, zoneId, records,
  confirm, log })` writing only after `confirm`, returning `{ outcome: 'carried' |
  'declined', count, types }`, and stating what it does when the apex already carries an
  address record the attach will want (amendment 12);
  `checkDelegation({ record, api, resolveNs })` returning
  `'pending' | 'wrong-nameservers' | 'propagating' | 'active'` from an independent NS
  lookup plus the zone's status, short-circuiting to `active` for an arrives-active
  zone; `delegationInstructions(nameServers)` rendering **generic** copy naming the
  assigned pair (amendment 16 cut the per-registrar table).

- [x] **Step 1: Failing zone tests**: create-and-return; 1061 followed by a name lookup
  that hits, adopting it; 1061 followed by a miss, raising the rewritten `zone-already-exists`; the
  1428 and 1002 rows from amendment 11; `nameServers` read from a zone re-read rather
  than the create response (the fake returns a create body with `name_servers` absent,
  and the test fails if the module trusts it); `alreadyActive` for a zone that arrives
  active.
- [x] **Step 2: Failing records tests**: the probe list is exactly the spike's (asserted
  against the module's exported list); typed returns including a chunked DKIM-length
  TXT surviving intact and MX priority as its own field; authoritative-empty vs
  failure; the post-delegation refusal; **the authoritative read is preferred and
  `lowConfidence` is set only on the recursive fallback** (amendment 15), proven by a
  resolver stub that answers absent recursively and present authoritatively, which is
  the negative-cache shape the spike observed.
- [x] **Step 3: Failing gate tests**: nothing writes before `confirm`; declining writes
  nothing and returns `declined`; confirming writes every listed record (the fake's
  `state` shows each, MX priority intact) and returns `carried`; the gate copy carries
  ruling 4's incompleteness caveat verbatim (asserted as a literal string) **and the
  low-confidence caveat when that flag is set**; the stated apex-collision behavior.
- [x] **Step 4: Failing delegation tests**: the four states, driven by the fake's random
  pairs (wrong-nameservers = Cloudflare-shaped but not this zone's pair, naming the
  correct two in its row); pending → the `delegation-pending` wait row with the generic
  instructions rendered once; an arrives-active zone short-circuits and stages no wait.
- [x] **Step 5: Implement all; suite green; commit.**

### Task 9: The rollback-safe cutover **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/hostname.mjs`,
  `packages/create-cairn-site/src/cloudflare/hostname.test.mjs`

**Interfaces:**
- Consumes: `writePublicOrigin` (existing `config.mjs`), `deployWorker` (existing
  `deploy.mjs`, heartbeat included), the Custom Domain attach on the pasted token per
  amendments 1 and 12, catalogue rows.
- Produces: `cutOverHostname({ record, api, exec, fetchImpl, log })`, ordered: attach
  the Custom Domain (idempotent per amendment 12, so a retry re-attaches safely);
  confirm the existing deployment answers on the new hostname with the site-specific
  marker (`/` 200 AND `/admin` 303 to `/admin/login`, the T3 live-check idiom; a
  Cloudflare error page or parked page fails the marker); only then `writePublicOrigin`
  + redeploy + re-confirm. Outcomes: success (`domain-live`); still-propagating DNS →
  the `hostname-propagating` wait row; **a TLS failure on a hostname whose certificate
  has not issued → the `certificate-pending` wait row, distinguished from a broken site
  per amendment 13**; resolved-but-not-this-site → `route-not-serving` (act, and the
  observed shape is a 522 per amendment 14); attach failure →
  `custom-domain-failed`; redeploy failure → `cutover-deploy-failed` **and the origin
  value on disk restored to the `workers.dev` URL** (asserted by reading the file).

- [ ] **Step 1: Failing tests** for the order (the fake's `requests` log proves the
  attach precedes any origin write), each outcome, the marker's rejection of a
  200-that-is-not-this-site body, a transport-level TLS error mapping to
  `certificate-pending` rather than to a broken-site row, a repeated attach returning
  the same identity without a duplicate error, and the rollback restore.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 10: Chapter orchestration, admission, completion **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/chapter2.mjs`,
  `packages/create-cairn-site/src/cloudflare/chapter2.test.mjs`
- Modify: `packages/create-cairn-site/src/args.mjs` (`--domain <name>`: the value and
  the unattended opt-in in one flag; `--connect` stays reserved for T4c)

**Interfaces:**
- Consumes: every Producer above, in the runtime order of File Structure.
- Produces: `runChapter2({ record, args, ... })`, the one writer of `step` and the one
  caller of the state store; the admission copy (a domain you own, at no cost); parks
  returned as outcomes (exit 0 upstream), errors thrown; re-entry at `domain-live`
  prints what it will re-do and re-runs `ensureApiToken`.

  **Token deletion is a terminal-state rule, not a `domain-live` rule** (T4b's design
  sitting, 2026-08-11). Chapter 2 no longer ends at `domain-live`, so deleting there
  would strand the email half without a credential. A park **keeps** the token. A
  terminal state **deletes** it, and the terminal states are `email-live` and a
  recorded decline of the paid plan, both of which land in T4b. Task 10 therefore
  implements the rule and its keep half; the delete half is exercised when T4b adds
  those states. Without this, an owner who declines leaves a live credential on disk
  indefinitely.

- [ ] **Step 1: Failing admission tests**: interactive consent; `--yes` without
  `--domain` skips with a hint; `--yes --domain example.com` proceeds unattended;
  declining parks with chapter 1's site intact.
- [ ] **Step 2: Failing hop-order and resume tests**: a record at each step resumes at
  exactly the next hop with zero repeated writes (asserted per hop via the fakes'
  request and invocation logs); a record at `records-carried` never re-reads records; a
  declined gate never silently advances; `--dry-run` prints every hop with zero
  shell-outs and zero fake-API requests, via the synthesized record.
- [ ] **Step 3: Failing completion tests**: `domain-live` is **not** terminal, so
  `apiToken` survives it (asserted against `loadSite()`'s disk re-read); a synthesized
  terminal state deletes it, absent from both the re-read and the raw file bytes, with
  the file still 0600; the closing copy names the domain and admin URL; re-entry at
  `domain-live` re-runs the prefill.
- [ ] **Step 4: Implement; suite green; commit.**

### Task 11: The bin dispatcher

**Files:**
- Modify: `packages/create-cairn-site/bin.mjs`,
  `packages/create-cairn-site/test/resume-cloudflare.test.mjs` (or a sibling
  `resume-chapter2.test.mjs` if it would outgrow its shape)

- [ ] **Step 1: Failing dispatcher tests** (the T3 discrete-resume-case pattern,
  spawning `bin.mjs` with the fake bins, the fake API's env seam, and a fake-opener
  PATH): a record at each new step (`zone-created`, `records-carried`, `delegated`)
  enters chapter 2 and **never reaches `scaffold`** (the re-scaffold fallthrough is the
  defect); a record at `live` with `--domain` enters chapter 2 instead of the
  already-live early return; a record at `domain-live` is terminal with the new closing
  copy; a park exits 0; a thrown row exits 1; `--start-over` from a chapter-2 step
  refuses with a next step naming the zone, records, and Worker that exist (no retire,
  no re-scaffold).
- [ ] **Step 2: Implement**: extend the resumable-step list, reopen the `live` branch,
  add the terminal branch, the `--start-over` refusal, and update `printLiveInfo`'s
  stale "domain and email arrive with the next chapter" copy. Suite green; commit.

### Task 12: The cross-cutting safety net

**Files:**
- Modify: the Task 11 test file (extend)

- [ ] **Step 1: The interruption cases.** One spawned-CLI case per hop boundary (a
  record written at that step), re-run to completion against the fakes, asserting no
  repeated side effects hop by hop.
- [ ] **Step 2: The secret sweep.** Drive a full run with a planted distinctive token;
  sweep the scaffold tree (including `wrangler.jsonc`), every log line, every error
  message, argv of every fake-bin invocation, and `siteStateDir()` **including
  `*.retired-*.json`**: present only in the live state record before completion,
  nowhere after. Prove the sweep can fail by planting the value once, then remove the
  plant.
- [ ] **Step 3: Suite green; commit.**

### Task 13: The live e2e (main loop + Geoff's moments, scratch domain)

**Files:**
- Create: evidence in this plan's post-mortem; divergences appended to the Task 1 spike
  doc

Prerequisites, named at dispatch: the scratch domain exists at an external registrar
(ruling 3; Geoff registers it once, outside the tool), **seeded with an MX record and a
DKIM-shaped TXT** so the carry-over proof can fail; no paid plan is required (this
chapter costs nothing). The T3-proven install pattern (tarball rewrite at the chapter
boundary) carries over.

- [ ] **Step 1: Full run.** From `live` on a fresh scaffolded site: admission, account
  selection, prefill (Geoff pastes the token), zone create, the gate showing the seeded
  records with the incompleteness caveat, nameserver change at the registrar (Geoff's
  browser), park with exit 0, re-run re-detect through `active`, cutover. Verify: the
  site answers on the domain through the marker pair, `workers.dev` still answers, the
  seeded MX and TXT are in the zone byte-intact (priority included), the record is at
  `domain-live` with no `apiToken` on disk, and the browser-moment count is recorded.
- [ ] **Step 2: Interrupted resume.** Re-run after a kill mid-chapter; the fakes prove
  zero repeated writes in CI, and the live run proves it once by listing the zone's
  records twice around a resumed hop.
- [ ] **Step 3: Teardown.** Re-run the prefill for a teardown token (completion deleted
  the working one by design; record the extra browser moment), delete the zone via the
  API, leave the domain parked at its registrar, tear down the run's Worker/D1/R2 by
  the T3 API path, repo and App per the T2/T3 hand steps. Verify by listing, never by
  assuming.
- [ ] **Step 4: Record the evidence**; any fake-vs-real divergence is a Task 2/3/5 bug
  to fix in this pass with the fakes corrected and the suite re-run.

### Task 14: Docs, tracking, and pass close

**Files:**
- Modify: `packages/create-cairn-site/README.md`, `CHANGELOG.md`, `ROADMAP.md`,
  `docs/STATUS.md`, this plan (post-mortem), `docs/internal/docs-friction-log.md`
  (triage check), the admin track's domain page

- [ ] **Step 1: README**: `--domain`'s two roles, the park-and-resume story, the token's
  lifecycle (prefilled, pasted, deleted; env var for unattended), the honest-DNS caveat.
- [ ] **Step 2: CHANGELOG** under `## Unreleased`; `Consumers must: nothing` (tool
  unpublished, engine untouched).
- [ ] **Step 3: The admin track's domain page**, stating the chapter's browser-moment
  count as the e2e measured it.
- [ ] **Step 4: ROADMAP**: the three-pass cut recorded where the create-cairn-site item
  lives (T4a done in place, T4b and T5 current; T4c added); the superseded two-pass
  split removed.
- [ ] **Step 5: Doc gates by name**: `check:reference`, `check:reference:signatures`,
  `check:docs`, `check:package`; `check:snippets` only if a fenced block under
  `docs/guides` or `docs/reference` was touched.
- [ ] **Step 6: Pass-end ritual** per `cairn-pass`: code-simplifier over the pass's
  files; root `npm run check` 0/0; root `npm test` exit 0; `check:comments`;
  `check:surface` (no engine change expected; a flag is a leak to understand); push,
  PR, re-derive the CI workflow list with `grep -l pull_request`, confirm green; append
  the post-mortem; update STATUS (T4a done, T4b sitting next); prep the context clear.

---

## Post-mortem, part one (2026-08-11): the offline half landed, the live half is blocked

**Status: Tasks 1 (partial), 2, 3, 4, 5, and 6 are done and committed on `t4a-domain-chapter`.
Tasks 7 through 13 are blocked on two things only Geoff can supply. Task 14 waits for them.**

### What landed

| Task | What it built | Evidence |
|---|---|---|
| 1 | The spike, `docs/internal/2026-08-11-t4a-domain-spike.md` | Steps 1, 3, 5 answered outright; 2 and 4 answered on shape and mechanism by reading estate resources; eight amendments folded into this plan |
| 2 | `cloudflare` deep-merge, token scrub on retire, `env` through the spawn seam, fake-bin `env` capture | falsifiable env pair proven failing then passing |
| 3 | `test/fake-cloudflare.mjs`, fixtures copied verbatim from the spike appendix | 13 self-tests |
| 4 | The catalogue widened to `wait`/`act`/`ask-someone`, fifteen new rows | per-row kind table with a coverage guard derived from the module |
| 5 | `src/cloudflare/api.mjs`, the REST seam | 21 tests; redaction proven failing before it was implemented |
| 6 | `ensureAccountId` plus the chapter-1 multi-account fix across four wrangler call sites | preamble-parse proven failing then passing |

Final suite: **342 pass, 0 fail, exit 0** in `packages/create-cairn-site`.

### The two corrections that would have shipped a defect

**The cutover mechanism was wrong in the plan.** Task 9 was written to create a Workers Route.
A route does not make a hostname resolve, so the ordered flow (create the route, then confirm the
deployment answers on the new hostname) could never have confirmed. Every cairn site in production
is attached by a Workers **Custom Domain**, which creates the DNS record and certificate on the
tool's behalf. Found by listing the estate's own custom domains rather than by reasoning about it.

**The wrong-scope error code was wrong in the plan.** Task 5 was written to map insufficient scope
on HTTP 403 with `errors[].code` 9109. The account-scoped zone-create refusal reports code **0**,
with the missing permission named in the message. Keying on the code would have missed the case
chapter 2 hits most, and the message turns out to carry the most useful thing in the whole failure.

A third correction is smaller but still load-bearing: `wrangler whoami --json` prints non-JSON
preamble lines before its JSON, so `JSON.parse(stdout)` throws on real output.

### Three defects the main loop caught in diff review

Each was folded with its own test rather than filed for later.

1. **An environment-dependent test.** The `CLOUDFLARE_ACCOUNT_ID`-absence assertion measured the
   operator's own shell, so it would fail for anyone who exports that variable and pass on a bare
   runner. Verified failing before the guard and passing after.
2. **A DNS-record failure printed the zone row**, telling an admin whose carry-over broke midway
   that "Creating the Cloudflare zone for your domain did not finish". Now has its own row.
3. **An account-lookup failure printed the abandoned-sign-in row**, sending an admin to redo a
   browser sign-in that would not have helped. Split: a non-zero `whoami` exit really is the
   sign-in problem, since `--json` documents a non-zero exit as "not authenticated", but exiting 0
   with no readable account list is a different failure and now says so.

### What blocks the rest, precisely

Tasks 7 through 13 need two things, and neither is recoverable from this workstation:

1. **A Cloudflare API token that can create zones.** The estate token deliberately cannot, and
   deliberately cannot mint tokens either, so it cannot self-extend. That refusal is correct and
   should stay; it just means the spike cannot mint its own. Observed live, not inferred:
   `POST /zones` returns 403 and `GET /user/tokens` returns 9109.
2. **The scratch domain**, registered at an external registrar and seeded with an MX record and a
   DKIM-shaped TXT before the run. **This is a correction to the plan, which named it as a Task 13
   prerequisite only.** Spike step 4 needs an active zone under our control to observe the Custom
   Domain attach and to see what a proxied hostname with no matching Worker serves, so it is a
   Task 1 prerequisite too.

Both collapse into one browser sitting, and the spike doc carries the prefilled create-token URL
for it. Three captures stay open until then: a new zone's birth `status` and whether `name_servers`
is populated at creation; the 1061 duplicate body and whether it distinguishes same-account from
foreign-account ownership; and the Custom Domain attach call with its duplicate error.

### Carried into the resumed pass

- **`carry-over-declined` is an `act` row, so declining exits 1.** A deliberate choice by the admin
  arguably deserves a clean exit, but there is no kind for "done, by choice" and inventing one for a
  single row is the over-abstraction the charter warns against. Task 10 owns the call: its
  orchestration can treat a decline as a clean stop without a fourth kind.
- `npm run check` at the root does **not** type-check this package (the root tsconfig covers
  `src/lib` only), and `check:comments` covers `src/lib` only too. `npm test` inside the package is
  the real gate for `create-cairn-site` work. This sharpens STATUS carry-forward 2 from "no comment
  gate" to "no comment gate and no type gate".
- `src/github/install.test.mjs`'s timing flake tripped once under load across roughly a dozen suite
  runs. Only its timing assertion is load-sensitive; the state tests added this pass are
  deterministic filesystem checks and cannot flake. Already STATUS carry-forward 3.
