# Exemplar: a list screen

## Contents

- [Anatomy at a glance](#anatomy-at-a-glance)
- [The header: one filled action](#the-header-one-filled-action)
- [The toolbar: search, facets, and the count line (Growth)](#the-toolbar-search-facets-and-the-count-line-growth)
- [The table: the row register](#the-table-the-row-register)
- [The status chip: chip passivity in practice (Growth)](#the-status-chip-chip-passivity-in-practice-growth)
- [The expand-in-place panel (Growth)](#the-expand-in-place-panel-growth)
- [Pagination (Growth)](#pagination-growth)
- [The shipped source](#the-shipped-source)
- [What this exemplar doesn't cover](#what-this-exemplar-doesnt-cover)


Load this when building or reviewing a list screen: a table over a collection, with the search,
filters, and in-place detail a longer list needs.

Source: the Signups screen in `examples/showcase`, the cairn-cms repo's worked custom-screen
example (`src/routes/admin/signups/+page.svelte`, with its `+page.server.ts` beside it). A
scaffolded site does not ship this screen. Its whole source sits under "The shipped source" at
the end of this file, so everything below reads without the showcase open. It is built from
`PageHeader` and `AdminTable` in `@glw907/cairn-cms/admin-toolkit` and `CsrfField` in
`@glw907/cairn-cms/admin`, and it is the small form of a list screen: a header, an inline create
row, one table, and a shared delete confirm. It has no toolbar, no expandable row, no status
chip, and no pagination, because three columns of a short list need none of them.

This file annotates the shipped markup where it exists and shows, under a **Growth** label, what
the same screen gains once the list needs more. Growth snippets are not shipped code. They are
written in the Signups vocabulary, and they assume the developer has added a `status` column to
their `signups` table (`pending`, `confirmed`, `waitlisted`), which the shipped table does
not have. The annotations translate the markup into the register vocabulary a builder holds in
working memory.

## Anatomy at a glance

Shipped: one office-style header, one create row, one table, one delete confirm. Components:
`PageHeader`, `AdminTable`, and `CsrfField`.

Growth: the same header, one toolbar band (search, facets, count line), one table (zebra rows
that expand in place), one pagination footer. Five components, no bespoke layout: `PageHeader`,
`ListToolbar`, `AdminTable` + `ExpandableRow`, `StatusChip`, `Pagination`.

## The header: one filled action

Shipped:

```svelte
<PageHeader title="Signups" />

<form method="POST" action="?/create" use:enhance={onCreate}>
  <CsrfField />
  ...
  <button class="btn btn-primary signup-create-submit">Add</button>
</form>
```

Growth, with the create form moved into a dialog the header opens:

```svelte
<PageHeader eyebrow="Site" title="Signups">
  {#snippet action()}
    <button type="button" class="btn btn-primary btn-sm" onclick={openAddSignupDialog}>Add signup</button>
  {/snippet}
</PageHeader>
```

- `PageHeader` satisfies `screen-anatomy`'s mechanical check (one `<h1>`, a header landmark)
  on its own. The grown screen's table carries the `.card-shell` region the rule also looks
  for, composed beside this header rather than wrapped inside it (see "The table" below).
- The shipped screen sets only `title`, the page's one display-face `h1`. The grown header adds
  an eyebrow ("Site"), which names the nav section the screen lives under; the showcase's
  `navLayout` puts Signups in its Site group. Neither takes a meta line: the toolbar's count
  line, not a header meta line, states the list's scope (see below), so `PageHeader`'s `meta`
  prop stays unused rather than duplicating that line.
- The shipped screen's one accent-filled control is the create row's `btn btn-primary` "Add".
  That is the primary-action half of `screen-anatomy` that no mechanical rule can enforce (it
  can't know whether a screen has one to place): adding a signup is the single deliberate thing
  this screen invites a visitor to start. By `screen-anatomy`'s location rule that control sits
  outside both the header and any `.card-shell` region, so a rendered audit of this route would
  read it as a buried primary action; the Growth form is the corrected placement. Once the form
  moves into a dialog, the fill moves to the header's `action` slot beside the `h1`, not
  trailing the table in a footer row.
  `one-filled-action` is the mechanical half: it would catch a second accent fill appearing
  anywhere else on this surface. The shipped table's row verb is `btn btn-ghost btn-xs`, and the
  delete confirm's `btn-error` fill lives in its own dialog, a separate surface.

## The toolbar: search, facets, and the count line (Growth)

```svelte
<ListToolbar
  search={searchQuery}
  {onSearch}
  searchLabel="Search by name or email"
  {filters}
  count={data.signups.length}
  itemLabel={{ one: 'signup', many: 'signups' }}
/>
```

A status filter is `'select'`-display and an archive filter is `'menu'`-display. The menu one:

```ts
{
  id: 'archived',
  label: 'Archived',
  value: includeArchived ? 'include' : 'active',
  defaultValue: 'active',
  display: 'menu',
  options: [
    { value: 'active', label: 'Active only' },
    { value: 'include', label: 'Include archived' },
  ],
  onChange: (value) => (includeArchived = value === 'include'),
},
```

- **Facet quietness.** Every filter, `'select'` or `'menu'`, is a facet in `ListToolbar`'s
  vocabulary: quiet bordered chrome showing only its name (`"Archived"`) at rest, picking up
  a primary-tinted applied treatment only once its value departs `defaultValue`. No facet
  competes with the header's one filled action; a facet never carries `btn-primary`.
- `itemLabel` is the `{ one, many }` pair, not a bare string, because the count line has to
  read `"1 signup"` and not `"1 signups"`. `Pagination`'s `itemLabel` below takes the
  identical shape for the identical reason; a list screen states both in the plural-aware form
  by default rather than adding it after someone notices the grammar defect.
- The count line always renders, even at zero applied filters, and always states the list's
  scope (`computeCountLine`, an internal mechanism `ListToolbar` computes and renders
  itself, not an importable export). This is why `PageHeader` above carries no `meta`: a
  second line stating a count would either duplicate or race the toolbar's count line
  for whichever total is true.
- `searchLabel` is the search box's accessible name, not visible chrome; it names what the
  search actually matches ("name or email"), since "Search" alone would promise less than the
  field delivers.

## The table: the row register

Shipped:

```svelte
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
        <td>...</td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>
```

Growth, the table in its card and zebra-striped:

```svelte
<div class="overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" zebra rowCount={paged.length} emptyColspan={4}>
    {#snippet header()}
      <th class={HEADER_CELL}>Name</th>
      <th class={HEADER_CELL}>Guests</th>
      ...
    {/snippet}
    ...
  </AdminTable>
</div>
```

The shipped screen leaves the table bare and gives the last column an `sr-only` name, since a
column of row verbs has no visible header. The grown screen wraps the table in the card recipe.
The `card-shell card-shadow` wrapper carries no `overflow-x-auto` of its own: `AdminTable`'s own
`toolkit-admin-table-wrap` div is the one horizontal scroll container in this composition, so
the outer card never nests a second scroll boundary over the same table. It does carry
`overflow-hidden`, since `card-shell` rounds its border but does not clip, and the table's
square edges would otherwise paint over the card's rounded corners.

`HEADER_CELL` is a token the screen declares once for every column header. A cairn-native table
writes it as the role utility, `type-label font-semibold uppercase tracking-[0.08em] text-muted`,
never the literal `text-[0.6875rem]`: it is the same Eyebrow recipe `PageHeader`'s eyebrow
line uses, because a column header and a section eyebrow are the same register.

The row's cells can carry a scoped type scale. The shipped screen scopes only its create row
this way, in a `<style>` block (`.signup-create-label`, `.signup-create-field`); a grown row
would add:

```css
.signup-name-cell {
  font-size: var(--cairn-type-body);
  font-weight: 600;
  ...
}
.signup-cell {
  font-size: var(--cairn-type-body);
  ...
}
.signup-guest-tag {
  font-size: var(--cairn-type-meta);
}
```

- The name cell and the plain cell both resolve to `--cairn-type-body` (0.875rem); the name
  cell adds `font-weight: 600` since it is the row's subject, the one thing a scanning eye
  should land on first. A cairn-native build writes `type-body` on both cells and keeps the
  weight as a separate, deliberate choice on the name cell alone: weight carries the emphasis,
  the role utility carries only the size and its leading. `--cairn-type-body--leading` is
  1.25rem; nothing here overrides it.
- The "(+2 guests)" tag demotes one step to `--cairn-type-meta` (0.8125rem), which a cairn-native
  build writes as `type-meta`. A step down from the row's body text is the correct register
  for a qualifier the reader doesn't need to scan for.

## The status chip: chip passivity in practice (Growth)

```svelte
<StatusChip
  register={SIGNUP_STATUS_REGISTER[row.status]}
  label={SIGNUP_STATUS_LABEL[row.status]}
  legend={row.status === 'waitlisted' && row.position ? `Position ${row.position} on the waitlist` : undefined}
/>
```

Applying chip passivity to the screen's status vocabulary (Pending, Confirmed, Waitlisted) is
the judgment call a builder makes at each call site, not a fact the screen has already settled.
**Pending** needs the visitor's attention (a signup awaiting a decision), so it takes
`register="warning"`. A status that reads as the row's settled, put-away state (a Confirmed
signup needs nothing from the visitor) is the default `quiet` register. **Waitlisted** is a
transient absence of a seat, so it reads as `outline`. The rule from the standard doc applies per
state, not per component: decide by what the state is asking the reader to do, not by habit.

A payment state in a nested panel (`Paid`/`Outstanding`/`Not billed`) would use the same register
vocabulary at `size="xs"`, the density tier for a cell that budgets its width rather than
taking the 5rem `sm` floor. The same register question applies: `Paid` is the row's settled state
and reads as `quiet`; `Outstanding` is the one that should stay `warning`.

## The expand-in-place panel (Growth)

```svelte
{#snippet panel(datum: SignupRow)}
  <div class="signup-panel">
    <div class="signup-panel-grid">
      <section>
        <h2 class={HEADER_CELL}>Contact</h2>
        ...
      </section>
    </div>
  </div>
{/snippet}
```

- `ExpandableRow` supplies the summary `<tr>`, the trigger cell, and the panel's spanning
  `<td>`; the panel's internal grid (`signup-panel-grid`,
  `repeat(auto-fit, minmax(12rem, 1fr))`) is this screen's content, not the toolkit's
  concern. Each of the panel's sections repeats the same `HEADER_CELL` micro-label over its
  content, the identical register the table's column headers use: a panel section heading and a
  table column header are siblings in the same role, `type-label`.
- The panel's action row (`Open signup`, `Email signup`, `Add guest`) is three `btn btn-sm`
  (no `-primary`) actions. None of them fills. The expand panel gets no `one-filled-action`
  exemption of its own: the screen still carries exactly one accent fill, the header's "Add
  signup," and the panel's actions stay plain so they never compete with it. A panel that
  genuinely needs its filled action is the signal to make it a real desk route instead (see
  `exemplar-detail.md`), not to add a second fill to this surface.

## Pagination (Growth)

```svelte
<Pagination
  page={pageIndex}
  pageCount={totalPages}
  onPageChange={(p) => (pageIndex = p)}
  totalItems={data.signups.length}
  pageSize={PAGE_SIZE}
  itemLabel={{ one: 'signup', many: 'signups' }}
/>
```

Same `{ one, many }` `itemLabel` as the toolbar's count line, for the same reason: a range
line reading `"1-10 of 149 signups"` never degrades to `"1 signups"` at a total of one.

## The shipped source

The showcase's `src/routes/admin/signups/+page.svelte`, in full. The "Shipped" snippets above
are excerpts of it.

```svelte
<!-- @component The custom Signups admin screen: a developer's route rendered in CairnAdminShell.
     The header and the table adopt the packaged admin toolkit through its public subpath
     (`@glw907/cairn-cms/admin-toolkit`), the in-repo consumer proof that a site's custom
     screen reaches for the toolkit the same way cairn's admin does. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/admin';
  import { PageHeader, AdminTable } from '@glw907/cairn-cms/admin-toolkit';
  import type { PageData, ActionData } from './$types';
  import type { SubmitFunction } from '$app/forms';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // The server's error tokens stay terse (other tests and the exemplar's docs name them), so the
  // sentence a sighted user reads is built here, with the raw token as a fallback for any token
  // this map does not yet cover.
  const errorMessages: Record<string, string> = {
    missing: 'Name and email are both required.',
  };

  // State for the one shared confirm dialog, whose markup and recipe sit below the table: the
  // pending row's id and name are set by the trigger that opened it, so the same dialog and the
  // same posted form serve every row without duplicating a dialog per row.
  let deleteDialog = $state<HTMLDialogElement | null>(null);
  let pendingDeleteId = $state<number | null>(null);
  let pendingDeleteName = $state('');
  let nameInput = $state<HTMLInputElement | null>(null);

  function confirmDelete(id: number, name: string) {
    pendingDeleteId = id;
    pendingDeleteName = name;
    // showModal only after Svelte flushes the new pendingDeleteName, or the dialog's
    // aria-labelledby heading still names the previously opened row (or nothing, on the first
    // open): $state writes batch into a microtask, so a synchronous showModal races it.
    void tick().then(() => deleteDialog?.showModal());
  }

  function cancelDelete() {
    deleteDialog?.close();
  }

  // use:enhance is what keeps the outcome region's content change inside the live document: a
  // native full-page POST would replace the whole document with the region's outcome already
  // present at load, which a screen reader never announces as a status change (WCAG 4.1.3).
  const onCreate: SubmitFunction = () => {
    return async ({ result, update }) => {
      await update();
      if (result.type === 'failure') nameInput?.focus();
    };
  };

  const onRemove: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') deleteDialog?.close();
      await update();
    };
  };
</script>

<PageHeader title="Signups" />

<form method="POST" action="?/create" class="my-4 flex items-end gap-2" use:enhance={onCreate}>
  <CsrfField />
  <label class="flex flex-col gap-label signup-create-label">
    <span class="type-body font-medium">Name</span>
    <input
      name="name"
      class="input signup-create-field"
      bind:this={nameInput}
      aria-describedby="signup-outcome"
      aria-invalid={form?.error ? 'true' : undefined}
    />
  </label>
  <label class="flex flex-col gap-label signup-create-label">
    <span class="type-body font-medium">Email</span>
    <input
      name="email"
      class="input signup-create-field"
      aria-describedby="signup-outcome"
      aria-invalid={form?.error ? 'true' : undefined}
    />
  </label>
  <button class="btn btn-primary signup-create-submit">Add</button>
</form>

<!-- Always mounted and content-gated (the admin's ruled busy/live-region idiom), so it reads any
     outcome either action produces without re-mounting mid-interaction (WCAG 4.1.3, 3.3.1): both
     forms' use:enhance keeps the outcome a DOM mutation into this already-mounted region rather
     than a full-page reload. form.error is read generically: createSectionAction's denial and
     misconfigured branches carry the same field the create action's validation failure does. -->
<p role="status" aria-live="polite" class="type-body mt-2 scroll-mt-14" id="signup-outcome">
  {#if form?.error}
    {errorMessages[form.error] ?? form.error}
  {:else if form?.created}
    Signup added.
  {:else if form?.removed}
    Signup removed.
  {/if}
</p>

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
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label={`Delete ${s.name}`}
            aria-haspopup="dialog"
            onclick={() => confirmDelete(s.id, s.name)}
          >
            Delete
          </button>
        </td>
      </tr>
    {/each}
  {/snippet}
</AdminTable>

<!-- One shared confirm for every row's destructive action, following the design system's
     safe-delete recipe: a native dialog opened with showModal (native focus trap and Escape),
     role="alertdialog", and no method="dialog" backdrop, so a stray click cannot dismiss it. -->
<dialog
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="signup-delete-title"
  bind:this={deleteDialog}
>
  <div class="modal-box">
    <h2 id="signup-delete-title" class="type-heading font-bold">
      Delete {pendingDeleteName}?
    </h2>
    <p class="mb-3 type-body">This cannot be undone.</p>
    <form method="POST" action="?/remove" class="flex justify-end gap-2" use:enhance={onRemove}>
      <CsrfField />
      <input type="hidden" name="id" value={pendingDeleteId} />
      <button type="button" class="btn btn-sm" onclick={cancelDelete}>Cancel</button>
      <button type="submit" class="btn btn-sm btn-error">Delete</button>
    </form>
  </div>
</dialog>

<style>
  /* The site admin sheet scans this route (`@source "./routes/admin"` in src/admin.css), so a
     Tailwind utility would resolve here; the field width the stacked labels need is a scoped rule
     because the flex, min and max sizing below reads better as one named block than as a
     utility stack.

     The label, not the input, carries the sizing: as a flex item with a definite flex-basis it
     grows to 20rem when the row has room and shrinks below that (down to 3rem) when it does not,
     so the create row never overflows or wraps at narrow viewports. The input then fills its
     label at 100%, which resolves cleanly here because the label (unlike `.input`'s auto-sized
     flex-col containing block) now has a definite computed width from the flex algorithm. */
  .signup-create-label {
    flex: 1 1 0;
    min-width: 3rem;
    max-width: 20rem;
  }

  .signup-create-field {
    width: 100%;
  }

  .signup-create-submit {
    flex-shrink: 0;
  }
</style>
```

Its `+page.server.ts`, which reads and writes the developer's `signups` table through a D1
binding the site declares itself. The access rule it relies on lives in the showcase adapter's
`access` member; a site that copies the screen adds its rule for the route.

```ts
// Archetype: the custom admin screen over the site's table.
// Atoms: requireAccess, createSectionAction, createLogger.
// Recipe: docs/extend/add-a-custom-admin-screen.md.
//
// A developer's custom admin screen, proving the extension seam. It is a concrete route
// under /admin (so it wins over the catch-all), inherits the guard-populated locals.cairnEditor, renders
// inside the shared CairnAdminShell from the parent layout, and reads and writes its APP_DB
// binding (the engine never touches it). requireAccess on the load and the section action's
// access check on each form action resolve against the same site access map, so a denied POST's
// page render exposes nothing the load would already have refused; the ownerOnly nav flag is
// cosmetic only.
import type { PageServerLoad, Actions } from './$types';
import { env } from 'cloudflare:workers';
import { createSectionAction, requireAccess } from '@glw907/cairn-cms/sveltekit';
import { error, fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { log } from '#lib/log.js';

/** A signup row, the developer's table shape, read from APP_DB. */
interface SignupRow {
  id: number;
  name: string;
  email: string;
}

// A deployed Worker always carries APP_DB (wrangler.jsonc binds it); its absence is a
// deployment misconfiguration, not a request-shaped failure, so it logs with the engine's
// area.subject.verb_phrase grammar (section-action.ts's admin.action.misconfigured) and fails
// closed with a generic 500 rather than leaking binding detail to the client. The load resolves
// the binding this way because createSectionAction wraps form actions only; requireAccess and
// requireOwner are the documented gates for a load.
function requireAppDb(): D1Database {
  const db: D1Database | undefined = env.APP_DB;
  if (!db) {
    log.error('admin.signups.misconfigured', { reason: 'db_not_bound' });
    error(500, 'This screen is not configured.');
  }
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

// This screen's job is to teach the documented path, so it copies the wrapper rather than the
// minimum that compiles: createSectionAction (@glw907/cairn-cms/sveltekit) is what a site's
// admin section reaches for, and a developer copying this route should carry it across. It
// composes the editor, CSRF and audit contract onto every action and resolves the section's
// binding, so no action re-implements a gate the engine already owns.
//
// It is fail-closed on every call, unlike createAdminAction's opt-in access option: the site's access
// declaration (the adapter's `access` member in src/theme/cairn.config.ts) must carry a rule
// admitting the session for this route, or the action refuses with a 403 it never explains to the
// browser, and a route no hook attached the map to refuses with a 500. ownerOnly stacks on top of that map check for the destructive
// action, never in place of it.
const sectionAction = createSectionAction<Env, D1Database>({
  resolveDb: (workerEnv: Env | undefined) => workerEnv?.APP_DB,
});

export const actions: Actions = {
  create: sectionAction(
    async ({ form, ctx }) => {
      const name = String(form.get('name') ?? '').trim();
      const email = String(form.get('email') ?? '').trim();
      // A rejected request mutated nothing, so it owes no audit record.
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
    // The destructive action keeps the owner gate the map check alone would not supply: every
    // role the map admits may add a signup, only an owner may remove one.
    { action: 'remove', entity: 'signup', ownerOnly: true },
  ),
};
```

## What this exemplar doesn't cover

The shipped screen's inline create form and its delete confirm are forms and dialogs, not list
concerns; their field-label register is `form-anatomy.md`'s subject, and the dialog's one filled
action is covered in `exemplar-detail.md`. The detail screen a panel's "Open signup" link would
open is also `exemplar-detail.md`.
