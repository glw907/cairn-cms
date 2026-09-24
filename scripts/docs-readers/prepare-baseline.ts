#!/usr/bin/env -S npx tsx
/**
 * Builds every `contents: "prepared"` job directory the baseline batch
 * (`batches/baseline.json`) references, at the fixed paths its jobs' own `prepared` fields name.
 * Run this once before `run.ts batches/baseline.json`: a batch run only ever copies a directory
 * this script already finished, since none of `git clone`, `git archive`, or `npm install` may run
 * inside a reader's own confined network.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/prepare-baseline.ts [--only NAME,NAME,...]
 *
 * `--only` limits the build to the named steps (`operator`, `scripter`, `core-developer`,
 * `designer`, `extender`), for a partial rebuild; omitted, every step runs.
 */
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CACHE_ROOT, SCRATCH_SITE } from './run.js';
import {
  archiveCommit,
  ensureScratchSiteCommit,
  packEngineTarballs,
  prepareContractPagesBundle,
  prepareDocsAndBinary,
  prepareDocsAndSite,
  prepareRepositoryExportWithDependencies,
  type ContractPageSpec,
} from './lib/prepare-class.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** Where every baseline job's prepared directory lands, under the runner's own cache root. */
export const BASELINE_PREPARED_ROOT = join(CACHE_ROOT, 'prepared', 'baseline');

/** The scratch site's own repository, pinned to the commit Task 3 scaffolded (docs reset pass 1). */
export const SCRATCH_SITE_COMMIT = '5ed23f8bdbe745de02472ea99a86f6cf08510d37';

/**
 * Pass A's three contract pages, each pinned to its own commit: `cli-cairn-json-output.md` and
 * `cli-cairn-exit-codes.md` share the commit their round-2 fixes landed on, `29a03eff`;
 * `cli-cairn-doctor.md` is pinned to its own earlier fix commit, `3453668f`, since it did not
 * change again before pass A's scripter reader ran against it.
 */
export const CONTRACT_PAGES: ContractPageSpec[] = [
  {
    name: 'json-output',
    commit: '29a03eff',
    page: 'docs/reference/cli-cairn-json-output.md',
    schemas: [
      'docs/reference/schema/cairn-health.schema.json',
      'docs/reference/schema/cairn-health-summary.schema.json',
      'docs/reference/schema/cairn-sites-list.schema.json',
      'docs/reference/schema/cairn-logs.schema.json',
      'docs/reference/schema/cairn-adopt-list.schema.json',
      'docs/reference/schema/cairn-auth-check.schema.json',
      'docs/reference/schema/cairn-doctor.schema.json',
    ],
  },
  { name: 'doctor', commit: '3453668f', page: 'docs/reference/cli-cairn-doctor.md', schemas: ['docs/reference/schema/cairn-doctor.schema.json'] },
  { name: 'exit-codes', commit: '29a03eff', page: 'docs/reference/cli-cairn-exit-codes.md', schemas: [] },
];

/**
 * `docs/admin/is-it-working.md` plus every page it links to that sits under `docs/` (outside
 * `docs/internal/` and `docs/superpowers/`, neither ever part of a reader's docs set). This is the
 * same list `batches/baseline.json`'s operator job names as its own `docsSet`; the two are kept in
 * sync by hand, since a batch file cannot import a TypeScript constant.
 */
export const OPERATOR_DOCS_SET = [
  'docs/admin/is-it-working.md',
  'docs/extend/add-cairn-to-a-sveltekit-app.md',
  'docs/extend/build-a-site-by-hand.md',
  'docs/extend/choose-an-ai-posture.md',
  'docs/extend/restrict-admin-access.md',
  'docs/extend/rotate-the-github-app-key.md',
  'docs/extend/security-model.md',
  'docs/extend/wire-the-delivery-surface.md',
  'docs/admin/invite-editors.md',
  'docs/admin/own-your-domain.md',
  'docs/reference/admin-routes.md',
  'docs/reference/cli-cairn-doctor.md',
  'docs/reference/cloudflare.md',
  'docs/admin/setup-recovery.md',
  'docs/admin/troubleshooting.md',
];

/** `docs/extend/design-your-site.md` plus every page it links to that sits under `docs/`, kept in sync with `baseline.json`. */
export const DESIGNER_DOCS_SET = ['docs/extend/design-your-site.md', 'docs/extend/build-a-site-by-hand.md', 'docs/reference/cli-cairn-media-seed.md'];

/** `docs/extend/add-a-custom-admin-screen.md` plus every page it links to that sits under `docs/`, kept in sync with `baseline.json`. */
export const EXTENDER_DOCS_SET = [
  'docs/extend/add-a-custom-admin-screen.md',
  'docs/extend/build-a-site-by-hand.md',
  'docs/extend/define-an-adapter-and-schema.md',
  'docs/extend/organize-your-admin-nav.md',
  'docs/extend/restrict-admin-access.md',
  'docs/reference/admin-routes.md',
  'docs/reference/admin-toolkit.md',
  'docs/reference/sveltekit.md',
];

/**
 * Build the operator job's prepared tree: the scratch site's own commit, cloned and archived, with
 * the `is-it-working` docs page and the site's registry record layered on top. Exported so
 * `prepare-validation.ts` can build the same tree at its own destination, ahead of planting.
 * @param dest - Where the prepared tree lands; defaults to the baseline's own path.
 */
export async function prepareOperator(dest: string = join(BASELINE_PREPARED_ROOT, 'operator-is-it-working')): Promise<void> {
  const scratchClone = join(CACHE_ROOT, 'scratch-site-repo');
  ensureScratchSiteCommit({ cloneDir: scratchClone, commit: SCRATCH_SITE_COMMIT });
  const siteExportDir = join(BASELINE_PREPARED_ROOT, 'operator-site-export');
  archiveCommit({ repoRoot: scratchClone, commit: SCRATCH_SITE_COMMIT, dest: siteExportDir });
  prepareDocsAndBinary({
    sourceRoot: REPO_ROOT,
    docsSet: OPERATOR_DOCS_SET,
    siteId: SCRATCH_SITE.siteId,
    record: SCRATCH_SITE.record,
    dest,
    siteExportDir,
  });
}

/**
 * Build the scripter job's prepared tree: three contract pages, each from its own commit. Exported
 * so `prepare-validation.ts` can build the same shape at its own destination and commits (the
 * validation batch pins all three to `HEAD` rather than pass A's commits).
 * @param dest - Where the bundle lands; defaults to the baseline's own path.
 * @param pages - The bundle's own page specs; defaults to the baseline's `CONTRACT_PAGES`.
 */
export async function prepareScripter(dest: string = join(BASELINE_PREPARED_ROOT, 'scripter-contract-pages'), pages: ContractPageSpec[] = CONTRACT_PAGES): Promise<void> {
  prepareContractPagesBundle({ repoRoot: REPO_ROOT, dest, pages });
}

/**
 * Build the core-developer job's prepared tree: this worktree's own `HEAD`, with its own
 * dependencies already installed, since the job's arrival tells the reader a fresh `npm install`
 * is not possible in this environment. Exported so `prepare-validation.ts` can build the same
 * tree at its own destination.
 * @param dest - Where the prepared tree lands; defaults to the baseline's own path.
 */
export async function prepareCoreDeveloper(dest: string = join(BASELINE_PREPARED_ROOT, 'core-developer-head')): Promise<void> {
  prepareRepositoryExportWithDependencies({ repoRoot: REPO_ROOT, commit: 'HEAD', dest });
}

/**
 * Build the designer and extender jobs' prepared trees: one packed engine tarball pair, reused for
 * both scaffolded sites, since neither job's own docs set changes what the site scaffold needs. A
 * freshly built pair (a cache miss) lands under a neutral scratch directory, never under
 * `BASELINE_PREPARED_ROOT`: `scaffoldSite` writes the returned tarball path straight into the
 * scaffolded site's own `package.json`, which a reader can read, so that path must never name this
 * batch. Exported so `prepare-validation.ts` can build the same two trees at its own destinations.
 * @param destDesigner - Where the designer tree lands; defaults to the baseline's own path.
 * @param destExtender - Where the extender tree lands; defaults to the baseline's own path.
 */
export async function prepareDesignerAndExtender(
  destDesigner: string = join(BASELINE_PREPARED_ROOT, 'designer-design-your-site'),
  destExtender: string = join(BASELINE_PREPARED_ROOT, 'extender-add-a-custom-admin-screen'),
): Promise<void> {
  const tarballs = packEngineTarballs(REPO_ROOT, join(CACHE_ROOT, 'pack-scratch'), undefined, CACHE_ROOT);
  prepareDocsAndSite({ sourceRoot: REPO_ROOT, docsSet: DESIGNER_DOCS_SET, tarballs, dest: destDesigner });
  prepareDocsAndSite({ sourceRoot: REPO_ROOT, docsSet: EXTENDER_DOCS_SET, tarballs, dest: destExtender });
}

/**
 * Every named build step, in the order they log; `designer` and `extender` name the same step,
 * since one packed engine tarball pair serves both scaffolded sites.
 */
const STEPS: Array<{ names: string[]; run: () => Promise<void> }> = [
  { names: ['operator'], run: prepareOperator },
  { names: ['scripter'], run: prepareScripter },
  { names: ['core-developer'], run: prepareCoreDeveloper },
  { names: ['designer', 'extender'], run: prepareDesignerAndExtender },
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
  mkdirSync(BASELINE_PREPARED_ROOT, { recursive: true });
  const only = option(args, '--only')?.split(',');
  for (const { names, run } of STEPS) {
    if (only && !names.some((name) => only.includes(name))) continue;
    console.log(`preparing: ${names.join('/')}`);
    await run();
  }
  console.log(`done: ${BASELINE_PREPARED_ROOT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
