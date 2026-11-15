// The publish run against a fake bucket that answers as R2 did at pre-flight, a fake deploy, and a
// fake demo address. The real R2 client signs every request and parses every reply, so the client
// is under test too. The theme check and the demo build are faked, since each builds a whole site;
// the archive and the card are the real builders over a scratch copy of Waymark.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { AwsClient } from 'aws4fetch';
import { repoRoot } from '../repo-root.mjs';
import { buildThemeArchive } from './archive.mjs';
import { REPLIES, fakeBucket } from './fixtures/r2/fake-bucket.mjs';
import { run } from './publish.mjs';
import { createR2 } from './r2.mjs';

const REPO = repoRoot(import.meta.url);
const validateIndex = new Ajv2020({ allErrors: true }).compile(JSON.parse(readFileSync(path.join(REPO, 'schema/cairn-catalog-1.schema.json'), 'utf8')));
const ACCOUNT = 'acct0123';
const RELEASE_CC = 'public, max-age=60';

/** The variables a GitHub environment gives the publish job, for the proving target. */
const ENV = {
  CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
  CATALOG_BUCKET: 'cairn-catalog-proving',
  CATALOG_ORIGIN: 'https://catalog-proving.example',
  DEMO_WORKER: 'cairn-demo-proving',
  DEMO_ORIGIN: 'https://demo-{id}.example',
  RELEASE_CACHE_CONTROL: RELEASE_CC,
};

const WAYMARK_KEYS = [
  'themes/waymark/1.1.0.tgz',
  'themes/waymark/1.1.0/home-light.png',
  'themes/waymark/1.1.0/home-dark.png',
  'themes/waymark/1.1.0/home-mobile.png',
  'themes/waymark/1.1.0/card.webp',
];

const sha512 = (bytes) => `sha512-${createHash('sha512').update(bytes).digest('base64')}`;

/**
 * A scratch repository root holding a copy of Waymark, the kinds data, and optionally the fixture
 * blog set, with an edit applied to each manifest.
 * @param {{ theme?: (m: any) => void, set?: boolean | ((m: any) => void) }} [edits]
 */
function scratchRoot(edits = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'cairn-publish-'));
  const theme = path.join(root, 'themes/waymark');
  cpSync(path.join(REPO, 'themes/waymark'), theme, { recursive: true });
  mkdirSync(path.join(root, 'sets'), { recursive: true });
  cpSync(path.join(REPO, 'sets/kinds.json'), path.join(root, 'sets/kinds.json'));
  const editJson = (file, edit) => {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    edit(manifest);
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  };
  if (edits.theme) editJson(path.join(theme, 'cairn-theme.json'), edits.theme);
  if (edits.set) {
    const set = path.join(root, 'sets/blog');
    cpSync(path.join(REPO, 'scripts/catalog/fixtures/archive/set-blog'), set, { recursive: true });
    if (typeof edits.set === 'function') editJson(path.join(set, 'cairn-set.json'), edits.set);
  }
  return root;
}

/**
 * A publish run's world: the fake bucket, the R2 client over it, and fakes for the theme check,
 * the demo build, the deploy, the demo address, and the clock.
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {string} [options.bucket] the fake bucket's name
 * @param {string[]} [options.locked]
 * @param {Record<string, any>} [options.objects]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {boolean} [options.checkFails]
 * @param {boolean} [options.deployFails]
 * @param {string | null} [options.served] a release the demo address names whatever was deployed
 * @param {number} [options.markerAfter] fetches the demo answers with the old page before the new one
 */
function world(options = {}) {
  const root = options.root ?? scratchRoot();
  const env = { ...ENV, ...(options.bucket && { CATALOG_BUCKET: options.bucket }), ...options.env };
  const bucket = fakeBucket({ name: options.bucket ?? ENV.CATALOG_BUCKET, locked: options.locked, objects: options.objects });
  const s3 = createR2({ accountId: ACCOUNT, bucket: env.CATALOG_BUCKET, accessKeyId: 'test-key-id', secretAccessKey: 'test-secret', fetch: bucket.fetch });
  const w = {
    root,
    env,
    bucket,
    s3,
    checks: [],
    demos: [],
    deploys: [],
    fetched: [],
    lines: [],
    live: 'waymark@1.0.0',
    t: Date.parse('2026-11-20T18:04:00Z'),
    deployFails: options.deployFails ?? false,
  };
  let polls = 0;
  w.output = () => w.lines.join('\n');
  w.publish = (argv = []) =>
    run({
      argv,
      env: w.env,
      s3: w.s3,
      root: w.root,
      log: (line) => w.lines.push(String(line)),
      error: (line) => w.lines.push(String(line)),
      now: () => w.t,
      sleep: async (ms) => {
        w.t += ms;
      },
      checkTheme: async (dir) => {
        w.checks.push(dir);
        const failures = options.checkFails ? [{ file: 'theme.css', rule: 'tokens-required', message: 'a token is missing' }] : [];
        return { theme: path.basename(dir), verdict: failures.length ? 'fail' : 'pass', failures, notes: [] };
      },
      buildDemo: (args) => {
        const manifest = JSON.parse(readFileSync(path.join(args.themeDir, 'cairn-theme.json'), 'utf8'));
        const release = `${manifest.id}@${manifest.version}`;
        w.demos.push({ ...args, release });
        mkdirSync(path.join(args.out, 'assets'), { recursive: true });
        return { release, assets: path.join(args.out, 'assets'), wrangler: path.join(args.out, 'wrangler.json') };
      },
      deploy: async (args) => {
        w.deploys.push({ ...args, writesBefore: w.bucket.writes.length });
        if (w.deployFails) throw new Error('wrangler deploy exited 1');
        w.live = w.demos.at(-1).release;
        polls = 0;
      },
      fetch: async (url) => {
        w.fetched.push(String(url));
        polls++;
        const release = options.served !== undefined ? options.served : polls > (options.markerAfter ?? 0) ? w.live : 'waymark@1.0.0';
        return new Response(`<!doctype html><html><head><meta name="cairn-theme-release" content="${release}" /></head><body></body></html>`, {
          headers: { 'content-type': 'text/html' },
        });
      },
    });
  w.index = () => {
    const stored = w.bucket.store.get('index.json');
    return stored ? JSON.parse(stored.bytes.toString('utf8')) : undefined;
  };
  w.putKeys = () => w.bucket.writes.filter((x) => x.method === 'PUT').map((x) => x.key);
  return w;
}

// ---- The fixture and the fake bucket answer as R2 did.

test('each recorded reply body is as long as the content-length R2 sent with it', () => {
  for (const [name, reply] of Object.entries(REPLIES)) {
    // A HEAD reply carries the object's length and no body.
    if (reply.headers['content-length'] === undefined || reply.request.startsWith('HEAD')) continue;
    assert.equal(Buffer.byteLength(reply.body), Number(reply.headers['content-length']), name);
  }
});

/** Signs a request as the client does, for the fidelity checks that read the fake's raw replies. */
const signer = new AwsClient({ accessKeyId: 'test-key-id', secretAccessKey: 'test-secret', service: 's3', region: 'auto' });
const raw = async (bucket, method, pathAndQuery, init = {}) => {
  const response = await bucket.fetch(await signer.sign(`https://${ACCOUNT}.r2.cloudflarestorage.com/${pathAndQuery}`, { method, ...init }));
  return { status: response.status, headers: response.headers, body: await response.text() };
};
const same = (got, name, headers = []) => {
  const want = REPLIES[name];
  assert.equal(got.status, want.status, `${name} status`);
  assert.equal(got.body, want.body, `${name} body`);
  for (const h of headers) assert.equal(got.headers.get(h), want.headers[h], `${name} ${h}`);
};

test('the fake bucket answers the recorded probe sequence with the recorded replies', async () => {
  const bucket = fakeBucket({ now: () => new Date('2026-11-14T22:52:17.701Z') });
  const put = { body: 'probe', headers: { 'if-none-match': '*', 'cache-control': 'public, max-age=60', 'content-type': 'text/plain; charset=utf-8' } };
  same(await raw(bucket, 'PUT', 'cairn-catalog-proving/probe/a.txt', put), 'put-created', ['etag']);
  same(await raw(bucket, 'HEAD', 'cairn-catalog-proving/probe/a.txt'), 'head-object', ['etag', 'cache-control', 'content-type', 'last-modified', 'content-length']);
  same(await raw(bucket, 'PUT', 'cairn-catalog-proving/probe/a.txt', put), 'put-precondition-failed');
  same(await raw(bucket, 'GET', 'cairn-catalog-proving/probe/a.txt'), 'get-object', ['etag', 'cache-control', 'content-type', 'last-modified']);
  same(await raw(bucket, 'GET', 'cairn-catalog-proving/probe/missing.txt'), 'get-missing');
  same(await raw(bucket, 'GET', 'cairn-catalog-proving?list-type=2&prefix=probe%2F'), 'list-one');
  const del = '<?xml version="1.0" encoding="UTF-8"?><Delete><Object><Key>probe/a.txt</Key></Object></Delete>';
  same(await raw(bucket, 'POST', 'cairn-catalog-proving?delete', { body: del }), 'delete-objects');
  same(await raw(bucket, 'GET', 'cairn-catalog-proving?list-type=2&prefix=probe%2F'), 'list-empty-prefix');
  same(await raw(bucket, 'GET', 'cairn-catalog-proving?list-type=2'), 'list-empty-bucket');
  same(await raw(bucket, 'GET', 'cairn-catalog?list-type=2'), 'access-denied');
});

test('the fake bucket answers the recorded lock sequence with the recorded replies', async () => {
  const bucket = fakeBucket({ locked: ['probe-lock/'], now: () => new Date('2026-11-14T22:52:40Z') });
  const key = 'cairn-catalog-proving/probe-lock/a.txt';
  same(await raw(bucket, 'PUT', key, { body: 'one', headers: { 'content-type': 'text/plain' } }), 'put-locked-new-key', ['etag']);
  same(await raw(bucket, 'PUT', key, { body: 'two' }), 'put-locked-overwrite');
  same(await raw(bucket, 'PUT', key, { body: 'two', headers: { 'if-none-match': '*' } }), 'put-locked-if-none-match');
  same(await raw(bucket, 'DELETE', key), 'delete-object-locked');
  const del = '<?xml version="1.0" encoding="UTF-8"?><Delete><Object><Key>probe-lock/a.txt</Key></Object></Delete>';
  same(await raw(bucket, 'POST', 'cairn-catalog-proving?delete', { body: del }), 'delete-objects-locked');
  same(await raw(bucket, 'GET', key), 'get-locked-after-attempts', ['etag', 'content-type', 'last-modified']);
});

// ---- The R2 client reads those replies.

test('the R2 client reads a missing key as null and any other refusal as an error', async () => {
  const bucket = fakeBucket({ objects: { 'a.txt': 'probe' } });
  const s3 = createR2({ accountId: ACCOUNT, bucket: bucket.name, accessKeyId: 'k', secretAccessKey: 's', fetch: bucket.fetch });
  assert.equal(await s3.get('missing.txt'), null);
  assert.equal((await s3.get('a.txt')).bytes.toString(), 'probe');
  bucket.fail('GET', 'b.txt', { status: 404, headers: { 'content-type': 'application/xml' }, body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist.</Message></Error>' });
  await assert.rejects(s3.get('b.txt'), /NoSuchBucket/);
  const other = createR2({ accountId: ACCOUNT, bucket: 'cairn-catalog', accessKeyId: 'k', secretAccessKey: 's', fetch: bucket.fetch });
  await assert.rejects(other.get('a.txt'), /403.*AccessDenied/);
});

test('a create-only put reports an existing key on both the 412 and the 409', async () => {
  const bucket = fakeBucket({ locked: ['locked/'], objects: { 'open/a': 'x', 'locked/a': 'x' } });
  const s3 = createR2({ accountId: ACCOUNT, bucket: bucket.name, accessKeyId: 'k', secretAccessKey: 's', fetch: bucket.fetch });
  const headers = { cacheControl: RELEASE_CC, contentType: 'text/plain' };
  assert.equal(await s3.putIfAbsent('open/b', Buffer.from('y'), headers), 'created');
  assert.equal(await s3.putIfAbsent('open/a', Buffer.from('y'), headers), 'exists');
  assert.equal(await s3.putIfAbsent('locked/a', Buffer.from('y'), headers), 'exists');
  assert.deepEqual(bucket.requests.map((r) => r.status), [200, 412, 409]);
  assert.equal(bucket.store.get('open/a').bytes.toString(), 'x');
});

test('a delete reads the body, so a locked key refused inside a 200 fails it', async () => {
  const bucket = fakeBucket({ locked: ['locked/'], objects: { 'open/a': 'x', 'locked/a': 'x' } });
  const s3 = createR2({ accountId: ACCOUNT, bucket: bucket.name, accessKeyId: 'k', secretAccessKey: 's', fetch: bucket.fetch });
  await assert.rejects(s3.deleteAll(['open/a', 'locked/a']), /locked\/a.*ObjectLockedByBucketPolicy/);
  assert.equal(bucket.requests.at(-1).status, 200);
});

test('a list follows every page', async () => {
  const objects = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((k) => [`k/${k}`, k]));
  const bucket = fakeBucket({ objects, pageSize: 2 });
  const s3 = createR2({ accountId: ACCOUNT, bucket: bucket.name, accessKeyId: 'k', secretAccessKey: 's', fetch: bucket.fetch });
  assert.deepEqual(await s3.list(), Object.keys(objects));
  assert.equal(bucket.requests.length, 3);
});

// ---- The index is read from the bucket, and only a missing key is an empty catalog.

const refusedReads = {
  'answers 5xx': (w) => w.bucket.fail('GET', 'index.json', { status: 500, headers: { 'content-type': 'application/xml' }, body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InternalError</Code><Message>We encountered an internal error. Please try again.</Message></Error>' }),
  "isn't JSON": (w) => w.bucket.store.set('index.json', { bytes: Buffer.from('<html>not json</html>'), lastModified: new Date() }),
  'the schema refuses': (w) => w.bucket.store.set('index.json', { bytes: Buffer.from('{"format":"1","themes":[]}'), lastModified: new Date() }),
  'answers 404 for a reason other than a missing key': (w) =>
    w.bucket.fail('GET', 'index.json', { status: 404, headers: { 'content-type': 'application/xml' }, body: '<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist.</Message></Error>' }),
};
for (const [name, arrange] of Object.entries(refusedReads)) {
  test(`an index read that ${name} fails the run with no object written`, async () => {
    const w = world();
    arrange(w);
    assert.equal(await w.publish(), 1);
    assert.deepEqual(w.bucket.writes, []);
    assert.deepEqual(w.deploys, []);
    assert.match(w.output(), /index\.json/);
    const reads = w.bucket.requests.filter((r) => r.key === 'index.json');
    assert.deepEqual(reads.map((r) => r.method), ['GET']);
  });
}

// ---- A first publish.

test('a first publish writes the archive, the screenshots, the card, then the index, in that order', async () => {
  const w = world();
  assert.equal(await w.publish(), 0, w.output());
  assert.deepEqual(w.putKeys(), [...WAYMARK_KEYS, 'index.json']);
  assert.equal(w.deploys.length, 1);
  assert.equal(w.deploys[0].writesBefore, WAYMARK_KEYS.length, 'the demo deploys after every release object and before the index');

  const index = w.index();
  assert.ok(validateIndex(index), JSON.stringify(validateIndex.errors));
  assert.deepEqual(index.kinds, []);
  assert.deepEqual(index.sets, []);
  assert.equal(index.generated, '2026-11-20T18:04:00Z');
  const [theme] = index.themes;
  assert.equal(theme.id, 'waymark');
  assert.equal(theme.demo, 'https://demo-waymark.example/');
  assert.deepEqual(theme.card, { url: 'https://catalog-proving.example/themes/waymark/1.1.0/card.webp', width: 720, height: 480 });
  const [release] = theme.releases;
  assert.equal(release.version, '1.1.0');
  assert.equal(release.date, '2026-11-20');
  assert.equal(release.url, 'https://catalog-proving.example/themes/waymark/1.1.0.tgz');
  const archive = w.bucket.store.get('themes/waymark/1.1.0.tgz').bytes;
  assert.equal(release.integrity, sha512(archive));
  assert.equal(release.integrity, buildThemeArchive(path.join(w.root, 'themes/waymark')).integrity);
  assert.equal(release.size, archive.length);
  assert.deepEqual(
    release.screenshots.map((s) => [s.url, s.width, s.height]),
    [
      ['https://catalog-proving.example/themes/waymark/1.1.0/home-light.png', 1440, 960],
      ['https://catalog-proving.example/themes/waymark/1.1.0/home-dark.png', 1440, 960],
      ['https://catalog-proving.example/themes/waymark/1.1.0/home-mobile.png', 390, 960],
    ],
  );
  assert.equal(release.screenshots[0].shows, 'The home page in the light color mode at 1440 pixels wide');
  for (const s of release.screenshots) {
    const key = new URL(s.url).pathname.slice(1);
    const local = readFileSync(path.join(w.root, 'themes/waymark/screenshots', path.basename(key)));
    assert.ok(w.bucket.store.get(key).bytes.equals(local), key);
  }
});

test('the run checks the theme, builds its demo for the worker, and polls the demo address', async () => {
  const w = world({ markerAfter: 2 });
  assert.equal(await w.publish(), 0, w.output());
  assert.deepEqual(w.checks, [path.join(w.root, 'themes/waymark')]);
  assert.equal(w.demos.length, 1);
  assert.equal(w.demos[0].themeDir, path.join(w.root, 'themes/waymark'));
  assert.equal(w.demos[0].worker, 'cairn-demo-proving');
  assert.equal(w.demos[0].root, REPO);
  assert.equal(w.deploys[0].dir, w.demos[0].out);
  assert.equal(w.deploys[0].worker, 'cairn-demo-proving');
  assert.ok(w.fetched.length >= 3, 'the poll waits for the marker past two stale pages');
  assert.ok(w.fetched.every((url) => url === 'https://demo-waymark.example/'), w.fetched.join(' '));
});

test('every put carries the Cache-Control and Content-Type the catalog sets', async () => {
  const w = world({ root: scratchRoot({ set: true }) });
  assert.equal(await w.publish(), 0, w.output());
  const types = { '.tgz': 'application/gzip', '.png': 'image/png', '.webp': 'image/webp' };
  const puts = w.bucket.writes.filter((x) => x.method === 'PUT');
  assert.ok(puts.some((p) => p.key === 'sets/blog/1.0.0.tgz'));
  for (const put of puts) {
    if (put.key === 'index.json') {
      assert.equal(put.cacheControl, 'max-age=300');
      assert.equal(put.contentType, 'application/json');
      assert.equal(put.ifNoneMatch, null, 'the index is the one object overwritten');
    } else {
      assert.equal(put.cacheControl, RELEASE_CC, put.key);
      assert.equal(put.contentType, types[path.extname(put.key)], put.key);
      assert.equal(put.ifNoneMatch, '*', put.key);
    }
  }
  assert.equal(puts.at(-1).key, 'index.json');
});

test('a published set makes its kind appear in the index', async () => {
  const w = world({ root: scratchRoot({ set: true }) });
  assert.equal(await w.publish(), 0, w.output());
  const index = w.index();
  assert.ok(validateIndex(index), JSON.stringify(validateIndex.errors));
  assert.deepEqual(index.kinds.map((k) => k.id), ['blog']);
  assert.equal(index.sets[0].releases[0].url, 'https://catalog-proving.example/sets/blog/1.0.0.tgz');
  assert.equal(index.sets[0].releases[0].integrity, sha512(w.bucket.store.get('sets/blog/1.0.0.tgz').bytes));
});

// ---- Nothing reaches the index when a step fails.

test('a failed theme check leaves the index unwritten, and writes nothing', async () => {
  const w = world({ checkFails: true });
  assert.equal(await w.publish(), 1);
  assert.deepEqual(w.bucket.writes, []);
  assert.deepEqual(w.deploys, []);
  assert.match(w.output(), /waymark/);
  assert.match(w.output(), /tokens-required/);
});

test('a failed deploy leaves the index unwritten', async () => {
  const w = world({ deployFails: true });
  assert.equal(await w.publish(), 1);
  assert.equal(w.bucket.store.has('index.json'), false);
  assert.deepEqual(w.putKeys(), WAYMARK_KEYS);
  assert.match(w.output(), /wrangler deploy exited 1/);
});

test('a demo marker that never appears fails the run after two minutes, with the index unwritten', async () => {
  const w = world({ served: 'waymark@1.0.0' });
  const start = w.t;
  assert.equal(await w.publish(), 1);
  assert.equal(w.bucket.store.has('index.json'), false);
  assert.equal(w.t - start, 120_000);
  assert.ok(w.fetched.length > 1);
  assert.ok(w.fetched.every((url) => url === 'https://demo-waymark.example/'));
  assert.match(w.output(), /waymark@1\.1\.0/);
  assert.match(w.output(), /two minutes/);
});

// ---- Repeat and resumed runs.

test('a second run is a no-op', async () => {
  const w = world();
  assert.equal(await w.publish(), 0, w.output());
  const writes = w.bucket.writes.length;
  const requests = w.bucket.requests.length;
  w.lines.length = 0;
  assert.equal(await w.publish(), 0, w.output());
  assert.match(w.output(), /^catalog: nothing to publish$/m);
  assert.equal(w.bucket.writes.length, writes);
  assert.deepEqual(w.bucket.requests.slice(requests).map((r) => `${r.method} ${r.key}`), ['GET index.json']);
  assert.equal(w.deploys.length, 1);
});

for (const [name, locked, status] of [
  ['a 412', [], 412],
  ['a 409 under a lock rule', ['themes/', 'sets/'], 409],
]) {
  test(`a run after a stop between the archive and the index finishes without rewriting the archive (${name})`, async () => {
    const w = world({ deployFails: true, locked });
    assert.equal(await w.publish(), 1);
    const archive = w.bucket.store.get('themes/waymark/1.1.0.tgz').bytes;
    const before = w.bucket.requests.length;
    w.deployFails = false;
    assert.equal(await w.publish(), 0, w.output());
    const second = w.bucket.requests.slice(before);
    const archivePuts = second.filter((r) => r.method === 'PUT' && r.key === 'themes/waymark/1.1.0.tgz');
    assert.deepEqual(archivePuts.map((r) => r.status), [status], 'the archive put is refused and the resume rule reads it');
    assert.equal(w.bucket.store.get('themes/waymark/1.1.0.tgz').bytes, archive);
    assert.deepEqual(w.bucket.writes.filter((x) => x.key === 'themes/waymark/1.1.0.tgz').length, 1);
    assert.ok(validateIndex(w.index()));
    assert.equal(w.index().themes[0].releases[0].integrity, sha512(archive));
  });
}

test('an existing archive with a different digest fails the run naming its path', async () => {
  const w = world({ objects: { 'themes/waymark/1.1.0.tgz': 'bytes from another build' } });
  assert.equal(await w.publish(), 1);
  assert.match(w.output(), /themes\/waymark\/1\.1\.0\.tgz/);
  assert.equal(w.bucket.store.has('index.json'), false);
  assert.equal(w.bucket.store.get('themes/waymark/1.1.0.tgz').bytes.toString(), 'bytes from another build');
});

test('a card already at its path is kept', async () => {
  const w = world({ objects: { 'themes/waymark/1.1.0/card.webp': 'an earlier card' } });
  assert.equal(await w.publish(), 0, w.output());
  assert.equal(w.bucket.store.get('themes/waymark/1.1.0/card.webp').bytes.toString(), 'an earlier card');
  assert.ok(w.bucket.store.has('index.json'));
});

// ---- Refusals.

test('a theme release with no notes is refused before anything is written', async () => {
  const w = world({ root: scratchRoot({ theme: (m) => delete m.notes }) });
  assert.equal(await w.publish(), 1);
  assert.match(w.output(), /waymark.*notes/);
  assert.deepEqual(w.bucket.writes, []);
});

test('a screenshot with no served content type is refused before anything is written', async () => {
  const root = scratchRoot();
  const file = path.join(root, 'themes/waymark/cairn-theme.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const first = manifest.screenshots[0].path;
  cpSync(path.join(root, 'themes/waymark', first), path.join(root, 'themes/waymark', 'shot.svg'));
  manifest.screenshots[0].path = 'shot.svg';
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  const w = world({ root });
  assert.equal(await w.publish(), 1);
  assert.match(w.output(), /shot\.svg has no content type/);
  assert.deepEqual(w.bucket.writes, []);
});

test('a set release with no notes is refused before anything is written', async () => {
  const w = world({ root: scratchRoot({ set: (m) => delete m.notes }) });
  assert.equal(await w.publish(), 1);
  assert.match(w.output(), /blog.*notes/);
  assert.deepEqual(w.bucket.writes, []);
});

test('--reset against a bucket named cairn-catalog exits nonzero and deletes nothing', async () => {
  const w = world({ bucket: 'cairn-catalog', objects: { 'themes/waymark/1.0.0.tgz': 'kept', 'index.json': '{}' } });
  assert.notEqual(await w.publish(['--reset']), 0);
  assert.match(w.output(), /-proving/);
  assert.deepEqual(w.bucket.requests, []);
  assert.deepEqual([...w.bucket.store.keys()].sort(), ['index.json', 'themes/waymark/1.0.0.tgz']);
});

test('--reset empties a proving bucket and then publishes into it', async () => {
  const stale = world();
  assert.equal(await stale.publish(), 0, stale.output());
  const objects = Object.fromEntries([...stale.bucket.store].map(([k, v]) => [k, v]));
  objects['themes/old/1.0.0.tgz'] = { bytes: Buffer.from('stale'), lastModified: new Date() };
  const w = world({ objects });
  assert.equal(await w.publish(['--reset']), 0, w.output());
  assert.equal(w.bucket.store.has('themes/old/1.0.0.tgz'), false);
  assert.deepEqual(w.putKeys(), [...WAYMARK_KEYS, 'index.json']);
  assert.equal(w.deploys.length, 1);
});

test('a run missing one of its variables makes no request', async () => {
  const w = world({ env: { RELEASE_CACHE_CONTROL: undefined } });
  assert.notEqual(await w.publish(), 0);
  assert.match(w.output(), /RELEASE_CACHE_CONTROL/);
  assert.deepEqual(w.bucket.requests, []);
});
