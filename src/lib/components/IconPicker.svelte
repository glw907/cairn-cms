<!--
@component
A visual icon choice over the site's IconSet. The choices form a radiogroup; each glyph is a radio
button carrying aria-checked, and the selected one carries btn-primary for the visible state. When the
field is optional, a None radio clears the value. A roving tabindex keeps a single tab stop and arrow
keys move the selection, the standard radiogroup keyboard model. The glyph renders inline from the
IconSet path data, matching the renderer's 256-unit viewBox.
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
  // The selectable keys in DOM order: the optional None choice ('') first, then each glyph name.
  // Arrow-key navigation walks this list, and the roving tabindex marks the selected key (or the
  // first key when nothing is selected) as the single tab stop.
  const choices = $derived(required ? names : ['', ...names]);
  const tabStop = $derived(choices.includes(value) ? value : choices[0]);

  function move(delta: number): void {
    const current = choices.indexOf(value);
    const from = current === -1 ? 0 : current;
    const next = (from + delta + choices.length) % choices.length;
    onChange(choices[next]);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
  {#if !required}
    <button
      type="button"
      class="btn btn-sm"
      class:btn-primary={value === ''}
      role="radio"
      aria-checked={value === ''}
      aria-label="None"
      tabindex={tabStop === '' ? 0 : -1}
      onkeydown={onKeydown}
      onclick={() => onChange('')}
    >None</button>
  {/if}
  {#each names as name (name)}
    <button
      type="button"
      class="btn btn-sm gap-1"
      class:btn-primary={value === name}
      role="radio"
      aria-checked={value === name}
      aria-label={name}
      tabindex={tabStop === name ? 0 : -1}
      onkeydown={onKeydown}
      onclick={() => onChange(name)}
    >
      <svg class="ec-glyph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="16" height="16">
        <path d={icons[name]} />
      </svg>
      <span class="text-xs">{name}</span>
    </button>
  {/each}
</div>
