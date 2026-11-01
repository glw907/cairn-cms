# Admin mounting, access, and refusals

Contents:

- [Mount the admin](#mount-the-admin)
- [Gate a custom screen](#gate-a-custom-screen)
- [Restrict access by role](#restrict-access-by-role)
- [Refusal channels](#refusal-channels)
- [Audit database](#audit-database)

For the screen's markup and register, load `cairn-building-admin-screens`.

## Mount the admin

The single mount is one catch-all and one layout. `createCairnAdmin({ runtime, auth, tidy, preview })`
returns `load`, `actions`, and `shellLoad`.

```ts
// src/routes/admin/[...path]/+page.server.ts
import { admin } from '#lib/cairn.server.js';

export const prerender = false;
export const load = admin.load;
export const actions = admin.actions;
```

```svelte
<!-- src/routes/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { CairnAdmin } from '@glw907/cairn-cms/admin';
  import type { AdminData } from '@glw907/cairn-cms/sveltekit';
  import { cairn } from '#lib/cairn.config.js';
  import type { ActionData } from './$types';

  let { data, form }: { data: AdminData; form: ActionData } = $props();
</script>

<CairnAdmin {data} {form} render={cairn.rendering.render} registry={cairn.rendering.components} />
```

`src/routes/admin/+layout.server.ts` exports `admin.shellLoad` as `load`, and its `+layout.svelte`
renders `CairnAdminShell` (`@glw907/cairn-cms/admin`) over `data.shell`. The root layout above
`/admin` must carry no chrome (header, footer, width cap).

Hand-mounted routes use the four per-route factories `createCairnAdmin` wraps:
`createAuthRoutes`, `createContentRoutes`, `createEditorRoutes`, `createNavRoutes`. Register each
handler under the action name the view posts (`?/save`, `?/editorAdd`, ...); a `default` action
receives no named post.

```ts
// src/routes/admin/editors/+page.server.ts
import { createEditorRoutes } from '@glw907/cairn-cms/sveltekit';
import { runtime } from '#lib/cairn.server.js';

const editors = createEditorRoutes({ runtime });

export const load = editors.editorsLoad;
export const actions = {
  editorAdd: editors.editorAddAction,
  editorRemove: editors.editorRemoveAction,
  editorSetRole: editors.editorSetRoleAction,
};
```

## Gate a custom screen

The guard admits any signed-in session to `/admin/**` and decides no per-route authorization.
SvelteKit runs a matched form action without the page's `load`, so a gated page is not a gated POST.
Wire both:

- `requireAccess(event)` at the top of the `load`, before any read.
- Every form action wrapped by one `createSectionAction<Env, Db>({ resolveDb })` per section. It
  runs session, CSRF, the optional rate limit, the same access check, and the database binding
  check, then the handler with `ctx.db` and `ctx.audit`. Annotate `Env` (it does not infer from
  `resolveDb`). Call `ctx.audit({ entityId })` on success.

A section path needs an access-map key, or both refuse every session, owner included. Both default
the target to the route id with groups dropped (`/admin/(app)/roster` is `/admin/roster`). A route
with a rest parameter, or one serving several sections, passes the key explicitly:
`requireAccess(event, '/admin/money')` and `target: '/admin/money'` in every wrapper's options.
`ownerOnly: true` adds owner capability on top of the map rule.

A remote function under `/admin` bypasses both the wrappers and the guard's CSRF check; the site
owns that verification.

## Restrict access by role

1. Declare `roles = defineRoles({ owner: 'owner', editor: 'editor', webmaster: 'editor' })` and put
   it on the adapter. `owner` is required. A role absent from the vocabulary resolves to `none`
   (logs `auth.role.unknown`), so keep every role the roster holds.
2. Put the map on the adapter only: `access: defineAccess(roles, { media: ['webmaster'], '/admin/signups': ['webmaster'] })`.
   Pass `roles` as the first argument: `undefined` validates against the default pair and rejects
   `webmaster`. Keys are a concept id, a fixed screen (`media`, `vocabulary`, `nav`, `settings`), or
   an `/admin` path.
3. Keep every route key a gated route uses. An unnamed engine screen stays open to editor capability;
   an unnamed route behind `requireAccess` refuses everyone. A route all editors may reach can call
   `requireEditor`, which ignores the map.
4. A route key governs its subtree by deepest whole-segment prefix (`/admin/money` covers
   `/admin/money/refunds`, never `/admin/moneyx`). A dynamic segment under a deeper key resolves to
   no rule (`reason: shadowed`); declare `target`.
5. Sidebar entries follow the same check. A `navLayout` site entry is gated only when a key matches
   its href.
6. Apply `0001_roles.sql` to `AUTH_DB` `--remote` before redeploying, then assign the role on
   `/admin/editors`. A role change applies on the editor's next request.

`defineAccess` throws `defineAccess:` on an empty map, an empty list, an unknown role, or a bad key;
`composeRuntime` and the admin build throw `access:` on a role or screen id they cannot resolve.
`config.access_unmapped` lists unkeyed screens once per cold start; key every one to make the map
exhaustive. The dev backend mints an owner on every request, so verify roles on the deployed site.

`auth.access.refused` `reason`: `no_rule` (add the key), `shadowed` (declare `target`), `role` (add
the role to the key, or `ownerOnly` refused a non-owner).

## Refusal channels

Pick the shape by whether the refusal can answer the request that raised it:

- **Throw** `error(403)` or `redirect(303, '/admin/login')`: `requireOwner`, `requireEditor`, and
  `requireAccess` authorize and throw; `requireSession` and `createAdminAction` authenticate only
  and throw for a missing session or failed CSRF. SvelteKit renders these with no `handleError`
  mapping.
- **`fail()`** for every refusal the route can answer in place, typed `ActionFailure<T>` to the
  screen's shape, never a bare `ActionFailure<unknown>`. A custom action uses `createSectionAction`
  or a hand-rolled `fail(...)`, not a throw. `createSectionAction`'s 403 and 500 are `fail()` so the
  editor's unsaved input survives; reads close through `requireAccess` in the `load`, so reads and
  writes share one fail-closed predicate.
- **The guard** returns a branded `Response` before routing (missing bindings, CSRF, identity).
- A small closed set (expired sign-in link, publish-all outcome) redirects with an engine-resolved
  `?error=` code; site code never writes or reads one.

A site `handleError` replaces SvelteKit's default logging, so log the error first in it.

An action with more than two outcomes returns a discriminated `outcome`, never a boolean.

## Audit database

`createD1AuditSink(db, waitUntil)` persists `ctx.audit` records (and direct domain-event calls) to
`audit_log`. Put it on its own database with its own `migrations_dir`; an entry that leaves
`migrations_dir` unset shares `./migrations` with `AUTH_DB` and cross-applies the auth migrations.

```jsonc
{ "binding": "AUDIT_DB", "database_name": "your-site-audit", "database_id": "<id>", "migrations_dir": "migrations/audit" }
```

```sh
mkdir -p migrations/audit
cp node_modules/@glw907/cairn-cms/migrations/0002_audit.sql migrations/audit/
npx wrangler d1 migrations apply your-site-audit --local
npx wrangler d1 migrations apply your-site-audit --remote
```

Only the file's order within `migrations/audit/` matters, not the `0002` name. The sink attaches in
a hook as `event.locals.cairnAuditSink`, guarded by `if (!building && env.AUDIT_DB)`. The table is
append-only; prune old rows with a `strftime('%Y-%m-%dT%H:%M:%fZ', ...)` comparison, never
`datetime('now', ...)`. A screen that must show the row it just wrote needs D1 bookmark routing:
the insert may still be in flight behind `waitUntil`, and a replica may lag.
