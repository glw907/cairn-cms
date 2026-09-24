/**
 * Reading a reader's `stream-json` transcript: the init check, the tool calls and what they
 * touched, the refusals, the fetches of cairn's own package or repository, the usage, and the
 * failure that should stop a batch.
 */
import { posix } from 'node:path';
import type {
  ContentBlock,
  Denial,
  Failure,
  InitBaseline,
  InitCheck,
  PackageFetch,
  ReaderReport,
  StreamEvent,
  ToolCall,
  Usage,
} from './types.js';

/** The working directory every reader runs in, inside its container. */
export const READER_CWD = '/reader/job';

/** Assistant `error` values that mean the credential or account is unusable. */
const AUTH_ERRORS = new Set([
  'authentication_failed',
  'oauth_org_not_allowed',
  'account_on_hold',
  'verification_required',
  'billing_error',
  'cloud_credential_error',
]);

/**
 * Split a stream into events, one JSON object per line.
 * @param text - The raw stdout of a `claude -p --output-format stream-json` run.
 * @returns The parsed events and a count of lines that were not JSON.
 */
export function parseStream(text: string): { events: StreamEvent[]; unparsed: number } {
  const events: StreamEvent[] = [];
  let unparsed = 0;
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      unparsed += 1;
    }
  }
  return { events, unparsed };
}

/**
 * Find the session's init event.
 * @param events - The parsed stream.
 * @returns The init event, or undefined when the run never started.
 */
export function findInit(events: StreamEvent[]): StreamEvent | undefined {
  return events.find((e) => e.type === 'system' && e.subtype === 'init');
}

/**
 * Find the final result event.
 * @param events - The parsed stream.
 * @returns The last result event, or undefined when the run was cut off.
 */
export function findResult(events: StreamEvent[]): StreamEvent | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].type === 'result') return events[i];
  }
  return undefined;
}

/**
 * Compare two name lists as sets.
 * @param a - One list.
 * @param b - The other list.
 * @returns True when both hold the same names.
 */
function sameNames(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  const left = [...new Set((a ?? []).map((x) => JSON.stringify(x)))].sort();
  const right = [...new Set((b ?? []).map((x) => JSON.stringify(x)))].sort();
  return left.length === right.length && left.every((name, i) => name === right[i]);
}

/**
 * Check a run's init event against its class and the pinned baseline for its CLI version.
 * @param init - The init event, or undefined.
 * @param expectedTools - The tool names the class declaration implies.
 * @param baselines - The pinned baselines, keyed by CLI version.
 * @returns Whether the init matches, and each mismatch found.
 */
export function checkInit(
  init: StreamEvent | undefined,
  expectedTools: string[],
  baselines: Record<string, InitBaseline>,
): InitCheck {
  if (!init) return { ok: false, problems: ['no init event'] };
  const problems: string[] = [];
  if (!sameNames(init.tools, expectedTools)) {
    problems.push(`tools ${JSON.stringify(init.tools)} differ from the class's ${JSON.stringify(expectedTools)}`);
  }
  if (!Array.isArray(init.mcp_servers) || init.mcp_servers.length > 0) {
    problems.push(`mcp_servers is not empty: ${JSON.stringify(init.mcp_servers)}`);
  }
  if (init.apiKeySource !== 'none') problems.push(`apiKeySource is ${JSON.stringify(init.apiKeySource)}, not "none"`);
  const baseline = baselines[init.claude_code_version ?? ''];
  if (!baseline) {
    problems.push(`no pinned init baseline for CLI ${init.claude_code_version}`);
  } else {
    if (!sameNames(init.skills, baseline.skills)) {
      problems.push(`skills ${JSON.stringify(init.skills)} differ from the pinned baseline`);
    }
    if (!sameNames(init.plugins, baseline.plugins)) {
      problems.push(`plugins ${JSON.stringify(init.plugins)} differ from the pinned baseline`);
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Flatten a tool result's content to text.
 * @param content - A `tool_result` content field: a string or an array of blocks.
 * @returns The text it carries.
 */
function resultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((block: ContentBlock | undefined) => (typeof block?.text === 'string' ? block.text : '')).join('\n');
  return '';
}

/**
 * Pair each tool call with its result.
 * @param events - The parsed stream.
 * @returns One entry per tool call, in call order.
 */
export function toolCalls(events: StreamEvent[]): ToolCall[] {
  const calls: ToolCall[] = [];
  const byId = new Map<string, ToolCall>();
  for (const event of events) {
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (event.type === 'assistant' && block?.type === 'tool_use' && block.id && !byId.has(block.id)) {
        const call: ToolCall = { id: block.id, name: block.name ?? '', input: block.input ?? {} };
        byId.set(block.id, call);
        calls.push(call);
      } else if (event.type === 'user' && block?.type === 'tool_result') {
        const call = byId.get(block.tool_use_id ?? '');
        if (call) call.result = { isError: block.is_error === true, text: resultText(block.content) };
      }
    }
  }
  return calls;
}

/**
 * Turn a path the reader used into a path relative to its working directory. A relative `path` is
 * resolved against `cwd`, defaulting to `READER_CWD`; an already-absolute `path` ignores `cwd`
 * entirely, the same as a real shell.
 * @param path - An absolute or relative path from a tool input or output.
 * @param cwd - The directory a relative `path` is resolved against.
 * @returns The relative path, or undefined when it points outside the working directory.
 */
export function toReaderRelative(path: unknown, cwd: string = READER_CWD): string | undefined {
  if (typeof path !== 'string' || path === '') return undefined;
  const absolute = posix.resolve(cwd, path);
  if (absolute === READER_CWD) return '.';
  if (!absolute.startsWith(`${READER_CWD}/`)) return undefined;
  return absolute.slice(READER_CWD.length + 1);
}

/**
 * Extract a `cd DIR` target from one shell segment, split the same way `shellPagesRead` splits a
 * Bash command into segments. `cd` with no argument or `cd -` returns undefined, since resolving
 * home or "the previous directory" needs history this module does not track.
 * @param segment - One `&&`/`;`/`|`/newline-separated segment of a Bash command.
 * @returns The raw `cd` target, or undefined when this segment is not a plain `cd`.
 */
function cdTarget(segment: string): string | undefined {
  const words = segment
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^['"]|['"]$/g, ''));
  if (words[0] !== 'cd' || !words[1] || words[1] === '-') return undefined;
  return words[1];
}

/**
 * The cwd after running one Bash command from `cwd`, applying every `cd` its own segments
 * contain, left to right, clamped so the result never climbs outside `READER_CWD` itself.
 * @param command - The Bash command line.
 * @param cwd - The cwd before this command ran.
 * @returns The cwd after this command ran.
 */
function applyCd(command: string, cwd: string): string {
  let current = cwd;
  for (const segment of String(command).split(/&&|\|\||[;|\n]/)) {
    const target = cdTarget(segment);
    if (target === undefined) continue;
    const resolved = posix.resolve(current, target);
    current = resolved === READER_CWD || resolved.startsWith(`${READER_CWD}/`) ? resolved : READER_CWD;
  }
  return current;
}

/**
 * The reader's shell cwd by the end of the transcript. The CLI's Bash tool shares one persistent
 * shell across calls, so a `cd` in one call still holds for the structured report the reader gives
 * at the end, and for every relative path in it. Starts at `READER_CWD` and applies every Bash
 * call's own `cd` in order; never resolves outside `READER_CWD`.
 * @param calls - The paired tool calls, in call order.
 * @returns The cwd in effect after the last Bash call.
 */
export function effectiveCwd(calls: ToolCall[]): string {
  let cwd = READER_CWD;
  for (const call of calls) {
    if (call.name === 'Bash' && typeof call.input.command === 'string') cwd = applyCd(call.input.command, cwd);
  }
  return cwd;
}

/**
 * Whether a relative path is one of the job's pages.
 * @param rel - A path relative to the working directory.
 * @param docsSet - The job's docs-set entries (files, or directories that hold pages).
 * @returns True when the path is a docs-set file or sits under a docs-set directory.
 */
export function isPage(rel: string | undefined, docsSet: string[]): rel is string {
  if (!rel || rel === '.') return false;
  return docsSet.some((entry) => rel === entry || rel.startsWith(`${entry}/`));
}

/**
 * Turn a simple glob (`*` and `?` wildcards, every other character literal) into a predicate over
 * a bare file name.
 * @param glob - The glob pattern, such as `troubleshoot*.md` or a literal file name.
 * @returns A predicate that is true when a name matches the glob.
 */
function globMatcher(glob: string): (name: string) => boolean {
  const pattern = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  const re = new RegExp(`^${pattern}$`);
  return (name) => re.test(name);
}

/**
 * The one docs-set page a Grep call was scoped to search, or undefined when its own scope could
 * span more than one file. `path` alone must resolve to exactly one docs-set page; `path` paired
 * with a `glob` must resolve to a directory in which the glob matches exactly one docs-set page's
 * own file name. A directory search with no glob, the whole job root (an unset or `.` path), or a
 * glob that still matches more than one docs-set page there, is NOT scoped to any one page: each
 * can print a hit line naming a page the reader never asked to open, incidentally cross-referenced
 * by whatever line matched, and that must not count as reading it.
 * @param call - The Grep tool call.
 * @param docsSet - The job's docs-set entries.
 * @returns The page this call was scoped to, or undefined.
 */
function grepScopedPage(call: ToolCall, docsSet: string[]): string | undefined {
  const target = toReaderRelative(call.input.path ?? '.');
  if (target !== undefined && isPage(target, docsSet) && /\.[A-Za-z0-9]+$/.test(target)) return target;
  const glob = call.input.glob;
  if (target === undefined || typeof glob !== 'string' || glob.trim() === '') return undefined;
  const matchesName = globMatcher(glob);
  const inTargetDir = docsSet.filter((page) => {
    const slash = page.lastIndexOf('/');
    const dir = slash === -1 ? '.' : page.slice(0, slash);
    return dir === target && matchesName(slash === -1 ? page : page.slice(slash + 1));
  });
  return inTargetDir.length === 1 ? inTargetDir[0] : undefined;
}

/** Shell commands that print a file's contents. */
const SHELL_READERS = new Set(['cat', 'head', 'tail', 'less', 'more', 'sed', 'awk', 'grep', 'rg', 'nl', 'bat']);

/**
 * The pages a shell command printed. The CLI runs read-only commands inside the working directory
 * without an allow rule, so a reader with Bash can read a page with `cat` as easily as with Read.
 * @param command - The Bash command line.
 * @param docsSet - The job's docs-set entries.
 * @returns The relative paths of the pages it names after a file-printing command.
 */
function shellPagesRead(command: unknown, docsSet: string[]): string[] {
  const pages: string[] = [];
  for (const segment of String(command).split(/&&|\|\||[;|\n]/)) {
    const words = segment.trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ''));
    if (!SHELL_READERS.has(words[0])) continue;
    for (const word of words.slice(1)) {
      const rel = word.startsWith('-') ? undefined : toReaderRelative(word);
      if (isPage(rel, docsSet)) pages.push(rel);
    }
  }
  return pages;
}

/**
 * The pages a reader read: its Read calls, its content-mode Grep calls scoped to exactly one
 * page, and its Bash commands that print a page. A Grep whose own scope spans more than one file
 * counts nothing, even when a hit line happens to name a docs-set page (`grepScopedPage`); a Grep
 * that only listed file names or counted matches read nothing; a failed call read nothing.
 * @param calls - The paired tool calls.
 * @param docsSet - The job's docs-set entries.
 * @returns The sorted relative paths of the pages read.
 */
export function derivePagesRead(calls: ToolCall[], docsSet: string[]): string[] {
  const pages = new Set<string>();
  for (const call of calls) {
    if (!call.result || call.result.isError) continue;
    if (call.name === 'Bash') {
      for (const rel of shellPagesRead(call.input.command, docsSet)) pages.add(rel);
    } else if (call.name === 'Read') {
      const rel = toReaderRelative(call.input.file_path);
      if (isPage(rel, docsSet)) pages.add(rel);
    } else if (call.name === 'Grep' && call.input.output_mode === 'content') {
      const text = call.result.text;
      if (text.trim() === '' || /^No matches found/i.test(text.trim())) continue;
      const page = grepScopedPage(call, docsSet);
      if (page) pages.add(page);
    }
  }
  return [...pages].sort();
}

/**
 * Keep a tool input short enough to report.
 * @param input - A tool input object.
 * @returns Its JSON, truncated.
 */
function excerpt(input: unknown): string {
  const text = JSON.stringify(input ?? {});
  return text.length > 400 ? `${text.slice(0, 400)}...` : text;
}

/**
 * The refused calls: the CLI's own `permission_denials`, plus any call to a tool the session did
 * not have (the CLI answers it with an error, and it never reaches a permission check).
 * @param events - The parsed stream.
 * @param calls - The paired tool calls.
 * @returns One entry per refusal.
 */
export function collectDenials(events: StreamEvent[], calls: ToolCall[]): Denial[] {
  const denials: Denial[] = [];
  const result = findResult(events);
  for (const denial of result?.permission_denials ?? []) {
    denials.push({ source: 'permission', tool: denial.tool_name, input: excerpt(denial.tool_input) });
  }
  const available = new Set(findInit(events)?.tools ?? []);
  for (const call of calls) {
    if (!available.has(call.name)) denials.push({ source: 'unavailable-tool', tool: call.name, input: excerpt(call.input) });
  }
  return denials;
}

/** Patterns that name a fetch of cairn's own package, repository, or published docs. */
const FETCH_PATTERNS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:view|info|show|v|install|i|add|pack|exec|dlx|create|init)\b[^\n]*@glw907\/cairn-cms\b/,
  /\bnpx\s+[^\n]*@glw907\/cairn-cms\b/,
  /registry\.(?:npmjs\.org|yarnpkg\.com)\/@glw907(?:\/|%2f)cairn-cms/i,
  /npmjs\.com\/package\/@glw907\/cairn-cms/,
  /(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/@glw907\/cairn-cms/,
  /github\.com[/:]glw907\/cairn-cms\b/,
  /api\.github\.com\/repos\/glw907\/cairn-cms\b/,
  /raw\.githubusercontent\.com\/glw907\/cairn-cms\b/,
  /\bcairn\.pub\b/,
];

/**
 * The calls that fetched, or tried to fetch, cairn's own package or repository. Only what a call
 * sent is scanned, never what came back, so a page that merely names the package does not count.
 * @param calls - The paired tool calls.
 * @returns One entry per matching call.
 */
export function findPackageFetches(calls: ToolCall[]): PackageFetch[] {
  const fetches: PackageFetch[] = [];
  for (const call of calls) {
    const sent = [call.input.command, call.input.url, call.input.query, call.input.prompt]
      .filter((v) => typeof v === 'string')
      .join('\n');
    const pattern = FETCH_PATTERNS.find((p) => p.test(sent));
    const match = pattern?.exec(sent);
    if (match) fetches.push({ tool: call.name, input: excerpt(call.input), match: match[0] });
  }
  return fetches;
}

/**
 * A zeroed usage record.
 * @returns Usage with every count at zero.
 */
export function emptyUsage(): Usage {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
}

/**
 * Read one API response's usage block.
 * @param usage - An Anthropic `usage` object.
 * @returns The four counts.
 */
function fromApiUsage(usage: StreamEvent['usage']): Usage {
  return {
    input: usage?.input_tokens ?? 0,
    output: usage?.output_tokens ?? 0,
    cacheCreation: usage?.cache_creation_input_tokens ?? 0,
    cacheRead: usage?.cache_read_input_tokens ?? 0,
  };
}

/**
 * The run's usage. The result event's `modelUsage` covers every model the session called and is
 * preferred; a run cut off before its result falls back to the assistant messages, counted once
 * per message id since the stream repeats a message's usage on each of its content blocks.
 * @param events - The parsed stream.
 * @returns The four counts.
 */
export function usageFromEvents(events: StreamEvent[]): Usage {
  const result = findResult(events);
  if (result?.modelUsage && Object.keys(result.modelUsage).length > 0) {
    const total = emptyUsage();
    for (const model of Object.values(result.modelUsage)) {
      total.input += model.inputTokens ?? 0;
      total.output += model.outputTokens ?? 0;
      total.cacheCreation += model.cacheCreationInputTokens ?? 0;
      total.cacheRead += model.cacheReadInputTokens ?? 0;
    }
    return total;
  }
  if (result?.usage) return fromApiUsage(result.usage);
  return assistantUsage(events);
}

/**
 * The usage the assistant messages report so far, one count per message id. The runner tracks a
 * live job's spend with this before its result arrives.
 * @param events - The events seen so far.
 * @returns The four counts.
 */
export function assistantUsage(events: StreamEvent[]): Usage {
  const byMessage = new Map<string, Usage>();
  for (const event of events) {
    if (event.type === 'assistant' && event.message?.id && event.message.usage) {
      byMessage.set(event.message.id, fromApiUsage(event.message.usage));
    }
  }
  const total = emptyUsage();
  for (const usage of byMessage.values()) {
    total.input += usage.input;
    total.output += usage.output;
    total.cacheCreation += usage.cacheCreation;
    total.cacheRead += usage.cacheRead;
  }
  return total;
}

/**
 * Classify one event as a batch-stopping failure.
 * @param event - One stream event.
 * @returns `auth`, `rateLimit`, or undefined.
 */
export function eventFailure(event: StreamEvent): Failure | undefined {
  if (event.type === 'assistant' && typeof event.error === 'string') {
    if (AUTH_ERRORS.has(event.error)) return 'auth';
    if (event.error === 'rate_limit') return 'rateLimit';
  }
  if (event.type === 'system' && event.subtype === 'api_retry') {
    if (event.error === 'authentication_failed' || event.error_status === 401) return 'auth';
  }
  if (event.type === 'rate_limit_event' && event.rate_limit_info?.status === 'rejected') return 'rateLimit';
  if (event.type === 'result' && event.is_error === true) {
    if (event.api_error_status === 401 || event.api_error_status === 403) return 'auth';
    if (event.api_error_status === 429) return 'rateLimit';
  }
  return undefined;
}

/**
 * The first batch-stopping failure in a transcript.
 * @param events - The parsed stream.
 * @returns `auth`, `rateLimit`, or undefined.
 */
export function classifyFailure(events: StreamEvent[]): Failure | undefined {
  for (const event of events) {
    const failure = eventFailure(event);
    if (failure) return failure;
  }
  return undefined;
}

/**
 * The reader's structured report, when it returned one of the right shape.
 * @param events - The parsed stream.
 * @returns The report fields, or undefined.
 */
export function readerReport(events: StreamEvent[]): ReaderReport | undefined {
  const raw = findResult(events)?.structured_output;
  if (!raw || typeof raw !== 'object') return undefined;
  const output = raw as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v : undefined);
  if (output.outcome !== 'done' && output.outcome !== 'stalled' && output.outcome !== 'refused') return undefined;
  const stalls = list(output.stalls);
  const assumed = list(output.assumed);
  const quotes = list(output.quotes);
  const ruleCandidates = list(output.ruleCandidates);
  if (!stalls || !assumed || !quotes || !ruleCandidates) return undefined;
  return { outcome: output.outcome, stalls, assumed, quotes, ruleCandidates };
}

/**
 * Find canary strings in a transcript.
 * @param text - The raw transcript.
 * @param canaries - The strings that must not appear.
 * @returns The canaries that appear.
 */
export function findCanaries(text: string, canaries: string[]): string[] {
  return canaries.filter((canary) => text.includes(canary));
}
