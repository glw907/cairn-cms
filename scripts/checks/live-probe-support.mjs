// cairn-cms: what the two LIVE repo gates still share after their graduation into the packaged
// cairn-audit engine. Both gates (check-interactive-contrast, check-touch-targets) now run the
// engine's own rendered rules against a running showcase server, so the probe mechanics this module
// used to own are gone: the browser driver, the per-context loop, the settle, the teardown, and the
// allowlist matcher all live in src/lib/audit/rendered.ts now, exercised by the audit's own fixture
// suite. What remains is the one thing the engine deliberately does not do, since its own page list
// is a consumer's configured routes: enumerate the showcase's public pages from its sitemap, so a
// new page joins both gates without either script being edited.
//
// Neither gate starts a server. `runRendered` fails naming the URL it tried when nothing answers.

/**
 * The site's page set to probe: sitemap.xml's paths, unioned with `extra`. Falls back to `/` alone
 * if the sitemap route is unavailable.
 * @param {string} baseUrl
 * @param {string[]} [extra] additional paths the sitemap does not carry (a styleguide, say)
 * @returns {Promise<string[]>}
 */
export async function resolvePages(baseUrl, extra = []) {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  const xml = res.ok ? await res.text() : '';
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const pages = locs.length ? locs : ['/'];
  return [...new Set([...pages, ...extra])];
}
