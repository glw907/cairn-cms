// The held-address predicate behind the edit-page advisory and the publish refusal. It is the one
// rule both read, so its table pins who holds an address: a live (non-draft) row of a declared,
// routable concept, and never a draft, a non-routable row, or the entry itself.
import { describe, it, expect } from 'vitest';
import { heldAddress } from '../../lib/content/advisories.js';
import type { ConceptDescriptor } from '../../lib/content/types.js';
import type { Manifest, ManifestEntry } from '../../lib/content/manifest.js';
import { defineFieldset } from '../../lib/content/fieldset.js';

function concept(id: string, routable: boolean): ConceptDescriptor {
  return {
    id,
    label: id,
    singular: id,
    dir: `src/content/${id}`,
    routing: { routable, dated: false, inFeeds: false },
    permalink: '/:slug',
    datePrefix: 'day',
    fields: [],
    schema: defineFieldset({}),
    summaryFields: [],
    validate: () => ({ ok: true as const, data: {} }),
  };
}

const concepts = [concept('pages', true), concept('posts', true), concept('snippets', false)];

function row(over: Partial<ManifestEntry> = {}): ManifestEntry {
  return { id: 'about', concept: 'pages', title: 'About', permalink: '/about', draft: false, links: [], ...over };
}

function manifest(...entries: ManifestEntry[]): Manifest {
  return { version: 1, entries };
}

const self = { concept: 'pages', id: 'about-copy', permalink: '/about', draft: false };

describe('heldAddress', () => {
  it('returns the live row that holds the address', () => {
    expect(heldAddress(manifest(row()), concepts, self)).toMatchObject({ concept: 'pages', id: 'about' });
  });

  it('returns null when the address is free', () => {
    expect(heldAddress(manifest(row({ permalink: '/other' })), concepts, self)).toBeNull();
  });

  it('never counts the entry itself, matched on concept and id together', () => {
    expect(heldAddress(manifest(row({ id: 'about-copy' })), concepts, self)).toBeNull();
    expect(heldAddress(manifest(row({ id: 'about-copy', concept: 'posts' })), concepts, self)).not.toBeNull();
  });

  it('ignores a draft holder', () => {
    expect(heldAddress(manifest(row({ draft: true })), concepts, self)).toBeNull();
  });

  it('ignores a holder of a non-routable or undeclared concept', () => {
    expect(heldAddress(manifest(row({ concept: 'snippets' })), concepts, self)).toBeNull();
    expect(heldAddress(manifest(row({ concept: 'ghosts' })), concepts, self)).toBeNull();
  });

  it('returns null when self is a draft or of a non-routable concept', () => {
    expect(heldAddress(manifest(row()), concepts, { ...self, draft: true })).toBeNull();
    expect(heldAddress(manifest(row()), concepts, { ...self, concept: 'snippets' })).toBeNull();
  });

  it('returns the first of several live holders', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b' })];
    expect(heldAddress(manifest(...rows), concepts, self)?.id).toBe('a');
  });
});
