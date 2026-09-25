#!/usr/bin/env -S npx tsx
/**
 * The path map: which sections of a job's pages a reader doing that job actually reaches, built
 * from a job's mapping runs and used to decide where a plant may go. `steps[]` mode (the pinned
 * instrument) assigns each verified step quote to its section and applies the on-path,
 * ceiling, and thin-map rules the spec's "Path map" states. `--proxy` mode builds the coarser
 * tuning proxy pass 1's saved reports need, since they carry no `steps[]`.
 *
 * Usage:
 *   npx tsx scripts/docs-readers/path-map.ts build --job JOB --docs-set PAGE[,PAGE...]
 *     --pages-root DIR --report FILE [--report FILE...] [--run ID...] [--findings FILE]
 *     [--proxy] [--out FILE]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCapacity, headingLines, MAX_PLANTS, parseSections, sectionForSpan, type CapacityRegion, type LineRange, type PageSections, type SectionSpan } from './lib/sections.js';
import { loadSavedBatchReport } from './lib/transcript.js';
import type { JobReport, VerifiedQuote } from './lib/types.js';

/** One section as a path map reports it: its span, plus how many quotes and distinct runs reached it. */
export interface PathMapSection {
  heading: string;
  level: 1 | 2 | 3;
  start: number;
  end: number;
  quotes: number;
  runs: number;
}

/** One page's entry in a path map: its total line count and its on-path sections. */
export interface PathMapPage {
  lines: number;
  sections: PathMapSection[];
}

/** A job's path map, in the shape the chain and the planter read. */
export interface PathMap {
  job: string;
  verifiedRuns: number;
  mode: 'steps' | 'proxy';
  pages: Record<string, PathMapPage>;
  /** Present only when the ceiling narrowed the map; then it is the plantable region. */
  ranges?: Record<string, Array<[number, number]>>;
  onPathShare: number;
  narrowed: boolean;
  widened: boolean;
  capacity: number;
  noMap: string | null;
}

/** A job's pages, keyed by repository-relative path, in the job's docs-set order. */
export type JobPages = Record<string, string>;

/** A mapping-run finding span to avoid when planting, keyed by page. */
export type FindingSpans = Record<string, LineRange[]>;

const CEILING = 0.6;
const WIDEN_WINDOW = 40;

/**
 * Whether a model id names an Opus model. Job files and batch files name a reader's model as
 * `claude-opus-5-5` or `claude-sonnet-5`; this checks for the former by substring, so it holds
 * across an Opus point release.
 * @param model - A report's `model` field.
 * @returns True when the model is an Opus model.
 */
export function isOpusModel(model: string | undefined): boolean {
  return typeof model === 'string' && model.includes('opus');
}

/**
 * Whether a mapping run counts toward a path map: its report verified, and its model was Opus.
 * The init event's own reported model (`initModel`) is preferred over the job's requested
 * `model` when both are present, since the init event is what the run actually used.
 * @param report - One job report.
 * @returns True when the run is a verified Opus run.
 */
export function isVerifiedOpusRun(report: Pick<JobReport, 'verified' | 'model' | 'initModel'>): boolean {
  return report.verified?.ok === true && isOpusModel(report.initModel ?? report.model);
}

/**
 * Every verified quote a report carries, from `quotes[]`, `steps[].quote`, and
 * `diverged[].quote` alike, the fields the proxy map is built from.
 * @param report - One job report.
 * @returns Each verified quote, in no particular order.
 */
function allVerifiedQuotes(report: JobReport): VerifiedQuote[] {
  const quotes: VerifiedQuote[] = [];
  for (const quote of report.quotes ?? []) if (quote.ok) quotes.push(quote);
  for (const step of report.steps ?? []) if (step.quote.ok) quotes.push(step.quote);
  for (const entry of report.diverged ?? []) if (entry.quote.ok) quotes.push(entry.quote);
  return quotes;
}

/** A quote's own verified line span, or undefined when neither bound was recorded. */
function quoteSpan(quote: VerifiedQuote): LineRange | undefined {
  const start = quote.startLine ?? (typeof quote.line === 'number' ? quote.line : undefined);
  const end = quote.endLine ?? start;
  if (start === undefined || end === undefined) return undefined;
  return { start, end };
}

/** One section's tally: its span, the page it sits on, its quote count, and the runs that quoted it. */
interface SectionTally {
  page: string;
  section: SectionSpan;
  quoteCount: number;
  runIndexes: Set<number>;
}

/**
 * The key a section is tallied under: its page, level, and start line. The heading text is left
 * out, since two sections on one page can share it.
 */
function tallyKey(page: string, section: SectionSpan): string {
  return `${page}\u0000${section.level}\u0000${section.start}`;
}

/**
 * Tally, per section, how many quotes and how many distinct runs reached it.
 * @param runs - The runs to tally, already filtered to verified Opus runs.
 * @param pageSections - Each page's parsed sections, keyed by page.
 * @param quotesOf - How to pull the quotes to tally from one run (steps only, or every field).
 * @returns The tallies, keyed by `tallyKey`.
 */
function tallySections(
  runs: JobReport[],
  pageSections: Map<string, PageSections>,
  quotesOf: (report: JobReport) => VerifiedQuote[],
): Map<string, SectionTally> {
  const tallies = new Map<string, SectionTally>();
  runs.forEach((run, runIndex) => {
    for (const quote of quotesOf(run)) {
      const sections = pageSections.get(quote.path);
      if (!sections) continue;
      const span = quoteSpan(quote);
      if (!span) continue;
      const section = sectionForSpan(sections.sections, span.start, span.end);
      if (!section) continue;
      const key = tallyKey(quote.path, section);
      let tally = tallies.get(key);
      if (!tally) {
        tally = { page: quote.path, section, quoteCount: 0, runIndexes: new Set() };
        tallies.set(key, tally);
      }
      tally.quoteCount += 1;
      tally.runIndexes.add(runIndex);
    }
  });
  return tallies;
}

/**
 * The on-path threshold: how many of the job's verified runs must quote a section for it to count
 * as on-path. Two of three when there are three; both when there are two; the lone run when there
 * is one.
 * @param verifiedRuns - The count of verified Opus mapping runs.
 * @returns The minimum distinct-run count a section needs.
 */
function onPathThreshold(verifiedRuns: number): number {
  return Math.min(2, verifiedRuns);
}

/**
 * A tally's section, in the shape a path map reports.
 * @param tally - One section tally.
 * @returns The section with its quote and run counts.
 */
function toPathMapSection(tally: SectionTally): PathMapSection {
  return { heading: tally.section.heading, level: tally.section.level, start: tally.section.start, end: tally.section.end, quotes: tally.quoteCount, runs: tally.runIndexes.size };
}

/**
 * Group a set of tallies into the `pages` block a path map reports, alongside every page's total
 * line count (including a page with no on-path section, at zero sections).
 * @param tallies - The tallies to include.
 * @param pageOrder - Every page in the job, in docs-set order.
 * @param pageSections - Each page's parsed sections and line count.
 * @returns Every page keyed to its line count and the tallies that landed on it.
 */
function toPagesBlock(tallies: SectionTally[], pageOrder: string[], pageSections: Map<string, PageSections>): Record<string, PathMapPage> {
  const pages: Record<string, PathMapPage> = {};
  for (const page of pageOrder) {
    pages[page] = { lines: pageSections.get(page)?.lines ?? 0, sections: [] };
  }
  for (const tally of tallies) {
    pages[tally.page].sections.push(toPathMapSection(tally));
  }
  for (const page of pageOrder) {
    pages[page].sections.sort((a, b) => a.start - b.start);
  }
  return pages;
}

/**
 * A set of tallies' combined line count.
 * @param tallies - The tallies to sum.
 * @returns The total lines their sections span.
 */
function totalLines(tallies: SectionTally[]): number {
  return tallies.reduce((sum, tally) => sum + (tally.section.end - tally.section.start + 1), 0);
}

/**
 * The share a set of tallies' sections take of a job's total page lines.
 * @param tallies - The tallies to sum.
 * @param pageOrder - Every page in the job.
 * @param pageSections - Each page's parsed sections and line count.
 * @returns The share, from 0 to 1 (0 when the job's pages carry no lines at all).
 */
function shareOf(tallies: SectionTally[], pageOrder: string[], pageSections: Map<string, PageSections>): number {
  const total = pageOrder.reduce((sum, page) => sum + (pageSections.get(page)?.lines ?? 0), 0);
  return total === 0 ? 0 : totalLines(tallies) / total;
}

/**
 * Merge a set of inclusive line ranges, sorted ascending, joining any that touch or overlap.
 * @param windows - The ranges to merge, in any order.
 * @returns The merged ranges, sorted by start line.
 */
function mergeRanges(windows: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...windows].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/**
 * Sort a set of tallies into page then start-line order.
 * @param tallies - The tallies to sort.
 * @param pageOrder - The job's pages, in order.
 * @returns The tallies, sorted.
 */
function inPageOrder(tallies: SectionTally[], pageOrder: string[]): SectionTally[] {
  return [...tallies].sort((a, b) => {
    const pageDiff = pageOrder.indexOf(a.page) - pageOrder.indexOf(b.page);
    return pageDiff !== 0 ? pageDiff : a.section.start - b.section.start;
  });
}

/**
 * The capacity regions a set of tallies' whole sections offer: one region per section, each
 * holding that section's own single, unnarrowed line range, so the spacing rules' two-per-section
 * cap applies once per section, never once per page.
 * @param tallies - The sections to offer as regions.
 * @param pageOrder - The job's pages, in order, used to sort by page.
 * @returns One region per tally, sorted by page order then start line.
 */
function tallyRegions(tallies: SectionTally[], pageOrder: string[]): CapacityRegion[] {
  return inPageOrder(tallies, pageOrder).map((tally) => ({ page: tally.page, ranges: [{ start: tally.section.start, end: tally.section.end }] }));
}

/**
 * The ceiling's second-stage narrowing: for each all-agree section, the windows of
 * `WIDEN_WINDOW` lines either side of a line at least `threshold` verified runs quoted, clipped
 * to that section's own bounds and the page's, merged within the section but never across a
 * section boundary, so two sections' windows never combine into one even when they touch (each
 * keeps its own two-per-section budget).
 * @param allAgree - The sections every verified run quoted.
 * @param runs - The verified runs, in the same order the tallies were built from.
 * @param pageSections - Each page's parsed sections and line count.
 * @param pageOrder - The job's pages, in order, used to sort the result.
 * @param threshold - How many distinct runs a line needs to seed a window (the on-path threshold;
 * a single verified run above the ceiling still narrows, since that lone run's own threshold is 1).
 * @returns One region per all-agree section that has at least one window, sorted by page order
 * then start line; a section with no qualifying line contributes no region.
 */
function narrowToRanges(allAgree: SectionTally[], runs: JobReport[], pageSections: Map<string, PageSections>, pageOrder: string[], threshold: number): CapacityRegion[] {
  // Tally, per page and line, how many distinct runs quoted a step span covering that line.
  const lineRuns = new Map<string, Map<number, Set<number>>>();
  runs.forEach((run, runIndex) => {
    for (const step of run.steps ?? []) {
      if (!step.quote.ok) continue;
      const span = quoteSpan(step.quote);
      if (!span) continue;
      let perLine = lineRuns.get(step.quote.path);
      if (!perLine) {
        perLine = new Map();
        lineRuns.set(step.quote.path, perLine);
      }
      for (let line = span.start; line <= span.end; line += 1) {
        let runSet = perLine.get(line);
        if (!runSet) {
          runSet = new Set();
          perLine.set(line, runSet);
        }
        runSet.add(runIndex);
      }
    }
  });
  const regions: CapacityRegion[] = [];
  for (const tally of inPageOrder(allAgree, pageOrder)) {
    const perLine = lineRuns.get(tally.page);
    if (!perLine) continue;
    const pageLines = pageSections.get(tally.page)?.lines ?? tally.section.end;
    const windows: Array<[number, number]> = [];
    for (let line = tally.section.start; line <= tally.section.end; line += 1) {
      if ((perLine.get(line)?.size ?? 0) < threshold) continue;
      windows.push([Math.max(tally.section.start, 1, line - WIDEN_WINDOW), Math.min(tally.section.end, pageLines, line + WIDEN_WINDOW)]);
    }
    if (windows.length === 0) continue;
    regions.push({ page: tally.page, ranges: mergeRanges(windows).map(([start, end]) => ({ start, end })) });
  }
  return regions;
}

/**
 * The public `ranges` block a narrowed map reports: each capacity region's own line ranges,
 * grouped by page, in the order the regions were given. Ranges from different regions (different
 * sections) are never merged into each other here either, even when they touch, so the report
 * matches the regions capacity was actually computed from.
 * @param regions - The narrowed capacity regions, already in the order to report.
 * @param pageOrder - The job's pages, in order.
 * @returns Each page's ranges, as `[start, end]` tuples, omitting a page with none.
 */
function regionsToRangesRecord(regions: CapacityRegion[], pageOrder: string[]): Record<string, Array<[number, number]>> {
  const result: Record<string, Array<[number, number]>> = {};
  for (const page of pageOrder) {
    const onPage = regions.filter((region) => region.page === page).flatMap((region) => region.ranges.map((range): [number, number] => [range.start, range.end]));
    if (onPage.length > 0) result[page] = onPage;
  }
  return result;
}

/**
 * The path map a job gets when it has no usable mapping run: every page listed with no sections,
 * and the reason there is no map.
 * @param job - The job the map describes.
 * @param verifiedRuns - The count of verified Opus runs found.
 * @param mode - Whether the map was built from `steps[]` or as a proxy.
 * @param pages - Every page, at zero sections.
 * @param noMap - Why the map is empty.
 * @returns The empty path map.
 */
function emptyMap(job: string, verifiedRuns: number, mode: PathMap['mode'], pages: Record<string, PathMapPage>, noMap: string): PathMap {
  return { job, verifiedRuns, mode, pages, onPathShare: 0, narrowed: false, widened: false, capacity: 0, noMap };
}

/** The inputs one path map is built from. */
export interface BuildPathMapInput {
  job: string;
  /** The job's mapping runs; only the verified Opus ones count. */
  runs: JobReport[];
  /** The job's pages, keyed by repository-relative path, in docs-set order. */
  pages: JobPages;
  /** The mapping-run finding spans to keep clear of, when building the map before planting. */
  findingSpans?: FindingSpans;
  /** Whether the job carries more than one page; defaults to the page count. */
  multiPage?: boolean;
}

/**
 * Build a job's path map in `steps[]` mode, applying the on-path rule, the 60 percent ceiling and
 * its two-stage narrowing, and the thin-map widening, in that order.
 * @param input - The job, its mapping runs, its pages, and the finding spans to avoid.
 * @returns The job's path map, in the pinned chain shape.
 */
export function buildPathMap(input: BuildPathMapInput): PathMap {
  const pageOrder = Object.keys(input.pages);
  const multiPage = input.multiPage ?? pageOrder.length > 1;
  const pageSections = new Map(pageOrder.map((page) => [page, parseSections(input.pages[page])]));
  const findingSpans = new Map(pageOrder.map((page) => [page, input.findingSpans?.[page] ?? []]));
  const headings = new Map(pageOrder.map((page) => [page, headingLines(pageSections.get(page)?.sections ?? [])]));
  const opusVerified = input.runs.filter(isVerifiedOpusRun);
  const verifiedRuns = opusVerified.length;
  const emptyPages = toPagesBlock([], pageOrder, pageSections);
  if (verifiedRuns === 0) return emptyMap(input.job, 0, 'steps', emptyPages, 'no verified Opus mapping run');
  const tallies = tallySections(opusVerified, pageSections, (report) => (report.steps ?? []).filter((step) => step.quote.ok).map((step) => step.quote));
  if (tallies.size === 0) return emptyMap(input.job, verifiedRuns, 'steps', emptyPages, 'no verified steps[] quote in any mapping run');
  const threshold = onPathThreshold(verifiedRuns);
  const onPath = [...tallies.values()].filter((tally) => tally.runIndexes.size >= threshold);
  const onPathShare = shareOf(onPath, pageOrder, pageSections);

  let narrowed = false;
  let ranges: Record<string, Array<[number, number]>> | undefined;
  let capacityRegions: CapacityRegion[] = tallyRegions(onPath, pageOrder);

  if (onPathShare > CEILING) {
    narrowed = true;
    // "Quoted by all three runs" generalizes to "quoted by every verified run" below three.
    const allAgree = onPath.filter((tally) => tally.runIndexes.size === verifiedRuns);
    const allAgreeShare = shareOf(allAgree, pageOrder, pageSections);
    capacityRegions = allAgreeShare > CEILING ? narrowToRanges(allAgree, opusVerified, pageSections, pageOrder, threshold) : tallyRegions(allAgree, pageOrder);
    ranges = regionsToRangesRecord(capacityRegions, pageOrder);
  }

  let widened = false;
  let finalSections = onPath;
  if (!narrowed) {
    let widenedCapacity = computeCapacity(capacityRegions, findingSpans, multiPage, headings);
    if (widenedCapacity < MAX_PLANTS) {
      const onPathKeys = new Set(onPath.map((tally) => tallyKey(tally.page, tally.section)));
      const candidates = [...tallies.values()]
        .filter((tally) => !onPathKeys.has(tallyKey(tally.page, tally.section)))
        .sort((a, b) => {
          if (b.quoteCount !== a.quoteCount) return b.quoteCount - a.quoteCount;
          const pageDiff = pageOrder.indexOf(a.page) - pageOrder.indexOf(b.page);
          return pageDiff !== 0 ? pageDiff : a.section.start - b.section.start;
        });
      const widenedSet = [...onPath];
      for (const candidate of candidates) {
        if (widenedCapacity >= MAX_PLANTS) break;
        if (shareOf([...widenedSet, candidate], pageOrder, pageSections) > CEILING) break;
        widenedSet.push(candidate);
        widened = true;
        widenedCapacity = computeCapacity(tallyRegions(widenedSet, pageOrder), findingSpans, multiPage, headings);
      }
      finalSections = widenedSet;
    }
  }
  const capacity = computeCapacity(narrowed ? capacityRegions : tallyRegions(finalSections, pageOrder), findingSpans, multiPage, headings);

  return {
    job: input.job,
    verifiedRuns,
    mode: 'steps',
    pages: toPagesBlock(finalSections, pageOrder, pageSections),
    ...(ranges ? { ranges } : {}),
    onPathShare,
    narrowed,
    widened,
    capacity,
    noMap: null,
  };
}

/**
 * Build a job's proxy path map: a section is on the map when any verified Opus control run has a
 * verified quote inside it, in any report field (`quotes[]`, `steps[].quote`, or
 * `diverged[].quote`). Pass 1's saved reports carry no `steps[]`, so this is the map tuning round
 * 0 and round 1's development recall are measured against.
 * @param input - The job, its control runs, and its pages.
 * @returns The path map, `mode: "proxy"`.
 */
export function buildProxyMap(input: Pick<BuildPathMapInput, 'job' | 'runs' | 'pages'>): PathMap {
  const pageOrder = Object.keys(input.pages);
  const pageSections = new Map(pageOrder.map((page) => [page, parseSections(input.pages[page])]));
  const opusVerified = input.runs.filter(isVerifiedOpusRun);
  const verifiedRuns = opusVerified.length;
  const emptyPages = toPagesBlock([], pageOrder, pageSections);
  if (verifiedRuns === 0) return emptyMap(input.job, 0, 'proxy', emptyPages, 'no verified Opus control run');
  const tallies = tallySections(opusVerified, pageSections, allVerifiedQuotes);
  if (tallies.size === 0) return emptyMap(input.job, verifiedRuns, 'proxy', emptyPages, 'no verified quote in any control run');
  const onPath = [...tallies.values()];
  const onPathShare = shareOf(onPath, pageOrder, pageSections);
  const headings = new Map(pageOrder.map((page) => [page, headingLines(pageSections.get(page)?.sections ?? [])]));
  const capacity = computeCapacity(tallyRegions(onPath, pageOrder), new Map(), pageOrder.length > 1, headings);
  return { job: input.job, verifiedRuns, mode: 'proxy', pages: toPagesBlock(onPath, pageOrder, pageSections), onPathShare, narrowed: false, widened: false, capacity, noMap: null };
}

/**
 * Parse `--docs-set PAGE[,PAGE...]` into an ordered page list.
 * @param value - The flag's raw value.
 * @returns The pages, in the order given.
 */
function parseDocsSet(value: string): string[] {
  return value.split(',').map((page) => page.trim()).filter((page) => page.length > 0);
}

/**
 * Read every page a job's docs-set names, from a root directory that mirrors their
 * repository-relative paths.
 * @param root - The directory the pages live under.
 * @param docsSet - The pages to read, repository-relative.
 * @returns The pages, keyed by their repository-relative path.
 */
function readPages(root: string, docsSet: string[]): JobPages {
  const pages: JobPages = {};
  for (const page of docsSet) pages[page] = readFileSync(join(root, page), 'utf8');
  return pages;
}

/**
 * Read a findings file (`{ spans: [{ page, start, end }] }`) into finding spans keyed by page.
 * @param file - The findings file path.
 * @returns Each page's finding spans, in file order.
 */
function readFindingSpans(file: string): FindingSpans {
  const { spans } = JSON.parse(readFileSync(resolve(file), 'utf8')) as { spans: Array<{ page: string; start: number; end: number }> };
  const byPage: FindingSpans = {};
  for (const { page, start, end } of spans) (byPage[page] ??= []).push({ start, end });
  return byPage;
}

/**
 * Whether parsed JSON is a batch report: it carries a `jobs[]` array.
 * @param raw - The parsed contents of a `--report` file.
 * @returns True for a batch report.
 */
function isBatchShaped(raw: unknown): raw is { jobs: unknown[] } {
  return typeof raw === 'object' && raw !== null && Array.isArray((raw as Record<string, unknown>).jobs);
}

/**
 * Whether parsed JSON is one job report: it carries the fields every job report always has.
 * @param raw - The parsed contents of a `--report` file.
 * @returns True for a single job report.
 */
function isJobReportShaped(raw: unknown): raw is JobReport {
  if (typeof raw !== 'object' || raw === null) return false;
  const record = raw as Record<string, unknown>;
  return typeof record.model === 'string' && typeof record.verified === 'object' && record.verified !== null;
}

/**
 * Load the mapping runs a `build` invocation reads: each `--report` file is either one job
 * report, taken directly, or a saved batch report, whose `jobs[]` this reads through the shared
 * saved-report loader (so an earlier-shape saved report still parses) and filters to the ids
 * `--run` named. A batch file mixes every job it ever ran, so `--run` is required for one:
 * without it, a job-report-shaped file's own single run would pool in among every other job's
 * runs from the same batch, silently. Every `--run` id must match a job in some batch file;
 * one that matches none is a typo the caller needs to see, not a quietly empty selection.
 * @param files - The `--report` file paths.
 * @param runIds - The `--run` ids to select from every batch-shaped file.
 * @returns The runs, in file order, batch jobs in their own file order within their file.
 * @throws When a file is neither shape, naming the file; when a batch-shaped file is given with
 * no `--run` at all, naming the file; when a `--run` id matched no job in any batch file, naming
 * every id that matched none.
 */
function loadRuns(files: string[], runIds: string[]): JobReport[] {
  const wanted = new Set(runIds);
  const matched = new Set<string>();
  const runs: JobReport[] = [];
  for (const file of files) {
    const raw = JSON.parse(readFileSync(resolve(file), 'utf8')) as unknown;
    if (isBatchShaped(raw)) {
      if (wanted.size === 0) throw new Error(`"${file}" is a batch report; --run is required to select which of its jobs to take`);
      const batch = loadSavedBatchReport(raw);
      for (const job of batch.jobs) {
        if (wanted.has(job.id)) {
          runs.push(job);
          matched.add(job.id);
        }
      }
    } else if (isJobReportShaped(raw)) {
      runs.push(raw);
    } else {
      throw new Error(`"${file}" is neither a job report nor a batch report`);
    }
  }
  const unmatched = runIds.filter((id) => !matched.has(id));
  if (unmatched.length > 0) throw new Error(`--run id(s) matched no job in any batch file: ${unmatched.join(', ')}`);
  return runs;
}

/** The `build` subcommand's parsed arguments. */
interface BuildArgs {
  job: string;
  docsSet: string[];
  pagesRoot: string;
  reportFiles: string[];
  runIds: string[];
  findingsFile?: string;
  proxy: boolean;
  out?: string;
}

/**
 * Parse the `build` subcommand's flags.
 * @param argv - The arguments after `build`.
 * @returns The parsed flags.
 * @throws When a required flag is missing.
 */
function parseBuildArgs(argv: string[]): BuildArgs {
  const reportFiles: string[] = [];
  const runIds: string[] = [];
  let job: string | undefined;
  let docsSet: string[] | undefined;
  let pagesRoot: string | undefined;
  let findingsFile: string | undefined;
  let proxy = false;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--job') job = argv[++i];
    else if (arg === '--docs-set') docsSet = parseDocsSet(argv[++i]);
    else if (arg === '--pages-root') pagesRoot = argv[++i];
    else if (arg === '--report') reportFiles.push(argv[++i]);
    else if (arg === '--run') runIds.push(argv[++i]);
    else if (arg === '--findings') findingsFile = argv[++i];
    else if (arg === '--proxy') proxy = true;
    else if (arg === '--out') out = argv[++i];
    else throw new Error(`unknown flag "${arg}"`);
  }
  if (!job) throw new Error('--job is required');
  if (!docsSet || docsSet.length === 0) throw new Error('--docs-set is required');
  if (!pagesRoot) throw new Error('--pages-root is required');
  if (reportFiles.length === 0) throw new Error('at least one --report is required');
  return { job, docsSet, pagesRoot, reportFiles, runIds, findingsFile, proxy, out };
}

/**
 * Run the `path-map.ts build` CLI.
 * @param argv - The arguments after `build`.
 * @returns The process exit code.
 */
export function main(argv: string[]): number {
  if (argv[0] !== 'build') {
    process.stderr.write(
      'usage: path-map.ts build --job JOB --docs-set PAGE[,PAGE...] --pages-root DIR --report FILE [--report FILE...] [--run ID...] [--findings FILE] [--proxy] [--out FILE]\n',
    );
    return 1;
  }
  const args = parseBuildArgs(argv.slice(1));
  const pages = readPages(resolve(args.pagesRoot), args.docsSet);
  const runs = loadRuns(args.reportFiles, args.runIds);
  const findingSpans = args.findingsFile ? readFindingSpans(args.findingsFile) : undefined;
  const map = args.proxy ? buildProxyMap({ job: args.job, runs, pages }) : buildPathMap({ job: args.job, runs, pages, findingSpans });
  const json = `${JSON.stringify(map, null, 2)}\n`;
  if (args.out) writeFileSync(resolve(args.out), json);
  else process.stdout.write(json);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
