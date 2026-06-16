<!--
@component
The at-caret media insert popover: the single entry point for placing an image. It composes the
capture card (MediaCaptureCard) and the combobox picker (MediaPicker), routes by the opening signal,
and drives the optimistic upload loop.

Routing (locked decision 4): open('capture', file) goes straight to the capture card with the bytes
in hand (the paste and drag path); open('chooser') leads with the upload drop zone and choose-file as
the persistent primary, with the picker below under "or reuse an image" (the toolbar-button path).

The optimistic loop: on a capture record the popover lands a placeholder at the caret (a local object
URL, so the author sees the image at once), runs ingestFile then buildUploadRequest then sendUpload,
and on the success envelope swaps the placeholder for the committed ![alt](media:slug.hash) text. A
dedup result still inserts but notes "Reused an existing image"; a typed failure cancels the
placeholder and shows the card with a Retry; an opaque or status-0 response is a session-expired
signal. The placeholder is a widget, never doc text, so a failed or expired upload leaves the source
exactly as it was (open risk 2).

The popover is headless by default (trigger=false): the host opens it through the exported open(). It
moves focus in on open, traps Tab, and restores focus to the editor on close or Escape through
editor.focusEditor() (the selection is intact, since opening only blurred the editor). Below the
narrow breakpoint it falls back to a full-height bottom sheet (the admin design system's modal-sizing
rule). The CSRF token is read from the admin context.
-->
<script lang="ts">
  import { getContext, tick } from 'svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import MediaCaptureCard from './MediaCaptureCard.svelte';
  import MediaPicker, { type MediaLibraryEntry, type MediaSelection } from './MediaPicker.svelte';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    type IngestFailureCard,
  } from './client-ingest.js';
  import { deserialize } from '$app/forms';
  import { uploadOutcome, type UploadEnvelope, type UploadFailureKind } from './media-upload-outcome.js';
  import type { MediaEntry } from '../media/manifest.js';

  // The placeholder api type is referenced inline (import('...').Type), never a static
  // `import type ... from`, so no static edge to the dynamically-imported editor-placeholder module
  // sits in this client component (the editor-boundary test bars that edge by a textual `from` scan).
  type ImagePlaceholderApi = import('./editor-placeholder.js').ImagePlaceholderApi;

  /** The record the capture card emits, the same shape MediaCaptureCard.oncapture carries. */
  interface CaptureRecord {
    file: File;
    displayName: string;
    alt: string;
    decorative: boolean;
  }

  interface Props {
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** The merged committed-plus-uploaded media library, keyed by content hash, for the picker. */
    library: Record<string, MediaLibraryEntry>;
    /** The editor seams the popover drives: caret anchoring, focus restore, the placeholder api, and
     *  the direct-insert path for a picked image (no upload). */
    editor: {
      caretCoords: () => { left: number; right: number; top: number; bottom: number } | null;
      focusEditor: () => void;
      placeholders: ImagePlaceholderApi;
      insertImage: (alt: string, ref: string) => void;
    };
    /** Called with the server-owned record on a successful upload; the host appends it to its records
     *  state and merges it into the library so the source decoration resolves the new reference. */
    onuploaded: (record: MediaEntry) => void;
    /** Render the built-in trigger button. False (the default) mounts headless; the host opens the
     *  popover through the exported open(). */
    trigger?: boolean;
  }

  let { conceptId, id, library, editor, onuploaded, trigger = false }: Props = $props();

  // The CSRF token getter from the admin context (AdminLayout provides it). Undefined outside the
  // shell, where the empty token fails the guard's check, the intended fail-closed signal.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  // The view the popover shows. 'capture' is the one-step card with bytes in hand; 'chooser' leads
  // with upload and the picker; null is closed.
  type View = 'capture' | 'chooser';
  let view = $state<View | null>(null);
  let captureFile = $state<File | null>(null);

  // The transient status of the in-flight or failed loop, surfaced under the active view. 'reused'
  // briefly notes a dedup collapse; the failure and expired states carry a message and a retry.
  type Status =
    | { kind: 'idle' }
    | { kind: 'reused' }
    | { kind: 'failed'; card: IngestFailureCard | { status: 'failed'; kind: UploadFailureKind; message: string }; retry: () => void }
    | { kind: 'expired' };
  let status = $state<Status>({ kind: 'idle' });

  // The anchor coordinates captured on open, so the popover positions at the caret even after focus
  // leaves the editor. Null falls back to a centered position.
  let anchor = $state<{ left: number; right: number; top: number; bottom: number } | null>(null);
  let panel = $state<HTMLDivElement | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);

  /**
   * Open the popover. 'capture' with a file goes straight to the capture card (paste/drag); 'chooser'
   * leads with the upload zone and the picker (the toolbar button). Anchors to the caret and moves
   * focus in.
   */
  export function open(signal: 'chooser' | 'capture', file?: File): void {
    anchor = editor.caretCoords();
    status = { kind: 'idle' };
    if (signal === 'capture' && file) {
      captureFile = file;
      view = 'capture';
    } else {
      captureFile = null;
      view = 'chooser';
    }
    // Move focus into the panel once it renders.
    void tick().then(() => panel?.focus());
  }

  function close() {
    view = null;
    captureFile = null;
    status = { kind: 'idle' };
    editor.focusEditor();
  }

  // Trap Tab within the panel and close on Escape, restoring focus to the editor.
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab' || !panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || activeEl === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // The picker path: a picked asset inserts its reference directly at the caret with no upload, then
  // the popover closes. This is the reuse-an-existing path.
  function onPick(sel: MediaSelection) {
    editor.insertImage(sel.alt, sel.ref);
    close();
  }

  // A chosen file (the choose-file fallback in the chooser) routes to the capture card, the same one
  // a paste or drag opens, so every byte path runs the one capture-then-upload flow.
  function onChosenFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      captureFile = file;
      view = 'capture';
      status = { kind: 'idle' };
    }
  }

  // The optimistic upload loop, on a capture-card record. It lands a placeholder, runs the ingest and
  // upload, and resolves the placeholder to the committed reference or cancels it on any failure, so
  // the source is never left with a half-written token.
  async function runUpload(record: CaptureRecord) {
    const objectUrl = URL.createObjectURL(record.file);
    const pid = editor.placeholders.begin(objectUrl);
    // Close the byte-capture view now; the placeholder carries the progress in the source.
    view = null;
    captureFile = null;

    const fail = (
      card: IngestFailureCard | { status: 'failed'; kind: UploadFailureKind; message: string },
    ) => {
      editor.placeholders.cancel(pid);
      URL.revokeObjectURL(objectUrl);
      status = { kind: 'failed', card, retry: () => void runUpload(record) };
    };

    // Stage progress, not real byte counts: fetch cannot report upload bytes, so the bar reads the
    // ingest/upload LIFECYCLE (begin ~0.1 set by the field, ingesting ~0.4, uploading ~0.85, resolve
    // clears it). Honest stage progress, never a fabricated timer.
    editor.placeholders.progress(pid, 0.4);
    let ingested: Awaited<ReturnType<typeof ingestFile>>;
    try {
      ingested = await ingestFile(record.file);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)));
      return;
    }

    editor.placeholders.progress(pid, 0.85);
    const { url, init } = buildUploadRequest({
      conceptId,
      id,
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
      res = await sendUpload(url, init);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)));
      return;
    }

    // The guard's expired-session 303 under redirect: 'manual' surfaces as an opaque, status-0
    // response; treat it as session-expired before parsing a body that is not there.
    if (res.type === 'opaqueredirect' || res.status === 0) {
      editor.placeholders.cancel(pid);
      URL.revokeObjectURL(objectUrl);
      status = { kind: 'expired' };
      return;
    }

    // deserialize returns the generic ActionResult; the upload action's success data is an
    // UploadResult and its failure data carries an error string, so the result matches UploadEnvelope.
    // The cast names that known shape for the pure mapper (the redirect/status-0 case is handled above).
    // An unexpected server response (a 500/502/504 from a worker crash, OOM, or an edge timeout) is an
    // HTML error page, not a devalue-encoded result, so deserialize throws. Catch it and route the
    // throw through fail() with the generic card, so the placeholder cancels and a Retry is offered.
    let outcome: ReturnType<typeof uploadOutcome>;
    try {
      outcome = uploadOutcome(deserialize(await res.text()) as UploadEnvelope);
    } catch {
      fail({ status: 'failed', kind: 'generic', message: GENERIC_FAILURE_MESSAGE });
      return;
    }
    if (outcome.kind === 'session-expired') {
      editor.placeholders.cancel(pid);
      URL.revokeObjectURL(objectUrl);
      status = { kind: 'expired' };
      return;
    }
    if (outcome.kind === 'failed') {
      // An ingest-taxonomy kind reuses failureCard's own message; the envelope-only `generic` kind
      // carries its own plain message. Either way the card shows the message with a Retry.
      fail(
        outcome.failure === 'generic'
          ? { status: 'failed', kind: 'generic', message: GENERIC_FAILURE_MESSAGE }
          : failureCard(outcome.failure),
      );
      return;
    }

    // Success: swap the placeholder for the committed reference in one transaction, hand the record
    // up, and close. A dedup reuse still inserts the existing reference (the decision) and briefly
    // notes it.
    editor.placeholders.resolveTo(pid, record.alt, outcome.reference);
    onuploaded(outcome.record);
    URL.revokeObjectURL(objectUrl);
    if (outcome.reused) {
      status = { kind: 'reused' };
    } else {
      close();
    }
  }

  // The author-facing message for an envelope-only generic refusal (a binding-missing, a csrf, a
  // length-required: operational refusals with no author-actionable specifics). The ingest-taxonomy
  // kinds carry their own messages through failureCard.
  const GENERIC_FAILURE_MESSAGE = 'The upload could not be completed. Please try again.';

  // The popover's anchored position: just below the caret line, clamped into the viewport. A null
  // anchor centers it. The full-height sheet at the narrow breakpoint is the CSS fallback.
  const positionStyle = $derived(
    anchor
      ? `left: ${Math.max(8, Math.min(anchor.left, (typeof window !== 'undefined' ? window.innerWidth : 1024) - 360))}px; top: ${anchor.bottom + 6}px;`
      : 'left: 50%; top: 4rem; transform: translateX(-50%);',
  );
</script>

{#if trigger}
  <button
    type="button"
    class="btn btn-sm btn-ghost"
    aria-haspopup="dialog"
    aria-label="Insert image"
    onclick={() => open('chooser')}
  >
    Insert image
  </button>
{/if}

{#if view !== null || status.kind === 'failed' || status.kind === 'expired' || status.kind === 'reused'}
  <!-- The light-dismiss backdrop: a click outside closes a non-destructive popover. A real button so
       it carries a role and a keyboard activation; tabindex -1 keeps it out of the focus trap, and
       Escape on the panel is the keyboard dismiss. -->
  <button
    type="button"
    class="cairn-media-popover-backdrop"
    tabindex="-1"
    aria-label="Close"
    onclick={close}
  ></button>
  <div
    bind:this={panel}
    class="cairn-media-popover"
    style={positionStyle}
    role="dialog"
    aria-modal="true"
    aria-label="Insert image"
    tabindex="-1"
    onkeydown={onKeydown}
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <h2 class="text-sm font-semibold">Insert image</h2>
      <button type="button" class="btn btn-ghost btn-xs" aria-label="Close" onclick={close}>✕</button>
    </div>

    {#if status.kind === 'expired'}
      <div class="flex flex-col gap-2" data-testid="cairn-media-expired">
        <p class="text-sm">Your session has expired. Please sign in again to add an image.</p>
        <div class="flex justify-end">
          <button type="button" class="btn btn-sm" onclick={close}>Close</button>
        </div>
      </div>
    {:else if status.kind === 'failed'}
      <div class="flex flex-col gap-2" data-testid="cairn-media-failed">
        <p class="text-sm">{status.card.message}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost btn-sm" onclick={close}>Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick={status.retry}>Retry</button>
        </div>
      </div>
    {:else if status.kind === 'reused'}
      <div class="flex flex-col gap-2" data-testid="cairn-media-reused">
        <p class="text-sm">Reused an existing image.</p>
        <div class="flex justify-end">
          <button type="button" class="btn btn-primary btn-sm" onclick={close}>Done</button>
        </div>
      </div>
    {:else if view === 'capture' && captureFile}
      <MediaCaptureCard file={captureFile} oncapture={runUpload} />
    {:else if view === 'chooser'}
      <div class="flex flex-col gap-3">
        <!-- Upload-first: the persistent primary path. -->
        <div class="flex flex-col gap-1">
          <button
            type="button"
            class="btn btn-primary btn-sm w-full"
            onclick={() => fileInput?.click()}
          >
            Upload an image
          </button>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/*"
            class="sr-only"
            aria-label="Choose an image to upload"
            onchange={onChosenFile}
          />
        </div>
        <p class="text-center text-xs text-[var(--color-muted)]">or reuse an image</p>
        <MediaPicker {library} onselect={onPick} />
      </div>
    {/if}
  </div>
{/if}

<style>
  .cairn-media-popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .cairn-media-popover {
    position: fixed;
    z-index: 41;
    width: 22rem;
    max-width: calc(100vw - 1rem);
    max-height: min(28rem, 80vh);
    overflow: auto;
    border-radius: var(--radius-box, 0.75rem);
    border: 1px solid var(--cairn-card-border, oklch(90% 0.01 75));
    background: var(--color-base-100, white);
    padding: 0.875rem;
    /* The theme-adaptive elevation var, not a fixed shadow: in light the soft shadow carries the
       lift, in dark the hairline border defines the panel where a shadow barely shows. */
    box-shadow: var(--cairn-shadow, 0 12px 32px -8px oklch(0% 0 0 / 0.25));
  }
  /* Below the narrow breakpoint the popover becomes a full-height bottom sheet (the design system's
     modal-sizing rule: filling the height is correct only on a small viewport). */
  @media (max-width: 640px) {
    .cairn-media-popover {
      left: 0 !important;
      right: 0;
      top: auto !important;
      bottom: 0;
      transform: none !important;
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
      border-radius: var(--radius-box, 0.75rem) var(--radius-box, 0.75rem) 0 0;
    }
  }
</style>
