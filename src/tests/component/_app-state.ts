// A stand-in for SvelteKit's $app/state, wired in by the component project's vite alias. The
// real module exists only inside a kit app; components under test import it statically, so the
// alias points here. A plain mutable object is enough: a test sets page.url (or page.data) before
// rendering, and no test asserts that a derived re-runs after a swap on a mounted component.
export const page: { url: URL; data: Record<string, unknown> } = {
  url: new URL('http://localhost/'),
  data: {},
};
