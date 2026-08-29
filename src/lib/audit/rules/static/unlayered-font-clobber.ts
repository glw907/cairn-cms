// cairn-audit's unlayered-font-clobber rule: under the no-Preflight admin, a Svelte scoped `<style>`
// block declares CSS with no `@layer` wrapper of its own, while every Tailwind utility class ships
// inside `@layer utilities`. Cascade LAYER precedence, not selector specificity, decides the winner
// between them: an unlayered scoped declaration beats a font utility class at ANY specificity, even
// a single-class scoped selector against a `text-2xl font-bold` pair on the same element. Only a
// measured render caught the resulting defect, a 24px/700 heading silently downgraded by one
// unlayered `font-size`/`font-weight` declaration a reviewer had every reason to read as harmless.
//
// `DEFAULT_STATIC_SCOPE` reaches `src/lib/components`, a consumer's own generic component directory,
// and this interaction is Tailwind-general, not admin-specific, so the rule stands on a consumer's
// public-side components the same way it stands on the admin's own. A scan of `src/lib/admin-toolkit`,
// `src/lib/components`, and `src/routes/admin` found zero co-occurrences, so the rule does not red the
// engine's own tree.
import { parseSheet } from '../../sheet.js';
import { lineAt } from '../../markup.js';
import { utilityBase } from './utility.js';
import type { ParsedComponent } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

const FONT_PROPERTY = new Set(['font-family', 'font-size', 'font-weight', 'font']);
const LAYER_CONDITION = /^@layer\b/i;

// Tailwind's own text-sizing namespace (`type-scale`'s TEXT_SIZING_TOKEN restated as a full match)
// and the font-weight/family namespace. Deliberately narrow to font-AFFECTING utilities: `text-*`
// color utilities (`text-primary`) name a color, not a size, and are out of scope.
const TEXT_SIZE_UTILITY = /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])$/;
const FONT_WEIGHT_OR_FAMILY_UTILITY =
  /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono|\[[^\]]+\])$/;

function isFontUtility(token: string): boolean {
  const base = utilityBase(token);
  return TEXT_SIZE_UTILITY.test(base) || FONT_WEIGHT_OR_FAMILY_UTILITY.test(base);
}

/** Whether a rule's own enclosing at-rules include no `@layer`, the unlayered condition. */
function isUnlayered(conditions: string[]): boolean {
  return !conditions.some((condition) => LAYER_CONDITION.test(condition.trim()));
}

/** The class tokens written on one element, grouped by the element's own start offset. */
function classesByElement(file: ParsedComponent): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  for (const token of file.classTokens) {
    const set = map.get(token.elementStart);
    if (set) set.add(token.value);
    else map.set(token.elementStart, new Set([token.value]));
  }
  return map;
}

/** One rule's own class name and the font-affecting utility it clobbers on the same element. */
interface FontClobberHit {
  className: string;
  utilityHit: string;
}

/**
 * The FIRST element/class-name pair a rule's own selector clobbers, or none. A row or list
 * component repeats its own row class across many elements, and the same rule can name more than
 * one class in its own selector list; either shape names the same hazard once per rule, not once
 * per element or class name it happens to match, so the search stops at the first hit.
 */
function findFontClobberHit(
  classNames: readonly string[],
  byElement: Map<number, Set<string>>
): FontClobberHit | undefined {
  for (const className of classNames) {
    for (const classes of byElement.values()) {
      if (!classes.has(className)) continue;
      const utilityHit = [...classes].find((name) => name !== className && isFontUtility(name));
      if (utilityHit) return { className, utilityHit };
    }
  }
  return undefined;
}

export const unlayeredFontClobber: StaticRule = {
  id: 'unlayered-font-clobber',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      if (!file.styleBlock) continue;
      const base = file.styleBlock.start;
      const byElement = classesByElement(file);

      for (const rule of parseSheet(file.styleBlock.source).rules) {
        if (!isUnlayered(rule.conditions)) continue;
        const fontDecl = rule.declarations.find((decl) => FONT_PROPERTY.has(decl.property.toLowerCase()));
        if (!fontDecl) continue;

        const hit = findFontClobberHit(rule.classNames, byElement);
        if (!hit) continue;
        const start = base + rule.start;
        findings.push({
          ruleId: 'unlayered-font-clobber',
          tier: 'error',
          file: file.file,
          line: lineAt(file.source, start),
          start,
          end: base + rule.end,
          message:
            `selector ".${hit.className}" declares "${fontDecl.property}" in an unlayered scoped ` +
            `<style> block, which beats the "${hit.utilityHit}" utility on the same element at ANY ` +
            `specificity: a Svelte scoped style carries no @layer while Tailwind utilities sit ` +
            `in @layer utilities, so cascade layer precedence, not specificity, decides the ` +
            `winner. Put the typography on the ancestor the control inherits from instead of ` +
            `overriding it per instance`,
        });
      }
    }
    return findings;
  },
};
