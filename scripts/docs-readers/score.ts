#!/usr/bin/env -S npx tsx
/**
 * The scorer: development mode rescores pass 1's saved reports and round 1 under this spec's
 * counting rules, labeled, with no bar or class verdict; gated mode verifies a gated batch's
 * reports against the freeze manifest and the post-freeze chain, then scores the pooled and
 * per-class sensitivity and precision bars, the agreement bar, the held-out found rule, and the
 * spec's reported-only measures, against a recomputed thresholds file. Neither mode reads a
 * report, a judge packet, or a key file directly; a caller assembles a scoring bundle (below) from
 * those sources and hands it to whichever mode applies. The `--report` files are read only for
 * their batch name (development mode) or their per-job freeze stamp (gated mode); the bundle
 * carries every plant, run, and threshold the scoring itself reads.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/score.ts sample --pool FILE --out FILE
 *   npx tsx scripts/docs-readers/score.ts dev --report FILE [--report FILE...] --bundle FILE --out FILE
 *   npx tsx scripts/docs-readers/score.ts gated --report FILE [--report FILE...]
 *     --manifest FILE --chain FILE --root DIR --bundle FILE --out FILE
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest } from './freeze.js';
import { checkDevelopmentBatch, checkGatedStamp, verifyGatedChain, type GatedChainCheck } from './lib/score-integrity.js';
import {
  isPlantOnMap,
  perRunRecall,
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
import { findingCountsForRun, precisionByClass, type ClassPrecisionResult } from './lib/score-precision.js';
import {
  applyCatchReplacements,
  applyPrecisionReplacements,
  computeAgreement,
  drawAgreementSample,
  type AgreementReplacement,
  type AgreementResult,
  type AgreementSampleFile,
  type CatchCallPoolItem,
  type FindingPoolItem,
  type RuledItem,
} from './lib/score-agreement.js';
import { scoreClassVerdicts, type ClassVerdict } from './lib/score-verdict.js';
import { CLASS_IDS, type CatchRunRecord, type ClassId, type PlantSpec, type PrecisionRunRecord } from './lib/score-types.js';
import { loadSavedBatchReport } from './lib/transcript.js';
import type { PathMap } from './path-map.js';
import type { ThresholdsFile } from './oc-curve.js';
import type { BatchReport } from './lib/types.js';

/**
 * The scoring input a development-mode run reads, once its `--report` files have cleared the
 * batch-name check: every development plant, each job's path map (proxy or steps mode, for the
 * on-map filter), each job's planted-run catch records, and the round's control-run precision
 * records.
 */
export interface DevBundle {
  round: string;
  plants: PlantSpec[];
  pathMaps: Record<string, PathMap>;
  catchRunsByJob: Record<string, CatchRunRecord[]>;
  precisionRuns: PrecisionRunRecord[];
}

/**
 * The scoring input a gated run reads, once its `--report` files have cleared the stamp and chain
 * checks: every test plant, each job's planted-run catch records, the held-out defects and their
 * scripter-heldout runs, the mapping-run precision pool, the recomputed thresholds file, and the
 * agreement sample's own primary and Fable rulings (with Fable's replacements, applied after
 * agreement is computed). `chainDependsOn` names the chain-relative artifact paths this scoring
 * run reads, checked against each report's own chain head.
 */
export interface GatedBundle {
  plants: PlantSpec[];
  catchRunsByJob: Record<string, CatchRunRecord[]>;
  heldOut: { ids: string[]; runs: CatchRunRecord[] };
  precisionRuns: PrecisionRunRecord[];
  thresholds: ThresholdsFile;
  agreement: { findings: RuledItem[]; catchCalls: RuledItem[]; replacements?: AgreementReplacement[] };
  chainDependsOn: string[];
}

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
 * Load every `--report` file as a saved batch report, tolerating the earlier report shape via the
 * shared loader.
 * @param paths - The report file paths.
 * @returns Each path, paired with its parsed batch report.
 */
function loadReports(paths: string[]): Array<{ path: string; report: BatchReport }> {
  return paths.map((path) => ({ path, report: loadSavedBatchReport(readFileSync(resolve(path), 'utf8')) }));
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
 * Run the `dev` subcommand: refuse a `--report` file whose batch is not a development batch, then
 * rescore the bundle's on-map plants and false findings per verified Opus control run, by job.
 * Never emits a bar or a class verdict.
 * @param argv - The arguments after `dev`.
 * @returns The process exit code.
 */
function runDev(argv: string[]): number {
  const reportPaths = repeatedOption(argv, '--report');
  const bundlePath = option(argv, '--bundle');
  const out = option(argv, '--out');
  if (reportPaths.length === 0 || !bundlePath || !out) {
    process.stderr.write('usage: score.ts dev --report FILE [--report FILE...] --bundle FILE --out FILE\n');
    return 2;
  }
  const reports = loadReports(reportPaths);
  const problems: string[] = [];
  for (const { path, report } of reports) {
    const check = checkDevelopmentBatch(report.batch);
    if (!check.ok) problems.push(`${path}: ${check.problem}`);
  }
  if (problems.length > 0) {
    writeJson(out, { ok: false, mode: 'development', problems });
    return 1;
  }

  const bundle = readJson<DevBundle>(bundlePath);
  const tallies = tallyPlantCatches(bundle.plants, bundle.catchRunsByJob, true);
  const onMapTallies = tallies.filter((tally) => {
    const plant = bundle.plants.find((p) => p.id === tally.plantId);
    const map = plant ? bundle.pathMaps[plant.job] : undefined;
    return plant !== undefined && map !== undefined && isPlantOnMap(map, plant);
  });

  const jobs = [...new Set([...bundle.plants.map((plant) => plant.job), ...bundle.precisionRuns.map((run) => run.job)])];
  const byJob: Record<string, DevJobResult> = {};
  for (const job of jobs) {
    const jobOnMap = onMapTallies.filter((tally) => tally.job === job);
    const controlRuns = bundle.precisionRuns.filter((run) => run.job === job && run.opus !== false);
    const counts = controlRuns.map(findingCountsForRun);
    const totalFalseFindings = counts.reduce((sum, c) => sum + c.falseFindings, 0);
    const verifiedControlRunCount = controlRuns.filter((run) => run.verified).length;
    byJob[job] = {
      job,
      onMapPlantCount: jobOnMap.length,
      onMapCaught: jobOnMap.filter((tally) => tally.caught).length,
      verifiedControlRunCount,
      totalFalseFindings,
      falseFindingsPerVerifiedControlRun: verifiedControlRunCount === 0 ? null : totalFalseFindings / verifiedControlRunCount,
    };
  }

  writeJson(out, {
    ok: true,
    mode: 'development',
    round: bundle.round,
    byJob,
    onMapRecall: recallByClass(onMapTallies),
  });
  return 0;
}

/** The gated run's every reported (never gating) measure this scorer computes from its bundle, plus the ones it explicitly defers. */
interface GatedReportedMeasures {
  recallByClass: Record<ClassId, ReturnType<typeof recallByClass>[ClassId]>;
  recallByPlantKind: ReturnType<typeof recallByPlantKind>;
  perRunRecall: number[];
  stability: ReturnType<typeof stabilityKappa>;
  heldOutRecall: { found: number; total: number; contaminated: true };
  notFindingItemsByRun: Array<{ runId: string; notFindingItems: number }>;
  deferred: string[];
}

/**
 * The reported, never-gated measures this scorer computes from a gated bundle, plus a named list
 * of the spec's reported measures this bundle does not carry the inputs for.
 * @param tallies - Every plant's catch tally, after replacements.
 * @param precisionRuns - The precision pool, after replacements.
 * @param heldOut - The held-out found results.
 * @returns Every measure this bundle carries the inputs to compute, plus the named `deferred` list.
 */
function gatedReportedMeasures(
  tallies: readonly PlantCatchTally[],
  precisionRuns: readonly PrecisionRunRecord[],
  heldOut: ReturnType<typeof scoreHeldOut>,
): GatedReportedMeasures {
  return {
    recallByClass: recallByClass(tallies),
    recallByPlantKind: recallByPlantKind(tallies),
    perRunRecall: perRunRecall(tallies),
    stability: stabilityKappa(tallies),
    heldOutRecall: { found: heldOut.filter((defect) => defect.found).length, total: heldOut.length, contaminated: true },
    notFindingItemsByRun: precisionRuns.map((run) => {
      const counts = findingCountsForRun(run);
      return { runId: run.runId, notFindingItems: counts.totalItems - counts.falseFindings - counts.realFindings };
    }),
    deferred: [
      "ruleCandidates[] precision: no judging pipeline scores ruleCandidates[] in this pass (judge-catch, judge-adjudicator, and judge-agreement are the only judge classes); not computed.",
      "each job's on-path share: already reported by the path map itself (PathMap.onPathShare); not duplicated here.",
      "each plant's line distance to the nearest mapping-run step: needs the mapping-run finding-span artifact joined per plant; not modeled by this bundle.",
      'fix confirmation (a control-run finding at a plant\'s site, a false alarm on corrected text): needs a post-fix control-page adjudication at the plant\'s own line; not modeled by this bundle.',
      'recall on the known on-path real defects, and how many the planted runs found again on unplanted sections: needs the mapping runs\' own real-defect adjudications joined to plant sections; not modeled by this bundle.',
    ],
  };
}

/**
 * Run the `gated` subcommand: verify every `--report`'s freeze stamp and its chain dependencies,
 * then score the pooled and per-class bars, the agreement bar (computed before Fable's
 * replacements are applied to the catch and precision records the bars are then scored from), the
 * held-out found rule, and the reported measures.
 * @param argv - The arguments after `gated`.
 * @returns The process exit code.
 */
function runGated(argv: string[]): number {
  const reportPaths = repeatedOption(argv, '--report');
  const manifestPath = option(argv, '--manifest');
  const chainPath = option(argv, '--chain');
  const root = option(argv, '--root');
  const bundlePath = option(argv, '--bundle');
  const out = option(argv, '--out');
  if (reportPaths.length === 0 || !manifestPath || !chainPath || !root || !bundlePath || !out) {
    process.stderr.write('usage: score.ts gated --report FILE [--report FILE...] --manifest FILE --chain FILE --root DIR --bundle FILE --out FILE\n');
    return 2;
  }

  const { manifest, hash: manifestHash } = loadManifest(resolve(manifestPath));
  const reports = loadReports(reportPaths);

  const problems: string[] = [];
  const stampedJobs: Array<{ label: string; chainHead: string }> = [];
  for (const { path, report } of reports) {
    for (const job of report.jobs) {
      const label = `${path} (job ${job.id})`;
      const stampCheck = checkGatedStamp({ label, freeze: job.freeze }, manifest.tag, manifestHash);
      if (!stampCheck.ok) {
        problems.push(stampCheck.problem!);
        continue;
      }
      stampedJobs.push({ label, chainHead: job.freeze!.chainHead });
    }
  }
  if (problems.length > 0) {
    writeJson(out, { ok: false, mode: 'gated', problems });
    return 1;
  }

  // The bundle is read only once every report has cleared the stamp check, the same rule
  // development mode follows: an integrity failure never goes on to read the scoring data at all.
  const bundle = readJson<GatedBundle>(bundlePath);
  const chainChecks: GatedChainCheck[] = stampedJobs.map(({ label, chainHead }) => ({ label, chainHead, dependsOn: bundle.chainDependsOn }));
  const chainResult = verifyGatedChain({ chainFile: resolve(chainPath), root: resolve(root), checks: chainChecks });
  if (!chainResult.ok) {
    writeJson(out, { ok: false, mode: 'gated', problems: chainResult.problems });
    return 1;
  }

  const agreement: AgreementResult = computeAgreement({ findings: bundle.agreement.findings, catchCalls: bundle.agreement.catchCalls });
  const replacements = bundle.agreement.replacements ?? [];
  const catchRunsByJob = applyCatchReplacements(bundle.catchRunsByJob, replacements);
  const precisionRuns = applyPrecisionReplacements(bundle.precisionRuns, replacements);

  const tallies = tallyPlantCatches(bundle.plants, catchRunsByJob);
  const pooledSensitivity: PooledSensitivityResult = scorePooledSensitivity(tallies, bundle.thresholds);
  const classSensitivities = {} as Record<ClassId, ClassSensitivityResult>;
  for (const classId of CLASS_IDS) classSensitivities[classId] = scoreClassSensitivity(classId, tallies, bundle.thresholds);
  const classPrecisions: Record<ClassId, ClassPrecisionResult> = precisionByClass(precisionRuns);
  const { classes, allClassesFailed }: { classes: ClassVerdict[]; allClassesFailed: boolean } = scoreClassVerdicts({
    pooledSensitivity,
    agreement,
    classSensitivities,
    classPrecisions,
  });
  const heldOut = scoreHeldOut(bundle.heldOut.ids, bundle.heldOut.runs);

  writeJson(out, {
    ok: true,
    mode: 'gated',
    pooledSensitivity,
    agreement,
    classes,
    allClassesFailed,
    heldOut,
    reported: gatedReportedMeasures(tallies, precisionRuns, heldOut),
  });
  return 0;
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
