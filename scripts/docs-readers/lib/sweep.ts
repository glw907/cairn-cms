/**
 * The runner's startup sweep. A killed runner (SIGKILL, an out-of-memory reap) leaves its
 * containers, its network, and its per-run directory behind: `runBatchFile`'s own teardown never
 * runs, since nothing survives to run it. This module removes what a previous invocation could
 * not, but only what a DEAD invocation left: parallel lanes are planned for this pass, so a
 * concurrent runner's own live containers and directories must survive a second runner's startup
 * sweep. Every run or scratch directory carries an owner marker (the creating process's pid and
 * its own `/proc` start time, which a reused pid cannot fake); the sweep reaps a directory, and
 * the run-id directories among them their labeled containers and network, only when that marker's
 * process is no longer the one that wrote it. A directory younger than `MARKERLESS_GRACE_MS` and
 * still carrying no marker is left alone rather than reaped: a caller writes its marker just after
 * `mkdirSync`, never atomically with it, so a sweep landing in that short window would otherwise
 * treat a brand-new, live directory as an old, ownerless one. Beyond the directory-owned
 * containers and network, the sweep also reaps any run's labeled containers and network when that
 * run id names no directory in the cache root at all: a directory can be gone (a cleared cache, a
 * cross-host container) while its containers linger, and no directory ever exists to drive the
 * per-directory reap above.
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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
 * The name every run or scratch directory carries: a directory a reader-runner process wrote
 * disowns it if the process named here is no longer that same process, so a second runner's
 * sweep never has to guess.
 */
const OWNER_FILE = '.owner.json';

/** A run or scratch directory's owner: the creating process's pid and its own start time. */
export interface OwnerMarker {
  pid: number;
  startTime: string;
}

/**
 * Read one process's own start time from `/proc`, the value that changes when a pid is recycled
 * for an unrelated process, which a pid number alone cannot detect. `stat`'s `comm` field (the
 * executable name, in parentheses) can itself contain spaces or parentheses, so the split point
 * is the LAST `)` in the line, never the first.
 * @param pid - The process id to read.
 * @returns The `starttime` field (in clock ticks since boot), or undefined when `/proc` cannot be
 *  read for this pid (the process is gone, or `/proc` itself is unavailable).
 */
function procStartTime(pid: number): string | undefined {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const afterComm = stat.slice(stat.lastIndexOf(')') + 2).trim();
    // Fields after comm, 0-indexed: state(0) ppid(1) pgrp(2) session(3) tty_nr(4) tpgid(5)
    // flags(6) minflt(7) cminflt(8) majflt(9) cmajflt(10) utime(11) stime(12) cutime(13)
    // cstime(14) priority(15) nice(16) num_threads(17) itrealvalue(18) starttime(19).
    return afterComm.split(/\s+/)[19];
  } catch {
    return undefined;
  }
}

/**
 * Whether `pid` names a running process at all, with no defence against pid reuse. The fallback
 * `isOwnerAliveReal` takes when `/proc` itself is unavailable (a non-Linux host); every podman
 * run this module otherwise assumes happens on Linux, where `procStartTime` is the real check.
 * @param pid - The process id to probe.
 * @returns True when the process exists.
 */
function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * The current process's own owner marker, for a caller about to create a run or scratch
 * directory.
 * @returns This process's pid and its own `/proc` start time (empty when `/proc` is unavailable).
 */
export function currentOwnerMarker(): OwnerMarker {
  return { pid: process.pid, startTime: procStartTime(process.pid) ?? '' };
}

/**
 * Write a directory's owner marker, creating the directory first if it does not exist yet.
 * @param dir - The run or scratch directory a live process is about to fill.
 * @param marker - The owner to record; defaults to the current process's own marker.
 */
export function writeOwnerMarker(dir: string, marker: OwnerMarker = currentOwnerMarker()): void {
  writeFileSync(join(dir, OWNER_FILE), JSON.stringify(marker));
}

/**
 * Read a directory's owner marker.
 * @param dir - The directory to read.
 * @returns The parsed marker, or undefined when the directory carries none (an older run, or one
 *  this module's own write never reached before a kill).
 */
function readOwnerMarker(dir: string): OwnerMarker | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, OWNER_FILE), 'utf8')) as OwnerMarker;
  } catch {
    return undefined;
  }
}

/**
 * The real aliveness check: the marker's process still exists, and (when `/proc` answers) is
 * still the same process, never one that reused the pid. A marker missing its own start time (an
 * older marker, or one written where `/proc` was unavailable) falls back to a bare pid check.
 * @param marker - The marker to check.
 * @returns True when the marker's owner is still the live one.
 */
function isOwnerAliveReal(marker: OwnerMarker): boolean {
  const current = procStartTime(marker.pid);
  if (current !== undefined && marker.startTime !== '') return current === marker.startTime;
  return pidExists(marker.pid);
}

/**
 * A scratch directory name a killed run or live check could have left under the cache root: a
 * run id (`newRunId`'s `<UTC timestamp>-<six hex digits>`), or one of `live-checks.ts`'s own
 * scratch stems (`escape-`, `site-`, `repository-`, or `docs-and-binary-`, each followed by eight
 * hex digits, or the fixed name `auth`).
 */
const STALE_DIR_PATTERN = /^(?:\d{8}t\d{6}-[0-9a-f]{6}|(?:escape|site|repository|docs-and-binary)-[0-9a-f]{8}|auth)$/;

/**
 * A run id's own shape (`newRunId`'s format), the subset of `STALE_DIR_PATTERN` whose containers
 * and network the sweep additionally reaps by `label=docs-readers.run=<that id>`: a live-check
 * scratch directory (`site-`, `repository-`, ...) never carries that label itself, since its own
 * podman work happens under a separately minted run id nested inside `runBatchFile`.
 */
const RUN_ID_PATTERN = /^\d{8}t\d{6}-[0-9a-f]{6}$/;

/**
 * Cache-root entries the sweep must never remove: real batch output, the usage ledger, and the
 * packed-tarball cache (`lib/prepare-class.ts`'s `tarballCacheRoot`), which a killed run never
 * orphans (nothing writes there mid-run) and which is expensive to rebuild.
 */
const PRESERVED_NAMES = new Set(['results', 'ledger.jsonl', 'tarballs']);

/**
 * How long a marker-less directory is left alone before the sweep treats it as ownerless: long
 * enough to cover the gap between a caller's `mkdirSync` and its following `writeOwnerMarker`
 * call, short enough that a genuinely dead, marker-less directory from an old run is still reaped
 * promptly.
 */
const MARKERLESS_GRACE_MS = 60_000;

/**
 * Split a newline-delimited id list from a podman query into an array, dropping empty lines.
 * @param output - The command's raw stdout.
 * @returns The non-empty lines.
 */
function ids(output: string): string[] {
  return output.split('\n').filter((line) => line.trim() !== '');
}

/**
 * Remove one run id's labeled containers and network. Best-effort: nothing found or already gone
 * is not a failure.
 * @param runId - The run id its containers and network are labeled with.
 * @param podman - Runs one podman command and returns its stdout.
 * @param containersRemoved - Accumulates the removed container ids.
 * @param networksRemoved - Accumulates the removed network ids.
 */
async function reapRunLabel(
  runId: string,
  podman: PodmanRunner,
  containersRemoved: string[],
  networksRemoved: string[],
): Promise<void> {
  const containers = ids(await podman(['ps', '-a', '-q', '--filter', `label=${RUN_LABEL}=${runId}`]));
  if (containers.length > 0) {
    await podman(['rm', '-f', '-t', '0', ...containers]).catch(() => '');
    containersRemoved.push(...containers);
  }
  const networks = ids(await podman(['network', 'ls', '-q', '--filter', `label=${RUN_LABEL}=${runId}`]));
  if (networks.length > 0) {
    await podman(['network', 'rm', '-f', ...networks]).catch(() => '');
    networksRemoved.push(...networks);
  }
}

/**
 * Remove every run-id directory and scratch directory under the cache root whose owner marker
 * names a process that is no longer running, and, for a dead run id, its own labeled containers
 * and network; separately, remove any run's labeled containers and network when that run id names
 * no directory in the cache root at all. A live owner's directory, and its containers and network,
 * are left untouched, so a concurrent runner (another worktree, another lane) never loses live
 * work to this one's startup. A directory carrying no owner marker at all is treated as dead (an
 * older run, or a kill before the marker write ever landed) once it is older than
 * `MARKERLESS_GRACE_MS`; a marker-less directory younger than that is left alone, since its
 * creator's marker write may simply not have landed yet. Every removal is best-effort: a
 * container, network, or directory already gone is not a failure. `cacheRoot` is the neutral cache
 * root every per-run and scratch directory lives under; `podman` runs one podman command and
 * returns its stdout; `isAlive` decides whether a marker's owner still holds its directory,
 * overridden in tests; `now` reads the clock the grace period is measured against, overridden in
 * tests.
 * @returns The containers, networks, and directories the sweep removed.
 */
export async function sweepOrphans({
  cacheRoot,
  podman,
  isAlive = isOwnerAliveReal,
  now = () => Date.now(),
}: {
  cacheRoot: string;
  podman: PodmanRunner;
  isAlive?: (marker: OwnerMarker) => boolean;
  now?: () => number;
}): Promise<SweepResult> {
  const containersRemoved: string[] = [];
  const networksRemoved: string[] = [];
  const dirsRemoved: string[] = [];
  const dirRunIds = new Set<string>();

  if (existsSync(cacheRoot)) {
    const entries = readdirSync(cacheRoot);
    for (const entry of entries) {
      if (RUN_ID_PATTERN.test(entry)) dirRunIds.add(entry);
    }
    for (const entry of entries) {
      if (PRESERVED_NAMES.has(entry) || !STALE_DIR_PATTERN.test(entry)) continue;
      const dir = join(cacheRoot, entry);
      const marker = readOwnerMarker(dir);
      if (marker) {
        if (isAlive(marker)) continue;
      } else if (now() - statSync(dir).mtimeMs < MARKERLESS_GRACE_MS) {
        continue;
      }

      if (RUN_ID_PATTERN.test(entry)) await reapRunLabel(entry, podman, containersRemoved, networksRemoved);
      rmSync(dir, { recursive: true, force: true });
      dirsRemoved.push(entry);
    }
  }

  const labeledRunIds = new Set(ids(await podman(['ps', '-a', '--filter', `label=${RUN_LABEL}`, '--format', `{{.Label "${RUN_LABEL}"}}`])));
  for (const runId of labeledRunIds) {
    if (dirRunIds.has(runId)) continue;
    await reapRunLabel(runId, podman, containersRemoved, networksRemoved);
  }

  return { containersRemoved, networksRemoved, dirsRemoved };
}
