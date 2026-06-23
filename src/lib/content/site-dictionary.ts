// cairn-cms: the git-committed per-site personal dictionary (spec 1.6). One word per line,
// sorted, with comment lines (starting with #) and blank lines tolerated on read. This module is
// pure: it parses the committed file text, inserts words in sorted order, and serializes the
// canonical form. The insert is order-independent, so the action's commit-and-retry can re-merge
// the pending additions at a new head and reach the same sorted set regardless of insertion order.
//
// The canonical serialization keeps a single leading header comment and one sorted word per line.
// An inbound file's other comment lines are dropped on serialize (the header is regenerated), so the
// committed file stays a clean, diffable, sorted word list; a maintainer who wants a richer comment
// edits it in git, and the next add through here normalizes it back to the header.

/** The header comment the canonical serialization writes above the sorted words. */
const HEADER = '# cairn personal dictionary: one word per line, sorted, kept in git.';

// A dictionary word: a single line carrying no whitespace and no ASCII control characters, so it can
// never inject an extra line into the committed file. Hyphens and apostrophes are allowed, since real
// words carry them ("well-known", "O'Brien"); a non-ASCII surname or place name validates too, since
// the test is for whitespace and control bytes rather than an allow-list of letters. The action runs
// inbound words through this before a merge.
const WORD_RE = /^[^\s\p{Cc}]+$/u;

/**
 * True when a word is a single valid dictionary line (no whitespace, no control characters, non-empty
 *  and within the length bound). A leading "#" is rejected: parseDictionary re-reads such a line as a
 *  comment, so committing it would silently drop the word on the next read. The action uses this to
 *  reject untrusted input before the merge, so a newline or a control byte can never inject an extra
 *  line into the committed file.
 */
export function isValidDictionaryWord(word: string, maxLength = 64): boolean {
  if (word.startsWith('#')) return false;
  return word.length > 0 && word.length <= maxLength && WORD_RE.test(word);
}

/**
 * Parse the committed dictionary file text into its word list. Comment lines (a `#` after optional
 * leading whitespace) and blank lines are dropped; every other line is trimmed and kept. A null or
 * empty file yields an empty list. The result preserves the file's order and is not deduplicated or
 * sorted here, so a caller can see exactly what the file held; `mergeDictionaryWords` is the path that
 * normalizes to the sorted, deduplicated set.
 */
export function parseDictionary(text: string | null): string[] {
  if (!text) return [];
  const words: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    words.push(trimmed);
  }
  return words;
}

/**
 * Case-insensitive, locale-stable comparator for the canonical sort. Words are compared lowercased
 *  so "Cairn" and "cairn" collapse to one entry, the same case-folding the Worker's merged set uses.
 */
function byWord(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

/**
 * Merge `additions` into the `existing` word list, returning the canonical sorted, deduplicated set.
 * The merge is case-insensitive (a duplicate add of an existing word, in any case, collapses) and
 * order-independent: the inputs are unioned by lowercased key and sorted, so re-merging the same
 * additions at a moved head produces the same set. The first-seen casing of each word wins, so an
 * existing "Cairn" is kept over a later "cairn". Invalid additions (whitespace, control characters,
 * empty) are skipped here as a backstop; the action validates before this is reached.
 */
export function mergeDictionaryWords(existing: readonly string[], additions: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const word of [...existing, ...additions]) {
    if (!isValidDictionaryWord(word)) continue;
    const key = word.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, word);
  }
  return [...byKey.values()].sort(byWord);
}

/**
 * Serialize a word list to the canonical committed file text: the header comment, then one word per
 * line sorted case-insensitively, with a trailing newline. The input is run through the same dedup
 * and sort as the merge, so serializing an unsorted or duplicate-bearing list still yields the
 * canonical form. An empty word list serializes to just the header (so the file stays a valid,
 * recognizable dictionary rather than vanishing).
 */
export function serializeDictionary(words: readonly string[]): string {
  const sorted = mergeDictionaryWords(words, []);
  return [HEADER, ...sorted].join('\n') + '\n';
}
