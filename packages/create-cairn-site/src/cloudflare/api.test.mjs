import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi, redactToken, sendErrorInfo, SENDING_DISABLED_CODE } from './api.mjs';

/**
 * The send refusal captured live 2026-08-12 (docs/internal/2026-08-11-t4b-email-spike.md). The
 * same body comes back for a domain that was never onboarded and for one whose records are still
 * settling, which is why the seam does not try to tell them apart.
 */
const SEND_REFUSED_BODY = {
  success: false,
  errors: [{ code: 10203, message: 'email.sending.error.email.sending_disabled' }],
  messages: [],
  result: null,
};

/**
 * Start a fake Cloudflare, point CAIRN_CLOUDFLARE_API_BASE at it, and build a `makeApi` client
 * against it. `t.after` tears both down; the caller never has to remember cleanup.
 * @param {import('node:test').TestContext} t
 * @param {object} [apiOverrides] extra `makeApi` options (a fixed `token`, an injected `sleep`)
 * @returns {Promise<{ cloudflare: import('../../test/fake-cloudflare.mjs').FakeCloudflare, api: ReturnType<typeof makeApi> }>}
 */
async function setup(t, apiOverrides = {}) {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir: '/tmp/site', ...apiOverrides });
  return { cloudflare, api };
}

// --- success paths ------------------------------------------------------------------------

test('createZone returns the parsed zone from the v4 envelope', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  assert.equal(zone.name, 'testsite.example');
  assert.equal(zone.account.id, 'acct-1');
  assert.equal(zone.status, 'pending');
});

test('getZone fetches the zone by id', async (t) => {
  const { api } = await setup(t);
  const created = await api.createZone('testsite.example');
  const fetched = await api.getZone(created.id);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.name, 'testsite.example');
});

test('listZones filters by name', async (t) => {
  const { api } = await setup(t);
  await api.createZone('alpha.example');
  await api.createZone('beta.example');
  const filtered = await api.listZones({ name: 'beta.example' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'beta.example');
});

test('listZones traverses pagination and returns every zone across pages', async (t) => {
  const { api } = await setup(t);
  for (let i = 0; i < 21; i += 1) {
    await api.createZone(`zone-${i}.example`);
  }
  const all = await api.listZones();
  assert.equal(all.length, 21);
  assert.equal(new Set(all.map((zone) => zone.name)).size, 21);
});

test('createDnsRecord carries MX priority as a sibling of content', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  const record = await api.createDnsRecord(zone.id, {
    type: 'MX',
    name: 'testsite.example',
    content: 'aspmx.l.google.com',
    priority: 1,
    ttl: 3600,
  });
  assert.equal(record.type, 'MX');
  assert.equal(record.priority, 1);
  assert.equal(record.content, 'aspmx.l.google.com');
});

test('listDnsRecords traverses pagination and returns every record across pages', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  for (let i = 0; i < 21; i += 1) {
    await api.createDnsRecord(zone.id, { type: 'A', name: `r${i}.testsite.example`, content: '192.0.2.1' });
  }
  const all = await api.listDnsRecords(zone.id);
  assert.equal(all.length, 21);
});

test('attachCustomDomain returns the parsed custom domain', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  const domain = await api.attachCustomDomain({
    hostname: 'testsite.example',
    zoneId: zone.id,
    service: 'testsite',
    environment: 'production',
  });
  assert.equal(domain.hostname, 'testsite.example');
  assert.equal(domain.zone_id, zone.id);
  assert.equal(domain.enabled, true);
});

test('listCustomDomains returns every attached domain', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  await api.attachCustomDomain({ hostname: 'testsite.example', zoneId: zone.id, service: 'testsite', environment: 'production' });
  await api.attachCustomDomain({ hostname: 'other.example', zoneId: zone.id, service: 'other', environment: 'production' });
  const domains = await api.listCustomDomains();
  assert.equal(domains.length, 2);
  assert.deepEqual(domains.map((d) => d.hostname).sort(), ['other.example', 'testsite.example']);
});

test('the base URL is read from the env at call time, not cached at import', async (t) => {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir: '/tmp/site' });
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const zone = await api.createZone('late-env.example');
  assert.equal(zone.name, 'late-env.example');
});

// --- error mapping -------------------------------------------------------------------------

test('a 403 maps to token-scope-missing and extracts the permission from the message', async (t) => {
  const { cloudflare, api } = await setup(t);
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

  await assert.rejects(
    () => api.createZone('testsite.example'),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      assert.match(err.message, /com\.cloudflare\.api\.account\.zone\.create/);
      return true;
    },
  );
});

test('a 403 with no extractable permission still maps to token-scope-missing generically', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('zone_list', 403, {
    success: false,
    errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.listZones(),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      assert.doesNotMatch(err.message, /permission "/);
      return true;
    },
  );
});

test('a 400 with code 6003 maps to token-invalid and surfaces the nested error_chain detail', async (t) => {
  const { cloudflare, api } = await setup(t);
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

  await assert.rejects(
    () => api.listZones(),
    (err) => {
      assert.equal(err.catalogue.code, 'token-invalid');
      assert.match(err.message, /Invalid format for Authorization header/);
      return true;
    },
  );
});

test('a 401 with code 10000 maps to token-invalid', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('zone_get', 401, {
    success: false,
    errors: [{ code: 10000, message: 'Invalid API Token' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.getZone('some-id'),
    (err) => {
      assert.equal(err.catalogue.code, 'token-invalid');
      return true;
    },
  );
});

test('success: false under HTTP 200 is treated as a failure, not a success', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('workers_domain_attach', 200, {
    success: false,
    errors: [{ code: 100, message: 'a hypothetical 200-with-failure body' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.attachCustomDomain({ hostname: 'testsite.example', zoneId: zone.id, service: 'testsite', environment: 'production' }),
    (err) => {
      assert.equal(err.catalogue.code, 'custom-domain-failed');
      assert.match(err.message, /200-with-failure body/);
      return true;
    },
  );
});

test('anything else unmapped falls through to the operation\'s own row with the API message as detail', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('zone_create', 500, {
    success: false,
    errors: [{ code: 1000, message: 'internal error, try again' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.createZone('testsite.example'),
    (err) => {
      assert.equal(err.catalogue.code, 'zone-create-failed');
      assert.match(err.message, /internal error, try again/);
      return true;
    },
  );
});

test('a DNS-record failure reports through its own row, not the zone row', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('dns_record_create', 500, {
    success: false,
    errors: [{ code: 1000, message: 'internal error, try again' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.createDnsRecord(zone.id, { type: 'MX', name: 'testsite.example', content: 'mx.example', priority: 10 }),
    (err) => {
      // The distinction is the whole point of the separate row: a half-written carry-over is a
      // different situation from a zone that never got created, and the admin reads the copy.
      assert.equal(err.catalogue.code, 'dns-record-failed');
      assert.match(err.message, /Copying your DNS records/);
      assert.doesNotMatch(err.message, /Creating the Cloudflare zone/);
      return true;
    },
  );
});

// --- 429 handling --------------------------------------------------------------------------

test('a 429 on a GET waits out Retry-After once via the injected sleep, then succeeds', async (t) => {
  const sleepCalls = [];
  const { cloudflare, api } = await setup(t, {
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
  });

  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('zone_get', 429, {
    success: false,
    errors: [{ code: 10013, message: 'Rate limited' }],
    messages: [],
    result: null,
  });

  const fetched = await api.getZone(zone.id);
  assert.equal(fetched.id, zone.id);
  assert.equal(sleepCalls.length, 1);

  const getRequests = cloudflare.requests.filter((r) => r.method === 'GET' && r.path === `/client/v4/zones/${zone.id}`);
  assert.equal(getRequests.length, 2);
});

test('a second consecutive 429 on a GET reports rather than looping', async (t) => {
  const rateLimited = { success: false, errors: [{ code: 10013, message: 'Rate limited' }], messages: [], result: null };
  let sleepCallCount = 0;
  const { cloudflare, api } = await setup(t, {
    // Re-arms the SAME one-shot override from inside the injected sleep, so the retried
    // request also comes back 429. This proves the seam does not loop past a single retry,
    // and keeps the test fast since the injected sleep never really waits. `cloudflare` is
    // only read once this sleep actually runs, well after the destructuring above assigns it.
    sleep: async () => {
      sleepCallCount += 1;
      cloudflare.failNext('zone_get', 429, rateLimited);
    },
  });

  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('zone_get', 429, rateLimited);

  await assert.rejects(
    () => api.getZone(zone.id),
    (err) => {
      assert.equal(err.catalogue.code, 'zone-create-failed');
      return true;
    },
  );
  assert.equal(sleepCallCount, 1);

  const getRequests = cloudflare.requests.filter((r) => r.method === 'GET' && r.path === `/client/v4/zones/${zone.id}`);
  assert.equal(getRequests.length, 2);
});

// --- the no-second-write rule ----------------------------------------------------------------

test('a failed POST is reported to the caller and never retried', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('dns_record_create', 500, {
    success: false,
    errors: [{ code: 1000, message: 'internal error' }],
    messages: [],
    result: null,
  });

  await assert.rejects(() => api.createDnsRecord(zone.id, { type: 'A', name: 'testsite.example', content: '192.0.2.1' }));

  const dnsCreateRequests = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path === `/client/v4/zones/${zone.id}/dns_records`,
  );
  assert.equal(dnsCreateRequests.length, 1);
});

// --- redaction -------------------------------------------------------------------------------

test('redactToken scrubs every occurrence of the token from a message', () => {
  const scrubbed = redactToken('token abc123-SECRET here, abc123-SECRET twice', 'abc123-SECRET');
  assert.equal(scrubbed, 'token [redacted] here, [redacted] twice');
  assert.doesNotMatch(scrubbed, /abc123-SECRET/);
});

// --- Email Sending routes ---------------------------------------------------------------------

test('listSendingSubdomains traverses pagination and returns every entry across pages', async (t) => {
  const { api } = await setup(t);
  const zone = await api.createZone('carin-test.org');
  for (let i = 0; i < 21; i += 1) {
    await api.createSendingSubdomain(zone.id, `sub-${i}.carin-test.org`);
  }

  const all = await api.listSendingSubdomains(zone.id);
  assert.equal(all.length, 21);
  assert.equal(new Set(all.map((entry) => entry.name)).size, 21);
});

test('createSendingSubdomain posts the apex name and returns the captured, already-enabled entry', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');

  const created = await api.createSendingSubdomain(zone.id, 'carin-test.org');
  assert.equal(created.name, 'carin-test.org');
  assert.equal(created.enabled, true);
  assert.equal(created.return_path_domain, 'cf-bounce.carin-test.org');
  assert.equal(created.dkim_selector, 'cf-bounce');

  const posts = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path === `/client/v4/zones/${zone.id}/email/sending/subdomains`,
  );
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body, { name: 'carin-test.org' });
});

test('sendMessage posts from, to, subject and text, and resolves with nothing on success', async (t) => {
  const { cloudflare, api } = await setup(t);

  const resolved = await api.sendMessage({
    from: 'no-reply@carin-test.org',
    to: 'owner@example.com',
    subject: 'Sign in to your site',
    text: 'Your sign-in link is inside.',
  });
  assert.equal(resolved, undefined);

  const sends = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path === '/client/v4/accounts/acct-1/email/sending/send',
  );
  assert.equal(sends.length, 1);
  assert.deepEqual(sends[0].body, {
    from: 'no-reply@carin-test.org',
    to: 'owner@example.com',
    subject: 'Sign in to your site',
    text: 'Your sign-in link is inside.',
  });
});

test('a 429 on the subdomain create is reported rather than retried, since retrying is GET-only', async (t) => {
  const sleepCalls = [];
  const { cloudflare, api } = await setup(t, {
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
  });
  const zone = await api.createZone('carin-test.org');
  cloudflare.failNext('email_subdomain_create', 429, {
    success: false,
    errors: [{ code: 10013, message: 'Rate limited' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.createSendingSubdomain(zone.id, 'carin-test.org'),
    (err) => {
      assert.equal(err.catalogue.code, 'email-onboarding-failed');
      return true;
    },
  );

  assert.equal(sleepCalls.length, 0);
  const posts = cloudflare.requests.filter(
    (r) => r.method === 'POST' && r.path === `/client/v4/zones/${zone.id}/email/sending/subdomains`,
  );
  assert.equal(posts.length, 1);
});

test('a send refused with 10203 reports the send row, and sendErrorInfo reads the code and the dotted identifier', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);

  await assert.rejects(
    () => api.sendMessage({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-send-failed');
      assert.match(err.message, /email\.sending\.error\.email\.sending_disabled/);
      assert.equal(err.api.code, SENDING_DISABLED_CODE);
      return true;
    },
  );

  const info = sendErrorInfo(SEND_REFUSED_BODY);
  assert.equal(info.code, SENDING_DISABLED_CODE);
  assert.equal(info.code, 10203);
  assert.equal(info.id, 'email.sending.error.email.sending_disabled');
});

test('sendErrorInfo reports nothing for an envelope carrying no errors', () => {
  const info = sendErrorInfo({ success: false, errors: [], messages: [], result: null });
  assert.equal(info.code, undefined);
  assert.equal(info.id, undefined);
  assert.equal(sendErrorInfo(null).code, undefined);
});

test('an entitlement refusal maps to paid-plan-missing, keyed on wording because the condition was never observed live', async (t) => {
  // The account this was built against is on Workers Paid (spike Step 2), so no plan-less refusal
  // could be captured and no numeric code for it is known. Both wordings below are plausible
  // shapes, not captures: Cloudflare's prose and its dotted-identifier style.
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');

  cloudflare.failNext('email_subdomain_create', 403, {
    success: false,
    errors: [{ code: 10000, message: 'Email Sending requires the Workers Paid plan on this account' }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.createSendingSubdomain(zone.id, 'carin-test.org'),
    (err) => {
      assert.equal(err.catalogue.code, 'paid-plan-missing');
      assert.match(err.message, /Workers Paid plan/);
      return true;
    },
  );

  cloudflare.failNext('email_send', 403, {
    success: false,
    errors: [{ code: 10000, message: 'email.sending.error.paid_plan_required' }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.sendMessage({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
    (err) => {
      assert.equal(err.catalogue.code, 'paid-plan-missing');
      return true;
    },
  );
});

test('an unmapped email failure falls through to its own operation row with Cloudflare\'s message as detail', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');

  cloudflare.failNext('email_subdomain_create', 500, {
    success: false,
    errors: [{ code: 1000, message: 'internal error, try again' }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.createSendingSubdomain(zone.id, 'carin-test.org'),
    (err) => {
      assert.equal(err.catalogue.code, 'email-onboarding-failed');
      assert.match(err.message, /internal error, try again/);
      return true;
    },
  );

  cloudflare.failNext('email_send', 500, {
    success: false,
    errors: [{ code: 1000, message: 'internal error, try again' }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.sendMessage({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-send-failed');
      assert.match(err.message, /internal error, try again/);
      return true;
    },
  );
});

test('a 403 on an email route is read from its body, while a 403 on any other route still maps to token-scope-missing', async (t) => {
  const { cloudflare, api } = await setup(t);

  // The email side: the send's own refusal is a 403, so the blanket token rule would otherwise
  // tell an owner whose DNS is still settling that their token is underscoped.
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);
  await assert.rejects(
    () => api.sendMessage({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-send-failed');
      assert.notEqual(err.catalogue.code, 'token-scope-missing');
      return true;
    },
  );

  // Every other route keeps the blanket rule, so a genuinely underscoped token still lands there.
  cloudflare.failNext('zone_list', 403, {
    success: false,
    errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.listZones(),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      return true;
    },
  );
});

test('a planted token echoed in an email failure body is redacted from every email row', async (t) => {
  const plantedToken = 'plant-8c41d0e9a75b2f36';
  const { cloudflare, api } = await setup(t, { token: plantedToken });
  const zone = await api.createZone('carin-test.org');

  cloudflare.failNext('email_subdomain_create', 500, {
    success: false,
    errors: [{ code: 1000, message: `Internal error while using token ${plantedToken} to onboard the domain` }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.createSendingSubdomain(zone.id, 'carin-test.org'),
    (err) => {
      assert.doesNotMatch(err.message, new RegExp(plantedToken));
      assert.match(err.message, /\[redacted\]/);
      return true;
    },
  );

  cloudflare.failNext('email_send', 403, {
    success: false,
    errors: [{ code: 10203, message: `email.sending.error.email.sending_disabled (token ${plantedToken})` }],
    messages: [],
    result: null,
  });
  await assert.rejects(
    () => api.sendMessage({ from: 'no-reply@carin-test.org', to: 'owner@example.com', subject: 'Sign in', text: 'link' }),
    (err) => {
      assert.doesNotMatch(err.message, new RegExp(plantedToken));
      assert.match(err.message, /\[redacted\]/);
      return true;
    },
  );
});

test('a planted token-shaped value echoed in an upstream error body is redacted from the thrown error', async (t) => {
  const plantedToken = 'plant-3f9a7c2b1e6d4058';
  const { cloudflare, api } = await setup(t, { token: plantedToken });
  const zone = await api.createZone('testsite.example');
  cloudflare.failNext('dns_record_create', 500, {
    success: false,
    errors: [{ code: 1000, message: `Internal error while using token ${plantedToken} to write the record` }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    () => api.createDnsRecord(zone.id, { type: 'A', name: 'testsite.example', content: '192.0.2.1' }),
    (err) => {
      assert.doesNotMatch(err.message, new RegExp(plantedToken));
      assert.match(err.message, /\[redacted\]/);
      return true;
    },
  );
});
