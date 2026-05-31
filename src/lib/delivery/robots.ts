// cairn-cms: robots.txt builder (public-delivery design). A permissive default that points
// at the sitemap, with optional disallow rules.

/** Build a robots.txt body. */
export function buildRobots(opts: { sitemapUrl: string; disallow?: string[] }): string {
  const lines = ['User-agent: *', 'Allow: /'];
  for (const path of opts.disallow ?? []) lines.push(`Disallow: ${path}`);
  lines.push('', `Sitemap: ${opts.sitemapUrl}`, '');
  return lines.join('\n');
}
