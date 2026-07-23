<!--
@component
One concept's list view, dressed to the office gold standard and built on the admin toolkit. A
toolbar partitions by publish state (a segmented filter with live counts) beside an orthogonal
Hidden filter. The list is a sortable table of one-line rows composed at the document list's 3xl
natural measure: the title, the date, the publish-state chip, and a quiet delete action. A draft
row de-emphasizes and carries an eye-off Hidden tag inline beside the title. The header's New
button is the one create affordance on a populated list (the empty state carries its own CTA).
Filtering, sorting, and paging run over the loaded entries in component state.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { DeleteRefusal, EntrySummary, ListData } from '../sveltekit/content-routes.js';
  import CsrfField from './CsrfField.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, PlusIcon, Trash2Icon } from './admin-icons.js';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import {
    PageHeader,
    ListToolbar,
    AdminTable,
    Pagination,
    StatusChip,
    EmptyState,
    formatCivilDate,
    itemNoun,
    type ListToolbarFilter,
  } from '../admin-toolkit/index.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
    /** The `?/delete` action result. A blocked delete returns the `DeleteRefusal` payload (the
     *  shared `error` summary, the refused entry id, and its inbound linkers), so the list names
     *  the blockers and refuses (block-until-clean). */
    form?: Partial<DeleteRefusal> | null;
  }

  let { data, form = null }: Props = $props();

  // The entry a `?/delete` refused, its inbound links, and which gate refused it, keyed by the
  // posted id. Null when the last submit succeeded, refused nothing, or none ran. `inboundKind`
  // defaults to `'link'`, mirroring the shared `DeleteRefusal` type's own default, so a fragment
  // the fragments gate blocked renders the include copy family and a fragment the links gate
  // blocked (a fragment can itself be a link target) still renders the link family.
  const deleteRefused = $derived(
    form?.inboundLinks?.length
      ? { id: form.id, inboundLinks: form.inboundLinks, inboundKind: form.inboundKind ?? 'link' }
      : null,
  );

  type SortKey = 'title' | 'date';
  // The triage runs on two independent axes. A pick-one publish-state partition (`all` passes
  // everything, `pending` is new + edited, `published` is live-as-is) and a separate Hidden
  // filter that composes with it. They are orthogonal: a published-but-hidden entry is on main
  // (so it counts as Published) and also hidden from the public site (so it counts as Hidden).
  type Partition = 'all' | 'pending' | 'published';
  let query = $state('');
  let partition = $state<Partition>('all');
  let hiddenOnly = $state(false);
  let sortKey = $state<SortKey>('date');
  // Newest first by default: a dated concept reads most-recent-on-top, the usual CMS convention.
  let sortAsc = $state(false);
  let pageSize = $state(10);
  let page = $state(1);

  // Triage counts over the full loaded set, each axis counted independently. Pending is new +
  // edited (status !== 'published'); Published is live-as-is (status === 'published'); Hidden is
  // the draft rows. The axes overlap: a published-but-hidden entry counts in BOTH Published and
  // Hidden. All is the unconditional total.
  const counts = $derived({
    all: data.entries.length,
    pending: data.entries.filter((e) => e.status !== 'published').length,
    published: data.entries.filter((e) => e.status === 'published').length,
    hidden: data.entries.filter((e) => e.draft).length,
  });

  // The three publish-state segments, in display order. Each names its partition value, its label,
  // and the count axis it shows; the toolbar's segmented filter loops these as its own options.
  const segments: { value: Partition; label: string; count: () => number }[] = [
    { value: 'all', label: 'All', count: () => counts.all },
    { value: 'pending', label: 'Pending edits', count: () => counts.pending },
    { value: 'published', label: 'Published', count: () => counts.published },
  ];

  function matchesPartition(entry: EntrySummary): boolean {
    switch (partition) {
      case 'pending':
        return entry.status !== 'published';
      case 'published':
        return entry.status === 'published';
      default:
        return true;
    }
  }

  // Compose the partition and the Hidden axis with the search query; sort and paging run
  // downstream. Hidden is orthogonal: when on, it narrows the partition to its draft rows.
  const filtered = $derived(
    data.entries.filter(
      (e) =>
        matchesPartition(e) &&
        (!hiddenOnly || e.draft === true) &&
        e.title.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );

  function setPartition(next: string) {
    partition = next as Partition;
    page = 1;
  }

  function setHiddenOnly(next: string) {
    hiddenOnly = next === 'hidden';
    page = 1;
  }

  function clearSearch() {
    query = '';
    page = 1;
  }

  // The toolbar's two independent segmented filters (the admin toolkit's ListToolbar): the
  // publish-state partition and the orthogonal Hidden filter. Both ride the same graduated
  // segmented-display contract (an ARIA radiogroup, roving tabindex, a non-color check glyph)
  // ConceptList's own pre-toolbar segmented control originated.
  const partitionFilter: ListToolbarFilter = $derived({
    id: 'partition',
    label: 'Filter by publish state',
    display: 'segmented',
    options: segments.map((seg) => ({ value: seg.value, label: seg.label, count: seg.count() })),
    value: partition,
    onChange: setPartition,
  });

  const hiddenFilter: ListToolbarFilter = $derived({
    id: 'hidden',
    label: 'Filter by visibility',
    display: 'segmented',
    options: [
      { value: 'all', label: 'Shown' },
      { value: 'hidden', label: 'Hidden', count: counts.hidden },
    ],
    value: hiddenOnly ? 'hidden' : 'all',
    onChange: setHiddenOnly,
  });

  // Hidden is a row treatment: a draft row de-emphasizes its TITLE by opacity (the title is
  // high-contrast base-content, so it stays above the AA text floor when dimmed). The already-muted
  // summary line is left at full strength: stacking opacity on muted text drops it below 4.5:1 in
  // the light theme, so the dimmed title plus the eye-off tag carry the "hidden" read instead.
  const draftDim = 'opacity-[0.62]';

  // Sort key for one entry: the lowercased title, or the ISO date string (lexical order is
  // chronological). A null date sorts as the empty string.
  function sortValue(entry: EntrySummary): string {
    if (sortKey === 'title') return entry.title.toLowerCase();
    return entry.date ?? '';
  }

  // Codepoint compare, matching the prior `<`/`>` ordering exactly. Avoids localeCompare so the
  // order stays identical to before this refactor.
  function compareStrings(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      const cmp = compareStrings(sortValue(a), sortValue(b));
      return sortAsc ? cmp : -cmp;
    }),
  );

  const pageCount = $derived(Math.max(1, Math.ceil(sorted.length / pageSize)));
  // Clamp the page when filtering shrinks the result set below the current page.
  $effect(() => {
    if (page > pageCount) page = pageCount;
  });
  const pageRows = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));

  function toggleSort(key: SortKey) {
    if (sortKey === key) sortAsc = !sortAsc;
    else {
      sortKey = key;
      sortAsc = true;
    }
    page = 1;
  }

  // --- create form state, shown in a header-triggered dialog ---
  let createDialog = $state<HTMLDialogElement>();
  // Pending from submit until the create navigation lands, so the button shows a calm working state.
  let creating = $state(false);
  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);
  // Default the date client-side so the SSR pass and hydration agree across UTC midnight.
  let dateDefault = $state('');
  $effect(() => {
    dateDefault = new Date().toISOString().slice(0, 10);
  });
  const derivedSlug = $derived(slugEdited ? slug : slugify(title));
  const slugPlaceholder = $derived(data.dated ? 'my-entry' : 'about-us');
  // The create affordances name one new item, so they read in the singular ("New post"), picked
  // through the toolkit's shared `itemNoun` grammar (the same one/many selector Pagination and
  // ListToolbar's count lines use) rather than a bespoke fallback. A count of 1 always resolves to
  // `one` when `singular` is set, and passing a bare string through `itemNoun` returns it unchanged
  // for a `singular`-less older caller on the descriptor's own default, which is the label (plural).
  const createNoun = $derived(itemNoun(1, data.singular ?? data.label));

  // Shared column-header typography: small uppercase muted labels. The sort buttons add their own
  // flex layout and a hover affordance on top of this.
  const headerLabel = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted';
  const sortButton = `inline-flex items-center gap-1 ${headerLabel} hover:text-base-content`;

  // The publish-all flash. A racing second admin can publish first, leaving this redirect
  // counting zero; say nothing then.
  const publishedAllMessage = $derived(
    data.publishedAll !== null && data.publishedAll > 0
      ? `Published ${data.publishedAll} ${data.publishedAll === 1 ? 'entry' : 'entries'}.`
      : '',
  );

  // The one lifecycle error to announce (the visible alerts below keep their own styling). A blocked
  // delete leads, then a form error, then a load error, since the refusal is the most recent and most
  // actionable outcome of the last submit. The refusal announcement carries the blocker count, so a
  // screen reader hears the magnitude (matching the visible banner) before navigating to the list.
  const lifecycleError = $derived.by(() => {
    if (!deleteRefused) return data.formError ?? data.error ?? '';
    const count = deleteRefused.inboundLinks.length;
    const blocker =
      deleteRefused.inboundKind === 'include'
        ? `${count} ${count === 1 ? 'entry includes' : 'entries include'} it.`
        : `${count} ${count === 1 ? 'page links' : 'pages link'} to it.`;
    return `This ${data.label.toLowerCase()} could not be deleted. ${blocker}`;
  });

  // The polite live region's text re-announces only when it changes, so a repeated identical error
  // (a second submit failing the same way) would go silent. An invisible nonce flips on every fresh
  // error so the region text always mutates and the screen reader speaks again (the MediaPicker
  // discipline). The nonce is a zero-width space, never voiced, so the heard sentence is unchanged.
  let announceNonce = $state(0);
  function nonce(): string {
    return announceNonce % 2 === 0 ? '' : '​';
  }
  // Each submit hands a fresh `form` (or `data` on a load) object, so the nonce bumps once per submit,
  // keying the re-announce to the submit rather than to a string change the live region would swallow.
  // The guard reads a plain non-reactive `lastSubmit`, so the bump fires only when the submit identity
  // changes, never on the re-render the bump itself causes; that is what keeps the effect from looping.
  let lastSubmit: unknown;
  $effect(() => {
    const submit = form ?? data;
    if (submit !== lastSubmit) {
      lastSubmit = submit;
      if (lifecycleError) announceNonce++;
    }
  });
  const liveError = $derived(lifecycleError ? `${lifecycleError}${nonce()}` : '');
</script>

<!-- The office natural-measure rule (design arc 2026-07-15): a document list composes at 3xl
     within the shell's 5xl ceiling, so short titles never open a dead band against the date. -->
<div class="mx-auto w-full max-w-3xl">

{#snippet headerAction()}
  <button type="button" class="btn btn-sm w-full shrink-0 border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)] sm:w-auto" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
    <PlusIcon class="h-4 w-4" /> New {createNoun}
  </button>
{/snippet}

<PageHeader title={data.label} action={headerAction} />

<!-- One persistent live region announces the publish-all flash (the EditPage pattern): a
     {#if}-gated role element inserted fresh is announced inconsistently, so the visible alert
     below keeps its styling without a role and the message is announced once. -->
<div class="sr-only" aria-live="polite">{publishedAllMessage}</div>
<!-- One persistent polite region announces the lifecycle errors, re-announcing a repeat through the
     nonce. The visible alerts below keep their styling and drop the live `role` (a fresh-inserted
     role element announces inconsistently and clobbers a repeat), so the message is announced once. -->
<div class="sr-only" aria-live="polite">{liveError}</div>
{#if publishedAllMessage}
  <div class="alert alert-success mb-4 text-sm">{publishedAllMessage}</div>
{/if}
{#if data.formError}
  <div class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}
{#if data.error}
  <div class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

{#if deleteRefused}
  <!-- A `?/delete` was refused: name the blockers up front, matching the editor's refusal banner,
       so the author sees why without re-opening a dialog. The polite region above announces it, so
       the box itself carries no role or label (a bare div with an aria-label gets no accessible name). -->
  <div class="alert alert-error mb-4 flex-col items-start text-sm">
    <p class="font-medium">This {data.label.toLowerCase()} could not be deleted.</p>
    {#if deleteRefused.inboundKind === 'include'}
      <p>{deleteRefused.inboundLinks.length} {deleteRefused.inboundLinks.length === 1 ? 'entry includes' : 'entries include'} it. Remove the include first, then delete again.</p>
    {:else}
      <p>{deleteRefused.inboundLinks.length} {deleteRefused.inboundLinks.length === 1 ? 'page' : 'pages'} now link to it. Remove or repoint the {deleteRefused.inboundLinks.length === 1 ? 'link' : 'links'} listed below, then delete again.</p>
    {/if}
    <ul class="mt-1 w-full">
      {#each deleteRefused.inboundLinks as link (link.concept + '/' + link.id)}
        <li>
          <a class="link" href={`/admin/${link.concept}/${link.id}`}>{link.title}</a>
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if data.entries.length > 0}
  <div class="mb-3">
    <ListToolbar
      search={query}
      onSearch={(value) => { query = value; page = 1; }}
      searchLabel={`Search ${data.label}`}
      filters={[partitionFilter, hiddenFilter]}
      count={sorted.length}
      itemLabel={data.label.toLowerCase()}
    />
  </div>
{/if}

{#if data.entries.length === 0}
  <!-- The empty state owns the content area (no card): the cairn mark, concept-named copy, and the
       create CTA centered on a tall fill, so a first-run office reads as composed. -->
  {#snippet emptyAction()}
    <button type="button" class="btn btn-sm border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)]" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
      <PlusIcon class="h-4 w-4" /> New {createNoun}
    </button>
  {/snippet}
  <EmptyState heading={`No ${data.label.toLowerCase()} yet`} message="Stack your first one and it will show up here." action={emptyAction} />
{:else}
  <div class="mb-2 overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)]">
    <AdminTable density="sm" rowCount={pageRows.length}>
      {#snippet header()}
        <!-- Frame zones (the column-header row) carry the sidebar's gentle band so content rows are
             the card's only white rows; the first column insets to the card's rounded edge. -->
        <th class="pl-6" aria-sort={sortKey === 'title' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
          <button type="button" class={sortButton} aria-label="Sort by title" onclick={() => toggleSort('title')}>
            Title
            {#if sortKey === 'title'}
              {#if sortAsc}<ArrowUpIcon class="h-3 w-3" aria-hidden="true" />{:else}<ArrowDownIcon class="h-3 w-3" aria-hidden="true" />{/if}
            {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" aria-hidden="true" />{/if}
          </button>
        </th>
        {#if data.dated}
          <!-- w-32, not w-28: a two-digit day ("May 18, 2026") needs a few px more than the
               column had (audit finding 10), which wrapped it to two lines while a single-digit
               day fit. whitespace-nowrap on the cell below is the actual no-wrap guarantee; the
               wider column keeps that text from crowding the Status column beside it. -->
          <th class="hidden w-32 sm:table-cell" aria-sort={sortKey === 'date' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
            <button type="button" class={sortButton} aria-label="Sort by date" onclick={() => toggleSort('date')}>
              Date
              {#if sortKey === 'date'}
                {#if sortAsc}<ArrowUpIcon class="h-3 w-3" aria-hidden="true" />{:else}<ArrowDownIcon class="h-3 w-3" aria-hidden="true" />{/if}
              {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" aria-hidden="true" />{/if}
            </button>
          </th>
        {/if}
        <!-- Status and Actions trade the table's default cell padding for a tighter one below sm,
             so their columns give the title column the freed width instead of the desktop-width
             columns the audit flagged (finding 8). -->
        <th class="{headerLabel} w-16 px-2 sm:w-28 sm:px-4">Status</th>
        <th class="w-12 px-2 text-right sm:px-4"><span class="sr-only">Actions</span></th>
      {/snippet}
      {#snippet children()}
        {#each pageRows as entry (entry.id)}
          <tr class="transition-colors hover:bg-base-200/60">
            <td class="max-w-0 py-2 pl-6">
              <!-- One-line row (density ruling, design arc 2026-07-15): the scan job is
                   title-status-date, so the summary line stays off the office list and the
                   Hidden tag sits inline beside the title. -->
              <div class="flex items-center gap-2">
                <a class="truncate text-base font-medium hover:text-primary hover:underline {entry.draft ? draftDim : ''}" href={`/admin/${data.conceptId}/${entry.id}`}>{entry.title}</a>
                {#if entry.draft}
                  <!-- Hidden is a row treatment, not a status badge: the row de-emphasizes and an
                       eye-off tag sits by the title, leaving the Status cell to its publish chip. -->
                  <span class="inline-flex shrink-0 items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.02em] text-muted">
                    <EyeOffIcon class="h-3 w-3" aria-hidden="true" />Hidden
                  </span>
                {/if}
              </div>
            </td>
            {#if data.dated}<td class="hidden w-32 whitespace-nowrap tabular-nums text-muted sm:table-cell py-2 text-[0.9375rem]">{formatCivilDate(entry.date)}</td>{/if}
            <td class="w-16 px-2 py-2 sm:w-28 sm:px-4">
              <!-- One chip family (design arc 2026-07-15, re-expressed on the toolkit's StatusChip):
                   New and Published share the toolkit's neutral tone; Edited alone carries the
                   act-on info tone, rhyming with the topbar's "Publish site (N)" pill. -->
              {#if entry.status === 'new'}<StatusChip tone="neutral" label="New" size="xs" />
              {:else if entry.status === 'edited'}<StatusChip tone="info" label="Edited" size="xs" />
              {:else}<StatusChip tone="neutral" label="Published" size="xs" />{/if}
            </td>
            <td class="w-12 px-2 py-2 text-right sm:px-4">
              {#if deleteRefused?.id === entry.id}
                <!-- A prior delete was refused: DeleteDialog names the blockers and offers no confirm. -->
                <DeleteDialog conceptId={data.conceptId} id={entry.id} label={data.label} inboundLinks={deleteRefused.inboundLinks} inboundKind={deleteRefused.inboundKind} pending={entry.status !== 'published'} />
              {:else}
                <form method="POST" action="?/delete">
                  <CsrfField />
                  <input type="hidden" name="id" value={entry.id} />
                  <button type="submit" class="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content focus-visible:text-base-content" aria-label="Delete {entry.title}">
                    <Trash2Icon class="h-4 w-4" />
                  </button>
                </form>
              {/if}
            </td>
          </tr>
        {/each}
      {/snippet}
      {#snippet empty()}
        <!-- A filter or a search narrowed the list to zero; the entries exist, none match. Offer the
             way back: a search query clears, a filter is named in the copy. -->
        <div role="status" class="flex flex-col items-center gap-3">
          <SearchIcon class="h-8 w-8 text-subtle opacity-40" aria-hidden="true" />
          {#if query.trim()}
            <p class="text-sm text-muted">No {data.label.toLowerCase()} match <span class="font-medium text-base-content">“{query}”</span>.</p>
            <button type="button" class="text-[0.8125rem] font-medium text-primary underline [text-underline-offset:2px]" onclick={clearSearch}>Clear search</button>
          {:else}
            <p class="text-sm text-muted">No {data.label.toLowerCase()} match this filter.</p>
          {/if}
        </div>
      {/snippet}
    </AdminTable>
  </div>
  <div class="mb-4">
    <Pagination
      page={page}
      pageCount={pageCount}
      onPageChange={(next) => (page = next)}
      totalItems={sorted.length}
      pageSize={pageSize}
      itemLabel={data.label.toLowerCase()}
      pageSizeOptions={[10, 25, 50]}
      onPageSizeChange={(size) => { pageSize = size; page = 1; }}
    />
  </div>
{/if}
</div>

<dialog class="modal" aria-labelledby="cairn-create-dialog-title" bind:this={createDialog}>
  <div class="modal-box">
    <div class="mb-3 flex items-center justify-between">
      <h2 id="cairn-create-dialog-title" class="text-base font-semibold">New {createNoun}</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => createDialog?.close()}>✕</button>
    </div>
    <form method="POST" action="?/create" onsubmit={() => (creating = true)} class="flex flex-col gap-3">
      <CsrfField />
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Title</span>
        <input class="input w-full" name="title" bind:value={title} required />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{data.routable ? 'Address' : 'Name'}</span>
        <input
          class="input w-full"
          name="slug"
          placeholder={slugPlaceholder}
          value={derivedSlug}
          oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
        />
      </label>
      {#if data.dated}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Date</span>
          <input class="input w-full" type="date" name="date" value={dateDefault} />
        </label>
      {/if}
      <div class="modal-action">
        <button type="button" class="btn btn-sm" onclick={() => createDialog?.close()}>Cancel</button>
        <button type="submit" class="btn btn-sm btn-primary" disabled={creating}>
          {#if creating}<span class="loading loading-spinner loading-xs" aria-hidden="true"></span> Creating…{:else}Create{/if}
        </button>
      </div>
    </form>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button tabindex="-1" aria-label="Close">close</button>
  </form>
</dialog>
