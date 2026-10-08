// cairn-cms: the consumer-context leak gate. cairn's examples, prose, and shipped files must read
// the same to a reader who has never heard of the sites cairn grew up beside, so this gate scans
// the places a stranger reads for four classes of text that only mean something inside the
// maintainer's world:
//
//   C1  consumer-site identity     (site slugs, the owner's name, repo owners)
//   C2  consumer domain vocabulary (club, household, instructor, and the like)
//   C3  maintainer process         (rulings, dated attributions, internal doc links, workstation paths)
//   C4  personal data              (emails, UUIDs, known account ids)
//
// Three tiers decide what is scanned and for which classes:
//
//   T1  published docs: README.md, docs/{extend,reference,admin,editors}, docs/why-cairn.md,
//       docs/README.md, examples/showcase/README.md. C1 to C4.
//   T2  shipped files: skills, claude, the showcase chassis, the reproductions, the CLI's messages,
//       the scaffold and waymark templates (minus seed content, LICENSE, and the synced `.claude/`
//       copies), and CHANGELOG.md. Whole files get C1 to C4. In src/lib only the doc comments
//       (`/** */` and `<!-- @component -->`) are scanned, for C1 and C2. The `## Unreleased`
//       section of CHANGELOG.md is an error; released sections are a warning.
//   T3  agent inputs: the briefs, outlines, and facts, plus docs-register.md. C1, C2, and C4 only,
//       and C1 leaves out the owner's name and repo owner, since process vocabulary is expected here.
//
// A finding is an error unless it is marked a warning (the `ratified` prose word, released CHANGELOG
// sections). Errors fail the gate.
//
// Allowlist, and only this: a marker comment that names the classes it excuses and gives a reason.
//
//   <!-- leak-ok: C1 -- why this one line is fine -->     (markdown; excuses the NEXT line)
//   // leak-ok: C2 -- why                                 (code; excuses the NEXT line)
//   <!-- leak-ok-begin: C1,C2 -- why --> ... <!-- leak-ok-end -->   (a region)
//
// A marker with no class list or no reason is itself an error, and so is an unterminated or stray
// region marker. Path exceptions are fixed in profileFor: seed content and LICENSE, nothing else.
// The marker comment itself is not scanned, so its reason may quote the term it excuses; the rest of
// its line is, and a marker excuses nothing on its own line. The `#` form needs content before it on
// the line, so a markdown heading is never a marker, and `//` and `/*` must follow whitespace.
//
// The known-account-id list in leak-terms.json holds SHA-256 digests, not the ids: listing the ids
// in a tracked file would publish the very values the gate guards.
//
// Interface: `node scripts/checks/check-leaks.mjs [--root <dir>] [--warnings]`. `--root` scans
// another checkout read-only; `--warnings` also lists the released-CHANGELOG warnings, which are
// otherwise summarized as a count.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);

const TERMS = JSON.parse(readFileSync(new URL('./leak-terms.json', import.meta.url), 'utf8'));

/** The four leak classes, in report order. */
export const CLASS_IDS = ['C1', 'C2', 'C3', 'C4'];

const ALL_TIERS = ['T1', 'T2', 'T3'];
const PUBLIC_TIERS = ['T1', 'T2'];

/**
 * One regex rule. `tiers` limits where it applies; `severity` defaults to error. Every pattern
 * carries the `g` flag so a line yields each of its matches.
 * @typedef {{ cls: string, tiers: string[], pattern: RegExp, label: string, severity?: 'error' | 'warning', outsideCode?: boolean }} Rule
 */

// A link into the engine repo's own GitHub tree is the sanctioned way for a shipped page to point at
// a maintainer doc, so the internal-path and ledger rules skip a path that follows it.
const GITHUB_BLOB = 'github\\.com/glw907/cairn-cms/(?:blob|tree)/main/';

/** @type {Rule[]} */
const RULES = [
  {
    cls: 'C1',
    tiers: ALL_TIERS,
    pattern: /\b(?:ecxc|907[.-]life|aksailing[\w-]*|alaska sailing|xcathlet[\w-]*|cairn-pub)\b/gi,
    label: 'consumer site name',
  },
  { cls: 'C1', tiers: ALL_TIERS, pattern: /\bASC\b/g, label: 'consumer site abbreviation' },
  { cls: 'C1', tiers: PUBLIC_TIERS, pattern: /\bGeoff\b/g, label: "the maintainer's name" },
  {
    cls: 'C1',
    tiers: PUBLIC_TIERS,
    pattern: /glw907\/(?!cairn-cms\b)/g,
    label: 'a repository outside cairn-cms',
  },
  {
    cls: 'C2',
    tiers: ALL_TIERS,
    pattern:
      /\b(?:clubs?|club-admin|instructors?|dues|households?|athletes?|boosters?|coach(?:es)?|regattas?|moorings?|sailing|skiing|skiers?|racers?|waxing|anchorage)\b/gi,
    label: 'consumer domain vocabulary',
  },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: /\b(?:owner|house) ruling\b/gi,
    label: 'a maintainer ruling',
  },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: /\b(?:Geoff|owner)\b[^)\n]{0,20}20\d\d-\d\d-\d\d/g,
    label: 'a dated attribution',
  },
  { cls: 'C3', tiers: PUBLIC_TIERS, pattern: /\bf:[a-z0-9]{6}\b/g, label: 'a fact id' },
  { cls: 'C3', tiers: PUBLIC_TIERS, pattern: /\bfacts container\b/gi, label: 'the facts container' },
  { cls: 'C3', tiers: PUBLIC_TIERS, pattern: /\bconductor\b/gi, label: 'pass machinery' },
  { cls: 'C3', tiers: PUBLIC_TIERS, pattern: /\bstage 2[ab]\b/gi, label: 'a docs-stage name' },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: new RegExp(`(?<!${GITHUB_BLOB})(?:\\.\\./|docs/)(?:internal|superpowers)/`, 'g'),
    label: 'a path into maintainer docs',
  },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: new RegExp(`(?<!${GITHUB_BLOB})\\b(?:ROADMAP|STATUS|HISTORY)\\.md\\b`, 'g'),
    label: 'a maintainer ledger',
  },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: /\/var\/home\/|~\/\.dotfiles|~\/Projects/g,
    label: 'a workstation path',
  },
  {
    cls: 'C3',
    tiers: PUBLIC_TIERS,
    pattern: /\bratif(?:y|ied|ication)\b/gi,
    label: 'ratification jargon',
    severity: 'warning',
    outsideCode: true,
  },
];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const ID_TOKEN = /\b(?:\d{7,}|[0-9a-f]{20,})\b/gi;

/**
 * A finding the gate reports.
 * @typedef {{ path: string, line: number, cls: string, tier: string, severity: 'error' | 'warning', text: string, label: string }} Finding
 */

/**
 * How a path is scanned: its tier, the classes that apply, and the scan mode. `whole` scans every
 * line, `tsdoc` only doc-comment lines, `changelog` every line with severity set by section.
 * @typedef {{ tier: 'T1' | 'T2' | 'T3', classes: string[], mode: 'whole' | 'tsdoc' | 'changelog' }} Profile
 */

// The scaffold's `packages/create-cairn-site/template` is gitignored build output baked from the
// showcase (whose chassis is scanned directly), so only the committed Waymark tree is a root.
const TEMPLATE_ROOTS = ['templates/waymark'];
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.pdf',
  '.zip',
  '.gz',
  '.wasm',
  '.mp4',
  '.webm',
]);

/**
 * Classify a repo-relative path. Returns null for a path the gate does not scan: a path outside
 * every tier, a binary file, or one of the two path exceptions (seed content and LICENSE).
 * @param {string} relPath Repo-relative, forward slashes.
 * @returns {Profile | null}
 */
export function profileFor(relPath) {
  const path = relPath.split(sep).join('/');
  if (/(^|\/)(node_modules|\.svelte-kit|dist|\.git)\//.test(path)) return null;
  if (/(^|\/)LICENSE$/.test(path)) return null;
  const dot = path.lastIndexOf('.');
  if (dot > path.lastIndexOf('/') && BINARY_EXTENSIONS.has(path.slice(dot).toLowerCase())) return null;

  const all = ['C1', 'C2', 'C3', 'C4'];
  if (
    path === 'README.md' ||
    path === 'docs/README.md' ||
    path === 'docs/why-cairn.md' ||
    path === 'examples/showcase/README.md' ||
    /^docs\/(?:extend|reference|admin|editors)\/.+\.md$/.test(path) ||
    /^docs\/reference\/schema\/.+\.json$/.test(path)
  ) {
    return { tier: 'T1', classes: all, mode: 'whole' };
  }
  if (
    /^docs\/internal\/(?:briefs|outlines|facts)\//.test(path) ||
    path === 'docs/internal/docs-register.md'
  ) {
    return { tier: 'T3', classes: ['C1', 'C2', 'C4'], mode: 'whole' };
  }
  if (path === 'CHANGELOG.md') return { tier: 'T2', classes: all, mode: 'changelog' };
  for (const root of TEMPLATE_ROOTS) {
    if (!path.startsWith(`${root}/`)) continue;
    const inside = path.slice(root.length + 1);
    if (inside.startsWith('src/content/') || inside.startsWith('.claude/')) return null;
    return { tier: 'T2', classes: all, mode: 'whole' };
  }
  if (
    /^(?:skills|claude|migrations|migrations-channel)\//.test(path) ||
    path.startsWith('examples/showcase/src/chassis/') ||
    path.startsWith('src/lib/reproductions/') ||
    path === 'tool/cmd/cairn/messages.go'
  ) {
    return { tier: 'T2', classes: all, mode: 'whole' };
  }
  if (/^src\/lib\/.+\.(?:ts|svelte)$/.test(path)) {
    return { tier: 'T2', classes: ['C1', 'C2'], mode: 'tsdoc' };
  }
  return null;
}

// --- Allowlist markers. ---

const MARKER = /(?:<!--|(?<![^\s])(?:\/\/|\/\*)|(?<=\S\s+)#)\s*leak-ok(-begin|-end)?\b([^\n]*)/;

/**
 * Parse one line for a `leak-ok` marker. Returns null for a line that carries none. An invalid
 * marker comes back with `error` set and no usable classes.
 * @param {string} line
 * @returns {{ kind: 'next' | 'begin' | 'end', classes: string[], error: string | null } | null}
 */
export function parseMarker(line) {
  const found = MARKER.exec(line);
  if (!found) return null;
  const kind = found[1] === '-begin' ? 'begin' : found[1] === '-end' ? 'end' : 'next';
  if (kind === 'end') return { kind, classes: [], error: null };

  const rest = found[2].replace(/\s*(?:-->|\*\/)\s*$/, '');
  const shape = /^\s*:\s*([^-]*?)\s*--\s*(.*)$/.exec(rest);
  if (!shape) {
    const hasDash = /--/.test(rest);
    return {
      kind,
      classes: [],
      error: hasDash
        ? 'leak-ok marker needs a class list before the "--" and a reason after it'
        : 'leak-ok marker needs a class list and a reason ("leak-ok: C1 -- reason")',
    };
  }
  const classes = shape[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (classes.length === 0 || classes.some((cls) => !CLASS_IDS.includes(cls))) {
    return { kind, classes: [], error: 'leak-ok marker needs a class list of C1 to C4, comma-separated' };
  }
  if (shape[2].trim().length === 0) {
    return { kind, classes, error: 'leak-ok marker needs a reason after the "--"' };
  }
  return { kind, classes, error: null };
}

/**
 * The text of a marker line outside the marker comment: what precedes the opener and what follows
 * the closing `-->` or `*\/`. A `//` or `#` marker runs to the end of the line, so it has no tail.
 * @param {string} line
 * @returns {{ before: string, after: string }}
 */
export function outsideMarker(line) {
  const found = MARKER.exec(line);
  if (!found) return { before: line, after: '' };
  const opener = found[0].startsWith('<!--') ? '-->' : found[0].startsWith('/*') ? '*/' : null;
  const before = line.slice(0, found.index);
  if (!opener) return { before, after: '' };
  const close = line.indexOf(opener, found.index + found[0].indexOf('leak-ok'));
  return { before, after: close === -1 ? '' : line.slice(close + opener.length) };
}

// --- Doc-comment masking for src/lib. ---

/**
 * The 1-based line numbers inside a `/** *\/` block or a Svelte `<!-- @component -->` block.
 * @param {string} text
 * @returns {Set<number>}
 */
export function docCommentLines(text) {
  const lines = new Set();
  /**
   * @param {number} start
   * @param {number} end
   */
  const mark = (start, end) => {
    const first = text.slice(0, start).split('\n').length;
    const last = first + text.slice(start, end).split('\n').length - 1;
    for (let n = first; n <= last; n++) lines.add(n);
  };
  for (const found of text.matchAll(/\/\*\*[\s\S]*?\*\//g)) mark(found.index, found.index + found[0].length);
  for (const found of text.matchAll(/<!--\s*@component[\s\S]*?-->/g)) {
    mark(found.index, found.index + found[0].length);
  }
  return lines;
}

// --- Scanning one text. ---

/** The SHA-256 digests of the known account ids. Exported so a test can register a made-up id. */
export const KNOWN_ID_HASHES = new Set(TERMS.knownIdHashes);

/**
 * Whether a UUID is an obvious placeholder: at least 20 leading zero digits, which covers the
 * all-zero id and a zero-padded counter such as `...-000000000001`. A random id never does.
 * @param {string} uuid
 * @returns {boolean}
 */
function isPlaceholderUuid(uuid) {
  return /^0{20}/.test(uuid.replace(/-/g, ''));
}

/**
 * Whether an email match is a placeholder the gate allows.
 * @param {string} email
 * @returns {boolean}
 */
function isPlaceholderEmail(email) {
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at).toLowerCase();
  const domain = email.slice(at + 1).toLowerCase();
  return (
    TERMS.allowedEmailLocalParts.includes(local) ||
    TERMS.allowedEmailDomains.some((/** @type {string} */ allowed) => domain === allowed || domain.endsWith(`.${allowed}`)) ||
    TERMS.allowedEmailSuffixes.some((/** @type {string} */ suffix) => domain.endsWith(suffix))
  );
}

/**
 * One raw match on a line, before the allowlist applies.
 * @typedef {{ cls: string, text: string, label: string, severity: 'error' | 'warning' }} Hit
 */

/**
 * Every raw finding on one line for the given tier and classes, before the allowlist applies.
 * @param {string} line
 * @param {string} tier
 * @param {string[]} classes
 * @returns {Hit[]}
 */
function lineHits(line, tier, classes) {
  /** @type {Hit[]} */
  const hits = [];
  for (const rule of RULES) {
    if (!classes.includes(rule.cls) || !rule.tiers.includes(tier)) continue;
    const subject = rule.outsideCode ? line.replace(/`[^`]*`/g, '') : line;
    for (const found of subject.matchAll(rule.pattern)) {
      hits.push({ cls: rule.cls, text: found[0], label: rule.label, severity: rule.severity ?? 'error' });
    }
  }
  if (classes.includes('C4')) {
    for (const found of line.matchAll(EMAIL)) {
      if (!isPlaceholderEmail(found[0])) {
        hits.push({ cls: 'C4', text: found[0], label: 'an email address', severity: 'error' });
      }
    }
    for (const found of line.matchAll(UUID)) {
      if (!isPlaceholderUuid(found[0])) {
        hits.push({ cls: 'C4', text: found[0], label: 'a UUID', severity: 'error' });
      }
    }
    for (const found of line.matchAll(ID_TOKEN)) {
      const digest = createHash('sha256').update(found[0].toLowerCase()).digest('hex');
      if (KNOWN_ID_HASHES.has(digest)) {
        hits.push({ cls: 'C4', text: found[0], label: 'a known account id', severity: 'error' });
      }
    }
  }
  return hits;
}

/**
 * Scan one file's text under a profile. Returns the findings, marker errors included, with
 * allowlisted hits already removed.
 * @param {string} text
 * @param {Profile} profile
 * @param {string} [path] Reported on each finding.
 * @returns {Finding[]}
 */
export function scanText(text, profile, path = '') {
  const lines = text.split('\n');
  const inDoc = profile.mode === 'tsdoc' ? docCommentLines(text) : null;
  /** @type {Finding[]} */
  const findings = [];
  /**
   * @param {number} line
   * @param {string} message
   */
  const problem = (line, message) =>
    findings.push({ path, line, cls: 'marker', tier: profile.tier, severity: 'error', text: message, label: 'allowlist marker' });

  /** @type {Record<string, number>} */
  const regionDepth = Object.fromEntries(CLASS_IDS.map((cls) => [cls, 0]));
  /** @type {{ line: number, classes: string[] }[]} */
  const openRegions = [];
  /** @type {Set<string>} */
  let pending = new Set();
  let inUnreleased = false;

  lines.forEach((text, index) => {
    const lineNo = index + 1;
    if (profile.mode === 'changelog' && /^## /.test(text)) inUnreleased = /^## Unreleased\b/i.test(text);

    /**
     * @param {string} segment
     * @param {Set<string>} excused
     */
    const scan = (segment, excused) => {
      if (inDoc && !inDoc.has(lineNo)) return;
      for (const hit of lineHits(segment, profile.tier, profile.classes)) {
        if (excused.has(hit.cls) || regionDepth[hit.cls] > 0) continue;
        const releasedChangelog = profile.mode === 'changelog' && !inUnreleased;
        findings.push({
          path,
          line: lineNo,
          cls: hit.cls,
          tier: profile.tier,
          severity: releasedChangelog ? 'warning' : hit.severity,
          text: hit.text,
          label: hit.label,
        });
      }
    };

    const marker = parseMarker(text);
    if (!marker) {
      const excused = pending;
      pending = new Set();
      scan(text, excused);
      return;
    }

    // A marker line is still a line: a previous next-line marker excuses the text outside this
    // marker's comment, and this marker excuses nothing on its own line. Only the text before a
    // region-end marker sits inside the region it closes.
    const { before, after } = outsideMarker(text);
    const excused = pending;
    if ((before + after).trim().length > 0) pending = new Set();
    scan(before, excused);
    if (marker.kind === 'end') {
      const region = openRegions.pop();
      if (region) for (const cls of region.classes) regionDepth[cls] -= 1;
      scan(after, excused);
      if (!region) problem(lineNo, 'leak-ok-end with no open leak-ok-begin');
      return;
    }
    scan(after, excused);
    if (marker.error) problem(lineNo, marker.error);
    else if (marker.kind === 'next') for (const cls of marker.classes) pending.add(cls);
    else {
      for (const cls of marker.classes) regionDepth[cls] += 1;
      openRegions.push({ line: lineNo, classes: marker.classes });
    }
  });

  for (const region of openRegions) problem(region.line, 'leak-ok-begin with no leak-ok-end');
  return findings;
}

// --- Walking the tree. ---

/** The files and directories the check walks, relative to the repo root. */
export const SCAN_ROOTS = [
  'README.md',
  'CHANGELOG.md',
  'docs/README.md',
  'docs/why-cairn.md',
  'docs/extend',
  'docs/reference',
  'docs/admin',
  'docs/editors',
  'docs/internal/briefs',
  'docs/internal/outlines',
  'docs/internal/facts',
  'docs/internal/docs-register.md',
  'skills',
  'claude',
  'migrations',
  'migrations-channel',
  'examples/showcase/README.md',
  'examples/showcase/src/chassis',
  'src/lib',
  'tool/cmd/cairn/messages.go',
  ...TEMPLATE_ROOTS,
];

/**
 * Every file under `start`, skipping vendored and generated directories.
 * @param {string} start
 * @returns {string[]}
 */
function filesUnder(start) {
  if (!existsSync(start)) return [];
  if (!statSync(start).isDirectory()) return [start];
  const out = [];
  for (const name of readdirSync(start)) {
    if (name === 'node_modules' || name === '.svelte-kit' || name === 'dist' || name === '.git') continue;
    out.push(...filesUnder(join(start, name)));
  }
  return out;
}

/**
 * Scan a checkout and return every finding.
 * @param {string} [root] The checkout to scan; defaults to this repo.
 * @returns {{ findings: Finding[], scanned: number }}
 */
export function runLeakCheck(root = ROOT) {
  /** @type {Finding[]} */
  const findings = [];
  let scanned = 0;
  const seen = new Set();
  for (const start of SCAN_ROOTS) {
    for (const file of filesUnder(join(root, start))) {
      if (seen.has(file)) continue;
      seen.add(file);
      const rel = relative(root, file).split(sep).join('/');
      const profile = profileFor(rel);
      if (!profile) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes('\0')) continue;
      scanned += 1;
      findings.push(...scanText(text, profile, rel));
    }
  }
  return { findings, scanned };
}

/**
 * Render findings as report lines, errors first. Released-CHANGELOG warnings fold into one count
 * line unless `allWarnings` is set.
 * @param {Finding[]} findings
 * @param {boolean} [allWarnings]
 * @returns {string[]}
 */
export function formatFindings(findings, allWarnings = false) {
  /** @type {string[]} */
  const lines = [];
  /** @param {Finding} finding */
  const render = (finding) =>
    `${finding.path}:${finding.line}: ${finding.severity} [${finding.tier} ${finding.cls}] ${finding.label}: ${JSON.stringify(finding.text)}`;
  for (const finding of findings.filter((entry) => entry.severity === 'error')) lines.push(render(finding));
  const warnings = findings.filter((entry) => entry.severity === 'warning');
  const folded = allWarnings ? [] : warnings.filter((entry) => entry.path === 'CHANGELOG.md');
  for (const finding of warnings) if (!folded.includes(finding)) lines.push(render(finding));
  if (folded.length > 0) {
    lines.push(`CHANGELOG.md: ${folded.length} warning(s) in released sections (run with --warnings to list)`);
  }
  return lines;
}

function main() {
  const argv = process.argv.slice(2);
  const rootFlag = argv.indexOf('--root');
  const root = rootFlag >= 0 ? resolve(argv[rootFlag + 1]) : ROOT;
  const { findings, scanned } = runLeakCheck(root);
  const errors = findings.filter((entry) => entry.severity === 'error');
  const warnings = findings.length - errors.length;
  for (const line of formatFindings(findings, argv.includes('--warnings'))) console.log(line);
  if (errors.length > 0) {
    console.error(`check:leaks: ${errors.length} error(s), ${warnings} warning(s) across ${scanned} file(s)`);
    process.exitCode = 1;
    return;
  }
  console.log(`check:leaks: OK (${scanned} file(s), ${warnings} warning(s))`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
