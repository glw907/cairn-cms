# Add a custom admin screen

Add a screen under `/admin` that renders inside the admin shell, enforces the access map, records each write in the audit trail, and passes `cairn-audit`.

A custom admin screen is a SvelteKit route under `src/routes/admin/` that renders inside [`CairnAdminShell`](../reference/admin.md#cairnadminshell), behind the same sign-in guard as the engine's screens. A site adds one to manage data it keeps outside its markdown content, such as the rows of a `signups` table that editors read and change in the admin. Building one takes fluency with SvelteKit's form actions and server hooks.

The worked example is the signups screen in `examples/showcase`, the repository's example site, from its route through its actions and their audit calls.

To change who reaches an existing admin screen without adding one, see [Restrict admin access](restrict-admin-access.md) instead. Listing the screen in the sidebar and configuring the audit for the whole site are separate tasks, which [Arrange the admin sidebar](arrange-the-admin-sidebar.md) and [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) cover.

## Before you begin

The steps assume the following:

- A site that `create-cairn-site` scaffolded, with its `cairn-audit.config.json` file. For a hand-built site, see [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- An access map rule for the screen's route, as [Restrict admin access](restrict-admin-access.md) describes. Without one, every session gets a 403, owner included.
- A D1 binding for the screen's data in the site's platform env, as Cloudflare's [D1 Workers Binding API](https://developers.cloudflare.com/d1/worker-api/) describes.
- A D1 database for the audit trail, prepared as the [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink) entry describes.

The setup command writes the admin layout, the `[...path]` catch-all, and a `signups/` directory in its `admin/` route directory. `signups/` is itself a custom screen beside the catch-all, and a new screen adds one more directory beside it.

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

## Place the route

A route file under `src/routes/admin/` wins over the `[...path]` catch-all, because SvelteKit resolves the more specific route first. Every `/admin/**` route renders as `CairnAdminShell`'s children through the shared layout, so the screen gets the shell's nav, user, and theme with no registration. The shell's favicon and sidebar brand mark are fixed to the cairn glyph and wordmark. The only site identity it shows is `siteName`, in the page title and the topbar.

To place the route, follow these steps:

1. In `src/routes/admin/`, create a directory named for the screen.
2. In that directory, create `+page.server.ts` for the load and the actions, and `+page.svelte` for the markup.

The site's root layout must render no visible chrome around `/admin`, since a header, a footer, or a width cap stops the shell from filling the viewport. In dev, a check logs one console error when an ancestor of the shell caps its width, and it never throws or changes rendering. To list the screen in the sidebar, see [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Gate the screen's reads and writes

A custom screen enforces the site's access map by calling [`requireAccess`](../reference/sveltekit.md#requireaccess) in its `load` and by checking the same map in every form action. [`createAuthGuard`](../reference/sveltekit.md#createauthguard) gates the whole `/admin` subtree before any load runs, but it decides nothing per route. `requireAccess` and [`createSectionAction`](../reference/sveltekit.md#createsectionaction) share one fail-closed predicate, so a session the access map doesn't admit is refused on the read and on the write.

To gate the screen, follow these steps:

1. In the screen's `+page.server.ts`, call `requireAccess` in `load` before it reads anything.
2. For each route nested under the screen, such as a detail endpoint, add a separate `requireAccess` call and access-map entry.
3. In the same server file, wrap every form action in a wrapper that checks the access map, as [Choose an action wrapper](#choose-an-action-wrapper) describes.

The signups `load` calls `requireAccess` before it reads anything.

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

A route nested under the screen, such as a detail endpoint, inherits the guard but not the screen's `requireAccess` rule.

An action needs a separate check, because SvelteKit dispatches a matched form action without re-running `load`. A hand-rolled action that skips the check admits any signed-in session to the write and records nothing. `createSectionAction` runs that check through three ordered gates, and the first gate that fails refuses the call.

1. The wrapper refuses a target with no rule.
2. The wrapper refuses a session whose role the rule doesn't name, unless the session is an owner's.
3. The wrapper refuses a non-owner session when the action sets `ownerOnly`.

A refused action returns `fail(403)` with `You do not have access to this action.`, which names no gate. The `deniedMessage` option replaces that message.

## Choose an action wrapper

Choose the wrapper by whether the screen's actions write through a database binding:

- A screen whose actions write through a binding uses `createSectionAction`, which requires a `resolveDb` binding resolver.
- A screen with no binding uses `createAdminAction`.

The choice also decides when an action meets the access map and how it refuses a session. The following table compares the two wrappers.

| Behavior | `createSectionAction` | `createAdminAction` |
|---|---|---|
| Checks the access map | On every call | Only when the call sets the `access` option |
| Refuses a session | Returns `fail(403)` | Throws `error(403, ...)` |
| Refusal message | Replaced by the `deniedMessage` option | Fixed |
| Access-map target | `target`, which defaults to the route id with route-group segments dropped | `access.target`, which is required and names an access-map key, never a request `pathname` |
| Refusal record | An audit entry, logged as `auth.access.refused` | An audit entry with the action `deny` and the entity `admin-action`, logged as `auth.access.refused` |
| Database binding | Required, through `resolveDb` | None |

With the `access` option omitted, `createAdminAction` runs no access-map check. The signups screen writes through `APP_DB`, so the remaining steps use `createSectionAction`.

## Wrap the actions

`createSectionAction<Env, Db>({ resolveDb })` builds one reusable wrapper per section, and `resolveDb` reads the section's binding from the site's platform env. `Env` is a type parameter for the site's platform bindings, since the engine ships no `Env` type. `resolveDb` receives `Env | undefined`. `Env` doesn't infer from an unannotated `resolveDb` parameter, so reads off `env` stop typechecking unless the site annotates it or passes explicit type arguments. The example site passes `App.Platform['env']`.

To wrap the actions, follow these steps:

1. In the screen's server file, build one wrapper with `createSectionAction`, passing a `resolveDb` that reads the section's binding.
2. In the exported form actions, wrap each handler in that wrapper, passing its audited `action` and `entity`.

<!-- snippet-check-skip: reads App.Platform['env'], which only the site's app.d.ts declares -->
```ts
// src/routes/admin/signups/+page.server.ts, continued
import type { Actions } from './$types';
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';
import { fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

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

Each handler receives `{ form, ctx }`, writes through `ctx.db`, and calls `ctx.audit` with a `detail` or an `entityId`. The destructive `remove` adds `ownerOnly: true` to its second argument. Underneath, `createSectionAction` runs the editor identity, CSRF, and single form-read work of [`createAdminAction`](../reference/sveltekit.md#createadminaction), so a section never calls `createAdminAction` directly.

The wrapper requires an audit entry from every successful action, and it records one for each access-map, owner, or binding refusal it makes. The rate-limit refusal returns `fail(429)` with no `ctx.audit` call, so it leaves no audit entry. The session and CSRF refusals that `createAdminAction` makes underneath redirect or throw before any audit call, so they leave none either. A successful action that returns without calling `ctx.audit` throws `UnauditedActionError` in dev and logs `admin.action.unaudited` at error in production.

### Rate-limit the section

A rate limit is optional. A section sets one through the `rateLimit` option, and the limit runs before the access-map checks. Because the wrapper records each refusal it makes, a limit keeps a refused caller from filling a persisted audit table cheaply.

To rate-limit the section, follow this step:

- In the section wrapper's options, set `rateLimit` to an object with `resolve`, `key`, and an optional `message`, as [`SectionActionConfig`](../reference/sveltekit.md#sectionactionconfig) describes.

An unresolved binding, or a `key()` or `limit()` call that throws, degrades to open and logs, except a SvelteKit `redirect()` or `error()`, which propagates.

## Wire the audit sink

`ctx.audit` needs an `AdminActionAuditSink` on `event.locals.cairnAuditSink`, set in `hooks.server.ts`, typically through `createD1AuditSink` over a bound D1 database. The file holds one `handle` export, so the sink's handle composes with the auth guard through `sequence()`, which runs them in order. The sink's handle only sets a `locals` field the route reads, so it needs nothing an earlier handle sets and works placed after `createAuthGuard`.

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

The handle binds `waitUntil` to its `ExecutionContext`, because the unbound method typechecks and then throws `Illegal invocation` in workerd, and the insert can be lost. The sink returns before the insert settles, and it logs a rejected insert, so a failed insert never fails the audited action.

## Compose the screen from the toolkit

A screen's markup composes the [admin toolkit](../reference/admin-toolkit.md), a set of general-purpose primitives, in place of a hand-rolled list, table, or field. The engine's admin screens compose it too, and `ManageEditors`, for one, builds from the toolkit's `PageHeader` and `AdminTable`. Each primitive has one job, such as `PageHeader` for the eyebrow, title, and meta band, or `AdminTable` for the table chrome around the caller's rows. The toolkit's reference entry lists every export, `Tooltip` and the `format.js` helpers included.

Each primitive ships its compiled classes and scoped styles with the package, so a later release still renders it under a site's route with no change on the site's side. A component tied to one site's data stays in the site's `src/lib/admin/`, since the toolkit admits general-purpose primitives only.

The following minimal screen, separate from the signups example, composes three primitives, with the table inside a card.

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

`AdminTable` scrolls horizontally by itself, so the wrapping `<div>` carries `overflow-hidden card-shell card-shadow` and never `overflow-x-auto`.

### Mount an engine admin component

A screen can also mount the engine's admin components beside the toolkit and set their props. `CairnAdminShell`'s [`themeOverride`](../reference/admin.md#cairnadminshell), for one, pins the admin theme and removes the theme toggle. The [admin components](../reference/admin.md) reference lists each component's props.

## Style the screen

The admin uses daisyUI and Tailwind, and a custom screen extends it in the same idiom. A screen's utility classes compile only through the site admin sheet, `src/admin.css`, and only when the screen's file sits under a root that sheet scans. Every daisyUI component and utility class except calendar compiles into the packaged admin sheet, so a screen can use any of them without a safelist entry.

Both admin themes set a three-step corner ladder on daisyUI's radius tokens, which the [container roles](../reference/admin-grammar-tokens.md#container-roles) section of the admin grammar tokens entry lists. A fixed Tailwind radius such as `rounded-lg` still compiles but doesn't follow the ladder, so markup that should follow it uses a ladder class such as `rounded-box`.

A bare `btn`, with no color, style, selected, or disabled form, renders as an outlined button on the base fill. A selected `btn`, such as one with `.btn-active` or `aria-pressed="true"`, renders with a neutral background, a thin border, and weight 600 text.

For warning or success text, a screen uses `cairn-text-warning` and `cairn-text-success`, which the packaged admin sheet defines with a light-theme fallback. That sheet doesn't compile the bracketed `text-[var(--cairn-warning-ink)]` and `text-[var(--color-positive-ink)]` forms.

A scaffolded site already carries the build that compiles the site admin sheet. The sheet turns off automatic source detection, scans `./routes/admin` and `./lib/admin` through `@source`, and then imports `@glw907/cairn-cms/admin-sources.css`. That import holds only the `@source` directives for the engine's shipped admin markup. The `build:admin-css` script compiles the sheet to `.cairn/admin.css`, which `src/routes/admin/+layout.svelte` imports. The scaffold's `predev`, `prebuild`, and `precheck` scripts run that compile, so a build needs no separate style sheet step.

The engine's packaged admin sheet scans only the engine's admin components and the toolkit, so a site's route markup never feeds that build. The scaffold's `cairn-audit.config.json` names both compiled sheets, so the static checks see every class a site's admin route writes.

## Build a dialog form

When a screen collects input in a native `<dialog>` submitted with `enhance`, the dialog stays intact only when the callback handles each result type. `enhance` hands the callback one of four result types, and SvelteKit's [form actions documentation](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement) describes what the default `update()` does with each. The dialog opens with `showModal()`, which lets Escape close it. The action form never nests inside a `<form method="dialog">`, since nested forms are invalid HTML.

To keep the dialog intact, handle each result type in the callback as follows.

- On `'failure'`, show the message in the dialog, then call `update()`, which for a same-page failure only updates `form` and the page status.
- On `'error'`, report the error in the dialog without calling `update()`, whose `applyAction` would render the nearest `+error` page and destroy the dialog.
- On `'success'`, close the dialog before awaiting `update()`, so it never sits open through `invalidateAll()`.
- On `'redirect'`, hand the result to `update()`.

The callback can leave `reset` unset when the dialog closes anyway, since `reset` applies only on `'success'`.

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

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

<dialog bind:this={dialog} class="modal" aria-labelledby="signup-dialog-title">
  <div class="modal-box">
    <h2 id="signup-dialog-title">Add a signup</h2>
    <form method="POST" action="?/create" use:enhance={onSubmit}>
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

The dialog's markup carries the following attributes.

- The `<dialog>` takes `aria-labelledby` pointing at its heading, so its accessible name doesn't depend on its body text.
- The failure message renders into a `role="alert"` paragraph mounted empty, since a live region inserted with its text already present is announced unreliably.
- The input's `aria-describedby` names that paragraph, and `aria-invalid="true"` marks the failed value.
- The submit button is disabled while the request is pending, so it can't fire the action a second time.

## Load row detail on demand

When a screen's rows expand to show detail, the screen fetches each row's detail as its panel opens and caches it per row. A list `load` that fetched every row's detail would pay for all of them on every visit. Streaming an unawaited promise from `load` doesn't save that cost, because the promise starts running when `load` creates it.

`ExpandableRow` renders the caller's summary cells plus one trailing trigger cell, and the `colspan` the caller passes must count that trigger cell. The `header` snippet heads the trigger cell with a `<th scope="col">` holding an `sr-only` span, as the signups table does for its actions column. An interactive summary cell wraps its content in `data-cairn-inert-cell`, since `ExpandableRow` ignores a row click inside that attribute.

To fetch a row's detail when its panel opens, follow these steps:

1. Under the screen's directory, add the detail endpoint as a nested route with a separate `requireAccess` call and access-map entry.
2. In the panel's open handler, return the cached detail when the row already has one.
3. Otherwise, call `fetch` for the row's detail inside a `try` block.
4. Inside the `try` block, check `response.ok`, since `fetch` resolves on an HTTP error status.
5. In the same block, parse the body with `Response.json()`, which rejects on a body that isn't JSON.
6. Cache the detail only after the status check and the parse both succeed, so a failed row stays retryable.

The following handler follows those steps, with the detail endpoint's URL passed in.

```ts
const details = new Map<number, unknown>();

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

When a screen animates, it uses the admin's motion tokens, and `cairn-audit` holds that motion to the same error-tier rules as the engine's screens.

Both admin theme roots declare five duration tokens, from `--cairn-dur-instant` at `70ms` to `--cairn-dur-settle` at `400ms`, and three curves. The curves are `--cairn-ease-standard`, `--cairn-ease-entrance`, and `--cairn-ease-exit`. Both theme roots repoint Tailwind's default transition duration at `--cairn-dur-base` and its default timing function at `--cairn-ease-standard`, so a bare `transition-*` utility animates on those.

The admin's blanket `prefers-reduced-motion: reduce` rule sets every animation and transition duration to `0.01ms !important`. A paint transition on `opacity`, a color, `box-shadow`, or `outline-*` may opt back in by restating it inside the same guard with `!important`. Transform, `grid-template-rows`, and frame-offset motion stay at `0.01ms` with no opt-back-in.

The following three admin-only error-tier rules hold a screen's motion to those tokens and to a closed set of properties:

- `motion-property` lets a `transition` name only thirteen properties, such as `opacity`, `transform`, and `grid-template-rows`, and fails a layout property such as `width`.
- `motion-vocabulary` fails a literal duration or easing that isn't written as a `--cairn-dur-*` or `--cairn-ease-*` `var()`.
- `motion-hover-gate` fails a hand-authored `:hover` rule that declares motion outside `@media (hover: hover)`, and it exempts a Tailwind `hover:` utility.

The rules check a component's scoped `<style>` block and what each class in its markup compiles to. The three rules read only the components under `static.adminScope` and the `static.cssFiles` entries inside those roots. `static.adminScope` defaults to `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit`. A site whose admin screens live elsewhere names their roots under that key, as the [audit configuration](../reference/cairn-audit.md#configuration) describes.

For each rule's full check, see [the static rules](../reference/cairn-audit.md#the-static-rules). For the frame-offset allowance and the daisyUI classes the rules exempt, see [What the motion rules don't cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover).

## Verify the screen

To verify the screen, follow these steps:

1. In a browser, signed in as an owner, open the screen under `/admin`.

   The screen renders as `CairnAdminShell`'s children, with the shell's nav, user, and theme.

2. Signed in as an editor whose role the screen's rule doesn't name, open the screen again.

   The `requireAccess` call refuses the session with a 403.

3. Signed in as an owner, submit one of the screen's actions.
4. In the audit database, query the `audit_log` table for its newest row.

   The row's `action` and `entity` match that action's wrapper options, unless its `ctx.audit` call overrides them.

5. In the site directory, run `npm run check:cairn`.

   The script compiles the site admin sheet with `build:admin-css`, then runs `cairn-audit` over the whole static registry.

6. In the report, fix each unsuppressed error-tier finding, since only such a finding makes `cairn-audit` exit 1.
7. Run the script again until no error-tier finding remains.

The packaged `cairn-audit` bin's default scan scope names `src/routes/admin` beside the engine's admin sources, so a custom screen meets the same static rules as the engine's screens. An advisory finding prints without changing the exit code. For both tiers, see [tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes).

A bare run is static, and `--rendered` drives a browser against an already-running server. [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) sets up a rendered run for a custom screen. A rendered run also adds the advisory `motion-reduced-delay` rule, which flags a transition or animation delay above zero under reduced motion. In a rendered run, the radius bands are 6px for buttons, inputs, and selects, 8px for a card, and 4px for a status chip, and the control height bands follow `--size-field`.

## Resolve a missing audit record

A missing audit record means a handler skipped `ctx.audit` or no handle set the sink. A record also goes missing when the sink's insert fails. Production logs `admin.action.unaudited` for a skipped call instead of throwing `UnauditedActionError` as dev does, since an error response mid-request would be worse than a gap in the audit trail.

To find why an audit record is missing, follow these steps:

1. In the action's handler, check that every successful path calls `ctx.audit` before it returns.
2. In `hooks.server.ts`, check that a handle sets `event.locals.cairnAuditSink`.
3. In the logs, look for `audit.sink.write_failed`, whose reason `wait_until_failed` names a `waitUntil` that threw, such as an unbound one.

[Debug your site](debug-your-site.md) maps both events to their causes, and the [log events](../reference/log-events.md) reference lists their fields.

## See also

The following pages cover the tasks and reasoning around a custom screen:

- [Restrict admin access](restrict-admin-access.md) declares the access-map rule each screen and nested route needs.
- [Arrange the admin sidebar](arrange-the-admin-sidebar.md) adds the screen to the admin's navigation.
- [Run cairn-audit on your site](run-cairn-audit-on-your-site.md) configures the audit for the whole site, including rendered runs, suppressions, and allowlists.
- [Security model](security-model.md) sets out the reasoning behind the access map.
- [Admin toolkit](../reference/admin-toolkit.md) documents each primitive's props.
