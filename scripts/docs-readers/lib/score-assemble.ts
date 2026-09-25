/**
 * The scorer's assembler: joins real reader batch reports, catch-judge and adjudicator rulings,
 * and their key files into the resolved `CatchRunRecord[]`/`PrecisionRunRecord[]` shapes the
 * catch and precision scorers read. No hand-built bundle stands between the artifacts and the
 * score; a caller supplies parsed JSON (already read from disk by `score.ts`), and this module does
 * the joining.
 *
 * The join convention: a judge batch (catch or adjudicator) gives each of its jobs the same `id`
 * as the reader job whose packet it rules. Every join here asserts this against the key file's own
 * `report.jobId`, so a judge batch that breaks the convention is refused, never silently
 * mismatched.
 */
import { isVerifiedOpusRun } from '../path-map.js';
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

/**
 * The outcome a job report's final attempt carries: `attempts[]`'s own `final: true` entry when
 * the report carries attempts at all, or the job's own top-level fields for the earlier report
 * shape (`loadSavedBatchReport` already normalizes those to mirror the same `RunOutcome` fields).
 * @param job - The job report.
 * @returns The final attempt's outcome fields.
 * @throws When the job carries `attempts[]` but none is marked final.
 */
export function finalOutcome(job: JobReport): RunOutcome {
  if (job.attempts && job.attempts.length > 0) {
    const final = job.attempts.find((attempt) => attempt.final);
    if (!final) throw new Error(`job "${job.id}": attempts[] carries no attempt marked final`);
    return final;
  }
  return job;
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

/** One reader job, indexed and ready for the catch and precision assemblers. */
export interface IndexedReaderJob {
  id: string;
  parsed: ParsedJobId;
  classId: ClassId;
  model: string;
  outcome: RunOutcome;
  opus: boolean;
}

/**
 * Index every job across a set of reader batch reports: parse its id, validate and resolve its
 * class, and take its final outcome. A job whose id does not follow the `<job>-<role>-<index>`
 * convention, or whose class is not one of the four scoring classes, is skipped and named in
 * `problems`, never silently dropped.
 * @param reports - Every loaded reader batch report.
 * @param validClassNames - The four scoring class ids.
 * @returns Every indexed job, keyed by its own id, and any problems found while indexing.
 */
export function indexReaderJobs(reports: readonly BatchReport[], validClassNames: ReadonlySet<string>): { byId: Map<string, IndexedReaderJob>; problems: string[] } {
  const byId = new Map<string, IndexedReaderJob>();
  const problems: string[] = [];
  for (const report of reports) {
    for (const job of report.jobs) {
      const parsed = parseReaderJobId(job.id);
      if (!parsed) {
        problems.push(`job "${job.id}": does not follow the "<job>-<role>-<index>" id convention`);
        continue;
      }
      let classId: ClassId;
      try {
        classId = classForJob(job.class, validClassNames);
      } catch (error) {
        problems.push(`job "${job.id}": ${(error as Error).message}`);
        continue;
      }
      let outcome: RunOutcome;
      try {
        outcome = finalOutcome(job);
      } catch (error) {
        problems.push((error as Error).message);
        continue;
      }
      const opus = isVerifiedOpusRun({ verified: outcome.verified, model: job.model, initModel: outcome.initModel });
      byId.set(job.id, { id: job.id, parsed, classId, model: job.model, outcome, opus });
    }
  }
  return { byId, problems };
}

/**
 * Every catch-judge ruling, keyed by the reader job id its key file traces to, then by the real
 * plant id its packet's opaque id resolves to (`CatchPacketKey.plants`).
 * @param rulingsReports - Every loaded catch-judge batch report.
 * @param keys - Every loaded catch-judge key file.
 * @returns Each reader job id's own `{plantId: ruling}` map, and any problems found while joining.
 */
export function joinCatchRulings(
  rulingsReports: readonly JudgeBatchReport[],
  keys: readonly CatchPacketKey[],
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
    const catches: Record<string, 'caught' | 'missed'> = {};
    const rulingByOpaqueId = new Map((judgeJob.rulings as CatchRuling[]).map((ruling) => [ruling.itemId, ruling.ruling]));
    for (const [opaqueId, { plantId }] of Object.entries(key.plants)) {
      const ruling = rulingByOpaqueId.get(opaqueId);
      if (ruling) catches[plantId] = ruling;
    }
    byReaderJobId.set(key.report.jobId, catches);
  }
  return { byReaderJobId, problems };
}

/**
 * Build every job's `CatchRunRecord`s (planted plants, grouped by base job name) and the
 * scripter-heldout runs (held-out defects), joined from the indexed reader jobs and the
 * catch-judge rulings.
 * @param indexed - Every indexed reader job.
 * @param catchesByReaderJobId - Each reader job id's own `{plantId: ruling}` map.
 * @returns Catch runs by base job name, the scripter-heldout runs, and any jobs the catch-judge
 * carried no rulings for (noted, never silently scored as zero catches).
 */
export function buildCatchRunRecords(
  indexed: ReadonlyMap<string, IndexedReaderJob>,
  catchesByReaderJobId: ReadonlyMap<string, Record<string, 'caught' | 'missed'>>,
): { catchRunsByJob: Record<string, CatchRunRecord[]>; heldOutRuns: CatchRunRecord[]; notes: string[] } {
  const catchRunsByJob: Record<string, CatchRunRecord[]> = {};
  const heldOutRuns: CatchRunRecord[] = [];
  const notes: string[] = [];
  for (const job of indexed.values()) {
    if (job.parsed.role !== 'planted' && job.parsed.role !== 'heldout') continue;
    const catches = catchesByReaderJobId.get(job.id);
    if (!catches) notes.push(`job "${job.id}": no catch-judge rulings joined; scored as catching nothing`);
    const record: CatchRunRecord = { runId: job.id, verified: job.outcome.verified.ok, opus: job.opus, catches: catches ?? {} };
    if (job.parsed.role === 'heldout') heldOutRuns.push(record);
    else (catchRunsByJob[job.parsed.job] ??= []).push(record);
  }
  return { catchRunsByJob, heldOutRuns, notes };
}

/**
 * Every adjudicator ruling, keyed by the reader job id its key file traces to, then by the opaque
 * item id its packet gave each catch-field item (`AdjudicatorPacketKey.items`).
 * @param rulingsReports - Every loaded adjudicator batch report.
 * @param keys - Every loaded adjudicator key file.
 * @returns Each reader job id's own resolved `PrecisionItem[]`, and any problems found while joining.
 */
export function joinAdjudications(
  rulingsReports: readonly JudgeBatchReport[],
  keys: readonly AdjudicatorPacketKey[],
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
    const excluded = new Set(key.excluded);
    const adjudicationByOpaqueId = new Map((judgeJob.rulings as Adjudication[]).map((adjudication) => [adjudication.itemId, adjudication]));
    const items: PrecisionItem[] = Object.keys(key.items).map((itemId) => {
      if (excluded.has(itemId)) return { itemId, harnessFiltered: true };
      const adjudication = adjudicationByOpaqueId.get(itemId);
      if (!adjudication) return { itemId, harnessFiltered: false };
      if (adjudication.class === 'finding') {
        return { itemId, harnessFiltered: false, adjudication: { class: 'finding', subjectGroupId: adjudication.subjectGroupId, ruling: adjudication.ruling } };
      }
      return { itemId, harnessFiltered: false, adjudication: { class: adjudication.class } };
    });
    byReaderJobId.set(key.report.jobId, items);
  }
  return { byReaderJobId, problems };
}

/**
 * Build every job's `PrecisionRunRecord`s (control/mapping runs), joined from the indexed reader
 * jobs and the adjudicator's resolved items.
 * @param indexed - Every indexed reader job.
 * @param itemsByReaderJobId - Each reader job id's own resolved `PrecisionItem[]`.
 * @returns Every control-role precision run, and any jobs the adjudicator carried no items for.
 */
export function buildPrecisionRunRecords(
  indexed: ReadonlyMap<string, IndexedReaderJob>,
  itemsByReaderJobId: ReadonlyMap<string, PrecisionItem[]>,
): { runs: PrecisionRunRecord[]; notes: string[] } {
  const runs: PrecisionRunRecord[] = [];
  const notes: string[] = [];
  for (const job of indexed.values()) {
    if (job.parsed.role !== 'control') continue;
    const items = itemsByReaderJobId.get(job.id);
    if (!items) notes.push(`job "${job.id}": no adjudicator items joined; scored with zero catch-field items`);
    runs.push({
      runId: job.id,
      job: job.parsed.job,
      classId: job.classId,
      verified: job.outcome.verified.ok,
      opus: job.opus,
      itemCount: items?.length ?? 0,
      items: items ?? [],
    });
  }
  return { runs, notes };
}
