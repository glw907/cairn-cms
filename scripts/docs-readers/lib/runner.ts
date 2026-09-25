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
  effectiveCwd,
  emptyUsage,
  eventFailure,
  findCanaries,
  findInit,
  findPackageFetches,
  grepHitPages,
  initModel,
  readerReport,
  toolCalls,
  usageFromEvents,
} from './transcript.js';
import { addUsage, countedTokens, reportUsage } from './ledger.js';
import { expectedTools, type JudgeKind } from './class-schema.js';
import { verifyReport } from './verify.js';
import { judgeOutput, judgeReportSchema, rulingsOf, verifyJudgeRulings, type ExpectedItem, type JudgeRulings, type JudgeVerified } from './judge-verify.js';
import { scrub } from './scrub.js';
import type {
  Attempt,
  AttemptCause,
  Batch,
  BatchReport,
  ClassDecl,
  Executor,
  FreezeStamp,
  InitBaseline,
  Job,
  JobReport,
  LedgerEntry,
  ReportUsage,
  RunOutcome,
  RunResult,
  StopReason,
  StreamEvent,
  Usage,
} from './types.js';

/**
 * The freeze a gated batch runs under: the stamp every report carries, plus the model id the
 * init event of a run under this batch's kind (reader, catch judge, adjudicator, or agreement)
 * must report. Undefined when the batch is not gated. `chainHead` is taken once, at the gate
 * check that runs before any container in this batch (or a resume of it) starts, since every
 * input this batch reads must already be in the chain before the batch starts: an entry appended
 * mid-batch would postdate the reports that read it, which is exactly what the chain's own
 * verification rejects.
 */
export interface GatedFreeze extends FreezeStamp {
  /** The manifest's model id for this batch's kind; a run whose init event reports a different one is unverified. */
  expectedModel?: string;
}

/** The most attempts the runner makes at one job: the initial run, and its one automatic rerun. */
const MAX_ATTEMPTS = 2;

/** A batch-level stop: every stop reason except a batch that ran to completion. */
type BatchStop = Exclude<StopReason, 'complete'>;

/**
 * The stamp a gated batch's reports carry, without the run-time-only expected model.
 * @param freeze - The gated batch's freeze.
 * @returns The report's `freeze` block.
 */
function freezeStamp(freeze: GatedFreeze): FreezeStamp {
  return { tag: freeze.tag, manifestHash: freeze.manifestHash, chainHead: freeze.chainHead };
}

/** The quote shape shared by `quotes[]` and every quote embedded in `steps[]` or `diverged[]`. */
const QUOTE_SCHEMA = {
  type: 'object',
  properties: { path: { type: 'string' }, line: { type: 'integer' }, text: { type: 'string' } },
  required: ['path', 'line', 'text'],
};

/** The shape shared by `stalls[]` and `assumed[]`: free text, plus what blocked the reader there. */
const BLOCKED_ENTRY_SCHEMA = {
  type: 'object',
  properties: { text: { type: 'string' }, blockedBy: { type: ['string', 'null'] } },
  required: ['text', 'blockedBy'],
};

/** The JSON schema the reader's structured report must match. */
export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['done', 'stalled', 'refused'] },
    stalls: { type: 'array', items: BLOCKED_ENTRY_SCHEMA },
    assumed: { type: 'array', items: BLOCKED_ENTRY_SCHEMA },
    quotes: { type: 'array', items: QUOTE_SCHEMA },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { quote: QUOTE_SCHEMA, decision: { type: 'string' } },
        required: ['quote', 'decision'],
      },
    },
    diverged: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: QUOTE_SCHEMA,
          didInstead: { type: 'string' },
          why: { type: 'string' },
          blockedBy: { type: ['string', 'null'] },
        },
        required: ['quote', 'didInstead', 'why', 'blockedBy'],
      },
    },
    ruleCandidates: { type: 'array', items: { type: 'string' } },
  },
  required: ['outcome', 'stalls', 'assumed', 'quotes', 'steps', 'diverged', 'ruleCandidates'],
};

/** The closing request every job carries, phrased as a hand-off, never as a test. */
export const REPORT_REQUEST = [
  'When you are finished, hand back a short structured report:',
  '- outcome: "done" if you got the job done, "stalled" if you could not finish it, or "refused" if you decided not to do it;',
  '- stalls: each point where you got stuck, as { text: what you were missing there, blockedBy: the command that was denied or the path that was missing, if that is what stopped you, otherwise null };',
  '- assumed: each term, value, or step you had to guess, as { text: what you assumed and why, blockedBy: the same field, when a denial or a missing path forced the guess, otherwise null };',
  '- quotes: for every documentation file you read, at least one line you relied on, given as the file path relative to your working directory, the exact text of that line, and the line number your Read tool printed beside that text\'s first words;',
  '- steps: each instruction you followed or statement you relied on for a decision, as { quote: the page:line quote it rests on, in the same form as above, decision: the decision it supported };',
  '- diverged: each place you did something other than what a page said, including a workaround that worked, as { quote: that page\'s quote, didInstead: what you did instead, why: why you diverged, blockedBy: the same field as above };',
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
 * Build one attempt's outcome from its finished run: the executor's `run` result, checked against
 * the job's class declaration `decl` and the pinned init `baselines`. `abortReason` says why the
 * batch cut the job short, when it did.
 * @returns The outcome, with its `verified` block, before any gating or rerun decision is layered on.
 */
export function buildRunOutcome({
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
}): RunOutcome {
  const events = run.events;
  const calls = toolCalls(events);
  const report = readerReport(events);
  const pagesRead = derivePagesRead(calls, job.docsSet);
  const init = checkInit(findInit(events), expectedTools(decl), baselines);
  const canariesFound = findCanaries(run.stdout, run.canaries ?? []);
  const cwd = effectiveCwd(calls);
  const grepHits = grepHitPages(calls, job.docsSet);
  const verified = verifyReport({ report, pagesRead, docsSet: job.docsSet, root: run.preparedRoot, init, canariesFound, cwd, grepHits });
  const failure = classifyFailure(events);
  const reason = failure ?? abortReason ?? (run.timedOut ? 'timeout' : undefined);
  if (reason) {
    verified.ok = false;
    verified.problems.unshift(`aborted: ${reason}`);
  }
  const model = initModel(events);
  return {
    ...(model !== undefined ? { initModel: model } : {}),
    outcome: reason ? 'aborted' : (report?.outcome ?? 'error'),
    ...(reason ? { abortReason: reason } : {}),
    stalls: report?.stalls ?? [],
    assumed: report?.assumed ?? [],
    pagesRead,
    quotes: verified.quotes,
    steps: verified.steps,
    diverged: verified.diverged,
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
 * The fields `checkFrozenModel` needs from any run outcome, reader or judge: never `RunOutcome`
 * itself, so a judge's outcome, which carries no quotes or pages, shares this one check.
 */
interface ModelCheckedOutcome {
  initModel?: string;
  verified: { ok: boolean; problems: string[] };
}

/**
 * Mark an outcome unverified when it carries no init model at all, or when its init event
 * reported a model other than the one a gated batch freezes for this kind of run. A missing
 * `expectedModel` means the batch is not gated, so the check never applies.
 * @param outcome - The outcome to check, mutated in place when the model is missing or differs.
 * @param expectedModel - The manifest's model id for this batch's kind, when the batch is gated.
 */
function checkFrozenModel(outcome: ModelCheckedOutcome, expectedModel: string | undefined): void {
  if (!expectedModel) return;
  if (outcome.initModel === undefined) {
    outcome.verified.ok = false;
    outcome.verified.problems.push('init model missing: the run reported no init event to check against the manifest');
    return;
  }
  if (outcome.initModel === expectedModel) return;
  outcome.verified.ok = false;
  outcome.verified.problems.push(`init model ${outcome.initModel} differs from the manifest's ${expectedModel}`);
}

/**
 * The fields `rerunCause` needs from any attempt outcome, reader or judge: a judge's `outcome`
 * field never carries `stalled` or `refused`, so this stays wider than `RunOutcome`.
 */
interface RerunCheckedOutcome {
  outcome: string;
  abortReason?: string;
  verified: { ok: boolean };
}

/**
 * Why an attempt should be rerun once, or undefined when its outcome should stand as final.
 * @param outcome - The attempt's outcome.
 * @param run - The raw run result behind it, whose exit code tells crashed apart from report-less.
 * @returns The cause the next attempt would carry, or undefined.
 */
function rerunCause(outcome: RerunCheckedOutcome, run: RunResult): AttemptCause | undefined {
  if (outcome.outcome === 'aborted') return outcome.abortReason === 'timeout' ? 'timedOut' : undefined;
  if (outcome.outcome === 'error') return run.exitCode ? 'crashed' : 'noReport';
  return outcome.verified.ok ? undefined : 'unverified';
}

/**
 * A report for a job a batch-level stop (a rate limit, an authentication failure, or a budget
 * stop) left without a final attempt: it never started, an attempt already in flight was cut
 * short, or a warranted rerun never got to start. This carries `stoppedBy` and `pendingCause`,
 * never a final attempt: a batch-level stop is the runner's own event, not a run the job made.
 * `attempts` lists whatever counted attempts this job did complete before the stop, omitted when
 * there are none.
 * @param job - The parsed batch job.
 * @param stoppedBy - What stopped the batch before this job settled.
 * @param pendingCause - The cause a resumed attempt at this job runs under.
 * @param attempts - The job's counted attempts so far, in order.
 * @param freeze - The gated batch's stamp, when the batch is gated.
 * @returns The job report.
 */
function stoppedReport(job: Job, stoppedBy: BatchStop, pendingCause: AttemptCause, attempts: Attempt[], freeze?: GatedFreeze): JobReport {
  return {
    id: job.id,
    class: job.class,
    model: job.model,
    outcome: 'aborted',
    abortReason: stoppedBy,
    stalls: [],
    assumed: [],
    pagesRead: [],
    quotes: [],
    steps: [],
    diverged: [],
    checks: [],
    ruleCandidates: [],
    denials: [],
    proxyBlocked: [],
    packageFetches: [],
    usage: reportUsage(emptyUsage()),
    verified: {
      ok: false,
      init: false,
      canaries: true,
      quotes: [],
      steps: [],
      diverged: [],
      problems: [`aborted: ${stoppedBy}`, attempts.length > 0 ? 'stopped before its rerun started' : 'not started'],
    },
    stoppedBy,
    pendingCause,
    ...(attempts.length > 0 ? { attempts } : {}),
    ...(freeze ? { freeze: freezeStamp(freeze) } : {}),
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
  freeze,
  resumeFrom,
}: {
  batch: Batch;
  classes: Map<string, ClassDecl>;
  baselines: Record<string, InitBaseline>;
  executor: Executor;
  ledger?: { append(entry: LedgerEntry): void };
  runId: string;
  secrets?: readonly unknown[];
  halt?: AbortSignal;
  /** The gated batch's freeze stamp and expected model, when this batch is gated; absent otherwise. */
  freeze?: GatedFreeze;
  /**
   * Each resumed job's counted attempts so far and the cause its next attempt runs under. A job
   * named here starts its loop at `attempts.length + 1` and prepends these attempts to its own, so
   * it never exceeds {@link MAX_ATTEMPTS} counted attempts and a transcript number never collides
   * with one the stopped run already wrote.
   */
  resumeFrom?: Record<string, { attempts: Attempt[]; pendingCause: AttemptCause }>;
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
      const resumed = resumeFrom?.[job.id];
      const priorAttempts = resumed?.attempts ?? [];
      if (!stopReason && spent + liveSpend() >= batch.budgetTokens) stop('budget');
      if (stopReason) {
        // A batch-level stop is the runner's own event, never an attempt at the job: `stopReason`
        // is 'complete' only after every job has settled, so it is always one of the three stop
        // kinds here.
        reports[index] = stoppedReport(job, stopReason as BatchStop, resumed?.pendingCause ?? 'initial', priorAttempts, freeze);
        continue;
      }
      const decl = classes.get(job.class);
      if (!decl) throw new Error(`job ${job.id}: class ${job.class} is not declared`);

      const attempts: Attempt[] = [...priorAttempts];
      let cause: AttemptCause = resumed?.pendingCause ?? 'initial';
      const startAttempt = priorAttempts.length + 1;
      let stopped: { stoppedBy: BatchStop; pendingCause: AttemptCause } | undefined;

      for (let attemptNumber = startAttempt; attemptNumber <= MAX_ATTEMPTS; attemptNumber += 1) {
        if (attemptNumber > startAttempt) {
          // The same budget pre-check a job's own first attempt gets in this run, applied before
          // its rerun too, so a rerun cannot silently start once the batch is already over budget.
          if (!stopReason && spent + liveSpend() >= batch.budgetTokens) stop('budget');
          if (stopReason) {
            stopped = { stoppedBy: stopReason as BatchStop, pendingCause: cause };
            break;
          }
        }
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
        // A batch-level stop cut this very run short, either because it triggered the stop
        // itself or because a sibling job's stop aborted it in flight: neither is a counted
        // attempt (the runner's own stop, not a run the job made), so it never joins attempts[].
        if (stopReason !== undefined && (run.aborted || failure !== undefined)) {
          transcripts[`${job.id}-stopped-${runId}.jsonl`] = scrub(run.stdout, secrets);
          await executor.release?.(job);
          stopped = { stoppedBy: stopReason as BatchStop, pendingCause: cause };
          break;
        }
        const abortReason = run.aborted ? 'aborted' : undefined;
        const outcome = buildRunOutcome({ job, decl, baselines, run, abortReason });
        checkFrozenModel(outcome, freeze?.expectedModel);
        const transcriptName = `${job.id}-attempt${attemptNumber}.jsonl`;
        transcripts[transcriptName] = scrub(run.stdout, secrets);
        const nextCause = rerunCause(outcome, run);
        const wantsRerun = nextCause !== undefined && attemptNumber < MAX_ATTEMPTS;
        attempts.push({ ...outcome, cause, final: !wantsRerun, transcript: `transcripts/${transcriptName}` });
        await executor.release?.(job);
        if (!wantsRerun) break;
        cause = nextCause;
      }

      if (stopped) {
        reports[index] = stoppedReport(job, stopped.stoppedBy, stopped.pendingCause, attempts, freeze);
        continue;
      }
      const last = attempts[attempts.length - 1];
      const { cause: _cause, final: _final, transcript: _transcript, ...outcomeFields } = last;
      reports[index] = {
        id: job.id,
        class: job.class,
        model: job.model,
        ...outcomeFields,
        attempts,
        ...(freeze ? { freeze: freezeStamp(freeze) } : {}),
      };
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

/**
 * The stdin text for one judge job: the arrival state and the frozen prompt, with no reader
 * `REPORT_REQUEST` appended, since a judge's job text already states its own output shape and
 * `--json-schema` enforces it.
 * @param job - A parsed batch job whose `job` field holds the judge's frozen prompt text.
 * @returns The prompt text.
 */
export function composeJudgePrompt(job: Pick<Job, 'arrival' | 'job'>): string {
  return `${job.arrival.trim()}\n\n${job.job.trim()}\n`;
}

/** One judge run attempt, with its own rulings and verification. Exactly one attempt per job is `final`. */
export interface JudgeAttempt {
  cause: AttemptCause;
  final: boolean;
  /** This attempt's own transcript file, relative to the results directory. */
  transcript: string;
  /** The model id the init event reported for this run, when the run started at all. */
  initModel?: string;
  outcome: 'done' | 'aborted' | 'error';
  abortReason?: string;
  rulings: JudgeRulings;
  usage: ReportUsage;
  verified: JudgeVerified;
}

/**
 * A judge job report: its top-level fields mirror the final attempt (`outcome`, `initModel`,
 * `abortReason`, `rulings`, `usage`, `verified`), the same way a reader's `JobReport` does.
 */
export interface JudgeJobReport extends Omit<JudgeAttempt, 'cause' | 'final' | 'transcript'> {
  id: string;
  class: string;
  model: string;
  /** Every counted attempt the runner made at this job; omitted for a `stoppedBy` report with zero. */
  attempts?: JudgeAttempt[];
  /** Set when a batch-level stop left this job with no final attempt, the same rule `JobReport.stoppedBy` follows. */
  stoppedBy?: 'rateLimit' | 'auth' | 'budget';
  /** The cause a resumed attempt at this job runs under. Set only alongside `stoppedBy`. */
  pendingCause?: AttemptCause;
  /** The freeze manifest this report was gated against. Set only on a gated batch's report. */
  freeze?: FreezeStamp;
}

/** A judge batch report. */
export interface JudgeBatchReport {
  batch: string;
  runId: string;
  kind: JudgeKind;
  stopReason: StopReason;
  budgetTokens: number;
  usage: ReportUsage;
  jobs: JudgeJobReport[];
  verified: boolean;
}

/**
 * Build one judge attempt's outcome from its finished run: the init check, the canary check, the
 * parsed rulings for this judge `kind`, and whether every `expected` item was ruled exactly once.
 * @returns The outcome, before any gating or rerun decision is layered on.
 */
function buildJudgeOutcome({
  decl,
  baselines,
  run,
  abortReason,
  kind,
  expected,
}: {
  decl: ClassDecl;
  baselines: Record<string, InitBaseline>;
  run: RunResult;
  abortReason?: string;
  kind: JudgeKind;
  expected: readonly ExpectedItem[];
}): Omit<JudgeAttempt, 'cause' | 'final' | 'transcript'> {
  const events = run.events;
  const init = checkInit(findInit(events), expectedTools(decl), baselines);
  const canariesFound = findCanaries(run.stdout, run.canaries ?? []);
  const output = judgeOutput(events, kind);
  const verified = verifyJudgeRulings({ output, kind, expected, init, canariesFound });
  const failure = classifyFailure(events);
  const reason = failure ?? abortReason ?? (run.timedOut ? 'timeout' : undefined);
  if (reason) {
    verified.ok = false;
    verified.problems.unshift(`aborted: ${reason}`);
  }
  const model = initModel(events);
  let outcome: JudgeAttempt['outcome'] = 'error';
  if (reason) outcome = 'aborted';
  else if (output) outcome = 'done';
  return {
    ...(model !== undefined ? { initModel: model } : {}),
    outcome,
    ...(reason ? { abortReason: reason } : {}),
    rulings: output ? rulingsOf(output, kind) : [],
    usage: reportUsage(usageFromEvents(events)),
    verified,
  };
}

/**
 * A report for a judge job a batch-level stop left without a final attempt, the judge analogue of
 * `stoppedReport`.
 */
function judgeStoppedReport(job: Job, stoppedBy: BatchStop, pendingCause: AttemptCause, attempts: JudgeAttempt[], freeze?: GatedFreeze): JudgeJobReport {
  return {
    id: job.id,
    class: job.class,
    model: job.model,
    outcome: 'aborted',
    abortReason: stoppedBy,
    rulings: [],
    usage: reportUsage(emptyUsage()),
    verified: {
      ok: false,
      init: false,
      canaries: true,
      problems: [`aborted: ${stoppedBy}`, attempts.length > 0 ? 'stopped before its rerun started' : 'not started'],
    },
    stoppedBy,
    pendingCause,
    ...(attempts.length > 0 ? { attempts } : {}),
    ...(freeze ? { freeze: freezeStamp(freeze) } : {}),
  };
}

/**
 * Run a judge batch: the catch judge, the adjudicator, or the agreement read, all headless runner
 * classes whose container mounts only a packet directory. This mirrors `runBatch`'s scheduling
 * (concurrency, the budget watch, the rerun rule, gating, resume) but builds rulings instead of a
 * reader's catch fields, and verifies ruling coverage against `expectedItems` instead of a
 * reader's quote verification. `kind` picks the report schema and the rulings shape every job in
 * this batch returns; `expectedItems` names, per job id, every packet item that job's rulings must
 * cover exactly once.
 * @returns The batch report and each job's scrubbed transcript.
 */
export async function runJudgeBatch({
  batch,
  classes,
  baselines,
  executor,
  ledger,
  runId,
  kind,
  expectedItems,
  secrets = [],
  halt,
  freeze,
  resumeFrom,
}: {
  batch: Batch;
  classes: Map<string, ClassDecl>;
  baselines: Record<string, InitBaseline>;
  executor: Executor;
  ledger?: { append(entry: LedgerEntry): void };
  runId: string;
  kind: JudgeKind;
  expectedItems: Record<string, readonly ExpectedItem[]>;
  secrets?: readonly unknown[];
  halt?: AbortSignal;
  freeze?: GatedFreeze;
  resumeFrom?: Record<string, { attempts: JudgeAttempt[]; pendingCause: AttemptCause }>;
}): Promise<{ report: JudgeBatchReport; transcripts: Record<string, string> }> {
  let stopReason: StopReason | undefined;
  let spent = 0;
  let total = emptyUsage();
  const inFlight = new Map<string, { controller: AbortController; live: number; seen: StreamEvent[] }>();
  const reports: JudgeJobReport[] = new Array<JudgeJobReport>(batch.jobs.length);
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
    throw new Error('token check did not complete; see the runner log for the container output');
  }

  const schema = judgeReportSchema(kind);
  let next = 0;
  const work = async () => {
    while (!halted && next < batch.jobs.length) {
      const index = next;
      next += 1;
      const job = batch.jobs[index];
      const resumed = resumeFrom?.[job.id];
      const priorAttempts = resumed?.attempts ?? [];
      if (!stopReason && spent + liveSpend() >= batch.budgetTokens) stop('budget');
      if (stopReason) {
        reports[index] = judgeStoppedReport(job, stopReason as BatchStop, resumed?.pendingCause ?? 'initial', priorAttempts, freeze);
        continue;
      }
      const decl = classes.get(job.class);
      if (!decl) throw new Error(`job ${job.id}: class ${job.class} is not declared`);
      const expected = expectedItems[job.id];
      // Undefined (never an explicit []) means the caller forgot this job's packet items, which
      // would otherwise verify vacuously on zero rulings; an explicit empty list stays valid.
      if (expected === undefined) throw new Error(`job ${job.id}: expectedItems carries no entry for this job`);

      const attempts: JudgeAttempt[] = [...priorAttempts];
      let cause: AttemptCause = resumed?.pendingCause ?? 'initial';
      const startAttempt = priorAttempts.length + 1;
      let stopped: { stoppedBy: BatchStop; pendingCause: AttemptCause } | undefined;

      for (let attemptNumber = startAttempt; attemptNumber <= MAX_ATTEMPTS; attemptNumber += 1) {
        if (attemptNumber > startAttempt) {
          if (!stopReason && spent + liveSpend() >= batch.budgetTokens) stop('budget');
          if (stopReason) {
            stopped = { stoppedBy: stopReason as BatchStop, pendingCause: cause };
            break;
          }
        }
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
          run = await executor.run(job, decl, { signal: flight.controller.signal, onEvent, prompt: composeJudgePrompt(job), reportSchema: schema });
        } finally {
          inFlight.delete(job.id);
        }
        record(job.id, job.model, usageFromEvents(run.events));
        const failure = classifyFailure(run.events);
        if (failure) stop(failure);
        if (stopReason !== undefined && (run.aborted || failure !== undefined)) {
          transcripts[`${job.id}-stopped-${runId}.jsonl`] = scrub(run.stdout, secrets);
          await executor.release?.(job);
          stopped = { stoppedBy: stopReason as BatchStop, pendingCause: cause };
          break;
        }
        const abortReason = run.aborted ? 'aborted' : undefined;
        const outcome = buildJudgeOutcome({ decl, baselines, run, abortReason, kind, expected });
        checkFrozenModel(outcome, freeze?.expectedModel);
        const transcriptName = `${job.id}-attempt${attemptNumber}.jsonl`;
        transcripts[transcriptName] = scrub(run.stdout, secrets);
        const nextCause = rerunCause(outcome, run);
        const wantsRerun = nextCause !== undefined && attemptNumber < MAX_ATTEMPTS;
        attempts.push({ ...outcome, cause, final: !wantsRerun, transcript: `transcripts/${transcriptName}` });
        await executor.release?.(job);
        if (!wantsRerun) break;
        cause = nextCause;
      }

      if (stopped) {
        reports[index] = judgeStoppedReport(job, stopped.stoppedBy, stopped.pendingCause, attempts, freeze);
        continue;
      }
      const last = attempts[attempts.length - 1];
      const { cause: _cause, final: _final, transcript: _transcript, ...outcomeFields } = last;
      reports[index] = {
        id: job.id,
        class: job.class,
        model: job.model,
        ...outcomeFields,
        attempts,
        ...(freeze ? { freeze: freezeStamp(freeze) } : {}),
      };
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
      kind,
      stopReason: stopReason ?? 'complete',
      budgetTokens: batch.budgetTokens,
      usage: reportUsage(total),
      jobs: reports,
      verified: stopReason === undefined && reports.every((r) => r.verified.ok),
    },
    transcripts,
  };
}
