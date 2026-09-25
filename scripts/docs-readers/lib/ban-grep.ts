/**
 * A mechanical check that a text names no development item: no tuning change, prompt, rubric, or
 * job text should name a page, a defect, or a job fact from the set this instrument is validated
 * against, since a text that leaks one lets whatever reads it solve toward the answer rather than
 * doing the job for real. This module flags a text that names one of `dev-items.json`'s entries
 * by its id, its page, or its subject.
 *
 * The subject rule: a subject and the candidate text are both lowercased, stripped of
 * punctuation, and collapsed to single spaces. A subject of four words or fewer must appear
 * whole, as a substring, in the normalized text (a short subject is usually already a
 * distinctive phrase, and matching only a fragment of it would flag ordinary prose that happens
 * to share a couple of common words). A longer subject is split into every run of four
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

/**
 * Every place one line names a development item: its id as a whole token, its page (the full
 * repository-relative path or the page's own basename) as a substring, or one of its subject
 * phrases in the line's normalized text.
 * @param line - One line of text.
 * @param items - The development items to check the line against.
 * @returns Each item the line names, in item order; a line naming an item more than one way is
 * reported once, on its first match.
 */
function lineHits(line: string, items: DevItem[]): Array<{ itemId: string; term: string }> {
  const normalizedLine = normalize(line);
  const hits: Array<{ itemId: string; term: string }> = [];
  for (const item of items) {
    const idPattern = new RegExp(`\\b${escapeRegExp(item.id)}\\b`);
    if (idPattern.test(line)) {
      hits.push({ itemId: item.id, term: item.id });
      continue;
    }
    const pages = [item.page, ...(item.pages ?? [])];
    const pageTerm = pages.find((page) => line.includes(page) || line.includes(basename(page)));
    if (pageTerm) {
      hits.push({ itemId: item.id, term: pageTerm });
      continue;
    }
    const phrase = subjectPhrases(item.subject).find((p) => normalizedLine.includes(p));
    if (phrase) hits.push({ itemId: item.id, term: phrase });
  }
  return hits;
}

/**
 * Scan text for every place it names a development item.
 * @param text - The text to scan, one or more lines.
 * @param items - The development items to check against.
 * @param file - The path reported on each hit.
 * @returns Every hit, in line order.
 */
export function scanText(text: string, items: DevItem[], file = '<text>'): BanHit[] {
  const hits: BanHit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    for (const hit of lineHits(lines[i], items)) {
      hits.push({ ...hit, file, line: i + 1 });
    }
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
