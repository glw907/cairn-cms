import { describe, it, expect } from 'vitest';
import matter from 'gray-matter';
import { serializeMarkdown } from '../lib/content';

describe('serializeMarkdown', () => {
  it('round-trips frontmatter + body through gray-matter', () => {
    const data = { title: 'Welcome', date: '2026-05-01', draft: false, tags: ['training'] };
    const body = '# Hello\n\nFirst post.\n';

    const out = serializeMarkdown(data, body);
    const parsed = matter(out);

    expect(parsed.data).toEqual(data);
    expect(parsed.content.trim()).toBe(body.trim());
  });

  it('emits a leading frontmatter fence', () => {
    expect(serializeMarkdown({ title: 'T' }, 'body')).toMatch(/^---\n/);
  });
});
