import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyQuote, verifyReport } from '../../../scripts/docs-readers/lib/verify.js';
import { derivePagesRead, parseStream, readerReport, toolCalls } from '../../../scripts/docs-readers/lib/transcript.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PREPARED = join(ROOT, 'scripts/docs-readers/fixtures/prepared');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/transcripts');
const passingInit = { ok: true, problems: [] };

/** Verify a fixture transcript the way the runner does. */
function verifyFixture(name: string) {
  const { events } = parseStream(readFileSync(join(FIXTURES, name), 'utf8'));
  const pagesRead = derivePagesRead(toolCalls(events), ['docs']);
  return verifyReport({ report: readerReport(events), pagesRead, root: PREPARED, init: passingInit, canariesFound: [] });
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

  it('refuses a quote cited one line off, naming the line it is really on', () => {
    expect(verifyQuote({ path: 'docs/guide.md', line: 4, text: 'Install the tool before you begin.' }, PREPARED)).toMatchObject({
      ok: false,
      reason: 'text starts on line 3, not 4',
    });
    // Starting on the line before the text does not pass either, although the window would reach it.
    expect(verifyQuote({ path: 'docs/guide.md', line: 2, text: 'Install the tool' }, PREPARED).ok).toBe(false);
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
});

describe('verifyReport against fixture transcripts', () => {
  it('verifies a report whose every read page carries a verified quote', () => {
    expect(verifyFixture('clean-docs-only.jsonl')).toMatchObject({ ok: true, problems: [] });
  });

  it('fails a report with no quote', () => {
    expect(verifyFixture('unverified-no-quote.jsonl')).toMatchObject({ ok: false, problems: ['report has no quote'] });
  });

  it('fails a report whose quote is not at its path:line', () => {
    const verified = verifyFixture('unverified-wrong-line.jsonl');
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['quote docs/guide.md:4 unverified: text starts on line 3, not 4']);
  });

  it('fails a report that read a page it never quoted', () => {
    const verified = verifyFixture('unverified-page-unquoted.jsonl');
    expect(verified.ok).toBe(false);
    expect(verified.problems).toEqual(['page docs/other.md was read but carries no verified quote']);
  });

  it('fails on a missing report, a failed init check, or a loaded canary', () => {
    const verified = verifyReport({
      report: undefined,
      pagesRead: [],
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
