import { describe, it, expect } from 'vitest';
import {
  classAttributeTokens,
  classDirectiveTokens,
  scopedClassNames,
  isCheckable,
  findUncompiledClasses,
} from '../../../scripts/check-admin-css-classes.mjs';

describe('classAttributeTokens', () => {
  it('reads the static tokens of a plain class attribute', () => {
    const source = '<div class="join toolkit-toolbar-segmented" role="radiogroup"></div>';
    expect(classAttributeTokens(source).map((h) => h.token)).toEqual(['join', 'toolkit-toolbar-segmented']);
  });

  it('reads a quoted literal from inside a ternary expression, alongside the static tokens', () => {
    const source = `<button class="join-item btn btn-sm {option.value === filter.value ? 'btn-active' : ''}"></button>`;
    expect(classAttributeTokens(source).map((h) => h.token)).toEqual(['join-item', 'btn', 'btn-sm', 'btn-active']);
  });

  it('reports the 1-based line of each attribute', () => {
    const source = '<div>\n  <span class="badge badge-neutral"></span>\n</div>';
    expect(classAttributeTokens(source).map((h) => h.line)).toEqual([2, 2]);
  });

  // Regression: a comparison operand quoted inside the ternary's own condition (`size === 'xs'`)
  // is not itself a class name; only the ternary's two output branches are. The naive "every
  // quoted literal in the expression" reading flagged StatusChip's own `'xs'` size-comparison
  // literal as a phantom class token.
  it('never reads a ternary condition\'s own comparison operand as a class token', () => {
    const source = `<span class="badge {size === 'xs' ? 'badge-xs' : 'badge-sm'}"></span>`;
    expect(classAttributeTokens(source).map((h) => h.token)).toEqual(['badge', 'badge-xs', 'badge-sm']);
  });
});

describe('classDirectiveTokens', () => {
  it('reads a class:token directive name', () => {
    const source = '<div class="dropdown" class:dropdown-open={overflowOpen}></div>';
    expect(classDirectiveTokens(source).map((h) => h.token)).toEqual(['dropdown-open']);
  });

  it('reads a variant-prefixed class:token directive name whole, colon included', () => {
    const source = '<div class:lg:drawer-open={!isDeskRoute}></div>';
    expect(classDirectiveTokens(source).map((h) => h.token)).toEqual(['lg:drawer-open']);
  });
});

describe('scopedClassNames', () => {
  it('collects every class selector the component\'s own <style> block defines', () => {
    const source = [
      '<div class="toolkit-toolbar-segmented"></div>',
      '<style>',
      '  .toolkit-toolbar-segmented { flex-wrap: wrap; }',
      '  .toolkit-toolbar-pill-remove { padding: 0; }',
      '</style>',
    ].join('\n');
    expect(scopedClassNames(source)).toEqual(new Set(['toolkit-toolbar-segmented', 'toolkit-toolbar-pill-remove']));
  });

  it('returns an empty set for a component with no <style> block', () => {
    expect(scopedClassNames('<div class="btn"></div>')).toEqual(new Set());
  });
});

describe('isCheckable', () => {
  it('accepts a plain daisy or Tailwind token, including a leading-hyphen negative utility', () => {
    expect(isCheckable('join')).toBe(true);
    expect(isCheckable('btn-active')).toBe(true);
    expect(isCheckable('-ml-px')).toBe(true);
  });

  it('rejects a variant-prefixed token and an arbitrary-value bracket token', () => {
    expect(isCheckable('sm:table-cell')).toBe(false);
    expect(isCheckable('text-[0.8125rem]')).toBe(false);
  });

  it('rejects an empty token', () => {
    expect(isCheckable('')).toBe(false);
  });
});

describe('findUncompiledClasses', () => {
  it('flags a class referenced in markup that the compiled sheet never defines', () => {
    const source = '<div class="join toolkit-toolbar-segmented" role="radiogroup"></div>\n<style>\n  .toolkit-toolbar-segmented { flex-wrap: wrap; }\n</style>';
    // The compiled sheet carries every OTHER class this component uses except `.join`, the exact
    // shape of the bug this gate exists to catch: a class in markup with no compiled rule.
    const compiledCss = ':where([data-theme]) .btn { display: inline-flex; }';
    const findings = findUncompiledClasses(source, compiledCss);
    expect(findings.map((f) => f.token)).toEqual(['join']);
  });

  it('passes once the compiled sheet carries every referenced class', () => {
    const source = '<div class="join toolkit-toolbar-segmented" role="radiogroup"></div>\n<style>\n  .toolkit-toolbar-segmented { flex-wrap: wrap; }\n</style>';
    const compiledCss = ':where([data-theme]) .join { display: inline-flex; }';
    expect(findUncompiledClasses(source, compiledCss)).toEqual([]);
  });

  it('never flags a component-scoped class the <style> block itself defines', () => {
    const source = '<div class="toolkit-toolbar-segmented"></div>\n<style>\n  .toolkit-toolbar-segmented { flex-wrap: wrap; }\n</style>';
    // No daisy/Tailwind rule for toolkit-toolbar-segmented anywhere; it is locally scoped, not the
    // admin sheet's job, so it must never be reported.
    expect(findUncompiledClasses(source, '')).toEqual([]);
  });

  it('never flags a variant-prefixed or bracket token', () => {
    const source = '<div class="sm:table-cell text-[0.8125rem]"></div>';
    expect(findUncompiledClasses(source, '')).toEqual([]);
  });

  it('does not match a compiled sibling class as a false pass (.join-item must not satisfy .join)', () => {
    const source = '<div class="join"></div>';
    const compiledCss = ':where([data-theme]) .join-item { display: inline-flex; }';
    expect(findUncompiledClasses(source, compiledCss).map((f) => f.token)).toEqual(['join']);
  });
});
