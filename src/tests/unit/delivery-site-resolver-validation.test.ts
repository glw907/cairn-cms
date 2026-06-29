import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteResolver } from '../../lib/delivery/site-resolver.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    routing: 'feed',
    fields: fieldset({ title: fields.text({ label: 'Title', required: true }) }),
  },
})[0];

function conceptIndex(files: Record<string, string>) {
  return { descriptor, index: createContentIndex(fromGlob(files), descriptor) };
}

describe('createSiteResolver validation', () => {
  it('throws one aggregated, file-named error when an entry is invalid', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.',
      '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteResolver([ci])).toThrowError(/2026-02-20-bad/);
    expect(() => createSiteResolver([ci])).toThrowError(/title: Title is required/);
  });

  it('skips drafts at the build gate', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
    });
    expect(() => createSiteResolver([ci])).not.toThrow();
  });

  it('still fails the gate for an invalid non-draft beside an invalid draft', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
      '/src/content/posts/2026-04-01-live.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteResolver([ci])).toThrowError(/2026-04-01-live/);
    expect(() => createSiteResolver([ci])).not.toThrowError(/2026-03-10-draft/);
  });

  it('does not throw when every entry is valid', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.' });
    expect(() => createSiteResolver([ci])).not.toThrow();
  });

  it('skips validation when opted out', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.' });
    expect(() => createSiteResolver([ci], { validate: false })).not.toThrow();
  });
});

describe('createSiteResolver taxonomy-route collisions', () => {
  // A Posts concept with a `/topics` taxonomy base, plus a Pages concept whose permalink can be
  // steered to overlap the base, exercises the prefix-aware collision throw.
  const [taxPosts] = normalizeConcepts({
    posts: {
      dir: 'p',
      routing: 'feed',
      permalink: '/posts/:slug',
      datePrefix: 'day',
      fields: fieldset({
        title: fields.text({ label: 'Title' }),
        date: fields.date({ label: 'Date' }),
        topics: fields.multiselect({ label: 'Topics', taxonomy: true }),
      }),
    },
  });

  function postsIndex(files: Record<string, string>) {
    return { descriptor: taxPosts, index: createContentIndex(fromGlob(files), taxPosts) };
  }

  it('throws when a Pages entry permalink exactly equals a taxonomy base', () => {
    const [pages] = normalizeConcepts({ pages: { dir: 'g', permalink: '/topics', fields: fieldset({}) } });
    expect(() =>
      createSiteResolver([
        postsIndex({ '/p/2026-05-31-hello.md': '---\ntitle: H\ndate: 2026-05-31\ntopics: [svelte]\n---\nBody.' }),
        { descriptor: pages, index: createContentIndex(fromGlob({ '/g/x.md': '---\ntitle: X\n---\nBody.' }), pages) },
      ]),
    ).toThrow(/topics/);
  });

  it('throws when a Pages entry permalink falls under a taxonomy base', () => {
    const [pages] = normalizeConcepts({ pages: { dir: 'g', permalink: '/topics/:slug', fields: fieldset({}) } });
    expect(() =>
      createSiteResolver([
        postsIndex({ '/p/2026-05-31-hello.md': '---\ntitle: H\ndate: 2026-05-31\ntopics: [svelte]\n---\nBody.' }),
        { descriptor: pages, index: createContentIndex(fromGlob({ '/g/x.md': '---\ntitle: X\n---\nBody.' }), pages) },
      ]),
    ).toThrow(/topics/);
  });

  it('throws when two concepts resolve to the same taxonomy base', () => {
    const [otherPosts] = normalizeConcepts({
      notes: {
        dir: 'n',
        routing: 'feed',
        permalink: '/notes/:slug',
        datePrefix: 'day',
        taxonomyBase: '/topics',
        fields: fieldset({
          title: fields.text({ label: 'Title' }),
          date: fields.date({ label: 'Date' }),
          subjects: fields.multiselect({ label: 'Subjects', taxonomy: true }),
        }),
      },
    });
    expect(() =>
      createSiteResolver([
        postsIndex({ '/p/2026-05-31-hello.md': '---\ntitle: H\ndate: 2026-05-31\ntopics: [svelte]\n---\nBody.' }),
        {
          descriptor: otherPosts,
          index: createContentIndex(
            fromGlob({ '/n/2026-05-30-note.md': '---\ntitle: N\ndate: 2026-05-30\nsubjects: [kit]\n---\nBody.' }),
            otherPosts,
          ),
        },
      ]),
    ).toThrow(/topics/);
  });

  it('throws when two distinct tag values in one concept collide on the same slug, naming both', () => {
    expect(() =>
      createSiteResolver([
        postsIndex({
          '/p/2026-05-31-hello.md': '---\ntitle: H\ndate: 2026-05-31\ntopics: ["Web Design", "web design"]\n---\nBody.',
        }),
      ]),
    ).toThrow(/Web Design[\s\S]*web design|web design[\s\S]*Web Design/);
  });
});
