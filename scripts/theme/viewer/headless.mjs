// The viewer's headless mode: build the scratch site once per option combination and color mode,
// serve the built output, load each page at each width in Playwright Chromium, and save a PNG. No
// cookie is set, so the mode sheet in `theme-options.css` decides light or dark.
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  buildSite,
  chooseOptions,
  composeSite,
  listRoutes,
  readManifest,
  resolveTheme,
  startSite,
  writeOptions,
} from './site.mjs';

/** The viewport height a viewport-only shot and a full-page shot's first screen share. */
const VIEWPORT_HEIGHT = 960;

/**
 * One saved page, the shape the JSON list carries.
 * @typedef {object} Shot
 * @property {string} page the route requested
 * @property {string} url the address loaded
 * @property {number} status the HTTP status of the page's response
 * @property {string} theme the theme's id
 * @property {Record<string, string>} options the value chosen for each option key
 * @property {string} mode the color mode
 * @property {number} width the viewport width in pixels
 * @property {string} file the PNG's absolute path
 * @property {string[]} consoleErrors each console error and uncaught page error the load raised
 */

/**
 * Every combination of the option values asked for. An option with no values asked for keeps its
 * default.
 * @param {any} manifest
 * @param {Record<string, string[]>} asked the values wanted per option key
 * @returns {Record<string, string>[]}
 */
export function combinations(manifest, asked) {
  /** @type {Record<string, string>[]} */
  let out = [{}];
  for (const key of Object.keys(asked)) {
    out = out.flatMap((partial) => asked[key].map((value) => ({ ...partial, [key]: value })));
  }
  return out.map((chosen) => chooseOptions(manifest, chosen));
}

/**
 * Run the headless mode.
 * @param {object} request
 * @param {string} request.root the repository root
 * @param {string} [request.theme] a catalog id or a theme directory
 * @param {string[] | 'all'} request.pages routes to load, or every route the content serves
 * @param {number[]} request.widths viewport widths
 * @param {string[]} [request.modes] color modes; the theme's own when omitted
 * @param {Record<string, string[]>} [request.options] the values to build per option key
 * @param {boolean} [request.viewportOnly] save the first screen rather than the full page
 * @param {string} [request.outDir] where the PNGs go; a fresh temporary directory when omitted
 * @param {(shot: Shot, body: string, siteDir: string) => void} [request.inspect] called with each
 *   page's response body, for a caller that checks content as well as pixels
 * @returns {Promise<Shot[]>}
 */
export async function runHeadless({ root, theme, pages, widths, modes, options = {}, viewportOnly = false, outDir, inspect }) {
  const ref = resolveTheme(root, theme);
  const manifest = readManifest(ref.dir);
  const wantedModes = modes ?? Object.keys(manifest.colorModes);
  const out = outDir ?? mkdtempSync(path.join(tmpdir(), 'cairn-theme-view-'));
  mkdirSync(out, { recursive: true });
  const site = composeSite({ root, themeDir: ref.dir });
  /** @type {Shot[]} */
  const shots = [];
  const browser = await chromium.launch();
  try {
    const routes = pages === 'all' ? listRoutes(site.dir) : pages;
    for (const chosen of combinations(manifest, options)) {
      for (const mode of wantedModes) {
        writeOptions(site.dir, ref.dir, chosen, mode);
        buildSite(site.dir);
        const server = await startSite(site.dir, 'preview', 'THEME_VIEWER_SITE_PORT');
        try {
          for (const width of widths) {
            const context = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT }, colorScheme: 'light' });
            try {
              for (const route of routes) {
                const shot = await captureOne({ context, server, route, ref, chosen, mode, width, out, viewportOnly, inspect, siteDir: site.dir });
                shots.push(shot);
              }
            } finally {
              await context.close();
            }
          }
        } finally {
          server.stop();
        }
      }
    }
  } finally {
    await browser.close();
    site.remove();
  }
  return shots;
}

/**
 * Load one page and save its PNG.
 * @param {object} job
 * @param {import('playwright').BrowserContext} job.context
 * @param {{ url: string }} job.server
 * @param {string} job.route
 * @param {{ id: string }} job.ref
 * @param {Record<string, string>} job.chosen
 * @param {string} job.mode
 * @param {number} job.width
 * @param {string} job.out
 * @param {boolean} job.viewportOnly
 * @param {string} job.siteDir
 * @param {((shot: Shot, body: string, siteDir: string) => void) | undefined} job.inspect
 * @returns {Promise<Shot>}
 */
async function captureOne({ context, server, route, ref, chosen, mode, width, out, viewportOnly, inspect, siteDir }) {
  const page = await context.newPage();
  /** @type {string[]} */
  const consoleErrors = [];
  const url = `${server.url}${route}`;
  // A page's own 4xx response logs a resource-load error for the document itself; that status is
  // reported in `status`, so the log line is not also a console error.
  page.on('console', (message) => {
    if (message.type() === 'error' && message.location().url !== url) consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  try {
    const response = await page.goto(url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const body = await response.text().catch(() => '');
    const optionKey = Object.entries(chosen).map(([key, value]) => `${key}-${value}`).join('_') || 'no-options';
    const slug = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/[^A-Za-z0-9.-]+/g, '-');
    const file = path.join(out, `${ref.id}--${optionKey}--${mode}--${width}--${slug}.png`);
    await page.screenshot({ path: file, fullPage: !viewportOnly });
    /** @type {Shot} */
    const shot = { page: route, url, status: response.status(), theme: ref.id, options: chosen, mode, width, file, consoleErrors };
    inspect?.(shot, body, siteDir);
    return shot;
  } finally {
    await page.close();
  }
}
