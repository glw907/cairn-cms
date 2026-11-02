// cairn-cms: the build-side manifest builder (content-graph design). buildSiteManifest mirrors
// createSiteResolver: it buckets the site's one content glob by concept and projects each file to
// a manifest row. The build-time cairn: link resolver lives beside the site resolver in
// site-resolver.ts; the admin preview uses manifestLinkResolver instead.
import { bucketConceptFiles } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { log } from '../log/index.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest } from '../content/manifest.js';
import type { CairnAdapter } from '../content/types.js';

/**
 * Build the whole-corpus manifest from a site's adapter and its one content glob. Drafts are
 *  included and flagged, so the admin picker and the guards see the full graph.
 * @throws When a concept's `dir` sits outside `src/content`, or a file sits under no concept's `dir`.
 * @public
 */
export function buildSiteManifest(adapter: CairnAdapter, files: Record<string, string>): Manifest {
  const manifest = emptyManifest();
  for (const { descriptor, files: record } of bucketConceptFiles(adapter, files)) {
    const declared = new Set(descriptor.fields.map((f) => f.name));
    const undeclared = new Set<string>();
    for (const file of fromGlob(record)) {
      // Validate the same way createContentIndex does, so the manifest and the site resolver agree on
      // which entries exist. A validation failure is excluded from both; otherwise the preview would
      // resolve a link the build then rejects as a missing target.
      const { frontmatter, body } = parseMarkdown(file.raw);
      for (const key of Object.keys(frontmatter)) if (!declared.has(key)) undeclared.add(key);
      const verdict = descriptor.validate(frontmatter, body);
      if (!verdict.ok) {
        // The entry gets no manifest row, so the admin's concept list never shows it. Name it,
        // drafts included, since a draft is exempt from the build's own validation failure.
        log.warn('content.entry_invalid', {
          scope: 'manifest',
          concept: descriptor.id,
          path: file.path,
          draft: frontmatter.draft === true,
          errors: verdict.errors,
        });
        continue;
      }
      manifest.entries.push(manifestEntryFromFile(descriptor, file));
    }
    // Validation drops an undeclared key from the frontmatter a page reads, so a value an author
    // wrote there is silently lost. Name each one once per concept rather than once per entry.
    if (undeclared.size > 0) {
      log.warn('content.field_undeclared', { concept: descriptor.id, keys: [...undeclared].sort() });
    }
  }
  return manifest;
}
