import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ToolbarDisclosureHarness from './_ToolbarDisclosureHarness.svelte';

describe('ToolbarDisclosure', () => {
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

  it('closes on Escape and returns focus to the trigger', async () => {
    const screen = await render(ToolbarDisclosureHarness, {});
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => document.activeElement).toBe(trigger.element());
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
    const lastOption = screen.getByTestId('option-2').element();
    const outside = screen.getByTestId('outside').element();
    lastOption.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
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

  it('is controlled: a click reports through onOpenChange but never opens on its own without the caller applying it', async () => {
    const onOpenChange = vi.fn();
    const screen = await render(ToolbarDisclosureHarness, { uncontrolled: true, onOpenChange });
    const trigger = screen.getByTestId('trigger');
    await trigger.click();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
