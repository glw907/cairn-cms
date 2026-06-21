// Unit tests for the spellcheck worker's merged-set logic, driving the handler factory with a fake
// engine and a capturing post. The real wasm engine and the dictionary streaming are not loaded here:
// that path is proven by the Task 1 spike E2E and re-proven in Task 16. These tests exercise the pure
// merged-set layering (dialect engine, then personal/site, then session ignore) and the protocol shapes.

import { describe, it, expect } from 'vitest';
import {
  createSpellcheckHandler,
  type SpellEngine,
  type OutboundMessage,
} from '../../lib/components/spellcheck-worker.js';

/** A fake engine: a fixed correct-word set, plus a fixed suggestion list for the suggest path. */
function fakeEngine(correctWords: ReadonlyArray<string>, suggestions: ReadonlyArray<string> = []): SpellEngine {
  const correct = new Set(correctWords.map((w) => w.toLowerCase()));
  return {
    check: (word) => correct.has(word.toLowerCase()),
    suggest: () => [...suggestions],
  };
}

/** Drives the handler and collects every posted message. */
function drive(engine: SpellEngine) {
  const posted: OutboundMessage[] = [];
  const handler = createSpellcheckHandler(engine);
  return {
    posted,
    send: (msg: Parameters<typeof handler.handle>[0]) => handler.handle(msg, (m) => posted.push(m)),
  };
}

describe('createSpellcheckHandler', () => {
  it('a check batch returns the right correct flags against the engine', () => {
    const { posted, send } = drive(fakeEngine(['hello']));
    send({
      type: 'check',
      seq: 1,
      words: [
        { id: 10, word: 'hello' },
        { id: 11, word: 'wrold' },
      ],
    });
    expect(posted).toEqual([
      {
        type: 'checked',
        seq: 1,
        results: [
          { id: 10, correct: true },
          { id: 11, correct: false },
        ],
      },
    ]);
  });

  it('a suggest returns the engine ranked list', () => {
    const { posted, send } = drive(fakeEngine([], ['world', 'word']));
    send({ type: 'suggest', seq: 2, word: 'wrold' });
    expect(posted).toEqual([{ type: 'suggested', seq: 2, word: 'wrold', suggestions: ['world', 'word'] }]);
  });

  it('addWord makes a previously-incorrect word correct on the next check', () => {
    const { posted, send } = drive(fakeEngine(['hello']));
    send({ type: 'check', seq: 1, words: [{ id: 1, word: 'cairn' }] });
    expect(posted[0]).toEqual({ type: 'checked', seq: 1, results: [{ id: 1, correct: false }] });

    send({ type: 'addWord', word: 'cairn' });
    send({ type: 'check', seq: 2, words: [{ id: 1, word: 'cairn' }] });
    expect(posted[1]).toEqual({ type: 'checked', seq: 2, results: [{ id: 1, correct: true }] });
  });

  it('addWord accepts a batch of words', () => {
    const { posted, send } = drive(fakeEngine([]));
    send({ type: 'addWord', words: ['foo', 'bar'] });
    send({
      type: 'check',
      seq: 1,
      words: [
        { id: 1, word: 'foo' },
        { id: 2, word: 'bar' },
      ],
    });
    expect(posted[0]).toEqual({
      type: 'checked',
      seq: 1,
      results: [
        { id: 1, correct: true },
        { id: 2, correct: true },
      ],
    });
  });

  it('ignoreWord makes a previously-incorrect word correct for the session', () => {
    const { posted, send } = drive(fakeEngine(['hello']));
    send({ type: 'check', seq: 1, words: [{ id: 1, word: 'teh' }] });
    expect(posted[0]).toEqual({ type: 'checked', seq: 1, results: [{ id: 1, correct: false }] });

    send({ type: 'ignoreWord', word: 'teh' });
    send({ type: 'check', seq: 2, words: [{ id: 1, word: 'teh' }] });
    expect(posted[1]).toEqual({ type: 'checked', seq: 2, results: [{ id: 1, correct: true }] });
  });

  it('respects the merged-set ordering: dialect engine, then personal/site, then ignore', () => {
    // The engine knows only "colour" (the dialect layer). "brandname" is correct via the personal
    // layer, "typo" via the session ignore layer. A word in no layer stays incorrect.
    const { posted, send } = drive(fakeEngine(['colour']));
    send({ type: 'addWord', word: 'brandname' });
    send({ type: 'ignoreWord', word: 'typo' });
    send({
      type: 'check',
      seq: 1,
      words: [
        { id: 1, word: 'colour' },
        { id: 2, word: 'brandname' },
        { id: 3, word: 'typo' },
        { id: 4, word: 'unknown' },
      ],
    });
    expect(posted[0]).toEqual({
      type: 'checked',
      seq: 1,
      results: [
        { id: 1, correct: true },
        { id: 2, correct: true },
        { id: 3, correct: true },
        { id: 4, correct: false },
      ],
    });
  });

  it('matches the personal and ignore sets case-insensitively, like the engine', () => {
    const { posted, send } = drive(fakeEngine([]));
    send({ type: 'addWord', word: 'Cairn' });
    send({ type: 'ignoreWord', word: 'Teh' });
    send({
      type: 'check',
      seq: 1,
      words: [
        { id: 1, word: 'cairn' },
        { id: 2, word: 'TEH' },
      ],
    });
    expect(posted[0]).toEqual({
      type: 'checked',
      seq: 1,
      results: [
        { id: 1, correct: true },
        { id: 2, correct: true },
      ],
    });
  });
});
