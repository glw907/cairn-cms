import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MediaFigureControl from '../../lib/components/MediaFigureControl.svelte';

describe('MediaFigureControl pre-fill', () => {
  it('pre-fills the caption and the active role segment from an existing figure', async () => {
    const screen = render(MediaFigureControl, {
      caption: 'A quiet shore at dusk.',
      role: 'wide',
      mode: 'edit',
      decorative: false,
      onapply: () => {},
      onunwrap: () => {},
    } as never);
    await expect.element(screen.getByRole('textbox', { name: /caption/i })).toHaveValue(
      'A quiet shore at dusk.',
    );
    // The Wide segment is the checked radio; the others are not.
    await expect.element(screen.getByRole('radio', { name: /wide/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect.element(screen.getByRole('radio', { name: /measure/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('shows the Wrap in figure primary in wrap mode and no Unwrap', async () => {
    const screen = render(MediaFigureControl, {
      mode: 'wrap',
      onapply: () => {},
    } as never);
    await expect.element(screen.getByRole('button', { name: /wrap in figure/i })).toBeInTheDocument();
    expect(screen.container.textContent ?? '').not.toMatch(/unwrap/i);
  });
});

describe('MediaFigureControl placement segmented control', () => {
  it('is a radiogroup whose active segment shows the check (the pressed-state cue)', async () => {
    const screen = render(MediaFigureControl, {
      role: 'center',
      mode: 'edit',
      onapply: () => {},
      onunwrap: () => {},
    } as never);
    const group = screen.container.querySelector('[role="radiogroup"]')!;
    expect(group).not.toBeNull();
    // Four segments, the active one carries a check svg (not hue alone).
    const radios = group.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(4);
    const center = screen.getByRole('radio', { name: /center/i });
    await expect.element(center).toHaveAttribute('aria-checked', 'true');
    expect(center.element().querySelector('svg')).not.toBeNull();
  });

  it('is keyboard-operable: clicking a segment selects it and emits the chosen role', async () => {
    const onapply = vi.fn();
    const screen = render(MediaFigureControl, {
      role: null,
      mode: 'wrap',
      onapply,
    } as never);
    await screen.getByRole('radio', { name: /full/i }).click();
    await expect.element(screen.getByRole('radio', { name: /full/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await screen.getByRole('button', { name: /wrap in figure/i }).click();
    expect(onapply).toHaveBeenCalledTimes(1);
    expect(onapply.mock.calls[0][0]).toEqual({ caption: '', role: 'full' });
  });

  it('maps the Measure segment to the null role on submit', async () => {
    const onapply = vi.fn();
    const screen = render(MediaFigureControl, {
      caption: 'A caption.',
      role: 'wide',
      mode: 'edit',
      onapply,
      onunwrap: () => {},
    } as never);
    await screen.getByRole('radio', { name: /measure/i }).click();
    await screen.getByRole('button', { name: /update figure/i }).click();
    expect(onapply.mock.calls[0][0]).toEqual({ caption: 'A caption.', role: null });
  });
});

describe('MediaFigureControl decorative-plus-caption warning', () => {
  it('shows the warning only when decorative AND the caption is non-empty', async () => {
    const screen = render(MediaFigureControl, {
      caption: 'The junction sign at the top.',
      role: null,
      mode: 'edit',
      decorative: true,
      onapply: () => {},
      onunwrap: () => {},
    } as never);
    await expect.element(screen.getByText(/hidden from screen readers/i)).toBeInTheDocument();
  });

  it('hides the warning when decorative but the caption is empty', async () => {
    const screen = render(MediaFigureControl, {
      caption: '',
      role: null,
      mode: 'edit',
      decorative: true,
      onapply: () => {},
      onunwrap: () => {},
    } as never);
    expect(screen.container.textContent ?? '').not.toMatch(/hidden from screen readers/i);
  });

  it('hides the warning when the image is described, even with a caption', async () => {
    const screen = render(MediaFigureControl, {
      caption: 'A described image with a caption.',
      role: null,
      mode: 'edit',
      decorative: false,
      onapply: () => {},
      onunwrap: () => {},
    } as never);
    expect(screen.container.textContent ?? '').not.toMatch(/hidden from screen readers/i);
  });
});

describe('MediaFigureControl unwrap', () => {
  it('emits onunwrap from the ghost action in edit mode', async () => {
    const onunwrap = vi.fn();
    const screen = render(MediaFigureControl, {
      caption: 'A caption.',
      role: 'wide',
      mode: 'edit',
      onapply: () => {},
      onunwrap,
    } as never);
    await screen.getByRole('button', { name: /unwrap/i }).click();
    expect(onunwrap).toHaveBeenCalledTimes(1);
  });
});
