// The pre-push identity finalize. The engine's GitHub App identity is source-carried by
// design (src/lib/github/backend.ts: "the non-secret GitHub App identity an adapter carries
// in source"), so the scaffold's own cairn.config.ts ships with the showcase's placeholder
// values until this module rewrites them with the real ones, right before the T2 chapter's
// push. This is the same exact-string, fail-loud tradition as substitute.mjs: the target
// string is verified against the real showcase, and a missing target means the showcase moved
// out from under this module, which must surface as a loud throw naming the file and the
// missing string rather than a silently-unpersonalized (and non-functional) backend config.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG_RELATIVE = 'src/theme/cairn.config.ts';

/**
 * The showcase's own placeholder `githubApp(...)` call, verified character for character
 * against `examples/showcase/src/theme/cairn.config.ts`. `appId` and `installationId` are
 * strings in `githubApp`'s config type (src/lib/github/backend.ts), so the placeholders are
 * quoted digits, not numbers.
 */
export const TEMPLATE_GITHUB_APP_LITERAL =
  "githubApp({ owner: 'showcase', repo: 'demo', branch: 'main', appId: '1', installationId: '2' })";

/**
 * Build the real `githubApp(...)` call, keeping every value single-quoted and `branch: 'main'`
 * intact, the same shape as the template literal it replaces.
 * @param {{ owner: string, repo: string, appId: string | number, installationId: string | number }} identity
 *  the site's real GitHub App identity
 * @returns {string} the rewritten `githubApp(...)` call
 */
function buildRealLiteral({ owner, repo, appId, installationId }) {
  return (
    `githubApp({ owner: '${owner}', repo: '${repo}', branch: 'main', ` +
    `appId: '${appId}', installationId: '${installationId}' })`
  );
}

/**
 * Rewrite the scaffold's `src/theme/cairn.config.ts` so its backend carries the site's real
 * GitHub App identity, born correct before the T2 chapter pushes it to GitHub.
 *
 * Idempotent: a resumed run that reaches this a second time finds the real owner already in
 * place and returns without touching the file. Any other state, most likely the showcase's own
 * placeholder literal having changed shape, throws naming the file and the exact string this
 * pass could not find, rather than pushing a scaffold whose backend config silently still
 * points at `'showcase'`.
 * @param {string} dir the scaffold root
 * @param {{ owner: string, repo: string, appId: string | number, installationId: string | number }} identity
 *  the site's real GitHub App identity: the repository's owner login and name, and the App's
 *  id and installation id
 * @returns {Promise<void>}
 */
export async function finalizeGithubIdentity(dir, identity) {
  const configPath = path.join(dir, CONFIG_RELATIVE);
  let content;
  try {
    content = await readFile(configPath, 'utf8');
  } catch (cause) {
    if (cause.code === 'ENOENT') {
      throw new Error(`finalize: expected to find ${CONFIG_RELATIVE}, but it is missing`);
    }
    throw cause;
  }

  // Idempotence keys on the WHOLE rewritten call, never the owner alone. An owner login of
  // `showcase` is a legal GitHub account and collides with the placeholder's own owner, so an
  // owner-only check would read the untouched template as already finalized and push a scaffold
  // still carrying repo 'demo' and appId '1'. Matching the full literal cannot collide: it is
  // equal to the template only when the real identity is the template, which is already correct.
  const realLiteral = buildRealLiteral(identity);
  if (content.includes(realLiteral)) return;

  const index = content.indexOf(TEMPLATE_GITHUB_APP_LITERAL);
  if (index === -1) {
    throw new Error(
      `finalize: expected to find "${TEMPLATE_GITHUB_APP_LITERAL}" in ${CONFIG_RELATIVE}, but it is missing`,
    );
  }

  const rewritten =
    content.slice(0, index) + realLiteral + content.slice(index + TEMPLATE_GITHUB_APP_LITERAL.length);
  await writeFile(configPath, rewritten);
}
