import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import EditorToolbar from '../../lib/components/EditorToolbar.svelte';
// The source admin sheet (the variables partial plus the scoped component rules), so the
// unlayered menu focus override is present for the focus-visibility tests below.
import '../../lib/components/cairn-admin.css';

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
    const labels = [
      'Bold (Ctrl+B)',
      'Italic (Ctrl+I)',
      'Heading (Ctrl+Alt+2)',
      'Smaller heading (Ctrl+Alt+3)',
      'Bulleted list (Ctrl+Shift+8)',
      'Numbered list (Ctrl+Shift+7)',
      'Quote (Ctrl+Shift+9)',
      'More formatting',
    ];
    for (const label of labels) {
      await expect.element(screen.getByRole('button', { name: label, exact: true })).toBeInTheDocument();
    }
  });

  it('asks the host to apply a format on a primary click', async () => {
    const format = vi.fn();
    const screen = render(EditorToolbar, baseProps({ format }));
    await screen.getByRole('button', { name: 'Bold (Ctrl+B)' }).click();
    await screen.getByRole('button', { name: 'Numbered list (Ctrl+Shift+7)' }).click();
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
    for (const label of ['Strikethrough', 'Inline code (Ctrl+E)', 'Code block', 'Table', 'Horizontal rule', 'Task list']) {
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

  it('shows the device trigger only while Preview is active with a handler', async () => {
    const onDevice = vi.fn();
    const inWrite = render(EditorToolbar, baseProps({ onDevice }));
    expect(inWrite.container.querySelector('[popovertarget="cairn-preview-device-menu"]')).toBeNull();
    const withoutHandler = render(EditorToolbar, baseProps({ mode: 'preview' }));
    expect(withoutHandler.container.querySelector('[popovertarget="cairn-preview-device-menu"]')).toBeNull();
    const inPreview = render(EditorToolbar, baseProps({ mode: 'preview', onDevice }));
    const trigger = inPreview.container.querySelector('[popovertarget="cairn-preview-device-menu"]')!;
    // ARIA required children: the tablist holds only the two tabs, and the trigger reads as the
    // capsule's third segment from the flex row right after the tablist wrapper, never inside it.
    const tablist = inPreview.container.querySelector('[role="tablist"]')!;
    expect(Array.from(tablist.children).every((el) => el.getAttribute('role') === 'tab')).toBe(true);
    expect(tablist.contains(trigger)).toBe(false);
    expect(tablist.nextElementSibling).toBe(trigger);
    expect(trigger.textContent ?? '').toContain('Desktop');
  });

  it('lists the four widths with their pixel values, presses the active one, and reports a pick', async () => {
    const onDevice = vi.fn();
    const screen = render(EditorToolbar, baseProps({ mode: 'preview', device: 'tablet', onDevice }));
    await screen.getByRole('button', { name: /preview width/i }).click();
    const items = Array.from(
      screen.container.querySelectorAll<HTMLButtonElement>('#cairn-preview-device-menu button'),
    );
    // Each item names its width, so the value reaches assistive tech at pick time.
    expect(items.map((el) => el.textContent?.trim())).toEqual([
      'Desktop',
      'Tablet · 768 px',
      'Phone · 390 px',
      'Small phone · 320 px',
    ]);
    expect(items.map((el) => el.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    await screen.getByRole('button', { name: 'Phone · 390 px', exact: true }).click();
    expect(onDevice).toHaveBeenCalledWith('phone');
    // Picking dismisses the menu.
    const menu = screen.container.querySelector('#cairn-preview-device-menu')!;
    await expect.poll(() => menu.matches(':popover-open')).toBe(false);
  });

  it('drives the device menu as a popover with aria-expanded and Escape', async () => {
    const screen = render(EditorToolbar, baseProps({ mode: 'preview', onDevice: vi.fn() }));
    const trigger = screen.getByRole('button', { name: /preview width/i });
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.container.querySelector('#cairn-preview-device-menu')!;
    expect(menu.matches(':popover-open')).toBe(true);
    // The device list mirrors the More menu: plain buttons in a popover list with aria-pressed,
    // never the ARIA menu pattern, whose roles promise interactions this list does not have.
    expect(menu.getAttribute('role')).toBeNull();
    expect(menu.querySelector('[role="menu"], [role="menuitemradio"]')).toBeNull();
    const triggerEl = screen.container.querySelector('[popovertarget="cairn-preview-device-menu"]')!;
    expect(triggerEl.getAttribute('aria-haspopup')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(menu.matches(':popover-open')).toBe(false);
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

describe('menu item resting chrome', () => {
  // The admin sheet ships without Preflight, so a .menu button item used to keep the UA button
  // chrome (outset border, gray fill, centered system-font text) while its anchor siblings
  // rendered flat. The scoped components-layer substitute in cairn-admin.css levels buttons to
  // the anchor baseline; the component run loads the source partial, which carries that rule.
  beforeAll(() => document.documentElement.setAttribute('data-theme', 'cairn-admin'));
  afterAll(() => document.documentElement.removeAttribute('data-theme'));

  it('renders a More-menu button item flat, with no UA button border or fill', async () => {
    const screen = render(EditorToolbar, baseProps());
    await screen.getByRole('button', { name: 'More formatting' }).click();
    const item = screen.container.querySelector<HTMLButtonElement>('#cairn-more-formatting-menu li > button')!;
    const computed = getComputedStyle(item);
    expect(computed.borderTopStyle).toBe('solid');
    expect(computed.borderTopWidth).toBe('0px');
    expect(computed.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(computed.textAlign).toBe('start');
  });

  it('renders a device-menu button item flat too', async () => {
    const screen = render(EditorToolbar, baseProps({ mode: 'preview', onDevice: vi.fn() }));
    await screen.getByRole('button', { name: /preview width/i }).click();
    const item = screen.container.querySelector<HTMLButtonElement>('#cairn-preview-device-menu li > button')!;
    const computed = getComputedStyle(item);
    expect(computed.borderTopWidth).toBe('0px');
    expect(computed.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });
});

describe('popover menu focus visibility', () => {
  // DaisyUI v5's .menu quiets :focus-visible on its items (outline-style: none) from the compiled
  // sheet's utilities layer, where it beats the admin's components-layer focus ring: cascade
  // layers resolve before specificity and utilities is the last layer. The component run loads
  // only the source partial, so reproduce that daisyUI rule here; these tests then hold only if
  // the admin sheet's deliberately unlayered override outranks it, the way it must in the
  // compiled sheet.
  let daisyMenuQuiet: HTMLStyleElement;
  beforeAll(() => {
    document.documentElement.setAttribute('data-theme', 'cairn-admin');
    daisyMenuQuiet = document.createElement('style');
    daisyMenuQuiet.textContent = `
      @layer properties, theme, components, utilities;
      @layer utilities {
        :where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) .menu :where(li:not(.menu-title, .disabled) > :not(ul, details, .menu-title)):not(.menu-active, :active, .btn):focus-visible {
          outline-style: none;
        }
      }`;
    document.head.appendChild(daisyMenuQuiet);
  });
  afterAll(() => {
    document.documentElement.removeAttribute('data-theme');
    daisyMenuQuiet.remove();
  });

  it('keeps a visible focus outline on a More-menu item', async () => {
    const screen = render(EditorToolbar, baseProps());
    await screen.getByRole('button', { name: 'More formatting' }).click();
    // Tab moves keyboard focus from the trigger into the open popover's first item, so
    // :focus-visible applies the way it does for a keyboard user.
    await userEvent.tab();
    const item = document.activeElement as HTMLElement;
    expect(item.textContent?.trim()).toBe('Strikethrough');
    const computed = getComputedStyle(item);
    expect(computed.outlineStyle).toBe('solid');
    expect(computed.outlineWidth).toBe('2px');
  });

  it('keeps a visible focus outline on a device-menu item', async () => {
    const screen = render(EditorToolbar, baseProps({ mode: 'preview', onDevice: vi.fn() }));
    await screen.getByRole('button', { name: /preview width/i }).click();
    await userEvent.tab();
    const item = document.activeElement as HTMLElement;
    expect(item.closest('#cairn-preview-device-menu')).not.toBeNull();
    expect(getComputedStyle(item).outlineStyle).toBe('solid');
  });
});
