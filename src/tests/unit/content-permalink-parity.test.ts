import { describe, it, expect } from 'vitest';
import { normalizeConcepts } from '../../lib/content/concepts.js';
import { manifestEntryFromFile } from '../../lib/content/manifest.js';
import { createContentIndex } from '../../lib/delivery/content-index.js';
import { defineFields } from '../../lib/content/schema.js';

describe('permalink parity: content index and manifest agree', () => {
  const [descriptor] = normalizeConcepts(
    { posts: { dir: 'p', schema: defineFields([{ type: 'text', name: 'title', label: 'Title' }]) } },
    { posts: { permalink: '/posts/:slug', datePrefix: 'day' } },
  );
  const file = { path: 'p/2026-05-01-hello.md', raw: '---\ntitle: Hello\n---\nbody\n' };

  it('produces one permalink for the same dated entry', () => {
    const [summary] = createContentIndex([file], descriptor).all();
    const entry = manifestEntryFromFile(descriptor, file);
    expect(entry.permalink).toBe(summary.permalink);
    expect(entry.permalink).toBe('/posts/hello');
  });
});
