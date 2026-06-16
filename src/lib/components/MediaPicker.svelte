<!--
@component
The combobox picker over the site's committed media library, read-only. The host (Task 6's insert
popover) passes the projected library in as a prop and receives the chosen asset through onselect,
which hands back the asset entry, its media: reference token, and the manifest alt to prefill the
placement.

This is a real WAI-ARIA combobox over a listbox: focus stays in the search input at all times, and
aria-activedescendant moves the active option through arrow keys. The input never loses DOM focus
during navigation, so a screen reader follows the active row through the input's owned listbox
rather than a roving tabindex. Two separate aria-live regions report the results count and narrate
the active row, so one announcement never clobbers the other.

Each row carries a decorative thumbnail (the bare delivery path under transformations: false), the
display name, and a needs-alt flag (a glyph plus a label, never hue alone) when the asset's alt is
empty. Search filters across the display name and the alt, case-insensitive.

The media-type facet (Images, Documents) is a designed-in seam: it renders only once the library
holds more than one distinct top-level content type, so the structure is present without dead UI
while a site stores images only.
-->
<script module lang="ts">
  // The picker's library entry is the shared node-safe projection (../media/library-entry), not a
  // type from editor-media.ts: importing that module would pull CodeMirror into a bundle, which the
  // editor-boundary test bars. Re-exported so the insert popover keeps importing it from here.
  import type { MediaLibraryEntry } from '../media/library-entry.js';
  export type { MediaLibraryEntry };

  /** The picked asset the picker emits to its host: the library entry, its media: reference token,
   *  and the manifest alt to prefill the placement. */
  export interface MediaSelection {
    /** The chosen library entry. */
    entry: MediaLibraryEntry;
    /** The media: reference token (`media:<slug>.<hash>`) to commit at the caret. */
    ref: string;
    /** The asset's manifest alt, prefilling the placement; empty means the placement needs alt. */
    alt: string;
  }
</script>

<script lang="ts">
  import { mediaToken } from '../media/reference.js';
  // The bare delivery path under transformations: false (the same path the Task 3 source chip uses).
  // SEAM: when transformations are on, the row thumbnail should request the `thumb` preset URL
  // instead of the bare path; that is a later transformations-on refinement.
  import { publicPath } from '../media/naming.js';

  interface Props {
    /** The committed media library projection, keyed by the 16-hex content hash. */
    library: Record<string, MediaLibraryEntry>;
    /** Emit the chosen asset to the host: the entry, its media: reference, and the manifest alt. */
    onselect: (selection: MediaSelection) => void;
  }

  let { library, onselect }: Props = $props();

  // A stable id base so the listbox and each option carry unique ids the combobox can point at.
  const idBase = `cairn-mp-${Math.random().toString(36).slice(2, 9)}`;
  const listboxId = `${idBase}-listbox`;

  let query = $state('');
  // The media-type facet selection: 'all' or a top-level content type ('image', 'application').
  let typeFilter = $state<string>('all');
  // The index of the active option within the filtered list, or -1 for none active yet.
  let activeIndex = $state(-1);

  const entries = $derived(Object.values(library));

  // The distinct top-level content types in the library, in first-seen order. The facet is a seam:
  // it renders only when more than one distinct type exists, so a site storing images only sees no
  // dead UI. ('image/webp' and 'image/png' both fold to 'image'.)
  const distinctTypes = $derived.by(() => {
    const seen: string[] = [];
    for (const e of entries) {
      const top = e.contentType.split('/')[0] ?? '';
      if (top && !seen.includes(top)) seen.push(top);
    }
    return seen;
  });
  const showFacet = $derived(distinctTypes.length > 1);

  /** The label for a top-level content type, for the facet chips. */
  function typeLabel(top: string): string {
    if (top === 'image') return 'Images';
    if (top === 'application') return 'Documents';
    return top.charAt(0).toUpperCase() + top.slice(1);
  }

  // The filtered, displayed options: the type facet first, then a case-insensitive substring match
  // across the display name and the alt. Order follows the library's insertion order.
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== 'all' && (e.contentType.split('/')[0] ?? '') !== typeFilter) return false;
      if (!q) return true;
      return (
        e.displayName.toLowerCase().includes(q) || e.alt.toLowerCase().includes(q)
      );
    });
  });

  // Keep the active index in range as the filtered list narrows; a filter that drops the active row
  // clears the active descendant rather than pointing at a gone option.
  $effect(() => {
    if (activeIndex >= filtered.length) activeIndex = filtered.length === 0 ? -1 : filtered.length - 1;
  });

  /** The per-row option id, used by aria-activedescendant and the live narration. */
  function optionId(i: number): string {
    return `${idBase}-opt-${i}`;
  }

  const activeEntry = $derived(activeIndex >= 0 ? (filtered[activeIndex] ?? null) : null);
  const activeDescendant = $derived(activeEntry ? optionId(activeIndex) : undefined);

  // The active-row narration text, kept in its own live region so it never clobbers the count.
  const activeNarration = $derived(
    activeEntry
      ? `${activeEntry.displayName}${activeEntry.alt.trim() === '' ? ', needs alt text' : ''}, ${activeIndex + 1} of ${filtered.length}`
      : '',
  );

  /** Build a selection from a library entry: its media: token and its manifest alt. */
  function select(entry: MediaLibraryEntry) {
    onselect({ entry, ref: mediaToken({ slug: entry.slug, hash: entry.hash }), alt: entry.alt });
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      // Clamp at the last option (a deliberate non-wrap, fine per the task).
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length === 0) return;
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Home') {
      if (filtered.length === 0) return;
      e.preventDefault();
      activeIndex = 0;
    } else if (e.key === 'End') {
      if (filtered.length === 0) return;
      e.preventDefault();
      activeIndex = filtered.length - 1;
    } else if (e.key === 'Enter') {
      if (activeEntry) {
        e.preventDefault();
        select(activeEntry);
      }
    }
    // Escape is handled by the host popover (Task 6); let it bubble.
  }
</script>

<div class="flex flex-col gap-3">
  <!-- The media-type facet: a designed-in seam, rendered only past one distinct stored type. -->
  {#if showFacet}
    <div data-testid="cairn-mp-facet" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by type">
      <button
        type="button"
        class="btn btn-xs {typeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}"
        aria-pressed={typeFilter === 'all'}
        onclick={() => (typeFilter = 'all')}>All</button>
      {#each distinctTypes as top (top)}
        <button
          type="button"
          class="btn btn-xs {typeFilter === top ? 'btn-primary' : 'btn-ghost'}"
          aria-pressed={typeFilter === top}
          onclick={() => (typeFilter = top)}>{typeLabel(top)}</button>
      {/each}
    </div>
  {/if}

  <!-- The combobox: focus stays in this input; aria-activedescendant tracks the active option. -->
  <div class="flex items-center gap-2 rounded-field border border-[var(--cairn-card-border)] bg-base-100 px-3 py-2">
    <svg class="ec-glyph h-4 w-4 text-[var(--color-muted)]" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.7 218.3 179.6 168.2A92.2 92.2 0 1 0 168.2 179.6l50.1 50.1a8 8 0 0 0 11.4-11.4ZM40 112a72 72 0 1 1 72 72 72.1 72.1 0 0 1-72-72Z" /></svg>
    <input
      bind:value={query}
      onkeydown={onKeydown}
      type="text"
      role="combobox"
      class="w-full border-0 bg-transparent p-0 text-sm outline-hidden placeholder:text-[var(--color-muted)]"
      placeholder="Search the media library"
      aria-label="Search the media library"
      aria-expanded="true"
      aria-controls={listboxId}
      aria-activedescendant={activeDescendant}
      autocomplete="off"
      spellcheck="false"
    />
  </div>

  <!-- The count region: polite, separate from the active-row narration so neither clobbers the other. -->
  <p class="sr-only" role="status" aria-live="polite">
    {filtered.length} {filtered.length === 1 ? 'image' : 'images'}
  </p>
  <!-- The active-row narration, its own polite region. -->
  <p class="sr-only" aria-live="polite">{activeNarration}</p>

  {#if filtered.length === 0}
    <div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p class="text-sm text-[var(--color-muted)]">
        {#if entries.length === 0}
          No images in the library yet.
        {:else}
          Nothing matches <span class="font-medium text-base-content">"{query.trim()}"</span>.
        {/if}
      </p>
    </div>
  {:else}
    <!-- The listbox: real role="option" children, the active one aria-selected. The whole listbox is
         the input's owned popup, so a click on a row selects without moving focus out of the input. -->
    <ul id={listboxId} role="listbox" aria-label="Media library" class="flex max-h-72 flex-col gap-0.5 overflow-auto p-0">
      {#each filtered as entry, i (entry.hash)}
        <!-- A listbox option carries no keyboard handler of its own: in the ARIA combobox pattern the
             keyboard model lives on the input (arrows move aria-activedescendant, Enter selects), and
             focus never leaves the input. The click handler is the pointer path to the same select. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={optionId(i)}
          role="option"
          aria-selected={i === activeIndex}
          class="flex cursor-pointer items-start gap-3 rounded-field px-2 py-2 {i === activeIndex
            ? 'bg-base-content/[0.08]'
            : 'hover:bg-base-content/[0.04]'}"
          onclick={() => select(entry)}
        >
          <img
            src={publicPath(entry.slug, entry.hash, entry.ext, 'slug')}
            alt=""
            aria-hidden="true"
            class="h-10 w-10 flex-none rounded-box border border-[var(--cairn-card-border)] object-cover"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-sm font-medium">{entry.displayName || entry.slug || entry.hash}</span>
            {#if entry.alt.trim() === ''}
              <!-- The needs-alt flag: a glyph plus a label, never hue alone (the spec a11y rule),
                   matching the Task 3 source-chip treatment. -->
              <span class="inline-flex items-center gap-1 text-xs font-medium text-warning">
                <span aria-hidden="true">&#9888;</span>
                <span>Needs alt</span>
              </span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
