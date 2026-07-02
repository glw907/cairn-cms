// cairn-cms: the check-and-tint class fragment shared by every admin segmented control (a
// bordered pick-one radiogroup, a standalone toggle). Each control composes its own layout
// classes (padding, gap, text size, hover treatment), which vary by screen; only the tint that
// marks the active segment is identical everywhere, so this is the one piece worth sharing. The
// non-color cue (a check glyph rendered alongside the tint) stays local to each caller, since its
// markup differs by control.

/**
 * The active/inactive tint fragment for one segment of a check-and-tint control. `active` true
 * returns the primary tint plus bold weight; false returns the muted, untinted ink. A caller
 * appends this to its own layout classes.
 */
export function segmentTintClass(active: boolean): string {
  return active ? 'bg-primary/10 text-primary font-medium' : 'text-muted';
}
