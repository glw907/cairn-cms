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

It is node-safe by construction: it types assets with MediaLibraryEntry from the shared node-safe
projection and pulls in no editor module (the editor-boundary test bars a @codemirror leak).
-->
<script lang="ts">
  import { flushSync, getContext, tick } from 'svelte';
  import { deserialize } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type {
    MediaLibraryData,
    ContentFormFailure,
    MediaReplacePreviewPlan,
    MediaReplaceFailure,
    MediaReplacePreviewEntry,
    MediaAltPreviewPlan,
    MediaAltPropagateFailure,
    MediaBulkDeleteResult,
    MediaOrphanPurgeResult,
    MediaBulkFailure,
  } from '../sveltekit/content-routes.js';
  import type { OrphanScan } from '../media/orphan-scan.js';
  import type { BulkDeleteSkip } from '../media/bulk-delete-plan.js';
  import type { AltPlacement } from '../content/media-rewrite.js';
  import type { UsageEntry } from '../media/usage.js';
  import type { MediaEntry } from '../media/manifest.js';
  import { publicPath } from '../media/naming.js';
  import { mediaToken } from '../media/reference.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    type IngestFailureCard,
  } from './client-ingest.js';
  import { uploadOutcome, type UploadEnvelope } from './media-upload-outcome.js';
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
    RefreshCwIcon,
    GitBranchIcon,
    ArrowRightIcon,
    MegaphoneIcon,
    DatabaseIcon,
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
  const FLASH_MESSAGE = {
    deleted: 'Asset deleted.',
    updated: 'Changes saved.',
    replaced: 'Asset replaced.',
    altPropagated: 'Alt text applied.',
    bulkDeleted: 'Assets deleted.',
    orphansPurged: 'Orphans purged.',
  } as const;
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

  // The triage segments, in display order, each naming its value, label, and live count.
  const segments: { value: Triage; label: string; count: () => number }[] = [
    { value: 'all', label: 'All', count: () => triageCounts.all },
    { value: 'needs-alt', label: 'Needs alt', count: () => triageCounts.needsAlt },
    { value: 'unused', label: 'No references found', count: () => triageCounts.unused },
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
  // Escape precedence (no overlap): an open dialog claims Escape natively (its showModal owns it, so
  // this handler stands down while any dialog is open); else an open slide-over with focus inside it
  // closes (today's behavior); else a non-empty selection is cleared. The search box keeps its own
  // native Escape-to-clear: the selection clear fires only when focus is NOT in the search input.
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    if (deleteDialog?.open || replaceDialog?.open || altDialog?.open || bulkDialog?.open || orphanDialog?.open) return;
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

  // --- the Replace flow: a two-step alertdialog (upload, then impact review) over the selected asset ---
  // Replace uploads a new file for the selected asset; cairn is content-addressed, so the new file has a
  // new hash and every published reference is repointed to it in one commit to main. The dialog opens on
  // the quiet upload step, holds the server-owned record on a successful upload, fetches the preview
  // (fail-closed), and renders the impact review behind a typed-slug gate. The CSRF token getter comes
  // from the admin context, the same seam the insert popover reads.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  type ReplaceStep = 'upload' | 'review' | 'blocked';
  // The transient upload status under the upload step: idle, an in-flight ingest/upload, or a typed
  // ingest failure card with a retry. Mirrors the insert popover's failed-card grammar.
  type ReplaceUpload =
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'failed'; card: IngestFailureCard | { status: 'failed'; message: string }; retry: () => void };

  let replaceDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point button that opened the dialog, so focus restores to it on close (the alertdialog
  // recipe, like the delete dialog's slide-over Delete button).
  let replaceOrigin: HTMLElement | null = null;
  // The Cancel control, the destructive-confirm initial focus.
  let replaceCancelButton = $state<HTMLButtonElement | null>(null);
  let replaceFileInput = $state<HTMLInputElement | null>(null);
  let replaceStep = $state<ReplaceStep>('upload');
  let replaceUpload = $state<ReplaceUpload>({ kind: 'idle' });
  // The server-owned record the upload returned (the new asset), held for the preview and the apply.
  let replaceRecord = $state<MediaEntry | null>(null);
  // The resolved preview plan (the review step) or the fail-closed failure (the blocked step).
  let replacePlan = $state<MediaReplacePreviewPlan | null>(null);
  let replaceFailure = $state<MediaReplaceFailure | null>(null);
  // The typed-slug confirm gate, echoing the delete dialog's type-to-confirm.
  let replaceConfirmInput = $state('');
  // The asset the Replace dialog acts on, pinned at open so a background re-render never swaps it.
  let replaceAsset = $state<MediaLibraryEntry | null>(null);
  const replaceConfirmMatches = $derived(replaceAsset !== null && replaceConfirmInput === replaceAsset.slug);

  function openReplaceDialog(origin?: HTMLElement | null) {
    if (!selected) return;
    // The entry-point button passed from the click (focus restores here on close), falling back to the
    // active element. A programmatic .click() does not focus its target, so the explicit origin is the
    // reliable restore point.
    replaceOrigin = origin ?? (document.activeElement as HTMLElement | null) ?? null;
    replaceAsset = selected;
    replaceStep = 'upload';
    replaceUpload = { kind: 'idle' };
    replaceRecord = null;
    replacePlan = null;
    replaceFailure = null;
    replaceConfirmInput = '';
    // Show the dialog after the step state flushes, then move focus to Cancel.
    void tick().then(() => {
      replaceDialog?.showModal();
      replaceCancelButton?.focus();
    });
  }
  function closeReplaceDialog() {
    replaceDialog?.close();
    replaceAsset = null;
    replaceRecord = null;
    replacePlan = null;
    replaceFailure = null;
    replaceConfirmInput = '';
    replaceUpload = { kind: 'idle' };
    // Restore focus to the entry-point button (the alertdialog focus-restore recipe).
    replaceOrigin?.focus();
    replaceOrigin = null;
  }

  // The chosen-file handler: route the file through the ingest-and-upload loop, exactly as the insert
  // popover does, then fetch the preview. A file is the only path (Pass B is upload-new-only).
  function onReplaceFileChosen(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void runReplaceUpload(file);
  }

  // The upload loop for the new file. It ingests (decode/transcode), uploads through the shared
  // transport, and on the success envelope holds the new record and runs the preview. A typed ingest or
  // upload failure surfaces a retry card on the upload step; an expired session reads as a generic card.
  // The upload posts to the media-scoped ?/mediaUpload action: the Library is not entry-scoped, so it
  // overrides buildUploadRequest's entry URL while reusing its header-and-body transport verbatim.
  async function runReplaceUpload(file: File) {
    if (!replaceAsset) return;
    replaceUpload = { kind: 'working' };
    const genericFail = () =>
      (replaceUpload = {
        kind: 'failed',
        card: { status: 'failed', message: GENERIC_UPLOAD_MESSAGE },
        retry: () => void runReplaceUpload(file),
      });

    let ingested: Awaited<ReturnType<typeof ingestFile>>;
    try {
      ingested = await ingestFile(file);
    } catch (err) {
      replaceUpload = { kind: 'failed', card: failureCard(ingestFailureKind(err)), retry: () => void runReplaceUpload(file) };
      return;
    }

    const built = buildUploadRequest({
      conceptId: '',
      id: '',
      bytes: ingested.blob,
      contentType: ingested.contentType,
      csrf: csrf?.() ?? '',
      filename: file.name,
      width: ingested.width,
      height: ingested.height,
    });
    let res: Response;
    try {
      res = await sendUpload(REPLACE_UPLOAD_URL, built.init);
    } catch (err) {
      replaceUpload = { kind: 'failed', card: failureCard(ingestFailureKind(err)), retry: () => void runReplaceUpload(file) };
      return;
    }
    // The guard's expired-session 303 under redirect:'manual' surfaces as an opaque, status-0 response.
    if (res.type === 'opaqueredirect' || res.status === 0) {
      genericFail();
      return;
    }
    let outcome: ReturnType<typeof uploadOutcome>;
    try {
      outcome = uploadOutcome(deserialize(await res.text()) as UploadEnvelope);
    } catch {
      genericFail();
      return;
    }
    if (outcome.kind !== 'inserted') {
      genericFail();
      return;
    }
    // Hold the server-owned record, then fetch the impact preview for (oldHash -> newHash).
    replaceRecord = outcome.record;
    replaceUpload = { kind: 'idle' };
    await runReplacePreview();
  }

  // A per-call request token guards the preview fetch against a stale response landing on a closed or
  // reopened dialog. Svelte reactivity does not track reads below the first `await`, so each call pins
  // its own sequence at entry and bails after the await if a newer call (a reopen, or a "Check usage
  // again" double-click) has since superseded it.
  let replacePreviewSeq = 0;

  // The preview fetch: POST the (oldHash, newHash, slug) tuple in the 2a transport (a text/plain
  // body, the CSRF token in the X-Cairn-CSRF header), parse the SvelteKit ActionResult envelope, and
  // route to the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the
  // blocked step's "Check usage again". The slug is the OLD asset's: a replace keeps the name and
  // changes only the content hash, so the repointed token carries the existing slug, not the new file's.
  async function runReplacePreview() {
    if (!replaceAsset || !replaceRecord) return;
    const hash = replaceAsset.hash;
    const seq = ++replacePreviewSeq;
    // The fail-closed landing: an unverifiable usage read, an unreachable preview, or an unparseable
    // body all route to the blocked step. The passed failure carries the branch-naming error when the
    // server returned one; a transport miss carries the empty error (the generic honest line stands in).
    const blockClosed = (failure?: MediaReplaceFailure) => {
      replaceFailure = failure ?? { error: '', hash, usage: [], foundIn: 0 };
      replacePlan = null;
      replaceStep = 'blocked';
    };

    const body = JSON.stringify({ oldHash: hash, newHash: replaceRecord.hash, slug: replaceAsset.slug });
    let result: { type: string; data?: unknown };
    try {
      const res = await fetch(REPLACE_PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
        body,
      });
      result = deserialize(await res.text()) as { type: string; data?: unknown };
    } catch {
      // Drop a stale response that lost the race to a reopen or a re-run before surfacing the block.
      if (seq !== replacePreviewSeq) return;
      blockClosed();
      return;
    }
    // The dialog was closed or reopened (for another asset, or via a re-run) while this fetch was in
    // flight, so this response is stale: ignore it rather than clobber the live state.
    if (seq !== replacePreviewSeq) return;
    if (result.type === 'success' && result.data) {
      replacePlan = result.data as MediaReplacePreviewPlan;
      replaceFailure = null;
      replaceConfirmInput = '';
      replaceStep = 'review';
    } else {
      blockClosed(result.data as MediaReplaceFailure | undefined);
    }
  }

  const GENERIC_UPLOAD_MESSAGE = 'The upload could not be completed. Please try again.';
  // The media-scoped upload and preview action URLs, relative to /admin/media. The upload reuses the
  // shared ingest transport but the Library has no entry, so it targets ?/mediaUpload rather than the
  // entry-scoped ?/upload. The apply form below posts ?/mediaReplace.
  const REPLACE_UPLOAD_URL = '?/mediaUpload';
  const REPLACE_PREVIEW_URL = '?/mediaReplacePreview';

  // The affected-entry well caps past this many rows; "Show all N" reveals the rest into the same
  // scroll container (the a11y contract: aria-expanded + aria-controls).
  const REPLACE_ROW_CAP = 8;
  let replaceShowAll = $state(false);
  // The affected-entry list element, so "Show all" can move focus to the first newly revealed row (the
  // one just past the cap) instead of dropping to <body> when the expander button unmounts.
  let replaceEntriesList = $state<HTMLElement | null>(null);
  $effect(() => {
    // Reset the reveal whenever a fresh plan arrives, so a second preview never opens pre-expanded.
    void replacePlan;
    replaceShowAll = false;
  });
  // Reveal the capped rows, then move focus to the first newly revealed row (the rev.2 contract). The
  // expander unmounts on the flag flip, so without this focus falls to <body>.
  function showAllReplaceEntries() {
    replaceShowAll = true;
    void tick().then(() => (replaceEntriesList?.children[REPLACE_ROW_CAP] as HTMLElement | undefined)?.focus());
  }
  const replaceEntries = $derived(replacePlan?.entries ?? []);
  const replaceVisibleEntries = $derived(
    replaceShowAll ? replaceEntries : replaceEntries.slice(0, REPLACE_ROW_CAP),
  );
  const replaceHiddenCount = $derived(Math.max(0, replaceEntries.length - REPLACE_ROW_CAP));
  // The server's distinct affected-entry count, read in several places across the review markup and
  // the apply button. Coalesced once here so each read stays a plain number.
  const replaceAffected = $derived(replacePlan?.affectedCount ?? 0);

  // The where-used summary line for one affected entry, derived from its repointed placements: a hero
  // count and a body count, folded into a plain phrase ("Hero and 2 in the body", "1 in the body").
  function replaceWhereUsed(entry: MediaReplacePreviewEntry): string {
    let hero = 0;
    let body = 0;
    for (const p of entry.placements) {
      if (p.kind === 'hero') hero += 1;
      else body += 1;
    }
    const parts: string[] = [];
    if (hero > 0) parts.push(hero === 1 ? 'Hero' : `${hero} heroes`);
    if (body > 0) parts.push(`${body} in the body`);
    return parts.length > 0 ? parts.join(' and ') : 'Used in this entry';
  }

  // The specific unreadable branch named by a fail-closed failure, or null for the generic honest line.
  // The current MediaReplaceFailure carries only an error string, so a cairn/* branch name is pulled
  // from the message when the strict read named one; otherwise the generic variant stands in.
  const replaceBlockedBranch = $derived.by(() => {
    const match = replaceFailure?.error.match(/cairn\/[^\s.]+/);
    return match ? match[0] : null;
  });

  // --- the Push-alt flow: a one-step review dialog (the everyday register) over the selected asset ---
  // Alt propagation pushes the asset's default alt into published placements that lack it, with one
  // bucket-level opt-in to also overwrite placements that carry a custom alt. It is reversible and
  // frequent, so the dialog is role="dialog" (not alertdialog) with no typed-slug gate; apply is always
  // enabled. The preview fetch reuses the 2a transport (a text/plain body, the CSRF token in the
  // X-Cairn-CSRF header) and fails closed to a blocked surface when usage cannot be verified.
  type AltStep = 'review' | 'blocked';
  const ALT_PREVIEW_URL = '?/mediaAltPreview';

  let altDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point button that opened the dialog, so focus restores to it on close.
  let altOrigin: HTMLElement | null = null;
  // The Cancel control, the initial focus on open.
  let altCancelButton = $state<HTMLButtonElement | null>(null);
  let altStep = $state<AltStep>('review');
  // The resolved preview plan (the review step) or the fail-closed failure (the blocked step).
  let altPlan = $state<MediaAltPreviewPlan | null>(null);
  let altFailure = $state<MediaAltPropagateFailure | null>(null);
  // The bucket-level opt-in to also overwrite customized alts. Bound to the one native checkbox.
  let altOverwrite = $state(false);
  // The asset the dialog acts on, pinned at open so a background re-render never swaps it. The alt it
  // pushes is this asset's default alt.
  let altAsset = $state<MediaLibraryEntry | null>(null);

  function openAltDialog(origin?: HTMLElement | null) {
    if (!selected) return;
    altOrigin = origin ?? (document.activeElement as HTMLElement | null) ?? null;
    altAsset = selected;
    altStep = 'review';
    altPlan = null;
    altFailure = null;
    altOverwrite = false;
    void tick().then(() => {
      altDialog?.showModal();
      altCancelButton?.focus();
    });
    void runAltPreview();
  }
  function closeAltDialog() {
    altDialog?.close();
    altAsset = null;
    altPlan = null;
    altFailure = null;
    altOverwrite = false;
    altOrigin?.focus();
    altOrigin = null;
  }

  // The per-call request token for the alt preview, mirroring the Replace guard: a stale response from
  // a closed or reopened dialog (or a "Check usage again" double-click) is dropped after the await.
  let altPreviewSeq = 0;

  // The preview fetch: POST the hash in the 2a transport, parse the ActionResult envelope, and route to
  // the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the blocked
  // step's "Check usage again".
  async function runAltPreview() {
    if (!altAsset) return;
    const hash = altAsset.hash;
    const seq = ++altPreviewSeq;
    const blockClosed = (failure?: MediaAltPropagateFailure) => {
      altFailure = failure ?? { error: '' };
      altPlan = null;
      altStep = 'blocked';
    };
    let result: { type: string; data?: unknown };
    try {
      const res = await fetch(ALT_PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
        body: JSON.stringify({ hash }),
      });
      result = deserialize(await res.text()) as { type: string; data?: unknown };
    } catch {
      if (seq !== altPreviewSeq) return;
      blockClosed();
      return;
    }
    // Stale-response guard: a reopen or a re-run superseded this fetch while it was in flight.
    if (seq !== altPreviewSeq) return;
    if (result.type === 'success' && result.data) {
      altPlan = result.data as MediaAltPreviewPlan;
      altFailure = null;
      altStep = 'review';
    } else {
      blockClosed(result.data as MediaAltPropagateFailure | undefined);
    }
  }

  // The default alt the dialog propagates: the selected asset's stored alt. Empty is guarded by the
  // entry point (an asset with no default alt cannot push one), but the dialog reads it defensively.
  const altPushed = $derived(altAsset?.alt.trim() ?? '');

  // The three buckets, flattened from the plan's entries: each row carries its entry title, the
  // placement kind (the pill), and the placement's before/after. Grouping by bucket keeps each well
  // self-contained, the way the mockup lays them out.
  type AltRow = { title: string; kind: AltPlacement['kind']; before: string; after: string; key: string };
  function altRows(bucket: AltPlacement['bucket']): AltRow[] {
    const rows: AltRow[] = [];
    for (const entry of altPlan?.entries ?? []) {
      entry.placements.forEach((p, i) => {
        if (p.bucket !== bucket) return;
        rows.push({ title: entry.title, kind: p.kind, before: p.before, after: p.after, key: `${entry.concept}/${entry.id}/${i}` });
      });
    }
    return rows;
  }
  const altFillRows = $derived(altRows('will-fill'));
  const altCustomRows = $derived(altRows('customized'));
  const altSkipRows = $derived(altRows('decorative-skipped'));

  // The committed total: the will-fill placements always, plus the customized placements only on the
  // opt-in. The footer button and the live region read this; the count moves when the opt-in toggles.
  const altCounts = $derived(altPlan?.counts ?? { willFill: 0, customized: 0, decorativeSkipped: 0 });
  const altTotal = $derived(altCounts.willFill + (altOverwrite ? altCounts.customized : 0));

  // The will-fill bucket caps past this many rows; "Show all N" reveals the rest (aria-expanded +
  // aria-controls). The customized bucket lists in full (it is the consequential one).
  const ALT_ROW_CAP = 8;
  let altShowAll = $state(false);
  // The will-fill list element, so "Show all" can move focus to its first newly revealed row.
  let altFillList = $state<HTMLElement | null>(null);
  $effect(() => {
    void altPlan;
    altShowAll = false;
  });
  const altFillVisible = $derived(altShowAll ? altFillRows : altFillRows.slice(0, ALT_ROW_CAP));
  const altFillHidden = $derived(Math.max(0, altFillRows.length - ALT_ROW_CAP));
  // Reveal the capped will-fill rows, then move focus to the first newly revealed row (the rev.2
  // contract: the expander unmounts on the flag flip, so focus would otherwise fall to <body>).
  function showAllAltFill() {
    altShowAll = true;
    void tick().then(() => (altFillList?.children[ALT_ROW_CAP] as HTMLElement | undefined)?.focus());
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

  // --- the bulk-delete alertdialog: the skip-and-report dry-run, the reversible register, the
  // announced progress, and the itemized summary (the rev.2 mockup, panels 3 and 4) ---
  // The whole selection is reversible (a git-tracked removal of manifest rows), so the dialog is the
  // danger-OUTLINE register with a plain confirm and no typed gate. The display split below is
  // advisory: every selected hash is sent and the server re-checks each one strictly, so an asset that
  // looks deletable here but turns up in use at delete time is skipped authoritatively, not removed.
  type BulkPhase = 'review' | 'deleting' | 'done' | 'error';
  let bulkDialog = $state<HTMLDialogElement | null>(null);
  // The entry-point (the bar's Delete button), so focus restores to it on close.
  let bulkOrigin: HTMLElement | null = null;
  // The Cancel control, the destructive-confirm initial focus.
  let bulkCancelButton = $state<HTMLButtonElement | null>(null);
  // The summary title, focused when the result lands so a screen reader is carried to the outcome.
  let bulkSummaryTitle = $state<HTMLElement | null>(null);
  let bulkPhase = $state<BulkPhase>('review');
  let bulkResult = $state<MediaBulkDeleteResult | null>(null);
  let bulkError = $state<string | null>(null);
  // The hashes the dialog acts on, pinned at open so a background re-render never shifts the dry-run.
  let bulkHashes = $state<string[]>([]);

  // The dry-run split over the DISPLAY index: the no-reference selection is what will be deleted, the
  // still-referenced selection is what the server will skip. Both keep the asset row for the screen.
  // The selected assets in pick order, dropping any hash absent from the loaded set (the type
  // predicate keeps the element type non-nullable so the markup reads asset.slug without a guard).
  const bulkSelectedAssets = $derived(
    bulkHashes
      .map((h) => data.assets.find((a) => a.hash === h))
      .filter((a): a is MediaLibraryEntry => a != null),
  );
  const bulkWillDelete = $derived(bulkSelectedAssets.filter((a) => usageCount(a.hash) === 0));
  const bulkWillSkip = $derived(bulkSelectedAssets.filter((a) => usageCount(a.hash) > 0));
  // The apply button names the outcome from the split: "Delete N" with no skips, else "Delete N, skip M".
  const bulkApplyLabel = $derived(
    bulkWillSkip.length === 0
      ? `Delete ${bulkWillDelete.length}`
      : `Delete ${bulkWillDelete.length}, skip ${bulkWillSkip.length}`,
  );

  // The skipped summary row reads its display name from the loaded assets; a hash absent from the load
  // (deleted out from under the index) falls back to the bare hash so the row is never blank.
  function bulkAssetName(hash: string): string {
    return data.assets.find((a) => a.hash === hash)?.displayName ?? hash;
  }
  // The skip reason line: a still-referenced skip names its fresh where-used count; an uncommitted skip
  // says it was not committed (the timing-honest reason the recheck turned up).
  function bulkSkipReason(skip: BulkDeleteSkip): string {
    if (skip.reason === 'still-referenced') {
      const n = skip.usage.length;
      return `now found in ${n} ${n === 1 ? 'entry' : 'entries'} on the recheck`;
    }
    return 'was not committed';
  }

  const BULK_DELETE_URL = '?/mediaBulkDelete';

  function openBulkDialog(origin?: HTMLElement | null) {
    if (selectedCount === 0) return;
    bulkOrigin = origin ?? (document.activeElement as HTMLElement | null) ?? null;
    bulkHashes = [...selectedHashes];
    bulkPhase = 'review';
    bulkResult = null;
    bulkError = null;
    void tick().then(() => {
      bulkDialog?.showModal();
      bulkCancelButton?.focus();
    });
  }
  function closeBulkDialog() {
    bulkDialog?.close();
    bulkPhase = 'review';
    bulkResult = null;
    bulkError = null;
    bulkHashes = [];
    bulkOrigin?.focus();
    bulkOrigin = null;
  }
  // Escape (the dialog's cancel event) must not abandon an in-flight delete: while the request is
  // running the close is suppressed; in every other phase Escape closes normally.
  function onBulkCancel(e: Event) {
    if (bulkPhase === 'deleting') {
      e.preventDefault();
      return;
    }
    closeBulkDialog();
  }
  // The Done action after a summary: re-read the load so the deleted rows leave the list, clear the
  // selection, then close and reset. invalidateAll re-runs the media load behind the dialog.
  async function finishBulkDelete() {
    await invalidateAll();
    clearSelection();
    closeBulkDialog();
  }

  // Apply: send every SELECTED hash (repeated `hash` fields) so the server is the gate; it re-checks
  // each one strictly and skips the in-use ones authoritatively. The CSRF token rides the X-Cairn-CSRF
  // header (the guard accepts it for any unsafe POST), and the ActionResult envelope is read through
  // deserialize. A success carries the MediaBulkDeleteResult; a fail-closed 503 or a network throw
  // routes to the error phase and a role="alert".
  async function applyBulkDelete() {
    bulkPhase = 'deleting';
    bulkError = null;
    const formData = new FormData();
    for (const h of bulkHashes) formData.append('hash', h);
    let result: { type: string; data?: unknown };
    try {
      const res = await fetch(BULK_DELETE_URL, {
        method: 'POST',
        headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
        body: formData,
      });
      result = deserialize(await res.text()) as { type: string; data?: unknown };
    } catch {
      bulkError = 'The delete could not be completed. Please try again.';
      bulkPhase = 'error';
      return;
    }
    if (result.type === 'success' && result.data) {
      bulkResult = result.data as MediaBulkDeleteResult;
      bulkPhase = 'done';
      void tick().then(() => bulkSummaryTitle?.focus());
    } else {
      const failure = result.data as { error?: string } | undefined;
      bulkError = failure?.error ?? 'The delete could not be completed. Please try again.';
      bulkPhase = 'error';
    }
  }

  // --- the on-demand orphan scan surface: the entry point, the loading/blocked phases, the
  // two-section result, and the IRREVERSIBLE byte purge (the rev.2 mockup, panels 6, 7, and 8-right) ---
  // Raw R2 bytes have no git history, so this is the one irreversible media action and it is kept
  // structurally apart from the reversible bulk delete above: a separate dialog, a separate selection
  // Set of R2 KEYS (never the asset-hash Set), a solid-danger Purge (not the danger-OUTLINE bulk
  // apply), and a typed-count confirm reserved for this path. The scan fails CLOSED at detection: a
  // 503 routes to the blocked surface (no dry-run, no collect action), because under-reporting orphans
  // could feed an unrecoverable purge.
  type OrphanPhase = 'idle' | 'scanning' | 'result' | 'blocked';
  const ORPHAN_SCAN_URL = '?/mediaOrphanScan';
  const ORPHAN_PURGE_URL = '?/mediaPurge';

  let orphanDialog = $state<HTMLDialogElement | null>(null);
  // The "Find orphaned files" entry control, so focus restores to it on close.
  let orphanFindButton = $state<HTMLButtonElement | null>(null);
  // The dialog title, focused on open so a screen reader is carried to the surface.
  let orphanTitle = $state<HTMLElement | null>(null);
  let orphanPhase = $state<OrphanPhase>('idle');
  // The scan result (the result phase) or the fail-closed error message (the blocked phase).
  let orphanScan = $state<OrphanScan | null>(null);
  let orphanBlockedError = $state('');
  // The orphaned-byte selection: a Set of R2 KEYS, distinct from the asset-hash Set above. Never
  // mutated in place; every change reassigns (the reactive-Set rule the rest of the screen follows).
  let orphanKeys = $state(new Set<string>());
  // The section-level select-all checkbox, set to indeterminate in an effect when some-but-not-all rows
  // are selected (a property, not an attribute, so it is driven imperatively).
  let orphanSelectAll = $state<HTMLInputElement | null>(null);
  // The purge confirm: a nested phase inside the result surface, gated by typing the selected count.
  let orphanPurging = $state(false);
  let orphanConfirmInput = $state('');
  // The purge outcome (the summary) or, on a post-action failure, the error for a role="alert".
  let orphanPurgeResult = $state<MediaOrphanPurgeResult | null>(null);
  let orphanPurgeError = $state('');
  let orphanPurgeBusy = $state(false);

  const orphanBytes = $derived(orphanScan?.orphanedBytes ?? []);
  const orphanBroken = $derived(orphanScan?.brokenRefs ?? []);
  const orphanSelectedCount = $derived(orphanKeys.size);
  // The typed-count gate: the submit is enabled only when the typed value equals the selected count and
  // at least one byte is selected. The one legitimate disable, a visible typed destructive confirm.
  const orphanConfirmMatches = $derived(orphanSelectedCount > 0 && orphanConfirmInput === String(orphanSelectedCount));
  // The select-all is checked when every byte is selected, indeterminate on a strict subset. Driven
  // imperatively because `indeterminate` is a DOM property with no HTML attribute.
  $effect(() => {
    if (!orphanSelectAll) return;
    const n = orphanSelectedCount;
    const total = orphanBytes.length;
    orphanSelectAll.checked = total > 0 && n === total;
    orphanSelectAll.indeterminate = n > 0 && n < total;
  });

  function openOrphanScan() {
    orphanPhase = 'scanning';
    orphanScan = null;
    orphanBlockedError = '';
    orphanKeys = new Set<string>();
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeResult = null;
    orphanPurgeError = '';
    orphanPurgeBusy = false;
    void tick().then(() => {
      orphanDialog?.showModal();
      orphanTitle?.focus();
    });
    void runOrphanScan();
  }
  function closeOrphanScan() {
    orphanDialog?.close();
    orphanPhase = 'idle';
    orphanScan = null;
    orphanKeys = new Set<string>();
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeResult = null;
    orphanPurgeError = '';
    orphanFindButton?.focus();
  }
  // Escape (the dialog's cancel event) must not abandon an in-flight purge: while the irreversible
  // delete is running the close is suppressed; in every other phase Escape closes normally.
  function onOrphanCancel(e: Event) {
    if (orphanPurgeBusy) {
      e.preventDefault();
      return;
    }
    closeOrphanScan();
  }
  // The Done action after a purge: the bytes are gone, so re-read the load (the broken-refs readout is
  // untouched), then close. invalidateAll re-runs the media load behind the dialog.
  async function finishOrphanPurge() {
    await invalidateAll();
    closeOrphanScan();
  }

  // Run the scan: POST ?/mediaOrphanScan, parse the ActionResult envelope, and route to the result
  // phase (an OrphanScan) or the fail-closed blocked phase (a 503 MediaBulkFailure or a network
  // throw). The action reads no fields, but a SvelteKit form action rejects a body-less POST with a
  // 415, so send an empty FormData to carry the form content-type. The CSRF token rides the header.
  // Nothing is pre-selected: this feeds an irreversible purge, so the operator picks each byte (or the
  // select-all) deliberately.
  async function runOrphanScan() {
    orphanPhase = 'scanning';
    orphanBlockedError = '';
    let result: { type: string; data?: unknown };
    try {
      const res = await fetch(ORPHAN_SCAN_URL, {
        method: 'POST',
        headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
        body: new FormData(),
      });
      result = deserialize(await res.text()) as { type: string; data?: unknown };
    } catch {
      // A network throw blocks the scan with the generic blocked surface; orphanBlockedError stays
      // empty (set above), so the surface shows its own framing without a server message.
      orphanPhase = 'blocked';
      return;
    }
    if (result.type === 'success' && result.data) {
      orphanScan = result.data as OrphanScan;
      orphanKeys = new Set<string>();
      orphanPhase = 'result';
    } else {
      const failure = result.data as MediaBulkFailure | undefined;
      orphanBlockedError = failure?.error ?? '';
      orphanPhase = 'blocked';
    }
  }

  /** Toggle one orphaned-byte key in the selection (reassign-only). */
  function toggleOrphanKey(key: string) {
    const next = new Set(orphanKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    orphanKeys = next;
  }
  /** Select all or clear all orphaned bytes from the section header checkbox. */
  function toggleOrphanAll() {
    orphanKeys = orphanKeys.size === orphanBytes.length ? new Set<string>() : new Set(orphanBytes.map((b) => b.key));
  }
  function clearOrphanSelection() {
    orphanKeys = new Set<string>();
  }

  // Open the typed-count purge confirm over the current selection.
  function openOrphanPurge() {
    if (orphanSelectedCount === 0) return;
    orphanConfirmInput = '';
    orphanPurgeError = '';
    orphanPurging = true;
  }
  function cancelOrphanPurge() {
    orphanPurging = false;
    orphanConfirmInput = '';
    orphanPurgeError = '';
  }

  // The purge: POST ?/mediaPurge with each selected key as a repeated `key` field plus `confirm` set to
  // the typed count. The server re-derives fresh and skips any key claimed since the scan, so the
  // selection here is advisory. The CSRF token rides the X-Cairn-CSRF header; the ActionResult envelope
  // is read through deserialize. A success carries the MediaOrphanPurgeResult; a fail or a network throw
  // surfaces a role="alert".
  async function applyOrphanPurge() {
    if (!orphanConfirmMatches) return;
    orphanPurgeBusy = true;
    orphanPurgeError = '';
    const formData = new FormData();
    for (const key of orphanKeys) formData.append('key', key);
    formData.append('confirm', orphanConfirmInput);
    let result: { type: string; data?: unknown };
    try {
      const res = await fetch(ORPHAN_PURGE_URL, {
        method: 'POST',
        headers: { 'X-Cairn-CSRF': csrf?.() ?? '' },
        body: formData,
      });
      result = deserialize(await res.text()) as { type: string; data?: unknown };
    } catch {
      orphanPurgeBusy = false;
      orphanPurgeError = 'The purge could not be completed. Please try again.';
      return;
    }
    orphanPurgeBusy = false;
    if (result.type === 'success' && result.data) {
      orphanPurgeResult = result.data as MediaOrphanPurgeResult;
      orphanPurging = false;
    } else {
      const failure = result.data as MediaBulkFailure | undefined;
      orphanPurgeError = failure?.error ?? 'The purge could not be completed. Please try again.';
    }
  }

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
  <!-- One toolbar row: search (left, flexes), the triage radiogroup, and the grid/list density
       toggle (right). -->
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

    <span class="flex-1"></span>

    <!-- The on-demand orphan scan entry: a quiet bordered office control, NEVER the danger family (it
         opens a scan, not a purge). The mockup places it beside Upload; the Library has no Upload
         button in the toolbar, so it sits in the toolbar row near the density toggle. -->
    <button
      bind:this={orphanFindButton}
      type="button"
      class="btn btn-sm border-[var(--cairn-card-border)] bg-base-100 font-normal text-[var(--color-muted)] hover:bg-base-content/[0.06]"
      aria-haspopup="dialog"
      onclick={openOrphanScan}
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
  </div>

  {#if triage === 'unused'}
    <!-- The facet preamble: a calm dashed report-only aside above the "No references found" set,
         naming WHY these are candidates and WHAT cairn cannot see, at the point of action. Never the
         danger family: selecting is not destroying. -->
    <div class="mb-3 flex items-start gap-2.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200 px-3.5 py-2.5">
      <FileTextIcon class="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
      <p class="text-[0.8125rem] leading-relaxed text-base-content">
        <b class="font-semibold">No reference found in any tracked branch.</b> Nothing on the site or in an open edit points to these.
        <span class="mt-0.5 block text-xs text-[var(--color-muted)]">
          "No references found" is not the same as unused. cairn cannot see a raw-HTML image or a URL hardcoded into a site template, so check anything you are unsure about before deleting it.
        </span>
      </p>
    </div>
  {/if}

  {#if sorted.length === 0}
    <!-- A filter or search narrowed the set to zero; the assets exist, none match. -->
    <div role="status" class="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <SearchIcon class="h-8 w-8 text-[var(--color-subtle)] opacity-40" aria-hidden="true" />
      <p class="text-sm text-[var(--color-muted)]">No media match this filter.</p>
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
            class="group relative flex cursor-pointer flex-col overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100 outline-hidden transition-shadow focus-visible:ring-2 focus-visible:ring-primary/70 {picked ? 'ring-2 ring-primary/70' : selected?.hash === asset.hash ? 'ring-2 ring-primary/40' : ''}"
            onclick={(e) => openAsset(asset, e.currentTarget)}
            onkeydown={(e) => onGridKeydown(e, i)}
          >
            <!-- The selection checkbox, top-left: a real native checkbox in a soft chip so it reads on
                 any thumbnail. Clicking it toggles the selection only; it never opens the slide-over. -->
            <span class="absolute left-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md bg-base-100/90 shadow-sm">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={picked}
                aria-label="Select {asset.displayName}"
                onclick={(e) => e.stopPropagation()}
                onchange={() => toggleSelect(asset.hash)}
              />
            </span>
            <div class="relative flex aspect-[4/3] items-center justify-center bg-base-200/60">
              <!-- The usage marker, top-right: a used count, or the warning-ink "No refs" chip. The
                   category reads "No references found" (renamed from "Unused"): a found reference is
                   not proof of use, and absence of one is not proof of disuse. -->
              {#if used > 0}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--color-muted)]">used {used}</span>
              {:else}
                <span class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[var(--cairn-card-border)] bg-base-100/90 px-2 py-0.5 text-[0.625rem] font-semibold text-[var(--cairn-warning-ink)]">No refs</span>
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
    <!-- The list density: a plain selectable table. Each row opens the detail (sets `selected`); the
         Added column sorts through a real header button with aria-sort; the per-row delete is always
         visible. Multi-select rides the leading native-checkbox column, which is the APG-correct
         pattern for a selectable table. The earlier role="grid" + aria-multiselectable promised grid
         keyboard navigation (arrow cell moves, roving tabindex) the table never implemented, so it
         is dropped: a plain table with a checkbox column is honest and fully usable. -->
    <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100 overflow-x-auto shadow-[var(--cairn-shadow)]">
      <table class="table">
        <thead>
          <tr class="border-base-300">
            <th class="w-10"><span class="sr-only">Select</span></th>
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
            {@const picked = selectedHashes.has(asset.hash)}
            <tr class="transition-colors hover:bg-base-200/60 {picked ? 'bg-primary/[0.06]' : selected?.hash === asset.hash ? 'bg-primary/[0.03]' : ''}">
              <td class="w-10">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  checked={picked}
                  aria-label="Select {asset.displayName}"
                  onchange={() => toggleSelect(asset.hash)}
                />
              </td>
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
      class="sticky bottom-3.5 z-20 mx-auto mt-4 flex w-full max-w-[640px] items-center gap-3.5 rounded-2xl border border-[var(--cairn-card-border)] bg-base-100 px-4 py-3 shadow-[var(--cairn-shadow)]"
    >
      <span class="shrink-0 text-[0.9375rem] font-bold tabular-nums">{selectedCount}</span>
      <span class="min-w-0 text-xs leading-snug text-[var(--color-muted)]">
        <b class="font-semibold text-base-content">{selectedCount} selected</b> in this view<br />
        {selectionScope.noRefs} with no references, {selectionScope.used} still used
      </span>
      <span class="flex-1"></span>
      {#if selectedCount < visible.length}
        <button type="button" class="whitespace-nowrap px-1 py-1.5 text-[0.8125rem] font-medium text-primary hover:underline" onclick={selectAllVisible}>
          Select all {visible.length}
        </button>
      {/if}
      <button type="button" class="whitespace-nowrap rounded-lg border border-base-300 px-2.5 py-2 text-[0.8125rem] font-medium text-[var(--color-subtle)]" onclick={clearSelection}>
        Clear
      </button>
      <!-- The reversible bulk Delete: a git-tracked removal of manifest rows, so the danger-OUTLINE
           register (the irreversible byte purge lives on a separate surface and keeps the solid fill).
           It opens the skip-and-report alertdialog over the current selection. -->
      <button type="button" aria-haspopup="dialog" onclick={(e) => openBulkDialog(e.currentTarget)} class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--cairn-error-border)] bg-base-100 px-3.5 py-2.5 text-[0.8125rem] font-semibold text-[var(--cairn-error-ink)]">
        <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Delete {selectedCount}
      </button>
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

      <!-- The actions block (rev.2 decision 7): two quiet text-weight entry points (Replace, Push alt)
           above the existing danger-bordered Delete. The quiet controls are button:not(.btn) levelled
           rows, lighter than a bordered button; each carries aria-haspopup="dialog". Push alt's handler
           lands in Task 8; the button is placed now so the block matches the design. -->
      <div class="flex flex-col gap-1 border-t border-[var(--cairn-card-border)] pt-4">
        <span class="{headerLabel} mb-1">Actions</span>
        <button
          type="button"
          data-cairn-replace-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => openReplaceDialog(e.currentTarget)}
        >
          <RefreshCwIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
          Replace image
        </button>
        <button
          type="button"
          data-cairn-pushalt-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.8125rem] font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => openAltDialog(e.currentTarget)}
        >
          <MegaphoneIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
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

<!-- The Replace alertdialog: a native modal <dialog> (native focus trap + Escape), NO light dismiss.
     A replace repoints a content hash and can break a draft, so it carries role="alertdialog", the
     danger register, and a typed-slug gate. Step one is the quiet upload; step two is the impact review
     gated behind the typed slug; the blocked step is the fail-closed surface (no apply button). -->
<dialog
  bind:this={replaceDialog}
  data-testid="cairn-replace-dialog"
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-replace-title"
  aria-describedby="cairn-ml-replace-sub"
  oncancel={closeReplaceDialog}
>
  {#if replaceAsset}
    {@const asset = replaceAsset}
    <div class="modal-box max-w-xl">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          {#if replaceStep === 'blocked'}<TriangleAlertIcon class="h-5 w-5" />{:else}<RefreshCwIcon class="h-5 w-5" />{/if}
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-replace-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">
            {#if replaceStep === 'review'}
              Replace {asset.slug} in {replaceAffected} published {replaceAffected === 1 ? 'entry' : 'entries'}
            {:else if replaceStep === 'blocked'}
              Replace is on hold
            {:else}
              Replace {asset.displayName}
            {/if}
          </h2>
          <p id="cairn-ml-replace-sub" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            {#if replaceStep === 'review'}
              The new file replaces the stored image. Every published entry that uses it is repointed in one commit to main, and readers see the change once the build finishes.
            {:else if replaceStep === 'blocked'}
              cairn could not read every place this image is used, so it will not repoint references it cannot see. No file was changed.
            {:else}
              Upload a new file. Every published entry that uses this image points to the new one, in one commit to main.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Cancel" onclick={closeReplaceDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if replaceStep === 'upload'}
        <!-- Step one: upload a new file (upload-new-only). The asset being replaced stays named above
             the dropzone, so the author never loses it. Cancel is the initial focus; no apply yet. -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
            <span class="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100">
              {#if brokenHashes.has(asset.hash)}
                <ImageOffIcon class="h-5 w-5 text-[var(--color-subtle)]" aria-hidden="true" />
              {:else}
                <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="h-full w-full object-cover" onerror={() => markBroken(asset.hash)} />
              {/if}
            </span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">Replacing</span>
              <span class="text-sm font-semibold">{asset.displayName}</span>
              <span class="font-[family-name:var(--font-editor)] text-[0.75rem] text-[var(--color-muted)] tabular-nums">
                {#if dimensions(asset)}{dimensions(asset)}<span class="px-1" aria-hidden="true">&middot;</span>{/if}{formatBytes(asset.bytes)}
              </span>
            </span>
          </div>

          {#if replaceUpload.kind === 'failed'}
            <!-- A typed ingest/upload failure: an assertive alert with the message and a Retry. -->
            <div role="alert" class="flex flex-col items-center gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-4 text-center">
              <TriangleAlertIcon class="h-6 w-6 text-[var(--cairn-error-ink)]" aria-hidden="true" />
              <span class="text-[0.8125rem] text-[var(--cairn-error-ink)]">{replaceUpload.card.message}</span>
              <button type="button" class="btn btn-sm" onclick={replaceUpload.retry}>Try another file</button>
            </div>
          {:else if replaceUpload.kind === 'working'}
            <div role="status" class="flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-[var(--color-muted)]">
              <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
              <span class="text-[0.8125rem]">Preparing the new file...</span>
            </div>
          {:else}
            <div class="flex flex-col items-center gap-1.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-[var(--color-muted)]">
              <UploadIcon class="h-6 w-6 text-primary" aria-hidden="true" />
              <span class="text-[0.875rem] font-medium text-base-content">Drop the new image, or upload</span>
              <span class="text-xs">PNG, JPEG, WebP, or HEIC. We convert HEIC for you.</span>
              <button type="button" class="btn btn-sm btn-primary mt-1.5" onclick={() => replaceFileInput?.click()}>Choose a file</button>
              <input
                bind:this={replaceFileInput}
                type="file"
                accept="image/*"
                class="sr-only"
                aria-label="Choose a new image to replace this asset"
                onchange={onReplaceFileChosen}
              />
            </div>
          {/if}
        </div>
        <div class="mt-4 flex justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <button bind:this={replaceCancelButton} type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
        </div>
      {:else if replaceStep === 'review'}
        {@const newRec = replaceRecord}
        <!-- Step two: the impact review. The from/to strip carries the CORRECTED content-addressed copy
             (the name stays, only the hash changes); the affected-entry well is expanded by default and
             scroll-capped; the branch-delta is a calm report-only aside; the typed-slug gates apply. -->
        <div class="flex flex-col gap-4">
          {#if newRec}
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">Current</span>
                <span class="font-[family-name:var(--font-editor)] text-[0.75rem] text-[var(--color-muted)] tabular-nums line-through">.{asset.hash}</span>
              </div>
              <ArrowRightIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">New file</span>
                <span class="font-[family-name:var(--font-editor)] text-[0.75rem] text-primary tabular-nums">.{newRec.hash}</span>
              </div>
              <div class="col-span-3 flex items-start gap-2 border-t border-[var(--cairn-card-border)] pt-2.5">
                <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
                <span class="text-[0.8125rem] leading-relaxed">The name <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] text-[0.75rem]">{asset.slug}</code> stays the same. Only the content hash changes, so every published entry is repointed to the new file in one commit.</span>
              </div>
            </div>
          {/if}

          <div>
            <div class="mb-2 flex items-baseline justify-between">
              <span class={headerLabel}>Published entries that will be repointed</span>
              <span class="text-xs tabular-nums text-[var(--color-muted)]">{replaceEntries.length}</span>
            </div>
            <div class="rounded-box border border-[var(--cairn-card-border)] bg-base-100">
              <ul bind:this={replaceEntriesList} id="cairn-ml-replace-entries" class="flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-2">
                {#each replaceVisibleEntries as entry, i (entry.concept + '/' + entry.id)}
                  <!-- The first row past the cap is a script-only focus target for "Show all" (tabindex
                       -1 keeps it out of the tab order). svelte-ignore: the rule allows a literal -1 but
                       does not see through the per-row conditional that selects which row carries it. -->
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                  <li class="flex items-start gap-2.5 rounded px-1.5 py-1.5" tabindex={i === REPLACE_ROW_CAP ? -1 : undefined}>
                    <FileTextIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate text-[0.8125rem] font-medium">{entry.title}</span>
                      <span class="truncate text-[0.6875rem] text-[var(--color-muted)]">{replaceWhereUsed(entry)}</span>
                    </span>
                  </li>
                {/each}
              </ul>
              {#if replaceHiddenCount > 0 && !replaceShowAll}
                <div class="border-t border-[var(--cairn-card-border)] p-1.5">
                  <button
                    type="button"
                    class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 text-[0.75rem] font-medium text-primary hover:bg-primary/[0.08]"
                    aria-expanded={replaceShowAll}
                    aria-controls="cairn-ml-replace-entries"
                    onclick={showAllReplaceEntries}
                  >
                    Show the other {replaceHiddenCount} {replaceHiddenCount === 1 ? 'entry' : 'entries'}
                  </button>
                </div>
              {/if}
            </div>
          </div>

          {#if (replacePlan?.branchDelta?.length ?? 0) > 0}
            <!-- The report-only branch delta: open cairn/* edits keep the old file until they publish.
                 Calm dashed base-200, never the danger register. -->
            <div class="rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
              <div class="mb-1.5 flex items-center gap-2">
                <GitBranchIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                <span class="text-[0.8125rem] font-semibold">Open edits still on the old file</span>
                <span class="text-xs tabular-nums text-[var(--color-muted)]">{replacePlan?.branchDelta.length ?? 0}</span>
              </div>
              <p class="mb-2 text-[0.75rem] leading-relaxed text-[var(--color-muted)]">These edits are on their own branches and are not touched. Each keeps the old file until it is published again.</p>
              <ul class="flex list-none flex-col gap-1 p-0">
                {#each replacePlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] text-[0.6875rem] text-[var(--cairn-warning-ink)]">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
            <span>The old file stays in git history. A developer can bring it back. The alt text on each placement is left exactly as it is.</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[0.875rem]" for="cairn-ml-replace-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] text-[0.8125rem] font-semibold">{asset.slug}</code> to replace the file in all {replaceAffected} {replaceAffected === 1 ? 'entry' : 'entries'}.</label>
            <input id="cairn-ml-replace-confirm" data-cairn-replace-confirm class="input input-sm border-[var(--cairn-error-border)] font-[family-name:var(--font-editor)]" autocomplete="off" placeholder="Type the asset slug" bind:value={replaceConfirmInput} />
          </div>
        </div>

        <!-- A polite live region mirrors the footer impact for a screen reader on the review step. The
             role="status" matches the Push-alt live region: the stronger, more portable form. -->
        <div class="sr-only" role="status" aria-live="polite">
          Replace {asset.slug} in {replaceAffected} published {replaceAffected === 1 ? 'entry' : 'entries'}.{(replacePlan?.branchDelta?.length ?? 0) > 0 ? ` ${replacePlan?.branchDelta.length} open ${(replacePlan?.branchDelta?.length ?? 0) === 1 ? 'edit is' : 'edits are'} not touched.` : ''}
        </div>

        <form method="POST" action="?/mediaReplace" class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <CsrfField />
          <input type="hidden" name="oldHash" value={asset.hash} />
          <input type="hidden" name="newHash" value={replaceRecord?.hash ?? ''} />
          <input type="hidden" name="confirmSlug" value={replaceConfirmInput} />
          <input type="hidden" name="media" value={replaceRecord ? JSON.stringify([replaceRecord]) : '[]'} />
          <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
          <button type="submit" class="btn btn-sm btn-error" disabled={!replaceConfirmMatches}>
            <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Replace in {replaceAffected} {replaceAffected === 1 ? 'entry' : 'entries'}
          </button>
        </form>
      {:else}
        <!-- The fail-closed surface: usage could not be fully verified, so the replace refuses rather
             than guess. NO apply button (not even disabled), and no typed gate. A quiet "Check usage
             again" re-runs the scan; the held upload stays ready. -->
        <div class="flex flex-col gap-3">
          <div role="status" class="flex flex-col gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3.5">
            <span class="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="text-[0.8125rem] leading-relaxed">
              {#if replaceBlockedBranch}
                The published site read cleanly. One edit branch would not load, so cairn cannot tell whether it uses the image too. Replacing now could leave that branch pointing at the old file with no record of it.
              {:else}
                The published site could not be fully read, so cairn cannot tell every place this image is used. Replacing now could leave a reference pointing at the old file with no record of it.
              {/if}
            </p>
            {#if replaceBlockedBranch}
              <p class="inline-flex items-center gap-1.5 text-[0.8125rem]">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                Could not read <code class="font-[family-name:var(--font-editor)] text-[0.75rem]">{replaceBlockedBranch}</code>
              </p>
            {:else}
              <p class="inline-flex items-center gap-1.5 text-[0.8125rem]">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                An edit branch would not load.
              </p>
            {/if}
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runReplacePreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
            <span>Your uploaded file is held and ready. Once the scan completes, the review opens with the full impact.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto text-[0.75rem] text-[var(--color-muted)]">No file was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<!-- The Push-alt review dialog: a native modal <dialog> (native focus trap + Escape), NO light dismiss.
     Alt fill is reversible and frequent, so it carries role="dialog" (the everyday register, never
     alertdialog) with NO typed-slug gate; apply is always enabled. The review step lists three buckets
     (will-fill always applied, customized behind one opt-in, decorative-skipped reported); the blocked
     step is the fail-closed surface (no apply form). -->
<!-- svelte-ignore a11y_no_redundant_roles -->
<!-- The explicit role="dialog" is the native <dialog> default, but it is stated to mark the everyday
     register against the Replace dialog's role="alertdialog" sibling, and the component test reads it. -->
<dialog
  bind:this={altDialog}
  data-testid="cairn-alt-dialog"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-alt-title"
  aria-describedby="cairn-ml-alt-sub"
  oncancel={closeAltDialog}
>
  {#if altAsset}
    {@const asset = altAsset}
    <div class="modal-box max-w-xl">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-primary/10 text-primary" aria-hidden="true">
          <MegaphoneIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-alt-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">
            {#if altStep === 'blocked'}
              Push alt is on hold
            {:else}
              Fill alt on {altCounts.willFill} {altCounts.willFill === 1 ? 'placement' : 'placements'}
            {/if}
          </h2>
          <p id="cairn-ml-alt-sub" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            {#if altStep === 'blocked'}
              cairn could not read every place this image is used, so it will not write alt where it cannot see. Nothing was changed.
            {:else}
              This writes the default alt for {asset.displayName} into the published placements that have none. One commit to main. Placements that already have their own alt stay as they are, unless you choose to overwrite them below.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Cancel" onclick={closeAltDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if altStep === 'review'}
        <div class="flex flex-col gap-4">
          <!-- The alt being pushed, shown once so the author confirms the text before applying. -->
          <div class="flex items-start gap-2.5 rounded-box border border-primary/25 bg-primary/[0.05] p-3 text-[0.8125rem] leading-relaxed">
            <MegaphoneIcon class="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
            <span>The alt being pushed: <strong class="font-semibold">{altPushed ? `“${altPushed}”` : '(no default alt set)'}</strong>. Edit it in the panel first if it is not right.</span>
          </div>

          <div class="flex flex-col gap-3">
            <!-- WILL FILL: every row's honest (no alt) -> default alt, always applied. -->
            {#if altFillRows.length > 0}
              <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                    <CheckIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="text-[0.8125rem] font-semibold">Will fill the gap</div>
                    <div class="mt-px text-[0.6875rem] leading-snug text-[var(--color-muted)]">These placements have no alt today. The default alt is written in.</div>
                  </div>
                  <span class="flex-none text-[0.8125rem] font-bold tabular-nums text-primary">{altFillRows.length}</span>
                </div>
                <ul bind:this={altFillList} id="cairn-ml-alt-fill" class="flex max-h-44 list-none flex-col overflow-y-auto border-t border-[var(--cairn-card-border)] p-0">
                  {#each altFillVisible as row, i (row.key)}
                    <!-- The first row past the cap is the script-only focus target for "Show all"
                         (tabindex -1). svelte-ignore: as above, the conditional hides the literal -1. -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0" tabindex={i === ALT_ROW_CAP ? -1 : undefined}>
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate text-[0.8125rem] font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 text-[0.75rem] leading-snug">
                          <span class="italic text-[var(--color-muted)]">(no alt)</span>
                          <ArrowRightIcon class="h-3 w-3 flex-none text-[var(--color-muted)] opacity-65" aria-hidden="true" />
                          <span class="font-medium text-primary">{row.after}</span>
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
                {#if altFillHidden > 0 && !altShowAll}
                  <div class="border-t border-[var(--cairn-card-border)] p-1.5">
                    <button
                      type="button"
                      class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 text-[0.75rem] font-medium text-primary hover:bg-primary/[0.08]"
                      aria-expanded={altShowAll}
                      aria-controls="cairn-ml-alt-fill"
                      onclick={showAllAltFill}
                    >
                      Show the other {altFillHidden} {altFillHidden === 1 ? 'placement' : 'placements'}, all gaining the same alt
                    </button>
                  </div>
                {/if}
              </div>

              <!-- The body-vs-hero caveat, anchored beside will-fill where the surprised author looks. -->
              <div class="flex items-start gap-2 px-0.5 text-[0.75rem] leading-relaxed">
                <TriangleAlertIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--cairn-warning-ink)]" aria-hidden="true" />
                <span>A body image has no place to record decorative, so an empty body image always reads as a gap to fill. Only a hero can be skipped as decorative.</span>
              </div>
            {/if}

            <!-- HAS CUSTOM ALT: one bucket-level opt-in (a real native checkbox). Before it is checked,
                 each row shows its existing alt plain and "kept"; checking flips to was -> default. -->
            {#if altCustomRows.length > 0}
              <div data-cairn-alt-custom class="overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-[var(--cairn-warning-ink)]/10 text-[var(--cairn-warning-ink)]" aria-hidden="true">
                    <MegaphoneIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="text-[0.8125rem] font-semibold">Already has custom alt</div>
                    <div class="mt-px text-[0.6875rem] leading-snug text-[var(--color-muted)]">
                      {altOverwrite ? 'You chose to overwrite these.' : 'Left alone by default. You can overwrite these too.'}
                    </div>
                  </div>
                  <span class="flex-none text-[0.8125rem] font-bold tabular-nums text-[var(--cairn-warning-ink)]">{altCustomRows.length}</span>
                </div>
                <!-- The opt-in band, styled in the danger family: overwriting an editor's words is the
                     destructive choice. The checkbox is a REAL native input in the a11y tree. -->
                <div class="border-t border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3">
                  <label class="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      data-cairn-alt-optin
                      class="checkbox checkbox-sm mt-px border-[var(--cairn-error-border)] checked:border-[var(--cairn-error-ink)] checked:bg-[var(--cairn-error-ink)]"
                      aria-describedby="cairn-ml-alt-optin-hint"
                      bind:checked={altOverwrite}
                    />
                    <span class="text-[0.8125rem] leading-snug text-[var(--cairn-error-ink)]">
                      <span class="font-semibold">Also overwrite {altCustomRows.length === 1 ? 'this 1 placement' : `these ${altCustomRows.length} placements`} with the default alt.</span>
                      <span id="cairn-ml-alt-optin-hint" class="mt-0.5 block">Overwrites the alt these entries already have. Git keeps the old version.</span>
                    </span>
                  </label>
                </div>
                <ul class="flex max-h-44 list-none flex-col overflow-y-auto p-0">
                  {#each altCustomRows as row (row.key)}
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0">
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate text-[0.8125rem] font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 text-[0.75rem] leading-snug">
                          {#if altOverwrite}
                            <span data-cairn-alt-was class="text-base-content line-through decoration-[var(--color-muted)]/55">{`“${row.before}”`}</span>
                            <ArrowRightIcon class="h-3 w-3 flex-none text-[var(--color-muted)] opacity-65" aria-hidden="true" />
                            <span class="font-medium text-primary">{altPushed}</span>
                          {:else}
                            <span class="text-base-content">{`“${row.before}”`}</span>
                            <span class="text-[var(--color-muted)] opacity-65" aria-hidden="true">&middot;</span>
                            <span class="text-[var(--color-muted)]">kept</span>
                          {/if}
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- DECORATIVE HERO, SKIPPED: listed, muted, never an input. -->
            {#if altSkipRows.length > 0}
              <div data-cairn-alt-skip class="overflow-hidden rounded-box border border-[var(--cairn-card-border)] bg-base-100 opacity-90">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-base-content/[0.07] text-[var(--color-muted)]" aria-hidden="true">
                    <ImageOffIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="text-[0.8125rem] font-semibold">Marked decorative, skipped</div>
                    <div class="mt-px text-[0.6875rem] leading-snug text-[var(--color-muted)]">A hero set as decorative on purpose. It is left without alt.</div>
                  </div>
                  <span class="flex-none text-[0.8125rem] font-bold tabular-nums text-[var(--color-muted)]">{altSkipRows.length}</span>
                </div>
                <ul class="flex list-none flex-col border-t border-[var(--cairn-card-border)] p-0">
                  {#each altSkipRows as row (row.key)}
                    <li class="flex items-center gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2 text-[0.75rem] text-[var(--color-muted)] first:border-t-0">
                      <span class="truncate">{row.title}</span>
                      <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wide">{row.kind}</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>

          {#if (altPlan?.branchDelta?.length ?? 0) > 0}
            <!-- The report-only branch delta: open cairn/* edits keep their own alt until they publish. -->
            <div class="rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-200/40 p-3">
              <div class="mb-1.5 flex items-center gap-2">
                <GitBranchIcon class="h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
                <span class="text-[0.8125rem] font-semibold">Open edits not touched</span>
                <span class="text-xs tabular-nums text-[var(--color-muted)]">{altPlan?.branchDelta.length ?? 0}</span>
              </div>
              <p class="mb-2 text-[0.75rem] leading-relaxed text-[var(--color-muted)]">These edits are on their own branches and are not changed. Each keeps its alt as the author has it there.</p>
              <ul class="flex list-none flex-col gap-1 p-0">
                {#each altPlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] text-[0.6875rem] text-[var(--cairn-warning-ink)]">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
            <span>Every version stays in git history, so any overwrite can be undone.</span>
          </div>
        </div>

        <!-- The polite live region announces the moving committed total when the opt-in toggles. -->
        <div class="sr-only" role="status" aria-live="polite">
          Now writing alt to {altTotal} {altTotal === 1 ? 'placement' : 'placements'}.{altOverwrite && altCounts.customized > 0 ? ` ${altCounts.willFill} filled, ${altCounts.customized} overwritten.` : ''}
        </div>

        <form method="POST" action="?/mediaAltPropagate" class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <CsrfField />
          <input type="hidden" name="hash" value={asset.hash} />
          <!-- The opt-in checkbox lives beside the customized rows (outside the form), so its bound
               state is mirrored here as the posted flag. The server reads form.get('overwrite') === 'on'. -->
          <input type="hidden" name="overwrite" value={altOverwrite ? 'on' : ''} />
          <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm" onclick={closeAltDialog}>Cancel</button>
          <button type="submit" class="btn btn-sm btn-primary">
            <CheckIcon class="h-4 w-4" aria-hidden="true" />
            {#if altOverwrite && altCounts.customized > 0}
              Update {altTotal} {altTotal === 1 ? 'placement' : 'placements'}
            {:else}
              Fill {altTotal} {altTotal === 1 ? 'placement' : 'placements'}
            {/if}
          </button>
        </form>
      {:else}
        <!-- The fail-closed surface: usage could not be fully verified, so the push refuses rather than
             guess. NO apply form. A quiet "Check usage again" re-runs the scan. The banner on open is
             role="status" (not alert): no action was attempted yet. MediaAltPropagateFailure carries
             only `error`, so the generic honest line stands in. -->
        <div class="flex flex-col gap-3">
          <div role="status" class="flex flex-col gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3.5">
            <span class="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="text-[0.8125rem] leading-relaxed">
              cairn could not read every place this image is used, so it cannot tell which placements need alt. Writing now could miss a placement or write over one with no record of it.
            </p>
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runAltPreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
            <span>Nothing was changed. Once the scan completes, the review opens with every placement.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto text-[0.75rem] text-[var(--color-muted)]">No alt was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeAltDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<!-- The bulk-delete alertdialog: a native modal <dialog> (native focus trap + Escape), NO light
     dismiss. The confirm IS the dry-run (the skip-and-report split), so there is no separate preview
     step. A git-tracked removal is reversible, so the register is danger-OUTLINE with a plain confirm
     and no typed gate, carrying the git-revert reassurance. Apply posts every selected hash to
     ?/mediaBulkDelete; the server re-checks each one strictly and the itemized summary reports the
     outcome (succeeded / skipped-with-reason / failed-with-reason). The recheck runs at execution, so
     there is no review-time tick implying the gate passed. -->
<dialog
  bind:this={bulkDialog}
  data-testid="cairn-bulk-dialog"
  class="modal"
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-bulk-title"
  aria-describedby="cairn-ml-bulk-desc"
  oncancel={onBulkCancel}
>
  <div class="modal-box max-w-xl">
    {#if bulkPhase === 'review'}
      <!-- THE CENTRAL SAFETY SCREEN: the selection split into what will be deleted and what is held
           back, careful about timing (the usage shown rode a quick read; each item is re-checked when
           it deletes, not now). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <Trash2Icon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">Delete {bulkHashes.length} selected {bulkHashes.length === 1 ? 'image' : 'images'}?</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'has' : 'have'} no references and will be deleted.
            {#if bulkWillSkip.length > 0}{bulkWillSkip.length} {bulkWillSkip.length === 1 ? 'is' : 'are'} still used and will be skipped. {/if}Each one is checked again at delete time, so nothing in use is removed.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Cancel" onclick={closeBulkDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <!-- The scope strip: the explicit count plus the safety-floor disclosure, timed at execution. -->
        <div class="flex flex-col gap-2 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
          <span class="inline-flex items-start gap-2">
            <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-muted)]" aria-hidden="true" />
            <span><b class="font-semibold">{bulkHashes.length} {bulkHashes.length === 1 ? 'image' : 'images'} selected</b> in the current view.</span>
          </span>
          <span class="inline-flex items-start gap-2 text-[var(--color-muted)]">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>The usage shown here came from a quick read. cairn checks each image again the moment it deletes it, and skips any that turns out to be in use.</span>
          </span>
        </div>

        {#if bulkWillDelete.length > 0}
          <!-- WILL BE DELETED: the no-reference items, each with its slug and the "no references" tag. -->
          <div>
            <span class="mb-2 inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Will be deleted <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 tabular-nums">{bulkWillDelete.length}</span>
            </span>
            <ul class="flex max-h-44 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-card-border)] p-2">
              {#each bulkWillDelete as asset (asset.hash)}
                <li class="flex items-center gap-2.5 rounded px-1.5 py-1">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[0.8125rem] font-semibold">{asset.displayName}</div>
                    <div class="truncate font-[family-name:var(--font-editor)] text-[0.6875rem] text-[var(--color-muted)]">{asset.slug}.{asset.hash}</div>
                  </div>
                  <span class="flex-none text-[0.6875rem] font-semibold text-[var(--color-muted)]">no references found</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if bulkWillSkip.length > 0}
          <!-- WILL BE SKIPPED: the still-used items, reported with their where-used. A bulk delete never
               force-removes an in-use asset; it points to the single-item typed-confirm path. The
               warning register on plain base-100 (a skip is not a failure), text-only. -->
          <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
            <div class="flex items-start gap-2.5 bg-[color-mix(in_oklab,var(--cairn-warning-ink)_8%,var(--color-base-100))] p-3">
              <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--cairn-warning-ink)]" aria-hidden="true" />
              <div class="text-[0.8125rem] leading-relaxed">
                <b class="font-semibold text-[var(--cairn-warning-ink)]">{bulkWillSkip.length} will be skipped, still in use</b>
                <span class="mt-0.5 block text-[0.75rem] text-[var(--color-muted)]">A bulk delete never removes an image that is still referenced. To delete one of these, open it and use Delete with the typed confirm, where you can see and confirm what breaks.</span>
              </div>
            </div>
            <ul class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each bulkWillSkip as asset (asset.hash)}
                {@const where = usageCount(asset.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{asset.slug}</span>
                  <span class="flex-none text-[0.6875rem] font-semibold text-[var(--cairn-warning-ink)]">found in {where} {where === 1 ? 'entry' : 'entries'}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- The recoverability reassurance: a git-tracked removal is reversible. -->
        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] leading-relaxed">
          <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" />
          <span><b class="font-semibold">Every removal is one revertible commit you can undo.</b> The deletes are one commit to <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] text-[0.75rem]">main</code>, so a developer can revert it and the images come back.</span>
        </div>

        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button bind:this={bulkCancelButton} type="button" class="btn btn-sm" onclick={closeBulkDialog}>Cancel</button>
          <!-- The danger-OUTLINE apply (not the solid fill the irreversible purge reserves), naming the
               outcome from the split. Disabled only when nothing in the selection is deletable. -->
          <button type="button" class="btn btn-sm border-[var(--cairn-error-border)] bg-base-100 text-[var(--cairn-error-ink)] hover:bg-[var(--cairn-error-tint)]" disabled={bulkWillDelete.length === 0} onclick={applyBulkDelete}>
            <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> {bulkApplyLabel}
          </button>
        </div>
      </div>
    {:else if bulkPhase === 'deleting'}
      <!-- ANNOUNCED PROGRESS: the per-item recheck against the fresh strict index runs here. The live
           region is role=status (role=alert is reserved for a post-action failure). No review-time tick. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <Trash2Icon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">Deleting images</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Checking each one against a fresh read and removing the ones with no references. This can take a moment across branches.</p>
        </div>
      </div>
      <div class="flex flex-col items-center gap-3 py-4">
        <RefreshCwIcon class="h-6 w-6 animate-spin text-[var(--color-muted)]" aria-hidden="true" />
        <span class="text-[0.8125rem] text-[var(--color-muted)]">Checking and deleting {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'image' : 'images'}...</span>
      </div>
      <div class="mt-2 border-t border-[var(--cairn-card-border)] pt-3.5 text-[0.75rem] text-[var(--color-muted)]">Please keep this open until it finishes.</div>
      <div class="sr-only" role="status" aria-live="polite">Deleting {bulkWillDelete.length} {bulkWillDelete.length === 1 ? 'asset' : 'assets'}...</div>
    {:else if bulkPhase === 'done' && bulkResult}
      {@const res = bulkResult}
      <!-- THE ITEMIZED SUMMARY (the 207-Multi-Status shape): succeeded / skipped-with-reason /
           failed-with-reason. The skipped reason is timing-honest (a reference turned up on the
           recheck). The Done action re-reads the load behind the dialog. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--color-positive-tint,var(--cairn-card-border))] text-[var(--color-positive-ink)]" aria-hidden="true">
          <CheckIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={bulkSummaryTitle} tabindex="-1" id="cairn-ml-bulk-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">Done. {res.deleted.length} deleted{res.skipped.length > 0 ? `, ${res.skipped.length} skipped` : ''}</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            The {res.deleted.length} {res.deleted.length === 1 ? 'delete is' : 'deletes are'} one commit to <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] text-[0.75rem]">main</code>.{#if res.skipped.length > 0} The {res.skipped.length} skipped had a reference turn up on the recheck and {res.skipped.length === 1 ? 'was' : 'were'} left as {res.skipped.length === 1 ? 'it is' : 'they are'}.{/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Close" onclick={() => void finishBulkDelete()}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="text-xl font-bold tabular-nums text-[var(--color-positive-ink)]">{res.deleted.length}</div>
            <div class="text-[0.6875rem] uppercase tracking-wide text-[var(--color-muted)]">Deleted</div>
          </div>
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="text-xl font-bold tabular-nums text-[var(--cairn-warning-ink)]">{res.skipped.length}</div>
            <div class="text-[0.6875rem] uppercase tracking-wide text-[var(--color-muted)]">Skipped</div>
          </div>
          <div class="rounded-box border border-[var(--cairn-card-border)] p-2.5">
            <div class="text-xl font-bold tabular-nums text-[var(--cairn-error-ink)]">{res.failed.length}</div>
            <div class="text-[0.6875rem] uppercase tracking-wide text-[var(--color-muted)]">Failed</div>
          </div>
        </div>

        {#if res.skipped.length > 0}
          <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
            <div class="inline-flex w-full items-center gap-2 bg-[color-mix(in_oklab,var(--cairn-warning-ink)_8%,var(--color-base-100))] p-2.5 text-[0.75rem] font-semibold text-[var(--cairn-warning-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Skipped, a reference turned up on the recheck
            </div>
            <ul class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each res.skipped as skip (skip.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{bulkAssetName(skip.hash)}</span>
                  <span class="flex-none text-[0.6875rem] text-[var(--color-muted)]">{bulkSkipReason(skip)}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if res.failed.length > 0}
          <div class="overflow-hidden rounded-box border border-[var(--cairn-error-border)]">
            <div class="inline-flex w-full items-center gap-2 bg-[var(--cairn-error-tint)] p-2.5 text-[0.75rem] font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Failed
            </div>
            <ul class="flex max-h-36 list-none flex-col overflow-y-auto">
              {#each res.failed as fail (fail.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-error-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold">{bulkAssetName(fail.hash)}</span>
                  <span class="flex-none text-[0.6875rem] text-[var(--cairn-error-ink)]">{fail.error}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
            <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> One commit to main
          </span>
          <button type="button" class="btn btn-sm btn-primary" onclick={() => void finishBulkDelete()}>Done</button>
        </div>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Done. {res.deleted.length} deleted, {res.skipped.length} skipped, {res.failed.length} failed.</div>
    {:else}
      <!-- POST-ACTION FAILURE: the fail-closed 503 (the whole batch refused) or a network throw. This
           is the one place role="alert" belongs (an action was attempted and failed). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--cairn-error-tint)] text-[var(--cairn-error-ink)]" aria-hidden="true">
          <TriangleAlertIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-bulk-title" class="text-lg font-bold tracking-tight font-[family-name:var(--font-display)]">The delete did not run</h2>
          <p id="cairn-ml-bulk-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Nothing was deleted. You can close this and try again.</p>
        </div>
      </div>
      <div role="alert" class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 text-[0.8125rem] leading-relaxed text-[var(--cairn-error-ink)]">
        <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <span>{bulkError}</span>
      </div>
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <button type="button" class="btn btn-sm" onclick={closeBulkDialog}>Close</button>
        <button type="button" class="btn btn-sm border-[var(--cairn-error-border)] bg-base-100 text-[var(--cairn-error-ink)]" onclick={() => (bulkPhase = 'review')}>Back to the selection</button>
      </div>
    {/if}
  </div>
</dialog>

<!-- The on-demand orphan scan surface: a native modal <dialog> (native focus trap + Escape), NO light
     dismiss. The result is the two-section dry-run, the loading state, and the detection-time blocked
     surface. The irreversible byte purge lives inside this dialog only, kept structurally apart from
     the reversible bulk delete: a separate selection Set of R2 keys, a solid-danger Purge, and a
     typed-count confirm. role="dialog" (the everyday register): the scan itself changes nothing, and
     the irreversible step is gated behind the typed confirm below. -->
<!-- svelte-ignore a11y_no_redundant_roles -->
<dialog
  bind:this={orphanDialog}
  data-testid="cairn-orphan-dialog"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="cairn-ml-orphan-title"
  aria-describedby="cairn-ml-orphan-desc"
  oncancel={onOrphanCancel}
>
  <div class="modal-box max-w-2xl">
    {#if orphanPhase === 'scanning'}
      <!-- LOADING: a polite live region announces the scan is running. The scan is far heavier than the
           loaded index (an R2 list plus a cross-branch reconcile), so it is on demand, never instant. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-[var(--color-muted)]" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">Scanning storage</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">Listing every stored file and checking it against the library across the site and every open edit. This can take a moment.</p>
        </div>
      </div>
      <div class="flex flex-col items-center gap-3 py-6">
        <RefreshCwIcon class="h-6 w-6 animate-spin text-[var(--color-muted)]" aria-hidden="true" />
        <span class="text-[0.8125rem] text-[var(--color-muted)]">Scanning storage for orphaned files...</span>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Scanning storage for orphaned files...</div>
    {:else if orphanPhase === 'blocked'}
      <!-- DETECTION-TIME FAIL CLOSED: the scan did not run because an open edit branch could not be
           read, so cairn cannot be sure which files are truly orphaned. There is NO collect or purge
           action, not even disabled. The banner is role="status" (no action was attempted). The server
           returns a generic message, so the framing names an unreadable open edit without naming the
           specific branch (naming it is a known carry-forward). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-[var(--color-muted)]" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">The scan could not finish</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">cairn could not read one of your open edits, so it cannot tell which files are truly orphaned. No file was changed.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Close" onclick={closeOrphanScan}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div role="status" class="flex flex-col gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3.5 text-[0.8125rem] leading-relaxed">
        <span class="inline-flex items-center gap-2 font-semibold">
          <TriangleAlertIcon class="h-4 w-4 flex-none text-[var(--cairn-warning-ink)]" aria-hidden="true" /> Could not read every branch
        </span>
        <p class="text-base-content">
          A file looks orphaned only if no record on any branch points to it. One open edit would not load, so cairn cannot be sure. It will not show a list of files to purge that it might be wrong about.
        </p>
        {#if orphanBlockedError}
          <p class="text-[var(--color-muted)]">{orphanBlockedError}</p>
        {/if}
      </div>
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">No file was changed.</span>
        <button type="button" class="btn btn-sm" onclick={closeOrphanScan}>Close</button>
        <button type="button" class="btn btn-sm border-[var(--cairn-card-border)] bg-base-100" onclick={() => void runOrphanScan()}>
          <RefreshCwIcon class="h-3.5 w-3.5" aria-hidden="true" /> Check again
        </button>
      </div>
    {:else if orphanPhase === 'result' && orphanPurgeResult}
      {@const res = orphanPurgeResult}
      <!-- THE PURGE SUMMARY: the purged count, the keys skipped because their hash was claimed since the
           scan, and any per-object failure. The Done action re-reads the load (the bytes are gone). -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--color-positive-tint,var(--cairn-card-border))] text-[var(--color-positive-ink)]" aria-hidden="true">
          <CheckIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">Done. {res.purged.length} purged{res.skippedClaimed.length > 0 ? `, ${res.skippedClaimed.length} kept` : ''}</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            The {res.purged.length} {res.purged.length === 1 ? 'file is' : 'files are'} gone for good.{#if res.skippedClaimed.length > 0} {res.skippedClaimed.length} {res.skippedClaimed.length === 1 ? 'was' : 'were'} kept because the file was claimed by a record since the scan.{/if}
          </p>
        </div>
      </div>
      {#if res.skippedClaimed.length > 0}
        <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
          <div class="bg-base-200/60 p-2.5 text-[0.75rem] font-semibold text-[var(--color-muted)]">Kept, the file was claimed since the scan</div>
          <ul class="flex max-h-36 list-none flex-col overflow-y-auto">
            {#each res.skippedClaimed as key (key)}
              <li class="border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 font-[family-name:var(--font-editor)] text-[0.75rem] first:border-t-0">{key}</li>
            {/each}
          </ul>
        </div>
      {/if}
      {#if res.failed.length > 0}
        <div class="mt-3 overflow-hidden rounded-box border border-[var(--cairn-error-border)]">
          <div class="bg-[var(--cairn-error-tint)] p-2.5 text-[0.75rem] font-semibold text-[var(--cairn-error-ink)]">Failed</div>
          <ul class="flex max-h-36 list-none flex-col overflow-y-auto">
            {#each res.failed as fail (fail.key)}
              <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-error-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                <span class="min-w-0 flex-1 truncate font-[family-name:var(--font-editor)] text-[0.75rem]">{fail.key}</span>
                <span class="flex-none text-[0.6875rem] text-[var(--cairn-error-ink)]">{fail.error}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <button type="button" class="btn btn-sm btn-primary" onclick={() => void finishOrphanPurge()}>Done</button>
      </div>
      <div class="sr-only" role="status" aria-live="polite">Done. {res.purged.length} purged, {res.skippedClaimed.length} kept, {res.failed.length} failed.</div>
    {:else if orphanPhase === 'result' && orphanPurging}
      <!-- THE IRREVERSIBLE PURGE CONFIRM: the typed-count gate, reserved for THIS path only. The badge
           and the submit carry the SOLID danger fill (--color-error), the one fill the destructive
           register owns. The verb is Purge, never Delete, and the callout states that there is no git
           history for raw bytes. The submit is disabled until the typed value equals the selected
           count. role="alert" is reserved for a post-action failure below. -->
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-[var(--color-error)] text-[var(--color-error-content)]" aria-hidden="true">
          <TriangleAlertIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">Purge {orphanSelectedCount} orphaned {orphanSelectedCount === 1 ? 'file' : 'files'}?</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">This removes the stored bytes for good. It is not a library delete, and it cannot be undone.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Cancel" onclick={cancelOrphanPurge}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div class="flex flex-col gap-3">
        <!-- The dry-run: the keys to remove, each with a checkerboard mat (record-not-picture). -->
        <ul class="flex max-h-40 list-none flex-col gap-1 overflow-y-auto rounded-box border border-[var(--cairn-card-border)] p-2">
          {#each orphanBytes.filter((b) => orphanKeys.has(b.key)) as byte (byte.key)}
            <li class="flex items-center gap-2.5 rounded px-1.5 py-1">
              <span class="h-6 w-8 flex-none rounded border border-[var(--cairn-card-border)] bg-base-200 [background-image:linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%),linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%)] [background-position:0_0,4px_4px] [background-size:8px_8px]" aria-hidden="true"></span>
              <span class="min-w-0 flex-1 truncate font-[family-name:var(--font-editor)] text-[0.75rem]">{byte.key}</span>
            </li>
          {/each}
        </ul>
        <!-- The IRREVERSIBLE callout, distinct from the bulk delete's git-revert reassurance. -->
        <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 text-[0.8125rem] leading-relaxed text-[var(--cairn-error-ink)]">
          <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span><b class="font-semibold">This cannot be undone.</b> A library delete lives in git history and a developer can bring it back. There is no git history for raw bytes, so once these are purged they are gone.</span>
        </div>
        <!-- The typed-count gate, reserved for the irreversible path. -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[0.8125rem]" for="cairn-ml-purge-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] text-[0.75rem]">{orphanSelectedCount}</code> to purge these files for good.</label>
          <input
            id="cairn-ml-purge-confirm"
            class="input input-sm"
            type="text"
            autocomplete="off"
            placeholder="Type the number of files"
            aria-label="Type the file count to confirm the purge"
            bind:value={orphanConfirmInput}
          />
        </div>
        {#if orphanPurgeError}
          <div role="alert" class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 text-[0.8125rem] leading-relaxed text-[var(--cairn-error-ink)]">
            <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{orphanPurgeError}</span>
          </div>
        {/if}
        <div class="flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <button type="button" class="btn btn-sm" onclick={cancelOrphanPurge}>Cancel</button>
          <button
            type="button"
            class="btn btn-sm border-0 bg-[var(--color-error)] text-[var(--color-error-content)] hover:bg-[var(--color-error)]/90"
            disabled={!orphanConfirmMatches || orphanPurgeBusy}
            onclick={() => void applyOrphanPurge()}
          >
            <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Purge {orphanSelectedCount} {orphanSelectedCount === 1 ? 'file' : 'files'}
          </button>
        </div>
      </div>
      <div class="sr-only" aria-live="polite">Purge {orphanSelectedCount} orphaned {orphanSelectedCount === 1 ? 'file' : 'files'}. This cannot be undone.</div>
    {:else if orphanPhase === 'result' && orphanScan}
      <!-- THE TWO-SECTION RESULT: an "Orphaned files" purge surface and a read-only "Broken references"
           data-integrity readout. -->
      <div class="mb-4 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-base-200 text-[var(--color-muted)]" aria-hidden="true">
          <DatabaseIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 bind:this={orphanTitle} tabindex="-1" id="cairn-ml-orphan-title" class="text-lg font-bold tracking-tight outline-hidden font-[family-name:var(--font-display)]">Orphaned files and broken references</h2>
          <p id="cairn-ml-orphan-desc" class="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-muted)]">
            A scan of stored files against the library across every tracked branch. It found {orphanBytes.length} stored {orphanBytes.length === 1 ? 'file' : 'files'} with no record, and {orphanBroken.length} {orphanBroken.length === 1 ? 'record whose file is' : 'records whose files are'} gone.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Close" onclick={closeOrphanScan}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-5">
        <!-- SECTION 1: orphaned BYTES, the irreversible purge surface. -->
        <section>
          <div class="mb-2 flex items-baseline justify-between gap-2">
            <span class="inline-flex items-center gap-2 text-[0.8125rem] font-semibold">Orphaned files <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 text-[0.6875rem] tabular-nums">{orphanBytes.length}</span></span>
          </div>
          <p class="mb-2 text-[0.75rem] leading-relaxed text-[var(--color-muted)]">Stored files with no record in the library. No <code class="rounded bg-[var(--cairn-code-chip)] px-1 py-0.5 font-[family-name:var(--font-editor)] text-[0.6875rem]">media:</code> reference can point to these, so nothing on the site uses them through cairn.</p>
          {#if orphanBytes.length === 0}
            <!-- The calm empty state: a clean scan, no purge control. -->
            <div class="flex items-center gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 text-[0.8125rem] text-[var(--color-muted)]">
              <CheckIcon class="h-4 w-4 flex-none text-[var(--color-positive-ink)]" aria-hidden="true" /> No orphaned files found. Every stored file has a record.
            </div>
          {:else}
            <!-- The residual-risk note, named at the point of action. -->
            <div class="mb-2 flex items-start gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-3 text-[0.8125rem] leading-relaxed text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span><b class="font-semibold">Purging a file removes the bytes for good.</b> There is no git history for raw storage, so this cannot be undone. The one thing cairn cannot check: a page that hardcodes a file's web address in raw HTML would still load these.</span>
            </div>
            <div class="overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
              <div class="flex items-center gap-2.5 border-b border-[var(--cairn-card-border)] bg-base-200/60 px-3 py-2">
                <input
                  bind:this={orphanSelectAll}
                  type="checkbox"
                  class="checkbox checkbox-sm border-[var(--cairn-error-border)]"
                  aria-label="Select all orphaned files"
                  onchange={toggleOrphanAll}
                />
                <span class="text-[0.75rem] font-semibold text-[var(--color-muted)]">{orphanBytes.length} {orphanBytes.length === 1 ? 'file' : 'files'} in storage with no record</span>
              </div>
              <!-- A plain list of labelled native checkboxes, NOT a listbox. The rows carry no roving
                   tabindex or key handler, so the listbox role would have been decorative and would
                   have fought the Tab-to-checkbox model. Each checkbox is the selection signal; the
                   header select-all conveys group state. -->
              <ul aria-label="Orphaned files" class="flex max-h-52 list-none flex-col overflow-y-auto p-0">
                {#each orphanBytes as byte (byte.key)}
                  {@const picked = orphanKeys.has(byte.key)}
                  <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm border-[var(--cairn-error-border)]"
                      checked={picked}
                      aria-label={`Select ${byte.key}`}
                      onchange={() => toggleOrphanKey(byte.key)}
                    />
                    <span class="h-6 w-8 flex-none rounded border border-[var(--cairn-card-border)] bg-base-200 [background-image:linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%),linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_25%,transparent_25%,transparent_75%,color-mix(in_oklab,var(--color-base-content)_7%,transparent)_75%)] [background-position:0_0,4px_4px] [background-size:8px_8px]" aria-hidden="true"></span>
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-[family-name:var(--font-editor)] text-[0.75rem]">{byte.key}</div>
                      <div class="text-[0.6875rem] text-[var(--color-muted)]">No library record</div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
            <!-- The per-section action: a selection note plus the SOLID-danger Purge (never a warning fill). -->
            <div class="mt-3 flex items-center gap-2.5">
              <span class="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
                {orphanSelectedCount} of {orphanBytes.length} selected
                {#if orphanSelectedCount > 0}<button type="button" class="link text-[var(--color-muted)]" onclick={clearOrphanSelection}>Clear</button>{/if}
              </span>
              <span class="flex-1"></span>
              <button
                type="button"
                class="btn btn-sm border-0 bg-[var(--color-error)] text-[var(--color-error-content)] hover:bg-[var(--color-error)]/90"
                aria-haspopup="dialog"
                disabled={orphanSelectedCount === 0}
                onclick={openOrphanPurge}
              >
                <Trash2Icon class="h-3.5 w-3.5" aria-hidden="true" /> Purge {orphanSelectedCount} {orphanSelectedCount === 1 ? 'file' : 'files'}
              </button>
            </div>
          {/if}
        </section>

        <!-- SECTION 2: BROKEN references, a READ-ONLY data-integrity readout. No checkbox, no action. -->
        {#if orphanBroken.length > 0}
          <section data-testid="cairn-broken-refs">
            <div class="mb-2 flex items-baseline justify-between gap-2">
              <span class="inline-flex items-center gap-2 text-[0.8125rem] font-semibold">Broken references <span class="rounded-full bg-base-content/[0.07] px-1.5 py-0.5 text-[0.6875rem] tabular-nums">{orphanBroken.length}</span></span>
            </div>
            <p class="mb-2 text-[0.75rem] leading-relaxed text-[var(--color-muted)]">A record points at a file that is no longer in storage. This is not something to delete here. Re-upload or remove the reference from the entries below.</p>
            <ul class="flex list-none flex-col overflow-hidden rounded-box border border-[var(--cairn-card-border)] p-0">
              {#each orphanBroken as ref (ref.hash)}
                <li class="flex items-center gap-2.5 border-t border-[color-mix(in_oklab,var(--cairn-card-border)_70%,transparent)] px-3 py-2 first:border-t-0">
                  <span class="flex h-7 w-9 flex-none items-center justify-center rounded border border-[var(--cairn-card-border)] bg-base-200 text-[var(--color-muted)]" aria-hidden="true">
                    <ImageOffIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[0.8125rem] font-semibold">{ref.slug || ref.hash}</div>
                    <div class="truncate font-[family-name:var(--font-editor)] text-[0.6875rem] text-[var(--color-muted)]">file missing in storage</div>
                  </div>
                  <span class="flex-none text-[0.6875rem] font-semibold text-[var(--color-muted)]">{brokenWhereUsed(ref.usage.length)}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </div>

      <div class="mt-5 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
        <span class="mr-auto inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--color-muted)]">
          <GitBranchIcon class="h-3.5 w-3.5" aria-hidden="true" /> Scanned across the site and every open edit
        </span>
        <button type="button" class="btn btn-sm" onclick={closeOrphanScan}>Close</button>
      </div>
    {/if}
  </div>
</dialog>
