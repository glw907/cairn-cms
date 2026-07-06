import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$chassis/content';
import { cairn, siteConfig } from '$theme/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml' },
});

export const entries: EntryGenerator = () => routes.entries();

/** A sidebar summary sentence per Terms band, matching `src/pages/terms.astro`'s own hand-written
 *  `slot="sidebar"` copy (oxygenna-themes/foxi-astro-theme, MIT); this is page chrome, not body
 *  content, so it lives here rather than in the markdown source. */
const TERMS_BAND_LEAD: Record<string, string> = {
  Introduction:
    'Please take a moment to read through these terms to understand your rights and responsibilities while using our services.',
  'User Accounts':
    'This section explains the requirements and responsibilities associated with creating and maintaining a user account on Foxi. Please ensure you understand and comply with these guidelines to use our services effectively.',
  'Limitation of Liability':
    'This section outlines the limitations of our liability regarding the use of Foxi services. Understanding these limitations helps you know the extent of our responsibilities and your rights.',
};

/** Split a rendered page's HTML into one band per top-level `<h2>`, the heading text becoming a
 *  sidebar title and everything up to the next `<h2>` (or the end) becoming that band's body.
 *  The Terms page is the one route that wants this (see `TermsContent` in `+page.svelte`); every
 *  other page renders its `data.html` as one flowing article. */
function splitBands(html: string): { heading: string; html: string }[] {
  const headingRe = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  const matches = [...html.matchAll(headingRe)];
  return matches.map((match, index) => {
    const heading = match[1].replace(/<[^>]+>/g, '').trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? html.length) : html.length;
    return { heading, html: html.slice(start, end).trim() };
  });
}

export const load: PageServerLoad = async ({ url }) => {
  const data = await routes.entryLoad({ url });
  if (data.entry.id !== 'terms') return data;
  const termsBands = splitBands(data.html).map((band) => ({ ...band, lead: TERMS_BAND_LEAD[band.heading] ?? '' }));
  return { ...data, termsBands };
};
