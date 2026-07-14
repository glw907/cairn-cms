// The spellcheck Web Worker. It owns the spellchecker-wasm (SymSpell) instance and the dictionary,
// so the main thread never holds the 1.5MB corpus and never runs a lookup on the typing thread.
//
// This module is loaded the same dynamic-import way CodeMirror is: the editor constructs it with
// `new Worker(new URL('./spellcheck-worker.js', import.meta.url), { type: 'module' })`, and the
// consumer build (Vite) resolves and emits this file plus the wasm and dictionary it fetches. The
// wasm and dictionary are NEVER bundled into this JS; they arrive as two `fetch` Responses whose URLs
// the main thread passes in the `init` message, so they stay out-of-bundle fetched assets.
//
// spellchecker-wasm's browser entry is CommonJS and its class is not reachable as a typed named
// export under NodeNext, so the surface is typed structurally and the dynamic import is cast, the
// same pattern the carta editor uses.
//
// The Worker owns the MERGED SET, not just the dialect dictionary: a word is correct if the engine
// (the loaded dialect dictionary) says so, OR it is in the personal dictionary, OR it is in the
// session ignore list. The layering and message handling live in a pure handler factory below so
// they unit-test without a Worker or wasm; the engine sits behind a thin interface so the real wasm
// wrapper is injected in production and a fake is injected in tests (and nspell could drop in too).

/** A single suggested correction the SymSpell lookup returned. */
interface SuggestedItem {
  readonly term: string;
  readonly distance: number;
  readonly count: number;
}

/** The lookup options the wasm class accepts. SymSpell's Verbosity: 0 Top, 1 Closest, 2 All. */
interface CheckSpellingOptions {
  readonly verbosity: number;
  readonly maxEditDistance: number;
  readonly includeUnknown: boolean;
  readonly includeSelf: boolean;
}

/** The structural shape of the spellchecker-wasm browser class this worker drives. */
interface SpellcheckerWasm {
  prepareSpellchecker(
    wasmResponse: Response,
    dictionaryResponse: Response,
    bigramResponse?: Response | null,
  ): Promise<void>;
  checkSpelling(word: string, options?: CheckSpellingOptions): void;
}

/**
 * The thin engine seam. The handler talks only to this interface, so the merged-set logic is a pure
 * unit and any dialect-dictionary backend (spellchecker-wasm today, nspell tomorrow) can drop in.
 */
export interface SpellEngine {
  /** True when the word is correct per the loaded dialect dictionary (case-insensitive). */
  check(word: string): boolean;
  /** Ranked replacement terms for the word, the word itself dropped. */
  suggest(word: string): string[];
}

// Drives the check path. `includeSelf: true` makes a known word return itself at edit distance 0, so
// correctness is a distance-0 self match rather than the absence of suggestions (a rare misspelling
// can also return no suggestions). Verbosity Closest keeps the suggestion set tight.
const CHECK_OPTIONS: CheckSpellingOptions = {
  verbosity: 1,
  maxEditDistance: 2,
  includeUnknown: false,
  includeSelf: true,
};

// Drives the suggest path. `includeSelf: false` drops the word itself, so the list is replacements.
const SUGGEST_OPTIONS: CheckSpellingOptions = {
  verbosity: 1,
  maxEditDistance: 2,
  includeUnknown: false,
  includeSelf: false,
};

/**
 * The init message: the URLs of the two fetched assets, resolved by the consumer build. The
 * dictionaryUrl is the dialect dictionary the main thread resolved from `spellcheck.dialect` (Task 7,
 * defaulting to US English); the worker receives the resolved URL and does not read config itself.
 */
interface InitMessage {
  readonly type: 'init';
  readonly wasmUrl: string;
  readonly dictionaryUrl: string;
}

/** A batch spell check: each word carries a caller-side id so answers map back in any order. */
interface CheckMessage {
  readonly type: 'check';
  readonly seq: number;
  readonly words: ReadonlyArray<{ readonly id: number; readonly word: string }>;
}

/** A suggestion request for a single word. */
interface SuggestMessage {
  readonly type: 'suggest';
  readonly seq: number;
  readonly word: string;
}

/** Add a word (or a batch) to the in-memory personal dictionary, so a later check answers correct. */
interface AddWordMessage {
  readonly type: 'addWord';
  readonly word?: string;
  readonly words?: ReadonlyArray<string>;
}

/** Add a word to the in-memory session ignore list, so a later check answers correct for it. */
interface IgnoreWordMessage {
  readonly type: 'ignoreWord';
  readonly word: string;
}

type InboundMessage = InitMessage | CheckMessage | SuggestMessage | AddWordMessage | IgnoreWordMessage;

/** A message the handler can act on without the engine (every kind except init). */
type HandlerMessage = CheckMessage | SuggestMessage | AddWordMessage | IgnoreWordMessage;

/** The init ack, posted once the dictionary has streamed in and lookups are live. */
interface ReadyMessage {
  readonly type: 'ready';
}

/** The check answer: one verdict per requested word, correctness keyed by the caller's id. */
interface CheckResult {
  readonly type: 'checked';
  readonly seq: number;
  readonly results: ReadonlyArray<{ readonly id: number; readonly correct: boolean }>;
}

/** The suggest answer: a ranked list of replacement terms for the word. */
interface SuggestResult {
  readonly type: 'suggested';
  readonly seq: number;
  readonly word: string;
  readonly suggestions: ReadonlyArray<string>;
}

/** An init or lookup failure, surfaced to the main thread rather than thrown into the void. */
interface ErrorResult {
  readonly type: 'error';
  readonly detail: string;
}

export type OutboundMessage = ReadyMessage | CheckResult | SuggestResult | ErrorResult;

/** A capturing sink for outbound messages, so the handler never references `self` or `Worker`. */
type Post = (message: OutboundMessage) => void;

/**
 * Normalizes a curly apostrophe (U+2019) to the straight quote (U+0027) for lookup purposes only.
 * Word processors and paste-from-web prose routinely produce curly apostrophes, and the extraction
 * regex in `spellcheck.ts` already captures them, but the dictionary asset holds straight-quote
 * contractions only. Every lookup key (`isCorrect`, `addWord`, `ignoreWord`, `suggest`) normalizes
 * through this helper so a curly and a straight form of the same contraction share one dictionary
 * entry; the posted word text and diagnostic ranges stay untouched.
 */
function normalizeApostrophe(word: string): string {
  return word.replace(/’/g, "'");
}

/**
 * The pure message handler. It owns the personal dictionary and the session ignore set and answers
 * `check`/`suggest`/`addWord`/`ignoreWord` against the injected engine. It holds NO reference to a
 * Worker context: it posts through the sink it is handed, so a test drives it with a fake engine and
 * a capturing post.
 *
 * The merged set is layered: dialect (the engine), then site/personal, then session ignore. For a
 * boolean correctness verdict the order does not change the answer, but the layers are kept distinct
 * so the source of a verdict stays clear (and a future per-layer behavior has somewhere to live).
 */
export function createSpellcheckHandler(engine: SpellEngine): {
  handle(message: HandlerMessage, post: Post): void;
} {
  const personal = new Set<string>();
  const ignored = new Set<string>();

  function isCorrect(word: string): boolean {
    const normalized = normalizeApostrophe(word);
    const lower = normalized.toLowerCase();
    // Dialect first, then personal, then ignore. Sets are matched lowercased to mirror the engine's
    // case-insensitive lookup, so "Cairn" added once answers for "cairn".
    return engine.check(normalized) || personal.has(lower) || ignored.has(lower);
  }

  return {
    handle(message, post) {
      switch (message.type) {
        case 'check': {
          const results = message.words.map(({ id, word }) => ({ id, correct: isCorrect(word) }));
          post({ type: 'checked', seq: message.seq, results });
          break;
        }
        case 'suggest': {
          post({
            type: 'suggested',
            seq: message.seq,
            word: message.word,
            suggestions: engine.suggest(normalizeApostrophe(message.word)),
          });
          break;
        }
        case 'addWord': {
          if (message.word) personal.add(normalizeApostrophe(message.word).toLowerCase());
          if (message.words) {
            for (const w of message.words) personal.add(normalizeApostrophe(w).toLowerCase());
          }
          break;
        }
        case 'ignoreWord': {
          ignored.add(normalizeApostrophe(message.word).toLowerCase());
          break;
        }
      }
    },
  };
}

/**
 * The real engine: the spellchecker-wasm wrapper. SymSpell calls a result handler synchronously after
 * each lookup, so the wrapper captures the most recent items in a closure variable and reads them
 * right after `checkSpelling()` returns. This is the production engine handed to the handler on init.
 */
function createWasmEngine(instance: SpellcheckerWasm, latest: { items: SuggestedItem[] }): SpellEngine {
  return {
    check(word) {
      latest.items = [];
      instance.checkSpelling(word, CHECK_OPTIONS);
      // A word is correct when the lookup returns it unchanged at edit distance 0 (case-insensitive).
      const lower = word.toLowerCase();
      return latest.items.some((item) => item.distance === 0 && item.term.toLowerCase() === lower);
    },
    suggest(word) {
      latest.items = [];
      instance.checkSpelling(word, SUGGEST_OPTIONS);
      // SymSpell returns the items ranked by edit distance then frequency. Drop the word itself (a
      // distance-0 self match) so the list is replacements only.
      const lower = word.toLowerCase();
      return latest.items.filter((item) => item.term.toLowerCase() !== lower).map((item) => item.term);
    },
  };
}

async function createEngine(message: InitMessage): Promise<SpellEngine> {
  // The browser class accepts fetch Responses for both assets and streams the dictionary into wasm
  // memory in chunks, so the 1.5MB corpus is never held as one JS string. Import the class module
  // directly, not the package's `browser/index.js` UMD bundle: that bundle's UMD prelude references
  // `window` as the global root, which is undefined in a Worker. The class module is plain CommonJS
  // that Vite interops, so it loads off the main thread cleanly.
  const mod = (await import('spellchecker-wasm/lib/browser/SpellcheckerWasm.js')) as unknown as {
    SpellcheckerWasm: new (handler: (items: SuggestedItem[]) => void) => SpellcheckerWasm;
  };
  const latest = { items: [] as SuggestedItem[] };
  const instance = new mod.SpellcheckerWasm((items) => {
    latest.items = items;
  });
  const [wasmResponse, dictionaryResponse] = await Promise.all([
    fetch(message.wasmUrl),
    fetch(message.dictionaryUrl),
  ]);
  await instance.prepareSpellchecker(wasmResponse, dictionaryResponse);
  return createWasmEngine(instance, latest);
}

// The module-scope wiring runs only inside a Worker, where `self` and `addEventListener` exist. It is
// guarded so this module imports cleanly in node (the unit test imports the handler factory and the
// engine seam without a Worker context). On `init` it constructs the real wasm engine and a handler
// bound to it; every other message is delegated to the handler, which posts back through `self`.
if (typeof self !== 'undefined' && typeof (self as unknown as Worker).addEventListener === 'function') {
  const worker = self as unknown as Worker;
  const post: Post = (message) => worker.postMessage(message);

  let handler: ReturnType<typeof createSpellcheckHandler> | null = null;

  worker.addEventListener('message', (event: MessageEvent<InboundMessage>) => {
    const message = event.data;
    try {
      if (message.type === 'init') {
        void createEngine(message)
          .then((engine) => {
            handler = createSpellcheckHandler(engine);
            post({ type: 'ready' });
          })
          .catch((err) => {
            post({ type: 'error', detail: err instanceof Error ? err.message : String(err) });
          });
      } else if (!handler) {
        post({ type: 'error', detail: 'spellchecker not ready' });
      } else {
        handler.handle(message, post);
      }
    } catch (err) {
      post({ type: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  });
}
