# Admin smoke test (local, per pass)

How to exercise a site's embedded `/admin` against a real Worker each pass, without the
email round-trip. Run this on both consumer sites (ecnordic-ski and 907-life) after the
package gates pass; it is the live half of the cairn-pass verification.

## The session model (read this once)

Auth is self-owned on D1. There is no better-auth, no signed cookie, and no `AUTH_SECRET`.
A session lives in the `session` table with columns `id`, `email`, `expires_at`, and
`created_at`. The cookie value is the opaque `id` itself. The guard reads the cookie, looks
up the row by `id`, and resolves the editor by joining the `editor` table on `email`. Because
the role comes from the `editor` row on every request, a role change takes effect on the next
request, and an expired or missing session redirects to `/admin/login`.

That structure is what makes the smoke easy. To mint a session you do not need to forge or
sign anything. You seed an `editor` row, then insert a `session` row with an `id` you choose,
an `expires_at` in the future, and that editor's `email`. Sending the chosen `id` back as the
session cookie is a logged-in request.

The cookie name depends on the scheme. On the deployed https Worker the cookie is Secure and
takes the `__Host-` prefix, so the header is `Cookie: __Host-cairn_session=<id>`. On a local
http `wrangler dev` the prefix is dropped (browsers require Secure for `__Host-`), so the
header is `Cookie: cairn_session=<id>`. Use the form that matches the Worker you are hitting.

## Prerequisites (once per machine)

- The local D1 exists with the auth schema. Running `wrangler dev` once applies the migration
  in `migrations/`. Confirm the tables with:
  ```bash
  npx wrangler d1 execute <db> --local --command "SELECT name FROM sqlite_master WHERE type='table';"
  ```
  where `<db>` is the site's AUTH_DB name (`cairn-ecnordic-auth` / `cairn-907-auth`). You
  should see `editor`, `magic_token`, and `session`.
- A seeded editor in the local D1. If `SELECT email, role FROM editor;` has no owner, seed one
  (timestamps are epoch milliseconds):
  ```bash
  npx wrangler d1 execute <db> --local --command \
    "INSERT INTO editor (email, display_name, role, created_at) \
     VALUES ('you@example.com', 'Dev Owner', 'owner', 0);"
  ```

## The procedure

1. **Start the Worker** in the site repo (a background shell, or pipe to `sleep infinity`):
   ```bash
   npx wrangler dev --port 8787      # use a distinct port per site if running both at once
   ```
   Wait for `Ready on http://localhost:8787`.

2. **Mint a session row** for the seeded editor. Pick any `id` you can recognize later, and set
   `expires_at` well into the future. This example uses the year 2099 in epoch milliseconds:
   ```bash
   npx wrangler d1 execute <db> --local --command \
     "INSERT INTO session (id, email, expires_at, created_at) \
      VALUES ('smoke-owner', 'you@example.com', 4070908800000, 0);"
   ```
   Because the local Worker speaks http, the cookie header drops the `__Host-` prefix:
   ```bash
   CK="Cookie: cairn_session=smoke-owner"
   ```
   To smoke an editor-role session, seed an editor-role row in `editor` and mint a second
   `session` row pointing at that email.

3. **Run the checklist.** Anon checks need no cookie; authed checks pass `-H "$CK"`. Expected
   results in parentheses.
   ```bash
   # anon: the guard sends every /admin page to login
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:8787/admin            # 303 -> /admin/login
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/admin/login                       # 200
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/                                   # 200

   # authed: the index redirects to the first concept, lists render
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "$CK" http://localhost:8787/admin     # 307 -> /admin/<first concept>
   curl -s -H "$CK" http://localhost:8787/admin/<concept> | grep -o 'New entry'                       # present
   curl -s -o /dev/null -w "%{http_code}\n" -H "$CK" http://localhost:8787/admin/edit/<concept>/<id>   # 200
   ```
   Confirm the sidebar nav has one entry per `adapter` concept (ecnordic: Posts and Pages;
   907: Posts only), that an owner session shows the `/admin/admins` link and an editor session
   does not, and that the rendered HTML carries the neutral `cairn-admin` shell class. To see
   the live-role read in action, change the editor's role with an `UPDATE editor SET role = ...`
   and rerun an authed check; the new role applies on that next request without a new cookie.

   A same-origin form POST needs the `Origin` header or SvelteKit returns 403 (its CSRF guard).
   With `Accept: text/html` a form action returns a real 303; with curl's default `*/*` it
   returns 200 with the action result serialized in the body (both are correct).

4. **Clean up.**
   ```bash
   npx wrangler d1 execute <db> --local --command "DELETE FROM session WHERE id LIKE 'smoke%';"
   ```
   Stop the Worker. Every `wrangler d1 execute --local` spawns its own `workerd`, so after a
   smoke run there can be many stray `workerd` processes; `pkill -f workerd` clears them.

5. **The final visual confirmation stays a user step.** A real magic-link login in Firefox
   (request a link, click it, confirm the POST-confirm page, land authenticated) is the one
   thing the inserted session row does not cover, since the magic-link token is stored hashed
   and cannot be replayed from a script. The session row is the no-email shortcut for the smoke
   itself. Record the curl results in the pass log and leave the Firefox click to the user, the
   same posture as every prior go-live.

## Notes

- The mint is plain SQL against the local D1, so nothing here is site-specific beyond the
  AUTH_DB name. Both sites share the same auth schema and the same guard behavior.
- This smokes the package behavior through the site shims. Because the two sites' `admin/**`
  routes are byte-identical shims (the F2 invariant), a clean run on one site plus a build and
  type-check on the other is strong; running the checklist on both is the thorough form.
