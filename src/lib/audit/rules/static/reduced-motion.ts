// cairn-audit's reduced-motion rule: every selector whose own CSS declares a transition or
// animation (and does not merely neutralize one with `none`) has a matching rule, in the same
// source, inside an `@media (prefers-reduced-motion: reduce)` guard. HelpHome's own
// `.step-act`/`.btn-quiet` pair is the shipped, passing example this rule locks in as a regression
// gate: a single guarded rule names both selectors as a comma list, and each is read as its own
// selector alternative (`sheet.ts`'s `splitSelectorList`) so neither has to repeat the whole list.
//
// A guard discharges a bearing rule's declared property under two conditions: the guard's own
// selector must match the bearing rule's selector (selector-text equality, file-scoped, unchanged;
// or a blanket universal-descendant selector like cairn-admin.css's own reduced-motion block,
// which covers every selector in its file rather than naming one), and the guard must declare the
// property the bearing rule declares. A clause that discharged the whole file the moment any guard
// existed would make this rule vacuous over a file with one blanket guard, so a bearing rule
// declaring only `transition-timing-function` still owes its own guarded sibling when the blanket
// guard never zeroes that property.
import { splitSelectorList } from '../../sheet.js';
import { cssRulePosition, cssScopeRules, normalizeSelector } from './css-scope.js';
import { isMotionProperty, isReducedMotionGuarded } from './motion.js';
import type { CssScopeRule } from './css-scope.js';
import type { Finding, StaticRule } from '../../types.js';

/**
 * One selector alternative that carries motion, with the CSS rule it was declared on and the
 * motion properties its own declarations name. A declaration whose value is `none` neutralizes its
 * own motion rather than carrying it, so it never joins this set.
 */
interface BearingSite {
  scope: CssScopeRule;
  selector: string;
  properties: Set<string>;
}

/**
 * One guard rule's selector alternative inside a reduced-motion block, with the properties it
 * literally declares and whether its selector is the blanket universal-descendant form.
 */
interface FloorSite {
  selector: string;
  blanket: boolean;
  properties: Set<string>;
}

/**
 * Whether a guard selector, as authored, is the blanket form: a bare `*`, or a descendant
 * combinator ending in `*` (`[data-theme='cairn-admin'] *`), which covers every selector in the
 * same guarded file rather than naming one by text.
 */
function isBlanketSelector(selector: string): boolean {
  return selector === '*' || selector.endsWith(' *');
}

/**
 * The properties a declared property counts as declaring, for the floor's discharge check. A
 * shorthand counts as declaring the longhands it sets (`transition` declares
 * `transition-duration`; `animation` declares `animation-duration` and
 * `animation-iteration-count`), one way only: knowing a floor zeroes `transition-duration` never
 * proves it zeroes the `transition` shorthand, which is what keeps a rule that changes more than
 * duration honestly unguarded.
 */
function impliedProperties(property: string): string[] {
  if (property === 'transition') return ['transition', 'transition-duration'];
  if (property === 'animation') return ['animation', 'animation-duration', 'animation-iteration-count'];
  return [property];
}

/** Whether a floor's own declared properties discharge one property a bearing rule declares. */
function dischargedByFloor(floor: FloorSite, property: string): boolean {
  return impliedProperties(property).some((implied) => floor.properties.has(implied));
}

export const reducedMotion: StaticRule = {
  id: 'reduced-motion',
  tier: 'error',
  check(ctx) {
    const floorsByFile = new Map<string, FloorSite[]>();
    const bearing: BearingSite[] = [];
    for (const scope of cssScopeRules(ctx)) {
      const selectors = splitSelectorList(scope.rule.selector).map(normalizeSelector);
      if (isReducedMotionGuarded(scope.rule.conditions)) {
        const floors = floorsByFile.get(scope.file) ?? [];
        floorsByFile.set(scope.file, floors);
        const properties = new Set(scope.rule.declarations.map((decl) => decl.property));
        for (const selector of selectors) {
          floors.push({ selector, blanket: isBlanketSelector(selector), properties });
        }
        continue;
      }
      const properties = new Set(
        scope.rule.declarations
          .filter((decl) => isMotionProperty(decl.property) && decl.value.trim() !== 'none')
          .map((decl) => decl.property)
      );
      if (properties.size === 0) continue;
      for (const selector of selectors) bearing.push({ scope, selector, properties });
    }

    const findings: Finding[] = [];
    for (const site of bearing) {
      const floors = floorsByFile.get(site.scope.file) ?? [];
      const matchingSelector = floors.filter((floor) => floor.blanket || floor.selector === site.selector);
      const discharged =
        matchingSelector.length > 0 &&
        [...site.properties].every((property) =>
          matchingSelector.some((floor) => dischargedByFloor(floor, property))
        );
      if (discharged) continue;
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
