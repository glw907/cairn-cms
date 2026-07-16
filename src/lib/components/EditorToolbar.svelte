<!--
@component
The editor card's instrument strip. Three labelled clusters, Format (bold, italic, strike, inline
code), Structure (headings, lists, quote, table, plus the More overflow), and Insert (the host's
insert/edit/link/image/figure/Tidy controls), each divided by a hairline and, at sm and up, topped
with a presentational micro-eyebrow naming it (design-arc D2, docs/internal/2026-07-15-design-arc-log.md,
"grouped micro-eyebrows"). Each cluster wrapper carries `role="group"` with an `aria-label` matching
its eyebrow, so the grouping reaches assistive tech even though the eyebrow text itself is
`aria-hidden`. "Blocks" never labels a cluster: cairn's own vocabulary already uses block for a
component (Insert block / Edit block), so the word appears only inside those two existing control
labels, never as a group name. A persistent 44px "?" control sits at the strip's right end at every
width (a glyph plus a sr-only "Markdown help" label) and calls the host's `onHelp`; it never
disables and never scrolls out of reach below sm, since it renders outside the horizontally
scrolling region C1 gave the rest of the strip. Format buttons ask the host to transform the
editor's current selection; the host supplies the Insert group through the `insertControls`
snippet so the strip stays free of picker wiring. While Preview shows, a device trigger joins the
Write/Preview segmented capsule (inside the scrolling region, right end, hidden below sm) and
opens a popover menu of preview widths, reported to the host through `onDevice`. The writing-mode
toggles live in the host's card footer (the bottom strip carries the writing environment; this
strip acts on the text). The glyphs are stroke SVG icons in the admin's house style (24x24
viewBox, `currentColor`, round caps).

Below sm (design-arc C1, docs/internal/2026-07-15-design-arc-log.md) the scrolling region becomes
one horizontally scrolling row instead of wrapping, every square control grows to a 44px floor,
the micro-eyebrow labels disappear (the hairlines alone still divide the three clusters), the
Write/Preview tablist hides, and the host's `moreExtra` snippet appends its own items to the
existing More-formatting popover, so the toolbar carries exactly one overflow trigger at that
width. The "?" help control sits outside that scrolling region, so none of this touches it: it
stays pinned at the row's right end, reachable at every width.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FormatKind } from './markdown-format.js';
  import { deviceLabel, previewDevice, previewDevices, type PreviewDeviceId } from './preview-doc.js';

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
    /**
     * Extra items appended to the More-formatting popover, visible below sm only (design-arc C1,
     * docs/internal/2026-07-15-design-arc-log.md): the host's Write/Preview picks, writing-mode
     * toggles, and Markdown help fold in here at that width, since the phone composition gives the
     * toolbar exactly one overflow trigger. Receives a close-the-menu callback so a pick dismisses
     * the popover the way the built-in items do.
     */
    moreExtra?: Snippet<[closeMenu: () => void]>;
    /** Opens the Markdown-help destination from the strip's persistent "?" control (design-arc D2),
     *  present at every width. A no-op until the host supplies it. */
    onHelp?: () => void;
  }

  let {
    format,
    mode,
    onMode,
    device = 'desktop',
    onDevice,
    insertControls,
    moreExtra,
    onHelp,
  }: Props = $props();

  // Each icon is a set of stroke `<path>` d-strings rendered into the shared 24x24 svg below, so the
  // markup stays declarative (no per-icon raw html). Paths follow the house outline style.
  type ToolButton = { kind: FormatKind; label: string; paths: string[] };

  // Labels carry the shortcut where one exists. "Ctrl" is written literally for macOS readers
  // too; detecting the platform buys little for what it costs.
  //
  // The Format cluster (design-arc D2): the four controls that act on the current selection's
  // characters, in the ruled order (bold, italic, strike, inline code).
  const formatButtons: ToolButton[] = [
    { kind: 'bold', label: 'Bold (Ctrl+B)', paths: ['M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'] },
    { kind: 'italic', label: 'Italic (Ctrl+I)', paths: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'] },
    {
      kind: 'strike',
      label: 'Strikethrough',
      paths: ['M14 12a4 4 0 0 1 0 8H8', 'M16 4H9.5a3.5 3.5 0 0 0-1.4 6.7', 'M4 12h16'],
    },
    { kind: 'code', label: 'Inline code (Ctrl+E)', paths: ['m9 8-4 4 4 4', 'm15 8 4 4-4 4'] },
  ];

  // The Structure cluster (design-arc D2): the block-shape formats, ending with the More overflow
  // trigger for the rarer block formats (code block, horizontal rule, task list).
  const structureButtons: ToolButton[] = [
    {
      kind: 'h2',
      label: 'Heading (Ctrl+Alt+2)',
      paths: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1'],
    },
    {
      kind: 'h3',
      label: 'Smaller heading (Ctrl+Alt+3)',
      paths: [
        'M4 12h8',
        'M4 18V6',
        'M12 18V6',
        'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2',
        'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2',
      ],
    },
    { kind: 'ul', label: 'Bulleted list (Ctrl+Shift+8)', paths: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
    {
      kind: 'ol',
      label: 'Numbered list (Ctrl+Shift+7)',
      paths: ['M10 12h11', 'M10 18h11', 'M10 6h11', 'M4 10h2', 'M4 6h1v4', 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1'],
    },
    {
      kind: 'quote',
      label: 'Quote (Ctrl+Shift+9)',
      paths: [
        'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
        'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1 1 1 0 0 0 1 1 4 4 0 0 0 4-4V5a2 2 0 0 0-2-2z',
      ],
    },
    {
      kind: 'table',
      label: 'Table',
      paths: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 10h18', 'M10 3v18'],
    },
  ];

  const ellipsisPaths = ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'];
  // The check glyph marking an active pick, shared by the More menu's toggles and the device list.
  const checkPaths = ['M20 6 9 17l-5-5'];

  // The trimmed overflow: the block formats that stay rare. A divider splits the code block from
  // the rest (the spec keeps "code block and the rest" behind the ellipsis once inline code,
  // strikethrough, and table promote into the strip).
  const moreItems: { kind: FormatKind; label: string; divideBefore?: boolean }[] = [
    { kind: 'codeblock', label: 'Code block' },
    { kind: 'hr', label: 'Horizontal rule', divideBefore: true },
    { kind: 'task', label: 'Task list' },
  ];

  // The eyebrow recipe (docs/internal/admin-design-system.md), shared by the three cluster labels.
  const eyebrowClass = 'hidden text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted sm:block';
  // The eyebrow-topped cluster wrapper (Format, Structure, Insert): the eyebrow floats above its
  // button row, and the whole cluster holds its width below sm so the scrolling region never
  // squeezes it.
  const clusterClass = 'flex flex-col items-start gap-1 max-sm:shrink-0';

  // The More menu's popover element and its open state, mirrored from the toggle event into
  // aria-expanded on the trigger.
  let moreMenu = $state<HTMLUListElement | null>(null);
  let moreOpen = $state(false);

  // Picking dismisses the menu; hiding returns focus to the trigger, keeping the roving order.
  function hideMenu(menu: HTMLUListElement | null) {
    if (menu?.matches(':popover-open')) menu.hidePopover();
  }

  function pickMore(kind: FormatKind) {
    format(kind);
    hideMenu(moreMenu);
  }

  // The device menu's popover element and its open state, mirrored from the toggle event into
  // aria-expanded on the trigger (the More menu's pattern).
  let deviceMenu = $state<HTMLUListElement | null>(null);
  let deviceOpen = $state(false);
  const activeDevice = $derived(previewDevice(device));
  // Whether the device trigger renders as the capsule's third segment.
  const showDeviceTrigger = $derived(mode === 'preview' && !!onDevice);

  function pickDevice(id: PreviewDeviceId) {
    onDevice?.(id);
    hideMenu(deviceMenu);
  }

  let toolbarEl = $state<HTMLDivElement | null>(null);
  // The roving tab stop's position among the strip's enabled top-level controls. The Write/Preview
  // tabs join the toolbar's roving order instead of managing their own arrow keys: the ARIA toolbar
  // pattern allows either, and one arrow model over the whole strip is the simpler of the two. The
  // persistent "?" help control joins the same order (it lives inside the toolbar element, just
  // outside the scrolling region), so it never needs its own tab stop.
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
    class="btn btn-ghost btn-sm btn-square max-sm:min-h-11 max-sm:min-w-11 max-sm:shrink-0"
    aria-label={button.label}
    title={button.label}
    disabled={mode === 'preview'}
    onclick={() => format(button.kind)}
  >
    {@render strokeIcon(button.paths)}
  </button>
{/snippet}

{#snippet tab(m: 'write' | 'preview', label: string)}
  <!-- The capsule look is manual rounding, not daisyUI's .join: join radii follow direct
       children, and the device trigger must sit outside the tablist (ARIA required children),
       so the segments square their shared edges themselves. Preview squares its right edge only
       while the trigger extends the capsule. -->
  <button
    type="button"
    role="tab"
    id={`cairn-tab-${m}`}
    aria-selected={mode === m}
    aria-controls={`cairn-pane-${m}`}
    class="btn btn-sm {mode === m ? 'btn-active' : 'btn-ghost'}"
    class:rounded-r-none={m === 'write' || showDeviceTrigger}
    class:rounded-l-none={m === 'preview'}
    class:-ml-px={m === 'preview'}
    onclick={() => onMode(m)}
  >
    {label}
  </button>
{/snippet}

<!-- tabindex -1: the container is never a tab stop itself; the roving tabindex on its controls
     carries keyboard entry, per the ARIA toolbar pattern. items-end bottom-aligns every child
     (the three eyebrow-topped clusters, the tablist wrapper, the "?" control) against the same
     button-row baseline, so the strip still reads as one row of controls with the eyebrows
     floating above it, not two visually competing rows (design-arc D2). -->
<div
  bind:this={toolbarEl}
  class="bg-base-100 flex items-end gap-1 border-b border-[var(--cairn-card-border)] p-1"
  role="toolbar"
  aria-label="Formatting"
  tabindex="-1"
  onkeydown={onToolbarKeydown}
>
  <!-- The scrolling region (design-arc C1): below sm this is the ONE horizontally scrolling row
       (max-sm:flex-nowrap max-sm:overflow-x-auto), so nothing here clips or wraps to a second
       glyph row (audit finding 1: the toolbar clipped to three rows at 390px). sm and up wraps
       normally and shows the clusters' eyebrows. The persistent help control below sits OUTSIDE
       this region on purpose, so it is never scrolled out of reach. -->
  <div class="flex min-w-0 flex-1 flex-wrap items-end gap-1 sm:gap-3 max-sm:flex-nowrap max-sm:overflow-x-auto">
    <div class={clusterClass} role="group" aria-label="Format">
      <span class={eyebrowClass} aria-hidden="true">Format</span>
      <div class="flex items-center gap-1">
        {#each formatButtons as button (button.kind)}
          {@render glyphButton(button)}
        {/each}
      </div>
    </div>

    <div class="w-px self-stretch bg-[var(--cairn-card-border)] max-sm:shrink-0" aria-hidden="true"></div>

    <div class={clusterClass} role="group" aria-label="Structure">
      <span class={eyebrowClass} aria-hidden="true">Structure</span>
      <div class="flex items-center gap-1">
        {#each structureButtons as button (button.kind)}
          {@render glyphButton(button)}
        {/each}
        <!-- The More menu is a DaisyUI v5 popover dropdown: click to open (never focus-in-transit),
             Escape and light dismiss from the Popover API, and the anchor-name/position-anchor pair
             places the panel under its trigger. Preview no longer disables the trigger itself when
             the host supplies moreExtra (design-arc C1): below sm, Write/Preview folds into this
             same popover as the ONLY way back out of Preview, so the trigger must stay reachable
             there; only the trigger's OWN formatting items (moreItems below), meaningless on
             read-only content, gate on Preview individually. Without a host-supplied moreExtra
             this menu holds only formatting, so the trigger keeps its original
             Preview-disables-everything behavior. -->
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square max-sm:min-h-11 max-sm:min-w-11 max-sm:shrink-0"
          aria-label="More formatting"
          title="More formatting"
          aria-expanded={moreOpen}
          popovertarget="cairn-more-formatting-menu"
          style="anchor-name:--cairn-more-formatting"
          disabled={mode === 'preview' && !moreExtra}
        >
          {@render strokeIcon(ellipsisPaths)}
        </button>
      </div>
    </div>
    <ul
      bind:this={moreMenu}
      popover="auto"
      id="cairn-more-formatting-menu"
      style="position-anchor:--cairn-more-formatting"
      ontoggle={(e) => (moreOpen = e.newState === 'open')}
      class="dropdown menu menu-sm bg-base-100 rounded-box w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]"
    >
      {#each moreItems as item (item.kind)}
        {#if item.divideBefore}
          <li class="menu-divider my-1 h-px bg-[var(--cairn-card-border)]" role="separator" aria-hidden="true"></li>
        {/if}
        <li><button type="button" disabled={mode === 'preview'} onclick={() => pickMore(item.kind)}>{item.label}</button></li>
      {/each}
      {#if moreExtra && moreOpen}
        <!-- Mounted only while the popover is actually open, not merely present-but-closed: a closed
             popover is natively excluded from the accessibility tree (no CSS needed, the same reason
             the Details/theme-toggle band fold is safe), but a plain text query (getByText) does not
             consult that tree at all, so a passive line like the word count here would otherwise
             read as a second, ambiguous copy of the host's own visible one even while this popover
             sits closed. Gating the mount on moreOpen keeps every moreExtra node, text or control,
             out of the DOM until an editor actually opens this menu. -->
        {@render moreExtra(() => hideMenu(moreMenu))}
      {/if}
    </ul>

    {#if insertControls}
      <div class="w-px self-stretch bg-[var(--cairn-card-border)] max-sm:shrink-0" aria-hidden="true"></div>
      <div class={clusterClass} role="group" aria-label="Insert">
        <span class={eyebrowClass} aria-hidden="true">Insert</span>
        <!-- The host's controls carry their own disabled state in Preview; this wrapper just keeps
             any stray pointer target in the snippet inert while the pane is read-only. Below sm
             every insert control grows to the same 44px floor the glyph buttons take (design-arc
             C1), applied here rather than per-button in the host's own snippet. -->
        <div
          class="flex items-center gap-1 max-sm:[&_button]:min-h-11 max-sm:[&_button]:min-w-11 max-sm:[&_button]:shrink-0"
          class:pointer-events-none={mode === 'preview'}
          class:opacity-50={mode === 'preview'}
        >
          {@render insertControls()}
        </div>
      </div>
    {/if}

    <!-- The host renders the matching tabpanels (#cairn-pane-write and #cairn-pane-preview) below
         the strip inside the same editor card. The tablist wrapper holds ONLY the two tabs (ARIA
         required children: anything else in a tablist makes assistive tech miscount the tabs).
         While Preview shows, the device trigger reads as the capsule's third segment from the
         flex row right after the wrapper; it is a plain button, not a tab. Hidden below sm
         (design-arc C1): the same Write/Preview toggle lives in the More popover's moreExtra items
         there instead, since the phone composition gives the toolbar exactly one overflow. -->
    <div class="hidden items-center sm:ml-auto sm:flex">
      <div role="tablist" aria-label="Editor view" class="flex items-center">
        {@render tab('write', 'Write')}
        {@render tab('preview', 'Preview')}
      </div>
      {#if showDeviceTrigger}
        <button
          type="button"
          class="btn btn-sm btn-ghost gap-1 rounded-l-none -ml-px"
          title="Preview width"
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
  </div>

  {#if showDeviceTrigger}
    <!-- The device list mirrors the More menu exactly: a DaisyUI v5 popover dropdown of plain
         buttons, with the active pick carried by aria-pressed and the check glyph. Deliberately
         NOT the ARIA menu pattern: menu roles promise interactions this list does not have. -->
    <ul
      bind:this={deviceMenu}
      popover="auto"
      id="cairn-preview-device-menu"
      style="position-anchor:--cairn-preview-device"
      ontoggle={(e) => (deviceOpen = e.newState === 'open')}
      class="dropdown dropdown-end menu menu-sm bg-base-100 rounded-box w-44 border border-[var(--cairn-card-border)] p-1 shadow-[var(--cairn-shadow)]"
    >
      {#each previewDevices as d (d.id)}
        <li>
          <button type="button" aria-pressed={device === d.id} onclick={() => pickDevice(d.id)}>
            <span class="grow">{deviceLabel(d)}</span>
            {#if device === d.id}
              {@render strokeIcon(checkPaths)}
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- The persistent Markdown-help control (design-arc D2): a 44px "?" glyph at the strip's right
       end at every width, pinned outside the scrolling region above so it is reachable below sm
       too (it replaces relying on the folded-away footer link at that width, audit finding 7). It
       never disables: help is a reference, not an edit action, so it stays available in Preview
       and mid-tidy alike, the same posture the footer's link took. The visible glyph is
       aria-hidden; the sr-only span carries the accessible name. -->
  <button
    type="button"
    class="btn btn-ghost btn-sm btn-square shrink-0 max-sm:min-h-11 max-sm:min-w-11"
    title="Markdown help"
    aria-haspopup="dialog"
    onclick={() => onHelp?.()}
  >
    <span aria-hidden="true" class="text-sm font-semibold">?</span>
    <span class="sr-only">Markdown help</span>
  </button>
</div>
