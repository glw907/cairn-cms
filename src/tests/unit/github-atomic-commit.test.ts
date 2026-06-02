// src/tests/unit/github-atomic-commit.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitFiles } from '../../lib/github/repo.js';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';

const REPO: RepoRef = { owner: 'glw907', repo: 'ecnordic-ski', branch: 'main' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('commitFiles', () => {
  it('commits multiple writes in one commit on the current head', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } })) // GET ref
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } })) // GET commit
      .mockResolvedValueOnce(json({ sha: 'newtree' })) // POST trees
      .mockResolvedValueOnce(json({ sha: 'commit1' })) // POST commits
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' })); // PATCH ref

    const sha = await commitFiles(
      REPO,
      [
        { path: 'src/content/posts/a.md', content: '# A' },
        { path: 'src/content/.cairn/index.json', content: '[]' },
      ],
      { message: 'Update posts: a', author: { name: 'Geoff', email: 'g@907.life' } },
      'tok',
    );

    expect(sha).toBe('commit1');
    expect(fetchMock).toHaveBeenCalledTimes(5);

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/ref/heads/main');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/commits/head1');

    const treeReq = fetchMock.mock.calls[2];
    expect(treeReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/trees');
    expect((treeReq[1] as RequestInit).method).toBe('POST');
    const treeBody = JSON.parse((treeReq[1] as RequestInit).body as string);
    expect(treeBody.base_tree).toBe('basetree');
    expect(treeBody.tree).toEqual([
      { path: 'src/content/posts/a.md', mode: '100644', type: 'blob', content: '# A' },
      { path: 'src/content/.cairn/index.json', mode: '100644', type: 'blob', content: '[]' },
    ]);

    const commitReq = fetchMock.mock.calls[3];
    expect(commitReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/commits');
    const commitBody = JSON.parse((commitReq[1] as RequestInit).body as string);
    expect(commitBody.tree).toBe('newtree');
    expect(commitBody.parents).toEqual(['head1']);
    expect(commitBody.author).toEqual({ name: 'Geoff', email: 'g@907.life' });
    expect(commitBody.committer).toBeUndefined();
    expect(commitBody.message).toBe('Update posts: a');

    const refReq = fetchMock.mock.calls[4];
    expect(refReq[0]).toBe('https://api.github.com/repos/glw907/ecnordic-ski/git/refs/heads/main');
    expect((refReq[1] as RequestInit).method).toBe('PATCH');
    const refBody = JSON.parse((refReq[1] as RequestInit).body as string);
    expect(refBody.sha).toBe('commit1');
    expect(refBody.force).toBe(false);
  });

  it('encodes a delete as a null-sha tree entry and supports a mixed write and delete', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' }));

    await commitFiles(
      REPO,
      [
        { path: 'src/content/posts/old.md', content: null },
        { path: 'src/content/.cairn/index.json', content: '[]' },
      ],
      { message: 'Delete posts: old', author: { name: 'n', email: 'e' } },
      'tok',
    );

    const treeBody = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(treeBody.tree).toEqual([
      { path: 'src/content/posts/old.md', mode: '100644', type: 'blob', sha: null },
      { path: 'src/content/.cairn/index.json', mode: '100644', type: 'blob', content: '[]' },
    ]);
  });

  it('throws with the status when tree creation fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(new Response('boom', { status: 500 }));
    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/500/);
  });

  it('retries the whole sequence on a non-fast-forward ref update, then succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      // attempt 1: the ref update is rejected as non-fast-forward
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree1' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree1' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(new Response('{"message":"Update is not a fast forward"}', { status: 422 }))
      // attempt 2: rebuilt on the new head, succeeds
      .mockResolvedValueOnce(json({ object: { sha: 'head2' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree2' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree2' }))
      .mockResolvedValueOnce(json({ sha: 'commit2' }))
      .mockResolvedValueOnce(json({ ref: 'refs/heads/main' }));

    const sha = await commitFiles(
      REPO,
      [{ path: 'a.md', content: 'x' }],
      { message: 'm', author: { name: 'n', email: 'e' } },
      'tok',
    );

    expect(sha).toBe('commit2');
    expect(fetchMock).toHaveBeenCalledTimes(10);
    // attempt 2's commit parents the new head, so the intervening commit is preserved
    const commit2Body = JSON.parse((fetchMock.mock.calls[8][1] as RequestInit).body as string);
    expect(commit2Body.parents).toEqual(['head2']);
  });

  it('throws CommitConflictError after exhausting retries on repeated non-fast-forward', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    // 4 attempts (the initial try plus 3 retries), each ending in a 422 ref update
    for (let i = 0; i < 4; i++) {
      fetchMock
        .mockResolvedValueOnce(json({ object: { sha: `head${i}` } }))
        .mockResolvedValueOnce(json({ tree: { sha: `basetree${i}` } }))
        .mockResolvedValueOnce(json({ sha: `newtree${i}` }))
        .mockResolvedValueOnce(json({ sha: `commit${i}` }))
        .mockResolvedValueOnce(new Response('{"message":"Update is not a fast forward"}', { status: 422 }));
    }

    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toBeInstanceOf(CommitConflictError);
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });

  it('throws on a non-422 ref update failure without retrying', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } }))
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } }))
      .mockResolvedValueOnce(json({ sha: 'newtree' }))
      .mockResolvedValueOnce(json({ sha: 'commit1' }))
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }));

    await expect(
      commitFiles(REPO, [{ path: 'a.md', content: 'x' }], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/403/);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
