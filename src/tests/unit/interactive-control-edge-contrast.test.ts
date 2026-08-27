import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { buildAdminCss } from '../../../scripts/build/build-admin-css.mjs';
import { composite, contrastRatio, type Rgba } from '../../lib/audit/color.js';
import { resolveColors, type RenderedPage } from '../../lib/audit/rendered.js';

// CONTRACT (Task 6, admin sheet fixes, 2026-08-27): daisyUI's `.checkbox`/`.radio` base rules
// border an unchecked control at a 20% `--color-base-content` mix when no color variant supplies
// `--input-color`, and no admin call site sets one, so every unchecked toggle in the admin falls
// to that fallback. `cairn-admin.css`'s own pinned unlayered rule 12 of 12 raises the edge to a
// 55% mix, the same one already locked for the scrollbar thumb and the outline chip border. This
// is the standing readback proof, in the same canvas-readback mold as
// status-chip-register-tuning.test.ts (paint the resolved color, then read the pixel back,
// because getComputedStyle alone hands back an unresolved oklch()/color-mix() string). Extends
// that sibling proof rather than editing it: the chip file measures a fill-vs-ground band, this
// file measures a border-vs-ground floor, on different controls.
const NON_TEXT_FLOOR = 3;

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

/** One control's unchecked border, composited onto the plain admin row ground (base-100), read
 *  from the real compiled sheet through a real page, the same substrate every other rendered
 *  contrast proof in this repo uses. An optional `overrideCss` string appends after the compiled
 *  sheet, for the falsifiability proof below. */
async function readEdge(
  theme: (typeof THEMES)[number],
  tag: 'input',
  cls: 'checkbox' | 'radio',
  overrideCss = '',
): Promise<{ border: Rgba; ground: Rgba }> {
  const page = await browser.newPage();
  try {
    await page.setContent(
      `<!doctype html><html><head><style>${css}\n${overrideCss}</style></head><body>` +
        `<div data-theme="${theme}"><div style="background: var(--color-base-100); padding: 20px;">` +
        `<${tag} class="${cls}" type="${cls === 'checkbox' ? 'checkbox' : 'radio'}" />` +
        `</div></div></body></html>`,
      { waitUntil: 'load' },
    );
    const raw = await page.evaluate((cls) => {
      const el = document.querySelector('.' + cls)!;
      const ground = el.parentElement!;
      return {
        border: getComputedStyle(el).borderColor,
        ground: getComputedStyle(ground).backgroundColor,
      };
    }, cls);
    const [border, ground] = await resolveColors(page as unknown as RenderedPage, [raw.border, raw.ground]);
    if (!border || !ground) throw new Error(`could not resolve an edge color for ${cls}/${theme}`);
    return { border, ground };
  } finally {
    await page.close();
  }
}

describe('unchecked checkbox/radio edge contrast', () => {
  describe.each(THEMES)('%s', (theme) => {
    it('checkbox edge clears the >= 3:1 non-text floor against base-100', async () => {
      const { border, ground } = await readEdge(theme, 'input', 'checkbox');
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    });

    it('radio edge clears the >= 3:1 non-text floor against base-100', async () => {
      const { border, ground } = await readEdge(theme, 'input', 'radio');
      const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
      expect(ratio).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
    });
  });

  // FALSIFIABILITY, part of this task's own acceptance: the assertions above have to be capable
  // of failing, not merely capable of passing. Overriding the pinned rule's 55% mix back down to
  // daisyUI's stock 20% fallback (the exact construction the rule replaces) reproduces the
  // pre-fix measurement (1.492:1 light / 1.773:1 dark, both under the 3:1 floor this suite
  // checks), proving the assertions above are load-bearing rather than vacuous. Restoring 55%
  // (what the shipped sheet actually ships, exercised by every case above) turns it green again.
  it('is falsifiable: reverting the pinned mix to the daisyUI 20% fallback fails the same check', async () => {
    const revert =
      ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) " +
      ":is(.checkbox, .radio):not(:checked, :indeterminate, [aria-checked='true']) " +
      '{ border-color: color-mix(in oklab, var(--color-base-content) 20%, transparent) !important; }';
    const { border, ground } = await readEdge('cairn-admin', 'input', 'checkbox', revert);
    const ratio = contrastRatio(composite(border, { ...ground, a: 1 }), ground);
    expect(ratio).toBeLessThan(NON_TEXT_FLOOR);
  });
}, 60_000);
