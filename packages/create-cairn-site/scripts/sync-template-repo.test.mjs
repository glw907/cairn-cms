import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bake } from './bake-template.mjs';
import {
  OVERLAY_DIR,
  TEMPLATE_REPO_SLUG,
  assertRemoteAllowed,
  composeAuthenticatedRemote,
  redact,
  syncTemplateRepo,
} from './sync-template-repo.mjs';

// Published specs, so the suite never depends on what the monorepo's own versions happen to be
// (the same discipline bake-template.test.mjs uses).
const FIXTURE_OPTIONS = { engineSpec: '^0.94.0', devSpec: '^0.1.0', resolveSpec: async () => true };

/**
 * A temp directory removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} prefix the mkdtemp prefix
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempDir(t, prefix) {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Run one git command against a fixture, without going through the script under test. Every
 * "plant a change directly on the remote" step in this suite uses this, never the script's own
 * git plumbing, so the positive controls prove something the sync did not itself produce.
 * @param {string[]} args the git subcommand and its arguments
 * @param {string} cwd the working directory
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
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
 * The same as {@link runGit}, but throws on a non-zero exit, for fixture setup steps that must
 * succeed.
 * @param {string[]} args the git subcommand and its arguments
 * @param {string} cwd the working directory
 * @returns {Promise<string>} the command's stdout
 */
async function git(args, cwd) {
  const result = await runGit(args, cwd);
  if (result.code !== 0) {
    throw new Error(`fixture git ${args.join(' ')} failed in ${cwd}: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/**
 * A fresh local bare repo, the sync target every test in this suite pushes to. No network, no
 * GitHub: this is what "local bare-repo fixture" means throughout the suite.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the bare repo's absolute path
 */
async function createBareRemote(t) {
  const dir = await tempDir(t, 'cairn-sync-remote-');
  await git(['init', '--bare', '--initial-branch=main', dir], process.cwd());
  return dir;
}

/**
 * Clone a fixture remote to a fresh temp directory, for reading back what the sync (or a plant)
 * actually pushed.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} remote the remote to clone
 * @returns {Promise<string>} the clone's absolute path
 */
async function cloneRemote(t, remote) {
  const dir = await tempDir(t, 'cairn-sync-checkout-');
  await git(['clone', remote, dir], process.cwd());
  return dir;
}

/**
 * The sha `refs/heads/main` currently points at on a bare fixture remote, read directly (no
 * clone), or `null` when the ref does not exist yet.
 * @param {string} remote the bare repo's path
 * @returns {Promise<string | null>}
 */
async function remoteSha(remote) {
  const result = await runGit(['rev-parse', 'refs/heads/main'], remote);
  return result.code === 0 ? result.stdout.trim() : null;
}

/**
 * The number of commits reachable from `refs/heads/main` on a bare fixture remote, or 0 when
 * the ref does not exist yet.
 * @param {string} remote the bare repo's path
 * @returns {Promise<number>}
 */
async function remoteCommitCount(remote) {
  const result = await runGit(['rev-list', '--count', 'refs/heads/main'], remote);
  return result.code === 0 ? Number(result.stdout.trim()) : 0;
}

/**
 * Clone a fixture remote, apply `mutate` to the working copy, and push the result as a normal
 * commit, directly through git rather than the script under test. This is how the suite plants
 * a hand edit on the remote's `main` ahead of a sync.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} remote the remote to mutate
 * @param {(work: string) => Promise<void>} mutate edits the cloned working copy in place
 * @returns {Promise<void>}
 */
async function plantCommit(t, remote, mutate) {
  const work = await cloneRemote(t, remote);
  await mutate(work);
  await git(['add', '-A'], work);
  await git(['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.com', 'commit', '-m', 'hand edit'], work);
  await git(['push', 'origin', 'HEAD:main'], work);
}

/**
 * Every file path under `dir` (recursive), relative to `dir`, excluding `.git`.
 * @param {string} dir the directory to list
 * @param {string} [base] the base every returned path is relative to
 * @returns {Promise<string[]>}
 */
async function listFiles(dir, base = dir) {
  let out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(await listFiles(full, base));
    else out.push(path.relative(base, full));
  }
  return out;
}

test('a first sync produces one commit whose tree is bake output plus overlay', async (t) => {
  const remote = await createBareRemote(t);
  const oracleDir = await tempDir(t, 'cairn-sync-oracle-');
  await bake({ to: oracleDir, ...FIXTURE_OPTIONS });
  const bakedFileCount = (await listFiles(oracleDir)).length;

  const result = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(result.status, 'synced');
  assert.equal(await remoteCommitCount(remote), 1);

  const checkout = await cloneRemote(t, remote);
  await access(path.join(checkout, 'wrangler.jsonc'));
  const pkg = JSON.parse(await readFile(path.join(checkout, 'package.json'), 'utf8'));
  assert.match(pkg.dependencies['@glw907/cairn-cms'], /^\^\d+\.\d+\.\d+$/);
  const syncedFileCount = (await listFiles(checkout)).length;
  assert.ok(
    syncedFileCount >= bakedFileCount,
    `expected the synced tree (${syncedFileCount} files) to carry at least the bake's own file count (${bakedFileCount})`,
  );
  const readme = await readFile(path.join(checkout, 'README.md'), 'utf8');
  assert.ok(!readme.includes('This site runs on'), 'the bake SITE_README no longer stands');
  assert.ok(readme.includes('generated'), 'the overlay README replaced it');
});

test('idempotence: a second sync makes no commit and prints the no-op line naming the matched sha', async (t) => {
  const remote = await createBareRemote(t);
  const first = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(first.status, 'synced');

  const logs = [];
  const second = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: (line) => logs.push(line) });
  assert.equal(second.status, 'no-op');
  assert.equal(await remoteCommitCount(remote), 1);
  assert.ok(logs.some((line) => line.includes(first.sha)), 'the no-op line names the matched sha');
  assert.ok(logs.some((line) => /no changes/i.test(line)), 'the no-op line is distinct from a sync line');
});

test('the hand-edit trio is corrected by one sync, with history growing by exactly one commit', async (t) => {
  const remote = await createBareRemote(t);
  await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });

  await plantCommit(t, remote, async (work) => {
    const wranglerPath = path.join(work, 'wrangler.jsonc');
    const original = await readFile(wranglerPath, 'utf8');
    await writeFile(wranglerPath, `${original}\n// hand edit\n`);
    await writeFile(path.join(work, 'stray.txt'), 'should not survive a sync\n');
    await rm(path.join(work, 'LICENSE'));
  });

  // Positive control: the trio is actually present before the sync runs, so a no-op sync could
  // not accidentally pass this test.
  const preSyncCheckout = await cloneRemote(t, remote);
  assert.ok((await readFile(path.join(preSyncCheckout, 'wrangler.jsonc'), 'utf8')).includes('hand edit'));
  await access(path.join(preSyncCheckout, 'stray.txt'));
  await assert.rejects(() => access(path.join(preSyncCheckout, 'LICENSE')));

  const shaAfterPlant = await remoteSha(remote);
  const countAfterPlant = await remoteCommitCount(remote);

  const result = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(result.status, 'synced');

  const postSyncCheckout = await cloneRemote(t, remote);
  assert.ok(!(await readFile(path.join(postSyncCheckout, 'wrangler.jsonc'), 'utf8')).includes('hand edit'));
  await assert.rejects(() => access(path.join(postSyncCheckout, 'stray.txt')));
  await access(path.join(postSyncCheckout, 'LICENSE'));

  assert.equal(await remoteCommitCount(remote), countAfterPlant + 1);
  const ancestorCheck = await runGit(['merge-base', '--is-ancestor', shaAfterPlant, 'HEAD'], postSyncCheckout);
  assert.equal(ancestorCheck.code, 0, 'the pre-sync sha is still an ancestor of the new HEAD');
});

test('an overlay edit lands as a second commit that carries the change', async (t) => {
  const remote = await createBareRemote(t);
  const overlayDir = await tempDir(t, 'cairn-sync-overlay-');
  await writeFile(path.join(overlayDir, 'MARKER.txt'), 'v1\n');

  const first = await syncTemplateRepo({ remote, overlayDir, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(first.status, 'synced');

  await writeFile(path.join(overlayDir, 'MARKER.txt'), 'v2\n');
  const second = await syncTemplateRepo({ remote, overlayDir, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(second.status, 'synced');
  assert.notEqual(second.sha, first.sha);

  const checkout = await cloneRemote(t, remote);
  assert.equal(await readFile(path.join(checkout, 'MARKER.txt'), 'utf8'), 'v2\n');
});

test('--dry-run names the files it would change and pushes nothing; a real run then touches exactly that set', async (t) => {
  const remote = await createBareRemote(t);
  const shaBefore = await remoteSha(remote);

  const logs = [];
  const dry = await syncTemplateRepo({
    remote,
    dryRun: true,
    ...FIXTURE_OPTIONS,
    log: (line) => logs.push(line),
  });
  assert.equal(dry.status, 'dry-run');
  assert.ok(dry.changedFiles.length > 0);
  assert.equal(await remoteSha(remote), shaBefore, 'the remote ref is unmoved by a dry run');
  for (const file of dry.changedFiles) {
    assert.ok(logs.some((line) => line.includes(file.path)), `dry run names ${file.path}`);
  }

  const real = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(real.status, 'synced');
  const dryPaths = new Set(dry.changedFiles.map((file) => file.path));
  const realPaths = new Set(real.changedFiles.map((file) => file.path));
  assert.deepEqual(realPaths, dryPaths);
});

test('--strip-dev-backend removes the dev backend and leaves every other file byte-identical', async (t) => {
  const strippedRemote = await createBareRemote(t);
  const unstrippedRemote = await createBareRemote(t);
  await syncTemplateRepo({ remote: strippedRemote, stripDevBackend: true, ...FIXTURE_OPTIONS, log: () => {} });
  await syncTemplateRepo({ remote: unstrippedRemote, ...FIXTURE_OPTIONS, log: () => {} });

  const strippedCheckout = await cloneRemote(t, strippedRemote);
  const unstrippedCheckout = await cloneRemote(t, unstrippedRemote);

  const strippedPkg = JSON.parse(await readFile(path.join(strippedCheckout, 'package.json'), 'utf8'));
  assert.ok(!strippedPkg.devDependencies || !('@glw907/cairn-cms-dev' in strippedPkg.devDependencies));
  assert.ok(!strippedPkg.scripts?.dev);
  await assert.rejects(() => access(path.join(strippedCheckout, 'scripts', 'dev.mjs')));

  const unstrippedPkg = JSON.parse(await readFile(path.join(unstrippedCheckout, 'package.json'), 'utf8'));
  assert.ok('@glw907/cairn-cms-dev' in unstrippedPkg.devDependencies);
  assert.equal(unstrippedPkg.scripts.dev, 'node scripts/dev.mjs');
  await access(path.join(unstrippedCheckout, 'scripts', 'dev.mjs'));

  const exceptions = new Set(['package.json', path.join('scripts', 'dev.mjs')]);
  const strippedFiles = new Set(await listFiles(strippedCheckout));
  const unstrippedFiles = new Set(await listFiles(unstrippedCheckout));
  const onlyStripped = [...strippedFiles].filter((f) => !unstrippedFiles.has(f) && !exceptions.has(f));
  const onlyUnstripped = [...unstrippedFiles].filter((f) => !strippedFiles.has(f) && !exceptions.has(f));
  assert.deepEqual(onlyStripped, []);
  assert.deepEqual(onlyUnstripped, []);
  for (const file of strippedFiles) {
    if (exceptions.has(file) || !unstrippedFiles.has(file)) continue;
    const [a, b] = await Promise.all([
      readFile(path.join(strippedCheckout, file)),
      readFile(path.join(unstrippedCheckout, file)),
    ]);
    assert.ok(a.equals(b), `expected ${file} to be byte-identical between the stripped and unstripped trees`);
  }
});

test('the resolvability gate exits with an error and commits nothing when a spec is unpublished', async (t) => {
  const remote = await createBareRemote(t);
  await assert.rejects(() =>
    syncTemplateRepo({
      remote,
      ...FIXTURE_OPTIONS,
      resolveSpec: async () => false,
      log: () => {},
    }),
  );
  assert.equal(await remoteCommitCount(remote), 0);
});

test('no token substring appears in any output, dry-run or real', async (t) => {
  const remote = await createBareRemote(t);
  const token = 'cairn-sync-test-token-9f3ac1';

  const dryLogs = [];
  await syncTemplateRepo({
    remote,
    dryRun: true,
    token,
    ...FIXTURE_OPTIONS,
    log: (line) => dryLogs.push(line),
  });
  assert.ok(!dryLogs.some((line) => line.includes(token)));

  const realLogs = [];
  await syncTemplateRepo({ remote, token, ...FIXTURE_OPTIONS, log: (line) => realLogs.push(line) });
  assert.ok(!realLogs.some((line) => line.includes(token)));
});

test('redact strips every occurrence of a secret from a string', () => {
  assert.equal(redact('a SECRET b SECRET c', 'SECRET'), 'a [REDACTED] b [REDACTED] c');
  assert.equal(redact('no secret here', undefined), 'no secret here');
});

test('composeAuthenticatedRemote embeds an x-access-token credential for an https remote and leaves a local path untouched', () => {
  const composed = composeAuthenticatedRemote('https://github.com/glw907/cairn-waymark-template.git', 'abc123');
  assert.ok(composed.includes('x-access-token:abc123@'));
  assert.equal(composeAuthenticatedRemote('/tmp/some/local/repo.git', 'abc123'), '/tmp/some/local/repo.git');
});

test('.dev.vars.example survives into the synced tree via the .gitignore negation', async (t) => {
  const remote = await createBareRemote(t);
  await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  const checkout = await cloneRemote(t, remote);
  const committed = await git(['show', 'HEAD:.dev.vars.example'], checkout);
  assert.ok(committed.includes('GITHUB_APP_ID'));
});

test('a github.com remote other than the template repo is refused without --allow-any-remote', () => {
  assert.throws(
    () => assertRemoteAllowed('https://github.com/glw907/some-other-repo.git', false),
    /some-other-repo/,
  );
  assert.doesNotThrow(() => assertRemoteAllowed('https://github.com/glw907/some-other-repo.git', true));
  assert.doesNotThrow(() => assertRemoteAllowed(`https://github.com/${TEMPLATE_REPO_SLUG}.git`, false));
});

test('a github.com remote other than the template repo is refused end to end, before any network reaches it', async () => {
  await assert.rejects(
    () =>
      syncTemplateRepo({
        remote: 'https://github.com/glw907/some-other-repo.git',
        token: 'unused',
        ...FIXTURE_OPTIONS,
        log: () => {},
      }),
    /cairn-waymark-template/,
  );
});

test('a local filesystem path remote is always allowed, with no override needed', async (t) => {
  const remote = await createBareRemote(t);
  const result = await syncTemplateRepo({ remote, ...FIXTURE_OPTIONS, log: () => {} });
  assert.equal(result.status, 'synced');
});

// The overlay skeleton itself, asserted directly (not through the script's own overlay logic).
test('the overlay skeleton carries the files Task 1 ships', async () => {
  const files = await readdir(OVERLAY_DIR);
  assert.ok(files.includes('README.md'));
  assert.ok(files.includes('LICENSE'));
  assert.ok(files.includes('.dev.vars.example'));
  assert.ok(files.includes('.gitignore'));
  const gitignore = await readFile(path.join(OVERLAY_DIR, '.gitignore'), 'utf8');
  assert.equal(gitignore.trim(), '!.dev.vars.example');
});
