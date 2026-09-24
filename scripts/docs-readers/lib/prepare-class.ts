/**
 * Preparation for the two host-built reader classes: docs-and-site (a scaffolded site with the
 * engine installed from a packed tarball) and repository (a git-archive export that excludes the
 * pass's own answer key). Both build once, on the host, well before any reader's container
 * starts; a reader only ever sees the tree this module already finished, since `npm install` and
 * `git archive` never run inside a reader's own confined network.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** A shell command runner, injected so tests can replace the real `npm`, `git`, and `tar` calls. */
export type CommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string; input?: Buffer },
) => { status: number | null; stdout: Buffer; stderr: string };

/** Decode a command's raw output the same way everywhere, without leaning on a single overload of `Buffer.prototype.toString`. */
const decoder = new TextDecoder('utf-8');

/** The real runner: `child_process.spawnSync`, used everywhere outside a test. */
export const spawnRunner: CommandRunner = (command, args, { cwd, input }) => {
  const result = spawnSync(command, args, { cwd, input, maxBuffer: 256 * 1024 * 1024 });
  return {
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: decoder.decode(result.stderr ?? Buffer.alloc(0)),
  };
};

/**
 * Copy a job's docs-set pages into a prepared tree at their doc-relative paths, the same layout
 * the docs-only class copies them into, so a page resolves to the same path in every class.
 * @param sourceRoot - The checkout the docs set is copied from.
 * @param docsSet - The pages, relative to `sourceRoot`.
 * @param dest - The prepared tree's root.
 * @throws When a named page does not exist.
 */
export function copyDocsSet(sourceRoot: string, docsSet: string[], dest: string): void {
  for (const relPath of docsSet) {
    const from = join(sourceRoot, relPath);
    if (!existsSync(from)) throw new Error(`docs-set path "${relPath}" does not exist at ${from}`);
    cpSync(from, join(dest, relPath), { recursive: true });
  }
}

/**
 * Pack one package directory into a tarball under a content-addressed name, so a second pack of
 * changed code can never collide with an npm-cached tarball at the same name, the trap
 * `scripts/lab/link-consumer.mjs` closes for the developer-facing consumer flow. `--ignore-scripts`
 * skips `npm pack`'s own `prepare` hook; the caller has already built whatever needed building.
 * @param packageDir - The directory holding the package's own `package.json`.
 * @param destDir - Where the tarball lands.
 * @param runner - The command runner; overridden in tests.
 * @returns The packed tarball's absolute path.
 * @throws When the pack fails.
 */
export function packTarball(packageDir: string, destDir: string, runner: CommandRunner = spawnRunner): string {
  mkdirSync(destDir, { recursive: true });
  const packed = runner('npm', ['pack', '--ignore-scripts', '--pack-destination', destDir, '--silent'], { cwd: packageDir });
  if (packed.status !== 0) throw new Error(`npm pack failed in ${packageDir}: ${packed.stderr}`);
  const name = decoder.decode(packed.stdout).trim().split('\n').pop();
  if (!name) throw new Error(`npm pack produced no filename in ${packageDir}`);
  const packedPath = join(destDir, name);
  const digest = createHash('sha256').update(readFileSync(packedPath)).digest('hex').slice(0, 12);
  const tarball = join(destDir, `${name.replace(/\.tgz$/, '')}-${digest}.tgz`);
  renameSync(packedPath, tarball);
  return tarball;
}

/**
 * The paths, relative to a checkout's root, that feed `npm run package` but never appear in the
 * root `package.json`'s own `files` list: the library source `svelte-package` compiles, the
 * dev-backend package a second `npm pack` reads directly, the build's own scripts, and the
 * configuration and lockfile that shape what the build produces. `files`-listed paths (the docs
 * arms, `migrations`, `skills`, `claude`, `CHANGELOG.md`, and the rest) are added by
 * `packageInputPaths`, which reads `package.json` itself rather than duplicate its list here,
 * since every one of them reaches the published tarball unbuilt and a dirty copy would otherwise
 * ship stale with no build step ever touching it to notice. `dist` is `files`-listed too, but is
 * this build's own output, not an input to it, and its freshness already follows `src/lib`, so
 * `packageInputPaths` excludes it explicitly rather than key the cache off files it just wrote.
 */
export const PACKAGE_FIXED_INPUTS = [
  'src/lib',
  'packages/cairn-cms-dev',
  'package.json',
  'package-lock.json',
  'svelte.config.js',
  'tsconfig.json',
  'scripts/build',
  'README.md',
  'LICENSE',
];

/**
 * The full set of paths whose dirtiness invalidates the packed-tarball cache: `PACKAGE_FIXED_INPUTS`
 * plus every entry `package.json`'s own `files` field ships into the published tarball, `dist`
 * excluded. Reads `package.json` fresh on every call, since a checkout's own `files` list can
 * change between commits.
 * @param repoRoot - The checkout whose `package.json` to read.
 * @returns The paths, relative to `repoRoot`, `tarballCacheKey` checks for dirtiness.
 */
export function packageInputPaths(repoRoot: string): string[] {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { files?: string[] };
  const shipped = (pkg.files ?? []).filter((entry) => entry !== 'dist');
  return [...PACKAGE_FIXED_INPUTS, ...shipped];
}

/**
 * How many packed-tarball cache keys `pruneTarballCache` keeps. Each key holds a full engine and
 * dev-backend tarball pair; keeping a small, bounded set caps the cache's disk use without
 * forcing a rebuild on every commit the way keeping only the newest one would (a caller pinned to
 * yesterday's HEAD, mid-rebase, still gets a hit).
 */
const TARBALL_CACHE_KEEP = 3;

/**
 * The packed-tarball cache's root, under the runner's own neutral cache path. Named apart from
 * the per-run and scratch directories the startup sweep (`lib/sweep.ts`) removes: a rebuilt
 * engine tarball costs a full `svelte-package` and CSS compile, so surviving a sweep is the
 * point, not an oversight the sweep's stale-directory patterns happen to miss.
 * @param cacheRoot - The runner's neutral cache root.
 * @returns The tarball cache's own root directory.
 */
export function tarballCacheRoot(cacheRoot: string): string {
  return join(cacheRoot, 'tarballs');
}

/**
 * Compute the packed-tarball cache key: HEAD's own commit hash, returned only when every path
 * that reaches the tarball (`packageInputPaths`, or a narrower set a caller names) is clean
 * against that commit. A dirty tree in any of those paths, or a checkout `git` itself cannot
 * read, returns undefined, so the caller always rebuilds rather than serve a tarball that does
 * not match what is really on disk (`npm pack`'s stale-cache trap, `scripts/lab/link-consumer.mjs`;
 * a dirty docs page is exactly the shape of change this pass makes, and `packageInputPaths`
 * covers every docs arm `package.json`'s own `files` field ships). `repoRoot` is the checkout to
 * key; `paths` are the paths, relative to `repoRoot`, whose dirtiness invalidates the key,
 * defaulting to `packageInputPaths(repoRoot)`; `runner` is the command runner, overridden in
 * tests.
 * @returns HEAD's commit hash, or undefined when the tree is dirty in a path that matters.
 */
export function tarballCacheKey({
  repoRoot,
  paths,
  runner = spawnRunner,
}: {
  repoRoot: string;
  paths?: string[];
  runner?: CommandRunner;
}): string | undefined {
  const effectivePaths = paths ?? packageInputPaths(repoRoot);
  const head = runner('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  if (head.status !== 0) return undefined;
  const status = runner('git', ['status', '--porcelain', '--', ...effectivePaths], { cwd: repoRoot });
  if (status.status !== 0 || decoder.decode(status.stdout).trim() !== '') return undefined;
  return decoder.decode(head.stdout).trim();
}

/**
 * One cache key's tarball paths, whether or not they exist yet.
 * @param cacheRoot - The runner's neutral cache root.
 * @param key - A `tarballCacheKey` result.
 * @returns The key's own directory and its engine and dev-backend tarball paths.
 */
function tarballCachePaths(cacheRoot: string, key: string): { dir: string; engine: string; dev: string } {
  const dir = join(tarballCacheRoot(cacheRoot), key);
  return { dir, engine: join(dir, 'engine.tgz'), dev: join(dir, 'dev.tgz') };
}

/**
 * Read a cache key's tarballs, when both files are present, touching the key directory's own
 * mtime to now on a hit: `pruneTarballCache` evicts by directory mtime, so a key that keeps
 * getting used stays current against one that was built once and never read again, rather than
 * both aging out together by build order alone.
 * @param cacheRoot - The runner's neutral cache root.
 * @param key - A `tarballCacheKey` result.
 * @returns The cached tarball paths, or undefined on a cache miss.
 */
function readTarballCache(cacheRoot: string, key: string): { engine: string; dev: string } | undefined {
  const { dir, engine, dev } = tarballCachePaths(cacheRoot, key);
  if (!existsSync(engine) || !existsSync(dev)) return undefined;
  const now = new Date();
  utimesSync(dir, now, now);
  return { engine, dev };
}

/**
 * Remove every cache key beyond the newest `keep`, by directory modification time.
 * @param cacheRoot - The runner's neutral cache root.
 * @param keep - How many keys to keep; defaults to `TARBALL_CACHE_KEEP`.
 */
function pruneTarballCache(cacheRoot: string, keep: number = TARBALL_CACHE_KEEP): void {
  const root = tarballCacheRoot(cacheRoot);
  if (!existsSync(root)) return;
  const byAge = readdirSync(root)
    .map((name) => ({ name, mtimeMs: statSync(join(root, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const stale of byAge.slice(keep)) rmSync(join(root, stale.name), { recursive: true, force: true });
}

/**
 * Copy a freshly built tarball pair into the cache under `key`, then prune older keys. `cacheRoot`
 * is the runner's neutral cache root; `key` is a `tarballCacheKey` result; `tarballs` are the
 * freshly packed engine and dev-backend tarball paths.
 */
function writeTarballCache(cacheRoot: string, key: string, tarballs: { engine: string; dev: string }): void {
  const { dir, engine, dev } = tarballCachePaths(cacheRoot, key);
  mkdirSync(dir, { recursive: true });
  cpSync(tarballs.engine, engine);
  cpSync(tarballs.dev, dev);
  pruneTarballCache(cacheRoot);
}

/**
 * Build this worktree once, then pack the engine and the dev backend into tarballs under
 * `packTarball`'s content-addressed scheme, reusing a cached pair when `cacheRoot` is given and
 * `tarballCacheKey` finds the tree clean against HEAD in every path that feeds the build. Building
 * first and packing with `--ignore-scripts` means the engine is built exactly once, not once for
 * the build and again for `npm pack`'s own `prepare` hook.
 * @param repoRoot - This worktree's root.
 * @param destDir - Where a freshly built pair lands; unused on a cache hit.
 * @param runner - The command runner; overridden in tests.
 * @param cacheRoot - The runner's neutral cache root; caching is off when this is omitted.
 * @returns The engine and dev-backend tarballs' absolute paths, cached or freshly built.
 * @throws When the build or either pack fails.
 */
export function packEngineTarballs(
  repoRoot: string,
  destDir: string,
  runner: CommandRunner = spawnRunner,
  cacheRoot?: string,
): { engine: string; dev: string } {
  const key = cacheRoot ? tarballCacheKey({ repoRoot, runner }) : undefined;
  if (cacheRoot && key) {
    const cached = readTarballCache(cacheRoot, key);
    if (cached) return cached;
  }
  const built = runner('npm', ['run', 'package'], { cwd: repoRoot });
  if (built.status !== 0) throw new Error(`npm run package failed: ${built.stderr}`);
  const tarballs = {
    engine: packTarball(repoRoot, destDir, runner),
    dev: packTarball(join(repoRoot, 'packages/cairn-cms-dev'), destDir, runner),
  };
  if (cacheRoot && key) writeTarballCache(cacheRoot, key, tarballs);
  return tarballs;
}

/**
 * The directories a scaffolded site's installed engine copy must not carry into a reader's
 * container: the docs arms (the answer key for a designer or extender job), the workstation
 * `claude/` agents, and the packaged skills, none of which the extend audience's own admin work
 * needs to read.
 */
export const INSTALLED_ENGINE_STRIP = ['docs', 'claude', 'skills'];

/**
 * Remove the stripped directories from an installed engine copy, leaving everything else (the
 * built `dist/`, the manifest) in place.
 * @param installedDir - `node_modules/<packageName>` inside the scaffolded site.
 */
export function stripInstalledEngineExtras(installedDir: string): void {
  for (const name of INSTALLED_ENGINE_STRIP) rmSync(join(installedDir, name), { recursive: true, force: true });
}

/**
 * Confirm a docs-and-site scaffold carries none of a reader's forbidden paths: the setup command's
 * own guidance (`CLAUDE.md`, `.claude/`, not this reader's job) and the installed engine's docs,
 * `claude/`, and skills. Independent of whether the removal steps ran, the same way
 * `assertNoExcludedPaths` re-checks a repository export.
 * @param siteDir - The scaffold `scaffoldSite` and `installAndStrip` built.
 * @param packageName - The dependency whose installed copy is checked.
 * @throws Listing every forbidden path that survived, when any did.
 */
export function assertSiteAnswerKeyAbsent(siteDir: string, packageName = '@glw907/cairn-cms'): void {
  const installedDir = join(siteDir, 'node_modules', ...packageName.split('/'));
  const forbidden = [join(siteDir, 'CLAUDE.md'), join(siteDir, '.claude'), ...INSTALLED_ENGINE_STRIP.map((name) => join(installedDir, name))];
  const survived = forbidden.filter((path) => existsSync(path));
  if (survived.length > 0) {
    throw new Error(`docs-and-site scaffold at ${siteDir}: forbidden path(s) survived: ${survived.join(', ')}`);
  }
}

/**
 * Export `templates/waymark`'s tracked files from git HEAD into a job's scaffold directory (the
 * setup command's own committed output, never a working tree, so no ignored state such as
 * `.wrangler/`, `.cairn/`, `test-results/`, or `.dev.vars` can reach a reader), drop the
 * template's own `CLAUDE.md` and `.claude/`, and point its engine and dev-backend dependencies at
 * packed tarballs. `repoRoot` is the checkout `templates/waymark` is exported from; `dest` is the
 * scaffold's destination, replaced if it already exists; `tarballs` are the engine and dev-backend
 * tarballs' absolute paths; `runner` is the command runner, overridden in tests.
 * @throws When the export fails.
 */
export function scaffoldSite({
  repoRoot,
  dest,
  tarballs,
  runner = spawnRunner,
}: {
  repoRoot: string;
  dest: string;
  tarballs: { engine: string; dev: string };
  runner?: CommandRunner;
}): void {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const archive = runner('git', ['archive', 'HEAD', 'templates/waymark'], { cwd: repoRoot });
  if (archive.status !== 0) throw new Error(`git archive of templates/waymark failed: ${archive.stderr}`);
  // templates/waymark/<file> is two path components deep; strip them so dest becomes the site root.
  const extract = runner('tar', ['-x', '-C', dest, '--strip-components=2'], { cwd: dest, input: archive.stdout });
  if (extract.status !== 0) throw new Error(`tar extract of templates/waymark failed: ${extract.stderr}`);
  rmSync(join(dest, 'CLAUDE.md'), { force: true });
  rmSync(join(dest, '.claude'), { recursive: true, force: true });
  const pkgPath = join(dest, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  pkg.dependencies = { ...pkg.dependencies, '@glw907/cairn-cms': `file:${tarballs.engine}` };
  pkg.devDependencies = { ...pkg.devDependencies, '@glw907/cairn-cms-dev': `file:${tarballs.dev}` };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * Install a scaffolded site's dependencies from its pointed-at tarballs, then strip the installed
 * engine's extra directories. Preparation-time only: a reader's own container never runs
 * `npm install`, since its egress proxy allows nothing but `api.anthropic.com`. `siteDir` is the
 * scaffold `scaffoldSite` built; `runner` is the command runner, overridden in tests; `packageName`
 * is the dependency the tarball installs.
 * @throws When the install fails.
 */
export function installAndStrip(
  siteDir: string,
  { runner = spawnRunner, packageName = '@glw907/cairn-cms' }: { runner?: CommandRunner; packageName?: string } = {},
): void {
  const result = runner('npm', ['install', '--no-audit', '--no-fund'], { cwd: siteDir });
  if (result.status !== 0) throw new Error(`npm install failed in ${siteDir}: ${result.stderr}`);
  stripInstalledEngineExtras(join(siteDir, 'node_modules', ...packageName.split('/')));
}

/**
 * Build a docs-and-site job's prepared tree: the published docs set at their doc-relative paths,
 * and a scaffolded site (`templates/waymark`'s tracked files) with the engine and dev backend
 * installed from packed tarballs, its own `CLAUDE.md`/`.claude/` gone, and the installed engine's
 * `docs/`, `claude/`, and `skills/` directories gone. Any failure removes `dest` before rethrowing,
 * so a partially built tree, which could carry the answer key mid-strip, never stays on disk.
 * `sourceRoot` is the checkout the docs set and `templates/waymark` are exported from; `docsSet` is
 * the pages the job's docs set names; `tarballs` are the packed engine and dev-backend tarballs;
 * `dest` is the prepared tree's root, replaced if it already exists; `runner` is the command
 * runner, overridden in tests.
 */
export function prepareDocsAndSite({
  sourceRoot,
  docsSet,
  tarballs,
  dest,
  runner,
}: {
  sourceRoot: string;
  docsSet: string[];
  tarballs: { engine: string; dev: string };
  dest: string;
  runner?: CommandRunner;
}): void {
  rmSync(dest, { recursive: true, force: true });
  try {
    copyDocsSet(sourceRoot, docsSet, dest);
    const siteDir = join(dest, 'site');
    scaffoldSite({ repoRoot: sourceRoot, dest: siteDir, tarballs, runner });
    installAndStrip(siteDir, { runner });
    assertSiteAnswerKeyAbsent(siteDir);
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}

/**
 * The paths a repository-class checkout must never carry: the harvest-only internal record, the
 * whole specs-and-plans corpus that is this pass's own answer key, and the git history that could
 * name either.
 */
export const REPOSITORY_EXCLUDED_PATHS = ['docs/internal/record', 'docs/superpowers', '.git'];

/**
 * Confirm none of the excluded paths reached an export, independent of whether the pathspec that
 * built it worked; this is what actually fails preparation, not trust in `git archive`'s own
 * exclusion syntax.
 * @param dir - The exported tree's root.
 * @param excluded - The paths, relative to `dir`, that must not exist.
 * @throws Listing every excluded path that survived, when any did.
 */
export function assertNoExcludedPaths(dir: string, excluded: string[] = REPOSITORY_EXCLUDED_PATHS): void {
  const survived = excluded.filter((rel) => existsSync(join(dir, rel)));
  if (survived.length > 0) {
    throw new Error(`repository export at ${dir}: excluded path(s) survived: ${survived.join(', ')}`);
  }
}

/**
 * Export a commit of a git checkout into a clean directory via `git archive` piped straight into
 * `tar`, with no assumption about what the export should or should not carry: `pathspec` is
 * appended to the `git archive` invocation verbatim, so a caller passes either an inclusion list
 * (bare paths) or an exclusion list (`:!path` entries) as its own needs require.
 * `prepareRepositoryExport` and `prepareContractPagesBundle` both build on this, each layering its
 * own answer-key check on top. `repoRoot` is the checkout to export from; `commit` is the
 * commit-ish to export; `dest` is where the export lands, replaced first if it already exists;
 * `pathspec` is extra `git archive` arguments after the commit (an inclusion list, an exclusion
 * list, or none); `runner` is the command runner, overridden in tests.
 * @throws When the archive or its extraction fails.
 */
export function archiveCommit({
  repoRoot,
  commit,
  dest,
  pathspec = [],
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  pathspec?: string[];
  runner?: CommandRunner;
}): void {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const archive = runner('git', ['archive', commit, ...pathspec], { cwd: repoRoot });
  if (archive.status !== 0) throw new Error(`git archive failed for ${commit}: ${archive.stderr}`);
  const extract = runner('tar', ['-x', '-C', dest], { cwd: dest, input: archive.stdout });
  if (extract.status !== 0) throw new Error(`tar extract failed for ${commit}: ${extract.stderr}`);
}

/**
 * Export a commit of a git checkout into a clean directory, excluding the two answer-key subtrees
 * by pathspec (this repository sets no `export-ignore` attribute), then re-checking that neither
 * it nor `.git` survived, regardless of whether the pathspec worked. Any failure, including the
 * re-check, removes `dest` before rethrowing, so a survived answer-key path never stays on disk.
 * `repoRoot` is the checkout to export from; `commit` is the commit-ish to export; `dest` is where
 * the export lands, its existing contents replaced; `runner` is the command runner, overridden in
 * tests.
 * @throws When the archive or its extraction fails, or an excluded path survives.
 */
export function prepareRepositoryExport({
  repoRoot,
  commit,
  dest,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  runner?: CommandRunner;
}): void {
  try {
    archiveCommit({ repoRoot, commit, dest, pathspec: ['--', '.', ':!docs/internal/record', ':!docs/superpowers'], runner });
    assertNoExcludedPaths(dest);
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Build a core-developer job's prepared tree: `prepareRepositoryExport` at `commit`, then that
 * export's own dependencies installed, so the class's allowlisted `npm run check*`/`npm test`
 * checks have something real to run against, the same as `prepareDocsAndSite`'s own
 * `installAndStrip` step does for a scaffolded site. Preparation-time only: a reader's own
 * container never runs `npm install` itself, since its egress proxy allows nothing but
 * `api.anthropic.com`, and its Bash allowlist does not name `npm install` either. `repoRoot` is
 * the checkout to export from; `commit` is the commit-ish to export; `dest` is the prepared tree's
 * root, replaced first if it already exists; `runner` is the command runner, overridden in tests.
 * @throws When the export or the install fails.
 */
export function prepareRepositoryExportWithDependencies({
  repoRoot,
  commit,
  dest,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  runner?: CommandRunner;
}): void {
  prepareRepositoryExport({ repoRoot, commit, dest, runner });
  const install = runner('npm', ['install', '--no-audit', '--no-fund'], { cwd: dest });
  if (install.status !== 0) {
    rmSync(dest, { recursive: true, force: true });
    throw new Error(`npm install failed in ${dest}: ${install.stderr}`);
  }
}

/**
 * One subdirectory of the scripter class's contract-pages bundle: a reference page pinned to its
 * own commit, plus the JSON schema files it cites at that same commit, if any. Each page can be
 * pinned to a different commit, since pass A's three contract pages were fixed at different points
 * in their own review.
 */
export interface ContractPageSpec {
  /** The bundle subdirectory this page's own commit lands under. */
  name: string;
  /** The commit this page (and its cited schemas) are pinned to. */
  commit: string;
  /** The page's path, relative to the checkout root. */
  page: string;
  /** The JSON schema paths this page cites, relative to the checkout root. */
  schemas: string[];
}

/**
 * Build the scripter class's repository export: one subdirectory per `ContractPageSpec`, each
 * holding only its own named page and cited schemas, exported from that page's own pinned commit,
 * never from `HEAD` or from another page's commit. This is what keeps a later fix to one page from
 * silently reaching a scripter reader through another page's subdirectory. `repoRoot` is the
 * checkout to export from; `pages` are the bundle's subdirectories; `dest` is the bundle's root,
 * replaced first if it already exists; `runner` is the command runner, overridden in tests.
 * @throws When any page's archive or extraction fails, or an excluded path survives.
 */
export function prepareContractPagesBundle({
  repoRoot,
  pages,
  dest,
  runner = spawnRunner,
}: {
  repoRoot: string;
  pages: ContractPageSpec[];
  dest: string;
  runner?: CommandRunner;
}): void {
  rmSync(dest, { recursive: true, force: true });
  try {
    for (const spec of pages) {
      archiveCommit({ repoRoot, commit: spec.commit, dest: join(dest, spec.name), pathspec: ['--', spec.page, ...spec.schemas], runner });
    }
    assertNoExcludedPaths(dest, REPOSITORY_EXCLUDED_PATHS.flatMap((rel) => pages.map((spec) => join(spec.name, rel))));
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}

/**
 * The site-record shape the Go tool's `tool/internal/record` package reads (and the Node CLI
 * itself writes under a live site's own state directory): the fields `store.Load` parses, with
 * every secret-bearing key left out, since the operator class's credentials arrive as environment
 * variables (`CAIRN_CF_READ_TOKEN`, `CAIRN_GH_READ_TOKEN`), never through the registry.
 */
export interface ScratchSiteRecord {
  name: string;
  step: string;
  domain: string;
  schemaVersion: number;
  adopted: boolean;
  github: { repo: { id: number; owner: string; repo: string; defaultBranch: string }; installationId: number };
  cloudflare: { accountId: string; workerName: string };
}

/**
 * Write one site record under a `CAIRN_STATE_DIR`-shaped registry directory, at the permissions
 * `store.Save` itself writes (`0700` directory, `0600` file): the Go tool's `checkSafePerm` refuses
 * a record or directory that grants access beyond the owner, so a registry built by this function
 * must match what a live `cairn` run would have produced.
 * @param stateDir - The registry directory (a job's prepared tree's `state/` subdirectory).
 * @param siteId - The record's filename stem, matching the Go tool's site-id shape.
 * @param record - The record to write.
 */
export function writeScratchSiteRecord(stateDir: string, siteId: string, record: ScratchSiteRecord): void {
  mkdirSync(stateDir, { recursive: true });
  chmodSync(stateDir, 0o700);
  const file = join(stateDir, `${siteId}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  chmodSync(file, 0o600);
}

/**
 * Re-tighten a copied `state/` registry directory's permissions to the owner-only mode
 * `writeScratchSiteRecord` wrote, undoing `cpSync`'s own directory-copy behaviour: `cpSync`
 * preserves a copied file's mode but creates every copied directory at the process's default
 * mode, so a job's `state/` directory comes out world-readable after each of the runner's two
 * `cpSync` hops (`prepare` into a fresh per-job tree, then that tree into the container's mount),
 * and the Go tool's `store.checkSafePerm` then refuses to read it. A tree with no `state/`
 * directory (every class but docs-and-binary) is left untouched.
 * @param root - The job directory that may hold a `state/` subdirectory.
 */
export function restrictStateDirPermissions(root: string): void {
  const stateDir = join(root, 'state');
  if (!existsSync(stateDir)) return;
  chmodSync(stateDir, 0o700);
  for (const name of readdirSync(stateDir)) chmodSync(join(stateDir, name), 0o600);
}

/** The scratch site's own repository, cloned only to build the docs-and-binary class's site checkout copy. */
export const SCRATCH_SITE_CLONE_URL = 'https://github.com/glw907/cairn-scratch-b.git';

/**
 * Ensure a local clone of the scratch site's repository holds `commit`: cloning fresh when
 * `cloneDir` does not exist yet, and fetching that one commit when it exists but lacks it. Every
 * call after the first clone is a no-op fetch check, so a preparation step run repeatedly (a
 * rebuild, a re-run baseline) reuses the same local clone rather than clone anew each time. This
 * is the only place the docs-and-binary class's preparation reaches the network; a reader's own
 * container never does. `cloneDir` is where the local clone lives, reused across calls; `cloneUrl`
 * is the repository's clone URL; `commit` is the commit a later export step will pin to; `runner`
 * is the command runner, overridden in tests.
 * @throws When the clone, the fetch, or the commit lookup fails.
 */
export function ensureScratchSiteCommit({
  cloneDir,
  cloneUrl = SCRATCH_SITE_CLONE_URL,
  commit,
  runner = spawnRunner,
}: {
  cloneDir: string;
  cloneUrl?: string;
  commit: string;
  runner?: CommandRunner;
}): void {
  if (!existsSync(join(cloneDir, '.git'))) {
    mkdirSync(dirname(cloneDir), { recursive: true });
    const clone = runner('git', ['clone', '--quiet', cloneUrl, cloneDir], { cwd: dirname(cloneDir) });
    if (clone.status !== 0) throw new Error(`git clone of ${cloneUrl} failed: ${clone.stderr}`);
  }
  const verify = runner('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: cloneDir });
  if (verify.status === 0) return;
  const fetch = runner('git', ['fetch', '--quiet', 'origin', commit], { cwd: cloneDir });
  if (fetch.status !== 0) throw new Error(`git fetch of ${commit} from ${cloneUrl} failed: ${fetch.stderr}`);
  const reverify = runner('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: cloneDir });
  if (reverify.status !== 0) throw new Error(`commit ${commit} not found in ${cloneUrl} after fetching it`);
}

/**
 * Build a docs-and-binary job's prepared tree: the published docs set at their doc-relative
 * paths, plus a `state/` registry directory holding exactly one site record, so the `cairn`
 * binary baked into the reader image (`Containerfile`) lists, checks, and probes only the
 * scratch site named there. The binary itself is not copied here: it is pinned into the image at
 * build time (`ensureImage`'s `cairnToolVersion`), never into a per-job tree, since a class with
 * no Write or Edit tool has nowhere writable to install one at run time. When `siteExportDir` is
 * given, that directory's own top-level entries are copied directly into `dest`'s root (the
 * scratch site's `wrangler.jsonc`, `svelte.config.js`, `src/`, and the rest), so an operator reader
 * finds the site's checkout right at its own working directory, the same as a real operator whose
 * shell already sits inside their site's own directory. `sourceRoot` is the checkout the docs set
 * is copied from; `docsSet` are the pages the job names, relative to `sourceRoot`; `siteId` is the
 * site record's filename stem; `record` is the one site record the registry holds; `dest` is the
 * prepared tree's root; `siteExportDir` is an already-exported site checkout (built separately,
 * with `ensureScratchSiteCommit` and `archiveCommit`), omitted when a job carries no site checkout.
 * @throws When a named docs-set page is missing.
 */
export function prepareDocsAndBinary({
  sourceRoot,
  docsSet,
  siteId,
  record,
  dest,
  siteExportDir,
}: {
  sourceRoot: string;
  docsSet: string[];
  siteId: string;
  record: ScratchSiteRecord;
  dest: string;
  siteExportDir?: string;
}): void {
  rmSync(dest, { recursive: true, force: true });
  try {
    copyDocsSet(sourceRoot, docsSet, dest);
    writeScratchSiteRecord(join(dest, 'state'), siteId, record);
    if (siteExportDir) {
      for (const name of readdirSync(siteExportDir)) cpSync(join(siteExportDir, name), join(dest, name), { recursive: true });
    }
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}
