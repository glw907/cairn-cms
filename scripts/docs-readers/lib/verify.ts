/**
 * The quote verifier. A reader's report stands only when every quote it gives is found at its
 * `path:line` in the pristine prepared directory, and every page it read carries at least one
 * such quote; a report with no quote at all proves no reading and fails.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isPage, pageLineKey, READER_CWD, toReaderRelative } from './transcript.js';
import type { Diverged, InitCheck, RawQuote, ReaderReport, Step, Verified, VerifiedDiverged, VerifiedQuote, VerifiedStep } from './types.js';

/** How many lines a quote may run past its cited line when the reader joined a wrapped sentence. */
const SPAN_LINES = 5;

/**
 * Collapse runs of whitespace so a quote matches across soft wraps and indentation.
 * @param text - Any text.
 * @returns The text with whitespace runs collapsed and trimmed.
 */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Whether a quote starting on a given line reaches at least as far as `wanted`'s own text runs,
 * and if so, the last line (zero-based, absolute) that text reaches.
 * @param lines - The file's lines.
 * @param index - The zero-based line the quote must begin on.
 * @param wanted - The collapsed quote text.
 * @returns The last line `wanted` reaches, or undefined when it does not start on `index`.
 */
function matchEndLine(lines: string[], index: number, wanted: string): number | undefined {
  const collapsedLines = lines.slice(index, index + SPAN_LINES).map((l) => collapse(l));
  const first = collapsedLines[0] ?? '';
  if (first === '') return undefined;
  const window = collapsedLines.join(' ');
  for (let at = window.indexOf(wanted); at !== -1; at = window.indexOf(wanted, at + 1)) {
    if (at >= first.length) continue;
    // Map the match's own end offset, a position in the space-joined window, back to which of
    // this window's lines it falls on: walk each line's collapsed length plus its joining space.
    let consumed = 0;
    const end = at + wanted.length;
    for (let i = 0; i < collapsedLines.length; i += 1) {
      consumed += collapsedLines[i].length;
      if (end <= consumed) return index + i;
      consumed += 1;
    }
    return index + collapsedLines.length - 1;
  }
  return undefined;
}

/**
 * Check one quote against the prepared directory, resolving its path against one fixed `cwd`. A
 * quote passes on either of two grounds: its own text spans the cited line, starting there or on
 * an earlier line (within `SPAN_LINES`) and running at least as far as the cited line, the way a
 * reader who quotes the tail of a wrapped sentence cites the line the tail actually sits on; or
 * its text starts on the line immediately before or immediately after the cited one, the
 * off-by-one tolerance for a reader whose own line count drifted by a single line (a counted
 * blank line, a wrapped sentence counted from its far end). A miss of two lines or more, in
 * either direction, still fails, and so does text found nowhere in the file. A passing quote's
 * own `startLine`/`endLine` record the actual matched span, since that can run wider than, or sit
 * one line from, the single cited line the reader gave.
 * @param quote - The reader's `{ path, line, text }`.
 * @param root - The pristine prepared directory the reader's copy was made from.
 * @param cwd - The directory a relative `quote.path` is resolved against.
 * @returns The quote with its path made relative, plus `ok` and, on failure, a reason.
 */
function verifyQuoteAgainst(quote: RawQuote, root: string, cwd: string): VerifiedQuote {
  const rel = toReaderRelative(quote.path, cwd);
  const base = { path: rel ?? String(quote.path), line: quote.line, text: quote.text };
  if (!rel || rel === '.') return { ...base, ok: false, reason: 'path is outside the reader directory' };
  const line = quote.line;
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) return { ...base, ok: false, reason: 'line is not a positive integer' };
  const wanted = collapse(typeof quote.text === 'string' ? quote.text : '');
  if (wanted === '') return { ...base, ok: false, reason: 'quote text is empty' };
  const file = join(root, rel);
  if (!existsSync(file) || !statSync(file).isFile()) return { ...base, ok: false, reason: 'file does not exist' };
  const lines = readFileSync(file, 'utf8').split('\n');
  if (line > lines.length) return { ...base, ok: false, reason: `file has ${lines.length} lines` };
  const citedIndex = line - 1;
  for (let start = Math.max(0, citedIndex - SPAN_LINES + 1); start <= citedIndex; start += 1) {
    const endLine = matchEndLine(lines, start, wanted);
    if (endLine !== undefined && endLine >= citedIndex) return { ...base, ok: true, startLine: start + 1, endLine: endLine + 1 };
  }
  for (const near of [citedIndex - 1, citedIndex + 1]) {
    if (near < 0 || near >= lines.length) continue;
    const endLine = matchEndLine(lines, near, wanted);
    if (endLine !== undefined) return { ...base, ok: true, startLine: near + 1, endLine: endLine + 1 };
  }
  const elsewhere = lines.findIndex((_, index) => matchEndLine(lines, index, wanted) !== undefined);
  const reason = elsewhere === -1 ? 'text not found in the file' : `text starts on line ${elsewhere + 1}, not ${line}`;
  return { ...base, ok: false, reason };
}

/**
 * Check one quote against the prepared directory, the way `verifyQuoteAgainst` does, but a
 * relative `quote.path` first tries `cwd` (the reader's tracked effective cwd) and only falls
 * back to `READER_CWD` when that attempt does not verify: a report mixes quotes written from
 * whichever directory the reader had in mind at the time, not always the shell's own final cwd
 * (a `cd` for a build step does not mean every later quote is relative to it), so both are tried
 * and whichever actually verifies wins.
 * @param quote - The reader's `{ path, line, text }`.
 * @param root - The pristine prepared directory the reader's copy was made from.
 * @param cwd - The reader's tracked effective cwd (`effectiveCwd`), defaulting to `READER_CWD`.
 * @returns The quote with its path made relative, plus `ok` and, on failure, a reason.
 */
export function verifyQuote(quote: RawQuote, root: string, cwd: string = READER_CWD): VerifiedQuote {
  if (cwd !== READER_CWD) {
    const viaTrackedCwd = verifyQuoteAgainst(quote, root, cwd);
    if (viaTrackedCwd.ok) return viaTrackedCwd;
  }
  return verifyQuoteAgainst(quote, root, READER_CWD);
}

/**
 * Whether a quote's own verified span (`startLine` through `endLine`, falling back to `line` alone
 * when a caller passes a quote `verifyQuoteAgainst` never annotated) overlaps a `page:line` pair a
 * Grep call actually displayed. Checked line by line, never at the whole-page grain: a hit on one
 * line of a page must not excuse a quote of a distant, unrelated line on that same page.
 * @param quote - A verified quote, `ok` already checked by the caller.
 * @param grepHits - The `page:line` pairs a Grep call displayed (`grepHitPages`).
 * @returns True when some line in the quote's own span is one of `grepHits`.
 */
function overlapsGrepHit(quote: VerifiedQuote, grepHits: Set<string>): boolean {
  const start = quote.startLine ?? (typeof quote.line === 'number' ? quote.line : undefined);
  const end = quote.endLine ?? start;
  if (start === undefined || end === undefined) return false;
  for (let line = start; line <= end; line += 1) {
    if (grepHits.has(pageLineKey(quote.path, line))) return true;
  }
  return false;
}

/**
 * Verify every step's quote, the way a top-level quote is verified: at its cited line, inside the
 * five-line wrap, or one line off.
 * @param steps - The report's raw `steps[]`, when it gave any.
 * @param root - The pristine prepared directory.
 * @param cwd - The directory a relative quote path is resolved against.
 * @returns Each step with its quote's verified form.
 */
function verifySteps(steps: Step[], root: string, cwd: string | undefined): VerifiedStep[] {
  return steps.map((step) => ({ quote: verifyQuote(step.quote ?? {}, root, cwd), decision: step.decision }));
}

/**
 * Verify every divergence entry's quote, the way `verifySteps` verifies a step's.
 * @param diverged - The report's raw `diverged[]`, when it gave any.
 * @param root - The pristine prepared directory.
 * @param cwd - The directory a relative quote path is resolved against.
 * @returns Each divergence entry with its quote's verified form.
 */
function verifyDiverged(diverged: Diverged[], root: string, cwd: string | undefined): VerifiedDiverged[] {
  return diverged.map((entry) => ({
    quote: verifyQuote(entry.quote ?? {}, root, cwd),
    didInstead: entry.didInstead,
    why: entry.why,
    blockedBy: entry.blockedBy,
  }));
}

/**
 * Decide whether a job's report is verified, from the reader's structured `report` (undefined when
 * it gave none), the `pagesRead` the transcript shows, the job's `docsSet`, the pristine prepared
 * `root`, the `init` check's result, the `canariesFound` in the transcript, the reader's `cwd`
 * by the end of the transcript (`effectiveCwd`, defaulting to `READER_CWD`), against which every
 * relative quote path resolves, and the `page:line` pairs any Grep call displayed (`grepHitPages`,
 * defaulting to none). Every page read must carry a verified quote, and every quoted page must
 * have been read: a quote on a docs-set page the transcript never shows opened, and whose own span
 * never overlapped a displayed Grep line either, was not read in this run. A quote whose span
 * overlaps a line a Grep call displayed (`grepHits`, checked by `overlapsGrepHit`) is excused from
 * that last check, since the reader's own tool output did show that line; the quote still must
 * verify on its own, and an unrelated line elsewhere on the same page excuses nothing.
 * @returns The `verified` block for the job report.
 */
export function verifyReport({
  report,
  pagesRead,
  docsSet,
  root,
  init,
  canariesFound,
  cwd,
  grepHits = new Set(),
}: {
  report: ReaderReport | undefined;
  pagesRead: string[];
  docsSet: string[];
  root: string;
  init: InitCheck;
  canariesFound: string[];
  cwd?: string;
  grepHits?: Set<string>;
}): Verified {
  const problems: string[] = [];
  if (!init.ok) problems.push(...init.problems.map((p) => `init: ${p}`));
  if (canariesFound.length > 0) problems.push(`canary loaded: ${canariesFound.length} canary string(s) in the transcript`);
  let quotes: VerifiedQuote[] = [];
  let steps: VerifiedStep[] = [];
  let diverged: VerifiedDiverged[] = [];
  if (!report) {
    problems.push('no structured report');
  } else {
    quotes = report.quotes.map((q) => verifyQuote(q, root, cwd));
    if (quotes.length === 0) problems.push('report has no quote');
    for (const q of quotes) {
      if (!q.ok) problems.push(`quote ${q.path}:${q.line} unverified: ${q.reason}`);
    }
    const quoted = new Set(quotes.filter((q) => q.ok).map((q) => q.path));
    for (const page of pagesRead) {
      if (!quoted.has(page)) problems.push(`page ${page} was read but carries no verified quote`);
    }
    const read = new Set(pagesRead);
    for (const q of quotes) {
      if (q.ok && isPage(q.path, docsSet) && !read.has(q.path) && !overlapsGrepHit(q, grepHits)) {
        problems.push(`quote ${q.path}:${String(q.line)} cites a page the transcript never shows read`);
      }
    }
    steps = verifySteps(report.steps ?? [], root, cwd);
    for (const step of steps) {
      if (!step.quote.ok) problems.push(`step quote ${step.quote.path}:${String(step.quote.line)} unverified: ${step.quote.reason}`);
    }
    diverged = verifyDiverged(report.diverged ?? [], root, cwd);
    for (const entry of diverged) {
      if (!entry.quote.ok) problems.push(`diverged quote ${entry.quote.path}:${String(entry.quote.line)} unverified: ${entry.quote.reason}`);
    }
  }
  return { ok: problems.length === 0, init: init.ok, canaries: canariesFound.length === 0, quotes, steps, diverged, problems };
}
