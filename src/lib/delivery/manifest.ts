// cairn-cms: the build-side manifest builder (content-graph design). buildSiteManifest mirrors
// createSiteIndexes: it maps the site descriptors over the per-concept globs and projects each
// file to a manifest row. The build-time cairn: link resolver lives beside the site resolver in
// site-resolver.ts; the admin preview uses manifestLinkResolver instead.
import { siteDescriptors } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest } from '../content/manifest.js';
import type { SiteConfig } from '../nav/site-config.js';
import type { CairnAdapter } from '../content/types.js';
import type { SiteGlobs } from './site-indexes.js';

/** Build the whole-corpus manifest from a site's adapter, config, and per-concept globs. Drafts are
 *  included and flagged, so the admin picker and the guards see the full graph. */
export function buildSiteManifest<A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>): Manifest {
  const globRecord = globs as Record<string, Record<string, string> | undefined>;
  const manifest = emptyManifest();
  for (const descriptor of siteDescriptors(adapter, config)) {
    const record = globRecord[descriptor.id] ?? {};
    for (const file of fromGlob(record)) {
      // Validate the same way createContentIndex does, so the manifest and the site resolver agree on
      // which entries exist. A validation failure is excluded from both; otherwise the preview would
      // resolve a link the build then rejects as a missing target.
      const { frontmatter, body } = parseMarkdown(file.raw);
      if (!descriptor.validate(frontmatter, body).ok) continue;
      manifest.entries.push(manifestEntryFromFile(descriptor, file));
    }
  }
  return manifest;
}
