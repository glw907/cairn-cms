// The viewer's interactive mode on a copied options fixture: the control page lists the routes, the
// accent values, and the widths, a token edit reaches the served page, and a theme pick lays the
// theme in.
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
import { chromium } from 'playwright';
import { startInteractive } from './viewer/interactive.mjs';
import { copyOptionsFixture } from './viewer/fixture.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const WAIT_MS = 90_000;

/** The permalinks the conformance set serves, from its committed manifest. */
function conformanceRoutes() {
  const index = JSON.parse(readFileSync(path.join(REPO, 'scripts/theme/conformance/src/content/.cairn/index.json'), 'utf8'));
  return index.entries.filter((e) => e.concept !== 'fragments').map((e) => e.permalink);
}

test('the control page lists the routes, values, and widths, and a token edit reaches the page', { timeout: 400_000 }, async () => {
  const fixture = copyOptionsFixture();
  const viewer = await startInteractive({ root: REPO, theme: fixture.dir });
  const browser = await chromium.launch();
  try {
    const html = await (await fetch(viewer.controlUrl)).text();
    for (const route of conformanceRoutes()) assert.ok(html.includes(`>${route}</a>`), `the page list names ${route}`);
    for (const label of ['Ember', 'Tide']) assert.ok(html.includes(`>${label}</button>`), `the accent value ${label} is offered`);
    for (const width of [320, 390, 768, 1440, 2560]) assert.ok(html.includes(`>${width}</a>`), `the width ${width} is offered`);

    const page = await browser.newPage({ colorScheme: 'light' });
    // Vite's dev server can refuse or stall a request while it settles, so a failed load reads as no value.
    const accent = async () => {
      try {
        await page.goto(`${viewer.siteUrl}/`, { waitUntil: 'load', timeout: 15_000 });
        return await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim());
      } catch {
        return '';
      }
    };
    /** Read the accent until it equals the wanted value, or the wait runs out; returns the last read. */
    const accentBecomes = async (/** @type {string} */ wanted) => {
      const deadline = Date.now() + WAIT_MS;
      let value = await accent();
      while (value !== wanted && Date.now() < deadline) {
        await new Promise((done) => setTimeout(done, 500));
        value = await accent();
      }
      return value;
    };
    assert.equal(await accentBecomes('oklch(55% 0.16 40)'), 'oklch(55% 0.16 40)', 'the default option value is served');

    // Edit the ember accent's light value in the copy's token source; the watcher rebuilds the sheets.
    const tokensFile = path.join(fixture.dir, 'tokens/tokens.json');
    const edited = readFileSync(tokensFile, 'utf8').replace('"components": [0.55, 0.16, 40]', '"components": [0.6, 0.2, 100]');
    assert.notEqual(edited, readFileSync(tokensFile, 'utf8'), 'the edit finds the accent');
    writeFileSync(tokensFile, edited);
    assert.equal(
      await accentBecomes('oklch(60% 0.2 100)'),
      'oklch(60% 0.2 100)',
      `the served --color-accent follows the token edit within ${WAIT_MS / 1000}s`,
    );

    // A pick lays the chosen theme in: the state names it and its site still answers.
    const pick = await fetch(`${viewer.controlUrl}/api/theme`, {
      method: 'POST',
      body: new URLSearchParams({ theme: 'waymark', page: '/', width: '1440' }),
      redirect: 'manual',
    });
    assert.equal(pick.status, 303);
    const state = await (await fetch(`${viewer.controlUrl}/api/state`)).json();
    assert.equal(state.theme.id, 'waymark');
    assert.equal((await fetch(`${viewer.siteUrl}/`)).status, 200);
  } finally {
    await browser.close();
    viewer.stop();
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
