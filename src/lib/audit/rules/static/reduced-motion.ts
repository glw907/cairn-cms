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
import { cssScopeRules } from './css-scope.js';
import { lineAt } from '../../markup.js';
import type { SheetRule } from '../../sheet.js';
import type { Finding, StaticRule } from '../../types.js';

const MOTION_PROPERTY = /^(transition|transition-duration|animation|animation-duration)$/;
const REDUCED_MOTION_CONDITION = /prefers-reduced-motion/;

function isReducedMotionGuarded(conditions: string[]): boolean {
  return conditions.some((condition) => REDUCED_MOTION_CONDITION.test(condition));
}

/** A selector alternative, whitespace-normalized so combinator formatting never breaks a match. */
function normalize(selector: string): string {
  return selector.replace(/\s+/g, ' ').trim();
}

interface BearingSite {
  file: string;
  source: string;
  rule: SheetRule;
  selector: string;
}

export const reducedMotion: StaticRule = {
  id: 'reduced-motion',
  tier: 'error',
  check(ctx) {
    const guardedByFile = new Map<string, Set<string>>();
    const bearing: BearingSite[] = [];
    for (const { file, source, rule } of cssScopeRules(ctx)) {
      const selectors = splitSelectorList(rule.selector).map(normalize);
      if (isReducedMotionGuarded(rule.conditions)) {
        const known = guardedByFile.get(file) ?? new Set<string>();
        for (const selector of selectors) known.add(selector);
        guardedByFile.set(file, known);
        continue;
      }
      const bearsMotion = rule.declarations.some(
        (decl) => MOTION_PROPERTY.test(decl.property) && decl.value.trim() !== 'none'
      );
      if (!bearsMotion) continue;
      for (const selector of selectors) bearing.push({ file, source, rule, selector });
    }

    const findings: Finding[] = [];
    for (const site of bearing) {
      if (guardedByFile.get(site.file)?.has(site.selector)) continue;
      findings.push({
        ruleId: 'reduced-motion',
        tier: 'error',
        file: site.file,
        line: lineAt(site.source, site.rule.start),
        start: site.rule.start,
        end: site.rule.end,
        message: `selector "${site.selector}" carries a transition/animation with no matching rule inside a prefers-reduced-motion guard`,
      });
    }
    return findings;
  },
};
