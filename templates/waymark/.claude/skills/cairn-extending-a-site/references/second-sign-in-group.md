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
- Consume a one-time token in one atomic statement with the expiry and the nonce in the same
  `WHERE`, so two concurrent requests cannot both consume it:

  ```sql
  DELETE FROM login_token
  WHERE token_hash = ? AND expires_at > ? AND nonce_hash = ?
  RETURNING contact
  ```

  The third parameter is the hash of the requesting browser's pending-login nonce, binding the
  token to that browser. A confirm with no pending cookie passes null, which equals nothing, so it
  consumes no row. Write every row with a nonce. The engine's own `nonce_hash IS NULL OR` clause
  exists for its legacy and seeded rows, and in a new flow it would let an unbound row confirm from
  any browser.
- For a link, when a send cooldown holds back a repeat request, rebind the contact's live row to the
  newest requester, minting and sending nothing:

  ```sql
  UPDATE login_token SET nonce_hash = ?
  WHERE contact = ? AND expires_at > ?
  ```

  Without it, an attacker who requests once a minute keeps the link bound to their own browser
  while the cooldown stops the member getting a new one. Never rebind a code row, which would hand
  the attacker the row and its attempts.
- An emailed link has to carry its token in a URL, so make that URL consume nothing. The link's GET
  renders a form with the token in a hidden field, and only the POST consumes. A scanner that
  fetches the link then burns nothing. A scanner that submits forms is stopped only by the nonce
  binding: it holds no pending cookie, so the strict `nonce_hash = ?` matches nothing.
- Set `Referrer-Policy: strict-origin` on the landing page (the engine's own pages use it; `same-origin` would send the token-bearing landing URL as `Referer` on every same-origin request). The engine's security headers cover only
  `/admin`; a second group's routes set their own.
- Send `Cache-Control: private, no-store` from every login and member response. Only `/admin` gets
  it from `applySecurityHeaders`, so a zone's Cache Everything rule could serve one member's page
  to other visitors.
- Use `generateToken` with `compareTokens` for double-submit CSRF on the group's forms, and name the
  CSRF cookie through `buildCookieName`. Set that cookie HttpOnly, Secure, SameSite=Lax, with a
  `Max-Age`, as the engine does for its own.
- Compare each POST's `Origin` with the site's origin in the handler. SvelteKit's check covers only
  form and untyped bodies, so a JSON `+server.ts` endpoint gets none, and a wildcard
  `csrf.trustedOrigins` turns the check off for forms too.
- Refuse plain http on these routes, except on a local host, before setting any cookie. The engine
  refuses it only under `/admin`, and on a zone without Always Use HTTPS a `secure` flag derived from
  the protocol mints a bare, non-Secure cookie.
- Deny on a requester key, the client address from `CF-Connecting-IP` plus the contact, through
  `resolveRateLimit` from `/cloudflare`. An identity-keyed control only logs or escalates to
  Turnstile: a budget keyed on the email alone lets anyone lock that person out.
- Treat the limiter as back pressure, never a security control. The Workers binding is per-location
  and eventually consistent, and `resolveRateLimit` degrades to open: an absent binding answers
  `no-binding` and a thrown call answers `failed`, and neither blocks unless you branch on it. A
  limit that must hold lives in D1.
- Normalize the contact the same way on every path: request, confirm, lookup, and removal. For an
  email, trim and lowercase.
- Verify a human with `verifyTurnstile` from `/cloudflare`, passing `hostname`, `action`, and `ip`.
  Without the first two, a token solved on another widget with the same sitekey replays against this
  form. Run it before any store write, a decoy row included, since the limiter is only back pressure.
- Answer an unknown contact with one response, byte-identical to a sent one in its body and its
  `Set-Cookie`. A cookie set only for a known contact is a one-request allowlist oracle, so set any
  pending cookie before the lookup branches.
- Keep the timing the same too. Do the same store work on both paths, writing a decoy row for an
  unknown contact through the same path. The send cooldown then fires for unknown contacts too, so
  the flow has no equivalent of the engine's `throttled` answer, which reveals membership.
- Sweep expired token rows, decoys included, on each mint, or a row per probed contact grows forever.
- Deliver in the background, so a slow send can't reveal a known contact: attach `.catch` to the send
  before you pass it to `waitUntil`. In the `.catch`, log the failure without the link or code, and
  delete the pending row so a failed send doesn't leave the member stuck behind the cooldown.
- Check the roster only after the atomic consume succeeds. On a miss, mint nothing and answer exactly
  as a wrong code or link. A check before the consume answers an unknown contact differently from a
  wrong guess, a one-request roster oracle. The late check also catches a person removed between
  request and confirm.
- Give a short code a ten-minute expiry and an attempt cap. The `token_hash = ?` consume can't count
  attempts, so hold one row per requester's nonce, raise the count in its own atomic statement before
  you compare, and treat no returned row as a refusal:

  ```sql
  UPDATE login_code SET attempts = attempts + 1
  WHERE nonce_hash = ? AND expires_at > ? AND attempts < ?
  RETURNING attempts
  ```

  Read no contact at confirm. A statement keyed on a contact from the form lets an attacker spend a
  victim's cap with wrong guesses and kill their live code. A read-then-write cap lets parallel
  guesses through. A cap per nonce still allows one guess each across many requests, so also count
  failed confirms by client address and escalate to Turnstile.
- Generate a short code from `crypto.getRandomValues`, rejecting any value past the largest multiple
  of the code's range, since a plain `%` is biased. `generateToken` makes no numeric code, and
  `hashToken`'s digest of one falls to an offline search, so only the expiry and deleting the row on
  use protect a stolen store.
- Mint a fresh session id with `generateToken` at login, never one the visitor presented, which
  would allow session fixation.
- Set the session cookie HttpOnly, Secure, SameSite=Lax, with a `Max-Age`, and with a `__Host-` name on
  HTTPS through `buildCookieName`. A browser accepts a `__Host-` cookie only with `path: '/'` and no
  `Domain`, on the CSRF and pending cookies too.
- Set the pending cookie HttpOnly, Secure, SameSite=Lax, with a `Max-Age` at least as long as the
  token's expiry, as the engine does for its own.
- Start every cookie name, session, CSRF, and pending alike, with anything but `cairn_`, which the
  engine's cookies use. `buildCookieName` doesn't check this, and a base of `cairn_csrf` collides with
  the engine's token.
- Check `expires_at` in the session lookup's `WHERE`, and sweep expired rows at login. `Max-Age` binds
  only the browser, so without the check a stolen cookie lives forever.
- Set `prerender = false` on login and member routes. A prerendered member page ships to everyone.
- On logout, delete the server-side row, not only the cookie. A deleted cookie leaves a captured
  session valid until it expires.
- End a removed person's sessions at removal by deleting their rows.
- Never set `locals.cairnEditor`. `requireSession` trusts the value. The guard writes it on guarded
  admin paths and clears it on public ones, so a value a site handle sets survives on every path
  outside `/admin`. Keep the group's session in a `locals` key of its own.

## Server-only subpaths

`/auth-crypto` and `/cloudflare` are server only. Their `browser` condition resolves a stub with no
exports and a module-level throw: a named import from client code fails the build, and a bare
side-effect import builds but throws at runtime when it executes in the browser. The exports map
lists `worker` first, so a Workers build (which activates `worker` and `browser` together) gets the
real module. Import them only from server modules.
