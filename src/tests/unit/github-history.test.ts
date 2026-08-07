import { describe, it, expect, afterEach, vi } from 'vitest';
import { commitsUrl, fetchCommitLog } from '../../lib/github/repo.js';
import { makeGithubBackend } from '../../lib/github/backend.js';
import type { RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

const CONFIG = {
  owner: 'glw907',
  repo: 'ecnordic-ski',
  branch: 'main',
  appId: '3847496',
  installationId: '135372268',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('commitsUrl', () => {
  it('targets the commits API with the path filter, the ref, and per_page = limit + 1', () => {
    const url = new URL(commitsUrl(REPO, 'src/content/posts/a.md', 'main', 25));
    expect(url.origin + url.pathname).toBe('https://api.github.com/repos/glw907/ecnordic-ski/commits');
    expect(url.searchParams.get('path')).toBe('src/content/posts/a.md');
    expect(url.searchParams.get('sha')).toBe('main');
    expect(url.searchParams.get('per_page')).toBe('26');
  });
});

/**
 * A recorded GitHub commits-API payload shape (list-commits endpoint), not a live call: two
 * entries, newest first as GitHub itself orders them. The first carries a null top-level `author`
 * (the matched GitHub account), the common case for a magic-link editor whose commit author email
 * has no linked GitHub account; the git trailer under `commit.author` is present on both rows
 * here, though GitHub's schema types it nullable (see the dedicated null-trailer test below).
 */
const RECORDED_COMMITS_PAGE = [
  {
    sha: 'sha-newest',
    author: null,
    committer: { login: 'cairn-cms[bot]', id: 1 },
    commit: {
      message: 'Update posts: hello',
      author: { name: 'Jamie Rivera', email: 'jamie@example.com', date: '2026-06-20T10:15:00Z' },
      committer: { name: 'cairn-cms[bot]', email: 'bot@users.noreply.github.com', date: '2026-06-20T10:15:03Z' },
    },
  },
  {
    sha: 'sha-oldest',
    author: { login: 'jamie-gh', id: 42 },
    committer: { login: 'cairn-cms[bot]', id: 1 },
    commit: {
      message: 'Update posts: hello',
      author: { name: 'Jamie Rivera', email: 'jamie@example.com', date: '2026-06-01T09:00:00Z' },
      committer: { name: 'cairn-cms[bot]', email: 'bot@users.noreply.github.com', date: '2026-06-01T09:00:04Z' },
    },
  },
];

describe('fetchCommitLog', () => {
  it('maps the recorded payload from the commit trailer, never the top-level author, preserving newest-first order', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(RECORDED_COMMITS_PAGE), { status: 200 }));

    const entries = await fetchCommitLog(REPO, 'src/content/posts/hello.md', 'main', 25);

    expect(entries).toEqual([
      { ref: 'sha-newest', author: { name: 'Jamie Rivera', email: 'jamie@example.com' }, date: '2026-06-20T10:15:03Z' },
      { ref: 'sha-oldest', author: { name: 'Jamie Rivera', email: 'jamie@example.com' }, date: '2026-06-01T09:00:04Z' },
    ]);
  });

  it('requests per_page = limit + 1 so the caller can set a truncation flag', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));

    await fetchCommitLog(REPO, 'src/content/posts/hello.md', 'main', 3);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('per_page')).toBe('4');
  });

  it('returns [] for a 404 rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }));
    expect(await fetchCommitLog(REPO, 'src/content/posts/never-published.md', 'main', 25)).toEqual([]);
  });

  it('returns [] for an empty log rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    expect(await fetchCommitLog(REPO, 'src/content/posts/unpublished.md', 'main', 25)).toEqual([]);
  });

  it('throws on a non-OK, non-404 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 403 }));
    await expect(fetchCommitLog(REPO, 'src/content/posts/hello.md', 'main', 25)).rejects.toThrow(/403/);
  });

  it('degrades a null commit.author and commit.committer to empty strings rather than throwing', async () => {
    const payload = [
      {
        sha: 'sha-anon',
        author: null,
        committer: null,
        commit: {
          message: 'A commit with no recorded trailer',
          author: null,
          committer: null,
        },
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    const entries = await fetchCommitLog(REPO, 'src/content/posts/hello.md', 'main', 25);

    expect(entries).toEqual([{ ref: 'sha-anon', author: { name: '', email: '' }, date: '' }]);
  });
});

describe('makeGithubBackend.listCommits', () => {
  it('delegates to fetchCommitLog at the requested ref', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(RECORDED_COMMITS_PAGE), { status: 200 }));
    const backend = makeGithubBackend(CONFIG, () => 'test-token');

    const entries = await backend.listCommits('src/content/posts/hello.md', 'main', 25);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      ref: 'sha-newest',
      author: { name: 'Jamie Rivera', email: 'jamie@example.com' },
      date: '2026-06-20T10:15:03Z',
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/repos/glw907/ecnordic-ski/commits');
    expect(url.searchParams.get('sha')).toBe('main');
  });

  it('returns [] for a path with no history', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', { status: 404 }));
    const backend = makeGithubBackend(CONFIG, () => 'test-token');
    expect(await backend.listCommits('src/content/posts/never-published.md', 'main', 25)).toEqual([]);
  });
});
