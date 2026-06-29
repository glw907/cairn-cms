import type { PageServerLoad, EntryGenerator } from './$types';
import { error } from '@sveltejs/kit';
import {
  createPublicRoutes,
  resolveReferences,
  siteDescriptors,
  tagArchivePath,
  type ResolvedReference,
} from '@glw907/cairn-cms/delivery';
import { site, ORIGIN, SITE_DESCRIPTION } from '$lib/content';
import { cairn, publicMediaResolver, mediaEnabled, siteConfig } from '$lib/cairn.config';

export const prerender = true;

const routes = createPublicRoutes({
  site,
  render: cairn.rendering.render,
  origin: ORIGIN,
  siteName: siteConfig.siteName,
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
// the entry it resolved, and so the tag index can read a concept's resolved taxonomyBase to build each
// tag's archive href. siteDescriptors derives them from the same adapter the indexes are built from,
// so the descriptor's reference fields and taxonomy base match the manifest's edges and routes.
const descriptorById = new Map(siteDescriptors(cairn, siteConfig).map((d) => [d.id, d]));

export const entries: EntryGenerator = () => routes.entries();

export const load: PageServerLoad = async ({ url }) => {
  // One door: the engine resolves any path to a discriminated entry/tagIndex/tagArchive payload, or
  // undefined for a miss, which is the route layer's to turn into a 404.
  const data = await routes.resolveRoute({ url });
  if (!data) throw error(404, 'Not found');

  if (data.kind === 'entry') {
    // Resolve the entry's reference edges to their target identities at the cross-concept site-resolver
    // layer (the only layer that can reach a different concept's entries): a post's `author` edge
    // targets a pages entry, which the posts index alone cannot read. The template renders the resolved
    // author as a link to its permalink. An empty map when the concept has no reference fields. This
    // glue lives inside the entry branch because only the entry payload carries `entry.frontmatter`.
    const descriptor = descriptorById.get(data.concept);
    const references: Record<string, ResolvedReference | ResolvedReference[]> = descriptor
      ? resolveReferences(site, descriptor, data.entry.frontmatter)
      : {};
    return { ...data, references };
  }

  if (data.kind === 'tagIndex') {
    // Build each tag's archive href from the concept's resolved taxonomyBase through the engine codec,
    // so the index links match the very routes the resolver enumerates and answers.
    const base = descriptorById.get(data.concept)?.taxonomyBase;
    const links = data.tags.map((t) => ({
      ...t,
      href: base ? tagArchivePath(base, t.tag) : '#',
    }));
    return { ...data, links };
  }

  // A tag archive: the engine already carries the tag and its entries; the template renders them.
  return data;
};
