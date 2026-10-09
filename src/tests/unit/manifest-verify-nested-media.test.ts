// verifyManifest fails closed on an image nested in a container field. A site whose only image
// references are nested commits no `mediaRefs` key, so a manifest generated before the extractor
// read nested images looks like one that predates the field. Given the adapter, the verify keeps
// the pre-field allowance only when no concept declares a nested image shape.
import { describe, it, expect } from 'vitest';
import { formatManifest, verifyManifest, type Manifest, type ManifestEntry } from '../../lib/content/manifest.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';

const entry = (id: string, over: Partial<ManifestEntry> = {}): ManifestEntry => ({
  id,
  concept: 'posts',
  title: id,
  permalink: `/${id}`,
  draft: false,
  links: [],
  ...over,
});

const manifest = (...entries: ManifestEntry[]): Manifest => ({ version: 1, entries });

const adapterWith = (extra: Parameters<typeof defineFieldset>[0]) => ({
  content: {
    posts: {
      dir: 'src/content/posts',
      fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }), ...extra }),
    },
  },
});

const gallery = adapterWith({ gallery: fields.array(fields.image({ label: 'Image' })) });
const topLevelOnly = adapterWith({ hero: fields.image({ label: 'Hero' }) });

const HERO = '00112233445566aa';
const GALLERY = 'aabbccddeeff0011';

describe('verifyManifest mediaRefs rule', () => {
  it('fails a post-field manifest in which a second entry carries mediaRefs and the gallery-only entry lacks the key', () => {
    const built = manifest(entry('a', { mediaRefs: [HERO] }), entry('b', { mediaRefs: [GALLERY] }));
    const committed = formatManifest(manifest(entry('a', { mediaRefs: [HERO] }), entry('b')));
    expect(() => verifyManifest(built, committed)).toThrow(/stale/);
  });

  it('fails a nested-shape site whose committed manifest carries no mediaRefs, with the regenerate message', () => {
    const built = manifest(entry('a', { mediaRefs: [GALLERY] }));
    const committed = formatManifest(manifest(entry('a')));
    expect(() => verifyManifest(built, committed, gallery)).toThrow(/stale[\s\S]*Regenerate/);
  });

  it('verifies a nested-shape site whose corpus references no image', () => {
    const built = manifest(entry('a'));
    expect(() => verifyManifest(built, formatManifest(manifest(entry('a'))), gallery)).not.toThrow();
  });

  it('keeps the pre-field allowance for a site declaring only top-level image fields', () => {
    const built = manifest(entry('a', { mediaRefs: [HERO] }));
    const committed = formatManifest(manifest(entry('a')));
    expect(() => verifyManifest(built, committed, topLevelOnly)).not.toThrow();
  });

  it('keeps the pre-field allowance when no adapter is passed', () => {
    const built = manifest(entry('a', { mediaRefs: [HERO] }));
    const committed = formatManifest(manifest(entry('a')));
    expect(() => verifyManifest(built, committed)).not.toThrow();
  });

  it('compares exactly once a nested-shape site has regenerated', () => {
    const built = manifest(entry('a', { mediaRefs: [GALLERY] }));
    expect(() => verifyManifest(built, formatManifest(built), gallery)).not.toThrow();
  });
});
