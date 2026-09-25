import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyQuote, verifyReport } from '../../../scripts/docs-readers/lib/verify.js';
import { derivePagesRead, effectiveCwd, grepHitPages, parseStream, readerReport, toolCalls } from '../../../scripts/docs-readers/lib/transcript.js';
import type { ToolCall } from '../../../scripts/docs-readers/lib/types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED = join(ROOT, 'scripts/docs-readers/fixtures/prepared');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/transcripts');
const passingInit = { ok: true, problems: [] };

/** Verify a fixture transcript the way the runner does. */
function verifyFixture(name: string) {
  const { events } = parseStream(readFileSync(join(FIXTURES, name), 'utf8'));
  const pagesRead = derivePagesRead(toolCalls(events), ['docs']);
  return verifyReport({ report: readerReport(events), pagesRead, docsSet: ['docs'], root: PREPARED, init: passingInit, canariesFound: [] });
}

describe('verifyQuote', () => {
  it('accepts a quote on its cited line, by relative or reader-absolute path', () => {
    expect(verifyQuote({ path: 'docs/guide.md', line: 3, text: 'Install the tool' }, PREPARED).ok).toBe(true);
    expect(verifyQuote({ path: '/reader/job/docs/other.md', line: 3, text: 'Change the settings file here.' }, PREPARED)).toMatchObject({
      path: 'docs/other.md',
      ok: true,
    });
  });

  it('accepts a sentence that starts on the cited line and wraps onto the next', () => {
    const quote = { path: 'docs/guide.md', line: 7, text: 'This sentence wraps onto the next line of the source.' };
    expect(verifyQuote(quote, PREPARED).ok).toBe(true);
  });

  it('accepts a quote cited one line after its real text', () => {
    // The real text sits on line 3; citing line 4 (one line after) is within the one-line
    // tolerance, so this now passes rather than naming the line it is really on.
    expect(verifyQuote({ path: 'docs/guide.md', line: 4, text: 'Install the tool before you begin.' }, PREPARED)).toMatchObject({
      path: 'docs/guide.md',
      ok: true,
    });
  });

  it('accepts a quote cited one line before its real text', () => {
    // The real text sits on line 3; citing line 2 (one line before) is within the same tolerance.
    expect(verifyQuote({ path: 'docs/guide.md', line: 2, text: 'Install the tool' }, PREPARED)).toMatchObject({
      path: 'docs/guide.md',
      ok: true,
    });
  });

  it('refuses a quote cited two lines off, naming the line it is really on', () => {
    // Two lines is past the one-line tolerance in either direction, so both still fail.
    expect(verifyQuote({ path: 'docs/guide.md', line: 5, text: 'Install the tool before you begin.' }, PREPARED)).toMatchObject({
      ok: false,
      reason: 'text starts on line 3, not 5',
    });
    expect(verifyQuote({ path: 'docs/guide.md', line: 1, text: 'Install the tool' }, PREPARED)).toMatchObject({
      ok: false,
      reason: 'text starts on line 3, not 1',
    });
  });

  it('refuses invented text, a missing file, a path outside the directory, and an empty quote', () => {
    const reasons = [
      { path: 'docs/guide.md', line: 3, text: 'Uninstall everything.' },
      { path: 'docs/absent.md', line: 1, text: 'x' },
      { path: '/etc/passwd', line: 1, text: 'root' },
      { path: '../outside.md', line: 1, text: 'x' },
      { path: 'docs/guide.md', line: 3, text: '   ' },
      { path: 'docs/guide.md', line: 0, text: 'x' },
    ].map((q) => verifyQuote(q, PREPARED).reason);
    expect(reasons).toEqual([
      'text not found in the file',
      'file does not exist',
      'path is outside the reader directory',
      'path is outside the reader directory',
      'quote text is empty',
      'line is not a positive integer',
    ]);
  });

  it('accepts a quote cited on the line a wrapped sentence continues onto, not only the line it starts on', () => {
    const quote = { path: 'docs/guide.md', line: 8, text: 'This sentence wraps onto the next line of the source.' };
    expect(verifyQuote(quote, PREPARED).ok).toBe(true);
  });

  it('refuses a quote whose text never reaches the cited line at all, a 7-line miss', () => {
    const quote = { path: 'docs/guide.md', line: 8, text: '# Guide' };
    expect(verifyQuote(quote, PREPARED)).toMatchObject({ ok: false, reason: 'text starts on line 1, not 8' });
  });

  it('resolves a relative quote path against a given cwd, falling back to READER_CWD when omitted', () => {
    expect(verifyQuote({ path: '../docs/other.md', line: 3, text: 'Change the settings file here.' }, PREPARED, '/reader/job/docs')).toMatchObject({
      path: 'docs/other.md',
      ok: true,
    });
    // The same relative path, with no cwd given, resolves against READER_CWD itself and climbs out.
    expect(verifyQuote({ path: '../docs/other.md', line: 3, text: 'Change the settings file here.' }, PREPARED)).toMatchObject({
      ok: false,
      reason: 'path is outside the reader directory',
    });
  });
});

describe('verifyReport against fixture transcripts', () => {
  it('verifies a report whose every read page carries a verified quote', () => {
    expect(verifyFixture('clean-docs-only.jsonl')).toMatchObject({ ok: true, problems: [] });
  });

  it('fails a report with no quote', () => {
    expect(verifyFixture('unverified-no-quote.jsonl')).toMatchObject({ ok: false, problems: ['report has no quote'] });
  });

  it('fails a report whose quote is two lines off its cited line, past the one-line tolerance', () => {
    const verified = verifyFixture('unverified-wrong-line.jsonl');
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['quote docs/guide.md:5 unverified: text starts on line 3, not 5']);
  });

  it('verifies a report quote given relative to a cwd the reader cd’d into (designer-1’s shape)', () => {
    const buildCalls: ToolCall[] = [{ id: 't1', name: 'Bash', input: { command: 'cd site && npm run build' }, result: { isError: false, text: '' } }];
    const cwd = effectiveCwd(buildCalls);
    expect(cwd).toBe('/reader/job/site');
    const verified = verifyReport({
      report: {
        outcome: 'done',
        stalls: [],
        assumed: [],
        quotes: [{ path: '../docs/guide.md', line: 3, text: 'Install the tool before you begin.' }],
        ruleCandidates: [],
        steps: [],
        diverged: [],
        wrong: [],
        missing: [],
      },
      pagesRead: ['docs/guide.md'],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      cwd,
    });
    expect(verified).toMatchObject({ ok: true, problems: [] });
  });

  it('fails a report that read a page it never quoted', () => {
    const verified = verifyFixture('unverified-page-unquoted.jsonl');
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['page docs/other.md was read but carries no verified quote']);
  });

  it('fails a report that quotes a page it never read, though the quote itself verifies', () => {
    const verified = verifyFixture('unverified-quote-unread.jsonl');
    expect(verified.ok).toBe(false);
    expect(verified.quotes.every((q) => q.ok)).toBe(true);
    expect(verified.problems).toEqual(['quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('excuses a quoted page whose exact line only ever surfaced through a broadly-scoped Grep hit, from "never shows read"', () => {
    const verified = verifyReport({
      report: {
        outcome: 'done',
        stalls: [],
        assumed: [],
        quotes: [
          { path: 'docs/guide.md', line: 3, text: 'Install the tool before you begin.' },
          { path: 'docs/other.md', line: 3, text: 'Change the settings file here.' },
        ],
        ruleCandidates: [],
        steps: [],
        diverged: [],
        wrong: [],
        missing: [],
      },
      pagesRead: ['docs/guide.md'],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      grepHits: new Set(['docs/other.md:3']),
    });
    expect(verified).toMatchObject({ ok: true, problems: [] });
  });

  it('does not excuse a quote from a distant line, when the Grep hit surfaced a different line of the same page', () => {
    // A hit on line 1 of docs/other.md must not excuse a quote of line 3 on the very same page:
    // the overlap check runs line by line, never at the whole-page grain.
    const verified = verifyReport({
      report: { outcome: 'done', stalls: [], assumed: [], quotes: [{ path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }], ruleCandidates: [], steps: [], diverged: [], wrong: [], missing: [] },
      pagesRead: [],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      grepHits: new Set(['docs/other.md:1']),
    });
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('excuses a quote whose line surfaced only as a Grep context line, not a hit line itself', () => {
    // -A/-B/-C print a context line dash-separated (path-N-content) rather than colon-separated;
    // grepHitPages keys it the same way as a hit line, so it excuses a quote on it just the same.
    const contextOnly = { id: 't', name: 'Grep', input: { pattern: 'x', output_mode: 'content', path: '/reader/job/docs' }, result: { isError: false, text: 'docs/other.md-3-Change the settings file here.' } };
    const grepHits = grepHitPages([contextOnly], ['docs']);
    const verified = verifyReport({
      report: { outcome: 'done', stalls: [], assumed: [], quotes: [{ path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }], ruleCandidates: [], steps: [], diverged: [], wrong: [], missing: [] },
      pagesRead: [],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      grepHits,
    });
    expect(verified).toMatchObject({ ok: true, problems: [] });
  });

  it('does not force a page a broadly-scoped Grep only surfaced, but the report never quoted, to carry a quote', () => {
    const verified = verifyReport({
      report: { outcome: 'done', stalls: [], assumed: [], quotes: [{ path: 'docs/guide.md', line: 3, text: 'Install the tool before you begin.' }], ruleCandidates: [], steps: [], diverged: [], wrong: [], missing: [] },
      pagesRead: ['docs/guide.md'],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      grepHits: new Set(['docs/other.md:1']),
    });
    expect(verified).toMatchObject({ ok: true, problems: [] });
  });

  it('does not excuse an unverified quote just because its page appeared in a Grep hit', () => {
    const verified = verifyReport({
      report: { outcome: 'done', stalls: [], assumed: [], quotes: [{ path: 'docs/other.md', line: 3, text: 'Invented text.' }], ruleCandidates: [], steps: [], diverged: [], wrong: [], missing: [] },
      pagesRead: [],
      docsSet: ['docs'],
      root: PREPARED,
      init: passingInit,
      canariesFound: [],
      grepHits: new Set(['docs/other.md:3']),
    });
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['quote docs/other.md:3 unverified: text not found in the file']);
  });

  it('fails on a missing report, a failed init check, or a loaded canary', () => {
    const verified = verifyReport({
      report: undefined,
      pagesRead: [],
      docsSet: ['docs'],
      root: PREPARED,
      init: { ok: false, problems: ['apiKeySource is "ANTHROPIC_API_KEY", not "none"'] },
      canariesFound: ['canary-1'],
    });
    expect(verified).toMatchObject({ ok: false, init: false, canaries: false });
    expect(verified.problems).toEqual([
      'init: apiKeySource is "ANTHROPIC_API_KEY", not "none"',
      'canary loaded: 1 canary string(s) in the transcript',
      'no structured report',
    ]);
  });
});

describe('verifyReport: steps, diverged, wrong, and missing quotes', () => {
  const cleanQuote = { path: 'docs/guide.md', line: 3, text: 'Install the tool before you begin.' };
  const baseReport = { outcome: 'done' as const, stalls: [], assumed: [], quotes: [cleanQuote], ruleCandidates: [], steps: [], diverged: [], wrong: [], missing: [] };
  const baseArgs = { pagesRead: ['docs/guide.md'], docsSet: ['docs'], root: PREPARED, init: passingInit, canariesFound: [] };

  it('verifies a steps[] quote cited one line off, the same tolerance a top-level quote gets', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        steps: [{ quote: { path: 'docs/guide.md', line: 4, text: 'Install the tool before you begin.' }, decision: 'installed first' }],
        diverged: [],
      },
      ...baseArgs,
    });
    expect(verified.steps[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(true);
    expect(verified.problems).toEqual([]);
  });

  it('fails the run when a steps[] quote is two lines off, past the one-line tolerance', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        steps: [{ quote: { path: 'docs/guide.md', line: 5, text: 'Install the tool before you begin.' }, decision: 'installed first' }],
        diverged: [],
      },
      ...baseArgs,
    });
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['step quote docs/guide.md:5 unverified: text starts on line 3, not 5']);
  });

  it('verifies a diverged[] quote cited one line off, and fails the run two lines off', () => {
    const oneOff = verifyReport({
      report: {
        ...baseReport,
        steps: [],
        diverged: [{ quote: { path: 'docs/guide.md', line: 2, text: 'Install the tool' }, didInstead: 'skipped ahead', why: 'not covered', blockedBy: null }],
      },
      ...baseArgs,
    });
    expect(oneOff.diverged[0].quote.ok).toBe(true);
    expect(oneOff.ok).toBe(true);

    const twoOff = verifyReport({
      report: {
        ...baseReport,
        steps: [],
        diverged: [{ quote: { path: 'docs/guide.md', line: 1, text: 'Install the tool' }, didInstead: 'skipped ahead', why: 'not covered', blockedBy: null }],
      },
      ...baseArgs,
    });
    expect(twoOff.ok).toBe(false);
    expect(twoOff.problems).toEqual(['diverged quote docs/guide.md:1 unverified: text starts on line 3, not 1']);
  });

  it('fails the run when a steps[] quote verifies but cites a docs-set page the transcript never shows read', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        steps: [{ quote: { path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }, decision: 'used the settings page' }],
        diverged: [],
      },
      ...baseArgs,
    });
    expect(verified.steps[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['step quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('fails the run when a diverged[] quote verifies but cites a docs-set page the transcript never shows read', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        steps: [],
        diverged: [{ quote: { path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }, didInstead: 'skipped ahead', why: 'not covered', blockedBy: null }],
      },
      ...baseArgs,
    });
    expect(verified.diverged[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['diverged quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('verifies a wrong[] quote cited one line off, and fails the run two lines off', () => {
    const oneOff = verifyReport({
      report: {
        ...baseReport,
        wrong: [{ quote: { path: 'docs/guide.md', line: 2, text: 'Install the tool' }, pageSays: 'install after configuring', actual: 'install before configuring', evidence: 'the page states the opposite order' }],
      },
      ...baseArgs,
    });
    expect(oneOff.wrong[0].quote.ok).toBe(true);
    expect(oneOff.ok).toBe(true);

    const twoOff = verifyReport({
      report: {
        ...baseReport,
        wrong: [{ quote: { path: 'docs/guide.md', line: 1, text: 'Install the tool' }, pageSays: 'install after configuring', actual: 'install before configuring', evidence: 'the page states the opposite order' }],
      },
      ...baseArgs,
    });
    expect(twoOff.ok).toBe(false);
    expect(twoOff.problems).toEqual(['wrong quote docs/guide.md:1 unverified: text starts on line 3, not 1']);
  });

  it('fails the run when a wrong[] quote verifies but cites a docs-set page the transcript never shows read', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        wrong: [{ quote: { path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }, pageSays: 'the settings file lives elsewhere', actual: 'the settings file is here', evidence: 'the page names this file' }],
      },
      ...baseArgs,
    });
    expect(verified.wrong[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['wrong quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('verifies a missing[] quote cited one line off, and fails the run two lines off', () => {
    const oneOff = verifyReport({
      report: {
        ...baseReport,
        missing: [{ quote: { path: 'docs/guide.md', line: 2, text: 'Install the tool' }, needed: 'a note on the config file location', evidence: 'the job needed the config path and had to guess it' }],
      },
      ...baseArgs,
    });
    expect(oneOff.missing[0].quote.ok).toBe(true);
    expect(oneOff.ok).toBe(true);

    const twoOff = verifyReport({
      report: {
        ...baseReport,
        missing: [{ quote: { path: 'docs/guide.md', line: 1, text: 'Install the tool' }, needed: 'a note on the config file location', evidence: 'the job needed the config path and had to guess it' }],
      },
      ...baseArgs,
    });
    expect(twoOff.ok).toBe(false);
    expect(twoOff.problems).toEqual(['missing quote docs/guide.md:1 unverified: text starts on line 3, not 1']);
  });

  it('fails the run when a missing[] quote verifies but cites a docs-set page the transcript never shows read', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        missing: [{ quote: { path: 'docs/other.md', line: 3, text: 'Change the settings file here.' }, needed: 'the settings file path', evidence: 'the job needed it and never found it' }],
      },
      ...baseArgs,
    });
    expect(verified.missing[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['missing quote docs/other.md:3 cites a page the transcript never shows read']);
  });

  it('parses and verifies a report carrying one wrong[] entry and one missing[] entry', () => {
    const verified = verifyReport({
      report: {
        ...baseReport,
        wrong: [{ quote: cleanQuote, pageSays: 'install after configuring', actual: 'install before configuring', evidence: 'the page states the opposite order' }],
        missing: [{ quote: cleanQuote, needed: 'a note on the config file location', evidence: 'the job needed the config path and had to guess it' }],
      },
      ...baseArgs,
    });
    expect(verified.wrong).toHaveLength(1);
    expect(verified.missing).toHaveLength(1);
    expect(verified.wrong[0].quote.ok).toBe(true);
    expect(verified.missing[0].quote.ok).toBe(true);
    expect(verified.ok).toBe(true);
    expect(verified.problems).toEqual([]);
  });
});
