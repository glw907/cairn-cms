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
// Five token classes, each resolved against a different ground truth, chosen because each
// resolves reliably without guessing:
//   - a CLI flag (`--some-flag`) inside a shell-tagged fenced block, resolved against
//     `packages/create-cairn-site`'s own argument parser; anything else (npm, npx, wrangler,
//     git, gh, node, or one of cairn's other CLIs) comes from the allowlist
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
//     `check-readiness.mjs` already loads), and every `DoctorCheck.id` across `src/lib/doctor/`'s
//     check modules. All three share the exact dotted-lowercase shape and often the same area
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The published tracks plus the front doors this gate covers. The four new tracks (the three
// directories below plus the `docs/why-cairn.md` page) do not exist yet at the moment this gate
// lands (Phase 2 writes their first pages under it, by design) and are skipped silently until
// they do; a missing entry here is never an error.
const SCOPE = [
  'docs/admin',
  'docs/editors',
  'docs/extend',
  'docs/why-cairn.md',
  'docs/reference',
  'docs/README.md',
  'README.md',
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

/** Every file in scope that exists today, repo-relative, sorted. @param {string} root */
export function filesInScope(root = ROOT) {
  const out = [];
  for (const entry of SCOPE) {
    const abs = join(root, entry);
    if (!existsSync(abs)) continue;
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
 * `src/lib/diagnostics/conditions.ts`'s condition-id registry, and every `DoctorCheck.id` across
 * `src/lib/doctor/`. All three share the exact dotted-lowercase shape and, often, the same area
 * (`auth`, `config`, `admin`, `github`), which is why an earlier version of this extractor that
 * resolved against log events alone produced roughly ninety false positives across fifteen pages,
 * overwhelmingly real condition and check ids it had no way to recognize. An earlier attempt to
 * quiet those by requiring three or more segments was the wrong fix and is recorded here so it is
 * not retried: 40 of the 74 real events carry exactly two segments, so that floor silently turned
 * the class off for most of the vocabulary, including every `commit.*`, `entry.*`, and `media.*`
 * event a diagnostics page cites. Resolving against the union keeps full recall over all three
 * vocabularies (`admin/is-it-working.md` is built entirely out of condition ids) and turns two
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
 * Parse every `DoctorCheck.id` field (`id: 'config.bindings'`) across `src/lib/doctor/`'s check
 * modules, the same `id: '...'` shape `conditionIds` reads, into its literal set. A doctor check
 * id and the condition id it maps to (its `conditionId` field, already covered by
 * `conditionIds`) are two different values in the same dotted-lowercase shape,
 * `docs/reference/doctor.md`'s own "Check" / "Condition" table columns: `config.bindings` (the
 * check) fails as `config.bindings-missing` (the condition), not as itself.
 * @param {string} root
 */
export function doctorCheckIds(root = ROOT) {
  const dir = join(root, 'src/lib/doctor');
  const ids = new Set();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // The check modules only (`check-*.ts` and `checks-*.ts`), never every file in the
    // directory. A resolution set that silently widens is the failure this gate exists to
    // catch: an unrelated `id:` field added to `assemble.ts` or `report.ts` would start
    // resolving a hallucinated dotted name and quietly retire a true positive.
    if (!entry.isFile() || !entry.name.startsWith('check') || !entry.name.endsWith('.ts')) continue;
    const text = readFileSync(join(dir, entry.name), 'utf8');
    for (const m of text.matchAll(/\bid:\s*'([a-z][a-z0-9_.-]*)'/g)) ids.add(m[1]);
  }
  return ids;
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

/**
 * Whether a SCREAMING_SNAKE_CASE token appears anywhere in the source tree (excluding docs and
 * generated output), the ground truth for the environment-variable class.
 * @param {string} token
 * @param {string} root
 */
function envVarInSourceTree(token, root = ROOT) {
  const key = `${root}\0${token}`;
  const cached = ENV_VAR_HITS.get(key);
  if (cached !== undefined) return cached;

  let found = false;
  try {
    const out = execSync(
      `grep -rl -- "\\b${token}\\b" src packages migrations examples/showcase scripts .github 2>/dev/null | grep -v node_modules || true`,
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
 * Every unresolved symbol across the files in scope. Each entry names the file, the line, the
 * class, and the offending token.
 * @param {string} root
 */
export function findUnresolvedSymbols(root = ROOT) {
  const apiSurface = parseApiSurface(root);
  const cliFlags = createCairnSiteFlags(root);
  const logEvents = logEventNames(root);
  const conditions = conditionIds(root);
  const checkIds = doctorCheckIds(root);
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
