import test from 'node:test';
import assert from 'node:assert/strict';

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
    ...overrides,
  };
}

// --- readNsNames -----------------------------------------------------------------------------

test('readNsNames returns the answer array on success', async () => {
  const { readNsNames } = await import('./dns.mjs');
  const recursive = stubResolver({ resolveNs: async () => ['ns1.example.test', 'ns2.example.test'] });
  const names = await readNsNames(recursive, 'example.test');
  assert.deepEqual(names, ['ns1.example.test', 'ns2.example.test']);
});

test('readNsNames reports empty rather than throwing on failure', async () => {
  const { readNsNames } = await import('./dns.mjs');
  const recursive = stubResolver({
    resolveNs: async () => {
      throw dnsError('ESERVFAIL');
    },
  });
  const names = await readNsNames(recursive, 'example.test');
  assert.deepEqual(names, []);
});

// --- firstAuthoritativeAddress -----------------------------------------------------------------

test('firstAuthoritativeAddress tries resolve4 then resolve6, and the next nameserver on exhaustion', async () => {
  const { firstAuthoritativeAddress } = await import('./dns.mjs');
  const recursive = stubResolver({
    resolve6: only('ns2.example.test', ['2001:db8::1']),
  });
  const address = await firstAuthoritativeAddress(recursive, ['ns1.example.test', 'ns2.example.test']);
  assert.equal(address, '2001:db8::1');
});

test('firstAuthoritativeAddress returns null when nothing resolves', async () => {
  const { firstAuthoritativeAddress } = await import('./dns.mjs');
  const recursive = stubResolver();
  const address = await firstAuthoritativeAddress(recursive, ['ns1.example.test']);
  assert.equal(address, null);
});

// --- selectAuthoritativeResolver ----------------------------------------------------------------

test('selectAuthoritativeResolver prefers a discovered authoritative address, marking lowConfidence false', async () => {
  const { selectAuthoritativeResolver } = await import('./dns.mjs');
  const recursive = stubResolver({
    resolveNs: async () => ['ns1.example.test'],
    resolve4: only('ns1.example.test', ['203.0.113.9']),
  });
  const authoritative = stubResolver();
  const resolve = (servers) => (servers ? authoritative : recursive);

  const result = await selectAuthoritativeResolver({ recursive, domain: 'example.test', resolve });
  assert.equal(result.resolver, authoritative);
  assert.equal(result.lowConfidence, false);
});

test('selectAuthoritativeResolver accepts a caller-supplied nameServers list and skips the NS lookup', async () => {
  const { selectAuthoritativeResolver } = await import('./dns.mjs');
  let nsLookupCalled = false;
  const recursive = stubResolver({
    resolveNs: async () => {
      nsLookupCalled = true;
      return ['ns1.example.test'];
    },
    resolve4: only('ns1.example.test', ['203.0.113.9']),
  });
  const authoritative = stubResolver();
  const resolve = (servers) => (servers ? authoritative : recursive);

  const result = await selectAuthoritativeResolver({
    recursive,
    domain: 'example.test',
    nameServers: ['ns1.example.test'],
    resolve,
  });
  assert.equal(nsLookupCalled, false, 'a caller-supplied nameServers list must skip NS discovery');
  assert.equal(result.resolver, authoritative);
  assert.equal(result.lowConfidence, false);
});

test('selectAuthoritativeResolver falls back to the recursive resolver, marking lowConfidence true, when no NS names are found', async () => {
  const { selectAuthoritativeResolver } = await import('./dns.mjs');
  const recursive = stubResolver();
  const resolve = () => recursive;

  const result = await selectAuthoritativeResolver({ recursive, domain: 'example.test', resolve });
  assert.equal(result.resolver, recursive);
  assert.equal(result.lowConfidence, true);
});

test('selectAuthoritativeResolver falls back when NS names are found but none resolve to an address', async () => {
  const { selectAuthoritativeResolver } = await import('./dns.mjs');
  const recursive = stubResolver({ resolveNs: async () => ['ns1.example.test'] });
  const resolve = () => recursive;

  const result = await selectAuthoritativeResolver({ recursive, domain: 'example.test', resolve });
  assert.equal(result.resolver, recursive);
  assert.equal(result.lowConfidence, true);
});

// --- readAuthoritativeAndRecursive ---------------------------------------------------------------

test('readAuthoritativeAndRecursive returns both answers, honestly labeled, when they disagree', async () => {
  const { readAuthoritativeAndRecursive } = await import('./dns.mjs');
  const nsHost = 'ns1.example.test';
  const recursive = stubResolver({
    resolveNs: async () => [nsHost],
    resolve6: only(nsHost, ['203.0.113.9']),
    // The domain query itself stays absent on the recursive resolver: the stale-negative-cache
    // shape this whole module exists to see past.
  });
  const authoritative = stubResolver({
    resolve6: only('example.test', ['2001:db8::100']),
  });
  const resolve = (servers) => (servers ? authoritative : recursive);

  const result = await readAuthoritativeAndRecursive({
    domain: 'example.test',
    name: 'example.test',
    method: 'resolve6',
    resolve,
  });

  assert.deepEqual(result.authoritative, ['2001:db8::100']);
  assert.deepEqual(result.recursive, []);
  assert.equal(result.lowConfidence, false);
});

test('readAuthoritativeAndRecursive reports authoritative absence too, when the authoritative source itself has nothing', async () => {
  const { readAuthoritativeAndRecursive } = await import('./dns.mjs');
  const nsHost = 'ns1.example.test';
  const recursive = stubResolver({
    resolveNs: async () => [nsHost],
    resolve6: only(nsHost, ['203.0.113.9']),
  });
  const authoritative = stubResolver(); // absent for everything, including the domain itself
  const resolve = (servers) => (servers ? authoritative : recursive);

  const result = await readAuthoritativeAndRecursive({
    domain: 'example.test',
    name: 'example.test',
    method: 'resolve6',
    resolve,
  });

  assert.deepEqual(result.authoritative, []);
  assert.equal(result.lowConfidence, false);
});

test('readAuthoritativeAndRecursive reports authoritative as null, not an empty array, when no authoritative source is reachable', async () => {
  const { readAuthoritativeAndRecursive } = await import('./dns.mjs');
  const recursive = stubResolver(); // no NS names discoverable at all

  const result = await readAuthoritativeAndRecursive({
    domain: 'example.test',
    name: 'example.test',
    method: 'resolve6',
    resolve: () => recursive,
  });

  assert.equal(result.authoritative, null);
  assert.equal(result.lowConfidence, true);
});

test('readAuthoritativeAndRecursive accepts a caller-supplied nameServers list', async () => {
  const { readAuthoritativeAndRecursive } = await import('./dns.mjs');
  const nsHost = 'ns1.example.test';
  const recursive = stubResolver({ resolve6: only(nsHost, ['203.0.113.9']) });
  const authoritative = stubResolver({ resolve6: only('example.test', ['2001:db8::100']) });
  const resolve = (servers) => (servers ? authoritative : recursive);

  const result = await readAuthoritativeAndRecursive({
    domain: 'example.test',
    name: 'example.test',
    method: 'resolve6',
    nameServers: [nsHost],
    resolve,
  });

  assert.deepEqual(result.authoritative, ['2001:db8::100']);
  assert.equal(result.lowConfidence, false);
});

// --- defaultResolve / RECURSIVE_SERVERS ----------------------------------------------------------

test('defaultResolve builds a resolver pointed at RECURSIVE_SERVERS when called with no servers', async () => {
  const { defaultResolve, RECURSIVE_SERVERS } = await import('./dns.mjs');
  const resolver = defaultResolve();
  assert.deepEqual(resolver.getServers(), RECURSIVE_SERVERS);
});

test('defaultResolve points at the given servers when provided', async () => {
  const { defaultResolve } = await import('./dns.mjs');
  const resolver = defaultResolve(['203.0.113.9']);
  assert.deepEqual(resolver.getServers(), ['203.0.113.9']);
});
