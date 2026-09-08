# Sign in through your organization

By default, cairn is the editors' identity system: an email arrives with a link, and clicking it
is what proves who someone is. For an organization that already runs its own identity, on Google
Workspace or Microsoft Entra ID, that's a second system to maintain alongside the one it already
trusts. This page replaces the magic link with a gate in front of `/admin` that proves identity
the way the rest of the organization already does, and teaches cairn's roster to trust what that
gate says.

**Precondition:** a Cloudflare account with Zero Trust enabled, and an IdP (Google Workspace or
Microsoft Entra ID) your organization already administers. The Access application in this recipe
sits in front of the whole `/admin` surface; there is no partial adoption where some editors keep
using magic links and others go through the gate.

## Put an Access application in front of `/admin`

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) sits in
front of your Worker and refuses a request before it ever reaches cairn. Create a self-hosted
[Access application](https://developers.cloudflare.com/cloudflare-one/policies/access/app-types/self-hosted-apps/)
scoped to your site's own hostname, covering `/admin` (the exact path coverage a working setup
needs is its own section below). Connect it to your organization's directory: Cloudflare wires
Google Workspace in as a
[generic OIDC provider](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/generic-oidc/),
and Microsoft Entra ID has its own
[dedicated connector](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/entraid/).
Follow Cloudflare's own steps for whichever IdP you use; they change the console layout more
often than this page could track, so this page states the concepts and links the current
instructions rather than reproducing them.

Every Access application carries an **AUD tag**, a value Cloudflare mints per application, distinct
from the application's id. The recipe below validates a token against this tag, not the id; find
it on the application's Overview tab after creation.

## Migrate the roster to the IdP's own emails before you switch

cairn's roster (the `editor` table) still decides who may edit, by email. The gate only proves an
email; it never assigns a role. The moment `identity` mode is on, every request's proven email is
looked up against that roster, and a mismatch is refused as unknown, whatever the person's actual
standing in your organization. Before enabling `identity`, walk your roster and confirm every row's
email matches the address the IdP will assert for that person, its primary email, not an alias.
Fix a mismatch from the roster screen, or directly with `wrangler d1 execute` against `AUTH_DB`.
Skipping this step locks out whoever it affects the instant the gate goes live.

## Which login methods are safe

The proven email is the entire join between the gate and the roster: cairn trusts whatever
address the token carries, with no cross-check of its own. Whichever login methods an Access
application enables, and however many, every one of them produces a token that verifies
identically and carries the same audience, so the application's overall guarantee is only as
strong as its weakest enabled method. Enable only a method that proves control of the address it
asserts: your Workspace or Entra directory connection, or Cloudflare's own
[One-time PIN](https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/) as a
break-glass fallback for an account the directory temporarily can't reach.

Never enable a social identity provider, or a generic OIDC connection whose `email` claim the
end user can edit, on an application that gates a cairn admin. cairn cannot tell a
directory-asserted address from a self-asserted one; the token looks identical either way, and the
recipe below has no way to recover a distinction the gate itself didn't enforce.

## Operating instructions

- **Two admission lists, and they can drift.** The Access application decides who may reach
  `/admin` at all; the roster decides who, among those admitted, may actually edit. They are
  maintained separately by design (a group membership in your directory is not reliably present on
  the token the gate hands cairn, so this seam does not attempt group-to-role mapping), and nothing
  reconciles them automatically. Removing someone from your directory blocks them at the gate;
  removing them from the roster blocks them at cairn even if the gate still admits them. Review
  both when someone's standing changes.
- **The free Zero Trust plan covers 50 users**, counted as the editors who authenticate through
  Access, not cairn's own roster size. A larger editorial team needs the paid plan, which lifts the
  cap.
- **Seed the first owner before you enable `identity`.** Nothing in identity mode can bootstrap an
  owner: the guard never reaches the routes' bootstrap config, and a config value becoming an
  admission credential is exactly the shape this seam refuses. Seed the owner row the way
  `create-cairn-site` already does, or with `wrangler d1 execute` against `AUTH_DB`, before the
  gate goes live.
- **No Cloudflare cache rule may match `/admin`.** A cached response under the gate would serve one
  editor's page to the next request that matches the same cache key, gate or no gate.
- **The Access application's path coverage must be exact.** Cover `/admin`, every path beneath it,
  `/admin/__data.json` (SvelteKit's own data-only fetch for the same routes), and the shell's
  form-action URLs such as `/admin?/logout`. Do not cover `/preview/<token>`: a preview link is
  meant to reach an editor's reviewer, who has no reason to be admitted to `/admin` at all.
- **Leave the application's CORS settings off.** cairn's admin makes no cross-origin request that
  needs them, and turning them on only widens what a compromised script could reach.
- **A reachable, ungated origin is an open door, not a broken one.** If the Worker's hostname ever
  serves `/admin` without the gate in front of it, every request becomes an unauthenticated
  endpoint doing a JWT verify per request. That's a request the recipe below always refuses (no
  header means no identity means no session), but it's still a request the origin has to spend a
  cycle answering; the doctor's probe (below) is how you find such an origin, and your site's own
  rate limit is the remedy once you have.
- **Never branch inside `resolve` for local development.** A conditional that checks for a
  development environment inside the resolver you hand to `identity` is a code path that runs in
  production too, whatever you intended. Swap the whole guard behind your own build-time
  conditional instead, the way `examples/showcase/src/hooks.server.ts` swaps its dev backend in:
  a default build never carries the alternate branch, and a debug build carries it deliberately.

## The verifier

The recipe below is regular application code you write and own, not an engine export: cairn ships
no OIDC client, and `jose` is not one of its dependencies, so this repo's own doc gate cannot
typecheck the block against a real copy of `jose` and checks only its cairn-facing shape. Its
verification logic is proven by this pass's security review alone, never by an automated check;
read it as carefully as you would any other authentication code you commit to your own
repository.

```ts
// src/lib/access-identity.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { IdentityResolver, ResolvedIdentity, IdentityRefusal } from '@glw907/cairn-cms/sveltekit';

// Bare hostname, no scheme: Cloudflare's own samples show the team domain with `https://`
// already on it, and pasting that in doubles the scheme in the constructed URL below, which
// fails `issuer` for every request and locks out the whole roster.
const teamDomain = 'your-team.cloudflareaccess.com';
// The Access application's AUD tag (Overview tab), never the application's id.
const AUD = 'replace-with-your-applications-aud-tag';

if (teamDomain.includes('://') || teamDomain.includes('/')) {
  throw new Error('teamDomain must be a bare hostname, not a URL');
}
if (AUD.length === 0) {
  throw new Error('AUD must be the Access application\'s own AUD tag');
}

// Constructed once per resolver and reused for the life of the process: `createRemoteJWKSet`
// caches the fetched key set itself, and a fresh instance per request would refetch keys it
// already has. The explicit timings replace `jose`'s own defaults so the resolver's failure
// behavior under a slow or unreachable certs endpoint is a deliberate choice, not an accident:
// a request gets at most timeoutDuration to fetch keys, a failed fetch is not retried again
// until cooldownDuration has passed, and a successful key set is trusted for cacheMaxAge.
const JWKS = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`), {
  timeoutDuration: 5_000,
  cooldownDuration: 5_000,
  cacheMaxAge: 10 * 60 * 1000,
});

/**
 * Verify the Cloudflare Access assertion on every admin request. Only the header is read, never
 * the `CF_Authorization` cookie: the cookie is a bearer token replayable until its own
 * expiry, while the header is what Access itself attaches to a request it has already gated,
 * so trusting the cookie would accept a replayed token the gate did not just issue.
 */
export const accessIdentity: IdentityResolver = {
  logoutUrl: `https://${teamDomain}/cdn-cgi/access/logout`,
  label: 'your organization\'s sign-in',
  async resolve(event): Promise<ResolvedIdentity | IdentityRefusal> {
    const assertion = event.request.headers.get('Cf-Access-Jwt-Assertion');
    if (assertion === null) {
      return { ok: false, reason: 'missing' };
    }

    let payload: Record<string, unknown>;
    try {
      // Key selection is JWKS-only by construction: `jwtVerify` resolves the signing key from
      // the JWKS `createRemoteJWKSet` fetched, and never consults a token's own `jwk`, `jku`,
      // or `x5u` header, which would let a forged token nominate its own trust anchor.
      ({ payload } = await jwtVerify(assertion, JWKS, {
        issuer: `https://${teamDomain}`,
        audience: AUD,
        algorithms: ['RS256'],
        // No clockTolerance: Access-issued tokens are short-lived, and widening the expiry
        // window is a knob this recipe does not turn.
      }));
    } catch (err) {
      return { ok: false, reason: reasonFor(err) };
    }

    // A service token verifies and carries no `type` or `email` claim at all; refusing it here
    // as `no_email` keeps the roster lookup from ever seeing a token that was never a person.
    if (payload.type !== 'app') {
      return { ok: false, reason: 'invalid' };
    }
    if (typeof payload.email !== 'string' || payload.email.length === 0) {
      return { ok: false, reason: 'no_email' };
    }

    return { ok: true, email: payload.email };
  },
};

// jose's error classes map onto the refusal reasons IdentityResolver declares. `keys` covers a
// JWKS fetch failure specifically, so a certs endpoint outage logs and alerts as an operator
// fault rather than reading like a wave of forged tokens.
function reasonFor(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'JWTExpired':
      return 'expired';
    case 'JWTClaimValidationFailed': {
      const claim = (err as { claim?: string }).claim;
      if (claim === 'aud') return 'audience';
      if (claim === 'iss') return 'issuer';
      return 'invalid';
    }
    case 'JWKSNoMatchingKey':
    case 'JWKSTimeout':
    case 'JWKSInvalid':
      return 'keys';
    case 'JWSSignatureVerificationFailed':
    case 'JWTInvalid':
    case 'JWSInvalid':
      return 'invalid';
    default:
      return 'error';
  }
}
```

This runs on every admin request; the assertion is the only proof a request already passed the
gate, so there is no session to cache it against.

`audience`, `issuer`, and `keys` are operator faults: each one means every request from every
editor is about to be refused, not just this one, so alert on them rather than treating them as
routine sign-in noise. `missing`, `invalid`, `expired`, and `no_email` are request-shaped and need
no alert on their own; a spike in them is still worth a look. `guard.rejected`'s `reason: identity`
carries this same split as its log level (see
[log events](../reference/log-events.md), `guard.rejected`); `auth.identity.unknown` is a separate
event for a proven identity the roster doesn't recognize (see the migration step above).

## The roster's role, and logging out

The gate answers who; the roster still answers whether that person may edit, and at what
capability. `resolve` never returns a role, and the guard never asks it for one: the identity
seam and the roster stay two separate systems on purpose, so authorization has exactly one source
of truth, the same one it has today. A proven identity with no roster row is refused as unknown,
logged with the normalized email; add the row and the very next request succeeds, no restart
required.

Cairn mints no session under `identity`, so cairn's own logout has nothing of its own to end: it
clears its cookies and redirects to `logoutUrl`, the address `IdentityResolver` declares. Ending
the *gate's* session is the Access application's own job, and revocation there is not instant:
Cloudflare propagates a revoked Access session within about thirty seconds. For removing someone
who should no longer edit right now, the roster's own delete is the stronger lever; it takes effect
on their very next request, gate session or not.

## Stability

`identity`, `IdentityResolver`, `ResolvedIdentity`, and `IdentityRefusal` are Unstable API: the
shape is not yet committed to across a minor version, since no site has adopted it yet. The
seam's first production consumer promotes it to the same frozen tier `createAuthGuard` itself
carries.

## Any other gate

Nothing above is Cloudflare-specific at the seam level. `identity` takes any `IdentityResolver`:
a `resolve` that proves who is asking, however it proves it, and a `logoutUrl` for cairn's own
logout to redirect to. A different reverse proxy in front of `/admin`, asserting identity through
a different header or a different token shape, writes its own version of the recipe above against
the same interface; only the verification details change.

## Two more doors

Two more seams solve problems adjacent to this one, each covered here in one section since a
reader replacing sign-in is likely evaluating the whole auth surface at once.

### A sender other than Cloudflare Email Sending

Any admin that doesn't configure `identity` still uses the magic-link path, which sends through
Cloudflare Email Sending unless told otherwise.
[`CairnAdminConfig.auth.send`](../reference/sveltekit.md#cairnadminconfig) takes a
`SendMagicLink` implementation of your own, documented in the [SvelteKit reference](../reference/sveltekit.md).
It's called with the same message the built-in sender receives, for a site whose domain sends
mail through something else.

### A backend other than GitHub

A `BackendProvider`, documented in the [core reference](../reference/core.md), commits every
concept cairn manages: the adapter's `backend` value carries the provider's kind and default
branch, and `connect(env)`s to a live `Backend` when a route needs one. `githubApp(...)` is the
one provider cairn ships, wrapping the GitHub App flow this project defaults to; the interface
itself names no second implementation, and none ships with cairn today. A site that stores
content somewhere other than GitHub implements `BackendProvider` against its own store.
