// cairn-audit's reduced-motion rule: every selector whose own CSS declares a transition or
// animation (and does not merely neutralize one with `none`) has a matching rule, in the same
// source, inside an `@media (prefers-reduced-motion: reduce)` guard. HelpHome's own
// `.step-act`/`.btn-quiet` pair is the shipped, passing example this rule locks in as a regression
// gate: a single guarded rule names both selectors as a comma list, and each is read as its own
// selector alternative (`sheet.ts`'s `splitSelectorList`) so neither has to repeat the whole list.
//
// Matching is selector-text equality (whitespace-normalized), not property inspection: the guard's
// own job is to override the SAME selector's duration, so proving the selector is named inside a
// guard is the whole contract, regardless of which properties that guard's own rule resets.
import { splitSelectorList } from '../../sheet.js';
import { cssRulePosition, cssScopeRules, normalizeSelector, selectorsFor } from './css-scope.js';
import { isMotionProperty, isReducedMotionGuarded } from './motion.js';
import type { CssScopeRule } from './css-scope.js';
import type { Finding, StaticRule } from '../../types.js';

/** One selector alternative that carries motion, with the CSS rule it was declared on. */
interface BearingSite {
  scope: CssScopeRule;
  selector: string;
}

export const reducedMotion: StaticRule = {
  id: 'reduced-motion',
  tier: 'error',
  check(ctx) {
    const guardedByFile = new Map<string, Set<string>>();
    const bearing: BearingSite[] = [];
    for (const scope of cssScopeRules(ctx)) {
      const selectors = splitSelectorList(scope.rule.selector).map(normalizeSelector);
      if (isReducedMotionGuarded(scope.rule.conditions)) {
        const guarded = selectorsFor(guardedByFile, scope.file);
        for (const selector of selectors) guarded.add(selector);
        continue;
      }
      const bearsMotion = scope.rule.declarations.some(
        (decl) => isMotionProperty(decl.property) && decl.value.trim() !== 'none'
      );
      if (!bearsMotion) continue;
      for (const selector of selectors) bearing.push({ scope, selector });
    }

    const findings: Finding[] = [];
    for (const site of bearing) {
      if (guardedByFile.get(site.scope.file)?.has(site.selector)) continue;
      findings.push({
        ruleId: 'reduced-motion',
        tier: 'error',
        ...cssRulePosition(site.scope),
        message: `selector "${site.selector}" carries a transition/animation with no matching rule inside a prefers-reduced-motion guard`,
      });
    }
    return findings;
  },
};
