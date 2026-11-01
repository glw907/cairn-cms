# Exemplar: a detail screen

## Contents

- [Anatomy](#anatomy)
- [A custom detail route is an office screen to the audit](#a-custom-detail-route-is-an-office-screen-to-the-audit)
- [The header](#the-header)
- [A card section](#a-card-section)
- [An edit dialog](#an-edit-dialog)
- [Checkbox rows](#checkbox-rows)

A detail screen shows one record, its sections of related data, and the dialogs that change it:
for example `/admin/signups/[id]`, reached from a list row. Gate it like any screen
(`custom-screen.md`); a parameterized route may need an explicit access target
(`sidebar-and-access.md`).

## Anatomy

A back link, a header with the record's identity, its status chip, and light verbs, then a stack
of cards (Contact, Guests, Payments, Notes), each opening a dialog for a heavier verb. The header
is hand-written because `PageHeader`'s one-child `action` slot cannot hold a chip and several
verbs.

## A custom detail route is an office screen to the audit

The shell treats a route as a desk only when it has three segments and the second names a
content concept. `/admin/signups/<id>` does not, so it renders as an office screen and
`screen-anatomy` expects one `h1` and a `card-shell` region. Write cards as
`card-shell card-shadow p-6`, never a hand-assembled `rounded-box border ... shadow-[...]`
literal; the literal is not the class the rule looks for, and it drifts.

The page underneath keeps zero fills. Each open dialog is its own surface with exactly one fill.

## The header

```svelte
<header class="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    <span class={HEADER_CELL}>Signups</span>
    <h1 class="type-title font-bold font-[family-name:var(--font-display)]">{desk.name}</h1>
    {#if desk.email}<p class="type-body text-muted">{desk.email}</p>{/if}
  </div>
  <div class="flex items-center gap-2">
    <StatusChip label={chip.label} register={chip.register} />
    <button type="button" class="btn btn-ghost btn-sm" onclick={openSignupDialog}>Edit signup</button>
    <button type="button" class="btn btn-ghost btn-sm" onclick={openMoveDialog}>Move&hellip;</button>
  </div>
</header>
```

- The eyebrow plus `h1` is the same identity pattern `PageHeader` renders. Use `type-title`,
  not `text-2xl`, and no `tracking-tight`.
- The status is a `StatusChip`, never a hand-built `badge` from a class map.
- Header verbs are `btn btn-ghost btn-sm`. A destructive verb adds `text-error` ink, never a
  fill: each opens a second surface rather than acting in place.

## A card section

```svelte
<div class="card-shell card-shadow p-6">
  <div class="flex items-center justify-between">
    <h2 class={HEADER_CELL}>Guests</h2>
    <button type="button" class="btn btn-ghost btn-xs" onclick={openAddGuestDialog}>Add guest</button>
  </div>
  <ul role="list" class="mt-3 flex flex-col divide-y divide-[var(--cairn-card-border)]">
    {#each desk.guests as guest (guest.id)}
      <li role="listitem" class="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
        <div>
          <p class="font-semibold">{guest.name}</p>
          <p class="type-body text-muted">{guest.email ?? 'No email on file'}</p>
        </div>
        <div class="flex items-center gap-2">
          {#if guest.cancelled}<StatusChip label="Cancelled" />{/if}
          <button type="button" class="btn btn-ghost btn-xs" onclick={() => editGuest(guest)}>Edit</button>
        </div>
      </li>
    {/each}
  </ul>
</div>
```

- One section heading in the eyebrow role, beside at most one light verb a size below the
  header's (`btn-xs`).
- The list's `flex` items suppress the marker, so the list carries `role="list"` and each item
  `role="listitem"` (`list-role`).
- Every row verb is `btn btn-ghost btn-xs`, destructive ones included.
- A divided list (`divide-y` in the card-border token) separates a feed of related records; zebra
  stripes are for a scannable table.
- A settled state such as Cancelled or Refunded is the default `quiet` chip, not a faded badge.

## An edit dialog

```svelte
<dialog bind:this={signupDialog} class="modal" aria-labelledby="signup-dialog-title">
  <div class="modal-box">
    <h2 id="signup-dialog-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Edit signup</h2>
    <form method="POST" action="?/updateSignup" class="flex flex-col gap-3" use:enhance={onSave}>
      <CsrfField />
      <FieldLabel label="Name">
        <input class="input input-sm" name="name" bind:value={signupName} />
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

`FieldLabel` defaults to the stacked register, right for a single-column dialog
(`form-anatomy.md`). The footer pair, plain Cancel beside filled Save, is the dialog's one fill.
Handle all four `enhance` result types (`custom-screen.md`).

## Checkbox rows

A `checkbox-sm` renders 20px, under `touch-targets`' 24px floor. The control's activating label
counts toward its target, so wrap the checkbox in a padded `<label>` (never a `::before` that a
truncating ancestor clips) until the row measures at least 24px.
