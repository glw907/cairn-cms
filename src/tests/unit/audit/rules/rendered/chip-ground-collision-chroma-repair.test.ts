// The chroma-aware repair (conformance pass, 2026-09-01) that closes the docket entry filed out of
// design infrastructure Pass 3, corpus C: the formula had no chroma term, so it produced a measured
// 60% false-positive rate (24 of 40) on the first real consumer admin it ran against
// (docs/internal/record/2026-07-design-infrastructure-audit-calibration.md, section 12). The
// false-positive classes named there were (a) hue-distinct chips the luminance-only formula could
// not tell from a genuine camouflage, 14 of the 24, described as "purple-tinted chips plainly
// visible to the eye", and (b) low-alpha, hue-tinted pills in dark theme reading bounded despite a
// low luminance ratio, the other 10. This file encodes both shapes as real-Chromium fixtures built
// from cairn's own ratified token math (`--color-warning` mixed into `--color-base-200`/`-300`, the
// `cairn-chip-warning` recipe `docs/reference/admin-toolkit.md` documents at a 1.16-1.47:1 band) and
// from plain sRGB pairs chosen to sit in the same shape, since the ASC corpus's own pixel data was
// not carried into this repo. Kept separate from `rulings.chip-ground-collision.test.ts`, which pins
// the ratified 1.5 luminance floor on its own axis and predates this repair.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { chipGroundCollision } from '../../../../../lib/audit/rules/rendered/chip-ground-collision.js';
import type { RenderedFinding, RenderedPage, RenderedRule } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `rule` against `html` in a real page and returns what it found. */
async function findingsFor(rule: RenderedRule, html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await rule.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: rule.states?.[0] ?? 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

const CHIP_STYLE = 'border-radius: 999px; padding: 2px 8px; font: 11px system-ui; display: inline-block;';

describe('chip-ground-collision: the chroma-aware repair rescues hue-distinct false positives', () => {
  // Corpus C class (a): a hue-distinct chip whose luminance sits close enough to the ground to fail
  // the luminance-only floor, but whose hue a sighted user reads as plainly bounded. Ratio measures
  // 1.36, well under RATIO_FLOOR, and would have flagged under the pre-repair formula.
  it('does not flag a lavender chip on a warm-neutral ground, close in luminance but distinct in hue', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:rgb(210,205,200)">
         <span class="badge" style="${CHIP_STYLE} background-color:rgb(195,165,222)">Pending</span>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // Corpus C class (b): a low-alpha, hue-tinted pill in dark theme, the "reads bounded" shape. The
  // chip's own composited fill lands close in luminance to its ground (ratio 1.26) but carries a
  // distinct blue hue against the ground's near-neutral one.
  it('does not flag a blue-tinted low-alpha pill on a dark neutral ground, close in luminance but distinct in hue', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:rgb(40,38,36)">
         <span class="badge" style="${CHIP_STYLE} background-color:rgb(35,55,85)">Draft</span>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // The repair narrows to hue-distinct pairs; it does not blanket-clear the rule. A chip and ground
  // that are both close in luminance AND close in hue (the genuine camouflage this rule exists to
  // catch) still reports.
  it('still flags a near-white chip on a near-white ground with no hue distinction to rescue it', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:rgb(244,244,244)">
         <span class="badge" style="${CHIP_STYLE} background-color:rgb(246,244,242)">Draft</span>
       </body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.tier).toBe('advisory');
    expect(findings[0]?.message).toContain('chroma distance');
  });

  // cairn's own ratified `cairn-chip-warning` recipe (admin-toolkit.md): `--color-warning`
  // (oklch(75% 0.15 70), real chroma) mixed 27% into `--color-base-200` (oklch(96.5% 0.006 75),
  // near-neutral), read against a `--color-base-300` zebra-row ground (oklch(89% 0.011 75)). The
  // recipe is documented as measuring in the 1.16-1.47:1 band by design, below RATIO_FLOOR; the
  // warning tint's own chroma is real hue distinction against a near-neutral zebra row, so the
  // repaired formula reads this as bounded rather than camouflaged.
  it('does not flag the cairn-chip-warning recipe against a zebra row, its own ratified low-contrast band', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:oklch(89% 0.011 75)">
         <span class="badge" style="${CHIP_STYLE}
               background-color:color-mix(in oklab, oklch(75% 0.15 70) 27%, oklch(96.5% 0.006 75))">Needs alt</span>
       </body>`
    );
    expect(findings).toEqual([]);
  });
});
