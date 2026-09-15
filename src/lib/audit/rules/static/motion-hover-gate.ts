// cairn-audit's motion-hover-gate rule: a hand-authored `:hover` selector never declares motion
// (a transition or an animation) unless it sits inside `@media (hover: hover)`, the shipped model
// guarding the `.btn-active:hover` rule in cairn-admin.css. A touch device fires `:hover` on
// tap-and-hold with no release event, so an ungated hover transition can get stuck mid-motion; the
// guard is the fix, and it has already shipped once. The rule carries two predicates, and the
// widening is what stops it being vacuous
// against the engine's own tree: it fires whether the motion sits on the `:hover` rule itself or on
// the BASE rule the same selector matches, and it fires on a `:focus-visible` alternative declaring
// motion from INSIDE the guard, the mistake its own fix message invites (a keyboard user on a
// touch device still needs that motion, which the guard would otherwise silence too).
//
// Deliberately scoped to hand-authored CSS, mirroring focus-parity's own boundary: Tailwind's
// `hover:` variant already compiles to `@media (hover: hover) { &:hover }`, so it is out of scope
// by construction rather than by a special case here.
import { cssRulePosition, cssScopeRules, normalizeSelector } from './css-scope.js';
import { isMotionProperty } from './motion.js';
import { splitSelectorList } from '../../sheet.js';
import type { CssScopeRule } from './css-scope.js';
import type { Finding, StaticRule } from '../../types.js';

const HOVER = ':hover';
const FOCUS_VISIBLE = ':focus-visible';
const HOVER_MEDIA_CONDITION = /\(hover:\s*hover\)/;

/** One selector alternative, the CSS rule that declared it, and whether that rule sits guarded. */
interface SelectorSite {
  scope: CssScopeRule;
  selector: string;
  gated: boolean;
}

function isHoverGated(conditions: string[]): boolean {
  return conditions.some((condition) => HOVER_MEDIA_CONDITION.test(condition));
}

function declaresMotion(declarations: { property: string; value: string }[]): boolean {
  return declarations.some((decl) => isMotionProperty(decl.property));
}

/** The declarations every rule in a file contributes to one selector, across every occurrence. */
function declarationsFor(
  byFile: Map<string, Map<string, { property: string; value: string }[]>>,
  file: string
): Map<string, { property: string; value: string }[]> {
  const known = byFile.get(file);
  if (known) return known;
  const created = new Map<string, { property: string; value: string }[]>();
  byFile.set(file, created);
  return created;
}

function fixMessage(selector: string): string {
  return (
    `selector "${selector}" declares motion outside a hover-capable-device gate; wrap the block in ` +
    '"@media (hover: hover)", the shipped model guarding the `.btn-active:hover` rule in ' +
    'cairn-admin.css, and if the selector list pairs ":hover" with ":focus-visible" or ' +
    '":focus-within" split them first, since a keyboard user on a touch device still needs the ' +
    'focus motion the guard would otherwise silence too'
  );
}

export const motionHoverGate: StaticRule = {
  id: 'motion-hover-gate',
  tier: 'error',
  adminOnly: true,
  check(ctx) {
    const declsByFile = new Map<string, Map<string, { property: string; value: string }[]>>();
    const sites: SelectorSite[] = [];
    for (const scope of cssScopeRules(ctx)) {
      const gated = isHoverGated(scope.rule.conditions);
      const known = declarationsFor(declsByFile, scope.file);
      for (const raw of splitSelectorList(scope.rule.selector)) {
        const selector = normalizeSelector(raw);
        const existing = known.get(selector);
        if (existing) existing.push(...scope.rule.declarations);
        else known.set(selector, [...scope.rule.declarations]);
        sites.push({ scope, selector, gated });
      }
    }

    const findings: Finding[] = [];
    for (const site of sites) {
      if (site.gated || !site.selector.includes(HOVER)) continue;
      const known = declsByFile.get(site.scope.file) ?? new Map();
      const own = site.scope.rule.declarations;
      const base = known.get(site.selector.split(HOVER).join('')) ?? [];
      if (!declaresMotion(own) && !declaresMotion(base)) continue;
      findings.push({
        ruleId: 'motion-hover-gate',
        tier: 'error',
        ...cssRulePosition(site.scope),
        message: fixMessage(site.selector),
      });
    }
    for (const site of sites) {
      if (!site.gated || !site.selector.includes(FOCUS_VISIBLE)) continue;
      if (!declaresMotion(site.scope.rule.declarations)) continue;
      findings.push({
        ruleId: 'motion-hover-gate',
        tier: 'error',
        ...cssRulePosition(site.scope),
        message: fixMessage(site.selector),
      });
    }
    return findings;
  },
};
