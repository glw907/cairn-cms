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
 * The auth database's placeholder id, as the baked template carries it. Nothing but
 * `nameWranglerResources` removes it, which is what makes its absence a trustworthy "this file
 * has already been personalized" signal, unlike the worker name a site can legitimately share.
 * The idempotence check and the removal below are both built from this one constant, so neither
 * can drift away from the other.
 */
const PLACEHOLDER_AUTH_DATABASE_ID = '"database_id": "00000000-0000-0000-0000-000000000000"';

/** The app database's placeholder id, removed the same way and by the same function. */
const PLACEHOLDER_APP_DATABASE_ID = '"database_id": "00000000-0000-0000-0000-000000000001"';

/**
 * The fallback slug create-cairn-site already uses everywhere a display name might slug to
 * nothing: scaffold.mjs's package rename and the GitHub chapter's App/repo naming
 * (src/github/chapter.mjs). Reusing it here, rather than a fresh literal, is what keeps a
 * site's worker, repo, and state record from disagreeing when a name like "!!!" slugs to
 * nothing.
 */
const FALLBACK_SLUG = 'cairn-site';

// This slug is the base every derived Cloudflare resource name extends: the worker name itself,
// and, through nameWranglerResources, three suffixed names (-auth, -app, -media). Bounding it
// per-resource would let the worker name reach the 63-character workers.dev DNS label limit while
// the bucket name (the base plus the 6-character "-media" suffix, the longest of the three) ran
// past R2's own 63-character cap. The tightest limit among all four resources is that 63-character
// R2 bound, so capping the base itself at 57 (63 minus the "-media" suffix) is the one number that
// keeps every derived name within Cloudflare's limits, since none of the other three suffixes is
// longer.
const MAX_BASE_SLUG_LENGTH = 57;

/**
 * Derive a site's Cloudflare resource base name from its display name: the same slug the
 * scaffold and the GitHub chapter already derive (fallback `cairn-site`), truncated so that the
 * worker name and every suffixed name nameWranglerResources derives from it (`-auth`, `-app`,
 * `-media`) stay within Cloudflare's limits, with any trailing dash the truncation created
 * trimmed away. Every caller that needs this name (the config here, the chapter's consent copy,
 * and the state record) calls this one function, so none of them can disagree.
 * @param {string} name the site's display name (the scaffold's `answers.name`)
 * @returns {string} the base name: 1-57 characters, never starting or ending with a dash
 */
export function workerNameFor(name) {
  const slug = slugify(name, FALLBACK_SLUG);
  return slug.slice(0, MAX_BASE_SLUG_LENGTH).replace(/-+$/, '');
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
 * deploy URL. Idempotent: a file that already carries `"name": "<slug>"` **and** has lost its
 * placeholder database ids is one this function has already rewritten, so it returns without
 * touching it and a resumed run does not trip the rot gate on its own output. Both halves are
 * load-bearing; the comment on the check itself says why the name alone is not enough.
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

  // Every rewrite this function makes, in file order. An id line is removed whole, indentation
  // and trailing comma included, so the JSONC that survives is still valid.
  const rewrites = [
    ['"name": "cairn-showcase"', `"name": "${slug}"`],
    ['"database_name": "cairn-showcase-auth"', `"database_name": "${slug}-auth"`],
    [`      ${PLACEHOLDER_AUTH_DATABASE_ID},\n`, ''],
    ['"database_name": "cairn-showcase-app"', `"database_name": "${slug}-app"`],
    [`      ${PLACEHOLDER_APP_DATABASE_ID},\n`, ''],
    ['"bucket_name": "cairn-showcase-media"', `"bucket_name": "${slug}-media"`],
  ];

  let next = content;
  for (const [target, replacement] of rewrites) {
    next = replaceExact(next, target, replacement, WRANGLER_CONFIG_RELATIVE);
  }

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
  await writeFile(
    configPath,
    content.replace(PUBLIC_ORIGIN_PATTERN, `"PUBLIC_ORIGIN": ${JSON.stringify(url)}`)
  );
}

const ACCOUNT_ID_PATTERN = /"account_id":\s*"[^"]*"/;

/**
 * Matches the top-level `"name": "..."` line `nameWranglerResources` already rewrites, capturing
 * its leading indentation (group 1) so `writeAccountId`'s insert can match it exactly. Anchored
 * on this line specifically because no `account_id` key exists anywhere in the baked template:
 * every scaffold ships with one, so it is always present to insert after.
 */
const NAME_LINE_PATTERN = /^([ \t]*)"name":\s*"[^"]*",?\r?\n/m;

/**
 * Write the Worker's Cloudflare account id into wrangler.jsonc, inserting the key when absent
 * (anchored on the `"name"` line, since no scaffold ships one today) and replacing its value
 * when already present. Byte-stable on a re-run with the same id: the replace path only writes
 * when the stored value actually differs, and the insert path only ever runs once, since the key
 * it looks for is gone on every later call.
 * @param {string} dir the scaffold root
 * @param {string} accountId the Cloudflare account id
 * @returns {Promise<void>}
 */
export async function writeAccountId(dir, accountId) {
  const configPath = path.join(dir, WRANGLER_CONFIG_RELATIVE);
  const content = await readFile(configPath, 'utf8');
  const encoded = JSON.stringify(accountId);

  if (ACCOUNT_ID_PATTERN.test(content)) {
    if (content.includes(`"account_id": ${encoded}`)) return;
    await writeFile(configPath, content.replace(ACCOUNT_ID_PATTERN, `"account_id": ${encoded}`));
    return;
  }

  const match = NAME_LINE_PATTERN.exec(content);
  if (!match) {
    throw new Error(
      `writeAccountId: expected to find a "name" entry in ${WRANGLER_CONFIG_RELATIVE}, but it is missing`,
    );
  }
  const insertAt = match.index + match[0].length;
  const insertion = `${match[1]}"account_id": ${encoded},\n`;
  await writeFile(configPath, content.slice(0, insertAt) + insertion + content.slice(insertAt));
}

const CAIRN_CONFIG_RELATIVE = 'src/theme/cairn.config.ts';

/**
 * Matches the adapter's `email: { from: '...' }` entry in cairn.config.ts, with the address
 * itself captured in group 2. Matched by regex on the key shape, not on the template's
 * placeholder literal (`cms@showcase.test`), for the same reason `PUBLIC_ORIGIN_PATTERN` is:
 * after a resumed run the value may already be a real address.
 */
const EMAIL_FROM_PATTERN = /(email:\s*\{\s*from:\s*')([^']*)('\s*\})/;

/**
 * Rewrite the scaffold's `email: { from: '...' }` address in cairn.config.ts to the site's real
 * sender address, verified live against Cloudflare's onboarded apex (the T4b spike). Idempotent:
 * a file whose address already matches is left untouched and the function reports no change, so
 * the caller can skip a redundant deploy on a resumed run.
 * @param {string} dir the scaffold root
 * @param {string} address the site's real sender address (`no-reply@<domain>`)
 * @returns {Promise<boolean>} true when the file changed, false when the address was already correct
 */
export async function writeEmailFrom(dir, address) {
  const configPath = path.join(dir, CAIRN_CONFIG_RELATIVE);
  const content = await readFile(configPath, 'utf8');
  const match = EMAIL_FROM_PATTERN.exec(content);
  if (!match) {
    throw new Error(
      `writeEmailFrom: expected to find an "email: { from: '...' }" entry in ${CAIRN_CONFIG_RELATIVE}, but it is missing`,
    );
  }
  if (match[2] === address) return false;

  // A replace function, not a replacement string, so a `$` in the address could never be read as
  // a capture-group reference.
  const next = content.replace(
    EMAIL_FROM_PATTERN,
    (_whole, prefix, _current, suffix) => prefix + address + suffix,
  );
  await writeFile(configPath, next);
  return true;
}
