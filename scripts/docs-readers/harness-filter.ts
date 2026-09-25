#!/usr/bin/env -S npx tsx
/**
 * The harness filter: it mechanically excludes a catch-field item from precision scoring when the
 * item's `blockedBy` claim checks out against the job's absent list or the run's own denial
 * record, under the one rule the spec's "Scoring" states. An item the filter cannot confirm this
 * way is not excluded; the adjudicator still rules "harness" for anything the filter misses. The
 * filter applies to precision items only (findings a control or mapping run's catch fields carry),
 * never to catch (sensitivity) scoring, since a planted page's plants are never harness artifacts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toReaderRelative } from './lib/transcript.js';
import type { Denial, Job } from './lib/types.js';

/** One precision item to check against the job's absent list and the run's denials. */
export interface HarnessCandidate {
  itemId: string;
  /** The denied command or the absent path the reader named, or null when nothing blocked it. */
  blockedBy: string | null;
}

/** One item the filter mechanically excluded, with the match it excluded on. */
export interface ExcludedItem {
  itemId: string;
  reason: string;
}

/** The filter's verdict over a run's precision items for one job. */
export interface HarnessFilterResult {
  /** Items the filter confirmed as harness: excluded from precision scoring. */
  excluded: ExcludedItem[];
  /** Every item the filter did not exclude, in the order given; these still go to the adjudicator. */
  remaining: string[];
  /** A subset of `remaining` the filter could not confirm one way or the other, with why. */
  adjudicatorNotes: ExcludedItem[];
}

/**
 * Whether a repository-relative path sits on a job's absent list: equal to a file entry, or equal
 * to or nested under a directory entry (written with a trailing slash). A shared prefix that is
 * not a directory boundary, such as `docs/internal/record-extra` against the directory
 * `docs/internal/record/`, never matches.
 * @param rel - A normalized repository-relative path.
 * @param absent - The job's absent list.
 * @returns True when the path is absent by design.
 */
function pathIsAbsent(rel: string, absent: string[]): boolean {
  return absent.some((entry) => (entry.endsWith('/') ? rel === entry.slice(0, -1) || rel.startsWith(entry) : rel === entry));
}

/** The first word and first argument of a shell command. */
interface CommandWords {
  first: string;
  second: string;
}

/**
 * Split a command line into its first word and first argument.
 * @param command - A shell command line.
 * @returns Its first two whitespace-separated words, each defaulting to the empty string.
 */
function commandWords(command: string): CommandWords {
  const words = command.trim().split(/\s+/).filter((word) => word.length > 0);
  return { first: words[0] ?? '', second: words[1] ?? '' };
}

/** One denial's recovered command, and whether the recovery is trustworthy. */
interface DenialCommand extends CommandWords {
  /**
   * False when the excerpt's own truncation may have cut the command off before its first
   * argument, so a missing second word here does not mean the real command had none.
   */
  recoverable: boolean;
}

/**
 * Recover the Bash command a denial's excerpt names, tolerating the 400-character truncation
 * `lib/transcript.ts` applies: a clean excerpt parses as JSON outright; a truncated one has no
 * closing quote, so a tolerant regex takes everything after `"command":"` instead. That
 * fallback's own match can run to the excerpt's very end, mid-word, so a second word it recovers
 * is trustworthy only once a third word (or later) also survived the cut: that third word proves
 * the cut landed after the second word's own closing space, not inside it. Short of a third word,
 * `recoverable` is false, since reporting the second word as given would be a guess at where it
 * was actually cut off.
 * @param denial - One denial from a run's denial record.
 * @returns The recovered command, or undefined when the excerpt names no command at all.
 */
function extractDenialCommand(denial: Denial): DenialCommand | undefined {
  const text = denial.input;
  let command: string | undefined;
  let cutoff = false;
  try {
    const parsed = JSON.parse(text) as { command?: unknown };
    if (typeof parsed.command === 'string') command = parsed.command;
  } catch {
    const match = /"command"\s*:\s*"((?:\\.|[^"\\])*)/.exec(text);
    if (match) {
      command = match[1].replace(/\\(.)/g, '$1');
      cutoff = match.index + match[0].length >= text.length;
    }
  }
  if (command === undefined) return undefined;
  const wordCount = command.trim().split(/\s+/).filter((word) => word.length > 0).length;
  const { first, second } = commandWords(command);
  return { first, second, recoverable: !cutoff || wordCount >= 3 };
}

/**
 * Whether a candidate's `blockedBy` claim, read as a command, matches one of the run's denials.
 * @param claim - The candidate's `blockedBy` text, read as a command line.
 * @param denials - The run's denial record.
 * @returns `matched` when a denial's own command's first word and first argument equal the
 * claim's; `unresolved` when a denial shares the claim's first word but its own second word could
 * not be recovered, so the match can be neither confirmed nor ruled out.
 */
function matchDenialCommand(claim: CommandWords, denials: Denial[]): { matched: boolean; unresolved: boolean } {
  let unresolved = false;
  for (const denial of denials) {
    const recovered = extractDenialCommand(denial);
    if (!recovered || recovered.first !== claim.first) continue;
    if (!recovered.recoverable) {
      unresolved = true;
      continue;
    }
    if (recovered.second === claim.second) return { matched: true, unresolved };
  }
  return { matched: false, unresolved };
}

/**
 * Filter one run's precision items for one job, excluding every item whose `blockedBy` claim
 * mechanically matches the job's absent list or the run's own denials.
 * @param items - The run's precision (catch-field) items, each with its `blockedBy` claim.
 * @param job - The job, for its id and its absent list.
 * @param denials - The run's denial record.
 * @returns The excluded items, the remaining items still bound for the adjudicator, and the
 * remaining items the filter itself could not resolve, with why.
 * @throws When the job carries no absent list at all, naming the job.
 */
export function filterHarnessItems(items: HarnessCandidate[], job: Pick<Job, 'id' | 'absent'>, denials: Denial[]): HarnessFilterResult {
  if (!job.absent) throw new Error(`job ${job.id} has no absent list`);
  const excluded: ExcludedItem[] = [];
  const adjudicatorNotes: ExcludedItem[] = [];
  const remaining: string[] = [];
  for (const item of items) {
    const blockedBy = item.blockedBy ?? null;
    if (blockedBy === null) {
      remaining.push(item.itemId);
      continue;
    }
    const rel = toReaderRelative(blockedBy);
    if (rel !== undefined && rel !== '.' && pathIsAbsent(rel, job.absent)) {
      excluded.push({ itemId: item.itemId, reason: `absent path "${rel}"` });
      continue;
    }
    const claim = commandWords(blockedBy);
    const { matched, unresolved } = matchDenialCommand(claim, denials);
    if (matched) {
      const commandText = `${claim.first} ${claim.second}`.trim();
      excluded.push({ itemId: item.itemId, reason: `denied command "${commandText}"` });
      continue;
    }
    remaining.push(item.itemId);
    if (unresolved) {
      adjudicatorNotes.push({ itemId: item.itemId, reason: "a matching denial's command could not be fully recovered from its truncated excerpt" });
    }
  }
  return { excluded, remaining, adjudicatorNotes };
}

/**
 * Run the harness filter CLI over a JSON fixture: `{ items, job, denials }`.
 * @param argv - `[FILE]`, the fixture path.
 * @returns The process exit code: 0 on success, 1 on a usage or filter error.
 */
export function main(argv: string[]): number {
  if (argv.length !== 1) {
    process.stderr.write('usage: harness-filter.ts FILE\n');
    return 1;
  }
  const input = JSON.parse(readFileSync(resolve(argv[0]), 'utf8')) as { items: HarnessCandidate[]; job: Pick<Job, 'id' | 'absent'>; denials: Denial[] };
  try {
    const result = filterHarnessItems(input.items, input.job, input.denials);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
