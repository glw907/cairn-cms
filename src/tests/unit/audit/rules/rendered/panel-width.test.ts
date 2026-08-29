// The panel-width rule against a real browser, in the shape browser-regressions.test.ts establishes
// for this rule family. Membership: the hole viewport-overflow declines on purpose (see
// panel-width.ts's own header) -- a row clipped inside AdminTable's own wrap, with the wrap never
// actually growing to reach it, is invisible to both of viewport-overflow's own gates.
//
// Every fixture below builds real `<table>` markup rather than paraphrasing it, since the rule's own
// contract turns on genuine browser table-layout behavior: a `<td colspan>` panel cell's width is
// clamped by the table's own real column widths (ExpandableRow's own header comment names this,
// verified empirically there), so a wide inline control inside it clips against that clamp rather
// than widening the table -- the mechanism that makes the panel case distinct from an ordinary
// too-wide row.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { panelWidth } from '../../../../../lib/audit/rules/rendered/panel-width.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `panelWidth` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await panelWidth.check({
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

/** An AdminTable-shaped fixture: a `.toolkit-admin-table-wrap` around one summary row and, when
 *  `panel` is given, one expanded panel row right after it. */
function tableFixture(summaryCell: string, panel?: string): string {
  return `<body style="margin:0"><div style="width:356px">
    <div class="toolkit-admin-table-wrap" style="overflow-x:auto">
      <table class="table"><tbody>
        <tr class="toolkit-expandable-row-summary" id="row-alvarez">
          <td style="white-space:nowrap">${summaryCell}</td>
        </tr>
        ${panel ? `<tr class="toolkit-expandable-row-panel"><td colspan="1">${panel}</td></tr>` : ''}
      </tbody></table>
    </div>
  </div></body>`;
}

describe('panel-width against a real browser', () => {
  // The real defect: the panel td is given its own explicit width and `overflow: hidden` (a
  // truncate-style utility, or a fixed-width inner layout), so a wide inline control clips mid-word
  // rather than widening the table. Neither the wrap nor the table itself ever grows to reach it, so
  // viewport-overflow's own document-scroll gate stays clean.
  it('fires when a wide inline control clips inside a clamped panel cell, unreached by any scroll', async () => {
    const findings = await findingsFor(
      tableFixture(
        'Alvarez',
        `<div class="panel-content" style="white-space:normal;padding:1rem;width:340px;max-width:340px;overflow:hidden;box-sizing:border-box">
           <span style="white-space:nowrap">A long unbreakable value that keeps going and going and going</span>
         </div>`
      )
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toMatchObject({
      ruleId: 'panel-width',
      tier: 'error',
      selector: 'tr.toolkit-expandable-row-panel',
    });
    expect(findings[0].message).toContain('panel-content');
  });

  // The column-dropped twin: the same clamped, clipped panel cell, but the content fits inside its
  // own box, so nothing overflows and nothing is flagged.
  it('stays quiet when the panel content fits inside its own clamped box', async () => {
    const findings = await findingsFor(
      tableFixture(
        'Alvarez',
        `<div style="white-space:normal;padding:1rem;width:340px;max-width:340px;overflow:hidden;box-sizing:border-box">
           <span style="white-space:nowrap">Short</span>
         </div>`
      )
    );
    expect(findings).toEqual([]);
  });

  // The no-false-positive fixture: a summary row genuinely too wide to fit, inside AdminTable's own
  // `overflow-x: auto` wrap, which actually grows to reach it -- the engine's own sanctioned
  // scrollable table, and this rule must not fire on it.
  it('does not flag a summary row the table wrapper genuinely scrolls to reach', async () => {
    const findings = await findingsFor(
      tableFixture(
        '<span style="white-space:nowrap">A long unbreakable household name that will not wrap at all</span>'
      )
    );
    expect(findings).toEqual([]);
  });

  // The symmetric exemption: a deliberately scrollable region living INSIDE the panel (a horizontal
  // code rail, say) absorbs its own overflow before it ever reaches the panel's own box, so the
  // panel is not flagged, and the scrollable region itself is exempt by the same self-absorption
  // test that exempts the table wrapper above.
  it('does not flag a panel whose own scrollable descendant absorbs the overflow', async () => {
    const findings = await findingsFor(
      tableFixture(
        'Alvarez',
        `<div class="toolkit-scroll-region" style="overflow-x:auto;max-width:300px;margin:1rem">
           <code style="white-space:pre">const veryLongLineOfCodeThatWontWrapAtAll = 12345;</code>
         </div>`
      )
    );
    expect(findings).toEqual([]);
  });

  // The summary-row half of the contract, proven independently of the panel half: a summary cell
  // clamped by its own width and `overflow: hidden`, with the table wrapper never actually growing
  // to reach it, clips exactly the way a clamped panel cell does.
  it('fires when a summary cell clips inside its own clamped box, unreached by any scroll', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div style="width:356px">
        <div class="toolkit-admin-table-wrap" style="overflow-x:auto">
          <table class="table"><tbody>
            <tr class="toolkit-expandable-row-summary" id="row-alvarez">
              <td style="width:200px;max-width:200px;overflow:hidden;box-sizing:border-box">
                <span style="white-space:nowrap">A long unbreakable household name that clips mid word</span>
              </td>
            </tr>
          </tbody></table>
        </div>
      </div></body>`
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toMatchObject({
      ruleId: 'panel-width',
      selector: 'tr#row-alvarez.toolkit-expandable-row-summary',
    });
  });

  // The ancestor-scroll exemption must not rescue a cell that clips at ITS OWN edge: a second row's
  // unrelated wide cell forces the shared wrap to genuinely scroll, but that scroll can never reach
  // content a DIFFERENT cell already clips with its own `overflow: hidden`. Two rows share one wrap
  // so the wrap's own scroll state is real, not a fixture artifact.
  it('still fires on a clamped cell even when the shared wrapper genuinely scrolls for an unrelated reason', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div style="width:356px">
        <div class="toolkit-admin-table-wrap" style="overflow-x:auto">
          <table class="table"><tbody>
            <tr class="toolkit-expandable-row-summary" id="row-wide">
              <td><span style="white-space:nowrap">A genuinely wide unclamped household name forcing scroll</span></td>
            </tr>
            <tr class="toolkit-expandable-row-summary" id="row-clamped">
              <td>
                <div style="width:200px;max-width:200px;overflow:hidden;box-sizing:border-box">
                  <span style="white-space:nowrap">A different long unbreakable value that clips mid word</span>
                </div>
              </td>
            </tr>
          </tbody></table>
        </div>
      </div></body>`
    );
    const clamped = findings.filter((f) => f.selector.includes('row-clamped'));
    expect(clamped.length).toBeGreaterThan(0);
  });

  // The native-input false positive: a text input styled narrower than its own value scrolls its
  // content internally (the UA supplies that scrolling, reachable by the caret), but Chrome computes
  // `overflow-x: clip` on a styled-narrow input, which the rule's own computed-style `scrolls()` test
  // does not accept as a reachable scroll container, so the raw `scrollWidth > clientWidth`
  // measurement still fires. The value is fully reachable, so this must not be flagged.
  it('does not flag a native text input whose value is longer than its own box', async () => {
    const findings = await findingsFor(
      tableFixture(
        'Alvarez',
        `<div class="panel-content" style="padding:1rem">
           <input type="text" value="A long value that keeps going well past the input's own width"
                  style="width:180px" />
         </div>`
      )
    );
    expect(findings).toEqual([]);
  });

  // The deliberate-truncation false positive: the house `truncate` idiom (`text-overflow: ellipsis`
  // paired with a clipping `overflow-x`) is a sanctioned reading, not a defect, symmetric with the
  // deliberately-scrollable-descendant exemption above.
  it('does not flag an element deliberately truncated with text-overflow: ellipsis', async () => {
    const findings = await findingsFor(
      tableFixture(
        'Alvarez',
        `<div class="panel-content" style="padding:1rem;width:200px">
           <div style="white-space:nowrap;overflow-x:hidden;text-overflow:ellipsis">
             A long unbreakable label truncated by the house idiom rather than clipped as a defect
           </div>
         </div>`
      )
    );
    expect(findings).toEqual([]);
  });
});
