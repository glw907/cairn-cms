import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentOwnerMarker, sweepOrphans, writeOwnerMarker, type OwnerMarker, type PodmanRunner } from '../../../scripts/docs-readers/lib/sweep.js';
import { ownerLabelValue } from '../../../scripts/docs-readers/lib/owner.js';

/** A fresh scratch cache root, removed by the caller. */
function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'docs-readers-sweep-'));
}

/**
 * A podman stand-in that records every call and answers a fixed id list for `ps`/`network ls`.
 * `labeled` answers the sweep's own "every run id with a labeled container" listing query (`ps
 * --format ...`, no `-q`) as `runId\towner` rows, `owner` defaulting to an empty value (no owner
 * label at all); every `-q`-filtered `ps`/`network ls` query answers with `containers`/`networks`
 * regardless of which run id it names, since each test drives a single run id at a time.
 */
function fakePodman(ids: {
  containers: string[];
  networks: string[];
  labeled?: Array<{ runId: string; owner?: string }>;
}): { podman: PodmanRunner; calls: string[][] } {
  const calls: string[][] = [];
  const podman: PodmanRunner = async (args) => {
    calls.push(args);
    if (args[0] === 'ps' && args.includes('--format')) {
      return (ids.labeled ?? []).map(({ runId, owner = '' }) => `${runId}\t${owner}`).join('\n');
    }
    if (args[0] === 'ps') return ids.containers.join('\n');
    if (args[0] === 'network' && args[1] === 'ls') return ids.networks.join('\n');
    return '';
  };
  return { podman, calls };
}

/** A marker naming an owner `sweepOrphans`'s default aliveness check will never find running. */
const DEAD_MARKER: OwnerMarker = { pid: 999999, startTime: 'never-a-real-starttime' };

describe('writeOwnerMarker / currentOwnerMarker', () => {
  it('round-trips through a directory the way sweepOrphans reads it back', () => {
    const dir = tmp();
    try {
      const marker = currentOwnerMarker();
      writeOwnerMarker(dir, marker);
      expect(JSON.parse(readFileSync(join(dir, '.owner.json'), 'utf8'))).toEqual(marker);
      expect(marker.pid).toBe(process.pid);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('sweepOrphans: owner liveness', () => {
  it('leaves a live owner’s run-id directory untouched, with no podman query for it at all', async () => {
    const { podman, calls } = fakePodman({ containers: ['should-not-be-seen'], networks: ['should-not-be-seen'] });
    const cacheRoot = tmp();
    const runId = '20260923t143022-a1b2c3';
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      writeOwnerMarker(join(cacheRoot, runId), currentOwnerMarker());
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([]);
      expect(result.containersRemoved).toEqual([]);
      expect(result.networksRemoved).toEqual([]);
      expect(existsSync(join(cacheRoot, runId))).toBe(true);
      expect(calls.some((a) => a.includes(`label=docs-readers.run=${runId}`))).toBe(false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('reaps a dead run-id directory and its own containers and network, filtered by that exact run id', async () => {
    const runId = '20260923t143022-deadbe';
    const { podman, calls } = fakePodman({ containers: ['c1'], networks: ['n1'] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      writeOwnerMarker(join(cacheRoot, runId), DEAD_MARKER);
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([runId]);
      expect(result.containersRemoved).toEqual(['c1']);
      expect(result.networksRemoved).toEqual(['n1']);
      expect(existsSync(join(cacheRoot, runId))).toBe(false);
      expect(calls).toContainEqual(['ps', '-a', '-q', '--filter', `label=docs-readers.run=${runId}`]);
      expect(calls).toContainEqual(['network', 'ls', '-q', '--filter', `label=docs-readers.run=${runId}`]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('treats a run-id directory with no marker at all as dead once past the grace period, the same as an older run', async () => {
    const runId = '20260923t143022-b0b0b0';
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      // The directory's real mtime is "now"; a clock pushed well past the grace period is what
      // makes this a genuinely old, marker-less directory rather than one whose marker write
      // simply has not landed yet.
      const result = await sweepOrphans({ cacheRoot, podman, now: () => Date.now() + 10 * 60_000 });
      expect(result.dirsRemoved).toEqual([runId]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('leaves a marker-less directory alone within the grace period, since its marker write may not have landed yet', async () => {
    const runId = '20260923t143022-f0f0f0';
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([]);
      expect(existsSync(join(cacheRoot, runId))).toBe(true);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('leaves a live owner’s scratch directory (docs-and-binary-*) untouched and never queries podman for it', async () => {
    const { podman, calls } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    const name = 'docs-and-binary-9f21ac30';
    try {
      mkdirSync(join(cacheRoot, name), { recursive: true });
      writeOwnerMarker(join(cacheRoot, name), currentOwnerMarker());
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([]);
      expect(existsSync(join(cacheRoot, name))).toBe(true);
      expect(calls.some((a) => a.includes(`label=docs-readers.run=${name}`))).toBe(false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('reaps a dead docs-and-binary-* scratch directory with no run-label podman query, since it carries no run label itself', async () => {
    const { podman, calls } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    const name = 'docs-and-binary-00ff11aa';
    try {
      mkdirSync(join(cacheRoot, name), { recursive: true });
      writeOwnerMarker(join(cacheRoot, name), DEAD_MARKER);
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([name]);
      expect(calls.some((a) => a.includes(`label=docs-readers.run=${name}`))).toBe(false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('an injected isAlive overrides the real check, for a test that does not want to depend on /proc', async () => {
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    const runId = '20260923t143022-c0ffee';
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      writeOwnerMarker(join(cacheRoot, runId), currentOwnerMarker());
      const result = await sweepOrphans({ cacheRoot, podman, isAlive: () => false });
      expect(result.dirsRemoved).toEqual([runId]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });
});

describe('sweepOrphans: stale directory recognition', () => {
  it('removes stale run and scratch directories, including live-check site-*, repository-*, and docs-and-binary-* dirs, but keeps results, the ledger, and the tarball cache', async () => {
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      const stale = ['20260923t143022-a1b2c3', 'site-9f21ac30', 'repository-00ff11aa', 'escape-abcd1234', 'docs-and-binary-11223344', 'auth'];
      for (const name of stale) mkdirSync(join(cacheRoot, name), { recursive: true });
      mkdirSync(join(cacheRoot, 'results', 'some-batch'), { recursive: true });
      mkdirSync(join(cacheRoot, 'tarballs', 'abc123'), { recursive: true });
      writeFileSync(join(cacheRoot, 'ledger.jsonl'), '{}\n');
      // Every stale directory here is marker-less; a clock past the grace period is what makes
      // them dead rather than "just created, marker write still pending".
      const result = await sweepOrphans({ cacheRoot, podman, now: () => Date.now() + 10 * 60_000 });
      expect(result.dirsRemoved.sort()).toEqual([...stale].sort());
      for (const name of stale) expect(existsSync(join(cacheRoot, name))).toBe(false);
      expect(existsSync(join(cacheRoot, 'results', 'some-batch'))).toBe(true);
      expect(existsSync(join(cacheRoot, 'ledger.jsonl'))).toBe(true);
      expect(existsSync(join(cacheRoot, 'tarballs', 'abc123'))).toBe(true);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('leaves an unrecognized directory name alone, rather than guessing', async () => {
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, 'something-else'), { recursive: true });
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved).toEqual([]);
      expect(existsSync(join(cacheRoot, 'something-else'))).toBe(true);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('does nothing to directories when the cache root does not exist yet', async () => {
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = join(tmpdir(), `docs-readers-sweep-missing-${Date.now()}`);
    const result = await sweepOrphans({ cacheRoot, podman });
    expect(result.dirsRemoved).toEqual([]);
  });
});

describe('sweepOrphans: labeled containers and networks whose run directory is gone', () => {
  it('reaps a run id’s labeled containers and network when no directory for it exists in the cache root at all, and the label carries no owner at all', async () => {
    const runId = '20260923t143022-orphan1';
    const { podman, calls } = fakePodman({ containers: ['c-orphan'], networks: ['n-orphan'], labeled: [{ runId }] });
    const cacheRoot = tmp();
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual(['c-orphan']);
      expect(result.networksRemoved).toEqual(['n-orphan']);
      expect(result.dirsRemoved).toEqual([]);
      expect(calls).toContainEqual(['ps', '-a', '-q', '--filter', `label=docs-readers.run=${runId}`]);
      expect(calls).toContainEqual(['network', 'ls', '-q', '--filter', `label=docs-readers.run=${runId}`]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('reaps a run id with no directory at all whose owner label names a dead process', async () => {
    const runId = '20260923t143022-deadfa1';
    const { podman } = fakePodman({ containers: ['c-orphan'], networks: ['n-orphan'], labeled: [{ runId, owner: ownerLabelValue(DEAD_MARKER) }] });
    const cacheRoot = tmp();
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual(['c-orphan']);
      expect(result.networksRemoved).toEqual(['n-orphan']);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('never reaps a run id with no directory at all whose owner label names a still-live process, since it can be a concurrent runner under a different cache root', async () => {
    const runId = '20260923t143022-livefa1';
    const { podman } = fakePodman({
      containers: ['should-not-be-removed'],
      networks: ['should-not-be-removed'],
      labeled: [{ runId, owner: ownerLabelValue(currentOwnerMarker()) }],
    });
    const cacheRoot = tmp();
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual([]);
      expect(result.networksRemoved).toEqual([]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('never reaps a labeled run id that still has a live, owned directory', async () => {
    const runId = '20260923t143022-11ff22';
    const { podman } = fakePodman({ containers: ['should-not-be-removed'], networks: [], labeled: [{ runId }] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      writeOwnerMarker(join(cacheRoot, runId), currentOwnerMarker());
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual([]);
      expect(result.networksRemoved).toEqual([]);
      expect(result.dirsRemoved).toEqual([]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('does not reap a labeled run id a second time: the per-directory reap above already covers a dead directory that still exists', async () => {
    const runId = '20260923t143022-deadbe';
    const { podman, calls } = fakePodman({ containers: ['c1'], networks: ['n1'], labeled: [{ runId }] });
    const cacheRoot = tmp();
    try {
      mkdirSync(join(cacheRoot, runId), { recursive: true });
      writeOwnerMarker(join(cacheRoot, runId), DEAD_MARKER);
      await sweepOrphans({ cacheRoot, podman });
      const reapQueries = calls.filter((a) => a.includes(`label=docs-readers.run=${runId}`) && a.includes('-q'));
      // One query for containers and one for networks, from the per-directory reap alone; the
      // no-directory-at-all step must not issue a second round for the same run id.
      expect(reapQueries.length).toBe(2);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('re-checks the directory just before reaping: a directory that appears for this exact run id after the initial snapshot is not reaped', async () => {
    const runId = '20260923t143022-appear1';
    const cacheRoot = tmp();
    let checkedOnce = false;
    const podman: PodmanRunner = async (args) => {
      if (args[0] === 'ps' && args.includes('--format')) {
        // The directory appears only once this query (the initial snapshot, already taken) has
        // run, simulating a concurrent runner under the SAME cache root that started just after
        // this sweep began.
        if (!checkedOnce) {
          checkedOnce = true;
          mkdirSync(join(cacheRoot, runId), { recursive: true });
          writeOwnerMarker(join(cacheRoot, runId), currentOwnerMarker());
        }
        return `${runId}\t${ownerLabelValue(DEAD_MARKER)}`;
      }
      if (args[0] === 'ps') return 'should-not-be-removed';
      if (args[0] === 'network' && args[1] === 'ls') return 'should-not-be-removed';
      return '';
    };
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual([]);
      expect(result.networksRemoved).toEqual([]);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });
});
