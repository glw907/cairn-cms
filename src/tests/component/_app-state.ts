// A stand-in for SvelteKit's $app/state, wired in by the component project's vite alias. The
// real module exists only inside a kit app; components under test import it statically, so the
// alias points here. A plain mutable object is enough: a test sets page.url (or page.data) before
// rendering, and no test asserts that a derived re-runs after a swap on a mounted component.
export const page: { url: URL; data: Record<string, unknown> } = {
  url: new URL('http://localhost/'),
  data: {},
};

/**
 * Test-only control that installs, on `page.url`, a URL whose `searchParams` getter throws the
 * way SvelteKit's real prerendering guard does (`Cannot access url.searchParams on a page with
 * prerendering enabled`). A plain `new URL(...)`'s `searchParams` never throws, so a component
 * under test that skips its own `building` guard would pass against the default fake anyway; this
 * exists so one test can prove the guard fires against a URL that actually refuses the read. The
 * caller must restore `page.url` itself once done (`page.url` is already a plain settable field,
 * so there is no separate restore counterpart).
 */
export function __setPrerenderingUrl(href: string): void {
  const url = new URL(href);
  Object.defineProperty(url, 'searchParams', {
    get(): URLSearchParams {
      throw new Error('Cannot access url.searchParams on a page with prerendering enabled');
    },
  });
  page.url = url;
}
