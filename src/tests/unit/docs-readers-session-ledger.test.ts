import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultTasksDir,
  discoverSubagentTranscripts,
  discoverTaskOutputs,
  mainRepoRoot,
  projectSlug,
  scanTranscriptMessages,
  sessionLedgerTotal,
} from '../../../scripts/docs-readers/session-ledger.js';
import { readLedger } from '../../../scripts/docs-readers/lib/ledger.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/session-ledger');

describe('scanTranscriptMessages', () => {
  it('reads every usage-bearing assistant message and skips a non-assistant line', () => {
    const entries = scanTranscriptMessages(join(FIXTURES, 'session.jsonl'));
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.messageId)).toEqual(['msg-1', 'msg-1', 'msg-2']);
    expect(entries[2].usage).toEqual({ input: 20, output: 8, cacheCreation: 4, cacheRead: 50 });
  });

  it('returns nothing for a file that does not exist', () => {
    expect(scanTranscriptMessages(join(FIXTURES, 'missing.jsonl'))).toEqual([]);
  });
});

describe('sessionLedgerTotal', () => {
  it('counts a repeated message id once, reports cache reads apart, and sums the runner ledger on top', () => {
    const sessionEntries = scanTranscriptMessages(join(FIXTURES, 'session.jsonl'));
    const subagentEntries = scanTranscriptMessages(join(FIXTURES, 'session', 'subagents', 'agent-a.jsonl'));
    const runnerEntries = readLedger(join(FIXTURES, 'runner-ledger.jsonl'));
    const total = sessionLedgerTotal({ sessionEntries, subagentEntries, runnerEntries });

    // Session: msg-1 (10 in + 5 out, counted once despite two lines) + msg-2 (20 in + 8 out + 4
    // cache creation) = 47 counted, cache reads 150 (100 + 50).
    expect(total.bySource.session).toMatchObject({ counted: 47, cacheRead: 150, messages: 2 });
    // Subagent msg-2 duplicates the session's own msg-2, so only sub-msg-1 (3 in + 1 out) counts here.
    expect(total.bySource.subagents).toMatchObject({ counted: 4, cacheRead: 0, messages: 1 });
    expect(total.bySource.runner).toMatchObject({ counted: 150, cacheRead: 10, messages: 1 });
    expect(total.counted).toBe(47 + 4 + 150);
    expect(total.cacheRead).toBe(150 + 0 + 10);
  });
});

describe('projectSlug and mainRepoRoot', () => {
  it('turns a repository path into its projects-directory slug', () => {
    expect(projectSlug('/var/home/glw907/Projects/cairn-cms')).toBe('-var-home-glw907-Projects-cairn-cms');
  });

  it('recovers the main checkout root from a pass worktree’s own cwd', () => {
    expect(mainRepoRoot('/var/home/glw907/Projects/cairn-cms/.claude/worktrees/docs-reset-1b-runner')).toBe('/var/home/glw907/Projects/cairn-cms');
    expect(mainRepoRoot('/var/home/glw907/Projects/cairn-cms')).toBe('/var/home/glw907/Projects/cairn-cms');
  });
});

describe('discoverSubagentTranscripts and discoverTaskOutputs', () => {
  it('lists the fixture session’s own subagents/*.jsonl files', () => {
    const files = discoverSubagentTranscripts(join(FIXTURES, 'session.jsonl'));
    expect(files).toEqual([join(FIXTURES, 'session', 'subagents', 'agent-a.jsonl')]);
  });

  it('returns nothing for a tasks directory that does not exist', () => {
    expect(discoverTaskOutputs(join(FIXTURES, 'no-such-tasks-dir'))).toEqual([]);
  });
});

describe('defaultTasksDir', () => {
  it('names the workstation’s own tmp tasks directory for a session, by this process’s uid', () => {
    const uid = typeof process.getuid === 'function' ? process.getuid() : 1000;
    const dir = defaultTasksDir('/var/home/glw907/Projects/cairn-cms', 'e4f32f69-aaf9-43b0-ad47-92d96aaf09a4');
    expect(dir).toBe(`/tmp/claude-${uid}/-var-home-glw907-Projects-cairn-cms/e4f32f69-aaf9-43b0-ad47-92d96aaf09a4/tasks`);
  });
});

// Sanity check that the fixture file itself parses as JSON lines, so a future edit to it cannot
// silently break the tests above without a clear failure here first.
describe('the fixture session file', () => {
  it('is valid JSON lines', () => {
    const lines = readFileSync(join(FIXTURES, 'session.jsonl'), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow();
  });
});
