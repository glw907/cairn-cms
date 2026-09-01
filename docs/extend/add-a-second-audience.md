# Add a second audience

Give a population beyond your editors somewhere to sign in and something restricted to see once
they do. Which mechanism to build that on is a fork, and it turns on one question: does this
audience sign in the way your editors already do, or do they need a login that has nothing to do
with cairn's own roster at all?

## The fork

**A staff-shaped audience who should still use your magic-link sign-in, restricted to one
corner of the admin.** An instructor, a volunteer coordinator, anyone who is effectively editor
adjacent but has no business in your content list. Use a role mapped to `none` capability with
its own `home`. Price: they're still rows in your `AUTH_DB` editor table, invited and removed the
same way an editor is, from [Invite editors](../admin/invite-editors.md). This is the default for
an audience that's small, trusted the way an editor is, and fine sharing your existing invite
flow.

**A genuinely separate population, with its own identity and its own volume.** Members, athletes,
customers, anyone who was never going to be "invited" the way an editor is, and who needs a
login your GitHub-backed roster has no reason to model. Use
[`createAuthChannel`](../reference/auth-channel.md), a wholly separate login with its own D1
store, its own session, and its own area outside `/admin` entirely. Price: you build and own that
area yourself; nothing here plugs into `CairnAdminShell`, since that shell renders a cairn editor
session and this audience isn't one.

## Path A: a role with its own admin corner

Declare the role with `{ capability: 'none', home: '/admin/classes' }`:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the roles member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
  instructor: { capability: 'none', home: '/admin/classes' },
});

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  roles,
});
```

`none` capability means the engine's own content and roster screens refuse this role; it still
authenticates through the same magic-link flow every editor uses, and `locals.cairnEditor`
populates the same way. `home` is where `/admin` redirects a session with no other landing: a
`none`-capability role with no declared `home` lands on a minimal signed-in screen instead ("no
content access here"), so declare one whenever this role's whole reason for existing is a custom
screen.

Build that screen the way [Add a custom admin screen](./add-a-custom-admin-screen.md) describes,
gate it in the [access map](./restrict-admin-access.md) against this role's name, and place it in
the sidebar (or hide everything else from it) with
[`navLayout`](./organize-your-admin-nav.md)'s `roles` field:

```ts
{
  label: 'Classes',
  roles: ['instructor'],
  children: [{ label: 'My roster', icon: 'graduation-cap', href: '/admin/classes' }],
}
```

An instructor invited this way is still added and removed through [the same invite
screen](../admin/invite-editors.md): the role selector renders your declared vocabulary once it's
larger than the default owner/editor pair.

## Path B: a wholly separate login

`createAuthChannel` builds request, confirm, and logout actions over an 8-digit-by-default code
(configurable from 8 to 10 digits), delivered however you choose, backed by a D1 binding that is
never `AUTH_DB`:

```ts
// src/lib/members/channel.ts
import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
import type { CairnEvent, DeliverContext } from '@glw907/cairn-cms/auth-channel';
import type { Env } from '../env.js';

declare function sendCode(contact: string, code: string, ctx: DeliverContext<Env>): Promise<void>;
declare function contactToMemberId(contact: string, ctx: { env: Env | undefined }): Promise<string | null>;
declare function normalizeContact(raw: string): string;
declare function verifyChallenge(event: CairnEvent<Env>, form: FormData): Promise<boolean>;

export const memberChannel = createAuthChannel<Env>({
  resolveDb: (env) => env?.MEMBER_DB,
  deliver: sendCode, // your own transport: SMS, email, whatever reaches this audience
  lookup: contactToMemberId, // normalized contact -> stable subject id, or null
  normalize: normalizeContact, // idempotent, canonical, injective per person
  challenge: verifyChallenge, // a bot challenge; required, and load-bearing
  cookie: { name: 'member_session' },
});
```

`lookup` and the optional `verify` each take a `{ env }` context alongside their subject, so a
roster read reaches its own binding without the channel holding one. Neither may read
request-shaped data: `lookup` decides whether a contact is a member, and a `false` from `verify`
destroys the session row.

`normalize`, `lookup`, and `challenge` each carry a correctness obligation the factory can't
verify on its own: a lossy `normalize` maps two people onto one identity's rate budget, and
`challenge` is the whole economic bound on guessing a code. See [the auth channel
reference](../reference/auth-channel.md#config-obligations) for what each one owes, and [the
security model](./auth-channel-security-model.md) for the threat catalogue this design answers.

Mount the channel's actions on your own route, apply the packaged channel migration once against
your own binding (never `AUTH_DB`), and build the member-facing area itself as ordinary SvelteKit
routes outside `/admin`, gated by `channel.resolveSubject(event)` rather than by anything cairn's
own guard resolves. Nothing about this area needs to look like cairn's admin; it's your own
surface end to end. Reach for [`@glw907/cairn-cms/admin-toolkit`](../reference/admin-toolkit.md)
anyway if you want the same consistent list-and-form scaffolding this audience's portal can share
with your staff-facing screens, since the toolkit's primitives carry no dependency on a cairn
editor session.

Give the channel database its own `wrangler.jsonc` entry, with its own `migrations_dir` distinct
from the one your site's `AUTH_DB` uses:

```jsonc
{
  "d1_databases": [
    { "binding": "AUTH_DB", "database_name": "my-site-auth", "migrations_dir": "migrations" },
    {
      "binding": "MEMBER_DB",
      "database_name": "my-site-members",
      "migrations_dir": "migrations-members"
    }
  ]
}
```

A shared `migrations_dir` runs cairn's own auth migrations against the channel database, and the
channel's schema against the site's auth store, the first time you apply either. Copy the engine's
packaged migration, `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql`, into that
separate directory and apply it with `wrangler d1 migrations apply MEMBER_DB`. Every statement in
it is idempotent, so a database you provisioned by hand before the file shipped can adopt it: insert
the `d1_migrations` marker for `0000_channel.sql` rather than re-applying. See [the auth channel
reference](../reference/auth-channel.md#the-packaged-migration) for what the schema holds.

Test the channel against a real D1-shaped double with `@glw907/cairn-cms-dev`'s
`createChannelDb`, which needs `node:sqlite`. That package's `engines.node` field enforces the
floor at install time, so `createChannelDb` itself carries no runtime guard.

## You know it worked when

Path A: the role signs in through the same magic link, lands on its declared `home`, and can
reach nothing else `defineAccess` doesn't name for it. Path B: a member requests a code, confirms
it, and `resolveSubject` returns their subject id on the next request; a wrong code fails closed
and an unconfigured challenge never silently passes.
