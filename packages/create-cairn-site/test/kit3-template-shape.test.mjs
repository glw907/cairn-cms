// The scaffold ships the SvelteKit 3 / adapter-cloudflare 8 site shape. The in-tree `template/`
// is a gitignored build artifact that can be left over from an earlier bake, so this test bakes
// a fresh tree itself with the package's own bake command, into a scratch directory under
// $HOME/.cache, and asserts on that. The same checker runs against a committed tree of the
// SvelteKit 2 shape (test/fixtures/kit2-template), so each assertion is shown to fail on the
// shape it exists to rule out and not merely to pass on a tree that never had the problem.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const bakeScript = path.resolve(testDir, '../scripts/bake-template.mjs');
const KIT2_FIXTURE = path.join(testDir, 'fixtures', 'kit2-template');

/** The text file extensions the source scan reads. */
const TEXT_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.svelte', '.css', '.html', '.json', '.jsonc']);

/**
 * Every text file under a directory of the tree, as tree-relative paths.
 * @param {string} root the tree's root
 * @param {string} dir the directory to walk, relative to `root`
 * @returns {Promise<string[]>} the files' relative paths
 */
async function textFilesUnder(root, dir) {
  const found = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await textFilesUnder(root, relative)));
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) found.push(relative);
  }
  return found;
}

/**
 * The first three numeric parts of the version a semver range names.
 * @param {string} range a range such as `^8.3.1`
 * @returns {number[]} `[major, minor, patch]`
 */
function rangeFloor(range) {
  const parts = /(\d+)\.?(\d+)?\.?(\d+)?/.exec(range);
  return [1, 2, 3].map((i) => Number(parts?.[i] ?? 0));
}

/**
 * Whether a range's floor is at least a version.
 * @param {string} range the dependency range
 * @param {string} minimum the version it must reach, `major.minor.patch`
 * @returns {boolean} true when the range floor is the minimum or later
 */
function floorAtLeast(range, minimum) {
  const have = rangeFloor(range);
  const need = rangeFloor(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (have[i] !== need[i]) return have[i] > need[i];
  }
  return true;
}

/**
 * Check a site tree against the SvelteKit 3 shape.
 * @param {string} root the tree's root
 * @returns {Promise<Record<string, boolean>>} one entry per assertion, true when it holds
 */
async function kit3Shape(root) {
  const rootFiles = await readdir(root);
  const configFiles = rootFiles.filter((name) => /^(svelte|vite)\.config\./.test(name));
  const configText = (
    await Promise.all(configFiles.map((name) => readFile(path.join(root, name), 'utf8')))
  ).join('\n');
  const sources = [...(await textFilesUnder(root, 'src')), ...rootFiles.filter((name) => /\.(ts|js)$/.test(name))];
  const sourceText = (
    await Promise.all(sources.map((name) => readFile(path.join(root, name), 'utf8')))
  ).join('\n');
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const vitestConfig = await readFile(path.join(root, 'vitest.config.ts'), 'utf8').catch(() => '');
  const devDependencies = pkg.devDependencies ?? {};
  return {
    'no separate Kit config file': !rootFiles.some((name) => /^svelte\.config\./.test(name)),
    'no csrf config key': !/\bcsrf\s*:/.test(configText),
    'no platform binding type or read': !/\bApp\.Platform\b|\binterface\s+Platform\b|\bplatform\??\.env\b|\bevent\.platform\b/.test(
      sourceText,
    ),
    'no lib alias import': !/[$]lib\b/.test(sourceText),
    'subpath imports field names the three site layers': ['#chassis/*', '#lib/*', '#theme/*'].every(
      (key) => typeof pkg.imports?.[key] === 'string',
    ),
    'vitest inlines the engine': /server:\s*\{\s*deps:\s*\{\s*inline:\s*\[[^\]]*@glw907\/cairn-cms/.test(vitestConfig),
    'preview serves through wrangler dev': pkg.scripts?.preview === 'wrangler dev',
    'SvelteKit 3': floorAtLeast(devDependencies['@sveltejs/kit'] ?? '0', '3.0.0'),
    'adapter-cloudflare 8': floorAtLeast(devDependencies['@sveltejs/adapter-cloudflare'] ?? '0', '8.0.0'),
    'vite at the Kit 3 floor': floorAtLeast(devDependencies.vite ?? '0', '8.0.12'),
    'wrangler at the Workers module floor': floorAtLeast(devDependencies.wrangler ?? '0', '4.118.0'),
  };
}

/** The assertion names, in report order. */
const ASSERTIONS = Object.keys(await kit3Shape(KIT2_FIXTURE));

let freshBake;

/**
 * Bake the template once for the whole file, through the package's own bake command.
 * @returns {Promise<{ root: string, scratch: string }>} the baked tree and the scratch directory to remove
 */
function bakeFresh() {
  freshBake ??= (async () => {
    const cache = path.join(homedir(), '.cache');
    await mkdir(cache, { recursive: true });
    const scratch = await mkdtemp(path.join(cache, 'cairn-kit3-shape-'));
    const root = path.join(scratch, 'baked');
    await run(process.execPath, [bakeScript, '--to', root], { timeout: 120_000 });
    return { root, scratch };
  })();
  return freshBake;
}

test.after(async () => {
  if (freshBake) await rm((await freshBake).scratch, { recursive: true, force: true });
});

test('a SvelteKit 2 shaped tree fails every assertion', async () => {
  const shape = await kit3Shape(KIT2_FIXTURE);
  const passing = Object.entries(shape)
    .filter(([, holds]) => holds)
    .map(([name]) => name);
  assert.deepEqual(passing, [], `the fixture should violate each assertion, but these held: ${passing.join('; ')}`);
});

for (const assertion of ASSERTIONS) {
  test(`a fresh bake holds: ${assertion}`, async () => {
    const { root } = await bakeFresh();
    const shape = await kit3Shape(root);
    assert.equal(shape[assertion], true, `the fresh bake at ${root} violates: ${assertion}`);
  });
}
