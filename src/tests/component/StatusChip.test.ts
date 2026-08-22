import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatusChip, { STATUS_CHIP_DOT_CLASS } from '../../lib/admin-toolkit/StatusChip.svelte';

describe('STATUS_CHIP_DOT_CLASS', () => {
  it('covers the full tone vocabulary with a matching status-dot class', () => {
    expect(STATUS_CHIP_DOT_CLASS).toEqual({
      neutral: 'status-neutral',
      info: 'status-info',
      success: 'status-success',
      warning: 'status-warning',
      danger: 'status-error',
    });
  });
});

describe('StatusChip', () => {
  it('renders every tone as a badge carrying its status dot and label', async () => {
    for (const [tone, dotClass] of Object.entries(STATUS_CHIP_DOT_CLASS)) {
      const screen = await render(StatusChip, { tone: tone as never, label: 'Current' });
      const chip = screen.container.querySelector('.status-chip')!;
      expect(chip.className).toContain('badge');
      expect(chip.className).toContain('badge-outline');
      expect(chip.querySelector(`.${dotClass}`)).not.toBeNull();
      expect(chip.textContent).toContain('Current');
    }
  });

  it('never lets the badge fill carry the tone color, only the status dot', async () => {
    const screen = await render(StatusChip, { tone: 'danger', label: 'Overdue' });
    const chip = screen.container.querySelector('.status-chip')!;
    for (const badgeToneClass of ['badge-error', 'badge-success', 'badge-warning', 'badge-info', 'badge-neutral']) {
      expect(chip.className).not.toContain(badgeToneClass);
    }
  });

  it('defaults to the sm size and switches to xs on request', async () => {
    const sm = await render(StatusChip, { tone: 'neutral', label: 'Former' });
    const smChip = sm.container.querySelector('.status-chip')!;
    expect(smChip.className).toContain('badge-sm');
    expect(smChip.querySelector('.status-sm')).not.toBeNull();

    const xs = await render(StatusChip, { tone: 'neutral', label: 'Former', size: 'xs' });
    const xsChip = xs.container.querySelector('.status-chip')!;
    expect(xsChip.className).toContain('badge-xs');
    expect(xsChip.querySelector('.status-xs')).not.toBeNull();
  });

  it('demotes the badge-outline border to a 55% currentColor hairline, not the full-strength default', async () => {
    const screen = await render(StatusChip, { tone: 'danger', label: 'Overdue' });
    const chip = screen.container.querySelector('.status-chip')!;
    expect(chip.className).toContain('status-chip-bounded');
    const style = getComputedStyle(chip);
    // badge-outline alone would resolve `border-color: currentColor` to a fully opaque color; the
    // ratified bounded register mixes it down to 55% against transparent (Task 1 probe, clears the
    // audit's own 3:1 border-contrast floor in both themes). Chromium serializes a resolved
    // `color-mix(in oklab, ...)` as a functional color notation with a trailing `/ <alpha>`
    // component (e.g. `oklab(0 0 0 / 0.55)`), so the alpha is the number right before the
    // closing paren rather than an rgba() fourth channel.
    const alphaMatch = style.borderColor.match(/\/\s*([\d.]+)\s*\)\s*$/);
    expect(alphaMatch).not.toBeNull();
    const alpha = Number.parseFloat(alphaMatch![1]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeCloseTo(0.55, 2);
  });

  it('defaults to the bounded register and switches to quiet on request', async () => {
    const bounded = await render(StatusChip, { tone: 'neutral', label: 'Current' });
    const boundedChip = bounded.container.querySelector('.status-chip')!;
    expect(boundedChip.className).toContain('status-chip-bounded');
    expect(boundedChip.className).not.toContain('status-chip-quiet');

    const quiet = await render(StatusChip, { tone: 'neutral', label: 'Published', register: 'quiet' });
    const quietChip = quiet.container.querySelector('.status-chip')!;
    expect(quietChip.className).toContain('status-chip-quiet');
    expect(quietChip.className).not.toContain('status-chip-bounded');
    // The quiet register claims no border at all (Task 1 probe): border-width is context-free
    // (unlike the tinted ground, which depends on the admin theme's own tokens and so resolves
    // only inside the admin theme root), so it is the one quiet assertion this isolated render
    // can make honestly.
    expect(getComputedStyle(quietChip).borderWidth).toBe('0px');
  });

  it('keeps the sm size at a 5rem min-width floor (hugging was adversarially refuted) while xs stays floor-free', async () => {
    const sm = await render(StatusChip, { tone: 'neutral', label: 'Former' });
    const smChip = sm.container.querySelector('.status-chip')!;
    expect(getComputedStyle(smChip).minWidth).toBe('80px'); // 5rem at the default 16px root

    const xs = await render(StatusChip, { tone: 'neutral', label: 'Former', size: 'xs' });
    const xsChip = xs.container.querySelector('.status-chip')!;
    expect(getComputedStyle(xsChip).minWidth).toBe('0px');
  });

  it('carries an optional legend into the tooltip and a visually-hidden text node, and omits both without one', async () => {
    const withLegend = await render(StatusChip, {
      tone: 'warning',
      label: 'Overdue',
      legend: 'Full benefits continue for 30 days.',
    });
    const withLegendChip = withLegend.container.querySelector('.status-chip')!;
    expect(withLegendChip.getAttribute('title')).toBe('Full benefits continue for 30 days.');
    // The legend rides a visually-hidden span read straight after the visible label, not an
    // aria-label on the outer element (which some assistive technology exposes inconsistently),
    // so the chip's accessible name still reads "<label>: <legend>" via plain text concatenation.
    expect(withLegendChip.getAttribute('aria-label')).toBeNull();
    expect(withLegendChip.querySelector('.sr-only')?.textContent).toBe(': Full benefits continue for 30 days.');
    // The dot glyph's own empty span leaves a leading whitespace text node before the label;
    // trimming matches how running text (and an accessible-name computation) collapses it.
    expect((withLegendChip.textContent ?? '').trim()).toBe('Overdue: Full benefits continue for 30 days.');

    const withoutLegend = await render(StatusChip, { tone: 'warning', label: 'Overdue' });
    const withoutLegendChip = withoutLegend.container.querySelector('.status-chip')!;
    expect(withoutLegendChip.getAttribute('title')).toBeNull();
    expect(withoutLegendChip.getAttribute('aria-label')).toBeNull();
    expect(withoutLegendChip.querySelector('.sr-only')).toBeNull();
  });
});
