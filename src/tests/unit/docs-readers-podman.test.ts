import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const execFileArgs = vi.hoisted(() => [] as string[][]);
const spawnArgs = vi.hoisted(() => [] as string[][]);

/**
 * A podman stand-in fast enough for a unit test: `network create`, the proxy's `run -d`, the
 * `logs` poll, and `inspect` each resolve on the first call, so `startNetwork` never sleeps.
 */
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  // A plain callback-style stand-in: `promisify` falls back to appending a callback as the last
  // argument when the function carries no `promisify.custom`, which this deliberately does not.
  const fakeExecFile = (...callArgs: unknown[]) => {
    const args = callArgs[1] as string[];
    const callback = callArgs[callArgs.length - 1] as (error: null, result: { stdout: string; stderr: string }) => void;
    execFileArgs.push(args);
    if (args[0] === 'logs') return queueMicrotask(() => callback(null, { stdout: '{"decision":"listening"}\n', stderr: '' }));
    if (args[0] === 'inspect') return queueMicrotask(() => callback(null, { stdout: '10.0.0.5\n', stderr: '' }));
    return queueMicrotask(() => callback(null, { stdout: '', stderr: '' }));
  };
  const fakeSpawn = (...callArgs: unknown[]) => {
    spawnArgs.push(callArgs[1] as string[]);
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; stdin: { end: () => void } };
    child.stdout = Object.assign(new EventEmitter(), { setEncoding: () => {} });
    child.stderr = Object.assign(new EventEmitter(), { setEncoding: () => {} });
    child.stdin = { end: () => {} };
    setImmediate(() => child.emit('close', 0));
    return child;
  };
  return { ...actual, execFile: fakeExecFile, spawn: fakeSpawn };
});

const { createPodmanExecutor } = await import('../../../scripts/docs-readers/lib/podman.js');
const { loadClasses, loadEgress } = await import('../../../scripts/docs-readers/lib/class-schema.js');
const { parseBatch } = await import('../../../scripts/docs-readers/lib/batch.js');

const classes = loadClasses();
const decl = classes.get('docs-only');
if (!decl) throw new Error('the docs-only class must be declared');

/** One docs-only job, built through `parseBatch` so it carries the schema's defaults. */
function job(timeoutMinutes: number) {
  return parseBatch(
    { name: 'fixture', concurrency: 1, budgetTokens: 1000, jobs: [{ id: 'a', class: 'docs-only', model: 'haiku', arrival: 'Arrival.', job: 'Job.', docsSet: ['README.md'], timeoutMinutes }] },
    classes,
  ).jobs[0];
}

function newExecutor(runRoot: string) {
  return createPodmanExecutor({
    runId: 'test-run',
    runRoot,
    sourceRoot: ROOT,
    image: 'localhost/fake:tag',
    egress: loadEgress(),
    token: () => 'fake-token',
  });
}

describe('createPodmanExecutor: the abort race in startNetwork', () => {
  it('does not spawn the reader, and returns aborted immediately, when the signal fired before the container would start', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    execFileArgs.length = 0;
    spawnArgs.length = 0;
    try {
      const executor = newExecutor(runRoot);
      const controller = new AbortController();
      controller.abort();
      const started = Date.now();
      const result = await executor.run(job(999), decl, { signal: controller.signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      // The abort was already true before runReader's own spawn check, most likely because
      // startNetwork was still in flight when the batch's stop() or an external halt fired; an
      // 'abort' event that already fired never re-fires for a listener added afterward, so this
      // proves the pre-spawn check, not the listener, is what stops the container.
      expect(spawnArgs).toEqual([]);
      expect(result.aborted).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(Date.now() - started).toBeLessThan(5000);
      // startNetwork still ran (network create, the proxy's run -d, the logs poll, inspect), and
      // stopNetwork tore it down, so the fix is scoped to the reader's own spawn, not the network.
      expect(execFileArgs.some((a) => a[0] === 'network' && a[1] === 'create')).toBe(true);
      expect(execFileArgs.some((a) => a[0] === 'network' && a[1] === 'rm')).toBe(true);
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  });

  it('spawns the reader normally when the signal never fires', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    execFileArgs.length = 0;
    spawnArgs.length = 0;
    try {
      const executor = newExecutor(runRoot);
      const controller = new AbortController();
      const result = await executor.run(job(30), decl, { signal: controller.signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      expect(spawnArgs.length).toBe(1);
      expect(result.aborted).toBe(false);
      expect(result.exitCode).toBe(0);
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  });
});
