# Admin smoke test (local, per pass)

How to exercise a site's embedded `/admin` against a real Worker each pass, without the
email round-trip. Run this on both consumer sites (ecnordic-ski and 907-life) after the
package gates pass; it is the live half of the cairn-pass verification.

## Why a forged session (read this once)

Pass AUTH replaced the hand-rolled HMAC session with better-auth (D1 plus signed cookies).
better-auth stores magic-link verification tokens **hashed**, so the email click cannot be
replayed from a script: you cannot read a raw token back out of D1. The **session cookie**,
though, is a standard signed cookie that we can forge from `AUTH_SECRET`:

```
better-auth.session_token = encodeURIComponent( token + "." + base64( HMAC-SHA256(AUTH_SECRET, token) ) )
```

better-auth then looks the session up by the raw `token` in the `session` table. So the
helper inserts a `session` row with a known token and signs that token. The cookie format is
better-call's `signCookieValue` (`node_modules/better-call/dist/crypto.mjs`): standard base64
(not base64url), joined with a dot, then `encodeURIComponent` over the whole value.

`scripts/mint-session.mjs` (in each site) does all of this. The old version signed the retired
`cairn_session` cookie and no longer works; this is its better-auth replacement.

## Prerequisites (once per machine)

- The site has a `.dev.vars` with `AUTH_SECRET` (and the other admin secrets).
- The local D1 exists with the better-auth schema. Running `wrangler dev` once applies the
  migrations in `drizzle/migrations`. Confirm with:
  ```bash
  npx wrangler d1 execute <db> --local --command "SELECT name FROM sqlite_master WHERE type='table';"
  ```
  where `<db>` is the site's AUTH_DB name (`cairn-ecnordic-auth` / `cairn-907-auth`).
- A seeded owner in the local D1. If `SELECT email, role FROM user;` is empty, seed one:
  ```bash
  npx wrangler d1 execute <db> --local --command \
    "INSERT INTO user (id, name, email, email_verified, role) VALUES ('dev-owner','Dev Owner','you@example.com',1,'owner');"
  ```

## The procedure

1. **Start the Worker** in the site repo (a background shell, or pipe to `sleep infinity`):
   ```bash
   npx wrangler dev --port 8787      # use a distinct port per site if running both at once
   ```
   Wait for `Ready on http://localhost:8787`.

2. **Mint an owner session cookie** (no email loop):
   ```bash
   CK=$(node scripts/mint-session.mjs | tail -1)   # "Cookie: better-auth.session_token=..."
   ```
   Pass `editor` as an argument to mint an editor-role session instead (needs an editor user
   seeded). The minter prints what it did to stderr and the `Cookie:` header line to stdout.

3. **Run the checklist.** Anon checks need no cookie; authed checks pass `-H "$CK"`. Expected
   results in parentheses.
   ```bash
   # anon: the guard sends every /admin page to login
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:8787/admin            # 303 -> /admin/login
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/admin/login                       # 200
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/                                   # 200

   # authed: the index redirects to the first collection, lists render
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "$CK" http://localhost:8787/admin     # 307 -> /admin/<first collection>
   curl -s -H "$CK" http://localhost:8787/admin/<collection> | grep -o 'New entry'                   # present
   curl -s -o /dev/null -w "%{http_code}\n" -H "$CK" http://localhost:8787/admin/edit/<collection>/<id>   # 200
   ```
   Confirm the sidebar nav has one entry per `adapter.collections` (ecnordic: Posts and Pages;
   907: Posts only), that an owner session shows the `/admin/admins` link and an editor session
   does not, and that the rendered HTML carries the neutral `cairn-admin` shell class.

   A same-origin form POST needs the `Origin` header or SvelteKit returns 403 (its CSRF guard).
   With `Accept: text/html` a form action returns a real 303; with curl's default `*/*` it
   returns 200 with the action result serialized in the body (both are correct).

4. **Clean up.**
   ```bash
   npx wrangler d1 execute <db> --local --command "DELETE FROM session WHERE token LIKE 'smoke%';"
   ```
   Stop the Worker. Note: every `wrangler d1 execute --local` spawns its own `workerd`, so after
   a smoke run there can be many stray `workerd` processes; `pkill -f workerd` clears them.

5. **The final visual confirmation stays a user step.** A real magic-link login in Firefox
   (request a link, click it, confirm the POST-confirm page, land authenticated) is the one
   thing the forged cookie does not cover, since the email token is hashed. Record the curl
   results in the pass log and leave the Firefox click to the user, the same posture as every
   prior go-live.

## Notes

- The same `scripts/mint-session.mjs` works in both sites; it reads `AUTH_SECRET` from
  `.dev.vars` and the AUTH_DB name from `wrangler.toml`, so nothing in it is site-specific.
- This smokes the package behavior through the site shims. Because the two sites' `admin/**`
  routes are byte-identical shims (the F2 invariant), a clean run on one site plus a build and
  type-check on the other is strong; running the checklist on both is the thorough form.
