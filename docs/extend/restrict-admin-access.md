# Restrict admin access

Everyone who signs in to a cairn admin has a role.
The site declares its own role names, or uses the default pair, `owner` and `editor`.
Each role resolves to one capability, `owner`, `editor`, or `none`, and capability is the floor that cairn enforces.
The access map is the site's declaration of which roles reach each engine screen and each route under `/admin`, and it only narrows that floor.
Whatever the map says, a role with `none` capability stays out and an owner reaches every target the map names, so the map decides only which editor-capability roles reach each target.

An organization's site needs that narrowing when, for example, volunteers write posts while one webmaster manages the media library and the signups list.
Inside the site's SvelteKit app the map has two readers, since the engine checks its own screens and the site's own routes under `/admin` check themselves.
The engine reads the map from the adapter, and the site's routes read it from the hook handle in `src/hooks.server.ts`.
In a build that handle is the guard, `createAuthGuard`; under `npm run dev` it is `devBackendHandle`.
The steps that follow declare a role vocabulary and an access map and give the map to both readers.
They then enforce the map on your own screens' reads and writes and verify each role's reach.
A single example runs through every step, a webmaster role that, with owners, alone reaches the media library and the scaffold's signups screen.

A developer arrives here to gate a custom admin screen's route, to close an engine screen such as the media library to most editors, or to make the map admit named roles alone, which [Make the map exhaustive](#make-the-map-exhaustive) covers.
The steps assume working knowledge of SvelteKit server hooks, `load` functions, form actions, and route ids with their groups and parameters, of the site's adapter in `src/theme/cairn.config.ts`, and of a Workers Logs query.
Why the map only narrows, and never acts as an allowlist by itself, is covered in [Security model](security-model.md).
Building a screen and its section actions in full belongs to [Add a custom admin screen](add-a-custom-admin-screen.md), and hiding a sidebar entry without denying its route belongs to [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
[Add a second sign-in group](add-a-second-sign-in-group.md) covers a role that signs in but reaches no engine content, such as one for a staff area.

## Before you begin

The steps need a scaffolded site with a custom admin screen, and the checks need a deployed site you can redeploy:

- A site that `create-cairn-site` scaffolded, whose `src/access.ts` holds the access map that its hooks file hands the guard.
  For a hand-built site, [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) brings it to the same shape.
- A custom admin screen whose `load` calls `requireAccess` and whose form actions are `createSectionAction` wrappers, such as the scaffold's signups screen in `src/routes/admin/signups/`.
  [Add a custom admin screen](add-a-custom-admin-screen.md) builds another.
- A deployed site, an email address for a test editor besides the owner's, and a second browser to sign in as that editor.
  The setup command deploys a scaffolded site, and [Move the site to production](add-cairn-to-a-sveltekit-app.md#move-the-site-to-production) deploys a hand-built one.
  Local development cannot show a role refusal, because the dev backend signs every `/admin` session in as an owner.
- A way to redeploy the site, through Workers Builds or through Wrangler.
  A repository connected to Workers Builds deploys every push to its default branch, and `npx create-cairn-site --dir <site-directory> --connect` makes that connection.
  Without that connection, Wrangler redeploys the site once `npx wrangler login` signs it in to Cloudflare, as [Describe the Worker and deploy it](add-cairn-to-a-sveltekit-app.md#describe-the-worker-and-deploy-it) shows.

## Declare the roles

The access map admits roles by name, so the site first declares its role vocabulary, mapping each role name to the capability it stands on.
Each declaration is either a bare capability, `'owner'`, `'editor'`, or `'none'`, or an object with a `capability` member.
A role with `none` capability signs in through the same flow as every editor, while the engine's content and roster screens refuse it.
The object form's `home` member and the `none` capability serve a second audience, which [Add a second sign-in group](add-a-second-sign-in-group.md) covers.

The vocabulary must declare `owner` with owner capability, or `defineRoles` throws.
That name is the one reserved name, since the last-owner guard and the bootstrap owner both anchor on it.
The [`defineRoles`](../reference/core.md#defineroles) entry lists its other validation.
A role name absent from the vocabulary resolves to `none`, so a renamed or dropped role still signs in and reaches no engine content.
The example therefore declares `editor` beside the webmaster role, so the site's existing editors keep their reach.
A site that declares no vocabulary gets the implicit `owner` and `editor` pair.

To declare the roles, follow this step:

- In `src/access.ts`, export as `roles` a `defineRoles` vocabulary that maps `owner` to `'owner'` and both `editor` and the webmaster role to `'editor'`.

The example under [Declare the access map](#declare-the-access-map) shows the whole file.

## Declare the access map

The access map keys each target, an engine screen id or an `/admin` route path, to the role names it admits.
A screen key is a declared concept id or one of the four fixed screens, `media`, `vocabulary`, `nav`, and `settings`.
A route key is an `/admin`-prefixed path, and each value lists the role names admitted to that target.
An owner reaches every mapped target whatever its list says.
The roster screen is not a key, since it stays owner-only.
Composition, the engine building its runtime from the adapter at server start, throws on a screen key outside the declared concepts and fixed screens.

To declare the map, follow this step:

- In `src/access.ts`, pass `roles` and the map to `defineAccess` and export the result as `access`.

The example's `src/access.ts` holds both declarations:

```ts
// src/access.ts
import { defineAccess, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  editor: 'editor',
  webmaster: 'editor',
});

export const access = defineAccess(roles, {
  media: ['webmaster'],
  '/admin/signups': ['webmaster'],
});
```

The example replaces the scaffold's owner-only `/admin/signups` rule, so the webmaster role reaches the signups screen.

Restricting `media` also restricts the inline image picker in every image-bearing concept's editor, since the picker calls the same access-gated endpoint.
An `editor` session can therefore no longer insert an image into a post.
A screen key also gates the screen's write actions, so the media library's upload, delete, and replace refuse that session too.
A few engine actions sit outside the map, as [Limits of access map coverage](security-model.md#limits-of-access-map-coverage) describes.

`defineAccess` checks the map when it is constructed, against the vocabulary it is given.
Given `undefined`, it accepts only `owner` and `editor`, so a map naming the webmaster role needs `roles`.
It throws on an empty map, an empty role list, a role outside the vocabulary, and a malformed key.
An owner-only rule is therefore written `['owner']`.
Composition also throws on a route key that collides with a built-in admin view.
The [`defineAccess`](../reference/core.md#defineaccess) entry gives the key-shape rules in full.
The engine's screens and your own routes treat a target the map leaves out in opposite ways, as [Decide what the map leaves open](#decide-what-the-map-leaves-open) describes.

## Pass the map to the adapter and the guard

The adapter's `access` gates the engine's screens and the sidebar, and the guard's gates your own routes, so the same map goes to both.

The adapter in `src/theme/cairn.config.ts` takes `roles` and `access` as optional members.
The engine's screens, their write actions, and the sidebar read the adapter's `access`, and while it is unset they stay open to every editor-capability session.
The scaffold passes its map to the two hook handles and not to the adapter, so a scaffolded site's engine screens stay open until the adapter carries the map too.

The guard, `createAuthGuard` in `src/hooks.server.ts`, gates every `/admin` path except the sign-in page and its auth endpoints.
It runs on every guarded request and attaches the map to `locals.cairnAccess`, which is why `requireAccess` takes no map argument.
With no `roles`, the guard resolves every session against the implicit `owner` and `editor` pair.
A webmaster editor then signs in and is refused everywhere, because the guard's pair does not hold that role.

To pass the map to both readers, follow these steps:

1. In `src/theme/cairn.config.ts`, add `roles` and `access`, imported from `src/access.ts`, to the `defineAdapter` call.
2. In `src/hooks.server.ts`, import `roles` beside the existing `access` import.
3. In the same file, pass `{ roles, access }` to `createAuthGuard`.

After these steps, the adapter call and the guard line read as follows:

<!-- snippet-check-skip: excerpt; the adapter's content, backend, email, rendering, and editor members stay as they are -->
```ts
// src/theme/cairn.config.ts (excerpt)
import { roles, access } from '../access.js';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering, editor...
  roles,
  access,
});
```

<!-- snippet-check-skip: excerpt; the production branch of the scaffold's hooks file, whose handle is declared above it -->
```ts
// src/hooks.server.ts (excerpt)
import { access, roles } from './access.js';

handle = createAuthGuard({ roles, access });
```

The [`createAuthGuard`](../reference/sveltekit.md#createauthguard) entry documents the guard's other options.

## Enforce the map on your routes

Your own routes check the map themselves, with `requireAccess` in each `load` and a `createSectionAction` wrapper around each form action.
The example needs no edit here, since the scaffold's signups screen already calls `requireAccess` in its `load` and wraps its actions in `createSectionAction`.
Its destructive `remove` action also sets `ownerOnly: true`.
The steps that follow apply to a route of your own.

`requireAccess` checks `event.route.id`, never the request URL, since a parameterized route's URL is chosen by whoever sends the request.
It returns the session, and it redirects to sign-in when there is none.
When no key matches or the role is not admitted, it refuses with a 403 and logs `auth.access.refused` with the editor's email, role, and target.

SvelteKit runs a matched form action without running `load` first, so a gated `load` never gates the actions beside it.
A section action runs the CSRF check and the same fail-closed access check before its handler.
Its target defaults to the route id with route groups dropped.
[Add a custom admin screen](add-a-custom-admin-screen.md) and the [`createSectionAction`](../reference/sveltekit.md#createsectionaction) entry cover its other options.

`ownerOnly` requires owner capability on top of the map's rule, never in place of it.
In the example, a webmaster session adds a signup, and only an owner removes one.

To enforce the map on a route of your own, follow these steps:

1. In `src/access.ts`, add a key for the route, listing the roles that reach it.

   A route that calls `requireAccess` with no key refuses every session, owner included.
   [Decide what the map leaves open](#decide-what-the-map-leaves-open) compares this with an engine screen and names the call for a route open to every editor.

2. In the route's `+page.server.ts`, call `requireAccess(event)` at the top of `load`, before it reads anything.
3. In the same file, wrap each form action in the section's `createSectionAction` wrapper.
4. For an action that only an owner may run, set `ownerOnly: true` in its wrapper's options.

## Decide what the map leaves open

An unnamed engine screen stays open to every editor-capability role, while an unnamed route that calls `requireAccess` refuses every session, owner included.

A route that opted into the map and finds no key is treated as a misconfiguration, so the refusal reaches owners too.
A route meant for every editor-capability role calls `requireEditor` instead, which does not consult the map.

An unnamed engine screen keeps the zero-config default, and composition logs a `config.access_unmapped` warning naming each concept and fixed screen without a rule.
In the example, the warning names every concept and fixed screen except `media`, the expected result of a map that only narrows.
Why the map never acts as an allowlist by itself is the subject of [Allowlist semantics from an exhaustive map](security-model.md#allowlist-semantics-from-an-exhaustive-map).

### Make the map exhaustive

To admit only named roles to every engine screen, map every concept and fixed screen until `config.access_unmapped` no longer fires.

To make the map exhaustive, follow this step:

- In `src/access.ts`, add a key for each target the warning names, listing the roles that reach it.

Even an exhaustive map leaves the site-wide publish and the tidy and dictionary actions outside it.
The first check under [Verify each role's reach](#verify-each-roles-reach) reads the warning.

## Key nested and parameterized routes

A route key governs its own path and every path beneath it, matched by the deepest whole-segment prefix the map holds.
A key `/admin/money` governs `/admin/money/refunds` unless the map also holds that deeper key, and `/admin/moneyx` never matches `/admin/money`.

A route's default target is its route id with route groups dropped, so the route id `/admin/(app)/roster` reads as `/admin/roster`.
A parameter keeps its bracket form in the target, as the [`createSectionAction`](../reference/sveltekit.md#createsectionaction) entry details.
A route with a dynamic or rest parameter under a deeper map key refuses every session until it names its governing key.
A route serving more than one section names its key the same way.

If a route has such a parameter or serves more than one section, follow these steps:

1. In the route's `+page.server.ts`, pass the governing key as the second argument to `requireAccess`.
2. In the same file, set `target` to the same key in each section action's options.

## Sidebar entries

The sidebar reads the adapter's map through the same check the routes use.

One function, `canReach`, decides route enforcement and the visibility of every keyed entry.
The roster's entry stays owner-only.
An engine screen's entry follows `canReach` directly.
A `navLayout` site entry, such as the one for the scaffold's signups screen, is gated only when its href matches a key.
A gated entry shows to the roles that key admits and to owners.

An href that no key matches stays visible to every editor-capability role, while `requireAccess` and `createSectionAction` refuse the route behind it.
A new screen's entry therefore shows before its route has a key, and every session that follows it meets a refusal.

## Deploy the changes

The roster and the per-role checks run on the deployed site, so the new roles and the map must reach it first.
The site's auth database still limits the roster to owner and editor, so the migration that lifts that limit runs before the deploy.

To apply the migration, follow these steps:

1. In the project directory, copy `0001_roles.sql` from the package's `migrations` directory into the site's `migrations` directory.

   ```bash
   cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
   ```

2. In the project directory, apply the migration to the remote database with `wrangler d1 migrations apply` and the `--remote` flag.

   ```bash
   npx wrangler d1 migrations apply <auth-database-name> --remote
   ```

To deploy the changes, take the path that matches the site:

- If the repository is connected to Workers Builds, push the changes to its default branch, which deploys them.
- Otherwise, in the site's directory, build the site and deploy it with Wrangler.

  ```sh
  npm run build
  npx wrangler deploy
  ```

Both paths run the same two commands, since the setup command's Workers Builds trigger runs only `npm run build` and `npx wrangler deploy`.
[Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) walks through the Wrangler path.
Once the deploy finishes, the roster's role select lists every role the declared vocabulary holds, the webmaster role among them.

## Assign the roles

A declared role reaches no one until an owner assigns it on the roster.

To give the test editor the new role, follow these steps:

1. In `/admin/editors` on the deployed site, as the owner, add the test editor through the **Add editor** form, choosing `webmaster (editor)` as its **Role**.
2. In a second browser, sign in as the test editor.

For an editor already on the roster, an owner chooses the role in the select on that editor's row, then selects **Change**.
The session reads the editor's row on every request, so a change needs no new sign-in.
A demotion therefore takes effect at once, and one test editor can cycle through the roles.

## Verify each role's reach

On the deployed site, the composition warning names the targets the map leaves open, and each role meets a refusal wherever the map excludes it.

To verify the map, run these checks in order:

1. In Workers Logs, query `config.access_unmapped` across the cold start that followed the deploy.

   The event fires once per isolate at composition, so a query scoped to a live request window can miss it.
   It names every concept and fixed screen except `media`.

2. In `/admin/editors`, choose `editor` in the test editor's role select, then select **Change**.
3. In the test editor's browser, check the sidebar.

   Neither the media library nor the signups screen appears.

4. In the same browser, open **Posts**.

   The list opens, since the map names no `posts` key and an unnamed engine screen stays open to editor capability.

5. In the same browser, open `/admin/signups`.

   The route shows a 403 error page and logs `auth.access.refused` with the role and the target.

6. In the same browser, open `/admin/media`.

   The media library shows a 403 error page and logs `auth.access.refused` with the role and the target `media`.

7. In `/admin/editors`, choose `webmaster (editor)` in the test editor's role select, then select **Change**.
8. In the test editor's browser, reload the admin.

   The media library and the signups screen appear in the sidebar and both open, with no new sign-in.

9. On the signups screen, enter a name and an email, then select **Add**.

   The screen saves the signup and lists it, since the map admits the webmaster role and only `remove` carries the owner gate.

10. On the signups screen, select **Delete** on the signup you added, then **Delete** in the confirmation dialog.

    The dialog stays open, and the screen reports that you do not have access to this action.
    The site logs `auth.access.refused`, since `remove` is owner-only.

## Resolve a refusal

A refusal, or an open screen the map should close, traces to a missing key or `target`.
It can also trace to a reader never given `roles` or `access`, or to an auth database without the roles migration.

To find the cause, run these checks in order:

1. If a route refuses every session, owner included, compare the target in its `auth.access.refused` record with the map's keys.

   A route with no key needs one, as [Enforce the map on your routes](#enforce-the-map-on-your-routes) describes.
   A parameterized route under a deeper key needs `target`, as [Key nested and parameterized routes](#key-nested-and-parameterized-routes) describes.

2. If a webmaster editor is refused on every screen and the logs show `auth.role.unknown` for that role, check whether the guard was given `roles`.

   Running `cairn doctor` reports the same gap as the `auth.role-wiring-missing` condition, which the [`cairn doctor` reference](../reference/cli-cairn-doctor.md) lists.
   [Pass the map to the adapter and the guard](#pass-the-map-to-the-adapter-and-the-guard) holds the fix.

3. If an engine screen admits a role the map excludes, check whether the adapter was given `access`.

   The same section holds the fix.

4. If adding the test editor with the webmaster role fails on `/admin/editors`, check whether `0001_roles.sql` was applied to the remote database.

   Until it runs, the roster holds only owner and editor.
   [Deploy the changes](#deploy-the-changes) holds the fix.

[Debug your site](debug-your-site.md) covers reading the logs and the admin's other events.

## See also

The following pages cover the reasoning and the tasks around the access map:

- [Security model](security-model.md) explains why the map only narrows and where its coverage stops.
- [Add a custom admin screen](add-a-custom-admin-screen.md) builds a screen and its section actions in full.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) describes how to arrange and hide sidebar entries.
- [Add a second sign-in group](add-a-second-sign-in-group.md) declares a role with `none` capability for a second audience.
- The [Access map](../reference/core.md#access-map) reference documents `defineAccess` and `canReach`.
- The [`requireAccess`](../reference/sveltekit.md#requireaccess) entry documents the route check.
- The [log events](../reference/log-events.md) reference lists the `auth.access.refused` and `config.access_unmapped` records.
