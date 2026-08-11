import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { nameWranglerResources, writePublicOrigin, workerNameFor } from './config.mjs';

/**
 * Verbatim copy of the baked template's `wrangler.jsonc`: the showcase's own file
 * (examples/showcase/wrangler.jsonc) with the `cairn-template:exclude` block (the MEMBER_DB
 * entry) removed, exactly as `scripts/build/emit-template.mjs`'s marker strip leaves it. Pinning
 * this verbatim, rather than a trimmed-down stand-in, is what makes a showcase drift surface here
 * instead of only on a real bake.
 */
const BAKED_WRANGLER_JSONC = `{
  // The deployable template's Cloudflare Worker config. A scaffolded site keeps this shape and
  // swaps the names and ids. Modeled on the live 907-life cairn site.
  "name": "cairn-showcase",
  "compatibility_date": "2026-05-28",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".svelte-kit/cloudflare/_worker.js",
  "observability": { "enabled": true },
  "assets": {
    "directory": ".svelte-kit/cloudflare",
    "binding": "ASSETS",
    // "none" (the schema's own default) is set explicitly: for a request that matches no static
    // asset, Cloudflare passes it through to this Worker instead of intercepting it at the edge.
    // The \`(site)\` route group prerenders every page, so SvelteKit strips its \`[...path]\`
    // catch-all from the runtime-routable manifest entirely; an unmatched path therefore matches
    // no route at request time, and the Worker's own bundled SvelteKit server falls through to
    // its built-in default-404 handling, which renders the root \`+error.svelte\`
    // (src/routes/+error.svelte) through a real SSR response. Setting this to "404-page" would
    // instead serve a static, unthemed file straight from the edge and never reach the Worker at
    // all (see src/chassis/README.md's "The themed-404 pattern").
    "not_found_handling": "none"
  },
  // Email Sending binding for magic links (arbitrary recipients). A real site sets remote = true
  // so \`wrangler dev\` sends real mail; the dev backend fakes it locally.
  "send_email": [{ "name": "EMAIL" }],
  // cairn-cms self-owned magic-link auth store (editor allowlist, sessions, tokens). Each
  // database gets its own migrations_dir: a channel database sharing the default migrations/
  // directory with AUTH_DB would cross-apply schemas neither side expects.
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "cairn-showcase-auth",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "migrations"
    },
    {
      // The developer's own database, holding the signups table /admin/signups reads. Its own
      // migrations_dir, never "migrations": \`wrangler d1 migrations apply\` walks one directory
      // per database, so a shared directory applies every schema to both.
      "binding": "APP_DB",
      "database_name": "cairn-showcase-app",
      "database_id": "00000000-0000-0000-0000-000000000001",
      "migrations_dir": "migrations-app"
    }
  ],
  // R2 bucket backing the media library; the /media route streams content-addressed bytes from here.
  "r2_buckets": [{ "binding": "MEDIA_BUCKET", "bucket_name": "cairn-showcase-media" }],
  "vars": {
    // Canonical origin for magic-link confirmation links, never read from a request header.
    "PUBLIC_ORIGIN": "http://localhost:4173"
  }
}
`;

/**
 * Make a temporary directory holding the baked template's `wrangler.jsonc`, removed when the
 * test that asked for it finishes.
 * @param {import('node:test').TestContext} t the running test's context
 * @param {string} [content] the file's content; defaults to the verbatim baked fixture
 * @returns {Promise<string>} the directory's absolute path
 */
async function fixtureDir(t, content = BAKED_WRANGLER_JSONC) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cairn-config-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'wrangler.jsonc'), content);
  return dir;
}

/**
 * Strip JSONC `//` line comments and parse the result, the same instrument the task's own
 * acceptance test uses: proof that the rewritten file is still valid JSON, not just that the
 * expected substrings appear in it.
 * @param {string} content the file's raw JSONC text
 * @returns {object} the parsed JSON value
 */
function parseJsonc(content) {
  const stripped = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  return JSON.parse(stripped);
}

test('nameWranglerResources renames the worker, both databases, and the bucket, and drops both database ids', async (t) => {
  const dir = await fixtureDir(t);
  await nameWranglerResources(dir, 'alpine-club');
  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');

  assert.ok(content.includes('"name": "alpine-club"'));
  assert.ok(content.includes('"database_name": "alpine-club-auth"'));
  assert.ok(content.includes('"database_name": "alpine-club-app"'));
  assert.ok(content.includes('"bucket_name": "alpine-club-media"'));
  assert.ok(!content.includes('database_id'), 'both database_id lines must be gone');

  const parsed = parseJsonc(content);
  assert.equal(parsed.name, 'alpine-club');
  assert.equal(parsed.d1_databases[0].database_name, 'alpine-club-auth');
  assert.equal(parsed.d1_databases[0].migrations_dir, 'migrations');
  assert.equal(parsed.d1_databases[1].database_name, 'alpine-club-app');
  assert.equal(parsed.d1_databases[1].migrations_dir, 'migrations-app');
  assert.equal(parsed.r2_buckets[0].bucket_name, 'alpine-club-media');
  assert.equal(parsed.vars.PUBLIC_ORIGIN, 'http://localhost:4173', 'PUBLIC_ORIGIN is left for Task 7');
});

test('a second call is a no-op', async (t) => {
  const dir = await fixtureDir(t);
  await nameWranglerResources(dir, 'alpine-club');
  const once = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  await nameWranglerResources(dir, 'alpine-club');
  const twice = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  assert.equal(twice, once);
});

test('a site whose slug is cairn-showcase still has both placeholder database ids dropped', async (t) => {
  // "Cairn Showcase" is a thoroughly plausible name for a site someone builds while trying
  // cairn out, and it slugs to exactly the name the template already carries. Keying
  // idempotence on the name alone reads the untouched template as already personalized and
  // leaves both placeholder ids in place, and a deploy then binds two databases whose ids
  // (00000000-...) belong to nothing at all.
  const dir = await fixtureDir(t);

  await nameWranglerResources(dir, 'cairn-showcase');

  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  assert.ok(!content.includes('"database_id"'), `no database_id may survive: ${content}`);
  assert.ok(content.includes('"name": "cairn-showcase"'));
  assert.ok(content.includes('"database_name": "cairn-showcase-auth"'));
});

test('a doctored fixture missing a target throws naming the file and the string', async (t) => {
  const doctored = BAKED_WRANGLER_JSONC.replace(
    '"bucket_name": "cairn-showcase-media"',
    '"bucket_name": "renamed-already"',
  );
  const dir = await fixtureDir(t, doctored);
  await assert.rejects(
    () => nameWranglerResources(dir, 'alpine-club'),
    (err) => {
      assert.match(err.message, /wrangler\.jsonc/);
      assert.match(err.message, /cairn-showcase-media/);
      return true;
    },
  );
});

test('writePublicOrigin replaces the localhost placeholder', async (t) => {
  const dir = await fixtureDir(t);
  await writePublicOrigin(dir, 'https://alpine-club.geoff.workers.dev');
  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  assert.ok(content.includes('"PUBLIC_ORIGIN": "https://alpine-club.geoff.workers.dev"'));
  assert.ok(!content.includes('http://localhost:4173'));
});

test('writePublicOrigin replaces a previous workers.dev value on a resumed run', async (t) => {
  const dir = await fixtureDir(t);
  await writePublicOrigin(dir, 'https://alpine-club.geoff.workers.dev');
  await writePublicOrigin(dir, 'https://alpine-club-2.geoff.workers.dev');
  const content = await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8');
  assert.ok(content.includes('"PUBLIC_ORIGIN": "https://alpine-club-2.geoff.workers.dev"'));
  assert.ok(!content.includes('alpine-club.geoff.workers.dev"'));
});

test('workerNameFor slugs the name with the cairn-site fallback, matching scaffold.mjs and the GitHub chapter', () => {
  assert.equal(workerNameFor('Alpine Club'), 'alpine-club');
  assert.equal(workerNameFor('!!!'), 'cairn-site');
});

test('workerNameFor holds a name that slugs to exactly 57 characters unchanged', () => {
  const name = 'a'.repeat(57);
  const result = workerNameFor(name);
  assert.equal(result.length, 57);
  assert.equal(result, name);
});

test('workerNameFor truncates past 57 characters and re-trims a trailing dash the cut created', () => {
  // "a" x56 then a space then "b" slugs to 56 a's, a dash, and a b: 58 characters. Slicing the
  // first 57 leaves the dash as the last character, which must not survive.
  const name = `${'a'.repeat(56)} b`;
  const result = workerNameFor(name);
  assert.ok(!result.endsWith('-'), `expected no trailing dash, got ${JSON.stringify(result)}`);
  assert.equal(result, 'a'.repeat(56));
});

test('workerNameFor truncates a long dash-free name to 57 characters', () => {
  const result = workerNameFor('a'.repeat(70));
  assert.equal(result.length, 57);
  assert.equal(result, 'a'.repeat(57));
});

/**
 * Wrangler's own client-side validation for an R2 bucket name (`isValidR2BucketName` in the
 * wrangler source): 3-63 characters, lowercase alphanumeric and dashes, never starting or ending
 * with a dash. Used as the oracle below so the assertion is about Cloudflare's actual rule, not
 * about this package's own arithmetic agreeing with itself.
 */
const R2_BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

test('a base slug of exactly 57 characters keeps every derived resource name within Cloudflare\'s limits', async (t) => {
  const slug = workerNameFor('a'.repeat(57));
  assert.equal(slug.length, 57);

  const dir = await fixtureDir(t);
  await nameWranglerResources(dir, slug);
  const parsed = parseJsonc(await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8'));

  assert.ok(parsed.name.length <= 63);
  assert.ok(parsed.d1_databases[0].database_name.length <= 63);
  assert.ok(parsed.d1_databases[1].database_name.length <= 63);
  assert.ok(parsed.r2_buckets[0].bucket_name.length <= 63, `bucket name too long: ${parsed.r2_buckets[0].bucket_name}`);
  assert.match(parsed.r2_buckets[0].bucket_name, R2_BUCKET_NAME_PATTERN);
});

test('a display name slugging to 58 characters is bounded before any derived resource name is built', async (t) => {
  const slug = workerNameFor('a'.repeat(58));
  assert.equal(slug.length, 57, 'workerNameFor must bound the base slug, not just the worker name');

  const dir = await fixtureDir(t);
  await nameWranglerResources(dir, slug);
  const parsed = parseJsonc(await readFile(path.join(dir, 'wrangler.jsonc'), 'utf8'));

  assert.ok(parsed.d1_databases[0].database_name.length <= 63);
  assert.ok(parsed.d1_databases[1].database_name.length <= 63);
  assert.ok(parsed.r2_buckets[0].bucket_name.length <= 63, `bucket name too long: ${parsed.r2_buckets[0].bucket_name}`);
  assert.match(parsed.r2_buckets[0].bucket_name, R2_BUCKET_NAME_PATTERN);
});
