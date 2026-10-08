# Exemplar: a detail screen

Load this when building or reviewing a detail (desk) screen: a single record's own full
picture, its own sections of related data, and the dialogs that mutate it.

Source: the Signups screen every scaffolded site ships at `/admin/signups`
(`src/routes/admin/signups/+page.svelte`). The scaffold has no detail route; what it does ship
is one real dialog, the shared delete confirm, and the form-and-outcome wiring a detail screen's
dialogs reuse. This file annotates that dialog where it applies and shows, under a **Growth**
label, the detail route a developer builds next: `/admin/signups/<id>`, one signup's own page,
reached from a list row. Growth snippets are not shipped code. They are written in the Signups
vocabulary and assume the developer's own tables carry the related data (guests, payments,
notes) the cards show. Several annotations translate the markup into the cairn-native call
(`StatusChip` registers, the `card-shell card-shadow` primitive) rather than transcribing it.

## Anatomy at a glance

Growth: a back link, a header with the record's identity and its light verbs, then a stack of
cards (Contact, Guests, Payments, Notes), each opening its own dialog for a heavier verb (edit,
add, move, record a payment, refund). No `PageHeader`: a desk route's own header is bespoke
because it carries state (a status chip) and several verbs a generic header snippet doesn't
have vocabulary for.

## This screen renders as an office route, and screen-anatomy does flag it

`screen-anatomy`'s desk exemption is earned by the admin shell's own concept-based route
classification, never by a screen being conceptually a desk (`screen-anatomy.ts`'s own
comment: "The exemption is read off the RENDER, never off the path, and that is the whole
point"). The shell's `isDeskRoute` (`CairnAdminShell.svelte`) requires the path to have exactly
three segments and the SECOND segment to name a registered content concept; this desk lives at
`/admin/signups/<id>`, whose second segment is `signups`, which is not one of the site's
registered content concepts. The shell therefore renders the office drawer class
(`lg:drawer-open`), and `screen-anatomy` reads that render and judges the page as an office
screen, not a desk.

That matters because a card written as a hand-assembled literal (the `cardCls` shown below)
is not the class `.card-shell`, and `screen-anatomy` looks for that class name to find the card
region. A desk whose cards carry only the literal draws the rule's "this office route renders no
`.card-shell` region inside `<main>`" advisory. That is not a false positive to allowlist; it is
the same drift the next section's recipe already fixes: swapping `cardCls` for
`card-shell card-shadow` both satisfies the rule and is the cairn-native call on its own terms.

One check still applies regardless of how a given route classifies, because it's judgment
rather than a mechanical check the rule can scope by route: **one filled action per surface.**
This page holds several open dialogs, and each dialog is its own surface (`one-filled-action`
reads the topmost open layer). The page underneath keeps zero fills; every dialog keeps
exactly one (its own "Save", or the destructive confirm's error-toned fill).

## The header: identity, status, and light verbs

```svelte
<header class="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    <span class={HEADER_CELL}>Signups</span>
    <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">{desk.name}</h1>
    {#if desk.email}<p class="text-sm text-muted">{desk.email}</p>{/if}
  </div>
  <div class="flex items-center gap-2">
    {#if status}
      <span class="badge {chip.cls}">{chip.label}</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick={...}>Cancel signup&hellip;</button>
    {/if}
    <button type="button" class="btn btn-ghost btn-sm" onclick={openSignupDialog}>Edit signup</button>
    <button type="button" class="btn btn-ghost btn-sm" onclick={...}>Move&hellip;</button>
  </div>
</header>
```

- The eyebrow (`HEADER_CELL`, `type-label` in cairn's vocabulary) plus the `h1` is the same
  identity pattern the list exemplar's `PageHeader` carries, hand-rolled here because the
  header's right side needs room for a chip and three verbs a header snippet's own `action`
  slot (one child) can't hold.
  `type-title font-bold font-[family-name:var(--font-display)]` is a cairn-native rewrite of
  the literal `text-2xl font-bold tracking-tight`. Both resolve to the same 1.5rem, but the
  role utility carries the ruled leading and drops the `tracking-tight`, which the admin
  design system reserves for the wordmark's own K4 correction, not a page heading.
- The status badge (`<span class="badge {chip.cls}">`) is a hand-assembled daisyUI badge from
  a per-status class map. A cairn-native build calls
  `<StatusChip label={...} register={...} />` instead: the header's own identity chip is
  exactly the kind of state a reader needs to register at a glance (Pending) or can safely
  skim past (Confirmed), so which register applies is the same judgment call
  `exemplar-list.md` walks through for the same status vocabulary.
- Every header verb here is `btn btn-ghost btn-sm` (one carries `text-error` for the
  destructive "Cancel signup" direction, ink-color only, still no fill). None of the three
  competes with a dialog's own filled Save; ghost is the correct weight for a verb that
  opens a second surface rather than acting immediately in place.

## The card: the shell recipe

```svelte
const cardCls = 'rounded-box border border-[var(--cairn-card-border)] bg-base-100 p-6 shadow-[var(--cairn-shadow)]';
```

This literal is what `card-shell card-shadow` replaces: the two safelisted container-role
utilities that resolve to the identical radius, hairline border, fill, and elevation
(`docs/reference/admin-grammar-tokens.md`, "Container roles"). A cairn-native build writes
`class="card-shell card-shadow p-6"` instead of restating the recipe by hand. That was the
whole point of graduating those two utilities: a repeated literal like this one is a
drift risk a role name isn't.

## The section: heading, one light verb, a list of rows

```svelte
<div class={cardCls}>
  <div class="flex items-center justify-between">
    <h2 class={HEADER_CELL}>Guests</h2>
    <button type="button" class="btn btn-ghost btn-xs" onclick={openAddGuestDialog}>Add guest</button>
  </div>
  <ul class="mt-3 flex flex-col divide-y divide-[var(--cairn-card-border)]">
    {#each desk.guests as guest (guest.id)}
      <li class="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
        <div>
          <p class="font-semibold {guest.cancelled ? 'opacity-50' : ''}">{guest.name}</p>
          <p class="text-sm text-muted">{guest.email ?? 'No email on file'}</p>
        </div>
        <div class="flex items-center gap-2">
          {#if guest.cancelled}<StatusChip label="Cancelled" />{/if}
          <a class="btn btn-ghost btn-xs" href="...">Notes</a>
          <button type="button" class="btn btn-ghost btn-xs" onclick={...}>Edit</button>
          ...
        </div>
      </li>
    {/each}
  </ul>
</div>
```

Every card in this screen (Contact, Guests, Payments, Notes) repeats this same skeleton:
`type-label` section heading beside at most one light verb, then a divided list of rows, each
row a two-part flex (identity block, then chips-plus-verbs block). This is the detail screen's
own register, worth naming because it recurs once per card rather than once:

- **The section heading's own light verb stays `btn-ghost btn-xs`**, one size down from the
  header's own `btn-sm` verbs, since a section-scoped action ("Add guest") is a lower-stakes
  ask than a record-scoped one ("Edit signup").
- **The fence above writes the cairn-native call, `<StatusChip label="Cancelled" />`.**
  A hand-written badge for "Cancelled" or "Refunded" would read
  `badge-ghost badge-sm font-medium opacity-60`, the ghost recipe cairn's own audit retires
  (`stock-default-hazards`'s `BADGE_GHOST_MESSAGE`). "Cancelled" and "Refunded" are the
  settled, put-away states `StatusChip`'s default `quiet` register exists for, and it carries
  the documented recipe rather than a hand-tuned opacity demotion.
- **Row-level verbs are uniformly `btn-ghost btn-xs`**, whether the row's own action is
  benign (Edit, Move) or destructive (Cancel, carrying `text-error` on the label, still no
  fill). A row can hold several verbs at once without ever competing for the surface's one
  fill, because none of them is one.
- **The divider (`divide-y divide-[var(--cairn-card-border)]`) plus `py-3 first:pt-0
  last:pb-0`** is the row-rhythm a repeated list uses instead of the table zebra
  `exemplar-list.md` covers; a desk's own related-data lists read as a flat feed of
  records, not a scannable grid, so a divider carries the separation a zebra stripe would
  overstate here.

## The dialog: one filled action, and the label register in practice

Shipped, the Signups screen's shared delete confirm, one dialog serving every row:

```svelte
<dialog class="modal" role="alertdialog" aria-modal="true" aria-labelledby="signup-delete-title" bind:this={deleteDialog}>
  <div class="modal-box">
    <h2 id="signup-delete-title" class="type-heading font-bold">Delete {pendingDeleteName}?</h2>
    <p class="mb-3 type-body">This cannot be undone.</p>
    <form method="POST" action="?/remove" class="flex justify-end gap-2" use:enhance={onRemove}>
      <CsrfField />
      <input type="hidden" name="id" value={pendingDeleteId} />
      <button type="button" class="btn btn-sm" onclick={cancelDelete}>Cancel</button>
      <button type="submit" class="btn btn-sm btn-error">Delete</button>
    </form>
  </div>
</dialog>
```

Growth, the edit dialog a desk header opens:

```svelte
<dialog bind:this={signupDialog} class="modal" aria-labelledby="signup-dialog-title">
  <div class="modal-box">
    <h2 id="signup-dialog-title" class="text-lg font-bold">Edit signup</h2>
    <form method="post" action="?/updateSignup" class="flex flex-col gap-3" use:enhance={...}>
      <CsrfField />
      <FieldLabel label="Name">
        <input class="input input-sm" name="name" bind:value={signupName} />
      </FieldLabel>
      <FieldLabel label="Email">
        <input class="input input-sm" name="email" bind:value={signupEmail} />
      </FieldLabel>
      <FieldLabel label="Status">
        <select class="select select-sm" name="status" bind:value={signupStatus}>...</select>
      </FieldLabel>
      <div class="modal-action">
        <button type="button" class="btn btn-sm" onclick={() => signupDialog?.close()}>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm">Save</button>
      </div>
    </form>
  </div>
</dialog>
```

- The shipped confirm is the destructive-dialog recipe: a native `<dialog>` opened with
  `showModal` (native focus trap and Escape), `role="alertdialog"`, and no `method="dialog"`
  backdrop, so a stray click cannot dismiss it. One dialog serves every row by setting the
  pending row's id and name from the trigger, so the heading's `aria-labelledby` names the row
  being deleted. Its one fill is the error-toned submit, beside a plain `Cancel`.
- Each row of the edit dialog composes `FieldLabel` directly around a bare control (an
  `<input>`, or a `<select>` for the status row), rendering its default `register="stacked"`
  register here with no extra prop (`form-anatomy.md` states the full three-level contract this
  is one of); a single-column dialog form has no shared-row width to compete for, so the default
  is the right choice, not a call for the inline exception.
- `modal-action`'s two-button pattern, plain `Cancel` beside filled `Save`, is this dialog's
  own `one-filled-action` surface satisfied: exactly one accent fill, and it's the
  submitting action. Every dialog on the page repeats the identical pair.
- `<h2 class="text-lg font-bold">` is the dialog title's own register: a cairn-native build
  writes `type-heading font-bold font-[family-name:var(--font-display)]`, the same Heading
  recipe the admin design system states for a dialog or section heading (18px in Bricolage);
  `text-lg` (1.125rem) already matches the size, so only the display face and the ruled
  leading are missing from the literal. The shipped confirm already writes `type-heading
  font-bold`.

## The cancel-guests dialog: an inline label beside a checkbox

```svelte
<label class="flex items-center gap-2" for={`guest-select-${guest.id}`}>
  <input id={...} type="checkbox" class="checkbox checkbox-sm" name="guestIds" ... />
</label>
```

A checkbox's own clickable label area is a touch target in `touch-targets`'s own sense: the
label, even carrying no visible text here (the accessible name comes from `aria-label` on
the input), still counts as one of the regions the rule unions with the control's own box.
`checkbox-sm` renders 20px; a real hit-area expansion (padding, never a `::before` clipped by
a truncating ancestor) is what closes that gap when a checkbox row measures under the 24px
floor, the same touch-target fix cairn's own `ConceptList` sort controls needed for the same
reason.

## What this exemplar doesn't cover

The group-level dialogs this screen opens (signup edit, add or edit guest, record a payment)
are each a small form; their own row/label composition, including the wrap failure a wider
two-column form can hit, is `form-anatomy.md`'s subject.
