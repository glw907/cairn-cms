import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeCloudflare } from './fake-cloudflare.mjs';

/** Create a zone through the fake and return its parsed `result`. */
async function createZone(cloudflare, { name = 'testsite.example', accountId = 'acct-1' } = {}) {
  const res = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, account: { id: accountId } }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  return body.result;
}

test('zone create returns the v4 envelope and the captured zone shape, minus name_servers', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const zone = await createZone(cloudflare, { name: '907.life', accountId: '120c269ad6d3dfbe6d63a0bb53758ca0' });
  assert.equal(zone.name, '907.life');
  assert.equal(zone.account.id, '120c269ad6d3dfbe6d63a0bb53758ca0');
  assert.equal(zone.id.length, 32);
  assert.equal(zone.status, 'pending');
  // name_servers is deliberately absent from the create response (amendment 16: no real create
  // response was ever observed carrying it), so a caller must re-read the zone to get it.
  assert.equal('name_servers' in zone, false);
  assert.deepEqual(zone.original_name_servers, ['ns41.cloudns.net', 'ns42.cloudns.net', 'ns43.cloudns.net', 'ns44.cloudns.net']);
  assert.equal(zone.plan.name, 'Free Website');

  const reread = await fetch(`${cloudflare.apiBase}/zones/${zone.id}`);
  const rereadBody = await reread.json();
  assert.equal(rereadBody.result.name_servers.length, 2);
  assert.ok(rereadBody.result.name_servers.every((ns) => ns.endsWith('.ns.cloudflare.com')));
});

test('a created zone\'s status defaults to pending and can be overridden at startup', async (t) => {
  const defaultCloudflare = await startFakeCloudflare();
  t.after(() => defaultCloudflare.close());
  const pendingZone = await createZone(defaultCloudflare);
  assert.equal(pendingZone.status, 'pending');

  const initializingCloudflare = await startFakeCloudflare({ zoneStatus: 'initializing' });
  t.after(() => initializingCloudflare.close());
  const initializingZone = await createZone(initializingCloudflare);
  assert.equal(initializingZone.status, 'initializing');

  // The Cloudflare-registrar path (Addendum 2, carin-test.org): a zone can arrive already
  // active, with nothing to wait on.
  const activeCloudflare = await startFakeCloudflare({ zoneStatus: 'active' });
  t.after(() => activeCloudflare.close());
  const activeZone = await createZone(activeCloudflare);
  assert.equal(activeZone.status, 'active');
});

test('failNext reproduces the captured zone-already-exists body (1061), no ownership field', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('zone_create', 400, {
    success: false,
    errors: [{ code: 1061, message: 'ecxc.ski already exists' }],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'ecxc.ski', account: { id: 'acct-1' } }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.errors[0].code, 1061);
  assert.equal(body.errors[0].message, 'ecxc.ski already exists');
  assert.equal('account' in body.errors[0], false);
});

test('failNext reproduces the captured zone-hold body (1428)', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('zone_create', 400, {
    success: false,
    errors: [
      {
        code: 1428,
        message:
          'The zone name provided is subject to a hold which disallows the creation of this ' +
          'zone. Please contact the domain owner to have this hold removed.',
      },
    ],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'cloudflare.com', account: { id: 'acct-1' } }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.errors[0].code, 1428);
  assert.match(body.errors[0].message, /subject to a hold/);
});

test('failNext reproduces the domain-invalid body (1002)', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('zone_create', 400, {
    success: false,
    errors: [{ code: 1002, message: 'Invalid domain' }],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'not a domain', account: { id: 'acct-1' } }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.errors[0].code, 1002);
  assert.equal(body.errors[0].message, 'Invalid domain');
});

test('two created zones get different name_servers pairs, visible on re-read', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const first = await createZone(cloudflare, { name: 'one.example' });
  const second = await createZone(cloudflare, { name: 'two.example' });

  const firstReread = await (await fetch(`${cloudflare.apiBase}/zones/${first.id}`)).json();
  const secondReread = await (await fetch(`${cloudflare.apiBase}/zones/${second.id}`)).json();
  assert.notDeepEqual(firstReread.result.name_servers, secondReread.result.name_servers);
});

test('zone list filters by name and paginates with a real page 2', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  await createZone(cloudflare, { name: 'alpha.example' });
  await createZone(cloudflare, { name: 'beta.example' });
  await createZone(cloudflare, { name: 'gamma.example' });

  const filtered = await fetch(`${cloudflare.apiBase}/zones?name=beta.example`);
  const filteredBody = await filtered.json();
  assert.equal(filteredBody.result.length, 1);
  assert.equal(filteredBody.result[0].name, 'beta.example');

  const page1 = await fetch(`${cloudflare.apiBase}/zones?per_page=2&page=1`);
  const page1Body = await page1.json();
  assert.equal(page1Body.result.length, 2);
  assert.deepEqual(page1Body.result_info, { page: 1, per_page: 2, total_pages: 2, count: 2, total_count: 3 });

  const page2 = await fetch(`${cloudflare.apiBase}/zones?per_page=2&page=2`);
  const page2Body = await page2.json();
  assert.equal(page2Body.result.length, 1);
  assert.deepEqual(page2Body.result_info, { page: 2, per_page: 2, total_pages: 2, count: 1, total_count: 3 });
});

test('zone get fetches by id and 404s for an unknown id', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare);

  const found = await fetch(`${cloudflare.apiBase}/zones/${zone.id}`);
  assert.equal(found.status, 200);
  const foundBody = await found.json();
  assert.equal(foundBody.result.id, zone.id);

  const missing = await fetch(`${cloudflare.apiBase}/zones/does-not-exist`);
  assert.equal(missing.status, 404);
  const missingBody = await missing.json();
  assert.equal(missingBody.success, false);
});

test('a DNS record create carries MX priority into both the response and state', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare);

  const res = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/dns_records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'testsite.example', type: 'MX', content: 'aspmx.l.google.com', priority: 1, ttl: 3600 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.result.type, 'MX');
  assert.equal(body.result.content, 'aspmx.l.google.com');
  assert.equal(body.result.priority, 1);

  const stored = cloudflare.state.dnsRecords.get(zone.id);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].priority, 1);
  assert.equal(stored[0].content, 'aspmx.l.google.com');
});

test('DNS record list paginates and a create against an unknown zone 404s', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare);

  for (let i = 0; i < 3; i += 1) {
    await fetch(`${cloudflare.apiBase}/zones/${zone.id}/dns_records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: `record-${i}.testsite.example`, type: 'A', content: '192.0.2.1' }),
    });
  }

  const page1 = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/dns_records?per_page=2&page=1`);
  const page1Body = await page1.json();
  assert.equal(page1Body.result.length, 2);
  assert.equal(page1Body.result_info.total_pages, 2);

  const page2 = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/dns_records?per_page=2&page=2`);
  const page2Body = await page2.json();
  assert.equal(page2Body.result.length, 1);

  const unknownZone = await fetch(`${cloudflare.apiBase}/zones/does-not-exist/dns_records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x', type: 'A', content: '192.0.2.1' }),
  });
  assert.equal(unknownZone.status, 404);
});

test('a Workers Custom Domain attach is idempotent on hostname and lists back', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'testsite.example' });

  const first = await fetch(`${cloudflare.apiBase}/accounts/acct-1/workers/domains`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: 'testsite.example', zone_id: zone.id, service: 'testsite', environment: 'production' }),
  });
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.result.hostname, 'testsite.example');
  assert.equal(firstBody.result.zone_name, 'testsite.example');
  assert.equal(firstBody.result.enabled, true);

  const second = await fetch(`${cloudflare.apiBase}/accounts/acct-1/workers/domains`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: 'testsite.example', zone_id: zone.id, service: 'testsite', environment: 'production' }),
  });
  const secondBody = await second.json();
  assert.equal(secondBody.result.id, firstBody.result.id);
  assert.equal(cloudflare.state.customDomains.length, 1);

  const list = await fetch(`${cloudflare.apiBase}/accounts/acct-1/workers/domains`);
  const listBody = await list.json();
  assert.equal(listBody.result.length, 1);
  assert.equal(listBody.result[0].hostname, 'testsite.example');
});

test('failNext reproduces the captured insufficient-scope body on zone create', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('zone_create', 403, {
    success: false,
    errors: [
      {
        code: 0,
        message: 'Requires permission "com.cloudflare.api.account.zone.create" to create zones for the selected account',
      },
    ],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'testsite.example', account: { id: 'acct-1' } }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.errors[0].code, 0);
  assert.match(body.errors[0].message, /zone\.create/);

  // One-shot: the next call is unaffected.
  const after = await fetch(`${cloudflare.apiBase}/zones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'testsite.example', account: { id: 'acct-1' } }),
  });
  assert.equal(after.status, 200);
});

test('failNext reproduces the captured malformed-token body with its nested error_chain', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('zone_list', 400, {
    success: false,
    errors: [
      {
        code: 6003,
        message: 'Invalid request headers',
        error_chain: [{ code: 6111, message: 'Invalid format for Authorization header' }],
      },
    ],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones`);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.errors[0].code, 6003);
  assert.equal(body.errors[0].error_chain[0].code, 6111);
});

test('failNext can express success: false under HTTP 200, defensively', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  cloudflare.failNext('workers_domain_attach', 200, {
    success: false,
    errors: [{ code: 100, message: 'a hypothetical 200-with-failure body' }],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/accounts/acct-1/workers/domains`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: 'testsite.example', zone_id: 'zone-1', service: 'testsite' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, false);
});

test('requests logs every request in order, with method, path, and body', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const zone = await createZone(cloudflare, { name: 'testsite.example' });
  await fetch(`${cloudflare.apiBase}/zones/${zone.id}/dns_records`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'testsite.example', type: 'A', content: '192.0.2.1' }),
  });
  await fetch(`${cloudflare.apiBase}/accounts/acct-1/workers/domains`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: 'testsite.example', zone_id: zone.id, service: 'testsite' }),
  });

  assert.equal(cloudflare.requests.length, 3);
  assert.equal(cloudflare.requests[0].method, 'POST');
  assert.equal(cloudflare.requests[0].path, '/client/v4/zones');
  assert.equal(cloudflare.requests[0].body.name, 'testsite.example');
  assert.equal(cloudflare.requests[1].method, 'POST');
  assert.equal(cloudflare.requests[1].path, `/client/v4/zones/${zone.id}/dns_records`);
  assert.equal(cloudflare.requests[2].method, 'PUT');
  assert.equal(cloudflare.requests[2].path, '/client/v4/accounts/acct-1/workers/domains');
  assert.equal(cloudflare.requests[2].body.hostname, 'testsite.example');
});

test('close releases the port', async (t) => {
  const cloudflare = await startFakeCloudflare();
  const apiBase = cloudflare.apiBase;
  await cloudflare.close();

  await assert.rejects(() => fetch(`${apiBase}/zones`));
});
