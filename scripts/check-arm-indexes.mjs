// cairn-cms: the docs arm-index coverage gate. Each published docs arm keeps an index page that
// links every page in its own directory. This gate is a set difference only: for every `.md` file
// in an arm's directory (excluding the index itself), the arm's index file must contain a relative
// link whose resolved target is that file. It does no prose analysis and parses no numeric claims;
// a page that exists on disk but is not reachable from its arm's index is the one thing this checks.
//
// Three of the four arms keep their index inside the directory (`docs/reference/README.md`, and so
// on). The tutorial arm has no README of its own: its index is the front door, `docs/README.md`,
// which links both tutorial pages. That mapping is declared explicitly below, by design, not a gap.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linksIn, isExternal } from './docs-links.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Each arm's directory and the index file that must link every page in it. The tutorial arm's
// index lives outside its own directory (`docs/README.md`, the front door), because the tutorial
// arm has no README of its own; this is the load-bearing mapping the gate encodes on purpose.
const ARMS = [
  { dir: 'docs/reference', index: 'docs/reference/README.md' },
  { dir: 'docs/guides', index: 'docs/guides/README.md' },
  { dir: 'docs/explanation', index: 'docs/explanation/README.md' },
  { dir: 'docs/tutorial', index: 'docs/README.md' },
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
  for (const { dir, index } of ARMS) {
    const dirAbs = join(root, dir);
    const indexAbs = join(root, index);
    if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
      throw new Error(`check-arm-indexes: arm directory not found: ${dir}`);
    }
    if (!existsSync(indexAbs)) {
      throw new Error(`check-arm-indexes: arm index not found: ${index}`);
    }
    const targets = linkTargetsOf(indexAbs);
    for (const pageAbs of walkMarkdown(dirAbs)) {
      if (pageAbs === indexAbs) continue;
      const page = relative(root, pageAbs);
      if (ALLOWLIST.has(page)) continue;
      if (!targets.has(pageAbs)) missing.push({ arm: dir, page, index });
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
