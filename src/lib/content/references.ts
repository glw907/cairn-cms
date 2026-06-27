// cairn-cms: the typed frontmatter content graph. A `reference` field stores a target's permanent id
// in frontmatter; this module surgically rewrites that id on rename. The rewriter is byte-preserving:
// it splices the value substring by source offset rather than round-tripping through gray-matter
// (which reformats YAML and is not byte stable), so every other byte of the entry, body, sibling
// keys, comments, and the exact CRLF/BOM bytes, survives the edit exactly.
import matter from 'gray-matter';
import { isValidId } from './ids.js';
import {
  splitFrontmatter,
  fmLines,
  frontmatterKeyRange,
  escapeForRegExp,
} from './frontmatter-region.js';

/** A UTF-8 byte-order mark; a content file may carry one as a leading byte we must preserve. */
const BOM = '﻿';

/**
 * Whether `id` would not reparse as a YAML string, so the rewriter must single-quote it. The
 *  predicate is gray-matter's own parse: an unquoted `true`/`false`/`null`, a number, a hex/octal
 *  literal, or a date-shaped scalar parses to a non-string, which the edge's `isValidId` guard then
 *  silently drops. cairn ids never need escaping inside single quotes (they exclude `'`), so a single
 *  quote pair is always enough.
 */
function needsQuoting(id: string): boolean {
  return typeof (matter(`---\nx: ${id}\n---\n`).data as { x: unknown }).x !== 'string';
}

/**
 * The index where an inline YAML comment begins in `value`, or -1 when there is none. A comment opens
 *  at the first `#` preceded by whitespace or the line start (an id excludes `#` and whitespace, so a
 *  `#` adjacent to an id is impossible and this scan is unambiguous), so the rewriter touches only the
 *  value side and never an id that merely appears inside a trailing comment.
 */
function commentStart(value: string): number {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '#') continue;
    if (i === 0 || /\s/.test(value[i - 1])) return i;
  }
  return -1;
}

/**
 * Rewrite a token-bounded `oldId` to `newId` within one top-level frontmatter key's value, returning
 * the source byte-for-byte identical apart from that substring. The key's line range is found with the
 * colon-anchored `frontmatterKeyRange` (so `author` never matches `authored-by:`), and within each
 * line only the value side, an inline `# comment` left intact, is scanned. The token boundary is
 * `(?<![a-z0-9-])`/`(?![a-z0-9-])` rather than `\b`, since ids contain hyphens, so a substring id is
 * not matched. A `newId` that would not reparse as a YAML string (`true`, `123`, a date-shaped
 * `2026-01-02`) is written single-quoted, otherwise a raw substitution reparses as a boolean, number,
 * or Date and `coerceToText`/`extractReferenceEdges` silently drop the edge. A leading BOM, every
 * `\r`, and a source with no frontmatter, an absent field, or a malformed `oldId`/`newId` are
 * preserved unchanged. Pure and node-safe.
 */
export function rewriteFrontmatterReference(
  source: string,
  field: string,
  oldId: string,
  newId: string,
): string {
  // A malformed id is never a content value, so it cannot name an edge to repoint: return the source
  // untouched rather than splice a non-id token.
  if (!isValidId(oldId) || !isValidId(newId)) return source;

  // A leading BOM is held as a fixed prefix so the frontmatter regex (anchored at `---`) matches and
  // the byte is restored on output.
  const hasBom = source.startsWith(BOM);
  const text = hasBom ? source.slice(BOM.length) : source;

  const { fmBlock } = splitFrontmatter(text);
  if (fmBlock === '') return source;

  const lines = fmLines(fmBlock);
  const range = frontmatterKeyRange(lines, fmBlock, field);
  if (!range) return source;

  const replacement = needsQuoting(newId) ? `'${newId}'` : newId;
  const tokenRe = new RegExp(`(?<![a-z0-9-])${escapeForRegExp(oldId)}(?![a-z0-9-])`, 'g');

  // Collect the absolute splices over each line's value side, then apply from last to first so an
  // earlier offset stays valid. Each line offset is already absolute (the frontmatter leads the doc).
  const edits: { start: number; end: number }[] = [];
  for (let i = range[0]; i <= range[1]; i += 1) {
    const lineStart = lines[i].start;
    const lineText = fmBlock.slice(lineStart, lines[i].end);
    const cut = commentStart(lineText);
    const valueText = cut === -1 ? lineText : lineText.slice(0, cut);
    for (const m of valueText.matchAll(tokenRe)) {
      const at = lineStart + (m.index ?? 0);
      edits.push({ start: at, end: at + oldId.length });
    }
  }
  if (edits.length === 0) return source;

  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + replacement + out.slice(e.end);
  }
  return hasBom ? BOM + out : out;
}
