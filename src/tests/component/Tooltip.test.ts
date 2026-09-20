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
