// cairn-cms: the facts container gate. docs/internal/facts/README.md defines the grammar a fact
// bullet follows (one Source, one vocabulary tag at the end, in colon-qualifier form) and, until
// this script existed, review was the only thing enforcing it. This walks every arm file and
// fails on the first grammar violation, replacing the README's old hand-maintained index table
// with the per-file tag counts this script prints on success.
//
// README.md itself is excluded from the walk: it documents the grammar in prose, with example
// tags shown in backtick code spans (`` `[verified]` ``, `` `[docs-drift: page says "..."]` ``),
// not fact bullets of its own, so scanning it as a fact file produces only false positives.
//
// A bullet's line can soft-wrap across several markdown source lines (the container's own
// authoring convention keeps lines under roughly 100 columns); a bullet is every line from one
// `- ` at column 0 up to (not including) the next such line, a blank line, or a heading, joined
// with single spaces. Two headings are allowlisted and skipped entirely, per the README's "Fact
// format" section: `## Harvest record` and `## Provenance`.
//
// A bullet's tag is found by scanning for a vocabulary word inside square brackets, OUTSIDE any
// backtick code span or double-quoted span; a real fact bullet routinely carries brackets that
// are not tags at all (an array literal like `['media', 'vocabulary']`, a bot suffix like
// `cairn-cms[bot]`, a SvelteKit catch-all route segment like `[...path]`), and those all appear
// inside a code span or a quoted anchor, which is why they are stripped before the bracket scan
// runs rather than excluded by a vocabulary allowlist alone (a stray, non-code bracket outside
// the trailing tag is still a real grammar violation the gate should catch).
//
// Every fact bullet also carries an opaque id, a leading `` `f:xxxxxx` `` code span the bracket
// scan already treats as a code span and skips: six lowercase base36 characters minted once by
// `mintFactId` and never derived from the bullet's own text, so editing a claim or its source
// never touches the id. A bullet with no such leading span fails; an id that repeats anywhere in
// the container, across files, fails too. `--mint` on the command line prints one freshly minted
// id and exits, the path `docs/internal/facts/README.md` sends a filer down.
//
// A `Source:` pointer into `docs/internal/record/` is a special case: that whole directory is one
// of the paths a repository-class reader export excludes (see
// `scripts/docs-readers/lib/prepare-class.ts`'s `REPOSITORY_EXCLUDED_PATHS`), so a pointer into it
// is skipped, not failed, exactly when the directory itself is absent; when the directory exists
// and the cited file inside it does not, that is an ordinary broken pointer and still fails.
//
// A `path:line` or `path:line-line` pointer inside the bullet's `Source:` field is resolved two
// ways: first as a literal path from the repo root, then, when that fails and the pointer names
// no directory at all (a bare filename, the container's shorthand for "the file just named
// above, in the same directory" that this gate does not attempt to track), as a unique basename
// match anywhere under the repo (excluding `node_modules`, build output, and VCS/tooling
// directories). A pointer whose basename is not unique fails rather than guessing.
//
// A pointer that carries a quoted anchor (a backtick-quoted snippet in parens right after the
// pointer) is checked against a WINDOW around the cited line range, not the exact line: this
// container's own anchors are frequently a paraphrase or an elided quote of a multi-line block
// (an ellipsis `...` standing in for omitted code), and an occasional citation lands a few lines
// off the token it names, so per-line exact matching produces false positives against real,
// reviewed facts. The window is the cited range expanded by 10 lines on each side (clamped to the
// file); checking that every identifier-shaped token (3+ word characters) the anchor names
// appears somewhere in that window is a weaker proof than per-line verification, but it is the
// level this container's authored style actually supports, and it still catches an anchor naming
// a symbol nowhere near the cited line (measured against every anchored pointer in the real
// container: a whole-file check passed all of them, a window this size caught the two whose
// citation had drifted a full function away).
//
// A pointer into `src/` may name a symbol instead of a line: `` `src/lib/x.ts#Symbol` ``, or a
// dotted path to a nested declaration, `` `src/lib/x.ts#outerFn.innerFn` `` (an interface member,
// an object-literal property, a function declared inside another). The TypeScript compiler API
// parses the file and finds the named declaration: an undotted symbol only at the top level, each
// later segment only directly inside the one before, so a renamed symbol fails rather than
// resolving to a same-named local. The anchor, when one follows, is checked against that
// declaration's own lines rather than a window around a cited line number, so an edit that moves
// the declaration cannot rot the pointer. The form is limited
// to `.ts`/`.js` files under `src/`: a `.svelte` file is not parseable by the compiler API and its
// markup has no nameable symbol, so it keeps a `path:line` pointer.
//
// The owner tier is every bullet whose source is the owner brief,
// `docs/internal/what-cairn-is-and-is-not.md`, named either in its `Source:` field or in its
// section heading (the container's "same file" shorthand). Each carries a key phrase, written
// `Key phrase: "..."` before its `Source:`, a short verbatim phrase from the owner brief the claim
// rests on; `check-provenance.mjs` matches those phrases in a page's sentences. This gate fails an
// owner-tier bullet with no key phrase, and a key phrase the owner brief does not contain
// verbatim (compared case-insensitively, whitespace collapsed, markdown emphasis dropped); the
// verbatim check is skipped only when the owner brief itself is absent.
//
// A bullet under `## Harvest record` or `## Provenance` is exempt from the grammar, but it may
// not carry a fact id: an id there would read as a citable fact that no grammar check covers.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const FACTS_DIR = join(ROOT, 'docs/internal/facts');

/** Section headings whose bullets carry no Source/tag requirement and no fact id. */
export const SKIPPED_SECTIONS = new Set(['harvest record', 'provenance']);

/** The full status-tag vocabulary, in the order the README lists it. */
export const TAG_VOCABULARY = ['verified', 'docs-drift', 'external', 'vendor', 'candidate', 'rejected'];

const TAG_RE = new RegExp('\\[(' + TAG_VOCABULARY.join('|') + ')\\b[^\\]]*\\]', 'g');
const ANY_BRACKET_TAG_RE = /\[([a-zA-Z-]+)(:[^\]]*)?\]/g;

/** Lines on each side of a pointer's cited range an anchor's tokens may fall within. */
const ANCHOR_WINDOW = 10;

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.svelte-kit',
  '.git',
  '.claude',
  'coverage',
  '.cache',
]);

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** The largest multiple of 36 within a byte's 256 values, for unbiased rejection sampling. */
const REJECTION_CEILING = 216;

/**
 * One unbiased base36 digit from `crypto.randomBytes`, drawing another byte whenever the one
 * drawn falls in the biased tail above `REJECTION_CEILING` (256 is not a multiple of 36, so a
 * plain `byte % 36` would favor the low digits).
 * @returns {string}
 */
function randomBase36Char() {
  let byte;
  do {
    [byte] = randomBytes(1);
  } while (byte >= REJECTION_CEILING);
  return BASE36[byte % 36];
}

/**
 * Mint a fresh, opaque fact id: `f:` plus six lowercase base36 characters. An id is never derived
 * from a bullet's content, so editing a bullet's claim or its source never touches the id; that is
 * the one rule `docs/internal/facts/README.md` states for a filer. Each call draws independently
 * from `crypto.randomBytes`, so two filers minting in separate worktrees at the same moment do not
 * collide against the 36^6 (about 2.18 billion) id space.
 * @returns {string}
 */
export function mintFactId() {
  let id = '';
  for (let i = 0; i < 6; i++) id += randomBase36Char();
  return `f:${id}`;
}

/** A fact bullet's leading id: `` `f:xxxxxx` `` immediately after the `- ` marker. */
export const FACT_ID_RE = /^`(f:[0-9a-z]{6})`/;

/**
 * A bullet's fact id, or null when it carries none. The id is always the bullet's leading code
 * span, so a later edit to the claim or the source never changes what this returns.
 * @param {string} bulletText
 * @returns {string | null}
 */
export function extractFactId(bulletText) {
  const match = bulletText.match(FACT_ID_RE);
  return match ? match[1] : null;
}

/**
 * @typedef {{ id: string, file: string, line: number }} FactIdOccurrence
 */

/**
 * Every id occurring more than once anywhere in the container, keyed by id, each value carrying
 * every occurrence (not just the second one), so a defect message can name every bullet that
 * shares it.
 * @param {FactIdOccurrence[]} occurrences
 * @returns {Map<string, FactIdOccurrence[]>}
 */
export function findDuplicateFactIds(occurrences) {
  /** @type {Map<string, FactIdOccurrence[]>} */
  const byId = new Map();
  for (const occurrence of occurrences) {
    const list = byId.get(occurrence.id);
    if (list) list.push(occurrence);
    else byId.set(occurrence.id, [occurrence]);
  }
  /** @type {Map<string, FactIdOccurrence[]>} */
  const duplicates = new Map();
  for (const [id, list] of byId) {
    if (list.length > 1) duplicates.set(id, list);
  }
  return duplicates;
}

/**
 * One fact bullet extracted from an arm file: its section heading, its fully joined text (soft
 * wraps collapsed to single spaces), and the source line its `- ` marker started on.
 * @typedef {{ section: string | null, text: string, line: number }} Bullet
 */

/**
 * Every bullet in a facts arm file, joined across soft-wrapped continuation lines, with the
 * section heading each bullet falls under. A continuation line is any non-blank, non-bullet,
 * non-heading line that follows an open bullet.
 * @param {string} markdown
 * @returns {Bullet[]}
 */
export function extractBullets(markdown) {
  const lines = markdown.split('\n');
  /** @type {Bullet[]} */
  const bullets = [];
  /** @type {string | null} */
  let current = null;
  let startLine = 0;
  /** @type {string | null} */
  let section = null;
  const flush = () => {
    if (current !== null) bullets.push({ section, text: current, line: startLine });
    current = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      flush();
      section = line.slice(3).trim();
      continue;
    }
    if (line.startsWith('- ')) {
      flush();
      current = line.slice(2);
      startLine = i + 1;
      continue;
    }
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (current !== null) current += ' ' + line.trim();
  }
  flush();
  return bullets;
}

/**
 * Strip every backtick code span and double-quoted span from a bullet's text, replacing each
 * with a same-length run of `x` so a defect's reported column position still lines up with the
 * original text. Used before the bracket-outside-code scan, since a code span or a quoted
 * anchor routinely carries a bracket (`cairn-cms[bot]`, `['media']`, `[...path]`) that is not a
 * status tag.
 * @param {string} text
 * @returns {string}
 */
export function maskCodeAndQuotedSpans(text) {
  return text.replace(/`[^`]*`|"[^"]*"/g, (m) => 'x'.repeat(m.length));
}

/**
 * @typedef {{ ok: true, tag: string } | { ok: false, reason: string }} TagCheck
 */

/**
 * Validate a bullet's status tag: exactly one vocabulary tag, at the very end of the bullet, in
 * colon-qualifier form, with no other bracket outside a code span or quoted span anywhere else
 * in the bullet.
 * @param {string} bulletText
 * @returns {TagCheck}
 */
export function checkTag(bulletText) {
  const masked = maskCodeAndQuotedSpans(bulletText);
  const matches = [...masked.matchAll(TAG_RE)];
  if (matches.length === 0) {
    const anyTag = [...masked.matchAll(ANY_BRACKET_TAG_RE)];
    const trailing = anyTag[anyTag.length - 1];
    if (trailing && trailing.index + trailing[0].length >= masked.trimEnd().length) {
      return { ok: false, reason: `tag outside vocabulary: got "[${trailing[1]}${trailing[2] ?? ''}]"` };
    }
    return { ok: false, reason: 'missing a status tag from the vocabulary' };
  }
  if (matches.length > 1) {
    return { ok: false, reason: `${matches.length} status tags found, want exactly one` };
  }
  const match = matches[0];
  const end = match.index + match[0].length;
  if (masked.slice(end).trim().length > 0) {
    return { ok: false, reason: 'the status tag is not the last thing on the bullet' };
  }
  const tagName = match[1];
  const qualifier = match[0].slice(1 + tagName.length, -1);
  if (qualifier.length > 0 && !qualifier.startsWith(':')) {
    return { ok: false, reason: `tag "[${tagName}...]" uses a space qualifier; use the colon form "[${tagName}: ...]"` };
  }
  // A stray bracket earlier in the bullet, outside code/quoted spans, is a second tag-shaped
  // bracket even when it is not itself a vocabulary word (a malformed or out-of-vocabulary tag
  // placed mid-bullet rather than at the end).
  const strayBrackets = [...masked.slice(0, match.index).matchAll(/\[/g)];
  if (strayBrackets.length > 0) {
    return { ok: false, reason: 'a second bracket appears before the trailing status tag' };
  }
  return { ok: true, tag: tagName };
}

/**
 * Every basename in the repo tree, excluding build output, dependencies, and VCS/tooling
 * directories, mapped to the list of repo-relative paths carrying that basename. Built once and
 * reused across every pointer in a check-facts run.
 * @param {string} root
 * @returns {Map<string, string[]>}
 */
export function buildBasenameIndex(root) {
  /** @type {Map<string, string[]>} */
  const index = new Map();
  /** @param {string} dir */
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = full.slice(root.length + 1);
      const list = index.get(name);
      if (list) list.push(rel);
      else index.set(name, [rel]);
    }
  };
  walk(root);
  return index;
}

/**
 * Resolve a `Source:` pointer's path against the repo root: a literal path first, then, ONLY
 * when the pointer names no directory of its own (a bare filename), a unique basename match. A
 * pointer that does carry a directory and does not exist there fails outright rather than
 * falling back: the basename fallback exists for the container's bare-filename shorthand ("the
 * file just named above, in the same directory"), not to rescue a stale, fully-qualified path
 * whose basename happens to have relocated elsewhere in the repo under a same-named file.
 * @param {string} pointerPath
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {string | null}
 */
export function resolvePointerPath(pointerPath, root, basenameIndex) {
  if (existsSync(join(root, pointerPath))) return pointerPath;
  if (pointerPath.includes('/')) return null;
  const matches = basenameIndex.get(pointerPath);
  if (matches && matches.length === 1) return matches[0];
  return null;
}

/**
 * @typedef {{ path: string, lineSpec: string, anchor: string | null, index: number }} Pointer
 */

// A backtick-quoted `path:line[,line|-line]...` pointer, path carrying a recognized source
// extension, optionally followed by a backtick-quoted anchor snippet in parens.
const POINTER_RE =
  /`([A-Za-z0-9_.\/-]+\.(?:ts|js|mjs|cjs|mts|svelte|css|json|sql|ya?ml|md))((?::\d+(?:-\d+)?)(?:,\d+(?:-\d+)?)*)`(?:\s*\(`([^`]*)`\))?/g;

/**
 * Every `path:line` style pointer inside a bullet's `Source:` field.
 * @param {string} sourceField
 * @returns {Pointer[]}
 */
export function extractPointers(sourceField) {
  const pointers = [];
  for (const m of sourceField.matchAll(POINTER_RE)) {
    pointers.push({ path: m[1], lineSpec: m[2].slice(1), anchor: m[3] ?? null, index: m.index });
  }
  return pointers;
}

/**
 * @typedef {{ path: string, symbol: string, anchor: string | null, index: number }} SymbolPointer
 */

// A backtick-quoted `path#Symbol` pointer, the symbol an identifier or a dotted path of them,
// optionally followed by a backtick-quoted anchor snippet in parens. `.svelte` is matched only so
// the gate can reject it with a clear reason.
const SYMBOL_POINTER_RE =
  /`([A-Za-z0-9_.\/-]+\.(?:ts|js|mjs|cjs|mts|cts|svelte))#([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)`(?:\s*\(`([^`]*)`\))?/g;

/**
 * Every `path#Symbol` pointer inside a bullet's `Source:` field. A `path:line` pointer is never
 * returned here; `extractPointers` owns that form.
 * @param {string} sourceField
 * @returns {SymbolPointer[]}
 */
export function extractSymbolPointers(sourceField) {
  const pointers = [];
  for (const m of sourceField.matchAll(SYMBOL_POINTER_RE)) {
    pointers.push({ path: m[1], symbol: m[2], anchor: m[3] ?? null, index: m.index });
  }
  return pointers;
}

/**
 * The TypeScript compiler API once loaded; null until the first symbol pointer needs it.
 * @type {typeof import('typescript') | null}
 */
let typescript = null;

/**
 * The TypeScript compiler API, loaded on first use so `--mint` and a run with no symbol pointer
 * never pay for it.
 * @returns {typeof import('typescript')}
 */
function loadTypeScript() {
  if (!typescript) typescript = createRequire(import.meta.url)('typescript');
  return /** @type {typeof import('typescript')} */ (typescript);
}

/**
 * The name a declaration node carries, or null when the node is not a named declaration this
 * resolver recognizes (a destructuring pattern, a computed property name, any non-declaration).
 * @param {import('typescript').Node} node
 * @returns {string | null}
 */
function declarationName(node) {
  const ts = loadTypeScript();
  const named =
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isEnumMember(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isVariableDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isShorthandPropertyAssignment(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node);
  if (!named) return null;
  const name = /** @type {{ name?: import('typescript').Node }} */ (node).name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text;
  return null;
}

/**
 * The declarations named `name` directly under `container`: reached without passing through
 * another named declaration. Blocks, statements, and expressions in between do not count, so a
 * function returned from a factory is direct, while a local declared inside that function is
 * not. A symbol never falls back to a same-named declaration nested deeper.
 * @param {import('typescript').Node} container
 * @param {string} name
 * @returns {import('typescript').Node[]}
 */
function directDeclarations(container, name) {
  const ts = loadTypeScript();
  /** @type {import('typescript').Node[]} */
  const found = [];
  /** @param {import('typescript').Node} node */
  const visit = (node) => {
    const nodeName = declarationName(node);
    if (nodeName === name) found.push(node);
    if (nodeName === null) ts.forEachChild(node, visit);
  };
  ts.forEachChild(container, visit);
  return found;
}

/**
 * @typedef {{ ok: true, startLine: number, endLine: number } | { ok: false, reason: string }} SymbolResolution
 */

/**
 * Resolve a symbol path (`name` or `outer.inner`) to the 1-indexed line range of its declaration
 * in `fileText`, parsed by the TypeScript compiler API. The first segment must be a top-level
 * declaration, and each later segment a direct declaration of the one before it, so a renamed
 * symbol fails rather than resolving to a same-named local. More than one match fails as
 * ambiguous, except a run of function overloads, which resolves to the implementation (the one
 * with a body). The range starts at the declaration itself, after any doc comment.
 * @param {string} fileText
 * @param {string} filePath Used for the parser's file name and to pick TypeScript or JavaScript.
 * @param {string} symbol
 * @returns {SymbolResolution}
 */
export function resolveSymbolDeclaration(fileText, filePath, symbol) {
  const ts = loadTypeScript();
  const scriptKind = /\.[mc]?ts$/.test(filePath) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(filePath, fileText, ts.ScriptTarget.Latest, true, scriptKind);
  /** @type {import('typescript').Node} */
  let current = sourceFile;
  for (const [i, segment] of symbol.split('.').entries()) {
    let matches = directDeclarations(current, segment);
    if (matches.length > 1 && matches.every((m) => ts.isFunctionDeclaration(m) || ts.isMethodDeclaration(m))) {
      matches = matches.filter((m) => /** @type {{ body?: unknown }} */ (m).body !== undefined);
    }
    if (matches.length === 0) {
      const where = i === 0 ? 'top-level declaration' : `declaration directly inside "${symbol.split('.').slice(0, i).join('.')}"`;
      return { ok: false, reason: `no ${where} named "${segment}"` };
    }
    if (matches.length > 1) return { ok: false, reason: `"${segment}" names ${matches.length} declarations at the same level` };
    current = matches[0];
  }
  const startLine = sourceFile.getLineAndCharacterOfPosition(current.getStart(sourceFile)).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(current.getEnd()).line + 1;
  return { ok: true, startLine, endLine };
}

/** The one directory a `path#Symbol` pointer may name a file under. */
const SYMBOL_POINTER_PREFIX = 'src/';

/**
 * Validate one `path#Symbol` pointer: a TypeScript or JavaScript file under `src/` that exists,
 * a symbol that resolves to exactly one declaration, and, when an anchor follows, every anchor
 * token inside that declaration's lines. Returns the one defect string, or `null` when clean.
 * @param {SymbolPointer} pointer
 * @param {string} root
 * @returns {string | null}
 */
function validateSymbolPointer(pointer, root) {
  const label = `${pointer.path}#${pointer.symbol}`;
  if (pointer.path.endsWith('.svelte')) {
    return `"${label}": a symbol anchor resolves only a TypeScript or JavaScript file; cite a .svelte file as path:line`;
  }
  if (!pointer.path.startsWith(SYMBOL_POINTER_PREFIX)) {
    return `"${label}": a path#Symbol anchor is only for a file under src/`;
  }
  if (!existsSync(join(root, pointer.path))) return `unresolved path "${pointer.path}"`;
  const fileText = readFileSync(join(root, pointer.path), 'utf8');
  const resolution = resolveSymbolDeclaration(fileText, pointer.path, pointer.symbol);
  if (!resolution.ok) return `"${label}": ${resolution.reason} in ${pointer.path}`;
  if (!pointer.anchor) return null;
  const declaration = fileText.split('\n').slice(resolution.startLine - 1, resolution.endLine).join('\n');
  const missing = anchorTokens(pointer.anchor).filter((t) => !declaration.includes(t));
  if (missing.length === 0) return null;
  return `anchor for "${label}" names ${JSON.stringify(missing)}, not found in the declaration (lines ${resolution.startLine}-${resolution.endLine})`;
}

/** The owner brief, the one source an owner-tier bullet rests on. */
export const OWNER_BRIEF_PATH = 'docs/internal/what-cairn-is-and-is-not.md';

/** A bullet's key phrase: `Key phrase: "..."`, the quoted text captured. */
const KEY_PHRASE_RE = /\bKey phrase: "([^"]+)"/;

/**
 * A bullet's quoted key phrase, or null when it carries none.
 * @param {string} bulletText
 * @returns {string | null}
 */
export function extractKeyPhrase(bulletText) {
  const match = bulletText.match(KEY_PHRASE_RE);
  return match ? match[1] : null;
}

/**
 * Normalize a phrase for verbatim comparison: curly quotes straightened, markdown emphasis
 * asterisks dropped, whitespace collapsed, lowercased. Shared with `check-provenance.mjs`, which
 * matches key phrases in page sentences the same way.
 * @param {string} text
 * @returns {string}
 */
export function normalizePhrase(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * True when a bullet belongs to the owner tier: its `Source:` field or its section heading names
 * the owner brief.
 * @param {{ section: string | null, text: string }} bullet
 * @returns {boolean}
 */
export function isOwnerTierBullet(bullet) {
  const sourceIdx = bullet.text.indexOf('Source:');
  const sourceField = sourceIdx === -1 ? '' : bullet.text.slice(sourceIdx);
  return sourceField.includes(OWNER_BRIEF_PATH) || (bullet.section ?? '').includes(OWNER_BRIEF_PATH);
}

/**
 * The normalized owner brief text per root, read once; null when the brief is absent.
 * @type {Map<string, string | null>}
 */
const ownerBriefCache = new Map();

/**
 * The owner brief under `root`, normalized by `normalizePhrase`, or null when it is absent (a
 * checkout or fixture without it skips the verbatim check).
 * @param {string} root
 * @returns {string | null}
 */
function normalizedOwnerBrief(root) {
  if (!ownerBriefCache.has(root)) {
    const path = join(root, OWNER_BRIEF_PATH);
    ownerBriefCache.set(root, existsSync(path) ? normalizePhrase(readFileSync(path, 'utf8')) : null);
  }
  return ownerBriefCache.get(root) ?? null;
}

/**
 * The owner-tier defect a bullet produces, or null: a missing key phrase, or one the owner brief
 * at `root` does not contain verbatim.
 * @param {Bullet} bullet
 * @param {string} root
 * @returns {string | null}
 */
function validateOwnerTier(bullet, root) {
  if (!isOwnerTierBullet(bullet)) return null;
  const phrase = extractKeyPhrase(bullet.text);
  if (!phrase) {
    return `owner-tier bullet (sourced to ${OWNER_BRIEF_PATH}) is missing a key phrase: add \`Key phrase: "..."\` before its Source`;
  }
  const brief = normalizedOwnerBrief(root);
  if (brief !== null && !brief.includes(normalizePhrase(phrase))) {
    return `key phrase "${phrase}" is not a verbatim phrase in ${OWNER_BRIEF_PATH}`;
  }
  return null;
}

/**
 * Every individual line number a pointer's line spec names, ranges expanded.
 * @param {string} lineSpec `"22,63"` or `"296-297"` or `"22"`.
 * @returns {number[]}
 */
function expandLineSpec(lineSpec) {
  const lines = [];
  for (const part of lineSpec.split(',')) {
    const [start, end] = part.split('-').map(Number);
    const last = end ?? start;
    for (let n = start; n <= last; n++) lines.push(n);
  }
  return lines;
}

/**
 * Identifier-shaped tokens (3+ word characters) in an anchor snippet, the unit the file-wide
 * anchor check requires each to appear in the resolved file.
 * @param {string} anchor
 * @returns {string[]}
 */
function anchorTokens(anchor) {
  return [...anchor.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,}/g)].map((m) => m[0]);
}

/**
 * @typedef {{ verified: number, 'docs-drift': number, external: number, vendor: number,
 *   candidate: number, rejected: number }} TagCounts
 */

/** A fresh, zeroed tag-count record. @returns {TagCounts} */
function emptyCounts() {
  return { verified: 0, 'docs-drift': 0, external: 0, vendor: 0, candidate: 0, rejected: 0 };
}

/**
 * The lines a pointer's anchor is allowed to match against: the cited range expanded by
 * `ANCHOR_WINDOW` lines on each side, clamped to the file.
 * @param {number[]} citedLines
 * @param {number} fileLineCount
 * @returns {[number, number]} A 1-indexed, inclusive `[start, end]` pair.
 */
function anchorWindow(citedLines, fileLineCount) {
  const start = Math.max(1, Math.min(...citedLines) - ANCHOR_WINDOW);
  const end = Math.min(fileLineCount, Math.max(...citedLines) + ANCHOR_WINDOW);
  return [start, end];
}

/** The path prefix a repository-class reader export drops whole, per `check:facts`'s own header note. */
const RECORD_DIR_PREFIX = 'docs/internal/record/';

/**
 * True exactly when a pointer names a path under `docs/internal/record/` AND that whole directory
 * is absent from `root`: a repository-class export dropped it on purpose, so a pointer into it is
 * expected to fail resolution and is skipped rather than reported. A pointer into the same
 * directory when the directory DOES exist is never skipped by this check, whether or not the
 * specific cited file is present; that case falls through to the ordinary unresolved-path defect.
 * @param {string} pointerPath
 * @param {string} root
 * @returns {boolean}
 */
export function isSkippedRecordPointer(pointerPath, root) {
  return pointerPath.startsWith(RECORD_DIR_PREFIX) && !existsSync(join(root, 'docs/internal/record'));
}

/**
 * Validate one `Source:` pointer: its path resolves, every cited line is in range, and, when it
 * carries an anchor, every anchor token appears within the anchor window. Returns the one defect
 * string this pointer produces, or `null` when it is clean.
 * @param {Pointer} pointer
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {string | null}
 */
function validatePointer(pointer, root, basenameIndex) {
  if (isSkippedRecordPointer(pointer.path, root)) return null;

  const resolved = resolvePointerPath(pointer.path, root, basenameIndex);
  if (!resolved) return `unresolved path "${pointer.path}"`;

  const fileLines = readFileSync(join(root, resolved), 'utf8').split('\n');
  const citedLines = expandLineSpec(pointer.lineSpec);
  const outOfRange = citedLines.some((n) => n < 1 || n > fileLines.length);
  if (outOfRange) {
    return `"${pointer.path}:${pointer.lineSpec}" is out of range (file has ${fileLines.length} lines)`;
  }

  if (!pointer.anchor) return null;
  const [windowStart, windowEnd] = anchorWindow(citedLines, fileLines.length);
  const window = fileLines.slice(windowStart - 1, windowEnd).join('\n');
  const missing = anchorTokens(pointer.anchor).filter((t) => !window.includes(t));
  if (missing.length === 0) return null;
  return `anchor for "${pointer.path}:${pointer.lineSpec}" names ${JSON.stringify(missing)}, not found within ${ANCHOR_WINDOW} lines of the cited range`;
}

/**
 * Validate one bullet's grammar, every `path:line` and `path#Symbol` pointer in its `Source:`
 * field, and, for an owner-tier bullet, its key phrase. Returns the defects found (empty when the bullet is clean), the
 * tag name for the caller's running count when the tag itself was valid, and the bullet's fact id
 * for the caller's cross-file duplicate check.
 * @param {Bullet} bullet
 * @param {string} root
 * @param {Map<string, string[]>} basenameIndex
 * @returns {{ defects: string[], tag: string | null, id: string | null }}
 */
export function validateBullet(bullet, root, basenameIndex) {
  /** @type {string[]} */
  const defects = [];
  const id = extractFactId(bullet.text);
  if (!id) defects.push('missing a fact id (a leading `f:xxxxxx` code span right after "- ")');

  if (!bullet.text.includes('Source:')) {
    defects.push('missing "Source:"');
  }
  const tagCheck = checkTag(bullet.text);
  if (!tagCheck.ok) defects.push(tagCheck.reason);

  const sourceIdx = bullet.text.indexOf('Source:');
  if (sourceIdx !== -1) {
    const sourceField = bullet.text.slice(sourceIdx);
    for (const pointer of extractPointers(sourceField)) {
      const defect = validatePointer(pointer, root, basenameIndex);
      if (defect) defects.push(defect);
    }
    for (const pointer of extractSymbolPointers(sourceField)) {
      const defect = validateSymbolPointer(pointer, root);
      if (defect) defects.push(defect);
    }
  }

  const ownerDefect = validateOwnerTier(bullet, root);
  if (ownerDefect) defects.push(ownerDefect);

  return { defects, tag: tagCheck.ok ? tagCheck.tag : null, id };
}

/**
 * Every fact arm file this gate walks: `docs/internal/facts/*.md`, excluding `README.md` (the
 * grammar document itself, not a fact file).
 * @param {string} factsDir
 * @returns {string[]}
 */
export function factsFiles(factsDir) {
  return readdirSync(factsDir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort();
}

/**
 * A tag-count record as one line: `verified 66, candidate 12` (a zero-count tag is omitted).
 * @param {TagCounts} counts
 * @returns {string}
 */
function formatCounts(counts) {
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([tag, n]) => `${tag} ${n}`)
    .join(', ');
}

/**
 * Run the full facts-container check against one facts directory: every bullet in every arm file
 * gets a grammar and id check against `root`, then every id collected across every file in
 * `factsDir` is checked for a duplicate. Factored out of `main` so a test can run the whole check
 * against a fixture directory instead of the real container.
 * @param {string} factsDir
 * @param {string} root
 * @returns {{ defects: string[], report: string[] }}
 */
export function checkFacts(factsDir, root) {
  const basenameIndex = buildBasenameIndex(root);
  const files = factsFiles(factsDir);
  /** @type {string[]} */
  const allDefects = [];
  const report = [];
  /** @type {FactIdOccurrence[]} */
  const idOccurrences = [];
  for (const file of files) {
    const markdown = readFileSync(join(factsDir, file), 'utf8');
    const allBullets = extractBullets(markdown);
    const isSkipped = (/** @type {Bullet} */ b) => SKIPPED_SECTIONS.has((b.section ?? '').trim().toLowerCase());
    for (const bullet of allBullets.filter(isSkipped)) {
      if (extractFactId(bullet.text)) {
        allDefects.push(`docs/internal/facts/${file}:${bullet.line}: a ${bullet.section} bullet carries a fact id; only a fact bullet takes one`);
      }
    }
    const bullets = allBullets.filter((b) => !isSkipped(b));
    const counts = emptyCounts();
    for (const bullet of bullets) {
      const { defects, tag, id } = validateBullet(bullet, root, basenameIndex);
      if (tag) counts[/** @type {keyof TagCounts} */ (tag)]++;
      if (id) idOccurrences.push({ id, file, line: bullet.line });
      for (const defect of defects) {
        allDefects.push(`docs/internal/facts/${file}:${bullet.line}: ${defect}`);
      }
    }
    report.push(`  ${file}: ${bullets.length} facts (${formatCounts(counts)})`);
  }

  for (const [id, occurrences] of findDuplicateFactIds(idOccurrences)) {
    const locations = occurrences.map((o) => `docs/internal/facts/${o.file}:${o.line}`).join(', ');
    allDefects.push(`duplicate fact id \`${id}\`: ${locations}`);
  }

  return { defects: allDefects, report };
}

function main() {
  const { defects, report } = checkFacts(FACTS_DIR, ROOT);
  if (defects.length === 0) {
    console.log('check-facts: OK');
    console.log(report.join('\n'));
    return;
  }
  console.error(`check-facts: ${defects.length} defect(s)\n`);
  for (const defect of defects) console.error(`  ${defect}`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--mint')) console.log(mintFactId());
  else main();
}
