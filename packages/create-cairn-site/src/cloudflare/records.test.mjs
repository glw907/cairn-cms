import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';
import { makeApi } from './api.mjs';

/**
 * Start a fake Cloudflare, point CAIRN_CLOUDFLARE_API_BASE at it, and build a `makeApi` client
 * against it, the same setup api.test.mjs and zone.test.mjs use.
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

/** Build a DNS lookup error carrying the given `node:dns` code. */
function dnsError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

/** A resolver-like stub method that always answers authoritatively absent (`ENODATA`). */
function absent() {
  return async () => {
    throw dnsError('ENODATA');
  };
}

/** A resolver-like stub method that answers `value` for exactly `name`, absent otherwise. */
function only(name, value) {
  return async (queriedName) => {
    if (queriedName === name) return value;
    throw dnsError('ENODATA');
  };
}

/** A full resolver-like stub, every method absent unless overridden. */
function stubResolver(overrides = {}) {
  return {
    resolveNs: absent(),
    resolve4: absent(),
    resolve6: absent(),
    resolveMx: absent(),
    resolveTxt: absent(),
    resolveCname: absent(),
    resolveCaa: absent(),
    ...overrides,
  };
}

// --- PROBE_PLAN: pinned, so a later edit cannot silently drift ---------------------------------

test('the probe plan is pinned: apex types, subdomain hosts, and the DKIM selector list', async () => {
  const { PROBE_PLAN } = await import('./records.mjs');
  assert.deepEqual(PROBE_PLAN, {
    apex: ['A', 'AAAA', 'MX', 'TXT', 'CAA', 'NS'],
    subdomains: {
      www: ['A', 'AAAA', 'CNAME'],
      mail: ['A', 'AAAA', 'CNAME'],
      autodiscover: ['A', 'AAAA', 'CNAME'],
      _dmarc: ['TXT'],
    },
    dkimSelectors: ['google', 'fm1', 'fm2', 'fm3', 'selector1', 'selector2'],
  });
});

// --- readCurrentRecords: typed translation ------------------------------------------------------

test('typed records: MX priority as its own field, a chunked TXT joined intact, CAA translated', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const chunkA = 'x'.repeat(255);
  const chunkB = 'y'.repeat(182); // 437 bytes total, matching the spike's observed DKIM chunking

  const resolver = stubResolver({
    resolveMx: only('testsite.example', [{ exchange: 'aspmx.l.google.com', priority: 1 }]),
    resolveTxt: only('testsite.example', [[chunkA, chunkB]]),
    resolveCaa: only('testsite.example', [{ critical: 0, issue: 'pki.goog' }]),
  });

  const { records, lowConfidence } = await readCurrentRecords({
    domain: 'testsite.example',
    dir: '/tmp/site',
    resolve: () => resolver,
  });

  assert.equal(lowConfidence, true);

  const mx = records.find((r) => r.type === 'MX');
  assert.equal(mx.content, 'aspmx.l.google.com');
  assert.equal(mx.priority, 1);

  const txt = records.find((r) => r.type === 'TXT' && r.host === 'apex');
  assert.equal(txt.content.length, 437);
  assert.equal(txt.content, chunkA + chunkB);

  const caa = records.find((r) => r.type === 'CAA');
  assert.deepEqual(caa.data, { flags: 0, tag: 'issue', value: 'pki.goog' });
});

test('DKIM selectors are probed for both TXT and CNAME at <selector>._domainkey.<domain>', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolveTxt: only('google._domainkey.testsite.example', [['v=DKIM1; k=rsa; p=abc']]),
    resolveCname: only('fm1._domainkey.testsite.example', ['fm1.testsite.example.dkim.fmhosted.com']),
  });

  const { records } = await readCurrentRecords({
    domain: 'testsite.example',
    dir: '/tmp/site',
    resolve: () => resolver,
  });

  const googleTxt = records.find((r) => r.name === 'google._domainkey.testsite.example' && r.type === 'TXT');
  assert.ok(googleTxt, 'the google selector TXT should be found');

  const fm1Cname = records.find((r) => r.name === 'fm1._domainkey.testsite.example' && r.type === 'CNAME');
  assert.ok(fm1Cname, 'the fm1 selector CNAME should be found');
  assert.equal(fm1Cname.content, 'fm1.testsite.example.dkim.fmhosted.com');
});

test('authoritative absence and a real failure are distinguishable: absence returns empty, failure throws records-read-failed', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolve4: async () => {
      throw dnsError('ESERVFAIL');
    },
  });

  await assert.rejects(
    () => readCurrentRecords({ domain: 'testsite.example', dir: '/tmp/site', resolve: () => resolver }),
    (err) => {
      assert.equal(err.catalogue.code, 'records-read-failed');
      return true;
    },
  );
});

test('ENOTFOUND, like ENODATA, is authoritative absence and does not fail the read', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolve4: async () => {
      throw dnsError('ENOTFOUND');
    },
  });

  const { records } = await readCurrentRecords({ domain: 'testsite.example', dir: '/tmp/site', resolve: () => resolver });
  assert.equal(records.some((r) => r.type === 'A'), false);
});

// --- readCurrentRecords: the negative-cache defect (amendment 15) -------------------------------

test('the authoritative read is preferred, and catches what a recursive resolver misses (the negative-cache shape)', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  // The recursive resolver answers absent for every probe, including MX, the exact stale-cache
  // shape the spike observed twice on its own scratch domain.
  const recursiveResolver = stubResolver({
    resolveNs: async () => ['ns1.registrar.test'],
    resolve4: only('ns1.registrar.test', ['203.0.113.5']),
  });
  const authoritativeResolver = stubResolver({
    resolveMx: only('testsite.example', [{ exchange: 'aspmx.l.google.com', priority: 1 }]),
  });
  const resolve = (servers) => (servers ? authoritativeResolver : recursiveResolver);

  const { records, lowConfidence } = await readCurrentRecords({
    domain: 'testsite.example',
    dir: '/tmp/site',
    resolve,
  });

  assert.equal(lowConfidence, false);
  const mx = records.find((r) => r.type === 'MX');
  assert.ok(mx, 'the MX record must come from the authoritative resolver, not the recursive one reporting it absent');
  assert.equal(mx.content, 'aspmx.l.google.com');
});

test('falling back to a recursive resolver sets lowConfidence, when no authoritative address is reachable', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolveNs: async () => ['ns1.registrar.test'],
    // resolve4/resolve6 both stay absent, so no authoritative address is ever found.
  });

  const { lowConfidence } = await readCurrentRecords({ domain: 'testsite.example', dir: '/tmp/site', resolve: () => resolver });
  assert.equal(lowConfidence, true);
});

// --- readCurrentRecords: the post-delegation refusal ---------------------------------------------

test('readCurrentRecords refuses to run once the domain already carries a Cloudflare NS pair', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolveNs: async () => ['burt.ns.cloudflare.com', 'carlane.ns.cloudflare.com'],
  });

  await assert.rejects(
    () => readCurrentRecords({ domain: 'testsite.example', dir: '/tmp/site', resolve: () => resolver }),
    /already delegated to Cloudflare/,
  );
});

// Falsifiable: a domain NOT yet delegated (an ordinary registrar NS pair) must NOT trip the
// refusal, proving the check above is not vacuously true for every NS lookup.
test('a domain still at its old registrar does not trip the post-delegation refusal', async () => {
  const { readCurrentRecords } = await import('./records.mjs');

  const resolver = stubResolver({
    resolveNs: async () => ['ns1.oldregistrar.example', 'ns2.oldregistrar.example'],
  });

  await assert.doesNotReject(() =>
    readCurrentRecords({ domain: 'testsite.example', dir: '/tmp/site', resolve: () => resolver }),
  );
});

// --- carryOverRecords: the write gate -------------------------------------------------------------

test('nothing writes before confirm resolves, proven from inside confirm itself', async (t) => {
  const { api } = await setup(t);
  const { carryOverRecords } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [{ type: 'A', name: 'testsite.example', content: '192.0.2.1', host: 'apex' }],
    confirm: async () => {
      const before = await api.listDnsRecords(zone.id);
      assert.equal(before.length, 0, 'no record should exist before confirm resolves');
      return true;
    },
    log: () => {},
  });

  const after = await api.listDnsRecords(zone.id);
  assert.equal(after.length, 1);
});

test('declining writes nothing and returns declined', async (t) => {
  const { api } = await setup(t);
  const { carryOverRecords } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  const result = await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [{ type: 'A', name: 'testsite.example', content: '192.0.2.1', host: 'apex' }],
    confirm: async () => false,
    log: () => {},
  });

  assert.deepEqual(result, { outcome: 'declined', count: 0, types: [] });
  const stored = await api.listDnsRecords(zone.id);
  assert.equal(stored.length, 0);
});

test('confirming writes every listed record, MX priority intact, and returns carried', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { carryOverRecords } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  const records = [
    { type: 'A', name: 'testsite.example', content: '192.0.2.1', host: 'apex' },
    { type: 'MX', name: 'testsite.example', content: 'aspmx.l.google.com', priority: 1, host: 'apex' },
    { type: 'TXT', name: '_dmarc.testsite.example', content: 'v=DMARC1; p=none', host: '_dmarc' },
  ];

  const result = await carryOverRecords({ api, zoneId: zone.id, records, confirm: async () => true, log: () => {} });

  assert.equal(result.outcome, 'carried');
  assert.equal(result.count, 3);
  assert.deepEqual(result.types, ['A', 'MX', 'TXT']);

  const stored = cloudflare.state.dnsRecords.get(zone.id);
  assert.equal(stored.length, 3);
  const mx = stored.find((r) => r.type === 'MX');
  assert.equal(mx.priority, 1);
});

test('NS records are excluded from what gets written and from the count', async (t) => {
  const { cloudflare, api } = await setup(t);
  const { carryOverRecords } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  const records = [
    { type: 'NS', name: 'testsite.example', content: 'ns1.oldregistrar.example', host: 'apex' },
    { type: 'A', name: 'testsite.example', content: '192.0.2.1', host: 'apex' },
  ];

  const result = await carryOverRecords({ api, zoneId: zone.id, records, confirm: async () => true, log: () => {} });

  assert.equal(result.count, 1);
  assert.deepEqual(result.types, ['A']);
  const stored = cloudflare.state.dnsRecords.get(zone.id);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].type, 'A');
});

// --- carryOverRecords: the gate copy's caveats, asserted as literal strings ----------------------

test('the gate copy always carries the incompleteness caveat verbatim', async (t) => {
  const { api } = await setup(t);
  const { carryOverRecords, INCOMPLETE_CAVEAT } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  let seenMessage = '';
  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [],
    confirm: async (message) => {
      seenMessage = message;
      return false;
    },
    log: () => {},
  });

  assert.ok(seenMessage.includes(INCOMPLETE_CAVEAT));
});

test('the low-confidence caveat appears only when lowConfidence is true', async (t) => {
  const { api } = await setup(t);
  const { carryOverRecords, LOW_CONFIDENCE_CAVEAT } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  let confidentMessage = '';
  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [],
    lowConfidence: false,
    confirm: async (message) => {
      confidentMessage = message;
      return false;
    },
    log: () => {},
  });
  assert.ok(!confidentMessage.includes(LOW_CONFIDENCE_CAVEAT));

  let lowConfidenceMessage = '';
  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [],
    lowConfidence: true,
    confirm: async (message) => {
      lowConfidenceMessage = message;
      return false;
    },
    log: () => {},
  });
  assert.ok(lowConfidenceMessage.includes(LOW_CONFIDENCE_CAVEAT));
});

test('the apex-address-collision caveat appears only when the apex already carries an A or AAAA record', async (t) => {
  const { api } = await setup(t);
  const { carryOverRecords, APEX_ADDRESS_COLLISION_CAVEAT } = await import('./records.mjs');
  const zone = await api.createZone('testsite.example');

  let withoutApexAddress = '';
  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [{ type: 'TXT', name: '_dmarc.testsite.example', content: 'v=DMARC1; p=none', host: '_dmarc' }],
    confirm: async (message) => {
      withoutApexAddress = message;
      return false;
    },
    log: () => {},
  });
  assert.ok(!withoutApexAddress.includes(APEX_ADDRESS_COLLISION_CAVEAT));

  let withApexAddress = '';
  await carryOverRecords({
    api,
    zoneId: zone.id,
    records: [{ type: 'AAAA', name: 'testsite.example', content: '2001:db8::1', host: 'apex' }],
    confirm: async (message) => {
      withApexAddress = message;
      return false;
    },
    log: () => {},
  });
  assert.ok(withApexAddress.includes(APEX_ADDRESS_COLLISION_CAVEAT));
});
