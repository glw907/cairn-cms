import { describe, it, expect } from 'vitest';
import {
  parseEntries,
  slugsWithShapeParenthetical,
  findFormatProblems,
} from '../../../scripts/checks/check-rulings-format.mjs';

// A minimal two-entry ledger slice: `migrated` carries the sanctioned `- **Shape:**` line, `raw`
// carries the label a repair round names for its `reopens` line.
function ledger(rawReopens: string) {
  return [
    '## audit-migrated-item: `Migrated`  (reshape, 2026-08-26, any-site audit)',
    '',
    '- **Verdict:** reshape. Reason.',
    '- **Reopens on:** open until executed; the remediation pass closes it.',
    '- **Shape:** Already migrated, one complete sentence.',
    '- **Record:** [rank.md](record/rank.md), rank 1.',
    '',
    '## audit-raw-item: `Raw`  (reshape, 2026-08-26, any-site audit)',
    '',
    '- **Verdict:** reshape. Reason.',
    `- **Reopens on:** ${rawReopens}`,
    '- **Record:** [rank.md](record/rank.md), rank 2.',
  ].join('\n');
}

describe('parseEntries', () => {
  it('reads the slug and the full Reopens on: text for each entry', () => {
    const entries = parseEntries(ledger('open until executed (shape: truncated tex).'));
    expect(entries).toEqual([
      { slug: 'audit-migrated-item', reopens: '- **Reopens on:** open until executed; the remediation pass closes it.' },
      { slug: 'audit-raw-item', reopens: '- **Reopens on:** open until executed (shape: truncated tex).' },
    ]);
  });

  it('folds a wrapped continuation line into the same Reopens on: text', () => {
    const text = [
      '## audit-wrapped: `Wrapped`  (defer, 2026-08-27, some pass)',
      '',
      '- **Reopens on:** the evidence that would qualify, spread across a line the ledger',
      '  wraps rather than repeating the label.',
      '- **Record:** [x.md](x.md).',
    ].join('\n');
    const [entry] = parseEntries(text);
    expect(entry.reopens).toBe(
      '- **Reopens on:** the evidence that would qualify, spread across a line the ledger wraps rather than repeating the label.',
    );
  });
});

describe('slugsWithShapeParenthetical', () => {
  it('names only the entries whose Reopens on: line still carries (shape:', () => {
    const entries = parseEntries(ledger('open until executed (shape: truncated tex).'));
    expect(slugsWithShapeParenthetical(entries)).toEqual(['audit-raw-item']);
  });
});

describe('findFormatProblems', () => {
  it('passes when every (shape: slug is allowlisted and every allowlisted slug still needs it', () => {
    const entries = parseEntries(ledger('open until executed (shape: truncated tex).'));
    expect(findFormatProblems(entries, ['audit-raw-item'])).toEqual([]);
  });

  // Falsifiability (a): a (shape: parenthetical on a non-allowlisted entry fails as unmigrated.
  it('fails a (shape: parenthetical whose slug is not on the allowlist', () => {
    const entries = parseEntries(ledger('open until executed (shape: truncated tex).'));
    expect(findFormatProblems(entries, [])).toEqual([{ kind: 'unmigrated', slug: 'audit-raw-item' }]);
  });

  // Falsifiability (b): an allowlisted slug whose (shape: parenthetical was removed (migrated or
  // simply deleted) without dropping the allowlist entry fails as stale, so the list cannot rot.
  it('fails an allowlisted slug that no longer carries (shape:', () => {
    const entries = parseEntries(ledger('open until executed; the remediation pass closes it.'));
    expect(findFormatProblems(entries, ['audit-raw-item'])).toEqual([
      { kind: 'stale-allowlist', slug: 'audit-raw-item' },
    ]);
  });

  it('passes a sanctioned "- **Shape:**" line with no (shape: parenthetical anywhere', () => {
    const entries = parseEntries(ledger('open until executed; the remediation pass closes it.'));
    expect(findFormatProblems(entries, [])).toEqual([]);
  });
});
