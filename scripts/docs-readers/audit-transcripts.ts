#!/usr/bin/env -S npx tsx
/**
 * Audits one blind agent's transcript for a tool call that touched a path outside its granted
 * directory: the pass worktrees and the main checkout, `~/.cache/docs-readers/` outside the
 * agent's own granted directory, another session's transcript, or any other path a blind agent's
 * dispatch never named. The frozen prompt copy inside the granted directory is in bounds, since it
 * is a hash-verified copy the agent reads without ever touching the worktree.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/audit-transcripts.ts --transcript FILE --granted DIR [--granted DIR...]
 *
 * Exits 1 and prints every hit when the transcript touched anything outside the granted
 * directories; exits 0 and prints "0 hit(s)" otherwise.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One tool call the audit flagged. */
export interface AuditHit {
  source: 'tool' | 'bash';
  /** The tool name, for a `source: 'tool'` hit. */
  tool?: string;
  /** The implicated path, resolved as far as the audit could tell. */
  path?: string;
  /** The offending Bash command, truncated, for a `source: 'bash'` hit. */
  command?: string;
  reason: string;
}

/** The path-bearing field(s) each tool's `input` carries, checked against the granted directories. */
const PATH_FIELDS: Readonly<Record<string, readonly string[]>> = {
  Read: ['file_path'],
  Write: ['file_path'],
  Edit: ['file_path'],
  Grep: ['path'],
  Glob: ['path'],
};

/**
 * Well-known forbidden roots this pass's blind agents must never read, named by a stable
 * substring: a mention of one anywhere in a Bash command, absolute or not, is itself a hit.
 */
const FORBIDDEN_MARKERS = ['docs/internal/record/', '.claude/worktrees/', '/var/home/glw907/Projects/cairn-cms', join(homedir(), '.cache', 'docs-readers')];

/**
 * The forbidden markers worth checking for one audit run: a marker that already sits inside one
 * of the granted directories (the granted directory legitimately lives under it) is dropped,
 * since a bare substring match cannot otherwise tell an in-bounds mention from an out-of-bounds
 * one.
 * @param granted - The agent's granted directories, resolved.
 * @returns The markers to check.
 */
function applicableMarkers(granted: readonly string[]): string[] {
  return FORBIDDEN_MARKERS.filter((marker) => !granted.some((dir) => dir.includes(marker)));
}

/**
 * Whether a path sits inside one of the granted directories.
 * @param path - A path to check, ideally already absolute.
 * @param granted - The granted directories, resolved.
 * @returns True when the path equals or falls under one of them.
 */
function isContainedIn(path: string, granted: readonly string[]): boolean {
  const normalized = normalize(path);
  return granted.some((dir) => normalized === dir || normalized.startsWith(dir.endsWith('/') ? dir : `${dir}/`));
}

/**
 * Resolve a `~/`-prefixed value against a home directory; leave every other value, absolute or
 * relative, as given.
 * @param value - A raw path value from a tool call.
 * @param homeDir - The home directory `~` expands to.
 * @returns The resolved value.
 */
function expandHome(value: string, homeDir: string): string {
  return value.startsWith('~/') ? join(homeDir, value.slice(2)) : value;
}

/** How many characters of an offending Bash command the report keeps. */
const COMMAND_EXCERPT_LENGTH = 300;

/**
 * Standard device paths every shell command may reference freely: they hold no project data to
 * leak, so a bare `/dev/null` redirect never counts as a path outside the granted directory.
 */
const BENIGN_PATH_PREFIXES = ['/dev/'];

/**
 * Every absolute or home-relative token in a Bash command: a crude but effective split, since a
 * forbidden path's mere appearance as a token is the signal, not a full shell parse. Surrounding
 * quotes and trailing shell punctuation (a command separator, a closing paren) are stripped so a
 * path glued to the next token, as `/dev/null;` or `path/to/file),` is read as the bare path.
 * @param command - The Bash command text, exactly as the tool call gave it.
 * @returns Each candidate path token, with no device path among them.
 */
function extractPathTokens(command: string): string[] {
  return command
    .split(/\s+/)
    .map((token) => token.replace(/^['"]+|['"]+$/g, '').replace(/[;:,)]+$/, ''))
    .filter((token) => (token.startsWith('/') || token.startsWith('~/')) && !BENIGN_PATH_PREFIXES.some((prefix) => token.startsWith(prefix)));
}

/**
 * Audit one Bash command: every absolute or home-relative token must resolve inside a granted
 * directory, and the command text must not mention a forbidden root by name.
 * @param command - The Bash command text, exactly as the tool call gave it.
 * @param granted - The granted directories, resolved.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the command produced.
 */
function auditBashCommand(command: string, granted: readonly string[], homeDir: string): AuditHit[] {
  const excerpt = command.length > COMMAND_EXCERPT_LENGTH ? `${command.slice(0, COMMAND_EXCERPT_LENGTH)}…` : command;
  const hits: AuditHit[] = [];
  for (const token of extractPathTokens(command)) {
    const resolvedPath = expandHome(token, homeDir);
    if (!isContainedIn(resolvedPath, granted)) {
      hits.push({ source: 'bash', command: excerpt, path: resolvedPath, reason: `command references a path outside every granted directory: ${token}` });
    }
  }
  for (const marker of applicableMarkers(granted)) {
    if (command.includes(marker)) {
      hits.push({ source: 'bash', command: excerpt, reason: `command mentions the forbidden path "${marker}"` });
    }
  }
  return hits;
}

/**
 * Audit one tool call: a Bash call is scanned as a command string; a Read, Grep, Glob, Edit, or
 * Write call is checked on its own path field(s). Any other tool name is not path-bearing and
 * produces no hit.
 * @param name - The tool call's own name, such as `Read` or `Bash`.
 * @param input - The tool call's `input` object.
 * @param granted - The granted directories, resolved.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the call produced.
 */
export function auditToolCall(name: string, input: Record<string, unknown>, granted: readonly string[], homeDir: string = homedir()): AuditHit[] {
  if (name === 'Bash') {
    const command = typeof input.command === 'string' ? input.command : '';
    return command === '' ? [] : auditBashCommand(command, granted, homeDir);
  }
  const fields = PATH_FIELDS[name];
  if (!fields) return [];
  const hits: AuditHit[] = [];
  for (const field of fields) {
    const value = input[field];
    if (typeof value !== 'string' || value.trim() === '') continue;
    const resolvedPath = expandHome(value, homeDir);
    if (!isContainedIn(resolvedPath, granted)) {
      hits.push({ source: 'tool', tool: name, path: resolvedPath, reason: `${name} ${field} is outside every granted directory` });
    }
  }
  return hits;
}

/**
 * Audit a whole transcript: every `tool_use` block in every assistant message.
 * @param path - The transcript's `.jsonl` path.
 * @param granted - The agent's granted directories.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the transcript produced, in file order.
 */
export function auditTranscript(path: string, granted: readonly string[], homeDir: string = homedir()): AuditHit[] {
  const resolvedGranted = granted.map((dir) => normalize(resolve(dir)));
  const hits: AuditHit[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const message = record.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block === null || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type !== 'tool_use') continue;
      const name = typeof b.name === 'string' ? b.name : '';
      const input = (b.input ?? {}) as Record<string, unknown>;
      hits.push(...auditToolCall(name, input, resolvedGranted, homeDir));
    }
  }
  return hits;
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
  const transcript = option(args, '--transcript');
  const granted = options(args, '--granted');
  if (!transcript || granted.length === 0) {
    process.stderr.write('usage: audit-transcripts.ts --transcript FILE --granted DIR [--granted DIR...]\n');
    return 2;
  }
  const hits = auditTranscript(resolve(transcript), granted);
  for (const hit of hits) process.stdout.write(`${JSON.stringify(hit)}\n`);
  process.stdout.write(`${hits.length} hit(s)\n`);
  return hits.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
