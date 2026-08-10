import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { makeFakeBin } from './fake-bin.mjs';

/**
 * Spawn a fake bin and collect its exit code, stdout, and stderr. `input`, when given, is
 * written to the child's stdin and the stream is then ended; when omitted, stdin is ended
 * immediately with nothing written, mirroring a caller that passes no input.
 * @param {string} binPath the fake's executable script path
 * @param {string[]} args the arguments to invoke it with
 * @param {{ input?: string, cwd?: string }} [options]
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
function run(binPath, args, { input, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

test('a spawned fake bin logs its argv, cwd, and piped stdin', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  await run(fake.binPath, ['deploy', '--dry-run'], { input: 'hello from stdin', cwd: process.cwd() });

  const [invocation] = await fake.invocations();
  assert.deepEqual(invocation.argv, ['deploy', '--dry-run']);
  assert.equal(invocation.cwd, process.cwd());
  assert.equal(invocation.stdin, 'hello from stdin');
});

test('respond drives the reply for a matching call', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  await fake.respond('deploy', { code: 0, stdout: 'x' });
  const result = await run(fake.binPath, ['deploy']);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, 'x');
});

test('a more specific respond added later wins over an earlier general one', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  await fake.respond('d1', { code: 1, stdout: 'general' });
  await fake.respond('d1 migrations', { code: 0, stdout: 'specific' });
  const result = await run(fake.binPath, ['d1', 'migrations', 'apply', 'AUTH_DB']);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, 'specific');
});

test('an unmatched call exits 0 with no output', async (t) => {
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());

  await fake.respond('deploy', { code: 1, stdout: 'nope' });
  const result = await run(fake.binPath, ['install']);

  assert.equal(result.code, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('two sequential calls append two log lines, in order', async (t) => {
  const fake = await makeFakeBin('npm');
  t.after(() => fake.close());

  await run(fake.binPath, ['install']);
  await run(fake.binPath, ['run', 'build']);

  const invocations = await fake.invocations();
  assert.equal(invocations.length, 2);
  assert.deepEqual(invocations[0].argv, ['install']);
  assert.deepEqual(invocations[1].argv, ['run', 'build']);
});

test('a call with no piped stdin does not block, and logs an empty stdin', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  const result = await run(fake.binPath, ['whoami'], { input: '' });

  assert.equal(result.code, 0);
  const [invocation] = await fake.invocations();
  assert.equal(invocation.stdin, '');
});

test('a canned reply larger than the pipe buffer arrives whole', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  // Above the ~146KB a pipe holds before a writer must wait, measured on this platform. The
  // fake answers with process.exitCode rather than process.exit() precisely so a reply this
  // size drains instead of being cut off; at 1MB, process.exit() loses roughly 85% of it.
  const huge = 'x'.repeat(1_000_000);
  await fake.respond('deploy', { code: 0, stdout: huge });

  const result = await run(fake.binPath, ['deploy'], { input: '' });

  assert.equal(result.code, 0);
  assert.equal(result.stdout.length, huge.length);
});

test('invocations is empty before any call is made', async (t) => {
  const fake = await makeFakeBin('wrangler');
  t.after(() => fake.close());

  assert.deepEqual(await fake.invocations(), []);
});

test('close removes the fake bin directory', async (t) => {
  const fake = await makeFakeBin('wrangler');
  const { dirname } = await import('node:path');
  const dir = dirname(fake.binPath);

  await fake.close();

  await assert.rejects(() => stat(dir), { code: 'ENOENT' });
});
