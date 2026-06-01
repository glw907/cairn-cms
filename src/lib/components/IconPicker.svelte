<!--
@component
A visual icon choice over the site's IconSet. Each glyph is a toggle button; the selected one carries
aria-pressed. When the field is optional, a None button clears the value. The glyph renders inline from
the IconSet path data, matching the renderer's 256-unit viewBox.
-->
<script lang="ts">
  import type { IconSet } from '../render/glyph.js';

  interface Props {
    /** The site's glyph name to SVG path-data map. */
    icons: IconSet;
    /** The currently selected glyph name, or '' for none. */
    value: string;
    /** When false, a None choice is offered. */
    required: boolean;
    /** Called with the new glyph name (or '' for none). */
    onChange: (name: string) => void;
  }

  let { icons, value, required, onChange }: Props = $props();

  const names = $derived(Object.keys(icons));
</script>

<div class="flex flex-wrap gap-2" role="group" aria-label="Icon">
  {#if !required}
    <button
      type="button"
      class="btn btn-sm"
      class:btn-primary={value === ''}
      aria-pressed={value === ''}
      onclick={() => onChange('')}
    >None</button>
  {/if}
  {#each names as name (name)}
    <button
      type="button"
      class="btn btn-sm gap-1"
      class:btn-primary={value === name}
      aria-pressed={value === name}
      aria-label={name}
      onclick={() => onChange(name)}
    >
      <svg class="ec-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="16" height="16">
        <path d={icons[name]} />
      </svg>
      <span class="text-xs">{name}</span>
    </button>
  {/each}
</div>
