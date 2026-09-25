/**
 * Splitting a documentation page into the sections a path map is built from. A section is the
 * span under an H2 or H3 heading; the lines before the first H2 form a lead span with no heading
 * of its own. A heading-shaped line inside a fenced code block never starts a section, and a
 * quote's line span is assigned to a section only when the whole span sits inside one.
 */

/** One H2 or H3 section: its heading text, level, and 1-based inclusive line span. */
export interface SectionSpan {
  heading: string;
  level: 2 | 3;
  start: number;
  end: number;
}

/** A page split into its sections, plus its total line count. */
export interface PageSections {
  lines: number;
  sections: SectionSpan[];
}

/** One heading line found in a page, before H4 and deeper are dropped. */
interface RawHeading {
  level: number;
  text: string;
  line: number;
}

/**
 * Whether a line opens or closes a fenced code block.
 * @param line - One source line.
 * @returns True for a line starting (after leading whitespace) with three backticks or tildes.
 */
function isFenceMarker(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

/**
 * Every ATX heading (`#` through `######`) a page carries, skipping any line inside a fenced code
 * block.
 * @param lines - The page's lines.
 * @returns Each heading's level, text, and 1-based line number, in source order.
 */
function findHeadings(lines: string[]): RawHeading[] {
  const headings: RawHeading[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isFenceMarker(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push({ level: match[1].length, text: match[2].trim(), line: i + 1 });
  }
  return headings;
}

/**
 * Split a page's text into its H2 and H3 sections. Each section runs from its own heading line to
 * the line before the next heading of any level (so an H2 immediately followed by an H3 ends at
 * that H3, per the innermost-heading rule), or to the page's last line for the final heading.
 * @param text - The page's raw markdown.
 * @returns The page's line count and its H2/H3 sections, in source order.
 */
export function parseSections(text: string): PageSections {
  const rawLines = text.split('\n');
  const lines = rawLines.at(-1) === '' ? rawLines.length - 1 : rawLines.length;
  const headings = findHeadings(rawLines);
  const sections: SectionSpan[] = [];
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
 * reaching outside every section (the lead span before the first H2, or past the last heading),
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

/** A 1-based inclusive line span. */
export interface LineRange {
  start: number;
  end: number;
}

/** One originating region a page's plants may go in, in page order. */
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
 * The greatest number of plants a set of per-page regions can hold under the spacing rules,
 * capped at seven: at most two plants per originating region (a section or a narrowed range), no
 * two within ten lines of each other on the same page, and, on a multi-page job, at most four per
 * page. A line inside a finding span is never a plant location. This is a greedy left-to-right
 * packer, one page at a time, one region at a time in page order: it is a lower bound on the
 * region's true capacity, not a search for the provably maximal packing, which the two-per-section
 * cap makes unnecessary in practice.
 * @param regions - The plantable regions, one entry per page, each page's own regions in order.
 * @param findingSpans - The mapping-run finding spans to avoid, keyed by page.
 * @param multiPage - Whether the job carries more than one page, which triggers the per-page cap.
 * @returns The maximum plant count the regions hold, from 0 to 7.
 */
export function computeCapacity(regions: CapacityRegion[], findingSpans: Map<string, LineRange[]>, multiPage: boolean): number {
  let total = 0;
  for (const { page, ranges } of regions) {
    if (total >= MAX_PLANTS) break;
    const spans = findingSpans.get(page) ?? [];
    const chosen: number[] = [];
    let pageCount = 0;
    for (const range of ranges) {
      let sectionCount = 0;
      for (let line = range.start; line <= range.end; line += 1) {
        if (sectionCount >= MAX_PER_SECTION || total >= MAX_PLANTS) break;
        if (multiPage && pageCount >= MAX_PER_PAGE) break;
        if (spans.some((span) => line >= span.start && line <= span.end)) continue;
        if (chosen.some((c) => Math.abs(c - line) <= MIN_GAP_LINES)) continue;
        chosen.push(line);
        sectionCount += 1;
        pageCount += 1;
        total += 1;
      }
    }
  }
  return total;
}
