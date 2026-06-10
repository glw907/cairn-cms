// Branch (ref) operations for the publish workflow, over the Git Data API. A pending entry's
// branch is created lazily at first save, listed by the `cairn/` prefix to derive pending
// state, and deleted by publish and discard. All three are covered by the App's contents
// permission; no PRs are involved.
import type { RepoRef } from './types.js';

const API = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'cairn-cms',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function gitUrl(repo: RepoRef, suffix: string): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/${suffix}`;
}

/** The head commit sha of a branch, or null when the branch does not exist. */
export async function branchHeadSha(repo: RepoRef, branch: string, token: string): Promise<string | null> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(branch)}`), { headers: headers(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ref ${branch} failed: ${res.status}`);
  return ((await res.json()) as { object: { sha: string } }).object.sha;
}

/** Create `branch` pointing at `fromSha`. Throws on any failure including an existing ref. */
export async function createBranch(repo: RepoRef, branch: string, fromSha: string, token: string): Promise<void> {
  const res = await fetch(gitUrl(repo, 'refs'), {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
  if (!res.ok) throw new Error(`GitHub branch create ${branch} failed: ${res.status} ${await res.text()}`);
}

/** Delete `branch`. A 404 (already gone) is success: the desired state holds. */
export async function deleteBranch(repo: RepoRef, branch: string, token: string): Promise<void> {
  const res = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(branch)}`), {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok && res.status !== 404) throw new Error(`GitHub branch delete ${branch} failed: ${res.status}`);
}

/** Branch names under `prefix`, sorted. The matching-refs API needs no pagination at cairn's scale. */
export async function listBranches(repo: RepoRef, prefix: string, token: string): Promise<string[]> {
  const res = await fetch(gitUrl(repo, `matching-refs/heads/${prefix}`), { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub matching-refs ${prefix} failed: ${res.status}`);
  const refs = (await res.json()) as { ref: string }[];
  return refs.map((r) => r.ref.replace(/^refs\/heads\//, ''));
}
