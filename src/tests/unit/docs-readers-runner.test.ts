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
      'ruleCandidates', 'denials', 'proxyBlocked', 'packageFetches', 'usage', 'verified', 'attempts',
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
    expect(job.attempts).toHaveLength(1);
    expect(job.attempts?.[0]).toMatchObject({ cause: 'initial', final: true, transcript: 'transcripts/a-attempt1.jsonl' });
    expect(transcripts['a-attempt1.jsonl']).toContain('"type":"result"');
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
    const { report, transcripts } = await runBatch({
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
    // Job b was still in flight when job a's auth failure stopped the batch: the runner's own
    // stop cut it short, not a counted attempt, so it carries stoppedBy and no attempts, and its
    // in-flight transcript is saved under the "-stopped-" name rather than an attempt number.
    expect(report.jobs[1]).toMatchObject({ stoppedBy: 'auth', pendingCause: 'initial' });
    expect(report.jobs[1]).not.toHaveProperty('attempts');
    expect(transcripts).toHaveProperty(`b-stopped-r3.jsonl`);
  });

  it('stops with auth before any job when the pre-batch token check fails', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') }, { check: fixture('auth-failure.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'r4' });
    expect(report.stopReason).toBe('auth');
    expect(executor.started).toEqual([]);
    expect(report.jobs[0]).toMatchObject({ outcome: 'aborted', abortReason: 'auth' });
  });

  it('stops with rateLimit on a rejected rate-limit response, and records the stop on the job it never started', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('rate-limit.jsonl'), b: fixture('clean-docs-only.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a', 'b']), classes, baselines, executor, ledger, runId: 'r5' });
    expect(report.stopReason).toBe('rateLimit');
    expect(executor.started).toEqual(['a']);
    expect(report.jobs.map((j: { abortReason?: string }) => j.abortReason)).toEqual(['rateLimit', 'rateLimit']);
    // Job a itself hit the rate limit mid-run: the run was cut short, not a counted attempt, so it
    // carries stoppedBy and no attempts. Job b never started: the same shape.
    expect(report.jobs[0].stoppedBy).toBe('rateLimit');
    expect(report.jobs[0].pendingCause).toBe('initial');
    expect(report.jobs[0]).not.toHaveProperty('attempts');
    expect(report.jobs[1].stoppedBy).toBe('rateLimit');
    expect(report.jobs[1]).not.toHaveProperty('attempts');
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

describe('runBatch: the automatic rerun', () => {
  const clean = fixture('clean-docs-only.jsonl');
  const cleanStdout = clean.map((e) => JSON.stringify(e)).join('\n');

  it('reruns once when the first attempt is unverified, and marks the clean second attempt final', async () => {
    let calls = 0;
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        calls += 1;
        for (const event of clean) onEvent(event);
        // The first attempt's canary "loaded": unverified. The second attempt's canary never appears.
        const canaries = calls === 1 ? ['Install the tool'] : ['canary-unused'];
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries, timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, runId: 'rerun-1' });
    const job = report.jobs[0];
    expect(job.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['unverified', true],
    ]);
    expect(job.attempts?.map((a) => a.transcript)).toEqual(['transcripts/a-attempt1.jsonl', 'transcripts/a-attempt2.jsonl']);
    expect(job.verified.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('stops after its one rerun when both attempts stay unverified, and the final attempt carries the failure', async () => {
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        for (const event of clean) onEvent(event);
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries: ['Install the tool'], timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, runId: 'rerun-2' });
    const job = report.jobs[0];
    expect(job.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['unverified', true],
    ]);
    expect(job.verified.ok).toBe(false);
  });

  it('passes on the first attempt: exactly one attempt, no rerun', async () => {
    const { executor, ledger } = replayExecutor({ a: clean });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'rerun-3' });
    expect(report.jobs[0].attempts).toHaveLength(1);
    expect(report.jobs[0].attempts?.[0]).toMatchObject({ cause: 'initial', final: true });
  });

  it('reruns once after a timeout, and the clean rerun is final', async () => {
    let calls = 0;
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        calls += 1;
        if (calls === 1) {
          return { events: [], stdout: '', proxyLog: [], preparedRoot: PREPARED, canaries: [], timedOut: true, aborted: false, exitCode: null };
        }
        for (const event of clean) onEvent(event);
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries: ['canary-unused'], timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, runId: 'rerun-4' });
    const job = report.jobs[0];
    expect(job.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['timedOut', true],
    ]);
    expect(job.verified.ok).toBe(true);
  });

  it('reruns once when the first attempt produces no structured report, and the clean rerun is final', async () => {
    const noReport: Event[] = [{ type: 'result', is_error: false }];
    let calls = 0;
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        calls += 1;
        if (calls === 1) {
          for (const event of noReport) onEvent(event);
          return { events: noReport, stdout: '', proxyLog: [], preparedRoot: PREPARED, canaries: [], timedOut: false, aborted: false, exitCode: 0 };
        }
        for (const event of clean) onEvent(event);
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries: ['canary-unused'], timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, runId: 'rerun-5' });
    const job = report.jobs[0];
    expect(job.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['noReport', true],
    ]);
    expect(job.verified.ok).toBe(true);
  });
});

describe('runBatch: the freeze stamp', () => {
  const freeze = { tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe', expectedModel: 'claude-opus-5-5' };

  it('stamps every report of a gated batch with the tag, manifest hash, and chain head', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'gate-1', freeze });
    expect(report.jobs[0].freeze).toEqual({ tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe' });
  });

  it('leaves an ungated batch’s reports with no freeze field', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'gate-2' });
    expect(report.jobs[0]).not.toHaveProperty('freeze');
  });

  it('marks a run unverified when its init event reports a model other than the manifest pins', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('clean-docs-only.jsonl') });
    const mismatched = { ...freeze, expectedModel: 'claude-sonnet-5' };
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'gate-3', freeze: mismatched });
    const first = report.jobs[0].attempts?.[0];
    expect(first?.verified.ok).toBe(false);
    expect(first?.verified.problems.some((p) => p.includes('init model'))).toBe(true);
  });

  it('marks a run unverified when a gated run reports no init model at all', async () => {
    const clean = fixture('clean-docs-only.jsonl');
    const noModelEvents = clean.map((e) => (e.type === 'system' && e.subtype === 'init' ? { ...e, model: undefined } : e));
    const { executor, ledger } = replayExecutor({ a: noModelEvents });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'gate-4', freeze });
    const first = report.jobs[0].attempts?.[0];
    expect(first?.verified.ok).toBe(false);
    expect(first?.verified.problems.some((p) => p.includes('init model missing'))).toBe(true);
  });

  it('stamps a stopped job’s report too', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('rate-limit.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'gate-5', freeze });
    expect(report.jobs[0]).toMatchObject({ stoppedBy: 'rateLimit', freeze: { tag: 'docs-reset-1b-freeze', manifestHash: 'deadbeef', chainHead: 'cafebabe' } });
  });
});

describe('runBatch: a stop mid-attempt versus a blocked rerun, and resuming each', () => {
  const clean = fixture('clean-docs-only.jsonl');
  const cleanStdout = clean.map((e) => JSON.stringify(e)).join('\n');

  it('a job cut mid-run carries no attempts, and the resumed run still gets its own full rerun allowance', async () => {
    const { executor, ledger } = replayExecutor({ a: fixture('rate-limit.jsonl') });
    const { report } = await runBatch({ batch: batchOf(['a']), classes, baselines, executor, ledger, runId: 'cut-1' });
    const job = report.jobs[0];
    expect(job.stoppedBy).toBe('rateLimit');
    expect(job.pendingCause).toBe('initial');
    expect(job).not.toHaveProperty('attempts');

    let calls = 0;
    const resumedExecutor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        calls += 1;
        for (const event of clean) onEvent(event);
        // The first resumed attempt still fails verification; being cut earlier cost it nothing.
        const canaries = calls === 1 ? ['Install the tool'] : ['canary-unused'];
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries, timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const resumeFrom = { a: { attempts: [], pendingCause: 'initial' as const } };
    const resumed = await runBatch({ batch: batchOf(['a']), classes, baselines, executor: resumedExecutor, runId: 'cut-2', resumeFrom });
    const resumedJob = resumed.report.jobs[0];
    expect(resumedJob.attempts?.map((a) => [a.cause, a.final])).toEqual([
      ['initial', false],
      ['unverified', true],
    ]);
    expect(resumedJob.verified.ok).toBe(true);
  });

  it('a rerun the batch budget blocks stays a counted, non-final attempt, and resumes with exactly one more attempt, consuming no saved attempt again', async () => {
    const initEvent = clean.find((e) => e.type === 'system' && e.subtype === 'init');
    if (!initEvent) throw new Error('the clean fixture must carry an init event');
    // An event stream whose live, mid-flight usage and its own final `modelUsage` total agree
    // exactly on `counted`, so the budget arithmetic below is exact rather than a fixture-specific
    // estimate; an empty `quotes[]` makes the outcome unverified (it wants a rerun) without
    // depending on any particular page content.
    const unverifiedEvents = (counted: number): Event[] => [
      initEvent,
      { type: 'assistant', message: { id: 'm1', content: [], usage: { input_tokens: counted, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } },
      {
        type: 'result',
        is_error: false,
        structured_output: { outcome: 'done', stalls: [], assumed: [], quotes: [], steps: [], diverged: [], ruleCandidates: [] },
        modelUsage: { 'claude-opus-5-5': { inputTokens: counted, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 } },
      },
    ];
    const attempt1 = unverifiedEvents(1600);
    const attempt1Stdout = attempt1.map((e) => JSON.stringify(e)).join('\n');
    const executor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        for (const event of attempt1) onEvent(event);
        return { events: attempt1, stdout: attempt1Stdout, proxyLog: [], preparedRoot: PREPARED, canaries: [], timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    // The token check counts 100; attempt 1 counts 1600, exhausting a 1700-token budget the
    // instant it settles, before attempt 2's own pre-check can let it start.
    const { report } = await runBatch({ batch: batchOf(['a'], { budgetTokens: 100 + 1600 }), classes, baselines, executor, runId: 'blocked-1' });
    const job = report.jobs[0];
    expect(job.stoppedBy).toBe('budget');
    expect(job.pendingCause).toBe('unverified');
    expect(job.attempts).toHaveLength(1);
    expect(job.attempts?.[0]).toMatchObject({ cause: 'initial', final: false });

    let calls = 0;
    const resumedExecutor = {
      checkToken: async () => ({ events: okCheck, stdout: '' }),
      run: async (_job: unknown, _decl: unknown, { onEvent }: { onEvent: (e: Event) => void }) => {
        calls += 1;
        for (const event of clean) onEvent(event);
        return { events: clean, stdout: cleanStdout, proxyLog: [], preparedRoot: PREPARED, canaries: ['canary-unused'], timedOut: false, aborted: false, exitCode: 0 };
      },
    };
    const resumeFrom = { a: { attempts: job.attempts ?? [], pendingCause: job.pendingCause ?? ('initial' as const) } };
    const resumed = await runBatch({
      batch: batchOf(['a'], { budgetTokens: 1_000_000 }),
      classes,
      baselines,
      executor: resumedExecutor,
      runId: 'blocked-2',
      resumeFrom,
    });
    expect(calls).toBe(1);
    const resumedJob = resumed.report.jobs[0];
    expect(resumedJob.attempts).toHaveLength(2);
    expect(resumedJob.attempts?.[1]).toMatchObject({ cause: 'unverified', final: true });
    expect(resumedJob.verified.ok).toBe(true);
  });
});
