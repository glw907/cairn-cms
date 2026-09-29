// cairn-cms: the alert idiom rules. The four color variants (error, warning, success, info)
// become a tinted panel with a hairline edge and an on-surface ink, in place of daisyUI's solid
// slab; a bare `.alert` and daisyUI's own style variants (`alert-soft`, `alert-outline`,
// `alert-dash`) are excluded and keep daisyUI's stock look. The bare-`.alert` and `alert-soft`
// oracles read through daisyUI's own formula (the shared resolveColor probe, mounted as the
// alert under test's own context, so `--alert-color` resolves to whatever that element's own
// rules set). The four tinted-panel variants instead compare against the table's own panel,
// edge, and ink expressions, an independent oracle from what the rule under test writes, so the
// assertion cannot pass on any --alert-color value the rule happens to produce.
import { describe, expect, it } from 'vitest';
import { renderInTheme, resolveColor, type Theme } from './_idiom-probe.js';

const THEMES: Theme[] = ['cairn-admin', 'cairn-admin-dark'];

/** daisyUI's own background formula, the stock oracle a bare `.alert` and `alert-soft` read
 *  through, differing only in what `--alert-color` resolves to at the mounted element. */
const STOCK_BG = 'var(--alert-color, var(--color-base-200))';
/** daisyUI's own border formula, the stock oracle a bare `.alert` reads through the same way. */
const STOCK_BORDER = 'var(--alert-border-color, var(--color-base-200))';

/** One row per tinted-panel variant: its class, the panel and edge expressions the spec's table
 *  states (as a function of `theme`, since success and info split their panel percentage per
 *  root), and the ink token this rule's `color` declaration sets. */
const VARIANTS: {
  name: string;
  cls: string;
  ink: string;
  panel: (theme: Theme) => string;
  border: (theme: Theme) => string;
}[] = [
  {
    name: 'error',
    cls: 'alert-error',
    ink: 'var(--cairn-error-ink)',
    panel: () => 'var(--cairn-error-tint)',
    border: () => 'var(--cairn-error-border)',
  },
  {
    name: 'warning',
    cls: 'alert-warning',
    ink: 'var(--cairn-warning-ink)',
    panel: () => 'color-mix(in oklab, var(--color-warning) 12%, var(--color-base-100))',
    border: () => 'color-mix(in oklab, var(--color-warning) 45%, var(--color-base-100))',
  },
  {
    name: 'success',
    cls: 'alert-success',
    ink: 'var(--color-positive-ink)',
    panel: (theme) =>
      `color-mix(in oklab, var(--color-success) ${theme === 'cairn-admin-dark' ? 12 : 7}%, var(--color-base-100))`,
    border: () => 'color-mix(in oklab, var(--color-success) 30%, var(--color-base-100))',
  },
  {
    name: 'info',
    cls: 'alert-info',
    ink: 'var(--cairn-info-ink)',
    panel: (theme) =>
      `color-mix(in oklab, var(--color-info) ${theme === 'cairn-admin-dark' ? 12 : 7}%, var(--color-base-100))`,
    border: () => 'color-mix(in oklab, var(--color-info) 30%, var(--color-base-100))',
  },
];

describe.each(THEMES)('the alert idiom rules (%s)', (theme) => {
  it.each(VARIANTS)('$name becomes a tinted panel with a hairline edge and an on-surface ink', ({ cls, ink, panel, border }) => {
    const { wrapper, cleanup } = renderInTheme(`<div class="alert ${cls}" role="alert">Message</div>`, theme);
    try {
      const el = wrapper.querySelector('.alert')!;
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColor(panel(theme), theme, el));
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor(border(theme), theme, el));
      expect(getComputedStyle(el).color).toBe(resolveColor(ink, theme, el));
    } finally {
      cleanup();
    }
  });

  // A bare .alert sets neither --alert-color nor --alert-border-color, so the stock formula's own
  // fallback (--color-base-200) is what both properties resolve to, unchanged by this rule family.
  it('a bare .alert keeps daisyUI\'s stock look', () => {
    const { wrapper, cleanup } = renderInTheme('<div class="alert" role="alert">Message</div>', theme);
    try {
      const el = wrapper.querySelector('.alert')!;
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColor(STOCK_BG, theme, el));
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColor(STOCK_BORDER, theme, el));
    } finally {
      cleanup();
    }
  });

  // alert-soft is one of the excluded style variants, so this rule never touches it: the
  // background stays daisyUI's own alert-soft formula (an 8% mix of --alert-color, which
  // alert-info's own stock rule still sets to --color-info) rather than this rule's tinted panel.
  it('alert-soft alert-info keeps daisyUI\'s own 8% mix, not the tinted-panel rule', () => {
    const { wrapper, cleanup } = renderInTheme('<div class="alert alert-soft alert-info" role="alert">Message</div>', theme);
    try {
      const el = wrapper.querySelector('.alert')!;
      const expected = resolveColor(
        'color-mix(in oklab, var(--alert-color, var(--color-base-content)) 8%, var(--color-base-100))',
        theme,
        el,
      );
      expect(getComputedStyle(el).backgroundColor).toBe(expected);
    } finally {
      cleanup();
    }
  });

  // A markup utility still wins over the ink: text-base-content is compiled into the admin sheet
  // already (several components carry it), unlayered, so it outranks this rule's nested-sublayer
  // color declaration.
  it('alert-error text-base-content takes the utility\'s ink', () => {
    const { wrapper, cleanup } = renderInTheme(
      '<div class="alert alert-error text-base-content" role="alert">Message</div>',
      theme,
    );
    try {
      const el = wrapper.querySelector('.alert')!;
      expect(getComputedStyle(el).color).toBe(resolveColor('var(--color-base-content)', theme, el));
    } finally {
      cleanup();
    }
  });
});
