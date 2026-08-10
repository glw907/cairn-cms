import test from 'node:test';
import assert from 'node:assert/strict';
import { defineAction, runActions } from './runner.mjs';

test('dry run prints every action and executes none', async () => {
  const lines = [];
  let ran = false;
  const actions = [
    defineAction({ title: 'Write a file', detail: 'writes ./x', execute: async () => { ran = true; } }),
  ];
  const result = await runActions(actions, { dryRun: true, log: (l) => lines.push(l) });
  assert.equal(ran, false);
  assert.equal(result.skipped, 1);
  assert.ok(lines.some((l) => l.includes('Write a file')));
  assert.ok(lines.some((l) => l.includes('writes ./x')));
});

test('real run executes in order', async () => {
  const order = [];
  const actions = [
    defineAction({ title: 'a', detail: 'a', execute: async () => order.push('a') }),
    defineAction({ title: 'b', detail: 'b', execute: async () => order.push('b') }),
  ];
  const result = await runActions(actions, { dryRun: false, log: () => {} });
  assert.deepEqual(order, ['a', 'b']);
  assert.equal(result.executed, 2);
});

test('a throwing action stops the run and rethrows with its title', async () => {
  const actions = [
    defineAction({ title: 'boom', detail: 'boom', execute: async () => { throw new Error('nope'); } }),
    defineAction({ title: 'after', detail: 'after', execute: async () => {} }),
  ];
  await assert.rejects(() => runActions(actions, { dryRun: false, log: () => {} }), /boom/);
});

test('defineAction rejects a missing or non-function execute, and an empty title, naming the field', () => {
  assert.throws(
    () => defineAction({ title: 'a', detail: 'a' }),
    /execute/,
  );
  assert.throws(
    () => defineAction({ title: 'a', detail: 'a', execute: 'not a function' }),
    /execute/,
  );
  assert.throws(
    () => defineAction({ title: '', detail: 'a', execute: async () => {} }),
    /title/,
  );
});

test('the returned action is frozen', () => {
  const action = defineAction({ title: 'a', detail: 'a', execute: async () => {} });
  assert.throws(() => {
    action.title = 'changed';
  });
  assert.equal(action.title, 'a');
});

test('the returned counts match dryRun: executed xor skipped', async () => {
  const actions = [
    defineAction({ title: 'a', detail: 'a', execute: async () => {} }),
    defineAction({ title: 'b', detail: 'b', execute: async () => {} }),
    defineAction({ title: 'c', detail: 'c', execute: async () => {} }),
  ];
  const dryResult = await runActions(actions, { dryRun: true, log: () => {} });
  assert.deepEqual(dryResult, { executed: 0, skipped: 3 });
  const realResult = await runActions(actions, { dryRun: false, log: () => {} });
  assert.deepEqual(realResult, { executed: 3, skipped: 0 });
});

test('a throwing action preserves the original error as cause, and later actions never run', async () => {
  let laterRan = false;
  const actions = [
    defineAction({ title: 'boom', detail: 'boom', execute: async () => { throw new Error('nope'); } }),
    defineAction({ title: 'later', detail: 'later', execute: async () => { laterRan = true; } }),
  ];
  await assert.rejects(
    () => runActions(actions, { dryRun: false, log: () => {} }),
    (err) => {
      assert.equal(err.cause.message, 'nope');
      return true;
    },
  );
  assert.equal(laterRan, false);
});
