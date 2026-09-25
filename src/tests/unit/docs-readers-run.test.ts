import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildResumeBatch, checkGate, jobsNeedingResume, mergeResumedReport, operatorSecretResolver } from '../../../scripts/docs-readers/run.js';
import { buildManifest, writeManifest } from '../../../scripts/docs-readers/freeze.js';
import { loadClasses } from '../../../scripts/docs-readers/lib/class-schema.js';
import { parseBatch } from '../../../scripts/docs-readers/lib/batch.js';
import type { InstallationToken } from '../../../scripts/docs-readers/lib/github-app-token.js';
import type { BatchReport, JobReport, Verified } from '../../../scripts/docs-readers/lib/types.js';

/** A fake clock: `now()` reads a mutable box, so a test advances time without a real delay. */
function fakeClock(startMs: number): { now: () => number; advance: (ms: number) => void } {
  let current = startMs;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

/**
 * A fake mint that returns a fresh token each call, one hour ahead of the clock it is given.
 * `calls` is a mutable box, read live (never destructured), so an assertion after more calls
 * still sees the current count rather than a snapshot from construction time.
 */
function fakeMint(clock: { now: () => number }): { mint: () => Promise<InstallationToken>; calls: { count: number } } {
  const calls = { count: 0 };
  const mint = async (): Promise<InstallationToken> => {
    calls.count += 1;
    return { token: `token-${calls.count}`, expiresAt: new Date(clock.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] };
  };
  return { mint, calls };
}

/**
 * A mint that rejects on its first `failures` calls, then succeeds. `calls` is a mutable box, the
 * same live-read convention as `fakeMint`.
 */
function flakyMint(failures: number): { mint: () => Promise<InstallationToken>; calls: { count: number } } {
  const calls = { count: 0 };
  const mint = async (): Promise<InstallationToken> => {
    calls.count += 1;
    if (calls.count <= failures) throw new Error(`mint attempt ${calls.count} failed`);
    return { token: `token-${calls.count}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] };
  };
  return { mint, calls };
}

describe('operatorSecretResolver: CAIRN_GH_READ_TOKEN re-minting', () => {
  it('mints once, then reuses the cached token while it is well short of expiry', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = fakeMint(clock);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    clock.advance(5 * 60 * 1000); // five minutes: nowhere near the ten-minute remint margin
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    expect(calls.count).toBe(1);
  });

  it('re-mints once the cached token is within the ten-minute remint margin of its own expiry', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = fakeMint(clock);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-1');
    expect(calls.count).toBe(1);
    clock.advance(52 * 60 * 1000); // 52 minutes into a one-hour token: 8 minutes left, under the 10-minute margin
    expect(await resolve('CAIRN_GH_READ_TOKEN')).toBe('token-2');
    expect(calls.count).toBe(2);
  });

  it('never mints twice for two calls racing the same in-flight mint', async () => {
    const clock = fakeClock(0);
    let resolveMint!: (token: InstallationToken) => void;
    let callCount = 0;
    const mint = () => {
      callCount += 1;
      return new Promise<InstallationToken>((resolve) => {
        resolveMint = resolve;
      });
    };
    const resolver = operatorSecretResolver({ now: clock.now, mint });
    const first = resolver('CAIRN_GH_READ_TOKEN');
    const second = resolver('CAIRN_GH_READ_TOKEN');
    resolveMint({ token: 'token-1', expiresAt: new Date(clock.now() + 60 * 60 * 1000).toISOString(), repositories: ['cairn-scratch-b'] });
    expect(await first).toBe('token-1');
    expect(await second).toBe('token-1');
    expect(callCount).toBe(1);
  });

  it('recovers within one call when the first mint attempt fails but its bounded retry succeeds', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = flakyMint(1);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    await expect(resolve('CAIRN_GH_READ_TOKEN')).resolves.toBe('token-2');
    expect(calls.count).toBe(2);
  });

  it('fails the call after the retry also fails, and does not leave the rejected mint cached', async () => {
    const clock = fakeClock(0);
    const { mint, calls } = flakyMint(2);
    const resolve = operatorSecretResolver({ now: clock.now, mint });
    await expect(resolve('CAIRN_GH_READ_TOKEN')).rejects.toThrow('mint attempt 2 failed');
    expect(calls.count).toBe(2);
    // The next call must mint fresh rather than replay the same rejection forever.
    await expect(resolve('CAIRN_GH_READ_TOKEN')).resolves.toBe('token-3');
    expect(calls.count).toBe(3);
  });
});

/** A fixture tree of one tracked file, its manifest, and its post-freeze chain, for `checkGate`. */
function gatedFixture() {
  const root = mkdtempSync(join(tmpdir(), 'docs-readers-gate-'));
  writeFileSync(join(root, 'run.ts'), 'export {};\n');
  const listFiles = () => ['run.ts'];
  const manifest = buildManifest({
    tag: 'docs-reset-1b-freeze',
    root,
    imageId: 'sha256:image',
    cliVersion: '2.1.280',
    models: { reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' },
    jobs: { 'job-a': 'deadbeef' },
    heldOutPins: {},
    seeds: {},
    listFiles,
  });
  const manifestPath = join(root, 'manifest.json');
  writeManifest(manifest, manifestPath);
  const chainPath = join(root, 'chain.jsonl');
  writeFileSync(chainPath, `${JSON.stringify({ path: 'manifest.json', sha256: 'x', commit: 'y', prior: null })}\n`);
  return { root, manifestPath, chainPath, listFiles };
}

describe('checkGate', () => {
  it('passes and returns the freeze stamp when nothing has drifted', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: { 'job-a': 'deadbeef' }, listFiles });
      expect(gate.ok).toBe(true);
      if (gate.ok) {
        expect(gate.freeze).toMatchObject({ tag: 'docs-reset-1b-freeze', expectedModel: 'claude-opus-5-5' });
        expect(gate.freeze.manifestHash).toHaveLength(64);
        expect(gate.freeze.chainHead).toHaveLength(64);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses and names the drifted input when one byte of a manifested file changes', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      writeFileSync(join(root, 'run.ts'), 'export const x = 1;\n');
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: { 'job-a': 'deadbeef' }, listFiles });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toEqual(['file changed: run.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses naming a missing manifest, and a missing chain file, without reading either as drift', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      const noManifest = checkGate({ manifestPath: join(root, 'absent.json'), chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: {}, listFiles });
      expect(noManifest.ok).toBe(false);
      rmSync(chainPath);
      const noChain = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: { 'job-a': 'deadbeef' }, listFiles });
      expect(noChain.ok).toBe(false);
      if (!noChain.ok) expect(noChain.problems).toEqual([`no chain file at ${chainPath}`]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

/** A minimal, valid `JobReport`, for the resume tests below. */
function jobReport(id: string, overrides: Partial<JobReport> = {}): JobReport {
  const verified: Verified = { ok: true, init: true, canaries: true, quotes: [], steps: [], diverged: [], problems: [] };
  return {
    id,
    class: 'docs-only',
    model: 'claude-opus-5-5',
    outcome: 'done',
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    steps: [],
    diverged: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: { input: 1, output: 1, cacheCreation: 0, cacheRead: 0, counted: 2 },
    verified,
    attempts: [],
    ...overrides,
  };
}

describe('jobsNeedingResume, buildResumeBatch, and mergeResumedReport', () => {
  it('names only the jobs a batch-level stop left unstarted', () => {
    const report: Pick<BatchReport, 'jobs'> = {
      jobs: [jobReport('a'), jobReport('b', { stoppedBy: 'rateLimit', attempts: undefined }), jobReport('c', { stoppedBy: 'rateLimit', attempts: undefined })],
    };
    expect(jobsNeedingResume(report)).toEqual(['b', 'c']);
  });

  it('narrows a batch to the given job ids, keeping the batch’s own name, concurrency, budget, and gating', () => {
    const classes = loadClasses();
    const batch = parseBatch(
      {
        name: 'fixture',
        concurrency: 4,
        budgetTokens: 1000,
        gated: true,
        jobs: ['a', 'b', 'c'].map((id) => ({ id, class: 'docs-only', model: 'claude-opus-5-5', arrival: 'Arrival.', job: 'Job.', docsSet: ['docs'] })),
      },
      classes,
    );
    const resumed = buildResumeBatch(batch, ['b']);
    expect(resumed.jobs.map((j) => j.id)).toEqual(['b']);
    expect(resumed).toMatchObject({ name: 'fixture', concurrency: 4, budgetTokens: 1000, gated: true });
  });

  it('merges a resumed sub-batch’s reports back in place, without consuming an attempt for the stop itself', () => {
    const original: BatchReport = {
      batch: 'fixture',
      runId: 'r1',
      stopReason: 'rateLimit',
      budgetTokens: 1000,
      usage: { input: 5, output: 5, cacheCreation: 0, cacheRead: 0, counted: 10 },
      jobs: [jobReport('a'), jobReport('b', { stoppedBy: 'rateLimit', attempts: undefined })],
      verified: false,
    };
    const resumed: BatchReport = {
      batch: 'fixture',
      runId: 'r2',
      stopReason: 'complete',
      budgetTokens: 1000,
      usage: { input: 3, output: 3, cacheCreation: 0, cacheRead: 0, counted: 6 },
      jobs: [jobReport('b')],
      verified: true,
    };
    const merged = mergeResumedReport(original, resumed);
    expect(merged.jobs.map((j) => [j.id, j.stoppedBy])).toEqual([
      ['a', undefined],
      ['b', undefined],
    ]);
    expect(merged.usage.counted).toBe(16);
    expect(merged.stopReason).toBe('complete');
    expect(merged.verified).toBe(true);
  });
});
