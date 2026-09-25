#!/usr/bin/env -S npx tsx
/**
 * The plant validity check: whether each of a job's plants sits inside its plantable region,
 * respects the spacing rules, never targets an absent-list path as a stale-path plant, never sits
 * on a mapping-run finding span, and actually differs from the control page across the span it
 * replaces, per the spec's "Planting", "Validity check". It also checks, per page, that the
 * planted page carries exactly the control page's line count and that every differing line falls
 * inside a declared plant span. A plant fails when any check names a reason; nothing here judges a
 * plant's proof against the code, or whether it shares a subject with a development item, which
 * the spec reserves for the blind plant check.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { headingLines, parseSections, sectionForSpan, type LineRange } from './lib/sections.js';
import type { FindingSpans, PathMap } from './path-map.js';

/** A plant type, as the planter records it; `semantic` is true for the first three. */
export type PlantType = 'false-behavior' | 'contradiction' | 'precondition-or-ordering' | 'removed-step' | 'undefined-term' | 'wrong-name' | 'stale-path';

/** One synthesized plant, in the shape `plants.json` carries. */
export interface Plant {
  id: string;
  job: string;
  page: string;
  line: number;
  type: PlantType;
  semantic: boolean;
  subject: string;
  original: string;
  planted: string;
  proof: string;
  criterion: string;
  nearMiss: string;
}

/** One plant's verdict: valid, or invalid with every rule it broke named. */
export interface PlantVerdict {
  id: string;
  valid: boolean;
  reasons: string[];
}

/** One page's verdict: whether its planted copy matches the control copy's line count and carries no undeclared change. */
export interface PageVerdict {
  page: string;
  valid: boolean;
  reasons: string[];
}

/** A job's plant counts by type. */
export interface PlantCounts {
  total: number;
  semantic: number;
  token: number;
}

/** A job's full validity result. */
export interface JobValidityResult {
  job: string;
  valid: boolean;
  plants: PlantVerdict[];
  pages: PageVerdict[];
  counts: PlantCounts;
  /** True when the job has at least four plants but fewer than four are semantic. */
  fewSemantic: boolean;
  /** True when the job carries more than seven plants. */
  tooMany: boolean;
}

/** The inputs one job's validity check needs. */
export interface CheckJobPlantsInput {
  job: string;
  map: PathMap;
  /** The job's absent list, repository-relative, a directory carrying a trailing slash. */
  absent: string[];
  findingSpans: FindingSpans;
  /** Each page the job's plants touch, keyed by repository-relative path, control text. */
  controlPages: Record<string, string>;
  /** Each page the job's plants touch, keyed by repository-relative path, planted text. */
  plantedPages: Record<string, string>;
  plants: Plant[];
}

/** None of two plant spans' own lines may sit closer together than this, on the same page. */
const MIN_GAP_LINES = 11;
/** At most this many plants may share one section. */
const MAX_PER_SECTION = 2;
/** At most this many plants may land on one page of a multi-page job. */
const MAX_PER_PAGE = 4;

/**
 * How many lines of text a plant's `original` field spans.
 * @param text - The plant's `original` field.
 * @returns The line count.
 */
function linesOf(text: string): number {
  return text.split('\n').length;
}

/**
 * A plant's own line span: `line` to `line` plus its original text's line count, minus one.
 * @param plant - The synthesized plant to measure.
 * @returns The span it replaces on the control page.
 */
function plantSpan(plant: Plant): LineRange {
  return { start: plant.line, end: plant.line + linesOf(plant.original) - 1 };
}

/**
 * A page's plantable region: the map's narrowed ranges for that page when the map carries
 * `ranges` at all (even an empty list, meaning the ceiling's narrowing left this page no room),
 * otherwise the map's own listed on-path sections.
 * @param map - The job's path map.
 * @param page - The page to look up.
 * @returns The line ranges a plant may land in on that page.
 */
function plantableRanges(map: PathMap, page: string): LineRange[] {
  if (map.ranges) return (map.ranges[page] ?? []).map(([start, end]) => ({ start, end }));
  return (map.pages[page]?.sections ?? []).map((section) => ({ start: section.start, end: section.end }));
}

/**
 * Whether every line of a span sits inside at least one of a set of ranges.
 * @param span - The span to check.
 * @param ranges - The allowed ranges.
 * @returns True when the whole span is covered.
 */
function withinRanges(span: LineRange, ranges: LineRange[]): boolean {
  for (let line = span.start; line <= span.end; line += 1) {
    if (!ranges.some((range) => line >= range.start && line <= range.end)) return false;
  }
  return true;
}

/**
 * Whether a span includes any line from a set.
 * @param span - The span to check.
 * @param lines - The lines to check against.
 * @returns True when at least one of the span's lines is in the set.
 */
function spanIncludesAny(span: LineRange, lines: Set<number>): boolean {
  for (let line = span.start; line <= span.end; line += 1) if (lines.has(line)) return true;
  return false;
}

/**
 * Whether two line ranges overlap.
 * @param a - The first range.
 * @param b - The second range.
 * @returns True when they share at least one line.
 */
function overlaps(a: LineRange, b: LineRange): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * The line-number gap between two ranges' nearest lines: zero when they overlap, otherwise the
 * distance between the closer range's edge and the other's.
 * @param a - The first range.
 * @param b - The second range.
 * @returns The gap, in lines.
 */
function gapBetween(a: LineRange, b: LineRange): number {
  if (a.end < b.start) return b.start - a.end;
  if (b.end < a.start) return a.start - b.end;
  return 0;
}

/**
 * One line of a text, 1-based, or undefined past the text's end.
 * @param lines - The text, already split into lines.
 * @param line - The 1-based line number.
 * @returns That line's text.
 */
function lineAt(lines: string[], line: number): string | undefined {
  return lines[line - 1];
}

/**
 * Whether the planted page actually differs from the control page somewhere inside a span.
 * @param controlLines - The control page, split into lines.
 * @param plantedLines - The planted page, split into lines.
 * @param span - The plant's own span.
 * @returns True when at least one line in the span differs.
 */
function spanDiffers(controlLines: string[], plantedLines: string[], span: LineRange): boolean {
  for (let line = span.start; line <= span.end; line += 1) {
    if (lineAt(controlLines, line) !== lineAt(plantedLines, line)) return true;
  }
  return false;
}

/**
 * Read a stale-path plant's original or planted field as a bare repository-relative path: its
 * text is the path itself, stripped of surrounding whitespace and, when present, the backticks a
 * doc page wraps a path in.
 * @param text - The plant's `original` or `planted` field.
 * @returns The path the field names.
 */
function asPath(text: string): string {
  const trimmed = text.trim();
  const unwrapped = trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length >= 2 ? trimmed.slice(1, -1) : trimmed;
  return unwrapped.replace(/^\.\//, '');
}

/**
 * Whether a repository-relative path is absent by design: equal to a file entry, or equal to or
 * nested under a directory entry (an absent-list entry written with a trailing slash).
 * @param path - The path to check.
 * @param absent - The job's absent list.
 * @returns True when the path is on the absent list.
 */
function pathIsAbsent(path: string, absent: string[]): boolean {
  return absent.some((entry) => (entry.endsWith('/') ? path === entry.slice(0, -1) || path.startsWith(entry) : path === entry));
}

/**
 * For a stale-path plant, the first of its original or planted path that lands on the job's
 * absent list.
 * @param plant - The plant, expected to be a stale-path plant.
 * @param absent - The job's absent list.
 * @returns The offending path, or undefined when neither is absent.
 */
function stalePathOnAbsentList(plant: Plant, absent: string[]): string | undefined {
  for (const text of [plant.original, plant.planted]) {
    const path = asPath(text);
    if (pathIsAbsent(path, absent)) return path;
  }
  return undefined;
}

/** One plant to check against the job's spacing rules, reduced to what those rules need. */
interface SpacingItem {
  id: string;
  page: string;
  span: LineRange;
}

/**
 * Check the spacing rules over a job's plants: at most two per section, none within ten lines of
 * another on the same page, and, on a multi-page job, at most four per page. Plants are scanned in
 * page order then line order, greedily accepting each one that still fits under every already-
 * accepted plant's budget, so a fixture with one plant over a limit flags only that extra plant,
 * never an earlier one that was fine on its own.
 * @param items - Every plant to check, reduced to its id, page, and span.
 * @param controlPages - Each page's control text, used to find a plant's own section.
 * @param multiPage - Whether the job carries more than one page.
 * @returns Every plant that broke a spacing rule, with the rules it broke.
 */
function checkSpacing(items: SpacingItem[], controlPages: Record<string, string>, multiPage: boolean): Map<string, string[]> {
  const pageOrder = Object.keys(controlPages);
  const ordered = [...items].sort((a, b) => {
    const pageDiff = pageOrder.indexOf(a.page) - pageOrder.indexOf(b.page);
    return pageDiff !== 0 ? pageDiff : a.span.start - b.span.start;
  });
  const violations = new Map<string, string[]>();
  const sectionCounts = new Map<string, number>();
  const pageCounts = new Map<string, number>();
  const acceptedSpans = new Map<string, LineRange[]>();
  for (const item of ordered) {
    const control = controlPages[item.page];
    const sections = control !== undefined ? parseSections(control).sections : [];
    const section = sectionForSpan(sections, item.span.start, item.span.end);
    const sectionKey = `${item.page}\u0000${section ? section.start : 'none'}`;
    const priorSection = sectionCounts.get(sectionKey) ?? 0;
    const priorPage = pageCounts.get(item.page) ?? 0;
    const priorSpans = acceptedSpans.get(item.page) ?? [];
    const reasons: string[] = [];
    if (priorSection >= MAX_PER_SECTION) reasons.push('more than two plants in one section');
    if (priorSpans.some((span) => gapBetween(span, item.span) < MIN_GAP_LINES)) reasons.push('within ten lines of another plant');
    if (multiPage && priorPage >= MAX_PER_PAGE) reasons.push('more than four plants on one page of a multi-page job');
    if (reasons.length > 0) {
      violations.set(item.id, reasons);
      continue;
    }
    sectionCounts.set(sectionKey, priorSection + 1);
    pageCounts.set(item.page, priorPage + 1);
    acceptedSpans.set(item.page, [...priorSpans, item.span]);
  }
  return violations;
}

/**
 * A text's line count, split already, not counting the empty element a trailing newline leaves.
 * @param lines - The text, split into lines.
 * @returns How many lines the text carries.
 */
function countLines(lines: string[]): number {
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

/**
 * One page's verdict: its planted copy carries the control copy's line count, and every line that
 * differs from the control falls inside a declared plant span.
 * @param page - The page's repository-relative path.
 * @param control - The control text.
 * @param planted - The planted text.
 * @param declaredLines - Every line any of the job's plants on this page declares as its own.
 * @returns The page's verdict.
 */
function checkPage(page: string, control: string, planted: string, declaredLines: Set<number>): PageVerdict {
  const controlLines = control.split('\n');
  const plantedLines = planted.split('\n');
  const controlCount = countLines(controlLines);
  const plantedCount = countLines(plantedLines);
  const reasons: string[] = [];
  if (controlCount !== plantedCount) reasons.push(`line count mismatch: control has ${controlCount}, planted has ${plantedCount}`);
  for (let line = 1; line <= Math.max(controlCount, plantedCount); line += 1) {
    if (declaredLines.has(line)) continue;
    if (lineAt(controlLines, line) !== lineAt(plantedLines, line)) reasons.push(`undeclared changed line ${line}`);
  }
  return { page, valid: reasons.length === 0, reasons };
}

/**
 * Check every one of a job's plants and every page they touch, against the spec's "Validity
 * check": each plant sits inside the plantable region, with no line on a heading; the spacing
 * rules hold; a stale-path plant never targets an absent-list path; no plant sits on a
 * mapping-run finding span; the planted page differs from the control page somewhere in the
 * plant's own span; and, per page, the planted copy matches the control copy's line count with no
 * undeclared change.
 * @param input - The job, its map, absent list, finding spans, its pages, and its plants.
 * @returns The job's full validity result.
 */
export function checkJobPlants(input: CheckJobPlantsInput): JobValidityResult {
  const { job, map, absent, findingSpans, controlPages, plantedPages, plants } = input;
  const multiPage = Object.keys(map.pages).length > 1;

  const spans = new Map(plants.map((plant) => [plant.id, plantSpan(plant)] as const));
  const spacingViolations = checkSpacing(
    plants.map((plant) => ({ id: plant.id, page: plant.page, span: spans.get(plant.id) as LineRange })),
    controlPages,
    multiPage,
  );

  const plantVerdicts: PlantVerdict[] = plants.map((plant) => {
    const reasons: string[] = [];
    const span = spans.get(plant.id) as LineRange;
    const control = controlPages[plant.page];
    const planted = plantedPages[plant.page];
    if (control === undefined) reasons.push(`no control page for "${plant.page}"`);
    if (planted === undefined) reasons.push(`no planted page for "${plant.page}"`);
    if (control !== undefined) {
      if (!withinRanges(span, plantableRanges(map, plant.page))) reasons.push('outside the plantable region');
      if (spanIncludesAny(span, headingLines(parseSections(control).sections))) reasons.push('plant span includes a heading line');
      if ((findingSpans[plant.page] ?? []).some((finding) => overlaps(span, finding))) reasons.push('plant sits on a mapping-run finding span');
      if (plant.type === 'stale-path') {
        const bad = stalePathOnAbsentList(plant, absent);
        if (bad !== undefined) reasons.push(`stale-path plant targets an absent-list path "${bad}"`);
      }
      if (planted !== undefined && !spanDiffers(control.split('\n'), planted.split('\n'), span)) {
        reasons.push('planted page does not differ from the control page within the plant span');
      }
    }
    reasons.push(...(spacingViolations.get(plant.id) ?? []));
    return { id: plant.id, valid: reasons.length === 0, reasons };
  });

  const pages: PageVerdict[] = [...new Set(plants.map((plant) => plant.page))].map((page) => {
    const control = controlPages[page];
    const planted = plantedPages[page];
    if (control === undefined) return { page, valid: false, reasons: [`no control page for "${page}"`] };
    if (planted === undefined) return { page, valid: false, reasons: [`no planted page for "${page}"`] };
    const declaredLines = new Set<number>();
    for (const plant of plants) {
      if (plant.page !== page) continue;
      const span = spans.get(plant.id) as LineRange;
      for (let line = span.start; line <= span.end; line += 1) declaredLines.add(line);
    }
    return checkPage(page, control, planted, declaredLines);
  });

  const total = plants.length;
  const semantic = plants.filter((plant) => plant.semantic).length;

  return {
    job,
    valid: plantVerdicts.every((verdict) => verdict.valid) && pages.every((verdict) => verdict.valid),
    plants: plantVerdicts,
    pages,
    counts: { total, semantic, token: total - semantic },
    fewSemantic: total >= 4 && semantic < 4,
    tooMany: total > 7,
  };
}

/**
 * Read one job's page files from a `<root>/<job>/<page path>` layout, the layout the export's
 * overlay and the planter's output both use.
 * @param root - The root directory.
 * @param job - The job id.
 * @param pages - The repository-relative page paths to read.
 * @returns Each page's text, keyed by its repository-relative path; a page missing on disk is left
 * out.
 */
function readJobPages(root: string, job: string, pages: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const page of pages) {
    const file = join(root, job, page);
    try {
      result[page] = readFileSync(file, 'utf8');
    } catch {
      // Left out; the caller's checks report the missing page by name.
    }
  }
  return result;
}

/**
 * Read one job's mapping-run finding spans from `<findingsDir>/<job>.json`, grouped by page.
 * @param findingsDir - The directory the mapping run wrote its findings to.
 * @param job - The job id.
 * @returns The job's finding spans by page; empty when the file is missing or unreadable.
 */
function readFindingSpans(findingsDir: string, job: string): FindingSpans {
  try {
    const raw = JSON.parse(readFileSync(resolve(findingsDir, `${job}.json`), 'utf8')) as { spans: Array<{ page: string; start: number; end: number }> };
    const byPage: FindingSpans = {};
    for (const { page, start, end } of raw.spans) (byPage[page] ??= []).push({ start, end });
    return byPage;
  } catch {
    return {};
  }
}

/** The `check` subcommand's parsed arguments. */
interface CheckArgs {
  plantsFile: string;
  mapsDir: string;
  findingsDir?: string;
  absentFile: string;
  controlRoot: string;
  plantedRoot: string;
  jobs: string[];
  out?: string;
}

/**
 * Parse the `check` subcommand's flags.
 * @param argv - The arguments after `check`.
 * @returns The parsed flags.
 * @throws When a required flag is missing.
 */
function parseCheckArgs(argv: string[]): CheckArgs {
  let plantsFile: string | undefined;
  let mapsDir: string | undefined;
  let findingsDir: string | undefined;
  let absentFile: string | undefined;
  let controlRoot: string | undefined;
  let plantedRoot: string | undefined;
  let out: string | undefined;
  const jobs: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--plants') plantsFile = argv[(index += 1)];
    else if (arg === '--maps') mapsDir = argv[(index += 1)];
    else if (arg === '--findings') findingsDir = argv[(index += 1)];
    else if (arg === '--absent') absentFile = argv[(index += 1)];
    else if (arg === '--control-root') controlRoot = argv[(index += 1)];
    else if (arg === '--planted-root') plantedRoot = argv[(index += 1)];
    else if (arg === '--job') jobs.push(argv[(index += 1)]);
    else if (arg === '--out') out = argv[(index += 1)];
    else throw new Error(`unknown flag "${arg}"`);
  }
  if (!plantsFile) throw new Error('--plants is required');
  if (!mapsDir) throw new Error('--maps is required');
  if (!absentFile) throw new Error('--absent is required');
  if (!controlRoot) throw new Error('--control-root is required');
  if (!plantedRoot) throw new Error('--planted-root is required');
  return { plantsFile, mapsDir, findingsDir, absentFile, controlRoot, plantedRoot, jobs, out };
}

/**
 * Run the `plant-validity.ts check` CLI: read `plants.json`, every named job's path map and
 * absent list, and its control and planted pages, then check every plant.
 * @param argv - The arguments after `check`.
 * @returns The process exit code: 0 when every job validates, 1 otherwise.
 */
export function main(argv: string[]): number {
  if (argv[0] !== 'check') {
    process.stderr.write(
      'usage: plant-validity.ts check --plants FILE --maps DIR --absent FILE --control-root DIR --planted-root DIR [--findings DIR] [--job ID...] [--out FILE]\n',
    );
    return 1;
  }
  const args = parseCheckArgs(argv.slice(1));
  const allPlants = JSON.parse(readFileSync(resolve(args.plantsFile), 'utf8')) as Plant[];
  const absentByJob = JSON.parse(readFileSync(resolve(args.absentFile), 'utf8')) as Record<string, string[]>;
  const jobIds = args.jobs.length > 0 ? args.jobs : [...new Set(allPlants.map((plant) => plant.job))];
  const results: JobValidityResult[] = jobIds.map((job) => {
    const jobPlants = allPlants.filter((plant) => plant.job === job);
    const map = JSON.parse(readFileSync(resolve(args.mapsDir, `${job}.json`), 'utf8')) as PathMap;
    const findingSpans = args.findingsDir ? readFindingSpans(args.findingsDir, job) : {};
    const pages = [...new Set(jobPlants.map((plant) => plant.page))];
    const controlPages = readJobPages(resolve(args.controlRoot), job, pages);
    const plantedPages = readJobPages(resolve(args.plantedRoot), job, pages);
    return checkJobPlants({ job, map, absent: absentByJob[job] ?? [], findingSpans, controlPages, plantedPages, plants: jobPlants });
  });
  const json = `${JSON.stringify(results, null, 2)}\n`;
  if (args.out) writeFileSync(resolve(args.out), json);
  else process.stdout.write(json);
  return results.every((result) => result.valid) ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
