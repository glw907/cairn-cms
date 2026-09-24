#!/usr/bin/env -S npx tsx
/**
 * Builds Task 11's validation trees: for each of the six baseline jobs (evaluator, operator,
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
 * "planted" run indistinguishable from a control run rather than fail loudly.
 * @param plantedDir - The job's own planted directory, mirroring the prepared tree's own paths.
 * @param dest - The prepared tree the planted files are copied onto.
 * @throws When `plantedDir` does not exist or contains no files.
 */
export function applyPlantedOverlay(plantedDir: string, dest: string): void {
  if (!existsSync(plantedDir)) throw new Error(`planted directory does not exist: ${plantedDir}`);
  const files = listFiles(plantedDir);
  if (files.length === 0) throw new Error(`planted directory is empty: ${plantedDir}`);
  for (const rel of files) cpSync(join(plantedDir, rel), join(dest, rel));
}

/**
 * Build one job's PLANTED variant from its already-built CONTROL directory: a fresh copy of the
 * control tree, then `applyPlantedOverlay` on top from that job's own planted subdirectory under
 * `PLANTED_ROOT`.
 * @param job - The job name (`evaluator`, `operator`, `scripter`, `core-developer`, `designer`, or `extender`).
 * @param controlDir - The job's already-built control directory.
 * @returns The planted directory's own path.
 */
function plantOverlayOnto(job: string, controlDir: string): string {
  const planted = join(VALIDATION_PREPARED_ROOT, `${job}-planted`);
  rmSync(planted, { recursive: true, force: true });
  cpSync(controlDir, planted, { recursive: true, verbatimSymlinks: true });
  applyPlantedOverlay(join(PLANTED_ROOT, job), planted);
  return planted;
}

/** Build the evaluator job's control and planted trees: the published docs set, copied and then overlaid. */
async function prepareValidationEvaluator(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'evaluator-control');
  copyDocsSet(REPO_ROOT, EVALUATOR_DOCS_SET, control);
  plantOverlayOnto('evaluator', control);
}

/** Build the operator job's control and planted trees, the same way `prepare-baseline.ts` builds its own. */
async function prepareValidationOperator(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'operator-control');
  await prepareOperator(control);
  plantOverlayOnto('operator', control);
}

/**
 * Build the scripter job's control and planted trees, from `VALIDATION_CONTRACT_PAGES` (the
 * current `HEAD`, not pass A's pinned commits).
 */
async function prepareValidationScripter(): Promise<void> {
  const control = join(VALIDATION_PREPARED_ROOT, 'scripter-control');
  await prepareScripter(control, VALIDATION_CONTRACT_PAGES);
  plantOverlayOnto('scripter', control);
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
