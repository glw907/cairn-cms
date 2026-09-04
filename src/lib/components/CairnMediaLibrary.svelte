<!--
@component
The admin Media Library screen, a peer of Posts and Pages. It browses every committed media asset,
shows where each one is used, edits its name and default alt, and deletes it safely. The resting
surface is a visual contact-sheet grid (a roving-tabindex listbox of tiles), with a list-density
toggle that flips to an enriched sortable table. One toolbar row carries search, a pick-one triage
radiogroup (All, Needs alt, No references found), and the density toggle. Filtering, sorting, and a
growing client window all run over the full loaded set in component state.

Multi-select rides a Set of selected hashes, decoupled from the slide-over's single asset and from
roving focus. The grid is an APG multiselectable listbox (aria-multiselectable, real cell focus):
Space toggles the focused tile, Shift+Arrow extends a range, Ctrl/Cmd+A selects every visible asset,
and Escape clears. The list density is a plain selectable table whose leading native-checkbox column
is the selection signal (no grid role, since it has no grid keyboard model). A sticky action bar
appears on the first selection with a live count, the scope, Select all in view, Clear, and the
reversible bulk Delete.

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

Its actions are wired only by `createCairnAdmin`, through the wide, unexported
`createContentRoutesInternal` object. No public route factory carries them: the public
`createContentRoutes` returns only the narrow `ContentRoutes` view a site hand-mounts, and the ten
media-janitorial actions this screen posts to (`?/mediaUpdate`, `?/mediaDelete`,
`?/mediaBulkDelete`, `?/mediaOrphanScan`, `?/mediaOrphanPurge`, `?/mediaReplacePreview`,
`?/mediaReplace`, `?/mediaAltPreview`, `?/mediaAltPropagate`, `?/mediaLibraryUpload`) sit outside
that narrow view. Mounting this component on a hand-wired route leaves every one of those posts
unhandled.

It is node-safe by construction: it types assets with MediaLibraryEntry from the shared node-safe
projection and pulls in no editor module (the editor-boundary test bars a @codemirror leak).
-->
<script lang="ts">
  import { flushSync, getContext, tick } from 'svelte';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaLibraryData, ContentFormFailure } from '../sveltekit/content-routes.js';
  import type { UsageEntry } from '../media/usage.js';
  import { publicPath } from '../media/naming.js';
  import { formatMediaToken } from '../media/reference.js';
  import { MEDIA_BASE_CONTEXT_KEY, DEFAULT_MEDIA_BASE } from './media-base-context.js';
  import { segmentTintClass } from './segmented-control.js';
  import { confirmGateMatches } from './typed-confirm.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import CsrfField from './CsrfField.svelte';
  import MediaOrphanTools from './MediaOrphanTools.svelte';
  import MediaBulkDeleteDialog from './MediaBulkDeleteDialog.svelte';
  import MediaReplaceDialog from './MediaReplaceDialog.svelte';
  import MediaAltFillDialog from './MediaAltFillDialog.svelte';
  import MediaUploadDialog from './MediaUploadDialog.svelte';
  import { usageCount as usageCountOf, needsAlt as needsAltOf, usageEntries as usageEntriesOf, publishedRows as publishedRowsOf, branchRows as branchRowsOf, branchNameOf } from './media-library-helpers.js';
  import {
    SearchIcon,
    UploadIcon,
    LayoutGridIcon,
    ListIcon,
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
    RefreshCwIcon,
    MegaphoneIcon,
    DatabaseIcon,
  } from './admin-icons.js';
  import {
    PageHeader,
    ListToolbar,
    AdminTable,
    StatusChip,
    EmptyState,
    formatCivilDate,
    type ListToolbarFilter,
  } from '../admin-toolkit/index.js';

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

  // The success flash a redirected action carried back: a safe-delete or a metadata edit. Every
  // media refusal now answers in place through `form`, so there is no redirected conflict error
  // to carry here.
  const FLASH_MESSAGE = {
    deleted: 'Asset deleted.',
    updated: 'Changes saved.',
    replaced: 'Asset replaced.',
    altPropagated: 'Alt text applied.',
    bulkDeleted: 'Assets deleted.',
    orphansPurged: 'Orphans purged.',
    uploaded: 'Asset uploaded.',
  } as const;
  const flashMessage = $derived(data.flash ? FLASH_MESSAGE[data.flash] : '');

  // --- the per-hash usage facts the screen joins onto each asset, over media-library-helpers.ts's
  // pure functions (shared with the extracted bulk-delete/orphan-tools dialogs) ---
  /** The distinct-entry usage count for an asset; zero when the asset has no usage key. */
  function usageCount(hash: string): number {
    return usageCountOf(data.usage, hash);
  }
  const needsAlt = needsAltOf;

  // --- the live count line and the triage counts, over the FULL loaded set ---
  const usedCount = $derived(data.assets.filter((a) => usageCount(a.hash) > 0).length);
  const triageCounts = $derived({
    all: data.assets.length,
    needsAlt: data.assets.filter((a) => needsAlt(a)).length,
    // No references found: no usage entry, or a count of zero. The internal enum stays `unused`; the
    // visible label reads "No references found" because absence of a found reference is not proof of
    // disuse (cairn cannot see a raw-HTML image or a URL hardcoded into a template).
    unused: data.assets.filter((a) => usageCount(a.hash) === 0).length,
  });

  // --- the toolbar state ---
  type Triage = 'all' | 'needs-alt' | 'unused';
  type Density = 'grid' | 'list';
  let query = $state('');
  let triage = $state<Triage>('all');
  let density = $state<Density>('grid');

  // The triage segments, in display order, each naming its value, label, and live count. The
  // admin toolkit's ListToolbar renders these as a segmented filter, an ARIA radiogroup with the
  // roving-tabindex keyboard pattern this triage originated (see ListToolbar's own header comment).
  const segments: { value: Triage; label: string; count: () => number }[] = [
    { value: 'all', label: 'All', count: () => triageCounts.all },
    { value: 'needs-alt', label: 'Needs alt', count: () => triageCounts.needsAlt },
    { value: 'unused', label: 'No references found', count: () => triageCounts.unused },
  ];

  function selectTriage(value: string) {
    triage = value as Triage;
  }

  const triageFilter: ListToolbarFilter = $derived({
    id: 'triage',
    label: 'Filter assets',
    display: 'segmented',
    options: segments.map((seg) => ({ value: seg.value, label: seg.label, count: seg.count() })),
    value: triage,
    onChange: selectTriage,
  });

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

  // The component's own root element, bound below on the wrapping <div>. It scopes the Escape
  // open-dialog query (onWindowKeydown) to this component's subtree; see that function's comment
  // for the two-scope rationale it shares with MediaUploadDialog's libraryDropBusy.
  let rootEl = $state<HTMLElement | undefined>();

  // The extracted dialog components, opened imperatively from the shell's own trigger buttons.
  // Typed structurally over their exported open()-shaped API (the EditPage DialogHandle idiom);
  // MediaUploadDialog's openUpload/onPageDragover/onPageDrop are its own variant of the same shape.
  let bulkDeleteDialog = $state<{ open: (hashes: string[], origin?: HTMLElement | null) => void } | null>(null);
  let orphanTools = $state<{ open: (origin?: HTMLElement | null) => void } | null>(null);
  let replaceDialogRef = $state<{ open: (asset: MediaLibraryEntry, origin?: HTMLElement | null) => void; close: () => void } | null>(null);
  let altFillDialogRef = $state<{ open: (asset: MediaLibraryEntry, origin?: HTMLElement | null) => void; close: () => void } | null>(null);
  let uploadDialogRef = $state<{
    openUpload: (origin?: HTMLElement | null) => void;
    onPageDragover: (e: DragEvent) => void;
    onPageDrop: (e: DragEvent) => void;
  } | null>(null);

  // The element that opened the slide-over (a tile or a row trigger), so focus returns to it on
  // close (the non-modal region recipe: focus moves in on open, back to the origin on close).
  let panelOrigin: HTMLElement | null = null;
  let panelEl = $state<HTMLElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let deleteDialog = $state<HTMLDialogElement | null>(null);

  function openAsset(asset: MediaLibraryEntry, origin?: HTMLElement | null) {
    panelOrigin = resolveDialogOrigin(origin);
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
    panelOrigin = refocusDialogOrigin(panelOrigin);
  }
  // Escape closes the slide-over (the non-modal region recipe). A window listener carries it, the
  // way EditPage's details panel does, so the non-interactive region needs no keyboard handler. The
  // dialog (when open) claims Escape natively, so the panel handles it only when no dialog is up.
  // Escape is also the native clear gesture for the toolbar's type="search" input, so the close
  // fires only when focus is inside the panel: an Escape in the search box clears it and leaves the
  // panel exactly as the user left it, while an Escape with focus in the panel still closes it.
  // Escape precedence (no overlap): an open dialog claims Escape natively (its showModal owns it, so
  // this handler stands down while any dialog is open); else an open slide-over with focus inside it
  // closes (today's behavior); else a non-empty selection is cleared. The search box keeps its own
  // native Escape-to-clear: the selection clear fires only when focus is NOT in the search input.
  //
  // The open-dialog check is scoped to THIS component's own subtree (rootEl), not document-wide. Some
  // of the six dialogs it must see now render from a child component (MediaOrphanTools,
  // MediaBulkDeleteDialog), so a check by named ref cannot reach them; a rootEl-scoped query still
  // finds them, since a child mounts inline into the parent's DOM subtree. A document-wide query would
  // overreach the other way: the admin shell also owns a dialog (the command palette), and a library
  // Escape must never stand down because a wholly unrelated dialog elsewhere on the page happens to be
  // open. MediaUploadDialog's libraryDropBusy makes the opposite call on purpose for a different
  // question (drag-drop should stand down for ANY open dialog, the palette included), so it stays
  // document-scoped; see its own comment for that half of the split.
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (rootEl?.querySelector('dialog[open]')) return;
    if (selected && panelEl?.contains(document.activeElement)) {
      e.preventDefault();
      closePanel();
      return;
    }
    if (selectedCount > 0) {
      const active = document.activeElement as HTMLElement | null;
      const inSearch = active instanceof HTMLInputElement && active.type === 'search';
      if (inSearch) return;
      e.preventDefault();
      clearSelection();
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

  // The Library upload flow (choosing, dropping, capturing, and committing a new asset) lives in
  // MediaUploadDialog, mounted below with uploadDialogRef bound. The header and empty-state Upload
  // buttons call its exported openUpload(origin); the page-wide drop target below wires its exported
  // onPageDragover/onPageDrop onto this component's own <svelte:window>.

  // --- the where-used overlay the slide-over and the dialog read, grouped published-then-branch,
  // over media-library-helpers.ts's pure functions (shared with the extracted orphan tools) ---
  function usageEntries(hash: string): UsageEntry[] {
    return usageEntriesOf(data.usage, hash);
  }
  function publishedRows(hash: string): UsageEntry[] {
    return publishedRowsOf(data.usage, hash);
  }
  function branchRows(hash: string): UsageEntry[] {
    return branchRowsOf(data.usage, hash);
  }

  // --- the safe-delete dialog's face and its type-to-confirm gate ---
  // The breaking list the dialog shows: the FRESH list from a refusal when one is present for this
  // asset, else the load-time overlay. The fresh server list supersedes a stale load-time count.
  const refusalForSelected = $derived(
    form && form.hash && selected && form.hash === selected.hash ? form : null,
  );
  // The slide-over's error alert covers every hash-bearing failure that leaves no in-use dialog to
  // re-open: a ?/mediaUpdate or ?/mediaAltPropagate refusal, and a hash-bearing delete refusal that
  // is NOT an in-use block (a 404 "not committed", with `hash` but no `usage`). An in-use refusal
  // (usage rows) re-opens the dialog instead, so it is excluded here.
  const hasUsage = $derived((form?.usage?.length ?? 0) > 0);
  const updateError = $derived(form?.error && !hasUsage ? form.error : null);
  // The catch-all for a refusal the effect below could not re-home: no hash at all (a shell-level
  // action's fail(500), say), or a hash the effect could not resolve to a known asset (a 404 whose
  // asset is genuinely absent from `data.assets` too). Excluded whenever a more specific surface
  // already claims the message: the in-use dialog (hasUsage) or the slide-over (selected, which the
  // effect sets whenever it finds a matching asset).
  const topLevelError = $derived(form?.error && !hasUsage && !selected ? form.error : null);
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
  const confirmMatches = $derived(selected !== null && confirmGateMatches(confirmSlugInput, selected.slug));

  // Forms post full-page (no use:enhance), so on a failure the screen remounts with no selection and
  // the error would render nowhere. This effect re-surfaces the failure from the `form` prop. An
  // in-use delete refusal (usage rows) re-opens the dialog on its fresh breaking list; any other
  // hash-bearing failure (a 404 "not committed", an invalid-slug ?/mediaUpdate, a manifest-changed
  // ?/mediaUpdate or ?/mediaAltPropagate conflict) re-selects the asset and opens the slide-over so
  // its error alert renders. A failure this effect cannot re-home (no hash, or a hash absent from
  // `data.assets`) falls through to the top-level banner below instead. The action redirects on
  // success, so a present `form` is always a failure to re-surface.
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

  // --- the multi-select model (the APG multiselectable listbox, shared by the grid and the table) ---
  // The selection is a Set of asset hashes, distinct from `selected` (the single asset the slide-over
  // renders). Focus and selection are decoupled: roving the active tile never selects, Space/checkbox
  // toggles, Shift+Arrow extends a range, Ctrl/Cmd+A selects every visible asset, Escape clears. The
  // Set is never mutated in place (no reactivity on Set mutation here); every change reassigns, the
  // same pattern markBroken uses below.
  let selectedHashes = $state(new Set<string>());
  const selectedCount = $derived(selectedHashes.size);
  // The anchor index for a Shift+Arrow range, set on a plain toggle (Space or a checkbox/click). Null
  // until the first plain selection in the current run.
  let selectAnchor = $state<number | null>(null);

  /** Toggle one hash, set the range anchor to its visible index, and reassign the Set. */
  function toggleSelect(hash: string) {
    const next = new Set(selectedHashes);
    if (next.has(hash)) next.delete(hash);
    else next.add(hash);
    selectedHashes = next;
    selectAnchor = visible.findIndex((a) => a.hash === hash);
  }
  /** Select every hash between the anchor and `to` (inclusive) over the visible set, additively. */
  function selectRange(to: number) {
    if (selectAnchor === null) selectAnchor = to;
    const lo = Math.min(selectAnchor, to);
    const hi = Math.max(selectAnchor, to);
    const next = new Set(selectedHashes);
    for (let j = lo; j <= hi; j++) {
      const a = visible[j];
      if (a) next.add(a.hash);
    }
    selectedHashes = next;
  }
  /** Select every currently-visible asset (Ctrl/Cmd+A and the bar's Select all). */
  function selectAllVisible() {
    const next = new Set(selectedHashes);
    for (const a of visible) next.add(a.hash);
    selectedHashes = next;
    selectAnchor = 0;
  }
  /** Empty the selection (the bar's Clear and the Escape clear gesture). */
  function clearSelection() {
    if (selectedHashes.size === 0) return;
    selectedHashes = new Set<string>();
    selectAnchor = null;
  }
  // Drop any selected hash that has filtered out of the visible set so the count and the bar's scope
  // never count an asset the user can no longer see. Reassign only when the set actually shrinks.
  $effect(() => {
    const live = new Set(visible.map((a) => a.hash));
    let changed = false;
    for (const h of selectedHashes) {
      if (!live.has(h)) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    const next = new Set<string>();
    for (const h of selectedHashes) if (live.has(h)) next.add(h);
    selectedHashes = next;
  });

  // The bar's scope line: how many of the selection are in this view, split by usage so the confirm's
  // skip-and-report path is foreshadowed (Task 8 reads the same split).
  const selectionScope = $derived.by(() => {
    let noRefs = 0;
    let used = 0;
    for (const a of visible) {
      if (!selectedHashes.has(a.hash)) continue;
      if (usageCount(a.hash) === 0) noRefs++;
      else used++;
    }
    return { noRefs, used };
  });

  // The where-used line for one broken-reference row: a plain "used in N entries" count.
  function brokenWhereUsed(count: number): string {
    if (count === 0) return 'no references found';
    return `used in ${count} ${count === 1 ? 'entry' : 'entries'}`;
  }

  function onGridKeydown(e: KeyboardEvent, i: number) {
    // Ctrl/Cmd+A selects every visible asset (the listbox owns the shortcut here).
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      selectAllVisible();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const to = Math.min(i + 1, visible.length - 1);
      if (e.shiftKey) selectRange(to);
      focusTile(to);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const to = Math.max(i - 1, 0);
      if (e.shiftKey) selectRange(to);
      focusTile(to);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTile(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTile(visible.length - 1);
    } else if (e.key === ' ') {
      // Space toggles selection of the focused tile; it never activates the slide-over.
      e.preventDefault();
      toggleSelect(visible[i].hash);
    } else if (e.key === 'Enter') {
      // Enter activates: it opens the detail slide-over (selection is Space and the checkbox).
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
  function formatBytes(bytes: number): string {
    // A non-breaking space between the number and its unit, so a narrow metadata line never
    // wraps "482" onto one line and "KB" onto the next.
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // The delivery base the tile thumbnails compose under. `CairnAdminShell` provides the site's
  // resolved base to every authed descendant through this key; a bare mount outside it (the
  // reproductions module, a test) resolves to the same /media default publicPath already carries.
  const mediaBase = getContext<string | undefined>(MEDIA_BASE_CONTEXT_KEY) ?? DEFAULT_MEDIA_BASE;

  function thumbSrc(asset: MediaLibraryEntry): string {
    return publicPath(asset.slug, asset.hash, asset.ext, 'slug', mediaBase);
  }

  function densityButtonClass(on: boolean): string {
    return `inline-flex items-center justify-center rounded-md p-1.5 hover:bg-base-content/[0.06] ${segmentTintClass(on)}`;
  }

  const headerLabel = 'type-label font-semibold uppercase tracking-[0.08em] text-muted';

  // The header's meta line (the office recipe's live count line, PageHeader's own home for a
  // page-level count outside a toolbar): the library's total image count, its used count, and its
  // total stored bytes, unaffected by the toolbar's own search/triage scope below.
  const libraryMeta = $derived(
    `${triageCounts.all} ${triageCounts.all === 1 ? 'image' : 'images'}, ${usedCount} used on the site · ${formatBytes(totalBytes)} stored`,
  );
</script>

<svelte:window
  onkeydown={onWindowKeydown}
  ondragover={(e) => uploadDialogRef?.onPageDragover(e)}
  ondrop={(e) => uploadDialogRef?.onPageDrop(e)}
/>

<!-- The wrapping element rootEl binds to, so onWindowKeydown's Escape open-dialog check can scope
     itself to this component's own subtree instead of the whole document (see that function's
     comment). Plain, unstyled: every visual and layout class stays exactly where it already was. -->
<div bind:this={rootEl}>
{#snippet uploadAction()}
  <button type="button" class="btn btn-sm shrink-0 border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)]" onclick={(e) => uploadDialogRef?.openUpload(e.currentTarget as HTMLElement)}>
    <UploadIcon class="h-4 w-4" /> Upload
  </button>
{/snippet}

<PageHeader eyebrow="Media" title="Media library" meta={libraryMeta} action={uploadAction} />

<!-- The action feedback strip (the office flash grammar). A persistent polite live region carries
     the success message, so an inserted-fresh element is announced reliably; the visible alert below
     keeps its styling without a role. The strip never steals focus. -->
<div class="sr-only" aria-live="polite">{flashMessage}</div>
{#if flashMessage}
  <div class="alert alert-success mb-4 type-body">{flashMessage}</div>
{/if}
{#if data.error}
  <div role="alert" class="alert alert-warning mb-4 type-body">{data.error}</div>
{/if}
{#if topLevelError}
  <div role="alert" class="alert alert-error mb-4 type-body">{topLevelError}</div>
{/if}

{#if data.assets.length === 0}
  <!-- The empty state owns the content area (the office recipe, the admin toolkit's EmptyState):
       the mark, the copy, and an Upload CTA over a dropzone line. Triage and search stay hidden
       until there is content. -->
  {#snippet emptyUploadAction()}
    <div class="mt-1 flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] px-7 py-5 text-muted">
      <button type="button" class="btn btn-sm border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)]" onclick={(e) => uploadDialogRef?.openUpload(e.currentTarget as HTMLElement)}>
        <UploadIcon class="h-4 w-4" /> Upload an image
      </button>
      <span class="type-meta">or drop a file anywhere on this page</span>
    </div>
  {/snippet}
  <EmptyState
    heading="No media yet"
    message="Upload an image and it shows up here, ready to drop into a post or set as a hero."
    action={emptyUploadAction}
  />
{:else}
  <!-- One toolbar row (the admin toolkit's ListToolbar): search, the triage as a segmented filter,
       and the trailing grid/list density toggle plus the orphan-scan entry, screen-specific view
       controls the toolkit has no vocabulary for. -->
  <div class="mb-4">
    {#snippet toolbarTrailing()}
      <!-- The on-demand orphan scan entry: a quiet bordered office control, NEVER the danger family
           (it opens a scan, not a purge). The mockup places it beside Upload; the Library has no
           Upload button in the toolbar, so it sits beside the density toggle instead. -->
      <button
        type="button"
        class="btn btn-sm border-[var(--cairn-card-border)] bg-base-100 font-normal text-muted hover:bg-base-content/[0.06]"
        aria-haspopup="dialog"
        onclick={(e) => orphanTools?.open(e.currentTarget as HTMLElement)}
      >
        <DatabaseIcon class="h-4 w-4" aria-hidden="true" /> Find orphaned files
      </button>

      <div role="group" aria-label="Layout density" class="bg-base-100 inline-flex items-center gap-1 rounded-lg border border-[var(--cairn-card-border)] p-0.5">
        <button type="button" aria-label="Grid view" aria-pressed={density === 'grid'} class={densityButtonClass(density === 'grid')} onclick={() => (density = 'grid')}>
          <LayoutGridIcon class="h-4 w-4" />
        </button>
        <button type="button" aria-label="List view" aria-pressed={density === 'list'} class={densityButtonClass(density === 'list')} onclick={() => (density = 'list')}>
          <ListIcon class="h-4 w-4" />
        </button>
      </div>
    {/snippet}
    <ListToolbar
      search={query}
      onSearch={(value) => (query = value)}
      searchLabel="Search the media library"
      filters={[triageFilter]}
      count={sorted.length}
      itemLabel="images"
      trailing={toolbarTrailing}
    />
  </div>

  {#if triage === 'unused'}
    <!-- The facet preamble: a calm dashed report-only aside above the "No references found" set,
         naming WHY these are candidates and WHAT cairn cannot see, at the point of action. Never the
         danger family: selecting is not destroying. -->
    <div class="mb-3 flex items-start gap-2.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200 px-3.5 py-2.5">
      <FileTextIcon class="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <p class="type-meta leading-relaxed text-base-content">
        <b class="font-semibold">No reference found in any tracked branch.</b> Nothing on the site or in an open edit points to these.
        <span class="mt-0.5 block type-meta text-muted">
          "No references found" is not the same as unused. cairn cannot see a raw-HTML image or a URL hardcoded into a site template, so check anything you are unsure about before deleting it.
        </span>
      </p>
    </div>
  {/if}

  {#if sorted.length === 0}
    <!-- A filter or search narrowed the set to zero; the assets exist, none match. -->
    <div role="status" class="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchIcon class="h-8 w-8 text-subtle opacity-40" aria-hidden="true" />
      <p class="type-body text-muted">No media match this filter.</p>
    </div>
  {:else if density === 'grid'}
    <!-- The grid: a roving-tabindex multiselectable listbox of tiles. One tabstop; arrows move the
         roving index; Enter opens the detail; Space toggles selection (focus and selection are
         decoupled). Each tile carries a native select checkbox, names the asset, its alt status (a
         glyph plus a label, never hue alone), and a compact usage marker. -->
    <ul role="listbox" aria-multiselectable="true" aria-label="Media library" class="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      {#each visible as asset, i (asset.hash)}
        {@const used = usageCount(asset.hash)}
        {@const missing = needsAlt(asset)}
        {@const picked = selectedHashes.has(asset.hash)}
        <li role="presentation" class="contents">
          <div
            bind:this={tileEls[i]}
            role="option"
            aria-selected={picked}
            tabindex={i === activeIndex ? 0 : -1}
            aria-label="{asset.displayName}. {missing ? 'Needs alt text' : 'Described'}. {used > 0 ? `Found in ${used} ${used === 1 ? 'entry' : 'entries'}` : 'No references found'}."
            class="relative flex cursor-pointer flex-col overflow-hidden card-shell outline-hidden transition-shadow focus-visible:ring-2 focus-visible:ring-primary/70 {picked ? 'ring-2 ring-primary/70' : selected?.hash === asset.hash ? 'ring-2 ring-primary/40' : ''}"
            onclick={(e) => openAsset(asset, e.currentTarget)}
            onkeydown={(e) => onGridKeydown(e, i)}
          >
            <!-- The selection checkbox, top-left: a real native checkbox in a soft chip so it reads on
                 any thumbnail. Clicking it toggles the selection only; it never opens the slide-over.
                 The wrapper is one step larger than daisyUI v5's default 24px `.checkbox` (h-7/w-7,
                 not h-6/w-6): at h-6 the checkbox exactly fills the plate and its own ring has no
                 room to paint, leaving no visible contrast plate at all. -->
            <span class="absolute left-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-base-100/90 shadow-sm">
              <input
                type="checkbox"
                class="checkbox"
                checked={picked}
                aria-label="Select {asset.displayName}"
                onclick={(e) => e.stopPropagation()}
                onchange={() => toggleSelect(asset.hash)}
              />
            </span>
            <div class="relative flex aspect-[4/3] items-center justify-center bg-base-200/60">
              <!-- The usage marker, top-right: a used count, or the warning-ink "Not referenced"
                   chip. The category reads "No references found" (renamed from "Unused"): a found
                   reference is not proof of use, and absence of one is not proof of disuse. -->
              {#if used > 0}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 type-chip font-semibold tracking-small-semibold text-muted">used {used}</span>
              {:else}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 type-chip font-semibold tracking-small-semibold cairn-text-warning">Not referenced</span>
              {/if}
              {#if brokenHashes.has(asset.hash)}
                <span data-cairn-broken class="flex flex-col items-center gap-1 text-subtle">
                  <ImageOffIcon class="h-7 w-7" aria-hidden="true" />
                  <span class="type-chip">Image missing</span>
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
            <!-- flex-wrap plus the name's own min-width floor give the name priority at the
                 narrowest card widths: the fixed-width badge wraps to its own row underneath
                 rather than squeezing the name down to one letter (audit finding, the optical
                 ledger's 320/390 media-library entry). -->
            <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-[var(--cairn-card-border)] px-2.5 py-2">
              <span class="cairn-ml-name min-w-[5rem] flex-1 truncate type-meta font-medium">{asset.displayName}</span>
              <!-- The alt-status marker reserves a fixed width, comfortably past either label's own
                   natural width ("Needs alt" vs "Described", each with its glyph), and never
                   shrinks, so the title's flex-1 truncation reads the same available width
                   regardless of which state renders (audit finding 10: today the title only
                   truncates for whichever label happens to be narrower). A flex item's default
                   min-width:auto otherwise lets its own content override a smaller explicit width,
                   so the reserve must exceed the content, not merely match it. -->
              <span class="w-24 shrink-0 text-right">
                {#if missing}
                  <StatusChip register="warning" label="Needs alt" size="xs" />
                {:else}
                  <StatusChip label="Described" size="xs" />
                {/if}
              </span>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <!-- The list density: a plain selectable table. Each row opens the detail (sets `selected`); the
         Added column sorts through a real header button with aria-sort; the per-row delete is always
         visible. Multi-select rides the leading native-checkbox column, which is the APG-correct
         pattern for a selectable table. The earlier role="grid" + aria-multiselectable promised grid
         keyboard navigation (arrow cell moves, roving tabindex) the table never implemented, so it
         is dropped: a plain table with a checkbox column is honest and fully usable. -->
    <div class="overflow-hidden card-shell card-shadow">
      <AdminTable density="sm" rowCount={visible.length}>
        {#snippet header()}
          <!-- Frame zone (the column-header row) carries the office band grammar (design arc
               2026-07-15, propagated from ConceptList), and the first column insets to the card's
               rounded edge. -->
          <th class="w-10 pl-6"><span class="sr-only">Select</span></th>
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
        {/snippet}
        {#snippet children()}
          {#each visible as asset (asset.hash)}
            {@const used = usageCount(asset.hash)}
            {@const missing = needsAlt(asset)}
            {@const picked = selectedHashes.has(asset.hash)}
            <tr class="transition-colors hover:bg-base-200/60 {picked ? 'bg-primary/[0.06]' : selected?.hash === asset.hash ? 'bg-primary/[0.03]' : ''}">
              <td class="w-10 pl-6">
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={picked}
                  aria-label="Select {asset.displayName}"
                  onchange={() => toggleSelect(asset.hash)}
                />
              </td>
              <td class="max-w-0">
                <button type="button" class="flex w-full items-center gap-3 text-left" onclick={(e) => openAsset(asset, e.currentTarget)}>
                  <span class="relative flex h-10 w-14 flex-none items-center justify-center overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-200/60">
                    {#if brokenHashes.has(asset.hash)}
                      <ImageOffIcon data-cairn-broken class="h-4 w-4 text-subtle" aria-hidden="true" />
                    {:else}
                      <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="h-full w-full object-cover" onerror={() => markBroken(asset.hash)} />
                    {/if}
                  </span>
                  <span class="flex min-w-0 flex-col">
                    <!-- Title rank (design arc 2026-07-15, propagated from ConceptList): the
                         primary cell reads type-subtitle over the row's type-meta. -->
                    <span class="cairn-ml-name truncate type-subtitle font-medium">{asset.displayName}</span>
                    <span class="truncate type-meta text-muted tabular-nums">
                      {#if dimensions(asset)}{dimensions(asset)}<span class="px-1" aria-hidden="true">&middot;</span>{/if}{formatBytes(asset.bytes)}<span class="px-1" aria-hidden="true">&middot;</span>{typeLabel(asset)}
                    </span>
                  </span>
                </button>
              </td>
              <td class="w-32">
                {#if missing}
                  <StatusChip register="warning" label="Needs alt" size="xs" />
                {:else}
                  <StatusChip label="Described" size="xs" />
                {/if}
              </td>
              <td class="w-40 type-meta">
                {#if used > 0}
                  <StatusChip label={`found in ${used}`} size="xs" />
                {:else}
                  <StatusChip register="warning" label="no references found" size="xs" />
                {/if}
              </td>
              <td class="w-24 text-right type-body tabular-nums text-muted">{formatCivilDate(asset.createdAt, { intlOptions: { month: 'short', day: 'numeric' } })}</td>
              <td class="w-12 text-right">
                <button type="button" class="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content focus-visible:text-base-content" aria-label="Delete {asset.displayName}" onclick={() => requestDelete(asset)}>
                  <Trash2Icon class="h-4 w-4" />
                </button>
              </td>
            </tr>
          {/each}
        {/snippet}
      </AdminTable>
    </div>
  {/if}

  <!-- The selection-count live region: a dedicated sr-only role=status node that mirrors "N selected"
       on every toggle. It never shares a node with the flash, copy, or Showing regions, so the three
       polite regions never collide (the announced count is its own surface). -->
  <div class="sr-only" role="status" aria-live="polite">{selectedCount > 0 ? `${selectedCount} selected.` : ''}</div>

  {#if selectedCount > 0}
    <!-- THE STICKY SELECTION ACTION BAR (position: sticky, so it rides the bottom of the scrolling
         content and never floats off it). It states the count, names the scope, offers Select all in
         view and Clear, and carries the reversible bulk Delete (a git-tracked removal of manifest
         rows, so the danger-OUTLINE register; the irreversible byte purge lives on a separate
         surface and is never reachable from this bar). -->
    <div
      role="region"
      aria-label="Selection actions"
      class="sticky bottom-3.5 z-20 mx-auto mt-4 flex w-full max-w-[640px] items-center gap-3.5 card-shell px-4 py-3 card-shadow"
    >
      <span class="shrink-0 type-subtitle font-bold tabular-nums">{selectedCount}</span>
      <span class="min-w-0 type-meta leading-snug text-muted">
        <b class="font-semibold text-base-content">{selectedCount} selected</b> in this view<br />
        {selectionScope.noRefs} with no references, {selectionScope.used} still used
      </span>
      <span class="flex-1"></span>
      {#if selectedCount < visible.length}
        <button type="button" class="whitespace-nowrap px-1 py-1.5 type-meta font-medium text-primary hover:underline" onclick={selectAllVisible}>
          Select all {visible.length}
        </button>
      {/if}
      <button type="button" class="whitespace-nowrap rounded-lg border border-base-300 px-2.5 py-2 type-meta font-medium text-subtle" onclick={clearSelection}>
        Clear
      </button>
      <!-- The reversible bulk Delete: a git-tracked removal of manifest rows, so the danger-OUTLINE
           register (the irreversible byte purge lives on a separate surface and keeps the solid fill).
           It opens the skip-and-report alertdialog over the current selection. -->
      <button type="button" aria-haspopup="dialog" onclick={(e) => bulkDeleteDialog?.open([...selectedHashes], e.currentTarget as HTMLElement)} class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--cairn-error-border)] bg-base-100 px-3.5 py-2.5 type-meta font-semibold text-[var(--cairn-error-ink)]">
        <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Delete {selectedCount}
      </button>
    </div>
  {/if}

  {#if sorted.length > 0}
    <!-- The announced count plus the managed Load more (never infinite scroll). One persistent
         polite region carries "Showing N of M". -->
    <div class="sr-only" role="status" aria-live="polite">Showing {visible.length} of {sorted.length} {sorted.length === 1 ? 'image' : 'images'}.</div>
    <div class="mt-4 flex flex-col items-center gap-2">
      <span class="type-body text-muted">Showing {visible.length} of {sorted.length}</span>
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
  {@const reference = formatMediaToken({ slug: asset.slug, hash: asset.hash })}
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
      <h2 class="type-label font-semibold uppercase tracking-[0.08em] text-muted">Asset</h2>
      <button bind:this={closeButton} type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Close details" onclick={closePanel}>
        <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex flex-col gap-5 overflow-y-auto p-4">
      <!-- The large preview, object-fit contain on the quiet mat, with the broken-image affordance. -->
      <div class="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-200/60">
        {#if brokenHashes.has(asset.hash)}
          <span data-cairn-broken class="flex flex-col items-center gap-1 text-subtle">
            <ImageOffIcon class="h-8 w-8" aria-hidden="true" />
            <span class="type-meta">Image missing</span>
          </span>
        {:else}
          <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="max-h-full max-w-full object-contain" onerror={() => markBroken(asset.hash)} />
        {/if}
      </div>

      <!-- The name and the media: reference with a copy button. -->
      <div class="flex flex-col gap-1.5">
        <span class="type-heading font-bold font-[family-name:var(--font-display)] leading-tight break-words">{asset.displayName}</span>
        <span class="flex items-center gap-1.5">
          <code class="min-w-0 break-all font-[family-name:var(--font-editor)] type-label text-muted">{reference}</code>
          <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Copy reference" onclick={() => copyReference(reference)}>
            <CopyIcon class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>

      <!-- The metadata edit form: the display name, the slug, and the default alt, posting one Save
           to ?/mediaUpdate. The alt is the asset DEFAULT for new placements, never a rewrite of
           the alt already committed in existing placements (decision 6). -->
      <form method="POST" action="?/mediaUpdate" class="flex flex-col gap-group">
        <CsrfField />
        <input type="hidden" name="hash" value={asset.hash} />

        <label class="flex flex-col gap-label">
          <span class="type-meta font-medium">Name</span>
          <input class="input input-sm" name="displayName" bind:value={nameInput} autocomplete="off" />
        </label>
        <label class="flex flex-col gap-label">
          <span class="type-meta font-medium">Address</span>
          <input class="input input-sm font-[family-name:var(--font-editor)]" name="slug" bind:value={slugInput} autocomplete="off" />
        </label>

        <!-- The alt editor: the describe/decorative radiogroup (the 2b model) plus the alt field.
             Alt is debt: Save is never gated on it, and a left-blank or a decorative both submit an
             empty alt. The submitted value rides a hidden input so the disabled-or-absent textarea
             never strands the field. -->
        <fieldset class="flex flex-col gap-2" aria-describedby="cairn-ml-alt-note">
          <legend class="type-meta font-medium">Default alt text</legend>
          <p id="cairn-ml-alt-note" class="type-meta text-muted">
            The default for the next time this image is placed. It does not change the alt on pages that already use it. You can save without it and add it later.
          </p>
          <input type="hidden" name="alt" value={submittedAlt} />
          <label class="flex cursor-pointer items-center gap-2">
            <input type="radio" class="radio radio-sm" name="cairn-ml-alt-mode" value="describe" bind:group={altMode} />
            <span class="type-body">Describe it</span>
          </label>
          {#if altMode === 'describe'}
            <textarea class="textarea textarea-sm ml-6 w-[calc(100%-1.5rem)]" aria-label="Alt text description" rows="2" bind:value={altText}></textarea>
          {/if}
          <label class="flex cursor-pointer items-center gap-2">
            <input type="radio" class="radio radio-sm" name="cairn-ml-alt-mode" value="decorative" bind:group={altMode} />
            <span class="type-body">Decorative</span>
          </label>
        </fieldset>

        {#if updateError}
          <p role="alert" class="type-meta text-[var(--cairn-error-ink)]">{updateError}</p>
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
            <span class="type-meta text-muted">{usageEntries(asset.hash).length} {usageEntries(asset.hash).length === 1 ? 'entry' : 'entries'}</span>
          {/if}
        </div>

        {#if usageEntries(asset.hash).length === 0}
          <div class="flex items-start gap-2.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
            <Link2OffIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span class="type-meta leading-relaxed">No references found. Deleting this changes nothing readers see.</span>
          </div>
        {:else}
          {#if publishedRows(asset.hash).length > 0}
            <div class="flex flex-col gap-1.5">
              <span class="type-label font-semibold text-muted">Published on the site</span>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each publishedRows(asset.hash) as entry (entry.concept + '/' + entry.id)}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2.5 card-shell px-2.5 py-2 no-underline hover:border-primary/40">
                      <FileTextIcon class="h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <span class="min-w-0 flex-1 truncate type-meta font-medium">{entry.title}</span>
                      <ChevronRightIcon class="h-3.5 w-3.5 flex-none text-muted opacity-60" aria-hidden="true" />
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if branchRows(asset.hash).length > 0}
            <div class="flex flex-col gap-1.5">
              <span class="type-label font-semibold text-muted">In an unpublished edit</span>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each branchRows(asset.hash) as entry (entry.concept + '/' + entry.id + branchNameOf(entry))}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2.5 card-shell px-2.5 py-2 no-underline hover:border-primary/40">
                      <FileTextIcon class="h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <span class="flex min-w-0 flex-1 flex-col">
                        <span class="truncate type-meta font-medium">{entry.title}</span>
                        <span class="truncate font-[family-name:var(--font-editor)] type-chip cairn-text-warning">{branchNameOf(entry)}</span>
                      </span>
                      <ChevronRightIcon class="h-3.5 w-3.5 flex-none text-muted opacity-60" aria-hidden="true" />
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
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 type-meta">
          {#if dimensions(asset)}
            <dt class="text-muted">Dimensions</dt>
            <dd class="m-0 text-right tabular-nums">{dimensions(asset)}</dd>
          {/if}
          <dt class="text-muted">Size</dt>
          <dd class="m-0 text-right tabular-nums">{formatBytes(asset.bytes)}</dd>
          <dt class="text-muted">Type</dt>
          <dd class="m-0 text-right">{typeLabel(asset)}</dd>
          <dt class="text-muted">Added</dt>
          <dd class="m-0 text-right tabular-nums">{formatCivilDate(asset.createdAt, { intlOptions: { month: 'short', day: 'numeric' } })}</dd>
        </dl>
      </div>

      <!-- The actions block (rev.2 decision 7): two quiet text-weight entry points (Replace, Push alt)
           above the existing danger-bordered Delete. The quiet controls are button:not(.btn) levelled
           rows, lighter than a bordered button; each carries aria-haspopup="dialog". -->
      <div class="flex flex-col gap-1 border-t border-[var(--cairn-card-border)] pt-4">
        <span class="{headerLabel} mb-1">Actions</span>
        <button
          type="button"
          data-cairn-replace-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left type-meta font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => replaceDialogRef?.open(asset, e.currentTarget)}
        >
          <RefreshCwIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
          Replace image
        </button>
        <button
          type="button"
          data-cairn-pushalt-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left type-meta font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => altFillDialogRef?.open(asset, e.currentTarget)}
        >
          <MegaphoneIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
          Push alt to placements
        </button>
        <button type="button" class="btn btn-sm mt-1.5 border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={openDeleteDialog}>
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
  aria-modal="true"
  aria-labelledby="cairn-ml-delete-title"
  aria-describedby="cairn-ml-delete-desc"
  oncancel={closeDeleteDialog}
>
  {#if selected}
    {@const asset = selected}
    <div class="modal-box max-w-lg">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box {deleteInUse ? 'bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]' : 'bg-base-content/[0.07] text-muted'}" aria-hidden="true">
          {#if deleteInUse}<TriangleAlertIcon class="h-5 w-5" />{:else}<Trash2Icon class="h-5 w-5" />{/if}
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-delete-title" class="type-heading font-bold font-[family-name:var(--font-display)]">Delete {asset.displayName}?</h2>
          <p id="cairn-ml-delete-desc" class="mt-1 type-meta leading-relaxed text-muted">
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
            <span class="mb-2 inline-flex items-center gap-1.5 type-meta font-semibold text-[var(--cairn-error-ink)]">
              <XIcon class="h-3.5 w-3.5" aria-hidden="true" /> These would break
            </span>
            <ul role="list" class="flex max-h-44 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-2">
              {#if deleteBreakingPublished.length > 0}
                <li class="px-1.5 pb-0.5 pt-1 type-chip font-semibold uppercase tracking-wide text-muted">Published on the site</li>
                {#each deleteBreakingPublished as entry (entry.concept + '/' + entry.id)}
                  <li><a href="/admin/{entry.concept}/{entry.id}" class="flex items-center gap-2 rounded px-1.5 py-1 type-meta font-medium no-underline hover:bg-[var(--cairn-error-ink)]/10">{entry.title}</a></li>
                {/each}
              {/if}
              {#if deleteBreakingBranch.length > 0}
                <li class="px-1.5 pb-0.5 pt-1 type-chip font-semibold uppercase tracking-wide text-muted">In an unpublished edit</li>
                {#each deleteBreakingBranch as entry (entry.concept + '/' + entry.id + branchNameOf(entry))}
                  <li>
                    <a href="/admin/{entry.concept}/{entry.id}" class="flex flex-col rounded px-1.5 py-1 no-underline hover:bg-[var(--cairn-error-ink)]/10">
                      <span class="type-meta font-medium">{entry.title}</span>
                      <span class="font-[family-name:var(--font-editor)] type-chip cairn-text-warning">{branchNameOf(entry)}</span>
                    </a>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        {/if}

        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
          <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
          <span>Every version stays in git history, so a developer can bring this back later.</span>
        </div>

        <form method="POST" action="?/mediaDelete" class="flex flex-col gap-3">
          <CsrfField />
          <input type="hidden" name="hash" value={asset.hash} />
          {#if deleteInUse}
            <input type="hidden" name="confirmSlug" value={confirmSlugInput} />
            <div class="flex flex-col gap-1.5">
              <label class="type-body" for="cairn-ml-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] type-meta font-bold">{asset.slug}</code> to delete it anyway.</label>
              <input id="cairn-ml-confirm" class="input input-sm border-[var(--cairn-error-border)] font-[family-name:var(--font-editor)]" autocomplete="off" placeholder="Type the asset's address" bind:value={confirmSlugInput} />
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

<MediaReplaceDialog bind:this={replaceDialogRef} {brokenHashes} {markBroken} {thumbSrc} {dimensions} {formatBytes} {headerLabel} />

<MediaAltFillDialog bind:this={altFillDialogRef} />

<MediaBulkDeleteDialog bind:this={bulkDeleteDialog} assets={data.assets} usage={data.usage} onfinished={clearSelection} />

<MediaOrphanTools bind:this={orphanTools} {brokenWhereUsed} />

<MediaUploadDialog bind:this={uploadDialogRef} />
</div>

<style>
  /* A test-selector hook (CairnMediaLibrary.test.ts queries it directly); the visible name's own
     styling rides on the Tailwind utilities in the same class attribute. The rule carries only an
     inert custom property, never read anywhere, since an empty ruleset fails svelte-check's own
     lint; this is a co-located declaration of the class name rather than an entry in a JSON
     allowlist a rename would silently orphan. */
  .cairn-ml-name {
    --cairn-naming-hook: true;
  }
</style>
