// cairn-cms: robots.txt builder (public-delivery design). A permissive default that points
// at the sitemap, with optional disallow rules and an optional AI-crawler posture.
//
// `Content-Signal` syntax follows Cloudflare's published policy
// (https://blog.cloudflare.com/content-signals-policy/): directive `Content-Signal`, keys
// `search`/`ai-input`/`ai-train`, values `yes`/`no`, pairs separated by a comma and a space. An
// absent key is no expressed preference, which is why `decline` emits `ai-train=no` alone: cairn
// has no standing to assert a search preference on a site's behalf. Cloudflare's managed robots.txt
// also appends a `use=` key; that is a newer managed-only addition, not part of the published
// policy, and this builder does not emit it.
import type { AiPosture } from '../content/types.js';
import { AI_CRAWLERS } from './ai-crawlers.js';

/**
 * Build a robots.txt body. `posture` is optional and defaults to stating nothing: an unset
 * posture produces byte-identical output to a site that never states one. `'decline'` adds one
 * `User-agent`/`Disallow` group per {@link AI_CRAWLERS} token plus a `Content-Signal` line
 * declining training. `'invite'` adds a `Content-Signal` line inviting training and no
 * `Disallow`, since there is no robots directive that invites a crawler. Neither direction is
 * enforcement: see `AiPosture` for the honesty constraint this builder holds to.
 */
export function buildRobots(opts: { sitemapUrl: string; disallow?: string[]; posture?: AiPosture }): string {
  const lines = ['User-agent: *'];
  if (opts.posture === 'decline') lines.push('Content-Signal: ai-train=no');
  if (opts.posture === 'invite') lines.push('Content-Signal: search=yes, ai-train=yes');
  lines.push('Allow: /');
  for (const path of opts.disallow ?? []) lines.push(`Disallow: ${path}`);
  if (opts.posture === 'decline') {
    for (const crawler of AI_CRAWLERS) lines.push('', `User-agent: ${crawler.token}`, 'Disallow: /');
  }
  lines.push('', `Sitemap: ${opts.sitemapUrl}`, '');
  return lines.join('\n');
}
