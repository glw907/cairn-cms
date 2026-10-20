# create-cairn-site Pass T4b: the email half of chapter 2, and the money

> **For agentic workers:** each task is dispatched to `cairn-implementer` (pinned Sonnet),
> test-first. The main loop reviews each diff and confirms the full gate (targeted test,
> `npm run check` 0/0, `npm test` exit 0 in `packages/create-cairn-site`) before the next
> dispatch. Tasks marked **[spike]** must not be dispatched before Task 1 has answered their
> question; a spike answer of "no" or "unknown" re-plans its dependent task rather than
> implementing against the closest guess.

**Goal:** take a scaffolded site from `domain-live` to sending its own sign-in mail, and carry
an honest cost admission across the whole tool.

**Architecture:** the email half extends chapter 2's existing state machine two hops
(`domain-live` → `email-onboarded` → `email-live`), reusing T4a's REST seam, catalogue, runner
and state store rather than adding a subsystem. Every Cloudflare email call is a REST call
through `src/cloudflare/api.mjs`; the `wrangler email sending` beta command group is not used.

**Spec:** `docs/superpowers/specs/2026-08-11-create-cairn-site-t4b-design.md`. Its verification
section carries live API shapes captured 2026-08-11; treat those as fixtures, not as claims to
re-derive.

**Tech Stack:** Node ESM (`.mjs`), `node:test`, `@clack/prompts`, the Cloudflare REST API v4.

## Global Constraints

- The runtime library (`src/lib`) is untouched, with one conditional exception: if Task 1
  observes that a doctor email check contradicts the live API, fix the predicate as a defect.
  Today's verification says this will not fire.
- No secret lands under the project directory. The pasted token lives only in the 0600 state
  record and never appears in argv.
- **The token is deleted when chapter 2 reaches a terminal state**, which is `email-live` or a
  recorded decline. A park is not terminal and keeps the token.
- Only `chapter2.mjs` writes `step` or calls the state store; step functions are pure over the
  in-memory record.
- A park (`wait` row) is returned, exits 0, and prints the re-entry command. A `declined` row is
  returned and exits 0. Only `act` and `ask-someone` rows throw and exit 1.
- Every exit prints a next step. Every deploy prints the `deploy.mjs` heartbeat.
- `--dry-run` prints both new hops and performs none of them: zero shell-outs, zero network.
- No suite may touch the operator's desktop (the PATH-controlled `openBrowser` pattern).
- Email state lives as **flat keys under `cloudflare`**, never a nested object. `updateSite`'s
  merge is one level deep, so a nested `cloudflare.email` object would be replaced wholesale by
  any later patch carrying it.
- Every dollar figure in owner-facing copy carries its date and a link. Email Sending is in
  beta; no figure is a hardcoded promise.
- Copy must not promise a new account 3,000 messages in month one, and must not present the
  free verified-destination path as an option.
- Comment style: TSDoc-shaped doc blocks with `@param {type}` (plain `.mjs`); the em dash is
  banned in comments.
- Production domains are untouchable. The live e2e uses only the scratch domain.

## Spike amendments (2026-08-12, from Task 1)

Task 1 ran and closed six of its seven steps without a browser. Full evidence:
`docs/internal/2026-08-11-t4b-email-spike.md`. The amendments below **supersede the task text
where they conflict**, and the dependent tasks are cleared to dispatch.

1. **There are no `E_` codes on the REST surface, and Tasks 4 and 5 are re-planned onto what is
   really there.** The send returns a v4 envelope carrying a numeric `code` and a dotted
   identifier: `{ "code": 10203, "message": "email.sending.error.email.sending_disabled" }`, HTTP
   403. The `E_SENDER_*` strings belong to the Workers **binding** surface that
   `src/lib/email.ts` parses, not to this REST call. Accordingly:
   - Task 4's `sendErrorCode(json)` extracts Cloudflare's `errors[0].code` (a number) and its
     `message` identifier, not an `E_` prefix. Name it for what it returns.
   - Task 5 classifies on `10203` plus the clock. Its instruction to preserve a bare-string check
     on `not a verified address` **does not apply to this pass**: that check guards the binding
     path in `src/lib/email.ts`, which this pass does not touch. Do not add it to `email.mjs`.
2. **The propagation window is the only discriminator, and that is now load-bearing rather than
   belt-and-braces.** A never-onboarded send and a send 25 seconds after onboarding return the
   **identical** code. Nothing in the body separates them. `onboardedAt` plus
   `PROPAGATION_WINDOW_MS` is the whole classification, exactly as Task 5 designed it; only the
   code table changes.
3. **The create returns `enabled: true` immediately** (Step 6 answered), so no fallback to
   `wrangler email sending enable` is needed and Task 5's interfaces stand. It also means
   `email-not-ready` is **hard to reach on an active zone**, the same shape as T4a's
   already-active short-circuit. Keep the row and its fixture-driven test, and do not expect the
   live run to hit it.
4. **`preview_enabled` is not a constant.** A fresh create returned `true`; `ecxc.ski` reports
   `false`. No fixture may assert it as a fixed value.
5. **The success body differs from Cloudflare's documented example.** Live, a success returns
   `result: { message_id, delivered: [], queued: [], permanent_bounces: [] }`, with the arrays
   empty rather than naming the recipient. Task 6's fixtures copy the captured body.
6. **Task 9's teardown changes.** The zone cannot be deleted, because the scratch domain is at
   Cloudflare Registrar (T4a post-mortem, divergence 2). Teardown is
   `DELETE /zones/{id}/email/sending/subdomains/{id}`, **then** deleting the residual `_dmarc`
   record by hand, because the subdomain delete leaves it behind at `p=reject`. Both verified.
7. **Task 9 Step 3 proves the propagation park, not the disabled-subdomain state**, per
   amendment 3. The propagation park is reachable and this spike hit it twice.
8. **The entitlement condition is unreachable on this account** (it is on Workers Paid, Step 2
   answered). Task 4's `paid-plan-missing` mapping keys on the entitlement wording, and its test
   name says the condition was not observed live. Task 2's `paid-plan-missing` copy must not
   claim a distinct error identifies it.
9. **The closing copy's DMARC disclosure gains a second half.** Removing Email Sending does not
   remove the `p=reject` record, so the policy outlives the feature. Task 8 Step 4's copy and
   Task 10's guide correction both carry this.
10. **Measured propagation: between 47 and 107 seconds** on an already-active zone, against
    Cloudflare's documented 5 to 15 minutes. Owner-facing copy quotes the vendor's range, which is
    the promise; the measurement is why the park will rarely be seen. Task 9 Step 6's measurement
    is already taken.
11. **Task 9's prerequisite is bigger than the plan says, and it costs a browser moment.** The
    plan assumes "a site at `domain-live`". No such site exists: T4a's teardown retired its state
    record and deleted the Worker, both D1 databases, the R2 bucket, the Custom Domain, and the
    repository, and `~/.config/cairn/sites` is empty. Task 9 therefore runs chapters 1 and 2 from
    scratch, which means **creating and installing a third GitHub App** and paying chapter 1's two
    browser moments. Two mitigations: the scratch zone is already active, so chapter 2's domain
    half takes T4a's adopt short-circuit and is fast; and the scratch domain's sending
    configuration was restored to its pre-onboarding baseline by this spike, so the run exercises
    the create path honestly rather than an already-onboarded one.

    Related housekeeping, for the pass-end report rather than for a task: `cairn-t3-live-71d37c`
    and `cairn-t4a-live-596b84` are both still registered at github.com awaiting deletion, and
    Task 9 will add a third.
12. **The seam's blanket 403 rule collides with the email routes, and Task 4 must break the tie.**
    `throwMapped` in `src/cloudflare/api.mjs` maps **every** HTTP 403 to `token-scope-missing`
    before it reaches the operation fall-through. The email send's refusal is HTTP 403 with code
    `10203`. Left alone, an owner whose DNS is still settling is told their API token is missing a
    permission, which is both wrong and unactionable, and the propagation park can never fire.

    Task 4 therefore adds a discriminator ahead of the generic 403 branch: a 403 carrying an email
    operation code is classified by `sendErrorCode` rather than by the token rule. Keep the
    generic rule intact for every other route, since a genuinely underscoped token still has to
    reach `token-scope-missing`, and note that an underscoped token hitting an email route now
    lands on an email row instead. That trade is correct, because `10203` is the only 403 the send
    has been observed to return, and the run cannot reach the send at all without a token that
    already passed `validateToken`.

    **Test both sides:** a 403 on a non-email route still maps to `token-scope-missing`, and a 403
    on an email route maps to the propagation or fall-through row. This is the kind of assertion
    the suite would otherwise never make, because no existing test sends a 403 down an email path.
13. **`sendTestMessage`'s rows carry no `dir`, and chapter 2 must rebuild them before printing.**
    Its interface, as written in both the spec and this plan, is
    `{ api, from, to, onboardedAt, now }`, with no `dir` and no `record`. The three rows it throws
    interpolate `${params.dir}` into their `Next:` line, so surfacing `err.message` unchanged
    prints `--dir undefined` to an owner. `chapter2.mjs` therefore catches those errors, reads
    `err.catalogue.code`, and rebuilds each row with its own real `dir` and `domain`, the same way
    `hostname.mjs`'s `cutOverHostname` hands wait outcomes up to be wrapped. The signature stays
    as written: the "classify here, print later" split is deliberate, and the assertion that locks
    it is that each of the three rows, driven through `runChapter2`, prints the real `dir` and
    never the string `undefined`.

    Two things worth noticing about how this was found. It survived a green suite in the module
    that owns the rows, because nothing there printed one. And it was caught only because the
    implementer reported an interface it had been given twice as a concern rather than
    implementing it silently, which is the behavior worth keeping.

14. **A declined record must still re-enter chapter 2, and "terminal" means two different things.**
    Task 8b was dispatched with "a record at `email-live` or `paid-plan-declined` does not call
    `runChapter2`", which is right for one and wrong for the other. The plan requires that "a re-run
    after a decline re-offers with the row's `reoffered` copy", and both decline rows tell the owner
    in as many words to re-run when they are ready. Treating the decline as fully terminal makes that
    promise unreachable and, with `--start-over` also refused at terminal steps, leaves an owner who
    declined **no path to enable email ever**.

    The distinction to hold: a decline is terminal for the **token** (deleted) and for the **exit
    code** (0, nothing is wrong), and it is emphatically not terminal for **re-entry**. So
    `email-live` returns early; `paid-plan-declined` continues into chapter 2, whose admission then
    re-offers with the `reoffered` copy it already builds. The `reoffered` parameter exists for
    exactly this and is otherwise dead code through the real CLI.

    Found by Task 8b's implementer reporting a conflict between its own instruction and copy owned by
    another task, rather than implementing the instruction and leaving the copy lying. That is the
    third defect this pass caught at a seam between two individually correct modules, after the 403
    collision and the dir-less rows.

### The T4a handoff is already carried, and one T4a carry-forward is stale

The plan's closing "T4a handoff" section is written for a T4a that had not yet been built. T4a is
built. Both amendments are already in the code, and neither is work for this pass:

- **Amendment 1 (the prefill URL gains Email Sending) is DONE.** `src/cloudflare/prefill.mjs`
  ships `{ key: 'email_sending', type: 'edit' }`, verified against the live dashboard on
  2026-08-11 by a second probe that loaded all five keys and reported five filled.
- **Amendment 2 (terminal-state token deletion) is DONE**, recorded in T4a's post-mortem
  divergence 3: `domain-live` is not terminal, so the token survived the live run.
- **Spike Step 1 was answered by T4a's spike, not this one.** The dashboard name is
  `Account > Email Sending > Edit`; the template key is `email_sending`, and Cloudflare documents
  no template key for it, so it is known to work only because it was tried.
- **Stale carry-forward:** T4a's post-mortem lists "the prefill URL's keys are still unverified
  against the live dashboard" as open. For `email_sending` and `ssl_and_certificates` that is no
  longer true, per the doc block in `prefill.mjs`. Task 10 corrects the carry-forward rather than
  repeating it into STATUS.

## File Structure

```
packages/create-cairn-site/
  src/cloudflare/email.mjs       onboard, poll, test send, propagation classification (+ .test.mjs)
  src/money.mjs                  the cost preamble copy and its print gate (+ .test.mjs)
Modified:
  src/cloudflare/api.mjs         three email routes + send-error mapping (+ .test.mjs)
  src/cloudflare/catalogue.mjs   the 'declined' kind, carry-over conversion, email rows (+ .test.mjs)
  src/cloudflare/config.mjs      writeEmailFrom, mirroring writePublicOrigin (+ .test.mjs)
  src/cloudflare/chapter2.mjs    two new hops, admission, decline, terminal-state deletion (+ .test.mjs)
  bin.mjs                        preamble print site; terminal-branch widening for --sign-in
  test/fake-cloudflare.mjs       three email routes from Task 1's captured bodies
  docs/guides/deploy-to-cloudflare.md, docs/guides/cloudflare-readiness.md
  CLAUDE.md, ROADMAP.md, CHANGELOG.md, README.md, docs/STATUS.md
```

No change to `src/state.mjs`: T4a's `cloudflare` deep-merge already carries flat keys, and
`retireSite` already scrubs `apiToken`. An implementer who thinks they need a state change has
misread the flat-key constraint above.

State added by this pass:

```js
cloudflare: {
  // ... T4a's fields
  emailFrom,          // the address written into cairn.config.ts and used by the test send
  emailOnboardedAt,   // ISO moment the poll first saw enabled: true; anchors the 30-minute window
  emailDeclinedAt,    // ISO moment the owner declined the plan; terminal, token deleted
}
// step gains: 'email-onboarded' | 'email-live'   ('email-live' is final for chapter 2)
```

---

### Task 1: The spike (main loop; one browser sitting; decision gate for Tasks 4, 5, 7)

Not dispatched. The main loop runs this with Geoff present for the browser moments, and folds
its answers into this plan as an amendments section before any dependent task goes out.

**Files:** Create `docs/internal/2026-08-11-t4b-email-spike.md`.

**Already answered, and not to be re-derived** (spec, verification section): the subdomain
response shape, the apex naming, the `cf-bounce` record placement, the `p=reject` DMARC
default, and the correctness of the engine doctor's existing predicate.

- [x] **Step 1: Mint a scoped token in the dashboard** and record the Email Sending permission
  group's exact displayed name, plus whether it is account-scoped, zone-scoped, or both. This
  is the pass's only true unknown and it feeds the T4a handoff below.
  **ANSWERED by T4a's spike, no browser needed:** `Account > Email Sending > Edit`, template key
  `email_sending`, already shipped and verified in `prefill.mjs`.
- [x] **Step 2: Confirm the account's Workers Paid status** in the same sitting. Evidence says
  it is already on: `ecxc.ski` has Email Sending enabled and delivers to arbitrary editors,
  which the free plan does not allow. Confirm rather than assume.
  **ANSWERED yes:** a live send from `ecxc.ski` returned HTTP 200 with a `message_id`.
- [ ] **Step 3: The billing glance.** Given four Workers Custom Domains on Free-plan zones on
  this account, does an Advanced Certificate Manager line item appear? Record yes or no. This
  is the last unresolved number in the cost copy.
  **STILL OPEN, and the pass's only remaining browser question.** The estate token is refused by
  the subscriptions, billing-profile, and certificate-pack endpoints (code 9109).
- [x] **Step 4: Capture verbatim response bodies** against the scratch domain, for Task 6's
  fixtures: a create (`POST /zones/{id}/email/sending/subdomains`), a list immediately after,
  a list once enabled, and a successful send (`POST /accounts/{id}/email/sending/send`).
- [x] **Step 5: Capture the failure bodies that can be reached**, at minimum a send from a
  domain that is not onboarded. Record the exact error envelope and whether the `E_` codes
  arrive as a `code`, inside a `message`, or neither. **Decision gate for Task 4:** if the
  REST send returns something other than a v4 envelope, Task 4's error mapping is re-planned
  before dispatch.
  **GATE PASSED (it is a v4 envelope), but the `E_` premise is refuted:** see amendment 1.
- [x] **Step 6: Confirm the create endpoint sets the zone flag** as the SDK comment claims,
  by checking the zone reports sending enabled after a create with no dashboard visit.
  **Decision gate for Task 5:** if it does not, the onboarding step falls back to
  `wrangler email sending enable` and Task 5's interfaces change.
  **GATE PASSED:** the create returns `enabled: true` immediately. Task 5's interfaces stand.
- [x] **Step 7: Write the spike doc**, with every finding dated, and fold the amendments into
  this plan.

### Task 2: The catalogue: the `declined` kind and the email rows

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/catalogue.mjs`,
  `packages/create-cairn-site/src/cloudflare/catalogue.test.mjs`

**Interfaces:**
- Produces: `ErrorKind` widened to `'wait' | 'act' | 'ask-someone' | 'declined'`, with
  `'declined'` documented on `ChapterErrorInfo` as "nothing is wrong, the owner chose this,
  exit 0, no re-run urgency"; `carry-over-declined` converted from `act` to `declined`; new
  rows `paid-plan-declined`, `paid-plan-missing`, `email-onboarding-failed`, `email-not-ready`,
  `email-sender-propagating`, `email-sender-unavailable`, `email-daily-limit`,
  `email-send-failed`.

Row requirements, each ending in one "Next:" line, each triggered by a test rather than read:

- `paid-plan-declined` (`declined`): names what still works (the site serves, the owner edits
  and publishes) and what does not (nobody else can sign in). Names
  `npx create-cairn-site --dir <dir> --sign-in` as the owner's own way back in, and says the
  current sign-in lasts 30 days so this is not urgent. Takes a `reoffered` param whose copy
  acknowledges an earlier decline instead of repeating the admission.
- `paid-plan-missing` (`act`): Cloudflare refused for want of the plan. Deep-links the plan
  page, says the price, says re-run after.
- `email-onboarding-failed` (`act`): the fall-through, printing Cloudflare's own message via
  `detail`. Never a park.
- `email-not-ready` (`wait`): the subdomain exists but reports `enabled: false`. Reassures the
  site is untouched and still working, in `delegation-pending`'s exact tone.
- `email-sender-propagating` (`wait`): a send rejected inside the 30-minute window. Says DNS is
  still settling and names the documented 5-to-15-minute figure.
- `email-sender-unavailable` (`act`): the same rejection past the window. Says onboarding did
  not take and names re-running plus a dashboard check.
- `email-daily-limit` (`wait`): `E_DAILY_LIMIT_EXCEEDED`. Explains that new accounts ramp, and
  names both waiting and Cloudflare's limit-increase form.
- `email-send-failed` (`act`): the send fall-through, printing Cloudflare's message.

- [ ] **Step 1: Failing tests.** Every new row builds and carries the right `kind`; every row's
  message ends in exactly one `Next:` line; `carry-over-declined` now reports `declined`;
  `CATALOGUE_CODES` covers every row; `paid-plan-declined` differs between its first and
  re-offered forms; the `30 days` and `--sign-in` strings are asserted by content, not by shape.
- [ ] **Step 2: Implement; suite green; commit.** Update the `ErrorKind` and `ChapterErrorInfo`
  doc blocks so the fourth kind's exit semantics are written down beside the other three.

### Task 3: The money preamble

**Files:**
- Create: `packages/create-cairn-site/src/money.mjs`,
  `packages/create-cairn-site/src/money.test.mjs`
- Modify: `packages/create-cairn-site/bin.mjs`

**Interfaces:**
- Produces: `costPreamble()` returning the copy as a string, and `printCostPreamble({ log,
  isFreshRun })` which prints it exactly when `isFreshRun` is true. `bin.mjs` calls it after
  preflight and before the site-name prompt, deriving `isFreshRun` from the absence of a prior
  record for the target directory.

Copy requirements. Four things in the owner's language, in this order: building and running the
site is free and stays free; a domain name costs roughly $10 to $15 a year, paid to a registrar
rather than to Cloudflare, and costs that from anyone; Cloudflare's Workers Paid plan costs $5
US per month, is what sends sign-in email, is needed once anyone other than the owner signs in,
and is billed once per account rather than once per site; all in, a small site on its own domain
runs about $6 a month. Every figure carries "as of 2026-08-11" and a link. No prompt: there is
no decision attached to it yet.

- [ ] **Step 1: Failing tests.** The preamble prints on a fresh run and does not print on a
  resume; it names $5, $10 to $15, per account, and the date; it does not contain "3,000" or
  any verified-destination language; it prompts nothing (no prompt seam is called).
- [ ] **Step 2: Implement; suite green; commit.** Add a `bin.mjs` test asserting the preamble
  precedes the name prompt in the printed order.

### Task 4: The API seam's email routes **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/api.mjs`,
  `packages/create-cairn-site/src/cloudflare/api.test.mjs`

**Interfaces:**
- Consumes: `makeApi`'s existing `get`/`write`/`ensureSuccess`/`throwMapped` plumbing and
  Task 2's rows.
- Produces, on the client `makeApi` returns:
  `listSendingSubdomains(zoneId): Promise<object[]>`,
  `createSendingSubdomain(zoneId, name): Promise<object>`,
  `sendMessage({ from, to, subject, text }): Promise<void>`.
  `OPERATION_CODES` gains `emailSubdomain: 'email-onboarding-failed'` and
  `emailSend: 'email-send-failed'`.
- Produces: `sendErrorCode(json): string | undefined`, extracting an `E_`-prefixed code from
  whichever position Task 1 Step 5 observed, exported so `email.mjs` classifies without
  re-parsing envelopes.

Constraints. `listSendingSubdomains` goes through `listPaginated`, like every other list route.
`createSendingSubdomain` is a write and is therefore never retried, per the seam's existing
GET-only retry rule. A refusal naming the account entitlement maps to `paid-plan-missing`
ahead of the operation fall-through; the exact discriminator comes from Task 1 Step 5, and if
that step could not reach the condition, the mapping keys on the entitlement wording and the
test says so in its name.

- [ ] **Step 1: Failing tests** against the fake, using Task 1's captured bodies: a list that
  paginates; a create returning the captured body; a send succeeding; a send failing with each
  `E_` code Task 1 observed, asserting `sendErrorCode` extracts it; an entitlement refusal
  mapping to `paid-plan-missing`; an unmapped failure falling through to the operation row with
  Cloudflare's message in `detail`; the token redacted from every one of those messages, proven
  with a planted distinctive value and proven able to fail.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 5: The email module: onboard, poll, and the test send **[spike]**

**Files:**
- Create: `packages/create-cairn-site/src/cloudflare/email.mjs`,
  `packages/create-cairn-site/src/cloudflare/email.test.mjs`

**Interfaces:**
- Consumes: Task 4's three client methods and `sendErrorCode`; Task 2's rows.
- Produces:
  `defaultFromAddress(domain): string` returning `no-reply@<domain>`, the one place that
  address is derived;
  `ensureSendingDomain({ api, zoneId, domain, record }): Promise<{ enabled: boolean,
  onboardedAt?: string }>`;
  `sendTestMessage({ api, from, to, onboardedAt, now }): Promise<void>`.
- Produces: `PROPAGATION_WINDOW_MS`, exported so the test asserts against the constant rather
  than a copied number.

Behavior. `ensureSendingDomain` **reads the subdomain list first** and posts a create only when
no entry matches the apex; this read-then-reconcile order is the seam's documented discipline
for non-idempotent writes and is what stops a resumed run from creating twice. It returns
`enabled: true` with `onboardedAt` set to the moment it first saw it, or `enabled: false` for
the caller to park on. It never loops or sleeps: one poll per run.

`sendTestMessage` classifies a failure by code and by clock. `E_SENDER_DOMAIN_NOT_AVAILABLE`,
`E_SENDER_NOT_VERIFIED`, or a message containing `not a verified address` throws
`email-sender-propagating` within `PROPAGATION_WINDOW_MS` (30 minutes) of `onboardedAt` and
`email-sender-unavailable` past it. `E_DAILY_LIMIT_EXCEEDED` throws `email-daily-limit`.
Anything else reaches Task 4's `email-send-failed` fall-through. `now` is injected so the
window is testable without waiting.

The bare-string check on `not a verified address` is deliberate and mirrors
`src/lib/email.ts:101`. Cloudflare documents no code for that condition, so the OR is the only
thing catching it; do not simplify it away on the strength of the documented code table.

- [ ] **Step 1: Failing tests for `ensureSendingDomain`**: no entry creates then reports the
  created state; an existing disabled entry reports `enabled: false` and issues **no** create
  (asserted through the fake's request log); an existing enabled entry reports enabled and
  issues no create; a create that fails surfaces Task 4's row unchanged.
- [ ] **Step 2: Failing tests for `sendTestMessage`**: a success; each of the three
  propagation-shaped failures inside the window parking, and each past it throwing act; the
  boundary asserted at `PROPAGATION_WINDOW_MS` exactly, on both sides; the daily-limit row; an
  unmapped failure falling through. Include a test that would fail if the `not a verified
  address` string check were removed.
- [ ] **Step 3: Failing test for `defaultFromAddress`**, including a domain with a subdomain.
- [ ] **Step 4: Implement; suite green; commit.**

### Task 6: The fake's email routes

**Files:**
- Modify: `packages/create-cairn-site/test/fake-cloudflare.mjs`,
  `packages/create-cairn-site/test/fake-cloudflare.test.mjs`

**Interfaces:**
- Produces: three routes on the existing fake, `GET` and `POST
  /zones/:id/email/sending/subdomains` and `POST /accounts/:id/email/sending/send`, serving
  Task 1's captured bodies verbatim; per-route scripted failures so Tasks 4 and 5 can drive
  each error path; the existing request log extended to cover them so "issued no create" is
  assertable.

This task does **not** extract `test/fake-http.mjs`. STATUS carry-forward 7's trigger is a
third fake server, and extending the second one is not that; the extraction stays filed for
T4d.

- [ ] **Step 1: Failing tests.** The fake's own suite covers each route's success, its
  pagination on the list, and each scripted failure; a fixture asserted byte-identical to the
  captured body, so a hand-written drift fails.
- [ ] **Step 2: Implement; suite green; commit.**

### Task 7: The sender address rewrite **[spike]**

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/config.mjs`,
  `packages/create-cairn-site/src/cloudflare/config.test.mjs`

**Interfaces:**
- Produces: `writeEmailFrom(dir, address): Promise<boolean>`, resolving `true` when it changed
  the file and `false` when the address was already correct, so the caller skips the deploy.

Constraints. The target is `email: { from: '...' }` in `src/theme/cairn.config.ts`, which the
template ships as `cms@showcase.test`. Match on the key by regex rather than on the placeholder
literal, mirroring `writePublicOrigin`'s reasoning: after a resumed run the value may already
be a real address. Throw fail-loud when the key is absent, naming the file and the missing
string, in `replaceExact`'s tradition. This is a rot gate, not a catalogue row: a missing key
means the template moved out from under this module, which is a developer-facing bug.

- [ ] **Step 1: Failing tests.** A template file is rewritten and the result re-parsed to
  confirm the new address; a second call on the rewritten file returns `false` and leaves the
  bytes identical; a file with no `email.from` key throws naming both the file and the string;
  the rewrite touches nothing else in the file (asserted by diffing every other line).
- [ ] **Step 2: Implement; suite green; commit.** Add a test that runs against the **real**
  `template/src/theme/cairn.config.ts`, so a template change that moves this target fails here
  rather than in a live run.

### Task 8: Chapter orchestration: admission, the two hops, and the terminal-state token rule

**Files:**
- Modify: `packages/create-cairn-site/src/cloudflare/chapter2.mjs`,
  `packages/create-cairn-site/src/cloudflare/chapter2.test.mjs`,
  `packages/create-cairn-site/bin.mjs`, `packages/create-cairn-site/src/args.mjs` (`--email`)

**Interfaces:**
- Consumes: every Producer above, plus T4a's `deployWorker`/`buildSite` and `runStep`.
- Produces: two hops appended to `runChapter2` in this order, admission, onboard, poll, test
  send, address rewrite and conditional deploy, completion; the terminal-state token rule
  replacing T4a's `domain-live` deletion; `bin.mjs`'s terminal branch widened so `--sign-in`
  and the live-info print cover `email-live` and a recorded decline as well as `live`.

The admission restates the price at the moment of the ask, per the spec, and asks one question.
A decline records `emailDeclinedAt`, deletes the token, and returns `paid-plan-declined`. A
re-run after a decline re-offers with the row's `reoffered` copy. Under `--yes`, an unattended
run without `--email` takes the decline path rather than committing an owner to a subscription,
and names `--email` in the skip message. `--email` is the boolean opt-in that stands in for the
admission's one question, mirroring how T4a's `--domain` carries both a value and its opt-in;
`--connect` stays reserved for T4c.

Ordering is load-bearing: the test send runs **before** the address rewrite and deploy, because
it proves the sending path without depending on the deployed Worker, and a broken path should
not buy a deploy. The deploy runs only when Task 7 reports the file changed.

- [ ] **Step 1: Failing admission tests.** Interactive consent proceeds; a decline records,
  deletes the token, exits 0, and prints the `--sign-in` line; a re-run after a decline prints
  the re-offered copy; `--yes` without the opt-in flag declines and names the flag; `--yes` with
  it proceeds.
- [ ] **Step 2: Failing hop-order and resume tests.** A record at `domain-live` runs the whole
  half; one at `email-onboarded` skips onboarding and starts at the test send; a park at each
  point exits 0 and re-runs with no repeated writes, asserted per hop through the fake's
  request log and the fake bin's invocation log; the deploy does not run when the address is
  already correct; the test send precedes the rewrite in the printed order; `--dry-run` prints
  both hops with zero shell-outs and zero fake-API requests.
- [ ] **Step 3: Failing terminal-state tests.** After `email-live`, `apiToken` is absent from
  `loadSite()`'s disk re-read **and** from the raw file bytes, and the file is still 0600; the
  same after a recorded decline; a park at `email-onboarded` **keeps** the token, which is the
  half of the rule a test would otherwise miss.
- [ ] **Step 4: Failing closing-copy tests.** The completion names the from-address, the
  one-line override, the `p=reject` DMARC record and its consequence for a later newsletter
  tool, and the `cairn-doctor --send-test` command.
- [ ] **Step 5: Failing bin tests.** `--sign-in` works from `email-live` and from a recorded
  decline; the live-info print covers both.
- [ ] **Step 6: Implement; suite green; commit.**

### Task 9: The live e2e (main loop plus Geoff's moments, scratch domain)

Not dispatched. The main loop drives it, per T3's and T4a's precedent.

**Prerequisites:** the scratch domain delegated and active from T4a's e2e; the account on
Workers Paid (Task 1 Step 2); a real inbox for the test send.

- [x] **Step 1: Run the email half end to end** against the scratch domain, from a site at
  `domain-live`, using T3's proven install pattern. Record every browser moment and count them
  for the docs.
  **DONE 2026-08-12**, exit 0 at `email-live`, though from scratch through chapters 1 and 2 per
  amendment 11 rather than from a surviving `domain-live` record.
- [ ] **Step 2: Confirm the real message arrives**, and confirm it came from
  `no-reply@<scratch-domain>`.
  **UNPROVEN, deliberately left so.** Cloudflare accepted every send (200 with a `message_id`);
  no message ever arrived, on a domain registered 18 hours earlier. Greylisting and SPF PERMERROR
  were both tested and refuted; what remains is new-domain reputation, which is the industry norm
  (SES sandboxes new accounts; Resend and Postmark document weeks of warm-up). This vindicates
  ruling 8 with evidence: delivery is not observable by the CLI, and 200 is the strongest honest
  signal. The harvest goes to the T4b.1 copy fix rather than to a delivery check.
- [ ] **Step 3: Prove one park for real** by starting the run before the zone's records have
  settled, or by exercising the disabled-subdomain state, and confirm the re-run resumes with
  no repeated write.
  **PARTIAL.** The park's condition was observed live in the spike (sends refused at 25s and 47s
  after onboarding, accepted at 107s), but the tool's own branch could not be reached afterward:
  sending authorization turned out to be sticky, so the domain stayed authorized even after the
  subdomain was deleted, and a deliberate fault injection could not reproduce the refusal. The
  only never-onboarded domains left are production ones. The branch stays covered by tests on
  both sides of the boundary.
- [x] **Step 4: Confirm the token is gone** from the state record after completion, by reading
  the raw file. **DONE:** zero occurrences in the raw bytes, mode 0600, and the wider sweep was
  proven able to fail with a planted canary first.
- [x] **Step 5: Tear down.** Per amendment 6, not this step's original text: the subdomain
  DELETE, then the residual `_dmarc` by hand, then the Worker, both D1 databases, the R2 bucket,
  the repository, and the state record. The zone is back to exactly its four seeded records, all
  sha256-identical to the pre-run fixture.
- [x] **Step 6: Record the run** in the spike doc, including the measured propagation time,
  which is the first real measurement of a figure the docs give only as a range.
  **DONE:** the spike doc's "The live e2e" section, including the two platform corrections
  (sticky authorization, the second refusal code 10204).

### Task 10: Docs, tracking, and pass close

**Files:** `docs/guides/deploy-to-cloudflare.md`, `docs/guides/cloudflare-readiness.md`,
`CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`, `packages/create-cairn-site/README.md`,
`docs/STATUS.md`, the admin-track page.

- [ ] **Step 1: Correct the contradicting guides.** `deploy-to-cloudflare.md:160-166` says
  Email Sending has no create command and sends the reader to the dashboard, which is wrong.
  Correct it, keep its accurate description of the records onboarding adds, and add the REST
  endpoint beside the wrangler command. Cross-check `cloudflare-readiness.md:106-116`, which is
  correct today, and leave it correct.
- [ ] **Step 2: Replace `CLAUDE.md`'s durable email gotcha** with the research's corrected
  paragraph, amended with what the spec verified live: the observed subdomain shape, the
  confirmed `cf-bounce` placement, and the `p=reject` DMARC default.
- [ ] **Step 3: File the admin test-send in `ROADMAP.md`** as engine work for its own pass, per
  the spec's ruling 7, naming why it left this pass.
- [ ] **Step 4: The admin track's email page**, with the browser-moment count Task 9 measured,
  plus the README's new flags and park story, plus `CHANGELOG.md` under `## Unreleased`.
- [ ] **Step 5: Retire STATUS carry-forward 6**, which the `declined` kind resolves, and update
  `docs/STATUS.md` for the pass. Confirm carry-forward 7 still stands, since this pass added no
  third fake.
- [ ] **Step 6: Run the full gate**, run `code-simplifier` over the pass's changed code, and
  close per `cairn-pass`.

---

## The T4a handoff, to carry before T4a resumes

Two amendments to work that is planned but not yet built, cheap now and expensive later.

1. **T4a Task 7's prefill URL gains the Email Sending permission**, so chapter 2 asks for one
   token rather than two. The group's exact name comes from Task 1 Step 1, so run that step in
   the same browser sitting that unblocks T4a.
2. **T4a Task 10's completion moves its token deletion** from `domain-live` to the
   terminal-state rule in this plan's Global Constraints. It is a condition change, not new
   code.

## Self-review against the spec

Every spec section maps to a task. The verification section is Task 1's "do not re-derive" list.
Rulings 1, 5 and 8 land in Task 8; ruling 2 in Task 4; ruling 3 in the handoff above and Task 1
Step 1; ruling 4 in Task 2; ruling 6 in Task 3; ruling 7 in Task 10 Step 3. The chapter's seven
flow steps are Task 8's ordering, with steps 3 to 6 implemented in Tasks 5 and 7. State and
resume are the File Structure block plus Task 8 Steps 2 and 3. The money framing is Task 3 plus
Task 8's admission. Testing is distributed per task, with the fake in Task 6 and the live run in
Task 9. Documentation is Task 10. Each acceptance criterion in the spec has a named test in the
task that owns it.

---

## Post-mortem, part one (2026-08-12): the offline half, and what the spike overturned

**Status: Tasks 1 through 8 and 10 are done. Task 9, the live e2e, has not run** and is the whole
of what remains. The runtime library is untouched, as the pass's global constraint required.

Final gate, all green: `npm test` in the package at **523 passing, exit 0**; the root `npm run
check` at 0 errors and 0 warnings over 1601 files; the root `npm test` at 5274 passing across 412
files; and all four CI-only gates plus the rest, `check:reference`, `check:reference:signatures`,
`check:package`, `check:docs`, `check:surface`, `check:comments`, `check:version`, and
`check:snippets`.

### The spike was supposed to be one browser sitting, and it needed none

Task 1 was planned as the pass's gating unknown: mint a token, read the Email Sending permission
group's dashboard name, and capture what could be captured. Six of its seven steps closed from the
API alone, for two reasons worth separating.

The first is that the estate token already carried `Email Sending: Edit`, which nobody had checked.
One send from `ecxc.ski` returned HTTP 200 and simultaneously answered three questions: the token
has the scope, the account is on Workers Paid (Step 2), and a refusal therefore means the *domain*
is not onboarded rather than the account being unentitled.

The second is that **T4a's own spike had already answered T4b's headline question** and written the
answer into `prefill.mjs`'s doc block, where the plan did not look. The dashboard name is
`Account > Email Sending > Edit` and the template key is `email_sending`, verified live on
2026-08-11. The plan's closing "T4a handoff" section, asking for that key to be added before T4a
resumed, was describing work that had already shipped.

The lesson is cheap to state and was expensive here: **the plan's spike list is a set of claims
about what is unknown, and those claims age exactly like any other.** Two of them had been answered
by the preceding pass before this one began.

### The finding that reshaped three tasks

Tasks 4 and 5 were designed to classify send failures by an `E_`-prefixed code, and Task 5 was told
in writing not to simplify away a bare-string check on `not a verified address`, because "Cloudflare
documents no code for that condition".

**None of that exists on the REST surface.** It belongs to the Workers binding, which is what
`src/lib/email.ts` parses and what `CLAUDE.md`'s durable gotcha described. The REST send returns a
v4 envelope with a numeric code and a dotted identifier. The pass had carried one surface's error
vocabulary onto another by assumption, and the assumption was inherited from a gotcha doc that was
correct about the surface it actually described.

Worse for the design, **one code covers two conditions**. A send from a never-onboarded domain and a
send 25 seconds after onboarding both return `10203 email.sending.error.email.sending_disabled` at
HTTP 403, byte-identical. Nothing in the body separates them.

The design survived this better than it deserved to, because the plan had already made the recorded
`onboardedAt` moment and `PROPAGATION_WINDOW_MS` the discriminator between "still settling" and
"onboarding did not take". What was designed as belt-and-braces turned out to be the only thing
holding the classification up. Only the code table feeding it changed.

### Two traps that a green suite could not have found

**The seam's blanket 403 rule collided with the new routes.** `throwMapped` mapped *every* HTTP 403
to `token-scope-missing` before reaching the operation fall-through, and the send's refusal is a 403.
Left alone, an owner whose DNS was still settling would have been told their API token was missing a
permission: wrong, unactionable, and it would have made the propagation park unreachable. Caught by
reading the seam before dispatching Task 4, not by a test, because no existing test sent a 403 down
an email path. Task 4 now discriminates ahead of the generic rule and tests both sides.

**Three catalogue rows would have printed `--dir undefined` to an owner.** `sendTestMessage`'s
interface, as written in both the spec and the plan, takes no `dir`, so the rows it throws
interpolate an absent value into their `Next:` line. This survived a green suite in the module that
owns the rows, because nothing there printed one. It was caught only because Task 5's implementer
reported an interface it had been handed twice as a concern rather than implementing it silently.
Recorded as amendment 13, fixed in `chapter2.mjs`, and locked by three tests that assert the real
`dir` and the absence of the string `undefined`.

Both belong to the same family: **a defect that lives in the seam between two correct modules, where
neither module's own suite can see it.**

### What the live platform said, against what the docs say

| Claim | Documentation | Observed 2026-08-12 |
|---|---|---|
| Propagation after onboarding | 5 to 15 minutes | 47 to 107 seconds |
| Send success body | `delivered` names the recipient | `message_id` plus three empty arrays |
| Create response | (unstated) | `enabled: true` immediately, no dashboard visit |
| `preview_enabled` | (unstated) | `true` on a fresh create, `false` on `ecxc.ski`; not a constant |
| Undoing onboarding | (unstated) | removes the `cf-bounce` records, **leaves `p=reject` DMARC** |

The last row is the one with consequences beyond this pass. A DMARC policy that outlives the feature
that wrote it is a live hazard for any owner who later adds a newsletter tool, and it is now
disclosed in the closing copy, the deploy guide, and `CLAUDE.md`.

The propagation measurement is the first real number for a figure the docs give only as a range. The
owner-facing copy still quotes the vendor's range, because that is the promise; the measurement is
why the park will rarely be seen.

### Deviations from the plan

1. **Task 8 was split.** As written it carried six deliverables (admission, decline path, two hops,
   the terminal-token rule, the closing copy, plus `--email` and the `bin.mjs` widening), past the
   four-deliverable line. Split at the natural seam: 8a took chapter orchestration, 8b took the CLI
   surface. This was the pass's only task split, so it was not a signal to split the pass.
2. **Task 8a's first agent died mid-task** on an expired login, having written the implementation
   and **zero** of its tests, leaving the suite red at 11. The failures were diagnosed rather than
   assumed stale: all 11 were T4a safety-net tests whose blanket "answer yes to every gate" stub now
   consented to the email admission and ran into fixtures predating `cairn.config.ts`. The
   implementation was kept, because the Step 1 to 4 assertions were specified in the plan before any
   code existed, so writing them afterward is not reverse-engineering tests from an implementation.
3. **The continuation improved on its own dispatch.** Told to make the safety-net tests decline the
   email admission, it found that two of them could not be fixed that way: declining is *itself* a
   terminal state that deletes the token, so "decline, then assert the token survived" is
   self-defeating. It parked the run one hop past `domain-live` instead, which proves more than the
   original test did.
4. **Task 10's admin-track page was not written**, for the same reason T4a did not write its own: the
   admin track ships in Pass D. The browser-moment count goes to STATUS for Pass D to consume.
5. **Task 10 Step 5's carry-forward numbers were stale**, citing a list superseded by T4a's
   close-out. Following it literally would have retired the missing-comment-gate carry-forward, which
   this pass does not fix. The real referents were recovered from git history: one is genuinely fixed
   by Task 2, and the other, the duplicated fake plumbing, had been dropped entirely and is restored
   in STATUS as item (10). Same class as T4a's Task 14 note.
6. **Two owner-facing citations were wrong and were corrected in review.** The `$5` figure cited the
   email-service pricing page, which states the 3,000-message quota and not the price; it now cites
   the Workers pricing page. The domain range cited a Registrar page carrying no prices, because
   Cloudflare publishes no static price list anywhere; it now cites the at-cost policy, which is the
   reason the range holds, and the copy says the exact price appears before you pay.

### Carried forward

- **Task 9, the live e2e, is the open half**, and its prerequisite is larger than the plan assumed:
  no site sits at `domain-live`, so it runs chapters 1 and 2 from scratch and costs two browser
  moments for a third GitHub App.
- **The ACM billing glance** is the pass's one unanswered question, and the only one needing a
  browser. It affects one line of the money preamble.
- **The entitlement mapping may never fire.** It keys on wording because the condition is unreachable
  on an account already on Workers Paid, and a plan-less account may return the same `10203` as every
  other refusal.
- **The duplicated fake HTTP plumbing**, restored to STATUS, still filed for T4d.


## Post-mortem, part two (2026-08-12): the close-out, and a third seam defect

Three things happened after part one was written that change its conclusions.

### The decline was a trap, and the pass nearly shipped it

Task 8b's implementer reported that `catalogue.mjs`'s decline copy promises a plain re-run
re-offers the plan, while the `bin.mjs` change it had just been told to make guaranteed the
opposite. It was right, and the instruction it was given was mine. My Task 8b dispatch said "a
record at `email-live` or `paid-plan-declined` does not call `runChapter2`", which conflated two
meanings of terminal.

The resulting behavior: an owner who declined read copy telling them to re-run when ready, the
re-run printed a closing block and returned, and `--start-over` refused because the record carries
real Cloudflare resources. **There was no path to enable email, ever.** A choice the spec called a
clean stop was a dead end.

Fixed in `2cba39eb` and recorded as amendment 14. A decline is terminal for the **token** (deleted)
and for the **exit code** (0, nothing is wrong), and deliberately not terminal for **re-entry**.

This is the third defect this pass caught at a seam between two individually correct modules, after
the 403 collision and the dir-less rows. All three shared a shape: each module's own suite was
green, and the defect lived in what one module assumed about another. All three were surfaced by an
implementer reporting a conflict rather than implementing its instruction and leaving the
contradiction for someone else. **That is the practice to keep, and it is worth more than the three
fixes.**

### Two verification claims were checked rather than accepted

Task 8a reported its three amendment-13 tests as falsifiable "by reading the code path, not by
breaking it live". That is not the standard. The rebuild was deleted, the amendment-13 test went red
along with three others, and the file was restored byte-identical and re-run green. Same for the new
decline re-entry test: the early return was restored, the test went red, the fix was restored, green.
Both are now proven able to fail rather than assumed to be.

### Dead surface, created by a mid-pass correction

`code-simplifier` observed that `sendErrorInfo` had no production caller. It was built by Task 4 to
the dispatch's specification, and then orphaned hours later when the seam began carrying the dotted
identifier on the thrown error and Task 5 was redirected to `err.api.id`. Nobody was wrong at any
step; the surface was simply left behind by a correction. Removed with its tests.

Worth noticing as a pattern: **a mid-pass interface change should end by asking what it just
orphaned.** The redirect was recorded in the plan as amendment 13 and relayed to the implementer,
and still nothing went back to check what the old path left stranded.

## Post-mortem, part three (2026-08-12): the live e2e, and what it harvested

**Task 9 ran, and the pass is closed.** The full evidence table, the delivery investigation, and
the two platform corrections live in the spike doc's "The live e2e" section; this entry carries
the verdicts and the harvest.

### Verdicts

The email half works end to end against the real platform: `email-live` reached, the token deleted
at the terminal state and nowhere else on disk, the sender address deployed in the Worker's own
binding list, the hop order as designed, and the domain's four seeded records byte-intact through
onboarding, cutover, and teardown. Step 2 (delivery) is **unproven and recorded as such**: every
send returned 200, nothing arrived, and the two testable explanations were refuted, leaving
new-domain reputation, which is the industry's documented norm and precisely what ruling 8
predicted the CLI could not observe. Step 3 (the park) is **partial**: the condition was observed
live in the spike, but the tool's own branch is unreachable on any domain this account may touch,
because sending authorization turned out to survive de-onboarding.

### The harvest, routed to T4b.1

The run found four defects, none fixable in this pass without adding scope mid-flight. All four go
to the T4b.1 plan drafted at this close:

1. **The saved-token lock.** A saved token that passes validation (a read) but lacks a write
   permission can never be replaced: `ensureApiToken` returns it before consulting
   `CAIRN_CF_API_TOKEN`, and no failure clears it. The e2e needed a hand-edit of the state record.
2. **The zone hop writes before it reads.** An owner whose zone already exists, holding a token
   that cannot create zones, dies at `token-scope-missing` even though no create was needed. The
   adopt path only triggers on a 1061 body, which a 403 preempts.
3. **The closing copy overclaims on a new domain**, and `printLiveInfo` still promises "Email
   arrives with a later chapter."
4. **The `10204` refusal code is unclassified**, handled correctly today only by fall-through.

### Method notes worth keeping

- The two hypotheses that were refuted were refuted **by experiment**, not by argument: a
  30-minute watch for greylisting, and a live SPF repoint (fixture restored and re-verified
  after). The conclusion that remains standing is the one that survived attempts to kill it.
- The fault injection that failed (deleting the subdomain to force the park) failed for an
  informative reason, and turned into the sticky-authorization finding. A probe that cannot
  reproduce a condition is evidence about the platform, not just a dead end.
- One process defect on the orchestrator's side: the estate Cloudflare token was leaked into the
  session transcript by a careless `${VAR:-no}` expansion during teardown. Rotation is Geoff's
  outstanding hand step. The lesson is mechanical and worth a memory: never interpolate a secret
  variable in a diagnostic echo, even for presence checks; use `${VAR:+yes}` alone or `test -n`.
