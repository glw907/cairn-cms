import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { buildSiteResolver } from '../../lib/delivery/site-resolver.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    routing: 'dated',
    fields: { title: fields.text({ label: 'Title', required: true }) },
  },
})[0];

function conceptIndex(files: Record<string, string>) {
  return { descriptor, index: createContentIndex(fromGlob(files), descriptor) };
}

describe('buildSiteResolver validation', () => {
  it('throws one aggregated, file-named error when an entry is invalid', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.',
      '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => buildSiteResolver([ci])).toThrowError(/2026-02-20-bad/);
    expect(() => buildSiteResolver([ci])).toThrowError(/title: Title is required/);
  });

  it('skips drafts at the build gate', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
    });
    expect(() => buildSiteResolver([ci])).not.toThrow();
  });

  it('still fails the gate for an invalid non-draft beside an invalid draft', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
      '/src/content/posts/2026-04-01-live.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => buildSiteResolver([ci])).toThrowError(/2026-04-01-live/);
    expect(() => buildSiteResolver([ci])).not.toThrowError(/2026-03-10-draft/);
  });

  it('does not throw when every entry is valid', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.' });
    expect(() => buildSiteResolver([ci])).not.toThrow();
  });

  it('refuses a time of day and a non-boolean draft on a concept that declares neither', () => {
    const d = normalizeConcepts({
      posts: {
        dir: 'src/content/posts',
        routing: 'dated',
        fields: { title: fields.text({ label: 'Title' }), date: fields.date({ label: 'Date' }) },
      },
    })[0];
    const ci = (files: Record<string, string>) => ({ descriptor: d, index: createContentIndex(fromGlob(files), d) });
    const bad = ci({
      '/src/content/posts/2024-03-15-timed.md': '---\ntitle: A\ndate: 2024-03-15 20:00:00 -08:00\n---\nBody.',
      '/src/content/posts/2024-03-16-quoted.md': '---\ntitle: B\ndraft: "true"\n---\nBody.',
    });
    let message = '';
    try {
      buildSiteResolver([bad]);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('2024-03-15-timed');
    expect(message).toContain('has a time of day. Write the date alone: 2024-03-15');
    expect(message).toContain('2024-03-16-quoted');
    expect(message).toContain('draft: Draft must be true or false');
    const ok = ci({
      '/src/content/posts/2024-03-15-a.md': '---\ntitle: A\ndraft: true\n---\nBody.',
      '/src/content/posts/2024-03-16-b.md': '---\ntitle: B\ndraft: false\n---\nBody.',
      '/src/content/posts/2024-03-17-c.md': '---\ntitle: C\ndraft:\n---\nBody.',
    });
    expect(() => buildSiteResolver([ok])).not.toThrow();
  });

  it('reports a declared draft boolean once', () => {
    const d = normalizeConcepts({
      posts: {
        dir: 'src/content/posts',
        routing: 'dated',
        fields: { draft: fields.boolean({ label: 'Draft' }) },
      },
    })[0];
    const index = createContentIndex(fromGlob({ '/src/content/posts/2024-03-16-q.md': '---\ndraft: "true"\n---\nB.' }), d);
    expect(index.problems()).toHaveLength(1);
    expect(Object.keys(index.problems()[0].errors)).toEqual(['draft']);
  });

  it('refuses a non-boolean draft on a concept that declares draft as text', () => {
    const d = normalizeConcepts({
      posts: {
        dir: 'src/content/posts',
        routing: 'dated',
        fields: { draft: fields.text({ label: 'Draft' }) },
      },
    })[0];
    const index = createContentIndex(fromGlob({ '/src/content/posts/2024-03-16-q.md': '---\ndraft: "true"\n---\nB.' }), d);
    expect(index.problems()).toHaveLength(1);
    expect(Object.keys(index.problems()[0].errors)).toEqual(['draft']);
  });
});
