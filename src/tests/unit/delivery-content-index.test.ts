import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { defineFields } from '../../lib/content/schema.js';
import type { RawFile } from '../../lib/delivery/content-index.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'd',
    schema: defineFields([
      { type: 'text', name: 'title', label: 'Title' },
      { type: 'date', name: 'date', label: 'Date' },
      { type: 'tags', name: 'tags', label: 'Tags', options: ['a'] },
      { type: 'boolean', name: 'draft', label: 'Draft' },
    ]),
  },
});

function post(id: string, date: string, extra = ''): RawFile {
  return { path: `/src/content/posts/${id}.md`, raw: `---\ntitle: ${id}\ndate: ${date}\ntags: [a]\n${extra}---\n\nBody of ${id}.` };
}

describe('createContentIndex', () => {
  const files = [post('older', '2026-01-01'), post('newer', '2026-03-01'), post('draft', '2026-02-01', 'draft: true\n')];
  const index = createContentIndex(files, posts);

  it('lists newest-first and excludes drafts by default', () => {
    expect(index.all().map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('includes drafts when asked', () => {
    expect(index.all({ includeDrafts: true }).map((e) => e.id)).toEqual(['newer', 'draft', 'older']);
  });

  it('resolves the permalink and a derived excerpt on each summary', () => {
    const summary = index.all()[0];
    expect(summary.permalink).toBe('/posts/newer');
    expect(summary.excerpt).toBe('Body of newer.');
    expect(summary.wordCount).toBe(3);
  });

  it('returns a detail entry with its body by id', () => {
    expect(index.byId('older')?.body.trim()).toBe('Body of older.');
    expect(index.byId('missing')).toBeUndefined();
  });

  it('filters by tag and aggregates tag counts over non-drafts', () => {
    expect(index.byTag('a').map((e) => e.id)).toEqual(['newer', 'older']);
    expect(index.allTags()).toEqual([{ tag: 'a', count: 2 }]);
  });

  it('finds the newer and older neighbours', () => {
    expect(index.adjacent('older')).toEqual({ newer: expect.objectContaining({ id: 'newer' }), older: undefined });
    expect(index.adjacent('newer').older).toEqual(expect.objectContaining({ id: 'older' }));
  });
});

describe('content index slug', () => {
  it('derives a date-stripped slug and a non-doubled permalink for a dated concept', () => {
    const [posts] = normalizeConcepts(
      {
        posts: {
          dir: 'd',
          schema: defineFields([
            { type: 'text', name: 'title', label: 'Title' },
            { type: 'date', name: 'date', label: 'Date' },
          ]),
        },
      },
      { posts: { permalink: '/:year/:month/:day/:slug', datePrefix: 'day' } },
    );
    const index = createContentIndex(
      [{ path: '/d/2026-05-31-snowball.md', raw: '---\ntitle: S\ndate: 2026-05-31\n---\n\nBody.' }],
      posts,
    );
    const entry = index.all()[0];
    expect(entry.slug).toBe('snowball');
    expect(entry.permalink).toBe('/2026/05/31/snowball');
  });
});

describe('fromGlob', () => {
  it('maps a Vite eager raw glob record to RawFile[]', () => {
    expect(fromGlob({ '/a/x.md': 'raw-x' })).toEqual([{ path: '/a/x.md', raw: 'raw-x' }]);
  });
});

describe('createContentIndex validate-once reads', () => {
  const [trimmed] = normalizeConcepts({
    posts: { dir: 'd', schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]) },
  });

  it('stores the normalized data on the detail frontmatter', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: "  Padded  "\n---\nBody.' }),
      trimmed,
    );
    expect(index.byId('2026-01-01-a')?.frontmatter.title).toBe('Padded');
  });

  it('records a verdict instead of throwing on an invalid entry', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-02-b.md': '---\ndescription: no title\n---\nBody.' }),
      trimmed,
    );
    expect(index.problems()).toEqual([
      { id: '2026-01-02-b', draft: false, errors: { title: 'Title is required' } },
    ]);
  });
});
