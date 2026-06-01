import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';

interface PostFm {
  title: string;
  description: string;
}

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    fields: [],
    validate: (fm) => ({ ok: true, data: fm }),
  },
})[0];

describe('generic-ready content reads', () => {
  it('defaults to Record<string, unknown> and keeps runtime behavior', () => {
    const index = createContentIndex(
      fromGlob({ '/src/content/posts/2026-01-15-hello.md': '---\ntitle: Hello\ndescription: Hi there\n---\nBody.' }),
      descriptor,
    );
    const entry = index.byId('2026-01-15-hello');
    expect(entry?.frontmatter.description).toBe('Hi there');
  });

  it('accepts a frontmatter type parameter and types the read', () => {
    const index = createContentIndex<PostFm>(
      fromGlob({ '/src/content/posts/2026-01-15-hello.md': '---\ntitle: Hello\ndescription: Hi there\n---\nBody.' }),
      descriptor,
    );
    const entry = index.byId('2026-01-15-hello');
    // Typed read: `description` is `string`, not `unknown`. `npm run check` enforces the type;
    // this asserts the runtime value flows through unchanged.
    const description: string = entry!.frontmatter.description;
    expect(description).toBe('Hi there');
  });
});
