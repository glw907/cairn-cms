import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';
import { log } from '../../lib/log/index.js';
import type { ContentIndex, RawFile } from '../../lib/delivery/content-index.js';

const [posts] = normalizeConcepts({
  posts: {
    dir: 'd',
    routing: 'feed',
    fields: fieldset({
      title: fields.text({ label: 'Title' }),
      date: fields.date({ label: 'Date' }),
      tags: fields.multiselect({ label: 'Tags', options: ['a'], taxonomy: true }),
      draft: fields.boolean({ label: 'Draft' }),
    }),
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
    const [posts] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        permalink: '/:year/:month/:day/:slug',
        datePrefix: 'day',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
        }),
      },
    });
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
      fields: fieldset({
        title: fields.text({ label: 'Title' }),
        date: fields.date({ label: 'Date' }),
        description: fields.textarea({ label: 'Description' }),
        image: fields.text({ label: 'Image' }),
      }),
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
    const [plain] = normalizeConcepts({ pages: { dir: 'g', fields: fieldset({ title: fields.text({ label: 'Title' }) }) } });
    const plainIndex = createContentIndex([{ path: '/g/about.md', raw: '---\ntitle: About\n---\n\nAbout.' }], plain);
    expect(plainIndex.all()[0].fields).toEqual({});
  });
});

describe('fromGlob', () => {
  it('maps a Vite eager raw glob record to RawFile[]', () => {
    expect(fromGlob({ '/a/x.md': 'raw-x' })).toEqual([{ path: '/a/x.md', raw: 'raw-x' }]);
  });
});

describe('content index reads the taxonomy-marked field', () => {
  const [marked] = normalizeConcepts({
    posts: {
      dir: 'd',
      routing: 'feed',
      fields: fieldset({
        title: fields.text({ label: 'Title' }),
        date: fields.date({ label: 'Date' }),
        // An open multiselect (no options) so the validator accepts arbitrary values and coerces a
        // lone scalar, the two cases the marked-read must honour.
        topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
      }),
    },
  });

  it('reads tags from the marked field, an array verbatim', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\ntopics: [svelte, kit]\n---\nBody.' }),
      marked,
    );
    expect(index.byId('2026-01-01-a')?.tags).toEqual(['svelte', 'kit']);
  });

  it('coerces a lone scalar on the marked field to a one-element array (the validated read)', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\ntopics: svelte\n---\nBody.' }),
      marked,
    );
    expect(index.byId('2026-01-01-a')?.tags).toEqual(['svelte']);
  });

  it('reads the marked field only, never a legacy tags key', () => {
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\ntopics: [a]\ntags: [b]\n---\nBody.' }),
      marked,
    );
    expect(index.byId('2026-01-01-a')?.tags).toEqual(['a']);
  });

  it('yields no tags when the concept marks no taxonomy field, even with a tags key present', () => {
    const [unmarked] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
        }),
      },
    });
    const index = createContentIndex(
      fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\ntags: [b]\n---\nBody.' }),
      unmarked,
    );
    expect(index.byId('2026-01-01-a')?.tags).toEqual([]);
  });
});

describe('content index advisory for an unmarked tags-named field', () => {
  afterEach(() => vi.restoreAllMocks());

  it('warns once when a multiselect named tags is left unmarked', () => {
    const [unmarked] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
          tags: fields.multiselect({ label: 'Tags' }),
        }),
      },
    });
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    createContentIndex(
      fromGlob({
        '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\n---\nBody.',
        '/d/2026-01-02-b.md': '---\ntitle: B\ndate: 2026-01-02\n---\nBody.',
      }),
      unmarked,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('taxonomy.unmarked_field', { concept: 'posts', field: 'tags' });
  });

  it('warns for a freetags or categories named multiselect too', () => {
    const [unmarked] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
          categories: fields.multiselect({ label: 'Categories' }),
        }),
      },
    });
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    createContentIndex(fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\n---\nBody.' }), unmarked);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('taxonomy.unmarked_field', { concept: 'posts', field: 'categories' });
  });

  it('does not warn when the tags-named field is properly marked', () => {
    const [marked] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
          tags: fields.multiselect({ label: 'Tags', taxonomy: true }),
        }),
      },
    });
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    createContentIndex(fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\n---\nBody.' }), marked);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not warn when no tags-named multiselect exists', () => {
    const [plain] = normalizeConcepts({
      posts: {
        dir: 'd',
        routing: 'feed',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
        }),
      },
    });
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});
    createContentIndex(fromGlob({ '/d/2026-01-01-a.md': '---\ntitle: A\ndate: 2026-01-01\n---\nBody.' }), plain);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('createContentIndex validate-once reads', () => {
  const [trimmed] = normalizeConcepts({
    posts: { dir: 'd', fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }) },
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

describe('createContentIndex degrades a date-token permalink miss to a problem', () => {
  const [dated] = normalizeConcepts({
    posts: {
      dir: 'd',
      routing: 'feed',
      permalink: '/:year/:month/:day/:slug',
      datePrefix: 'day',
      fields: fieldset({
        title: fields.text({ label: 'Title', required: true }),
        date: fields.date({ label: 'Date', required: true }),
      }),
    },
  });

  it('records the missing-date entry and still indexes the valid one, without throwing', () => {
    let index!: ContentIndex;
    expect(() => {
      index = createContentIndex(
        fromGlob({
          '/d/2026-01-01-good.md': '---\ntitle: Good\ndate: 2026-01-01\n---\nBody.',
          '/d/2026-01-02-undated.md': '---\ntitle: Undated\n---\nBody.',
        }),
        dated,
      );
    }).not.toThrow();
    expect(index.all().map((e) => e.id)).toEqual(['2026-01-01-good']);
    expect(index.problems()).toEqual([
      { id: '2026-01-02-undated', draft: false, errors: { date: 'Date is required' } },
    ]);
  });
});

describe('createContentIndex excludes invalid entries from the typed read', () => {
  const [posts] = normalizeConcepts({
    posts: { dir: 'd', fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }) },
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
