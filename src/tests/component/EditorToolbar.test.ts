import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import EditorToolbar from '../../lib/components/EditorToolbar.svelte';

function baseProps(over: Record<string, unknown> = {}) {
  return { format: vi.fn(), mode: 'write' as const, onMode: vi.fn(), ...over };
}

/** The strip's top-level controls: every enabled button except the More menu's items. */
function controls(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="toolbar"] button:not([disabled])')).filter(
    (el) => !el.closest('[popover]'),
  );
}

describe('EditorToolbar', () => {
  it('renders the primary controls with accessible names', async () => {
    const screen = render(EditorToolbar, baseProps());
    const labels = ['Bold (Ctrl+B)', 'Italic (Ctrl+I)', 'Heading', 'Smaller heading', 'Bulleted list', 'Numbered list', 'Quote', 'More formatting'];
    for (const label of labels) {
      await expect.element(screen.getByRole('button', { name: label, exact: true })).toBeInTheDocument();
    }
  });

  it('asks the host to apply a format on a primary click', async () => {
    const format = vi.fn();
    const screen = render(EditorToolbar, baseProps({ format }));
    await screen.getByRole('button', { name: 'Bold (Ctrl+B)' }).click();
    await screen.getByRole('button', { name: 'Numbered list' }).click();
    expect(format.mock.calls).toEqual([['bold'], ['ol']]);
  });

  it('disables the format buttons and the More trigger in Preview but not the tabs', async () => {
    const screen = render(EditorToolbar, baseProps({ mode: 'preview' }));
    const bold = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Bold (Ctrl+B)"]')!;
    expect(bold.disabled).toBe(true);
    const more = screen.container.querySelector<HTMLButtonElement>('button[aria-label="More formatting"]')!;
    expect(more.disabled).toBe(true);
    const tabs = screen.container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    for (const tab of tabs) expect(tab.disabled).toBe(false);
    // The roving tab stop lands on an enabled control, never a disabled one.
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
  });

  it('lists the six secondary formats in the More menu and applies one', async () => {
    const format = vi.fn();
    const screen = render(EditorToolbar, baseProps({ format }));
    // The menu is a popover, hidden until the trigger opens it.
    await screen.getByRole('button', { name: 'More formatting' }).click();
    for (const label of ['Strikethrough', 'Inline code', 'Code block', 'Table', 'Horizontal rule', 'Task list']) {
      await expect.element(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    await screen.getByRole('button', { name: 'Table' }).click();
    expect(format).toHaveBeenCalledWith('table');
    // Picking a format closes the menu.
    const menu = screen.container.querySelector('#cairn-more-formatting-menu')!;
    await expect.poll(() => menu.matches(':popover-open')).toBe(false);
  });

  it('drives the More menu as a popover with aria-expanded and Escape', async () => {
    const screen = render(EditorToolbar, baseProps());
    const trigger = screen.getByRole('button', { name: 'More formatting' });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.container.querySelector('#cairn-more-formatting-menu')!;
    expect(menu.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(menu.matches(':popover-open')).toBe(false);
  });

  it('reflects the mode on the tablist and reports a switch', async () => {
    const onMode = vi.fn();
    const screen = render(EditorToolbar, baseProps({ onMode }));
    await expect.element(screen.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'true');
    await expect.element(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'false');
    await screen.getByRole('tab', { name: 'Preview' }).click();
    expect(onMode).toHaveBeenCalledWith('preview');
  });

  it('marks the Preview tab selected when the mode says so', async () => {
    const screen = render(EditorToolbar, baseProps({ mode: 'preview' }));
    await expect.element(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
    await expect.element(screen.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'false');
  });

  it('keeps the roving stop in sync through a Preview round trip', async () => {
    const screen = render(EditorToolbar, baseProps());
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
    const items = controls(screen.container);
    items[0].focus();
    // ArrowLeft wraps the stop to the last control.
    await userEvent.keyboard('{ArrowLeft}');
    await expect.poll(() => document.activeElement).toBe(items[items.length - 1]);
    // Preview disables the format controls, shrinking the roving set to the two tabs; the
    // clamped stop writes back, so Write resumes from the clamped position instead of jumping.
    await screen.rerender(baseProps({ mode: 'preview' }));
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
    await screen.rerender(baseProps({ mode: 'write' }));
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
    const after = controls(screen.container);
    expect(after[1].tabIndex).toBe(0);
    // Arrow keys move from the displayed stop, not a stale pre-Preview index.
    after[1].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => document.activeElement).toBe(controls(screen.container)[2]);
  });

  it('keeps one roving tab stop and moves it with the arrow keys', async () => {
    const screen = render(EditorToolbar, baseProps());
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
    const items = controls(screen.container);
    expect(items[0].tabIndex).toBe(0);
    items[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.poll(() => document.activeElement).toBe(controls(screen.container)[1]);
    await expect.poll(() => controls(screen.container).filter((el) => el.tabIndex === 0).length).toBe(1);
    expect(controls(screen.container)[1].tabIndex).toBe(0);
    await userEvent.keyboard('{ArrowLeft}');
    await expect.poll(() => document.activeElement).toBe(controls(screen.container)[0]);
  });
});
