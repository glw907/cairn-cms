// src/tests/unit/github-commit.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fileSha, commitFile } from '../../lib/github/repo.js';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fileSha', () => {
  it('returns the current blob sha', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sha: 'abc' }), { status: 200 }),
    );
    expect(await fileSha(REPO, 'd/a.md', 'tok')).toBe('abc');
  });

  it('returns null for a file that does not yet exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));
    expect(await fileSha(REPO, 'd/new.md', 'tok')).toBeNull();
  });
});

describe('commitFile', () => {
  it('updates an existing file: author = editor, committer omitted, sha passed', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'oldsha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'newsha' } }), { status: 200 }));

    const sha = await commitFile(
      REPO,
      'src/content/posts/2026-05-x.md',
      '# hi',
      { message: 'Update posts: 2026-05-x', author: { name: 'Geoff Wright', email: 'g@907.life' } },
      'tok',
    );

    expect(sha).toBe('newsha');
    const put = fetchMock.mock.calls[1];
    expect(put[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/contents/src/content/posts/2026-05-x.md');
    expect((put[1] as RequestInit).method).toBe('PUT');
    const sent = JSON.parse((put[1] as RequestInit).body as string);
    expect(sent.author).toEqual({ name: 'Geoff Wright', email: 'g@907.life' });
    expect(sent.committer).toBeUndefined();
    expect(sent.sha).toBe('oldsha');
    expect(sent.branch).toBe('main');
    expect(new TextDecoder().decode(b64ToBytes(sent.content))).toBe('# hi');
  });

  it('creates a new file: no sha in the request body', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ commit: { sha: 'created' } }), { status: 201 }));

    await commitFile(REPO, 'src/content/pages/new.md', 'x', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok');
    const sent = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect('sha' in sent).toBe(false);
  });

  it('throws CommitConflictError on a stale-sha 409', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'oldsha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{"message":"is at abc but expected def"}', { status: 409 }));

    await expect(
      commitFile(REPO, 'src/content/posts/2026-05-x.md', '# hi', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toBeInstanceOf(CommitConflictError);
  });

  it('throws on any other non-OK commit response', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(new Response('server error', { status: 500 }));

    await expect(
      commitFile(REPO, 'd/a.md', 'x', { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/500/);
  });
});
