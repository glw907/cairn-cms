// cairn-cms: the transcript gate for the recorded-run blocks the admin docs quote (the marker
// convention in docs/superpowers/plans/2026-08-16-capture-pass.md). A page marks a quoted
// transcript with `<!-- transcript: <fixture path> -->` immediately before a fenced block; this
// gate resolves that marker against the named fixture under
// packages/create-cairn-site/test/fixtures/transcripts/, replays both the block and the fixture
// through the same pty-control-stream renderer, and fails on any mismatch, malformed marker, or
// fixture the corpus neither quotes nor declares deliberately unconsumed. It also enforces two
// per-page floors (a page cannot claim recorded proof with zero or one lightweight block) and
// bans shell-tagged marked fences, since `check:symbols` runs CLI-flag extraction on those and a
// fixture can never be edited to satisfy it. What this gate does not check: prose correctness, or
// whether a page's surrounding narrative matches what its block shows. Nor does it audit the
// README's deliberately-unconsumed list, which is an author's declaration this gate takes at its
// word; naming a fixture there is how a run's unquoted captures stay committed and accounted for.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// The four published arms plus the front-door index, the same corpus check-visuals.mjs scans.
// docs/superpowers and docs/internal discuss the marker convention in prose and would
// false-positive if scanned as though they carried real marked blocks.
const SCAN_DIRS = ['docs/admin', 'docs/editors', 'docs/extend', 'docs/reference'];
const INDEX_FILES = ['docs/README.md'];

const SKIP_DIRS = new Set(['__snapshots__', 'snapshots']);

const FIXTURES_ROOT_REL = 'packages/create-cairn-site/test/fixtures/transcripts';

// The per-page minimum block count. Per-page, not global: a single well-stocked page cannot
// cover for another page carrying no recorded proof at all.
const PAGE_FLOORS = {
  'docs/admin/create-your-site.md': 3,
  'docs/admin/is-it-working.md': 1,
};

const MARKER_RE = /^<!-- transcript: (.+) -->$/;
const FENCE_OPEN_RE = /^```([\w-]*)$/;

// A CSI sequence's final byte, which terminates the parameter run and names the operation.
const CSI_FINAL_BYTE_RE = /[\x40-\x7e]/;

// The fixtures README section under which an author declares a capture deliberately unquoted.
const UNCONSUMED_HEADING = '## Deliberately unconsumed';

/** @param {string} p */
function toPosix(p) {
  return p.split(sep).join('/');
}

/**
 * Every `.md` file under `dir`, recursively, skipping SKIP_DIRS. Empty when `dir` does not
 * exist, so a temp-directory root built with only some of the scanned arms is not an error.
 * @param {string} dir
 * @returns {string[]}
 */
function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/**
 * Every `.txt` fixture under `dir`, recursively, as paths relative to `dir` in posix form.
 * Empty when `dir` does not exist.
 * @param {string} dir
 * @returns {string[]}
 */
function walkFixtures(dir) {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const nested = walkFixtures(join(dir, entry.name));
      out.push(...nested.map((p) => `${entry.name}/${p}`));
    } else if (entry.name.endsWith('.txt')) {
      out.push(entry.name);
    }
  }
  return out;
}

/**
 * The backticked `*.txt` names listed under the fixtures README's "## Deliberately unconsumed"
 * section. Empty when the README or the section is absent, since a missing section declares
 * nothing excused rather than erroring.
 * @param {string} fixturesRootAbs
 */
function readUnconsumedList(fixturesRootAbs) {
  const readmePath = join(fixturesRootAbs, 'README.md');
  if (!existsSync(readmePath)) return new Set();
  const text = readFileSync(readmePath, 'utf8');
  const headingIdx = text.indexOf(UNCONSUMED_HEADING);
  if (headingIdx === -1) return new Set();
  const rest = text.slice(headingIdx + UNCONSUMED_HEADING.length);
  const nextHeadingIdx = rest.search(/\n## /);
  const section = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  // Only the name a list item OPENS with declares that fixture unconsumed; a `.txt` name
  // mentioned later in the same bullet's prose (as `01c-resume.txt`'s does, describing what
  // superseded it) is context, not its own declaration.
  const names = new Set();
  for (const m of section.matchAll(/^-\s*`([\w.-]+\.txt)`/gm)) names.add(m[1]);
  return names;
}

/**
 * `body` split on elision lines (a line that is exactly `[...]` after trimming) into ordered,
 * non-empty segments; a segment that is blank throughout (including one produced by two
 * consecutive elisions) is dropped rather than carried forward as an empty comparison target.
 * @param {string} body
 * @returns {string[]}
 */
export function splitSegments(body) {
  const lines = body.split('\n');
  const segments = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '[...]') {
      segments.push(current.join('\n'));
      current = [];
    } else {
      current.push(line);
    }
  }
  segments.push(current.join('\n'));
  return segments.filter((segment) => segment.trim() !== '');
}

/**
 * The index in `haystack` where `needle` starts as a contiguous, order-preserving run, searched
 * from `fromIndex` onward. `-1` when no such run exists at or after `fromIndex`.
 * @param {string[]} haystack
 * @param {string[]} needle
 * @param {number} fromIndex
 */
export function findConsecutiveRun(haystack, needle, fromIndex) {
  if (needle.length === 0) return fromIndex;
  outer: for (let start = fromIndex; start <= haystack.length - needle.length; start++) {
    for (let i = 0; i < needle.length; i++) {
      if (haystack[start + i] !== needle[i]) continue outer;
    }
    return start;
  }
  return -1;
}

/**
 * `raw` replayed as a pty control stream into its final displayed frame: a cursor moves over a
 * line buffer under `\r`, `\n`, backspace, and the CSI cursor-motion and erase sequences a clack
 * prompt's per-keystroke redraw emits, so an intermediate frame a redraw overwrites never
 * survives into the result the way a bare SGR/CSI strip would let it. SGR (`m`), cursor
 * show/hide, OSC sequences, and charset-designation escapes are recognized and discarded rather
 * than misread as printable content. Every line of the final frame is right-trimmed and the
 * frame is returned as those lines joined by `\n`.
 * @param {string} raw
 */
export function renderTranscript(raw) {
  const chars = Array.from(raw);
  /** @type {string[][]} */
  const lines = [[]];
  let row = 0;
  let col = 0;

  /** @param {number} r */
  function ensureRow(r) {
    while (lines.length <= r) lines.push([]);
  }

  /** @param {string} ch */
  function putChar(ch) {
    ensureRow(row);
    const line = lines[row];
    while (line.length < col) line.push(' ');
    line[col] = ch;
    col++;
  }

  /** @param {number} mode */
  function eraseInLine(mode) {
    ensureRow(row);
    const line = lines[row];
    if (mode === 1) {
      for (let i = 0; i <= col && i < line.length; i++) line[i] = ' ';
    } else if (mode === 2) {
      line.length = 0;
    } else {
      line.length = Math.min(line.length, col);
    }
  }

  /** @param {number} mode */
  function eraseInDisplay(mode) {
    if (mode === 2) {
      for (const line of lines) line.length = 0;
    } else {
      eraseInLine(0);
      lines.length = row + 1;
    }
  }

  /**
   * @param {string} paramStr
   * @param {string} final
   */
  function applyCsi(paramStr, final) {
    // A private-mode `?` prefix changes which modes the final byte names, never how the
    // parameters parse, and every private sequence in this corpus (`?25h`/`?25l`) is a no-op here.
    const body = paramStr.startsWith('?') ? paramStr.slice(1) : paramStr;
    const nums = body.split(';').filter((s) => s !== '').map(Number);
    /**
     * @param {number} idx
     * @param {number} fallback
     */
    const n = (idx, fallback) => (Number.isFinite(nums[idx]) ? nums[idx] : fallback);
    switch (final) {
      case 'G':
        col = Math.max(0, n(0, 1) - 1);
        break;
      case 'H':
      case 'f':
        row = Math.max(0, n(0, 1) - 1);
        col = Math.max(0, n(1, 1) - 1);
        break;
      case 'A':
        row = Math.max(0, row - n(0, 1));
        break;
      case 'B':
        row += n(0, 1);
        break;
      case 'C':
        col += n(0, 1);
        break;
      case 'D':
        col = Math.max(0, col - n(0, 1));
        break;
      case 'K':
        eraseInLine(n(0, 0));
        break;
      case 'J':
        eraseInDisplay(n(0, 0));
        break;
      default:
        // SGR (m), cursor show/hide (?25h/?25l), and any other CSI final byte carry no
        // effect on the final rendered frame this gate compares.
        break;
    }
  }

  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    // An escape opens a multi-character sequence whose own scan decides where `i` lands, so it
    // is handled ahead of the single-character controls below, which all advance by one.
    if (ch === '\x1b') {
      const next = chars[i + 1];
      if (next === '[') {
        let j = i + 2;
        let params = '';
        while (j < chars.length && !CSI_FINAL_BYTE_RE.test(chars[j])) {
          params += chars[j];
          j++;
        }
        const final = chars[j];
        j++;
        if (final !== undefined) applyCsi(params, final);
        i = j;
        continue;
      }
      if (next === ']') {
        // OSC: consume through BEL or ST (ESC \).
        let j = i + 2;
        while (j < chars.length) {
          if (chars[j] === '\x07') {
            j++;
            break;
          }
          if (chars[j] === '\x1b' && chars[j + 1] === '\\') {
            j += 2;
            break;
          }
          j++;
        }
        i = j;
        continue;
      }
      if (next === '(' || next === ')') {
        // Charset designation: ESC, the designator, and one charset code byte.
        i += 3;
        continue;
      }
      // Any other single-character escape.
      i += 2;
      continue;
    }
    switch (ch) {
      case '\x00':
      case '\x07':
        // NUL padding and BEL are not printable content.
        break;
      case '\r':
        col = 0;
        break;
      case '\n':
        row++;
        col = 0;
        break;
      case '\b':
        col = Math.max(0, col - 1);
        break;
      default:
        putChar(ch);
    }
    i++;
  }

  return lines.map((line) => line.join('').replace(/[ \t]+$/, '')).join('\n');
}

/**
 * Every marker-plus-fence block in `text`, and the marker-shape violations found along the way
 * (`orphan-marker`, `double-marker`, `bad-fence-tag`). A block's `body` is the fence's raw
 * interior, unrendered; `markerPath` is the marker's own (unresolved) fixture path.
 * @param {string} file Repo-relative path, carried only to label a violation.
 * @param {string} text
 */
export function parseMarkedBlocks(file, text) {
  const lines = text.split('\n');
  const violations = [];
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const markerMatch = lines[i].trim().match(MARKER_RE);
    if (!markerMatch) {
      i++;
      continue;
    }
    const markerPath = markerMatch[1].trim();
    const markerLineNo = i + 1;

    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') k++;

    if (k >= lines.length) {
      violations.push({
        file,
        kind: 'orphan-marker',
        message: `${file}:${markerLineNo}: transcript marker for ${markerPath} is not followed by a fenced block`,
      });
      i++;
      continue;
    }

    const nextMarkerMatch = lines[k].trim().match(MARKER_RE);
    if (nextMarkerMatch) {
      violations.push({
        file,
        kind: 'double-marker',
        message: `${file}:${markerLineNo}: two transcript markers precede one fence (${markerPath} and ${nextMarkerMatch[1].trim()})`,
      });
      i = k;
      continue;
    }

    const fenceMatch = lines[k].trimEnd().match(FENCE_OPEN_RE);
    if (!fenceMatch) {
      violations.push({
        file,
        kind: 'orphan-marker',
        message: `${file}:${markerLineNo}: transcript marker for ${markerPath} is not immediately followed by a fenced block`,
      });
      i++;
      continue;
    }

    const tag = fenceMatch[1];
    let j = k + 1;
    while (j < lines.length && lines[j].trimEnd() !== '```') j++;
    const body = lines.slice(k + 1, j).join('\n');

    if (tag !== '' && tag !== 'text') {
      violations.push({
        file,
        kind: 'bad-fence-tag',
        message: `${file}:${markerLineNo}: transcript fence for ${markerPath} is tagged \`${tag}\`, must be untagged or \`text\``,
      });
    }

    blocks.push({ file, markerPath, markerLineNo, tag, body });
    i = j + 1;
  }
  return { blocks, violations };
}

/**
 * The full corpus scan: every marker-shape, path-resolution, content, floor, and citation
 * violation, plus how many pages and blocks were checked. `root` is injectable so the unit
 * suite can drive one failure mode at a time against a small temp-directory tree.
 * @param {string} root
 */
export function scanTree(root = ROOT) {
  const fixturesRootAbs = resolve(root, FIXTURES_ROOT_REL);
  const pageFiles = [
    ...SCAN_DIRS.flatMap((dir) => walkMarkdown(join(root, dir))),
    ...INDEX_FILES.map((f) => join(root, f)).filter((f) => existsSync(f)),
  ];

  const violations = [];
  const cited = new Set();
  const blockCounts = new Map();
  let blocksChecked = 0;

  for (const abs of pageFiles) {
    const file = relative(root, abs);
    const text = readFileSync(abs, 'utf8');
    const { blocks, violations: parseViolations } = parseMarkedBlocks(file, text);
    violations.push(...parseViolations);
    blockCounts.set(file, (blockCounts.get(file) ?? 0) + blocks.length);

    for (const block of blocks) {
      const absFixture = resolve(root, block.markerPath);
      const relFixture = relative(fixturesRootAbs, absFixture);
      if (relFixture.startsWith('..') || isAbsolute(relFixture)) {
        violations.push({
          file,
          kind: 'marker-escapes-fixtures-dir',
          message: `${file}:${block.markerLineNo}: transcript marker path ${block.markerPath} resolves outside the fixtures directory`,
        });
        continue;
      }
      if (!existsSync(absFixture)) {
        violations.push({
          file,
          kind: 'fixture-missing',
          message: `${file}:${block.markerLineNo}: transcript fixture ${block.markerPath} does not exist`,
        });
        continue;
      }

      cited.add(toPosix(relFixture));
      blocksChecked++;

      const fixtureLines = renderTranscript(readFileSync(absFixture, 'utf8')).split('\n');
      const segments = splitSegments(block.body);
      let cursor = 0;
      for (const segment of segments) {
        const segmentLines = renderTranscript(segment).split('\n');
        const idx = findConsecutiveRun(fixtureLines, segmentLines, cursor);
        if (idx === -1) {
          violations.push({
            file,
            kind: 'content-mismatch',
            message: `${file}:${block.markerLineNo}: transcript block does not match ${block.markerPath} in order`,
          });
          break;
        }
        cursor = idx + segmentLines.length;
      }
    }
  }

  for (const [page, floor] of Object.entries(PAGE_FLOORS)) {
    const count = blockCounts.get(page) ?? 0;
    if (count < floor) {
      violations.push({
        file: page,
        kind: 'page-below-floor',
        message: `${page}: carries ${count} transcript block(s), the floor for this page is ${floor}`,
      });
    }
  }

  if (existsSync(fixturesRootAbs)) {
    const unconsumed = readUnconsumedList(fixturesRootAbs);
    for (const fx of walkFixtures(fixturesRootAbs)) {
      if (cited.has(fx) || unconsumed.has(fx)) continue;
      const relFile = toPosix(join(FIXTURES_ROOT_REL, fx));
      violations.push({
        file: relFile,
        kind: 'fixture-uncited',
        message: `${relFile}: fixture is quoted by no transcript block and is not listed in the README's Deliberately unconsumed section`,
      });
    }
  }

  return { pagesScanned: pageFiles.length, blocksChecked, violations };
}

function main() {
  const { pagesScanned, blocksChecked, violations } = scanTree();
  console.log(`check-transcripts: scanned ${pagesScanned} page(s), checked ${blocksChecked} transcript block(s)`);
  if (violations.length === 0) {
    console.log('check-transcripts: OK');
    return;
  }
  console.error(`check-transcripts: ${violations.length} violation(s)`);
  for (const v of violations) console.error(`  [${v.kind}] ${v.message}`);
  process.exitCode = 1;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
