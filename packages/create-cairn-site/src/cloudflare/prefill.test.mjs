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

/** The v4 403 envelope with no extractable permission, matching api.test.mjs's fixture. */
const GENERIC_SCOPE_MISSING_BODY = {
  success: false,
  errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }],
  messages: [],
  result: null,
};

/** The v4 400 envelope api.mjs maps onto token-invalid, matching api.test.mjs's fixture. */
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
      // same idiom api.test.mjs's 429-retry test uses to answer a second request differently.
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
      assert.doesNotMatch(err.message, new RegExp(tokenShaped.slice(8)), 'the refusal never prints the token it caught');
      assert.match(err.message, /argument 2/);
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
      assert.doesNotMatch(err.message, new RegExp(tokenShaped.slice(8)), 'the refusal never prints the token it caught');
      assert.match(err.message, /argument 2/);
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
      assert.doesNotMatch(err.message, new RegExp(tokenShaped.slice(8)));
      assert.match(err.message, /argument 1, the value of --cloudflare-token/);
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

test('CHAPTER3_PERMISSION_KEYS is the six-key chapter-2 Builds set, with no data keys', async () => {
  const { CHAPTER3_PERMISSION_KEYS, CHAPTER2_BUILDS_PERMISSION_KEYS } = await import('./prefill.mjs');
  assert.deepEqual(CHAPTER3_PERMISSION_KEYS, CHAPTER2_BUILDS_PERMISSION_KEYS);
  assert.equal(CHAPTER3_PERMISSION_KEYS.length, 6);
  const keys = CHAPTER3_PERMISSION_KEYS.map((entry) => entry.key);
  assert.ok(!keys.includes('d1') && !keys.includes('workers_r2'), 'the setup token carries no data key');
});

test('prefillUrl(CHAPTER3_PERMISSION_KEYS) carries all six keys', async () => {
  const { prefillUrl, CHAPTER3_PERMISSION_KEYS } = await import('./prefill.mjs');
  const url = new URL(prefillUrl(CHAPTER3_PERMISSION_KEYS));
  const keys = JSON.parse(url.searchParams.get('permissionGroupKeys'));
  assert.deepEqual(keys, CHAPTER3_PERMISSION_KEYS);
  assert.equal(url.searchParams.get('accountId'), '*');
  assert.equal(url.searchParams.get('zoneId'), 'all');
});

// --- the narrow build token ---------------------------------------------------------------------

test('the build-token key set is Workers Scripts, D1, and R2 at edit, and nothing else', async () => {
  const { BUILD_TOKEN_PERMISSION_KEYS } = await import('./prefill.mjs');
  assert.deepEqual(BUILD_TOKEN_PERMISSION_KEYS, [
    { key: 'workers_scripts', type: 'edit' },
    { key: 'd1', type: 'edit' },
    { key: 'workers_r2', type: 'edit' },
  ]);
});

test('the build-token prefill URL requests the three build keys under the token name cairn-build, on the one account and no zone', async () => {
  const { buildTokenPrefillUrl, BUILD_TOKEN_PERMISSION_KEYS } = await import('./prefill.mjs');
  const url = new URL(buildTokenPrefillUrl('acct-1'));
  assert.equal(url.origin + url.pathname, 'https://dash.cloudflare.com/profile/api-tokens');
  assert.deepEqual(JSON.parse(url.searchParams.get('permissionGroupKeys')), BUILD_TOKEN_PERMISSION_KEYS);
  assert.equal(url.searchParams.get('name'), 'cairn-build');
  // The build token is handed to every build, so it must not reach past the site's account.
  assert.equal(url.searchParams.get('accountId'), 'acct-1');
  assert.equal(url.searchParams.has('zoneId'), false);
});

test('the setup token prefill URL still asks for all accounts and all zones, byte for byte', async () => {
  const { prefillUrl, PREFILL_URL } = await import('./prefill.mjs');
  assert.equal(PREFILL_URL, prefillUrl());
  const url = new URL(PREFILL_URL);
  assert.equal(url.searchParams.get('accountId'), '*');
  assert.equal(url.searchParams.get('zoneId'), 'all');
  assert.equal(url.searchParams.get('name'), 'cairn create-cairn-site');
});

test('ensureBuildToken opens the build-token page, asks for the deploy token, and verifies it with its own bearer, never listZones', async (t) => {
  const cloudflare = await startFakeCloudflare({ tokenVerifyIds: { 'pasted-build-token': 'build-token-id-1' } });
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const { ensureBuildToken, buildTokenPrefillUrl } = await import('./prefill.mjs');

  const opened = [];
  const prompts = [];
  const lines = [];
  const result = await ensureBuildToken({
    dir: '/tmp/site',
    accountId: 'acct-1',
    log: (line) => lines.push(line),
    openBrowser: async (url) => {
      opened.push(url);
    },
    promptSecretFn: async (message) => {
      prompts.push(message);
      return 'pasted-build-token';
    },
    argv: [],
  });

  assert.deepEqual(result, { token: 'pasted-build-token', id: 'build-token-id-1' });
  assert.deepEqual(opened, [buildTokenPrefillUrl('acct-1')]);
  // Whether the dashboard honors the pre-selected account is unconfirmed, so the admin is told
  // to check the account scope themselves.
  assert.ok(lines.some((line) => /Account Resources/.test(line) && /this one account/.test(line)));
  assert.deepEqual(prompts, ['Paste your Workers Builds deploy token']);
  // The gate's driver answers the first prompt-table entry a line includes, so the build prompt
  // must never carry the setup token's prompt inside it.
  assert.ok(!prompts[0].includes('Paste your Cloudflare API token'));
  const verify = cloudflare.requests.filter((r) => r.path === '/client/v4/user/tokens/verify');
  assert.equal(verify.length, 1);
  assert.equal(verify[0].headers.authorization, 'Bearer pasted-build-token');
  assert.equal(
    cloudflare.requests.some((r) => r.path.startsWith('/client/v4/zones')),
    false,
    'a narrow build token has no zone read, so it must never be checked through listZones',
  );
});

test('ensureBuildToken under --yes reads CAIRN_CF_BUILD_TOKEN, never prompting or opening a browser', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');

  const result = await ensureBuildToken({
    dir: '/tmp/site',
    accountId: 'acct-1',
    log: () => {},
    yes: true,
    openBrowser: async () => {
      throw new Error('openBrowser must not be called under --yes');
    },
    promptSecretFn: async () => {
      throw new Error('promptSecretFn must not be called under --yes');
    },
    env: { CAIRN_CF_BUILD_TOKEN: 'env-build-token', CAIRN_CF_API_TOKEN: 'env-setup-token' },
    argv: [],
  });

  assert.equal(result.token, 'env-build-token');
  const verify = cloudflare.requests.find((r) => r.path === '/client/v4/user/tokens/verify');
  assert.equal(verify.headers.authorization, 'Bearer env-build-token');
});

test('ensureBuildToken fails closed when an active verify answer carries no token id', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');

  for (const result of [{ status: 'active' }, { status: 'active', id: '' }, null]) {
    cloudflare.failNext('user_token_verify', 200, { success: true, errors: [], messages: [], result });
    await assert.rejects(
      () =>
        ensureBuildToken({
          dir: '/tmp/site',
          accountId: 'acct-1',
          log: () => {},
          yes: true,
          env: { CAIRN_CF_BUILD_TOKEN: 'env-build-token' },
          argv: [],
        }),
      (err) => {
        assert.equal(err.catalogue.code, 'build-token-invalid');
        return true;
      },
    );
  }
});

test('ensureBuildToken under --yes with no CAIRN_CF_BUILD_TOKEN throws build-token-missing, making no call', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');

  await assert.rejects(
    () =>
      ensureBuildToken({
        dir: '/tmp/site',
        accountId: 'acct-1',
        log: () => {},
        yes: true,
        env: { CAIRN_CF_API_TOKEN: 'env-setup-token' },
        argv: [],
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'build-token-missing');
      assert.match(err.message, /CAIRN_CF_BUILD_TOKEN/);
      return true;
    },
  );
  assert.equal(cloudflare.requests.length, 0);
});

/**
 * What `GET /user/tokens/verify` answers for a well-formed token Cloudflare does not know,
 * captured live on 2026-11-04 with a synthetic `cfut_` bearer.
 */
const VERIFY_UNKNOWN_TOKEN_BODY = {
  success: false,
  errors: [{ code: 1000, message: 'Invalid API Token' }],
  messages: [],
  result: null,
};

/**
 * Run the interactive ensureBuildToken with a paste prompt that records each prompt and answers
 * from `pastes` in order, arming one rejected verify before each of the first `rejectCount`
 * answers (`failNext` is one-shot, so each rejection is armed just before its own verify).
 * @param {(args: object) => Promise<{ token: string, id: string }>} ensureBuildToken
 * @param {import('../../test/fake-cloudflare.mjs').FakeCloudflare} cloudflare
 * @param {string[]} pastes the successive pasted values
 * @param {number} rejectCount how many leading pastes verify rejects
 * @returns {{ pending: Promise<{ token: string, id: string }>, prompts: string[] }}
 */
function interactiveBuildToken(ensureBuildToken, cloudflare, pastes, rejectCount) {
  const prompts = [];
  const pending = ensureBuildToken({
    dir: '/tmp/site',
    accountId: 'acct-1',
    log: () => {},
    openBrowser: async () => {},
    promptSecretFn: async (message) => {
      prompts.push(message);
      if (prompts.length <= rejectCount) {
        cloudflare.failNext('user_token_verify', 401, VERIFY_UNKNOWN_TOKEN_BODY);
      }
      return pastes[prompts.length - 1];
    },
    argv: [],
  });
  return { pending, prompts };
}

test('ensureBuildToken asks once more after a paste verify rejects, and returns the second paste', async (t) => {
  const cloudflare = await startFakeCloudflare({ tokenVerifyIds: { 'second-paste': 'build-token-id-2' } });
  t.after(() => cloudflare.close());
  process.env.CAIRN_CLOUDFLARE_API_BASE = cloudflare.apiBase;
  t.after(() => {
    delete process.env.CAIRN_CLOUDFLARE_API_BASE;
  });
  const { ensureBuildToken } = await import('./prefill.mjs');

  const { pending, prompts } = interactiveBuildToken(ensureBuildToken, cloudflare, ['first-paste', 'second-paste'], 1);
  const result = await pending;

  assert.deepEqual(result, { token: 'second-paste', id: 'build-token-id-2' });
  assert.deepEqual(prompts, ['Paste your Workers Builds deploy token', 'Paste your Workers Builds deploy token']);
});

test('ensureBuildToken throws build-token-invalid when both pastes fail verify', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');

  const { pending, prompts } = interactiveBuildToken(ensureBuildToken, cloudflare, ['first-paste', 'second-paste'], 2);

  await assert.rejects(pending, (err) => {
    assert.equal(err.catalogue.code, 'build-token-invalid');
    assert.match(err.catalogue.next, /Workers Builds deploy token/);
    assert.doesNotMatch(err.message, /second-paste/);
    return true;
  });
  assert.equal(prompts.length, 2);
  const verify = cloudflare.requests.filter((r) => r.path === '/client/v4/user/tokens/verify');
  assert.equal(verify.length, 2);
});

test('ensureBuildToken under --yes throws build-token-invalid when CAIRN_CF_BUILD_TOKEN fails verify', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');
  cloudflare.failNext('user_token_verify', 401, VERIFY_UNKNOWN_TOKEN_BODY);

  await assert.rejects(
    () =>
      ensureBuildToken({
        dir: '/tmp/site',
        accountId: 'acct-1',
        log: () => {},
        yes: true,
        promptSecretFn: async () => {
          throw new Error('promptSecretFn must not be called under --yes');
        },
        env: { CAIRN_CF_BUILD_TOKEN: 'env-build-token' },
        argv: [],
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'build-token-invalid');
      assert.match(err.catalogue.next, /CAIRN_CF_BUILD_TOKEN/);
      assert.doesNotMatch(err.message, /paste/);
      return true;
    },
  );
});

test('ensureBuildToken under --yes rejects a token verify reports as expired, though the envelope says success', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');
  cloudflare.failNext('user_token_verify', 200, {
    success: true,
    errors: [],
    messages: [],
    result: { id: 'expired-token-id', status: 'expired' },
  });

  await assert.rejects(
    () =>
      ensureBuildToken({
        dir: '/tmp/site',
        accountId: 'acct-1',
        log: () => {},
        yes: true,
        env: { CAIRN_CF_BUILD_TOKEN: 'env-build-token' },
        argv: [],
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'build-token-invalid');
      assert.match(err.message, /expired/);
      return true;
    },
  );
});

test('ensureBuildToken refuses a token-shaped argv entry before any call, naming CAIRN_CF_BUILD_TOKEN', async (t) => {
  const cloudflare = await setup(t);
  const { ensureBuildToken } = await import('./prefill.mjs');
  const tokenShaped = `cfut_${'D'.repeat(48)}`;

  await assert.rejects(
    () =>
      ensureBuildToken({
        dir: '/tmp/site',
        accountId: 'acct-1',
        log: () => {},
        yes: true,
        env: { CAIRN_CF_BUILD_TOKEN: 'env-build-token' },
        argv: ['--yes', tokenShaped],
      }),
    (err) => {
      assert.match(err.message, /CAIRN_CF_BUILD_TOKEN/);
      assert.doesNotMatch(err.message, new RegExp(tokenShaped.slice(8)), 'the refusal never prints the token it caught');
      assert.match(err.message, /argument 2/);
      return true;
    },
  );
  assert.equal(cloudflare.requests.length, 0);
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
  // attempt, matching the chapter-2 path's assertion above.
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
