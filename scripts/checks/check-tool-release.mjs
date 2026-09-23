// cairn-cms: the release precondition check. Confirms the tool/v1.1.0 tag AND its GitHub
// release both exist on origin before a pass runs any removal commit that depends on that
// release having shipped. A tag alone can sit on a branch that never merged, and a release
// cannot exist without a tag, so both facts are asserted and neither substitutes for the
// other. Not wired into `check` or CI: once the tag and release ship this fact never changes
// again, so a standing gate would requery GitHub for nothing on every future run. Run it by
// name (`npm run check:tool-release`) as a one-time pass precondition instead.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The tag this pass depends on having shipped, read from origin, not the local ref store. */
const TAG = 'tool/v1.1.0';

/** The GitHub repo the tag and release are checked against. */
const REPO = 'glw907/cairn-cms';

/**
 * The outcome of one GitHub existence check.
 * @typedef {{ found: boolean, detail: string }} CheckResult
 */

/**
 * Fetches a GitHub REST endpoint and reduces its response to a found/not-found/error verdict.
 * @param {(url: string) => Promise<Response>} fetchImpl The fetch implementation (injected for tests).
 * @param {string} url The GitHub REST API URL to request.
 * @param {string} label What this request is checking, used in the detail message.
 * @returns {Promise<CheckResult>} Whether the resource was found, and why not when it was not.
 */
async function checkResource(fetchImpl, url, label) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { found: false, detail: `could not read ${label} from GitHub: ${message}` };
  }
  if (response.status === 200) return { found: true, detail: `${label} found` };
  if (response.status === 404) return { found: false, detail: `${label} not found on origin` };
  return {
    found: false,
    detail: `could not read ${label} from GitHub: unexpected status ${response.status}`,
  };
}

/**
 * Checks whether TAG exists on origin's remote refs.
 * @param {(url: string) => Promise<Response>} fetchImpl The fetch implementation (injected for tests).
 * @returns {Promise<CheckResult>} Whether the tag was found, and why not when it was not.
 */
export function checkTag(fetchImpl) {
  const url = `https://api.github.com/repos/${REPO}/git/ref/tags/${TAG}`;
  return checkResource(fetchImpl, url, `tag "${TAG}"`);
}

/**
 * Checks whether TAG has a published GitHub release.
 * @param {(url: string) => Promise<Response>} fetchImpl The fetch implementation (injected for tests).
 * @returns {Promise<CheckResult>} Whether the release was found, and why not when it was not.
 */
export function checkRelease(fetchImpl) {
  const url = `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`;
  return checkResource(fetchImpl, url, `release "${TAG}"`);
}

/**
 * Runs both existence checks and reports a combined verdict.
 * @param {(url: string) => Promise<Response>} fetchImpl The fetch implementation (injected for tests).
 * @returns {Promise<{ ok: boolean, messages: string[] }>} Whether both facts held, and the detail for each.
 */
export async function runChecks(fetchImpl) {
  const [tag, release] = await Promise.all([checkTag(fetchImpl), checkRelease(fetchImpl)]);
  return {
    ok: tag.found && release.found,
    messages: [tag.detail, release.detail],
  };
}

async function main() {
  const result = await runChecks(fetch);
  for (const message of result.messages) console.log(`check-tool-release: ${message}`);
  if (!result.ok) {
    console.error(
      `check-tool-release: FAILED; the ${TAG} tag and its GitHub release must both exist on origin before this pass proceeds`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`check-tool-release: OK (${TAG} tag and release both confirmed on origin)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
