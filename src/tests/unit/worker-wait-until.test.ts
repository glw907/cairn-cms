// The two engine writes that run after the response: the auth channel's code delivery and the
// D1 audit sink's insert. Both hand their promise to the `waitUntil` that `cloudflare:workers`
// exports, which the unit project resolves to a fake that collects each promise for a test to
// flush. Each case proves the write has not landed when the request returns and has landed once
// the collected promises settle.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitUntil } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { createD1AuditSink } from '../../lib/sveltekit/audit-sink.js';
import { createChannelDb } from '../../../packages/cairn-cms-dev/src/channel-db.js';
import { flushWaitUntil, setFakeEnv } from '../helpers/cloudflare-workers-fake.js';

const CHANNEL_SCHEMA_SQL = readFileSync(resolve('migrations-channel/0000_channel.sql'), 'utf-8');

/** One macrotask: long enough for any write the request itself awaited to have finished. */
function nextTask(): Promise<void> {
  return new Promise((done) => setTimeout(done, 0));
}

type ChannelEnv = { CHANNEL_DB?: D1Database };

describe('the auth channel delivers through waitUntil', () => {
  it('returns before the code is delivered, and the delivery lands once waitUntil settles', async () => {
    setFakeEnv({ CHANNEL_DB: await createChannelDb(CHANNEL_SCHEMA_SQL) });
    const delivered: string[] = [];
    const config: AuthChannelConfig<ChannelEnv> = {
      resolveDb: (env) => env?.CHANNEL_DB,
      deliver: async (contact) => {
        // A real provider call takes at least a macrotask, so an inline await would finish it
        // before the action returns.
        await nextTask();
        delivered.push(contact);
      },
      lookup: async () => 'member-1',
      normalize: (raw) => raw.trim().toLowerCase(),
      challenge: async () => true,
      cookie: { name: 'member_session' },
    };
    const channel = createAuthChannel<ChannelEnv>(config);
    const url = new URL('https://member.example.test/login');
    const event = {
      url,
      request: new Request(url, {
        method: 'POST',
        body: new URLSearchParams({ contact: 'member@x.test' }),
        headers: { origin: url.origin },
      }),
      params: {},
      route: { id: '/members/login' },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
      locals: {},
      getClientAddress: () => '203.0.113.1',
    };

    const result = await channel.actions.request(event);

    expect(result).toEqual({ outcome: 'sent' });
    expect(delivered).toEqual([]);
    await flushWaitUntil();
    expect(delivered).toEqual(['member@x.test']);
  });
});

describe('the D1 audit sink writes through waitUntil', () => {
  it('returns before the insert lands, and the row lands once waitUntil settles', async () => {
    const written: unknown[][] = [];
    const db = {
      prepare: () => ({
        bind: (...args: unknown[]) => ({
          run: async () => {
            await nextTask();
            written.push(args);
            return { meta: { changes: 1 } };
          },
        }),
      }),
    } as unknown as D1Database;
    const sink = createD1AuditSink(db, waitUntil);

    sink({ actor: 'ed@x.dev', action: 'approve', entity: 'event', entityId: 'evt-1' });

    expect(written).toEqual([]);
    await flushWaitUntil();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain('ed@x.dev');
  });
});
