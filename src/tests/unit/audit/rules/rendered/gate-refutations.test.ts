// Task 18's review gate: the demonstrated inputs behind six confirmed rendered-rule defects, each
// preserved here so the repair cannot be undone silently. Every fixture in this file failed against
// the code as it stood at commit 40cb6d77, and each one names the false claim or the false
// measurement it holds closed.
//
// The two the pass cares most about are false NEGATIVES on rules that gate: `touch-targets` could
// not see a `<label>` acting as the control (cairn's own drawer trigger, so the shape the ruling
// about activation regions was written for was the one shape outside the rule), and
// `interactive-contrast` measured full-strength ink against a ground that already carried every
// ancestor's `opacity`, so a control camouflaged under a dimmed wrapper cleared the floor.
//
// Real Chromium throughout, and real cairn markup wherever the defect was found in cairn's own
// tree, per the convention the sibling ruling fixtures set.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { borderContrast } from '../../../../../lib/audit/rules/rendered/border-contrast.js';
import { interactiveContrast } from '../../../../../lib/audit/rules/rendered/interactive-contrast.js';
import { touchTargets } from '../../../../../lib/audit/rules/rendered/touch-targets.js';
import { weightBudget } from '../../../../../lib/audit/rules/rendered/weight-budget.js';
import { resolveRenderedFindings } from '../../../../../lib/audit/rendered.js';
import type {
  RenderedFinding,
  RenderedPage,
  RenderedPageVisit,
  RenderedRule,
  ResolvedRenderedFinding,
} from '../../../../../lib/audit/rendered.js';

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

const messages = (findings: RenderedFinding[]): string[] => findings.map((finding) => finding.message);

describe('touch-targets: the region a pointer actually reaches', () => {
  // cairn's own mobile drawer trigger, read off CairnAdminShell.svelte: a `<label for>` styled as
  // `btn btn-square` over daisyUI's `.drawer-toggle`, which compiles to
  // `appearance:none;opacity:0;width:0;height:0;position:fixed`. The input was dropped at the
  // one-pixel guard, whose comment claimed "that label is measured on its own" while no label was
  // ever a candidate, so the whole tap target sat outside the rule. It passes because the label
  // renders 48x48, and now it passes for the reason the rule states.
  it('measures the labels of a control clipped to a pixel, rather than dropping it', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0">
         <input id="drawer" type="checkbox" style="appearance:none;opacity:0;width:0;height:0;position:fixed" />
         <label for="drawer" style="display:inline-flex;width:48px;height:48px">Open menu</label>
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // The same shape with an undersized label is the finding the old code could not raise at all: a
  // 0x0 control whose only activation region is 20x20 is a real tap-target failure.
  it('reports a clipped control whose only label is under the floor', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0">
         <input id="tiny" type="checkbox" style="appearance:none;opacity:0;width:0;height:0;position:fixed" />
         <label for="tiny" style="display:inline-flex;width:20px;height:20px">x</label>
       </body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('renders 20x20px')]);
  });

  // A clipped control with NO label stays unmeasured, which is the stated fail-open rather than a
  // silent one: a hidden file input driven by a button elsewhere would otherwise report as a 0x0
  // target and name the wrong element.
  it('leaves a clipped control with no label unmeasured', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0">
         <input type="file" style="position:absolute;width:1px;height:1px;opacity:0" />
       </body>`
    );
    expect(findings).toEqual([]);
  });

  // The older visually-hidden idiom. A `left:-9999px` label has a real, full-size rect and reaches
  // no pointer, so admitting it as a region silenced the rule for the control entirely: this 18x18
  // button reported nothing before the guard, and its own box is what the criterion measures.
  it('refuses an off-canvas label as an activation region', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0">
         <label for="hidden-label" style="position:absolute;left:-9999px;width:200px;height:40px">Search</label>
         <input id="hidden-label" style="width:18px;height:18px;padding:0;border:0" />
       </body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('renders 18x18px')]);
  });

  // `pointer-events: none` says outright that the element accepts no pointer action, so it is not a
  // target under the glossary definition the rule quotes. The rule already honored the property on a
  // `::before` expansion and on a label, and ignored it on the control itself.
  it('exempts a control that accepts no pointer action', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><button style="width:10px;height:10px;pointer-events:none">x</button></body>`
    );
    expect(findings).toEqual([]);
  });

  // `inert` is the platform's own way to say a subtree takes no interaction.
  it('exempts a control inside an inert subtree', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><div inert><button style="width:10px;height:10px">x</button></div></body>`
    );
    expect(findings).toEqual([]);
  });

  // `opacity: 0` is NOT an exemption, against the review's own suggestion. A fully transparent
  // element still hit-tests, so exempting it would be a fail-open on a gating rule. This 10x10
  // button is invisible and still tappable, and it must report.
  it('still measures a control at opacity 0, which hit-tests normally', async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><button style="width:10px;height:10px;padding:0;border:0;opacity:0">x</button></body>`
    );
    expect(messages(findings)).toEqual([expect.stringContaining('renders 10x10px')]);
  });

  // The finding says which floor it is. Naming SC 2.5.8 without its four unevaluated exceptions is
  // what makes a consumer read a red build as an AA failure; the calibration measured that 8 of the
  // 10 errors on cairn's own admin would clear the spacing exception alone.
  it("discloses that the floor is cairn's, not the criterion", async () => {
    const findings = await findingsFor(
      touchTargets,
      `<body style="margin:0"><button style="width:10px;height:10px">x</button></body>`
    );
    const [message] = messages(findings);
    expect(message).toContain("cairn's floor, derived from WCAG 2.2 SC 2.5.8");
    expect(message).toContain('are not evaluated');
  });
});

describe('interactive-contrast: opacity dims the ink and the ground together', () => {
  // A mid-grey label on a near-identical grey button, camouflaged at every opacity. The two tests
  // below compare the pair dimmed against the same pair undimmed, so the wrapper's style is the only
  // difference between them and the fixture is written once.
  const camouflagedPair = (wrapperStyle: string) =>
    `<body style="margin:0;background:#ffffff">
         <div style="${wrapperStyle}">
           <button style="background:#8a8a8a;color:#7e7e7e;border:0;padding:8px">Save changes</button>
         </div>
       </body>`;

  // The demonstrated false negative on a gating rule. `resolveGround` composites a subtree and dims
  // the group once, so the ground carried the wrapper's opacity while a separately composited
  // `color` carried none: the control read as full-strength ink on a washed-out ground and measured
  // HIGHER contrast than it paints. Under an `opacity: 0.25` wrapper the old arithmetic cleared the
  // 1.5 floor and reported nothing.
  it('reports a camouflaged control under a dimmed wrapper', async () => {
    const findings = await findingsFor(interactiveContrast, camouflagedPair('opacity:0.25'));
    expect(messages(findings)).toEqual([expect.stringContaining('Save changes')]);
  });

  // Two facts about the same pair, which together say the fix is a correction and not just "report
  // more". With every opacity in the chain at 1 the arithmetic is unmoved, so this pair still
  // measures the 1.18 it always did. Under the wrapper the measurement DROPS to 1.03, because
  // dimming a control toward the page carries its ink and its fill together; the old reading moved
  // the other way, holding the ink at full strength against a ground washed to roughly #d9d9d9, and
  // that manufactured ratio cleared the 1.5 floor.
  it('leaves an undimmed pair unmoved and reads a dimmed one lower, never higher', async () => {
    const dimmed = await findingsFor(interactiveContrast, camouflagedPair('opacity:0.25'));
    const plain = await findingsFor(interactiveContrast, camouflagedPair('opacity:1'));
    const ratio = (message: string) => Number(message.match(/contrast (\d+\.\d+)/)?.[1]);
    expect(ratio(plain[0].message)).toBeCloseTo(1.18, 2);
    expect(ratio(dimmed[0].message)).toBeLessThan(ratio(plain[0].message));
  });
});

describe('border-contrast: an ancestor opacity reaches the measurement twice', () => {
  // `outer.color` is sampled geometrically from whatever paints beside the border, so a dimming
  // ancestor the two chains share is already inside it. Multiplying the whole chain in again dimmed
  // the element's own paint AND lightened the backdrop it lands on, which is the per-layer model
  // `resolveGround`'s doc exists to warn off. The chains carry no element identity, so the shared
  // ancestors cannot be divided back out, and the rule reports that it could not measure rather than
  // printing a ratio it cannot stand behind.
  it('refuses to score a border under a dimming ancestor', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#ffffff">
         <div style="opacity:0.4;background:#f0eeec;padding:20px">
           <div style="background:#f0eeec;border:2px solid #eeecea;width:120px;height:60px"></div>
         </div>
       </body>`
    );
    expect(messages(findings).join(' ')).toContain('an ancestor renders this element at opacity 0.40');
  });

  // The element's OWN opacity is still applied, and still measured, which is what keeps the guard
  // from becoming a blanket exemption for anything translucent.
  it('still measures a border the element dims itself', async () => {
    const findings = await findingsFor(
      borderContrast,
      `<body style="margin:0;background:#ffffff">
         <div style="opacity:0.4;background:#f0eeec;border:2px solid #eeecea;width:120px;height:60px"></div>
       </body>`
    );
    expect(messages(findings).join(' ')).toContain('reads at contrast');
    expect(messages(findings).join(' ')).not.toContain('an ancestor renders this element');
  });
});

describe('weight-budget: the chrome test stays inside the region being walked', () => {
  // `closest` includes the element itself and walks past the walk root to `<html>`, so a root that
  // IS a chrome shape made every text node under it chrome and the region reported "rendered only
  // chrome" instead of being measured. cairn's own shell renders that exact root: a `<nav>` carrying
  // `role="dialog"` below the persistent-sidebar breakpoint, which the layer selector picks up as a
  // second root. Three weights inside it is the sidebar's real shape (a 600 section summary, a 600
  // active item, a 500 inactive one), and the rule could not see any of it.
  it('measures a dialog layer that is itself a <nav>', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body>
         <main><p style="font-weight:400">Body copy.</p></main>
         <nav role="dialog" aria-label="Menu">
           <p style="font-weight:400">Sections</p>
           <p style="font-weight:500">Posts</p>
           <p style="font-weight:600">Pages</p>
         </nav>
       </body>`
    );
    expect(messages(findings).join(' ')).toContain('font-weight');
  });

  // A `<nav>` NESTED inside the region is still chrome, which is the ruling itself: the bound is the
  // walk root, not the shape.
  it('keeps a nested nav inside the region as chrome', async () => {
    const findings = await findingsFor(
      weightBudget,
      `<body><main>
         <p style="font-weight:400">Body copy.</p>
         <p style="font-weight:500">A second weight.</p>
         <nav aria-label="Pagination"><span style="font-weight:600">1</span></nav>
       </main></body>`
    );
    expect(findings).toEqual([]);
  });
});

describe('resolveRenderedFindings: a suppressed line never claims it gates', () => {
  // The one input both paths start from: an error-tier finding carrying a rule exemption, which the
  // resolver always refuses because an error-tier finding gates. Only the allowlist argument differs
  // between the two tests, which is the whole question.
  const raw: ResolvedRenderedFinding[] = [
    {
      ruleId: 'touch-targets',
      tier: 'error',
      selector: 'button.btn',
      message: 'renders 10x10px',
      exemption: 'a ratified exception',
      page: '/admin/posts',
      theme: 'light',
      state: 'rest',
    },
  ];
  const visits: RenderedPageVisit[] = [{ page: '/admin/posts', selectorsSeen: new Set(['button.btn']) }];

  // Such a finding matching an allowlist entry landed in the suppressed block under the message "the
  // rule claimed an exemption, refused because an error-tier finding gates", which asserts it gates
  // while printing under `Suppressed:`. Where the line ends up decides which sentence it carries.
  it('names the allowlist as the suppressor when both apply', () => {
    const { findings, suppressed } = resolveRenderedFindings(raw, visits, [
      { page: '/admin/posts', selector: 'button.btn', reason: 'tracked separately' },
    ]);
    expect(findings).toEqual([]);
    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].message).toContain('the allowlist suppressed this');
    expect(suppressed[0].message).not.toContain('the rule claimed an exemption, refused');
  });

  // The plain refusal is unchanged where nothing else suppressed the finding, so it still reaches
  // the report as a gating line with its reason printed.
  it('keeps the plain refusal on an error-tier finding nothing else suppressed', () => {
    const { findings, suppressed } = resolveRenderedFindings(raw, visits, []);
    expect(suppressed).toEqual([]);
    expect(findings[0].message).toContain('the rule claimed an exemption, refused');
  });
});
