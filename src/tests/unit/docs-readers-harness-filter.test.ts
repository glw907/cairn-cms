import { describe, it, expect } from 'vitest';
import { filterHarnessItems, type HarnessCandidate } from '../../../scripts/docs-readers/harness-filter.js';
import type { Denial, Job } from '../../../scripts/docs-readers/lib/types.js';

const JOB: Pick<Job, 'id' | 'absent'> = { id: 'scripter', absent: ['docs/internal/record/', 'ROADMAP.md'] };

/** A Bash denial whose excerpt is the JSON `lib/transcript.ts` truncation produces. */
function bashDenial(command: string, truncateAt?: number): Denial {
  const text = JSON.stringify({ command });
  const input = truncateAt !== undefined && truncateAt < text.length ? `${text.slice(0, truncateAt)}...` : text;
  return { source: 'permission', tool: 'Bash', input };
}

describe('filterHarnessItems: the path half', () => {
  it('excludes an item whose blockedBy names a path under an absent-list directory', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'docs/internal/record/2026-09-24-x.md' }];
    const result = filterHarnessItems(items, JOB, []);
    expect(result.excluded).toEqual([{ itemId: 'i1', reason: 'absent path "docs/internal/record/2026-09-24-x.md"' }]);
    expect(result.remaining).toEqual([]);
  });

  it('excludes an item naming an absent file path exactly', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'ROADMAP.md' }];
    const result = filterHarnessItems(items, JOB, []);
    expect(result.excluded).toEqual([{ itemId: 'i1', reason: 'absent path "ROADMAP.md"' }]);
  });

  it('rejects a near miss: a path sharing a prefix with an absent directory, but not nested under it', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'docs/internal/record-extra/file.md' }];
    const result = filterHarnessItems(items, JOB, []);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
  });

  it('treats a missing blockedBy as null: never excluded, never noted', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: null }];
    const result = filterHarnessItems(items, JOB, []);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
    expect(result.adjudicatorNotes).toEqual([]);
  });

  it('treats a blockedBy key omitted entirely (as a real JSON fixture might give it) the same as null', () => {
    const items = [JSON.parse('{"itemId":"i1"}') as HarnessCandidate];
    const result = filterHarnessItems(items, JOB, []);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
  });

  it('keeps the bundle-root subfolder prefix a multi-page job like the scripter carries, never stripping it', () => {
    // The scripter's prepared tree bundles doctor/, json-output/, and exit-codes/ under one
    // root, so its absent entries (and a reader's blockedBy claim) are bundle-root relative,
    // prefix included, not repository-root relative.
    const scripterJob: Pick<Job, 'id' | 'absent'> = { id: 'scripter', absent: ['doctor/docs/reference/cli-cairn-exit-codes.md'] };
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'doctor/docs/reference/cli-cairn-exit-codes.md' }];
    const result = filterHarnessItems(items, scripterJob, []);
    expect(result.excluded).toEqual([{ itemId: 'i1', reason: 'absent path "doctor/docs/reference/cli-cairn-exit-codes.md"' }]);
  });

  it('does not match a bundle-prefixed absent entry against a claim missing the prefix', () => {
    const scripterJob: Pick<Job, 'id' | 'absent'> = { id: 'scripter', absent: ['doctor/docs/reference/cli-cairn-exit-codes.md'] };
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'docs/reference/cli-cairn-exit-codes.md' }];
    const result = filterHarnessItems(items, scripterJob, []);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
  });
});

describe('filterHarnessItems: the command half', () => {
  it('excludes an item whose blockedBy command matches a denial by first word and first argument', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'npx eslint --fix src/index.ts' }];
    const denials = [bashDenial('npx eslint --fix src/index.ts')];
    const result = filterHarnessItems(items, JOB, denials);
    expect(result.excluded).toEqual([{ itemId: 'i1', reason: 'denied command "npx eslint"' }]);
  });

  it('rejects a near miss: the same first word but a different first argument', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'npx eslint --fix' }];
    const denials = [bashDenial('npx prettier --check')];
    const result = filterHarnessItems(items, JOB, denials);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
  });

  it('a truncated excerpt still yields its first word and argument when both sit well inside the excerpt', () => {
    const longTail = 'x'.repeat(300);
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'npx eslint --fix' }];
    const denials = [bashDenial(`npx eslint --fix ${longTail}`, 40)];
    const result = filterHarnessItems(items, JOB, denials);
    expect(result.excluded).toEqual([{ itemId: 'i1', reason: 'denied command "npx eslint"' }]);
  });

  it('sends the item to the adjudicator with the reason recorded when a denial is truncated before its first argument', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: 'npx run-something-very-specific-here' }];
    // The cut lands inside the first argument itself, part way through it, never reaching a
    // delimiter that would confirm where the word actually ends.
    const denial = bashDenial('npx run-something-very-specific-here', 25);
    const result = filterHarnessItems(items, JOB, [denial]);
    expect(result.excluded).toEqual([]);
    expect(result.remaining).toEqual(['i1']);
    expect(result.adjudicatorNotes).toHaveLength(1);
    expect(result.adjudicatorNotes[0]).toMatchObject({ itemId: 'i1' });
  });
});

describe('filterHarnessItems: preconditions', () => {
  it('throws, naming the job, when the job carries no absent list', () => {
    const items: HarnessCandidate[] = [{ itemId: 'i1', blockedBy: null }];
    expect(() => filterHarnessItems(items, { id: 'scripter' }, [])).toThrow(/scripter/);
  });
});

describe('the harness-filter CLI', () => {
  it('reads a fixture file and prints the filter result', async () => {
    const { main } = await import('../../../scripts/docs-readers/harness-filter.js');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'harness-filter-cli-'));
    const file = join(dir, 'fixture.json');
    writeFileSync(file, JSON.stringify({ items: [{ itemId: 'i1', blockedBy: 'ROADMAP.md' }], job: JOB, denials: [] }));
    const writes: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((text: string) => {
      writes.push(text);
      return true;
    }) as typeof process.stdout.write;
    try {
      const code = main([file]);
      expect(code).toBe(0);
    } finally {
      process.stdout.write = original;
    }
    const output = JSON.parse(writes.join(''));
    expect(output.excluded).toEqual([{ itemId: 'i1', reason: 'absent path "ROADMAP.md"' }]);
  });
});
