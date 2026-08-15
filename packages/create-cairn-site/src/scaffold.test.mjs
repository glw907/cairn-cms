import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, access, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffold, handoverText, dryRunNotice, SCAFFOLD_SENTINEL } from './scaffold.mjs';

/**
 * A minimal but real wrangler.jsonc, carrying every string nameWranglerResources targets (the
 * showcase's own name, both database names and ids, and the bucket name), so a real scaffold run
 * exercises the actual rewrite rather than a fixture that happens to have nothing to find.
 */
const WRANGLER_JSONC_FIXTURE = `{
  "name": "cairn-showcase",
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "cairn-showcase-auth",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "migrations"
    },
    {
      "binding": "APP_DB",
      "database_name": "cairn-showcase-app",
      "database_id": "00000000-0000-0000-0000-000000000001",
      "migrations_dir": "migrations-app"
    }
  ],
  "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "cairn-showcase-media" }],
  "vars": { "PUBLIC_ORIGIN": "http://localhost:4173" }
}
`;

// Every scaffold test answers identically: the name is what the slug and the substitution
// assertions key on, and both optional answers stay empty. Frozen so a scaffold run that ever
// mutated its answers would fail here rather than leak into the next test.
const ANSWERS = Object.freeze({ name: 'Alpine Club', description: '', brandColor: '' });

// The real showcase .gitignore's content (examples/showcase/.gitignore); templateFixture writes
// it under the dot-free name the real bake produces, so this fixture exercises the same rename
// restoreGitignore performs against real bake output.
const GITIGNORE_FIXTURE = `node_modules
.svelte-kit
build
.wrangler
.dev.vars
.dev.vars.*
test-results
playwright-report
`;

/**
 * Make a temporary directory that is removed when the test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the directory's absolute path
 */
async function tempDir(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-scaffold-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Set CAIRN_STATE_DIR to a fresh temp directory for a test, restoring the prior value (or
 * deleting the var) once the test finishes, so tests never leak state between each other or into
 * a developer's real `~/.config/cairn/sites`.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the state directory's absolute path
 */
async function withStateDir(t) {
  const previous = process.env.CAIRN_STATE_DIR;
  const dir = await tempDir(t);
  process.env.CAIRN_STATE_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.CAIRN_STATE_DIR;
    else process.env.CAIRN_STATE_DIR = previous;
  });
  return dir;
}

/**
 * Build a fixture template directory reproducing the REAL showcase layout that
 * applySubstitutions reads (`src/theme/site.config.yaml`, `src/theme/theme.css`), not the
 * plan's stale root-level guess.
 * @param {import('node:test').TestContext} t the running test's context
 * @returns {Promise<string>} the fixture template's absolute path
 */
async function templateFixture(t) {
  const dir = await tempDir(t);
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'cairn-site', dependencies: { '@glw907/cairn-cms': '^0.94.0' } }),
  );
  await mkdir(path.join(dir, 'src/theme'), { recursive: true });
  await writeFile(path.join(dir, 'src/theme/site.config.yaml'), 'siteName: Waymark\n');
  await writeFile(
    path.join(dir, 'src/theme/theme.css'),
    '--color-primary: oklch(45% 0.15 30);\n',
  );
  await writeFile(path.join(dir, 'wrangler.jsonc'), WRANGLER_JSONC_FIXTURE);
  // Mirrors bake-template.mjs's renameGitignoreForPacking: the real baked template carries the
  // showcase's own .gitignore under this dot-free name, npm-safe through packing.
  await writeFile(path.join(dir, 'gitignore'), GITIGNORE_FIXTURE);
  return dir;
}

test('dry run creates nothing and lists every action', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const lines = [];
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: true,
    log: (line) => lines.push(line),
  });
  await assert.rejects(() => access(dir));
  assert.ok(lines.length >= 3);
});

/**
 * List every file's basename found anywhere under `dir`, recursively. Used to prove a state
 * record's filename did not also land inside the scaffold tree, wherever it might have been
 * written, rather than checking one hardcoded (and wrong) name.
 * @param {string} dir the directory to walk
 * @returns {Promise<string[]>} every entry's basename, files and directories alike
 */
async function allFileNamesUnder(dir) {
  const entries = await readdir(dir, { recursive: true });
  return entries.map((entry) => path.basename(entry));
}

test('real run scaffolds, renames, substitutes, and saves state outside the scaffold', async (t) => {
  const stateDir = await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
  assert.match(await readFile(path.join(dir, 'src/theme/site.config.yaml'), 'utf8'), /Alpine Club/);

  // Prove the save actually happened (one record in the state dir) AND that it did not also
  // land inside the scaffold. A check for the literal filename ".cairn-state.json" would pass
  // no matter what, since state.mjs never writes that name; this checks both halves for real.
  const stateFiles = (await readdir(stateDir)).filter((name) => name.endsWith('.json'));
  assert.equal(stateFiles.length, 1, 'expected exactly one saved state record');
  const [stateFileName] = stateFiles;
  const scaffoldFileNames = await allFileNamesUnder(dir);
  assert.ok(
    !scaffoldFileNames.includes(stateFileName),
    `state record ${stateFileName} must not also exist inside the scaffold`,
  );
});

test('a real scaffold run writes .gitignore, covering the secret-bearing entries', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const gitignore = await readFile(path.join(dir, '.gitignore'), 'utf8');
  assert.match(gitignore, /\.dev\.vars/);
  assert.match(gitignore, /\.wrangler/);
  await assert.rejects(
    () => access(path.join(dir, 'gitignore')),
    'the dot-free template copy must not survive in the scaffold',
  );
});

test('a template with no gitignore file to restore fails scaffold with a descriptive error', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const fixtureDir = await templateFixture(t);
  await rm(path.join(fixtureDir, 'gitignore'));
  await assert.rejects(
    () => scaffold({
      templateDir: fixtureDir,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /carries no "gitignore" file to restore/,
  );
});

test('a real scaffold run names its wrangler.jsonc resources after the slug and drops both database ids', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const wrangler = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  assert.ok(wrangler.includes('"name": "alpine-club"'));
  assert.ok(wrangler.includes('"database_name": "alpine-club-auth"'));
  assert.ok(wrangler.includes('"database_name": "alpine-club-app"'));
  assert.ok(wrangler.includes('"bucket_name": "alpine-club-media"'));
  assert.ok(!wrangler.includes('database_id'), 'both database_id lines must be gone');
});

test('scaffold returns the siteId the state record was saved under', async (t) => {
  const stateDir = await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const result = await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  assert.match(result.siteId, /^alpine-club-[a-z0-9]{6}$/);
  const stateFiles = await readdir(stateDir);
  assert.ok(stateFiles.includes(`${result.siteId}.json`), 'expected the state record to be saved under the returned siteId');
});

test('scaffold returns a siteId even under --dry-run, though nothing is saved', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const result = await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: true,
    log: () => {},
  });
  assert.match(result.siteId, /^alpine-club-[a-z0-9]{6}$/);
});

test('a failing state save reports a warning but leaves the scaffold complete', async (t) => {
  const outDir = await tempDir(t);
  // Point CAIRN_STATE_DIR at a path that already exists as a plain file, so state.mjs's own
  // mkdir fails, standing in for an unwritable ~/.config or a stray file where the state
  // directory should be.
  const previous = process.env.CAIRN_STATE_DIR;
  const blockedStatePath = path.join(outDir, 'blocked-state');
  await writeFile(blockedStatePath, 'not a directory\n');
  process.env.CAIRN_STATE_DIR = blockedStatePath;
  t.after(() => {
    if (previous === undefined) delete process.env.CAIRN_STATE_DIR;
    else process.env.CAIRN_STATE_DIR = previous;
  });

  const dir = path.join(outDir, 'site');
  const lines = [];
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: (line) => lines.push(line),
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
  assert.ok(
    lines.some((line) => line.includes('Warning') && line.includes(blockedStatePath)),
    'expected a warning naming the blocked state path',
  );
});

test('a missing template directory fails with a message naming the bake', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  const missingTemplate = path.join(outDir, 'no-such-template');
  await assert.rejects(
    () => scaffold({
      templateDir: missingTemplate,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /npm run prepack/,
  );
});

test('a non-empty target directory is refused before any file is written', async (t) => {
  const stateDir = await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'already-here.txt'), 'pre-existing\n');

  const fixtureDir = await templateFixture(t);
  await assert.rejects(
    () => scaffold({
      templateDir: fixtureDir,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /already exists and is not empty/,
  );
  // The refusal runs before any action, including the out-of-scaffold state save.
  assert.deepEqual(await readdir(stateDir), []);
});

test('a --dir pointing at an existing file fails naming it, not a raw ENOTDIR', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const filePath = path.join(outDir, 'notes.txt');
  await writeFile(filePath, 'not a directory\n');
  const fixtureDir = await templateFixture(t);

  await assert.rejects(
    () => scaffold({
      templateDir: fixtureDir,
      answers: ANSWERS,
      dir: filePath,
      dryRun: false,
      log: () => {},
    }),
    /is a file, not a directory/,
  );
});

test('an existing empty target directory is fine', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await mkdir(dir, { recursive: true });
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
});

test('a target directory holding only the sentinel fails with the interrupted-run message', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, SCAFFOLD_SENTINEL), '12345');

  const fixtureDir = await templateFixture(t);
  await assert.rejects(
    () => scaffold({
      templateDir: fixtureDir,
      answers: ANSWERS,
      dir,
      dryRun: false,
      log: () => {},
    }),
    /was interrupted while scaffolding/,
  );
});

test('a successful scaffold leaves no sentinel behind', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  await assert.rejects(() => access(path.join(dir, SCAFFOLD_SENTINEL)));
});

test('--dir with un-created parent directories scaffolds (mkdir recursive)', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'sites', 'my-site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: false,
    log: () => {},
  });
  const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'alpine-club');
});

test('a dry run creates neither the target directory nor the sentinel', async (t) => {
  await withStateDir(t);
  const outDir = await tempDir(t);
  const dir = path.join(outDir, 'site');
  await scaffold({
    templateDir: await templateFixture(t),
    answers: ANSWERS,
    dir,
    dryRun: true,
    log: () => {},
  });
  await assert.rejects(() => access(dir));
  await assert.rejects(() => access(path.join(dir, SCAFFOLD_SENTINEL)));
});

test('the hand-over block prints the bare install/dev sequence and never mentions CAIRN_DEV_BACKEND', () => {
  const text = handoverText({ dir: 'alpine-club' });
  assert.ok(text.includes('cd alpine-club'));
  assert.ok(text.includes('npm install'));
  assert.ok(text.includes('npm run dev'));
  assert.ok(!text.includes('CAIRN_DEV_BACKEND'), 'the scaffold\'s own dev script now sets it at runtime');
});

test('an absolute --dir prints without a doubled leading slash', () => {
  const text = handoverText({ dir: '/tmp/alpine-dry' });
  assert.ok(text.startsWith('Your site is scaffolded at /tmp/alpine-dry.'));
  assert.ok(!text.includes('.//tmp'));
});

test('a dry run closes by saying nothing was created, never that the site is scaffolded', () => {
  const text = dryRunNotice({ dir: '/tmp/alpine-dry' });
  assert.match(text, /nothing was written/);
  assert.ok(text.includes('/tmp/alpine-dry'));
  assert.ok(!text.includes('Your site is scaffolded'));
});

test('handoverText takes no platform parameter', () => {
  assert.ok(
    !handoverText.toString().includes('platform'),
    'handoverText\'s source must not reference a platform parameter',
  );
});
