import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareError } from './catalogue.mjs';

/** The exact nine codes the Cloudflare chapter's catalogue must cover, all kind: act. */
const CODES = [
  'wrangler-unavailable',
  'login-abandoned',
  'install-failed',
  'build-failed',
  'deploy-failed',
  'subdomain-unregistered',
  'migrations-failed',
  'secret-put-failed',
  'seed-failed'
];

/** Plausible params for each code, enough to exercise every interpolation. */
const SAMPLE_PARAMS = {
  'wrangler-unavailable': { dir: './alpine' },
  'login-abandoned': { dir: './alpine' },
  'install-failed': { dir: './alpine', detail: 'npm error code EACCES' },
  'build-failed': { dir: './alpine', detail: 'Error: Cannot find module vite' },
  'deploy-failed': { dir: './alpine', detail: 'ERROR: script size limit exceeded' },
  'subdomain-unregistered': { dir: './alpine' },
  'migrations-failed': { dir: './alpine', database: 'AUTH_DB', detail: 'D1_ERROR: no such table' },
  'secret-put-failed': { dir: './alpine', detail: 'ERROR: could not put secret' },
  'seed-failed': { dir: './alpine', detail: 'D1_ERROR: UNIQUE constraint failed' }
};

test('every catalogue code produces an Error whose message contains a Next: line', () => {
  for (const code of CODES) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.ok(err instanceof Error, `${code} should produce an Error`);
    assert.match(err.message, /Next:/, `${code} message should contain "Next:"`);
  }
});

test('every catalogue code reports kind: act', () => {
  for (const code of CODES) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.kind, 'act', `${code} should have kind act`);
  }
});

test('err.catalogue.code equals the requested code', () => {
  for (const code of CODES) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.code, code);
  }
});

test('err.catalogue.next is a non-empty string derived from the Next: line', () => {
  for (const code of CODES) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(typeof err.catalogue.next, 'string');
    assert.ok(err.catalogue.next.length > 0, `${code} should have a non-empty next`);
    assert.ok(!err.catalogue.next.startsWith('Next:'), `${code} next should have the label stripped`);
  }
});

test('an unknown code throws, naming the bad code', () => {
  assert.throws(() => cloudflareError('not-a-real-code', {}), /not-a-real-code/);
});

test('params interpolate into the message', () => {
  const err = cloudflareError('migrations-failed', SAMPLE_PARAMS['migrations-failed']);
  assert.match(err.message, /AUTH_DB/);
  assert.match(err.message, /\.\/alpine/);
});

test('detail renders above the Next: line when given', () => {
  for (const code of ['install-failed', 'build-failed', 'deploy-failed', 'migrations-failed', 'secret-put-failed', 'seed-failed']) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.match(err.message, new RegExp(SAMPLE_PARAMS[code].detail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const detailIndex = err.message.indexOf(SAMPLE_PARAMS[code].detail);
    const nextIndex = err.message.indexOf('Next:');
    assert.ok(detailIndex < nextIndex, `${code} detail should render above the Next: line`);
  }
});

test('the message reads sensibly when detail is absent', () => {
  for (const code of ['install-failed', 'build-failed', 'deploy-failed', 'secret-put-failed', 'seed-failed']) {
    const err = cloudflareError(code, { dir: './alpine' });
    assert.doesNotMatch(err.message, /undefined/);
    assert.match(err.message, /Next:/);
  }
});

test('wrangler-unavailable names the real cause and its exact Next: command', () => {
  const err = cloudflareError('wrangler-unavailable', { dir: './alpine' });
  assert.match(err.message, /dependencies/);
  assert.match(err.message, /not installed/);
  assert.equal(
    err.catalogue.next,
    'run npm install in ./alpine, then re-run npx create-cairn-site --dir ./alpine.'
  );
});

test('subdomain-unregistered names the workers.dev subdomain and the dashboard step', () => {
  const err = cloudflareError('subdomain-unregistered', { dir: './alpine' });
  assert.match(err.message, /workers\.dev subdomain/);
  assert.match(err.message, /dash\.cloudflare\.com/);
});

test('deploy-failed matches the plan-specified text exactly', () => {
  const err = cloudflareError('deploy-failed', { dir: './alpine', detail: 'ERROR: script size limit exceeded' });
  assert.equal(
    err.message,
    'Deploying to Cloudflare did not finish. wrangler reported:\n' +
      'ERROR: script size limit exceeded\n' +
      'Nothing on your machine was changed; a deploy that fails part-way is safe to retry.\n' +
      "Next: fix what wrangler reported above (its message names the setting or limit), then " +
      're-run npx create-cairn-site --dir ./alpine.'
  );
});

test('subdomain-unregistered matches the plan-specified text exactly', () => {
  const err = cloudflareError('subdomain-unregistered', { dir: './alpine' });
  assert.equal(
    err.message,
    'Your Cloudflare account does not have its free workers.dev subdomain yet, so the site has ' +
      'nowhere to deploy.\n' +
      'Next: open https://dash.cloudflare.com/?to=/:account/workers-and-pages and accept the ' +
      'suggested workers.dev subdomain (one click, free), then re-run npx create-cairn-site ' +
      '--dir ./alpine.'
  );
});

test('seed-failed matches the plan-specified text exactly', () => {
  const err = cloudflareError('seed-failed', { dir: './alpine', detail: 'D1_ERROR: UNIQUE constraint failed' });
  assert.equal(
    err.message,
    'The site deployed, but writing your sign-in row to its database did not finish. wrangler ' +
      'reported:\n' +
      'D1_ERROR: UNIQUE constraint failed\n' +
      'Next: re-run npx create-cairn-site --dir ./alpine; the deploy is already done and will be ' +
      'skipped, and the sign-in step starts fresh.'
  );
});
