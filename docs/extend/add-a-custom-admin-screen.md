# Add a custom admin screen

A custom admin screen is a SvelteKit route under `src/routes/admin/` that renders inside `CairnAdminShell`, can adopt the packaged admin toolkit, and sits behind the same `/admin` sign-in guard as the engine's screens.
A developer builds one for an administrative function the engine does not provide, such as a report, a tool, or a dashboard.
Some screens keep data outside the markdown content, such as the example site's list of signups in a D1 database, or a members directory.
Others keep none, such as a form that sends a newsletter through the site's mail service, a report built from records the site already holds, or a button that calls an outside service to clear a CDN cache.
A site with another kind of markdown content declares a concept in its adapter instead, as [Define an adapter and schema](define-an-adapter-and-schema.md) describes.

The route's place under `/admin` gives the screen the shell and the sign-in guard.
The guard decides nothing per route, so the access check belongs to the screen.
An entry's history comes from git.
A screen's actions sit outside git, whether they write a site database or call an outside service, and the audit trail is their record.
Every wrapped action that succeeds must emit an audit record, and both action wrappers audit an access refusal.
`cairn-audit` holds the screen to the rules it applies to the engine's admin components.
The steps that follow build a screen that renders inside the admin shell, enforces your site's access map on its reads and writes, records each write in the audit trail, and passes `cairn-audit`.

The worked example is the signups screen at `examples/showcase/src/routes/admin/signups/`, which a scaffolded site does not ship.
A developer who has opened that screen finds each of its calls, `requireAccess`, `createSectionAction`, and `ctx.audit`, explained in the step that adds it.
[Build the dialog form](#build-the-dialog-form), [Load row detail on demand](#load-row-detail-on-demand), and [Animate the screen](#animate-the-screen) apply only to a screen with that feature.
The steps assume familiarity with SvelteKit's routing, form actions, and server hooks, with Svelte's snippets and runes, and with Cloudflare D1 bindings.

To declare the access map or change who reaches a screen, see [Restrict admin access](restrict-admin-access.md).
To list the screen in the sidebar, see [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
The reasoning behind the access map, the audit's site-wide configuration, and the media upload protocol each have a separate page, listed under [See also](#see-also).

## Before you begin

The steps assume the following setup:

- A site that the setup command scaffolded, or a hand-built site that [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) brings to the same shape.
- A rule for the screen's route in your site's access map.
  The site declares the map once, as the adapter's `access` member.
  A scaffolded site's adapter declares no `access` member.
  The example site's adapter declares `'/admin/signups': ['owner']`, which admits only owners to its signups screen.
  [Restrict admin access](restrict-admin-access.md) describes how to declare the rule.
- A D1 database that your site binds in `wrangler.jsonc`, with a separate migrations directory, for a screen that keeps data.
  `wrangler d1 migrations apply` walks one directory per database.
  The scaffold's `wrangler.jsonc` binds no database beyond the engine's `AUTH_DB`, and the example site's `APP_DB` is not part of the scaffold.
  Cloudflare's [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/) documentation describes the binding.
  A screen with no data skips this item.
  Its actions use `createAdminAction` with the `access` option set, since `createSectionAction` requires a binding resolver.
- A D1 database that holds the `audit_log` table from the engine's opt-in `0002_audit.sql` migration, as the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry describes.

The admin is two pairs of route files: the layout pair that renders `CairnAdminShell` and the `[...path]` catch-all pair.
The admin's `+error.svelte` sits beside them.
The example site, `examples/showcase`, adds a `signups/` screen beside the catch-all.
A scaffolded site does not ship it.
The following tree shows the source files that the steps touch, with the new screen's directory named after the example site's.

```text
src/
├── hooks.server.ts
├── admin.css
└── routes/
    └── admin/
        ├── +error.svelte
        ├── +layout.server.ts
        ├── +layout.svelte
        ├── [...path]/
        │   ├── +page.server.ts
        │   └── +page.svelte
        └── signups/            (the new screen)
            ├── +page.server.ts
            └── +page.svelte
```

The first step creates that directory.

## Place the route

A route directory under `src/routes/admin/` is the whole registration for a custom screen.
SvelteKit sorts a route under `src/routes/admin/` ahead of the engine's `[...path]` catch-all, with no configuration.
The shared admin layout renders the screen as `CairnAdminShell`'s children, with the shell's nav, user menu, and theme, and the screen needs no wrapper code.
The screen sits behind the same `/admin` sign-in guard as the engine's screens.
Every `/admin` path except the sign-in page and the magic-link confirm page is gated.

To place the route, follow these steps:

1. In `src/routes/admin/`, create a directory named for the screen.
2. In that directory, create `+page.server.ts` for the load and the actions, and `+page.svelte` for the markup.

The shell keeps the cairn glyph and wordmark as its favicon and sidebar brand mark.
The only site identity it shows is `siteName` from your site config, in the page title and the topbar.

**Symptom:** The admin shell does not fill the viewport, and in dev the browser console shows one error about a width cap on an ancestor of the admin root.

**Cause:** Your site's root layout wraps every route, the admin included, in a header, a footer, or a width cap.
A dev-only check catches the width-cap case and logs that one error, and it never changes rendering.

**Fix:** Make the root layout chrome-free for `/admin`, as [the admin routes reference](../reference/admin-routes.md#the-root-layout-must-be-chrome-free) describes.

Listing the screen in the sidebar is a separate task, covered in [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Gate it

The access check belongs in the screen's `load`, because the sign-in guard admits a session to `/admin` and decides nothing per route.
`createAuthGuard({ runtime })` signs a session in for the whole `/admin` subtree before any load runs.
It does not decide which routes that session may reach.

Two calls enforce your site's access map: `requireAccess` in the `load`, and an access-checking wrapper around every action.
Both run the same fail-closed check, `hasAccessRule` and then `canReach`.
Both read the map that the guard attaches to every admin request it signs in, taken from the adapter's `access` member.
SvelteKit runs a matched form action before the page's `load`, and an enhanced submission's request runs the action alone.
The load's check therefore never guards an action.
An action that skips the check admits any signed-in session to the write and records nothing.

To gate the screen's read, follow this step:

- In the screen's `+page.server.ts`, call `requireAccess(event)` in `load` before it reads anything.

The following load comes from the example site's `examples/showcase/src/routes/admin/signups/+page.server.ts`, without its logger call and comments.
It calls `requireAccess(event)` before the read and fails with a 500 when the `APP_DB` binding is absent.

<!-- snippet-check-skip: imports cloudflare:workers and reads env.APP_DB, which only the site's Worker types declare -->
```ts
// src/routes/admin/signups/+page.server.ts
import type { PageServerLoad } from './$types';
import { env } from 'cloudflare:workers';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';
import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

interface SignupRow {
  id: number;
  name: string;
  email: string;
}

function requireAppDb(): D1Database {
  const db: D1Database | undefined = env.APP_DB;
  if (!db) error(500, 'This screen is not configured.');
  return db;
}

export const load: PageServerLoad = async (event) => {
  requireAccess(event);
  const db = requireAppDb();
  const { results } = await db
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};
```

A route with no rule in the map refuses every session, and the owner has no exemption.
A route nested under the screen inherits the sign-in guard but not the screen's `requireAccess` call, so it makes the call itself.
The access map matches a route by its deepest key prefix, and the screen's key covers the nested route.
One case resolves to no rule: a nested route that starts with a dynamic segment when the map holds a deeper key under the screen's.
Otherwise the nested route needs an entry only for a different rule.
[Load row detail on demand](#load-row-detail-on-demand) applies this to a detail endpoint.

## Choose the action wrapper

A screen whose actions write through a database binding uses `createSectionAction`, and a screen with no binding uses `createAdminAction` with its `access` option set.
`createSectionAction` requires a `resolveDb` binding resolver.
`createAdminAction` carries the CSRF and audit contract with no binding.

To choose the wrapper, follow this step:

- In the screen's server file, import the wrapper that matches whether its actions write through a binding.

The following table compares when each wrapper checks the access map, how it refuses a session, whether it needs a binding, and how it records a refusal.

| Behavior | `createSectionAction` | `createAdminAction` |
|---|---|---|
| Checks the access map | On every call | Only when the call sets the `access` option |
| Refuses a session | Returns `fail(403)` | Throws `error(403, ...)` |
| Needs a binding | Yes, a `resolveDb` resolver | No |
| Records a refusal | Audited, and logged as `auth.access.refused` | Audited, and logged as `auth.access.refused` |

Without the `access` option, `createAdminAction` authorizes nothing.
Both wrappers show the same default refusal message, which names no gate, and only `createSectionAction` takes a `deniedMessage` option to replace it.
The signups screen writes through `APP_DB`, so the rest of the page uses `createSectionAction`.
For the `access` option, see the [`createAdminAction`](../reference/sveltekit.md#createadminaction) entry.

## Wrap the actions

One `createSectionAction` call builds a reusable wrapper for the section, and each form action runs through it.
`resolveDb` reads your site's binding off the Worker env that the engine passes it.
`Env` is a type parameter for your site's bindings, because the engine ships no `Env` type.
The example site passes the `Env` that its generated `worker-configuration.d.ts` declares.

To wrap the actions, follow these steps:

1. In the screen's server file, build one wrapper with `createSectionAction`, passing a `resolveDb` whose parameter is annotated `Env | undefined`.

   **Symptom:** A binding read off the `resolveDb` parameter, such as `workerEnv?.APP_DB`, fails to typecheck against the type `{}`.

   **Cause:** `createSectionAction` does not infer `Env` from an unannotated `resolveDb` parameter, so `Env` collapses to `{}`.

   **Fix:** Annotate the parameter as `Env | undefined`, or pass `Env` and the database type as explicit type arguments.

2. In the exported form actions, wrap each handler in that wrapper, passing its `action` and `entity`.
3. On a destructive action, add `ownerOnly: true` to the options.

The following excerpt continues the same file with the example site's wrapper declaration and its `create` and `remove` actions, without the comments.

<!-- snippet-check-skip: reads Env, which only the site's generated worker-configuration.d.ts declares -->
```ts
// src/routes/admin/signups/+page.server.ts, continued
import type { Actions } from './$types';
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';

const sectionAction = createSectionAction<Env, D1Database>({
  resolveDb: (workerEnv: Env | undefined) => workerEnv?.APP_DB,
});

export const actions: Actions = {
  create: sectionAction(
    async ({ form, ctx }) => {
      const name = String(form.get('name') ?? '').trim();
      const email = String(form.get('email') ?? '').trim();
      if (!name || !email) return fail(400, { error: 'missing' });
      await ctx.db
        .prepare('INSERT INTO signups (name, email) VALUES (?, ?)')
        .bind(name, email)
        .run();
      ctx.audit({ detail: email });
      return { created: true };
    },
    { action: 'create', entity: 'signup' },
  ),
  remove: sectionAction(
    async ({ form, ctx }) => {
      const id = Number(form.get('id'));
      await ctx.db.prepare('DELETE FROM signups WHERE id = ?').bind(id).run();
      ctx.audit({ entityId: id });
      return { removed: true };
    },
    { action: 'remove', entity: 'signup', ownerOnly: true },
  ),
};
```

Each handler receives `{ form, ctx }`, writes through `ctx.db`, and calls `ctx.audit` with a `detail` or an `entityId`.
The audit record takes its `action` and `entity` from the wrapper's options unless the handler's `ctx.audit` call passes one.
Underneath, the wrapper runs the editor identity, CSRF, and single form-read work of `createAdminAction`.
A section never calls `createAdminAction` directly.
Every successful path through a handler calls `ctx.audit` before it returns.
A handler that rejects with `fail()` before it writes owes no record.
[Resolve a missing audit record](#resolve-a-missing-audit-record) traces a record that never arrives.

## Wire the audit sink

A `ctx.audit` call persists a record only when a handle in `hooks.server.ts` sets `event.locals.cairnAuditSink`, typically to a `createD1AuditSink` over a bound D1 database.
The file has one `handle` export.
`sequence`, which `@sveltejs/kit/hooks` exports beside the `Handle` type, composes several handles into it and runs them in order.
The sink's handle only sets a `locals` field that the route reads, and it works placed after `createAuthGuard`.
The scaffold's hooks module picks between the dev backend and `createAuthGuard({ runtime })` in one `if`, and it exports the result as `handle`.
The dev backend wires no sink.

To wire the sink, follow these steps:

1. In `hooks.server.ts`, add a handle that sets `event.locals.cairnAuditSink` to a `createD1AuditSink` over the audit database.
2. In that handle, guard the env read with `building` from `$app/env`, since every `cloudflare:workers` env read throws while the build prerenders.
3. In the production branch, set `handle` to `sequence(createAuthGuard({ runtime }), wireAuditSink)`.

The following excerpt of `hooks.server.ts` shows the `wireAuditSink` handle from the `createD1AuditSink` reference entry and the production branch's assignment.
The scaffold's hooks module wires no sink, so the excerpt shows only the lines to add.
It imports `runtime` from `#chassis/cairn.server.js` and imports no access map.

<!-- snippet-check-skip: excerpt; assigns the scaffold's handle and reads env.AUDIT_DB, which only the site's generated Env declares -->
```ts
// src/hooks.server.ts (excerpt)
import { building } from '$app/env';
import { env, waitUntil } from 'cloudflare:workers';
import { createAuthGuard, createD1AuditSink } from '@glw907/cairn-cms/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';
import { runtime } from '#chassis/cairn.server.js';

const wireAuditSink: Handle = ({ event, resolve }) => {
  if (!building && env.AUDIT_DB) {
    event.locals.cairnAuditSink = createD1AuditSink(env.AUDIT_DB, waitUntil);
  }
  return resolve(event);
};

// ...the dev-backend branch stays as the scaffold wrote it
handle = sequence(createAuthGuard({ runtime }), wireAuditSink);
```

Inside a request, the handle passes the `waitUntil` that `cloudflare:workers` exports, with no bind.
A Cron `scheduled` handler that holds an `ExecutionContext` passes `ctx.waitUntil.bind(ctx)` instead.
The sink is fail-open: it returns before the insert settles, and a failed insert is logged and never fails the audited action.
`createSectionAction` audits each refusal its checks make, except a rate-limit refusal.
The session and CSRF refusals underneath it leave no audit record.
For the sink's parameters, see the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry.

The server side is complete, and the screen's markup comes next.

## Compose the screen from the toolkit

The screen's markup composes the admin toolkit's primitives in place of a hand-rolled table, list, or field.
The engine's screens compose the same set, and `ManageEditors` builds from its `PageHeader` and `AdminTable`.
Each primitive has one job:

- `PageHeader` holds the eyebrow, title, and meta band.
- `AdminTable` holds the table chrome around your header and row markup.
- `ListToolbar` holds the search and filter band.
- `ToolbarDisclosure` is a trigger that opens a floating panel.
- `Pagination` renders page navigation.
- `StatusChip` renders a status chip.
- `EmptyState` renders the centered empty state.
- `FieldLabel` wraps a control in its label.
- `ExpandableRow` renders a summary row with an expand-in-place panel.
- `MediaPicker` is a picker over the media library.
- `Tooltip` gives an icon-only control a hover and focus description.

To compose the markup, follow these steps:

1. In the screen's `+page.svelte`, import the primitives it needs from the admin toolkit.
2. In each form that posts to one of the screen's actions, mount a `CsrfField` from `@glw907/cairn-cms/admin`.

   The guard refuses an admin form POST whose `csrf` field is missing or wrong with a 403.
   Inside the shell, `CsrfField` takes no `token` prop and reads the token the shell provides.
   The signups screen mounts it in both its forms.

A smaller screen shows the toolkit alone: an Events list that composes three primitives, with the table inside a card.
It illustrates the composition and is not a second screen to build.

```svelte
<script lang="ts">
  import { PageHeader, AdminTable, StatusChip } from '@glw907/cairn-cms/admin-toolkit';

  let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
</script>

<PageHeader eyebrow="Team" title="Events" meta={`${data.events.length} upcoming`} />

<div class="overflow-hidden card-shell card-shadow">
  <AdminTable rowCount={data.events.length}>
    {#snippet header()}
      <th scope="col">Name</th>
      <th scope="col">Status</th>
    {/snippet}
    {#snippet children()}
      {#each data.events as event (event.id)}
        <tr>
          <td>{event.name}</td>
          <td><StatusChip label={event.status} /></td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</div>
```

```repro
story: toolkit/custom-screen
alt: Reproduction of a minimal Events screen, showing PageHeader, AdminTable, and StatusChip composing a screen inside the admin shell.
caption: The screen renders below the shell's topbar. The page header carries the eyebrow, title, and count, and each row's status renders as a status chip.
```

`AdminTable` sets the horizontal scroll, so the wrapping `div` carries `overflow-hidden card-shell card-shadow` and never `overflow-x-auto`.
Each primitive ships its compiled classes and its scoped styles with the package.
A later release still renders it under your route with no change on your side.
The [admin toolkit](../reference/admin-toolkit.md) reference lists every export with its props.
The [admin components](../reference/admin.md) reference lists the engine's components a screen can mount beside the toolkit.

## Style the screen

The screen's utility classes compile only through the site admin sheet, so its markup stays under a root that sheet scans.
A scaffolded site's admin sheet, `src/admin.css`, compiles to `.cairn/admin.css` and scans `./routes/admin` and `./lib/admin`.
A class in your markup compiles only when its file sits under one of those roots.
The scaffold's `predev`, `prebuild`, and `precheck` scripts compile that sheet, so a build needs no separate stylesheet step.
The engine's packaged admin sheet never scans your site's markup.

To style the screen, follow these steps:

1. Under `src/routes/admin` or `src/lib/admin`, keep every file that holds the screen's markup.

   The admin is built with daisyUI and Tailwind, and your screen uses the same classes.
   Every daisyUI component and utility class except calendar compiles into the admin sheet, with no safelist entry.
   Both admin themes set daisyUI's radius tokens as a corner ladder.
   `--radius-selector` is `0.25rem` for chips and small markers, `--radius-field` is `0.375rem` for controls, and `--radius-box` is `0.5rem` for cards and dialogs.

2. In the screen's markup, give each rounded corner `rounded-selector`, `rounded-field`, or `rounded-box`, never a fixed Tailwind radius such as `rounded-lg`.

   A fixed Tailwind radius still compiles but does not follow the corner ladder.
   The norms that `cairn-audit` measures follow the ladder: 6px for ghost and primary buttons, text inputs, and selects, and 8px for cards.
   A bare `btn` with no color, style, or state renders as a hairline button.
   A `btn` in a selected form, such as `.btn-active` or `aria-pressed="true"`, renders as the selected segment.
   `btn-link`, the color variants, `btn-outline`, and `btn-dash` keep their look.

3. For warning or success ink, use `cairn-text-warning` or `cairn-text-success`, the classes the packaged admin sheet defines for those inks.

   The sheet does not compile the bracketed `text-[var(--cairn-warning-ink)]` and `text-[var(--color-positive-ink)]` forms.

The two optional recipes that follow serve a screen with a dialog form or with expanding rows.

## Build the dialog form

A form in a native `<dialog>` submitted with `enhance` survives every action result when its callback handles all four result types.
`enhance` hands its callback one of four result types: `'success'`, `'failure'`, `'redirect'`, or `'error'`.
The default `update()` resets the form and refreshes the page's data on `'success'` only.
It then calls `applyAction` for a same-page result and for every `'redirect'`.
On an `'error'` result, `applyAction` renders the nearest error page, which destroys the dialog.
The callback therefore shows a `'failure'` message and then calls `update()`, and it reports an `'error'` without calling `update()`.
On `'success'`, it closes the dialog before awaiting `update()`, and it hands `'redirect'` to `update()`.
The callback's type, `SubmitFunction`, comes from `$app/forms` on SvelteKit 3.
For the callback's full contract, see SvelteKit's [Customizing use:enhance](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-Customizing-use:enhance) section.

To build the dialog form, follow these steps:

1. In the screen's markup, add a `<dialog class="modal">` whose `aria-labelledby` points at the dialog's heading.

   An element with the `dialog` role needs an accessible name, and the heading supplies one that does not depend on the body text.

2. In the handler of the button that opens the dialog, call `showModal()`.

   A dialog opened with `showModal()` closes on Escape without script.
   A `<form method="dialog">` is a form element too, and forms never nest.

3. Inside the dialog, add the action form with `enhance` applied, as a separate form element and never inside a `<form method="dialog">`.
4. In the `enhance` callback, handle each of the four result types, and never call `update()` on `'error'`.
5. In the form, mount an empty `role="alert"` paragraph for the failure message.

   A live region announces only the changes made after it is in the DOM, so it is mounted empty first.

6. On the input, point `aria-describedby` at the alert paragraph.
7. On the same input, set `aria-invalid="true"` while its value is the failed one.
8. On the submit button, set `disabled` while the request is pending.

   The error is then read with its field when focus moves to the input, and a disabled submit cannot fire the action a second time.

The following dialog is an illustrative create form that posts to the signups screen's `create` action.

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/admin';

  let dialog = $state<HTMLDialogElement | null>(null);
  let message = $state('');
  let pending = $state(false);

  const onSubmit: SubmitFunction = () => {
    pending = true;
    message = '';
    return async ({ result, update }) => {
      pending = false;
      if (result.type === 'failure') {
        message = String(result.data?.error ?? 'The request failed.');
        await update();
      } else if (result.type === 'error') {
        message = 'The request failed. Try again.';
      } else if (result.type === 'success') {
        dialog?.close();
        await update();
      } else {
        await update();
      }
    };
  };
</script>

<button class="btn" onclick={() => dialog?.showModal()}>Add a signup</button>

<dialog bind:this={dialog} class="modal" aria-labelledby="signup-dialog-title">
  <div class="modal-box">
    <h2 id="signup-dialog-title">Add a signup</h2>
    <form method="POST" action="?/create" use:enhance={onSubmit}>
      <CsrfField />
      <label for="signup-name">Name</label>
      <input id="signup-name" name="name" class="input" />
      <label for="signup-email">Email</label>
      <input
        id="signup-email"
        name="email"
        type="email"
        class="input"
        aria-describedby="signup-error"
        aria-invalid={message ? 'true' : undefined}
      />
      <p id="signup-error" role="alert">{message}</p>
      <button class="btn btn-primary" disabled={pending}>Add</button>
    </form>
  </div>
</dialog>
```

The second recipe loads detail for rows that expand.

## Load row detail on demand

A screen whose rows expand fetches each row's detail when its panel opens and caches it per row.
A page's `load` runs on each visit, so a list load that also fetches every row's detail pays for all of them every time.
Fetching on open costs only the rows a reader opens.
Returning an unawaited promise from `load` streams it, but the work still runs when `load` creates the promise.

To load row detail on demand, follow these steps:

1. Under the screen's directory, add the detail endpoint as a nested route that returns one row's detail as JSON.
2. In that route's server file, call `requireAccess`.
3. In your site's access map, add an entry for the nested route when it needs a different rule from the screen's.

   It also needs an entry when it starts with a dynamic segment and the map holds a deeper key under the screen's.
   Otherwise the screen's key already covers it.
   [Restrict admin access](restrict-admin-access.md) describes how to add an entry.

4. In the screen's markup, render each row as an `ExpandableRow` inside the `AdminTable`.

   `ExpandableRow` renders your summary cells plus one trailing trigger cell.
   The `colspan` you pass counts that trigger cell, and the panel snippet receives the row's `datum`.
   The trigger cell has no visible heading.
   Your `header` snippet matches it with a `<th scope="col">` whose text sits in an `sr-only` span, as the signups table does for its actions column.
   A click inside an element carrying `data-cairn-inert-cell` does not toggle the row.
   An interactive summary cell wraps its content in that attribute in place of calling `stopPropagation()`.

5. In the same file, keep the expanded row's id in state, and pass each `ExpandableRow` its `expanded` value and an `onToggle` callback.

   `ExpandableRow` holds no expand state, and both its trigger button and a click on the summary row call `onToggle`.
   The [`ExpandableRow`](../reference/admin-toolkit.md#expandablerow) entry lists its props.

6. In the same file, write an open handler that `onToggle` calls when a row opens.
7. In the open handler, return the cached detail when the row already has one.
8. Otherwise, in the same handler, call `fetch` for the row's detail inside a `try` block.

   `fetch` resolves on an HTTP error status, and `Response.json()` rejects on a body that is not JSON, such as an HTML error page.

9. Inside the `try` block, check `response.ok`.
10. In the same block, parse the body with `Response.json()`.
11. In the same block, cache the detail only after the status check and the parse both succeed, which leaves a failed row retryable.
12. In the row's panel snippet, render the cached detail.

The following open handler is illustrative.
It keys a reactive map by row id, returns a cached detail, and otherwise fetches the URL passed in, caching the parsed JSON only on success.

```ts
import { SvelteMap } from 'svelte/reactivity';

const details = new SvelteMap<number, unknown>();

async function openDetail(id: number, url: string): Promise<unknown> {
  if (details.has(id)) return details.get(id);
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const detail: unknown = await response.json();
    details.set(id, detail);
    return detail;
  } catch {
    return undefined;
  }
}
```

The next section states the motion rules an animating screen meets.

## Animate the screen

An animating screen writes each duration and easing as one of the admin's motion tokens.

To animate the screen, follow this step:

- In the screen's markup or scoped style block, write each duration and easing as a `var()` of a motion token, such as `var(--cairn-dur-base)`.

Both admin themes declare eight motion tokens.
The five durations are `--cairn-dur-instant` at `70ms`, `--cairn-dur-quick` at `110ms`, `--cairn-dur-base` at `150ms`, `--cairn-dur-shift` at `240ms`, and `--cairn-dur-settle` at `400ms`.
The three curves are `--cairn-ease-standard`, `--cairn-ease-entrance`, and `--cairn-ease-exit`.
A `transition-*` utility with no `duration-*` or `ease-*` beside it runs on the base duration and the standard curve.
Under `prefers-reduced-motion: reduce`, the admin cuts every animation and transition to `0.01ms`.

Three admin-only, error-tier `cairn-audit` rules hold an admin screen's motion to this vocabulary:

- `motion-property` limits which properties a transition names.
- `motion-vocabulary` fails a literal duration or easing.
- `motion-hover-gate` fails hover motion outside `@media (hover: hover)`.

The rules scan `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit` by default.
A site whose screens live elsewhere names their roots under `static.adminScope`, as the [audit configuration](../reference/cairn-audit.md#configuration) reference describes.
For what each rule checks, see [The static rules](../reference/cairn-audit.md#the-static-rules).
For the exemptions and allowances, see [What the motion rules don't cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover).

## Verify the screen

The screen passes when it renders in the shell, refuses an unadmitted session, records each write, and clears the error tier of `cairn-audit`.
The checks run on a default build that `npm run build` and then `npm run preview` serve, or on the deployed site.
Under `npm run dev`, the hooks take the dev-backend branch, which signs in an owner on every `/admin` request and wires no audit sink.
The refusal check and the audit-row check cannot pass there.
A default build turns the dev backend off, and the scaffold's `preview` script serves the build with `wrangler dev` on port 4173.

To verify the screen, follow these steps:

1. In a browser signed in as an owner, open the screen under `/admin`.

   The screen renders inside the admin shell, with the shell's nav, user menu, and theme.

   **Symptom:** The owner sees the admin's 403 error page in place of the screen.

   **Cause:** The access map has no rule for the screen's route, and a route with no rule refuses every session, owner included.

   **Fix:** Add a rule for the route to the adapter's access map, as [Restrict admin access](restrict-admin-access.md) describes, then reload the screen.

2. In a second browser, sign in as an editor whose role the screen's rule does not name, and open the screen.

   The admin's error page reports that the account has no access to the page.
   An owner adds that account through the **Add editor** form on `/admin/editors`, choosing a role the rule leaves out, such as `editor` for the signups rule.
   Each role option shows its name, followed by its capability in parentheses when the two differ.
   [Assign the roles](restrict-admin-access.md#assign-the-roles) describes the roles an owner can assign.

3. In the owner's browser, submit one of the screen's actions.

   **Symptom:** The submit returns a 403, and the logs carry `guard.refused` with `reason: csrf`.

   **Cause:** The form that posted has no `CsrfField`, and the guard refuses an admin form POST without a valid `csrf` field.

   **Fix:** Mount a `CsrfField` from `@glw907/cairn-cms/admin` in each form that posts to one of the screen's actions.

4. In the audit database, query the `audit_log` table for its newest row.

   The row names the action, and its `action` and `entity` match the wrapper's options.

   **Symptom:** No row arrives in `audit_log` for the action.

   **Cause:** The request ran under `npm run dev`, whose dev-backend branch wires no sink, or another cause in the audit path.

   **Fix:** Serve a default build with `npm run preview`, or use the deployed site, and submit again.
   If the row still does not arrive, work through [Resolve a missing audit record](#resolve-a-missing-audit-record).

5. In the site directory, run the scaffold's `check:cairn` script with npm.

   The script compiles the admin sheet and runs `cairn-audit` over the static rules that the engine's screens meet.
   The default scope includes `src/routes/admin`.

   **Symptom:** The `check:cairn` script exits 1.

   **Cause:** The report holds an unsuppressed error-tier finding, and advisory findings print without changing the exit code.

   **Fix:** Correct each unsuppressed error-tier finding that the report lists.

6. In the site directory, run the script again until no error-tier finding remains.

A rendered run drives a browser against a running server, and [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) sets one up.
The reference documents [tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes) and the [rules a rendered run adds](../reference/cairn-audit.md#the-rules).

## Resolve a missing audit record

A missing record means the request ran under the dev backend, a handler skipped `ctx.audit`, no handle set the sink, or the sink's insert failed.
A handler that returns without calling `ctx.audit` throws `UnauditedActionError`, a 500, in dev.
In production it logs `admin.action.unaudited` at error level instead.

To find the cause, follow these steps:

1. In the terminal that serves the site, check that it runs `npm run preview`, not `npm run dev`.
2. In the action's handler, check that every successful path calls `ctx.audit` before it returns.
3. In `hooks.server.ts`, check that a handle sets `event.locals.cairnAuditSink` and that `sequence` composes it into the exported `handle`.
4. In Workers Logs, look for `audit.sink.write_failed`.

   The reason `wait_until_failed` names an `ExecutionContext`'s `waitUntil` passed unbound, and the row can be lost.

[Debug your site](debug-your-site.md) maps `admin.action.unaudited` and a sink failure to their causes.
The [log events](../reference/log-events.md) reference lists both events' fields and reasons.

## See also

The following pages cover the tasks and reasoning around a custom screen:

- [Restrict admin access](restrict-admin-access.md) describes how to declare the access-map rule each screen and nested route needs.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) describes how to add the screen to the admin's navigation.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) describes how to configure the audit for the whole site, including rendered runs, suppressions, and allowlists.
- [Security model](security-model.md) sets out the reasoning behind the access map.
- [Configure media](configure-media.md) describes media storage and the media upload protocol.
- [Define an adapter and schema](define-an-adapter-and-schema.md) describes how to declare a concept for another kind of markdown content.
- The [admin toolkit](../reference/admin-toolkit.md) reference documents each primitive's props.
