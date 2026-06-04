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

  it('stamps the concept id on every summary', () => {
    expect(index.all()[0].concept).toBe('posts');
    expect(index.byTag('a')[0].concept).toBe('posts');
  });

  it('stamps the concept id on a detail entry', () => {
    expect(index.byId('older')?.concept).toBe('posts');
  });
});

describe('read-model tags default', () => {
  const files: RawFile[] = [{ path: '/src/content/posts/no-tags.md', raw: '---\ntitle: no-tags\ndate: 2026-01-04\n---\n\nBody of no-tags.' }];
  const index = createContentIndex(files, posts);

  it('fills an absent tags list with an empty array on the read model', () => {
    const entry = index.byId('no-tags');
    expect(entry?.tags).toEqual([]);
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

describe('summary fields', () => {
  const [withSummary] = normalizeConcepts({
    posts: {
      dir: 'p',
      schema: defineFields([
        { type: 'text', name: 'title', label: 'Title' },
        { type: 'date', name: 'date', label: 'Date' },
        { type: 'textarea', name: 'description', label: 'Description' },
        { type: 'text', name: 'image', label: 'Image' },
      ]),
      summaryFields: ['description', 'image'],
    },
  });

  const files: RawFile[] = [
    { path: '/p/2026-01-01-a.md', raw: '---\ntitle: A\ndate: 2026-01-01\ndescription: An authored summary.\nimage: /og/a.png\n---\n\nBody A.' },
    { path: '/p/2026-02-01-b.md', raw: '---\ntitle: B\ndate: 2026-02-01\ndescription: Only a description.\n---\n\nBody B.' },
  ];
  const index = createContentIndex(files, withSummary);

  it('copies the named frontmatter keys onto summary.fields', () => {
    const a = index.all().find((e) => e.id === '2026-01-01-a')!;
    expect(a.fields.description).toBe('An authored summary.');
    expect(a.fields.image).toBe('/og/a.png');
  });

  it('omits a named key the entry does not carry', () => {
    const b = index.all().find((e) => e.id === '2026-02-01-b')!;
    expect(b.fields.description).toBe('Only a description.');
    expect('image' in b.fields).toBe(false);
  });

  it('yields an empty fields object when summaryFields is unset', () => {
    const [plain] = normalizeConcepts({ pages: { dir: 'g', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) } });
    const plainIndex = createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout.' }], plain);
    expect(plainIndex.all()[0].fields).toEqual({});
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

describe('createContentIndex excludes invalid entries from the typed read', () => {
  const [posts] = normalizeConcepts({
    posts: { dir: 'd', schema: defineFields([{ type: 'text', name: 'title', label: 'Title', required: true }]) },
  });

  it('keeps an invalid non-draft entry out of every read but records it', () => {
    const index = createContentIndex(
      fromGlob({
        '/d/2026-01-01-good.md': '---\ntitle: Good\n---\nBody.',
        '/d/2026-01-02-bad.md': '---\ndescription: no title\n---\nBody.',
      }),
      posts,
    );
    expect(index.all().map((e) => e.id)).toEqual(['2026-01-01-good']);
    expect(index.byId('2026-01-02-bad')).toBeUndefined();
    expect(index.problems()).toEqual([
      { id: '2026-01-02-bad', draft: false, errors: { title: 'Title is required' } },
    ]);
  });

  it('keeps an invalid draft out of byId and includeDrafts reads but records it', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-03-draft.md': '---\ndraft: true\ndescription: no title\n---\nBody.' }),
      posts,
    );
    expect(index.all({ includeDrafts: true })).toEqual([]);
    expect(index.byId('2026-01-03-draft')).toBeUndefined();
    expect(index.problems()).toEqual([
      { id: '2026-01-03-draft', draft: true, errors: { title: 'Title is required' } },
    ]);
  });

  it('keeps a valid draft readable', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-04-wip.md': '---\ntitle: WIP\ndraft: true\n---\nBody.' }),
      posts,
    );
    expect(index.byId('2026-01-04-wip')?.title).toBe('WIP');
    expect(index.all({ includeDrafts: true }).map((e) => e.id)).toEqual(['2026-01-04-wip']);
  });
});
