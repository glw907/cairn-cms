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

/** The init message: the URLs of the two fetched assets, resolved by the consumer build. */
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

type InboundMessage = InitMessage | CheckMessage | SuggestMessage;

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

type OutboundMessage = ReadyMessage | CheckResult | SuggestResult | ErrorResult;

// The result handler the wasm calls back synchronously after each lookup. The closure variable
// holds the most recent lookup's items so the calling code reads them right after checkSpelling().
let lastItems: SuggestedItem[] = [];
let speller: SpellcheckerWasm | null = null;

function post(message: OutboundMessage): void {
  (self as unknown as Worker).postMessage(message);
}

/** A word is correct when the lookup returns it unchanged at edit distance 0 (case-insensitive). */
function isCorrect(word: string, items: ReadonlyArray<SuggestedItem>): boolean {
  const lower = word.toLowerCase();
  return items.some((item) => item.distance === 0 && item.term.toLowerCase() === lower);
}

async function init(message: InitMessage): Promise<void> {
  // The browser class accepts fetch Responses for both assets and streams the dictionary into wasm
  // memory in chunks, so the 1.5MB corpus is never held as one JS string. Import the class module
  // directly, not the package's `browser/index.js` UMD bundle: that bundle's UMD prelude references
  // `window` as the global root, which is undefined in a Worker. The class module is plain CommonJS
  // that Vite interops, so it loads off the main thread cleanly.
  const mod = (await import('spellchecker-wasm/lib/browser/SpellcheckerWasm.js')) as unknown as {
    SpellcheckerWasm: new (handler: (items: SuggestedItem[]) => void) => SpellcheckerWasm;
  };
  const instance = new mod.SpellcheckerWasm((items) => {
    lastItems = items;
  });
  const [wasmResponse, dictionaryResponse] = await Promise.all([
    fetch(message.wasmUrl),
    fetch(message.dictionaryUrl),
  ]);
  await instance.prepareSpellchecker(wasmResponse, dictionaryResponse);
  speller = instance;
  post({ type: 'ready' });
}

function check(message: CheckMessage): void {
  if (!speller) throw new Error('spellchecker not ready');
  const results = message.words.map(({ id, word }) => {
    lastItems = [];
    speller!.checkSpelling(word, CHECK_OPTIONS);
    return { id, correct: isCorrect(word, lastItems) };
  });
  post({ type: 'checked', seq: message.seq, results });
}

function suggest(message: SuggestMessage): void {
  if (!speller) throw new Error('spellchecker not ready');
  lastItems = [];
  speller.checkSpelling(message.word, SUGGEST_OPTIONS);
  // SymSpell returns the items ranked by edit distance then frequency. Drop the word itself (a
  // distance-0 self match) so the list is replacements only.
  const lower = message.word.toLowerCase();
  const suggestions = lastItems
    .filter((item) => item.term.toLowerCase() !== lower)
    .map((item) => item.term);
  post({ type: 'suggested', seq: message.seq, word: message.word, suggestions });
}

self.addEventListener('message', (event: MessageEvent<InboundMessage>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      void init(message).catch((err) => {
        post({ type: 'error', detail: err instanceof Error ? err.message : String(err) });
      });
    } else if (message.type === 'check') {
      check(message);
    } else if (message.type === 'suggest') {
      suggest(message);
    }
  } catch (err) {
    post({ type: 'error', detail: err instanceof Error ? err.message : String(err) });
  }
});
