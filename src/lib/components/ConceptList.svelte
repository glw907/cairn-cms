<!--
@component
One concept's list view as a DaisyUI data-table: a search filter, a result count, sortable Title and
Date headers, a status badge, a formatted date, and client-side pagination with a page-size control.
Filtering, sorting, and paging run over the loaded entries in component state, which suits typical
content sizes. The header New button opens a dialog holding the create form.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { EntrySummary, ListData } from '../sveltekit/content-routes.js';
  import type { InboundLink } from '../content/manifest.js';
  import DeleteDialog from './DeleteDialog.svelte';
  import CairnLogo from './CairnLogo.svelte';
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from './admin-icons.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
    /** The `?/delete` action result. A blocked delete returns the refused entry id and the inbound
     *  links that link to it (the flat `fail(409, { inboundLinks, id })` shape), so the list names
     *  the blockers and refuses (block-until-clean). */
    form?: { id?: string; inboundLinks?: InboundLink[] } | null;
  }

  let { data, form = null }: Props = $props();

  // The entry a `?/delete` refused, and its inbound links, keyed by the posted id. Null when the
  // last submit succeeded, refused nothing, or none ran.
  const deleteRefused = $derived(
    form?.inboundLinks?.length ? { id: form.id, inboundLinks: form.inboundLinks } : null,
  );

  type SortKey = 'title' | 'date';
  let query = $state('');
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

  const filtered = $derived(
    data.entries.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase())),
  );

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

  // Shared column-header typography: small uppercase muted labels. The sort buttons add their own
  // flex layout and a hover affordance on top of this.
  const headerLabel = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]';
  const sortButton = `inline-flex items-center gap-1 ${headerLabel} hover:text-base-content`;
</script>

<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
  <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">{data.label}</h1>
  <div class="flex items-center gap-3 sm:flex-1 sm:flex-wrap sm:justify-end">
    <label class="input input-sm min-w-0 flex-1 sm:max-w-xs">
      <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
      <input type="search" aria-label="Search {data.label}" bind:value={query} placeholder="Search {data.label.toLowerCase()}" oninput={() => (page = 1)} />
    </label>
    <button type="button" class="btn btn-primary btn-sm shrink-0" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
      <PlusIcon class="h-4 w-4" /> New {data.label}
    </button>
  </div>
</header>

{#if data.formError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

{#if deleteRefused}
  <!-- A `?/delete` was refused: name the blockers up front, matching the editor's refusal banner,
       so the author sees why without re-opening a dialog. -->
  <div role="alert" aria-label="This {data.label.toLowerCase()} could not be deleted" class="alert alert-error mb-4 flex-col items-start text-sm">
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

<div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 mb-4 overflow-x-auto shadow-[var(--cairn-shadow)]">
  {#if data.entries.length === 0}
    <div class="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <CairnLogo class="h-12 w-12 text-primary opacity-30" />
      <div class="space-y-1">
        <p class="font-semibold text-base-content">No {data.label.toLowerCase()} yet</p>
        <p class="text-sm text-[var(--color-muted)]">Stack your first one and it will show up here.</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" aria-haspopup="dialog" onclick={() => createDialog?.showModal()}>
        <PlusIcon class="h-4 w-4" /> New {data.label}
      </button>
    </div>
  {:else if sorted.length === 0}
    <div role="status" class="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchIcon class="h-8 w-8 text-[var(--color-subtle)] opacity-40" aria-hidden="true" />
      <p class="text-sm text-[var(--color-muted)]">No {data.label.toLowerCase()} match <span class="font-medium text-base-content">"{query}"</span>.</p>
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
            <th class="hidden sm:table-cell" aria-sort={sortKey === 'date' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
              <button type="button" class={sortButton} aria-label="Sort by date" onclick={() => toggleSort('date')}>
                Date
                {#if sortKey === 'date'}
                  {#if sortAsc}<ArrowUpIcon class="h-3 w-3" aria-hidden="true" />{:else}<ArrowDownIcon class="h-3 w-3" aria-hidden="true" />{/if}
                {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" aria-hidden="true" />{/if}
              </button>
            </th>
          {/if}
          <th class={headerLabel}>Status</th>
          <th class="text-right"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each pageRows as entry (entry.id)}
          <tr class="transition-colors hover:bg-base-200/60">
            <td><a class="font-medium hover:text-primary hover:underline" href={`/admin/${data.conceptId}/${entry.id}`}>{entry.title}</a></td>
            {#if data.dated}<td class="hidden text-sm text-[var(--color-muted)] sm:table-cell">{formatDate(entry.date)}</td>{/if}
            <td>
              {#if entry.draft}<span class="badge badge-warning badge-sm font-medium">Draft</span>
              {:else}<span class="badge badge-ghost badge-sm font-medium">Published</span>{/if}
            </td>
            <td class="text-right">
              {#if deleteRefused?.id === entry.id}
                <!-- A prior delete was refused: DeleteDialog names the blockers and offers no confirm. -->
                <DeleteDialog conceptId={data.conceptId} id={entry.id} label={data.label} inboundLinks={deleteRefused.inboundLinks} />
              {:else}
                <form method="POST" action="?/delete">
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
  {/if}
</div>

{#if data.entries.length > 0}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm">
    <span role="status" class="text-[var(--color-muted)]">{sorted.length} of {data.entries.length}</span>
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
      <h2 id="cairn-create-dialog-title" class="text-base font-semibold">New {data.label}</h2>
      <button type="button" class="btn btn-ghost btn-sm" aria-label="Close" onclick={() => createDialog?.close()}>✕</button>
    </div>
    <form method="POST" action="?/create" onsubmit={() => (creating = true)} class="flex flex-col gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Title</span>
        <input class="input w-full" name="title" bind:value={title} required />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Slug</span>
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
