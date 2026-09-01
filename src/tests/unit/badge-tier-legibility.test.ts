import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { composite, contrastRatio, type Rgba } from '../../lib/audit/color.js';
import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';

// CONTRACT (audit-admin-statuschip's badge-tier ruling, closing the ledger entry the
// toolkit-seams pass left open): every admin-css-safelist badge entry gets a rendered legibility
// measurement, on both packaged admin themes, against the register set's own floors
// (status-chip-register-tuning.test.ts is the precedent for both the technique and the floors).
//
// Two shapes of badge, two measurement recipes:
//
// `badge-error`/`badge-success`/`badge-soft` each paint their own fill and their own ink (`soft`
// resolves through daisyUI 5.7.20's own recipe, `color:var(--badge-color,var(--color-base-content))`
// over `background-color:color-mix(in oklab, var(--badge-color,var(--color-base-content)) 8%,
// var(--color-base-100))`, so a standalone `badge-soft` carries a base-content-derived fill and ink
// even though it names no tone of its own). Each one's ink is measured against its own fill, the
// same >= 4.5:1 WCAG 1.4.3 text floor `warning`'s ink already holds in
// status-chip-register-tuning.test.ts. Measured (canvas readback): light error 4.848, light success
// 4.915, light soft 12.736, dark error 6.298, dark success 7.036, dark soft 11.244 -- every tone
// clears the floor on both themes with no retune.
//
// `badge-outline`/`badge-dash` paint no fill of their own (`background-color` stays transparent;
// daisyUI declares `color:var(--badge-color)` with no fallback, so the ink and the currentColor
// border both inherit whatever ancestor `color` surrounds them, `--color-base-content` on a plain
// admin row). Their inherited ink is measured against the row ground, the same >= 4.5:1 text floor,
// and their currentColor border against the unrelated >= 3:1 non-text floor (WCAG 1.4.11) the
// `outline` chip register already holds in status-chip-register-tuning.test.ts. Measured (canvas
// readback): light ink/border 15.087, dark ink/border 13.322 -- both classes clear both floors on
// both themes with no retune, so no legibility measurement blocks their blessing.
const TEXT_FLOOR = 4.5;
const OUTLINE_BORDER_FLOOR = 3;

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
const OWN_FILL_CLASSES = ['badge-error', 'badge-success', 'badge-soft'] as const;
const SHAPE_ONLY_CLASSES = ['badge-outline', 'badge-dash'] as const;

/** One badge class's painted fill, ink, border, and the row ground it sits on, read from the real
 *  compiled sheet through a real page, the same substrate status-chip-register-tuning.test.ts
 *  reads the chip registers from. */
async function readBadge(
  badgeClass: string,
  theme: (typeof THEMES)[number],
): Promise<{ fill: Rgba; ink: Rgba; border: Rgba; ground: Rgba }> {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head><body>` +
        `<div data-theme="${theme}"><div style="background: var(--color-base-100); padding: 20px;">` +
        `<span class="badge ${badgeClass}">Chip</span>` +
        `</div></div></body></html>`,
      { waitUntil: 'load' },
    );
    const raw = await page.evaluate(() => {
      const badge = document.querySelector('.badge')!;
      const ground = badge.parentElement!;
      const cs = getComputedStyle(badge);
      const gs = getComputedStyle(ground);
      return { fill: cs.backgroundColor, ink: cs.color, border: cs.borderColor, ground: gs.backgroundColor };
    });
    const [fill, ink, border, ground] = await resolveColors(page as unknown as RenderedPage, [
      raw.fill,
      raw.ink,
      raw.border,
      raw.ground,
    ]);
    if (!fill || !ink || !border || !ground) {
      throw new Error(`could not resolve a badge color for ${badgeClass}/${theme}`);
    }
    return { fill, ink, border, ground };
  } finally {
    await page.close();
  }
}

/** `layer` composited onto its ground; ground is treated as fully opaque, matching how a real
 *  admin row actually paints. */
function onGround(layer: Rgba, ground: Rgba): Rgba {
  return composite(layer, { ...ground, a: 1 });
}

describe('badge tier legibility (audit-admin-statuschip, badge-tier half)', () => {
  describe.each(THEMES)('%s', (theme) => {
    it.each(OWN_FILL_CLASSES)('%s ink clears the >= 4.5:1 text floor against its own fill', async (badgeClass) => {
      const { fill, ink, ground } = await readBadge(badgeClass, theme);
      expect(contrastRatio(ink, onGround(fill, ground))).toBeGreaterThanOrEqual(TEXT_FLOOR);
    });

    it.each(SHAPE_ONLY_CLASSES)('%s inherited ink clears the >= 4.5:1 text floor against the row ground', async (badgeClass) => {
      const { ink, ground } = await readBadge(badgeClass, theme);
      expect(contrastRatio(ink, ground)).toBeGreaterThanOrEqual(TEXT_FLOOR);
    });

    it.each(SHAPE_ONLY_CLASSES)('%s currentColor border clears the >= 3:1 non-text floor against the row ground', async (badgeClass) => {
      const { border, ground } = await readBadge(badgeClass, theme);
      expect(contrastRatio(onGround(border, ground), ground)).toBeGreaterThanOrEqual(OUTLINE_BORDER_FLOOR);
    });
  });

  // FALSIFIABILITY, the same discipline status-chip-register-tuning.test.ts holds its own
  // assertions to: a canned pair known to sit under each floor this suite checks has to fail it.
  it('is falsifiable: a color pair under each floor fails the same checks the badges pass', () => {
    const lowContrastInk: Rgba = { r: 150, g: 150, b: 150, a: 1 };
    const lightFill: Rgba = { r: 230, g: 210, b: 190, a: 1 };
    expect(contrastRatio(lowContrastInk, lightFill)).toBeLessThan(TEXT_FLOOR);

    const weakBorder: Rgba = { r: 210, g: 210, b: 210, a: 1 };
    const paleGround: Rgba = { r: 230, g: 230, b: 230, a: 1 };
    expect(contrastRatio(weakBorder, paleGround)).toBeLessThan(OUTLINE_BORDER_FLOOR);
  });
}, 60_000);
