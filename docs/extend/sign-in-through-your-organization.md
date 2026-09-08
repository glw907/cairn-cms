# Sign in through your organization

By default, cairn is the editors' identity system: an email arrives with a link, and clicking it
proves who someone is. An organization that runs its own identity on Google Workspace or Microsoft
Entra ID is then maintaining a second one alongside the directory it already trusts. This page
replaces the magic link with a gate in front of `/admin` that proves identity the way the rest of
the organization does, and teaches cairn's roster to trust what that gate says.

**Precondition:** a Cloudflare account with Zero Trust enabled, and an IdP (Google Workspace or
Microsoft Entra ID) your organization already administers. The Access application in this recipe
sits in front of the whole `/admin` surface; there is no partial adoption where some editors keep
using magic links and others go through the gate.

## Put an Access application in front of `/admin`

[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
sits in front of your Worker and refuses a request before it ever reaches cairn. Create a
self-hosted
[Access application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/)
scoped to your site's own hostname, covering `/admin` (the exact path coverage a working setup
needs is its own section below). Connect it to your organization's directory: Google Workspace and
Microsoft Entra ID each have their own dedicated connector,
[Workspace's here](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google-workspace/)
and
[Entra ID's here](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/entra-id/).
Follow Cloudflare's own steps for whichever IdP you use; their console layout changes faster than
any copy of it here would stay true.

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
address the token carries, with no cross-check of its own. Every login method an Access
application enables produces a token that verifies identically and carries the same audience, so
the application's guarantee is only as strong as its weakest enabled method. Enable only a method
that proves control of the address it asserts: your Workspace or Entra directory connection, or
Cloudflare's own
[One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)
as a break-glass fallback for an account the directory temporarily can't reach.

Never enable a social identity provider, or a generic OIDC connection whose `email` claim the
end user can edit, on an application that gates a cairn admin. cairn cannot tell a
directory-asserted address from a self-asserted one; the token looks identical either way, and the
recipe below has no way to recover a distinction the gate itself didn't enforce. A Workspace or
Entra connection wired through its own dedicated connector asserts a directory-owned address and
is fine; the warning is about a generic OIDC provider that lets its users set their own profile
email.

## Operating instructions

- The Access application and the roster are two admission lists that can drift: the application
  decides who may reach `/admin` at all, the roster decides who, among those admitted, may
  actually edit, and nothing reconciles them automatically. They stay separate by design, since a
  group membership in your directory is not reliably present on the token the gate hands cairn, so
  this seam does not attempt group-to-role mapping. Removing someone from your directory blocks
  them at the gate; removing them from the roster blocks them at cairn even if the gate still
  admits them. Review both when someone's standing changes.
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
  `/admin/__data.json` (SvelteKit's own data-only fetch for the same routes), and the shell's form
  actions, which post to `/admin` itself with a query string Access doesn't match on, so covering
  `/admin` covers them. Do not cover `/preview/<token>`: a preview link is meant to reach an
  editor's reviewer, who has no reason to be admitted to `/admin` at all. Access rules resolve
  most specific first, hostname and path, then Worker, then account, so removing a more specific
  rule falls back to a broader one, or to none; check the resolved rule after any change here, not
  just the one you edited.
- **Leave the application's CORS settings off.** Access answers preflights for the gated path
  itself, so enabling them can make the `X-Cairn-CSRF` header settable cross-origin and collapse
  the CSRF witness the admin guard relies on. cairn's admin is same-origin and needs no CORS.
- **A hostname that reaches the Worker without the gate in front of it admits anyone holding a
  token.** The recipe below refuses a request carrying no assertion, but it can't refuse a valid
  one: it checks the signature, the issuer, the audience, and the expiry, and Access's revocation
  state isn't carried in the token. On an ungated hostname the requester supplies the header
  themselves, so anyone holding a still-unexpired token for this AUD keeps full editor capability
  there, an offboarded editor included. Two things close it. Set `workers_dev: false` in the
  site's wrangler config, since the Worker is otherwise reachable at
  `<name>.<subdomain>.workers.dev/admin`, which no Access application covers unless it was told to,
  and make sure every custom hostname and route that reaches this Worker is covered by the
  application. Closing the hostname is one option; covering it is the other, since an Access
  application can also be configured to gate the workers.dev and preview hostnames directly (see
  Cloudflare's [preview URLs
  page](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/) for
  exactly which hostname each mode serves) instead of only the custom domain. `workers_dev: false`
  does not by itself close a
  [preview URL](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/):
  Wrangler defaults `preview_urls` to `workers_dev`'s own value, but a site that set
  `preview_urls: true` explicitly, or has previews toggled on in the dashboard on an older
  Wrangler, still serves `/admin` on an `<alias>-<name>.<subdomain>.workers.dev` hostname no
  Access application covers; set `preview_urls: false` too, and confirm it, since this is
  yours to close, not something the doctor's probe checks. Then run `cairn-doctor --probe`
  with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set (see
  [the doctor's live probe](../reference/doctor.md#the-opt-in-live-probe) for what those
  credentials unlock), whose second arm probes the workers.dev hostname and fails on any
  response the Worker itself serves there, a 200, an unguarded redirect, or the branded
  refusal page identity mode itself serves, even when the primary hostname passes. Your
  site's own rate limit ([`resolveRateLimit`](../reference/cloudflare.md#resolveratelimit))
  is worth having too, since an ungated `/admin` spends an RSA verification per request, but
  it's the smaller half of this bullet.
- **Never branch inside `resolve` for local development.** A conditional that checks for a
  development environment inside the resolver you hand to `identity` is a code path that runs in
  production too, whatever you intended. Swap the whole guard behind your own build-time
  conditional instead, the way `examples/showcase/src/hooks.server.ts` swaps its dev backend in:
  a default build never carries the alternate branch, and a debug build carries it deliberately.

## The verifier

The recipe below is application code you write and own. cairn ships no OIDC client and doesn't
depend on [`jose`](https://github.com/panva/jose), so nothing in cairn typechecks this block
against the real library or verifies its logic for you. Read it as carefully as any other
authentication code you commit.

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

// Both throws below run at import time, so a wiring mistake fails every request on the whole
// Worker, public pages included, not just `/admin`. That's fail-closed and fine, but recognize
// the symptom (a site-wide 1101) as this typo rather than an outage.
if (teamDomain.includes('://') || teamDomain.includes('/')) {
  throw new Error('teamDomain must be a bare hostname, not a URL');
}
if (AUD.length === 0 || AUD.startsWith('replace-with-')) {
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
  cooldownDuration: 30_000,
  cacheMaxAge: 10 * 60 * 1000,
});

/**
 * Verify the Cloudflare Access assertion on every admin request. Only the header is read, never
 * the `CF_Authorization` cookie: Access attaches the header only on paths it proxies, while
 * `CF_Authorization` is a browser-attached bearer value replayable on any hostname reaching the
 * same Worker and settable by hand.
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

    // Access issues two token shapes on the same keys: this application's token (`type: 'app'`)
    // and the team-scoped `org` session token. Only the first is a statement about this
    // application. `type` is observed on real Access tokens, not documented in Cloudflare's
    // published field list; the check fails closed, so a future rename would lock out the
    // whole roster rather than admit anyone.
    if (payload.type !== 'app') {
      return { ok: false, reason: 'invalid' };
    }
    // A service-token request verifies and carries `common_name` with an empty `sub` and no
    // `email` at all. Refusing it here keeps the roster lookup from ever seeing a token that was
    // never a person.
    if (typeof payload.email !== 'string' || payload.email.length === 0) {
      return { ok: false, reason: 'no_email' };
    }

    return { ok: true, email: payload.email };
  },
};

// jose's error codes map onto the refusal reasons IdentityResolver declares. Branch on `code`,
// never on `name`: jose derives `name` from the class name, which a minified production bundle
// renames, while `code` is a string literal on the instance. `keys` covers every certs-endpoint
// failure this switch names explicitly, plus a network failure that surfaces as a bare TypeError
// from fetch (the default branch below); a non-200 certs response or an unparseable body throws
// jose's generic `ERR_JOSE_GENERIC` instead, which falls to the `error` default, still an operator
// fault and still alerted the same way. Either way a certs outage logs and alerts as an operator
// fault rather than reading like a wave of forged tokens.
function reasonFor(err: unknown): string {
  if (!(err instanceof Error)) return 'error';
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'ERR_JWT_EXPIRED':
      return 'expired';
    case 'ERR_JWT_CLAIM_VALIDATION_FAILED': {
      const claim = (err as { claim?: string }).claim;
      if (claim === 'aud') return 'audience';
      if (claim === 'iss') return 'issuer';
      return 'invalid';
    }
    case 'ERR_JWKS_NO_MATCHING_KEY':
    case 'ERR_JWKS_MULTIPLE_MATCHING_KEYS':
    case 'ERR_JWKS_TIMEOUT':
    case 'ERR_JWKS_INVALID':
      return 'keys';
    case 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED':
    case 'ERR_JWT_INVALID':
    case 'ERR_JWS_INVALID':
    case 'ERR_JOSE_ALG_NOT_ALLOWED':
      return 'invalid';
    default:
      // A failed certs fetch arrives as a TypeError with no jose code.
      return err.name === 'TypeError' ? 'keys' : 'error';
  }
}
```

This runs on every guarded admin request; `/admin/login` and `/admin/auth/**` are public and never
call `identity.resolve` at all. The assertion is the only proof a request already passed the gate,
so there is no session to cache it against.

`audience`, `issuer`, `keys`, and `error` are operator faults: each one means every request from every
editor is about to be refused, not just this one, so alert on them rather than treating them as
routine sign-in noise. `missing`, `invalid`, `expired`, and `no_email` are request-shaped and need
no alert on their own; a spike in them is still worth a look. `guard.rejected`'s `reason: identity`
carries this same split as its log level (see
[log events](../reference/log-events.md), `guard.rejected`); `auth.identity.unknown` is a separate
event for a proven identity the roster doesn't recognize (see the migration step above).

## The roster's role, and logging out

The gate answers who; the roster still answers whether that person may edit, and at what
capability. `resolve` never returns a role, and the guard never asks it for one. The identity
seam and the roster stay two separate systems, so authorization keeps the single source of truth
it has today. A proven identity with no roster row is refused as unknown, logged with the
normalized email; add the row and the very next request succeeds, no restart required.

cairn mints no session under `identity`, so its own logout has nothing to end: it clears its
cookies and redirects to `logoutUrl`, the address `IdentityResolver` declares, which triggers
Access's own [logout endpoint](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/),
`/cdn-cgi/access/logout`. Ending the gate's session is the Access application's own job, and it is
not instant in either direction. That page states the range directly for this user-initiated
path: a logout clears the browser's authorization cookie immediately, and Access stops accepting
previously issued tokens within 20 to 30 seconds, so "about thirty seconds" is the top of that
window. An administrator manually revoking a user's Access token is a separate path whose lockout
is up to a minute: the same page states that user can't sign back in until then. At the origin the exposure is
weaker than either figure: the recipe verifies a signature, an issuer, an audience, and an expiry,
never Access's revocation list, so a token already issued stays cryptographically valid to the
Worker until its own `exp`, whichever revocation path triggered it. Revocation is enforced by
Access being in the request path, which is why every hostname that reaches this Worker has to be
covered by the application, and why the application's session duration is the real admin session
lifetime under `identity`, replacing cairn's own session constant. Set it to hours, not the
maximum. For removing someone who should no
longer edit right now, the roster's own delete is the stronger lever; it takes effect on their
very next request, gate session or not.

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

## Two adjacent seams

A reader replacing sign-in is usually evaluating the whole auth surface, so two neighboring
seams follow.

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
branch, and `connect(env)` returns a live `Backend` when a route needs one. `githubApp(...)` is
the one provider cairn ships, wrapping the GitHub App flow this project defaults to; none ships
with cairn today. A site that stores content somewhere other than GitHub implements
`BackendProvider` against its own store.
