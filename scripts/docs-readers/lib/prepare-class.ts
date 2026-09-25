/**
 * Preparation for the reader classes whose trees are built on the host: docs-only (a docs set
 * exported at a pinned commit), docs-and-site (a scaffolded site with the engine installed from a
 * packed tarball), docs-and-binary (a docs set beside a scratch site's registry), and repository
 * (a git-archive export that excludes the pass's own answer key, under one synthetic commit).
 * Every tree builds once, on the host, well before any reader's container starts; a reader only
 * ever sees the tree this module already finished, since `npm install` and `git archive` never
 * run inside a reader's own confined network. Every page a tree carries comes from `git archive`
 * at a named commit, never from `HEAD` or the working tree, and every finished tree carries one
 * fixed mtime, so neither a file's content nor its timestamp says when or how it was built.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  lutimesSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

/** A shell command runner, injected so tests can replace the real `npm`, `git`, and `tar` calls. */
export type CommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string; input?: Buffer; env?: NodeJS.ProcessEnv },
) => { status: number | null; stdout: Buffer; stderr: string };

/** Decode a command's raw output the same way everywhere, without leaning on a single overload of `Buffer.prototype.toString`. */
const decoder = new TextDecoder('utf-8');

/** The real runner: `child_process.spawnSync`, used everywhere outside a test. */
export const spawnRunner: CommandRunner = (command, args, { cwd, input, env }) => {
  const result = spawnSync(command, args, { cwd, input, env, maxBuffer: 256 * 1024 * 1024 });
  return {
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: decoder.decode(result.stderr ?? Buffer.alloc(0)),
  };
};

/** The author and committer name on every prepared tree's one synthetic commit. */
export const EXPORT_COMMIT_NAME = 'cairn';

/** The author and committer email on every prepared tree's one synthetic commit, in a reserved domain that names no one. */
export const EXPORT_COMMIT_EMAIL = 'export@example.invalid';

/**
 * The author and committer date on every synthetic commit, and the mtime every file in every
 * prepared tree carries. One fixed instant for every tree, so a control tree and a planted tree
 * of one job cannot be told apart by when either was built.
 */
export const EXPORT_COMMIT_DATE = '2000-01-01T00:00:00Z';

/** The message on every synthetic commit: the same word for every tree, naming nothing about its contents. */
export const EXPORT_COMMIT_MESSAGE = 'Export';

/**
 * Refuse any commit-ish that is not a commit id, then confirm the id names a commit in
 * `repoRoot`. A symbolic name (`HEAD`, a branch, a tag) moves under the caller, so a tree built
 * from one could differ from the pin a batch records; only a hex id stays put.
 * @param repoRoot - The checkout the commit must exist in.
 * @param commit - The commit id, abbreviated or full.
 * @param runner - The command runner; overridden in tests.
 * @throws When `commit` is not a hex id, or names no commit in `repoRoot`.
 */
export function assertPinnedCommit(repoRoot: string, commit: string, runner: CommandRunner = spawnRunner): void {
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw new Error(`"${commit}" is not a pinned commit id: every export names a commit by its hex id, never HEAD, a branch, or a tag`);
  }
  const found = runner('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: repoRoot });
  if (found.status !== 0) throw new Error(`commit ${commit} does not exist in ${repoRoot}: ${found.stderr}`);
}

/**
 * Resolve a revision to its full commit id, for a caller that must pin whatever a symbolic name
 * points at right now (a harness smoke check of this worktree) before handing it to an export.
 * @param repoRoot - The checkout to resolve in.
 * @param revision - The revision to resolve.
 * @param runner - The command runner; overridden in tests.
 * @returns The full commit id.
 * @throws When the revision does not resolve to a commit.
 */
export function resolveCommit(repoRoot: string, revision: string, runner: CommandRunner = spawnRunner): string {
  const parsed = runner('git', ['rev-parse', '--verify', `${revision}^{commit}`], { cwd: repoRoot });
  if (parsed.status !== 0) throw new Error(`cannot resolve ${revision} in ${repoRoot}: ${parsed.stderr}`);
  return decoder.decode(parsed.stdout).trim();
}

/**
 * Every file and symlink under `dir` (never a directory itself), as paths relative to `dir`,
 * sorted, without following a symlink.
 * @param dir - The tree to list.
 * @returns The relative paths.
 */
export function listTreeFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(relative(dir, full));
    }
  };
  walk(dir);
  return found.sort();
}

/**
 * Set every file, symlink, and directory under `dir`, `dir` included, to one access and
 * modification time. A symlink's own time is set, never its target's.
 * @param dir - The tree to normalize.
 * @param when - The instant to set; defaults to `EXPORT_COMMIT_DATE`.
 */
export function normalizeMtimes(dir: string, when: Date = new Date(EXPORT_COMMIT_DATE)): void {
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isSymbolicLink()) lutimesSync(full, when, when);
      else {
        if (entry.isDirectory()) walk(full);
        utimesSync(full, when, when);
      }
    }
  };
  walk(dir);
  utimesSync(dir, when, when);
}

/**
 * The environment every git call against a prepared tree runs under: the caller's environment
 * with every `GIT_*` variable and `EMAIL` removed, the global and system config files switched
 * off (so no host identity, hook path, template directory, or signing setting applies), the
 * repository pinned to `dir` itself (so git never discovers an enclosing checkout), and the
 * neutral identity and date set explicitly for both author and committer.
 * @param dir - The prepared tree's root.
 * @returns The environment to pass to the runner.
 */
export function exportGitEnv(dir: string): NodeJS.ProcessEnv {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') && key !== 'EMAIL'));
  return {
    ...inherited,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_DIR: join(dir, '.git'),
    GIT_WORK_TREE: dir,
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_AUTHOR_NAME: EXPORT_COMMIT_NAME,
    GIT_AUTHOR_EMAIL: EXPORT_COMMIT_EMAIL,
    GIT_AUTHOR_DATE: EXPORT_COMMIT_DATE,
    GIT_COMMITTER_NAME: EXPORT_COMMIT_NAME,
    GIT_COMMITTER_EMAIL: EXPORT_COMMIT_EMAIL,
    GIT_COMMITTER_DATE: EXPORT_COMMIT_DATE,
  };
}

/**
 * Run one git command against a prepared tree under `exportGitEnv`.
 * @param dir - The prepared tree's root.
 * @param args - The git arguments.
 * @param runner - The command runner.
 * @param input - Bytes for the command's stdin, if any.
 * @returns The command's output.
 * @throws When the command exits non-zero.
 */
function treeGit(dir: string, args: string[], runner: CommandRunner, input?: Buffer): string {
  const result = runner('git', args, { cwd: dir, env: exportGitEnv(dir), input });
  if (result.status !== 0) throw new Error(`git ${args[0]} failed in ${dir}: ${result.stderr}`);
  return decoder.decode(result.stdout);
}

/**
 * Confirm a prepared tree is a git repository holding exactly one commit, reachable from any ref,
 * and a clean `git status` with every untracked file shown. This is what fails preparation when a
 * tree carries a second commit (a history a reader could diff against) or a change the commit did
 * not take in (a difference a reader could see with `git diff`).
 * @param dir - The prepared tree's root.
 * @param runner - The command runner; overridden in tests.
 * @throws When the tree has no repository, more or fewer than one commit, or a dirty status.
 */
export function assertOneCleanCommit(dir: string, runner: CommandRunner = spawnRunner): void {
  if (!existsSync(join(dir, '.git'))) throw new Error(`prepared tree at ${dir} carries no git repository`);
  const count = treeGit(dir, ['rev-list', '--count', '--all'], runner).trim();
  if (count !== '1') throw new Error(`prepared tree at ${dir} carries ${count} commits, not exactly one`);
  const status = treeGit(dir, ['status', '--porcelain', '--untracked-files=all'], runner);
  if (status.trim() !== '') throw new Error(`prepared tree at ${dir} has a dirty git status:\n${status}`);
}

/**
 * Make a prepared tree's one synthetic commit: a fresh repository with no template (so no sample
 * hooks or host-configured template files), every file staged, then one commit under the neutral
 * identity, date, and message, with hooks, signing, and reflogs switched off. `dir` is the
 * prepared tree's root; `forceAdd` names files, relative to `dir`, to stage even when the tree's
 * own `.gitignore` matches them, so a file the source commit tracked despite its ignore rules stays
 * tracked in the export too; `runner` is the command runner, overridden in tests.
 * @throws When `dir` already carries a `.git`, or any git step fails.
 */
export function commitPreparedTree(dir: string, { forceAdd = [], runner = spawnRunner }: { forceAdd?: string[]; runner?: CommandRunner } = {}): void {
  if (existsSync(join(dir, '.git'))) throw new Error(`prepared tree at ${dir} already carries a .git before its synthetic commit`);
  treeGit(dir, ['init', '--quiet', '--template=', '--initial-branch=main'], runner);
  treeGit(dir, ['add', '--all'], runner);
  if (forceAdd.length > 0) {
    treeGit(dir, ['--literal-pathspecs', 'add', '--force', '--pathspec-from-file=-', '--pathspec-file-nul'], runner, Buffer.from(forceAdd.join('\0')));
  }
  treeGit(
    dir,
    ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgSign=false', '-c', 'core.logAllRefUpdates=false', 'commit', '--quiet', '--no-verify', '-m', EXPORT_COMMIT_MESSAGE],
    runner,
  );
}

/**
 * Finish a built tree, in a fixed order: every file's mtime normalized to `EXPORT_COMMIT_DATE`,
 * then, for a repository-class tree, the one synthetic commit and the one-commit-and-clean check,
 * then the new `.git` and the root directory normalized too. The overlay, when a tree has one,
 * lands before this runs, so the commit always takes in the tree a reader will see.
 * `dir` is the built tree's root; `commit` is whether the tree gets its synthetic commit (a
 * repository-class tree does); `forceAdd` is passed to `commitPreparedTree`; `runner` is the
 * command runner, overridden in tests.
 */
export function finalizePreparedTree(
  dir: string,
  { commit, forceAdd, runner = spawnRunner }: { commit: boolean; forceAdd?: string[]; runner?: CommandRunner },
): void {
  normalizeMtimes(dir);
  if (!commit) return;
  commitPreparedTree(dir, { forceAdd, runner });
  assertOneCleanCommit(dir, runner);
  normalizeMtimes(join(dir, '.git'));
  const when = new Date(EXPORT_COMMIT_DATE);
  utimesSync(dir, when, when);
}

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
    cpSync(from, join(dest, relPath), { recursive: true, verbatimSymlinks: true });
  }
}

/**
 * Confirm no symlink under a prepared tree points somewhere outside it: an absolute target, or a
 * relative target whose own resolved path climbs out of `dir` itself. Walks with `lstat`/`readlink`
 * rather than trust that every copy step along the way (`copyDocsSet`'s `verbatimSymlinks`, a
 * `git archive`, an `npm install`) only ever planted a link this pass already accounted for; a
 * reader's container mounts this tree read-only, but a symlink resolving outside it could still
 * point a read at something never meant to reach a reader.
 * @param dir - The prepared tree's root.
 * @throws Naming the first unsafe symlink found, with its own target.
 */
export function assertNoUnsafeSymlinks(dir: string): void {
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        const target = readlinkSync(entryPath);
        if (isAbsolute(target)) {
          throw new Error(`prepared tree at ${dir} carries an absolute symlink: ${entryPath} -> ${target}`);
        }
        const resolved = resolve(dirname(entryPath), target);
        if (resolved !== dir && !resolved.startsWith(`${dir}${sep}`)) {
          throw new Error(`prepared tree at ${dir} carries a symlink resolving outside it: ${entryPath} -> ${target}`);
        }
      } else if (entry.isDirectory()) {
        walk(entryPath);
      }
    }
  };
  walk(dir);
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
 * @returns The cached copies' paths.
 */
function writeTarballCache(cacheRoot: string, key: string, tarballs: { engine: string; dev: string }): { engine: string; dev: string } {
  const { dir, engine, dev } = tarballCachePaths(cacheRoot, key);
  mkdirSync(dir, { recursive: true });
  cpSync(tarballs.engine, engine);
  cpSync(tarballs.dev, dev);
  pruneTarballCache(cacheRoot);
  return { engine, dev };
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
 * Pack the engine and the dev backend as they stand at a pinned commit, never as the working tree
 * holds them: the commit is exported whole into `scratchDir`, its dependencies installed with
 * `npm ci`, the engine built, and both packages packed from that export. With `cacheRoot`, the pair
 * is cached under the commit's full id, which a working-tree edit can never make stale, so a hit
 * skips the export and build entirely. Either way the returned paths sit under the cache when one
 * is given, so every tree built from one commit names the same tarball paths. `repoRoot` is the
 * checkout; `commit` is the commit id; `scratchDir` is where the export and a fresh pack land, the
 * export removed after; `cacheRoot` is the runner's neutral cache root, caching off when omitted;
 * `runner` is the command runner, overridden in tests.
 * @returns The engine and dev-backend tarballs' absolute paths.
 * @throws When the commit is not a pinned id, or the export, install, build, or either pack fails.
 */
export function packPinnedEngineTarballs({
  repoRoot,
  commit,
  scratchDir,
  cacheRoot,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  scratchDir: string;
  cacheRoot?: string;
  runner?: CommandRunner;
}): { engine: string; dev: string } {
  assertPinnedCommit(repoRoot, commit, runner);
  const key = resolveCommit(repoRoot, commit, runner);
  if (cacheRoot) {
    const cached = readTarballCache(cacheRoot, key);
    if (cached) return cached;
  }
  const source = join(scratchDir, 'source');
  try {
    archiveCommit({ repoRoot, commit: key, dest: source, runner });
    const install = runner('npm', ['ci', '--no-audit', '--no-fund'], { cwd: source });
    if (install.status !== 0) throw new Error(`npm ci failed in ${source}: ${install.stderr}`);
    const built = runner('npm', ['run', 'package'], { cwd: source });
    if (built.status !== 0) throw new Error(`npm run package failed in ${source}: ${built.stderr}`);
    const packDir = join(scratchDir, 'pack');
    const tarballs = { engine: packTarball(source, packDir, runner), dev: packTarball(join(source, 'packages/cairn-cms-dev'), packDir, runner) };
    return cacheRoot ? writeTarballCache(cacheRoot, key, tarballs) : tarballs;
  } finally {
    rmSync(source, { recursive: true, force: true });
  }
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
 * Export `templates/waymark`'s tracked files at a pinned commit into a job's scaffold directory
 * (the setup command's own committed output, never a working tree, so no ignored state such as
 * `.wrangler/`, `.cairn/`, `test-results/`, or `.dev.vars` can reach a reader), drop the
 * template's own `CLAUDE.md` and `.claude/`, and point its engine and dev-backend dependencies at
 * packed tarballs. `repoRoot` is the checkout `templates/waymark` is exported from; `commit` is the
 * commit id it is exported at; `dest` is the scaffold's destination, replaced if it already
 * exists; `tarballs` are the engine and dev-backend tarballs' absolute paths; `runner` is the
 * command runner, overridden in tests.
 * @throws When the commit is not a pinned id, or the export fails.
 */
export function scaffoldSite({
  repoRoot,
  commit,
  dest,
  tarballs,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  tarballs: { engine: string; dev: string };
  runner?: CommandRunner;
}): void {
  assertPinnedCommit(repoRoot, commit, runner);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const archive = runner('git', ['archive', commit, 'templates/waymark'], { cwd: repoRoot });
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
 * What every builder returns: the paths absent by design from the tree it built, relative to the
 * tree's root, a directory written with a trailing `/`. A batch or job file records this list as
 * the job's `absent`, so a reader stalled on one of these paths reads as the harness's design,
 * not a docs defect.
 */
export interface PreparedTree {
  /** The paths the builder's own exclusions kept out of the tree. */
  absent: string[];
}

/**
 * A second tree a builder makes from its own built tree before either is finished: a copy of the
 * built tree with `overlay` applied, then finished exactly as the builder finishes its own. A
 * planted tree is a variant of its control, so the two share every byte the overlay leaves alone
 * and each still gets its own mtimes and, for a repository-class tree, its own synthetic commit.
 */
export interface TreeVariant {
  /** Where the variant lands, replaced if it already exists. */
  dest: string;
  /** Rewrites the copied tree in place, before it is finished. */
  overlay: (dir: string) => void;
}

/**
 * The shared shape of every builder: remove `dest` and every variant's destination, run `build`
 * into `dest`, copy and overlay each variant, then finish each variant and `dest` with
 * `finalizePreparedTree`. Any failure removes `dest` and every variant before rethrowing, so a
 * partially built tree, which could carry the answer key mid-strip or a plant with no commit over
 * it, never stays on disk. `dest` is the tree's root; `variants` are the trees built from it;
 * `commit` is whether each tree gets a synthetic commit; `runner` is the command runner; `build`
 * fills `dest` and returns its absent list and any files the commit must stage past `.gitignore`.
 * @returns The built tree's absent list.
 */
function buildPreparedTree({
  dest,
  variants = [],
  commit,
  runner = spawnRunner,
  build,
}: {
  dest: string;
  variants?: TreeVariant[];
  commit: boolean;
  runner?: CommandRunner;
  build: () => { absent: string[]; forceAdd?: string[] };
}): PreparedTree {
  const trees = [dest, ...variants.map((variant) => variant.dest)];
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
  try {
    const { absent, forceAdd } = build();
    for (const variant of variants) {
      cpSync(dest, variant.dest, { recursive: true, verbatimSymlinks: true });
      variant.overlay(variant.dest);
      assertNoUnsafeSymlinks(variant.dest);
      finalizePreparedTree(variant.dest, { commit, forceAdd, runner });
    }
    finalizePreparedTree(dest, { commit, forceAdd, runner });
    return { absent };
  } catch (error) {
    for (const tree of trees) rmSync(tree, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Export a job's docs-set pages at a pinned commit into `dest` at their doc-relative paths, the
 * same layout the docs-only class copies them into, so a page resolves to the same path in every
 * class. `repoRoot` is the checkout; `commit` is the commit id; `docsSet` is the pages; `dest` is
 * the tree's root, replaced first; `runner` is the command runner, overridden in tests.
 * @throws When the commit is not a pinned id, or a named page does not exist at it.
 */
export function exportDocsSet({
  repoRoot,
  commit,
  docsSet,
  dest,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  docsSet: string[];
  dest: string;
  runner?: CommandRunner;
}): void {
  archiveCommit({ repoRoot, commit, dest, pathspec: ['--', ...docsSet], runner });
  const missing = docsSet.filter((page) => !existsSync(join(dest, page)));
  if (missing.length > 0) throw new Error(`docs-set path(s) missing at ${commit}: ${missing.join(', ')}`);
}

/**
 * Build a docs-only job's prepared tree: its docs set, exported at a pinned commit. The builder
 * excludes nothing, so its absent list is empty. `sourceRoot` is the checkout; `commit` is the
 * commit id; `docsSet` is the pages; `dest` is the tree's root, replaced if it exists; `runner` is
 * the command runner, overridden in tests; `variants` are trees built from this one.
 * @returns The tree's absent list.
 * @throws When the commit is not a pinned id, or a named page is missing.
 */
export function prepareDocsOnly({
  sourceRoot,
  commit,
  docsSet,
  dest,
  runner = spawnRunner,
  variants,
}: {
  sourceRoot: string;
  commit: string;
  docsSet: string[];
  dest: string;
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: false,
    runner,
    build: () => {
      exportDocsSet({ repoRoot: sourceRoot, commit, docsSet, dest, runner });
      assertNoUnsafeSymlinks(dest);
      return { absent: [] };
    },
  });
}

/**
 * The paths a docs-and-site tree never carries, relative to its root: the scaffold's own
 * `CLAUDE.md` and `.claude/`, and each directory `INSTALLED_ENGINE_STRIP` removes from the
 * installed engine.
 */
export const DOCS_AND_SITE_EXCLUDED_PATHS = [
  'site/CLAUDE.md',
  'site/.claude/',
  ...INSTALLED_ENGINE_STRIP.map((name) => `site/node_modules/@glw907/cairn-cms/${name}/`),
];

/**
 * Build a docs-and-site job's prepared tree: the docs set at their doc-relative paths, and a
 * scaffolded site (`templates/waymark`'s tracked files) with the engine and dev backend installed
 * from packed tarballs, its own `CLAUDE.md`/`.claude/` gone, and the installed engine's `docs/`,
 * `claude/`, and `skills/` directories gone, both the pages and the scaffold exported at `commit`.
 * `sourceRoot` is the checkout; `commit` is the commit id; `docsSet` is the pages; `tarballs` are
 * the packed engine and dev-backend tarballs; `dest` is the tree's root, replaced if it exists;
 * `runner` is the command runner, overridden in tests; `variants` are trees built from this one.
 * @returns The tree's absent list, `DOCS_AND_SITE_EXCLUDED_PATHS`.
 */
export function prepareDocsAndSite({
  sourceRoot,
  commit,
  docsSet,
  tarballs,
  dest,
  runner = spawnRunner,
  variants,
}: {
  sourceRoot: string;
  commit: string;
  docsSet: string[];
  tarballs: { engine: string; dev: string };
  dest: string;
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: false,
    runner,
    build: () => {
      exportDocsSet({ repoRoot: sourceRoot, commit, docsSet, dest, runner });
      const siteDir = join(dest, 'site');
      scaffoldSite({ repoRoot: sourceRoot, commit, dest: siteDir, tarballs, runner });
      installAndStrip(siteDir, { runner });
      assertSiteAnswerKeyAbsent(siteDir);
      assertNoUnsafeSymlinks(dest);
      return { absent: [...DOCS_AND_SITE_EXCLUDED_PATHS] };
    },
  });
}

/**
 * The paths a repository-class export never carries, and the planter's export neither: the
 * harvest-only internal record, the whole specs-and-plans corpus, this reader harness (its batch
 * files, job texts, and development fixtures would hand a reader a script for the very task it is
 * being asked to do), the harness's own unit tests, and the rolling status, history, roadmap, and
 * friction log, each of which can tell a reader that plants exist or name a development item. A
 * directory ends in `/`; an entry whose last segment holds `*` matches any name there.
 */
export const REPOSITORY_EXCLUDED_PATHS = [
  'docs/internal/record/',
  'docs/superpowers/',
  'scripts/docs-readers/',
  'src/tests/unit/docs-readers-*',
  'docs/HISTORY.md',
  'docs/STATUS.md',
  'ROADMAP.md',
  'docs/internal/docs-friction-log.md',
];

/**
 * A pattern for an exclusion entry whose last segment holds `*`, where `*` matches any run of
 * characters other than `/`.
 * @param entry - An entry from an exclusion list such as `REPOSITORY_EXCLUDED_PATHS`.
 * @returns The pattern, anchored at both ends.
 */
function exclusionPattern(entry: string): RegExp {
  const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Whether one repository-relative path falls under one exclusion entry.
 * @param entry - A directory (trailing `/`), an exact path, or a pattern with `*`.
 * @param path - A repository-relative file path.
 * @returns True when the entry covers the path.
 */
export function isExcluded(entry: string, path: string): boolean {
  if (entry.endsWith('/')) return path.startsWith(entry);
  if (entry.includes('*')) return exclusionPattern(entry).test(path);
  return path === entry;
}

/**
 * Derive a job's absent list from its builder's exclusions: a directory or exact path stays as
 * written, and a pattern expands to every path it matches among `tracked`, the files the source
 * commit holds, so every entry in the list is a path, never a pattern.
 * @param exclusions - The builder's exclusion entries.
 * @param tracked - The source commit's file paths, repository-relative.
 * @returns The absent list, in exclusion order, each expansion sorted.
 */
export function absentPaths(exclusions: string[], tracked: string[]): string[] {
  return exclusions.flatMap((entry) => (entry.includes('*') ? tracked.filter((path) => isExcluded(entry, path)).sort() : [entry]));
}

/**
 * List a commit's tracked files. `repoRoot` is the checkout; `commit` is the commit id; `runner` is
 * the command runner, overridden in tests.
 * @returns Every file path the commit holds, repository-relative.
 * @throws When the listing fails.
 */
export function trackedPaths({ repoRoot, commit, runner = spawnRunner }: { repoRoot: string; commit: string; runner?: CommandRunner }): string[] {
  const listed = runner('git', ['ls-tree', '-r', '-z', '--name-only', commit], { cwd: repoRoot });
  if (listed.status !== 0) throw new Error(`git ls-tree failed for ${commit}: ${listed.stderr}`);
  return decoder.decode(listed.stdout).split('\0').filter((path) => path !== '');
}

/**
 * Confirm none of the excluded paths reached an export, independent of whether the pathspec that
 * built it worked; this is what actually fails preparation, not trust in `git archive`'s own
 * exclusion syntax.
 * @param dir - The exported tree's root.
 * @param excluded - The exclusion entries, relative to `dir`.
 * @throws Listing every excluded path that survived, when any did.
 */
export function assertNoExcludedPaths(dir: string, excluded: string[] = REPOSITORY_EXCLUDED_PATHS): void {
  const survived = excluded.flatMap((entry) => {
    if (!entry.includes('*')) return existsSync(join(dir, entry)) ? [entry] : [];
    const parent = dirname(entry);
    if (!existsSync(join(dir, parent))) return [];
    return readdirSync(join(dir, parent))
      .map((name) => join(parent, name))
      .filter((path) => isExcluded(entry, path));
  });
  if (survived.length > 0) {
    throw new Error(`repository export at ${dir}: excluded path(s) survived: ${survived.join(', ')}`);
  }
}

/**
 * Export a commit of a git checkout into a clean directory via `git archive` piped straight into
 * `tar`, with no assumption about what the export should or should not carry: `pathspec` is
 * appended to the `git archive` invocation verbatim, so a caller passes either an inclusion list
 * (bare paths) or an exclusion list (`:(exclude)path` entries) as its own needs require. The commit
 * must be a pinned id (`assertPinnedCommit`). `repoRoot` is the checkout to export from; `commit`
 * is the commit id to export; `dest` is where the export lands, replaced first if it already
 * exists; `pathspec` is extra `git archive` arguments after the commit (an inclusion list, an
 * exclusion list, or none); `runner` is the command runner, overridden in tests.
 * @throws When the commit is not a pinned id, or the archive or its extraction fails.
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
  assertPinnedCommit(repoRoot, commit, runner);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  const archive = runner('git', ['archive', commit, ...pathspec], { cwd: repoRoot });
  if (archive.status !== 0) throw new Error(`git archive failed for ${commit}: ${archive.stderr}`);
  const extract = runner('tar', ['-x', '-C', dest], { cwd: dest, input: archive.stdout });
  if (extract.status !== 0) throw new Error(`tar extract failed for ${commit}: ${extract.stderr}`);
}

/**
 * Export a whole commit minus `exclusions` into `dest` as a plain file tree, then re-check that
 * none survived, regardless of whether the pathspec worked, and that no symlink escapes the tree.
 * `repoRoot` is the checkout; `commit` is the commit id; `dest` is the tree's root; `exclusions`
 * are the entries kept out; `runner` is the command runner.
 * @throws When the archive fails, or an excluded path or unsafe symlink survives.
 */
function exportRepositoryTree({
  repoRoot,
  commit,
  dest,
  exclusions,
  runner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  exclusions: string[];
  runner: CommandRunner;
}): void {
  archiveCommit({ repoRoot, commit, dest, pathspec: ['--', '.', ...exclusions.map((entry) => `:(exclude)${entry}`)], runner });
  assertNoExcludedPaths(dest, exclusions);
  assertNoUnsafeSymlinks(dest);
}

/**
 * Export a commit for the planter: a plain file tree with no `.git`, carrying the same exclusions
 * as a repository-class export, so the planter reads the pages a reader will read and nothing that
 * names a development item. Any failure removes `dest` before rethrowing. `repoRoot` is the
 * checkout; `commit` is the commit id; `dest` is the export's root, replaced if it exists;
 * `exclusions` defaults to `REPOSITORY_EXCLUDED_PATHS`; `runner` is the command runner.
 * @returns The export's absent list.
 * @throws When the commit is not a pinned id, the archive fails, or an excluded path survives.
 */
export function preparePlanterExport({
  repoRoot,
  commit,
  dest,
  exclusions = REPOSITORY_EXCLUDED_PATHS,
  runner = spawnRunner,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  exclusions?: string[];
  runner?: CommandRunner;
}): PreparedTree {
  try {
    exportRepositoryTree({ repoRoot, commit, dest, exclusions, runner });
    if (existsSync(join(dest, '.git'))) throw new Error(`planter export at ${dest} carries a .git`);
    return { absent: absentPaths(exclusions, trackedPaths({ repoRoot, commit, runner })) };
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Build a repository-class job's prepared tree: a commit exported minus `exclusions` (this
 * repository sets no `export-ignore` attribute, so the exclusion is by pathspec, re-checked after),
 * finished with its one synthetic commit. Every file the archive wrote is staged even where the
 * tree's own `.gitignore` matches it, so the commit tracks exactly what the source commit tracked.
 * `repoRoot` is the checkout; `commit` is the commit id; `dest` is the tree's root, replaced if it
 * exists; `exclusions` defaults to `REPOSITORY_EXCLUDED_PATHS`; `runner` is the command runner;
 * `variants` are trees built from this one.
 * @returns The tree's absent list, derived from `exclusions` against the commit's files.
 * @throws When the archive fails, an excluded path survives, or the commit check fails.
 */
export function prepareRepositoryExport({
  repoRoot,
  commit,
  dest,
  exclusions = REPOSITORY_EXCLUDED_PATHS,
  runner = spawnRunner,
  variants,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  exclusions?: string[];
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: true,
    runner,
    build: () => {
      exportRepositoryTree({ repoRoot, commit, dest, exclusions, runner });
      return { absent: absentPaths(exclusions, trackedPaths({ repoRoot, commit, runner })), forceAdd: listTreeFiles(dest) };
    },
  });
}

/**
 * Build a core-developer job's prepared tree: `prepareRepositoryExport`'s export at `commit`, then
 * that export's own dependencies installed with `npm ci` (never `npm install`: the export's
 * `package-lock.json` is `commit`'s own, always in sync with its `package.json`, and `npm ci`
 * installs exactly what it names without ever rewriting it), so the class's allowlisted checks
 * have something real to run against, then the synthetic commit over the whole. Preparation-time
 * only: a reader's own container never runs an install itself, since its egress proxy allows
 * nothing but `api.anthropic.com`, and its Bash allowlist does not name one either. The arguments
 * are `prepareRepositoryExport`'s.
 * @returns The tree's absent list.
 * @throws When the export, the install, or the commit check fails.
 */
export function prepareRepositoryExportWithDependencies({
  repoRoot,
  commit,
  dest,
  exclusions = REPOSITORY_EXCLUDED_PATHS,
  runner = spawnRunner,
  variants,
}: {
  repoRoot: string;
  commit: string;
  dest: string;
  exclusions?: string[];
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: true,
    runner,
    build: () => {
      exportRepositoryTree({ repoRoot, commit, dest, exclusions, runner });
      const forceAdd = listTreeFiles(dest);
      const install = runner('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dest });
      if (install.status !== 0) throw new Error(`npm ci failed in ${dest}: ${install.stderr}`);
      assertNoUnsafeSymlinks(dest);
      return { absent: absentPaths(exclusions, trackedPaths({ repoRoot, commit, runner })), forceAdd };
    },
  });
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
 * never from `HEAD` or from another page's commit, then one synthetic commit over the whole bundle.
 * This is what keeps a later fix to one page from silently reaching a scripter reader through
 * another page's subdirectory. The export is by inclusion, so the builder excludes nothing and its
 * absent list is empty; `REPOSITORY_EXCLUDED_PATHS` is still re-checked under each subdirectory.
 * `repoRoot` is the checkout to export from; `pages` are the bundle's subdirectories; `dest` is the
 * bundle's root, replaced first if it already exists; `runner` is the command runner, overridden in
 * tests; `variants` are trees built from this one.
 * @returns The bundle's absent list.
 * @throws When any page's archive or extraction fails, an excluded path survives, or the commit
 * check fails.
 */
export function prepareContractPagesBundle({
  repoRoot,
  pages,
  dest,
  runner = spawnRunner,
  variants,
}: {
  repoRoot: string;
  pages: ContractPageSpec[];
  dest: string;
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: true,
    runner,
    build: () => {
      for (const spec of pages) {
        archiveCommit({ repoRoot, commit: spec.commit, dest: join(dest, spec.name), pathspec: ['--', spec.page, ...spec.schemas], runner });
      }
      assertNoExcludedPaths(dest, REPOSITORY_EXCLUDED_PATHS.flatMap((rel) => pages.map((spec) => join(spec.name, rel))));
      assertNoUnsafeSymlinks(dest);
      return { absent: [] };
    },
  });
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
 * Build a docs-and-binary job's prepared tree: the docs set, exported at `commit`, at their
 * doc-relative paths, plus a `state/` registry directory holding exactly one site record, so the
 * `cairn` binary baked into the reader image (`Containerfile`) lists, checks, and probes only the
 * scratch site named there. The binary itself is not copied here: it is pinned into the image at
 * build time (`ensureImage`'s `cairnToolVersion`), never into a per-job tree, since a class with
 * no Write or Edit tool has nowhere writable to install one at run time. When `siteExportDir` is
 * given, that directory's own top-level entries are copied directly into `dest`'s root (the
 * scratch site's `wrangler.jsonc`, `svelte.config.js`, `src/`, and the rest), so an operator reader
 * finds the site's checkout right at its own working directory, the same as a real operator whose
 * shell already sits inside their site's own directory. `sourceRoot` is the checkout the docs set
 * is exported from; `commit` is the commit id; `docsSet` are the pages the job names; `siteId` is
 * the site record's filename stem; `record` is the one site record the registry holds; `dest` is
 * the prepared tree's root; `siteExportDir` is an already-exported site checkout (built separately,
 * with `ensureScratchSiteCommit` and `archiveCommit`), omitted when a job carries no site checkout;
 * `runner` is the command runner; `variants` are trees built from this one. The builder excludes
 * nothing, so its absent list is empty.
 * @returns The tree's absent list.
 * @throws When the commit is not a pinned id, or a named docs-set page is missing.
 */
export function prepareDocsAndBinary({
  sourceRoot,
  commit,
  docsSet,
  siteId,
  record,
  dest,
  siteExportDir,
  runner = spawnRunner,
  variants,
}: {
  sourceRoot: string;
  commit: string;
  docsSet: string[];
  siteId: string;
  record: ScratchSiteRecord;
  dest: string;
  siteExportDir?: string;
  runner?: CommandRunner;
  variants?: TreeVariant[];
}): PreparedTree {
  return buildPreparedTree({
    dest,
    variants,
    commit: false,
    runner,
    build: () => {
      exportDocsSet({ repoRoot: sourceRoot, commit, docsSet, dest, runner });
      writeScratchSiteRecord(join(dest, 'state'), siteId, record);
      if (siteExportDir) {
        for (const name of readdirSync(siteExportDir)) cpSync(join(siteExportDir, name), join(dest, name), { recursive: true, verbatimSymlinks: true });
      }
      assertNoUnsafeSymlinks(dest);
      return { absent: [] };
    },
  });
}
