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

## Prove your channel

Test the request, confirm, and revocation flow against a real database engine instead of a
hand-rolled mock, and drive a real browser through it before you ship. The engine proves
`createAuthChannel` itself this way, against a showcase fixture (`examples/showcase/src/members/`,
`examples/showcase/src/routes/members/`, and the e2e in
[`examples/showcase/e2e/members.spec.ts`](../../examples/showcase/e2e/members.spec.ts)). The
sections below name the pieces of that proof worth borrowing, and the last one names where the
fixture is a worked exemplar rather than a template to copy whole.

### Build a channel-DB double for tests

`@glw907/cairn-cms-dev` exports `createChannelDb(schemaSql)`, an in-memory `node:sqlite` double for
a channel's own D1 binding, playing the same role for `resolveDb` that `devBackendHandle` plays for
the engine's own `AUTH_DB`. It applies `schemaSql` once, at construction, and returns an object
carrying the store's own `prepare(sql).bind(...)`, `first()`/`run()`, and `withSession()` surface,
so a unit test or a local dev handle can hand it straight to `resolveDb` with no real Cloudflare
binding in sight:

```ts
import { createChannelDb } from '@glw907/cairn-cms-dev';
import { CHANNEL_SCHEMA_SQL } from '@glw907/cairn-cms/auth-channel';

const db = await createChannelDb(CHANNEL_SCHEMA_SQL);
const row = await db
  .prepare('SELECT value FROM cairn_channel_meta WHERE key = ?1')
  .bind('schema_version')
  .first<{ value: string }>();
```

`createChannelDb` requires `node:sqlite`, unflagged from Node.js 22.13. Call it on an older runtime
and it throws with a message naming the floor, rather than failing on an opaque module-resolution
error. Build and test on Node 22.13 or later everywhere this double runs, in CI and locally. There
is no reference page for `@glw907/cairn-cms-dev` today, so this section is where a consumer meets
the double. Read `packages/cairn-cms-dev/src/channel-db.ts` in the cairn repository for the full
contract if you need more than `prepare`, `bind`, `first`, `run`, and `withSession`.

Keep one instance per server process, not one per request: a fresh database on every request loses
the pending code row between a member's `request` and their `confirm`, and stales the factory's own
cached identity salt, which `createAuthChannel` provisions once per channel instance rather than
once per database read.

### Capture deliveries instead of sending them

Swap `deliver` for a capture transport in your test and local-dev wiring: instead of sending
anything, it remembers the last code and a delivery count per contact in module state, so a test or
a manual sign-in can read a code back without polling a real inbox or reaching into the database
directly. `examples/showcase/src/members/capture-transport.ts` is the worked shape:
`captureDeliver(contact, code, ctx)` records the delivery, `readCapture(contact)` reads it back, and
`resetCapture()` clears everything between test runs.

Carry the `devDelivery` in-body refusal forward on any transport you write yourself. Check
`ctx.env.CAIRN_DEV_BACKEND === '1'` inside the function body, never in a caller that wraps it.
`devDelivery`'s own refusal lives inside its body for exactly this reason, so wrapping it in
another function (`(c, code, ctx) => devDelivery(c, code, ctx)`) can't bypass the check. A capture
transport that checked the flag only at its call site would reopen that hole.

**A capture transport plus its readback route is a roster oracle by construction.** Delivery only
ever runs for a contact your `lookup` resolves, so a route that answers "was a code sent, and what
was it" answers, for any input, whether that input is a known member. Keep that route, and the
database it reads from, restricted to your own test fixture's roster. Never point a capture
transport or its readback route at a database holding real members' contacts. The showcase's own
readback route (`examples/showcase/src/routes/test/last-otp/+server.ts`) also refuses outside
localhost and without `CAIRN_DEV_BACKEND=1`, in its own body, for the same reason. Treat both
refusals as required, not as one belt-and-suspenders pair.

### Never let a captured code reach production logs

Wrapping `devDelivery`, or a capture transport built the same way, inside a deployed Worker with
`observability.enabled = true` lands every plaintext one-time code in Workers Logs, since a
`console` call anywhere in the request path is exactly what Workers Logs indexes. That's a real
disclosure, not a theoretical one. [The log events reference](../reference/log-events.md) states
plainly that a cairn-emitted record never carries a magic-link token, a session ID, or comparable
secret material, and a self-installed dev transport that ships to production breaks that promise
for your own channel's codes. Keep `devDelivery` and any capture transport behind the same
`CAIRN_DEV_BACKEND` flag through every deploy, and confirm your production `deliver` is the real
transport before you ship, not a debugging stand-in left wired in.

### Keep every mutation inside your channel's own actions

`request`, `confirm`, and `logout` check the request's origin unconditionally (see [Forged
requests](../explanation/auth-channel-security-model.md#forged-requests)), independent of
SvelteKit's own built-in origin check. If your site turns off that built-in check for some other
route (a webhook endpoint that can't carry a matching origin header, for instance), the factory's
own check is what still protects these three actions, but only these three. It has no reach over a
route you write yourself. Never add a route that mutates a member's roster row or session state
outside `memberChannel.actions`. A hand-written mutation sitting next to the channel inherits
neither its origin check nor its rate limiting, and a site-wide origin check turned off leaves it
with none at all.

### The showcase's own proof, worked

`examples/showcase/src/members/channel.ts` is the guide's own configuration, live: the same
`resolveDb`, `lookup`, `normalize`, and `cookie` shape the sections above walk through, wired to a
demo six-member roster of `@showcase.test` contacts. It diverges from a real site in two named
ways, so treat both as fixture-only:

- Its `challenge` hook is `insecureTestChallenge`, not Turnstile. CI has no route to
  `challenges.cloudflare.com`, so the fixture checks only that the login form carries a fixed,
  static token, never a real proof of humanity. Wire Turnstile instead, following [Wire Turnstile
  as the challenge hook](#wire-turnstile-as-the-challenge-hook), preceding this section: that
  section is the shipped shape, and `insecureTestChallenge` exists only so this fixture satisfies
  the required `challenge` field.
- Its `deliver` is the capture transport described earlier, not a real text message or email send.

[`examples/showcase/e2e/members.spec.ts`](../../examples/showcase/e2e/members.spec.ts) drives all
of it through a real browser. A golden path runs from request through confirm, logout, and the
post-logout refusal. A wrong code attempt precedes a correct one. A cooldown resend still answers
sent without minting a second code. A same-browser discipline check comes from a second,
cookie-isolated browser context. A revocation kills an already-signed-in session. Each spec uses
its own roster contact, since the escalation gate and the per-window send ceiling both key on the
bare contact identity and would otherwise share a budget across specs. Read it alongside this
guide before writing your own suite. It exercises the same rendered UI and readback route a
consumer's own e2e should, never the D1 tables directly.

One thing the fixture's pages do that yours should copy: they style themselves with plain utility
classes and avoid the DaisyUI component classes cairn's own rendered markdown emits, among them
`card-body`, `card-title`, and the `alert` variants. Tailwind scans your source files, never the
HTML cairn generates at runtime, so naming one of those classes in a page of your own is what
decides whether DaisyUI's base rules for it ship at all. Do that and every callout in your content
picks up the change, on pages you never edited.

## Read the operator logs

Nearly every `auth.channel.*` record carries `correlationId`, the first 16 hex characters of the
salted identity hash (never the contact itself), so you can group every log line from one login
attempt, or one member across attempts, without the record ever naming who they are. See [Log
events](../reference/log-events.md) for the full table, including the two cases where
`correlationId` is absent, and [Read cairn's logs](./read-cairn-logs.md) for querying it on a deployed
Worker.
