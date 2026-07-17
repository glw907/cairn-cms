import { describe, it, expect } from 'vitest';
import { stripComments, spacingBracketHits, durationHits, achromaticColorHits } from '../../../scripts/check-invisible-craft.mjs';

describe('spacingBracketHits', () => {
  it('finds an unallowlisted bracket in live markup', () => {
    const source = '<div class="mt-[13px]"></div>';
    expect(spacingBracketHits(source)).toEqual([{ line: 1, token: 'mt-[13px]' }]);
  });

  // Regression: the spacing rule used to scan raw source, unlike its two sibling rules
  // (durationHits, achromaticColorHits), which both scan comment-stripped source. A doc comment
  // that merely NAMES a retired or example bracket (explaining why py-[5px] was removed, say)
  // must never itself count as a hit; only stripComments(source) guarantees that.
  it('ignores a spacing bracket that appears only inside a comment', () => {
    const source = [
      '<!-- retired py-[5px] in favor of the 4/8px scale -->',
      '<script>',
      '  // was gap-[10px] before the F3 pass',
      '</script>',
      '<div class="gap-2"></div>',
    ].join('\n');
    expect(spacingBracketHits(stripComments(source))).toEqual([]);
    // The raw source DOES carry the tokens; the caller must strip comments first, exactly as
    // evaluate() now does.
    expect(spacingBracketHits(source).length).toBeGreaterThan(0);
  });

  it('still finds a live bracket alongside an unrelated comment', () => {
    const source = ['<!-- some doc comment -->', '<div class="p-[3px]"></div>'].join('\n');
    expect(spacingBracketHits(stripComments(source))).toEqual([{ line: 2, token: 'p-[3px]' }]);
  });
});

// stripComments itself, and its interplay with the other two rules, are already covered by the
// existing scripted gate; this just pins that durationHits/achromaticColorHits keep working
// against a comment-stripped source the same way spacingBracketHits now does.
describe('durationHits and achromaticColorHits share the comment-stripped posture', () => {
  it('ignores a duration or an achromatic color mentioned only in a comment', () => {
    const source = ['/* transition: color 999ms; */', '/* #000 was here */', 'a { color: red; }'].join('\n');
    expect(durationHits(stripComments(source))).toEqual([]);
    expect(achromaticColorHits(stripComments(source))).toEqual([]);
  });
});
