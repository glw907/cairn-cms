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

`aria-describedby` is set imperatively on the trigger's own rendered root element (the wrapper's
first child once the `children` snippet mounts), not spread through a snippet parameter: the sweep
this component exists for wraps existing buttons and links unchanged, so the trigger keeps
whatever attributes it already carries and this component adds exactly one.

The bubble text stays in the accessibility tree at all times (hidden only by an opacity/visibility
toggle, never `hidden` or `display: none`), so a screen reader can still resolve `aria-describedby`
on a trigger this component's own hover/focus mechanics never opened, matching how `aria-describedby`
resolves everywhere else.
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
     *  `aria-describedby` to its rendered root element. */
    children: Snippet;
  }

  let { text, id, children }: Props = $props();

  const generatedId = $props.id();
  const bubbleId = $derived(id ?? `${generatedId}-tooltip`);

  let wrapperEl: HTMLElement | null = null;
  let bubbleEl: HTMLElement | null = null;
  let hoverOn = $state(false);
  let focusOn = $state(false);
  let tapOn = $state(false);
  let escaped = $state(false);
  const hasText = $derived(text.length > 0);
  const visible = $derived(hasText && !escaped && (hoverOn || focusOn || tapOn));

  // Sets aria-describedby on the trigger's own rendered root element, never on this component's
  // wrapper: the wrapper carries no accessible role of its own, and the description has to resolve
  // from whichever element actually receives focus. Re-runs whenever the wrapper or the bubble id
  // changes, and cleans up on unmount so a later Tooltip reusing the same DOM node never inherits a
  // stale value. A no-op while `text` is empty (see the prop's own doc comment).
  $effect(() => {
    if (!hasText) return;
    const trigger = wrapperEl?.firstElementChild;
    if (!(trigger instanceof HTMLElement)) return;
    trigger.setAttribute('aria-describedby', bubbleId);
    return () => {
      trigger.removeAttribute('aria-describedby');
    };
  });

  // Anchors the bubble to the trigger's own box rather than a CSS positioned-ancestor scheme: the
  // wrapper renders no box of its own (`display: contents`, see the style block below), so the
  // bubble's actual DOM parent for CSS containing-block purposes is whatever ancestor outside this
  // component happens to be positioned, which the sweep's real call sites (EditorToolbar, EditPage)
  // never guarantee. Reading the trigger's own `getBoundingClientRect()` and writing `left`/`top`
  // in pixels on the fixed-positioned bubble (see the style block) ties the bubble to its own
  // trigger regardless of what sits in between. Re-runs whenever the bubble becomes visible, since
  // a hidden bubble's position never needs to track a trigger that might move under it while closed.
  $effect(() => {
    if (!visible || !bubbleEl) return;
    const trigger = wrapperEl?.firstElementChild;
    if (!(trigger instanceof HTMLElement)) return;
    const rect = trigger.getBoundingClientRect();
    bubbleEl.style.left = `${rect.left + rect.width / 2}px`;
    bubbleEl.style.top = `${rect.top}px`;
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
    class="cairn-tooltip-bubble"
    class:cairn-tooltip-visible={visible}
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

  /* `position: fixed` rather than `position: absolute` off a positioned trigger: the wrapper is
     boxless (`display: contents` above), so this bubble's own CSS containing block is whichever
     ancestor OUTSIDE this component happens to be positioned, which a real sweep site (a plain
     `.btn` inside EditorToolbar's flex row) never guarantees. A fixed-position box's containing
     block is the viewport regardless of what sits between, so the script's own effect writes
     `left`/`top` in viewport pixels straight from the trigger's `getBoundingClientRect()`, and this
     rule only supplies the gap and the centering as a transform relative to that point. */
  .cairn-tooltip-bubble {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 20;
    width: max-content;
    max-width: 16rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.3;
    text-align: center;
    transform: translate(-50%, calc(-100% - 0.375rem));
    opacity: 0;
    visibility: hidden;
    transition: opacity 120ms ease;
    pointer-events: none;
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

  .cairn-tooltip-visible {
    opacity: 1;
    visibility: visible;
  }

  @media (prefers-reduced-motion: reduce) {
    .cairn-tooltip-bubble {
      transition: none;
    }
  }
</style>
