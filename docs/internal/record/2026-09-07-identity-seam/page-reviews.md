# Identity extend page reviews (2026-09-08, on fb757009)

The security read (blocking criterion) and the prose read of docs/extend/sign-in-through-your-organization.md at its first commit. Folded by the page fix round. Write-once.

---

# Security read

# Security review: `docs/extend/sign-in-through-your-organization.md` @ fb757009

Object: `/var/home/glw907/Projects/cairn-cms/.claude/worktrees/identity-seam/docs/extend/sign-in-through-your-organization.md`
as committed at `fb757009` (the file is dirty in the worktree; this review reads the committed blob only).
Checked against: the shipped contract in `src/lib/sveltekit/guard.ts` and `src/lib/sveltekit/auth-routes.ts` @ `fb757009`,
spec revision 3 (`docs/superpowers/specs/2026-09-07-identity-seam-design.md`), plan Task 5a
(`docs/superpowers/plans/2026-09-07-identity-seam-pass.md:319-362`), and the earlier lens records
(`docs/internal/record/2026-09-07-identity-seam/{spec-review,access-research}.md`).
Read-only. Line numbers are the committed file's.

## Verdict

**FIX.** Four blocking findings. One is Critical: the page states a security guarantee that is false, and
it is false in exactly the configuration the whole design exists to close. The recipe's cryptographic
core (algorithm pinning, issuer, audience, JWKS-only key selection, no clock tolerance, header-only,
single-use of `type`/`email` checks, fail-closed refusals) is sound and I found no way to forge or
replay past it. The defects are in what the page *promises* around that core, and in one
comment/code contradiction inside the recipe.

---

## Blocking

### BL-1 (Critical). "That's a request the recipe below always refuses" is false, `workers.dev` is never named, and the pointer to the remedy dangles. Lines 85-90.

Current text:

> - **A reachable, ungated origin is an open door, not a broken one.** If the Worker's hostname ever
>   serves `/admin` without the gate in front of it, every request becomes an unauthenticated
>   endpoint doing a JWT verify per request. That's a request the recipe below always refuses (no
>   header means no identity means no session), but it's still a request the origin has to spend a
>   cycle answering; the doctor's probe (below) is how you find such an origin, and your site's own
>   rate limit is the remedy once you have.

Three defects, compounding.

**a. The guarantee is false.** On an ungated hostname the attacker controls the request, so the
attacker sets `Cf-Access-Jwt-Assertion` themselves. "No header" is only the *uninteresting* case. The
recipe checks signature, `iss`, `aud`, `exp`, `type`, and `email`, and nothing else. It does not and
cannot consult Access's revocation state. So any *valid, unexpired* application token for this AUD is
accepted on the ungated hostname, by anyone holding the bytes. Concretely, the attack the spec review
already wrote up (`spec-review.md` B3): an editor is offboarded at the IdP (the natural offboarding
order, since offboarding happens at the IdP and the roster row survives a while); Access refuses them
at the gate within ~30 s; they replay the token they already hold against
`<worker>.<subdomain>.workers.dev/admin` and keep full editor capability until `exp`, which is the
Access application's session duration, default 24 hours and configurable to a month. The page tells
the operator this configuration costs them "a cycle" of CPU.

**b. The one concrete instance of an ungated origin is never named.** Spec revision 3 requires the page
to state "a `workers.dev` hostname that bypasses the gate must be disabled" (spec:248-251); plan Task
5a inherits it. `workers.dev` appears zero times on the page. This is not a hypothetical: a SvelteKit
Worker is reachable at `<name>.<subdomain>.workers.dev` by default, an Access application scoped to the
custom hostname does not cover it, and `docs/reference/doctor.md:190-197` exists specifically because
of it.

**c. "the doctor's probe (below)" points at nothing.** There is no doctor section below, or anywhere on
the page; "doctor" occurs once, here. The reader is sent to a control that the page does not contain
and does not link.

**Replacement text** (replaces lines 85-90 in full):

```markdown
- **A hostname that reaches the Worker without the gate in front of it is an open door.** The recipe
  below refuses a request carrying no assertion, but it cannot refuse a *valid* one: it checks the
  signature, the issuer, the audience, and the expiry, and Access's revocation state is not carried in
  the token. On an ungated hostname the requester supplies the header themselves, so anyone holding a
  still-unexpired token for this AUD keeps full editor capability there, an offboarded editor
  included. Two things close it. Set `workers_dev: false` in the site's wrangler config, since the
  Worker is otherwise reachable at `<name>.<subdomain>.workers.dev/admin`, which no Access application
  covers unless it was told to, and make sure every custom hostname and route that reaches this Worker
  is covered by the application. Then run `cairn doctor --probe`, whose second arm probes the
  workers.dev hostname and fails on a 200 there even when the primary hostname passes (see
  [the doctor](../reference/doctor.md)). Your site's own rate limit is worth having as well, since an
  ungated `/admin` spends an RSA verification per request, but it is the smaller half of this bullet.
```

### BL-2 (High). The revocation residual is stated only as an edge property, so the page's one number invites the wrong conclusion, and the single most important Access knob is never mentioned. Lines 229-234.

Current text ends:

> Ending the *gate's* session is the Access application's own job, and revocation there is not instant:
> Cloudflare propagates a revoked Access session within about thirty seconds.

The thirty seconds is accurate for the request path that goes *through* Access
(`access-research.md`, "Logout"; 20-30 s). It is silent on what happens at the origin, which is the
half a reader of this page has to act on. `spec-review.md` B3's fix text explicitly directs this
residual onto this page: "State the residual plainly in the extend page and in `security-model.md`."
The page's other consequence is missing entirely: because cairn mints no session under `identity`, the
Access application's session duration *is* the admin session lifetime, an operator-set value that
defaults to 24 hours and can be set to a month. The page walks the reader through creating the
application and never tells them to set it.

**Replacement text** (replaces the sentence beginning "Ending the *gate's* session", lines 231-234):

```markdown
Ending the *gate's* session is the Access application's own job, and it is not instant in either
direction. Cloudflare stops honoring a revoked Access session at the edge within about thirty seconds.
At the origin it is weaker than that: the recipe verifies a signature, an issuer, an audience, and an
expiry, never Access's revocation list, so a token already issued stays cryptographically valid to the
Worker until its own `exp`. Revocation is enforced by Access being in the request path, which is why
every hostname that reaches this Worker has to be covered by the application, and why the
application's session duration is the real admin session lifetime under `identity`, replacing cairn's
own session constant. Set it to hours, not the maximum. For removing someone who should no longer
edit right now, the roster's own delete is the stronger lever; it takes effect on their very next
request, gate session or not.
```

### BL-3 (High). Inside the recipe, the comment on the `type` check contradicts the code beneath it and misattributes what the check does. Lines 168-172.

```ts
    // A service token verifies and carries no `type` or `email` claim at all; refusing it here
    // as `no_email` keeps the roster lookup from ever seeing a token that was never a person.
    if (payload.type !== 'app') {
      return { ok: false, reason: 'invalid' };
    }
```

Three things wrong in two lines, on a page whose own line 103 tells the reader to "read it as
carefully as you would any other authentication code you commit to your own repository."

- The comment says the refusal is `no_email`; the code returns `'invalid'`.
- A service token **does** carry `type: 'app'` and does pass this check. Per
  `access-research.md` ("Service tokens vs. user identity" and the application-token field list), a
  service-token application token carries `type`, an empty `sub`, and `common_name` instead of `email`.
  It is refused two lines later by the `email` check, not here.
- Spec revision 3 assigns this check a different job: "checks `payload.type === 'app'`, refusing
  Access's team-scoped `org` session token whatever its audience says" (spec:238-239). The `org`
  token is the one thing this line exists to stop, and the comment never mentions it.

A reader who trusts the comment over the code either "fixes" the reason to `no_email` (losing the
distinct signal) or concludes the `email` check below is redundant and deletes it, which is the
service-token admission this check was believed to be preventing.

**Replacement text** (replaces lines 168-176):

```ts
    // Access issues two token shapes on the same keys: this application's token (`type: 'app'`) and
    // the team-scoped `org` session token. Only the first is a statement about this application.
    if (payload.type !== 'app') {
      return { ok: false, reason: 'invalid' };
    }
    // A service-token request verifies and carries `common_name` with an empty `sub` and no `email`
    // at all. Refusing it here keeps the roster lookup from ever seeing a token that was never a
    // person.
    if (typeof payload.email !== 'string' || payload.email.length === 0) {
      return { ok: false, reason: 'no_email' };
    }
```

### BL-4 (High). `reasonFor` switches on `err.name`, which a minified Worker bundle mangles, and no branch ever fires for the JWKS *fetch* failure the spec requires `keys` to cover. Lines 181-206, and the claim at 181-183.

```ts
// jose's error classes map onto the refusal reasons IdentityResolver declares. `keys` covers a
// JWKS fetch failure specifically, so a certs endpoint outage logs and alerts as an operator
// fault rather than reading like a wave of forged tokens.
function reasonFor(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
```

Two problems.

**a. `err.name` is not stable through a production build.** jose's error base sets
`this.name = this.constructor.name`. Vite's production default minifies with esbuild and does not set
`keepNames`, so `JWTExpired` becomes a one- or two-character identifier and every `case` misses. The
switch then falls to `default: return 'error'`, which `guard.ts:114`
(`IDENTITY_OPERATOR_FAULT_REASONS`) treats as an operator fault. The result is the exact inversion the
page's own paragraph at 212-215 warns against: an ordinary expired token pages the operator at `error`
level, and the "these three are operator faults, these four are routine" split the page teaches never
appears in the logs. jose's own guidance is to branch on `err.code` or `instanceof errors.X`; `code` is
assigned as an own instance property holding a string literal, so a minifier cannot touch it.

**b. `keys` never covers a fetch failure.** `JWKSTimeout` fires only on jose's own abort. A network-level
failure reaching `<team>.cloudflareaccess.com/cdn-cgi/access/certs` (DNS, connection reset, a Workers
subrequest failure) propagates as a `TypeError` out of `fetch`, hits `default`, and returns `'error'`.
So the comment at 181-183 ("`keys` covers a JWKS fetch failure specifically") is false as written, and
plan Task 5a's criterion "the per-class `reason` set ... with `keys` covering a JWKS fetch failure"
(plan:337-339) is not met. Both reasons are operator faults in the engine, so nothing opens; what is
lost is the diagnosis, on the one failure class the page singles out as needing to not read like an
intrusion.

**Replacement text** (replaces lines 181-206):

```ts
// jose's error codes map onto the refusal reasons IdentityResolver declares. Branch on `code`, never
// on `name`: jose derives `name` from the class name, which a minified production bundle renames,
// while `code` is a string literal on the instance. `keys` covers every way the certs endpoint can
// fail, including a network failure that surfaces as a bare TypeError from fetch, so a certs outage
// logs and alerts as an operator fault rather than reading like a wave of forged tokens.
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

---

## Non-blocking

1. **`cooldownDuration: 5_000` is 6x below the reviewed value.** Line 133. `spec-review.md` S12
   prescribed `cooldownDuration: 30000`, with the reason that it bounds a `kid`-rotating flood's
   refetches of Cloudflare's certs endpoint. Five seconds still bounds it (12 refetches a minute), and
   nothing on the page explains the deviation. Either restore `30_000` or state why 5 s.
2. **The CORS bullet gives a weaker reason than the real one.** Lines 83-84 say enabling Access CORS
   "only widens what a compromised script could reach." The reason that actually matters, from S11 and
   `src/lib/sveltekit/csrf.ts:209-211`: Access answers preflights for the gated path itself, so
   enabling its CORS settings can make `X-Cairn-CSRF` settable cross-origin and collapse the guard's
   header witness. As written, an operator trading this away for an unrelated integration has no idea
   they are disabling cairn's CSRF defense. Suggested: "Access answers preflights for the gated path
   itself, so enabling them can make the `X-Cairn-CSRF` header settable cross-origin and collapse the
   CSRF witness the admin guard relies on. cairn's admin is same-origin and needs no CORS."
3. **The construction check does not catch the unreplaced placeholder.** Lines 116-123: `AUD` is
   checked for `length === 0`, but the shipped literal is
   `'replace-with-your-applications-aud-tag'`, which passes. A copy-paste deploy locks out the entire
   roster with an `audience` refusal on every request. Fail-closed, so not blocking, but cheap to
   close: `if (AUD.length === 0 || AUD.startsWith('replace-with-')) throw ...`.
4. **`error` is missing from the operator-fault list.** Line 212 names `audience`, `issuer`, and
   `keys`. `guard.ts:114` also treats `error` as an operator fault, and the recipe's `default` branch
   returns it. Add it, so the reader's alerting matches the engine's log levels.
5. **The header-vs-cookie rationale is directionally right but imprecise.** Lines 138-141 say the
   header "is what Access itself attaches to a request it has already gated, so trusting the cookie
   would accept a replayed token the gate did not just issue." Both values are equally replayable to an
   ungated origin. The accurate reason (spec-review B3): Access attaches the header only on paths it
   proxies, while `CF_Authorization` is a browser-attached bearer value replayable on any hostname
   reaching the same Worker and settable by hand. Worth using B3's wording, since BL-1 now depends on
   the reader understanding this.
6. **The Access hierarchy gotcha is absent.** `spec-review.md` N5 and `access-research.md` §4: rules
   resolve most-specific-first (hostname/path, then Worker-level, then account-level), and removing a
   more specific rule silently falls back to a broader one or to none. One sentence in the path-coverage
   bullet.
7. **The module-scope `throw` takes down the whole Worker, not just `/admin`.** Lines 118-123 run at
   import. In a Worker a top-level throw fails every request on the site, public pages included, with a
   1101. That is fail-closed and fine, but the symptom is worth naming so an operator recognizes it as a
   wiring typo rather than an outage. (The `createRemoteJWKSet` call at line 131 is safe at module
   scope: it performs no I/O until first use, so the Workers global-scope I/O restriction is not
   engaged. Noted because S12's fix text asked for construction inside the resolver.)
8. **The rate-limit remedy names no mechanism.** Line 90. `spec-review.md` N8 asked for
   `resolveRateLimit` (`src/lib/cloudflare/rate-limit.ts`) by name.
9. **No link to jose's docs.** Plan Task 5a's acceptance criteria: "no sentence explains JWTs, JWKS, or
   `jose` itself (Cloudflare's and jose's docs are linked)." Cloudflare's are linked; jose's are not.
   The block's comments do lean toward explaining `timeoutDuration`/`cooldownDuration`/`cacheMaxAge`,
   which is defensible since S12 required the rationale, but a link to
   `https://github.com/panva/jose` would let the comments shrink.
10. **The Cloudflare doc URLs look pre-reorg.** Lines 17, 19, 23, 25, 52 use
    `/cloudflare-one/policies/access/`, `/cloudflare-one/identity/idp-integration/...`, and
    `/cloudflare-one/identity/one-time-pin/`. The research gathered from Cloudflare's live docs uses
    `/cloudflare-one/access-controls/policies/`,
    `/cloudflare-one/integrations/identity-providers/entra-id/`, `.../generic-oidc/`, and
    `/cloudflare-one/access-controls/applications/http-apps/self-hosted-apps/`. Old paths usually
    redirect, but verify before shipping; a dead link on the one page that says "follow Cloudflare's own
    steps" costs the reader the whole procedure.
11. **Google Workspace as "a generic OIDC provider" is both unverified and, read against the safety
    section, ambiguous.** Line 22-23 tells the reader to wire Workspace through the generic OIDC
    connector; line 55-56 tells them never to enable "a generic OIDC connection whose `email` claim the
    end user can edit." The qualifier does the work for a careful reader, but the two sentences sit 30
    lines apart and point the same word in opposite directions. `access-research.md` flagged this as the
    one inconclusive area and recommended a direct dashboard check; Cloudflare's IdP list has carried a
    native Google / Google Workspace option historically. Two fixes, both cheap: verify whether the
    dedicated connector exists and prefer it, and add one clause at line 56, "a Workspace connection
    configured against Google's own endpoints asserts a directory-owned address and is fine; the
    warning is about an OIDC provider that lets its users set their own profile email."
12. **`/admin?/logout` in the path-coverage bullet may send the operator hunting.** Line 80-81. Access
    application paths match on path, not query string, so `/admin` already covers `/admin?/logout`. The
    instruction is harmless but reads as though a query-bearing rule is needed. Suggest: "and the
    shell's form actions, which post to `/admin` itself with a query string Access does not match on, so
    covering `/admin` covers them."
13. **Logout could target the app domain for a snappier UX.** Line 144 uses the team-domain logout.
    `access-research.md` notes the app-domain variant (`https://<your-site>/cdn-cgi/access/logout`)
    clears the cookie from that domain immediately while the team-domain variant clears the global
    session. Both revoke across applications; not a security difference. Optional.

---

## Verified sound

Recipe, line by line:

- **Header-only, no cookie fallback.** Line 147 reads `Cf-Access-Jwt-Assertion` and nothing else;
  `CF_Authorization` appears only in the prose explaining why it is not read. Satisfies spec B3's
  ruling and `spec-review.md` N1.
- **`jwtVerify` pinning.** Lines 157-163: `issuer` is `https://${teamDomain}`, `audience` is the AUD
  tag, `algorithms: ['RS256']`. Algorithm confusion and `alg: none` are closed. `exp`/`nbf` are enforced
  by jose once those options are passed.
- **No `clockTolerance`.** Confirmed absent, with the reason stated (both clocks are Cloudflare's).
  jose defaults to 0.
- **JWKS-only key selection.** `jwtVerify(assertion, JWKS, ...)` resolves keys from the remote set; a
  token's own `jwk`/`jku`/`x5u` headers are never consulted. The comment at 154-156 says exactly that
  and is accurate.
- **`createRemoteJWKSet` constructed once**, with all three of `timeoutDuration`, `cooldownDuration`,
  `cacheMaxAge` explicit (the value of one is contested; see non-blocking 1). Module scope is safe here
  because construction does no I/O.
- **Team domain as a bare hostname, validated at construction.** Lines 111-120 reject a scheme or a
  slash and explain the doubled-`https://` lockout Cloudflare's own samples invite.
- **AUD tag, not the application id.** Stated at lines 30-32 and again at 115, and validated non-empty.
- **`type === 'app'` and a non-empty-string `email`.** Both present and in the right order (see BL-3 for
  the comment). The email check is what refuses a service token, correctly.
- **The resolver never throws.** `jwtVerify` is the only throwing call and is wrapped; `reasonFor` cannot
  throw; the header read cannot throw. And the guard wraps `resolve` in its own try/catch anyway
  (`guard.ts:293-305`), so a site that breaks this still gets a refusal, not a 500.
- **Return shapes match the shipped contract exactly.** `{ ok: true, email }` against `ResolvedIdentity`
  (`guard.ts:90-100`) and `{ ok: false, reason }` against `IdentityRefusal` (`guard.ts:103-110`, whose
  `reason` is `string`, so `reasonFor`'s return type typechecks and a site's own word is admissible).
  `logoutUrl` is an `https:` absolute URL, which passes `validateLogoutUrl` (`guard.ts:134-157`).
  `label` is optional and the recipe's value matches the engine default.
- **Every-request posture** stated at 209-210, and true: `guard.ts:287-294` calls `identity.resolve` on
  every non-public admin path, and no session is minted.
- **No token in a URL, no token rendered.** The recipe never logs, never renders, and never redirects
  with the assertion. The reason strings are log-only, matching `guard.ts:306-315`.

Prose, against the shipped code and the spec:

- **The login-methods section** (44-58) carries spec revision 3's required content: the email claim as
  the entire join, only methods proving control of the address, the weakest-enabled-method floor with
  the correct mechanism (same `aud`, verifies identically), OTP as the sanctioned break-glass, and the
  explicit never on social IdPs and user-editable OIDC email claims. A reader following it lands safe,
  with the one ambiguity in non-blocking 11.
- **The migration step** (34-42) is accurate: `guard.ts:328-336` looks up the normalized proven email
  and renders the unknown-identity condition on a miss, whatever the person's standing.
- **Two admission lists, no group-to-role mapping** (62-68) matches spec decision 2 and
  `access-research.md`'s finding that groups are not reliably in the JWT.
- **The 50-user cap** (69-71) matches the research; the research itself flags that the number came from
  non-developer-docs sources, which the page's phrasing does not overclaim.
- **Seed the first owner before enabling `identity`** (72-76) is exactly right and the reason given is
  the shipped one: `requestAction` 404s before reaching `bootstrapOwner` (`auth-routes.ts:175`,
  `:40-42`).
- **No cache rule on `/admin`** (77-78) is the right control; the engine already sets
  `Cache-Control: private, no-store` on every guarded response
  (`src/lib/sveltekit/admin-response.ts:46`), and a Cache Rule overrides origin headers by
  configuration, which is why this belongs on the page.
- **Path coverage** (79-82) covers `/admin`, subpaths, `/admin/__data.json`, the form actions, and
  correctly excludes `/preview/<token>`, matching `spec-review.md` N5.
- **The local-development warning** (91-95) is the strongest bullet on the page: it names the exact
  failure (a dev branch inside `resolve` shipping to production), states why the guard's own dev-flag
  refusals cannot see it, and points at the showcase's build-time swap.
- **The roster paragraph** (222-227) is true against `guard.ts:337-350`: role and capability come from
  the roster row, the resolver returns no role, and a roster add takes effect on the next request.
- **Logout** (229-231) is true against `auth-routes.ts:443-473`: cookies cleared, no session delete,
  redirect to the validated `logoutUrl` snapshot.
- **The tier** (236-241) matches spec:108-111 and the plan.
- **The generic contract** (243-249) is accurate: `identity` takes any `IdentityResolver`, and nothing
  in the guard's branch is Cloudflare-specific.
- **The two doors** (251-272) are one section each, within the plan's bound, and the `BackendProvider`
  section correctly teaches no second backend.
- **Not machine-verified** is stated in one sentence at 99-104, as the plan required.

---

# Prose read

# Prose review: docs/extend/sign-in-through-your-organization.md @ fb757009

**Audience:** the extend track's Svelte-fluent developer building an organization's site on cairn's
seams (`docs/internal/docs-register.md`, "The extend track"). **Register:** contract-first task and
concept prose; fluent in their own stack and resents padding or hand-holding on it. **Floor:**
Google developer documentation style (Vale), plus the register's universal contract and the
vendor-link rule. **Plan constraints (Task 5a):** no sentence explains JWTs, JWKS, or `jose`
itself, with Cloudflare's and jose's docs linked instead; the stability tier stated; no em dashes;
the plan's section order followed.

## Deterministic floor

`tellgrader --register docs`: 1670 words, 80 sentences, **cadence CV 0.54** (healthy variance, no
flat-cadence finding), **0.60 tells per 1000 words**. Zero soft slop, zero tricolon hits, zero em
dashes (confirmed independently by grep). One finding: `bold-lead-bullets` at line 61.

Structure check: the page follows the plan's listed order exactly (assumption, Access route,
roster migration, login methods, operating instructions, recipe, operator-fault alerting, roster
role, logout and revocation lag, stability tier, any other gate, the two doors at one section
each). Every listed section is present, and each earns its place. No scaffold headers, no
participial or connector openers, no marketing vocabulary. The page's core is strong: the
reasoning is cairn's own throughout, the Cloudflare console is linked rather than copied, and the
security prose in "Which login methods are safe" is the best writing on the page.

---

## Blocker

**1. `docs/extend/sign-in-through-your-organization.md:89`, a cross-reference that points at
nothing, in a sentence that does not finish.**

> the doctor's probe (below) is how you find such an origin, and your site's own rate limit is the
> remedy once you have.

Nothing below on this page mentions the doctor; `doctor` appears exactly once in the file. The
probe lives in another track (`docs/reference/doctor.md`, `--probe` / `admin.login-probe`;
`docs/admin/is-it-working.md#probe-the-deployed-admin`). The trailing clause is also
ungrammatical: "once you have" wants an object. A reader who follows "(below)" and finds nothing
stops trusting the page's other pointers. Rewrite:

> The doctor's live probe finds such an origin (`cairn-doctor --probe`, see
> [is it working](../admin/is-it-working.md#probe-the-deployed-admin)). Your site's own rate limit
> is the remedy once you have one.

**2. `sign-in-through-your-organization.md:212-215`, the operator-fault split drops a reason the
seam actually emits.**

> `audience`, `issuer`, and `keys` are operator faults [...] `missing`, `invalid`, `expired`, and
> `no_email` are request-shaped

The recipe's own `reasonFor` returns `error` as its default (line 204), and the seam classifies
`error` as an operator fault alongside `audience`, `issuer`, and `keys`. The page's two lists
together account for seven of the eight reasons and silently lose the eighth, which is the one a
reader most needs alerted, since it is the catch-all for an unrecognized failure. The omission
also flatters the sentence into a tricolon it has not earned. Rewrite:

> `audience`, `issuer`, `keys`, and `error` are operator faults: each one means every request from
> every editor is about to be refused, not just this one, so alert on them rather than reading
> them as routine sign-in noise.

**3. `sign-in-through-your-organization.md:251-254, 265, 267`, "door" already means something else
in this track, and the header uses it to name the page's own anatomy.**

> ## Two more doors
> Two more seams solve problems adjacent to this one, each covered here in one section since a
> reader replacing sign-in is likely evaluating the whole auth surface at once.
> ### A backend other than GitHub [...] `BackendProvider` [...] as the backend door

Across `docs/extend/organize-your-admin-nav.md:62`, `docs/extend/restrict-admin-access.md:138`, and
`docs/reference/sveltekit.md` (six occurrences), a **door** is an admin nav sidebar entry. This
page repurposes it to mean a seam. The extend track's vocabulary contract bans nothing and bans
imprecision, and this is the imprecise case: the same reader meets both senses. Separately, the
header is a coined metaphor naming the page's own structure, the exact shape the register killed
in "The four arms," and the following sentence explains the page's own scoping decision to the
reader, which the universal contract's "no prose about the docs' own writing" forbids. Rewrite:

> ## Two adjacent seams
> A reader replacing sign-in is usually evaluating the whole auth surface, so two neighbouring
> seams follow.

**4. `sign-in-through-your-organization.md:99-104`, contributor-zone process vocabulary shipped to
a published page.**

> so this repo's own doc gate cannot typecheck the block against a real copy of `jose` [...] Its
> verification logic is proven by this pass's security review alone, never by an automated check

"This repo's own doc gate" and "this pass's security review" are cairn's internal process; the
extend reader has no idea what a pass is, cannot see the gate, and gains nothing from either. The
register scopes gate names and internal vocabulary to the contributor zone. The fact the reader
needs is that the block is unverified code they own. Rewrite:

> The recipe below is application code you write and own. cairn ships no OIDC client and does not
> depend on `jose`, so nothing in cairn typechecks this block against the real library or verifies
> its logic for you. Read it as carefully as any other authentication code you commit.

**5. `sign-in-through-your-organization.md:26-28`, the page narrating its own editorial policy.**

> Follow Cloudflare's own steps for whichever IdP you use; they change the console layout more
> often than this page could track, so this page states the concepts and links the current
> instructions rather than reproducing them.

The first clause is the instruction and is worth keeping. The second half is the page explaining
why it is written the way it is, which the universal contract forbids outright. Rewrite:

> Follow Cloudflare's own steps for whichever IdP you use; their console layout changes faster
> than any copy of it here would stay true.

**6. Plan acceptance criterion unmet: jose's docs are never linked.**

Task 5a requires "no sentence explains JWTs, JWKS, or `jose` itself (Cloudflare's and jose's docs
are linked)". Five Cloudflare links ship (lines 17, 19, 23, 25, 52); `jose` is named at lines 100,
101, 108, 127, and 181 with no link anywhere. Add one at the recipe's lede, on the first bare
mention:

> cairn ships no OIDC client and does not depend on [`jose`](https://github.com/panva/jose).

**7. `sign-in-through-your-organization.md:61`, `tellgrader`: half or more of the bullets open with
a bolded lead phrase (8 of 8).**

Carried from the scanner as reported. Context for the decision, not an argument against it: the
pattern has house precedent in this same track (`docs/extend/architecture.md`,
`docs/extend/render-safety.md`, `docs/extend/migration-notes.md`), and the plan itself specifies
these as an enumerated list of operating rules. If it is kept, the first bullet is still the one
to convert: it runs seven lines with an embedded parenthetical justification and is a concept
paragraph wearing a bullet's clothes.

## Warning

**8. `sign-in-through-your-organization.md:229`, brand casing break.**

> Cairn mints no session under `identity`

The only sentence-initial capitalized "Cairn" in the file, and the extend track has none anywhere
else. The page itself writes "cairn cannot tell" (line 56) and "cairn's roster" (line 36).
Rewrite: "cairn mints no session under `identity`, so its own logout has nothing to end."

**9. `sign-in-through-your-organization.md:233`, an unlinked vendor timing figure.**

> Cloudflare propagates a revoked Access session within about thirty seconds.

This is exactly the specific the vendor-link rule quarantines: a number cairn does not control,
that drifts silently, and that a reader trusts because it looks precise. Either link Cloudflare's
own statement of it or drop to the shape that stays true. Rewrite:

> Revocation there is not instant; Cloudflare propagates a revoked Access session on its own
> schedule.

**10. `sign-in-through-your-organization.md:223-225`, setup colon plus a sentence-final
elaborative tail.**

> `resolve` never returns a role, and the guard never asks it for one: the identity seam and the
> roster stay two separate systems on purpose, so authorization has exactly one source of truth,
> the same one it has today.

Three ideas in one sentence, the colon doing payoff duty, and "the same one it has today" bolted
on as the elaborative tail the register bans regardless of the punctuation carrying it. Rewrite:

> `resolve` never returns a role, and the guard never asks it for one. The identity seam and the
> roster stay two separate systems, so authorization keeps the single source of truth it has today.

**11. Page-wide diction tics: `own` 30 times, `already` 9 times, and the `X, not Y` appositive 10
times in 1670 words.**

Three of the nine "already"s land in the opening paragraph alone (lines 4, 5, 7: "already runs",
"already trusts", "already does"), which is where a skimming reader forms their impression. The
`X, not Y` tail (lines 31, 40, 70, 85, 99, 115, 119, 128, 213) is individually defensible and
collectively a signature. `tellgrader` does not count either. Thin each by roughly half; the
opening paragraph is the priority:

> By default, cairn is the editors' identity system: an email arrives with a link, and clicking it
> proves who someone is. An organization that runs its own identity on Google Workspace or
> Microsoft Entra ID is then maintaining a second one alongside the directory it already trusts.

## Suggestion

**12. `sign-in-through-your-organization.md:154-156`, the one place the page explains the reader's
own stack.**

> and never consults a token's own `jwk`, `jku`, or `x5u` header, which would let a forged token
> nominate its own trust anchor.

Naming the property is load-bearing and stays. The relative clause explains a JWT-spec attack to a
reader the plan says already knows it. Cut to: "and never consults a token's own `jwk`, `jku`, or
`x5u` header." A security reviewer who wants the rationale kept is a legitimate override.

**13. `sign-in-through-your-organization.md:231`, italicized `*gate's*` is spoken emphasis; the
contrast is already carried by the sentence's structure. Drop the italics.

**14. `sign-in-through-your-organization.md:47-49`, "and however many" is filler inside a 41-word
sentence. Rewrite: "Every login method an Access application enables produces a token that verifies
identically and carries the same audience, so the application's guarantee is only as strong as its
weakest enabled method."

**15. `sign-in-through-your-organization.md:271-272`, a restated ending: "the interface itself
names no second implementation, and none ships with cairn today" says one thing twice. Keep the
second clause.

**16. `sign-in-through-your-organization.md:270`, "`connect(env)`s to a live `Backend`" verbs a
call signature awkwardly. Rewrite: "and `connect(env)` returns a live `Backend` when a route needs
one."

---

## Verdict

**Fix, 11 findings (7 Blocker, 4 Warning, 5 Suggestion).** The prose reads as a competent human
engineer's throughout, with genuine cadence variance and no machine slop; what fails is register
discipline at the seams (internal process vocabulary, a repurposed product term, self-narration)
plus two factual defects a careful reader would catch.
