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
  it('renders every tone as a badge carrying its status dot and label', () => {
    for (const [tone, dotClass] of Object.entries(STATUS_CHIP_DOT_CLASS)) {
      const screen = render(StatusChip, { tone: tone as never, label: 'Current' });
      const chip = screen.container.querySelector('.status-chip')!;
      expect(chip.className).toContain('badge');
      expect(chip.className).toContain('badge-outline');
      expect(chip.querySelector(`.${dotClass}`)).not.toBeNull();
      expect(chip.textContent).toContain('Current');
    }
  });

  it('never lets the badge fill carry the tone color, only the status dot', () => {
    const screen = render(StatusChip, { tone: 'danger', label: 'Overdue' });
    const chip = screen.container.querySelector('.status-chip')!;
    for (const badgeToneClass of ['badge-error', 'badge-success', 'badge-warning', 'badge-info', 'badge-neutral']) {
      expect(chip.className).not.toContain(badgeToneClass);
    }
  });

  it('defaults to the sm size and switches to xs on request', () => {
    const sm = render(StatusChip, { tone: 'neutral', label: 'Former' });
    const smChip = sm.container.querySelector('.status-chip')!;
    expect(smChip.className).toContain('badge-sm');
    expect(smChip.querySelector('.status-sm')).not.toBeNull();

    const xs = render(StatusChip, { tone: 'neutral', label: 'Former', size: 'xs' });
    const xsChip = xs.container.querySelector('.status-chip')!;
    expect(xsChip.className).toContain('badge-xs');
    expect(xsChip.querySelector('.status-xs')).not.toBeNull();
  });

  it('carries an optional legend into the tooltip and the accessible name, and omits both without one', () => {
    const withLegend = render(StatusChip, {
      tone: 'warning',
      label: 'Overdue',
      legend: 'Full benefits continue for 30 days.',
    });
    const withLegendChip = withLegend.container.querySelector('.status-chip')!;
    expect(withLegendChip.getAttribute('title')).toBe('Full benefits continue for 30 days.');
    expect(withLegendChip.getAttribute('aria-label')).toBe('Overdue: Full benefits continue for 30 days.');

    const withoutLegend = render(StatusChip, { tone: 'warning', label: 'Overdue' });
    const withoutLegendChip = withoutLegend.container.querySelector('.status-chip')!;
    expect(withoutLegendChip.getAttribute('title')).toBeNull();
    expect(withoutLegendChip.getAttribute('aria-label')).toBeNull();
  });
});
