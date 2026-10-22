---
page: Add a custom admin screen
type: task guide
track: extend
exemplar: extenders/sanity-custom-tool
---

# Add a custom admin screen

:::reader
**Who reads it.** A developer who wants an administrative function of their own in `/admin`, beside the editors' screens. It might be a report, a tool, or a dashboard, and it might or might not keep data outside the markdown content, such as signups or members in a D1 database the site binds. A second reader has opened the example site's signups screen at `examples/showcase/src/routes/admin/signups/` and wants to know what each call in it is for, to change it or copy it. :fact[onqm6k]

**Why they arrive:**
- Their site needs an administrative function the engine doesn't provide, with or without data of its own.
- They read the architecture page's seams table, whose custom admin routes row points here.
- They opened the example site's `signups/` screen and want to know why it calls `requireAccess`, `createSectionAction`, and `ctx.audit`. :fact[pyt58u]
- They have another kind of markdown content, which needs a concept rather than a screen, and the introduction routes them to Define an adapter and schema.
- They want to change who reaches a screen, or to list it in the sidebar, and the introduction routes them to Restrict admin access or Arrange the admin sidebar.

**What they already know.** SvelteKit routes, `load` functions, form actions, `enhance`, and server hooks (`handle` and `sequence`); Svelte 5 snippets and runes; and Cloudflare D1 bindings in `wrangler.jsonc`. The page explains none of these and links the vendor docs where a step depends on a vendor detail.

**What the page does for them.** The introduction opens on what a custom admin screen is: a route under `src/routes/admin/` that renders inside `CairnAdminShell`, can adopt the admin toolkit, and sits behind the same `/admin` sign-in guard as the engine's screens. :fact[9xthnq]
Right after that, it gives a few examples of what a custom screen is for. Some keep data of their own: the example site's list of signups in a D1 database, or a members directory. Others keep none: a form that sends a newsletter through the site's own mail service, a report built from records the site already holds, or a button that calls an outside service, such as one that clears a CDN cache. :fact[onqm6k]
After the examples, it routes a reader with another kind of markdown content to a concept instead, in Define an adapter and schema.
It then says why the screen's duties exist. The route's location gives the shell and the sign-in guard, and the guard decides nothing per route, so the access check is the screen's. :fact[2sd4if]
An entry's history comes from git, while a screen's actions sit outside it, whether they write a site database or call an outside service, so the audit trail is their record. Every wrapped action that succeeds must emit a record, and both wrappers audit an access refusal. :fact[hcydfe] :fact[pgy0mr] :fact[wnvqlz] :fact[07efts] :fact[xbjxit]
`cairn-audit` holds the screen to the engine's own rules. :fact[326755]
The contract sentence follows: the steps build a screen that renders inside the admin shell, enforces your site's access map on its reads and writes, records each write in the audit trail, and passes `cairn-audit`.
It names the example site's signups screen as the worked example and says a scaffolded site does not ship it. It says the dialog form, row detail, and animation sections apply only to a screen with that feature. :fact[onqm6k]
It never says the engine's own screens write audit records.

**What it leaves to other pages:**
- Declaring the access map and changing who reaches a screen, which belong to Restrict admin access and are named in the introduction.
- Adding the screen to the sidebar, which belongs to Arrange the admin sidebar and is named in the introduction.
- Why an access map is not a whitelist (Security model), configuring the audit for the whole site (Run cairn-audit on your site), and the media upload protocol (Configure media), folded into one sentence that defers to See also.
- The audit norms' former values, which the page does not cover.
:::

## Before you begin

*List what the steps assume, each with the page that produces it. Show the admin's route files and the one directory the steps add.*

- The steps assume a site that `create-cairn-site` scaffolded, or a hand-built site brought to the same shape. :fact[b8rkq9]
- See [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- Your site's access map needs a rule for the screen's route, declared once as the adapter's `access` member. :fact[iwf4nu]
- A scaffolded site's adapter declares no `access` member. The example site's adapter declares `'/admin/signups': ['owner']`, which admits only owners to its signups screen. :fact[3z1uxv]
- See [Restrict admin access](restrict-admin-access.md).
- A screen that keeps data of its own reads and writes a D1 database your site binds in `wrangler.jsonc`, with its own migrations directory. A screen with no data of its own skips this item, and wraps its actions in `createAdminAction` with its `access` option set, since `createSectionAction` requires a binding resolver. :fact[hroqbu] :fact[xbjxit] `wrangler d1 migrations apply` walks one directory per database. :fact[nv0ok0]
- The scaffold's `wrangler.jsonc` binds no database beyond the engine's `AUTH_DB`. The example site's `APP_DB`, which backs its signups screen, is not part of the scaffold. :fact[n7t4bn]
- See [the D1 Worker API](https://developers.cloudflare.com/d1/worker-api/).
- The audit trail needs a D1 database that holds the `audit_log` table from the engine's opt-in `0002_audit.sql` migration. :fact[wnvqlz]
- See [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink).
- The admin is two pairs of route files: the layout pair that renders `CairnAdminShell` and the `[...path]` catch-all pair, with the admin's own `+error.svelte` beside them. :fact[b8rkq9]
- The example site, `examples/showcase`, adds a `signups/` screen beside the catch-all. A scaffolded site does not ship it. :fact[onqm6k]
- The tree below shows the files the page touches in `src/`, with the `signups/` directory marked as the new screen, named after the example site's screen. :fact[b8rkq9] :fact[vkfd7b]

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

- The first step creates that directory.

## Place the route

*Show that a route directory under `src/routes/admin/` is the whole registration. Name what the shell gives the screen and what it keeps fixed.*

- SvelteKit sorts a route under `src/routes/admin/` ahead of the engine's `[...path]` catch-all, with no configuration. :fact[03zj56]
- The shared admin layout renders the screen as `CairnAdminShell`'s children, with the shell's nav, user menu, and theme, and needs no wrapper code and no registration. :fact[brfitv]
- The screen sits behind the same `/admin` sign-in guard as the engine's screens. Every `/admin` path except the sign-in page and the magic-link confirm page is gated. :fact[9xthnq]

1. In `src/routes/admin/`, create a directory named for the screen.
2. In that directory, create `+page.server.ts` for the load and the actions, and `+page.svelte` for the markup.

- The shell keeps the cairn glyph and wordmark as its favicon and brand mark. The only site identity it shows is `siteName` from your site config, in the page title and the topbar. :fact[qz4gj2]

:::row
**Symptom.** The admin shell does not fill the viewport. In dev, the browser console shows one error about a width cap on an ancestor of the admin root. :fact[g7zuji]
**Cause.** Your site's root layout wraps every route, the admin included, in a header, a footer, or a width cap. A dev-only check catches the width-cap case, logs that one error, and never changes rendering or runs in production. :fact[g7zuji]
**Fix.** Make the root layout chrome-free for `/admin`, as [the admin routes reference](../reference/admin-routes.md#the-root-layout-must-be-chrome-free) describes.
:::

- Listing the screen in the sidebar is a separate task, which Arrange the admin sidebar covers.
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).

## Gate it

*Put the access check in the screen's `load`. Explain that the sign-in guard admits a session to `/admin` and decides nothing per route.*

- `createAuthGuard({ runtime })` signs a session in for the whole `/admin` subtree before any load runs. It does not decide which routes that session may reach. :fact[2sd4if]
- Two calls enforce your site's access map: `requireAccess` in the `load`, and an access-checking wrapper around every action. Both run the same fail-closed check, `hasAccessRule` and then `canReach`. :fact[10ojk8]
- Both read the map from the adapter's `access` member, which the guard attaches to every admin request it signs in. :fact[iwf4nu]
- SvelteKit runs a matched form action before the page's `load`, and an enhanced submission's request runs the action alone, so the load's check never guards the action. An action that skips the check admits any signed-in session to the write and records nothing. :fact[chsstm]

1. In the screen's `+page.server.ts`, call `requireAccess(event)` in `load` before it reads anything.

- The example below is the load from the example site's `examples/showcase/src/routes/admin/signups/+page.server.ts`, minus its logger call and comments. It calls `requireAccess(event)` before the read and fails with a 500 when the `APP_DB` binding is absent. It keeps the binding's `D1Database | undefined` annotation. :fact[onqm6k]

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

- A route with no rule in the map refuses every session, owner included. The owner has no exemption from a missing rule. :fact[3lbdl6]
- A route nested under the screen inherits the sign-in guard but not the screen's `requireAccess` call, so it needs its own call. The access map matches by deepest prefix, so the screen's key covers the nested route, with one exception. When the nested route starts with a dynamic segment and the map holds a deeper key under the screen's, it resolves to no rule. Otherwise it needs its own entry only for a different rule. :fact[lmtfkt]
- Load row detail on demand applies this to a detail endpoint.
- See [Load row detail on demand](#load-row-detail-on-demand).

## Choose the action wrapper

*Pick the wrapper by whether the screen's actions write through a database binding. Compare the two wrappers in a table.*

- `createSectionAction` needs a `resolveDb` binding resolver. A screen that wants only the CSRF and audit contract, with no binding, uses `createAdminAction` with its `access` option set. :fact[hroqbu]

1. In the screen's server file, import the wrapper that matches whether its actions write through a binding.

- A table, introduced by a complete sentence, compares the two wrappers in four rows: when each checks the access map, how each refuses a session, whether it needs a binding, and how a refusal is recorded. :fact[xbjxit] :fact[hroqbu]
- `createSectionAction` checks the access map on every call and refuses with `fail(403)`. `createAdminAction` checks it only when the call sets the `access` option, refuses by throwing `error(403, ...)`, and authorizes nothing without that option. :fact[xbjxit]
- Both wrappers audit a refusal and log it as `auth.access.refused`. Both show `You do not have access to this action.` by default, and only `createSectionAction` takes a `deniedMessage` option to replace it. :fact[xbjxit]
- The signups screen writes through `APP_DB`, and the rest of the page uses `createSectionAction`. :fact[onqm6k]
- See [`createAdminAction`](../reference/sveltekit.md#createadminaction).

## Wrap the actions

*Build one wrapper for the section and wrap each form action in it. Show the example site's two actions.*

- `createSectionAction<Env, Db>({ resolveDb })` builds one reusable wrapper for the section. `resolveDb` reads your site's binding off the Worker env the engine passes it. :fact[3j02dk]
- `Env` is a type parameter for your site's own bindings. The engine ships no `Env` type, and the example site passes the `Env` that its `worker-configuration.d.ts` generates. :fact[esp93u]

1. In the screen's server file, build one wrapper with `createSectionAction`, passing a `resolveDb` whose parameter is annotated `Env | undefined`. :fact[esp93u] :fact[pmmtdv]

:::row
**Symptom.** A binding read off the `resolveDb` parameter, such as `workerEnv?.APP_DB`, fails to typecheck against the type `{}`. :fact[pmmtdv]
**Cause.** `createSectionAction` does not infer `Env` from an unannotated `resolveDb` parameter, and `Env` collapses to `{}`. :fact[pmmtdv]
**Fix.** Annotate the parameter as `Env | undefined`, or pass `Env` and the database type as explicit type arguments. :fact[pmmtdv]
:::

2. In the exported `actions`, wrap each handler in that wrapper, passing its `action` and `entity`.
3. On a destructive action, add `ownerOnly: true` to the options.

- The example below continues the same file with the example site's `sectionAction` declaration and its `create` and `remove` actions, minus the comments. A snippet-check skip comment sits above it, since it reads `Env`, which only the site's generated `worker-configuration.d.ts` declares. :fact[pyt58u]

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

- Each handler receives `{ form, ctx }`, writes through `ctx.db`, and calls `ctx.audit` with a `detail` or an `entityId`. :fact[pyt58u]
- The audit record takes its `action` and `entity` from the wrapper's options unless the handler's `ctx.audit` call passes its own. :fact[6vy0ka]
- Underneath, the wrapper runs `createAdminAction`'s editor identity, CSRF, and single form-read work. A section never calls `createAdminAction` directly. :fact[lblh3u]
- Every successful path through a handler calls `ctx.audit` before it returns. A handler that rejects with `fail()` before it writes owes no record. :fact[07efts]
- Resolve a missing audit record traces a record that never arrives.
- See [Resolve a missing audit record](#resolve-a-missing-audit-record).

## Wire the audit sink

*Set the audit sink in `hooks.server.ts` and compose it after the guard with `sequence`. Show an excerpt of the hooks file's production branch.*

- A `ctx.audit` call persists a record only when a handle sets `event.locals.cairnAuditSink`, typically to a `createD1AuditSink` over a bound D1 database. :fact[68h31z]
- `hooks.server.ts` has one `handle` export. `sequence`, imported from `@sveltejs/kit/hooks` with the `Handle` type, composes several handles into it and runs them in order. :fact[rurhey] :fact[hk3hdl]
- The sink's handle only sets a `locals` field the route reads, and it works placed after `createAuthGuard`. :fact[6quvqm]
- The scaffold's hooks module picks between the dev backend and `createAuthGuard({ runtime })` in one `if`, and exports the result as `handle`. The dev backend wires no sink. :fact[f21bcz] :fact[dqjkci]

1. In `hooks.server.ts`, add a handle that sets `event.locals.cairnAuditSink` to a `createD1AuditSink` over the audit database. :fact[68h31z]
2. In that handle, guard the env read with `building` from `$app/env`, which every `cloudflare:workers` env read needs while the build prerenders. :fact[i8pbhc]
3. In the production branch, set `handle` to `sequence(createAuthGuard({ runtime }), wireAuditSink)`. :fact[6quvqm]

- The excerpt below is `src/hooks.server.ts` with the `wireAuditSink` handle from the `createD1AuditSink` reference entry and the production branch's assignment. It imports `runtime` from `#chassis/cairn.server.js` and no access map. Its lead-in marks it as an excerpt, since no file in the repository wires the sink. :fact[i8pbhc] :fact[f21bcz]

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

- Inside a request, pass `createD1AuditSink` the `waitUntil` that `cloudflare:workers` exports, unbound. A Cron `scheduled` handler binds `ctx.waitUntil` first. :fact[ph6kjg]
- The sink is fail-open: a failed insert never fails the action being audited, and the failure is logged. :fact[ff3l1u]
- `createSectionAction` audits each refusal its own checks make, except a rate-limit refusal. The session and CSRF refusals underneath it leave no audit record. :fact[da6d2z]
- See [`createD1AuditSink`](../reference/sveltekit.md#created1auditsink).
- The server side is complete, and the screen's markup comes next.

## Compose the screen from the toolkit

*Build the markup from the admin toolkit's primitives and mount a CSRF field in every form. Show a small Events screen as an aside.*

- The admin toolkit is the set of general-purpose primitives your screen composes in place of a hand-rolled table, list, or field. The engine's own screens compose it too: `ManageEditors` builds from its `PageHeader` and `AdminTable`. :fact[5t1i7o]
- Each primitive has one job: `PageHeader` the eyebrow, title, and meta band; `AdminTable` the table chrome around your header and row markup; `ListToolbar` the search and filter band; `ToolbarDisclosure` a trigger that opens a floating panel; `Pagination` page navigation; `StatusChip` a status chip; `EmptyState` the centered empty state; `FieldLabel` a control's label wrapper; `ExpandableRow` a summary row with an expand-in-place panel; `MediaPicker` a picker over the media library; and `Tooltip` a hover and focus description for an icon-only control. :fact[clyg9r]

1. In the screen's `+page.svelte`, import the primitives it needs from `@glw907/cairn-cms/admin-toolkit`.
2. In each form that posts to one of the screen's actions, mount a `CsrfField` from `@glw907/cairn-cms/admin`. :fact[fers77]

- The guard refuses an admin form POST whose `csrf` field is missing or wrong with a 403. Inside the shell, `CsrfField` takes no `token` prop and reads the shell's token. The signups screen mounts it in both its forms. :fact[fers77]
- A lead-in marks the switch to a smaller screen, an Events list that composes three primitives with the table inside a card. It is an aside, never a second screen to build.
- The Events screen below matches `src/lib/reproductions/stories/CustomScreen.svelte` word for word, except that it imports from `@glw907/cairn-cms/admin-toolkit`. The two stay in lockstep.

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

- The reproduction directly after the snippet renders the Events screen inside the admin shell, below the shell's topbar: the page header with its eyebrow, title, and count, and each row's status as a chip.

```repro
story: toolkit/custom-screen
alt: Reproduction of a minimal Events screen, showing PageHeader, AdminTable, and StatusChip composing a screen inside the admin shell.
caption: The screen renders below the shell's topbar. The page header carries the eyebrow, title, and count, and each row's status renders as a status chip.
```

- `AdminTable` sets its own horizontal scroll. The wrapping `div` carries `overflow-hidden card-shell card-shadow` and never `overflow-x-auto`. :fact[8x0qpa]
- Each primitive ships its compiled classes and its scoped styles with the package. A later release still renders it under your route with no change on your side. :fact[7m5o61]
- The admin toolkit reference lists every export with its props, and the admin components reference lists the engine components a screen can mount beside the toolkit.
- See [the admin toolkit reference](../reference/admin-toolkit.md).
- See [the admin components reference](../reference/admin.md).

## Style the screen

*Keep the screen's markup where the site admin sheet scans it. Style it with stock daisyUI classes, the corner ladder, and the named status-ink classes.*

- A scaffolded site's admin sheet, `src/admin.css`, compiles to `.cairn/admin.css` and scans `./routes/admin` and `./lib/admin`. A class in your markup compiles only when its file sits under one of those roots. :fact[vkfd7b]
- The scaffold's `predev`, `prebuild`, and `precheck` scripts compile that sheet, and a build needs no separate stylesheet step. :fact[666eg6]
- The engine's packaged admin sheet never scans your site's markup. :fact[zpi2ux]

1. Keep every file that holds the screen's markup under `src/routes/admin` or `src/lib/admin`. :fact[vkfd7b]

- The admin is built with daisyUI and Tailwind, so your own screens use the same classes. :fact[k6aopn]
- Every daisyUI component and utility class except calendar compiles into the admin sheet, with no safelist entry. :fact[9rxw92]
- Both admin themes set daisyUI's radius tokens: `--radius-selector` 0.25rem for chips and small markers, `--radius-field` 0.375rem for controls, and `--radius-box` 0.5rem for cards and dialogs. :fact[9oa6sk]

2. In the screen's markup, give each rounded corner `rounded-selector`, `rounded-field`, or `rounded-box`, never a fixed Tailwind radius such as `rounded-lg`. :fact[2babfl]

- A fixed Tailwind radius still compiles but does not follow the corner ladder. :fact[2babfl]
- `cairn-audit`'s norms follow the ladder: 6px for ghost and primary buttons, text inputs, and selects, and 8px for cards. :fact[39sn8c]
- A bare `btn` with no color, style, or state renders as a hairline button. :fact[gc0hx3]
- A `btn` in a selected form, such as `.btn-active` or `aria-pressed="true"`, renders as the selected segment. `btn-link`, the color variants, `btn-outline`, and `btn-dash` keep their own look. :fact[5stbq2]

3. For warning or success ink, use `cairn-text-warning` or `cairn-text-success`, the named classes the packaged admin sheet defines for those inks. :fact[q4jyat]

- The two optional recipes that follow serve a screen with a dialog form or with expanding rows.

## Build the dialog form

*Make a form in a native dialog survive every action result. Skip the section when the screen has no dialog.*

- `enhance` hands its callback one of four result types: `'success'`, `'failure'`, `'redirect'`, or `'error'`. The default `update()` resets the form and refreshes the page's data on `'success'` only, then calls `applyAction`. :fact[xgy3iu]
- On an `'error'` result, `applyAction` renders the nearest error page, which destroys the dialog. :fact[9fwsz5]
- A dialog form survives every result when its callback shows a `'failure'` message and then calls `update()`, reports an `'error'` without calling `update()`, closes the dialog before awaiting `update()` on `'success'`, and hands `'redirect'` to `update()`. :fact[jra92k]
- The callback's type, `SubmitFunction`, comes from `$app/forms` on SvelteKit 3. :fact[wd78d2]
- See [customizing `use:enhance`](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-Customizing-use:enhance).

1. In the screen's markup, add a `<dialog class="modal">` whose `aria-labelledby` points at the dialog's heading. :fact[tskfz1]
2. In the handler of the button that opens the dialog, call `showModal()`. :fact[ho6dxa]

- A dialog opened with `showModal()` closes on Escape without script. A `<form method="dialog">` is its own form element, and forms never nest. :fact[ho6dxa]

3. Inside the dialog, add the action form with `enhance` applied, as its own form element and never inside a `<form method="dialog">`. :fact[ho6dxa]
4. In the `enhance` callback, handle each of the four result types, and never call `update()` on `'error'`. :fact[jra92k] :fact[9fwsz5]
5. In the form, mount an empty `role="alert"` paragraph for the failure message. :fact[tkqoia]

- A live region announces only the changes made after it is in the DOM, so it is mounted empty first. :fact[tkqoia]

6. On the input, point `aria-describedby` at the alert paragraph. :fact[5vn194]
7. On the same input, set `aria-invalid="true"` while its value is the failed one. :fact[5vn194]
8. On the submit button, set `disabled` while the request is pending. :fact[5vn194]

- The input's description then reads the error with its field when focus moves to it, and a disabled submit cannot fire the action a second time. :fact[5vn194]
- The example below is an illustrative create dialog that posts to the signups screen's `create` action. The example site's own dialog confirms a removal and has no visible field, only a hidden `id` input, so this one is written on that file's imports and patterns, and its lead-in frames it as illustrative.

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

- The second recipe loads detail for rows that expand.

## Load row detail on demand

*Fetch a row's detail when its panel opens and cache it per row. Skip the section when the screen's rows do not expand.*

- A page's `load` runs on each visit, so a list load that also fetches every row's detail pays for all of them every time. Fetching on open costs only the rows a reader opens. :fact[uy7vyc]
- Returning an unawaited promise from `load` streams it, but the work still runs when `load` creates the promise. :fact[b5mcea]

1. Under the screen's directory, add the detail endpoint as a nested route that returns one row's detail as JSON.
2. In that route's server file, call `requireAccess`. :fact[lmtfkt]
3. In your site's access map, add an entry for the nested route when it needs a different rule from the screen's, or when it starts with a dynamic segment and the map holds a deeper key under the screen's. Otherwise the screen's key already covers it. :fact[lmtfkt]

- See [Restrict admin access](restrict-admin-access.md).

4. In the screen's markup, render each row as an `ExpandableRow` inside the `AdminTable`. :fact[vao0dd]

- `ExpandableRow` renders your summary cells plus one trailing trigger cell of its own. The `colspan` you pass counts that trigger cell, and the panel snippet receives the row's `datum`. :fact[vao0dd]
- The trigger cell has no visible heading. Your `header` snippet matches it with a `<th scope="col">` whose text sits in an `sr-only` span, as the signups table does for its actions column. :fact[n2bhjw]
- A click inside an element carrying `data-cairn-inert-cell` does not toggle the row. An interactive summary cell wraps its content in that attribute rather than calling `stopPropagation()`. :fact[pswc3n]

5. In the same file, keep the expanded row's id in state, and pass each `ExpandableRow` its `expanded` value and an `onToggle` callback. :fact[xqz3ov]

- `ExpandableRow` holds no expand state of its own. Both its trigger button and a click on the summary row call `onToggle`. :fact[xqz3ov]
- See [`ExpandableRow`](../reference/admin-toolkit.md#expandablerow).

6. In the same file, write an open handler that `onToggle` calls when a row opens.
7. In the open handler, return the cached detail when the row already has one.
8. Otherwise, in the same handler, call `fetch` for the row's detail inside a `try` block. :fact[od9mww]

- `fetch` resolves on an HTTP error status, and `Response.json()` rejects on a body that is not JSON, such as an HTML error page. :fact[od9mww]

9. Inside the `try` block, check `response.ok`. :fact[od9mww]
10. In the same block, parse the body with `Response.json()`. :fact[od9mww]
11. In the same block, cache the detail only after the status check and the parse both succeed, which leaves a failed row retryable. :fact[od9mww]
12. In the row's panel snippet, render the cached detail. :fact[vao0dd]

- The example below is an illustrative open handler, framed as illustrative in its lead-in: a `SvelteMap` keyed by row id, and an async function that returns the cached detail or fetches the URL passed in, checks `response.ok`, parses JSON, caches, and returns `undefined` on any failure.

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

- A screen that animates any of this meets the admin's motion rules next.

## Animate the screen

*Write each duration and easing as one of the admin's motion tokens. Skip the section when the screen has no motion.*

1. In the screen's markup or its scoped `<style>` block, write each duration and easing as a `var()` of a motion token, such as `var(--cairn-dur-base)`. :fact[017qss]

- Both admin themes declare eight motion tokens: five durations, `--cairn-dur-instant` 70ms, `--cairn-dur-quick` 110ms, `--cairn-dur-base` 150ms, `--cairn-dur-shift` 240ms, and `--cairn-dur-settle` 400ms, and three curves, `--cairn-ease-standard`, `--cairn-ease-entrance`, and `--cairn-ease-exit`. :fact[017qss]
- A `transition-*` utility with no `duration-*` or `ease-*` beside it runs on the base duration and the standard curve. :fact[018sgk]
- Under `prefers-reduced-motion: reduce`, the admin cuts every animation and transition to `0.01ms`. :fact[2p5otw]
- Three admin-only, error-tier `cairn-audit` rules hold an admin screen's motion vocabulary: `motion-property` limits which properties a transition names, `motion-vocabulary` fails a literal duration or easing, and `motion-hover-gate` fails hover motion outside `@media (hover: hover)`. :fact[09g8ev] :fact[0aa9tp] :fact[0mbj5n] :fact[1x8r1x]
- The rules scan `src/routes/admin`, `src/lib/admin`, and `src/lib/admin-toolkit` by default. A site whose screens live elsewhere names their roots under `static.adminScope`. :fact[t767qb]
- The static rules table is the reference for what each rule checks, and its coverage limits hold the exemptions.
- See [the static rules](../reference/cairn-audit.md#the-static-rules).
- See [what the motion rules don't cover](../reference/cairn-audit.md#what-the-motion-rules-dont-cover).
- See [the audit configuration](../reference/cairn-audit.md#configuration).

## Verify the screen

*Check the screen on a site served through the auth guard. Confirm the shell, the refusal, the audit row, and a clean `cairn-audit` run.*

- A lead-in says where the checks run: a default build served by `npm run build` and then `npm run preview`, or the deployed site, never `npm run dev`. :fact[f21bcz] :fact[xluud1] :fact[vh5aw8]
- Under `npm run dev`, the hooks take the dev-backend branch, which signs in an owner on every `/admin` request and wires no audit sink. The refusal check and the audit-row check cannot pass there. :fact[f21bcz] :fact[dqjkci]
- A default build turns the dev backend off, and the scaffold's `preview` script serves the build with `wrangler dev` on port 4173. :fact[xluud1] :fact[vh5aw8]

1. In a browser signed in as an owner, open the screen under `/admin`. The screen renders inside the admin shell, with the shell's nav, user menu, and theme. :fact[brfitv]

:::row
**Symptom.** The owner sees "You don't have access to this page." in place of the screen. :fact[ty4ehh]
**Cause.** The access map has no rule for the screen's route, and a route with no rule refuses every session, owner included. :fact[3lbdl6]
**Fix.** Add a rule for the route to the adapter's access map, as Restrict admin access describes, then reload the screen. :fact[iwf4nu]
:::

2. In a second browser, sign in as an editor whose role the screen's rule does not name, and open the screen. The admin's error page reads "You don't have access to this page." :fact[ty4ehh] :fact[3lbdl6]

- An owner adds that account through the Add editor form on `/admin/editors`, choosing a role the rule leaves out, such as `editor` for the signups rule. Each role option shows its name, followed by its capability when the two differ. :fact[2dgbff] :fact[3z1uxv]
- See [Assign the roles](restrict-admin-access.md#assign-the-roles).

3. In the owner's browser, submit one of the screen's actions.

:::row
**Symptom.** The submit returns a 403, and the logs carry `guard.refused` with `reason: csrf`. :fact[fers77]
**Cause.** The form that posted has no `CsrfField`, and the guard refuses an admin form POST without a valid `csrf` field. :fact[fers77]
**Fix.** Mount a `CsrfField` from `@glw907/cairn-cms/admin` in each form that posts to one of the screen's actions. :fact[fers77]
:::

4. In the audit database, query the `audit_log` table for its newest row. One row names the action, and its `action` and `entity` match the wrapper's options. :fact[wnvqlz] :fact[6vy0ka]

:::row
**Symptom.** No row arrives in `audit_log` for the action.
**Cause.** The request ran under `npm run dev`, whose dev-backend branch wires no sink, or a cause that Resolve a missing audit record traces. :fact[f21bcz] :fact[dqjkci]
**Fix.** Serve a default build with `npm run preview`, or use the deployed site, and submit again. When the row still does not arrive, work through [Resolve a missing audit record](#resolve-a-missing-audit-record).
:::

5. In the site directory, run `npm run check:cairn`. :fact[mrv24k]

- The script compiles the admin sheet and runs `cairn-audit` over the same static rules the engine's own screens meet, with `src/routes/admin` in the default scope. :fact[mrv24k] :fact[326755]

:::row
**Symptom.** `npm run check:cairn` exits 1.
**Cause.** The report holds an unsuppressed error-tier finding. Advisory findings print without changing the exit code. :fact[1md5oj] :fact[mrv24k]
**Fix.** Fix each unsuppressed error-tier finding the report lists, then run the script again. :fact[1md5oj]
:::

6. In the site directory, run the script again until no error-tier finding remains. :fact[1md5oj]

- A rendered run, which drives a browser against a running server, is set up on Run cairn-audit on your site. :fact[1md5oj] :fact[vh5aw8]
- See [tiers and exit codes](../reference/cairn-audit.md#tiers-and-exit-codes).
- See [the rules](../reference/cairn-audit.md#the-rules).
- See [Run cairn-audit on your site](run-cairn-audit-on-your-site.md).

## Resolve a missing audit record

*Trace a write that left no audit row through its four causes, in order. Point to the page that maps each log event.*

- A missing record means the request ran under the dev backend, a handler skipped `ctx.audit`, no handle set the sink, or the sink's insert failed. :fact[f21bcz] :fact[07efts] :fact[68h31z] :fact[ph6kjg]
- A handler that returns without calling `ctx.audit` throws `UnauditedActionError`, a 500, in dev. In production it logs `admin.action.unaudited` at error level instead. :fact[07efts]

1. In the terminal that serves the site, check that the request ran under a default build served by `npm run preview` or on the deployed site, not under `npm run dev`. :fact[f21bcz] :fact[dqjkci]
2. In the action's handler, check that every successful path calls `ctx.audit` before it returns. :fact[07efts]
3. In `hooks.server.ts`, check that a handle sets `event.locals.cairnAuditSink` and that `sequence` composes it into the exported `handle`. :fact[68h31z] :fact[rurhey]
4. In Workers Logs, look for `audit.sink.write_failed`. The reason `wait_until_failed` names an `ExecutionContext`'s `waitUntil` passed unbound, and the row can be lost. :fact[ph6kjg]

- Debug your site maps `admin.action.unaudited` and a sink failure to their causes, and the log events reference lists both events' fields and reasons.
- See [Debug your site](debug-your-site.md).
- See [Log events](../reference/log-events.md).

## See also

*Point to the pages that cover the tasks and reasoning around a custom screen, one sentence each.*

- One complete sentence per page names what it covers; the recovery link from the previous section is not repeated.
- See [Restrict admin access](restrict-admin-access.md).
- See [Arrange the admin sidebar](arrange-the-admin-sidebar.md).
- See [Run cairn-audit on your site](run-cairn-audit-on-your-site.md).
- See [Security model](security-model.md).
- See [Configure media](configure-media.md).
- See [Define an adapter and schema](define-an-adapter-and-schema.md).
- See [the admin toolkit reference](../reference/admin-toolkit.md).
