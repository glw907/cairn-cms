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
