<!--
@component
The editor's formatting toolbar: bold, italic, heading, link, bulleted list, quote, code. Each button
asks the host to apply a markdown transform to the current selection. Carta supplied this row before;
cairn owns it now so the edit surface stays swappable.
-->
<script lang="ts">
  import type { FormatKind } from './markdown-format.js';

  interface Props {
    /** Apply a markdown transform to the editor's current selection. */
    format: (kind: FormatKind) => void;
  }

  let { format }: Props = $props();

  const buttons: { kind: FormatKind; label: string; glyph: string }[] = [
    { kind: 'bold', label: 'Bold', glyph: 'B' },
    { kind: 'italic', label: 'Italic', glyph: 'I' },
    { kind: 'heading', label: 'Heading', glyph: 'H' },
    { kind: 'link', label: 'Link', glyph: '🔗' },
    { kind: 'ul', label: 'Bulleted list', glyph: '•' },
    { kind: 'quote', label: 'Quote', glyph: '“' },
    { kind: 'code', label: 'Code', glyph: '</>' },
  ];
</script>

<div class="border-base-300 bg-base-200 flex gap-1 border-b p-1" role="toolbar" aria-label="Formatting">
  {#each buttons as button (button.kind)}
    <button
      type="button"
      class="btn btn-ghost btn-xs"
      aria-label={button.label}
      title={button.label}
      onclick={() => format(button.kind)}
    >{button.glyph}</button>
  {/each}
</div>
