import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { contrastRatio, type Rgba } from '../../lib/audit/color.js';
import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';

// CONTRACT (audit-admin-statuschip's badge-tier ruling, closing the ledger entry the
// toolkit-seams pass left open): `badge-error` and `badge-success` are the two admin-css-safelist
// badge entries that carry their own color (a "tone"), the same role `StatusChip`'s `register`
// prop plays for the chip family. Each tone's fill and its dedicated -content ink are measured
// against the register set's own text floor, the >= 4.5:1 WCAG 1.4.3 floor `warning`'s ink already
// holds in status-chip-register-tuning.test.ts, on both packaged admin themes. Measured (canvas
// readback): light error 4.848, light success 4.915, dark error 6.298, dark success 7.036 -- both
// tones clear the floor on both themes with no retune. `badge-soft`, `badge-outline`, and
// `badge-dash` carry no color of their own (each resolves through whichever badge-<tone> class, if
// any, sets --badge-color; standalone they render at the base ink-on-surface contrast every other
// admin surface already relies on), so they carry no legibility measurement here; the
// design-system chip recipe names them as shape-only.
const TEXT_FLOOR = 4.5;

let browser: Browser;
let css: string;

beforeAll(async () => {
  browser = await chromium.launch();
  css = await buildAdminCss();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

const THEMES = ['cairn-admin', 'cairn-admin-dark'] as const;
const TONES = ['badge-error', 'badge-success'] as const;

/** One badge tone's painted fill and ink, read from the real compiled sheet through a real page,
 *  the same substrate status-chip-register-tuning.test.ts reads the chip registers from. */
async function readBadge(
  toneClass: string,
  theme: (typeof THEMES)[number],
): Promise<{ fill: Rgba; ink: Rgba }> {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head><body>` +
        `<div data-theme="${theme}"><div style="background: var(--color-base-100); padding: 20px;">` +
        `<span class="badge ${toneClass}">Chip</span>` +
        `</div></div></body></html>`,
      { waitUntil: 'load' },
    );
    const raw = await page.evaluate(() => {
      const badge = document.querySelector('.badge')!;
      const cs = getComputedStyle(badge);
      return { fill: cs.backgroundColor, ink: cs.color };
    });
    const [fill, ink] = await resolveColors(page as unknown as RenderedPage, [raw.fill, raw.ink]);
    if (!fill || !ink) throw new Error(`could not resolve a badge color for ${toneClass}/${theme}`);
    return { fill, ink };
  } finally {
    await page.close();
  }
}

describe('badge tier legibility (audit-admin-statuschip, badge-tier half)', () => {
  describe.each(THEMES)('%s', (theme) => {
    it.each(TONES)('%s ink clears the >= 4.5:1 text floor against its own fill', async (toneClass) => {
      const { fill, ink } = await readBadge(toneClass, theme);
      expect(contrastRatio(ink, fill)).toBeGreaterThanOrEqual(TEXT_FLOOR);
    });
  });

  // FALSIFIABILITY, the same discipline status-chip-register-tuning.test.ts holds its own
  // assertions to: a canned pair known to sit under the floor this suite checks has to fail it.
  it('is falsifiable: a color pair under the floor fails the same check the tones pass', () => {
    const lowContrastInk: Rgba = { r: 150, g: 150, b: 150, a: 1 };
    const lightFill: Rgba = { r: 230, g: 210, b: 190, a: 1 };
    expect(contrastRatio(lowContrastInk, lightFill)).toBeLessThan(TEXT_FLOOR);
  });
}, 60_000);
