import type { PageServerLoad } from './$types';
import { readVocabulary } from '@glw907/cairn-cms';
import {
  buildSeoMeta,
  createPublicRoutes,
  readSeoFields,
  resolveImageUrl,
} from '@glw907/cairn-cms/delivery';
import { posts, site } from '#chassis/content.js';
import { siteConfig } from '#site/site-config.js';
import { paginateArchive } from '#chassis/archive.js';
import { publicRoutesConfig } from '#chassis/public-routes.js';
import { withReferences } from '#chassis/entry-data.js';
import { buildHomeData } from './home.js';

export const prerender = true;

const routes = createPublicRoutes(publicRoutesConfig);

// A published `pages` entry whose id is `home` turns this route into that page with the newest
// posts set into it. Its own URL, `/home`, redirects here, so the page answers at `/` alone and
// its canonical and `og:url` say so. Without one, the route is archive page one as below.
async function loadHomePage() {
  const { origin, siteName, description, feeds, defaultImage } = publicRoutesConfig;
  const data = withReferences(await routes.entryLoad({ url: new URL('/home', origin) }));
  const canonicalUrl = origin + '/';
  // The same head inputs the engine composes for any page, with `/` as its address.
  const fields = readSeoFields(data.entry.frontmatter);
  const rawImage = fields.image ?? defaultImage;
  const image =
    data.heroImage?.absoluteUrl ?? (rawImage ? resolveImageUrl(rawImage, origin) : undefined);
  const imageAlt = data.heroImage?.alt.trim() ? data.heroImage.alt : undefined;
  const seo = buildSeoMeta({
    title: data.entry.title,
    description: fields.description || data.entry.excerpt || description,
    canonicalUrl,
    siteName,
    type: 'website',
    feeds,
    ...(image ? { image } : {}),
    ...(imageAlt ? { imageAlt } : {}),
    ...(fields.robots ? { robots: fields.robots } : {}),
  });
  return { ...data, canonicalUrl, seo, home: buildHomeData(data.html, posts.all()) };
}

// The home is archive page one unless a home page exists: the newest entry gets a featured lead,
// and the paginated, year-grouped index starts from the entry after it. Deeper pages live at
// /archive/[page] (paginateArchive is the one shared shape both routes build from), keeping this
// URL exactly "/".
//
// posts.all() is already newest-first (a dated concept's engine ordering contract, documented in
// the concept reader's doc comment), so this route relies on that order rather than re-sorting it.
export const load: PageServerLoad = async () => {
  const hasHomePage = site
    .concept('pages')
    ?.all()
    .some((page) => page.id === 'home');
  if (hasHomePage) return loadHomePage();
  const entries = posts.all();
  const featured = entries[0];
  const archive = paginateArchive(entries.slice(1), 1);
  // The home reads its tag-filter options from the site's committed vocabulary (the {value,label}
  // list), so the control labels the slugs editors curate rather than the raw frontmatter tokens.
  const seo = buildSeoMeta({
    title: publicRoutesConfig.siteName,
    description: publicRoutesConfig.description,
    canonicalUrl: publicRoutesConfig.origin + '/',
    siteName: publicRoutesConfig.siteName,
    type: 'website',
    feeds: publicRoutesConfig.feeds,
  });
  return {
    featured,
    archive,
    vocabulary: readVocabulary(siteConfig),
    seo,
    description: publicRoutesConfig.description,
  };
};
