# Add a second sign-in group

Some sites need people besides editors to sign in, to reach screens or pages made for them. The sign-in that cairn ships exists to gate the admin. By default it signs in only owners and editors, by an emailed magic link. For a second group, cairn supplies the sign-in through one of two mechanisms. What a staff member or a member is, and the records kept about them, stay the site's code.

A declared role adds the group to the editors' roster at `none` capability. That roster lives in `AUTH_DB`, the D1 database behind editor sign-in. The role's people sign in by the same magic link, find the engine's content screens closed to them, and land on a screen the site builds under `/admin`. An auth channel, built with `createAuthChannel`, gives the group a separate login instead. Its people sign in with a numeric code sent over the site's transport, and their sessions live in a D1 database apart from `AUTH_DB`. A channel session never becomes an editor's session, and the group's area is made of the site's SvelteKit routes outside `/admin`.

The channel exists for people the owner and editor sign-in was never meant to model, such as members or customers. Its factory mints and consumes the codes and keeps the rate budgets, the sessions, and revocation. The site supplies the delivery, the roster lookup, and the check that a requester is human. Under either mechanism, editors keep signing in by magic link.

Whichever mechanism you choose, by the end the group signs in on your deployed site and lands in an area made for it. The role path follows a `staff` role whose `home` is `/admin/staff`, the declaration the roles reference uses. The channel path follows the members channel in the repository's example site, `examples/showcase`. That channel signs members in at `/members/login` and gates the `/members` page. Both paths end in a deploy and a check on the deployed site, and each covers the following work:

- The role path declares the role, builds its home screen and sidebar link, adds the role's people, and checks their sign-in.
- The channel path provisions a database, writes the channel module, and builds the login route and the member area. It ends a removed member's sessions with `verify` or `revokeSessions`, and it tests the channel on Node with Vitest and `createChannelDb` before the deploy.

The two paths share no steps.

The page assumes a site that `create-cairn-site` scaffolded or that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) built. You should know that site's hooks file, its adapter module, its Wrangler bindings, and how to apply a D1 migration, as well as SvelteKit load functions, form actions, and, for the channel's test, Vitest. The page leaves three subjects to other pages:

- [Restrict admin access](restrict-admin-access.md) covers access maps and a group whose people write the site's content. Such a group needs editor capability, because `none` capability closes the engine's content screens, and this page configures no access map.
- [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) signs the editors themselves in through the organization's identity provider.
- [The security model's auth channel section](security-model.md#the-auth-channels-threat-surface) covers the channel's threat surface and the hazards a site's delivery function can introduce.

## Before you begin

Both mechanisms start from a working cairn site, and each path adds the preconditions labeled for it:

- A site whose editors sign in by magic link, with the auth database created and migrated as [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database) describes.
- For a role, an owner who can sign in, since an owner adds people on `/admin/editors`.
- For a role, the `cairn` CLI, for the wiring check that [`cairn doctor`](../reference/cli-cairn-doctor.md) runs. It installs separately from the npm package, with `go install github.com/glw907/cairn-cms/tool/cmd/cairn@latest` or from a release archive.
- For a channel, a transport the Worker can call to send a code, such as an email or SMS provider.
- For a channel, the group's roster in a store the site's code can read.
- For a channel, a [Cloudflare Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/) and its secret key, because the channel's `challenge` must verify a human, never return `true` unconditionally.
- For the channel's test, `@glw907/cairn-cms-dev` installed as a dev dependency, as [Wire the dev backend](add-cairn-to-a-sveltekit-app.md#wire-the-dev-backend) installs it. The test needs Node 24 or later, the floor that the package's `engines.node` field declares.

With these in place, the first decision is which mechanism to build.

## Choose the mechanism

The following table compares the two mechanisms by where each keeps its people and what the site builds.

| | A declared role | An auth channel |
|---|---|---|
| Sign-in | The same magic link editors use | A numeric code, 8 digits by default, sent over the site's transport |
| Roster | Rows in the `editor` table of `AUTH_DB`, added by an owner on `/admin/editors` | The site's store, read by the site's `lookup` |
| Sessions | Sessions in `AUTH_DB` that populate `locals.cairnEditor` with `none` capability | Sessions in the channel's D1 binding, never in `AUTH_DB` and never in `locals.cairnEditor` |
| Where people land | The role's `home` under `/admin`, or the welcome view | The site's routes outside `/admin` |
| What the site builds | A screen at the role's `home` | The login route, the member area, the delivery, and the roster lookup |

Make the choice before you build anything:

- If an owner adds the group's people one at a time and they work in screens under `/admin`, build a role.
- If the site already keeps the group's roster and its people never need the admin, build a channel.

If you choose a channel, skip the role path and continue at [Sign the group in through a channel](#sign-the-group-in-through-a-channel). Otherwise, continue with [Sign the group in with a role](#sign-the-group-in-with-a-role).

## Sign the group in with a role

The running example is a `staff` role declared `{ capability: 'none', home: '/admin/staff' }`, the declaration the [`defineRoles`](../reference/core.md#defineroles) reference uses. The role's people sign in by the magic link and reach only the screens the site builds for them. The engine's content screens and its roster screen refuse the role.

The role's first step is its declaration.

### Declare the role

A role is one entry in the site's role vocabulary, declared once on the adapter's `roles` member. `composeRuntime` folds the adapter into the runtime that the hooks pass, and `createAuthGuard` reads the vocabulary from `runtime.roles`. `devBackendHandle` takes the same `runtime` but reads only `runtime.access`, so the vocabulary changes nothing under the dev backend. The adapter module is `src/theme/cairn.config.ts` on a scaffolded site and `src/lib/cairn.config.ts` on the tutorial's site.

To declare the role, follow these steps:

1. In the adapter module, set the adapter's `roles` member to a `defineRoles` vocabulary that keeps `owner` and `editor` beside the `staff` entry.

   <!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
   ```ts
   // src/theme/cairn.config.ts (src/lib/cairn.config.ts on the tutorial's site)
   import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

   export const cairn = defineAdapter({
     // content, backend, email, rendering, and the other members stay as the site declares them
     roles: defineRoles({
       owner: 'owner',
       editor: 'editor',
       staff: { capability: 'none', home: '/admin/staff' },
     }),
   });
   ```

2. In `src/hooks.server.ts`, confirm that `createAuthGuard` and `devBackendHandle` each receive `{ runtime }`, as the scaffold's and the tutorial's hooks do.

   If an older site's hooks still pass `roles`, follow [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change) instead.

The vocabulary keeps `owner` and `editor` for two reasons. `defineRoles` throws when the vocabulary has no `owner` key or maps `owner` to anything but owner capability. A roster row whose role the vocabulary omits resolves to `none`, and dropping `editor` would close the content screens to every existing editor.

`defineRoles` also throws on a `home` outside `/admin`. After sign-in, the `/admin` index redirects a role that declares a `home` to that path before it looks for a reachable concept. A `none`-capability role with no `home` gets the welcome view at `/admin` instead. The `defineRoles` entry lists every validation rule.

The `home` path needs a screen before anyone lands there.

### Build the role's home screen

The home path is a custom admin screen the site builds. Its load function checks the session's role itself, so the role needs no access map. A `none`-capability session populates `locals.cairnEditor` like an editor's, and the screen reads `role` from it.

To build the screen, follow these steps:

1. In the site's admin routes, create the route for `/admin/staff`, as [Add a custom admin screen](add-a-custom-admin-screen.md#place-the-route) describes.
2. In `src/routes/admin/staff/+page.server.ts`, make the load function call `requireSession` and answer 403 to any session whose `role` is not `staff`.

   ```ts
   // src/routes/admin/staff/+page.server.ts
   import { error } from '@sveltejs/kit';
   import { requireSession } from '@glw907/cairn-cms/sveltekit';
   import type { PageServerLoad } from './$types';

   export const load: PageServerLoad = async (event) => {
     const editor = requireSession(event);
     if (editor.role !== 'staff') error(403, 'This screen is for staff.');
     return { name: editor.displayName };
   };
   ```

`requireSession` redirects a visitor with no session to the login page and does not consult the access map. The role check therefore works whether or not the site declares an access map. `requireAccess` reads the map through `canReach`, which admits a `none` session to a route only when the deepest matching access-map key lists its role. A site that keeps an access map may instead gate with `requireAccess` and add an access-map key that lists `staff`, as [Restrict admin access](restrict-admin-access.md) describes.

SvelteKit runs a form action before its page's load function, so the load's role check never gates the action. An action on the screen therefore checks the session's role in its handler too. [Add a custom admin screen](add-a-custom-admin-screen.md#choose-the-action-wrapper) compares the access checks of the two action wrappers.

With the screen in place, the sidebar can link to it.

### Show the home screen in the sidebar

A `navLayout` entry with a `roles` list shows the home screen's link only to the roles it names. The list takes declared role names, and a name the vocabulary does not declare fails validation. `navLayout` sits on the adapter's `editor` group.

To add the link, follow this step:

- In the adapter module, add a `navLayout` entry for `/admin/staff` to the adapter's `editor` group, with `roles` set to the `staff` role.

  <!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
  ```ts
  // src/theme/cairn.config.ts (src/lib/cairn.config.ts on the tutorial's site)
  import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

  export const cairn = defineAdapter({
    // content, backend, email, rendering, and the other members stay as the site declares them
    roles: defineRoles({
      owner: 'owner',
      editor: 'editor',
      staff: { capability: 'none', home: '/admin/staff' },
    }),
    editor: {
      // the editor group's other members, and any other navLayout nodes, stay as declared
      navLayout: [
        { label: 'Staff', icon: 'clipboard-list', href: '/admin/staff', roles: ['staff'] },
      ],
    },
  });
  ```

When no access-map key matches its `href`, an entry shows to every session that can see the sidebar. The `roles` list narrows it to the role. The `roles` list controls only whether the link shows, and the screen's role check refuses every other role. [Arrange the admin sidebar](arrange-the-admin-sidebar.md) covers the rest of the layout.

With the screen and its link in place, the role is ready to deploy.

### Deploy the role

The role reaches the deployed site once `AUTH_DB` carries `0001_roles.sql` and `cairn doctor` passes the role-wiring check. That migration lets the roster hold a role beyond owner and editor. The scaffold ships the file, and the setup command applies it when it runs a new site's first deploy. A site without the file, such as a hand-built site or one scaffolded before the file shipped, copies it from the package.

To deploy the role, follow these steps:

1. If the site's `migrations` directory doesn't hold `0001_roles.sql`, copy the file there from the package's `migrations` directory.

   ```sh
   cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
   ```

2. If your site added columns to the `editor` table, in your copy of `0001_roles.sql`, add each column to `editor_new` and to the `INSERT ... SELECT` that copies the rows.

   The migration rebuilds `editor` by create, copy, drop, and rename. It keeps every row but only the four columns `email`, `display_name`, `role`, and `created_at`.

3. In the project directory, apply the migrations to the remote auth database with `wrangler d1 migrations apply` and the `--remote` flag.

   ```sh
   npx wrangler d1 migrations apply AUTH_DB --remote
   ```

4. In the project directory, regenerate the site facts with `npx cairn-manifest`.

   ```sh
   npx cairn-manifest
   ```

   The `auth.role-wiring` check reads the declared roles from `src/content/.cairn/site-facts.json`, which `cairn-manifest` writes. While the committed file no longer matches the adapter, a build fails and names `npx cairn-manifest` as the fix.

5. In the project directory, run `cairn doctor`.
6. In the output, confirm that `cairn doctor` reports no `auth.role-wiring-missing` warning.

   The warning means that `createAuthGuard` doesn't receive `{ runtime }`, and [Resolve a failed setup](#resolve-a-failed-setup) gives the fix. The [`cairn doctor` reference](../reference/cli-cairn-doctor.md#the-checks) lists every check.

7. In the project directory, build and deploy the site as [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) describes.

Once the deploy finishes, an owner can add the role's people.

### Add the role's people

An owner adds each of the role's people on `/admin/editors`, the screen that adds editors. Its add action validates the posted role against the declared vocabulary, so the deployed screen now accepts `staff`.

To add a person, follow these steps as an owner on the deployed site:

1. On `/admin/editors`, enter the person's name and email.
2. In the form's role field, choose `staff`.
3. Select **Add editor**.
4. Tell the person to sign in at `/admin`, because adding them sends no email.

The last checks run on the deployed site.

### Verify the role signs in to its home screen

A working role signs its people in by the magic link and lands them on the home screen. The screen's link shows in their sidebar, and the engine's content screens stay closed to them. Under the dev backend, every `/admin` request runs as a minted owner, so the vocabulary changes no authorization decision there. These checks therefore run on the deployed site.

Run the following checks in order:

1. On `/admin/editors`, make sure an email address you can receive mail at is on the roster with the `staff` role.
2. On the deployed site, open `/admin` as that person.
3. Sign in with the emailed link.
4. Confirm that `/admin` lands on `/admin/staff`.
5. In the sidebar, confirm that the screen's link shows.
6. Open one of the engine's content screens.
7. Confirm that the content screen refuses the person.

A failed check has its fix in [Resolve a failed setup](#resolve-a-failed-setup).

## Sign the group in through a channel

`createAuthChannel` builds the request, confirm, and logout actions for a separate login over a numeric code. It ships no route or UI, so the site builds the login route and the member area.

The running example is the example site's members channel. It binds its database as `MEMBER_DB`, names its session cookie `member_session`, and signs members in at `/members/login` before they reach `/members`. The example site delivers codes through a capture transport that refuses unless `CAIRN_DEV_BACKEND` is `'1'`. The steps replace it with a `deliver` function for your transport.

The channel's database comes first.

### Provision the channel database

The channel keeps its codes and sessions in a separate D1 database under a binding of its own, never `AUTH_DB`. Its packaged migration lives in a sibling migrations directory.

To provision the database, follow these steps:

1. In the project directory, create a D1 database for the channel the way [Create the auth database](add-cairn-to-a-sveltekit-app.md#create-the-auth-database) creates the auth database.
2. From the command's output, note the new database's id.
3. In the project directory, copy the packaged channel migration, `node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql`, into a new `migrations-members` directory.

   ```sh
   mkdir migrations-members
   cp node_modules/@glw907/cairn-cms/migrations-channel/0000_channel.sql migrations-members/
   ```

   Every statement in the file is idempotent, so running it again against a provisioned database changes nothing.

4. In `wrangler.jsonc`, add a D1 database entry that binds the database as `MEMBER_DB` with `migrations_dir` set to `migrations-members`.

   ```jsonc
   "d1_databases": [
     {
       "binding": "AUTH_DB",
       "database_name": "<auth-database-name>",
       "database_id": "<auth-database-id>",
       "migrations_dir": "migrations"
     },
     {
       "binding": "MEMBER_DB",
       "database_name": "<member-database-name>",
       "database_id": "<member-database-id>",
       "migrations_dir": "migrations-members"
     }
   ]
   ```

5. In the project directory, apply the migration to the local database with `wrangler d1 migrations apply MEMBER_DB --local`.

   ```sh
   npx wrangler d1 migrations apply MEMBER_DB --local
   ```

The migration sits in a sibling directory because a shared `migrations_dir` would apply each database's schema to the other the first time either is migrated. The remote database takes the migration in [Deploy the channel](#deploy-the-channel). The auth channel reference describes [the packaged migration](../reference/auth-channel.md#the-packaged-migration) in full.

The channel module's `resolveDb` returns this binding.

### Write the channel module

A channel is one `createAuthChannel` call in a [server-only module](https://svelte.dev/docs/kit/server-only-modules). The call takes four functions the site writes, plus the channel's binding and a cookie name.

To write the module, follow these steps:

1. In `src/lib/server/members.ts`, export `findMemberId(contact, { env })`, which resolves to the member's subject, a stable identifier for the member, or `null`.

   The `{ env }` context lets the lookup reach the roster's binding, and the function receives only that context, never the request.

2. In the same file, export `sendCodeEmail(contact, code)`, which sends the code over your transport and returns a promise.

   The factory types `lookup` as `(contact, ctx: { env }) => Promise<string | null>` and `deliver` as `(contact, code, ctx) => Promise<void>`. A function that declares only `(contact, code)` satisfies `deliver`.

3. In `src/lib/server/member-channel.ts`, create the channel with its six required members, typed over the generated Worker `Env`.

   <!-- snippet-check-skip: imports cloudflare:workers and types the channel over Cloudflare.Env, which the site's generated Worker types declare -->
   ```ts
   // src/lib/server/member-channel.ts
   import { env } from 'cloudflare:workers';
   import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
   import { verifyTurnstile } from '@glw907/cairn-cms/cloudflare';
   import { findMemberId, sendCodeEmail } from './members.js';

   /** Trims and lowercases a contact, so one address always maps to one identity. */
   export function normalizeContact(raw: string): string {
     return raw.trim().toLowerCase();
   }

   export const memberChannel = createAuthChannel<Cloudflare.Env>({
     resolveDb: (bindings) => bindings?.MEMBER_DB,
     deliver: sendCodeEmail,
     lookup: findMemberId,
     normalize: normalizeContact,
     challenge: (_event, form) =>
       verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), env.TURNSTILE_SECRET),
     cookie: { name: 'member_session' },
   });
   ```

4. If no `.dev.vars` file sits beside the Wrangler config, create one there.
5. In `.dev.vars`, add the Turnstile secret key as `TURNSTILE_SECRET`.
6. If your site carries `.dev.vars.example`, add `TURNSTILE_SECRET` to it with an empty value.

   A site without that file, such as one the setup command scaffolded, skips this step. `.dev.vars.example` is the template for the local-only `.dev.vars`, and the scaffold's `.gitignore` keeps `.dev.vars` out of git.

7. In the project directory, regenerate the Worker types, so the generated `Env` carries `MEMBER_DB` and the secret's name.

   Use the command that fits the site:

   - If the first lines of `worker-configuration.d.ts` record a command, as a scaffolded site's do, run that command.
   - If they record none, run `npx wrangler types`, which writes the file.

`challenge` receives only the event and the form, so the module reads `TURNSTILE_SECRET` from the `env` that `cloudflare:workers` exports. The generated `Env` type describes that export. `createAuthChannel`'s type parameter describes the `env` that `resolveDb` receives and the `env` in the context of `lookup`, `deliver`, and `verify`. Typing the channel over `Cloudflare.Env`, the generated type, covers every binding those functions read, as the example site's channel does. `wrangler dev` reads secrets from `.dev.vars` and never from a deployed secret. The production copy of the secret waits for [Deploy the channel](#deploy-the-channel).

Each required member is a decision the site makes:

- `resolveDb` returns the `MEMBER_DB` binding, never `AUTH_DB`. Its return type, `ChannelDatabaseLike`, accepts a real `D1Database` with no cast.
- `deliver` sends the code over your transport, in place of the example site's development-only capture transport.
- `lookup` returns the stable subject for a normalized contact, or `null`, and that answer decides membership.
- `normalize` puts a contact in its canonical form before the lookup and the rate budgets use it.
- `challenge` wraps [`verifyTurnstile`](../reference/cloudflare.md#verifyturnstile), which returns `false` on every failure and never throws.
- `cookie.name` is the base name of the session cookie and of its `_pending` nonce cookie. A name that starts with `cairn_` throws.

Three of these functions carry an obligation the factory cannot check:

- `normalize` must be idempotent, canonical per identity, and injective across people, because a lossy one maps two people onto one rate budget.
- `lookup` must return a subject that is stable and canonical per person.
- `challenge` must verify a human, because it is the whole economic bound on guessing a code.

[Config obligations](../reference/auth-channel.md#config-obligations) states each obligation in full. The [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) entry lists the optional members. The channel returns `actions` with request, confirm, and logout, plus `resolveSubject` and `revokeSessions`, and it ships no route or UI.

The login route is the first route to call those actions.

### Build the login route

The example site folds request and confirm onto `/members/login` as two named form actions. Each action passes the event to the channel's matching action and switches on the outcome.

To build the route, follow these steps:

1. In `src/routes/members/login/+page.server.ts`, add a load function that redirects a visitor who already has a session to `/members`.
2. In the same file, add a `request` action that passes the event to `actions.request` and answers `fail(400, ...)` on any outcome but `sent`.
3. In the same file, add a `confirm` action that passes the event to `actions.confirm`, redirects to `/members` on `confirmed`, and answers `fail(400, ...)` otherwise.
4. In the same file, export `prerender = false`, so a site that prerenders by default still serves the route from the Worker.

   ```ts
   // src/routes/members/login/+page.server.ts
   import { fail, redirect } from '@sveltejs/kit';
   import { memberChannel } from '#lib/server/member-channel.js';
   import type { Actions, PageServerLoad } from './$types';

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

5. In `src/routes/members/login/+page.svelte`, add a request form that posts a `contact` field to the `request` action.
6. In the request form, add the Turnstile widget as Cloudflare's [Embed the widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) guide describes.

   The widget posts the token your `challenge` reads.

7. In the same component, add a confirm form that posts a `code` field to the `confirm` action.

   ```svelte
   <!-- src/routes/members/login/+page.svelte -->
   <script lang="ts">
     import type { ActionData } from './$types';

     let { form }: { form: ActionData } = $props();
   </script>

   <h1>Member sign-in</h1>

   <form method="POST" action="?/request">
     <label>Email <input name="contact" type="email" autocomplete="email" required /></label>
     <!-- The Turnstile widget renders here and posts its token with the form. -->
     <button type="submit">Send a code</button>
   </form>
   {#if form?.requestError}<p role="alert">The code could not be sent: {form.requestError}</p>{/if}

   <form method="POST" action="?/confirm">
     <label>Code <input name="code" inputmode="numeric" autocomplete="one-time-code" required /></label>
     <button type="submit">Sign in</button>
   </form>
   {#if form?.confirmError}<p role="alert">The code did not confirm: {form.confirmError}</p>{/if}
   ```

A wrong code answers `bad-code` and mints no session. A false or thrown challenge answers `challenge-required` without minting one. The [auth channel types](../reference/auth-channel.md#types) list every outcome.

A confirmed code redirects to `/members`, the page the member area gates.

### Gate the member area

A channel session never populates `locals.cairnEditor`, so the member area lives in the site's routes outside `/admin`. Each of those routes resolves the subject with `resolveSubject` in its load function.

To gate the area, follow these steps:

1. In `src/routes/members/+page.server.ts`, add a load function that calls `resolveSubject` and redirects to `/members/login` when it returns `null`.
2. In the same file, add a `logout` action that calls `actions.logout` and redirects to the login page.
3. In the same file, export `prerender = false`, so the gate runs on every request even on a site that prerenders by default.

   ```ts
   // src/routes/members/+page.server.ts
   import { redirect } from '@sveltejs/kit';
   import { memberChannel } from '#lib/server/member-channel.js';
   import type { Actions, PageServerLoad } from './$types';

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

4. In `src/routes/members/+page.svelte`, render the member's area.
5. In the same component, add a sign-out form that posts to `?/logout`.

   ```svelte
   <!-- src/routes/members/+page.svelte -->
   <script lang="ts">
     import type { PageData } from './$types';

     let { data }: { data: PageData } = $props();
   </script>

   <h1>Members</h1>
   <p>You are signed in as {data.subject}.</p>
   <form method="POST" action="?/logout">
     <button type="submit">Sign out</button>
   </form>
   ```

The subject is the stable string your `lookup` returned. A member page loads the member's records from the site's store by that subject. Logout ends that one session and never touches another session of the same member.

A member the site removes keeps any open session until it expires or the site ends it.

### End a removed member's sessions

A channel session lasts 30 days by default. A site ends a removed member's sessions early with either or both of the following:

- To check the roster on every resolution, give the channel's config a `verify` function that returns `false` for a removed member. A `false` destroys the session row on that resolution, while a throw refuses only that resolution and keeps the row. `verify` takes the same `{ env }` context as `lookup`, never the request.
- To end sessions at removal, in the site's removal code, call the channel's `revokeSessions` with the binding and the subject. It ends every session for that identity at once, which also suits a reported compromise.

The [`createAuthChannel`](../reference/auth-channel.md#createauthchannel) entry documents `verify` and `revokeSessions`.

Before the channel deploys, a test proves it on Node.

### Test the channel on Node

`createChannelDb`, exported from `@glw907/cairn-cms-dev`, applies the channel's migration to an in-memory SQLite database and returns a D1-shaped double. A Vitest run on Node can drive the channel's actions against it with no Worker. The double needs `node:sqlite`, which every Node release at the floor named in [Before you begin](#before-you-begin) provides.

To test the channel, follow these steps:

1. In `vitest.config.ts`, if `test.server.deps.inline` doesn't list `@glw907/cairn-cms`, add it.

   The scaffold's config already lists it. The engine imports `cloudflare:workers`, a scheme that Node's loader rejects when Vitest leaves the engine external. Inlined, the engine goes through Vitest's transform, and a test's `vi.mock('cloudflare:workers')` reaches the engine's import.

2. In `src/lib/server/member-channel.test.ts`, write a test that drives the channel's request action against the double.

   ```ts
   // src/lib/server/member-channel.test.ts
   /// <reference types="node" />
   import { readFileSync } from 'node:fs';
   import { describe, expect, it, vi } from 'vitest';
   import { createAuthChannel } from '@glw907/cairn-cms/auth-channel';
   import type { ChannelDatabaseLike } from '@glw907/cairn-cms/auth-channel';
   import { createChannelDb } from '@glw907/cairn-cms-dev';
   import { normalizeContact } from './member-channel.js';

   interface TestEnv {
     MEMBER_DB?: ChannelDatabaseLike;
   }

   // cloudflare:workers exists only in a Worker, so the test supplies its env and waitUntil.
   const worker = vi.hoisted(() => {
     const pending: Promise<unknown>[] = [];
     return {
       env: {} as TestEnv,
       pending,
       waitUntil: (promise: Promise<unknown>) => {
         pending.push(promise);
       },
     };
   });

   vi.mock('cloudflare:workers', () => ({ env: worker.env, waitUntil: worker.waitUntil }));

   describe('the member channel', () => {
     it('sends one 8-digit code to a contact on the roster', async () => {
       worker.env.MEMBER_DB = await createChannelDb(
         readFileSync('migrations-members/0000_channel.sql', 'utf-8'),
       );
       const codes: string[] = [];
       const channel = createAuthChannel<TestEnv>({
         resolveDb: (env) => env?.MEMBER_DB,
         deliver: async (_contact, code) => {
           codes.push(code);
         },
         lookup: async () => 'member-1',
         normalize: normalizeContact,
         challenge: async () => true,
         cookie: { name: 'member_session' },
       });

       const url = new URL('http://localhost/members/login');
       const result = await channel.actions.request({
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
       });
       await Promise.all(worker.pending);

       expect(result).toEqual({ outcome: 'sent' });
       expect(codes).toHaveLength(1);
       expect(codes[0]).toMatch(/^\d{8}$/);
     });
   });
   ```

3. In the project directory, run the test.

   ```sh
   npx vitest run
   ```

The engine reads every Worker binding and `waitUntil` through `cloudflare:workers`, and the test's mock of that module supplies both. The double satisfies `ChannelDatabaseLike` and goes on the mocked env with no cast. Every action refuses a mismatched `Origin` and refuses plain http outside a local host. The test's event therefore carries a local URL and a matching `Origin` header. Its last assertion checks the default code length of 8 digits.

The double runs only on Node. Under `wrangler dev`, the channel reads the local D1 database that [Provision the channel database](#provision-the-channel-database) migrated.

With the test passing, the channel is ready to deploy.

### Deploy the channel

Before the code that reads them goes live, the deployed site needs the channel's migration on the remote database and the Turnstile secret.

To deploy the channel, follow these steps:

1. In the project directory, apply the channel migration to the remote database with `wrangler d1 migrations apply MEMBER_DB --remote`.

   ```sh
   npx wrangler d1 migrations apply MEMBER_DB --remote
   ```

2. In the project directory, store the Turnstile secret key as a Worker secret named `TURNSTILE_SECRET` with `wrangler secret put`.

   ```sh
   npx wrangler secret put TURNSTILE_SECRET
   ```

   The command creates a new Worker version and deploys it at once, as Cloudflare's [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) page describes. The secret is therefore live before the site's deploy ships the code that reads it.

3. In the project directory, build and deploy the site as [Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) describes.

The last checks run against the deployed channel.

### Verify a member signs in to the member area

A working channel signs a member in on the deployed site with a code from your transport and lands them on `/members`. The member can then sign out again.

Run the following checks in order:

1. In the roster store that `lookup` reads, make sure a contact you can receive a code at is on the roster.
2. On the deployed site's `/members/login`, request a code for that contact.
3. On `/members/login`, enter the code your transport delivered.
4. Confirm that the page redirects to `/members`.
5. On `/members`, sign out.
6. Confirm that the page redirects to `/members/login`.
7. Open `/members`.
8. Confirm that it redirects to `/members/login`.

A failed check has its fix in [Resolve a failed setup](#resolve-a-failed-setup).

## Resolve a failed setup

The following failures cover the role path first, then the channel.

- `cairn doctor` reports `auth.role-wiring-missing`. The adapter declares custom roles, but `createAuthGuard` in `src/hooks.server.ts` was not passed `{ runtime }`.

  If so, pass `{ runtime }` to `createAuthGuard` as [Declare the role](#declare-the-role) does. Then rerun the check and deploy as [Deploy the role](#deploy-the-role) does.

- Adding a person with the new role fails on `/admin/editors`. `AUTH_DB` lacks `0001_roles.sql`, so the `editor` table keeps its original owner-or-editor check, and the write fails as `auth.store-roles-unmigrated`. The condition's message names `0001_roles.sql`, and no tool check raises it.

  If adding the person fails, copy and apply `0001_roles.sql` as [Deploy the role](#deploy-the-role) does. Then add the person again.

- The person lands on the welcome view instead of the home screen. The deployed vocabulary gives the role no `home`, or it omits the role, which then resolves to `none`.

  If the person lands on the welcome view, check that the vocabulary declares the role with its `home`. Then redeploy as [Deploy the role](#deploy-the-role) does.

- The home screen answers 403 to the role's people. Its load function gates with `requireAccess`, and no access-map key lists the role.

  If the home screen answers 403, replace `requireAccess` in its load function with the role check from [Build the role's home screen](#build-the-roles-home-screen). Then redeploy as [Deploy the role](#deploy-the-role) does.

- On a site that keeps an access map, the home screen's link does not show in the role's sidebar. `/admin` still lands on the home screen. The deepest access-map key matching `/admin/staff` does not list `staff`, so the map decides the entry and refuses the role.

  If the link does not show, add `staff` to the access-map key that matches `/admin/staff`, as [Restrict admin access](restrict-admin-access.md) describes. Then redeploy as [Deploy the role](#deploy-the-role) does. This failure cannot occur on a site with no access map.

- The test fails inside `createChannelDb` because `node:sqlite` cannot load on the running Node release. Nothing enforces the dev package's declared `engines.node` floor at runtime, and npm only warned at install.

  If `node:sqlite` cannot load, switch to Node 24 or later and run the test again.

- The channel module throws a construction error when it first loads, in the test run or on the deployed site's first request. Construction throws when a required function is missing, and when the cookie name is missing, empty, or starts with `cairn_`.

  If the module throws when it loads, read the construction error and supply the member it names as [Write the channel module](#write-the-channel-module) does. Then run the test again.

- Every code request answers `challenge-required`, and Workers Logs shows `turnstile.verify_failed` with `reason: 'missing_secret'`. The Turnstile secret is blank where the running Worker reads it.

  If the reason is `missing_secret`, set `TURNSTILE_SECRET` where the running Worker reads it. Under `wrangler dev` that is `.dev.vars`, and on the deployed site it is the Worker secret. `verifyTurnstile` checks the secret before the token, so a call with both blank logs `missing_secret`.

- Every code request answers `challenge-required`, and Workers Logs shows `turnstile.verify_failed` with `reason: 'invalid_input'`. The request form posts no Turnstile token under the field your `challenge` reads.

  If the reason is `invalid_input`, check that the request form posts the widget's token under the field your `challenge` reads.

- The request answers that a code was sent, but no code arrives. Either `lookup` returned `null` or threw, or the site's `deliver` function threw while it sent the code. A `null` means the contact is not on the roster, or its normalized form does not match the roster's.

  If no code arrives, read the channel's records in Workers Logs, which [Log events](../reference/log-events.md) describes. An `auth.channel.requested` record with an `outcome` of `'unknown'` means the normalized contact is not on the roster `lookup` reads, and `'lookup_failed'` means `lookup` threw. An `auth.channel.send_failed` record means `deliver` threw. In that case, read its `error` field and fix the transport your `deliver` calls.

- Entering the code returns the login page with an error, and no redirect to `/members` follows. The confirm action answered something other than `confirmed`, so the login route answered `fail(400, ...)`. A mistyped code answers `bad-code`, and a code past its 10-minute lifetime or its 5 attempts no longer confirms.

  If entering the code returns an error, request a new code and enter it exactly as delivered, within 10 minutes and within 5 attempts.

Otherwise, read the auth channel's records in [Log events](../reference/log-events.md), and work through [Debug your site](debug-your-site.md).

## See also

The following pages cover the seams and limits around a second sign-in group:

- [The auth channel's threat surface](security-model.md#the-auth-channels-threat-surface) in the security model sets out the channel's threat catalogue and the site's obligations.
- [Restrict admin access](restrict-admin-access.md) describes access maps and roles that write content.
- [Replace magic links with Cloudflare Access](replace-magic-links-with-cloudflare-access.md) describes how to sign editors in through an identity provider.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) describes how to lay out the admin's navigation.
- The [auth channel reference](../reference/auth-channel.md) documents every member and default of `createAuthChannel`.
- The [roles reference](../reference/core.md#roles) documents `defineRoles` and the role vocabulary.
