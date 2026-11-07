import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { startWorkerTail, summarizeTailLine } from '../../../scripts/gate/tail.mjs';

const record = (fields: Record<string, unknown>) => JSON.stringify({ level: 'error', timestamp: '2026-11-07T16:50:00Z', ...fields });
const tailLine = (messages: string[], request = { method: 'POST', url: 'https://x.workers.dev/admin/login?/request' }, status = 200) =>
  JSON.stringify({ outcome: 'ok', event: { request, response: { status } }, logs: messages.map((message) => ({ level: 'log', message: [message] })) });

describe('summarizeTailLine', () => {
  it('names the engine event, its code and condition, and the request path and status, without the query or the address', () => {
    const line = tailLine([record({ event: 'auth.link.send_failed', email: 'cairn-gate@probe.907.life', error: 'E_SENDER_NOT_VERIFIED: the sender domain is not verified', code: 'E_SENDER_NOT_VERIFIED', conditionId: 'send-failed' })]);
    const summary = summarizeTailLine(line) as string[];
    expect(summary).toHaveLength(1);
    expect(summary[0]).toContain('auth.link.send_failed');
    expect(summary[0]).toContain('E_SENDER_NOT_VERIFIED');
    expect(summary[0]).toContain('POST /admin/login 200');
    expect(summary[0]).not.toContain('probe.907.life');
    expect(summary[0]).not.toContain('?/request');
  });

  it('keeps only auth and guard events, and skips a line that is not JSON', () => {
    expect(summarizeTailLine('not json')).toEqual([]);
    expect(summarizeTailLine(tailLine([record({ event: 'content.listed' })], { method: 'GET', url: 'https://x.workers.dev/about' }))).toEqual([]);
    expect(summarizeTailLine(tailLine([record({ event: 'auth.link.requested', level: 'info', email: 'a@b.c' })]))).toHaveLength(1);
  });

  it('says a sign-in request arrived, with its status and outcome, when the Worker logged no sign-in record', () => {
    const quiet = JSON.stringify({ outcome: 'ok', event: { request: { method: 'POST', url: 'https://x.workers.dev/admin/login?/request' }, response: { status: 200 } }, logs: [] });
    expect(summarizeTailLine(quiet)).toEqual(['request POST /admin/login 200 outcome=ok logs=0']);
    const other = tailLine([record({ event: 'content.listed' })]);
    expect(summarizeTailLine(other)[0]).toContain('events=content.listed');
  });

  it('caps a summary at 200 characters', () => {
    const long = 'x'.repeat(500);
    const summary = summarizeTailLine(tailLine([record({ event: 'auth.link.send_failed', error: long })])) as string[];
    expect(summary[0].length).toBeLessThanOrEqual(200);
  });
});

describe('startWorkerTail', () => {
  type FakeChild = EventEmitter & { stdout: PassThrough; stderr: PassThrough; killed: boolean; kill: () => boolean };
  type Spawn = typeof import('node:child_process').spawn;

  function fakeSpawn() {
    const child = new EventEmitter() as FakeChild;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.killed = false;
    child.kill = () => {
      child.killed = true;
      child.emit('close', null);
      return true;
    };
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = ((command: string, args: string[]) => {
      calls.push({ command, args });
      return child;
    }) as unknown as Spawn;
    return { child, calls, spawn };
  }

  it('starts wrangler tail for the Worker as JSON and returns the summaries of what it saw when stopped', async () => {
    const { child, calls, spawn } = fakeSpawn();
    const tail = startWorkerTail({ workerName: 'site-b', env: { CLOUDFLARE_API_TOKEN: 'secret-gate-token' }, spawn, settleMs: 0 });
    child.stdout.write(`${tailLine([record({ event: 'auth.link.send_failed', code: 'E_X', conditionId: 'send-failed' })])}\n`);
    child.stdout.write('Connected to site-b, waiting for logs...\n');
    const summaries = await tail.stop();
    expect(calls[0].args).toEqual(expect.arrayContaining(['tail', 'site-b', '--format', 'json']));
    expect(summaries.join(' ')).toContain('auth.link.send_failed');
    expect(child.killed).toBe(true);
  });

  it('says what wrangler printed when it logged nothing and complained, so a token without the tail scope is not read as quiet', async () => {
    const { child, spawn } = fakeSpawn();
    const tail = startWorkerTail({ workerName: 'site-b', env: {}, spawn, settleMs: 0 });
    child.stderr.write('✘ [ERROR] Authentication error [code: 10000]\n');
    const summaries = await tail.stop();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toContain('wrangler tail said');
    expect(summaries[0]).toContain('Authentication error');
  });

  it('says whether the tail ever connected when nothing was logged, so a quiet Worker is told from a tail that never opened', async () => {
    const never = fakeSpawn();
    const unconnected = startWorkerTail({ workerName: 'site-b', env: {}, spawn: never.spawn, settleMs: 0, readyMs: 0 });
    await unconnected.ready;
    expect(await unconnected.stop()).toEqual(['wrangler tail never connected; no sign-in event was seen; it printed nothing']);
    const chatty = fakeSpawn();
    const stuck = startWorkerTail({ workerName: 'site-b', env: {}, spawn: chatty.spawn, settleMs: 0, readyMs: 0 });
    chatty.child.stdout.write('\u001b[1mResolving the account\u001b[0m\n');
    await stuck.ready;
    expect(await stuck.stop()).toEqual(['wrangler tail never connected; no sign-in event was seen; it printed: Resolving the account']);
    const connected = fakeSpawn();
    const opened = startWorkerTail({ workerName: 'site-b', env: {}, spawn: connected.spawn, settleMs: 0, readyMs: 5000 });
    connected.child.stdout.write('Successfully created tail, expires at 2026-11-07T20:00:00Z\n');
    await opened.ready;
    expect(await opened.stop()).toEqual(['wrangler tail was connected and saw no sign-in event']);
  });

  it('never throws when wrangler cannot start', async () => {
    const { spawn } = fakeSpawn();
    expect(spawn).toBeDefined();
    const failing = (() => {
      throw new Error('spawn failed');
    }) as unknown as Spawn;
    const broken = startWorkerTail({ workerName: 'site-b', env: {}, spawn: failing, settleMs: 0 });
    expect(await broken.stop()).toEqual(['wrangler tail did not start: spawn failed']);
  });
});
