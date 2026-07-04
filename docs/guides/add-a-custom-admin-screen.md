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
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-semibold">Signups</h1>
<form method="POST" action="?/create" class="my-4 flex gap-2">
  <CsrfField />
  <label class="sr-only" for="signup-name">Name</label>
  <input id="signup-name" name="name" placeholder="Name" class="input input-bordered" />
  <label class="sr-only" for="signup-email">Email</label>
  <input id="signup-email" name="email" placeholder="Email" class="input input-bordered" />
  <button class="btn btn-primary">Add</button>
</form>
<table class="table">
  <thead>
    <tr><th>Name</th><th>Email</th><th><span class="sr-only">Actions</span></th></tr>
  </thead>
  <tbody>
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
  </tbody>
</table>
```

Nothing here mounts a layout of its own. The site's shared `/admin/+layout.svelte` already wraps
the whole `/admin/**` subtree in
[`CairnAdminShell`](../reference/components.md#cairnadminshell), so this page renders inside the
same sidebar, top bar, and theme as every built-in view. The preceding DaisyUI classes (`input`,
`btn`, `table`) are the same ones cairn builds the shell with, so a screen that reuses them needs
no stylesheet of its own.

## Gate it with `requireSession` or `requireOwner`

The engine's auth guard already ran before this route's `load` does, and it set
`event.locals.editor` for the whole `/admin/*` subtree, typed with no work on your part by the one
`import '@glw907/cairn-cms/ambient';` line every site's `src/app.d.ts` carries (see the [ambient
types reference](../reference/ambient.md)). Reading that identity, and refusing the request when it
isn't good enough, is
[`requireSession`](../reference/sveltekit.md#requiresession) and
[`requireOwner`](../reference/sveltekit.md#requireowner). Both take the same minimal shape,
`{ locals: { editor } }`, so they read straight off your route's own `load` or action event.
`requireSession` returns the signed-in editor or redirects to
`/admin/login`. `requireOwner` does the same, then also answers a non-owner editor with a 403. The
signups list is owner-only management, so every preceding load and action calls `requireOwner`; a
screen every editor should be able to use would call `requireSession` instead.

The `requireOwner(event)` call is the server-side gate. A sidebar entry can hide a link from an editor (the
next section shows how), but hiding a link isn't access control, and nothing stops an editor from
typing the URL directly. The `requireOwner(event)` call at the top of every load and action is what
actually turns that request away.

## Link it from the sidebar with `adminNav`

A sidebar entry is validated data on your adapter's `editor` group. It does not register the
route; the file already did that:

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

Set `ownerOnly: true` on an entry to hide it from a signed-in editor who isn't an owner. That flag
only decides what the sidebar renders. It changes nothing about what the route itself allows. The
full seam, including the validated `ResolvedNavEntry` shape the shell
actually renders, is [the custom admin-nav seam](../reference/sveltekit.md#the-custom-admin-nav-seam)
in the SvelteKit reference.

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

## Verify it

Sign in to `/admin` as an owner and open `/admin/signups` directly (or click the sidebar entry, if
you added one). Add a row, then delete it. Sign in as a non-owner editor and try the same URL: the
`requireOwner` call returns a 403 instead of rendering the list.

## Related reference

[`requireSession`](../reference/sveltekit.md#requiresession) and
[`requireOwner`](../reference/sveltekit.md#requireowner) document the two guard calls this guide
used. [The custom admin-nav seam](../reference/sveltekit.md#the-custom-admin-nav-seam) covers
`AdminNavEntry`, `AdminNavIcon`, and the validated `ResolvedNavEntry` shape in full.
[`CairnAdminShell`](../reference/components.md#cairnadminshell) and
[`CsrfField`](../reference/components.md#csrffield) document the shell your screen renders inside
and the field every one of its forms needs. [The canonical admin mount](../reference/admin-routes.md)
covers the route pair and layout this guide assumed were already in place, and [the ambient types
reference](../reference/ambient.md) covers the `locals.editor` typing in full.
