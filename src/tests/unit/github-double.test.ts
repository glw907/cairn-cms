import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { readRaw, commitFiles, listMarkdown } from '../../lib/github/repo.js';
import type { RepoRef } from '../../lib/github/types.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
afterEach(() => vi.restoreAllMocks());

describe('GithubDouble', () => {
  it('serves contents reads per branch and 404s a missing file', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/a.md': 'A' } });
    gh.install();
    expect(await readRaw(repo, 'src/content/posts/a.md', 't')).toBe('A');
    expect(await readRaw(repo, 'src/content/posts/missing.md', 't')).toBeNull();
    expect(await readRaw({ ...repo, branch: 'cairn/posts/a' }, 'src/content/posts/a.md', 't')).toBeNull();
  });

  it('applies an atomic commit to the named branch only', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/a', 'main');
    gh.install();
    await commitFiles(
      { ...repo, branch: 'cairn/posts/a' },
      [{ path: 'src/content/posts/a.md', content: 'pending' }],
      { message: 'm', author: { name: 'Ed', email: 'ed@t' } },
      't',
    );
    expect(gh.read('cairn/posts/a', 'src/content/posts/a.md')).toBe('pending');
    expect(gh.read('main', 'src/content/posts/a.md')).toBeNull();
  });

  it('lists markdown through the trees API and deletes via null content', async () => {
    const gh = new GithubDouble({ main: { 'src/content/posts/a.md': 'A', 'src/content/posts/b.md': 'B' } });
    gh.install();
    const files = await listMarkdown(repo, 'src/content/posts', 't');
    expect(files.map((f) => f.id).sort()).toEqual(['a', 'b']);
    await commitFiles(repo, [{ path: 'src/content/posts/a.md', content: null }], { message: 'd', author: { name: 'E', email: 'e@t' } }, 't');
    expect(gh.read('main', 'src/content/posts/a.md')).toBeNull();
  });

  it('paginates matching-refs at 30 by default with a Link rel=next header', async () => {
    const gh = new GithubDouble({ main: {} });
    for (let i = 0; i < 31; i++) gh.createBranch(`cairn/posts/p${String(i).padStart(2, '0')}`, 'main');
    gh.install();
    const first = await fetch('https://api.github.com/repos/o/r/git/matching-refs/heads/cairn/');
    const firstRefs = (await first.json()) as { ref: string }[];
    expect(firstRefs).toHaveLength(30);
    const next = first.headers.get('Link')?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
    expect(next).toBeTruthy();
    const second = await fetch(next!);
    expect(((await second.json()) as { ref: string }[])).toHaveLength(1);
    expect(second.headers.get('Link')).toBeNull();
  });

  it('moves a branch head through the out-of-band commit hook', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.createBranch('cairn/posts/a', 'main');
    const before = gh.headSha('cairn/posts/a');
    gh.commit('cairn/posts/a', 'a.md', 'newer');
    expect(gh.headSha('cairn/posts/a')).not.toBe(before);
    expect(gh.read('cairn/posts/a', 'a.md')).toBe('newer');
  });

  it('creates, lists, and deletes refs through the raw API routes', async () => {
    const gh = new GithubDouble({ main: { 'x.md': 'x' } });
    gh.install();
    const headSha = gh.headSha('main');
    let res = await fetch('https://api.github.com/repos/o/r/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref: 'refs/heads/cairn/posts/a', sha: headSha }),
    });
    expect(res.status).toBe(201);
    res = await fetch('https://api.github.com/repos/o/r/git/matching-refs/heads/cairn/');
    const refs = (await res.json()) as { ref: string }[];
    expect(refs.map((r) => r.ref)).toEqual(['refs/heads/cairn/posts/a']);
    expect(gh.read('cairn/posts/a', 'x.md')).toBe('x'); // branched from main's tree
    res = await fetch('https://api.github.com/repos/o/r/git/refs/heads/cairn/posts/a', { method: 'DELETE' });
    expect(res.status).toBe(204);
    res = await fetch('https://api.github.com/repos/o/r/git/matching-refs/heads/cairn/');
    expect(await res.json()).toEqual([]);
  });
});
