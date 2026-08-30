import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseEntries,
  slugsWithShapeParenthetical,
  findFormatProblems,
  slugsWithShapeLine,
  findExitRatchetProblems,
  ORIGINAL_TRUNCATED_SLUGS,
} from '../../../scripts/checks/check-rulings-format.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

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

describe('slugsWithShapeLine', () => {
  it('finds a slug carrying a "- **Shape:**" line', () => {
    const text = [
      '## audit-x: `X`  (reshape, 2026-08-26, any-site audit)',
      '',
      '- **Reopens on:** open until executed; the remediation pass closes it.',
      '- **Shape:** One complete sentence.',
    ].join('\n');
    expect(slugsWithShapeLine(text)).toEqual(new Set(['audit-x']));
  });

  it('finds a slug carrying the shape-needs-rederivation marker instead', () => {
    const text = [
      '## audit-x: `X`  (reshape, 2026-08-26, any-site audit)',
      '',
      '- **Reopens on:** open until executed; shape-needs-rederivation.',
    ].join('\n');
    expect(slugsWithShapeLine(text)).toEqual(new Set(['audit-x']));
  });

  it('omits a slug carrying neither', () => {
    const text = [
      '## audit-x: `X`  (reshape, 2026-08-26, any-site audit)',
      '',
      '- **Reopens on:** open until executed; the remediation pass closes it.',
    ].join('\n');
    expect(slugsWithShapeLine(text)).toEqual(new Set());
  });
});

describe('findExitRatchetProblems', () => {
  // Uses a real slug from the fixed 54-slug population so the falsifiable case is the one this
  // gate actually guards, not a stand-in name that could drift from the population it checks.
  // `restOfPopulation` allowlists every other member so the assertion isolates this one slug: the
  // other 53 are exempt from the ratchet (still tracked by findFormatProblems) regardless of
  // whether the synthetic `text` happens to mention them.
  const [leftAllowlist] = ORIGINAL_TRUNCATED_SLUGS;
  const restOfPopulation = ORIGINAL_TRUNCATED_SLUGS.filter((slug) => slug !== leftAllowlist);

  it('passes when a slug that left the allowlist carries a "- **Shape:**" line', () => {
    const text = [
      `## ${leftAllowlist}: \`X\`  (reshape, 2026-08-26, any-site audit)`,
      '',
      '- **Reopens on:** open until executed; the remediation pass closes it.',
      '- **Shape:** One complete sentence.',
    ].join('\n');
    expect(findExitRatchetProblems(text, restOfPopulation)).toEqual([]);
  });

  it('passes when a slug still on the allowlist carries no shape line', () => {
    const text = [`## ${leftAllowlist}: \`X\`  (reshape, 2026-08-26, any-site audit)`, ''].join(
      '\n',
    );
    expect(findExitRatchetProblems(text, ORIGINAL_TRUNCATED_SLUGS)).toEqual([]);
  });

  // Falsifiability: a slug that left the allowlist by having its shape text deleted outright,
  // rather than migrated, must fail even though findFormatProblems alone would call it clean (no
  // raw "(shape:" parenthetical remains for it to flag).
  it('fails a slug that left the allowlist with its shape deleted rather than migrated', () => {
    const text = [
      `## ${leftAllowlist}: \`X\`  (reshape, 2026-08-26, any-site audit)`,
      '',
      '- **Reopens on:** open until executed; the remediation pass closes it.',
    ].join('\n');
    const entries = parseEntries(text);
    expect(findFormatProblems(entries, [])).toEqual([]);
    expect(findExitRatchetProblems(text, restOfPopulation)).toEqual([
      { kind: 'missing-shape', slug: leftAllowlist },
    ]);
  });

  it('the real ledger satisfies the ratchet for every slug in the fixed population', () => {
    const text = readFileSync(join(ROOT, 'docs/internal/engine-rulings.md'), 'utf8');
    const allowlist = JSON.parse(
      readFileSync(join(ROOT, 'scripts/checks/check-rulings-format-allowlist.json'), 'utf8'),
    ) as string[];
    expect(findExitRatchetProblems(text, allowlist)).toEqual([]);
  });
});
