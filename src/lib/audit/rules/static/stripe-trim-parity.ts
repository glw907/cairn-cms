// cairn-audit's stripe-trim-parity rule: a striped row's `:nth-child` background pattern (or a
// `.table-zebra`-style class) and an UNCONDITIONED first/last-child padding trim on the same row
// class are, together, a real defect with no legitimate reading: the trim removes the row's own
// top or bottom padding regardless of which stripe color the trimmed row is, so on an even-count
// group the stripe fill reads as clipped at the edge it never clips at on an odd-count group. The
// fix scopes the trim to its own parity instead (`:last-child:nth-child(odd)`), so it only fires
// when the trimmed edge and the stripe color actually agree.
//
// The engine ships no instance of this condition itself: the packaged sheet has no first/last-child
// trim, and `ExpandableRow.svelte`'s own zebra handling is a sticky-cell mechanism, a different
// interaction. The grounding is ASC's measured evidence, the same DaisyUI-plus-UA-default shape the
// `container-inset-asymmetry` keep already stands as precedent for. `DEFAULT_STATIC_SCOPE` reaches
// `src/lib/components`, a consumer's own generic component directory, and the interaction is plain
// CSS with no admin-specific vocabulary, so this rule stands on a consumer's public-side row
// components exactly the same way it would on the admin's own.
import { selectorClassNames, splitSelectorList } from '../../sheet.js';
import { cssRulePosition, cssScopeRules, normalizeSelector, selectorsFor } from './css-scope.js';
import type { CssScopeRule } from './css-scope.js';
import type { Finding, StaticRule } from '../../types.js';

const NTH_CHILD = /:nth-child\(/i;
const FIRST_OR_LAST_CHILD = /:(first|last)-child\b/i;
const ZEBRA_CLASS = /zebra/i;
const BACKGROUND_PROPERTY = /^background(-color)?$/;
const PADDING_PROPERTY = /^padding/i;
const COMBINATOR_CHARS = new Set(['>', '+', '~']);

/** One first/last-child trim selector, its own subject classes, and which edge it trims. */
interface TrimSite {
  scope: CssScopeRule;
  selector: string;
  classes: string[];
  edge: string;
}

/**
 * A selector's own subject compound: the segment after the final descendant, child, or sibling
 * combinator (a bare space, `>`, `+`, or `~`, outside any bracket or paren group). A descendant
 * selector's ancestor names a different element than the one the rule actually styles, so pairing
 * a stripe against a trim has to key on the subject each rule paints, never on every class either
 * selector happens to mention.
 */
function lastCompound(selector: string): string {
  let depth = 0;
  let start = 0;
  let subject = selector;
  let i = 0;
  while (i < selector.length) {
    const ch = selector[i];
    if (ch === '"' || ch === "'") {
      i++;
      while (i < selector.length && selector[i] !== ch) {
        if (selector[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '(' || ch === '[') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth === 0 && (ch === ' ' || COMBINATOR_CHARS.has(ch))) {
      const compound = selector.slice(start, i).trim();
      if (compound) subject = compound;
      while (i < selector.length && (selector[i] === ' ' || COMBINATOR_CHARS.has(selector[i]))) i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = selector.slice(start).trim();
  if (tail) subject = tail;
  return subject;
}

export const stripeTrimParity: StaticRule = {
  id: 'stripe-trim-parity',
  tier: 'error',
  check(ctx) {
    const stripedByFile = new Map<string, Set<string>>();
    const trimSites: TrimSite[] = [];

    for (const scope of cssScopeRules(ctx)) {
      for (const raw of splitSelectorList(scope.rule.selector)) {
        const selector = normalizeSelector(raw);
        const subjectClasses = selectorClassNames(lastCompound(selector));

        const isStripe =
          (NTH_CHILD.test(selector) &&
            scope.rule.declarations.some((decl) => BACKGROUND_PROPERTY.test(decl.property))) ||
          subjectClasses.some((name) => ZEBRA_CLASS.test(name));
        if (isStripe) {
          const striped = selectorsFor(stripedByFile, scope.file);
          for (const name of subjectClasses) striped.add(name);
          continue;
        }

        // A trim already scoped to its own parity (`:last-child:nth-child(odd)`) is the fix, not
        // the hazard, so it never even reaches the trim-site list.
        const edge = FIRST_OR_LAST_CHILD.exec(selector)?.[1]?.toLowerCase();
        if (!edge || NTH_CHILD.test(selector)) continue;
        if (!scope.rule.declarations.some((decl) => PADDING_PROPERTY.test(decl.property))) continue;
        trimSites.push({ scope, selector, classes: subjectClasses, edge });
      }
    }

    const findings: Finding[] = [];
    for (const site of trimSites) {
      const striped = stripedByFile.get(site.scope.file);
      const rowClass = striped && site.classes.find((name) => striped.has(name));
      if (!rowClass) continue;
      findings.push({
        ruleId: 'stripe-trim-parity',
        tier: 'error',
        ...cssRulePosition(site.scope),
        message:
          `selector "${site.selector}" applies an unconditioned :${site.edge}-child padding trim ` +
          `while "${rowClass}" also carries a striped background in the same source; scope the ` +
          `trim to its own parity instead (the ":last-child:nth-child(odd)" form), so the trim ` +
          `only fires on the edge whose stripe color it actually agrees with`,
      });
    }
    return findings;
  },
};
