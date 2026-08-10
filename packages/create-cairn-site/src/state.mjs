// The out-of-scaffold state store. The umbrella spec's rule, carried here verbatim: tool state
// never lives under the scaffold directory, and no secret is ever written under the project
// directory. A manifest response written into the project is one `git add -A` away from a
// published private key, so this module writes only under the user's own config home
// (`~/.config/cairn/sites`, or `CAIRN_STATE_DIR` under test), never anywhere the scaffold's own
// `git init` or a site's build could pick it up. Read the env var at call time in every export,
// never cache it at module load, so a test that sets it before importing (and any later task
// that sets it per run) sees its own directory rather than a value baked in at first import.
import { mkdir, writeFile, readFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { slugify } from './slug.mjs';

/**
 * The directory site state files are written under.
 * @returns {string} `CAIRN_STATE_DIR` when set (the test seam), else `~/.config/cairn/sites`
 */
export function siteStateDir() {
  return process.env.CAIRN_STATE_DIR ?? path.join(homedir(), '.config', 'cairn', 'sites');
}

/**
 * Build a new site id: a slug of `name` plus a six-character random suffix.
 * @param {string} name the site's display name, as answered at the name prompt
 * @returns {string} an id matching `<slug>-<six lowercase alphanumeric characters>`
 */
export function newSiteId(name) {
  const suffix = randomBytes(6).toString('hex').slice(0, 6);
  return `${slugify(name, 'site')}-${suffix}`;
}

/**
 * Save a site's state, creating the state directory if needed. Both the directory and the file
 * are chmod'd explicitly after writing: `fs.writeFile`'s own `mode` option only takes effect
 * when it creates the file and is masked by the process umask, so an overwrite of an
 * already-loosened file would otherwise keep the looser mode.
 * @param {string} id the site id, as returned by newSiteId
 * @param {object} data the state to persist; serialized as pretty-printed JSON
 * @returns {Promise<void>}
 */
export async function saveSite(id, data) {
  const dir = siteStateDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const file = path.join(dir, `${id}.json`);
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  await chmod(file, 0o600);
}

/**
 * Load a previously saved site's state.
 * @param {string} id the site id
 * @returns {Promise<object | null>} the parsed state, or null when no file exists for `id`; any
 *  other read or parse failure (a permission error, malformed JSON) rejects instead
 */
export async function loadSite(id) {
  const file = path.join(siteStateDir(), `${id}.json`);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (cause) {
    if (cause.code === 'ENOENT') return null;
    throw cause;
  }
  return JSON.parse(raw);
}

/**
 * Create or update a site's state, deep-merging the `github` key rather than replacing it: the
 * GitHub chapter persists one hop at a time (app-created, installed, repo-created, pushed), and
 * each hop's patch carries only the fields it learned, so a shallow merge would drop the
 * credentials an earlier hop already saved. Never throws on a missing record: a record can go
 * missing only from an operator error outside this tool's control, and raising here after a
 * GitHub App or repository already exists would orphan a globally-unique App name with no way to
 * recover it (see scaffold.mjs's own warn-don't-abort comment on `saveSite` for the same class of
 * failure).
 * @param {string} id the site id
 * @param {object} patch the fields to merge in; `patch.github` merges into `current.github`
 *  rather than replacing it
 * @returns {Promise<object>} the merged state, already saved
 */
export async function updateSite(id, patch) {
  const current = (await loadSite(id)) ?? {};
  const next = { ...current, ...patch, github: { ...current.github, ...patch.github } };
  await saveSite(id, next);
  return next;
}
