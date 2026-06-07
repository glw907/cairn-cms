<!--
@component
One concept's list view as a DaisyUI data-table: a search filter, a result count, sortable Title and
Date headers, a status badge, a formatted date, and client-side pagination with a page-size control.
Filtering, sorting, and paging run over the loaded entries in component state, which suits typical
content sizes. The new-entry form lives below; Task 5 moves it behind the header New button.
-->
<script lang="ts">
  import { slugify } from '../content/ids.js';
  import type { ListData } from '../sveltekit/content-routes.js';
  import { SearchIcon, ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from './admin-icons.js';

  interface Props {
    /** The list load's data: the concept, its entries, and any inline or form errors. */
    data: ListData;
  }

  let { data }: Props = $props();

  type SortKey = 'title' | 'date';
  let query = $state('');
  let sortKey = $state<SortKey>('date');
  let sortAsc = $state(true);
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

  const sorted = $derived(
    [...filtered].sort((a, b) => {
      const av = sortKey === 'title' ? a.title.toLowerCase() : (a.date ?? '');
      const bv = sortKey === 'title' ? b.title.toLowerCase() : (b.date ?? '');
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
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

  // --- create form state (moves behind the header New button in Task 5) ---
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
</script>

<header class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl font-semibold">{data.label}</h1>
  <label class="input input-sm w-full max-w-xs">
    <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
    <input type="search" aria-label="Search {data.label}" bind:value={query} placeholder="Search" oninput={() => (page = 1)} />
  </label>
</header>

{#if data.formError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.formError}</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

<div class="rounded-box border border-base-300 bg-base-100 mb-2 overflow-x-auto">
  {#if data.entries.length === 0}
    <p class="p-4 text-sm opacity-70">No entries yet. Create the first one below.</p>
  {:else if sorted.length === 0}
    <p class="p-4 text-sm opacity-70">No entries match "{query}".</p>
  {:else}
    <table class="table">
      <thead>
        <tr>
          <th>
            <button type="button" class="inline-flex items-center gap-1" aria-label="Sort by title" onclick={() => toggleSort('title')}>
              Title
              {#if sortKey === 'title'}
                {#if sortAsc}<ArrowUpIcon class="h-3 w-3" />{:else}<ArrowDownIcon class="h-3 w-3" />{/if}
              {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" />{/if}
            </button>
          </th>
          {#if data.dated}
            <th>
              <button type="button" class="inline-flex items-center gap-1" aria-label="Sort by date" onclick={() => toggleSort('date')}>
                Date
                {#if sortKey === 'date'}
                  {#if sortAsc}<ArrowUpIcon class="h-3 w-3" />{:else}<ArrowDownIcon class="h-3 w-3" />{/if}
                {:else}<ChevronsUpDownIcon class="h-3 w-3 opacity-40" />{/if}
              </button>
            </th>
          {/if}
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each pageRows as entry (entry.id)}
          <tr>
            <td><a class="link link-hover font-medium" href={`/admin/${data.conceptId}/${entry.id}`}>{entry.title}</a></td>
            {#if data.dated}<td class="text-sm text-[var(--color-muted)]">{formatDate(entry.date)}</td>{/if}
            <td>
              {#if entry.draft}<span class="badge badge-warning badge-sm">Draft</span>
              {:else}<span class="badge badge-ghost badge-sm">Published</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if data.entries.length > 0}
  <div class="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm">
    <span class="text-[var(--color-muted)]">{sorted.length} of {data.entries.length}</span>
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

<form method="POST" action="?/create" class="rounded-box border border-base-300 bg-base-100 flex flex-col gap-3 p-4">
  <h2 class="text-sm font-semibold">New entry</h2>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Title</span>
    <input class="input" name="title" bind:value={title} required />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Slug</span>
    <input
      class="input"
      name="slug"
      placeholder={slugPlaceholder}
      value={derivedSlug}
      oninput={(e) => { slugEdited = true; slug = e.currentTarget.value; }}
    />
  </label>
  {#if data.dated}
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Date</span>
      <input class="input" type="date" name="date" value={dateDefault} />
    </label>
  {/if}
  <button type="submit" class="btn btn-primary self-start">Create</button>
</form>
