import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findOffGrammarLines,
  isActionable,
  compareBaseline,
} from '../../../scripts/checks/check-consumers-must.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cases: { name: string; section: string; valid: boolean; actionable: boolean }[] = JSON.parse(
  readFileSync(join(ROOT, 'scripts/checks/fixtures/consumers-must/cases.json'), 'utf8'),
);

describe('consumers-must grammar cases', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(findOffGrammarLines(c.section).length === 0).toBe(c.valid);
      expect(isActionable(c.section)).toBe(c.actionable);
    });
  }
});

describe('compareBaseline', () => {
  const mk = (text: string, line = 1) => ({ line, text, reason: 'r' });
  const jam = '  Consumers must: nothing.';

  it('passes when the lines equal the baseline', () => {
    expect(compareBaseline([mk(jam, 3), mk(jam, 9)], [jam, jam])).toEqual({ added: [], stale: [] });
  });
  it('fails a new line the baseline does not hold', () => {
    const r = compareBaseline([mk('**Consumers must:** x')], []);
    expect(r.added).toHaveLength(1);
    expect(r.stale).toEqual([]);
  });
  it('fails a third copy of a line the baseline holds twice', () => {
    const r = compareBaseline([mk(jam, 1), mk(jam, 5), mk(jam, 9)], [jam, jam]);
    expect(r.added.map((l) => l.line)).toEqual([9]);
    expect(r.stale).toEqual([]);
  });
  it('fails a stale baseline entry', () => {
    const r = compareBaseline([], ['gone']);
    expect(r.added).toEqual([]);
    expect(r.stale).toEqual(['gone']);
  });
});
