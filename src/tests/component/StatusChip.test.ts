import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import StatusChip from '../../lib/admin-toolkit/StatusChip.svelte';

describe('StatusChip', () => {
  it('renders the label as a badge, with no dot glyph (second generation, tone retired)', async () => {
    const screen = await render(StatusChip, { label: 'Current' });
    const chip = screen.container.querySelector('.status-chip')!;
    expect(chip.className).toContain('badge');
    expect(chip.className).toContain('badge-outline');
    expect(chip.querySelector('.status')).toBeNull();
    expect(chip.textContent).toContain('Current');
  });

  it('defaults to the sm size and switches to xs on request', async () => {
    const sm = await render(StatusChip, { label: 'Former' });
    const smChip = sm.container.querySelector('.status-chip')!;
    expect(smChip.className).toContain('badge-sm');

    const xs = await render(StatusChip, { label: 'Former', size: 'xs' });
    const xsChip = xs.container.querySelector('.status-chip')!;
    expect(xsChip.className).toContain('badge-xs');
  });

  it('defaults to the quiet register and switches to warning and outline on request', async () => {
    const quiet = await render(StatusChip, { label: 'Published' });
    const quietChip = quiet.container.querySelector('.status-chip')!;
    expect(quietChip.className).toContain('status-chip-quiet');
    expect(quietChip.className).not.toContain('status-chip-warning');
    expect(quietChip.className).not.toContain('status-chip-outline');

    const warning = await render(StatusChip, { label: 'Needs alt', register: 'warning' });
    const warningChip = warning.container.querySelector('.status-chip')!;
    expect(warningChip.className).toContain('status-chip-warning');
    expect(warningChip.className).not.toContain('status-chip-quiet');
    expect(warningChip.className).not.toContain('status-chip-outline');

    const outline = await render(StatusChip, { label: 'Suggested', register: 'outline' });
    const outlineChip = outline.container.querySelector('.status-chip')!;
    expect(outlineChip.className).toContain('status-chip-outline');
    expect(outlineChip.className).not.toContain('status-chip-quiet');
    expect(outlineChip.className).not.toContain('status-chip-warning');
  });

  it('demotes the outline register\'s border to a 55% currentColor hairline, not badge-outline\'s full-strength default', async () => {
    const screen = await render(StatusChip, { label: 'Overdue', register: 'outline' });
    const chip = screen.container.querySelector('.status-chip')!;
    const style = getComputedStyle(chip);
    // badge-outline alone would resolve `border-color: currentColor` to a fully opaque color; the
    // ratified outline register mixes it down to 55% against transparent (the successor of the
    // first generation's `bounded` register, unchanged recipe). Chromium serializes a resolved
    // `color-mix(in oklab, ...)` as a functional color notation with a trailing `/ <alpha>`
    // component (e.g. `oklab(0 0 0 / 0.55)`), so the alpha is the number right before the
    // closing paren rather than an rgba() fourth channel.
    const alphaMatch = style.borderColor.match(/\/\s*([\d.]+)\s*\)\s*$/);
    expect(alphaMatch).not.toBeNull();
    const alpha = Number.parseFloat(alphaMatch![1]);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeCloseTo(0.55, 2);
  });

  it('carries no border on the quiet or warning registers, unlike outline', async () => {
    const quiet = await render(StatusChip, { label: 'Published' });
    expect(getComputedStyle(quiet.container.querySelector('.status-chip')!).borderWidth).toBe('0px');

    const warning = await render(StatusChip, { label: 'Needs alt', register: 'warning' });
    expect(getComputedStyle(warning.container.querySelector('.status-chip')!).borderWidth).toBe('0px');
  });

  it('keeps the sm size at a 5rem min-width floor (hugging was adversarially refuted) while xs stays floor-free', async () => {
    const sm = await render(StatusChip, { label: 'Former' });
    const smChip = sm.container.querySelector('.status-chip')!;
    expect(getComputedStyle(smChip).minWidth).toBe('80px'); // 5rem at the default 16px root

    const xs = await render(StatusChip, { label: 'Former', size: 'xs' });
    const xsChip = xs.container.querySelector('.status-chip')!;
    expect(getComputedStyle(xsChip).minWidth).toBe('0px');
  });

  it('carries an optional legend into the tooltip and a visually-hidden text node', async () => {
    const withLegend = await render(StatusChip, {
      label: 'Overdue',
      register: 'warning',
      legend: 'Full benefits continue for 30 days.',
    });
    const withLegendChip = withLegend.container.querySelector('.status-chip')!;
    expect(withLegendChip.getAttribute('title')).toBe('Full benefits continue for 30 days.');
    // The legend rides a visually-hidden span read straight after the visible label, not an
    // aria-label on the outer element (which some assistive technology exposes inconsistently),
    // so the chip's accessible name still reads "<label>: <legend>" via plain text concatenation.
    expect(withLegendChip.getAttribute('aria-label')).toBeNull();
    expect(withLegendChip.querySelector('.sr-only')?.textContent).toBe(': Full benefits continue for 30 days.');
    expect((withLegendChip.textContent ?? '').trim()).toBe('Overdue: Full benefits continue for 30 days.');
  });

  it('carries no title at all without a legend, never the label repeated as its own tooltip', async () => {
    const withoutLegend = await render(StatusChip, { label: 'Overdue', register: 'warning' });
    const withoutLegendChip = withoutLegend.container.querySelector('.status-chip')!;
    expect(withoutLegendChip.hasAttribute('title')).toBe(false);
    expect(withoutLegendChip.getAttribute('aria-label')).toBeNull();
    expect(withoutLegendChip.querySelector('.sr-only')).toBeNull();
  });
});
