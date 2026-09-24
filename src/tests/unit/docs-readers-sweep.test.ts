import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sweepOrphans, type PodmanRunner } from '../../../scripts/docs-readers/lib/sweep.js';

/** A fresh scratch cache root, removed by the caller. */
function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'docs-readers-sweep-'));
}

/** A podman stand-in that records every call and answers a fixed id list for `ps`/`network ls`. */
function fakePodman(ids: { containers: string[]; networks: string[] }): { podman: PodmanRunner; calls: string[][] } {
  const calls: string[][] = [];
  const podman: PodmanRunner = async (args) => {
    calls.push(args);
    if (args[0] === 'ps') return ids.containers.join('\n');
    if (args[0] === 'network' && args[1] === 'ls') return ids.networks.join('\n');
    return '';
  };
  return { podman, calls };
}

describe('sweepOrphans', () => {
  it('removes every container and network carrying the label, regardless of run id', async () => {
    const { podman, calls } = fakePodman({ containers: ['c1', 'c2'], networks: ['n1'] });
    const cacheRoot = tmp();
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual(['c1', 'c2']);
      expect(result.networksRemoved).toEqual(['n1']);
      expect(calls).toContainEqual(['ps', '-a', '-q', '--filter', 'label=docs-readers.run']);
      expect(calls).toContainEqual(['rm', '-f', '-t', '0', 'c1', 'c2']);
      expect(calls).toContainEqual(['network', 'ls', '-q', '--filter', 'label=docs-readers.run']);
      expect(calls).toContainEqual(['network', 'rm', '-f', 'n1']);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('removes no container or network commands when none carry the label', async () => {
    const { podman, calls } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.containersRemoved).toEqual([]);
      expect(result.networksRemoved).toEqual([]);
      expect(calls.some((a) => a[0] === 'rm')).toBe(false);
      expect(calls.some((a) => a[0] === 'network' && a[1] === 'rm')).toBe(false);
    } finally {
      rmSync(cacheRoot, { recursive: true, force: true });
    }
  });

  it('removes stale run and scratch directories, including live-check site-* and repository-* dirs, but keeps results and the ledger', async () => {
    const { podman } = fakePodman({ containers: [], networks: [] });
    const cacheRoot = tmp();
    try {
      for (const name of ['20260923t143022-a1b2c3', 'site-9f21ac30', 'repository-00ff11aa', 'escape-abcd1234', 'auth']) {
        mkdirSync(join(cacheRoot, name), { recursive: true });
        writeFileSync(join(cacheRoot, name, 'marker'), 'x');
      }
      mkdirSync(join(cacheRoot, 'results', 'some-batch'), { recursive: true });
      writeFileSync(join(cacheRoot, 'ledger.jsonl'), '{}\n');
      const result = await sweepOrphans({ cacheRoot, podman });
      expect(result.dirsRemoved.sort()).toEqual(['20260923t143022-a1b2c3', 'auth', 'escape-abcd1234', 'repository-00ff11aa', 'site-9f21ac30'].sort());
      for (const name of ['20260923t143022-a1b2c3', 'site-9f21ac30', 'repository-00ff11aa', 'escape-abcd1234', 'auth']) {
        expect(existsSync(join(cacheRoot, name))).toBe(false);
      }
      expect(existsSync(join(cacheRoot, 'results', 'some-batch'))).toBe(true);
      expect(existsSync(join(cacheRoot, 'ledger.jsonl'))).toBe(true);
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
