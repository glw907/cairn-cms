// Sync the public glw907/cairn-waymark-template repo from this package's own bake output plus a
// small repo-only overlay (README, LICENSE, .dev.vars.example, the .gitignore negation). The
// template repo is generated wholesale: every sync regenerates the entire tree and commits the
// result as a normal commit (never a force push), so a hand edit to the template repo survives at
// most one sync. The sync never forks or re-implements the emit or prune logic; it reuses bake()
// from bake-template.mjs exactly the way the tool's own prepack step does.
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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

const TEMPLATE_REPO_HOST = 'github.com';

const ENGINE_PACKAGE = '@glw907/cairn-cms';
const DEV_BACKEND_PACKAGE = '@glw907/cairn-cms-dev';
const DEV_SCRIPT_NAME = 'dev';
const DEV_SHIM_RELATIVE_PATH = path.join('scripts', 'dev.mjs');

// bake() validates devSpec against the repo's own cairn-cms-dev version whenever the caller
// leaves it unset, and that version is 0.0.0 until the dev backend publishes. --strip-dev-backend
// deletes the devDependency entry entirely right after the bake, so the spec's actual value never
// reaches a commit; this placeholder only has to clear assertInstallableSpec's unpublished-version
// check, never resolve on a registry.
const STRIPPED_DEV_SPEC_PLACEHOLDER = '^0.0.1';

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
 * Build the environment overrides that carry a push credential to git's HTTP transport, in place
 * of embedding it in the remote URL. `GIT_CONFIG_COUNT`/`KEY_0`/`VALUE_0` set `http.extraheader`
 * for the one subprocess they are passed to, without writing anything to a config file: the
 * credential never appears in that subprocess's argv (readable by any local user via
 * `/proc/<pid>/cmdline`) or in a clone's persisted `.git/config` (the way an embedded-in-URL
 * credential does on both counts). A non-https remote (a local fixture path, used by every test
 * in this suite) needs no credential and returns no overrides.
 * @param {string} remote the remote about to be cloned or pushed to
 * @param {string | undefined} token the push credential, required only for an https remote
 * @returns {Record<string, string>} environment variables to merge into the git subprocess's env
 */
export function gitAuthEnv(remote, token) {
  if (!remote.startsWith('https://')) return {};
  if (!token) {
    throw new Error(
      'sync-template-repo: TEMPLATE_REPO_TOKEN is required to push to an https remote',
    );
  }
  const basicAuth = Buffer.from(`x-access-token:${token}`).toString('base64');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basicAuth}`,
  };
}

/**
 * Parse a remote spelling into the host and repo slug it names, for the https, http, ssh, and
 * scp-like (`user@host:owner/repo`) shapes a github.com remote can take. Returns `null` for
 * anything that is not one of those shapes, which this treats as a local filesystem path, the
 * one kind of remote a routine sync never restricts.
 * @param {string} remote the remote to parse
 * @returns {{ hostname: string, slug: string } | null} the parsed host and slug, or `null` for a
 *  local path
 */
function parseNetworkRemote(remote) {
  if (!remote.includes('://')) {
    const scpMatch = /^[^@/]+@([^:/]+):(.+?)(?:\.git)?$/.exec(remote);
    if (scpMatch) return { hostname: scpMatch[1], slug: scpMatch[2] };
  }
  let url;
  try {
    url = new URL(remote);
  } catch {
    return null;
  }
  if (!['https:', 'http:', 'ssh:', 'git:'].includes(url.protocol)) return null;
  return { hostname: url.hostname, slug: url.pathname.replace(/^\//, '').replace(/\.git$/, '') };
}

/**
 * Refuse a remote that names a github.com repo other than the template repo, unless the caller
 * opted in. This guards every shape a github.com remote can take (https, http, ssh, and the
 * scp-like `git@github.com:owner/repo` form a human or `gh repo clone` would type), not only
 * https, and it refuses a look-alike host the same as a slug mismatch: neither is the one
 * destination a routine sync is meant to reach, and the credential the sync composes for an https
 * push should never be handed to either. A local filesystem path is always allowed.
 * @param {string} remote the remote to check
 * @param {boolean} allowAnyRemote when true, any remote is allowed
 * @returns {void}
 */
export function assertRemoteAllowed(remote, allowAnyRemote) {
  const parsed = parseNetworkRemote(remote);
  if (!parsed) return;
  if (parsed.hostname === TEMPLATE_REPO_HOST && parsed.slug === TEMPLATE_REPO_SLUG) return;
  if (allowAnyRemote) return;
  throw new Error(
    `sync-template-repo: refusing remote "${remote}" (expected the template repo, ` +
      `"${TEMPLATE_REPO_HOST}/${TEMPLATE_REPO_SLUG}"); pass --allow-any-remote to sync a ` +
      'different repo',
  );
}

/**
 * Spawn one subprocess, capturing its output without routing through a shell. The shared idiom
 * behind every subprocess this module runs: git plumbing (via {@link runGit}), the default
 * registry resolver, and the default build check.
 * @param {string} cmd the command to run
 * @param {string[]} args the command's arguments
 * @param {string} cwd the working directory the command runs in
 * @param {Record<string, string>} [env] environment variables to merge on top of the inherited
 *  environment
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the exit code and
 *  captured output; a spawn-level failure (for example the command not on PATH) rejects instead
 */
function runCommand(cmd, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: false,
      env: env ? { ...process.env, ...env } : process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * Spawn one git command, capturing its output. See {@link runCommand}.
 * @param {string[]} args the git subcommand and its arguments
 * @param {string} cwd the working directory git runs in
 * @param {Record<string, string>} [env] environment variables to merge on top of the inherited
 *  environment, for example the credential overrides {@link gitAuthEnv} builds
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the exit code and
 *  captured output; a spawn-level failure (for example git not on PATH) rejects instead
 */
function runGit(args, cwd, env) {
  return runCommand('git', args, cwd, env);
}

/**
 * Run one git command, mirroring its (redacted) output through `log` and throwing a redacted
 * error on a non-zero exit.
 * @param {string[]} args the git subcommand and its arguments
 * @param {{
 *   cwd: string,
 *   log: (line: string) => void,
 *   token: string | undefined,
 *   mirror?: boolean,
 *   env?: Record<string, string>,
 * }} options `mirror` suppresses per-line logging for a plumbing call whose output is read
 *  programmatically rather than shown to an operator; it defaults to true. `env` carries the
 *  credential overrides for a clone or push against an https remote; every other call omits it.
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>} the captured result
 */
async function git(args, { cwd, log, token, mirror = true, env }) {
  const result = await runGit(args, cwd, env);
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
    switch (rule) {
      case 'replace':
        await writeFile(destPath, overlayContent);
        break;
      case 'append': {
        let base = '';
        try {
          base = await readFile(destPath, 'utf8');
        } catch {
          // No baked counterpart to append after; the overlay content stands alone.
        }
        const separator = base === '' || base.endsWith('\n') ? '' : '\n';
        await writeFile(destPath, base + separator + overlayContent);
        break;
      }
      default:
        throw new Error(
          `sync-template-repo: unknown overlay merge rule "${rule}" for ${relativePath}`,
        );
    }
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
  const specs = [
    [ENGINE_PACKAGE, pkg.dependencies?.[ENGINE_PACKAGE]],
    [DEV_BACKEND_PACKAGE, pkg.devDependencies?.[DEV_BACKEND_PACKAGE]],
  ].filter(([, spec]) => spec);
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

const BUILD_CHECK_OUTPUT_TAIL_LINES = 40;

/**
 * The last lines of a subprocess's combined stdout and stderr, short enough to paste into a
 * refusal message while still carrying the actual error (for example rolldown's
 * `MISSING_EXPORT` lines, which land well into a full build's output).
 * @param {string} stdout the subprocess's captured stdout
 * @param {string} stderr the subprocess's captured stderr
 * @returns {string} the tail, one line per entry, blank lines dropped
 */
function tailOutput(stdout, stderr) {
  const lines = `${stdout}\n${stderr}`.split('\n').filter((line) => line.length);
  return lines.slice(-BUILD_CHECK_OUTPUT_TAIL_LINES).join('\n');
}

/**
 * The default build check: copy the composed tree to a fresh temp directory, install its
 * dependencies for real, and build it. This proves the tree the sync is about to push actually
 * builds against the engine spec it emits, which registry resolvability alone cannot: a spec can
 * resolve to a real published version whose published code has not yet caught up to what the
 * checked-out tree imports (the gap a bake taken from an unpublished window can carry). Never
 * used by the suite (other than the test that exercises this function directly), which always
 * injects its own buildCheck so no other test pays for a real install and build.
 *
 * The install and build subprocesses run with `TEMPLATE_REPO_TOKEN` stripped from their
 * environment: neither step needs a git push credential, and this keeps a lifecycle script or
 * build step that happens to echo its environment from ever being able to leak it.
 * @param {string} sourceDir the composed tree to check
 * @returns {Promise<{ ok: boolean, output: string }>} whether the tree builds, and, on failure,
 *  enough of the failing command's own output to name the cause
 */
export async function defaultBuildCheck(sourceDir) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const checkDir = await mkdtemp(path.join(tmpdir(), 'cairn-sync-buildcheck-'));
  const buildEnv = { TEMPLATE_REPO_TOKEN: undefined };
  try {
    await cp(sourceDir, checkDir, { recursive: true });
    const install = await runCommand(
      npm,
      ['install', '--no-audit', '--no-fund'],
      checkDir,
      buildEnv,
    );
    if (install.code !== 0) {
      return { ok: false, output: tailOutput(install.stdout, install.stderr) };
    }
    const build = await runCommand(npm, ['run', 'build'], checkDir, buildEnv);
    if (build.code !== 0) {
      return { ok: false, output: tailOutput(build.stdout, build.stderr) };
    }
    return { ok: true, output: '' };
  } finally {
    await rm(checkDir, { recursive: true, force: true });
  }
}

/**
 * Prove the composed tree actually builds, and refuse the sync otherwise. Without `--verify-build`
 * this is called only once the sync already knows it has something to push (see the call site in
 * {@link syncTemplateRepo}): a no-op sync and a `--dry-run` both return before reaching this,
 * since a real install and build is too expensive to pay on every routine cron run or drift
 * check, and an idempotent run should stay cheap. `--verify-build` calls this unconditionally
 * instead, before either of those early returns.
 * @param {string} sourceDir the composed tree to check
 * @param {(sourceDir: string) => Promise<{ ok: boolean, output: string }>} buildCheck the
 *  injectable build check
 * @param {string | undefined} token the push credential, redacted out of the build output before
 *  it reaches a thrown error; a build's own output is otherwise the one place in this module that
 *  is not already routed through {@link redact}
 * @returns {Promise<void>}
 */
async function assertBuilds(sourceDir, buildCheck, token) {
  const result = await buildCheck(sourceDir);
  if (!result.ok) {
    throw new Error(
      'sync-template-repo: the composed tree does not build against its own emitted spec; ' +
        `publish the missing symbols or adjust the spec before syncing\n${redact(result.output, token)}`,
    );
  }
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
 *   buildCheck?: (sourceDir: string) => Promise<{ ok: boolean, output: string }>,
 *   verifyBuild?: boolean,
 *   log?: (line: string) => void,
 * }} options `token` defaults to `process.env.TEMPLATE_REPO_TOKEN`; `overlayDir` defaults to
 *  this package's own `template-repo/` skeleton; `resolveSpec` defaults to a real `npm view`
 *  call, meant to be overridden by every test. `buildCheck` defaults to a real install-and-build
 *  check ({@link defaultBuildCheck}), likewise meant to be overridden by every test. `verifyBuild`
 *  runs the build check unconditionally, including on a no-op or a `--dry-run`, for a
 *  buildability tripwire independent of drift; it defaults to false, which keeps the normal cost
 *  rule (the check only runs ahead of a real push) unchanged.
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
  buildCheck = defaultBuildCheck,
  verifyBuild = false,
  log = () => {},
}) {
  if (!remote) throw new Error('sync-template-repo: "remote" is required');
  assertRemoteAllowed(remote, allowAnyRemote);

  // --strip-dev-backend exists for syncing before the dev backend publishes, so a caller passing it
  // should not have to name a spec for the very thing they are removing. What the stand-in has to
  // satisfy is at STRIPPED_DEV_SPEC_PLACEHOLDER.
  const resolvedDevSpec = devSpec ?? (stripFlag ? STRIPPED_DEV_SPEC_PLACEHOLDER : undefined);

  const sourceDir = await mkdtemp(path.join(tmpdir(), 'cairn-sync-source-'));
  let workDir;
  try {
    await bake({ to: sourceDir, engineSpec, devSpec: resolvedDevSpec });
    await applyOverlay(sourceDir, overlayDir);
    if (stripFlag) await stripDevBackend(sourceDir);
    await assertResolvable(sourceDir, resolveSpec);

    // The credential rides an env-injected git config, never the remote URL: an embedded-in-URL
    // credential would appear in this subprocess's argv (world-readable via /proc/<pid>/cmdline)
    // and would persist in the clone's own .git/config for as long as the temp directory exists.
    const authEnv = gitAuthEnv(remote, token);
    workDir = await mkdtemp(path.join(tmpdir(), 'cairn-sync-work-'));
    await git(['clone', remote, workDir], { cwd: process.cwd(), log, token, env: authEnv });

    const { stdout: branchOutput } = await git(['branch', '--show-current'], {
      cwd: workDir,
      log,
      token,
      mirror: false,
    });
    const currentBranch = branchOutput.trim();
    if (currentBranch !== 'main') {
      // A `checkout -B main` on a remote whose default branch already carries commits would
      // create a brand-new `main` alongside it, push there, and return success, while the
      // remote's HEAD symref (what "Use this template" and a deploy button actually resolve)
      // stays on the untouched original branch. Only the unborn-branch case (a genuinely empty
      // remote, where there is nothing to diverge from) is safe to name `main` unconditionally.
      if ((await currentSha(workDir)) !== null) {
        throw new Error(
          `sync-template-repo: the remote's default branch is "${currentBranch}", not ` +
            '"main"; the sync only ever writes to main and refuses to create a second, divergent ' +
            'branch. Set the remote\'s default branch to main before syncing.',
        );
      }
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

    // --verify-build runs the check here, before either early return below, and independently of
    // whether there is any drift to push: the template repo can be perfectly in sync with the
    // bake and still stop building, because the published engine moved underneath it. Without the
    // flag the check stays where it always has, gated behind both early returns, so a plain no-op
    // or --dry-run still never pays for a real install and build.
    if (verifyBuild) await assertBuilds(sourceDir, buildCheck, token);

    if (changedFiles.length === 0) {
      log(`template repo up to date at ${previousSha} (no changes)`);
      return { status: 'no-op', sha: previousSha, changedFiles: [] };
    }

    if (dryRun) {
      log(`dry run: would sync ${changedFiles.length} file(s):`);
      for (const file of changedFiles) log(`  ${file.status} ${file.path}`);
      return { status: 'dry-run', sha: previousSha, changedFiles };
    }

    // The build check runs here, once a no-op sync and a --dry-run have both already returned
    // above: it proves the tree the sync is about to commit actually builds, which costs a real
    // install and build, so it is worth paying only when there is something real to push. An
    // idempotent cron run or a drift check stays cheap. --verify-build already ran the check
    // above, so it is skipped here to avoid paying for it twice in one invocation.
    if (!verifyBuild) await assertBuilds(sourceDir, buildCheck, token);

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
    await git(['push', remote, 'HEAD:main'], { cwd: workDir, log, token, env: authEnv });
    log(`synced template repo: commit ${sha} (${changedFiles.length} file(s) changed)`);
    return { status: 'synced', sha, changedFiles };
  } finally {
    await rm(sourceDir, { recursive: true, force: true });
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}

// CLI: node scripts/sync-template-repo.mjs --remote <url-or-path> [--dry-run]
//   [--strip-dev-backend] [--engine-spec <spec>] [--dev-spec <spec>] [--allow-any-remote]
//   [--verify-build]
if (import.meta.url === `file://${process.argv[1]}`) {
  const USAGE =
    'usage: sync-template-repo.mjs --remote <url-or-path> [--dry-run] [--strip-dev-backend] ' +
    '[--engine-spec <spec>] [--dev-spec <spec>] [--allow-any-remote] [--verify-build]';
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
        'verify-build': { type: 'boolean', default: false },
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
      verifyBuild: values['verify-build'],
      log: (line) => console.log(line),
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
