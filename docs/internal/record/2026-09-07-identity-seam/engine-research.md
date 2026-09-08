# Engine research: the admin identity path, for a `resolveEditor` seam on `createAuthGuard`

Read-only survey of `~/Projects/cairn-cms` at `main` (package version 0.96.0). All paths absolute
under `/var/home/glw907/Projects/cairn-cms/`.

## A. The guard, end to end (`src/lib/sveltekit/guard.ts`)

Imports that matter: `resolveSession` from `../auth/store.js` (guard.ts:5), `sessionCookieName`
from `../auth/crypto.js` (guard.ts:6), `resolveCapability`/`DEFAULT_ROLES` (guard.ts:11),
`canReach`/`hasAccessRule`/`targetFromRouteId` (guard.ts:12), `applySecurityHeaders` (guard.ts:8).

Public-path predicate, guard.ts:25-27:

```ts
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname.startsWith('/admin/auth/');
}
```

`isAdminPath` (guard.ts:29-31) is `/admin` exactly or a `/admin/` prefix.

### `AuthGuardOptions` in full (guard.ts:33-63)

```ts
/** Configuration for `createAuthGuard`: the site's declared role vocabulary and access map. */
export interface AuthGuardOptions {
  /**
   * The site's declared role vocabulary (see `defineRoles`); omitted, the guard resolves every
   *  session against the implicit owner/editor pair, so a zero-config site sees no behavior change.
   */
  roles?: RolesDeclaration;
  /**
   * The site's declared access map (see `defineAccess`); omitted, the two enforcement points read
   *  it differently. The engine's own screens, gated through {@link requireEngineAccess}'s
   *  `canReach` check, stay open to any editor-capability session, so a zero-config site sees no
   *  behavior change there. A `requireAccess` call on a site's own route reads the opposite way:
   *  with no map at all, it has no opinion on any target and refuses every session, owner
   *  included, since that helper's contract is a route that opted in but found nothing.
   */
  access?: AccessMap;
  /**
   * Pin every sibling subdomain to HTTPS along with the admin host itself, on the
   * Strict-Transport-Security header the guard attaches to each admin response it returns.
   * Omitted or false, that header carries only `max-age`, so a zero-config site sees no behavior
   * change. `max-age` is sent either way: the admin surface is the one place the engine has
   * standing to insist on HTTPS, while pinning every sibling subdomain the engine knows nothing
   * about is a decision that belongs to whoever owns the domain, so it stays off unless the site
   * opts in.
   *
   * A rejection page and the login redirect carry no such header at all, deliberately: neither
   * receives this option, and a weaker header would replace a pinned policy rather than restate
   * it (see {@link applySecurityHeaders} and `brandedAdminPage`).
   */
  includeSubDomains?: boolean;
}
```

### `createAuthGuard` request order (guard.ts:73-200)

1. Closure setup, guard.ts:74-76: `vocabulary = opts.roles ?? DEFAULT_ROLES`, `access = opts.access`,
   `includeSubDomains = opts.includeSubDomains`.
2. Dev-backend tripwire, guard.ts:92-98. Reads `CAIRN_DEV_BACKEND` from both `platform.env` and
   `process.env`; set in a deployed runtime returns a bare 503 and logs
   `guard.rejected { reason: 'dev_backend_in_prod' }`.
3. Non-admin branch, guard.ts:102-108. Restores kit's Origin check for unsafe form posts
   (`guard.rejected { reason: 'origin' }`), then `resolve(event)` with **no** security-header pass.
4. HTTPS help page, guard.ts:116-119. `http:` and non-local host, on any admin path including the
   public ones, renders `edge.https-not-forced` (`reason: 'https'`).
5. **The AUTH_DB refusal, guard.ts:125-133**, the load-bearing one for the new seam:

```ts
const env = event.platform?.env ?? {};
if (!env.AUTH_DB) {
  log.error('guard.rejected', { reason: 'bindings', conditionId: REASON_CONDITION.bindings, path: pathname });
  return renderConditionResponse(REASON_CONDITION.bindings);
}
```

   It refuses **every** admin path, public login and confirm included, before any session work.
   The stated rationale (guard.ts:121-124) is that the gated views cannot resolve a session and a
   login/confirm POST would 500 in its action. A `resolveEditor` site that mints no sessions and
   provisions no D1 would be refused here unless this check becomes conditional on the resolver's
   absence.
6. CSRF, guard.ts:145-173. Header witness (`x-cairn-csrf`) decides outright when sent at all;
   otherwise the double-submit form field, body cloned. On failure it logs `guard.rejected`
   `{ reason: 'csrf', path, detail, witness, hasSession }`, where `hasSession` is a presence-only
   read of the session cookie name derived through `csrfSecure` (guard.ts:161-163). This CSRF stage
   runs on public admin paths too and is independent of how identity is resolved.
7. **Session resolve, guard.ts:175-195**, the entire block a `resolveEditor` option would replace:

```ts
if (!isPublicAdminPath(pathname)) {
  const id = event.cookies.get(sessionCookieName(csrfSecure({ url: event.url, platform: event.platform })));
  const editor = id ? await resolveSession(env.AUTH_DB, id, Date.now()) : null;
  if (!editor) throw redirect(303, '/admin/login');
  if (!Object.hasOwn(vocabulary, editor.role)) {
    log.warn('auth.role.unknown', { email: editor.email, role: editor.role });
  }
  event.locals.cairnEditor = { ...editor, capability: resolveCapability(vocabulary, editor.role) };
  event.locals.cairnAccess = access ?? {};
}
```

   - The cookie is read by name only, `sessionCookieName(secure)` (crypto.ts:13-15, base
     `cairn_session`, `__Host-` prefixed when secure).
   - `resolveSession` returns an `EditorRow` (`{ email, displayName, role }`, store.ts:45) with no
     capability; the guard is the one that fills `capability` via `resolveCapability` and spreads.
   - An unknown role authenticates at `none` capability and only logs `auth.role.unknown`
     (guard.ts:186-188).
   - A null resolve is a bare `redirect(303, '/admin/login')` with no log record, by design
     (security-model.md:225-226).
   - `locals.cairnAccess = access ?? {}` deliberately, so an absent value means "the guard never ran
     on this route" (guard.ts:190-194).
8. Response hardening, guard.ts:196-198: `applySecurityHeaders(response.headers, { includeSubDomains })`
   on every admin response the guard returns. Refusal pages and the login redirect get no such
   header (guard.ts:57-61).

### Guard-adjacent helpers (same file)

- `requireCookieJar` guard.ts:212-220.
- `requireSession` guard.ts:226-230: reads `locals.cairnEditor`, else redirect to `/admin/login`.
- `requireOwner` guard.ts:235-239: `capability !== 'owner'` -> 403.
- `requireEditor` guard.ts:248-252: `capability === 'none'` -> 403. A `none` session still carries a
  populated `locals.cairnEditor` and passes through the `CairnAdminShell` custom-route seam.
- `requireEngineAccess` guard.ts:268-272 and `requireAccess` guard.ts:302-311, both emitting
  `auth.access.denied`.

Everything downstream of the guard reads `locals.cairnEditor` only. It never re-reads the cookie and
never calls `resolveSession` again. Grep of engine reads: `src/lib/sveltekit/admin-action.ts:212`,
`src/lib/sveltekit/cairn-admin.ts:242`, `src/lib/sveltekit/content-routes-media.ts:500,647`,
`src/lib/sveltekit/content-routes-shell.ts:141,302` (through `requireSession`). The types live at
`src/lib/ambient.ts:40,43` and `src/lib/sveltekit/types.ts:85,88`.

## B. The magic-link routes (`src/lib/sveltekit/auth-routes.ts`)

`AuthRoutesConfig` auth-routes.ts:33-43:

```ts
export interface AuthRoutesConfig {
  branding: AuthBranding;
  send?: SendMagicLink;
  bootstrapOwner?: { email: string; displayName: string };
}
```

`AuthRoutes` (the returned handlers) auth-routes.ts:440-446: `loginLoad`, `requestAction`,
`confirmLoad`, `confirmAction`, `logoutAction`.

Cookie names and TTLs: session cookie base `cairn_session` (crypto.ts:6), CSRF base `cairn_csrf`
(crypto.ts:18), pending-login base `cairn_login_pending` (auth-routes.ts:82). `TOKEN_TTL_MS` 10 min
(crypto.ts:64), `SESSION_TTL_MS` 30 days (crypto.ts:67), `SEND_COOLDOWN_MS` 60 s (crypto.ts:70).

- `requestAction` auth-routes.ts:153-237. `requireOrigin(env)` + `requireDb(env)` (so AUTH_DB is
  mandatory). Mints/reuses the pending nonce cookie before branching (auth-routes.ts:172), runs the
  `bootstrapOwner` insert (auth-routes.ts:178-181), `findEditor`, the per-email cooldown with
  `rebindToken` (auth-routes.ts:191-214), `issueToken` + `send`. Logs `auth.link.requested`,
  `editor.bootstrapped`, `auth.token.rebound`, `auth.token.minted`, `auth.link.send_failed`.
- `loginLoad` auth-routes.ts:247-254 and `confirmLoad` auth-routes.ts:261-269: both issue the CSRF
  token; `confirmLoad` sets `Referrer-Policy: no-referrer`.
- `confirmAction` auth-routes.ts:298-367. `requireDb`, consumes the token against the pending nonce
  hash, then `generateSessionId()` + `createSession(db, id, email, now + SESSION_TTL_MS, now)`
  (auth-routes.ts:330-331), deletes the pending cookie, **sets the session cookie**
  (auth-routes.ts:341-348, `path:'/'`, httpOnly, `secure` from `csrfSecure`, `sameSite:'lax'`,
  `maxAge` 30 days), rotates the CSRF cookie (auth-routes.ts:364-365), redirects to `/admin`.
- `logoutAction` auth-routes.ts:403-434. `requireDb` first (so a resolver-only site with no AUTH_DB
  would throw here). Deletes **both** name forms of the session and CSRF cookies plus the pending
  cookie, then best-effort `deleteSession`, logs `auth.session.destroyed` / `destroy_failed`,
  redirects to `/admin/login`.

### How `/admin?/logout` is served

`createCairnAdminInternal` (`src/lib/sveltekit/cairn-admin.ts:99`) builds the auth routes at
cairn-admin.ts:107 and exposes `logout: viewAction('logout', anyView, (event) => auth.logoutAction(event))`
(cairn-admin.ts:275). `anyView` (cairn-admin.ts:258) includes login and confirm, so an editor signs
out from anywhere. The shell's form posts to the absolute catch-all:
`src/lib/components/CairnAdminShell.svelte:949`, `<form method="POST" action="/admin?/logout" class="mt-4">`
(rationale comment at CairnAdminShell.svelte:12). `logout` is in the narrowed public
`CairnAdminRoutes` action list (cairn-admin.ts:385).

### `CairnAdminConfig.auth`

`src/lib/sveltekit/cairn-admin.ts:34-62`:

```ts
export interface CairnAdminConfig {
  auth?: Partial<AuthRoutesConfig>;   // branding, send, bootstrapOwner
  tidy?: ContentRoutesConfig['tidy'];
  navFilter?: ContentRoutesConfig['navFilter'];
  attention?: ContentRoutesConfig['attention'];
  preview?: ContentRoutesConfig['preview'];
}
```

`branding` defaults from the runtime (cairn-admin.ts:102-106); the three auth members are threaded
into `createAuthRoutes` at cairn-admin.ts:107. There is **no** identity/session seam here today.

## C. The roster and the first owner

### The store (`src/lib/auth/store.ts`, published as `/auth-store`)

- Schema-level: `editor` (email PK, `display_name`, `role`, `created_at`), `magic_token`, `session`,
  plus additive `preview_tokens` (store.ts:314-320).
- **Email normalization is a store-level invariant**, stated at store.ts:5-10 and applied in every
  function via `normalizeEmail` (store.ts:35-37, trim + lowercase). `editor.email` is a
  BINARY-collated TEXT PRIMARY KEY, so a non-normalized row is unreachable but still counts toward
  the last-owner guards. Any `resolveEditor` result must normalize its email the same way to match a
  roster row.
- `findEditor` store.ts:52-58 (the lookup a resolver would most plausibly reuse to map an external
  identity onto a role).
- `resolveSession` store.ts:223-233: joins `session` to `editor` so the **role is read live**; an
  expired session or a removed editor resolves null, revoking on the next request. A resolver path
  loses that live-revocation join unless it does its own roster read.
- `deleteSession` store.ts:246-252 (`RETURNING email, expires_at`).
- Last-owner guards: `deleteEditor` store.ts:383-413, `removeOwnerIfNotLast` store.ts:425-452,
  `setEditorRole` store.ts:496-523, `demoteOwnerIfNotLast` store.ts:533-556. Each folds the owner
  count into one atomic statement over `ownerRoles` (from `resolveOwnerLevelRoles`,
  `src/lib/auth/roles.ts:108-111`), never the literal string `'owner'`.
- `insertOwnerIfEmpty` store.ts:460-475: atomic `INSERT ... WHERE NOT EXISTS`.
- Removal cascade deletes the editor's `session` and `magic_token` rows plus minted preview tokens
  (store.ts:407-411). Under a resolver, deleting an editor row would no longer cut live access on
  the next request unless the resolver itself consults the roster.

The public `/auth-store` barrel (`src/lib/auth-store/index.ts:10-24`) exports only the provisioning
half: `listEditors`, `insertEditor`, `deleteEditor`, `setEditorRole`, `removeOwnerIfNotLast`,
`demoteOwnerIfNotLast` plus four types. `findEditor`, `resolveSession`, `issueToken`, `consumeToken`,
`createSession`, `deleteSession`, `insertOwnerIfEmpty` are deliberately **not** exported
(auth-store/index.ts:3-9).

### The editors screen (`src/lib/sveltekit/editors-routes.ts`)

- `EditorRoutesConfig` editors-routes.ts:41-47 (just `roles`); built at cairn-admin.ts:114 with
  `runtime.roles`.
- `ownerRoles = resolveOwnerLevelRoles(vocabulary)` editors-routes.ts:52.
- `editorsLoad` editors-routes.ts:80-89: `requireOwner(event)` then `listEditors(requireDb(...))`;
  returns `{ editors, self: owner.email, vocabulary }` where `self` is the acting owner's email.
- `ownerAction` prelude editors-routes.ts:66-72: `requireOwner` + `requireDb` + form email
  lowercased/trimmed.
- `editorAddAction` editors-routes.ts:92-110 (`EMAIL_RE` at editors-routes.ts:16, `editor.added`),
  `editorRemoveAction` editors-routes.ts:113-124 (`editor.removed`), `editorSetRoleAction`
  editors-routes.ts:130+ (`editor.role_changed`).
- The screen is reached through `parseAdminPath`'s `editors` view; `cairn-admin.ts:166-169` notes
  `editorsLoad` gates itself, so the dispatcher adds no second gate.

**What assumes a cairn-minted session here:** the roster screen assumes `requireOwner` over a
`locals.cairnEditor` (fine under a resolver) *and* an `AUTH_DB` binding for every read and write
(not fine if the resolver replaces D1 entirely). The whole roster is D1-resident, so a
resolver-based site still needs AUTH_DB if it wants the roster screen, roles, or the last-owner
guard. Only the session table becomes dead.

### First-owner bootstrap (three mechanisms, no env var, no seed command)

1. **`bootstrapOwner`** on `CairnAdminConfig.auth` -> `AuthRoutesConfig.bootstrapOwner`
   (auth-routes.ts:36-42), consumed inside `requestAction` (auth-routes.ts:178-181) via
   `insertOwnerIfEmpty`. It fires **only on the magic-link request action**, so a site that replaces
   the login flow with a resolver never reaches it. Logs `editor.bootstrapped`.
2. A hand-run `wrangler d1 execute` INSERT, or `create-cairn-site`'s own bootstrap INSERT, which
   writes an unbound `magic_token` row (`nonce_hash IS NULL`), see auth-routes.ts:290-296.
3. **Doctor** verifies rather than creates: `auth.store` fails when "the editor table holds no
   owner-capability row" (`src/lib/doctor/checks-cloudflare.ts:199`, documented at
   `docs/reference/doctor.md:99`).

## D. The dev backend (`packages/cairn-cms-dev/src/handle.ts`)

- `devBackendHandle(options?)` handle.ts:46. Seeds media/fragments/vocabulary/preview fixtures
  (handle.ts:48-64), builds one `createDevBackend()` (handle.ts:68) and process-lifetime doubles
  `createFakeAuthDb()`, `createFakeAppDb()`, `createFakeR2()` (handle.ts:72-74).
- Per request (handle.ts:80-140): computes `isAdmin` / `isMedia` / `isPreview` (handle.ts:82-89),
  attaches `locals.cairnBackend` (handle.ts:95), and rebuilds `event.platform.env` with `AUTH_DB`
  for admin+preview, `APP_DB`/`ANTHROPIC_API_KEY` for admin, `MEDIA_BUCKET` always
  (handle.ts:117-126). It replaces `event.platform` wholesale on those paths.
- **The owner mint, handle.ts:128-138**, admin paths only:

```ts
if (isAdmin) {
  event.locals.cairnEditor = {
    email: 'editor@showcase.test',
    displayName: 'Demo Editor',
    role: 'owner',
    capability: 'owner',
  };
}
```

  Note the literal `'owner'` capability rather than a `resolveCapability` call, and the two-tier risk
  note at handle.ts:8-10 (the bypass is an authentication breach if it reaches a deployed runtime).
- The fake AUTH_DB deliberately no-ops `resolveSession` and `deleteSession` because the fixture hook
  injects `locals.cairnEditor` directly: `packages/cairn-cms-dev/src/fake-auth-db.ts:93-96,217` and
  the test note at `fake-auth-db.test.ts:348`.
- Tests already assert both the mint and its absence on non-admin/preview paths:
  `packages/cairn-cms-dev/src/handle.test.ts:23,45,60-63`.
- The showcase never mounts `createAuthGuard` in the dev/e2e path: `examples/showcase/src/hooks.server.ts:18-33`
  branches on `__CAIRN_DEV_BUILD__ && devBackendOptIn()` to `devBackendHandle()` (plus
  `membersDevHandle` in sequence), and only the `else` branch calls `createAuthGuard()`.
- e2e runs a **production build with the dev backend folded in**:
  `examples/showcase/playwright.config.ts` webServer `VITE_CAIRN_E2E=1 npm run build && npm run preview`,
  env `CAIRN_DEV_BACKEND: '1'`, single worker, `fullyParallel: false`.

**Could a resolver be exercised in e2e?** Yes, and there is a ready-made pattern. The e2e path
currently bypasses `createAuthGuard` entirely, so a resolver test needs a spec-scoped fixture handle
that mounts the real guard with a `resolveEditor` reading a header or a fixture cookie (the way
`membersDevHandle` layers a fake `MEMBER_DB` onto `platform.env`,
`examples/showcase/src/members/dev-wiring.ts:43+`, without replacing `event.platform`). Two
constraints: the guard's AUTH_DB refusal must still be satisfiable (the fake AUTH_DB already is), and
handle ordering matters because `devBackendHandle` replaces `event.platform` outright on `/admin`.

## E. Doctor checks and log events touching auth

Doctor check ids (`src/lib/doctor/checks-*.ts`, documented in `docs/reference/doctor.md`):

| id | file:line | what it asserts |
| --- | --- | --- |
| `config.bindings` | checks-local.ts:24 (AUTH_DB at :32-34) | `EMAIL` and `AUTH_DB` are declared in wrangler config |
| `auth.store` | checks-cloudflare.ts:156 | AUTH_DB reachable; tables `editor`, `magic_token`, `session` (`AUTH_TABLES`, checks-cloudflare.ts:131); `magic_token.nonce_hash` present; **at least one owner-capability row** (checks-cloudflare.ts:191-199) |
| `auth.role-vocabulary` | checks-cloudflare.ts:216 | every distinct `editor.role` is a declared name (checks-cloudflare.ts:226-234) |
| `auth.email-normalization` | checks-cloudflare.ts:242 | every `editor.email` is trimmed and lowercase (checks-cloudflare.ts:252-260) |
| `auth.role-wiring` | checks-local.ts:431 | a heuristic text read of `src/hooks.server.ts` proving `createAuthGuard({ roles })` is passed the declared vocabulary (message at checks-local.ts:457) |
| `admin.login-probe` | check-probe.ts:20 | POSTs the request action with a random non-editor address and expects the neutral `sent` envelope (check-probe.ts:95,144) |
| `config.csrf-disable` | checks-local.ts:95 | the site sets `csrf: { checkOrigin: false }` |
| `admin.mount-shape` | checks-local.ts:377 | the catch-all admin mount shape |
| `edge.https-forced` | checks-cloudflare.ts:112 | |

A resolver-based site would fail or need a skip arm on `auth.store` (session table, nonce column),
`admin.login-probe` (no magic-link request action), and possibly `config.bindings`.

Log events (`src/lib/log/events.ts`, table rows in `docs/reference/log-events.md`):

| event | events.ts | fields | doc row |
| --- | --- | --- | --- |
| `auth.link.requested` | :9 | `email` | log-events.md:17 |
| `auth.link.refused` | :10 | `reason` | :20 |
| `auth.link.send_failed` | :11 | `email`, `error`, `code`, `conditionId` | :21 |
| `auth.token.minted` | :12 | `email`, `expiresAt` | :18 |
| `auth.token.rebound` | :13 | `email` | :19 |
| `auth.token.confirmed` | :14 | `email` | :22 |
| `auth.session.created` | :15 | `email` | :23 |
| `auth.session.destroyed` | :16 | `email` | :24 |
| `auth.session.destroy_failed` | :17 | `error` | :25 |
| `guard.rejected` | :34 | `reason` (`csrf`/`origin`/`https`/`bindings`/`dev_backend_in_prod`), `path`, `conditionId`, `detail`/`witness`/`hasSession` | :42 |
| `auth.role.unknown` | :54 | `email`, `role` | :62 |
| `auth.access.denied` | :55 | `email`, `role`, `target` | :63 |
| `editor.added` / `.removed` / `.role_changed` / `.bootstrapped` | (editor.* group) | `owner`, `target`, `role`, `capability` / `email` | :58-61 |
| `admin.action.session_absent` | | `path` | :70 |
| `auth.channel.*` (14 events) | :76-88 | `correlationId`, `outcome`, … | :82-94 |

Guarantees a new event must honor: log-events.md:10, no record ever carries a magic-link token, a
session id, or a token prefix/length; log-events.md:105-108, every `email` outside
`auth.link.requested` fires only for an allow-listed editor. The `auth.channel.*` family is the
precedent for a second identity path getting its own namespaced event group, and it deliberately logs
a salted `correlationId` pseudonym rather than the subject.

## F. Dependencies and crypto

- **No `jose`, and no JWT/JWKS library at all.** `package.json` `dependencies` are CodeMirror,
  lucide, the unified/remark/rehype stack, `gray-matter`, `shiki`, `spellchecker-wasm`, `yaml`,
  `heic-to`, `esm-env`, `hast*`/`mdast*` helpers. `peerDependencies`: `@anthropic-ai/sdk`,
  `@cloudflare/workers-types`, `@sveltejs/kit`, `svelte`. A grep for `jose|jwks|jwtVerify|importJWK`
  across `src/` returns nothing; the only hits are historical planning docs
  (`docs/internal/history/*`, `docs/superpowers/plans/2026-06-04-cairn-docs-phase-4-guides.md`).
- Token signing today is **hand-rolled Web Crypto**, `src/lib/github/signing.ts`: base64url encoder
  (:11), PKCS#1 -> PKCS#8 wrapper (:34), `appJwt` minting RS256 with
  `crypto.subtle.importKey` (:54) and `crypto.subtle.sign('RSASSA-PKCS1-v1_5', …)` (:61), then the
  installation-token exchange (:65-72) and a deploy-time self-test (:124-133). That is JWT
  **signing** only, for the GitHub App. There is no JWT verification path and no JWKS fetch or key
  cache anywhere in `src/`.
- Session/token primitives are Web Crypto too: `src/lib/auth/crypto.ts`, `crypto.getRandomValues`
  (:72-78), `hashToken` SHA-256 hex (:96-100), `tokensMatch` constant-time compare using
  `subtle.timingSafeEqual` when present (:118-129).
- A Cloudflare Access resolver verifying `Cf-Access-Jwt-Assertion` therefore introduces cairn's
  **first** JWT verification and **first** JWKS fetch + cache. Either add `jose` (a new runtime
  dependency, which the charter would want argued) or hand-roll ES256/RS256 verification on
  `crypto.subtle.verify` the way `github/signing.ts` hand-rolls signing.

## G. Docs that must absorb the seam

`docs/extend/security-model.md` headings: The threat model (:8), Sign-in: magic links, not passwords
(:41), Sign-in binds to the browser that asked (:57) with sub-sections at :90 and :119, **The session
cookie (:140)**, CSRF: cairn owns it, not the framework (:190), **The guard's request order (:207)**
with the dev-flag sub-section at :228, Roles, capability, and the access map (:269) with
sub-sections at :286, :316, :346, :366, Response hardening (:388), What's deliberately out of scope
(:424), The commit credential (:433).

Session-describing passages: :4 ("the built-in owner/editor model that guards `/admin`; a second
[channel]…"), :44-45 (token 10 min, session 30 days), :140-186 (the whole session-cookie section:
`__Host-` discipline, the monotonic `Secure` rule, the both-name-forms logout delete, CSRF lifetime
and its two rotation moments), :207-226 (the six-step request order, with step 6 "Session resolve.
Attaches `locals.cairnEditor` and `locals.cairnAccess`" at :220-221 and the no-log redirect note at
:225-226), :428 (the residual threat cairn accepts).

A `resolveEditor` seam changes step 6 of the numbered order at :207-226 and adds a case the session
cookie section at :140 does not cover (a request with no cairn cookie at all).

Extend-track auth pages (`docs/extend/README.md`): under **Admin surfaces**, `add-a-custom-admin-screen.md`,
`organize-your-admin-nav.md`, **`restrict-admin-access.md`**, **`add-a-second-audience.md`** ("a second
audience's own login and its own admin area, one journey"). Under **Concepts**, `architecture.md`,
`content-model.md`, **`security-model.md`**, **`auth-channel-security-model.md`**, `render-safety.md`,
`data-tiers.md`. The Vocabulary block defines Role/capability and Seam. A new "bring your own admin
identity" page slots into **Admin surfaces** next to `restrict-admin-access.md`, with a Concepts
cross-reference; `auth-channel-security-model.md` is the existing precedent for a second auth path
getting its own concept page.

## H. `check:surface` mechanics and reference-page ownership

`npm run check:surface` = `npm run package && node scripts/checks/check-surface.mjs && node scripts/checks/check-surface-leaks.mjs`.

- The gate walks every `package.json` `exports` entry carrying a `types` field
  (`check-surface.mjs:31-45`), renders each export's **full declared shape** through the TS checker
  (interfaces member-by-member via `renderInterface`, :77-92; aliases expanded via
  `SHAPE_FLAGS`/`InTypeAlias`, :58-62; callables via `CALLABLE_FLAGS`, :47-51), and diffs the render
  against the committed golden `docs/internal/api-surface.md` (:21-22). Regenerating with
  `npm run check:surface -- --update` is the deliberate disclosure moment (:8-10).
- **Adding an optional field to `AuthGuardOptions`** rewrites exactly one golden line,
  `docs/internal/api-surface.md:442`, today:
  `- `AuthGuardOptions`: { roles?: RolesDeclaration; access?: AccessMap; includeSubDomains?: boolean }`.
  If the new field's type is a named type (say `ResolveEditor`), that type must itself be exported
  and gains its own golden line, plus a reference-page entry with a stability tier.
- **Adding `cloudflareAccessResolver`** adds one golden line under whichever subpath's `## ` section
  it lands in (`## /sveltekit` at api-surface.md:427, `## /cloudflare` at :183) and must pass
  `findHomeViolations` (check-surface.mjs:305-332): every name has exactly one canonical home; a
  second publication is a duplicate that fails unless recorded in
  `scripts/checks/check-surface-reexports.json` with `name`, `subpath`, `home`, `reason`. The record's
  rule text is that file's `rule` key. So publishing the resolver from both `/sveltekit` and
  `/cloudflare` needs a recorded R4 entry; publishing from one does not.
- **Reference-page ownership** (`scripts/checks/reference-coverage.mjs:535-553`): `/sveltekit` ->
  `docs/reference/sveltekit.md`; `/cloudflare` -> `docs/reference/cloudflare.md`; `.` ->
  `docs/reference/core.md`; `/auth-store` -> `auth-store.md`; `/auth-channel` -> `auth-channel.md`;
  `/auth-crypto` -> `auth-crypto.md`. `check:reference` requires every export to appear as a
  whole-word token on its page **and** carry a stability-tier marker (`hasTierMarker`,
  reference-coverage.mjs:85-87; `untaggedNames` :183); `check:reference:signatures` locks callable
  signatures; `staleNames` (:205) fails a page that still documents a removed name.
- The `/cloudflare` barrel's own scope statement, `src/lib/cloudflare/index.ts:1-5`: "Cloudflare-native
  platform primitives two sites already copy by hand… Anything proposed here must be a Cloudflare
  platform primitive itself." A Cloudflare Access JWT verifier fits that charter better than
  `/sveltekit` does, but `/sveltekit`'s `createAuthGuard` is where the option lives, so the pair
  crosses subpaths and will need either a recorded re-export or a deliberate single home.
- `createAuthGuard` is documented at `docs/reference/sveltekit.md:79-87` at **Stability tier:
  Scaffold API** (the frozen tier), under "Single-mount admin (recommended)". `CairnEvent`'s
  `locals` contract, including the four `cairn*` keys, is at sveltekit.md:24-73.

## Cross-cutting: what assumes a cairn-minted session beyond the guard

1. `guard.ts:125-133` refuses **every** admin path when `AUTH_DB` is absent, before any identity work.
2. `logoutAction` (auth-routes.ts:404) and `requestAction`/`confirmAction` all call `requireDb`;
   `/admin?/logout` is wired for **every** view (cairn-admin.ts:275) and the shell renders that form
   unconditionally (CairnAdminShell.svelte:949). Under a resolver there is no cairn session to
   destroy and the sign-out affordance is misleading at best, a 500 at worst.
3. `resolveSession`'s INNER JOIN to `editor` (store.ts:223-233) is the live-revocation mechanism the
   removal cascade relies on (store.ts:378-381). A resolver bypasses it.
4. The roster screen, the role vocabulary, the last-owner guard, and `defineRoles` all live in D1
   `editor` rows; a resolver still needs a role source to produce `Editor.role`/`capability`.
5. `bootstrapOwner` only fires inside the magic-link `requestAction` (auth-routes.ts:178).
6. Doctor's `auth.store` and `admin.login-probe` both assume the magic-link stack.
7. The dev backend sets `locals.cairnEditor` directly and never runs the guard, so today's e2e proves
   nothing about the guard's identity path.
