// The demo build: Waymark over the starter overlay, built once, then read as the deployed assets
// would be. The pages carry the release marker, hold no admin link and no conformance page, every
// internal address in them lands on a file, and the Wrangler file deploys assets with no script.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { buildDemo } from './demo.mjs';

const ROOT = repoRoot(import.meta.url);
const WAYMARK = path.join(ROOT, 'themes/waymark');
const CONFORMANCE_INDEX = path.join(ROOT, 'scripts/theme/conformance/src/content/.cairn/index.json');

/** @type {string} */
let out;
/** @type {string} */
let assets;
/** @type {string[]} */
let files;

/**
 * Every file under a directory, as paths relative to it with forward slashes.
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

/**
 * The file a static-assets Worker serves for an address, or undefined when none would answer.
 * @param {string} address a path beginning with a slash, no query or fragment
 * @returns {string | undefined}
 */
function served(address) {
  const rel = decodeURIComponent(address).replace(/^\/+/, '').replace(/\/+$/, '');
  const candidates = rel === '' ? ['index.html'] : [rel, `${rel}.html`, `${rel}/index.html`];
  return candidates.find((candidate) => existsSync(path.join(assets, candidate)) && statSync(path.join(assets, candidate)).isFile());
}

before(() => {
  out = mkdtempSync(path.join(tmpdir(), 'cairn-demo-test-'));
  buildDemo({ root: ROOT, themeDir: WAYMARK, out, worker: 'cairn-demo-{id}' });
  assets = path.join(out, 'assets');
  files = walk(assets);
});

after(() => rmSync(out, { recursive: true, force: true }));

test('every page carries the release marker in its head', () => {
  const marker = '<meta name="cairn-theme-release" content="waymark@1.2.0"';
  const home = readFileSync(path.join(assets, 'index.html'), 'utf8');
  const head = home.slice(0, home.indexOf('</head>'));
  assert.ok(head.includes(marker), 'index.html has no waymark@1.2.0 marker in its head');
  for (const page of files.filter((file) => file.endsWith('.html'))) {
    assert.ok(readFileSync(path.join(assets, page), 'utf8').includes(marker), `${page} has no release marker`);
  }
});

test('no script is deployed once .assetsignore is applied', () => {
  // The build applies the adapter's .assetsignore as it copies, so no ignored file reaches the
  // directory at all, and the script is absent whatever a deploy would skip.
  assert.ok(files.includes('index.html'), 'the assets directory has no index.html');
  assert.deepEqual(files.filter((file) => path.posix.basename(file) === '_worker.js'), []);
});

test('no page from the conformance set is present', () => {
  const index = JSON.parse(readFileSync(CONFORMANCE_INDEX, 'utf8'));
  const routes = index.entries.filter((/** @type {any} */ e) => e.concept !== 'fragments').map((/** @type {any} */ e) => e.permalink);
  assert.ok(routes.length > 0, 'the conformance index lists no pages');
  for (const route of routes) assert.equal(served(route), undefined, `the conformance page ${route} is in the demo`);
});

test('no page links to the admin', () => {
  for (const page of files.filter((file) => file.endsWith('.html'))) {
    assert.ok(!readFileSync(path.join(assets, page), 'utf8').includes('href="/admin'), `${page} links to /admin`);
  }
});

test('every internal href and src in every page resolves to a file', () => {
  const pages = files.filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 1, 'the demo built fewer than two pages');
  const missing = [];
  for (const page of pages) {
    const html = readFileSync(path.join(assets, page), 'utf8');
    for (const [, value] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) continue;
      const address = value.split(/[?#]/)[0];
      const absolute = address.startsWith('/') ? address : path.posix.join('/', path.posix.dirname(page), address);
      if (served(absolute) === undefined) missing.push(`${page}: ${value}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('the Wrangler file deploys the assets with no script, no route, and no workers.dev address', () => {
  const config = JSON.parse(readFileSync(path.join(out, 'wrangler.json'), 'utf8'));
  assert.equal(config.name, 'cairn-demo-waymark');
  assert.match(config.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(config.assets, { directory: './assets' });
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal('main' in config, false);
  assert.equal('routes' in config, false);
  assert.equal('route' in config, false);
});
