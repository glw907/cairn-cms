# Add a custom admin screen

A custom admin screen is an ordinary SvelteKit route dropped under `/admin/`. There's no plugin
API to register against and no components folder cairn scans for you: the route is a plain
`+page.server.ts` and `+page.svelte`, and because it names a concrete path, SvelteKit's own router
picks it over the engine's `[...path]` catch-all whenever both could match the same URL. The
example below is the showcase's own `/admin/signups` screen, a small list of newsletter signups
that lives entirely in the developer's own D1 table and that cairn never reads. It assumes the
canonical single mount from [The canonical admin
mount](../reference/admin-routes.md) is already wired in. Keep `examples/showcase/src/routes/admin/signups` open alongside, since every snippet below is
that route, close to verbatim.

Two commitments frame everything in this guide. An extended cairn should still feel like one
visually coherent system: your screen inherits the admin's design grammar through the shell, the
theme tokens, and the shared component recipes, so it reads as built in from the start rather
than bolted on, and the [design conventions in the components
reference](../reference/components.md) name the treatments to reach for. And your screen inherits
the responsive craft the same way: the shell already composes its chrome at every width, and
building from the documented recipes keeps a custom screen composed at phone and ultrawide widths.

The rest of this guide grows that one screen into a whole custom *section*, the shape a real site
proves once it has more than a screen or two of its own admin surface. The worked pattern below is
drawn from a production build for a membership club: a `/admin/club/**` section (events, classes,
members, assets) gated by a club-specific role, member-scale and outside cairn's own capability
model. The code here describes that pattern; it is not the site's own files, since a site's role
model, database, and screens are always its own. A staff-scale role that only ever needs cairn's
own three capability levels belongs on the [declared role vocabulary](../reference/core.md#roles)
instead; a custom D1-backed role model like this one is for a role cairn was never meant to know
about (a large, dynamic membership, say, not a handful of staff).

## Add the route

Drop a directory next to the engine's own admin routes and give it a `+page.server.ts`:

```ts
// src/routes/admin/signups/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { requireOwner } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';

interface SignupRow {
  id: number;
  name: string;
  email: string;
}

export const load: PageServerLoad = async (event) => {
  requireOwner(event);
  const { results } = await event.platform!.env.APP_DB.prepare(
    'SELECT id, name, email FROM signups ORDER BY id DESC',
  ).all<SignupRow>();
  return { signups: results };
};

export const actions: Actions = {
  create: async (event) => {
    requireOwner(event);
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await event.platform!.env.APP_DB.prepare(
      'INSERT INTO signups (name, email) VALUES (?, ?)',
    ).bind(name, email).run();
    return { created: true };
  },
  remove: async (event) => {
    requireOwner(event);
    const id = Number((await event.request.formData()).get('id'));
    await event.platform!.env.APP_DB.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
    return { removed: true };
  },
};
```

and a matching `+page.svelte`:

```svelte
<!-- src/routes/admin/signups/+page.svelte -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<PageHeader title="Signups" />

<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <label class="sr-only" for="signup-name">Name</label>
  <input id="signup-name" name="name" placeholder="Name" class="input input-bordered" />
  <label class="sr-only" for="signup-email">Email</label>
  <input id="signup-email" name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>

<AdminTable density="sm" rowCount={data.signups.length}>
  {#snippet header()}
    <th scope="col">Name</th>
    <th scope="col">Email</th>
    <th scope="col"><span class="sr-only">Actions</span></th>
  {/snippet}
  {#snippet children()}
    {#each data.signups as s (s.id)}
      <tr>
        <td>{s.name}</td>
        <td>{s.email}</td>
        <td>
          <form method="POST" action="?/remove">
            <CsrfField />
            <input type="hidden" name="id" value={s.id} />
            <button class="btn btn-ghost btn-xs">Delete</button>
          </form>
        </td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>
```

Nothing here mounts a layout of its own. The site's shared `/admin/+layout.svelte` already wraps
the whole `/admin/**` subtree in
[`CairnAdminShell`](../reference/components.md#cairnadminshell), so this page renders inside the
same sidebar, top bar, and theme as every built-in view.
[`PageHeader`](../reference/admin-toolkit.md#pageheader) and
[`AdminTable`](../reference/admin-toolkit.md#admintable), from the packaged
`@glw907/cairn-cms/admin-toolkit` subpath, are the same header and table shell cairn's own admin
screens build with, so a custom screen reaches for them instead of hand-rolling a parallel header
or table chrome. The remaining DaisyUI classes (`input`, `btn`) are the same ones cairn builds the
shell with, so a form needs no stylesheet of its own.
[`OfficeList`](../reference/components.md#officelist) is the alternative header-plus-card shell
for a triage screen that wants both in one wrap, with an optional `eyebrow` naming the section a
screen belongs to; the Club section's own screens below all pass `eyebrow="Club"`.

## Gate it with `requireSession`, `requireEditor`, or `requireOwner`

The engine's auth guard already ran before this route's `load` does, and it set
`event.locals.editor` for the whole `/admin/*` subtree, typed with no work on your part by the one
`import '@glw907/cairn-cms/ambient';` line every site's `src/app.d.ts` carries (see the [ambient
types reference](../reference/ambient.md)). Reading that identity, and refusing the request when it
isn't good enough, is
[`requireSession`](../reference/sveltekit.md#requiresession),
[`requireEditor`](../reference/sveltekit.md#requireeditor), and
[`requireOwner`](../reference/sveltekit.md#requireowner). All three take the same minimal shape,
`{ locals: { editor } }`, so they read straight off your route's own `load` or action event.
`requireSession` returns the signed-in editor, of any [capability](../reference/core.md#roles), or
redirects to `/admin/login`. `requireEditor` does the same, then also answers a `none`-capability
session with a 403. `requireOwner` goes further still, answering anything short of owner with a
403. The signups list is owner-only management, so every preceding load and action calls
`requireOwner`; a screen every editor should be able to use would call `requireSession` or
`requireEditor` instead, depending on whether a `none`-capability role should reach it.

**A `none`-capability session, the third rung of cairn's [declared role
vocabulary](../reference/core.md#roles), still authenticates like any other editor: it carries the
same populated, typed `locals.editor` and passes through this custom-route seam untouched.** Only
cairn's own content and roster surfaces refuse it, by calling `requireEditor` or `requireOwner`
themselves. Nothing here blocks a `none`-capability role from reaching your own screen. You decide
with whichever of the three preceding calls matches the screen, or your own check on
`event.locals.editor.capability`. [Give a role its own admin
area](./give-a-role-its-own-admin-area.md) walks that exact case end to end, and [the
`requireEditor` reference](../reference/sveltekit.md#requireeditor) states the none contract in
full.

The `requireOwner(event)` call is the server-side gate. A sidebar entry can hide a link from an editor (the
next section shows how), but hiding a link isn't access control, and nothing stops an editor from
typing the URL directly. The `requireOwner(event)` call at the top of every load and action is what
actually turns that request away.

## A custom section gated by the access map

`requireOwner` answers one question: is this editor cairn's owner? A section with its own
authorization axis, a club committee seat, a named subset of staff cairn's default owner/editor
pair doesn't distinguish, needs its own declared role and its own access rule. The pattern
below, worked from a production club-admin section, is the shape that scales past one screen to
a whole `/admin/club/**` tree.

### Declare the role and the access rule

Add the section's role to the site's vocabulary with
[`defineRoles`](../reference/core.md#roles), mapped to whichever capability fits (`editor`
here, since a club-admin edits but doesn't manage the roster), then declare an [access
map](../reference/core.md#access-map) rule covering the section's whole path and wire it to
[`createAuthGuard`](../reference/sveltekit.md#createauthguard), the same two-places pattern
[Restrict admin access by role](./restrict-admin-access.md) walks through in full:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the roles member -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  'club-admin': 'editor',
});

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  roles,
});
```

```ts
// src/lib/cairn.access.ts
import { defineAccess } from '@glw907/cairn-cms';
import { roles } from './cairn.config.js';

export const access = defineAccess(roles, {
  '/admin/club': ['club-admin'],
});
```

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from './lib/cairn.config.js';
import { access } from './lib/cairn.access.js';

export const handle = sequence(createAuthGuard({ roles, access }));
```

`/admin/club` matches every path underneath it by prefix (`canReach`'s deepest-prefix rule), so
one rule covers the section's events, classes, members, and assets screens without repeating it
per route.

### Gate the layout `load`

Every screen under the section calls
[`requireAccess`](../reference/sveltekit.md#requireaccess) at the top of its `load`, the same
predicate the section's actions gate on below, so a page and its own form never disagree about
who's admitted:

```ts
// src/routes/admin/club/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load: LayoutServerLoad = (event) => {
  const editor = requireAccess(event); // denies every role the map doesn't name for /admin/club
  return { editor };
};
```

**A layout guard like this one protects loads only. SvelteKit dispatches a matched form action
directly, with no ancestor `load` run first, so this guard never runs before a POST to
`/admin/club/events?/update`.** Every mutating action under the section needs the same check
inline, or a session the layout would refuse can still submit a POST directly to a URL it was
never shown a link to. Writing that check by hand at the top of every action is exactly the
boilerplate [`createSectionAction`](../reference/sveltekit.md#createsectionaction) exists to
close: it composes [`adminAction`](../reference/sveltekit.md#adminaction)'s editor resolution,
CSRF, and audit contract with the same access-map check `requireAccess` runs, plus the section's
own database binding, in one call:

```ts
// src/lib/club/action.ts
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import type { D1Database } from '@cloudflare/workers-types';
import { resolveClubDb, type ClubEnv } from './roles.js';

export const clubAction = createSectionAction<ClubEnv, D1Database>({
  resolveDb: (env: ClubEnv | undefined) => resolveClubDb(env),
});
```

```ts
// src/routes/admin/club/events/[id]/+page.server.ts
import { clubAction } from '$lib/club/action.js';
import type { Actions } from './$types';

export const actions: Actions = {
  approve: clubAction(async ({ form, ctx }) => {
    const id = String(form.get('id'));
    await ctx.db.prepare('update event set approved = 1 where id = ?').bind(id).run();
    ctx.audit({ action: 'approve', entity: 'event', entityId: id });
    return { ok: true };
  }, { action: 'approve', entity: 'event' }),
};
```

Every action under `/admin/club/**` wraps with `clubAction` instead of calling `adminAction`
directly, the same way every load calls `requireAccess`. A refused request never reaches the
handler: a missing binding, an unmapped path, or a role the map doesn't admit each returns an
already-audited `fail()`, so the handler above owes an audit record only for the mutation it
actually performs. A handler that mutates and then returns `fail()` for its own domain reason
must still emit its own audit, because nothing rolls its writes back and the wrapper can't see
them.

## Wire the `auditSink`

`ctx.audit` (available on every `adminAction`-wrapped handler, `clubAction` included) always logs
one structured `admin.action.audited` record through the engine's own logger. That is enough to
read in Workers Logs, but nothing persists it to a queryable table until the site wires
`event.locals.auditSink` itself: cairn ships the seam, not the storage. The
`import '@glw907/cairn-cms/ambient'` line already in your `src/app.d.ts` types the assignment
(see the [ambient types reference](../reference/ambient.md)). Set it in `hooks.server.ts`, scoped
to the section so the rest of `/admin` never resolves a binding it has no use for:

<!-- snippet-check-skip: reads App.Platform (env, context.waitUntil), which only the site's own app.d.ts declares; see "Reach your own data" below -->
```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { createAuthGuard } from '@glw907/cairn-cms/sveltekit';
import { roles } from '$lib/cairn.config.js';
import { access } from '$lib/cairn.access.js';
import { resolveClubDb } from '$lib/club/roles.js';
import { createClubAuditSink } from '$lib/club/audit-sink.js';

const wireClubAuditSink: Handle = ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/admin/club')) {
    const db = resolveClubDb(event.platform?.env);
    const waitUntil = event.platform?.context?.waitUntil?.bind(event.platform.context);
    if (db) event.locals.auditSink = createClubAuditSink(db, waitUntil);
  }
  return resolve(event);
};

export const handle = sequence(wireClubAuditSink, createAuthGuard({ roles, access }));
```

**`AdminActionAuditSink` is synchronous (`(record) => void`); `adminAction` calls it without
awaiting. On Cloudflare Workers, a fire-and-forget write started inside a handler is not
guaranteed to finish before the response returns and the Worker's execution context is torn down,
so an un-awaited insert can silently drop the row.** Thread the write through
[`waitUntil`](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil) so the
platform keeps it alive past the response, the way the sink below does; a persist failure should
never fail the user's action that triggered it, so this only logs loudly on error rather than
throwing:

```ts
// src/lib/club/audit-sink.ts
import type { D1Database } from '@cloudflare/workers-types';
import type { AdminActionAuditRecord, AdminActionAuditSink } from '@glw907/cairn-cms/sveltekit';

export function createClubAuditSink(
  db: D1Database,
  waitUntil?: (promise: Promise<unknown>) => void,
): AdminActionAuditSink {
  return (record: AdminActionAuditRecord) => {
    const write = db
      .prepare('INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(record.editor, record.action, record.entity, record.entityId ?? null, record.detail ?? null)
      .run()
      .catch((err: unknown) => console.error('admin/club: audit_log insert failed', err));
    waitUntil?.(write);
  };
}
```

Outside a real Cloudflare runtime (a bare unit test, say), `waitUntil` is undefined, and the sink
still runs, just without that extension; a test asserting on the sink's own call does not need one.

## Link it from the sidebar with `adminNav`

A sidebar entry is validated data on your adapter's `editor` group. It does not register the
route; the file already did that. This section covers `adminNav`, which adds an entry beside
cairn's own built-in group; a site that wants to arrange the whole sidebar, cairn's own screens
included, declares `navLayout` instead, covered in [Organize your admin
nav](./organize-your-admin-nav.md) (the two are mutually exclusive). Either way the entry shape
below is the same:

```ts
import type { AdminNavEntry } from '@glw907/cairn-cms/sveltekit';

const adminNav: AdminNavEntry[] = [{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }];
```

That array is the value of `adminNav` on your adapter's `editor` group, the same group `nav` and
`supportContact` live under.

`icon` has to be one of the nine bundled Lucide names
([`AdminNavIcon`](../reference/sveltekit.md#adminnavicon):
`anchor`, `calendar`, `clipboard-list`, `list`, `users`, `package`, `inbox`, `table`, `wrench`), and
`href` has to be a path no built-in view already owns. Cairn validates both when it builds the
admin routes at server start, so a typo fails loudly at boot instead of rendering a broken or
shadowing link:

```
adminNav icon "mail" is not one of anchor, calendar, clipboard-list, list, users, package, inbox, table, wrench
adminNav href "/admin/media" collides with cairn's built-in "media" view; choose an unclaimed /admin/<segment>
```

Set `ownerOnly: true` on an entry to hide it from a signed-in editor whose resolved capability isn't
`owner`, whatever their role name. That flag only decides what the sidebar renders. It changes
nothing about what the route itself allows. The
full seam, including the validated `ResolvedNavEntry` shape the shell
actually renders, is [the custom admin-nav seam](../reference/sveltekit.md#the-custom-admin-nav-seam)
in the SvelteKit reference.

The Club section built so far needs no `adminNav` entry or `navFilter` call to hide itself from a
non-`club-admin` editor: since it's gated by the access map, [`resolveNavLayout`](../reference/sveltekit.md#the-navlayout-seam)
reads the same map and drops it from the sidebar for any role the map doesn't name, and
`navLayout`'s own declarative `roles` (see [Organize your admin nav](./organize-your-admin-nav.md))
reaches the same declared vocabulary. **`navFilter` earns its keep for a criterion cairn's role
vocabulary can't express at all**, a feature your own database turns on per site rather than a
role name. Say the club only sometimes tracks boats: a per-request hook on
[`createCairnAdmin`](../reference/admin-routes.md) and `createContentRoutes` receives the
already-arranged, already-gated top-level nodes (sections and loose entries, cairn's own screens
included when the site declares `navLayout`) plus the signed-in editor, and returns the nodes to
render:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';
import { clubFeatureEnabled, resolveClubDb } from './club/roles.js';
import type { ResolvedLayoutNode } from '@glw907/cairn-cms/sveltekit';
import type { Editor } from '@glw907/cairn-cms';
import type { ContentEvent } from '@glw907/cairn-cms/sveltekit';

async function filterClubNav(
  items: ResolvedLayoutNode[],
  ctx: { editor: Editor; event: ContentEvent },
): Promise<ResolvedLayoutNode[]> {
  const db = resolveClubDb(ctx.event.platform?.env);
  const boatsEnabled = db ? await clubFeatureEnabled(db, 'boats') : false;
  return boatsEnabled ? items : items.filter((item) => item.label !== 'Boats');
}

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime, { navFilter: filterClubNav });
```

Hiding the link this way is a courtesy, not a gate: pair it with a guard inside the Boats screen's
own `load` (`requireAccess`, plus your own feature check) so a direct URL still refuses when the
feature is off. See [`ContentRoutesDeps`](../reference/sveltekit.md#contentroutesdeps) for the full
`navFilter` signature, and [Organize your admin nav](./organize-your-admin-nav.md) for arranging
cairn's own screens alongside a section like this one.

## Reach your own data

`event.platform.env` carries whatever bindings your `wrangler.jsonc` declares. Add your own D1
database next to the engine's, the same way the showcase adds
`APP_DB` next to `AUTH_DB`:

```jsonc
// wrangler.jsonc
"d1_databases": [
  { "binding": "AUTH_DB", "database_name": "your-site-auth", "database_id": "…" },
  { "binding": "APP_DB", "database_name": "your-site-app", "database_id": "…" }
]
```

Intersect its type onto `App.Platform.env` in `src/app.d.ts`, next to the engine's own
[`CairnPlatformBindings`](../reference/sveltekit.md#cairnplatformbindings) intersection (see [the
guard and the ambient type](../reference/admin-routes.md#the-guard-and-the-ambient-type) for the
full shape). From there, `event.platform!.env.APP_DB` is exactly the binding the preceding `load`
and actions already used. Cairn's engine never reads, migrates, or validates this table. It's
yours the same way any other Cloudflare binding on your Worker is yours,
and a custom screen is the ordinary way to give editors a form in front of it instead of a raw D1
console.

**A migration that adds a foreign key must land its referenced table first, and remote D1 enforces
that where a local test double often does not.** A migration that adds `REFERENCES some_table` on a
column, before `some_table` exists on the real database, passes every unit test written against a
fake D1 (nothing in a fake enforces referential integrity) and then fails every write on the actual
deployed database. Sequence your own migrations so a `REFERENCES` target always lands before the
edge that points at it, and run at least one real write against a scratch D1 database before
trusting a schema change, not only the doubles your unit tests use.

## Verify it

Sign in to `/admin` as an owner and open `/admin/signups` directly (or click the sidebar entry, if
you added one). Add a row, then delete it. Sign in as a non-owner editor and try the same URL: the
`requireOwner` call returns a 403 instead of rendering the list.

For the Club section, sign in as an editor without the `club-admin` role and confirm the sidebar
hides the section entirely, then confirm typing `/admin/club` directly still returns a 403 from
the layout `load`. Submit a form action directly (curl, or a saved request) as that same editor,
bypassing the sidebar and the page entirely, and confirm `clubAction` refuses it too: the layout
guard alone isn't enough. Sign in as a `club-admin` and confirm both the load and the action admit
it.

## Related reference

[`requireOwner`](../reference/sveltekit.md#requireowner) and
[`requireAccess`](../reference/sveltekit.md#requireaccess) document the two guard calls this guide
used. [`adminAction`](../reference/sveltekit.md#adminaction) documents the admin-scoped action
wrapper `createSectionAction`, [documented in full](../reference/sveltekit.md#createsectionaction),
composes. [`defineRoles`](../reference/core.md#roles) and [Access map](../reference/core.md#access-map)
document the declarations the Club section builds on, and [Restrict admin access by
role](./restrict-admin-access.md) walks through wiring them in full. [The custom admin-nav
seam](../reference/sveltekit.md#the-custom-admin-nav-seam) covers
`AdminNavEntry`, `AdminNavIcon`, and the validated `ResolvedNavEntry` shape in full, and
[`ContentRoutesDeps`](../reference/sveltekit.md#contentroutesdeps) documents `navFilter`.
[Organize your admin nav](./organize-your-admin-nav.md) covers `navLayout`, the seam for arranging
the whole sidebar rather than adding one entry to it.
[`CairnAdminShell`](../reference/components.md#cairnadminshell) documents the shell your screen
renders inside. [The admin toolkit](../reference/admin-toolkit.md) documents `PageHeader` and
`AdminTable`, the packaged header and table components this guide's screen builds with, and
[`OfficeList`](../reference/components.md#officelist) documents the alternative header-plus-card
frame a triage screen composes in one wrap. [`CsrfField`](../reference/components.md#csrffield)
documents the field every one of this guide's forms needs.
[The canonical admin mount](../reference/admin-routes.md)
covers the route pair and layout this guide assumed were already in place, and [the ambient types
reference](../reference/ambient.md) covers the `locals.editor` typing in full.
