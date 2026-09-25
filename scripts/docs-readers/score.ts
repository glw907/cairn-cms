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
 * packet it rules, which the key file's own `report.jobId` asserts.
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
 *     --plants FILE [--map JOB=FILE...] --out FILE
 *   npx tsx scripts/docs-readers/score.ts gated
 *     --report FILE [--report FILE...]
 *     [--catch-rulings FILE...] [--catch-key FILE...]
 *     [--adjudicator-rulings FILE...] [--adjudicator-key FILE...]
 *     --plants FILE [--map JOB=FILE...] [--heldout-ids ID,ID,...]
 *     --thresholds FILE --manifest FILE --chain FILE --root DIR
 *     --agreement-sample FILE [--agreement-rulings FILE...]
 *     --out FILE
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSES_DIR, judgeKindForClass, loadClasses } from './lib/class-schema.js';
import { loadManifest } from './freeze.js';
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
  finalOutcome,
  indexReaderJobs,
  joinAdjudications,
  joinCatchRulings,
  parseReaderJobId,
  type IndexedReaderJob,
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
  scoreClassSensitivity,
  scoreHeldOut,
  scorePooledSensitivity,
  stabilityKappa,
  tallyPlantCatches,
  type ClassSensitivityResult,
  type PlantCatchTally,
  type PooledSensitivityResult,
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
import type { BatchReport } from './lib/types.js';
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
 * Assemble catch and precision runs from real artifacts: the indexed reader jobs, the catch-judge
 * and adjudicator rulings and key files. Shared by development and gated mode alike.
 * @returns Every assembled piece, plus every note (a job the judges carried no rulings for; never
 * fatal, since a missing ruling simply scores as catching nothing or zero items).
 */
function assembleRuns({
  indexed,
  catchRulingsPaths,
  catchKeyPaths,
  adjudicatorRulingsPaths,
  adjudicatorKeyPaths,
}: {
  indexed: ReadonlyMap<string, IndexedReaderJob>;
  catchRulingsPaths: string[];
  catchKeyPaths: string[];
  adjudicatorRulingsPaths: string[];
  adjudicatorKeyPaths: string[];
}): {
  catchRunsByJob: Record<string, CatchRunRecord[]>;
  heldOutRuns: CatchRunRecord[];
  precisionRuns: PrecisionRunRecord[];
  notes: string[];
  problems: string[];
} {
  const catchRulingsReports = loadJudgeBatchReports(catchRulingsPaths);
  const catchKeys = catchKeyPaths.map((path) => readJson<CatchPacketKey>(path));
  const { byReaderJobId: catchesByJob, problems: catchProblems } = joinCatchRulings(catchRulingsReports, catchKeys);
  const { catchRunsByJob, heldOutRuns, notes: catchNotes } = buildCatchRunRecords(indexed, catchesByJob);

  const adjudicatorRulingsReports = loadJudgeBatchReports(adjudicatorRulingsPaths);
  const adjudicatorKeys = adjudicatorKeyPaths.map((path) => readJson<AdjudicatorPacketKey>(path));
  const { byReaderJobId: itemsByJob, problems: adjProblems } = joinAdjudications(adjudicatorRulingsReports, adjudicatorKeys);
  const { runs: precisionRuns, notes: precisionNotes } = buildPrecisionRunRecords(indexed, itemsByJob);

  return { catchRunsByJob, heldOutRuns, precisionRuns, notes: [...catchNotes, ...precisionNotes], problems: [...catchProblems, ...adjProblems] };
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

/** One development job's on-map and precision figures. */
interface DevJobResult {
  job: string;
  onMapPlantCount: number;
  onMapCaught: number;
  verifiedControlRunCount: number;
  totalFalseFindings: number;
  falseFindingsPerVerifiedControlRun: number | null;
}

/**
 * Run the `dev` subcommand: refuse a `--report` whose batch is not a development batch or whose
 * any job carries a freeze stamp, then rescore the assembled on-map plants and false findings per
 * verified Opus control run, by job. Development precision restricts both its numerator and its
 * denominator to verified Opus runs: an unverified run's items are never counted, and the run
 * itself is dropped from the denominator, unlike gated mode's rerun-failure rule. Never emits a
 * bar or a class verdict.
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

  const { byId: indexed, problems: indexProblems } = indexReaderJobs(
    reports.map((r) => r.report),
    scoringClassNames(),
  );
  if (indexProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'development', problems: indexProblems });
    return 1;
  }

  const assembled = assembleRuns({
    indexed,
    catchRulingsPaths: repeatedOption(argv, '--catch-rulings'),
    catchKeyPaths: repeatedOption(argv, '--catch-key'),
    adjudicatorRulingsPaths: repeatedOption(argv, '--adjudicator-rulings'),
    adjudicatorKeyPaths: repeatedOption(argv, '--adjudicator-key'),
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
      verifiedControlRunCount: controlRuns.length,
      totalFalseFindings,
      falseFindingsPerVerifiedControlRun: controlRuns.length === 0 ? null : totalFalseFindings / controlRuns.length,
    };
  }

  writeJson(out, { ok: true, mode: 'development', byJob, onMapRecall: recallByClass(onMapTallies), notes: assembled.notes, assemblyProblems: assembled.problems });
  return 0;
}

/** The gated run's every reported (never gating) measure this scorer computes from real inputs, plus its two named deferrals. */
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
  /** Recall grouped by whether any run scoring the plant's own job carried a stall (a per-job proxy: the schema gives a stall no line, so no finer, per-run positional read is possible). */
  recallAfterPriorStall: Record<string, ReturnType<typeof recallByClass>[ClassId]>;
  ruleCandidatesByRun: Array<{ runId: string; count: number; reason: string }>;
  deferred: string[];
}

/**
 * Run the `gated` subcommand: verify every `--report`'s completeness, freeze stamp, and chain
 * dependencies, then score the pooled and per-class bars, the agreement bar (computed before
 * Fable's replacements are applied to the catch and precision records the bars are then scored
 * from), the held-out found rule, and the reported measures.
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
  const out = option(argv, '--out');
  if (reportPaths.length === 0 || !plantsPath || !thresholdsPath || !manifestPath || !chainPath || !root || !agreementSamplePath || !out) {
    process.stderr.write('usage: score.ts gated --report FILE [...] --plants FILE --thresholds FILE --manifest FILE --chain FILE --root DIR --agreement-sample FILE --out FILE\n');
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
  if (problems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems });
    return 1;
  }

  const { byId: indexed, problems: indexProblems } = indexReaderJobs(
    reports.map((r) => r.report),
    scoringClassNames(),
  );
  if (indexProblems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems: indexProblems });
    return 1;
  }

  // The chain dependency the scorer can actually verify for a planted-run report is the
  // thresholds file (recomputed after planting and before any planted run, per the spec's
  // sequence); a control/mapping-run report depends on nothing past genesis. The planted batch
  // file and each planted tree's digest the spec also names are not read by this scorer, so they
  // are not separately checked here.
  const thresholdsRelPath = relative(resolve(root), resolve(thresholdsPath));
  const chainChecks: GatedChainCheck[] = [];
  for (const { path, report } of reports) {
    for (const job of report.jobs) {
      const parsed = parseReaderJobId(job.id);
      const dependsOn = parsed?.role === 'planted' ? [thresholdsRelPath] : [];
      chainChecks.push({ label: `${path} (job ${job.id})`, chainHead: job.freeze!.chainHead, dependsOn });
    }
  }
  const agreementRulingsPaths = repeatedOption(argv, '--agreement-rulings');
  const sampleRelPath = relative(resolve(root), resolve(agreementSamplePath));
  const rulingsRelPath = agreementRulingsPaths[0] ? relative(resolve(root), resolve(agreementRulingsPaths[0])) : undefined;
  const chainResult = verifyGatedChain({
    chainFile: resolve(chainPath),
    root: resolve(root),
    checks: chainChecks,
    ...(rulingsRelPath ? { sampleBeforeRulings: { samplePath: sampleRelPath, rulingsPath: rulingsRelPath } } : {}),
  });
  if (!chainResult.ok) {
    writeJson(out, { ok: false, mode: 'gated', problems: chainResult.problems });
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

  const assembled = assembleRuns({
    indexed,
    catchRulingsPaths: repeatedOption(argv, '--catch-rulings'),
    catchKeyPaths: repeatedOption(argv, '--catch-key'),
    adjudicatorRulingsPaths: repeatedOption(argv, '--adjudicator-rulings'),
    adjudicatorKeyPaths: repeatedOption(argv, '--adjudicator-key'),
  });

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
  const fableByItemId = new Map<string, string>();
  for (const report of agreementRulingsReports) for (const job of report.jobs) for (const ruling of job.rulings as Array<{ itemId: string; ruling: string }>) fableByItemId.set(ruling.itemId, ruling.ruling);

  const agreement: AgreementResult = computeAgreement({
    findings: sample.findings.map((f) => ({ itemId: f.itemId, primaryLabel: f.primaryLabel, fableLabel: fableByItemId.get(f.itemId) ?? f.primaryLabel })),
    catchCalls: sample.catchCalls.map((c) => ({ itemId: c.itemId, primaryLabel: c.primaryLabel, fableLabel: fableByItemId.get(c.itemId) ?? c.primaryLabel })),
  });
  const replacements = deriveReplacements(
    sample,
    sample.findings.map((f) => ({ itemId: f.itemId, fableLabel: fableByItemId.get(f.itemId) ?? f.primaryLabel })),
    sample.catchCalls.map((c) => ({ itemId: c.itemId, fableLabel: fableByItemId.get(c.itemId) ?? c.primaryLabel })),
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
  const heldOutIdsRaw = option(argv, '--heldout-ids');
  const heldOutIds = heldOutIdsRaw ? heldOutIdsRaw.split(',').filter((id) => id.length > 0) : [];
  const heldOut = scoreHeldOut(heldOutIds, assembled.heldOutRuns);

  const maps = loadMaps(repeatedOption(argv, '--map')) as Record<string, Parameters<typeof isPlantOnMap>[0] & { onPathShare: number }>;
  writeJson(out, {
    ok: true,
    mode: 'gated',
    pooledSensitivity,
    agreement,
    classes,
    allClassesFailed,
    heldOut,
    reported: gatedReportedMeasures({ tallies, precisionRuns, heldOut, indexed, maps }),
    notes: assembled.notes,
    assemblyProblems: assembled.problems,
  });
  return 0;
}

/**
 * The reported, never-gated measures this scorer computes from real inputs, plus two named
 * deferrals: `ruleCandidates[]` precision is not ruled by any judge, so only the raw per-run count
 * is reported; and how many the planted runs found again on unplanted sections has no ruling to
 * read, since planted runs score catches only.
 * @returns Every measure the assembled inputs support, plus the named `deferred` list.
 */
function gatedReportedMeasures({
  tallies,
  precisionRuns,
  heldOut,
  indexed,
  maps,
}: {
  tallies: readonly PlantCatchTally[];
  precisionRuns: readonly PrecisionRunRecord[];
  heldOut: ReturnType<typeof scoreHeldOut>;
  indexed: ReadonlyMap<string, IndexedReaderJob>;
  maps: Record<string, Parameters<typeof isPlantOnMap>[0] & { onPathShare: number }>;
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

  const stalledJobs = new Set<string>();
  for (const job of indexed.values()) if (job.parsed.role === 'planted' && job.outcome.stalls.length > 0) stalledJobs.add(job.parsed.job);

  const ruleCandidatesByRun = [...indexed.values()]
    .filter((job) => job.parsed.role === 'planted')
    .map((job) => ({ runId: job.id, count: job.outcome.ruleCandidates?.length ?? 0, reason: 'not ruled: judges never see ruleCandidates (spec, Scoring)' }));

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
    recallAfterPriorStall: recallByBucket(tallies, (tally) => (stalledJobs.has(tally.job) ? 'stalled' : 'clean')),
    ruleCandidatesByRun,
    deferred: [
      "ruleCandidates[] precision: not ruled: judges never see ruleCandidates (spec, Scoring); the raw per-run count is reported above instead.",
      "how many the planted runs found again on unplanted sections: planted runs score catches only (spec, Pools); no ruling exists on their other items.",
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
