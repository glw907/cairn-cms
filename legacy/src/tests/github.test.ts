import { describe, it, expect, vi, afterEach } from 'vitest';
import { contentsUrl, markdownFiles, listMarkdown, readRaw, type RepoRef } from '../lib/github';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contentsUrl', () => {
  it('targets the contents API at the configured branch', () => {
    expect(contentsUrl(REPO, 'src/content/posts')).toBe(
      'https://api.github.com/repos/glw907/ecnordic-ski/contents/src/content/posts?ref=main',
    );
  });

  it('trims surrounding slashes from the path', () => {
    expect(contentsUrl(REPO, '/src/content/posts/')).toContain('/contents/src/content/posts?ref=main');
  });
});

describe('markdownFiles', () => {
  it('keeps only markdown files and derives the id from the filename', () => {
    const files = markdownFiles([
      { name: '2026-05-welcome.md', path: 'src/content/posts/2026-05-welcome.md', type: 'file' },
      { name: '.gitkeep', path: 'src/content/posts/.gitkeep', type: 'file' },
      { name: 'drafts', path: 'src/content/posts/drafts', type: 'dir' },
    ]);
    expect(files).toEqual([
      { id: '2026-05-welcome', name: '2026-05-welcome.md', path: 'src/content/posts/2026-05-welcome.md' },
    ]);
  });

  it('sorts newest id first', () => {
    const files = markdownFiles([
      { name: '2025-01-old.md', path: 'p/2025-01-old.md', type: 'file' },
      { name: '2026-05-new.md', path: 'p/2026-05-new.md', type: 'file' },
    ]);
    expect(files.map((f) => f.id)).toEqual(['2026-05-new', '2025-01-old']);
  });
});

describe('listMarkdown', () => {
  it('fetches the directory listing and returns its markdown files', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ name: 'a.md', path: 'd/a.md', type: 'file' }]), { status: 200 }),
    );
    const files = await listMarkdown(REPO, 'd');
    expect(files).toEqual([{ id: 'a', name: 'a.md', path: 'd/a.md' }]);
    expect(fetchMock).toHaveBeenCalledWith(contentsUrl(REPO, 'd'), expect.anything());
  });

  it('throws on a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 403 }));
    await expect(listMarkdown(REPO, 'd')).rejects.toThrow(/403/);
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
