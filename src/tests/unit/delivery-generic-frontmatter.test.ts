import { describe, it, expect } from 'vitest';
import { createContentIndex, fromGlob } from '../../lib/delivery/content-index.js';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { fields } from '../../lib/content/fields.js';
import { fieldset } from '../../lib/content/fieldset.js';

interface PostFm {
  title: string;
  description: string;
}

const descriptor = normalizeConcepts({
  posts: {
    dir: 'src/content/posts',
    schema: fieldset({
      title: fields.text({ label: 'Title' }),
      description: fields.textarea({ label: 'Description' }),
    }),
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
