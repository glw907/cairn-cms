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
import type { EditorView } from '@codemirror/view';
import { frontmatterSpan, fenceTokens } from './markdown-directives.js';
import { parseMediaToken } from '../media/reference.js';
import { objectiveErrors, type ObjectiveError } from './objective-errors.js';

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

// The most suggestions shown in one tooltip. SymSpell can return a long ranked list; five is the
// spec cap, enough to cover the likely correction without burying the management actions below a
// wall of near-ties.
const MAX_SUGGESTIONS = 5;

/** The callbacks the management actions invoke. The lint source supplies these so the pure builder
 *  never touches the Worker or the re-lint mechanism: it only wires the buttons to these handlers. */
export interface SpellDiagnosticActions {
  /** Add the word to the personal dictionary (posts addWord, records the pending addition, re-lints). */
  onAddWord(word: string): void;
  /** Ignore the word for this session only (posts ignoreWord, re-lints). */
  onIgnoreWord(word: string): void;
}

/**
 * Build the correction popover for one misspelled word, as a @codemirror/lint Diagnostic whose
 * `actions` CodeMirror renders as tooltip buttons (no custom popover code). The actions, in order:
 * up to five ranked suggestions (each replaces the word's range with one transaction), then "Add to
 * dictionary", then "Ignore". The severity is `info` so the underline is quiet, and the message names
 * the word so the underline is never the only signal. Pure: it takes canned suggestions and callbacks,
 * so the unit test asserts the actions array without a browser or a real Worker.
 */
export function buildSpellDiagnostic(
  word: string,
  range: Range,
  suggestions: readonly string[],
  callbacks: SpellDiagnosticActions,
): Diagnostic {
  const ranked = suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion) => ({
    name: suggestion,
    // CodeMirror passes the diagnostic's current position, which may have shifted since the lint ran;
    // the replace uses that live range so a suggestion never overwrites the wrong span after an edit.
    apply: (view: EditorView, from: number, to: number) => {
      view.dispatch({ changes: { from, to, insert: suggestion } });
    },
  }));

  return {
    from: range.from,
    to: range.to,
    severity: 'info',
    source: 'cairn-spellcheck',
    message: `\`${word}\` may be misspelled.`,
    actions: [
      ...ranked,
      {
        name: 'Add to dictionary',
        apply: () => callbacks.onAddWord(word),
      },
      {
        name: 'Ignore',
        apply: () => callbacks.onIgnoreWord(word),
      },
    ],
  };
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

/**
 * Build the quick-fix popover for one objective-error finding, as a @codemirror/lint Diagnostic whose
 * one `actions` entry applies the finding's deterministic fix. The severity is `info` so the underline
 * shares the spellcheck surface and the locked amber color (an editor reads spelling and these
 * mechanical errors as one "spellcheck" layer). The fix range is recomputed from the live diagnostic
 * position CodeMirror passes, offset by the same delta as the original finding, so an edit elsewhere
 * never makes the fix overwrite the wrong span. Pure: it takes a finding, so the unit test asserts the
 * diagnostic without a browser.
 */
export function buildObjectiveDiagnostic(error: ObjectiveError): Diagnostic {
  // The fix range sits inside the flagged range; record its offset from the flagged start so the apply
  // can re-anchor against the live position CodeMirror reports (which may have shifted since the lint).
  const fixOffsetFrom = error.fix.from - error.from;
  const fixOffsetTo = error.fix.to - error.from;
  const insert = error.fix.insert;
  return {
    from: error.from,
    to: error.to,
    severity: 'info',
    source: 'cairn-objective',
    message: error.message,
    actions: [
      {
        name: 'Fix',
        apply: (view: EditorView, from: number) => {
          view.dispatch({
            changes: { from: from + fixOffsetFrom, to: from + fixOffsetTo, insert },
          });
        },
      },
    ],
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
let viewMod: typeof import('@codemirror/view') | null = null;

/** The narrow Worker surface the lint source drives: it posts check, suggest, addWord, and ignoreWord
 *  messages and listens for the answers. A `suggest` answer is a one-shot, so the source removes its
 *  own listener once it lands. A test injects a fake; production injects a real Worker. */
export interface SpellWorker {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

/** Construct the real spellcheck Worker, the spike's delivery shape. Kept behind the seam so the
 *  lint source never references `Worker` at module scope and a test can swap it. */
export function createSpellWorker(): SpellWorker {
  return new Worker(new URL('./spellcheck-worker.js', import.meta.url), {
    type: 'module',
  }) as unknown as SpellWorker;
}

// The wasm and dictionary URLs are resolved module-relative with `import.meta.url`, the same
// mechanism createSpellWorker uses for the worker. The spike (docs/internal/design/
// 2026-06-20-editor-copyedit-spike-result.md) proved Vite's `?worker`/`?url` package-subpath imports
// from CONSUMER app code; the library's own source cannot self-import by package name, so it uses the
// portable `new URL('./asset', import.meta.url)` form Vite resolves inside dependencies too. Task 16's
// showcase E2E proves the whole chain through the real consumer build; if resolution ever fails there,
// only these two URL lines change. The dictionary filename is the dialect-resolved one the main thread
// passes in; the wasm filename is fixed.

/** The real wasm asset URL, resolved module-relative the same way the worker is. */
export function resolveWasmUrl(): string {
  return new URL('./spellcheck-assets/spellchecker-wasm.wasm', import.meta.url).href;
}

/** The real dictionary asset URL for a dictionary filename, resolved module-relative. The caller
 *  passes the dialect-resolved filename (default `dictionary-en-us.txt`). */
export function resolveDictionaryUrl(dictionaryFile: string): string {
  return new URL(`./spellcheck-assets/${dictionaryFile}`, import.meta.url).href;
}

/** How far past the visible viewport to lint, so a small scroll does not re-lint from scratch. */
const VIEWPORT_MARGIN = 1000;

/** Options for {@link cairnSpellcheck}, so the unit and component layers can inject a fake Worker
 *  factory in place of the real `new Worker(...)`. */
export interface SpellcheckOptions {
  /** The Worker factory; defaults to {@link createSpellWorker}. Created lazily on the first lint. */
  createWorker?: () => SpellWorker;
  /** The pending personal-dictionary additions, owned by the caller. When an author chooses "Add to
   *  dictionary" the source posts addWord to the Worker (the underline clears at once) and records the
   *  word here. The set is the seam Task 9 commits to the git-backed dictionary file; this source only
   *  fills it and never persists. A caller that does not pass one gets a fresh internal set. */
  pendingAdditions?: Set<string>;
  /** The dialect-resolved dictionary filename, e.g. "dictionary-en-us.txt". The source resolves it to
   *  a real asset URL and posts it in the Worker's `init`. Defaults to US English. */
  dictionaryFile?: string;
  /** Override the resolved wasm and dictionary URLs the source posts in `init`. The real resolution
   *  uses {@link resolveWasmUrl}/{@link resolveDictionaryUrl} (module-relative `import.meta.url`); a
   *  component test that injects a fake Worker can pass canned URLs so it never touches the asset
   *  resolver. */
  assetUrls?: { wasmUrl: string; dictionaryUrl: string };
  /** Treat the Worker as ready without waiting for a `ready` message. The production path is strict
   *  (it posts `init` and waits for `ready` before painting); a fake Worker in a test that does not
   *  answer `ready` can set this so a lint run is not held back. Defaults to false. */
  assumeReady?: boolean;
  /** The already-loaded CodeMirror modules to reuse instead of importing them again. The editor
   *  component loads `@codemirror/view`/`@codemirror/language` for its own extensions, so passing them
   *  here keeps the lint source on the SAME module instances; a second dynamic import can resolve to a
   *  separate copy (the test bundler's dedup quirk), and CodeMirror's instanceof checks then reject the
   *  extension. When omitted, the source imports them itself (the standalone path). `@codemirror/lint`
   *  is loaded here when not supplied, since the editor does not otherwise need it. */
  modules?: {
    lint?: typeof import('@codemirror/lint');
    language?: typeof import('@codemirror/language');
    view?: typeof import('@codemirror/view');
  };
}

// The lint underline is LOCKED to --cairn-warning-ink (a muted amber, the closest shipped token to
// the spec's "neither the directive accent nor error red"; there is no --cairn-info-ink). Spellcheck
// diagnostics carry severity `info`, so the override targets the `info` underline and tooltip row.
// --cairn-error-ink red is reserved for tidy deletions, so a spellcheck underline and a tidy deletion
// are never the same color. The tooltip rides the admin Warm Stone tokens and the focus rules; the
// lint action buttons are CodeMirror's own focusable buttons, so the theme only restores a visible
// focus ring (the admin base button reset strips the UA outline). The wavy underline uses a CSS
// text-decoration so the locked token resolves at render rather than being baked into a static SVG.
function lockedUnderlineTheme(EditorViewMod: typeof import('@codemirror/view').EditorView): Extension {
  return EditorViewMod.theme({
    // The amber wavy underline, the one spellcheck underline color across the feature.
    '.cm-lintRange-info': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--cairn-warning-ink, oklch(50% 0.13 70))',
      textDecorationSkipInk: 'none',
      textUnderlineOffset: '0.2em',
    },
    // The tooltip surface rides the admin Warm Stone tokens.
    '.cm-tooltip.cm-tooltip-lint': {
      backgroundColor: 'var(--color-base-100, #fff)',
      border: '1px solid var(--color-base-300, oklch(90% 0.01 75))',
      borderRadius: '0.5rem',
      color: 'var(--color-base-content, oklch(28% 0.01 75))',
    },
    '.cm-diagnostic-info': {
      borderLeftColor: 'var(--cairn-warning-ink, oklch(50% 0.13 70))',
    },
    // The action buttons are real focusable buttons; the admin base reset strips the UA outline, so a
    // visible focus ring is restored here to keep them keyboard-discoverable (the a11y focus rule).
    '.cm-diagnosticAction:focus-visible': {
      outline: '2px solid var(--cairn-warning-ink, oklch(50% 0.13 70))',
      outlineOffset: '1px',
    },
  });
}

/**
 * The @codemirror/lint linter() source, made markdown-aware by the Lezer tree. It runs over the
 * visible viewport plus a margin (not the whole document), extracts the checkable words via the pure
 * classifier, posts them to the Worker keyed by a monotonic latest-wins seq, and maps the
 * `correct: false` answers back to ranges. Each wrong word becomes a correction popover: the source
 * fetches the ranked suggestions in the same batch, then {@link buildSpellDiagnostic} wires the
 * quick-fix actions (the suggestions, then add-to-dictionary, then ignore). The returned extension
 * bundles the spellcheck linter, a second deterministic objective-error linter over the same prose
 * spans (doubled words, double spaces, repeated punctuation), and the locked amber underline theme,
 * so Task 7's single on/off toggle gates both surfaces by reconfiguring this one extension.
 */
export async function cairnSpellcheck(options: SpellcheckOptions = {}): Promise<Extension> {
  // Reuse the caller's already-loaded modules when supplied (the editor passes its own view/language
  // copies so the lint extension lands on the same instances), else lazily value-import them. The lazy
  // imports keep CodeMirror off the server bundle (the boundary the editor relies on) and match how
  // link-completion.ts resolves @codemirror/language inside its source.
  lintMod = options.modules?.lint ?? lintMod ?? (await import('@codemirror/lint'));
  langMod = options.modules?.language ?? langMod ?? (await import('@codemirror/language'));
  viewMod = options.modules?.view ?? viewMod ?? (await import('@codemirror/view'));
  const { linter, forceLinting } = lintMod;
  const { syntaxTree } = langMod;
  const { EditorView } = viewMod;

  const createWorker = options.createWorker ?? createSpellWorker;
  const pendingAdditions = options.pendingAdditions ?? new Set<string>();
  const arbiter = arbitrateChecked();
  // The wasm and dictionary URLs the Worker fetches, resolved module-relative unless the caller
  // overrides them (a test injecting a fake Worker passes canned URLs). The dictionary filename is the
  // dialect-resolved one; the wasm filename is fixed.
  const assetUrls = options.assetUrls ?? {
    wasmUrl: resolveWasmUrl(),
    dictionaryUrl: resolveDictionaryUrl(options.dictionaryFile ?? 'dictionary-en-us.txt'),
  };

  let worker: SpellWorker | null = null;
  // The Worker answers `ready` once its dictionary has streamed into wasm; until then a lint run paints
  // nothing rather than throwing. A test can set assumeReady to skip the wait when its fake Worker does
  // not answer `ready`.
  let ready = options.assumeReady ?? false;
  // The view from the latest lint run, captured so a management action can re-lint through it. The
  // action callbacks fire long after the source promise resolved, so the source cannot close over a
  // run-local view; it stores the last one here.
  let lastView: EditorView | null = null;
  // The in-flight check requests keyed by their seq, each resolved by the matching `checked` answer.
  const pending = new Map<
    number,
    { words: ExtractedWord[]; resolve: (diagnostics: Diagnostic[]) => void }
  >();
  // A monotonic seq for suggest round-trips, separate from the check seq so the two answer streams
  // never collide on a shared counter.
  let suggestSeq = 0;

  function ensureWorker(): SpellWorker {
    if (worker) return worker;
    worker = createWorker();
    worker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        seq?: number;
        results?: { id: number; correct: boolean }[];
        detail?: string;
      };
      // The init ack: lookups are live. Re-lint so the viewport paints the underlines the not-ready
      // runs withheld; the latest-wins seq keeps the re-lint from racing an in-flight run.
      if (data.type === 'ready') {
        ready = true;
        if (lastView) forceLinting(lastView);
        return;
      }
      // An init or lookup failure: log it and leave the editor usable (no underlines is the graceful
      // degrade, never a thrown error). A `check` that arrives after this still resolves to [] below.
      if (data.type === 'error') {
        console.warn('cairn spellcheck worker error:', data.detail ?? 'unknown');
        return;
      }
      if (data.type !== 'checked' || typeof data.seq !== 'number') return;
      const request = pending.get(data.seq);
      if (!request) return;
      pending.delete(data.seq);
      // Drop a stale answer that landed after a newer run; only the latest seq paints underlines.
      if (!arbiter.accept(data.seq)) {
        request.resolve([]);
        return;
      }
      const wrongIds = new Set((data.results ?? []).filter((r) => !r.correct).map((r) => r.id));
      const wrong = request.words.filter((_, id) => wrongIds.has(id));
      // Fetch the ranked suggestions for every wrong word, then build the popovers from the answers.
      void buildDiagnostics(wrong).then(request.resolve);
    });
    // The handshake: post init so the Worker streams its dictionary, then wait for `ready` before any
    // check/suggest. The Worker answers `error` on a check that lands before ready, so the not-ready
    // early return in the lint source keeps a check from ever racing the init.
    worker.postMessage({ type: 'init', ...assetUrls });
    return worker;
  }

  /** Fetch a single word's ranked suggestions over the Worker, a one-shot listener removed on the
   *  answer. The suggest path is independent of the check seq, so a slow suggest never blocks a fresh
   *  check; an empty list (the engine returned nothing) still yields a popover with the two
   *  management actions. */
  function fetchSuggestions(w: SpellWorker, word: string): Promise<string[]> {
    suggestSeq += 1;
    const seq = suggestSeq;
    return new Promise<string[]>((resolve) => {
      const listener = (event: MessageEvent) => {
        const data = event.data as { type?: string; seq?: number; suggestions?: string[] };
        if (data.type !== 'suggested' || data.seq !== seq) return;
        w.removeEventListener('message', listener);
        resolve(data.suggestions ?? []);
      };
      w.addEventListener('message', listener);
      w.postMessage({ type: 'suggest', seq, word });
    });
  }

  /** Turn the wrong words into correction popovers, each carrying its ranked suggestions and the two
   *  management actions. */
  async function buildDiagnostics(wrong: ExtractedWord[]): Promise<Diagnostic[]> {
    const w = ensureWorker();
    const callbacks: SpellDiagnosticActions = {
      onAddWord(word) {
        // Post addWord so the Worker's merged set now answers correct, record the pending addition for
        // Task 9 to commit, and re-lint so every instance of the word clears at once.
        w.postMessage({ type: 'addWord', word });
        pendingAdditions.add(word.toLowerCase());
        if (lastView) forceLinting(lastView);
      },
      onIgnoreWord(word) {
        // Session-only ignore, never persisted; re-lint so the underline clears everywhere.
        w.postMessage({ type: 'ignoreWord', word });
        if (lastView) forceLinting(lastView);
      },
    };
    return Promise.all(
      wrong.map(async (word) => {
        const suggestions = await fetchSuggestions(w, word.text);
        return buildSpellDiagnostic(word.text, { from: word.from, to: word.to }, suggestions, callbacks);
      }),
    );
  }

  const source = linter(async (view) => {
    lastView = view;
    // Create the Worker (and post init) on the first run even when not yet ready, so the dictionary
    // starts streaming. Until `ready` lands this run paints nothing; the `ready` handler re-lints.
    ensureWorker();
    if (!ready) return [];
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

  // The objective-error source: a second linter() over the SAME viewport-scoped prose spans the
  // spellcheck source uses, so a doubled word inside a code fence is never flagged. It is synchronous
  // and deterministic (no Worker, no dictionary), and its diagnostics carry `info` so they share the
  // locked amber underline. It ships in the same returned extension as the spellcheck source, so the
  // Task 7 toggle reconfigures one compartment to gate both surfaces at once.
  const objectiveSource = linter((view) => {
    const text = view.state.doc.toString();
    const tree = syntaxTree(view.state);
    const docLength = text.length;
    const windows = view.visibleRanges.map((vr) => ({
      from: Math.max(0, vr.from - VIEWPORT_MARGIN),
      to: Math.min(docLength, vr.to + VIEWPORT_MARGIN),
    }));
    const spans: Range[] = [];
    for (const window of windows) {
      spans.push(...classifyProse(text, tree, window.from, window.to));
    }
    return objectiveErrors(text, spans).map(buildObjectiveDiagnostic);
  });

  return [source, objectiveSource, lockedUnderlineTheme(EditorView)];
}
