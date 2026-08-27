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

/** One first/last-child trim selector, its own classes, and which edge it trims. */
interface TrimSite {
  scope: CssScopeRule;
  selector: string;
  classes: string[];
  edge: string;
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
        const classes = selectorClassNames(selector);

        const isStripe =
          (NTH_CHILD.test(selector) &&
            scope.rule.declarations.some((decl) => BACKGROUND_PROPERTY.test(decl.property))) ||
          classes.some((name) => ZEBRA_CLASS.test(name));
        if (isStripe) {
          const striped = selectorsFor(stripedByFile, scope.file);
          for (const name of classes) striped.add(name);
          continue;
        }

        // A trim already scoped to its own parity (`:last-child:nth-child(odd)`) is the fix, not
        // the hazard, so it never even reaches the trim-site list.
        const edge = FIRST_OR_LAST_CHILD.exec(selector)?.[1]?.toLowerCase();
        if (!edge || NTH_CHILD.test(selector)) continue;
        if (!scope.rule.declarations.some((decl) => PADDING_PROPERTY.test(decl.property))) continue;
        trimSites.push({ scope, selector, classes, edge });
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
