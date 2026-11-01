# Exemplar: a list screen

## Contents

- [Anatomy](#anatomy)
- [The header: one filled action](#the-header-one-filled-action)
- [The toolbar](#the-toolbar)
- [The table](#the-table)
- [Status chips](#status-chips)
- [The expand-in-place panel](#the-expand-in-place-panel)
- [Pagination](#pagination)
- [The shared delete confirm](#the-shared-delete-confirm)

A list screen is a table over a collection, with the search, filters, and in-place detail a
longer list needs. The server side is in `custom-screen.md`. The vocabulary below is a Signups
screen with a `status` column (`pending`, `confirmed`, `waitlisted`).

## Anatomy

A short list: `PageHeader` plus one `AdminTable` in a card. A longer one adds one toolbar band,
expandable rows, chips, and a pagination footer, all from the toolkit with no bespoke layout:
`PageHeader`, `ListToolbar`, `AdminTable` with `ExpandableRow`, `StatusChip`, `Pagination`.

## The header: one filled action

```svelte
<PageHeader eyebrow="Site" title="Signups">
  {#snippet action()}
    <button type="button" class="btn btn-primary btn-sm" onclick={openAddSignupDialog}>Add signup</button>
  {/snippet}
</PageHeader>
```

- `PageHeader` alone satisfies `screen-anatomy`'s `h1` and header check; the table's card is
  the `card-shell` region the rule also wants.
- The eyebrow names the sidebar section the screen sits under.
- Leave `meta` unset when a toolbar shows the count line; two count lines race each other.
- The create action is the screen's one fill, in the header's `action` slot. An inline create
  form with a filled submit below the header reads as a buried primary action to
  `screen-anatomy`; move it into a dialog the header button opens.

## The toolbar

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

A filter is `'select'` or `'menu'` display. A menu facet:

```ts
let includeArchived = false;

export const archivedFilter = {
  id: 'archived',
  label: 'Archived',
  value: includeArchived ? 'include' : 'active',
  defaultValue: 'active',
  display: 'menu',
  options: [
    { value: 'active', label: 'Active only' },
    { value: 'include', label: 'Include archived' },
  ],
  onChange: (value: string) => (includeArchived = value === 'include'),
};
```

- Every facet stays quiet until its value departs `defaultValue`; never give one `btn-primary`.
- Pass `itemLabel` as `{ one, many }`, never a bare string, so one row reads "1 signup".
- `searchLabel` is the field's accessible name; say what the search matches.

## The table

```svelte
<div class="overflow-hidden card-shell card-shadow">
  <AdminTable density="sm" zebra rowCount={paged.length} emptyColspan={4}>
    {#snippet header()}
      <th class={HEADER_CELL}>Name</th>
      <th class={HEADER_CELL}>Guests</th>
      <th class={HEADER_CELL}>Status</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    {/snippet}
    ...
  </AdminTable>
</div>
```

- The card takes `overflow-hidden` (`card-shell` rounds but does not clip) and never
  `overflow-x-auto`: `AdminTable`'s own wrap is the one scroll container.
- `HEADER_CELL` is the eyebrow recipe, `type-label font-semibold uppercase tracking-[0.08em]
  text-muted`, the same role as a section eyebrow. A column of row verbs gets an `sr-only` name.
- Cells use `type-body`; the row's subject cell adds `font-semibold`, and a qualifier
  ("+2 guests") steps down to `type-meta`.
- Row verbs are `btn btn-ghost btn-xs`, never filled.

## Status chips

```svelte
<StatusChip
  register={SIGNUP_STATUS_REGISTER[row.status]}
  label={SIGNUP_STATUS_LABEL[row.status]}
  legend={row.status === 'waitlisted' && row.position ? `Position ${row.position} on the waitlist` : undefined}
/>
```

Decide each state's register by what it asks of the reader: Pending needs a decision, so
`warning`; Confirmed is settled, so `quiet`; Waitlisted is a transient absence, so `outline`. In
a cell that budgets its width, use `size="xs"`. Never write `badge-ghost` or another stock badge
variant for a status.

## The expand-in-place panel

```svelte
{#snippet panel(datum: SignupRow)}
  <div class="signup-panel">
    <section>
      <h2 class={HEADER_CELL}>Contact</h2>
      ...
    </section>
  </div>
{/snippet}
```

- `ExpandableRow` supplies the summary row, the trigger cell, and the spanning panel cell; the
  panel's internal grid is the screen's own (a scoped class).
- Panel section headings reuse the eyebrow role.
- Panel actions are plain `btn btn-sm`. A panel that needs its own filled action should be a
  detail route (`exemplar-detail.md`), not a second fill on this surface.

## Pagination

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

## The shared delete confirm

One dialog serves every row: the trigger sets the pending row's id and name, then opens it.

```svelte
<script lang="ts">
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '$app/forms';
  import { CsrfField } from '@glw907/cairn-cms/admin';

  let deleteDialog = $state<HTMLDialogElement | null>(null);
  let pendingDeleteId = $state<number | null>(null);
  let pendingDeleteName = $state('');

  export function confirmDelete(id: number, name: string) {
    pendingDeleteId = id;
    pendingDeleteName = name;
    // Open after Svelte flushes the name, or the dialog's label names the previous row.
    void tick().then(() => deleteDialog?.showModal());
  }

  const onRemove: SubmitFunction = () => async ({ result, update }) => {
    if (result.type === 'success') deleteDialog?.close();
    await update();
  };
</script>

<dialog
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="signup-delete-title"
  bind:this={deleteDialog}
>
  <div class="modal-box">
    <h2 id="signup-delete-title" class="type-heading font-bold">Delete {pendingDeleteName}?</h2>
    <p class="mb-3 type-body">This cannot be undone.</p>
    <form method="POST" action="?/remove" class="flex justify-end gap-2" use:enhance={onRemove}>
      <CsrfField />
      <input type="hidden" name="id" value={pendingDeleteId} />
      <button type="button" class="btn btn-sm" onclick={() => deleteDialog?.close()}>Cancel</button>
      <button type="submit" class="btn btn-sm btn-error">Delete</button>
    </form>
  </div>
</dialog>
```

The trigger is `btn btn-ghost btn-xs` with `aria-haspopup="dialog"` and an `aria-label` naming
the row. `role="alertdialog"` and no `method="dialog"` backdrop mean a stray click cannot dismiss
it. The error-toned submit is the dialog's one fill; a dialog is its own surface.
