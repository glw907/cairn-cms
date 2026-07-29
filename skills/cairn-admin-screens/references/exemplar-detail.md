# Exemplar: a detail screen

Load this when building or reviewing a detail (desk) screen: a single record's own full
picture, its own sections of related data, and the dialogs that mutate it.

Source: the same consumer site's member-detail desk (the record its list screen's own
"Open household" link opens), a production `/admin` extension route. It predates cairn's later ratified rules (`StatusChip`
registers, the `card-shell card-shadow` primitive), so several annotations below translate
its shipped markup into the cairn-native call rather than transcribing it as-is; the
annotation says which is which.

## Anatomy at a glance

A back link, a header with the record's identity and its light verbs, then a stack of cards
(Roster, Memberships, Money timeline, Assets), each opening its own dialog for a heavier
verb (edit, add, move, record a payment, refund). No `PageHeader`/`OfficeList`: a desk
route's own header is bespoke because it carries state (a standing chip) and several verbs a
generic header snippet doesn't have vocabulary for.

## This screen renders as an office route, and screen-anatomy does flag it

`screen-anatomy`'s desk exemption is earned by the admin shell's own concept-based route
classification, never by a screen being conceptually a desk (`screen-anatomy.ts`'s own
comment: "The exemption is read off the RENDER, never off the path, and that is the whole
point"). The shell's `isDeskRoute` (`CairnAdminShell.svelte:403-406`) requires the path's
SECOND segment to name a registered content concept; this desk lives at
`/admin/club/members/<id>`, whose second segment is `club`, which is not one of the site's
registered content concepts. The shell therefore renders the office
drawer class (`lg:drawer-open`), and `screen-anatomy` reads that render and judges the page
as an office screen, not a desk.

That matters because this screen's own card markup predates `card-shell`: every card writes
the `cardCls` literal shown below rather than the class `.card-shell`, and `screen-anatomy`
looks for that literal class name to find the card region. Since none of this screen's cards
carry it, the shipped screen DOES draw the rule's "this office route renders no `.card-shell`
region inside `<main>`" advisory. That is not a false positive to allowlist; it is the same
drift the next section's recipe already fixes: swapping `cardCls` for `card-shell card-shadow`
both satisfies the rule and is the cairn-native call on its own terms.

One check still applies regardless of how a given route classifies, because it's judgment
rather than a mechanical check the rule can scope by route: **one filled action per surface.**
This page holds several open dialogs, and each dialog is its own surface (`one-filled-action`
reads the topmost open layer). The page underneath keeps zero fills; every dialog keeps
exactly one (its own "Save").

## The header: identity, standing, and light verbs

```svelte
<header class="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    <span class={HEADER_CELL}>Club</span>
    <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">{desk.name}</h1>
    {#if desk.city}<p class="text-sm text-muted">{desk.city}</p>{/if}
  </div>
  <div class="flex items-center gap-2">
    {#if standing}
      <span class="badge {chip.cls}">{chip.label}</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick={...}>Mark Former&hellip;</button>
    {/if}
    <button type="button" class="btn btn-ghost btn-sm" onclick={openHouseholdDialog}>Edit household</button>
    <button type="button" class="btn btn-ghost btn-sm" onclick={...}>Merge in&hellip;</button>
  </div>
</header>
```

- The eyebrow (`HEADER_CELL`, `type-label` in cairn's vocabulary) plus the `h1` is the same
  identity pattern the list exemplar's `OfficeList` header carries, hand-rolled here because
  the header's right side needs room for a chip and three verbs a header snippet's own
  `action` slot (one child) can't hold.
  `type-title font-bold font-[family-name:var(--font-display)]` is a cairn-native rewrite of
  the literal `text-2xl font-bold tracking-tight`. Both resolve to the same 1.5rem, but the
  role utility carries the ruled leading and drops the `tracking-tight`, which the admin
  design system reserves for the wordmark's own K4 correction, not a page heading.
- The standing badge (`<span class="badge {chip.cls}">`) is a hand-assembled daisyUI badge
  from a per-standing class map, predating `StatusChip`'s register work. A cairn-native
  build calls `<StatusChip tone={...} label={...} register={...} />` instead: the header's
  own identity chip is exactly the kind of state a reader needs to register at a glance
  (Overdue) or can safely skim past (Current), so which register applies is the same
  judgment call `exemplar-list.md` walks through for the same standing vocabulary.
- Every header verb here is `btn btn-ghost btn-sm` (one carries `text-error` for the
  destructive "Mark Former" direction, ink-color only, still no fill). None of the three
  competes with a dialog's own filled Save; ghost is the correct weight for a verb that
  opens a second surface rather than acting immediately in place.

## The card: the shell recipe

```svelte
const cardCls = 'rounded-box border border-[var(--cairn-card-border)] bg-base-100 p-6 shadow-[var(--cairn-shadow)]';
```

This literal predates `card-shell card-shadow`, the two safelisted container-role utilities
that resolve to the identical radius, hairline border, fill, and elevation
(`docs/reference/admin-grammar-tokens.md`, "Container roles"). A cairn-native build writes
`class="card-shell card-shadow p-6"` instead of restating the recipe by hand. That was the
whole point of graduating those two utilities: a repeated literal like this one is a
drift risk a role name isn't.

## The section: heading, one light verb, a list of rows

```svelte
<div class={cardCls}>
  <div class="flex items-center justify-between">
    <h2 class={HEADER_CELL}>Roster</h2>
    <button type="button" class="btn btn-ghost btn-xs" onclick={openAddMemberDialog}>Add member</button>
  </div>
  <ul class="mt-3 flex flex-col divide-y divide-[var(--cairn-card-border)]">
    {#each desk.roster as member (member.id)}
      <li class="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
        <div>
          <p class="font-semibold {member.archived ? 'opacity-50' : ''}">{member.name}{member.isPrimary ? ' · Primary' : ''}</p>
          <p class="text-sm text-muted">{member.email ?? 'No email on file'} &middot; ...</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge {visibility.cls}">{visibility.label}</span>
          {#if member.archived}<span class="badge badge-ghost badge-sm font-medium opacity-60">Archived</span>{/if}
          <a class="btn btn-ghost btn-xs" href="...">Signatures</a>
          <button type="button" class="btn btn-ghost btn-xs" onclick={...}>Edit</button>
          ...
```

Every card in this screen (Roster, Memberships, Money timeline, Assets) repeats this same
skeleton: `type-label` section heading beside at most one light verb, then a divided list of
rows, each row a two-part flex (identity block, then chips-plus-verbs block). This is the
detail screen's own register, worth naming because it recurs four times in one file rather
than once:

- **The section heading's own light verb stays `btn-ghost btn-xs`**, one size down from the
  header's own `btn-sm` verbs, since a section-scoped action ("Add member") is a lower-stakes
  ask than a record-scoped one ("Edit household").
- **`badge-ghost badge-sm font-medium opacity-60` for "Archived"/"Refunded"** is exactly the
  ghost recipe cairn's own audit now retires (`stock-default-hazards`'s
  `BADGE_GHOST_MESSAGE`). A cairn-native build reaches for `<StatusChip register="quiet" .../>`
  instead: "Archived" and "Refunded" are precisely the settled, put-away states the `quiet`
  register exists for, and it carries the ratified recipe rather than a hand-tuned opacity
  demotion.
- **Row-level verbs are uniformly `btn-ghost btn-xs`**, whether the row's own action is
  benign (Edit, Move) or destructive (Archive, carrying `text-error` on the label, still no
  fill). A row can hold several verbs at once without ever competing for the surface's one
  fill, because none of them is one.
- **The divider (`divide-y divide-[var(--cairn-card-border)]`) plus `py-3 first:pt-0
  last:pb-0`** is the row-rhythm a repeated list uses instead of the table zebra
  `exemplar-list.md` covers; a desk's own related-data lists read as a flat feed of
  records, not a scannable grid, so a divider carries the separation a zebra stripe would
  overstate here.

## The dialog: one filled action, and the label register in practice

```svelte
<dialog bind:this={householdDialog} class="modal" aria-labelledby="household-dialog-title">
  <div class="modal-box">
    <h2 id="household-dialog-title" class="text-lg font-bold">Edit household</h2>
    <form method="post" action="?/updateHousehold" class="flex flex-col gap-3" use:enhance={...}>
      <CsrfField />
      <TextField label="Household name" name="name" bind:value={householdName} />
      <TextField label="City" name="city" bind:value={householdCity} />
      <SelectField label="Primary member" name="primaryMemberId" bind:value={householdPrimaryId} options={...} />
      <div class="modal-action">
        <button type="button" class="btn btn-sm" onclick={() => householdDialog?.close()}>Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm">Save</button>
      </div>
    </form>
  </div>
</dialog>
```

- `TextField`/`SelectField` both wrap `FieldLabel`, the inline control-adjacent register
  (`form-anatomy.md` states the full three-level contract this is one of).
- `modal-action`'s two-button pattern, plain `Cancel` beside filled `Save`, is this dialog's
  own `one-filled-action` surface satisfied: exactly one accent fill, and it's the
  submitting action. Every dialog in this file repeats the identical pair.
- `<h2 class="text-lg font-bold">` is the dialog title's own register: a cairn-native build
  writes `type-heading font-bold font-[family-name:var(--font-display)]`, the same Heading
  recipe the admin design system states for a dialog or section heading (18px in Bricolage);
  `text-lg` (1.125rem) already matches the size, so only the display face and the ruled
  leading are missing from the literal.

## The refund dialog: an inline label beside a checkbox

```svelte
<label class="flex items-center gap-2" for={`refund-select-${line.id}`}>
  <input id={...} type="checkbox" class="checkbox checkbox-sm" name="lineIds" ... />
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

The three group-level dialogs this screen opens (household edit, add/edit member, record a
payment) are each a small form; their own row/label composition, including the wrap failure
a wider two-column form can hit, is `form-anatomy.md`'s subject.
