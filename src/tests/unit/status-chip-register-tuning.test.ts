import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { composite, contrastRatio, relativeLuminance, type Rgba } from '../../lib/audit/color.js';
import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';

// CONTRACT (second-generation chip registers, docs/internal/probes/2026-08-26-chip-registers-v2):
// every tinted fill (`quiet`, `warning`) holds a 1.16-1.47:1 contrast band against its own row
// ground, tuned per admin theme and per ground (the plain row, base-100, and the zebra stripe,
// base-200); the `outline` border holds the unrelated >= 3:1 non-text floor (WCAG 1.4.11); the
// `warning` register's own ink holds a >= 4.5:1 text floor (WCAG 1.4.3) against its own tinted
// fill. 3 registers x 2 themes x 2 grounds = 12 combinations, measured by canvas readback (paint
// the resolved color string, then read the pixel back), the same technique `resolveColors`
// already gives every rendered audit rule, because `getComputedStyle` alone hands back an
// unresolved `oklch()`/`color-mix()` string no regex can compare.
const FILL_BAND: [number, number] = [1.16, 1.47];
const OUTLINE_BORDER_FLOOR = 3;
const WARNING_INK_FLOOR = 4.5;

let browser: Browser;
let css: string;

beforeAll(async () => {
  browser = await chromium.launch();
  css = await buildAdminCss();
}, 60_000);

afterAll(async () => {
  await browser?.close();
});

/** One row ground: a plain admin row (base-100) or a zebra stripe (base-200), inside one theme. */
interface GroundCase {
  theme: 'cairn-admin' | 'cairn-admin-dark';
  ground: 'plain' | 'zebra';
  groundVar: '--color-base-100' | '--color-base-200';
}

const CASES: GroundCase[] = [
  { theme: 'cairn-admin', ground: 'plain', groundVar: '--color-base-100' },
  { theme: 'cairn-admin', ground: 'zebra', groundVar: '--color-base-200' },
  { theme: 'cairn-admin-dark', ground: 'plain', groundVar: '--color-base-100' },
  { theme: 'cairn-admin-dark', ground: 'zebra', groundVar: '--color-base-200' },
];

/** One chip's painted fill, ink, and border, each resolved to exact sRGB, plus the ground it
 *  sits on. Reads the real compiled sheet through a real page, the same substrate every other
 *  chip proof in this repo (status-chip-register-parity.test.ts, chip-ground-collision.ts) uses. */
async function readChip(
  registerClass: string,
  { theme, groundVar }: GroundCase,
): Promise<{ fill: Rgba; ink: Rgba; border: Rgba; ground: Rgba }> {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>${css}</style></head><body>` +
        `<div data-theme="${theme}"><div style="background: var(${groundVar}); padding: 20px;">` +
        `<span class="badge badge-outline ${registerClass}">Chip</span>` +
        `</div></div></body></html>`,
      { waitUntil: 'load' },
    );
    const raw = await page.evaluate(() => {
      const chip = document.querySelector('.badge')!;
      const ground = chip.parentElement!;
      const chipStyle = getComputedStyle(chip);
      const groundStyle = getComputedStyle(ground);
      return {
        fill: chipStyle.backgroundColor,
        ink: chipStyle.color,
        border: chipStyle.borderColor,
        ground: groundStyle.backgroundColor,
      };
    });
    const [fill, ink, border, ground] = await resolveColors(page as unknown as RenderedPage, [
      raw.fill,
      raw.ink,
      raw.border,
      raw.ground,
    ]);
    if (!fill || !ink || !border || !ground) {
      throw new Error(`could not resolve a chip color for ${registerClass}/${theme}/${groundVar}`);
    }
    return { fill, ink, border, ground };
  } finally {
    await page.close();
  }
}

/** The chip's own fill, composited onto its ground; ground is treated as fully opaque, matching
 *  how a real admin row actually paints (no rendered ancestor ever leaves alpha < 1 here). */
function onGround(layer: Rgba, ground: Rgba): Rgba {
  return composite(layer, { ...ground, a: 1 });
}

describe('chip register tuning (second generation)', () => {
  describe.each(CASES)('$theme / $ground', (groundCase) => {
    it('quiet fill holds the 1.16-1.47:1 band against its row ground', async () => {
      const { fill, ground } = await readChip('cairn-chip-quiet', groundCase);
      const ratio = contrastRatio(onGround(fill, ground), ground);
      expect(ratio).toBeGreaterThanOrEqual(FILL_BAND[0]);
      expect(ratio).toBeLessThanOrEqual(FILL_BAND[1]);
    });

    it('warning fill holds the 1.16-1.47:1 band against its row ground', async () => {
      const { fill, ground } = await readChip('cairn-chip-warning', groundCase);
      const ratio = contrastRatio(onGround(fill, ground), ground);
      expect(ratio).toBeGreaterThanOrEqual(FILL_BAND[0]);
      expect(ratio).toBeLessThanOrEqual(FILL_BAND[1]);
    });

    it('warning ink clears the >= 4.5:1 text floor against its own fill', async () => {
      const { fill, ink, ground } = await readChip('cairn-chip-warning', groundCase);
      const compositedFill = onGround(fill, ground);
      expect(contrastRatio(ink, compositedFill)).toBeGreaterThanOrEqual(WARNING_INK_FLOOR);
    });

    it('outline border clears the >= 3:1 non-text floor against its row ground', async () => {
      const { border, ground } = await readChip('cairn-chip-outline', groundCase);
      const compositedBorder = onGround(border, ground);
      expect(contrastRatio(compositedBorder, ground)).toBeGreaterThanOrEqual(OUTLINE_BORDER_FLOOR);
    });
  });

  // FALSIFIABILITY (part of this task's own acceptance, not an incidental extra): the assertion
  // above has to be capable of failing, not merely capable of passing. `relativeLuminance` and
  // `contrastRatio` are the two functions carrying the whole proof, so a canned pair known to sit
  // outside every floor this suite checks pins that they still say so. This was also proven by
  // hand against the real CSS during tuning: setting `--cairn-chip-quiet-mix` in the dark theme
  // root to 40% (well outside the ratified band) turned the two `quiet` fill assertions above red
  // (measured 2.358/2.805 against the 1.16-1.47 band), and restoring 18% turned them green again.
  it('is falsifiable: a color pair outside every floor here fails the same checks these pass', () => {
    const camouflaged: Rgba = { r: 200, g: 200, b: 200, a: 1 };
    const ground: Rgba = { r: 202, g: 202, b: 202, a: 1 };
    const ratio = contrastRatio(camouflaged, ground);
    expect(ratio).toBeLessThan(FILL_BAND[0]);

    const lowContrastInk: Rgba = { r: 150, g: 150, b: 150, a: 1 };
    const lightFill: Rgba = { r: 230, g: 210, b: 190, a: 1 };
    expect(contrastRatio(lowContrastInk, lightFill)).toBeLessThan(WARNING_INK_FLOOR);

    const weakBorder: Rgba = { r: 210, g: 210, b: 210, a: 1 };
    const paleGround: Rgba = { r: 230, g: 230, b: 230, a: 1 };
    expect(contrastRatio(weakBorder, paleGround)).toBeLessThan(OUTLINE_BORDER_FLOOR);
    expect(relativeLuminance(camouflaged)).toBeGreaterThan(0);
  });
}, 60_000);
