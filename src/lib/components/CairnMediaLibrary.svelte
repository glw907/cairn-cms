<!--
@component
The admin Media Library screen, a peer of Posts and Pages. It browses every committed media asset,
shows where each one is used, and exposes the selection and per-row delete intent the detail
slide-over (Task 7) consumes. The resting surface is a visual contact-sheet grid (a roving-tabindex
listbox of tiles), with a list-density toggle that flips to an enriched sortable table. One toolbar
row carries search, a pick-one triage radiogroup (All, Needs alt, Unused), and the density toggle.
Filtering, sorting, and a growing client window all run over the full loaded set in component state.

It is node-safe by construction: it types assets with MediaLibraryEntry from the shared node-safe
projection and pulls in no editor module (the editor-boundary test bars a @codemirror leak). The
detail panel, the alt editor, the where-used list, and the delete dialog are Task 7; this slice
exposes the `selected` asset and the `pendingDelete` flag, and renders no panel yet.
-->
<script lang="ts">
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaLibraryData } from '../sveltekit/content-routes.js';
  import { publicPath } from '../media/naming.js';
  import CairnLogo from './CairnLogo.svelte';
  import {
    SearchIcon,
    UploadIcon,
    LayoutGridIcon,
    ListIcon,
    CheckIcon,
    TriangleAlertIcon,
    ImageOffIcon,
    Trash2Icon,
    ChevronDownIcon,
  } from './admin-icons.js';

  interface Props {
    /** The media library load's data: the unioned assets, the per-hash usage overlay, and a
     *  degraded-load error. */
    data: MediaLibraryData;
    /** The last media action's result. Task 7 types the delete refusal payload; accepted loosely
     *  here so the route's one `form` export flows through without a coupling this slice does not use. */
    form?: unknown | null;
  }

  // `form` is accepted so the route's one `form` export flows through; Task 7 reads its delete
  // refusal payload. This slice does not consume it, so it is destructured without a default.
  let { data, form }: Props = $props();

  // --- the per-hash usage facts the screen joins onto each asset ---
  /** The distinct-entry usage count for an asset; zero when the asset has no usage key. */
  function usageCount(hash: string): number {
    return data.usage[hash]?.count ?? 0;
  }
  /** Empty alt is the needs-alt signal (the asset carries no caption field, so this is the only
   *  per-asset alt fact). A non-image asset would read Not applicable, but the delivery route is
   *  image-only today, so every committed asset here is an image. */
  function needsAlt(asset: MediaLibraryEntry): boolean {
    return asset.alt.trim() === '';
  }

  // --- the live count line and the triage counts, over the FULL loaded set ---
  const usedCount = $derived(data.assets.filter((a) => usageCount(a.hash) > 0).length);
  const triageCounts = $derived({
    all: data.assets.length,
    needsAlt: data.assets.filter((a) => needsAlt(a)).length,
    // Unused: no usage entry, or a count of zero.
    unused: data.assets.filter((a) => usageCount(a.hash) === 0).length,
  });

  // The type facet (Images, Documents) is a designed-in seam: it stays hidden until the library
  // holds more than one top-level content type. The delivery route is image-only today, so this is
  // present without dead UI. (No selection state yet; the seam is the visibility computation.)
  const distinctTypes = $derived.by(() => {
    const seen = new Set<string>();
    for (const a of data.assets) seen.add(a.contentType.split('/')[0] ?? '');
    return seen;
  });
  const showFacet = $derived(distinctTypes.size > 1);

  // --- the toolbar state ---
  type Triage = 'all' | 'needs-alt' | 'unused';
  type Density = 'grid' | 'list';
  let query = $state('');
  let triage = $state<Triage>('all');
  let density = $state<Density>('grid');

  // The triage segments, in display order, each naming its value, label, and live count.
  const segments: { value: Triage; label: string; count: () => number }[] = [
    { value: 'all', label: 'All', count: () => triageCounts.all },
    { value: 'needs-alt', label: 'Needs alt', count: () => triageCounts.needsAlt },
    { value: 'unused', label: 'Unused', count: () => triageCounts.unused },
  ];

  function matchesTriage(asset: MediaLibraryEntry): boolean {
    switch (triage) {
      case 'needs-alt':
        return needsAlt(asset);
      case 'unused':
        return usageCount(asset.hash) === 0;
      default:
        return true;
    }
  }

  // Search spans the display name and the alt over the FULL set. MediaLibraryEntry carries no
  // caption field, so there is nothing further to search; the toolbar copy says "name or alt".
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return data.assets.filter((a) => {
      if (!matchesTriage(a)) return false;
      if (!q) return true;
      return a.displayName.toLowerCase().includes(q) || a.alt.toLowerCase().includes(q);
    });
  });

  // --- sorting (the list density's Added column) ---
  let sortAsc = $state(false); // newest-first by default, the usual CMS convention
  const sorted = $derived.by(() => {
    // Lexical compare on the ISO createdAt is chronological; copy first so the source order holds.
    const rows = [...filtered].sort((a, b) => {
      const cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  });
  function toggleSort() {
    sortAsc = !sortAsc;
  }
  const addedSort = $derived(sortAsc ? 'ascending' : 'descending');

  // --- the client pagination window (a growing visible count, never infinite scroll) ---
  const PAGE = 24;
  let shown = $state(PAGE);
  // Reset the window whenever the filtered set changes so a narrowing filter never strands the
  // window past the result count. (Reading `sorted.length` ties this to filter/sort/search.)
  $effect(() => {
    void sorted.length;
    shown = PAGE;
  });
  const visible = $derived(sorted.slice(0, shown));
  const hasMore = $derived(shown < sorted.length);
  function loadMore() {
    shown = Math.min(shown + PAGE, sorted.length);
  }

  // --- selection and open intent (consumed by Task 7's slide-over) ---
  // The asset a tile/row activation opened, marked aria-selected/active. Task 7 renders the
  // {#if selected} slide-over over this state. `pendingDelete` is the row-delete intent Task 7's
  // alertdialog reads; it sets `selected` plus this flag without opening the dialog here.
  let selected = $state<MediaLibraryEntry | null>(null);
  let pendingDelete = $state(false);

  function openAsset(asset: MediaLibraryEntry) {
    selected = asset;
    pendingDelete = false;
  }
  function requestDelete(asset: MediaLibraryEntry) {
    selected = asset;
    pendingDelete = true;
  }

  // --- the roving tabindex over the grid's visible tiles ---
  // One tabstop for the listbox: the active index is the only option with tabindex 0; arrows,
  // Home, and End move it; Enter/Space activate. The active index is clamped as filtering changes
  // the visible set, so a focused option that filters out moves to a valid neighbor.
  let activeIndex = $state(0);
  $effect(() => {
    const max = Math.max(0, visible.length - 1);
    if (activeIndex > max) activeIndex = max;
  });

  let tileEls = $state<HTMLElement[]>([]);
  function focusTile(i: number) {
    activeIndex = i;
    tileEls[i]?.focus();
  }
  function onGridKeydown(e: KeyboardEvent, i: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusTile(Math.min(i + 1, visible.length - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusTile(Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTile(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTile(visible.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAsset(visible[i]);
    }
  }

  // --- the broken-thumbnail affordance: a tile/row whose R2 object 404s still lists ---
  // The set of hashes whose thumbnail failed to load, so the dead asset can be cleared.
  let brokenHashes = $state(new Set<string>());
  function markBroken(hash: string) {
    if (brokenHashes.has(hash)) return;
    const next = new Set(brokenHashes);
    next.add(hash);
    brokenHashes = next;
  }

  // --- display helpers ---
  const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  function formatAdded(iso: string): string {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? iso : dateFmt.format(parsed);
  }
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  /** The total stored bytes, for the count line. */
  const totalBytes = $derived(data.assets.reduce((sum, a) => sum + a.bytes, 0));
  /** Dimensions plus type for the list row metadata line. */
  function dimensions(asset: MediaLibraryEntry): string {
    return asset.width && asset.height ? `${asset.width}×${asset.height}` : '';
  }
  function typeLabel(asset: MediaLibraryEntry): string {
    return asset.ext.toUpperCase();
  }
  function thumbSrc(asset: MediaLibraryEntry): string {
    return publicPath(asset.slug, asset.hash, asset.ext, 'slug');
  }

  // The selected-cue check glyph for the triage radiogroup (WCAG 1.4.1): hue never carries the
  // chosen state alone, the same non-color cue the ConceptList triage uses.
  function segButtonClass(on: boolean): string {
    return `inline-flex items-center gap-1.5 px-3 py-1 text-[0.8125rem] font-normal ${on ? 'bg-primary/10 text-primary font-medium' : 'text-[var(--color-muted)]'}`;
  }
  function densityButtonClass(on: boolean): string {
    return `inline-flex items-center justify-center rounded-md p-1.5 ${on ? 'bg-primary/10 text-primary' : 'text-[var(--color-muted)] hover:bg-base-content/[0.06]'}`;
  }

  const headerLabel = 'text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]';
</script>

<!-- The office header recipe: the Media eyebrow, the display-face heading, a live count line, and
     the Upload primary action top-right. -->
<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex flex-col gap-0.5">
    <span class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Media</span>
    <h1 class="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">Media library</h1>
    <p class="text-sm text-[var(--color-muted)]">
      {triageCounts.all} {triageCounts.all === 1 ? 'image' : 'images'}, {usedCount} used on the site<span class="px-1.5" aria-hidden="true">&middot;</span>{formatBytes(totalBytes)} stored
    </p>
  </div>
  <!-- TODO(Task 7+): wire a real Library upload (no media-only upload action exists in 3c; the 2b
       upload commits to an entry's branch at save). This is a working, focusable button shell, never
       a faked upload. -->
  <button type="button" class="btn btn-primary btn-sm shrink-0">
    <UploadIcon class="h-4 w-4" /> Upload
  </button>
</header>

{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 text-sm">{data.error}</div>
{/if}

{#if data.assets.length === 0}
  <!-- The empty state owns the content area (the office recipe): the mark, the copy, and an Upload
       CTA over a dropzone line. Triage and search stay hidden until there is content. -->
  <div class="flex min-h-[52vh] flex-col items-center justify-center gap-4 px-6 py-14 text-center">
    <CairnLogo class="h-12 w-12 text-primary opacity-30" />
    <div class="space-y-1">
      <p class="font-semibold text-base-content font-[family-name:var(--font-display)] text-xl">No media yet</p>
      <p class="mx-auto max-w-[40ch] text-sm text-[var(--color-muted)]">
        Upload an image and it shows up here, ready to drop into a post or set as a hero.
      </p>
    </div>
    <div class="mt-1 flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] px-7 py-5 text-[var(--color-muted)]">
      <button type="button" class="btn btn-primary btn-sm">
        <UploadIcon class="h-4 w-4" /> Upload an image
      </button>
      <span class="text-xs">or drop a file anywhere on this page</span>
    </div>
  </div>
{:else}
  <!-- One toolbar row: search (left, flexes), the triage radiogroup, the type facet (seam), and the
       grid/list density toggle (right). -->
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <label class="input input-sm min-w-0 flex-1 sm:max-w-xs">
      <SearchIcon class="h-4 w-4 opacity-60" aria-hidden="true" />
      <input type="search" aria-label="Search the media library" bind:value={query} placeholder="Search name or alt" />
    </label>

    <!-- The triage is a pick-one radiogroup: aria-checked, never aria-pressed. -->
    <div role="radiogroup" aria-label="Filter assets" class="bg-base-100 inline-flex items-center overflow-hidden rounded-lg border border-[var(--cairn-card-border)]">
      {#each segments as seg, i (seg.value)}
        <button
          type="button"
          role="radio"
          aria-checked={triage === seg.value}
          class="{segButtonClass(triage === seg.value)} {i > 0 ? 'border-l border-[var(--cairn-card-border)]' : ''}"
          onclick={() => (triage = seg.value)}
        >
          {#if triage === seg.value}<CheckIcon class="h-3 w-3" aria-hidden="true" />{/if}
          {seg.label}<span class="tabular-nums">{seg.count()}</span>
        </button>
      {/each}
    </div>

    {#if showFacet}
      <!-- The type facet seam, shown only past one distinct stored type. It is presentational in
           this slice (images-only delivery), so it carries no live filter selection yet. -->
      <div role="radiogroup" aria-label="Filter by type" class="bg-base-100 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.8125rem] text-[var(--color-muted)]">
        <span class="text-xs">Type</span>
        <button type="button" role="radio" aria-checked="true" class="font-medium text-primary">All</button>
      </div>
    {/if}

    <span class="flex-1"></span>

    <div role="group" aria-label="Layout density" class="bg-base-100 inline-flex items-center gap-1 rounded-lg border border-[var(--cairn-card-border)] p-0.5">
      <button type="button" aria-label="Grid view" aria-pressed={density === 'grid'} class={densityButtonClass(density === 'grid')} onclick={() => (density = 'grid')}>
        <LayoutGridIcon class="h-4 w-4" />
      </button>
      <button type="button" aria-label="List view" aria-pressed={density === 'list'} class={densityButtonClass(density === 'list')} onclick={() => (density = 'list')}>
        <ListIcon class="h-4 w-4" />
      </button>
    </div>
  </div>

  {#if sorted.length === 0}
    <!-- A filter or search narrowed the set to zero; the assets exist, none match. -->
    <div role="status" class="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchIcon class="h-8 w-8 text-[var(--color-subtle)] opacity-40" aria-hidden="true" />
      <p class="text-sm text-[var(--color-muted)]">No media match this filter.</p>
    </div>
  {:else if density === 'grid'}
    <!-- The grid: a roving-tabindex listbox of tiles. One tabstop; arrows move the roving index;
         Enter/Space open. Each tile names the asset, its alt status (a glyph plus a label, never hue
         alone), and a compact usage marker. -->
    <ul role="listbox" aria-label="Media library" class="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {#each visible as asset, i (asset.hash)}
        {@const used = usageCount(asset.hash)}
        {@const missing = needsAlt(asset)}
        <li role="presentation" class="contents">
          <div
            bind:this={tileEls[i]}
            role="option"
            aria-selected={selected?.hash === asset.hash}
            tabindex={i === activeIndex ? 0 : -1}
            aria-label="{asset.displayName}. {missing ? 'Needs alt text' : 'Described'}. {used > 0 ? `Found in ${used} ${used === 1 ? 'entry' : 'entries'}` : 'No references found'}."
            class="group flex cursor-pointer flex-col overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/70 {selected?.hash === asset.hash ? 'ring-2 ring-primary/70' : ''}"
            onclick={() => openAsset(asset)}
            onkeydown={(e) => onGridKeydown(e, i)}
          >
            <div class="relative flex aspect-[4/3] items-center justify-center bg-base-200/60">
              <!-- The usage marker, top-right: a used count, or the warning-ink Unused chip. -->
              {#if used > 0}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--color-muted)]">used {used}</span>
              {:else}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--cairn-warning-ink)]">Unused</span>
              {/if}
              {#if brokenHashes.has(asset.hash)}
                <span data-cairn-broken class="flex flex-col items-center gap-1 text-[var(--color-subtle)]">
                  <ImageOffIcon class="h-7 w-7" aria-hidden="true" />
                  <span class="text-[0.625rem]">Image missing</span>
                </span>
              {:else}
                <img
                  src={thumbSrc(asset)}
                  alt=""
                  aria-hidden="true"
                  class="max-h-full max-w-full object-contain"
                  onerror={() => markBroken(asset.hash)}
                />
              {/if}
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-[var(--cairn-card-border)] px-2.5 py-2">
              <span class="cairn-ml-name min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{asset.displayName}</span>
              {#if missing}
                <span class="inline-flex items-center gap-1 text-[var(--cairn-warning-ink)]" role="img" aria-label="Needs alt text">
                  <TriangleAlertIcon class="h-3.5 w-3.5" aria-hidden="true" />
                  <span class="text-[0.625rem] font-medium">Needs alt</span>
                </span>
              {:else}
                <span class="inline-flex items-center gap-1 text-[var(--color-positive-ink)]" role="img" aria-label="Described">
                  <CheckIcon class="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <!-- The list density: a real table. Each row opens the detail (sets `selected`); the Added
         column sorts through a real <th><button> with aria-sort; the per-row delete is always
         visible and sets the pending-delete intent Task 7 reads. -->
    <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-x-auto shadow-[var(--cairn-shadow)]">
      <table class="table">
        <thead>
          <tr class="border-base-300">
            <th class={headerLabel}>Asset</th>
            <th class="{headerLabel} w-32">Alt status</th>
            <th class="{headerLabel} w-40">Used</th>
            <th class="w-24 text-right" aria-sort={addedSort}>
              <button type="button" class="ml-auto inline-flex items-center gap-1 {headerLabel} hover:text-base-content" aria-label="Sort by date added" onclick={toggleSort}>
                Added
                <ChevronDownIcon class="h-3 w-3 {sortAsc ? 'rotate-180' : ''}" aria-hidden="true" />
              </button>
            </th>
            <th class="w-12 text-right"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {#each visible as asset (asset.hash)}
            {@const used = usageCount(asset.hash)}
            {@const missing = needsAlt(asset)}
            <tr class="transition-colors hover:bg-base-200/60 {selected?.hash === asset.hash ? 'bg-primary/[0.06]' : ''}">
              <td class="max-w-0">
                <button type="button" class="flex w-full items-center gap-3 text-left" onclick={() => openAsset(asset)}>
                  <span class="relative flex h-10 w-14 flex-none items-center justify-center overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-200/60">
                    {#if brokenHashes.has(asset.hash)}
                      <ImageOffIcon data-cairn-broken class="h-4 w-4 text-[var(--color-subtle)]" aria-hidden="true" />
                    {:else}
                      <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="h-full w-full object-cover" onerror={() => markBroken(asset.hash)} />
                    {/if}
                  </span>
                  <span class="flex min-w-0 flex-col">
                    <span class="cairn-ml-name truncate text-sm font-semibold">{asset.displayName}</span>
                    <span class="truncate text-[0.75rem] text-[var(--color-muted)] tabular-nums">
                      {#if dimensions(asset)}{dimensions(asset)}<span class="px-1" aria-hidden="true">&middot;</span>{/if}{formatBytes(asset.bytes)}<span class="px-1" aria-hidden="true">&middot;</span>{typeLabel(asset)}
                    </span>
                  </span>
                </button>
              </td>
              <td class="w-32">
                {#if missing}
                  <span class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--cairn-warning-ink)]">
                    <TriangleAlertIcon class="h-3.5 w-3.5" aria-hidden="true" /> Needs alt
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[var(--color-positive-ink)]">
                    <CheckIcon class="h-3.5 w-3.5" aria-hidden="true" /> Described
                  </span>
                {/if}
              </td>
              <td class="w-40 text-[0.8125rem]">
                {#if used > 0}
                  <span class="text-base-content">found in {used}</span>
                {:else}
                  <span class="text-[var(--color-muted)]">no references found</span>
                {/if}
              </td>
              <td class="w-24 text-right text-sm tabular-nums text-[var(--color-muted)]">{formatAdded(asset.createdAt)}</td>
              <td class="w-12 text-right">
                <button type="button" class="btn btn-ghost btn-sm" aria-label="Delete {asset.displayName}" onclick={() => requestDelete(asset)}>
                  <Trash2Icon class="h-4 w-4 text-error" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if sorted.length > 0}
    <!-- The announced count plus the managed Load more (never infinite scroll). One persistent
         polite region carries "Showing N of M". -->
    <div class="sr-only" role="status" aria-live="polite">Showing {visible.length} of {sorted.length} {sorted.length === 1 ? 'image' : 'images'}.</div>
    <div class="mt-4 flex flex-col items-center gap-2">
      <span class="text-sm text-[var(--color-muted)]">Showing {visible.length} of {sorted.length}</span>
      {#if hasMore}
        <button type="button" class="btn btn-sm" onclick={loadMore}>Load more</button>
      {/if}
    </div>
  {/if}
{/if}
