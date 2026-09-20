<!--
@component
The admin toolkit's one hover/focus description primitive, graduated to replace a native `title`
attribute on an icon-only action control. A native `title` never reaches a keyboard user (no
`:focus-visible` trigger, no Escape dismissal) and never reaches a touch user (no hover at all), so
an icon button whose only accessible name comes from `aria-label` still leaves a sighted mouse
user's "why" undiscoverable on every other input mode. This component wraps the control instead:
it renders the given trigger unchanged, points `aria-describedby` at its own rendered text, and
drives the bubble's visibility from whichever input mode is active.

Shows on hover (`mouseenter`/`mouseleave`) and on `:focus-visible` (checked on the actual focused
descendant at `focusin` time, so a mouse click that focuses the trigger does not also open the
bubble the way a keyboard Tab does); hides on Escape without moving focus off the trigger, since
Escape only clears this component's own visibility state, never calls `.blur()`. A coarse pointer
(a real touchscreen tap, detected from the triggering `PointerEvent`'s own `pointerType`, never
`matchMedia`, since a hybrid device can carry both a mouse and a touchscreen at once) shows the
bubble on tap and hides on the next tap outside the wrapper, mirroring a native tooltip's own
touch fallback.

The bubble is a manual popover placed by CSS anchor positioning, the same recipe the editor
toolbar's own menus use: the trigger carries an `anchor-name` unique to this instance and the
bubble carries the matching `position-anchor` with a `position-area` above it. A popover renders in
the top layer, so no transformed, scaled, or `overflow: hidden` ancestor can displace or clip it,
which a coordinate-writing scheme cannot promise (an open daisyUI modal's own box sets both a
`translate` and an `overflow: hidden`, and any transform establishes a containing block for fixed
descendants). Anchor positioning also tracks the trigger through scroll and resize with no
listener of this component's own, and `position-try-fallbacks` flips the bubble below the trigger
when there is no room above.

`aria-describedby` is set imperatively on the trigger's own rendered root element (the wrapper's
first child once the `children` snippet mounts), not spread through a snippet parameter: the sweep
this component exists for wraps existing buttons and links unchanged, so the trigger keeps
whatever attributes it already carries and this component adds exactly one. The same effect writes
the trigger's `anchor-name`, for the same reason.

A closed popover is not rendered at all, but an element referenced by `aria-describedby` still
contributes its text however it is hidden (the accessible-description computation traverses into a
hidden referenced subtree by design), so the description resolves on a trigger this component's
own hover/focus mechanics never opened, matching how `aria-describedby` resolves everywhere else.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The tooltip's own text, rendered inside the bubble and pointed at by the trigger's
     *  `aria-describedby`. An empty string opts out entirely (no `aria-describedby`, no bubble,
     *  every hover/focus/tap mechanic a no-op): the sweep this component exists for wraps a few
     *  sites whose reason is conditional (a guarded button's own explanation, present only while
     *  guarded), and an empty string is how a caller passes "nothing to say right now" without a
     *  second, conditionally-rendered copy of the whole trigger. */
    text: string;
    /** An id for the bubble element. Omit to use `$props.id()`'s own generated id. */
    id?: string;
    /** Renders the trigger control (a button or a link) unchanged; this component adds only
     *  `aria-describedby` and an `anchor-name` to its rendered root element. */
    children: Snippet;
  }

  let { text, id, children }: Props = $props();

  const generatedId = $props.id();
  const bubbleId = $derived(id ?? `${generatedId}-tooltip`);
  // A dashed-ident anchor name unique to this instance. Non-ident characters in the generated id
  // are collapsed, since an anchor name is a CSS identifier while an element id is not.
  const anchorName = $derived(`--cairn-tooltip-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '-')}`);

  let wrapperEl: HTMLElement | null = null;
  let bubbleEl: HTMLElement | null = null;
  let hoverOn = $state(false);
  let focusOn = $state(false);
  let tapOn = $state(false);
  let escaped = $state(false);
  const hasText = $derived(text.length > 0);
  const visible = $derived(hasText && !escaped && (hoverOn || focusOn || tapOn));

  // Sets aria-describedby and the anchor name on the trigger's own rendered root element, never on
  // this component's wrapper: the wrapper renders no box of its own, so it can be neither the
  // element that receives focus nor an anchor (a boxless element cannot anchor anything). Re-runs
  // whenever the wrapper, the bubble id, or the anchor name changes, and cleans up on unmount so a
  // later Tooltip reusing the same DOM node never inherits a stale value. A no-op while `text` is
  // empty (see the prop's own doc comment).
  $effect(() => {
    if (!hasText) return;
    const trigger = wrapperEl?.firstElementChild;
    if (!(trigger instanceof HTMLElement)) return;
    trigger.setAttribute('aria-describedby', bubbleId);
    trigger.style.setProperty('anchor-name', anchorName);
    return () => {
      trigger.removeAttribute('aria-describedby');
      trigger.style.removeProperty('anchor-name');
    };
  });

  // Drives the popover from the derived visibility rather than from each handler, so the several
  // input modes cannot disagree about whether the bubble is open. Both popover methods throw when
  // the popover is already in the state they ask for, hence the guard on each.
  $effect(() => {
    if (!bubbleEl) return;
    const open = bubbleEl.matches(':popover-open');
    if (visible && !open) bubbleEl.showPopover();
    else if (!visible && open) bubbleEl.hidePopover();
  });

  // Cleans up the outside-tap listener a coarse-pointer tap registers below; re-run whenever tapOn
  // flips, so an open tap-triggered bubble always carries exactly one listener, never a duplicate
  // from a second tap before the first cleanup ran.
  $effect(() => {
    if (!tapOn) return;
    const onOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && wrapperEl?.contains(event.target)) return;
      tapOn = false;
    };
    document.addEventListener('pointerdown', onOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown);
    };
  });

  function handleMouseEnter() {
    if (!hasText) return;
    escaped = false;
    hoverOn = true;
  }

  function handleMouseLeave() {
    hoverOn = false;
  }

  function handleFocusIn(event: FocusEvent) {
    if (!hasText) return;
    if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) {
      escaped = false;
      focusOn = true;
    }
  }

  function handleFocusOut(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && wrapperEl?.contains(next)) return;
    focusOn = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !visible) return;
    escaped = true;
  }

  function handlePointerUp(event: PointerEvent) {
    if (!hasText || event.pointerType !== 'touch') return;
    escaped = false;
    tapOn = !tapOn;
  }
</script>

<!-- The wrapper is deliberately non-interactive (no role, no tabindex): its hover/focus/keydown
     listeners are delegation over whatever the children snippet renders, not an affordance of
     their own an AT user should be told about, matching ToolbarDisclosure's own containing
     element. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
  bind:this={wrapperEl}
  class="cairn-tooltip"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocusin={handleFocusIn}
  onfocusout={handleFocusOut}
  onkeydown={handleKeydown}
  onpointerup={handlePointerUp}
>
  {@render children()}
  <span
    bind:this={bubbleEl}
    id={bubbleId}
    role="tooltip"
    popover="manual"
    class="cairn-tooltip-bubble"
    style="position-anchor:{anchorName}"
  >
    {text}
  </span>
</span>

<style>
  /* Layout only, scoped rather than a Tailwind utility string: `admin-toolkit` sits outside
     `custom-surface-budget.json`'s `markupDirs`, so this block faces no budget. `display: contents`:
     a direct flex-item child is blockified regardless of its own declared `display` (the CSS
     Flexbox spec forces this), so even `inline`/`inline-flex` on this wrapper still measured wider
     than the bare trigger once every button in a dense row carried one, pushing EditorToolbar's
     format cluster past its 49rem fit cap. `display: contents` is the one value exempt from
     blockification: the wrapper generates no box of its own, and its children (the trigger, the
     bubble) become the flex container's real participants directly, exactly matching the
     pre-Tooltip layout. */
  .cairn-tooltip {
    display: contents;
  }

  /* The bubble is a manual popover, so the browser renders it in the top layer and no ancestor's
     transform, scale, or `overflow: hidden` can displace or clip it. `position-area: top` off the
     trigger's own `anchor-name` (written by the script's effect above) places it centered above
     that one trigger, and `position-try-fallbacks: flip-block` moves it below when the top edge
     has no room. `inset: auto` and `margin: 0` undo the UA popover sheet, whose `inset: 0` plus
     `margin: auto` would otherwise stretch the bubble across the whole position area. */
  .cairn-tooltip-bubble {
    position: fixed;
    inset: auto;
    position-area: top;
    position-try-fallbacks: flip-block;
    align-self: end;
    justify-self: anchor-center;
    margin: 0 0 0.375rem 0;
    border: 0;
    width: max-content;
    max-width: 16rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.3;
    text-align: center;
    opacity: 1;
    pointer-events: none;
    transition: opacity 120ms ease, display 120ms allow-discrete, overlay 120ms allow-discrete;
    /* Literal fallbacks precede every custom-property read below (--cairn-shadow, --color-neutral,
       --color-neutral-content), since a consumer's own admin screen (this toolkit's other
       audience) never guarantees the cairn admin theme root is an ancestor; see StatusChip.svelte's
       own header comment for the same discipline. */
    background-color: oklch(32% 0.012 75);
    background-color: var(--color-neutral, oklch(32% 0.012 75));
    color: oklch(96% 0.004 75);
    color: var(--color-neutral-content, oklch(96% 0.004 75));
    box-shadow: 0 1px 2px oklch(28% 0.02 75 / 0.05), 0 8px 24px -6px oklch(28% 0.02 75 / 0.1);
    box-shadow: var(--cairn-shadow, 0 1px 2px oklch(28% 0.02 75 / 0.05), 0 8px 24px -6px oklch(28% 0.02 75 / 0.1));
  }

  /* The entrance fade, keyed off the popover's own open state so the discrete display change
     animates with it; @starting-style supplies the from value a first render otherwise has none
     for. */
  @starting-style {
    .cairn-tooltip-bubble:popover-open {
      opacity: 0;
    }
  }

  .cairn-tooltip-bubble:not(:popover-open) {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .cairn-tooltip-bubble {
      transition: none;
    }
  }
</style>
