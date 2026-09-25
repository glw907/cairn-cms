import { describe, it, expect, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defaultTasksDir,
  discoverSubagentTranscripts,
  discoverTaskOutputs,
  filterRunnerEntriesSince,
  findSessionPath,
  mainRepoRoot,
  projectSlug,
  runIdTime,
  scanTranscriptMessages,
  sessionLedgerTotal,
  worktreeSlugs,
} from '../../../scripts/docs-readers/session-ledger.js';
import { readLedger } from '../../../scripts/docs-readers/lib/ledger.js';
import type { LedgerEntry } from '../../../scripts/docs-readers/lib/types.js';

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

describe('runIdTime', () => {
  it('parses run.ts’s own YYYYMMDDtHHMMSS-xxxxxx stamp', () => {
    const time = runIdTime('20260924t210000-abc123');
    expect(time?.toISOString()).toBe('2026-09-24T21:00:00.000Z');
  });

  it('parses a trailing epoch-millisecond suffix, as a one-off live check’s run id carries', () => {
    const time = runIdTime('live-judge-1790313952676');
    expect(time?.getTime()).toBe(1790313952676);
  });

  it('returns undefined for a run id carrying neither form', () => {
    expect(runIdTime('fixture')).toBeUndefined();
    expect(runIdTime('token-check')).toBeUndefined();
  });
});

describe('filterRunnerEntriesSince', () => {
  /** A minimal ledger entry, for the since-filter tests. */
  function entry(runId: string, batch = 'fixture'): LedgerEntry {
    return { batch, runId, job: 'a', model: 'claude-opus-5-5', usage: { input: 1, output: 1, cacheCreation: 0, cacheRead: 0 } };
  }

  it('keeps a stamp-form run id at or after since, and drops one before it', () => {
    const { kept, unparsedCount } = filterRunnerEntriesSince(
      [entry('20260924t210000-abc123'), entry('20260924t185959-abc124')],
      '2026-09-24T21:00:00.000Z',
    );
    expect(kept.map((e) => e.runId)).toEqual(['20260924t210000-abc123']);
    expect(unparsedCount).toBe(0);
  });

  it('keeps an epoch-suffix run id at or after since', () => {
    const { kept } = filterRunnerEntriesSince([entry('live-judge-1790313952676')], '2026-09-24T00:00:00.000Z');
    expect(kept).toHaveLength(1);
  });

  it('drops, and counts, a run id with no parseable time, rather than guessing', () => {
    const { kept, unparsedCount } = filterRunnerEntriesSince([entry('token-check'), entry('(token-check)')], '2026-09-24T00:00:00.000Z');
    expect(kept).toEqual([]);
    expect(unparsedCount).toBe(2);
  });
});

describe('--batch filtering via main', () => {
  it('keeps only the named batch’s runner-ledger entries', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'docs-readers-session-ledger-batch-'));
    const sessionPath = join(dir, 'empty-session.jsonl');
    writeFileSync(sessionPath, '');
    const ledgerPath = join(dir, 'ledger.jsonl');
    writeFileSync(
      ledgerPath,
      [
        { batch: 'validation', runId: 'r1', job: 'a', model: 'claude-opus-5-5', usage: { input: 10, output: 0, cacheCreation: 0, cacheRead: 0 } },
        { batch: 'baseline', runId: 'r2', job: 'a', model: 'claude-opus-5-5', usage: { input: 20, output: 0, cacheCreation: 0, cacheRead: 0 } },
      ]
        .map((e) => JSON.stringify(e))
        .join('\n') + '\n',
    );
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const { main } = await import('../../../scripts/docs-readers/session-ledger.js');
      main(['--session', sessionPath, '--runner-ledger', ledgerPath, '--batch', 'validation']);
      const output = JSON.parse(write.mock.calls.map(([chunk]) => chunk).join(''));
      expect(output.bySource.runner).toMatchObject({ counted: 10, messages: 1 });
    } finally {
      write.mockRestore();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('worktreeSlugs and findSessionPath', () => {
  it('lists each worktree directory’s own slug', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'docs-readers-session-ledger-project-'));
    const worktreesDir = join(projectRoot, '.claude', 'worktrees');
    mkdirSync(join(worktreesDir, 'pass-a'), { recursive: true });
    mkdirSync(join(worktreesDir, 'pass-b'), { recursive: true });
    try {
      expect(worktreeSlugs(projectRoot).sort()).toEqual([projectSlug(join(worktreesDir, 'pass-a')), projectSlug(join(worktreesDir, 'pass-b'))].sort());
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('finds a session filed under a worktree’s own slug when the main slug does not have it', () => {
    const projectsRoot = mkdtempSync(join(tmpdir(), 'docs-readers-session-ledger-projects-'));
    const projectRoot = mkdtempSync(join(tmpdir(), 'docs-readers-session-ledger-root-'));
    const worktreeDir = join(projectRoot, '.claude', 'worktrees', 'pass-a');
    mkdirSync(worktreeDir, { recursive: true });
    const worktreeSlug = projectSlug(worktreeDir);
    mkdirSync(join(projectsRoot, worktreeSlug), { recursive: true });
    writeFileSync(join(projectsRoot, worktreeSlug, 'sess-1.jsonl'), '');
    try {
      expect(findSessionPath(projectsRoot, projectRoot, 'sess-1')).toBe(join(projectsRoot, worktreeSlug, 'sess-1.jsonl'));
    } finally {
      rmSync(projectsRoot, { recursive: true, force: true });
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });

  it('falls back to the main checkout’s own slug path when no slug holds the session', () => {
    const projectsRoot = mkdtempSync(join(tmpdir(), 'docs-readers-session-ledger-projects-'));
    const projectRoot = '/does/not/exist';
    try {
      expect(findSessionPath(projectsRoot, projectRoot, 'sess-none')).toBe(join(projectsRoot, projectSlug(projectRoot), 'sess-none.jsonl'));
    } finally {
      rmSync(projectsRoot, { recursive: true, force: true });
    }
  });
});
