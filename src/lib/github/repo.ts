// cairn-cms: repo reads and the commit, over the GitHub REST API. Listing a concept
// directory uses the Git Trees API (the contents API silently truncates at 1,000 entries,
// spec §7.3); a single-file read uses the contents API. An optional token lifts reads to
// the authenticated rate limit and unlocks private repos; ecnordic's repo is public, 907's
// is not.
import { idFromFilename } from '../content/ids.js';
import { CommitConflictError } from './types.js';
import type { CommitAuthor, RepoFile, RepoRef } from './types.js';

const API = 'https://api.github.com';

/** Standard GitHub API headers, with a bearer token when one is supplied. */
function ghHeaders(accept: string, token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'cairn-cms',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** The recursive Git Trees API URL for the configured branch. */
export function treeUrl(repo: RepoRef): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(repo.branch)}?recursive=1`;
}

/** A Git Trees API entry: a full repo path and whether it is a blob or a subtree. */
interface TreeEntry {
  path: string;
  type: string;
}

/** The basename of a repo path: the segment after the last slash. */
function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Markdown files directly in `dir`, newest id first. Tree entries carry full repo paths, so
 * the directory prefix is stripped to a basename before deriving the id. Nested files, non
 * markdown, and other directories are dropped.
 */
export function markdownFilesIn(dir: string, tree: TreeEntry[]): RepoFile[] {
  const clean = dir.replace(/^\/+|\/+$/g, '');
  const prefix = `${clean}/`;
  return tree
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix) && entry.path.endsWith('.md'))
    .filter((entry) => !entry.path.slice(prefix.length).includes('/'))
    .map((entry) => {
      const name = basename(entry.path);
      return { id: idFromFilename(name), name, path: entry.path };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/**
 * List the markdown files in a concept directory through the Git Trees API. A truncated tree
 * (GitHub caps the recursive listing near 100,000 entries) throws rather than returning a
 * silent partial list; a concept directory sits far below that, and sharding is deferred
 * until one approaches it (spec §7.3).
 */
export async function listMarkdown(repo: RepoRef, dir: string, token?: string): Promise<RepoFile[]> {
  const res = await fetch(treeUrl(repo), { headers: ghHeaders('application/vnd.github+json', token) });
  if (!res.ok) throw new Error(`GitHub tree ${repo.branch} failed: ${res.status}`);
  const body = (await res.json()) as { tree: TreeEntry[]; truncated: boolean };
  if (body.truncated) throw new Error(`GitHub tree ${repo.branch} is truncated; ${dir} exceeds the listing cap`);
  return markdownFilesIn(dir, body.tree);
}

/** The contents-API URL for a repo path, pinned to the configured branch. */
export function contentsUrl(repo: RepoRef, path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${API}/repos/${repo.owner}/${repo.repo}/contents/${clean}?ref=${encodeURIComponent(repo.branch)}`;
}

/**
 * Fetch a file's raw markdown, or null if it does not exist. The contents API caps a raw
 * read at 1 MB; a concept's files sit far below that, and sharding is deferred until one
 * approaches it (spec §7.3).
 */
export async function readRaw(repo: RepoRef, path: string, token?: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github.raw', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${path} failed: ${res.status}`);
  return res.text();
}

/** Standard (padded) base64 of UTF-8 text, the form the contents API expects. */
function toBase64(text: string): string {
  return btoa(Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(''));
}

/** The current blob sha for a path, or null if the file does not yet exist. */
export async function fileSha(repo: RepoRef, path: string, token: string): Promise<string | null> {
  const res = await fetch(contentsUrl(repo, path), { headers: ghHeaders('application/vnd.github+json', token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub stat ${path} failed: ${res.status}`);
  return ((await res.json()) as { sha: string }).sha;
}

/**
 * Commit `content` to `path` on the configured branch through the contents API. The author is
 * the editor; the committer is omitted, so GitHub attributes it to the App (`cairn-cms[bot]`).
 * Updates the file in place when it exists (passing its sha), creates it otherwise. Returns the
 * commit sha. A stale-sha 409 (someone committed in between) becomes a `CommitConflictError`,
 * so the save fails safe: re-fetch and ask the editor to reapply, never a merge.
 *
 * Caller preconditions this layer cannot enforce, and the save action (Plan 05) must:
 * `path` is confined to the concept's configured directory (the App token can write anywhere
 * in the repo, so an unvalidated path could overwrite CI config or source), and `author` is
 * derived from the verified server-side session, never from request input.
 */
export async function commitFile(
  repo: RepoRef,
  path: string,
  content: string,
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string> {
  const sha = await fileSha(repo, path, token);
  const url = `${API}/repos/${repo.owner}/${repo.repo}/contents/${path.replace(/^\/+|\/+$/g, '')}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: opts.message,
      content: toBase64(content),
      branch: repo.branch,
      author: opts.author,
      ...(sha ? { sha } : {}),
    }),
  });
  if (res.status === 409) throw new CommitConflictError(path);
  if (!res.ok) throw new Error(`GitHub commit ${path} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { commit: { sha: string } }).commit.sha;
}

/** A path change for an atomic commit: write `content`, or delete the path when `content` is null. */
export interface FileChange {
  path: string;
  content: string | null;
}

/** A Git Trees API change entry: a blob written from raw content, or a `sha: null` delete. */
interface TreeChange {
  path: string;
  mode: '100644';
  type: 'blob';
  content?: string;
  sha?: null;
}

/** A Git Data API URL under the repo's `git/` namespace. */
function gitUrl(repo: RepoRef, suffix: string): string {
  return `${API}/repos/${repo.owner}/${repo.repo}/git/${suffix}`;
}

/** The branch head commit sha, through the Git Data API single-ref read. */
async function headCommitSha(repo: RepoRef, token: string): Promise<string> {
  const res = await fetch(gitUrl(repo, `ref/heads/${encodeURIComponent(repo.branch)}`), {
    headers: ghHeaders('application/vnd.github+json', token),
  });
  if (!res.ok) throw new Error(`GitHub ref ${repo.branch} failed: ${res.status}`);
  return ((await res.json()) as { object: { sha: string } }).object.sha;
}

/** The base tree sha of a commit. */
async function commitTreeSha(repo: RepoRef, commitSha: string, token: string): Promise<string> {
  const res = await fetch(gitUrl(repo, `commits/${commitSha}`), {
    headers: ghHeaders('application/vnd.github+json', token),
  });
  if (!res.ok) throw new Error(`GitHub commit ${commitSha} failed: ${res.status}`);
  return ((await res.json()) as { tree: { sha: string } }).tree.sha;
}

/** Map file changes to Git Trees API entries, encoding a null content as a delete. */
function treeChanges(changes: FileChange[]): TreeChange[] {
  return changes.map((c) =>
    c.content === null
      ? { path: c.path, mode: '100644', type: 'blob', sha: null }
      : { path: c.path, mode: '100644', type: 'blob', content: c.content },
  );
}

/** Retries after the initial attempt when the branch moves under an atomic commit. */
const COMMIT_RETRIES = 3;

/**
 * Build a tree on `parent`'s tree, create the commit, and PATCH the branch ref to it. Returns the
 * new commit sha, or null when the ref PATCH is a non-fast-forward (the head moved). A tree-create
 * 422 (an unprocessable delete) becomes a `CommitConflictError`, and any other non-fast-forward
 * detail is left to the caller to map.
 */
async function commitOnTree(
  repo: RepoRef,
  parent: string,
  tree: TreeChange[],
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<{ sha: string } | { conflict: true }> {
  const baseTree = await commitTreeSha(repo, parent, token);

  const treeRes = await fetch(gitUrl(repo, 'trees'), {
    method: 'POST',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (!treeRes.ok) {
    // A 422 means an entry is unprocessable against the base tree, which a delete of an
    // already-removed path produces (a concurrent delete or rename got there first). Treat it as
    // the same non-fast-forward conflict the ref PATCH surfaces, so the caller fails safe with the
    // reload-and-retry path instead of a raw 500.
    if (treeRes.status === 422) throw new CommitConflictError(`${repo.branch} (tree create)`);
    throw new Error(`GitHub tree create failed: ${treeRes.status} ${await treeRes.text()}`);
  }
  const newTree = ((await treeRes.json()) as { sha: string }).sha;

  const commitRes = await fetch(gitUrl(repo, 'commits'), {
    method: 'POST',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: opts.message, tree: newTree, parents: [parent], author: opts.author }),
  });
  if (!commitRes.ok) throw new Error(`GitHub commit create failed: ${commitRes.status} ${await commitRes.text()}`);
  const newCommit = ((await commitRes.json()) as { sha: string }).sha;

  const refRes = await fetch(gitUrl(repo, `refs/heads/${encodeURIComponent(repo.branch)}`), {
    method: 'PATCH',
    headers: { ...ghHeaders('application/vnd.github+json', token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommit, force: false }),
  });
  if (refRes.ok) return { sha: newCommit };
  // A non-fast-forward means the branch moved; the caller decides whether to retry or fail closed.
  // Any other failure is not a race, so surface it.
  if (refRes.status !== 422) throw new Error(`GitHub ref update failed: ${refRes.status} ${await refRes.text()}`);
  return { conflict: true };
}

/** Fail-closed commit on a known head: a non-fast-forward becomes a `CommitConflictError`. */
async function commitOnHead(
  repo: RepoRef,
  head: string,
  tree: TreeChange[],
  opts: { message: string; author: CommitAuthor },
  token: string,
): Promise<string> {
  const result = await commitOnTree(repo, head, tree, opts, token);
  if ('conflict' in result) throw new CommitConflictError(`${repo.branch} (head moved)`);
  return result.sha;
}

/**
 * Commit several path changes in one commit over the Git Data API. The author is the editor; the
 * committer is omitted, so GitHub attributes the commit to the App. Returns the new commit sha.
 * Builds the new tree on the current head's tree, so paths not named here are preserved.
 *
 * Caller preconditions this layer cannot enforce (the save and lifecycle paths must): every
 * `path` is confined to the site's content directories (the App token can write anywhere in the
 * repo), and `author` is derived from the verified server-side session, never request input.
 *
 * An empty change set is rejected, since it would otherwise push an empty commit that triggers a
 * site redeploy for no content change.
 *
 * When `expectedHead` is supplied the commit is fail-closed: it makes a single attempt with no
 * retry, throws a `CommitConflictError` when the branch head is not `expectedHead` (a concurrent
 * commit landed), and otherwise commits onto that head. The nav and settings writes, which land on
 * the default branch and trigger a deploy, pass it so a same-branch race surfaces the editor's
 * reload-and-reapply prompt rather than a silent last-writer-wins. Omitting it keeps the
 * head-merge retry the entry and publish paths rely on.
 */
export async function commitFiles(
  repo: RepoRef,
  changes: FileChange[],
  opts: { message: string; author: CommitAuthor },
  token: string,
  expectedHead?: string,
): Promise<string> {
  if (changes.length === 0) throw new Error('commitFiles: no changes to commit');
  const tree = treeChanges(changes);
  if (expectedHead !== undefined) {
    const head = await headCommitSha(repo, token);
    if (head !== expectedHead) throw new CommitConflictError(`${repo.branch} (head moved)`);
    return commitOnHead(repo, head, tree, opts, token);
  }
  for (let attempt = 0; attempt <= COMMIT_RETRIES; attempt++) {
    const parent = await headCommitSha(repo, token);
    const result = await commitOnTree(repo, parent, tree, opts, token);
    // A non-fast-forward means the branch moved; retry on the new head so a concurrent commit
    // is preserved.
    if ('sha' in result) return result.sha;
  }
  throw new CommitConflictError(`${repo.branch} (atomic commit)`);
}
