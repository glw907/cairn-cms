# Identity seam design (the admin login on an organization's own identity)

> Status: REVISION 3, folded 2026-09-07 from the three-lens spec review and the four-lens plan
> review (records `docs/internal/record/2026-09-07-identity-seam/{spec-review,plan-review}.md`
> and the fold brief `plan-fold-brief.md`). Authored under Geoff's grant
> of the same day ("I'm leaving judgement to you. Consider cairn philosophy and precedent").
> Inputs banked beside the review. The plan follows in the same record directory.

## The gap

The charter promises that a developer can replace the admin auth, cairn "then mints no session
and reads an owner/editor identity through a defined hand-off"
(`docs/internal/what-cairn-is-and-is-not.md:62-66`). No seam implements it. `AuthGuardOptions`
carries `roles`, `access`, and `includeSubDomains`; the guard reads the session cookie and
resolves it against `AUTH_DB` at one write point (`guard.ts:175-195`), and every downstream
consumer reads `locals.cairnEditor` only. `createAuthChannel` builds a second audience's own
magic-link login and admits nothing to `/admin`. So the zero-config default makes the CMS the
organization's identity system for its editors, which holds for a small organization and
rarely for a larger one, and the front door cannot say otherwise (post-freeze note 4 on the
cairn case; the 2026-09-07 charter audit, record 27).

The target Geoff named is the common nonprofit case: an organization already on Google
Workspace or Microsoft 365 wants its editors to sign in with those accounts.

## Decisions

Geoff, 2026-09-07 (brainstorm):

1. **Route: through Cloudflare Access.** Access sits in front of `/admin` with Workspace or
   Entra ID as its identity provider. cairn ships no OIDC client. Google Workspace wires in as
   a generic OIDC IdP; Microsoft Entra ID has Cloudflare's dedicated connector. Zero Trust's
   free plan covers 50 users (the extend page states the cap and that the paid plan lifts it).
2. **Authorization stays in the roster.** The gate proves WHO (an email); the `editor` table
   in `AUTH_DB` still says whether that person is an owner or an editor. The roster screens
   keep their meaning; an identity with no roster row is refused. No group-to-role mapping
   (IdP groups are not reliably in the Access JWT and would be a second authorization source).
3. **One identity path per admin.** A configured resolver turns magic-link off for that site.
4. **Merge gate:** green CI plus the `web-auth-security-reviewer`'s accept plus the docs gates;
   Geoff reads the extend page after the fact.

The conductor, 2026-09-07 (the fold), each on the charter or the ledger:

5. **The generic seam ships in the engine; the Cloudflare Access verifier does not.** The
   charter pre-wrote the seam (`what-cairn-is-and-is-not.md:62-66`). The Access-specific
   verifier fails the ledger's bar: `isuniqueviolation-cloudflare` refused an export with no
   engine-internal consumer on "sites keep duplicating this" grounds, and `verifyTurnstile`'s
   keep rests on an evidenced production bypass, which an Access-JWT hand-roll has none of yet.
   The verifier is therefore a recipe on the extend page, typechecked by `check:snippets`
   against the built package, and `jose` stays out of the engine's dependencies. The ledger
   gains a declined-for-now row that reopens on an evidenced defect in a family site's own
   resolver or on an engine-internal consumer.
6. **No guard-side owner bootstrap.** A config value must not become an admission credential,
   a D1 write does not belong on an ambient GET, and `createAuthGuard` cannot reach
   `auth.bootstrapOwner` in any case (it lives on the routes' config). The first owner is
   seeded out of band, as the scaffold already does (`create-cairn-site`'s bootstrap INSERT,
   or `wrangler d1 execute`), and the doctor's `auth.store` names that remedy.
   `AuthRoutesConfig.bootstrapOwner` is inert under identity mode, since its only call site is
   the 404'd `requestAction`; the first owner must be seeded BEFORE `identity` is enabled.
7. **One configuration point, read through `locals`.** `identity` is set once, on
   `createAuthGuard`; the guard publishes `locals.cairnIdentity` on every admin path it
   handles in identity mode, and the login, confirm, request, and logout handlers read only
   that. Nothing lets a gate run beside a live token-minting login.
8. **No CSRF change.** The shell issues the CSRF cookie on every render
   (`content-routes-shell.ts:224`), so a resolver site is covered as today. The one property
   that changes is rotation on authentication, which has no cairn authentication event to
   bind to under a gate; the security model states that residual.

## The seam

```ts
interface AuthGuardOptions {
  roles?: RolesDeclaration;
  access?: AccessMap;
  includeSubDomains?: boolean;
  identity?: IdentityResolver;   // new, optional; omitted = today's magic-link behavior, byte for byte
}

interface IdentityResolver {
  /** Prove who is making this request, or say why it could not be proven. */
  resolve(event: CairnEvent): Promise<ResolvedIdentity | IdentityRefusal>;  // the structural event every engine seam takes (guard.ts:1-3); the full event because it must read request headers
  /** Where the shell's logout sends the editor; the gate owns the session, cairn only redirects. A root-relative path or an https: URL; validated at construction (below). */
  logoutUrl: string;
  /** The gate's name for the hand-off page and the doctor ("Cloudflare Access"). */
  label?: string;
}

interface ResolvedIdentity {
  ok: true;
  email: string;        // the guard normalizes it (trim, lowercase), the store's invariant
  displayName?: string; // advisory: the roster row's wins; used only when the roster row's is empty, capped at the store's bound; it reaches the commit author, so never trusted over the roster
}

interface IdentityRefusal {
  ok: false;
  /** For the log only, never rendered: 'missing', 'invalid', 'audience', 'issuer', 'expired', 'no_email', 'keys', or a site's own word; every reason is snake_case (events.ts:5-7). */
  reason: string;
}
```

`resolve` returns identity only. Role and capability come from the roster, resolved exactly
as today (`resolveCapability` against `roles`; `auth.role.unknown` on a name the vocabulary
lacks). The resolver never sees `AUTH_DB` and never returns a role, which keeps authorization
in one place and the seam thin. The two thinner shapes the review weighed lose on the ledger:
a site-set `locals.cairnEditor` the guard trusts under a flag moves the trust decision out of
the guard the `audit-sveltekit-createauthguard` row says owns it, and a resolver returning the
whole `Editor` makes the site a second authorization source.

Tiers: `createAuthGuard` is Scaffold API and the new option is additive, so its tier holds.
`IdentityResolver`, `ResolvedIdentity`, and `IdentityRefusal` enter as **Unstable API** (the
shape is not yet committed; one consuming site's adoption promotes them), which is what the
reference README's tier definition says a new shape with no consumer is.

## What the guard does under `identity`

The guard's request order (`security-model.md`, "The guard's request order") is unchanged.
Of the five pieces the `audit-sveltekit-createauthguard` row lists:

1. **Bindings refusal.** `AUTH_DB` stays required (the roster lives there); unchanged.
2. **CSRF authority.** Unchanged (decision 8).
3. **Session resolution: the replaced piece.** Instead of reading the session cookie and
   calling `resolveSession`, the guard calls `identity.resolve(event)`.
   - A refusal renders the registered condition `auth.identity-unresolved` (a plain page naming
     the gate's label, "this request did not arrive through <label>") and logs
     `guard.rejected` with `reason: 'identity'` and the refusal's `reason` in `detail`. No
     redirect to `/admin/login`: a refusal here means the gate was bypassed or misconfigured,
     and the condition's remediation says so.
   - A resolved email with no roster row renders the registered condition
     `auth.identity-unknown` ("ask the site's owner to add <email>"; the renderer escapes the
     email and the site-supplied label, the email is capped at 320 characters, and the email
     shown is the requester's own, so nothing is disclosed) and logs `auth.identity.unknown`
     with `email`; the pair reads across the way `auth.unknown-role` / `auth.role.unknown` does.
     This is the roster doing its job.
   - The guard does not trust the seam it calls: `identity.resolve` runs inside a try/catch (a
     throw is a refusal rendering `auth.identity-unresolved` with `detail: 'error'` and the
     message capped at 300 characters, never a 500), and a `ResolvedIdentity` whose `email` is
     not a string or is empty after normalization is a refusal, not a roster lookup. The log
     level is `warn` for a request-shaped refusal (`missing`, `invalid`, `expired`, `no_email`)
     and `error` for an operator fault (`audience`, `issuer`, `keys`, `error`), since those lock
     out the whole roster. With `identity` set the guard never reads the session cookie and never
     calls `resolveSession`, on any path; pre-existing `session` rows are inert.
   - A resolved email with a roster row builds the same `Editor` the session path builds and
     sets `locals.cairnEditor` and `locals.cairnAccess` exactly as today. The roster is read
     on every request, so a removed editor loses access on the next one, the contract
     `resolveSession`'s inner join gives today.
   - In every case the guard also sets `locals.cairnIdentity = { label, logoutUrl }`, and it
     does so for EVERY admin path, the public ones (`/admin/login`, `/admin/auth/**`) included,
     immediately after the bindings refusal and before the CSRF stage, since the magic-link
     handlers live only on public paths; `identity.resolve` is called only on guarded paths. The
     guard is the only writer of the field, and the value is the snapshot validated at
     construction.
4. **Capability resolution.** Unchanged.
5. **Security headers and the dev-backend refusal.** Unchanged.

Both conditions are registered through the repo's condition mechanism (id, severity, title,
why, remediation, docs anchor, log event), so `check:readiness`, `check:docs`, and
`check:symbols` cover them.

## The magic-link surface under `identity`

The handlers detect identity mode by `locals.cairnIdentity` alone:

- `loginLoad` renders a one-paragraph hand-off page ("This site signs in through <label>")
  with a link to `/admin`, carrying a `data-cairn-identity` marker the doctor reads, minting no
  pending-login nonce and issuing no CSRF token (the page carries no form; a site rendering its
  own login page against `LoginData` may keep drawing a form, and that form is inert because of
  the 404s below).
- `requestAction`, `confirmAction`, and `confirmLoad` return 404, so `/admin/auth/**` serves
  nothing and the hand-off page is the only public admin surface; the 404 is raised before
  `requireDb`, before `request.formData()`, and before any cookie write, so a stray link cannot
  mint a token and the confirm page cannot reflect a `?token=` value into an admin-origin page.
- `logoutAction` skips the session delete (there is none), clears cairn's own cookies if
  present, and redirects to the `logoutUrl` snapshot the guard validated at construction. The
  shell's logout form posts to `/admin?/logout` unchanged. `logoutUrl` validation: a
  root-relative path matching `/^\/(?![\\/])/` after rejecting any value containing a
  backslash, a control character, or whitespace, or an absolute URL whose parsed `protocol` is
  exactly `https:`; anything else throws at `createAuthGuard`, which closes the open-redirect and
  post-construction-mutation readings.

## The doctor

`admin.login-probe` fetches with `redirect: 'manual'`, since the runtime otherwise follows the
gate's 302 and the classifier never sees it. A 301/302/303/307 whose `Location` parses and whose
`host` matches `/^[a-z0-9-]+\.cloudflareaccess\.com$/i` is PASS with the identity label. A 401
or 403 is INFO, consistent with a gate but not proof of one (a WAF block or a broken deploy
reads the same). A 200 carrying the `data-cairn-identity` marker, or a 200 carrying no
`?/request` form, is FAIL, "the origin answers without the gate". A 200 with the form is the
magic-link PASS as today, continuing into the existing POST arm. A second arm reads
`workers_dev` from the wrangler config and, when it is not `false`, probes the `workers.dev`
hostname's `/admin` the same way, failing on a 200: the exposure this design exists to close
is a Worker reachable on a hostname the Access application does not cover. The marker is a
documented contract between the page and the CLI. `auth.store` keeps its owner-row requirement
and names the out-of-band seed and its ordering (seed before enabling `identity`).

## The extend page and the Access recipe

`docs/extend/sign-in-through-your-organization.md`, one page: the assumption stated first
(with the default, the CMS is the editors' identity system; here is how to make it the
organization's); the Access route for a Workspace and an Entra ID organization (the Access
application scoped to `/admin` on the site's hostname, the IdP connection, the AUD tag; the
concepts in prose, Cloudflare's own steps linked, no screenshots); the **migration step**
before enabling the resolver: every roster email must equal the IdP's primary email, because
a mismatch is refused as `unknown` the moment identity mode is on, and the remedy is the
roster screen or `wrangler d1 execute`; the resolver recipe; the roster's role; logout; then
the generic contract for any other gate.

**Which login methods are safe** (a required section, before the recipe). The email claim is
the entire join between the gate and the roster, so the Access application must enable only
methods that prove control of the address they assert (a Workspace or Entra directory, or
Access's own One-time PIN). Enabling a second method widens the floor to the weakest one, since
every enabled method's token carries the same `aud` and verifies identically. Never enable a
social IdP or a generic OIDC connection whose `email` claim the end user can edit on an
application that gates a cairn admin; cairn cannot distinguish a directory-asserted address
from a self-asserted one.

The page also states, as operating instructions: admission is double-maintained by design and
can drift (the gate says who may reach `/admin`, the roster says who may edit); the free plan's
50-user cap counts editors who authenticate through Access, and the paid plan lifts it; seed the
first owner before enabling `identity`; no Cloudflare cache rule may match `/admin`; the Access
application must cover `/admin` exactly, `/admin/__data.json`, and the shell's form-action URLs,
and must not cover `/preview/<token>`; leave the application's CORS settings off; on an ungated
origin `/admin` becomes an unauthenticated endpoint doing an RSA verify per request, and the
site's rate limit is its own remedy; never branch inside `resolve` for local development (a
site's dev build replaces the guard behind its own build-time conditional, the shape the
showcase uses); and the seam's tier (Unstable; promotion on the first production consumer).

The recipe, a fenced `ts` block checked by `check:snippets` for its cairn-facing shape only
(`jose` is not a dependency, so the gate rewrites its imports to untyped stand-ins; the
verification logic is proven by the `web-auth-security-reviewer`'s read, a blocking criterion
on the page's task, and the page says so in one sentence):

- reads the `Cf-Access-Jwt-Assertion` header only (no cookie fallback: the `CF_Authorization`
  cookie is a bearer token replayable until its `exp`, and the header is what Access
  attaches on gated paths);
- verifies with `jose`'s `jwtVerify` against `createRemoteJWKSet` on the team domain's
  `/cdn-cgi/access/certs`, with `issuer`, `audience`, and `algorithms: ['RS256']` pinned;
- accepts only a payload whose `email` is a non-empty string (a service token verifies and
  carries none; it is refused `no-email`);
- checks `payload.type === 'app'`, refusing Access's team-scoped `org` session token whatever
  its audience says; takes the team domain as a bare hostname (Cloudflare's own sample includes
  the scheme, which yields a doubled `https://` and a roster-wide `issuer` lockout) and the AUD
  tag, not the application id, validating both at construction;
- returns `{ ok: false, reason }` per failure class (`missing`, `invalid`, `audience`, `issuer`,
  `expired`, `no_email`, `keys`) mapped from `jose`'s error classes, with `keys` covering a JWKS
  fetch failure so a certs outage never reads as an intrusion; `jwtVerify` with no
  `clockTolerance`; `createRemoteJWKSet` constructed once per resolver with explicit
  `timeoutDuration`, `cooldownDuration`, and `cacheMaxAge`; key selection JWKS-only, a token's own
  `jwk`/`jku`/`x5u` headers never consulted;
- runs on every admin request, since the assertion is the only proof the request passed the
  gate; and states the posture: Access must gate the `/admin` path on the same hostname the
  Worker serves, a `workers.dev` hostname that bypasses the gate must be disabled, and the
  doctor's probe is the check.

The page also carries, bounded to one section each, the two "bring your own" doors the
charter audit found undiscoverable: the email sender (`CairnAdminConfig.auth.send`) and the
backend (`BackendProvider`; `why-cairn.md`'s sentence corrected). They stay in this pass by
Geoff's accepted routing; the pass-sizing rule is honored by the bound.

## Documentation and surface

- `docs/reference/sveltekit.md`: `AuthGuardOptions.identity` with its own tier note (Unstable
  inside the frozen Scaffold-tier interface), `IdentityResolver`, `ResolvedIdentity`,
  `IdentityRefusal`, `locals.cairnIdentity` (both `locals` declarations, `src/lib/ambient.ts`
  and `src/lib/sveltekit/types.ts`, kept in step; the guard is the only writer);
  `docs/extend/security-model.md`: "Identity from a gate" under the session material, plus a
  sweep in which every statement the spec review's table lists is corrected or scoped to the
  magic-link path (the replaced piece, the rotation residual with its shared-browser shape, the
  doctor arms, the never-reads-the-session-cookie property, `hasSession`'s meaning under
  identity, and the effective session lifetime being the Access application's operator-set
  duration, advised short);
  `docs/reference/doctor.md`: the probe's second arm; `docs/reference/log-events.md`: the
  `identity` reason on `guard.rejected` and the new `auth.identity.unknown` row;
  `docs/extend/README.md`'s auth list; `docs/why-cairn.md`'s identity paragraph (the
  assumption first, then "or, behind Cloudflare Access, sign in with your organization's
  Google or Microsoft accounts"); post-freeze note 4 on the cairn
  case closed by pointing here; `docs/internal/engine-rulings.md`: the seam's accept row and
  the Access verifier's declined-for-now row.
- `check:surface -- --update` with the regenerated snapshot; `check:snippets`;
  `check:reference:signatures`; `check:readiness`; the six CI-only gates by name.
- `CHANGELOG.md` under `## Unreleased`: new surface, additive, no `Consumers must:` line, and
  therefore no `docs/extend/migration-notes.md` entry (that page records only releases that
  stated consumer action); `check:surface` also records `LoginData`'s discriminated addition.

## Proof

- Integration (the workerd project against a real miniflare `AUTH_DB`): the guard's identity
  branch with a fixture resolver (resolved and rostered; resolved and unknown; each refusal
  reason; live revocation after a roster delete; `locals.cairnIdentity` set; the roster's
  role and capability resolved as today; a `logoutUrl` rejected at construction).
- Unit: the routes' identity-mode branches (the hand-off page with its marker, the two 404s,
  the logout redirect); the doctor probe's three arms against stubbed responses; the
  conditions registered and reachable by the readiness gate.
- The showcase does not adopt `identity` and does not run behind Access: it stays the
  zero-config exemplar. The recipe is proven by `check:snippets` (it typechecks against the
  built package) and by the security reviewer's read; a runtime test of the recipe is a
  site's own.
- `web-auth-security-reviewer` at the pass gate (the merge gate).

## Out of scope

A native OIDC client; an engine-shipped Access verifier (declined for now, above); group-to-
role mapping; service tokens; Cloudflare API Shield's zone-level JWT validation (an Enterprise
feature unrelated to in-Worker verification, named once so a reader does not conflate them);
the `ctx.access` Worker-level identity runtime (documented for account-level Access, not
path-scoped applications); any change to `createAuthChannel`; the showcase adopting Access;
reconciling the Access policy with the roster (two admission lists by design: the gate says
who may reach the door, the roster says who may edit).

## Risks

- **Lockout on enable.** Roster emails that are not the IdP's primary are refused `unknown`
  the moment identity mode is on. Named in the extend page's migration step and in the
  condition's remediation; recoverable through the roster screen before enabling or
  `wrangler d1 execute` after.
- **An origin reachable without the gate** serves refusals, not content (every request is
  `missing`), so the failure is closed; the doctor's inverted probe detects the exposure.
- **Revocation lag.** Access propagates a revoked session within about thirty seconds; the
  roster's live read is the stronger lever for removing an editor, stated on the page.
- **The recipe is site code, and its verification logic is not machine-verified.** The
  declined ledger row records that assurance level; a site that edits it badly owns the
  defect, and the row reopens on a second consumer hand-rolling the verifier, an
  engine-internal consumer, or an evidenced defect in a family site's own resolver.
- **Console drift.** Cloudflare can move the Access console; the page carries concepts and
  links Cloudflare's steps.
