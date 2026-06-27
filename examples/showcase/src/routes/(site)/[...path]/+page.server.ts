import type { PageServerLoad, EntryGenerator } from './$types';
import { createPublicRoutes, resolveReferences, siteDescriptors, type ResolvedReference } from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, publicMediaResolver, mediaEnabled, siteConfig } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.render,
  origin: ORIGIN,
  siteName: cairn.siteName,
  description: SITE_DESCRIPTION,
  defaultImage: ORIGIN + '/og/default.png',
  feeds: { rss: ORIGIN + '/feed.xml', json: ORIGIN + '/feed.json' },
  // The same resolver the body render path uses, injected so the read path resolves the frontmatter
  // `image` hero into the `heroImage` projection the template and the SEO head read.
  resolveMedia: publicMediaResolver,
  // Arms the engine's media.resolver_absent diagnostic: with media on, dropping resolveMedia above
  // logs a warning instead of silently shipping broken hero images.
  assetsEnabled: mediaEnabled,
});

// The concept descriptors, by id, so the load can hand resolveReferences the right field schema for
// the entry it resolved. siteDescriptors derives them from the same adapter the indexes are built
// from, so the descriptor's reference fields match the manifest's edges.
const descriptorById = new Map(siteDescriptors(cairn, siteConfig).map((d) => [d.id, d]));

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = async ({ url }) => {
  const data = await routes.entryLoad({ url });
  // Resolve the entry's reference edges to their target identities at the cross-concept site-resolver
  // layer (the only layer that can reach a different concept's entries): a post's `author` edge
  // targets a pages entry, which the posts index alone cannot read. The template renders the resolved
  // author as a link to its permalink. An empty map when the concept has no reference fields.
  const descriptor = descriptorById.get(data.concept);
  const references: Record<string, ResolvedReference | ResolvedReference[]> = descriptor
    ? resolveReferences(site, descriptor, data.entry.frontmatter)
    : {};
  return { ...data, references };
};
