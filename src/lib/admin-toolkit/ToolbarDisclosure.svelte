<!--
@component
The admin toolkit's trigger-plus-panel disclosure, extracted from `ListToolbar`'s own overflow
menu and `'menu'`-display facets (`audit-admin-listtoolbar`'s reshape): both duplicated the same
five dismissal mechanics, and the one consumer that hand-copied the pattern missed them on its
first pass. General contract: a trigger control that opens a floating panel, with `aria-expanded`/
`aria-controls` kept in sync, focus moved into the panel on open, Escape closing and returning
focus to the trigger, a pointerdown outside the trigger-plus-panel closing without moving focus,
and focus leaving the trigger-plus-panel (a Tab out) closing without moving focus either.

Fully controlled, the same convention `ExpandableRow` (`expanded`/`onToggle`) and `Pagination`
(`page`/`onPageChange`) already establish: `open` and `onOpenChange` are props, not internal
`$state`. This component never decides whether it is allowed to be open; it only reports when it
wants to change. A caller coordinating several disclosures (`ListToolbar`'s own single-open-at-a-
time `openFacetId`) derives each instance's own `open` from its own shared state, and this
component reacts correctly either way: an `open` transition the caller drives from outside (a
sibling disclosure opening, say) never steals focus, since focus-on-open only fires from this
component's own `$effect` watching `open`, matching whatever the panel's content is at that
moment.

The trigger and panel are both the caller's own markup, never this component's: `trigger` and
`panel` are snippets, given the attributes to spread onto the caller's own elements
(`aria-expanded`/`aria-controls`/`aria-haspopup`/`onclick` for the trigger, `id` for the panel's
own root element) rather than elements this component renders itself. This is deliberate: a
`'menu'` facet's ARIA-menu content (`role="menu"`, `role="menuitemradio"`, arrow-key roving,
reset-to-first-on-open via each option's own `onfocus`) is facet behavior, not disclosure
mechanics, and stays entirely in `ListToolbar`'s own panel snippet rather than shipping
`ListToolbar`-specific vocabulary in a general-purpose primitive. `ariaHaspopup` only carries the
trigger's own `aria-haspopup` value through (e.g. `'menu'`); this component has no opinion on what
kind of panel content that implies.

Focus-into-panel-on-open is a generic fallback: the first focusable descendant of whatever the
panel snippet renders (button, link, form control, or an explicit `tabindex`) receives focus once
the panel is visible. A caller with its own more specific idea of what "first" means (a menu's own
roving-tabindex option, say) still gets it for free, since focusing that same first element fires
its own `onfocus` handler, if it has one, the same way a real Tab keypress would.

The trigger element itself is never rendered by this component, so it holds no persistent ref to
it; the trigger's own `onclick` (part of the spread attrs) captures `event.currentTarget` at open
time, which is enough for Escape's own focus-return, since a disclosure only ever opens through
that click.

An optional `extra` snippet renders as a sibling of the trigger, inside the same containment
boundary as the trigger and panel: a facet's own inline clear button, for instance, which must
never count as "outside" for the pointerdown mechanic or "left" for the focusout mechanic.

`containerClass` and `emphasized` are the one piece of visual configuration this component
carries: `containerClass` names extra classes for the disclosure's own containing element (the
outside-pointerdown and focusout boundary, and the panel's `position: absolute` containing block,
via daisyUI's own `dropdown` class this component always applies), and `emphasized` toggles the
bordered-and-tinted treatment a facet with an applied value carries. Both exist because the
containing element is this component's own markup: a caller's own scoped `<style>` cannot reach an
element rendered by a different component without either duplicating it back into that caller (the
orphaning bug this extraction fixes) or reaching across with `:global()`, which is no better than
not moving the rule at all.
-->
<script module lang="ts">
  /** Attributes to spread onto the caller's own trigger element. `aria-expanded` and
   *  `aria-controls` track this disclosure's open state; `aria-haspopup` forwards the
   *  `ariaHaspopup` prop when given; `onclick` toggles `open` through `onOpenChange`. */
  export interface ToolbarDisclosureTriggerAttrs {
    'aria-expanded': boolean;
    'aria-controls': string;
    'aria-haspopup': ToolbarDisclosureAriaHaspopup | undefined;
    onclick: (event: MouseEvent) => void;
  }

  /** Attributes to spread onto the caller's own panel root element. `id` is what the trigger's
   *  `aria-controls` resolves to. */
  export interface ToolbarDisclosurePanelAttrs {
    id: string;
  }

  /** The trigger's own `aria-haspopup` value, forwarded through unchanged. */
  export type ToolbarDisclosureAriaHaspopup = 'menu' | 'listbox' | 'dialog' | 'grid' | 'tree' | 'true';
</script>

<script lang="ts">
  import { tick, type Snippet } from 'svelte';

  interface Props {
    /** Whether the panel is currently open. Controlled by the caller; see this component's own
     *  header comment for the full contract. */
    open: boolean;
    /** Called with the next open value on every mechanic this component drives: a trigger click,
     *  Escape, an outside pointerdown, or focus leaving the trigger-plus-panel. The caller applies
     *  it (or, coordinating several disclosures, folds it into a single shared id). */
    onOpenChange: (open: boolean) => void;
    /** The trigger's own `aria-haspopup` value (e.g. `'menu'`), forwarded onto the trigger attrs.
     *  Omit for a trigger with no popup semantics beyond the disclosure itself. */
    ariaHaspopup?: ToolbarDisclosureAriaHaspopup;
    /** Extra class names for this component's own containing element. */
    containerClass?: string;
    /** Whether the containing element carries the bordered-and-tinted emphasized treatment (an
     *  applied filter's own facet, say). */
    emphasized?: boolean;
    /** Renders the trigger control. Receives the attrs object to spread onto the caller's own
     *  interactive element. */
    trigger: Snippet<[ToolbarDisclosureTriggerAttrs]>;
    /** Optional content rendered as a sibling of the trigger, inside the same containment boundary
     *  (a facet's own inline clear button, say): it never counts as "outside" or "left" for the
     *  dismissal mechanics below. */
    extra?: Snippet;
    /** Renders the panel's own content. Receives the `id` the trigger's `aria-controls` resolves
     *  to; the caller's own root element (whatever tag its content needs) carries it. */
    panel: Snippet<[ToolbarDisclosurePanelAttrs]>;
  }

  let { open, onOpenChange, ariaHaspopup, containerClass, emphasized = false, trigger, extra, panel }: Props =
    $props();

  const uid = $props.id();
  const panelId = `${uid}-panel`;

  let containerEl = $state<HTMLElement | null>(null);
  // Captured from the trigger's own click event: this component never renders the trigger element
  // itself, so it holds no ref to it until the trigger actually opens the panel. Escape's own
  // focus-return is the only mechanic that needs it (a disclosure only ever opens via this click).
  let triggerEl = $state<HTMLElement | null>(null);

  function toggle(event: MouseEvent) {
    triggerEl = event.currentTarget as HTMLElement;
    onOpenChange(!open);
  }

  function close(returnFocus: boolean) {
    if (!open) return;
    onOpenChange(false);
    if (returnFocus) triggerEl?.focus();
  }

  const triggerAttrs = $derived<ToolbarDisclosureTriggerAttrs>({
    'aria-expanded': open,
    'aria-controls': panelId,
    'aria-haspopup': ariaHaspopup,
    onclick: toggle,
  });
  const panelAttrs = $derived<ToolbarDisclosurePanelAttrs>({ id: panelId });

  // Mechanic: focus moves into the panel on open. Generic fallback (the caller's own content may
  // additionally manage its own focus, e.g. a menu's roving tabindex reacting to this same focus
  // move via its own onfocus handler); see this component's own header comment.
  $effect(() => {
    if (!open) return;
    tick().then(() => {
      const panelEl = document.getElementById(panelId);
      panelEl
        ?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]')
        ?.focus();
    });
  });

  // Mechanic: Escape closes the disclosure and returns focus to the trigger.
  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    }
  }

  // Mechanic: a pointerdown outside the trigger-plus-panel closes without moving focus.
  function onWindowPointerdown(event: PointerEvent) {
    if (open && containerEl && !containerEl.contains(event.target as Node)) {
      close(false);
    }
  }

  // Mechanic: focus leaving the trigger-plus-panel (a Tab out) closes without moving focus. Native
  // `focusout` bubbles from whichever descendant lost focus, so one listener on the container
  // covers the trigger, `extra`, and the panel alike.
  function onContainerFocusOut(event: FocusEvent) {
    if (!open) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !containerEl?.contains(next)) close(false);
  }
</script>

<svelte:window onkeydown={onWindowKeydown} onpointerdown={onWindowPointerdown} />

<div
  class="dropdown toolkit-toolbar-disclosure {containerClass ?? ''}"
  class:dropdown-open={open}
  class:toolkit-toolbar-facet-applied={emphasized}
  bind:this={containerEl}
  onfocusout={onContainerFocusOut}
>
  {@render trigger(triggerAttrs)}
  {#if extra}{@render extra()}{/if}
  {@render panel(panelAttrs)}
</div>

<style>
  /* `ListToolbar`'s own `'menu'`-facet box chrome (`containerClass="toolkit-toolbar-facet"`):
     a quiet bordered pair (trigger plus optional clear), sharing the toolbar row's 30px height.
     `display: inline-flex; align-items: stretch` stretches both children to that height, since
     neither sets its own; `overflow` stays default (visible), since this element is also the
     panel's own `position: absolute` containing block (daisyUI's own `.dropdown`/`.dropdown-
     content` pair, kept via the always-applied `dropdown` class above) and `hidden` would clip the
     panel away entirely rather than just tidy the trigger/clear corners. Moved verbatim from
     `ListToolbar`'s own style, since this containing element is this component's own markup (see
     this component's own header comment on why `containerClass`/`emphasized` exist at all). */
  .toolkit-toolbar-facet {
    display: inline-flex;
    align-items: stretch;
    flex: 0 0 auto;
    height: 30px;
    border-radius: var(--radius-field);
    border: 1px solid var(--cairn-card-border);
    background: transparent;
  }

  /* The bordered-and-tinted emphasized treatment (a facet with an applied value): border and fill
     mixed from --color-primary, moved verbatim from ListToolbar's own facet styling since this
     containing element is this component's own markup (see this component's own header comment on
     why containerClass/emphasized exist at all). */
  .toolkit-toolbar-facet-applied {
    border-color: color-mix(in oklab, var(--color-primary) 45%, var(--cairn-card-border));
    background: color-mix(in oklab, var(--color-primary) 7%, transparent);
  }

  /* Neutralizes daisyUI's own `:focus-within` disclosure path (the coherence-round finding this
     extraction carries forward): the compiled `.dropdown` rule shows `.dropdown-content` on
     `.dropdown-open`, `.dropdown-hover:hover`, OR `:focus-within`, so tabbing onto a trigger opened
     the panel on focus alone while `aria-expanded` -- driven purely by the `open` prop -- stayed
     `false`. `!important` is deliberate: the compiled rule already carries a heavier selector, so
     this states "closed means closed" outright rather than out-specificity-ing it. Only the hidden
     state needs a rule here; the open state shows the panel via its own natural CSS (the caller's
     own `dropdown-content`/`menu` classes, or whatever else its panel snippet renders), not a
     `display` value this component would have to guess and re-assert. */
  .toolkit-toolbar-disclosure:not(.dropdown-open) :global(.dropdown-content) {
    display: none !important;
  }
</style>
