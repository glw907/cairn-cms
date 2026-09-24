#!/usr/bin/env -S npx tsx
/**
 * Builds the validation batch's trees: for each of the six baseline jobs (evaluator, operator,
 * scripter, core-developer, designer, extender), a CONTROL prepared directory built the same way
 * `prepare-baseline.ts` builds that job's own tree, and a PLANTED variant of it, the control tree
 * copied once more and then overlaid with that job's own planted pages from
 * `$XDG_CACHE_HOME/docs-readers/planted/<job>/`. Run this once the planter has written its pages,
 * before `run.ts batches/validation.json`: a validation run only ever copies a directory this
 * script already finished, the same rule `prepare-baseline.ts` follows for the live baseline.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/prepare-validation.ts [--only NAME,NAME,...]
 *
 * `--only` limits the build to the named jobs (`evaluator`, `operator`, `scripter`,
 * `core-developer`, `designer`, `extender`), for a partial rebuild; omitted, every job runs.
 */
import { dirname, join, relative, resolve } from 'node:path';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CACHE_ROOT } from './run.js';
import { CONTRACT_PAGES, prepareCoreDeveloper, prepareDesignerAndExtender, prepareOperator, prepareScripter } from './prepare-baseline.js';
import { copyDocsSet, type ContractPageSpec } from './lib/prepare-class.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** Where every validation job's control and planted directories land, under the runner's own neutral cache root. */
export const VALIDATION_PREPARED_ROOT = join(CACHE_ROOT, 'prepared', 'validation');

/** Where the planter writes each job's own planted pages, one subdirectory per job, mirroring that job's own prepared-tree paths. */
export const PLANTED_ROOT = join(CACHE_ROOT, 'planted');

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
 * The scripter's three contract pages, pinned to `HEAD` rather than pass A's own commits
 * (`prepare-baseline.ts`'s `CONTRACT_PAGES`): validation scores a reader against the pages as
 * they stand today, not as they stood when pass A's fixes landed, so both the scripter's control
 * and planted bundles are built from the current tree.
 */
export const VALIDATION_CONTRACT_PAGES: ContractPageSpec[] = CONTRACT_PAGES.map((spec) => ({ ...spec, commit: 'HEAD' }));

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
 * @param pages - The bundle's own page specs; defaults to `VALIDATION_CONTRACT_PAGES`.
 * @throws When `plantedDir` does not exist or contains no files, when a planted path matches no
 * bundle page or schema, or when a matched subdirectory's own copy of that path is missing.
 */
export function applyScripterPlantedOverlay(plantedDir: string, dest: string, pages: ContractPageSpec[] = VALIDATION_CONTRACT_PAGES): void {
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

/**
 * Build one job's PLANTED variant from its already-built CONTROL directory: a fresh copy of the
 * control tree, then `applyPlantedOverlay` on top from that job's own planted subdirectory under
 * `PLANTED_ROOT`.
 * @param job - The job name (`evaluator`, `operator`, `core-developer`, `designer`, or `extender`).
 * @param controlDir - The job's already-built control directory.
 * @param docsSet - The job's own docs set, passed through to `applyPlantedOverlay` for a
 * docs-set-class job; omitted for a prepared-tree job.
 * @returns The planted directory's own path.
 */
function plantOverlayOnto(job: string, controlDir: string, docsSet?: string[]): string {
  const planted = join(VALIDATION_PREPARED_ROOT, `${job}-planted`);
  rmSync(planted, { recursive: true, force: true });
  cpSync(controlDir, planted, { recursive: true, verbatimSymlinks: true });
  applyPlantedOverlay(join(PLANTED_ROOT, job), planted, docsSet);
  return planted;
}

/** Build the evaluator job's control and planted trees: the published docs set, copied and then overlaid. */
async function prepareValidationEvaluator(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'evaluator-control');
  rmSync(control, { recursive: true, force: true });
  copyDocsSet(REPO_ROOT, EVALUATOR_DOCS_SET, control);
  plantOverlayOnto('evaluator', control, EVALUATOR_DOCS_SET);
}

/** Build the operator job's control and planted trees, the same way `prepare-baseline.ts` builds its own. */
async function prepareValidationOperator(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'operator-control');
  await prepareOperator(control);
  plantOverlayOnto('operator', control);
}

/**
 * Build the scripter job's control and planted trees, from `VALIDATION_CONTRACT_PAGES` (the
 * current `HEAD`, not pass A's pinned commits). The planted tree is overlaid with
 * `applyScripterPlantedOverlay`, never the generic `applyPlantedOverlay`: the scripter's own
 * planted files are keyed by real repo path, but the bundle copies each page and schema into its
 * own per-page subdirectory, so a direct path-for-path overlay would land at the bundle's top
 * level instead of inside it.
 */
async function prepareValidationScripter(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'scripter-control');
  await prepareScripter(control, VALIDATION_CONTRACT_PAGES);
  const planted = join(VALIDATION_PREPARED_ROOT, 'scripter-planted');
  rmSync(planted, { recursive: true, force: true });
  cpSync(control, planted, { recursive: true, verbatimSymlinks: true });
  applyScripterPlantedOverlay(join(PLANTED_ROOT, 'scripter'), planted, VALIDATION_CONTRACT_PAGES);
}

/** Build the core-developer job's control and planted trees, the same way `prepare-baseline.ts` builds its own. */
async function prepareValidationCoreDeveloper(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'core-developer-control');
  await prepareCoreDeveloper(control);
  plantOverlayOnto('core-developer', control);
}

/**
 * Build the designer and extender jobs' control and planted trees. Both controls share one packed
 * engine tarball pair, built once by `prepareDesignerAndExtender`, then each gets its own planted
 * overlay.
 */
async function prepareValidationDesignerAndExtender(): Promise<void> {
  const designerControl = join(VALIDATION_PREPARED_ROOT, 'designer-control');
  const extenderControl = join(VALIDATION_PREPARED_ROOT, 'extender-control');
  await prepareDesignerAndExtender(designerControl, extenderControl);
  plantOverlayOnto('designer', designerControl);
  plantOverlayOnto('extender', extenderControl);
}

/** Every named build step, in the order they log; `designer` and `extender` name the same step. */
const STEPS: Array<{ names: string[]; run: () => Promise<void> }> = [
  { names: ['evaluator'], run: prepareValidationEvaluator },
  { names: ['operator'], run: prepareValidationOperator },
  { names: ['scripter'], run: prepareValidationScripter },
  { names: ['core-developer'], run: prepareValidationCoreDeveloper },
  { names: ['designer', 'extender'], run: prepareValidationDesignerAndExtender },
];

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
 */
async function main(args: string[]): Promise<void> {
  mkdirSync(VALIDATION_PREPARED_ROOT, { recursive: true });
  const only = option(args, '--only')?.split(',');
  for (const { names, run } of STEPS) {
    if (only && !names.some((name) => only.includes(name))) continue;
    console.log(`preparing: ${names.join('/')}`);
    await run();
  }
  console.log(`done: ${VALIDATION_PREPARED_ROOT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
