/**
 * Preparation for the two host-built reader classes: docs-and-site (a scaffolded site with the
 * engine installed from a packed tarball) and repository (a git-archive export that excludes the
 * pass's own answer key). Both build once, on the host, well before any reader's container
 * starts; a reader only ever sees the tree this module already finished, since `npm install` and
 * `git archive` never run inside a reader's own confined network.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
 * Build this worktree once, then pack the engine and the dev backend into tarballs under
 * `packTarball`'s content-addressed scheme. Building first and packing with `--ignore-scripts`
 * means the engine is built exactly once, not once for the build and again for `npm pack`'s own
 * `prepare` hook.
 * @param repoRoot - This worktree's root.
 * @param destDir - Where both tarballs land.
 * @param runner - The command runner; overridden in tests.
 * @returns The engine and dev-backend tarballs' absolute paths.
 * @throws When the build or either pack fails.
 */
export function packEngineTarballs(repoRoot: string, destDir: string, runner: CommandRunner = spawnRunner): { engine: string; dev: string } {
  const built = runner('npm', ['run', 'package'], { cwd: repoRoot });
  if (built.status !== 0) throw new Error(`npm run package failed: ${built.stderr}`);
  return {
    engine: packTarball(repoRoot, destDir, runner),
    dev: packTarball(join(repoRoot, 'packages/cairn-cms-dev'), destDir, runner),
  };
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
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  try {
    const archive = runner('git', ['archive', commit, '--', '.', ':!docs/internal/record', ':!docs/superpowers'], { cwd: repoRoot });
    if (archive.status !== 0) throw new Error(`git archive failed for ${commit}: ${archive.stderr}`);
    const extract = runner('tar', ['-x', '-C', dest], { cwd: dest, input: archive.stdout });
    if (extract.status !== 0) throw new Error(`tar extract failed for ${commit}: ${extract.stderr}`);
    assertNoExcludedPaths(dest);
  } catch (error) {
    rmSync(dest, { recursive: true, force: true });
    throw error;
  }
}
