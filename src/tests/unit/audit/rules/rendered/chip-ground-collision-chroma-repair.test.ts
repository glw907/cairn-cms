// The chroma-aware repair (conformance pass, 2026-09-01) that closes the hue-driven half of the
// docket entry filed out of design infrastructure Pass 3, corpus C: the formula had no chroma
// term, so it produced a measured 60% false-positive rate (24 of 40) on the first real consumer
// admin it ran against (docs/internal/record/2026-07-design-infrastructure-audit-calibration.md,
// section 12). The corpus named TWO false-positive mechanisms, not one: (a) hue-distinct chips the
// luminance-only formula could not tell from a genuine camouflage, 14 of the 24, described as
// "purple-tinted chips plainly visible to the eye", and (b) low-alpha pills in dark theme reading
// bounded despite a low luminance ratio, the other 10, described as reading bounded at 1.20 to
// 1.43. This repair closes class (a) only: a collision now also requires a real hue/chroma
// distance (`color.ts`'s `chromaDistance`), which rescues a hue-distinct pair but does nothing for
// a pair that is genuinely near-neutral on both sides. Class (b), built here from cairn's own dark
// tokens rather than an invented hue, measures near-zero chroma distance and STILL FLAGS after this
// repair; that is a correctly documented open residual, not a regression. The floor-recalibration
// half of the filed repair (a distance formula that can see hue, PLUS a recalibrated floor) stays
// unbuilt, per ROADMAP: no honest new floor can be derived without the ASC corpus's own measured
// pixel data, which was never carried into this repo.
//
// Reuses the shared `chip-ground-collision-harness.ts` page-setup helper, the same one
// `rulings.chip-ground-collision.test.ts` uses, rather than re-implementing it; kept as its own
// file because that one pins the ratified 1.5 luminance floor on its own axis and predates this
// repair.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { chipGroundCollision } from '../../../../../lib/audit/rules/rendered/chip-ground-collision.js';
import { findingsFor } from './chip-ground-collision-harness.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const CHIP_STYLE = 'border-radius: 999px; padding: 2px 8px; font: 11px system-ui; display: inline-block;';

describe('chip-ground-collision: the chroma repair rescues the hue-distinct false-positive class', () => {
  // Corpus C class (a): a hue-distinct chip whose luminance sits close enough to the ground to fail
  // the luminance-only floor, but whose hue a sighted user reads as plainly bounded. Ratio measures
  // 1.36, well under RATIO_FLOOR, and would have flagged under the pre-repair formula.
  it('does not flag a lavender chip on a warm-neutral ground, close in luminance but distinct in hue', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:rgb(210,205,200)">
         <span class="badge" style="${CHIP_STYLE} background-color:rgb(195,165,222)">Pending</span>
       </body>`,
      browser
    );
    expect(findings).toEqual([]);
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
       </body>`,
      browser
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
       </body>`,
      browser
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.tier).toBe('advisory');
    expect(findings[0]?.message).toContain('chroma distance');
  });
});

describe('chip-ground-collision: the dark-theme ghost-pill class stays open, by design', () => {
  // Corpus C class (b), the "reads bounded" dark-theme pills: near-neutral on both sides, so the
  // repair's chroma term has nothing to rescue with. Built from cairn's own dark-theme tokens
  // (cairn-admin.css) rather than an invented hue, since the whole point is that this class carries
  // none: base-300 on base-200 measures ratio 1.432 and chroma distance 2.66 (real Chromium,
  // resolveColors' canvas round trip), and the sibling pairs base-200-on-base-100 (ratio 1.190,
  // chroma distance 0.89) and base-300-on-base-100 (ratio 1.203, chroma distance 1.77) measure the
  // same shape. All three sit under both RATIO_FLOOR (1.5) and CHROMA_DISTINCT_FLOOR (10), so all
  // three still flag. Closing this class needs the filed floor-recalibration half of the repair,
  // which needs measured pixel data from a real consumer admin audit run this repo does not carry
  // (see ROADMAP.md); asserting a rescue here would be the fixture lying about what shipped.
  it('still flags a dark-theme near-neutral pill pair with no hue for the chroma term to see', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:oklch(15.5% 0.009 75)">
         <span class="badge" style="${CHIP_STYLE} background-color:oklch(30% 0.014 75)">Draft</span>
       </body>`,
      browser
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.tier).toBe('advisory');
    expect(findings[0]?.message).toContain('contrast 1.43');
  });
});
