#!/usr/bin/env -S npx tsx
/**
 * Builds the validation trees a batch file names. For each of the six development jobs
 * (evaluator, operator, scripter, core-developer, designer, extender) the batch references, a
 * CONTROL tree is built the same way `prepare-baseline.ts` builds that job's own tree, at the
 * commit the job's `commit` field names; when the batch also references the job's PLANTED tree,
 * that tree is a copy of the control overlaid with the job's planted pages, then finished on its
 * own. A job with no planted directory builds a control-only tree. Each tree lands at the path its
 * batch job's `prepared` field names (`<root>/<job>-control` or `<root>/<job>-planted`), and each
 * job's absent list is written back into the batch file as its `absent` field. Run this before
 * `run.ts` on that batch: a run only ever copies a directory this script already finished.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/prepare-validation.ts BATCH.json [--plants development|test] [--only NAME,NAME,...]
 *
 * `--plants` picks where planted pages come from: `development` (the default) reads
 * `PLANTED_ROOT`, `test` reads `TEST_PLANTED_ROOT`. `--only` limits the build to the named jobs.
 * Every referenced job must carry a `commit`, and it must be a commit id, never `HEAD`.
 */
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE_ROOT } from './run.js';
import {
  CONTRACT_PAGES,
  pinnedEngineTarballs,
  prepareCoreDeveloper,
  prepareDesigner,
  prepareExtender,
  prepareOperator,
  prepareScripter,
} from './prepare-baseline.js';
import { prepareDocsOnly, spawnRunner, type CommandRunner, type ContractPageSpec, type PreparedTree, type TreeVariant } from './lib/prepare-class.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** The six development jobs, each with a control tree and, when planted pages exist, a planted one. */
export const DEVELOPMENT_JOBS = ['evaluator', 'operator', 'scripter', 'core-developer', 'designer', 'extender'] as const;

/** One of the six development jobs. */
export type DevelopmentJob = (typeof DEVELOPMENT_JOBS)[number];

/** Where the development plants live, one subdirectory per job, mirroring that job's own prepared-tree paths. */
export const PLANTED_ROOT = join(CACHE_ROOT, 'planted');

/** Where the test plants live, one subdirectory per job, kept apart from the development plants. */
export const TEST_PLANTED_ROOT = join(CACHE_ROOT, 'planted-1b');

/** The evaluator job's docs set, kept in sync by hand with `batches/baseline.json`'s evaluator job. */
export const EVALUATOR_DOCS_SET = [
  'docs/why-cairn.md',
  'docs/admin/before-you-start.md',
  'docs/admin/README.md',
  'docs/editors/welcome.md',
  'docs/extend/add-a-second-audience.md',
  'docs/extend/migration-notes.md',
  'docs/extend/README.md',
  'docs/extend/sign-in-through-your-organization.md',
];

/**
 * The scripter's three contract pages, all pinned to one commit rather than each page's own
 * earlier commit (`prepare-baseline.ts`'s `CONTRACT_PAGES`, which the held-out runs keep):
 * validation scores a reader against the pages as they stand at the job's page pin.
 * @param commit - The job's page pin.
 * @returns The page specs, every field but `commit` kept from `CONTRACT_PAGES`.
 */
export function validationContractPages(commit: string): ContractPageSpec[] {
  return CONTRACT_PAGES.map((spec) => ({ ...spec, commit }));
}

/** Every file (never a directory) under `dir`, as paths relative to `dir`. */
function listFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) found.push(relative(dir, full));
    }
  };
  walk(dir);
  return found;
}

/**
 * Copy every file under a job's own planted directory onto the same relative path inside a
 * prepared tree, replacing that tree's own version of each planted page with its defect-bearing
 * copy. Fails when the planted directory does not exist or holds no files: a missing or empty
 * overlay would silently leave every page in its unmodified, control form, which would make a
 * "planted" run indistinguishable from a control run rather than fail loudly. Also fails when a
 * planted file's own path does not already exist in `dest` (a mistyped or misplaced plant would
 * otherwise land as a stray new file no reader's docs set names), or, when `docsSet` is given,
 * when the path is not one of the job's own docs-set pages.
 * @param plantedDir - The job's own planted directory, mirroring the prepared tree's own paths.
 * @param dest - The prepared tree the planted files are copied onto.
 * @param docsSet - The job's own docs set, when the job's contents are a docs-set copy rather
 * than a whole prepared tree; every planted path must be one of these.
 * @throws When `plantedDir` does not exist or contains no files, when a planted path is not
 * already present in `dest`, or when `docsSet` is given and a planted path is not in it.
 */
export function applyPlantedOverlay(plantedDir: string, dest: string, docsSet?: string[]): void {
  if (!existsSync(plantedDir)) throw new Error(`planted directory does not exist: ${plantedDir}`);
  const files = listFiles(plantedDir);
  if (files.length === 0) throw new Error(`planted directory is empty: ${plantedDir}`);
  for (const rel of files) {
    if (docsSet && !docsSet.includes(rel)) throw new Error(`planted file ${rel} is not one of the job's own docsSet pages`);
    const target = join(dest, rel);
    if (!existsSync(target)) throw new Error(`planted file ${rel} has no matching target at ${target}`);
    cpSync(join(plantedDir, rel), target);
  }
}

/**
 * Every contract-bundle subdirectory (a `ContractPageSpec.name`) whose own page or schema is the
 * given repo-relative path, derived from `pages` rather than a hard-coded mapping, so a bundle
 * layout change here is the only place a planted-path mapping needs to follow it.
 * @param relRepoPath - A planted file's own path, relative to the checkout root, mirroring the
 * repo path its unplanted page or schema is copied from.
 * @param pages - The bundle's own page specs.
 * @returns Every subdirectory name the path belongs to (a schema shared by two pages belongs to both).
 */
function scripterBundleTargets(relRepoPath: string, pages: ContractPageSpec[]): string[] {
  return pages.filter((spec) => spec.page === relRepoPath || spec.schemas.includes(relRepoPath)).map((spec) => spec.name);
}

/**
 * Copy every file under the scripter's own planted directory into the contract bundle's own
 * per-page subdirectories, never at the bundle's top level: a planted file is named by its real
 * repo path (the same path its unplanted page or schema is copied from), and this maps that path
 * onto every bundle subdirectory whose contract page or schema it is, via `scripterBundleTargets`.
 * Fails when the planted directory does not exist or holds no files, when a planted path matches
 * no bundle page or schema at all (a mistyped or misplaced plant), or when a matching
 * subdirectory's own copy of that path is missing.
 * @param plantedDir - The scripter job's own planted directory, keyed by real repo path.
 * @param dest - The contract bundle's own root, built by `prepareContractPagesBundle`.
 * @param pages - The bundle's own page specs.
 * @throws When `plantedDir` does not exist or contains no files, when a planted path matches no
 * bundle page or schema, or when a matched subdirectory's own copy of that path is missing.
 */
export function applyScripterPlantedOverlay(plantedDir: string, dest: string, pages: ContractPageSpec[]): void {
  if (!existsSync(plantedDir)) throw new Error(`planted directory does not exist: ${plantedDir}`);
  const files = listFiles(plantedDir);
  if (files.length === 0) throw new Error(`planted directory is empty: ${plantedDir}`);
  for (const rel of files) {
    const targetNames = scripterBundleTargets(rel, pages);
    if (targetNames.length === 0) throw new Error(`planted file ${rel} does not match any contract-bundle page or schema`);
    for (const name of targetNames) {
      const target = join(dest, name, rel);
      if (!existsSync(target)) throw new Error(`planted file ${rel} has no matching target at ${target}`);
      cpSync(join(plantedDir, rel), target);
    }
  }
}

/** What `prepareValidationJob` takes. */
export interface ValidationJobOptions {
  /** The commit id every page in the job's trees is exported at. */
  commit: string;
  /** Where the control tree lands. */
  controlDest: string;
  /** Where the planted tree lands; omitted, only the control tree is built. */
  plantedDest?: string;
  /** The job's own planted pages; when this directory does not exist, only the control tree is built. */
  plantsDir: string;
  /** The checkout pages are exported from; defaults to this repository. */
  repoRoot?: string;
  /** The command runner; overridden in tests. */
  runner?: CommandRunner;
  /** Supplies the packed engine pair for the designer and extender; defaults to packing at `commit`. */
  tarballs?: () => { engine: string; dev: string };
  /** The operator's scratch-site clone and pinned commit; defaults to `prepare-baseline.ts`'s. */
  site?: { clone: string; commit: string };
}

/**
 * Build one development job's control tree and, when its planted pages exist and a planted
 * destination is named, its planted tree: a copy of the control, overlaid, then finished on its
 * own, so each carries its own mtimes and, for a repository-class job, its own one commit.
 * @param job - The development job.
 * @param options - The job's commit, destinations, and planted pages.
 * @returns The job's absent list, and whether a planted tree was built.
 */
export function prepareValidationJob(job: DevelopmentJob, options: ValidationJobOptions): PreparedTree & { planted: boolean } {
  const { commit, controlDest: dest, plantedDest, plantsDir, repoRoot = REPO_ROOT, runner = spawnRunner } = options;
  const plantedTarget = plantedDest !== undefined && existsSync(plantsDir) ? plantedDest : undefined;
  const variant = (overlay: (dir: string) => void): TreeVariant[] => (plantedTarget ? [{ dest: plantedTarget, overlay }] : []);
  const plantedVariants = variant((dir) => applyPlantedOverlay(plantsDir, dir));
  const shared = { commit, dest, repoRoot, runner };
  const tarballs = (): { engine: string; dev: string } => options.tarballs?.() ?? pinnedEngineTarballs({ commit, repoRoot, runner });
  const built = ((): PreparedTree => {
    switch (job) {
      case 'evaluator':
        return prepareDocsOnly({
          sourceRoot: repoRoot,
          commit,
          docsSet: EVALUATOR_DOCS_SET,
          dest,
          runner,
          variants: variant((dir) => applyPlantedOverlay(plantsDir, dir, EVALUATOR_DOCS_SET)),
        });
      case 'operator':
        return prepareOperator({
          ...shared,
          siteClone: options.site?.clone,
          siteCommit: options.site?.commit,
          variants: plantedVariants,
        });
      case 'scripter': {
        const pages = validationContractPages(commit);
        return prepareScripter({ dest, pages, repoRoot, runner, variants: variant((dir) => applyScripterPlantedOverlay(plantsDir, dir, pages)) });
      }
      case 'core-developer':
        return prepareCoreDeveloper({ ...shared, variants: plantedVariants });
      case 'designer':
        return prepareDesigner({ ...shared, tarballs: tarballs(), variants: plantedVariants });
      case 'extender':
        return prepareExtender({ ...shared, tarballs: tarballs(), variants: plantedVariants });
    }
  })();
  return { ...built, planted: plantedTarget !== undefined };
}

/** The batch-file fields `prepareValidationBatch` reads and writes, every other field kept as it stands. */
interface BatchFileJob {
  prepared?: unknown;
  commit?: unknown;
  absent?: string[];
}

/**
 * Write each job's absent list into a batch file, as the `absent` field of every job whose
 * `prepared` path is a key of `absentByPrepared`, leaving every other field and job as it stands.
 * @param batchPath - The batch file to rewrite.
 * @param absentByPrepared - Each prepared tree's absolute path, mapped to its absent list.
 */
export function recordAbsentLists(batchPath: string, absentByPrepared: Map<string, string[]>): void {
  const batch = JSON.parse(readFileSync(batchPath, 'utf8')) as { jobs: BatchFileJob[] };
  for (const job of batch.jobs) {
    if (typeof job.prepared !== 'string') continue;
    const absent = absentByPrepared.get(resolve(job.prepared));
    if (absent) job.absent = [...absent];
  }
  writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
}

/** What `prepareValidationBatch` takes beyond the batch file. */
export interface ValidationBatchOptions extends Pick<ValidationJobOptions, 'repoRoot' | 'runner' | 'tarballs' | 'site'> {
  /** The root the planted pages come from, one subdirectory per job; defaults to `PLANTED_ROOT`. */
  plantsRoot?: string;
  /** The jobs to build; omitted, every development job the batch references. */
  only?: string[];
}

/**
 * Build every development job's trees a batch file references, then record each job's absent list
 * back into the file. A job is referenced when a batch job's `prepared` path ends in
 * `<job>-control` or `<job>-planted`. Every check runs before any tree is built: each referenced
 * batch job must carry a `commit`, one job's batch entries must agree on it, and a referenced
 * planted tree needs its planted pages to exist.
 * @param batchPath - The batch file.
 * @param options - Where plants come from, which jobs to build, and the test seams.
 * @throws When a check fails, or any build does.
 */
export function prepareValidationBatch(batchPath: string, options: ValidationBatchOptions = {}): void {
  const { plantsRoot = PLANTED_ROOT, only } = options;
  const batch = JSON.parse(readFileSync(batchPath, 'utf8')) as { jobs: BatchFileJob[] };
  const plans = DEVELOPMENT_JOBS.filter((job) => !only || only.includes(job)).flatMap((job) => {
    const entries = batch.jobs.filter((entry) => typeof entry.prepared === 'string' && [`${job}-control`, `${job}-planted`].includes(basename(entry.prepared)));
    if (entries.length === 0) return [];
    const commits = new Set(entries.map((entry) => entry.commit));
    if ([...commits].some((commit) => typeof commit !== 'string' || commit.trim() === '')) {
      throw new Error(`${job}: every batch job that names its tree must carry a commit`);
    }
    if (commits.size > 1) throw new Error(`${job}: batch jobs disagree on the commit (${[...commits].join(', ')})`);
    const paths = entries.map((entry) => resolve(entry.prepared as string));
    const plantedDest = paths.find((path) => basename(path) === `${job}-planted`);
    const controlDest = paths.find((path) => basename(path) === `${job}-control`) ?? join(dirname(plantedDest as string), `${job}-control`);
    const plantsDir = join(plantsRoot, job);
    if (plantedDest && !existsSync(plantsDir)) throw new Error(`${job}: the batch names a planted tree, but ${plantsDir} does not exist`);
    return [{ job, commit: [...commits][0] as string, controlDest, plantedDest, plantsDir }];
  });
  const absentByPrepared = new Map<string, string[]>();
  const pairs = new Map<string, { engine: string; dev: string }>();
  for (const plan of plans) {
    console.log(`preparing: ${plan.job} at ${plan.commit}`);
    const tarballs =
      options.tarballs ??
      ((): { engine: string; dev: string } => {
        const cached = pairs.get(plan.commit) ?? pinnedEngineTarballs({ commit: plan.commit, repoRoot: options.repoRoot, runner: options.runner });
        pairs.set(plan.commit, cached);
        return cached;
      });
    const { absent } = prepareValidationJob(plan.job, { ...options, ...plan, tarballs });
    absentByPrepared.set(plan.controlDest, absent);
    if (plan.plantedDest) absentByPrepared.set(plan.plantedDest, absent);
  }
  recordAbsentLists(batchPath, absentByPrepared);
}

/**
 * Pull a flag's value out of an argument list, the same `--flag value` form `run.ts` uses.
 * @param args - The command-line arguments.
 * @param flag - The flag name.
 * @returns The value after the flag, or undefined.
 */
function option(args: string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at === -1 ? undefined : args[at + 1];
}

/**
 * The command-line entry point.
 * @param args - The arguments after the script name.
 * @throws When the batch path is missing or `--plants` names an unknown root.
 */
function main(args: string[]): void {
  const batchPath = args[0];
  if (!batchPath || batchPath.startsWith('--')) throw new Error('usage: prepare-validation.ts BATCH.json [--plants development|test] [--only NAME,...]');
  const plants = option(args, '--plants') ?? 'development';
  if (plants !== 'development' && plants !== 'test') throw new Error(`--plants must be development or test, not ${plants}`);
  prepareValidationBatch(resolve(batchPath), {
    plantsRoot: plants === 'test' ? TEST_PLANTED_ROOT : PLANTED_ROOT,
    only: option(args, '--only')?.split(','),
  });
  console.log(`done: ${batchPath}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
