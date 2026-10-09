// Images nested in a container field: the four shapes checkContainerNesting admits (image,
// object({ image }), array(image), array(object({ image }))). Each shape must read as used by the
// where-used index, hold a safe delete and a bulk delete, and be repointed by replace; alt
// propagation reports a nested placement and never splices it.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { buildUsageIndex } from '../../lib/media/usage.js';
import { planBulkDelete } from '../../lib/media/bulk-delete-plan.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFieldset } from '../../lib/content/fieldset.js';
import { fields } from '../../lib/content/fields.js';
import { manifestEntryFromFile, type Manifest } from '../../lib/content/manifest.js';
import { extractMediaRefs } from '../../lib/content/media-refs.js';
import { fillAltForHash, repointMediaRef } from '../../lib/content/media-rewrite.js';
import type { FieldDescriptor } from '../../lib/content/fields.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { MediaEntry, MediaManifest } from '../../lib/media/manifest.js';

const repo = { owner: 'o', repo: 'r', branch: 'main', appId: '1', installationId: '2' };
const backend = makeGithubBackend(repo, () => 'test-token');

afterEach(() => vi.restoreAllMocks());

const HASH = 'aaaa1111aaaa1111';
const OTHER = 'cccc3333cccc3333';
const NEW_TOKEN = 'media:harbor.bbbb2222bbbb2222';

function concept(extra: Record<string, FieldDescriptor>): ConceptDescriptor {
  return normalizeConcepts({
    posts: {
      dir: 'src/content/posts',
      fields: defineFieldset({ title: fields.text({ label: 'Title', required: true }), ...extra }),
    },
  })[0];
}

interface Shape {
  name: string;
  descriptor: ConceptDescriptor;
  /** An entry whose asset appears twice where the shape allows, plus a second asset. */
  markdown: string;
  /** The markdown after repointing HASH to NEW_TOKEN. */
  repointed: string;
  /** How many placements repoint reports. */
  placements: number;
}

const img = (label: string) => fields.image({ label });

const SHAPES: Shape[] = [
  {
    name: 'image',
    descriptor: concept({ hero: img('Hero') }),
    markdown: `---\ntitle: T\nhero:\n  src: media:a.${HASH}\n  alt: one\n---\nBody.\n`,
    repointed: `---\ntitle: T\nhero:\n  src: ${NEW_TOKEN}\n  alt: one\n---\nBody.\n`,
    placements: 1,
  },
  {
    name: 'object({ image })',
    descriptor: concept({ card: fields.object({ label: 'Card', fields: { image: img('Image') } }) }),
    markdown: `---\ntitle: T\ncard:\n  image:\n    src: media:a.${HASH}\n    alt: one\n---\nBody.\n`,
    repointed: `---\ntitle: T\ncard:\n  image:\n    src: ${NEW_TOKEN}\n    alt: one\n---\nBody.\n`,
    placements: 1,
  },
  {
    name: 'array(image)',
    descriptor: concept({ gallery: fields.array(img('Image'), { label: 'Gallery' }) }),
    markdown:
      `---\ntitle: T\ngallery:\n  - src: media:a.${HASH}\n    alt: one\n  - src: media:o.${OTHER}\n    alt: two\n` +
      `  - src: media:a.${HASH}\n    alt: three\n---\nBody.\n`,
    repointed:
      `---\ntitle: T\ngallery:\n  - src: ${NEW_TOKEN}\n    alt: one\n  - src: media:o.${OTHER}\n    alt: two\n` +
      `  - src: ${NEW_TOKEN}\n    alt: three\n---\nBody.\n`,
    placements: 2,
  },
  {
    name: 'array(object({ image }))',
    descriptor: concept({
      items: fields.array(
        fields.object({ fields: { image: img('Image'), caption: fields.text({ label: 'Caption' }) } }),
        { label: 'Items' },
      ),
    }),
    markdown:
      `---\ntitle: T\nitems:\n  - image:\n      src: media:a.${HASH}\n      alt: one\n    caption: first\n` +
      `  - image:\n      src: media:a.${HASH}\n      alt: two\n    caption: second\n---\nBody.\n`,
    repointed:
      `---\ntitle: T\nitems:\n  - image:\n      src: ${NEW_TOKEN}\n      alt: one\n    caption: first\n` +
      `  - image:\n      src: ${NEW_TOKEN}\n      alt: two\n    caption: second\n---\nBody.\n`,
    placements: 2,
  },
];

function mediaRow(hash: string): MediaEntry {
  return {
    hash,
    sha256: `${hash}-sha256`,
    slug: hash,
    displayName: hash,
    originalFilename: `${hash}.png`,
    alt: '',
    ext: 'png',
    contentType: 'image/png',
    bytes: 1,
    width: null,
    height: null,
    createdAt: '2026-06-18T00:00:00Z',
  };
}

describe.each(SHAPES)('nested image shape: $name', (shape) => {
  it('the manifest entry records the asset once, even where the shape repeats it', () => {
    const entry = manifestEntryFromFile(shape.descriptor, { path: 'src/content/posts/t.md', raw: shape.markdown });
    expect(entry.mediaRefs).toContain(HASH);
    expect(entry.mediaRefs?.filter((h) => h === HASH)).toHaveLength(1);
  });

  it('where-used lists the entry, a safe delete holds, and a bulk delete skips it', async () => {
    new GithubDouble({ main: {} }).install();
    const entry = manifestEntryFromFile(shape.descriptor, { path: 'src/content/posts/t.md', raw: shape.markdown });
    const manifest: Manifest = { version: 1, entries: [entry] };

    const index = await buildUsageIndex(backend, [shape.descriptor], manifest);
    const rows = index.get(HASH);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]).toMatchObject({ concept: 'posts', id: 't', origin: { kind: 'published' } });

    const media: MediaManifest = { [HASH]: mediaRow(HASH) };
    const plan = planBulkDelete([HASH], index, media);
    expect(plan.deletable).toEqual([]);
    expect(plan.skipped).toEqual([{ hash: HASH, reason: 'still-referenced', usage: rows }]);
  });

  it('replace rewrites every occurrence and leaves every other byte exact', () => {
    const out = repointMediaRef(shape.markdown, HASH, NEW_TOKEN);
    expect(out.markdown).toBe(shape.repointed);
    expect(out.placements).toHaveLength(shape.placements);
  });
});

describe('extractMediaRefs over nested shapes', () => {
  const gallery = concept({ gallery: fields.array(img('Image')) });

  it('keeps first-occurrence order across rows', () => {
    const fm = { gallery: [{ src: `media:a.${OTHER}` }, { src: `media:b.${HASH}` }, { src: `media:c.${OTHER}` }] };
    expect(extractMediaRefs(fm, '', gallery.fields)).toEqual([OTHER, HASH]);
  });

  it('ignores a row that is not an image value', () => {
    const fm = { gallery: ['media:x.aaaa1111aaaa1111', null, { alt: 'no src' }] };
    expect(extractMediaRefs(fm, '', gallery.fields)).toEqual([]);
  });
});

describe('replace over sequence forms', () => {
  it('rewrites a `- src:` line and a zero-indent sequence', () => {
    const md = `---\ntitle: T\ngallery:\n- src: media:a.${HASH}\n  alt: one\n- src: media:a.${HASH}\n  alt: two\nother: x\n---\n`;
    const out = repointMediaRef(md, HASH, NEW_TOKEN);
    expect(out.markdown).toBe(md.replaceAll(`media:a.${HASH}`, NEW_TOKEN));
    expect(out.placements.map((p) => p.kind)).toEqual(['nested', 'nested']);
  });

  it('keeps a media token in a sibling text value untouched', () => {
    const md = `---\ntitle: T\nitems:\n  - image:\n      src: media:a.${HASH}\n      alt: x\n    caption: see media:a.${HASH}\n---\n`;
    const out = repointMediaRef(md, HASH, NEW_TOKEN);
    expect(out.markdown).toBe(
      `---\ntitle: T\nitems:\n  - image:\n      src: ${NEW_TOKEN}\n      alt: x\n    caption: see media:a.${HASH}\n---\n`,
    );
  });
});

describe('alt propagation over nested shapes', () => {
  it('leaves a sequence-form entry byte-identical and reports the placement', () => {
    const md = `---\ntitle: T\ngallery:\n  - src: media:a.${HASH}\n    alt: ""\n  - src: media:a.${HASH}\n    alt: kept\n---\nBody.\n`;
    for (const overwrite of [false, true]) {
      const out = fillAltForHash(md, HASH, 'New alt', { overwrite });
      expect(out.markdown).toBe(md);
      expect(out.placements.map((p) => p.kind)).toEqual(['nested', 'nested']);
    }
  });

  it('leaves an object-wrapped image byte-identical and reports it', () => {
    const md = `---\ntitle: T\nitems:\n  - image:\n      src: media:a.${HASH}\n      alt: ""\n---\n`;
    const out = fillAltForHash(md, HASH, 'New alt', { overwrite: true });
    expect(out.markdown).toBe(md);
    expect(out.placements).toHaveLength(1);
    expect(out.placements[0].kind).toBe('nested');
  });
});
