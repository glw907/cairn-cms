// The motion vocabulary cairn-audit's two motion rules share. motion-band polices the duration a
// declaration names; reduced-motion polices whether the selector that names one is also overridden
// inside a reduced-motion guard. Both have to agree on which declarations count as motion at all
// and on which at-rule preludes count as that guard, or a property one rule measures becomes a
// property the other never asks about.
const MOTION_PROPERTY =
  /^(transition|transition-property|transition-duration|transition-timing-function|transition-delay|animation|animation-duration|animation-delay|animation-timing-function)$/;
// Matches only the `reduce` form of the media feature. `(prefers-reduced-motion: no-preference)`
// is the inverse gate: a rule inside it runs ONLY when the visitor has NOT asked for reduced
// motion, so it guards nothing a reduced-motion visitor would see, and must never count as one.
const REDUCED_MOTION_CONDITION = /prefers-reduced-motion:\s*reduce\b/;

/** Whether a declaration's property is one that gives an element motion. */
export function isMotionProperty(property: string): boolean {
  return MOTION_PROPERTY.test(property);
}

/** Whether a rule's enclosing at-rule preludes put it inside a reduced-motion guard. */
export function isReducedMotionGuarded(conditions: string[]): boolean {
  return conditions.some((condition) => REDUCED_MOTION_CONDITION.test(condition));
}
