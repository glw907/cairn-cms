// cairn-cms: asserts that a built scaffold carries the site's real origin and that the packed
// create-cairn-site tarball has the shape a publish needs.
//
// Usage: `node scripts/ci/assert-scaffold-origin.mjs <siteDir> <origin> [tarball]`.
//
// Under `<siteDir>/.svelte-kit/cloudflare/` it requires `sitemap.xml`, `robots.txt`, and `feed.xml`
// to contain the origin; at least one `*.html` file to carry a canonical link and every canonical
// link to start with the origin; and no `*.html`, `*.xml`, `*.txt`, `*.json`, or `*.md` file to hold
// the template placeholder `showcase.test`. `_worker.js` and `_app/` are skipped, since the worker
// bundle holds the placeholder sender by design. A run that scans no file fails. With a tarball it
// also requires a `template/` entry, no `.test.mjs` entry, and a `repository` field in
// `package/package.json`. Each failure prints a named message and the process exits 1.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const PLACEHOLDER = 'showcase.test';
const SCANNED = /\.(html|xml|txt|json|md)$/;
const SKIPPED = new Set(['_worker.js', '_app']);
const REQUIRED = ['sitemap.xml', 'robots.txt', 'feed.xml'];

/** @type {string[]} */
const failures = [];

/**
 * @param {string} name - The assertion's short name.
 * @param {string} detail - What went wrong.
 */
function fail(name, detail) {
  failures.push(`FAIL ${name}: ${detail}`);
}

/**
 * Lists every file under `dir`, skipping `_worker.js` and `_app/` at any depth.
 * @param {string} dir - The directory to walk.
 * @returns {string[]} Absolute file paths.
 */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Runs the build-output assertions.
 * @param {string} siteDir - The scaffolded site root.
 * @param {string} origin - The origin the build must carry.
 */
function checkBuild(siteDir, origin) {
  const root = join(siteDir, '.svelte-kit', 'cloudflare');
  if (!existsSync(root)) {
    fail('build-output', `${root} does not exist; run the build first`);
    return;
  }
  for (const name of REQUIRED) {
    const file = join(root, name);
    if (!existsSync(file)) fail('required-file', `${name} is missing from the build output`);
    else if (!readFileSync(file, 'utf8').includes(origin)) {
      fail('origin-in-file', `${name} does not contain ${origin}`);
    }
  }
  const files = walk(root).filter((f) => SCANNED.test(f));
  if (files.length === 0) {
    fail('scan-empty', `no .html, .xml, .txt, .json, or .md file found under ${root}`);
    return;
  }
  let canonicals = 0;
  for (const file of files) {
    const rel = relative(root, file);
    const text = readFileSync(file, 'utf8');
    if (text.includes(PLACEHOLDER)) fail('placeholder-origin', `${rel} still holds ${PLACEHOLDER}`);
    if (!file.endsWith('.html')) continue;
    for (const tag of text.match(/<link\b[^>]*>/g) ?? []) {
      if (!/\brel=["']?canonical\b/.test(tag)) continue;
      canonicals += 1;
      const href = /\bhref=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
      if (!href.startsWith(origin)) {
        fail('canonical-origin', `${rel} has canonical ${href || '(no href)'}, not on ${origin}`);
      }
    }
  }
  if (canonicals === 0) fail('canonical-missing', 'no .html file carries a canonical link');
}

/**
 * Runs the tarball assertions with the system `tar`.
 * @param {string} tarball - Path to the packed `.tgz`.
 */
function checkTarball(tarball) {
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  if (!entries.some((e) => e.startsWith('package/template/'))) {
    fail('tarball-template', 'package/template/ is absent from the tarball');
  }
  const tests = entries.filter((e) => e.endsWith('.test.mjs'));
  if (tests.length > 0) fail('tarball-tests', `test files shipped: ${tests.join(', ')}`);
  try {
    const manifest = JSON.parse(
      execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' }),
    );
    if (!manifest.repository) fail('tarball-repository', 'package/package.json has no repository');
  } catch (error) {
    fail('tarball-manifest', `cannot read package/package.json: ${(error).message}`);
  }
}

const [siteDir, origin, tarball] = process.argv.slice(2);
if (!siteDir || !origin) {
  console.error('usage: assert-scaffold-origin.mjs <siteDir> <origin> [tarball]');
  process.exit(2);
}
checkBuild(siteDir, origin);
if (tarball) checkTarball(tarball);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`assert-scaffold-origin: ok (${origin}${tarball ? ', tarball' : ''})`);
