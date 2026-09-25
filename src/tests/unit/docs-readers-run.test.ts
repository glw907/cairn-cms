import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildResumeBatch,
  checkGate,
  checkJudgeKeyIntegrity,
  checkKeyOutsideMount,
  classifyBatchKind,
  expectedItemsFromKey,
  jobsNeedingResume,
  judgeResumeInputs,
  mergeResumedJudgeReport,
  mergeResumedReport,
  operatorSecretResolver,
  resumeInputs,
  type FinishedJudgeReport,
  type FinishedReport,
} from '../../../scripts/docs-readers/run.js';
import { buildCatchPacket } from '../../../scripts/docs-readers/judge-packets.js';
import { buildManifest, hashFile, writeManifest } from '../../../scripts/docs-readers/freeze.js';
import { loadClasses } from '../../../scripts/docs-readers/lib/class-schema.js';
import { parseBatch } from '../../../scripts/docs-readers/lib/batch.js';
import type { InstallationToken } from '../../../scripts/docs-readers/lib/github-app-token.js';
import type { BatchReport, JobReport, Verified } from '../../../scripts/docs-readers/lib/types.js';
import type { JudgeJobReport } from '../../../scripts/docs-readers/lib/runner.js';
import type { JudgeVerified } from '../../../scripts/docs-readers/lib/judge-verify.js';

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

/** One gated job, carrying both the pinned commit and the prepared tree a gated batch requires. */
const GATED_JOB = { id: 'job-a', commit: 'deadbeef', prepared: 'planted/job-a' };

/**
 * A fixture tree of one tracked file, its manifest, and its post-freeze chain, for `checkGate`.
 * `models` overrides the manifest's frozen models, for the empty-`models.reader` case.
 */
function gatedFixture(models = { reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' }) {
  const root = mkdtempSync(join(tmpdir(), 'docs-readers-gate-'));
  writeFileSync(join(root, 'run.ts'), 'export {};\n');
  const listFiles = () => ['run.ts'];
  const manifest = buildManifest({
    tag: 'docs-reset-1b-freeze',
    root,
    imageId: 'sha256:image',
    cliVersion: '2.1.280',
    models,
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
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles });
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
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toEqual(['file changed: run.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses naming a missing manifest, and a missing chain file, without reading either as drift', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      const noManifest = checkGate({ manifestPath: join(root, 'absent.json'), chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [], listFiles });
      expect(noManifest.ok).toBe(false);
      rmSync(chainPath);
      const noChain = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles });
      expect(noChain.ok).toBe(false);
      if (!noChain.ok) expect(noChain.problems).toEqual([`no chain file at ${chainPath}`]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses, naming the job, when a gated job carries no commit', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      const gate = checkGate({
        manifestPath,
        chainPath,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        jobs: [{ id: 'job-a', prepared: 'planted/job-a' }],
        listFiles,
      });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toContain('job job-a: a gated batch requires a pinned commit');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses, naming the job, when a gated job carries no prepared tree (it would otherwise copy live from the working tree)', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    try {
      const gate = checkGate({
        manifestPath,
        chainPath,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        jobs: [{ id: 'job-a', commit: 'deadbeef' }],
        listFiles,
      });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toContain('job job-a: a gated batch requires a prepared tree, never the working tree');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses when the manifest freezes an empty reader model', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture({ reader: '', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' });
    try {
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toContain('manifest models.reader is empty');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('gates a catch-judge batch against manifest.models.catchJudge, read from the manifest and never passed in by hand', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture({ reader: 'claude-opus-5-5', catchJudge: 'claude-opus-4-9', adjudicator: 'claude-opus-5-5', agreement: 'fable' });
    try {
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles, kind: 'catchJudge' });
      expect(gate.ok).toBe(true);
      if (gate.ok) expect(gate.freeze.expectedModel).toBe('claude-opus-4-9');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('gates an agreement batch against manifest.models.agreement, a second, distinct key from the same manifest', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture({ reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: 'claude-opus-5-5', agreement: 'fable' });
    try {
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles, kind: 'agreement' });
      expect(gate.ok).toBe(true);
      if (gate.ok) expect(gate.freeze.expectedModel).toBe('fable');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses when the manifest freezes an empty model for the given judge kind', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture({ reader: 'claude-opus-5-5', catchJudge: 'claude-opus-5-5', adjudicator: '', agreement: 'fable' });
    try {
      const gate = checkGate({ manifestPath, chainPath, root, imageId: 'sha256:image', cliVersion: '2.1.280', jobs: [GATED_JOB], listFiles, kind: 'adjudicator' });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems).toContain('manifest models.adjudicator is empty');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses a judge job whose prepared directory itself carries key.json inside the mount', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    const preparedDir = join(root, 'packet-with-key');
    mkdirSync(preparedDir, { recursive: true });
    writeFileSync(join(preparedDir, 'key.json'), '{}');
    try {
      const gate = checkGate({
        manifestPath,
        chainPath,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        jobs: [{ id: 'job-a', commit: 'deadbeef', prepared: preparedDir }],
        listFiles,
        kind: 'catchJudge',
      });
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.problems.some((p) => p.includes('carries key.json inside its own mount'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not apply the key.json check to a reader batch (kind undefined)', () => {
    const { root, manifestPath, chainPath, listFiles } = gatedFixture();
    const preparedDir = join(root, 'reader-tree-with-key');
    mkdirSync(preparedDir, { recursive: true });
    writeFileSync(join(preparedDir, 'key.json'), '{}');
    try {
      const gate = checkGate({
        manifestPath,
        chainPath,
        root,
        imageId: 'sha256:image',
        cliVersion: '2.1.280',
        jobs: [{ id: 'job-a', commit: 'deadbeef', prepared: preparedDir }],
        listFiles,
      });
      expect(gate.ok).toBe(true);
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

/** A clean `FinishedReport` wrapping the given jobs, for the merge tests below. */
function finishedReport(overrides: Partial<FinishedReport> & Pick<FinishedReport, 'jobs' | 'runId' | 'stopReason' | 'usage' | 'verified'>): FinishedReport {
  return {
    batch: 'fixture',
    budgetTokens: 1000,
    cliVersion: '2.1.280',
    runRoot: '/tmp/does-not-matter',
    teardown: { runDirRemoved: true, containersLeft: 0, networksLeft: 0 },
    ...overrides,
  };
}

describe('jobsNeedingResume, resumeInputs, buildResumeBatch, and mergeResumedReport', () => {
  it('names only the jobs a batch-level stop left unstarted or unfinished', () => {
    const report: Pick<BatchReport, 'jobs'> = {
      jobs: [jobReport('a'), jobReport('b', { stoppedBy: 'rateLimit', attempts: undefined }), jobReport('c', { stoppedBy: 'rateLimit', attempts: undefined })],
    };
    expect(jobsNeedingResume(report)).toEqual(['b', 'c']);
  });

  it('carries each stopped job’s saved attempts and pending cause, and defaults a missing pendingCause to initial', () => {
    const report: Pick<BatchReport, 'jobs'> = {
      jobs: [
        jobReport('a'),
        jobReport('b', { stoppedBy: 'rateLimit', pendingCause: 'unverified', attempts: [] }),
        jobReport('c', { stoppedBy: 'budget', attempts: undefined }),
      ],
    };
    expect(resumeInputs(report)).toEqual({
      b: { attempts: [], pendingCause: 'unverified' },
      c: { attempts: [], pendingCause: 'initial' },
    });
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
    const original = finishedReport({
      runId: 'r1',
      stopReason: 'rateLimit',
      usage: { input: 5, output: 5, cacheCreation: 0, cacheRead: 0, counted: 10 },
      jobs: [jobReport('a'), jobReport('b', { stoppedBy: 'rateLimit', attempts: undefined })],
      verified: false,
    });
    const resumed = finishedReport({
      runId: 'r2',
      stopReason: 'complete',
      usage: { input: 3, output: 3, cacheCreation: 0, cacheRead: 0, counted: 6 },
      jobs: [jobReport('b')],
      verified: true,
    });
    const merged = mergeResumedReport(original, resumed);
    expect(merged.jobs.map((j) => [j.id, j.stoppedBy])).toEqual([
      ['a', undefined],
      ['b', undefined],
    ]);
    expect(merged.usage.counted).toBe(16);
    expect(merged.stopReason).toBe('complete');
    expect(merged.verified).toBe(true);
    expect(merged.teardown).toEqual(resumed.teardown);
  });

  it('keeps the merge unverified when either run’s own teardown left something behind, even though every job verified', () => {
    const original = finishedReport({
      runId: 'r1',
      stopReason: 'rateLimit',
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
      jobs: [jobReport('a', { stoppedBy: 'rateLimit', attempts: undefined })],
      verified: false,
      teardown: { runDirRemoved: false, containersLeft: 1, networksLeft: 0 },
    });
    const resumed = finishedReport({
      runId: 'r2',
      stopReason: 'complete',
      usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
      jobs: [jobReport('a')],
      verified: true,
    });
    const merged = mergeResumedReport(original, resumed);
    expect(merged.jobs.every((j) => j.verified.ok)).toBe(true);
    expect(merged.verified).toBe(false);
  });
});

describe('classifyBatchKind', () => {
  const classes = loadClasses();
  function batchOf(jobs: { id: string; class: string }[]) {
    return parseBatch(
      {
        name: 'fixture',
        concurrency: 1,
        budgetTokens: 1000,
        jobs: jobs.map(({ id, class: className }) => ({
          id,
          class: className,
          model: 'claude-opus-5-5',
          arrival: 'Arrival.',
          job: 'Job.',
          docsSet: ['.'],
          prepared: '/dev/null',
        })),
      },
      classes,
    );
  }

  it('classifies an all-reader batch as reader', () => {
    const result = classifyBatchKind(batchOf([{ id: 'a', class: 'docs-only' }, { id: 'b', class: 'repository' }]), classes);
    expect(result).toEqual({ ok: true, kind: 'reader' });
  });

  it('classifies an all-judge batch by its one shared kind', () => {
    const result = classifyBatchKind(batchOf([{ id: 'a', class: 'judge-adjudicator' }, { id: 'b', class: 'judge-adjudicator' }]), classes);
    expect(result).toEqual({ ok: true, kind: 'adjudicator' });
  });

  it('refuses a batch mixing a judge class with a reader class', () => {
    const result = classifyBatchKind(batchOf([{ id: 'a', class: 'judge-catch' }, { id: 'b', class: 'docs-only' }]), classes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/mixes job kinds/);
  });

  it('refuses a batch mixing two judge kinds', () => {
    const result = classifyBatchKind(batchOf([{ id: 'a', class: 'judge-catch' }, { id: 'b', class: 'judge-agreement' }]), classes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems[0]).toMatch(/mixes job kinds/);
  });
});

describe('expectedItemsFromKey', () => {
  /** A packet mount plus its sibling key.json, for expectedItemsFromKey. */
  function packetWithKey(key: object): { dir: string; prepared: string } {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-key-'));
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    writeFileSync(join(dir, 'key.json'), JSON.stringify(key));
    return { dir, prepared };
  }

  it('reads plant ids for a catch packet', () => {
    const { dir, prepared } = packetWithKey({ kind: 'catch', plants: { 'plant-1': { plantId: 'P01' }, 'plant-2': { plantId: 'P02' } }, items: {}, inputs: {} });
    try {
      expect(expectedItemsFromKey(prepared, 'catchJudge')).toEqual([{ itemId: 'plant-1' }, { itemId: 'plant-2' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads item ids for an adjudicator packet', () => {
    const { dir, prepared } = packetWithKey({ kind: 'adjudicator', items: { 'item-1': { field: 'stalls', sourceIndex: 0 } }, excluded: [], treeCommit: 'deadbeef', treeAbsent: [], inputs: {} });
    try {
      expect(expectedItemsFromKey(prepared, 'adjudicator')).toEqual([{ itemId: 'item-1' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads findings and catch calls, labeled by kind, for an agreement packet', () => {
    const { dir, prepared } = packetWithKey({ kind: 'agreement', findings: { 'f-1': { resolved: true } }, catchCalls: { 'c-1': { resolved: true } }, inputs: {} });
    try {
      expect(expectedItemsFromKey(prepared, 'agreement')).toEqual([
        { itemId: 'f-1', expectedKind: 'finding' },
        { itemId: 'c-1', expectedKind: 'catchCall' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws, naming the expected path, when no key.json sits beside the packet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-key-missing-'));
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    try {
      expect(() => expectedItemsFromKey(prepared, 'catchJudge')).toThrow(/no key\.json beside packet/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** A minimal, valid `JudgeJobReport`, for the judge resume tests below. */
function judgeJobReport(id: string, overrides: Partial<JudgeJobReport> = {}): JudgeJobReport {
  const verified: JudgeVerified = { ok: true, init: true, canaries: true, problems: [] };
  return {
    id,
    class: 'judge-catch',
    model: 'claude-opus-5-5',
    outcome: 'done',
    rulings: [],
    usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 },
    verified,
    attempts: [{ cause: 'initial', final: true, transcript: 't', outcome: 'done', rulings: [], usage: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, counted: 0 }, verified }],
    ...overrides,
  };
}

/** A minimal, valid `FinishedJudgeReport`. */
function finishedJudgeReport(
  overrides: Partial<FinishedJudgeReport> & Pick<FinishedJudgeReport, 'jobs' | 'runId' | 'stopReason' | 'usage' | 'verified'>,
): FinishedJudgeReport {
  return {
    batch: 'fixture',
    kind: 'catchJudge',
    budgetTokens: 1000,
    cliVersion: '2.1.280',
    runRoot: '/tmp/does-not-matter',
    teardown: { runDirRemoved: true, containersLeft: 0, networksLeft: 0 },
    ...overrides,
  };
}

describe('judgeResumeInputs and mergeResumedJudgeReport', () => {
  it('carries each stopped judge job’s saved attempts and pending cause, defaulting a missing pendingCause to initial', () => {
    const report = { jobs: [judgeJobReport('a'), judgeJobReport('b', { stoppedBy: 'rateLimit', pendingCause: 'unverified', attempts: [] })] };
    expect(judgeResumeInputs(report)).toEqual({ b: { attempts: [], pendingCause: 'unverified' } });
  });

  it('merges a resumed judge sub-batch’s reports back in place', () => {
    const original = finishedJudgeReport({
      runId: 'r1',
      stopReason: 'rateLimit',
      usage: { input: 5, output: 5, cacheCreation: 0, cacheRead: 0, counted: 10 },
      jobs: [judgeJobReport('a'), judgeJobReport('b', { stoppedBy: 'rateLimit', attempts: undefined })],
      verified: false,
    });
    const resumed = finishedJudgeReport({
      runId: 'r2',
      stopReason: 'complete',
      usage: { input: 3, output: 3, cacheCreation: 0, cacheRead: 0, counted: 6 },
      jobs: [judgeJobReport('b')],
      verified: true,
    });
    const merged = mergeResumedJudgeReport(original, resumed);
    expect(merged.jobs.map((j) => [j.id, j.stoppedBy])).toEqual([
      ['a', undefined],
      ['b', undefined],
    ]);
    expect(merged.usage.counted).toBe(16);
    expect(merged.verified).toBe(true);
  });
});

describe('checkKeyOutsideMount', () => {
  it('flags a prepared directory that itself carries key.json inside its own mount', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-mount-'));
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    writeFileSync(join(prepared, 'key.json'), '{}');
    try {
      expect(checkKeyOutsideMount('job-a', prepared)).toMatch(/carries key\.json inside its own mount/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes a prepared directory with no key.json inside', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-mount-'));
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    try {
      expect(checkKeyOutsideMount('job-a', prepared)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('checkJudgeKeyIntegrity: the gated judge path’s trust check', () => {
  /** A `prepared` packet dir with a sibling key.json, for the integrity tests. */
  function packetWithKey(dir: string, key: unknown): string {
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    writeFileSync(join(dir, 'key.json'), JSON.stringify(key));
    return prepared;
  }

  it('refuses a key built through the escape hatch (builtFrom "fixture"), the shape a gated judge batch must never accept', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const prepared = packetWithKey(dir, { builtFrom: 'fixture', inputs: {} });
    try {
      const problems = checkJudgeKeyIntegrity('job-a', prepared);
      expect(problems.some((p) => p.includes('not "sources"'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes a key built from sources whose recorded inputs still match their current hash', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const inputFile = join(dir, 'batch.json');
    writeFileSync(inputFile, '{"jobs":[]}');
    const prepared = packetWithKey(dir, { builtFrom: 'sources', inputs: { [inputFile]: hashFile(inputFile) } });
    try {
      expect(checkJudgeKeyIntegrity('job-a', prepared)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses when a recorded input has changed since the packet was built', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const inputFile = join(dir, 'batch.json');
    writeFileSync(inputFile, '{"jobs":[]}');
    const staleHash = hashFile(inputFile);
    writeFileSync(inputFile, '{"jobs":[{"id":"changed"}]}');
    const prepared = packetWithKey(dir, { builtFrom: 'sources', inputs: { [inputFile]: staleHash } });
    try {
      const problems = checkJudgeKeyIntegrity('job-a', prepared);
      expect(problems.some((p) => p.includes('has changed since the packet was built'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips only a page@<commit>: synthetic label, never a real path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const prepared = packetWithKey(dir, { builtFrom: 'sources', inputs: { 'page@abc123:docs/guide.md': 'deadbeef' } });
    try {
      expect(checkJudgeKeyIntegrity('job-a', prepared)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses when an absolute inputs key no longer exists on disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const missing = join(dir, 'gone.json');
    const prepared = packetWithKey(dir, { builtFrom: 'sources', inputs: { [missing]: 'deadbeef' } });
    try {
      const problems = checkJudgeKeyIntegrity('job-a', prepared);
      expect(problems.some((p) => p.includes(missing) && p.includes('no longer exists'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses when a relative, non-synthetic inputs key names a packet file the build never wrote', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const prepared = packetWithKey(dir, { builtFrom: 'sources', inputs: { 'pages/docs/guide.md': 'deadbeef' } });
    try {
      const problems = checkJudgeKeyIntegrity('job-a', prepared);
      expect(problems.some((p) => p.includes('pages/docs/guide.md') && p.includes('no longer exists'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses, naming the job, when no key.json sits beside the packet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-'));
    const prepared = join(dir, 'packet');
    mkdirSync(prepared, { recursive: true });
    try {
      const problems = checkJudgeKeyIntegrity('job-a', prepared);
      expect(problems.some((p) => p.includes('job-a') && p.includes('no key.json'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * A real source-built catch packet: a dev plant read from a planted root, never `git show` (the
   * repoRoot/commit pair are unused on this path and stand in for values a real build would pin).
   */
  function buildRealCatchPacket(dir: string): { outDir: string; plantedRoot: string } {
    const outDir = join(dir, 'out');
    const batchPath = join(dir, 'batch.json');
    writeFileSync(batchPath, JSON.stringify({ name: 'fixture', jobs: [{ id: 'job-a', job: 'Job text.' }] }));
    const reportPath = join(dir, 'report.json');
    writeFileSync(
      reportPath,
      JSON.stringify({ batch: 'fixture', runId: 'r1', jobs: [{ id: 'job-a', model: 'claude-opus-5-5', stalls: [], assumed: [], diverged: [], checks: [] }] }),
    );
    const criteriaPath = join(dir, 'dev-plants.json');
    writeFileSync(criteriaPath, JSON.stringify([{ id: 'P01', page: 'docs/guide.md', line: 1, subject: 's', criterion: 'c', nearMiss: 'n' }]));
    const indexPath = join(dir, 'dev-plants-index.json');
    writeFileSync(indexPath, JSON.stringify([{ id: 'P01', job: 'job-a', page: 'docs/guide.md', line: 1 }]));
    const plantedRoot = join(dir, 'planted', 'job-a');
    mkdirSync(join(plantedRoot, 'docs'), { recursive: true });
    writeFileSync(join(plantedRoot, 'docs', 'guide.md'), 'planted guide content\n');
    buildCatchPacket({
      outDir,
      repoRoot: dir,
      batchPath,
      reportPath,
      jobId: 'job-a',
      plants: { kind: 'dev', criteriaPath, indexPath, jobId: 'job-a', plantedRoot },
      commit: 'unused',
    });
    return { outDir, plantedRoot };
  }

  it('refuses when a planted page a real packet was built from changes after the build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-real-'));
    const { outDir, plantedRoot } = buildRealCatchPacket(dir);
    try {
      writeFileSync(join(plantedRoot, 'docs', 'guide.md'), 'the plant changed after the build\n');
      const problems = checkJudgeKeyIntegrity('job-a', join(outDir, 'packet'));
      expect(problems.some((p) => p.includes('has changed since the packet was built'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses when a packet file itself is edited after the build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-real-'));
    const { outDir } = buildRealCatchPacket(dir);
    try {
      writeFileSync(join(outDir, 'packet', 'job.json'), JSON.stringify({ text: 'tampered job text' }));
      const problems = checkJudgeKeyIntegrity('job-a', join(outDir, 'packet'));
      expect(problems.some((p) => p.includes('job.json') && p.includes('has changed since the packet was built'))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes an untouched, real source-built packet end to end', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-integrity-real-'));
    const { outDir } = buildRealCatchPacket(dir);
    try {
      expect(checkJudgeKeyIntegrity('job-a', join(outDir, 'packet'))).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
