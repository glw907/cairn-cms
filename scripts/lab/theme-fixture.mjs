// cairn-cms: the second-theme harness. It proves the public theme contract is theme-independent by
// building the site under a theme that is deliberately unlike Waymark and reading what Chromium
// computes. Two arms:
//
//   showcase  Copies the showcase into a gitignored `.cairn-theme-fixture-<pid>/` at the repository
//             root, swaps the fixture stylesheet in for `theme.css`, builds it, serves it, and runs
//             `theme-fixture-e2e/theme-fixture.spec.ts` against it. The copy's node_modules is a
//             link to the showcase's, so the engine resolves to the working build. The copy is
//             removed when the harness exits, a failure included.
//   template  Emits the template with `scripts/build/emit-template.mjs` against freshly packed engine
//             and dev tarballs, installs it into a directory under the OS temp directory (outside
//             the repository, so Node's upward resolution cannot reach the repository's
//             node_modules), and verifies the installed engine files against the pack by content
//             hash, since npm's cache can serve a stale build of a same-named tarball. It builds the
//             template under Waymark and then under the theme, serves each build, smoke-loads the
//             home page, an article, and the styleguide, and asserts the planted sentinel: a file
//             written into the installed engine's `dist/public/` that uses a utility over a color
//             only `cairn-public.css` defines. The utility reaching the compiled CSS proves the
//             stylesheet's `@source` line reaches the installed component directory.
//
// Usage (`npm run test:theme-fixture -- <options>`; the npm script packages the engine first):
//   --arm showcase|template|both   which arm runs (default both; template alone when --probe is set)
//   --theme <file>                 the stylesheet standing in for theme.css (default the fixture)
//   --theme-dir <dir>              a directory overlaid onto src/theme, for a theme with its own
//                                  chrome; it takes precedence over --theme
//   --build-only                   build and smoke-load the pages without the fixture-value assertions
//   --probe <route> <selector>     template arm: report the element's computed color and
//                                  border-radius under Waymark and under the theme
//
// The preview server runs on THEME_FIXTURE_PORT (default 4393). Needs the network for the template
// arm's registry dependencies.
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { repoRoot } from '../repo-root.mjs';
import { walk } from '../walk-files.mjs';
import { makeShowcaseCopy } from './theme-fixture-copy.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURE_CSS = resolve(ROOT, 'scripts/lab/theme-fixture/theme.css');
const E2E_DIR = resolve(ROOT, 'scripts/lab/theme-fixture-e2e');
const PORT = Number(process.env.THEME_FIXTURE_PORT ?? 4393);
const PACKAGE = '@glw907/cairn-cms';

/** Ports other tooling owns: the showcase's default e2e, its preview, and its local e2e. */
const RESERVED_PORTS = [4173, 4391, 4392];

/** The environment the showcase's own Playwright config gives its build and its server. */
const SITE_ENV = { ...process.env, VITE_CAIRN_E2E: '1', CAIRN_DEV_BACKEND: '1' };

/**
 * The planted sentinel: a utility over `--color-card-border`, a color only `cairn-public.css`
 * defines. No template source uses `decoration-*` over it, so it compiles only when the
 * stylesheet's `@source` line reaches the file below.
 */
const SENTINEL_CLASS = 'decoration-card-border';
const SENTINEL_FILE = 'zz-fixture-sentinel.svelte';

/** The pages every build is smoke-loaded through. */
const PAGES = ['/', '/posts/the-reading-surface', '/styleguide'];

/** Every child process a run started that still runs, killed on exit. @type {Set<import('node:child_process').ChildProcess>} */
const servers = new Set();
/** Directories outside the repository the run made, removed on exit. @type {string[]} */
const scratch = [];

process.on('exit', () => {
  for (const server of servers) stop(server);
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});
for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM', 'SIGHUP'])) {
  process.on(signal, () => process.exit(1));
}

/** A failure the report names; thrown so the cleanup still runs. */
class HarnessFailure extends Error {}

/**
 * Stop a preview server and everything it started.
 * @param {import('node:child_process').ChildProcess} server
 */
function stop(server) {
  servers.delete(server);
  if (server.pid === undefined || server.exitCode !== null) return;
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // The group is already gone.
  }
}

/**
 * Run a command to completion, failing with its output when it exits nonzero.
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} options
 * @returns {string} stdout
 */
function run(command, args, { cwd, env = process.env }) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new HarnessFailure(
      `${command} ${args.join(' ')} failed (exit ${result.status}) in ${cwd}:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

/**
 * Whether something already accepts connections on the port.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function listening(port) {
  return new Promise((done) => {
    const socket = net.connect({ port, host: 'localhost' });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('error', () => done(false));
  });
}

/**
 * Serve a built site with `vite preview` on the harness port and wait until it answers.
 * @param {string} cwd
 * @returns {Promise<import('node:child_process').ChildProcess>}
 */
async function serve(cwd) {
  if (await listening(PORT)) throw new HarnessFailure(`port ${PORT} already has a listener; stop it or set THEME_FIXTURE_PORT`);
  const log = openSync(join(cwd, 'preview.log'), 'w');
  const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd,
    env: SITE_ENV,
    detached: true,
    stdio: ['ignore', log, log],
  });
  servers.add(server);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new HarnessFailure(`the preview server exited early (${server.exitCode}):\n${readFileSync(join(cwd, 'preview.log'), 'utf8')}`);
    }
    try {
      const response = await fetch(`http://localhost:${PORT}/`);
      if (response.ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new HarnessFailure(`the preview server did not answer on port ${PORT} within 90s`);
}

/**
 * Build a site with the environment the showcase's e2e run builds with.
 * @param {string} cwd
 */
function build(cwd) {
  run('npm', ['run', 'build'], { cwd, env: SITE_ENV });
}

/**
 * Put a theme in place over a site's `src/theme`.
 * @param {string} site
 * @param {{ themeFile: string, themeDir?: string }} theme
 */
function overlayTheme(site, theme) {
  if (theme.themeDir) cpSync(resolve(theme.themeDir), join(site, 'src/theme'), { recursive: true });
  else cpSync(resolve(theme.themeFile), join(site, 'src/theme/theme.css'));
}

/**
 * The showcase arm: build the fixture copy, serve it, and run the spec.
 * @param {{ themeFile: string, themeDir?: string, buildOnly: boolean }} options
 */
async function showcaseArm({ themeFile, themeDir, buildOnly }) {
  console.log('\n== theme-fixture: showcase arm ==');
  const copy = makeShowcaseCopy({ root: ROOT, themeFile, themeDir });
  let server;
  try {
    console.log(`copy: ${relative(ROOT, copy.dir)}`);
    build(copy.dir);
    server = await serve(copy.dir);
    const e2e = join(copy.dir, 'theme-fixture-e2e');
    mkdirSync(e2e, { recursive: true });
    cpSync(E2E_DIR, e2e, { recursive: true });
    const cli = join(copy.dir, 'node_modules/@playwright/test/cli.js');
    const result = spawnSync(process.execPath, [cli, 'test', '-c', 'theme-fixture-e2e/playwright.config.ts'], {
      cwd: copy.dir,
      stdio: 'inherit',
      env: { ...process.env, THEME_FIXTURE_PORT: String(PORT), THEME_FIXTURE_BUILD_ONLY: buildOnly ? '1' : '0' },
    });
    if (result.status !== 0) throw new HarnessFailure(`the showcase arm's Playwright run failed (exit ${result.status})`);
  } finally {
    if (server) stop(server);
    copy.remove();
    console.log(`the temporary copy was removed and the preview server on port ${PORT} was stopped`);
  }
}

/**
 * The SHA-256 of a file.
 * @param {string} path
 * @returns {string}
 */
function hash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Pack a workspace into a directory under a name carrying its own content digest, so npm's
 * content-addressed cache cannot serve an older build of the same version.
 * @param {string} packageDir
 * @param {string} into
 * @returns {string} the tarball path
 */
function pack(packageDir, into) {
  const name = run('npm', ['pack', '--pack-destination', into, '--silent', '--ignore-scripts'], { cwd: packageDir })
    .trim()
    .split('\n')
    .pop();
  const packed = join(into, /** @type {string} */ (name));
  const renamed = join(into, `${hash(packed).slice(0, 12)}-${name}`);
  renameSync(packed, renamed);
  return renamed;
}

/**
 * Confirm an installed package is byte-for-byte the tarball just packed.
 * @param {string} tarball
 * @param {string} installed the package's directory under the install's node_modules
 * @param {string} into a directory to extract into
 * @returns {number} how many files matched
 */
function verifyInstalled(tarball, installed, into) {
  mkdirSync(into, { recursive: true });
  run('tar', ['xzf', tarball, '-C', into], { cwd: into });
  const packed = join(into, 'package');
  let compared = 0;
  for (const file of walk(packed, () => true)) {
    const counterpart = join(installed, relative(packed, file));
    if (!existsSync(counterpart)) throw new HarnessFailure(`${relative(packed, file)} is in the pack but missing from the install`);
    if (hash(counterpart) !== hash(file)) {
      throw new HarnessFailure(`${relative(packed, file)} differs between the pack and the install (a stale cached build)`);
    }
    compared += 1;
  }
  return compared;
}

/**
 * Every stylesheet a build emitted for the browser.
 * @param {string} site
 * @returns {string[]}
 */
function builtCss(site) {
  const dir = join(site, '.svelte-kit/output/client');
  return existsSync(dir) ? walk(dir, (name) => name.endsWith('.css')) : [];
}

/**
 * Smoke-load the pages in Chromium and read the probe, when one is given.
 * @param {string} label
 * @param {{ route: string, selector: string } | undefined} probe
 */
async function exercise(label, probe) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ colorScheme: 'light', baseURL: `http://localhost:${PORT}` });
    const page = await context.newPage();
    for (const route of PAGES) {
      const response = await page.goto(route);
      if (!response?.ok()) throw new HarnessFailure(`${label}: ${route} answered ${response?.status()}`);
      await page.locator('main#main').waitFor({ state: 'visible' });
      console.log(`${label}: ${route} loaded and rendered`);
    }
    if (probe) {
      await page.goto(probe.route);
      const target = page.locator(probe.selector).first();
      await target.waitFor({ state: 'attached' });
      const read = await target.evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, radius: style.borderRadius };
      });
      console.log(`probe ${label}: ${probe.route} ${probe.selector} color=${read.color} border-radius=${read.radius}`);
    }
  } finally {
    await browser.close();
  }
}

/**
 * The template arm: install the emitted template, build it under Waymark and under the theme, and
 * assert the sentinel on each build.
 * @param {{ themeFile: string, themeDir?: string, probe?: { route: string, selector: string } }} options
 */
async function templateArm({ themeFile, themeDir, probe }) {
  console.log('\n== theme-fixture: template arm ==');
  const tmp = mkdtempSync(join(tmpdir(), 'cairn-theme-fixture-template-'));
  scratch.push(tmp);
  try {
    const packs = join(tmp, 'packs');
    mkdirSync(packs);
    const engine = pack(ROOT, packs);
    const dev = pack(join(ROOT, 'packages/cairn-cms-dev'), packs);
    const site = join(tmp, 'site');
    run('node', ['scripts/build/emit-template.mjs', site, `file:${engine}`, `file:${dev}`, 'fixture-template'], { cwd: ROOT });
    run('npm', ['install', '--no-audit', '--no-fund'], { cwd: site });
    const nodeModules = join(site, 'node_modules');
    const engineFiles = verifyInstalled(engine, join(nodeModules, ...PACKAGE.split('/')), join(tmp, 'verify-engine'));
    const devFiles = verifyInstalled(dev, join(nodeModules, '@glw907/cairn-cms-dev'), join(tmp, 'verify-dev'));
    console.log(`the installed engine matches its pack (${engineFiles} files); the dev backend matches its pack (${devFiles} files)`);

    const publicDir = join(nodeModules, ...PACKAGE.split('/'), 'dist/public');
    if (!readFileSync(join(publicDir, 'cairn-public.css'), 'utf8').includes('@source')) {
      throw new HarnessFailure('the installed cairn-public.css carries no @source line');
    }
    writeFileSync(join(publicDir, SENTINEL_FILE), `<span class="${SENTINEL_CLASS}">sentinel</span>\n`);

    for (const label of ['Waymark', 'theme']) {
      if (label === 'theme') overlayTheme(site, { themeFile, themeDir });
      build(site);
      const reached = builtCss(site).some((file) => readFileSync(file, 'utf8').includes(SENTINEL_CLASS));
      if (!reached) {
        throw new HarnessFailure(`${label} build: the planted ${SENTINEL_CLASS} utility is not in the compiled CSS, so the @source line does not reach the installed components`);
      }
      console.log(`${label} build: the planted ${SENTINEL_CLASS} utility reached the compiled CSS`);
      const server = await serve(site);
      try {
        await exercise(label, probe);
      } finally {
        stop(server);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    console.log(`the temporary template install was removed and the preview server on port ${PORT} was stopped`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  /** @type {{ route: string, selector: string } | undefined} */
  let probe;
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--probe') {
      probe = { route: argv[i + 1], selector: argv[i + 2] };
      if (!probe.route || !probe.selector) throw new HarnessFailure('--probe takes a route and a selector');
      i += 2;
    } else {
      rest.push(argv[i]);
    }
  }
  const { values } = parseArgs({
    args: rest,
    options: {
      arm: { type: 'string' },
      theme: { type: 'string' },
      'theme-dir': { type: 'string' },
      'build-only': { type: 'boolean', default: false },
    },
  });
  const arm = values.arm ?? (probe ? 'template' : 'both');
  if (!['showcase', 'template', 'both'].includes(arm)) throw new HarnessFailure(`--arm takes showcase, template, or both, not ${arm}`);
  if (probe && arm === 'showcase') throw new HarnessFailure('--probe is a template arm option');
  if (RESERVED_PORTS.includes(PORT)) throw new HarnessFailure(`THEME_FIXTURE_PORT ${PORT} belongs to other tooling`);
  const themeFile = resolve(values.theme ?? FIXTURE_CSS);
  const themeDir = values['theme-dir'];
  if (arm !== 'template') await showcaseArm({ themeFile, themeDir, buildOnly: values['build-only'] });
  if (arm !== 'showcase') await templateArm({ themeFile, themeDir, probe });
  console.log('\ntheme-fixture: PASS');
}

main().catch((err) => {
  console.error(`theme-fixture: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
