/**
 * The scorer's assembler: joins real reader batch reports, catch-judge and adjudicator rulings,
 * and their key files into the resolved `CatchRunRecord[]`/`PrecisionRunRecord[]` shapes the
 * catch and precision scorers read. No hand-built bundle stands between the artifacts and the
 * score; a caller supplies parsed JSON (already read from disk by `score.ts`), and this module does
 * the joining.
 *
 * The join convention: a judge batch (catch or adjudicator) gives each of its jobs the same `id`
 * as the reader job whose packet it rules. Every join here asserts this against the key file's own
 * `report.jobId`, and further asserts the key's own `report.path`/`runId`/`attempt` match the
 * reader job's actual source (its indexed report path, batch `runId`, and final attempt number),
 * so a key built from a stale or wrong report is refused, never silently mismatched.
 *
 * Every problem this module finds (a missing key, an unverified or stopped judge job, a trace
 * mismatch, a ruling that is missing or duplicated) is returned as a `problems` entry; the caller
 * (`score.ts`) decides whether a problem is fatal (gated mode) or a note (development mode), since
 * this module has no notion of which mode is running.
 */
import { resolve } from 'node:path';
import { isOpusModel } from '../path-map.js';
import type { CatchPacketKey, AdjudicatorPacketKey } from '../judge-packets.js';
import type { Adjudication, BatchReport, CatchRuling, JobReport, RunOutcome } from './types.js';
import type { JudgeBatchReport } from './runner.js';
import type { CatchRunRecord, ClassId, PrecisionItem, PrecisionRunRecord } from './score-types.js';

/** A reader job id's parsed shape: `<job>-<role>-<index>`. */
export interface ParsedJobId {
  job: string;
  role: 'planted' | 'control' | 'heldout';
  index: number;
}

const JOB_ID_PATTERN = /^(.+)-(planted|control|heldout)-(\d+)$/;

/**
 * Parse a reader job id into its base job name, role, and 1-based index.
 * @param id - A reader job id, such as `evaluator-planted-1`.
 * @returns The parsed shape, or null when the id does not follow the convention.
 */
export function parseReaderJobId(id: string): ParsedJobId | null {
  const match = JOB_ID_PATTERN.exec(id);
  if (!match) return null;
  return { job: match[1], role: match[2] as ParsedJobId['role'], index: Number(match[3]) };
}

/** A job's final attempt, and the 1-based attempt number it was. */
export interface FinalAttemptResult {
  outcome: RunOutcome;
  attempt: number;
}

/**
 * The outcome a job report's final attempt carries, and which attempt number it was:
 * `attempts[]`'s own `final: true` entry (its 1-based position) when the report carries attempts
 * at all, or the job's own top-level fields at attempt 1 for the earlier report shape
 * (`loadSavedBatchReport` already normalizes both the job's own fields and every entry in
 * `attempts[]` to mirror the same `RunOutcome` fields).
 * @param job - The job report.
 * @returns The final attempt's outcome fields and its 1-based attempt number.
 * @throws When the job carries `attempts[]` but none is marked final.
 */
export function finalOutcome(job: JobReport): FinalAttemptResult {
  if (job.attempts && job.attempts.length > 0) {
    const index = job.attempts.findIndex((attempt) => attempt.final);
    if (index === -1) throw new Error(`job "${job.id}": attempts[] carries no attempt marked final`);
    return { outcome: job.attempts[index], attempt: index + 1 };
  }
  return { outcome: job, attempt: 1 };
}

/**
 * Validate a job's own class name against the real class files, and narrow it to a scoring class
 * id. A judge class (`judge-catch`, and so on) is never a scoring class, so it is refused the same
 * as an unknown name.
 * @param className - The job's own `class` field.
 * @param validClassNames - The four scoring class ids (from the loaded class files).
 * @returns The class id.
 * @throws When the name is not one of the four scoring classes.
 */
export function classForJob(className: string, validClassNames: ReadonlySet<string>): ClassId {
  if (!validClassNames.has(className)) throw new Error(`job class "${className}" is not one of the scoring classes: ${[...validClassNames].sort().join(', ')}`);
  return className as ClassId;
}

/**
 * One reader job, indexed and ready for the catch and precision assemblers. `reportPath`,
 * `batchRunId`, and `finalAttempt` name this job's own source, resolved once here, so a judge
 * key's own claimed source can be checked against it later.
 */
export interface IndexedReaderJob {
  id: string;
  parsed: ParsedJobId;
  classId: ClassId;
  model: string;
  outcome: RunOutcome;
  /** Whether the run's own model (`initModel ?? model`) names an Opus model, independent of `verified`. */
  opus: boolean;
  reportPath: string;
  batchRunId: string;
  finalAttempt: number;
}

/** One judge key's own claim about which reader job, report, and attempt it traces to, used to resolve a duplicate job id across reports. */
export interface JobKeyRef {
  jobId: string;
  reportPath: string;
  runId: string;
}

/**
 * Whether a candidate job's own final attempt names an Opus model, defaulting to true (never
 * silently dropped) when the job carries `attempts[]` with none marked final, since that shape is
 * itself malformed and this helper never decides whether a malformed job is fatal.
 * @param job - The candidate job report.
 * @returns True when the job's final attempt is Opus, or when its final attempt cannot be read.
 */
function candidateIsOpus(job: JobReport): boolean {
  try {
    const { outcome } = finalOutcome(job);
    return isOpusModel(outcome.initModel ?? job.model);
  } catch {
    return true;
  }
}

/**
 * Index every job across a set of reader batch reports: parse its id, validate and resolve its
 * class, and take its final outcome. A job id that appears in more than one report (pass 1's
 * `validation` and `validation-rerun` can share ids such as `operator-control-1`) is resolved by
 * `keyRefs`: the one candidate a judge key's own `report.path`/`runId` names is kept, and every
 * other candidate is listed in `notes` as superseded, never picked by argument order. A duplicate
 * id with no key, or whose keys name none or more than one of its candidates, is refused, unless
 * every one of its candidates is a non-Opus run (round 0 never judges a Sonnet run, so no key can
 * ever resolve one); then every copy is dropped and `notes` carries the id instead.
 * @param reports - Every loaded reader batch report, with the file path it came from.
 * @param validClassNames - The four scoring class ids.
 * @param keyRefs - Every catch-judge and adjudicator key's own report trace, used to resolve a duplicate job id.
 * @returns Every indexed job, keyed by its own id; every problem found while indexing (always
 * fatal, in both modes); and every informational note (a superseded duplicate, never fatal).
 */
export function indexReaderJobs(
  reports: readonly { path: string; report: BatchReport }[],
  validClassNames: ReadonlySet<string>,
  keyRefs: readonly JobKeyRef[] = [],
): { byId: Map<string, IndexedReaderJob>; problems: string[]; notes: string[] } {
  const byId = new Map<string, IndexedReaderJob>();
  const problems: string[] = [];
  const notes: string[] = [];

  const candidatesById = new Map<string, Array<{ reportPath: string; batchRunId: string; job: JobReport }>>();
  for (const { path, report } of reports) {
    for (const job of report.jobs) {
      const list = candidatesById.get(job.id) ?? [];
      list.push({ reportPath: resolve(path), batchRunId: report.runId, job });
      candidatesById.set(job.id, list);
    }
  }

  const refsById = new Map<string, JobKeyRef[]>();
  for (const ref of keyRefs) {
    const list = refsById.get(ref.jobId) ?? [];
    list.push({ ...ref, reportPath: resolve(ref.reportPath) });
    refsById.set(ref.jobId, list);
  }

  for (const [id, candidates] of candidatesById) {
    let chosen: (typeof candidates)[number];
    if (candidates.length === 1) {
      chosen = candidates[0];
    } else {
      const refs = refsById.get(id) ?? [];
      const matches = candidates.filter((candidate) => refs.some((ref) => ref.reportPath === candidate.reportPath && ref.runId === candidate.batchRunId));
      if (refs.length === 0 || matches.length !== 1) {
        const reason = refs.length === 0 ? 'with no judge key to resolve which copy to score' : 'no judge key names exactly one of them';
        if (!candidates.some((candidate) => candidateIsOpus(candidate.job))) {
          notes.push(`job "${id}": appears in ${candidates.length} reports (${candidates.map((c) => c.reportPath).join(', ')}) ${reason}; no copy is an Opus run, so every copy is dropped`);
          continue;
        }
        problems.push(`job "${id}": appears in ${candidates.length} reports (${candidates.map((c) => c.reportPath).join(', ')}) ${reason}`);
        continue;
      }
      chosen = matches[0];
      for (const candidate of candidates) {
        if (candidate !== chosen) {
          notes.push(`job "${id}": superseded copy from "${candidate.reportPath}" (runId "${candidate.batchRunId}") dropped in favor of "${chosen.reportPath}" (runId "${chosen.batchRunId}")`);
        }
      }
    }

    const parsed = parseReaderJobId(id);
    if (!parsed) {
      problems.push(`job "${id}": does not follow the "<job>-<role>-<index>" id convention`);
      continue;
    }
    let classId: ClassId;
    try {
      classId = classForJob(chosen.job.class, validClassNames);
    } catch (error) {
      problems.push(`job "${id}": ${(error as Error).message}`);
      continue;
    }
    let result: FinalAttemptResult;
    try {
      result = finalOutcome(chosen.job);
    } catch (error) {
      problems.push((error as Error).message);
      continue;
    }
    const opus = isOpusModel(result.outcome.initModel ?? chosen.job.model);
    byId.set(id, {
      id,
      parsed,
      classId,
      model: chosen.job.model,
      outcome: result.outcome,
      opus,
      reportPath: chosen.reportPath,
      batchRunId: chosen.batchRunId,
      finalAttempt: result.attempt,
    });
  }
  return { byId, problems, notes };
}

/**
 * Whether a key's own claimed source (`report.path`/`runId`/`attempt`) matches the reader job it
 * names, resolving `path` before comparing so a caller's own path form (relative or absolute)
 * never causes a spurious mismatch. Takes the key's own report trace and the indexed reader job it
 * claims to trace to.
 * @returns True when the key's claimed source matches the indexed job's own source.
 */
function keyTraceMatches(key: { path: string; runId: string; attempt: number }, readerJob: IndexedReaderJob): boolean {
  return resolve(key.path) === readerJob.reportPath && key.runId === readerJob.batchRunId && key.attempt === readerJob.finalAttempt;
}

/**
 * Every catch-judge ruling, keyed by the reader job id its key file traces to, then by the real
 * plant id its packet's opaque id resolves to (`CatchPacketKey.plants`). Refuses (as a problem,
 * never silently) a key with no matching catch-judge job, an unverified or stopped catch-judge
 * job, a key whose own trace does not match the reader job it names, or a plant with anything
 * other than exactly one ruling.
 * @param rulingsReports - Every loaded catch-judge batch report.
 * @param keys - Every loaded catch-judge key file.
 * @param indexed - Every indexed reader job, for the key-trace check.
 * @returns Each reader job id's own `{plantId: ruling}` map, and every problem found while joining.
 */
export function joinCatchRulings(
  rulingsReports: readonly JudgeBatchReport[],
  keys: readonly CatchPacketKey[],
  indexed: ReadonlyMap<string, IndexedReaderJob>,
): { byReaderJobId: Map<string, Record<string, 'caught' | 'missed'>>; problems: string[] } {
  const judgeJobsById = new Map<string, JudgeBatchReport['jobs'][number]>();
  for (const report of rulingsReports) for (const job of report.jobs) judgeJobsById.set(job.id, job);

  const byReaderJobId = new Map<string, Record<string, 'caught' | 'missed'>>();
  const problems: string[] = [];
  for (const key of keys) {
    const judgeJob = judgeJobsById.get(key.report.jobId);
    if (!judgeJob) {
      problems.push(`catch-judge key for reader job "${key.report.jobId}": no catch-judge job carries that id`);
      continue;
    }
    if (judgeJob.verified?.ok !== true) {
      problems.push(`catch-judge job "${judgeJob.id}" (reader job "${key.report.jobId}"): the judge run is unverified`);
      continue;
    }
    if (judgeJob.stoppedBy !== undefined) {
      problems.push(`catch-judge job "${judgeJob.id}" (reader job "${key.report.jobId}"): carries stoppedBy and has no final attempt`);
      continue;
    }
    const readerJob = indexed.get(key.report.jobId);
    if (readerJob && !keyTraceMatches(key.report, readerJob)) {
      problems.push(
        `catch-judge key for reader job "${key.report.jobId}": traces to report "${key.report.path}" runId "${key.report.runId}" attempt ${key.report.attempt}, but the indexed job's own source is "${readerJob.reportPath}" runId "${readerJob.batchRunId}" attempt ${readerJob.finalAttempt}`,
      );
      continue;
    }
    const rulingsByItemId = new Map<string, CatchRuling[]>();
    for (const ruling of judgeJob.rulings as CatchRuling[]) {
      const list = rulingsByItemId.get(ruling.itemId) ?? [];
      list.push(ruling);
      rulingsByItemId.set(ruling.itemId, list);
    }
    const catches: Record<string, 'caught' | 'missed'> = {};
    for (const [opaqueId, { plantId }] of Object.entries(key.plants)) {
      const matching = rulingsByItemId.get(opaqueId) ?? [];
      if (matching.length !== 1) {
        problems.push(`catch-judge key for reader job "${key.report.jobId}": plant "${plantId}" (item "${opaqueId}") has ${matching.length} ruling(s), exactly one required`);
        continue;
      }
      catches[plantId] = matching[0].ruling;
    }
    byReaderJobId.set(key.report.jobId, catches);
  }
  return { byReaderJobId, problems };
}

/**
 * Build every job's `CatchRunRecord`s (planted plants, grouped by base job name) and the
 * scripter-heldout runs (held-out defects), joined from the indexed reader jobs and the
 * catch-judge rulings. A planted or heldout job with no joined rulings is a problem, never
 * silently scored as catching nothing.
 * @param indexed - Every indexed reader job.
 * @param catchesByReaderJobId - Each reader job id's own `{plantId: ruling}` map.
 * @returns Catch runs by base job name, the scripter-heldout runs, and every problem found.
 */
export function buildCatchRunRecords(
  indexed: ReadonlyMap<string, IndexedReaderJob>,
  catchesByReaderJobId: ReadonlyMap<string, Record<string, 'caught' | 'missed'>>,
): { catchRunsByJob: Record<string, CatchRunRecord[]>; heldOutRuns: CatchRunRecord[]; problems: string[] } {
  const catchRunsByJob: Record<string, CatchRunRecord[]> = {};
  const heldOutRuns: CatchRunRecord[] = [];
  const problems: string[] = [];
  for (const job of indexed.values()) {
    if (job.parsed.role !== 'planted' && job.parsed.role !== 'heldout') continue;
    const catches = catchesByReaderJobId.get(job.id);
    if (!catches) problems.push(`job "${job.id}": no catch-judge key and rulings joined for it`);
    const record: CatchRunRecord = { runId: job.id, verified: job.outcome.verified.ok, opus: job.opus, catches: catches ?? {} };
    if (job.parsed.role === 'heldout') heldOutRuns.push(record);
    else (catchRunsByJob[job.parsed.job] ??= []).push(record);
  }
  return { catchRunsByJob, heldOutRuns, problems };
}

/**
 * Every adjudicator ruling, keyed by the reader job id its key file traces to, then by the opaque
 * item id its packet gave each catch-field item (`AdjudicatorPacketKey.items`). Refuses (as a
 * problem) a key with no matching adjudicator job, an unverified or stopped adjudicator job, a key
 * whose own trace does not match the reader job it names, or an item with anything other than
 * exactly one ruling (an item the mechanical filter excluded is exempt, since it was never sent to
 * the adjudicator to rule on at all).
 * @param rulingsReports - Every loaded adjudicator batch report.
 * @param keys - Every loaded adjudicator key file.
 * @param indexed - Every indexed reader job, for the key-trace check.
 * @returns Each reader job id's own resolved `PrecisionItem[]`, and every problem found while joining.
 */
export function joinAdjudications(
  rulingsReports: readonly JudgeBatchReport[],
  keys: readonly AdjudicatorPacketKey[],
  indexed: ReadonlyMap<string, IndexedReaderJob>,
): { byReaderJobId: Map<string, PrecisionItem[]>; problems: string[] } {
  const judgeJobsById = new Map<string, JudgeBatchReport['jobs'][number]>();
  for (const report of rulingsReports) for (const job of report.jobs) judgeJobsById.set(job.id, job);

  const byReaderJobId = new Map<string, PrecisionItem[]>();
  const problems: string[] = [];
  for (const key of keys) {
    const judgeJob = judgeJobsById.get(key.report.jobId);
    if (!judgeJob) {
      problems.push(`adjudicator key for reader job "${key.report.jobId}": no adjudicator job carries that id`);
      continue;
    }
    if (judgeJob.verified?.ok !== true) {
      problems.push(`adjudicator job "${judgeJob.id}" (reader job "${key.report.jobId}"): the judge run is unverified`);
      continue;
    }
    if (judgeJob.stoppedBy !== undefined) {
      problems.push(`adjudicator job "${judgeJob.id}" (reader job "${key.report.jobId}"): carries stoppedBy and has no final attempt`);
      continue;
    }
    const readerJob = indexed.get(key.report.jobId);
    if (readerJob && !keyTraceMatches(key.report, readerJob)) {
      problems.push(
        `adjudicator key for reader job "${key.report.jobId}": traces to report "${key.report.path}" runId "${key.report.runId}" attempt ${key.report.attempt}, but the indexed job's own source is "${readerJob.reportPath}" runId "${readerJob.batchRunId}" attempt ${readerJob.finalAttempt}`,
      );
      continue;
    }
    const excluded = new Set(key.excluded);
    const adjudicationsByItemId = new Map<string, Adjudication[]>();
    for (const adjudication of judgeJob.rulings as Adjudication[]) {
      const list = adjudicationsByItemId.get(adjudication.itemId) ?? [];
      list.push(adjudication);
      adjudicationsByItemId.set(adjudication.itemId, list);
    }
    const items: PrecisionItem[] = [];
    for (const itemId of Object.keys(key.items)) {
      const { field } = key.items[itemId];
      if (excluded.has(itemId)) {
        items.push({ itemId, harnessFiltered: true, field });
        continue;
      }
      const matching = adjudicationsByItemId.get(itemId) ?? [];
      if (matching.length !== 1) {
        problems.push(`adjudicator key for reader job "${key.report.jobId}": item "${itemId}" has ${matching.length} ruling(s), exactly one required`);
        continue;
      }
      const adjudication = matching[0];
      if (adjudication.class === 'finding') {
        items.push({ itemId, harnessFiltered: false, field, adjudication: { class: 'finding', subjectGroupId: adjudication.subjectGroupId, ruling: adjudication.ruling } });
      } else {
        items.push({ itemId, harnessFiltered: false, field, adjudication: { class: adjudication.class } });
      }
    }
    byReaderJobId.set(key.report.jobId, items);
  }
  return { byReaderJobId, problems };
}

/**
 * Build every job's `PrecisionRunRecord`s (control/mapping runs), joined from the indexed reader
 * jobs and the adjudicator's resolved items. `itemCount` is taken from the run's own final outcome
 * (its `stalls[]`, `assumed[]`, `diverged[]`, `checks[]`, `wrong[]`, and `missing[]` counts), never
 * from the key, since an unverified run's rerun-rule fallback must reflect what the reader itself
 * actually recorded, not however many items a (possibly stale or absent) key happened to carry.
 * `newFieldItemCount` is the same outcome's `wrong[]` plus `missing[]` length alone, the rerun
 * rule's own fallback restricted to the new fields.
 * @param indexed - Every indexed reader job.
 * @param itemsByReaderJobId - Each reader job id's own resolved `PrecisionItem[]`.
 * @returns Every control-role precision run, and every problem found (a control job with no joined items).
 */
export function buildPrecisionRunRecords(
  indexed: ReadonlyMap<string, IndexedReaderJob>,
  itemsByReaderJobId: ReadonlyMap<string, PrecisionItem[]>,
): { runs: PrecisionRunRecord[]; problems: string[] } {
  const runs: PrecisionRunRecord[] = [];
  const problems: string[] = [];
  for (const job of indexed.values()) {
    if (job.parsed.role !== 'control') continue;
    const items = itemsByReaderJobId.get(job.id);
    if (!items) problems.push(`job "${job.id}": no adjudicator key and rulings joined for it`);
    const outcome = job.outcome;
    const newFieldItemCount = outcome.wrong.length + outcome.missing.length;
    const itemCount = outcome.stalls.length + outcome.assumed.length + outcome.diverged.length + newFieldItemCount + (outcome.checks?.length ?? 0);
    runs.push({
      runId: job.id,
      job: job.parsed.job,
      classId: job.classId,
      verified: job.outcome.verified.ok,
      opus: job.opus,
      itemCount,
      newFieldItemCount,
      items: items ?? [],
    });
  }
  return { runs, problems };
}
