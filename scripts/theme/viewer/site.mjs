// The viewer's scratch site: finding a theme, composing the showcase copy with the standard content,
// writing the options sheet, and running the site's build, preview, and dev servers. Nothing here
// reaches a Cloudflare API. The adapter's build reads `wrangler.jsonc` but never signs in, and
// `vite dev` runs its platform proxy locally (the showcase config sets `remoteBindings: false`), so a
// workstation with no account runs every step.
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { stripMarkedBlocks } from '../../build/emit-template.mjs';
import { makeShowcaseCopy } from '../../lab/theme-fixture-copy.mjs';
import { layIn } from '../lay-in.mjs';

/** The five widths the family's bar names. */
export const WIDTHS = [320, 390, 768, 1440, 2560];

/** The route the viewer requests to reach the site's 404 page. */
export const MISSING_ROUTE = '/viewer-missing-page';

/**
 * A theme the viewer can load.
 * @typedef {object} ThemeRef
 * @property {string} id the manifest's id
 * @property {string} name the manifest's name
 * @property {string} dir the theme directory
 */

/**
 * Read a theme directory's manifest.
 * @param {string} dir
 * @returns {any} the parsed `cairn-theme.json`
 */
export function readManifest(dir) {
  const file = path.join(dir, 'cairn-theme.json');
  if (!existsSync(file)) throw new Error(`viewer: ${path.resolve(dir)} has no cairn-theme.json, so it is not a theme directory`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The themes in the catalog, each read through its manifest.
 * @param {string} root the repository root
 * @returns {ThemeRef[]}
 */
export function catalogThemes(root) {
  const catalog = JSON.parse(readFileSync(path.join(root, 'templates/catalog.json'), 'utf8'));
  // A catalog theme lives at `themes/<id>/`; the entry's `path` names its template, not the theme.
  return catalog.themes.map((/** @type {{ id: string }} */ entry) => {
    const dir = path.join(root, 'themes', entry.id);
    const manifest = readManifest(dir);
    return { id: manifest.id, name: manifest.name, dir };
  });
}

/**
 * Find a theme by catalog id or by directory. A value that names an existing directory wins; any
 * other value is a catalog id. With no value the first catalog theme loads.
 * @param {string} root the repository root
 * @param {string} [spec] a catalog id or a path
 * @returns {ThemeRef}
 */
export function resolveTheme(root, spec) {
  if (spec && existsSync(path.resolve(spec))) {
    const dir = path.resolve(spec);
    const manifest = readManifest(dir);
    return { id: manifest.id, name: manifest.name, dir };
  }
  const themes = catalogThemes(root);
  const found = spec ? themes.find((theme) => theme.id === spec) : themes[0];
  if (!found) throw new Error(`viewer: no theme "${spec}" in templates/catalog.json and no directory by that name`);
  return found;
}

/**
 * The option choices for a theme: each manifest option's default, overridden by the given values.
 * @param {any} manifest
 * @param {Record<string, string>} [chosen]
 * @returns {Record<string, string>}
 */
export function chooseOptions(manifest, chosen = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const option of manifest.options ?? []) {
    const value = chosen[option.key] ?? option.default;
    if (!option.values.some((/** @type {{ value: string }} */ v) => v.value === value)) {
      throw new Error(`viewer: "${value}" is not a value of the option "${option.key}"`);
    }
    out[option.key] = value;
  }
  for (const key of Object.keys(chosen)) {
    if (!(key in out)) throw new Error(`viewer: the theme has no option "${key}"`);
  }
  return out;
}

/**
 * Write the scratch site's `src/site/theme-options.css`: the chosen option sheets in manifest order,
 * then the color-mode sheet, concatenated as setup does, so the cascade position matches a site's.
 * A sheet the theme does not ship is skipped.
 * @param {string} siteDir the scratch site
 * @param {string} themeDir the theme the site holds
 * @param {Record<string, string>} options the chosen value for each option key
 * @param {string} mode a key of the manifest's `colorModes`
 * @returns {string} the text written
 */
export function writeOptions(siteDir, themeDir, options, mode) {
  const manifest = readManifest(themeDir);
  if (!(mode in manifest.colorModes)) throw new Error(`viewer: "${mode}" is not a color mode of ${manifest.id}`);
  const sheets = [
    ...(manifest.options ?? []).map((/** @type {{ key: string }} */ option) => `options/${option.key}/${options[option.key]}.css`),
    `modes/${mode}.css`,
  ];
  const text = sheets
    .map((sheet) => path.join(themeDir, sheet))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('');
  writeFileSync(path.join(siteDir, 'src/site/theme-options.css'), text);
  return text;
}

/**
 * Compose a scratch site: a showcase copy with the template's exclusions applied, the starter
 * overlay and the conformance set as its content and static files, the content manifest regenerated,
 * the admin stylesheet built, and a theme laid in.
 * @param {object} options
 * @param {string} options.root the repository root
 * @param {string} options.themeDir the theme to lay in
 * @returns {{ dir: string, remove: () => void }}
 */
export function composeSite({ root, themeDir }) {
  const copy = makeShowcaseCopy({ root });
  const dir = copy.dir;
  const exclusions = JSON.parse(readFileSync(path.join(root, 'examples/showcase/.cairn-template.json'), 'utf8')).exclude;
  for (const entry of exclusions) rmSync(path.join(dir, entry), { recursive: true, force: true });
  // The route exclusions leave the menu entry that links /styleguide, which fails the prerender crawl.
  // The template drops that entry with its marker block, so the copy does too.
  const siteConfig = path.join(dir, 'src/site/site.config.yaml');
  writeFileSync(siteConfig, stripMarkedBlocks(readFileSync(siteConfig, 'utf8'), siteConfig));

  // The copy's node_modules is a link to the showcase's, so Vite's default cache there is shared by
  // every viewer process. Each copy keeps its own cache, so a build in one process never reads a
  // dependency pass that another process's dev server is rewriting.
  const viteConfig = path.join(dir, 'vite.config.ts');
  const configText = readFileSync(viteConfig, 'utf8');
  const opening = 'export default defineConfig({';
  if (!configText.includes(opening)) throw new Error('viewer: vite.config.ts has no defineConfig({ call to set the cache directory on');
  writeFileSync(viteConfig, configText.replace(opening, `${opening}\n  cacheDir: '.vite-cache',`));

  const overlay = path.join(root, 'scripts/build/starter-overlay');
  const conformance = path.join(root, 'scripts/theme/conformance');
  const content = path.join(dir, 'src/content');
  mkdirSync(content, { recursive: true });
  for (const set of [overlay, conformance]) {
    cpSync(path.join(set, 'src/content'), content, {
      recursive: true,
      filter: (source) => path.relative(path.join(set, 'src/content'), source).split(path.sep)[0] !== '.cairn',
    });
    cpSync(path.join(set, 'static'), path.join(dir, 'static'), { recursive: true });
  }
  layIn(themeDir, dir);
  mkdirSync(path.join(content, '.cairn'), { recursive: true });
  runNode(path.join(root, 'dist/vite/bin.js'), [], dir);
  runNode(path.join(dir, 'node_modules/@tailwindcss/cli/dist/index.mjs'), ['-i', 'src/admin.css', '-o', '.cairn/admin.css'], dir);

  return copy;
}

/**
 * The environment every child process gets: the caller's, with wrangler's metrics prompt off.
 * @returns {NodeJS.ProcessEnv}
 */
function childEnv() {
  return { ...process.env, WRANGLER_SEND_METRICS: 'false' };
}

/**
 * Run a Node script to completion, failing with its output on a nonzero exit.
 * @param {string} script
 * @param {string[]} args
 * @param {string} cwd
 */
function runNode(script, args, cwd) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, env: childEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`viewer: node ${path.relative(cwd, script)} ${args.join(' ')} failed (exit ${result.status}) in ${cwd}:\n${result.stdout}\n${result.stderr}`);
  }
}

/**
 * Build the scratch site.
 * @param {string} siteDir
 */
export function buildSite(siteDir) {
  runNode(path.join(siteDir, 'node_modules/vite/bin/vite.js'), ['build', '--logLevel', 'warn'], siteDir);
}

/**
 * A free port: the environment variable's value when set, otherwise one the system hands out.
 * @param {string} [variable] the environment variable that names a port
 * @returns {Promise<number>}
 */
export function freePort(variable) {
  const named = variable ? Number(process.env[variable]) : 0;
  if (named) return Promise.resolve(named);
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {net.AddressInfo} */ (server.address());
      server.close(() => resolve(port));
    });
  });
}

/**
 * Whether the site's home page answers 200.
 * @param {string} url the site's origin
 * @returns {Promise<boolean>}
 */
export async function answers(url) {
  try {
    return (await fetch(`${url}/`)).status === 200;
  } catch {
    return false;
  }
}

/**
 * A running Vite server.
 * @typedef {object} SiteServer
 * @property {string} url the origin, no trailing slash
 * @property {() => void} stop
 */

/**
 * Start `vite dev` or, for a built site, `wrangler dev` (local mode) in the scratch site and wait
 * until it answers. The adapter's output runs under workerd, which `vite preview` cannot load. A
 * port another process takes between the pick and the bind is retried with a new pick, unless the
 * environment variable pins the port.
 * @param {string} siteDir
 * @param {'preview' | 'dev'} command
 * @param {string} [portVariable] the environment variable that names the port
 * @returns {Promise<SiteServer>}
 */
export async function startSite(siteDir, command, portVariable) {
  const pinned = Boolean(portVariable && Number(process.env[portVariable]));
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await launch(siteDir, command, await freePort(portVariable));
    } catch (error) {
      if (pinned || attempt === 4 || !(error instanceof PortTaken)) throw error;
    }
  }
}

/** A launch that failed because its port was already bound. */
class PortTaken extends Error {}

/**
 * Launch one server on a port and wait until it reports ready and its home page answers.
 * @param {string} siteDir
 * @param {'preview' | 'dev'} command
 * @param {number} port
 * @returns {Promise<SiteServer>}
 */
async function launch(siteDir, command, port) {
  const url = `http://127.0.0.1:${port}`;
  const args =
    command === 'dev'
      ? [path.join(siteDir, 'node_modules/vite/bin/vite.js'), 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort']
      : [
          path.join(siteDir, 'node_modules/wrangler/bin/wrangler.js'),
          'dev',
          '--local',
          '--ip',
          '127.0.0.1',
          '--port',
          String(port),
          '--inspector-port',
          String(await freePort()),
        ];
  let output = '';
  const child = spawn(process.execPath, args, { cwd: siteDir, env: childEnv(), detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const stop = () => {
    if (child.pid === undefined || child.exitCode !== null) return;
    const signal = (/** @type {NodeJS.Signals} */ name) => {
      try {
        process.kill(-(/** @type {number} */ (child.pid)), name);
      } catch {
        // The group is already gone.
      }
    };
    signal('SIGTERM');
    // A server that ignores SIGTERM, and a pipe it still holds open, would keep the parent process
    // alive after its last test: a CI run hung on this for 15 minutes.
    setTimeout(() => signal('SIGKILL'), 3000).unref();
    child.stdout.destroy();
    child.stderr.destroy();
    child.unref();
  };
  process.once('exit', stop);
  const ready = /Local:|Ready on/;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const message = `viewer: ${command} server exited early (${child.exitCode}):\n${output}`;
      throw /already in use|EADDRINUSE|is in use/i.test(output) ? new PortTaken(message) : new Error(message);
    }
    // Only a server this child started is probed, so a listener another process holds on the port
    // is never mistaken for it. The home page answers 200 once the server has settled after its
    // first dependency pass; before that it can answer 500 or refuse the connection.
    if (ready.test(output) && (await answers(url))) {
      return {
        url,
        stop: () => {
          process.removeListener('exit', stop);
          stop();
        },
      };
    }
    await new Promise((done) => setTimeout(done, 300));
  }
  stop();
  throw new Error(`viewer: ${command} server did not answer on ${url} within 120s:\n${output}`);
}

/**
 * Every route the composed content serves, read from the regenerated manifest: the home page, each
 * archive page after the first, every page and post (a draft's route included, which answers 404),
 * the two feeds, and one address that does not exist. Fragments are not routes.
 * @param {string} siteDir
 * @returns {string[]}
 */
export function listRoutes(siteDir) {
  const index = JSON.parse(readFileSync(path.join(siteDir, 'src/content/.cairn/index.json'), 'utf8'));
  const archiveSource = readFileSync(path.join(siteDir, 'src/chassis/archive.ts'), 'utf8');
  const pageSize = Number(/ARCHIVE_PAGE_SIZE\s*=\s*(\d+)/.exec(archiveSource)?.[1]);
  const live = index.entries.filter((/** @type {any} */ e) => e.concept === 'posts' && !e.draft).length;
  const archive = Array.from({ length: Math.max(0, Math.ceil(live / pageSize) - 1) }, (_, i) => `/archive/${i + 2}`);
  const entries = index.entries
    .filter((/** @type {any} */ e) => e.concept !== 'fragments')
    .map((/** @type {any} */ e) => e.permalink);
  return ['/', ...archive, ...entries, '/feed.xml', '/feed.json', MISSING_ROUTE];
}
