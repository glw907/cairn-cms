# Identity seam design (the admin login on an organization's own identity)

> Status: REVISION 2, folded 2026-09-07 from the three-lens adversarial review (security, charter
> and precedent, grounding and feasibility; record
> `docs/internal/record/2026-09-07-identity-seam/spec-review.md`). Authored under Geoff's grant
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
  resolve(event: RequestEvent): Promise<ResolvedIdentity | IdentityRefusal>;
  /** Where the shell's logout sends the editor; the gate owns the session, cairn only redirects. Same-origin path or absolute URL; validated at construction. */
  logoutUrl: string;
  /** The gate's name for the hand-off page and the doctor ("Cloudflare Access"). */
  label?: string;
}

interface ResolvedIdentity {
  ok: true;
  email: string;        // the guard normalizes it (trim, lowercase), the store's invariant
  displayName?: string; // falls back to the roster row's, then to the email
}

interface IdentityRefusal {
  ok: false;
  /** For the log only, never rendered: 'missing', 'invalid', 'audience', 'expired', 'no-email', or a site's own word. */
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
   - A refusal renders the registered condition `identity.unresolved` (a plain page naming
     the gate's label, "this request did not arrive through <label>") and logs
     `guard.rejected` with `reason: 'identity'` and the refusal's `reason` in `detail`. No
     redirect to `/admin/login`: a refusal here means the gate was bypassed or misconfigured,
     and the condition's remediation says so.
   - A resolved email with no roster row renders the registered condition
     `identity.unknown` ("ask the site's owner to add <email>"; the renderer escapes it, and
     the email shown is the requester's own, so nothing is disclosed) and logs
     `auth.identity.unknown` with `email`. This is the roster doing its job.
   - A resolved email with a roster row builds the same `Editor` the session path builds and
     sets `locals.cairnEditor` and `locals.cairnAccess` exactly as today. The roster is read
     on every request, so a removed editor loses access on the next one, the contract
     `resolveSession`'s inner join gives today.
   - In every case the guard also sets `locals.cairnIdentity = { label, logoutUrl }`, the
     signal the routes read.
4. **Capability resolution.** Unchanged.
5. **Security headers and the dev-backend refusal.** Unchanged.

Both conditions are registered through the repo's condition mechanism (id, severity, title,
why, remediation, docs anchor, log event), so `check:readiness`, `check:docs`, and
`check:symbols` cover them.

## The magic-link surface under `identity`

The handlers detect identity mode by `locals.cairnIdentity` alone:

- `loginLoad` renders a one-paragraph hand-off page ("This site signs in through <label>")
  with a link to `/admin`, carrying a `data-cairn-identity` marker the doctor reads.
- `requestAction` and `confirmAction` return 404, so a stray link cannot mint a token.
- `logoutAction` skips the session delete (there is none), clears cairn's own cookies if
  present, and redirects to `identity.logoutUrl`. The shell's logout form posts to
  `/admin?/logout` unchanged. `logoutUrl` is validated at guard construction as a same-origin
  path or an absolute `https:` URL, closing the open-redirect reading.

## The doctor

`admin.login-probe` today asserts an unauthenticated GET of `/admin/login` returns 200 with
the magic-link form. Under a correctly placed gate that request is redirected by Access
before cairn sees it, so the probe gains a second arm: a redirect to the gate (a 302 whose
location is the team's `cloudflareaccess.com` domain, or any 401/403) is PASS with the
identity label; a 200 carrying the `data-cairn-identity` marker is FAIL, "the origin answers
without the gate" (the exposure the whole design exists to close); a 200 with the form is
the magic-link PASS as today. The probe needs no site config to know the mode; it reads the
page. `auth.store` keeps its owner-row requirement and names the out-of-band seed.

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

The recipe, a fenced `ts` block `check:snippets` typechecks against the built package
(`jose` declared in the block per the snippet gate's convention):

- reads the `Cf-Access-Jwt-Assertion` header only (no cookie fallback: the `CF_Authorization`
  cookie is a bearer token replayable until its `exp`, and the header is what Access
  attaches on gated paths);
- verifies with `jose`'s `jwtVerify` against `createRemoteJWKSet` on the team domain's
  `/cdn-cgi/access/certs`, with `issuer`, `audience`, and `algorithms: ['RS256']` pinned;
- accepts only a payload whose `email` is a non-empty string (a service token verifies and
  carries none; it is refused `no-email`);
- returns `{ ok: false, reason }` per failure class (`missing`, `invalid`, `audience`,
  `expired`, `no-email`) so the log distinguishes a mistyped AUD from a stranger;
- runs on every admin request, since the assertion is the only proof the request passed the
  gate; and states the posture: Access must gate the `/admin` path on the same hostname the
  Worker serves, a `workers.dev` hostname that bypasses the gate must be disabled, and the
  doctor's probe is the check.

The page also carries, bounded to one section each, the two "bring your own" doors the
charter audit found undiscoverable: the email sender (`CairnAdminConfig.auth.send`) and the
backend (`BackendProvider`; `why-cairn.md`'s sentence corrected). They stay in this pass by
Geoff's accepted routing; the pass-sizing rule is honored by the bound.

## Documentation and surface

- `docs/reference/sveltekit.md`: `AuthGuardOptions.identity`, `IdentityResolver`,
  `ResolvedIdentity`, `IdentityRefusal`, `locals.cairnIdentity` (with the ambient
  declaration on `./ambient`); `docs/extend/security-model.md`: "Identity from a gate" under
  the session material, naming the replaced piece, the rotation residual, and the doctor arm;
  `docs/reference/doctor.md`: the probe's second arm; `docs/reference/log-events.md`: the
  `identity` reason on `guard.rejected` and the new `auth.identity.unknown` row;
  `docs/extend/README.md`'s auth list; `docs/why-cairn.md`'s identity paragraph (the
  assumption, then "or sign in through your organization"); post-freeze note 4 on the cairn
  case closed by pointing here; `docs/internal/engine-rulings.md`: the seam's accept row and
  the Access verifier's declined-for-now row.
- `check:surface -- --update` with the regenerated snapshot; `check:snippets`;
  `check:reference:signatures`; `check:readiness`; the six CI-only gates by name.
- `CHANGELOG.md` under `## Unreleased`: new surface, additive, no `Consumers must:`; the
  migration note says a site with no `identity` option sees no change.

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
- **The recipe is site code.** A site that edits it badly owns the defect; the reopen trigger
  on the declined row is exactly that evidence, and the security reviewer reads the recipe as
  shipped.
- **Console drift.** Cloudflare can move the Access console; the page carries concepts and
  links Cloudflare's steps.
