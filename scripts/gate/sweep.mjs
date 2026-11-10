// The sweep: finds what the proving runs left on the test accounts, by anchored name only, and with
// `--apply` deletes it. It also proves the cleanroom token's permission groups with throwaway
// `cairn-gate-probe-<time>` resources. Every Cloudflare call goes through Node `fetch`, so no token
// is in argv, and no line it prints carries a value.
import { appendFileSync } from 'node:fs';
import path from 'node:path';

/** The Cloudflare account the cleanroom token and a run's resources live on. */
export const GATE_ACCOUNT_ID = '120c269ad6d3dfbe6d63a0bb53758ca0';
/** The test domain whose zone is active on that account. */
export const TEST_DOMAIN = 'carin-test.org';
/**
 * The names `cairn new` derives from a run id for a repository, Worker, database, and bucket: the
 * base name, a taken-name suffix, then the auth or media part. The one place the sweep decides.
 */
export const GATE_NAME = /^cairn-gate-\d{10}(-[2-9])?(-auth|-media)?$/;
/** The GitHub App name setup derives from a run's site name. */
export const APP_NAME = /^cairn-cairn-gate-\d{10}$/;
/** The retired gate's resource names, reported and never deleted. */
export const OLD_GATE_NAME = /^cairn-e2e-gate-/;
/** A `--check-scopes` probe's name. */
export const PROBE_NAME = /^cairn-gate-probe-\d+$/;
/** The address records that count as a record left on the bare address or `www`. */
const ADDRESS_TYPES = ['A', 'AAAA', 'CNAME'];

/**
 * @typedef {object} Answer
 * @property {number} status the HTTP status
 * @property {any} json the parsed body, null when it was not JSON
 * @property {Headers} headers the response headers
 */

/**
 * @typedef {object} Clients
 * @property {(method: string, route: string, body?: unknown) => Promise<Answer>} cf a call under the
 *  Cloudflare API base, with the cleanroom token; a `FormData` body is sent as multipart
 * @property {(method: string, route: string, body?: unknown) => Promise<Answer>} gh a call under the
 *  GitHub API base, with the machine account's token
 * @property {string} accountId the Cloudflare account
 */

/**
 * @param {{ cloudflareToken: string, githubToken: string, fetchImpl?: typeof fetch, cloudflareBase?: string, githubBase?: string, accountId?: string }} input
 * @returns {Clients}
 */
export function makeClients({
  cloudflareToken,
  githubToken,
  fetchImpl = fetch,
  cloudflareBase = 'https://api.cloudflare.com/client/v4',
  githubBase = 'https://api.github.com',
  accountId = GATE_ACCOUNT_ID,
}) {
  /**
   * @param {string} base
   * @param {Record<string, string>} headers
   * @returns {Clients['cf']}
   */
  const caller = (base, headers) => async (method, route, body) => {
    const multipart = body instanceof FormData;
    const response = await fetchImpl(`${base}${route}`, {
      method,
      headers: { ...headers, ...(body === undefined || multipart ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // A non-JSON body is reported by its status alone.
    }
    return { status: response.status, json, headers: response.headers };
  };
  return {
    cf: caller(cloudflareBase, { authorization: `Bearer ${cloudflareToken}` }),
    gh: caller(githubBase, { authorization: `Bearer ${githubToken}`, accept: 'application/vnd.github+json', 'user-agent': 'cairn-gate-sweep' }),
    accountId,
  };
}

/**
 * The first error of a Cloudflare or GitHub answer, as a short phrase.
 * @param {Answer} answer
 * @returns {string}
 */
export function describe(answer) {
  const first = answer.json?.errors?.[0];
  if (first) return `${answer.status} (${first.code}: ${first.message})`;
  if (typeof answer.json?.message === 'string') return `${answer.status} (${answer.json.message})`;
  return String(answer.status);
}

/**
 * @param {Answer} answer a Cloudflare answer
 * @param {string} what the call, for the message
 * @returns {any} the answer's `result`
 */
export function cfResult(answer, what) {
  if (answer.status !== 200 || !answer.json?.success) throw new Error(`${what} answered ${describe(answer)}`);
  return answer.json.result;
}

/**
 * A delete that succeeded: Cloudflare answers some with 204 and no body.
 * @param {Answer} answer a Cloudflare answer
 * @param {string} what the call, for the message
 */
function cfDeleted(answer, what) {
  if (answer.status < 200 || answer.status >= 300 || answer.json?.success === false) throw new Error(`${what} answered ${describe(answer)}`);
}

/**
 * @param {Answer} answer a GitHub answer
 * @param {string} what the call, for the message
 * @returns {any} the body
 */
function ghBody(answer, what) {
  if (answer.status < 200 || answer.status >= 300) throw new Error(`${what} answered ${describe(answer)}`);
  return answer.json;
}

/**
 * One read per Cloudflare permission group, each a path that needs only that group.
 * @param {string} accountId the account
 * @param {string} zoneId the test domain's zone
 * @returns {Array<{ group: string, route: string }>}
 */
export function groupReads(accountId, zoneId) {
  return [
    { group: 'Workers Scripts', route: `/accounts/${accountId}/workers/scripts` },
    { group: 'D1', route: `/accounts/${accountId}/d1/database?per_page=1` },
    { group: 'Workers R2 Storage', route: `/accounts/${accountId}/r2/buckets?per_page=1` },
    { group: 'Account Settings', route: `/accounts/${accountId}` },
    { group: 'Zone', route: `/zones/${zoneId}` },
    { group: 'DNS', route: `/zones/${zoneId}/dns_records?per_page=1` },
    { group: 'Email Sending', route: `/zones/${zoneId}/email/sending/subdomains` },
    { group: 'Workers Routes', route: `/zones/${zoneId}/workers/routes` },
  ];
}

/**
 * @param {Clients} clients
 * @returns {Promise<string>} the id of the one zone named for the test domain
 */
export async function findZone({ cf }) {
  const zones = cfResult(await cf('GET', `/zones?name=${TEST_DOMAIN}`), 'the zone read');
  if (zones.length !== 1) throw new Error(`expected one zone for ${TEST_DOMAIN}, found ${zones.length}`);
  return zones[0].id;
}

/**
 * @typedef {object} Inventory
 * @property {string[]} workers every Worker's name
 * @property {Array<{ id: string, hostname: string, service: string }>} domains every custom domain
 * @property {Array<{ uuid: string, name: string }>} databases
 * @property {string[]} buckets
 * @property {Array<{ owner: string, name: string }>} repos the machine account's repositories
 * @property {string[]} apps the machine account's GitHub Apps, by slug
 * @property {Array<{ type: string, name: string, content: string }>} records the bare address's and
 *  `www`'s address records
 */

/**
 * Read everything the sweep might act on, unfiltered.
 * @param {Clients} clients the API clients
 * @param {() => Promise<string[]>} listApps lists the Apps through the settings page
 * @param {{ records?: boolean }} [options] `records: false` skips the DNS read
 * @returns {Promise<Inventory>}
 */
export async function inventory(clients, listApps, { records: withRecords = true } = {}) {
  const { cf, gh, accountId } = clients;
  const zoneId = await findZone(clients);
  const workers = cfResult(await cf('GET', `/accounts/${accountId}/workers/scripts`), 'the Workers list').map((/** @type {{ id: string }} */ w) => w.id);
  const domains = cfResult(await cf('GET', `/accounts/${accountId}/workers/domains`), 'the custom domains list').map(
    (/** @type {{ id: string, hostname: string, service: string }} */ d) => ({ id: d.id, hostname: d.hostname, service: d.service }),
  );
  /** @type {Inventory['databases']} */
  const databases = [];
  for (let page = 1; ; page++) {
    const answer = await cf('GET', `/accounts/${accountId}/d1/database?page=${page}&per_page=100`);
    const items = cfResult(answer, 'the D1 list');
    databases.push(...items.map((/** @type {{ uuid: string, name: string }} */ d) => ({ uuid: d.uuid, name: d.name })));
    if (items.length < 100) break;
  }
  /** @type {string[]} */
  const buckets = [];
  let cursor = '';
  for (;;) {
    const answer = await cf('GET', `/accounts/${accountId}/r2/buckets?per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    const result = cfResult(answer, 'the R2 list');
    buckets.push(...(result.buckets ?? []).map((/** @type {{ name: string }} */ b) => b.name));
    cursor = answer.json?.result_info?.cursor ?? '';
    if (!cursor || (result.buckets ?? []).length === 0) break;
  }
  /** @type {Inventory['repos']} */
  const repos = [];
  for (let page = 1; ; page++) {
    const items = ghBody(await gh('GET', `/user/repos?affiliation=owner&per_page=100&page=${page}`), 'the repository list');
    repos.push(...items.map((/** @type {{ name: string, owner: { login: string } }} */ r) => ({ owner: r.owner.login, name: r.name })));
    if (items.length < 100) break;
  }
  const apps = await listApps();
  /** @type {Inventory['records']} */
  const records = [];
  for (let page = 1; withRecords; page++) {
    const items = cfResult(await cf('GET', `/zones/${zoneId}/dns_records?page=${page}&per_page=100`), 'the DNS records read');
    for (const record of items) {
      const onAddress = record.name === TEST_DOMAIN || record.name === `www.${TEST_DOMAIN}`;
      if (onAddress && ADDRESS_TYPES.includes(record.type)) records.push({ type: record.type, name: record.name, content: record.content });
    }
    if (items.length < 100) break;
  }
  return { workers, domains, databases, buckets, repos, apps, records };
}

/**
 * @typedef {object} Targets
 * @property {Array<{ owner: string, name: string }>} repos
 * @property {Array<{ id: string, hostname: string }>} domains
 * @property {string[]} workers
 * @property {Array<{ uuid: string, name: string }>} databases
 * @property {string[]} buckets
 * @property {string[]} apps
 */

/**
 * Pick the inventory entries a name pattern matches, whole name only. A custom domain is picked
 * only when its `service` names a picked Worker.
 * @param {Inventory} inv the inventory
 * @param {RegExp} names matches a repository, Worker, database, or bucket name
 * @param {RegExp | null} apps matches an App slug, or null for none
 * @returns {Targets}
 */
export function select(inv, names, apps) {
  const workers = inv.workers.filter((name) => names.test(name));
  return {
    repos: inv.repos.filter((repo) => names.test(repo.name)),
    domains: inv.domains.filter((domain) => workers.includes(domain.service)).map(({ id, hostname }) => ({ id, hostname })),
    workers,
    databases: inv.databases.filter((db) => names.test(db.name)),
    buckets: inv.buckets.filter((name) => names.test(name)),
    apps: apps ? inv.apps.filter((slug) => apps.test(slug)) : [],
  };
}

/**
 * The retired gate's leftovers, by kind and name, for the report.
 * @param {Inventory} inv
 * @returns {Array<{ kind: string, name: string }>}
 */
export function oldGateLeftovers(inv) {
  const named = (/** @type {string} */ kind, /** @type {string[]} */ names) => names.filter((n) => OLD_GATE_NAME.test(n)).map((name) => ({ kind, name }));
  return [
    ...named('repository', inv.repos.map((r) => r.name)),
    ...named('worker', inv.workers),
    ...named('database', inv.databases.map((d) => d.name)),
    ...named('bucket', inv.buckets),
    ...named('app', inv.apps),
  ];
}

/** @param {Targets} targets @returns {number} */
export const countTargets = (targets) =>
  targets.repos.length + targets.domains.length + targets.workers.length + targets.databases.length + targets.buckets.length + targets.apps.length;

/**
 * @typedef {object} Run
 * @property {Clients} clients the API clients
 * @property {() => Promise<string[]>} listApps lists the Apps through the settings page
 * @property {(slug: string) => Promise<'deleted' | 'absent'>} deleteApp deletes one App in the browser
 * @property {(line: string) => void} log prints a line and records it in the run directory
 * @property {() => number} [now] the clock for the probe names
 */

/**
 * Empty a bucket before its delete. An answer that cannot list is left to the bucket delete to
 * explain, which names a bucket that still holds objects.
 * @param {Clients} clients
 * @param {string} name the bucket
 */
async function emptyBucket({ cf, accountId }, name) {
  const base = `/accounts/${accountId}/r2/buckets/${name}/objects`;
  for (let round = 0; round < 100; round++) {
    const listed = await cf('GET', `${base}?per_page=1000`);
    const objects = listed.status === 200 && Array.isArray(listed.json?.result) ? listed.json.result : [];
    if (objects.length === 0) return;
    for (const object of objects) await cf('DELETE', `${base}/${encodeURIComponent(object.key)}`);
  }
}

/**
 * Cancel a repository's queued and in-progress Actions runs, so no deploy it started brings a Worker
 * back after the delete.
 * @param {Clients} clients
 * @param {{ owner: string, name: string }} repo
 * @returns {Promise<number>} how many runs it cancelled
 */
async function cancelRuns({ gh }, repo) {
  let cancelled = 0;
  for (const status of ['in_progress', 'queued']) {
    const answer = await gh('GET', `/repos/${repo.owner}/${repo.name}/actions/runs?status=${status}&per_page=100`);
    if (answer.status === 404) return cancelled;
    for (const run of ghBody(answer, `the ${repo.name} runs list`).workflow_runs ?? []) {
      const result = await gh('POST', `/repos/${repo.owner}/${repo.name}/actions/runs/${run.id}/cancel`);
      // 409 means the run finished first, which is as good as cancelled.
      if (result.status !== 202 && result.status !== 409) throw new Error(`cancelling a ${repo.name} run answered ${describe(result)}`);
      cancelled++;
    }
  }
  return cancelled;
}

/**
 * Delete targets in the order that keeps a deploy from bringing a Worker back: each repository
 * (its runs cancelled first), then the domains, Workers, databases, buckets, and Apps. A target
 * already gone is skipped, and one that fails is recorded while the rest go on.
 * @param {Targets} targets
 * @param {Run} run
 * @returns {Promise<string[]>} the targets that failed, each with its reason
 */
export async function deleteTargets(targets, { clients, deleteApp, log }) {
  const { cf, gh, accountId } = clients;
  /** @type {string[]} */
  const failed = [];
  /**
   * @param {string} label what is being deleted
   * @param {() => Promise<'deleted' | 'gone'>} step
   */
  const attempt = async (label, step) => {
    try {
      log(`${await step()}  ${label}`);
    } catch (error) {
      failed.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      log(`FAILED   ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  /**
   * @param {Answer} answer
   * @param {string} what
   * @returns {'deleted' | 'gone'}
   */
  const settled = (answer, what) => {
    if (answer.status === 404) return 'gone';
    if (answer.status >= 200 && answer.status < 300 && answer.json?.success !== false) return 'deleted';
    throw new Error(`${what} answered ${describe(answer)}`);
  };

  for (const repo of targets.repos) {
    await attempt(`repository ${repo.name}`, async () => {
      const cancelled = await cancelRuns(clients, repo);
      if (cancelled > 0) log(`cancelled ${cancelled} run(s) of ${repo.name}`);
      return settled(await gh('DELETE', `/repos/${repo.owner}/${repo.name}`), 'the repository delete');
    });
  }
  for (const domain of targets.domains) {
    await attempt(`custom domain ${domain.hostname}`, async () => settled(await cf('DELETE', `/accounts/${accountId}/workers/domains/${domain.id}`), 'the domain delete'));
  }
  for (const name of targets.workers) {
    await attempt(`worker ${name}`, async () => settled(await cf('DELETE', `/accounts/${accountId}/workers/scripts/${name}?force=true`), 'the Worker delete'));
  }
  for (const db of targets.databases) {
    await attempt(`database ${db.name}`, async () => settled(await cf('DELETE', `/accounts/${accountId}/d1/database/${db.uuid}`), 'the database delete'));
  }
  for (const name of targets.buckets) {
    await attempt(`bucket ${name}`, async () => {
      await emptyBucket(clients, name);
      return settled(await cf('DELETE', `/accounts/${accountId}/r2/buckets/${name}`), 'the bucket delete');
    });
  }
  for (const slug of targets.apps) {
    await attempt(`app ${slug}`, async () => ((await deleteApp(slug)) === 'absent' ? 'gone' : 'deleted'));
  }
  return failed;
}

/**
 * @param {Targets} targets
 * @param {(line: string) => void} log
 */
function printTargets(targets, log) {
  for (const repo of targets.repos) log(`delete repository ${repo.name}`);
  for (const domain of targets.domains) log(`delete custom domain ${domain.hostname}`);
  for (const name of targets.workers) log(`delete worker ${name}`);
  for (const db of targets.databases) log(`delete database ${db.name}`);
  for (const name of targets.buckets) log(`delete bucket ${name}`);
  for (const slug of targets.apps) log(`delete app ${slug}`);
}

/**
 * The sweep's dry run: list the delete list, the old gate's names, and any address record left.
 * @param {Run} run
 * @returns {Promise<number>} 0, or 1 when an address record remains that no listed domain explains
 */
export async function dryRun(run) {
  const { log } = run;
  const inv = await inventory(run.clients, run.listApps);
  const targets = select(inv, GATE_NAME, APP_NAME);
  printTargets(targets, log);
  const old = oldGateLeftovers(inv);
  log(`old gate (cairn-e2e-gate-) leftovers: ${old.length}`);
  for (const entry of old) log(`  old gate ${entry.kind} ${entry.name}`);
  // Cloudflare removes a custom domain's record with the domain, so a listed domain explains its record.
  const explained = new Set(targets.domains.map((domain) => domain.hostname));
  const left = inv.records.filter((record) => !explained.has(record.name));
  for (const record of left) log(`RECORD   ${record.type} ${record.name} -> ${record.content}`);
  log(`sweep: ${countTargets(targets)} target(s) to delete, ${old.length} old gate name(s), ${left.length} record(s) on the address`);
  return left.length > 0 ? 1 : 0;
}

/**
 * The sweep's apply: check the token, delete the delete list, then read the address records again.
 * @param {Run} run
 * @returns {Promise<number>} 0 when every target is gone and no address record remains
 */
export async function apply(run) {
  const { clients, log } = run;
  const verified = cfResult(await clients.cf('GET', `/accounts/${clients.accountId}/tokens/verify`), 'tokens/verify');
  if (verified.status !== 'active') throw new Error(`the cleanroom token is ${verified.status}, not active`);
  const inv = await inventory(clients, run.listApps);
  const targets = select(inv, GATE_NAME, APP_NAME);
  printTargets(targets, log);
  const failed = await deleteTargets(targets, run);
  const after = await inventory(clients, run.listApps);
  for (const record of after.records) log(`RECORD   ${record.type} ${record.name} -> ${record.content}`);
  log(`sweep: ${countTargets(targets)} target(s), ${failed.length} failed, ${after.records.length} record(s) left on the address`);
  return failed.length > 0 || after.records.length > 0 ? 1 : 0;
}

/**
 * Prove each permission group, naming one that is missing. Probe leftovers from an earlier run go
 * first. Each Cloudflare family then creates and deletes one `cairn-gate-probe-<time>` resource, a
 * family whose create is refused is reported and its delete never runs, and the Apps family is the
 * settings page listing with sudo passing.
 * @param {Run} run
 * @returns {Promise<number>} 0 when every group works
 */
export async function checkScopes(run) {
  const { clients, log } = run;
  const { cf, gh, accountId } = clients;
  const now = run.now ?? Date.now;
  /** @type {string[]} */
  const missing = [];
  /**
   * @param {string} family
   * @param {() => Promise<string>} step returns the detail; a throw names the family as missing
   * @returns {Promise<boolean>}
   */
  const family = async (family, step) => {
    try {
      log(`ok       ${family}: ${await step()}`);
      return true;
    } catch (error) {
      missing.push(family);
      log(`MISSING  ${family}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  const before = select(await inventory(clients, async () => [], { records: false }), PROBE_NAME, null);
  if (countTargets(before) > 0) log(`removing ${countTargets(before)} probe leftover(s)`);
  const leftovers = await deleteTargets(before, run);
  if (leftovers.length > 0) throw new Error(`a probe leftover would not delete: ${leftovers.join('; ')}`);

  const zoneId = await findZone(clients);
  const probe = `cairn-gate-probe-${now()}`;
  const hostname = `${probe}.${TEST_DOMAIN}`;
  const login = ghBody(await gh('GET', '/user'), 'GET /user').login;

  const workerUp = await family('Workers Scripts', async () => {
    const form = new FormData();
    form.set('metadata', JSON.stringify({ main_module: 'index.mjs', compatibility_date: '2025-01-01' }));
    form.set('index.mjs', new Blob(['export default { fetch() { return new Response("ok"); } };'], { type: 'application/javascript+module' }), 'index.mjs');
    cfResult(await cf('PUT', `/accounts/${accountId}/workers/scripts/${probe}`, form), 'the Worker create');
    return `created ${probe}`;
  });
  if (workerUp) {
    await family('Workers custom domain', async () => {
      const created = cfResult(
        await cf('PUT', `/accounts/${accountId}/workers/domains`, { hostname, service: probe, zone_id: zoneId, environment: 'production' }),
        'the custom domain create',
      );
      cfDeleted(await cf('DELETE', `/accounts/${accountId}/workers/domains/${created.id}`), 'the custom domain delete');
      return `created and deleted ${hostname}`;
    });
    await family('Workers Scripts delete', async () => {
      cfResult(await cf('DELETE', `/accounts/${accountId}/workers/scripts/${probe}?force=true`), 'the Worker delete');
      return `deleted ${probe}`;
    });
  } else {
    missing.push('Workers custom domain');
    log('MISSING  Workers custom domain: no probe Worker to bind it to');
  }
  await family('D1', async () => {
    const created = cfResult(await cf('POST', `/accounts/${accountId}/d1/database`, { name: probe }), 'the D1 create');
    cfResult(await cf('DELETE', `/accounts/${accountId}/d1/database/${created.uuid}`), 'the D1 delete');
    return `created and deleted ${probe}`;
  });
  await family('Workers R2 Storage', async () => {
    cfResult(await cf('POST', `/accounts/${accountId}/r2/buckets`, { name: probe }), 'the R2 create');
    await emptyBucket(clients, probe);
    cfResult(await cf('DELETE', `/accounts/${accountId}/r2/buckets/${probe}`), 'the R2 delete');
    return `created and deleted ${probe}`;
  });
  await family('GitHub repository', async () => {
    ghBody(await gh('POST', '/user/repos', { name: probe, private: true, auto_init: false }), 'the repository create');
    ghBody(await gh('DELETE', `/repos/${login}/${probe}`), 'the repository delete');
    return `created and deleted ${probe}`;
  });
  for (const read of groupReads(accountId, zoneId)) {
    if (['Workers Scripts', 'D1', 'Workers R2 Storage'].includes(read.group)) continue;
    await family(read.group, async () => {
      cfResult(await cf('GET', read.route), `the ${read.group} read`);
      return 'read answered';
    });
  }
  await family('GitHub Apps', async () => `settings page lists ${(await run.listApps()).length} App(s), sudo passed`);

  log(missing.length === 0 ? 'scopes: every group works' : `scopes: missing ${missing.join(', ')}`);
  return missing.length === 0 ? 0 : 1;
}

/**
 * Append a line to the run directory's sweep log, then print it.
 * @param {string} runDir the run directory
 * @param {(line: string) => void} [print] receives each line
 * @returns {(line: string) => void}
 */
export function runLogger(runDir, print = console.log) {
  return (line) => {
    appendFileSync(path.join(runDir, 'sweep.log'), `${new Date().toISOString()} ${line}\n`);
    print(line);
  };
}
