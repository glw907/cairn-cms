# create-cairn-site Pass T4b: the email half of chapter 2, and the money (design)

The fifth tool pass, planned in its own sitting. Parent docs: the umbrella design
(`2026-08-09-admin-setup-and-docs-reset-design.md`, Part 1 chapter 2 steps 7 and 9), the T4a
spec's T4b brief, and the banked research at
`docs/internal/2026-08-11-t4b-email-console-cost-research.md`, whose adversarial half refuted
or corrected six of its eight verified claims. The research is an input this spec builds on
rather than re-derives, with one exception recorded below: this sitting settled four of its
open mechanisms against the live account, so the plan names them instead of discovering them.

## What this sitting verified live (2026-08-11, glw907 account, estate token)

The research left four mechanisms unobservable from documentation and marked them as spike
work. Three of the four are now answered, which shrinks the pass's spike to a single browser
question. Every claim here came from a real API response today, not from a doc page.

**The sending-subdomain shape is real and it is small.** `GET
/zones/{id}/email/sending/subdomains` on `ecxc.ski` returns one entry:
`{ id, tag, name, enabled, preview_enabled, return_path_domain, dkim_selector, created,
modified }`, with `name` set to the **apex** (`ecxc.ski`), `return_path_domain` set to
`cf-bounce.ecxc.ski`, and `dkim_selector` set to `cf-bounce`. This confirms the research's
central structural claim, that posting the apex name onboards the zone, and it confirms there
is no status enum: `enabled` is the whole signal. It also settles a question the research did
not raise. The engine doctor's `emailSenderOnboarded` check matches on `s.name === domain`
against the apex, and that predicate is **correct**, so no engine fix is owed by this pass.

**The `p=reject` DMARC record is real, and so is the support burden behind it.**
`_dmarc.ecxc.ski` carries `"v=DMARC1; p=reject;"`, written by onboarding. The record placement
matches the docs exactly: MX and SPF on `cf-bounce.<domain>`, DKIM at
`cf-bounce._domainkey.<domain>`, DMARC at the apex, and the domain's own apex mail untouched.
`ecxc.ski` also carries an unrelated Amazon SES sender at `send.ecxc.ski` under that same
`p=reject` policy, which is a live instance of exactly the future failure the closing copy has
to disclose.

**The permission group exists and is reachable.** The estate token reads the Email Sending
endpoints without complaint, and the workstation estate inventory records `Email Sending ✓
(REST + binding)` among its scopes. What remains unconfirmed is only the group's **dashboard
name**, which the token-prefill URL has to carry.

**The certificate question narrowed but did not close.** Four Workers Custom Domains are
attached and `enabled: true` across three zones on this account, each with a `cert_id`, and
every zone on the account is on the Free plan. Billing and subscription endpoints refuse the
estate token, so the line-item question survives as one browser glance, now asked precisely:
given four Workers Custom Domains on Free-plan zones, does an Advanced Certificate Manager
charge appear.

## Rulings made this sitting

1. **Email is chapter 2's second half, not a chapter 3.** The research doc numbers it "chapter
   3" throughout; that is a slip, and this spec supersedes it. The umbrella has exactly two
   chapters and its chapter 2 step 9 is Email Sending onboarding, so the domain half and the
   email half are one chapter with one admission, one pasted token, and one state machine.
   T4a's `domain-live` is the seam between them, not an ending.
2. **Every Cloudflare email call goes through the existing REST seam.** cairn does not invoke
   the `wrangler email sending` command group at all, and calls
   `POST /zones/{zoneId}/email/sending/subdomains` (the endpoint that command wraps) through
   `src/cloudflare/api.mjs` instead. This buys a JSON contract over a beta CLI's human output,
   reuses the seam's error mapping, token redaction and pagination, and retires the research's
   standing worry about pinning a wrangler range and re-checking `--help` before every release.
   The published guides still name the wrangler command, correctly, because a human operator
   should use it.
3. **The token pasted in T4a carries the email scope, and T4a's prefill URL is amended before
   it ships.** One chapter asks for one token. T4a's Task 7 deliberately authors its URL last
   so no later-discovered scope invalidates it, and this is that scope, discovered in time. If
   a token predating the amendment reaches the email half, the existing `token-scope-missing`
   row and its one re-prompt already handle it.
4. **A decline is a clean stop, and the catalogue gains a fourth kind to say so.** An owner who
   declines the paid plan is not failing and is not half-finished, so the run exits 0 with the
   decline recorded. `paid-plan-declined` is the second row of this shape after
   `carry-over-declined`, which is what makes the fourth kind earn itself rather than being an
   abstraction invented for one row; both convert in this pass, and STATUS carry-forward 6
   retires here. The kind is `declined`: nothing is wrong, the owner chose this, exit 0, and
   there is no re-run urgency the way a `wait` row implies one.
5. **The token is deleted when chapter 2 reaches a terminal state, not when the domain half
   ends.** T4a deletes it at `domain-live`, which was correct while that was the chapter's end.
   The invariant that replaces it: a park is not terminal and keeps the token, while both
   `email-live` and a recorded decline are terminal and delete it. This closes the hole where
   an owner who declines the plan leaves a live credential on disk indefinitely.
6. **The money admission opens the tool, ahead of the scaffold** (Geoff, this sitting). The
   owner learns the whole cost picture before typing a site name, not at the moment the bill
   arrives. Chapter 1's own consent copy keeps its true claim that nothing in that step costs
   money; it simply stops carrying the whole story alone. The email half restates the price at
   the moment of the ask, because nobody should be asked for money without being told again
   what it buys.
7. **The admin test-send leaves this pass** (Geoff, this sitting). The umbrella demoted email
   delivery to a doctor check plus an admin test-send, and the doctor half already ships
   (`email.sender-onboarded` plus `--send-test`, verified in code this sitting). The admin half
   is engine work behind a constraint this pass inherits, that the runtime library is
   untouched, and it answers a different question: an editor reporting months later that no
   link arrived. This chapter's own test send covers the provisioning question at the moment it
   matters. The admin test-send files to ROADMAP as engine work for its own pass.
8. **One poll per run, then park, and the test send never blocks on receipt.** The poll follows
   T4a's established doctrine, which the console pass exists to improve rather than this one. A
   successful send call proves the whole provisioned path, since onboarding, plan entitlement
   and token scope all fail loudly there and that is precisely the failure the ecxc outage was.
   Whether the message lands in an inbox or a spam folder is deliverability, which the CLI
   cannot observe and cannot fix, so asking "did it arrive?" would open a wait with no next
   action behind either answer.

Standing rulings carried forward from T4a unchanged: no secret under the project directory;
every exit prints a next step; tokens opaque and absent from argv; `--dry-run` prints the whole
chapter and performs none of it; no suite touches the operator's desktop; every platform claim
carries a date and the plan re-verifies its own at implementation time; production domains are
untouchable.

## Scope

T4b takes a site from `domain-live` to sending its own sign-in mail: the sending domain
onboarded, the sender address written and deployed, and one real message proved out of the
account. It also carries the money framing across the whole tool, from the preamble that opens
a fresh run to the closing copy that discloses what onboarding did to the domain's DNS.

Out of scope: the admin test-send (ruling 7, filed to ROADMAP); Builds connect and repo
reconciliation (T4c); the localhost console (T4d); the template repo and button (T5); Email
Routing in any form, including the free verified-destination path, which the research refuted
on three independent grounds and which would seize the domain's apex MX records; any change to
the engine's public API; and the deferred defect list T4a filed for a hardening pass.

One engine exception, conditional and narrow. If the pass observes that a doctor email check
disagrees with the live API, it fixes the predicate as a defect. Today's verification says this
will not fire, and it is recorded so a surprise is repaired rather than shipped around.

## The chapter's flow

The email half extends chapter 2's state machine two steps past T4a's finish line:
`domain-live` → `email-onboarded` → `email-live` (final for chapter 2). The same idiom holds
throughout: `runStep` over `defineAction`, one writer of `step`, pure step functions over an
in-memory record.

1. **Admission.** The price, stated before anything happens: Cloudflare's Workers Paid plan at
   $5 US per month, a subscription rather than a per-message charge, billed per account rather
   than per site, and the reason it is not optional, which is that without it nobody but the
   owner can sign in at all. The figure is dated and linked, never a hardcoded promise, because
   Email Sending is in beta. Copy states what the plan is not: it is not a scaling upgrade, and
   the site's traffic has nothing to do with it. One question follows, and either answer is
   respected.
2. **The decline path.** A decline records itself, deletes the token per ruling 5, and exits 0
   naming exactly what does and does not work. The site keeps running on the owner's domain,
   they keep editing and publishing, and their own way back in is
   `npx create-cairn-site --dir <dir> --sign-in`, which writes a fresh link straight into the
   site's database without touching email. The 30-day session (`SESSION_TTL_MS`) means this is
   not urgent, and the copy says so rather than leaving the owner to discover a lockout. A
   re-run re-offers the plan, with copy that acknowledges the earlier choice instead of
   repeating the lecture.
3. **Onboard the sending domain.** Read the zone's sending subdomains first, then post the apex
   name only when no entry exists. The read-then-reconcile order is the seam's own documented
   discipline for non-idempotent writes, and it is what keeps a resumed run from posting a
   create twice.
4. **Poll once.** An entry reporting `enabled: true` records `email-onboarded` with the moment
   it was first seen. An entry reporting `enabled: false`, or no entry at all after a create
   that reported success, parks as a `wait` row and exits 0. A refusal naming the account's
   entitlement maps to an act row telling the owner to turn the plan on and re-run; every other
   onboarding failure falls through to an act row printing Cloudflare's own message, never a
   park, so an unmapped condition surfaces rather than looping.
5. **The test send.** One message to the owner's saved address, from `no-reply@<domain>`,
   through `POST /accounts/{accountId}/email/sending/send`. It runs before the redeploy on
   purpose: it proves the sending path without depending on the deployed Worker, and there is
   no point redeploying a site whose sender path is broken. A failure carrying
   `E_SENDER_DOMAIN_NOT_AVAILABLE`, `E_SENDER_NOT_VERIFIED`, or the bare "not a verified
   address" string is DNS still settling when it lands within 30 minutes of the recorded
   onboarding moment, and is a `wait` park at `email-onboarded`. The same failure past that
   window is an act row, because onboarding did not take. `E_DAILY_LIMIT_EXCEEDED` is a `wait`
   row naming the account's ramp. Everything else is an act row carrying Cloudflare's message.
6. **The sender address, then one deploy.** Rewrite `email: { from: ... }` in the scaffold's
   `src/theme/cairn.config.ts` to `no-reply@<domain>`, exact-match and fail-loud in
   `substitute.mjs`'s tradition, then build and deploy once so the running Worker carries it.
   Both halves skip when the address is already correct, so a park and re-run does not buy a
   second deploy. This closes a live gap rather than adding scope: a site that completes
   chapters 1 and 2 today still ships the template's `cms@showcase.test` placeholder, and
   nothing rewrites it.
7. **Completion.** `email-live` is recorded, the token is deleted, and the closing copy names
   three things. The sender address and the one line that changes it. The DMARC record
   Cloudflare wrote at `p=reject`, and its consequence, which is that a newsletter tool or
   mailing list added to this domain later will have its mail rejected until it is added to
   that record. And `cairn-doctor --from ... --send-test ...` as the way to re-prove delivery
   later without re-running the installer.

## State and resume

The chapter's new fields live directly under `cloudflare` as flat keys, not nested in an
`email` object. `updateSite`'s merge is one level deep, so a nested object would be replaced
wholesale by any patch that carried it, silently dropping a sibling field written by an earlier
hop. This is research item 27's trap, and flat keys sidestep it the same way T4a's `zoneId` and
`nameServers` already do.

```js
cloudflare: {
  // ... T4a's fields
  emailFrom,          // the address written into cairn.config.ts and used by the test send
  emailOnboardedAt,   // ISO moment the poll first saw enabled: true; the propagation window
  emailDeclinedAt,    // ISO moment the owner declined the plan; terminal, token deleted
}
```

`step` gains `'email-onboarded'` and `'email-live'`. Every hop is resumable and no hop repeats
a write on re-entry: the onboarding read guards the create, the address check guards the
deploy, and the test send is the only call a resume repeats, which is both cheap and the point.
`bin.mjs`'s terminal branch, which today keys `--sign-in` and the live-info print on
`step === 'live'`, widens to cover chapter 2's terminal states, so an owner at `email-live` or
at a recorded decline can still re-seed their own sign-in.

## The money framing

The preamble prints once, at the top of a fresh run, before the site-name prompt. It does not
prompt, because there is no decision attached to it yet, and it does not print on a resume,
where it would be noise. It covers four things in the owner's language. Building and running
the site is free, and stays free. A domain name costs roughly $10 to $15 a year, is paid to a
registrar rather than to Cloudflare, and would cost that from anyone. Cloudflare's Workers Paid
plan costs $5 US per month and is what sends sign-in email, so it is needed once anyone other
than the owner signs in, and it is billed once per account rather than once per site. All in,
a small site on its own domain runs about $6 a month. Every figure carries its date and a link.

Two things the copy must not do, both drawn from the research. It must not promise a new
account 3,000 messages in its first month, since the daily quota ramps and Cloudflare publishes
no starting number. And it must not present the free verified-destination path as an option,
since it requires each editor to click a Cloudflare verification link and requires Email
Routing, which takes the domain's apex MX records and breaks mail the owner already receives.

Chapter 1's consent copy keeps its claim that nothing in that step costs money, which is true,
and drops any implication that it covers the whole tool. The email half restates the price in
full at the moment of the ask.

## Testing

The suite stays on fake bins and API fixtures. `test/fake-cloudflare.mjs` grows the three email
routes, with fixtures copied verbatim from the responses captured in this document's
verification section rather than written from memory. Note that this does **not** trip STATUS
carry-forward 7: that carry-forward's trigger is a third fake server, and extending the second
one is not that, so the shared `test/fake-http.mjs` extraction stays filed for T4d.

Triggered tests cover every catalogue row, both terminal paths, and the seams that guard
repeated writes: the decline recording and its token deletion, the read-that-guards-the-create,
the poll's two outcomes, the propagation window on both sides of its boundary, each send-error
mapping, the address rewrite's skip-when-correct, the deploy that does not happen on a re-run,
and the token's absence from a disk re-read after both terminal states. The preamble is tested
for printing on a fresh run and not on a resume. `--dry-run` prints both new hops with zero
shell-outs and zero fake-API requests.

The live e2e runs the email half against the scratch domain T4a leaves delegated and active, on
an account with the plan on, sending one real message to a real inbox. Teardown rides T4a's:
deleting the zone takes its sending configuration with it, verified by listing. A dedicated
disable endpoint is not used, since it is unverified and the zone deletion makes it redundant.

## Documentation (a pass dimension)

Two shipped guides disagree today and one is provably wrong.
`docs/guides/deploy-to-cloudflare.md:160-166` states that Email Sending has no create command
and directs the reader to the dashboard; `docs/guides/cloudflare-readiness.md:106-113` names
`wrangler email sending enable <domain>`, which is correct as of today's live `--help`. The
first is corrected, keeping its accurate description of the records onboarding adds, and gains
the REST endpoint beside the command so a reader automating this has both.

`CLAUDE.md`'s durable email gotcha is replaced with the research's corrected paragraph, amended
with what this sitting verified live: the observed subdomain shape, the confirmed `cf-bounce`
placement, and the `p=reject` DMARC default. The admin track gains the email half's page with
its browser-moment count as the e2e measures it. The package README gains the new flags and the
park story. `CHANGELOG.md` extends under `## Unreleased`. `ROADMAP.md` receives the admin
test-send as engine work per ruling 7. No engine reference page changes, since the public API
is untouched.

## Acceptance criteria

A cold run on a site at `domain-live`, on an account with the plan on, reaches: the sending
domain onboarded and reporting `enabled: true`; one real message delivered to the owner's
address from `no-reply@<domain>`; that address written into `cairn.config.ts` and carried by a
deployed Worker; and the closing copy naming the address, its override, the `p=reject` DMARC
consequence, and the doctor command. The pasted token is absent from the state record's disk
re-read, from the raw file bytes, from argv, from every log line and from every error message
after either terminal state, with the file still 0600.

A run whose owner declines the plan exits 0 with the decline recorded, the token deleted, the
site still serving on its domain, and the copy naming `--sign-in` as the way back in. A re-run
re-offers. Both parks exit 0, print the re-entry command, and resume with no repeated writes,
asserted per hop through the fakes' request logs. A send failure inside the propagation window
parks; the same failure past it throws an act row. Every catalogue row is triggered by a test, `--dry-run`
performs nothing, and the money preamble prints on a fresh run and not on a resume. The runtime
library is untouched, except for a doctor predicate fix should the live check contradict this
document's verification.

## Execution prerequisites the plan names rather than discovers

1. **T4a landed through Task 14.** T4b extends its state machine and amends its completion
   step, so it cannot start against a half-built domain half.
2. **The scratch domain, delegated and active**, left in that state by T4a's e2e, with its
   inbound mail expendable.
3. **The account under test on Workers Paid.** Strong evidence says the glw907 account already
   is: `ecxc.ski` has Email Sending enabled and delivers magic links to arbitrary editors, which
   is only available on the paid plan. Confirm it in the same browser sitting as item 4 rather
   than assuming it.
4. **One billing glance**, now asked precisely: given four Workers Custom Domains on Free-plan
   zones on this account, does an Advanced Certificate Manager line item appear. This is the
   last unresolved number in the cost copy.
5. **The Email Sending permission group's dashboard name**, read off a minted token, which is
   the pass's only remaining spike question and which feeds ruling 3's amendment.
6. **A real inbox** the e2e's test send can land in.

## What this pass hands back to T4a, before T4a resumes

Two amendments, both cheap now and expensive later, and both belonging to work that has not yet
been built. T4a's Task 7 prefill URL gains the Email Sending permission (ruling 3), so chapter 2
asks for one token rather than two. T4a's Task 10 completion moves its token deletion from
`domain-live` to the terminal-state rule (ruling 5), which is a condition change rather than new
code. Whoever resumes T4a at Task 7 should carry both.
