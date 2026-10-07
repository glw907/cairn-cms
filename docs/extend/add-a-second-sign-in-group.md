# Add a second sign-in group

An organization's site often has people beyond its editors who need to sign in, such as instructors who need a screen for their classes or club members who need pages that only members see.
The engine's sign-in exists only to gate the admin, so out of the box it knows the two kinds of people who work there, owners and editors, and signs them in by an emailed magic link.
For a second group, cairn supplies the sign-in through one of two mechanisms.
What a member or an instructor is, and the records the site keeps about them, stay in the site's code.

A declared role adds the group to the editors' roster in `AUTH_DB`, the D1 database behind editor sign-in, at `none` capability.
Its people sign in by the same magic link and find the engine's content screens closed to them.
At `/admin`, the engine sends them to a screen the site builds for the role.
An auth channel, built with `createAuthChannel`, gives the group a separate login that sends a numeric code over the site's transport, while the editors keep their magic link.
The channel keeps its sessions in a D1 database apart from `AUTH_DB`, and a channel session never becomes an editor's, so the group's area is a set of the site's SvelteKit routes outside `/admin`.
The channel exists for people the owner and editor sign-in was never meant to model.
Its factory mints and consumes codes and owns rate budgets, sessions, and revocation.
The site supplies the code's delivery, the roster lookup, the contact normalizer, and the check that a requester is human.

Whichever mechanism you choose, by the end the group signs in on your deployed site and lands in an area made for it.
The role path builds an instructor role whose `home` is `/admin/classes`, the declaration the [roles reference](../reference/core.md#defineroles) uses.
The channel path follows the members channel in the repository's example site, `examples/showcase`, which signs members in at `/members/login` and gates `/members`.
The example site's code delivery is a development stand-in, a capture transport that refuses outside the dev backend.
The channel path writes a `deliver` for your transport in its place.
The two mechanisms share no steps, so a developer who arrives having chosen, such as one sent here for a `none` role or to build a channel, builds only that path.

The steps assume a site built through [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) or scaffolded by the setup command, so its hooks file, its adapter module, its Wrangler bindings, and its D1 migrations are familiar.
They also assume SvelteKit load functions and form actions, and Vitest for the channel's test.

Three related tasks belong to other pages:

- To let a group write the site's content, see [Restrict admin access](restrict-admin-access.md).
- To sign the editors themselves in through the organization's identity provider, see [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md).
- To assess the channel's threat surface and the hazards a site's delivery function can introduce, see [The auth channel's threat surface](security-model.md#the-auth-channels-threat-surface).

A group that writes content needs editor capability, since `none` closes the engine's content screens, and an access map narrows what it reaches.

## Before you begin

Both mechanisms start from a cairn site whose editors already sign in by magic link, and each path adds the items labeled for it:

- A site whose editors sign in by magic link, with the auth database created and migrated as [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database) describes.
- For a role, an owner's sign-in, since an owner adds the role's people on `/admin/editors`.
- For a channel, a transport the Worker can call to send a code, such as an email or SMS provider.
- For a channel, the group's roster, in a store the site's code can read.
- For a channel, a Cloudflare [Turnstile widget and its secret key](https://developers.cloudflare.com/turnstile/get-started/), for the bot challenge the channel requires.
- For the channel's test, Node 24 or later and `@glw907/cairn-cms-dev` installed as a dev dependency, as [Wire the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend) installs it.

The dev package declares that Node floor, and nothing enforces it at runtime.
Which mechanism to build is the first decision.

## Choose the mechanism

A second group signs in either as a declared role in the editors' roster in `AUTH_DB` or through a separate login built with `createAuthChannel`.
The following table compares the two mechanisms by where each keeps its people and what the site builds.

|  | A declared role | An auth channel |
| --- | --- | --- |
| Sign-in | The same magic link editors use | A numeric code, 8 digits by default, sent by the site's transport |
| Roster | Rows in the `editor` table of `AUTH_DB`, added by an owner on `/admin/editors` | The site's store, read by the site's `lookup` |
| Sessions | Sessions in `AUTH_DB` that populate `locals.cairnEditor` with `none` capability | Sessions in the channel's D1 binding, never `AUTH_DB`, and never in `locals.cairnEditor` |
| Where people land | The role's `home` under `/admin`, or a welcome screen | The site's routes outside `/admin` |
| What the site builds | A screen at the role's `home` | The login route, the member area, the delivery, and the roster lookup |

A role suits a group that an owner adds person by person and that works in screens under `/admin`.
A channel suits a group whose roster the site already keeps and that never needs the admin.
For either mechanism, the site's code defines what a member, a class, or a dues payment is.
If you chose a channel, skip to [Sign the group in through a channel](#sign-the-group-in-through-a-channel).

## Sign the group in with a role

A role adds the group to the editors' roster at `none` capability, so its people sign in by the magic link and reach only the screens the site builds for them.
The steps build the instructor role from the [roles reference](../reference/core.md#defineroles), whose `home` is `/admin/classes`.
The steps start with the role's declaration.

### Declare the role

A role is one entry in the site's role vocabulary, declared with `defineRoles` on the adapter and passed to the guard, and an object entry's `home` names the `/admin` path its people land on.
To declare the role, follow these steps:

1. In `cairn.config.ts`, set the adapter's `roles` member to a `defineRoles` vocabulary that keeps `owner` and `editor` beside the instructor entry.

   <!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
   ```ts
   // src/lib/cairn.config.ts
   import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

   export const roles = defineRoles({
     owner: 'owner',
     editor: 'editor',
     instructor: { capability: 'none', home: '/admin/classes' },
   });

   export const cairn = defineAdapter({
     // content, backend, email, and rendering stay as they are
     roles,
   });
   ```

   A site that already declares `roles`, as [Restrict admin access](restrict-admin-access.md) does in `src/access.ts`, adds the instructor entry to that vocabulary instead.

2. In `src/hooks.server.ts`, pass the same vocabulary to `createAuthGuard` and `devBackendHandle` as their `roles` option.
   Keep any option either handle already receives, such as the scaffold's `access`, beside `roles`.

   <!-- snippet-check-skip: reads the __CAIRN_DEV_BUILD__ global that the site declares in its ambient types file -->
   ```ts
   // src/hooks.server.ts
   /// <reference types="node" />
   import type { Handle } from '@sveltejs/kit/hooks';
   import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
   import { roles } from '#lib/cairn.config.js';

   let handle: Handle;
   if (__CAIRN_DEV_BUILD__ && process.env.CAIRN_DEV_BACKEND === '1') {
     const { devBackendHandle } = await import('@glw907/cairn-cms-dev');
     handle = devBackendHandle({ roles });
   } else {
     handle = createAuthGuard({ roles });
   }

   export { handle };
   ```

The import uses `#lib`, which the `imports` field of `package.json` maps to `src/lib`, since SvelteKit 3 refuses a `$lib` import.

The vocabulary keeps `owner` and `editor` for two reasons.
`defineRoles` throws without an `owner` key mapped to owner capability, and a roster row whose role the vocabulary omits resolves to `none`, so dropping `editor` would close the content screens to every existing editor.

A `home` must be an absolute path under `/admin`, or `defineRoles` throws.
At `/admin`, the index redirects a role that declares a `home` to that path, and it shows a `none` role without one a welcome screen.
The `none` capability keeps the engine's content and roster screens closed to the role's people.

A guard created without `roles` resolves every session against the owner and editor pair, and [Verify the role signs in to its home screen](#verify-the-role-signs-in-to-its-home-screen) checks that wiring.
The [roles reference](../reference/core.md#defineroles) states the full rules for a declaration.
The `home` path needs a screen before anyone lands there.

### Build the role's home screen

The home path is a custom admin screen the site builds, and it gates on the session's role, because the access map admits no `none`-capability session.
To build the screen, follow these steps:

1. In the site's admin routes, create the screen's route for `/admin/classes`, as [Add a custom admin screen](add-a-custom-admin-screen.md) describes.
2. In the screen's server file, make the load function call `requireSession` and answer 403 to any session whose `role` the screen does not serve.

   ```ts
   // src/routes/admin/classes/+page.server.ts
   import type { PageServerLoad } from './$types';
   import { error } from '@sveltejs/kit';
   import { requireSession } from '@glw907/cairn-cms/sveltekit';

   export const load: PageServerLoad = async (event) => {
     const editor = requireSession(event);
     if (editor.role !== 'instructor') error(403, 'This screen is for instructors.');
     return { displayName: editor.displayName };
   };
   ```

The screen checks the role itself because `requireAccess` refuses every `none` session whatever the map says, since capability is the floor that the map only narrows.
The role's session is an ordinary roster row that populates `locals.cairnEditor` like an editor's, with `capability` resolved to `none`, so the session carries the role the screen checks.

An action on the screen needs the same check, since `createSectionAction` runs the map check on every call and refuses the role.
`createAdminAction` with its `access` option omitted authorizes nothing, so its handler checks the role itself.

The screen's sidebar link comes next.

### Show the home screen in the sidebar

A `navLayout` entry with a `roles` list shows the home screen's link only to the roles it names.
To add the link, follow this step:

- In `cairn.config.ts`, add a `navLayout` entry for `/admin/classes` to the adapter's `editor` group, with `roles` set to the instructor role.

  <!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
  ```ts
  // src/lib/cairn.config.ts
  export const cairn = defineAdapter({
    // content, backend, email, and rendering stay as they are
    roles,
    editor: {
      navLayout: [
        { label: 'Classes', icon: 'graduation-cap', href: '/admin/classes', roles: ['instructor'] },
      ],
    },
  });
  ```

The `roles` list names declared roles only, since a name the vocabulary does not declare fails validation.
Hiding a link is never authorization, so the screen's role check is what refuses everyone else.
The home path takes no rule in the access map, since an entry whose href matches a map rule shows only to the roles `canReach` admits, and `canReach` admits no `none` session.
[Restrict admin access](restrict-admin-access.md) covers the access map itself, and [Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers the rest of the sidebar.
The role's people come last, once the screen they land on exists.

### Add the role's people

An owner adds each of the role's people on `/admin/editors`, the screen that adds editors, once the auth database carries the migration that lets the roster hold a role beyond owner and editor.
To add the people, follow these steps:

1. In the project directory, copy `0001_roles.sql` from the package's `migrations` directory into the site's `migrations` directory.

   ```bash
   cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
   ```

2. In the project directory, apply the migration to the remote database with `wrangler d1 migrations apply` and the `--remote` flag.

   ```bash
   npx wrangler d1 migrations apply <auth-database-name> --remote
   ```

3. In the project directory, build and deploy the site as [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) does, so the screen that adds editors offers the new role.
4. On `/admin/editors`, enter the person's name and email.
5. In the **Role** list, choose the instructor role.
6. Select **Add editor**.
7. Tell the person to sign in at `/admin`, since adding them sends no email.

The role is ready to verify.

### Verify the role signs in to its home screen

A working role signs its people in by the magic link onto the home screen, with the screen's link in the sidebar and the engine's content screens closed to them.
To confirm that the role works, follow these steps:

1. After a build, in the project directory, run [`cairn doctor`](../reference/cli-cairn-doctor.md) and confirm that it reports no `auth.role-wiring-missing` warning. That warning means the guard never received the vocabulary.
   The check reads the site facts that a build writes.
2. As one of the role's people, open `/admin` on the deployed site and sign in with the emailed link.
3. Confirm that `/admin` lands on `/admin/classes`.
4. In the sidebar, confirm that the **Classes** link shows.
5. Open one of the engine's content screens, and confirm that it refuses the person.

If a check fails, see [Resolve a failed setup](#resolve-a-failed-setup).

## Sign the group in through a channel

`createAuthChannel` builds the request, confirm, and logout actions for a separate login over a numeric code.
The site supplies the routes, the code's delivery, and the roster.
The steps follow the members channel in the example site, which binds `MEMBER_DB`, names its cookie `member_session`, and serves `/members/login` and `/members`.
The channel's database comes first.

### Provision the channel database

The channel keeps its codes and sessions in a separate D1 database, bound beside `AUTH_DB` and never as it, with the packaged migration in a sibling migrations directory.
To provision the database, follow these steps:

1. In the project directory, create a D1 database for the channel the way [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database) creates the auth database, and note its id.

   ```bash
   npx wrangler d1 create <members-database-name>
   ```

2. In the project directory, copy the packaged channel migration into a new `migrations-members` directory.

   ```bash
   mkdir -p migrations-members
   cp node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql migrations-members/
   ```

3. In `wrangler.jsonc`, add a D1 database entry that binds the database as `MEMBER_DB` with `migrations_dir` set to `migrations-members`.

   ```jsonc
   "d1_databases": [
     {
       "binding": "AUTH_DB",
       "database_name": "<auth-database-name>",
       "database_id": "<the auth database id>",
       "migrations_dir": "migrations"
     },
     {
       "binding": "MEMBER_DB",
       "database_name": "<members-database-name>",
       "database_id": "<the id from the create output>",
       "migrations_dir": "migrations-members"
     }
   ]
   ```

4. In the project directory, apply the migration to the local database with the `--local` flag.

   ```bash
   npx wrangler d1 migrations apply MEMBER_DB --local
   ```

The local copy lets `wrangler dev` serve the channel while you build it.
The migration lives in a sibling directory because a shared `migrations_dir` applies each database's schema to the other the first time either is migrated.
Every statement in the migration is idempotent, so applying it to a database that already holds the tables changes nothing and records the migration.
The remote database takes the same migration in [Deploy the channel](#deploy-the-channel), once the code that reads it is ready to ship.
The reference's [packaged migration](../reference/auth-channel.md#the-packaged-migration) section describes the schema the file installs.
The channel module's `resolveDb` returns this binding.

### Write the channel module

A channel is one `createAuthChannel` call in a server-only module.
The call takes four functions the site writes, plus the channel's binding and a cookie name.
To write the module, follow these steps:

1. In the file that the following code block names, export `findMemberId(contact, { env })`, which resolves to the member's subject or `null`.
   The file sits in SvelteKit's [server-only module directory](https://svelte.dev/docs/kit/server-only-modules).

   ```ts
   // src/lib/server/members.ts
   export async function findMemberId(
     contact: string,
     { env }: { env: unknown },
   ): Promise<string | null> {
     // Look up the contact in your roster, reading the roster's binding from env.
     return null;
   }
   ```

2. In the same file, export `sendCodeEmail(contact, code)`, which sends the code over your transport and returns a promise.
   The [channel reference](../reference/auth-channel.md#createauthchannel) types `lookup`'s context as `{ env }` and `deliver` as `(contact, code, ctx) => Promise<void>`.

   ```ts
   // src/lib/server/members.ts
   export async function sendCodeEmail(contact: string, code: string): Promise<void> {
     // Send the code to the contact over your transport.
   }
   ```

3. In the file that the following code block names, create the channel with its six required members, typed over the Worker env.

   <!-- snippet-check-skip: imports cloudflare:workers, which a site's own Worker types declare -->
   ```ts
   // src/lib/server/member-channel.ts
   import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
   import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';
   import type { D1Database } from '@cloudflare/workers-types';
   import { env } from 'cloudflare:workers';
   import { findMemberId, sendCodeEmail } from './members';

   interface Env {
     MEMBER_DB?: D1Database;
     TURNSTILE_SECRET?: string;
   }

   export function normalizeContact(raw: string): string {
     return raw.trim().toLowerCase();
   }

   export const memberChannel = createAuthChannel<Env>({
     resolveDb: (env) => env?.MEMBER_DB,
     deliver: sendCodeEmail,
     lookup: findMemberId,
     normalize: normalizeContact,
     challenge: (_event, form) =>
       verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), env.TURNSTILE_SECRET ?? ''),
     cookie: { name: 'member_session' },
   });
   ```

4. In `.dev.vars` beside the Wrangler config, creating the file if needed, add the Turnstile secret key under the name the module reads.

   ```text
   TURNSTILE_SECRET=<your Turnstile secret key>
   ```

5. In `.dev.vars.example`, add the same name with an empty value.

   ```text
   TURNSTILE_SECRET = ""
   ```

6. In the project directory, run the command that `worker-configuration.d.ts` records on its first lines, so the generated `Env` carries the secret's name.
   A scaffolded site's file records the following command:

   ```bash
   npx wrangler types --env-file=.dev.vars.example --include-runtime=false
   ```

`wrangler dev` reads secrets from `.dev.vars` and never from a deployed Worker secret, so the production copy waits for [Deploy the channel](#deploy-the-channel).
The scaffold's `.gitignore` keeps `.dev.vars` out of git.
The module's own `Env` types only what the factory hands its functions, while the `env` imported from `cloudflare:workers` reads the generated type.

Each required member is a decision the site makes:

- `resolveDb` returns the `MEMBER_DB` binding from [Provision the channel database](#provision-the-channel-database).
- `deliver` sends the code over your transport, in place of the example site's development-only capture transport.
- `lookup` returns the stable subject for a normalized contact, or `null`, and that answer decides membership.
- `normalize` puts a contact in its canonical form before the lookup and the rate budgets use it.
- `challenge` wraps `verifyTurnstile`, which returns `false` on every failure and never throws. Passing the client address is optional, and the [Turnstile reference](../reference/cloudflare.md#verifyturnstile) states where one must come from.
- `cookie.name` is the base name of the session cookie and of its `_pending` nonce cookie, and a `cairn_` prefix belongs to the engine and throws.

`lookup` takes `{ env }` so it reaches the roster's binding, and it never reads request data.
Three of these functions carry an obligation the factory cannot check:

- `normalize` must be idempotent, canonical per identity, and injective across people, since a lossy one maps two people onto one rate budget.
- `lookup` must return a subject that is stable and canonical per person.
- `challenge` must actually verify a human, since it is the whole economic bound on guessing a code.

The reference's [config obligations](../reference/auth-channel.md#config-obligations) section states the three in full.
Of the optional members, `limits` adjusts the code, throttle, and session budgets within [clamps](../reference/auth-channel.md#defaults-and-clamps).
`rateLimit` adds [back pressure](../reference/auth-channel.md#rate-limiting) on `request` and `confirm` that is never a security control.
The channel returns `actions`, `resolveSubject`, and `revokeSessions` and ships no route or UI, so the site builds the routes that call them.

### Build the login route

The example site folds request and confirm onto `/members/login` as two named form actions that pass the event to the channel's actions and switch on each outcome.
To build the login route, follow these steps:

1. In `src/routes/members/login/+page.server.ts`, add a load function that redirects a visitor who already has a session to `/members`.
2. In the same file, add a `request` action that passes the event to `actions.request` and answers `fail(400, ...)` on any outcome but `sent`.
3. In the same file, add a `confirm` action that passes the event to `actions.confirm`, redirects to `/members` on `confirmed`, and answers `fail(400, ...)` otherwise.
4. In the same file, export `prerender = false`, so a site that prerenders by default still serves the route from the Worker.
5. In the route's page component, add a request form that posts a `contact` field to the `request` action.
6. In the request form, add the Turnstile widget as Cloudflare's [Embed the widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) guide describes, so the form posts the token your `challenge` reads.
7. In the same component, add a confirm form that posts a `code` field to the `confirm` action.

The following server file holds the load function and both actions:

```ts
// src/routes/members/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { memberChannel } from '#lib/server/member-channel.js';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  if (await memberChannel.resolveSubject(event)) redirect(303, '/members');
};

export const actions: Actions = {
  request: async (event) => {
    const result = await memberChannel.actions.request(event);
    if (result.outcome !== 'sent') return fail(400, { requestError: result.outcome });
    return { requested: true };
  },
  confirm: async (event) => {
    const result = await memberChannel.actions.confirm(event);
    if (result.outcome !== 'confirmed') return fail(400, { confirmError: result.outcome });
    redirect(303, '/members');
  },
};
```

The following page component holds both forms:

```svelte
<!-- src/routes/members/login/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" action="?/request">
  <label>Email <input name="contact" type="email" autocomplete="email" required /></label>
  <!-- Cloudflare's Turnstile widget renders here and posts its token with the form. -->
  <button>Send code</button>
</form>
{#if form?.requestError}<p role="alert">A code could not be sent. Try again.</p>{/if}

<form method="POST" action="?/confirm">
  <label>Code <input name="code" inputmode="numeric" autocomplete="one-time-code" required /></label>
  <button>Sign in</button>
</form>
{#if form?.confirmError}<p role="alert">That code did not work. Try again.</p>{/if}
```

The two actions switch on outcomes, which carry the failures a member can retry.
A wrong code answers `bad-code` and mints no session, and a false or thrown challenge answers `challenge-required` without minting.
The reference's [types table](../reference/auth-channel.md#types) lists every outcome.
A confirmed code lands the member on `/members`, which needs a gate.

### Gate the member area

A channel session never populates `locals.cairnEditor`, so the member area lives in the site's own routes outside `/admin`.
Each route resolves the subject with `resolveSubject` in its load function.
To gate the member area, follow these steps:

1. In `src/routes/members/+page.server.ts`, add a load function that calls `resolveSubject` and redirects to `/members/login` when it returns `null`.
2. In the same file, add a `logout` action that calls `actions.logout` and redirects to the login page.
3. In the same file, export `prerender = false`, so the gate runs on every request even on a site that prerenders by default.
4. In `src/routes/members/+page.svelte`, render the member's area and add a sign-out form that posts to the `logout` action.

The following server file holds the load function and the logout action:

```ts
// src/routes/members/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { memberChannel } from '#lib/server/member-channel.js';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  const subject = await memberChannel.resolveSubject(event);
  if (!subject) redirect(303, '/members/login');
  return { subject };
};

export const actions: Actions = {
  logout: async (event) => {
    await memberChannel.actions.logout(event);
    redirect(303, '/members/login');
  },
};
```

The following page component holds the sign-out form:

```svelte
<!-- src/routes/members/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1>Members</h1>
<p>You are signed in as {data.subject}.</p>
<form method="POST" action="?/logout">
  <button>Sign out</button>
</form>
```

The asset layer serves a prerendered page without running the Worker, so a prerendered gated page would never run its gate.

The subject is the string `lookup` returned, so the page loads the member's records by it from the site's store.
Logout deletes the session cookie and that one session's row, and it leaves the member's other sessions alone.
A member the site removes keeps any open session until the session expires or the site ends it.

### End a removed member's sessions

A channel session lasts 30 days by default.
A site ends a removed member's sessions early in either or both of the following ways:

- To check the roster on every resolution, give the channel's config a `verify` function that returns `false` for a subject off the roster.
- To end sessions at removal, call the exported channel's `revokeSessions` from the site's removal code with the binding and the subject.

A `false` from `verify` destroys the session row, while a throw refuses only that resolution and keeps the row.
`verify` takes the same `{ env }` context as `lookup` and never reads request data.
`revokeSessions` ends every session for that identity at once.
The [channel reference](../reference/auth-channel.md#createauthchannel) describes calling it outside a request.
A Vitest run on Node can prove the channel before it deploys.

### Test the channel on Node

`createChannelDb`, exported from `@glw907/cairn-cms-dev`, applies the channel's migration to an in-memory SQLite database and returns a D1-shaped double, so a Vitest run on Node can drive the channel's actions with no Worker.
To test the channel, follow these steps:

1. In `vitest.config.ts`, confirm that `test.server.deps.inline` lists `@glw907/cairn-cms`, as the scaffold's config does, and add it if it's missing.
2. In a test file beside the channel module, write a test that drives the channel's request action against the double.

   ```ts
   // src/lib/server/member-channel.test.ts
   import { readFileSync } from 'node:fs';
   import { expect, it, vi } from 'vitest';
   import type { D1Database } from '@cloudflare/workers-types';
   import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
   import { createChannelDb } from '@glw907/cairn-cms-dev';
   import { normalizeContact } from './member-channel';

   const worker = vi.hoisted(() => ({
     env: {} as { MEMBER_DB?: D1Database },
     pending: [] as Promise<unknown>[],
   }));

   vi.mock('cloudflare:workers', () => ({
     env: worker.env,
     waitUntil: (promise: Promise<unknown>) => {
       worker.pending.push(promise);
     },
   }));

   it('sends a code to a contact on the roster', async () => {
     const schema = readFileSync('migrations-members/0000_channel.sql', 'utf8');
     worker.env.MEMBER_DB = (await createChannelDb(schema)) as unknown as D1Database;
     const sent: string[] = [];
     const channel = createAuthChannel<{ MEMBER_DB?: D1Database }>({
       resolveDb: (env) => env?.MEMBER_DB,
       deliver: async (_contact, code) => {
         sent.push(code);
       },
       lookup: async (contact) => (contact === 'member@example.com' ? 'member-1' : null),
       normalize: normalizeContact,
       challenge: async () => true,
       cookie: { name: 'member_session' },
     });

     const url = new URL('http://localhost:5173/members/login');
     const event = {
       url,
       request: new Request(url, {
         method: 'POST',
         body: new URLSearchParams({ contact: 'member@example.com' }),
         headers: { origin: url.origin },
       }),
       params: {},
       route: { id: '/members/login' },
       cookies: { get: () => undefined, set: () => {}, delete: () => {} },
       setHeaders: () => {},
       locals: {},
       getClientAddress: () => '127.0.0.1',
     };

     const result = await channel.actions.request(event);
     await Promise.all(worker.pending);

     expect(result).toEqual({ outcome: 'sent' });
     expect(sent).toHaveLength(1);
     expect(sent[0]).toMatch(/^\d{8}$/);
   });
   ```

3. In the project directory, run the test with Vitest.

   ```bash
   npx vitest run
   ```

The test's shape follows from how the engine reaches the Worker.
The mock supplies the Worker env and a `waitUntil` that collects promises, held in a hoisted object so the mock factory can reach them, since the engine reads every binding and `waitUntil` from `cloudflare:workers`.
Inlining runs the engine through Vitest's transform, so that mock reaches the engine's import.
The double goes on the mocked env as `MEMBER_DB`, built from the site's copy of the migration, the file its binding applies.
The test's channel keeps the module's normalizer and stands in for the delivery, the challenge, and the roster lookup.
The event carries a local URL and an `Origin` header that matches it, since every action refuses a mismatched `Origin` or plain http outside a local host.
After awaiting the collected promises, the test asserts that the request answered `sent` and that the stand-in delivery received one 8-digit code.

The double runs only on Node, since under workerd `node:sqlite` resolves but the database constructor throws.
Under `wrangler dev`, the channel reads the local D1 database that [Provision the channel database](#provision-the-channel-database) migrated.
A passing test leaves the channel ready to deploy.

### Deploy the channel

The deployed site needs the channel's migration on the remote database and the Turnstile secret as a Worker secret before the code that reads them goes live.
To deploy the channel, follow these steps in order:

1. In the project directory, apply the channel migration to the remote database with `wrangler d1 migrations apply` and the `--remote` flag.

   ```bash
   npx wrangler d1 migrations apply MEMBER_DB --remote
   ```

2. In the project directory, store the Turnstile secret key as a Worker secret under the name the module reads, with `wrangler secret put`.

   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   ```

3. In the project directory, build and deploy the site as [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) does.

   ```bash
   npm run build
   npx wrangler deploy
   ```

Because `wrangler secret put` creates and deploys a new Worker version at once, the secret is live before the deploy ships the code that reads it.

### Verify a member signs in to the member area

A working channel signs a member in on the deployed site with a code from your transport, lands them on `/members`, and signs them out again.
To confirm that a member signs in, follow these steps:

1. In the roster store that `lookup` reads, make sure a contact you can receive a code at is on the roster.
2. On the deployed site's `/members/login`, request a code for that contact.
3. On `/members/login`, enter the code your transport delivered.
4. Confirm that the page redirects to `/members`.
5. On `/members`, sign out.
6. Confirm that the login page returns.
7. Confirm that `/members` now redirects to the login page.

If a check fails, see [Resolve a failed setup](#resolve-a-failed-setup).

## Resolve a failed setup

The following checks cover the common failures, the role's on `/admin/editors` and at its home screen, then the channel's at construction and at the challenge:

1. If adding a person with the new role fails on `/admin/editors`, apply `0001_roles.sql` to the auth database as [Add the role's people](#add-the-roles-people) does.
   Until `0001_roles.sql` runs, the roster holds only owner and editor.
2. If the person lands on the welcome screen and not the home screen, check that the deployed vocabulary gives the role a `home`.
   A role the vocabulary omits resolves to `none`, and a `none` role with no `home` gets the welcome screen.
3. If the home screen answers 403 to the role, replace `requireAccess` in its load function with the role check from [Build the role's home screen](#build-the-roles-home-screen).
4. If the channel module throws when it first loads, read the construction error.
   The factory throws on a missing required function, a missing, empty, or `cairn_`-prefixed cookie name, or a non-integer, non-positive, or out-of-range limit.
5. If every code request answers `challenge-required`, check that the Turnstile secret is set where the running Worker reads it.
   Under `wrangler dev` the Worker reads the secret from `.dev.vars`, and on the deployed site from a Worker secret.
6. If the secret is set and requests still answer `challenge-required`, check the token field your `challenge` reads.
   Because `verifyTurnstile` returns `false` on every failure and never throws, a missing secret and a missing token both answer `challenge-required`.
7. Otherwise, read the auth channel's rows in the [log events](../reference/log-events.md) reference.

## See also

The following pages cover the seams and limits around a second group:

- [The auth channel's threat surface](security-model.md#the-auth-channels-threat-surface) covers the hazards a site's delivery function can introduce.
- [Restrict admin access](restrict-admin-access.md) narrows which editor-capability roles reach which admin screens.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers the rest of the sidebar.
- [Auth channel](../reference/auth-channel.md) states every channel option, default, clamp, and outcome.
- [Roles](../reference/core.md#roles) states the role vocabulary and how each capability resolves.
