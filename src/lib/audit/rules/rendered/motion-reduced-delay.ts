// cairn-audit's reduced-motion delay check: a real reader who asks the OS for less motion still
// sits through a transition-delay or animation-delay that never zeroed out, since a delay alone
// paints nothing while it waits, so the "instant" a reduced-motion visitor was promised arrives
// late. This is a rendered rule rather than a static one because the defect is in the COMPUTED
// value under a real `prefers-reduced-motion: reduce` media query, not in source text: the static
// `reduced-motion` rule reads the authored CSS directly and cannot know which of several
// media-gated declarations actually wins once the browser resolves the cascade.
//
// The id is `motion-reduced-delay`, never `reduced-motion`: that id already names a STATIC rule
// (rules/static/reduced-motion.ts), there is no duplicate-id guard across the two registries, and
// `suppress.ts` resolves a source-positioned `cairn-audit-disable-next-line` directive by id, so
// reusing it would read as covering a rendered finding a source comment can never reach. The repo
// already ships one id duplicated this way, `list-role`, which is the precedent for how confusing
// the alternative is (that pair shares an id deliberately, since static and rendered mode never run
// together; this rule shares nothing with the static `reduced-motion` id and must not collide with
// it).
//
// Tier is advisory, not error: every offender this rule has actually found is DaisyUI's own
// component CSS (`.drawer-side`, `.checkbox::before`, `.modal-box`), and cairn ships no unlayered
// override for any of the four DaisyUI components decision 4 protects. Gating a consumer's exit
// code on CSS they cannot edit would fail every first `audit:rendered` run on a vendor default.
import { ensurePageHelpers } from '../../rendered.js';
import type { RenderedFinding, RenderedRule, RenderedRuleContext } from '../../rendered.js';

const RULE_ID = 'motion-reduced-delay';

type DelayProperty = 'transition-delay' | 'animation-delay';

/** One element (or its `::before`/`::after`) whose computed delay stayed nonzero under reduced motion. */
interface DelayFinding {
  selector: string;
  pseudoElement: '' | '::before' | '::after';
  property: DelayProperty;
  /** The computed value as the browser reports it, e.g. `"0.1s, 0.1s"` for a two-entry list. */
  value: string;
  /** The authored rule the CSSOM walker located, or `null` when none matched. */
  locatedSelector: string | null;
  locatedFile: string | null;
}

/**
 * Runs inside the page. Playwright serializes this by source, so it stays self-contained: no
 * references outside its own body, the same discipline every other page-side helper in this
 * codebase follows.
 *
 * Walks every element and its `::before`/`::after`, reading `transition-delay` and
 * `animation-delay` as COMPUTED values (never authored source): a nonzero entry anywhere in either
 * comma-separated list is the defect this rule exists to catch, regardless of visibility, because
 * a closed drawer or an unchecked checkbox is exactly the resting state the delay still applies to.
 */
function findReducedDelays(): DelayFinding[] {
  const helpers = globalThis.__cairnAudit;
  const results: DelayFinding[] = [];
  const seen = new Set<string>();
  const anyNonzero = (value: string) => value.split(',').some((part) => parseFloat(part) > 0);
  const properties: { property: DelayProperty; cssProp: 'transitionDelay' | 'animationDelay' }[] = [
    { property: 'transition-delay', cssProp: 'transitionDelay' },
    { property: 'animation-delay', cssProp: 'animationDelay' },
  ];

  for (const el of Array.from(document.querySelectorAll('*'))) {
    for (const pseudoElement of ['', '::before', '::after'] as const) {
      const style = pseudoElement ? getComputedStyle(el, pseudoElement) : getComputedStyle(el);
      for (const { property, cssProp } of properties) {
        const value = style[cssProp];
        if (!anyNonzero(value)) continue;
        const signature = helpers ? helpers.signature(el) : el.tagName.toLowerCase();
        const key = `${signature}${pseudoElement}:${property}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const located = helpers ? helpers.findAuthoredRules(el, pseudoElement, property) : [];
        const nonzeroMatch = located.find((match) => anyNonzero(match.value));

        results.push({
          selector: signature,
          pseudoElement,
          property,
          value,
          locatedSelector: nonzeroMatch?.selector ?? null,
          locatedFile: nonzeroMatch?.file ?? null,
        });
      }
    }
  }
  return results;
}

export const motionReducedDelay: RenderedRule = {
  id: RULE_ID,
  tier: 'advisory',
  // Opt-in: only this rule needs a `reducedMotion: 'reduce'` context, so a registry that never
  // registers it keeps opening exactly the contexts it opens today.
  axes: ['reduced-motion'],
  async check(ctx: RenderedRuleContext): Promise<RenderedFinding[]> {
    await ensurePageHelpers(ctx.page);
    const found = await ctx.page.evaluate(findReducedDelays);
    return found.map((f): RenderedFinding => {
      const locator =
        f.locatedSelector && f.locatedFile
          ? `the authored rule "${f.locatedSelector}" in ${f.locatedFile} declares it`
          : 'no matching authored rule was found in the page\'s stylesheets';
      return {
        ruleId: RULE_ID,
        tier: 'advisory',
        selector: `${f.selector}${f.pseudoElement}`,
        message:
          `${f.selector}${f.pseudoElement} computes a nonzero ${f.property} (${f.value}) under ` +
          `reduced motion, so a reader who asked the OS to turn animation off still waits through ` +
          `a delay before anything moves. ${locator}. Gate the declaration behind ` +
          `\`@media (prefers-reduced-motion: no-preference)\` or zero the delay in the reduced-motion ` +
          `block.`,
      };
    });
  },
};
