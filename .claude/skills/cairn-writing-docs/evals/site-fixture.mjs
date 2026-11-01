// cairn-cms: the site fixture for the site suite. It builds, once per arm, an emitted site the way
// `.github/workflows/scaffold.yml` does: pack the engine and the dev backend at the arm's ref, emit
// the template with `file:` specs, install, and run `cairn-guidance install`. A strip list removes
// paths from the engine tarball first, which is how the ablation arm loses the technical docs.
// The built site is cached by ref and strip list; a trial copies it, hard-linking `node_modules`.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Run a command to completion, returning stdout; a failure carries the command's stderr. */
async function sh(command, args, cwd, timeout = 15 * 60 * 1000) {
  try {
    const r = await run(command, args, { cwd, timeout, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
    return r.stdout;
  } catch (e) {
    throw new Error(`${command} ${args.join(' ').slice(0, 160)} failed in ${cwd}: ${(e.stderr || e.message).toString().trim().slice(-1500)}`);
  }
}

/**
 * The paths a strip list file names: one package-relative path per line, blank lines and `#`
 * comments ignored.
 * @param {string} file
 * @returns {string[]}
 */
export function readStripList(file) {
  return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

/** A short hash of a strip list, so a stripped arm caches apart from the whole one. */
export function stripKey(paths) {
  return paths.length ? createHash('sha256').update([...paths].sort().join('\n')).digest('hex').slice(0, 8) : '';
}

/** Pack a directory's package into `dest`, returning the tarball path. `prepare` builds it. */
async function pack(cwd, target, dest) {
  const args = ['pack', '--silent', '--pack-destination', dest];
  if (target) args.splice(1, 0, target);
  const out = (await sh('npm', args, cwd)).trim().split('\n').pop();
  return join(dest, out);
}

/** Repack an engine tarball without the listed paths, using the caller's `strip` on the unpacked folder. */
async function stripTarball(tgz, paths, strip, out) {
  const tmp = mkdtempSync(join(tmpdir(), 'evals-strip-'));
  try {
    await sh('tar', ['-xzf', tgz, '-C', tmp], tmp);
    const removed = strip(join(tmp, 'package'), paths);
    await sh('tar', ['-czf', out, '-C', tmp, 'package'], tmp);
    return removed;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Build, or find cached, the emitted site for one arm.
 * @param {{ treeDir: string, sha: string, cacheRoot: string, strip: string[], stripPathsFn: (dir: string, paths: string[]) => string[] }} a
 *   `treeDir` is a prepared checkout of the arm's ref (with `node_modules`).
 * @returns {Promise<{ dir: string, removed: string[] }>} the built site folder
 */
export async function buildSiteBase({ treeDir, sha, cacheRoot, strip, stripPathsFn }) {
  const key = `${sha.slice(0, 12)}${strip.length ? `-${stripKey(strip)}` : ''}`;
  const dir = join(cacheRoot, `site-${key}`);
  const marker = join(dir, '.ready');
  if (existsSync(marker)) return { dir, removed: JSON.parse(readFileSync(marker, 'utf8')).removed };
  mkdirSync(cacheRoot, { recursive: true });
  const work = join(cacheRoot, `site-${key}.building`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const packs = join(work, 'packs');
  mkdirSync(packs);
  let engine = await pack(treeDir, null, packs);
  const dev = await pack(treeDir, './packages/cairn-cms-dev', packs);
  let removed = [];
  if (strip.length) {
    const stripped = join(packs, 'engine-stripped.tgz');
    removed = await stripTarball(engine, strip, stripPathsFn, stripped);
    engine = stripped;
  }
  const site = join(work, 'site');
  await sh('node', [join(treeDir, 'scripts/build/emit-template.mjs'), site, `file:${engine}`, `file:${dev}`, 'emitted-site'], treeDir);
  await sh('npm', ['install'], site, 20 * 60 * 1000);
  await sh('npx', ['cairn-guidance', 'install'], site);
  writeFileSync(join(work, '.ready'), JSON.stringify({ removed }));
  rmSync(dir, { recursive: true, force: true });
  renameSync(work, dir);
  return { dir, removed };
}

/**
 * Copy a built site into a trial's folder: everything but `node_modules` by copy, and
 * `node_modules` by hard link, so a trial starts in seconds.
 * @param {string} baseDir the cached build
 * @param {string} root the trial's folder, created here
 */
export async function copySite(baseDir, root) {
  const site = join(baseDir, 'site');
  cpSync(site, root, { recursive: true, filter: (src) => !/(^|\/)node_modules$/.test(src) });
  await sh('cp', ['-al', join(site, 'node_modules'), join(root, 'node_modules')], baseDir);
}
