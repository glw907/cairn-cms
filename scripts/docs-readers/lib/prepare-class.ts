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
 * Pack this worktree into a tarball under a content-addressed name, so a second pack of changed
 * code can never collide with an npm-cached tarball at the same name, the trap
 * `scripts/lab/link-consumer.mjs` closes for the developer-facing consumer flow.
 * @param repoRoot - The engine checkout to build and pack.
 * @param destDir - Where the tarball lands.
 * @param runner - The command runner; overridden in tests.
 * @returns The packed tarball's absolute path.
 * @throws When the build or the pack fails.
 */
export function packEngineTarball(repoRoot: string, destDir: string, runner: CommandRunner = spawnRunner): string {
  mkdirSync(destDir, { recursive: true });
  const built = runner('npm', ['run', 'package'], { cwd: repoRoot });
  if (built.status !== 0) throw new Error(`npm run package failed: ${built.stderr}`);
  const packed = runner('npm', ['pack', '--pack-destination', destDir, '--silent'], { cwd: repoRoot });
  if (packed.status !== 0) throw new Error(`npm pack failed: ${packed.stderr}`);
  const name = decoder.decode(packed.stdout).trim().split('\n').pop();
  if (!name) throw new Error('npm pack produced no filename');
  const packedPath = join(destDir, name);
  const digest = createHash('sha256').update(readFileSync(packedPath)).digest('hex').slice(0, 12);
  const tarball = join(destDir, `${name.replace(/\.tgz$/, '')}-${digest}.tgz`);
  renameSync(packedPath, tarball);
  return tarball;
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

/** Paths a site scaffold's source tree never carries into a job: prior installs and the lockfile a fresh install writes its own version of. */
const SCAFFOLD_STRIP = /(^|[/\\])(node_modules|\.svelte-kit|dist|package-lock\.json)($|[/\\])/;

/**
 * Copy a working site into a job's scaffold directory and point its engine dependency at a packed
 * tarball, so installing it resolves this worktree's own build rather than a registry release.
 * `from` is a working cairn site to copy from, such as `examples/showcase`; `dest` is the
 * scaffold's destination; `tarball` is the packed engine tarball's absolute path; `packageName` is
 * the dependency name to repoint.
 */
export function scaffoldSite({
  from,
  dest,
  tarball,
  packageName = '@glw907/cairn-cms',
}: {
  from: string;
  dest: string;
  tarball: string;
  packageName?: string;
}): void {
  mkdirSync(dest, { recursive: true });
  cpSync(from, dest, { recursive: true, filter: (src) => !SCAFFOLD_STRIP.test(src) });
  const pkgPath = join(dest, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { dependencies?: Record<string, string> };
  pkg.dependencies = { ...pkg.dependencies, [packageName]: `file:${tarball}` };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

/**
 * Install a scaffolded site's dependencies from its pointed-at tarball, then strip the installed
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
 * and a scaffolded site with the engine installed from a packed tarball and its `docs/`,
 * `claude/`, and `skills/` directories gone. `sourceRoot` is the checkout the docs set is copied
 * from; `docsSet` is the pages the job's docs set names; `from` is the site to scaffold from;
 * `tarball` is the packed engine tarball's absolute path; `dest` is the prepared tree's root,
 * replaced if it already exists; `runner` is the command runner, overridden in tests.
 */
export function prepareDocsAndSite({
  sourceRoot,
  docsSet,
  from,
  tarball,
  dest,
  runner,
}: {
  sourceRoot: string;
  docsSet: string[];
  from: string;
  tarball: string;
  dest: string;
  runner?: CommandRunner;
}): void {
  rmSync(dest, { recursive: true, force: true });
  copyDocsSet(sourceRoot, docsSet, dest);
  const siteDir = join(dest, 'site');
  scaffoldSite({ from, dest: siteDir, tarball });
  installAndStrip(siteDir, { runner });
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
 * it nor `.git` survived, regardless of whether the pathspec worked. `repoRoot` is the checkout to
 * export from; `commit` is the commit-ish to export; `dest` is where the export lands, its
 * existing contents replaced; `runner` is the command runner, overridden in tests.
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
  const archive = runner('git', ['archive', commit, '--', '.', ':!docs/internal/record', ':!docs/superpowers'], { cwd: repoRoot });
  if (archive.status !== 0) throw new Error(`git archive failed for ${commit}: ${archive.stderr}`);
  const extract = runner('tar', ['-x', '-C', dest], { cwd: dest, input: archive.stdout });
  if (extract.status !== 0) throw new Error(`tar extract failed for ${commit}: ${extract.stderr}`);
  assertNoExcludedPaths(dest);
}
