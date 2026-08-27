import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import compiledAdminCss from '../../../dist/components/cairn-admin.css?inline';
import ToolbarDisclosureHarness from './_ToolbarDisclosureHarness.svelte';

describe('ToolbarDisclosure', () => {
  // Primitive-owned hiding: the panel's own `hidden` attribute (see `ToolbarDisclosurePanelAttrs`)
  // keeps every descendant unfocusable and unpainted while closed, independent of the caller's own
  // `dropdown-content` class landing correctly (a CSS-only hiding rule matches nothing if that
  // class is ever omitted, leaving the panel visible and tabbable while `aria-expanded` reads
  // `false`).
  it('hides every panel descendant from focus and paint while closed', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const panel = screen.getByTestId('panel').element() as HTMLElement;
    expect(panel.hidden).toBe(true);
    expect(getComputedStyle(panel).display).toBe('none');
    const option1 = screen.getByTestId('option-1').element() as HTMLElement;
    option1.focus();
    expect(document.activeElement).not.toBe(option1);
  });

  it('gives the trigger aria-expanded/aria-controls that resolve to the panel\'s own id, with no aria-haspopup by default', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.element().hasAttribute('aria-haspopup')).toBe(false);
    const controlsId = trigger.element().getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();
    expect(screen.getByTestId('panel').element().getAttribute('id')).toBe(controlsId);
  });

  it('forwards the ariaHaspopup prop onto the trigger', async () => {
    const screen = await render(ToolbarDisclosureHarness, { ariaHaspopup: 'menu' });
    await expect.element(screen.getByTestId('trigger')).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens on a trigger click and reports it through onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const screen = await render(ToolbarDisclosureHarness, { onOpenChange });
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('moves focus to the panel\'s first focusable element on open', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    await screen.getByTestId('trigger').click();
    await expect.poll(() => document.activeElement).toBe(screen.getByTestId('option-1').element());
  });

  it('skips a tabindex="-1" element when focusing the panel\'s first focusable element on open', async () => {
    const screen = await render(ToolbarDisclosureHarness, { firstOptionNotTabbable: true });
    await screen.getByTestId('trigger').click();
    await expect.poll(() => document.activeElement).toBe(screen.getByTestId('option-2').element());
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    // Dispatched on the focused panel option, inside the trigger-plus-panel boundary: Escape is a
    // container-scoped listener, not a window-wide one, so it only closes when the event target is
    // within that boundary (matches a real keypress, which fires wherever focus currently sits).
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it('does not close on Escape dispatched outside the trigger-plus-panel', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    screen.getByTestId('outside').element().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on a pointerdown outside the trigger and panel, without moving focus to the trigger', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => document.activeElement).toBe(screen.getByTestId('option-1').element());
    await screen.getByTestId('outside').click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(screen.getByTestId('outside').element());
    expect(document.activeElement).not.toBe(trigger.element());
  });

  it('keeps the panel open on a pointerdown inside the panel', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    screen.getByTestId('panel').element().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes when focus tabs past the panel\'s last option, without moving focus again', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const lastOption = screen.getByTestId('option-2').element() as HTMLElement;
    // A real focus move (not a synthetic `dispatchEvent`): by the time the container's own
    // `focusout` listener runs, the browser has already updated `document.activeElement` to the
    // new target, matching a real Tab keypress out of the panel's last option.
    lastOption.focus();
    await expect.poll(() => document.activeElement).toBe(lastOption);
    const outside = screen.getByTestId('outside').element() as HTMLElement;
    outside.focus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(outside);
    expect(document.activeElement).not.toBe(trigger.element());
  });

  it('does not close when focus moves to the extra sibling inside the same containment boundary', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    const option1 = screen.getByTestId('option-1').element();
    const extra = screen.getByTestId('extra').element();
    option1.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: extra }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not close on a window-blur focusout (document.hasFocus() false), even with no relatedTarget', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const hasFocusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const option1 = screen.getByTestId('option-1').element();
    // A real window blur (tabbing to browser chrome, switching windows) fires `focusout` on the
    // still-focused descendant with no `relatedTarget`, the same shape a real Tab-out produces
    // once `document.activeElement` has moved -- `document.hasFocus()` is the only signal that
    // tells the two apart.
    option1.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    hasFocusSpy.mockRestore();
  });

  it('returns focus to the trigger on Escape even when open was driven programmatically, never through a trigger click', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await screen.getByTestId('open-programmatically').click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => document.activeElement).toBe(screen.getByTestId('option-1').element());
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
  });

  it('is controlled: a click reports through onOpenChange but never opens on its own without the caller applying it', async () => {
    const onOpenChange = vi.fn();
    const screen = await render(ToolbarDisclosureHarness, { uncontrolled: true, onOpenChange });
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

// A panel root whose own class is display-setting (daisyUI's `.menu`, `display: flex`) rather
// than `dropdown-content`, needs the compiled admin sheet actually loaded: only the packaged
// `.menu` author rule (not Svelte's own component-scoped `<style>`, which mounts regardless)
// reproduces the cascade fight the `[hidden]` neutralizing rule exists to win (an author rule of
// equal specificity to the UA `[hidden]` rule otherwise wins by virtue of not being a UA rule).
describe('ToolbarDisclosure with a display-setting panel class (compiled CSS)', () => {
  let styleEl: HTMLStyleElement;

  beforeAll(() => {
    styleEl = document.createElement('style');
    styleEl.textContent = compiledAdminCss;
    document.head.appendChild(styleEl);
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
  });

  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    styleEl.remove();
  });

  it('hides a `.menu`-classed panel (no `dropdown-content`) from paint and focus while closed', async () => {
    const screen = await render(ToolbarDisclosureHarness, { menuPanel: true });
    const panel = screen.getByTestId('panel').element() as HTMLElement;
    expect(panel.hidden).toBe(true);
    expect(getComputedStyle(panel).display).toBe('none');
    const option1 = screen.getByTestId('option-1').element() as HTMLElement;
    option1.focus();
    expect(document.activeElement).not.toBe(option1);
  });
});
