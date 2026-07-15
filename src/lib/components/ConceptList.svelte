<!--
@component
One concept's list view, dressed to the office gold standard. A triage bar partitions by publish
state (a bordered segmented control with live counts) beside an orthogonal Hidden toggle. The list
is an enriched sortable table: each row carries a title with a muted summary sub-line, the date, the
publish-state badge, and a delete action. A draft row de-emphasizes and carries an eye-off Hidden
tag by the title. A trailing New row at the foot of the card opens the same create dialog as the
header button. Filtering, sorting, and paging run over the loaded entries in component state.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { DeleteRefusal, EntrySummary, ListData } from '../sveltekit/content-routes.js';
  import CsrfField from './CsrfField.svelte';
  import DeleteDialog from './DeleteDialog.svelte';
  import CairnLogo from './CairnLogo.svelte';
  import { segmentTintClass } from './segmented-control.js';
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from './admin-icons.js';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
    /** The `?/delete` action result. A blocked delete returns the `DeleteRefusal` payload (the
     *  shared `error` summary, the refused entry id, and its inbound linkers), so the list names
     *  the blockers and refuses (block-until-clean). */
    form?: Partial<DeleteRefusal> | null;
  }

  let { data, form = null }: Props = $props();

  // The entry a `?/delete` refused, and its inbound links, keyed by the posted id. Null when the
  // last submit succeeded, refused nothing, or none ran.
  const deleteRefused = $derived(
    form?.inboundLinks?.length ? { id: form.id, inboundLinks: form.inboundLinks } : null,
  );

  type SortKey = 'title' | 'date';
  // The triage runs on two independent axes. A pick-one publish-state partition (`all` passes
  // everything, `pending` is new + edited, `published` is live-as-is) and a separate Hidden
  // toggle that composes with it. They are orthogonal: a published-but-hidden entry is on main
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

  const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  function formatDate(iso: string | null): string {
    if (!iso) return '';
    const parsed = new Date(`${iso}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? iso : dateFmt.format(parsed);
  }

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
  // and the count axis it shows; the markup loops this so the segments share one block.
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

  function setPartition(next: Partition) {
    partition = next;
    page = 1;
  }

  function toggleHidden() {
    hiddenOnly = !hiddenOnly;
    page = 1;
  }

  function clearSearch() {
    query = '';
    page = 1;
  }

  // The triage controls dress to the established footer grammar (the design system's segmented /
  // check-and-tint recipe). Each helper returns a verbatim Tailwind string so the admin CSS
  // build's @source scan reads the utilities whole. The scoped button reset (cairn-admin.css)
  // already strips UA chrome from these bare buttons.
  //
  // A segment of the bordered publish-state control: the shared group border carries the pick-one
  // semantics, so a segment stays borderless; the active one tints and bolds.
  function segButtonClass(pressed: boolean): string {
    return `inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1 text-[0.8125rem] font-normal ${segmentTintClass(pressed)}`;
  }
  // The standalone Hidden toggle: rounded, transparent until hover, check-and-tint when pressed.
  function hiddenToggleClass(pressed: boolean): string {
    return `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1 text-[0.8125rem] font-normal hover:bg-base-content/[0.06] ${segmentTintClass(pressed)}`;
  }
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
  // The create affordances name one new item, so they read in the singular ("New post"). The
  // descriptor resolves `singular` (defaulting it to the label), so the fallback here only guards an
  // older caller that ships no `singular` on its ListData.
  const createNoun = $derived(data.singular ?? data.label);

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
  const lifecycleError = $derived(
    deleteRefused
      ? `This ${data.label.toLowerCase()} could not be deleted. ${deleteRefused.inboundLinks.length} ${deleteRefused.inboundLinks.length === 1 ? 'page links' : 'pages link'} to it.`
      : (data.formError ?? data.error ?? ''),
  );

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

<!-- The non-color selected cue for the triage controls (WCAG 1.4.1): a small check glyph that
     renders only inside the active segment or toggle, so hue never carries the state alone. -->
{#snippet check()}
  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
{/snippet}

<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
  <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">{data.label}</h1>
  <!-- Below sm the search and the New button stack full-width instead of sharing one row: at 320
       a side-by-side row squeezes the search input to a few characters (the reported icon-plus-"S"
       collapse), so each control gets the full row instead. -->
  <div class="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
    <label class="input input-sm w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
      <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
      <input type="search" aria-label="Search {data.label}" bind:value={query} placeholder="Search {data.label.toLowerCase()}" oninput={() => (page = 1)} />
    </label>
    <button type="button" class="btn btn-primary btn-sm w-full shrink-0 sm:w-auto" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
      <PlusIcon class="h-4 w-4" /> New {createNoun}
    </button>
  </div>
</header>

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
    <p>{deleteRefused.inboundLinks.length} {deleteRefused.inboundLinks.length === 1 ? 'page links' : 'pages link'} to it. Remove or repoint the {deleteRefused.inboundLinks.length === 1 ? 'link' : 'links'} listed below, then delete again.</p>
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
  <!-- The triage filters on two independent axes, dressed to the footer grammar. The publish-state
       partition is one bordered segmented control: the shared border carries the pick-one semantics
       and the active segment tints with a check (the non-color cue, WCAG 1.4.1). The Hidden toggle
       is a separate standalone check-and-tint toggle that composes with the active partition. Each
       count dims to muted when zero, so a sparse list never jumps. -->
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <div role="group" aria-label="Filter by publish state" class="bg-base-100 inline-flex max-w-full items-center overflow-x-auto rounded-lg border border-[var(--cairn-card-border)]">
      {#each segments as seg, i (seg.value)}
        <button type="button" class="{segButtonClass(partition === seg.value)} {i > 0 ? 'border-l border-[var(--cairn-card-border)]' : ''}" aria-pressed={partition === seg.value} onclick={() => setPartition(seg.value)}>
          {#if partition === seg.value}{@render check()}{/if}
          {seg.label}<span class="tabular-nums">{seg.count()}</span>
        </button>
      {/each}
    </div>
    <span class="h-5 w-px bg-[var(--cairn-card-border)]" aria-hidden="true"></span>
    <button type="button" class={hiddenToggleClass(hiddenOnly)} aria-pressed={hiddenOnly} onclick={toggleHidden}>
      {#if hiddenOnly}{@render check()}{/if}
      Hidden<span class="tabular-nums">{counts.hidden}</span>
    </button>
  </div>
{/if}

{#if data.entries.length === 0}
  <!-- The empty state owns the content area (no card): the cairn mark, concept-named copy, and the
       create CTA centered on a tall fill, so a first-run office reads as composed. -->
  <div class="flex min-h-[56vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <CairnLogo class="h-12 w-12 text-primary opacity-30" />
    <div class="space-y-1">
      <p class="font-semibold text-base-content">No {data.label.toLowerCase()} yet</p>
      <p class="text-sm text-muted">Stack your first one and it will show up here.</p>
    </div>
    <button type="button" class="btn btn-primary btn-sm" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
      <PlusIcon class="h-4 w-4" /> New {createNoun}
    </button>
  </div>
{:else}
  <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 mb-4 overflow-x-auto shadow-[var(--cairn-shadow)]">
    {#if sorted.length === 0}
      <!-- A filter or a search narrowed the list to zero; the entries exist, none match. Offer the
           way back: a search query clears, a filter is named in the copy. -->
      <div role="status" class="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <SearchIcon class="h-8 w-8 text-subtle opacity-40" aria-hidden="true" />
        {#if query.trim()}
          <p class="text-sm text-muted">No {data.label.toLowerCase()} match <span class="font-medium text-base-content">"{query}"</span>.</p>
          <button type="button" class="text-[0.8125rem] font-medium text-primary underline [text-underline-offset:2px]" onclick={clearSearch}>Clear search</button>
        {:else}
          <p class="text-sm text-muted">No {data.label.toLowerCase()} match this filter.</p>
        {/if}
      </div>
    {:else}
      <table class="table">
        <thead>
          <tr class="border-base-300">
            <th aria-sort={sortKey === 'title' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
              <button type="button" class={sortButton} aria-label="Sort by title" onclick={() => toggleSort('title')}>
                Title
                {#if sortKey === 'title'}
                  {#if sortAsc}<ArrowUpIcon class="h-3 w-3" aria-hidden="true" />{:else}<ArrowDownIcon class="h-3 w-3" aria-hidden="true" />{/if}
                {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" aria-hidden="true" />{/if}
              </button>
            </th>
            {#if data.dated}
              <th class="hidden w-28 sm:table-cell" aria-sort={sortKey === 'date' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                <button type="button" class={sortButton} aria-label="Sort by date" onclick={() => toggleSort('date')}>
                  Date
                  {#if sortKey === 'date'}
                    {#if sortAsc}<ArrowUpIcon class="h-3 w-3" aria-hidden="true" />{:else}<ArrowDownIcon class="h-3 w-3" aria-hidden="true" />{/if}
                  {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" aria-hidden="true" />{/if}
                </button>
              </th>
            {/if}
            <!-- Status and Actions trade the table's default 1rem cell padding for a tighter 0.5rem
                 below sm, so their columns give the title column the freed width instead of the
                 desktop-width columns the audit flagged (finding 8). -->
            <th class="{headerLabel} w-16 px-2 sm:w-28 sm:px-4">Status</th>
            <th class="w-12 px-2 text-right sm:px-4"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {#each pageRows as entry (entry.id)}
            <tr class="transition-colors hover:bg-base-200/60">
              <td class="max-w-0">
                <a class="block truncate font-semibold hover:text-primary hover:underline {entry.draft ? draftDim : ''}" href={`/admin/${data.conceptId}/${entry.id}`}>{entry.title}</a>
                {#if entry.draft}
                  <!-- Hidden is a row treatment, not a status badge: the row de-emphasizes and an
                       eye-off tag sits by the title, leaving the Status cell to its publish badge. -->
                  <span class="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.02em] text-muted">
                    <EyeOffIcon class="h-3 w-3" aria-hidden="true" />Hidden
                  </span>
                {/if}
                {#if entry.summary}
                  <div data-summary class="mt-0.5 truncate text-[0.8125rem] text-muted">{entry.summary}</div>
                {/if}
              </td>
              {#if data.dated}<td class="hidden w-28 text-sm tabular-nums text-muted sm:table-cell">{formatDate(entry.date)}</td>{/if}
              <td class="w-16 px-2 sm:w-28 sm:px-4">
                <!-- The pill compacts below sm (badge-xs), where the column itself narrows, so the
                     status stays legible without keeping the desktop-width column. -->
                {#if entry.status === 'new'}<span class="badge badge-info badge-xs font-medium sm:badge-sm">New</span>
                {:else if entry.status === 'edited'}<span class="badge badge-xs border-transparent bg-primary/10 font-medium text-primary sm:badge-sm">Edited</span>
                {:else}<span class="badge badge-ghost badge-xs font-medium sm:badge-sm">Published</span>{/if}
              </td>
              <td class="w-12 px-2 text-right sm:px-4">
                {#if deleteRefused?.id === entry.id}
                  <!-- A prior delete was refused: DeleteDialog names the blockers and offers no confirm. -->
                  <DeleteDialog conceptId={data.conceptId} id={entry.id} label={data.label} inboundLinks={deleteRefused.inboundLinks} pending={entry.status !== 'published'} />
                {:else}
                  <form method="POST" action="?/delete">
                    <CsrfField />
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" class="btn btn-ghost btn-sm" aria-label="Delete {entry.title}">
                      <Trash2Icon class="h-4 w-4 text-error" />
                    </button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <!-- The create affordance baked into the list body: a full-width borderless foot row so a
           short list always shows its next step rather than just stopping. Same action as the
           header New button. -->
      <button type="button" class="flex w-full items-center gap-2 border-t border-[var(--cairn-card-border)] px-6 py-3 text-sm font-medium text-primary hover:bg-primary/[0.06]" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
        <PlusIcon class="h-4 w-4" /> New {createNoun}
      </button>
    {/if}
  </div>
{/if}

{#if data.entries.length > 0}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm">
    <span role="status" class="text-muted">{sorted.length} of {data.entries.length}</span>
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1">
        <span class="sr-only">Rows per page</span>
        <select class="select select-sm" bind:value={pageSize} onchange={() => (page = 1)} aria-label="Rows per page">
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </label>
      <button type="button" class="btn btn-sm btn-ghost" aria-label="Previous page" disabled={page <= 1} onclick={() => (page -= 1)}>
        <ChevronLeftIcon class="h-4 w-4" />
      </button>
      <span>Page {page} of {pageCount}</span>
      <button type="button" class="btn btn-sm btn-ghost" aria-label="Next page" disabled={page >= pageCount} onclick={() => (page += 1)}>
        <ChevronRightIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
{/if}

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
        <span class="text-sm font-medium">Address</span>
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
