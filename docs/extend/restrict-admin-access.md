# Restrict admin access

Everyone who signs in to a cairn admin has a role.
The site declares its role names, or uses the default pair, `owner` and `editor`.
Each role resolves to one of three capabilities, `owner`, `editor`, or `none`, and cairn always enforces capability.
The access map restricts it further.
Its keys are engine screens and `/admin` routes, and each key lists the roles that reach that target.
An owner reaches every mapped target whatever the map lists.

You declare the map once, as the adapter's `access` member.
The engine's screens, their write actions, and the sidebar read it through the composed runtime.
The guard attaches the same map to every admin request, but it decides no per-route authorization.
A route the site writes therefore checks the map itself, in its `load` and in each form action, because SvelteKit runs a form action without running its page's `load` first.
To restrict admin access, you declare a role vocabulary and an access map on the adapter, enforce the map on your route's reads and writes, deploy the change with the roles migration, assign the new role, and verify each role's reach.

The steps follow one example throughout.
In it, a `webmaster` role is the only role besides owner that reaches the media library and the example site's signups screen at `/admin/signups`.
A reader may arrive to gate a custom admin screen's route or to close an engine screen, such as the media library, to most editors.
The steps serve both in order.
A reader who wants the map to admit only the roles it names, on every engine screen, also needs [Make the map exhaustive](#make-the-map-exhaustive).

The page assumes you know SvelteKit server hooks, `load` functions, form actions, and route ids with their groups and parameters, along with your site's adapter module and a Workers Logs query.
It explains none of these.
The following subjects belong to other pages:

- Why the map only narrows and never acts as an allowlist by itself: [Security model](security-model.md).
- Building a custom screen and its section actions in full: [Add a custom admin screen](add-a-custom-admin-screen.md).
- Hiding a sidebar entry without denying its route: [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- A role that signs in but reaches no engine content, such as a `none` role for a second sign-in group: [Add a second sign-in group](add-a-second-sign-in-group.md).
- Moving an older site's map off its hooks and onto the adapter: [Upgrade cairn](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change).

## Before you begin

Before you start, have the following in place:

- A site scaffolded by `create-cairn-site` or built by hand as in [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md), with or without an `access` member.
  On a scaffolded site the adapter module is `src/theme/cairn.config.ts`, and on a hand-built site it is the module that calls `defineAdapter`.
  A fresh scaffold's adapter declares no `access` member.
- A site route under `/admin` whose `load` and form actions do not yet check the access map, such as one whose `load` calls `requireEditor`.
- A deployed site and a way to redeploy it, as in [Move the site to production](add-cairn-to-a-sveltekit-app.md#move-the-site-to-production).
  The checks need a deployed site because the dev backend mints an owner editor on every `/admin` request.
  It never reads `runtime.roles`, so no role refusal shows in local development.
- An email address for a test editor besides the owner's, and a second browser to sign in as that editor.
- If your site copies `0001_roles.sql` in and added columns to the auth database's `editor` table, an edited copy of the file.
  The file rebuilds `editor` with only the engine's four columns.
  In your copy, add each of your columns to `editor_new` and to both column lists of its `INSERT` before you apply it.

The map admits roles by name, so the vocabulary comes first.

## Declare the roles

The role vocabulary maps each role name to the capability it resolves to.
The vocabulary is the adapter's optional `roles` member, which sits beside its optional `access` member.
Each role's declaration is either a bare capability or an object whose `capability` member names one.
A role with `none` capability still signs in, but the engine's content and roster screens refuse it.
The map widens access in one case only: a route rule that names a `none` role admits that role.
For a sign-in group that reaches only such routes, see [Add a second sign-in group](add-a-second-sign-in-group.md).

`owner` is the one reserved role name: `defineRoles` throws when the vocabulary lacks an `owner` key mapped to owner capability.
The [`defineRoles`](../reference/core.md#defineroles) entry lists its other checks.
A role name absent from the vocabulary resolves to `none`, and renaming or dropping a role the roster still holds shuts its editors out of the engine's content screens.
That is why the example keeps `editor` beside `webmaster`.
An adapter that declares no `roles` resolves every session against the default `owner` and `editor` pair.

To declare the roles, follow these steps:

1. In the adapter module, export a `roles` vocabulary built with `defineRoles` that maps `owner` to `'owner'` and both `editor` and `webmaster` to `'editor'`.

   If the server start then throws from `defineRoles`, the vocabulary fails a check its entry lists, such as a missing `owner` key.

2. In the same file, add `roles` to the `defineAdapter` call.

The map names these roles.

## Declare the access map

The access map keys each target, an engine screen id or an `/admin` route path, to the role names it admits.
A screen id is a declared concept or one of the fixed screens `media`, `vocabulary`, `nav`, and `settings`, and a route path starts with `/admin`.
Each value lists role names from the vocabulary.

The map goes on the adapter as its `access` member, and nowhere else.
`composeRuntime` carries it onto the runtime.
Both handles take that runtime.
[`createAuthGuard`](../reference/sveltekit.md#createauthguard) reads `roles` and `access` from it.
`devBackendHandle` reads only its `access`, which it attaches to each `/admin` request it mints an owner editor for.
The scaffold's `src/hooks.server.ts` already passes the runtime to both handles and needs no edit.

The example site's adapter starts with `defineAccess(undefined, { ... })` and two owner-only route rules, one of them for `/admin/signups`.

To declare the map, follow these steps:

1. If the adapter already declares `access`, in its `defineAccess` call, pass `roles` as the first argument in place of `undefined`.

   The example site's call takes this step.

2. If the adapter has no `access` member, in the `defineAdapter` call, add `access` set to a `defineAccess` call that passes `roles` first.
3. In the `access` map, add a `media` key that admits `webmaster`, and a key for your route's path that lists the roles that reach it.

   In the example, the `/admin/signups` key admits `webmaster` in place of its owner-only rule.
   Keep every other key.
   A route whose key you drop still calls `requireAccess`, and with no rule for its path it refuses every session, owner included.

The following excerpt of the example site's adapter module shows both declarations, with the adapter's other members and the map's other keys elided:

<!-- snippet-check-skip: an excerpt that elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts (excerpt)
import { defineAccess, defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({ owner: 'owner', editor: 'editor', webmaster: 'editor' });

export const cairn = defineAdapter({
  // content, backend, email, rendering, and the other members stay as they are
  roles,
  access: defineAccess(roles, {
    media: ['webmaster'],
    '/admin/signups': ['webmaster'],
    // the site's other keys, unchanged
  }),
});
```

A `media` key also reaches the image picker inside each image-bearing concept's editor.
The picker's upload is refused for a role the key leaves out.
Picking an image the library already holds makes no request, though, so that role can still insert an existing library image.
The media library's write actions gate against `media` as well.
For what the map covers on the other engine screens, see [Limits of access map coverage](security-model.md#limits-of-access-map-coverage).

Three calls check the map.
`defineAccess` checks it at construction and throws a `defineAccess:` error on an empty map, an empty role list, a role name outside the vocabulary, or a malformed key.
`composeRuntime` checks the map's role names against the adapter's vocabulary and throws an `access:` error on a role the vocabulary does not declare.
When the admin routes are built at server start, `createContentRoutesContext` throws an `access:` error on a screen id that is neither a declared concept nor a fixed screen, and on a route key that collides with a built-in admin view.
A map given `undefined` for its vocabulary validates against the default pair, so a map that names `webmaster` needs `roles` as its first argument.
Each error message but the empty-map one names the key at fault, and the role where a role is at fault.
If the server start throws a `defineAccess:` or `access:` error, correct the map against these checks and restart.
The [`defineAccess`](../reference/core.md#defineaccess) entry carries the full list of checks.

For what happens to a target the map leaves out, see [Decide what the map leaves open](#decide-what-the-map-leaves-open).
Your routes enforce the map through two calls.

## Enforce the map on your routes

Your routes check the map themselves, with `requireAccess` in each `load` and a `createSectionAction` wrapper around each form action.
The guard admits a signed-in session to the `/admin` subtree before any `load` runs, and the route itself decides which roles reach it.
The example site's signups screen shows the finished form of these steps.
Its `load` calls `requireAccess`, and its `create` and `remove` actions are `createSectionAction` wrappers, with `ownerOnly: true` on `remove` alone.

`requireAccess` checks the route id, `event.route.id`, by default, never the request URL.
A parameterized route's URL is whatever the requester sends, but its route id is fixed.
`requireAccess` returns the session the guard resolved and redirects to login when there is none.
When the map has no rule for the target, or the rule does not admit the session's role, it refuses with a 403 and logs `auth.access.refused`.
The `load` call never gates the route's form actions.
SvelteKit runs a matched action without running the page's `load` first, so an action that skips the check is reachable behind a guarded page.

`createSectionAction` runs the CSRF check and the access check before its handler.
Its default target is the route id with route groups dropped, the same target `requireAccess` reads.
For its other options, see [`createSectionAction`](../reference/sveltekit.md#createsectionaction).
Setting `ownerOnly: true` requires owner capability in addition to the map's rule for the target, never in place of it.

To enforce the map on a route, follow these steps:

1. In the route's `+page.server.ts`, call `requireAccess(event)` at the top of `load`, before it reads anything, in place of any `requireEditor` call.
2. In the same file, wrap each form action in a `createSectionAction` wrapper.

   For setting up the wrapper, see [Choose the action wrapper](add-a-custom-admin-screen.md#choose-the-action-wrapper).

3. For an action only an owner may run, set `ownerOnly: true` in its wrapper's options.

The two enforcement points treat a target the map never names in opposite ways.

## Decide what the map leaves open

An unnamed engine screen stays open to every editor-capability role, while an unnamed route that calls `requireAccess` refuses every session, owner included.
A route that every editor-capability role should reach can call `requireEditor` instead.
That call never consults the map.

When the map declares at least one screen-id key, building the admin routes logs a `config.access_unmapped` warning.
Its `unmapped` list names each declared concept and fixed screen that carries no screen-id key.
A route key never counts toward that list, and a map of route keys alone logs nothing.
For why the map alone never acts as an allowlist, see [Allowlist semantics from an exhaustive map](security-model.md#allowlist-semantics-from-an-exhaustive-map).

A site that wants named roles alone on every engine screen closes the gap the warning names.

### Make the map exhaustive

A map is exhaustive when it keys every concept and fixed screen, and `config.access_unmapped` then stops firing.
To make the map exhaustive, take this step:

- In the adapter module's `access` map, add a key for each target the warning's `unmapped` list names, listing the roles that reach it.

The running example leaves the warning in place and skips this step.
With every target keyed, the tidy and personal-dictionary actions gate against the entry's concept like any entry action, and the site-wide publish filters each entry by its concept.
For what the map still leaves uncovered, see [Limits of access map coverage](security-model.md#limits-of-access-map-coverage).

A route key reaches beyond the route it names.

## Key nested and parameterized routes

A route key governs its path and every path beneath it, matched by the deepest whole-segment prefix the map holds.
The key `/admin/money` also governs `/admin/money/refunds` unless the map holds a deeper key, and it never matches `/admin/moneyx`.
`requireAccess` reads the route id with its route groups dropped, but it keeps a parameterized id verbatim.
Suppose the map holds `/admin/money` and the deeper `/admin/money/refunds`.
A route under `/admin/money` whose next segment is a dynamic or rest parameter, such as `[id]`, then resolves to no rule and refuses every session until it declares `target`.
Separately, a section action's `target` is required on any route that carries a rest parameter or serves more than one section, and a declared `target` is used verbatim.

To declare the target on such a route, follow these steps:

1. If the route has one of these parameters or serves several sections, in its `+page.server.ts`, pass the governing key to `requireAccess` as its second argument.
2. If you passed a key to `requireAccess`, in the same file, set `target` to that key in each section action's options.

The sidebar applies the same matching to its entries.

## Sidebar entries

The sidebar reads the adapter's map through the same check the routes use, so a keyed entry shows to the roles its key admits and to an owner.
An engine screen's entry follows the map directly.
A site entry in the adapter's `navLayout` is gated only when a key matches its href.
The scaffold's `navLayout` holds only engine entries.
The example site adds a Signups site entry for `/admin/signups`, and the example's `/admin/signups` key gates it.
An entry whose href no key matches stays visible to every editor-capability session, while a route behind it that calls `requireAccess` refuses every session.

The deployed site still runs without these edits.

## Deploy the changes

The roster and the per-role checks run on the deployed site.
A vocabulary beyond the default pair needs `0001_roles.sql` in the auth database.
You apply it by hand with Wrangler before you redeploy.
A scaffolded site's `migrations/` already holds the file, and the setup command applies it when it runs the site's first deploy.
A hand-built site never receives the file and copies it from the package, as does a site scaffolded before the file shipped.
Applying the file rebuilds the `editor` table, as [Before you begin](#before-you-begin) notes.

To apply the roles migration, follow these steps:

1. If the site's `migrations/` directory lacks `0001_roles.sql`, in the project directory, copy the file from the package's `migrations/` directory.

   ```bash
   cp node_modules/@glw907/cairn-cms/migrations/0001_roles.sql migrations/
   ```

2. In the project directory, apply pending migrations to the auth database with `wrangler d1 migrations apply` and the `--remote` flag.

   ```bash
   npx wrangler d1 migrations apply <auth-database-name> --remote
   ```

The redeploy takes one of two paths, matching how the site deploys: a push to a repository connected to Workers Builds, or a build and deploy with Wrangler.
Both paths run the same two commands, a build and a deploy.
Neither path applies a migration.
That is why the apply step comes first.
The setup command offers to connect Workers Builds in its chapter 3, during the same setup run.
A connected repository deploys on every push to its default branch.
On a site from its live step onward, `npx create-cairn-site --dir <site-directory> --connect` re-enters that chapter.

To redeploy the site, follow these steps:

1. If the repository is connected to Workers Builds, in the project directory, push the changes to its default branch.

   The push deploys them, and a site deployed this way skips the next two steps.

2. Otherwise, in the project directory, build the site with `npm run build`.
3. In the same directory, deploy the build with `npx wrangler deploy`.

[Deploy a change](add-cairn-to-a-sveltekit-app.md#deploy-a-change) covers both paths in full.
The deployed roster now offers the new role.

## Assign the roles

A declared role reaches no one until an owner assigns it on the roster.
Only an owner can add or remove editors and change their roles.
The **Add editor** form below the roster table carries a **Role** select.
A role whose name differs from its capability is listed as its name followed by the capability in parentheses, so `webmaster` reads `webmaster (editor)`.

To assign the role, follow these steps:

1. In `/admin/editors` on the deployed site, as the owner, add the test editor through the **Add editor** form, choosing **webmaster (editor)** as its **Role**.

   If the add fails and the site logs `admin.action.failed` with the `conditionId` `auth.store-roles-unmigrated`, the auth database still lacks `0001_roles.sql`.
   Apply the migration as [Deploy the changes](#deploy-the-changes) does, then add the editor again.

2. In a second browser, sign in as the test editor.

For an editor already on the roster, the row's role select picks the new role, and its separate **Change** button saves it.
A role change applies on the editor's next request, with no new sign-in, so the checks that follow move one test editor between roles.

## Verify each role's reach

On the deployed site, the `config.access_unmapped` warning names the targets the map leaves open.
A role the map excludes gets the admin's error page.
The checks name the example site's signups screen at `/admin/signups`.
On your site, the route you gated stands in for `/admin/signups`, and its actions stand in for the signups add and delete.
A route with no owner-only action skips the delete check.

To verify the map, run these checks in order:

1. In Workers Logs, query `config.access_unmapped` across the cold start that followed the deploy.

   The record's `unmapped` list names every concept and fixed screen except `media`.
   The warning fires once per isolate at server start, so a query scoped to a live request window can miss it.
   If the query returns no record, widen its window to cover the cold start after the deploy.

2. In `/admin/editors`, in the test editor's row, choose **editor** in the role select.
3. In the same row, select **Change**.
4. In the test editor's browser, check the sidebar.

   The media library entry is gone, and so is a Signups entry where the site's `navLayout` carries one, as the example site's does.

5. In the same browser, open **Posts**.

   The list opens, because the map names no `posts` key and an unnamed engine screen stays open to editor capability.

6. In the same browser, open `/admin/signups`.

   The admin's error page shows the heading `You don't have access to this page.`
   The site logs `auth.access.refused` with the role and the target.

7. In the same browser, open `/admin/media`.

   The same error page shows, and the site logs `auth.access.refused` with the target `media`.

8. In `/admin/editors`, in the test editor's row, choose **webmaster (editor)** in the role select.
9. In the same row, select **Change**.
10. In the test editor's browser, reload the admin.

    The media library entry is back in the sidebar, and so is the Signups entry where the site's `navLayout` carries one.
    The media library and `/admin/signups` both open, with no new sign-in.

11. On the signups screen, enter a name and an email, then select **Add**.

    The status line reads `Signup added.`, and the table lists the new row.
    If the site refuses the add and logs `auth.access.refused`, the add action carries `ownerOnly: true`, or it checks a different target than the load, because one of them declares a `target` the other does not.
    Set the same `target` in each section action, as [Key nested and parameterized routes](#key-nested-and-parameterized-routes) does.

12. On the signups screen, select **Delete** on the signup you added.
13. In the confirmation dialog, select **Delete**.

    The dialog stays open, the status line reads `You do not have access to this action.`, and the site logs `auth.access.refused`.
    The remove is refused because `remove` carries `ownerOnly: true`, while the map admits `webmaster` to the screen.
    `createSectionAction` refuses with `fail(403)`, and the screen closes the dialog only on success.

For a result that differs from these checks, see [Resolve a refusal](#resolve-a-refusal).

## Resolve a refusal

Each check pairs a symptom from the verification with the log record or the code that explains it.

To find the cause, run these checks in order:

1. If a route refuses every session, owner included, and the `auth.access.refused` record's `reason` reads `no_rule`, the map has no key for the route's target.

   Add the key as [Declare the access map](#declare-the-access-map) does.

2. If a parameterized route refuses every session and the record's `reason` reads `shadowed`, a deeper map key hides the route's rule.

   Declare the route's `target` as [Key nested and parameterized routes](#key-nested-and-parameterized-routes) does.

3. If the `webmaster` session is refused on your route or the media library, and the record names `webmaster`, the target's key does not list it.

   On a route, the record's `reason` reads `role`.
   The example site's starting `/admin/signups` key is one such owner-only key.
   Add `webmaster` to the key.

4. If a `webmaster` editor sees only the welcome view at `/admin` and is refused on every other admin screen, check the logs for `auth.role.unknown`.

   That event means the role is absent from the adapter's vocabulary, so it resolves to `none` and no map rule can name it.
   Add the role to `defineRoles` as [Declare the roles](#declare-the-roles) does.

5. If adding a `webmaster` editor fails on `/admin/editors`, apply `0001_roles.sql` to the remote auth database, as [Deploy the changes](#deploy-the-changes) does.
6. If the signups screen opens for an `editor` session and the route's `load` calls `requireEditor`, replace that call with `requireAccess`.

   [Enforce the map on your routes](#enforce-the-map-on-your-routes) covers the call.

7. If the signups screen or the media library still opens for an `editor` session, the deployed Worker predates your edits.

   Redeploy as [Deploy the changes](#deploy-the-changes) does.

8. If the delete succeeds for the `webmaster` session, the remove action lacks `ownerOnly: true`, or another action carries it instead.

   Set it on the remove wrapper as [Enforce the map on your routes](#enforce-the-map-on-your-routes) does.

For symptoms outside this list, see [Debug your site](debug-your-site.md).

## See also

The following pages cover the reasoning and the tasks around the access map:

- [Security model](security-model.md)
- [Add a custom admin screen](add-a-custom-admin-screen.md)
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md)
- [Add a second sign-in group](add-a-second-sign-in-group.md)
- [Upgrade cairn: the one-declaration change](upgrade-cairn.md#when-your-range-crosses-the-one-declaration-change)
- [The access map reference](../reference/core.md#access-map)
- [The `requireAccess` reference](../reference/sveltekit.md#requireaccess)
- [Log events](../reference/log-events.md)
