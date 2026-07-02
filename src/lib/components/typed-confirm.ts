// cairn-cms: the typed-confirm gate shared by every destructive admin dialog that requires a
// visible, typed confirmation (an entry's slug, a selected count) rather than a bare confirm
// button. It is the one legitimate submit-disable in the admin: the gate is visible and the
// visitor controls it by typing, unlike a hidden or time-based disable.

/**
 * Whether a typed-confirm input matches its target identity, gating a destructive submit. The
 * target is stringified so a numeric count (e.g. a selected-file total) compares the same way a
 * slug does.
 */
export function confirmGateMatches(typed: string, target: string | number): boolean {
  return typed === String(target);
}
