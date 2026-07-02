// A stand-in for SvelteKit's $app/navigation, wired in by the component project's vite alias.
// The real module exists only inside a kit app; components under test import it statically, so
// the alias points here. Registrations are recorded so a test can drive a leave guard directly.
import type { BeforeNavigate } from '@sveltejs/kit';

/** Every callback components registered, oldest first. Tests read the most recent one. */
export const beforeNavigateCallbacks: Array<(navigation: BeforeNavigate) => void> = [];

/** Records the callback. The real implementation also auto-unregisters on component destroy. */
export function beforeNavigate(callback: (navigation: BeforeNavigate) => void): void {
  beforeNavigateCallbacks.push(callback);
}

/** Records the call. The real implementation re-runs every load function for the current page. */
export async function invalidateAll(): Promise<void> {}

/** Every URL goto() was called with, oldest first, so a test can assert a redirect-and-refresh flow. */
export const gotoCalls: string[] = [];

/** Every options object goto() was called with, index-aligned with gotoCalls, so a test can assert a
 *  caller passed { invalidateAll: true } to force the loader to re-run on an identical URL. */
export const gotoOptsCalls: unknown[] = [];

/** Records the call. The real implementation navigates client-side and re-runs the target's load. */
export async function goto(url: string, opts?: unknown): Promise<void> {
  gotoCalls.push(url);
  gotoOptsCalls.push(opts);
}
