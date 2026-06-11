<!--
@component
The editor's formatting toolbar: bold, italic, heading, link, bulleted list, quote, code. Each button
asks the host to apply a markdown transform to the current selection. Carta supplied this row before;
cairn owns it now so the edit surface stays swappable. The glyphs are stroke SVG icons in the admin's
house style (24x24 viewBox, `currentColor`, round caps), so the row matches the rest of the surface.
-->
<script lang="ts">
  import type { FormatKind } from './markdown-format.js';

  interface Props {
    /** Apply a markdown transform to the editor's current selection. */
    format: (kind: FormatKind) => void;
  }

  let { format }: Props = $props();

  // Each icon is a set of stroke `<path>` d-strings rendered into the shared 24x24 svg below, so the
  // markup stays declarative (no per-icon raw html). Paths follow the house outline style.
  const buttons: { kind: FormatKind; label: string; paths: string[] }[] = [
    { kind: 'bold', label: 'Bold', paths: ['M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'] },
    { kind: 'italic', label: 'Italic', paths: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'] },
    { kind: 'h2', label: 'Heading', paths: ['M6 4v16', 'M18 4v16', 'M6 12h12'] },
    {
      kind: 'link',
      label: 'Link',
      paths: [
        'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
        'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
      ],
    },
    { kind: 'ul', label: 'Bulleted list', paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
    {
      kind: 'quote',
      label: 'Quote',
      paths: [
        'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
        'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
      ],
    },
    { kind: 'code', label: 'Code', paths: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'] },
  ];
</script>

<div class="border-base-300 bg-base-200 flex gap-1 border-b p-1" role="toolbar" aria-label="Formatting">
  {#each buttons as button (button.kind)}
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-square"
      aria-label={button.label}
      title={button.label}
      onclick={() => format(button.kind)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        {#each button.paths as d (d)}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={d} />
        {/each}
      </svg>
    </button>
  {/each}
</div>
