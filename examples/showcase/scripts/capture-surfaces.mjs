// Chassis-B's own capture tool: shoots the showcase's public and admin surfaces across the
// five-viewport bar in both color schemes, tiles each full-page image for a grading agent, and
// writes a manifest a later pass can diff against. Derived from the 2026-08-15 reference-capture
// tool (`git show 274374f2^:examples/showcase/scripts/reference-capture.mjs`), which already
// solved the preview-server recipe and the admin theme cookie; this tool generalizes that shape
// into a surface/width/scheme matrix instead of a fixed screen list. It starts its own preview
// server (the exact `playwright.config.ts` webServer recipe) and tears it down on exit, rather
// than connecting to a server the caller happens to have running, so a capture always proves the
// current build.
//
// AVAILABILITY UNDER `vite preview` (checked 2026-09-08 against a `VITE_CAIRN_E2E=1 npm run
// build` + `npm run preview -- --port 4173` server with `CAIRN_DEV_BACKEND=1`):
//   - home, article, styleguide: render normally (200).
//   - signups (`/admin/signups`): renders normally (200); the dev backend mints an owner editor
//     on every `/admin` request, so no session cookie or login flow is needed, only the
//     `cairn-admin-theme` cookie for the color scheme.
//   - archive2 (`/archive/2`): renders normally (200) now that `ARCHIVE_PAGE_SIZE`
//     (`src/chassis/archive.ts`) crosses the showcase's own corpus, producing a real page two.
//     It carries no page-level `h1` of its own (the home route's h1 is the one the archive
//     shares), so it waits on its own year heading instead of `waitForHeading`'s `h1`.
//   - error404 (an unmatched path): the root `+error.svelte` DOES render under `vite preview`
//     for a genuinely unmatched route, full SSR, status 404, with the site's own nav and footer.
//     Unlike archive2, this surface's whole point is to capture that rendered error page, so a
//     404 status here is captured as content rather than written as `.missing`.
import { chromium } from 'playwright-core';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const SHOWCASE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
// Matches playwright.config.ts's webServer timeout exactly, since this tool runs the identical
// build-then-preview recipe and a slower machine needs the same budget the e2e suite gets.
const SERVER_TIMEOUT_MS = 120_000;
const WIDTHS = [320, 390, 768, 1440, 2560];
const SCHEMES = ['light', 'dark'];

// Bands of at most 1400 CSS px with a 60 px overlap between consecutive tiles, numbered from
// the top, so a grading agent reads a bounded set of images instead of one very tall file.
const TILE_BAND = 1400;
const TILE_OVERLAP = 60;

async function waitForHeading(page) {
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10_000 });
}

// /archive/[page] is a continuation page with no page-level h1 of its own (the home route
// carries the one h1 the archive shares); its year marker is the first heading that settles
// the DOM.
async function waitForYearHeading(page) {
  await page.locator('h3').first().waitFor({ state: 'visible', timeout: 10_000 });
}

async function waitForImages(page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
}

// The surface matrix. `expectStatus` names the status this surface's render is judged against;
// a response outside it writes `.missing` UNLESS `captureError` says the surface is itself an
// error page under test (error404), in which case the mismatched status is the point.
const SURFACES = [
  {
    name: 'home',
    path: '/',
    kind: 'public',
    expectStatus: 200,
    waitFor: waitForHeading,
  },
  {
    name: 'article',
    path: '/posts/the-reading-surface',
    kind: 'public',
    expectStatus: 200,
    waitFor: async (page) => {
      await waitForHeading(page);
      await waitForImages(page);
    },
    // The clamp-slope test's own mid-range baseline: an extra light-only capture at 1920 so
    // that baseline has a before too (site-visual.spec.ts's site-article-light-1920 test).
    extraWidths: [{ width: 1920, scheme: 'light' }],
  },
  {
    name: 'styleguide',
    path: '/styleguide',
    kind: 'public',
    expectStatus: 200,
    waitFor: waitForHeading,
  },
  {
    name: 'archive2',
    path: '/archive/2',
    kind: 'public',
    expectStatus: 200,
    waitFor: waitForYearHeading,
  },
  {
    name: 'error404',
    path: '/this-surface-does-not-exist',
    kind: 'public',
    expectStatus: 404,
    captureError: true,
    waitFor: waitForHeading,
  },
  {
    name: 'signups',
    path: '/admin/signups',
    kind: 'admin',
    expectStatus: 200,
    waitFor: waitForHeading,
  },
];

function parseArgs(argv) {
  const args = { out: null, only: null, focus: null };
  const requireValue = (flag, i) => {
    const value = argv[i];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') args.out = requireValue(arg, ++i);
    else if (arg === '--only') {
      args.only = requireValue(arg, ++i)
        .split(',')
        .map((s) => s.trim());
    } else if (arg === '--focus') args.focus = requireValue(arg, ++i);
    else throw new Error(`Unrecognized argument: ${arg}`);
  }
  if (!args.out) throw new Error('--out <dir> is required');
  return args;
}

function computeTiles(height) {
  if (height <= TILE_BAND) return [{ y: 0, height }];
  const step = TILE_BAND - TILE_OVERLAP;
  const tiles = [];
  let y = 0;
  while (y < height) {
    const h = Math.min(TILE_BAND, height - y);
    tiles.push({ y, height: h });
    if (y + h >= height) break;
    y += step;
  }
  return tiles;
}

async function sha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function newPage(browser, { width, height = 800, scheme, kind }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    baseURL: BASE,
  });
  if (kind === 'admin') {
    const themeCookie = scheme === 'dark' ? 'cairn-admin-dark' : 'cairn-admin';
    await context.addCookies([{ name: 'cairn-admin-theme', value: themeCookie, url: BASE }]);
  }
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme });
  return { context, page };
}

// Tabs from the top of the document until `document.activeElement` matches `selector` (or the
// budget runs out), for `--focus`'s "capture a focused control" mode.
async function tabToFocus(page, selector, maxPresses = 40) {
  for (let i = 0; i < maxPresses; i++) {
    const matched = await page.evaluate(
      (sel) => document.activeElement instanceof Element && document.activeElement.matches(sel),
      selector,
    );
    if (matched) return true;
    await page.keyboard.press('Tab');
  }
  return false;
}

async function captureOne(browser, outDir, surface, width, scheme, focusSelector, manifest) {
  const suffix = focusSelector ? '-focus' : '';
  const stem = `${surface.name}-${scheme}-${width}${suffix}`;
  const { context, page } = await newPage(browser, { width, scheme, kind: surface.kind });
  try {
    const response = await page.goto(surface.path, { waitUntil: 'load' });
    const status = response ? response.status() : 0;
    const missingByStatus = status !== surface.expectStatus && !surface.captureError;
    if (missingByStatus) {
      await writeFile(
        path.join(outDir, `${stem}.missing`),
        `HTTP ${status}, expected ${surface.expectStatus}\n`,
      );
      console.log(`MISSING ${stem}: HTTP ${status}`);
      return;
    }
    try {
      await surface.waitFor(page);
    } catch (error) {
      await writeFile(path.join(outDir, `${stem}.missing`), `${error.message}\n`);
      console.log(`MISSING ${stem}: ${error.message.split('\n')[0]}`);
      return;
    }
    if (focusSelector) {
      const focused = await tabToFocus(page, focusSelector);
      if (!focused) {
        await writeFile(
          path.join(outDir, `${stem}.missing`),
          `--focus selector "${focusSelector}" never received focus within the tab budget\n`,
        );
        console.log(`MISSING ${stem}: focus target not reached`);
        return;
      }
    }

    const fullDir = path.join(outDir, 'full');
    const tilesDir = path.join(outDir, 'tiles');
    await mkdir(fullDir, { recursive: true });
    await mkdir(tilesDir, { recursive: true });

    const fullFile = path.join(fullDir, `${stem}.png`);
    await page.screenshot({ path: fullFile, fullPage: true });
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const fullSha = await sha256(fullFile);
    manifest.push({
      file: path.relative(outDir, fullFile),
      surface: surface.name,
      scheme,
      width,
      tile: null,
      pixelWidth: width,
      pixelHeight: documentHeight,
      sha256: fullSha,
    });

    const tiles = computeTiles(documentHeight);
    for (const [index, tile] of tiles.entries()) {
      const tileFile = path.join(tilesDir, `${stem}-${String(index).padStart(2, '0')}.png`);
      await run('magick', [
        fullFile,
        '-crop',
        `${width}x${tile.height}+0+${tile.y}`,
        '+repage',
        tileFile,
      ]);
      const tileSha = await sha256(tileFile);
      manifest.push({
        file: path.relative(outDir, tileFile),
        surface: surface.name,
        scheme,
        width,
        tile: index,
        pixelWidth: width,
        pixelHeight: tile.height,
        sha256: tileSha,
      });
    }
    console.log(`OK ${stem} (${tiles.length} tile${tiles.length === 1 ? '' : 's'})`);
  } finally {
    await context.close();
  }
}

/** Poll `url` until it answers (any status short of a connection failure counts as up), or
 *  throw once `timeoutMs` elapses. */
async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      // Not up yet; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not answer within ${timeoutMs}ms`);
}

/** True if something already answers at `url`. Used before spawning, so a stray server never
 *  gets captured against silently: this tool always proves the build it just started. */
async function isServerUp(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

/** Starts the showcase preview server with the exact `playwright.config.ts` webServer recipe
 *  (`VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port 4173`, `CAIRN_DEV_BACKEND=1`),
 *  detached into its own process group so the whole group can be killed on teardown, and waits
 *  for it to answer within the config's 120s budget. Refuses to run if port 4173 already has a
 *  listener, since capturing against a server this tool did not start is a silent-wrong-build
 *  hazard. */
async function startServer() {
  if (await isServerUp(BASE)) {
    throw new Error(
      `Something is already listening on port ${PORT}; refusing to capture against an unknown ` +
        `server. Stop it first, then rerun so this tool starts the server itself.`,
    );
  }
  const child = spawn(
    'sh',
    ['-c', `VITE_CAIRN_E2E=1 npm run build && npm run preview -- --port ${PORT}`],
    {
      cwd: SHOWCASE_DIR,
      env: { ...process.env, CAIRN_DEV_BACKEND: '1' },
      detached: true,
      stdio: 'ignore',
    },
  );
  try {
    await waitForServer(BASE, SERVER_TIMEOUT_MS);
  } catch (error) {
    stopServer(child);
    throw error;
  }
  return child;
}

/** Kills the whole process group the server was spawned into, so `npm run build && npm run
 *  preview`'s child processes (the actual preview server) die too, not just the shell. */
function stopServer(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // Already exited.
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(args.out);
  const existing = await readdir(outDir).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  if (existing.length > 0) {
    throw new Error(`--out ${outDir} is not empty; capture directories are write-once`);
  }
  await mkdir(outDir, { recursive: true });

  const surfaces = args.only
    ? SURFACES.filter((surface) => args.only.includes(surface.name))
    : SURFACES;
  if (surfaces.length === 0) {
    throw new Error(
      `--only matched no known surface (known: ${SURFACES.map((s) => s.name).join(', ')})`,
    );
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const manifest = [];
  try {
    for (const surface of surfaces) {
      for (const scheme of SCHEMES) {
        for (const width of WIDTHS) {
          await captureOne(browser, outDir, surface, width, scheme, args.focus, manifest);
        }
      }
      for (const extra of surface.extraWidths ?? []) {
        await captureOne(browser, outDir, surface, extra.width, extra.scheme, args.focus, manifest);
      }
    }
  } finally {
    await browser.close();
    stopServer(server);
  }

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest with ${manifest.length} entries to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
