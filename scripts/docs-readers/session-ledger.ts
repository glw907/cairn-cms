#!/usr/bin/env -S npx tsx
/**
 * Sums counted tokens across one Claude Code session: its own transcript, every subagent
 * transcript (both the session's own `subagents/*.jsonl` copies and any `tasks/*.output` copies a
 * background dispatch left under the workstation's tmp root), and the docs-reader runner's own
 * usage ledger. Counted tokens are input, output, and cache creation, by this pass's counting
 * rule; cache-read tokens are reported apart. A message id repeated across sources (a background
 * task's transcript and its `.output` twin carry the same messages) is counted once.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/session-ledger.ts --session ID_OR_PATH
 *     [--runner-ledger FILE] [--since ISO] [--project-dir DIR] [--tasks-dir DIR]
 *
 * `--session` is either a bare session id (resolved under `--project-dir`, defaulting to this
 * workstation's `~/.claude/projects/<slug>`, the main checkout's slug even when run from a
 * worktree) or a path to the session's own `.jsonl` file. `--runner-ledger` defaults to the
 * runner's own default ledger path. `--since` keeps only messages timestamped at or after an ISO
 * instant. `--tasks-dir` adds another `tasks/*.output` directory to scan, repeatable.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addUsage, ledgerTotal, readLedger, reportUsage } from './lib/ledger.js';
import { emptyUsage } from './lib/transcript.js';
import type { LedgerEntry, ReportUsage, Usage } from './lib/types.js';

/** One assistant message's usage, as `scanTranscriptMessages` reads it off a transcript line. */
export interface UsageEntry {
  messageId: string;
  usage: Usage;
  timestamp?: string;
}

/** One source's totals: the four counts, the counted total, and how many messages it held. */
export interface SourceBreakdown extends ReportUsage {
  messages: number;
}

/** The full ledger total: the grand counted figures, plus each source's own breakdown. */
export interface SessionLedgerTotal extends ReportUsage {
  bySource: {
    session: SourceBreakdown;
    subagents: SourceBreakdown;
    runner: SourceBreakdown;
  };
}

/**
 * Read one transcript's assistant messages that carry a usage block.
 * @param path - A `.jsonl` transcript path (the session's own, a `subagents/*.jsonl` file, or a
 *  `tasks/*.output` file, which shares the same line shape).
 * @returns Every usage-bearing assistant message, in file order; empty when the file is absent or
 *  unreadable.
 */
export function scanTranscriptMessages(path: string): UsageEntry[] {
  if (!existsSync(path)) return [];
  const entries: UsageEntry[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (record.type !== 'assistant') continue;
    const message = record.message as Record<string, unknown> | undefined;
    const id = message?.id;
    const usage = message?.usage as Record<string, unknown> | undefined;
    if (typeof id !== 'string' || !usage) continue;
    const timestamp = typeof record.timestamp === 'string' ? record.timestamp : undefined;
    entries.push({
      messageId: id,
      usage: {
        input: typeof usage.input_tokens === 'number' ? usage.input_tokens : 0,
        output: typeof usage.output_tokens === 'number' ? usage.output_tokens : 0,
        cacheCreation: typeof usage.cache_creation_input_tokens === 'number' ? usage.cache_creation_input_tokens : 0,
        cacheRead: typeof usage.cache_read_input_tokens === 'number' ? usage.cache_read_input_tokens : 0,
      },
      ...(timestamp ? { timestamp } : {}),
    });
  }
  return entries;
}

/**
 * Deduplicate a list of usage entries by message id, keeping the first occurrence.
 * @param entries - Usage entries from one or more transcripts.
 * @returns A map from message id to its usage.
 */
function dedupeById(entries: readonly UsageEntry[]): Map<string, Usage> {
  const map = new Map<string, Usage>();
  for (const entry of entries) {
    if (!map.has(entry.messageId)) map.set(entry.messageId, entry.usage);
  }
  return map;
}

/**
 * Sum a set of usage records into one breakdown.
 * @param usages - The usage records to add.
 * @returns The summed usage and how many records it held.
 */
function sumUsages(usages: Iterable<Usage>): { usage: Usage; messages: number } {
  let usage = emptyUsage();
  let messages = 0;
  for (const one of usages) {
    usage = addUsage(usage, one);
    messages += 1;
  }
  return { usage, messages };
}

/**
 * The full session ledger total: the session transcript and the subagent transcripts deduplicated
 * by message id against each other, plus the runner ledger's entries added on top (a distinct
 * token pool with no message id to dedupe against). `sessionEntries` and `subagentEntries` are
 * already time-filtered by the caller.
 * @returns The grand total and each source's own breakdown.
 */
export function sessionLedgerTotal({
  sessionEntries,
  subagentEntries,
  runnerEntries,
}: {
  sessionEntries: readonly UsageEntry[];
  subagentEntries: readonly UsageEntry[];
  runnerEntries: readonly LedgerEntry[];
}): SessionLedgerTotal {
  const sessionMap = dedupeById(sessionEntries);
  const subagentMap = new Map<string, Usage>();
  for (const [id, usage] of dedupeById(subagentEntries)) {
    if (!sessionMap.has(id)) subagentMap.set(id, usage);
  }
  const sessionSum = sumUsages(sessionMap.values());
  const subagentSum = sumUsages(subagentMap.values());
  const runnerSum = sumUsages(runnerEntries.map((e) => e.usage));
  const grand = addUsage(addUsage(sessionSum.usage, subagentSum.usage), runnerSum.usage);
  return {
    ...reportUsage(grand),
    bySource: {
      session: { ...reportUsage(sessionSum.usage), messages: sessionSum.messages },
      subagents: { ...reportUsage(subagentSum.usage), messages: subagentSum.messages },
      runner: { ...reportUsage(runnerSum.usage), messages: runnerSum.messages },
    },
  };
}

/**
 * A project's slug under `~/.claude/projects/`: its absolute path with every `/` turned into `-`.
 * @param projectRoot - The repository's absolute root, never a worktree's.
 * @returns The directory name Claude Code files the project's sessions under.
 */
export function projectSlug(projectRoot: string): string {
  return projectRoot.replace(/\//g, '-');
}

/**
 * The main checkout's root behind a working directory that may sit inside one of its own pass
 * worktrees (`<root>/.claude/worktrees/<name>`): session transcripts are always filed under the
 * main checkout's own slug, never a worktree's. A working directory outside that layout is
 * returned unchanged.
 * @param cwd - A working directory.
 * @returns The main checkout root.
 */
export function mainRepoRoot(cwd: string): string {
  const marker = '/.claude/worktrees/';
  const at = cwd.indexOf(marker);
  return at === -1 ? cwd : cwd.slice(0, at);
}

/**
 * Every `subagents/*.jsonl` transcript beside a session's own `.jsonl` file.
 * @param sessionJsonlPath - The session transcript's path.
 * @returns Each subagent transcript's path.
 */
export function discoverSubagentTranscripts(sessionJsonlPath: string): string[] {
  const subagentsDir = join(sessionJsonlPath.replace(/\.jsonl$/, ''), 'subagents');
  if (!existsSync(subagentsDir)) return [];
  return readdirSync(subagentsDir)
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => join(subagentsDir, name));
}

/**
 * Every `*.output` file in a background task directory.
 * @param tasksDir - A `tasks/` directory under the workstation's tmp root.
 * @returns Each task output's path.
 */
export function discoverTaskOutputs(tasksDir: string): string[] {
  if (!existsSync(tasksDir)) return [];
  return readdirSync(tasksDir)
    .filter((name) => name.endsWith('.output'))
    .sort()
    .map((name) => join(tasksDir, name));
}

/**
 * The default `tasks/` directory a background dispatch of this session would have written under,
 * on this workstation's own tmp layout.
 * @param projectRoot - The main checkout's root, from `mainRepoRoot`.
 * @param sessionId - The session whose background dispatches to find.
 * @returns The directory path (may not exist).
 */
export function defaultTasksDir(projectRoot: string, sessionId: string): string {
  const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
  return join('/tmp', `claude-${uid}`, projectSlug(projectRoot), sessionId, 'tasks');
}

/**
 * Pull a flag's value out of an argument list.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * Every occurrence of a repeated flag's value.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns Each value, in order.
 */
function options(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) if (args[i] === flag) values.push(args[i + 1]);
  return values;
}

/**
 * The command-line entry point.
 * @param args - The arguments after the script name.
 * @returns The process exit code.
 */
export function main(args: string[]): number {
  const session = option(args, '--session');
  if (!session) {
    process.stderr.write('usage: session-ledger.ts --session ID_OR_PATH [--runner-ledger FILE] [--since ISO] [--project-dir DIR] [--tasks-dir DIR]\n');
    return 2;
  }
  const since = option(args, '--since');
  const projectRoot = mainRepoRoot(resolve(process.cwd()));
  const projectDir = option(args, '--project-dir') ?? join(homedir(), '.claude', 'projects', projectSlug(projectRoot));
  const sessionIsPath = session.endsWith('.jsonl') || session.includes('/');
  const sessionPath = sessionIsPath ? resolve(session) : join(projectDir, `${session}.jsonl`);
  const sessionId = sessionIsPath ? basename(sessionPath, '.jsonl') : session;
  const runnerLedgerPath = option(args, '--runner-ledger') ?? join(homedir(), '.cache', 'docs-readers', 'ledger.jsonl');

  const tasksDirs = [defaultTasksDir(projectRoot, sessionId), ...options(args, '--tasks-dir')];
  const subagentPaths = [...discoverSubagentTranscripts(sessionPath), ...tasksDirs.flatMap(discoverTaskOutputs)];

  const filterSince = (entry: UsageEntry) => !since || (entry.timestamp !== undefined && entry.timestamp >= since);
  const sessionEntries = scanTranscriptMessages(sessionPath).filter(filterSince);
  const subagentEntries = subagentPaths.flatMap((p) => scanTranscriptMessages(p)).filter(filterSince);
  const runnerEntries = readLedger(runnerLedgerPath);

  const total = sessionLedgerTotal({ sessionEntries, subagentEntries, runnerEntries });
  process.stdout.write(`${JSON.stringify({ session: sessionPath, subagentTranscripts: subagentPaths.length, runnerLedger: runnerLedgerPath, ...total }, null, 2)}\n`);
  return 0;
}

// ledgerTotal is re-exported for a caller that wants the runner ledger's own total in isolation,
// the same figure `run.ts --ledger-total` prints.
export { ledgerTotal };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
