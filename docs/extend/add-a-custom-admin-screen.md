# Add a custom admin screen

**Contract:** mount your own route under `/admin`, gated and audited the way cairn's own screens
are, and composed from the same primitives so it looks like it belongs.

**Precondition:** an adapter, from [Define an adapter and schema](./define-an-adapter-and-schema.md),
and the single-mount admin already wired: a `src/routes/admin/+layout.{server.ts,svelte}` pair
and a `src/routes/admin/[...path]/` catch-all, as [the canonical admin
mount](../reference/admin-routes.md) describes.

A custom route wins over the catch-all automatically; SvelteKit resolves the more specific route
first.

## Drop the route

Nothing engine-specific happens at the filesystem level. Add a normal SvelteKit route inside
`src/routes/admin/`:

```
src/routes/admin/club/events/
  +page.server.ts
  +page.svelte
```

It renders inside the shared shell (`CairnAdminShell`) automatically, since the shell wraps
everything under `/admin`. `createAuthGuard` already gates the whole subtree before any load
runs, so an unauthenticated request never reaches your route; what the guard does not do is
decide whether *this* signed-in editor may see *this* screen. That's yours to declare.

## Gate it

The recommended path is [`createSectionAction`](../reference/sveltekit.md#createsectionaction),
built once per section and reused by every action inside it:

```ts
// src/lib/club/section.ts
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import type { D1Database } from '@cloudflare/workers-types';
import type { Env } from '../env.js';

export const clubAction = createSectionAction<Env, D1Database>({
  resolveDb: (env) => env?.CLUB_DB,
});
```

`Env` here is a type you declare yourself, not one cairn ships: it's your site's
`App.Platform['env']`, so `CLUB_DB` names whatever `d1_databases` binding your own
`wrangler.jsonc` gives this section. [`createSectionAction`](../reference/sveltekit.md#createsectionaction)
shows the worked shape (a standalone `SectionEnv` interface, annotated explicitly so the resolver
typechecks either way) if you haven't declared one yet.

```ts
// src/routes/admin/club/events/+page.server.ts
import { requireAccess } from '@glw907/cairn-cms/sveltekit';
import { clubAction } from '$lib/club/section.js';

export const load = (event) => {
  const editor = requireAccess(event); // denies every role the access map doesn't name here
  return { displayName: editor.displayName };
};

export const actions = {
  approve: clubAction(
    async ({ form, ctx }) => {
      const id = String(form.get('id'));
      await ctx.db.prepare('UPDATE signups SET approved = 1 WHERE id = ?').bind(id).run();
      ctx.audit({ entityId: id });
      return { ok: true };
    },
    { action: 'approve', entity: 'signup' },
  ),
};
```

`requireAccess` in the `load` and `createSectionAction` in every action share the same
fail-closed predicate: a session the [access map](./restrict-admin-access.md) doesn't admit
gets refused at both the read and the write, never one without the other. Declare a rule for
this route's path in the access map or every session, owner included, gets a 403; see
[Restrict admin access by role](./restrict-admin-access.md) for the map itself.

`createSectionAction` also runs the audit and authentication work `adminAction` does
underneath it (editor identity, CSRF, one form read), so a section built on it never calls
`adminAction` directly. A one-off action outside a whole gated section reaches for
`adminAction` alone instead; see [Refusal channels and `adminAction`](../reference/sveltekit.md#adminaction)
for the bare form.

## Compose the screen

Reach for [`@glw907/cairn-cms/admin-toolkit`](../reference/admin-toolkit.md) before hand-rolling a
list, a table, or a form field. It's general-purpose scaffolding, not a bespoke page: `PageHeader`
for the title band, `OfficeList` or `AdminTable` for the triage table, `ListToolbar` for search and
filters, `Pagination`, `StatusChip` for a status pill, `EmptyState` for the zero-rows case, and
`TextInput`/`SelectInput`/`FieldLabel`/`FieldRow` for form controls. Every one of these primitives
ships pre-compiled inside cairn's own admin stylesheet, so it renders correctly with no Tailwind
setup of your own; your route's own markup outside these components compiles through your site's
usual build and can use anything your stack supports.

```svelte
<script lang="ts">
  import { OfficeList, AdminTable, StatusChip } from '@glw907/cairn-cms/admin-toolkit';

  let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
</script>

<OfficeList eyebrow="Club" title="Events" subtitle={`${data.events.length} upcoming`}>
  <AdminTable rowCount={data.events.length}>
    {#snippet header()}
      <th scope="col">Name</th>
      <th scope="col">Status</th>
    {/snippet}
    {#snippet children()}
      {#each data.events as event (event.id)}
        <tr>
          <td>{event.name}</td>
          <td><StatusChip tone="info" label={event.status} /></td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</OfficeList>
```

A component that renders one of cairn's own content concepts, a `ConceptList` row or an `EditPage`
field, has no place here even though it shares a visual language; the toolkit's own charter is
general-purpose primitives only. Building your own screen from these instead of copying markup by
eye is the whole payoff: a future admin-toolkit release still renders correctly under your route
with no work on your part, and your screen reads as one surface with the rest of `/admin` instead
of a visually adjacent guess at it.

## Wire the AuditSink

`ctx.audit()` in the example above needs somewhere to land. Bind a D1 database and wire
[`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) once, in `hooks.server.ts`:

<!-- snippet-check-skip: reads App.Platform (env, ctx.waitUntil), which only the site's own app.d.ts declares -->
```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard, createD1AuditSink } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit';

const wireAuditSink: Handle = ({ event, resolve }) => {
  const db = event.platform?.env.AUDIT_DB;
  const ctx = event.platform?.ctx;
  const waitUntil = ctx ? ctx.waitUntil.bind(ctx) : undefined;
  if (db) event.locals.cairnAuditSink = createD1AuditSink(db, waitUntil);
  return resolve(event);
};

export const handle = sequence(createAuthGuard(), wireAuditSink);
```

`hooks.server.ts` holds exactly one `handle` export, so this composes with whatever your site
already runs there rather than replacing it: `createAuthGuard()` alone if you followed [Build a
site by hand](./build-a-site-by-hand.md)'s production branch, `createAuthGuard({ roles, access })`
if you followed [Restrict admin access by role](./restrict-admin-access.md), or the dev-backend
branch if you're still on that milestone. `sequence` runs each `Handle` in order; put
`createAuthGuard` first, since `wireAuditSink` only needs `resolve`, not anything the guard sets.

The sink is fail-open: it returns before the insert settles, so a persist failure never fails
the action it's auditing, and a rejected write logs rather than disappearing. `createSectionAction`
audits every refusal too, not only a successful action, so pair a bound audit database with the
`rateLimit` option once your section takes real traffic; an unrated, freely refusable action fills
an audit table cheaply.

## You know it worked when

The route renders inside the shell chrome (sidebar, top bar, theme) with no wrapper code of your
own, an editor outside the access map's named roles gets a 403 on both the page and any action
posted to it, and a successful mutating action leaves a row in your audit table. If your root
layout renders visible chrome around `/admin` (a header, a footer, a width cap), the admin shell
can't fill the viewport; see [the root layout rule](../reference/admin-routes.md#the-root-layout-must-be-chrome-free)
for the fix.

To also place this screen in the sidebar, see [Organize your admin nav](./organize-your-admin-nav.md).
