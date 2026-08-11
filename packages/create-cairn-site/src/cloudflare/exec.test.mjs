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

test('runWrangler passes an env option through to the spawned child', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const { runWrangler } = await import('./exec.mjs');
  await runWrangler(['whoami'], {
    cwd,
    log: () => {},
    env: { CLOUDFLARE_ACCOUNT_ID: 'planted-value' },
  });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.env.CLOUDFLARE_ACCOUNT_ID, 'planted-value');
});

test('a call made without an env option shows no CLOUDFLARE_ACCOUNT_ID in the recorded env', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  // This is the falsifiable half of the pair above, so it has to be measuring the env option and
  // nothing else. A developer working on Cloudflare plausibly has CLOUDFLARE_ACCOUNT_ID exported
  // in their own shell, and the child inherits the parent environment whenever no env option is
  // given, so without this the assertion would fail on their machine and pass on a bare CI runner.
  const ambient = process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  t.after(() => {
    if (ambient === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = ambient;
  });

  const { runWrangler } = await import('./exec.mjs');
  await runWrangler(['whoami'], { cwd, log: () => {} });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.env.CLOUDFLARE_ACCOUNT_ID, undefined);
});

test('the env option merges over process.env rather than replacing it: a parent-set var is still visible', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  process.env.CAIRN_TEST_PARENT_VAR = 'parent-value';
  t.after(() => { delete process.env.CAIRN_TEST_PARENT_VAR; });

  const { runWrangler } = await import('./exec.mjs');
  await runWrangler(['whoami'], {
    cwd,
    log: () => {},
    env: { CLOUDFLARE_ACCOUNT_ID: 'planted-value' },
  });

  const [invocation] = await fake.invocations();
  assert.equal(invocation.env.CAIRN_TEST_PARENT_VAR, 'parent-value');
  assert.equal(invocation.env.CLOUDFLARE_ACCOUNT_ID, 'planted-value');
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

test('a fake that exits before reading a large piped stdin does not raise an unhandled EPIPE', async (t) => {
  // Reproduces the review-gate finding: a child that spawns successfully and exits before
  // draining stdin (npx canceled due to missing packages exits this way, immediately) raises an
  // 'error' event on the stdin stream itself. Without a listener on that stream, node treats it
  // as an uncaught exception; a large input makes the write straddle the child's exit reliably.
  const fake = await makeFakeBin('wrangler', { exitBeforeReadingStdin: true });
  t.after(() => fake.close());
  await fake.respond('secret', {
    code: 1,
    stderr: 'npm error npx canceled due to missing packages and no YES option: ["wrangler@4.120.1"]',
  });
  process.env.CAIRN_WRANGLER_BIN = fake.binPath;
  t.after(() => { delete process.env.CAIRN_WRANGLER_BIN; });

  const uncaught = [];
  const onUncaughtException = (err) => uncaught.push(err);
  process.on('uncaughtException', onUncaughtException);
  t.after(() => process.removeListener('uncaughtException', onUncaughtException));

  const { runWrangler } = await import('./exec.mjs');
  const largeInput = 'x'.repeat(200 * 1024);

  await assert.rejects(
    () =>
      runWrangler(['secret', 'put', 'GITHUB_APP_PRIVATE_KEY_B64'], {
        cwd,
        log: () => {},
        input: largeInput,
      }),
    (err) => {
      assert.equal(err.catalogue.code, 'wrangler-unavailable');
      return true;
    },
  );

  // Give any deferred, unhandled stdin 'error' a turn to surface before asserting its absence:
  // proof the crash is gone, not merely that the promise it raced against happened to settle.
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(uncaught, [], 'expected no uncaught exception from the piped stdin write');
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
