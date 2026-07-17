// Task 15: the two-tier tidy settings screen (spec 2.8). The visibility gate must be truthful: when
// tidy is disabled the editor tier is ABSENT (not disabled), no convention control sits in the tab
// order, and the honest gate note renders; when enabled-with-key the convention list renders with the
// check-and-tint toggles and the radiogroup variant choosers, and a toggle updates the summary
// role="status" region. The "reset to safe default" control returns the safe resting state.
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CairnTidySettings from '../../lib/components/CairnTidySettings.svelte';
import { defaultTidyConventions, type TidyConventions } from '../../lib/nav/site-config.js';
import type { SettingsData } from '../../lib/sveltekit/content-routes.js';

function data(over: Partial<SettingsData> = {}): SettingsData {
  return {
    enabled: true,
    tidyEnabled: true,
    keyConfigured: true,
    keyStatus: 'valid',
    model: 'claude-sonnet-4-6',
    modelLabel: 'Claude Sonnet',
    conventions: defaultTidyConventions(),
    saved: false,
    error: null,
    ...over,
  };
}

function conventions(over: Partial<TidyConventions> = {}): TidyConventions {
  return { ...defaultTidyConventions(), ...over };
}

describe('CairnTidySettings: the visibility gate (tidy disabled)', () => {
  it('renders the honest gate region and no editor-tier section', async () => {
    const screen = render(CairnTidySettings, {
      data: data({ enabled: false, tidyEnabled: false, keyConfigured: false, keyStatus: 'missing' }),
    });
    // The gate is a labelled region.
    await expect.element(screen.getByRole('region', { name: /tidy is not set up/i })).toBeInTheDocument();
    // The spellcheck reassurance is present.
    await expect.element(screen.getByText(/spellcheck is already working/i)).toBeInTheDocument();
    // No editor-tier section.
    expect(screen.container.querySelector('form[action="?/saveSettings"]')).toBeNull();
  });

  it('puts no convention control in the tab order (absent, not disabled)', async () => {
    const screen = render(CairnTidySettings, { data: data({ enabled: false, tidyEnabled: false, keyConfigured: false, keyStatus: 'missing' }) });
    // No check-and-tint toggle (aria-pressed) anywhere: the convention list is gone, not disabled.
    expect(screen.container.querySelectorAll('[aria-pressed]').length).toBe(0);
    // No radiogroup variant chooser either.
    expect(screen.container.querySelectorAll('[role="radiogroup"]').length).toBe(0);
    // And no disabled controls teasing the gated config.
    expect(screen.container.querySelectorAll('button[disabled]').length).toBe(0);
  });
});

describe('CairnTidySettings: the editor tier (enabled with key)', () => {
  it('renders the read-only developer facts including the model', async () => {
    const screen = render(CairnTidySettings, { data: data() });
    // Two copies of the pill exist (one per breakpoint, only one visible at a time via
    // hidden/sm:hidden), so assert on raw text content rather than a role/text query that
    // would find both.
    expect(screen.container.textContent).toMatch(/set by your developer/i);
    await expect.element(screen.getByText(/Claude Sonnet/)).toBeInTheDocument();
    // The form exists, so the editor tier is present.
    expect(screen.container.querySelector('form[action="?/saveSettings"]')).not.toBeNull();
  });

  it('renders the check-and-tint toggles and the style rows at rest', async () => {
    const screen = render(CairnTidySettings, { data: data() });
    // The Fixes group toggle is on (aria-pressed true).
    await expect.element(screen.getByRole('button', { name: 'Fixes' })).toHaveAttribute('aria-pressed', 'true');
    // A style row toggle is off at rest.
    await expect.element(screen.getByRole('button', { name: 'Oxford comma' })).toHaveAttribute('aria-pressed', 'false');
    // No variant chooser is open at rest (every style off).
    expect(screen.container.querySelectorAll('[role="radiogroup"]').length).toBe(0);
    // A pressed on/off toggle carries the neutral pressed pair, never a primary tint (the design
    // arc's accent reservation, 2026-07-15): weight and a neutral wash mark the active state.
    const fixesButton = screen.container.querySelector('[aria-label="Fixes"]');
    expect(fixesButton?.className).toContain('bg-base-content/[0.07]');
    expect(fixesButton?.className).not.toContain('bg-primary');
    expect(fixesButton?.className).not.toContain('text-primary');
  });

  it('renders the example diff chips colorless: muted strikethrough deletion, semibold insertion', async () => {
    // Same grammar TidyReview pins (the design arc's accent reservation, 2026-07-15): no red, no
    // green. A deletion is muted with line-through on the neutral del-run wash; an insertion is
    // semibold body ink on the neutral add-run wash.
    const screen = render(CairnTidySettings, { data: data() });
    const del = screen.container.querySelector<HTMLElement>('.line-through');
    expect(del).not.toBeNull();
    expect(del?.className).toContain('text-muted');
    expect(del?.className).not.toMatch(/error-ink|text-error/);
    const add = del?.nextElementSibling?.nextElementSibling as HTMLElement | undefined;
    expect(add?.className).toContain('font-semibold');
    expect(add?.className).toContain('text-base-content');
    expect(add?.className).not.toMatch(/positive-ink|text-success/);
  });

  it('reveals a radiogroup variant chooser when a multi-position row is turned on', async () => {
    const screen = render(CairnTidySettings, { data: data() });
    await screen.getByRole('button', { name: 'Time format' }).click();
    // The pick-one chooser is a radiogroup with radios carrying aria-checked, never aria-pressed.
    const group = screen.container.querySelector('[role="radiogroup"]')!;
    expect(group).not.toBeNull();
    const radios = group.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
    // The first variant is checked by default; it is the only tab stop.
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].getAttribute('tabindex')).toBe('0');
    expect(radios[1].getAttribute('tabindex')).toBe('-1');
    // No radio carries aria-pressed (that is only the binary on/off).
    expect(group.querySelectorAll('[role="radio"][aria-pressed]').length).toBe(0);
  });

  it('updates the summary role=status region when a convention is toggled', async () => {
    const screen = render(CairnTidySettings, { data: data() });
    // Oxford comma is off at rest, so the summary leaves commas alone.
    const summary = screen.container.querySelector('[role="status"][aria-live="polite"]')!;
    expect(summary.textContent).toMatch(/leaves alone.*commas/i);
    await screen.getByRole('button', { name: 'Oxford comma' }).click();
    // Now the summary names commas in the fix clause and drops them from "leaves alone".
    await expect.element(screen.getByRole('button', { name: 'Oxford comma' })).toHaveAttribute('aria-pressed', 'true');
    expect(summary.textContent).toMatch(/will fix.*commas/i);
  });

  it('the reset control returns the safe resting state', async () => {
    // Start with several style conventions on.
    const screen = render(CairnTidySettings, {
      data: data({ conventions: conventions({ oxfordComma: 'always', timeFormat: '5 PM', smartQuotes: true }) }),
    });
    await expect.element(screen.getByRole('button', { name: 'Oxford comma' })).toHaveAttribute('aria-pressed', 'true');
    await screen.getByRole('button', { name: /reset to typos only/i }).click();
    // Fixes back on, every style and advanced toggle off.
    await expect.element(screen.getByRole('button', { name: 'Fixes' })).toHaveAttribute('aria-pressed', 'true');
    await expect.element(screen.getByRole('button', { name: 'Oxford comma' })).toHaveAttribute('aria-pressed', 'false');
    await expect.element(screen.getByRole('button', { name: 'Time format' })).toHaveAttribute('aria-pressed', 'false');
    // The reset collapses every variant chooser too.
    expect(screen.container.querySelectorAll('[role="radiogroup"]').length).toBe(0);
    // The committed payload reflects the reset.
    const field = screen.container.querySelector<HTMLInputElement>('input[name="conventions"]')!;
    expect(JSON.parse(field.value)).toEqual({ fixes: true, enDashRanges: false, smartQuotes: false, brandCaps: false });
  });

  it('posts the live conventions in the hidden field', async () => {
    const screen = render(CairnTidySettings, { data: data() });
    await screen.getByRole('button', { name: 'Oxford comma' }).click();
    const field = screen.container.querySelector<HTMLInputElement>('input[name="conventions"]')!;
    expect(JSON.parse(field.value).oxfordComma).toBe('always');
  });
});

describe('CairnTidySettings: the broken-key state (save-500-honest-errors, Task 5)', () => {
  it('renders a distinct broken-key region, not the missing-setup gate, when the probe confirms invalid', async () => {
    const screen = render(CairnTidySettings, {
      data: data({ enabled: false, keyConfigured: true, keyStatus: 'invalid' }),
    });
    // A distinct labelled region names the broken key, not the "not set up yet" gate.
    await expect.element(screen.getByRole('region', { name: /key isn.t working/i })).toBeInTheDocument();
    expect(screen.container.querySelector('[aria-label="Tidy is not set up"]')).toBeNull();
    // No editor-tier section either: the gate stays closed.
    expect(screen.container.querySelector('form[action="?/saveSettings"]')).toBeNull();
  });

  it('keeps the editor tier open when the probe is unverifiable ("unknown"), never punishing it', async () => {
    const screen = render(CairnTidySettings, {
      data: data({ enabled: true, keyConfigured: true, keyStatus: 'unknown' }),
    });
    expect(screen.container.querySelector('form[action="?/saveSettings"]')).not.toBeNull();
  });
});
