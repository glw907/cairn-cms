// The demo build: Waymark over the starter overlay, built once, then read as the deployed assets
// would be. The pages carry the release marker, hold no admin link and no conformance page, every
// internal address in them lands on a file, and the Wrangler file deploys assets with no script.
// A second build runs over a fixture set, and `writeOrigin` is read on a scratch directory.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repoRoot } from '../repo-root.mjs';
import { buildDemo, writeOrigin } from './demo.mjs';

const ROOT = repoRoot(import.meta.url);
const WAYMARK = path.join(ROOT, 'themes/waymark');
const CONFORMANCE_INDEX = path.join(ROOT, 'scripts/theme/conformance/src/content/.cairn/index.json');

const ORIGIN = 'https://demo-test.example';

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

/**
 * Assert the five places a demo names its origin: the canonical link and `og:url` of the home page,
 * the feed's link, a sitemap location, and the `robots.txt` Sitemap line each start with the origin,
 * and none of the five holds the showcase's address.
 * @param {string} dir the assets directory
 * @param {string} origin
 */
function assertOrigin(dir, origin) {
  const read = (/** @type {string} */ name) => readFileSync(path.join(dir, name), 'utf8');
  const home = read('index.html');
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(home)?.[1];
  const ogUrl = /<meta property="og:url" content="([^"]*)"/.exec(home)?.[1];
  const feedLink = /<link>([^<]*)<\/link>/.exec(read('feed.xml'))?.[1];
  const loc = /<loc>([^<]*)<\/loc>/.exec(read('sitemap.xml'))?.[1];
  const robots = /^Sitemap: (\S+)/m.exec(read('robots.txt'))?.[1];
  const found = { 'canonical href': canonical, 'og:url content': ogUrl, 'feed.xml link': feedLink, 'sitemap.xml loc': loc, 'robots.txt Sitemap': robots };
  for (const [place, value] of Object.entries(found)) {
    assert.ok(value?.startsWith(origin), `${place} is ${value}, not under ${origin}`);
    assert.ok(!value?.includes('showcase.test'), `${place} holds showcase.test`);
  }
  for (const name of ['index.html', 'feed.xml', 'sitemap.xml', 'robots.txt']) {
    assert.ok(!read(name).includes('showcase.test'), `${name} holds showcase.test`);
  }
}

before(() => {
  out = mkdtempSync(path.join(tmpdir(), 'cairn-demo-test-'));
  buildDemo({ root: ROOT, themeDir: WAYMARK, out, worker: 'cairn-demo-{id}', origin: ORIGIN });
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

test('the origin is named in the canonical link, og:url, feed, sitemap, and robots.txt, and showcase.test in none', () => {
  assertOrigin(assets, ORIGIN);
});

test('writeOrigin sets deploy.publicOrigin in cairn-site.json and throws naming the file when the record lacks it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cairn-origin-test-'));
  try {
    const file = path.join(dir, 'cairn-site.json');
    writeFileSync(file, `${JSON.stringify({ kind: 'blog', deploy: { publicOrigin: 'https://showcase.test', emailFrom: 'cms@showcase.test' } }, null, 2)}\n`);
    writeOrigin(dir, 'https://example.org');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), {
      kind: 'blog',
      deploy: { publicOrigin: 'https://example.org', emailFrom: 'cms@showcase.test' },
    });
    writeFileSync(file, '{ "kind": "blog" }\n');
    assert.throws(() => writeOrigin(dir, 'https://example.net'), (error) => error instanceof Error && error.message.includes(file));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('over a set', () => {
  const TITLE = 'The Fixture Society';
  /** @type {string} */
  let scratch;
  /** @type {string} */
  let setAssets;

  /**
   * Write a fixture set into a scratch directory: a `home` page with a title and an image, one
   * post, and a config carrying the literal the installer overwrites.
   * @param {string} name the set's directory name
   * @param {string} homeFront the home page's front matter, between the fences
   * @returns {string} the set directory
   */
  function writeSet(name, homeFront) {
    const dir = path.join(scratch, name);
    mkdirSync(path.join(dir, 'src/content/pages'), { recursive: true });
    mkdirSync(path.join(dir, 'src/content/posts'), { recursive: true });
    mkdirSync(path.join(dir, 'src/site'), { recursive: true });
    mkdirSync(path.join(dir, 'static/images'), { recursive: true });
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';
    writeFileSync(path.join(dir, 'static/images/pixel.png'), Buffer.from(png, 'base64'));
    writeFileSync(path.join(dir, 'src/content/pages/home.md'), `---\n${homeFront}\n---\nWelcome to the society.\n\n![A single pixel](/images/pixel.png)\n`);
    writeFileSync(path.join(dir, 'src/content/posts/2026-11-01-first-post.md'), '---\ntitle: First post\ndate: 2026-11-01\ndescription: The first post.\n---\nA post.\n');
    writeFileSync(path.join(dir, 'src/site/site.config.yaml'), 'siteName: Waymark\ndescription: A fixture set.\nmenus:\n  primary:\n    - label: Home\n      url: /\n');
    return dir;
  }

  before(() => {
    scratch = mkdtempSync(path.join(tmpdir(), 'cairn-demo-set-test-'));
    const set = writeSet('set', `title: ${TITLE}`);
    buildDemo({ root: ROOT, themeDir: WAYMARK, out: path.join(scratch, 'out'), worker: 'cairn-demo-{id}', origin: ORIGIN, set });
    setAssets = path.join(scratch, 'out/assets');
  });

  after(() => rmSync(scratch, { recursive: true, force: true }));

  test('the origin is named in all five places and showcase.test in none', () => {
    assertOrigin(setAssets, ORIGIN);
  });

  test("the home page's title is the site name, and Waymark is not", () => {
    const title = /<title>([^<]*)<\/title>/.exec(readFileSync(path.join(setAssets, 'index.html'), 'utf8'))?.[1];
    assert.ok(title?.includes(TITLE), `the title is ${title}`);
    assert.ok(!title?.includes('Waymark'), `the title is ${title}`);
  });

  test('a set whose home page has no title fails naming the file', () => {
    const set = writeSet('untitled', 'description: No title here.');
    assert.throws(
      () => buildDemo({ root: ROOT, themeDir: WAYMARK, out: path.join(scratch, 'untitled-out'), worker: 'cairn-demo-{id}', origin: ORIGIN, set }),
      (error) => error instanceof Error && error.message.includes(path.join(set, 'src/content/pages/home.md')),
    );
    assert.equal(existsSync(path.join(scratch, 'untitled-out')), false);
  });
});

describe('over the organization set', () => {
  /** @type {string} */
  let setOut;
  /** @type {string} */
  let setAssets;

  before(() => {
    setOut = mkdtempSync(path.join(tmpdir(), 'cairn-demo-organization-'));
    buildDemo({ root: ROOT, themeDir: WAYMARK, out: setOut, worker: 'cairn-demo-{id}', origin: ORIGIN, set: path.join(ROOT, 'sets/organization') });
    setAssets = path.join(setOut, 'assets');
  });

  after(() => rmSync(setOut, { recursive: true, force: true }));

  test('the origin is named in all five places and showcase.test in none', () => {
    assertOrigin(setAssets, ORIGIN);
  });
});
