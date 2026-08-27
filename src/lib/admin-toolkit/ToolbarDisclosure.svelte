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
(`aria-expanded`/`aria-controls`/`aria-haspopup`/`onclick` for the trigger, `id` and `hidden` for
the panel's own root element) rather than elements this component renders itself. This is
deliberate: a `'menu'` facet's ARIA-menu content (`role="menu"`, `role="menuitemradio"`, arrow-key
roving, reset-to-first-on-open via each option's own `onfocus`) is facet behavior, not disclosure
mechanics, and stays entirely in `ListToolbar`'s own panel snippet rather than shipping
`ListToolbar`-specific vocabulary in a general-purpose primitive. `ariaHaspopup` only carries the
trigger's own `aria-haspopup` value through (e.g. `'menu'`); this component has no opinion on what
kind of panel content that implies.

Focus-into-panel-on-open is a generic fallback: the first focusable descendant of whatever the
panel snippet renders (button, link, form control, or an explicit `tabindex`) receives focus once
the panel is visible. A caller with its own more specific idea of what "first" means (a menu's own
roving-tabindex option, say) still gets it for free, since focusing that same first element fires
its own `onfocus` handler, if it has one, the same way a real Tab keypress would. An instance whose
`open` starts `true` (a caller that seeds an already-open disclosure) never yanks focus at mount:
the effect's first run is a no-op for the auto-focus step, since a page load stealing focus into a
panel nobody asked to open yet is worse than a caller's own explicit opening interaction not
re-triggering it.

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

The containing element itself is deliberately non-interactive (no role, no tabindex): its Escape
and focusout listeners are event delegation over whatever the trigger/extra/panel snippets render,
not an affordance of their own an AT user should be told about, so they attach imperatively from
`$effect`/an inline handler rather than a declarative `role`-bearing element.
-->
<script module lang="ts">
  import { createAttachmentKey, type Attachment } from 'svelte/attachments';

  /** Attributes to spread onto the caller's own trigger element, last in the spread order so
   *  this component's own `onclick` (the toggle handler) is never shadowed by a caller-supplied
   *  one on the same element. `aria-expanded` and `aria-controls` track this disclosure's open
   *  state; `aria-haspopup` forwards the `ariaHaspopup` prop when given; the symbol-keyed
   *  attachment captures the trigger's own DOM node on mount, for Escape's own focus-return (see
   *  this component's own header comment). */
  export interface ToolbarDisclosureTriggerAttrs {
    'aria-expanded': boolean;
    'aria-controls': string;
    'aria-haspopup': ToolbarDisclosureAriaHaspopup | undefined;
    onclick: (event: MouseEvent) => void;
    [key: symbol]: Attachment<HTMLElement>;
  }

  /** Attributes to spread onto the caller's own panel root element. `id` is what the trigger's
   *  `aria-controls` resolves to. `hidden` is this component's own hiding: `true` while closed,
   *  `undefined` while open, so an omitted `dropdown-content` positioning class on the caller's
   *  panel root can never leave the panel visible and tabbable while `aria-expanded` reads
   *  `false`. The caller's own panel root still wants `dropdown-content` for positioning (this
   *  component's own style block also neutralizes daisyUI's own `:focus-within` reveal on that
   *  class), but showing/hiding the panel is this component's job, not the caller's class string. */
  export interface ToolbarDisclosurePanelAttrs {
    id: string;
    hidden: true | undefined;
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
     *  interactive element, last in the spread order (see `ToolbarDisclosureTriggerAttrs`). */
    trigger: Snippet<[ToolbarDisclosureTriggerAttrs]>;
    /** Optional content rendered as a sibling of the trigger, inside the same containment boundary
     *  (a facet's own inline clear button, say): it never counts as "outside" or "left" for the
     *  dismissal mechanics below. */
    extra?: Snippet;
    /** Renders the panel's own content. Receives the `id` the trigger's `aria-controls` resolves
     *  to and the `hidden` state (see `ToolbarDisclosurePanelAttrs`); the caller's own root
     *  element (a `dropdown-content`-classed element, whatever tag its content needs) carries
     *  both. */
    panel: Snippet<[ToolbarDisclosurePanelAttrs]>;
  }

  let { open, onOpenChange, ariaHaspopup, containerClass, trigger, extra, panel }: Props = $props();

  const uid = $props.id();
  const panelId = `${uid}-panel`;

  // Read only imperatively (dismissal-boundary containment checks, and the panel/trigger focus
  // calls below), never rendered reactively, so a plain `let` suffices; neither needs `$state`.
  let containerEl: HTMLElement | null = null;
  let triggerEl: HTMLElement | null = null;
  // Captured by the trigger attrs' own attachment (see this component's own header comment): live
  // from the trigger's own mount, not from a click event, so a parent-driven open (never routed
  // through this component's own toggle) still gets a correct Escape focus-return. The cleanup
  // nulls the ref back out on unmount/re-attachment, so a stale node from a prior trigger element
  // never lingers.
  const attachTriggerRef: Attachment<HTMLElement> = (node) => {
    triggerEl = node;
    return () => {
      triggerEl = null;
    };
  };
  // Minted once per instance: a fresh key on every `open` change would recreate the attachment
  // (and re-run its mount/cleanup) for no reason, since the ref it captures is the same trigger
  // node throughout the disclosure's lifetime.
  const triggerRefKey = createAttachmentKey();

  const triggerAttrs = $derived<ToolbarDisclosureTriggerAttrs>({
    'aria-expanded': open,
    'aria-controls': panelId,
    'aria-haspopup': ariaHaspopup,
    onclick: toggle,
    [triggerRefKey]: attachTriggerRef,
  });
  // Primitive-owned hiding: `hidden` tracks `open` directly, so an omitted `dropdown-content`
  // positioning class on the caller's panel root can no longer leave the panel visible and
  // tabbable while `aria-expanded` reads `false` (see `ToolbarDisclosurePanelAttrs`, above).
  const panelAttrs = $derived<ToolbarDisclosurePanelAttrs>({
    id: panelId,
    hidden: open ? undefined : true,
  });

  function toggle() {
    if (open) {
      close();
    } else {
      onOpenChange(true);
    }
  }

  // The single close chokepoint every dismissal mechanic (toggle, Escape, outside-pointerdown,
  // focusout) routes through: focus returns to the trigger exactly when the trigger-plus-panel
  // still holds it at close time, computed here rather than passed in by each caller, so a click
  // that closes the trigger (focus already on the trigger itself), an Escape from inside the
  // panel, or a pointerdown that has not yet shifted focus away all get the same correct answer
  // without duplicating the containment check at every call site. A real Tab-out or a real click
  // on an outside element has already moved `document.activeElement` by the time its event
  // reaches this function (the browser updates the focused element before dispatching
  // blur/focusout on the old one), so those two mechanics naturally compute `false` on their own.
  function close() {
    if (!open) return;
    const returnFocus = !!containerEl && containerEl.contains(document.activeElement);
    onOpenChange(false);
    if (returnFocus) triggerEl?.focus();
  }

  // Mechanic: focus moves into the panel on open. Generic fallback (the caller's own content may
  // additionally manage its own focus, e.g. a menu's roving tabindex reacting to this same focus
  // move via its own onfocus handler); see this component's own header comment. `:not([tabindex=
  // "-1"])` on every branch excludes a roving-tabindex option that is not (yet) the tab stop (a
  // `'menu'` facet reopened after a prior selection moved the checked option away from index 0):
  // without it, `button`/`[href]`/etc. match unconditionally regardless of `tabindex`, and the
  // first DOM match can be an element that is not actually reachable by a real Tab keypress.
  // `cancelled` guards a stale `tick()` resolution (a close/reopen within the same tick) from
  // stealing focus after the fact; the panel is resolved by `id` WITHIN `containerEl` rather than
  // `document.getElementById`, so a duplicate id anywhere else in the document can never steal
  // this lookup. `skipMountFocus` (computed only on this effect's very first run) leaves an
  // instance mounted with `open` already `true` alone: this component never yanks focus at page
  // load for a caller that seeded an already-open disclosure, only for its own later open
  // transitions.
  let isFirstFocusEffectRun = true;
  $effect(() => {
    const skipMountFocus = isFirstFocusEffectRun && open;
    isFirstFocusEffectRun = false;
    if (!open || skipMountFocus) return;
    let cancelled = false;
    tick().then(() => {
      if (cancelled) return;
      const panelEl = containerEl?.querySelector<HTMLElement>(`[id="${panelId}"]`);
      panelEl
        ?.querySelector<HTMLElement>(
          'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
    return () => {
      cancelled = true;
    };
  });

  // Mechanic: Escape closes the disclosure and returns focus to the trigger. A container-scoped
  // listener (rather than a `<svelte:window>` one) restores the prior, pre-extraction semantics:
  // Escape only closes when the event target is within the trigger-plus-panel, the same
  // containment boundary the pointerdown and focusout mechanics below already honor, rather than
  // any Escape anywhere in the document. `stopPropagation` alongside `preventDefault` so a
  // disclosure nested inside a modal (or another disclosure) closes only itself, not whatever
  // Escape handling its ancestor also carries. Attached programmatically via `$effect`, not a
  // declarative `onkeydown`, since the container carries no interactive role of its own (it is
  // event delegation, not an affordance a11y should announce; see this component's own header
  // comment).
  function onContainerKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }
  $effect(() => {
    const el = containerEl;
    if (!el) return;
    el.addEventListener('keydown', onContainerKeydown);
    return () => el.removeEventListener('keydown', onContainerKeydown);
  });

  // Mechanic: a pointerdown outside the trigger-plus-panel closes without moving focus (in the
  // realistic case: the browser's own default focus action for the click, which fires after this
  // handler runs, lands focus on whatever the user actually clicked, superseding any focus this
  // component applies here).
  function onWindowPointerdown(event: PointerEvent) {
    if (open && containerEl && !containerEl.contains(event.target as Node)) {
      close();
    }
  }

  // Mechanic: focus leaving the trigger-plus-panel (a Tab out) closes without moving focus. Native
  // `focusout` bubbles from whichever descendant lost focus, so one listener on the container
  // covers the trigger, `extra`, and the panel alike. `document.hasFocus()` guards against a
  // window-level blur (tabbing to browser chrome, switching windows, opening devtools): that also
  // fires a `focusout` with no `relatedTarget`, which would otherwise read identically to a real
  // Tab out of the panel and wrongly close it.
  function onContainerFocusOut(event: FocusEvent) {
    if (!open || !document.hasFocus()) return;
    const next = event.relatedTarget as Node | null;
    if (!next || !containerEl?.contains(next)) close();
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
     this states "closed means closed" outright rather than out-specificity-ing it. The panel's own
     `hidden` attribute (set via `ToolbarDisclosurePanelAttrs`, above) is the primary hiding
     mechanism now; this rule stays as defense in depth for a caller's own `dropdown-content` panel
     root, since `hidden` and a `display` value both applying is harmless. Only the hidden state
     needs a rule here; the open state shows the panel via its own natural CSS (the caller's own
     `dropdown-content`/`menu` classes, or whatever else its panel snippet renders), not a
     `display` value this component would have to guess and re-assert. */
  .toolkit-toolbar-disclosure:not(.dropdown-open) :global(.dropdown-content) {
    display: none !important;
  }
</style>
