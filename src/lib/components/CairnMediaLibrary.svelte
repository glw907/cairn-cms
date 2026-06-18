<!--
@component
The admin Media Library screen, a peer of Posts and Pages. It browses every committed media asset,
shows where each one is used, edits its name and default alt, and deletes it safely. The resting
surface is a visual contact-sheet grid (a roving-tabindex listbox of tiles), with a list-density
toggle that flips to an enriched sortable table. One toolbar row carries search, a pick-one triage
radiogroup (All, Needs alt, Unused), and the density toggle. Filtering, sorting, and a growing
client window all run over the full loaded set in component state.

Activating a tile or row opens a NON-MODAL detail slide-over from the right (the established
details-slide-over recipe): no scrim, the library stays live and in the a11y tree behind it, Escape
closes it, focus moves in on open and returns to the originating tile or row on close. It is a
labelled region, not a dialog, so it never traps focus or inerts the list. It holds the large
preview, the name and the `media:` reference with a copy button, the alt editor (a describe or
decorative radiogroup plus the alt field, posting to `?/mediaUpdate` together with the display name
and slug), the where-used list grouped published-then-branch, the metadata grid, and the actions.

Delete opens a two-faced safe-delete alertdialog: a native modal `<dialog>` with no light dismiss.
The in-use face names the breaking entries and gates Delete behind a typed-slug confirmation; the
orphan face is a calm confirm. Both post to `?/mediaDelete`. A `form` carrying a fresh
`MediaDeleteRefusal` re-opens the in-use face on its fresh breaking list.

It is node-safe by construction: it types assets with MediaLibraryEntry from the shared node-safe
projection and pulls in no editor module (the editor-boundary test bars a @codemirror leak).
-->
<script lang="ts">
  import { flushSync, tick } from 'svelte';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaLibraryData, ContentFormFailure } from '../sveltekit/content-routes.js';
  import type { UsageEntry } from '../media/usage.js';
  import { publicPath } from '../media/naming.js';
  import { mediaToken } from '../media/reference.js';
  import CsrfField from './CsrfField.svelte';
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
    ChevronRightIcon,
    XIcon,
    CopyIcon,
    FileTextIcon,
    ClockIcon,
    Link2OffIcon,
  } from './admin-icons.js';

  interface Props {
    /** The media library load's data: the unioned assets, the per-hash usage overlay, and a
     *  degraded-load error. */
    data: MediaLibraryData;
    /** The last media action's result. A `?/mediaDelete` refusal carries the fresh breaking list
     *  the in-use face re-opens on; a `?/mediaUpdate` failure carries the error the slide-over
     *  surfaces. The route exports one `form`, so this is the merged `ContentFormFailure`. */
    form?: ContentFormFailure | null;
  }

  let { data, form }: Props = $props();

  // The success flash a redirected action carried back: a safe-delete or a metadata edit. The
  // conflict error (data.flashError) renders in the inline error treatment below instead.
  const FLASH_MESSAGE = { deleted: 'Asset deleted.', updated: 'Changes saved.' } as const;
  const flashMessage = $derived(data.flash ? FLASH_MESSAGE[data.flash] : '');

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

  // The triage radiogroup's roving tabindex and ARIA radio keyboard pattern: the selected radio is
  // the only tab stop, and Arrow/Home/End move the selection and the focus, mirroring the grid's
  // roving listbox. A declared radiogroup owes this keyboard model.
  let segEls = $state<HTMLButtonElement[]>([]);
  function selectTriage(value: Triage) {
    triage = value;
  }
  function onTriageKeydown(e: KeyboardEvent, i: number) {
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % segments.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + segments.length) % segments.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = segments.length - 1;
    else return;
    e.preventDefault();
    selectTriage(segments[next].value);
    segEls[next]?.focus();
  }

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
    return [...filtered].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
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

  // --- selection, the slide-over, and the safe-delete dialog ---
  // `selected` is the asset the slide-over (and the alertdialog) render off. The table's per-row
  // trash opens the alertdialog straight to the right face for that asset (requestDelete) without
  // opening the slide-over; a tile or row activation opens the slide-over (openAsset).
  let selected = $state<MediaLibraryEntry | null>(null);
  // True while the dialog was opened straight from a row trash without the slide-over, so the
  // {#if selected} slide-over stays closed for a delete-only intent.
  let deleteOnly = $state(false);

  // The element that opened the slide-over (a tile or a row trigger), so focus returns to it on
  // close (the non-modal region recipe: focus moves in on open, back to the origin on close).
  let panelOrigin: HTMLElement | null = null;
  let panelEl = $state<HTMLElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let deleteDialog = $state<HTMLDialogElement | null>(null);

  function openAsset(asset: MediaLibraryEntry, origin?: HTMLElement | null) {
    panelOrigin = origin ?? (document.activeElement as HTMLElement | null);
    deleteOnly = false;
    selected = asset;
    // flushSync mounts the panel synchronously so its close button exists before we move focus in.
    flushSync();
    closeButton?.focus();
  }
  /** Close the slide-over and return focus to the tile or row that opened it. */
  function closePanel() {
    selected = null;
    deleteOnly = false;
    panelOrigin?.focus();
    panelOrigin = null;
  }
  // Escape closes the slide-over (the non-modal region recipe). A window listener carries it, the
  // way EditPage's details panel does, so the non-interactive region needs no keyboard handler. The
  // dialog (when open) claims Escape natively, so the panel handles it only when no dialog is up.
  // Escape is also the native clear gesture for the toolbar's type="search" input, so the close
  // fires only when focus is inside the panel: an Escape in the search box clears it and leaves the
  // panel exactly as the user left it, while an Escape with focus in the panel still closes it.
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && selected && !deleteDialog?.open && panelEl?.contains(document.activeElement)) {
      e.preventDefault();
      closePanel();
    }
  }

  // The per-row delete intent opens the alertdialog directly on the right face for that asset.
  function requestDelete(asset: MediaLibraryEntry) {
    deleteOnly = true;
    selected = asset;
    openDeleteDialog();
  }
  // The slide-over's Delete button opens the same dialog for the already-selected asset.
  function openDeleteDialog() {
    confirmSlugInput = '';
    flushSync();
    deleteDialog?.showModal();
  }
  function closeDeleteDialog() {
    deleteDialog?.close();
    confirmSlugInput = '';
    // A row-only delete leaves no slide-over to return to, so clear the selection on cancel.
    if (deleteOnly) {
      deleteOnly = false;
      selected = null;
    }
  }

  // --- the where-used overlay the slide-over and the dialog read, grouped published-then-branch ---
  function usageEntries(hash: string): UsageEntry[] {
    return data.usage[hash]?.entries ?? [];
  }
  /** Published rows first, then the edit-branch rows. */
  function publishedRows(hash: string): UsageEntry[] {
    return usageEntries(hash).filter((e) => e.origin.kind === 'published');
  }
  function branchRows(hash: string): UsageEntry[] {
    return usageEntries(hash).filter((e) => e.origin.kind === 'branch');
  }
  const branchNameOf = (e: UsageEntry): string => (e.origin.kind === 'branch' ? e.origin.branch : '');

  // --- the safe-delete dialog's face and its type-to-confirm gate ---
  // The breaking list the dialog shows: the FRESH list from a refusal when one is present for this
  // asset, else the load-time overlay. The fresh server list supersedes a stale load-time count.
  const refusalForSelected = $derived(
    form && form.hash && selected && form.hash === selected.hash ? form : null,
  );
  // The slide-over's error alert covers two failures that leave no in-use dialog to re-open: a pure
  // ?/mediaUpdate failure (only `error`, no `hash`) and a hash-bearing delete refusal that is NOT an
  // in-use block (a 404 "not committed", with `hash` but no `usage`). An in-use refusal (usage rows)
  // re-opens the dialog instead, so it is excluded here.
  const hasUsage = $derived((form?.usage?.length ?? 0) > 0);
  const updateError = $derived(form?.error && !hasUsage ? form.error : null);
  const breakingRows = $derived.by((): UsageEntry[] => {
    if (refusalForSelected?.usage) return refusalForSelected.usage;
    return selected ? usageEntries(selected.hash) : [];
  });
  // The face is chosen by whether the asset is in use at open: in-use names what breaks and gates
  // Delete on a typed slug; orphan is a calm confirm. A refusal's fresh list also forces in-use.
  const deleteInUse = $derived(breakingRows.length > 0);
  const deleteBreakingPublished = $derived(breakingRows.filter((e) => e.origin.kind === 'published'));
  const deleteBreakingBranch = $derived(breakingRows.filter((e) => e.origin.kind === 'branch'));

  // The type-to-confirm input. The Delete submit is gated until it equals the asset slug (the one
  // legitimate disable: a visible, typed destructive confirmation, not a hidden requirement).
  let confirmSlugInput = $state('');
  const confirmMatches = $derived(selected !== null && confirmSlugInput === selected.slug);

  // Forms post full-page (no use:enhance), so on a failure the screen remounts with no selection and
  // the error would render nowhere. This effect re-surfaces the failure from the `form` prop. An
  // in-use delete refusal (usage rows) re-opens the dialog on its fresh breaking list; any other
  // hash-bearing failure (a 404 "not committed", an invalid-slug ?/mediaUpdate) re-selects the asset
  // and opens the slide-over so its error alert renders. The action redirects on success, so a
  // present `form` is always a failure to re-surface.
  //
  // The dialog is always mounted and its body reads breakingRows/deleteInUse reactively, so set the
  // state then call showModal() directly. tick() (NOT flushSync, which Svelte's flush_sync_in_effect
  // guard rejects inside an effect on a newer 5.x) flushes the new `selected` before showModal so the
  // dialog body renders the fresh asset.
  $effect(() => {
    if (!form || !form.hash) return;
    const target = data.assets.find((a) => a.hash === form!.hash);
    if (!target) return;
    if (form.usage && form.usage.length > 0) {
      // The in-use face, re-opened on the server's fresh breaking list.
      if (deleteDialog && !deleteDialog.open) {
        deleteOnly = true;
        selected = target;
        confirmSlugInput = '';
        void tick().then(() => deleteDialog?.showModal());
      }
    } else if (!selected) {
      // A hash-bearing failure that is not an in-use block: re-select the asset and open the
      // slide-over so updateError renders. Guarded on `!selected` so it runs once, not on every edit.
      deleteOnly = false;
      selected = target;
    }
  });

  // --- the copy-reference affordance, announced politely ---
  let copyNotice = $state('');
  function copyReference(token: string) {
    void navigator.clipboard?.writeText(token).then(
      () => {
        copyNotice = 'Reference copied to the clipboard.';
      },
      () => {
        copyNotice = 'Could not copy the reference.';
      },
    );
  }

  // --- the alt editor's describe/decorative model (the 2b capture-card model) ---
  // Seeded from the selected asset each time the slide-over opens: a non-empty alt is "describe", an
  // empty alt is "decorative" only when the author last chose it, else unset. The Library has no
  // stored decorative flag, so an empty alt reads as unset (needs-alt), matching MediaCaptureCard.
  let altMode = $state<'describe' | 'decorative' | null>(null);
  let altText = $state('');
  let nameInput = $state('');
  let slugInput = $state('');
  // Reseed the editable fields whenever the selected asset changes.
  $effect(() => {
    const a = selected;
    if (!a) return;
    altText = a.alt;
    altMode = a.alt.trim() !== '' ? 'describe' : null;
    nameInput = a.displayName;
    slugInput = a.slug;
  });
  // The submitted alt: a described image carries its text, a decorative or left-blank submits empty
  // (matching MediaCaptureCard's needs-alt-debt model).
  const submittedAlt = $derived(altMode === 'describe' ? altText : '');

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
      openAsset(visible[i], tileEls[i]);
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

<svelte:window onkeydown={onWindowKeydown} />

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

<!-- The action feedback strip (the office flash grammar). A persistent polite live region carries
     the success message, so an inserted-fresh element is announced reliably; the visible alert below
     keeps its styling without a role. The strip never steals focus. -->
<div class="sr-only" aria-live="polite">{flashMessage}</div>
{#if flashMessage}
  <div class="alert alert-success mb-4 text-sm">{flashMessage}</div>
{/if}
{#if data.flashError}
  <div role="alert" class="alert alert-error mb-4 text-sm">{data.flashError}</div>
{/if}
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
          bind:this={segEls[i]}
          type="button"
          role="radio"
          aria-checked={triage === seg.value}
          tabindex={triage === seg.value ? 0 : -1}
          class="{segButtonClass(triage === seg.value)} {i > 0 ? 'border-l border-[var(--cairn-card-border)]' : ''}"
          onclick={() => selectTriage(seg.value)}
          onkeydown={(e) => onTriageKeydown(e, i)}
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
            onclick={(e) => openAsset(asset, e.currentTarget)}
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
                <button type="button" class="flex w-full items-center gap-3 text-left" onclick={(e) => openAsset(asset, e.currentTarget)}>
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

<!-- A persistent polite region announces a copy-reference result. -->
<div class="sr-only" role="status" aria-live="polite">{copyNotice}</div>

{#if selected && !deleteOnly}
  {@const asset = selected}
  {@const reference = mediaToken({ slug: asset.slug, hash: asset.hash })}
  <!-- The NON-MODAL detail slide-over: no scrim, the library stays live behind it. It is a labelled
       region, not a dialog, so the list stays in the a11y tree and the tab order. Escape closes it
       and focus returns to the originating tile or row (the region-with-focus-management recipe).
       Below the narrow breakpoint the same panel reads as a bottom sheet (the responsive treatment). -->
  <aside
    bind:this={panelEl}
    role="region"
    aria-label="{asset.displayName} details"
    class="fixed inset-x-0 bottom-0 z-30 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[var(--cairn-card-border)] bg-base-100 shadow-[var(--cairn-shadow)] sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-16 sm:max-h-none sm:w-[22rem] sm:rounded-t-none sm:border-l sm:border-t-0"
  >
    <div class="flex items-center justify-between border-b border-[var(--cairn-card-border)] px-4 py-3.5">
      <h2 class="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">Asset</h2>
      <button bind:this={closeButton} type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Close details" onclick={closePanel}>
        <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto p-4">
      <!-- The large preview, object-fit contain on the quiet mat, with the broken-image affordance. -->
      <div class="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-200/60">
        {#if brokenHashes.has(asset.hash)}
          <span data-cairn-broken class="flex flex-col items-center gap-1 text-[var(--color-subtle)]">
            <ImageOffIcon class="h-8 w-8" aria-hidden="true" />
            <span class="text-xs">Image missing</span>
          </span>
        {:else}
          <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="max-h-full max-w-full object-contain" onerror={() => markBroken(asset.hash)} />
        {/if}
      </div>

      <!-- The name and the media: reference with a copy button. -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[1.0625rem] font-semibold leading-tight break-words">{asset.displayName}</span>
        <span class="flex items-center gap-1.5">
          <code class="min-w-0 break-all font-[family-name:var(--font-editor)] text-[0.6875rem] text-[var(--color-muted)]">{reference}</code>
          <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Copy reference" onclick={() => copyReference(reference)}>
            <CopyIcon class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>

      <!-- The metadata edit form: the display name, the slug, and the default alt, posting one Save
           to ?/mediaUpdate. The alt is the asset DEFAULT for new placements, never a rewrite of
           the alt already committed in existing placements (decision 6). -->
      <form method="POST" action="?/mediaUpdate" class="flex flex-col gap-4">
        <CsrfField />
        <input type="hidden" name="hash" value={asset.hash} />

        <label class="flex flex-col gap-1">
          <span class="text-[0.8125rem] font-medium">Name</span>
          <input class="input input-sm" name="displayName" bind:value={nameInput} autocomplete="off" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-[0.8125rem] font-medium">URL slug</span>
          <input class="input input-sm font-[family-name:var(--font-editor)]" name="slug" bind:value={slugInput} autocomplete="off" />
        </label>

        <!-- The alt editor: the describe/decorative radiogroup (the 2b model) plus the alt field.
             Alt is debt: Save is never gated on it, and a left-blank or a decorative both submit an
             empty alt. The submitted value rides a hidden input so the disabled-or-absent textarea
             never strands the field. -->
        <fieldset class="flex flex-col gap-2" aria-describedby="cairn-ml-alt-note">
          <legend class="text-[0.8125rem] font-medium">Default alt text</legend>
          <p id="cairn-ml-alt-note" class="text-xs text-[var(--color-muted)]">
            The default for the next time this image is placed. It does not change the alt on pages that already use it. You can save without it and add it later.
          </p>
          <input type="hidden" name="alt" value={submittedAlt} />
          <label class="flex cursor-pointer items-center gap-2">
            <input type="radio" class="radio radio-sm" name="cairn-ml-alt-mode" value="describe" bind:group={altMode} />
            <span class="text-sm">Describe it</span>
          </label>
          {#if altMode === 'describe'}
            <textarea class="textarea textarea-sm ml-6 w-[calc(100%-1.5rem)]" aria-label="Alt text description" rows="2" bind:value={altText}></textarea>
          {/if}
          <label class="flex cursor-pointer items-center gap-2">
            <input type="radio" class="radio radio-sm" name="cairn-ml-alt-mode" value="decorative" bind:group={altMode} />
            <span class="text-sm">Decorative</span>
          </label>
        </fieldset>

        {#if updateError}
          <p role="alert" class="text-xs text-[var(--cairn-error-ink)]">{updateError}</p>
        {/if}

        <div class="flex justify-end">
          <button type="submit" class="btn btn-sm btn-primary">Save</button>
        </div>
      </form>

      <!-- Where used, grouped published-then-branch. Each entry links to its editor; a branch entry
           names its branch. No entries shows the no-references treatment (never a bare "unused"). -->
      <div class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between">
          <span class={headerLabel}>Where used</span>
          {#if usageEntries(asset.hash).length > 0}
            <span class="text-xs text-[var(--color-muted)]">{usageEntries(asset.hash).length} {usageEntries(asset.hash).length === 1 ? 'entry' : 'entries'}</span>
          {/if}
        </div>

        {#if usageEntries(asset.hash).length === 0}
          <div class="flex items-start gap-2.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
            <Link2OffIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
            <span class="text-[0.8125rem] leading-relaxed">No references found. Deleting this changes nothing readers see.</span>
          </div>
        {:else}
          {#if publishedRows(asset.hash).length > 0}
            <div class="flex flex-col gap-1.5">
              <span class="text-[0.6875rem] font-semibold text-[var(--color-muted)]">Published on the site</span>
              <ul class="flex list-none flex-col gap-1 p-0">
                {#each publishedRows(asset.hash) as entry (entry.concept + '/' + entry.id)}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-100 px-2.5 py-2 no-underline hover:border-primary/40">
                      <FileTextIcon class="h-3.5 w-3.5 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                      <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{entry.title}</span>
                      <ChevronRightIcon class="h-3.5 w-3.5 flex-none text-[var(--color-muted)] opacity-60" aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if branchRows(asset.hash).length > 0}
            <div class="flex flex-col gap-1.5">
              <span class="text-[0.6875rem] font-semibold text-[var(--color-muted)]">In an unpublished edit</span>
              <ul class="flex list-none flex-col gap-1 p-0">
                {#each branchRows(asset.hash) as entry (entry.concept + '/' + entry.id + branchNameOf(entry))}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-100 px-2.5 py-2 no-underline hover:border-primary/40">
                      <FileTextIcon class="h-3.5 w-3.5 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                      <span class="flex min-w-0 flex-1 flex-col">
                        <span class="truncate text-[0.8125rem] font-medium">{entry.title}</span>
                        <span class="truncate font-[family-name:var(--font-editor)] text-[0.625rem] text-[var(--cairn-warning-ink)]">{branchNameOf(entry)}</span>
                      </span>
                      <ChevronRightIcon class="h-3.5 w-3.5 flex-none text-[var(--color-muted)] opacity-60" aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </div>

      <!-- The metadata grid. -->
      <div>
        <span class={headerLabel}>Details</span>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[0.8125rem]">
          {#if dimensions(asset)}
            <dt class="text-[var(--color-muted)]">Dimensions</dt>
            <dd class="m-0 text-right tabular-nums">{dimensions(asset)}</dd>
          {/if}
          <dt class="text-[var(--color-muted)]">Size</dt>
          <dd class="m-0 text-right tabular-nums">{formatBytes(asset.bytes)}</dd>
          <dt class="text-[var(--color-muted)]">Type</dt>
          <dd class="m-0 text-right">{typeLabel(asset)}</dd>
          <dt class="text-[var(--color-muted)]">Added</dt>
          <dd class="m-0 text-right tabular-nums">{formatAdded(asset.createdAt)}</dd>
        </dl>
      </div>

      <!-- The actions. Replace is deferred (no Replace control in this slice). -->
      <div class="flex gap-2.5 border-t border-[var(--cairn-card-border)] pt-4">
        <button type="button" class="btn btn-sm flex-1 border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={openDeleteDialog}>
          <Trash2Icon class="h-4 w-4" aria-hidden="true" /> Delete
        </button>
      </div>
    </div>
  </aside>
{/if}

<!-- The two-faced safe-delete alertdialog: a native modal <dialog> (the focus trap is native), with
     NO light dismiss (no method="dialog" backdrop). The in-use face names the breaking entries and
     gates Delete behind the typed-slug confirmation; the orphan face is a calm confirm. Both post
     hash to ?/mediaDelete; the in-use face also posts confirmSlug. -->
<dialog
  bind:this={deleteDialog}
  class="modal"
  role="alertdialog"
  aria-labelledby="cairn-ml-delete-title"
  aria-describedby="cairn-ml-delete-desc"
  oncancel={closeDeleteDialog}
>
  {#if selected}
    {@const asset = selected}
    <div class="modal-box max-w-lg">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box {deleteInUse ? 'bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]' : 'bg-base-content/[0.07] text-[var(--color-muted)]'}" aria-hidden="true">
          {#if deleteInUse}<TriangleAlertIcon class="h-5 w-5" />{:else}<Trash2Icon class="h-5 w-5" />{/if}
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-delete-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">Delete {asset.displayName}?</h2>
          <p id="cairn-ml-delete-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            {#if deleteInUse}
              Deleting this breaks the image in {breakingRows.length} {breakingRows.length === 1 ? 'entry' : 'entries'}. Type the name to delete it anyway.
            {:else}
              No references found. Deleting this changes nothing readers see.
            {/if}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        {#if deleteInUse}
          <div>
            <span class="mb-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--cairn-error-ink)]">
              <XIcon class="h-3.5 w-3.5" aria-hidden="true" /> These would break
            </span>
            <ul class="flex max-h-44 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-2">
              {#if deleteBreakingPublished.length > 0}
                <li class="px-1.5 pb-0.5 pt-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Published on the site</li>
                {#each deleteBreakingPublished as entry (entry.concept + '/' + entry.id)}
                  <li><a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2 rounded px-1.5 py-1 text-[0.8125rem] font-medium no-underline hover:bg-[var(--cairn-error-ink)]/10">{entry.title}</a></li>
                {/each}
              {/if}
              {#if deleteBreakingBranch.length > 0}
                <li class="px-1.5 pb-0.5 pt-1 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">In an unpublished edit</li>
                {#each deleteBreakingBranch as entry (entry.concept + '/' + entry.id + branchNameOf(entry))}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex flex-col rounded px-1.5 py-1 no-underline hover:bg-[var(--cairn-error-ink)]/10">
                      <span class="text-[0.8125rem] font-medium">{entry.title}</span>
                      <span class="font-[family-name:var(--font-editor)] text-[0.6rem] text-[var(--cairn-warning-ink)]">{branchNameOf(entry)}</span>
                    </a>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        {/if}

        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
          <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
          <span>Every version stays in git history, so a developer can bring this back later.</span>
        </div>

        <form method="POST" action="?/mediaDelete" class="flex flex-col gap-3">
          <CsrfField />
          <input type="hidden" name="hash" value={asset.hash} />
          {#if deleteInUse}
            <input type="hidden" name="confirmSlug" value={confirmSlugInput} />
            <div class="flex flex-col gap-1.5">
              <label class="text-[0.875rem]" for="cairn-ml-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] text-[0.8125rem] font-semibold">{asset.slug}</code> to delete it anyway.</label>
              <input id="cairn-ml-confirm" class="input input-sm border-[var(--cairn-error-border)] font-[family-name:var(--font-editor)]" autocomplete="off" placeholder="Type the asset slug" bind:value={confirmSlugInput} />
            </div>
          {/if}
          <div class="flex justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
            <button type="button" class="btn btn-sm" onclick={closeDeleteDialog}>Cancel</button>
            {#if deleteInUse}
              <button type="submit" class="btn btn-sm btn-error" disabled={!confirmMatches}>Delete anyway</button>
            {:else}
              <button type="submit" class="btn btn-sm btn-error">Delete it</button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}
</dialog>
