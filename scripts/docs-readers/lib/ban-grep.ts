/**
 * A mechanical check that a text names no development item: no tuning change, prompt, rubric, or
 * job text should name a page, a defect, or a job fact from the set this instrument is validated
 * against, since a text that leaks one lets whatever reads it solve toward the answer rather than
 * doing the job for real. This module flags a text that names one of `dev-items.json`'s entries
 * by its id, its page, or its subject.
 *
 * The id rule: an item's id must appear as a whole token on some line, checked line by line.
 *
 * The page rule, also checked line by line: a line naming an item's page, its basename, or its
 * basename without a `.md` extension (the slug a bullet or a title often uses instead of the
 * full filename) counts as naming the item, compared case-insensitively, since a page name can
 * be written in either case in prose.
 *
 * The subject rule: the whole candidate text is normalized once, lowercased, stripped of
 * punctuation, and joined across line breaks into a single collapsed-whitespace string, so a
 * subject a source hard-wraps across two or more lines still matches; an offset map back to
 * source lines lets a match report the line its own text starts on. A subject of four words or
 * fewer must appear whole, as a substring, in the normalized text (a short subject is usually
 * already a distinctive phrase, and matching only a fragment of it would flag ordinary prose that
 * happens to share a couple of common words). A longer subject is split into every run of four
 * consecutive words it contains, and the text is flagged when any one such run appears in it: a
 * four-word run is long enough to be a restatement of the subject rather than a coincidence, and
 * checking every run (not just the whole subject) still catches a sentence that only restates
 * part of it.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

/** One development-set item, as `dev-items.json` lists it. */
export interface DevItem {
  id: string;
  subject: string;
  page: string;
  /** Set only for an item whose subject spans more than one page. */
  pages?: string[];
}

/** One place a text names a development item. */
export interface BanHit {
  itemId: string;
  term: string;
  file: string;
  line: number;
}

/** How many consecutive subject words make one matchable phrase. */
const PHRASE_WORDS = 4;

/**
 * Escape a string's regex metacharacters, so it can be embedded in a pattern literally.
 * @param text - Any string.
 * @returns The string with every regex metacharacter escaped.
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lowercase a string, drop everything but letters, digits, and whitespace, and collapse
 * whitespace runs to single spaces.
 * @param text - Any string.
 * @returns The normalized text.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The phrases a subject is matched by: itself, whole, when it is short; every run of
 * `PHRASE_WORDS` consecutive words it contains, otherwise.
 * @param subject - A development item's one-line subject.
 * @returns The normalized phrases that count as naming this subject.
 */
function subjectPhrases(subject: string): string[] {
  const words = normalize(subject).split(' ').filter((w) => w.length > 0);
  if (words.length === 0) return [];
  if (words.length <= PHRASE_WORDS) return [words.join(' ')];
  const phrases: string[] = [];
  for (let i = 0; i + PHRASE_WORDS <= words.length; i += 1) {
    phrases.push(words.slice(i, i + PHRASE_WORDS).join(' '));
  }
  return phrases;
}

/** One source line's own run of characters inside a whole-text normalized string. */
interface LineSegment {
  /** This line's first character's index into the normalized string. */
  start: number;
  /** The 1-based source line this segment came from. */
  line: number;
}

/** A text normalized as one collapsed-whitespace string, plus the map back to source lines. */
interface NormalizedText {
  normalized: string;
  segments: LineSegment[];
}

/**
 * Normalize an entire text to one string, joining every non-blank line's own normalized form with
 * a single space, so a phrase a source hard-wraps across two or more lines still appears as one
 * contiguous run; `segments` records where each source line's own characters begin in the result.
 * @param text - The full text to normalize.
 * @returns The normalized text and its line segments, in source order.
 */
function normalizeWithLines(text: string): NormalizedText {
  const segments: LineSegment[] = [];
  let normalized = '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const lineNormalized = normalize(lines[i]);
    if (lineNormalized === '') continue;
    if (normalized !== '') normalized += ' ';
    segments.push({ start: normalized.length, line: i + 1 });
    normalized += lineNormalized;
  }
  return { normalized, segments };
}

/**
 * The source line a normalized-text offset came from.
 * @param segments - The ascending line segments `normalizeWithLines` recorded.
 * @param offset - An index into the normalized text.
 * @returns The line of the segment that offset falls in.
 */
function lineAtOffset(segments: LineSegment[], offset: number): number {
  let line = segments[0]?.line ?? 1;
  for (const segment of segments) {
    if (segment.start > offset) break;
    line = segment.line;
  }
  return line;
}

/**
 * The strings that count as naming a page: its full repository-relative path, its basename, and
 * its basename without a `.md` extension (the slug a bullet or a title often names it by), each
 * lowercased for a case-insensitive comparison.
 * @param page - A development item's page path.
 * @returns The lowercased terms a lowercased line is checked against.
 */
function pageTerms(page: string): string[] {
  const base = basename(page);
  const stem = base.replace(/\.md$/i, '');
  return [...new Set([page, base, stem])].map((term) => term.toLowerCase());
}

/**
 * Every place one line names a development item by its id (a whole token) or its page (its full
 * path, its basename, or its basename's stem, compared case-insensitively).
 * @param line - One line of text.
 * @param items - The development items to check the line against.
 * @returns Each item the line names this way, in item order; an item named by both its id and its
 * page on the same line is reported once, on its first match.
 */
function lineHits(line: string, items: DevItem[]): Array<Pick<BanHit, 'itemId' | 'term'>> {
  const lowerLine = line.toLowerCase();
  const hits: Array<Pick<BanHit, 'itemId' | 'term'>> = [];
  for (const item of items) {
    const idPattern = new RegExp(`\\b${escapeRegExp(item.id)}\\b`);
    if (idPattern.test(line)) {
      hits.push({ itemId: item.id, term: item.id });
      continue;
    }
    const pages = [item.page, ...(item.pages ?? [])];
    const pageTerm = pages.find((page) => pageTerms(page).some((term) => lowerLine.includes(term)));
    if (pageTerm) hits.push({ itemId: item.id, term: pageTerm });
  }
  return hits;
}

/**
 * Every place the whole text names a development item's subject, searched in one
 * whole-text-normalized pass so a hard-wrapped subject cannot escape a per-line check.
 * @param normalizedText - `text` normalized once, with the line segments to resolve a match's
 * start offset back to a source line.
 * @param items - The development items to check against.
 * @returns Each item whose subject the text restates, on the line its match starts on.
 */
function subjectHits(normalizedText: NormalizedText, items: DevItem[]): Array<{ itemId: string; term: string; line: number }> {
  const hits: Array<{ itemId: string; term: string; line: number }> = [];
  for (const item of items) {
    for (const phrase of subjectPhrases(item.subject)) {
      const at = normalizedText.normalized.indexOf(phrase);
      if (at === -1) continue;
      hits.push({ itemId: item.id, term: phrase, line: lineAtOffset(normalizedText.segments, at) });
      break;
    }
  }
  return hits;
}

/**
 * Scan text for every place it names a development item.
 * @param text - The text to scan, one or more lines.
 * @param items - The development items to check against.
 * @param file - The path reported on each hit.
 * @returns Every hit: every line's id and page hits, in line order, then every subject hit.
 */
export function scanText(text: string, items: DevItem[], file = '<text>'): BanHit[] {
  const hits: BanHit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    for (const hit of lineHits(lines[i], items)) {
      hits.push({ ...hit, file, line: i + 1 });
    }
  }
  for (const hit of subjectHits(normalizeWithLines(text), items)) {
    hits.push({ ...hit, file });
  }
  return hits;
}

/**
 * Load `dev-items.json`.
 * @param path - The file's path.
 * @returns The parsed development items.
 */
export function loadDevItems(path: string): DevItem[] {
  return JSON.parse(readFileSync(path, 'utf8')) as DevItem[];
}

/**
 * Scan one file on disk for every place it names a development item.
 * @param path - The file to scan.
 * @param items - The development items to check against.
 * @returns Every hit, in line order.
 */
export function scanFile(path: string, items: DevItem[]): BanHit[] {
  return scanText(readFileSync(path, 'utf8'), items, path);
}
