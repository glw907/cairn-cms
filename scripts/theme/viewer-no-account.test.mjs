// The viewer needs no Cloudflare account. Both modes run as child processes with every CLOUDFLARE_*
// and WRANGLER_* variable removed and the home and config directories pointed at empty scratch
// directories, so nothing can read a wrangler login or an account's credentials.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { copyOptionsFixture } from './viewer/fixture.mjs';

const REPO = path.resolve(import.meta.dirname, '../..');
const VIEWER = path.join(REPO, 'scripts/theme/viewer.mjs');

/**
 * An environment with no Cloudflare variable and empty home, config, data, and cache directories.
 * The Playwright browser cache is named by its real path, since the empty home no longer holds it.
 * @param {string} scratch
 * @returns {NodeJS.ProcessEnv}
 */
function accountlessEnv(scratch) {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith('CLOUDFLARE_') || name.startsWith('WRANGLER_')) delete env[name];
  }
  const dirs = Object.fromEntries(['home', 'config', 'data', 'cache'].map((name) => [name, path.join(scratch, name)]));
  for (const dir of Object.values(dirs)) mkdirSync(dir);
  return {
    ...env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? path.join(homedir(), '.cache/ms-playwright'),
    HOME: dirs.home,
    XDG_CONFIG_HOME: dirs.config,
    XDG_DATA_HOME: dirs.data,
    XDG_CACHE_HOME: dirs.cache,
  };
}

test('headless and interactive modes both run with no Cloudflare variable and an empty home', { timeout: 500_000 }, async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'cairn-viewer-accountless-'));
  const fixture = copyOptionsFixture();
  const env = accountlessEnv(scratch);
  try {
    const headless = spawnSync(
      process.execPath,
      [VIEWER, '--headless', '--theme', fixture.dir, '--pages', '/directives', '--widths', '390', '--modes', 'light'],
      { cwd: REPO, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    assert.equal(headless.status, 0, `headless exited ${headless.status}:\n${headless.stderr}`);
    const shots = JSON.parse(headless.stdout);
    assert.equal(shots.length, 1);
    assert.equal(shots[0].status, 200);

    const child = spawn(process.execPath, [VIEWER, '--theme', fixture.dir], { cwd: REPO, env, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      let stderr = '';
      child.stderr.on('data', (chunk) => (stderr += chunk));
      const line = await new Promise((resolve, reject) => {
        let out = '';
        child.stdout.on('data', (chunk) => {
          out += chunk;
          if (out.includes('\n')) resolve(out.split('\n')[0]);
        });
        child.once('exit', (code) => reject(new Error(`interactive mode exited ${code}:\n${stderr}`)));
      });
      const { control, site } = JSON.parse(line);
      const page = await fetch(control);
      assert.equal(page.status, 200);
      assert.ok((await page.text()).includes('>Ember</button>'));
      // Vite's dev server can answer 500 or reset a request while it settles after its first load.
      const deadline = Date.now() + 60_000;
      let status = 0;
      while (status !== 200 && Date.now() < deadline) {
        status = await fetch(`${site}/`).then((response) => response.status, () => 0);
        if (status !== 200) await new Promise((done) => setTimeout(done, 500));
      }
      assert.equal(status, 200, 'the dev site answers');
    } finally {
      child.kill('SIGTERM');
      await new Promise((done) => (child.exitCode === null ? child.once('exit', done) : done(undefined)));
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
