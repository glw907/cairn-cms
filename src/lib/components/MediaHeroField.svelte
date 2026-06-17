<!--
@component
The hero image frontmatter field: the persistent details-panel field that sets a concept's lead
picture, the one image that both leads the page and becomes the social card. It edits the structured
value `{ src, alt, caption }` and writes it to three hidden form inputs the save path's decode arm
reads. cairn stays markdown-first, so this is a structured-data form field, never a WYSIWYG canvas.

The field renders inside the edit form (the EditPage details loop). A nested <form> would break SSR,
so the field carries no <form> of its own: the working inputs in the dialog (the alt input, the
caption input) carry no name and never submit, and the committed value rides three named hidden
inputs (`<name>.src`, `<name>.alt`, `<name>.caption`). "Use this image" copies the dialog's working
state into those hidden inputs; the form's own Save commits them.

At rest, when a hero is set, the field is one row at sibling weight: the resolved thumbnail, the
display name, an alt-status chip (Described, Needs alt, or Decorative, each a glyph plus a label,
never hue alone), and an Edit control, with the caption shown beneath as a read-only preview. Empty,
it is a slim labeled dropzone plus one plain line stating the image is also the social card; a real
drag-and-drop onto the dropzone routes a dropped image to the upload path.

Editing opens a native <dialog class="modal"> (the admin Dialog recipe: native focus trap and
Escape). Two views live inside it: the chooser (an upload-first button plus the MediaPicker combobox
below) and the placement view (a 16:9 crop preview, the describe-or-decorative alt radiogroup, the
caption input, and Replace/Remove as quiet text controls). The dialog reuses MediaPicker directly and
replicates MediaCaptureCard's alt radiogroup model rather than mounting MediaCaptureCard (which holds
its own <form>, illegal nested here, and a Name field a hero has no use for). Alt is debt, never a
save block; a decorative hero resolves alt to the empty string. The upload path mirrors the insert
popover's runUpload but resolves to this field, not an editor placeholder.
-->
<script lang="ts">
  import { getContext, tick, untrack } from 'svelte';
  import { CSRF_CONTEXT_KEY } from './csrf-context.js';
  import MediaPicker, { type MediaLibraryEntry, type MediaSelection } from './MediaPicker.svelte';
  import {
    ingestFile,
    buildUploadRequest,
    sendUpload,
    ingestFailureKind,
    failureCard,
    proposedNameFor,
    firstImageFile,
  } from './client-ingest.js';
  import { deserialize } from '$app/forms';
  import { uploadOutcome, type UploadEnvelope } from './media-upload-outcome.js';
  import { parseMediaToken } from '../media/reference.js';
  import { publicPath } from '../media/naming.js';
  import type { MediaEntry } from '../media/manifest.js';

  interface Props {
    /** The field descriptor: the form input name base and the visible label. */
    field: { name: string; label: string };
    /** The initial committed value, from `data.frontmatter[field.name]`. */
    value?: { src: string; alt: string; caption?: string };
    /** Whether the initial hero is an explicit decorative choice (an empty alt that is not debt).
     *  Defaults false; a fresh field with an empty alt reads as needs-alt. */
    decorative?: boolean;
    /** The merged committed-plus-uploaded media library, keyed by content hash. */
    mediaLibrary: Record<string, MediaLibraryEntry>;
    /** The concept the entry belongs to (the upload action's route param). */
    conceptId: string;
    /** The entry id (the upload action's route param). */
    id: string;
    /** Called with the server-owned record on a successful upload; the host merges it into the library
     *  and the save field, the same wiring the insert popover uses. */
    onuploaded: (record: MediaEntry) => void;
    /** Called when the committed value changes (a confirm or a remove), so the host sets fieldsDirty.
     *  The hidden-input writes do not fire the form's oninput, so the field signals dirty explicitly. */
    ondirty: () => void;
    /** Called once on mount and again whenever this hero's needs-alt status changes, with the current
     *  signal (a non-decorative hero with an empty alt is needs-alt). The host sums this with the body
     *  scanner's hits for the needs-alt notice. A frontmatter hero has no body offset, so it is
     *  reported from the field state, never routed through the body scanner. */
    onneedsaltchange?: (needsAlt: boolean) => void;
  }

  let {
    field,
    value,
    decorative: decorativeInitial = false,
    mediaLibrary,
    conceptId,
    id,
    onuploaded,
    ondirty,
    onneedsaltchange,
  }: Props = $props();

  // The CSRF token getter from the admin context (AdminLayout provides it). Undefined outside the
  // shell, where the empty token fails the guard's check, the intended fail-closed signal.
  const csrf = getContext<(() => string) | undefined>(CSRF_CONTEXT_KEY);

  // A stable id base for the dialog's labelled regions.
  const uid = $props.id();
  const titleId = `cairn-hero-title-${uid}`;
  const altNoteId = `cairn-hero-alt-note-${uid}`;

  // The committed value the hidden inputs bind to. Seeded once from the prop; "Use this image" and
  // Remove own it thereafter (untrack marks the read a deliberate one-time seed, not a reactive
  // miss). An empty src is the empty state. A save reloads the page, which remounts with the fresh
  // prop, so a later prop change is out of scope.
  let committedSrc = $state(untrack(() => value?.src ?? ''));
  let committedAlt = $state(untrack(() => value?.alt ?? ''));
  let committedCaption = $state(untrack(() => value?.caption ?? ''));
  // Whether the committed hero is an explicit decorative choice (an empty alt that is not debt).
  let committedDecorative = $state(untrack(() => decorativeInitial));

  // The resting/empty split keys off whether a src is set.
  const hasHero = $derived(committedSrc.trim() !== '');

  /** Resolve a media: src to its library entry through the content hash. Null when the token does not
   *  parse or the hash is not in the library. */
  function entryForSrc(src: string): MediaLibraryEntry | null {
    const ref = parseMediaToken(src);
    if (!ref) return null;
    return mediaLibrary[ref.hash] ?? null;
  }

  // The resting row's resolved entry, thumbnail, and display name.
  const committedEntry = $derived(hasHero ? entryForSrc(committedSrc) : null);
  const committedThumb = $derived(
    committedEntry
      ? publicPath(committedEntry.slug, committedEntry.hash, committedEntry.ext, 'slug')
      : '',
  );
  const committedName = $derived(
    committedEntry ? committedEntry.displayName || committedEntry.slug || committedEntry.hash : '',
  );

  // The resting alt-status: decorative is an explicit choice, an empty alt is needs-alt debt, and a
  // non-empty alt is described.
  type AltStatus = 'described' | 'needs-alt' | 'decorative';
  const committedStatus = $derived<AltStatus>(
    committedDecorative ? 'decorative' : committedAlt.trim() !== '' ? 'described' : 'needs-alt',
  );

  // Report this hero's needs-alt signal to the host: once on mount and again whenever the committed
  // status changes. The host sums the signal with the body scanner's hits for the needs-alt notice.
  // Only a set hero can be debt; an empty field (no src) reports false even though committedStatus
  // reads 'needs-alt' by default.
  const heroNeedsAlt = $derived(hasHero && committedStatus === 'needs-alt');
  // Report the signal on mount and on every real change, but read the callback through untrack so a
  // fresh callback identity (the host recreates the arrow on each of its own renders, which this very
  // call triggers) does not re-run the effect and loop. The effect depends only on the signal value.
  $effect(() => {
    const signal = heroNeedsAlt;
    untrack(() => onneedsaltchange?.(signal));
  });

  // ---- the dialog ----
  // The dialog element and which view it shows. 'chooser' picks or uploads; 'placement' captures alt
  // and caption for a chosen image; null means the working selection is not yet made.
  let dialog = $state<HTMLDialogElement | null>(null);
  type View = 'chooser' | 'placement';
  let view = $state<View>('chooser');

  // The working selection in the placement view: the chosen ref, its resolved thumbnail, the alt
  // mode and text, and the caption. Seeded on a pick or a successful upload, copied to the committed
  // value only on "Use this image".
  let workRef = $state('');
  let workThumb = $state('');
  let workAltMode = $state<'describe' | 'decorative' | null>(null);
  let workAltText = $state('');
  let workCaption = $state('');

  // The upload transient state, surfaced in the dialog while an uploaded file is decoded and stored.
  type Upload = { kind: 'idle' } | { kind: 'uploading' } | { kind: 'failed'; message: string; retry: () => void };
  let upload = $state<Upload>({ kind: 'idle' });

  let fileInput = $state<HTMLInputElement | null>(null);
  // The describe-mode alt text input, bound so the needs-alt remediation path (focusAlt) can land
  // the author's focus directly on it.
  let altInput = $state<HTMLInputElement | null>(null);

  /** Open the dialog to the chooser. Editing a set hero still leads with the placement view seeded
   *  from the committed value, so an author lands on the alt and caption they already wrote. */
  function openDialog(initial: View) {
    upload = { kind: 'idle' };
    if (initial === 'placement' && hasHero) {
      seedPlacementFromCommitted();
      view = 'placement';
    } else {
      view = 'chooser';
    }
    dialog?.showModal();
  }

  function closeDialog() {
    dialog?.close();
  }

  /** The needs-alt remediation path the edit page's notice row calls: open the dialog to the
   *  placement view seeded from the committed value, switch a non-decorative hero into describe mode
   *  so the alt text input renders, and land focus on it. This is the "Add alt text" action, the
   *  frontmatter counterpart to the body notice's select-range jump (a hero has no body offset, so it
   *  focuses the field's own alt input rather than a source range). */
  export async function focusAlt() {
    openDialog('placement');
    if (workAltMode !== 'decorative') {
      workAltMode = 'describe';
    }
    await tick();
    altInput?.focus();
  }

  /** Seed the placement working state from the committed value (the Edit path). */
  function seedPlacementFromCommitted() {
    workRef = committedSrc;
    workThumb = committedThumb;
    workCaption = committedCaption;
    if (committedDecorative) {
      workAltMode = 'decorative';
      workAltText = '';
    } else if (committedAlt.trim() !== '') {
      workAltMode = 'describe';
      workAltText = committedAlt;
    } else {
      workAltMode = null;
      workAltText = '';
    }
  }

  /** Seed the placement working state from a picked library asset: the ref, the resolved thumbnail,
   *  and the manifest alt prefilled into describe mode when non-empty. */
  function onPick(sel: MediaSelection) {
    workRef = sel.ref;
    workThumb = publicPath(sel.entry.slug, sel.entry.hash, sel.entry.ext, 'slug');
    workCaption = '';
    if (sel.alt.trim() !== '') {
      workAltMode = 'describe';
      workAltText = sel.alt;
    } else {
      workAltMode = null;
      workAltText = '';
    }
    upload = { kind: 'idle' };
    view = 'placement';
  }

  /** Confirm the working selection into the committed hidden inputs, mark dirty, and close. */
  function confirm() {
    committedSrc = workRef;
    committedDecorative = workAltMode === 'decorative';
    committedAlt = workAltMode === 'describe' ? workAltText.trim() : '';
    committedCaption = workCaption.trim();
    ondirty();
    closeDialog();
  }

  /** Remove the hero: clear the committed value, mark dirty, and return to the empty state. */
  function remove() {
    committedSrc = '';
    committedAlt = '';
    committedCaption = '';
    committedDecorative = false;
    ondirty();
    closeDialog();
  }

  /** Go back to the chooser to replace the working image. */
  function replace() {
    upload = { kind: 'idle' };
    view = 'chooser';
  }

  // ---- the upload path ----
  // A chosen or dropped file routes here. Unlike the insert popover there is no editor body, so no
  // placeholder and no open-risk-2 concern: the field shows a small loading state, and on success it
  // seeds the placement view from the server record (empty alt to fill in).
  async function runUpload(file: File) {
    upload = { kind: 'uploading' };
    const fail = (message: string) => {
      upload = { kind: 'failed', message, retry: () => void runUpload(file) };
    };

    let ingested: Awaited<ReturnType<typeof ingestFile>>;
    try {
      ingested = await ingestFile(file);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)).message);
      return;
    }

    const { url, init } = buildUploadRequest({
      conceptId,
      id,
      bytes: ingested.blob,
      contentType: ingested.contentType,
      csrf: csrf?.() ?? '',
      filename: file.name,
      // The hero alt is a frontmatter value set in the placement view, independent of the manifest
      // alt, so the upload carries an empty manifest alt.
      alt: '',
      displayName: proposedNameFor(file.name) ?? stem(file.name),
      width: ingested.width,
      height: ingested.height,
    });

    let res: Response;
    try {
      res = await sendUpload(url, init);
    } catch (err) {
      fail(failureCard(ingestFailureKind(err)).message);
      return;
    }

    if (res.type === 'opaqueredirect' || res.status === 0) {
      fail('Your session has expired. Please sign in again to add an image.');
      return;
    }

    let outcome: ReturnType<typeof uploadOutcome>;
    try {
      outcome = uploadOutcome(deserialize(await res.text()) as UploadEnvelope);
    } catch {
      fail('The upload could not be completed. Please try again.');
      return;
    }
    if (outcome.kind === 'session-expired') {
      fail('Your session has expired. Please sign in again to add an image.');
      return;
    }
    if (outcome.kind === 'failed') {
      fail(
        outcome.failure === 'generic'
          ? 'The upload could not be completed. Please try again.'
          : failureCard(outcome.failure).message,
      );
      return;
    }

    // Success: merge the record up so the library resolves the new reference, then land on the
    // placement view seeded from the record with an empty alt to fill in.
    onuploaded(outcome.record);
    const r = outcome.record;
    workRef = outcome.reference;
    workThumb = publicPath(r.slug, r.hash, r.ext, 'slug');
    workAltMode = null;
    workAltText = '';
    workCaption = '';
    upload = { kind: 'idle' };
    view = 'placement';
  }

  /** The filename stem (extension dropped), the fallback display name for a generic filename. */
  function stem(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return (dot === -1 ? filename : filename.slice(0, dot)).trim() || filename;
  }

  function onChosenFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void runUpload(file);
  }

  // The empty dropzone's drag-and-drop: a dropped image routes straight to the upload path, opening
  // the dialog to the loading state. preventDefault stops the browser from navigating to the file.
  function onDropzoneDrop(e: DragEvent) {
    e.preventDefault();
    const file = firstImageFile(e.dataTransfer ?? {});
    if (file) {
      view = 'chooser';
      dialog?.showModal();
      void runUpload(file);
    }
  }
  function onDropzoneDragover(e: DragEvent) {
    e.preventDefault();
  }
</script>

<div class="flex flex-col gap-1">
  {#if hasHero}
    <!-- The resting row: one row at sibling weight, then the caption preview beneath. -->
    <span class="text-sm font-medium">{field.label}</span>
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2.5">
        <img
          src={committedThumb}
          alt={committedStatus === 'decorative' ? '' : committedAlt}
          class="h-9 w-[3.25rem] flex-none rounded-field border border-[var(--cairn-card-border)] object-cover"
        />
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="truncate text-[0.8125rem] font-medium">{committedName}</span>
          {#if committedStatus === 'described'}
            <span class="inline-flex w-max items-center gap-1 text-[0.6875rem] font-medium text-[var(--color-positive-ink)]">
              <svg class="h-[0.6875rem] w-[0.6875rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span>Described</span>
            </span>
          {:else if committedStatus === 'needs-alt'}
            <span class="inline-flex w-max items-center gap-1 text-[0.6875rem] font-medium text-[var(--cairn-warning-ink)]">
              <svg class="h-[0.6875rem] w-[0.6875rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span>Needs alt</span>
            </span>
          {:else}
            <span class="inline-flex w-max items-center gap-1 text-[0.6875rem] font-medium text-[var(--color-muted)]">
              <svg class="h-[0.6875rem] w-[0.6875rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
              <span>Decorative</span>
            </span>
          {/if}
        </span>
        <button
          type="button"
          class="flex-none bg-transparent p-1 text-[0.8125rem] font-medium text-[var(--color-primary)] underline underline-offset-2"
          aria-haspopup="dialog"
          onclick={() => openDialog('placement')}
        >
          {committedStatus === 'needs-alt' ? 'Add' : 'Edit'}
        </button>
      </div>
      {#if committedCaption.trim() !== ''}
        <p class="pl-[3.875rem] text-xs italic text-[var(--color-muted)]">{committedCaption}</p>
      {:else}
        <p class="pl-[3.875rem] text-xs text-[var(--color-muted)] opacity-80">No caption</p>
      {/if}
      {#if committedStatus === 'decorative' && committedCaption.trim() !== ''}
        <!-- The one state worth a gentle note: a decorative hero with a caption. A soft inline line,
             never a block. (Defensive; the resting empty-caption branch above usually wins.) -->
        <p class="pl-[3.875rem] text-xs text-[var(--color-muted)]">
          This hero is marked decorative, so screen readers skip it; the caption still shows to everyone.
        </p>
      {/if}
    </div>
  {:else}
    <!-- The empty state: a slim labeled dropzone plus one plain unify line. -->
    <span class="text-sm font-medium">{field.label}</span>
    <button
      type="button"
      class="flex w-full items-center gap-2.5 rounded-field border border-dashed border-base-300 bg-base-100 px-3 py-2.5 text-left transition-colors hover:border-[color-mix(in_oklab,var(--color-primary)_45%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-primary)_4%,transparent)] focus-visible:border-[color-mix(in_oklab,var(--color-primary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_oklab,var(--color-primary)_70%,transparent)]"
      aria-haspopup="dialog"
      onclick={() => openDialog('chooser')}
      ondrop={onDropzoneDrop}
      ondragover={onDropzoneDragover}
    >
      <span class="flex h-7 w-7 flex-none items-center justify-center rounded-field bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]" aria-hidden="true">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
      </span>
      <span class="flex min-w-0 flex-col gap-px">
        <span class="text-[0.8125rem] font-medium">Add a hero image</span>
        <span class="text-[0.6875rem] text-[var(--color-muted)]">Drop an image here, or pick from the library</span>
      </span>
    </button>
    <p class="text-[0.6875rem] leading-snug text-[var(--color-muted)]">
      This image leads the page, and it is the picture shown when the post is shared.
    </p>
  {/if}

  <!-- The committed value rides three named hidden inputs the save path's decode arm reads. They sit
       inside the edit form (this component renders in the detailFields loop), so they submit; the
       dialog's working inputs carry no name and never submit. -->
  <input type="hidden" name="{field.name}.src" value={committedSrc} />
  <input type="hidden" name="{field.name}.alt" value={committedAlt} />
  <input type="hidden" name="{field.name}.caption" value={committedCaption} />
</div>

<!-- The edit dialog: a native modal (focus trap and Escape for free). It sits at the end of the
     component, outside the resting markup but still inside the edit form. A <dialog> is not a nested
     <form>, and its working inputs carry no name, so nothing here submits with the edit form. -->
<dialog bind:this={dialog} class="modal" aria-labelledby={titleId}>
  <div class="modal-box max-w-md">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 id={titleId} class="text-[0.9375rem] font-semibold">
        {view === 'chooser' ? 'Add a hero image' : 'Hero image'}
      </h2>
      <button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Close" onclick={closeDialog}>
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>

    {#if upload.kind === 'uploading'}
      <div class="flex flex-col items-center gap-3 py-8" role="status">
        <span class="loading loading-spinner loading-md text-[var(--color-primary)]"></span>
        <p class="text-sm text-[var(--color-muted)]">Adding your image...</p>
      </div>
    {:else if upload.kind === 'failed'}
      <div class="flex flex-col gap-2" role="alert">
        <p class="text-sm">{upload.message}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost btn-sm" onclick={replace}>Back</button>
          <button type="button" class="btn btn-primary btn-sm" onclick={upload.retry}>Retry</button>
        </div>
      </div>
    {:else if view === 'placement'}
      <div class="flex flex-col gap-3.5">
        <!-- The 16:9 crop preview: a real look at the image that leads the page and stands in as the
             social card. -->
        <div class="aspect-video w-full overflow-hidden rounded-box border border-[var(--cairn-card-border)]">
          <img src={workThumb} alt="" class="h-full w-full object-cover" />
        </div>
        <!-- Replace and Remove are quiet text controls beneath the preview, never floated on it. -->
        <div class="flex gap-3.5">
          <button type="button" class="bg-transparent p-0 text-xs font-medium text-[var(--color-primary)] underline underline-offset-2" onclick={replace}>Replace</button>
          <button type="button" class="bg-transparent p-0 text-xs font-medium text-[var(--color-muted)] underline underline-offset-2" onclick={remove}>Remove</button>
        </div>

        <!-- Alt as a describe-or-decorative radiogroup (the MediaCaptureCard model). The radios share a
             component-unique name so native radiogroup keyboard navigation (one tab stop, arrow-key
             cycling) works; the name is not one of the decode arm's three sub-fields
             (<name>.src/.alt/.caption), so it is ignored on submit and never reaches the frontmatter.
             Insert is never disabled for a missing alt. -->
        <fieldset class="flex flex-col gap-2" role="radiogroup" aria-label="Alt text" aria-describedby={altNoteId}>
          <legend class="text-sm font-medium">Alt text</legend>
          <div class="flex gap-2">
            <label class="flex flex-1 cursor-pointer items-center gap-1.5 rounded-field border px-2.5 py-1.5 text-[0.8125rem] {workAltMode === 'describe' ? 'border-[color-mix(in_oklab,var(--color-primary)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] font-semibold text-[var(--color-primary)]' : 'border-base-300'}">
              <input type="radio" class="radio radio-xs" name="cairn-hero-alt-{uid}" value="describe" bind:group={workAltMode} />
              <span>Describe it</span>
            </label>
            <label class="flex flex-1 cursor-pointer items-center gap-1.5 rounded-field border px-2.5 py-1.5 text-[0.8125rem] {workAltMode === 'decorative' ? 'border-[color-mix(in_oklab,var(--color-primary)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] font-semibold text-[var(--color-primary)]' : 'border-base-300'}">
              <input type="radio" class="radio radio-xs" name="cairn-hero-alt-{uid}" value="decorative" bind:group={workAltMode} />
              <span>Decorative</span>
            </label>
          </div>
          {#if workAltMode === 'describe'}
            <input
              bind:this={altInput}
              class="input input-sm w-full"
              aria-label="Alt text description"
              placeholder="A short description"
              bind:value={workAltText}
            />
          {/if}
          <p id={altNoteId} class="text-xs text-[var(--color-muted)]">
            A short description for screen readers. You can save without it and add it later.
          </p>
        </fieldset>

        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Caption <span class="font-normal text-[var(--color-muted)]">(optional)</span></span>
          <input class="input input-sm w-full" bind:value={workCaption} aria-label="Caption" />
          <span class="text-xs text-[var(--color-muted)]">Shown under the hero if the template uses it. This is not the alt text.</span>
        </label>

        <p class="text-[0.6875rem] leading-snug text-[var(--color-muted)]">
          This image is also the picture shown when the post is shared to social.
        </p>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost btn-sm" onclick={closeDialog}>Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" onclick={confirm}>Use this image</button>
        </div>
      </div>
    {:else}
      <!-- The chooser: upload first, the picker combobox below. -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-col items-center gap-1.5 rounded-box border border-dashed border-base-300 px-4 py-4 text-center text-[var(--color-muted)]">
          <span class="text-[var(--color-primary)]" aria-hidden="true">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
          </span>
          <span class="text-sm font-medium text-base-content">Drop an image, or upload</span>
          <span class="text-xs">PNG, JPEG, WebP, or HEIC. We convert HEIC for you.</span>
          <button type="button" class="btn btn-primary btn-sm mt-1" onclick={() => fileInput?.click()}>Choose a file</button>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/*"
            class="sr-only"
            aria-label="Choose an image to upload"
            onchange={onChosenFile}
          />
        </div>
        <p class="text-center text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--color-muted)]">or pick from the library</p>
        <MediaPicker library={mediaLibrary} onselect={onPick} />
      </div>
    {/if}
  </div>
  <!-- The light-dismiss backdrop. A bare <button>, not the DaisyUI <form method="dialog"> backdrop:
       this dialog renders inside the edit <form> (the field is in the detailFields loop), and a
       nested <form> would break SSR. tabindex -1 keeps it out of the native focus order. -->
  <button type="button" class="modal-backdrop" tabindex="-1" aria-label="Close" onclick={closeDialog}></button>
</dialog>
