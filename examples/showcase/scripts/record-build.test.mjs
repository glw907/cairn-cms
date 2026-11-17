// Build the template as a new site gets it and prove `cairn-site.json` drives the build: the AI
// posture reaches robots.txt, every `deploy` value reaches the place the site uses it, a record
// that is missing, not JSON, or lacking its origin fails the build with one line, and the setup
// overlay's origin test fails when the record and `wrangler.jsonc` name different hosts. Like
// `starter-build.test.mjs` it lives in the showcase's `scripts/`, which the template excludes, runs
// under the showcase's `vitest run`, and needs the engine built (`npm run package` at the repo root).
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';
import { emitTemplate, STARTER_OVERLAY_DIR } from '../../../scripts/build/emit-template.mjs';
import { stripLayIn } from '../../../scripts/build/bake-template.mjs';
import { SETUP_OVERLAY_DIR } from '../../../scripts/build/pack-engine-template.mjs';
import { layIn } from '../../../scripts/theme/lay-in.mjs';

const showcase = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT = { timeout: 10 * 60 * 1000 };
const run = promisify(execFile);

/** What each posture adds to robots.txt, read from the engine's documented output. */
const INVITE_LINE = 'Content-Signal: search=yes, ai-train=yes';
const DECLINE_LINE = 'Content-Signal: ai-train=no';

/**
 * Emit the template as a new site gets it, ready to build in a scratch directory.
 * @returns {Promise<{ dir: string, record: any, writeRecord: (record: any) => Promise<void> }>} the
 *  site's directory, its parsed `cairn-site.json`, and a writer that replaces the file
 */
async function emitSite() {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-record-build-'));
  await emitTemplate({
    from: showcase,
    to: dir,
    engineSpec: 'file:../..',
    devSpec: 'file:../../packages/cairn-cms-dev',
    starterOverlay: STARTER_OVERLAY_DIR,
  });
  layIn(path.join(showcase, '../../themes/waymark'), dir);
  const packagePath = path.join(dir, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  stripLayIn(pkg);
  await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  await symlink(path.join(showcase, 'node_modules'), path.join(dir, 'node_modules'));
  const recordPath = path.join(dir, 'cairn-site.json');
  return {
    dir,
    record: JSON.parse(await readFile(recordPath, 'utf8')),
    writeRecord: (record) => writeFile(recordPath, JSON.stringify(record, null, 2) + '\n'),
  };
}

/**
 * Regenerate the site facts for the record as it stands, then build.
 * @param {string} dir the site's directory
 * @returns {Promise<void>}
 */
async function manifestAndBuild(dir) {
  await run('npx', ['cairn-manifest'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
  await run('npm', ['run', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Run a build that must fail.
 * @param {string} dir the site's directory
 * @returns {Promise<string>} the build's stdout and stderr, which carry the failure's line
 */
async function failingBuild(dir) {
  const error = await run('npm', ['run', 'build'], { cwd: dir, maxBuffer: 64 * 1024 * 1024 }).then(
    () => undefined,
    (e) => e,
  );
  expect(error, 'the build should have failed').toBeDefined();
  expect(error.code, 'the build should exit nonzero').not.toBe(0);
  return `${error.stdout}\n${error.stderr}`;
}

/**
 * The text a prerender wrote for a page or a file the site serves.
 * @param {string} dir the site's directory
 * @param {string} relative a path under `.svelte-kit/output/prerendered`
 * @returns {Promise<string>} the file's text
 */
function prerendered(dir, relative) {
  return readFile(path.join(dir, '.svelte-kit', 'output', 'prerendered', relative), 'utf8');
}

/**
 * Every file under a directory, as text, joined.
 * @param {string} root a directory
 * @returns {Promise<string>} the concatenated text of every file beneath it
 */
async function allText(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const parts = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => readFile(path.join(entry.parentPath, entry.name), 'utf8').catch(() => '')),
  );
  return parts.join('\n');
}

test('an unset posture builds the base robots.txt and an invite or decline adds its directive', TIMEOUT, async () => {
  const unset = await emitSite();
  try {
    expect(unset.record.aiPosture, 'the showcase record sets no posture').toBeUndefined();
    await manifestAndBuild(unset.dir);
    const base = await prerendered(unset.dir, 'pages/robots.txt');
    expect(base).not.toContain('Content-Signal');
    expect(base).toBe(
      `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${unset.record.deploy.publicOrigin}/sitemap.xml\n`,
    );

    for (const [posture, line] of [
      ['invite', INVITE_LINE],
      ['decline', DECLINE_LINE],
    ]) {
      await unset.writeRecord({ ...unset.record, aiPosture: posture });
      await manifestAndBuild(unset.dir);
      const robots = await prerendered(unset.dir, 'pages/robots.txt');
      expect(robots, `${posture} robots.txt`).toContain(line);
      expect(robots, `${posture} robots.txt`).not.toBe(base);
    }
  } finally {
    await rm(unset.dir, { recursive: true, force: true });
  }
});

test('every deploy value changed in the record alone reaches where the site uses it', TIMEOUT, async () => {
  const site = await emitSite();
  try {
    const changed = {
      publicOrigin: 'https://changed-origin.test',
      emailFrom: 'sender@changed-origin.test',
      github: { owner: 'changedowner', repo: 'changedrepo', branch: 'changedbranch', appId: '424242', installationId: '737373' },
    };
    await site.writeRecord({ ...site.record, aiPosture: 'invite', deploy: changed });
    await manifestAndBuild(site.dir);

    expect(await prerendered(site.dir, 'pages/index.html')).toMatch(
      new RegExp(`<link[^>]*rel="canonical"[^>]*href="${changed.publicOrigin}`),
    );
    expect(await prerendered(site.dir, 'pages/feed.xml')).toContain(changed.publicOrigin);

    const server = await allText(path.join(site.dir, '.svelte-kit', 'cloudflare'));
    for (const value of [changed.emailFrom, ...Object.values(changed.github)]) {
      expect(server, `the built server output lacks ${value}`).toContain(value);
    }
  } finally {
    await rm(site.dir, { recursive: true, force: true });
  }
});

test('a missing, unparseable, or origin-less record fails the build with one line', TIMEOUT, async () => {
  const site = await emitSite();
  try {
    const recordPath = path.join(site.dir, 'cairn-site.json');

    await rm(recordPath);
    expect(await failingBuild(site.dir)).toContain(`cairn-site.json: not found at ${recordPath}`);

    await writeFile(recordPath, '{ "kind": ');
    expect(await failingBuild(site.dir)).toContain('cairn-site.json: not valid JSON (');

    const { publicOrigin: _gone, ...deploy } = site.record.deploy;
    await site.writeRecord({ ...site.record, deploy });
    expect(await failingBuild(site.dir)).toContain(
      "cairn-site.json: deploy.publicOrigin must have required property 'publicOrigin'",
    );
  } finally {
    await rm(site.dir, { recursive: true, force: true });
  }
});

test("the overlay's origin test passes when the record and wrangler.jsonc agree and names both when they differ", TIMEOUT, async () => {
  const site = await emitSite();
  try {
    await cp(SETUP_OVERLAY_DIR, site.dir, {
      recursive: true,
      filter: (source) => path.relative(SETUP_OVERLAY_DIR, source) !== 'README.md',
    });
    const wranglerPath = path.join(site.dir, 'wrangler.jsonc');
    const wrangler = await readFile(wranglerPath, 'utf8');
    const quoted = /("PUBLIC_ORIGIN"\s*:\s*)"[^"]*"/;
    expect(wrangler).toMatch(quoted);
    const agreeing = site.record.deploy.publicOrigin;
    await writeFile(wranglerPath, wrangler.replace(quoted, `$1"${agreeing}"`));

    const vitest = () =>
      run('npx', ['vitest', 'run', 'src/site/record.test.ts'], { cwd: site.dir, maxBuffer: 64 * 1024 * 1024 });
    await vitest();

    const drifted = 'https://drifted-origin.test';
    await site.writeRecord({ ...site.record, deploy: { ...site.record.deploy, publicOrigin: drifted } });
    const error = await vitest().then(
      () => undefined,
      (e) => e,
    );
    expect(error, 'the origin test should fail').toBeDefined();
    const output = `${error.stdout}\n${error.stderr}`;
    expect(output).toContain(
      `deploy.publicOrigin in cairn-site.json is ${drifted}, but PUBLIC_ORIGIN in wrangler.jsonc is ${agreeing}`,
    );
  } finally {
    await rm(site.dir, { recursive: true, force: true });
  }
});
