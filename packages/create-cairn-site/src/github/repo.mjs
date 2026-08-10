// Repo create, installation-coverage verify, and the git-data push. This is the third GitHub
// trip the chapter makes, after the manifest exchange (Task 6) and the install+authorize round
// trip (Task 7/9): the user access token from that trip creates the content repository and
// pushes the scaffold into it with no git binary, using the Git Data API directly.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { githubRequest, webBase } from './api.mjs';
import { chapterError } from './catalogue.mjs';
import { SCAFFOLD_SENTINEL } from '../scaffold.mjs';

/** The commit message pushScaffold writes, and the marker its idempotent re-push checks for. */
export const TOOL_COMMIT_MESSAGE = 'Initial commit from create-cairn-site';

/** Entries pushScaffold's directory walk never ships: dependency trees, VCS metadata, and the
 * atomic-claim marker (Task 11) that must not land in the pushed content. */
const SKIPPED_ENTRIES = new Set(['node_modules', '.git', SCAFFOLD_SENTINEL]);

/**
 * True when a GitHub error body mentions SAML or SSO, the shape of a request refused because
 * an organization enforces single sign-on and the App has not been authorized for it.
 * @param {unknown} json the parsed error response body
 * @returns {boolean} whether the body's text mentions SAML or SSO
 */
function mentionsSso(json) {
  const text = JSON.stringify(json ?? {}).toLowerCase();
  return text.includes('saml') || text.includes('sso');
}

/**
 * @typedef {object} CreateRepoInput
 * @property {string} name the repository name
 * @property {'user' | 'org'} ownerType who owns the new repository
 * @property {string} [org] the org login, required when `ownerType` is `'org'`
 * @property {string} dir the `--dir` value, interpolated into any raised error's `Next:` line
 * @property {string} [appName] the App's display name, needed only for an sso-blocked error's copy
 */

/**
 * @typedef {object} CreatedRepo
 * @property {number} id the repository's numeric id
 * @property {string} owner the owning account's login
 * @property {string} repo the repository name
 */

/**
 * Create the content repository with `auto_init: true` (an empty repo 409s the Git Data API,
 * so the tool always seeds one). GitHub auto-adds a repo created this way to the installation
 * that covers its owner, including under "Only select repositories" (spike-confirmed
 * 2026-08-10), which is why there is no separate link call here.
 * @param {string} token a user access token
 * @param {CreateRepoInput} input the repository to create
 * @returns {Promise<CreatedRepo>} the created repository's id, owner login, and name
 */
export async function createRepo(token, { name, ownerType, org, dir, appName }) {
  const requestPath = ownerType === 'org' ? `/orgs/${org}/repos` : '/user/repos';
  const { status, json } = await githubRequest('POST', requestPath, {
    token,
    body: { name, private: true, auto_init: true }
  });

  if (status === 201) {
    return { id: json.id, owner: json.owner.login, repo: json.name };
  }

  if (status === 422 && Array.isArray(json?.errors) && json.errors.some((error) => error.field === 'name')) {
    const owner = ownerType === 'org' ? org : 'your account';
    throw chapterError('repo-name-collision', { repo: name, owner, dir });
  }

  if (status === 403 && mentionsSso(json)) {
    throw chapterError('sso-blocked', { org, appName, dir, webBase: webBase() });
  }

  // Every other status is an invariant violation, not a catalogue row: the chapter always
  // installs the App before it ever reaches repo creation, so a bare 404 here (no installation)
  // or any other unmapped status means an earlier step was skipped, not a recoverable GitHub
  // refusal. A plain error with its own next step still leaves the run with something to do.
  throw new Error(
    `github: repo create failed unexpectedly (status ${status}).\n` +
      `Next step: re-run npx create-cairn-site --dir ${dir}.`
  );
}

/**
 * @typedef {object} VerifyInstallationCoversInput
 * @property {number | string} installationId the installation to check
 * @property {string} owner the repository's owner login
 * @property {string} repo the repository name
 * @property {string} dir the `--dir` value, interpolated into a raised error's `Next:` line
 */

/**
 * Verify the App's installation covers the newly created repository. There is deliberately no
 * PUT call here: `PUT /user/installations/{iid}/repositories/{rid}` is refused for a user
 * access token (403 `Resource not accessible by integration`, spike-confirmed 2026-08-10 in
 * both an all-repositories and a selected-repositories install) and unnecessary, since a repo
 * created with the App's own user token is auto-added to the installation already. This call is
 * the load-bearing check that the auto-add actually happened.
 * @param {string} token a user access token
 * @param {VerifyInstallationCoversInput} input the installation and repository to check
 * @returns {Promise<void>} resolves when the installation covers the repository
 */
export async function verifyInstallationCovers(token, { installationId, owner, repo, dir }) {
  const { json } = await githubRequest('GET', `/user/installations/${installationId}/repositories`, { token });
  const repositories = Array.isArray(json?.repositories) ? json.repositories : [];
  const covered = repositories.some((candidate) => {
    if (candidate.name !== repo) return false;
    return candidate.owner?.login ? candidate.owner.login === owner : true;
  });
  if (!covered) {
    throw chapterError('installation-not-covering-repo', { repo, dir, webBase: webBase() });
  }
}

/**
 * Call a Git Data API step, translating a network failure or a 5xx response into
 * `push-interrupted`: blobs are content-addressed and the whole push re-runs safely, so any
 * mid-push failure is always recoverable by re-running the tool.
 * @param {() => Promise<import('./api.mjs').GithubResponse>} call the request to make
 * @param {string} dir the `--dir` value, interpolated into the raised error's `Next:` line
 * @returns {Promise<import('./api.mjs').GithubResponse>} the call's result, once confirmed not a
 *  server failure
 */
async function pushStep(call, dir) {
  let response;
  try {
    response = await call();
  } catch {
    throw chapterError('push-interrupted', { dir });
  }
  if (response.status >= 500) {
    throw chapterError('push-interrupted', { dir });
  }
  return response;
}

/**
 * Walk `dir` recursively for the files pushScaffold ships, skipping dependency trees, VCS
 * metadata, and the scaffold's own atomic-claim marker.
 * @param {string} dir the scaffold directory to walk
 * @returns {Promise<Array<{ absolutePath: string, relativePath: string }>>} every file to push,
 *  with a forward-slash relative path suitable for a Git tree entry
 */
async function collectFiles(dir) {
  const files = [];
  async function walk(currentDir, relativePrefix) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIPPED_ENTRIES.has(entry.name)) continue;
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push({ absolutePath, relativePath });
      }
    }
  }
  await walk(dir, '');
  return files;
}

/**
 * @typedef {object} PushScaffoldInput
 * @property {string} owner the repository's owner login
 * @property {string} repo the repository name
 * @property {string} dir the scaffold directory to push
 * @property {(line: string) => void} log receives one printed line per call
 */

/**
 * Push the scaffolded directory into the freshly created repository with no git binary, using
 * the Git Data API directly: one blob per file, one full tree (no `base_tree`, so the
 * `auto_init` README does not survive), one commit parented on the seed commit, then a ref
 * update. Idempotent: a re-run first checks whether the ref's commit already carries
 * `TOOL_COMMIT_MESSAGE` and, if so, returns without creating anything, since blobs are
 * content-addressed but a repeated commit and ref update are not free operations to redo.
 * @param {string} token a user access token
 * @param {PushScaffoldInput} input the push's inputs
 * @returns {Promise<{ commitSha: string }>} the sha of the commit now on `heads/main`
 */
export async function pushScaffold(token, { owner, repo, dir, log }) {
  const repoPath = `/repos/${owner}/${repo}`;

  const refResponse = await pushStep(() => githubRequest('GET', `${repoPath}/git/ref/heads/main`, { token }), dir);
  const seedSha = refResponse.json.object.sha;

  const seedCommitResponse = await pushStep(() => githubRequest('GET', `${repoPath}/git/commits/${seedSha}`, { token }), dir);
  if (seedCommitResponse.json.message === TOOL_COMMIT_MESSAGE) {
    log(`The push already landed at ${seedSha}; nothing to do.`);
    return { commitSha: seedSha };
  }

  const files = await collectFiles(dir);
  log(`Pushing ${files.length} files`);

  const tree = [];
  for (const file of files) {
    const content = await readFile(file.absolutePath);
    const blobResponse = await pushStep(
      () => githubRequest('POST', `${repoPath}/git/blobs`, { token, body: { content: content.toString('base64'), encoding: 'base64' } }),
      dir
    );
    tree.push({ path: file.relativePath, mode: '100644', type: 'blob', sha: blobResponse.json.sha });
  }

  const treeResponse = await pushStep(() => githubRequest('POST', `${repoPath}/git/trees`, { token, body: { tree } }), dir);

  const commitResponse = await pushStep(
    () =>
      githubRequest('POST', `${repoPath}/git/commits`, {
        token,
        body: { message: TOOL_COMMIT_MESSAGE, tree: treeResponse.json.sha, parents: [seedSha] }
      }),
    dir
  );

  await pushStep(
    () => githubRequest('PATCH', `${repoPath}/git/refs/heads/main`, { token, body: { sha: commitResponse.json.sha } }),
    dir
  );

  return { commitSha: commitResponse.json.sha };
}
