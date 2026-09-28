// cairn-cms: the origin-refocus dialog lifecycle shared by every admin dialog that is opened from
// more than one trigger. Each dialog's own open()/close() still owns its feature state (the step,
// the fetched plan, the typed-confirm input); only the two focus-restore edges are common, so this
// stays two plain functions rather than a stateful factory.

/**
 * Resolve the focus-restore origin for a dialog open: the explicitly passed element (the click
 * target, when a handler captures `e.currentTarget`), else the document's current active element,
 * else `null`. A caller assigns the result to its own origin variable.
 */
export function resolveDialogOrigin(explicit?: HTMLElement | null): HTMLElement | null {
  return explicit ?? (document.activeElement as HTMLElement | null) ?? null;
}

/**
 * Refocus a captured dialog-open origin on close. Returns `null` so a caller can clear its own
 * origin variable in the same assignment: `xOrigin = refocusDialogOrigin(xOrigin);`.
 */
export function refocusDialogOrigin(origin: HTMLElement | null): null {
  origin?.focus();
  return null;
}
