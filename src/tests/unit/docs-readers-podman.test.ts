import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentOwnerMarker, OWNER_LABEL, ownerLabelValue } from '../../../scripts/docs-readers/lib/owner.js';

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

describe('createPodmanExecutor: the owner label', () => {
  it('stamps the current process’s owner marker on the network, the proxy, and the reader, alongside RUN_LABEL', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    execFileArgs.length = 0;
    spawnArgs.length = 0;
    try {
      const executor = newExecutor(runRoot);
      await executor.run(job(30), decl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      const expectedLabel = `${OWNER_LABEL}=${ownerLabelValue(currentOwnerMarker())}`;
      const networkCreateArgs = execFileArgs.find((a) => a[0] === 'network' && a[1] === 'create');
      const proxyRunArgs = execFileArgs.find((a) => a[0] === 'run' && a.includes('-d'));
      const readerRunArgs = spawnArgs.find((a) => a.includes('claude'));
      expect(networkCreateArgs).toContain(expectedLabel);
      expect(proxyRunArgs).toContain(expectedLabel);
      expect(readerRunArgs).toContain(expectedLabel);
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  });
});

describe('createPodmanExecutor: an async secretValue', () => {
  const binaryDecl = classes.get('docs-and-binary');
  if (!binaryDecl) throw new Error('the docs-and-binary class must be declared');

  /** One docs-and-binary job, whose `prepared` tree carries the one docs-set page it names. */
  function binaryJob(preparedDir: string) {
    return parseBatch(
      {
        name: 'fixture',
        concurrency: 1,
        budgetTokens: 1000,
        jobs: [{ id: 'b', class: 'docs-and-binary', model: 'haiku', arrival: 'Arrival.', job: 'Job.', docsSet: ['README.md'], prepared: preparedDir, timeoutMinutes: 30 }],
      },
      classes,
    ).jobs[0];
  }

  it('awaits the resolved value, so a secret that resolves to undefined fails the run rather than the pending promise reading as truthy', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    const preparedDir = mkdtempSync(join(tmpdir(), 'docs-readers-podman-prepared-'));
    writeFileSync(join(preparedDir, 'README.md'), '# hi');
    try {
      const executor = createPodmanExecutor({
        runId: 'test-run',
        runRoot,
        sourceRoot: ROOT,
        image: 'localhost/fake:tag',
        egress: loadEgress(),
        token: () => 'fake-token',
        secretValue: async (name) => (name === 'CAIRN_GH_READ_TOKEN' ? undefined : 'cf-secret-value'),
      });
      await expect(
        executor.run(binaryJob(preparedDir), binaryDecl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} }),
      ).rejects.toThrow(/secret CAIRN_GH_READ_TOKEN is not available/);
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
      rmSync(preparedDir, { recursive: true, force: true });
    }
  });

  it('passes every resolved secretEnv name through to the container, once both resolve', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    const preparedDir = mkdtempSync(join(tmpdir(), 'docs-readers-podman-prepared-'));
    writeFileSync(join(preparedDir, 'README.md'), '# hi');
    execFileArgs.length = 0;
    spawnArgs.length = 0;
    try {
      const executor = createPodmanExecutor({
        runId: 'test-run',
        runRoot,
        sourceRoot: ROOT,
        image: 'localhost/fake:tag',
        egress: loadEgress(),
        token: () => 'fake-token',
        secretValue: async (name) => `${name}-value`,
      });
      const result = await executor.run(binaryJob(preparedDir), binaryDecl, {
        signal: new AbortController().signal,
        onEvent: () => {},
        prompt: 'hi',
        reportSchema: {},
      });
      expect(result.aborted).toBe(false);
      const readerArgs = spawnArgs.find((args) => args.includes('claude'));
      expect(readerArgs).toContain('CAIRN_CF_READ_TOKEN');
      expect(readerArgs).toContain('CAIRN_GH_READ_TOKEN');
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
      rmSync(preparedDir, { recursive: true, force: true });
    }
  });
});

describe('createPodmanExecutor: the per-run copy preserves timestamps', () => {
  const binaryDecl = classes.get('docs-and-binary');
  if (!binaryDecl) throw new Error('the docs-and-binary class must be declared');

  /** One docs-and-binary job, whose `prepared` tree carries the one docs-set page it names. */
  function binaryJob(preparedDir: string) {
    return parseBatch(
      {
        name: 'fixture',
        concurrency: 1,
        budgetTokens: 1000,
        jobs: [{ id: 'c', class: 'docs-and-binary', model: 'haiku', arrival: 'Arrival.', job: 'Job.', docsSet: ['README.md'], prepared: preparedDir, timeoutMinutes: 30 }],
      },
      classes,
    ).jobs[0];
  }

  it('carries a source file’s mtime through both copy hops, into the mount the container sees', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    const preparedDir = mkdtempSync(join(tmpdir(), 'docs-readers-podman-mtime-'));
    const sourceFile = join(preparedDir, 'README.md');
    writeFileSync(sourceFile, '# hi');
    const fixedMtime = new Date('2000-01-01T00:00:00Z');
    utimesSync(sourceFile, fixedMtime, fixedMtime);
    try {
      const executor = createPodmanExecutor({
        runId: 'test-run',
        runRoot,
        sourceRoot: ROOT,
        image: 'localhost/fake:tag',
        egress: loadEgress(),
        token: () => 'fake-token',
        secretValue: async (name) => `${name}-value`,
      });
      const result = await executor.run(binaryJob(preparedDir), binaryDecl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      // preparedRoot is the first copy hop's target (source -> prepared); the mount's job/
      // directory, one level up from preparedRoot, is the per-run copy the container mounts.
      const mountedFile = join(dirname(result.preparedRoot), 'mount', 'job', 'README.md');
      expect(statSync(join(result.preparedRoot, 'README.md')).mtime.getTime()).toBe(fixedMtime.getTime());
      expect(statSync(mountedFile).mtime.getTime()).toBe(fixedMtime.getTime());
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
      rmSync(preparedDir, { recursive: true, force: true });
    }
  });
});

describe('createPodmanExecutor: a docs-set job’s optional prepared override', () => {
  /** A docs-only job carrying the given optional `prepared` field, built through `parseBatch`. */
  function docsOnlyJob(prepared?: string) {
    return parseBatch(
      { name: 'fixture', concurrency: 1, budgetTokens: 1000, jobs: [{ id: 'a', class: 'docs-only', model: 'haiku', arrival: 'Arrival.', job: 'Job.', docsSet: ['README.md'], prepared, timeoutMinutes: 30 }] },
      classes,
    ).jobs[0];
  }

  it('copies its docs set from sourceRoot, as ever, when the job carries no prepared field', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    try {
      const executor = newExecutor(runRoot);
      const result = await executor.run(docsOnlyJob(), decl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      expect(readFileSync(join(result.preparedRoot, 'README.md'), 'utf8')).toBe(readFileSync(join(ROOT, 'README.md'), 'utf8'));
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  });

  it('copies its docs set from the given prepared directory instead of sourceRoot, when the job carries one', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    const preparedDir = mkdtempSync(join(tmpdir(), 'docs-readers-podman-docsset-prepared-'));
    writeFileSync(join(preparedDir, 'README.md'), '# a planted README\n');
    try {
      const executor = newExecutor(runRoot);
      const result = await executor.run(docsOnlyJob(preparedDir), decl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} });
      expect(readFileSync(join(result.preparedRoot, 'README.md'), 'utf8')).toBe('# a planted README\n');
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
      rmSync(preparedDir, { recursive: true, force: true });
    }
  });

  it('throws naming the prepared directory when one of the job’s docs-set paths is missing from it', async () => {
    const runRoot = mkdtempSync(join(tmpdir(), 'docs-readers-podman-'));
    const preparedDir = mkdtempSync(join(tmpdir(), 'docs-readers-podman-docsset-missing-'));
    try {
      const executor = newExecutor(runRoot);
      await expect(
        executor.run(docsOnlyJob(preparedDir), decl, { signal: new AbortController().signal, onEvent: () => {}, prompt: 'hi', reportSchema: {} }),
      ).rejects.toThrow(new RegExp(`does not exist in prepared directory ${preparedDir}`));
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
      rmSync(preparedDir, { recursive: true, force: true });
    }
  });
});
