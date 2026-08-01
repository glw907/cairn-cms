// The field-edge-alignment rule against a real browser, in the shape browser-regressions.test.ts
// establishes for this rule family. Design ratchet Task 5 (the mechanical half of finding 3): the
// staircase detector, catching an `inline`-register field whose label width varies row to row and
// staggers its control's left edge, the corpus shape the ASC Assets-trial harvest measured at 1440.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { resolveConfig } from '../../../../../lib/audit/config.js';
import { fieldEdgeAlignment } from '../../../../../lib/audit/rules/rendered/field-edge-alignment.js';
import type { RenderedFinding, RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

const config = resolveConfig('/audit-fixture', {}, () => true);

/** Runs `fieldEdgeAlignment` against `html` in a real page and returns what it found. */
async function findingsFor(html: string): Promise<RenderedFinding[]> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await fieldEdgeAlignment.check({
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

// FieldLabel's own `inline` recipe: `flex items-center gap-1.5`, a label beside its control. The
// label's width is set explicitly rather than left to font metrics, so the geometry this rule reads
// is deterministic across whatever font a runner actually has installed.
function inlineField(id: string, labelWidthPx: number): string {
  return `<label style="display:flex;align-items:center;gap:8px;">
    <span style="display:inline-block;width:${labelWidthPx}px;">&nbsp;</span>
    <input class="input" id="${id}" style="width:120px;height:32px;">
  </label>`;
}

describe('field-edge-alignment against a real browser', () => {
  // The violating direction: two inline-register fields in one grid column, labels of different
  // width, so the second control's left edge trails the first's.
  it('fires when an inline field label of different width staggers a control in the same column', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div style="display:grid;grid-template-columns:1fr;row-gap:12px;width:320px;">
          ${inlineField('row-one', 40)}
          ${inlineField('row-two', 90)}
        </div>
      </div></body>`
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: 'field-edge-alignment', tier: 'advisory' });
    expect(findings[0].selector).toContain('row-two');
    expect(findings[0].message).toContain('px right of');
  });

  // The conforming direction: same shape, labels of equal width, so both edges land together.
  it('stays quiet when inline fields in the same column share a label width', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div style="display:grid;grid-template-columns:1fr;row-gap:12px;width:320px;">
          ${inlineField('row-one', 40)}
          ${inlineField('row-two', 40)}
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // Two genuinely different grid columns must never be compared against each other: each column
  // holds a consistent edge internally, but the two columns' own insets differ from each other by
  // design (a wide second column with plenty of room for a longer label).
  it('does not compare controls in different grid columns against each other', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div style="display:grid;grid-template-columns:200px 320px;column-gap:40px;row-gap:12px;width:560px;">
          ${inlineField('col1-row1', 40)}
          ${inlineField('col2-row1', 140)}
          ${inlineField('col1-row2', 40)}
          ${inlineField('col2-row2', 140)}
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // A col-span-2 row must not bridge the two real columns into one cluster. The spanning control
  // shares column 1's own left edge (a 40px label, the same as col1's other rows) but its own width
  // reaches well into column 2's territory, the shape that breaks whole-rect-overlap clustering:
  // its rect horizontally overlaps a column-1 control's range AND a column-2 control's range,
  // chaining both real columns into one cluster and reporting column 2 as staggered by the full
  // column-1 width. Left-edge proximity clustering keeps the spanning control with column 1 (their
  // left edges match) and leaves column 2's own cluster untouched.
  const wideSpanRow = `<label style="grid-column:1 / span 2;display:flex;align-items:center;gap:8px;">
    <span style="display:inline-block;width:40px;">&nbsp;</span>
    <input class="input" id="span-row" style="width:520px;height:32px;">
  </label>`;
  it('does not bridge two real grid columns through a col-span-2 row', async () => {
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div style="display:grid;grid-template-columns:200px 320px;column-gap:40px;row-gap:12px;width:560px;">
          ${inlineField('col1-row1', 40)}
          ${inlineField('col2-row1', 140)}
          ${wideSpanRow}
          ${inlineField('col1-row2', 40)}
          ${inlineField('col2-row2', 140)}
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });

  // register="stacked"'s own wrapper (`flex flex-col gap-label`) is itself a column container, so a
  // stacked field's control is grouped alone and never compared to a sibling: this is correct, since
  // a stacked control's left edge is fixed by its own container and cannot stagger.
  it('does not flag stacked-register fields, whose own wrapper stops the walk', async () => {
    const stackedField = (id: string) =>
      `<div style="display:flex;flex-direction:column;gap:4px;">
        <span>Label</span>
        <input class="input" id="${id}" style="width:100%;height:32px;">
      </div>`;
    const findings = await findingsFor(
      `<body style="margin:0"><div data-theme="cairn-admin">
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:24px;row-gap:12px;width:400px;">
          ${stackedField('stacked-one')}
          ${stackedField('stacked-two')}
        </div>
      </div></body>`
    );
    expect(findings).toEqual([]);
  });
});
