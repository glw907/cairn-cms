import { describe, it, expect } from 'vitest';
import { PENDING_PREFIX, pendingBranch, parsePendingBranch } from '../../lib/content/pending.js';

describe('pendingBranch', () => {
  it('composes the branch name from concept and id', () => {
    expect(pendingBranch('posts', '2026-06-10-summer-race')).toBe('cairn/posts/2026-06-10-summer-race');
    expect(PENDING_PREFIX).toBe('cairn/');
  });
});

describe('parsePendingBranch', () => {
  it('parses a bare branch name and a fully qualified ref', () => {
    expect(parsePendingBranch('cairn/posts/hello-world')).toEqual({ concept: 'posts', id: 'hello-world' });
    expect(parsePendingBranch('refs/heads/cairn/posts/hello-world')).toEqual({ concept: 'posts', id: 'hello-world' });
  });

  it('returns null for non-cairn refs and malformed names', () => {
    expect(parsePendingBranch('main')).toBeNull();
    expect(parsePendingBranch('refs/heads/main')).toBeNull();
    expect(parsePendingBranch('cairn/posts')).toBeNull();
    expect(parsePendingBranch('cairn//x')).toBeNull();
  });

  it('keeps an id containing further hyphens intact', () => {
    expect(parsePendingBranch('cairn/pages/a-b-c')).toEqual({ concept: 'pages', id: 'a-b-c' });
  });
});
