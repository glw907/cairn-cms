import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { makeFakeBin } from '../../test/fake-bin.mjs';

const dir = tmpdir();

/**
 * A realistic `wrangler whoami --json` transcript, pinned live 2026-08-11: a skills-availability
 * banner line lands ahead of the opening brace, so a naive `JSON.parse(stdout)` throws on it.
 */
const WHOAMI_JSON_WITH_PREAMBLE =
  'Cloudflare agent skills are available for: Claude Code. Run wrangler in an interactive ' +
  'terminal to install them, or use `--install-skills` to install without prompting.\n' +
  JSON.stringify({
    loggedIn: true,
    authType: 'User API Token',
    accounts: [{ id: '120c269ad6d3dfbe6d63a0bb53758ca0', name: 'glw907', type: 'standard' }],
  });

const ONE_ACCOUNT_JSON = JSON.stringify({
  loggedIn: true,
  accounts: [{ id: 'account-one', name: 'Solo Account' }],
});

const TWO_ACCOUNTS_JSON = JSON.stringify({
  loggedIn: true,
  accounts: [
    { id: 'account-one', name: 'First Account' },
    { id: 'account-two', name: 'Second Account' },
  ],
});

/** A prompt seam that fails the test if it is ever called. */
const throwingPrompt = async () => {
  throw new Error('prompt must not be called');
};

test('a record already carrying accountId is returned with zero invocations and no enumeration', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureAccountId } = await import('./account.mjs');
  const result = await ensureAccountId({
    record: { cloudflare: { accountId: 'already-saved-id' } },
    dir,
    yes: false,
    prompt: throwingPrompt,
    log: () => {},
  });

  assert.deepEqual(result, { accountId: 'already-saved-id', learned: false });
  assert.deepEqual(await fake.invocations(), []);
});

test('exactly one account is used with no prompt, and learned is true', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 0, stdout: ONE_ACCOUNT_JSON });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureAccountId } = await import('./account.mjs');
  const result = await ensureAccountId({
    record: null,
    dir,
    yes: false,
    prompt: throwingPrompt,
    log: () => {},
  });

  assert.deepEqual(result, { accountId: 'account-one', learned: true });
});

test('several accounts prompts once and returns the chosen id', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 0, stdout: TWO_ACCOUNTS_JSON });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  let promptCalls = 0;
  const prompt = async (options) => {
    promptCalls += 1;
    assert.deepEqual(options.options, [
      { value: 'account-one', label: 'First Account' },
      { value: 'account-two', label: 'Second Account' },
    ]);
    return 'account-two';
  };

  const { ensureAccountId } = await import('./account.mjs');
  const result = await ensureAccountId({ record: null, dir, yes: false, prompt, log: () => {} });

  assert.deepEqual(result, { accountId: 'account-two', learned: true });
  assert.equal(promptCalls, 1);
});

test('several accounts with yes rejects with the account-ambiguous catalogue error', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 0, stdout: TWO_ACCOUNTS_JSON });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureAccountId } = await import('./account.mjs');

  await assert.rejects(
    () => ensureAccountId({ record: null, dir, yes: true, prompt: throwingPrompt, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'account-ambiguous');
      return true;
    },
  );
});

test('a preamble line ahead of the JSON still parses correctly', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 0, stdout: WHOAMI_JSON_WITH_PREAMBLE });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  // Falsifiable: a naive JSON.parse(stdout) throws on this exact fixture, since it opens with a
  // non-JSON banner line. Proven here before trusting the real implementation's own parse.
  assert.throws(() => JSON.parse(WHOAMI_JSON_WITH_PREAMBLE));

  const { ensureAccountId } = await import('./account.mjs');
  const result = await ensureAccountId({
    record: null,
    dir,
    yes: false,
    prompt: throwingPrompt,
    log: () => {},
  });

  assert.deepEqual(result, { accountId: '120c269ad6d3dfbe6d63a0bb53758ca0', learned: true });
});

test('a non-zero whoami exit surfaces a catalogue error, not a raw parse crash', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', { code: 1, stderr: 'Not logged in.' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { ensureAccountId } = await import('./account.mjs');

  await assert.rejects(
    () => ensureAccountId({ record: null, dir, yes: false, prompt: throwingPrompt, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'login-abandoned');
      return true;
    },
  );
});
