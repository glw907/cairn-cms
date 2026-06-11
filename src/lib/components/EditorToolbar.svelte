<!--
@component
The editor card's instrument strip. Three button groups divided by hairlines (Text, Structure with a
More overflow menu, then the host's Insert controls) and the Write/Preview segmented control pinned
right. Format buttons ask the host to transform the editor's current selection; the host supplies the
Insert group through the `insertControls` snippet so the strip stays free of picker wiring. The glyphs
are stroke SVG icons in the admin's house style (24x24 viewBox, `currentColor`, round caps).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FormatKind } from './markdown-format.js';

  interface Props {
    /** Apply a markdown transform to the editor's current selection. */
    format: (kind: FormatKind) => void;
    /** Which pane the editor card shows; the segmented control reflects it. */
    mode: 'write' | 'preview';
    /** Ask the host to switch panes. */
    onMode: (m: 'write' | 'preview') => void;
    /** The host's Insert controls (link picker, component insert, image), rendered in the Insert group. */
    insertControls?: Snippet;
  }

  let { format, mode, onMode, insertControls }: Props = $props();

  // Each icon is a set of stroke `<path>` d-strings rendered into the shared 24x24 svg below, so the
  // markup stays declarative (no per-icon raw html). Paths follow the house outline style.
  type ToolButton = { kind: FormatKind; label: string; paths: string[] };

  const textButtons: ToolButton[] = [
    { kind: 'bold', label: 'Bold', paths: ['M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'] },
    { kind: 'italic', label: 'Italic', paths: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'] },
  ];

  const structureButtons: ToolButton[] = [
    {
      kind: 'h2',
      label: 'Heading 2',
      paths: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1'],
    },
    {
      kind: 'h3',
      label: 'Heading 3',
      paths: [
        'M4 12h8',
        'M4 18V6',
        'M12 18V6',
        'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2',
        'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2',
      ],
    },
    { kind: 'ul', label: 'Bulleted list', paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
    {
      kind: 'ol',
      label: 'Numbered list',
      paths: ['M10 12h11', 'M10 18h11', 'M10 6h11', 'M4 10h2', 'M4 6h1v4', 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1'],
    },
    {
      kind: 'quote',
      label: 'Quote',
      paths: [
        'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
        'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
      ],
    },
  ];

  const ellipsisPaths = ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'];

  const moreItems: { kind: FormatKind; label: string }[] = [
    { kind: 'strike', label: 'Strikethrough' },
    { kind: 'code', label: 'Inline code' },
    { kind: 'codeblock', label: 'Code block' },
    { kind: 'table', label: 'Table' },
    { kind: 'hr', label: 'Horizontal rule' },
    { kind: 'task', label: 'Task list' },
  ];

  function pickMore(kind: FormatKind) {
    format(kind);
    // The DaisyUI dropdown is focus-driven, so blurring the clicked item closes the menu.
    (document.activeElement as HTMLElement | null)?.blur();
  }

  let toolbarEl = $state<HTMLDivElement | null>(null);
  // The roving tab stop's position among the strip's enabled top-level controls. The Write/Preview
  // tabs join the toolbar's roving order instead of managing their own arrow keys: the ARIA toolbar
  // pattern allows either, and one arrow model over the whole strip is the simpler of the two.
  let roving = $state(0);

  /** The strip's top-level controls in DOM order: every enabled button outside the More menu. The
   *  host's insertControls render their own buttons, so the set is queried, not declared. */
  function rovingControls(): HTMLElement[] {
    if (!toolbarEl) return [];
    return Array.from(toolbarEl.querySelectorAll<HTMLElement>('button')).filter(
      (el) => !el.hasAttribute('disabled') && !el.closest('.dropdown-content'),
    );
  }

  // Keep exactly one tab stop. Runs on mount (the snippet's buttons render synchronously, so the
  // first pass sees them) and again whenever the stop moves.
  $effect(() => {
    const items = rovingControls();
    if (items.length === 0) return;
    const stop = Math.min(roving, items.length - 1);
    for (const [i, el] of items.entries()) el.setAttribute('tabindex', i === stop ? '0' : '-1');
  });

  function onToolbarKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    // Leave the keys alone inside the open More menu; its items are not part of the roving order.
    if ((e.target as HTMLElement | null)?.closest('.dropdown-content')) return;
    const items = rovingControls();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const base = current >= 0 ? current : Math.min(roving, items.length - 1);
    roving = (base + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    items[roving].focus();
    e.preventDefault();
  }
</script>

{#snippet glyphButton(button: ToolButton)}
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
{/snippet}

<!-- tabindex -1: the container is never a tab stop itself; the roving tabindex on its controls
     carries keyboard entry, per the ARIA toolbar pattern. -->
<div
  bind:this={toolbarEl}
  class="bg-base-100 flex items-center gap-1 border-b border-[var(--cairn-card-border)] p-1"
  role="toolbar"
  aria-label="Formatting"
  tabindex="-1"
  onkeydown={onToolbarKeydown}
>
  {#each textButtons as button (button.kind)}
    {@render glyphButton(button)}
  {/each}

  <div class="w-px self-stretch bg-[var(--cairn-card-border)]" aria-hidden="true"></div>

  {#each structureButtons as button (button.kind)}
    {@render glyphButton(button)}
  {/each}
  <div class="dropdown">
    <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="More formatting" title="More formatting" aria-haspopup="true">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        {#each ellipsisPaths as d (d)}
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={d} />
        {/each}
      </svg>
    </button>
    <ul class="dropdown-content menu menu-sm bg-base-100 rounded-box z-10 w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]">
      {#each moreItems as item (item.kind)}
        <li><button type="button" onclick={() => pickMore(item.kind)}>{item.label}</button></li>
      {/each}
    </ul>
  </div>

  {#if insertControls}
    <div class="w-px self-stretch bg-[var(--cairn-card-border)]" aria-hidden="true"></div>
    {@render insertControls()}
  {/if}

  <!-- The host renders the matching tabpanels (#cairn-pane-write and #cairn-pane-preview) below
       the strip inside the same editor card. -->
  <div class="join ml-auto" role="tablist" aria-label="Editor view">
    <button
      type="button"
      role="tab"
      id="cairn-tab-write"
      aria-selected={mode === 'write'}
      aria-controls="cairn-pane-write"
      class="join-item btn btn-sm {mode === 'write' ? 'btn-active' : 'btn-ghost'}"
      onclick={() => onMode('write')}
    >
      Write
    </button>
    <button
      type="button"
      role="tab"
      id="cairn-tab-preview"
      aria-selected={mode === 'preview'}
      aria-controls="cairn-pane-preview"
      class="join-item btn btn-sm {mode === 'preview' ? 'btn-active' : 'btn-ghost'}"
      onclick={() => onMode('preview')}
    >
      Preview
    </button>
  </div>
</div>
