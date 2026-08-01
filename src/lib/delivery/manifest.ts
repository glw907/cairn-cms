// cairn-cms: the build-side manifest builder (content-graph design). buildSiteManifest mirrors
// createSiteIndexes: it maps the site descriptors over the per-concept globs and projects each
// file to a manifest row. The build-time cairn: link resolver lives beside the site resolver in
// site-resolver.ts; the admin preview uses manifestLinkResolver instead.
import { siteDescriptors } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest, ManifestEntry } from '../content/manifest.js';
import type { SiteConfig } from '../nav/site-config.js';
import type { CairnAdapter } from '../content/types.js';
import type { SiteGlobs } from './site-indexes.js';

/**
 * Build the whole-corpus manifest from a site's adapter, config, and per-concept globs. Drafts are
 *  included and flagged, so the admin picker and the guards see the full graph.
 */
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

/** The identity key an entry's counterpart is matched on, the same concept+id spelling upsertEntry uses. */
const keyOf = (e: ManifestEntry) => `${e.concept}/${e.id}`;

/**
 * The `after` entries a deploy just carried across the first-publish transition: `publishedAt` is
 *  set, and the same concept+id entry in `before` was absent or itself unstamped. Presence of the
 *  stamp is the whole signal, given the stamping rules in `stampFirstPublish`: a carried stamp never
 *  matches its own counterpart, a legacy entry that is non-draft but was never stamped never matches,
 *  and a draft never carries a stamp so it never matches either. An entry present only in `before`
 *  (deleted in `after`) is never returned.
 *
 * `before: null` means no prior manifest is known and returns every stamped entry in `after`, the
 *  full fan-out. A consumer wiring announce-on-publish persists the prior manifest across deploys and
 *  passes `null` only when that full fan-out is actually wanted.
 *
 * Pure and node-safe: no I/O, no clock read, so a caller supplies both manifests and the result is
 *  deterministic. The engine performs no network sends; a consumer diffs and then acts.
 */
export function newlyPublishedEntries(before: Manifest | null, after: Manifest): ManifestEntry[] {
  const beforeByKey = before ? new Map(before.entries.map((e) => [keyOf(e), e])) : null;
  return after.entries.filter((e) => {
    if (!e.publishedAt) return false;
    if (!beforeByKey) return true;
    return !beforeByKey.get(keyOf(e))?.publishedAt;
  });
}
