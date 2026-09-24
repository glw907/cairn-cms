/**
 * The batch runner's core. It schedules a batch's jobs under the concurrency limit, watches every
 * live stream for a batch-stopping failure or a budget overrun, and turns each finished run into
 * a verified job report. The container work lives behind an executor, so this module runs the
 * same way against podman and against the fixture executor the unit tests use.
 */
import {
  assistantUsage,
  checkInit,
  classifyFailure,
  collectDenials,
  derivePagesRead,
  emptyUsage,
  eventFailure,
  findCanaries,
  findInit,
  findPackageFetches,
  readerReport,
  toolCalls,
  usageFromEvents,
} from './transcript.js';
import { addUsage, countedTokens, reportUsage } from './ledger.js';
import { expectedTools } from './class-schema.js';
import { verifyReport } from './verify.js';
import { scrub } from './scrub.js';
import type {
  Batch,
  BatchReport,
  ClassDecl,
  Executor,
  InitBaseline,
  Job,
  JobReport,
  LedgerEntry,
  RunResult,
  StopReason,
  StreamEvent,
  Usage,
} from './types.js';

/** The JSON schema the reader's structured report must match. */
export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['done', 'stalled', 'refused'] },
    stalls: { type: 'array', items: { type: 'string' } },
    assumed: { type: 'array', items: { type: 'string' } },
    quotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { path: { type: 'string' }, line: { type: 'integer' }, text: { type: 'string' } },
        required: ['path', 'line', 'text'],
      },
    },
    ruleCandidates: { type: 'array', items: { type: 'string' } },
  },
  required: ['outcome', 'stalls', 'assumed', 'quotes', 'ruleCandidates'],
};

/** The closing request every job carries, phrased as a hand-off, never as a test. */
export const REPORT_REQUEST = [
  'When you are finished, hand back a short structured report:',
  '- outcome: "done" if you got the job done, "stalled" if you could not finish it, or "refused" if you decided not to do it;',
  '- stalls: each point where you got stuck, and what you were missing there;',
  '- assumed: each term, value, or step you had to guess because nothing you read told you;',
  '- quotes: for every documentation file you read, at least one line you relied on, given as the file path relative to your working directory, the 1-based line number (as the Read tool numbers it), and the exact text of that line;',
  '- ruleCandidates: anything you think the documentation should have told you and did not.',
].join('\n');

/**
 * The stdin text for one job.
 * @param job - A parsed batch job.
 * @returns The arrival state, the job, and the report request.
 */
export function composePrompt(job: Pick<Job, 'arrival' | 'job'>): string {
  return `${job.arrival.trim()}\n\n${job.job.trim()}\n\n${REPORT_REQUEST}\n`;
}

/**
 * Build one job's report from its finished run: the executor's `run` result, checked against the
 * job's class declaration `decl` and the pinned init `baselines`. `abortReason` says why the batch
 * cut the job short, when it did.
 * @returns The report object in the fixed shape, with its `verified` block.
 */
export function buildJobReport({
  job,
  decl,
  baselines,
  run,
  abortReason,
}: {
  job: Job;
  decl: ClassDecl;
  baselines: Record<string, InitBaseline>;
  run: RunResult;
  abortReason?: string;
}): JobReport {
  const events = run.events;
  const calls = toolCalls(events);
  const report = readerReport(events);
  const pagesRead = derivePagesRead(calls, job.docsSet);
  const init = checkInit(findInit(events), expectedTools(decl), baselines);
  const canariesFound = findCanaries(run.stdout, run.canaries ?? []);
  const verified = verifyReport({ report, pagesRead, docsSet: job.docsSet, root: run.preparedRoot, init, canariesFound });
  const failure = classifyFailure(events);
  const reason = failure ?? abortReason ?? (run.timedOut ? 'timeout' : undefined);
  if (reason) {
    verified.ok = false;
    verified.problems.unshift(`aborted: ${reason}`);
  }
  return {
    id: job.id,
    class: job.class,
    model: job.model,
    outcome: reason ? 'aborted' : (report?.outcome ?? 'error'),
    ...(reason ? { abortReason: reason } : {}),
    stalls: report?.stalls ?? [],
    assumed: report?.assumed ?? [],
    pagesRead,
    quotes: verified.quotes,
    checks: [],
    ruleCandidates: report?.ruleCandidates ?? [],
    denials: collectDenials(events, calls),
    proxyBlocked: (run.proxyLog ?? [])
      .filter((entry) => entry.decision === 'blocked')
      .map(({ method, target, reason: why, time }) => ({ method, target, reason: why, time })),
    packageFetches: findPackageFetches(calls),
    usage: reportUsage(usageFromEvents(events)),
    verified,
  };
}

/**
 * A report for a job the batch never started.
 * @param job - The parsed batch job.
 * @param reason - Why the batch stopped before it.
 * @returns The job report.
 */
function notStartedReport(job: Job, reason: string): JobReport {
  return {
    id: job.id,
    class: job.class,
    model: job.model,
    outcome: 'aborted',
    abortReason: reason,
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: reportUsage(emptyUsage()),
    verified: { ok: false, init: false, canaries: true, quotes: [], problems: [`aborted: ${reason}`, 'not started'] },
  };
}

/**
 * Run a batch. The `executor` runs the token check and each job's container; the `ledger` receives
 * one usage entry per run, tagged with `runId`; `secrets` are the values scrubbed from every
 * transcript. Aborting `halt` (the CLI does on SIGINT or SIGTERM) or an executor throwing halts
 * the batch: every in-flight job is aborted, no further job starts, and the promise rejects only
 * after every worker has settled, so the caller's teardown never races a worker still starting a
 * container.
 * @returns The batch report and each job's scrubbed transcript.
 */
export async function runBatch({
  batch,
  classes,
  baselines,
  executor,
  ledger,
  runId,
  secrets = [],
  halt,
}: {
  batch: Batch;
  classes: Map<string, ClassDecl>;
  baselines: Record<string, InitBaseline>;
  executor: Executor;
  ledger?: { append(entry: LedgerEntry): void };
  runId: string;
  secrets?: readonly unknown[];
  halt?: AbortSignal;
}): Promise<{ report: BatchReport; transcripts: Record<string, string> }> {
  let stopReason: StopReason | undefined;
  let spent = 0;
  let total = emptyUsage();
  const inFlight = new Map<string, { controller: AbortController; live: number; seen: StreamEvent[] }>();
  const reports: JobReport[] = new Array<JobReport>(batch.jobs.length);
  const transcripts: Record<string, string> = {};

  const abortInFlight = () => {
    for (const flight of inFlight.values()) flight.controller.abort();
  };
  const stop = (reason: StopReason) => {
    if (stopReason) return;
    stopReason = reason;
    abortInFlight();
  };
  let halted = false;
  let firstError: unknown;
  const haltAll = () => {
    halted = true;
    abortInFlight();
  };
  halt?.addEventListener('abort', haltAll, { once: true });
  if (halt?.aborted) haltAll();
  const liveSpend = () => [...inFlight.values()].reduce((sum, f) => sum + f.live, 0);
  const record = (jobId: string, model: string, usage: Usage) => {
    total = addUsage(total, usage);
    spent += countedTokens(usage);
    ledger?.append({ batch: batch.name, runId, job: jobId, model, usage });
  };

  const check = await executor.checkToken();
  record('(token-check)', 'token-check', usageFromEvents(check.events));
  const checkFailure = classifyFailure(check.events);
  if (checkFailure) {
    stop(checkFailure);
  } else if (check.events.find((e) => e.type === 'result')?.is_error !== false) {
    // Not a credential or rate-limit signal, so no stop reason fits; the runner itself is broken.
    throw new Error('token check did not complete; see the runner log for the container output');
  }

  let next = 0;
  const work = async () => {
    while (!halted && next < batch.jobs.length) {
      const index = next;
      next += 1;
      const job = batch.jobs[index];
      if (!stopReason && spent + liveSpend() >= batch.budgetTokens) stop('budget');
      if (stopReason) {
        reports[index] = notStartedReport(job, stopReason);
        continue;
      }
      const decl = classes.get(job.class);
      if (!decl) throw new Error(`job ${job.id}: class ${job.class} is not declared`);
      const flight = { controller: new AbortController(), live: 0, seen: [] as StreamEvent[] };
      inFlight.set(job.id, flight);
      const onEvent = (event: StreamEvent) => {
        flight.seen.push(event);
        const failure = eventFailure(event);
        if (failure) {
          stop(failure);
          return;
        }
        if (event.type === 'assistant') {
          flight.live = countedTokens(assistantUsage(flight.seen));
          if (spent + liveSpend() > batch.budgetTokens) stop('budget');
        }
      };
      let run: RunResult;
      try {
        run = await executor.run(job, decl, {
          signal: flight.controller.signal,
          onEvent,
          prompt: composePrompt(job),
          reportSchema: REPORT_SCHEMA,
        });
      } finally {
        inFlight.delete(job.id);
      }
      record(job.id, job.model, usageFromEvents(run.events));
      const failure = classifyFailure(run.events);
      if (failure) stop(failure);
      const abortReason = run.aborted ? (stopReason ?? 'aborted') : undefined;
      reports[index] = buildJobReport({ job, decl, baselines, run, abortReason });
      transcripts[job.id] = scrub(run.stdout, secrets);
      await executor.release?.(job);
    }
  };
  const worker = async () => {
    try {
      await work();
    } catch (error) {
      firstError ??= error;
      haltAll();
    }
  };
  await Promise.allSettled(Array.from({ length: Math.min(batch.concurrency, batch.jobs.length) }, worker));
  halt?.removeEventListener('abort', haltAll);
  if (firstError !== undefined) throw firstError;
  if (halted) throw new Error('batch halted before it finished');

  return {
    report: {
      batch: batch.name,
      runId,
      stopReason: stopReason ?? 'complete',
      budgetTokens: batch.budgetTokens,
      usage: reportUsage(total),
      jobs: reports,
      verified: stopReason === undefined && reports.every((r) => r.verified.ok),
    },
    transcripts,
  };
}
