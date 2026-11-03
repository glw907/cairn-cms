// Chapter 3's deploy-config reconciliation: diff the two tool-owned files (wrangler.jsonc,
// src/theme/cairn.config.ts) against the repo's current head and, when either differs, commit
// both in one Git Data commit built on that head's tree (base_tree). A full-tree write
// (pushScaffold's shape, right for a first push) would silently delete everything the admin
// has added since; base_tree is what keeps this reconcile from ever touching another file.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { githubRequest, webBase } from './api.mjs';
import { chapterError } from './catalogue.mjs';

/**
 * The commit message reconcileRepo writes. Never read back as an idempotence sentinel: the
 * admin's commits move HEAD after a reconcile lands, so a HEAD-message check would already
 * be wrong on the very next run. The diff itself is the idempotence.
 */
export const RECONCILE_COMMIT_MESSAGE = 'Reconcile deploy config from create-cairn-site';

/**
 * The two files this chapter owns; every other repo file is left untouched by its commit.
 * Exported, and imported directly by chapter3.mjs's hash-gate (`reconciledConfigHash`),
 * rather than duplicated there: a third tool-owned file added to this list without a matching
 * update at that gate would silently go unnoticed by it, so this constant is the ONE place either
 * module reads it from (T4c review finding B5).
 */
export const RECONCILED_FILES = ['wrangler.jsonc', 'src/theme/cairn.config.ts'];

/**
 * Find a path's blob sha in a flat, fully-recursive tree listing: the shape `GET .../git/trees/
 * :sha?recursive=1` returns, every blob at its full slash-joined path with no directory entries.
 * @param {Array<{ path: string, sha: string, type: string }>} tree the tree's entries
 * @param {string} relativePath the path to find
 * @returns {string | null} the blob's sha, or null when the path is not present in the tree
 */
function findBlobSha(tree, relativePath) {
  const entry = tree.find((candidate) => candidate.type === 'blob' && candidate.path === relativePath);
  return entry ? entry.sha : null;
}

/**
 * Read one Git Data object, refusing any answer but a 2xx. Every read here feeds the diff that
 * decides what gets committed, so a refused or failed read must stop the reconcile rather than
 * read as an empty tree or a missing file, which would commit over the repository's real copy.
 * @param {string} apiPath the path to GET
 * @param {string} token the credential to read with
 * @returns {Promise<any>} the parsed body
 */
async function readOrThrow(apiPath, token) {
  const { status, json } = await githubRequest('GET', apiPath, { token });
  if (status < 200 || status >= 300) {
    throw new Error(`reconcile: GitHub answered HTTP ${status} to GET ${apiPath}, so nothing was committed.`);
  }
  return json;
}

/**
 * Fetch a blob and decode its content as utf8 text.
 * @param {{ owner: string, repo: string, token: string }} target the repo and credential to read with
 * @param {string} sha the blob's sha
 * @returns {Promise<string>} the decoded content
 */
async function readBlobText({ owner, repo, token }, sha) {
  const json = await readOrThrow(`/repos/${owner}/${repo}/git/blobs/${sha}`, token);
  return Buffer.from(json.content, json.encoding ?? 'base64').toString('utf8');
}

/**
 * @typedef {object} ReconcileGithubRecord
 * @property {string} clientId the App's OAuth client id (unused directly here; carried for
 *  shape parity with the persisted record callers already hold)
 * @property {string} clientSecret the App's OAuth client secret (same note as clientId)
 * @property {number} installationId the App's installation id (same note as clientId)
 * @property {{ id: number, owner: string, repo: string, defaultBranch: string }} repo the
 *  pushed repository's identity
 */

/**
 * @typedef {object} ReconcileRepoInput
 * @property {ReconcileGithubRecord} record the persisted `github` sub-record
 * @property {string} dir the scaffold root, holding the current local copies of the two
 *  tool-owned files
 * @property {string} userToken a user access token, already obtained (from oauth.mjs's
 *  `reauthorize`) by the caller; this function never mints or persists one itself
 * @property {(files: Array<{ path: string, remote: string | null, local: string }>) => void} [guard]
 *  called with the repository's copy (null when the repository lacks the file) and the local
 *  copy of each tool-owned file once a difference is found and before any blob is written; a
 *  throw from it aborts the reconcile with nothing committed
 */

/**
 * Diff the repo's current `wrangler.jsonc` and `src/theme/cairn.config.ts` against their local
 * disk copies and, when either differs, commit both in one Git Data commit built on the repo's
 * current head (`base_tree`), then advance the default branch. Read-before-write throughout: an
 * identical repo makes zero POST or PATCH calls.
 * @param {ReconcileRepoInput} input the reconcile's inputs
 * @returns {Promise<{ changed: boolean, commitSha?: string }>} whether a commit was made, and
 *  its sha when one was
 */
export async function reconcileRepo({ record, dir, userToken, guard }) {
  const { owner, repo, defaultBranch } = record.repo;
  const token = userToken;

  const ref = await readOrThrow(`/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, token);
  const headSha = ref.object.sha;

  const headCommit = await readOrThrow(`/repos/${owner}/${repo}/git/commits/${headSha}`, token);
  const headTreeSha = headCommit?.tree?.sha ?? null;
  // With no base tree, the commit's tree would hold only the two files and delete the rest.
  if (!headTreeSha) {
    throw new Error(`reconcile: GitHub returned no tree for commit ${headSha}, so nothing was committed.`);
  }

  const treeListing = await readOrThrow(`/repos/${owner}/${repo}/git/trees/${headTreeSha}?recursive=1`, token);
  // A truncated listing may omit a tool-owned file, which would then read as missing.
  if (treeListing?.truncated) {
    throw new Error(`reconcile: GitHub truncated the file listing of commit ${headSha}, so nothing was committed.`);
  }
  const tree = Array.isArray(treeListing?.tree) ? treeListing.tree : [];

  const localContents = {};
  const compared = [];
  let changed = false;
  for (const relativePath of RECONCILED_FILES) {
    const local = await readFile(path.join(dir, relativePath), 'utf8');
    localContents[relativePath] = local;
    const blobSha = findBlobSha(tree, relativePath);
    // A missing repo file counts as differing, the same as a content mismatch: either way the
    // repo does not yet carry what the local scaffold has.
    const remote = blobSha ? await readBlobText({ owner, repo, token }, blobSha) : null;
    if (remote !== local) changed = true;
    compared.push({ path: relativePath, remote, local });
  }

  if (!changed) return { changed: false };
  guard?.(compared);

  const blobEntries = [];
  for (const relativePath of RECONCILED_FILES) {
    const blobResponse = await githubRequest('POST', `/repos/${owner}/${repo}/git/blobs`, {
      token,
      body: { content: Buffer.from(localContents[relativePath], 'utf8').toString('base64'), encoding: 'base64' }
    });
    blobEntries.push({ path: relativePath, mode: '100644', type: 'blob', sha: blobResponse.json.sha });
  }

  const newTreeResponse = await githubRequest('POST', `/repos/${owner}/${repo}/git/trees`, {
    token,
    body: { base_tree: headTreeSha, tree: blobEntries }
  });

  const newCommitResponse = await githubRequest('POST', `/repos/${owner}/${repo}/git/commits`, {
    token,
    body: { message: RECONCILE_COMMIT_MESSAGE, tree: newTreeResponse.json.sha, parents: [headSha] }
  });
  const commitSha = newCommitResponse.json.sha;

  const refUpdateResponse = await githubRequest('PATCH', `/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
    token,
    body: { sha: commitSha }
  });
  if (refUpdateResponse.status < 200 || refUpdateResponse.status >= 300) {
    throw chapterError('builds-push-refused', { dir, owner, repo, branch: defaultBranch, webBase: webBase() });
  }

  return { changed: true, commitSha };
}
