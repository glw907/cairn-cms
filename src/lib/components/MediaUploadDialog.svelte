<!--
@component
The Media Library's upload dialog: a standard modal `<dialog>`, NO light dismiss (no
`method="dialog"` backdrop form, matching the Replace/Alt siblings): a backdrop click does
nothing, and only Escape or the Cancel button closes it. It hosts `MediaCaptureCard` on a
chosen or dropped file; a typed ingest/upload failure or an expired session shows the Replace
flow's retry-card treatment without losing the file. It relies on the native `<dialog>` role
and `aria-labelledby`, with no redundant role or `aria-modal`, matching the Push-alt and
orphan-scan dialogs.

Three trigger sites open it: the host's header and empty-state Upload buttons call the
exported `openUpload(origin)`, which opens the native file chooser through a hidden input
owned here; the page-wide drop target is the third, reached through the exported
`onPageDragover`/`onPageDrop`, which the host wires onto its own `<svelte:window>` (the
Library has no single drop element, so the handlers live at the window level). All three
converge on the same capture step once a file is in hand. The upload posts to the
media-scoped `?/mediaLibraryUpload` action, which stores and commits in one step; on success
the dialog closes and the host navigates to the flash-carrying URL so the loader re-runs and
the new asset appears.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { deserialize } from '$app/forms';
  import { goto } from '$app/navigation';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    firstImageFile,
    guardDropTarget,
  } from './client-ingest.js';
  import { uploadOutcome, type UploadEnvelope } from './media-upload-outcome.js';
  import { resolveDialogOrigin, refocusDialogOrigin } from './dialog-origin.js';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import MediaCaptureCard from './MediaCaptureCard.svelte';
  import { UploadIcon, XIcon, TriangleAlertIcon } from './admin-icons.js';

  // The CSRF token getter comes from the admin context, re-fetched independently of the host
  // (the Replace/Alt-fill sibling recipe).
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  const GENERIC_UPLOAD_MESSAGE = 'The upload could not be completed. Please try again.';
  // The media-scoped upload action URL, relative to /admin/media. The Library has no entry to
  // upload into, so it targets the library-scoped action rather than the entry-scoped ?/upload.
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
  // Escape (the dialog's cancel event) must not abandon an in-flight upload: while the file is being
  // ingested and sent the close is suppressed, matching MediaBulkDeleteDialog's onBulkCancel and
  // MediaOrphanTools' onOrphanCancel; in every other status Escape closes normally.
  function onLibraryCancel(e: Event) {
    if (uploadStatus.kind === 'working') {
      e.preventDefault();
      return;
    }
    closeLibraryUpload();
  }
  /** Open the native file chooser through the hidden input, called by the header and empty-state
   *  Upload buttons. A programmatic .click() does not focus its target, so the origin is captured
   *  explicitly by the caller and passed here, exactly as MediaReplaceDialog's open() does. */
  export function openUpload(origin?: HTMLElement | null) {
    uploadOrigin = origin ?? null;
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
  // handlers are exported for the host's own <svelte:window> rather than bound to one element here.
  // They stand down while this capture dialog or any other dialog is already open, so a drop never
  // fights with an in-progress upload.
  function libraryDropBusy(): boolean {
    // Deliberately DOCUMENT-scoped: drag-drop should stand down for ANY open dialog anywhere on the
    // page, the admin shell's command palette included, since dropping a file while an unrelated
    // dialog covers the screen would stack the capture dialog behind it. CairnMediaLibrary's own
    // Escape handling (onWindowKeydown) makes the opposite call for a different question (a foreign
    // dialog must never steal Escape from the library), so the two checks land on different scopes
    // on purpose; see that function's comment for that half of the split. Testing for the open
    // attribute directly stays correct as dialogs are added, unlike enumerating them by name.
    return document.querySelector('dialog[open]') !== null;
  }
  /** The page-wide dragover handler; the host wires this onto its own `<svelte:window>`. */
  export function onPageDragover(e: DragEvent) {
    if (libraryDropBusy()) return;
    // dataTransfer.files is empty during dragover (the HTML DnD spec's protected mode), so
    // firstImageFile(...) never matches here; only dataTransfer.types is readable at this stage.
    // Gate on the 'Files' type instead, so preventDefault actually runs and the window becomes a
    // valid drop target (without it, drop never fires and the browser navigates to the raw file).
    if (e.dataTransfer?.types.includes('Files')) guardDropTarget(e);
  }
  /** The page-wide drop handler; the host wires this onto its own `<svelte:window>`. */
  export function onPageDrop(e: DragEvent) {
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
</script>

<!-- The hidden file input behind both Upload buttons and this shared capture dialog. -->
<input
  bind:this={uploadFileInput}
  type="file"
  accept="image/*"
  class="sr-only"
  aria-label="Upload an image"
  tabindex="-1"
  aria-hidden="true"
  onchange={onUploadFileChosen}
/>

<dialog
  bind:this={uploadDialog}
  data-testid="cairn-library-upload-dialog"
  class="modal"
  aria-labelledby="cairn-ml-upload-title"
  aria-describedby="cairn-ml-upload-sub"
  oncancel={onLibraryCancel}
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
