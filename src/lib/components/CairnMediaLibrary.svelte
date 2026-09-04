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
  import { deserialize } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  import type { MediaLibraryData, ContentFormFailure } from '../sveltekit/content-routes.js';
  // Each of the below retired from the public barrel (4b, Task 1, the Tier 1 media-janitorial
  // retires); still exported at its declaring module for this component's own typing.
  import type {
    MediaReplacePreviewPlan,
    MediaReplaceFailure,
    MediaReplacePreviewEntry,
    MediaAltPreviewPlan,
    MediaAltPropagateFailure,
  } from '../sveltekit/content-routes-media.js';
  import type { AltPlacement } from '../content/media-rewrite.js';
  import type { UsageEntry } from '../media/usage.js';
  import type { MediaEntry } from '../media/manifest.js';
  import { publicPath } from '../media/naming.js';
  import { formatMediaToken } from '../media/reference.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import { MEDIA_BASE_CONTEXT_KEY, DEFAULT_MEDIA_BASE } from './media-base-context.js';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    firstImageFile,
    guardDropTarget,
    type IngestFailureCard,
  } from './client-ingest.js';
  import { uploadOutcome, type UploadEnvelope } from './media-upload-outcome.js';
  import { segmentTintClass } from './segmented-control.js';
  import { confirmGateMatches } from './typed-confirm.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { postFormAction, createRequestGuard } from './client-action.js';
  import CsrfField from './CsrfField.svelte';
  import MediaCaptureCard from './MediaCaptureCard.svelte';
  import MediaOrphanTools from './MediaOrphanTools.svelte';
  import MediaBulkDeleteDialog from './MediaBulkDeleteDialog.svelte';
  import { usageCount as usageCountOf, needsAlt as needsAltOf, usageEntries as usageEntriesOf, publishedRows as publishedRowsOf, branchRows as branchRowsOf, branchNameOf } from './media-library-helpers.js';
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

  // The CSRF token getter comes from the admin context, the same seam the insert popover reads.
  // Hoisted to the script top: the Replace, Alt-fill, and Upload flows below all read it.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

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
  // for the two-scope rationale it shares with libraryDropBusy.
  let rootEl = $state<HTMLElement | undefined>();

  // The extracted dialog components, opened imperatively from the shell's own trigger buttons.
  // Typed structurally over their exported open() (the EditPage DialogHandle idiom).
  let bulkDeleteDialog = $state<{ open: (hashes: string[], origin?: HTMLElement | null) => void } | null>(null);
  let orphanTools = $state<{ open: (origin?: HTMLElement | null) => void } | null>(null);

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
  // open. libraryDropBusy below makes the opposite call on purpose for a different question (drag-drop
  // should stand down for ANY open dialog, the palette included), so it stays document-scoped; see its
  // own comment for that half of the split.
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

  // --- the Replace flow: a two-step alertdialog (upload, then impact review) over the selected asset ---
  // Replace uploads a new file for the selected asset; cairn is content-addressed, so the new file has a
  // new hash and every published reference is repointed to it in one commit to main. The dialog opens on
  // the quiet upload step, holds the server-owned record on a successful upload, fetches the preview
  // (fail-closed), and renders the impact review behind a typed-slug gate.
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
  const replaceConfirmMatches = $derived(replaceAsset !== null && confirmGateMatches(replaceConfirmInput, replaceAsset.slug));

  function openReplaceDialog(origin?: HTMLElement | null) {
    if (!selected) return;
    // The entry-point button passed from the click (focus restores here on close), falling back to the
    // active element. A programmatic .click() does not focus its target, so the explicit origin is the
    // reliable restore point.
    replaceOrigin = resolveDialogOrigin(origin);
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
    replaceOrigin = refocusDialogOrigin(replaceOrigin);
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

  // A per-call request guard drops the preview fetch's response if it lands on a closed or reopened
  // dialog. Svelte reactivity does not track reads below the first `await`, so each call pins its own
  // token at entry and bails after the await if a newer call (a reopen, or a "Check usage again"
  // double-click) has since superseded it.
  const replacePreviewGuard = createRequestGuard();

  // The preview fetch: POST the (oldHash, newHash, slug) tuple in the 2a transport (a text/plain
  // body, the CSRF token in the X-Cairn-CSRF header), parse the SvelteKit ActionResult envelope, and
  // route to the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the
  // blocked step's "Check usage again". The slug is the OLD asset's: a replace keeps the name and
  // changes only the content hash, so the repointed token carries the existing slug, not the new file's.
  async function runReplacePreview() {
    if (!replaceAsset || !replaceRecord) return;
    const hash = replaceAsset.hash;
    const token = replacePreviewGuard.next();
    const body = JSON.stringify({ oldHash: hash, newHash: replaceRecord.hash, slug: replaceAsset.slug });
    const outcome = await postFormAction<MediaReplacePreviewPlan>(REPLACE_PREVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
      body,
    });
    // The dialog was closed or reopened (for another asset, or via a re-run) while this fetch was in
    // flight, so a stale response is ignored rather than clobbering the live state.
    if (replacePreviewGuard.isStale(token)) return;
    if (outcome.ok) {
      replacePlan = outcome.data;
      replaceFailure = null;
      replaceConfirmInput = '';
      replaceStep = 'review';
    } else {
      // The fail-closed landing: an unverifiable usage read, an unreachable preview, or an unparseable
      // body all route to the blocked step. A parsed failure carries the branch-naming error when the
      // server returned one; a transport miss carries the empty error (the generic honest line stands in).
      const failure = outcome.data as MediaReplaceFailure | undefined;
      replaceFailure = failure ?? { error: '', hash, usage: [], foundIn: 0 };
      replacePlan = null;
      replaceStep = 'blocked';
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

  // --- the Library upload flow: choose or drop a file, capture its name and alt, then upload and
  // commit it as a new asset. Reuses the Replace flow's ingest/upload transport and MediaCaptureCard
  // verbatim, overriding only the target action, since the Library has no entry to upload into. ---
  const LIBRARY_UPLOAD_URL = '?/mediaLibraryUpload';
  const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again to upload the image.';

  /** The record MediaCaptureCard emits on submit; matches its own local (unexported) shape. */
  interface CaptureRecord {
    file: File;
    displayName: string;
    alt: string;
    decorative: boolean;
  }

  let uploadFileInput = $state<HTMLInputElement | null>(null);
  let uploadDialog = $state<HTMLDialogElement | null>(null);
  // The button that opened the dialog (a header/empty-state Upload click, or null for a page drop),
  // so focus restores to it on close; a null origin (the drop case) falls back to the active element.
  let uploadOrigin: HTMLElement | null = null;
  // The dialog's own Cancel control, the initial focus on open (the Replace/Alt dialog recipe).
  let uploadCancelButton = $state<HTMLButtonElement | null>(null);
  let uploadCaptureFile = $state<File | null>(null);
  type LibraryUploadStatus =
    | { kind: 'idle' }
    | { kind: 'working' }
    | { kind: 'failed'; message: string; retry: () => void };
  let uploadStatus = $state<LibraryUploadStatus>({ kind: 'idle' });

  /** Open the capture dialog on a chosen or dropped file. */
  function openLibraryUpload(file: File, origin: HTMLElement | null) {
    uploadOrigin = resolveDialogOrigin(origin);
    uploadCaptureFile = file;
    uploadStatus = { kind: 'idle' };
    void tick().then(() => {
      uploadDialog?.showModal();
      uploadCancelButton?.focus();
    });
  }
  function closeLibraryUpload() {
    uploadDialog?.close();
    uploadCaptureFile = null;
    uploadStatus = { kind: 'idle' };
    uploadOrigin = refocusDialogOrigin(uploadOrigin);
  }
  /** Either Upload button: pin the clicked button as the focus-restore origin, then open the native
   *  file chooser through the shared hidden input. A programmatic .click() does not focus its target,
   *  so the origin is captured explicitly here, exactly as openReplaceDialog does. */
  function onUploadButtonClick(e: MouseEvent) {
    uploadOrigin = e.currentTarget as HTMLElement;
    uploadFileInput?.click();
  }
  function onUploadFileChosen(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    // Reset so choosing the same file again still fires a change event.
    input.value = '';
    if (file) openLibraryUpload(file, uploadOrigin);
  }

  // The page-wide drop target: the empty-state copy promises a drop anywhere on the page, so the
  // handlers live on the window rather than one element. They stand down while the Replace dialog or
  // this capture dialog is already open, so a drop never fights with an in-progress upload.
  function libraryDropBusy(): boolean {
    // Deliberately DOCUMENT-scoped, not rootEl-scoped like onWindowKeydown's Escape check: drag-drop
    // should stand down for ANY open dialog anywhere on the page, the admin shell's command palette
    // included, since dropping a file while an unrelated dialog covers the screen would stack the
    // capture dialog behind it. Escape's question is the opposite (a foreign dialog must never steal
    // Escape from this library), so the two checks land on different scopes on purpose; see
    // onWindowKeydown's comment for that half. Testing for the open attribute directly stays correct
    // as dialogs are added, unlike enumerating them by name.
    return document.querySelector('dialog[open]') !== null;
  }
  function onPageDragover(e: DragEvent) {
    if (libraryDropBusy()) return;
    // dataTransfer.files is empty during dragover (the HTML DnD spec's protected mode), so
    // firstImageFile(...) never matches here; only dataTransfer.types is readable at this stage.
    // Gate on the 'Files' type instead, so preventDefault actually runs and the window becomes a
    // valid drop target (without it, drop never fires and the browser navigates to the raw file).
    if (e.dataTransfer?.types.includes('Files')) guardDropTarget(e);
  }
  function onPageDrop(e: DragEvent) {
    if (libraryDropBusy()) return;
    const file = e.dataTransfer ? firstImageFile(e.dataTransfer) : null;
    if (!file) return;
    guardDropTarget(e);
    openLibraryUpload(file, null);
  }

  // The capture-to-commit loop: ingest the bytes, build the upload request (overriding the target to
  // the media-scoped ?/mediaLibraryUpload action, which stores and commits in one step), send it, and
  // route the envelope. A typed failure or an expired session shows a retry card in the dialog without
  // losing the file; success closes the dialog and navigates to the flash-carrying URL so the loader
  // re-runs and the new asset appears (invalidateAll alone would not set the flash).
  async function runLibraryUpload(record: CaptureRecord) {
    uploadStatus = { kind: 'working' };
    const fail = (message: string) => {
      uploadStatus = { kind: 'failed', message, retry: () => void runLibraryUpload(record) };
    };

    let ingested: Awaited<ReturnType<typeof ingestFile>>;
    try {
      ingested = await ingestFile(record.file);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)).message);
      return;
    }

    const built = buildUploadRequest({
      conceptId: '',
      id: '',
      bytes: ingested.blob,
      contentType: ingested.contentType,
      csrf: csrf?.() ?? '',
      filename: record.file.name,
      alt: record.alt,
      displayName: record.displayName,
      width: ingested.width,
      height: ingested.height,
    });

    let res: Response;
    try {
      res = await sendUpload(LIBRARY_UPLOAD_URL, built.init);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)).message);
      return;
    }
    // The guard's expired-session 303 under redirect:'manual' surfaces as an opaque, status-0 response.
    if (res.type === 'opaqueredirect' || res.status === 0) {
      fail(SESSION_EXPIRED_MESSAGE);
      return;
    }

    let outcome: ReturnType<typeof uploadOutcome>;
    try {
      outcome = uploadOutcome(deserialize(await res.text()) as UploadEnvelope);
    } catch {
      fail(GENERIC_UPLOAD_MESSAGE);
      return;
    }
    if (outcome.kind === 'session-expired') {
      fail(SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (outcome.kind === 'failed') {
      fail(outcome.failure === 'generic' ? GENERIC_UPLOAD_MESSAGE : failureCard(outcome.failure).message);
      return;
    }

    // Success: navigate to the flash URL rather than plain invalidateAll, so the loader re-runs AND
    // sets the uploaded flash (invalidateAll alone would refresh the grid but leave the flash unset).
    // { invalidateAll: true } is still required alongside the URL: a second upload in the same
    // session lands on the identical ?uploaded=1 URL, which goto() treats as a no-op navigation
    // without it, so the loader never re-runs and the new asset never appears.
    closeLibraryUpload();
    await goto('/admin/media?uploaded=1', { invalidateAll: true });
  }

  // --- the Push-alt flow: a one-step review dialog (the everyday register) over the selected asset ---
  // Alt propagation pushes the asset's default alt into published placements that lack it, with one
  // bucket-level opt-in to also overwrite placements that carry a custom alt. It is reversible and
  // frequent, so the dialog carries no alertdialog role and no typed-slug gate; apply is always
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
    altOrigin = resolveDialogOrigin(origin);
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
    altOrigin = refocusDialogOrigin(altOrigin);
  }

  // The per-call request guard for the alt preview, mirroring the Replace guard: a stale response
  // from a closed or reopened dialog (or a "Check usage again" double-click) is dropped after the await.
  const altPreviewGuard = createRequestGuard();

  // The preview fetch: POST the hash in the 2a transport, parse the ActionResult envelope, and route to
  // the review step (a plan) or the fail-closed blocked step (a failure). Re-runnable from the blocked
  // step's "Check usage again".
  async function runAltPreview() {
    if (!altAsset) return;
    const token = altPreviewGuard.next();
    const outcome = await postFormAction<MediaAltPreviewPlan>(ALT_PREVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', 'X-Cairn-CSRF': csrf?.() ?? '' },
      body: JSON.stringify({ hash: altAsset.hash }),
    });
    // Stale-response guard: a reopen or a re-run superseded this fetch while it was in flight.
    if (altPreviewGuard.isStale(token)) return;
    if (outcome.ok) {
      altPlan = outcome.data;
      altFailure = null;
      altStep = 'review';
    } else {
      altFailure = (outcome.data as MediaAltPropagateFailure | undefined) ?? { error: '' };
      altPlan = null;
      altStep = 'blocked';
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

<svelte:window onkeydown={onWindowKeydown} ondragover={onPageDragover} ondrop={onPageDrop} />

<!-- The wrapping element rootEl binds to, so onWindowKeydown's Escape open-dialog check can scope
     itself to this component's own subtree instead of the whole document (see that function's
     comment). Plain, unstyled: every visual and layout class stays exactly where it already was. -->
<div bind:this={rootEl}>
{#snippet uploadAction()}
  <button type="button" class="btn btn-sm shrink-0 border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)]" onclick={onUploadButtonClick}>
    <UploadIcon class="h-4 w-4" /> Upload
  </button>
{/snippet}

<PageHeader eyebrow="Media" title="Media library" meta={libraryMeta} action={uploadAction} />

<!-- The hidden file input behind both Upload buttons and their shared capture dialog below. -->
<input
  bind:this={uploadFileInput}
  type="file"
  accept="image/*"
  class="sr-only"
  aria-label="Upload an image"
  tabindex="-1"
  onchange={onUploadFileChosen}
/>

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
      <button type="button" class="btn btn-sm border-transparent bg-neutral text-neutral-content shadow-none tracking-small-semibold hover:bg-[var(--cairn-ink-hover)]" onclick={onUploadButtonClick}>
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
           rows, lighter than a bordered button; each carries aria-haspopup="dialog". Push alt's handler
           lands in Task 8; the button is placed now so the block matches the design. -->
      <div class="flex flex-col gap-1 border-t border-[var(--cairn-card-border)] pt-4">
        <span class="{headerLabel} mb-1">Actions</span>
        <button
          type="button"
          data-cairn-replace-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left type-meta font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => openReplaceDialog(e.currentTarget)}
        >
          <RefreshCwIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
          Replace image
        </button>
        <button
          type="button"
          data-cairn-pushalt-open
          class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left type-meta font-medium text-base-content hover:bg-base-content/[0.06]"
          aria-haspopup="dialog"
          onclick={(e) => openAltDialog(e.currentTarget)}
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
          <h2 id="cairn-ml-replace-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
            {#if replaceStep === 'review'}
              Replace {asset.slug} in {replaceAffected} published {replaceAffected === 1 ? 'entry' : 'entries'}
            {:else if replaceStep === 'blocked'}
              Replace is on hold
            {:else}
              Replace {asset.displayName}
            {/if}
          </h2>
          <p id="cairn-ml-replace-sub" class="mt-1 type-meta leading-relaxed text-muted">
            {#if replaceStep === 'review'}
              The new file replaces the stored image. Every published entry that uses it is repointed in one commit to main, and readers see the change once the build finishes.
            {:else if replaceStep === 'blocked'}
              cairn could not read every place this image is used, so it will not repoint references it cannot see. No file was changed.
            {:else}
              Upload a new file. Every published entry that uses this image points to the new one, in one commit to main.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeReplaceDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if replaceStep === 'upload'}
        <!-- Step one: upload a new file (upload-new-only). The asset being replaced stays named above
             the dropzone, so the author never loses it. Cancel is the initial focus; no apply yet. -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
            <span class="flex h-12 w-12 flex-none items-center justify-center overflow-hidden card-shell">
              {#if brokenHashes.has(asset.hash)}
                <ImageOffIcon class="h-5 w-5 text-subtle" aria-hidden="true" />
              {:else}
                <img src={thumbSrc(asset)} alt="" aria-hidden="true" class="h-full w-full object-cover" onerror={() => markBroken(asset.hash)} />
              {/if}
            </span>
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">Replacing</span>
              <span class="type-body font-semibold">{asset.displayName}</span>
              <span class="font-[family-name:var(--font-editor)] type-meta text-muted tabular-nums">
                {#if dimensions(asset)}{dimensions(asset)}<span class="px-1" aria-hidden="true">&middot;</span>{/if}{formatBytes(asset.bytes)}
              </span>
            </span>
          </div>

          {#if replaceUpload.kind === 'failed'}
            <!-- A typed ingest/upload failure: an assertive alert with the message and a Retry. -->
            <div role="alert" class="flex flex-col items-center gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-4 text-center">
              <TriangleAlertIcon class="h-6 w-6 text-[var(--cairn-error-ink)]" aria-hidden="true" />
              <span class="type-meta text-[var(--cairn-error-ink)]">{replaceUpload.card.message}</span>
              <button type="button" class="btn btn-sm" onclick={replaceUpload.retry}>Try another file</button>
            </div>
          {:else if replaceUpload.kind === 'working'}
            <div role="status" class="flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-muted">
              <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
              <span class="type-meta">Preparing the new file…</span>
            </div>
          {:else}
            <div class="flex flex-col items-center gap-1.5 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-muted">
              <UploadIcon class="h-6 w-6 text-primary" aria-hidden="true" />
              <span class="type-body font-medium text-base-content">Drop the new image, or upload</span>
              <span class="type-meta">PNG, JPEG, WebP, or HEIC. We convert HEIC for you.</span>
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
        <div class="flex flex-col gap-group">
          {#if newRec}
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-box border border-[var(--cairn-card-border)] bg-base-200/60 p-3">
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">Current</span>
                <span class="font-[family-name:var(--font-editor)] type-meta text-muted tabular-nums line-through">.{asset.hash}</span>
              </div>
              <ArrowRightIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="type-chip font-semibold uppercase tracking-[0.06em] text-muted">New file</span>
                <span class="font-[family-name:var(--font-editor)] type-meta text-primary tabular-nums">.{newRec.hash}</span>
              </div>
              <div class="col-span-3 flex items-start gap-2 border-t border-[var(--cairn-card-border)] pt-2.5">
                <CheckIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta leading-relaxed">The name <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] type-meta">{asset.slug}</code> stays the same. Only the content hash changes, so every published entry is repointed to the new file in one commit.</span>
              </div>
            </div>
          {/if}

          <div>
            <div class="mb-2 flex items-baseline justify-between">
              <span class={headerLabel}>Published entries that will be repointed</span>
              <span class="type-meta tabular-nums text-muted">{replaceEntries.length}</span>
            </div>
            <div class="card-shell">
              <ul role="list" bind:this={replaceEntriesList} id="cairn-ml-replace-entries" class="flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-2">
                {#each replaceVisibleEntries as entry, i (entry.concept + '/' + entry.id)}
                  <!-- The first row past the cap is a script-only focus target for "Show all" (tabindex
                       -1 keeps it out of the tab order). svelte-ignore: the rule allows a literal -1 but
                       does not see through the per-row conditional that selects which row carries it. -->
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                  <li class="flex items-start gap-2.5 rounded px-1.5 py-1.5" tabindex={i === REPLACE_ROW_CAP ? -1 : undefined}>
                    <FileTextIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate type-meta font-medium">{entry.title}</span>
                      <span class="truncate type-label text-muted">{replaceWhereUsed(entry)}</span>
                    </span>
                  </li>
                {/each}
              </ul>
              {#if replaceHiddenCount > 0 && !replaceShowAll}
                <div class="border-t border-[var(--cairn-card-border)] p-1.5">
                  <button
                    type="button"
                    class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 type-meta font-medium text-primary hover:bg-primary/[0.08]"
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
                <GitBranchIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta font-semibold">Open edits still on the old file</span>
                <span class="type-meta tabular-nums text-muted">{replacePlan?.branchDelta.length ?? 0}</span>
              </div>
              <p class="mb-2 type-meta leading-relaxed text-muted">These edits are on their own branches and are not touched. Each keeps the old file until it is published again.</p>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each replacePlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] type-label cairn-text-warning">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>The old file stays in git history. A developer can bring it back. The alt text on each placement is left exactly as it is.</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="type-body" for="cairn-ml-replace-confirm">Type <code class="rounded bg-[var(--cairn-code-chip)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] type-meta font-bold">{asset.slug}</code> to replace the file in all {replaceAffected} {replaceAffected === 1 ? 'entry' : 'entries'}.</label>
            <input id="cairn-ml-replace-confirm" data-cairn-replace-confirm class="input input-sm border-[var(--cairn-error-border)] font-[family-name:var(--font-editor)]" autocomplete="off" placeholder="Type the asset's address" bind:value={replaceConfirmInput} />
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
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
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
            <span class="inline-flex items-center gap-2 type-meta font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="type-meta leading-relaxed">
              {#if replaceBlockedBranch}
                The published site read cleanly. One edit branch would not load, so cairn cannot tell whether it uses the image too. Replacing now could leave that branch pointing at the old file with no record of it.
              {:else}
                The published site could not be fully read, so cairn cannot tell every place this image is used. Replacing now could leave a reference pointing at the old file with no record of it.
              {/if}
            </p>
            {#if replaceBlockedBranch}
              <p class="inline-flex items-center gap-1.5 type-meta">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                Could not read <code class="font-[family-name:var(--font-editor)] type-meta">{replaceBlockedBranch}</code>
              </p>
            {:else}
              <p class="inline-flex items-center gap-1.5 type-meta">
                <XIcon class="h-3.5 w-3.5 flex-none text-[var(--cairn-error-ink)]" aria-hidden="true" />
                An edit branch would not load.
              </p>
            {/if}
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runReplacePreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>Your uploaded file is held and ready. Once the scan completes, the review opens with the full impact.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto type-meta text-muted">No file was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeReplaceDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<!-- The Push-alt review dialog: a native modal <dialog> (native focus trap + Escape), NO light dismiss.
     Alt fill is reversible and frequent (never the alertdialog register) with NO typed-slug gate;
     apply is always enabled. It relies on the native <dialog> role and aria-labelledby, with no
     redundant role or aria-modal (the Replace dialog's role="alertdialog" is the deliberate outlier,
     stated explicitly because it changes the semantics). The review step lists three buckets
     (will-fill always applied, customized behind one opt-in, decorative-skipped reported); the blocked
     step is the fail-closed surface (no apply form). -->
<dialog
  bind:this={altDialog}
  data-testid="cairn-alt-dialog"
  class="modal"
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
          <h2 id="cairn-ml-alt-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
            {#if altStep === 'blocked'}
              Push alt is on hold
            {:else}
              Fill alt on {altCounts.willFill} {altCounts.willFill === 1 ? 'placement' : 'placements'}
            {/if}
          </h2>
          <p id="cairn-ml-alt-sub" class="mt-1 type-meta leading-relaxed text-muted">
            {#if altStep === 'blocked'}
              cairn could not read every place this image is used, so it will not write alt where it cannot see. Nothing was changed.
            {:else}
              This writes the default alt for {asset.displayName} into the published placements that have none. One commit to main. Placements that already have their own alt stay as they are, unless you choose to overwrite them below.
            {/if}
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeAltDialog}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if altStep === 'review'}
        <div class="flex flex-col gap-group">
          <!-- The alt being pushed, shown once so the author confirms the text before applying. -->
          <div class="flex items-start gap-2.5 rounded-box border border-primary/25 bg-primary/[0.05] p-3 type-meta leading-relaxed">
            <MegaphoneIcon class="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
            <span>The alt being pushed: <strong class="font-semibold">{altPushed ? `“${altPushed}”` : '(no default alt set)'}</strong>. Edit it in the panel first if it is not right.</span>
          </div>

          <div class="flex flex-col gap-3">
            <!-- WILL FILL: every row's honest (no alt) -> default alt, always applied. -->
            {#if altFillRows.length > 0}
              <div class="overflow-hidden card-shell">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
                    <CheckIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Will fill the gap</div>
                    <div class="mt-px type-label leading-snug text-muted">These placements have no alt today. The default alt is written in.</div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums text-primary">{altFillRows.length}</span>
                </div>
                <ul role="list" bind:this={altFillList} id="cairn-ml-alt-fill" class="flex max-h-44 list-none flex-col overflow-y-auto border-t border-[var(--cairn-card-border)] p-0">
                  {#each altFillVisible as row, i (row.key)}
                    <!-- The first row past the cap is the script-only focus target for "Show all"
                         (tabindex -1). svelte-ignore: as above, the conditional hides the literal -1. -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0" tabindex={i === ALT_ROW_CAP ? -1 : undefined}>
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate type-meta font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide text-muted">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 type-meta leading-snug">
                          <span class="text-muted">(no alt)</span>
                          <ArrowRightIcon class="h-3 w-3 flex-none text-muted opacity-65" aria-hidden="true" />
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
                      class="flex w-full items-center justify-center gap-1.5 rounded px-2 py-1 type-meta font-medium text-primary hover:bg-primary/[0.08]"
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
              <div class="flex items-start gap-2 px-0.5 type-meta leading-relaxed">
                <TriangleAlertIcon class="mt-0.5 h-3.5 w-3.5 flex-none cairn-text-warning" aria-hidden="true" />
                <span>A body image has no place to record decorative, so an empty body image always reads as a gap to fill. Only a hero can be skipped as decorative.</span>
              </div>
            {/if}

            <!-- HAS CUSTOM ALT: one bucket-level opt-in (a real native checkbox). Before it is checked,
                 each row shows its existing alt plain and "kept"; checking flips to was -> default. -->
            {#if altCustomRows.length > 0}
              <div data-cairn-alt-custom class="overflow-hidden card-shell">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-[var(--cairn-warning-ink)]/10 cairn-text-warning" aria-hidden="true">
                    <MegaphoneIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Already has custom alt</div>
                    <div class="mt-px type-label leading-snug text-muted">
                      {altOverwrite ? 'You chose to overwrite these.' : 'Left alone by default. You can overwrite these too.'}
                    </div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums cairn-text-warning">{altCustomRows.length}</span>
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
                    <span class="type-meta leading-snug text-[var(--cairn-error-ink)]">
                      <span class="font-semibold">Also overwrite {altCustomRows.length === 1 ? 'this 1 placement' : `these ${altCustomRows.length} placements`} with the default alt.</span>
                      <span id="cairn-ml-alt-optin-hint" class="mt-0.5 block">Overwrites the alt these entries already have. Git keeps the old version.</span>
                    </span>
                  </label>
                </div>
                <ul role="list" class="flex max-h-44 list-none flex-col overflow-y-auto p-0">
                  {#each altCustomRows as row (row.key)}
                    <li class="flex items-start gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2.5 first:border-t-0">
                      <FileTextIcon class="mt-0.5 h-3.5 w-3.5 flex-none text-muted" aria-hidden="true" />
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div class="flex items-center gap-1.5">
                          <span class="truncate type-meta font-semibold">{row.title}</span>
                          <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide text-muted">{row.kind}</span>
                        </div>
                        <div class="flex flex-wrap items-baseline gap-1.5 type-meta leading-snug">
                          {#if altOverwrite}
                            <span data-cairn-alt-was class="text-base-content line-through decoration-[color-mix(in_oklab,currentColor_55%,transparent)]">{`“${row.before}”`}</span>
                            <ArrowRightIcon class="h-3 w-3 flex-none text-muted opacity-65" aria-hidden="true" />
                            <span class="font-medium text-primary">{altPushed}</span>
                          {:else}
                            <span class="text-base-content">{`“${row.before}”`}</span>
                            <span class="text-muted opacity-65" aria-hidden="true">&middot;</span>
                            <span class="text-muted">kept</span>
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
              <div data-cairn-alt-skip class="overflow-hidden card-shell opacity-90">
                <div class="flex items-center gap-2.5 p-3">
                  <span class="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md bg-base-content/[0.07] text-muted" aria-hidden="true">
                    <ImageOffIcon class="h-3.5 w-3.5" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="type-meta font-semibold">Marked decorative, skipped</div>
                    <div class="mt-px type-label leading-snug text-muted">A hero set as decorative on purpose. It is left without alt.</div>
                  </div>
                  <span class="flex-none type-meta font-bold tabular-nums text-muted">{altSkipRows.length}</span>
                </div>
                <ul role="list" class="flex list-none flex-col border-t border-[var(--cairn-card-border)] p-0">
                  {#each altSkipRows as row (row.key)}
                    <li class="flex items-center gap-2.5 border-t border-[var(--cairn-card-border)]/70 px-3 py-2 type-meta text-muted first:border-t-0">
                      <span class="truncate">{row.title}</span>
                      <span class="flex-none rounded-full bg-base-content/[0.06] px-1.5 py-px type-chip font-semibold uppercase tracking-wide">{row.kind}</span>
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
                <GitBranchIcon class="h-4 w-4 flex-none text-muted" aria-hidden="true" />
                <span class="type-meta font-semibold">Open edits not touched</span>
                <span class="type-meta tabular-nums text-muted">{altPlan?.branchDelta.length ?? 0}</span>
              </div>
              <p class="mb-2 type-meta leading-relaxed text-muted">These edits are on their own branches and are not changed. Each keeps its alt as the author has it there.</p>
              <ul role="list" class="flex list-none flex-col gap-1 p-0">
                {#each altPlan?.branchDelta ?? [] as delta (delta.branch)}
                  <li class="font-[family-name:var(--font-editor)] type-label cairn-text-warning">{delta.branch}</li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
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
          <span class="mr-auto inline-flex items-center gap-1.5 type-meta text-muted">
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
            <span class="inline-flex items-center gap-2 type-meta font-semibold text-[var(--cairn-error-ink)]">
              <TriangleAlertIcon class="h-4 w-4 flex-none" aria-hidden="true" /> Usage could not be fully verified
            </span>
            <p class="type-meta leading-relaxed">
              cairn could not read every place this image is used, so it cannot tell which placements need alt. Writing now could miss a placement or write over one with no record of it.
            </p>
            <button type="button" class="btn btn-sm self-start border-[var(--cairn-error-border)] text-[var(--cairn-error-ink)]" onclick={runAltPreview}>
              <RefreshCwIcon class="h-4 w-4" aria-hidden="true" /> Check usage again
            </button>
          </div>
          <div class="flex items-start gap-2.5 rounded-box border border-[var(--cairn-card-border)] bg-base-200/50 p-3 type-meta leading-relaxed">
            <ClockIcon class="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden="true" />
            <span>Nothing was changed. Once the scan completes, the review opens with every placement.</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2.5 border-t border-[var(--cairn-card-border)] pt-3.5">
          <span class="mr-auto type-meta text-muted">No alt was changed.</span>
          <button type="button" class="btn btn-sm" onclick={closeAltDialog}>Cancel</button>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<MediaBulkDeleteDialog bind:this={bulkDeleteDialog} assets={data.assets} usage={data.usage} onfinished={clearSelection} />

<MediaOrphanTools bind:this={orphanTools} {brokenWhereUsed} />

<!-- The Library upload dialog: a standard modal <dialog>. NO light dismiss (no method="dialog"
     backdrop form, matching the Replace/Alt siblings): a backdrop click does nothing, and only
     Escape or the Cancel button closes it. It hosts MediaCaptureCard on a chosen or dropped file; a
     typed ingest/upload failure or an expired session shows the Replace flow's retry-card treatment
     without losing the file. It relies on the native <dialog> role and aria-labelledby, with no
     redundant role or aria-modal, matching the Push-alt and orphan-scan dialogs. -->
<dialog
  bind:this={uploadDialog}
  data-testid="cairn-library-upload-dialog"
  class="modal"
  aria-labelledby="cairn-ml-upload-title"
  aria-describedby="cairn-ml-upload-sub"
  oncancel={closeLibraryUpload}
>
  {#if uploadCaptureFile}
    <div class="modal-box max-w-md">
      <div class="mb-3 flex items-start gap-3">
        <span class="flex h-9 w-9 flex-none items-center justify-center rounded-box bg-primary/10 text-primary" aria-hidden="true">
          <UploadIcon class="h-5 w-5" />
        </span>
        <div class="flex-1">
          <h2 id="cairn-ml-upload-title" class="type-heading font-bold font-[family-name:var(--font-display)]">
            Upload an image
          </h2>
          <p id="cairn-ml-upload-sub" class="mt-1 type-meta leading-relaxed text-muted">
            Name it and, if you like, describe it. You can add the description later.
          </p>
        </div>
        <button bind:this={uploadCancelButton} type="button" class="btn btn-ghost btn-xs btn-square max-sm:min-h-11 max-sm:min-w-11" aria-label="Cancel" onclick={closeLibraryUpload}>
          <XIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {#if uploadStatus.kind === 'failed'}
        <!-- A typed ingest/upload failure or an expired session: an assertive alert with a Retry,
             matching the Replace flow's failed-card treatment. -->
        <div role="alert" class="flex flex-col items-center gap-2.5 rounded-box border border-[var(--cairn-error-border)] bg-[var(--cairn-error-tint)] p-4 text-center">
          <TriangleAlertIcon class="h-6 w-6 text-[var(--cairn-error-ink)]" aria-hidden="true" />
          <span class="type-meta text-[var(--cairn-error-ink)]">{uploadStatus.message}</span>
          <button type="button" class="btn btn-sm" onclick={uploadStatus.retry}>Try another file</button>
        </div>
      {:else if uploadStatus.kind === 'working'}
        <div role="status" class="flex flex-col items-center gap-2 rounded-box border border-dashed border-[var(--cairn-card-border)] bg-base-100 p-5 text-center text-muted">
          <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
          <span class="type-meta">Uploading…</span>
        </div>
      {:else}
        <MediaCaptureCard file={uploadCaptureFile} oncapture={runLibraryUpload} submitLabel="Upload image" />
      {/if}
    </div>
  {/if}
</dialog>
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
