import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { appendEntry, hashFile } from '../../../scripts/docs-readers/lib/chain.js';
import {
  checkDevelopmentBatch,
  checkGatedStamp,
  checkManifestIsGenesis,
  checkReportComplete,
  verifyGatedChain,
} from '../../../scripts/docs-readers/lib/score-integrity.js';

describe('checkDevelopmentBatch', () => {
  it('allows every known development batch name, with no job stamped', () => {
    for (const name of ['validation', 'validation-rerun', 'round1']) {
      expect(checkDevelopmentBatch({ batch: name, jobs: [{ id: 'evaluator-planted-1' }] }).ok).toBe(true);
    }
  });

  it('refuses a test-set batch, naming it', () => {
    const result = checkDevelopmentBatch({ batch: 'test-set', jobs: [] });
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('"test-set"');
  });

  it('no longer treats pass 1\'s baseline batches as development batches', () => {
    for (const name of ['baseline', 'baseline-rerun']) {
      expect(checkDevelopmentBatch({ batch: name, jobs: [] }).ok).toBe(false);
    }
  });

  it('refuses a round1 report whose job carries a freeze stamp, naming the job', () => {
    const result = checkDevelopmentBatch({
      batch: 'round1',
      jobs: [{ id: 'evaluator-planted-1' }, { id: 'evaluator-planted-2', freeze: { tag: 't', manifestHash: 'h', chainHead: 'c' } }],
    });
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('evaluator-planted-2');
    expect(result.problem).toContain('freeze stamp');
  });
});

describe('checkReportComplete', () => {
  it('passes a complete report with no stopped job', () => {
    const result = checkReportComplete({ label: 'r.json', stopReason: 'complete', jobs: [{ id: 'j1' }] });
    expect(result.ok).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it('refuses and names a job carrying stoppedBy/pendingCause', () => {
    const result = checkReportComplete({ label: 'r.json', stopReason: 'complete', jobs: [{ id: 'j1', stoppedBy: 'rateLimit', pendingCause: 'initial' }] });
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('j1');
  });

  it('refuses a report whose own stopReason is not complete', () => {
    const result = checkReportComplete({ label: 'r.json', stopReason: 'budget', jobs: [] });
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain('budget');
  });
});

describe('checkManifestIsGenesis', () => {
  let dir: string;
  let chainFile: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'docs-readers-score-integrity-genesis-'));
    chainFile = join(dir, 'chain.jsonl');
  });

  it('passes when the chain\'s genesis entry hashes to the manifest hash', () => {
    appendEntry(chainFile, { path: 'manifest.json', sha256: 'manifest-hash', commit: 'c0' });
    expect(checkManifestIsGenesis(chainFile, 'manifest-hash').ok).toBe(true);
  });

  it('refuses when the genesis entry does not match', () => {
    appendEntry(chainFile, { path: 'manifest.json', sha256: 'wrong-hash', commit: 'c0' });
    const result = checkManifestIsGenesis(chainFile, 'manifest-hash');
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('wrong-hash');
  });

  it('refuses an empty chain', () => {
    expect(checkManifestIsGenesis(chainFile, 'manifest-hash').ok).toBe(false);
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

  it('passes when the agreement sample\'s chain entry precedes the rulings\' entry', () => {
    const samplePath = join(dir, 'sample.json');
    writeFileSync(samplePath, '{}');
    appendEntry(chainFile, { path: 'sample.json', sha256: hashFile(samplePath), commit: 'c1' });
    const rulingsPath = join(dir, 'rulings.json');
    writeFileSync(rulingsPath, '{}');
    appendEntry(chainFile, { path: 'rulings.json', sha256: hashFile(rulingsPath), commit: 'c2' });
    const result = verifyGatedChain({ chainFile, root: dir, checks: [], sampleBeforeRulings: { samplePath: 'sample.json', rulingsPaths: ['rulings.json'] } });
    expect(result.ok).toBe(true);
  });

  it('refuses when the agreement sample was chained on or after the rulings, naming both', () => {
    const rulingsPath = join(dir, 'rulings.json');
    writeFileSync(rulingsPath, '{}');
    appendEntry(chainFile, { path: 'rulings.json', sha256: hashFile(rulingsPath), commit: 'c1' });
    const samplePath = join(dir, 'sample.json');
    writeFileSync(samplePath, '{}');
    // The sample is chained after the rulings: it cannot have been written before any Fable ruling existed.
    appendEntry(chainFile, { path: 'sample.json', sha256: hashFile(samplePath), commit: 'c2' });
    const result = verifyGatedChain({ chainFile, root: dir, checks: [], sampleBeforeRulings: { samplePath: 'sample.json', rulingsPaths: ['rulings.json'] } });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('sample.json') && p.includes('rulings.json'))).toBe(true);
  });

  it('order-checks every rulings path against the sample, not just the first', () => {
    const samplePath = join(dir, 'sample.json');
    writeFileSync(samplePath, '{}');
    appendEntry(chainFile, { path: 'sample.json', sha256: hashFile(samplePath), commit: 'c1' });
    const rulingsAPath = join(dir, 'rulings-a.json');
    writeFileSync(rulingsAPath, '{}');
    appendEntry(chainFile, { path: 'rulings-a.json', sha256: hashFile(rulingsAPath), commit: 'c2' });
    // rulings-b.json is never chained at all: a second rulings file the sample was never checked against.
    const result = verifyGatedChain({
      chainFile,
      root: dir,
      checks: [],
      sampleBeforeRulings: { samplePath: 'sample.json', rulingsPaths: ['rulings-a.json', 'rulings-b.json'] },
    });
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes('rulings-b.json'))).toBe(true);
    expect(result.problems.some((p) => p.includes('rulings-a.json'))).toBe(false);
  });
});
