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
  isCentredAlignment,
  isStartAlignment,
  measurePair,
  measureVerticalMetrics,
  metricForPair,
  pairsAboveBar,
  referenceForMetric,
  type MeasuredPair,
  type GeometrySource,
  type MemberAnchor,
  type MemberKind,
  type PairClass,
  type RawPair,
  type VerticalCalibrationFixture,
} from './vertical-metrics.js';
import type { RenderedPage } from '../../lib/audit/rendered.js';

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

/**
 * The first pair of `pairClass` the module measures on `html`. Undefined rather than thrown, so a
 * test asserting the pair exists says so itself instead of relying on a helper to have done it.
 */
async function measureFirst(html: string, pairClass: PairClass): Promise<MeasuredPair | undefined> {
  return (await measure(html)).find((pair) => pair.pairClass === pairClass);
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

/** The tag a member of each kind is read off in the real walk, so a fixture names a plausible one. */
const TAG_BY_KIND: Record<MemberKind, string> = {
  text: 'span',
  icon: 'svg',
  control: 'button',
  box: 'span',
};

/** Where each kind's reading comes from, which the walk resolves and a pure fixture only restates. */
const GEOMETRY_BY_KIND: Record<MemberKind, GeometrySource> = {
  text: 'glyph',
  icon: 'ink',
  control: 'element-box',
  box: 'element-box',
};

/** A member anchor with only the fields a pure test cares about set, the rest at neutral values. */
function anchor(kind: MemberKind, values: Partial<MemberAnchor> = {}): MemberAnchor {
  return {
    kind,
    selector: `${kind}-member`,
    classes: '',
    tag: TAG_BY_KIND[kind],
    // Neutral for the decomposition: a member centred on a block it renders one line of carries no
    // composition term, so a pure test asserts the delta without also asserting a lift.
    alignSelf: 'center',
    geometry: GEOMETRY_BY_KIND[kind],
    topPx: 0,
    bottomPx: 10,
    contentCentrePx: 5,
    elementCentrePx: 5,
    // The member box the row placed, which defaults to the reading's own box: a member whose
    // visible content fills the box the row aligned. A test about top alignment sets it apart.
    memberTopPx: 0,
    memberBottomPx: 10,
    baselinePx: kind === 'text' ? 8 : null,
    capCentrePx: kind === 'text' ? 4 : null,
    // A bare run of type, which is what a text member is until its own element paints a box.
    paintedBoxCentrePx: null,
    text: '',
    lineCount: kind === 'text' ? 1 : 0,
    blockLiftPx: 0,
    stacked: false,
    ...values,
  };
}

function rawPair(a: MemberAnchor, b: MemberAnchor, values: Partial<RawPair> = {}): RawPair {
  return {
    rowKind: 'flex-grid-row',
    rowSelector: 'div.row',
    rowClasses: 'row',
    rowTag: 'div',
    rowMembers: [`${a.kind}:${a.text || a.tag}`, `${b.kind}:${b.text || b.tag}`],
    alignItems: 'center',
    rowBox: { topPx: 0, bottomPx: 20, leftPx: 0, rightPx: 100 },
    a,
    b,
    ...values,
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
    const notCentred = { alignSelf: 'baseline' };
    expect(metricForPair(rawPair(anchor('text', notCentred), anchor('text', notCentred)))).toBe('baseline');
    expect(metricForPair(rawPair(anchor('icon'), anchor('text')))).toBe('content-centre');
    expect(metricForPair(rawPair(anchor('control'), anchor('text')))).toBe('content-centre');
    expect(metricForPair(rawPair(anchor('control'), anchor('control')))).toBe('content-centre');
    expect(metricForPair(rawPair(anchor('text'), anchor('box')))).toBe('optical-centre');
  });

  it('measures two runs of text by centre where the row centres them, in any of the centre keywords', () => {
    for (const alignment of ['center', 'safe center', 'middle']) {
      const centred = { alignSelf: alignment };
      expect(metricForPair(rawPair(anchor('text', centred), anchor('text', centred)))).toBe('content-centre');
    }
    // One member centred is not a centred row, the same condition the composition term applies.
    expect(
      metricForPair(rawPair(anchor('text', { alignSelf: 'center' }), anchor('text', { alignSelf: 'baseline' })))
    ).toBe('baseline');
  });

  it('reads a text member by its cap centre under content-centre, not its glyph-box centre', () => {
    const text = anchor('text', { contentCentrePx: 9, capCentrePx: 4 });
    expect(referenceForMetric(text, 'content-centre')).toBe(4);
    expect(referenceForMetric(anchor('icon', { contentCentrePx: 7 }), 'content-centre')).toBe(7);
    expect(referenceForMetric(anchor('control', { contentCentrePx: 6 }), 'content-centre')).toBe(6);
  });

  it('reads a member whose run sits in a painted box by that box, since the box is the visual object', () => {
    const chip = anchor('text', { capCentrePx: 4, paintedBoxCentrePx: 6 });
    expect(referenceForMetric(chip, 'content-centre')).toBe(6);
    // The baseline metric is unmoved by it: a box has no baseline to substitute for the run's.
    expect(referenceForMetric(chip, 'baseline')).toBe(chip.baselinePx);
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

// The premise check. Trap 1 answers WHICH LINE a member pairs with, and the failure this splits
// out is the probe that then assumed the answer to a different question: whether the member should
// pair with a line at all. On a centred row whose text wraps, it should not.
describe('the composition term, and why the residual is the defect', () => {
  /** A wrapped text member: three lines, the reading taken on the first, centred in its row. */
  function wrapped(lines: number, values: Partial<MemberAnchor> = {}) {
    // Line height 20, so a three-line block's centre sits 20px below its first line's centre.
    return anchor('text', { lineCount: lines, blockLiftPx: ((lines - 1) * 20) / 2, ...values });
  }

  it('reads a centred row with a wrapped block as composition, leaving no residual', () => {
    // The icon centres on the whole block: 20px below the first line's cap centre, which is
    // exactly what a three-line block asks for.
    const pair = measurePair(rawPair(anchor('icon', { contentCentrePx: 24 }), wrapped(3, { capCentrePx: 4 })));
    expect(pair).toMatchObject({ deltaPx: 20, compositionPx: 20, residualPx: 0 });
    expect(pairsAboveBar([pair as MeasuredPair])).toEqual([]);
  });

  it('scales the composition with the line count, which is what makes the raw delta a phantom', () => {
    const twoLines = measurePair(rawPair(anchor('icon', { contentCentrePx: 14 }), wrapped(2, { capCentrePx: 4 })));
    const fourLines = measurePair(rawPair(anchor('icon', { contentCentrePx: 34 }), wrapped(4, { capCentrePx: 4 })));
    expect(twoLines?.deltaPx).toBe(10);
    expect(fourLines?.deltaPx).toBe(30);
    expect(twoLines?.residualPx).toBe(0);
    expect(fourLines?.residualPx).toBe(0);
  });

  it('keeps an ink defect in the residual, so a wrapped block cannot hide one', () => {
    // The same three-line row, with the icon's ink riding 4px high inside its own box: the /join
    // defect. The composition still accounts for 20px and the 4px survives as the residual.
    const pair = measurePair(rawPair(anchor('icon', { contentCentrePx: 20 }), wrapped(3, { capCentrePx: 4 })));
    expect(pair).toMatchObject({ deltaPx: 16, compositionPx: 20, residualPx: -4 });
    expect(pairsAboveBar([pair as MeasuredPair])).toHaveLength(1);
  });

  it('takes no wrapped-block term on a top-aligned or baseline-aligned row, where the line is the intent', () => {
    for (const alignment of ['flex-start', 'start', 'baseline', 'stretch', 'normal', 'flex-end']) {
      const pair = measurePair(
        rawPair(
          // The member box matches the reading, so top alignment asks for nothing either: what is
          // asserted here is that a wrapped block alone buys no term outside a centred row.
          anchor('icon', { contentCentrePx: 24, memberTopPx: 20, memberBottomPx: 28, alignSelf: alignment }),
          wrapped(3, { capCentrePx: 24, alignSelf: alignment })
        )
      );
      expect(pair).toMatchObject({ deltaPx: 0, compositionPx: 0, residualPx: 0 });
    }
  });

  it('takes no composition term when only one member is centred', () => {
    const pair = measurePair(
      rawPair(anchor('icon', { contentCentrePx: 24, alignSelf: 'flex-start' }), wrapped(3, { capCentrePx: 4 }))
    );
    expect(pair?.compositionPx).toBe(0);
  });
  it('reads a `safe center` row as centred, since the keyword only changes the overflow case', () => {
    expect(isCentredAlignment('safe center')).toBe(true);
    expect(isCentredAlignment('unsafe center')).toBe(true);
    expect(isCentredAlignment('center')).toBe(true);
    expect(isCentredAlignment('last baseline')).toBe(false);
  });

  it('signs the composition by which member wraps, so a wrapped left member reads the other way', () => {
    const pair = measurePair(rawPair(wrapped(3, { capCentrePx: 4 }), anchor('text', { capCentrePx: 24 })));
    expect(pair).toMatchObject({ metric: 'content-centre', deltaPx: -20, compositionPx: -20, residualPx: 0 });
  });

  it('always carries the term on an optical suspect, whose padding box spans every line by construction', () => {
    const glyph = anchor('text', { capCentrePx: 4, lineCount: 3, blockLiftPx: 20, alignSelf: 'normal' });
    const box = anchor('box', { contentCentrePx: 24, alignSelf: 'normal' });
    const pair = measurePair(rawPair(glyph, box, { rowKind: 'optical-suspect' }));
    expect(pair).toMatchObject({ pairClass: 'optical-suspect', deltaPx: -20, compositionPx: -20, residualPx: 0 });
  });

  it('gives a control and an icon of the same geometry the same term, so no ruling splits by kind', () => {
    const control = measurePair(rawPair(anchor('control', { contentCentrePx: 24 }), wrapped(3, { capCentrePx: 4 })));
    const icon = measurePair(rawPair(anchor('icon', { contentCentrePx: 24 }), wrapped(3, { capCentrePx: 4 })));
    expect(control?.compositionPx).toBe(icon?.compositionPx);
    expect(control?.residualPx).toBe(icon?.residualPx);
  });
});

// The second premise check, and the second phantom. Trap 1 answers which line; the composition term
// above answers whether a CENTRED row pairs with a line at all. Neither answers what a TOP-ALIGNED
// row asked for, and the first corrected emission of the inventory assumed the raw delta was
// already the defect there. It is not: top alignment levels the members' own boxes and asks for
// nothing else, so a member read at its centre sits half its own box below the line beside it.
describe('the top-alignment term, and the taller member that is not a defect', () => {
  /** An icon of `ink` px of art, centred in a `box` px member tile whose top sits at `top`. */
  function tiled(box: number, ink: number, top = 0, values: Partial<MemberAnchor> = {}) {
    const centre = top + box / 2;
    return anchor('icon', {
      alignSelf: 'flex-start',
      memberTopPx: top,
      memberBottomPx: top + box,
      topPx: centre - ink / 2,
      bottomPx: centre + ink / 2,
      contentCentrePx: centre,
      elementCentrePx: centre,
      ...values,
    });
  }

  /** The line beside it: one line of 13px type whose cap centre sits 6.5px below the row top. */
  function firstLine(values: Partial<MemberAnchor> = {}) {
    return anchor('text', {
      alignSelf: 'flex-start',
      memberTopPx: 0,
      memberBottomPx: 117,
      topPx: 0,
      bottomPx: 13,
      capCentrePx: 6.5,
      lineCount: 9,
      blockLiftPx: 52,
      ...values,
    });
  }

  it('reads a top-aligned tile taller than the line beside it as composition, leaving no residual', () => {
    // The admin's own shape: a 36px icon tile, ink dead centre, `items-start` beside a wrapped
    // block. 11.5px apart on screen and nothing to fix.
    const pair = measurePair(rawPair(tiled(36, 15), firstLine()));
    expect(pair).toMatchObject({ deltaPx: 11.5, compositionPx: 11.5, residualPx: 0 });
    expect(pairsAboveBar([pair as MeasuredPair])).toEqual([]);
  });

  it('scales the term with the member box, which is the signature that it is not an ink offset', () => {
    // Two tiles, one recipe: 36px reads 11.5px and 28px reads 7.5px, both correct as built. A
    // reading that tracks the TILE rather than the ink is composition by construction.
    expect(measurePair(rawPair(tiled(36, 15), firstLine()))?.residualPx).toBe(0);
    expect(measurePair(rawPair(tiled(28, 15), firstLine()))?.residualPx).toBe(0);
    expect(measurePair(rawPair(tiled(28, 15), firstLine()))?.deltaPx).toBe(7.5);
  });

  it('keeps an ink defect in the residual, so a top-aligned row cannot hide one', () => {
    // The `/join` shape: a 24px member box whose art rides 4px above its own centre. The term
    // accounts for the box and the 4px survives, which is what stops this from emptying a report.
    const pair = measurePair(rawPair(tiled(24, 12, 0, { contentCentrePx: 8, topPx: 2, bottomPx: 14 }), firstLine()));
    expect(pair).toMatchObject({ compositionPx: 5.5, residualPx: -4 });
    expect(pairsAboveBar([pair as MeasuredPair])).toHaveLength(1);
  });

  it('keeps the stacked-field defect in the residual, where the reading is not the member box', () => {
    // The season row under `items-start`: the composite member is 57px and the control inside it
    // sits in the bottom 32, so the reading is 12.5px below the member's own centre. The anchor
    // drilled past the member on purpose, and the term must not put that back.
    const field = anchor('control', {
      alignSelf: 'flex-start',
      memberTopPx: 0,
      memberBottomPx: 57,
      contentCentrePx: 41,
      stacked: true,
    });
    const bare = anchor('control', { alignSelf: 'flex-start', memberTopPx: 0, memberBottomPx: 32, contentCentrePx: 16 });
    expect(measurePair(rawPair(field, bare))).toMatchObject({ deltaPx: 25, compositionPx: 12.5, residualPx: 12.5 });
  });

  it('takes no term on a baseline pair, which no box geometry enters', () => {
    const pair = measurePair(
      rawPair(
        anchor('text', { alignSelf: 'flex-start', baselinePx: 8, memberBottomPx: 60 }),
        anchor('text', { alignSelf: 'flex-start', baselinePx: 11, memberBottomPx: 20 })
      )
    );
    expect(pair).toMatchObject({ metric: 'baseline', deltaPx: -3, compositionPx: 0, residualPx: -3 });
  });

  it('takes no term under stretch, which sizes a member to the row rather than placing it', () => {
    for (const alignment of ['stretch', 'normal', 'flex-end', 'baseline']) {
      const pair = measurePair(
        rawPair(tiled(36, 15, 0, { alignSelf: alignment }), firstLine({ alignSelf: alignment }))
      );
      expect(pair).toMatchObject({ compositionPx: 0, residualPx: 11.5 });
    }
  });

  it('takes no term when only one member is top-aligned', () => {
    const pair = measurePair(rawPair(tiled(36, 15), firstLine({ alignSelf: 'stretch' })));
    expect(pair?.compositionPx).toBe(0);
  });

  it('reads `self-start` and `safe flex-start` as top alignment, since neither moves the box', () => {
    expect(isStartAlignment('flex-start')).toBe(true);
    expect(isStartAlignment('start')).toBe(true);
    expect(isStartAlignment('self-start')).toBe(true);
    expect(isStartAlignment('safe flex-start')).toBe(true);
    expect(isStartAlignment('stretch')).toBe(false);
    expect(isStartAlignment('normal')).toBe(false);
    expect(isStartAlignment('center')).toBe(false);
  });

  it('gives a control and an icon of the same geometry the same term, so no ruling splits by kind', () => {
    const asIcon = measurePair(rawPair(tiled(32, 32), firstLine()));
    const asControl = measurePair(rawPair(tiled(32, 32, 0, { kind: 'control', geometry: 'element-box' }), firstLine()));
    expect(asControl?.compositionPx).toBe(asIcon?.compositionPx);
    expect(asControl?.residualPx).toBe(asIcon?.residualPx);
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

  // The decomposition against real layout rather than hand-set anchors, on the shape the pass
  // widened for. Same markup, same defect, one property changed: the raw delta moves by a whole
  // block and the residual does not move at all.
  it('holds the ink defect at the same residual when the row centres the wrapped block', async () => {
    const topAligned = fixturePair(await measure(spec.html), spec);
    const centred = fixturePair(await measure(spec.html.replace('align-items:flex-start', 'align-items:center')), spec);

    // The top-aligned row takes its own small term (the icon's 24px member box against a 24px line
    // box), and the row it top-aligns against is a block, so the two terms are nothing alike.
    expect(Math.abs(topAligned.compositionPx)).toBeLessThanOrEqual(spec.maxCompositionPx);
    expect(centred.compositionPx).toBeGreaterThan(15);
    expect(centred.deltaPx).toBeGreaterThan(topAligned.deltaPx + 15);
    // The two rows ask different questions of the same ink (a centred row compares it with the
    // line, a top-aligned row with the member's own box), so they agree to half a pixel rather than
    // exactly, against a raw delta that moves by twenty.
    expect(Math.abs(centred.residualPx - topAligned.residualPx)).toBeLessThanOrEqual(0.5);
    expect(centred.residualMagnitudePx).toBeGreaterThanOrEqual(spec.minMagnitudePx);
    expect(centred.b.lineCount).toBeGreaterThan(1);
  });

  // The positive control the top-alignment term needs, against real layout rather than hand-set
  // anchors: this fixture DOES take a term and the defect it exists to catch survives it whole.
  it('takes a top-alignment term and still reports the ink defect under it', async () => {
    const pair = fixturePair(await measure(spec.html), spec);
    expect(pair.a.alignSelf).toBe('flex-start');
    expect(pair.compositionPx).not.toBe(0);
    expect(pair.residualMagnitudePx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
    expect(pair.residualMagnitudePx).toBeGreaterThanOrEqual(pair.magnitudePx);
  });

  // The row this pass's inventory reported four times and should have reported zero times: an icon
  // centred in a tile taller than the line it sits beside, top-aligned. The ink is where its own
  // box puts it, so the reading is the tile's height and there is nothing to fix.
  it('reads a tile taller than the line beside it as composition, and an off-centre one as a defect', async () => {
    const row = (inner: string) =>
      `<div class="tile-row" style="display:flex;align-items:flex-start;gap:12px;width:320px;font-family:sans-serif">
        ${inner}
        <div style="font-size:13px;line-height:17px">Tidy is set up for this site and runs on every save you make</div>
      </div>`;
    const tile = (align: string) =>
      `<span style="display:flex;align-items:${align};justify-content:center;flex:none;height:36px;width:36px">
        <svg width="20" height="20" viewBox="0 0 20 20" style="display:block">
          <rect x="0" y="0" width="20" height="20" fill="currentColor"></rect>
        </svg>
      </span>`;
    const inRow = (pairs: MeasuredPair[]) =>
      pairs.find((pair) => pair.pairClass === 'icon-beside-text' && pair.rowClasses.includes('tile-row'));

    const centred = inRow(await measure(row(tile('center'))));
    expect(centred?.magnitudePx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
    expect(centred?.residualPx).toBeCloseTo(0, 1);

    // The same tile with its art parked at the tile's own top: the box is where the row put it and
    // the ink is not, which is the one thing a top-aligned row can get wrong.
    const parked = inRow(await measure(row(tile('flex-start'))));
    expect(parked?.residualMagnitudePx).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // The phantom, stated as the assertion that would have failed. A centred wrapped block reads
  // further apart the narrower the column gets, on pixels nobody should touch.
  it('reads the same residual at two column widths where the raw delta swings by a line', async () => {
    const narrow = fixturePair(
      await measure(spec.html.replace('align-items:flex-start', 'align-items:center').replace('width:110px', 'width:70px')),
      spec
    );
    const wide = fixturePair(await measure(spec.html.replace('align-items:flex-start', 'align-items:center')), spec);
    expect(narrow.b.lineCount).toBeGreaterThan(wide.b.lineCount);
    expect(Math.abs(narrow.deltaPx - wide.deltaPx)).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
    expect(narrow.residualPx).toBeCloseTo(wide.residualPx, 1);
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
    const one = await measureFirst(
      column(`<h3 style="order:2;margin:0;font-size:18px;line-height:24px">Club Boats</h3>`, `<span style="order:1;font-size:12px;line-height:24px">MEMBERSHIP</span>`),
      'icon-beside-text'
    );
    const other = await measureFirst(column(eyebrow, title), 'icon-beside-text');
    expect(one?.b.text).toBe('MEMBERSHIP');
    expect(one?.deltaPx).toBe(other?.deltaPx);
    expect(one?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('reads a `column-reverse` column off the run that renders on top', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div style="display:flex;flex-direction:column-reverse">${title}${eyebrow}</div></div>`,
      'icon-beside-text'
    );
    expect(pair?.b.text).toBe('MEMBERSHIP');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  // An out-of-flow run sits BESIDE the composition rather than in it, so it is not the line the
  // eye pairs the icon against. Anchoring on one both fired falsely and named the wrong element.
  it('ignores an absolutely positioned flag and names the title the row is composed against', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div style="position:relative;width:200px;height:60px">
          <span style="position:absolute;bottom:0;left:0;font-size:11px">New</span>${title}</div></div>`,
      'icon-beside-text'
    );
    expect(pair?.b.selector).toBe('h3');
    expect(pair?.b.text).toBe('Club Boats');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('ignores a floated price on the title line', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:flex-start;gap:12px;font-family:sans-serif">${icon}
        <div><span style="float:right;font-size:12px;line-height:16px">$20</span>${title}</div></div>`,
      'icon-beside-text'
    );
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
    const hoisted = await measureFirst(header('contents'), 'control-beside-text');
    const plain = await measureFirst(header('flex'), 'control-beside-text');
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
    const pair = await measureFirst(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <svg width="24" height="24" viewBox="0 0 24 24" style="display:block">
          <rect x="0" y="0" width="24" height="24" fill="currentColor"></rect></svg>
        <h2 style="margin:0;font-size:24px;line-height:32px;font-weight:600">
          <span style="font-size:10px">DRAFT</span> Winter schedule</h2></div>`,
      'icon-beside-text'
    );
    expect(pair?.b.selector).toBe('h2');
    expect(pair?.b.text).toBe('Winter schedule');
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // Same shape, and this one inverted the SIGN: the module said the icon rode high by 2.5px while
  // it in fact sat low by 3, which sends a fixer the wrong way.
  it('signs the delta off the principal run, so a numbered heading reads the icon as sitting low', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <span style="display:flex;flex:none;align-items:center;height:28px">
          <svg width="28" height="28" viewBox="0 0 28 28" style="display:block">
            <rect x="0" y="0" width="28" height="28" fill="currentColor"></rect></svg></span>
        <h3 style="margin:0;font-size:28px;line-height:36px;font-weight:600">
          <small style="font-size:11px">3.</small> Publish the post</h3></div>`,
      'icon-beside-text'
    );
    expect(pair?.b.selector).toBe('h3');
    expect(pair?.deltaPx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // The inverse defect, and the false-alarm direction: the member's own first text node is a small
  // run whose parent is the CONTAINER, which is trap 2 verbatim. The row is composed exactly right.
  it('stays quiet on a row whose visual mass is a larger inline inside a small container', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:center;gap:12px;font-family:sans-serif">
        <span style="display:flex;flex:none;align-items:center;height:30px">
          <svg width="30" height="30" viewBox="0 0 30 30" style="display:block">
            <rect x="0" y="0" width="30" height="30" fill="currentColor"></rect></svg></span>
        <div style="font-size:11px;line-height:16px">for
          <span style="font-size:30px;line-height:36px;font-weight:700">Winter 2026</span></div></div>`,
      'icon-beside-text'
    );
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
    const pair = await measureFirst(html, 'text-beside-text');
    const asCentres =
      (referenceForMetric(pair!.a, 'content-centre') ?? 0) - (referenceForMetric(pair!.b, 'content-centre') ?? 0);
    expect(Math.abs(asCentres)).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('still catches two runs of text whose baselines genuinely disagree', async () => {
    const broken = html.replace('line-height:1">24 published', 'line-height:1;position:relative;top:5px">24 published');
    const pair = await measureFirst(broken, 'text-beside-text');
    expect(pair?.metric).toBe('baseline');
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // The converse of the trap above, and the one this file first got backwards. A mixed-size pair
  // sharing a CENTRE has baselines that diverge by design, by exactly the cap-height ratio, so a
  // baseline metric reports every correctly centred row as broken.
  it('measures a centred mixed-size pair by centres, since a centred row asked for centres', async () => {
    const centred = html.replace('align-items:baseline', 'align-items:center');
    const pair = await measureFirst(centred, 'text-beside-text');
    expect(pair?.metric).toBe('content-centre');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
    // The reading the old metric took on these same pixels, kept as the assertion that would have
    // fired: the two baselines sit further apart than the bar with nothing misconfigured.
    const asBaselines = (pair?.a.baselinePx ?? 0) - (pair?.b.baselinePx ?? 0);
    expect(Math.abs(asBaselines)).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('still catches a centred pair whose visible content genuinely sits apart', async () => {
    const broken = html
      .replace('align-items:baseline', 'align-items:center')
      .replace('line-height:1">24 published', 'line-height:1;position:relative;top:5px">24 published');
    const pair = await measureFirst(broken, 'text-beside-text');
    expect(pair?.metric).toBe('content-centre');
    expect(pair?.magnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });
});

// The headline defect of the third emission: three of ten inventoried rows were a padded chip beside
// larger type, classed as two runs of text and scored on baselines. A chip is a BOX. Its background
// and border draw the outline the eye levels against the run beside it, and the type inside it only
// says where the optical rule should look.
describe('a padded chip is a box, not a run of type', () => {
  /** The admin shell's brand tile: a display wordmark with a small chip centred beside it. */
  const brandTile = (rowAlign: string, chipStyle = '') =>
    `<div class="brand-tile" style="display:flex;align-items:${rowAlign};gap:10px;font-family:sans-serif">
      <span style="font-size:22px;line-height:28px;font-weight:600">Cairn</span>
      <span class="brand-chip" style="display:inline-flex;align-items:center;border-radius:6px;
            background:#dcd8d2;padding:1px 6px;font-size:11px;line-height:14px;${chipStyle}">CMS</span>
    </div>`;

  const chipPair = async (html: string) =>
    (await measure(html)).find(
      (pair) => pair.pairClass === 'text-beside-text' && pair.rowClasses.includes('brand-tile')
    );

  it('stays quiet on a chip whose box centres on the type beside it', async () => {
    const pair = await chipPair(brandTile('center'));
    expect(pair?.metric).toBe('content-centre');
    expect(pair?.residualMagnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
    // Levelling this pair on one baseline, which is what the previous emission prescribed, would
    // drop the chip by the cap-height ratio off a centre it already hits.
    expect(Math.abs((pair?.a.baselinePx ?? 0) - (pair?.b.baselinePx ?? 0))).toBeGreaterThan(
      VERTICAL_REPORTING_BAR_PX
    );
  });

  it('reads the chip at its painted box, leaving the glyph inside it to the optical rule', async () => {
    const pair = await chipPair(brandTile('center'));
    expect(pair?.b.paintedBoxCentrePx).not.toBeNull();
    expect(pair?.b.paintedBoxCentrePx).toBeCloseTo(((pair?.b.memberTopPx ?? 0) + (pair?.b.memberBottomPx ?? 0)) / 2, 1);
    expect(referenceForMetric(pair!.b, 'content-centre')).toBe(pair?.b.paintedBoxCentrePx);
    // A bare run of type paints no box of its own, so it still reads its cap band.
    expect(pair?.a.paintedBoxCentrePx).toBeNull();
    expect(referenceForMetric(pair!.a, 'content-centre')).toBe(pair?.a.capCentrePx);
  });

  it('does not count a glyph riding high inside its own chip as a defect of the row', async () => {
    // The chip's box still centres on the type beside it; its own label rides high INSIDE the chip,
    // which is the optical reading's finding. Reading the chip at its cap band would report that
    // one offset twice, once here and once there.
    const pair = await chipPair(brandTile('center', 'padding:1px 6px 7px;'));
    expect(pair?.residualMagnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
    expect(Math.abs((pair?.a.capCentrePx ?? 0) - (pair?.b.capCentrePx ?? 0))).toBeGreaterThan(
      VERTICAL_REPORTING_BAR_PX
    );
  });

  it('reports a chip that does not centre on the type beside it', async () => {
    const pair = await chipPair(brandTile('center', 'position:relative;top:4px;'));
    expect(pair?.residualMagnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('keeps the baseline metric where the row declares a baseline or levels the tops', async () => {
    // Neither row asked for centres, and under `flex-start` a centre reading collapses into the
    // top-alignment term, so the baseline is the only relative reading these two members have.
    for (const alignment of ['baseline', 'flex-start']) {
      const pair = await chipPair(brandTile(alignment));
      expect(pair?.metric).toBe('baseline');
    }
  });

  it('does not read the row its members sit in as one member visual object', async () => {
    // The Write tab: a painted button whose own label is a member of the row inside it. The button
    // is the ground the row is drawn on, not a chip around one member.
    const pair = await measureFirst(
      `<div><button class="tab-btn" type="button"
        style="display:inline-flex;align-items:center;gap:6px;border-radius:8px;background:#e5e2dd;
               padding:4px 10px;font-size:13px;line-height:18px;font-family:sans-serif">
        <svg width="16" height="16" viewBox="0 0 24 24" style="display:block">
          <rect x="4" y="2" width="16" height="12" fill="currentColor"></rect></svg>Write</button></div>`,
      'icon-beside-text'
    );
    expect(pair?.b.paintedBoxCentrePx).toBeNull();
    expect(pair?.residualMagnitudePx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  // A table cell is placed by `vertical-align`, never by `align-self`, and Chromium reports
  // `normal` on every cell. Reading that as "no alignment declared" sent fifteen middle-aligned
  // rows of one admin list to the baseline metric, where a status chip read 1.55px off.
  it('reads a table cell by its `vertical-align`, so a middle-aligned row is a centred row', async () => {
    const listRow = (valign: string) =>
      `<table style="border-collapse:collapse;font-family:sans-serif"><tbody>
        <tr class="list-row" style="vertical-align:${valign}">
          <td style="padding:8px;font-size:13px;line-height:17px">Jun 9, 2026</td>
          <td style="padding:8px"><span class="status-chip" style="display:inline-flex;align-items:center;
              border-radius:999px;background:#dcd8d2;padding:2px 8px;font-size:10px;line-height:12px">
              Published</span></td>
        </tr></tbody></table>`;
    const cellPair = async (valign: string) =>
      (await measure(listRow(valign))).find(
        (pair) => pair.rowKind === 'table-row' && pair.pairClass === 'text-beside-text'
      );

    const middle = await cellPair('middle');
    expect(middle?.a.alignSelf).toBe('middle');
    expect(middle?.metric).toBe('content-centre');
    expect(middle?.residualMagnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);

    const baseline = await cellPair('baseline');
    expect(baseline?.metric).toBe('baseline');
  });
});

describe('control beside text', () => {
  const row = (extra: string) => `<div class="check-row"
      style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
    <input type="checkbox" style="box-sizing:border-box;width:16px;height:16px;margin:0;${extra}">
    <span style="font-size:14px;line-height:20px">Notify me on publish</span>
  </div>`;

  it('stays quiet on a control optically centred against its label', async () => {
    const pair = await measureFirst(row(''), 'control-beside-text');
    expect(pair).toBeDefined();
    expect(pair?.metric).toBe('content-centre');
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  it('reports a control lifted off its label, signed as the left member riding high', async () => {
    const pair = await measureFirst(row('position:relative;top:-6px'), 'control-beside-text');
    expect(pair?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
    expect(pair?.magnitudePx ?? 0).toBeCloseTo(6, 0);
  });
});

describe('the optical suspects', () => {
  it('measures a label recipe glyph against its own padding box', async () => {
    const pair = await measureFirst(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:center;border:0;padding:12px 16px 4px;font-size:14px;line-height:20px">
        Publish</button></div>`,
      'optical-suspect'
    );
    expect(pair).toBeDefined();
    expect(pair?.metric).toBe('optical-centre');
    expect(pair?.rowKind).toBe('optical-suspect');
    // Positive means the glyph sits LOW inside its own box, which 12px above and 4px below is.
    expect(pair?.deltaPx ?? 0).toBeGreaterThan(VERTICAL_REPORTING_BAR_PX);
  });

  it('stays quiet on a label recipe whose padding is symmetric', async () => {
    const pair = await measureFirst(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:center;border:0;padding:8px 16px;font-size:14px;line-height:20px">
        Publish</button></div>`,
      'optical-suspect'
    );
    expect(pair).toBeDefined();
    expect(pair?.magnitudePx ?? 99).toBeLessThanOrEqual(VERTICAL_REPORTING_BAR_PX);
  });

  // The optical path takes the same principal run as everything else. Measuring a recipe by a
  // small nested count reported a label riding 6px high inside its own box as centred.
  it('measures the recipe by its own label, not by a small nested count beside it', async () => {
    const pair = await measureFirst(
      `<div><button class="btn" type="button"
        style="display:inline-flex;align-items:baseline;gap:6px;border:0;padding:6px 16px 12px;font-size:24px;line-height:28px;font-family:sans-serif"><span
        style="font-size:9px">99</span>Publish</button></div>`,
      'optical-suspect'
    );
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
    const flat = await measureFirst(ellipsis('M19 6h.01'), 'icon-beside-text');
    const upright = await measureFirst(ellipsis('M19 6v.01'), 'icon-beside-text');
    expect(flat?.a.geometry).toBe('ink');
    expect(flat?.a.contentCentrePx).toBeCloseTo((flat?.a.elementCentrePx ?? 0) - 6, 1);
    expect(flat?.deltaPx ?? 0).toBeLessThan(-VERTICAL_REPORTING_BAR_PX);
    // The two glyphs draw the same three dots, so they must not reach opposite verdicts.
    expect(flat?.deltaPx ?? 0).toBeCloseTo(upright?.deltaPx ?? 99, 1);
  });

  it('reads a zero-width stroked rule by its stroke band', async () => {
    const pair = await measureFirst(
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:block">
          <line x1="12" y1="2" x2="12" y2="14"/></svg>
        <span style="font-size:14px;line-height:20px">More actions</span></div>`,
      'icon-beside-text'
    );
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
    const pair = await measureFirst(
      `<div style="display:flex;align-items:center;gap:8px;font-family:sans-serif">
        <svg width="16" height="16" viewBox="0 0 24 24" style="display:block">
          <rect x="4" y="2" width="16" height="12" fill="currentColor"></rect></svg>
        <span style="font-size:14px;line-height:20px">Scaled</span></div>`,
      'icon-beside-text'
    );
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
