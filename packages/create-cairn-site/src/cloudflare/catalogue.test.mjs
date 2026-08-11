import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareError, CATALOGUE_CODES } from './catalogue.mjs';

/**
 * Every catalogue code, mapped to its expected kind. Kept as a table (not a flat list) so a
 * row's `kind` is asserted individually, and a guard test below proves the table covers every
 * key the module actually exports rows for.
 */
const EXPECTED_KIND = {
  'wrangler-unavailable': 'act',
  'login-abandoned': 'act',
  'install-failed': 'act',
  'build-failed': 'act',
  'deploy-failed': 'act',
  'subdomain-unregistered': 'act',
  'migrations-failed': 'act',
  'secret-put-failed': 'act',
  'seed-failed': 'act',
  'account-ambiguous': 'act',
  'token-invalid': 'act',
  'token-scope-missing': 'act',
  'zone-already-exists': 'act',
  'zone-create-failed': 'act',
  'records-read-failed': 'act',
  'dns-record-failed': 'act',
  'carry-over-declined': 'act',
  'delegation-pending': 'wait',
  'delegation-wrong-nameservers': 'act',
  'hostname-propagating': 'wait',
  'hostname-not-serving': 'act',
  'custom-domain-failed': 'act',
  'cutover-deploy-failed': 'act'
};

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
  'seed-failed': { dir: './alpine', detail: 'D1_ERROR: UNIQUE constraint failed' },
  'account-ambiguous': { dir: './alpine' },
  'token-invalid': { dir: './alpine', detail: '400: Invalid request headers (6003)' },
  'token-scope-missing': {
    dir: './alpine',
    permission: 'com.cloudflare.api.account.zone.create'
  },
  'zone-already-exists': { dir: './alpine', domain: 'example.com' },
  'zone-create-failed': { dir: './alpine', detail: '500: Internal Server Error' },
  'records-read-failed': { dir: './alpine' },
  'dns-record-failed': { dir: './alpine', detail: 'some API detail' },
  'carry-over-declined': { dir: './alpine' },
  'delegation-pending': {
    dir: './alpine',
    domain: 'example.com',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com']
  },
  'delegation-wrong-nameservers': {
    dir: './alpine',
    domain: 'example.com',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com'],
    actual: ['ns1.otheragency.com', 'ns2.otheragency.com']
  },
  'hostname-propagating': { dir: './alpine' },
  'hostname-not-serving': { dir: './alpine', domain: 'example.com' },
  'custom-domain-failed': { dir: './alpine', detail: '409: hostname already exists' },
  'cutover-deploy-failed': { dir: './alpine', detail: 'ERROR: script size limit exceeded' }
};

test('the expected-kind table covers every code the module has rows for', () => {
  const actualCodes = [...CATALOGUE_CODES].sort();
  const tableCodes = Object.keys(EXPECTED_KIND).sort();
  assert.deepEqual(
    tableCodes,
    actualCodes,
    'EXPECTED_KIND must list exactly the catalogue codes; add a row here for any new code'
  );
});

test('every catalogue code produces an Error whose message contains a Next: line', () => {
  for (const code of Object.keys(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.ok(err instanceof Error, `${code} should produce an Error`);
    assert.match(err.message, /Next:/, `${code} message should contain "Next:"`);
    assert.ok(err.message.trim().length > 0, `${code} message should be non-empty`);
  }
});

test('every catalogue code reports its expected kind', () => {
  for (const [code, kind] of Object.entries(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.kind, kind, `${code} should have kind ${kind}`);
  }
});

test('err.catalogue.code equals the requested code', () => {
  for (const code of Object.keys(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.code, code);
  }
});

test('err.catalogue.next is a non-empty string derived from the Next: line', () => {
  for (const code of Object.keys(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.equal(typeof err.catalogue.next, 'string');
    assert.ok(err.catalogue.next.length > 0, `${code} should have a non-empty next`);
    assert.ok(!err.catalogue.next.startsWith('Next:'), `${code} next should have the label stripped`);
  }
});

test('no row prints an em dash', () => {
  for (const code of Object.keys(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.ok(!err.message.includes('—'), `${code} message should not contain an em dash`);
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
  for (const code of [
    'install-failed',
    'build-failed',
    'deploy-failed',
    'migrations-failed',
    'secret-put-failed',
    'seed-failed',
    'token-invalid',
    'zone-create-failed',
    'custom-domain-failed',
    'cutover-deploy-failed'
  ]) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    assert.match(err.message, new RegExp(SAMPLE_PARAMS[code].detail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const detailIndex = err.message.indexOf(SAMPLE_PARAMS[code].detail);
    const nextIndex = err.message.indexOf('Next:');
    assert.ok(detailIndex < nextIndex, `${code} detail should render above the Next: line`);
  }
});

test('the message reads sensibly when detail is absent', () => {
  for (const code of [
    'install-failed',
    'build-failed',
    'deploy-failed',
    'secret-put-failed',
    'seed-failed',
    'token-invalid',
    'zone-create-failed',
    'custom-domain-failed',
    'cutover-deploy-failed'
  ]) {
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

test('seed-failed names the address and the allowlist when the reason is not-allowlisted', () => {
  const err = cloudflareError('seed-failed', {
    dir: './alpine',
    reason: 'not-allowlisted',
    email: 'stray@example.com'
  });
  assert.match(err.message, /stray@example\.com/);
  assert.match(err.message, /allowlist/);
  assert.match(err.message, /not on it/);
  assert.match(err.message, /--sign-in/);
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

test('token-scope-missing names the permission when given one', () => {
  const err = cloudflareError('token-scope-missing', {
    dir: './alpine',
    permission: 'com.cloudflare.api.account.zone.create'
  });
  assert.match(err.message, /com\.cloudflare\.api\.account\.zone\.create/);
});

test('token-scope-missing does not print undefined when no permission is given', () => {
  const err = cloudflareError('token-scope-missing', { dir: './alpine' });
  assert.doesNotMatch(err.message, /undefined/);
  assert.match(err.message, /Next:/);
  assert.match(err.message, /missing a permission/);
});

test('delegation-wrong-nameservers prints both the assigned pair and what was found', () => {
  const err = cloudflareError('delegation-wrong-nameservers', SAMPLE_PARAMS['delegation-wrong-nameservers']);
  assert.match(err.message, /ada\.ns\.cloudflare\.com/);
  assert.match(err.message, /walt\.ns\.cloudflare\.com/);
  assert.match(err.message, /ns1\.otheragency\.com/);
  assert.match(err.message, /ns2\.otheragency\.com/);
});

test('delegation-wrong-nameservers explains the one-pair-per-account fact rather than blaming a typo', () => {
  const err = cloudflareError('delegation-wrong-nameservers', SAMPLE_PARAMS['delegation-wrong-nameservers']);
  assert.match(err.message, /different Cloudflare/);
  assert.match(err.message, /not that the nameservers were mistyped/);
});

test('the wait rows read as normal progress, not failures', () => {
  const pending = cloudflareError('delegation-pending', SAMPLE_PARAMS['delegation-pending']);
  assert.match(pending.message, /normal/);
  const propagating = cloudflareError('hostname-propagating', SAMPLE_PARAMS['hostname-propagating']);
  assert.match(propagating.message, /normal/);
});

test('carry-over-declined reads as a recorded decision, not an error', () => {
  const err = cloudflareError('carry-over-declined', { dir: './alpine' });
  assert.match(err.message, /chose not to/);
  assert.match(err.message, /recorded/);
});

test('cutover-deploy-failed says the site is still working on workers.dev with nothing half-changed', () => {
  const err = cloudflareError('cutover-deploy-failed', SAMPLE_PARAMS['cutover-deploy-failed']);
  assert.match(err.message, /workers\.dev/);
  assert.match(err.message, /restored/);
  assert.match(err.message, /still working/);
});
