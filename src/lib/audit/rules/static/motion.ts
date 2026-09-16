// The motion vocabulary cairn-audit's motion rules share. motion-band polices the duration a
// declaration names; reduced-motion polices whether the selector that names one is also overridden
// inside a reduced-motion guard. Both have to agree on which declarations count as motion at all
// and on which at-rule preludes count as that guard, or a property one rule measures becomes a
// property the other never asks about. motion-property and motion-vocabulary share the
// `--animate-*` indirection below for the same reason: an `animate-*` utility is only reachable
// through the custom property its compiled `animation` value names, and a rule that resolved that
// chain its own way would be checking a different animation from its sibling.
import type { CompiledSheet } from '../../sheet.js';

const MOTION_PROPERTY =
  /^(transition|transition-property|transition-duration|transition-timing-function|transition-delay|animation|animation-duration|animation-delay|animation-timing-function)$/;
// Matches the `reduce` form of the media feature and CSS's bare boolean form, which the spec
// defines as equivalent to `reduce`: `@media (prefers-reduced-motion)` with no value at all.
// Excludes only `(prefers-reduced-motion: no-preference)`, the inverse gate: a rule inside it runs
// ONLY when the visitor has NOT asked for reduced motion, so it guards nothing a reduced-motion
// visitor would see, and must never count as one. The negative lookahead is what lets the bare
// form match while still excluding the inverse gate, since the bare form names no value to require.
const REDUCED_MOTION_CONDITION = /prefers-reduced-motion(?!\s*:\s*no-preference)/;

/** Whether a declaration's property is one that gives an element motion. */
export function isMotionProperty(property: string): boolean {
  return MOTION_PROPERTY.test(property);
}

/** Whether a rule's enclosing at-rule preludes put it inside a reduced-motion guard. */
export function isReducedMotionGuarded(conditions: string[]): boolean {
  return conditions.some((condition) => REDUCED_MOTION_CONDITION.test(condition));
}

/**
 * The `--animate-*` custom property an `animation`/`animation-name` value references, absent when
 * the value names its animation directly rather than through the indirection Tailwind compiles.
 */
export function animateCustomProperty(value: string): string | undefined {
  const match = /^var\(\s*(--animate-[a-z0-9-]+)/i.exec(value.trim());
  return match ? match[1] : undefined;
}

/** The value the sheet declares for one custom property, wherever it declares it. */
export function customPropertyValue(sheet: CompiledSheet, customProperty: string): string | undefined {
  for (const rule of sheet.rules) {
    const decl = rule.declarations.find((entry) => entry.property === customProperty);
    if (decl) return decl.value.trim();
  }
  return undefined;
}
