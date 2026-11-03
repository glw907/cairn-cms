// Teardown for one gate install, identified only by what the gate recorded: the uuids and names in
// the site's state record, and the D1 and R2 names in that install's own wrangler.jsonc (wrangler
// binds both by name and writes no id back). Never a lookup by name prefix, and never a build token
// registration: every install of the gate token shares one under a production name.
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

/** Every name the gate creates starts with this; a name without it is refused before any call. */
export const GATE_PREFIX = 'cairn-e2e-gate-';

/**
 * @typedef {object} TeardownDeps
 * @property {typeof fetch} fetchImpl the fetch for every HTTP call
 * @property {string} cloudflareBase the Cloudflare API base, `https://api.cloudflare.com/client/v4`
 * @property {string} githubBase the GitHub API base, `https://api.github.com`
 * @property {string} cloudflareToken the gate token
 * @property {string} githubToken the machine account's API token
 * @property {string} accountId the Cloudflare account
 * @property {(slug: string) => Promise<'deleted' | 'absent'>} deleteApp deletes the App in the
 *  browser (its Advanced settings); resolves `absent` on a 404 page, rejects when it cannot
 */

/**
 * @typedef {object} InstallRecord
 * @property {string} [dir] the install's directory
 * @property {{ repo?: { owner?: string, repo?: string }, appSlug?: string }} [github] the GitHub half
 * @property {{ workerName?: string, domain?: string, buildsTriggerUuid?: string, buildsConnectionUuid?: string }} [cloudflare]
 *  the Cloudflare half
 */

/**
 * @typedef {object} TeardownStep
 * @property {string} step what was deleted
 * @property {'deleted' | 'absent' | 'left'} status `absent` is a 404, which counts as done
 * @property {string} [detail] why a step was left
 */

/**
 * @typedef {object} TeardownResult
 * @property {TeardownStep[]} steps every attempt, in order
 * @property {string[]} left the steps still standing
 */

/**
 * The D1 and R2 names in a wrangler.jsonc.
 * @param {string} text the file's text
 * @returns {{ d1: string[], r2: string[] }} the exact names bound
 */
export function resourceNames(text) {
  /** @param {string} key */
  const all = (key) => [...text.matchAll(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'g'))].map((match) => match[1]);
  return { d1: all('database_name'), r2: all('bucket_name') };
}

/**
 * Remove one install.
 * @param {{ record: InstallRecord, wranglerText: string, deps: TeardownDeps }} input the recorded
 *  install and the text of its wrangler.jsonc
 * @returns {Promise<TeardownResult>} what was done and what is left
 */
export async function teardownInstall({ record, wranglerText, deps }) {
  const worker = record.cloudflare?.workerName;
  const repoName = record.github?.repo?.repo;
  const owner = record.github?.repo?.owner;
  const slug = record.github?.appSlug;
  const { d1, r2 } = resourceNames(wranglerText);
  for (const name of [worker, repoName, slug, ...d1, ...r2]) {
    if (name !== undefined && !name.startsWith(GATE_PREFIX)) {
      throw new Error(`Refusing teardown: "${name}" does not start with ${GATE_PREFIX}.`);
    }
  }

  const { fetchImpl, accountId } = deps;
  const account = `${deps.cloudflareBase}/accounts/${accountId}`;
  /** @type {TeardownStep[]} */
  const steps = [];

  /**
   * @param {string} step the label
   * @param {() => Promise<'deleted' | 'absent'>} run throws to report the step left
   */
  async function attempt(step, run) {
    try {
      steps.push({ step, status: await run() });
    } catch (error) {
      steps.push({ step, status: 'left', detail: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * @param {string} url
   * @param {string} token
   * @param {string} method
   * @returns {Promise<{ status: number, json: any }>}
   */
  async function call(url, token, method) {
    const response = await fetchImpl(url, {
      method,
      headers: { authorization: `Bearer ${token}`, 'user-agent': 'cairn-gate', 'content-type': 'application/json' },
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // A body that is not JSON is reported by status.
    }
    return { status: response.status, json };
  }

  /**
   * @param {string} url
   * @param {string} token
   * @returns {Promise<'deleted' | 'absent'>}
   */
  async function del(url, token) {
    const { status, json } = await call(url, token, 'DELETE');
    if (status === 404) return 'absent';
    if (status < 200 || status >= 300) {
      const first = json?.errors?.[0];
      throw new Error(`answered ${status}${first ? ` (${first.code}: ${first.message})` : ''}`);
    }
    return 'deleted';
  }

  const cf = (/** @type {string} */ route) => del(`${account}${route}`, deps.cloudflareToken);

  const trigger = record.cloudflare?.buildsTriggerUuid;
  if (trigger) await attempt('Builds trigger', () => cf(`/builds/triggers/${trigger}`));
  const connection = record.cloudflare?.buildsConnectionUuid;
  if (connection) await attempt('Builds repo connection', () => cf(`/builds/repos/connections/${connection}`));

  const domain = record.cloudflare?.domain;
  if (domain && worker) {
    await attempt(`custom domain ${domain}`, async () => {
      const listed = await call(`${account}/workers/domains?hostname=${encodeURIComponent(domain)}`, deps.cloudflareToken, 'GET');
      if (listed.status !== 200) throw new Error(`the domain list answered ${listed.status}`);
      const mine = (listed.json?.result ?? []).filter((/** @type {{ hostname?: string, service?: string }} */ entry) => entry.hostname === domain && entry.service === worker);
      if (mine.length === 0) return 'absent';
      for (const entry of mine) await cf(`/workers/domains/${entry.id}`);
      return 'deleted';
    });
  }
  if (worker) await attempt(`Worker ${worker}`, () => cf(`/workers/scripts/${worker}?force=true`));
  for (const name of d1) {
    await attempt(`D1 ${name}`, async () => {
      const listed = await call(`${account}/d1/database?name=${encodeURIComponent(name)}`, deps.cloudflareToken, 'GET');
      if (listed.status !== 200) throw new Error(`the database list answered ${listed.status}`);
      const mine = (listed.json?.result ?? []).filter((/** @type {{ name?: string }} */ entry) => entry.name === name);
      if (mine.length === 0) return 'absent';
      for (const entry of mine) await cf(`/d1/database/${entry.uuid}`);
      return 'deleted';
    });
  }
  // The bucket is expected empty (the gate uploads no media); a refused delete is reported, never forced.
  for (const name of r2) await attempt(`R2 ${name}`, () => cf(`/r2/buckets/${name}`));
  if (owner && repoName) await attempt(`repository ${owner}/${repoName}`, () => del(`${deps.githubBase}/repos/${owner}/${repoName}`, deps.githubToken));
  if (slug) await attempt(`GitHub App ${slug}`, () => deps.deleteApp(slug));

  return { steps, left: steps.filter((step) => step.status === 'left').map((step) => step.step) };
}

/**
 * Tear down every recorded install under a state directory, deleting each clean install's record.
 * @param {{ stateDir: string, deps: TeardownDeps, cleanup?: string[], print?: (line: string) => void }} input
 *  `cleanup` lists files (the capture, the URL log) removed when every install in the directory
 *  came down clean
 * @returns {Promise<{ installs: number, left: string[] }>} how many records were seen, and the steps left
 */
export async function teardownStateDir({ stateDir, deps, cleanup = [], print = console.log }) {
  /** @type {string[]} */
  let files = [];
  try {
    files = (await readdir(stateDir)).filter((file) => file.endsWith('.json'));
  } catch {
    return { installs: 0, left: [] };
  }
  /** @type {string[]} */
  const left = [];
  for (const file of files) {
    const recordPath = path.join(stateDir, file);
    /** @type {InstallRecord} */
    let record;
    try {
      record = JSON.parse(await readFile(recordPath, 'utf8'));
    } catch {
      left.push(`${file}: unreadable record`);
      continue;
    }
    if (!record.cloudflare?.workerName && !record.github?.repo) continue;
    let wranglerText = '';
    if (record.dir) wranglerText = await readFile(path.join(record.dir, 'wrangler.jsonc'), 'utf8').catch(() => '');
    let result;
    try {
      result = await teardownInstall({ record, wranglerText, deps });
    } catch (error) {
      left.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    for (const step of result.steps) print(`teardown ${step.status.padEnd(7)} ${step.step}${step.detail ? `: ${step.detail}` : ''}`);
    if (!record.dir || wranglerText === '') print(`teardown note    ${file}: the install's wrangler.jsonc is gone, so its D1 and R2 names were not read`);
    if (result.left.length === 0) await rm(recordPath, { force: true });
    else left.push(...result.left.map((step) => `${file}: ${step}`));
  }
  if (left.length === 0) for (const file of cleanup) await rm(file, { force: true });
  return { installs: files.length, left };
}
