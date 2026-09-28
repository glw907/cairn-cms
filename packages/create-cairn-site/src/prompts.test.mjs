import test from 'node:test';
import assert from 'node:assert/strict';
import { promptSecret, collectAnswers } from './prompts.mjs';

// promptSecret and collectAnswers's new aiPosture question are covered here. exitOnCancel,
// resolveField, and collectAnswers's older fields (name, description, brandColor, dir) predate
// this test file and are left alone rather than backfilled.
//
// Every case below supplies every OTHER field as a flag too, so none of them ever reaches a real
// interactive prompt: collectAnswers has no injectable text/select seam, so a case that left one
// of those fields unanswered under a non-`--yes` flag set would hang on stdin in this suite.
const OTHER_FIELDS = { name: 'Alpine Club', description: '', brandColor: '', dir: 'alpine-club' };

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

test('an explicit --ai-posture flag wins even under --yes', async () => {
  const answers = await collectAnswers({ ...OTHER_FIELDS, yes: true, aiPosture: 'decline' });
  assert.equal(answers.aiPosture, 'decline');
});

test('an explicit --ai-posture flag wins with no --yes too', async () => {
  const answers = await collectAnswers({ ...OTHER_FIELDS, yes: false, aiPosture: 'invite' });
  assert.equal(answers.aiPosture, 'invite');
});

test('--yes with no --ai-posture flag defaults to "none", no preference', async () => {
  const answers = await collectAnswers({ ...OTHER_FIELDS, yes: true });
  assert.equal(answers.aiPosture, 'none');
});

test('an --ai-posture value outside decline/invite/none throws naming the flag', async () => {
  await assert.rejects(
    () => collectAnswers({ ...OTHER_FIELDS, yes: true, aiPosture: 'sure' }),
    /aiPosture/,
  );
});
