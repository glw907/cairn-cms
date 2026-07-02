// cairn-cms: the replace-in-place rewrite transform. Given one entry's raw markdown and an old
// content-hash, it rewrites every reference to that hash (a body image, a figure-wrapped image, or
// the frontmatter hero image.src) to a new asset's canonical `media:` token, and returns a per
// placement diff. This is the heart of the media-library "replace" action: the same bytes pointed
// at a new asset, with the surrounding entry left exact.
//
// The output is byte-for-byte identical to the input except for the `media:` token substrings that
// are replaced. The transform never round-trips through gray-matter or a markdown serializer (those
// reformat YAML and are not byte stable); it splices strings by source offset. The match keys on the
// parsed hash, the immutable truth, never the cosmetic slug, so a bare `media:<hash>` and a
// `media:<slug>.<hash>` for the same bytes both repoint. A malformed or non-matching token is left
// untouched.
//
// The body arm parses with the same figure-aware pipeline the render and Edit-block transforms use
// (remark-parse + gfm + directive), so a `media:` token inside a code span or fence is not an image
// node and is correctly never matched, matching extractMediaRefs. It also lets the arm classify an
// image inside a `:::figure` as a 'figure' placement.
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Image, Root } from 'mdast';
import type { ContainerDirective } from 'mdast-util-directive';
import { parseMediaToken } from '../media/reference.js';
import { escapeLinkText } from './links.js';
import {
  type FmLine,
  splitFrontmatter,
  fmLines,
  frontmatterKeyRange,
  escapeForRegExp,
} from './frontmatter-region.js';

/** One repointed reference: which surface it lived on, the old token as written, and the new token. */
export interface RepointPlacement {
  kind: 'body' | 'figure' | 'hero';
  /** The old `media:` token exactly as it was written in the source. */
  before: string;
  /** The new asset's canonical `media:` token (the same value for every placement). */
  after: string;
}

/** The rewritten markdown plus the per-placement diff, in document order (hero first, then body). */
export interface RepointResult {
  markdown: string;
  placements: RepointPlacement[];
}

/** A located token substring to splice: its absolute source offsets, the old text, and its kind. */
interface Edit {
  start: number;
  end: number;
  before: string;
  kind: RepointPlacement['kind'];
}

/**
 * Drop any span that overlaps a span already kept, in source order. A final safety net so two
 *  splices can never target the same or overlapping bytes and clobber each other into a corrupt
 *  result, no matter how the locating arms behaved. A pure-insert span (`start === end`) overlaps
 *  another span only when it sits strictly inside it, so adjacent inserts and edits are kept.
 */
function dropOverlappingEdits<T extends { start: number; end: number }>(edits: T[]): T[] {
  const kept: T[] = [];
  for (const e of edits) {
    const clashes = kept.some((k) => e.start < k.end && k.start < e.end);
    if (!clashes) kept.push(e);
  }
  return kept;
}

/**
 * A locating scan for candidate `media:` token substrings. Deliberately broad (it accepts
 *  uppercase and other out-of-grammar characters) so a malformed token is still found and then
 *  rejected by parseMediaToken, never silently skipped by the locator. The character class stops at
 *  whitespace, a quote, or any YAML or markdown delimiter, so a frontmatter value or an image
 *  destination ends the candidate.
 */
const MEDIA_TOKEN_SCAN = /media:[A-Za-z0-9._-]+/g;

/**
 * Parse a doc with the figure-aware pipeline, so the body arm agrees with what remarkFigure renders
 *  and can see the enclosing `:::figure` container. Mirrors parseFigureDoc in markdown-format.ts.
 */
function parseFigureDoc(doc: string): Root {
  return unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(doc) as Root;
}

/**
 * Whether `target` sits inside a `figure`-named container directive. Walks the tree to find the
 *  ancestor, since unist-util-visit's per-call ancestors are not retained across the traversal.
 *  Mirrors enclosingFigure in markdown-format.ts, reduced to a boolean.
 */
function inFigure(tree: Root, target: Image): boolean {
  let found = false;
  visit(tree, 'containerDirective', (dir: ContainerDirective) => {
    if (dir.name !== 'figure') return;
    visit(dir, 'image', (img: Image) => {
      if (img === target) found = true;
    });
  });
  return found;
}

/**
 * A located `src:` line inside a block-style mapping: the line's start and end, its leading indent,
 *  and the exact `media:` token's block-relative offsets and text.
 */
interface SrcLineHit {
  lineStart: number;
  lineEnd: number;
  indent: string;
  tokenStart: number;
  tokenEnd: number;
  token: string;
}

/**
 * Find the block-style `src:` line within `[lo, hi]` whose value token parses to `hash`. The token
 *  is located by the broad scan and validated through parseMediaToken (matching on hash), so a
 *  malformed token is found then rejected. Returns null for a flow-style value (no own `src:` line),
 *  which leaves that shape unanchorable rather than splicing a guessed span.
 */
function findSrcLineInRange(
  lines: FmLine[],
  fmBlock: string,
  range: [number, number],
  hash: string,
): SrcLineHit | null {
  const srcKeyRe = /^(\s*)src:[ \t]?/;
  for (let i = range[0]; i <= range[1]; i += 1) {
    const lineText = fmBlock.slice(lines[i].start, lines[i].end);
    const keyMatch = srcKeyRe.exec(lineText);
    if (!keyMatch) continue;
    const valueStart = lines[i].start + keyMatch[0].length;
    const valueText = fmBlock.slice(valueStart, lines[i].end);
    for (const m of valueText.matchAll(MEDIA_TOKEN_SCAN)) {
      const token = m[0];
      const ref = parseMediaToken(token);
      if (!ref || ref.hash !== hash) continue;
      const tokenStart = valueStart + m.index;
      return {
        lineStart: lines[i].start,
        lineEnd: lines[i].end,
        indent: keyMatch[1],
        tokenStart,
        tokenEnd: tokenStart + token.length,
        token,
      };
    }
  }
  return null;
}

/**
 * The image-like top-level frontmatter keys whose `src` parses to `hash`, in source order. A key is
 *  image-like when its value is an object carrying a string `src`; this is the same shape
 *  extractMediaRefs reads, so a token in a plain-text value (a `title:`/`note:`) is never treated as a
 *  reference. The bucket-classifying data comes from gray-matter (which handles every quoting form);
 *  the byte edit is located structurally by the caller, keyed back to this key name.
 */
function imageFieldKeys(data: Record<string, unknown>, hash: string): { key: string; obj: Record<string, unknown> }[] {
  const out: { key: string; obj: Record<string, unknown> }[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const obj = value as Record<string, unknown>;
    if (typeof obj.src !== 'string') continue;
    const ref = parseMediaToken(obj.src);
    if (!ref || ref.hash !== hash) continue;
    out.push({ key, obj });
  }
  return out;
}

/**
 * Collect hero src-token edits inside the frontmatter block. Only an image-field `src:` line is
 *  rewritten: the structure is read via gray-matter (image-like keys), and each key's `src:` line is
 *  located structurally within that key's block. A `media:` token sitting in a plain-text value (a
 *  `title:` or `description:`) is on no `src:` line, so it is left untouched, keeping the byte-exact
 *  contract and agreeing with extractMediaRefs. A flow-style hero has no `src:` line and is skipped.
 */
function frontmatterEdits(markdown: string, fmBlock: string, oldHash: string): Edit[] {
  if (fmBlock === '') return [];
  const data = matter(markdown).data as Record<string, unknown>;
  const lines = fmLines(fmBlock);
  const edits: Edit[] = [];
  for (const { key } of imageFieldKeys(data, oldHash)) {
    const range = frontmatterKeyRange(lines, fmBlock, key);
    if (!range) continue;
    const src = findSrcLineInRange(lines, fmBlock, range, oldHash);
    if (!src) continue;
    edits.push({ start: src.tokenStart, end: src.tokenEnd, before: src.token, kind: 'hero' });
  }
  return edits;
}

/**
 * Locate the exact `media:` token substring inside one image node's source span. The destination
 *  begins at the `](` that follows the alt text, so the search starts there to avoid a false match on
 *  a `media:`-like string inside the alt. Returns null when the token cannot be located, which leaves
 *  the image untouched rather than splicing a guessed range.
 */
function locateImageToken(span: string, url: string): { start: number; end: number } | null {
  const destStart = span.indexOf('](');
  const from = destStart === -1 ? 0 : destStart + 2;
  const at = span.indexOf(url, from);
  if (at === -1) return null;
  return { start: at, end: at + url.length };
}

/**
 * One body image whose url parses to the target hash, with its absolute node-span offsets (block
 *  length added) and whether it sits inside a `:::figure`. The shared body-image find that both the
 *  token-rewrite and alt-fill arms walk, so they agree on what an image is and how a figure is named.
 */
interface MatchedBodyImage {
  node: Image;
  /** Absolute start offset of the `![...](...)` node in the whole markdown. */
  nodeFrom: number;
  /** Absolute end offset of the node. */
  nodeTo: number;
  kind: 'body' | 'figure';
}

/**
 * Find every body image whose url parses to `hash`, in source order, with absolute offsets. Parses
 *  with the figure-aware pipeline, so a `media:` token inside a code span or fence is not an image
 *  node and is correctly skipped, matching extractMediaRefs.
 */
function matchedBodyImages(body: string, blockLength: number, hash: string): MatchedBodyImage[] {
  const tree = parseFigureDoc(body);
  const hits: MatchedBodyImage[] = [];
  visit(tree, 'image', (node: Image) => {
    const ref = parseMediaToken(node.url);
    if (!ref || ref.hash !== hash) return;
    const from = node.position?.start?.offset;
    const to = node.position?.end?.offset;
    if (from == null || to == null) return;
    hits.push({
      node,
      nodeFrom: blockLength + from,
      nodeTo: blockLength + to,
      kind: inFigure(tree, node) ? 'figure' : 'body',
    });
  });
  return hits;
}

/**
 * Collect body edits over the body slice. Each matching image is located within its own source span
 *  and recorded with an absolute offset. The kind is 'figure' when the image is inside a `:::figure`,
 *  else 'body'.
 */
function bodyEdits(body: string, blockLength: number, oldHash: string): Edit[] {
  const edits: Edit[] = [];
  for (const hit of matchedBodyImages(body, blockLength, oldHash)) {
    const span = body.slice(hit.nodeFrom - blockLength, hit.nodeTo - blockLength);
    const loc = locateImageToken(span, hit.node.url);
    if (!loc) continue;
    const start = hit.nodeFrom + loc.start;
    const end = hit.nodeFrom + loc.end;
    edits.push({ start, end, before: hit.node.url, kind: hit.kind });
  }
  return edits;
}

/**
 * Rewrite every reference to `oldHash` in one entry's raw markdown to `newToken`, and return the
 * rewritten markdown plus a per-placement diff. Only an image-field `src:` line is rewritten in the
 * frontmatter: the image-like keys are read via gray-matter and each key's `src:` line is located
 * structurally within its own block, so a `media:` token that merely appears in a plain-text value (a
 * `title:` or `description:`) is left untouched, matching extractMediaRefs. Body and figure images are
 * matched by mdast offset over the body slice. The output is byte-for-byte identical to the input
 * apart from the replaced token substrings, so the rest of the entry (alt text, captions, the
 * `:::figure` fences, every other frontmatter key) is preserved exactly. A non-matching hash returns
 * the markdown unchanged with an empty placement list; a malformed `media:` reference is left
 * untouched. Pure and node-safe.
 */
export function repointMediaRef(markdown: string, oldHash: string, newToken: string): RepointResult {
  const { fmBlock, body } = splitFrontmatter(markdown);

  const heroEdits = frontmatterEdits(markdown, fmBlock, oldHash);
  const bodyEditList = bodyEdits(body, fmBlock.length, oldHash);
  const edits = dropOverlappingEdits([...heroEdits, ...bodyEditList]);
  if (edits.length === 0) return { markdown, placements: [] };

  // placements read in document order (frontmatter first, then body in source order, which is the
  // order each arm already emits). The diff lists each changed reference once.
  const placements: RepointPlacement[] = edits.map((e) => ({
    kind: e.kind,
    before: e.before,
    after: newToken,
  }));

  // Apply from last offset to first so each splice leaves the earlier offsets valid.
  const byOffset = [...edits].sort((a, b) => b.start - a.start);
  let out = markdown;
  for (const e of byOffset) {
    out = out.slice(0, e.start) + newToken + out.slice(e.end);
  }

  return { markdown: out, placements };
}

/**
 * Which alt bucket a placement falls in: an empty alt always gets filled, a non-empty (custom) alt is
 *  reported and only overwritten on opt-in, and a decorative hero is never touched.
 */
type AltBucket = 'will-fill' | 'customized' | 'decorative-skipped';

/**
 * One placement of the target hash and what the alt-fill does to it: which surface it lives on, its
 *  bucket, the existing alt, and the alt after the transform (unchanged for a customized alt left as
 *  is and for a decorative hero).
 */
export interface AltPlacement {
  kind: 'body' | 'figure' | 'hero';
  bucket: AltBucket;
  /** The existing alt, empty string when there is none. */
  before: string;
  /** The alt after the transform; equals `before` when nothing changed. */
  after: string;
}

/** The alt-filled markdown plus the per-placement diff, in document order (hero first, then body). */
export interface AltFillResult {
  markdown: string;
  placements: AltPlacement[];
}

/**
 * A placement plus its optional byte edit. `apply` is false for a reported-but-unchanged placement
 *  (a kept custom alt, a decorative hero), which carries a diff entry but no splice. When `apply` is
 *  true, `[start, end)` is the absolute source span to replace with `text` (a pure insert is
 *  `start === end`). Keeping the placement here keeps the diff and the edits in step.
 */
interface AltEdit {
  apply: boolean;
  start: number;
  end: number;
  text: string;
  placement: AltPlacement;
}

/**
 * Classify an existing alt into its non-decorative bucket: an empty (or whitespace-only) alt is
 *  filled, a non-empty alt is a custom alt the caller may opt in to overwrite. Mirrors the empty-alt
 *  test findMediaImagesNeedingAlt uses.
 */
function classifyAlt(existing: string): 'will-fill' | 'customized' {
  return existing.trim() === '' ? 'will-fill' : 'customized';
}

/**
 * Whether a bucket plus the overwrite choice means the alt text is actually rewritten. A will-fill
 *  always writes; a customized alt writes only on opt-in; a decorative hero never writes.
 */
function isAltEdited(bucket: AltBucket, overwrite: boolean): boolean {
  if (bucket === 'will-fill') return true;
  if (bucket === 'customized') return overwrite;
  return false;
}

/**
 * Collect the body and figure alt edits over the body slice. The alt source span sits between `![`
 *  and the `](` inside the image node's span, so the new alt (escaped the way insertImage escapes it,
 *  so a `]` cannot break the syntax) is spliced there. The existing alt is the parser's already
 *  unescaped `node.alt`. A body image has no decorative slot, so an empty alt is always will-fill.
 */
function bodyAltEdits(body: string, blockLength: number, hash: string, defaultAlt: string, overwrite: boolean): AltEdit[] {
  const edits: AltEdit[] = [];
  for (const hit of matchedBodyImages(body, blockLength, hash)) {
    const span = body.slice(hit.nodeFrom - blockLength, hit.nodeTo - blockLength);
    if (!span.startsWith('![')) continue;
    // The alt source runs from `![` to the `](` that opens the destination. Find that closing `](`
    // from the url's known position, not a forward scan: a forward `indexOf('](')` lands inside an
    // alt that itself contains `](` or a nested `![x](y)` and would truncate the image on overwrite.
    const loc = locateImageToken(span, hit.node.url);
    if (!loc) continue;
    const close = span.lastIndexOf('](', loc.start);
    if (close === -1) continue;
    const before = hit.node.alt ?? '';
    const bucket = classifyAlt(before);
    const write = isAltEdited(bucket, overwrite);
    const after = write ? defaultAlt : before;
    const placement: AltPlacement = { kind: hit.kind, bucket, before, after };
    if (!write) {
      edits.push({ apply: false, start: hit.nodeFrom, end: hit.nodeFrom, text: '', placement });
      continue;
    }
    // Replace the alt text between `![` and the destination `](`, writing it escaped so a `]` in the
    // alt cannot truncate the image (mirrors insertImage).
    const altStart = hit.nodeFrom - blockLength + 2;
    const altEnd = hit.nodeFrom - blockLength + close;
    edits.push({
      apply: true,
      start: blockLength + altStart,
      end: blockLength + altEnd,
      text: escapeLinkText(defaultAlt),
      placement,
    });
  }
  return edits;
}

/**
 * Find a sibling key line (`alt:` or `decorative:`) at exactly `indent` within the inclusive
 *  line-index range `[lo, hi]` of one mapping. The range is the mapping's own block, so the search
 *  spans the whole mapping rather than a same-indent contiguous run: a blank line or a deeper-nested
 *  child between `src:` and `alt:` no longer hides the existing key (which would otherwise insert a
 *  duplicate key and break the YAML). Returns the key line's value span (after the key and its space,
 *  to end of line) or null when the mapping has no such key at that indent.
 */
function findSiblingKeyValue(
  lines: FmLine[],
  fmBlock: string,
  range: [number, number],
  indent: string,
  key: string,
): { start: number; end: number } | null {
  const keyRe = new RegExp(`^${escapeForRegExp(indent)}${escapeForRegExp(key)}:[ \\t]?`);
  for (let i = range[0]; i <= range[1]; i += 1) {
    const lineText = fmBlock.slice(lines[i].start, lines[i].end);
    const m = keyRe.exec(lineText);
    if (m) return { start: lines[i].start + m[0].length, end: lines[i].end };
  }
  return null;
}

/**
 * Collect the hero alt edits inside the frontmatter block. The image-field objects (and their
 *  decorative and alt values) are read via gray-matter to classify the bucket robustly across quoting
 *  forms; the byte edit is then located structurally, scoped to each field's own mapping block, keyed
 *  back by the top-level field name. Iterating the fields in source order keeps the hero placements in
 *  document order. A decorative hero is reported and never edited; an empty alt is filled; a custom
 *  alt is overwritten only on opt-in. An alt key that is present (anywhere in the mapping, even below a
 *  blank line or a nested child) has its value replaced; an absent one is inserted right after the
 *  `src:` line at the same indent. The new value is a JSON-quoted scalar, valid YAML that handles a
 *  colon, a quote, or an empty string. A flow-style hero (`image: { ... }`, no own `src:` line) is
 *  unanchorable, so it is reported from the gray-matter read but never spliced.
 */
function heroAltEdits(
  markdown: string,
  fmBlock: string,
  hash: string,
  defaultAlt: string,
  overwrite: boolean,
): AltEdit[] {
  if (fmBlock === '') return [];
  const data = matter(markdown).data as Record<string, unknown>;
  const lines = fmLines(fmBlock);
  const edits: AltEdit[] = [];
  const quoted = JSON.stringify(defaultAlt);
  for (const { key, obj } of imageFieldKeys(data, hash)) {
    const decorative = obj.decorative === true;
    const before = typeof obj.alt === 'string' ? obj.alt : '';
    const bucket: AltBucket = decorative ? 'decorative-skipped' : classifyAlt(before);
    const write = isAltEdited(bucket, overwrite);
    const after = write ? defaultAlt : before;
    const placement: AltPlacement = { kind: 'hero', bucket, before, after };

    const range = write ? frontmatterKeyRange(lines, fmBlock, key) : null;
    const src = range ? findSrcLineInRange(lines, fmBlock, range, hash) : null;
    if (!write || !range || !src) {
      // Reported but not edited: a kept custom alt, a decorative hero, or an unanchorable flow-style
      // hero (no own `src:` line). It carries a diff entry but no splice, so the bytes stay exact.
      edits.push({ apply: false, start: 0, end: 0, text: '', placement });
      continue;
    }
    const altSpan = findSiblingKeyValue(lines, fmBlock, range, src.indent, 'alt');
    if (altSpan) {
      edits.push({ apply: true, start: altSpan.start, end: altSpan.end, text: quoted, placement });
    } else {
      // No alt key: insert one on its own line right after the src line, at the sibling indent.
      edits.push({
        apply: true,
        start: src.lineEnd,
        end: src.lineEnd,
        text: `\n${src.indent}alt: ${quoted}`,
        placement,
      });
    }
  }
  return edits;
}

/**
 * Set the alt at each placement of `hash` in one entry's raw markdown, and return the rewritten
 * markdown plus a per-placement diff. An empty alt is filled with `defaultAlt` (bucket will-fill). A
 * non-empty alt is overwritten with `defaultAlt` only when `opts.overwrite` is true (bucket
 * customized; otherwise left unchanged but still reported, so the preview can show it and offer the
 * opt-in). A frontmatter hero with `decorative: true` is bucket decorative-skipped and never changed.
 * A body or figure image has no decorative slot, so its empty alt is always will-fill.
 *
 * The output is byte-for-byte identical to the input apart from the alt text it actually changes. The
 * hero alt is edited inside the frontmatter block by string splice (no gray-matter serialize round
 * trip, which would reformat the YAML); the structure read uses gray-matter only to classify buckets
 * and read the hero alt and decorative flag. A body alt is written escaped (the way insertImage
 * escapes it) so a `]` in the alt cannot break the image; a hero alt is written as a JSON-quoted YAML
 * scalar so a colon, a quote, or an empty value is robust. Placements read in document order (hero
 * first, then body in source order). A non-matching hash returns the markdown unchanged with an empty
 * placement list. Pure and node-safe.
 */
export function fillAltForHash(
  markdown: string,
  hash: string,
  defaultAlt: string,
  opts: { overwrite: boolean },
): AltFillResult {
  const { fmBlock, body } = splitFrontmatter(markdown);
  const heroEditList = heroAltEdits(markdown, fmBlock, hash, defaultAlt, opts.overwrite);
  const bodyEditList = bodyAltEdits(body, fmBlock.length, hash, defaultAlt, opts.overwrite);
  const edits = [...heroEditList, ...bodyEditList];
  if (edits.length === 0) return { markdown, placements: [] };

  const placements = edits.map((e) => e.placement);

  // Apply only the edits that change bytes, from last offset to first so the earlier offsets stay
  // valid. A reported-but-unchanged placement (a kept custom alt, a decorative hero) carries no span.
  // The overlap guard runs in source order over the writes as a final safety net, so two splices can
  // never target overlapping bytes and clobber each other into invalid output.
  const writes = dropOverlappingEdits(edits.filter((e) => e.apply));
  const byOffset = [...writes].sort((a, b) => b.start - a.start);
  let out = markdown;
  for (const e of byOffset) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }

  return { markdown: out, placements };
}
