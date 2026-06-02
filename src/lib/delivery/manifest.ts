// cairn-cms: the build-side manifest builder and the build link resolver (content-graph design).
// buildSiteManifest mirrors createSiteIndexes: it maps the site descriptors over the per-concept
// globs and projects each file to a manifest row. buildLinkResolver reads the site index, which is
// fresh from the files at build, and throws on a missing target so a dangling cairn: token fails
// the build (the backstop). The admin preview uses manifestLinkResolver instead.
import { siteDescriptors } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest } from '../content/manifest.js';
import type { LinkResolve } from '../content/links.js';
import type { SiteIndex } from './site-index.js';
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
      manifest.entries.push(manifestEntryFromFile(descriptor, file));
    }
  }
  return manifest;
}

/** A resolver backed by the site index, for the build. A miss throws, so a dangling cairn: token
 *  fails the prerender (the build backstop). The preview uses manifestLinkResolver, which marks. */
export function buildLinkResolver(site: SiteIndex): LinkResolve {
  return (ref) => {
    const url = site.concept(ref.concept)?.byId(ref.id)?.permalink;
    if (!url) throw new Error(`cairn link target not found: cairn:${ref.concept}/${ref.id}`);
    return url;
  };
}
