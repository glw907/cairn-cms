<!--
@component
The one-step capture card for a media insert. Shown when an author already has bytes in hand (a
paste, a drop, or a chosen file), it captures three things and emits them to its host: the file, an
editable display name, and the alt text. It is a presentational form card, not a dialog of its own;
Task 6's insert popover hosts it.

The display name pre-fills from proposedNameFor(file.name): a real specific stem (blue-shoes.png)
arrives as a Suggested value, while a generic camera stem (IMG_4821.jpg) leaves the field empty and
required with no tag, so the author never accepts machine noise.

Alt is a real role="radiogroup" of two radios: write a description, or mark decorative. The
requirement is surfaced through aria-describedby, never by disabling the submit. Insert is never
disabled (the locked no-skipped-disabled-reason rule); an author may proceed with alt unset and the
emitted record carries an empty alt, which the host treats as needs-alt debt. A decorative choice
also resolves alt to the empty string. The committed reference keys off an empty alt as the
needs-alt signal, so the emitted record uses an empty alt string for both the decorative and the
left-blank cases, and a separate decorative flag distinguishes them for the host.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { proposedNameFor } from './client-ingest.js';

  /** The record the card emits to its host on insert. */
  interface CaptureRecord {
    /** The image bytes the author is placing. */
    file: File;
    /** The editable display name, the proposed stem or the author's edit. */
    displayName: string;
    /** The alt text. Empty for a decorative image or for an author who proceeded without alt; the
     *  host commits an empty alt as the needs-alt signal in the `![](media:...)` reference. */
    alt: string;
    /** True when the author marked the image decorative, distinguishing a deliberate empty alt from
     *  a left-blank one. The committed alt is empty either way. */
    decorative: boolean;
  }

  interface Props {
    /** The image to capture; the card previews it from a local object URL. */
    file: File;
    /** Emit the captured record to the host on insert. */
    oncapture: (record: CaptureRecord) => void;
  }

  let { file, oncapture }: Props = $props();

  // The proposed display name for this file, computed once. A real stem pre-fills the field and shows
  // the Suggested tag; a generic stem yields null, leaving the field empty, required, and untagged.
  const proposed = $derived(proposedNameFor(file.name));
  // Seeded once from the file the card opened with; untrack marks it a deliberate one-time read, not
  // a reactive miss. The card lives for one file, so a later file swap is out of scope.
  let displayName = $state(untrack(() => proposedNameFor(file.name) ?? ''));

  // The alt mode: unset until the author picks one, then 'describe' or 'decorative'. Unset emits an
  // empty alt (needs-alt debt); insert never blocks on it.
  let altMode = $state<'describe' | 'decorative' | null>(null);
  let altText = $state('');

  // A local object URL for the preview, revoked on destroy so the blob does not leak.
  const previewUrl = $derived(URL.createObjectURL(file));
  $effect(() => {
    const url = previewUrl;
    return () => URL.revokeObjectURL(url);
  });

  function submit(e: SubmitEvent) {
    e.preventDefault();
    // Decorative and write-but-blank both commit an empty alt; the decorative flag distinguishes
    // them for the host. A described image carries the trimmed alt text.
    const alt = altMode === 'describe' ? altText.trim() : '';
    oncapture({ file, displayName: displayName.trim(), alt, decorative: altMode === 'decorative' });
  }
</script>

<form class="flex flex-col gap-4" onsubmit={submit}>
  <div class="flex items-start gap-3">
    <img
      src={previewUrl}
      alt=""
      class="h-16 w-16 flex-none rounded-box border border-[var(--cairn-card-border)] object-cover"
    />
    <label class="flex flex-1 flex-col gap-1">
      <span class="flex items-center gap-2 text-sm font-medium">
        Name
        {#if proposed !== null}
          <span class="badge badge-ghost badge-sm">Suggested</span>
        {/if}
      </span>
      <input
        class="input w-full"
        aria-required={proposed === null ? 'true' : undefined}
        placeholder="What is this image?"
        bind:value={displayName}
      />
    </label>
  </div>

  <fieldset
    class="flex flex-col gap-2"
    role="radiogroup"
    aria-label="Alt text"
    aria-required="true"
    aria-describedby="cairn-capture-alt-note"
  >
    <legend class="text-sm font-medium">Alt text</legend>
    <p id="cairn-capture-alt-note" class="text-xs text-[var(--color-muted)]">
      Describe the image for screen readers, or mark it decorative. You can insert without alt text
      and add it later.
    </p>
    <label class="flex cursor-pointer items-center gap-2">
      <input type="radio" class="radio radio-sm" name="cairn-capture-alt" value="describe" bind:group={altMode} />
      <span class="text-sm">Write a description</span>
    </label>
    {#if altMode === 'describe'}
      <input
        class="input input-sm ml-6 w-[calc(100%-1.5rem)]"
        aria-label="Alt text description"
        placeholder="A short description"
        bind:value={altText}
      />
    {/if}
    <label class="flex cursor-pointer items-center gap-2">
      <input type="radio" class="radio radio-sm" name="cairn-capture-alt" value="decorative" bind:group={altMode} />
      <span class="text-sm">Mark as decorative</span>
    </label>
  </fieldset>

  <div class="flex justify-end">
    <button type="submit" class="btn btn-sm btn-primary">Insert image</button>
  </div>
</form>
