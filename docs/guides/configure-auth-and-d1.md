# Configure auth and D1

Goal: stand up the D1-backed magic-link auth store so an editor can log in by email.

## Prerequisites

- A Cloudflare account with D1 enabled.
- The site's Cloudflare Worker, which holds the `AUTH_DB` binding. See [Deploy to Cloudflare](./deploy-to-cloudflare.md).
- Email sending configured on the Worker. The arbitrary-recipient product is the `env.EMAIL.send({ to, from, subject, html, text })` object form, not the `cloudflare:email` MIME form, which only reaches verified destinations.

This guide assumes you already have a running cairn site. If you are building one for the first time, start from the tutorial, then come back here.

## Steps

1. **Create the D1 database.** One auth store per site. Name it for the site so the two never cross.

   ```bash
   npx wrangler d1 create cairn-yoursite-auth
   ```

   Wrangler prints a `database_id`. The two production sites use `cairn-ecnordic-auth` and `cairn-907-auth` as their names.

2. **Bind it as `AUTH_DB`.** The auth layer reads the binding under that exact name, so the binding name is not free to change. Add it to the site's `wrangler` config with the printed id:

   ```toml
   [[d1_databases]]
   binding = "AUTH_DB"
   database_name = "cairn-yoursite-auth"
   database_id = "your-database-id"
   ```

3. **Apply the auth schema.** The schema creates three tables: `editor` (the allowlist plus each editor's role), `magic_token` (the hashed, single-use login tokens), and `session` (the opaque session rows the cookie points at). Apply the migration the engine ships:

   ```bash
   npx wrangler d1 execute cairn-yoursite-auth --remote --file ./migrations/0000_auth.sql
   ```

   Confirm the three tables landed:

   ```bash
   npx wrangler d1 execute cairn-yoursite-auth --remote \
     --command "SELECT name FROM sqlite_master WHERE type='table';"
   ```

4. **Seed the first owner.** A fresh allowlist is empty, so no email can log in yet and the site is locked out of its own admin. Insert one `owner` row to break in. Two roles exist, `owner` and `editor`: editors edit content, owners also manage the editor list. The engine never lets an owner remove or demote the last remaining owner, so this first row stays a safe floor. Timestamps are epoch milliseconds.

   ```bash
   npx wrangler d1 execute cairn-yoursite-auth --remote --command \
     "INSERT INTO editor (email, display_name, role, created_at) \
      VALUES ('you@example.com', 'Your Name', 'owner', 0);"
   ```

For the session model and a local smoke that mints a session by inserting a `session` row, see [Admin smoke test](../internal/admin-smoke-test.md).

## Verify

Request a magic link from `/admin`, open it, confirm the POST-confirm page, and you land an authenticated session. To confirm the binding and schema without the email loop, run the [Admin smoke test](../internal/admin-smoke-test.md), which mints a session by inserting a D1 row directly.

## See also

- [Core reference](../reference/core.md#auth-and-github-app) for the auth helper signatures.
- [The security model](../explanation/security-model.md#authentication) for the single-use-token and `__Host-` cookie design.
- [Where each kind of state lives](../explanation/data-tiers.md) for why auth state lives in D1 rather than git.
