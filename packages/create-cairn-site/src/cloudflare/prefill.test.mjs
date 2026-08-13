import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startFakeCloudflare } from '../../test/fake-cloudflare.mjs';

/**
 * Start a fake Cloudflare and point CAIRN_CLOUDFLARE_API_BASE at it, the same setup api.test.mjs
 * uses, so ensureApiToken's validateToken call resolves against the fake rather than the network.
 * @param {import('node:test').TestContext} t
 * @returns {Promise<import('../../test/fake-cloudflare.mjs').FakeCloudflare>}
 */
async function setup(t) {
  const cloudflare = await startFakeCloudflare();
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  return cloudflare;
}

/** The v4 403 envelope with no extractable permission, matching api.test.mjs's own fixture. */
const GENERIC_SCOPE_MISSING_BODY = {
  success: false,
  errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }],
  messages: [],
  result: null,
};

/** The v4 400 envelope api.mjs maps onto token-invalid, matching api.test.mjs's own fixture. */
const TOKEN_INVALID_BODY = {
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
};

// --- branch 1: saved-and-valid ----------------------------------------------------------------

test('a saved token that still validates is reused, with no browser opened', async (t) => {
  await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  let browserOpened = false;
  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'saved-good-token' } },
    log: () => {},
    openBrowser: async () => {
      browserOpened = true;
    },
  });

  assert.equal(result, 'saved-good-token');
  assert.equal(browserOpened, false);
});

test('a saved token is validated against the live API, not just trusted because it exists', async (t) => {
  const cloudflare = await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'saved-good-token' } },
    log: () => {},
    openBrowser: async () => {},
  });

  const zoneListCalls = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'),
  );
  assert.equal(zoneListCalls.length, 1);
});

// --- branch 2: saved-but-invalid → re-prefill -------------------------------------------------

test('a saved token that fails validation triggers a fresh prefill and returns the newly pasted good token', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 400, TOKEN_INVALID_BODY);
  const { ensureApiToken, PREFILL_URL } = await import('./prefill.mjs');

  const openedUrls = [];
  const logLines = [];
  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'stale-token' } },
    log: (line) => logLines.push(line),
    openBrowser: async (url) => {
      openedUrls.push(url);
    },
    promptSecretFn: async () => 'fresh-good-token',
  });

  assert.equal(result, 'fresh-good-token');
  assert.deepEqual(openedUrls, [PREFILL_URL]);
  assert.ok(logLines.some((line) => line.includes('no longer works')));
});

// --- branch 3: pasted-but-underscoped → token-scope-missing after one re-prompt ----------------

test('an underscoped pasted token gets exactly one re-prompt, then throws token-scope-missing', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
  const { ensureApiToken } = await import('./prefill.mjs');

  let promptCalls = 0;
  const promptSecretFn = async () => {
    promptCalls += 1;
    if (promptCalls === 2) {
      // Re-arm the fake's one-shot override right before the second validation call runs, the
      // same idiom api.test.mjs's own 429-retry test uses to answer a second request differently.
      cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
    }
    return `pasted-token-attempt-${promptCalls}`;
  };

  await assert.rejects(
    () =>
      ensureApiToken({
        record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
        log: () => {},
        openBrowser: async () => {},
        promptSecretFn,
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      return true;
    },
  );

  assert.equal(promptCalls, 2);
});

test('a pasted token that validates on the second try is returned, not thrown', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
  const { ensureApiToken } = await import('./prefill.mjs');

  let promptCalls = 0;
  const promptSecretFn = async () => {
    promptCalls += 1;
    return promptCalls === 1 ? 'first-bad-token' : 'second-good-token';
  };

  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    openBrowser: async () => {},
    promptSecretFn,
  });

  assert.equal(result, 'second-good-token');
  assert.equal(promptCalls, 2);
});

// --- branch 4: unattended → CAIRN_CF_API_TOKEN --------------------------------------------------

test('an unattended run reads CAIRN_CF_API_TOKEN and never opens a browser or prompts', async (t) => {
  await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  let browserOpened = false;
  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    openBrowser: async () => {
      browserOpened = true;
    },
    promptSecretFn: async () => {
      throw new Error('promptSecretFn must not be called in an unattended run');
    },
    yes: true,
    env: { CAIRN_CF_API_TOKEN: 'env-token-value' },
  });

  assert.equal(result, 'env-token-value');
  assert.equal(browserOpened, false);
});

test('an unattended run with a valid saved token and no env override reuses the saved token', async (t) => {
  const cloudflare = await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'saved-good-token' } },
    log: () => {},
    yes: true,
    env: {},
  });

  assert.equal(result, 'saved-good-token');
  const zoneListCalls = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'),
  );
  assert.equal(zoneListCalls.length, 1, 'only the saved token should have been validated');
  assert.equal(zoneListCalls[0].headers.authorization, 'Bearer saved-good-token');
});

// --- branch 5 (T4b.1): a differing CAIRN_CF_API_TOKEN is preferred over a saved token ----------

test('an unattended run with a saved token and a DIFFERING CAIRN_CF_API_TOKEN prefers and saves the env token', async (t) => {
  const cloudflare = await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'saved-good-token' } },
    log: () => {},
    yes: true,
    env: { CAIRN_CF_API_TOKEN: 'operator-set-env-token' },
  });

  assert.equal(result, 'operator-set-env-token');
  const zoneListCalls = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'),
  );
  assert.equal(zoneListCalls.length, 1, 'only the env token should have been validated, not the saved one');
  assert.equal(zoneListCalls[0].headers.authorization, 'Bearer operator-set-env-token');
});

test('an unattended run with a differing but INVALID CAIRN_CF_API_TOKEN throws, never falling back to the saved token', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
  const { ensureApiToken } = await import('./prefill.mjs');

  await assert.rejects(
    () =>
      ensureApiToken({
        record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1', apiToken: 'saved-good-token' } },
        log: () => {},
        yes: true,
        env: { CAIRN_CF_API_TOKEN: 'bad-env-token' },
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      return true;
    },
  );

  const zoneListCalls = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'),
  );
  assert.equal(zoneListCalls.length, 1, 'the saved token must never be tried once the env token fails validation');
  assert.equal(zoneListCalls[0].headers.authorization, 'Bearer bad-env-token');
});

test('an unattended run with no CAIRN_CF_API_TOKEN throws, naming the env var', async (t) => {
  await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  await assert.rejects(
    () =>
      ensureApiToken({
        record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
        log: () => {},
        yes: true,
        env: {},
      }),
    (err) => {
      assert.match(err.message, /CAIRN_CF_API_TOKEN/);
      return true;
    },
  );
});

// --- the argv constraint: no secret in a flag ---------------------------------------------------

test('a token-shaped bare argv entry is rejected before anything else runs, naming CAIRN_CF_API_TOKEN', async (t) => {
  const { ensureApiToken } = await import('./prefill.mjs');
  const tokenShaped = 'A'.repeat(40);

  await assert.rejects(
    () =>
      ensureApiToken({
        record: null,
        log: () => {},
        yes: true,
        env: { CAIRN_CF_API_TOKEN: 'a-real-env-token' },
        argv: ['--yes', tokenShaped],
      }),
    (err) => {
      assert.match(err.message, /CAIRN_CF_API_TOKEN/);
      assert.match(err.message, new RegExp(tokenShaped));
      return true;
    },
  );
});

// The shape Cloudflare actually issues today, which the guard originally could not match: a
// `cf..._` prefix and a length well past the legacy 40. Modelled on a token minted 2026-08-11 for
// the T4a spike (53 characters); the value here is synthetic, never a real one.
test('an argv entry shaped like a CURRENT Cloudflare token is rejected', async (t) => {
  const { ensureApiToken } = await import('./prefill.mjs');
  const tokenShaped = `cfut_${'C'.repeat(48)}`;

  await assert.rejects(
    () =>
      ensureApiToken({
        record: null,
        log: () => {},
        yes: true,
        env: { CAIRN_CF_API_TOKEN: 'a-real-env-token' },
        argv: ['--yes', tokenShaped],
      }),
    (err) => {
      assert.match(err.message, /CAIRN_CF_API_TOKEN/);
      assert.match(err.message, new RegExp(tokenShaped));
      return true;
    },
  );
});

test('a token-shaped --flag=value argv entry is rejected the same way', async (t) => {
  const { ensureApiToken } = await import('./prefill.mjs');
  const tokenShaped = 'B'.repeat(40);

  await assert.rejects(
    () =>
      ensureApiToken({
        record: null,
        log: () => {},
        yes: true,
        env: { CAIRN_CF_API_TOKEN: 'a-real-env-token' },
        argv: [`--cloudflare-token=${tokenShaped}`],
      }),
    (err) => {
      assert.match(err.message, /CAIRN_CF_API_TOKEN/);
      return true;
    },
  );
});

test('argv with nothing token-shaped is never rejected', async (t) => {
  await setup(t);
  const { ensureApiToken } = await import('./prefill.mjs');

  const result = await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    yes: true,
    env: { CAIRN_CF_API_TOKEN: 'env-token-value' },
    argv: ['--yes', '--dir', 'my-site'],
  });

  assert.equal(result, 'env-token-value');
});

// --- the browser open goes only through the injected seam ---------------------------------------

test('the browser open uses the injected openBrowser, never the real opener', async (t) => {
  await setup(t);
  const { ensureApiToken, PREFILL_URL } = await import('./prefill.mjs');

  const calls = [];
  await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    openBrowser: async (url, log) => {
      calls.push(url);
      log('fake-opened');
    },
    promptSecretFn: async () => 'a-good-token',
  });

  assert.deepEqual(calls, [PREFILL_URL]);
});

// --- the no-secret-in-any-log-or-error sweep, proven falsifiable --------------------------------

test('a planted token never appears in any log line or thrown error message', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
  const { ensureApiToken } = await import('./prefill.mjs');

  const plantedToken = 'planted-secret-9f31c7ab2e4d';
  const logLines = [];
  let promptCalls = 0;
  const promptSecretFn = async () => {
    promptCalls += 1;
    if (promptCalls === 2) {
      // Re-armed so the retry fails too: the throwing branch is the one whose message this test
      // sweeps for the planted token.
      cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
    }
    return plantedToken;
  };

  let thrownMessage = '';
  await assert.rejects(
    () =>
      ensureApiToken({
        record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
        log: (line) => logLines.push(line),
        openBrowser: async (url, log) => log(`opened: ${url}`),
        promptSecretFn,
      }),
    (err) => {
      thrownMessage = err.message;
      return true;
    },
  );

  const haystack = [...logLines, thrownMessage].join('\n');
  assert.doesNotMatch(haystack, new RegExp(plantedToken));

  // Falsifiable: prove the assertion above is not vacuous by re-running it against a haystack
  // that does carry the planted token, and confirming it now throws.
  assert.throws(() => assert.doesNotMatch(`${haystack}\n${plantedToken}`, new RegExp(plantedToken)));
});

// --- the key list, pinned -------------------------------------------------------------------

test('the prefill permission key list is pinned', async () => {
  const { PREFILL_PERMISSION_KEYS } = await import('./prefill.mjs');
  assert.deepEqual(PREFILL_PERMISSION_KEYS, [
    { key: 'zone', type: 'edit' },
    { key: 'dns', type: 'edit' },
    { key: 'workers_scripts', type: 'edit' },
    { key: 'ssl_and_certificates', type: 'edit' },
    { key: 'email_sending', type: 'edit' },
  ]);
});

test('the prefill URL carries every pinned key at edit, plus the all-accounts/all-zones scope', async () => {
  const { PREFILL_URL, PREFILL_PERMISSION_KEYS } = await import('./prefill.mjs');
  const url = new URL(PREFILL_URL);
  const keys = JSON.parse(url.searchParams.get('permissionGroupKeys'));
  assert.deepEqual(keys, PREFILL_PERMISSION_KEYS);
  assert.equal(url.searchParams.get('accountId'), '*');
  assert.equal(url.searchParams.get('zoneId'), 'all');
});

// Both keys below were opened in the live dashboard and rendered an empty control rather than
// any error, which is the whole hazard: a wrong key is invisible until the admin's token turns
// out to be underscoped. `ssl_certs` may appear in the module's prose as the cautionary example,
// so this pins the shipped key list rather than sweeping the source text.
test('the keys observed NOT to resolve are absent from the shipped key list', async () => {
  const { PREFILL_PERMISSION_KEYS, PREFILL_URL } = await import('./prefill.mjs');
  const shipped = PREFILL_PERMISSION_KEYS.map((entry) => entry.key);
  for (const dead of ['ssl_certs', 'email']) {
    assert.ok(!shipped.includes(dead), `${dead} must not be requested`);
    assert.doesNotMatch(
      new URL(PREFILL_URL).searchParams.get('permissionGroupKeys'),
      new RegExp(`"${dead}"`),
    );
  }
});

// --- the parameterized seam, T4c task 6 -------------------------------------------------------

/** The chapter-2 PREFILL_URL, captured byte-for-byte before the seam grew a parameter. */
const CHAPTER2_URL =
  'https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22zone' +
  '%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B' +
  '%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22ssl_and_cer' +
  'tificates%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22email_sending%22%2C%22type%22%3A' +
  '%22edit%22%7D%5D&accountId=*&zoneId=all&name=cairn+create-cairn-site';

test('the chapter-2 PREFILL_URL is byte-for-byte unchanged by the seam', async () => {
  const { PREFILL_URL } = await import('./prefill.mjs');
  assert.equal(PREFILL_URL, CHAPTER2_URL);
});

test('prefillUrl() with no argument reproduces the chapter-2 URL exactly', async () => {
  const { prefillUrl } = await import('./prefill.mjs');
  assert.equal(prefillUrl(), CHAPTER2_URL);
});

test('CHAPTER3_PERMISSION_KEYS is the five chapter-2 keys plus the three verified Builds keys', async () => {
  const { PREFILL_PERMISSION_KEYS, CHAPTER3_PERMISSION_KEYS } = await import('./prefill.mjs');
  assert.deepEqual(CHAPTER3_PERMISSION_KEYS, [
    ...PREFILL_PERMISSION_KEYS,
    { key: 'workers_ci', type: 'edit' },
    { key: 'd1', type: 'edit' },
    { key: 'workers_r2', type: 'edit' },
  ]);
  assert.equal(CHAPTER3_PERMISSION_KEYS.length, 8);
});

test('prefillUrl(CHAPTER3_PERMISSION_KEYS) carries all eight keys', async () => {
  const { prefillUrl, CHAPTER3_PERMISSION_KEYS } = await import('./prefill.mjs');
  const url = new URL(prefillUrl(CHAPTER3_PERMISSION_KEYS));
  const keys = JSON.parse(url.searchParams.get('permissionGroupKeys'));
  assert.deepEqual(keys, CHAPTER3_PERMISSION_KEYS);
  assert.equal(url.searchParams.get('accountId'), '*');
  assert.equal(url.searchParams.get('zoneId'), 'all');
});

test('a token failing listZones still maps to token-scope-missing when permissionKeys is passed', async (t) => {
  const cloudflare = await setup(t);
  cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
  const { ensureApiToken, CHAPTER3_PERMISSION_KEYS } = await import('./prefill.mjs');

  let promptCalls = 0;
  const promptSecretFn = async () => {
    promptCalls += 1;
    if (promptCalls === 2) {
      cloudflare.failNext('zone_list', 403, GENERIC_SCOPE_MISSING_BODY);
    }
    return `pasted-token-attempt-${promptCalls}`;
  };

  await assert.rejects(
    () =>
      ensureApiToken({
        record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
        log: () => {},
        openBrowser: async () => {},
        promptSecretFn,
        permissionKeys: CHAPTER3_PERMISSION_KEYS,
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'token-scope-missing');
      return true;
    },
  );

  // The validation call is unchanged by permissionKeys: still listZones, still one call per
  // attempt, matching the chapter-2 path's own assertion above.
  const zoneListCalls = cloudflare.requests.filter(
    (r) => r.method === 'GET' && r.path.startsWith('/client/v4/zones'),
  );
  assert.equal(zoneListCalls.length, 2);
});

test('ensureApiToken opens the chapter-3 prefill URL when permissionKeys is passed', async (t) => {
  await setup(t);
  const { ensureApiToken, prefillUrl, CHAPTER3_PERMISSION_KEYS } = await import('./prefill.mjs');

  const openedUrls = [];
  await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    openBrowser: async (url) => {
      openedUrls.push(url);
    },
    promptSecretFn: async () => 'chapter-3-good-token',
    permissionKeys: CHAPTER3_PERMISSION_KEYS,
  });

  assert.deepEqual(openedUrls, [prefillUrl(CHAPTER3_PERMISSION_KEYS)]);
});

test('ensureApiToken opens the chapter-2 PREFILL_URL when permissionKeys is omitted', async (t) => {
  await setup(t);
  const { ensureApiToken, PREFILL_URL } = await import('./prefill.mjs');

  const openedUrls = [];
  await ensureApiToken({
    record: { dir: '/tmp/site', cloudflare: { accountId: 'acct-1' } },
    log: () => {},
    openBrowser: async (url) => {
      openedUrls.push(url);
    },
    promptSecretFn: async () => 'chapter-2-good-token',
  });

  assert.deepEqual(openedUrls, [PREFILL_URL]);
});
