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

// --- Email Sending routes ------------------------------------------------------------------
// Every fixture below is pasted independently from the captured bodies in
// docs/internal/2026-08-11-t4b-email-spike.md ("Appendix: the captured bodies, verbatim"),
// rather than imported from fake-cloudflare.mjs, so a drift in the implementation's own copy (a
// dropped field, a retyped value) fails this suite instead of passing silently.

const CAPTURED_SUBDOMAIN_CREATE_BODY = {
  id: 'fcf72bf1ef26439884d8110a1825e142',
  tag: 'fcf72bf1ef26439884d8110a1825e142',
  name: 'carin-test.org',
  enabled: true,
  preview_enabled: true,
  return_path_domain: 'cf-bounce.carin-test.org',
  dkim_selector: 'cf-bounce',
  created: '2026-08-12T08:12:02.593597Z',
  modified: '2026-08-12T08:12:02.593597Z',
};

// The `ecxc.ski` entry, captured for its `preview_enabled: false` (amendment 4: the field is not
// a constant), used to seed state for the pagination and non-constant tests below.
const CAPTURED_ECXC_SUBDOMAIN = {
  id: '02b29178254d48fab3a5a85b38f56126',
  tag: '02b29178254d48fab3a5a85b38f56126',
  name: 'ecxc.ski',
  enabled: true,
  preview_enabled: false,
  return_path_domain: 'cf-bounce.ecxc.ski',
  dkim_selector: 'cf-bounce',
  created: '2026-06-09T06:26:41.226901Z',
  modified: '2026-06-09T06:26:41.226901Z',
};

const CAPTURED_SEND_SUCCESS_RESULT = {
  message_id: '<lQGT3PVeEuGfGBb7ykKdFeEdh7ztvmGEchGM@carin-test.org>',
  delivered: [],
  queued: [],
  permanent_bounces: [],
};

// The send refusal, HTTP 403: byte-identical for a never-onboarded domain and one still
// propagating (spike amendment 2), so the fixture stands in for both conditions.
const CAPTURED_SEND_REFUSED_BODY = {
  success: false,
  errors: [{ code: 10203, message: 'email.sending.error.email.sending_disabled' }],
  messages: [],
  result: null,
};

test('creating a sending subdomain reproduces the captured body byte-for-byte', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });

  const res = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'carin-test.org' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.result, CAPTURED_SUBDOMAIN_CREATE_BODY);
});

test('the subdomain list is empty before any create, and shows the created entry right after', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });

  const empty = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`);
  const emptyBody = await empty.json();
  assert.deepEqual(emptyBody.result, []);

  await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'carin-test.org' }),
  });

  const after = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`);
  const afterBody = await after.json();
  assert.equal(afterBody.result.length, 1);
  assert.deepEqual(afterBody.result[0], CAPTURED_SUBDOMAIN_CREATE_BODY);
});

test('the subdomain list paginates like every other list route', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });

  cloudflare.state.emailSubdomains.set(zone.id, [
    { ...CAPTURED_SUBDOMAIN_CREATE_BODY, id: 'sub-1', name: 'one.example' },
    { ...CAPTURED_SUBDOMAIN_CREATE_BODY, id: 'sub-2', name: 'two.example' },
    { ...CAPTURED_ECXC_SUBDOMAIN },
  ]);

  const page1 = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains?per_page=2&page=1`);
  const page1Body = await page1.json();
  assert.equal(page1Body.result.length, 2);
  assert.deepEqual(page1Body.result_info, { page: 1, per_page: 2, total_pages: 2, count: 2, total_count: 3 });

  const page2 = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains?per_page=2&page=2`);
  const page2Body = await page2.json();
  assert.equal(page2Body.result.length, 1);
  assert.equal(page2Body.result[0].name, 'ecxc.ski');
});

test('preview_enabled is not forced to a constant: a seeded entry keeps its own value', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'ecxc.ski' });
  cloudflare.state.emailSubdomains.set(zone.id, [{ ...CAPTURED_ECXC_SUBDOMAIN }]);

  const res = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`);
  const body = await res.json();
  assert.equal(body.result[0].preview_enabled, false);
});

test('a subdomain create against an unknown zone 404s', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const res = await fetch(`${cloudflare.apiBase}/zones/does-not-exist/email/sending/subdomains`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'carin-test.org' }),
  });
  assert.equal(res.status, 404);
});

test('a send succeeds with the captured message-id and empty delivery arrays', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());

  const res = await fetch(`${cloudflare.apiBase}/accounts/acct-1/email/sending/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.result, CAPTURED_SEND_SUCCESS_RESULT);
});

test('failNext reproduces the captured sending-disabled refusal on send, HTTP 403', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  cloudflare.failNext('email_send', 403, CAPTURED_SEND_REFUSED_BODY);

  const res = await fetch(`${cloudflare.apiBase}/accounts/acct-1/email/sending/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.deepEqual(body, CAPTURED_SEND_REFUSED_BODY);

  // One-shot: the next send is unaffected, matching every other failNext route.
  const after = await fetch(`${cloudflare.apiBase}/accounts/acct-1/email/sending/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
  });
  assert.equal(after.status, 200);
});

test('failNext reproduces the same refusal on a create, for the propagation-park path', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });
  cloudflare.failNext('email_subdomain_create', 403, CAPTURED_SEND_REFUSED_BODY);

  const res = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'carin-test.org' }),
  });
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.errors[0].code, 10203);
});

test('failNext scripts a refusal on the list route too, a mechanic Tasks 4 and 5 can drive', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });
  // No entitlement-refusal body on GET was ever observed live (spike amendment 8); this is a
  // synthetic body proving the failNext mechanic reaches this route, not a captured shape.
  cloudflare.failNext('email_subdomain_list', 403, {
    success: false,
    errors: [{ code: 9109, message: 'synthetic: not entitled to view this resource' }],
    messages: [],
    result: null,
  });

  const res = await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`);
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.errors[0].code, 9109);
});

test('a list-only call issues no create, provable through the request log', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });

  await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`);

  const emailRequests = cloudflare.requests.filter((request) => request.path.includes('/email/sending/subdomains'));
  assert.equal(emailRequests.length, 1);
  assert.equal(emailRequests[0].method, 'GET');
});

test('requests logs the send route with its body, alongside the subdomain routes', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  const zone = await createZone(cloudflare, { name: 'carin-test.org' });

  await fetch(`${cloudflare.apiBase}/zones/${zone.id}/email/sending/subdomains`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'carin-test.org' }),
  });
  await fetch(`${cloudflare.apiBase}/accounts/acct-1/email/sending/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
  });

  const createRequest = cloudflare.requests.find(
    (request) => request.path.endsWith('/email/sending/subdomains') && request.method === 'POST',
  );
  assert.equal(createRequest.body.name, 'carin-test.org');
  const sendRequest = cloudflare.requests.find((request) => request.path.endsWith('/email/sending/send'));
  assert.equal(sendRequest.body.to, 'owner@example.com');
});
