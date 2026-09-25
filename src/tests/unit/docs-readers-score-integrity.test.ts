import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, hashFile } from '../../../scripts/docs-readers/lib/chain.js';
import { checkDevelopmentBatch, checkGatedStamp, verifyGatedChain } from '../../../scripts/docs-readers/lib/score-integrity.js';

describe('checkDevelopmentBatch', () => {
  it('allows every known development batch name', () => {
    for (const name of ['validation', 'validation-rerun', 'baseline', 'baseline-rerun', 'round1']) {
      expect(checkDevelopmentBatch(name).ok).toBe(true);
    }
  });

  it('refuses a test-set batch, naming it', () => {
    const result = checkDevelopmentBatch('test-set');
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('"test-set"');
  });
});

describe('checkGatedStamp', () => {
  const manifestTag = 'docs-reset-1b-freeze';
  const manifestHash = 'abc123';

  it('refuses an unstamped report, naming it', () => {
    const result = checkGatedStamp({ label: 'report.json (job x)' }, manifestTag, manifestHash);
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('report.json (job x)');
    expect(result.problem).toContain('unstamped');
  });

  it('refuses a report stamped against a stale manifestHash, naming the report', () => {
    const result = checkGatedStamp(
      { label: 'results/report.json', freeze: { tag: manifestTag, manifestHash: 'stale-hash', chainHead: 'h' } },
      manifestTag,
      manifestHash,
    );
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('results/report.json');
    expect(result.problem).toContain('stale-hash');
  });

  it('refuses a report stamped for a different tag', () => {
    const result = checkGatedStamp({ label: 'r.json', freeze: { tag: 'other-tag', manifestHash, chainHead: 'h' } }, manifestTag, manifestHash);
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('other-tag');
  });

  it('accepts a report whose stamp matches the manifest', () => {
    const result = checkGatedStamp({ label: 'r.json', freeze: { tag: manifestTag, manifestHash, chainHead: 'h' } }, manifestTag, manifestHash);
    expect(result.ok).toBe(true);
  });
});

describe('verifyGatedChain', () => {
  let dir: string;
  let chainFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'docs-readers-score-integrity-'));
    chainFile = join(dir, 'chain.jsonl');
  });

  it('refuses and names an artifact changed after its chain entry', () => {
    const plantsPath = join(dir, 'plants.json');
    writeFileSync(plantsPath, '[{"id":"T01"}]');
    appendEntry(chainFile, { path: 'plants.json', sha256: hashFile(plantsPath), commit: 'c1' });
    const headAfterChaining = hashFile(chainFile);
    // The plant record changes after it was chained: the file on disk no longer matches its entry.
    writeFileSync(plantsPath, '[{"id":"T01","line":99}]');
    const result = verifyGatedChain({
      chainFile,
      root: dir,
      checks: [{ label: 'report.json (job x)', chainHead: headAfterChaining, dependsOn: ['plants.json'] }],
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('plants.json'))).toBe(true);
  });

  it('passes when every chained artifact matches its latest entry and no dependency postdates the report', () => {
    const thresholdsPath = join(dir, 'thresholds.json');
    writeFileSync(thresholdsPath, '{"pooled":{"threshold":31}}');
    appendEntry(chainFile, { path: 'thresholds.json', sha256: hashFile(thresholdsPath), commit: 'c1' });
    const headAfterThresholds = hashFile(chainFile);
    const result = verifyGatedChain({
      chainFile,
      root: dir,
      checks: [{ label: 'report.json (job x)', chainHead: headAfterThresholds, dependsOn: ['thresholds.json'] }],
    });
    expect(result.ok).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it('refuses when a dependency was chained after the report\'s own chain head', () => {
    const mapPath = join(dir, 'map.json');
    writeFileSync(mapPath, '{"job":"evaluator"}');
    appendEntry(chainFile, { path: 'manifest.json', sha256: 'x'.repeat(64), commit: 'c0' });
    const headAtGateTime = hashFile(chainFile);
    // The map is chained only after the report's own chain head was taken (a later resume, or a
    // step the report never actually saw).
    appendEntry(chainFile, { path: 'map.json', sha256: hashFile(mapPath), commit: 'c1' });
    const result = verifyGatedChain({
      chainFile,
      root: dir,
      checks: [{ label: 'report.json (job evaluator)', chainHead: headAtGateTime, dependsOn: ['map.json'] }],
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('map.json') && p.includes('postdates'))).toBe(true);
  });

  it('refuses a chain head that matches no prefix of the chain', () => {
    appendEntry(chainFile, { path: 'manifest.json', sha256: 'x'.repeat(64), commit: 'c0' });
    const result = verifyGatedChain({ chainFile, root: dir, checks: [{ label: 'r.json', chainHead: 'not-a-real-head', dependsOn: [] }] });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('r.json') && p.includes('chain head'))).toBe(true);
  });
});
