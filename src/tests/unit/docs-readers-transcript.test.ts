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
  findInit,
  findPackageFetches,
  parseStream,
  readerReport,
  toolCalls,
  usageFromEvents,
} from '../../../scripts/docs-readers/lib/transcript.js';

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
  it('counts Read calls and content-mode Grep hits inside the docs set, and nothing else', () => {
    const calls = toolCalls(load('clean-docs-only.jsonl'));
    // The files-only Grep (missing.md) and the failed out-of-directory Read are not reads.
    expect(derivePagesRead(calls, ['docs'])).toEqual(['docs/guide.md', 'docs/other.md']);
    expect(derivePagesRead(calls, ['docs/guide.md'])).toEqual(['docs/guide.md']);
  });

  it('counts a page printed through a Bash read command', () => {
    const calls = toolCalls(load('package-fetch.jsonl'));
    expect(derivePagesRead(calls, ['docs'])).toEqual(['docs/guide.md']);
  });

  it('finds the page in a Grep line whose path holds digits, hyphens, and a context-line separator', () => {
    const call = (text: string) => ({
      id: 't',
      name: 'Grep',
      input: { pattern: 'x', output_mode: 'content' },
      result: { isError: false, text },
    });
    expect(derivePagesRead([call('docs/2026-09-23-notes.md:4:x marks it')], ['docs'])).toEqual(['docs/2026-09-23-notes.md']);
    expect(derivePagesRead([call('docs/a-1-b.md-12-context line')], ['docs'])).toEqual(['docs/a-1-b.md']);
    expect(derivePagesRead([call('No matches found')], ['docs'])).toEqual([]);
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
