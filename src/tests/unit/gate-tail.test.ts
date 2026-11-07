import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
// @ts-expect-error untyped gate module
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
    expect(summarizeTailLine(tailLine([record({ event: 'content.listed' })]))).toEqual([]);
    expect(summarizeTailLine(tailLine([record({ event: 'auth.link.requested', level: 'info', email: 'a@b.c' })]))).toHaveLength(1);
  });

  it('caps a summary at 200 characters', () => {
    const long = 'x'.repeat(500);
    const summary = summarizeTailLine(tailLine([record({ event: 'auth.link.send_failed', error: long })])) as string[];
    expect(summary[0].length).toBeLessThanOrEqual(200);
  });
});

describe('startWorkerTail', () => {
  function fakeSpawn() {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), killed: false, kill() { this.killed = true; this.emit('close', null); return true; } });
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = (command: string, args: string[]) => {
      calls.push({ command, args });
      return child;
    };
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

  it('answers an empty list when nothing was logged, and never throws when wrangler cannot start', async () => {
    const { spawn } = fakeSpawn();
    const quiet = startWorkerTail({ workerName: 'site-b', env: {}, spawn, settleMs: 0 });
    expect(await quiet.stop()).toEqual([]);
    const broken = startWorkerTail({ workerName: 'site-b', env: {}, spawn: () => { throw new Error('spawn failed'); }, settleMs: 0 });
    expect(await broken.stop()).toEqual(['wrangler tail did not start: spawn failed']);
  });
});
