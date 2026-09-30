// cairn-audit's public-literals rule: a public file never spells a color or an absolute font size
// out as a literal. A site's design values live in token definitions under a theme root
// (`config.themeRoots`), and every other public surface reads them: a CSS declaration, an inline
// `style=` value, a Svelte `style:` directive, and a Tailwind arbitrary value are the four places
// a literal can slip in.
//
// Detection is the shared literal core (../../literals.ts), the same one `token-colors` reads, so
// the two rules cannot disagree about what a literal is. The scopes never overlap: this rule reads
// the public scope and `token-colors` the admin scope (config.ts `isPublicFile`).
//
// Legal by rule, never by suppression:
// - a custom-property definition anywhere under a theme root, a component's `<style>` block
//   included, since defining a token is what a theme root is for;
// - the root element's own `font-size`, which is what defines `rem` for the page;
// - `em`, `%`, a keyword, and a `var()` or math function over tokens for a size;
// - `transparent`, `currentColor`, and the CSS-wide keywords for a color.
// Tailwind's own utilities (`text-sm`, `bg-red-500`) carry no bracket and are tokens a designer
// may choose, so they are never read. A `<style lang="...">` block the parser cannot read (Sass,
// Less) raises its own advisory finding, since its literals go unchecked.
import { isUnderRoots } from '../../config.js';
import { lineAt } from '../../markup.js';
import { arbitraryValueHazard, declarationHazard } from '../../literals.js';
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import type { LiteralHazard } from '../../literals.js';
import type { Finding, StaticRule } from '../../types.js';

const RULE_ID = 'public-literals';
const ADVICE = 'read a token instead, or define the value under a theme root';

/** A selector list whose every alternative is the root element, `:global()` wrappers unwrapped. */
function isRootSelector(selector: string): boolean {
  const alternatives = selector
    .replace(/:global\(([^)]*)\)/g, '$1')
    .split(',')
    .map((part) => part.trim().toLowerCase());
  return alternatives.every((part) => part === 'html' || part === ':root');
}

function message(construct: string, hazard: LiteralHazard): string {
  return `${construct} carries ${hazard.description}; ${ADVICE}`;
}

export const publicLiterals: StaticRule = {
  id: RULE_ID,
  tier: 'advisory',
  publicScope: true,
  check(ctx) {
    const findings: Finding[] = [];
    const inThemeRoot = (file: string) => isUnderRoots(file, ctx.config.themeRoots);

    for (const scope of cssScopeRules(ctx)) {
      const themeRoot = inThemeRoot(scope.file);
      const root = isRootSelector(scope.rule.selector);
      for (const decl of scope.rule.declarations) {
        const property = decl.property.trim();
        if (themeRoot && property.startsWith('--')) continue;
        if (root && property.toLowerCase() === 'font-size') continue;
        const hazard = declarationHazard(property, decl.value);
        if (!hazard) continue;
        findings.push({
          ruleId: RULE_ID,
          tier: 'advisory',
          ...cssRulePosition(scope),
          message: message(`"${property}: ${decl.value.trim()}"`, hazard),
        });
      }
    }

    for (const file of ctx.files) {
      if (file.unparsedStyle) {
        const { lang, start, end } = file.unparsedStyle;
        findings.push({
          ruleId: RULE_ID,
          tier: 'advisory',
          file: file.file,
          line: lineAt(file.source, start),
          start,
          end,
          message: `<style lang="${lang}"> is an unparsed style block, not audited: the audit reads CSS, not a preprocessor's input, so no literal in it is checked. Write the block in CSS, or check its output in the rendered audit`,
        });
      }
      const themeRoot = inThemeRoot(file.file);
      for (const style of file.styleValues) {
        if (themeRoot && style.property?.startsWith('--')) continue;
        // Text after an interpolation has no property, so only a color is judgeable there: the
        // size checks read the property to know the value is a font size.
        const hazard = declarationHazard(style.property ?? '', style.value);
        if (!hazard) continue;
        findings.push({
          ruleId: RULE_ID,
          tier: 'advisory',
          file: file.file,
          line: style.line,
          start: style.start,
          end: style.end,
          message: message(
            style.property === undefined ? `"${style.value}"` : `"${style.property}: ${style.value}"`,
            hazard
          ),
        });
      }
      for (const token of file.classTokens) {
        const hazard = arbitraryValueHazard(token.value);
        if (!hazard) continue;
        findings.push({
          ruleId: RULE_ID,
          tier: 'advisory',
          file: file.file,
          line: token.line,
          start: token.start,
          end: token.end,
          message: message(`"${token.value}"`, hazard),
        });
      }
    }
    return findings;
  },
};
