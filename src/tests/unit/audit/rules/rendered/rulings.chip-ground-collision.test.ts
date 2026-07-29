// Task 16b ruling 3: the chip-ground-collision floor of 1.5 is RATIFIED (Geoff, 2026-07-28), not
// borrowed-and-pending as the rule's own header once flagged it. This file pins that ratified
// number with a real-Chromium boundary fixture, mirroring browser-regressions.test.ts's own shape,
// so a future change to the shared color substrate (color.ts, rendered.ts) that nudges the floor's
// behavior fails a test here rather than passing quietly. That is exactly how the dark-theme
// regression this pass caught got past every other gate: an always-opaque canvas default moved a
// real 1.11 collision to a manufactured 1.514, one hundredth over this same 1.5 line, and the rule
// reported clean.
//
// Kept as its own file rather than appended to browser-regressions.test.ts: that file is the
// adversarial-demonstration record for bugs this pass found and fixed, and this fixture pins a
// RATIFIED design constant rather than a defect, a different kind of claim with its own reason to
// exist.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { exitCodeFor } from '../../../../../lib/audit/report.js';
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

/** The selectors a run reported, for the assertions that care about which element was named. */
function selectors(findings: RenderedFinding[]): string[] {
  return findings.map((finding) => finding.selector);
}

// Both fixtures share one ground, rgb(200, 200, 200), a plain sRGB gray chosen so the WCAG
// arithmetic is exact integer-in, integer-out with no oklch round trip to blur the boundary. The
// two chip grays differ by exactly one channel step, 242 versus 243, which is as close to the 1.5
// line as two distinguishable sRGB colors can sit: 242-on-200 measures 1.4945:1 (below the floor,
// reports) and 243-on-200 measures 1.5078:1 (above it, does not). Computed with the same WCAG 2.x
// relative-luminance formula color.ts implements (`(L_light + 0.05) / (L_dark + 0.05)`).
const GROUND_STYLE = 'background-color: rgb(200, 200, 200); padding: 8px; display: inline-block;';
const CHIP_STYLE = 'border-radius: 999px; padding: 2px 8px; font: 11px system-ui; display: inline-block;';

describe('chip-ground-collision floor, ratified at 1.5 (Task 16b ruling 3)', () => {
  it('reports a chip measuring 1.4945:1, one channel step under the floor', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body><div style="${GROUND_STYLE}">
         <span class="badge" style="${CHIP_STYLE} background-color: rgb(242, 242, 242)">Draft</span>
       </div></body>`
    );
    expect(selectors(findings)).toEqual(['span.badge']);
    expect(findings[0]?.message).toContain('contrast 1.49');
  });

  it('does not report a chip measuring 1.5078:1, one channel step over the floor', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body><div style="${GROUND_STYLE}">
         <span class="badge" style="${CHIP_STYLE} background-color: rgb(243, 243, 243)">Draft</span>
       </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // The pair above pins the NUMBER and is blind to the ARITHMETIC that feeds it: both chips are
  // fully opaque on an opaque ground, so the page canvas cannot influence the result at all, and
  // the exact one-line regression this file's header recounts (resolving the chip's own fill against
  // the page canvas instead of against its own ground) can be reintroduced with both of them still
  // green. This fixture is the one that fails: /admin/media's own shape, a translucent chip on a
  // dark panel over a LIGHT page canvas, where resolving against the canvas lightens the chip out of
  // the collision entirely.
  it('measures a translucent chip against its own ground, not against the page canvas', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:oklch(99% 0.004 75)">
         <div style="background-color:oklch(25% 0.01 75);padding:24px;width:400px">
           <span class="badge" style="${CHIP_STYLE}
                 background-color:oklab(0.26 0.00258819 0.00965926 / 0.55)">used 3</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.badge']);
    expect(findings[0]?.message).toContain('contrast 1.0');
  });

  // `opacity` composites an element WITH its subtree, so an ancestor's dims the chip exactly as much
  // as it dims the ground behind it. The chip's own fill was resolved at its OWN opacity while its
  // ground was resolved at the whole chain's, so a chip under a 25%-opacity wrapper scored 4.4
  // against a ground the same wrapper had already washed out. Read off a screenshot, the painted
  // pixels of this fixture measure 1.18, well under the ratified floor. cairn's own TidyReview,
  // ConceptList, and EditPage all render painted surfaces under `opacity-*` wrappers.
  it('measures a chip under a dimming ancestor at the strength it actually paints', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:oklch(99% 0.004 75)">
         <div style="opacity:0.25;background-color:oklch(26% 0.014 75);padding:40px;width:600px">
           <span class="badge" style="${CHIP_STYLE} background-color:oklch(52% 0.014 75)">Draft</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.badge']);
    expect(findings[0]?.message).toContain('contrast 1.1');
  });
});

describe('chip-ground-collision: a ground the ancestor chain does not carry', () => {
  // CairnMediaLibrary renders its usage chip as an absolutely positioned SIBLING of the thumbnail
  // `<img>`, so the pixels behind the chip belong to the image and no ancestor carries them. The
  // rule composited the card fill instead and reported a constant 1.06 collision, at ERROR tier, on
  // a chip that measures 12.98 against the thumbnail it actually sits on. The reported number was
  // independent of what the image contains, which is the worse property: the verdict carried no
  // information about the pixels either way.
  it('reports an unmeasurable ground rather than an error, for a chip over a sibling image', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0">
         <div style="position:relative;width:400px;height:300px;background-color:oklch(96.5% 0.006 75)">
           <img alt="" src="data:image/svg+xml;utf8,${encodeURIComponent(
             '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="rgb(32,32,32)"/></svg>'
           )}" style="width:400px;height:300px;display:block">
           <span class="cairn-usage-chip" style="position:absolute;right:8px;top:8px;${CHIP_STYLE}
                 background-color:color-mix(in oklab, oklch(99% 0.004 75) 90%, transparent)">used 3</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.cairn-usage-chip']);
    expect(findings[0].tier).toBe('advisory');
    expect(findings[0].message).toContain('could not measure');
  });

  // The same shape with the image removed is measurable again, so the clause narrows to the case it
  // names rather than switching the rule off for every positioned chip.
  it('still measures a positioned chip when nothing but its own ancestors paints behind it', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0">
         <div style="position:relative;width:400px;height:300px;background-color:oklch(96.5% 0.006 75)">
           <span class="cairn-usage-chip" style="position:absolute;right:8px;top:8px;${CHIP_STYLE}
                 background-color:oklch(96% 0.006 75)">used 3</span>
         </div>
       </body>`
    );
    expect(selectors(findings)).toEqual(['span.cairn-usage-chip']);
    // Task 3 (ruling 3, corpus C, 2026-07-28): the rule itself demoted to advisory, so its own
    // collision findings now carry that tier too.
    expect(findings[0].tier).toBe('advisory');
  });
});

// Task 3 (ruling 3, corpus C, 2026-07-28): chip-ground-collision demotes to advisory pending its
// chroma-aware repair (24 false errors of 40 on the first consumer admin it measured, the
// luminance-only formula cannot see hue). The demotion is a tier change only, so a run whose only
// findings are chip-ground findings must exit 0 through every path a finding can reach the report.
describe('chip-ground-collision demoted to advisory (Task 3, ruling 3)', () => {
  it('reports the rule at advisory tier', () => {
    expect(chipGroundCollision.tier).toBe('advisory');
  });

  it('exits 0 for a real collision, even the worst case (identical fill and ground)', async () => {
    const findings = await findingsFor(
      chipGroundCollision,
      `<body style="margin:0;background-color:oklch(96.5% 0.006 75)">
         <span class="badge" style="${CHIP_STYLE} background-color:oklch(96.5% 0.006 75)">Draft</span>
       </body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.tier === 'advisory')).toBe(true);
    const report = {
      findings: findings.map((finding) => ({ ...finding, file: '/fixture', line: 0, start: 0, end: 0 })),
      suppressed: [],
      filesScanned: 1,
      ruleIds: [chipGroundCollision.id],
    };
    expect(exitCodeFor(report)).toBe(0);
  });
});
