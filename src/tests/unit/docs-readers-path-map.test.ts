import { describe, it, expect } from 'vitest';
import { parseSections, sectionForSpan, computeCapacity, type CapacityRegion } from '../../../scripts/docs-readers/lib/sections.js';
import { buildPathMap, buildProxyMap, isVerifiedOpusRun } from '../../../scripts/docs-readers/path-map.js';
import type { JobReport, VerifiedQuote, VerifiedStep } from '../../../scripts/docs-readers/lib/types.js';

/** Build a minimal, fully-shaped job report, overriding only what a test needs to vary. */
function makeReport(overrides: Partial<JobReport> & Pick<JobReport, 'model'>): JobReport {
  return {
    id: 'run',
    class: 'docs-only',
    outcome: 'done',
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    steps: [],
    diverged: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
    verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] },
    ...overrides,
  };
}

/** A verified quote (or one that failed verification), for a fixture step or field. */
function makeQuote(path: string, startLine: number, endLine = startLine, ok = true): VerifiedQuote {
  return { path, line: startLine, text: 'quote text', ok, startLine, endLine };
}

/** One verified step, quoting a page's line span. */
function makeStep(path: string, startLine: number, endLine = startLine, ok = true): VerifiedStep {
  return { quote: makeQuote(path, startLine, endLine, ok), decision: 'did the thing' };
}

/** A page of `count` filler lines, none of them headings, joined with a trailing newline. */
function fillerLines(count: number, text = 'filler line.'): string {
  return Array.from({ length: count }, () => text).join('\n');
}

const FENCED_PAGE = [
  '# Title',
  '',
  'Lead paragraph text.',
  '',
  '## Section A',
  '',
  'Body A line 1.',
  'Body A line 2.',
  '',
  '### Section A1',
  '',
  'Body A1.',
  '',
  '```',
  '## Not a heading',
  '```',
  '',
  '## Section B',
  '',
  'Body B.',
].join('\n');

describe('parseSections', () => {
  it('splits H2 and H3 sections, an H2 ending at its first H3, skipping a fenced heading-shaped line', () => {
    const { lines, sections } = parseSections(FENCED_PAGE);
    expect(lines).toBe(20);
    expect(sections).toEqual([
      { heading: 'Section A', level: 2, start: 5, end: 9 },
      { heading: 'Section A1', level: 3, start: 10, end: 17 },
      { heading: 'Section B', level: 2, start: 18, end: 20 },
    ]);
  });

  it('leaves the lines between the H1 and the first H2 out of every section (the lead span)', () => {
    const { sections } = parseSections(FENCED_PAGE);
    for (const section of sections) expect(section.start).toBeGreaterThan(4);
  });
});

describe('sectionForSpan', () => {
  const { sections } = parseSections(FENCED_PAGE);

  it('assigns a span wholly inside one section to that section', () => {
    expect(sectionForSpan(sections, 7, 8)).toEqual(sections[0]);
  });

  it('assigns a span crossing a heading boundary to neither section', () => {
    // Line 9 is Section A's last line; line 10 is Section A1's heading line.
    expect(sectionForSpan(sections, 9, 10)).toBeUndefined();
  });

  it('assigns a span in the lead area, before any section, to none', () => {
    expect(sectionForSpan(sections, 1, 3)).toBeUndefined();
  });
});

describe('computeCapacity', () => {
  it('returns six for a map that holds only six under spacing: three sections, two plants each', () => {
    const regions: CapacityRegion[] = [
      { page: 'p.md', ranges: [{ start: 1, end: 20 }, { start: 100, end: 120 }, { start: 200, end: 220 }] },
    ];
    expect(computeCapacity(regions, new Map(), false)).toBe(6);
  });

  it('never exceeds two plants per section even when a section is long enough for more', () => {
    const regions: CapacityRegion[] = [{ page: 'p.md', ranges: [{ start: 1, end: 500 }] }];
    expect(computeCapacity(regions, new Map(), false)).toBe(2);
  });

  it('drops a finding-span line from consideration', () => {
    const regions: CapacityRegion[] = [{ page: 'p.md', ranges: [{ start: 1, end: 3 }] }];
    const findingSpans = new Map([['p.md', [{ start: 1, end: 3 }]]]);
    expect(computeCapacity(regions, findingSpans, false)).toBe(0);
  });

  it('caps a multi-page job at four plants per page', () => {
    const regions: CapacityRegion[] = [
      { page: 'a.md', ranges: [{ start: 1, end: 20 }, { start: 100, end: 120 }, { start: 200, end: 220 }] },
    ];
    expect(computeCapacity(regions, new Map(), true)).toBe(4);
  });
});

/** Build a job report whose only structured field is `steps[]`, for on-path-rule fixtures. */
function stepsRun(model: string, verified: boolean, steps: VerifiedStep[]): JobReport {
  return makeReport({ model, steps, verified: { ok: verified, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] } });
}

const OPUS = 'claude-opus-5-5';
const SONNET = 'claude-sonnet-5';

describe('isVerifiedOpusRun', () => {
  it('is true only for a verified report with an opus model', () => {
    expect(isVerifiedOpusRun(stepsRun(OPUS, true, []))).toBe(true);
    expect(isVerifiedOpusRun(stepsRun(OPUS, false, []))).toBe(false);
    expect(isVerifiedOpusRun(stepsRun(SONNET, true, []))).toBe(false);
  });
});

describe('buildPathMap: the on-path rule', () => {
  // One page: lead (1-4), Section A (5-60), Section B (61-100).
  const page = ['# Title', '', 'Lead.', '', '## Section A', fillerLines(53), '## Section B', fillerLines(38)].join('\n');
  const pages = { 'p.md': page };

  it('with three verified runs, a section quoted by two of three is on-path', () => {
    const runs = [
      stepsRun(OPUS, true, [makeStep('p.md', 10)]),
      stepsRun(OPUS, true, [makeStep('p.md', 10)]),
      stepsRun(OPUS, true, [makeStep('p.md', 90)]),
    ];
    const map = buildPathMap({ job: 'j', runs, pages });
    expect(map.verifiedRuns).toBe(3);
    expect(map.pages['p.md'].sections.map((s) => s.heading)).toEqual(['Section A']);
    expect(map.noMap).toBeNull();
  });

  it('with three verified runs, a section quoted by only one of three is not on-path', () => {
    // The on-path share is computed from the on-path set alone, before any thin-map widening
    // adds a marginal, once-quoted section back onto the usable map for planting purposes.
    const runs = [stepsRun(OPUS, true, [makeStep('p.md', 10)]), stepsRun(OPUS, true, []), stepsRun(OPUS, true, [])];
    const map = buildPathMap({ job: 'j', runs, pages });
    expect(map.onPathShare).toBe(0);
    // Zero on-path sections is not the same as no map: some run did quote something.
    expect(map.noMap).toBeNull();
  });

  it('with two verified runs, both must quote a section for it to count', () => {
    const bothQuote = buildPathMap({ job: 'j', runs: [stepsRun(OPUS, true, [makeStep('p.md', 10)]), stepsRun(OPUS, true, [makeStep('p.md', 10)])], pages });
    expect(bothQuote.verifiedRuns).toBe(2);
    expect(bothQuote.pages['p.md'].sections.map((s) => s.heading)).toEqual(['Section A']);

    const onlyOneQuotes = buildPathMap({ job: 'j', runs: [stepsRun(OPUS, true, [makeStep('p.md', 10)]), stepsRun(OPUS, true, [])], pages });
    expect(onlyOneQuotes.onPathShare).toBe(0);
  });

  it('with one verified run, it alone decides, and verifiedRuns records that', () => {
    const map = buildPathMap({ job: 'j', runs: [stepsRun(OPUS, true, [makeStep('p.md', 10)])], pages });
    expect(map.verifiedRuns).toBe(1);
    expect(map.pages['p.md'].sections.map((s) => s.heading)).toEqual(['Section A']);
  });

  it('with zero verified runs, there is no map, recorded, never a crash', () => {
    const map = buildPathMap({ job: 'j', runs: [stepsRun(SONNET, true, [makeStep('p.md', 10)]), stepsRun(OPUS, false, [makeStep('p.md', 10)])], pages });
    expect(map.verifiedRuns).toBe(0);
    expect(map.noMap).not.toBeNull();
    expect(map.pages['p.md'].sections).toEqual([]);
  });

  it('with verified runs but an empty steps[] set on every one, there is no map, never a crash', () => {
    const map = buildPathMap({ job: 'j', runs: [stepsRun(OPUS, true, []), stepsRun(OPUS, true, []), stepsRun(OPUS, true, [])], pages });
    expect(map.verifiedRuns).toBe(3);
    expect(map.noMap).not.toBeNull();
  });

  it('a quote spanning a heading boundary counts toward no section, so a job quoting only that way has no map', () => {
    const { sections } = parseSections(page);
    const boundary = sections[0].end;
    const runs = [
      stepsRun(OPUS, true, [makeStep('p.md', boundary, boundary + 1)]),
      stepsRun(OPUS, true, [makeStep('p.md', boundary, boundary + 1)]),
      stepsRun(OPUS, true, []),
    ];
    const map = buildPathMap({ job: 'j', runs, pages });
    expect(map.pages['p.md'].sections).toEqual([]);
    expect(map.noMap).not.toBeNull();
  });
});

describe('buildPathMap: the ceiling and its two-stage narrowing', () => {
  it('narrows to line ranges within 40 lines of a two-run-quoted line, inside the all-three sections', () => {
    // One page, one H2 section spanning lines 5-70 of a 100-line page: on its own it is 66
    // percent of the page, above the 60 percent ceiling, and all three runs quote inside it.
    const page = ['# Title', '', 'Lead.', '', '## Section A', fillerLines(65), '## trailing', fillerLines(29)].join('\n');
    const pages = { 'p.md': page };
    const runs = [
      stepsRun(OPUS, true, [makeStep('p.md', 20)]),
      stepsRun(OPUS, true, [makeStep('p.md', 20)]),
      stepsRun(OPUS, true, [makeStep('p.md', 60)]),
    ];
    const map = buildPathMap({ job: 'j', runs, pages });
    expect(map.onPathShare).toBeCloseTo(66 / 100, 5);
    expect(map.narrowed).toBe(true);
    expect(map.ranges).toBeDefined();
    // Line 20 is quoted by two runs (0 and 1); its window is [20-40, 20+40] clipped to the
    // section (5-70) and the page (100 lines): [5, 60]. Line 60 is quoted by only run 2, so it
    // contributes no window of its own.
    expect(map.ranges?.['p.md']).toEqual([[5, 60]]);
  });
});

describe('buildPathMap: thin-map widening', () => {
  it('widens in descending quote-count order and stops before a section that would cross 60 percent', () => {
    // Lead (1-4), A (5-14, on-path, 10 lines), B (15-64, 50 lines), C (65-74, 10 lines), filler
    // to a 110-line page: A+B is 55 percent (under the ceiling), A+B+C is 64 (over it).
    const page = ['# Title', '', 'Lead.', '', '## A', fillerLines(9), '## B', fillerLines(49), '## C', fillerLines(9), '## filler', fillerLines(35)].join('\n');
    const pages = { 'p.md': page };
    const runs = [
      stepsRun(OPUS, true, [makeStep('p.md', 6), makeStep('p.md', 8)]), // both quote A: on-path
      stepsRun(OPUS, true, [makeStep('p.md', 6), makeStep('p.md', 8), makeStep('p.md', 20), makeStep('p.md', 21), makeStep('p.md', 22)]), // A, plus B three times
      stepsRun(OPUS, true, [makeStep('p.md', 68), makeStep('p.md', 69)]), // C twice
    ];
    const map = buildPathMap({ job: 'j', runs, pages });
    expect(map.narrowed).toBe(false);
    expect(map.widened).toBe(true);
    // B (3 quotes) is added before C (2 quotes); adding C would take the share from 60 to 70
    // percent, so it stops there.
    expect(map.pages['p.md'].sections.map((s) => s.heading).sort()).toEqual(['A', 'B']);
    expect(map.capacity).toBeLessThan(7);
  });
});

describe('buildProxyMap', () => {
  const page = ['# Title', '', 'Lead.', '', '## Section A', fillerLines(10), '## Section B', fillerLines(10)].join('\n');
  const pages = { 'p.md': page };

  it('puts a section on the map from one verified quote in diverged[], a report field other than quotes[] or steps[]', () => {
    const run = makeReport({
      model: OPUS,
      diverged: [{ quote: makeQuote('p.md', 7), didInstead: 'used a workaround', why: 'the page was silent', blockedBy: null }],
      verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] },
    });
    const map = buildProxyMap({ job: 'j', runs: [run], pages });
    expect(map.mode).toBe('proxy');
    expect(map.pages['p.md'].sections.map((s) => s.heading)).toEqual(['Section A']);
  });

  it('an unverified quote does not put its section on the map', () => {
    const run = makeReport({
      model: OPUS,
      quotes: [makeQuote('p.md', 7, 7, false)],
      verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] },
    });
    const map = buildProxyMap({ job: 'j', runs: [run], pages });
    expect(map.pages['p.md'].sections).toEqual([]);
  });

  it('a non-Opus run does not put its section on the map', () => {
    const run = makeReport({
      model: SONNET,
      quotes: [makeQuote('p.md', 7)],
      verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] },
    });
    const map = buildProxyMap({ job: 'j', runs: [run], pages });
    expect(map.pages['p.md'].sections).toEqual([]);
  });

  it('one run suffices: a second, unverified run adds nothing and takes nothing away', () => {
    const runs = [
      makeReport({ model: OPUS, quotes: [makeQuote('p.md', 7)], verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] } }),
      makeReport({ model: OPUS, quotes: [makeQuote('p.md', 17)], verified: { ok: false, init: false, canaries: true, quotes: [], steps: [], diverged: [], problems: ['no report'] } }),
    ];
    const map = buildProxyMap({ job: 'j', runs, pages });
    expect(map.pages['p.md'].sections.map((s) => s.heading)).toEqual(['Section A']);
  });
});

describe('the path-map CLI', () => {
  it('builds a proxy map from fixture files and prints it', async () => {
    const { main } = await import('../../../scripts/docs-readers/path-map.js');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'path-map-cli-'));
    writeFileSync(join(dir, 'p.md'), '# Title\n\n## Section A\n\nBody.\n');
    const report: JobReport = makeReport({
      model: OPUS,
      quotes: [makeQuote('p.md', 5)],
      verified: { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] },
    });
    const reportFile = join(dir, 'report.json');
    writeFileSync(reportFile, JSON.stringify(report));
    const writes: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((text: string) => {
      writes.push(text);
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = main(['build', '--job', 'j', '--docs-set', 'p.md', '--pages-root', dir, '--report', reportFile, '--proxy']);
      expect(code).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    const output = JSON.parse(writes.join(''));
    expect(output.mode).toBe('proxy');
    expect(output.pages['p.md'].sections.map((s: { heading: string }) => s.heading)).toEqual(['Section A']);
  });
});
