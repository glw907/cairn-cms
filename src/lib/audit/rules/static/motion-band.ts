// cairn-audit's motion-band rule, graduated from check:invisible-craft: every transition/animation
// duration a component's own CSS declares lands in the admin's 150-250ms band (fast enough to feel
// responsive, slow enough to read as motion rather than a flicker), and `transition: all` never
// ships (it re-animates every property a future edit adds, including ones that should snap). A
// declaration inside a `prefers-reduced-motion: reduce` guard is exempt: that guard's whole job is
// to collapse a transition toward zero for a reduced-motion reader, so a near-instant duration
// there is the fix this rule polices FOR, never a violation of it.
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import { isMotionProperty, isReducedMotionGuarded } from './motion.js';
import type { Finding, StaticRule } from '../../types.js';

const ALL_PROPERTY = /^(transition|transition-property)$/;
const DURATION = /(-?\d+(?:\.\d+)?)(m?s)\b/g;
const BAND_MIN_MS = 150;
const BAND_MAX_MS = 250;

/** Every duration a value names, in milliseconds. */
function durationsIn(value: string): number[] {
  const out: number[] = [];
  for (const match of value.matchAll(DURATION)) {
    const amount = Number(match[1]);
    out.push(match[2] === 's' ? amount * 1000 : amount);
  }
  return out;
}

/** Whether a property's own value names `all` as the transitioned property, not a duration. */
function transitionsAll(property: string, value: string): boolean {
  if (!ALL_PROPERTY.test(property)) return false;
  return value.split(',').some((part) => part.trim().split(/\s+/)[0] === 'all');
}

export const motionBand: StaticRule = {
  id: 'motion-band',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const scope of cssScopeRules(ctx)) {
      if (isReducedMotionGuarded(scope.rule.conditions)) continue;
      for (const decl of scope.rule.declarations) {
        if (transitionsAll(decl.property, decl.value)) {
          findings.push({
            ruleId: 'motion-band',
            tier: 'error',
            ...cssRulePosition(scope),
            message: `"${decl.property}: ${decl.value}" transitions "all", which re-animates every property a future edit adds`,
          });
        }
        if (!isMotionProperty(decl.property)) continue;
        for (const ms of durationsIn(decl.value)) {
          if (ms >= BAND_MIN_MS && ms <= BAND_MAX_MS) continue;
          findings.push({
            ruleId: 'motion-band',
            tier: 'error',
            ...cssRulePosition(scope),
            message: `"${decl.property}: ${decl.value}" carries a ${ms}ms duration outside the ${BAND_MIN_MS}-${BAND_MAX_MS}ms motion band`,
          });
        }
      }
    }
    return findings;
  },
};
