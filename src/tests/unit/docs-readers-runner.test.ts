import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPORT_REQUEST, composePrompt, runBatch } from '../../../scripts/docs-readers/lib/runner.js';
import { loadClasses } from '../../../scripts/docs-readers/lib/class-schema.js';
import { parseBatch } from '../../../scripts/docs-readers/lib/batch.js';
import { parseStream } from '../../../scripts/docs-readers/lib/transcript.js';
import type { LedgerEntry, StreamEvent } from '../../../scripts/docs-readers/lib/types.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIXTURES = join(ROOT, 'scripts/docs-readers/fixtures/transcripts');
const PREPARED = join(ROOT, 'scripts/docs-readers/fixtures/prepared');
const baselines = JSON.parse(readFileSync(join(ROOT, 'scripts/docs-readers/init-baseline.json'), 'utf8'));
const classes = loadClasses();

type Event = StreamEvent;
const fixture = (name: string): Event[] => parseStream(readFileSync(join(FIXTURES, name), 'utf8')).events;
const okCheck: Event[] = [
  { type: 'result', is_error: false, modelUsage: { haiku: { inputTokens: 100, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } } },
];

/** A batch of docs-only jobs over the fixture pages. */
function batchOf(ids: string[], extra: Record<string, unknown> = {}) {
  return parseBatch(
    {
      name: 'fixture',
      concurrency: 1,
      budgetTokens: 1_000_000,
      jobs: ids.map((id) => ({ id, class: 'docs-only', model: 'claude-opus-5-5', arrival: 'Arrival.', job: 'Job.', docsSet: ['docs'] })),
      ...extra,
    },
    classes,
  );
}

/**
 * An executor that replays fixture streams event by event, yielding between events and stopping
 * when the runner aborts it, as the podman executor does.
 */
function replayExecutor(streams: Record<string, Event[]>, { check = okCheck, canaries = ['canary-unused'] } = {}) {
  const started: string[] = [];
  const ledger: LedgerEntry[] = [];
  const executor = {
    started,
    checkToken: async () => ({ events: check, stdout: '' }),
    run: async (job: { id: string }, _decl: unknown, { signal, onEvent }: { signal: AbortSignal; onEvent: (e: Event) => void }) => {
      started.push(job.id);
      const events: Event[] = [];
      for (const event of streams[job.id]) {
        if (signal.aborted) break;
        events.push(event);
        onEvent(event);
        await new Promise((r) => setTimeout(r, 1));
      }
      const stdout = events.map((e) => JSON.stringify(e)).join('\n');
      const proxyLog = [{ decision: 'blocked', method: 'CONNECT', target: 'example.org:443', reason: 'not-allowlisted', time: 't' }];
      return { events, stdout, proxyLog, preparedRoot: PREPARED, canaries, timedOut: false, aborted: signal.aborted, exitCode: 0 };
    },
  };
  return { executor, ledger: { append: (e: LedgerEntry) => void ledger.push(e) }, entries: ledger };
}

describe('composePrompt', () => {
  it('puts the arrival state, the job, and the report request on stdin', () => {
    const prompt = composePrompt({ arrival: ' You arrive. ', job: 'Do the thing.' });
    expect(prompt).toBe(`You arrive.\n\nDo the thing.\n\n${REPORT_REQUEST}\n`);
  });
});

describe('runBatch', () => {
  it('completes a clean batch with a verified report of the fixed shape, and ledgers every run', async () => {
    const { executor, ledger, entries } = replayExecutor({ a: fixture('clean-docs-only.jsonl') });
    const { report, transcripts } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'r1' });
    expect(report.stopReason).toBe('complete');
    expect(report.verified).toBe(true);
    const job = report.jobs[0];
    expect(Object.keys(job)).toEqual([
      'id', 'class', 'model', 'initModel', 'outcome', 'stalls', 'assumed', 'pagesRead', 'quotes', 'steps', 'diverged', 'checks',
      'ruleCandidates', 'denials', 'proxyBlocked', 'packageFetches', 'usage', 'verified',
    ]);
    expect(job).toMatchObject({
      outcome: 'done',
      initModel: 'claude-opus-5-5',
      pagesRead: ['docs/guide.md', 'docs/other.md'],
      denials: [{ source: 'permission', tool: 'Read' }],
      proxyBlocked: [{ method: 'CONNECT', target: 'example.org:443', reason: 'not-allowlisted' }],
      packageFetches: [],
      usage: { input: 9, output: 120, cacheCreation: 1500, cacheRead: 3000, counted: 1629 },
    });
    expect(job.quotes.every((q: { ok: boolean }) => q.ok)).toBe(true);
    expect(job.steps).toEqual([]);
    expect(job.diverged).toEqual([]);
    expect(entries.map((e) => e.job)).toEqual(['(token-check)', 'a']);
    expect(report.usage).toMatchObject({ counted: 1729, cacheRead: 3000 });
    expect(transcripts.a).toContain('"type":"result"');
  });

  it('stops with auth when the token fails mid-batch, and reports no job as stalled', async () => {
    const { executor, ledger } = replayExecutor({
      a: fixture('clean-docs-only.jsonl'),
      b: fixture('auth-failure.jsonl'),
      c: fixture('clean-docs-only.jsonl'),
    });
    const { report } = await runBatch({ batch: batchOf(['a', 'b', 'c']), classes, baselines, executor, ledger, runId: 'r2' });
    expect(report.stopReason).toBe('auth');
    expect(executor.started).toEqual(['a', 'b']);
    expect(report.jobs.map((j: { outcome: string; abortReason?: string }) => [j.outcome, j.abortReason])).toEqual([
      ['done', undefined],
      ['aborted', 'auth'],
      ['aborted', 'auth'],
    ]);
    expect(report.jobs.some((j: { outcome: string }) => j.outcome === 'stalled')).toBe(false);
    expect(report.verified).toBe(false);
  });

  it('aborts a job still in flight when another job hits the auth failure', async () => {
    const slow = fixture('clean-docs-only.jsonl');
    const { executor, ledger } = replayExecutor({ a: fixture('auth-failure.jsonl'), b: [...slow, ...slow, ...slow] });
    const { report } = await runBatch({
      batch: batchOf(['a', 'b'], { concurrency: 2 }),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'r3',
    });
    expect(report.stopReason).toBe('auth');
    expect(report.jobs.map((j: { outcome: string; abortReason?: string }) => [j.outcome, j.abortReason])).toEqual([
      ['aborted', 'auth'],
      ['aborted', 'auth'],
    ]);
  });

  it('stops with auth before any job when the pre-batch token check fails', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') }, { check: fixture('auth-failure.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'r4' });
    expect(report.stopReason).toBe('auth');
    expect(executor.started).toEqual([]);
    expect(report.jobs[0]).toMatchObject({ outcome: 'aborted', abortReason: 'auth' });
  });

  it('stops with rateLimit on a rejected rate-limit response', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('rate-limit.jsonl'), b: fixture('clean-docs-only.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a', 'b']), classes, baselines, executor, ledger, runId: 'r5' });
    expect(report.stopReason).toBe('rateLimit');
    expect(executor.started).toEqual(['a']);
    expect(report.jobs.map((j: { abortReason?: string }) => j.abortReason)).toEqual(['rateLimit', 'rateLimit']);
  });

  it('stops with budget when live usage passes the batch budget, cutting the running job short', async () => {
    // The token check counts 100; each assistant message in the fixture counts 543.
    const { executor, ledger, entries } = replayExecutor({ a: fixture('clean-docs-only.jsonl'), b: fixture('clean-docs-only.jsonl') });
    const { report } = await runBatch({
      batch: batchOf(['a', 'b'], { budgetTokens: 1500 }),
      classes,
      baselines,
      executor,
      ledger,
      runId: 'r6',
    });
    expect(report.stopReason).toBe('budget');
    expect(executor.started).toEqual(['a']);
    expect(report.jobs.map((j: { outcome: string; abortReason?: string }) => [j.outcome, j.abortReason])).toEqual([
      ['aborted', 'budget'],
      ['aborted', 'budget'],
    ]);
    // The cut-short job is ledgered from its assistant messages: three of them at 543 each.
    expect(entries.map((e) => e.job)).toEqual(['(token-check)', 'a']);
    expect(report.usage.counted).toBe(100 + 3 * 543);
  });

  it('halts on an executor throw: aborts the job in flight, starts no further job, and rejects only once workers settle', async () => {
    const started: string[] = [];
    let inFlightSettled = false;
    let inFlightAborted = false;
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (job: { id: string }, _decl: unknown, { signal }: { signal: AbortSignal }) => {
        started.push(job.id);
        if (job.id === 'a') {
          await new Promise((r) => setTimeout(r, 5));
          throw new Error('prepare failed for a');
        }
        // Job b stays in flight until the runner aborts it, then takes a moment to wind down.
        await new Promise<void>((r) => signal.addEventListener('abort', () => r(), { once: true }));
        inFlightAborted = true;
        await new Promise((r) => setTimeout(r, 20));
        inFlightSettled = true;
        return { events: [], stdout: '', proxyLog: [], preparedRoot: PREPARED, timedOut: false, aborted: true };
      },
    };
    const run = runBatch({ batch: batchOf(['a', 'b', 'c'], { concurrency: 2 }), classes, baselines, executor, runId: 'r8' });
    await expect(run).rejects.toThrow('prepare failed for a');
    expect(started).toEqual(['a', 'b']);
    expect(inFlightAborted).toBe(true);
    expect(inFlightSettled).toBe(true);
  });

  it('halts on the external halt signal and starts no further job', async () => {
    const halt = new AbortController();
    const started: string[] = [];
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (job: { id: string }, _decl: unknown, { signal }: { signal: AbortSignal }) => {
        started.push(job.id);
        halt.abort();
        await new Promise<void>((r) => (signal.aborted ? r() : signal.addEventListener('abort', () => r(), { once: true })));
        return { events: [], stdout: '', proxyLog: [], preparedRoot: PREPARED, timedOut: false, aborted: true };
      },
    };
    const run = runBatch({ batch: batchOf(['a', 'b']), classes, baselines, executor, runId: 'r9', halt: halt.signal });
    await expect(run).rejects.toThrow('batch halted before it finished');
    expect(started).toEqual(['a']);
  });

  it('fails verification when a canary string reaches the transcript', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') }, { canaries: ['Install the tool'] });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'r7' });
    expect(report.stopReason).toBe('complete');
    expect(report.jobs[0].verified).toMatchObject({ ok: false, canaries: false });
  });
});
