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
`FieldLabel`/`FieldRow` for form controls. Every one of these primitives
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
          <td><StatusChip label={event.status} /></td>
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

## Recipe: the dialog-form failure contract

These are recipes, not toolkit primitives: plain markup plus `FieldLabel`, worth writing out
because getting the failure path right takes a few tries. A primitive is worth adding only once a
second consumer needs the identical shape.

A form inside a native `<dialog>`, submitted with `use:enhance` so a validation failure doesn't
navigate the whole page away from the dialog the user was just looking at. Two behaviors carry the
contract: a failure keeps the dialog open and moves focus to a dialog-local `role="alert"`, and a
success calls `update({ reset: false })` before closing, so nothing resets the form's own state
out from under a submit that's still resolving.

```svelte
<!-- src/routes/admin/club/events/ApproveDialog.svelte -->
<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { FieldLabel } from '@glw907/cairn-cms/admin-toolkit';
  import type { ActionResult } from '@sveltejs/kit';

  let { id }: { id: string } = $props();

  let dialog = $state<HTMLDialogElement | null>(null);
  let alertBox = $state<HTMLElement | null>(null);
  let errorMessage = $state<string | undefined>(undefined);

  export function open() {
    errorMessage = undefined;
    dialog?.showModal();
  }

  type EnhanceUpdate = (options?: { reset?: boolean }) => Promise<void>;

  async function onResult(result: ActionResult, update: EnhanceUpdate) {
    if (result.type === 'failure') {
      errorMessage = (result.data?.error as string | undefined) ?? 'Something went wrong.';
      await update({ reset: false });
      await tick();
      alertBox?.focus();
      return;
    }
    await update({ reset: false });
    if (result.type === 'success') dialog?.close();
  }
</script>

<dialog bind:this={dialog} class="modal">
  <div class="modal-box">
    {#if errorMessage}
      <div role="alert" tabindex="-1" bind:this={alertBox} class="alert alert-error mb-3">
        {errorMessage}
      </div>
    {/if}
    <form
      method="POST"
      action="?/approve"
      use:enhance={() => ({ result, update }) => onResult(result, update)}
    >
      <input type="hidden" name="id" value={id} />
      <FieldLabel label="Note">
        <input class="input" name="note" />
      </FieldLabel>
      <button type="submit" class="btn btn-primary mt-4">Approve</button>
    </form>
  </div>
</dialog>
```

`role="alert"` announces the message the instant it renders; the explicit `tabindex="-1"` plus the
`focus()` call after `update()` moves the user's own keyboard focus there too, not only a screen
reader's attention, since a sighted keyboard user gets no visual cue that anything happened unless
focus itself moves. The `await tick()` between `update()` and `focus()` matters: `errorMessage` is
what makes the alert element exist at all, and nothing guarantees Svelte has flushed that reactive
update to the DOM by the time `update()` resolves, so a `focus()` call without `tick()` can run
before Svelte binds `alertBox` and silently do nothing. `dialog?.close()` runs only on `'success'`,
never on `'error'` (an unhandled exception, which is a different failure than a validation
`fail()`) or `'redirect'`, so the dialog stays open and legible for whatever the caller does with
either of those next.

## Recipe: load when the panel opens

A row that expands to show detail, an `ExpandableRow` panel, a drawer, any progressive-disclosure
shape, is a poor place to eagerly fetch that detail from the page's own `load`: the list load pays
for every row's detail on every visit, when a reader typically opens one or two. Fetch it only when
the panel actually opens instead, and cache the result per row so a second open of the same row is
free.

```svelte
<!-- src/routes/admin/club/roster/+page.svelte -->
<script lang="ts">
  import { ExpandableRow, AdminTable } from '@glw907/cairn-cms/admin-toolkit';

  interface Member {
    id: string;
    name: string;
  }
  interface MemberDetail {
    email: string;
    joined: string;
  }

  let { data }: { data: { members: Member[] } } = $props();

  let expandedId = $state<string | null>(null);
  let details = $state<Record<string, MemberDetail>>({});
  let failed = $state<Record<string, boolean>>({});

  async function loadDetail(id: string) {
    const response = await fetch(`/admin/club/roster/${id}/detail`);
    if (response.ok) {
      details[id] = (await response.json()) as MemberDetail;
      delete failed[id];
    } else {
      failed[id] = true;
    }
  }

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id;
    if (expandedId && !(id in details) && !failed[id]) void loadDetail(id);
  }
</script>

<AdminTable rowCount={data.members.length}>
  {#snippet header()}
    <th scope="col">Name</th>
    <th scope="col"><span class="sr-only">Expand</span></th>
  {/snippet}
  {#snippet children()}
    {#each data.members as member (member.id)}
      <ExpandableRow
        expanded={expandedId === member.id}
        onToggle={() => toggle(member.id)}
        datum={member}
        colspan={2}
        triggerLabel={`Expand ${member.name}`}
      >
        {#snippet summary()}
          <td>{member.name}</td>
        {/snippet}
        {#snippet panel(row)}
          {#if details[row.id]}
            <p>{details[row.id]?.email}</p>
          {:else if failed[row.id]}
            <p>
              Couldn't load member details.
              <button type="button" class="link" onclick={() => loadDetail(row.id)}>Retry</button>
            </p>
          {:else}
            <p>Loading...</p>
          {/if}
        {/snippet}
      </ExpandableRow>
    {/each}
  {/snippet}
</AdminTable>
```

The `header` snippet declares a second `<th scope="col">` to match `ExpandableRow`'s two body
cells per row, the summary cell and the component's own trailing trigger cell (which is why
`colspan={2}` is correct on the panel row); its name is screen-reader-only since the trigger
column carries no visible header text of its own.

The cache (`details`, keyed by row id) is what makes a repeat toggle free, and a failed fetch is
never cached as if it succeeded: `loadDetail` only writes to `details` on a `response.ok`, so a
failure leaves the row's key absent from `details` and instead sets `failed[id]`, which the panel
renders as its own state, distinct from `Loading…`, with a retry action that calls `loadDetail`
again. A `load` that streamed the same data with SvelteKit's own promise streaming (`return {
members, details: loadDetails() }` with `details` an unawaited promise) still runs the fetch for
every row on first paint; streaming
only defers when a promise *resolves* into the page, not whether it *runs*, so it doesn't skip a
row nobody ever opens the way an open-triggered fetch does.

## You know it worked when

The route renders inside the shell chrome (sidebar, top bar, theme) with no wrapper code of your
own, an editor outside the access map's named roles gets a 403 on both the page and any action
posted to it, and a successful mutating action leaves a row in your audit table. If your root
layout renders visible chrome around `/admin` (a header, a footer, a width cap), the admin shell
can't fill the viewport; see [the root layout rule](../reference/admin-routes.md#the-root-layout-must-be-chrome-free)
for the fix.

To also place this screen in the sidebar, see [Organize your admin nav](./organize-your-admin-nav.md).
