# Add a login channel

Build a login flow with `createAuthChannel` for an audience other than cairn editors: an athlete
roster, a membership, a booster list. Editors keep the zero-config email magic-link; this factory
is the supported way to add a second channel, over SMS, email, or whatever transport your own
`deliver` function sends a code through. Read [Auth channel](../reference/auth-channel.md) for
every config field and its failure modes, and [the security
model](../explanation/auth-channel-security-model.md) for the threat catalogue behind each
discipline below.

This guide builds a member SMS channel, bound as `MEMBER_DB`, wired at `/members/login`. Substitute
your own binding name, route, and transport throughout.

## Provision the schema

Create the database:

```bash
npx wrangler d1 create your-site-members
```

`createAuthChannel` owns the schema as one exported string, `CHANNEL_SCHEMA_SQL`; there is no
packaged `.sql` migration file for it the way there is for the engine's own auth store, since a
channel's binding is entirely your own.

**Give this database its own migrations directory, never your site's existing `migrations/`.**
`wrangler d1 migrations apply` applies every file it finds in a database's configured directory
to that database, so sharing one directory between two databases means the engine's own auth
migrations run against your member database and this channel's migration runs against `AUTH_DB`,
neither of which the schema on either side expects. Point this database at its own directory with
the per-database `migrations_dir` key:

```jsonc
{
  "d1_databases": [
    {
      "binding": "MEMBER_DB",
      "database_name": "your-site-members",
      "database_id": "<the id wrangler d1 create printed>",
      "migrations_dir": "migrations-members"
    }
  ]
}
```

Add a new file under that directory (`migrations-members/0000_channel.sql`) carrying this exact
statement. The engine's own test suite pins this block to `CHANNEL_SCHEMA_SQL` byte for byte, so
copy it verbatim rather than adapting it:

```sql
CREATE TABLE cairn_channel_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE cairn_channel_code (
  nonce_hash TEXT PRIMARY KEY,
  identity TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  subject TEXT,
  kind TEXT NOT NULL DEFAULT 'code',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  requester_bucket TEXT NOT NULL
);

CREATE TABLE cairn_channel_session (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE cairn_channel_budget (
  bucket TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  prev_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_cairn_channel_code_identity ON cairn_channel_code (identity);
CREATE INDEX idx_cairn_channel_code_expires ON cairn_channel_code (expires_at);
CREATE INDEX idx_cairn_channel_code_requester_bucket ON cairn_channel_code (requester_bucket);
CREATE INDEX idx_cairn_channel_session_subject ON cairn_channel_session (subject);
CREATE INDEX idx_cairn_channel_session_expires ON cairn_channel_session (expires_at);
CREATE INDEX idx_cairn_channel_budget_window ON cairn_channel_budget (window_start);

INSERT INTO cairn_channel_meta (key, value) VALUES ('schema_version', '1');
```

Apply it to both the local database `wrangler dev` reads and the remote one your deploy reads:

```bash
npx wrangler d1 migrations apply your-site-members --local
npx wrangler d1 migrations apply your-site-members --remote
```

Don't write anything for the identity salt. `createAuthChannel` provisions it itself, on first use,
so leave `cairn_channel_meta` carrying only the `schema_version` row this migration inserts.

## Build the channel

Construct one `createAuthChannel` instance and export it from a server-only module, so every route
that needs it imports the same instance:

<!-- snippet-check-skip: reads App.Platform (env, TURNSTILE_SECRET, MEMBER_DB), which only the site's own app.d.ts declares -->
```ts
// src/lib/server/member-channel.ts
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';
import { sendMemberOtp } from './sms.js';
import { lookupMemberByPhone, normalizePhone } from './roster.js';

export const memberChannel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendMemberOtp,
  lookup: lookupMemberByPhone,
  normalize: normalizePhone,
  challenge: (event, form) =>
    verifyTurnstile(
      String(form.get('cf-turnstile-response') ?? ''),
      event.platform?.env?.TURNSTILE_SECRET ?? '',
      { hostname: event.url.hostname, action: 'member-login' },
    ),
  cookie: { name: 'member_session' },
  ttl: { sessionTtlMs: 90 * 24 * 60 * 60 * 1000 },
});
```

## Wire the request, confirm, and logout routes

Each of the three routes is a plain SvelteKit action that calls through to the channel:

```ts
// src/routes/members/login/+page.server.ts
import type { Actions } from './$types';
import { memberChannel } from '$lib/server/member-channel.js';

export const actions: Actions = {
  default: (event) => memberChannel.actions.request(event),
};
```

```ts
// src/routes/members/confirm/+page.server.ts
import type { Actions } from './$types';
import { memberChannel } from '$lib/server/member-channel.js';

export const actions: Actions = {
  default: (event) => memberChannel.actions.confirm(event),
};
```

```ts
// src/routes/members/logout/+page.server.ts
import type { Actions } from './$types';
import { memberChannel } from '$lib/server/member-channel.js';

export const actions: Actions = {
  default: (event) => memberChannel.actions.logout(event),
};
```

The confirm form submits one field, `code`. Never add a hidden `contact` field to it: `confirm`
reads the pending code row by the nonce cookie alone and never re-derives identity from a submitted
contact, which is what keeps a stolen code useless outside the browser that requested it (see
[the security model](../explanation/auth-channel-security-model.md)). **A member must confirm in
the same browser that requested the code.** That is what makes an intercepted code worthless
anywhere but the browser that asked for it. Design your UI around it: don't invite a member to
confirm a code in a different browser or on a different device than the one that requested it.

## Read the signed-in subject

Every route under the member area reads the session with `resolveSubject`, typically from a
`+layout.server.ts` that guards the whole subtree and hands the subject down to its pages:

```ts
// src/routes/members/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { memberChannel } from '$lib/server/member-channel.js';

export const load: LayoutServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) throw redirect(303, '/members/login');
  return { subject };
};
```

`resolveSubject` returns `null` for an absent, expired, or `verify`-refused session, never throws.
The preceding `redirect` is your own route's policy, not the channel's. `subject` is whatever your
`lookup` function returned at request time, so treat it as an opaque id into your own roster, not a
display name or contact.

## Wire Turnstile as the challenge hook

`challenge` is Turnstile's natural home: `createAuthChannel` awaits it before minting any code and
on an escalated confirm, so a Turnstile widget on both your request and confirm forms is the whole
integration. Follow [Cloudflare](../reference/cloudflare.md#verifying-a-token) for `verifyTurnstile`
itself, the client-side widget script, and your sitekey/secret pair; the config example above shows
where it plugs in. `challenge` is required config, with no bypass: `createAuthChannel` throws at
construction if it's missing.

## Add a resend timer

The 60-second-by-default `cooldownMs` (see [Defaults and clamps](../reference/auth-channel.md#defaults-and-clamps))
is what the store enforces, but nothing stops a member from clearing cookies and requesting again
sooner: it exists to absorb an accidental double-click, not to gate anything security-relevant. Add
your own client-side countdown that disables the resend button for the configured window, so an
impatient tap doesn't waste an SMS: start the timer the moment `request` answers `{sent: true}`, and
re-enable the button when it elapses. The same holds for any shorter interval: it protects your
delivery budget, not the channel.

## Remove a member from the roster

Revoking access is two writes: delete or deactivate your own roster row, and call
`revokeSessions` so an already-signed-in member's session dies with it:

```ts
import type { D1Database } from '@cloudflare/workers-types';
import { memberChannel } from '$lib/server/member-channel.js';

export async function removeMember(db: D1Database, subject: string): Promise<void> {
  await memberChannel.revokeSessions(db, subject);
  // Then delete or deactivate the roster row itself, in your own store.
}
```

`db` here is your channel's own D1 binding (`MEMBER_DB`), the same one `resolveDb` reads.
`revokeSessions` deletes every session row for `subject`; a member removed mid-session loses access
on their very next request, not merely their next login.

## Mind read replication

If you turn on D1 read replication for this database, `resolveSubject` (which every authenticated
route calls) reads against the default consistency, so a session created by a very recent `confirm`
can miss a replica that hasn't caught up yet, the same lag `revokeSessions` already carries on the
revocation side. Either carry the D1 session bookmark in your own session cookie so a follow-up read
targets the replica that's actually current, or leave replication off on this database. Most sites
should leave it off: this database is a small roster and session table, not a read-heavy
public store, and replication's latency win rarely pays for the lag it introduces here.

## Disclose SMS as a restricted authenticator

If your transport is SMS, tell your members.
<!-- vale Google.Units = NO -->
NIST SP 800-63B lists SMS delivery as a **restricted authenticator**: a phone number can be ported
or SIM-swapped out from under its owner, so a code sent to it is weaker than one sent to an email
address or generated by an authenticator app.
<!-- vale Google.Units = YES -->
That's a property of the transport, not of this factory, and you own the disclosure. A short note
on the sign-in page, naming the code as convenient but not the strongest option available, is
enough; don't let a member assume SMS carries the same guarantees as an authenticator app or a
hardware key.

## Use `devDelivery` for local dev

Swap `deliver` for [`devDelivery`](../reference/auth-channel.md#devdelivery) while you build, so
local sign-in needs no real SMS or email provider:

<!-- snippet-check-skip: reads App.Platform (env, MEMBER_DB), which only the site's own app.d.ts declares -->
```ts
import { createAuthChannel, devDelivery } from '@glw907/cairn-cms/auth-channel';

export const memberChannel = createAuthChannel<App.Platform['env']>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: devDelivery,
  // ...the rest of your config, unchanged
});
```

`devDelivery` prints the code to the console and refuses to run unless
`CAIRN_DEV_BACKEND=1` is set, the same flag the engine's own dev-only transports read, so a
deployed site that never sets it can't ship this transport by accident.

## Read the operator logs

Nearly every `auth.channel.*` record carries `correlationId`, the first 16 hex characters of the
salted identity hash (never the contact itself), so you can group every log line from one login
attempt, or one member across attempts, without the record ever naming who they are. See [Log
events](../reference/log-events.md) for the full table, including the two cases where
`correlationId` is absent, and [Read cairn's logs](./read-cairn-logs.md) for querying it on a deployed
Worker.
