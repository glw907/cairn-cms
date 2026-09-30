// cairn-audit's token-colors rule: a CSS declaration never spells a color out as a raw hex, rgb(),
// or named-color literal, and never as a pure achromatic (a color function whose chroma or
// saturation component is exactly zero). Five literal-white declarations bypassing the palette
// tokens motivated this rule; the mechanical floor under the craft chapter's "neutrals always
// derive from the palette's neutral role" rule falls out of the same two checks, since every way
// CSS has of writing a raw neutral (`white`, `#fff`, `rgb(128 128 128)`, `oklch(50% 0 0)`) is
// already one of hex/rgb/named or pure achromatic; nothing else needs its own check.
//
// `transparent` and `currentColor` are excluded from the named-color set: both are CSS keywords a
// declaration reaches for constantly (a color-mix fade, an inherited ink), and neither names a
// color choice the palette could have supplied instead.
//
// The detection itself lives in the shared literal core (../../literals.ts), which also knows the
// chromatic and wide-gamut forms. This rule keeps its own verdict set: hex, rgb, named colors, and
// the achromatic function forms. `public-literals` acts on every form the core reports.
//
// A declared palette declaration site (`config.paletteCssFiles`, config.ts) never trips this rule
// either, for the same reason a raw literal is fine there: the site IS where the palette's literal
// values get written down. `cairn-admin.css`'s own exclusion (previously by construction, never
// named as a consumer CSS file at all) and a site's own theme file now share this one named list,
// rather than the rule inventing a filename special case for the second one.
import { cssRulePosition, cssScopeRules } from './css-scope.js';
import { findColorLiteral, isPureAchromatic } from '../../literals.js';
import type { ColorForm } from '../../literals.js';
import type { Finding, StaticRule } from '../../types.js';

// The forms this rule has always convicted. The core's other forms convict only through the
// achromatic check below, when their chroma or saturation is exactly zero.
const VERDICT_FORMS: ReadonlySet<ColorForm> = new Set(['hex', 'rgb', 'named']);

/** The first raw-literal or pure-achromatic hazard a declaration value carries, or null. */
function hazardIn(value: string): string | null {
  const literal = findColorLiteral(value);
  if (literal && VERDICT_FORMS.has(literal.form)) return literal.description;
  if (isPureAchromatic(value)) {
    return 'a pure achromatic color (zero chroma/saturation), never derived from --color-neutral';
  }
  return null;
}

export const tokenColors: StaticRule = {
  id: 'token-colors',
  tier: 'error',
  check(ctx) {
    const paletteSites = new Set(ctx.config.paletteCssFiles);
    const findings: Finding[] = [];
    for (const scope of cssScopeRules(ctx)) {
      if (paletteSites.has(scope.file)) continue;
      for (const decl of scope.rule.declarations) {
        const hazard = hazardIn(decl.value);
        if (!hazard) continue;
        findings.push({
          ruleId: 'token-colors',
          tier: 'error',
          ...cssRulePosition(scope),
          message: `"${decl.property}: ${decl.value}" carries ${hazard}, never a palette token`,
        });
      }
    }
    return findings;
  },
};
