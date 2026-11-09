import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const LAY_IN = path.join(REPO, 'scripts/theme/lay-in.mjs');
const WAYMARK = path.join(REPO, 'themes/waymark');

/** A scratch site: a package.json and the app shell the generated names rewrite. */
async function scratchSite(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-lay-in-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'src'), { recursive: true });
  await writeFile(path.join(dir, 'package.json'), '{ "name": "scratch" }\n');
  await cp(path.join(REPO, 'examples/showcase/src/app.html'), path.join(dir, 'src/app.html'));
  return dir;
}

function layIn(themeDir, siteDir) {
  return spawnSync(process.execPath, [LAY_IN, themeDir, siteDir], { encoding: 'utf8' });
}

test('a lay-in copies the theme, writes the generated names, and leaves the screenshots behind', async (t) => {
  const site = await scratchSite(t);
  const theme = await mkdtemp(path.join(tmpdir(), 'cairn-lay-in-theme-'));
  t.after(() => rm(theme, { recursive: true, force: true }));
  await cp(WAYMARK, theme, { recursive: true });
  await mkdir(path.join(theme, 'screenshots'), { recursive: true });
  await writeFile(path.join(theme, 'screenshots/home.png'), 'png');
  const run = layIn(theme, site);
  assert.equal(run.status, 0, run.stderr);
  for (const file of ['cairn-theme.json', 'theme.css', 'site.css', 'icons.ts', 'fonts/fonts.css', 'theme-names.ts']) {
    assert.ok(existsSync(path.join(site, 'src/theme', file)), `${file} is missing from the lay-in`);
  }
  assert.ok(!existsSync(path.join(site, 'src/theme/screenshots')), 'screenshots must not be laid in');
  const names = await readFile(path.join(site, 'src/theme/theme-names.ts'), 'utf8');
  assert.match(names, /light: 'cairn'/);
});

test('a lay-in replaces the target wholesale, so a stale file is gone afterward', async (t) => {
  const site = await scratchSite(t);
  await mkdir(path.join(site, 'src/theme'), { recursive: true });
  await writeFile(path.join(site, 'src/theme/stale.css'), '/* stale */');
  const run = layIn(WAYMARK, site);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(!existsSync(path.join(site, 'src/theme/stale.css')));
  assert.ok(existsSync(path.join(site, 'src/theme/theme.css')));
});

test('a lay-in refuses a theme directory with no manifest, naming the file', async (t) => {
  const site = await scratchSite(t);
  const empty = await mkdtemp(path.join(tmpdir(), 'cairn-lay-in-empty-'));
  t.after(() => rm(empty, { recursive: true, force: true }));
  const run = layIn(empty, site);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /cairn-theme\.json/);
});

test('a lay-in refuses a site directory with no package.json, naming the file', async (t) => {
  const site = await mkdtemp(path.join(tmpdir(), 'cairn-lay-in-nosite-'));
  t.after(() => rm(site, { recursive: true, force: true }));
  const run = layIn(WAYMARK, site);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /package\.json/);
});

test('a lay-in refuses swapped arguments and a theme that is the site copy itself', async (t) => {
  const site = await scratchSite(t);
  assert.equal(layIn(WAYMARK, site).status, 0);
  const copy = path.join(site, 'src/theme');
  const same = layIn(copy, site);
  assert.notEqual(same.status, 0);
  assert.match(same.stderr, /overlap/);
  await writeFile(path.join(site, 'cairn-theme.json'), '{}');
  const inside = layIn(site, site);
  assert.notEqual(inside.status, 0);
  assert.match(inside.stderr, /overlap/);
});
