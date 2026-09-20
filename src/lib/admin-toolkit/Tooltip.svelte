<!--
@component
The admin toolkit's one hover/focus description primitive, graduated to replace a native `title`
attribute on an icon-only action control. A native `title` never reaches a keyboard user (no
`:focus-visible` trigger, no Escape dismissal) and never reaches a touch user (no hover at all), so
an icon button whose only accessible name comes from `aria-label` still leaves a sighted mouse
user's "why" undiscoverable on every other input mode. This component wraps the control instead:
it renders the given trigger unchanged, points `aria-describedby` at its own rendered text when
that text says something the trigger's accessible name does not, and drives the bubble's visibility
from whichever input mode is active.

Shows on hover (`mouseenter`/`mouseleave`) and on `:focus-visible` (checked on the actual focused
descendant at `focusin` time, so a mouse click that focuses the trigger does not also open the
bubble the way a keyboard Tab does); hides on Escape without moving focus off the trigger, since
Escape only clears this component's own visibility state, never calls `.blur()`. A coarse pointer
(a real tap, detected from the triggering `PointerEvent`'s own `pointerType`, never `matchMedia`,
since a hybrid device can carry both a mouse and a touchscreen at once) shows the bubble on tap and
hides on the next tap outside the wrapper, mirroring a native tooltip's own touch fallback. A tap
or click that activates an enabled trigger hides the bubble instead of stranding it over whatever
the activation opened; a trigger marked `aria-disabled="true"` activates nothing, so its bubble
stays, which is the guarded-control case this component exists for.

The three WCAG 1.4.13 (Content on Hover or Focus) bullets are all this component's own to meet,
since it authors the bubble rather than leaving it to user-agent `title` presentation. Dismissible:
a `document`-level Escape listener, so the key works wherever focus sits. Hoverable: the bubble
takes pointer events and a `::before` hit area bridges the gap between trigger and bubble, so a
pointer can travel into the bubble without closing it. Persistent: nothing hides the bubble on a
timer.

The bubble is a manual popover placed by CSS anchor positioning, the same recipe the editor
toolbar's own menus use: the trigger carries an `anchor-name` unique to this instance and the
bubble carries the matching `position-anchor` with a `position-area` above it. A popover renders in
the top layer, so no transformed, scaled, or `overflow: hidden` ancestor can displace or clip it,
which a coordinate-writing scheme cannot promise (an open daisyUI modal's own box sets both a
`translate` and an `overflow: hidden`, and any transform establishes a containing block for fixed
descendants). Anchor positioning also tracks the trigger through scroll and resize with no
listener of this component's own, and `position-try-fallbacks` flips the bubble below the trigger
when there is no room above. A browser without anchor positioning would paint the bubble at an
unplaced position, so there the bubble is not rendered at all and the description alone carries the
text.

`aria-describedby` is set imperatively on the trigger's own rendered root element (the wrapper's
first child once the `children` snippet mounts), not spread through a snippet parameter: the sweep
this component exists for wraps existing buttons and links unchanged, so the trigger keeps
whatever attributes it already carries and this component adds exactly one. The same effect writes
the trigger's `anchor-name`, for the same reason, appending to any inline `anchor-name` the trigger
already declares for a popover menu of its own rather than replacing it.

A closed popover is not rendered at all, but an element referenced by `aria-describedby` still
contributes its text however it is hidden (the accessible-description computation traverses into a
hidden referenced subtree by design), so the description resolves on a trigger this component's
own hover/focus mechanics never opened, matching how `aria-describedby` resolves everywhere else.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** The tooltip's own text, rendered inside the bubble and pointed at by the trigger's
     *  `aria-describedby` when it differs from the trigger's accessible name. An empty string opts
     *  out entirely (no `aria-describedby`, no bubble, every hover/focus/tap mechanic a no-op):
     *  the sweep this component exists for wraps a few sites whose reason is conditional (a
     *  guarded button's own explanation, present only while guarded), and an empty string is how a
     *  caller passes "nothing to say right now" without a second, conditionally-rendered copy of
     *  the whole trigger. */
    text: string;
    /** An id for the bubble element. Omit to use `$props.id()`'s own generated id. */
    id?: string;
    /** Renders the trigger control (a button or a link) unchanged; this component adds only
     *  `aria-describedby` and an `anchor-name` to its rendered root element. Exactly one element,
     *  never bare text and never two siblings: the first element is the trigger this component
     *  describes and anchors. A trigger whose own `style` attribute is written from a reactive
     *  expression loses the appended `anchor-name` whenever Svelte rewrites that attribute, so
     *  give such a trigger a class instead. */
    children: Snippet;
  }

  let { text, id, children }: Props = $props();

  const generatedId = $props.id();
  const bubbleId = $derived(id ?? `${generatedId}-tooltip`);
  // A dashed-ident anchor name unique to this instance. Non-ident characters in the generated id
  // are collapsed, since an anchor name is a CSS identifier while an element id is not.
  const anchorName = $derived(`--cairn-tooltip-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '-')}`);

  let wrapperEl = $state<HTMLElement | null>(null);
  let bubbleEl = $state<HTMLElement | null>(null);
  let hoverOn = $state(false);
  let focusOn = $state(false);
  let tapOn = $state(false);
  let escaped = $state(false);
  const hasText = $derived(text.length > 0);
  const visible = $derived(hasText && !escaped && (hoverOn || focusOn || tapOn));
  // Hover is the one mode that takes the open delay below: a pointer crossing a dense toolbar row
  // passes over several triggers on its way somewhere else, while a focus or a tap is deliberate.
  const hoverDelayed = $derived(visible && hoverOn && !focusOn && !tapOn);

  /**
   * The trigger element, the wrapper's own first child once the `children` snippet mounts. Null
   * when that snippet rendered no element of its own, in which case the wrapper's first child is
   * the bubble: there is nothing to describe or anchor, so every mechanic skips rather than
   * pointing the bubble at itself.
   */
  function resolveTrigger(): HTMLElement | null {
    const first = wrapperEl?.firstElementChild;
    if (first instanceof HTMLElement && first !== bubbleEl) return first;
    if (import.meta.env.DEV) {
      console.warn('Tooltip needs one element as its children snippet; bare text has nothing to describe.');
    }
    return null;
  }

  /**
   * Whether the bubble text only repeats what the trigger's accessible name already says, in which
   * case no `aria-describedby` is written: a screen reader would otherwise read the same words
   * twice, once as the name and once as the description. The name is read the way the trigger
   * supplies it, an `aria-label` when present and the rendered text otherwise, which covers every
   * shape this toolkit's own sweep wraps.
   */
  function duplicatesName(trigger: HTMLElement): boolean {
    const name = (trigger.getAttribute('aria-label') ?? trigger.textContent ?? '').trim();
    return name.length > 0 && name === text.trim();
  }

  /**
   * Points the trigger at the bubble, unless the bubble only repeats the trigger's own accessible
   * name.
   * @returns the trigger's prior `aria-describedby`, for a teardown to restore
   */
  function describe(trigger: HTMLElement): string | null {
    const prior = trigger.getAttribute('aria-describedby');
    if (duplicatesName(trigger)) return prior;
    if (prior !== bubbleId) trigger.setAttribute('aria-describedby', bubbleId);
    return prior;
  }

  /**
   * Appends this instance's anchor name to whatever the trigger already declares, once.
   * `anchor-name` is a comma list and several swept triggers already declare one inline for a
   * popover menu of their own, so appending keeps both names resolvable; replacing would leave
   * that menu with an unresolvable `position-anchor` and drop it to the UA's centered fallback.
   * @returns the trigger's prior `anchor-name`, for a teardown to restore
   */
  function anchor(trigger: HTMLElement): string {
    const prior = trigger.style.getPropertyValue('anchor-name');
    if (prior.split(',').some((name) => name.trim() === anchorName)) return prior;
    trigger.style.setProperty('anchor-name', prior ? `${prior}, ${anchorName}` : anchorName);
    return prior;
  }

  // Writes aria-describedby and the anchor name on the trigger's own rendered root element, never
  // on this component's wrapper: the wrapper renders no box of its own, so it can be neither the
  // element that receives focus nor an anchor (a boxless element cannot anchor anything). Re-runs
  // whenever the trigger, the text, the bubble id, or the anchor name changes, and cleans up on
  // unmount so a later Tooltip reusing the same DOM node never inherits a stale value. A no-op
  // while `text` is empty (see the prop's own doc comment).
  //
  // The same effect watches the trigger's own `aria-expanded`: a trigger that opens a menu of its
  // own must not leave a bubble hanging over that menu, and watching the attribute catches the
  // open however it happened, including one a caller opens programmatically.
  //
  // WATCH: the anchor name is written as an inline style property. A trigger whose `style`
  // attribute is itself written from a reactive expression loses the appended name the next time
  // Svelte rewrites that attribute; the open effect below re-appends it on the next open, and the
  // `children` doc comment names the constraint for a caller.
  $effect(() => {
    if (!hasText) return;
    const trigger = resolveTrigger();
    if (!trigger) return;
    const priorDescribedBy = describe(trigger);
    const priorAnchorName = anchor(trigger);
    const expansionObserver = new MutationObserver(() => {
      if (trigger.getAttribute('aria-expanded') === 'true') escaped = true;
    });
    expansionObserver.observe(trigger, { attributeFilter: ['aria-expanded'] });
    return () => {
      expansionObserver.disconnect();
      if (priorDescribedBy === null) trigger.removeAttribute('aria-describedby');
      else trigger.setAttribute('aria-describedby', priorDescribedBy);
      if (priorAnchorName) trigger.style.setProperty('anchor-name', priorAnchorName);
      else trigger.style.removeProperty('anchor-name');
    };
  });

  // Drives the popover from the derived visibility rather than from each handler, so the several
  // input modes cannot disagree about whether the bubble is open. Both popover methods throw when
  // the popover is already in the state they ask for, hence the guard on each. The trigger is
  // re-resolved on every open, so a caller that swapped its own trigger element (a conditional
  // block re-rendering it) gets the anchor name and the description repaired on the next open
  // rather than anchoring the bubble to an element that left the DOM.
  $effect(() => {
    if (!bubbleEl) return;
    if (visible) {
      const trigger = wrapperEl?.firstElementChild;
      if (trigger instanceof HTMLElement && trigger !== bubbleEl) {
        describe(trigger);
        anchor(trigger);
      }
    }
    const open = bubbleEl.matches(':popover-open');
    if (visible && !open) bubbleEl.showPopover();
    else if (!visible && open) bubbleEl.hidePopover();
  });

  // Escape is listened for on the document, not on the wrapper: WCAG 1.4.13's dismissible bullet
  // asks for a way to dismiss the bubble without moving the pointer, and a hover-shown bubble
  // leaves focus wherever it already was, which is usually outside this wrapper. Non-capturing,
  // with no preventDefault and no stopPropagation, so an enclosing dialog still closes on the
  // same key press: cairn treats dismissing the tooltip and closing the dialog as one intent.
  $effect(() => {
    if (!visible) return;
    const onDocumentKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') escaped = true;
    };
    document.addEventListener('keydown', onDocumentKeydown);
    return () => {
      document.removeEventListener('keydown', onDocumentKeydown);
    };
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

  function handlePointerUp(event: PointerEvent) {
    // Every pointer that is not a mouse takes the tap fallback, a pen included: neither reports a
    // hover this component could show the bubble from.
    if (!hasText || event.pointerType === 'mouse') return;
    escaped = false;
    tapOn = !tapOn;
  }

  function handleClick(event: MouseEvent) {
    if (!visible || !(event.target instanceof Node)) return;
    if (bubbleEl?.contains(event.target)) return;
    const trigger = wrapperEl?.firstElementChild;
    if (!(trigger instanceof HTMLElement) || !trigger.contains(event.target)) return;
    // A guarded control activates nothing, so its reason stays on screen; every other trigger has
    // just done something, and a bubble left over the result is the touch-tap defect a native
    // tooltip has too.
    if (trigger.getAttribute('aria-disabled') === 'true') return;
    tapOn = false;
    escaped = true;
  }
</script>

<!-- The wrapper is deliberately non-interactive (no role, no tabindex): its hover/focus/pointer
     listeners are delegation over whatever the children snippet renders, not an affordance of
     their own an AT user should be told about, matching ToolbarDisclosure's own containing
     element. The click listener only ever hides a bubble the trigger's own activation would
     otherwise strand, so it adds no keyboard affordance to duplicate. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<span
  bind:this={wrapperEl}
  class="cairn-tooltip"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocusin={handleFocusIn}
  onfocusout={handleFocusOut}
  onpointerup={handlePointerUp}
  onclick={handleClick}
>
  {@render children()}
  <span
    bind:this={bubbleEl}
    id={bubbleId}
    role="tooltip"
    popover="manual"
    class="cairn-tooltip-bubble"
    data-cairn-hover-delay={hoverDelayed ? 'true' : undefined}
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
     `margin: auto` would otherwise stretch the bubble across the whole position area. The bubble
     takes pointer events, which WCAG 1.4.13's hoverable bullet requires: a pointer must be able
     to travel into the bubble and read it without dismissing it. */
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
    font-size: var(--cairn-type-label, 0.6875rem);
    line-height: var(--cairn-type-label--leading, 0.875rem);
    text-align: start;
    opacity: 1;
    transition:
      opacity var(--cairn-dur-base, 150ms) var(--cairn-ease-entrance, cubic-bezier(0, 0, 0.38, 0.9)),
      display var(--cairn-dur-base, 150ms) allow-discrete,
      overlay var(--cairn-dur-base, 150ms) allow-discrete;
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

  /* The hoverable bridge: the 0.375rem gap between trigger and bubble belongs to the bubble, so a
     pointer crossing it never leaves the wrapper and never dismisses the bubble (WCAG 1.4.13).
     `inset-block` covers the gap on both sides at once, which is what survives
     `position-try-fallbacks: flip-block` moving the bubble below its trigger, where the gap is on
     the other edge. */
  .cairn-tooltip-bubble::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    inset-block: -0.375rem;
  }

  /* The entrance fade, keyed off the popover's own open state so the discrete display change
     animates with it; @starting-style supplies the from value a first render otherwise has none
     for. */
  @starting-style {
    .cairn-tooltip-bubble:popover-open {
      opacity: 0;
    }
  }

  /* The open delay for a hover-shown bubble: a pointer crossing a dense toolbar row on its way
     somewhere else passes over several triggers, and with no delay each one flashes a bubble. The
     delay is a paint delay, not a state delay, so the guard keeps a reduced-motion reader from
     waiting for anything (the reduce block below snaps instead). */
  @media (prefers-reduced-motion: no-preference) {
    .cairn-tooltip-bubble[data-cairn-hover-delay] {
      transition-delay: 75ms;
    }
  }

  /* The exit, one band faster than the entrance and on the exit curve, since a dismissed bubble
     leaves and does not stay nearby. The shorthand also resets the hover open delay, which an
     exit never takes. */
  .cairn-tooltip-bubble:not(:popover-open) {
    opacity: 0;
    transition:
      opacity var(--cairn-dur-quick, 110ms) var(--cairn-ease-exit, cubic-bezier(0.2, 0, 1, 0.9)),
      display var(--cairn-dur-quick, 110ms) allow-discrete,
      overlay var(--cairn-dur-quick, 110ms) allow-discrete;
  }

  /* Both selectors, since the exit rule above outranks a single-class reduce rule and would keep
     its own transition under the floor. */
  @media (prefers-reduced-motion: reduce) {
    .cairn-tooltip-bubble,
    .cairn-tooltip-bubble:not(:popover-open) {
      transition: none;
    }
  }

  /* Anchor positioning places this bubble; without it the bubble would paint at the UA popover
     sheet's own centered position, unrelated to its trigger. There it is not rendered at all, and
     the trigger's `aria-describedby` carries the text on its own, which is how the description
     reaches assistive technology whether or not the bubble ever paints. */
  @supports not (anchor-name: --x) {
    .cairn-tooltip-bubble {
      display: none;
    }
  }
</style>
