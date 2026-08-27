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
it of its own accord; the trigger attrs carry a Svelte attachment (`svelte/attachments`,
`createAttachmentKey`) that captures the DOM node whenever the caller's trigger element mounts,
independent of any click. This is deliberate: a parent that drives `open` programmatically (never
routing through this component's own `toggle`) still gets a correct Escape focus-return, since the
ref is live from mount rather than sourced from a click event's own `currentTarget`.

An optional `extra` snippet renders as a sibling of the trigger, inside the same containment
boundary as the trigger and panel: a facet's own inline clear button, for instance, which must
never count as "outside" for the pointerdown mechanic or "left" for the focusout mechanic.

`containerClass` is the one piece of visual configuration this component carries: extra classes
for the disclosure's own containing element (the outside-pointerdown and focusout boundary, and
the panel's `position: absolute` containing block, via daisyUI's own `dropdown` class this
component always applies). This component emits only its own generic classes
(`dropdown`/`toolkit-toolbar-disclosure`/`dropdown-open`) on that element; any consumer-specific
chrome a caller wants on its own containing element (a facet's applied-state tint, say) travels in
through `containerClass` itself, and the caller's own `:global()` styling reaches it, since the
containing element is this component's own markup and a caller's own scoped `<style>` cannot reach
it any other way without duplicating the rule back into the caller.
-->
<script module lang="ts">
  import { createAttachmentKey, type Attachment } from 'svelte/attachments';

  /** Attributes to spread onto the caller's own trigger element. `aria-expanded` and
   *  `aria-controls` track this disclosure's open state; `aria-haspopup` forwards the
   *  `ariaHaspopup` prop when given; `onclick` toggles `open` through `onOpenChange`; the
   *  symbol-keyed attachment captures the trigger's own DOM node on mount, for Escape's own
   *  focus-return (see this component's own header comment). */
  export interface ToolbarDisclosureTriggerAttrs {
    'aria-expanded': boolean;
    'aria-controls': string;
    'aria-haspopup': ToolbarDisclosureAriaHaspopup | undefined;
    onclick: (event: MouseEvent) => void;
    [key: symbol]: Attachment<HTMLElement>;
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

  let { open, onOpenChange, ariaHaspopup, containerClass, trigger, extra, panel }: Props = $props();

  const uid = $props.id();
  const panelId = `${uid}-panel`;

  let containerEl = $state<HTMLElement | null>(null);
  // Captured by the trigger attrs' own attachment (see this component's own header comment): live
  // from the trigger's own mount, not from a click event, so a parent-driven open (never routed
  // through this component's own toggle) still gets a correct Escape focus-return.
  let triggerEl = $state<HTMLElement | null>(null);
  const attachTriggerRef: Attachment<HTMLElement> = (node) => {
    triggerEl = node;
  };

  function toggle() {
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
    [createAttachmentKey()]: attachTriggerRef,
  });
  const panelAttrs = $derived<ToolbarDisclosurePanelAttrs>({ id: panelId });

  // Mechanic: focus moves into the panel on open. Generic fallback (the caller's own content may
  // additionally manage its own focus, e.g. a menu's roving tabindex reacting to this same focus
  // move via its own onfocus handler); see this component's own header comment. `:not([tabindex=
  // "-1"])` on every branch excludes a roving-tabindex option that is not (yet) the tab stop (a
  // `'menu'` facet reopened after a prior selection moved the checked option away from index 0):
  // without it, `button`/`[href]`/etc. match unconditionally regardless of `tabindex`, and the
  // first DOM match can be an element that is not actually reachable by a real Tab keypress.
  $effect(() => {
    if (!open) return;
    tick().then(() => {
      const panelEl = document.getElementById(panelId);
      panelEl
        ?.querySelector<HTMLElement>(
          'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
  });

  // Mechanic: Escape closes the disclosure and returns focus to the trigger. A container-scoped
  // listener (rather than a `<svelte:window>` one) restores the prior, pre-extraction semantics:
  // Escape only closes when the event target is within the trigger-plus-panel, the same
  // containment boundary the pointerdown and focusout mechanics below already honor, rather than
  // any Escape anywhere in the document. Attached programmatically via `$effect`, not a
  // declarative `onkeydown`, since the container carries no interactive role of its own (it is
  // event delegation, not an affordance a11y should announce).
  function onContainerKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    }
  }
  $effect(() => {
    const el = containerEl;
    if (!el) return;
    el.addEventListener('keydown', onContainerKeydown);
    return () => el.removeEventListener('keydown', onContainerKeydown);
  });

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

<svelte:window onpointerdown={onWindowPointerdown} />

<div
  class="dropdown toolkit-toolbar-disclosure {containerClass ?? ''}"
  class:dropdown-open={open}
  bind:this={containerEl}
  onfocusout={onContainerFocusOut}
>
  {@render trigger(triggerAttrs)}
  {#if extra}{@render extra()}{/if}
  {@render panel(panelAttrs)}
</div>

<style>
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
