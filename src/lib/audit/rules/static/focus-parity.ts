// cairn-audit's focus-parity rule: a component's own hand-authored CSS never gives mouse hover an
// affordance keyboard focus does not also get. For every selector alternative carrying `:hover`,
// this rule looks for a sibling selector in the same source that is identical except `:hover` is
// swapped for `:focus-visible` (the element itself is the focus target) or `:focus-within` (a
// container whose hover wash acknowledges a DESCENDANT gaining focus, ExpandableRow's own summary
// row over its nested trigger button). Six hover-only families were the motivating finding; three
// of cairn's own components carried this gap when the rule first ran (ExpandableRow's row wash,
// ListToolbar's facet-clear button, HelpHome's five link/button tints), each closed by adding the
// matching selector to the existing rule's own selector list rather than a new rule, so the CSS
// stays declarative about which state pairs with which.
//
// Deliberately scoped to hand-authored CSS, not Tailwind's `hover:`/`focus-visible:` variant
// classes: the admin's utility-class idiom already carries dozens of hover: utilities whose
// keyboard affordance is the engine's own blanket `:focus-visible` outline ring (cairn-admin.css),
// a real but different-shaped guarantee a markup-level token scan would over-report against.
import { splitSelectorList } from '../../sheet.js';
import { cssScopeRules } from './css-scope.js';
import { lineAt } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const HOVER = ':hover';

/** A selector alternative, whitespace-normalized so combinator formatting never breaks a match. */
function normalize(selector: string): string {
  return selector.replace(/\s+/g, ' ').trim();
}

export const focusParity: StaticRule = {
  id: 'focus-parity',
  tier: 'error',
  check(ctx) {
    const knownByFile = new Map<string, Set<string>>();
    const hoverSites: { file: string; source: string; start: number; end: number; selector: string }[] = [];
    for (const { file, source, rule } of cssScopeRules(ctx)) {
      const known = knownByFile.get(file) ?? new Set<string>();
      for (const raw of splitSelectorList(rule.selector)) {
        const selector = normalize(raw);
        known.add(selector);
        if (selector.includes(HOVER)) {
          hoverSites.push({ file, source, start: rule.start, end: rule.end, selector });
        }
      }
      knownByFile.set(file, known);
    }

    const findings: Finding[] = [];
    for (const site of hoverSites) {
      const known = knownByFile.get(site.file)!;
      const focusVisible = site.selector.split(HOVER).join(':focus-visible');
      const focusWithin = site.selector.split(HOVER).join(':focus-within');
      if (known.has(focusVisible) || known.has(focusWithin)) continue;
      findings.push({
        ruleId: 'focus-parity',
        tier: 'error',
        file: site.file,
        line: lineAt(site.source, site.start),
        start: site.start,
        end: site.end,
        message: `selector "${site.selector}" carries :hover with no matching :focus-visible (or :focus-within) selector in the same source`,
      });
    }
    return findings;
  },
};
