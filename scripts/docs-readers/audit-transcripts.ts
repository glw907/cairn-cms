#!/usr/bin/env -S npx tsx
/**
 * Audits one blind agent's transcript for a tool call that touched a path outside its granted
 * directory: the pass worktrees and the main checkout, `~/.cache/docs-readers/` outside the
 * agent's own granted directory, another session's transcript, or any other path a blind agent's
 * dispatch never named. The frozen prompt copy inside the granted directory is in bounds, since it
 * is a hash-verified copy the agent reads without ever touching the worktree.
 *
 * Every relative path a tool call or a Bash command names is resolved against its own effective
 * working directory before the containment check: a transcript record's own `cwd` field for a
 * tool call, or every `cd <dir>` in a Bash command's `&&`/`;` chain, tracked in order, falling
 * back to the record's `cwd` before the first one. A relative reference from a cwd the audit
 * cannot resolve, or that resolves outside every granted directory, is a hit, the same as an
 * absolute one. A Bash call that runs interpreter code the audit does not itself read (inline
 * Python or JavaScript, a heredoc) is listed apart as an unaudited interpreter call, for a person
 * to review; it is never a hit and never changes the exit code.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/audit-transcripts.ts --transcript FILE --granted DIR [--granted DIR...]
 *
 * Exits 1 and prints every hit when the transcript touched anything outside the granted
 * directories; exits 0 and prints "0 hit(s)" otherwise.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, normalize, resolve } from 'node:path';
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

/**
 * Well-known forbidden roots this pass's blind agents must never read, named by a stable
 * substring (no trailing slash, so a mention with or without one still matches): a mention of one
 * anywhere in a Bash command, absolute or not, is itself a hit.
 */
const FORBIDDEN_MARKERS = ['docs/internal/record', '.claude/worktrees', '/var/home/glw907/Projects/cairn-cms', join(homedir(), '.cache', 'docs-readers')];

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
 * @param path - A path to check, already absolute.
 * @param granted - The granted directories, resolved.
 * @returns True when the path equals or falls under one of them.
 */
function isContainedIn(path: string, granted: readonly string[]): boolean {
  const normalized = normalize(path);
  return granted.some((dir) => normalized === dir || normalized.startsWith(dir.endsWith('/') ? dir : `${dir}/`));
}

/**
 * Standard device paths every shell command may reference freely: they hold no project data to
 * leak, so a bare `/dev/null` redirect never counts as a path outside the granted directory.
 */
const BENIGN_PATH_PREFIXES = ['/dev/'];

/**
 * Resolve a path value to an absolute path: `~/` expands against `homeDir`, an already-absolute
 * value is normalized as given, and a relative value resolves against `cwd`.
 * @param value - A raw path value from a tool call or a Bash token.
 * @param cwd - The effective working directory a relative `value` resolves against, when known.
 * @param homeDir - The home directory `~` expands to.
 * @returns The resolved absolute path, or undefined when `value` is relative and `cwd` is unknown.
 */
function resolvePathValue(value: string, cwd: string | undefined, homeDir: string): string | undefined {
  if (value.startsWith('~/')) return normalize(join(homeDir, value.slice(2)));
  if (isAbsolute(value)) return normalize(value);
  if (cwd === undefined) return undefined;
  return normalize(join(cwd, value));
}

/**
 * Whether a bare token looks like a filesystem path worth resolving: it carries a directory
 * separator, or ends in a short alphanumeric extension (`catch-judge.md`, with no directory
 * component of its own, still names a file in the effective cwd).
 * @param token - A candidate token.
 * @returns True when the token is worth resolving and checking.
 */
function looksPathLike(token: string): boolean {
  return token.includes('/') || /\.[A-Za-z0-9]{1,8}$/.test(token);
}

/**
 * A glob pattern's own directory prefix: every path segment before the first one carrying a glob
 * metacharacter (`*`, `?`, `[`). `docs/internal/record/*.md` yields `docs/internal/record`;
 * `**\/*.ts` (no real directory before its own wildcard) yields the empty string, which the
 * caller treats as nothing to check.
 * @param pattern - A Glob `pattern` or a Grep `glob` value.
 * @returns The directory prefix, possibly empty.
 */
function globPatternDirPrefix(pattern: string): string {
  const segments = pattern.split('/');
  const cut = segments.findIndex((segment) => /[*?[]/.test(segment));
  return (cut === -1 ? segments : segments.slice(0, cut)).join('/');
}

/** How many characters of an offending Bash command the report keeps. */
const COMMAND_EXCERPT_LENGTH = 300;

/** One path-like or glob token from a command segment: `raw` as written, `effective` what actually gets resolved. */
interface CommandToken {
  raw: string;
  effective: string;
}

/**
 * Every path-like or glob token in one `&&`/`;`-delimited command segment: a crude but effective
 * split, since a forbidden path's mere appearance as a token is the signal, not a full shell
 * parse. A leading redirect operator (`>`, `2>`, `>>`, with an optional file-descriptor number),
 * surrounding quotes, and trailing shell punctuation (a comma, a closing paren) are stripped, so a
 * path glued to an operator or the next token, as `2>/dev/null;` or `path/to/file),`, is read as
 * the bare path. A token naming a URL (`://`) is dropped: its slashes are not a filesystem path. A
 * glob token (`*.md`, `notes/*`) is kept under its own directory prefix
 * (`globPatternDirPrefix`), the one part of it that names a real location, and dropped when that
 * prefix is empty (nothing to check, as a bare `*.md` names no directory of its own).
 * @param segment - One segment of a Bash command, already split on `&&`/`;`.
 * @returns Each candidate token, with no device path among them.
 */
function extractCommandTokens(segment: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  for (const raw of segment.split(/\s+/)) {
    const cleaned = raw.replace(/^\d*(>>?|<)&?/, '').replace(/^['"]+|['"]+$/g, '').replace(/[;:,)]+$/, '');
    if (cleaned === '' || cleaned.includes('://')) continue;
    if (/[*?[]/.test(cleaned)) {
      const prefix = globPatternDirPrefix(cleaned);
      if (prefix === '' || BENIGN_PATH_PREFIXES.some((p) => prefix.startsWith(p))) continue;
      tokens.push({ raw, effective: prefix });
      continue;
    }
    if (!looksPathLike(cleaned) || BENIGN_PATH_PREFIXES.some((p) => cleaned.startsWith(p))) continue;
    tokens.push({ raw, effective: cleaned });
  }
  return tokens;
}

/** One Bash call whose command runs interpreter code the audit does not itself inspect, listed for a person to review. */
export interface InterpreterCall {
  command: string;
  reason: string;
}

/**
 * Whether a Bash command runs code the audit cannot itself read as a separate, reviewable file:
 * `python3 -c`/`python3 -` (inline or stdin-fed Python), `node -e` (inline JavaScript), or a
 * heredoc feeding a command its own script text. Such a call is listed, never scored as a hit: the
 * audit does not parse the interpreter's own source for a forbidden path.
 * @param command - The Bash command text.
 * @returns Why the command counts as an interpreter call, or undefined when it does not.
 */
function detectInterpreterCall(command: string): string | undefined {
  if (/\bpython3?\s+-c(\s|$)/.test(command)) return 'python3 -c runs inline Python the audit does not read';
  if (/\bpython3?\s+-(\s|$)/.test(command)) return 'python3 - runs a Python script fed over stdin';
  if (/\bnode\s+-e(\s|$)/.test(command)) return 'node -e runs inline JavaScript the audit does not read';
  if (/<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?/.test(command)) return 'a heredoc feeds a command its own script text';
  return undefined;
}

/**
 * Audit one Bash command: every path-like or glob token, in every `&&`/`;`-delimited segment,
 * must resolve, against that segment's own effective cwd, inside a granted directory, and the
 * command text must not mention a forbidden root by name. The effective cwd tracks every `cd`
 * target in the chain, in order (each resolved against the cwd the chain had reached so far), so
 * `cd a && cd b && cat x` checks `x` against `a/b`, not `a` alone. A command that runs interpreter
 * code is listed apart, never scored as a hit.
 * @param command - The Bash command text, exactly as the tool call gave it.
 * @param granted - The granted directories, resolved.
 * @param recordCwd - The transcript record's own `cwd` field, when it carries one.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the command produced, and any interpreter call it ran.
 */
function auditBashCommand(command: string, granted: readonly string[], recordCwd: string | undefined, homeDir: string): { hits: AuditHit[]; interpreterCalls: InterpreterCall[] } {
  const excerpt = command.length > COMMAND_EXCERPT_LENGTH ? `${command.slice(0, COMMAND_EXCERPT_LENGTH)}…` : command;
  const hits: AuditHit[] = [];
  let cwd = recordCwd;
  for (const segment of command.split(/&&|;/)) {
    const trimmed = segment.trim();
    for (const token of extractCommandTokens(trimmed)) {
      const resolvedPath = resolvePathValue(token.effective, cwd, homeDir);
      if (resolvedPath === undefined) {
        hits.push({ source: 'bash', command: excerpt, reason: `command references relative path "${token.raw}" and this record carries no cwd to resolve it against` });
        continue;
      }
      if (!isContainedIn(resolvedPath, granted)) {
        hits.push({ source: 'bash', command: excerpt, path: resolvedPath, reason: `command references a path outside every granted directory: ${token.raw}` });
      }
    }
    const cdMatch = /^cd\s+(\S+)/.exec(trimmed);
    if (cdMatch) {
      const target = cdMatch[1].replace(/^['"]+|['"]+$/g, '');
      cwd = resolvePathValue(target, cwd, homeDir) ?? cwd;
    }
  }
  for (const marker of applicableMarkers(granted)) {
    if (command.includes(marker)) {
      hits.push({ source: 'bash', command: excerpt, reason: `command mentions the forbidden path "${marker}"` });
    }
  }
  const interpreterReason = detectInterpreterCall(command);
  return { hits, interpreterCalls: interpreterReason ? [{ command: excerpt, reason: interpreterReason }] : [] };
}

/**
 * Audit one tool call: a Bash call is scanned as a command string; a Read, Write, or Edit call is
 * checked on its `file_path`; a Grep or Glob call is checked on its `path` (the effective cwd
 * itself, when the call omits `path` entirely, since that is where the tool then searches) and,
 * when it carries a real directory component, the directory prefix of a Glob `pattern` or a Grep
 * `glob`. Any other tool name is not path-bearing and produces no hit.
 * @param name - The tool call's own name, such as `Read` or `Bash`.
 * @param input - The tool call's `input` object.
 * @param granted - The granted directories, resolved.
 * @param cwd - The transcript record's own `cwd` field, when it carries one.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the call produced.
 */
export function auditToolCall(
  name: string,
  input: Record<string, unknown>,
  granted: readonly string[],
  cwd: string | undefined,
  homeDir: string = homedir(),
): { hits: AuditHit[]; interpreterCalls: InterpreterCall[] } {
  if (name === 'Bash') {
    const command = typeof input.command === 'string' ? input.command : '';
    return command === '' ? { hits: [], interpreterCalls: [] } : auditBashCommand(command, granted, cwd, homeDir);
  }
  const hits: AuditHit[] = [];
  const check = (field: string, raw: string | undefined) => {
    if (raw === undefined) return;
    const resolvedPath = resolvePathValue(raw, cwd, homeDir);
    if (resolvedPath === undefined) {
      hits.push({ source: 'tool', tool: name, reason: `${name} ${field} "${raw}" is relative and this record carries no cwd to resolve it against` });
      return;
    }
    if (!isContainedIn(resolvedPath, granted)) {
      hits.push({ source: 'tool', tool: name, path: resolvedPath, reason: `${name} ${field} is outside every granted directory` });
    }
  };
  const stringField = (field: string): string | undefined => (typeof input[field] === 'string' && (input[field] as string).trim() !== '' ? (input[field] as string) : undefined);
  if (name === 'Read' || name === 'Write' || name === 'Edit') {
    check('file_path', stringField('file_path'));
  } else if (name === 'Grep' || name === 'Glob') {
    // A missing path means the tool searches the effective cwd itself, so that cwd is what gets checked.
    check('path', stringField('path') ?? cwd);
    const patternField = name === 'Glob' ? 'pattern' : 'glob';
    const rawPattern = stringField(patternField);
    if (rawPattern !== undefined) {
      const prefix = globPatternDirPrefix(rawPattern);
      if (prefix !== '') check(patternField, prefix);
    }
  }
  return { hits, interpreterCalls: [] };
}

/**
 * Audit a whole transcript: every `tool_use` block in every assistant message, resolved against
 * that record's own `cwd`.
 * @param path - The transcript's `.jsonl` path.
 * @param granted - The agent's granted directories.
 * @param homeDir - The home directory `~` expands to.
 * @returns Every hit the transcript produced, and every interpreter call it ran, in file order.
 */
export function auditTranscript(path: string, granted: readonly string[], homeDir: string = homedir()): { hits: AuditHit[]; interpreterCalls: InterpreterCall[] } {
  const resolvedGranted = granted.map((dir) => normalize(resolve(dir)));
  const hits: AuditHit[] = [];
  const interpreterCalls: InterpreterCall[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    const cwd = typeof record.cwd === 'string' ? record.cwd : undefined;
    const message = record.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block === null || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type !== 'tool_use') continue;
      const name = typeof b.name === 'string' ? b.name : '';
      const input = (b.input ?? {}) as Record<string, unknown>;
      const result = auditToolCall(name, input, resolvedGranted, cwd, homeDir);
      hits.push(...result.hits);
      interpreterCalls.push(...result.interpreterCalls);
    }
  }
  return { hits, interpreterCalls };
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
  const { hits, interpreterCalls } = auditTranscript(resolve(transcript), granted);
  for (const hit of hits) process.stdout.write(`${JSON.stringify(hit)}\n`);
  for (const call of interpreterCalls) process.stdout.write(`unaudited interpreter call: ${JSON.stringify(call)}\n`);
  process.stdout.write(`${hits.length} hit(s)\n`);
  return hits.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
