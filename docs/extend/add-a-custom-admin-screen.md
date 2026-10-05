# Add a custom admin screen

cairn manages a site's markdown content and the admin frame around it, and it leaves the site's other data and domain logic to the developer, whom it serves through a thin seam, not a built-in feature.
In the admin, that seam is the custom admin screen, a SvelteKit route under `src/routes/admin/` that SvelteKit resolves ahead of the engine's `[...path]` catch-all and that can adopt the packaged admin toolkit.
A site builds one to manage data it keeps outside its markdown content, such as rows in the Cloudflare D1 database that a scaffolded site binds as `APP_DB` for the developer's use, beside the engine's sign-in database.
A site with another kind of markdown content declares a concept in its adapter instead of building a screen, as [Define an adapter and schema](define-an-adapter-and-schema.md) describes.

The route's place under `/admin` gives the screen the [`CairnAdminShell`](../reference/admin.md#cairnadminshell) frame and the same sign-in guard as the engine's screens.
The guard gates the `/admin` subtree as a whole and decides no route's authorization, so the screen checks the site's access map itself, on its read and on every write.
An entry's edit history comes from git, which never sees a screen's writes to its D1 database, so the screen records those writes in the audit trail itself. Once the site wires an audit sink, each `ctx.audit` call adds one row naming the actor, the action, and the entity.
`cairn-audit` applies the rules it runs on the engine's admin components to everything under `src/routes/admin`, a custom screen included.
The steps that follow build a screen under `/admin` that renders inside the admin shell, enforces the site's access map on its reads and writes, records each write in the audit trail, and passes `cairn-audit`.

A developer may first meet a custom screen as the signups screen, which the setup command writes into every scaffolded site at `src/routes/admin/signups/` and which the repository's example site, `examples/showcase`, also carries.
That screen is the worked example, followed from its route through its load, its actions, their audit calls, its markup, and its styles.
[Build the dialog form](#build-the-dialog-form) and [Load row detail on demand](#load-row-detail-on-demand) apply only to a screen with a dialog form or expanding rows.
[Animate the screen](#animate-the-screen) applies only to a screen that animates.
The steps assume familiarity with SvelteKit's form actions and server hooks and with Svelte's snippets and runes.

To declare the site's access map, or to change who reaches an existing screen, see [Restrict admin access](restrict-admin-access.md).
To list the screen in the sidebar, see [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
The reasoning behind the access map, the audit's site-wide configuration, and the media upload protocol each have a separate page, listed under [See also](#see-also).

## Before you begin

The steps assume a scaffolded site, an access-map rule for the screen, a D1 binding for the screen's data, and a D1 database for the audit trail:

- A site that `create-cairn-site` scaffolded, whose `cairn-audit.config.json` names both compiled admin sheets.
- An access-map rule for the screen's route, as [Restrict admin access](restrict-admin-access.md) describes.
- A D1 binding for the screen's data, as Cloudflare's [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/) describes.
- A D1 database for the audit trail, prepared as the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry describes.

The scaffold binds `APP_DB`.
Its `signups` table exists only after you apply the signups migration in the scaffold's `migrations-app` directory.
Cloudflare's [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) documentation describes how to apply a migration.

The setup command writes the admin layout's two files and the `[...path]` catch-all's two files into `src/routes/admin/`.
The `signups/` directory beside them is already a custom screen, so a new screen adds one more directory beside it.

```text
src/
├── hooks.server.ts
├── admin.css
└── routes/
    └── admin/
        ├── +layout.server.ts
        ├── +layout.svelte
        ├── [...path]/
        │   ├── +page.server.ts
        │   └── +page.svelte
        └── signups/
            ├── +page.server.ts
            └── +page.svelte
```

For a hand-built site, [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md) brings it to the same shape as a scaffolded site.

## Place the route

A route directory under `src/routes/admin/` is the whole registration, since SvelteKit resolves it ahead of the `[...path]` catch-all and the shared layout renders it inside `CairnAdminShell`.

To place the route, follow these steps:

1. In `src/routes/admin/`, create a directory named for the screen.
2. In that directory, create `+page.server.ts` for the load and the actions, and `+page.svelte` for the markup.

Every `/admin/**` route renders as the shell's children with its nav, user, and theme, so the screen needs no wrapper code.
The shell's favicon and sidebar brand mark are fixed to the cairn glyph and wordmark.
The only site identity the shell shows is `siteName`, in the page title and the topbar.

The site's root layout must render no visible chrome around `/admin`, since a header, a footer, or a width cap stops the shell from filling the viewport.
In dev, a check logs one console error when an ancestor of the shell caps its width, and it never throws or changes rendering.
To list the screen in the sidebar, see [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Gate it

The screen enforces the access map itself, with [`requireAccess`](../reference/sveltekit.md#requireaccess) in its `load` and an access-checking wrapper around every action.
[`createAuthGuard`](../reference/sveltekit.md#createauthguard) admits a session to the whole `/admin` subtree before any `load` runs and decides nothing per route.
The `requireAccess` call and every [`createSectionAction`](../reference/sveltekit.md#createsectionaction) wrapper share one fail-closed predicate, so a session the map does not admit is refused on the read and on the write.
A route the map has no rule for refuses every session, owner included.
The `createSectionAction` entry lists the checks the predicate runs, in order.
An action needs a separate check because SvelteKit dispatches a matched form action without re-running `load`.
A hand-rolled action that skips the check admits any signed-in session to the write and records nothing.

To gate the screen's read, follow this step:

- In the screen's `+page.server.ts`, call `requireAccess` in `load` before it reads anything.

The signups `load` calls `requireAccess` before it reads the `signups` table through `APP_DB`, and it fails closed with a 500 when the binding is absent.

```ts
// src/routes/admin/signups/+page.server.ts
import type { PageServerLoad, RequestEvent } from './$types';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';
import { error } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

interface SignupRow {
  id: number;
  name: string;
  email: string;
}

function requireAppDb(event: RequestEvent): D1Database {
  const db = event.platform?.env.APP_DB;
  if (!db) error(500, 'This screen is not configured.');
  return db;
}

export const load: PageServerLoad = async (event) => {
  requireAccess(event);
  const db = requireAppDb(event);
  const { results } = await db
    .prepare('SELECT id, name, email FROM signups ORDER BY id DESC')
    .all<SignupRow>();
  return { signups: results };
};
```

A route nested under the screen inherits the guard and never the screen's `requireAccess` rule.
A detail endpoint therefore calls `requireAccess` in its server file and takes a separate access-map entry, as the nested-route steps of [Load row detail on demand](#load-row-detail-on-demand) show.
An action gets its access check from a wrapper, chosen in [Choose the action wrapper](#choose-the-action-wrapper).

## Choose the action wrapper

A screen whose actions write through a database binding wraps them in `createSectionAction`, and a screen with no binding uses `createAdminAction` with its `access` option set.

To choose the wrapper, follow this step:

- In the screen's server file, import the wrapper that matches whether its actions write through a binding.

The following table compares the two wrappers' access checks, refusals, binding requirements, and refusal records.

| Behavior | `createSectionAction` | `createAdminAction` |
|---|---|---|
| Checks the access map | On every call | Only when the call sets the `access` option |
| Refuses a session | Returns `fail(403)` | Throws `error(403, ...)` |
| Needs a binding | Yes, through a required `resolveDb` | No |
| Records a refusal | Audited, and logged as `auth.access.refused` | Audited with action `deny` on entity `admin-action`, and logged as `auth.access.refused` with `access.target`, an access-map key and never a request path |

The `deniedMessage` option replaces `createSectionAction`'s 403 message, while `createAdminAction`'s message is fixed.
The signups screen writes through `APP_DB`, so the remaining steps use `createSectionAction`.

## Wrap the actions

One `createSectionAction` call builds the section's wrapper, and each form action passes its handler and its audited `action` and `entity` to that wrapper.
The call's `Env` type parameter describes the site's platform bindings, since the engine ships no `Env` type, and `resolveDb` receives `Env | undefined`.
The type parameter does not infer from an unannotated `resolveDb` parameter, so the site annotates that parameter or passes explicit type arguments.
The example site passes `App.Platform['env']`.

To wrap the actions, follow these steps:

1. In the screen's server file, build one wrapper with `createSectionAction`, passing a `resolveDb` that reads the section's binding.
2. In the exported form actions, wrap each handler in that wrapper, passing its `action` and `entity`.
3. On the destructive action, add `ownerOnly: true` to the options.

<!-- snippet-check-skip: reads App.Platform['env'], which only the site's app.d.ts declares -->
```ts
// src/routes/admin/signups/+page.server.ts, continued
import type { Actions } from './$types';
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';

const sectionAction = createSectionAction<App.Platform['env'], D1Database>({
  resolveDb: (env: App.Platform['env'] | undefined) => env?.APP_DB,
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
Underneath, the wrapper runs the editor identity, CSRF, and single form-read work of [`createAdminAction`](../reference/sveltekit.md#createadminaction), so a section never calls `createAdminAction` directly.
Every successful path through a handler must call `ctx.audit` before it returns.
[Resolve a missing audit record](#resolve-a-missing-audit-record) traces a record that never arrives.

## Wire the audit sink

The `ctx.audit` call persists a record only when `hooks.server.ts` sets an audit sink on `event.locals.cairnAuditSink`, composed with the auth guard through `sequence`.
The sink is typically [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) over a bound D1 database.
The file holds one `handle` export, which `sequence` builds from both handles.
The sink's handle only sets a `locals` field the route reads, so it needs nothing an earlier handle sets and works placed after `createAuthGuard`.

To wire the sink, follow these steps:

1. In `hooks.server.ts`, add a handle that sets `event.locals.cairnAuditSink`.
2. In the same file, compose that handle after `createAuthGuard` through `sequence`.

<!-- snippet-check-skip: reads App.Platform (env, ctx.waitUntil), which only the site's app.d.ts declares -->
```ts
// src/hooks.server.ts
import { createAuthGuard, createD1AuditSink } from '@glw907/cairn-cms/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { access } from './access.js';

const wireAuditSink: Handle = ({ event, resolve }) => {
  const db = event.platform?.env.AUDIT_DB;
  const ctx = event.platform?.ctx;
  const waitUntil = ctx ? ctx.waitUntil.bind(ctx) : undefined;
  if (db) event.locals.cairnAuditSink = createD1AuditSink(db, waitUntil);
  return resolve(event);
};

export const handle = sequence(createAuthGuard({ access }), wireAuditSink);
```

The snippet's `access` import is the access map that [Restrict admin access](restrict-admin-access.md) describes.
A scaffolded site declares it with `defineAccess` in `access.ts`, beside `hooks.server.ts`.

The handle binds `waitUntil` to its `ExecutionContext`, because the unbound method typechecks and then throws `Illegal invocation` in workerd, after which the row can be lost.
The sink returns before the insert settles and logs a rejected insert, so a failed insert never fails the audited action.

The wrapper writes an audit row for every refusal its own checks make, so a refused caller can fill a persisted audit table cheaply.
A section bounds that cost by setting the `rateLimit` option, whose members and fallback the [`createSectionAction`](../reference/sveltekit.md#createsectionaction) entry states.
The 429 the wrapper returns for an exceeded limit writes no row, and neither do the session and CSRF refusals underneath it.

## Compose the screen from the toolkit

The screen's markup composes the admin toolkit's primitives, the same set the engine's screens compose, in place of a hand-rolled table, list, or field.
The engine's `ManageEditors` screen builds from the toolkit's `PageHeader` and `AdminTable`.

To compose the markup, follow these steps:

1. In the screen's markup, import the primitives it needs from the admin toolkit.
2. In each form that posts to one of the screen's actions, mount a `CsrfField` from `@glw907/cairn-cms/admin`.

   Inside the admin shell, the field reads its token from context, so it takes no prop.
   The guard refuses a form without it with a 403.
   The signups screen mounts one in its `create` form and in its `remove` form.

A smaller screen shows the toolkit alone, as an Events list that composes three primitives with the table inside a card.
Each of the three primitives has one job:

- `PageHeader` holds the eyebrow, title, and meta band.
- `AdminTable` holds the table chrome around the caller's header and row markup.
- `StatusChip` renders a status chip.

```svelte
<script lang="ts">
  import { PageHeader, AdminTable, StatusChip } from '@glw907/cairn-cms/admin-toolkit';

  let { data }: { data: { events: { id: string; name: string; status: string }[] } } = $props();
</script>

<PageHeader eyebrow="Club" title="Events" meta={`${data.events.length} upcoming`} />

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

The wrapping `<div>` carries `overflow-hidden card-shell card-shadow` and never `overflow-x-auto`, because `AdminTable` sets its own horizontal scroll.

The toolkit admits general-purpose primitives only, and a component that renders one of cairn's content concepts, such as an `EditPage` field, does not belong in it.
A primitive graduates into the toolkit from a site's screens once it has a second real consumer, as `ExpandableRow` did.
Each primitive ships its compiled classes and scoped styles with the package, so a later release still renders it under the site's route with no change on the site's side.

The [admin toolkit](../reference/admin-toolkit.md) reference lists every export with its props, including the props that change a primitive's behavior.
The [admin components](../reference/admin.md) reference lists the engine's components a screen can mount beside the toolkit, with each one's props.

## Style the screen

The screen's utility classes compile only through the site admin sheet, `src/admin.css`, which a scaffolded site already builds.
The screen matches the admin's design by using stock daisyUI classes.
The sheet turns off automatic source detection, scans `./routes/admin` and `./lib/admin` through `@source`, and then imports `@glw907/cairn-cms/admin-sources.css`, as the [audit configuration](../reference/cairn-audit.md#configuration) reference describes.
The `build:admin-css` script compiles it to `.cairn/admin.css`, which `src/routes/admin/+layout.svelte` imports.
The scaffold's `predev`, `prebuild`, and `precheck` scripts run that compile, so a build needs no separate style sheet step.
The engine's packaged admin sheet scans only the engine's admin components and the toolkit, so the site's markup never feeds it.

To style the screen, follow these steps:

1. Under `src/routes/admin` or `src/lib/admin`, keep every file that holds the screen's markup.

   The admin is built in daisyUI and Tailwind, the idiom a custom screen extends.
   Every daisyUI component and utility class except calendar compiles into the admin sheet, so the screen uses any of them without a safelist entry.

2. In the screen's markup, give each rounded corner `rounded-selector`, `rounded-field`, or `rounded-box`, never a fixed Tailwind radius such as `rounded-lg`.

   A fixed radius still compiles in the admin sheet but does not follow the corner ladder.
   Both admin themes set daisyUI's radius tokens as a three-step ladder.
   `--radius-selector` covers chips and small markers, `--radius-field` covers controls, and `--radius-box` covers cards and dialogs.
   The ratified norms that `cairn-audit` measures follow the same ladder.
   They set 6px for buttons, inputs, and selects, 8px for a card, and 4px for a status chip.
   Their control height bands grow with `--size-field`.

A bare `btn` renders as a hairline button, and a selected `btn`, such as one with `.btn-active` or `aria-pressed="true"`, renders as the neutral selected segment.
For warning or success text, the screen uses `cairn-text-warning` and `cairn-text-success`, which the packaged admin sheet defines, since that sheet does not compile the bracketed `text-[var(--cairn-warning-ink)]` and `text-[var(--color-positive-ink)]` forms.

## Build the dialog form

When a screen collects input in a native `<dialog>` submitted with `enhance`, the form survives every result only when its callback handles each of the four result types.
SvelteKit's [form actions documentation](https://svelte.dev/docs/kit/form-actions#progressive-enhancement) states what the default `update()` does with each type.

To build the dialog form, follow these steps:

1. In the screen's markup, add a `<dialog class="modal">` whose `aria-labelledby` points at the dialog's heading.

   An element with the `dialog` role needs an accessible name, and the heading supplies one that does not depend on the body text.

2. In the handler of the button that opens the dialog, call `showModal()`.

   A dialog opened this way closes on Escape without script.

3. Inside the dialog, add the action form with `enhance` applied, as a separate form element and never inside a `<form method="dialog">`.

   A `<form method="dialog">` is a form element of its own, and nested forms are invalid HTML.

4. In the `enhance` callback, handle each of the four result types, and never call `update()` on `'error'`.

   The callback treats each result type as follows:

   - On `'failure'`, show the message in the dialog, then call `update()`, which for a same-page failure only updates `form` and the page status.
   - On `'error'`, report the error in the dialog without calling `update()`, because `update()` calls `applyAction`, which renders the nearest `+error` page and destroys the dialog.
   - On `'success'`, close the dialog before awaiting `update()`, so it never sits open through `invalidateAll()`.
   - On `'redirect'`, hand the result to `update()`.

5. In the form, mount an empty `role="alert"` paragraph for the failure message.

   A live region inserted with its text already present is announced unreliably, so the paragraph is mounted empty and filled on failure.

6. On the input, point `aria-describedby` at the alert paragraph.
7. On the same input, set `aria-invalid="true"` while its value is the failed one.

   The error is then read with its field when focus moves to the input.

8. On the submit button, set `disabled` while the request is pending, so it cannot fire the action a second time.

The following dialog adds a signup through the signups screen's create action.

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
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

## Load row detail on demand

When a screen's rows expand to show detail, the screen fetches each row's detail as its panel opens and caches it per row.
A `load` that fetched every row's detail would pay for all of them on every visit.
Streaming an unawaited promise from `load` does not save that work, because the promise starts running when `load` creates it.

To load row detail on demand, follow these steps:

1. Under the screen's directory, add the detail endpoint as a nested route that returns one row's detail as JSON.
2. In that route's server file, call `requireAccess`.

   The nested route needs this call because the screen's `requireAccess` rule does not reach it.

3. In the site's access map, add an entry for the nested route, as [Restrict admin access](restrict-admin-access.md) describes.
4. In the screen's markup, render each row as an [`ExpandableRow`](../reference/admin-toolkit.md#expandablerow) inside the `AdminTable`.

   The rows follow three markup rules:

   - The `colspan` the caller passes counts the trailing trigger cell the component adds, since the panel's one `<td>` spans it.
   - The `header` snippet heads that trigger cell with a `<th scope="col">` holding an `sr-only` span, as the signups table does for its actions column.
   - An interactive summary cell wraps its content in an element with `data-cairn-inert-cell`, since `ExpandableRow` ignores a row click inside it. The cell needs no `stopPropagation()`.

5. In the same file, write an open handler for the rows.
6. On each `ExpandableRow`, connect the open handler as the `ExpandableRow` entry's example shows.
7. In the open handler, return the cached detail when the row already has one.

   Fetching on open and caching per row costs only the rows a reader opens.

8. Otherwise, in the same handler, call `fetch` for the row's detail inside a `try` block.
9. Inside the `try` block, check `response.ok`, since `fetch` resolves on an HTTP error status.
10. In the same block, parse the body with `Response.json()`, which rejects on a body that is not JSON.
11. In the same block, cache the detail only after the status check and the parse both succeed, so a failed row stays retryable.
12. In the row's panel snippet, render the cached detail.

    The panel snippet receives the row's `datum`, so it reaches the row's detail without a closure over the row.

The following handler is an illustrative version of the cache and fetch steps, with the detail endpoint's URL passed in.

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

## Animate the screen

When a screen animates, `cairn-audit` holds its motion to the same rules as the engine's screens, so each transition names its duration and easing with the admin's motion tokens.

To animate the screen, follow this step:

- In the screen's markup or scoped `<style>` block, write each duration and easing as a `var()` of a motion token, such as `var(--cairn-dur-base)`.

Both admin theme roots declare the tokens as a closed set of five durations, from `--cairn-dur-instant` to `--cairn-dur-settle`, and three curves, `--cairn-ease-standard`, `--cairn-ease-entrance`, and `--cairn-ease-exit`.
A bare `transition-*` utility already animates on `--cairn-dur-base` and `--cairn-ease-standard`, which both roots set as Tailwind's default duration and timing function.
Under `prefers-reduced-motion: reduce`, the admin collapses every duration to `0.01ms`, and only a paint transition may opt back in.

The audit's three admin-only motion rules, `motion-property`, `motion-vocabulary`, and `motion-hover-gate`, read a component's scoped `<style>` block and what each class in its markup compiles to.
They read only the components under `static.adminScope` and the `static.cssFiles` entries inside those roots.
The `static.adminScope` key defaults to `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit`, and a site whose screens live elsewhere names their roots under that key, as the [audit configuration](../reference/cairn-audit.md#configuration) reference describes.
For what each rule checks, see [The static rules](../reference/cairn-audit.md#the-static-rules).
For the exemptions and the frame-offset allowance, see [What the motion rules don't cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover).

## Verify the screen

The screen passes when it renders inside the shell, refuses a session the map does not admit, leaves an audit row for each write, and clears the error tier of `cairn-audit`.

To verify the screen, follow these steps:

1. In a browser signed in as an owner, open the screen under `/admin`.

   The screen renders as the children of `CairnAdminShell`, with the shell's nav, user, and theme.
   A 403 here means the access map has no rule for the route.
   [Restrict admin access](restrict-admin-access.md) describes how to declare the rule.

2. In a browser signed in as an editor whose role the screen's rule does not name, open the screen again.

   The `requireAccess` call refuses the session with a 403.

3. In a browser signed in as an owner, submit one of the screen's actions.
4. In the audit database, query the `audit_log` table for its newest row.

   Each row records the `actor`, `action`, `entity`, `entity_id`, and `detail` of one audited action, with an ISO 8601 timestamp.
   The row's `action` and `entity` match the wrapper's options, unless the handler's `ctx.audit` call passes either.

5. In the site directory, run `npm run check:cairn`.

   The script compiles the site admin sheet, then runs `cairn-audit` over the whole static registry.

6. In the report, fix each unsuppressed error-tier finding, since only such a finding makes `cairn-audit` exit 1.
7. In the site directory, run the script again until no error-tier finding remains.

The default scan scope names `src/routes/admin` beside the engine's admin sources, so a custom screen meets the same static rules as the engine's screens.
The scaffold's CI runs the same script on every push and pull request.
An advisory finding prints without changing the exit code, as [Tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes) describes.
A bare run is static, and the `--rendered` flag drives a browser against an already-running server.
[Run cairn-audit on your site](run-cairn-audit-on-your-site.md) sets up a rendered run for a custom screen, and the reference lists the [rules a rendered run adds](../reference/cairn-audit.md#the-rules).

## Resolve a missing audit record

A missing audit record means a handler skipped `ctx.audit`, no handle set the sink, or the sink's insert failed.
In production, a skipped call logs `admin.action.unaudited` where dev throws `UnauditedActionError`, since an error response mid-request would be worse than a gap in the audit trail.

To find the cause, follow these steps:

1. In the action's handler, check that every successful path calls `ctx.audit` before it returns.
2. In `hooks.server.ts`, check that a handle sets `event.locals.cairnAuditSink`.
3. In the logs, look for `audit.sink.write_failed`, whose reason `wait_until_failed` names an unbound `waitUntil`.

[Debug your site](debug-your-site.md) maps `admin.action.unaudited` to its cause, and the [log events](../reference/log-events.md) reference lists both events' fields and the `audit.sink.write_failed` reasons.

## See also

The following pages cover the tasks and reasoning around a custom screen:

- [Restrict admin access](restrict-admin-access.md) describes how to declare the access-map rule each screen and nested route needs.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) describes how to add the screen to the admin's navigation.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) describes how to configure the audit for the whole site, including rendered runs, suppressions, and allowlists.
- [Security model](security-model.md) sets out the reasoning behind the access map.
- [Configure media](configure-media.md) describes how to set up media storage and the media upload protocol.
- [Define an adapter and schema](define-an-adapter-and-schema.md) describes how to declare a content concept, the alternative to a screen for markdown content.
- [The admin toolkit](../reference/admin-toolkit.md) reference documents each primitive's props.
