import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { createRawSnippet, tick } from 'svelte';
import Tooltip from '../../lib/admin-toolkit/Tooltip.svelte';

/** One trigger button, the shape every real sweep site wraps: a single focusable root element,
 *  matching the wrapper's own `firstElementChild` assumption for `aria-describedby`. */
const trigger = createRawSnippet(() => ({
  render: () => '<button type="button">Insert block</button>',
}));

function bubbleOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[role="tooltip"]')!;
}

/** Shown means the bubble's own popover is open: a closed popover is not rendered at all, so its
 *  open state, not a computed style, is what "the user can see this" means here. */
function isVisible(bubble: HTMLElement): boolean {
  return bubble.matches(':popover-open');
}

describe('Tooltip', () => {
  it('shows the bubble on hover', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    expect(isVisible(bubble)).toBe(false);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    // Past the hide grace, not immediately: see the hide-grace tests below for the grace itself.
    await userEvent.unhover(button);
    await vi.waitUntil(() => !isVisible(bubble));
    expect(isVisible(bubble)).toBe(false);
  });

  it('shows the bubble on :focus-visible', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    expect(isVisible(bubble)).toBe(false);

    // A real keyboard Tab, not a programmatic .focus(): only a keyboard-driven focus sets
    // :focus-visible in Chromium, which is the whole reason this component checks it rather than
    // showing on every focus (a mouse click focusing the trigger would otherwise also open it).
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    expect(isVisible(bubble)).toBe(true);
  });

  it('hides on Escape and keeps focus on the trigger', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);

    await userEvent.tab();
    expect(isVisible(bubble)).toBe(true);

    await userEvent.keyboard('{Escape}');
    expect(isVisible(bubble)).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('points the trigger\'s aria-describedby at the rendered bubble text', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);

    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(bubble.id).toBe(describedBy);
    expect(bubble.textContent?.trim()).toBe('Insert a component');
  });

  it('anchors the shown bubble above and horizontally overlapping its own trigger', async () => {
    // Regression for a bubble that anchored to whatever ancestor happened to be positioned instead
    // of its own trigger: renders two Tooltips side by side (mirroring a dense toolbar row) and
    // asserts each bubble's rect sits above, and horizontally overlaps, ITS OWN trigger's rect,
    // never a shared fixed spot the way a wrapper-relative `position: absolute` bubble did.
    const first = await render(Tooltip, { text: 'First', children: trigger });
    const second = await render(Tooltip, { text: 'Second', children: trigger });

    const firstButton = first.container.querySelector('button')!;
    const secondButton = second.container.querySelector('button')!;
    const firstBubble = bubbleOf(first.container);
    const secondBubble = bubbleOf(second.container);
    // Room above the first trigger, which otherwise sits flush against the viewport's top edge
    // where the bubble legitimately flips below it (position-try-fallbacks: flip-block).
    first.container.style.marginTop = '120px';

    await userEvent.hover(firstButton);
    await userEvent.hover(secondButton);

    const firstTriggerRect = firstButton.getBoundingClientRect();
    const firstBubbleRect = firstBubble.getBoundingClientRect();
    expect(firstBubbleRect.bottom).toBeLessThanOrEqual(firstTriggerRect.top);
    expect(firstBubbleRect.right).toBeGreaterThan(firstTriggerRect.left);
    expect(firstBubbleRect.left).toBeLessThan(firstTriggerRect.right);

    const secondTriggerRect = secondButton.getBoundingClientRect();
    const secondBubbleRect = secondBubble.getBoundingClientRect();
    expect(secondBubbleRect.bottom).toBeLessThanOrEqual(secondTriggerRect.top);
    expect(secondBubbleRect.right).toBeGreaterThan(secondTriggerRect.left);
    expect(secondBubbleRect.left).toBeLessThan(secondTriggerRect.right);

    // The two triggers occupy different rects (two independently rendered components stack
    // vertically in the test DOM, not a shared position), so each bubble tracking its own trigger
    // means the two bubble tops differ too, ruling out the collapse-to-one-spot failure (both
    // bubbles landing at the same fixed coordinate) this test exists to catch.
    expect(firstBubbleRect.top).not.toBe(secondBubbleRect.top);
  });

  it('places the bubble correctly inside a transformed, clipping ancestor', async () => {
    // The open-modal shape: DaisyUI's `.modal[open] > .modal-box` carries both a `translate` and a
    // `scale`, either of which establishes a containing block for fixed-position descendants, and
    // an `overflow: hidden` that clips anything leaving its box. A bubble positioned by writing
    // viewport coordinates onto a fixed box lands displaced by that ancestor's own offset inside
    // such a box; a top-layer popover does not.
    const screen = await render(Tooltip, { text: 'Tidy this entry', children: trigger });
    const wrapper = screen.container.querySelector('.cairn-tooltip')!;
    const box = document.createElement('div');
    box.setAttribute(
      'style',
      'translate: 0; scale: 1; overflow: hidden; margin: 80px 0 0 140px; width: 320px; height: 160px;'
    );
    screen.container.appendChild(box);
    box.appendChild(wrapper);

    const button = box.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    const triggerRect = button.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    expect(bubbleRect.bottom).toBeLessThanOrEqual(triggerRect.top);
    expect(bubbleRect.right).toBeGreaterThan(triggerRect.left);
    expect(bubbleRect.left).toBeLessThan(triggerRect.right);
    // The bubble renders in the top layer, so it keeps a real box even where its DOM ancestor's
    // own `overflow: hidden` would have clipped it away.
    expect(bubbleRect.width).toBeGreaterThan(0);
    expect(bubbleRect.height).toBeGreaterThan(0);
  });

  it('keeps an anchor-name the trigger already carries for its own popover menu', async () => {
    // Several swept triggers open a popover menu of their own and declare that menu's
    // `anchor-name` inline. `anchor-name` is a comma list, so appending keeps both names
    // resolvable; replacing it would leave the menu's `position-anchor` unresolvable and drop the
    // menu to the UA's centered fallback, which no closed-menu visual baseline can catch.
    const menuTrigger = createRawSnippet(() => ({
      render: () =>
        '<button type="button" style="anchor-name: --cairn-more-formatting">More formatting</button>',
    }));
    const screen = await render(Tooltip, { text: 'More formatting', children: menuTrigger });
    const button = screen.container.querySelector('button')!;

    const names = button.style
      .getPropertyValue('anchor-name')
      .split(',')
      .map((name) => name.trim());
    expect(names).toContain('--cairn-more-formatting');
    expect(names.some((name) => name.startsWith('--cairn-tooltip-'))).toBe(true);

    // The appended name still anchors the bubble to this trigger.
    screen.container.style.marginTop = '120px';
    await userEvent.hover(button);
    const triggerRect = button.getBoundingClientRect();
    const bubbleRect = bubbleOf(screen.container).getBoundingClientRect();
    expect(bubbleRect.bottom).toBeLessThanOrEqual(triggerRect.top);
    expect(bubbleRect.right).toBeGreaterThan(triggerRect.left);
    expect(bubbleRect.left).toBeLessThan(triggerRect.right);
  });

  it('shows on a coarse-pointer tap and hides on the next tap outside', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    expect(isVisible(bubble)).toBe(false);

    // A real mouse click on the same button would fire a `pointerup` too, so pointerType is what
    // distinguishes a touch tap; see this component's own header comment for why matchMedia is
    // never used for this. A manually dispatched event runs its listener synchronously, but the
    // resulting state write still settles on Svelte's own microtask, so each dispatch is followed
    // by a `tick()`.
    button.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }));
    await tick();
    expect(isVisible(bubble)).toBe(true);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    await tick();
    expect(isVisible(bubble)).toBe(false);
  });

  it('stays open while the pointer travels from the trigger into the bubble', async () => {
    // WCAG 1.4.13's hoverable bullet: a pointer moving from the trigger into the bubble lands on
    // the bubble well inside the hide grace, so it never dismisses.
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    // Room above the trigger, which otherwise sits flush against the viewport's top edge where the
    // bubble flips below it and the pointer path reverses.
    screen.container.style.marginTop = '120px';

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    await userEvent.hover(bubble);
    expect(isVisible(bubble)).toBe(true);
  });

  it('keeps the bubble open through the hide grace and cancels the hide on re-entry', async () => {
    // The hit-testing gap this grace covers: Chromium reports the document, never the bubble, for
    // every point in the space between trigger and bubble, so a real pointer pause there fires
    // exactly this mouseleave with nothing underneath to catch it. Dispatched directly rather than
    // through userEvent, which has no way to pause a real pointer mid-move without a hoverable
    // element under it to land on.
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const wrapper = screen.container.querySelector('.cairn-tooltip')!;
    const bubble = bubbleOf(screen.container);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    wrapper.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    await tick();
    expect(isVisible(bubble)).toBe(true);

    wrapper.dispatchEvent(new MouseEvent('mouseenter', { relatedTarget: document.body }));
    await tick();
    // Past the grace, to prove the re-entry cancelled the pending hide rather than merely
    // outrunning it.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(isVisible(bubble)).toBe(true);
  });

  it('hides once the hide grace elapses with no re-entry', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const wrapper = screen.container.querySelector('.cairn-tooltip')!;
    const bubble = bubbleOf(screen.container);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    wrapper.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: document.body }));
    await vi.waitUntil(() => !isVisible(bubble));
    expect(isVisible(bubble)).toBe(false);
  });

  it('hides on Escape with focus elsewhere, without moving focus', async () => {
    // The Escape listener is on the document, not the wrapper: a hover-shown bubble leaves focus
    // wherever it already was, so a wrapper-scoped listener never sees the key press.
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    const elsewhere = document.createElement('button');
    elsewhere.type = 'button';
    elsewhere.textContent = 'Elsewhere';
    document.body.appendChild(elsewhere);
    elsewhere.focus();

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    await userEvent.keyboard('{Escape}');
    expect(isVisible(bubble)).toBe(false);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('sets no aria-describedby when the bubble text is already the trigger accessible name', async () => {
    const named = createRawSnippet(() => ({
      render: () => '<button type="button" aria-label="Insert block"><span aria-hidden="true">+</span></button>',
    }));
    const screen = await render(Tooltip, { text: 'Insert block', children: named });
    const button = screen.container.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('describes the trigger when the bubble text says more than its accessible name', async () => {
    const named = createRawSnippet(() => ({
      render: () => '<button type="button" aria-label="Insert block"><span aria-hidden="true">+</span></button>',
    }));
    const screen = await render(Tooltip, { text: 'Insert a component at the cursor', children: named });
    const button = screen.container.querySelector('button')!;
    expect(button.getAttribute('aria-describedby')).toBe(bubbleOf(screen.container).id);
    await expect.element(button).toHaveAccessibleDescription('Insert a component at the cursor');
  });

  it('hides once the trigger reports its own menu open through aria-expanded', async () => {
    // EditorToolbar's More-formatting trigger anchors a popover menu of its own; a bubble left
    // open would hang over that menu. The attribute is watched, so a menu opened by keyboard,
    // pointer, or a caller's own state change all hide the bubble.
    const menuTrigger = createRawSnippet(() => ({
      render: () => '<button type="button" aria-expanded="false">More formatting</button>',
    }));
    const screen = await render(Tooltip, { text: 'More formatting options', children: menuTrigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    button.setAttribute('aria-expanded', 'true');
    await vi.waitUntil(() => !isVisible(bubble));
    expect(isVisible(bubble)).toBe(false);
  });

  it('hides when an enabled trigger is activated, and stays for an aria-disabled one', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);
    await userEvent.click(button);
    expect(isVisible(bubble)).toBe(false);

    const guarded = createRawSnippet(() => ({
      render: () => '<button type="button" aria-disabled="true">Edit block</button>',
    }));
    const guardedScreen = await render(Tooltip, {
      text: 'Place the cursor in a component to edit it',
      children: guarded,
    });
    const guardedButton = guardedScreen.container.querySelector('button')!;
    const guardedBubble = bubbleOf(guardedScreen.container);

    await userEvent.hover(guardedButton);
    expect(isVisible(guardedBubble)).toBe(true);
    // Dispatched rather than driven through userEvent: the driver refuses to click an element it
    // reads as not enabled, while a real pointer on an aria-disabled control does fire a click,
    // which is the whole reason the guarded shape uses aria-disabled over the native attribute.
    guardedButton.click();
    await tick();
    expect(isVisible(guardedBubble)).toBe(true);
  });
});
