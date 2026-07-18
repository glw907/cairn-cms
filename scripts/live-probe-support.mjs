// cairn-cms: shared support for the check:* scripts that measure a LIVE preview server (computed
// styles, real layout) rather than parsing source. These scripts run against a running showcase
// server (examples/showcase's `npm run dev` or `npm run preview`); this module never starts one
// itself, so a caller sees a clear error rather than a silent hang against nothing. The two
// callers today, check-interactive-contrast.mjs and check-touch-targets.mjs, land the numeric
// probes from the 2026-07-17 Waymark final design review audit
// (docs/internal/2026-07-17-waymark-final-design-review-audit.md).
import { chromium } from 'playwright';

/** The preview server address a probe targets absent `BASE_URL`: examples/showcase's own
 *  `npm run preview` default port. */
export const DEFAULT_BASE_URL = 'http://localhost:4173';

/**
 * Whether `url` answers with anything short of a server error (a 404 still means it is
 * listening).
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function isReachable(url) {
  try {
    const res = await fetch(url);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * The BASE_URL a probe runs against: `process.env.BASE_URL` or {@link DEFAULT_BASE_URL}. Throws
 * with a clear message if nothing answers there, since these scripts drive a server they do not
 * start.
 * @returns {Promise<string>}
 */
export async function resolveBaseUrl() {
  const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;
  if (!(await isReachable(baseUrl))) {
    throw new Error(
      `no server answering at ${baseUrl}; start examples/showcase's preview (npm run build && npm run preview, or npm run dev) or set BASE_URL, then re-run`,
    );
  }
  return baseUrl;
}

/**
 * The site's page set to probe: sitemap.xml's paths, unioned with `extra`. Falls back to `/` alone
 * if the sitemap route is unavailable.
 * @param {string} baseUrl
 * @param {string[]} [extra] additional paths the sitemap does not carry (a 404 page, say)
 * @returns {Promise<string[]>}
 */
export async function resolvePages(baseUrl, extra = []) {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  const xml = res.ok ? await res.text() : '';
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const pages = locs.length ? locs : ['/'];
  return [...new Set([...pages, ...extra])];
}

/**
 * Whether an allowlist entry covers a finding, by exact page+selector.
 * @param {{ page: string, selector: string, reason: string }[]} allowlist
 * @param {string} page
 * @param {string} selector
 * @returns {boolean}
 */
export function isAllowed(allowlist, page, selector) {
  return allowlist.some((entry) => entry.page === page && entry.selector === selector);
}

/**
 * Drive every `path` in every browser context and collect each page's in-page findings. Owns the
 * shared probe mechanics both live checks need: one browser, one context per `contexts` entry, a
 * fresh page per path that a non-2xx/3xx response skips, a short settle before evaluating, and
 * teardown of every page, context, and the browser. Results preserve context-then-path order, so a
 * caller renders its failures in a stable sequence.
 * @template T
 * @param {object} args
 * @param {string} args.baseUrl the reachable server the pages load from
 * @param {string[]} args.pages the paths to visit under each context
 * @param {{ label: string, options: import('playwright').BrowserContextOptions }[]} args.contexts one browser context per entry; `label` tags that context's results
 * @param {() => T[]} args.evaluate the in-page probe run per page (Playwright serializes it, so it must be self-contained)
 * @returns {Promise<{ label: string, path: string, findings: T[] }[]>}
 */
export async function collectFindings({ baseUrl, pages, contexts, evaluate }) {
  const browser = await chromium.launch();
  /** @type {{ label: string, path: string, findings: T[] }[]} */
  const results = [];
  try {
    for (const { label, options } of contexts) {
      const context = await browser.newContext(options);
      for (const path of pages) {
        const page = await context.newPage();
        const response = await page.goto(baseUrl + path, { waitUntil: 'load', timeout: 45_000 });
        if (!response || response.status() >= 400) {
          await page.close();
          continue;
        }
        await page.waitForTimeout(300);
        const findings = await page.evaluate(evaluate);
        results.push({ label, path, findings });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}
