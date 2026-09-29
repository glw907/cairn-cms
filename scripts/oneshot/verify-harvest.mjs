// cairn-cms: the one-shot verifier for the draft-docs harvest. Before the old narrative pages are
// deleted, every one of them must be proven harvested: each page has a claim ledger, and every
// claim in it is a fact in the container, a fact filed for it, or a recorded cut. This script reads
// the ledgers under docs/internal/record/harvest/ and fails on any page whose proof is missing,
// stale, or unresolvable. The rules and the ledger schema live in that directory's README.md and
// in docs/superpowers/specs/2026-09-29-draft-docs-harvest-design.md ("The verifier").
//
// It is a record, never a standing gate: its subject (the deleted pages) leaves the tree, and the
// list-versus-tree check fails by design afterward. Its unit test runs on fixtures only, through
// the `root` option, so the test never reads the real tree and outlives the pages.
//
// Usage: node scripts/oneshot/verify-harvest.mjs [--arm <admin|editors|extend|front-door>]
//   [--pages <path,...>] [--root <dir>]
//
// The blob is the page's git blob SHA, computed here from the blob format (`blob <bytes>\0` plus the
// content, SHA-1) rather than by spawning `git hash-object`, so it needs no repository and no git
// binary; the unit test proves the two agree.
//
// Fact bullets are parsed with check-facts.mjs's own extractor, tag checker, and id reader, so the
// verifier and `check:facts` can never disagree about what a bullet is.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import { extractBullets, extractFactId, checkTag, factsFiles, SKIPPED_SECTIONS } from '../checks/check-facts.mjs';

/** The four harvest arms, in report order. */
export const ARMS = ['admin', 'editors', 'extend', 'front-door'];

/** The fixed cut-reason list; anything else on a `cut` disposition fails. */
export const CUT_REASONS = ['navigation', 'marketing', 'stance-without-owner-basis', 'illustrative', 'external-trivia'];

/** The tags a resolved fact may carry: the ones that never re-open a claim. */
const ALLOWED_TAGS = ['verified', 'external', 'vendor', 'rejected'];

/** A ledger paraphrases in at most this many words, so it never carries a copied sentence. */
const MAX_PARAPHRASE_WORDS = 25;

const RECORD_DIR = 'docs/internal/record/harvest';
const LIST_FILE = `${RECORD_DIR}/deletion-list.json`;
const FACTS_DIR = 'docs/internal/facts';
const ARM_DOC_DIRS = { admin: 'docs/admin', editors: 'docs/editors', extend: 'docs/extend' };
const FRONT_DOOR_PAGES = ['docs/why-cairn.md', 'docs/README.md'];

/**
 * The git blob SHA of some bytes, identical to `git hash-object` on a file with that content.
 * @param {Buffer} content
 * @returns {string}
 */
export function gitBlobSha(content) {
  return createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
}

/**
 * The arm a repo-relative page path belongs to, or null when it is in none.
 * @param {string} page
 * @returns {string | null}
 */
function armOf(page) {
  if (FRONT_DOOR_PAGES.includes(page)) return 'front-door';
  for (const [arm, dir] of Object.entries(ARM_DOC_DIRS)) {
    if (page.startsWith(`${dir}/`) && page.endsWith('.md')) return arm;
  }
  return null;
}

/**
 * The ledger path, relative to the record directory, that a page's ledger must live at:
 * `<arm>/<path inside the arm, extension swapped for .json>`.
 * @param {string} page
 * @returns {string | null}
 */
function ledgerPathFor(page) {
  const arm = armOf(page);
  if (!arm) return null;
  const inside = arm === 'front-door' ? page.slice('docs/'.length) : page.slice(ARM_DOC_DIRS[/** @type {'admin'} */ (arm)].length + 1);
  return `${arm}/${inside.replace(/\.md$/, '.json')}`;
}

/**
 * Every file path under `dir` (recursive) whose name passes `keep`, as forward-slash paths
 * relative to `base`.
 * @param {string} base
 * @param {string} dir
 * @param {(name: string) => boolean} keep
 * @returns {string[]}
 */
function walkRelative(base, dir, keep) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkRelative(base, full, keep));
    else if (keep(name)) out.push(full.slice(base.length + 1).split('\\').join('/'));
  }
  return out;
}

/**
 * Every page the deletion list is compared against: each `.md` under the three arm directories
 * plus the two front-door files, whichever exist.
 * @param {string} root
 * @returns {string[]}
 */
function treePages(root) {
  const pages = Object.values(ARM_DOC_DIRS).flatMap((dir) => walkRelative(root, join(root, dir), (n) => n.endsWith('.md')));
  for (const page of FRONT_DOOR_PAGES) if (existsSync(join(root, page))) pages.push(page);
  return pages.sort();
}

/**
 * @typedef {{ deleted: string[], kept: string[] }} DeletionList
 */

/**
 * Read and shape-check `deletion-list.json`, or record why it cannot be used. A missing record
 * directory, a missing or unparseable list, and a list of the wrong shape each end the run early,
 * since every later rule reads the list.
 * @param {string} root
 * @param {string[]} failures
 * @returns {DeletionList | null}
 */
function loadDeletionList(root, failures) {
  if (!existsSync(join(root, RECORD_DIR))) {
    failures.push(`record directory ${RECORD_DIR} is absent`);
    return null;
  }
  if (!existsSync(join(root, LIST_FILE))) {
    failures.push(`${LIST_FILE} is absent`);
    return null;
  }
  /** @type {any} */
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(root, LIST_FILE), 'utf8'));
  } catch (error) {
    failures.push(`${LIST_FILE} is not valid JSON: ${/** @type {Error} */ (error).message}`);
    return null;
  }
  const isPathList = (/** @type {unknown} */ v) => Array.isArray(v) && v.every((p) => typeof p === 'string');
  if (!parsed || !isPathList(parsed.deleted) || !isPathList(parsed.kept)) {
    failures.push(`${LIST_FILE} must hold "deleted" and "kept", each an array of repo-relative page paths`);
    return null;
  }
  const { deleted, kept } = /** @type {DeletionList} */ (parsed);
  for (const page of deleted) {
    if (!armOf(page)) failures.push(`${LIST_FILE}: deleted page ${page} is in no arm (admin, editors, extend, or the two front-door files)`);
  }
  for (const page of new Set([...deleted, ...kept].filter((p, i, all) => all.indexOf(p) !== i))) {
    failures.push(`${LIST_FILE}: ${page} appears more than once`);
  }
  return { deleted, kept };
}

/**
 * Compare the list to the tree: every page on the tree is on exactly one list, and every listed
 * page exists.
 * @param {string} root
 * @param {DeletionList} list
 * @param {string[]} failures
 */
function checkListAgainstTree(root, list, failures) {
  const tree = new Set(treePages(root));
  const deleted = new Set(list.deleted);
  const kept = new Set(list.kept);
  for (const page of list.deleted) {
    if (kept.has(page)) failures.push(`${LIST_FILE}: ${page} is on both lists`);
    if (!tree.has(page)) failures.push(`${LIST_FILE}: deleted page ${page}: no such page on the tree`);
  }
  for (const page of list.kept) {
    if (!tree.has(page)) failures.push(`${LIST_FILE}: kept page ${page}: no such page on the tree`);
  }
  for (const page of tree) {
    if (!deleted.has(page) && !kept.has(page)) failures.push(`${LIST_FILE}: ${page} is on the tree but on neither list`);
  }
}

/**
 * @typedef {{ id: string, file: string, line: number, section: string | null, text: string,
 *   tag: string | null }} FactRecord
 */

/**
 * Every fact bullet in the container under `root`, by id, plus the bullets outside the exempt
 * sections in file order. A duplicate id keeps its first bullet; `check:facts` owns that defect.
 * @param {string} root
 * @param {string[]} failures
 * @returns {{ byId: Map<string, FactRecord>, all: FactRecord[] }}
 */
function loadFacts(root, failures) {
  /** @type {Map<string, FactRecord>} */
  const byId = new Map();
  /** @type {FactRecord[]} */
  const all = [];
  const dir = join(root, FACTS_DIR);
  if (!existsSync(dir)) {
    failures.push(`facts directory ${FACTS_DIR} is absent`);
    return { byId, all };
  }
  for (const name of factsFiles(dir)) {
    const file = `${FACTS_DIR}/${name}`;
    for (const bullet of extractBullets(readFileSync(join(dir, name), 'utf8'))) {
      if (SKIPPED_SECTIONS.has((bullet.section ?? '').trim().toLowerCase())) continue;
      const id = extractFactId(bullet.text);
      if (!id) continue;
      const tagCheck = checkTag(bullet.text);
      /** @type {FactRecord} */
      const record = { id, file, line: bullet.line, section: bullet.section, text: bullet.text, tag: tagCheck.ok ? tagCheck.tag : null };
      all.push(record);
      if (!byId.has(id)) byId.set(id, record);
    }
  }
  return { byId, all };
}

/**
 * The text of a bullet's `Source:` field with its trailing status tag removed, so a tag's
 * qualifier text (which may say "describes the deleted page ...") is never read as a citation.
 * @param {string} text
 * @returns {string | null}
 */
function sourceField(text) {
  const at = text.indexOf('Source:');
  if (at === -1) return null;
  return text.slice(at).replace(/\[(?:verified|docs-drift|external|vendor|candidate|rejected)\b[^\]]*\]\s*$/, '');
}

/**
 * True when `text` names `page` as a whole path, not as the tail of a longer path.
 * @param {string} text
 * @param {string} page
 * @returns {boolean}
 */
function namesPage(text, page) {
  const escaped = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w./-])${escaped}(?![\\w-])`).test(text);
}

/**
 * The 0-based indexes of the lines that need no claim: front matter, when the page opens with it.
 * @param {string[]} lines
 * @returns {number} The index of the last front-matter line, or -1 when there is none.
 */
function frontMatterEnd(lines) {
  if (lines[0]?.trim() !== '---') return -1;
  for (let i = 1; i < lines.length; i++) if (lines[i].trim() === '---') return i;
  return -1;
}

/**
 * The uncovered non-blank line ranges of a page, as `[start, end]` 1-based pairs. Consecutive
 * uncovered lines separated only by blank lines are one range, so a two-line paragraph reports
 * once.
 * @param {string[]} lines
 * @param {Set<number>} covered 1-based line numbers inside some claim's span.
 * @returns {Array<[number, number]>}
 */
function uncoveredRanges(lines, covered) {
  const fmEnd = frontMatterEnd(lines);
  /** @type {number[]} */
  const missing = [];
  for (let i = fmEnd + 1; i < lines.length; i++) {
    if (lines[i].trim().length > 0 && !covered.has(i + 1)) missing.push(i + 1);
  }
  /** @type {Array<[number, number]>} */
  const ranges = [];
  for (const n of missing) {
    const last = ranges[ranges.length - 1];
    const gapIsBlank = last && lines.slice(last[1], n - 1).every((l) => l.trim().length === 0);
    if (last && gapIsBlank) last[1] = n;
    else ranges.push([n, n]);
  }
  return ranges;
}

/**
 * @typedef {{ pages: number, claims: number, factsReused: number, factsFiled: number,
 *   cuts: Record<string, number> }} ArmCounts
 */

/**
 * Check one parsed ledger's content against its page and the container, appending each failure
 * and folding the ledger's claims into `counts`.
 * @param {string} ledgerFile Root-relative ledger path, for messages.
 * @param {any} ledger
 * @param {string} root
 * @param {Map<string, FactRecord>} facts
 * @param {ArmCounts} counts
 * @param {string[]} failures
 */
function checkLedgerContent(ledgerFile, ledger, root, facts, counts, failures) {
  const fail = (/** @type {string} */ msg) => failures.push(`${ledgerFile}: ${msg}`);
  counts.pages++;

  const pageFile = join(root, ledger.page);
  /** @type {string[] | null} */
  let pageLines = null;
  if (!existsSync(pageFile)) {
    fail(`page ${ledger.page} does not exist, so its blob and spans cannot be checked`);
  } else {
    const bytes = readFileSync(pageFile);
    const actual = gitBlobSha(bytes);
    if (typeof ledger.blob !== 'string') fail('blob is missing (the page\'s `git hash-object` when audited)');
    else if (ledger.blob !== actual) fail(`blob is stale: the ledger says ${ledger.blob}, ${ledger.page} is now ${actual} (the page was edited after its audit)`);
    pageLines = new TextDecoder().decode(bytes).split('\n');
  }

  if (!Array.isArray(ledger.claims) || ledger.claims.length === 0) {
    fail('claims is empty (a ledger records every claim on its page)');
    return;
  }

  /** @type {Set<number>} */
  const covered = new Set();
  ledger.claims.forEach((/** @type {any} */ claim, /** @type {number} */ index) => {
    const at = `claims[${index}]`;
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
      fail(`${at} is not an object`);
      return;
    }
    counts.claims++;

    const { lines } = claim;
    const spanOk =
      Array.isArray(lines) && lines.length === 2 && Number.isInteger(lines[0]) && Number.isInteger(lines[1]) && lines[0] >= 1 && lines[0] <= lines[1] && (pageLines === null || lines[1] <= pageLines.length);
    if (!spanOk) fail(`${at} lines must be [start, end], 1-based, start <= end, inside the page (got ${JSON.stringify(lines)})`);
    else for (let n = lines[0]; n <= lines[1]; n++) covered.add(n);

    if (typeof claim.paraphrase !== 'string' || claim.paraphrase.trim().length === 0) {
      fail(`${at} paraphrase is missing`);
    } else if (claim.paraphrase.trim().split(/\s+/).length > MAX_PARAPHRASE_WORDS) {
      fail(`${at} paraphrase is longer than ${MAX_PARAPHRASE_WORDS} words (paraphrase the claim, never copy a sentence)`);
    }

    const dispositions = ['fact', 'new-fact', 'cut'].filter((key) => key in claim);
    if (dispositions.length === 0) {
      fail(`${at} has no disposition (fact, new-fact, or cut)`);
      return;
    }
    if (dispositions.length > 1) {
      fail(`${at} has more than one disposition (${dispositions.join(', ')}); a claim takes exactly one`);
      return;
    }
    const [kind] = dispositions;
    const value = claim[kind];
    if (kind === 'cut') {
      if (typeof value === 'string' && CUT_REASONS.includes(value)) counts.cuts[value] = (counts.cuts[value] ?? 0) + 1;
      else fail(`${at} has unknown cut reason ${JSON.stringify(value)} (allowed: ${CUT_REASONS.join(', ')})`);
      return;
    }
    if (kind === 'fact') counts.factsReused++;
    else counts.factsFiled++;
    const fact = typeof value === 'string' ? facts.get(value) : undefined;
    if (!fact) {
      fail(`${at} ${kind} ${JSON.stringify(value)} does not resolve to a bullet in ${FACTS_DIR}/`);
    } else if (fact.tag === null) {
      fail(`${at} ${kind} ${value} resolves to ${fact.file}:${fact.line}, whose status tag is not valid (run check:facts)`);
    } else if (!ALLOWED_TAGS.includes(fact.tag)) {
      fail(`${at} ${kind} ${value} resolves to a [${fact.tag}] bullet (${fact.file}:${fact.line}); a harvested claim needs [${ALLOWED_TAGS.join('], [')}]`);
    }
  });

  if (pageLines) {
    for (const [start, end] of uncoveredRanges(pageLines, covered)) {
      fail(`uncovered lines ${start === end ? start : `${start}-${end}`} of ${ledger.page}: no claim spans them`);
    }
  }
}

/**
 * Whether a facts section heading belongs to a page: the heading is the page path, optionally
 * followed by an annotation after a space.
 * @param {string | null} section
 * @param {string} page
 * @returns {boolean}
 */
function sectionIsPage(section, page) {
  const heading = (section ?? '').trim();
  return heading === page || heading.startsWith(`${page} `);
}

/**
 * Verify the harvest ledgers under `root`.
 *
 * With neither `arm` nor `pages` it checks every page on the deletion list and every bullet in the
 * container. A scoped run narrows the per-page content rules and the `Source:` rule to the scoped
 * pages, but never the structural ones: a missing ledger in scope, a `--pages` path off the list,
 * an unparseable or mislocated ledger anywhere, and the list-versus-tree comparison always fail.
 * @param {{ root?: string, arm?: string, pages?: string[] }} [options] `root` defaults to this repository.
 * @returns {{ failures: string[], counts: Record<string, ArmCounts>, scope: string[] }}
 */
export function verifyHarvest(options = {}) {
  const root = options.root ?? repoRoot(import.meta.url);
  /** @type {string[]} */
  const failures = [];
  /** @type {Record<string, ArmCounts>} */
  const counts = {};

  const list = loadDeletionList(root, failures);
  if (!list) return { failures, counts, scope: [] };
  checkListAgainstTree(root, list, failures);

  // Scope: the deletion-list pages this run answers for.
  const scoped = options.arm !== undefined || (options.pages?.length ?? 0) > 0;
  /** @type {string[]} */
  let scope = list.deleted;
  if (options.arm !== undefined && !ARMS.includes(options.arm)) {
    failures.push(`unknown arm "${options.arm}" (allowed: ${ARMS.join(', ')})`);
    scope = [];
  } else if (options.arm !== undefined) {
    scope = list.deleted.filter((page) => armOf(page) === options.arm);
  }
  if ((options.pages?.length ?? 0) > 0) {
    /** @type {string[]} */
    const named = [];
    for (const raw of /** @type {string[]} */ (options.pages)) {
      const page = raw.replace(/^\.\//, '');
      if (!list.deleted.includes(page)) failures.push(`--pages path ${page} is not on the deletion list`);
      else if (options.arm !== undefined && armOf(page) !== options.arm) failures.push(`--pages path ${page} is not in arm "${options.arm}"`);
      else named.push(page);
    }
    scope = named;
  }
  const inScope = new Set(scope);

  // Discover every ledger file, whatever the scope, so a stray one is never silently ignored.
  const recordAbs = join(root, RECORD_DIR);
  /** @type {string[]} */
  const ledgerFiles = [];
  for (const entry of readdirSync(recordAbs).sort()) {
    if (!statSync(join(recordAbs, entry)).isDirectory()) continue;
    const files = walkRelative(root, join(recordAbs, entry), (n) => n.endsWith('.json'));
    if (ARMS.includes(entry)) ledgerFiles.push(...files);
    else for (const file of files) failures.push(`${file}: ledger outside the arm directories (${ARMS.join(', ')})`);
  }

  const facts = loadFacts(root, failures);
  /** @type {Map<string, string[]>} */
  const ledgersByPage = new Map();
  /** @type {Array<{ file: string, ledger: any }>} */
  const parsed = [];
  for (const file of ledgerFiles) {
    /** @type {any} */
    let ledger;
    try {
      ledger = JSON.parse(readFileSync(join(root, file), 'utf8'));
    } catch (error) {
      failures.push(`${file}: is not valid JSON: ${/** @type {Error} */ (error).message}`);
      continue;
    }
    if (!ledger || typeof ledger !== 'object' || typeof ledger.page !== 'string') {
      failures.push(`${file}: page is missing (the repo-relative path of the audited page)`);
      continue;
    }
    const expectedRel = ledgerPathFor(ledger.page);
    const actualRel = file.slice(RECORD_DIR.length + 1);
    if (expectedRel !== actualRel) {
      failures.push(`${file}: page ${ledger.page} does not match its location (a ledger for that page lives at ${expectedRel ?? 'no valid path: the page is in no arm'})`);
    }
    if (!list.deleted.includes(ledger.page)) {
      const why = list.kept.includes(ledger.page) ? 'a kept-set page is never audited' : 'no ledger may name one';
      failures.push(`${file}: page ${ledger.page} is not on the deletion list (${why})`);
    }
    const seen = ledgersByPage.get(ledger.page) ?? [];
    seen.push(file);
    ledgersByPage.set(ledger.page, seen);
    parsed.push({ file, ledger });
  }
  for (const [page, files] of ledgersByPage) {
    if (files.length > 1) failures.push(`${files[0]}: more than one ledger for page ${page}: ${files.join(', ')}`);
  }

  // A missing ledger in scope, at the one location the page's ledger must live.
  for (const page of scope) {
    const rel = `${RECORD_DIR}/${ledgerPathFor(page)}`;
    if (!existsSync(join(root, rel))) failures.push(`${rel}: missing ledger for ${page}`);
  }

  // Content rules over the ledgers whose page is in scope.
  for (const arm of ARMS) {
    if (!scoped || scope.some((page) => armOf(page) === arm)) counts[arm] = { pages: 0, claims: 0, factsReused: 0, factsFiled: 0, cuts: {} };
  }
  for (const { file, ledger } of parsed) {
    if (!inScope.has(ledger.page)) continue;
    const arm = /** @type {string} */ (armOf(ledger.page));
    checkLedgerContent(file, ledger, root, facts.byId, counts[arm], failures);
  }

  // No bullet cites a deletion-list page: the whole container unscoped, otherwise only the
  // sections of the scoped pages.
  for (const fact of facts.all) {
    if (scoped && !scope.some((page) => sectionIsPage(fact.section, page))) continue;
    const source = sourceField(fact.text);
    if (source === null) continue;
    for (const page of list.deleted) {
      if (namesPage(source, page)) failures.push(`${fact.file}:${fact.line}: bullet ${fact.id} Source names deletion-list page ${page}; re-source it to code, a vendor, or the owner brief`);
    }
  }

  return { failures, counts, scope };
}

/**
 * The run's report: on failure a count and one line per failure, on success `OK` and each arm's
 * counts. Both go to one string; the caller picks the stream.
 * @param {{ failures: string[], counts: Record<string, ArmCounts> }} result
 * @returns {string}
 */
export function formatReport(result) {
  if (result.failures.length > 0) {
    return [`verify-harvest: ${result.failures.length} failure(s)`, '', ...result.failures.map((f) => `  ${f}`)].join('\n');
  }
  const lines = ['verify-harvest: OK'];
  for (const [arm, c] of Object.entries(result.counts)) {
    const cuts = Object.entries(c.cuts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([reason, n]) => `${reason} ${n}`)
      .join(', ');
    lines.push(`  ${arm}: ${c.pages} pages, ${c.claims} claims, ${c.factsReused} facts reused, ${c.factsFiled} facts filed, cuts: ${cuts || 'none'}`);
  }
  return lines.join('\n');
}

/**
 * Parse the command line. An unknown flag or a flag without its value is a usage error.
 * @param {string[]} argv
 * @returns {{ options: { root?: string, arm?: string, pages?: string[] }, error: string | null }}
 */
function parseArgs(argv) {
  /** @type {{ root?: string, arm?: string, pages?: string[] }} */
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag !== '--root' && flag !== '--arm' && flag !== '--pages') return { options, error: `unknown option ${flag}` };
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) return { options, error: `${flag} needs a value` };
    if (flag === '--root') options.root = resolve(value);
    else if (flag === '--arm') options.arm = value;
    else options.pages = value.split(',').filter(Boolean);
  }
  return { options, error: null };
}

function main() {
  const { options, error } = parseArgs(process.argv.slice(2));
  if (error) {
    console.error(`verify-harvest: ${error}\nusage: node scripts/oneshot/verify-harvest.mjs [--arm <admin|editors|extend|front-door>] [--pages <path,...>] [--root <dir>]`);
    process.exitCode = 2;
    return;
  }
  const result = verifyHarvest(options);
  if (result.failures.length === 0) {
    console.log(formatReport(result));
    return;
  }
  console.error(formatReport(result));
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
