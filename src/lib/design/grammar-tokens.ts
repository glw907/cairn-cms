/**
 * The grammar-token inventory: the admin's structural type and spacing vocabulary, as CSS custom
 * property names. Each name is declared exactly once in `cairn-admin.css`, outside the light and
 * dark theme blocks, since a structural role (a heading's size, a control-to-control gap) does not
 * change with the palette. This module is the single source of truth the Task 1 definition test,
 * the Pass 2 audit rule, and the reference docs page all read, so the inventory stays in one place
 * rather than drifting across three call sites.
 */

/**
 * Every grammar-token custom property name currently defined, including the leading `--`. The six
 * `--cairn-type-*` entries are the ruled type-role scale (title through chip); the four
 * `--cairn-gap-*` entries are the ruled spacing-role scale (label through section).
 */
export const GRAMMAR_TOKENS: readonly string[] = [
  '--cairn-type-title',
  '--cairn-type-subtitle',
  '--cairn-type-body',
  '--cairn-type-meta',
  '--cairn-type-label',
  '--cairn-type-chip',
  '--cairn-gap-label',
  '--cairn-gap-control',
  '--cairn-gap-group',
  '--cairn-gap-section',
];
