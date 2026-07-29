// Geoff's ruling 1 (Task 16b): touch-targets enforces WCAG 2.5.8's AA floor, 24x24, not 2.5.5's AAA
// 44x44 spec 6.3 originally set. At 44x44 the rule raised 138 error-tier findings against cairn's
// own shipped admin (btn-sm at 32px, btn-xs at 24px, and 30px toolbar controls all undershoot it),
// which is not a floor cairn can honestly enforce at a conformance level it does not claim.
//
// These fixtures pin the ruled floor against real Chromium, and with it the three defects an
// adversarial pass demonstrated once the number dropped: the floor was being measured against a
// control's own box rather than the region that activates it (an error on cairn's own label-wrapped
// checkbox), the rounding tolerance was thirty-two times the widest shortfall layout snapping can
// produce (silently enforcing 23.5), and the WCAG inline exception passed an icon-only link that is
// in no sentence at all.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { touchTargets } from '../../../../../lib/audit/rules/rendered/touch-targets.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs touch-targets against `html` in a real page at the rule's own pinned 390px viewport. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await touchTargets.check({
      page: page as unknown as RenderedPage,
      pagePath: '/fixture',
      theme: 'light',
      state: 'rest',
      config,
    });
  } finally {
    await page.close();
  }
}

function selectors(findings: RenderedFinding[]): string[] {
  return findings.map((finding) => finding.selector);
}

describe('touch-targets at the AA 24x24 floor (ruling 1)', () => {
  // cairn's own btn-xs, the control the ruling names as sitting exactly on the line. It must clear
  // the floor, not trip it.
  it('passes btn-xs at its exact 24px', async () => {
    const findings = await findingsFor(
      `<body><button class="btn btn-xs" style="width:24px;height:24px;padding:0;border:0"
         aria-label="Remove">x</button></body>`
    );
    expect(findings).toEqual([]);
  });

  // A control genuinely smaller than the floor, not a rounding artifact of one, must still be
  // caught: the rule keeps catching anything genuinely too small even as the number drops.
  it('still flags a control genuinely under the floor', async () => {
    const findings = await findingsFor(
      `<body><button style="width:20px;height:20px;padding:0;border:0"
         aria-label="Close">x</button></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('20x20');
  });

  // The money case the ruling exists for: cairn's own btn-sm at its real 32px shipped size clears
  // the new floor outright, where it tripped the old 44px one on every admin screen that uses it.
  it('passes a real btn-sm-shaped control at its shipped 32px', async () => {
    const findings = await findingsFor(
      `<body><button class="btn btn-sm" style="width:81px;height:32px;padding:0 12px;border:0"
         >Read more</button></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('touch-targets: the rounding tolerance is one layout quantum, pinned from both sides', () => {
  // Chromium snaps every rect to a LayoutUnit, 1/64 CSS px, so a control the author declared at 24
  // can measure 23.984375. That is the whole shortfall snapping can manufacture, and the tolerance
  // absorbs exactly it. Measured: `width: 23.99px` renders 23.984375.
  it('passes a rect one layout quantum under the floor', async () => {
    const findings = await findingsFor(
      `<body><button style="width:23.99px;height:23.99px;padding:0;border:0"
         aria-label="Close">x</button></body>`
    );
    expect(findings).toEqual([]);
  });

  // The other side of the same constant, and the assertion that kills a widened tolerance. The
  // first cut allowed half a CSS pixel, thirty-two quanta, so the rule enforced 23.5 while its own
  // message said 24 and no fixture noticed. A control declared 23.5px measures exactly 23.5.
  it('flags a control half a pixel under the floor, which is design and not snapping', async () => {
    const findings = await findingsFor(
      `<body><button style="width:23.5px;height:23.5px;padding:0;border:0"
         aria-label="Close">x</button></body>`
    );
    expect(findings).toHaveLength(1);
  });

  // Two quanta under, the same measurement the old half-pixel tolerance was justified with
  // (`calc(24px - 0.02px)` renders 23.96875). Nothing in layout produces it: it is a control an
  // author designed a hair under the floor, and the rule says so.
  it('flags a control designed just under the floor rather than snapped there', async () => {
    const findings = await findingsFor(
      `<body><button style="width:calc(24px - 0.02px);height:calc(24px - 0.02px);padding:0;border:0"
         aria-label="Close">x</button></body>`
    );
    expect(findings).toHaveLength(1);
  });
});

describe('touch-targets measures the activation region, not the control box', () => {
  // cairn's own shipped markup, copied from EditPage.svelte's "Hidden" toggle (FieldInput.svelte
  // renders the identical shape, and five more components carry it). The input paints 20x20; the
  // label around it is the target, since clicking anywhere on it toggles the box, and it clears the
  // floor on both axes. The plain box reading reported this at ERROR tier on the most common form
  // control in the admin.
  it('passes a checkbox whose wrapping label is the real tap target', async () => {
    const findings = await findingsFor(
      `<body><label class="label" style="display:flex;align-items:center;gap:8px;width:342px;height:34px">
         <input class="checkbox checkbox-sm" type="checkbox" style="width:20px;height:20px" />
         <span class="type-body">Hidden</span>
       </label></body>`
    );
    expect(findings).toEqual([]);
  });

  // The same 20x20 input with no label at all is still a 20x20 target, so the expansion is the
  // label doing real work rather than the rule going blind on inputs.
  it('still flags the same undersized checkbox when no label activates it', async () => {
    const findings = await findingsFor(
      `<body><input class="checkbox checkbox-sm" type="checkbox" style="width:20px;height:20px" /></body>`
    );
    expect(selectors(findings)).toEqual(['input.checkbox.checkbox-sm']);
  });

  // The other association the platform recognizes, `for=`, when the label sits beside the control.
  it('passes a checkbox a for-associated label beside it activates', async () => {
    const findings = await findingsFor(
      `<body><div style="display:flex;align-items:center;gap:4px">
         <input id="draft" type="checkbox" style="width:20px;height:20px" />
         <label for="draft" style="display:inline-block;width:120px;height:32px">Hidden</label>
       </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // A `for=` label parked elsewhere on the page is not one region with the control, so it is
  // measured as its own region rather than unioned into a rectangle spanning the gap between them.
  // It still satisfies the criterion, because it is a full-size region that operates the control.
  it('passes a control whose only label sits elsewhere, measuring that label as its own region', async () => {
    const findings = await findingsFor(
      `<body>
         <input id="far" type="checkbox" style="width:20px;height:20px" />
         <div style="height:600px"></div>
         <label for="far" style="display:inline-block;width:120px;height:32px">Hidden</label>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // The direction that keeps the label reading honest: a screen-reader-only label is read aloud and
  // never painted, so it operates nothing a pointer can reach and rescues nothing. cairn's admin
  // ships this shape on icon-only controls.
  it('still flags a control whose only label is screen-reader-only', async () => {
    const findings = await findingsFor(
      `<body>
         <label for="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Hidden</label>
         <input id="sr" type="checkbox" style="width:20px;height:20px" />
       </body>`
    );
    expect(selectors(findings)).toEqual(['input#sr']);
  });
});

describe('touch-targets: the one WCAG exception this rule implements', () => {
  // 2.5.8's inline exception: a link inside running prose, where the line of text carries the
  // tappable area. This is the ONLY named exception implemented, and it is real.
  it('exempts an inline text link inside prose', async () => {
    const findings = await findingsFor(
      `<body><p>Read the <a href="/x" style="display:inline;font-size:8px">terms</a> before saving.</p></body>`
    );
    expect(findings).toEqual([]);
  });

  // The fail-open the unnarrowed clause carried: an icon-only link is in no sentence, so the
  // exception does not reach it. A 10x10 image link inside a `<p>` passed silently.
  it('does not exempt an icon-only inline link, which is in no sentence at all', async () => {
    const findings = await findingsFor(
      `<body><p><a href="/x" class="icon-link" style="display:inline"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="edit" style="width:10px;height:10px"></a></p></body>`
    );
    expect(selectors(findings)).toEqual(['a.icon-link']);
  });
});

describe('touch-targets: the off-canvas guard knows which scroll box a control lives in', () => {
  // cairn's own EditorToolbar renders `max-sm:flex-nowrap max-sm:overflow-x-auto`, so at this
  // rule's own pinned 390px viewport the trailing controls sit past x=390 at rest, reachable by
  // scrolling the rail. An inner scroller does not grow `documentElement.scrollWidth`, so comparing
  // against it alone exempted every one of them before the floor was ever applied.
  it('applies the floor to undersized controls past the viewport inside a horizontal rail', async () => {
    const buttons = Array.from(
      { length: 20 },
      (_, index) => `<button class="glyph-${index}" style="width:20px;height:20px;padding:0;border:0;flex:none">x</button>`
    ).join('');
    const findings = await findingsFor(
      `<body style="margin:0"><div style="width:390px;display:flex;flex-wrap:nowrap;gap:4px;overflow-x:auto">
         ${buttons}
       </div></body>`
    );
    expect(findings).toHaveLength(20);
  });

  // The guard still does its own job: a skip link parked off-canvas at rest takes no taps.
  it('still exempts a control parked off-canvas at rest', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><a href="#main" class="skip"
         style="position:absolute;left:-9999px;width:20px;height:20px">Skip</a></body>`
    );
    expect(findings).toEqual([]);
  });
});
