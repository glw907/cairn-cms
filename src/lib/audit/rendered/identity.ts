// The post-hydration page-identity guard: what a route's identity looks like on the wire, how a
// hydrated capture is compared against it, and the settle window a capture waits through first.
// `capturePageIdentity` and `waitForHydrationSettle` both run inside the page (Playwright
// serializes each by source), so both stay self-contained: no references outside their own bodies.
import type { PageIdentity, RenderedBrowser, Theme } from './types.js';

/**
 * Runs inside the page, on both the no-JS SSR capture and the settled hydrated capture, so its
 * result means the same thing on either side of {@link identitiesMatch}. Self-contained: no
 * references outside its own body, the same discipline `resolveColorsInPage` follows, since
 * Playwright serializes it by source.
 */
export function capturePageIdentity(): PageIdentity {
  const main = document.querySelector('main, [role="main"]');
  let landmark: string | null = null;
  if (main) {
    const tag = main.tagName.toLowerCase();
    const id = main.id ? `#${CSS.escape(main.id)}` : '';
    const heading = main.querySelector('h1, h2, h3, legend');
    const headingText = (heading?.textContent ?? '').trim().slice(0, 80);
    landmark = `${tag}${id}::${headingText}`;
  }
  return { title: document.title.trim(), landmark };
}

/**
 * Whether two {@link PageIdentity} captures describe the same page. Absence of a landmark on both
 * sides, the login page, a consumer route with no `<main>`, counts as agreement: `landmark: null` on
 * both is not itself evidence of a swap, only a page that never carried one.
 */
export function identitiesMatch(a: PageIdentity, b: PageIdentity): boolean {
  return a.title === b.title && a.landmark === b.landmark;
}

/**
 * A settle window after hydration, run inside the page so the wait costs one round trip rather than
 * a Node-side timeout blocking the whole run. Self-contained for the same reason
 * {@link capturePageIdentity} is: Playwright serializes it by source.
 */
export function waitForHydrationSettle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())), 300);
  });
}

/**
 * Capture a route's SSR identity: what the server actually sent, before any client script has a
 * chance to run. A dedicated context with JavaScript disabled is the only way to guarantee that;
 * reading it from the same context immediately after `goto` resolves already races the client
 * bundle, which is the exact race the ASC hydrated-404 defect exploited (the harness measured a page
 * that had already swapped chrome before it ever looked). Playwright still serves `evaluate` calls
 * through the page's own runtime binding regardless of `javaScriptEnabled`, so
 * {@link capturePageIdentity} is unchanged between this capture and the hydrated one.
 */
export async function captureSsrIdentity(
  browser: RenderedBrowser,
  theme: Theme,
  baseUrl: string,
  pagePath: string,
  cookies: { name: string; value: string; url: string }[]
): Promise<PageIdentity> {
  const context = await browser.newContext({ colorScheme: theme, javaScriptEnabled: false });
  try {
    await context.addCookies(cookies);
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'load', timeout: 45_000 });
      return await page.evaluate(capturePageIdentity);
    } finally {
      await page.close();
    }
  } finally {
    await context.close();
  }
}
