#!/usr/bin/env node
// Proves the hosted catalog holds what a theme section needs, by running the reference page
// against it. The page is served from 127.0.0.1, so its read of the catalog is cross-origin and
// needs the catalog's CORS header. The check fails on a request the page makes that is neither the
// page, the catalog, nor an image; on a row of the theme section the page cannot show; on a kind
// or engine choice whose shown themes differ from what the data says; on a card, screenshot, or
// demo address that does not answer 200; and on a demo whose release marker is not its theme's
// newest release.
//
// Usage: node scripts/catalog/reference-check.mjs [--catalog <url>]
// With no --catalog it reads https://catalog.cairn.pub/index.json.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import semver from 'semver';

/** The page the check serves. */
export const PAGE_FILE = path.join(import.meta.dirname, 'reference/index.html');

/** The real catalog, read when no address is given. */
export const DEFAULT_CATALOG = 'https://catalog.cairn.pub/index.json';

/** The five widths every family artifact holds. */
const WIDTHS = [320, 390, 768, 1440, 2560];

/** How long one address read from node may take. */
const FETCH_TIMEOUT_MS = 30_000;

/** How long the page may take to read the catalog and draw. */
const READY_TIMEOUT_MS = 30_000;

/**
 * @typedef {object} CheckResult
 * @property {string[]} failures one line per failure, each naming what failed
 * @property {Array<{ width: number, view: string, scrollWidth: number, innerWidth: number }>} viewports
 *  the page's width at each viewport, on the grid and on each theme's page
 * @property {{ all: string[], kinds: Record<string, string[]>, engines: Record<string, string[]> }} observed
 *  the themes the page showed, as `id@version`, unfiltered and for each kind and engine choice
 * @property {string[]} requests every request the page made, as `<type> <url>`
 * @property {number} themes how many themes the catalog lists
 * @property {number} kinds how many kinds the catalog lists
 */

/** The newest release of a theme that admits an engine version, by SemVer precedence with prereleases. */
function expectedRelease(theme, engine) {
  const releases = [...theme.releases].sort((a, b) => semver.rcompare(a.version, b.version));
  if (engine === null) return releases[0];
  return releases.find((r) => semver.satisfies(engine, r.engine, { includePrerelease: true }));
}

/** What the grid should show: `id@version` for each theme the choices let through, in catalog order. */
function expectedShown(catalog, { kind = '', engine = null } = {}) {
  return catalog.themes
    .filter((theme) => !kind || theme.kinds.includes(kind))
    .map((theme) => ({ theme, release: expectedRelease(theme, engine) }))
    .filter((entry) => entry.release)
    .map((entry) => `${entry.theme.id}@${entry.release.version}`);
}

/**
 * The engine versions worth choosing: every bound a release names, and one below them all. Each
 * bound is where a theme's shown release can change.
 */
function engineChoices(catalog) {
  const versions = new Set(['0.0.0-0']);
  for (const theme of catalog.themes) {
    for (const release of theme.releases) {
      for (const bound of release.engine.split(' ')) versions.add(bound.replace(/^[<>=]+/, ''));
    }
  }
  return [...versions].sort(semver.compare);
}

/**
 * Reads an address from node and returns its status and body text, or the error's message.
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 */
async function read(fetchImpl, url) {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: 'follow' });
    return { status: response.status, body: await response.text() };
  } catch (error) {
    return { status: 0, body: '', error: error instanceof Error ? error.message : String(error) };
  }
}

/** The `content` of each `<meta name="cairn-theme-release">` in an HTML page. */
function releaseMarkers(html) {
  const markers = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => [m[1].toLowerCase(), m[3] ?? m[4]]));
    if (attrs.name === 'cairn-theme-release') markers.push(attrs.content ?? '');
  }
  return markers;
}

/**
 * Checks every card, screenshot, and demo address from node, and each demo's release marker.
 * @param {any} catalog
 * @param {typeof fetch} fetchImpl
 * @param {string[]} failures
 */
async function checkAddresses(catalog, fetchImpl, failures) {
  const jobs = [];
  for (const theme of catalog.themes) {
    jobs.push(['card', theme, theme.card?.url]);
    for (const release of theme.releases) {
      for (const shot of release.screenshots ?? []) jobs.push([`screenshot of ${release.version}`, theme, shot.url]);
    }
  }
  await Promise.all(
    jobs.map(async ([what, theme, url]) => {
      if (!url) return failures.push(`${theme.id}: the ${what} has no address`);
      const { status, error } = await read(fetchImpl, url);
      if (status !== 200) failures.push(`${theme.id}: the ${what} at ${url} answered ${status || error}`);
    }),
  );
  await Promise.all(
    catalog.themes.map(async (theme) => {
      const newest = expectedRelease(theme, null);
      const want = `${theme.id}@${newest.version}`;
      const { status, body, error } = await read(fetchImpl, theme.demo);
      if (status !== 200) return failures.push(`${theme.id}: the demo at ${theme.demo} answered ${status || error}`);
      const markers = releaseMarkers(body);
      if (markers.length === 0) return failures.push(`${theme.id}: the demo at ${theme.demo} carries no cairn-theme-release marker`);
      if (!markers.every((m) => m === want)) failures.push(`${theme.id}: the demo at ${theme.demo} serves ${markers.join(', ')}, not ${want}`);
    }),
  );
}

/**
 * Serves one HTML file at `/` on 127.0.0.1 with a free port.
 * @param {string} file
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
async function servePage(file) {
  const html = readFileSync(file);
  const server = createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('the page server has no port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve(undefined))),
  };
}

/** The `id@version` of each card the grid shows, in page order. */
const readGrid = (/** @type {import('playwright').Page} */ page) =>
  page.$$eval('#grid > li', (cards) => cards.map((card) => `${card.getAttribute('data-theme')}@${card.getAttribute('data-version')}`));

/** Waits until the page has read the catalog, or has said it could not. */
async function waitReady(page) {
  await page.waitForSelector('main[data-ready="true"]', { timeout: READY_TIMEOUT_MS });
}

/**
 * Checks that the grid and the filters show what the catalog holds.
 * @param {import('playwright').Page} page
 * @param {any} catalog
 * @param {string[]} failures
 */
async function checkBrowseRows(page, catalog, failures) {
  const cards = await page.$$eval('#grid > li', (items) =>
    items.map((card) => ({
      id: card.getAttribute('data-theme'),
      name: card.querySelector('h3')?.textContent?.trim() ?? '',
      href: card.querySelector('h3 a')?.getAttribute('href') ?? '',
      text: card.textContent ?? '',
      img: card.querySelector('img') && {
        src: card.querySelector('img')?.getAttribute('src'),
        width: card.querySelector('img')?.getAttribute('width'),
        height: card.querySelector('img')?.getAttribute('height'),
      },
      kinds: [...card.querySelectorAll('[data-kind]')].map((k) => k.getAttribute('data-kind')),
    })),
  );
  if (cards.length === 0 && catalog.themes.length > 0) failures.push('row "grid": the page shows no theme card');
  for (const theme of catalog.themes) {
    const card = cards.find((c) => c.id === theme.id);
    if (!card) {
      failures.push(`row "grid": no card for ${theme.id}`);
      continue;
    }
    if (card.name !== theme.name) failures.push(`row "grid": ${theme.id}'s card is named "${card.name}", not "${theme.name}"`);
    if (!card.text.includes(theme.description)) failures.push(`row "grid": ${theme.id}'s card lacks its description`);
    if (!card.img || card.img.src !== theme.card.url || card.img.width !== String(theme.card.width) || card.img.height !== String(theme.card.height)) {
      failures.push(`row "grid": ${theme.id}'s card image is not ${theme.card.url} at ${theme.card.width} by ${theme.card.height}`);
    }
    if (card.kinds.join(',') !== theme.kinds.join(',')) failures.push(`row "grid": ${theme.id}'s card shows kinds [${card.kinds}], not [${theme.kinds}]`);
  }

  const kindRow = await page.evaluate(() => {
    const fieldset = document.querySelector('[data-row="kind-filter"]');
    const visible = fieldset instanceof HTMLElement && !fieldset.closest('[hidden]') && fieldset.offsetParent !== null;
    const choices = [...document.querySelectorAll('input[name="kind"]')].map((input) => ({
      value: input.getAttribute('value'),
      text: input.closest('label')?.textContent ?? '',
    }));
    return { visible, choices };
  });
  if (catalog.kinds.length > 0) {
    if (!kindRow.visible) failures.push('row "kind filter": the catalog lists kinds but the page shows no kind filter');
    for (const kind of catalog.kinds) {
      const choice = kindRow.choices.find((c) => c.value === kind.id);
      if (!choice) failures.push(`row "kind filter": no choice for ${kind.id}`);
      else if (!choice.text.includes(kind.label) || !choice.text.includes(kind.description)) {
        failures.push(`row "kind filter": the ${kind.id} choice lacks its label or its description`);
      }
    }
  }

  const engineRow = await page.evaluate(() => {
    const input = document.querySelector('[data-row="engine-filter"] input');
    return input instanceof HTMLInputElement && input.labels !== null && input.labels.length > 0 && input.offsetParent !== null;
  });
  if (!engineRow) failures.push('row "engine filter": the page shows no labeled engine version field');
}

/**
 * Checks every row a theme's open page owes it, at the theme's newest release.
 * @param {import('playwright').Page} page
 * @param {any} theme
 * @param {string[]} failures
 */
async function checkThemeRows(page, theme, failures) {
  const newest = expectedRelease(theme, null);
  const shown = await page.evaluate(() => {
    const article = document.querySelector('[data-row="theme-page"]');
    if (!(article instanceof HTMLElement) || article.hidden) return null;
    const part = (name) => article.querySelector(`[data-part="${name}"]`);
    return {
      title: article.querySelector('h2')?.textContent?.trim() ?? '',
      text: article.textContent ?? '',
      version: part('version')?.getAttribute('data-version') ?? '',
      summary: part('summary')?.textContent?.trim() ?? null,
      shots: [...(part('screenshots')?.querySelectorAll('img') ?? [])].map((img) => ({
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt'),
        width: img.getAttribute('width'),
        height: img.getAttribute('height'),
      })),
      demo: part('demo')?.getAttribute('href') ?? null,
      history: [...(part('history')?.querySelectorAll('li') ?? [])].map((li) => ({
        version: li.getAttribute('data-version'),
        engine: li.getAttribute('data-engine'),
        date: li.querySelector('time')?.getAttribute('datetime') ?? '',
        notes: li.querySelector('[data-part="notes"]')?.textContent?.trim() ?? '',
      })),
      install: part('install')?.querySelector('code')?.textContent?.trim() ?? null,
      options: part('options')?.textContent ?? '',
      fonts: part('fonts')?.textContent ?? '',
      modes: part('color-modes')?.textContent ?? '',
      license: part('license')?.textContent?.trim() ?? '',
      author: part('author')?.textContent?.trim() ?? '',
      repository: part('repository')?.getAttribute('href') ?? null,
    };
  });
  const where = `${theme.id}'s page`;
  if (!shown) return failures.push(`row "theme page": opening ${theme.id}'s card shows no theme page`);
  if (shown.title !== theme.name) failures.push(`row "theme page": ${where} is titled "${shown.title}", not "${theme.name}"`);
  if (shown.version !== newest.version) failures.push(`row "theme page": ${where} shows version ${shown.version}, not ${newest.version}`);
  if (theme.summary && shown.summary !== theme.summary) failures.push(`row "theme page": ${where} lacks its summary`);
  const shots = newest.screenshots ?? [];
  if (shown.shots.length !== shots.length) failures.push(`row "theme page": ${where} shows ${shown.shots.length} screenshots, not ${shots.length}`);
  for (const shot of shots) {
    const img = shown.shots.find((s) => s.src === shot.url);
    if (!img) failures.push(`row "theme page": ${where} lacks the screenshot ${shot.url}`);
    else if (img.alt !== shot.shows || img.width !== String(shot.width) || img.height !== String(shot.height)) {
      failures.push(`row "theme page": ${where} shows ${shot.url} without its text or its size`);
    }
  }
  for (const option of newest.options ?? []) {
    const words = [option.label, ...(option.values ?? []).map((v) => v.label)];
    if (!words.every((w) => shown.options.includes(w))) failures.push(`row "theme page": ${where} lacks the option "${option.label}" or its values`);
  }
  for (const font of newest.fonts ?? []) {
    if (!shown.fonts.includes(font.name)) failures.push(`row "theme page": ${where} lacks the font ${font.name}`);
  }
  for (const mode of [newest.colorModes?.light, newest.colorModes?.dark]) {
    if (!mode || !shown.modes.includes(mode)) failures.push(`row "theme page": ${where} lacks the color mode ${mode}`);
  }
  if (shown.license !== theme.license) failures.push(`row "theme page": ${where} lacks its license`);
  if (!shown.author.includes(theme.author.name)) failures.push(`row "theme page": ${where} lacks its author`);
  if (theme.repository && shown.repository !== theme.repository) failures.push(`row "theme page": ${where} lacks its repository link`);
  if (shown.demo !== theme.demo) failures.push(`row "demo link": ${where} links the demo as ${shown.demo}, not ${theme.demo}`);

  const releases = [...theme.releases].sort((a, b) => semver.rcompare(a.version, b.version));
  const history = shown.history.map((h) => h.version).join(', ');
  if (history !== releases.map((r) => r.version).join(', ')) failures.push(`row "version history": ${where} lists [${history}]`);
  for (const release of releases) {
    const entry = shown.history.find((h) => h.version === release.version);
    if (entry && (entry.engine !== release.engine || entry.date !== release.date || entry.notes !== release.notes)) {
      failures.push(`row "version history": ${where} shows ${release.version} without its date, notes, or engine`);
    }
  }
  const command = `cairn new --theme ${theme.id}`;
  if (shown.install !== command) failures.push(`row "install command": ${where} shows ${JSON.stringify(shown.install)}, not "${command}"`);
}

/** The page's width against the viewport's, at one width, on whatever view is open. */
async function measure(page, width, view) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  return { width, view, scrollWidth, innerWidth };
}

/**
 * Runs the whole check against one catalog address.
 * @param {object} options
 * @param {string} options.catalog the catalog's address
 * @param {string} [options.page] the page file to serve, the committed reference page unless given
 * @param {typeof fetch} [options.fetch] the fetch node reads addresses with
 * @returns {Promise<CheckResult>}
 */
export async function runReferenceCheck({ catalog: catalogUrl, page: pageFile = PAGE_FILE, fetch: fetchImpl = globalThis.fetch }) {
  /** @type {CheckResult} */
  const result = {
    failures: [],
    viewports: [],
    observed: { all: [], kinds: {}, engines: {} },
    requests: [],
    themes: 0,
    kinds: 0,
  };
  const { failures } = result;

  const fetched = await read(fetchImpl, catalogUrl);
  if (fetched.status !== 200) {
    failures.push(`the catalog at ${catalogUrl} answered ${fetched.status || fetched.error}`);
    return result;
  }
  let catalog;
  try {
    catalog = JSON.parse(fetched.body);
  } catch {
    failures.push(`the catalog at ${catalogUrl} is not JSON`);
    return result;
  }
  result.themes = catalog.themes?.length ?? 0;
  result.kinds = catalog.kinds?.length ?? 0;

  await checkAddresses(catalog, fetchImpl, failures);

  const server = await servePage(pageFile);
  const pageUrl = `${server.origin}/?catalog=${encodeURIComponent(catalogUrl)}`;
  const catalogHref = new URL(catalogUrl).href;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let catalogReads = 0;
    page.on('request', (request) => {
      const url = request.url();
      const type = request.resourceType();
      result.requests.push(`${type} ${url}`);
      // A data URL never leaves the page.
      if (url.startsWith('data:')) return;
      if (type === 'document' && url === pageUrl) return;
      if (url === catalogHref) {
        catalogReads += 1;
        return;
      }
      if (type === 'image') return;
      failures.push(`unexpected request: ${type} ${url}`);
    });
    page.on('pageerror', (error) => failures.push(`the page threw: ${error.message}`));

    await page.goto(pageUrl, { waitUntil: 'load' });
    await waitReady(page);
    const problem = await page.$eval('#problem', (node) => (node instanceof HTMLElement && !node.hidden ? node.textContent?.trim() ?? '' : ''));
    if (problem) {
      failures.push(`the page could not read the catalog: ${problem}`);
      return result;
    }

    await checkBrowseRows(page, catalog, failures);
    result.observed.all = await readGrid(page);

    for (const width of WIDTHS) result.viewports.push(await measure(page, width, 'grid'));
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const theme of catalog.themes) {
      const link = page.locator(`#grid [data-theme="${theme.id}"] h3 a`);
      if ((await link.count()) === 0) continue;
      await link.click();
      await page.waitForSelector('[data-row="theme-page"]:not([hidden])', { timeout: READY_TIMEOUT_MS }).catch(() => {});
      await checkThemeRows(page, theme, failures);
      for (const width of WIDTHS) result.viewports.push(await measure(page, width, `${theme.id}'s page`));
      await page.setViewportSize({ width: 1440, height: 900 });
      const back = page.locator('[data-row="theme-page"] a[href="#"]');
      if ((await back.count()) > 0) await back.first().click();
      else await page.evaluate(() => (location.hash = ''));
      await page.waitForSelector('#grid', { state: 'visible', timeout: READY_TIMEOUT_MS }).catch(() => {});
    }

    const unfiltered = expectedShown(catalog);
    if (result.observed.all.join(' ') !== unfiltered.join(' ')) {
      failures.push(`with no choice the grid shows [${result.observed.all.join(', ')}], but the data says [${unfiltered.join(', ')}]`);
    }

    for (const kind of catalog.kinds) {
      const radio = page.locator(`input[name="kind"][value="${kind.id}"]`);
      if ((await radio.count()) === 0) continue;
      await radio.check();
      const seen = await readGrid(page);
      result.observed.kinds[kind.id] = seen;
      const want = expectedShown(catalog, { kind: kind.id });
      if (seen.join(' ') !== want.join(' ')) failures.push(`choosing the kind ${kind.id} shows [${seen.join(', ')}], but the data says [${want.join(', ')}]`);
    }
    const anyKind = page.locator('input[name="kind"][value=""]');
    if ((await anyKind.count()) > 0) await anyKind.check();

    const engineInput = page.locator('[data-row="engine-filter"] input');
    if ((await engineInput.count()) > 0) {
      for (const engine of engineChoices(catalog)) {
        await engineInput.fill(engine);
        const seen = await readGrid(page);
        result.observed.engines[engine] = seen;
        const want = expectedShown(catalog, { engine });
        if (seen.join(' ') !== want.join(' ')) failures.push(`choosing the engine ${engine} shows [${seen.join(', ')}], but the data says [${want.join(', ')}]`);
      }
      await engineInput.fill('');
    }

    for (const v of result.viewports) {
      if (v.scrollWidth > v.innerWidth) failures.push(`at ${v.width} pixels ${v.view} scrolls sideways (${v.scrollWidth} wide in ${v.innerWidth})`);
    }
    if (catalogReads !== 1) failures.push(`the page read the catalog ${catalogReads} times, not once`);
  } finally {
    await browser.close();
    await server.close();
  }
  return result;
}

/**
 * The command: runs the check and prints each failure, or a one-line summary.
 * @param {string[]} argv the arguments after the script name
 * @param {{ page?: string, print?: (line: string) => void }} [options] a page file to serve in
 *  place of the committed one, and where to print
 * @returns {Promise<number>} the exit code, 1 on any failure
 */
export async function main(argv, { page, print = (line) => console.log(line) } = {}) {
  const at = argv.indexOf('--catalog');
  if (at !== -1 && !argv[at + 1]) {
    print('reference-check: --catalog needs an address');
    return 2;
  }
  const catalog = at === -1 ? DEFAULT_CATALOG : argv[at + 1];
  const result = await runReferenceCheck({ catalog, page });
  if (result.failures.length > 0) {
    for (const failure of result.failures) print(`reference-check: FAIL ${failure}`);
    print(`reference-check: ${result.failures.length} failure${result.failures.length === 1 ? '' : 's'} against ${catalog}`);
    return 1;
  }
  const engines = Object.keys(result.observed.engines).length;
  print(
    `reference-check: ok against ${catalog}: ${result.themes} themes, ${result.kinds} kinds, ${engines} engine choices, ` +
      `${WIDTHS.length} widths, ${result.requests.length} requests`,
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
