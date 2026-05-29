// src/lib/github/repo.ts
// cairn-cms: repo reads and the commit, over the GitHub REST API. Listing a concept
// directory uses the Git Trees API (the contents API silently truncates at 1,000 entries,
// spec §7.3); a single-file read uses the contents API. The commit and its 409 fail-safe
// land in Task 4. An optional token lifts reads to the authenticated rate limit and unlocks
// private repos; ecnordic's repo is public, 907's is not.
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

/** List the markdown files in a concept directory through the Git Trees API. */
export async function listMarkdown(repo: RepoRef, dir: string, token?: string): Promise<RepoFile[]> {
  const res = await fetch(treeUrl(repo), { headers: ghHeaders('application/vnd.github+json', token) });
  if (!res.ok) throw new Error(`GitHub tree ${repo.branch} failed: ${res.status}`);
  const body = (await res.json()) as { tree: TreeEntry[] };
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

export { ghHeaders, API, CommitConflictError };
export type { CommitAuthor };
