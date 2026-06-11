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
