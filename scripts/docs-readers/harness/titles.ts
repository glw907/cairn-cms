/**
 * Checking a docs/admin page's own condition titles against `tool/internal/spine/conditions.json`.
 * A page pairs a short title with a condition id in its jump-list bullets (a backtick title, a
 * dash, a link, then a backtick condition id); this module first learns every such pairing from a
 * page, then flags every occurrence of a mapped title, wherever it sits, whose text does not match
 * that id's own `title` field. Checking every occurrence, not only the bullet that defines the
 * pairing, catches a prose mention that drifted from the registry even where no id sits beside it
 * on that same line: the same title text can go stale everywhere it is used, not only where its id
 * is spelled out again.
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
 * Learn every title-to-id pairing a page's own bullets and prose establish: a title span followed,
 * before the next title span, by one or more id spans on the same or a later line within a short
 * window, pairs with each of those ids. A bullet naming several titles before several ids (the
 * "Auth store (D1)" triple) pairs them positionally when the counts match, and pairs a single title
 * with every id listed otherwise.
 * @param lines - The page's lines.
 * @param known - The ids the registry defines.
 * @returns A map from title text to the ids it is ever paired with.
 */
function learnPairings(lines: string[], known: Set<string>): Map<string, Set<string>> {
  const pairings = new Map<string, Set<string>>();
  const add = (title: string, id: string) => {
    if (!pairings.has(title)) pairings.set(title, new Set());
    pairings.get(title)?.add(id);
  };
  let pendingTitles: string[] = [];
  let sinceTitle = 0;
  const WINDOW = 4;
  for (const line of lines) {
    const spans = spansOnLine(line, known);
    const titles = spans.filter((s) => s.kind === 'title').map((s) => s.text);
    const ids = spans.filter((s) => s.kind === 'id').map((s) => s.text);
    if (titles.length > 0) {
      pendingTitles = titles;
      sinceTitle = 0;
    }
    if (ids.length > 0 && pendingTitles.length > 0 && sinceTitle <= WINDOW) {
      if (ids.length === pendingTitles.length) {
        ids.forEach((id, i) => add(pendingTitles[i], id));
      } else {
        for (const title of pendingTitles) for (const id of ids) add(title, id);
      }
    }
    sinceTitle += 1;
  }
  return pairings;
}

/**
 * Check every title occurrence on a page against the registry, using the pairings the page's own
 * bullets establish. A prose mention of a title that is never paired anywhere on the page (a title
 * this check has no registry id for) is not flagged: it names no claim about a specific condition.
 * @param text - The page's raw markdown.
 * @param page - The page's path, relative to the docs root, carried onto each finding.
 * @param conditions - The registry (`tool/internal/spine/conditions.json`).
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
