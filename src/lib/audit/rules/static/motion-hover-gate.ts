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

type Declaration = { property: string; value: string };

/** One selector alternative, the CSS rule that declared it, and whether that rule sits guarded. */
interface SelectorSite {
  scope: CssScopeRule;
  selector: string;
  gated: boolean;
}

function isHoverGated(conditions: string[]): boolean {
  return conditions.some((condition) => HOVER_MEDIA_CONDITION.test(condition));
}

function declaresMotion(declarations: Declaration[]): boolean {
  return declarations.some((decl) => isMotionProperty(decl.property));
}

/** The key one file's copy of one selector accumulates its declarations under. */
function siteKey(file: string, selector: string): string {
  return `${file}\u0000${selector}`;
}

/** The base selector a `:hover` alternative is the hover state of, every `:hover` dropped. */
function withoutHover(selector: string): string {
  return selector.split(HOVER).join('');
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
    const declarationsBySite = new Map<string, Declaration[]>();
    const sites: SelectorSite[] = [];
    for (const scope of cssScopeRules(ctx)) {
      const gated = isHoverGated(scope.rule.conditions);
      for (const raw of splitSelectorList(scope.rule.selector)) {
        const selector = normalizeSelector(raw);
        const key = siteKey(scope.file, selector);
        const existing = declarationsBySite.get(key);
        if (existing) existing.push(...scope.rule.declarations);
        else declarationsBySite.set(key, [...scope.rule.declarations]);
        sites.push({ scope, selector, gated });
      }
    }

    const findings: Finding[] = [];
    for (const site of sites) {
      if (site.gated || !site.selector.includes(HOVER)) continue;
      const base = declarationsBySite.get(siteKey(site.scope.file, withoutHover(site.selector))) ?? [];
      if (!declaresMotion(site.scope.rule.declarations) && !declaresMotion(base)) continue;
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
