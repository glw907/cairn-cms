// The crest prints a club's initials, so a long name gives a short mark that reads at the size of
// a header shield. Small joining words carry no meaning in a mark ("TGS", never "TTGS"), so they
// drop out unless the name is nothing but them.

const MAX_INITIALS = 3;
const SKIPPED = new Set(['the', 'of', 'and', 'a']);

/**
 * The crest's initials for `siteName`: the first letter of each word that starts with a letter,
 * uppercased, at most three. The words "the", "of", "and", and "a" are skipped unless that leaves
 * none. A name with no word that starts with a letter gives an empty string.
 */
export function crestInitials(siteName: string): string {
  const words = siteName.split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  const kept = words.filter((word) => !SKIPPED.has(word.toLowerCase()));
  const chosen = kept.length > 0 ? kept : words;
  return chosen
    .slice(0, MAX_INITIALS)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase();
}
