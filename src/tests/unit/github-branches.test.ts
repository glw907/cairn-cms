import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { branchHeadSha, createBranch, deleteBranch, listBranches } from '../../lib/github/branches.js';
import type { RepoRef } from '../../lib/github/types.js';

const repo: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
afterEach(() => vi.restoreAllMocks());

describe('branches transport', () => {
  it('reads a branch head and returns null for a missing branch', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.install();
    expect(await branchHeadSha(repo, 'main', 't')).toBe(gh.headSha('main'));
    expect(await branchHeadSha(repo, 'cairn/posts/x', 't')).toBeNull();
  });

  it('creates a branch from a source sha and lists it by prefix', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.install();
    await createBranch(repo, 'cairn/posts/x', gh.headSha('main'), 't');
    expect(gh.read('cairn/posts/x', 'a.md')).toBe('A');
    expect(await listBranches(repo, 'cairn/', 't')).toEqual(['cairn/posts/x']);
    expect(await listBranches(repo, 'cairn/pages/', 't')).toEqual([]);
  });

  it('deletes a branch and tolerates deleting a missing one', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/x', 'main');
    gh.install();
    await deleteBranch(repo, 'cairn/posts/x', 't');
    expect(await listBranches(repo, 'cairn/', 't')).toEqual([]);
    await expect(deleteBranch(repo, 'cairn/posts/x', 't')).resolves.toBeUndefined();
  });
});
