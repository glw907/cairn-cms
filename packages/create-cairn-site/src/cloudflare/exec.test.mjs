import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { makeFakeBin } from '../../test/fake-bin.mjs';

const cwd = tmpdir();

test('runWrangler spawns the fake bin at CAIRN_WRANGLER_BIN, passing argv and cwd through', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  const log = [];
  const result = await runWrangler(['deploy', '--dry-run'], { cwd, log: (line) => log.push(line) });

  assert.equal(result.code, 0);
  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv, ['deploy', '--dry-run']);
  assert.equal(invocation.cwd, cwd);
});

test('runWrangler writes input to the child stdin and then ends it', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  await runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'], {
    cwd,
    log: () => {},
    input: 'the-secret-payload'
  });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.stdin, 'the-secret-payload');
});

test('a non-zero exit code comes back as { code } without throwing', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 3, stdout: 'nope', stderr: 'some ordinary failure' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  const result = await runWrangler(['deploy'], { cwd, log: () => {} });

  assert.equal(result.code, 3);
  assert.equal(result.stdout, 'nope');
  assert.equal(result.stderr, 'some ordinary failure');
});

test('stdout is captured and also mirrored line by line to the injected log', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 0, stdout: 'line one\nline two\n' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  const lines = [];
  const result = await runWrangler(['deploy'], { cwd, log: (line) => lines.push(line) });

  assert.equal(result.stdout, 'line one\nline two\n');
  assert.deepEqual(lines, ['line one', 'line two']);
});

test('the env seam is read at call time, not cached at module load', async (t) => {
  const { runWrangler } = await import('./exec.mjs');

  const fakeOne = await makeFakeBin('wrangler-one');
  t.after(() => fakeOne.close());
  const fakeTwo = await makeFakeBin('wrangler-two');
  t.after(() => fakeTwo.close());

  process.env.CAIRN_WRANGLER_BIN = fakeOne.binPath;
  await runWrangler(['whoami'], { cwd, log: () => {} });
  assert.equal((await fakeOne.invocations()).length, 1);
  assert.equal((await fakeTwo.invocations()).length, 0);

  process.env.CAIRN_WRANGLER_BIN = fakeTwo.binPath;
  await runWrangler(['whoami'], { cwd, log: () => {} });
  assert.equal((await fakeOne.invocations()).length, 1);
  assert.equal((await fakeTwo.invocations()).length, 1);

  delete process.env.CAIRN_WRANGLER_BIN;
});

test('runNpm reads CAIRN_NPM_BIN at call time and spawns it', async (t) => {
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());
  process.env.CAIRN_NPM_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_NPM_BIN; });

  const { runNpm } = await import('./exec.mjs');
  const result = await runNpm(['install'], { cwd, log: () => {} });

  assert.equal(result.code, 0);
  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv, ['install']);
  assert.equal(invocation.cwd, cwd);
});

test('an ENOENT bin path rejects with the wrangler-unavailable catalogue error', async (t) => {
  process.env.CAIRN_WRANGLER_BIN = '/no/such/wrangler-binary-anywhere';
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');

  await assert.rejects(
    () => runWrangler(['whoami'], { cwd, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'wrangler-unavailable');
      return true;
    }
  );
});

test('the npx-canceled exit 1 rejects with the same wrangler-unavailable row', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('whoami', {
    code: 1,
    stderr: 'npm error npx canceled due to missing packages and no YES option: ["wrangler@4.120.1"]'
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');

  await assert.rejects(
    () => runWrangler(['whoami'], { cwd, log: () => {} }),
    (err) => {
      assert.equal(err.catalogue.code, 'wrangler-unavailable');
      return true;
    }
  );
});

test('an ordinary exit 1 with unrelated stderr returns { code: 1 } and does not throw', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  await fake.respond('deploy', { code: 1, stderr: 'ERROR: script size limit exceeded' });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  const result = await runWrangler(['deploy'], { cwd, log: () => {} });

  assert.equal(result.code, 1);
  assert.equal(result.stderr, 'ERROR: script size limit exceeded');
});
