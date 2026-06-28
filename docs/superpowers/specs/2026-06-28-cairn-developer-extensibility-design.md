> **SUPERSEDED (2026-06-28), WRONG SCOPE MODEL, KEPT AS HISTORY ONLY.** This design built an
> identity/permissions substrate (a `Principal` model, scopes, an `admin`/`member` trust tier, an
> `authorize` callback, a session-minting `signIn`, member login) into the cairn engine. That is out of
> cairn's scope: cairn owns a small owner/editor identity and gets out of the way; it is not an
> auth/identity, membership, or permissions platform. The phase-1 implementation was reverted. The
> canonical truth is the charter: `CLAUDE.md` "What cairn is" and
> `docs/internal/what-cairn-is-and-is-not.md`. Extensibility will be re-derived lean against the charter.
> Do not treat anything below as current.

# cairn developer extensibility: design and rationale

Status: design draft, 2026-06-28. Source of truth for the implementation plans that follow. This is
the next major initiative after the Contract v2 rollup (`0.76.0`), and it lands in the breaking
pre-1.0 window, before adoption, ahead of a stable 1.0.

This draft is hardened: it incorporates an eight-lens adversarial review, a dedicated web-auth
security review, a MembershipWorks requirements survey, and an investigation of the proof site's real
authentication. The findings and how they were folded in are in the appendix, "How this spec was
hardened."

The goal: let a developer launch a content-managed site fast on cairn, then build custom, D1-backed
functionality on top of it (custom admin screens, member-facing app routes) while reusing one identity
and staying on the update path. The extension surface becomes a narrow, versioned, *enforced* stability
contract that cairn evolves its internals behind, so an engine update never breaks a customization
built on the seam.

This design supersedes the reserved-but-inert Plan 09 seam (`AdminPanel`, `composeRuntime`'s
`adminPanels`/`fieldTypes` slots). That seam is retired, not finished. See "What this retires."

## Who this serves, and the one steer that shapes everything

The persona is a developer already committed to Svelte/SvelteKit and Cloudflare who wants cairn for
content management, then needs to append custom functionality and keep pulling cairn updates without
rework. cairn does not court a non-Svelte or non-Cloudflare universe, and it does not try to be Astro
or a general app framework.

That single commitment is the design's biggest lever. The mature extensible CMSs (Payload, Sanity,
Strapi, Directus) register custom components into the CMS and dispatch them through a bespoke plugin
runtime, because those CMSs are *not* the host framework. cairn *is* a SvelteKit app. So the seam can
be far thinner than the field's: it leans on what SvelteKit and Cloudflare already give a developer
(routing, `load`/`actions`, `platform.env` bindings, the session cookie) instead of wrapping them.
A custom admin screen is the developer's own SvelteKit route; auth reuse is a composable SvelteKit
primitive; custom data is a D1 binding the developer reads directly. cairn supplies the chrome, the
identity, the nav entry, and an enforced boundary, then gets out of the way.

The competitive research that grounds this design is in
[`docs/internal/2026-06-28-extensibility-competitive-research.md`](../../internal/2026-06-28-extensibility-competitive-research.md).
Three findings are load-bearing:

- The git-backed CMSs closest to cairn (Keystatic, Decap) gate login on git-host access and offer
  **no documented way to reuse that login on a developer's own routes.** cairn's same-domain session
  is genuinely differentiated. The closest precedent anywhere is Directus's same-domain httpOnly
  cookie read server-side, which maps almost exactly onto cairn's model.
- Extension-API stability across the field is informal and fails badly: Sanity blocks upgrades with
  npm peer-dependency errors, Decap publishes no stability statement, Strapi keeps admin auth and
  end-user auth as two systems with no bridge. An **enforced** boundary that fails **loud at build
  time** beats all of them.
- Framework coupling is industry-normal (Keystatic's admin is React inside Next/Astro). cairn's
  tighter Svelte-only coupling is a defensible feature, not a limitation to hide behind a portability
  layer.

## The decisions this design locks

Settled during the brainstorm and the review, 2026-06-28:

1. **Auth reuse extends to site members, not only editors.** cairn's identity grows from "editors
   only, `/admin` only" into a general identity system that also logs in members.
2. **Unified principal, developer-owned profiles.** cairn owns minimal identity (email + session +
   scopes + a trust tier). The developer owns all member profile and domain data in their own D1, keyed
   by the principal. cairn never owns a membership schema.
3. **Membership is conferred by a developer authorize callback.** Login (email verification) is open;
   authorization (custom scopes) is developer-granted from their own D1.
4. **Pure primitives; the site builds the membership product.** cairn ships the extensibility
   substrate. The proof site builds signup, dues, renewals, the directory, and member-only areas on it.
   cairn does not become a membership platform.
5. **A custom admin screen is the developer's own SvelteKit route**, not a component registered into a
   cairn-owned dispatcher.
6. **Magic-link is cairn's only built-in authenticator. cairn ships no other auth scheme.** A guarded
   server-only `signIn(verifiedEmail)` seam lets a developer complete login from any mechanism they
   verify (Google OAuth, passkeys, SSO). cairn ships no OAuth providers, no password storage, and no
   passkey ceremonies. Developers bring a variety of auth schemes through the seam.
7. **Two login tiers, one principal model.** A session carries a trust tier (`admin` or `member`) set
   at mint time. `admin:*` scopes are granted only to an admin-tier session whose email is in the editor
   allowlist; custom scopes are granted to any tier by the authorize callback. The proof site exercises
   both tiers: board/core-volunteers authenticate with Google through `signIn` into an admin-tier
   session, members authenticate with magic-link into a member-tier session.
8. **The extension surface is enforced, not merely documented**, and versioned: stable within a major,
   a major-version event to break, locked at 1.0.

## The identity foundation

Today cairn has an `editor` (`email`, `displayName`, `role: 'owner' | 'editor'`), a `session` row, and
a `magic_token`, with the guard resolving a session only under `/admin/**` and populating
`locals.editor`. This generalizes into a principal model.

### The principal

A principal is the same email + display name + session, carrying a **set of scopes** rather than a
single role:

```ts
interface Principal {
  email: string;
  displayName: string;
  scopes: string[];          // e.g. ['admin:editor'], ['member'], ['member:gold', 'admin:owner']
  tier: 'admin' | 'member';  // the session's trust tier (see "Sessions and the trust-tier partition")
}
```

cairn's built-in scopes are `admin:owner` and `admin:editor`, the existing editor roles, used to gate
`/admin` and content management. Developers declare additional scopes by string. One person can hold
both admin and member scopes within one admin-tier session.

`role -> scope` is a **breaking shape change, not a shim** (review SF1). The single `role` field is
replaced everywhere it appears: `locals.editor` becomes `locals.principal`; `requireSession`/
`requireOwner` keep their names but read the principal; the `LayoutData.user.role` field, the ~40
git-commit-attribution call sites reading `editor.role`/`editor.email`, the `canManageEditors ===
role==='owner'` check, and the consumer's `app.d.ts` augmentation all move to the principal. The exact
mapping is a documented, security-tested function, because it gates owner-only editor management:
`admin:owner` derives `role: 'owner'`, `admin:editor` derives `role: 'editor'`, and when both are held
`owner` wins. There is one identity object on `locals` (`principal`), with the editor role derived from
it; no dual-write. The `@glw907/cairn-cms/ambient` subpath is extended to declare `locals.principal`,
so existing sites pick it up from the import they already use.

### Two login tiers, one principal model

The proof site has two real populations that authenticate differently, and the model serves both
through one principal:

- **Board / core-volunteers (admin tier).** They authenticate with Google (a Google Workspace SSO the
  site already uses). The *site* runs the Google OAuth dance, verifies the `id_token`, and calls cairn's
  `signIn(event, verifiedEmail, { tier: 'admin' })`. Because that email is in the editor allowlist, scope
  resolution grants `admin:*` to the admin-tier session.
- **Members (member tier).** They authenticate with cairn's built-in magic-link through the site's own
  signup/login UI. They are not in the editor allowlist, so they get only the custom scopes the authorize
  callback returns (`member`, `member:gold`), in a member-tier session.

cairn ships no Google code. The Google verification lives in the site, and `signIn` is the one cairn
primitive it calls. This is the "developers bring a variety of auth schemes" decision made concrete.

### Sessions and the trust-tier partition

One same-domain session model serves both tiers, but a `session` row carries an `auth_tier`
(`'admin' | 'member'`) set when the session is minted (review security Blocker 1). The partition is
structural:

- The tier is set by the verification flow's intent, not by allowlist membership. The member
  verification paths (the site's magic-link signup/login, and `signIn` called with the default member
  tier) mint **member-tier** sessions. The admin verification paths (the editor magic-link login at the
  admin login route, and `signIn` called with `tier: 'admin'` for an admin-intent flow such as the
  board's Google login) mint **admin-tier** sessions.
- Scope resolution grants `admin:*` **only** to an admin-tier session whose email is in the editor
  allowlist. A member-tier session never carries `admin:*`, even when its email is in the allowlist,
  until the person re-authenticates through an admin path. So an allowlisted board member who logs in
  through the member portal gets a member-tier session with no admin power, which is the intended
  explicit-elevation behavior. The allowlist remains the true admin gate; the tier is the
  defense-in-depth that stops a member session (and any XSS riding it) from escalating.
- The `/admin` guard requires an admin-tier session carrying `admin:*` scope. It no longer gates on
  session presence. A self-onboarded member who reaches `/admin` is redirected to login.

The payoff is the property the shared-cookie model otherwise lacks: a cross-site-scripting bug on a
member route, riding the member's cookie, resolves to member scope only and cannot drive `/admin`
requests. This holds the line that the most blast-radius-prone code (a developer's hand-written member
route) cannot reach the GitHub-App commit pipeline. One cookie keeps the "person who is both a board
member and a club member" case simple: they authenticate once through the admin path and their
admin-tier session carries both `admin:*` and `member` scopes. A separate admin cookie (enabling
`SameSite=Strict` on admin) is noted as a future hardening, not required for 1.0.

### Scope resolution: live, lazy, and with a failure contract

On each request where identity is needed, cairn resolves the session and computes scopes by combining
two sources:

- **Built-in editor authorization.** If the session is admin-tier and the email is a provisioned
  editor, grant its admin scopes. This is the existing live-role read, preserved.
- **The developer authorize callback.** cairn calls `authorize({ email, platform })`, which reads the
  developer's own D1 and returns the custom scopes to grant. It returns `[]` for a verified-but-
  unentitled email.

```ts
auth: {
  authorize: async ({ email, platform }) => string[],   // custom scopes; [] grants nothing
}
```

Three contract rules the freeze requires (review Blocker 3):

- **Lazy on `/admin`.** A request that needs only `admin:*` scopes resolves them from the editor
  allowlist and **does not call `authorize()`**. The developer's D1 code is invoked only when a
  non-admin scope is actually requested. This keeps third-party code off the admin login hot path that
  two production sites depend on.
- **Bounded and fail-closed.** The engine wraps `authorize()` in a try/catch and an engine-owned
  deadline constant (mirroring `tidyTimeoutMs`), not a callback parameter. A throw or timeout resolves
  to **built-in scopes only**: editor authorization is preserved, custom scopes are denied. Never a
  500, never a silent grant.
- **Observable.** A throw or timeout emits an `auth.authorize.failed` log event (see "Observability").
  The contract documents: the callback must not throw for control flow; it returns `[]` to deny.

Resolution is live per request, matching cairn's current live-role read, so the moment the site writes
a paid-member record the next request reflects `member` scope with no re-login, and the moment dues
lapse or an editor is demoted the next request reflects the loss (see "Session lifecycle"). Scope
resolution runs only when identity is needed: under `/admin`, and elsewhere only when the developer
calls `loadPrincipal`/`requireScope`.

### Session lifecycle: rotation, fixation, revocation

The open-login flow makes session lifecycle security-critical, and the spec states it normatively
(review security High 3, completeness G3):

- **Fixation.** Every successful authentication (magic-link confirm and `signIn`) mints a fresh
  session id and deletes any prior session row for that browser. Scopes are resolved from the email on
  the session row, so a fresh id on every auth prevents a pre-seeded id from later carrying a victim's
  elevated scopes.
- **Elevation rotation.** A privilege elevation rotates the session id. A privilege reduction does not
  need rotation because resolution is live.
- **Revocation is live-only.** Removing a custom scope (the developer deletes their member record) takes
  effect on the next request through live resolution; cairn does not kill the session row for a
  developer-owned scope change, and the contract states so. Editor removal continues to delete sessions
  for that email, as today. Any future resolved-scope cache must bound staleness against revocation
  with an engine-owned short TTL, framed explicitly as a revocation window; absent that, there is no
  cache and resolution is live every request (the correct default for cairn's revocation-sensitive,
  small-site posture).

### Composable gating on any route

cairn exports four primitives on the extension surface:

```ts
loadPrincipal(event): Promise<Principal | null>   // resolve the session on ANY route (the Directus readMe analog)
requireScope(event, scope: string, opts?): Principal   // gate a route; redirect or 403 if the scope is absent
requireAnyScope(event, scopes: string[], opts?): Principal   // gate on holding any one of several scopes
hasScope(principal, scope: string): boolean   // non-throwing predicate for conditional UI/logic
```

Scope matching is **opaque exact-match** (review SF4): `requireScope('member')` matches a principal
holding `member`, and a principal can hold both `member` and `member:gold` to match both. The `:`
separator is not hierarchical, so `requireScope('admin')` does not match `admin:editor`; ask for the
exact scope. `requireAnyScope` and `hasScope` are the ergonomic complements, shipped in v1 so a
developer is not forced to hand-roll OR-matching.

The guard's contract is a stated invariant (review SF3): it **enforces** only under `/admin` (an
admin-tier session with `admin:*` scope), and it **populates** `locals.principal` lazily. It never
calls `resolveSession` in the handle unless the session cookie is present ("no session cookie, no D1
query," a gate-tested property). `loadPrincipal(event)` triggers resolution off `/admin`, memoized per
request. The cairn guard composes ahead of the consumer's own `handle` via `sequence()`, with cairn
first; the ordering is pinned because member routes compose with cairn identity.

### Login mechanisms: magic-link built-in, `signIn` seam

cairn owns the session, not the verification mechanism. Magic-link is the built-in, documented
authenticator. The reusable pieces, with exact signatures settled before the freeze (review SF5):

```ts
sendMagicLink({ email, redirectTo, platform }): Promise<void>
// issue a single-use token, send the link via the EMAIL binding

confirmMagicLink(event): Promise<Response>
// consume the token, mint a fresh session of the issuing flow's tier, set the __Host- cookie,
// redirect to a validated same-origin target

signIn(event, verifiedEmail, opts?: { tier?: 'admin' | 'member' }): Promise<void>
// mint a principal session for an already-verified email. tier defaults to 'member'; pass 'admin' for
// an admin-intent flow (admin:* still requires the email to be in the editor allowlist). Performs NO
// email verification: the caller MUST have done it.
```

`sendMagicLink` and `confirmMagicLink` stop being welded to `/admin/login` and `/admin/auth/*`; the
site builds its own signup and login UI and calls them. `signIn` is the seam for any non-magic-link
mechanism: the site verifies an email (a Google `id_token` signature plus its `email_verified` claim,
a passkey ceremony) and calls `signIn`. The contract states, in normative language, that the caller
MUST have cryptographically verified the email and MUST check `email_verified`, and names the
anti-patterns (reading an email from an unverified `id_token`, or from a request parameter) as
account-takeover bugs. `signIn` is a server-only export (a `.server`-suffixed module or an enforced
server guard) so it can never be bundled to the client.

Security hardening travels with the auth handlers, not with the `/admin` path prefix (review security
High 4). Today CSRF double-submit, the HTTPS check, and the `AUTH_DB`-presence check live inside the
guard's `isAdminPath` branch; moving login off `/admin` would strip them. Instead: CSRF double-submit
applies to any unsafe request that carries a session cookie, regardless of path; the magic-link and
`signIn` handlers embed their own HTTPS and `AUTH_DB`-presence checks; and the loads that render member
login/signup forms issue the CSRF token. Protection follows the audited path.

### Abuse control on the now-public login

Opening login to any email turns `sendMagicLink` into an email-bomb and enumeration vector the editor
allowlist previously foreclosed (review security High 5, completeness G8). The contract requires, as a
1.0 item, not a later optimization:

- A **per-IP rate limit** on `sendMagicLink` (a Cloudflare Rate Limiting rule, or a D1/KV/Durable
  Object counter keyed by IP plus email), in addition to the existing per-email cooldown.
- A stated token/session row-growth posture under spray (sweep-on-write is insufficient against many
  distinct emails).
- The throttled response collapses into the neutral "sent" response on the public path, so no
  per-address in-flight-login signal leaks.

### Redirect validation and cookie attributes

`redirectTo` rides the magic-link URL and the confirm handler, so it is validated by URL parse against
`PUBLIC_ORIGIN` and accepted only when it resolves to the same origin, never by substring or prefix
match (review security Medium 6). The validator rejects protocol-relative (`//host`), backslash
variants, `userinfo@` tricks, and percent-encoded bypasses; the reference cites the OWASP Unvalidated
Redirects guidance.

The session cookie keeps the `__Host-` prefix, `httpOnly`, `secure`, `SameSite=Lax`, and an explicit
`Max-Age`. `SameSite=Lax` is sufficient because every state-changing operation is a CSRF-protected
POST, never a GET (review security Medium 7). A future per-tier cookie split would let the admin cookie
use `SameSite=Strict`; it is noted, not required for 1.0.

### The session cookie is one same-domain identity

The session is the same `__Host-` cookie the editor login already uses, same-domain, so one login works
across `/admin` and every member route. This is the Directus same-domain pattern, and it is the
capability cairn's closest peers lack.

### `resolveSession` no longer inner-joins the editor table

Today `resolveSession` is `... FROM session s JOIN editor e ...`, an inner join, so a session whose
email is not in the editor table resolves to `null`. Under the new model that would silently log out
every member (review SF2). The new resolution reads the session row to its email and tier without the
editor join, then left-joins the editor table for admin scopes (admin tier only) and calls
`authorize()` for custom scopes. A no-editor email with empty custom scopes is a valid scopeless
principal, not `null`. This change is front-loaded in phase 1 with a test that mints a non-editor
session.

## The admin-screen seam

A custom admin screen is the developer's own SvelteKit route. They add, in their own repo:

```
src/routes/admin/ops/assets/+page.svelte
src/routes/admin/ops/assets/+page.server.ts
```

SvelteKit route specificity means a concrete segment route always beats cairn's `/admin/[...path]`
catch-all, so the screen wins with **zero dispatch machinery in cairn** and no collision. The
developer's `load`, their form `actions`, and their component are all native and fully typed. Their
`+page.server.ts` sets `export const prerender = false` (a sibling static route does not inherit the
catch-all's setting), so a session-gated screen is never baked at build time.

cairn supplies three thin primitives, no more:

1. **The chrome, against a published contract type, not an internal one.** cairn exports an `AdminShell`
   component whose prop is a new, minimal, `./extend`-owned `AdminShellData` (review Blocker 1):

   ```ts
   interface AdminShellData {
     siteName: string;
     principal: Principal;
     nav: AdminNavItem[];     // resolved, scope-filtered
     branding: AdminBranding;
     activePath: string;
     csrf: string;
     mode: 'office' | 'document';   // explicit, default 'office'
   }
   ```

   The internal `LayoutData` (with `pendingEntries`, `NavConcept`, the cookie-pref scheme, the single
   `role`) stays internal; an internal loader projects it to `AdminShellData`. The shell takes an
   explicit `mode` prop instead of the current path-segment-count heuristic, which otherwise strips the
   sidebar from a three-segment route like `/admin/ops/assets`. The screen's `load` calls a published
   `adminShellLoad(event)` helper for the data and `requireScope(event, 'admin:editor')` to gate; the
   component renders `<AdminShell {data}>{ the screen's UI }</AdminShell>`. The snippet contract is
   decided now (a typed `children` snippet), because retrofitting argument passing post-1.0 is itself a
   break. The shell subpath is added to `check:package` and `check:extension-surface`, and the spec
   names the dist-`.svelte`/`lang=ts` packaging path (`transpile-dist-svelte.mjs`, the Svelte peer
   floor) the published component must clear.

   The shell owns the chrome a11y contract (completeness G5): the single `<main>` landmark, the
   skip-link target, and the navigation landmark are the shell's; the developer's screen supplies only
   the content inside `<main>` and must not add a second `<main>`. The shell moves focus to the content
   region on client navigation into a custom screen. The explicit `mode` prop removes the heuristic that
   silently dropped the nav landmark.

2. **The auth gate.** `requireScope(event, 'admin:editor')` (or a custom scope) in the screen's `load`.
   The guard already requires an admin-tier session across `/admin`, so the scope check refines from
   there.

3. **A data-only nav registration with a build-time integrity gate.** The adapter gains a serializable
   admin-nav declaration:

   ```ts
   admin: {
     nav: [
       { label: 'Assets', icon: 'boxes', href: '/admin/ops/assets', scope: 'admin:editor', group: 'Operations' },
     ],
   }
   ```

   cairn renders these in the sidebar, showing each entry only to a principal holding its `scope`. No
   function crosses `load`, so the `unknown`-typed seam problem never appears. A dead `href` would
   otherwise render a live link to a 404, so the build cross-checks every `admin.nav[].href` against the
   actual route tree and fails on a dead link (review SF6). `cairn-doctor` is the redundant secondary,
   narrowed to what a static preflight can actually see (see "The doctor's real reach").

**Custom data is the developer's, directly.** They declare their D1 (and R2, Queues, whatever) in
`wrangler.jsonc`, type it in their own `app.d.ts`, and read `event.platform.env.DB` in their
`+page.server.ts`. cairn never proxies, wraps, or sees their schema, which is what lets the schema
evolve freely.

## Member-facing routes and content gating

Member self-service lives under the site's own paths (`/account`, `/members`, `/join`), not `/admin`.
A gated route calls `requireScope(event, 'member')` in its `load`; a public route (signup) calls
nothing. This covers a member portal, gated resource pages, member-only downloads, and the
renew/profile screens, all as ordinary SvelteKit routes on the primitives above. `requireScope`
redirects an unauthenticated visitor to a login path, which defaults to `/admin/login` for admin scopes
and is an option for member scopes (the site points it at its own member login).

The signup sequence that replaces MembershipWorks self-signup:

1. A prospective member hits the site's public signup route and verifies their email through
   `sendMagicLink`, getting a scopeless member-tier session.
2. They choose a membership level and pay dues through the site's own Stripe flow; the site writes a
   member record to its own D1.
3. The `authorize` callback now sees that record and grants `member` scope. A scopeless principal cannot
   reach `/admin` or any `requireScope('member')` route, so the gap between "verified email" and "paid
   member" is safe by construction.

**Gating cairn's own content entries is out of scope for this initiative.** The MembershipWorks survey
confirmed the proof site does not need it: its gated surfaces are the directory and the account/
registration *app features* (site-owned member routes), not member-only markdown posts or pages. Gating
a first-class cairn content entry fights cairn's prerender-everything-static delivery model and needs
its own access design, deferred as a future content-access initiative. If a member-only article is ever
wanted, the clean answer within this model is to render it on a site-owned member route that reads the
markdown and gates it, rather than cairn growing per-entry ACLs.

## The enforced public boundary and the upgrade contract

This is where cairn leads the field. Documented-only boundaries drift and fail silently. cairn's answer
is an enforced boundary that fails loud at build time.

### One named extension surface

The entire extension contract lives behind a single new subpath, `@glw907/cairn-cms/extend`:

- identity: `loadPrincipal`, `requireScope`, `requireAnyScope`, `hasScope`, `Principal`,
  `sendMagicLink`, `confirmMagicLink`, `signIn`, `forgetPrincipal`;
- the admin shell: `AdminShell` and `adminShellLoad`, against the `AdminShellData` contract type;
- the contract types: `AdminNavItem`, `AdminBranding`, and the `authorize` callback type.

A customization imports everything it depends on from one place, and that single barrel *is* the
versioned contract. cairn refactors every internal behind it. The adapter additions (`auth.authorize`,
`admin.nav`) are part of the contract too, since the adapter is the developer's contract.

### Enforce internal privacy with the mechanism that actually enforces it

The boundary is enforced by the wildcard-free `exports` allow-list (review Blocker 2). Node refuses any
subpath not listed (`ERR_PACKAGE_PATH_NOT_EXPORTED`), and modern TypeScript resolution errors on it
too, so a consumer cannot import `@glw907/cairn-cms/auth/store`. The allow-list is hardened with
explicit `"./internal/*": null` blocks to make intent loud, and truly private code is omitted from
`files`/`.npmignore` (the only airtight form, since `exports` does not stop an absolute or relative-path
import, the one honest residual gap the spec names rather than hides).

The spec drops the earlier claim that un-muting `attw`'s `internal-resolution-error` rule enforces the
boundary. It does not: that rule only checks whether imports inside cairn's own shipped `.d.ts`
resolve, not what a consumer imports. `attw` stays in the gate for type correctness of the public
surface only.

### A loud-failure gate that classifies the change

A new `check:extension-surface` gate, sibling to `check:reference`, snapshots the `./extend` contract
(its exported symbols and their types). It does not merely diff: it requires the diff to be marked
additive or breaking and fails an unmarked breaking-shaped change (a removed export, a narrowed type)
(review Consider). This closes the gap that `check:version`'s size-marker rule can wave a breaking
export through as a patch. Pre-1.0 the marking is advisory bookkeeping; its value is that the discipline
exists before the lock.

### The versioning promise and the doctor's real reach

Within a major version, `./extend` is stable; breaking it is a major-version event. Pre-1.0 it can still
change. At 1.0 it locks. Because the boundary is enforced, a removed or changed export surfaces as a
consumer compile error, not a silent runtime failure, which answers the Contract v2 "seven breaking
releases with silent failure modes" pain the extending-developer lens flagged.

`cairn-doctor` is a static, repo-local preflight with no D1 binding and no running Worker (completeness
G2). Its extension check is therefore narrowed to what it can actually decide: the `admin.nav` shape,
each `href` against the on-disk route tree (redundant with the build gate above), and the adapter
wiring. It cannot validate a runtime `scope`, because scopes are minted at request time by the
developer's `authorize()` reading their D1, which the doctor never executes. A developer who wants a
runtime self-check can mount a dev-only health route that has `platform` access; the spec does not
attribute scope validation to the static doctor.

## Observability

cairn requires a log event for every diagnosable code path, and event names are themselves a frozen
public contract ([`docs/reference/log-events.md`](../../reference/log-events.md)). This initiative adds
the highest-stakes new paths in the codebase, so it names their events in the same pre-1.0 window as the
type surface (completeness G1):

- `auth.authorize.failed` (the callback threw or timed out; fields: editor email, error or `timeout`).
- `auth.signin` (a session minted through the `signIn` seam; fields: email, resolved tier).
- `auth.scope.denied` (a `requireScope`/`requireAnyScope` denial off `/admin`, the member-route analog
  of the existing `/admin`-only `guard.rejected`; fields: email, requested scope, path).
- the existing magic-link events extended to carry the resolved tier.

Scopes are treated as non-secret operational data and may be logged (they name membership tiers like
`member:gold`, which are low-sensitivity); the records continue to carry an email for attribution and
never a token or session id, consistent with the current redaction stance.

## Data protection

Opening login to any email means cairn's own D1 (`session`, `magic_token`) now accumulates identity rows
for arbitrary members of the public, a different data-protection posture than the handful of trusted
editors today (completeness G4). The boundary is stated: the developer owns profile data; cairn owns
email, session, and scopes. cairn exports a `forgetPrincipal(platform, email)` primitive that deletes
its own identity rows for an email, so a site can honor a deletion request across both stores. The
contract states what cairn retains and that deleting a developer's member record does not by itself
remove cairn's identity rows (the site calls `forgetPrincipal` for that).

## Testing strategy

The new surface spans two test environments, and the plan names the split so it is not discovered ad
hoc (completeness G6). The identity logic (principal, scope resolution, the `authorize` failure
contract, `requireScope`, `resolveSession`, session lifecycle) is tested in the node integration
harness alongside the existing auth tests. The published `AdminShell` is a Svelte component, so it gets
a consumer-build smoke test: the showcase imports `@glw907/cairn-cms/extend`, mounts the shell, and
renders, proving the dist-`.svelte`/Vite-8 transpile path holds for the new subpath (the hazard this
repo has hit twice). The role-to-scope mapping and the admin-tier partition get dedicated security
tests, including "scope removed mid-session, next request denied" and "member-tier session cannot reach
`/admin`."

## What this retires

- The `AdminPanel` type with its `unknown`-typed `load`/`actions`/`component` members, and the
  `CairnExtension.adminPanels` slot. Replaced by the developer's own routes plus the data-only
  `admin.nav` registration.
- The `composeRuntime` collection of `adminPanels`/`fieldTypes` onto the runtime, which nothing
  dispatched.
- The hardcoded inert `extensionGroups` stubs in the admin sidebar, replaced by scope-gated rendering of
  the real `admin.nav` registration.

## What this deliberately does not do

Named so they are not half-built:

- **No gated cairn content entries.** A separate content-access design.
- **No `FieldTypeDef` / custom content field types.** A different extension axis (the editor form),
  deferred. The Contract v2 `fields.*` primitive library is the foundation a later design would build on.
- **No membership domain feature in cairn.** The site builds tiers, dues, renewals, the directory, and
  event registration on the primitives.
- **No auth scheme beyond magic-link in cairn.** No password auth, no OAuth providers, no passkey
  ceremonies, no Google integration. Magic-link is built in; every other scheme rides the `signIn` seam
  in the site's own code.
- **No cross-domain session reuse.** Same-domain only, like Directus.
- **No runtime content database or query layer.** A custom feature owns its own D1 directly; cairn's
  content backend stays build-time over the manifest.

## Phasing

One design spec now (this), phased implementation plans written just-in-time. The phases split along
verification surfaces, isolating the high-blast-radius auth change first. Phase 1 is treated as a
security change with its own test gate before phase 2 proceeds.

1. **Identity foundation.** The principal and `auth_tier`; the `resolveSession` change (SF2); live,
   lazy, fail-closed scope resolution with the `authorize` contract (B3); session lifecycle (rotation,
   fixation, revocation); `loadPrincipal`/`requireScope`/`requireAnyScope`/`hasScope`; the guard
   resolving identity everywhere while `/admin` requires an admin-tier `admin:*` session; CSRF/HTTPS/
   `AUTH_DB` checks traveling with the auth handlers off `/admin`; per-IP rate limiting on the public
   login; `sendMagicLink`/`confirmMagicLink`/`signIn`/`forgetPrincipal`; the role-to-scope mapping and
   the `./ambient` extension; the new log events; and the `@glw907/cairn-cms/extend` subpath plus the
   `check:extension-surface` gate, so later phases add to an already-enforced contract. The dev package
   (`@glw907/cairn-cms-dev`), which hardcodes `locals.editor`, is updated to mint a principal in this
   phase.
2. **The admin-screen seam.** `AdminShell` + `adminShellLoad` against `AdminShellData`; the `mode` prop;
   the a11y contract; the data-only `admin.nav` registration; the build-time `href` integrity gate; the
   scope-gated sidebar; the consumer-build shell smoke test; and retiring the inert `AdminPanel`/
   `composeRuntime` plumbing.
3. **Upgrade-contract polish and proof.** The narrowed `cairn-doctor` extension check, the
   versioning-contract docs, the existing-site migration story, and the validation gate below.

Documentation rides along as a pass dimension: reference pages for `./extend`, guides ("build a custom
admin screen", "add member login and signup", "bring your own auth scheme through `signIn`"), and an
explanation page for the extension contract.

## Proof and success criteria

The validation gate is the aksailingclub SvelteKit rebuild (`~/Projects/aksailingclub-sveltekit`)
replacing both MembershipWorks and the ops dashboard on cairn's primitives, exercising both login tiers
(investigation and MembershipWorks survey, completeness G7):

- **Officer back-office (admin tier, well-grounded by the handbook).** Board/core-volunteers
  authenticate with Google: the site verifies the Google `id_token` and calls `signIn` with
  `tier: 'admin'`, and because the email is in the editor allowlist, scope resolution grants `admin:*`.
  Staff manage assets, waitlists, and
  members through custom `/admin` screens that reuse the `AdminShell` chrome, the `admin.nav` entry, and
  `requireScope('admin:editor')`. This exercises `signIn` admin-capability, the admin-screen seam, and
  the nav registration.
- **Member self-service (member tier, grounded by the MembershipWorks survey).** Members authenticate
  with magic-link, sign up, choose a level, pay dues, renew, and reach a member portal through the
  site's own routes gated by `requireScope('member')`, with scopes from the `authorize` callback reading
  the site's D1. This exercises the member-grade principal, the authorize callback, and member-route
  gating.
- One principal model serves both tiers; a member-tier session cannot reach `/admin`; the site takes a
  cairn update without reworking its customizations; and any attempt to break the `./extend` contract
  fails `check:extension-surface` rather than reaching a consumer silently.

Two surfaces ship designed-but-not-proof-exercised by this site, named so 1.0 does not lock something
nothing ran: a non-Google `signIn` mechanism (passkey/SSO), and member-only content gating (deferred).
The migration of the two existing 0.68.x sites (ecxc-ski, 907-life) is a second proof: each crosses
from editor-only to the principal model with an explicit, documented "Consumers must" list (the
`./ambient` re-import, the `locals.editor` to `locals.principal` change, the dev-package bump, any
`data.user.role` consumer) and no hidden hand-applied steps.

## Relationship to prior work

- Contract v2 (`0.76.0`) is the foundation: `defineAdapter` gains `auth.authorize` and `admin.nav`, and
  the `./extend` subpath joins the export map alongside `./islands`, `./render`, and the rest.
- The islands client-mount pattern is not reused here. Admin screens are full SvelteKit routes, not
  mounted components.
- The extending-developer lens
  ([`docs/internal/extending-developer-lens.md`](../../internal/extending-developer-lens.md)) is the
  persona and the four sub-lenses this design answers: extend the dashboard (the admin-screen seam),
  reuse the editor login (the principal model and `loadPrincipal`/`requireScope`), depend on an enforced
  boundary (the `./extend` contract and its gate), and upgrade smoothly (the versioning promise and
  loud-failure enforcement).

## How this spec was hardened

The first draft passed an eight-lens adversarial review (research-grounded critique, three-vote
verification, 20 surviving findings), a dedicated web-auth security review (two blockers, four highs),
a MembershipWorks requirements survey, and an investigation of the proof site's authentication. The
material changes from that pass:

- The admin shell freezes a new minimal `AdminShellData`, not the internal `LayoutData`, with an
  explicit `mode` prop and a stated a11y contract (Blocker 1, G5).
- The enforced boundary is credited to the `exports` allow-list, not the `attw` un-mute, which does not
  enforce it (Blocker 2).
- The `authorize` callback gets a fail-closed, bounded, observable contract and runs lazily off the
  admin path (Blocker 3).
- The auth generalization is named a breaking shape change with an exact role-to-scope mapping (SF1),
  and `resolveSession` drops the editor inner join so members are not silently logged out (SF2).
- Sessions carry a trust tier; `/admin` gates on an admin-tier `admin:*` session, not session presence,
  so a member-route XSS cannot reach admin (security Blocker 1).
- `signIn` stays in v1, admin-capable, with a normative verification contract, because the proof site's
  board tier authenticates with Google through it (investigation; overrides the review's defer-`signIn`
  recommendation).
- Session lifecycle, CSRF/HTTPS/`AUTH_DB` traveling with the auth path, per-IP rate limiting, redirect
  validation, observability events, `forgetPrincipal`, and the testing split are all specified (security
  Highs, G1, G4, G6).
