// cairn-cms: the provenance gate. A published page's brief, at
// docs/internal/briefs/<track>/<page>.json, lists every sentence the page carries, each with the
// fact id it rests on or the literal "no-claim":
//
//   { "page": "docs/extend/choose-an-ai-posture.md",
//     "sentences": [{ "text": "...", "id": "f:7k3q9x" }, { "text": "...", "id": "no-claim" }] }
//
// A sentence's `id` is a fact id, a non-empty array of fact ids (a sentence that synthesizes two
// facts cites both), or "no-claim". A brief may also carry a top-level `cuts` array of
// `{ "id": "f:...", "reason": "..." }`, mirroring the cut dispositions of the page's plan at
// docs/internal/briefs/<track>/<page>.plan.md: a fact the plan leaves off the page, or
// subordinates to a named reference link, is a cut whose reason says which. Each cut needs a fact id
// and a non-empty reason; `cuts` is optional, and a cut id is not resolved against the container.
//
// Run it over every brief with `node scripts/checks/check-provenance.mjs`, or over just the
// briefs a page chain drafted with `node scripts/checks/check-provenance.mjs <brief path>...`
// (each path must exist and sit under docs/internal/briefs/), so one page's gate does not fail
// on a sibling page's in-flight brief. The full run also reads the committed list of rebuilt
// page paths at docs/internal/briefs-rebuilt.json (docs/internal/briefs/README.md) and fails any
// listed path no brief's "page" field names, so a page rebuilt in one stage cannot silently lose
// its brief in a later one; this coverage check does not run in the single-brief mode.
//
// The gate is deny-by-default. A script cannot decide which sentences state facts, but it can
// refuse a page whose author declined to decide, so it fails:
//
// - a sentence with no id, an empty id array, or an id that is neither `f:` plus six base36
//   characters nor "no-claim" (unclassified; "no-claim" is not valid inside an array);
// - a page sentence missing from the brief, and a brief sentence missing from the page (the
//   page's prose, after its front matter, headings, fenced code blocks, images, and HTML
//   comments are set aside, must be exactly the brief's sentences plus markdown punctuation);
// - an id (each id of an array) that resolves to no fact bullet in docs/internal/facts/;
// - a malformed `cuts` entry (not an object, an id that is not a fact id, or a missing reason);
// - a cited bullet tagged [candidate] (any qualifier, `[candidate: excluded, ...]` included),
//   [rejected], or [docs-drift] (citable again once the drift is resolved and retagged);
//   [verified], [external], and [vendor] bullets are citable;
// - a machine-extractable fact in a sentence that none of the sentence's cited bullets contains;
//   a no-claim sentence cites nothing, so any extractable fact in it fails.
//
// The extractor is deterministic regex work over the sentence text. Its classes:
//
// - numerals (`0`, `1,284`, `16k`; compared by their digits, against the bullet's claim only, so
//   a line number in its `Source:` never vouches for one), versions (`0.97.0`, `v1.1.0-rc.1`,
//   also claim only), and ISO dates (`2026-09-23`);
// - paths: any code span holding a slash or a known file extension or starting with a dot, and
//   prose paths that are rooted (`/admin`, `./x`, `~/x`), carry two or more slashes, or end in a
//   known extension; URLs outside link targets;
// - commands: a code span that starts with a known CLI (`cairn`, `npm`, `npx`, `git`,
//   `wrangler`, and the rest in COMMAND_HEADS) plus at least one more word, read up to the first
//   argument that is a flag, a path, a placeholder, or a value; unbackticked `npm`, `npx`,
//   `pnpm`, or `yarn` commands in prose;
// - flags: `--flag` anywhere, in a code span or in prose;
// - names: a code span holding one identifier-shaped token, dotted or hyphenated
//   (`defineConcept`, `locals.cairnEditor`, `AUTH_DB`, `check:facts`, `@glw907/cairn-cms`);
// - owner-tier key phrases: every `Key phrase: "..."` a container bullet carries, matched in the
//   sentence case-insensitively with whitespace collapsed and emphasis dropped.
//
// What it cannot reach, left to the fresh reviewer who reads the brief beside the page:
//
// - whether the sentence says what the bullet says: negation, scope words ("only", "every",
//   "none"), ordering, and causation all pass once the tokens are present, so a joined sentence
//   that contradicts its own bullet with the bullet's own tokens passes here;
// - spelled-out numbers ("two roles", "a handful") and units (`10 MB` and `10 GB` share digits);
// - unbackticked bare filenames (`package.json` in prose), unbackticked `cairn` verbs and other
//   CLIs in prose (the product name reads the same as the command), and short flags (`-m`);
// - code spans holding an expression, a snippet, or a quoted literal (`{ capability: 'none' }`,
//   `'invite'`), beyond any flag or path inside them;
// - markdown link targets (navigation, not a claim; the link text is still checked), image alt
//   text, headings, and fenced code blocks, which the coverage check also sets aside;
// - a product claim that paraphrases the owner brief without any key phrase, and any claim whose
//   only machine-visible token is an ordinary word;
// - a path compared by substring, so a shorter path inside a longer cited one passes.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../repo-root.mjs';
import {
  extractBullets,
  extractFactId,
  extractKeyPhrase,
  checkTag,
  factsFiles,
  normalizePhrase,
  SKIPPED_SECTIONS,
  FACT_ID_RE,
} from './check-facts.mjs';

const ROOT = repoRoot(import.meta.url);
const BRIEFS_DIR = join(ROOT, 'docs/internal/briefs');
const FACTS_DIR = join(ROOT, 'docs/internal/facts');
const REBUILT_LIST_PATH = join(ROOT, 'docs/internal/briefs-rebuilt.json');

/** The literal a sentence carries when it states no fact. */
const NO_CLAIM = 'no-claim';

/** A brief's fact id: the same shape the container's leading id span carries. */
const BRIEF_ID_RE = /^f:[0-9a-z]{6}$/;

/** Tags a brief may not cite, each with the reason the defect gives. */
const UNCITABLE_TAGS = new Map([
  ['candidate', 'a candidate is not citable until it is traced and retagged'],
  ['rejected', 'a rejected claim is not citable'],
  ['docs-drift', 'a docs-drift fact is not citable until the drift is resolved and retagged'],
]);

/** CLIs whose invocation in a code span is read as a command fact. */
const COMMAND_HEADS = new Set([
  'npm', 'npx', 'pnpm', 'yarn', 'bun', 'node', 'tsx', 'vitest', 'cairn', 'create-cairn-site',
  'git', 'gh', 'wrangler', 'curl', 'make', 'go', 'vale',
]);

/** File extensions that make a bare token a path. */
const PATH_EXTENSIONS = 'md|ts|js|mjs|cjs|mts|json|jsonc|toml|svelte|css|ya?ml|sql|go|sh|html|txt';
const PATH_EXTENSION_RE = new RegExp(`\\.(?:${PATH_EXTENSIONS})$`);

const CODE_SPAN_RE = /`([^`]+)`/g;
const LINK_TARGET_RE = /\]\([^)]*\)/g;
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;
const URL_RE = /https?:\/\/[^\s<>)\]`]+/g;
const DATE_RE = /(?<![\w.-])\d{4}-\d{2}-\d{2}(?![\w-])/g;
const VERSION_RE = /(?<![\w.])v?\d+(?:\.\d+)+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?(?![\w]|\.\d)/g;
const NUMERAL_RE = /(?<![\w$.])(\d{1,3}(?:,\d{3})+|\d+)(?:%|[a-zA-Z]{1,3})?(?![\w]|[.,]\d)/g;
const FLAG_RE = /(?<![\w-])--[a-z][\w-]*/g;
const PROSE_COMMAND_RE = /(?<![\w-])(?:npm|npx|pnpm|yarn)\s+(?:run\s+)?[a-z][\w:@-]*/g;
const PROSE_PATH_RE =
  /(?<![\w./@~-])(?:(?:~|\.{1,2})?\/[\w.@[\]-]+(?:\/[\w.@[\]-]*)*|[\w.@-]+(?:\/[\w.@[\]-]*)+)/g;
const NAME_RE = /^@?[A-Za-z_$][\w$:[\]-]*(?:\.[A-Za-z_$][\w$-]*)*$/;
const PACKAGE_NAME_RE = /^@[\w-]+\/[\w.-]+$/;

/**
 * @typedef {'date' | 'version' | 'numeral' | 'path' | 'command' | 'flag' | 'name' | 'key phrase'} FactKind
 * @typedef {{ kind: FactKind, value: string }} ExtractedFact
 */

/**
 * Whether a whole string is exactly one match of a global regex.
 * @param {RegExp} re
 * @param {string} text
 * @returns {boolean}
 */
function fullMatch(re, text) {
  const match = text.match(new RegExp(`^(?:${re.source})$`));
  return match !== null;
}

/**
 * Trailing sentence punctuation dropped from a token matched in prose.
 * @param {string} token
 * @returns {string}
 */
function trimTrailing(token) {
  return token.replace(/[.,;:!?]+$/, '');
}

/**
 * True when a prose token reads as a path: rooted, two or more slashes, or a known extension.
 * @param {string} token
 * @returns {boolean}
 */
function isProsePath(token) {
  if (/^(?:~|\.{1,2})?\//.test(token)) return true;
  if ((token.match(/\//g) ?? []).length >= 2) return true;
  return PATH_EXTENSION_RE.test(token);
}

/**
 * The facts one code span states, in order: a command first, then any flag or path inside it.
 * @param {string} span The span's content, backticks removed.
 * @returns {ExtractedFact[]}
 */
function codeSpanFacts(span) {
  const content = span.trim();
  if (fullMatch(DATE_RE, content)) return [{ kind: 'date', value: content }];
  if (fullMatch(VERSION_RE, content)) return [{ kind: 'version', value: content }];
  if (fullMatch(NUMERAL_RE, content)) return [{ kind: 'numeral', value: content.replace(/\D/g, '') }];
  if (/^--[a-z][\w-]*(?:=\S*)?$/.test(content)) return [{ kind: 'flag', value: content.split('=')[0] }];

  const tokens = content.split(/\s+/);
  if (COMMAND_HEADS.has(tokens[0]) && (tokens.length > 1 || tokens[0] === 'create-cairn-site')) {
    const words = [tokens[0]];
    for (const token of tokens.slice(1)) {
      if (!/^[a-z][\w:@-]*$/.test(token)) break;
      words.push(token);
    }
    /** @type {ExtractedFact[]} */
    const found = [{ kind: 'command', value: words.join(' ') }];
    for (const token of tokens.slice(words.length)) {
      const flag = token.match(/^--[a-z][\w-]*/);
      if (flag) found.push({ kind: 'flag', value: flag[0] });
      else if (!PACKAGE_NAME_RE.test(token) && (token.includes('/') || PATH_EXTENSION_RE.test(token))) {
        found.push({ kind: 'path', value: token });
      }
    }
    return found;
  }

  if (fullMatch(URL_RE, content)) return [{ kind: 'path', value: content }];
  if (PACKAGE_NAME_RE.test(content)) return [{ kind: 'name', value: content }];
  if (!/\s/.test(content) && (content.includes('/') || PATH_EXTENSION_RE.test(content) || /^\.\w/.test(content))) {
    return [{ kind: 'path', value: content }];
  }
  const bare = content.replace(/\(\)$/, '');
  if (NAME_RE.test(bare)) return [{ kind: 'name', value: bare }];
  return [...content.matchAll(FLAG_RE)].map((m) => ({ kind: /** @type {FactKind} */ ('flag'), value: m[0] }));
}

/**
 * Every machine-extractable fact in one sentence: code-span facts in span order, then prose
 * facts by class (paths and URLs, commands, flags, dates, versions, numerals), then owner-tier
 * key phrases. A fact repeated in one sentence is listed once.
 * @param {string} text The sentence as written in the page's markdown.
 * @param {string[]} keyPhrases Every owner-tier key phrase in the container.
 * @returns {ExtractedFact[]}
 */
export function extractFacts(text, keyPhrases) {
  const withoutLinks = text.replace(IMAGE_RE, ' ').replace(LINK_TARGET_RE, ']');
  /** @type {ExtractedFact[]} */
  const found = [];
  for (const m of withoutLinks.matchAll(CODE_SPAN_RE)) found.push(...codeSpanFacts(m[1]));

  let prose = withoutLinks.replace(CODE_SPAN_RE, ' ');
  /**
   * Record each match of `re` in the remaining prose as `kind`, then blank it out so a later,
   * looser class cannot read it again.
   * @param {RegExp} re
   * @param {FactKind} kind
   * @param {(token: string) => string | null} toValue
   */
  const take = (re, kind, toValue) => {
    prose = prose.replace(re, (token, ...groups) => {
      const value = toValue(typeof groups[0] === 'string' ? groups[0] : token);
      if (value === null) return token;
      found.push({ kind, value });
      return ' '.repeat(token.length);
    });
  };
  take(URL_RE, 'path', (t) => trimTrailing(t));
  take(PROSE_PATH_RE, 'path', (t) => (isProsePath(trimTrailing(t)) ? trimTrailing(t) : null));
  take(PROSE_COMMAND_RE, 'command', (t) => t.replace(/\s+/g, ' '));
  take(FLAG_RE, 'flag', (t) => t);
  take(DATE_RE, 'date', (t) => t);
  take(VERSION_RE, 'version', (t) => t);
  take(NUMERAL_RE, 'numeral', (digits) => digits.replace(/,/g, ''));

  const sentence = normalizePhrase(withoutLinks);
  for (const phrase of keyPhrases) {
    if (sentence.includes(normalizePhrase(phrase))) found.push({ kind: 'key phrase', value: phrase });
  }

  const seen = new Set();
  return found.filter((fact) => {
    const key = `${fact.kind}\u0000${fact.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A bullet's claim: its text after the leading id and before `Source:`.
 * @param {string} bulletText
 * @returns {string}
 */
function claimOf(bulletText) {
  const withoutId = bulletText.replace(FACT_ID_RE, '');
  const sourceIdx = withoutId.indexOf('Source:');
  return sourceIdx === -1 ? withoutId : withoutId.slice(0, sourceIdx);
}

/**
 * Whether a cited bullet contains one extracted fact. Numerals and versions are looked for in the
 * claim only, since a `Source:` field is full of line numbers; every other class may sit anywhere
 * in the bullet, its source evidence included.
 * @param {string} bulletText
 * @param {ExtractedFact} fact
 * @returns {boolean}
 */
export function bulletContainsFact(bulletText, fact) {
  const claim = claimOf(bulletText).replace(/(\d),(?=\d{3})/g, '$1');
  const whole = bulletText.replace(/\s+/g, ' ');
  switch (fact.kind) {
    case 'numeral':
      return new RegExp(`(?<![\\w.])${fact.value}(?!\\d|\\.\\d)`).test(claim);
    case 'version': {
      const bare = escapeRegExp(fact.value.replace(/^v/, ''));
      return new RegExp(`(?<![\\w.])v?${bare}(?![\\w-]|\\.\\d)`).test(claim);
    }
    case 'date':
      return whole.includes(fact.value);
    case 'path':
      return whole.includes(fact.value.replace(/\/$/, ''));
    case 'command': {
      const words = fact.value.split(' ').map(escapeRegExp).join('\\s+');
      return new RegExp(`(?<![\\w-])${words}(?![\\w:-])`).test(whole);
    }
    case 'flag':
      return new RegExp(`(?<![\\w-])${escapeRegExp(fact.value)}(?![\\w-])`).test(whole);
    case 'name':
      return new RegExp(`(?<![\\w$-])${escapeRegExp(fact.value)}(?![\\w$-])`).test(whole);
    case 'key phrase':
      return normalizePhrase(bulletText).includes(normalizePhrase(fact.value));
    default:
      return false;
  }
}

/**
 * @typedef {{ id: string, file: string, line: number, text: string, tag: string | null }} IndexedFact
 * @typedef {{ facts: Map<string, IndexedFact>, keyPhrases: string[] }} FactIndex
 */

/**
 * Every fact bullet in a facts directory, keyed by id, with its tag, plus every owner-tier key
 * phrase the container carries. Bullets under `## Harvest record` and `## Provenance` are left
 * out, since they are never facts.
 * @param {string} factsDir
 * @returns {FactIndex}
 */
export function loadFactIndex(factsDir) {
  /** @type {Map<string, IndexedFact>} */
  const facts = new Map();
  /** @type {string[]} */
  const keyPhrases = [];
  for (const file of factsFiles(factsDir)) {
    const bullets = extractBullets(readFileSync(join(factsDir, file), 'utf8'));
    for (const bullet of bullets) {
      if (SKIPPED_SECTIONS.has((bullet.section ?? '').trim().toLowerCase())) continue;
      const id = extractFactId(bullet.text);
      if (!id) continue;
      const tagCheck = checkTag(bullet.text);
      facts.set(id, { id, file, line: bullet.line, text: bullet.text, tag: tagCheck.ok ? tagCheck.tag : null });
      const phrase = extractKeyPhrase(bullet.text);
      if (phrase && !keyPhrases.includes(phrase)) keyPhrases.push(phrase);
    }
  }
  return { facts, keyPhrases };
}

/**
 * @typedef {{ text?: unknown, id?: unknown }} BriefSentence
 */

/**
 * The defects in a brief's top-level `cuts` list, which mirrors a page plan's cut dispositions: an
 * array of `{ id, reason }`, each `id` a fact id (one id, never a list or `no-claim`) and each
 * `reason` a non-empty string. An absent list has no defects. A cut id is not resolved against the
 * container, since a cut fact is by definition not cited.
 * @param {unknown} cuts
 * @returns {string[]}
 */
export function checkCuts(cuts) {
  if (cuts === undefined) return [];
  if (!Array.isArray(cuts)) return ['cuts: not an array of { id, reason } entries'];
  /** @type {string[]} */
  const defects = [];
  cuts.forEach((cut, i) => {
    const label = `cut ${i + 1}`;
    if (typeof cut !== 'object' || cut === null || Array.isArray(cut)) {
      defects.push(`cuts: ${label}: not an object with an "id" and a "reason"`);
      return;
    }
    const { id, reason } = /** @type {{ id?: unknown, reason?: unknown }} */ (cut);
    if (typeof id !== 'string' || !BRIEF_ID_RE.test(id)) {
      defects.push(`cuts: ${label}: "id" is not a fact id (\`f:\` plus six base36 characters)`);
    }
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      defects.push(`cuts: ${label}: missing its "reason"`);
    }
  });
  return defects;
}

/**
 * A short, one-line preview of a sentence for a defect message.
 * @param {string} text
 * @returns {string}
 */
function preview(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 60 ? `${flat.slice(0, 57)}...` : flat;
}

/**
 * The defects in one sentence's citation of one or more fact ids: each id's shape, resolution, and
 * citability, then every extractable fact in the sentence against the cited bullets. A fact passes
 * when at least one cited bullet contains it, so a sentence that synthesizes two facts cites both.
 * @param {string} label The sentence's defect-message prefix.
 * @param {unknown[]} ids The cited ids; a list of one is a single citation.
 * @param {string} text The sentence text.
 * @param {FactIndex} index
 * @returns {string[]}
 */
function checkCitedIds(label, ids, text, index) {
  /** @type {string[]} */
  const defects = [];
  if (ids.length === 0) {
    defects.push(`${label}: unclassified, an empty id list; give it a fact id or "${NO_CLAIM}"`);
    return defects;
  }
  const malformed = ids.filter((id) => typeof id !== 'string' || !BRIEF_ID_RE.test(id));
  for (const id of malformed) {
    defects.push(
      `${label}: ${JSON.stringify(id)} is neither a fact id (\`f:\` plus six base36 characters) nor valid in an id list (\`${NO_CLAIM}\` is not), so the sentence is unclassified`,
    );
  }
  if (malformed.length > 0) return defects;

  const cited = /** @type {string[]} */ (ids).map((id) => ({ id, fact: index.facts.get(id) }));
  /** @type {IndexedFact[]} */
  const resolved = [];
  for (const { id, fact } of cited) {
    if (!fact) {
      defects.push(`${label}: ${id} resolves to no fact in the container`);
      continue;
    }
    resolved.push(fact);
    if (fact.tag === null) {
      defects.push(`${label}: cites ${id} (${fact.file}:${fact.line}), whose status tag does not parse`);
    } else if (UNCITABLE_TAGS.has(fact.tag)) {
      defects.push(`${label}: cites ${id} (${fact.file}:${fact.line}), tagged [${fact.tag}]: ${UNCITABLE_TAGS.get(fact.tag)}`);
    }
  }
  if (resolved.length === 0) return defects;

  const where = resolved.map((fact) => `${fact.id}, ${fact.file}:${fact.line}`).join('; ');
  for (const fact of extractFacts(text, index.keyPhrases)) {
    if (!resolved.some((bullet) => bulletContainsFact(bullet.text, fact))) {
      defects.push(`${label}: the ${fact.kind} "${fact.value}" is in no cited fact (cites ${where})`);
    }
  }
  return defects;
}

/**
 * The defects in a brief's sentences list: classification, id resolution, citability, and every
 * extractable fact against the sentence's own cited bullet. Page coverage is checked separately.
 * @param {BriefSentence[]} sentences
 * @param {FactIndex} index
 * @returns {string[]}
 */
export function checkSentences(sentences, index) {
  /** @type {string[]} */
  const defects = [];
  sentences.forEach((sentence, i) => {
    const text = typeof sentence.text === 'string' ? sentence.text : '';
    const label = `sentence ${i + 1} ("${preview(text)}")`;
    if (text.trim().length === 0) {
      defects.push(`sentence ${i + 1}: missing its text`);
      return;
    }
    const id = sentence.id;
    if (typeof id !== 'string' && !Array.isArray(id)) {
      defects.push(`${label}: unclassified; give it a fact id, a list of fact ids, or "${NO_CLAIM}"`);
      return;
    }
    if (Array.isArray(id)) {
      defects.push(...checkCitedIds(label, id, text, index));
      return;
    }
    if (id !== NO_CLAIM && !BRIEF_ID_RE.test(id)) {
      defects.push(`${label}: "${id}" is neither a fact id (\`f:\` plus six base36 characters) nor "${NO_CLAIM}", so the sentence is unclassified`);
      return;
    }

    const extracted = extractFacts(text, index.keyPhrases);
    if (id === NO_CLAIM) {
      for (const fact of extracted) defects.push(`${label}: marked ${NO_CLAIM} but states the ${fact.kind} "${fact.value}"`);
      return;
    }
    defects.push(...checkCitedIds(label, [id], text, index));
  });
  return defects;
}

/**
 * A page's prose with everything the brief does not classify set aside: YAML front matter,
 * fenced code blocks (indented under a list item too, closed by the same fence run), HTML
 * comments, images, and heading lines. Whitespace is collapsed.
 * @param {string} markdown
 * @returns {string}
 */
function pageProse(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(IMAGE_RE, ' ')
    .replace(/^#{1,6}\s.*$/gm, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * The coverage defects between a page and its brief: a brief sentence the page does not carry,
 * and page text left over once every brief sentence is removed. Leftover markdown punctuation
 * (list markers, table pipes and rules, blockquote marks, emphasis) is not text.
 * @param {string} markdown
 * @param {BriefSentence[]} sentences
 * @returns {string[]}
 */
export function checkPageCoverage(markdown, sentences) {
  /** @type {string[]} */
  const defects = [];
  let prose = pageProse(markdown);
  const texts = sentences
    .map((s) => (typeof s.text === 'string' ? s.text.replace(/\s+/g, ' ').trim() : ''))
    .filter((t) => t.length > 0);
  const longestFirst = [...texts].sort((a, b) => b.length - a.length);
  const missing = new Set();
  for (const text of longestFirst) {
    const at = prose.indexOf(text);
    if (at === -1) missing.add(text);
    else prose = `${prose.slice(0, at)}\u0000${prose.slice(at + text.length)}`;
  }
  for (const text of texts) {
    if (missing.has(text)) defects.push(`"${preview(text)}" is not on the page`);
  }
  for (const fragment of prose.split('\u0000')) {
    const residue = fragment.replace(/(^|\s)\d+[.)](?=\s|$)/g, ' ').replace(/[-*+>|#_~`:[\]()\s]/g, '');
    if (!/[A-Za-z0-9]/.test(residue)) continue;
    const shown = fragment.replace(/^[\s\-*+>|#]+|[\s\-*+>|#]+$/g, '');
    defects.push(`unclassified page text: "${preview(shown)}"`);
  }
  return defects;
}

/**
 * Every brief file under a briefs directory: `*.json` at any depth. A missing directory holds
 * none.
 * @param {string} briefsDir
 * @returns {string[]}
 */
export function findBriefs(briefsDir) {
  if (!existsSync(briefsDir)) return [];
  /** @type {string[]} */
  const found = [];
  /** @param {string} dir */
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.json')) found.push(full);
    }
  };
  walk(briefsDir);
  return found;
}

/**
 * One CLI brief-path argument, resolved to an absolute path. A relative argument resolves
 * against `root`, so it reads the same whether it names a file from the repository root or from
 * wherever the argument itself was already absolute.
 * @param {string} arg
 * @param {string} root
 * @returns {string}
 */
function resolveBriefArg(arg, root) {
  return isAbsolute(arg) ? arg : resolve(root, arg);
}

/**
 * The brief paths a CLI argument list names, each checked to exist and to sit under `briefsDir`.
 * A bad argument becomes one defect and stops that argument from reaching the brief list; a good
 * argument resolves to its absolute path.
 * @param {string[]} args
 * @param {string} briefsDir
 * @param {string} root
 * @returns {{ briefs: string[], defects: string[] }}
 */
function resolveBriefArgs(args, briefsDir, root) {
  /** @type {string[]} */
  const briefs = [];
  /** @type {string[]} */
  const defects = [];
  for (const arg of args) {
    const full = resolveBriefArg(arg, root);
    if (!existsSync(full) || !statSync(full).isFile()) {
      defects.push(`${arg}: does not exist`);
      continue;
    }
    const rel = relative(briefsDir, full);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      defects.push(`${arg}: is not under docs/internal/briefs/`);
      continue;
    }
    briefs.push(full);
  }
  return { briefs, defects };
}

/**
 * @typedef {{ defects: string[], sentences: number, cited: number, noClaim: number }} BriefResult
 */

/**
 * Check one brief file: its JSON shape, that it is filed under its page's own name, that the
 * page exists, its sentences, and the page's coverage.
 * @param {string} briefPath
 * @param {FactIndex} index
 * @param {string} root The directory a brief's `page` path is relative to.
 * @returns {BriefResult}
 */
export function checkBrief(briefPath, index, root) {
  /** @type {BriefResult} */
  const result = { defects: [], sentences: 0, cited: 0, noClaim: 0 };
  /** @type {unknown} */
  let brief;
  try {
    brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  } catch (error) {
    result.defects.push(`not valid JSON (${error instanceof Error ? error.message : String(error)})`);
    return result;
  }
  if (typeof brief !== 'object' || brief === null) {
    result.defects.push('not a JSON object');
    return result;
  }
  const { page, sentences, cuts } = /** @type {{ page?: unknown, sentences?: unknown, cuts?: unknown }} */ (brief);
  if (typeof page !== 'string') {
    result.defects.push('missing a "page" path');
    return result;
  }
  if (!Array.isArray(sentences)) {
    result.defects.push('missing a "sentences" array');
    return result;
  }
  /** @type {BriefSentence[]} */
  const list = sentences.map((s) => (typeof s === 'object' && s !== null ? s : {}));
  result.sentences = list.length;
  result.cited = list.filter(
    (s) => Array.isArray(s.id) || (typeof s.id === 'string' && BRIEF_ID_RE.test(s.id)),
  ).length;
  result.noClaim = list.filter((s) => s.id === NO_CLAIM).length;

  if (basename(briefPath, '.json') !== basename(page, '.md')) {
    result.defects.push(`names page "${page}", but a brief is filed under its page's own name`);
  }
  const pagePath = join(root, page);
  const pageExists = existsSync(pagePath);
  if (!pageExists) result.defects.push(`page "${page}" does not exist`);

  result.defects.push(...checkSentences(list, index));
  result.defects.push(...checkCuts(cuts));
  if (pageExists) result.defects.push(...checkPageCoverage(readFileSync(pagePath, 'utf8'), list));
  return result;
}

/**
 * @typedef {{ list: string[], defects: string[] }} RebuiltListResult
 */

/**
 * The committed list of page paths a stage has rebuilt, read, parsed, and validated. The list
 * itself is invalid, with an empty `list` returned alongside the one defect naming why, when it
 * is absent, not valid JSON, or not a JSON array; a valid list still fails one entry at a time
 * when an entry is not a string or sits outside `docs/`, and that entry alone is dropped.
 * @param {string} listPath
 * @param {string} root The directory `listPath`'s own message is reported relative to.
 * @returns {RebuiltListResult}
 */
export function loadRebuiltList(listPath, root) {
  const rel = relative(root, listPath);
  if (!existsSync(listPath)) {
    return { list: [], defects: [`${rel}: does not exist (see docs/internal/briefs/README.md)`] };
  }
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(listPath, 'utf8'));
  } catch (error) {
    return { list: [], defects: [`${rel}: not valid JSON (${error instanceof Error ? error.message : String(error)})`] };
  }
  if (!Array.isArray(parsed)) {
    return { list: [], defects: [`${rel}: not a JSON array`] };
  }
  /** @type {string[]} */
  const list = [];
  /** @type {string[]} */
  const defects = [];
  parsed.forEach((entry, i) => {
    // Normalized first, so a literal "docs/../outside.md" (which the un-normalized string itself
    // starts with "docs/") cannot pass the prefix test on the strength of a prefix it does not
    // actually keep. The bare "docs" (the directory, not a page) is rejected outright: every real
    // entry names a file under it.
    const normalized = typeof entry === 'string' ? posix.normalize(entry) : null;
    if (normalized === null || normalized === 'docs' || !normalized.startsWith('docs/')) {
      defects.push(`${rel}: entry ${i} (${JSON.stringify(entry)}) is not a path under docs/`);
      return;
    }
    list.push(normalized);
  });
  return { list, defects };
}

/**
 * Every distinct `page` field a set of brief files names, skipping a brief that fails to parse
 * (checkBrief reports that defect on its own).
 * @param {string[]} briefs Absolute brief paths.
 * @returns {Set<string>}
 */
function pagesNamedByBriefs(briefs) {
  /** @type {Set<string>} */
  const pages = new Set();
  for (const briefPath of briefs) {
    try {
      const parsed = /** @type {{ page?: unknown }} */ (JSON.parse(readFileSync(briefPath, 'utf8')));
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.page === 'string') pages.add(parsed.page);
    } catch {
      // A brief that is not valid JSON is reported by checkBrief; coverage skips it here.
    }
  }
  return pages;
}

/**
 * The defects between the rebuilt-page list and the briefs that actually exist: a listed page
 * whose file no longer exists is a stale list entry, reported as such rather than as a missing
 * brief; a listed page whose file still exists but no brief's `page` field names (matched by
 * that field, never a brief's file name) is a coverage gap.
 * @param {string[]} list Every path the rebuilt list carries.
 * @param {string[]} briefs Every brief path already found under the briefs directory.
 * @param {string} root The directory a listed page path is relative to.
 * @returns {string[]}
 */
export function checkBriefCoverage(list, briefs, root) {
  const pages = pagesNamedByBriefs(briefs);
  /** @type {string[]} */
  const defects = [];
  for (const page of list) {
    if (!existsSync(join(root, page))) {
      defects.push(`docs/internal/briefs-rebuilt.json lists "${page}" as rebuilt, but that page no longer exists: a stale list entry`);
    } else if (!pages.has(page)) {
      defects.push(`docs/internal/briefs-rebuilt.json lists "${page}" as rebuilt, but no brief names it in its "page" field`);
    }
  }
  return defects;
}

/**
 * Run the provenance check: either every brief under `briefsDir` against the container in
 * `factsDir` (the default), or, when `briefArgs` names any paths, exactly those briefs, each
 * checked to exist and to sit under `briefsDir`. Pages resolve from `root`. With no brief to
 * check, it passes and says so.
 *
 * The default (no `briefArgs`) run also checks brief coverage: it reads the committed rebuilt-
 * page list at `rebuiltListPath` and fails any listed path no brief covers, before it decides
 * whether any brief exists at all, so an empty briefs directory does not hide a coverage gap.
 * The single-brief mode skips coverage entirely, since it exists to check one in-flight brief in
 * isolation.
 * @param {string} briefsDir
 * @param {string} factsDir
 * @param {string} root
 * @param {string[]} [briefArgs] CLI-style brief paths, absolute or relative to `root`. Omitted
 * or empty runs every brief under `briefsDir` and checks coverage.
 * @param {string} [rebuiltListPath] The committed rebuilt-page list. Required whenever
 * `briefArgs` is omitted or empty; unused otherwise.
 * @returns {{ defects: string[], report: string[] }}
 */
export function checkProvenance(briefsDir, factsDir, root, briefArgs, rebuiltListPath) {
  /** @type {string[]} */
  let briefs;
  const briefArgsGiven = Boolean(briefArgs && briefArgs.length > 0);
  if (briefArgsGiven) {
    const resolved = resolveBriefArgs(/** @type {string[]} */ (briefArgs), briefsDir, root);
    if (resolved.defects.length > 0) return { defects: resolved.defects, report: [] };
    briefs = resolved.briefs;
  } else {
    briefs = findBriefs(briefsDir);
  }

  /** @type {string[]} */
  const defects = [];
  /** @type {string[]} */
  const report = [];
  if (!briefArgsGiven) {
    if (!rebuiltListPath) {
      // Default mode always needs the rebuilt-page list to check coverage against; a caller that
      // omits it would otherwise reach loadRebuiltList's `relative(root, listPath)` with
      // `listPath` undefined and throw a TypeError instead of failing the gate.
      defects.push('checkProvenance: rebuiltListPath is required in default mode (no brief paths given)');
    } else {
      const { list, defects: listDefects } = loadRebuiltList(rebuiltListPath, root);
      defects.push(...listDefects, ...checkBriefCoverage(list, briefs, root));
      report.push(
        list.length === 0
          ? '  nothing is rebuilt yet'
          : `  ${list.length} page(s) marked rebuilt in docs/internal/briefs-rebuilt.json`,
      );
    }
  }

  if (briefs.length === 0) {
    report.push('  no page has a brief yet');
    return { defects, report };
  }
  const index = loadFactIndex(factsDir);
  for (const briefPath of briefs) {
    const rel = relative(root, briefPath);
    const result = checkBrief(briefPath, index, root);
    for (const defect of result.defects) defects.push(`${rel}: ${defect}`);
    report.push(`  ${rel}: ${result.sentences} sentences (cited ${result.cited}, no-claim ${result.noClaim})`);
  }
  return { defects, report };
}

function main() {
  const { defects, report } = checkProvenance(BRIEFS_DIR, FACTS_DIR, ROOT, process.argv.slice(2), REBUILT_LIST_PATH);
  if (defects.length === 0) {
    console.log('check-provenance: OK');
    console.log(report.join('\n'));
    return;
  }
  console.error(`check-provenance: ${defects.length} defect(s)\n`);
  for (const defect of defects) console.error(`  ${defect}`);
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
