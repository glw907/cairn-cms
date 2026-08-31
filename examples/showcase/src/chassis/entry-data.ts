// The showcase's one entry-data augmentation: the reference-edge resolution `(site)/[...path]`'s
// entryLoad and `(site)/preview/[token]`'s previewLoad both apply on top of the engine's own
// `EntryData`/`PreviewData` shape, factored here so the two routes cannot drift apart on it.
import { resolveReferences, buildSiteDescriptors, type ResolvedReference } from '@glw907/cairn-cms/delivery';
import { site } from './content.js';
import { cairn, siteConfig } from '$theme/cairn.config.js';

// The concept descriptors, by id, so withReferences can hand resolveReferences the right field
// schema for the entry it resolved. buildSiteDescriptors derives them from the same adapter the indexes
// are built from, so the descriptor's reference fields match the manifest's edges.
const descriptorById = new Map(buildSiteDescriptors(cairn, siteConfig).map((d) => [d.id, d]));

/** Any engine data shape carrying the fields withReferences reads: a concept id and an entry. */
interface WithConceptAndEntry {
  concept: string;
  entry: { frontmatter: Record<string, unknown> };
}

/**
 * Resolve an entry's reference edges to their target identities at the cross-concept
 * site-resolver layer (the only layer that can reach a different concept's entries): a post's
 * `author` edge targets a pages entry, which the posts index alone cannot read. Returns an empty
 * map when the concept declares no reference fields, so a template can always read
 * `data.references` unconditionally.
 */
export function withReferences<T extends WithConceptAndEntry>(
  data: T,
): T & { references: Record<string, ResolvedReference | ResolvedReference[]> } {
  const descriptor = descriptorById.get(data.concept);
  const references: Record<string, ResolvedReference | ResolvedReference[]> = descriptor
    ? resolveReferences(site, descriptor, data.entry.frontmatter)
    : {};
  return { ...data, references };
}
