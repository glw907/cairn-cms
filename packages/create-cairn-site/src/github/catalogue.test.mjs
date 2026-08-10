import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterError } from './catalogue.mjs';

/** The exact eight recoverable codes the catalogue must cover, and no others. */
const KINDS = {
  'browser-step-abandoned': 'act',
  'manifest-window-expired': 'act',
  'code-expired': 'act',
  'repo-name-collision': 'act',
  'sso-blocked': 'ask-someone',
  'org-approval-pending': 'ask-someone',
  'installation-not-covering-repo': 'act',
  'push-interrupted': 'act'
};

/** Plausible params for each code, enough to exercise every interpolation. */
const SAMPLE_PARAMS = {
  'browser-step-abandoned': {
    step: 'manifest',
    dir: './alpine',
    appName: 'Alpine Club CMS',
    webBase: 'https://github.com'
  },
  'manifest-window-expired': {
    dir: './alpine',
    appName: 'Alpine Club CMS',
    webBase: 'https://github.com'
  },
  'code-expired': { dir: './alpine' },
  'repo-name-collision': { dir: './alpine', repo: 'alpine-club-cms', owner: 'alpine-club' },
  'sso-blocked': {
    dir: './alpine',
    org: 'alpine-club',
    appName: 'Alpine Club CMS',
    webBase: 'https://github.com'
  },
  'org-approval-pending': { dir: './alpine', org: 'alpine-club', appName: 'Alpine Club CMS' },
  'installation-not-covering-repo': {
    dir: './alpine',
    repo: 'alpine-club-cms',
    webBase: 'https://github.com'
  },
  'push-interrupted': { dir: './alpine' }
};

test('every catalogue code produces an Error whose message contains a Next: line', () => {
  for (const code of Object.keys(KINDS)) {
    const err = chapterError(code, SAMPLE_PARAMS[code]);
    assert.ok(err instanceof Error, `${code} should produce an Error`);
    assert.match(err.message, /Next:/, `${code} message should contain "Next:"`);
  }
});

test('every catalogue code reports the kind from the table', () => {
  for (const [code, kind] of Object.entries(KINDS)) {
    const err = chapterError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.kind, kind, `${code} should have kind ${kind}`);
  }
});

test('err.catalogue.code equals the requested code', () => {
  for (const code of Object.keys(KINDS)) {
    const err = chapterError(code, SAMPLE_PARAMS[code]);
    assert.equal(err.catalogue.code, code);
  }
});

test('an unknown code throws, naming the bad code', () => {
  assert.throws(() => chapterError('not-a-real-code', {}), /not-a-real-code/);
});

test('there is no consent-denied or app-name-collision code', () => {
  // Declining consent is a normal return, not an error; and the tool cannot observe GitHub's
  // re-rendered manifest form, so that recovery lives in printed wait copy elsewhere.
  assert.throws(() => chapterError('consent-denied', {}));
  assert.throws(() => chapterError('app-name-collision', {}));
});

test('params interpolate into the message', () => {
  const err = chapterError('org-approval-pending', SAMPLE_PARAMS['org-approval-pending']);
  assert.match(err.message, /alpine-club/);
});

test('browser-step-abandoned differs by step, and both end in a Next: line', () => {
  const manifestErr = chapterError('browser-step-abandoned', SAMPLE_PARAMS['browser-step-abandoned']);
  const installErr = chapterError('browser-step-abandoned', {
    step: 'install',
    dir: './alpine',
    appName: 'Alpine Club CMS'
  });
  assert.notEqual(manifestErr.message, installErr.message);
  for (const err of [manifestErr, installErr]) {
    const lines = err.message.split('\n');
    assert.ok(lines.at(-1).startsWith('Next:'), 'message should end with a Next: line');
  }
});

test('browser-step-abandoned (step=manifest) matches the exact specified text', () => {
  const err = chapterError('browser-step-abandoned', {
    step: 'manifest',
    dir: './alpine',
    appName: 'Alpine Club CMS',
    webBase: 'https://github.com'
  });
  assert.equal(
    err.message,
    'The browser step was not completed, so nothing was collected from GitHub. If you saw a ' +
      'GitHub page saying the App name is already taken, that is the cause.\n' +
      'Next: re-run npx create-cairn-site --dir ./alpine (add --app-name <a-new-name> if the ' +
      'name was taken). If an App named Alpine Club CMS now exists at ' +
      'https://github.com/settings/apps, delete it there first.'
  );
});

test('manifest-window-expired matches the exact specified text', () => {
  const err = chapterError('manifest-window-expired', {
    dir: './alpine',
    appName: 'Alpine Club CMS',
    webBase: 'https://github.com'
  });
  assert.equal(
    err.message,
    "GitHub's one-hour window for collecting the new App's credentials has passed, so the App " +
      '(Alpine Club CMS) may exist while its key was never collected and cannot be recovered.\n' +
      'Next: delete the App at https://github.com/settings/apps if it exists, then re-run npx ' +
      'create-cairn-site --dir ./alpine (pick a new name with --app-name if the old one is taken).'
  );
});

test('org-approval-pending matches the exact specified text', () => {
  const err = chapterError('org-approval-pending', {
    dir: './alpine',
    org: 'alpine-club',
    appName: 'Alpine Club CMS'
  });
  assert.equal(
    err.message,
    'Your organization (alpine-club) requires an owner to approve installing Alpine Club CMS. ' +
      'GitHub has already notified the owners; nothing is lost, and this run has saved its ' +
      'progress.\n' +
      'Next: once an owner approves (they were emailed; the pending request is under the ' +
      "organization's Settings), re-run npx create-cairn-site --dir ./alpine and the tool will " +
      'pick up where it left off.'
  );
});
