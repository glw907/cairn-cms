// The out-of-scaffold state store. The umbrella spec's rule, carried here verbatim: tool state
// never lives under the scaffold directory, and no secret is ever written under the project
// directory. A manifest response written into the project is one `git add -A` away from a
// published private key, so this module writes only under the user's own config home
// (`~/.config/cairn/sites`, or `CAIRN_STATE_DIR` under test), never anywhere the scaffold's own
// `git init` or a site's build could pick it up. Read the env var at call time in every export,
// never cache it at module load, so a test that sets it before importing (and any later task
// that sets it per run) sees its own directory rather than a value baked in at first import.
import { mkdir, writeFile, readFile, chmod, readdir, stat, rename } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { slugify } from './slug.mjs';

/**
 * The shape a live site id takes: `newSiteId`'s `<slug>-<six lowercase alphanumeric characters>`.
 * A retired record's stem (`<id>.retired-<epoch-ms>`) carries a dot and never matches, which is
 * what keeps `findSiteByDir`'s directory scan from ever surfacing one.
 */
const SITE_ID_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/;

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

/**
 * Find the site record, if any, whose `dir` resolves to the same path as the given directory.
 * Backs the CLI's resume prompt: a re-run pointed at a directory that already has a record picks
 * up where that record left off instead of re-asking the site's name. A malformed record is
 * skipped rather than failing the whole scan, since a stray or partially-written file under the
 * state directory should never block every other site's resume.
 * @param {string} dir the target directory to match against each record's saved `dir`
 * @returns {Promise<{ id: string, data: object } | null>} the newest-mtime match, or null when the
 *  state directory does not exist or holds no matching record
 */
export async function findSiteByDir(dir) {
  const stateDir = siteStateDir();
  let entries;
  try {
    entries = await readdir(stateDir);
  } catch (cause) {
    if (cause.code === 'ENOENT') return null;
    throw cause;
  }

  const target = path.resolve(dir);
  let best = null;
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const id = entry.slice(0, -'.json'.length);
    if (!SITE_ID_SHAPE.test(id)) continue;

    const filePath = path.join(stateDir, entry);
    let data;
    try {
      data = JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (typeof data.dir !== 'string' || path.resolve(data.dir) !== target) continue;

    const { mtimeMs } = await stat(filePath);
    if (!best || mtimeMs > best.mtimeMs) {
      best = { id, data, mtimeMs };
    }
  }
  return best ? { id: best.id, data: best.data } : null;
}

/**
 * Retire a site record by renaming it out of the way rather than deleting it, so a crashed or
 * abandoned run's history stays on disk for a developer to inspect. `findSiteByDir` never returns
 * a retired record, since its renamed stem no longer matches the site id shape.
 * @param {string} id the site id to retire
 * @returns {Promise<void>}
 */
export async function retireSite(id) {
  const dir = siteStateDir();
  const from = path.join(dir, `${id}.json`);
  const to = path.join(dir, `${id}.retired-${Date.now()}.json`);
  await rename(from, to);
}
