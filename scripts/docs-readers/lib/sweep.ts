/**
 * The runner's startup sweep. A killed runner (SIGKILL, an out-of-memory reap) leaves its
 * containers, its network, and its per-run directory behind: `runBatchFile`'s own teardown never
 * runs, since nothing survives to run it. This module removes what a previous invocation could
 * not: every container and network still carrying the runner's own label, and every stale
 * scratch directory the cache root can hold, so each new runner invocation starts from a clean
 * cache root rather than accumulating one orphan per kill.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { RUN_LABEL } from './podman.js';

/** A podman command runner, the same shape `lib/podman.ts` uses internally. */
export type PodmanRunner = (args: string[]) => Promise<string>;

/** What the sweep removed. */
export interface SweepResult {
  containersRemoved: string[];
  networksRemoved: string[];
  dirsRemoved: string[];
}

/**
 * A scratch directory name a killed run or live check could have left under the cache root: a
 * run id (`newRunId`'s `<UTC timestamp>-<six hex digits>`), or one of `live-checks.ts`'s own
 * scratch stems (`escape-`, `site-`, `repository-` each followed by eight hex digits, or the
 * fixed name `auth`).
 */
const STALE_DIR_PATTERN = /^(?:\d{8}t\d{6}-[0-9a-f]{6}|(?:escape|site|repository)-[0-9a-f]{8}|auth)$/;

/**
 * Cache-root entries the sweep must never remove: real batch output, the usage ledger, and the
 * packed-tarball cache (`lib/prepare-class.ts`'s `tarballCacheRoot`), which a killed run never
 * orphans (nothing writes there mid-run) and which is expensive to rebuild.
 */
const PRESERVED_NAMES = new Set(['results', 'ledger.jsonl', 'tarballs']);

/**
 * Split a newline-delimited id list from a podman query into an array, dropping empty lines.
 * @param output - The command's raw stdout.
 * @returns The non-empty lines.
 */
function ids(output: string): string[] {
  return output.split('\n').filter((line) => line.trim() !== '');
}

/**
 * Remove every container and network carrying the runner's own label (any run id), and every
 * stale scratch directory under the cache root, before a new invocation starts. Every removal is
 * best-effort: a container or network already gone is not a failure, and one directory that
 * cannot be removed never stops the sweep from trying the rest. `cacheRoot` is the neutral cache
 * root every per-run and scratch directory lives under; `podman` runs one podman command and
 * returns its stdout, overridden in tests.
 * @returns The containers, networks, and directories the sweep removed.
 */
export async function sweepOrphans({ cacheRoot, podman }: { cacheRoot: string; podman: PodmanRunner }): Promise<SweepResult> {
  const containersRemoved = ids(await podman(['ps', '-a', '-q', '--filter', `label=${RUN_LABEL}`]));
  if (containersRemoved.length > 0) await podman(['rm', '-f', '-t', '0', ...containersRemoved]).catch(() => '');
  const networksRemoved = ids(await podman(['network', 'ls', '-q', '--filter', `label=${RUN_LABEL}`]));
  if (networksRemoved.length > 0) await podman(['network', 'rm', '-f', ...networksRemoved]).catch(() => '');

  const dirsRemoved: string[] = [];
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) {
      if (PRESERVED_NAMES.has(entry) || !STALE_DIR_PATTERN.test(entry)) continue;
      rmSync(join(cacheRoot, entry), { recursive: true, force: true });
      dirsRemoved.push(entry);
    }
  }

  return { containersRemoved, networksRemoved, dirsRemoved };
}
