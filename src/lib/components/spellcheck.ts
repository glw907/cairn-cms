// cairn-cms: the spellcheck lint source and the single skip authority. The markdown-aware skip
// classifier and the word extractor are pure, so they unit-test without a DOM or a Worker; the
// linter() wiring at the bottom is the only side that touches CodeMirror, loaded the lazy way
// link-completion.ts loads it so CodeMirror never lands in a consumer's server bundle.
//
// The skip authority precedence (spec 1.4): the Lezer syntax tree is the single authority for
// node-kind skips (code, links/URLs, HTML, emphasis/strong markers). The deterministic
// frontmatterSpan helper covers the `---` region the grammar does not model, and the line-based
// fenceTokens scan covers the directive machinery the grammar parses as plain paragraph text. A
// fence-classified range wins inside a directive. A bare `media:` token in text is matched so it is
// never split into "media" plus a flagged hash.
import type { Tree } from '@lezer/common';
import type { Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { frontmatterSpan, fenceTokens } from './markdown-directives.js';
import { parseMediaToken } from '../media/reference.js';

/** An absolute character range in the document. */
export interface Range {
  from: number;
  to: number;
}

/** A word extracted for lookup: the lowercased form the Worker checks, and its absolute range so a
 *  verdict maps straight back to an underline. */
export interface ExtractedWord {
  /** The lowercased word, as the engine's case-insensitive lookup expects. */
  text: string;
  from: number;
  to: number;
}

// The Lezer node kinds that are never spellchecked, verified empirically against the actual
// @codemirror/lang-markdown grammar (parse a fixture, inspect node names) rather than trusting the
// spec list blind. The grammar models:
//   code: InlineCode, FencedCode, CodeText, CodeBlock (CodeBlock is the indented form; its body is a
//     CodeText too). CodeMark/CodeInfo are the fence/lang markers.
//   links and URLs: URL (a link destination and the URL inside an autolink), Autolink (the whole
//     <...> form), LinkLabel (a [ref] label and a reference-definition label), LinkReference (the
//     whole `[ref]: url "title"` definition), LinkTitle (the quoted title on a definition).
//   HTML: HTMLTag (inline), HTMLBlock.
//   emphasis/strong MARKERS: EmphasisMark (the *,_,**,__ runs), not the prose inside Emphasis or
//     StrongEmphasis. The same goes for the other *Mark nodes (LinkMark, HeaderMark, ListMark,
//     QuoteMark), which are punctuation, never prose.
// Note the spec listed "link destinations, autolinks, link labels, reference definitions"; the real
// node names for those are URL, Autolink, LinkLabel, and LinkReference. LinkTitle is added because
// the grammar emits the definition's quoted title as its own node and it is machinery, not prose.
const SKIP_NODES = new Set<string>([
  'InlineCode',
  'FencedCode',
  'CodeText',
  'CodeBlock',
  'CodeMark',
  'CodeInfo',
  'URL',
  'Autolink',
  'LinkLabel',
  'LinkReference',
  'LinkTitle',
  'HTMLTag',
  'HTMLBlock',
  'EmphasisMark',
  'LinkMark',
  'HeaderMark',
  'ListMark',
  'QuoteMark',
]);

// A bare `media:` token shaped like the reference grammar (a slug-and-hash or bare-hash run with no
// surrounding whitespace). A token inside an image is already caught by the URL skip; this catches
// the form authors type directly in prose, so it is never split into "media" plus a flagged hash.
const MEDIA_TOKEN = /media:[\w.-]+/g;

/** Merge overlapping or touching ranges into a sorted, disjoint set, so the keep-span computation
 *  subtracts one clean list of skip regions. */
function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.from - b.from || a.to - b.to);
  const out: Range[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]!;
    const last = out[out.length - 1]!;
    if (next.from <= last.to) last.to = Math.max(last.to, next.to);
    else out.push({ ...next });
  }
  return out;
}

/** Every absolute skip range in the document, from all three mechanisms, merged. This is the single
 *  skip authority the spec calls for: the tree decides node kind, frontmatterSpan covers the `---`
 *  region, and fenceTokens covers the directive machinery the tree parses as plain text. */
function skipRanges(text: string, tree: Tree): Range[] {
  const skips: Range[] = [];

  // 1. The Lezer tree: the single authority for node-kind skips.
  tree.iterate({
    enter(node) {
      if (SKIP_NODES.has(node.name)) skips.push({ from: node.from, to: node.to });
    },
  });

  // 2. The frontmatter `---` region (slugs, dates, keys never flagged). The grammar models no
  //    frontmatter node, so this deterministic helper is the only authority for the region.
  const fm = frontmatterSpan(text);
  if (fm) skips.push(fm);

  // 3. The directive machinery, line by line: the colon runs, the `{attrs}` braces, and the
  //    directive name. A `[label]`'s prose and the directive body stay checkable, so only the
  //    machinery tokens are skipped. fenceTokens emits the directive name and a bracket label both
  //    as `label` kind; the name is the lone `label` that precedes any bracket on the line, so it is
  //    skipped while the bracketed label is kept.
  let lineStart = 0;
  for (const line of text.split('\n')) {
    const tokens = fenceTokens(line);
    if (tokens.length > 0) {
      let seenBracket = false;
      for (const token of tokens) {
        // A single-character `[` mark opens the bracket label; everything after it on this line is
        // bracketed, so the directive name can only be a `label` before it.
        const isOpenBracket = token.kind === 'mark' && line[token.from] === '[';
        if (token.kind === 'mark') {
          skips.push({ from: lineStart + token.from, to: lineStart + token.to });
          if (isOpenBracket) seenBracket = true;
        } else if (token.kind === 'label' && !seenBracket) {
          // The directive name (a label before any bracket) is machinery, not prose.
          skips.push({ from: lineStart + token.from, to: lineStart + token.to });
        }
      }
    }

    // 4. A bare `media:` token anywhere on the line, kept whole so the hash never reads as a word.
    for (const m of line.matchAll(MEDIA_TOKEN)) {
      if (parseMediaToken(m[0])) {
        skips.push({ from: lineStart + m.index, to: lineStart + m.index + m[0].length });
      }
    }

    lineStart += line.length + 1;
  }

  return mergeRanges(skips);
}

/**
 * The keep spans inside one text window [from, to): the window with every skip range subtracted.
 * This is the lower-level primitive {@link spellcheckRanges} composes over the whole document, and
 * the one the lint source runs over `view.visibleRanges` plus a margin. The skip authority and its
 * precedence live in {@link skipRanges}.
 */
export function classifyProse(text: string, tree: Tree, from: number, to: number): Range[] {
  const skips = skipRanges(text, tree);
  const out: Range[] = [];
  let cursor = from;
  for (const skip of skips) {
    if (skip.to <= from || skip.from >= to) continue; // outside the window
    const start = Math.max(skip.from, from);
    if (start > cursor) out.push({ from: cursor, to: start });
    cursor = Math.max(cursor, Math.min(skip.to, to));
  }
  if (cursor < to) out.push({ from: cursor, to });
  return out;
}

/** The prose ranges worth checking across the whole document. The lint source narrows this to the
 *  visible window; the unit test reads the whole-document set. */
export function spellcheckRanges(text: string, tree: Tree): Range[] {
  return classifyProse(text, tree, 0, text.length);
}

// A word boundary that keeps intra-word apostrophes and hyphens (so "it's" and "well-known" stay
// whole) while breaking on everything else. The class is Unicode letters and digits via the u flag,
// with the inner apostrophe (straight or curly) and hyphen allowed only between word characters.
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
const ALL_DIGITS = /^\p{N}+$/u;

/** Whether a word is worth a lookup. Words under three characters, pure numbers, and all-caps tokens
 *  are skipped to cut false positives (the conservative posture VSCode's spell checker takes). */
function isCheckable(word: string): boolean {
  if (word.length < 3) return false;
  if (ALL_DIGITS.test(word)) return false;
  // An all-caps token (acronym or constant) is skipped; a word with any lowercase letter is checked.
  if (word === word.toUpperCase() && word !== word.toLowerCase()) return false;
  return true;
}

/**
 * The checkable words inside [from, to), each lowercased for lookup with its absolute range recorded
 * so a verdict maps straight back to an underline. Sub-three-character words, pure numbers, and
 * all-caps tokens are dropped.
 */
export function extractWords(text: string, from: number, to: number): ExtractedWord[] {
  const slice = text.slice(from, to);
  const out: ExtractedWord[] = [];
  for (const m of slice.matchAll(WORD)) {
    const raw = m[0];
    if (!isCheckable(raw)) continue;
    const start = from + m.index;
    out.push({ text: raw.toLowerCase(), from: start, to: start + raw.length });
  }
  return out;
}

/**
 * The latest-wins arbiter (the media-preview settling pattern). The lint source hands out a
 * monotonic seq with {@link next} on each run and posts it on the check message; when a `checked`
 * answer lands, {@link accept} returns true only for the highest seq seen, so a stale answer from an
 * older document state is dropped and the underlines never lag the text. Pure, so the seq logic
 * unit-tests without a Worker.
 */
export interface SeqArbiter {
  /** The next monotonic seq, recorded as the current run. */
  next(): number;
  /** True when this seq is still the latest one issued or accepted, false for a stale answer. */
  accept(seq: number): boolean;
}

/** Build a fresh {@link SeqArbiter}. */
export function arbitrateChecked(): SeqArbiter {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    accept(seq) {
      if (seq < current) return false;
      current = seq;
      return true;
    },
  };
}

// ----- The linter() wiring (the CodeMirror side) -----
//
// Only this half touches CodeMirror, and it never value-imports an @codemirror/* package at module
// scope: EditPage imports the component .ts helpers statically, so a static value import here would
// pull CodeMirror into a consumer's server bundle (the editor-boundary test enforces this). The
// modules resolve lazily inside the source, the same boundary link-completion.ts keeps. The Worker
// construction sits behind a small injectable seam so the lint logic can be exercised without a real
// Worker; production passes the seam that builds the spike's `new Worker(...)`.

let lintMod: typeof import('@codemirror/lint') | null = null;
let langMod: typeof import('@codemirror/language') | null = null;

/** The narrow Worker surface the lint source drives: it posts check messages and listens for the
 *  checked answers. A test injects a fake; production injects a real Worker. */
export interface SpellWorker {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

/** Construct the real spellcheck Worker, the spike's delivery shape. Kept behind the seam so the
 *  lint source never references `Worker` at module scope and a test can swap it. */
export function createSpellWorker(): SpellWorker {
  return new Worker(new URL('./spellcheck-worker.js', import.meta.url), {
    type: 'module',
  }) as unknown as SpellWorker;
}

/** How far past the visible viewport to lint, so a small scroll does not re-lint from scratch. */
const VIEWPORT_MARGIN = 1000;

/** Options for {@link cairnSpellcheck}, so the unit and component layers can inject a fake Worker
 *  factory in place of the real `new Worker(...)`. */
export interface SpellcheckOptions {
  /** The Worker factory; defaults to {@link createSpellWorker}. Created lazily on the first lint. */
  createWorker?: () => SpellWorker;
}

/**
 * The @codemirror/lint linter() source, made markdown-aware by the Lezer tree. It runs over the
 * visible viewport plus a margin (not the whole document), extracts the checkable words via the pure
 * classifier, posts them to the Worker keyed by a monotonic latest-wins seq, and maps the
 * `correct: false` answers back to ranges. The diagnostics it emits are minimal placeholders: Task 5
 * builds the correction popover (quick-fix actions and the locked underline token) on top of these
 * ranges, so the seam is left clean here.
 */
export async function cairnSpellcheck(options: SpellcheckOptions = {}): Promise<Extension> {
  // Lazy value imports: this keeps CodeMirror off the server bundle (the boundary the editor relies
  // on) and matches how link-completion.ts resolves @codemirror/language inside its source.
  lintMod ??= await import('@codemirror/lint');
  langMod ??= await import('@codemirror/language');
  const { linter } = lintMod;
  const { syntaxTree } = langMod;

  const createWorker = options.createWorker ?? createSpellWorker;
  const arbiter = arbitrateChecked();

  let worker: SpellWorker | null = null;
  // The in-flight requests keyed by their seq, each resolved by the matching `checked` answer. A run
  // posts one check and awaits its verdicts; a stale answer (an older seq) is dropped by the arbiter.
  const pending = new Map<
    number,
    { words: ExtractedWord[]; resolve: (diagnostics: Diagnostic[]) => void }
  >();

  function ensureWorker(): SpellWorker {
    if (worker) return worker;
    worker = createWorker();
    worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as { type?: string; seq?: number; results?: { id: number; correct: boolean }[] };
      if (data.type !== 'checked' || typeof data.seq !== 'number') return;
      const request = pending.get(data.seq);
      if (!request) return;
      pending.delete(data.seq);
      // Drop a stale answer that landed after a newer run; only the latest seq paints underlines.
      if (!arbiter.accept(data.seq)) {
        request.resolve([]);
        return;
      }
      const wrong = new Set((data.results ?? []).filter((r) => !r.correct).map((r) => r.id));
      const diagnostics: Diagnostic[] = request.words
        .filter((_, id) => wrong.has(id))
        .map((word) => ({
          from: word.from,
          to: word.to,
          // Task 5 replaces this placeholder with the correction popover and the locked underline
          // color; the lint source's job here is the skip authority and the worker round-trip.
          severity: 'warning' as const,
          source: 'cairn-spellcheck',
          message: 'Possible spelling error.',
        }));
      request.resolve(diagnostics);
    });
    return worker;
  }

  return linter(async (view) => {
    const text = view.state.doc.toString();
    const tree = syntaxTree(view.state);

    // The visible viewport plus a margin, clamped to the document, deduped to one window per run.
    const docLength = text.length;
    const windows = view.visibleRanges.map((vr) => ({
      from: Math.max(0, vr.from - VIEWPORT_MARGIN),
      to: Math.min(docLength, vr.to + VIEWPORT_MARGIN),
    }));

    const words: ExtractedWord[] = [];
    for (const window of windows) {
      for (const span of classifyProse(text, tree, window.from, window.to)) {
        words.push(...extractWords(text, span.from, span.to));
      }
    }
    if (words.length === 0) return [];

    const seq = arbiter.next();
    const checkWords = words.map((word, id) => ({ id, word: word.text }));
    return new Promise<Diagnostic[]>((resolve) => {
      pending.set(seq, { words, resolve });
      ensureWorker().postMessage({ type: 'check', seq, words: checkWords });
    });
  });
}
