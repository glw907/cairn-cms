# Auth channel security model

The security contract for `createAuthChannel`, cairn's supported way to add a second audience's own
login, members, athletes, boosters, without hand-writing auth crypto. [Add a second
audience](./add-a-second-audience.md) walks through building one; this page is what to trust and
why.

## What this is, and what it is not

Email magic-link through the built-in owner/editor model stays the zero-config default and the
documented primary path for editors; see [Security model](./security-model.md). `createAuthChannel`
is the supported second channel for a different audience entirely, not a menu of interchangeable
auth strategies. A site supplies delivery (send an SMS, an email, whatever channel fits), a roster
lookup, an identifier shape, and a bot challenge; the factory owns every security discipline: code
minting, consumption, rate budgets, sessions, and revocation.

Three of those inputs carry correctness obligations the factory cannot verify by inspection, so
they are stated rather than silently assumed. `normalize` must be idempotent, canonical per
identity, and injective across distinct people; a lossy `normalize` maps two real people onto one
identity and hands out a cross-person budget. `lookup`'s subject must be stable and canonical per
person. `challenge` must actually verify a human; the factory cannot distinguish a real Turnstile
`siteverify` call from `async () => true`, and the entire economic bound on guessing rests on that
function doing real work. Get any of these three wrong and the factory's other guarantees stop
applying.

## The rule every control in this system obeys

**No control keyed on the victim's identity may deny, delay, or destroy anything. Denial keys on
the requester. An identity-keyed control either escalates through a channel the site can act on, or
it only logs.**

This absolute rule exists because three earlier design rounds each failed by violating it in a
progressively narrower way: counting failed attempts against the contact being impersonated let an
anonymous attacker lock out a real member permanently; binding codes to the requesting browser
fixed that and reintroduced the same defect one step earlier, on the send budget instead of the
attempt count; a rule written to close both still left an escalation path with no result code
(which could only resolve as a silent denial) and a row-eviction cap that pruned by identity rather
than by requester. The rule has no exception anywhere in the current design. A denial-of-service
primitive keyed on nothing but a phone number or an email address is exactly the shape this rule
forecloses.

Three consequences fall out of the rule and are worth knowing before reading the budgets below:

- **Escalation carries a wire result, `challenge-required`, or it would be a denial in disguise.**
  An escalated request or confirm returns it without charging an attempt, without consuming the
  pending code, and without failing outright; the site renders its challenge widget and the member
  tries again. A failed challenge on an already-escalated action returns `challenge-required` again,
  never a hard error, so a member always has a path through.
- **Anything that evicts stored rows keys eviction on the requester's own bucket**, so a caller can
  only ever crowd out its own pending rows, never another person's.
- **The anti-abuse spend ceiling does not deny.** Crossing it logs at error and is meant to alert
  whoever operates the site. Bounding a site's SMS spend by refusing a real member's login is the
  exact trade this whole design exists to refuse.

## Origin and scheme, checked first, unconditionally

Every action (`request`, `confirm`, `logout`) starts by asserting the request's `Origin` matches
the site's own origin and that the connection is `https`, except on a local development host. Both
checks throw a plain 403 before any code, budget, or session logic runs; neither carries a wire
result, since a forged or downgraded request gets no information back beyond the refusal itself.
This mirrors the admin guard's own unconditional origin check, described in [Security
model](./security-model.md), applied here to routes the admin guard never covers.

## Identity is salted and prefixed, not stored raw

Every budget and log correlates on a derived identity, never on the raw contact value: `hashToken(salt
+ 's:' + subject)` when a roster lookup already resolved a stable subject, `hashToken(salt + 'c:' +
contact)` otherwise. The `'s:'`/`'c:'` prefixes keep a subject-derived and a contact-derived
identity from colliding even when a subject happens to look like an email address, and the
per-deployment salt is what keeps the hash from being reversible against a small contact space; an
unsalted hash over a ten-digit phone number recovers in seconds. Every log record correlates on the
first 16 hex characters of this hash (`correlationId`), never on the contact itself, so a log is
safe to read and paste without exposing who it names. See
[`auth.channel.requested`](../reference/log-events.md) onward in the log events reference for the
full event list this correlates against.

## Codes are drawn uniformly, not merely randomly

A numeric confirmation code of a site-configured length is drawn through rejection sampling over a
Web Crypto random byte range, not a naive modulo of a random integer. A naive modulo over a range
that isn't a clean power of the underlying random draw's size is measurably biased toward the low
end of the range; rejection sampling removes that bias, so the guessing-cost bound the rate limits
below assume holds against a genuinely uniform distribution, not one an attacker could weight
toward.

<!-- vale Google.Units = NO -->
<!-- SP 800-63B is a document identifier, not a measurement. -->
This is the same discipline NIST SP 800-63B's authenticator-lifecycle guidance assumes when it
reasons about the entropy of a short numeric secret: the guessing-resistance math only holds if the
secret is actually drawn uniformly, which is exactly the property rejection sampling restores here.
<!-- vale Google.Units = YES -->

## Sessions and revocation

A confirmed code mints a channel session, stored and resolved the same hashed-lookup way the
built-in admin session is. Logging out destroys that one session row. `revokeSessions` additionally
lets a site's own code end every session for one identity at once, for a roster removal or a
reported compromise; this is the one place identity-keyed action is a deliberate destructive
capability rather than a denial-of-service risk, since it is the site's own trusted code invoking
it, not a public, unauthenticated caller.

## The dev transport is not a dev-only risk

A hand-rolled dev transport that prints a channel's code to the console instead of sending it, so
local development needs no real SMS or email provider, answers a roster oracle by construction:
delivery only ever runs for a known subject, so a readback route standing in front of one tells an
unauthenticated caller whether an arbitrary contact is on the roster, no code-guessing required.
The same risk applies to a capture transport a site builds to prove its own channel end to end.
Never point one at a database holding real contacts.

The same transport also lands its plaintext one-time codes in Workers Logs if it runs inside a
deployed Worker with observability turned on, since cairn logs through `console`. Both risks are
about where the transport runs, not about the code being wrong: keep a dev transport and any
capture-style stand-in strictly local, gated the same way cairn's own dev backend is.

## What a site is responsible for

The factory owns the crypto and the budget disciplines above. A site still owns getting its three
correctness-obligated inputs right (`normalize`, `lookup`, `challenge`), choosing a real delivery
mechanism, and keeping its own roster data accurate; a stale or incorrect roster lookup is a data
problem the factory has no way to detect. See [Auth crypto](../reference/auth-crypto.md) for the
underlying primitives a site's own delivery code can reuse directly, and [Add a second
audience](./add-a-second-audience.md) for wiring this factory into actual routes.
