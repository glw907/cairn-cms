# Configure auth and D1

Every cairn site keeps its own signed-in state in one D1 database, bound as `AUTH_DB`. There is
no third-party auth service and no signing secret: an editor's session is a row in that database,
and the cookie holds nothing but the row's own id. You provision that database below, add two more
`wrangler.jsonc` bindings, and finish by running a real sign-in on a dev site before you deploy.

If you haven't declared your adapter yet, start with
[Define an adapter and schema](./define-an-adapter-and-schema.md). This guide assumes a working
`cairn.config.ts` with an `email.from` address already set.

## Provision the D1 database

Create the database and note the id wrangler prints back:

```bash
npx wrangler d1 create your-site-auth
```

The schema is three tables: an `editor` allowlist, single-use `magic_token` rows, and `session`
rows. Save it as `migrations/0000_auth.sql` in your site's own repo (the engine doesn't ship this
file inside the npm package, since a site's migrations are the site's to own and version):

```sql
-- Self-owned magic-link auth on D1. Timestamps are epoch milliseconds.
CREATE TABLE editor (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
  created_at INTEGER NOT NULL
);

CREATE TABLE magic_token (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_magic_token_email ON magic_token (email);
CREATE INDEX idx_session_email ON session (email);
```

Apply it to both the local database `wrangler dev` reads and the remote one your deploy reads:

```bash
npx wrangler d1 migrations apply your-site-auth --local
npx wrangler d1 migrations apply your-site-auth --remote
```

## Bind AUTH_DB, EMAIL, and PUBLIC_ORIGIN

Three entries in `wrangler.jsonc` cover the whole auth surface:

```jsonc
{
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "your-site-auth",
      "database_id": "<the id wrangler d1 create printed>"
    }
  ],
  "send_email": [{ "name": "EMAIL" }],
  "vars": {
    "PUBLIC_ORIGIN": "https://your-site.example"
  }
}
```

cairn builds every confirmation link from `PUBLIC_ORIGIN`, never from a request header, so a forged
`Host` header can't redirect a magic link to an attacker's origin. It must be `https://` in
production. `http://localhost` and `http://127.0.0.1` are the only exceptions, matched exactly so a
lookalike host like `localhost.example.com` can't slip through. A wrong value would misdirect
email, so two checks guard it: a runtime guard (`config.public-origin-invalid`) and cairn-doctor
([Cloudflare readiness](./cloudflare-readiness.md)). A bad origin surfaces before an editor ever
clicks a link.

## Seed the first owner

The engine ships no signup flow, on purpose: cairn's allowlist is a roster you control. The public
can't add themselves; you insert every editor by hand. Insert the first row yourself:

```bash
npx wrangler d1 execute your-site-auth --remote --command \
  "INSERT INTO editor (email, display_name, role, created_at) \
   VALUES ('you@your-site.example', 'Your Name', 'owner', 0);"
```

The `created_at` value is cosmetic (nothing reads it for access control), so `0` is fine for a
seed row. Add more editors later from the admin's own `/admin/editors` screen, which is
owner-gated: an `editor`-role account can sign in and write content but never sees that screen.
cairn also refuses to let the allowlist reach zero owners, so removing or demoting the last owner
through the admin fails closed rather than locking everyone out.

## Onboard your sending domain

Cloudflare Email Sending is the delivery path for every magic link, and it needs its own one-time
setup separate from the `EMAIL` binding you just wired: onboard a sending domain (or subdomain) on
the account before the binding can reach an inbox. Do this once, from **Compute > Email
Service > Email Sending** in the Cloudflare dashboard, choosing the domain your `email.from`
address lives on. Cloudflare adds the SPF, DKIM, and DMARC records for you, and they typically
propagate in minutes. Arbitrary-recipient sending also requires the Workers Paid plan; the free
tier only reaches addresses you've separately verified as destinations.

An unboarded domain doesn't fail loudly. The request-a-link form still returns its neutral "check
your inbox" response (cairn never reveals allowlist membership through that response), and the
failure surfaces only in the log:

| What Cloudflare returns | What it means | The fix |
|---|---|---|
| `E_SENDER_NOT_VERIFIED` | Your `from` address's domain isn't onboarded for Email Sending. | Onboard the domain. |
| A bare "not a verified address" error, no code | Same cause; some binding paths omit the structured code. | Same fix. |

cairn maps both of those to one diagnostic condition, `email.sender-not-onboarded`, logged as
`auth.link.send_failed` with that `conditionId`. Any other send failure logs the generic
`email.send-failed` instead. See
[Log events](../reference/log-events.md) for the full record shape, and
[Read cairn's logs](./read-cairn-logs.md) for querying it on a deployed Worker.

## The session model

A session row carries only an email, an expiry, and its own id; the cookie carries that id and
nothing else, so there is nothing to sign and no JWT:

| Table | Row | Lifetime |
|---|---|---|
| `magic_token` | One per pending sign-in, replaced on a second request. | 10 minutes |
| `session` | One per signed-in browser. | 30 days |

A request lands with the cookie, the guard looks the row up by `id`, and it joins `editor` to
resolve the role live. That last part matters: because the role comes from the `editor` row on
every request, changing someone's role in `/admin/editors` takes effect on their very next
request, with no new cookie and no logout required. The cookie itself is Secure and takes the
`__Host-` prefix (`__Host-cairn_session`) whenever the connection is https, which binds it to the
exact origin; on local `http://localhost` the prefix and the Secure flag both drop, since browsers
require Secure for `__Host-`. cairn throttles a magic link to one send per email per minute, so
double-clicking "send link" can't flood an inbox.

## Sign in end to end on a dev site

This section runs a real sign-in against the remote D1 and real Email Sending, so a wrong
`PUBLIC_ORIGIN` or an un-onboarded sending domain surfaces here rather than when an editor first
tries to log in.

By default, `wrangler dev` simulates both bindings: it gives you a local D1 and logs outgoing mail
to the console instead of sending it. Set `remote: true` on both bindings to swap in the real
services while your Worker code still runs locally:

```jsonc
{
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "your-site-auth",
      "database_id": "<the id wrangler d1 create printed>",
      "remote": true
    }
  ],
  "send_email": [{ "name": "EMAIL", "remote": true }]
}
```

1. **Confirm you have a seeded owner in the remote database**, using an email address you can
   receive mail at. [Seed the first owner](#seed-the-first-owner) already did this if you
   ran the insert with `--remote`.
2. **Start the dev server** and note the origin it prints (`wrangler dev`, or `npm run dev` on a
   site built with `@sveltejs/adapter-cloudflare`). Your `PUBLIC_ORIGIN` var has to equal that
   origin exactly, port included, or the emailed link points at the wrong place.
3. **Open `/admin/login`** in a browser and submit your seeded email.
4. **Check your inbox.** The email carries one link (labeled "Sign in"); clicking it lands on a
   confirm page that shows nothing to fill in, just a "Sign in" button. That extra step is deliberate: it
   consumes the token from a same-origin POST rather than the GET a link click naturally makes, so
   the token in the URL can't leak through a referrer header on the way to the confirm page.
5. **Click "Sign in."** You land on `/admin`. Your browser now holds a session row that a magic
   link produced, the same path an editor follows on the deployed site.

This step sends actual mail through Email Sending, so use an address you own and expect the
message to land in a real inbox. If your site's
showcase or scaffold carries a `CAIRN_DEV_BACKEND` opt-in for fake local bindings, leave it unset
for this walkthrough. A fake backend never touches Email Sending or D1, and it would prove nothing
about your actual configuration.

## When it doesn't work

Start with `npx cairn-doctor`, which probes the bindings, the sending domain, and D1 reachability
in one pass and names the failing check by its condition id. Past that, match the symptom to its log
event in [Log events](../reference/log-events.md); each step in this guide logs one
(`auth.link.requested`, `auth.token.minted`, `auth.link.send_failed`, `auth.token.confirmed`,
`auth.session.created`). Prefer starting from the symptom instead of the log? Work through
[Troubleshooting](./troubleshooting.md#an-editor-cant-sign-in). The redaction guarantees behind
these records (no token, no session id, ever logged) live in
[The security model](../explanation/security-model.md).
