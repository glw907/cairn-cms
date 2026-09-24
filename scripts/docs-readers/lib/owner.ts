/**
 * The owner-marker primitives shared by the startup sweep (`lib/sweep.ts`, which reads a
 * directory's own `.owner.json` marker file) and the podman executor (`lib/podman.ts`, which
 * stamps the SAME marker onto every container and network it creates, as a label): a process's
 * pid plus its own `/proc` start time, which a reused pid cannot fake. Kept in its own module,
 * with no dependency on either of those two, so `lib/podman.ts` can stamp a label with this shape
 * without creating an import cycle with `lib/sweep.ts` (which already imports `lib/podman.ts`'s
 * `RUN_LABEL`).
 */
import { readFileSync } from 'node:fs';

/** A run or scratch directory's, or a container's or network's, owner. */
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
export function procStartTime(pid: number): string | undefined {
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
 * `isOwnerAliveReal` takes when `/proc` itself is unavailable (a non-Linux host).
 * @param pid - The process id to probe.
 * @returns True when the process exists.
 */
export function pidExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * The current process's own owner marker, for a caller about to create a run or scratch
 * directory, or a container or network.
 * @returns This process's pid and its own `/proc` start time (empty when `/proc` is unavailable).
 */
export function currentOwnerMarker(): OwnerMarker {
  return { pid: process.pid, startTime: procStartTime(process.pid) ?? '' };
}

/**
 * The real aliveness check: the marker's process still exists, and (when `/proc` answers) is
 * still the same process, never one that reused the pid. A marker missing its own start time (an
 * older marker, or one written where `/proc` was unavailable) falls back to a bare pid check.
 * @param marker - The marker to check.
 * @returns True when the marker's owner is still the live one.
 */
export function isOwnerAliveReal(marker: OwnerMarker): boolean {
  const current = procStartTime(marker.pid);
  if (current !== undefined && marker.startTime !== '') return current === marker.startTime;
  return pidExists(marker.pid);
}

/**
 * The label every container and network the podman executor creates carries, alongside
 * `lib/podman.ts`'s own `RUN_LABEL`: the creating process's owner marker. A run id's directory can
 * live under a different cache root than the sweep's own (a concurrent runner under another
 * `XDG_CACHE_HOME`), or be gone entirely, while podman's own storage is shared process-wide
 * regardless of cache root; this label is what lets the sweep's orphan pass tell a live runner's
 * container from a dead one without trusting any directory listing at all.
 */
export const OWNER_LABEL = 'docs-readers.owner';

/**
 * Serialize an owner marker into the form `OWNER_LABEL`'s value carries.
 * @param marker - The marker to serialize.
 * @returns `"<pid>:<startTime>"`.
 */
export function ownerLabelValue(marker: OwnerMarker): string {
  return `${marker.pid}:${marker.startTime}`;
}

/**
 * Parse `OWNER_LABEL`'s value form back into an owner marker.
 * @param value - The label's raw value.
 * @returns The parsed marker, or undefined when the value is malformed.
 */
export function parseOwnerLabelValue(value: string): OwnerMarker | undefined {
  const at = value.indexOf(':');
  if (at === -1) return undefined;
  const pid = Number(value.slice(0, at));
  if (!Number.isInteger(pid)) return undefined;
  return { pid, startTime: value.slice(at + 1) };
}
