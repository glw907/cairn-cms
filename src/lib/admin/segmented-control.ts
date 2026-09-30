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
 * hairline at a 55% `base-content` mix as a non-color, non-weight pressed cue: measured
 * 3.586:1 light and 4.959:1 dark against `base-100`, above the WCAG 1.4.11 3:1 non-text floor
 * (docs/internal/admin-design-system.md, "Tokens (Warm Stone)", the same mix already locked for
 * the unchecked checkbox/radio edge and the unfocused input edge). A 20% mix measured 1.492:1
 * light and 1.773:1 dark, under the floor, which is why the ring is 55% and not 20%. The wash
 * beside it, `bg-base-content/[0.07]`, is deliberately not raised: it is a fill tone rather than
 * the 1.4.11-bearing cue, and raising it would change every caller's fill weight for no
 * conformance gain. `false` returns the muted, untinted ink. A caller appends this to its own
 * layout classes.
 */
export function segmentTintClass(active: boolean): string {
  return active
    ? 'bg-base-content/[0.07] text-base-content font-semibold ring-1 ring-inset ring-base-content/55'
    : 'text-muted';
}
