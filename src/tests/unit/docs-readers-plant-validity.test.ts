import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseSections } from '../../../scripts/docs-readers/lib/sections.js';
import { checkJobPlants, type Plant } from '../../../scripts/docs-readers/plant-validity.js';
import type { FindingSpans, PathMap, PathMapPage, PathMapSection } from '../../../scripts/docs-readers/path-map.js';

/** `count` numbered filler lines for one section's body, each distinct so a fixture can pick any one by index. */
function numberedBody(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} body line ${i + 1}.`);
}

/** A page carrying one H2 section with 60 numbered filler lines under it, room enough for several spaced plants. */
const ONE_SECTION_PAGE = ['# Title', '', '## Section A', '', ...numberedBody('A', 60)].join('\n');

/** A page carrying an H1 lead span the mapper never put on-path, plus one on-path H2 section. */
const LEAD_AND_SECTION_PAGE = ['# Title', 'Lead sentence never quoted by any run.', '## Section A', '', ...numberedBody('A', 60)].join('\n');

/** A page carrying three H2 sections, each with room for two widely spaced plants. */
function threeSectionPage(): string {
  return [
    '# Title',
    '',
    '## Section A',
    '',
    ...numberedBody('A', 30),
    '## Section B',
    '',
    ...numberedBody('B', 30),
    '## Section C',
    '',
    ...numberedBody('C', 30),
  ].join('\n');
}

/** One text's line at a 1-based line number. */
function lineText(text: string, line: number): string {
  return text.split('\n')[line - 1];
}

/** A section's own 1-based line span, by heading text, parsed from a page's real text. */
function sectionSpan(pageText: string, heading: string): { start: number; end: number } {
  const section = parseSections(pageText).sections.find((s) => s.heading === heading);
  if (!section) throw new Error(`fixture page carries no section "${heading}"`);
  return { start: section.start, end: section.end };
}

/** A path map built from real pages, whose on-path sections are exactly the named headings on each page. */
function buildMap(pages: Record<string, string>, onPathByPage: Record<string, string[]>, ranges?: Record<string, Array<[number, number]>>): PathMap {
  const pagesBlock: Record<string, PathMapPage> = {};
  for (const [key, text] of Object.entries(pages)) {
    const parsed = parseSections(text);
    const wanted = onPathByPage[key] ?? [];
    const sections: PathMapSection[] = parsed.sections
      .filter((section) => wanted.includes(section.heading))
      .map((section) => ({ heading: section.heading, level: section.level, start: section.start, end: section.end, quotes: 2, runs: 2 }));
    pagesBlock[key] = { lines: parsed.lines, sections };
  }
  return {
    job: 'job1',
    verifiedRuns: 3,
    mode: 'steps',
    pages: pagesBlock,
    ...(ranges ? { ranges } : {}),
    onPathShare: 0.5,
    narrowed: Boolean(ranges),
    widened: false,
    capacity: 7,
    noMap: null,
  };
}

/** A fully-shaped plant, overriding only what a fixture needs to vary. */
function makePlant(overrides: Partial<Plant> & Pick<Plant, 'id' | 'page' | 'line'>): Plant {
  return {
    job: 'job1',
    type: 'wrong-name',
    semantic: false,
    subject: 'a subject',
    original: 'original text.',
    planted: 'planted text.',
    proof: 'the code shows this is wrong',
    criterion: 'catches when the reader notices the wrong name',
    nearMiss: 'merely mentioning the name does not count',
    ...overrides,
  };
}

/** Apply a set of plants to a page's text, replacing each plant's own span with its `planted` text. */
function applyPlants(text: string, plants: Plant[]): string {
  const lines = text.split('\n');
  for (const plant of plants) {
    const plantedLines = plant.planted.split('\n');
    lines.splice(plant.line - 1, plantedLines.length, ...plantedLines);
  }
  return lines.join('\n');
}

describe('checkJobPlants: a valid fixture set', () => {
  it('passes every plant and every page when nothing is wrong', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [
      makePlant({ id: 'p1', page: 'page.md', line: 10, type: 'false-behavior', semantic: true, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' }),
      makePlant({ id: 'p2', page: 'page.md', line: 30, type: 'undefined-term', semantic: false, original: lineText(ONE_SECTION_PAGE, 30), planted: 'A replaced line 30.' }),
    ];
    const plantedPages = { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) };
    const result = checkJobPlants({ job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages, plants });
    expect(result.valid).toBe(true);
    expect(result.plants.every((p) => p.valid)).toBe(true);
    expect(result.pages.every((p) => p.valid)).toBe(true);
    expect(result.counts).toEqual({ total: 2, semantic: 1, token: 1 });
  });
});

describe('checkJobPlants: the plantable-region rule', () => {
  it('rejects a plant outside every on-path section', () => {
    const controlPages = { 'page.md': LEAD_AND_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 2, original: lineText(LEAD_AND_SECTION_PAGE, 2), planted: 'A different lead sentence.' })];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(LEAD_AND_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.valid).toBe(false);
    expect(result.plants[0]).toMatchObject({ id: 'p1', valid: false });
    expect(result.plants[0].reasons).toContain('outside the plantable region');
  });

  it('rejects a plant outside a narrowed range even when it sits inside the on-path section the map still lists', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const sectionA = sectionSpan(ONE_SECTION_PAGE, 'Section A');
    const map = buildMap(controlPages, { 'page.md': ['Section A'] }, { 'page.md': [[40, 50]] });
    expect(sectionA.start).toBeLessThan(40);
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' })];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants[0].valid).toBe(false);
    expect(result.plants[0].reasons).toContain('outside the plantable region');
  });
});

describe('checkJobPlants: the heading rule', () => {
  it('rejects a plant span that includes a heading line', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const sectionA = sectionSpan(ONE_SECTION_PAGE, 'Section A');
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: sectionA.start, original: lineText(ONE_SECTION_PAGE, sectionA.start), planted: '## Section A (renamed)' })];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants[0].valid).toBe(false);
    expect(result.plants[0].reasons).toContain('plant span includes a heading line');
  });
});

describe('checkJobPlants: the spacing rules', () => {
  it('rejects a third plant in one section, leaving the first two valid', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [
      makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' }),
      makePlant({ id: 'p2', page: 'page.md', line: 25, original: lineText(ONE_SECTION_PAGE, 25), planted: 'A replaced line 25.' }),
      makePlant({ id: 'p3', page: 'page.md', line: 40, original: lineText(ONE_SECTION_PAGE, 40), planted: 'A replaced line 40.' }),
    ];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants.find((p) => p.id === 'p1')?.valid).toBe(true);
    expect(result.plants.find((p) => p.id === 'p2')?.valid).toBe(true);
    const third = result.plants.find((p) => p.id === 'p3');
    expect(third?.valid).toBe(false);
    expect(third?.reasons).toContain('more than two plants in one section');
  });

  it('rejects a second plant within ten lines of the first, leaving the first valid', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [
      makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' }),
      makePlant({ id: 'p2', page: 'page.md', line: 19, original: lineText(ONE_SECTION_PAGE, 19), planted: 'A replaced line 19.' }),
    ];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants.find((p) => p.id === 'p1')?.valid).toBe(true);
    const second = result.plants.find((p) => p.id === 'p2');
    expect(second?.valid).toBe(false);
    expect(second?.reasons).toContain('within ten lines of another plant');
  });

  it('accepts two plants exactly eleven lines apart', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [
      makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' }),
      makePlant({ id: 'p2', page: 'page.md', line: 21, original: lineText(ONE_SECTION_PAGE, 21), planted: 'A replaced line 21.' }),
    ];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants.every((p) => p.valid)).toBe(true);
  });

  it('rejects a fifth plant on one page of a multi-page job, even though its own section is under quota', () => {
    const pageA = threeSectionPage();
    const pageB = ONE_SECTION_PAGE;
    const controlPages = { 'a.md': pageA, 'b.md': pageB };
    const map = buildMap(controlPages, { 'a.md': ['Section A', 'Section B', 'Section C'], 'b.md': ['Section A'] });
    const sectionAStart = sectionSpan(pageA, 'Section A').start;
    const sectionBStart = sectionSpan(pageA, 'Section B').start;
    const sectionCStart = sectionSpan(pageA, 'Section C').start;
    const plants = [
      makePlant({ id: 'p1', page: 'a.md', line: sectionAStart + 5, original: lineText(pageA, sectionAStart + 5), planted: 'replaced.' }),
      makePlant({ id: 'p2', page: 'a.md', line: sectionAStart + 20, original: lineText(pageA, sectionAStart + 20), planted: 'replaced.' }),
      makePlant({ id: 'p3', page: 'a.md', line: sectionBStart + 5, original: lineText(pageA, sectionBStart + 5), planted: 'replaced.' }),
      makePlant({ id: 'p4', page: 'a.md', line: sectionBStart + 20, original: lineText(pageA, sectionBStart + 20), planted: 'replaced.' }),
      makePlant({ id: 'p5', page: 'a.md', line: sectionCStart + 5, original: lineText(pageA, sectionCStart + 5), planted: 'replaced.' }),
    ];
    const input = {
      job: 'job1',
      map,
      absent: [],
      findingSpans: {},
      controlPages,
      plantedPages: { 'a.md': applyPlants(pageA, plants), 'b.md': pageB },
      plants,
    };
    const result = checkJobPlants(input);
    expect(result.plants.slice(0, 4).every((p) => p.valid)).toBe(true);
    const fifth = result.plants.find((p) => p.id === 'p5');
    expect(fifth?.valid).toBe(false);
    expect(fifth?.reasons).toContain('more than four plants on one page of a multi-page job');
  });
});

describe('checkJobPlants: the stale-path rule', () => {
  it('rejects a stale-path plant whose planted path lies on the absent list', () => {
    // The control page carries the correct path at line 10; the fixture builds it directly so
    // `original` and the control text agree without a second overlay pass.
    const controlLines = ONE_SECTION_PAGE.split('\n');
    controlLines[9] = '`docs/reference/log.md`';
    const control = controlLines.join('\n');
    const controlPages = { 'page.md': control };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plant = makePlant({
      id: 'p1',
      page: 'page.md',
      line: 10,
      type: 'stale-path',
      original: '`docs/reference/log.md`',
      planted: '`docs/internal/record/2026-09-24-x.md`',
    });
    const input = {
      job: 'job1',
      map,
      absent: ['docs/internal/record/'],
      findingSpans: {},
      controlPages,
      plantedPages: { 'page.md': applyPlants(control, [plant]) },
      plants: [plant],
    };
    const result = checkJobPlants(input);
    expect(result.plants[0].valid).toBe(false);
    expect(result.plants[0].reasons).toContain('stale-path plant targets an absent-list path "docs/internal/record/2026-09-24-x.md"');
  });
});

describe('checkJobPlants: the finding-span rule', () => {
  it('rejects a plant that sits on a mapping-run finding span', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const findingSpans: FindingSpans = { 'page.md': [{ start: 20, end: 22 }] };
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 21, original: lineText(ONE_SECTION_PAGE, 21), planted: 'A replaced line 21.' })];
    const input = { job: 'job1', map, absent: [], findingSpans, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.plants[0].valid).toBe(false);
    expect(result.plants[0].reasons).toContain('plant sits on a mapping-run finding span');
  });
});

describe('checkJobPlants: the differs-from-control rule', () => {
  it('rejects a plant whose planted text matches the control text exactly', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const original = lineText(ONE_SECTION_PAGE, 10);
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 10, original, planted: original })];
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': ONE_SECTION_PAGE }, plants };
    const result = checkJobPlants(input);
    expect(result.plants[0].valid).toBe(false);
    expect(result.plants[0].reasons).toContain('planted page does not differ from the control page within the plant span');
  });
});

describe('checkJobPlants: the page-level checks', () => {
  it('rejects a page whose planted copy carries an undeclared changed line', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' })];
    let planted = applyPlants(ONE_SECTION_PAGE, plants);
    const strayLines = planted.split('\n');
    strayLines[29] = 'An undeclared stray edit.';
    planted = strayLines.join('\n');
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': planted }, plants };
    const result = checkJobPlants(input);
    const pageVerdict = result.pages.find((p) => p.page === 'page.md');
    expect(pageVerdict?.valid).toBe(false);
    expect(pageVerdict?.reasons).toContain('undeclared changed line 30');
  });

  it('rejects a page whose planted copy has a different line count than the control', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const plants = [makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' })];
    const planted = applyPlants(ONE_SECTION_PAGE, plants);
    const shortened = planted.split('\n').slice(0, -1).join('\n');
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': shortened }, plants };
    const result = checkJobPlants(input);
    const pageVerdict = result.pages.find((p) => p.page === 'page.md');
    expect(pageVerdict?.valid).toBe(false);
    expect(pageVerdict?.reasons.some((r) => r.startsWith('line count mismatch'))).toBe(true);
  });
});

describe('checkJobPlants: the semantic-mix and count flags', () => {
  it('flags a job with at least four plants but fewer than four semantic', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    const lines = [10, 21, 32, 43];
    const plants = lines.map((line, i) =>
      makePlant({ id: `p${i}`, page: 'page.md', line, semantic: i === 0, original: lineText(ONE_SECTION_PAGE, line), planted: `A replaced line ${line}.` }),
    );
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.counts).toEqual({ total: 4, semantic: 1, token: 3 });
    expect(result.fewSemantic).toBe(true);
    expect(result.tooMany).toBe(false);
  });

  it('flags a job with more than seven plants', () => {
    const controlPages = { 'page.md': ONE_SECTION_PAGE };
    const map = buildMap(controlPages, { 'page.md': ['Section A'] });
    // Only the count flag is asserted here, so the fixture does not need to respect spacing.
    const plants = Array.from({ length: 8 }, (_, i) =>
      makePlant({ id: `p${i}`, page: 'page.md', line: 4 + i, semantic: false, original: lineText(ONE_SECTION_PAGE, 4 + i), planted: 'A replaced line.' }),
    );
    const input = { job: 'job1', map, absent: [], findingSpans: {}, controlPages, plantedPages: { 'page.md': applyPlants(ONE_SECTION_PAGE, plants) }, plants };
    const result = checkJobPlants(input);
    expect(result.counts.total).toBe(8);
    expect(result.tooMany).toBe(true);
  });
});

describe('the plant-validity CLI', () => {
  it('reads plants.json, maps, absent lists, and the control and planted trees, and writes each job’s verdict', async () => {
    const { main } = await import('../../../scripts/docs-readers/plant-validity.js');
    const dir = mkdtempSync(join(tmpdir(), 'plant-validity-cli-'));
    const plant = makePlant({ id: 'p1', page: 'page.md', line: 10, original: lineText(ONE_SECTION_PAGE, 10), planted: 'A replaced line 10.' });
    const map = buildMap({ 'page.md': ONE_SECTION_PAGE }, { 'page.md': ['Section A'] });

    writeFileSync(join(dir, 'plants.json'), JSON.stringify([plant]));
    mkdirSync(join(dir, 'maps'), { recursive: true });
    writeFileSync(join(dir, 'maps', 'job1.json'), JSON.stringify(map));
    writeFileSync(join(dir, 'absent.json'), JSON.stringify({ job1: [] }));
    mkdirSync(join(dir, 'control', 'job1'), { recursive: true });
    writeFileSync(join(dir, 'control', 'job1', 'page.md'), ONE_SECTION_PAGE);
    mkdirSync(join(dir, 'planted', 'job1'), { recursive: true });
    writeFileSync(join(dir, 'planted', 'job1', 'page.md'), applyPlants(ONE_SECTION_PAGE, [plant]));
    const outFile = join(dir, 'out.json');

    const code = main([
      'check',
      '--plants',
      join(dir, 'plants.json'),
      '--maps',
      join(dir, 'maps'),
      '--absent',
      join(dir, 'absent.json'),
      '--control-root',
      join(dir, 'control'),
      '--planted-root',
      join(dir, 'planted'),
      '--out',
      outFile,
    ]);
    expect(code).toBe(0);
    const output = JSON.parse(readFileSync(outFile, 'utf8')) as Array<{ job: string; valid: boolean }>;
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ job: 'job1', valid: true });
  });

  it('rejects an unknown flag', async () => {
    const { main } = await import('../../../scripts/docs-readers/plant-validity.js');
    expect(() => main(['check', '--bogus', 'x'])).toThrow(/unknown flag/);
  });
});
