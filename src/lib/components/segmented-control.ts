// cairn-cms: the check-and-tint class fragment shared by every admin segmented control (a
// bordered pick-one radiogroup, a standalone toggle). Each control composes its own layout
// classes (padding, gap, text size, hover treatment), which vary by screen; only the tint that
// marks the active segment is identical everywhere, so this is the one piece worth sharing. The
// non-color cue (a check glyph rendered alongside the tint) stays local to each caller, since its
// markup differs by control.

/**
 * The active/inactive tint fragment for one segment of a check-and-tint control. `active` true
 * returns a neutral wash plus stronger weight and full ink, so the active state speaks through
 * weight rather than hue (the accent budget reserves color for act-on states), plus a 1px inset
 * hairline in the same neutral ink as a non-color, non-weight pressed cue (WCAG 1.4.11 non-text
 * contrast); false returns the muted, untinted ink. A caller appends this to its own layout
 * classes.
 */
export function segmentTintClass(active: boolean): string {
  return active
    ? 'bg-base-content/[0.07] text-base-content font-semibold ring-1 ring-inset ring-base-content/20'
    : 'text-muted';
}
