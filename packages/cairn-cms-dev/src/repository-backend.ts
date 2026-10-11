// The dev backend's 'repository' content mode: a conforming `Backend` whose every branch is an
// in-memory overlay over the site's working tree. A read answers the overlay first and the disk
// second, so the dev admin lists the developer's real entries; a commit writes only the overlay, so
// nothing reaches disk and a restart drops every edit. The fixtures backend in fake-github.ts keeps
// the seeded in-memory repo this mode replaces for a real site.
import type { Backend, BackendCommit, CommitAuthor, FileChange, RepoFile } from '@glw907/cairn-cms';
import { BranchExistsError, CommitConflictError } from '@glw907/cairn-cms';

/** One branch's writes: a path to its new content, or to `null` for a delete or a rename's old path. */
type Overlay = Map<string, string | null>;

/** A commit kept for `listCommits` and for a read at a past commit's sha. */
interface LoggedCommit {
  branch: string;
  paths: string[];
  ref: string;
  author: CommitAuthor;
  date: string;
  contentByPath: Record<string, string | null>;
}

/** The disk error codes that mean the path holds no readable file. */
const ABSENT = new Set(['ENOENT', 'ENOTDIR', 'EISDIR']);

/**
 * Build the repository-mode `Backend` over the working tree at `root`. The overlay lives in this
 * closure, so one backend is one dev session: construct it once per handle, never per request.
 * `node:fs` loads on first read, the way `channel-db.ts` loads `node:sqlite`, so importing this
 * module costs nothing under a bundler that never reaches a read.
 * @param root - the working-tree directory every repo path resolves against, normally `process.cwd()`.
 * @returns a {@link Backend} marked `ephemeral`, with `main` as its default branch.
 */
export function createRepositoryBackend(root: string): Backend {
  const branches = new Map<string, Overlay>([['main', new Map()]]);
  let seq = 0;
  const nextSha = () => `repo-sha-${++seq}`;
  const heads = new Map<string, string>([['main', nextSha()]]);
  const log: LoggedCommit[] = [];

  /** Resolve a repo path against the root, refusing one that escapes it. */
  async function onDisk(path: string): Promise<string> {
    const { resolve, sep } = await import('node:path');
    const base = resolve(root);
    const absolute = resolve(base, path);
    if (absolute !== base && !absolute.startsWith(base + sep)) {
      throw new Error(`cairn dev backend: "${path}" resolves outside the working tree`);
    }
    return absolute;
  }

  async function diskRead(path: string): Promise<string | null> {
    const { readFile } = await import('node:fs/promises');
    try {
      return await readFile(await onDisk(path), 'utf8');
    } catch (error) {
      if (ABSENT.has((error as NodeJS.ErrnoException).code ?? '')) return null;
      throw error;
    }
  }

  async function diskNames(dir: string): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    try {
      const entries = await readdir(await onDisk(dir), { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if (ABSENT.has((error as NodeJS.ErrnoException).code ?? '')) return [];
      throw error;
    }
  }

  return {
    defaultBranch: 'main',
    ephemeral: true,

    async readFile(path, ref) {
      const overlay = branches.get(ref);
      if (overlay) return overlay.has(path) ? (overlay.get(path) ?? null) : diskRead(path);
      // `ref` may name a recorded commit sha rather than a live branch (a revert's target read).
      const historical = log.find((entry) => entry.ref === ref && entry.paths.includes(path));
      return historical ? (historical.contentByPath[path] ?? null) : null;
    },

    async readEntries(dir, ref): Promise<RepoFile[]> {
      const overlay = branches.get(ref);
      if (!overlay) return [];
      const clean = dir.replace(/^\/+|\/+$/g, '');
      const prefix = `${clean}/`;
      const names = new Set((await diskNames(clean)).filter((name) => name.endsWith('.md')));
      for (const [path, content] of overlay) {
        if (!path.startsWith(prefix) || !path.endsWith('.md')) continue;
        const name = path.slice(prefix.length);
        if (name.includes('/')) continue;
        if (content === null) names.delete(name);
        else names.add(name);
      }
      return [...names]
        .map((name) => ({ id: name.replace(/\.md$/, ''), name, path: `${prefix}${name}` }))
        .sort((a, b) => b.id.localeCompare(a.id));
    },

    async branchHead(branch) {
      return heads.get(branch) ?? null;
    },

    async listBranches(prefix) {
      return [...branches.keys()].filter((name) => name.startsWith(prefix)).sort();
    },

    async commit(branch, changes: FileChange[], author, _message, expectedHead) {
      if (changes.length === 0) throw new Error('commitFiles: no changes to commit');
      if (expectedHead !== undefined && heads.get(branch) !== expectedHead) {
        throw new CommitConflictError(`${branch} (head moved)`);
      }
      const overlay = branches.get(branch) ?? new Map<string, string | null>();
      branches.set(branch, overlay);
      const contentByPath: Record<string, string | null> = {};
      for (const change of changes) {
        overlay.set(change.path, change.content);
        contentByPath[change.path] = change.content;
      }
      const sha = nextSha();
      heads.set(branch, sha);
      log.push({
        branch,
        paths: changes.map((change) => change.path),
        ref: sha,
        author,
        date: new Date().toISOString(),
        contentByPath,
      });
      return sha;
    },

    async listCommits(path, ref, limit): Promise<BackendCommit[]> {
      return log
        .filter((entry) => entry.branch === ref && entry.paths.includes(path))
        .reverse()
        .slice(0, limit + 1)
        .map((entry) => ({ ref: entry.ref, author: entry.author, date: entry.date }));
    },

    async createBranch(name, fromBranch) {
      if (branches.has(name)) throw new BranchExistsError(name);
      const source = branches.get(fromBranch);
      if (!source) throw new CommitConflictError(`${fromBranch} (unreadable source)`);
      branches.set(name, new Map(source));
      const sha = nextSha();
      heads.set(name, sha);
      return sha;
    },

    async deleteBranch(name) {
      branches.delete(name);
      heads.delete(name);
    },
  };
}
