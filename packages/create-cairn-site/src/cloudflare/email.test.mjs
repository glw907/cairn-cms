import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeCloudflare, SENDER_NOT_CONFIGURED_REFUSED_BODY } from '../../test/fake-cloudflare.mjs';
import { makeApi, SENDING_DISABLED_CODE } from './api.mjs';
import { ensureSendingDomain, sendTestMessage, defaultFromAddress, PROPAGATION_WINDOW_MS } from './email.mjs';

/**
 * The send refusal captured live 2026-08-12 (docs/internal/2026-08-11-t4b-email-spike.md, and
 * api.test.mjs's own copy): byte-identical whether the apex was never onboarded or is still
 * settling, which is exactly why this module's own classification exists.
 */
const SEND_REFUSED_BODY = {
  success: false,
  errors: [{ code: SENDING_DISABLED_CODE, message: 'email.sending.error.email.sending_disabled' }],
  messages: [],
  result: null,
};

/**
 * A daily-limit refusal in Cloudflare's own dotted-identifier style. This exact shape was never
 * observed live (the spike's account never reached the limit); it is a derived fixture, not a
 * captured one, and the test below says so in its name.
 */
function dailyLimitRefusedBody() {
  return {
    success: false,
    errors: [{ code: 9999, message: 'email.sending.error.email.sending_daily_limit_exceeded' }],
    messages: [],
    result: null,
  };
}

/**
 * Start a fake Cloudflare, point CAIRN_CLOUDFLARE_API_BASE at it, and build a `makeApi` client
 * against it. `t.after` tears both down.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<{ cloudflare: import('../../test/fake-cloudflare.mjs').FakeCloudflare, api: ReturnType<typeof makeApi> }>}
 */
async function setup(t) {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir: '/tmp/site' });
  return { cloudflare, api };
}

/** True when `cloudflare.requests` carries a create-subdomain POST for `zoneId`. */
function issuedCreate(cloudflare, zoneId) {
  return cloudflare.requests.some(
    (r) => r.method === 'POST' && r.path === `/client/v4/zones/${zoneId}/email/sending/subdomains`,
  );
}

// --- ensureSendingDomain -------------------------------------------------------------------

test('ensureSendingDomain creates the subdomain when none exists, then reports it enabled', async (t) => {
  const { cloudflare, api } = await setup(t);
  const created = await api.createZone('carin-test.org');

  const result = await ensureSendingDomain({
    api,
    zoneId: created.id,
    domain: 'carin-test.org',
    record: { dir: '/tmp/site' },
  });

  assert.equal(result.enabled, true);
  assert.equal(typeof result.onboardedAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(result.onboardedAt)));
  assert.equal(issuedCreate(cloudflare, created.id), true);
});

test('ensureSendingDomain reports a disabled existing entry and issues no create', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');
  // The fake's create route always returns enabled: true, so a disabled entry has to be seeded
  // directly rather than created through the route.
  cloudflare.state.emailSubdomains.set(zone.id, [{ name: 'carin-test.org', enabled: false }]);

  const result = await ensureSendingDomain({
    api,
    zoneId: zone.id,
    domain: 'carin-test.org',
    record: { dir: '/tmp/site' },
  });

  assert.deepEqual(result, { enabled: false });
  assert.equal(issuedCreate(cloudflare, zone.id), false);
});

test('ensureSendingDomain reports an existing enabled entry and issues no create', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');
  await api.createSendingSubdomain(zone.id, 'carin-test.org');
  const requestCountAfterSetup = cloudflare.requests.length;

  const result = await ensureSendingDomain({
    api,
    zoneId: zone.id,
    domain: 'carin-test.org',
    record: { dir: '/tmp/site' },
  });

  assert.equal(result.enabled, true);
  assert.equal(typeof result.onboardedAt, 'string');
  assert.equal(cloudflare.requests.length, requestCountAfterSetup + 1, 'only the list call, no create');
  assert.equal(issuedCreate(cloudflare, zone.id), true, 'the one create was the setup call, not a second one');
});

test('ensureSendingDomain surfaces a failed create as Task 4\'s email-onboarding-failed row, unchanged', async (t) => {
  const { cloudflare, api } = await setup(t);
  const zone = await api.createZone('carin-test.org');
  cloudflare.failNext('email_subdomain_create', 500, {
    success: false,
    errors: [{ code: 1234, message: 'internal error' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    ensureSendingDomain({ api, zoneId: zone.id, domain: 'carin-test.org', record: { dir: '/tmp/site' } }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-onboarding-failed');
      assert.match(err.message, /internal error/);
      return true;
    },
  );
});

// --- sendTestMessage ---------------------------------------------------------------------

test('sendTestMessage resolves on a successful send', async (t) => {
  const { cloudflare, api } = await setup(t);
  await sendTestMessage({
    api,
    from: 'no-reply@carin-test.org',
    to: 'owner@example.com',
    onboardedAt: new Date().toISOString(),
  });

  const sendRequest = cloudflare.requests.find(
    (r) => r.method === 'POST' && r.path === '/client/v4/accounts/acct-1/email/sending/send',
  );
  assert.ok(sendRequest);
  assert.equal(sendRequest.body.from, 'no-reply@carin-test.org');
  assert.equal(sendRequest.body.to, 'owner@example.com');
});

test('sendTestMessage parks as email-sender-propagating inside the propagation window', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS - 1000,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-propagating');
      assert.equal(err.catalogue.kind, 'wait');
      return true;
    },
  );
});

test('sendTestMessage throws email-sender-unavailable past the propagation window', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS + 60_000,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-unavailable');
      assert.equal(err.catalogue.kind, 'act');
      return true;
    },
  );
});

test('sendTestMessage treats exactly PROPAGATION_WINDOW_MS elapsed as still propagating (inclusive boundary)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-propagating');
      return true;
    },
  );
});

test('sendTestMessage treats one millisecond past PROPAGATION_WINDOW_MS as unavailable (exclusive boundary)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SEND_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS + 1,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-unavailable');
      return true;
    },
  );
});

// --- 10204, the second sender-not-ready code, joins 10203 under the same window logic ---------
//
// 10204 was never observed on a domain that had just been onboarded live (only on never-onboarded
// domains, and not consistently even there); the boundary tests below assert a reasoned
// classification derived from the dotted identifier's meaning, not a measured fact.

test('sendTestMessage parks as email-sender-propagating for 10204 inside the propagation window (10204 never observed on a just-onboarded domain live)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SENDER_NOT_CONFIGURED_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS - 1000,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-propagating');
      assert.equal(err.catalogue.kind, 'wait');
      return true;
    },
  );
});

test('sendTestMessage throws email-sender-unavailable for 10204 past the propagation window (10204 never observed on a just-onboarded domain live)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SENDER_NOT_CONFIGURED_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS + 60_000,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-unavailable');
      assert.equal(err.catalogue.kind, 'act');
      return true;
    },
  );
});

test('sendTestMessage treats exactly PROPAGATION_WINDOW_MS elapsed as still propagating for 10204 too (inclusive boundary)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SENDER_NOT_CONFIGURED_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-propagating');
      return true;
    },
  );
});

test('sendTestMessage treats one millisecond past PROPAGATION_WINDOW_MS as unavailable for 10204 too (exclusive boundary)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, SENDER_NOT_CONFIGURED_REFUSED_BODY);

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS + 1,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-sender-unavailable');
      return true;
    },
  );
});

test('sendTestMessage still falls through to email-send-failed for a third code that is neither 10203 nor 10204, proving the classification was not over-widened', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 403, {
    success: false,
    errors: [{ code: 10299, message: 'email.sending.error.email.some_other_condition' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date(0).toISOString(),
      now: () => PROPAGATION_WINDOW_MS - 1000,
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-send-failed');
      assert.match(err.message, /email\.sending\.error\.email\.some_other_condition/);
      return true;
    },
  );
});

test('sendTestMessage parks as email-daily-limit on a dotted identifier containing daily_limit (a derived fixture, never observed live)', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 429, dailyLimitRefusedBody());

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date().toISOString(),
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-daily-limit');
      assert.equal(err.catalogue.kind, 'wait');
      return true;
    },
  );
});

test('sendTestMessage falls through to email-send-failed for an unmapped refusal, carrying api.mjs\'s own message', async (t) => {
  const { cloudflare, api } = await setup(t);
  cloudflare.failNext('email_send', 500, {
    success: false,
    errors: [{ code: 1234, message: 'some other cloudflare failure' }],
    messages: [],
    result: null,
  });

  await assert.rejects(
    sendTestMessage({
      api,
      from: 'no-reply@carin-test.org',
      to: 'owner@example.com',
      onboardedAt: new Date().toISOString(),
    }),
    (err) => {
      assert.equal(err.catalogue.code, 'email-send-failed');
      assert.match(err.message, /some other cloudflare failure/);
      assert.match(err.message, /--dir \/tmp\/site/);
      return true;
    },
  );
});

// --- defaultFromAddress --------------------------------------------------------------------

test('defaultFromAddress builds a no-reply address at the given domain', () => {
  assert.equal(defaultFromAddress('example.com'), 'no-reply@example.com');
});

test('defaultFromAddress handles a domain that is itself a subdomain', () => {
  assert.equal(defaultFromAddress('blog.example.com'), 'no-reply@blog.example.com');
});
