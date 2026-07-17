# Admin smoke test (local, per pass)

How to exercise a site's embedded `/admin` against a real Worker each pass, without the
email round-trip. Run this on both consumer sites (ecnordic-ski and 907-life) after the
package gates pass; it is the live half of the cairn-pass verification.

> **Custom-domain sites: smoke against the deployed https Worker, not local http.** Both
> production sites declare a `custom_domain` route in `wrangler.toml` (`pattern = "907.life"`,
> `custom_domain = true`). Under `wrangler dev`, the Worker then resolves `event.url` to the
> production https origin regardless of the local request host, so a local `http://localhost`
> request to `/admin` matches the guard's deployed-http branch and serves the `0.34.0`
> "admin needs a secure connection" page (HTTP 400) instead of the login. The "wrangler dev over
> http is exempt" path below does not apply to these sites: the host the guard sees is the custom
> domain, never `localhost`. Run the checklist against the deployed `https://<site>` Worker
> instead, and insert the session row into the **remote** D1 with `wrangler d1 execute <db>
> --remote` (same SQL as the `--local` form below). Over https the guard's http branch never
> fires, so `/admin/login` returns `200` and the authed checks work. The `--local` flow below
> still fits a site with no `custom_domain` route.

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
   curl -s -H "$CK" http://localhost:8787/admin/<concept> | grep -o 'New Post'                        # present
   curl -s -o /dev/null -w "%{http_code}\n" -H "$CK" http://localhost:8787/admin/edit/<concept>/<id>   # 200
   ```
   Confirm the sidebar nav has one entry per `adapter` concept (ecnordic: Posts and Pages;
   907: Posts only), that an owner session shows the `/admin/editors` link and an editor session
   does not, and that the rendered HTML carries the neutral `cairn-admin` shell class. To see
   the live-role read in action, change the editor's role with an `UPDATE editor SET role = ...`
   and rerun an authed check; the new role applies on that next request without a new cookie.

   A same-origin form POST needs the `Origin` header or SvelteKit returns 403 (its CSRF guard).
   With `Accept: text/html` a form action returns a real 303; with curl's default `*/*` it
   returns 200 with the action result serialized in the body (both are correct). The deployed
   site has the same dependency, which is why a consuming site must force HTTPS so the magic-link
   form always posts over a stable https `Origin`. See [Deploy to Cloudflare](../guides/deploy-to-cloudflare.md#force-https).

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

## Appendix: Media actions

The Media Library's orphan scan, purge, and bulk delete
(`src/lib/sveltekit/content-routes-media.ts`: `mediaOrphanScanAction`, `mediaPurgeOrphansAction`,
`mediaBulkDeleteAction`) are SvelteKit form actions mounted on `/admin/media`, not plain GET
pages, so smoking them needs the CSRF double-submit pairing on top of the session cookie minted
above. Run these against throwaway assets: a raw R2 object seeded directly (bypassing the app)
for the scan and purge, and a disposable test image uploaded through the admin UI for the bulk
delete. Never point the purge at a real asset.

1. **Mint the CSRF pairing.** Every unsafe (POST) admin request checks a cookie/header (or
   cookie/field) pair, the cairn-owned double-submit the guard enforces
   (`src/lib/sveltekit/guard.ts`, Rule 1). The cookie is minted lazily the first time an authed
   admin page loads (`issueCsrfToken` in `src/lib/sveltekit/csrf.ts`), named `cairn_csrf` on
   local http and `__Host-cairn_csrf` on the deployed https Worker, the same scheme rule as the
   session cookie. A GET to `/admin/media` with the session cookie from the procedure above sets
   it if it is not already set from an earlier check in this run:
   ```bash
   curl -s -D - -H "$CK" http://localhost:8787/admin/media -o /dev/null | grep -i 'set-cookie: cairn_csrf'
   ```
   Take the token from the `Set-Cookie` line (everything between `cairn_csrf=` and the next
   `;`), and build a combined cookie header for the POSTs below:
   ```bash
   CSRF="<paste the token>"
   CSRF_CK="Cookie: cairn_session=smoke-owner; cairn_csrf=$CSRF"
   ```
   The guard checks the token two ways (`validateCsrfHeader` then, only if that misses,
   `validateCsrfToken`): a `X-Cairn-CSRF` request header compared straight against the cookie, or
   (with no valid header) a cloned form body's `csrf` field. The Media Library component itself
   always uses the header (`src/lib/components/CairnMediaLibrary.svelte`'s `applyBulkDelete`,
   `runOrphanScan`, and `applyOrphanPurge` each set `'X-Cairn-CSRF': csrf?.() ?? ''` and post a
   plain `FormData` with no `csrf` field), so the recipes below match that transport, not the
   field fallback.

2. **Seed a throwaway orphan, for the scan and purge.** Put an object straight into R2, bypassing
   the app, at a key with no matching `media.json` row: exactly what `reconcileMedia`
   (`src/lib/media/reconcile.ts`) calls an orphan. The key grammar is
   `media/<first 2 hex of the hash>/<16-hex hash>.<1-5 lowercase alphanumeric ext>`
   (`MEDIA_KEY_RE`); nothing else validates it, since this skips the upload pipeline entirely.
   Find the bucket's resource name (not its Worker binding) under `r2_buckets` in the site's
   `wrangler.jsonc` (for example `{ "binding": "MEDIA_BUCKET", "bucket_name":
   "cairn-showcase-media" }`; `wrangler r2 object put` takes the `bucket_name`):
   ```bash
   echo -n 'throwaway' > /tmp/orphan.bin
   npx wrangler r2 object put <bucket-name>/media/de/deadbeef00000001.bin \
     --local --file /tmp/orphan.bin
   ```
   Use `--remote` against the deployed bucket instead of `--local` on `wrangler dev`'s simulator.

3. **Run the scan** (`?/mediaOrphanScan`). The action reads no form fields at all, but SvelteKit
   still needs a recognized form body on the POST or it 415s, so send a `FormData` with a dummy
   field (the component itself posts an empty `FormData`, which curl cannot construct directly):
   ```bash
   curl -s -X POST "http://localhost:8787/admin/media?/mediaOrphanScan" \
     -H "$CSRF_CK" -H "X-Cairn-CSRF: $CSRF" \
     -F "x=1"
   ```
   Decode the response (see the next step) and confirm `orphanedBytes` lists
   `media/de/deadbeef00000001.bin`.

4. **Decode the `ActionResult` envelope.** A no-`Accept` POST answers with SvelteKit's serialized
   action JSON, `{"type":...,"status":...,"data":...}`, where `data` is itself a devalue-encoded
   string, not plain JSON (the browser client runs `$app/forms`'s `deserialize` on it; see
   `src/lib/components/client-action.ts`'s `postFormAction`). Decode the same way from a shell
   with the `devalue` package (a `package.json` devDependency here, and a transitive dependency
   of `@sveltejs/kit` in any site, so it resolves even unlisted):
   ```bash
   curl -s -X POST "http://localhost:8787/admin/media?/mediaOrphanScan" \
     -H "$CSRF_CK" -H "X-Cairn-CSRF: $CSRF" -F "x=1" | node -e '
   const { parse } = require("devalue");
   const envelope = JSON.parse(require("fs").readFileSync(0, "utf8"));
   console.log(envelope.type, envelope.status, JSON.stringify(parse(envelope.data), null, 2));
   '
   ```

5. **Purge the orphan** (`?/mediaPurge`), **irreversible.** Raw R2 bytes have no git history to
   revert. Select each key (the repeated `key` field, from the scan's `orphanedBytes`) and type
   the exact selected count as `confirm`; `mediaPurgeOrphansAction` refuses and deletes nothing
   on any mismatch or empty selection (`confirm !== String(keys.length)`):
   ```bash
   curl -s -X POST "http://localhost:8787/admin/media?/mediaPurge" \
     -H "$CSRF_CK" -H "X-Cairn-CSRF: $CSRF" \
     -F "key=media/de/deadbeef00000001.bin" \
     -F "confirm=1"
   ```
   A successful purge answers `{ purged, skippedClaimed, failed }`; `purged` should list the
   seeded key.

   > **R2 delete propagation lag.** After a purge, verify with the Worker's own orphan scan
   > (rerun step 3 and confirm the key is gone from `orphanedBytes`), not `wrangler r2 object get`
   > by the exact key: a direct get can still return the byte for a short window after the
   > delete, R2's own propagation lag, not a failed purge.

6. **Bulk delete** (`?/mediaBulkDelete`). This targets committed, unreferenced `media.json` rows,
   not raw R2 orphans, so the seeded object above has nothing to delete here (it has no manifest
   row). Upload one disposable test image through the admin UI in a browser instead, copy its
   content hash from the Library screen, then:
   ```bash
   curl -s -X POST "http://localhost:8787/admin/media?/mediaBulkDelete" \
     -H "$CSRF_CK" -H "X-Cairn-CSRF: $CSRF" \
     -F "hash=<16-hex content hash>"
   ```
   Repeat `-F "hash=..."` once per asset for a real multi-select. A successful call answers
   `{ deleted, skipped, failed }`; a `skipped` row with reason `still-referenced` means the
   server's fresh recheck found a use the client's stale count missed, the authoritative gate
   `mediaBulkDeleteAction`'s own docstring describes, not a bug.

7. **Clean up.** Remove `/tmp/orphan.bin`. If the bulk delete above did not already remove the
   disposable test image's row, delete it through the Library UI, then rerun the scan once more
   to confirm nothing but the deliberately-seeded key was ever touched.

> **`wrangler ... --json` prepends a non-JSON notice line.** `wrangler d1 list --json` (and other
> `--json` subcommands) write a "Cloudflare agent skills are available..." line to stdout ahead of
> the JSON, confirmed against this machine's wrangler 4.97.0. Any script parsing piped wrangler
> `--json` output needs a slice-from-the-first-`[`-or-`{` guard, or it breaks a plain `JSON.parse`.
