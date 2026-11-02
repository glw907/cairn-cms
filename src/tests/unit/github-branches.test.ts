import { describe, it, expect, afterEach, vi } from 'vitest';
import { GithubDouble } from './_github-double.js';
import { branchHeadSha, createBranch, deleteBranch, listBranches } from '../../lib/github/branches.js';
import { BranchExistsError } from '../../lib/github/types.js';
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

  it('throws BranchExistsError, not a raw error, when the branch already exists', async () => {
    const gh = new GithubDouble({ main: { 'a.md': 'A' } });
    gh.createBranch('cairn/posts/x', 'main');
    gh.install();
    await expect(createBranch(repo, 'cairn/posts/x', gh.headSha('main'), 't')).rejects.toBeInstanceOf(
      BranchExistsError,
    );
  });

  it('deletes a branch and tolerates deleting a missing one', async () => {
    const gh = new GithubDouble({ main: {} });
    gh.createBranch('cairn/posts/x', 'main');
    gh.install();
    await deleteBranch(repo, 'cairn/posts/x', 't');
    expect(await listBranches(repo, 'cairn/', 't')).toEqual([]);
    await expect(deleteBranch(repo, 'cairn/posts/x', 't')).resolves.toBeUndefined();
  });

  it('lists every ref past GitHub default page size of 30', async () => {
    const gh = new GithubDouble({ main: {} });
    for (let i = 0; i < 35; i++) gh.createBranch(`cairn/posts/p${String(i).padStart(2, '0')}`, 'main');
    gh.install();
    expect(await listBranches(repo, 'cairn/', 't')).toHaveLength(35);
  });

  it('follows the Link rel=next header across pages past per_page=100', async () => {
    const gh = new GithubDouble({ main: {} });
    for (let i = 0; i < 130; i++) gh.createBranch(`cairn/posts/p${String(i).padStart(3, '0')}`, 'main');
    gh.install();
    const names = await listBranches(repo, 'cairn/', 't');
    expect(names).toHaveLength(130);
    expect(names[0]).toBe('cairn/posts/p000');
    expect(names[129]).toBe('cairn/posts/p129');
  });
});

describe('branches failure text', () => {
  it('names the owner next step before the raw body on a plain failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('raw-body', { status: 500 }));
    const err = await branchHeadSha(repo, 'main', 't').catch((e: Error) => e);
    const msg = (err as Error).message;
    expect(msg).toContain('GitHub ref main failed: 500');
    expect(msg).toMatch(/GitHub App's install on the repo/);
    expect(msg).toMatch(/status page/);
    expect(msg).toMatch(/403 or 429/);
    expect(msg.indexOf('install on the repo')).toBeLessThan(msg.indexOf('raw-body'));
  });

  it('gives a 422 that is not a collision its own text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Reference name is invalid', { status: 422 }));
    const err = await createBranch(repo, 'bad..name', 'abc', 't').catch((e: Error) => e);
    const msg = (err as Error).message;
    expect(msg).toContain('GitHub branch create bad..name failed: 422');
    expect(msg).toMatch(/branch name or source commit/);
    expect(msg).not.toMatch(/GitHub App's install/);
    expect(msg).toContain('Reference name is invalid');
  });
});
