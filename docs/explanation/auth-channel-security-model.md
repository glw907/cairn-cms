# The auth-channel security model

`createAuthChannel` is the factory a site uses to add a second login channel, an OTP over SMS or
another site-owned transport, for an audience that isn't its editors: members, athletes, boosters.
The factory owns the code, budget, session, and storage mechanics. The site supplies delivery,
roster lookup, and a bot challenge, three callbacks that carry correctness obligations the factory
cannot check for itself. This page is for a developer improving that model, not one using the
surface; the reference page states the surface itself.

## The trust boundary

Two roles meet at a channel, and neither is trusted by default. A **requester** is any
browser that submits the contact form; it may belong to the member it names, or to an attacker who
knows that member's phone number. An **identity** is a roster entry (a contact, or the subject a
site's `lookup` resolves it to); it never authenticates anything itself; it only names who a code
row and a budget belong to. The factory's whole job is to keep those two roles from being confused:
a requester never learns whether the identity it named exists, and nothing an identity's own state
can do reaches back to deny the requester who legitimately owns it.

Three config callbacks carry correctness obligations the factory cannot enforce. `normalize` must
be idempotent, canonical per identity, and injective across distinct people. `lookup`'s subject
must be stable and canonical per person. `challenge` must verify: the factory can tell a missing
`challenge` from a present one, but not `async () => true` from a real Turnstile call. `challenge`
is the most load-bearing of the three, because the entire economic bound on guessing (see Residual
risks) is its consequence.

## The rule the design was built from

> No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
> the requester. Identity-keyed controls either escalate through a channel the site can act on, or
> they only log.

Two earlier designs failed by violating this rule, and a third violated it again inside the
mechanism written to prevent it. The first design counted failed guesses on a row keyed by the
victim's own contact, so an anonymous attacker who knew a phone number could exhaust that row and
lock the real member out permanently. The second design fixed that by binding codes to the
requesting browser, and then keyed the send budget on the victim's identity instead, so five
requests an hour from any browser answered the victim's own request with `{sent: true}` and
delivered nothing. A third design wrote the rule down and then carved out two exceptions to it: an
escalation path with no wire representation, which could only resolve as a fail-closed denial, and a
live-row cap that pruned by identity rather than by requester. Reviewers broke both within one
round. The rule now has no exceptions.
[`docs/internal/2026-08-04-auth-channel-review-rounds.md`](../internal/2026-08-04-auth-channel-review-rounds.md)
records all three rounds in full, including what was rejected and why.

Escalation only counts as escalation when it has a wire representation the site can render.
`challenge-required` is that representation: an escalated `request` or `confirm` answers it without
charging an attempt, without consuming a row, and without failing, so the site renders its challenge
widget and the member retries. A failed challenge on an escalated action answers
`challenge-required` again, never a hard error.

## Threat catalogue

Every entry below names the attack, the mechanism that defeats it, and the test that proves it. A
test name here is a literal string from the suite; grep it before trusting this page over the code.

### Denial of service kept off the victim

**An anonymous attacker exhausts a victim's send budget.** The only control that can ever refuse a
`request` is the requester bucket, the pair of client address and identity; the identity's own send
count only logs (`auth.channel.ceiling_exceeded`, error level) so an operator can act at the edge.
Test: `auth-channel-request.test.ts`, describe "the lockout regression test," "an attacker exceeding
the identity send ceiling from many buckets never blocks the victim, who requested first" (the
attacker exceeds every identity-keyed cap in the Defaults table, from many separate buckets, and the
victim still completes with no interaction beyond the ordinary flow).

**An anonymous attacker exhausts a victim's guess budget.** The identity failure gate on `confirm`
escalates to `challenge-required` rather than denying; only the per-code-row attempt cap, which the
attacker's own guesses charge on their own row, can lock a row closed. Test:
`auth-channel-confirm.test.ts`, describe "the confirm-side lockout regression test," "an attacker
exceeding the identity failure gate never blocks the victim, who requested first."

**An attacker who clears cookies repeatedly evicts a victim's live rows.** Minting a fresh nonce
prunes the requester bucket's own oldest rows to the live-row cap, never the identity's, so an
evictor can only ever destroy rows it created itself. Test: `auth-channel-store.test.ts`, "trims one
bucket to the keep cap and never touches another bucket."

### The roster oracle

**`confirm`'s error responses reveal whether a contact is on the roster.** Every input writes a row
regardless of whether the contact is known (a decoy for an unknown contact, subject `NULL`), so
`bad-code`, `locked`, and `expired` are structurally identical between a decoy identity and a real
one. Tests: `auth-channel-confirm.test.ts`, describe "bad-code, locked, and expired are deep-equal
between a decoy identity and a real one," "bad-code, with identical attempt deltas," "locked, with
identical attempt deltas," and "expired, identically" (each asserts identical response bodies and
identical store-state effects).

**`request`'s response shape or delivery call reveals whether a contact is on the roster.** Delivery
runs only for a known subject, but the response and the row written are uniform across known,
unknown, and cooldown-held inputs. Test: `auth-channel-request.test.ts`, describe "response
uniformity across known, unknown, and cooldown-held inputs," "known, unknown, and cooldown-held all
answer the byte-identical {sent: true}."

### Races and atomicity

**Two concurrent confirms against one valid code both mint a session.** `consumeCode` is the single
conditioned `DELETE ... RETURNING subject` that is the sole authority on whether the code matched,
never a separate compare followed by a delete. Tests: `auth-channel-store.test.ts`, "concurrent
identical confirms consume exactly once." `auth-channel-confirm.test.ts`, "two concurrent confirms
with one valid code mint exactly one session."

**Parallel requests against a budget one charge from its cap all admit.** Every budget charge is one
atomic conditional upsert with the window roll expressed inside the statement, never a
read-modify-write. Test: `auth-channel-store.test.ts`, "k parallel charges at cap - 1 admit exactly
one."

**A request at a sliding-window boundary admits twice the cap.** The window is two-bucket sliding
(`count` plus `prev_count`), not a single tumbling window. Test: `auth-channel-store.test.ts`, "does
not admit a fresh cap the instant a fixed window rolls over."

### Identity, storage, and the salt

**An identity hash is reversed against a small identifier space** (a 10-digit phone number space
brute-forces in seconds against a bare hash). Identity is salted per deployment,
`hashToken(salt + 's:' + subject)` or `hashToken(salt + 'c:' + contact)`, and the salt is provisioned
lazily by the factory rather than shipped in a static, doc-pinned constant. Tests:
`auth-channel-store.test.ts`, "derives different identities for the same contact under two fresh
salts," and "fails closed when the salt is absent after provisioning (a corrupted store)" (a missing
salt row refuses the action rather than defaulting to an empty string, which would silently revert
to an unsalted hash).

**A decoy row or a roster data fault mints a shared session.** A session mints only on a returned
subject that is non-null and non-empty. An empty-string subject is logged as a roster fault, never
treated as a valid subject. Tests: `auth-channel-store.test.ts`, "a decoy row never authorizes:
subject comes back null, never coerced," and "an empty-string subject row passes through as empty,
not coerced to null." `auth-channel-confirm.test.ts`, describe "a decoy row and an empty-subject row
never mint," "a correctly guessed decoy code answers bad-code and mints nothing," and "a correctly
guessed empty-subject row answers bad-code, logs the roster fault, and mints nothing."

**A stale or mismatched schema silently runs against wrong assumptions.** `verifySchema` checks the
deployed version against `CHANNEL_SCHEMA_VERSION` and fails the action closed on a mismatch, caching
only a positive result so one transient D1 error never pins an isolate into refusing every login for
its lifetime. Test: `auth-channel-store.test.ts`, "fails closed on an old shape and does not cache
the failure."

### Cross-device redemption: why the nonce cookie exists

**A code intercepted in transit, shoulder-surfed, or otherwise seen by someone other than the
member is redeemed from a different browser.** `confirm` reads no `contact` field and calls neither
`normalize` nor `lookup`; the code row is found by nonce hash alone, and the nonce is a 256-bit
server-minted value that only ever leaves the server inside an `HttpOnly` cookie scoped to the
browser that requested it. A code without the matching browser's cookie has no path to a session,
so a code seen in transit is useless to the person who saw it. The member must confirm in the same
browser that requested, which is the trade this design makes against the cross-device flow (see
Residual risks). The same reasoning keeps a contact out of `confirm` entirely: a second lookup at
confirm time is the seam that let a transient roster error turn a real member into a decoy in an
earlier design (recorded in the review-rounds doc). Tests:
`auth-channel-confirm.test.ts`, describe "no attempt spent, no row consumed," "a mismatched nonce
costs no attempt on the real row" and "an absent nonce costs no attempt and reaches no store."

### Forged requests

**A cross-site page submits `request`, `confirm`, or `logout` on a victim's behalf.** All three
actions check origin unconditionally, not gated on a content-type test, and refuse plain HTTP
outside localhost. Tests: `auth-channel-request.test.ts`, describe "origin and scheme checks,"
"refuses a mismatched origin" and "refuses plain http outside localhost."
`auth-channel-confirm.test.ts`, the same describe block and test names. `auth-channel-session.test.ts`,
describe "logout," "refuses a mismatched origin" and "refuses plain http outside localhost."

### Operational integrity

**A `devDelivery` wrapper ships a working code-readback path to production.** The refusal that reads
`ctx.env.CAIRN_DEV_BACKEND === '1'` lives inside `devDelivery`'s own body, so wrapping it in another
function does not bypass it. Test: `auth-channel-config.test.ts`, describe "devDelivery, direct and
wrapped," "the wrapper still refuses at call time without the dev flag (the bypass case)."

**A delivery-provider outage strands a member behind a spent cooldown or budget.** A throwing
`deliver` deletes the pending row and refunds the requester charge, so an outage costs nothing but a
retry. Test: `auth-channel-request.test.ts`, describe "delivery failure (step 8)," "a throwing
deliver leaves no row, refunds the charge, and an immediate re-request delivers again."

**A member tapping resend spends their whole hourly budget on one delivered message.** The requester
charge is refunded whenever the cooldown holds and nothing is sent. Test:
`auth-channel-request.test.ts`, describe "nonce reuse and the cooldown (step 7)," "two sequential
requests in one jar inside the cooldown deliver once and leave the requester bucket charged once."

**A roster-lookup outage is indistinguishable from ordinary probing, so an operator can't tell a
degraded dependency from an attack.** A throwing `lookup` answers identically to an unknown contact
on the wire, but logs a distinct `lookup_failed` outcome at warn. Test:
`auth-channel-request.test.ts`, describe "a throwing lookup," "answers identically to an unknown
contact, writes a decoy row, and logs one lookup_failed record at warn."

**A log record leaks a contact, a raw provider error, or other roster-identifying content into
storage not scoped to the roster.** `send_failed` logs a scrubbed, length-capped error rather than
the provider's raw message, and no confirm-path record carries a contact at all. Tests:
`auth-channel-request.test.ts`, "scrubs the contact out of the send_failed log record."
`auth-channel-confirm.test.ts`, describe "nonce cookie cleared and no contact in any log record," "no
confirm log record carries a contact."

**The optional rate limit's default key collapses onto the identity alone, turning back pressure
into an identity-keyed denial.** The default key is the composed requester bucket, the address half
from `requesterBucket` paired with the derived identity, the same composition `request` and
`confirm` already charge against, never the identity alone. Test:
`auth-channel-rate-limit.test.ts`, describe "rate limit: default key composition," "two different
requester buckets against one identity do not share a limit."

## Residual risks

These are accepted, not solved, carried here with the numbers unchanged from the design.

- **Guessing is bounded economically, not absolutely.** With 8 digits and a 20-failure hourly gate,
  an attacker gets about 43,200 free guesses per member per 90-day season against 10⁸, which is
  0.043% per targeted member. The number that matters operationally is the roster aggregate: across
  200 members that is a ~8.3% chance of at least one account falling per season. Beyond the free tier
  every guess needs a solved challenge, and at commodity captcha-farm rates the expected marginal
  cost per compromised account is around six figures. That figure bounds the cost of guessing
  *faster* than the free rate, not the cost of the attack: an attacker who stays in the free tier
  pays nothing and accumulates linearly. A site wanting a stronger bound raises the code length to
  10, which moves the roster aggregate to about 0.08%.
- **The clamp floor matters.** These numbers hold at 8 digits or more, which is why the floor is 8
  rather than the consumer's original 6. At 10⁶ the same free tier gives roughly 4.3% per member per
  season, and a 200-member roster is close to certain to lose an account.
- **An attacker who knows a contact can force a member to solve a captcha.** That is the honest cost
  of escalation, and it is the price of never denying: friction the member can pass through, rather
  than a wall they cannot.
- **An attacker can spend a site's SMS budget** by pumping requests at one number. Nothing denies
  this, deliberately, because denying it means denying the member. The engine logs
  `ceiling_exceeded` at error; the response is an operator one, at the edge or with the provider.
- **A 6-to-10-digit code hashed at rest is a speed bump, not a protection.** Read-only database
  exposure recovers live codes. The mitigations are the 10-minute TTL and session binding, which make
  a recovered code useless in another browser.
<!-- vale Google.Units = NO -->
<!-- SP 800-63B is a document identifier, not a measurement. -->
- **SMS is a restricted authenticator under NIST SP 800-63B.** A site choosing it owes its members
  that disclosure; the guide says so.
<!-- vale Google.Units = YES -->
- **A member must confirm in the browser that requested.** This is what makes a code stolen in
  transit useless to the thief, and it costs the cross-device flow.
- **The Cloudflare rate-limit binding is back pressure only** (10 or 60 second periods, per colo,
  eventually consistent). **The per-nonce resend cooldown is UX only**: nonces are client-cleared at
  will, so an attacker never meets it. It bounds accidental double submission and nothing else.
- **Sessions are unbounded per subject and never rotated.** `revokeSessions` is all-or-nothing.
- **A member removed from the roster between request and confirm still gets a session**, since
  confirm deliberately runs no second lookup. Bounded by the code TTL and cured by `verify`.
- **On a multi-contact site the shared identity budget links contacts.** Exhausting the budget via
  one contact and observing a second contact's throttle state proves both belong to one member and
  both are on the roster. Sites with one contact kind per member are unaffected.
- **A shared-NAT venue can exhaust its own requester buckets**, and a CGNAT neighbour shares an
  address with strangers. The requester bucket pairs address with identity to soften this.
- **Read-replica lag affects session creation as well as revocation** when a site enables D1 read
  replication: a member can complete `confirm` and have the next `resolveSubject` miss the row. Carry
  the D1 session bookmark in the cookie, or leave replication off on this database.

## How to propose a change

The pass-level acceptance test is the bar any proposal has to clear: **a site must not be able to
write a working channel that is insecure without deliberately bypassing the factory.** A proposal
that weakens a control has to state, explicitly, which entry in the threat catalogue above it
reopens, and the lockout regression tests in particular (the two tests named under "Denial of
service kept off the victim") have to keep passing unmodified. A proposal that changes what those
tests assert, rather than making the implementation satisfy them, has not closed the gap.

**A change to this model earns an adversarial round before implementation**, the same discipline
that produced it. Three rounds ran against this design before the first line of implementation
code. Each of the first two found a real defect, and the third found a subtler recurrence of the
same defect; in all three the code itself read as correct in isolation. Run a round with at
least one reviewer on the auth-security lens, dispatched with the design change and no
implementation, and record the outcome in
[`docs/internal/2026-08-04-auth-channel-review-rounds.md`](../internal/2026-08-04-auth-channel-review-rounds.md)
before writing code against it.
