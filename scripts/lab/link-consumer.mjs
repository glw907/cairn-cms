// cairn-cms: point a consumer site at a local engine build, and put it back on the registry.
//
// A consumer that needs to build against unreleased engine work (cairn-pub proving a docs page
// against a new export, a site testing a fix before it publishes) has to build, pack, carry the
// tarball over, and install it by path. Doing that by hand walks into a trap the workstation notes
// record: `npm pack` names the tarball from the version, so a second pack of changed code produces
// the SAME filename, and npm's content-addressed cache serves the OLD build back. The install exits
// 0 and the change appears to do nothing.
//
// This script closes that structurally rather than by remembering a workaround. Each pack is named
// with a hash of its own contents, so changed code cannot collide with a cached entry, and the
// install is verified against the extracted tarball afterwards rather than trusted because npm
// exited 0.
//
// Usage:
//   node scripts/lab/link-consumer.mjs <consumer-dir>              build, pack, install, verify
//   node scripts/lab/link-consumer.mjs <consumer-dir> --restore    put it back on a registry range
//   node scripts/lab/link-consumer.mjs <consumer-dir> --skip-build reuse the dist already built
//
// Restoring is the un-pin half, and it matters as much as the pin: a branch carrying a `file:` path
// cannot merge, so the loop needs to be cheap in both directions.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { repoRoot } from '../repo-root.mjs';
import { walk } from '../walk-files.mjs';

const ROOT = repoRoot(import.meta.url);

/** Where packed tarballs are kept, outside every repo so none of them can commit one. */
const SCRATCH = path.join(path.dirname(ROOT), 'cairn-scratch');

/** How many packed tarballs to keep before pruning the oldest. */
const KEEP_TARBALLS = 3;

/** The two packages a consumer can be pointed at, engine first. */
const PACKAGES = ['@glw907/cairn-cms', '@glw907/cairn-cms-dev'];

/**
 * What follows the package stem in a tarball this script wrote: a version, then the content digest
 * it appends. Pruning matches on this so it can only ever delete its own output.
 *
 * A hand-packed tarball has no digest and so never matches, which is the point. cairn-pub pins
 * `glw907-cairn-cms-0.95.0-rc.1.tgz` by absolute path, and a prune that swept it would break that
 * repo's install with no signal here. The stem alone is not enough to be safe either, since
 * `glw907-cairn-cms-` is a prefix of `glw907-cairn-cms-dev-`.
 */
const OWN_TARBALL = /^\d[^/]*-[0-9a-f]{12}\.tgz$/;

/**
 * Directories extracted for verification, removed when the process ends however it ends.
 *
 * `fail` reaches for `process.exit`, which skips every pending `finally`, so a `try`/`finally`
 * around an extraction would clean up on success and leak on exactly the runs that fail. An exit
 * listener runs on both paths.
 * @type {string[]}
 */
const extracted = [];

process.on('exit', () => {
  for (const dir of extracted) rmSync(dir, { recursive: true, force: true });
});

/**
 * Print a message and exit non-zero.
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`link-consumer: ${message}`);
  process.exit(1);
}

/**
 * Run a command, streaming its output, and fail the script when it does.
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {void}
 */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) fail(`${command} could not be run: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed (exit ${result.status}) in ${cwd}`);
  }
}

/**
 * Run a command and capture its stdout.
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string} trimmed stdout
 */
function capture(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
  if (result.error) fail(`${command} could not be run: ${result.error.message}`);
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed (exit ${result.status}): ${result.stderr}`);
  }
  return result.stdout.trim();
}

/**
 * Read a JSON file.
 * @param {string} file
 * @returns {any}
 */
function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Expand a leading `~` against `HOME`.
 *
 * A shell expands an unquoted `~` before this ever runs, so what arrives here is the quoted form.
 * Only a bare `~` and a `~/` prefix are a home reference: `~other/site` names another user's home,
 * which `HOME` cannot answer, and rewriting its prefix would invent a path that silently resolves
 * somewhere else.
 * @param {string} target
 * @returns {string}
 */
function expandHome(target) {
  const home = process.env.HOME;
  if (!home) return target;
  if (target === '~') return home;
  if (target.startsWith('~/')) return path.join(home, target.slice(2));
  return target;
}

/**
 * Which of the engine packages a consumer actually depends on, so pointing a site at a local build
 * never adds a dependency it had not declared for itself.
 * @param {string} consumerDir
 * @returns {string[]} package names, in `PACKAGES` order
 */
function consumerPackages(consumerDir) {
  const pkg = readJson(path.join(consumerDir, 'package.json'));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = PACKAGES.filter((name) => name in declared);
  if (found.length === 0) {
    fail(`${consumerDir} declares neither ${PACKAGES.join(' nor ')}; is it a cairn consumer?`);
  }
  return found;
}

/**
 * The directory holding a package's manifest, since the dev backend is a workspace of its own.
 * @param {string} name
 * @returns {string}
 */
function packageDirFor(name) {
  return name.endsWith('-dev') ? path.join(ROOT, 'packages/cairn-cms-dev') : ROOT;
}

/**
 * The filename stem a package's tarballs carry, which packing and pruning have to agree on.
 * @param {string} name
 * @returns {string}
 */
function tarballSlug(name) {
  return name.replace('@', '').replace('/', '-');
}

/**
 * Pack a workspace into the scratch directory under a content-addressed name.
 *
 * The rename is the whole point: `npm pack` writes a version-derived filename, so packing changed
 * code twice at one version yields one name and npm's cache serves the first build back forever.
 * @param {string} name the package name to pack
 * @param {string} packageDir the directory holding its package.json
 * @returns {string} the absolute tarball path
 */
function packToScratch(name, packageDir) {
  mkdirSync(SCRATCH, { recursive: true });
  const version = readJson(path.join(packageDir, 'package.json')).version;
  const packed = capture('npm', ['pack', '--pack-destination', SCRATCH, '--silent'], packageDir)
    .split('\n')
    .pop()
    .trim();
  const packedPath = path.join(SCRATCH, packed);
  const digest = createHash('sha256').update(readFileSync(packedPath)).digest('hex').slice(0, 12);
  const tarball = path.join(SCRATCH, `${tarballSlug(name)}-${version}-${digest}.tgz`);
  renameSync(packedPath, tarball);
  return tarball;
}

/**
 * Extract a tarball into a scratch directory and return its `package/` root.
 * @param {string} tarball
 * @returns {string}
 */
function extract(tarball) {
  const into = mkdtempSync(path.join(tmpdir(), 'link-consumer-'));
  extracted.push(into);
  run('tar', ['xzf', tarball, '-C', into], into);
  return path.join(into, 'package');
}

/**
 * Confirm the consumer's installed copy is byte-for-byte the tarball just built.
 *
 * This is the check the cache trap defeats, so it compares real file contents rather than reading a
 * version number or trusting npm's exit code: a stale cache hit reports the same version and exits
 * 0 while serving different bytes.
 * @param {string} name the installed package name
 * @param {string} tarball the tarball that should be installed
 * @param {string} consumerDir
 * @returns {number} how many files were compared
 */
function verifyInstalled(name, tarball, consumerDir) {
  const installed = path.join(consumerDir, 'node_modules', ...name.split('/'));
  if (!statSync(installed, { throwIfNoEntry: false })?.isDirectory()) {
    fail(`${name} is not installed in ${consumerDir} after the install reported success`);
  }
  const packedRoot = extract(tarball);
  let compared = 0;
  for (const file of walk(packedRoot, () => true)) {
    const relative = path.relative(packedRoot, file);
    const counterpart = path.join(installed, relative);
    const there = statSync(counterpart, { throwIfNoEntry: false });
    if (!there) fail(`${name}: ${relative} is in the tarball but missing from the install`);
    if (!readFileSync(counterpart).equals(readFileSync(file))) {
      fail(
        `${name}: ${relative} differs between the tarball and the install. ` +
          'npm served a cached build; delete node_modules in the consumer and rerun.'
      );
    }
    compared += 1;
  }
  return compared;
}

/**
 * Delete all but the newest `KEEP_TARBALLS` packs of one package, so the scratch directory does not
 * grow a tarball per build forever.
 *
 * A slug is a prefix of the dev package's slug, so the match also requires the version digit that
 * follows it. Without that, pruning the engine sweeps `-dev` tarballs into its own count and
 * deletes builds the next `--skip-build` run still wants.
 * @param {string} name
 * @returns {number} how many were removed
 */
function pruneOldTarballs(name) {
  const prefix = `${tarballSlug(name)}-`;
  const mine = readdirSync(SCRATCH)
    .filter((f) => f.startsWith(prefix) && OWN_TARBALL.test(f.slice(prefix.length)))
    .map((f) => ({ file: f, mtime: statSync(path.join(SCRATCH, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const stale = mine.slice(KEEP_TARBALLS);
  for (const { file } of stale) rmSync(path.join(SCRATCH, file), { force: true });
  return stale.length;
}

/**
 * Build, pack, install, and verify: point the consumer at this working tree.
 * @param {string} consumerDir
 * @param {string[]} names the packages the consumer declares
 * @param {boolean} skipBuild reuse the dist already built
 * @returns {void}
 */
function link(consumerDir, names, skipBuild) {
  if (!skipBuild) run('npm', ['run', 'package'], ROOT);

  const packed = names.map((name) => ({ name, tarball: packToScratch(name, packageDirFor(name)) }));

  run('npm', ['install', '--no-audit', '--no-fund', ...packed.map(({ tarball }) => tarball)], consumerDir);

  for (const { name, tarball } of packed) {
    const compared = verifyInstalled(name, tarball, consumerDir);
    console.log(`link-consumer: ${name} verified, ${compared} files match the tarball`);
    const pruned = pruneOldTarballs(name);
    if (pruned > 0) console.log(`link-consumer: pruned ${pruned} older ${name} tarball(s)`);
  }

  console.log(`link-consumer: ${consumerDir} now builds against this working tree.`);
  console.log('link-consumer: run with --restore before merging, since a file: path cannot merge.');
}

/**
 * Put the consumer back on a registry range, and prove the lockfile agrees.
 *
 * The range comes from this repo's own version, so a consumer comes back onto the line the engine
 * is actually on rather than whatever it was pinned at before.
 * @param {string} consumerDir
 * @param {string[]} names the packages the consumer declares
 * @returns {void}
 */
function restore(consumerDir, names) {
  const version = readJson(path.join(ROOT, 'package.json')).version;
  const specs = names.map((name) => `${name}@^${version}`);
  console.log(`link-consumer: restoring ${consumerDir} to ${specs.join(' and ')}`);
  run('npm', ['install', '--no-audit', '--no-fund', ...specs], consumerDir);

  const lock = readJson(path.join(consumerDir, 'package-lock.json'));
  for (const name of names) {
    const entry = lock.packages?.[`node_modules/${name}`];
    if (!entry?.resolved?.startsWith('https://')) {
      fail(`${name} still resolves to ${entry?.resolved ?? 'nothing'}; expected a registry URL`);
    }
  }
  console.log('link-consumer: OK, every cairn dependency resolves from the registry and the branch can merge');
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    restore: { type: 'boolean', default: false },
    'skip-build': { type: 'boolean', default: false },
  },
});

const [consumerArg] = positionals;
if (!consumerArg) {
  fail('a consumer directory is required, for example: npm run link:consumer -- ~/Projects/cairn-pub');
}
const consumerDir = path.resolve(expandHome(consumerArg));
if (!statSync(path.join(consumerDir, 'package.json'), { throwIfNoEntry: false })) {
  fail(`${consumerDir} has no package.json`);
}

const names = consumerPackages(consumerDir);

if (values.restore) {
  restore(consumerDir, names);
} else {
  link(consumerDir, names, values['skip-build']);
}
