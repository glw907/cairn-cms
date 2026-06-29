# Add a custom admin screen

You can add your own screen to the cairn admin: a concrete SvelteKit route under `/admin/`, rendered
inside cairn's chrome, behind the editor login, with its own entry in the sidebar. The screen is an
ordinary route you own. cairn gives it the shell, the signed-in identity, and a CSRF token, and stays
out of the rest. Use this when your site needs an admin surface cairn does not ship, such as a list of
newsletter signups, a moderation queue, or a dashboard over your own data.

This guide builds a `Signups` screen that reads and writes its own D1 table. The working version lives
in `examples/showcase`.

## How it works

cairn's admin chrome (the sidebar, the top bar, the command palette, the theme) lives in a shared
`/admin/+layout.svelte` that renders the [`CairnAdminShell`](../reference/components.md#cairnadminshell)
component. Every route under `/admin/` renders as that shell's child, including a route you add. A
concrete route like `/admin/signups` wins over cairn's `/admin/[...path]` catch-all, so SvelteKit serves
your `+page.server.ts` and `+page.svelte` instead of the engine's view switch. The route still inherits
cairn's admin guard, so the login gate and the `locals.editor` identity apply with no extra wiring.

## Prerequisites

- A running cairn site with the [canonical admin mount](../reference/admin-routes.md): the
  `/admin/[...path]` catch-all pair and the `/admin/+layout` shell pair. The showcase and the
  getting-started scaffold both ship this shape.
- Any data your screen reads or writes is yours to provision. This guide uses a D1 binding named
  `APP_DB`; see [Configure auth and D1](./configure-auth-and-d1.md) for creating a database, then bind
  it in `wrangler.jsonc` and type it in `app.d.ts` (shown below).

## Write the route

Create `src/routes/admin/signups/+page.server.ts`. The load and each action call
[`requireOwner`](../reference/sveltekit.md#requireowner), which reads `locals.editor` and throws a
redirect or a 403 when the visitor is not a signed-in owner. Read and write your own binding through
`event.platform.env`; the engine never touches it.

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
  const { results } = await event.platform!.env.APP_DB
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};

export const actions: Actions = {
  create: async (event) => {
    requireOwner(event);
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    if (!name || !email) return fail(400, { error: 'missing' });
    await event.platform!.env.APP_DB
      .prepare('INSERT INTO signups (name, email) VALUES (?, ?)')
      .bind(name, email)
      .run();
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

When a visitor opens `/admin/signups`, the load runs behind the guard, reads the table, and returns the
rows. The `create` and `remove` actions write the table and the page reloads with the new state.

## Read the editor identity

cairn populates `locals.editor` for every `/admin/**` route from the session cookie. It carries the
signed-in editor's `email`, `displayName`, and `role` (`owner` or `editor`). Read it directly when you
need the identity, or gate the route with one of two helpers:

- [`requireSession`](../reference/sveltekit.md#requiresession) returns the editor, or throws a redirect
  to the login page when there is no session. Use it for a screen any editor may see.
- [`requireOwner`](../reference/sveltekit.md#requireowner) returns the editor when the role is `owner`,
  throws a redirect when there is no session, and throws a 403 for a non-owner. Use it for an
  owner-only screen.

The `Editor` and `Role` types are documented under [core](../reference/core.md#editor), and the
`locals.editor` ambient declaration ships from the [ambient](../reference/ambient.md) subpath.

## Submit forms with CsrfField

cairn's guard rejects an admin `POST` that carries no valid CSRF token, so every form on your screen
needs one. The shell hands its token to descendant forms through Svelte context, so you render a bare
[`CsrfField`](../reference/components.md#csrffield) with no prop and it reads the token from there.

```svelte
<!-- src/routes/admin/signups/+page.svelte -->
<script lang="ts">
  import { CsrfField } from '@glw907/cairn-cms/components';
  let { data } = $props();
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

The screen's markup uses the same DaisyUI classes and the Warm Stone admin theme the rest of the admin
uses, because it renders inside the shell. Stay with those classes and your screen matches the chrome
around it. Give each input a label (the example uses a visually hidden `sr-only` label so a placeholder
alone never stands in for one), and surface a failed action's `form?.error` in a `role="status"` region
on a production screen so the result is announced.

## Register the sidebar entry

Add the screen to the admin sidebar with an `adminNav` entry in your adapter's `editor` group. The entry
is plain data, validated when the runtime composes:

```ts
// src/lib/cairn.config.ts (the editor group)
editor: {
  adminNav: [{ label: 'Signups', icon: 'inbox', href: '/admin/signups' }],
},
```

The `icon` is a name from a fixed allowlist, not an arbitrary component; the names are listed under
[`AdminNavEntry`](../reference/sveltekit.md#adminnaventry). The `href` must point at a route cairn does
not already own. A collision with a built-in view (a concept list, `media`, `settings`, or the rest)
throws at startup with the conflicting view named, so a typo fails the build rather than shadowing a
cairn screen. The entry also appears in the command palette and resolves a breadcrumb label, both from
the same data.

Set `ownerOnly: true` to hide the link from a non-owner. The flag does not protect the route. It hides
the sidebar link, nothing more, so an editor who types the URL still reaches the screen unless you gate
it. Call `requireOwner` (or `requireSession`) in the load and in every action, as the example above
does. The nav flag is presentation; the guard call is the authorization.

## Declare the binding

Type your binding so the route typechecks. Add it to `App.Platform.env` in `app.d.ts`:

```ts
// src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: {
        APP_DB: D1Database;
        // ...your other bindings
      };
    }
  }
}
```

Then bind it in `wrangler.jsonc`, the same way cairn's own `AUTH_DB` is bound. See
[Deploy to Cloudflare](./deploy-to-cloudflare.md) for the binding and deploy steps.

## What the shell reserves

The shell owns a few keys and behaviors, so design your screen around them:

- `Cmd+K` (or `Ctrl+K`) opens the command palette, and `Cmd+B` (or `Ctrl+B`) toggles the sidebar. Do
  not rebind these on an admin route.
- The shell renders the sign-out and publish-all controls. Your screen supplies its own content below
  the top bar.

Your screen's own client interactivity rides your own client code in the `+page.svelte`, or a
registered [island](./add-an-island.md) if you want a hydrated component. cairn does not inject a client
framework into your route beyond the shell's own chrome.
