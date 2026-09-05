// cairn-cms: the code-idiom gate. Records the code-idiom charter's M4 rule (indentation is
// 2-space everywhere) as a running check rather than a one-time sweep; .editorconfig has
// declared `indent_size = 2` since the M4 pass, but nothing enforced it until this gate exists,
// so its claim becomes true only from here on. Six rules, several scopes:
//
//   1. Leading-tab indentation is banned in src/lib and scripts (*.ts, *.svelte, *.mjs).
//   2. `process.exit` is banned in scripts/checks/*.mjs ONLY (never scripts/lab, build, or
//      test): every one of those gates converts a failure into `process.exitCode` plus a
//      `return`/flow guard, so a caller in the same process (a test, a sibling gate importing a
//      helper) never has the process killed out from under it.
//   3. A gate under scripts/checks names itself one way in its own console output. A mismatch
//      (part of the file saying `check:foo`, another part saying `foo`, or `check-foo`) is the
//      exact drift a 2026-09 sweep found in check-chassis-boundary.mjs.
//   4. A `docs/superpowers/` path is banned in src/lib: that directory is planning-and-spec
//      scaffolding the npm tarball never ships, so a comment pointing there sends a package
//      consumer to a 404, not a citation. A bare functional-spec citation, e.g. `(spec 2.8)`,
//      names a section of the shipped functional spec by number and is not this shape.
//   5. A pass-scoped process reference is banned in src/lib: `Task N`, `Phase N`/`phase N`,
//      `Pass A`/`pass A` (a single lettered pass), `Pass N`/`pass N`, `Plan N`/`plan N`,
//      `batch N`, `Round N`/`round-N`, `design-arc D2`/`Design ratchet D3` (a design-decision-log
//      citation naming its own iteration), a `T<n>` marker sharing its comment line with
//      "adoption"/"sweep"/"task", a bare `R<n>`/`C<n>b?` round marker, `this pass`/`this phase`,
//      and a named-sweep parenthetical like `(env-genericity sweep)`. These all name the WORK
//      SESSION that produced a line rather than the durable reason the line is true, so they rot
//      the moment the session is over; the fix is always to keep the rationale and drop the
//      session label. Domain vocabulary is deliberately NOT this shape: "a validation pass", "the
//      constraints pass", `db.batch()`, and "did not pass" carry no numeric or letter suffix, so
//      none of these patterns fire on them. `R4 re-export`/`R4 closure` are exempted BY NAME: they
//      are rulings-ledger vocabulary for the canonical-home re-export pattern
//      (`docs/internal/engine-rulings.md`), not a pass citation, and Cloudflare's `R2` binding and
//      the `C0`/DEL control-character pair are exempted because they are not round markers at all.
//   6. A consumer-site hostname is banned in src/lib, matched BY SHAPE (a bare
//      `label.label.tld`-shaped literal over a short list of real TLDs), never by enumerating
//      the private hostnames a consumer's own site carries: this file is public, and printing a
//      customer's domain in a public gate would be the exact disclosure the rule exists to
//      prevent. `HOSTNAME_ALLOWED_HOSTS` names the public standards bodies and vendor APIs cairn's
//      own code and docs legitimately cite (w3.org, github.com, cloudflare.com, and so on); a
//      hostname shape absent from that list fails the gate, so a future private mention is
//      caught without ever having been typed into this file. Accepted limitation: none of rules
//      4-6 enumerates a private repo NAME (a site's own GitHub org or slug, e.g.
//      "aksailingclub-org") into this public gate's data; only the hostname shape is
//      structurally caught, so a bare mention of a private repo's name in prose is a manual sweep
//      finding, not something this gate can catch going forward.
//
// Rules 4-6 live in THIS gate, scoped to `src/lib`, rather than in the ESLint comment plugin
// (`eslint.config.js`, `check:comments`) for one structural reason: ESLint's TypeScript parser
// is wired for `.ts` only, so a rule living there is silently inert over every `.svelte` file,
// and the admin components carry the majority of this register's history. The comment register
// has to hold uniformly across both extensions, so the rule has to live somewhere that reads
// both, which today is a plain-text scan, not an AST-aware linter. Rules 4-6 scan each file's
// RAW TEXT rather than an extracted comment stream: a real comment-only extractor would need a
// second parser per extension (svelte/compiler for `.svelte`, a TS tokenizer for `.ts`) for a
// three-rule register that, in practice, only ever fires inside a comment or a doc-facing error
// string (never inside a real runtime hostname or URL literal, which is why the false-positive
// surface measured against the real tree is the fixed, small allowlist above rather than every
// asset path in the codebase).
//
// Self-exclusion: this file lives under scripts/checks and is itself in scope for rules 2 and 3,
// so its own `process.exit` pattern is assembled from two literals (PROCESS_EXIT_PATTERN below)
// rather than written as the literal substring, and its own console output uses exactly one
// spelling (`check-idioms`). Rules 4-6 scope to `src/lib` only, so this file and its own header
// above (which quotes the banned shapes) are never in their scan. Every rule also excludes
// `scripts/checks/fixtures/`, where this gate's own tests keep deliberately-violating sample
// files. Wired as `npm run check:idioms`.
import { readFileSync } from 'node:fs';
import { resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk } from '../walk-files.mjs';
import { repoRoot } from '../repo-root.mjs';

const ROOT = repoRoot(import.meta.url);
const FIXTURES_PREFIX = 'scripts/checks/fixtures/';

// Assembled, not written as the literal substring, so this file never itself contains the exact
// text rule 2 bans (see the header note above).
const PROCESS_EXIT_PATTERN = 'process.' + 'exit(';

/**
 * Every 1-based line number in `source` whose first character is a tab.
 * @param {string} source
 * @returns {number[]}
 */
export function findLeadingTabIndentLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    if (line.startsWith('\t')) hits.push(i + 1);
  });
  return hits;
}

/**
 * Every 1-based line number in `source` that calls `process.exit`.
 * @param {string} source
 * @returns {number[]}
 */
export function findProcessExitLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    if (line.includes(PROCESS_EXIT_PATTERN)) hits.push(i + 1);
  });
  return hits;
}

/**
 * The self-identity spellings a `check-<name>.mjs` gate could plausibly use for itself: the full
 * filename stem, the npm-script form (`check:<name>`), and the bare name with the `check-`
 * prefix dropped. A stem that does not start with `check-` (a shared helper like
 * reference-coverage.mjs) has exactly one plausible spelling, itself.
 * @param {string} stem the `.mjs` filename without its extension
 * @returns {string[]}
 */
export function selfIdentityCandidates(stem) {
  if (!stem.startsWith('check-')) return [stem];
  const bare = stem.slice('check-'.length);
  return [stem, `check:${bare}`, bare];
}

// Extracts a console.log/console.error call's first string or template-literal argument, quote
// characters included, so the caller can strip them and read the static leading text (the part
// before any `${...}` hole, which is always where a self-identity prefix lives in this codebase).
const CONSOLE_STRING_ARG = /console\.(?:log|error)\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;

// A self-identity prefix: an identifier (letters, digits, hyphens, at most one internal colon for
// the `check:name` form) at the very start of a console message, followed by `: `.
const SELF_IDENTITY_LEADER = /^([a-zA-Z][\w-]*(?::[\w-]+)?):\s/;

/**
 * Every distinct self-identity spelling `source`'s console.log/console.error calls actually use,
 * restricted to the plausible candidates for `stem` (an unrelated leading word, like "OK" or
 * "Contrast check", is not a self-identity claim and is ignored). More than one distinct spelling
 * is the drift rule 3 bans.
 * @param {string} stem
 * @param {string} source
 * @returns {string[]}
 */
export function selfIdentityVariantsUsed(stem, source) {
  const candidates = new Set(selfIdentityCandidates(stem));
  const found = new Set();
  for (const m of source.matchAll(CONSOLE_STRING_ARG)) {
    const inner = m[1].slice(1, -1);
    const leader = SELF_IDENTITY_LEADER.exec(inner);
    if (leader && candidates.has(leader[1])) found.add(leader[1]);
  }
  return [...found];
}

// The three comment-register rules (4-6) walk `.ts`, `.svelte`, AND `.css`: a scoped CSS override
// under `src/lib` (e.g. `cairn-admin.css`) carries `/* */` comments in the same register as any
// other file here, and the raw-text scan rules 4-6 use do not care which comment syntax
// surrounds a match.
export const COMMENT_SCOPE_PATTERN = /\.(ts|svelte|css)$/;

/**
 * Every 1-based line number in `source` that names a `docs/superpowers/` path (rule 4).
 * @param {string} source
 * @returns {number[]}
 */
export function findSuperpowersPathLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    if (line.includes('docs/superpowers/')) hits.push(i + 1);
  });
  return hits;
}

// Task N (a one- or two-letter suffix allowed, e.g. `Task 16b`): the original, narrowest shape,
// capitalized only.
const TASK_LABEL_PATTERN = /\bTask\s+\d+[a-z]?\b/;
// Phase N / phase-N, either case, space or hyphen before the number.
const PHASE_LABEL_PATTERN = /\b[Pp]hase[- ]\d+[a-z]?\b/;
// Pass A / pass A: a single capital letter naming a lettered pass (e.g. "Pass B is
// upload-new-only"). Never matches a lowercase letter or a bare word after "pass" (a domain verb:
// "did not pass", "a validation pass" carry no letter at all).
const PASS_LETTER_LABEL_PATTERN = /\b[Pp]ass [A-Z]\b/;
// Pass 3 / pass 3b: a numbered pass.
const PASS_NUMBER_LABEL_PATTERN = /\b[Pp]ass \d+[a-z]?\b/;
// Plan 2 / plan 05: a numbered plan (widened from the original two-digit-only shape).
const PLAN_LABEL_PATTERN = /\b[Pp]lan \d+[a-z]?\b/;
// batch 1a / Batch 12: a numbered batch.
const BATCH_LABEL_PATTERN = /\b[Bb]atch \d+[a-z]?\b/;
// Round 2 / round-3 / Round-1: a numbered round, space or hyphen, either case.
const ROUND_LABEL_PATTERN = /\b[Rr]ound[- ]\d+[a-z]?\b/;
// design-arc D2 / Design ratchet D3: a design-decision-log citation naming its own iteration.
const DESIGN_ARC_LABEL_PATTERN = /[Dd]esign[- ](?:arc|ratchet) [A-Z]\d\b/;
// A `T<n>` marker (e.g. `T7`) is only a process reference when the same comment line also reads
// as an adoption/sweep/task citation; on its own, `T2` (a generic label, a CSS custom property
// name, a test id) is too common a shape to ban outright.
const T_MARKER_PATTERN = /\bT\d+\b/;
const T_MARKER_CONTEXT_PATTERN = /adoption|sweep|task/i;
// "this pass"/"this phase" naming the work session that produced the line, case-insensitive.
const THIS_PASS_OR_PHASE_PATTERN = /\bthis (?:pass|phase)\b/i;
// A named-sweep parenthetical, e.g. "(env-genericity sweep)".
const NAMED_SWEEP_PATTERN = /\([a-z][a-z0-9-]* sweep\)/i;
// A bare round marker: a letter (R or C) directly followed by digits and an optional trailing
// `b`. Exceptions are resolved per match in isExemptRoundMarker below.
const ROUND_MARKER_PATTERN = /\b([RC])(\d+)(b?)\b/g;

// The label-shaped rules that fire on a bare line test, independent of surrounding context.
const PROCESS_REF_LABEL_PATTERNS = [
  TASK_LABEL_PATTERN,
  PHASE_LABEL_PATTERN,
  PASS_LETTER_LABEL_PATTERN,
  PASS_NUMBER_LABEL_PATTERN,
  PLAN_LABEL_PATTERN,
  BATCH_LABEL_PATTERN,
  ROUND_LABEL_PATTERN,
  DESIGN_ARC_LABEL_PATTERN,
];

/**
 * Whether the round marker `letter+digits+suffix`, matched at `matchEnd` in `line` with `nextLine`
 * (a wrapped comment's continuation, or `''` past the last line) available for the case where the
 * exempting word wraps onto the next line, is one of the three ruled exceptions: Cloudflare's `R2`
 * binding, the `C0`/DEL control-character pair, and `R4 re-export`/`R4 closure`, the
 * rulings-ledger vocabulary for the canonical-home re-export pattern (see the header note above).
 * @param {string} letter
 * @param {string} digits
 * @param {string} suffix
 * @param {string} line
 * @param {number} matchEnd
 * @param {string} nextLine
 * @returns {boolean}
 */
function isExemptRoundMarker(letter, digits, suffix, line, matchEnd, nextLine) {
  const token = `${letter}${digits}${suffix}`;
  if (token === 'R2' || token === 'C0') return true;
  if (token === 'R4') {
    const rest = line.slice(matchEnd);
    if (/^\s+(?:re-export|closure)\b/.test(rest)) return true;
    // The exempting word wrapped to the next comment line: nothing but whitespace/comment
    // markers follows on this line, and the next line opens with it.
    return /^[\s/*]*$/.test(rest) && /^\s*(?:\/\/|\*)?\s*(?:re-export|closure)\b/.test(nextLine);
  }
  return false;
}

/**
 * Every 1-based line number in `source` carrying a pass-scoped process reference (rule 5).
 * @param {string} source
 * @returns {number[]}
 */
export function findProcessReferenceLines(source) {
  /** @type {number[]} */
  const hits = [];
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    if (
      PROCESS_REF_LABEL_PATTERNS.some((pattern) => pattern.test(line)) ||
      THIS_PASS_OR_PHASE_PATTERN.test(line) ||
      NAMED_SWEEP_PATTERN.test(line) ||
      (T_MARKER_PATTERN.test(line) && T_MARKER_CONTEXT_PATTERN.test(line))
    ) {
      hits.push(i + 1);
      return;
    }
    ROUND_MARKER_PATTERN.lastIndex = 0;
    let m;
    while ((m = ROUND_MARKER_PATTERN.exec(line))) {
      const nextLine = lines[i + 1] ?? '';
      if (!isExemptRoundMarker(m[1], m[2], m[3], line, m.index + m[0].length, nextLine)) {
        hits.push(i + 1);
        break;
      }
    }
  });
  return hits;
}

// A bare `label.label.tld`-shaped literal over a short, code-safe list of real TLDs (never a
// property-access suffix like `.js`, `.page`, or `.info`, none of which appear here).
const HOSTNAME_SHAPE_PATTERN = /\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:com|org|net|io|dev|app|life|ski|club)\b/g;

// Public standards bodies and vendor APIs cairn's own code and docs legitimately name. Never a
// private consumer hostname; see the header note above for why none is enumerated here instead.
const HOSTNAME_ALLOWED_HOSTS = new Set([
  'w3.org',
  'schema.org',
  'sitemaps.org',
  'jsonfeed.org',
  'purl.org',
  'commoncrawl.org',
  'github.com',
  'github.app',
  'workers.dev',
  'cloudflare.com',
  'anthropic.com',
  'standardschema.dev',
  'example.com',
  'amazon.com',
  'apple.com',
  'claude.com',
  'google.com',
  'openai.com',
  'facebook.com',
]);

/**
 * Every 1-based line number in `source` naming a hostname shape absent from
 * {@link HOSTNAME_ALLOWED_HOSTS} (rule 6).
 * @param {string} source
 * @returns {number[]}
 */
export function findConsumerHostnameLines(source) {
  /** @type {number[]} */
  const hits = [];
  source.split('\n').forEach((line, i) => {
    HOSTNAME_SHAPE_PATTERN.lastIndex = 0;
    let m;
    while ((m = HOSTNAME_SHAPE_PATTERN.exec(line))) {
      if (!HOSTNAME_ALLOWED_HOSTS.has(m[0].toLowerCase())) {
        hits.push(i + 1);
        break;
      }
    }
  });
  return hits;
}

/**
 * @typedef {{
 *   tabs: string[],
 *   exit: string[],
 *   identity: string[],
 *   superpowersPaths: string[],
 *   processReferences: string[],
 *   hostnames: string[],
 * }} IdiomViolations
 */

/**
 * Scan the real tree for all six rules. Exported so the unit test can assert the gate is born
 * green without shelling out.
 * @returns {IdiomViolations}
 */
export function scanIdioms() {
  /** @type {IdiomViolations} */
  const violations = {
    tabs: [],
    exit: [],
    identity: [],
    superpowersPaths: [],
    processReferences: [],
    hostnames: [],
  };

  const tabScopeFiles = [
    ...walk(resolve(ROOT, 'src/lib'), (n) => /\.(ts|svelte)$/.test(n)),
    ...walk(resolve(ROOT, 'scripts'), (n) => /\.(ts|svelte|mjs)$/.test(n)),
  ];
  for (const file of tabScopeFiles) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel.startsWith(FIXTURES_PREFIX)) continue;
    const source = readFileSync(file, 'utf8');
    for (const line of findLeadingTabIndentLines(source)) violations.tabs.push(`${rel}:${line}`);
  }

  const checksFiles = walk(resolve(ROOT, 'scripts/checks'), (n) => n.endsWith('.mjs'));
  for (const file of checksFiles) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel.startsWith(FIXTURES_PREFIX)) continue;
    const source = readFileSync(file, 'utf8');
    for (const line of findProcessExitLines(source)) violations.exit.push(`${rel}:${line}`);
    const variants = selfIdentityVariantsUsed(basename(file, '.mjs'), source);
    if (variants.length > 1) violations.identity.push(`${rel}: mixes ${variants.join(', ')}`);
  }

  const commentScopeFiles = walk(resolve(ROOT, 'src/lib'), (n) => COMMENT_SCOPE_PATTERN.test(n));
  for (const file of commentScopeFiles) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const source = readFileSync(file, 'utf8');
    for (const line of findSuperpowersPathLines(source)) violations.superpowersPaths.push(`${rel}:${line}`);
    for (const line of findProcessReferenceLines(source)) violations.processReferences.push(`${rel}:${line}`);
    for (const line of findConsumerHostnameLines(source)) violations.hostnames.push(`${rel}:${line}`);
  }

  return violations;
}

/**
 * Render every violation as one gate report.
 * @param {IdiomViolations} violations
 * @returns {string}
 */
export function formatViolations(violations) {
  const lines = [];
  if (violations.tabs.length) {
    lines.push(`check-idioms: ${violations.tabs.length} leading-tab indentation hit(s) (repo convention is 2-space):`);
    for (const hit of violations.tabs) lines.push(`  ${hit}`);
  }
  if (violations.exit.length) {
    lines.push(`check-idioms: ${violations.exit.length} direct process.exit call(s) in scripts/checks (use process.exitCode plus a flow guard):`);
    for (const hit of violations.exit) lines.push(`  ${hit}`);
  }
  if (violations.identity.length) {
    lines.push(`check-idioms: ${violations.identity.length} self-identity spelling mismatch(es):`);
    for (const hit of violations.identity) lines.push(`  ${hit}`);
  }
  if (violations.superpowersPaths.length) {
    lines.push(`check-idioms: ${violations.superpowersPaths.length} docs/superpowers/ path reference(s) in src/lib (the npm tarball never ships that directory):`);
    for (const hit of violations.superpowersPaths) lines.push(`  ${hit}`);
  }
  if (violations.processReferences.length) {
    lines.push(`check-idioms: ${violations.processReferences.length} pass-scoped process reference(s) in src/lib (keep the rationale, drop the session label):`);
    for (const hit of violations.processReferences) lines.push(`  ${hit}`);
  }
  if (violations.hostnames.length) {
    lines.push(`check-idioms: ${violations.hostnames.length} unrecognized hostname literal(s) in src/lib (add a real public host to HOSTNAME_ALLOWED_HOSTS, or generalize a consumer-site mention):`);
    for (const hit of violations.hostnames) lines.push(`  ${hit}`);
  }
  return lines.join('\n');
}

function main() {
  const violations = scanIdioms();
  const total =
    violations.tabs.length +
    violations.exit.length +
    violations.identity.length +
    violations.superpowersPaths.length +
    violations.processReferences.length +
    violations.hostnames.length;
  if (total === 0) {
    console.log(
      'check-idioms: OK (2-space indentation, no direct process.exit calls in scripts/checks, one self-identity spelling per gate, no docs/superpowers/ paths, pass-scoped references, or consumer hostnames in src/lib)',
    );
    return;
  }
  console.error(formatViolations(violations));
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
