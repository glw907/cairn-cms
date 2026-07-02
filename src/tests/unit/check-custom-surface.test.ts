import { describe, it, expect } from 'vitest';
import {
  pinnedUnlayeredRules,
  componentsLayerSelectorCount,
  retiredTokenHits,
  evaluate,
} from '../../../scripts/check-custom-surface.mjs';

describe('pinnedUnlayeredRules', () => {
  it('finds exactly the two sanctioned unlayered rules', () => {
    const css = `
@layer components {
  :where([data-theme='cairn-admin']) a { color: inherit; }
}
:where([data-theme='cairn-admin']) .menu li > a:focus-visible { outline: 2px solid; }
:where([data-theme='cairn-admin']) .btn.cairn-btn-guarded[aria-disabled='true'] { pointer-events: auto; }
`;
    const rules = pinnedUnlayeredRules(css);
    expect(rules).toHaveLength(2);
    expect(rules.join(' ')).toContain('.menu');
    expect(rules.join(' ')).toContain('.cairn-btn-guarded');
  });

  // FIX A regression: a bespoke rule authored in the BARE `[data-theme='cairn-admin'] .foo {` form (the
  // box-sizing reset and the reduced-motion block both use it) must be enumerated, not only the compiled
  // `:where(...)` form. A `:where(`-only matcher let such a rule ship unguarded.
  it('catches a planted bare [data-theme=] unlayered rule', () => {
    const css = `
@layer components {
  :where([data-theme='cairn-admin']) a { color: inherit; }
}
[data-theme='cairn-admin'] .evil { color: red; }
`;
    const rules = pinnedUnlayeredRules(css);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toBe("[data-theme='cairn-admin'] .evil");
  });
});

describe('componentsLayerSelectorCount', () => {
  it('counts scoped rules inside @layer components and ignores a commented mention', () => {
    // FIX E regression for stripCssComments: a `@layer components` mention and a scoped selector inside
    // a CSS COMMENT (the walled Tier-2 banner quotes both) must not be read as the real at-rule or rule.
    const css = `
/* The load-bearing banner names @layer components and quotes
   :where([data-theme='cairn-admin']) .menu li for the reader. */
@layer components {
  :where([data-theme='cairn-admin']) a { color: inherit; }
  [data-theme='cairn-admin'] summary { list-style: none; }
}
:where([data-theme='cairn-admin']) .menu li > a:focus-visible { outline: 2px solid; }
`;
    // Two rules inside the real block (the `a` reset and the bare-form `summary`); the commented mention
    // and the unlayered `.menu li` rule are excluded.
    expect(componentsLayerSelectorCount(css)).toBe(2);
  });
});

describe('retiredTokenHits', () => {
  it('flags an arbitrary muted/subtle token reference in markup', () => {
    const hits = retiredTokenHits('src/tests/fixtures/retired-token');
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe('evaluate', () => {
  // The full selectors the admin tree sanctions, mirrored here so the fixture sheets share them.
  const sanctioned = [
    ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) .menu li > :is(button, a):focus-visible",
    ":where([data-theme='cairn-admin'], [data-theme='cairn-admin-dark']) .btn.cairn-btn-guarded[aria-disabled='true']",
  ];

  it('passes when the unlayered set matches the allowlist exactly', () => {
    const { pass } = evaluate(
      { adminCss: 'src/tests/fixtures/custom-surface/pass.css', markupDirs: [] },
      { unlayeredAllowlist: sanctioned, componentsLayerCap: 1, retiredTokenBudget: 0 },
    );
    expect(pass).toBe(true);
  });

  // FIX B regression: a swapped rule of the SAME count but a DIFFERENT selector must fail. The old
  // substring allow (`allow.some((e) => sel.includes(e))`) passed any rule merely CONTAINING the
  // sanctioned text.
  it('fails when an unlayered rule is swapped for a different selector of the same count', () => {
    const { pass, failures } = evaluate(
      { adminCss: 'src/tests/fixtures/custom-surface/swapped.css', markupDirs: [] },
      { unlayeredAllowlist: sanctioned, componentsLayerCap: 1, retiredTokenBudget: 0 },
    );
    expect(pass).toBe(false);
    expect(failures.join(' ')).toContain('unsanctioned unlayered rule');
  });

  it('fails when a tree is over its @layer components cap', () => {
    const { pass, failures } = evaluate(
      { adminCss: 'src/tests/fixtures/custom-surface/over-cap.css', markupDirs: [] },
      { unlayeredAllowlist: [], componentsLayerCap: 2, retiredTokenBudget: 0 },
    );
    expect(pass).toBe(false);
    expect(failures.join(' ')).toContain('@layer components selectors');
  });
});

// The showcase signal: any arbitrary-value bracket utility or inline style wrapping a literal
// var(--…). Mirrors the admin pattern's two branches, generalized off muted/subtle to any token.
const showcasePattern = '\\[[^\\][]*var\\(--[^\\][]*\\]|style="[^"]*var\\(--';

describe('retiredTokenHits — per-tree pattern', () => {
  it('flags bracket and inline var(--…) refs but not the dynamic var({…}) swatch', () => {
    const hits = retiredTokenHits('src/tests/fixtures/retired-token-showcase', showcasePattern);
    expect(hits.length).toBe(2);
  });

  it('the default (admin) pattern ignores the showcase tokens', () => {
    const hits = retiredTokenHits('src/tests/fixtures/retired-token-showcase');
    expect(hits.length).toBe(0);
  });
});

describe('evaluate — showcase-shaped tree', () => {
  const tree = {
    adminCss: null,
    markupDirs: ['src/tests/fixtures/retired-token-showcase'],
    retiredTokenPattern: showcasePattern,
  };

  it('passes at or above the count and skips the admin-only signals when adminCss is null', () => {
    const { pass } = evaluate(tree, {
      unlayeredAllowlist: [],
      componentsLayerCap: 0,
      retiredTokenBudget: 2,
    });
    expect(pass).toBe(true);
  });

  it('fails below the count', () => {
    const { pass, failures } = evaluate(tree, {
      unlayeredAllowlist: [],
      componentsLayerCap: 0,
      retiredTokenBudget: 1,
    });
    expect(pass).toBe(false);
    expect(failures.join(' ')).toContain('retired tokens');
  });
});
