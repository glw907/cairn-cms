import { describe, it, expect } from 'vitest';
import { paragraphRange } from '../../lib/components/editor-modes.js';

describe('paragraphRange', () => {
  it('returns the contiguous non-blank block around the caret line', () => {
    const lines = ['alpha', '', 'one', 'two', 'three', '', 'omega'];
    expect(paragraphRange(lines, 2)).toEqual({ fromLine: 2, toLine: 4 });
    expect(paragraphRange(lines, 3)).toEqual({ fromLine: 2, toLine: 4 });
    expect(paragraphRange(lines, 4)).toEqual({ fromLine: 2, toLine: 4 });
  });

  it('returns just the caret line inside a blank run', () => {
    const lines = ['alpha', '', '', 'omega'];
    expect(paragraphRange(lines, 1)).toEqual({ fromLine: 1, toLine: 1 });
    expect(paragraphRange(lines, 2)).toEqual({ fromLine: 2, toLine: 2 });
    // Whitespace-only lines count as blank, the same as the empty string.
    expect(paragraphRange(['alpha', '  \t', 'omega'], 1)).toEqual({ fromLine: 1, toLine: 1 });
  });

  it('clamps at the document edges', () => {
    // A paragraph touching the first or last line stops at the boundary.
    expect(paragraphRange(['one', 'two', '', 'tail'], 0)).toEqual({ fromLine: 0, toLine: 1 });
    expect(paragraphRange(['head', '', 'one', 'two'], 3)).toEqual({ fromLine: 2, toLine: 3 });
    // A single-line document is its own paragraph.
    expect(paragraphRange(['only'], 0)).toEqual({ fromLine: 0, toLine: 0 });
    // An out-of-range caret clamps into the document instead of walking off it.
    expect(paragraphRange(['one', 'two'], 9)).toEqual({ fromLine: 0, toLine: 1 });
    expect(paragraphRange(['one', 'two'], -1)).toEqual({ fromLine: 0, toLine: 1 });
  });
});
