# Replace magic links with Cloudflare Access

Use this when editors already hold accounts in an identity provider behind a Cloudflare Access
application. The guard's `identity` option replaces the whole magic-link path: every editor signs in
through the gate, the guard mints no token and sets no session cookie, and it looks the proven email
up in the roster in `AUTH_DB`. Access decides who reaches `/admin`; the roster decides who may edit.
For a second audience beside magic-link editors, use `references/second-sign-in-group.md` instead.

Contents:

- [Prepare](#prepare)
- [Close the exposures outside Access](#close-the-exposures-outside-access)
- [Write the verifier](#write-the-verifier)
- [Wire it](#wire-it)
- [Resolve a refusal](#resolve-a-refusal)

## Prepare

- The first owner row must already exist in `AUTH_DB`: `bootstrapOwner` runs only on the magic-link
  path, which identity mode never reaches.
- Each roster email must equal the primary address the provider asserts (the guard trims and
  lowercases and does no alias matching).
- The Access application covers `/admin`, everything beneath it, and `/admin/__data.json`. Leave
  `/preview/<token>` uncovered. Enable only provider login methods whose email claim the user cannot
  set. Leave its CORS settings off (they can make `X-Cairn-CSRF` settable cross-origin).
- Note the team domain (`https://<team>.cloudflareaccess.com`), the application's AUD tag (not its
  id), and the logout URL.

## Close the exposures outside Access

The guard makes no hostname check, so any hostname that bypasses Access serves the admin to a token
that verifies. In `wrangler.jsonc`:

```jsonc
"workers_dev": false,
"preview_urls": false
```

Set both explicitly: an omitted `preview_urls` leaves an existing setting on. Also confirm no zone
cache rule matches `/admin` (a cache rule can override the engine's `private, no-store`).

## Write the verifier

Cairn ships no OIDC client. The resolver is site code; nothing in cairn checks its verification.
It must:

- read the `Cf-Access-Jwt-Assertion` header, never the `CF_Authorization` cookie or the
  `Cf-Access-Authenticated-User-Email` header, which a client can forge;
- verify the signature against `<team domain>/cdn-cgi/access/certs`, with the team domain as issuer
  and the AUD tag as audience, before trusting any claim;
- refuse unless `payload.type === 'app'` (excludes the `org` global token);
- refuse a token with no `email` claim (also refuses service tokens);
- return the email (and optionally a display name, used only when the roster name is empty), never a
  role: the guard takes the role from the roster;
- return a named refusal reason: `missing`, `invalid`, `expired`, `no_email` log at warn; `audience`,
  `issuer`, `keys` log at error, since they lock everyone out.

Install `jose` (`npm install jose`) and keep the three values in a config module.

```ts
// src/lib/access-identity.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IdentityResolver } from '@glw907/cairn-cms/sveltekit';

const teamDomain = 'https://example-team.cloudflareaccess.com';
const audTag = '<the application AUD tag>';
const logoutUrl = `${teamDomain}/cdn-cgi/access/logout`;

const JWKS = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));

function reasonFor(err: unknown): string | undefined {
  const { code, claim } = (err ?? {}) as { code?: string; claim?: string };
  if (code === 'ERR_JWT_EXPIRED') return 'expired';
  if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') return claim === 'aud' ? 'audience' : claim === 'iss' ? 'issuer' : 'invalid';
  if (code === 'ERR_JWKS_NO_MATCHING_KEY') return 'invalid';
  if (code?.startsWith('ERR_JWKS_')) return 'keys';
  if (code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' || code === 'ERR_JWT_INVALID' || code === 'ERR_JWS_INVALID') return 'invalid';
  return undefined;
}

export const accessIdentity: IdentityResolver = {
  label: 'Example Org sign-in',
  logoutUrl,
  async resolve(event) {
    const token = event.request.headers.get('cf-access-jwt-assertion');
    if (!token) return { ok: false, reason: 'missing' };
    try {
      const { payload } = await jwtVerify(token, JWKS, { issuer: teamDomain, audience: audTag, algorithms: ['RS256'] });
      if (payload.type !== 'app') return { ok: false, reason: 'invalid' };
      if (typeof payload.email !== 'string' || payload.email === '') return { ok: false, reason: 'no_email' };
      return { ok: true, email: payload.email };
    } catch (err) {
      const reason = reasonFor(err);
      if (reason === undefined) throw err; // the guard logs a throw at error
      return { ok: false, reason };
    }
  },
};
```

`logoutUrl` must be root-relative or https. Cloudflare's "Validate JWTs" Workers sample is the
authority for the verification itself.

## Wire it

Pass the resolver only on the production branch of `src/hooks.server.ts`. Leave the dev-backend
branch as it is, so local development keeps working. The guard still reads `roles` and `access`
from `runtime`.

<!-- snippet-check-skip: the production branch of the hooks file, whose handle and dev branch sit above it -->
```ts
handle = createAuthGuard({ runtime, identity: accessIdentity });
```

Build and deploy; the hooks change and the `workers_dev`/`preview_urls` settings go live together.
After that: the guard awaits `resolve` on every guarded request (no caching), the Access session
duration replaces cairn's 30-day session, sign-out clears cairn cookies and redirects to
`logoutUrl`, and a revocation takes effect only where Access sits in the request path.

Verify on the deployed site: a rostered editor reaches the shell; Workers Logs shows no
`guard.refused` `reason: identity` and no `auth.identity.unknown`; sign-out lands on the logout URL;
an unauthenticated `GET /admin/login` redirects to the team domain; `/admin` on `workers.dev` and
every preview URL gets no Worker response.

## Resolve a refusal

1. Access block page: the request never reached the Worker. Add the user to the Access policy.
2. `auth.identity.unknown`: fix the roster row to carry the record's `email`.
3. `guard.refused` `reason: identity`, read `detail`: `expired`, `invalid`, `no_email` → sign in
   again; `audience` → check the AUD tag; `issuer` or `keys` → check the team domain; `missing` → the
   path is uncovered or the request used another hostname; `error` → the resolver threw, read `error`.
4. A sign-out from a stale tab is refused at `/admin` before logout runs; sign in again.
