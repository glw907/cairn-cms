// cairn-cms: the Backend seam. A Backend is read, commit, and branch operations over files,
// never a query(): that line is the constraint that keeps a store swappable and a database out.
// The adapter holds a BackendProvider from githubApp(...); the engine resolves one live Backend
// per request via connect(env), with the GitHub App installation token minted and cached behind
// the seam. makeGithubBackend takes an injectable token getter so a test wires a literal token and
// the in-memory fetch double intercepts the same GitHub URLs the production getter would reach.
import { readRaw, listMarkdown, commitFiles, fetchCommitLog } from './repo.js';
import type { FileChange } from './repo.js';
import { branchHeadSha, createBranch as createBranchRef, deleteBranch, listBranches } from './branches.js';
import { appCredentials } from './credentials.js';
import { cachedInstallationToken } from './signing.js';
import { CommitConflictError } from './types.js';
import type { CommitAuthor, RepoFile } from './types.js';
import type { CairnEnv } from '../env.js';

/**
 * One entry in a file's publish history, as `Backend.listCommits` returns it. `ref` is the full
 * commit sha, the exact value revert validates a target against; `author` and `date` render what
 * git recorded, which may not be a cairn editor (main's log also holds commits made outside
 * cairn).
 */
export interface BackendCommit {
  /** The commit's full sha. */
  ref: string;
  /** The commit's own author trailer: name and email, whoever git recorded as having authored it. */
  author: { name: string; email: string };
  /** ISO 8601: when the commit landed on the ref that was read. */
  date: string;
}

/**
 * A live, connected content store pinned to a default branch. The GitHub implementation already
 * holds a minted token behind it; the engine resolves one per request. Read, commit, and branch
 * over files only: this interface never grows a query() method.
 */
export interface Backend {
  /** The site's default branch, for example "main". Callers reading published state pass it as the ref. */
  readonly defaultBranch: string;

  /** Raw file contents at a ref, or null when the path does not exist. */
  readFile(path: string, ref: string): Promise<string | null>;

  /** The markdown entries directly in a concept directory at a ref, newest id first. */
  readEntries(dir: string, ref: string): Promise<RepoFile[]>;

  /** A branch's head commit sha, or null when the branch does not exist. */
  branchHead(branch: string): Promise<string | null>;

  /** Branch names under a prefix, sorted. */
  listBranches(prefix: string): Promise<string[]>;

  /**
   * Commit a set of path changes atomically on a branch; returns the new commit sha. When
   * `expectedHead` is given the commit is fail-closed: it makes one attempt and throws
   * CommitConflictError if the branch head is not `expectedHead`. Omitting it keeps the head-merge
   * retry the entry and publish paths rely on.
   */
  commit(
    branch: string,
    changes: FileChange[],
    author: CommitAuthor,
    message: string,
    expectedHead?: string,
  ): Promise<string>;

  /**
   * A file's commit history at `ref`, newest first, one request capped at `limit + 1` entries so
   * the caller can set a truncation flag without a second read. A 404 or an empty log returns
   * `[]`, never throws: an entry with no publish history is a state, not an error.
   */
  listCommits(path: string, ref: string, limit: number): Promise<BackendCommit[]>;

  /** Create a branch at another branch's current head. Throws `BranchExistsError` on a collision. */
  createBranch(name: string, fromBranch: string): Promise<void>;

  /** Delete a branch; a missing branch is success. */
  deleteBranch(name: string): Promise<void>;
}

/** The adapter's backend value: a provider that connect()s to a live Backend given the Worker env. */
export interface BackendProvider {
  /** A stable tag for the implementation, for example "github-app". The non-request readers narrow on it. */
  readonly kind: string;
  /** The default branch, surfaced before connect() so compose-time code can read it. */
  readonly branch: string;
  /** Connect to a live Backend; the GitHub implementation mints and caches its token lazily. */
  connect(env: CairnEnv): Backend;
}

/** What githubApp() returns: the generic provider plus the GitHub App's non-secret identity facts. */
export interface GithubAppProvider extends BackendProvider {
  readonly kind: 'github-app';
  readonly owner: string;
  readonly repo: string;
  readonly appId: string;
  readonly installationId: string;
}

/**
 * Narrow a provider to the GitHub App provider on its `kind` tag. The non-request readers (the
 * health self-test, the build-time facts) call this before reading the GitHub-specific identity,
 * since `BackendProvider.kind` is a bare string the compiler cannot narrow on its own.
 */
export function isGithubApp(provider: BackendProvider): provider is GithubAppProvider {
  return provider.kind === 'github-app';
}

/** The non-secret GitHub App identity an adapter carries in source; the private key stays a Worker secret. */
interface GithubAppConfig {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  installationId: string;
}

/**
 * The live GitHub Backend over the existing repo.ts and branches.ts transports. The token getter
 * is injected rather than the env: connect() wires the production getter that mints and caches the
 * installation token, and a unit test wires a literal so the in-memory fetch double intercepts the
 * same GitHub URLs. Not barrel-exported; it is the internal test seam imported by path.
 */
export function makeGithubBackend(config: GithubAppConfig, getToken: () => string | Promise<string>): Backend {
  return {
    defaultBranch: config.branch,
    async readFile(path, ref) {
      return readRaw({ ...config, branch: ref }, path, await getToken());
    },
    async readEntries(dir, ref) {
      return listMarkdown({ ...config, branch: ref }, dir, await getToken());
    },
    async branchHead(branch) {
      return branchHeadSha(config, branch, await getToken());
    },
    async listBranches(prefix) {
      return listBranches(config, prefix, await getToken());
    },
    async listCommits(path, ref, limit) {
      return fetchCommitLog({ ...config, branch: ref }, path, ref, limit, await getToken());
    },
    async commit(branch, changes, author, message, expectedHead) {
      return commitFiles({ ...config, branch }, changes, { message, author }, await getToken(), expectedHead);
    },
    async createBranch(name, fromBranch) {
      const tok = await getToken();
      const head = await branchHeadSha(config, fromBranch, tok);
      // A null head means the source branch is gone or unreadable. Throw a defined, catchable
      // error the save path maps to its 500 rather than letting the createBranchRef POST fail raw.
      if (head === null) throw new CommitConflictError(`${fromBranch} (unreadable source)`);
      await createBranchRef(config, name, head, tok);
    },
    async deleteBranch(name) {
      await deleteBranch(config, name, await getToken());
    },
  };
}

/**
 * The default content backend: a GitHub App over a repo branch. Returns a provider carrying the
 * App's non-secret identity (so the build-time, health, and doctor readers narrow on kind and read
 * it) whose connect(env) mints and caches the installation token from the Worker's private-key
 * secret. The missing-secret CairnError stays on first token use, inside connect.
 */
export function githubApp(config: {
  owner: string;
  repo: string;
  branch: string;
  appId: string;
  installationId: string;
}): GithubAppProvider {
  return {
    kind: 'github-app',
    branch: config.branch,
    owner: config.owner,
    repo: config.repo,
    appId: config.appId,
    installationId: config.installationId,
    connect(env) {
      return makeGithubBackend(config, () => cachedInstallationToken(appCredentials(config, env)));
    },
  };
}
