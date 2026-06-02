import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { createSiteIndex } from '../../lib/delivery/site-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    fields: [],
    validate: (fm) => {
      const title = typeof fm.title === 'string' && fm.title.trim() ? fm.title : '';
      return title ? { ok: true, data: fm } : { ok: false, errors: { title: 'Title is required' } };
    },
  },
})[0];

function conceptIndex(files: Record<string, string>) {
  return { descriptor, index: createContentIndex(fromGlob(files), descriptor) };
}

describe('createSiteIndex validation', () => {
  it('throws one aggregated, file-named error when an entry is invalid', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.',
      '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).toThrowError(/2026-02-20-bad/);
    expect(() => createSiteIndex([ci])).toThrowError(/title: Title is required/);
  });

  it('skips drafts at the build gate', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).not.toThrow();
  });

  it('still fails the gate for an invalid non-draft beside an invalid draft', () => {
    const ci = conceptIndex({
      '/src/content/posts/2026-03-10-draft.md': '---\ndraft: true\n---\nBody.',
      '/src/content/posts/2026-04-01-live.md': '---\ndescription: no title\n---\nBody.',
    });
    expect(() => createSiteIndex([ci])).toThrowError(/2026-04-01-live/);
    expect(() => createSiteIndex([ci])).not.toThrowError(/2026-03-10-draft/);
  });

  it('does not throw when every entry is valid', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-01-15-ok.md': '---\ntitle: Good\n---\nBody.' });
    expect(() => createSiteIndex([ci])).not.toThrow();
  });

  it('skips validation when opted out', () => {
    const ci = conceptIndex({ '/src/content/posts/2026-02-20-bad.md': '---\ndescription: no title\n---\nBody.' });
    expect(() => createSiteIndex([ci], { validate: false })).not.toThrow();
  });
});
