# Identity-seam pass: harvest

Findings worth carrying forward, banked at the pass's close so a later pass does not have to
rediscover them from the diff or the transcripts.

## The locals hand-off pattern (Task 2)

`createAuthGuard`'s five pieces (bindings, CSRF, session resolution, roster lookup, capability
resolution) had, before this pass, exactly one resolution point per request: everything ran
inside the `!isPublicAdminPath` block. `identity` broke that assumption, since its flag has to
be readable on the public admin paths too (`/admin/login`, `/admin/auth/**`), where the
magic-link handlers still live.

The shape that resolved it: publish the value unconditionally, resolve it conditionally. The
guard writes `locals.cairnIdentity` from the closed-over `identity` option alone, immediately
after the bindings refusal and before the CSRF stage, outside the `!isPublicAdminPath` block, so
every admin path (guarded or public) carries the flag. `identity.resolve` itself runs only
inside the guarded block, where a request actually needs an editor resolved. A future per-request
seam facing the same public/guarded split can reuse this shape rather than re-deriving it: the
data a public handler needs to *know about* the seam is cheap and unconditional; the work the
seam *does* stays gated to where it is needed.

## The inverted probe (Task 4)

Before this pass, the doctor's login probe (`src/lib/doctor/check-probe.ts`) issued its GET
through the global `fetch`, which follows redirects by default. A probe run against a live
Cloudflare Access-gated origin would silently follow the gate's 302 to the identity provider's
own login page and classify that response as `/admin`'s, never detecting the gate at all: the
probe's classifier would look at a 200 body it does not recognize and report the wrong thing
about the origin it never actually saw.

The fix inverts the probe's default assumption: fetch with `redirect: 'manual'` and classify the
3xx directly (a redirect whose `Location` host matches the Access domain pattern is the PASS
case). Any doctor check that walks a redirect chain to reach its real target should default to
`redirect: 'manual'` and classify each hop explicitly, not trust the runtime's default
follow-and-report-the-end behavior; a gate that is working correctly is the one case an
auto-following fetch can never let the probe see.

## The recipe-versus-export ruling and its assurance limit

The seam is generic and engine-owned (`IdentityResolver`, `ResolvedIdentity`, `IdentityRefusal`);
the Cloudflare Access verifier that most sites will actually deploy is a documented recipe, not
an engine export, following the `isuniqueviolation-cloudflare` precedent: a Cloudflare-specific
mechanism with no engine-internal consumer stays out of the package until the engine becomes its
own first consumer or a second site needs the identical logic.

The limit worth naming explicitly, and now recorded at the declined ledger row rather than left
implicit: this is the first security-critical recipe cairn's extend track has shipped, and
`check:snippets` cannot verify it below its cairn-facing shape. The gate stubs `jose` (not a
cairn dependency) to `any`, so it type-checks the resolver's object shape and both return shapes
the seam contract requires, but it cannot type-check, let alone run, the JWT verification logic
inside the block. The only proof the recipe is correct is the `web-auth-security-reviewer`'s
read of it as shipped. A future engine-shipped verifier would replace this recipe with a tested
artifact and close the gap; until then, a site adopting the recipe is trusting a read, not a
test suite, and the ledger's declined row says so.

## Task 2's escalation: a ruled input cited a store bound that did not exist

Task 2's dispatch carried a ruled input naming a display-name length bound on the roster store
that, on inspection, was not present in `src/lib/auth/store.ts`: no such cap existed to defer to.
The task escalated rather than guessing at a number or silently dropping the requirement. The
resolution: the bound is new, not inherited, and the cap is 120 characters, applied where the
resolver's advisory `displayName` is capped before it can ever win over the roster row's own
value. A ruled input that names a concrete bound in existing code is worth one grep before it is
trusted; this one did not survive the grep, and escalating rather than inventing a number was the
right call.

## Task 3's two fix rounds

Task 3's integration tests went through two review rounds before landing clean, both worth
naming so a later implementer recognizes the shape faster:

1. **An assertion that discarded its result.** An early version of the hand-off page test called
   an assertion helper for its side effect and never checked what it returned, so the test could
   pass even when the thing it was meant to prove was false. The fix reads the return value and
   asserts on it directly, not just on the call having been made.
2. **A spy on the wrong console sink.** The test asserted a log line by spying on the wrong
   console method (the engine's structured logger writes through a different sink than the one
   the test's first draft intercepted), so the spy never saw the record and the assertion passed
   vacuously against an empty capture. The fix spies on the sink the engine actually writes
   through (`src/lib/log/`'s own chokepoint), the same lesson `CLAUDE.md`'s "Diagnosing a running
   site" section states from the operator's side: the structured log is the one true record, and
   a test proving a log line exists has to intercept the same channel the logger really uses.

## Polling a background gate wastes transcript tokens

During this pass's execution, an implementer polled a long-running background gate with repeated
no-op status-check commands rather than waiting for it to report, inflating its own transcript
and firing the runaway guard twice. The remedy, now the standing practice: sleep for a fixed
interval (`sleep 30`) between polls of a background process instead of checking in a tight loop,
and prefer a blocking wait over polling wherever the tooling supports one.
