// cairn-cms: the build-side manifest builder (content-graph design). buildSiteManifest mirrors
// createSiteIndexes: it maps the site descriptors over the per-concept globs and projects each
// file to a manifest row. The build-time cairn: link resolver lives beside the site resolver in
// site-resolver.ts; the admin preview uses manifestLinkResolver instead.
import { buildSiteDescriptors } from './site-descriptors.js';
import { fromGlob } from './content-index.js';
import { parseMarkdown } from '../content/frontmatter.js';
import { log } from '../log/index.js';
import { emptyManifest, manifestEntryFromFile } from '../content/manifest.js';
import type { Manifest, ManifestEntry } from '../content/manifest.js';
import type { SiteConfig } from '../nav/site-config.js';
import type { CairnAdapter } from '../content/types.js';
import type { SiteGlobs } from './site-indexes.js';

/**
 * Build the whole-corpus manifest from a site's adapter, config, and per-concept globs. Drafts are
 *  included and flagged, so the admin picker and the guards see the full graph.
 * @public
 */
export function buildSiteManifest<A extends CairnAdapter>(adapter: A, config: SiteConfig, globs: SiteGlobs<A>): Manifest {
  const globRecord = globs as Record<string, Record<string, string> | undefined>;
  const manifest = emptyManifest();
  for (const descriptor of buildSiteDescriptors(adapter, config)) {
    const record = globRecord[descriptor.id] ?? {};
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

/**
 * The `after` entries a deploy just carried across the first-publish transition: the entry is
 *  currently live (non-draft), carries a `publishedAt` stamp, and that stamp value appears on no
 *  `before` row. Newness is the stamp's, not the key's: `stampFirstPublish` issues a stamp at the
 *  first publish and every later save carries it, so a rename (new key, same stamp) is not new, the
 *  peers of one first-publish batch (one shared stamp, one commit) each are, and an entry deleted
 *  and recreated gets a fresh stamp and reads as new. A drafted entry can carry a stamp forward
 *  (`upsertEntry` preserves it through a save that flips `draft` back to `true`), so the draft check
 *  is what excludes a currently unpublished entry. A legacy non-draft entry with no stamp is never
 *  returned, and an entry present only in `before` (deleted in `after`) is never returned.
 *
 * `before: null` means no prior manifest is known and returns every currently-live stamped entry in
 *  `after`, the full fan-out. A consumer wiring announce-on-publish persists the prior manifest across
 *  deploys and passes `null` only when that full fan-out is actually wanted.
 *
 * Pure and node-safe: no I/O, no clock read, so a caller supplies both manifests and the result is
 *  deterministic. The engine performs no network sends; a consumer diffs and then acts.
 * @public
 */
export function buildNewlyPublished(before: Manifest | null, after: Manifest): ManifestEntry[] {
  // A null `before` has no stamps, so every currently-live stamped entry in `after` reads as new.
  const priorStamps = new Set<string>();
  for (const e of before?.entries ?? []) if (e.publishedAt) priorStamps.add(e.publishedAt);
  return after.entries.filter((e) => !e.draft && !!e.publishedAt && !priorStamps.has(e.publishedAt));
}
