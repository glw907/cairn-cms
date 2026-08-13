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
  'account-lookup-failed': 'act',
  'token-invalid': 'act',
  'token-scope-missing': 'act',
  'zone-already-exists': 'act',
  'zone-hold': 'ask-someone',
  'domain-invalid': 'act',
  'zone-create-failed': 'act',
  'records-read-failed': 'act',
  'dns-record-failed': 'act',
  'carry-over-declined': 'declined',
  'records-unverified': 'act',
  'delegation-propagating': 'wait',
  'delegation-pending': 'wait',
  'delegation-wrong-nameservers': 'act',
  'hostname-records-absent': 'wait',
  'hostname-resolver-lagging': 'wait',
  'certificate-pending': 'wait',
  'hostname-not-serving': 'act',
  'custom-domain-failed': 'act',
  'cutover-deploy-failed': 'act',
  'paid-plan-declined': 'declined',
  'paid-plan-missing': 'act',
  'email-onboarding-failed': 'act',
  'email-not-ready': 'wait',
  'email-sender-propagating': 'wait',
  'email-sender-unavailable': 'act',
  'email-daily-limit': 'wait',
  'email-send-failed': 'act',
  'builds-app-not-authorized': 'wait',
  'builds-repo-not-selected': 'wait',
  'builds-connect-declined': 'declined',
  'build-not-started': 'wait',
  'build-running': 'wait',
  'builds-deploy-failed': 'act',
  'builds-not-runnable': 'act',
  'builds-reconcile-parked': 'wait'
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
  'zone-hold': { dir: './alpine', domain: 'example.com' },
  'domain-invalid': { dir: './alpine', domain: 'not a domain' },
  'zone-create-failed': { dir: './alpine', detail: '500: Internal Server Error' },
  'records-read-failed': { dir: './alpine' },
  'dns-record-failed': { dir: './alpine', detail: 'some API detail' },
  'carry-over-declined': { dir: './alpine' },
  'records-unverified': { dir: './alpine', domain: 'example.com' },
  'delegation-propagating': {
    dir: './alpine',
    domain: 'example.com',
    nameServers: ['ada.ns.cloudflare.com', 'walt.ns.cloudflare.com']
  },
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
  'hostname-records-absent': { dir: './alpine', domain: 'example.com' },
  'hostname-resolver-lagging': { dir: './alpine', domain: 'example.com' },
  'certificate-pending': { dir: './alpine', domain: 'example.com' },
  'hostname-not-serving': { dir: './alpine', domain: 'example.com' },
  'custom-domain-failed': { dir: './alpine', detail: '409: hostname already exists' },
  'cutover-deploy-failed': { dir: './alpine', detail: 'ERROR: script size limit exceeded' },
  'paid-plan-declined': { dir: './alpine' },
  'paid-plan-missing': { dir: './alpine' },
  'email-onboarding-failed': { dir: './alpine', detail: 'Cloudflare: 403 not entitled' },
  'email-not-ready': { dir: './alpine', domain: 'example.com' },
  'email-sender-propagating': { dir: './alpine' },
  'email-sender-unavailable': { dir: './alpine', domain: 'example.com' },
  'email-daily-limit': { dir: './alpine' },
  'email-send-failed': { dir: './alpine', detail: 'Cloudflare: 429 rate limited' },
  'builds-app-not-authorized': { dir: './alpine' },
  'builds-repo-not-selected': { dir: './alpine', owner: 'glw907', repo: 'alpine' },
  'builds-connect-declined': { dir: './alpine' },
  'build-not-started': { dir: './alpine' },
  'build-running': { dir: './alpine' },
  'builds-deploy-failed': {
    dir: './alpine',
    detail: 'Failed: error occurred while running deploy command',
    buildUrl: 'https://dash.cloudflare.com/acct/workers/services/view/alpine/production/builds/abc'
  },
  'builds-not-runnable': {
    dir: './alpine',
    outcome: 'skipped',
    buildUrl: 'https://dash.cloudflare.com/acct/workers/services/view/alpine/production/builds/abc'
  },
  'builds-reconcile-parked': { dir: './alpine' }
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

test('every catalogue code message ends in exactly one Next: line', () => {
  for (const code of Object.keys(EXPECTED_KIND)) {
    const err = cloudflareError(code, SAMPLE_PARAMS[code]);
    const nextLines = err.message.split('\n').filter((line) => line.startsWith('Next:'));
    assert.equal(nextLines.length, 1, `${code} should have exactly one Next: line`);
    assert.ok(err.message.trimEnd().endsWith(nextLines[0]), `${code} message should end with its Next: line`);
  }
});

test('the Builds rows add exactly eight codes, none colliding with build-failed or build-not-runnable', () => {
  // 37 pre-Builds codes, plus Task 2's split: hostname-propagating retired (-1), replaced by
  // hostname-records-absent and hostname-resolver-lagging (+2).
  const BASELINE_CODE_COUNT = 38;
  const NEW_BUILDS_CODES = [
    'builds-app-not-authorized',
    'builds-repo-not-selected',
    'builds-connect-declined',
    'build-not-started',
    'build-running',
    'builds-deploy-failed',
    'builds-not-runnable',
    'builds-reconcile-parked'
  ];
  assert.equal(
    CATALOGUE_CODES.length,
    BASELINE_CODE_COUNT + NEW_BUILDS_CODES.length,
    'CATALOGUE_CODES should have grown by exactly the number of new Builds rows'
  );
  assert.ok(CATALOGUE_CODES.includes('build-failed'), 'build-failed (chapter 1) must survive untouched');
  assert.ok(!CATALOGUE_CODES.includes('build-not-runnable'), 'build-not-runnable must never be used as a name');
  for (const code of NEW_BUILDS_CODES) {
    assert.ok(CATALOGUE_CODES.includes(code), `${code} should be a catalogue code`);
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
    'cutover-deploy-failed',
    'email-onboarding-failed',
    'email-send-failed'
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
    'cutover-deploy-failed',
    'email-onboarding-failed',
    'email-send-failed'
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

test('zone-already-exists reads as a foreign-owner case, with no own-account branch', () => {
  const err = cloudflareError('zone-already-exists', SAMPLE_PARAMS['zone-already-exists']);
  assert.match(err.message, /account other than/);
  assert.doesNotMatch(err.message, /on your own account/);
});

test('zone-hold says the hold clears at the current Cloudflare account, not the registrar', () => {
  const err = cloudflareError('zone-hold', SAMPLE_PARAMS['zone-hold']);
  assert.match(err.message, /current Cloudflare account/);
  assert.match(err.message, /not at your registrar/);
});

test('domain-invalid names the offending domain', () => {
  const err = cloudflareError('domain-invalid', SAMPLE_PARAMS['domain-invalid']);
  assert.match(err.message, /not a domain/);
  assert.match(err.message, /not a valid domain name/);
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
  const recordsAbsent = cloudflareError('hostname-records-absent', SAMPLE_PARAMS['hostname-records-absent']);
  assert.match(recordsAbsent.message, /normal/);
  const resolverLagging = cloudflareError('hostname-resolver-lagging', SAMPLE_PARAMS['hostname-resolver-lagging']);
  assert.match(resolverLagging.message, /not a real problem/);
});

test('hostname-records-absent and hostname-resolver-lagging read as distinct diagnoses, never producing the retired hostname-propagating code', () => {
  const recordsAbsent = cloudflareError('hostname-records-absent', SAMPLE_PARAMS['hostname-records-absent']);
  const resolverLagging = cloudflareError('hostname-resolver-lagging', SAMPLE_PARAMS['hostname-resolver-lagging']);
  assert.notEqual(recordsAbsent.message, resolverLagging.message);
  assert.equal(recordsAbsent.catalogue.code, 'hostname-records-absent');
  assert.equal(resolverLagging.catalogue.code, 'hostname-resolver-lagging');
  assert.ok(!CATALOGUE_CODES.includes('hostname-propagating'), 'hostname-propagating must be retired');
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

test('carry-over-declined now reports the declined kind', () => {
  const err = cloudflareError('carry-over-declined', { dir: './alpine' });
  assert.equal(err.catalogue.kind, 'declined');
});

test('paid-plan-declined names what still and does not still work, the --sign-in path, and the 30-day window', () => {
  const err = cloudflareError('paid-plan-declined', { dir: './alpine' });
  assert.match(err.message, /still working/);
  assert.match(err.message, /editing and publishing/);
  assert.match(err.message, /signing in/);
  assert.ok(err.message.includes('--sign-in'), 'should name the --sign-in recovery command');
  assert.ok(err.message.includes('./alpine'), 'should interpolate dir');
  assert.ok(err.message.includes('30 days'), 'should name the 30-day sign-in window');
});

test('paid-plan-declined differs between its first and re-offered forms', () => {
  const first = cloudflareError('paid-plan-declined', { dir: './alpine' });
  const reoffered = cloudflareError('paid-plan-declined', { dir: './alpine', reoffered: true });
  assert.notEqual(first.message, reoffered.message);
  assert.match(reoffered.message, /Next:/);
});

test('paid-plan-missing deep-links the plan page and states the price', () => {
  const err = cloudflareError('paid-plan-missing', { dir: './alpine' });
  assert.match(err.message, /\$5/);
  assert.match(err.message, /dash\.cloudflare\.com/);
  assert.match(err.message, /Next:/);
});

test("email-not-ready reassures the site is untouched, matching delegation-pending's tone", () => {
  const err = cloudflareError('email-not-ready', SAMPLE_PARAMS['email-not-ready']);
  assert.match(err.message, /normal/);
  assert.match(err.message, /untouched and still working/);
});

test('email-sender-propagating names the documented 5-to-15-minute window', () => {
  const err = cloudflareError('email-sender-propagating', SAMPLE_PARAMS['email-sender-propagating']);
  assert.match(err.message, /5 to 15 minutes/);
});

test('email-sender-unavailable names re-running and a dashboard check', () => {
  const err = cloudflareError('email-sender-unavailable', SAMPLE_PARAMS['email-sender-unavailable']);
  assert.match(err.message, /dashboard/);
  assert.match(err.message, /Next:/);
});

test('email-daily-limit explains the ramp and names both waiting and the limit-increase form', () => {
  const err = cloudflareError('email-daily-limit', SAMPLE_PARAMS['email-daily-limit']);
  assert.match(err.message, /ramp|rises|improves/);
  assert.match(err.message, /wait/i);
  assert.match(err.message, /email-service\/platform\/limits/);
});

test('builds-app-not-authorized never quotes the platform message and prints the dashboard link', () => {
  const err = cloudflareError('builds-app-not-authorized', SAMPLE_PARAMS['builds-app-not-authorized']);
  assert.match(err.message, /has not authorized/);
  assert.doesNotMatch(err.message, /disconnected from your Git account/);
  assert.match(err.message, /dash\.cloudflare\.com/);
  assert.equal(err.catalogue.kind, 'wait');
  assert.match(err.catalogue.next, /--connect/);
});

test('builds-repo-not-selected never quotes the platform message and prints the GitHub installations link', () => {
  const err = cloudflareError('builds-repo-not-selected', SAMPLE_PARAMS['builds-repo-not-selected']);
  assert.match(err.message, /glw907\/alpine/);
  assert.doesNotMatch(err.message, /no longer exists/);
  assert.match(err.message, /github\.com\/settings\/installations/);
  assert.equal(err.catalogue.kind, 'wait');
});

test('builds-connect-declined names --connect as the way back in and is a declined kind', () => {
  const err = cloudflareError('builds-connect-declined', SAMPLE_PARAMS['builds-connect-declined']);
  assert.equal(err.catalogue.kind, 'declined');
  assert.match(err.message, /chose not to/);
  assert.match(err.message, /recorded/);
  assert.match(err.catalogue.next, /--connect/);
});

test('build-not-started and build-running are wait rows that name a plain re-run', () => {
  const notStarted = cloudflareError('build-not-started', SAMPLE_PARAMS['build-not-started']);
  assert.equal(notStarted.catalogue.kind, 'wait');
  assert.match(notStarted.message, /no matching build/);

  const running = cloudflareError('build-running', SAMPLE_PARAMS['build-running']);
  assert.equal(running.catalogue.kind, 'wait');
  assert.match(running.message, /still running/);
});

test('builds-deploy-failed carries the log tail and the build dashboard link', () => {
  const err = cloudflareError('builds-deploy-failed', SAMPLE_PARAMS['builds-deploy-failed']);
  assert.equal(err.catalogue.kind, 'act');
  assert.match(err.message, /error occurred while running deploy command/);
  assert.match(err.message, /dash\.cloudflare\.com/);
  assert.match(err.message, /log ends with/);
});

test('builds-deploy-failed says the log was truncated, not that it ends there, when logTruncated is set', () => {
  const err = cloudflareError('builds-deploy-failed', {
    ...SAMPLE_PARAMS['builds-deploy-failed'],
    logTruncated: true,
  });
  assert.doesNotMatch(err.message, /log ends with/);
  assert.match(err.message, /too long/);
  assert.match(err.message, /error occurred while running deploy command/);
});

test('builds-not-runnable names which outcome (skipped or cancelled) it was', () => {
  const skipped = cloudflareError('builds-not-runnable', SAMPLE_PARAMS['builds-not-runnable']);
  assert.match(skipped.message, /skipped/);
  const cancelled = cloudflareError('builds-not-runnable', {
    ...SAMPLE_PARAMS['builds-not-runnable'],
    outcome: 'cancelled'
  });
  assert.match(cancelled.message, /cancelled/);
  assert.equal(cancelled.catalogue.kind, 'act');
});

test('builds-reconcile-parked names the interactive re-run without --yes', () => {
  const err = cloudflareError('builds-reconcile-parked', SAMPLE_PARAMS['builds-reconcile-parked']);
  assert.equal(err.catalogue.kind, 'wait');
  assert.match(err.message, /--yes/);
  assert.match(err.catalogue.next, /without --yes/);
});
