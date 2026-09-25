#!/usr/bin/env -S npx tsx
/**
 * Builds every `contents: "prepared"` job directory the baseline batch
 * (`batches/baseline.json`) references, at the fixed paths its jobs' own `prepared` fields name.
 * Run this once before `run.ts batches/baseline.json`: a batch run only ever copies a directory
 * this script already finished, since none of `git clone`, `git archive`, or `npm install` may run
 * inside a reader's own confined network. Every page comes from `git archive` at the commit
 * `--commit` names, never from `HEAD` or the working tree; the scripter's contract pages keep their
 * own pinned commits.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/prepare-baseline.ts --commit SHA [--only NAME,NAME,...]
 *
 * `--only` limits the build to the named steps (`operator`, `scripter`, `core-developer`,
 * `designer`, `extender`), for a partial rebuild; omitted, every step runs. `--commit` is required
 * by every step but `scripter`.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE_ROOT, SCRATCH_SITE } from './run.js';
import {
  archiveCommit,
  ensureScratchSiteCommit,
  packPinnedEngineTarballs,
  prepareContractPagesBundle,
  prepareDocsAndBinary,
  prepareDocsAndSite,
  prepareRepositoryExportWithDependencies,
  spawnRunner,
  type CommandRunner,
  type ContractPageSpec,
  type PreparedTree,
  type TreeVariant,
} from './lib/prepare-class.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** Where every baseline job's prepared directory lands, under the runner's own cache root. */
export const BASELINE_PREPARED_ROOT = join(CACHE_ROOT, 'prepared', 'baseline');

/** The scratch site's own repository, pinned to the commit its scaffold landed on. */
export const SCRATCH_SITE_COMMIT = '5ed23f8bdbe745de02472ea99a86f6cf08510d37';

/** What every job builder here takes beyond its own destination. */
export interface JobBuildOptions {
  /** The commit id every page in the tree is exported at. */
  commit: string;
  /** Where the tree lands; each builder names its own baseline default. */
  dest?: string;
  /** The checkout pages are exported from; defaults to this repository. */
  repoRoot?: string;
  /** The command runner; overridden in tests. */
  runner?: CommandRunner;
  /** Trees built from this one, each with its own overlay. */
  variants?: TreeVariant[];
}

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
 * the operator docs set, exported at `commit`, and the site's registry record layered on top.
 * Takes `JobBuildOptions`, plus `siteClone` and `siteCommit`, the scratch site's local clone and
 * its pinned commit.
 * @returns The tree's absent list.
 */
export function prepareOperator({
  commit,
  dest = join(BASELINE_PREPARED_ROOT, 'operator-is-it-working'),
  repoRoot = REPO_ROOT,
  runner = spawnRunner,
  variants,
  siteClone = join(CACHE_ROOT, 'scratch-site-repo'),
  siteCommit = SCRATCH_SITE_COMMIT,
}: JobBuildOptions & { siteClone?: string; siteCommit?: string }): PreparedTree {
  ensureScratchSiteCommit({ cloneDir: siteClone, commit: siteCommit, runner });
  const siteExportDir = mkdtempSync(join(tmpdir(), 'docs-readers-site-export-'));
  try {
    archiveCommit({ repoRoot: siteClone, commit: siteCommit, dest: siteExportDir, runner });
    return prepareDocsAndBinary({
      sourceRoot: repoRoot,
      commit,
      docsSet: OPERATOR_DOCS_SET,
      siteId: SCRATCH_SITE.siteId,
      record: SCRATCH_SITE.record,
      dest,
      siteExportDir,
      runner,
      variants,
    });
  } finally {
    rmSync(siteExportDir, { recursive: true, force: true });
  }
}

/**
 * Build the scripter job's prepared tree: the contract pages, each from its own commit. `dest` is
 * where the bundle lands; `pages` are the page specs, each carrying its own commit; `repoRoot`,
 * `runner`, and `variants` are as `JobBuildOptions` names them.
 * @returns The bundle's absent list.
 */
export function prepareScripter({
  dest = join(BASELINE_PREPARED_ROOT, 'scripter-contract-pages'),
  pages = CONTRACT_PAGES,
  repoRoot = REPO_ROOT,
  runner = spawnRunner,
  variants,
}: Omit<JobBuildOptions, 'commit'> & { pages?: ContractPageSpec[] } = {}): PreparedTree {
  return prepareContractPagesBundle({ repoRoot, pages, dest, runner, variants });
}

/**
 * Build the core-developer job's prepared tree: the repository at `commit`, with its own
 * dependencies already installed, since the job's arrival tells the reader a fresh `npm install`
 * is not possible in this environment. Takes `JobBuildOptions`.
 * @returns The tree's absent list.
 */
export function prepareCoreDeveloper({
  commit,
  dest = join(BASELINE_PREPARED_ROOT, 'core-developer-head'),
  repoRoot = REPO_ROOT,
  runner = spawnRunner,
  variants,
}: JobBuildOptions): PreparedTree {
  return prepareRepositoryExportWithDependencies({ repoRoot, commit, dest, runner, variants });
}

/**
 * Pack the engine and dev backend at `commit` for the designer and extender trees. A freshly built
 * pair lands under a neutral scratch directory and the cache, never under a prepared root:
 * `scaffoldSite` writes the returned tarball path straight into the scaffolded site's own
 * `package.json`, which a reader can read, so that path must never name a batch. `commit`,
 * `repoRoot`, and `runner` are as `JobBuildOptions` names them.
 * @returns The tarball pair.
 */
export function pinnedEngineTarballs({ commit, repoRoot = REPO_ROOT, runner = spawnRunner }: Pick<JobBuildOptions, 'commit' | 'repoRoot' | 'runner'>): { engine: string; dev: string } {
  return packPinnedEngineTarballs({ repoRoot, commit, scratchDir: join(CACHE_ROOT, 'pack-scratch'), cacheRoot: CACHE_ROOT, runner });
}

/**
 * Build the designer job's prepared tree: its docs set and a scaffolded site, both at `commit`,
 * with the engine installed from `tarballs`. Takes `JobBuildOptions`, plus the packed tarball pair.
 * @returns The tree's absent list.
 */
export function prepareDesigner({
  commit,
  dest = join(BASELINE_PREPARED_ROOT, 'designer-design-your-site'),
  repoRoot = REPO_ROOT,
  runner = spawnRunner,
  variants,
  tarballs,
}: JobBuildOptions & { tarballs: { engine: string; dev: string } }): PreparedTree {
  return prepareDocsAndSite({ sourceRoot: repoRoot, commit, docsSet: DESIGNER_DOCS_SET, tarballs, dest, runner, variants });
}

/**
 * Build the extender job's prepared tree: its docs set and a scaffolded site, both at `commit`,
 * with the engine installed from `tarballs`. Takes `JobBuildOptions`, plus the packed tarball pair.
 * @returns The tree's absent list.
 */
export function prepareExtender({
  commit,
  dest = join(BASELINE_PREPARED_ROOT, 'extender-add-a-custom-admin-screen'),
  repoRoot = REPO_ROOT,
  runner = spawnRunner,
  variants,
  tarballs,
}: JobBuildOptions & { tarballs: { engine: string; dev: string } }): PreparedTree {
  return prepareDocsAndSite({ sourceRoot: repoRoot, commit, docsSet: EXTENDER_DOCS_SET, tarballs, dest, runner, variants });
}

/**
 * Every named build step, in the order they log; `designer` and `extender` name the same step,
 * since one packed engine tarball pair serves both scaffolded sites. Each takes the `--commit`
 * value, which only the scripter step may go without.
 */
const STEPS: Array<{ names: string[]; run: (commit: string | undefined) => void }> = [
  { names: ['operator'], run: (commit) => prepareOperator({ commit: requireCommit(commit) }) },
  { names: ['scripter'], run: () => prepareScripter() },
  { names: ['core-developer'], run: (commit) => prepareCoreDeveloper({ commit: requireCommit(commit) }) },
  {
    names: ['designer', 'extender'],
    run: (commit) => {
      const pinned = requireCommit(commit);
      const tarballs = pinnedEngineTarballs({ commit: pinned });
      prepareDesigner({ commit: pinned, tarballs });
      prepareExtender({ commit: pinned, tarballs });
    },
  },
];

/**
 * Refuse a missing `--commit`: no step falls back to `HEAD` or the working tree.
 * @param commit - The `--commit` value, if any.
 * @returns The same value, known to be present.
 * @throws When no commit was given.
 */
function requireCommit(commit: string | undefined): string {
  if (!commit) throw new Error('--commit SHA is required: every page is exported at a named commit');
  return commit;
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
 */
function main(args: string[]): void {
  mkdirSync(BASELINE_PREPARED_ROOT, { recursive: true });
  const only = option(args, '--only')?.split(',');
  const commit = option(args, '--commit');
  for (const { names, run } of STEPS) {
    if (only && !names.some((name) => only.includes(name))) continue;
    console.log(`preparing: ${names.join('/')}`);
    run(commit);
  }
  console.log(`done: ${BASELINE_PREPARED_ROOT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
