// A fake Cloudflare, standing in for `api.cloudflare.com/client/v4` over plain HTTP on an
// ephemeral loopback port. It exists so chapter 2's zone-create, records-carry-over, and
// cutover tests run with no network call and no real Cloudflare token, while still exercising
// the exact response shapes (the v4 envelope, `result_info` pagination, Cloudflare's own error
// bodies) that would trip a naive client. Every test drives it through the returned `state` and
// `requests` rather than by asserting on the fake's internals, so a later task's carry-over test
// can assert a written record's `priority` survived, and a cutover test can assert the request
// order.
//
// Every response body below is copied verbatim from a real Cloudflare API call, captured on
// 2026-08-11 and recorded in `docs/internal/2026-08-11-t4a-domain-spike.md`. Nothing here is
// invented; where a shape was NOT observed, this file says so in the doc comment for that piece
// rather than guessing.
//
// Two things this fake does that the real platform does not, both deliberate test devices, both
// documented at the point they happen:
//
// 1. `name_servers` is a randomized pair PER ZONE. The real platform does not do this: a
//    Cloudflare account is assigned ONE nameserver pair, shared by every zone on that account
//    (verified this pass across nine zones on the estate account). A fixed pair here would let a
//    broken wrong-nameserver check pass, because there would be nothing for it to get wrong.
//    Randomizing per zone gives a wrong-nameserver test something real to fail against. Do not
//    "fix" this to match reality; that would silently disarm the test it exists for.
// 2. `success: false` under HTTP 200 is expressible through `failNext`, even though this pass's
//    spike never observed that shape live (every observed failure carried a matching non-2xx
//    status). The v4 envelope allows it, and the API seam must not treat HTTP 200 as success on
//    its own, so this fake supports it defensively rather than leaving it unreachable.
//
// Also NOT modeled, both flagged rather than guessed: the zone-already-exists body (error 1061)
// needs a credential this workstation does not have, so it is not captured and this fake does
// not invent one; `failNext` already lets a future test inject the real body once it exists, so
// nothing here needs to change. And a newly created zone's real birth `status` (`pending` vs
// `initializing`) is unverified; the default below is Cloudflare's documented value, not an
// observed one, and a caller can override it via `startFakeCloudflare({ zoneStatus })`.
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

/**
 * @typedef {object} FakeCloudflare
 * @property {string} apiBase the fake's base URL, `http://127.0.0.1:<port>/client/v4`
 * @property {object} state mutable fixture state, inspectable by tests: `state.zones` (array of
 *  zone objects), `state.dnsRecords` (a `Map` from zone id to its array of record objects, MX
 *  `priority` included), `state.customDomains` (array of Workers Custom Domain objects)
 * @property {Array<{ method: string, path: string, body: unknown }>} requests every request
 *  received, in arrival order; append-only, never reset except by starting a new server
 * @property {(route: string, status: number, body: unknown) => void} failNext arm a one-shot
 *  status/body override for the next request matching `route` (`zone_create`, `zone_list`,
 *  `zone_get`, `dns_record_create`, `dns_record_list`, `workers_domain_attach`,
 *  `workers_domain_list`)
 * @property {() => Promise<void>} close stop the server and release its port
 */

/**
 * Start the fake Cloudflare server.
 * @param {{ zoneStatus?: string }} [options] `zoneStatus` sets the `status` a newly created zone
 *  carries; defaults to `'pending'`, Cloudflare's documented value for a fresh zone (this pass's
 *  spike could not create a real zone to confirm it, so the default is documented rather than
 *  observed).
 * @returns {Promise<FakeCloudflare>} the running fake, ready for requests
 */
export async function startFakeCloudflare({ zoneStatus = 'pending' } = {}) {
  const requests = [];
  const failNextMap = new Map();
  const state = {
    zones: [],
    dnsRecords: new Map(),
    customDomains: [],
  };
  const counters = { nextRecordSeq: 1 };
  const assignedNameServerPairs = new Set();

  let dispatcher = (_req, res) => sendJson(res, 503, { message: 'fake-cloudflare: not ready yet' });
  const server = createServer((req, res) => dispatcher(req, res));

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const apiBase = `http://127.0.0.1:${server.address().port}/client/v4`;
  const ctx = { state, counters, zoneStatus, assignedNameServerPairs };

  dispatcher = makeHandler(
    [
      { method: 'POST', regex: compile('/client/v4/zones'), route: 'zone_create', handler: createZoneCreateHandler(ctx) },
      { method: 'GET', regex: compile('/client/v4/zones'), route: 'zone_list', handler: createZoneListHandler(ctx) },
      { method: 'GET', regex: compile('/client/v4/zones/:zoneId'), route: 'zone_get', handler: createZoneGetHandler(ctx) },
      {
        method: 'POST',
        regex: compile('/client/v4/zones/:zoneId/dns_records'),
        route: 'dns_record_create',
        handler: createDnsRecordCreateHandler(ctx),
      },
      {
        method: 'GET',
        regex: compile('/client/v4/zones/:zoneId/dns_records'),
        route: 'dns_record_list',
        handler: createDnsRecordListHandler(ctx),
      },
      {
        method: 'PUT',
        regex: compile('/client/v4/accounts/:accountId/workers/domains'),
        route: 'workers_domain_attach',
        handler: createWorkersDomainAttachHandler(ctx),
      },
      {
        method: 'GET',
        regex: compile('/client/v4/accounts/:accountId/workers/domains'),
        route: 'workers_domain_list',
        handler: createWorkersDomainListHandler(ctx),
      },
    ],
    { requests, failNextMap },
  );

  return {
    apiBase,
    state,
    requests,
    failNext(route, status, body) {
      failNextMap.set(route, { status, body });
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/**
 * Compile a `/foo/:bar/baz` path pattern into an anchored regex with named capture groups.
 * @param {string} pattern the path pattern; a `:name` segment becomes a `(?<name>[^/]+)` group
 * @returns {RegExp} the anchored regex
 */
function compile(pattern) {
  const source = pattern.replace(/:[^/]+/g, (token) => `(?<${token.slice(1)}>[^/]+)`);
  return new RegExp(`^${source}$`);
}

/**
 * Build a request listener that logs every request, matches it against a route table, decodes a
 * one-shot `failNext` override before the route's own handler ever runs, and reads and parses
 * the body for methods that carry one.
 * @param {Array<{ method: string, regex: RegExp, route: string, handler: Function }>} routes
 * @param {{ requests: unknown[], failNextMap: Map<string, { status: number, body: unknown }> }} shared
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>}
 */
function makeHandler(routes, { requests, failNextMap }) {
  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? '127.0.0.1'}`);

    let body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const raw = await readRawBody(req);
      body = parseJson(raw);
    }
    requests.push({ method: req.method, path: url.pathname + url.search, body });

    let match = null;
    let params = {};
    for (const candidate of routes) {
      if (candidate.method !== req.method) continue;
      const result = candidate.regex.exec(url.pathname);
      if (result) {
        match = candidate;
        params = result.groups ?? {};
        break;
      }
    }
    if (!match) {
      sendJson(res, 404, { success: false, errors: [{ code: 7003, message: 'Not found' }], messages: [], result: null });
      return;
    }

    const override = failNextMap.get(match.route);
    if (override) {
      failNextMap.delete(match.route);
      sendJson(res, override.status, override.body);
      return;
    }

    await match.handler(req, res, params, url, body);
  };
}

/** Buffer a request body to a UTF-8 string. Resolves with `''` for a bodyless request. */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Parse a request body as JSON, falling back to `{}` when empty or unparseable. */
function parseJson(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Write a JSON response with the given status. */
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Write a v4 success envelope: `{ result, success: true, errors: [], messages: [] }`. */
function sendSuccess(res, status, result, extra = {}) {
  sendJson(res, status, { result, success: true, errors: [], messages: [], ...extra });
}

/** A fake hex id of the given byte length, good enough to stand in for a Cloudflare resource id. */
function randomHexId(byteLength) {
  return randomBytes(byteLength).toString('hex');
}

// A pool of first names in Cloudflare's own nameserver naming convention
// (`<name>.ns.cloudflare.com`), sized so a per-zone random pair collides with a prior zone's pair
// only rarely; `pickNameServerPair` below still guards against even that.
const NAMESERVER_FIRST_NAMES = [
  'burt', 'carlane', 'elle', 'felix', 'gia', 'hank', 'ivy', 'jasper', 'kira', 'lior',
  'mira', 'noor', 'otto', 'piper', 'quinn', 'rosa', 'soren', 'tara', 'uma', 'vince',
];

/**
 * Pick a random, previously-unused two-hostname nameserver pair for a new zone. Guards against
 * collision with any pair already assigned in this fake's lifetime (tracked in
 * `ctx.assignedNameServerPairs`), so two zones created in the same test are guaranteed distinct
 * even though the pool is drawn randomly, not exhaustively.
 * @param {{ assignedNameServerPairs: Set<string> }} ctx
 * @returns {string[]} two `<name>.ns.cloudflare.com` hostnames
 */
function pickNameServerPair(ctx) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const shuffled = [...NAMESERVER_FIRST_NAMES].sort(() => Math.random() - 0.5);
    const pair = [shuffled[0], shuffled[1]].sort();
    const key = pair.join(',');
    if (!ctx.assignedNameServerPairs.has(key)) {
      ctx.assignedNameServerPairs.add(key);
      return pair.map((name) => `${name}.ns.cloudflare.com`);
    }
  }
  // Pool exhausted or extraordinarily unlucky; fall back to a pair Cloudflare would never assign
  // on its own account naming, so a stray collision still looks obviously synthetic.
  return [`fallback-${randomHexId(2)}.ns.cloudflare.com`, `fallback-${randomHexId(2)}.ns.cloudflare.com`];
}

/**
 * Build a zone object shaped exactly like a real Cloudflare zone (captured 2026-08-11 from
 * `GET /zones?per_page=2&page=1`), with `id`, `name`, `account.id`, `name_servers`, `status`,
 * and the timestamps varying per zone; everything else is the fixed shape observed live.
 * @param {{ name: string, accountId: string, status: string, nameServers: string[] }} fields
 * @returns {object} a zone object
 */
function buildZone({ name, accountId, status, nameServers }) {
  const now = new Date().toISOString();
  return {
    id: randomHexId(16),
    name,
    status,
    paused: false,
    type: 'full',
    development_mode: 0,
    name_servers: nameServers,
    original_name_servers: ['ns41.cloudns.net', 'ns42.cloudns.net', 'ns43.cloudns.net', 'ns44.cloudns.net'],
    original_registrar: 'pdr ltd. d/b/a publicdomainreg (id: 303)',
    original_dnshost: null,
    modified_on: now,
    created_on: now,
    activated_on: now,
    vanity_name_servers: [],
    vanity_name_servers_ips: null,
    meta: { step: 2, custom_certificate_quota: 0, page_rule_quota: 3, phishing_detected: false },
    owner: { id: null, type: 'user', email: null },
    account: { id: accountId, name: 'glw907' },
    tenant: { id: null, name: null },
    tenant_unit: { id: null },
    permissions: ['#zone:read', '#zone_settings:read', '#worker:edit', '#worker:read', '#dns_records:edit', '#dns_records:read'],
    plan: {
      id: '0feeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      name: 'Free Website',
      price: 0,
      currency: 'USD',
      frequency: '',
      is_subscribed: false,
      can_subscribe: false,
      legacy_id: 'free',
      legacy_discount: false,
      externally_managed: false,
    },
  };
}

/** Paginate `items` per `url`'s `page`/`per_page` query params, defaulting to page 1 of 20. */
function paginate(items, url) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const perPage = Math.max(1, Number(url.searchParams.get('per_page')) || 20);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);
  const resultInfo = {
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(items.length / perPage)),
    count: pageItems.length,
    total_count: items.length,
  };
  return { pageItems, resultInfo };
}

// --- route handlers ----------------------------------------------------------------------

function createZoneCreateHandler(ctx) {
  return async (_req, res, _params, _url, body) => {
    const name = body?.name ?? 'example.com';
    const accountId = body?.account?.id ?? 'fake-account-id';
    const nameServers = pickNameServerPair(ctx);
    const zone = buildZone({ name, accountId, status: ctx.zoneStatus, nameServers });
    ctx.state.zones.push(zone);
    ctx.state.dnsRecords.set(zone.id, []);
    sendSuccess(res, 200, zone);
  };
}

function createZoneListHandler(ctx) {
  return async (_req, res, _params, url) => {
    const nameFilter = url.searchParams.get('name');
    const filtered = nameFilter ? ctx.state.zones.filter((zone) => zone.name === nameFilter) : ctx.state.zones;
    const { pageItems, resultInfo } = paginate(filtered, url);
    sendSuccess(res, 200, pageItems, { result_info: resultInfo });
  };
}

function createZoneGetHandler(ctx) {
  return async (_req, res, params) => {
    const zone = ctx.state.zones.find((candidate) => candidate.id === params.zoneId);
    if (!zone) {
      sendJson(res, 404, { success: false, errors: [{ code: 1001, message: 'Zone not found' }], messages: [], result: null });
      return;
    }
    sendSuccess(res, 200, zone);
  };
}

/**
 * Build a DNS record object shaped like the fixture captured 2026-08-11 from
 * `GET /zones/:id/dns_records?per_page=3`. MX carries `priority` as a sibling of `content`,
 * echoed straight from the request body into both the response and `state`, because a later
 * carry-over test asserts it survives intact.
 */
function createDnsRecordCreateHandler(ctx) {
  return async (_req, res, params, _url, body) => {
    const zoneId = params.zoneId;
    if (!ctx.state.dnsRecords.has(zoneId)) {
      sendJson(res, 404, { success: false, errors: [{ code: 1001, message: 'Zone not found' }], messages: [], result: null });
      return;
    }
    const now = new Date().toISOString();
    const type = body?.type ?? 'A';
    const record = {
      id: randomHexId(16),
      name: body?.name ?? '',
      type,
      content: body?.content ?? '',
      proxiable: ['A', 'AAAA', 'CNAME'].includes(type),
      proxied: body?.proxied ?? false,
      ttl: body?.ttl ?? 1,
      settings: body?.settings ?? {},
      meta: {},
      comment: body?.comment ?? null,
      tags: body?.tags ?? [],
      created_on: now,
      modified_on: now,
    };
    // priority is a sibling of content, and only meaningful (and only sent by a real caller) on
    // MX and a handful of other prioritized types; carry it through only when present so a
    // non-MX record's shape stays clean.
    if (body?.priority !== undefined) record.priority = body.priority;
    if (type === 'CAA' && body?.data !== undefined) record.data = body.data;
    ctx.state.dnsRecords.get(zoneId).push(record);
    ctx.counters.nextRecordSeq += 1;
    sendSuccess(res, 200, record);
  };
}

function createDnsRecordListHandler(ctx) {
  return async (_req, res, params, url) => {
    const records = ctx.state.dnsRecords.get(params.zoneId);
    if (!records) {
      sendJson(res, 404, { success: false, errors: [{ code: 1001, message: 'Zone not found' }], messages: [], result: null });
      return;
    }
    const { pageItems, resultInfo } = paginate(records, url);
    sendSuccess(res, 200, pageItems, { result_info: resultInfo });
  };
}

/**
 * Build the `PUT /accounts/:id/workers/domains` handler. A second attach for the same
 * `hostname` updates the existing entry in place (Cloudflare's own attach call is idempotent on
 * hostname), rather than growing a duplicate; the response shape matches the fixture captured
 * 2026-08-11 from `GET /accounts/:id/workers/domains`.
 */
function createWorkersDomainAttachHandler(ctx) {
  return async (_req, res, _params, _url, body) => {
    const hostname = body?.hostname ?? '';
    const zone = ctx.state.zones.find((candidate) => candidate.id === body?.zone_id);
    const existing = ctx.state.customDomains.find((candidate) => candidate.hostname === hostname);
    const domain = existing ?? {
      id: randomHexId(20),
      cert_id: randomUUID(),
    };
    domain.zone_id = body?.zone_id ?? domain.zone_id ?? '';
    domain.zone_name = zone?.name ?? domain.zone_name ?? '';
    domain.hostname = hostname;
    domain.service = body?.service ?? '';
    domain.environment = body?.environment ?? 'production';
    domain.previews_enabled = body?.previews_enabled ?? false;
    domain.enabled = true;
    if (!existing) ctx.state.customDomains.push(domain);
    sendSuccess(res, 200, domain);
  };
}

function createWorkersDomainListHandler(ctx) {
  return async (_req, res, _params, url) => {
    const { pageItems, resultInfo } = paginate(ctx.state.customDomains, url);
    sendSuccess(res, 200, pageItems, { result_info: resultInfo });
  };
}
