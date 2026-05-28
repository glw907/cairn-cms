import { describe, it, expect, vi } from 'vitest';
import { cartaEditor } from '../lib/editor';

// A minimal Carta stand-in exposing only the `input` surface the wrapper reads.
function fakeCarta(start: number) {
  const insertAt = vi.fn();
  return {
    carta: {
      input: {
        getSelection: () => ({ start, end: start, direction: 'none' as const, slice: '' }),
        insertAt,
      },
    },
    insertAt,
  };
}

describe('cartaEditor', () => {
  it('inserts text at the current selection start', () => {
    const { carta, insertAt } = fakeCarta(12);
    const editor = cartaEditor(() => carta as never);
    editor.insertComponent(':::card\n\n:::\n');
    expect(insertAt).toHaveBeenCalledWith(12, ':::card\n\n:::\n');
  });

  it('is a no-op when the editor has not mounted yet (input undefined)', () => {
    const editor = cartaEditor(() => ({ input: undefined }) as never);
    expect(() => editor.insertComponent('x')).not.toThrow();
  });
});
