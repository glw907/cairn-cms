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

describe('trap 1: the first line is the visually first one, not the first in the DOM', () => {
  const icon = `<span style="display:flex;align-items:center;flex:none;height:24px">
    <svg width="24" height="24" viewBox="0 0 24 24" style="display:block">
      <rect x="0" y="0" width="24" height="24" fill="currentColor"></rect>
    </svg></span>`;
  const column = (first: string, second: string) =>
    `<div class="order-row" style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">
      ${icon}<div style="display:flex;flex-direction:column">${first}${second}</div></div>`;
  const eyebrow = '<span style="font-size:12px;line-height:24px">MEMBERSHIP</span>';
  const title = '<h3 style="margin:0;font-size:18px;line-height:24px">Club Boats</h3>';

  // Same rendered pixels, two DOM orders. Reading document order anchored the pair on the line
  // BELOW the one the icon sits on and manufactured 23.5px of phantom delta.
  it('reads a column reordered by `order` the same as the identical column in visual order', async () => {
    const reordered = await measure(
      column(`<h3 style="order:2;margin:0;font-size:18px;line-height:24px">Club Boats</h3>`, `<span style="order:1;font-size:12px;line-height:24px">MEMBERSHIP</span>`)
    );
    const plain = await measure(column(eyebrow, title));
    const one = reordered.find((pair) => pair.pairClass === 'icon-beside-text');
    const other = plain.find((pair) => pair.pairClass === 'icon-beside-text');
    expect(one?.b.text).toBe('MEMBERSHIP');
    expect(one?.deltaPx).toBe(other?.deltaPx);
    expect(one?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('reads a `column-reverse` column off the run that renders on top', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div style="display:flex;flex-direction:column-reverse">${title}${eyebrow}</div></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.text).toBe('MEMBERSHIP');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  // An out-of-flow run sits BESIDE the composition rather than in it, so it is not the line the
  // eye pairs the icon against. Anchoring on one both fired falsely and named the wrong element.
  it('ignores an absolutely positioned flag and names the title the row is composed against', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div style="position:relative;width:200px;height:60px">
          <span style="position:absolute;bottom:0;left:0;font-size:11px">New</span>${title}</div></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.selector).toBe('h3');
    expect(pair?.b.text).toBe('Club Boats');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('ignores a floated price on the title line', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div><span style="float:right;font-size:12px;line-height:16px">$20</span>${title}</div></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.selector).toBe('h3');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });
});

describe('who counts as a row member', () => {
  // `display: contents` generates no box, so the wrapper measures 0x0 and the whole row dropped
  // out of the walk with every diagnostic still reading zero. The showcase header ships this shape.
  it('hoists a `display: contents` wrapper children into the row rather than dropping the row', async () => {
    const header = (wrapper: string) =>
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <span style="font-size:20px;line-height:24px;position:relative;top:6px">Showcase</span>
        <div style="display:${wrapper}"><button style="width:44px;height:44px"></button></div></div>`;
    const hoisted = (await measure(header('contents'))).find(
      (pair) => pair.pairClass === 'control-beside-text'
    );
    const plain = (await measure(header('flex'))).find((pair) => pair.pairClass === 'control-beside-text');
    expect(hoisted).toBeDefined();
    expect(hoisted?.deltaPx).toBe(plain?.deltaPx);
    expect(hoisted?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // Sorting by `left` before splitting on overlap put a second-row member between the two members
  // of row one, so every cluster came out a singleton and the row reported clean.
  it('keeps a wrapped flex row intact instead of splitting it into singletons', async () => {
    const row = (navWidth: string) =>
      `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;width:600px;font-family:sans-serif">
        <span style="font-size:20px;line-height:24px;position:relative;top:6px">Showcase</span>
        <button style="width:44px;height:44px"></button>
        <nav style="width:${navWidth};font-size:12px">Home About</nav></div>`;
    const wrapped = await measure(row('100%'));
    const unwrapped = await measure(row('auto'));
    const pair = wrapped.find((candidate) => candidate.a.text === 'Showcase');
    expect(pair).toBeDefined();
    expect(pair?.deltaPx).toBe(unwrapped.find((candidate) => candidate.a.text === 'Showcase')?.deltaPx);
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
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

  // The same trap reached through the OTHER door: a small inline owns the line's first text node
  // without owning any of its visual mass. Reading that face returned -1.5px, under the reporting
  // bar, on a row whose icon sits 3px off the heading it is composed against.
  it('reads the heading a leading inline flag shares its line with, not the flag', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <svg width="24" height="24" viewBox="0 0 24 24" style="display:block">
          <rect x="0" y="0" width="24" height="24" fill="currentColor"></rect></svg>
        <h2 style="margin:0;font-size:24px;line-height:32px;font-weight:600">
          <span style="font-size:10px">DRAFT</span> Winter schedule</h2></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.selector).toBe('h2');
    expect(pair?.b.text).toBe('Winter schedule');
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // Same shape, and this one inverted the SIGN: the module said the icon rode high by 2.5px while
  // it in fact sat low by 3, which sends a fixer the wrong way.
  it('signs the delta off the principal run, so a numbered heading reads the icon as sitting low', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <span style="display:flex;flex:none;align-items:center;height:28px">
          <svg width="28" height="28" viewBox="0 0 28 28" style="display:block">
            <rect x="0" y="0" width="28" height="28" fill="currentColor"></rect></svg></span>
        <h3 style="margin:0;font-size:28px;line-height:36px;font-weight:600">
          <small style="font-size:11px">3.</small> Publish the post</h3></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.selector).toBe('h3');
    expect(pair?.deltaPx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // The inverse defect, and the false-alarm direction: the member's own first text node is a small
  // run whose parent is the CONTAINER, which is trap 2 verbatim. The row is composed exactly right.
  it('stays quiet on a row whose visual mass is a larger inline inside a small container', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <span style="display:flex;flex:none;align-items:center;height:30px">
          <svg width="30" height="30" viewBox="0 0 30 30" style="display:block">
            <rect x="0" y="0" width="30" height="30" fill="currentColor"></rect></svg></span>
        <div style="font-size:11px;line-height:16px">for
          <span style="font-size:30px;line-height:36px;font-weight:700">Winter 2026</span></div></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.b.text).toBe('Winter 2026');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
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

  // The optical path takes the same principal run as everything else. Measuring a recipe by a
  // small nested count reported a label riding 6px high inside its own box as centred.
  it('measures the recipe by its own label, not by a small nested count beside it', async () => {
    const pairs = await measure(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:baseline;gap:6px;border:0;padding:6px 16px 12px;font-size:24px;line-height:28px;font-family:sans-serif"><span
        style="font-size:9px">99</span>Publish</button></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'optical-suspect');
    expect(pair?.a.text).toBe('Publish');
    expect(pair?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
  });
});

describe('trap 3: ink is what paints, which an element bbox is not', () => {
  /** The calibration icon card with its 24-unit glyph's inner markup swapped for `art`. */
  function iconCard(art: string): string {
    return fixture('icon-card').html.replace(
      '<rect x="4" y="2" width="16" height="12" fill="currentColor"></rect>',
      art
    );
  }

  const drawnArt = '<rect x="4" y="2" width="16" height="12" fill="currentColor"></rect>';

  async function iconCardPair(art: string): Promise<MeasuredPair> {
    return fixturePair(await measure(iconCard(art)), fixture('icon-card'));
  }

  // Every Material Symbols glyph ships a full-viewBox `fill="none"` sizing path. Unioning it into
  // the root bbox turned a 4px-high icon into a 0.5px reading with `geometry: 'ink'` on the record.
  it('leaves a non-painting spacer path out of the ink union', async () => {
    const pair = await iconCardPair(`<path d="M0 0h24v24H0z" fill="none"/>${drawnArt}`);
    expect(pair.a.geometry).toBe('ink');
    expect(pair.a.contentCentrePx).toBeCloseTo(pair.a.elementCentrePx - 4, 2);
    expect(pair.magnitudePx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('leaves a hidden and a fully transparent shape out of the ink union', async () => {
    const hidden = await iconCardPair(
      `<rect x="0" y="0" width="24" height="24" style="visibility:hidden"/>${drawnArt}`
    );
    const transparent = await iconCardPair(
      `<rect x="0" y="0" width="24" height="24" fill="currentColor" opacity="0"/>${drawnArt}`
    );
    expect(hidden.a.contentCentrePx).toBeCloseTo(hidden.a.elementCentrePx - 4, 2);
    expect(transparent.a.contentCentrePx).toBeCloseTo(transparent.a.elementCentrePx - 4, 2);
  });

  it('leaves a clip-path definition out of the ink union rather than reading it as art', async () => {
    const pair = await iconCardPair(
      `<defs><clipPath id="never-drawn"><rect x="0" y="0" width="24" height="24"/></clipPath></defs>${drawnArt}`
    );
    expect(pair.a.contentCentrePx).toBeCloseTo(pair.a.elementCentrePx - 4, 2);
  });

  // The ellipsis glyph this repo's own toolbar ships: three round-cap `h.01` segments whose
  // GEOMETRY box is zero tall while the stroke paints a 2px band. Discarding it fell back to the
  // element box and reported a glyph riding 6px high as perfectly centred.
  it('reads a stroked one-dimensional glyph by its stroke band, not as no ink at all', async () => {
    const ellipsis = (last: string) =>
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" style="display:block">
          <path d="M5 6h.01"/><path d="M12 6h.01"/><path d="${last}"/></svg>
        <span style="font-size:14px;line-height:20px">More actions</span></div>`;
    const flat = (await measure(ellipsis('M19 6h.01'))).find((pair) => pair.pairClass === 'icon-beside-text');
    const upright = (await measure(ellipsis('M19 6v.01'))).find((pair) => pair.pairClass === 'icon-beside-text');
    expect(flat?.a.geometry).toBe('ink');
    expect(flat?.a.contentCentrePx).toBeCloseTo((flat?.a.elementCentrePx ?? 0) - 6, 1);
    expect(flat?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
    // The two glyphs draw the same three dots, so they must not reach opposite verdicts.
    expect(flat?.deltaPx ?? 0).toBeCloseTo(upright?.deltaPx ?? 99, 1);
  });

  it('reads a zero-width stroked rule by its stroke band', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:block">
          <line x1="12" y1="2" x2="12" y2="14"/></svg>
        <span style="font-size:14px;line-height:20px">More actions</span></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.a.geometry).toBe('ink');
    expect(pair?.a.contentCentrePx).toBeCloseTo((pair?.a.elementCentrePx ?? 0) - 4, 1);
    expect(pair?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
  });

  // An `<svg>` clips to its viewport, so geometry that bleeds past the viewBox is never drawn.
  // Reading it manufactured a 15px phantom on a row that is only mildly off.
  it('clamps ink that bleeds past the viewBox to the crop the browser actually draws', async () => {
    const pair = await iconCardPair(`<rect x="4" y="-30" width="16" height="44" fill="currentColor"/>`);
    // Drawn rows are 0 through 14 of the 24-unit viewBox, so the ink centre sits 5px above the
    // element box centre. Unclamped geometry put it 20px above, four times the real defect.
    expect(pair.a.contentCentrePx).toBeCloseTo(pair.a.elementCentrePx - 5, 2);
    expect(pair.a.topPx).toBeCloseTo(pair.a.elementCentrePx - 12, 2);
  });

  it('confines ink to a resolvable clip-path rather than reporting the whole shape', async () => {
    const pair = await iconCardPair(
      `<defs><clipPath id="lower-half"><rect x="0" y="12" width="24" height="12"/></clipPath></defs>
       <rect x="4" y="2" width="16" height="20" fill="currentColor" clip-path="url(#lower-half)"/>`
    );
    // Drawn rows are 12 through 22, an ink centre 5px BELOW the element box centre. Ignoring the
    // clip read rows 2 through 22 and reported the row clean.
    expect(pair.a.contentCentrePx).toBeCloseTo(pair.a.elementCentrePx + 5, 2);
    expect(pair.deltaPx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('counts a mask it cannot resolve rather than presenting the geometry box as certain', async () => {
    await withPage(
      iconCard(
        `<defs><mask id="fade"><rect x="0" y="12" width="24" height="12" fill="white"/></mask></defs>
         <rect x="4" y="2" width="16" height="20" fill="currentColor" mask="url(#fade)"/>`
      ),
      async (page) => {
        const { diagnostics } = await measureVerticalMetrics(page as unknown as RenderedPage);
        expect(diagnostics.iconInkClipsUnresolved).toBeGreaterThanOrEqual(1);
      }
    );
  });

  // Every fixture in this file renders its SVG at its viewBox scale, so the screen CTM is the
  // identity and dropping it entirely changes no number. The corpus's dominant idiom is not:
  // `class="h-4 w-4" viewBox="0 0 24 24"` scales by two thirds.
  it('maps ink through the screen CTM, so a scaled glyph reads at its rendered size', async () => {
    const pairs = await measure(
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <svg width="16" height="16" viewBox="0 0 24 24" style="display:block">
          <rect x="4" y="2" width="16" height="12" fill="currentColor"></rect></svg>
        <span style="font-size:14px;line-height:20px">Scaled</span></div>`
    );
    const pair = pairs.find((candidate) => candidate.pairClass === 'icon-beside-text');
    expect(pair?.a.geometry).toBe('ink');
    // The art's user-space centre is 4 units above the viewBox centre, which renders at two thirds
    // of that. Reading the bbox without the CTM would put the ink centre on the element centre.
    expect(pair?.a.contentCentrePx).toBeCloseTo((pair?.a.elementCentrePx ?? 0) - 4 * (16 / 24), 2);
    expect(pair?.a.bottomPx ?? 0).toBeCloseTo((pair?.a.topPx ?? 0) + 12 * (16 / 24), 2);
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

  // The cap reads the ANCHOR, so what it excludes is a reading that is itself a layout object. A
  // control this tall has no line to share with the label beside it.
  it('counts a reading too tall to be a row reading instead of measuring it', async () => {
    await withPage(
      `<div style="display:flex;align-items:flex-start;gap:8px;font-family:sans-serif">
        <textarea style="box-sizing:border-box;height:${DEFAULT_ROW_ITEM_MAX_HEIGHT_PX + 40}px;width:80px"></textarea>
        <span style="font-size:14px;line-height:20px">Beside it</span>
      </div>`,
      async (page) => {
        const { pairs, diagnostics } = await measureVerticalMetrics(page as unknown as RenderedPage);
        expect(pairs).toEqual([]);
        expect(diagnostics.pairsSkippedTooTall).toBe(1);
      }
    );
  });

  // The inverse, and the dangerous direction: capping the member's BLOCK box made the module's own
  // calibration shape vanish at one extra wrapped line, so a known defect reported as silence.
  it('measures an icon beside a text block taller than the cap, since the reading is one line', async () => {
    const spec = fixture('icon-card');
    const long = 'Keelboats, a summer mooring, winter storage, and a crew list for anyone who asks. ';
    const tall = spec.html.replace('Keelboats and a summer mooring.', long.repeat(3));
    await withPage(tall, async (page) => {
      const { pairs, diagnostics } = await measureVerticalMetrics(page as unknown as RenderedPage);
      const blockHeight = await page.evaluate(() => {
        const block = document.querySelector('.cairn-calibration-icon-card h3')?.parentElement;
        return block ? block.getBoundingClientRect().height : 0;
      });
      expect(blockHeight).toBeGreaterThan(DEFAULT_ROW_ITEM_MAX_HEIGHT_PX);
      expect(diagnostics.pairsSkippedTooTall).toBe(0);
      expect(calibrationMiss(spec, pairs)).toBeNull();
    });
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
