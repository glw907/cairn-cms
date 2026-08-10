import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './args.mjs';

test('parses flags and defaults', () => {
  const a = parseArgs(['--dry-run', '--name', 'Alpine Club', '--dir', './alpine']);
  assert.equal(a.dryRun, true);
  assert.equal(a.name, 'Alpine Club');
  assert.equal(a.dir, './alpine');
  assert.equal(a.yes, false);
});

test('unknown flag throws with the flag named', () => {
  assert.throws(() => parseArgs(['--frob']), /--frob/);
});

// Regression: naming the offending flag by scanning argv for the first dash-token reports the
// wrong one whenever a valid option precedes the bad one, which is the common case.
test('a valid option before the bad one does not steal the blame', () => {
  assert.throws(() => parseArgs(['--name', 'X', '--frob']), /--frob/);
  assert.doesNotThrow(() => {
    try {
      parseArgs(['--name', 'X', '--frob']);
    } catch (err) {
      assert.ok(!err.message.includes('--name'), err.message);
    }
  });
});

test('a missing option value is reported as such, not as an unknown option', () => {
  assert.throws(() => parseArgs(['--name']), /argument missing/);
});

test('parses the GitHub chapter flags and their defaults', () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.appName, undefined);
  assert.equal(defaults.org, undefined);
  assert.equal(defaults.repoName, undefined);
  assert.equal(defaults.github, false);
  assert.equal(defaults.startOver, false);

  const a = parseArgs([
    '--app-name', 'cairn-alpine-club',
    '--org', 'alpine-org',
    '--repo-name', 'alpine-site',
    '--github',
    '--start-over',
  ]);
  assert.equal(a.appName, 'cairn-alpine-club');
  assert.equal(a.org, 'alpine-org');
  assert.equal(a.repoName, 'alpine-site');
  assert.equal(a.github, true);
  assert.equal(a.startOver, true);
});
