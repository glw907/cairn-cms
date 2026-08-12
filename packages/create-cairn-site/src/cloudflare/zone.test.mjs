import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi } from './api.mjs';

/**
 * Start a fake Cloudflare, point CAIRN_CLOUDFLARE_API_BASE at it, and build a `makeApi` client
 * against it, the same setup api.test.mjs and prefill.test.mjs use.
 * @param {import('node:test').TestContext} t
 * @param {{ zoneStatus?: string }} [fakeOverrides]
 * @returns {Promise<{ cloudflare: import('../../test/fake-cloudflare.mjs').FakeCloudflare, api: ReturnType<typeof makeApi> }>}
 */
async function setup(t, fakeOverrides = {}) {
  const cloudflare = await startFakeCloudflare(fakeOverrides);
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const api = makeApi({ token: 'fake-token', accountId: 'acct-1', dir: '/tmp/site' });
  return { cloudflare, api };
}

function record(domain) {
  return { dir: '/tmp/site', cloudflare: { domain } };
}

/**
 * The captured v4 zone-create failure envelope, which varies only in its code and message. Every
 * body below carries the code and prose captured live in the T4a spike, since the numeric code is
 * the whole thing ensureZone branches on.
 * @param {number} code Cloudflare's `errors[0].code`
 * @param {string} message the message captured beside it
 * @returns {object} a body to arm `failNext` with
 */
function zoneCreateFailure(code, message) {
  return { success: false, errors: [{ code, message }], messages: [], result: null };
}

// --- ensureZone: the plain create path -------------------------------------------------------

test('ensureZone creates the zone and returns its id, nameservers, and activation state', async (t) => {
  const { api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  const result = await ensureZone({ record: record('testsite.example'), api, log: () => {} });

  assert.equal(typeof result.zoneId, 'string');
  assert.equal(result.nameServers.length, 2);
  assert.ok(result.nameServers.every((ns) => ns.endsWith('.ns.cloudflare.com')));
  assert.equal(result.alreadyActive, false);
});

test('nameServers is read from a zone re-read, never trusted from the create response', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  // The fake's own create response never carries name_servers (see fake-cloudflare.mjs); if
  // ensureZone trusted it, nameServers here would be undefined rather than the real pair.
  const result = await ensureZone({ record: record('testsite.example'), api, log: () => {} });

  const [zone] = cloudflare.state.zones;
  assert.deepEqual(result.nameServers, zone.name_servers);
});

test('alreadyActive is true for a zone that arrives already active', async (t) => {
  const { api } = await setup(t, { zoneStatus: 'active' });
  const { ensureZone } = await import('./zone.mjs');

  const result = await ensureZone({ record: record('carin-test.org'), api, log: () => {} });
  assert.equal(result.alreadyActive, true);
});

test('alreadyActive is false for the documented pending default', async (t) => {
  const { api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  const result = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  assert.equal(result.alreadyActive, false);
});

// --- ensureZone: the 1061 adopt-or-error branch -----------------------------------------------

test('1061 followed by a zone-list hit adopts the existing zone rather than throwing', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  // Seed the "existing" zone the way a prior run of this same account would have.
  const existing = await api.createZone('ecxc.ski');

  cloudflare.failNext('zone_create', 400, zoneCreateFailure(1061, 'ecxc.ski already exists'));

  const logLines = [];
  const result = await ensureZone({ record: record('ecxc.ski'), api, log: (line) => logLines.push(line) });

  assert.equal(result.zoneId, existing.id);
  assert.ok(logLines.some((line) => line.includes('already a Cloudflare zone')));
});

test('1061 followed by a zone-list miss raises the rewritten zone-already-exists row', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  cloudflare.failNext('zone_create', 400, zoneCreateFailure(1061, 'ecxc.ski already exists'));

  await assert.rejects(
    () => ensureZone({ record: record('ecxc.ski'), api, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'zone-already-exists');
      assert.match(err.message, /account other than/);
      return true;
    },
  );
});

// --- ensureZone: the 1428 and 1002 rows ---------------------------------------------------------

test('1428 (zone hold) raises the zone-hold ask-someone row', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  cloudflare.failNext(
    'zone_create',
    400,
    zoneCreateFailure(
      1428,
      'The zone name provided is subject to a hold which disallows the creation of this zone. ' +
        'Please contact the domain owner to have this hold removed.',
    ),
  );

  await assert.rejects(
    () => ensureZone({ record: record('cloudflare.com'), api, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'zone-hold');
      assert.equal(err.catalogue.kind, 'ask-someone');
      return true;
    },
  );
});

test('1002 (invalid domain) raises the domain-invalid row', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  cloudflare.failNext('zone_create', 400, zoneCreateFailure(1002, 'Invalid domain'));

  await assert.rejects(
    () => ensureZone({ record: record('not a domain'), api, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'domain-invalid');
      return true;
    },
  );
});

test('an unrelated zone-create failure is not swallowed by the 1061/1428/1002 branches', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone } = await import('./zone.mjs');

  cloudflare.failNext('zone_create', 500, zoneCreateFailure(1000, 'internal error, try again'));

  await assert.rejects(
    () => ensureZone({ record: record('testsite.example'), api, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'zone-create-failed');
      return true;
    },
  );
});

// --- checkDelegation: the four states -----------------------------------------------------------

test('checkDelegation reports active immediately for an already-active zone, with no NS lookup', async (t) => {
  const { api } = await setup(t, { zoneStatus: 'active' });
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('carin-test.org'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'carin-test.org' } };

  let resolveNsCalled = false;
  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => {
      resolveNsCalled = true;
      return [];
    },
  });

  assert.equal(state, 'active');
  assert.equal(resolveNsCalled, false);
});

test('checkDelegation reports pending when the domain still points at its old nameservers', async (t) => {
  const { api } = await setup(t);
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'testsite.example' } };

  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => ['ns1.oldregistrar.example', 'ns2.oldregistrar.example'],
  });

  assert.equal(state, 'pending');
});

test('checkDelegation reports wrong-nameservers for a Cloudflare-shaped pair that is not this zone\'s', async (t) => {
  const { api } = await setup(t);
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'testsite.example' } };

  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => ['someoneelse.ns.cloudflare.com', 'other.ns.cloudflare.com'],
  });

  assert.equal(state, 'wrong-nameservers');
});

test('checkDelegation reports propagating once NS matches but the zone has not activated yet', async (t) => {
  const { api } = await setup(t, { zoneStatus: 'initializing' });
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'testsite.example' } };

  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => zone.nameServers,
  });

  assert.equal(state, 'propagating');
});

test('checkDelegation reports active once NS matches and the zone has activated', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'testsite.example' } };

  // Flip the zone active behind the scenes, the way Cloudflare would once delegation completes.
  const stored = cloudflare.state.zones.find((z) => z.id === zone.zoneId);
  stored.status = 'active';

  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => zone.nameServers,
  });

  assert.equal(state, 'active');
});

test('checkDelegation treats a failed NS lookup as pending, not a crash', async (t) => {
  const { api } = await setup(t);
  const { ensureZone, checkDelegation } = await import('./zone.mjs');

  const zone = await ensureZone({ record: record('testsite.example'), api, log: () => {} });
  const rec = { cloudflare: { ...zone, domain: 'testsite.example' } };

  const state = await checkDelegation({
    record: rec,
    api,
    resolveNs: async () => {
      throw Object.assign(new Error('NXDOMAIN'), { code: 'ENOTFOUND' });
    },
  });

  assert.equal(state, 'pending');
});

// --- delegationInstructions: generic, names the pair --------------------------------------------

test('delegationInstructions names the assigned pair and reads generically, with no registrar named', async () => {
  const { delegationInstructions } = await import('./zone.mjs');

  const text = delegationInstructions(['burt.ns.cloudflare.com', 'carlane.ns.cloudflare.com']);
  assert.match(text, /burt\.ns\.cloudflare\.com/);
  assert.match(text, /carlane\.ns\.cloudflare\.com/);
  // No registrar-specific branding (GoDaddy, Namecheap, and the like): amendment 16 cut the
  // per-registrar table, so this must read the same regardless of where the domain was bought.
  assert.doesNotMatch(text, /GoDaddy|Namecheap|publicdomainreg/i);
});
