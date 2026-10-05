// cairn-cms: the docs symbol sweep. Pass D's review methodology (stage 0) names this the
// near-total defense against the hallucinated-symbol class: a name that reads plausibly in a
// doc page and does not exist. It is a grep, not a judgment. Every code-voice token (an inline
// `code span` or a fenced code block) a page in scope names is extracted, classified, and
// resolved against the source tree; a token the code does not carry fails the gate, naming the
// file, line, and token.
//
// Extraction is deliberately restricted to code voice. A word in ordinary prose is prose, not a
// symbol claim, and lifting the restriction is the main defense this gate has against
// over-firing on a page thick with narrative text that happens to mention a real word in
// passing.
//
// Six token classes, each resolved against a different ground truth, chosen because each
// resolves reliably without guessing:
//   - a CLI flag (`--some-flag`) inside a shell-tagged fenced block, resolved against the two
//     CLIs this repository owns: `packages/create-cairn-site`'s own argument parser, and the Go
//     tool's committed flag list at `tool/testdata/flags.json`, which `make -C tool flags`
//     writes from the real cobra tree; anything else (npm, npx, wrangler, git, gh, node) comes
//     from the allowlist
//   - a `cairn` line (a shell-fenced line whose first word, after an optional `$ ` prompt, is
//     exactly `cairn`), resolved word by word against `tool/testdata/flags.json`'s per-command
//     flag map: the command path is the longest run of leading words that map names, and a word
//     in subcommand position fails when the matched path has subcommands of its own and does not
//     recognize it, the same way a flag fails when the matched path does not accept it
//   - an environment variable (SCREAMING_SNAKE_CASE), resolved against the source tree
//   - an exported identifier named in an `import ... from '@glw907/cairn-cms...'` line inside a
//     fenced block, resolved against the generated `api-surface.md` snapshot, exactly against the
//     subpath the import specifier names (a name that only exists under a different subpath still
//     fails, since the written specifier is itself a claim a reader copies verbatim)
//   - a repository file path (a token carrying both `/` and a file extension), resolved against
//     the filesystem
//   - a log event name, a doctor condition id, or a doctor check id (dotted lowercase, hyphens
//     allowed), resolved against the union of three registries: `src/lib/log/`'s event union,
//     `src/lib/diagnostics/conditions.ts`'s condition-id registry (the same one
//     `check-readiness.mjs` already loads), and the committed `tool-check-ids.mjs` vocabulary of
//     every check id the Go tool's `cairn doctor` raises. All three share the exact
//     dotted-lowercase shape and often the same area
//     (`auth`, `config`, `admin`, `github`), and `docs/reference/doctor.md`'s own table cites a
//     check id and its condition id side by side (`config.bindings` fails as
//     `config.bindings-missing`, a different string), so resolving against only one or two of
//     these turned the others into a wall of false positives; resolving against the union
//     instead catches a hallucinated name in any of the three vocabularies with no recall traded
//     away.
//
// A class this script cannot resolve without guessing is left out entirely, per the standing
// rule that a narrower sweep that genuinely bites beats a wide one that does not. In particular:
// a property path on a config or data object (`auth.branding`, `entry.frontmatter.image.src`,
// `admin.load`), and a fictional site-local import specifier (`./cairn.config.js`), share
// surface shape with a real class here without being one; genuine collisions found while
// building this gate are dispositioned in `check-symbols-allowlist.mjs`, each with a reason.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { ALLOWLIST } from './check-symbols-allowlist.mjs';
import { TOOL_CHECK_IDS, RETIRED_TOOL_CHECK_IDS } from './tool-check-ids.mjs';
import { readArmStates } from './arm-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The published tracks plus the front doors this gate covers. An entry naming an arm-state arm is
// skipped while that arm is absent (arm-state.mjs), and a front-door file is scanned when it exists
// once the front door is rebuilt. Every other entry must exist: a missing reference arm or root
// README throws rather than shrinking the sweep, since a scan over nothing finds nothing.
const SCOPE = [
  { path: 'docs/admin', arm: 'admin' },
  { path: 'docs/editors', arm: 'editors' },
  { path: 'docs/extend', arm: 'extend' },
  { path: 'docs/why-cairn.md', arm: 'front-door' },
  { path: 'docs/reference' },
  { path: 'docs/README.md', arm: 'front-door' },
  { path: 'README.md' },
];

// Shell-language fence tags a CLI-flag candidate is extracted from. A CSS custom property
// (`--radius-box`) also opens with two dashes, so this class is scoped to a command-line
// context rather than any code voice. This is one of the two deliberate extraction narrowings
// this gate makes beyond "code voice only"; the other is `extractImportedIdentifiers`, which
// reads an identifier only from a fenced cairn import line.
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);

// File extensions a repository-path candidate must end in. Chosen from what this repo's own
// tree actually carries; add to it only when a real path with a new extension needs covering.
const PATH_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'svelte',
  'json',
  'jsonc',
  'sql',
  'css',
  'yaml',
  'yml',
  'toml',
  'md',
  'html',
  'txt',
]);

// Collect every `.md` file under a directory, repo-relative paths sorted.
/** @param {string} dir @returns {string[]} */
function walkMarkdown(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/**
 * Every file in scope, repo-relative, sorted. Throws when a scope entry outside the arms is
 * missing, or when the deletion list the arm states come from cannot be read.
 * @param {string} root
 */
export function filesInScope(root = ROOT) {
  const states = readArmStates(root);
  const out = [];
  for (const { path, arm } of SCOPE) {
    if (arm && states[arm] === 'absent') continue;
    const abs = join(root, path);
    if (!existsSync(abs)) {
      if (arm) continue;
      throw new Error(`check-symbols: scope entry ${path} does not exist`);
    }
    if (statSync(abs).isDirectory()) out.push(...walkMarkdown(abs));
    else out.push(abs);
  }
  return out.map((p) => relative(root, p)).sort();
}

/**
 * @typedef {{ line: number, text: string, fenced: boolean, lang: string | null }} CodeVoiceSegment
 */

/**
 * Every inline code span and fenced code block's content in a Markdown text, each tagged with
 * its 1-based line number, whether it came from a fence, and the fence's language (null for an
 * inline span, or a fence with no language tag).
 * @param {string} text
 * @returns {CodeVoiceSegment[]}
 */
export function codeVoiceSegments(text) {
  /** @type {CodeVoiceSegment[]} */
  const segments = [];
  let fenceChar = /** @type {string | null} */ (null);
  let fenceLang = /** @type {string | null} */ (null);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = line.match(/^(\s*)(```+|~~~+)\s*([a-zA-Z0-9_-]*)/);
    if (fenceChar) {
      if (open && open[2][0] === fenceChar) {
        fenceChar = null;
        fenceLang = null;
      } else {
        segments.push({ line: i + 1, text: line, fenced: true, lang: fenceLang });
      }
      continue;
    }
    if (open) {
      fenceChar = open[2][0];
      fenceLang = open[3] || null;
      continue;
    }
    // Inline spans: double-backtick first (so a single backtick inside, e.g. `` `foo` ``, does
    // not truncate it), then single-backtick. The double-backtick content group is a lazy `.*?`,
    // not `[^`]*`: a content class that excludes backtick entirely could never reach a closing
    // `` past an embedded single backtick, which is the whole reason a writer reaches for the
    // double-backtick form.
    for (const m of line.matchAll(/``(.*?)``|`([^`]+)`/g)) {
      const content = m[1] ?? m[2];
      segments.push({ line: i + 1, text: content, fenced: false, lang: null });
    }
  }
  return segments;
}

// Strip an `import`/`export ... from` or dynamic `import(...)` specifier string from a line
// before file-path extraction runs over it, so a fictional local specifier
// (`'./cairn.config.js'`, `'$lib/foo.ts'`) is never mistaken for a repository path claim; that
// class is a doc snippet's imagined project, not this repo's tree (the same stance `check:snippets`
// documents at length).
/** @param {string} text */
function stripImportSpecifiers(text) {
  return text
    .replace(/from\s*['"][^'"]*['"]/g, 'from')
    .replace(/import\s*\(\s*['"][^'"]*['"]\s*\)/g, 'import()');
}

/**
 * @typedef {{ line: number, token: string }} SymbolCandidate one extractor's hit: the token it read
 * and the 1-based line that carries it.
 */

/** @param {CodeVoiceSegment[]} segments */
export function extractCliFlags(segments) {
  /** @type {SymbolCandidate[]} */
  const out = [];
  for (const seg of segments) {
    if (!seg.fenced || !seg.lang || !SHELL_LANGS.has(seg.lang)) continue;
    for (const m of seg.text.matchAll(/(?<![A-Za-z0-9-])--([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\b/g)) {
      out.push({ line: seg.line, token: `--${m[1]}` });
    }
  }
  return out;
}

/**
 * @typedef {{ line: number, token: string }} CairnLineWord one word of a `cairn` line, tagged
 * with the source line it actually came from (a continuation line's words carry that line, not
 * the line the logical `cairn` line opened on).
 */

/**
 * Every `cairn` line inside a shell-tagged fence: a line whose first word, after an optional
 * `$ ` prompt, is exactly `cairn`. A trailing `\` joins it with the fence's next line before
 * tokenizing, so a wrapped invocation reads as the one line it is; each resulting word keeps the
 * line it was written on, which is what lets a bad flag on a continuation line be reported there
 * rather than at the line the command started on. A non-shell fence, and a shell line whose first
 * word is not `cairn` (`npx cairn-audit`, `npm run cairn:manifest`, a bare `my-cairn-site`), is
 * never read.
 * @param {CodeVoiceSegment[]} segments
 * @returns {CairnLineWord[][]}
 */
export function extractCairnLines(segments) {
  /** @type {CairnLineWord[][]} */
  const lines = [];
  /** @type {CairnLineWord[] | null} */
  let pending = null;
  /** @type {number | null} */
  let lastLine = null;
  for (const seg of segments) {
    if (!seg.fenced || !seg.lang || !SHELL_LANGS.has(seg.lang)) {
      pending = null;
      lastLine = null;
      continue;
    }
    // Two fences back to back with no inline code between them leave no segment for either the
    // closing or the opening fence marker, so this segment and the last one can belong to two
    // unrelated fences even though both are fenced shell. Within one fence, every line (including
    // a fence carried over a blank line) yields a segment, so a gap in line numbers here can only
    // mean the previous fence closed and a new one opened; a pending continuation from the old
    // fence must not swallow the new fence's first line as though it were the same command.
    if (pending && lastLine !== null && seg.line !== lastLine + 1) pending = null;
    lastLine = seg.line;
    const continues = /\\\s*$/.test(seg.text);
    const body = seg.text.replace(/\\\s*$/, '').trim();
    const words = body.length > 0 ? body.split(/\s+/) : [];
    if (pending) {
      for (const word of words) pending.push({ line: seg.line, token: word });
      if (continues) continue;
      lines.push(pending);
      pending = null;
      continue;
    }
    if (words.length === 0) continue;
    const start = words[0] === '$' ? 1 : 0;
    if (words[start] !== 'cairn') continue;
    const items = words.slice(start).map((token) => ({ line: seg.line, token }));
    if (continues) pending = items;
    else lines.push(items);
  }
  return lines;
}

/** @param {CodeVoiceSegment[]} segments */
export function extractEnvVars(segments) {
  /** @type {SymbolCandidate[]} */
  const out = [];
  for (const seg of segments) {
    for (const m of seg.text.matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) {
      out.push({ line: seg.line, token: m[1] });
    }
  }
  return out;
}

/** @param {CodeVoiceSegment[]} segments */
export function extractImportedIdentifiers(segments) {
  /** @type {(SymbolCandidate & { subpath: string })[]} */
  const out = [];
  for (const seg of segments) {
    if (!seg.fenced) continue;
    const m = seg.text.match(
      /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]@glw907\/cairn-cms([^'"]*)['"]/,
    );
    if (!m) continue;
    const [, names, suffix] = m;
    const subpath = suffix === '' ? '.' : suffix;
    for (const raw of names.split(',')) {
      const name = raw.replace(/^\s*type\s+/, '').trim();
      if (!name) continue;
      const [original] = name.split(/\s+as\s+/);
      out.push({ line: seg.line, token: original.trim(), subpath });
    }
  }
  return out;
}

/** @param {CodeVoiceSegment[]} segments */
export function extractFilePaths(segments) {
  /** @type {SymbolCandidate[]} */
  const out = [];
  // A maximal run of path-shaped characters, checked afterward for a `/` and a recognized
  // extension, rather than an anchored per-segment pattern: an anchored pattern mistook the `/`
  // before a dot-directory (`.cairn/index.json`) for a boundary and silently truncated the path.
  const pattern = /[\w./@-]+/g;
  for (const seg of segments) {
    const text = seg.fenced ? stripImportSpecifiers(seg.text) : seg.text;
    if (text.includes('://')) continue;
    for (const m of text.matchAll(pattern)) {
      const token = m[0].replace(/^[./]+|[./]+$/g, '');
      if (!token.includes('/')) continue;
      const ext = token.slice(token.lastIndexOf('.') + 1).toLowerCase();
      if (!PATH_EXTENSIONS.has(ext)) continue;
      out.push({ line: seg.line, token });
    }
  }
  return out;
}

/**
 * A log-event-or-condition-id candidate: dotted lowercase segments (letters, digits, underscore,
 * and hyphen, so a hyphenated condition id like `auth.role-wiring-missing` qualifies the same as
 * a plain log event), 2 to 4 segments, whose first segment is a real area in one of the three
 * vocabularies below.
 *
 * Resolved against the union of three registries (`findUnresolvedSymbols` resolves against all
 * three and passes their combined area set in here): `src/lib/log/`'s event union,
 * `src/lib/diagnostics/conditions.ts`'s condition-id registry, and the committed
 * `tool-check-ids.mjs` check-id vocabulary. All three share the exact dotted-lowercase shape and,
 * often, the same area
 * (`auth`, `config`, `admin`, `github`), which is why an earlier version of this extractor that
 * resolved against log events alone produced roughly ninety false positives across fifteen pages,
 * overwhelmingly real condition and check ids it had no way to recognize. An earlier attempt to
 * quiet those by requiring three or more segments was the wrong fix and is recorded here so it is
 * not retried: 40 of the 74 real events carry exactly two segments, so that floor silently turned
 * the class off for most of the vocabulary, including every `commit.*`, `entry.*`, and `media.*`
 * event a diagnostics page cites. Resolving against the union keeps full recall over all three
 * vocabularies (the admin checklist page is built entirely out of condition ids) and turns two
 * further classes of hallucination into caught errors, since an invented condition id or check id
 * now fails here too. Requiring a real first-segment area still cuts the remaining collision
 * class, an unrelated dotted property path sharing an area name with one of the vocabularies
 * (`auth.branding`), without hiding a wrong verb or suffix under a right area
 * (`auth.session.expired` and `config.bindings-absent` both still fail, since neither is in any of
 * the three). A
 * candidate whose last segment is a recognized file extension (`audit.config.json`) is dropped
 * too: neither a log event nor a condition id ends a segment in a bare filename suffix.
 * @param {CodeVoiceSegment[]} segments
 * @param {Set<string>} areas
 */
export function extractEventOrConditionCandidates(segments, areas) {
  /** @type {SymbolCandidate[]} */
  const out = [];
  for (const seg of segments) {
    for (const m of seg.text.matchAll(/\b([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*){1,3})\b/g)) {
      const area = m[1].slice(0, m[1].indexOf('.'));
      if (!areas.has(area)) continue;
      const lastSegment = m[1].slice(m[1].lastIndexOf('.') + 1);
      if (PATH_EXTENSIONS.has(lastSegment)) continue;
      out.push({ line: seg.line, token: m[1] });
    }
  }
  return out;
}

/** Parse `docs/internal/api-surface.md` into a Map from subpath (e.g. `.`, `/sveltekit`) to the
 * set of names it exports. @param {string} root */
export function parseApiSurface(root = ROOT) {
  const text = readFileSync(join(root, 'docs/internal/api-surface.md'), 'utf8');
  /** @type {Map<string, Set<string>>} */
  const bySubpath = new Map();
  let current = /** @type {string | null} */ (null);
  for (const line of text.split('\n')) {
    const heading = line.match(/^## `(.+)`$/);
    if (heading) {
      current = heading[1];
      bySubpath.set(current, new Set());
      continue;
    }
    const entry = line.match(/^- `([^`]+)`:/);
    if (entry && current) bySubpath.get(current)?.add(entry[1]);
  }
  return bySubpath;
}

/** Parse `packages/create-cairn-site`'s own flags from `src/args.mjs`. @param {string} root */
export function createCairnSiteFlags(root = ROOT) {
  const text = readFileSync(join(root, 'packages/create-cairn-site/src/args.mjs'), 'utf8');
  const body = text.match(/const OPTIONS = \{([\s\S]*?)\n\};/);
  if (!body) throw new Error('check-symbols: could not find OPTIONS in create-cairn-site/src/args.mjs');
  const flags = new Set();
  for (const m of body[1].matchAll(/^\s*(?:'([a-z0-9-]+)'|([a-z][a-z0-9]*)):/gm)) {
    flags.add(m[1] ?? m[2]);
  }
  return flags;
}

/**
 * Read the Go tool's committed flag list (`tool/testdata/flags.json`) into a set of bare names,
 * the leading dashes stripped so it lines up with `createCairnSiteFlags`. The file is generated
 * from the real cobra tree by `make -C tool flags` and held to it by a Go test, so it is the
 * tool's flag vocabulary rather than a hand-kept list. Its absence throws rather than returning
 * an empty set: silently accepting no tool flag would turn every documented `cairn` command line
 * into a finding.
 * @param {string} root
 */
export function cairnToolFlags(root = ROOT) {
  const path = join(root, 'tool/testdata/flags.json');
  if (!existsSync(path)) {
    throw new Error(`check-symbols: ${path} is missing; run \`make -C tool flags\` to write it`);
  }
  const { flags } = JSON.parse(readFileSync(path, 'utf8'));
  return new Set(flags.map((/** @type {string} */ flag) => flag.replace(/^--/, '')));
}

/**
 * Read the Go tool's per-command flag map (`tool/testdata/flags.json`'s `commands` field) into a
 * `Map` from command path (`"cairn"`, `"cairn auth set"`, ...) to the `Set` of long flags that
 * path accepts, inherited ones included. Written by the same Go test as `cairnToolFlags`, so it
 * throws the same way on a missing file or a file that predates the field: a doc's `cairn <path>
 * --flag` line silently passing because the map came back empty would be worse than the check
 * not landing at all.
 * @param {string} root
 */
export function cairnCommandFlags(root = ROOT) {
  const path = join(root, 'tool/testdata/flags.json');
  if (!existsSync(path)) {
    throw new Error(`check-symbols: ${path} is missing; run \`make -C tool flags\` to write it`);
  }
  const { commands } = JSON.parse(readFileSync(path, 'utf8'));
  if (!commands || typeof commands !== 'object') {
    throw new Error(`check-symbols: ${path} carries no "commands" map; run \`make -C tool flags\``);
  }
  return new Map(
    Object.entries(commands).map(([cmdPath, flags]) => [cmdPath, new Set(/** @type {string[]} */ (flags))]),
  );
}

/**
 * Every command path in `commandFlags` that has at least one subcommand of its own, derived from
 * the map's own keys: a path is a parent exactly when some other path is `<path> <word>`. This is
 * what tells `resolveCairnLine` whether the word right after a matched path is a subcommand to
 * validate (`cairn doctor fix`, if `fix` existed) or a positional argument to leave alone
 * (`cairn doctor ./site`), and why `cairn help agents` never checks `agents`: cobra's default
 * `help` command takes a command path, not a subcommand, so it has none of its own in the map.
 * @param {Map<string, Set<string>>} commandFlags
 */
function commandPathsWithChildren(commandFlags) {
  const parents = new Set();
  for (const cmdPath of commandFlags.keys()) {
    const boundary = cmdPath.lastIndexOf(' ');
    if (boundary !== -1) parents.add(cmdPath.slice(0, boundary));
  }
  return parents;
}

/**
 * The long flag name a word spells, or `null` when it is not flag-shaped. Matches the same shape
 * `extractCliFlags` resolves (`--dry-run`, and `--timeout` out of `--timeout=30s`), applied to one
 * already-split word rather than scanned across a whole line.
 * @param {string} word
 * @returns {string | null}
 */
function flagNameFromWord(word) {
  const m = word.match(/^--([a-z][a-z0-9]*(?:-[a-z0-9]+)*)/);
  return m ? `--${m[1]}` : null;
}

// A word that ends a shell-parsed cairn invocation early: a pipe, a redirect, a background or
// sequencing operator, or the compound-command joiners. Extraction reads a line's words with no
// shell grammar at all (`extractCairnLines`), so `cairn logs --json | jq --arg x y` still carries
// jq's own words as though they belonged to the cairn line; resolution is what must stop reading
// at the boundary a real shell would honor, or a defect in the piped-to program (`jq --arg`)
// reports as a cairn defect instead.
const SHELL_OPERATOR_WORDS = new Set(['|', '||', '&&', ';', '>', '>>', '<', '2>', '&']);

/**
 * The prefix of a cairn line's words up to, but not including, the first shell operator word or a
 * word starting with `#` (a shell comment): words past either boundary belong to a different
 * command, or to no command at all, and neither should be checked against this line's own path or
 * flags.
 * @param {CairnLineWord[]} items
 * @returns {CairnLineWord[]}
 */
function truncateAtShellBoundary(items) {
  const cut = items.findIndex(({ token }) => SHELL_OPERATOR_WORDS.has(token) || token.startsWith('#'));
  return cut === -1 ? items : items.slice(0, cut);
}

/**
 * Resolve one `cairn` line's command path and flags against the committed map, and return its
 * findings: a class `cairn-subcommand` entry for a subcommand-position word the matched path does
 * not recognize, and a class `cairn-flag` entry for a flag the matched path does not accept.
 * `token` is the bare word or flag name, the shape `check-symbols-allowlist.mjs` keys on for
 * every other class; `path` carries the command path it was checked against, for the finding's
 * printed message. The line is first truncated at the first shell operator or `#` comment
 * (`truncateAtShellBoundary`), since neither belongs to the cairn invocation itself. The command
 * path is the longest run of leading words, starting from `cairn`, that names a path in
 * `commandFlags`; the walk stops at the first flag (a word starting with `-`) as well as at the
 * first word that fails to extend the path, so a value-taking flag's value
 * (`cairn adopt --domain example.com`, `cairn --color never`) is never mistaken for a path word:
 * a word before a flag is always a command word or a bare positional, never a flag's value,
 * whereas a word right after a flag could be either. A line with no such word (`cairn`,
 * `cairn --version`) resolves to the root path. The word the walk stopped on is read as a
 * subcommand only when it is not itself a flag and the matched path has subcommands of its own
 * (`commandPathsWithChildren`): otherwise it is a flag or a positional argument (a site id, a
 * directory), and the line's flags are still checked against the path that did match.
 * @param {CairnLineWord[]} items
 * @param {Map<string, Set<string>>} commandFlags
 * @returns {{ line: number, class: string, token: string, path: string }[]}
 */
export function resolveCairnLine(items, commandFlags) {
  const truncated = truncateAtShellBoundary(items);
  const words = truncated.slice(1);
  let cmdPath = 'cairn';
  let consumed = 0;
  while (consumed < words.length && !words[consumed].token.startsWith('-')) {
    const candidate = `${cmdPath} ${words[consumed].token}`;
    if (!commandFlags.has(candidate)) break;
    cmdPath = candidate;
    consumed++;
  }

  /** @type {{ line: number, class: string, token: string, path: string }[]} */
  const findings = [];
  if (consumed < words.length) {
    const word = words[consumed];
    if (!word.token.startsWith('-') && commandPathsWithChildren(commandFlags).has(cmdPath)) {
      findings.push({ line: word.line, class: 'cairn-subcommand', token: word.token, path: cmdPath });
    }
  }

  const accepted = commandFlags.get(cmdPath) ?? new Set();
  for (const item of words) {
    const flagName = flagNameFromWord(item.token);
    if (flagName && !accepted.has(flagName)) {
      findings.push({ line: item.line, class: 'cairn-flag', token: flagName, path: cmdPath });
    }
  }
  return findings;
}

/**
 * Every flag name the CLI-flag class resolves against: the union of the two CLIs this repository
 * owns. A flag belonging to neither is either an allowlisted third-party flag or a finding.
 * @param {string} root
 */
export function cliFlagNames(root = ROOT) {
  return new Set([...createCairnSiteFlags(root), ...cairnToolFlags(root)]);
}

/** Parse `src/lib/log/events.ts`'s `CairnLogEvent` union into its literal set. @param {string} root */
export function logEventNames(root = ROOT) {
  const text = readFileSync(join(root, 'src/lib/log/events.ts'), 'utf8');
  const names = new Set();
  for (const m of text.matchAll(/\|\s*'([a-z][a-z0-9_.]*)'/g)) names.add(m[1]);
  return names;
}

/**
 * Parse `src/lib/diagnostics/conditions.ts`'s `REGISTRY` into its `id` set: `id: 'edge.https-...'`
 * fields, the same registry `check-readiness.mjs` loads (`allConditions()`) to pin the readiness
 * checklist. A condition id and a log event share the same dotted-lowercase shape and often the
 * same first segment (`auth`, `config`, `admin`, `github`), so resolving a dotted-lowercase
 * candidate against this set too, not only the event union, is what actually distinguishes a
 * hallucinated name from a real one sharing an area with a real event.
 * @param {string} root
 */
export function conditionIds(root = ROOT) {
  const text = readFileSync(join(root, 'src/lib/diagnostics/conditions.ts'), 'utf8');
  const ids = new Set();
  for (const m of text.matchAll(/\bid:\s*'([a-z][a-z0-9_.-]*)'/g)) ids.add(m[1]);
  return ids;
}

/**
 * The committed check-id vocabulary from `tool-check-ids.mjs`: every id the Go tool's
 * `cairn doctor` currently raises, plus every id a published doc still cites that no live check
 * raises (deferred or dropped), so a page quoting one of those resolves as history rather than a
 * hallucination. A check id and the condition id it maps to are two different values in the same
 * dotted-lowercase shape, `docs/reference/doctor.md`'s own "Check" / "Condition" table columns:
 * `config.bindings` (the check) fails as `config.bindings-missing` (the condition), not as
 * itself.
 */
export function toolCheckIds() {
  return new Set([...TOOL_CHECK_IDS, ...RETIRED_TOOL_CHECK_IDS]);
}

// A published tarball ships a subset of the repo verbatim (`package.json`'s own `files`), so a
// doc's `node_modules/@glw907/cairn-cms/<rest>` or bare `@glw907/cairn-cms/<rest>` path, naming
// where the installed package lands in a site's own tree, resolves against `<rest>` in this
// repo's root rather than failing as a phantom path.
const PACKAGE_PATH_PREFIXES = ['node_modules/@glw907/cairn-cms/', '@glw907/cairn-cms/'];

/**
 * Whether a literal repository-relative path exists on disk, resolving an installed-package
 * path against its source first.
 * @param {string} path
 * @param {string} root
 */
function pathExists(path, root = ROOT) {
  if (existsSync(join(root, path))) return true;
  for (const prefix of PACKAGE_PATH_PREFIXES) {
    if (path.startsWith(prefix)) return existsSync(join(root, path.slice(prefix.length)));
  }
  return false;
}

// One env var name is cited on many pages (33 distinct names across 116 citations at the time this
// landed), and every miss costs a grep subprocess, so the answer is memoized for the run. The
// searched tree cannot change between two lookups in one sweep, so the cached answer is the same
// answer. Keyed by root as well as token, since the root is a parameter.
/** @type {Map<string, boolean>} */
const ENV_VAR_HITS = new Map();

// Directory names grep skips while walking for an env var: dependencies and generated output.
const GENERATED_TREE_EXCLUDES = ['node_modules', '.wrangler', '.svelte-kit', 'test-results']
  .map((dir) => `--exclude-dir=${dir}`)
  .join(' ');

/**
 * Whether a SCREAMING_SNAKE_CASE token appears anywhere in the source tree (excluding docs and
 * generated output), the ground truth for the environment-variable class.
 *
 * The walk skips `node_modules` (installed dependencies), `.wrangler` (the bundles `wrangler dev`
 * leaves behind), `.svelte-kit` (build output), and `test-results` (Playwright artifacts). None of
 * them is source, so a token found only there is not a declared environment variable. Excluding at
 * the walk, rather than filtering afterward, keeps the scan from reading those trees at all, and a
 * `.wrangler` directory grows with every local run.
 * @param {string} token
 * @param {string} root
 */
export function envVarInSourceTree(token, root = ROOT) {
  const key = `${root}\0${token}`;
  const cached = ENV_VAR_HITS.get(key);
  if (cached !== undefined) return cached;

  let found = false;
  try {
    const out = execSync(
      `grep -rl ${GENERATED_TREE_EXCLUDES} -- "\\b${token}\\b" src packages migrations examples/showcase scripts .github 2>/dev/null || true`,
      { cwd: root },
    )
      .toString()
      .trim();
    found = out.length > 0;
  } catch {
    // The command ends in `|| true`, so reaching here means the shell itself failed rather than
    // the token being absent. Fall through as "not found" and let the resulting finding surface it.
  }
  ENV_VAR_HITS.set(key, found);
  return found;
}

/**
 * Every `cairn`-line finding in one file's code-voice segments, each carrying the `file` it came
 * from alongside `resolveCairnLine`'s own `line`, `class`, and composed `token` message
 * (`${word} (not accepted by/not a subcommand of \`${path}\`)`), with an allowlisted finding
 * dropped. Split out of `findUnresolvedSymbols`'s per-file loop so the file/line wiring is
 * directly testable without a scratch corpus.
 * @param {string} file the file path a finding is attributed to
 * @param {CodeVoiceSegment[]} segments
 * @param {Map<string, Set<string>>} commandFlags
 * @returns {{ file: string, line: number, class: string, token: string }[]}
 */
export function cairnLineFindings(file, segments, commandFlags) {
  /** @type {{ file: string, line: number, class: string, token: string }[]} */
  const findings = [];
  for (const items of extractCairnLines(segments)) {
    for (const finding of resolveCairnLine(items, commandFlags)) {
      if (ALLOWLIST.has(`${finding.class}:${finding.token}`)) continue;
      const reason = finding.class === 'cairn-flag' ? 'not accepted by' : 'not a subcommand of';
      findings.push({
        file,
        line: finding.line,
        class: finding.class,
        token: `${finding.token} (${reason} \`${finding.path}\`)`,
      });
    }
  }
  return findings;
}

/**
 * Every unresolved symbol across the files in scope. Each entry names the file, the line, the
 * class, and the offending token.
 * @param {string} root
 */
export function findUnresolvedSymbols(root = ROOT) {
  const apiSurface = parseApiSurface(root);
  const cliFlags = cliFlagNames(root);
  const cairnCommands = cairnCommandFlags(root);
  const logEvents = logEventNames(root);
  const conditions = conditionIds(root);
  const checkIds = toolCheckIds();
  const eventOrConditionAreas = new Set(
    [...logEvents, ...conditions, ...checkIds].map((e) => e.slice(0, e.indexOf('.'))),
  );

  /** @type {{ file: string, line: number, class: string, token: string }[]} */
  const findings = [];

  /**
   * Record every candidate of one class that neither the code nor the allowlist accounts for. The
   * order is load-bearing: `resolves` runs first, so an allowlist entry can never mask a token the
   * code already carries. The allowlist key is `<class>:<token>` for all five classes, spelled here
   * once rather than five times, since a typo in that key would quietly excuse nothing.
   * @param {string} file
   * @param {string} cls the class the finding reports, which is also the allowlist key's prefix
   * @param {SymbolCandidate[]} candidates
   * @param {(candidate: any) => boolean} resolves whether the code carries this candidate
   * @param {(candidate: any) => string} [describe] how the finding names the token, for a class
   *   whose bare token does not say enough to act on
   */
  function recordUnresolved(file, cls, candidates, resolves, describe = (candidate) => candidate.token) {
    for (const candidate of candidates) {
      if (resolves(candidate)) continue;
      if (ALLOWLIST.has(`${cls}:${candidate.token}`)) continue;
      findings.push({ file, line: candidate.line, class: cls, token: describe(candidate) });
    }
  }

  // One line per class: what it extracts, and the ground truth it resolves against.
  for (const file of filesInScope(root)) {
    const text = readFileSync(join(root, file), 'utf8');
    const segments = codeVoiceSegments(text);

    recordUnresolved(file, 'cli-flag', extractCliFlags(segments), ({ token }) =>
      cliFlags.has(token.slice(2)),
    );
    findings.push(...cairnLineFindings(file, segments, cairnCommands));
    recordUnresolved(file, 'env-var', extractEnvVars(segments), ({ token }) =>
      envVarInSourceTree(token, root),
    );
    recordUnresolved(
      file,
      'export',
      extractImportedIdentifiers(segments),
      ({ token, subpath }) => apiSurface.get(subpath)?.has(token) === true,
      ({ token, subpath }) => `${token} (from '@glw907/cairn-cms${subpath === '.' ? '' : subpath}')`,
    );
    recordUnresolved(file, 'file-path', extractFilePaths(segments), ({ token }) =>
      pathExists(token, root),
    );
    recordUnresolved(
      file,
      'log-event',
      extractEventOrConditionCandidates(segments, eventOrConditionAreas),
      ({ token }) => logEvents.has(token) || conditions.has(token) || checkIds.has(token),
    );
  }

  return findings;
}

function main() {
  const findings = findUnresolvedSymbols();
  if (findings.length === 0) {
    console.log(`check-symbols: OK (${filesInScope().length} files, no unresolved symbol)`);
    return;
  }
  console.error(`check-symbols: ${findings.length} unresolved symbol(s)\n`);
  for (const { file, line, class: cls, token } of findings) {
    console.error(`  ${file}:${line}  [${cls}]  ${token}`);
  }
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
