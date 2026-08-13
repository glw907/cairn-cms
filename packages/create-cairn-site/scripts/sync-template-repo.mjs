// Sync the public glw907/cairn-waymark-template repo from this package's own bake output plus a
// small repo-only overlay (README, LICENSE, .dev.vars.example, the .gitignore negation). The
// template repo is generated wholesale: every sync regenerates the entire tree and commits the
// result as a normal commit (never a force push), so a hand edit to the template repo survives at
// most one sync. The sync never forks or re-implements the emit or prune logic; it reuses bake()
// from bake-template.mjs exactly the way the tool's own prepack step does.
import { spawn } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { bake } from './bake-template.mjs';
import { walk } from '../../../scripts/walk-files.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptsDir, '..');

/** The overlay skeleton this package ships beside the bake, versioned with the tool. */
export const OVERLAY_DIR = path.join(packageDir, 'template-repo');

/** The one github.com repo the sync is allowed to push to without `--allow-any-remote`. */
export const TEMPLATE_REPO_SLUG = 'glw907/cairn-waymark-template';

const DEV_BACKEND_PACKAGE = '@glw907/cairn-cms-dev';
const DEV_SCRIPT_NAME = 'dev';
const DEV_SHIM_RELATIVE_PATH = path.join('scripts', 'dev.mjs');

// The overlay's own merge-rule table. Every overlay file replaces its bake counterpart outright
// except a path listed here, which is merged instead. Today this holds exactly one entry: the
// .gitignore negation must land after the bake's own `.dev.vars.*` line, or the negation is a
// no-op. A future overlay file (for example a keyed package.json merge) adds a row here rather
// than a special case buried in the apply loop.
const OVERLAY_MERGE_RULES = { '.gitignore': 'append' };

const COMMIT_AUTHOR_NAME = 'cairn-template-sync';
const COMMIT_AUTHOR_EMAIL = 'cairn-template-sync@users.noreply.github.com';

/**
 * Strip every occurrence of a secret substring from a string, for logging and error messages
 * that might otherwise echo a credential embedded in a git remote URL or a subprocess's output.
 * @param {string} text the text to scrub
 * @param {string | undefined} token the secret to remove; a no-op when absent
 * @returns {string} `text` with every occurrence of `token` replaced by a redaction marker
 */
export function redact(text, token) {
  if (!token) return text;
  return text.split(token).join('[REDACTED]');
}

/**
 * Embed a push credential into an https remote URL, in the `x-access-token:<token>@host` shape
 * GitHub's own tooling uses for a PAT over HTTPS. A non-https remote (a local fixture path, used
 * by every test in this suite) is returned unchanged, since it carries no credential.
 * @param {string} remote the remote to push to
 * @param {string | undefined} token the push credential, required only for an https remote
 * @returns {string} the remote to actually clone and push against
 */
export function composeAuthenticatedRemote(remote, token) {
  if (!remote.startsWith('https://')) return remote;
  if (!token) {
    throw new Error(
      'sync-template-repo: TEMPLATE_REPO_TOKEN is required to push to an https remote',
    );
  }
  const url = new URL(remote);
  url.username = 'x-access-token';
  url.password = token;
  return url.toString();
}

/**
 * Refuse a github.com remote that is not the template repo, unless the caller opted in. A local
 * filesystem path, or an https remote on any other host, is always allowed; this only guards the
 * one destination a routine sync is meant to reach.
 * @param {string} remote the remote to check
 * @param {boolean} allowAnyRemote when true, any github.com remote is allowed
 * @returns {void}
 */
export function assertRemoteAllowed(remote, allowAnyRemote) {
  if (!remote.startsWith('https://')) return;
  const url = new URL(remote);
  if (url.hostname !== 'github.com') return;
  const slug = url.pathname.replace(/^\//, '').replace(/\.git$/, '');
  if (slug !== TEMPLATE_REPO_SLUG && !allowAnyRemote) {
    throw new Error(
      `sync-template-repo: refusing github.com remote "${slug}" (expected "${TEMPLATE_REPO_SLUG}"); ` +
        'pass --allow-any-remote to sync a different repo',
    );
  }
}

/**
 * Spawn one git command, capturing its output without routing through a shell.
 * @param {string[]} args the git subcommand and its arguments
 * @param {string} cwd the working directory git runs in
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the exit code and
 *  captured output; a spawn-level failure (for example git not on PATH) rejects instead
 */
function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * Run one git command, mirroring its (redacted) output through `log` and throwing a redacted
 * error on a non-zero exit.
 * @param {string[]} args the git subcommand and its arguments
 * @param {{ cwd: string, log: (line: string) => void, token: string | undefined, mirror?: boolean }} options
 *  `mirror` suppresses per-line logging for a plumbing call whose output is read programmatically
 *  rather than shown to an operator; it defaults to true
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the captured result
 */
async function git(args, { cwd, log, token, mirror = true }) {
  const result = await runGit(args, cwd);
  if (mirror) {
    for (const text of [result.stdout, result.stderr]) {
      for (const line of text.split('\n')) {
        if (line.length) log(redact(line, token));
      }
    }
  }
  if (result.code !== 0) {
    const redactedArgs = args.map((arg) => redact(arg, token)).join(' ');
    throw new Error(`sync-template-repo: git ${redactedArgs} failed (exit ${result.code})`);
  }
  return result;
}

/**
 * The current commit at `HEAD`, or `null` on an unborn branch (a freshly cloned, empty remote).
 * @param {string} cwd the git working directory
 * @returns {Promise<string | null>} the sha, or `null` when there is no commit yet
 */
async function currentSha(cwd) {
  const result = await runGit(['rev-parse', '--verify', 'HEAD'], cwd);
  return result.code === 0 ? result.stdout.trim() : null;
}

/**
 * Parse `git diff --name-status` output into a structured change list.
 * @param {string} output the raw `--name-status` output
 * @returns {{ status: string, path: string }[]} one entry per changed path
 */
function parseNameStatus(output) {
  return output
    .split('\n')
    .filter((line) => line.length)
    .map((line) => {
      const [status, ...rest] = line.split('\t');
      return { status, path: rest.join('\t') };
    });
}

/**
 * Apply the overlay onto a baked tree, replacing each overlay file's bake counterpart outright
 * except a path named in `OVERLAY_MERGE_RULES`, which is merged instead of replaced.
 * @param {string} sourceDir the baked tree, mutated in place
 * @param {string} overlayDir the overlay directory to apply
 * @returns {Promise<void>}
 */
async function applyOverlay(sourceDir, overlayDir) {
  const overlayFiles = walk(overlayDir, () => true);
  for (const overlayFile of overlayFiles) {
    const relativePath = path.relative(overlayDir, overlayFile);
    const destPath = path.join(sourceDir, relativePath);
    const overlayContent = await readFile(overlayFile, 'utf8');
    await mkdir(path.dirname(destPath), { recursive: true });
    const rule = OVERLAY_MERGE_RULES[relativePath] ?? 'replace';
    if (rule === 'replace') {
      await writeFile(destPath, overlayContent);
      continue;
    }
    if (rule === 'append') {
      let base = '';
      try {
        base = await readFile(destPath, 'utf8');
      } catch {
        // No baked counterpart to append after; the overlay content stands alone.
      }
      const separated = base === '' || base.endsWith('\n') ? base : `${base}\n`;
      await writeFile(destPath, separated + overlayContent);
      continue;
    }
    throw new Error(`sync-template-repo: unknown overlay merge rule "${rule}" for ${relativePath}`);
  }
}

/**
 * Remove the dev backend from a baked-and-overlaid tree: the `@glw907/cairn-cms-dev`
 * devDependency, the `dev` script, and the dev shim file. Every other file in the tree is left
 * untouched, so the stripped and unstripped trees stay byte-identical outside these three spots.
 * @param {string} sourceDir the tree to mutate in place
 * @returns {Promise<void>}
 */
async function stripDevBackend(sourceDir) {
  const packageJsonPath = path.join(sourceDir, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (pkg.devDependencies) delete pkg.devDependencies[DEV_BACKEND_PACKAGE];
  if (pkg.scripts) delete pkg.scripts[DEV_SCRIPT_NAME];
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  await rm(path.join(sourceDir, DEV_SHIM_RELATIVE_PATH), { force: true });
}

/**
 * Check the registry resolvability of every dependency spec the sync would emit for a package
 * this repo owns. Called before any git operation, so an unresolvable spec never reaches a
 * commit.
 * @param {string} sourceDir the tree whose package.json specs are checked
 * @param {(name: string, spec: string) => Promise<boolean>} resolveSpec the injectable resolver
 * @returns {Promise<void>}
 */
async function assertResolvable(sourceDir, resolveSpec) {
  const pkg = JSON.parse(await readFile(path.join(sourceDir, 'package.json'), 'utf8'));
  const specs = [];
  if (pkg.dependencies?.['@glw907/cairn-cms']) {
    specs.push(['@glw907/cairn-cms', pkg.dependencies['@glw907/cairn-cms']]);
  }
  if (pkg.devDependencies?.[DEV_BACKEND_PACKAGE]) {
    specs.push([DEV_BACKEND_PACKAGE, pkg.devDependencies[DEV_BACKEND_PACKAGE]]);
  }
  for (const [name, spec] of specs) {
    const resolvable = await resolveSpec(name, spec);
    if (!resolvable) {
      throw new Error(
        `sync-template-repo: ${name}@${spec} does not resolve on the registry; publish it or ` +
          'pass a different spec before syncing',
      );
    }
  }
}

/**
 * The default registry resolver: `npm view <name>@<spec> version`, treating any non-empty
 * result as resolvable. Never used by the suite, which always injects its own resolver so no
 * test touches the network.
 * @param {string} name the package name
 * @param {string} spec the version spec to check
 * @returns {Promise<boolean>} whether the registry has a version matching `spec`
 */
function defaultResolveSpec(name, spec) {
  return new Promise((resolve) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, ['view', `${name}@${spec}`, 'version'], { shell: false });
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0 && stdout.trim().length > 0));
  });
}

/**
 * Remove every entry from a git working directory except `.git`, so the next copy of the source
 * tree lands as the working directory's whole content rather than merging alongside whatever the
 * remote's `main` used to carry (a hand-edited file, a stray file, or a file the bake no longer
 * emits all disappear this way, without a bespoke case for each).
 * @param {string} workDir the git working directory to clear
 * @returns {Promise<void>}
 */
async function wipeWorkingTree(workDir) {
  const entries = await readdir(workDir);
  await Promise.all(
    entries
      .filter((entry) => entry !== '.git')
      .map((entry) => rm(path.join(workDir, entry), { recursive: true, force: true })),
  );
}

/**
 * @typedef {object} SyncResult
 * @property {'synced' | 'no-op' | 'dry-run'} status what the sync did
 * @property {string | null} sha the resulting commit sha (`synced`), the matched sha (`no-op`),
 *  or the current sha before any change (`dry-run`); `null` only when the remote has no commit
 *  yet and there is nothing to match
 * @property {{ status: string, path: string }[]} changedFiles the files that changed (or would
 *  change, for `dry-run`); empty for `no-op`
 */

/**
 * Sync the template repo at `remote` from a fresh bake plus the overlay. Reuses `bake()` for the
 * emit and prune logic; never forks or re-implements it.
 * @param {{
 *   remote: string,
 *   dryRun?: boolean,
 *   stripDevBackend?: boolean,
 *   engineSpec?: string,
 *   devSpec?: string,
 *   allowAnyRemote?: boolean,
 *   token?: string,
 *   overlayDir?: string,
 *   resolveSpec?: (name: string, spec: string) => Promise<boolean>,
 *   log?: (line: string) => void,
 * }} options `token` defaults to `process.env.TEMPLATE_REPO_TOKEN`; `overlayDir` defaults to
 *  this package's own `template-repo/` skeleton; `resolveSpec` defaults to a real `npm view`
 *  call, meant to be overridden by every test.
 * @returns {Promise<SyncResult>}
 */
export async function syncTemplateRepo({
  remote,
  dryRun = false,
  stripDevBackend: stripFlag = false,
  engineSpec,
  devSpec,
  allowAnyRemote = false,
  token = process.env.TEMPLATE_REPO_TOKEN,
  overlayDir = OVERLAY_DIR,
  resolveSpec = defaultResolveSpec,
  log = () => {},
}) {
  if (!remote) throw new Error('sync-template-repo: "remote" is required');
  assertRemoteAllowed(remote, allowAnyRemote);

  const sourceDir = await mkdtemp(path.join(tmpdir(), 'cairn-sync-source-'));
  let workDir;
  try {
    await bake({ to: sourceDir, engineSpec, devSpec });
    await applyOverlay(sourceDir, overlayDir);
    if (stripFlag) await stripDevBackend(sourceDir);
    await assertResolvable(sourceDir, resolveSpec);

    const authenticatedRemote = composeAuthenticatedRemote(remote, token);
    workDir = await mkdtemp(path.join(tmpdir(), 'cairn-sync-work-'));
    await git(['clone', authenticatedRemote, workDir], { cwd: process.cwd(), log, token });

    const { stdout: currentBranch } = await git(['branch', '--show-current'], {
      cwd: workDir,
      log,
      token,
      mirror: false,
    });
    if (currentBranch.trim() !== 'main') {
      await git(['checkout', '-B', 'main'], { cwd: workDir, log, token });
    }

    const previousSha = await currentSha(workDir);

    await wipeWorkingTree(workDir);
    await cp(sourceDir, workDir, { recursive: true });
    await git(['add', '-A'], { cwd: workDir, log, token, mirror: false });
    const { stdout: diffOutput } = await git(
      ['diff', '--cached', '--name-status', '--no-renames'],
      { cwd: workDir, log, token, mirror: false },
    );
    const changedFiles = parseNameStatus(diffOutput);

    if (changedFiles.length === 0) {
      log(`template repo up to date at ${previousSha} (no changes)`);
      return { status: 'no-op', sha: previousSha, changedFiles: [] };
    }

    if (dryRun) {
      log(`dry run: would sync ${changedFiles.length} file(s):`);
      for (const file of changedFiles) log(`  ${file.status} ${file.path}`);
      return { status: 'dry-run', sha: previousSha, changedFiles };
    }

    await git(
      [
        '-c',
        `user.name=${COMMIT_AUTHOR_NAME}`,
        '-c',
        `user.email=${COMMIT_AUTHOR_EMAIL}`,
        'commit',
        '-m',
        'Sync generated template tree',
      ],
      { cwd: workDir, log, token },
    );
    const sha = await currentSha(workDir);
    await git(['push', authenticatedRemote, 'HEAD:main'], { cwd: workDir, log, token });
    log(`synced template repo: commit ${sha} (${changedFiles.length} file(s) changed)`);
    return { status: 'synced', sha, changedFiles };
  } finally {
    await rm(sourceDir, { recursive: true, force: true });
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}

// CLI: node scripts/sync-template-repo.mjs --remote <url-or-path> [--dry-run]
//   [--strip-dev-backend] [--engine-spec <spec>] [--dev-spec <spec>] [--allow-any-remote]
if (import.meta.url === `file://${process.argv[1]}`) {
  const USAGE =
    'usage: sync-template-repo.mjs --remote <url-or-path> [--dry-run] [--strip-dev-backend] ' +
    '[--engine-spec <spec>] [--dev-spec <spec>] [--allow-any-remote]';
  let values;
  try {
    ({ values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        remote: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        'strip-dev-backend': { type: 'boolean', default: false },
        'engine-spec': { type: 'string' },
        'dev-spec': { type: 'string' },
        'allow-any-remote': { type: 'boolean', default: false },
      },
      strict: true,
    }));
  } catch (err) {
    console.error(`sync-template-repo: ${err.message}`);
    console.error(USAGE);
    process.exit(1);
  }
  if (!values.remote) {
    console.error(USAGE);
    process.exit(1);
  }
  try {
    await syncTemplateRepo({
      remote: values.remote,
      dryRun: values['dry-run'],
      stripDevBackend: values['strip-dev-backend'],
      engineSpec: values['engine-spec'],
      devSpec: values['dev-spec'],
      allowAnyRemote: values['allow-any-remote'],
      log: (line) => console.log(line),
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
