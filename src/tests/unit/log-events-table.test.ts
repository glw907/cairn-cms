// The log-event vocabulary is public-observable API (see src/lib/log/events.ts's own header), so
// the reference table is the contract, not a description of it: a name added to the union with no
// matching row, or a stale row for a name no longer in the union, is a silent doc drift the R6
// rename table exists to close. This test parses both sources directly (the union is a plain
// string-literal type in an untranspiled .ts file, so a regex is simpler and more legible here
// than spinning up the TypeScript compiler the reference-coverage gates use for a built .d.ts).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

/** Every event name in `CairnLogEvent`'s union, parsed from the source's `| 'name'` arms. */
function unionEventNames(): string[] {
  const source = readFileSync(resolve(ROOT, 'src/lib/log/events.ts'), 'utf-8');
  return [...source.matchAll(/^\s*\|\s*'([^']+)'/gm)].map((m) => m[1]).sort();
}

/** Every event name documented as a table row's first cell in the log-events reference page. */
function tableEventNames(): string[] {
  const doc = readFileSync(resolve(ROOT, 'docs/reference/log-events.md'), 'utf-8');
  return [...doc.matchAll(/^\|\s*`([a-z][a-z0-9_.]*)`\s*\|/gm)].map((m) => m[1]).sort();
}

describe('the log-event vocabulary matches its reference table 1:1', () => {
  it('documents every event the union declares, and declares no event the table does not', () => {
    const union = unionEventNames();
    const table = tableEventNames();
    expect(union.length).toBeGreaterThan(0);
    expect(table).toEqual(union);
  });
});
