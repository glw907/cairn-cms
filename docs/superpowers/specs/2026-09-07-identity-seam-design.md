# Identity seam design (the admin login on an organization's own identity)

> Status: DRAFT for adversarial review, 2026-09-07. Authored under Geoff's grant of the same day
> ("I'm leaving judgement to you. Consider cairn philosophy and precedent"). Inputs banked at
> `docs/internal/record/2026-09-07-identity-seam/` (engine path, Cloudflare Access verification,
> ledger precedent). The review's fold and the plan follow in the same record directory.

## The gap

The charter promises that a developer can replace the admin auth, cairn "then mints no session
and reads an owner/editor identity through a defined hand-off"
(`docs/internal/what-cairn-is-and-is-not.md:62-66`). No seam implements it. `AuthGuardOptions`
carries `roles`, `access`, and `includeSubDomains`; the guard reads the session cookie and
resolves it against `AUTH_DB` at one write point (`guard.ts:175-195`) and every downstream
consumer reads `locals.cairnEditor` only. `createAuthChannel` builds a second audience's own
magic-link login and admits nothing to `/admin`. So today the zero-config default makes the CMS
the organization's identity system for its editors, which holds for a small organization and
rarely for a larger one, and the front door cannot say otherwise (post-freeze note 4 on the
cairn case; the 2026-09-07 charter audit, record 27).

The target Geoff named is the common nonprofit case: an organization already on Google
Workspace or Microsoft 365 wants its editors to sign in with those accounts.

## Decisions (Geoff, 2026-09-07, brainstorm)

1. **Route: through Cloudflare Access.** Access sits in front of `/admin` with Workspace or
   Entra ID as its identity provider (free to 50 users on Zero Trust's free plan, re-verified
   at plan time). cairn ships no OIDC client. Google Workspace wires in as a generic OIDC IdP;
   Microsoft Entra ID has Cloudflare's dedicated connector.
2. **Authorization stays in the roster.** Access proves WHO (an email); the `editor` table in
   `AUTH_DB` still says whether that person is an owner or an editor. The roster screens keep
   their meaning; an identity with no roster row is refused. No new concept, no group-to-role
   mapping (IdP groups are not reliably in the Access JWT, and group-based roles would be a
   second authorization source; out of scope).
3. **One identity path per admin.** A configured resolver turns magic-link off for that site:
   the login page and its actions stop serving, and logout hands off to the gate.
4. **Merge gate:** green CI plus the `web-auth-security-reviewer`'s accept plus the docs gates;
   Geoff reads the extend page after the fact.

## The seam and the ruling on shipping an Access resolver

Two pieces, at two altitudes, each argued from precedent.

**The seam is generic and belongs in the engine.** `createAuthGuard` gains one optional
option, `identity`, the "defined hand-off" the charter already describes. The ledger's
`audit-sveltekit-createauthguard` row lists what the guard bundles (session resolution, CSRF
authority, capability resolution, security headers, the dev-backend refusal); the seam replaces
exactly one of the five, session resolution, and the design below says so piece by piece. The
`audit-sveltekit-requiresession` row says the session cookie is engine-owned and D1-resolved
"so a site cannot reach it correctly on its own", which is why this is a guard option and never
a `requireSession` override.

**The Cloudflare Access resolver also ships, on `/cloudflare`, and the bar it clears is the
Turnstile one, not the "sites keep duplicating this" one.** The `isuniqueviolation-cloudflare`
ruling rejected duplication alone as grounds for an engine helper; `verifyTurnstile` was
admitted because a hand-rolled verifier is a security defect waiting to happen. JWT
verification is the second kind: a site that hand-rolls it and skips the audience check accepts
any application's token from the same Access team, one that skips `exp` accepts a revoked
session forever, and one that pins keys breaks silently on Cloudflare's rotation. Cloudflare's
own Workers example uses `jose` (`jwtVerify` with `createRemoteJWKSet`), which enforces
`exp`/`nbf` once `issuer` and `audience` are passed and handles JWKS caching and rotation.
cairn is the opinionated Cloudflare stack, `/cloudflare` is where its Cloudflare-specific
helpers already live, and the resolver is about sixty lines over `jose`. The engine takes
`jose` as a runtime dependency (ESM, Workers-native, the library Cloudflare documents). The
ruling is recorded in `engine-rulings.md` with these reasons and reopens on a demonstrated
`jose` incompatibility with the supported toolchain.

## The `identity` option

```ts
interface AuthGuardOptions {
  roles?: RolesDeclaration;
  access?: AccessMap;
  includeSubDomains?: boolean;
  identity?: IdentityResolver;   // new, optional; omitted = today's magic-link behavior, byte for byte
}

interface IdentityResolver {
  /** Prove who is making this request, or null when the request carries no admissible identity. */
  resolve(event: RequestEvent): Promise<ResolvedIdentity | null>;
  /** Where the shell's logout sends the editor; the gate owns the session, so cairn only redirects. */
  logoutUrl: string;
  /** The one-line name the login page and the doctor show ("Cloudflare Access"). */
  label: string;
}

interface ResolvedIdentity {
  email: string;        // normalized by the guard (trim, lowercase), the store's invariant
  displayName?: string; // falls back to the roster row's, then to the email
}
```

`resolve` returns identity only. Role and capability come from the roster, resolved exactly as
today (`resolveCapability` against `roles`, `auth.role.unknown` on a name the vocabulary lacks).
The resolver never sees `AUTH_DB` and never returns a role; that keeps authorization in one
place and the seam thin. A site with an exotic gate writes `resolve` itself (a header, a
mutual-TLS certificate, a reverse proxy's assertion); the engine's Access resolver is one
implementation of the same interface.

## What the guard does under `identity`

The guard's request order (`security-model.md`, "The guard's request order") is unchanged
except at the session stage; each of the five bundled pieces:

1. **Bindings refusal.** `AUTH_DB` stays required: the roster lives there and the last-owner
   guards depend on it. The `bindings` refusal is unchanged.
2. **CSRF authority.** Unchanged in mechanism (the header witness decides when sent; the cookie
   double-submit otherwise). The CSRF cookie is issued today by the login and confirm loads,
   which a resolver site never visits, so under `identity` the guard issues it on the first
   admin request that lacks one (the same `issueCsrf` the loads call), before the shell reads
   it. The `hasSession` presence read in the `guard.rejected` record keeps its meaning by
   reading "an identity resolved" instead of the cookie's presence.
3. **Session resolution (the replaced piece).** Instead of reading the session cookie and
   calling `resolveSession`, the guard calls `identity.resolve(event)`. `null` is a 401-shaped
   refusal, never a redirect to `/admin/login` (there is no login to send them to; the gate
   handles unauthenticated requests before cairn sees them, and a `null` here means the gate
   was bypassed or misconfigured): the guard responds with the plain refusal page naming the
   gate's `label`, and logs `guard.rejected` with `reason: 'identity'`, `detail:
   'unresolved'`. A resolved email with no roster row is refused the same way with `detail:
   'unknown'`, rendering "ask the site's owner to add you" with the email shown, and logs
   `auth.identity.unknown` (`email`); this is the roster doing its job. A resolved email with a
   roster row builds the same `Editor` the session path builds (`email`, `displayName`,
   `role`, `capability`) and sets `locals.cairnEditor` and `locals.cairnAccess` exactly as
   today. Live revocation is preserved: the roster is read on every request, so a removed
   editor loses access on the next one, the same contract `resolveSession`'s inner join gives
   today.
4. **Capability resolution.** Unchanged.
5. **Security headers and the dev-backend refusal.** Unchanged.

**Owner bootstrap.** `bootstrapOwner` today fires only inside the magic-link request action.
Under `identity`, the guard honors the same `auth.bootstrapOwner` config: when the roster is
empty and the resolved email equals the configured owner's, the guard inserts the owner row
through the existing `insertOwnerIfEmpty` and logs `editor.bootstrapped`, then proceeds. Any
other resolved email against an empty roster is refused as `unknown`. So a new site's first
sign-in through Access works with the config it already has, and nothing else can seed the
roster.

**The magic-link surface under `identity`.** `loginLoad` renders a one-paragraph page ("This
site signs in through <label>") with a link to `/admin`, and `requestAction` and `confirmAction`
return 404, so a stray link cannot mint a token. `logoutAction` skips the session delete (there
is none), clears cairn's own cookies if present, and redirects to `identity.logoutUrl` (for
Access, `/cdn-cgi/access/logout`, which Cloudflare documents as the sign-out URL; revocation
propagates within about thirty seconds). The shell's logout form posts to `/admin?/logout`
unchanged.

## The Cloudflare Access resolver

```ts
import { cloudflareAccess } from '@glw907/cairn-cms/cloudflare';

export const handle = sequence(
  createAuthGuard({ identity: cloudflareAccess({ teamDomain: 'example.cloudflareaccess.com', aud: '<application AUD tag>' }) })
);
```

`cloudflareAccess(config)` returns an `IdentityResolver` whose `resolve` reads the
`Cf-Access-Jwt-Assertion` header (falling back to the `CF_Authorization` cookie), verifies it
with `jose`'s `jwtVerify` against `createRemoteJWKSet(new URL('/cdn-cgi/access/certs',
'https://' + teamDomain))` with `issuer: 'https://' + teamDomain`, `audience: aud`, and
`algorithms: ['RS256']`, and returns `{ email: payload.email }` or `null` on any failure
(missing header, bad signature, wrong audience, expired). It never throws on a bad token; it
throws only on a misconfiguration it can detect at construction (an empty `teamDomain` or
`aud`). `logoutUrl` is `/cdn-cgi/access/logout`; `label` is "Cloudflare Access". The JWKS set
is created once per resolver instance, so `jose`'s cache and rotation handling apply across
requests within an isolate. Verification runs on every admin request: the Access JWT is the
only proof that the request passed the gate, since an origin reachable without Access would
otherwise serve `/admin` open.

Posture, stated as a doc comment the way `dev-backend-flag-refusal` does: Access must gate
the `/admin` path on the same hostname the Worker serves (a self-hosted application with a
path); Access attaches the assertion only on gated paths, so public routes never carry it,
and the resolver is only consulted on `/admin/**` because the guard only runs there. Service
tokens (machine identity) are out of scope; a request carrying one has no `email` claim and is
refused as `unresolved`.

## Doctor and logs

`admin.login-probe` and `auth.store` assume the magic-link stack. Under `identity` the login
probe expects the one-paragraph hand-off page instead of the form, and `auth.store` keeps its
owner-row requirement (the bootstrap satisfies it after the first sign-in; before that the
check names `bootstrapOwner` as the remedy). One new event, `auth.identity.unknown`, joins the
vocabulary; `guard.rejected` gains the `identity` reason. Both rows land in
`docs/reference/log-events.md` in the same pass.

## The two doors that ride along

The 2026-09-07 charter audit found two seams that exist and are undiscoverable, and both are
"bring your own X" doors that belong on the same extend page family as this one:

- **The email sender.** `CairnAdminConfig.auth.send` is Extension tier and no extend page
  mentions it. The extend page gains its section (a site off Cloudflare Email Sending supplies
  `send`).
- **The backend.** `BackendProvider` is Extension tier and swappable at the type level, while
  `why-cairn.md` says no swap exists. The type is the promise: `why-cairn.md`'s sentence is
  corrected, and the extend page names the door without teaching a second backend (none exists
  to teach).

## Documentation and surface

- A new extend page, `docs/extend/sign-in-through-your-organization.md`: the Access route
  step by step for a Workspace and an Entra ID organization (the Access application scoped to
  `/admin`, the IdP connection, the AUD tag, the resolver in `hooks.server.ts`, the roster's
  role in authorization, the first-owner bootstrap, logout), then the generic `identity`
  contract for any other gate, then the two doors above.
- `docs/reference/sveltekit.md`: `AuthGuardOptions.identity`, `IdentityResolver`,
  `ResolvedIdentity`; `docs/reference/cloudflare.md`: `cloudflareAccess`;
  `docs/extend/security-model.md`: a section "Identity from a gate" under the session
  material, stating which of the guard's five pieces change; `docs/extend/README.md`'s auth
  list; `docs/why-cairn.md`'s identity paragraph (the assumption stated, then "or sign in
  through your organization"); post-freeze note 4 on the cairn case closed by pointing here.
- `check:surface -- --update` with the regenerated snapshot; `check:snippets` over the new
  fenced blocks; `check:reference:signatures`; the six CI-only gates by name.
- `CHANGELOG.md` under `## Unreleased`: new surface, additive, no `Consumers must:`; the
  migration note says a site with no `identity` option sees no change.
- Stability: `createAuthGuard` is Scaffold API; an optional option is additive and keeps the
  tier. `cloudflareAccess` and the two interfaces enter as Extension API.

## Proof

- Unit: the Access resolver against a fixture RSA key pair and a stubbed JWKS fetch (valid
  token, wrong audience, wrong issuer, expired, bad signature, missing header, cookie
  fallback, `null` never throws); the guard's `identity` branch against a miniflare `AUTH_DB`
  in the integration project (resolved and rostered, resolved and unknown, unresolved, the
  owner bootstrap on an empty roster, live revocation after a roster delete, the CSRF cookie
  issued on first request, `/admin/login` and the two actions under `identity`, logout's
  redirect).
- The showcase does not run behind Access and does not adopt `identity`: it stays the
  zero-config exemplar, and its e2e build never mounts the guard (the dev handle mints the
  owner). The proof of the guard's branch is the workerd integration suite above, which is
  the engine's real guard against a real D1.
- `web-auth-security-reviewer` at the pass gate (the merge gate).

## Out of scope

A native OIDC client in cairn; group-to-role mapping from the IdP; service tokens; Cloudflare
API Shield's zone-level JWT validation (an Enterprise feature unrelated to in-Worker
verification, named once so a reader does not conflate them); the `ctx.access` Worker-level
identity runtime (documented for account-level Access, not path-scoped applications); any
change to `createAuthChannel`; the showcase adopting Access.

## Risks

- `jose` as a new runtime dependency: pinned by the supported-toolchain policy; the resolver is
  the only importer, so a swap is one file.
- A site that sets `identity` but leaves Access off its origin serves `/admin` to anyone who
  can forge nothing (every request is refused as `unresolved`), so the failure mode is closed,
  not open; the doctor's login probe names it.
- The bootstrap path is the one write the guard performs; it is gated on an empty roster AND
  the configured owner email, and logs, so it cannot seed a roster twice.
- The extend page teaches an Access console flow that Cloudflare can move; the page carries
  the concepts (application, path, IdP, AUD) and links Cloudflare's own steps rather than
  copying screenshots.
