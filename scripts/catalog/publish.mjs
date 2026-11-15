#!/usr/bin/env node
// The catalog's publish run. For each theme under `themes/` and each set under `sets/` whose
// version the bucket's `index.json` does not list, it checks the release, builds its archive (and
// for a theme its card), puts every release object create-only, builds and deploys a theme's demo
// and waits for the demo to name the release, then writes the next `index.json`, last. A theme's
// demo is built over the set `sets/<kind>/` of the first kind its manifest lists when that set
// exists in the checkout, and over the starter overlay otherwise, at the origin its demo address names.
//
//   node scripts/catalog/publish.mjs [--reset]
//
// The target comes from the environment alone: CLOUDFLARE_ACCOUNT_ID, CATALOG_BUCKET,
// CATALOG_ORIGIN, DEMO_WORKER, DEMO_ORIGIN, and RELEASE_CACHE_CONTROL, with R2_ACCESS_KEY_ID and
// R2_SECRET_ACCESS_KEY for the bucket and CLOUDFLARE_API_TOKEN for the deploy. `{id}` in
// DEMO_WORKER and DEMO_ORIGIN stands for the theme id. `--reset` empties the bucket first, and is
// refused unless the bucket's name ends in `-proving`.
//
// A release path is written once. When a put finds its path taken (412, or 409 under a lock rule),
// the run reads what is there: the same bytes mean an earlier run stopped partway and this one goes
// on, and different bytes fail the run naming the path. A card already at its path is kept, since
// its bytes need not repeat across machines.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import sharp from 'sharp';
import { repoRoot } from '../repo-root.mjs';
import { checkTheme as realCheckTheme } from '../theme/check.mjs';
import { buildSetArchive, buildThemeArchive } from './archive.mjs';
import { buildCard } from './card.mjs';
import { buildDemo as realBuildDemo, MARKER_NAME } from './demo.mjs';
import { buildIndex } from './index.mjs';
import { createR2 } from './r2.mjs';

const REPO = repoRoot(import.meta.url);

/** The variables a run reads; the bucket's credentials are read only by {@link main}. */
const REQUIRED = ['CATALOG_BUCKET', 'CATALOG_ORIGIN', 'DEMO_WORKER', 'DEMO_ORIGIN', 'RELEASE_CACHE_CONTROL'];

/** The index's caching: the edge always reads the newest file, and a browser holds it five minutes. */
const INDEX_HEADERS = { cacheControl: 'max-age=300', contentType: 'application/json' };

/** How long a deployed demo has to name its release. */
const DEMO_TIMEOUT_MS = 120_000;
const DEMO_POLL_MS = 5_000;
const DEMO_FETCH_TIMEOUT_MS = 15_000;

const CONTENT_TYPES = { '.tgz': 'application/gzip', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.avif': 'image/avif' };

/** @param {string} file */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {Buffer} bytes */
const integrityOf = (bytes) => `sha512-${createHash('sha512').update(bytes).digest('base64')}`;

/** @param {string} key */
function contentType(key) {
  const type = CONTENT_TYPES[path.extname(key).toLowerCase()];
  if (!type) throw new Error(`${key} has no content type the catalog serves`);
  return type;
}

/**
 * The release directories under `root/<kind>/`, each holding the named manifest. A directory
 * without one fails the run, since it is a theme or set the run would otherwise skip.
 * @param {string} dir
 * @param {string} manifest
 * @returns {{ dir: string, manifest: Record<string, any> }[]}
 */
function releaseDirs(dir, manifest) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const file = path.join(dir, name, manifest);
      if (!existsSync(file)) throw new Error(`${path.join(dir, name)} has no ${manifest}`);
      return { dir: path.join(dir, name), manifest: readJson(file) };
    });
}

/**
 * Refuse a release whose manifest carries no `notes`, the one line the catalog shows for it.
 * @param {string} what
 * @param {Record<string, any>} manifest
 */
function requireNotes(what, manifest) {
  if (typeof manifest.notes !== 'string' || manifest.notes.trim() === '') {
    throw new Error(`${what} has no notes; the catalog refuses a release that does not say what it changed`);
  }
}

/**
 * The marker a demo page's head names, or a short description of what came back instead.
 * @param {typeof globalThis.fetch} fetch
 * @param {string} url
 * @returns {Promise<string>}
 */
async function readMarker(fetch, url) {
  try {
    const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(DEMO_FETCH_TIMEOUT_MS) });
    if (!response.ok) return `HTTP ${response.status}`;
    const html = await response.text();
    return new RegExp(`<meta name="${MARKER_NAME}" content="([^"]*)"`).exec(html)?.[1] ?? 'no marker';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Poll a demo address until its marker names the release, for at most {@link DEMO_TIMEOUT_MS}.
 * @param {{ fetch: typeof globalThis.fetch, now: () => number, sleep: (ms: number) => Promise<void> }} io
 * @param {string} url
 * @param {string} release
 */
async function waitForDemo({ fetch, now, sleep }, url, release) {
  const deadline = now() + DEMO_TIMEOUT_MS;
  for (;;) {
    const seen = await readMarker(fetch, url);
    if (seen === release) return;
    const left = deadline - now();
    if (left <= 0) throw new Error(`the demo at ${url} did not name ${release} within two minutes (last seen: ${seen})`);
    await sleep(Math.min(DEMO_POLL_MS, left));
  }
}

/**
 * The catalog index as the bucket holds it, read over S3 so no edge cache stands in front of it.
 * Only a missing key is an empty catalog; anything else unreadable fails the run before a write.
 * @param {ReturnType<typeof createR2>} s3
 * @param {(doc: unknown) => boolean} validate
 */
async function readIndex(s3, validate) {
  let stored;
  try {
    stored = await s3.get('index.json');
  } catch (error) {
    throw new Error(`reading index.json from the bucket failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (stored === null) return null;
  let doc;
  try {
    doc = JSON.parse(stored.bytes.toString('utf8'));
  } catch {
    throw new Error('index.json in the bucket is not JSON');
  }
  if (!validate(doc)) {
    const errors = validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
    throw new Error(`index.json in the bucket does not match the catalog schema: ${errors}`);
  }
  return doc;
}

/**
 * Put a release object create-only, applying the resume rule when its path is taken.
 * @param {ReturnType<typeof createR2>} s3
 * @param {string} key
 * @param {Buffer} bytes
 * @param {string} cacheControl
 * @param {{ keepExisting?: boolean, log: (line: string) => void }} options `keepExisting` keeps
 *   whatever is at the path without comparing it
 */
async function putRelease(s3, key, bytes, cacheControl, { keepExisting = false, log }) {
  const result = await s3.putIfAbsent(key, bytes, { cacheControl, contentType: contentType(key) });
  if (result === 'created') {
    log(`catalog: wrote ${key}`);
    return;
  }
  if (keepExisting) {
    log(`catalog: kept ${key}, already there`);
    return;
  }
  const existing = await s3.get(key);
  if (existing === null) throw new Error(`${key} was refused as taken but cannot be read`);
  const there = integrityOf(existing.bytes);
  const built = integrityOf(bytes);
  if (there !== built) {
    throw new Error(`${key} already holds different bytes (${there} there, ${built} built); a release path is written once`);
  }
  log(`catalog: kept ${key}, already there with the same digest`);
}

/**
 * Run the publish job once.
 * @param {object} options
 * @param {string[]} [options.argv] the command's arguments
 * @param {Record<string, string | undefined>} options.env the variables that choose the target
 * @param {ReturnType<typeof createR2>} options.s3 the client for `CATALOG_BUCKET`
 * @param {(args: { dir: string, worker: string }) => Promise<void>} options.deploy deploys a demo
 *   output directory to the named Worker, throwing when the deploy fails
 * @param {typeof globalThis.fetch} options.fetch reads the demo address
 * @param {string} [options.root] the directory holding `themes/` and `sets/`
 * @param {() => number} [options.now] the clock, in milliseconds
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {(line: string) => void} [options.log]
 * @param {(line: string) => void} [options.error]
 * @param {typeof realCheckTheme} [options.checkTheme]
 * @param {typeof realBuildDemo} [options.buildDemo]
 * @returns {Promise<number>} the exit code: 0 on success, 1 on a failed run, 2 on a usage error
 */
export async function run({
  argv = [],
  env,
  s3,
  deploy,
  fetch,
  root = REPO,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console.log,
  error = console.error,
  checkTheme = realCheckTheme,
  buildDemo = realBuildDemo,
}) {
  const unknown = argv.filter((arg) => arg !== '--reset');
  if (unknown.length) {
    error(`catalog: unknown argument ${unknown.join(' ')}; usage: publish.mjs [--reset]`);
    return 2;
  }
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length) {
    error(`catalog: the environment does not set ${missing.join(', ')}`);
    return 2;
  }
  const bucket = /** @type {string} */ (env.CATALOG_BUCKET);
  if (s3.bucket !== bucket) {
    error(`catalog: the bucket client is for ${s3.bucket}, not CATALOG_BUCKET ${bucket}`);
    return 2;
  }
  const reset = argv.includes('--reset');
  if (reset && !bucket.endsWith('-proving')) {
    error(`catalog: --reset empties a bucket and runs only on one whose name ends in -proving, not ${bucket}`);
    return 1;
  }

  try {
    const origin = /** @type {string} */ (env.CATALOG_ORIGIN).replace(/\/+$/, '');
    const releaseCache = /** @type {string} */ (env.RELEASE_CACHE_CONTROL);
    const ajv = new Ajv2020({ allErrors: true });
    const validateIndex = ajv.compile(readJson(path.join(REPO, 'schema/cairn-catalog-1.schema.json')));
    const validateSet = ajv.compile(readJson(path.join(REPO, 'schema/cairn-set-1.schema.json')));

    if (reset) {
      const keys = await s3.list();
      await s3.deleteAll(keys);
      log(`catalog: reset ${bucket}, ${keys.length} object${keys.length === 1 ? '' : 's'} deleted`);
    }

    const previous = await readIndex(s3, validateIndex);
    const { kinds } = readJson(path.join(root, 'sets/kinds.json'));
    const listed = (list, field, id) => new Set((previous?.[list] ?? []).find((x) => x[field] === id)?.releases.map((r) => r.version) ?? []);
    const themes = releaseDirs(path.join(root, 'themes'), 'cairn-theme.json').filter(({ manifest }) => !listed('themes', 'id', manifest.id).has(manifest.version));
    const sets = releaseDirs(path.join(root, 'sets'), 'cairn-set.json').filter(({ manifest }) => !listed('sets', 'kind', manifest.kind).has(manifest.version));
    if (themes.length === 0 && sets.length === 0) {
      log('catalog: nothing to publish');
      return 0;
    }

    // Every release is checked and built before the first write, so a refusal writes nothing.
    const themeBuilds = [];
    for (const { dir, manifest } of themes) {
      const name = `theme ${manifest.id}@${manifest.version}`;
      requireNotes(name, manifest);
      const verdict = await checkTheme(dir);
      if (verdict.verdict !== 'pass') {
        const failures = verdict.failures.map((f) => `\n  ${f.rule}  ${f.file}  ${f.message}`).join('');
        throw new Error(`${name} fails the theme check${failures}`);
      }
      const prefix = `themes/${manifest.id}/${manifest.version}`;
      const screenshots = [];
      for (const shot of manifest.screenshots) {
        const bytes = readFileSync(path.join(dir, shot.path));
        const { width, height } = await sharp(bytes).metadata();
        const key = `${prefix}/${path.basename(shot.path)}`;
        contentType(key);
        if (key === `${prefix}/card.webp` || screenshots.some((s) => s.key === key)) throw new Error(`${name} has two images published at ${key}`);
        screenshots.push({ key, bytes, shows: shot.shows, width, height });
      }
      themeBuilds.push({ dir, manifest, name, prefix, archive: buildThemeArchive(dir), card: await buildCard(dir), screenshots });
    }
    const setBuilds = [];
    for (const { dir, manifest } of sets) {
      const name = `set ${manifest.kind}@${manifest.version}`;
      requireNotes(name, manifest);
      if (!validateSet(manifest)) {
        throw new Error(`${name} does not match the set schema: ${validateSet.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}`);
      }
      setBuilds.push({ manifest, name, archive: buildSetArchive(dir) });
    }

    const date = new Date(now()).toISOString().slice(0, 10);
    const records = [];
    for (const build of themeBuilds) {
      const { manifest, prefix, archive, card } = build;
      await putRelease(s3, `${prefix}.tgz`, archive.bytes, releaseCache, { log });
      for (const shot of build.screenshots) await putRelease(s3, shot.key, shot.bytes, releaseCache, { log });
      await putRelease(s3, `${prefix}/card.webp`, card.bytes, releaseCache, { keepExisting: true, log });

      const worker = /** @type {string} */ (env.DEMO_WORKER).replaceAll('{id}', manifest.id);
      const demo = new URL('/', /** @type {string} */ (env.DEMO_ORIGIN).replaceAll('{id}', manifest.id)).href;
      const out = mkdtempSync(path.join(tmpdir(), 'cairn-demo-'));
      try {
        const setDir = path.join(root, 'sets', String(manifest.kinds[0]));
        const set = existsSync(path.join(setDir, 'cairn-set.json')) ? setDir : undefined;
        log(`catalog: demo for ${manifest.id} uses ${set ? `the ${manifest.kinds[0]} set` : 'the starter overlay'}`);
        const { release } = buildDemo({ root, themeDir: build.dir, out, worker, origin: new URL(demo).origin, ...(set && { set }) });
        await deploy({ dir: out, worker });
        log(`catalog: deployed ${release} to ${worker}`);
        await waitForDemo({ fetch, now, sleep }, demo, release);
        log(`catalog: ${demo} serves ${release}`);
      } finally {
        rmSync(out, { recursive: true, force: true });
      }

      records.push({
        theme: manifest,
        date,
        url: `${origin}/${prefix}.tgz`,
        integrity: archive.integrity,
        size: archive.size,
        demo,
        card: { url: `${origin}/${prefix}/card.webp`, width: card.width, height: card.height },
        screenshots: build.screenshots.map((s) => ({ url: `${origin}/${s.key}`, shows: s.shows, width: s.width, height: s.height })),
      });
    }
    for (const { manifest, archive } of setBuilds) {
      const key = `sets/${manifest.kind}/${manifest.version}.tgz`;
      await putRelease(s3, key, archive.bytes, releaseCache, { log });
      records.push({ set: manifest, date, url: `${origin}/${key}`, integrity: archive.integrity, size: archive.size });
    }

    const next = buildIndex({ previous, releases: records, kinds, now: new Date(now()).toISOString().replace(/\.\d{3}Z$/, 'Z') });
    if (!validateIndex(next)) {
      throw new Error(`the next index.json does not match the catalog schema: ${validateIndex.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}`);
    }
    await s3.put('index.json', Buffer.from(`${JSON.stringify(next, null, 2)}\n`), INDEX_HEADERS);
    log(`catalog: wrote index.json with ${[...themeBuilds, ...setBuilds].map((b) => b.name).join(', ')}`);
    return 0;
  } catch (failure) {
    error(`catalog: ${failure instanceof Error ? failure.message : String(failure)}`);
    return 1;
  }
}

/**
 * Deploy a demo output directory with `wrangler deploy`, which reads its `wrangler.json` and the
 * environment's CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
 * @param {{ dir: string, worker: string }} args
 * @returns {Promise<void>}
 */
function wranglerDeploy({ dir, worker }) {
  return new Promise((resolve, reject) => {
    // The checkout's locked Wrangler, by path: `dir` is a scratch directory where npx would fetch the newest release.
    const wrangler = path.join(REPO, 'node_modules', '.bin', 'wrangler');
    // Wrangler gets the deploy token and nothing else: the bucket keys are not its to hold.
    const { PATH, HOME, CI, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = process.env;
    const env = { PATH, HOME, CI, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, WRANGLER_SEND_METRICS: 'false' };
    const child = spawn(wrangler, ['deploy'], { cwd: dir, stdio: 'inherit', env });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`wrangler deploy of ${worker} exited ${code ?? signal}`));
    });
  });
}

/** Wire the real bucket client, deploy, and fetch from the environment, and run. */
async function main() {
  const env = process.env;
  let s3;
  try {
    s3 = createR2({
      accountId: env.CLOUDFLARE_ACCOUNT_ID ?? '',
      bucket: env.CATALOG_BUCKET ?? '',
      accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
    });
  } catch (failure) {
    console.error(`catalog: ${failure instanceof Error ? failure.message : String(failure)}`);
    return 2;
  }
  return run({ argv: process.argv.slice(2), env, s3, deploy: wranglerDeploy, fetch: globalThis.fetch });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
