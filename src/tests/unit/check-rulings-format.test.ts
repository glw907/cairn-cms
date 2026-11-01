import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEntries, findFormatProblems } from '../../../scripts/checks/check-rulings-format.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const GOOD = [
  '## audit-good-item: `Good`  (keep, 2026-08-26, any-site audit)',
  '',
  '- **Verdict:** keep. Reason.',
  '- **Reopens on:** a second consumer needs the narrower shape.',
].join('\n');

describe('parseEntries', () => {
  it('reads the slug, the line, and whether a Reopens on: line is present', () => {
    expect(parseEntries(GOOD)).toEqual([
      { slug: 'audit-good-item', heading: GOOD.split('\n')[0], line: 1, hasReopens: true },
    ]);
  });

  it('skips a heading inside a fenced code block', () => {
    const text = ['```markdown', '## <slug>: <item>  (verdict, date, source)', '```', GOOD].join('\n');
    expect(parseEntries(text).map((e) => e.slug)).toEqual(['audit-good-item']);
  });

  it('reads a heading with no verdict as malformed', () => {
    const entries = parseEntries('## audit-bad: `Bad` without a verdict\n- **Reopens on:** never.');
    expect(entries[0].slug).toBeNull();
  });
});

describe('findFormatProblems', () => {
  it('passes a well-formed entry', () => {
    expect(findFormatProblems(parseEntries(GOOD))).toEqual([]);
  });

  it('flags a missing Reopens on: line', () => {
    const text = '## audit-open: `Open`  (decline, 2026-08-26, audit)\n\n- **Verdict:** decline.';
    expect(findFormatProblems(parseEntries(text))).toEqual([
      { kind: 'missing-reopens', line: 1, text: 'audit-open' },
    ]);
  });

  it('flags an empty Reopens on: line', () => {
    const text = '## audit-empty: `Empty`  (decline, 2026-08-26, audit)\n- **Reopens on:**   \n';
    expect(findFormatProblems(parseEntries(text))[0].kind).toBe('missing-reopens');
  });

  it('flags a duplicate slug', () => {
    const problems = findFormatProblems(parseEntries(`${GOOD}\n\n${GOOD}`));
    expect(problems.map((p) => p.kind)).toEqual(['duplicate-slug']);
  });

  it('flags a malformed heading', () => {
    const problems = findFormatProblems(parseEntries('## Not A Slug\n- **Reopens on:** never.'));
    expect(problems.map((p) => p.kind)).toEqual(['malformed-heading']);
  });
});

describe('the committed ledger', () => {
  it('has no format problem', () => {
    const text = readFileSync(join(ROOT, 'docs/internal/engine-rulings.md'), 'utf8');
    expect(findFormatProblems(parseEntries(text))).toEqual([]);
  });
});
