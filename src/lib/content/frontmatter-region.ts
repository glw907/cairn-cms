// cairn-cms: the shared frontmatter-region helpers. A byte-preserving rewriter (media-rewrite's
// `repointMediaRef`/`fillAltForHash`, references' `rewriteFrontmatterReference`) splices a
// frontmatter value by source offset rather than round-tripping through gray-matter (which reformats
// YAML and is not byte stable). These helpers locate the `---` fenced block, split it into lines with
// absolute offsets, and find a top-level key's inclusive line range, so every such rewriter agrees on
// the boundary, the CRLF handling, and the colon-anchored key scan.

/**
 * The split of fmBlock into its lines, each with its block-relative start and end offsets (the end
 *  is the index of the trailing newline, or the block length for the last line). Block offsets are
 *  already absolute since the frontmatter leads the document.
 */
export interface FmLine {
  start: number;
  end: number;
}

/**
 * Split a leading frontmatter block off the markdown. `fmBlock` is the `---` fenced block including
 *  both fences and the trailing newline (empty when there is none); `body` is everything after it.
 *  The block leads the document, so a frontmatter offset is already absolute and a body offset needs
 *  `fmBlock.length` added. Shared by every arm so they agree on the boundary.
 */
export function splitFrontmatter(markdown: string): { fmBlock: string; body: string } {
  const m = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const fmBlock = m ? m[0] : '';
  return { fmBlock, body: markdown.slice(fmBlock.length) };
}

/**
 * Split fmBlock into lines once, so the locator helpers walk a shared structure instead of
 *  re-scanning the block per call.
 */
export function fmLines(fmBlock: string): FmLine[] {
  const lines: FmLine[] = [];
  let pos = 0;
  while (pos <= fmBlock.length) {
    const nl = fmBlock.indexOf('\n', pos);
    const end = nl === -1 ? fmBlock.length : nl;
    lines.push({ start: pos, end });
    if (nl === -1) break;
    pos = nl + 1;
  }
  return lines;
}

/**
 * The inclusive line-index range `[lo, hi]` of the block-style mapping a top-level key opens: the
 *  line `^<key>:` at indent 0 through the last line before the next top-level key (or the document
 *  end). A flow-style value (`key: { ... }` all on one line) yields a single-line range. Returns null
 *  when the key has no top-level line, which a malformed or non-canonical block can cause. Scoping the
 *  per-key search to this range is what lets two image fields that share one hash, or an image field
 *  whose hash also appears in a sibling text value, resolve to distinct, correct spans.
 */
export function frontmatterKeyRange(
  lines: FmLine[],
  fmBlock: string,
  key: string,
): [number, number] | null {
  const opener = new RegExp(`^${escapeForRegExp(key)}:`);
  const topLevelKey = /^[^\s#][^:]*:/;
  const isBoundary = (i: number) => {
    const text = fmBlock.slice(lines[i].start, lines[i].end);
    // A new top-level key or the closing `---` fence ends the current key's block.
    return topLevelKey.test(text) || text === '---';
  };
  let lo = -1;
  for (let i = 1; i < lines.length - 1; i += 1) {
    // Skip the leading `---` fence (line 0) and the trailing empty line after the closing fence.
    if (opener.test(fmBlock.slice(lines[i].start, lines[i].end))) {
      lo = i;
      break;
    }
  }
  if (lo === -1) return null;
  let hi = lo;
  for (let i = lo + 1; i < lines.length - 1; i += 1) {
    if (isBoundary(i)) break;
    hi = i;
  }
  return [lo, hi];
}

/**
 * Escape a literal string for safe interpolation into a RegExp source. A key name or an indent is
 *  matched literally, so its characters must not act as metacharacters.
 */
export function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
