import { describe, it, expect, vi, afterEach } from 'vitest';
import { commitFiles } from '../../lib/github/repo.js';
import { CommitConflictError, type RepoRef } from '../../lib/github/types.js';
import { GithubDouble } from './_github-double.js';

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

  it('rejects an empty change set without touching the network', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(
      commitFiles(REPO, [], { message: 'm', author: { name: 'n', email: 'e' } }, 'tok'),
    ).rejects.toThrow(/no changes/);
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('treats a tree-create 422 (a delete of an absent path) as a commit conflict', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ object: { sha: 'head1' } })) // GET ref
      .mockResolvedValueOnce(json({ tree: { sha: 'basetree' } })) // GET commit
      .mockResolvedValueOnce(new Response('unprocessable', { status: 422 })); // POST trees

    await expect(
      commitFiles(
        REPO,
        [{ path: 'src/content/posts/gone.md', content: null }],
        { message: 'm', author: { name: 'E', email: 'e@t' } },
        'tok',
      ),
    ).rejects.toThrow(CommitConflictError);
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

  describe('expectedHead (fail-closed commit)', () => {
    it('commits in a single attempt when the head matches expectedHead', async () => {
      const gh = new GithubDouble({ main: { 'a.md': 'old' } });
      gh.install();
      const head = gh.headSha('main');

      const sha = await commitFiles(
        REPO,
        [{ path: 'a.md', content: 'new' }],
        { message: 'm', author: { name: 'n', email: 'e' } },
        'tok',
        head,
      );

      expect(typeof sha).toBe('string');
      expect(gh.read('main', 'a.md')).toBe('new');
      // No retry loop ran: exactly one ref read precedes the commit sequence.
      const refReads = gh.calls.filter((c) => c.method === 'GET' && /\/git\/ref\/heads\/main$/.test(c.url));
      expect(refReads).toHaveLength(1);
    });

    it('throws CommitConflictError without retrying when the head has moved', async () => {
      const gh = new GithubDouble({ main: { 'a.md': 'old' } });
      gh.install();
      const staleHead = gh.headSha('main');
      // A concurrent commit lands, moving the head off the sha the caller read.
      gh.commit('main', 'a.md', 'raced');
      expect(gh.headSha('main')).not.toBe(staleHead);

      await expect(
        commitFiles(
          REPO,
          [{ path: 'a.md', content: 'new' }],
          { message: 'm', author: { name: 'n', email: 'e' } },
          'tok',
          staleHead,
        ),
      ).rejects.toBeInstanceOf(CommitConflictError);

      // The conflicting content survived: the fail-closed path never wrote.
      expect(gh.read('main', 'a.md')).toBe('raced');
      // Only the single head probe ran, no tree or commit POST.
      const writes = gh.calls.filter((c) => c.method === 'POST');
      expect(writes).toHaveLength(0);
    });
  });
});
