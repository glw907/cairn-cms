import test from 'node:test';
import assert from 'node:assert/strict';
import { promptSecret } from './prompts.mjs';

// Only promptSecret is covered here: it is the sole new export this pass adds to prompts.mjs,
// and the file's older helpers (exitOnCancel, resolveField, collectAnswers) predate this test
// file and are left alone rather than backfilled.

test('promptSecret forwards the message to the injected prompt and returns its answer', async () => {
  let receivedOpts;
  const fakePassword = async (opts) => {
    receivedOpts = opts;
    return 'pasted-secret-value';
  };

  const result = await promptSecret('Paste your Cloudflare API token', fakePassword);

  assert.equal(result, 'pasted-secret-value');
  assert.deepEqual(receivedOpts, { message: 'Paste your Cloudflare API token' });
});

test('promptSecret takes only the message as required, leaving the prompt seam optional', () => {
  // The real @clack/prompts default cannot be exercised here (it would need an interactive
  // terminal), and a default parameter's value is not readable from outside the function, so
  // what this pins is the arity: a caller that passes a message alone is on a supported
  // signature, and turning passwordFn into a second required parameter would fail here.
  assert.equal(promptSecret.length, 1);
});
