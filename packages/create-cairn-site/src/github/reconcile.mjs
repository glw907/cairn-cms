// Chapter 3's deploy-config reconciliation: diff the two tool-owned files (wrangler.jsonc,
// src/theme/cairn.config.ts) against the repo's current head and, when either differs, commit
// both in one Git Data commit built on that head's own tree (base_tree). A full-tree write
// (pushScaffold's own shape, right for a first push) would silently delete everything the admin
// has added since; base_tree is what keeps this reconcile from ever touching another file.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { githubRequest, webBase } from './api.mjs';
import { chapterError } from './catalogue.mjs';

/**
 * The commit message reconcileRepo writes. Never read back as an idempotence sentinel: the
 * admin's own commits move HEAD after a reconcile lands, so a HEAD-message check would already
 * be wrong on the very next run. The diff itself is the idempotence.
 */
export const RECONCILE_COMMIT_MESSAGE = 'Reconcile deploy config from create-cairn-site';

/** The two files this chapter owns; every other repo file is left untouched by its commit. */
const RECONCILED_FILES = ['wrangler.jsonc', 'src/theme/cairn.config.ts'];

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
 * Fetch a blob and decode its content as utf8 text.
 * @param {{ owner: string, repo: string, token: string }} target the repo and credential to read with
 * @param {string} sha the blob's sha
 * @returns {Promise<string>} the decoded content
 */
async function readBlobText({ owner, repo, token }, sha) {
  const { json } = await githubRequest('GET', `/repos/${owner}/${repo}/git/blobs/${sha}`, { token });
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
export async function reconcileRepo({ record, dir, userToken }) {
  const { owner, repo, defaultBranch } = record.repo;
  const token = userToken;

  const refResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { token });
  const headSha = refResponse.json.object.sha;

  const headCommitResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/commits/${headSha}`, { token });
  const headTreeSha = headCommitResponse.json.tree?.sha ?? null;

  let tree = [];
  if (headTreeSha) {
    const treeResponse = await githubRequest('GET', `/repos/${owner}/${repo}/git/trees/${headTreeSha}?recursive=1`, { token });
    tree = Array.isArray(treeResponse.json.tree) ? treeResponse.json.tree : [];
  }

  const localContents = {};
  let changed = false;
  for (const relativePath of RECONCILED_FILES) {
    const local = await readFile(path.join(dir, relativePath), 'utf8');
    localContents[relativePath] = local;
    const blobSha = findBlobSha(tree, relativePath);
    // A missing repo file counts as differing, the same as a content mismatch: either way the
    // repo does not yet carry what the local scaffold has.
    if (!blobSha) {
      changed = true;
      continue;
    }
    const remote = await readBlobText({ owner, repo, token }, blobSha);
    if (remote !== local) changed = true;
  }

  if (!changed) return { changed: false };

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
