// The motion vocabulary cairn-audit's two motion rules share. motion-band polices the duration a
// declaration names; reduced-motion polices whether the selector that names one is also overridden
// inside a reduced-motion guard. Both have to agree on which declarations count as motion at all
// and on which at-rule preludes count as that guard, or a property one rule measures becomes a
// property the other never asks about.
const MOTION_PROPERTY = /^(transition|transition-duration|animation|animation-duration)$/;
const REDUCED_MOTION_CONDITION = /prefers-reduced-motion/;

/** Whether a declaration's property is one that gives an element motion. */
export function isMotionProperty(property: string): boolean {
  return MOTION_PROPERTY.test(property);
}

/** Whether a rule's enclosing at-rule preludes put it inside a reduced-motion guard. */
export function isReducedMotionGuarded(conditions: string[]): boolean {
  return conditions.some((condition) => REDUCED_MOTION_CONDITION.test(condition));
}
