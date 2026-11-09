// The viewer's interactive mode: `vite dev` on the scratch site, a control server beside it, and a
// watcher that copies edits from the theme directory across. An edit to a token source reruns the
// tokens build first, so the generated sheets follow.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync, watch } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { layIn } from '../lay-in.mjs';
import { renderControl } from './control.mjs';
import { answers, catalogThemes, chooseOptions, composeSite, freePort, listRoutes, readManifest, resolveTheme, startSite, writeOptions } from './site.mjs';

/** The quiet time after a theme edit before it is copied across. */
const DEBOUNCE_MS = 150;

/**
 * The JSON endpoints the control server answers, keyed `"<METHOD> <path>"`. Another module adds a
 * handler here, as the theme check's action does, with no change to the server below.
 * @typedef {Record<string, (context: ViewerContext, body: Record<string, string>) => unknown | Promise<unknown>>} EndpointRegistry
 */

/**
 * What a handler can read and change.
 * @typedef {object} ViewerContext
 * @property {string} root the repository root
 * @property {string} siteDir the scratch site
 * @property {import('./site.mjs').ThemeRef} theme the loaded theme
 * @property {Record<string, string>} options
 * @property {string} mode
 */

/**
 * Start interactive mode.
 * @param {object} request
 * @param {string} request.root the repository root
 * @param {string} [request.theme] a catalog id or a theme directory
 * @param {EndpointRegistry} [request.endpoints] extra JSON endpoints
 * @returns {Promise<{ controlUrl: string, siteUrl: string, stop: () => void }>}
 */
export async function startInteractive({ root, theme, endpoints = {} }) {
  const extra = resolveTheme(root, theme);
  const site = composeSite({ root, themeDir: extra.dir });

  /** @type {ViewerContext & { error?: string }} */
  const context = { root, siteDir: site.dir, theme: extra, options: {}, mode: 'light' };
  /** @type {import('node:fs').FSWatcher | undefined} */
  let watcher;
  /** @type {Set<string>} */
  let pending = new Set();
  /** @type {NodeJS.Timeout | undefined} */
  let timer;

  /** Write the options sheet for the current choices. */
  const writeSheet = () => writeOptions(site.dir, context.theme.dir, context.options, context.mode);

  /** Load a theme: lay it in unless the site already holds it, reset its options to the defaults, and watch its directory. */
  const load = (/** @type {import('./site.mjs').ThemeRef} */ ref, relay = true) => {
    if (relay) layIn(ref.dir, site.dir);
    const manifest = readManifest(ref.dir);
    context.theme = ref;
    context.options = chooseOptions(manifest);
    context.mode = Object.keys(manifest.colorModes).includes(context.mode) ? context.mode : Object.keys(manifest.colorModes)[0];
    writeSheet();
    watcher?.close();
    watcher = watch(ref.dir, { recursive: true }, (_event, name) => {
      if (name) pending.add(name.split(path.sep).join('/'));
      clearTimeout(timer);
      timer = setTimeout(sync, DEBOUNCE_MS);
    });
  };

  /** Copy a batch of theme edits to the scratch site, rebuilding the tokens first when a source changed. */
  const sync = () => {
    const changed = [...pending];
    pending = new Set();
    context.error = undefined;
    const themeDir = context.theme.dir;
    if (changed.some((name) => name === 'tokens/tokens.json' || name === 'tokens/resolver.json')) {
      const built = spawnSync(process.execPath, [path.join(root, 'scripts/theme/build-tokens.mjs'), themeDir], { encoding: 'utf8' });
      if (built.status !== 0) {
        context.error = `The tokens build failed: ${built.stderr || built.stdout}`;
        return;
      }
    }
    const target = path.join(site.dir, 'src/theme');
    for (const name of changed) {
      if (!existsSync(path.join(themeDir, name))) rmSync(path.join(target, name), { recursive: true, force: true });
    }
    cpSync(themeDir, target, { recursive: true, force: true, filter: (source) => path.relative(themeDir, source) !== 'screenshots' });
    try {
      writeSheet();
    } catch (error) {
      context.error = error instanceof Error ? error.message : String(error);
    }
  };

  // The theme composeSite laid in is already in place, and Vite starts after the options sheet is
  // written, so the server never sees the initial files change under it.
  load(extra, false);
  const dev = await startSite(site.dir, 'dev', 'THEME_VIEWER_SITE_PORT');

  /** @returns {import('./control.mjs').ViewState} */
  const state = () => {
    const manifest = readManifest(context.theme.dir);
    const themes = catalogThemes(root);
    if (!themes.some((t) => t.id === context.theme.id)) themes.push(context.theme);
    return {
      themes: themes.map((t) => ({ id: t.id, name: t.name })),
      theme: { id: manifest.id, name: manifest.name, options: manifest.options ?? [], modes: Object.keys(manifest.colorModes) },
      options: context.options,
      mode: context.mode,
      routes: listRoutes(site.dir),
      siteUrl: dev.url,
      error: context.error,
    };
  };

  /** @type {EndpointRegistry} */
  const registry = { 'GET /api/state': () => state(), ...endpoints };

  /** The form actions: each changes the loaded theme's choices, then the page reloads. */
  const actions = {
    '/api/theme': async (/** @type {Record<string, string>} */ body) => {
      const themes = catalogThemes(root);
      if (!themes.some((t) => t.id === extra.id)) themes.push(extra);
      const found = themes.find((t) => t.id === body.theme);
      if (!found) throw new Error(`no theme "${body.theme}"`);
      load(found);
      // The wholesale lay-in answers 500 for a moment while Vite re-reads the files, so the page
      // reloads only once the site is back.
      const deadline = Date.now() + 60_000;
      while (!(await answers(dev.url))) {
        if (Date.now() > deadline) throw new Error('the site did not recover after the theme was laid in');
        await new Promise((done) => setTimeout(done, 300));
      }
    },
    '/api/option': (/** @type {Record<string, string>} */ body) => {
      context.options = chooseOptions(readManifest(context.theme.dir), { ...context.options, [body.key]: body.value });
      writeSheet();
    },
    '/api/mode': (/** @type {Record<string, string>} */ body) => {
      context.mode = body.mode;
      writeSheet();
    },
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    try {
      const body = req.method === 'POST' ? Object.fromEntries(new URLSearchParams(await readBody(req))) : {};
      const handler = registry[`${req.method} ${url.pathname}`];
      if (handler) {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(await handler(context, body)));
      } else if (req.method === 'POST' && url.pathname in actions) {
        await actions[/** @type {keyof typeof actions} */ (url.pathname)](body);
        res.statusCode = 303;
        res.setHeader('location', `/?page=${encodeURIComponent(body.page ?? '/')}&width=${body.width ?? 1440}`);
        res.end();
      } else if (req.method === 'GET' && url.pathname === '/') {
        const width = Number(url.searchParams.get('width')) || 1440;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(renderControl(state(), { page: url.searchParams.get('page') ?? '/', width }));
      } else {
        res.statusCode = 404;
        res.end('not found');
      }
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : String(error));
    }
  });
  const port = await freePort('THEME_VIEWER_PORT');
  await new Promise((done) => server.listen(port, '127.0.0.1', () => done(undefined)));

  return {
    controlUrl: `http://127.0.0.1:${port}`,
    siteUrl: dev.url,
    stop: () => {
      watcher?.close();
      server.close();
      dev.stop();
      site.remove();
    },
  };
}

/**
 * Read a request's body as text.
 * @param {http.IncomingMessage} req
 * @returns {Promise<string>}
 */
async function readBody(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text;
}
