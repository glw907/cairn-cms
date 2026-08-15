// cairn-cms: the docs arm-index coverage gate. Each published docs arm keeps an index page that
// links every page in its own directory. This gate is a set difference only: for every `.md` file
// in an arm's directory (excluding the index itself), the arm's index file must contain a relative
// link whose resolved target is that file. It does no prose analysis and parses no numeric claims;
// a page that exists on disk but is not reachable from its arm's index is the one thing this checks.
//
// All four published arms keep their index inside the directory (`docs/reference/README.md`, and so
// on). `docs/why-cairn.md` is the exception the arm shape cannot express: a published page with no
// directory of its own, reachable only from the front door. FRONT_DOOR_PAGES covers it, so a front
// door that stops linking the evaluator's page fails the same way an unindexed arm page does.
//
// `docs/internal` is a fifth arm, contributor-zone rather than published, and walks non-recursively:
// only its own top-level `.md` files are checked against `docs/internal/README.md`. It carries dated
// record files under `docs/internal/record/` and other subdirectories (`design/`, `feedback/`,
// `history/`, `probes/`) that keep their own filing rule and their own index, and a recursive walk
// would wrongly demand this top-level README link every dated record by name, recreating the
// sediment problem the filing rule exists to end.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linksIn, isExternal } from './docs-links.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Each arm's directory and the index file that must link every page in it. `recursive` defaults to
// true; an arm sets it false to check only its own top-level `.md` files, skipping every
// subdirectory (`docs/internal`'s `record/`, `design/`, `feedback/`, `history/`, `probes/`).
const ARMS = [
  { dir: 'docs/reference', index: 'docs/reference/README.md' },
  { dir: 'docs/admin', index: 'docs/admin/README.md' },
  { dir: 'docs/editors', index: 'docs/editors/README.md' },
  { dir: 'docs/extend', index: 'docs/extend/README.md' },
  { dir: 'docs/internal', index: 'docs/internal/README.md', recursive: false },
];

// Published pages that belong to no arm directory, each with the index that must link it. A bare
// file cannot be found by walking an arm, so it is named here or it is checked by nothing.
const FRONT_DOOR_PAGES = [
  { page: 'docs/why-cairn.md', index: 'docs/README.md' },
];

// Pages deliberately left unindexed (a draft skeleton, a page mid-retirement). Keyed by the
// page's repo-relative path. Currently empty: every real page belongs in its arm's index, so an
// entry here should carry a reason comment and be rare.
const ALLOWLIST = /** @type {Set<string>} */ (new Set());

// Directory names skipped while walking an arm, since they hold generated or fixture output
// rather than published pages.
const SKIP_DIRS = new Set(['__snapshots__', 'snapshots']);

// Recursively collect `.md` files under a directory, as absolute paths, skipping SKIP_DIRS.
/** @param {string} dir */
function walkMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Collect only the `.md` files directly inside a directory, no subdirectory walked at all. Used by
// an arm marked `recursive: false`.
/** @param {string} dir */
function listMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(dir, entry.name));
}

// The absolute link targets an index file's links resolve to, external links dropped and any
// `#anchor` stripped, since only the path half matters for arm coverage.
/** @param {string} indexAbs */
function linkTargetsOf(indexAbs) {
  const text = readFileSync(indexAbs, 'utf8');
  const targets = new Set();
  for (const { dest } of linksIn(text)) {
    if (isExternal(dest)) continue;
    const hash = dest.indexOf('#');
    const path = hash === -1 ? dest : dest.slice(0, hash);
    if (path === '') continue;
    targets.add(resolve(dirname(indexAbs), path));
  }
  return targets;
}

/**
 * Every page missing from its arm's index. Each entry names the arm, the unindexed page, and the
 * index file that should link it.
 */
export function findUnindexedPages(root = ROOT) {
  /** @type {{ arm: string, page: string, index: string }[]} */
  const missing = [];
  for (const { dir, index, recursive = true } of ARMS) {
    const dirAbs = join(root, dir);
    const indexAbs = join(root, index);
    if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
      throw new Error(`check-arm-indexes: arm directory not found: ${dir}`);
    }
    if (!existsSync(indexAbs)) {
      throw new Error(`check-arm-indexes: arm index not found: ${index}`);
    }
    const targets = linkTargetsOf(indexAbs);
    const pages = recursive ? walkMarkdown(dirAbs) : listMarkdown(dirAbs);
    for (const pageAbs of pages) {
      if (pageAbs === indexAbs) continue;
      const page = relative(root, pageAbs);
      if (ALLOWLIST.has(page)) continue;
      if (!targets.has(pageAbs)) missing.push({ arm: dir, page, index });
    }
  }
  for (const { page, index } of FRONT_DOOR_PAGES) {
    const pageAbs = join(root, page);
    const indexAbs = join(root, index);
    if (!existsSync(pageAbs)) {
      throw new Error(`check-arm-indexes: front-door page not found: ${page}`);
    }
    if (!existsSync(indexAbs)) {
      throw new Error(`check-arm-indexes: front-door index not found: ${index}`);
    }
    if (!linkTargetsOf(indexAbs).has(pageAbs)) {
      missing.push({ arm: 'front door', page, index });
    }
  }
  return missing;
}

function main() {
  const missing = findUnindexedPages();
  if (missing.length === 0) {
    console.log('check-arm-indexes: OK (every arm page is linked from its arm index)');
    return;
  }
  console.error(`check-arm-indexes: ${missing.length} page(s) missing from their arm index\n`);
  for (const { arm, page, index } of missing) {
    console.error(`  ${page}  -- not linked from ${index} (arm: ${arm})`);
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
