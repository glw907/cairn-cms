# Add a second sign-in group

Owner and editor by magic link stay the zero-config default and stay on it. A second audience
(staff, members, customers) takes one of two mechanisms. What that audience is, and its records,
stay site code.

Contents:

- [Choose](#choose)
- [Role path](#role-path)
- [Rolling your own flow with /auth-crypto](#rolling-your-own-flow-with-auth-crypto)
- [Server-only subpaths](#server-only-subpaths)

## Choose

| | Declared role | A flow built on `/auth-crypto` |
|---|---|---|
| Sign-in | Same magic link | The site's own, built from the primitives |
| Roster | `editor` table in `AUTH_DB`, added on `/admin/editors` | Site's store |
| Session | `AUTH_DB`, populates `locals.cairnEditor` at `none` capability | Site's own store and cookie, never `AUTH_DB`, never `locals.cairnEditor` |
| Lands | The role's `home` under `/admin` | Site routes outside `/admin` |

An owner adds people one at a time and they work under `/admin`: role. The site already keeps the
roster and its people never need the admin: your own flow. A group that writes content needs editor
capability and an access map (`references/admin-access.md`).

## Role path

1. On the adapter: `roles: defineRoles({ owner: 'owner', editor: 'editor', staff: { capability: 'none', home: '/admin/staff' } })`.
   Keep `owner` (required) and `editor` (dropping it closes content screens to every editor). `home`
   must sit under `/admin`.
2. Confirm `createAuthGuard` and `devBackendHandle` receive `{ runtime }`.
3. Build the screen at `home`. Its `load` calls `requireSession(event)` and answers `error(403)` when
   `editor.role !== 'staff'`; each form action checks the role again, since an action runs without
   its page's `load`.
4. Optional sidebar link: a `navLayout` entry with `roles: ['staff']` on the adapter's `editor` group.
5. Deploy: copy `node_modules/@glw907/cairn-cms/migrations/0001_roles.sql` into `migrations/` if absent
   (it rebuilds `editor` with four columns; add any custom columns to your copy), apply with
   `npx wrangler d1 migrations apply <auth-db> --remote`, run `npx cairn-manifest`, run `cairn doctor`
   (no `auth.role-wiring-missing`), deploy.
6. An owner adds each person on `/admin/editors` with role `staff`; adding sends no email.

The dev backend runs every request as an owner, so verify on the deployed site. An add that fails
with `auth.store-roles-unmigrated` means `0001_roles.sql` is not applied.

## Rolling your own flow with /auth-crypto

`@glw907/cairn-cms/auth-crypto` supplies stateless primitives only (`generateToken`, `hashToken`,
`compareTokens`, and `buildCookieName` for a `__Host-` name). The audience semantics, the store schema, and
keeping that store separate from the engine's stay site-owned. A flow built on them follows this
discipline:

- Give the store its own D1 binding with its own `migrations_dir`, never `AUTH_DB`'s. A shared
  `migrations_dir` applies each schema to the other database on first migrate.
- Store only `hashToken`'s digest for a token or session lookup, never the raw value.
- Consume a one-time token in one atomic statement with the expiry in the same `WHERE`, so two
  concurrent requests cannot both consume it. The engine's pattern:

  ```sql
  DELETE FROM magic_token
  WHERE token_hash = ? AND expires_at > ? AND (nonce_hash IS NULL OR nonce_hash = ?)
  RETURNING email
  ```

  The third parameter is the hash of the requesting browser's pending-login nonce, binding the
  token to that browser. A confirm with no pending cookie passes a null hash, which equals no stored
  hash, so only a row whose `nonce_hash` is null matches.
- Send tokens in a POST body, never a URL (logs, history, `Referer`).
- Set `Referrer-Policy: strict-origin` on the landing page (the engine's own pages use it; `same-origin` would send the token-bearing landing URL as `Referer` on every same-origin request). The engine's security headers cover only
  `/admin`; a second group's routes set their own.
- Use `generateToken` with `compareTokens` for double-submit CSRF on the group's forms, and name the
  CSRF cookie through `buildCookieName` so it takes `__Host-` too.
- Rate limit by email and by IP.
- Normalize the contact the same way on every path: request, confirm, lookup, and removal. For an
  email, trim and lowercase.
- Verify a human with `verifyTurnstile` from `/cloudflare`, passing `hostname`, `action`, and `ip`.
  Without the first two, a token solved on another widget with the same sitekey replays against this
  form.
- Answer an unknown contact with one response, byte-identical to a sent one in its body and its
  `Set-Cookie`. A cookie set only for a known contact is a one-request allowlist oracle, so set any
  pending cookie before the lookup branches.
- Give a short code a ten-minute expiry and an attempt cap.
- Mint a fresh session id with `generateToken` at login, never one the visitor presented, which
  would allow session fixation.
- Set the session cookie HttpOnly, Secure, SameSite=Lax, with a `Max-Age`, and with a `__Host-` name on
  HTTPS through `buildCookieName`. Start the name with anything but `cairn_`, which the engine's
  cookies use. `buildCookieName` doesn't check this for you.
- Set `prerender = false` on login and member routes. A prerendered member page ships to everyone.
- On logout, delete the server-side row, not only the cookie. A deleted cookie leaves a captured
  session valid until it expires.
- End a removed person's sessions at removal by deleting their rows.
- Never set `locals.cairnEditor`. `requireSession` trusts the value, and the guard writes it only on
  guarded admin paths, so a value a site handle sets survives on every other path. Keep the group's
  session in a `locals` key of its own.

## Server-only subpaths

`/auth-crypto` and `/cloudflare` are server only. Their `browser` condition resolves a stub with no
exports and a module-level throw: a named import from client code fails the build, and a bare
side-effect import builds but throws at runtime when it executes in the browser. The exports map
lists `worker` first, so a Workers build (which activates `worker` and `browser` together) gets the
real module. Import them only from server modules.
