<!--
@component
The editor card's instrument strip. Three button groups divided by hairlines (Text, Structure with a
More overflow menu, then the host's Insert controls) and the Write/Preview segmented control pinned
right. Format buttons ask the host to transform the editor's current selection; the host supplies the
Insert group through the `insertControls` snippet so the strip stays free of picker wiring. While
Preview shows, a device trigger joins the segmented capsule and opens a popover menu of preview
widths, reported to the host through `onDevice`. The glyphs are stroke SVG icons in the admin's
house style (24x24 viewBox, `currentColor`, round caps).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FormatKind } from './markdown-format.js';
  import { previewDevices, type PreviewDeviceId } from './preview-doc.js';

  interface Props {
    /** Apply a markdown transform to the editor's current selection. */
    format: (kind: FormatKind) => void;
    /** Which pane the editor card shows; the segmented control reflects it. */
    mode: 'write' | 'preview';
    /** Ask the host to switch panes. */
    onMode: (m: 'write' | 'preview') => void;
    /** The active preview-frame device, shown on the device trigger. Desktop when absent. */
    device?: PreviewDeviceId;
    /** Pick a preview-frame width. When set, a device trigger joins the Write/Preview capsule
     *  while Preview shows. */
    onDevice?: (id: PreviewDeviceId) => void;
    /** The host's Insert controls (link picker, component insert, image), rendered in the Insert group. */
    insertControls?: Snippet;
  }

  let { format, mode, onMode, device = 'desktop', onDevice, insertControls }: Props = $props();

  // Each icon is a set of stroke `<path>` d-strings rendered into the shared 24x24 svg below, so the
  // markup stays declarative (no per-icon raw html). Paths follow the house outline style.
  type ToolButton = { kind: FormatKind; label: string; paths: string[] };

  // Labels carry the shortcut where one exists. "Ctrl" is written literally for macOS readers
  // too; detecting the platform buys little for what it costs.
  const textButtons: ToolButton[] = [
    { kind: 'bold', label: 'Bold (Ctrl+B)', paths: ['M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'] },
    { kind: 'italic', label: 'Italic (Ctrl+I)', paths: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'] },
  ];

  const structureButtons: ToolButton[] = [
    {
      kind: 'h2',
      label: 'Heading',
      paths: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1'],
    },
    {
      kind: 'h3',
      label: 'Smaller heading',
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

  // The More menu's popover element and its open state, mirrored from the toggle event into
  // aria-expanded on the trigger.
  let moreMenu = $state<HTMLUListElement | null>(null);
  let moreOpen = $state(false);

  function pickMore(kind: FormatKind) {
    format(kind);
    // Picking dismisses the menu; hiding returns focus to the trigger, keeping the roving order.
    if (moreMenu?.matches(':popover-open')) moreMenu.hidePopover();
  }

  // The device menu's popover element and its open state, mirrored from the toggle event into
  // aria-expanded on the trigger (the More menu's pattern).
  let deviceMenu = $state<HTMLUListElement | null>(null);
  let deviceOpen = $state(false);
  const activeDevice = $derived(previewDevices.find((d) => d.id === device) ?? previewDevices[0]);

  function pickDevice(id: PreviewDeviceId) {
    onDevice?.(id);
    if (deviceMenu?.matches(':popover-open')) deviceMenu.hidePopover();
  }

  let toolbarEl = $state<HTMLDivElement | null>(null);
  // The roving tab stop's position among the strip's enabled top-level controls. The Write/Preview
  // tabs join the toolbar's roving order instead of managing their own arrow keys: the ARIA toolbar
  // pattern allows either, and one arrow model over the whole strip is the simpler of the two.
  let roving = $state(0);

  /** The strip's top-level controls in DOM order: every enabled button outside the More menu's
   *  popover and outside the insert controls' dialogs. The host's insertControls render their own
   *  buttons, so the set is queried, not declared. */
  function rovingControls(): HTMLElement[] {
    if (!toolbarEl) return [];
    return Array.from(toolbarEl.querySelectorAll<HTMLElement>('button')).filter(
      (el) => !el.hasAttribute('disabled') && !el.closest('[popover]') && !el.closest('dialog'),
    );
  }

  // Keep exactly one tab stop. Runs on mount (the snippet's buttons render synchronously, so the
  // first pass sees them) and again whenever the stop moves or a mode switch changes which
  // controls are enabled.
  $effect(() => {
    void mode;
    const items = rovingControls();
    if (items.length === 0) return;
    const stop = Math.min(roving, items.length - 1);
    // Write the clamp back so the stored stop never drifts from the displayed one across a
    // Preview round trip. The effect reads roving, so the guarded write re-runs it once and
    // converges (the second pass computes the same stop and writes nothing).
    if (stop !== roving) roving = stop;
    for (const [i, el] of items.entries()) el.setAttribute('tabindex', i === stop ? '0' : '-1');
  });

  function onToolbarKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    // Leave the keys alone inside the open More menu; its items are not part of the roving order.
    if ((e.target as HTMLElement | null)?.closest('[popover]')) return;
    const items = rovingControls();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const base = current >= 0 ? current : Math.min(roving, items.length - 1);
    roving = (base + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    items[roving].focus();
    e.preventDefault();
  }
</script>

{#snippet strokeIcon(paths: string[])}
  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    {#each paths as d (d)}
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={d} />
    {/each}
  </svg>
{/snippet}

{#snippet glyphButton(button: ToolButton)}
  <button
    type="button"
    class="btn btn-ghost btn-sm btn-square"
    aria-label={button.label}
    title={button.label}
    disabled={mode === 'preview'}
    onclick={() => format(button.kind)}
  >
    {@render strokeIcon(button.paths)}
  </button>
{/snippet}

{#snippet tab(m: 'write' | 'preview', label: string)}
  <button
    type="button"
    role="tab"
    id={`cairn-tab-${m}`}
    aria-selected={mode === m}
    aria-controls={`cairn-pane-${m}`}
    class="join-item btn btn-sm {mode === m ? 'btn-active' : 'btn-ghost'}"
    onclick={() => onMode(m)}
  >
    {label}
  </button>
{/snippet}

<!-- tabindex -1: the container is never a tab stop itself; the roving tabindex on its controls
     carries keyboard entry, per the ARIA toolbar pattern. -->
<div
  bind:this={toolbarEl}
  class="bg-base-100 flex flex-wrap items-center gap-1 border-b border-[var(--cairn-card-border)] p-1"
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
  <!-- The More menu is a DaisyUI v5 popover dropdown: click to open (never focus-in-transit),
       Escape and light dismiss from the Popover API, and the anchor-name/position-anchor pair
       places the panel under its trigger. -->
  <button
    type="button"
    class="btn btn-ghost btn-sm btn-square"
    aria-label="More formatting"
    title="More formatting"
    aria-expanded={moreOpen}
    popovertarget="cairn-more-formatting-menu"
    style="anchor-name:--cairn-more-formatting"
    disabled={mode === 'preview'}
  >
    {@render strokeIcon(ellipsisPaths)}
  </button>
  <ul
    bind:this={moreMenu}
    popover="auto"
    id="cairn-more-formatting-menu"
    style="position-anchor:--cairn-more-formatting"
    ontoggle={(e) => (moreOpen = e.newState === 'open')}
    class="dropdown menu menu-sm bg-base-100 rounded-box w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]"
  >
    {#each moreItems as item (item.kind)}
      <li><button type="button" onclick={() => pickMore(item.kind)}>{item.label}</button></li>
    {/each}
  </ul>

  {#if insertControls}
    <div class="w-px self-stretch bg-[var(--cairn-card-border)]" aria-hidden="true"></div>
    <!-- The host's controls carry their own disabled state in Preview; this wrapper just keeps
         any stray pointer target in the snippet inert while the pane is read-only. -->
    <div
      class="flex items-center gap-1"
      class:pointer-events-none={mode === 'preview'}
      class:opacity-50={mode === 'preview'}
    >
      {@render insertControls()}
    </div>
  {/if}

  <!-- The host renders the matching tabpanels (#cairn-pane-write and #cairn-pane-preview) below
       the strip inside the same editor card. While Preview shows, the device trigger joins the
       capsule as a third segment beside the Preview tab (never nested inside the tab button:
       no nested interactive controls). daisyUI's join radii follow direct children, so the
       trigger sits inside the tablist element; it is a plain menu button, not a tab. -->
  <div class="join ml-auto" role="tablist" aria-label="Editor view">
    {@render tab('write', 'Write')}
    {@render tab('preview', 'Preview')}
    {#if mode === 'preview' && onDevice}
      <button
        type="button"
        class="join-item btn btn-sm btn-ghost gap-1"
        title="Preview width"
        aria-haspopup="menu"
        aria-expanded={deviceOpen}
        popovertarget="cairn-preview-device-menu"
        style="anchor-name:--cairn-preview-device"
      >
        <span class="sr-only">Preview width:</span>
        {activeDevice.label}
        {@render strokeIcon(['m6 9 6 6 6-6'])}
      </button>
    {/if}
  </div>
  {#if mode === 'preview' && onDevice}
    <!-- The device menu is the same DaisyUI v5 popover dropdown as the More menu; it mounts
         outside the tablist so the menu items never read as tabs. -->
    <ul
      bind:this={deviceMenu}
      popover="auto"
      id="cairn-preview-device-menu"
      style="position-anchor:--cairn-preview-device"
      ontoggle={(e) => (deviceOpen = e.newState === 'open')}
      role="menu"
      aria-label="Preview width"
      class="dropdown dropdown-end menu menu-sm bg-base-100 rounded-box w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]"
    >
      {#each previewDevices as d (d.id)}
        <li role="none">
          <button type="button" role="menuitemradio" aria-checked={device === d.id} onclick={() => pickDevice(d.id)}>
            <span class="grow">{d.label}</span>
            {#if device === d.id}
              {@render strokeIcon(['M20 6 9 17l-5-5'])}
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
