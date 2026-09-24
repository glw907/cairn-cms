/**
 * The runner's startup sweep. A killed runner (SIGKILL, an out-of-memory reap) leaves its
 * containers, its network, and its per-run directory behind: `runBatchFile`'s own teardown never
 * runs, since nothing survives to run it. This module removes what a previous invocation could
 * not, but only what a DEAD invocation left: parallel lanes are planned for this pass, so a
 * concurrent runner's own live containers and directories must survive a second runner's startup
 * sweep. Every run or scratch directory carries an owner marker (the creating process's pid and
 * its own `/proc` start time, which a reused pid cannot fake); the sweep reaps a directory, and
 * the run-id directories among them their labeled containers and network, only when that marker's
 * process is no longer the one that wrote it.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
 * Split a newline-delimited id list from a podman query into an array, dropping empty lines.
 * @param output - The command's raw stdout.
 * @returns The non-empty lines.
 */
function ids(output: string): string[] {
  return output.split('\n').filter((line) => line.trim() !== '');
}

/**
 * Remove every run-id directory and scratch directory under the cache root whose owner marker
 * names a process that is no longer running, and, for a dead run id, its own labeled containers
 * and network. A live owner's directory, and its containers and network, are left untouched, so a
 * concurrent runner (another worktree, another lane) never loses live work to this one's startup.
 * A directory carrying no owner marker at all is treated as dead (an older run, or a kill before
 * the marker write ever landed) and is swept the same as an expired one. Every removal is
 * best-effort: a container, network, or directory already gone is not a failure. `cacheRoot` is
 * the neutral cache root every per-run and scratch directory lives under; `podman` runs one
 * podman command and returns its stdout; `isAlive` decides whether a marker's owner still holds
 * its directory, overridden in tests.
 * @returns The containers, networks, and directories the sweep removed.
 */
export async function sweepOrphans({
  cacheRoot,
  podman,
  isAlive = isOwnerAliveReal,
}: {
  cacheRoot: string;
  podman: PodmanRunner;
  isAlive?: (marker: OwnerMarker) => boolean;
}): Promise<SweepResult> {
  const containersRemoved: string[] = [];
  const networksRemoved: string[] = [];
  const dirsRemoved: string[] = [];

  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) {
      if (PRESERVED_NAMES.has(entry) || !STALE_DIR_PATTERN.test(entry)) continue;
      const dir = join(cacheRoot, entry);
      const marker = readOwnerMarker(dir);
      if (marker && isAlive(marker)) continue;

      if (RUN_ID_PATTERN.test(entry)) {
        const containers = ids(await podman(['ps', '-a', '-q', '--filter', `label=${RUN_LABEL}=${entry}`]));
        if (containers.length > 0) {
          await podman(['rm', '-f', '-t', '0', ...containers]).catch(() => '');
          containersRemoved.push(...containers);
        }
        const networks = ids(await podman(['network', 'ls', '-q', '--filter', `label=${RUN_LABEL}=${entry}`]));
        if (networks.length > 0) {
          await podman(['network', 'rm', '-f', ...networks]).catch(() => '');
          networksRemoved.push(...networks);
        }
      }
      rmSync(dir, { recursive: true, force: true });
      dirsRemoved.push(entry);
    }
  }

  return { containersRemoved, networksRemoved, dirsRemoved };
}
