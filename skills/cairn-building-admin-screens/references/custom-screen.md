# A custom admin screen

## Contents

- [Build it](#build-it)
- [The server file](#the-server-file)
- [The page](#the-page)
- [Choose the wrapper](#choose-the-wrapper)
- [Wire the audit sink](#wire-the-audit-sink)
- [A dialog form](#a-dialog-form)
- [Row detail on demand](#row-detail-on-demand)
- [A fetch-style action](#a-fetch-style-action)
- [Verify and fix](#verify-and-fix)

A screen is a route under `src/routes/admin/` that the shared admin layout renders inside
`CairnAdminShell`. The guard signs a session in for the whole subtree and decides nothing per
route, so the screen gates its own reads and writes.

## Build it

1. Create `src/routes/admin/<name>/+page.server.ts` and `+page.svelte`. A concrete route beats
   the engine's `[...path]` catch-all with no registration. Never take a path a built-in view
   owns: `login`, `auth`, `editors`, `nav`, `media`, `settings`, `vocabulary`, `help`, or a
   concept id.
2. Add a rule for the route to the adapter's `access` map, for example
   `'/admin/<name>': ['editor']`. The owner reaches every ruled route, so a rule never needs to
   name `owner`. **With no rule, or no `access` member at all, `requireAccess` refuses every
   session, the owner included.** Keys, roles, and nested routes: `references/sidebar-and-access.md`.
3. In `load`, call `requireAccess(event)` before anything reads data.
4. Wrap every form action. SvelteKit runs a matched action without running `load`, so the load's
   gate never covers a POST. Use one `createSectionAction` wrapper per file; put `ownerOnly: true`
   on a destructive action.
5. In each handler, call `ctx.audit` on every path that succeeds, before it returns. A path that
   returns `fail()` owes no record. A success with no record throws `UnauditedActionError` (500)
   in dev and logs `admin.action.unaudited` in production.
6. Mount `<CsrfField />` from `@glw907/cairn-cms/admin` inside every `<form>` that posts to an
   action. Inside the shell it reads the token itself. Without it the guard answers 403 and logs
   `guard.refused` with `reason: csrf`.
7. Compose the markup from `@glw907/cairn-cms/admin-toolkit` (`PageHeader`, `AdminTable`,
   `StatusChip`, and the rest) rather than a hand-rolled table or chip.
8. Wire an audit sink if none is wired yet, then run the done-gate in `../SKILL.md`.

A route nested under the screen inherits the sign-in guard but not the screen's
`requireAccess` call; it calls `requireAccess` itself.

## The server file

The load resolves its binding itself, since `createSectionAction` wraps actions only.
`createSectionAction` does not infer `Env` from an unannotated `resolveDb` parameter: annotate
it `Env | undefined` or pass the type arguments, or a binding read fails to typecheck.

<!-- snippet-check-skip: imports cloudflare:workers, which only a site's Worker types declare; the actions half below compiles -->
```ts
// src/routes/admin/items/+page.server.ts, the load
import type { PageServerLoad } from './$types';
import { env } from 'cloudflare:workers';
import { error } from '@sveltejs/kit';
import { requireAccess } from '@glw907/cairn-cms/sveltekit';

export const load: PageServerLoad = async (event) => {
  requireAccess(event);
  const db = env.APP_DB;
  if (!db) error(500, 'This screen is not configured.');
  const { results } = await db
    .prepare('SELECT id, name FROM items ORDER BY id DESC')
    .all<{ id: number; name: string }>();
  return { items: results };
};
```

```ts
// src/routes/admin/items/+page.server.ts, the actions
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { createSectionAction } from '@glw907/cairn-cms/sveltekit';

// A site that runs `wrangler types` uses its generated Env instead of this one.
interface Env {
  APP_DB?: D1Database;
}

const sectionAction = createSectionAction<Env, D1Database>({
  resolveDb: (workerEnv: Env | undefined) => workerEnv?.APP_DB,
});

export const actions: Actions = {
  remove: sectionAction(
    async ({ form, ctx }) => {
      const id = Number(form.get('id'));
      if (!Number.isInteger(id)) return fail(400, { error: 'missing' });
      await ctx.db.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
      ctx.audit({ entityId: id });
      return { removed: true };
    },
    { action: 'remove', entity: 'item', ownerOnly: true },
  ),
};
```

`ctx.audit` takes `action` and `entity` from the options unless the call passes them. A
wrapper refusal returns `fail(403, { error })` (500 for a missing binding), one message that
names no gate, so the page reads `form.error` for it.

## The page

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/admin';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<PageHeader title="Items" />

<p role="status" aria-live="polite" class="type-body">{form?.error ?? ''}</p>

<div class="overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" rowCount={data.items.length}>
    {#snippet header()}
      <th scope="col">Name</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    {/snippet}
    {#snippet children()}
      {#each data.items as item (item.id)}
        <tr>
          <td>{item.name}</td>
          <td>
            <form method="POST" action="?/remove" use:enhance>
              <CsrfField />
              <input type="hidden" name="id" value={item.id} />
              <button class="btn btn-ghost btn-xs" aria-label={`Delete ${item.name}`}>Delete</button>
            </form>
          </td>
        </tr>
      {/each}
    {/snippet}
  </AdminTable>
</div>
```

`AdminTable` owns the horizontal scroll, so the wrapping card carries `overflow-hidden` and never
`overflow-x-auto`. Keep the status region mounted empty so a screen reader announces the change.
A destructive verb usually opens a confirm dialog; `references/exemplar-list.md` shows the shared
confirm.

## Choose the wrapper

| | `createSectionAction` | `createAdminAction` |
|---|---|---|
| Use when | the action writes through a binding (`resolveDb`) | the action has no binding: sends mail, calls a service |
| Access map check | every call, fail-closed | only with the `access: { target, ownerOnly? }` option |
| Refusal | `fail(403)`, `deniedMessage` overrides the copy | throws `error(403)` |

Without `access`, `createAdminAction` authenticates and checks CSRF but authorizes nothing: a
`none`-capability session reaches the handler. Both wrappers audit a map refusal and log
`auth.access.refused`; a session or CSRF refusal leaves no audit record. A screen using
`createSectionAction` never calls `createAdminAction` itself. Set `rateLimit` on
`createSectionAction` once a persisted sink is wired, since every refusal writes a row.

## Wire the audit sink

`ctx.audit` persists only when a handle sets `event.locals.cairnAuditSink`. The scaffold wires
none, and the dev backend never does.

1. Copy `node_modules/@glw907/cairn-cms/migrations/0002_audit.sql` into the migrations directory
   of the D1 database the sink writes to, and apply it with `npx wrangler d1 migrations apply`.
2. In `src/hooks.server.ts`, add a handle that sets the sink, and compose it after the guard in
   the production branch: `handle = sequence(createAuthGuard({ runtime }), wireAuditSink)`.

<!-- snippet-check-skip: an excerpt of the scaffold's hooks module; reads env.AUDIT_DB, which only the site's generated Env declares -->
```ts
import { building } from '$app/env';
import { env, waitUntil } from 'cloudflare:workers';
import { createD1AuditSink } from '@glw907/cairn-cms/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';

const wireAuditSink: Handle = ({ event, resolve }) => {
  if (!building && env.AUDIT_DB) {
    event.locals.cairnAuditSink = createD1AuditSink(env.AUDIT_DB, waitUntil);
  }
  return resolve(event);
};
```

Guard the env read with `building`: a `cloudflare:workers` env read throws during prerender.
Pass the exported `waitUntil` as is; an `ExecutionContext` method needs `.bind(ctx)`, or the
insert drops and logs `audit.sink.write_failed` with `reason: wait_until_failed`. The sink is
fail-open: a failed insert never fails the action.

## A dialog form

A form in a native `<dialog>` submitted with `use:enhance` survives every result only when its
callback handles all four result types. On `'error'`, the default `update()` renders the error
page and destroys the dialog, so never call it there.

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
      } else {
        if (result.type === 'success') dialog?.close();
        await update();
      }
    };
  };
</script>

<button class="btn" onclick={() => dialog?.showModal()}>Add an item</button>

<dialog bind:this={dialog} class="modal" aria-labelledby="item-dialog-title">
  <div class="modal-box">
    <h2 id="item-dialog-title">Add an item</h2>
    <form method="POST" action="?/create" use:enhance={onSubmit}>
      <CsrfField />
      <label for="item-name">Name</label>
      <input
        id="item-name"
        name="name"
        class="input"
        aria-describedby="item-error"
        aria-invalid={message ? 'true' : undefined}
      />
      <p id="item-error" role="alert">{message}</p>
      <button class="btn btn-primary" disabled={pending}>Add</button>
    </form>
  </div>
</dialog>
```

Open with `showModal()` (Escape closes it with no script). The action form is its own element,
never inside a `<form method="dialog">`, since forms never nest. Mount the `role="alert"`
paragraph empty so the failure is announced.

## Row detail on demand

Fetch a row's detail when its panel opens, not in the list `load`, which reruns on every visit.

1. Add the detail endpoint as a nested route that returns JSON, and call `requireAccess` in it.
   The screen's key covers it, unless the route's next segment is a parameter (`[id]`) and the
   map also holds a deeper key under the screen: then it resolves to no rule and refuses every
   session until you pass the governing key as `requireAccess`'s second argument.
2. Render each row as an `ExpandableRow` inside `AdminTable`. It holds no expand state: keep the
   open row's id in state and pass `expanded` and `onToggle`. Its `colspan` counts the trailing
   trigger cell; add a `<th scope="col">` for that cell with its text in an `sr-only` span.
3. Wrap an interactive summary cell's content in an element carrying `data-cairn-inert-cell` so a
   click inside it does not toggle the row.
4. Cache only a successful parse: check `response.ok` and call `response.json()` inside `try`, so
   a failed fetch caches nothing and the next open retries.

## A fetch-style action

A client that posts to an admin action with `fetch` instead of a form meets two constraints.
SvelteKit answers 415 to a form-action POST whose content type is not a form type, so label a raw
body `text/plain` and sniff the bytes on the server. Send CSRF as an `X-Cairn-CSRF` header, which
the guard clears without cloning the body; the token is `data.shell.csrf` in the page's data. The
response is SvelteKit's action envelope (`{ type, status, data }`) at the `fail()` status, so
read the envelope whatever the status. The engine's media upload client,
`node_modules/@glw907/cairn-cms/dist/admin/client-ingest.js` (`buildUploadRequest`), is the
working example; it is internal, so copy the shape rather than importing it.

## Verify and fix

Check refusals and audit rows on a production build served by the scaffold's `preview` script, or on the deployed site.
The dev backend signs in an owner on every request and wires no sink.

| Symptom | Cause | Fix |
|---|---|---|
| The owner gets the admin's 403 page | No access-map rule for the route | Add the route's key to `access` |
| An editor's delete succeeds | No `ownerOnly`, or the action is not wrapped | Wrap it and set `ownerOnly: true` |
| Submit returns 403, log `guard.refused` `reason: csrf` | No `CsrfField` in the form | Mount it in every posting form |
| 500 in dev, `UnauditedActionError` | A success path skipped `ctx.audit` | Audit before every success return |
| No `audit_log` row | Dev backend, no sink handle, or a failed insert | Use preview; check the handle; query `audit.sink.write_failed` |
| A section action returns 500, log `admin.action.misconfigured` | `resolveDb` returned nothing, or no handle attached the access map | Bind the database; serve the route under `/admin` |
| Shell does not fill the viewport; dev console names a width cap | The root layout wraps `/admin` in site chrome | `references/admin-mount.md` |
| A binding read fails to typecheck against `{}` or `unknown` | `Env` not inferred | Annotate `resolveDb`'s parameter |
