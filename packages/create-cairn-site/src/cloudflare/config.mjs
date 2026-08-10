// wrangler.jsonc naming at scaffold time. The baked template ships with the showcase's own
// resource names and two placeholder database ids; a scaffolded site needs its own slug-derived
// names and no ids at all, since the 2026-08-10 spike confirmed wrangler auto-provisions an
// id-less binding by name and never writes anything back into this file. Every target string
// here is exact and fail-loud, in substitute.mjs's tradition: a missing target means the
// showcase's wrangler.jsonc moved out from under this module, and that must throw naming the
// file and the string, not silently ship an unnamed Cloudflare resource.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { slugify } from '../slug.mjs';

const WRANGLER_CONFIG_RELATIVE = 'wrangler.jsonc';

/**
 * The auth database's placeholder id line, as the baked template carries it. Nothing but
 * `nameWranglerResources` removes it, which is what makes its absence a trustworthy "this file
 * has already been personalized" signal, unlike the worker name a site can legitimately share.
 */
const PLACEHOLDER_AUTH_DATABASE_ID = '"database_id": "00000000-0000-0000-0000-000000000000"';

/**
 * The fallback slug create-cairn-site already uses everywhere a display name might slug to
 * nothing: scaffold.mjs's package rename and the GitHub chapter's App/repo naming
 * (src/github/chapter.mjs). Reusing it here, rather than a fresh literal, is what keeps a
 * site's worker, repo, and state record from disagreeing when a name like "!!!" slugs to
 * nothing.
 */
const FALLBACK_SLUG = 'cairn-site';

// The worker name becomes a DNS label in the workers.dev hostname, which Cloudflare caps at 63
// characters and never allows to start or end with a dash.
const MAX_WORKER_NAME_LENGTH = 63;

/**
 * Derive a site's Cloudflare Worker name from its display name: the same slug the scaffold and
 * the GitHub chapter already derive (fallback `cairn-site`), truncated to the 63-character DNS
 * label limit `workers.dev` imposes, with any trailing dash the truncation created trimmed away.
 * Every caller that needs this name (the config here, the chapter's consent copy, and the state
 * record) calls this one function, so none of them can disagree.
 * @param {string} name the site's display name (the scaffold's `answers.name`)
 * @returns {string} the worker name: 1-63 characters, never starting or ending with a dash
 */
export function workerNameFor(name) {
  const slug = slugify(name, FALLBACK_SLUG);
  return slug.slice(0, MAX_WORKER_NAME_LENGTH).replace(/-+$/, '');
}

/**
 * Replace the first occurrence of an exact target string in file content, throwing when it is
 * not found. Mirrors substitute.mjs's replaceExact: the throw names both the file and the
 * missing string, so a showcase change that moves this target surfaces here rather than
 * silently shipping an unpersonalized wrangler.jsonc.
 * @param {string} content the file's current content
 * @param {string} target the exact substring to find
 * @param {string} replacement the string to put in its place
 * @param {string} relativePath the file's path, relative to the scaffold root, named in the error
 * @returns {string} the content with the first occurrence of target replaced
 */
function replaceExact(content, target, replacement, relativePath) {
  const index = content.indexOf(target);
  if (index === -1) {
    throw new Error(
      `nameWranglerResources: expected to find "${target}" in ${relativePath}, but it is missing`,
    );
  }
  return content.slice(0, index) + replacement + content.slice(index + target.length);
}

/**
 * Rewrite the scaffold's wrangler.jsonc with the site's slug: the worker's `name`, both
 * databases' `database_name`, and the R2 bucket's `bucket_name`, and drop both showcase
 * placeholder `database_id` lines whole (id-less bindings resolve by name; wrangler provisions
 * and binds them without ever writing an id back into this file). `PUBLIC_ORIGIN` and both
 * `migrations_dir` entries are left untouched: Task 7 owns the origin, once the site has a real
 * deploy URL. Idempotent: when the file already carries `"name": "<slug>"`, this returns without
 * touching it, so a resumed run does not trip the rot gate on its own output.
 * @param {string} dir the scaffold root
 * @param {string} slug the site's worker name, from `workerNameFor`
 * @returns {Promise<void>}
 */
export async function nameWranglerResources(dir, slug) {
  const configPath = path.join(dir, WRANGLER_CONFIG_RELATIVE);
  const content = await readFile(configPath, 'utf8');
  // Both halves are required, because the name alone cannot tell the two states apart. A site
  // named "Cairn Showcase" slugs to the very name the template already carries, so a name-only
  // check reads the untouched template as finished and leaves the placeholder ids in place; the
  // deploy then binds two databases whose ids belong to nothing. Only this function removes
  // those id lines, so their absence is the reliable signal that it has already run. Keeping the
  // name check alongside it preserves the rot gate: a drifted showcase still reaches the
  // replaceExact throws rather than silently returning.
  const alreadyNamed =
    content.includes(`"name": "${slug}"`) && !content.includes(PLACEHOLDER_AUTH_DATABASE_ID);
  if (alreadyNamed) return;

  let next = replaceExact(
    content,
    '"name": "cairn-showcase"',
    `"name": "${slug}"`,
    WRANGLER_CONFIG_RELATIVE,
  );
  next = replaceExact(
    next,
    '"database_name": "cairn-showcase-auth"',
    `"database_name": "${slug}-auth"`,
    WRANGLER_CONFIG_RELATIVE,
  );
  next = replaceExact(
    next,
    '      "database_id": "00000000-0000-0000-0000-000000000000",\n',
    '',
    WRANGLER_CONFIG_RELATIVE,
  );
  next = replaceExact(
    next,
    '"database_name": "cairn-showcase-app"',
    `"database_name": "${slug}-app"`,
    WRANGLER_CONFIG_RELATIVE,
  );
  next = replaceExact(
    next,
    '      "database_id": "00000000-0000-0000-0000-000000000001",\n',
    '',
    WRANGLER_CONFIG_RELATIVE,
  );
  next = replaceExact(
    next,
    '"bucket_name": "cairn-showcase-media"',
    `"bucket_name": "${slug}-media"`,
    WRANGLER_CONFIG_RELATIVE,
  );

  await writeFile(configPath, next);
}

const PUBLIC_ORIGIN_PATTERN = /"PUBLIC_ORIGIN":\s*"[^"]*"/;

/**
 * Replace the value of the one known `PUBLIC_ORIGIN` var in wrangler.jsonc with the site's real
 * deploy origin. Matched by regex on the key, not an exact literal, since after a resumed run
 * the prior value may already be a workers.dev URL rather than the template's localhost
 * placeholder.
 * @param {string} dir the scaffold root
 * @param {string} url the site's real origin (the deploy's workers.dev URL)
 * @returns {Promise<void>}
 */
export async function writePublicOrigin(dir, url) {
  const configPath = path.join(dir, WRANGLER_CONFIG_RELATIVE);
  const content = await readFile(configPath, 'utf8');
  if (!PUBLIC_ORIGIN_PATTERN.test(content)) {
    throw new Error(
      `writePublicOrigin: expected to find a "PUBLIC_ORIGIN" entry in ${WRANGLER_CONFIG_RELATIVE}, but it is missing`,
    );
  }
  await writeFile(configPath, content.replace(PUBLIC_ORIGIN_PATTERN, `"PUBLIC_ORIGIN": "${url}"`));
}
