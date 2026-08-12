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

- [ ] **Step 1: Run the email half end to end** against the scratch domain, from a site at
  `domain-live`, using T3's proven install pattern. Record every browser moment and count them
  for the docs.
- [ ] **Step 2: Confirm the real message arrives**, and confirm it came from
  `no-reply@<scratch-domain>`.
- [ ] **Step 3: Prove one park for real** by starting the run before the zone's records have
  settled, or by exercising the disabled-subdomain state, and confirm the re-run resumes with
  no repeated write.
- [ ] **Step 4: Confirm the token is gone** from the state record after completion, by reading
  the raw file.
- [ ] **Step 5: Tear down.** Delete the zone through the API, which takes its sending
  configuration with it, and verify by listing both the zones and the sending subdomains. Leave
  the domain parked at its registrar.
- [ ] **Step 6: Record the run** in the spike doc, including the measured propagation time,
  which is the first real measurement of a figure the docs give only as a range.

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
