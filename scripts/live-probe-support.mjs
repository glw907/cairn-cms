// cairn-cms: shared support for the check:* scripts that measure a LIVE preview server (computed
// styles, real layout) rather than parsing source. These scripts run against a running showcase
// server (examples/showcase's `npm run dev` or `npm run preview`); this module never starts one
// itself, so a caller sees a clear error rather than a silent hang against nothing. The two
// callers today, check-interactive-contrast.mjs and check-touch-targets.mjs, land the numeric
// probes from the 2026-07-17 Waymark final design review audit
// (docs/internal/2026-07-17-waymark-final-design-review-audit.md).
import { chromium } from 'playwright';

export { chromium };

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
