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
// A declared palette declaration site (`config.paletteCssFiles`, config.ts) never trips this rule
// either, for the same reason a raw literal is fine there: the site IS where the palette's literal
// values get written down. `cairn-admin.css`'s own exclusion (previously by construction, never
// named as a consumer CSS file at all) and a site's own theme file now share this one named list,
// rather than the rule inventing a filename special case for the second one.
import { cssScopeRules } from './css-scope.js';
import { lineAt } from '../../markup.js';
import type { Finding, StaticRule } from '../../types.js';

// The CSS Color Module 4 named-color keywords, lowercase, minus `transparent` and `currentcolor`
// (see the header comment).
const NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green',
  'greenyellow', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
]);

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/;
const RGB_FUNCTION = /\brgba?\(/i;
const COLOR_WORD = /[a-zA-Z][a-zA-Z0-9-]*/g;

/** The arguments of the first `fn(...)` call in a value, alpha component dropped. */
function functionArgs(value: string, fn: RegExp): string[] | null {
  const match = fn.exec(value);
  if (!match) return null;
  const [main] = match[1].split('/');
  return main.trim().split(/[\s,]+/).filter((token) => token.length > 0);
}

const OKLCH_ARGS = /\boklch\(([^)]*)\)/i;
const OKLAB_ARGS = /\boklab\(([^)]*)\)/i;
const HSL_ARGS = /\bhsla?\(([^)]*)\)/i;

function isZero(token: string | undefined): boolean {
  return token !== undefined && Number.isFinite(parseFloat(token)) && parseFloat(token) === 0;
}

/** Whether a value expresses a color function with zero chroma or saturation: a bare gray. */
function isPureAchromatic(value: string): boolean {
  const oklch = functionArgs(value, OKLCH_ARGS);
  if (oklch && isZero(oklch[1])) return true;
  const oklab = functionArgs(value, OKLAB_ARGS);
  if (oklab && isZero(oklab[1]) && isZero(oklab[2])) return true;
  const hsl = functionArgs(value, HSL_ARGS);
  if (hsl && isZero(hsl[1])) return true;
  return false;
}

/** The first raw-literal or pure-achromatic hazard a declaration value carries, or null. */
function hazardIn(value: string): string | null {
  if (HEX_COLOR.test(value)) return 'a raw hex color literal';
  if (RGB_FUNCTION.test(value)) return 'a raw rgb()/rgba() color literal';
  for (const match of value.matchAll(COLOR_WORD)) {
    if (NAMED_COLORS.has(match[0].toLowerCase())) return `the raw named color "${match[0]}"`;
  }
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
    for (const { file, source, rule } of cssScopeRules(ctx)) {
      if (paletteSites.has(file)) continue;
      for (const decl of rule.declarations) {
        const hazard = hazardIn(decl.value);
        if (!hazard) continue;
        findings.push({
          ruleId: 'token-colors',
          tier: 'error',
          file,
          line: lineAt(source, rule.start),
          start: rule.start,
          end: rule.end,
          message: `"${decl.property}: ${decl.value}" carries ${hazard}, never a palette token`,
        });
      }
    }
    return findings;
  },
};
