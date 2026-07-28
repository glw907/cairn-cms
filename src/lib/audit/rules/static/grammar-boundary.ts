// cairn-audit's grammar-boundary rule: the ratified palette/grammar boundary (design section 4)
// made mechanical. A site re-tunes palette tokens (--color-*) freely; it never redeclares a
// grammar token (--cairn-type-*/--cairn-gap-*), since a grammar token names a structural
// RELATIONSHIP (a heading's role, a control-to-control gap) rather than a palette choice, and
// holds across light and dark by construction. The engine's own cairn-admin.css is the one
// legitimate declaration site and is deliberately outside the CSS-family scope (see css-scope.ts):
// this rule only ever sees a component's own scoped <style> block or a consumer-named CSS file,
// and cairn-admin.css is never named as one, so a clean run never has to special-case its own
// source of truth. (It is also named in `config.paletteCssFiles`, config.ts, the declared-palette-
// site list token-colors consults; the two exclusions are independent, since a grammar
// declaration site and a palette declaration site are different concepts that happen to coincide
// in this one file.)
import { GRAMMAR_TOKENS } from '../../../design/grammar-tokens.js';
import { cssScopeRules } from './css-scope.js';
import { lineAt } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const GRAMMAR_TOKEN_NAMES = new Set(GRAMMAR_TOKENS);

export const grammarBoundary: StaticRule = {
  id: 'grammar-boundary',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const { file, source, rule } of cssScopeRules(ctx)) {
      for (const decl of rule.declarations) {
        if (!GRAMMAR_TOKEN_NAMES.has(decl.property)) continue;
        findings.push({
          ruleId: 'grammar-boundary',
          tier: 'error',
          file,
          line: lineAt(source, rule.start),
          start: rule.start,
          end: rule.end,
          message: `"${decl.property}" redeclares a grammar token; re-tune a --color-* palette token instead`,
        });
      }
    }
    return findings;
  },
};
