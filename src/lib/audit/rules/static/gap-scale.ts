// cairn-audit's gap-scale rule: an admin component's own arbitrary margin/padding/gap literal (a
// Tailwind bracket, never a named step) has to resolve to a scale. `gap`/`gap-x`/`gap-y` resolve
// either through one of the four ratified `--cairn-gap-*` relationship roles (label/control/group/
// section) by var() reference, or, like margin and padding, through Tailwind's own spacing grid: a
// plain rem/px length landing on an exact HALF-step of `--spacing` (0.125rem, the finest increment
// Tailwind's own named scale carries: `p-0.5`, `p-2.5`), the same grid a named step (`p-4`) rides
// by construction and this rule never even looks at. A bracket whose value is not a plain length (a
// viewport unit, a `calc()`, an `env()`) is expressing geometry the spacing scale has no vocabulary
// for at all, a safe-area inset or a viewport-relative offset rather than a spacing relationship,
// so it falls outside this rule's remit rather than failing it.
import type { Finding, StaticRule } from '../../types.js';

const HALF_STEP_REM = 0.125;

const BRACKET_UTILITY =
  /^-?(m|mx|my|mt|mb|ms|me|ml|mr|p|px|py|pt|pb|ps|pe|pl|pr|gap|gap-x|gap-y)-\[(.+)\]$/;
const PLAIN_LENGTH = /^(-?\d+(?:\.\d+)?)(rem|px)$/;
const GAP_ROLE_VAR = /^var\(\s*(--cairn-gap-(?:label|control|group|section))\s*\)$/;
const GAP_PROPERTIES = new Set(['gap', 'gap-x', 'gap-y']);

/**
 * Whether a bracket utility's raw value already resolves to a ratified scale. A value that is not
 * a plain rem/px length (a `calc()`, an `env()`, a viewport unit) is outside this rule's remit and
 * reads as resolved, not as a violation of a scale it was never expressed in.
 */
function resolvesToScale(property: string, value: string): boolean {
  if (GAP_PROPERTIES.has(property) && GAP_ROLE_VAR.test(value)) return true;
  const length = PLAIN_LENGTH.exec(value);
  if (!length) return true;
  const rem = length[2] === 'px' ? Number(length[1]) / 16 : Number(length[1]);
  const steps = rem / HALF_STEP_REM;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export const gapScale: StaticRule = {
  id: 'gap-scale',
  tier: 'error',
  check(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.files) {
      for (const token of file.classTokens) {
        const match = BRACKET_UTILITY.exec(token.value);
        if (!match) continue;
        const [, property, value] = match;
        if (resolvesToScale(property, value)) continue;
        findings.push({
          ruleId: 'gap-scale',
          tier: 'error',
          file: file.file,
          line: token.line,
          start: token.start,
          end: token.end,
          message: `class "${token.value}" is an arbitrary ${property} literal that resolves to no gap-role or spacing-scale token`,
        });
      }
    }
    return findings;
  },
};
