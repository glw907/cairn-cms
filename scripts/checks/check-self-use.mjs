// cairn-cms: the self-use gate. R-0's second direction (docs/internal/engine-rulings.md,
// `read-from-the-source-rule`) reads "an export the engine could use and does not is a shape
// defect until argued otherwise." No standing gate enforced that half; this one does. It walks
// the public surface `buildSurfaceModel()` already derives for check:surface, and for every
// export asks whether the engine itself, or the showcase, actually reaches for it. A name with
// no such call site is not necessarily wrong (most of the allowlist below is a genuine
// anonymous-consumer argument: a type a SITE annotates, never the engine), but it is a claim
// that deserves a reason on record, not silence.
//
// STATIC PARSING ONLY. This gate never `import()`s a showcase or consumer module (a gate that
// evaluates a consumer config is arbitrary code execution in CI); every signal here is a text
// scan over `src/lib` and `examples/showcase/src`.
//
// "Call site outside its own module": a whole-word occurrence of the export's name in a
// `src/lib` `.ts`/`.svelte` file that is not the file declaring it, and is not itself a barrel
// re-export line (`export { X } from '...'`, `export type { X } from '...'`, single- or
// multi-line) naming it. A file that only re-exports a name has not used it; only an import that
// a caller can act on, a type annotation, or a real invocation counts. Block comments (`/* ... */`,
// including TSDoc `{@link X}` prose) are blanked before scanning, so a doc-comment mentioning a
// sibling export's name is never mistaken for a real call site; a `//` line comment is not
// stripped (the risk of corrupting a string literal that itself contains `//` outweighs the
// class of false positive this misses in practice).
//
// Two arms feed the "has callers" verdict: in-engine call sites (src/lib, outside the declaring
// module) and showcase call sites (examples/showcase/src, the whole tree, since the showcase
// never declares an engine export). AUTH-PATH EXPORTS ARE THE EXCEPTION: an export declared
// under `src/lib/auth*` (auth, auth-channel, auth-crypto, auth-store) or one of
// `src/lib/sveltekit/{guard,csrf,admin-action,section-action}.ts` never counts a showcase call
// site as discharging it. A security seam must not be dischargeable by minting a demonstrative
// auth call in the copy-paste exemplar four production sites learn from; only an in-engine call
// site or a recorded allowlist reason can clear one.
//
// The allowlist (`check-self-use-allowlist.json`) is the record of every export this gate finds
// with zero callers, seeded from that export's ledger KEEP row where one exists (cited by slug)
// and fresh prose (`no-ledger-row: true`) where none does. Wired as `npm run check:self-use`.
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';
import { buildSurfaceModel } from './check-surface.mjs';

const ROOT = repoRoot(import.meta.url);
const ALLOWLIST_PATH = resolve(ROOT, 'scripts/checks/check-self-use-allowlist.json');

// The auth/security paths the showcase remedy is refused for, relative to ROOT. A directory
// prefix (`src/lib/auth` matches `auth`, `auth-channel`, `auth-crypto`, `auth-store`, every
// sibling starting with "auth") or an exact file.
const AUTH_ONLY_DIR_PREFIX = 'src/lib/auth';
const AUTH_ONLY_FILES = new Set(
  ['guard', 'csrf', 'admin-action', 'section-action'].map((n) => `src/lib/sveltekit/${n}.ts`),
);

/**
 * Whether a declaring-file path (relative to ROOT, forward-slashed) sits on an auth-only path:
 * the showcase-call-site remedy is refused there, per the gate's own security-seam rule.
 * @param {string} relFile
 * @returns {boolean}
 */
export function isAuthOnlyPath(relFile) {
  return relFile.startsWith(AUTH_ONLY_DIR_PREFIX) || AUTH_ONLY_FILES.has(relFile);
}

/** @param {string} name @returns {string} */
function escapeRe(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Blank (whitespace-replace, preserving line count and byte length) every `export { ... } from
// '...'`/`export type { ... } from '...'` re-export block, single- or multi-line (`[\s\S]*?` spans
// newlines), so a barrel line naming an export is never counted as usage of it.
const REEXPORT_BLOCK_RE = /export\s+(?:type\s*)?\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]/g;
/** @param {string} text @returns {string} */
export function blankReexportBlocks(text) {
  return text.replace(REEXPORT_BLOCK_RE, (m) => m.replace(/[^\n]/g, ' '));
}

// Blank every `/* ... */` block comment (including TSDoc), so a `{@link Name}` or prose mention
// is never counted as usage of `Name`.
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
/** @param {string} text @returns {string} */
export function blankBlockComments(text) {
  return text.replace(BLOCK_COMMENT_RE, (m) => m.replace(/[^\n]/g, ' '));
}

/** @param {string} text @returns {string} */
function prepareText(text) {
  return blankBlockComments(blankReexportBlocks(text));
}

// A top-level export declaration: `export (default)? (async)? function|class|interface|type|enum
// |const|let|var NAME`. Deliberately excludes `export { NAME } from '...'` (a re-export, not a
// declaration) and `export { NAME }` (a local re-export list, rare enough here that the file it
// lives in is not worth treating as NAME's "own module").
const DECL_RE = /^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/;

/**
 * Every `.ts`/`.svelte` file under `dir` (recursive), relative-to-ROOT paths, forward-slashed.
 * @param {string} dir
 * @returns {string[]}
 */
function sourceFiles(dir) {
  return walk(resolve(ROOT, dir), (n) => n.endsWith('.ts') || n.endsWith('.svelte')).sort();
}

/**
 * The name-to-declaring-files map over `src/lib`: every name a top-level `export function|class|
 * interface|type|enum|const|let|var` declares, keyed to the file(s) that declare it.
 * @param {string[]} libFiles absolute paths
 * @param {Map<string, string>} texts absolute path to prepared text
 * @returns {Map<string, Set<string>>}
 */
export function buildDeclMap(libFiles, texts) {
  /** @type {Map<string, Set<string>>} */
  const declMap = new Map();
  for (const file of libFiles) {
    const text = texts.get(file) ?? '';
    for (const line of text.split('\n')) {
      const m = DECL_RE.exec(line);
      if (!m) continue;
      const name = m[1];
      const files = declMap.get(name) ?? new Set();
      files.add(file);
      declMap.set(name, files);
    }
  }
  return declMap;
}

/**
 * The absolute file paths (from `files`) whose prepared text carries a whole-word occurrence of
 * `name`, excluding any file in `ownFiles`.
 * @param {string} name
 * @param {string[]} files absolute paths
 * @param {Map<string, string>} texts absolute path to prepared text
 * @param {Set<string>} ownFiles absolute paths to exclude (the declaring module)
 * @returns {string[]}
 */
export function callSites(name, files, texts, ownFiles) {
  const re = new RegExp(`(?<![\\w$])${escapeRe(name)}(?![\\w$])`);
  const hits = [];
  for (const file of files) {
    if (ownFiles.has(file)) continue;
    if (re.test(texts.get(file) ?? '')) hits.push(file);
  }
  return hits;
}

/**
 * The full self-use analysis for one export name.
 * @param {string} name
 * @param {string[]} libFiles absolute paths
 * @param {string[]} showcaseFiles absolute paths
 * @param {Map<string, string>} texts absolute path to prepared text
 * @param {Map<string, Set<string>>} declMap
 * @returns {{ name: string, ownFiles: string[], engineCallSites: string[], showcaseCallSites: string[], authOnly: boolean, hasCallers: boolean }}
 */
export function analyzeExport(name, libFiles, showcaseFiles, texts, declMap) {
  const ownFiles = declMap.get(name) ?? new Set();
  const ownRel = [...ownFiles].map((f) => relative(ROOT, f).split('\\').join('/'));
  const authOnly = ownRel.some(isAuthOnlyPath);
  const engineCallSites = callSites(name, libFiles, texts, ownFiles);
  const showcaseCallSites = callSites(name, showcaseFiles, texts, new Set());
  const hasCallers = engineCallSites.length > 0 || (!authOnly && showcaseCallSites.length > 0);
  return { name, ownFiles: ownRel, engineCallSites, showcaseCallSites, authOnly, hasCallers };
}

/**
 * Every export name across every subpath of `model`, deduplicated.
 * @param {Record<string, Record<string, string>>} model
 * @returns {string[]}
 */
export function allExportNames(model) {
  const names = new Set();
  for (const subpath of Object.keys(model)) for (const name of Object.keys(model[subpath])) names.add(name);
  return [...names].sort();
}

/**
 * The full self-use analysis over the whole public surface.
 * @param {Record<string, Record<string, string>>} model
 * @returns {ReturnType<typeof analyzeExport>[]}
 */
export function analyzeSurface(model) {
  const libFiles = sourceFiles('src/lib');
  const showcaseFiles = sourceFiles('examples/showcase/src');
  /** @type {Map<string, string>} */
  const texts = new Map();
  for (const file of [...libFiles, ...showcaseFiles]) texts.set(file, prepareText(readFileSync(file, 'utf8')));
  const declMap = buildDeclMap(libFiles, texts);
  return allExportNames(model).map((name) => analyzeExport(name, libFiles, showcaseFiles, texts, declMap));
}

/** @typedef {{ name: string, ledger?: string, "no-ledger-row"?: boolean, reason: string }} AllowlistEntry */

/** @returns {{ entries: AllowlistEntry[] }} */
function loadAllowlist() {
  /** @type {string} */
  let raw;
  try {
    raw = readFileSync(ALLOWLIST_PATH, 'utf8');
  } catch (err) {
    console.error(`check-self-use: could not read ${relative(ROOT, ALLOWLIST_PATH)}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`check-self-use: ${relative(ROOT, ALLOWLIST_PATH)} is not valid JSON: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

/**
 * The gate's verdict: every zero-caller export not covered by a reasoned allowlist entry.
 * @param {ReturnType<typeof analyzeExport>[]} analysis
 * @param {AllowlistEntry[]} entries
 * @returns {{ ok: true } | { ok: false, unlisted: ReturnType<typeof analyzeExport>[] }}
 */
export function findViolations(analysis, entries) {
  /** @type {Set<string>} */
  const allowed = new Set();
  for (const entry of entries) {
    if (entry.name && typeof entry.reason === 'string' && entry.reason.trim().length > 0) {
      allowed.add(entry.name);
    }
  }
  const unlisted = analysis.filter((a) => !a.hasCallers && !allowed.has(a.name));
  return unlisted.length === 0 ? { ok: true } : { ok: false, unlisted };
}

/**
 * Format the gate's failure message: the remedy order (allowlist first, showcase call site
 * second, deletion never suggested here), naming each unlisted export and whether the
 * showcase remedy is even available to it.
 * @param {ReturnType<typeof analyzeExport>[]} unlisted
 * @returns {string}
 */
export function formatViolations(unlisted) {
  const lines = [
    'check-self-use: the following public exports have zero call sites in src/lib outside their',
    'own module and zero showcase call sites, and carry no allowlist entry. Remedy order: (1) add',
    'a reasoned entry to scripts/checks/check-self-use-allowlist.json, citing the ledger KEEP row',
    'if one exists; (2) failing that, give it a real showcase call site (refused for auth/security',
    "paths below, see the gate's own header); this gate never suggests deletion as its own remedy.",
    '',
  ];
  for (const a of unlisted) {
    const where = a.ownFiles.length ? a.ownFiles.join(', ') : '(no declaring file found)';
    const remedy = a.authOnly ? 'allowlist-only (auth/security path)' : 'allowlist or showcase call site';
    lines.push(`  - ${a.name} (declared: ${where}) — ${remedy}`);
  }
  return lines.join('\n');
}

function main() {
  const model = buildSurfaceModel();
  const analysis = analyzeSurface(model);
  const { entries } = loadAllowlist();
  const result = findViolations(analysis, entries);
  if (result.ok) {
    console.log(`check-self-use OK (${analysis.length} public exports, ${entries.length} allowlisted)`);
    process.exit(0);
  }
  console.error(formatViolations(result.unlisted));
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
