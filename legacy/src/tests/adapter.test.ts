import { describe, it, expect } from 'vitest';
import { findCollection, frontmatterFromForm, type CairnAdapter } from '../lib/adapter';

// A fixture adapter mirroring ecnordic's two collections, so the generic form decoding is
// tested against the exact field shapes save/+server.ts relies on (Pass D seam refactor).
const adapter: CairnAdapter = {
  siteName: 'Test',
  sender: 'noreply@test',
  backend: { owner: 'o', repo: 'r', branch: 'main' },
  preview: { remarkPlugins: [], rehypePlugins: [] },
  collections: [
    {
      type: 'posts',
      label: 'Posts',
      dir: 'src/content/posts',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true },
        { type: 'date', name: 'date', label: 'Date', required: true },
        { type: 'textarea', name: 'description', label: 'Description', required: true },
        { type: 'tags', name: 'tags', label: 'Tags', options: ['training', 'racing'] },
        { type: 'boolean', name: 'draft', label: 'Draft' },
      ],
      validate: (data) => data,
    },
    {
      type: 'pages',
      label: 'Pages',
      dir: 'src/content/pages',
      fields: [{ type: 'text', name: 'title', label: 'Title', required: true }],
      validate: (data) => data,
    },
  ],
};

describe('findCollection', () => {
  it('resolves a known route segment', () => {
    expect(findCollection(adapter, 'posts')?.dir).toBe('src/content/posts');
  });

  it('returns undefined for an unknown segment', () => {
    expect(findCollection(adapter, 'events')).toBeUndefined();
  });
});

describe('frontmatterFromForm', () => {
  it('decodes each field by type for a post', () => {
    const form = new FormData();
    form.set('title', 'First Snow');
    form.set('date', '2026-01-05');
    form.set('description', 'It snowed.');
    form.append('tags', 'training');
    form.append('tags', 'racing');
    form.set('draft', 'on');

    expect(frontmatterFromForm(findCollection(adapter, 'posts')!, form)).toEqual({
      title: 'First Snow',
      date: '2026-01-05',
      description: 'It snowed.',
      tags: ['training', 'racing'],
      draft: true,
    });
  });

  it('treats an absent checkbox as false and absent tags as empty', () => {
    const form = new FormData();
    form.set('title', 'Draft Off');
    form.set('date', '2026-01-05');
    form.set('description', 'x');

    const data = frontmatterFromForm(findCollection(adapter, 'posts')!, form);
    expect(data.draft).toBe(false);
    expect(data.tags).toEqual([]);
  });

  it('splits, trims, and de-duplicates a free-form tags field', () => {
    const collection = {
      type: 'notes',
      label: 'Notes',
      dir: 'src/content/notes',
      fields: [
        { type: 'text', name: 'title', label: 'Title', required: true } as const,
        { type: 'freetags', name: 'tags', label: 'Tags' } as const,
      ],
      validate: (data: Record<string, unknown>) => data,
    };
    const form = new FormData();
    form.set('title', 'Free tags');
    form.set('tags', ' alpha , beta,alpha , , gamma ');

    expect(frontmatterFromForm(collection, form)).toEqual({
      title: 'Free tags',
      tags: ['alpha', 'beta', 'gamma'],
    });
  });

  it('treats an empty free-form tags input as an empty list', () => {
    const collection = {
      type: 'notes',
      label: 'Notes',
      dir: 'src/content/notes',
      fields: [{ type: 'freetags', name: 'tags', label: 'Tags' } as const],
      validate: (data: Record<string, unknown>) => data,
    };
    expect(frontmatterFromForm(collection, new FormData())).toEqual({ tags: [] });
  });

  it('reads only the declared field for a page', () => {
    const form = new FormData();
    form.set('title', 'About');
    form.set('date', 'ignored — not a page field');

    expect(frontmatterFromForm(findCollection(adapter, 'pages')!, form)).toEqual({ title: 'About' });
  });
});
