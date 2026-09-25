/**
 * Splitting a documentation page into the sections a path map is built from. A section is the
 * span under an H2 or H3 heading, ending at the next heading of level 1 to 3 (a deeper heading,
 * H4 and below, never ends a section, so its own content stays part of its enclosing section). The
 * lead span, from the line after the H1 (the page's first line when there is none) to the line
 * before the first H2 or H3, whichever comes first (the page's last line when there is neither),
 * is itself a section, carrying the H1's own text as its heading and level 1; it is left out of
 * the list when empty. A heading-shaped line inside a fenced code block never starts a section,
 * and a quote's line span is assigned to a section only when the whole span sits inside one.
 */

/** One section: its heading text, level (1 for the lead span, 2 or 3 otherwise), and 1-based inclusive line span. */
export interface SectionSpan {
  heading: string;
  level: 1 | 2 | 3;
  start: number;
  end: number;
}

/** A page split into its sections, plus its total line count. */
export interface PageSections {
  lines: number;
  sections: SectionSpan[];
}

/** One heading line found in a page. */
interface RawHeading {
  level: number;
  text: string;
  line: number;
}

/** A line's leading run of backticks or tildes, three or more, when it has one. */
function fenceRun(line: string): string | undefined {
  return /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
}

/**
 * Every ATX heading (`#` through `######`) a page carries, skipping any line inside a fenced code
 * block. A fence closes only on a run of the same character (backtick or tilde) at least as long
 * as the one that opened it (CommonMark), so a three-backtick line inside a four-backtick fence
 * never closes it early, and stays content, never a heading.
 * @param lines - The page's lines.
 * @returns Each heading's level, text, and 1-based line number, in source order.
 */
function findHeadings(lines: string[]): RawHeading[] {
  const headings: RawHeading[] = [];
  let openFence: string | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const run = fenceRun(line);
    if (openFence === undefined) {
      if (run) {
        openFence = run;
        continue;
      }
    } else {
      if (run && run[0] === openFence[0] && run.length >= openFence.length) openFence = undefined;
      continue;
    }
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
  }
  return headings;
}

/**
 * Split a page's text into its lead span plus its H2 and H3 sections. Only headings of level 1 to
 * 3 bound a section; a level 4 or deeper heading never ends one, so an H4 under an H3 stays part
 * of that H3's own span.
 * @param text - The page's raw markdown.
 * @returns The page's line count and its sections (the lead span first, when non-empty, then each
 * H2/H3 section), in source order.
 */
export function parseSections(text: string): PageSections {
  const rawLines = text.split('\n');
  const lines = rawLines.at(-1) === '' ? rawLines.length - 1 : rawLines.length;
  const headings = findHeadings(rawLines).filter((h) => h.level <= 3);
  const sections: SectionSpan[] = [];

  const first = headings[0];
  const hasH1 = first?.level === 1;
  const leadStart = hasH1 ? first.line + 1 : 1;
  const firstBoundary = headings.find((h) => h.level === 2 || h.level === 3);
  const leadEnd = firstBoundary ? firstBoundary.line - 1 : lines;
  if (leadStart <= leadEnd) sections.push({ heading: hasH1 ? first.text : '', level: 1, start: leadStart, end: leadEnd });

  for (let i = 0; i < headings.length; i += 1) {
    const heading = headings[i];
    if (heading.level !== 2 && heading.level !== 3) continue;
    const next = headings[i + 1];
    const end = next ? next.line - 1 : lines;
    sections.push({ heading: heading.text, level: heading.level, start: heading.line, end });
  }
  return { lines, sections };
}

/**
 * The section a verified quote's line span belongs to. A span crossing a heading boundary, or
 * reaching outside every section (past the page's last heading, or inside an empty lead span),
 * belongs to none.
 * @param sections - A page's sections, from `parseSections`.
 * @param startLine - The quote's first line, 1-based.
 * @param endLine - The quote's last line, 1-based.
 * @returns The single section containing the whole span, or undefined.
 */
export function sectionForSpan(sections: SectionSpan[], startLine: number, endLine: number): SectionSpan | undefined {
  const containing = sections.find((section) => startLine >= section.start && startLine <= section.end);
  return containing && endLine >= containing.start && endLine <= containing.end ? containing : undefined;
}

/**
 * The line numbers a page's H2/H3 headings sit on: never a valid plant location, since the
 * planter may not edit a heading. The lead span's own H1 line sits one line before the lead span
 * itself, so it is never inside any section's line range and needs no listing here.
 * @param sections - A page's sections, from `parseSections`.
 * @returns The heading lines, as a set.
 */
export function headingLines(sections: SectionSpan[]): Set<number> {
  return new Set(sections.filter((section) => section.level !== 1).map((section) => section.start));
}

/**
 * Every heading line a page carries, at any level (H1 through H6), fence-aware. This is broader
 * than `headingLines`, which lists only the H2/H3 section starts the capacity packer treats as a
 * boundary: a plant may never touch any heading line at all, an H4 through H6 included, since the
 * planter may not edit, add, or remove one.
 * @param text - The page's raw markdown.
 * @returns Every heading's 1-based line number.
 */
export function allHeadingLines(text: string): Set<number> {
  return new Set(findHeadings(text.split('\n')).map((heading) => heading.line));
}

/** A 1-based inclusive line span. */
export interface LineRange {
  start: number;
  end: number;
}

/** One originating section a page's plants may go in: its own line range, or several when the ceiling's narrowing split it into distant windows. */
export interface CapacityRegion {
  page: string;
  ranges: LineRange[];
}

/** The spacing rules' fixed limits. */
const MIN_GAP_LINES = 10;
const MAX_PER_SECTION = 2;
const MAX_PER_PAGE = 4;

/** The most plants one job carries; a path map whose capacity reaches this needs no widening. */
export const MAX_PLANTS = 7;

/**
 * The greatest number of plants a set of sections can hold under the spacing rules, capped at
 * seven: at most two plants per section (across every one of that section's own ranges, when the
 * ceiling's narrowing split it into several), no two plants within ten lines of each other on the
 * same page, and, on a multi-page job, at most four per page. A line on a finding span or a
 * heading is never a plant location; a blank line may still hold one. This is a greedy
 * earliest-feasible packer, scanning each page's sections in the order given and each section's
 * own lines left to right: for regions given in that order, greedy-earliest is exact, not a lower
 * bound, by a standard exchange argument (a later start can only ever make room for fewer further
 * picks, never more, so taking the earliest feasible line first never costs a placement).
 * @param regions - The plantable sections, one entry per section, each page's own sections in the
 * order to scan them.
 * @param findingSpans - The mapping-run finding spans to avoid, keyed by page.
 * @param multiPage - Whether the job carries more than one page, which triggers the per-page cap.
 * @param headings - Each page's own heading lines to skip, keyed by page (`headingLines`).
 * @returns The maximum plant count the regions hold, from 0 to 7.
 */
export function computeCapacity(
  regions: CapacityRegion[],
  findingSpans: Map<string, LineRange[]>,
  multiPage: boolean,
  headings: Map<string, Set<number>> = new Map(),
): number {
  let total = 0;
  const chosenByPage = new Map<string, number[]>();
  const pageCountByPage = new Map<string, number>();
  for (const { page, ranges } of regions) {
    if (total >= MAX_PLANTS) break;
    const spans = findingSpans.get(page) ?? [];
    const pageHeadings = headings.get(page) ?? new Set<number>();
    if (!chosenByPage.has(page)) chosenByPage.set(page, []);
    const chosen = chosenByPage.get(page) as number[];
    let pageCount = pageCountByPage.get(page) ?? 0;
    let sectionCount = 0;
    for (const range of ranges) {
      if (sectionCount >= MAX_PER_SECTION || total >= MAX_PLANTS) break;
      if (multiPage && pageCount >= MAX_PER_PAGE) break;
      for (let line = range.start; line <= range.end; line += 1) {
        if (sectionCount >= MAX_PER_SECTION || total >= MAX_PLANTS) break;
        if (multiPage && pageCount >= MAX_PER_PAGE) break;
        if (pageHeadings.has(line)) continue;
        if (spans.some((span) => line >= span.start && line <= span.end)) continue;
        if (chosen.some((c) => Math.abs(c - line) <= MIN_GAP_LINES)) continue;
        chosen.push(line);
        sectionCount += 1;
        pageCount += 1;
        total += 1;
      }
    }
    pageCountByPage.set(page, pageCount);
  }
  return total;
}
