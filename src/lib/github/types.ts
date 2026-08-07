// cairn-cms: the GitHub backend's plain data types and its one typed error. The GitHub App
// provider config (`githubApp`'s input) carries these repo coordinates; `RepoRef` is the
// `{ owner, repo, branch }` subset the read and commit transports take, so the provider config
// is assignable wherever a `RepoRef` is wanted with no conversion.

/** Repo coordinates pinned to a branch: the `{ owner, repo, branch }` subset the read and commit paths need. */
export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

/** A markdown file in a concept directory. `id` is the filename without `.md`. */
export interface RepoFile {
  id: string;
  name: string;
  path: string;
}

/** A commit author: the signed-in editor (spec §7.4). The committer is left to the App. */
export interface CommitAuthor {
  name: string;
  email: string;
}

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

/** What the App signer needs: the app id, the installation, and the base64 PEM secret. */
export interface AppCredentials {
  appId: string;
  installationId: string;
  /** The stored `GITHUB_APP_PRIVATE_KEY_B64`: base64 of the PEM, single line. */
  privateKeyB64: string;
}

/**
 * A concurrent edit lost the SHA race: the file changed between the read and the PUT, from
 * another editor or the site's own CI. Thrown so the save fails safe (re-fetch and ask the
 * editor to reapply) instead of surfacing a raw 409. Defined and caught inside the package
 * so `instanceof` is reliable, unlike kit's `redirect`/`error` across the peer boundary.
 */
export class CommitConflictError extends Error {
  constructor(public readonly path: string) {
    super(`Commit conflict on ${path}: it changed since it was opened`);
    this.name = 'CommitConflictError';
  }
}

/** Match a commit conflict by class and by name (bundling can alias the class identity). */
export function isConflict(err: unknown): boolean {
  return err instanceof CommitConflictError || (err as { name?: string } | null)?.name === 'CommitConflictError';
}

/**
 * A branch-create collided with an existing ref of the same name: another editor's draft, or a
 * repeated attempt racing itself. Thrown by both backends' createBranch so a caller catches the
 * collision as a refusal (fail(409, ...)) instead of a raw 500. Defined and caught inside the
 * package so `instanceof` is reliable, unlike kit's `redirect`/`error` across the peer boundary.
 */
export class BranchExistsError extends Error {
  constructor(public readonly branch: string) {
    super(`Branch already exists: ${branch}`);
    this.name = 'BranchExistsError';
  }
}

/** Match a branch-exists collision by class and by name (bundling can alias the class identity). */
export function isBranchExists(err: unknown): boolean {
  return err instanceof BranchExistsError || (err as { name?: string } | null)?.name === 'BranchExistsError';
}
