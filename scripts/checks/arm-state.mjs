// cairn-cms: the docs arm-state reader every arm-aware gate shares. The admin, editors, and extend
// arms and the front door are deleted and then rebuilt one stage at a time, so a gate that pins a
// page in one of them has to tell three situations apart:
//
//   absent     the arm holds no page (its directory is gone, since git keeps no empty directory);
//   kept-only  the arm holds only pages on the deletion list's `kept` set (extend's per-version
//              records, until its rebuild);
//   rebuilt    the arm holds any page outside the kept set, which restores the gate's full check.
//
// The kept set comes from docs/internal/record/harvest/deletion-list.json, the one committed list
// the harvest verifier also reads. The list is read fail-closed: a missing, unparseable, or
// misshapen list throws, so no gate can read a vanished list as an empty arm and pass. The trigger
// is always the pages an arm holds, never whether its directory or its index exists: an arm index
// is a page like any other, so a stage that adds one rebuilds its arm.
//
// The front door has no directory. Its pages are the two fixed files below; it has no kept page,
// so it is only ever absent or rebuilt.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The committed deletion list, repo-relative. */
export const DELETION_LIST_PATH = 'docs/internal/record/harvest/deletion-list.json';

/** Every arm this reader answers for, in report order. */
export const ARM_NAMES = ['admin', 'editors', 'extend', 'front-door'];

/** The directory each directory-backed arm lives in. */
export const ARM_DIRS = { admin: 'docs/admin', editors: 'docs/editors', extend: 'docs/extend' };

/** The front door's pages: the docs index and the evaluator's page. */
export const FRONT_DOOR_PAGES = ['docs/README.md', 'docs/why-cairn.md'];

/**
 * @typedef {'absent' | 'kept-only' | 'rebuilt'} ArmState
 * @typedef {{ deleted: string[], kept: string[] }} DeletionList
 * @typedef {Record<string, ArmState>} ArmStates
 */

/**
 * The arm a repo-relative Markdown path belongs to, or null when it belongs to none (a reference
 * page, an internal doc, a non-Markdown file).
 * @param {string} path
 * @returns {string | null}
 */
export function armOf(path) {
  if (FRONT_DOOR_PAGES.includes(path)) return 'front-door';
  if (!path.endsWith('.md')) return null;
  for (const [arm, dir] of Object.entries(ARM_DIRS)) {
    if (path.startsWith(`${dir}/`)) return arm;
  }
  return null;
}

/**
 * Read and shape-check the deletion list under `root`. Throws on a missing file, invalid JSON, a
 * shape other than two string arrays, a path in no arm, or a path listed twice.
 * @param {string} root
 * @returns {DeletionList}
 */
export function loadDeletionList(root) {
  const abs = join(root, DELETION_LIST_PATH);
  if (!existsSync(abs)) throw new Error(`arm-state: ${DELETION_LIST_PATH} does not exist`);
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (error) {
    throw new Error(`arm-state: ${DELETION_LIST_PATH} is not valid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
  const isPathList = (/** @type {unknown} */ v) => Array.isArray(v) && v.every((p) => typeof p === 'string');
  const candidate = /** @type {{ deleted?: unknown, kept?: unknown } | null} */ (
    typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  );
  if (!candidate || !isPathList(candidate.deleted) || !isPathList(candidate.kept)) {
    throw new Error(`arm-state: ${DELETION_LIST_PATH} must hold "deleted" and "kept", each an array of repo-relative page paths`);
  }
  const list = /** @type {DeletionList} */ (candidate);
  const all = [...list.deleted, ...list.kept];
  for (const path of all) {
    if (!armOf(path)) throw new Error(`arm-state: ${DELETION_LIST_PATH}: ${path} is in no arm`);
  }
  const repeated = all.find((path, i) => all.indexOf(path) !== i);
  if (repeated) throw new Error(`arm-state: ${DELETION_LIST_PATH}: ${repeated} appears more than once`);
  return { deleted: list.deleted, kept: list.kept };
}

/**
 * Every `.md` file under `dir`, recursively, as repo-relative forward-slash paths.
 * @param {string} root
 * @param {string} dir repo-relative
 * @returns {string[]}
 */
function markdownUnder(root, dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...markdownUnder(root, rel));
    else if (name.endsWith('.md')) out.push(rel);
  }
  return out;
}

/**
 * The pages an arm holds on disk under `root`, repo-relative.
 * @param {string} root
 * @param {string} arm
 * @returns {string[]}
 */
export function armPages(root, arm) {
  if (arm === 'front-door') return FRONT_DOOR_PAGES.filter((page) => existsSync(join(root, page)));
  const dir = ARM_DIRS[/** @type {keyof typeof ARM_DIRS} */ (arm)];
  if (!dir) throw new Error(`arm-state: unknown arm "${arm}" (known: ${ARM_NAMES.join(', ')})`);
  return markdownUnder(root, dir);
}

/**
 * One arm's state under `root`. The kept set comes from `list`, or from the committed deletion
 * list when none is passed.
 * @param {string} root
 * @param {string} arm
 * @param {DeletionList} [list]
 * @returns {ArmState}
 */
export function armState(root, arm, list) {
  const pages = armPages(root, arm);
  const kept = new Set((list ?? loadDeletionList(root)).kept);
  if (pages.length === 0) return 'absent';
  return pages.every((page) => kept.has(page)) ? 'kept-only' : 'rebuilt';
}

/**
 * Every arm's state under `root`, keyed by arm name, reading the deletion list once.
 * @param {string} root
 * @returns {ArmStates}
 */
export function readArmStates(root) {
  const list = loadDeletionList(root);
  return Object.fromEntries(ARM_NAMES.map((arm) => [arm, armState(root, arm, list)]));
}
