/**
 * The quote verifier. A reader's report stands only when every quote it gives is found at its
 * `path:line` in the pristine prepared directory, and every page it read carries at least one
 * such quote; a report with no quote at all proves no reading and fails.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { toReaderRelative } from './transcript.js';
import type { InitCheck, RawQuote, ReaderReport, Verified, VerifiedQuote } from './types.js';

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
 * Whether a quote begins on a given line, possibly running onto the lines after it.
 * @param lines - The file's lines.
 * @param index - The zero-based line the quote must begin on.
 * @param wanted - The collapsed quote text.
 * @returns True when the quote starts within that line's text.
 */
function startsOn(lines: string[], index: number, wanted: string): boolean {
  const first = collapse(lines[index] ?? '');
  if (first === '') return false;
  const window = collapse(lines.slice(index, index + SPAN_LINES).join(' '));
  for (let at = window.indexOf(wanted); at !== -1; at = window.indexOf(wanted, at + 1)) {
    if (at < first.length) return true;
  }
  return false;
}

/**
 * Check one quote against the prepared directory. The quote must begin on the cited line; it may
 * run onto the following lines, as a wrapped sentence does.
 * @param quote - The reader's `{ path, line, text }`.
 * @param root - The pristine prepared directory the reader's copy was made from.
 * @returns The quote with its path made relative, plus `ok` and, on failure, a reason.
 */
export function verifyQuote(quote: RawQuote, root: string): VerifiedQuote {
  const rel = toReaderRelative(quote.path);
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
  if (startsOn(lines, line - 1, wanted)) return { ...base, ok: true };
  const elsewhere = lines.findIndex((_, index) => startsOn(lines, index, wanted));
  const reason = elsewhere === -1 ? 'text not found in the file' : `text starts on line ${elsewhere + 1}, not ${line}`;
  return { ...base, ok: false, reason };
}

/**
 * Decide whether a job's report is verified, from the reader's structured `report` (undefined when
 * it gave none), the `pagesRead` the transcript shows, the pristine prepared `root`, the `init`
 * check's result, and the `canariesFound` in the transcript.
 * @returns The `verified` block for the job report.
 */
export function verifyReport({
  report,
  pagesRead,
  root,
  init,
  canariesFound,
}: {
  report: ReaderReport | undefined;
  pagesRead: string[];
  root: string;
  init: InitCheck;
  canariesFound: string[];
}): Verified {
  const problems: string[] = [];
  if (!init.ok) problems.push(...init.problems.map((p) => `init: ${p}`));
  if (canariesFound.length > 0) problems.push(`canary loaded: ${canariesFound.length} canary string(s) in the transcript`);
  let quotes: VerifiedQuote[] = [];
  if (!report) {
    problems.push('no structured report');
  } else {
    quotes = report.quotes.map((q) => verifyQuote(q, root));
    if (quotes.length === 0) problems.push('report has no quote');
    for (const q of quotes) {
      if (!q.ok) problems.push(`quote ${q.path}:${q.line} unverified: ${q.reason}`);
    }
    const quoted = new Set(quotes.filter((q) => q.ok).map((q) => q.path));
    for (const page of pagesRead) {
      if (!quoted.has(page)) problems.push(`page ${page} was read but carries no verified quote`);
    }
  }
  return { ok: problems.length === 0, init: init.ok, canaries: canariesFound.length === 0, quotes, problems };
}
