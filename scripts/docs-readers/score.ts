#!/usr/bin/env -S npx tsx
/**
 * The scorer: development mode rescores pass 1's saved reports and round 1 under this spec's
 * counting rules, labeled, with no bar or class verdict; gated mode verifies a gated batch's
 * reports against the freeze manifest and the post-freeze chain, then scores the pooled and
 * per-class sensitivity and precision bars, the agreement bar, the held-out found rule, and the
 * spec's reported-only measures, against a recomputed thresholds file. Both modes assemble their
 * scoring input from real artifacts themselves (`lib/score-assemble.ts`); there is no hand-built
 * bundle. `--report` files are the reader batch reports whose jobs follow the
 * `<job>-<role>-<index>` id convention (`role` one of `planted`, `control`, `heldout`); the
 * catch-judge and adjudicator batches referenced by `--catch-rulings`/`--adjudicator-rulings` are
 * assumed, by convention, to give each of their own jobs the same id as the reader job whose
 * packet it rules, which the key file's own `report.path`/`runId`/`attempt` must match against the
 * indexed job's actual source. A reader job id that appears in more than one `--report` file
 * (pass 1's `validation` and `validation-rerun` can share ids) is resolved the same way: the copy
 * a judge key's own trace names is kept, and every other copy is dropped and noted.
 *
 * Gated mode refuses (never silently scores around) an assembly problem a development-mode run
 * would otherwise carry as a `notes` entry: a planted, heldout, or control reader job with no
 * joined key and rulings; a judge job that is unverified or carries `stoppedBy`; a judge batch
 * report that fails `checkReportComplete` or `checkGatedStamp`; a key whose own trace does not
 * match the indexed job it names; or a key plant or item without exactly one ruling. It also
 * refuses any gated input path (the plant record, thresholds, a map, a catch or adjudicator key or
 * rulings file, the agreement sample) that has no entry in the post-freeze chain at all, and
 * requires exactly one ruling per agreement-sample item from a verified, unstopped agreement job.
 *
 * The seed convention: the manifest's `seeds` map carries the `oc-curve.ts` seed under the key
 * `"oc-curve"`, checked against the thresholds file's own `seed` field, refusing a mismatch.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/score.ts sample --pool FILE --out FILE
 *   npx tsx scripts/docs-readers/score.ts dev
 *     --report FILE [--report FILE...]
 *     [--catch-rulings FILE...] [--catch-key FILE...]
 *     [--adjudicator-rulings FILE...] [--adjudicator-key FILE...]
 *     --plants FILE [--map JOB=FILE...] [--control-ids ID,ID,...] --out FILE
 *   npx tsx scripts/docs-readers/score.ts gated
 *     --report FILE [--report FILE...]
 *     [--catch-rulings FILE...] [--catch-key FILE...]
 *     [--adjudicator-rulings FILE...] [--adjudicator-key FILE...]
 *     --plants FILE [--map JOB=FILE...] --heldout-ids ID,ID,...
 *     --thresholds FILE --manifest FILE --chain FILE --root DIR
 *     --agreement-sample FILE --agreement-rulings FILE [--agreement-rulings FILE...]
 *     --out FILE
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSES_DIR, judgeKindForClass, loadClasses } from './lib/class-schema.js';
import { loadManifest } from './freeze.js';
import { latestEntry } from './lib/chain.js';
import {
  checkDevelopmentBatch,
  checkGatedStamp,
  checkManifestIsGenesis,
  checkReportComplete,
  verifyGatedChain,
  type GatedChainCheck,
} from './lib/score-integrity.js';
import {
  buildCatchRunRecords,
  buildPrecisionRunRecords,
  indexReaderJobs,
  joinAdjudications,
  joinCatchRulings,
  parseReaderJobId,
  type IndexedReaderJob,
  type JobKeyRef,
} from './lib/score-assemble.js';
import {
  assertThresholdsMatchTally,
  isPlantOnMap,
  nearestStepDistance,
  perRunRecall,
  plantPathPosition,
  recallByBucket,
  recallByClass,
  recallByPlantKind,
  recallByPlantRun,
  scoreClassSensitivity,
  scoreHeldOut,
  scorePooledSensitivity,
  stabilityKappa,
  tallyPlantCatches,
  wilsonInterval,
  type ClassSensitivityResult,
  type PlantCatchTally,
  type PooledSensitivityResult,
  type RecallReport,
} from './lib/score-catch.js';
import { findingCountsForRun, missingPlannedRuns, precisionByClass, type ClassPrecisionResult } from './lib/score-precision.js';
import {
  applyCatchReplacements,
  applyPrecisionReplacements,
  computeAgreement,
  deriveReplacements,
  drawAgreementSample,
  type AgreementResult,
  type AgreementSampleFile,
  type CatchCallPoolItem,
  type FindingPoolItem,
} from './lib/score-agreement.js';
import { scoreClassVerdicts, type ClassVerdict } from './lib/score-verdict.js';
import { CLASS_IDS, type CatchRunRecord, type ClassId, type PlantSpec, type PrecisionRunRecord } from './lib/score-types.js';
import { loadSavedBatchReport } from './lib/transcript.js';
import { JOB_CLASS } from './oc-curve.js';
import type { AgreementRuling, BatchReport } from './lib/types.js';
import type { JudgeBatchReport } from './lib/runner.js';
import type { CatchPacketKey, AdjudicatorPacketKey } from './judge-packets.js';

/** The manifest seed key `oc-curve.ts`'s own seed is pinned under. */
const OC_CURVE_SEED_KEY = 'oc-curve';

/**
 * Read and parse a JSON file.
 * @param path - The file to read.
 * @returns The parsed value.
 */
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T;
}

/**
 * Write a value as pretty-printed JSON with a trailing newline.
 * @param path - Where to write it.
 * @param value - The value to serialize.
 */
function writeJson(path: string, value: unknown): void {
  writeFileSync(resolve(path), `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Pull a flag's value out of an argument list.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * Every value given to a repeatable flag.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns Each value, in the order given.
 */
function repeatedOption(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) if (args[i] === flag) values.push(args[i + 1]);
  return values;
}

/**
 * The four scoring class ids, validated against the real class declaration files (never a judge
 * class, which is excluded here since it is never a reader job's own class).
 * @returns Each name a job's own `class` field may legally carry.
 */
function scoringClassNames(): Set<string> {
  const names = new Set<string>();
  for (const name of loadClasses(CLASSES_DIR).keys()) if (!judgeKindForClass(name)) names.add(name);
  return names;
}

/**
 * Load every `--report` file as a saved batch report, tolerating the earlier report shape via the
 * shared loader.
 * @param paths - The report file paths.
 * @returns Each path, paired with its parsed batch report.
 */
function loadReaderReports(paths: string[]): Array<{ path: string; report: BatchReport }> {
  return paths.map((path) => ({ path, report: loadSavedBatchReport(readFileSync(resolve(path), 'utf8')) }));
}

/**
 * Load every judge batch report file (catch-judge, adjudicator, or agreement).
 * @param paths - The file paths.
 * @returns The parsed judge batch reports.
 */
function loadJudgeBatchReports(paths: string[]): JudgeBatchReport[] {
  return paths.map((path) => readJson<JudgeBatchReport>(path));
}

/** One plant, as either the real plant record or `fixtures/dev-plants.json` carries it. */
interface RawPlant {
  id: string;
  job: string;
  page?: string;
  line?: number;
  type?: PlantSpec['type'];
  semantic?: boolean;
}

/**
 * Load a plant source (the real plant record or the development plants file) and join each plant
 * to its class through the indexed reader jobs' own base job names.
 * @param path - The plant source file.
 * @param jobClasses - Every base job name's class id, from the indexed reader jobs.
 * @returns Every plant, joined to its class.
 * @throws When a plant's job has no known class (no indexed reader job named it).
 */
function loadPlants(path: string, jobClasses: ReadonlyMap<string, ClassId>): PlantSpec[] {
  const raw = readJson<RawPlant[]>(path);
  return raw.map((plant) => {
    const classId = jobClasses.get(plant.job);
    if (!classId) throw new Error(`plant "${plant.id}": job "${plant.job}" has no known class (no indexed reader job named it)`);
    return { id: plant.id, job: plant.job, classId, type: plant.type, semantic: plant.semantic, page: plant.page, line: plant.line };
  });
}

/**
 * Parse `--map JOB=FILE` pairs into each job's loaded path map.
 * @param values - The raw `JOB=FILE` values.
 * @returns Each job's path map.
 */
function loadMaps(values: string[]): Record<string, unknown> {
  const maps: Record<string, unknown> = {};
  for (const value of values) {
    const at = value.indexOf('=');
    if (at === -1) throw new Error(`--map value "${value}" is not "JOB=FILE"`);
    maps[value.slice(0, at)] = readJson(value.slice(at + 1));
  }
  return maps;
}

/**
 * The file half of every `--map JOB=FILE` value, for the chain-entry check.
 * @param values - The raw `JOB=FILE` values.
 * @returns Each value's own file path.
 */
function mapFilePaths(values: string[]): string[] {
  return values.map((value) => {
    const at = value.indexOf('=');
    return at === -1 ? value : value.slice(at + 1);
  });
}

/**
 * Every base job name a set of indexed reader jobs names, mapped to its own class id.
 * @param indexed - The indexed reader jobs.
 * @returns Each base job name's class id.
 */
function jobClassesOf(indexed: ReadonlyMap<string, IndexedReaderJob>): Map<string, ClassId> {
  const result = new Map<string, ClassId>();
  for (const job of indexed.values()) result.set(job.parsed.job, job.classId);
  return result;
}

/**
 * Every catch-judge and adjudicator key's own report trace, used to resolve a reader job id that
 * appears in more than one `--report` file.
 * @param catchKeys - Every loaded catch-judge key.
 * @param adjudicatorKeys - Every loaded adjudicator key.
 * @returns Each key's own `{jobId, reportPath, runId}` claim.
 */
function buildKeyRefs(catchKeys: readonly CatchPacketKey[], adjudicatorKeys: readonly AdjudicatorPacketKey[]): JobKeyRef[] {
  return [
    ...catchKeys.map((key) => ({ jobId: key.report.jobId, reportPath: key.report.path, runId: key.report.runId })),
    ...adjudicatorKeys.map((key) => ({ jobId: key.report.jobId, reportPath: key.report.path, runId: key.report.runId })),
  ];
}

/**
 * Assemble catch and precision runs from real artifacts: the indexed reader jobs, the catch-judge
 * and adjudicator rulings and key files. Shared by development and gated mode alike; every problem
 * this finds (a missing key, an unverified judge job, a trace mismatch, a ruling that is missing
 * or duplicated, a reader job with nothing joined to it) is returned in `problems`, and the caller
 * decides whether that is fatal (gated mode) or a note (development mode).
 * @returns Every assembled piece, plus every problem found while joining.
 */
function assembleRuns({
  indexed,
  catchRulingsPaths,
  catchKeys,
  adjudicatorRulingsPaths,
  adjudicatorKeys,
}: {
  indexed: ReadonlyMap<string, IndexedReaderJob>;
  catchRulingsPaths: string[];
  catchKeys: readonly CatchPacketKey[];
  adjudicatorRulingsPaths: string[];
  adjudicatorKeys: readonly AdjudicatorPacketKey[];
}): {
  catchRunsByJob: Record<string, CatchRunRecord[]>;
  heldOutRuns: CatchRunRecord[];
  precisionRuns: PrecisionRunRecord[];
  problems: string[];
} {
  const catchRulingsReports = loadJudgeBatchReports(catchRulingsPaths);
  const { byReaderJobId: catchesByJob, problems: catchJoinProblems } = joinCatchRulings(catchRulingsReports, catchKeys, indexed);
  const { catchRunsByJob, heldOutRuns, problems: catchBuildProblems } = buildCatchRunRecords(indexed, catchesByJob);

  const adjudicatorRulingsReports = loadJudgeBatchReports(adjudicatorRulingsPaths);
  const { byReaderJobId: itemsByJob, problems: adjJoinProblems } = joinAdjudications(adjudicatorRulingsReports, adjudicatorKeys, indexed);
  const { runs: precisionRuns, problems: precisionBuildProblems } = buildPrecisionRunRecords(indexed, itemsByJob);

  return { catchRunsByJob, heldOutRuns, precisionRuns, problems: [...catchJoinProblems, ...catchBuildProblems, ...adjJoinProblems, ...precisionBuildProblems] };
}

/**
 * Run the `sample` subcommand: draw the agreement sample from a pool file (its `orderingLabel`,
 * `findingsPool`, `catchCallsPool`, and optional `perStratum` fields) and write it to `--out`.
 * @param argv - The arguments after `sample`.
 * @returns The process exit code.
 */
function runSample(argv: string[]): number {
  const poolPath = option(argv, '--pool');
  const out = option(argv, '--out');
  if (!poolPath || !out) {
    process.stderr.write('usage: score.ts sample --pool FILE --out FILE\n');
    return 2;
  }
  const pool = readJson<{ orderingLabel: string; findingsPool: FindingPoolItem[]; catchCallsPool: CatchCallPoolItem[]; perStratum?: number }>(poolPath);
  const sample: AgreementSampleFile = drawAgreementSample(pool);
  writeJson(out, sample);
  process.stdout.write(`wrote ${out} (${sample.findings.length} finding(s), ${sample.catchCalls.length} catch call(s))\n`);
  return 0;
}

/** One control run's own place in the pooled precision block. */
interface PooledPrecisionRunEntry {
  runId: string;
  verified: boolean;
  falseFindings: number;
  newFieldFalseFindings: number;
}

/** The pilot's pooled precision block, over the given `--control-ids` list. */
interface PooledPrecision {
  controlRunIds: string[];
  falseFindings: number;
  newFieldFalseFindings: number;
  otherFalseFindings: number;
  perRun: PooledPrecisionRunEntry[];
}

/**
 * Validate `--control-ids`, refusing (in this order) an empty id, an id absent from the reports, a
 * duplicate id, an id whose reader job does not parse as a `control`-role job, and, when any report
 * carries a `pilot-2a-` batch, a `control`-role job the list leaves out. Absent input (`raw`
 * undefined) is valid and carries no ids, since `pooledPrecision` is then omitted entirely (round
 * 1's rescore passes none).
 * @param raw - The raw `--control-ids` flag value, or undefined when the flag was not given.
 * @param indexed - Every indexed reader job.
 * @param batchNames - Every `--report` file's own batch name, to detect a `pilot-2a-` batch.
 * @returns The validated id list (undefined when the flag was not given), or a problem naming the offending id.
 */
function validateControlIds(raw: string | undefined, indexed: ReadonlyMap<string, IndexedReaderJob>, batchNames: readonly string[]): { ok: true; ids?: string[] } | { ok: false; problem: string } {
  if (raw === undefined) return { ok: true };
  const ids = raw.split(',');
  if (ids.includes('')) return { ok: false, problem: '--control-ids: the list carries an empty id' };
  const absent = ids.find((id) => !indexed.has(id));
  if (absent !== undefined) return { ok: false, problem: `--control-ids: id "${absent}" is absent from the reports` };
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate !== undefined) return { ok: false, problem: `--control-ids: id "${duplicate}" is a duplicate` };
  const nonControl = ids.find((id) => indexed.get(id)!.parsed.role !== 'control');
  if (nonControl !== undefined) return { ok: false, problem: `--control-ids: id "${nonControl}" does not parse as a control-role job` };
  if (batchNames.some((batch) => batch.startsWith('pilot-2a-'))) {
    const listed = new Set(ids);
    const unlisted = [...indexed.values()].find((job) => job.parsed.role === 'control' && !listed.has(job.id));
    if (unlisted) return { ok: false, problem: `--control-ids: control job "${unlisted.id}" is not listed` };
  }
  return { ok: true, ids };
}

/**
 * Build the pooled precision block over the given control ids: each run's own false and new-field
 * false finding counts (`findingCountsForRun`), summed, with new-field split from the pooled total
 * to give `otherFalseFindings`.
 * @param controlIds - The validated `--control-ids` list, in the given order.
 * @param precisionRuns - Every assembled precision run.
 * @returns The pooled precision block.
 */
function buildPooledPrecision(controlIds: readonly string[], precisionRuns: readonly PrecisionRunRecord[]): PooledPrecision {
  const byRunId = new Map(precisionRuns.map((run) => [run.runId, run]));
  const perRun: PooledPrecisionRunEntry[] = controlIds.map((runId) => {
    const run = byRunId.get(runId);
    const counts = run ? findingCountsForRun(run) : { falseFindings: 0, newFieldFalseFindings: 0 };
    return { runId, verified: run?.verified ?? false, falseFindings: counts.falseFindings, newFieldFalseFindings: counts.newFieldFalseFindings };
  });
  const falseFindings = perRun.reduce((sum, entry) => sum + entry.falseFindings, 0);
  const newFieldFalseFindings = perRun.reduce((sum, entry) => sum + entry.newFieldFalseFindings, 0);
  return { controlRunIds: [...controlIds], falseFindings, newFieldFalseFindings, otherFalseFindings: falseFindings - newFieldFalseFindings, perRun };
}

/** One development job's on-map and precision figures. */
interface DevJobResult {
  job: string;
  onMapPlantCount: number;
  /**
   * Plants caught under the gated two-of-three rule: kept for continuity, but a development
   * bundle's own one-planted-run-per-job norm means this can stay zero even when that one run
   * caught the plant, since the rule needs at least two counted runs to ever register a catch.
   */
  onMapCaught: number;
  /** This job's on-map catches, counted per plant-run rather than gated by the two-of-three rule. */
  onMapPlantRunRecall: RecallReport;
  verifiedControlRunCount: number;
  totalFalseFindings: number;
  falseFindingsPerVerifiedControlRun: number | null;
}

/**
 * Run the `dev` subcommand: refuse a `--report` whose batch is not a development batch or whose
 * any job carries a freeze stamp, then rescore the assembled on-map plants and false findings per
 * verified Opus control run, by job. Every assembly problem `assembleRuns` finds (a job with
 * nothing joined to it, an unverified judge job, and so on) is carried as a `notes` entry here,
 * never fatal. Development precision restricts both its numerator and its denominator to verified
 * Opus runs: an unverified run's items are never counted, and the run itself is dropped from the
 * denominator, unlike gated mode's rerun-failure rule. On-map catches are reported per plant-run
 * (`onMapPlantRunRecall`, per job and pooled), since a development bundle carries as few as one
 * planted run per job, where `onMapCaught`'s gated two-of-three rule can never register a catch;
 * `onMapCaught` stays for continuity. Never emits a bar or a class verdict.
 * @param argv - The arguments after `dev`.
 * @returns The process exit code.
 */
function runDev(argv: string[]): number {
  const reportPaths = repeatedOption(argv, '--report');
  const plantsPath = option(argv, '--plants');
  const out = option(argv, '--out');
  if (reportPaths.length === 0 || !plantsPath || !out) {
    process.stderr.write('usage: score.ts dev --report FILE [--report FILE...] --plants FILE [...] --out FILE\n');
    return 2;
  }
  const reports = loadReaderReports(reportPaths);
  const problems: string[] = [];
  for (const { report } of reports) {
    const check = checkDevelopmentBatch({ batch: report.batch, jobs: report.jobs });
    if (!check.ok) problems.push(check.problem!);
  }
  if (problems.length > 0) {
    writeJson(out, { ok: false, mode: 'development', problems });
    return 1;
  }

  const catchKeys = repeatedOption(argv, '--catch-key').map((path) => readJson<CatchPacketKey>(path));
  const adjudicatorKeys = repeatedOption(argv, '--adjudicator-key').map((path) => readJson<AdjudicatorPacketKey>(path));
  const keyRefs = buildKeyRefs(catchKeys, adjudicatorKeys);

  const { byId: indexed, problems: indexProblems, notes: indexNotes } = indexReaderJobs(reports, scoringClassNames(), keyRefs);
  if (indexProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'development', problems: indexProblems });
    return 1;
  }

  const controlIdsResult = validateControlIds(
    option(argv, '--control-ids'),
    indexed,
    reports.map(({ report }) => report.batch),
  );
  if (!controlIdsResult.ok) {
    writeJson(out, { ok: false, mode: 'development', problems: [controlIdsResult.problem] });
    return 1;
  }

  const assembled = assembleRuns({
    indexed,
    catchRulingsPaths: repeatedOption(argv, '--catch-rulings'),
    catchKeys,
    adjudicatorRulingsPaths: repeatedOption(argv, '--adjudicator-rulings'),
    adjudicatorKeys,
  });

  const plants = loadPlants(plantsPath, jobClassesOf(indexed));
  const maps = loadMaps(repeatedOption(argv, '--map')) as Record<string, Parameters<typeof isPlantOnMap>[0]>;
  const tallies = tallyPlantCatches(plants, assembled.catchRunsByJob, true);
  const onMapTallies = tallies.filter((tally) => {
    const map = maps[tally.job];
    return map !== undefined && isPlantOnMap(map, tally);
  });

  const jobs = [...new Set([...plants.map((p) => p.job), ...assembled.precisionRuns.map((r) => r.job)])];
  const byJob: Record<string, DevJobResult> = {};
  for (const job of jobs) {
    const jobOnMap = onMapTallies.filter((tally) => tally.job === job);
    const controlRuns = assembled.precisionRuns.filter((run) => run.job === job && run.opus && run.verified);
    const totalFalseFindings = controlRuns.reduce((sum, run) => sum + findingCountsForRun(run).falseFindings, 0);
    byJob[job] = {
      job,
      onMapPlantCount: jobOnMap.length,
      onMapCaught: jobOnMap.filter((tally) => tally.caught).length,
      onMapPlantRunRecall: recallByPlantRun(jobOnMap),
      verifiedControlRunCount: controlRuns.length,
      totalFalseFindings,
      falseFindingsPerVerifiedControlRun: controlRuns.length === 0 ? null : totalFalseFindings / controlRuns.length,
    };
  }

  const onMapPlantRunRecall = recallByPlantRun(onMapTallies);
  writeJson(out, {
    ok: true,
    mode: 'development',
    byJob,
    onMapRecall: recallByClass(onMapTallies),
    onMapPlantRunRecall,
    onMapPlantRunWilson: wilsonInterval(onMapPlantRunRecall.caught, onMapPlantRunRecall.total),
    plantTallies: onMapTallies.map((tally) => ({ plantId: tally.plantId, job: tally.job, runsCaught: tally.runsCaught })),
    ...(controlIdsResult.ids ? { pooledPrecision: buildPooledPrecision(controlIdsResult.ids, assembled.precisionRuns) } : {}),
    notes: [...indexNotes, ...assembled.problems],
  });
  return 0;
}

/** The gated run's every reported (never gating) measure this scorer computes from real inputs, plus its three named deferrals. */
interface GatedReportedMeasures {
  recallByClass: Record<ClassId, ReturnType<typeof recallByClass>[ClassId]>;
  recallByPlantKind: ReturnType<typeof recallByPlantKind>;
  perRunRecall: number[];
  stability: ReturnType<typeof stabilityKappa>;
  heldOutRecall: { found: number; total: number; contaminated: true };
  onPathShareByJob: Record<string, number | null>;
  lineDistanceByPlant: Record<string, number | null>;
  /** Recall grouped by a plant's own on-path section rank; the bucket keys are string ranks ("1", "2", ...). */
  recallByPosition: Record<string, ReturnType<typeof recallByClass>[ClassId]>;
  /** Recall grouped by a plant-run pair's own prior-stall state: whether that specific run recorded any stall, not merely any run on the job. */
  recallAfterPriorStall: { stalled: { caught: number; total: number; rate: number | null }; clean: { caught: number; total: number; rate: number | null } };
  ruleCandidatesByRun: Array<{ runId: string; role: 'planted' | 'control'; count: number; reason: string }>;
  deferred: string[];
}

/**
 * Run the `gated` subcommand: verify every `--report`'s and every judge batch report's
 * completeness and freeze stamp, the post-freeze chain's job-scoped dependencies and its coverage
 * of every gated input path, and the agreement sample's own ruling coverage, then score the pooled
 * and per-class bars, the agreement bar (computed before Fable's replacements are applied to the
 * catch and precision records the bars are then scored from), the held-out found rule, and the
 * reported measures.
 * @param argv - The arguments after `gated`.
 * @returns The process exit code.
 */
function runGated(argv: string[]): number {
  const reportPaths = repeatedOption(argv, '--report');
  const plantsPath = option(argv, '--plants');
  const thresholdsPath = option(argv, '--thresholds');
  const manifestPath = option(argv, '--manifest');
  const chainPath = option(argv, '--chain');
  const root = option(argv, '--root');
  const agreementSamplePath = option(argv, '--agreement-sample');
  const agreementRulingsPaths = repeatedOption(argv, '--agreement-rulings');
  const heldOutIdsRaw = option(argv, '--heldout-ids');
  const out = option(argv, '--out');
  if (
    reportPaths.length === 0 ||
    !plantsPath ||
    !thresholdsPath ||
    !manifestPath ||
    !chainPath ||
    !root ||
    !agreementSamplePath ||
    agreementRulingsPaths.length === 0 ||
    heldOutIdsRaw === undefined ||
    !out
  ) {
    process.stderr.write(
      'usage: score.ts gated --report FILE [...] --plants FILE --thresholds FILE --manifest FILE --chain FILE --root DIR --agreement-sample FILE --agreement-rulings FILE [...] --heldout-ids ID,ID,... --out FILE\n',
    );
    return 2;
  }

  const { manifest, hash: manifestHash } = loadManifest(resolve(manifestPath));
  const problems: string[] = [];
  const genesisCheck = checkManifestIsGenesis(resolve(chainPath), manifestHash);
  if (!genesisCheck.ok) problems.push(genesisCheck.problem!);

  const reports = loadReaderReports(reportPaths);
  for (const { path, report } of reports) {
    const completeCheck = checkReportComplete({ label: path, stopReason: report.stopReason, jobs: report.jobs });
    if (!completeCheck.ok) problems.push(...completeCheck.problems);
    for (const job of report.jobs) {
      const stampCheck = checkGatedStamp({ label: `${path} (job ${job.id})`, freeze: job.freeze }, manifest.tag, manifestHash);
      if (!stampCheck.ok) problems.push(stampCheck.problem!);
    }
  }

  const catchRulingsPaths = repeatedOption(argv, '--catch-rulings');
  const adjudicatorRulingsPaths = repeatedOption(argv, '--adjudicator-rulings');
  // Every judge batch report gated mode reads (catch-judge, adjudicator, agreement) must itself be
  // complete and correctly stamped, the same as a reader report.
  const judgeReportGroups: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['catch-judge', catchRulingsPaths],
    ['adjudicator', adjudicatorRulingsPaths],
    ['agreement', agreementRulingsPaths],
  ];
  for (const [kind, paths] of judgeReportGroups) {
    for (const path of paths) {
      // A missing or unparseable judge batch report is itself a problem, named and never a crash,
      // so a caller's mistaken path always gets a clean refusal even when an earlier problem
      // (checked in the same pass, not short-circuited) would otherwise have made this file moot.
      let report: JudgeBatchReport;
      try {
        report = readJson<JudgeBatchReport>(path);
      } catch (error) {
        problems.push(`${kind} ${path}: could not be read (${(error as Error).message})`);
        continue;
      }
      const completeCheck = checkReportComplete({ label: `${kind} ${path}`, stopReason: report.stopReason, jobs: report.jobs ?? [] });
      if (!completeCheck.ok) problems.push(...completeCheck.problems);
      for (const job of report.jobs ?? []) {
        const stampCheck = checkGatedStamp({ label: `${kind} ${path} (job ${job.id})`, freeze: job.freeze }, manifest.tag, manifestHash);
        if (!stampCheck.ok) problems.push(stampCheck.problem!);
      }
    }
  }
  if (problems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems });
    return 1;
  }

  const catchKeyPaths = repeatedOption(argv, '--catch-key');
  const catchKeys = catchKeyPaths.map((path) => readJson<CatchPacketKey>(path));
  const adjudicatorKeyPaths = repeatedOption(argv, '--adjudicator-key');
  const adjudicatorKeys = adjudicatorKeyPaths.map((path) => readJson<AdjudicatorPacketKey>(path));
  const keyRefs = buildKeyRefs(catchKeys, adjudicatorKeys);

  const { byId: indexed, problems: indexProblems, notes: indexNotes } = indexReaderJobs(reports, scoringClassNames(), keyRefs);
  if (indexProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: indexProblems });
    return 1;
  }

  // The chain dependency the scorer can actually verify for a planted-run report is the
  // thresholds file and the plant record (both recomputed or planted after the freeze and before
  // any planted run, per the spec's sequence); a held-out or control/mapping-run report depends on
  // nothing past genesis, since a held-out run runs inside the gated mapping batch, whose chain
  // head predates the plant record, and never reads it. The planted batch file and each planted
  // tree's digest the spec also names are not read by this scorer, so they are not separately
  // checked here.
  const thresholdsRelPath = relative(resolve(root), resolve(thresholdsPath));
  const plantsRelPath = relative(resolve(root), resolve(plantsPath));
  const chainChecks: GatedChainCheck[] = [];
  for (const { path, report } of reports) {
    for (const job of report.jobs) {
      const parsed = parseReaderJobId(job.id);
      const dependsOn = parsed?.role === 'planted' ? [thresholdsRelPath, plantsRelPath] : [];
      chainChecks.push({ label: `${path} (job ${job.id})`, chainHead: job.freeze!.chainHead, dependsOn });
    }
  }
  const sampleRelPath = relative(resolve(root), resolve(agreementSamplePath));
  const rulingsRelPaths = agreementRulingsPaths.map((path) => relative(resolve(root), resolve(path)));
  const chainResult = verifyGatedChain({
    chainFile: resolve(chainPath),
    root: resolve(root),
    checks: chainChecks,
    sampleBeforeRulings: { samplePath: sampleRelPath, rulingsPaths: rulingsRelPaths },
  });
  if (!chainResult.ok) {
    writeJson(out, { ok: false, mode: 'gated', problems: chainResult.problems });
    return 1;
  }

  // Every gated input path must itself carry a chain entry, not merely pass the job-scoped
  // dependency checks above (which only ever name a handful of dependencies per job).
  const mapValues = repeatedOption(argv, '--map');
  const chainEntryTargets: Array<{ label: string; path: string }> = [
    { label: 'plants', path: plantsPath },
    { label: 'thresholds', path: thresholdsPath },
    ...mapFilePaths(mapValues).map((path) => ({ label: 'map', path })),
    ...catchKeyPaths.map((path) => ({ label: 'catch key', path })),
    ...adjudicatorKeyPaths.map((path) => ({ label: 'adjudicator key', path })),
    ...catchRulingsPaths.map((path) => ({ label: 'catch rulings', path })),
    ...adjudicatorRulingsPaths.map((path) => ({ label: 'adjudicator rulings', path })),
    { label: 'agreement sample', path: agreementSamplePath },
  ];
  const entryProblems: string[] = [];
  for (const { label, path } of chainEntryTargets) {
    const rel = relative(resolve(root), resolve(path));
    if (!latestEntry(resolve(chainPath), rel)) entryProblems.push(`${label} "${rel}" has no chain entry`);
  }
  if (entryProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: entryProblems });
    return 1;
  }

  const thresholds = readJson<Parameters<typeof scorePooledSensitivity>[1]>(thresholdsPath);
  const seedProblem =
    thresholds.seed !== manifest.seeds[OC_CURVE_SEED_KEY]
      ? [`thresholds file's seed (${thresholds.seed}) does not match the manifest's pinned "${OC_CURVE_SEED_KEY}" seed (${manifest.seeds[OC_CURVE_SEED_KEY]})`]
      : [];
  if (seedProblem.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: seedProblem });
    return 1;
  }

  const assembled = assembleRuns({ indexed, catchRulingsPaths, catchKeys, adjudicatorRulingsPaths, adjudicatorKeys });
  if (assembled.problems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: assembled.problems });
    return 1;
  }

  const plants = loadPlants(plantsPath, jobClassesOf(indexed));
  try {
    assertThresholdsMatchTally(plants, thresholds);
  } catch (error) {
    writeJson(out, { ok: false, mode: 'gated', problems: [(error as Error).message] });
    return 1;
  }

  // The planned pool: exactly three Opus runs per job, never scripter-heldout, never non-Opus.
  const jobsByClass: Record<ClassId, string[]> = { 'docs-only': [], 'docs-and-binary': [], 'docs-and-site': [], repository: [] };
  for (const [job, classId] of Object.entries(JOB_CLASS)) jobsByClass[classId as ClassId].push(job);
  const admissiblePrecisionRuns = assembled.precisionRuns.filter((run) => run.opus);
  const missingProblems: string[] = [];
  for (const classId of CLASS_IDS) {
    const runIds = new Set(
      admissiblePrecisionRuns
        .filter((run) => run.classId === classId)
        .map((run) => {
          const parsed = parseReaderJobId(run.runId);
          return parsed ? `${run.job}-${parsed.index}` : run.runId;
        }),
    );
    for (const missing of missingPlannedRuns(jobsByClass[classId], runIds)) missingProblems.push(`class "${classId}": planned mapping run "${missing}" is missing, non-Opus, or was excluded (scripter-heldout is never in this pool)`);
  }
  if (missingProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: missingProblems });
    return 1;
  }

  const sample = readJson<AgreementSampleFile>(agreementSamplePath);
  const agreementRulingsReports = loadJudgeBatchReports(agreementRulingsPaths);
  const validAgreementJobs = agreementRulingsReports.flatMap((report) => report.jobs).filter((job) => job.verified?.ok === true && job.stoppedBy === undefined);
  const rulingCounts = new Map<string, number>();
  const fableByItemId = new Map<string, string>();
  for (const job of validAgreementJobs) {
    for (const ruling of job.rulings as AgreementRuling[]) {
      rulingCounts.set(ruling.itemId, (rulingCounts.get(ruling.itemId) ?? 0) + 1);
      fableByItemId.set(ruling.itemId, ruling.ruling);
    }
  }
  const sampleItemIds = [...sample.findings.map((finding) => finding.itemId), ...sample.catchCalls.map((catchCall) => catchCall.itemId)];
  const rulingProblems: string[] = [];
  for (const itemId of sampleItemIds) {
    const count = rulingCounts.get(itemId) ?? 0;
    if (count !== 1) rulingProblems.push(`agreement sample item "${itemId}": ${count} ruling(s) from a verified, unstopped agreement job, exactly one required`);
  }
  if (rulingProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: rulingProblems });
    return 1;
  }

  const agreement: AgreementResult = computeAgreement({
    findings: sample.findings.map((finding) => ({ itemId: finding.itemId, primaryLabel: finding.primaryLabel, fableLabel: fableByItemId.get(finding.itemId)! })),
    catchCalls: sample.catchCalls.map((catchCall) => ({ itemId: catchCall.itemId, primaryLabel: catchCall.primaryLabel, fableLabel: fableByItemId.get(catchCall.itemId)! })),
  });
  const replacements = deriveReplacements(
    sample,
    sample.findings.map((finding) => ({ itemId: finding.itemId, fableLabel: fableByItemId.get(finding.itemId)! })),
    sample.catchCalls.map((catchCall) => ({ itemId: catchCall.itemId, fableLabel: fableByItemId.get(catchCall.itemId)! })),
  );

  const catchRunsByJob = applyCatchReplacements(assembled.catchRunsByJob, replacements);
  const precisionRuns = applyPrecisionReplacements(admissiblePrecisionRuns, replacements);

  const tallies = tallyPlantCatches(plants, catchRunsByJob);
  const pooledSensitivity: PooledSensitivityResult = scorePooledSensitivity(tallies, thresholds);
  const classSensitivities = {} as Record<ClassId, ClassSensitivityResult>;
  for (const classId of CLASS_IDS) classSensitivities[classId] = scoreClassSensitivity(classId, tallies, thresholds);
  const plannedJobCounts = Object.fromEntries(CLASS_IDS.map((classId) => [classId, jobsByClass[classId].length])) as Record<ClassId, number>;
  const classPrecisions: Record<ClassId, ClassPrecisionResult> = precisionByClass(precisionRuns, plannedJobCounts);
  const { classes, allClassesFailed }: { classes: ClassVerdict[]; allClassesFailed: boolean } = scoreClassVerdicts({
    pooledSensitivity,
    agreement,
    classSensitivities,
    classPrecisions,
  });
  const heldOutIds = heldOutIdsRaw.split(',').filter((id) => id.length > 0);
  const heldOut = scoreHeldOut(heldOutIds, assembled.heldOutRuns);

  const maps = loadMaps(mapValues) as Record<string, Parameters<typeof isPlantOnMap>[0] & { onPathShare: number }>;
  writeJson(out, {
    ok: true,
    mode: 'gated',
    pooledSensitivity,
    agreement,
    classes,
    allClassesFailed,
    heldOut,
    reported: gatedReportedMeasures({ tallies, precisionRuns, heldOut, indexed, maps, catchRunsByJob }),
    notes: indexNotes,
  });
  return 0;
}

/**
 * The reported, never-gated measures this scorer computes from real inputs, plus three named
 * deferrals: `ruleCandidates[]` precision is not ruled by any judge, so only the raw per-run count
 * is reported; how many the planted runs found again on unplanted sections has no ruling to read,
 * since planted runs score catches only; and fix confirmation, since the report schema gives
 * `stalls[]` and `assumed[]` no page location to place a control-run finding at a plant's site.
 * @returns Every measure the assembled inputs support, plus the named `deferred` list.
 */
function gatedReportedMeasures({
  tallies,
  precisionRuns,
  heldOut,
  indexed,
  maps,
  catchRunsByJob,
}: {
  tallies: readonly PlantCatchTally[];
  precisionRuns: readonly PrecisionRunRecord[];
  heldOut: ReturnType<typeof scoreHeldOut>;
  indexed: ReadonlyMap<string, IndexedReaderJob>;
  maps: Record<string, Parameters<typeof isPlantOnMap>[0] & { onPathShare: number }>;
  catchRunsByJob: Record<string, CatchRunRecord[]>;
}): GatedReportedMeasures {
  const onPathShareByJob: Record<string, number | null> = {};
  for (const [job, map] of Object.entries(maps)) onPathShareByJob[job] = map.onPathShare;

  const stepsByJob = new Map<string, Array<{ page: string; line: number }>>();
  for (const job of indexed.values()) {
    if (job.parsed.role !== 'control') continue;
    const steps = (job.outcome.steps ?? []).filter((step) => step.quote.ok).map((step) => ({ page: step.quote.path, line: Number(step.quote.startLine ?? step.quote.line) }));
    stepsByJob.set(job.parsed.job, [...(stepsByJob.get(job.parsed.job) ?? []), ...steps]);
  }
  const lineDistanceByPlant: Record<string, number | null> = {};
  for (const tally of tallies) lineDistanceByPlant[tally.plantId] = nearestStepDistance(tally, stepsByJob.get(tally.job) ?? []);

  // A plant-run pair's own prior-stall state: whether that specific counted run (by its position
  // in catchRunsByJob, the same order tallyPlantCatches read) recorded any stall, never merely
  // whether any run on the job did.
  const stalledRunIds = new Set<string>();
  for (const job of indexed.values()) if (job.outcome.stalls.length > 0) stalledRunIds.add(job.id);
  let stalledCaught = 0;
  let stalledTotal = 0;
  let cleanCaught = 0;
  let cleanTotal = 0;
  for (const tally of tallies) {
    const runs = catchRunsByJob[tally.job] ?? [];
    tally.runsCaught.forEach((caught, position) => {
      const run = runs[position];
      const stalled = run !== undefined && stalledRunIds.has(run.runId);
      if (stalled) {
        stalledTotal += 1;
        if (caught) stalledCaught += 1;
      } else {
        cleanTotal += 1;
        if (caught) cleanCaught += 1;
      }
    });
  }

  const ruleCandidatesByRun = [...indexed.values()]
    .filter((job) => job.parsed.role === 'planted' || job.parsed.role === 'control')
    .map((job) => ({
      runId: job.id,
      role: job.parsed.role as 'planted' | 'control',
      count: job.outcome.ruleCandidates?.length ?? 0,
      reason: 'not ruled: judges never see ruleCandidates (spec, Scoring)',
    }));

  return {
    recallByClass: recallByClass(tallies),
    recallByPlantKind: recallByPlantKind(tallies),
    perRunRecall: perRunRecall(tallies),
    stability: stabilityKappa(tallies),
    heldOutRecall: { found: heldOut.filter((defect) => defect.found).length, total: heldOut.length, contaminated: true },
    onPathShareByJob,
    lineDistanceByPlant,
    recallByPosition: recallByBucket(tallies, (tally) => {
      const map = maps[tally.job];
      const position = map ? plantPathPosition(map, tally) : null;
      return position === null ? null : String(position);
    }),
    recallAfterPriorStall: {
      stalled: { caught: stalledCaught, total: stalledTotal, rate: stalledTotal === 0 ? null : stalledCaught / stalledTotal },
      clean: { caught: cleanCaught, total: cleanTotal, rate: cleanTotal === 0 ? null : cleanCaught / cleanTotal },
    },
    ruleCandidatesByRun,
    deferred: [
      "ruleCandidates[] precision: not ruled: judges never see ruleCandidates (spec, Scoring); the raw per-run count is reported above instead.",
      "how many the planted runs found again on unplanted sections: planted runs score catches only (spec, Pools); no ruling exists on their other items.",
      "fix confirmation: stalls[] and assumed[] carry no page location in the report schema, so a control-run finding cannot be placed at a plant's site.",
    ],
  };
}

/**
 * The command-line entry point.
 * @param argv - The arguments after the script name.
 * @returns The process exit code.
 */
export function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (command === 'sample') return runSample(rest);
  if (command === 'dev') return runDev(rest);
  if (command === 'gated') return runGated(rest);
  process.stderr.write('usage: score.ts sample|dev|gated ...\n');
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
