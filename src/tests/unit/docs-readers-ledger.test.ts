import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendLedger, countedTokens, ledgerTotal, readLedger } from '../../../scripts/docs-readers/lib/ledger.js';

const usage = (input: number, output: number, cacheCreation: number, cacheRead: number) => ({
  input,
  output,
  cacheCreation,
  cacheRead,
});

describe('the ledger counting rule', () => {
  it('counts input, output, and cache creation, and never cache reads', () => {
    expect(countedTokens(usage(10, 200, 3000, 900000))).toBe(3210);
  });

  it('totals appended runs, keeping cache reads apart from the counted figure', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'));
    try {
      const file = join(dir, 'nested', 'ledger.jsonl');
      appendLedger(file, { batch: 'b', runId: 'r', job: '(token-check)', model: 'token-check', usage: usage(3000, 5, 0, 0) });
      appendLedger(file, { batch: 'b', runId: 'r', job: 'j1', model: 'claude-opus-5-5', usage: usage(4, 1800, 6000, 4600) });
      appendLedger(file, { batch: 'b', runId: 'r', job: 'j2', model: 'claude-opus-5-5', usage: usage(16, 4700, 18000, 46000) });
      const entries = readLedger(file);
      expect(entries.map((e) => e.counted)).toEqual([3005, 7804, 22716]);
      expect(ledgerTotal(entries)).toEqual({
        input: 3020,
        output: 6505,
        cacheCreation: 24000,
        cacheRead: 50600,
        counted: 33525,
        runs: 3,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a missing ledger as empty', () => {
    expect(readLedger('/nonexistent/ledger.jsonl')).toEqual([]);
    expect(ledgerTotal([])).toMatchObject({ counted: 0, cacheRead: 0, runs: 0 });
  });
});
