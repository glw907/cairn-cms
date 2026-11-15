// The reference page and its check, against a two-theme, two-kind fixture catalog served on a
// second local port so the page's fetch is cross-origin. Nothing here reaches the network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { main, PAGE_FILE, runReferenceCheck } from './reference-check.mjs';

const FIXTURES = path.join(import.meta.dirname, 'fixtures/reference');

/** The content type the fixture server sends for each extension it holds. */
const TYPES = { '.json': 'application/json', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8' };

/** @type {Array<() => Promise<void>>} */
const cleanups = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
});

/**
 * Serves the fixture tree on 127.0.0.1, with the catalog's `{{origin}}` filled in and then edited.
 * @param {{ cors?: boolean, edit?: (catalog: any) => void }} [options]
 * @returns {Promise<string>} the catalog's address
 */
async function serveFixtures({ cors = true, edit = () => {} } = {}) {
  /** @type {string} */
  let origin = '';
  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', origin).pathname;
    const rel = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.join(FIXTURES, path.normalize(rel));
    /** @type {Record<string, string>} */
    const headers = cors ? { 'access-control-allow-origin': '*' } : {};
    let body;
    try {
      if (!file.startsWith(FIXTURES + path.sep)) throw new Error('outside');
      body = readFileSync(file);
    } catch {
      res.writeHead(404, headers).end('not found');
      return;
    }
    if (rel === '/catalog.json') {
      const catalog = JSON.parse(body.toString('utf8').replaceAll('{{origin}}', origin));
      edit(catalog);
      body = JSON.stringify(catalog);
    }
    res.writeHead(200, { ...headers, 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('the fixture server has no port');
  origin = `http://127.0.0.1:${address.port}`;
  cleanups.push(() => new Promise((resolve) => server.close(() => resolve(undefined))));
  return `${origin}/catalog.json`;
}

/**
 * Runs the command and keeps what it prints.
 * @param {string} catalog the catalog's address
 * @param {{ page?: string }} [options]
 * @returns {Promise<{ code: number, text: string }>}
 */
async function command(catalog, options = {}) {
  /** @type {string[]} */
  const lines = [];
  const code = await main(['--catalog', catalog], { ...options, print: (line) => lines.push(line) });
  return { code, text: lines.join('\n') };
}

test('the page shows the fixture catalog, holds every width, and filters by kind and engine', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures();
  const result = await runReferenceCheck({ catalog });
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.notes, [], 'every theme has its own demo address, so none is skipped');

  assert.deepEqual([...new Set(result.viewports.map((v) => v.width))], [320, 390, 768, 1440, 2560]);
  for (const v of result.viewports) {
    assert.ok(v.scrollWidth <= v.innerWidth, `no horizontal scroll at ${v.width} on ${v.view} (${v.scrollWidth} > ${v.innerWidth})`);
  }

  assert.deepEqual(result.observed.all, ['alder@2.0.0', 'birch@1.0.0']);
  assert.deepEqual(result.observed.kinds.portfolio, ['birch@1.0.0'], 'the second kind hides the first theme');
  assert.deepEqual(result.observed.kinds.blog, ['alder@2.0.0']);
  assert.deepEqual(result.observed.engines['0.9.0-0'], ['alder@1.0.0'], 'below birch minimum hides birch; only alder 1.0.0 admits it');
  assert.deepEqual(result.observed.engines['0.95.0'], ['alder@1.0.0', 'birch@1.0.0'], 'only the older alder release admits 0.95.0');
  assert.deepEqual(result.observed.engines['0.0.0-0'], [], 'an engine below every minimum hides every theme');
  assert.deepEqual(result.observed.engines['1.0.0'], ['alder@2.0.0', 'birch@1.0.0']);
});

test('a demo serving an older release than the catalog names exits 1 naming the theme', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures({
    edit: (data) => {
      data.themes[0].demo = data.themes[0].demo.replace('/demo/alder/', '/demo/stale/');
    },
  });
  const { code, text } = await command(catalog);
  assert.equal(code, 1, text);
  assert.match(text, /alder: the demo .* serves alder@1\.0\.0, not alder@2\.0\.0/);
});

/** Points every theme's demo at one fixture demo directory, as the proving target does. */
const shareDemo = (dir) => (data) => {
  for (const theme of data.themes) theme.demo = theme.demo.replace(/\/demo\/[^/]+\//, `/demo/${dir}/`);
};

test('a shared demo address serving the last theme passes and notes the earlier theme', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures({ edit: shareDemo('birch') });
  const result = await runReferenceCheck({ catalog });
  assert.deepEqual(result.failures, []);
  assert.equal(result.notes.length, 1, result.notes.join('\n'));
  assert.match(result.notes[0], /^alder: .*\/demo\/birch\/.* birch /);
});

test('a shared demo address serving an earlier theme exits 1 naming the last theme', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures({ edit: shareDemo('alder') });
  const { code, text } = await command(catalog);
  assert.equal(code, 1, text);
  assert.match(text, /birch: the demo .* serves alder@2\.0\.0, not birch@1\.0\.0/);
  assert.match(text, /reference-check: note alder: .*\/demo\/alder\//);
  assert.doesNotMatch(text, /FAIL alder: the demo/, 'the earlier theme is not held to the shared marker');
});

test('a card that does not answer 200 exits 1 naming the card', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures({
    edit: (data) => {
      data.themes[1].card.url = data.themes[1].card.url.replace('card.svg', 'missing.svg');
    },
  });
  const { code, text } = await command(catalog);
  assert.equal(code, 1, text);
  assert.match(text, /birch: the card .*missing\.svg answered 404/);
});

test('a catalog served with no access-control-allow-origin header exits 1', { timeout: 180_000 }, async () => {
  const catalog = await serveFixtures({ cors: false });
  const { code, text } = await command(catalog);
  assert.equal(code, 1, text);
  assert.match(text, /the page could not read the catalog/);
});

/**
 * Opens the committed page against the fixture catalog in a real browser and hands the page to the body.
 * @param {(page: import('playwright').Page) => Promise<void>} body
 */
async function withPage(body) {
  const catalog = await serveFixtures();
  const html = readFileSync(PAGE_FILE);
  const server = createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('the page server has no port');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/?catalog=${encodeURIComponent(catalog)}`);
    await page.waitForSelector('main[data-ready="true"]');
    await body(page);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(() => resolve(undefined)));
  }
}

test('the skip link on a theme page leaves the theme page open', { timeout: 60_000 }, async () => {
  await withPage(async (page) => {
    await page.locator('#grid [data-theme="alder"] h3 a').click();
    await page.waitForSelector('[data-row="theme-page"]:not([hidden])');
    await page.locator('.skip').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-row="theme-page"]').isVisible(), true, 'the theme page stays open');
    assert.equal(await page.locator('#grid').isVisible(), false, 'the grid stays hidden');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main', 'focus moves to the main region');
  });
});

test('the engine field names its error only while the version is not valid', { timeout: 60_000 }, async () => {
  await withPage(async (page) => {
    const input = page.locator('#engine');
    const describedby = () => input.getAttribute('aria-describedby');
    assert.equal(await describedby(), 'engine-hint', 'a valid empty field names only the hint');
    await input.fill('nope');
    assert.equal(await describedby(), 'engine-hint engine-error');
    await input.fill('1.0.0');
    assert.equal(await describedby(), 'engine-hint', 'a valid version drops the error again');
  });
});

test('a page that fetches a second address exits 1 naming the request',{ timeout: 180_000 }, async () => {
  const catalog = await serveFixtures();
  const stray = `${new URL(catalog).origin}/demo/birch/`;
  const dir = mkdtempSync(path.join(tmpdir(), 'reference-page-'));
  cleanups.push(async () => rmSync(dir, { recursive: true, force: true }));
  const page = path.join(dir, 'index.html');
  const html = readFileSync(PAGE_FILE, 'utf8');
  const edited = html.replace('</body>', `<script>fetch(${JSON.stringify(stray)});</script>\n</body>`);
  assert.notEqual(edited, html, 'the edit finds the closing body tag');
  writeFileSync(page, edited);
  const { code, text } = await command(catalog, { page });
  assert.equal(code, 1, text);
  assert.ok(text.includes(`unexpected request: fetch ${stray}`), text);
});
