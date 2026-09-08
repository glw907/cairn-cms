# Identity-seam spec review (2026-09-07, three Opus lenses, fresh context each)

Security (the web-auth-security-reviewer agent), charter and precedent, grounding and feasibility, on the spec at its first draft (`4d3beb97`). Folded into the spec the same night. Write-once.

---


Object: `docs/superpowers/specs/2026-09-07-identity-seam-design.md` (DRAFT, 2026-09-07).
Reviewer posture: skeptical, read-only. Severity vocabulary: **blocking for the spec** (the spec
cannot be implemented safely or coherently as written), **should-fix** (implementable, but the
design leaves an exploitable or operationally dangerous gap), **note** (residual worth stating).

All file paths absolute under `/var/home/glw907/Projects/cairn-cms/`.

---

## Blocking for the spec

### B1. The doctor check the spec relies on is inverted: as specified it passes only when Access is NOT in front

**Mechanism.** The spec's Risks section (spec:245-247) rests the whole "Access left off the origin"
failure mode on one control: *"the doctor's login probe names it."* The Doctor section (spec:178-180)
says: *"Under `identity` the login probe expects the one-paragraph hand-off page instead of the
form."*

`admin.login-probe` is an **unauthenticated GET from outside the site**
(`src/lib/doctor/check-probe.ts:45-48`):

```ts
const res = await ctx.fetch(String(new URL('/admin/login', origin)));
if (res.status !== 200) return fail(`GET /admin/login returned ${res.status}, expected 200`);
```

When Access is correctly gating `example.com/admin`, that request never reaches the Worker: Access
answers with a 302 to `<team>.cloudflareaccess.com/cdn-cgi/access/login/...`. The probe therefore
**fails on a correctly configured site**. It returns 200 with the hand-off page in exactly one case,
the request reached the Worker, which is the misconfiguration the check exists to detect. The
proposed check is a green light for the failure mode and a red light for the correct state.

The second half of the probe (`check-probe.ts:95-144`) POSTs `/admin/login?/request` and expects
the serialized `sent` envelope. Under `identity` that action 404s (spec:139-140), so the second half
fails unconditionally too.

**Also unaddressed:** the spec's Risks bullet models the failure as "Access off the origin," which
understates it. The real shape (access-research.md:126-139, 266-271) is *Access on for one
hostname/path while the same Worker stays reachable another way*: the `*.workers.dev` subdomain, a
second Custom Domain, a preview alias, or a broader Access rule removed so a narrower one silently
stops applying. On that hostname `/admin` is served by the Worker with no Access in the path, so
neither Access policy nor Access revocation applies (see B3), and the only remaining control is the
JWT check, which a holder of any unexpired token for that AUD passes.

**Exact spec text to change.** Replace the Doctor paragraph and the Risks bullet with:

> Under `identity`, `admin.login-probe` inverts. The probe is an unauthenticated fetch from outside
> the site, so on a correctly gated deployment it must NOT be served by the Worker: the check passes
> when `GET <PUBLIC_ORIGIN>/admin` answers 302 to `https://<teamDomain>/cdn-cgi/access/...` or 403
> from Access, and FAILS when it answers 200 with cairn's own hand-off page, which proves the
> request reached the origin with no gate in front. The failure message names the condition
> `edge.identity-gate-bypassed` and its remedy (scope the Access application to the admin path on
> this hostname). A second arm reads the wrangler config: when `workers_dev` is not `false`, probe
> `https://<name>.<subdomain>.workers.dev/admin` the same way and fail on a 200, since a Worker
> reachable on a hostname the Access application does not cover serves `/admin` to anyone holding an
> unexpired token for the AUD. `auth.store` keeps its owner-row requirement unchanged.

Add to Proof: a doctor unit test asserting the probe FAILS on a 200 hand-off page and PASSES on a
302 to the team domain.

---

### B2. `identity` is configured on `createAuthGuard` while the magic-link shutdown lives in the auth routes; the spec names no single source of truth, so the two can disagree

**Mechanism.** The option is added to `AuthGuardOptions` (spec:71-76), consumed by
`createAuthGuard` in `src/lib/sveltekit/guard.ts:73`, which a site mounts in `hooks.server.ts`.
The magic-link shutdown (spec:138-144) changes `loginLoad`, `requestAction`, `confirmAction` and
`logoutAction`, which live in `src/lib/sveltekit/auth-routes.ts:145-436`, built by
`createCairnAdminInternal` at `src/lib/sveltekit/cairn-admin.ts:107` from `CairnAdminConfig.auth`
(`cairn-admin.ts:34-62`). These are two independently constructed objects wired at two different
call sites in two different files. `CairnAdminConfig` has no `identity` member, and the guard has
no reference to the admin routes.

The spec never says how the routes learn that `identity` is set. Every implementation of the spec
as written either (a) duplicates the config in both places, so a site that sets one and not the
other runs an Access gate **and** a live magic-link request/confirm/logout surface, or (b) silently
drops the 404s.

Under (a) the magic-link door does not grant admin access, because the guard no longer reads the
session cookie, but the site still: mints magic-link tokens and sends email to any roster address a
POST names (`auth-routes.ts:216-236`), keeps an unauthenticated email-send trigger behind Access's
own policy only, writes session rows nothing ever reads, and runs `bootstrapOwner` from a second
place (`auth-routes.ts:178-181`) with different preconditions from the guard's own bootstrap
(spec:130-136). Two bootstrap paths against one `insertOwnerIfEmpty` is precisely the sort of split
the `dev-backend-flag-refusal` ruling's "read-from-the-source" rule exists to prevent.

**Exact spec text to add**, under "What the guard does under `identity`":

> One configuration point drives both halves. The guard is the only place `identity` is declared,
> and on EVERY admin path (the public ones included, before the CSRF stage) it publishes the gate's
> presence onto the request: `event.locals.cairnIdentity = { label, logoutUrl }`, typed in
> `src/lib/ambient.ts` and `src/lib/sveltekit/types.ts` beside `cairnEditor`, internal and never
> serialized to a page payload. `loginLoad`, `requestAction`, `confirmLoad`, `confirmAction`, and
> `logoutAction` read `locals.cairnIdentity` and take their `identity` behavior from it; none of
> them takes its own copy of the option. A site that mounts `createAuthRoutes` directly rather than
> through `createCairnAdmin` gets the same behavior for the same reason. `bootstrapOwner` fires from
> the guard when `locals.cairnIdentity` is set and from `requestAction` when it is not, never both.

Add to Proof: an integration case asserting that with `identity` set, `POST /admin/login?/request`
404s and no `auth.token.minted` record is emitted, mounted through `createCairnAdmin` with no
identity-aware admin config.

---

### B3. The `CF_Authorization` cookie fallback turns a revocable gate into a bearer token valid to `exp`, and header-vs-cookie precedence is unspecified

**Mechanism.** spec:156-158: the resolver *"reads the `Cf-Access-Jwt-Assertion` header (falling back
to the `CF_Authorization` cookie)."*

Two problems.

*Precedence is undefined.* "Falling back" does not say whether a **present but invalid** header
falls through to the cookie. An implementation that tries the header, catches, then tries the cookie
accepts a request whose header failed verification, which is the wrong shape for a security check
and diverges from the guard's own established idiom for exactly this decision: the CSRF header
witness "decides outright when it was SENT at all, matching or not" (`guard.ts:136-144`,
`guard.ts:146-154`).

*The fallback changes the trust model.* Verification in the Worker checks signature, `iss`, `aud`,
`exp`, `nbf` and nothing else. Access session revocation (an offboarded editor, a
`/cdn-cgi/access/logout`, a policy change) is enforced by Access's edge, not carried in the token;
access-research.md:148-154 records the 20-30 s propagation as an *edge* property. So a token that
Access has revoked still verifies in cairn for the remainder of its `exp` window, which is the
Access application's session duration (default 24 h, configurable up to a month). The header can
only arrive on a request Access actually proxied, so a header-only resolver inherits Access's
revocation. The cookie can be replayed by anyone holding it, on any hostname that reaches the same
Worker (see B1's ungated-hostname case) and by any client that sets the cookie by hand. The compound
attack: an editor whose IdP account is disabled but whose roster row survives (the natural
offboarding order, since offboarding happens at the IdP) replays the cookie value they still hold
against the ungated hostname and keeps full editor capability for the rest of the token's life.

The spec's Risks bullet (spec:245-247) claims the failure mode is "closed, not open" because a
forger has nothing to forge. That is true only for a party who never held a valid token. It is false
for a revoked holder, which is the population the gate exists to exclude.

**Exact spec text to change.** Replace the resolver's source sentence with:

> `resolve` reads the `Cf-Access-Jwt-Assertion` header only. The header is injected by Access on a
> request it proxied and cannot be set by a browser cross-origin; the `CF_Authorization` cookie is a
> bearer value a client can replay on any hostname that reaches the same Worker, which is exactly the
> misconfiguration this resolver must fail on rather than paper over. When the header is absent the
> answer is `unresolved`; the cookie is never consulted. State the residual plainly in the extend
> page and in `security-model.md`: cairn's verification checks signature, issuer, audience and
> expiry, never Access's revocation list, so an Access session that has been revoked stays
> cryptographically valid to the origin until `exp`. Revocation is enforced by Access being in the
> request path, which is why every hostname that reaches this Worker must be covered by the
> application and why the application's session duration is the admin's real session lifetime. Set
> it to hours, not the maximum.

If the cookie fallback is kept for a stated reason, the spec must instead say: the header, when
present at all, decides outright, matching or not, and the cookie is consulted only when no header
was sent; and the residual paragraph above still has to land.

---

### B4. The resolver returns `payload.email` with no type, emptiness, or token-type check, so a service token or an org token becomes an identity (or a 500)

**Mechanism.** spec:159-160: *"returns `{ email: payload.email }` or `null` on any failure."*
spec:172-174 asserts that a service-token request *"has no `email` claim and is refused as
`unresolved`"*, but nothing in the described code produces that refusal. `jwtVerify` succeeds on a
service-token application token (it is signed by the same keys, carries the same `aud` and `iss`);
its `sub` is the empty string and it carries `common_name` instead of an email
(access-research.md:41-45, 140-146). The resolver then returns `{ email: undefined }`, which:

- typechecks as `ResolvedIdentity` only because `payload` is `JWTPayload` (index signature
  `unknown`) and something casts;
- reaches the guard's normalization step (spec:88, "normalized by the guard (trim, lowercase)"),
  where `undefined.trim()` throws inside `handle` and SvelteKit answers a raw 500 rather than the
  spec's refusal page;
- or, if the implementation is defensive with `?? ''`, performs `findEditor(db, '')` against
  `src/lib/auth/store.ts:52-58` and shows the unknown-identity page for the empty string.

The org/global session token is the second case. Access issues two distinct `CF_Authorization`
values, an application token and a team-scoped global session token with `type: 'org'`
(access-research.md:12-17, 41-45). Audience pinning is the only thing separating them, and the spec
relies on it implicitly without ever checking `type`.

**Exact spec text to add**, in the Cloudflare Access resolver section:

> After `jwtVerify` returns, the resolver applies three claim checks before answering, each a refusal
> on failure: `payload.type === 'app'` (never the team-scoped `org` session token, whatever its
> audience says); `typeof payload.email === 'string'`; and a non-empty `email` after trim. A verified
> token that carries no usable `email` claim, which is what a service-token authentication produces,
> is refused as `unresolved` with `detail: 'no_email'`. Independently, the guard treats a
> `ResolvedIdentity` whose normalized `email` is empty, or is not a string at runtime, as a refusal
> rather than a lookup: the seam is site-supplied code and the guard does not trust its shape.

---

### B5. Every failure collapses to `null`, so a wrong AUD tag is a silent, total, undiagnosable lockout

**Mechanism.** spec:159-163: the resolver *"returns `null` on any failure (missing header, bad
signature, wrong audience, expired). It never throws."* The guard logs one record
(spec:117-119): `guard.rejected` with `reason: 'identity'`, `detail: 'unresolved'`.

Six operationally distinct conditions become one line:

| condition | who caused it | what the operator must do |
|---|---|---|
| no header at all | the gate is not in the path (B1) | fix the Access application scope |
| wrong `aud` | AUD tag pasted wrong at wiring time | fix the config |
| wrong `iss` | teamDomain pasted wrong (see S5) | fix the config |
| bad signature | attack, or a JWKS/key problem | investigate |
| expired | ordinary | nothing |
| JWKS fetch failed/timed out | Cloudflare or network fault | wait, or raise the timeout |

The two config cases produce a site where **every editor is refused forever** and the only evidence
is `detail: 'unresolved'`, which reads as "someone bypassed the gate." The engine's own precedent
already solves this exact problem in the neighbouring stage:
`CsrfRejectionDetail` (`src/lib/sveltekit/csrf.ts:134-141`) is a discriminated reason that is
"log-only and never carried in the HTTP response (the guard must not become an oracle)." The
repo's CLAUDE.md rule is explicit: "When a pass adds a diagnosable code path, give it an event in
the vocabulary rather than a bare `console` call."

`null` also hides a throw. The spec says the engine's resolver never throws, but a *site's* resolver
is arbitrary code. The spec does not say what the guard does with a thrown resolver: unhandled, it
is a raw 500 from `handle`.

**Exact spec text to change.** Replace the `resolve` return type and the guard's logging with:

> ```ts
> type IdentityOutcome = ResolvedIdentity | { refused: IdentityRefusalReason };
> type IdentityRefusalReason = 'absent' | 'expired' | 'signature' | 'audience' | 'issuer' | 'keys' | 'no_email' | 'other';
> resolve(event: CairnEvent): Promise<IdentityOutcome | null>;
> ```
>
> `null` and `{ refused: 'other' }` are equivalent; the reason exists so the guard's own record can
> name it. The reason is LOG-ONLY and never reaches the response, the same rule
> `CsrfRejectionDetail` carries (`csrf.ts:134-141`): every refusal renders one identical page. The
> guard wraps `identity.resolve` in try/catch; a throw is a refusal logged with `detail: 'error'`
> and the thrown message (capped, never a token), never a 500 and never an admission. The Access
> resolver maps `jose`'s error classes onto the reasons: `JWTClaimValidationFailed` on `aud`/`iss`,
> `JWTExpired`, `JWSSignatureVerificationFailed`, `JWKSNoMatchingKey`/a fetch failure onto `keys`.
> A `keys` or `audience` refusal logs at `error` level, not `warn`: both are operator faults that
> lock out the whole roster, and the `auth.store` doctor check cannot see either.

---

### B6. The identity-to-roster join is an unverified email claim, and the spec never states the requirement that makes it sound

**Mechanism.** Decision 2 (spec:30-34) makes the roster the authorization source and the email the
only join key. cairn accepts whatever `email` the Access token carries. Access carries whatever the
IdP asserted. Whether that email is *proof of control of that mailbox* depends entirely on the IdP
and login method the Access application allows:

- Google Workspace and Entra ID assert a directory-owned address. Sound.
- Access's One-time PIN method mails the code, so the address is proven. Sound.
- A generic OIDC connection (which is exactly how the spec wires Google Workspace, spec:28-29,
  access-research.md:195-210) asserts whatever claim the provider sends. A self-hosted or
  misconfigured OIDC provider, or one that lets a user set their own profile email, lets any
  admitted user assert `owner@example.com`.
- Social IdPs (GitHub, LinkedIn, Facebook), all first-class Access login methods, carry
  user-editable or unverified addresses.
- An Access application can have **several** login methods enabled at once. The impersonation floor
  is then the weakest one, not the strongest.

Consequence: an attacker admitted by any one login method on that application signs in as a rostered
owner, and cairn cannot tell. The magic-link path it replaces proved mailbox control by
construction; this one does not, and the design nowhere says so.

Compounding: the spec keeps the roster keyed on email (correctly, per the charter's
"cairn never models a domain actor"), so the stronger key the token offers (`sub`) is unused. That
is defensible, but only if the mailbox-control requirement is stated.

**Exact spec text to add**, as its own paragraph in "The Cloudflare Access resolver," and repeated
in the extend page and in `security-model.md`:

> The email claim is the entire join between the gate and the roster, so the Access application must
> enable only login methods that prove control of the address they assert: a Workspace or Entra
> directory, or Access's own One-time PIN. Enabling a second method widens the floor to the weakest
> one, since a token from any enabled method carries the same `aud` and verifies identically here.
> Do not enable a social IdP or a generic OIDC connection whose `email` claim the end user can edit
> on an application that gates a cairn admin. cairn cannot distinguish a directory-asserted address
> from a self-asserted one; the roster refuses an address it does not hold, and nothing refuses a
> forged claim of an address it does hold.

---

## Should-fix

### S1. The CSRF token no longer rotates on an authentication boundary, and the spec calls the CSRF stage "unchanged"

spec:109-112 says the CSRF mechanism is unchanged and the guard issues the cookie on the first admin
request lacking one. But `security-model.md:180-183` states a property the design silently drops:

> The CSRF value rotates at exactly two moments: a successful login mints a fresh one, so a value
> fixed on the browser before sign-in can't carry into the session, and a logout deletes it.

Under `identity` there is no login moment in cairn (`confirmAction` 404s), so the value minted on a
browser's first admin request persists across identity changes on that browser. Concretely: editor A
signs in at a shared machine, the CSRF cookie is minted; A's Access session ends (expiry, or an
Access-side logout that never touches cairn's cookies); editor B signs in through Access in the same
browser; B inherits A's CSRF token. A, who knows the value, can now CSRF B for as long as the cookie
lives (`issueCsrfToken` re-anchors `Max-Age` to `SESSION_TTL_MS`, 30 days, on every call,
`csrf.ts:120-132`). The `__Host-` prefix stops a sibling host planting the value; it does not stop a
prior legitimate holder from knowing it.

**Fix text:** under `identity`, bind the CSRF cookie to the identity epoch. The guard sets a second
internal cookie holding `SHA-256(normalized email + '|' + payload.sub)` beside the CSRF cookie, same
attributes and same `__Host-` discipline; when the value the request carries differs from the value
this request's identity produces (or the cookie is absent while the CSRF cookie is present), the
guard deletes and re-mints the CSRF cookie before the shell reads it, exactly as `confirmAction`
does at `auth-routes.ts:364-365`. State in `security-model.md` that under `identity` the rotation
moments become "the resolved identity changes" and "logout."

### S2. Issuing the CSRF cookie before the CSRF stage makes the `no-cookie` verdict unreachable

spec:109-112 places the guard's `issueCsrf` in the CSRF-authority stage. SvelteKit's `cookies.get`
returns a value set earlier in the same request, so if issuance runs before `csrfTokenVerdict`
(`csrf.ts:186-198`), the `no-cookie` branch (`csrf.ts:151`) can never fire again and every
cross-site POST reads as `mismatch`. Not exploitable, the compare still fails against a fresh random
value, but it destroys a diagnostic the guard's `guard.rejected` record depends on
(`guard.ts:164-170`).

**Fix text:** "the guard issues the CSRF cookie AFTER the CSRF stage and only for a request it is
about to resolve, never before the verdict, so `no-cookie` keeps its meaning."

### S3. `hasSession` on the CSRF rejection record cannot mean "an identity resolved" without reordering the pipeline

spec:111-112 says the `hasSession` field "keeps its meaning by reading 'an identity resolved'
instead of the cookie's presence." The CSRF stage runs before identity resolution, and
`guard.ts:157-159` states this explicitly:

> This check runs before session resolution (below), so no editor is known yet.

Making that field truthful requires calling `identity.resolve` before the CSRF check, which puts a
JWT verification and a potential JWKS network fetch on the path of every rejected cross-site POST,
an unauthenticated-triggerable amplification.

**Fix text:** "under `identity` the `guard.rejected` CSRF record omits `hasSession` entirely; the
field is a session-cookie presence read and there is no session cookie. Do not reorder the stages to
preserve it."

### S4. The owner bootstrap becomes a D1 write on a GET, re-arms on any empty roster, and needs no deliberate gesture

spec:130-136 moves `bootstrapOwner` into the guard. Today it fires only inside `requestAction`
(`auth-routes.ts:178-181`), which is a CSRF-checked POST carrying the owner's address typed into a
form. Under `identity` the same insert fires from a GET of any admin path.

Four consequences:

1. **A GET performs a state change.** Any page on the web can trigger it in the configured owner's
   browser with `<img src="https://site/admin">`, as can a link scanner or SvelteKit's own
   `data-sveltekit-preload-data` prefetch. The write is benign in content (`insertOwnerIfEmpty`,
   `store.ts:460-475`, is atomic and seeds the configured address only), but the timing is the
   attacker's, not the operator's.
2. **It re-arms.** `bootstrapOwner` normally stays in a site's committed config forever. Any later
   empty roster (a restored or re-provisioned D1, a `wrangler d1 execute` accident, the last owner
   deleted through some path) silently re-seeds. Under magic-link that also needs a POST and a mail
   round trip to that address; under `identity` it needs only a GET from anyone who can assert the
   address, which is B6's population.
3. **Cost on the hot path.** "When the roster is empty and the resolved email equals the configured
   owner's" is ambiguous about ordering. Implemented as "call `insertOwnerIfEmpty` whenever the email
   matches," it is a D1 write attempt on every request the real owner ever makes.
4. **`editor.bootstrapped` at `info`** understates a privilege grant performed by the guard.

**Fix text:**

> Order is fixed: `findEditor` first; only a null lookup AND a configured `bootstrapOwner` whose
> normalized email equals the resolved one calls `insertOwnerIfEmpty`, so the owner's steady-state
> requests perform no write. The bootstrap fires only on a request whose method is GET or HEAD for
> `/admin` exactly, never on a data or prefetch request, and logs `editor.bootstrapped` at `warn`
> with `via: 'identity'`. The extend page instructs the operator to remove `bootstrapOwner` from the
> config after the first sign-in, and states that leaving it in place re-arms the seed on any future
> empty roster.

### S5. `teamDomain` and `aud` are not validated at construction, and Cloudflare's own examples use the opposite shape

spec:162-163 promises the resolver "throws only on a misconfiguration it can detect at construction
(an empty `teamDomain` or `aud`)", and builds URLs as `'https://' + teamDomain` (spec:158).
Cloudflare's canonical sample uses `TEAM_DOMAIN` **including the scheme**
(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`, access-research.md:77-90), so a developer copying the
docs passes `https://team.cloudflareaccess.com` and gets `https://https://team...`. Every request
then fails `issuer`, i.e. a total lockout with the undiagnosable single log line of B5. An `aud`
pasted from the wrong field (an application id rather than the AUD tag) fails the same way.

**Fix text:** "construction validates `teamDomain` against `/^[a-z0-9-]+\.cloudflareaccess\.com$/i`
and throws naming the expected bare-hostname form when it carries a scheme or a path; it validates
`aud` as 64 lowercase hex characters and throws otherwise. Both messages name the field and the
expected shape and never echo a token."

### S6. `logoutUrl` is site-supplied and redirected to unvalidated: the open-redirect class

spec:81-82 and spec:141-143: `logoutAction` "redirects to `identity.logoutUrl`." The value is a
plain `string` on a site-supplied object. Nothing in the spec constrains it. A site that derives it
from config templating, an environment variable, or, worst case, a request parameter, hands the
admin a redirector. The redirect is reached by an authenticated POST, so it is a weak open redirect,
but it is one, and the engine can close it for free.

**Fix text:** "`logoutUrl` is validated at resolver construction: either a root-relative path
starting with a single `/` (rejecting `//host`, `/\host`, and any encoded variant, per the
[OWASP Unvalidated Redirects and Forwards cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)),
or an absolute `https:` URL. Anything else throws at construction. The value is never taken from a
request parameter; the guard passes no request data into it."

Also state the side effect the research recorded (access-research.md:148-151): `/cdn-cgi/access/logout`
signs the person out of **every** Access application in the organization, not just this admin.

### S7. `confirmLoad` is left live under `identity` and still echoes a raw token into HTML

spec:138-140 changes `loginLoad`, `requestAction` and `confirmAction` and says nothing about
`confirmLoad` (`auth-routes.ts:261-269`), which renders `event.url.searchParams.get('token')` into
the page. Under `identity` that page can never lead anywhere (its action 404s), but the route still
reflects an attacker-chosen `?token=` value into an admin-origin document and still issues a CSRF
cookie.

**Fix text:** "under `identity`, `confirmLoad` 404s alongside the two actions; `/admin/auth/**`
serves nothing. The hand-off page at `/admin/login` is the only public admin surface."

### S8. The unknown-identity page renders an IdP-supplied string into HTML

spec:120-123: the unknown page renders "with the email shown." That email comes from a JWT claim, so
its content is whatever the IdP asserted (B6 shows the IdP is not always trustworthy on this field).
The refusal pages are raw HTML strings built in `src/lib/sveltekit/condition-response.ts`, not Svelte
components, so escaping is manual. `label` (spec:83-84, rendered on both the hand-off and refusal
pages) and `displayName` (spec:89) are equally site- or IdP-supplied.

Information disclosure is low: the page shows the viewer their own authenticated address. Enumeration
is nil: a viewer must already have passed the gate. The injection risk is the real one.

**Fix text:** "every externally sourced string the refusal and hand-off pages render (`email`,
`label`, `displayName`) goes through `escapeHtml` (`src/lib/escape.ts:5`) and is capped at 320
characters, the same bound `auth.link.requested` applies (`auth-routes.ts:159-162`)."

### S9. `auth.identity.unknown` falsifies a documented logging guarantee

`docs/reference/log-events.md:105-108`:

> Every other event's `email` fires only for an allow-listed editor.

`auth.identity.unknown` (spec:123-124) fires precisely for an address that is NOT on the roster. The
same applies to the `identity` refusal record if it ever carries an email.

**Fix text:** add to the spec's Doctor-and-logs section: "the log-events guarantee sentence is
amended in the same pass: `auth.link.requested` and `auth.identity.unknown` are the two events whose
`email` is not an allow-listed editor's. `auth.identity.unknown`'s email is Cloudflare-signed rather
than raw request input, but is capped at 320 characters on the same reasoning."

### S10. No local development story, which pushes sites to hand-roll an auth bypass inside `resolve`

The spec settles what the showcase does (spec:227-230) and stops. A developer running their own
identity-configured site under `wrangler dev` has no Access in front, so every admin request refuses
and the admin is unusable locally. The `wrangler.jsonc` `access.dev` block only serves the
`ctx.access` runtime path, which the spec correctly puts out of scope (spec:235-239,
access-research.md:112-117), so it does not help here.

The predictable result is a site whose `resolve` starts with `if (env.CAIRN_DEV_BACKEND) return {
email: 'me@example.com' }`, shipped to production one day. That bypass is invisible to both of the
guard's dev-flag refusals, which is the residual `security-model.md:255-262` already names for
`deliver`.

**Fix text:** "Local development never goes through `identity`. A site's dev branch replaces the
guard entirely behind its own build-time `__CAIRN_DEV_BUILD__` conditional, the same shape the
showcase already uses (`examples/showcase/src/hooks.server.ts:18-33`), so no development bypass ever
lives inside a resolver that ships. The extend page says this in a warning box and states the reason:
a `resolve` that returns an identity when a flag is set is opaque to the guard's dev-backend
refusals, exactly the residual the security model records for `deliver`."

### S11. The Access application's CORS settings are now a CSRF-relevant control the engine's warning does not cover

`csrf.ts:209-211` warns:

> never add a permissive `Access-Control-Allow-Headers: x-cairn-csrf` (or an allow-origin) for
> `/admin` or `/media`, or this header witness collapses.

Under `identity`, the CORS response for `/admin` can be produced by the Access application rather
than by the site's own code (access-research.md:300-305 records that Access answers OPTIONS itself,
and Access applications carry their own CORS settings including header allowlisting). An operator who
enables Access CORS to fix an unrelated integration collapses the header witness without touching any
cairn code, so the existing warning misses the surface entirely.

**Fix text:** "the extend page states: leave the Access application's CORS settings disabled. Access
answers preflights for the gated path itself, so enabling them can make `X-Cairn-CSRF` settable
cross-origin and collapse the guard's header witness (`csrf.ts:209-211`); cairn's admin is
same-origin and needs no CORS."

### S12. `jose` options are unpinned: no clock tolerance stance, no JWKS timeouts, no key-source pinning statement

spec:156-163 names `issuer`, `audience` and `algorithms` (all correct, and `algorithms: ['RS256']`
closes the `alg: none` and algorithm-confusion classes). It is silent on the rest:

- **Clock skew.** `jose` defaults `clockTolerance` to 0. The research notes Cloudflare's own 60 s
  tolerance on a different surface (access-research.md:29-32), which invites an implementer to copy
  it. Both clocks here are Cloudflare's, so tolerance buys nothing and extends every expired token's
  life by a minute.
- **JWKS fetch bounds.** `createRemoteJWKSet` accepts `timeoutDuration`, `cooldownDuration` and
  `cacheMaxAge`. Unset, a JWKS outage stalls every admin request on the default timeout, and a
  flood of tokens carrying random `kid` values drives repeated refetches (bounded only by the
  default cooldown).
- **Key-source pinning.** Worth stating for the reviewer's benefit: the JWKS resolver never consults
  a token-supplied `jwk`, `jku` or `x5u` header, which is what makes `kid` confusion a non-issue
  here.

**Fix text:** "`jwtVerify` runs with no `clockTolerance`: issuer and verifier are both Cloudflare, so
skew is not a real condition and any tolerance only extends an expired token's life.
`createRemoteJWKSet` is constructed with `timeoutDuration: 5000`, `cooldownDuration: 30000` and
`cacheMaxAge: 600000`, so a certs-endpoint outage fails fast into a `keys` refusal rather than
stalling the admin, and a `kid`-rotating flood cannot drive unbounded refetches. Key selection is
JWKS-only; a token's own `jwk`/`jku`/`x5u` headers are never consulted, which is what closes the
key-confusion class. `createRemoteJWKSet` is called at resolver construction, never at module top
level, since a Worker forbids I/O in global scope; the object performs no fetch until first use."

### S13. `resolve` should take `CairnEvent`, not kit's `RequestEvent`

spec:79-80 types the callback `(event: RequestEvent)`. The `audit-auth-authchannelevent` ruling
(precedent.md:122-128) records the engine's discipline of expressing the requirement as a structural
constraint on `CairnEvent` instead of importing a framework event type; `guard.ts:1-3` states the
same reason ("Events are typed structurally, so the engine stays free of a site's App.* ambient
types"). Security-adjacent because the event type governs what the seam can reach.

**Fix text:** "`resolve(event: CairnEvent)`, the structural type every other engine seam takes.
State why this seam gets the full event where `lookup`/`verify` deliberately take a narrow
`{ env }` context: it must read request headers, which is the distinguishing requirement."

---

## Notes

### N1. The `identity` path must never fall back to the session cookie, and the spec should say so as a property

spec:35-37 ("One identity path per admin") reads as a UX decision. It is a security property: an
implementation that tried `identity.resolve`, then `resolveSession` on a null, would restore two
doors, one of which (`session`) has rows that outlive the switch. Add one sentence: "when `identity`
is set the guard never reads the session cookie and never calls `resolveSession`, on any path, for
any reason; pre-existing `session` rows are inert."

### N2. A site's `resolve` receives the live event and can set `locals.cairnEditor` itself

The seam hands the site the full event, so a resolver can write `event.locals.cairnEditor` directly
and bypass the roster join entirely. That is the site's own code and its own prerogative, but the
spec's claim that "authorization stays in the roster" (spec:30-34) is a convention the type system
does not enforce. Worth one sentence naming it, in the posture doc comment the
`access-semantics-documented-divergence` precedent calls for.

### N3. `/admin` must never be cached, and identity is not in any cache key

Identity now comes from a header. Nothing in a Cloudflare cache key includes it. `applySecurityHeaders`
(`src/lib/sveltekit/admin-response.ts:33-47`) sets `Cache-Control: private, no-store` on every guard
response, which is the right control, but an operator with a "Cache Everything" rule or a Cache Rule
matching `/admin*` overrides origin cache headers by configuration. A cached admin document carries
the CSRF token and the signed-in editor's identity. Worth a line in the extend page: no cache rule
may match the admin path, and a doctor arm could assert the absence of `cf-cache-status: HIT` on the
probe response.

### N4. The hand-off page and the refusal page tell an unauthenticated stranger which gate the org uses

Both name `label` (spec:83-84, 117-119, 138-139). They are reachable by an unauthenticated party
only in the B1 misconfiguration, so this is minor, and it is also the exact string the corrected
doctor check keys on. Worth stating that the disclosure is accepted for that reason.

### N5. Access path scoping has edges the extend page must name

`example.com/admin` as an application domain covers subpaths (access-research.md:248-249,
`docs/.../app-paths`), but an operator must confirm it covers `/admin` exactly, the SvelteKit data
requests (`/admin/__data.json`), and the form-action URLs the shell posts to (`/admin?/logout`,
`src/lib/components/CairnAdminShell.svelte:949`). It must NOT cover `/preview/<token>`
(`src/lib/sveltekit/content-routes-preview.ts:96`), which is a deliberately public non-editor
surface that Worker-level or account-level Access would break. The Access hierarchy note
(access-research.md:266-271: removing a specific rule silently falls back to a broader one or none)
belongs in the extend page as an operational gotcha.

### N6. `/admin/login` and `/admin/auth/**` stay `isPublicAdminPath`, so no identity resolves there

`guard.ts:25-27` keeps those paths outside the identity stage. That is correct given the Access
application gates the whole `/admin` prefix, but it means the hand-off page is served without any
identity check by cairn itself. Fine as long as N5's scoping holds; state the dependency rather than
leaving it implicit.

### N7. The Access session duration silently replaces cairn's own named constants

`security-model.md:43-48` says the token and session lifetimes are "named constants an adapter cannot
loosen." Under `identity` the effective admin session lifetime is the Access application's session
duration, an operator-set value up to a month. The security model's sentence has to be scoped to the
built-in path and the new reality stated.

### N8. No rate limit on the identity path

Under correct configuration Access absorbs unauthenticated traffic, so this is mostly moot. Under B1's
misconfiguration, `/admin` becomes an unauthenticated endpoint that performs an RSA verification and
possibly a JWKS fetch per request. S12's `cooldownDuration` bounds the fetch half. Worth one line
naming `resolveRateLimit` (`src/lib/cloudflare/rate-limit.ts`) as the site's own remedy, without
adding an engine feature.

### N9. `insertOwnerIfEmpty` under a race is safe; the spec's claim holds

Checked: `store.ts:460-475` is a single `INSERT ... SELECT ... WHERE NOT EXISTS` returning
`meta.changes === 1`, so two concurrent bootstraps produce exactly one row and the loser's subsequent
`findEditor` still resolves. spec:248-249 is accurate. Recorded so the finding is not re-derived.

### N10. Constant-time comparison is not a concern on this path

No secret comparison is added: `jose` performs the signature check, and the roster join is an
equality lookup on a non-secret email. `tokensMatch` (`src/lib/auth/crypto.ts:118-129`) stays the
CSRF path's own compare and is unchanged. Recorded for completeness.

### N11. Placement precedent is satisfied but the surface has one wrinkle

The `isuniqueviolation-cloudflare` test (precedent.md:213-263) is cleared by the spec's Turnstile
analogy and by `createAuthGuard` being the engine-side consumer of the option. Note that
`cloudflareAccess` on `/cloudflare` and `IdentityResolver` on `/sveltekit` cross subpaths, and
`check-surface.mjs`'s `findHomeViolations` requires either one canonical home per name or a recorded
entry in `scripts/checks/check-surface-reexports.json` (engine-research.md:414-422). Not a security
finding; a gate the spec's surface section should name explicitly.

---

## Statements in `docs/extend/security-model.md` the design makes false or inapplicable

Each needs the scoping the spec's documentation section (spec:206-209) currently promises only as
"a section under the session material."

| line | text | status under `identity` |
|---|---|---|
| :3-6 | frames two cases: built-in owner/editor, and a second audience's channel | incomplete; a third case (same audience, different mechanism) |
| :10-15 | "a small, owner-curated allowlist of magic-link-authenticated people"; the realistic risk is "session and cookie handling, abuse of the unauthenticated magic-link request endpoint" | false; the risk moves to JWT verification, Access application scope, and IdP email verification (B6) |
| :43-48 | "no third-party identity provider; a sign-in proves only membership in the `editor` table" | false; a sign-in proves an IdP-asserted email AND roster membership |
| :45-46 | the three lifetimes are "named constants an adapter cannot loosen" | false; N7 |
| :50-55 | the non-enumerating request path and the throttled exception | inapplicable; the endpoint 404s |
| :57-138 | the whole browser-binding, rebind, and unbound-row material | inapplicable; no token is minted |
| :140-148 | the session cookie's `__Host-` and `Secure` discipline | inapplicable; no session cookie |
| :168-172 | logout's both-name-forms delete of the session cookie | partly inapplicable; the CSRF half stays |
| :180-183 | "The CSRF value rotates at exactly two moments: a successful login... and a logout" | **false**; S1 |
| :207-226 step 6 | "Session resolve. Attaches `locals.cairnEditor` and `locals.cairnAccess`" | mechanism replaced; outcome preserved |
| :225-226 | "The exception is step 6: a missing or invalid session redirects to `/admin/login` without logging" | **false**; the refusal is a page and it logs (spec:113-119) |
| :424-431 | the no-CSP rationale rests on "an allowlisted editor's own session attacking itself" | weakened; the admitted population is whoever the Access policy allows, which is broader than the roster |

And `docs/extend/auth-channel-security-model.md:10-12` ("magic-link ... the documented primary path
for editors") needs the reframing precedent.md:386-395 already identified.

---

## What the spec gets right, recorded so a later pass does not re-litigate

- `algorithms: ['RS256']` hardcoded (spec:159-160) closes `alg: none` and algorithm confusion.
- `issuer` and `audience` both pinned, which is what separates one Access application's tokens from
  another's on the same team domain.
- Verification on every request, with the reason stated (spec:165-167), rather than trusting header
  presence: matches Cloudflare's own guidance (access-research.md:121-126).
- `createRemoteJWKSet` rather than pinned keys, so rotation does not break the site.
- The resolver returns identity only and never a role (spec:93-98): authorization stays in one place
  and the charter's "never model a domain actor" test passes.
- Live roster revocation preserved by reading the roster per request (spec:124-126).
- The bootstrap is atomic and cannot double-seed (N9).
- Service tokens, group-to-role mapping, and API Shield are all explicitly out of scope with reasons
  (spec:233-239), which prevents three plausible misreadings.

---

## Verdict

Not ready to build: six blocking items, led by a doctor check that passes exactly when the gate is
missing and a configuration split that can leave the magic-link door live beside the new one.

---


Object: `docs/superpowers/specs/2026-09-07-identity-seam-design.md` (DRAFT, 2026-09-07).
Lens: the charter's premise check ("is this cairn's job, and is it the leanest form?") and the
rulings ledger's own precedent. Read-only; no files changed.

Bottom line: the **generic `identity` seam should ship**, the charter text at
`what-cairn-is-and-is-not.md:62-66` was written before the spec and describes exactly this shape.
Three things in the spec do not survive their own cited precedent: the bundled
`cloudflareAccess` resolver plus `jose`, the guard-side owner bootstrap, and the central
"replaces exactly one of the five" claim. Two more are conformance defects (naming, tier).

---

## F1. `cloudflareAccess` in the engine fails the bar the spec claims it clears, and the spec's own precedent record says so

**Ledger, `isuniqueviolation-cloudflare` (`engine-rulings.md:431-444`):**

> "the Cloudflare-specific content is the workerd cause-chain nesting alone, **four divergent
> copies in ONE consumer is the `site-today-export` decline's own shape**, and the engine itself
> never handles `UNIQUE constraint failed` today … so shipping it would have been a **fifth C13
> engine-unused export**." Reopens on "a second unrelated consumer … **or** … an engine-side D1
> path that … mishandles it today … the engine becomes its own first consumer."

**Ledger, `audit-cloudflare-verifyturnstile` (`engine-rulings.md:3400-3403`):**

> "the naive siteverify fetch trusts a malformed 200 body and throws on a fetch failure, a bot
> bypass **two family sites shipped to production** before this export existed."

The Turnstile keep is not "hand-rolling this is scary in the abstract." It is an evidenced
production defect, in this family, already shipped, twice. The spec's argument for
`cloudflareAccess` (spec:53-66) is entirely hypothetical: "a site that hand-rolls it and skips
the audience check accepts any application's token…". Not one cairn site runs Access today; no
consumer has hand-rolled the verifier; the engine has no internal consumer of it. Every one of
`isuniqueviolation`'s three refusal reasons applies verbatim, and neither of its two reopening
conditions is met. Shipping it now is the fifth engine-unused export that ruling refused.

The spec's own banked input agrees. `record/2026-09-07-identity-seam/precedent.md:257-263`:

> "**ship the `resolveEditor` seam in the engine** … but **do not ship a
> Cloudflare-Access-specific JWT-verifying resolver function as engine code**; that
> implementation is the site's … a candidate for a later, separately-argued `/cloudflare` export
> once a second consumer or an engine-internal need is evidenced, following the
> `isUniqueViolation` reopening conditions exactly."

And `precedent.md:422-428` restates it as the report's conclusion. The spec cites this document
as an input (spec:5) and then rules the opposite way without naming the disagreement or
answering the reasoning. A spec that overturns its own commissioned precedent research owes an
explicit overturning argument on the record; spec:53-66 does not contain one, because the
Turnstile analogy it offers is the analogy the precedent report already considered and rejected
("there is a real argument by analogy … **but the ledger does not have a ruling directly on this
yet**", precedent.md:245-250).

**Charter, `what-cairn-is-and-is-not.md:70-71:**

> "**Seam, not feature.** When a real extension need appears, the answer is the thinnest seam
> that lets the developer build it."

And `:98-99`: "Add to the engine only when it demonstrably serves the core job, and prefer the
leanest seam over a general feature." *Demonstrably* is the operative word, and the demonstration
is missing.

**Position: defer `cloudflareAccess`.** Ship the `identity` seam alone. The security risk the
spec names is real but is fully closed by a copyable recipe: the extend page carries the sixty
lines verbatim in a fenced block, and `check:snippets` (which the spec already schedules,
spec:212) type-checks it in CI, so the recipe is a *verified* artifact, not folklore. That is
strictly leaner than an engine export and loses nothing the spec's argument actually claims.
File the ruling with `isuniqueviolation`'s own reopening conditions: a second consumer, or the
first production consumer reporting the recipe insufficient.

**Change spec:53-66.** Replace the heading "The Cloudflare Access resolver also ships, on
`/cloudflare`" and its paragraph with a defer, stating: the seam ships; the Access resolver ships
as a snippet-gated recipe on the new extend page; the export reopens on `isuniqueviolation`'s
two conditions. Delete spec:148-174 as an engine section and rewrite it as the recipe. Delete
`cloudflareAccess` from spec:206 and spec:216.

### F1b. `jose` as a runtime dependency

**Charter, `what-cairn-is-and-is-not.md:56-58** (the governing boundary) and the leanness rule
above. The engine's 38 runtime dependencies carry no auth library today; every cryptographic
primitive in `/auth-crypto` is WebCrypto. `jose` would ship in every consumer's Worker bundle,
including the four production sites and the showcase, none of which use Access, against Workers'
bundle and startup budget.

If F1 is accepted, `jose` disappears with it, the recipe declares its own dependency in the
site's `package.json`, where it belongs, and cairn's supported-toolchain policy never has to
carry it. **If Geoff overrides F1 and ships the resolver anyway**, the dependency still must not
be a `dependencies` entry: it belongs in `peerDependencies` marked optional (the slot
`@anthropic-ai/sdk` already occupies for the same reason, an optional feature's library), so a
site that never imports `cloudflareAccess` never installs or bundles it.

**Change spec:64** ("The engine takes `jose` as a runtime dependency") and spec:243-244.

---

## F2. The guard-side owner bootstrap is a second admission source, an ambient write on GET, and it cannot reach the config it claims to read

**Charter, `what-cairn-is-and-is-not.md:62-66:**

> "cairn ships a sensible default and a clean way to replace it, never a configurable engine for
> the general case."

Spec:130-136 moves `bootstrapOwner` from the magic-link *request action* (a deliberate POST by a
human who typed their email) into the *guard*, where it fires on any admin request. Three
distinct problems.

**(a) A config value becomes an admission credential.** Today the roster is written by an owner
through the roster screens, or once by the bootstrap inside a POST the person initiated. Under
spec:130-136 the pair (Access IdP policy, `bootstrapOwner.email` in config) grants owner
capability with no human roster action at all. That is a second authorization source arriving
through the back door, which decision 2 (spec:31-34) explicitly forbids for IdP groups and then
readmits here in a different shape.

**(b) The failure mode is not "cannot seed twice", it is "reseeds whenever the roster reads
empty".** Spec:249 argues "it is gated on an empty roster AND the configured owner email … so it
cannot seed a roster twice." The guard's condition is *the roster is empty right now*, not *the
roster has never been seeded*. A `AUTH_DB` binding re-pointed at a fresh database, a migration
that recreates the table, or a restored-from-blank D1 all present an empty roster, and the next
ambient GET re-seeds owner. Under the magic-link path that reseed required someone to
deliberately request a link; under `identity` it happens invisibly. The doctor probe
`auth.store` names exactly this class ("a correctly deployed site with an empty owner table locks
every human out permanently", `precedent.md:96-101`), the spec inverts it into a silent
self-heal that also silently self-grants.

**(c) The guard cannot read `auth.bootstrapOwner`.** `bootstrapOwner` lives on
`createAuthRoutes`'s config, reached through `createCairnAdmin` (`src/lib/sveltekit/auth-routes.ts:42`,
`:178-179`; `src/lib/sveltekit/cairn-admin.ts:107`). `createAuthGuard` is a separate factory whose
options are exactly `roles`, `access`, `includeSubDomains` (`docs/reference/sveltekit.md:1982`) , 
the interface the spec itself prints at spec:71-76. There is no wiring by which the guard sees
that config. Honoring spec:130-136 requires either a sixth `AuthGuardOptions` member the spec
never declares, or a cross-factory coupling between two independently-mounted handles. This is
not a detail for the implementer: it changes the printed public interface, and it is the kind of
thing the plan will discover on day one and resolve by inventing surface the spec did not
sanction.

**(d) The guard becomes a writer.** `guard.ts` performs no database write today (`guard.ts:175-195`
reads only). Adding one puts a mutation on an unauthenticated-by-cairn GET path, outside
`adminAction`'s CSRF envelope, in the module the ledger describes as carrying "a dev-backend
fail-closed" and the security headers (`engine-rulings.md:2538`).

**Position: cut the guard-side bootstrap from this spec.** The leaner answer that needs no new
surface and no guard write: under `identity`, the first-owner seed stays where it is, or the
extend page documents `wrangler d1 execute` / the `cairn` tool as the one-time seeding step,
which is already the operator cockpit's job (`what-cairn-is-and-is-not.md:83-92`). If the
bootstrap must move, it is its own decision with its own ruling, not a paragraph riding inside a
seam spec.

**Change spec:130-136** (delete the paragraph, replace with the first-owner seeding step under
`identity` and a note that the roster is seeded out-of-band). **Change spec:249** (the risk line
is wrong as written and must not survive).

---

## F3. "The seam replaces exactly one of the five" is falsified by the spec's own next page

**Ledger, `audit-sveltekit-createauthguard` (`engine-rulings.md:2538`):**

> "It carries session resolution, the CSRF authority the site handed over by setting
> `checkOrigin: false`, capability resolution, security headers, and a dev-backend fail-closed."

**Spec:46-48:** "the seam replaces exactly one of the five, session resolution, and the design
below says so piece by piece."

That claim is the spec's central leanness argument, and spec:104-136 contradicts it:

- **Piece 2, CSRF authority, changes.** Spec:107-112: "under `identity` the guard issues it on
  the first admin request that lacks one (the same `issueCsrf` the loads call), before the shell
  reads it." A new cookie-issuance point inside the guard is a mechanism change, and the spec
  concedes a second one in the same breath: "The `hasSession` presence read in the
  `guard.rejected` record keeps its meaning by reading 'an identity resolved' instead of the
  cookie's presence." Two changes, labelled "unchanged in mechanism."
- **A sixth piece is added.** The bootstrap write (F2) is not one of the five; it is new guard
  behavior with no counterpart in the enumeration.
- **Three route handlers outside the guard change behavior.** Spec:138-144 turns `requestAction`
  and `confirmAction` into 404s, rewrites `loginLoad`, and changes `logoutAction`. Those live in
  `auth-routes.ts`, not the guard, so they are outside the five entirely, the option's blast
  radius crosses a factory boundary the "one of five" framing conceals.
- **The doctor changes** (spec:178-181): `admin.login-probe` gets a second expected shape.

None of these is individually fatal. The problem is the claim: a spec that opens by asserting
minimal blast radius and then enumerates four more changed surfaces has mis-sold its own
leanness, and that assertion is precisely what a reviewer applying the charter's premise check
is supposed to weigh.

**Change spec:46-48.** State honestly: the seam *replaces* session resolution, *relocates* the
CSRF cookie's issuance point, *re-bases* one log field, and *changes the behavior of three
`auth-routes` handlers and one doctor probe*. Then argue leanness against that true list.

### F3b. The thinner shapes, weighed

The task asks whether a thinner shape exists. Two candidates, both weighed and both correctly
losing, but the spec should say so, because a reader cannot tell it considered them.

- **A `locals.cairnEditor` hand-off the site sets in its own hook, guard trusting it under a
  flag.** Thinner in type surface, and wrong. `docs/reference/sveltekit.md:811` states the
  invariant: "Only `createAuthGuard` may write `locals.cairnEditor` and `locals.cairnAccess`, and
  it must be the last handle in the sequence to set them." `section-action.ts` depends on that
  one-writer rule to distinguish "the guard never ran" from "no access" (`guard.ts:188-192`
  comment). A trust-the-locals flag also lets a site hand the engine a role string that never met
  `resolveCapability`, breaking the fail-closed default `audit-adapter-resolvecapability` records.
  Reject, on the record.
- **A resolver returning the whole `Editor`.** Thinner in the engine (no roster read on that
  path) and wrong for the charter: it moves authorization out of the roster into site code,
  reintroducing the second authorization source decision 2 refuses, and it bypasses the
  last-owner guard's anchor (`precedent.md:159-167`). The spec's `ResolvedIdentity` returning
  identity only (spec:93-98) is the correct call.
- **The genuinely thinner variant the spec did not consider:** `identity` as a bare *function*
  rather than a three-member object. `resolve` is the seam; `logoutUrl` is load-bearing (logout
  must go somewhere); `label` is a UI string that exists to render one sentence on a page the
  site could equally own. Bundling presentation with proof is exactly the "configurable engine
  for the general case" drift the charter warns against at `:65-66`. Minimum: `label` becomes
  optional with an engine fallback ("your organization"), so the seam's required surface is
  `resolve` plus `logoutUrl`.

**Change spec:78-85**: mark `label` optional; add one paragraph recording the two rejected
thinner shapes and why, so the next reader does not re-argue them.

---

## F4. `cloudflareAccess` violates the ratified naming conventions

**Ledger, `convention-bare-noun-functions` (`engine-rulings.md:185-190`), Geoff's own ruling:**

> "Bare nouns. An exported function's name begins with a verb; an exported value's does not; bin
> names and **host-ecosystem plugin factories** are out of scope."

**Ledger, `convention-verb-rules` (`engine-rulings.md:176-178`):**

> "`build*` = derives pure data; **function factories belong to `create*`**, so the resolver trio
> renames."

`cloudflareAccess(config)` is an exported function whose name begins with a noun. It is not a
bin name and not a host-ecosystem plugin factory (the carve-out covers a Vite or kit plugin whose
name the host ecosystem dictates; nothing dictates this one). Its `/cloudflare` siblings are
`verifyTurnstile` and `resolveRateLimit` (`src/lib/cloudflare/index.ts:6-7`), both verb-first.
`githubApp` is the counterexample a defender will reach for, but it predates the 2026-08-30
ratification and carries no exempting annotation at `audit-adapter-githubapp`; the conventions
pass renamed a dozen names on exactly this rule (`extractMenu`→`readMenu`,
`mediaToken`→`formatMediaToken`, the `build*` resolver trio→`create*`).

The function returns a resolver object, so `create*` is the ratified prefix.

**Change spec:149 and spec:152 and spec:156 and spec:206 and spec:216:**
`cloudflareAccess` → `createAccessIdentity` (or `createCloudflareAccessIdentity` if the
`/cloudflare` subpath is judged insufficient disambiguation). Moot if F1 is accepted, in which
case the recipe's local function still follows the rule as a documented exemplar.

### F4b. `resolve` collapsing four outcomes into `null`

**Ledger, `convention-outcome-idiom` (`engine-rulings.md:199-204`):**

> "An operation with more than two distinguishable outcomes returns a discriminated result, never
> a boolean; `verifyTurnstile`'s fail-closed boolean is the stated exception."

Spec:159-163 returns `null` "on any failure (missing header, bad signature, wrong audience,
expired)", and spec:114-118 logs all of them as `detail: 'unresolved'`. Those are operationally
distinct diagnoses: *no assertion present* means Access is not in front of this origin (the
spec's own risk at spec:245-247); *wrong audience* means a misconfigured AUD tag; *expired* is
normal. `CLAUDE.md`'s diagnosing section requires the log to "map the symptom to its event", and
this collapse defeats it precisely where the spec says the doctor will help.

The exception clause arguably covers a deliberately-uninformative auth primitive, and there is a
real argument for not letting a resolver leak why a token failed. But the guard is the only
caller and logs server-side; nothing leaks to the requester.

**Change spec:80** (the `resolve` doc comment) and **spec:114-118**: distinguish at minimum
`absent` from `invalid` in the `detail` field. This is cheap and does not require the full
`outcome` discriminant.

---

## F5. The stability tiers are wrong in both directions

**`docs/reference/README.md:21-31`:**

> "**Extension API.** The frozen contract … Breaking it after the beta freeze is a deliberate
> major-version event, not an everyday one."
> "**Unstable API.** Importable today, with no stability promise across minor versions … and
> **any other export whose shape is not yet committed**."

**Spec:216:** "`createAuthGuard` is Scaffold API; an optional option is additive and keeps the
tier. `cloudflareAccess` and the two interfaces enter as Extension API."

Two problems.

**(a) Extension API is too strong for day one.** `IdentityResolver`, `ResolvedIdentity`, and
(if it ships) the Access resolver have zero consumers, no production exposure, and a shape that
depends on Cloudflare's own claim set. `docs/extend/README.md:73-80` warns in the repo's own
words that two Extension-tier contracts already broke inside 0.x minors (`0.86.0`, `0.94.0`).
The tier that fits "shape not yet committed" is Unstable, by the definition's own last clause.
Entering at Unstable costs nothing (nobody is depending on it yet) and buys the freedom to
reshape after the first real consumer, which is exactly the sequence `createAuthChannel`
went through before it was kept on adoption evidence (`engine-rulings.md:3220-3232`).

**(b) `AuthGuardOptions` is Scaffold API, and `identity` is not scaffold wiring.** The Scaffold
tier is "the copied wiring a scaffolded site owns rather than a seam it imports and calls: the
shape a `create-cairn-site` template writes into a consumer's own route files"
(`reference/README.md:24-26`). No scaffold writes `identity`; a developer imports a resolver and
calls it. Adding an imported-seam member to a copied-wiring interface muddies the one distinction
the two frozen tiers exist to draw. Either the row carries a per-member tier note, or the
resolver members are described on their own types with their own tier and `AuthGuardOptions`
simply references them.

**Change spec:216.** `IdentityResolver`, `ResolvedIdentity`, and any Access export enter as
**Unstable API**, with a stated promotion condition (first production consumer). Add a sentence
on how the `AuthGuardOptions` reference row marks `identity`'s own tier.

---

## F6. Week-one gaps for the target user, and one that is a lockout

Decision 1 names the target: "the common nonprofit case: an organization already on Google
Workspace or Microsoft 365" (spec:21-22). Four things such an organization hits in week one that
the out-of-scope list (spec:235-239) does not name.

**(a) The roster-email mismatch is a silent, total lockout, and it is not mentioned anywhere.**
A site turning on `identity` has an existing roster whose rows carry whatever address each editor
used for magic-link, frequently a personal Gmail, an alias, or a legacy domain. The Access JWT
carries the IdP's primary address. Every editor whose two addresses differ is refused as
`unknown` (spec:118-121) the moment the option ships, and the only recovery is the hole
`auth.email-normalization` already names: "a manual `wrangler d1 execute` insert is the one way to
violate it" (`precedent.md:98-100`). This is the highest-severity omission in the spec, because
it converts a config change into an outage for a live site and the spec's Risks section
(spec:243-252) does not list it.

**Change: add to spec:243-252** a risk entry, and add a step to the extend page's flow: re-key
the roster to the IdP's primary addresses *before* setting `identity`, with the exact
`listEditors`/`insertEditor` or `cairn` tool commands.

**(b) Every editor is admitted twice, by hand, forever.** Spec:31-34 defers group-based
admission, so an editor must be added to the Access application's policy *and* to the cairn
roster, in two consoles, with no reconciliation and no doctor check for divergence. The deferral
is defensible on the charter's own ground ("group-based roles would be a second authorization
source"), but the cost is a standing operational burden the spec never states to the reader, and
"the roster screens keep their meaning" (spec:32) reads as though nothing changed. The honest
version: Access says who may reach `/admin`; the roster says who may do anything once there;
both lists are maintained by hand and they can drift.

**Change spec:31-34** to state the double-maintenance explicitly, and add a bullet to the extend
page. Consider (do not build) a doctor check that reports roster rows as a list the operator can
diff against the Access policy.

**(c) The 50-user cap is stated once and never explained.** Spec:27-28 says "free to 50 users on
Zero Trust's free plan." A nonprofit reading that will count staff. The number that matters is
how many identities authenticate through Access, which, because Access gates only `/admin` , 
is the editor count, not the staff count. Say so, and say what user 51 costs.

**Change spec:27-28.**

**(d) The first-owner flow.** Covered at F2. Note additionally that under the spec's own design,
a site whose `bootstrapOwner` is unset and whose roster is empty is permanently locked out with
no UI recovery, and the remedy the spec offers ("the check names `bootstrapOwner` as the remedy",
spec:180-181) is a code change plus a redeploy. That is a poor week-one story for the named user
and another argument for seeding the roster out-of-band.

---

## F7. The two doors are accretion by adjacency

**Pass-sizing rule (global):** "**accretion by adjacency** (work joins a task because it sits
next to it, each addition defensible alone and none weighed against the total)."

Spec:186-196 is titled "The two doors that ride along", the tell is in the spec's own heading.
Both items are real and both come from a *different* source (the 2026-09-07 charter audit), not
from this design. Neither depends on the identity seam. The `why-cairn.md` correction at
spec:193-196 is a claims-accuracy fix belonging to the audit's own remediation, and it touches a
front-door file this pass otherwise does not own.

They are cheap (docs-only) and they share an extend-page family, which is the strongest argument
for keeping them. But "cheap and adjacent" is precisely the pattern the rule names, and the pass
already carries: a guard branch, three route-handler changes, a doctor probe change, two log
events, a new dependency (unless F1), a new extend page, five reference-page edits, and a
workerd integration suite.

**Position: route them to the docs pass that owns the charter-audit remediation.** If Geoff
prefers to keep them, that is a legitimate call, but the spec should say "these two ride along
by decision, at an estimated N-paragraph cost" rather than presenting them as entailed by the
seam.

**Change spec:186-196**: either remove the section, or retitle it and state the decision to
carry unrelated audit findings in this pass.

---

## F8. "Sign in through your organization" is over-claimed for the shipped shape

Spec:200-204 names the new extend page `sign-in-through-your-organization.md`, and spec:210 puts
"or sign in through your organization" into `why-cairn.md`'s identity paragraph, the front door.

**`docs/internal/docs-register.md`** governs the front-door register and the no-pitch keystone,
and the `comparisons-never-strawman` memory holds that cairn states its own drawbacks. Measure
the claim against what ships:

- It requires the organization to have Cloudflare Zero Trust, an Access application scoped to a
  path, and an IdP connection configured by someone with Cloudflare account access. That is not
  the organization's own identity system reaching cairn; it is a Cloudflare product in between.
- It requires the site's developer to edit `hooks.server.ts` and redeploy. It is not a setting.
- Authorization is still per-person, hand-maintained in cairn's roster (F6b). "Through your
  organization" implies the directory drives access; it does not.
- Off Cloudflare Access, nothing works: cairn ships no OIDC client (spec:28). Defensible given
  the stack opinion, but the front-door sentence should not imply otherwise.

The claim is *honest* in the narrow sense that the shipped feature does let a Workspace editor
sign in with their Workspace account. It is over-claimed in register: the front door of a
project whose charter prizes "out of scope is a valid answer" should not borrow the phrasing of
products that ship a directory integration.

**Change spec:210.** Propose for `why-cairn.md`: "or, behind Cloudflare Access, sign in with
your organization's Google or Microsoft accounts", which names the mechanism, keeps the
benefit, and cannot be misread as a directory sync. Keep the extend page's filename descriptive
of the task, and open that page with the prerequisites (a Cloudflare Zero Trust account, an
Access application, an IdP connection, a developer to wire it) before the steps.

---

## What the spec gets right, and should keep

Recorded so a fold does not over-correct.

- The generic `identity` seam is the charter's own pre-written shape
  (`what-cairn-is-and-is-not.md:62-66`) and should ship.
- `ResolvedIdentity` returning identity only, with role and capability from the roster
  (spec:93-98), is the correct answer to "does this bring a second authorization source"
  (`what-cairn-is-and-is-not.md:69`, "cairn never names or models a domain actor"). It does not.
  `logoutUrl` and `label` are gate presentation, not actors.
- Rejecting a `requireSession` override in favor of a guard option (spec:49-51) reads
  `audit-sveltekit-requiresession` (`engine-rulings.md:2517`) correctly.
- Refusing IdP group-to-role mapping (spec:31-34) is the charter answer, notwithstanding F6b's
  cost note.
- Live revocation via the per-request roster read (spec:124-126) preserves the contract
  `resolveSession` gives today.
- The showcase staying zero-config and off Access (spec:227-230) is right.
- The fail-closed posture when Access is absent (spec:245-247) is the correct direction of
  failure.

---

## Ranked summary

1. **F1**, `cloudflareAccess` fails `isuniqueviolation`'s bar and the spec's own precedent
   record says so. Defer the export; ship the seam plus a `check:snippets`-gated recipe; `jose`
   leaves with it (F1b: if overridden, optional peer dep, never `dependencies`).
2. **F2**, the guard-side bootstrap is a config-as-credential admission source, re-seeds on any
   empty roster, puts a write on a GET, and cannot reach `auth.bootstrapOwner` from
   `AuthGuardOptions` at all. Cut it; seed out-of-band.
3. **F6a**, the roster-email mismatch is an unmentioned total lockout on any live site that
   turns `identity` on. Add the risk and a re-key step before the switch.
4. **F3**, "replaces exactly one of the five" is false: CSRF issuance moves, a sixth piece is
   added, three `auth-routes` handlers and one doctor probe change. Restate the true list.
5. **F4/F5**, `cloudflareAccess` is a bare-noun function (`create*` per the ratified
   conventions), and the new types enter at the wrong tier: Unstable, not Extension, with a
   stated promotion condition.

Then: F6b (double-maintained admission), F8 (front-door over-claim), F7 (the two doors as
adjacency), F4b (`null` collapsing four diagnoses), F6c (the 50-user cap unexplained).

---


Read-only review against `main` at `/var/home/glw907/Projects/cairn-cms`, 2026-09-07. Every claim in
the spec was opened against the tree. Findings are grouped: **grounding** (a claim the tree
contradicts or does not support), then **feasibility** (size, task shape, pass sizing).

Verdict in one line: the design's *shape* is sound and its ledger citations check out, but three of
its load-bearing mechanical claims are wrong against the tree, and its deliverable list omits three
gated artifacts the repo will refuse a merge without. It is not a six-task pass.

---

## Part 1, Grounding findings

### G1 (blocking). The CSRF-issuance premise is false: the shell already issues the cookie.

**Claim** (spec:109-112):

> "The CSRF cookie is issued today by the login and confirm loads, which a resolver site never
> visits, so under `identity` the guard issues it on the first admin request that lacks one (the
> same `issueCsrf` the loads call), before the shell reads it."

**Evidence.** The login and confirm loads are two of *four* issue points, not two of two:

- `src/lib/sveltekit/auth-routes.ts:252`, `loginLoad`
- `src/lib/sveltekit/auth-routes.ts:267`, `confirmLoad`
- `src/lib/sveltekit/auth-routes.ts:365`, `confirmAction` (the deliberate rotation)
- **`src/lib/sveltekit/content-routes-shell.ts:224`, `shellLoad`**, which calls
  `issueCsrfToken({ url, cookies, platform })` on every shell render, with the comment at
  `content-routes-shell.ts:221-223` explaining there is deliberately no fallback.

`issueCsrfToken` (`src/lib/sveltekit/csrf.ts:120-131`) is reuse-or-mint and re-anchors `Max-Age` on
every call, so calling it from the shell on a cookie-less first request mints exactly the value the
rendered `csrf` field then carries.

**Correction.** Under `identity`, an editor's first request lands on an admin route whose shell load
runs before any form is rendered, so the cookie is minted there, unchanged. The guard needs **no**
CSRF change. Delete spec §"What the guard does under `identity`" item 2's second and third sentences.
Two consequences ride on this:

1. The proof list's "the CSRF cookie issued on first request" integration case (spec:225) is testing
   behavior that already exists via the shell, not the guard.
2. The residual real gap is narrower and worth stating explicitly instead: a **custom** route mounted
   through the `CairnAdminShell` seam that renders its own form without going through `shellLoad`
   would, under magic-link, have had a cookie from `/admin/login`. Whether that case exists is a
   question the plan should answer before adding a guard write; if it does, the fix is one call in
   the guard, but justified by that case, not by the false premise above.

Also, the symbol is `issueCsrfToken`, not `issueCsrf` (`csrf.ts:120`). Minor, but the spec names it
in code voice and `check:symbols` (`scripts/checks/check-symbols.mjs`) resolves code-voice tokens in
published docs against the source; the extend page must not repeat the wrong name.

---

### G2 (blocking). `identity` cannot reach the magic-link surface or `bootstrapOwner` from
`createAuthGuard`. The spec puts one option on a factory that owns neither.

**Claims** (spec:44-45, 130-136, 138-144):

> "`createAuthGuard` gains one optional option, `identity` …"
> "Under `identity`, the guard honors the same `auth.bootstrapOwner` config …"
> "`loginLoad` renders a one-paragraph page … `requestAction` and `confirmAction` return 404 …
> `logoutAction` … redirects to `identity.logoutUrl`."

**Evidence.** These live in three different factories with three different config objects, and the
guard sees none of the others:

- `createAuthGuard(opts: AuthGuardOptions)`, `src/lib/sveltekit/guard.ts:73-76`. It closes over
  `roles`, `access`, `includeSubDomains` only, and is constructed in the site's `hooks.server.ts`
  (`examples/showcase/src/hooks.server.ts:32`).
- `bootstrapOwner` is a member of `AuthRoutesConfig`, `src/lib/sveltekit/auth-routes.ts:42`, read
  only inside `requestAction` at `auth-routes.ts:178-179`.
- The wiring is `createCairnAdminInternal` → `createAuthRoutes({ branding, send, bootstrapOwner })`
  at `src/lib/sveltekit/cairn-admin.ts:107`, fed from `CairnAdminConfig.auth?: Partial<AuthRoutesConfig>`
  (`cairn-admin.ts:39`). The admin config object is built in the site's `cairn.server.ts`, a
  different module from `hooks.server.ts`.

So a single `identity` value on `AuthGuardOptions` reaches the guard and *nothing else*. Neither
`loginLoad` nor `logoutAction` nor the bootstrap can see it.

**Correction.** Pick one and say so in the spec, because the plan cannot:

- **(a) Two mount points, one value.** The site declares the resolver once in its own module and
  passes it to both `createAuthGuard({ identity })` and `createCairnAdmin({ auth: { identity } })`.
  Honest, no new machinery, but it puts a correctness-critical "set it in both places or the login
  page still serves" on the developer, and nothing in the tree can detect the half-configured state.
- **(b) `identity` moves to `CairnAdminConfig.auth`, and the guard reads it off the runtime.** The
  guard has no runtime handle today, so this is a real structural change to `createAuthGuard`'s
  signature.
- **(c) `identity` on `AuthGuardOptions` only, and the magic-link surface is left serving.** Then
  decision 3 ("One identity path per admin", spec:35-37) is not delivered and `requestAction` can
  still mint a token for any roster address, which is exactly the "a stray link cannot mint a token"
  risk the spec closes at :141.

Recommend (a) with a construction-time cross-check the plan can actually build: `createCairnAdmin`
already validates its config, so an `identity` on the admin config with no matching guard option is
undetectable, but the *reverse* is detectable at request time (the guard can set a `locals` marker
the auth routes assert on, refusing loudly rather than serving a live login form). State the chosen
answer in the spec; leaving it to the plan author is the single largest open reading in the document.

Secondary: `insertOwnerIfEmpty(db, email, displayName, now)`, `src/lib/auth/store.ts:460-475` , 
takes a **required** `displayName`. The spec's bootstrap uses `config.bootstrapOwner.displayName`,
which is required on the config (`auth-routes.ts:42`), so this one lines up. `ResolvedIdentity.displayName`
being optional (spec:89) is therefore fine for bootstrap, but note the guard must then build `Editor`
(`src/lib/auth/types.ts:13-18`, `displayName: string`, non-optional) with a definite fallback chain;
the spec's "falls back to the roster row's, then to the email" is correct and buildable.

---

### G3 (blocking). Two new refusal pages mean two new registered conditions, plus their doc anchors.
The deliverable list has neither.

**Claims** (spec:117-121): a "plain refusal page naming the gate's `label`" for `unresolved`, and a
distinct page rendering "ask the site's owner to add you" for `unknown`.

**Evidence.** The guard does not hand-write refusal HTML. Every refusal routes through
`renderConditionResponse(id)` (`guard.ts:105, 118, 132, 171`) against the fixed map at
`src/lib/sveltekit/condition-response.ts:12-17` and the switch at `condition-response.ts:44-59`,
which resolves the id in the registry at `src/lib/diagnostics/conditions.ts`. Each entry carries
`id`, `severity`, `title`, `why`, `remediation`, `docsAnchor`, `logEvent`
(`conditions.ts:43-51` is the exemplar). `docsAnchor` is a live link into `docs/admin/`, gated by
`check:docs` (`scripts/checks/docs-links.mjs`), and the ids themselves are gated by
`check:readiness` and by `check:symbols`'s third registry
(`scripts/checks/check-symbols.mjs:26-36`, which resolves dotted-lowercase tokens against the union
of the log-event union, the condition registry, and every `DoctorCheck.id`).

**Correction.** Add to the "Documentation and surface" list: two condition ids (something like
`auth.identity-unresolved` and `auth.identity-unrostered`), their `REASON_CONDITION`/switch arms,
two new sections in `docs/admin/is-it-working.md` for the anchors, and the `docs/reference/doctor.md`
row each condition implies. This is roughly a full task on its own, and it is currently invisible in
the spec.

Related and also missing: the `unknown` page "with the email shown" (spec:120) puts an
attacker-supplied-ish value into a branded page. The existing pages are static strings; none
interpolates request data. The plan needs an escaping requirement stated as acceptance criteria, and
`web-auth-security-reviewer` will ask for it.

---

### G4 (blocking). `cloudflareAccess` on `/cloudflare` returning a `/sveltekit` type is an
R4 canonical-home violation the spec does not record.

**Claim** (spec:205-207): the surface work is "`docs/reference/sveltekit.md`: `AuthGuardOptions.identity`,
`IdentityResolver`, `ResolvedIdentity`; `docs/reference/cloudflare.md`: `cloudflareAccess`".

**Evidence.** `check:surface` enforces a canonical-home rule (`scripts/checks/check-surface.mjs:287-297`,
`429-441`): a name published from a second subpath must be recorded in
`scripts/checks/check-surface-reexports.json` with its home and the signature that requires it. The
existing precedent is exact: `RateLimitLike` is homed on `/cloudflare` and recorded as an R4
re-export on `/auth-channel` because `AuthChannelConfig` names it
(`check-surface-reexports.json:53-58`), and `CairnEvent` likewise at :59-64.

`cloudflareAccess(config): IdentityResolver` names `IdentityResolver` on `/cloudflare`, and
`IdentityResolver.resolve` names `ResolvedIdentity`. Both are homed on `/sveltekit`. So
`/cloudflare` must re-export both, with two recorded entries.

**Correction.** Add to the surface list: two `check-surface-reexports.json` entries (`IdentityResolver`
and `ResolvedIdentity`, `subpath: "/cloudflare"`, `home: "/sveltekit"`, reason "R4 closure:
`cloudflareAccess` names it on this subpath"). Without them `check:surface` fails the merge.

Two related checks that *do* pass, worth recording so the plan does not re-litigate them:

- `/cloudflare` has a `browser` condition that throws at import
  (`package.json` exports `./cloudflare`; `src/lib/cloudflare/browser.ts:4`), so pulling `jose` into
  that barrel cannot leak into a client bundle. The `browser.ts` header comment
  (`browser.ts:1-3`) names Turnstile secrets and platform bindings as the reason; it will want one
  sentence adding for the JWT verifier.
- The `/cloudflare` barrel's own scope comment (`src/lib/cloudflare/index.ts:1-5`) says "Anything
  proposed here must be a Cloudflare platform primitive itself; a third-party service verifier …
  belongs to the site". An Access JWT verifier *is* a Cloudflare platform primitive, so the spec's
  placement holds, but the plan should extend that comment to say so explicitly, or the next reader
  reads `cloudflareAccess` as the precedent-breaking entry the comment warns about.

---

### G5 (significant). The doctor's login probe asserts three things, not one, and has no way to know
the site is in identity mode.

**Claim** (spec:178-181): "Under `identity` the login probe expects the one-paragraph hand-off page
instead of the form".

**Evidence.** `liveProbeCheck` (`src/lib/doctor/check-probe.ts:18-41`) does a GET of `/admin/login`
and asserts, in order: status 200 (`check-probe.ts:46-48`), a `__Host-cairn_csrf` (or unprefixed)
`Set-Cookie` (`check-probe.ts:59-63`), a `name="csrf"` hidden field with a value
(`check-probe.ts:64-68`), and a `<form … action="…?/request">` (`check-probe.ts:69-71`), then a POST
of a random non-editor address. Under `identity`, assertions 2, 3 and 4 all fail, and the POST has
no action to post to.

Worse: the check is a CLI check with a `DoctorContext` that reads `wrangler.jsonc` and the site
config (`check-probe.ts:25-27`, `doctor/site-config-path.json`). Nothing in `wrangler.jsonc` records
that a site uses `identity`, and if `identity` lands on `AuthGuardOptions` (G2) it is in
`hooks.server.ts`, which the doctor does not parse at all. So the doctor cannot *branch*; it can only
sniff the served page.

**Correction.** State the mechanism. The workable one is: the probe fetches `/admin/login`, and if
the response carries no `?/request` form it treats the page as a hand-off page and asserts the
hand-off envelope instead (a 200 and a link to `/admin`), reporting `pass` with a different message.
That is a genuine behavior change to a shipped check and belongs in the deliverable list. The
alternative, the site declaring identity mode in `wrangler.jsonc` vars purely so the doctor can read
it, is worse and should be named as rejected.

`auth.store` (`src/lib/doctor/checks-cloudflare.ts:154-200`) needs no code change: it reads AUTH_DB
over the D1 REST API and fails on `'the editor table holds no owner-capability row'`
(`checks-cloudflare.ts:197`). The spec's claim that it "keeps its owner-row requirement" is correct.
The spec's "the check names `bootstrapOwner` as the remedy" is a *string change* at
`checks-cloudflare.ts:197`; today it names nothing. Small, but it is a deliverable, not a no-op.

---

### G6 (significant). `logoutAction`'s `requireDb` is unconditional, and it is the only thing the spec
says to "skip".

**Claim** (spec:141-143): "`logoutAction` skips the session delete (there is none), clears cairn's own
cookies if present, and redirects to `identity.logoutUrl`."

**Evidence.** `logoutAction` opens with `const db = requireDb(event.platform?.env ?? {})` at
`src/lib/sveltekit/auth-routes.ts:404`, before any cookie work. `db` is used only inside the
`if (id)` branch at `auth-routes.ts:425`. Under `identity` there is no session cookie, so `id` is
undefined and the `deleteSession` call never runs today, the function is already almost correct.

**Correction.** The behavioral delta is smaller than the spec implies: one `throw redirect(303,
identity.logoutUrl)` in place of `throw redirect(303, '/admin/login')` at `auth-routes.ts:433`, and
`requireDb` can stay (spec §item 1 keeps `AUTH_DB` required, so it cannot throw). Say that, so the
implementer does not restructure a function that carries eleven lines of load-bearing comment
(`auth-routes.ts:390-402`) for no reason. Note also that the four cookie deletes at
`auth-routes.ts:411-419` already do the "clears cairn's own cookies if present" half, unchanged.

---

### G7 (minor). The five bundled pieces and the one write point check out; two wordings do not.

**Claim** (spec:46-48): the ledger row "lists what the guard bundles (session resolution, CSRF
authority, capability resolution, security headers, the dev-backend refusal); the seam replaces
exactly one of the five".

**Evidence.** The guard's body is, in order: the dev-backend refusal (`guard.ts:92-98`), the
non-admin origin restore (`guard.ts:102-108`), the https help page (`guard.ts:116-119`), the bindings
refusal (`guard.ts:125-133`), CSRF (`guard.ts:145-173`), session resolution and capability
(`guard.ts:175-195`), security headers (`guard.ts:197`). The ledger rows cited exist:
`docs/internal/engine-rulings.md:2536` (`audit-sveltekit-createauthguard`), `:2515`
(`audit-sveltekit-requiresession`), `:431` (`isuniqueviolation-cloudflare`). The charter sentence
quoted at spec:10-12 is at `docs/internal/what-cairn-is-and-is-not.md:61-66`. The
`docs/extend/security-model.md` section "The guard's request order" is at line 207. All verified.

**Corrections, both small.**
1. The list of five omits two pieces the guard also bundles (the https help page and the non-admin
   origin restore). "Five" is the ledger's count, not the code's; keep the ledger phrasing but say
   "the five the ledger row names" so a reader diffing against `guard.ts` is not confused.
2. "the one write point" (spec:14) is accurate for reads-of-session, but the bootstrap the spec adds
   (spec:130-136) makes the guard perform its **first ever database write**. The spec half-notices
   this at :248 ("The bootstrap path is the one write the guard performs"). Elevate it: it is the
   single most reviewable thing in the design, and `web-auth-security-reviewer` should be pointed at
   it by name in the merge gate line (spec:37-38).

Also verified true, no correction: the `identity` branch's downstream contract. `resolveCapability`
(`src/lib/auth/roles.ts:83-89`) takes `(roles, role)` and returns `'none'` for an unknown name, so
the spec's "resolved exactly as today" holds; `Editor` (`src/lib/auth/types.ts:13-18`) is the four
fields the spec names; `locals.cairnAccess = access ?? {}` (`guard.ts:194`) is the shape the identity
branch must reproduce, and the spec's "sets `locals.cairnEditor` and `locals.cairnAccess` exactly as
today" is right.

---

### G8 (minor, but do not skip). The `guard.rejected` reason set is a documented contract in three
places, and `auth.identity.unknown` is a fourth.

**Evidence.** The event name union is `src/lib/log/events.ts:34`. The `guard.rejected` row in
`docs/reference/log-events.md:42` enumerates the reason values inline (`csrf`, `origin`, `https`,
`bindings`, `dev_backend_in_prod`) in the fields column, and its prose explains `hasSession` as
"presence-only, whether a session cookie arrived … since this check runs before session resolution".
`check:symbols` resolves both event names against the union.

**Correction.** Three edits, all named: add `identity` to the reason enumeration in that row's fields
column *and* its prose; add an `auth.identity.unknown` row (the spec says `email` only, good, and
consistent with `editor.bootstrapped` at `log-events.md:61` and `auth.role.unknown` at `:62`); and
reconsider spec:111-112's "`hasSession` … keeps its meaning by reading 'an identity resolved' instead
of the cookie's presence." That is **not** keeping its meaning, it inverts the documented guarantee
at `log-events.md:42` that the field never carries a resolved identity, and it is structurally
impossible anyway, since the CSRF check at `guard.ts:145` runs *before* the session/identity stage at
`guard.ts:175`. Under `identity` there is no session cookie, so `hasSession` is simply always `false`.
Either drop the field on an identity-mode rejection or keep it honestly false; do not redefine it.

---

### G9 (verified true; recorded so the plan does not re-check). The dev backend and a site mounting
both.

`examples/showcase/src/hooks.server.ts:17-33` is an if/else: the dev branch assigns
`devBackendHandle()` and the else branch assigns `createAuthGuard()`. They are never sequenced
together, so "a site that mounts both" is not a shape the template produces. `devBackendHandle`
replaces `event.platform` outright on `/admin`, `/media` and `/preview`
(`packages/cairn-cms-dev/src/handle.ts:113-127`) while spreading the existing env first
(`handle.ts:121`), and mints the owner `Editor` on `/admin` at `handle.ts:128-139`. It does **not**
set `locals.cairnAccess`. So the spec's claim at :227-230 ("its e2e build never mounts the guard (the
dev handle mints the owner)") is correct as written. One residual to note in the plan: the showcase's
own comment at `hooks.server.ts:24-27` shows the dev branch *does* sequence a second handle after the
dev one, so if a future site sequenced `createAuthGuard({ identity })` after `devBackendHandle()`,
the guard's identity branch would overwrite the dev owner and refuse every request as `unresolved`.
Worth one sentence in the extend page's posture note.

### G10 (verified true). `jose` in the integration project.

The integration project runs under `cloudflareTest` / miniflare (`vitest.config.ts:88-108`,
`wrangler.test.jsonc`, migrations applied via `src/tests/integration/_apply-migrations.ts`), and
`src/tests/integration/auth-guard.test.ts` is the canonical example of a miniflare-D1 guard test:
`import { env } from 'cloudflare:test'` at line 1, `const db = env.AUTH_DB` at line 11, an `asHandle`
shim at lines 20-28 bridging kit's `Handle` to the lighter `CairnEvent` fixture, and a `beforeEach`
truncating `session` and `editor` at lines 32-34. 675 lines today. The identity branch's integration
cases belong in a sibling file with the same harness (`./_auth-harness.js`).

`jose`'s `createRemoteJWKSet` uses `globalThis.fetch` and WebCrypto, both present in workerd, and
`access-research.md:59-77` records Cloudflare's own Workers example doing exactly this. No fetch
restriction blocks it in miniflare, but outbound fetch in the integration project would hit the real
network, so the unit-level resolver tests (spec:221-224, "a stubbed JWKS fetch") are the right home
for every `jose` case and the integration cases should use a **fake** `IdentityResolver`, never
`cloudflareAccess`. The spec already splits it this way; keep it, and say so as an acceptance
criterion so nobody adds a live JWKS fetch to the workerd project.

One thing the spec does not say and should: `jose` becomes the package's first non-content runtime
dependency in the auth path, and `docs/reference/supported-toolchain.md` is gated by
`check:target-stack` (`scripts/checks/check-target-stack.mjs`). Check whether that page's table needs
a row before promising the gate is green.

---

## Part 2, Feasibility

### Size of each change, against the files as they stand

This repo's comment density in `src/lib` runs close to 1:1 with code (see `guard.ts:80-91`, a
twelve-line comment on a four-line branch), and the conventions require it. Budget accordingly.

| Change | File today | Est. added lines (code + comment) |
|---|---|---|
| `identity` option + two interfaces | `guard.ts` 311 | 55-75 |
| Guard identity branch | `guard.ts:175-195` | 60-90 |
| Owner bootstrap in the guard | `guard.ts` | 25-40 |
| Two conditions + response arms | `conditions.ts` (25 entries), `condition-response.ts` | 45-60 |
| `auth-routes.ts` identity branch (login page, 404s, logout url) | `auth-routes.ts` ~440 | 60-90 |
| Config threading (`AuthRoutesConfig`, `CairnAdminConfig`, `cairn-admin.ts:107`) | 3 files | 20-30 |
| `cloudflareAccess` new module | new `src/lib/cloudflare/access.ts` | 100-140 |
| Barrel + reexports record + browser comment | 3 files | 10 |
| Log event + doc rows | `log/events.ts`, `log-events.md` | 5 + 2 rows |
| Doctor probe identity branch + `auth.store` message | `check-probe.ts`, `checks-cloudflare.ts:197` | 40-60 |
| **Engine subtotal** | | **~420-600** |
| New extend page | new | 220-300 |
| `docs/reference/sveltekit.md`, `cloudflare.md`, `security-model.md`, `extend/README.md`, `why-cairn.md`, `is-it-working.md` ×2 anchors, `doctor.md` | 8 files | 150-220 |
| Ruling row, CHANGELOG, api-surface regeneration | 3 files | 40 + generated |
| **Docs subtotal** | | **~420-560** |

### Test count the spec implies

- Unit, `cloudflareAccess`: the spec enumerates 8 cases (valid, wrong audience, wrong issuer,
  expired, bad signature, missing header, cookie fallback, never-throws) plus 2 construction-time
  throws (`teamDomain`, `aud`) = **10**, over a fixture RSA keypair and a stubbed JWKS fetch. New
  file, ~200 lines with the fixture.
- Integration, guard identity branch: the spec enumerates 9 (resolved+rostered, resolved+unknown,
  unresolved, bootstrap on empty roster, live revocation, CSRF cookie on first request, login load,
  the two actions, logout redirect). Drop the CSRF one per G1; add bootstrap-does-not-re-seed, and
  `locals.cairnAccess` attachment = **10**.
- Not in the spec but gated: 2 condition-registry tests (the repo has a readiness gate, not
  necessarily a unit test, verify), 1 log-redaction case for `auth.identity.unknown` (see
  `src/tests/integration/log-redaction.test.ts`), 1 doctor probe test for the identity branch.

**~24 new test cases across 3-4 new files.** That is a normal size for one of this repo's passes; it
is not what makes the pass large.

### Is one pass at ~4M tokens and six tasks the right size?

**No.** Two independent reasons, and the second is the one the sizing rule names.

1. **Six tasks does not cover the work.** Counting only what the tree forces: config threading, the
   guard branch, the bootstrap write, the conditions and their doc anchors, the magic-link surface,
   the resolver plus `jose` plus the surface records, the doctor branch, the docs arm, and the
   ruling/CHANGELOG. That is nine work units, and the spec's own deliverable list is missing three of
   them (G3, G4, G5). A six-task plan against this spec will silently fold the invisible three into
   whatever task sits next to them, which is accretion by adjacency in its textbook form.

2. **The two doors are a separate pass.** Spec §"The two doors that ride along" (:185-196) is
   docs-only work on `CairnAdminConfig.auth.send` and `BackendProvider`, discovered by a *different*
   input (the 2026-09-07 charter audit), sharing nothing with the identity seam but the extend page
   they land near. "Belong on the same extend page family" is adjacency, not dependency. They are
   cheap, which is exactly why they read as free; they are also the third thing in this spec that
   would leave the pass without changing anything else, which is the signal to split the pass rather
   than the tasks.

**Recommendation: split, and cut the doors.**

- **Pass A (this one): the generic `identity` seam.** Everything in the engine except
  `cloudflareAccess`. Ships the option, the guard branch, the bootstrap, the conditions, the
  magic-link surface, the doctor branch, and the reference docs for the interfaces. No `jose`, no new
  runtime dependency, no `/cloudflare` surface record. This is the piece the charter already
  promises, and it is releasable on its own to a site with any gate.
- **Pass B: the Cloudflare Access resolver.** `jose`, `cloudflareAccess`, the two R4 reexport
  records, the 10 unit cases, and the whole new extend page (the page is 80% Access console flow, so
  it belongs with the resolver, not the seam).
- **The two doors:** a docs-only follow-up, or fold into whichever pass next touches
  `docs/extend/README.md`. Not here.

If Geoff wants one pass anyway, the ceiling should be ~4M for **Pass A's scope alone**; A+B+doors at
six tasks and 4M will run over on the gates, not on the code. The gate surface here is unusually wide:
`check:surface`, `check:reference`, `check:reference:signatures`, `check:snippets`, `check:symbols`,
`check:readiness`, `check:docs`, `check:vale`, `check:arm-indexes`, `check:consumers`,
`check:target-stack`, plus `npm test` and `npm run check`, and G3/G4 each fail a *different* one of
those.

### Proposed task list (Pass A, five tasks; Pass B, three)

Acceptance criteria are written to be lifted verbatim into the plan.

**Pass A, the `identity` seam**

**A1. Declare the seam and thread the config.** Add `IdentityResolver`, `ResolvedIdentity`, and
`AuthGuardOptions.identity` in `src/lib/sveltekit/guard.ts`; add `identity` to `AuthRoutesConfig`
(`auth-routes.ts:42` neighborhood) and forward it at `cairn-admin.ts:107`. No behavior yet.
*AC:* both interfaces declared exactly once, homed on `/sveltekit`; `npm run check:surface` green
with a regenerated snapshot; `check:reference` and `check:reference:signatures` green with the new
`docs/reference/sveltekit.md` entries; the zero-config guard path is byte-identical (existing
`src/tests/integration/auth-guard.test.ts`, 675 lines, passes unchanged); the two-mount-point
decision from G2 is implemented and the mismatch case refuses loudly with a test.

**A2. The guard's identity branch, its two conditions, and its log vocabulary.** Replace the session
read at `guard.ts:175-195` under `identity`; register two conditions in
`src/lib/diagnostics/conditions.ts` with `docsAnchor`s written into `docs/admin/is-it-working.md`;
add the `identity` reason and `auth.identity.unknown` to `src/lib/log/events.ts` and
`docs/reference/log-events.md:42` and a new row.
*AC:* integration cases for resolved+rostered (`locals.cairnEditor` and `locals.cairnAccess` both
set, capability resolved through `resolveCapability`), resolved+unrostered (refusal page, HTML-escaped
email, `auth.identity.unknown` logged with `email` only), unresolved (refusal page naming `label`,
`guard.rejected` with `reason: 'identity'`, `detail: 'unresolved'`), and live revocation after a
roster `DELETE`; **no** CSRF-issuance change in the guard (G1); `hasSession` is not redefined (G8);
`check:readiness`, `check:symbols`, `check:docs` green.

**A3. The owner bootstrap under `identity`.** The guard's first write, via `insertOwnerIfEmpty`
(`store.ts:460`), gated on an empty roster AND the configured `bootstrapOwner.email` (normalized the
same way `auth-routes.ts:178` normalizes it).
*AC:* an empty roster plus the configured owner email inserts exactly one row and logs
`editor.bootstrapped`; a second sign-in inserts nothing; any other email against an empty roster is
refused as unrostered; a non-empty roster never writes; the email comparison uses the same
trim/lowercase as `auth-routes.ts:178`.

**A4. The magic-link surface under `identity`.** `loginLoad` hand-off page, `requestAction` and
`confirmAction` 404, `logoutAction`'s redirect target at `auth-routes.ts:433`.
*AC:* integration cases for all four; `requireDb` at `auth-routes.ts:404` is left in place and does
not throw (AUTH_DB stays required); the four cookie deletes at `auth-routes.ts:411-419` still run;
the hand-off page carries a link to `/admin` and no form; `check:prose` green on the new copy.

**A5. Doctor, docs, ruling, changelog.** `admin.login-probe`'s sniff-the-page branch
(`check-probe.ts:44-71`), `auth.store`'s remedy string (`checks-cloudflare.ts:197`),
`docs/extend/security-model.md`'s "Identity from a gate" section under the session material,
`docs/extend/README.md`'s auth list, `docs/why-cairn.md`'s identity paragraph, post-freeze note 4
closed, the `engine-rulings.md` row, `CHANGELOG.md` under `## Unreleased`.
*AC:* the probe passes against a hand-off page and against a magic-link page, with a test for each;
`check:vale`, `check:arm-indexes`, `check:docs`, `check:symbols` green; the CHANGELOG entry is
additive with no `Consumers must:` line; the ruling row passes `check:rulings-format`.

**Pass B, the Cloudflare Access resolver**

**B1.** `jose` dependency + `src/lib/cloudflare/access.ts` + the 10 unit cases.
*AC:* 10 cases pass against a fixture RSA keypair and a stubbed JWKS fetch; `resolve` never throws on
a bad token; construction throws on empty `teamDomain` or `aud`; one `createRemoteJWKSet` per
resolver instance; `check:target-stack` green (add the toolchain row if the gate demands one).

**B2.** The `/cloudflare` barrel, the two R4 reexport records, the browser-barrel comment, the scope
comment at `index.ts:1-5`.
*AC:* `check:surface` green with `IdentityResolver` and `ResolvedIdentity` recorded with
`home: "/sveltekit"`; `check:surface-leaks`, `check:package`, `check:consumers` green; the browser
build still throws at import.

**B3.** `docs/extend/sign-in-through-your-organization.md` and `docs/reference/cloudflare.md`.
*AC:* `check:snippets` green over every fenced block; `check:symbols` green (note `issueCsrfToken`,
not `issueCsrf`); the page links Cloudflare's own console steps rather than copying them; the
posture note covers service tokens, the public-path/gated-path split, and G9's sequenced-dev-handle
hazard.
