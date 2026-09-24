import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StreamEvent } from '../../../scripts/docs-readers/lib/types.js';
import {
  checkInit,
  classifyFailure,
  collectDenials,
  derivePagesRead,
  effectiveCwd,
  findInit,
  findPackageFetches,
  grepHitPages,
  parseStream,
  readerReport,
  splitShellSegments,
  toolCalls,
  toReaderRelative,
  usageFromEvents,
} from '../../../scripts/docs-readers/lib/transcript.js';
import type { ToolCall } from '../../../scripts/docs-readers/lib/types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/transcripts');
const baselines = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-readers/init-baseline.json'), 'utf8'));
const load = (name: string) => parseStream(readFileSync(join(FIXTURES, name), 'utf8')).events;
const DOCS_TOOLS = ['Glob', 'Grep', 'Read', 'StructuredOutput'];

describe('checkInit', () => {
  const found = findInit(load('clean-docs-only.jsonl'));
  if (!found) throw new Error('the clean fixture must open with an init event');
  const init: StreamEvent = found;

  it('passes an init that matches the class tools and the pinned baseline', () => {
    expect(checkInit(init, DOCS_TOOLS, baselines)).toEqual({ ok: true, problems: [] });
  });

  it('fails on an extra tool, an MCP server, an API key source, drifted skills or plugins, or no baseline', () => {
    const cases: Array<[Partial<StreamEvent>, RegExp]> = [
      [{ tools: [...DOCS_TOOLS, 'Bash'] }, /tools .* differ from the class's/],
      [{ mcp_servers: [{ name: 'x', status: 'connected' }] }, /mcp_servers is not empty/],
      [{ apiKeySource: 'ANTHROPIC_API_KEY' }, /apiKeySource is "ANTHROPIC_API_KEY"/],
      [{ skills: [...(init.skills ?? []), 'my-skill'] }, /skills .* differ from the pinned baseline/],
      [{ plugins: [{ name: 'telemetry' }] }, /plugins .* differ from the pinned baseline/],
      [{ claude_code_version: '9.9.9' }, /no pinned init baseline for CLI 9.9.9/],
    ];
    for (const [change, message] of cases) {
      const result = checkInit({ ...init, ...change }, DOCS_TOOLS, baselines);
      expect(result.ok).toBe(false);
      expect(result.problems.join('\n')).toMatch(message);
    }
    expect(checkInit(undefined, DOCS_TOOLS, baselines).problems).toEqual(['no init event']);
  });
});

describe('derivePagesRead', () => {
  it('counts Read calls and a Grep scoped to exactly one file, and nothing else', () => {
    const calls = toolCalls(load('clean-docs-only.jsonl'));
    // guide.md is Read directly; other.md's Grep names it as the search path directly (a single-
    // file search). The files-only Grep (missing.md) and the failed out-of-directory Read are not reads.
    expect(derivePagesRead(calls, ['docs'])).toEqual(['docs/guide.md', 'docs/other.md']);
    expect(derivePagesRead(calls, ['docs/guide.md'])).toEqual(['docs/guide.md']);
  });

  it('counts a page printed through a Bash read command', () => {
    const calls = toolCalls(load('package-fetch.jsonl'));
    expect(derivePagesRead(calls, ['docs'])).toEqual(['docs/guide.md']);
  });

  it('resolves a shell read command against the cwd tracked at that call, after an earlier cd', () => {
    // After `cd site`, `cat ../docs/x.md` names a page one level above `site/`; resolving it
    // against READER_CWD itself (the earlier bug) climbs out of the job tree and misses it.
    const afterCd = [bash('cd site'), bash('cat ../docs/x.md')];
    expect(derivePagesRead(afterCd, ['docs/x.md'])).toEqual(['docs/x.md']);
  });

  it('applies a cd chained in the same call before resolving that call’s own read', () => {
    const chained = [bash('cd site && cat ../docs/x.md')];
    expect(derivePagesRead(chained, ['docs/x.md'])).toEqual(['docs/x.md']);
  });

  it('tracks cd across calls regardless of an intervening call’s own success', () => {
    // A failed command in between does not undo an earlier cd's effect on the shell's own cwd.
    const withFailure = [
      bash('cd site'),
      { id: 't', name: 'Bash', input: { command: 'npm test' }, result: { isError: true, text: 'boom' } },
      bash('cat ../docs/x.md'),
    ];
    expect(derivePagesRead(withFailure, ['docs/x.md'])).toEqual(['docs/x.md']);
  });

  /** A minimal Grep call, `output_mode: content`, its `path`/`glob` and result text overridable. */
  function grepCall(input: Record<string, unknown>, text: string) {
    return { id: 't', name: 'Grep', input: { pattern: 'x', output_mode: 'content', ...input }, result: { isError: false, text } };
  }

  it('does not count a hit inside a broadly-scoped search, even when the hit line names a docs-set page (operator-2’s shape)', () => {
    // A directory-wide (or whole-job-root) search can print a hit line that names a page the
    // reader never asked to open on its own, incidentally cross-referenced by whatever line
    // matched; that must not count as reading it.
    const wholeDocsSet = grepCall({ path: '/reader/job/docs' }, 'docs/troubleshooting.md:3:send_email');
    expect(derivePagesRead([wholeDocsSet], ['docs/troubleshooting.md', 'docs/setup-recovery.md'])).toEqual([]);
    const wholeJobRoot = grepCall({}, 'docs/troubleshooting.md:3:send_email');
    expect(derivePagesRead([wholeJobRoot], ['docs/troubleshooting.md'])).toEqual([]);
  });

  it('counts a Grep whose own path names exactly one docs-set page', () => {
    const call = grepCall({ path: '/reader/job/docs/2026-09-23-notes.md' }, '4:x marks it');
    expect(derivePagesRead([call], ['docs/2026-09-23-notes.md'])).toEqual(['docs/2026-09-23-notes.md']);
    expect(derivePagesRead([grepCall({}, 'No matches found')], ['docs'])).toEqual([]);
  });

  it('counts a Grep whose path plus a literal glob names exactly one docs-set page', () => {
    const call = grepCall({ path: '/reader/job/docs', glob: 'troubleshooting.md' }, '3:send_email');
    expect(derivePagesRead([call], ['docs/troubleshooting.md', 'docs/setup-recovery.md'])).toEqual(['docs/troubleshooting.md']);
  });

  it('counts a Grep whose path plus a wildcard glob narrows to exactly one docs-set page, but not one that still matches several', () => {
    const narrow = grepCall({ path: '/reader/job/docs', glob: 'trouble*.md' }, '3:send_email');
    expect(derivePagesRead([narrow], ['docs/troubleshooting.md', 'docs/setup-recovery.md'])).toEqual(['docs/troubleshooting.md']);
    const wide = grepCall({ path: '/reader/job/docs', glob: '*.md' }, '3:send_email');
    expect(derivePagesRead([wide], ['docs/troubleshooting.md', 'docs/setup-recovery.md'])).toEqual([]);
  });
});

describe('splitShellSegments', () => {
  it('does not split inside a single-quoted pattern carrying a literal escaped pipe', () => {
    expect(splitShellSegments("grep -E 'a\\|b' docs/guide.md")).toEqual(["grep -E 'a\\|b' docs/guide.md"]);
  });

  it('still splits on an unquoted pipe, semicolon, &&, ||, and newline', () => {
    expect(splitShellSegments('a | b')).toEqual(['a ', ' b']);
    expect(splitShellSegments('a; b')).toEqual(['a', ' b']);
    expect(splitShellSegments('a && b')).toEqual(['a ', ' b']);
    expect(splitShellSegments('a || b')).toEqual(['a ', ' b']);
    expect(splitShellSegments('a\nb')).toEqual(['a', 'b']);
  });

  it('does not end a double-quoted span early on an escaped quote', () => {
    expect(splitShellSegments('echo "a \\" b | c"')).toEqual(['echo "a \\" b | c"']);
  });

  it('lets a page read through a grep whose quoted pattern carries an escaped pipe still reach pagesRead', () => {
    // Before the fix, the split on a bare `[;|\n]` character class cut inside the quotes, at the
    // escaped pipe, so the page name landed in a later segment whose own first word ("b'") was
    // never a shell reader and the read was missed entirely.
    const call = bash("grep -E 'a\\|b' docs/guide.md");
    expect(derivePagesRead([call], ['docs/guide.md'])).toEqual(['docs/guide.md']);
  });
});

/** A minimal Bash tool call running `command`, paired with a successful, empty result. */
function bash(command: string): ToolCall {
  return { id: 't', name: 'Bash', input: { command }, result: { isError: false, text: '' } };
}

describe('grepHitPages', () => {
  /** A minimal content-mode Grep call, its `path`/`glob` and result text overridable. */
  function grepCall(input: Record<string, unknown>, text: string): ToolCall {
    return { id: 't', name: 'Grep', input: { pattern: 'x', output_mode: 'content', ...input }, result: { isError: false, text } };
  }

  it('keys a hit line by page and line number, whose hit surfaced through a broadly-scoped search unlike derivePagesRead', () => {
    const wholeDocsSet = grepCall({ path: '/reader/job/docs' }, 'docs/troubleshooting.md:3:send_email');
    expect(grepHitPages([wholeDocsSet], ['docs/troubleshooting.md'])).toEqual(new Set(['docs/troubleshooting.md:3']));
  });

  it('keys a context line (the dash-separated shape -A/-B/-C print) the same way as a hit line', () => {
    const withContext = grepCall({ path: '/reader/job/docs' }, 'docs/troubleshooting.md-2-before the match\ndocs/troubleshooting.md:3:send_email\ndocs/troubleshooting.md-4-after the match');
    expect(grepHitPages([withContext], ['docs/troubleshooting.md'])).toEqual(
      new Set(['docs/troubleshooting.md:2', 'docs/troubleshooting.md:3', 'docs/troubleshooting.md:4']),
    );
  });

  it('names nothing from an empty result, a "No matches found" result, or a failed call', () => {
    expect(grepHitPages([grepCall({}, '')], ['docs/troubleshooting.md'])).toEqual(new Set());
    expect(grepHitPages([grepCall({}, 'No matches found')], ['docs/troubleshooting.md'])).toEqual(new Set());
    const failed = { id: 't', name: 'Grep', input: { pattern: 'x', output_mode: 'content' }, result: { isError: true, text: 'docs/troubleshooting.md:3:x' } };
    expect(grepHitPages([failed], ['docs/troubleshooting.md'])).toEqual(new Set());
  });

  it('ignores a hit line naming a path outside the docs set', () => {
    const call = grepCall({}, 'src/index.ts:3:x');
    expect(grepHitPages([call], ['docs/troubleshooting.md'])).toEqual(new Set());
  });
});

describe('effectiveCwd and cwd-aware toReaderRelative', () => {
  it('stays at READER_CWD with no Bash calls, or none that cd', () => {
    expect(effectiveCwd([])).toBe('/reader/job');
    expect(effectiveCwd([bash('ls')])).toBe('/reader/job');
  });

  it('tracks a cd across calls, in order, the way a persistent shell does (designer-1’s shape)', () => {
    const calls = [bash('cd site'), bash('npm run build')];
    expect(effectiveCwd(calls)).toBe('/reader/job/site');
    // A relative report quote given after cd'ing into site/ now resolves the way the reader meant it.
    expect(toReaderRelative('../docs/extend/design-your-site.md', effectiveCwd(calls))).toBe('docs/extend/design-your-site.md');
    expect(toReaderRelative('src/theme/theme.css', effectiveCwd(calls))).toBe('site/src/theme/theme.css');
  });

  it('applies a cd chained with && within one Bash call, and a later cd .. against the new cwd', () => {
    expect(effectiveCwd([bash('cd site && npm install')])).toBe('/reader/job/site');
    expect(effectiveCwd([bash('cd site'), bash('cd ..')])).toBe('/reader/job');
  });

  it('never resolves outside READER_CWD, however many levels a cd climbs', () => {
    expect(effectiveCwd([bash('cd ../../..')])).toBe('/reader/job');
    expect(effectiveCwd([bash('cd site'), bash('cd ../../../../etc')])).toBe('/reader/job');
  });

  it('ignores a bare cd and a cd -, since there is no tracked history to resolve them against', () => {
    expect(effectiveCwd([bash('cd site'), bash('cd'), bash('pwd')])).toBe('/reader/job/site');
    expect(effectiveCwd([bash('cd site'), bash('cd -')])).toBe('/reader/job/site');
  });
});

describe('collectDenials and findPackageFetches', () => {
  it('reports the CLI permission denials', () => {
    const events = load('clean-docs-only.jsonl');
    expect(collectDenials(events, toolCalls(events))).toEqual([
      { source: 'permission', tool: 'Read', input: '{"file_path":"/var/home/someone/.local/secrets"}' },
    ]);
  });

  it('reports a call to a tool the session did not have', () => {
    const events = load('clean-docs-only.jsonl');
    const calls = [...toolCalls(events), { id: 'x', name: 'WebFetch', input: { url: 'https://example.com' }, result: undefined }];
    expect(collectDenials(events, calls).at(-1)).toEqual({
      source: 'unavailable-tool',
      tool: 'WebFetch',
      input: '{"url":"https://example.com"}',
    });
  });

  it('flags a fetch of the published package and a clone of the repository, but not a local read', () => {
    const fetches = findPackageFetches(toolCalls(load('package-fetch.jsonl')));
    expect(fetches.map((f) => f.match)).toEqual(['npm view @glw907/cairn-cms', 'github.com/glw907/cairn-cms']);
    expect(fetches.every((f) => f.tool === 'Bash')).toBe(true);
  });
});

describe('usage and failures', () => {
  it('reads the four usage counts from the result event', () => {
    expect(usageFromEvents(load('clean-docs-only.jsonl'))).toEqual({ input: 9, output: 120, cacheCreation: 1500, cacheRead: 3000 });
  });

  it('falls back to one count per assistant message id when the result is missing', () => {
    const events = load('clean-docs-only.jsonl').filter((e) => e.type !== 'result');
    const repeated = [...events, ...events.filter((e) => e.type === 'assistant').slice(0, 1)];
    expect(usageFromEvents(repeated)).toEqual({ input: 15, output: 200, cacheCreation: 2500, cacheRead: 5000 });
  });

  it('classifies the captured invalid-token stream as auth and the rate-limit stream as rateLimit', () => {
    expect(classifyFailure(load('auth-failure.jsonl'))).toBe('auth');
    expect(classifyFailure(load('rate-limit.jsonl'))).toBe('rateLimit');
    expect(classifyFailure(load('clean-docs-only.jsonl'))).toBeUndefined();
  });

  it('extracts the structured report, and rejects one of the wrong shape', () => {
    expect(readerReport(load('clean-docs-only.jsonl'))?.quotes).toHaveLength(3);
    expect(readerReport(load('auth-failure.jsonl'))).toBeUndefined();
    const events = load('clean-docs-only.jsonl');
    events[events.length - 1].structured_output = { outcome: 'finished', stalls: [], assumed: [], quotes: [], ruleCandidates: [] };
    expect(readerReport(events)).toBeUndefined();
  });
});
