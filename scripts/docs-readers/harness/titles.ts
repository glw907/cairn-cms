/**
 * Checking a docs/admin page's own condition titles against a condition registry (the shape of
 * `tool/internal/spine/conditions.json`). A page pairs a short title with a condition id in its
 * jump-list items (a backtick title, a dash, a link, then a backtick condition id); this module
 * first learns every such pairing from a page's own jump-list items, never from prose, then flags
 * every occurrence of a mapped title anywhere on the page, prose included, whose text does not
 * match that id's own `title` field. The caller passes only the ids some report actually prints by
 * title; a title paired only with an id outside that set (a condition only `cairn health` prints,
 * or one no command checks yet) teaches this check nothing, so it never false-fails on a claim no
 * report exists to check.
 */

/** One condition from `tool/internal/spine/conditions.json`. */
export interface Condition {
  id: string;
  title: string;
}

/** One title mismatch the check found. */
export interface TitleFinding {
  /** The page's path, relative to the docs root. */
  page: string;
  /** The 1-based line the title text sits on. */
  line: number;
  /** The title text the page uses. */
  pageTitle: string;
  /** The condition id the page pairs this title with. */
  conditionId: string;
  /** The condition's own `title`, from the registry. */
  registryTitle: string;
}

/** A backtick-quoted condition id, `word.word` with optional hyphenated segments. */
const ID_SPAN = /`([a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*)+)`/g;

/** A backtick-quoted title-shaped span: starts with a capital letter, no dot (an id never lacks one, a title never has one). */
const TITLE_SPAN = /`([A-Z][A-Za-z0-9 /(),'-]*[A-Za-z0-9)/])`/g;

/**
 * Every backtick-quoted span on a line, classified as a condition id (present in `known`) or a
 * title candidate, in the order they appear.
 * @param line - One line of page text.
 * @param known - The ids the registry defines.
 * @returns The spans found, tagged by kind.
 */
function spansOnLine(line: string, known: Set<string>): Array<{ kind: 'id' | 'title'; text: string }> {
  const spans: Array<{ kind: 'id' | 'title'; text: string; index: number }> = [];
  for (const match of line.matchAll(ID_SPAN)) {
    if (known.has(match[1])) spans.push({ kind: 'id', text: match[1], index: match.index ?? 0 });
  }
  for (const match of line.matchAll(TITLE_SPAN)) {
    spans.push({ kind: 'title', text: match[1], index: match.index ?? 0 });
  }
  return spans.sort((a, b) => a.index - b.index).map(({ kind, text }) => ({ kind, text }));
}

/**
 * Group a page's lines into jump-list items: a line starting with `- ` opens an item, and every
 * following indented, non-blank line joins it, stopping at a blank line, a line with no leading
 * whitespace, or the next `- ` line. A prose paragraph, which starts at neither, joins no item, so
 * a pairing is never learned from it.
 * @param lines - The page's lines.
 * @returns Each item's own lines joined into one string, in document order.
 */
function jumpListItems(lines: string[]): string[] {
  const items: string[] = [];
  let current: string[] | undefined;
  for (const line of lines) {
    if (/^-\s/.test(line)) {
      if (current) items.push(current.join('\n'));
      current = [line];
    } else if (current && /^\s+\S/.test(line)) {
      current.push(line);
    } else {
      if (current) items.push(current.join('\n'));
      current = undefined;
    }
  }
  if (current) items.push(current.join('\n'));
  return items;
}

/**
 * Learn every title-to-id pairing a page's own jump-list items establish, never from a prose
 * paragraph: within one item, every title span before its own em dash pairs with every known id
 * span anywhere in the item. An item naming several titles before several ids (the "Auth store
 * (D1)" triple) pairs them positionally when the counts match, and pairs every title with every id
 * otherwise; an item whose ids are all outside the registry this call was given (a condition no
 * report this check covers prints) teaches no pairing at all.
 * @param lines - The page's lines.
 * @param known - The ids `checkTitles` was given.
 * @returns A map from title text to the ids it is ever paired with.
 */
function learnPairings(lines: string[], known: Set<string>): Map<string, Set<string>> {
  const pairings = new Map<string, Set<string>>();
  const add = (title: string, id: string) => {
    if (!pairings.has(title)) pairings.set(title, new Set());
    pairings.get(title)?.add(id);
  };
  for (const item of jumpListItems(lines)) {
    const dashIndex = item.indexOf('—');
    const head = dashIndex === -1 ? item : item.slice(0, dashIndex);
    const titles = [...head.matchAll(TITLE_SPAN)].map((m) => m[1]);
    const ids = [...item.matchAll(ID_SPAN)].map((m) => m[1]).filter((id) => known.has(id));
    if (titles.length === 0 || ids.length === 0) continue;
    if (titles.length === ids.length) {
      ids.forEach((id, i) => add(titles[i], id));
    } else {
      for (const title of titles) for (const id of ids) add(title, id);
    }
  }
  return pairings;
}

/**
 * Check every title occurrence on a page against the registry, using the pairings the page's own
 * jump-list items establish. A prose mention of a title that is never paired to any id in
 * `conditions` (a title this check has no reachable registry entry for) is not flagged: it names
 * no claim this check can verify.
 * @param text - The page's raw markdown.
 * @param page - The page's path, relative to the docs root, carried onto each finding.
 * @param conditions - The condition ids to check titles against; the caller narrows this to the
 *  ids some report actually prints by title, never the whole registry.
 * @returns One finding per occurrence whose title text does not match its paired condition's own title.
 */
export function checkTitles(text: string, page: string, conditions: Condition[]): TitleFinding[] {
  const byId = new Map(conditions.map((c) => [c.id, c.title]));
  const known = new Set(byId.keys());
  const lines = text.split('\n');
  const pairings = learnPairings(lines, known);
  const findings: TitleFinding[] = [];
  lines.forEach((line, i) => {
    for (const span of spansOnLine(line, known)) {
      if (span.kind !== 'title') continue;
      const ids = pairings.get(span.text);
      if (!ids) continue;
      for (const id of ids) {
        const registryTitle = byId.get(id);
        if (registryTitle !== undefined && registryTitle !== span.text) {
          findings.push({ page, line: i + 1, pageTitle: span.text, conditionId: id, registryTitle });
        }
      }
    }
  });
  return findings;
}
