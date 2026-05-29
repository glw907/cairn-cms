// src/tests/unit/github-read.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  treeUrl,
  markdownFilesIn,
  listMarkdown,
  contentsUrl,
  readRaw,
} from '../../lib/github/repo.js';
import type { RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('treeUrl', () => {
  it('targets the recursive Git Trees API at the configured branch', () => {
    expect(treeUrl(REPO)).toBe(
      'https://api.github.com/repos/glw907/ecnordic-ski/git/trees/main?recursive=1',
    );
  });
});

describe('markdownFilesIn', () => {
  it('keeps markdown blobs directly in the directory and strips the path to an id', () => {
    const files = markdownFilesIn('src/content/posts', [
      { path: 'src/content/posts/2026-05-new.md', type: 'blob' },
      { path: 'src/content/posts/2025-01-old.md', type: 'blob' },
      { path: 'src/content/posts/.gitkeep', type: 'blob' }, // not markdown
      { path: 'src/content/posts/drafts', type: 'tree' }, // a subtree
      { path: 'src/content/posts/drafts/wip.md', type: 'blob' }, // nested, excluded
      { path: 'src/content/pages/about.md', type: 'blob' }, // another directory
    ]);
    expect(files).toEqual([
      { id: '2026-05-new', name: '2026-05-new.md', path: 'src/content/posts/2026-05-new.md' },
      { id: '2025-01-old', name: '2025-01-old.md', path: 'src/content/posts/2025-01-old.md' },
    ]);
  });

  it('sorts newest id first', () => {
    const files = markdownFilesIn('p', [
      { path: 'p/2025-01-old.md', type: 'blob' },
      { path: 'p/2026-05-new.md', type: 'blob' },
    ]);
    expect(files.map((f) => f.id)).toEqual(['2026-05-new', '2025-01-old']);
  });

  it('tolerates a directory given with surrounding slashes', () => {
    const files = markdownFilesIn('/p/', [{ path: 'p/a.md', type: 'blob' }]);
    expect(files.map((f) => f.id)).toEqual(['a']);
  });
});

describe('listMarkdown', () => {
  it('fetches the recursive tree and returns its markdown files', async () => {
    const tree = {
      truncated: false,
      tree: [
        { path: 'src/content/posts/a.md', type: 'blob' },
        { path: 'src/content/posts/b', type: 'tree' },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(tree), { status: 200 }),
    );
    const files = await listMarkdown(REPO, 'src/content/posts');
    expect(files).toEqual([{ id: 'a', name: 'a.md', path: 'src/content/posts/a.md' }]);
    expect(fetchMock.mock.calls[0][0]).toBe(treeUrl(REPO));
  });

  it('throws on a non-OK tree response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 403 }));
    await expect(listMarkdown(REPO, 'd')).rejects.toThrow(/403/);
  });
});

describe('contentsUrl', () => {
  it('targets the contents API at the configured branch and trims slashes', () => {
    expect(contentsUrl(REPO, '/src/content/posts/a.md/')).toBe(
      'https://api.github.com/repos/glw907/ecnordic-ski/contents/src/content/posts/a.md?ref=main',
    );
  });
});

describe('readRaw', () => {
  it('returns the raw file body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('# Hello', { status: 200 }));
    expect(await readRaw(REPO, 'd/a.md')).toBe('# Hello');
  });

  it('returns null for a missing file', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }));
    expect(await readRaw(REPO, 'd/missing.md')).toBeNull();
  });

  it('sends a bearer token when one is supplied', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('x', { status: 200 }));
    await readRaw(REPO, 'd/a.md', 'tok123');
    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBe('Bearer tok123');
  });
});
