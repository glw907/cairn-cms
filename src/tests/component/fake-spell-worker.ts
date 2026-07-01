import type { SpellWorker } from '../../lib/components/spellcheck.js';

// The real wasm and dictionary assets resolve through `import.meta.url` and do not load under the
// vitest browser dev server, and the 1.5MB dictionary is slow, so the spellcheck component layer drives
// a deterministic fake Worker through MarkdownEditor's `spellcheckTest` seam. The fake speaks the same
// inbound/outbound protocol the real worker does (init/ready, check/checked, suggest/suggested,
// addWord). It marks one chosen word wrong and everything else right, answers suggest with a canned
// ranked list, and after an addWord marks that word right so a re-lint clears its underline.

export interface FakeWorkerConfig {
  /** The lowercased words the engine treats as misspelled, until added to the personal set. */
  wrong: string[];
  /** The ranked suggestions a suggest round-trip returns for any word. */
  suggestions: string[];
  /** When true the fake posts a `ready` message after init, so the lint source waits for it the way it
   *  waits for the real worker. When false the test passes `assumeReady` instead. */
  announceReady?: boolean;
}

/** Build a fake SpellWorker plus a handle to read what it recorded. The worker answers on the same
 *  message listener the lint source registers, so the source's seq matching and re-lint run unchanged. */
export function makeFakeWorker(config: FakeWorkerConfig): { create: () => SpellWorker; added: Set<string> } {
  const added = new Set<string>();
  const wrong = new Set(config.wrong.map((w) => w.toLowerCase()));
  const listeners = new Set<(event: MessageEvent) => void>();

  const post = (data: unknown) => {
    const event = { data } as MessageEvent;
    for (const listener of listeners) listener(event);
  };

  const isCorrect = (word: string) => added.has(word.toLowerCase()) || !wrong.has(word.toLowerCase());

  const worker: SpellWorker = {
    postMessage(message: unknown) {
      const msg = message as {
        type?: string;
        seq?: number;
        words?: { id: number; word: string }[];
        word?: string;
      };
      if (msg.type === 'init') {
        if (config.announceReady) queueMicrotask(() => post({ type: 'ready' }));
        return;
      }
      if (msg.type === 'check') {
        const results = (msg.words ?? []).map((w) => ({ id: w.id, correct: isCorrect(w.word) }));
        queueMicrotask(() => post({ type: 'checked', seq: msg.seq, results }));
        return;
      }
      if (msg.type === 'suggest') {
        queueMicrotask(() => post({ type: 'suggested', seq: msg.seq, word: msg.word, suggestions: config.suggestions }));
        return;
      }
      if (msg.type === 'addWord' && typeof msg.word === 'string') {
        added.add(msg.word.toLowerCase());
        return;
      }
    },
    addEventListener(_type, listener) {
      listeners.add(listener);
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },
  };

  return { create: () => worker, added };
}

// The first CodeMirror mount pays the one-time cold-start of the editor's dynamic imports; under the
// full tri-project run the transform contention pushes that past the default 1s poll. The generous
// timeout absorbs it, matching MarkdownEditor.test.ts.
export const COLD_START = { timeout: 20000 };
