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
  // The 404 probe is a hot path (every editLoad); drain the body so the connection frees
  // immediately instead of pinning one of workerd's six until GC.
  if (res.status === 404) {
    await res.body?.cancel();
    return null;
  }
  if (!res.ok) throw new Error(`GitHub ref ${branch} failed: ${res.status} ${await res.text()}`);
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
  await res.body?.cancel();
}

/** Delete `branch`. A 404 (already gone) is success: the desired state holds. */
export async function deleteBranch(repo: RepoRef, branch: string, token: string): Promise<void> {
  const res = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(branch)}`), {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub branch delete ${branch} failed: ${res.status} ${await res.text()}`);
  }
  await res.body?.cancel();
}

/** The rel="next" URL from a GitHub Link header, or null on the last page. */
function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Branch names under `prefix`, sorted. The matching-refs API paginates at 30 by default, so a
 *  site with 31+ pending entries would silently truncate; request the 100-per-page maximum and
 *  follow the Link rel="next" chain until exhausted.
 */
export async function listBranches(repo: RepoRef, prefix: string, token: string): Promise<string[]> {
  const names: string[] = [];
  let url: string | null = `${gitUrl(repo, `matching-refs/heads/${prefix}`)}?per_page=100`;
  while (url) {
    const res: Response = await fetch(url, { headers: headers(token) });
    if (!res.ok) throw new Error(`GitHub matching-refs ${prefix} failed: ${res.status} ${await res.text()}`);
    const refs = (await res.json()) as { ref: string }[];
    names.push(...refs.map((r) => r.ref.replace(/^refs\/heads\//, '')));
    url = nextPageUrl(res.headers.get('Link'));
  }
  return names;
}
