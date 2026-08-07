// The shared vertical-alignment measurement module, proved on two axes. The pure half (pair class,
// metric, sign) needs no browser and is asserted directly. The geometry half runs against real
// Chromium in the shape field-edge-alignment.test.ts establishes for this rule family, because the
// three traps this module exists to encode are all facts about how a browser lays type and ink out,
// and a fixture that stubbed the geometry would prove nothing about any of them.
//
// The calibration self-check is a test here rather than only a step in the probe: a later dispatch
// makes the probe refuse to emit when calibration misses, and the thing that refusal depends on had
// better fail in CI the moment it stops holding.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import {
  DEFAULT_ROW_ITEM_MAX_HEIGHT_PX,
  VERTICAL_CALIBRATION_FIXTURES,
  VERTICAL_REPORTING_BAR_PX,
  calibrationMiss,
  classifyPair,
  measurePair,
  measureVerticalMetrics,
  metricForPairClass,
  pairsAboveBar,
  referenceForMetric,
  type MeasuredPair,
  type MemberAnchor,
  type MemberKind,
  type RawPair,
  type VerticalCalibrationFixture,
} from '../../../../../lib/audit/rules/rendered/vertical-metrics.js';
import type { RenderedPage } from '../../../../../lib/audit/rendered.js';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 120_000);

afterAll(async () => {
  await browser?.close();
});

/** Renders `html` as a whole body and hands `fn` the live page, closing it afterwards. */
async function withPage<T>(html: string, fn: (page: Page) => Promise<T>): Promise<T> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.setContent(`<body style="margin:0">${html}</body>`, { waitUntil: 'load' });
    return await fn(page);
  } finally {
    await page.close();
  }
}

/** Every pair the module measures on `html`, driven exactly as a rule or the probe would drive it. */
async function measure(html: string): Promise<MeasuredPair[]> {
  return withPage(html, async (page) => {
    const { pairs } = await measureVerticalMetrics(page as unknown as RenderedPage);
    return pairs;
  });
}

function fixture(id: VerticalCalibrationFixture['id']): VerticalCalibrationFixture {
  const found = VERTICAL_CALIBRATION_FIXTURES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no calibration fixture named ${id}`);
  return found;
}

/** The pair a fixture exists to produce, ignoring whatever else its markup incidentally yields. */
function fixturePair(pairs: MeasuredPair[], spec: VerticalCalibrationFixture): MeasuredPair {
  const found = pairs.find(
    (pair) => pair.pairClass === spec.pairClass && pair.rowClasses.split(/\s+/).includes(spec.rowClass)
  );
  if (!found) throw new Error(`${spec.id} produced no ${spec.pairClass} pair`);
  return found;
}

/** A member anchor with only the fields a pure test cares about set, the rest at neutral values. */
function anchor(kind: MemberKind, values: Partial<MemberAnchor> = {}): MemberAnchor {
  return {
    kind,
    selector: `${kind}-member`,
    classes: '',
    geometry: kind === 'text' ? 'glyph' : kind === 'icon' ? 'ink' : 'element-box',
    topPx: 0,
    bottomPx: 10,
    contentCentrePx: 5,
    elementCentrePx: 5,
    baselinePx: kind === 'text' ? 8 : null,
    capCentrePx: kind === 'text' ? 4 : null,
    text: '',
    stacked: false,
    ...values,
  };
}

function rawPair(a: MemberAnchor, b: MemberAnchor): RawPair {
  return {
    rowKind: 'flex-grid-row',
    rowSelector: 'div.row',
    rowClasses: 'row',
    alignItems: 'center',
    rowBox: { topPx: 0, bottomPx: 20, leftPx: 0, rightPx: 100 },
    a,
    b,
  };
}

describe('pair classification and the metric each class takes', () => {
  it('names a pair by its two kinds, alphabetically, so the spec vocabulary falls out unchanged', () => {
    expect(classifyPair(anchor('icon'), anchor('text'))).toBe('icon-beside-text');
    expect(classifyPair(anchor('text'), anchor('icon'))).toBe('icon-beside-text');
    expect(classifyPair(anchor('control'), anchor('text'))).toBe('control-beside-text');
    expect(classifyPair(anchor('text'), anchor('text'))).toBe('text-beside-text');
    expect(classifyPair(anchor('control'), anchor('control'))).toBe('control-beside-control');
    expect(classifyPair(anchor('control'), anchor('icon'))).toBe('control-beside-icon');
    expect(classifyPair(anchor('icon'), anchor('icon'))).toBe('icon-beside-icon');
  });

  it('classifies a glyph against its own padding box as the optical suspect', () => {
    expect(classifyPair(anchor('text'), anchor('box'))).toBe('optical-suspect');
  });

  it('measures two runs of text by baseline and everything else by visible content', () => {
    expect(metricForPairClass('text-beside-text')).toBe('baseline');
    expect(metricForPairClass('icon-beside-text')).toBe('content-centre');
    expect(metricForPairClass('control-beside-text')).toBe('content-centre');
    expect(metricForPairClass('control-beside-control')).toBe('content-centre');
    expect(metricForPairClass('optical-suspect')).toBe('optical-centre');
  });

  it('reads a text member by its cap centre under content-centre, not its glyph-box centre', () => {
    const text = anchor('text', { contentCentrePx: 9, capCentrePx: 4 });
    expect(referenceForMetric(text, 'content-centre')).toBe(4);
    expect(referenceForMetric(anchor('icon', { contentCentrePx: 7 }), 'content-centre')).toBe(7);
    expect(referenceForMetric(anchor('control', { contentCentrePx: 6 }), 'content-centre')).toBe(6);
  });

  it('has no reading for a control under the baseline metric, so the pair is unmeasurable', () => {
    expect(referenceForMetric(anchor('control'), 'baseline')).toBeNull();
    expect(measurePair(rawPair(anchor('control'), anchor('text')))).not.toBeNull();
    // A control paired with text takes content-centre, which both members answer. The null case is
    // a text member whose font metrics the browser refused, leaving no cap centre to compare.
    expect(measurePair(rawPair(anchor('text', { capCentrePx: null }), anchor('icon')))).toBeNull();
  });

  it('signs the delta so a negative reading means the left member rides high', () => {
    const iconHigh = measurePair(rawPair(anchor('icon', { contentCentrePx: 8 }), anchor('text', { capCentrePx: 11.5 })));
    expect(iconHigh).toMatchObject({ pairClass: 'icon-beside-text', metric: 'content-centre', deltaPx: -3.5 });
    expect(iconHigh?.magnitudePx).toBe(3.5);

    const leftSitsLow = measurePair(
      rawPair(anchor('control', { contentCentrePx: 41 }), anchor('control', { contentCentrePx: 28.5 }))
    );
    expect(leftSitsLow).toMatchObject({ deltaPx: 12.5, magnitudePx: 12.5 });
  });

  it('applies the reporting bar to the magnitude, in either direction', () => {
    const under = measurePair(rawPair(anchor('icon', { contentCentrePx: 5 }), anchor('text', { capCentrePx: 6.5 })));
    const over = measurePair(rawPair(anchor('icon', { contentCentrePx: 5 }), anchor('text', { capCentrePx: 9 })));
    const pairs = [under, over].filter((pair): pair is MeasuredPair => pair !== null);
    expect(pairsAboveBar(pairs, VERTICAL_REPORTING_BAR_PX)).toEqual([over]);
  });
});

describe('the season-row calibration fixture (the structural case)', () => {
  const spec = fixture('season-row');

  it('reproduces the stacked-field defect at the expected sign and magnitude', async () => {
    const pairs = await measure(spec.html);
    expect(calibrationMiss(spec, pairs)).toBeNull();
    const pair = fixturePair(pairs, spec);
    // 12.5px is half the label-plus-gap band the stacked register adds above the control, which is
    // what an `align-items: center` row splits between the two members.
    expect(pair.deltaPx).toBeCloseTo(12.5, 1);
    expect(pair.metric).toBe('content-centre');
    expect(pair.alignItems).toBe('center');
  });

  it('anchors the composite on the control inside it and marks the member stacked', async () => {
    const pair = fixturePair(await measure(spec.html), spec);
    expect(pair.a.selector).toContain('select');
    expect(pair.a.stacked).toBe(true);
    expect(pair.b.selector).toContain('button');
    expect(pair.b.stacked).toBe(false);
  });

  it('reports the bare control as riding high, above the field control it sits beside', async () => {
    const pair = fixturePair(await measure(spec.html), spec);
    expect(pair.deltaPx).toBeGreaterThan(0);
    expect(pair.b.contentCentrePx).toBeLessThan(pair.a.contentCentrePx);
  });

  it('composes an `items-end` row that no longer reports a defect', async () => {
    const fixed = spec.html.replace('align-items:center', 'align-items:flex-end');
    const pair = fixturePair(await measure(fixed), spec);
    expect(pair.magnitudePx).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });
});

describe('the icon-card calibration fixture (the optical case, and trap 3)', () => {
  const spec = fixture('icon-card');

  it('reproduces the /join icon defect at the expected sign and magnitude', async () => {
    const pairs = await measure(spec.html);
    expect(calibrationMiss(spec, pairs)).toBeNull();
    const pair = fixturePair(pairs, spec);
    expect(pair.deltaPx).toBeLessThan(0);
    expect(pair.magnitudePx).toBeGreaterThanOrEqual(spec.minMagnitudePx);
    expect(pair.magnitudePx).toBeLessThanOrEqual(spec.maxMagnitudePx);
  });

  // Trap 3 in one assertion pair: the same row reads clean by element box and defective by ink.
  it('reads clean by element box and defective by ink, which is the whole of trap 3', async () => {
    const pair = fixturePair(await measure(spec.html), spec);
    expect(pair.a.geometry).toBe('ink');
    const elementBoxDelta = pair.a.elementCentrePx - (pair.b.capCentrePx ?? 0);
    expect(Math.abs(elementBoxDelta)).toBeLessThan(VERTICAL_REPORTING_BAR_PX);
    expect(pair.magnitudePx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
    // The icon's art occupies rows 2 through 14 of a 24-unit viewBox, so its ink centre sits
    // exactly 4px above its element box centre. Pure geometry, independent of any installed font.
    expect(pair.a.contentCentrePx).toBeCloseTo(pair.a.elementCentrePx - 4, 2);
  });

  // Trap 1: the title block runs to three lines, and the icon pairs with the first of them. A
  // block-centre reading is what reported 29 to 68px of phantom delta on correctly composed rows.
  it('pairs the icon with the title block first line, not with the block', async () => {
    await withPage(spec.html, async (page) => {
      const { pairs } = await measureVerticalMetrics(page as unknown as RenderedPage);
      const pair = fixturePair(pairs, spec);
      const geometry = await page.evaluate(() => {
        const title = document.querySelector('.cairn-calibration-icon-card h3');
        if (!title?.firstChild) throw new Error('the fixture lost its title');
        // The same run the walk reads, so "how many lines" is a claim about the node the module
        // measured rather than about the element around it.
        const range = document.createRange();
        range.selectNodeContents(title.firstChild);
        const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
        const block = title.parentElement as Element;
        const blockRect = block.getBoundingClientRect();
        return {
          lineCount: rects.length,
          firstLineTop: rects[0].top,
          firstLineBottom: rects[0].bottom,
          blockCentre: (blockRect.top + blockRect.bottom) / 2,
        };
      });
      expect(geometry.lineCount).toBeGreaterThan(1);
      expect(pair.b.capCentrePx ?? 0).toBeGreaterThan(geometry.firstLineTop);
      expect(pair.b.capCentrePx ?? 0).toBeLessThan(geometry.firstLineBottom);
      // The block's own centre sits far below the first line, so a block reading would have
      // manufactured a delta an order of magnitude past the real one.
      expect(Math.abs((pair.b.capCentrePx ?? 0) - geometry.blockCentre)).toBeGreaterThan(15);
    });
  });
});

describe('trap 2: type metrics come off the element that renders the line', () => {
  // A 32px title inside a 10px container. Reading the container's metrics is the failure that
  // returned -0.4px on a row whose icons visibly rode high, and the two oracles below are several
  // pixels apart, so a regression cannot hide inside a rounding tolerance.
  const html = `<div class="metric-owner-row"
      style="display:flex;align-items:flex-start;gap:12px;font-size:10px;line-height:12px;font-family:sans-serif">
    <span style="display:flex;align-items:center;flex:none;height:32px">
      <svg width="32" height="32" viewBox="0 0 32 32" style="display:block">
        <rect x="0" y="0" width="32" height="32" fill="currentColor"></rect>
      </svg>
    </span>
    <div><h3 id="owner-title" style="margin:0;font-size:32px;line-height:32px;font-weight:600">Racing</h3></div>
  </div>`;

  it('reads the baseline the line owner implies, not the one its container would', async () => {
    await withPage(html, async (page) => {
      const { pairs } = await measureVerticalMetrics(page as unknown as RenderedPage);
      const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
      expect(pair).toBeDefined();
      const oracles = await page.evaluate(() => {
        const title = document.getElementById('owner-title');
        const row = document.querySelector('.metric-owner-row');
        if (!title || !row) throw new Error('the fixture lost its title');
        const range = document.createRange();
        range.selectNodeContents(title);
        const rect = Array.from(range.getClientRects())[0];
        const paint = document.createElement('canvas').getContext('2d');
        if (!paint) throw new Error('no 2d context');
        const baselineUnder = (el: Element) => {
          const style = getComputedStyle(el);
          paint.font =
            style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = paint.measureText((title.textContent ?? '').trim());
          const box = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
          return rect.top + (rect.height - box) / 2 + metrics.fontBoundingBoxAscent;
        };
        return { lineOwner: baselineUnder(title), container: baselineUnder(row) };
      });
      expect(Math.abs(oracles.lineOwner - oracles.container)).toBeGreaterThan(3);
      expect(pair?.b.baselinePx ?? 0).toBeCloseTo(oracles.lineOwner, 1);
    });
  });
});

describe('text beside text: the pair that must not fire', () => {
  // A mixed-size pair sharing one baseline is correct typography. Its glyph centres diverge BY
  // DESIGN, so a centre metric reports every well-set heading-plus-count row as broken.
  const html = `<div class="baseline-row"
      style="display:flex;align-items:baseline;gap:8px;font-family:sans-serif">
    <span style="font-size:28px;line-height:1">Posts</span>
    <span style="font-size:12px;line-height:1">24 published</span>
  </div>`;

  it('measures a baseline-aligned mixed-size pair by baseline and reports no defect', async () => {
    const pairs = await measure(html);
    const pair = pairs.find((candidate) => candidate.pairClass === 'text-beside-text');
    expect(pair).toBeDefined();
    expect(pair?.metric).toBe('baseline');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
    expect(pairsAboveBar(pairs.filter((candidate) => candidate.pairClass === 'text-beside-text'))).toEqual([]);
  });

  it('would have fired on that same pair under a centre metric, which is why the split exists', async () => {
    const pairs = await measure(html);
    const pair = pairs.find((candidate) => candidate.pairClass === 'text-beside-text');
    const asCentres =
      (referenceForMetric(pair!.a, 'content-centre') ?? 0) - (referenceForMetric(pair!.b, 'content-centre') ?? 0);
    expect(Math.abs(asCentres)).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('still catches two runs of text whose baselines genuinely disagree', async () => {
    const broken = html.replace('align-items:baseline', 'align-items:center');
    const pair = (await measure(broken)).find((candidate) => candidate.pairClass === 'text-beside-text');
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });
});

describe('control beside text', () => {
  const row = (extra: string) => `<div class="check-row"
      style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
    <input type="checkbox" style="box-sizing:border-box;width:16px;height:16px;margin:0;${extra}">
    <span style="font-size:14px;line-height:20px">Notify me on publish</span>
  </div>`;

  it('stays quiet on a control optically centred against its label', async () => {
    const pair = (await measure(row(''))).find((candidate) => candidate.pairClass === 'control-beside-text');
    expect(pair).toBeDefined();
    expect(pair?.metric).toBe('content-centre');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('reports a control lifted off its label, signed as the left member riding high', async () => {
    const pair = (await measure(row('position:relative;top:-6px'))).find(
      (candidate) => candidate.pairClass === 'control-beside-text'
    );
    expect(pair?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
    expect(pair?.magnitudePx ?? 0).toBeCloseTo(6, 0);
  });
});

describe('the optical suspects', () => {
  it('measures a label recipe glyph against its own padding box', async () => {
    const pairs = await measure(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:center;border:0;padding:12px 16px 4px;font-size:14px;line-height:20px">
        Publish</button></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'optical-suspect');
    expect(pair).toBeDefined();
    expect(pair?.metric).toBe('optical-centre');
    expect(pair?.rowKind).toBe('optical-suspect');
    // Positive means the glyph sits LOW inside its own box, which 12px above and 4px below is.
    expect(pair?.deltaPx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('stays quiet on a label recipe whose padding is symmetric', async () => {
    const pairs = await measure(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:center;border:0;padding:8px 16px;font-size:14px;line-height:20px">
        Publish</button></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'optical-suspect');
    expect(pair).toBeDefined();
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });
});

describe('what the walk reports about its own coverage', () => {
  it('marks an icon it could not read ink from, rather than passing an element box off as ink', async () => {
    const transparentGif =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    await withPage(
      `<div class="img-row" style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <img src="${transparentGif}" alt="" style="width:24px;height:24px;display:block">
        <span style="font-size:14px;line-height:20px">Attachment</span>
      </div>`,
      async (page) => {
        const { pairs, diagnostics } = await measureVerticalMetrics(page as unknown as RenderedPage);
        const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
        expect(pair?.a.kind).toBe('icon');
        expect(pair?.a.geometry).toBe('element-box');
        expect(diagnostics.iconElementBoxFallbacks).toBeGreaterThanOrEqual(1);
      }
    );
  });

  it('counts a row member too tall to be a row member instead of measuring it', async () => {
    await withPage(
      `<div style="display:flex;align-items:flex-start;gap:8px;font-family:sans-serif">
        <div style="height:${DEFAULT_ROW_ITEM_MAX_HEIGHT_PX + 40}px;width:80px">
          <span style="font-size:14px;line-height:20px">Column</span>
        </div>
        <span style="font-size:14px;line-height:20px">Beside it</span>
      </div>`,
      async (page) => {
        const { pairs, diagnostics } = await measureVerticalMetrics(page as unknown as RenderedPage);
        expect(pairs).toEqual([]);
        expect(diagnostics.pairsSkippedTooTall).toBe(1);
      }
    );
  });

  it('measures the scoped root itself, not only its descendants', async () => {
    const spec = fixture('season-row');
    await withPage(spec.html, async (page) => {
      const { pairs } = await measureVerticalMetrics(page as unknown as RenderedPage, {
        rootSelector: `.${spec.rowClass}`,
      });
      expect(calibrationMiss(spec, pairs)).toBeNull();
    });
  });

  it('walks a realistic admin fragment without a serialization failure', async () => {
    const pairs = await measure(
      `<div data-theme="cairn-admin"><main>
        <div style="display:flex;align-items:center;gap:12px">
          <h1 class="page-h1" style="font-size:24px;line-height:32px;margin:0">Posts</h1>
          <span class="status-chip" style="display:inline-block;padding:0 7px;font-size:10px;line-height:16px">Draft</span>
        </div>
        <table><tbody><tr>
          <td style="padding:8px">Hello world</td>
          <td style="padding:8px"><button class="btn" type="button" style="height:28px">Edit</button></td>
        </tr></tbody></table>
      </main></div>`
    );
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.some((pair) => pair.rowKind === 'table-row')).toBe(true);
  });
});
