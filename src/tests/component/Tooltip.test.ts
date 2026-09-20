import { describe, expect, it } from 'vitest';
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

function isVisible(bubble: HTMLElement): boolean {
  return getComputedStyle(bubble).visibility === 'visible';
}

describe('Tooltip', () => {
  it('shows the bubble on hover', async () => {
    const screen = await render(Tooltip, { text: 'Insert a component', children: trigger });
    const button = screen.container.querySelector('button')!;
    const bubble = bubbleOf(screen.container);
    expect(isVisible(bubble)).toBe(false);

    await userEvent.hover(button);
    expect(isVisible(bubble)).toBe(true);

    await userEvent.unhover(button);
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
});
