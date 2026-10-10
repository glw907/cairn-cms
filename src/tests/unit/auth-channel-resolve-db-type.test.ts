// The channel's `resolveDb` accepts the structural subset of D1 its store uses. These cases are
// compile-time assertions that `npm run check` enforces (a cast-free assignment fails the type
// check, not the run), plus a runtime pass that the dev double drives a real action.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { createChannelDb } from '../../../packages/cairn-cms-dev/src/channel-db.js';

const CHANNEL_SCHEMA_SQL = readFileSync(resolve('migrations-channel/0000_channel.sql'), 'utf-8');

function baseConfig(): Omit<AuthChannelConfig<unknown>, 'resolveDb'> {
  return {
    deliver: async () => {},
    lookup: async () => null,
    normalize: (raw) => raw.trim().toLowerCase(),
    challenge: async () => true,
    cookie: { name: 'member_session' },
  };
}

describe('AuthChannelConfig.resolveDb', () => {
  it('accepts the createChannelDb result with no cast, and a real D1Database still assigns', async () => {
    const double = await createChannelDb(CHANNEL_SCHEMA_SQL);
    const fromDouble: AuthChannelConfig<unknown> = { ...baseConfig(), resolveDb: () => double };
    const fromD1: AuthChannelConfig<unknown> = {
      ...baseConfig(),
      resolveDb: (env) => (env as { DB?: D1Database } | undefined)?.DB,
    };
    expect(fromDouble.resolveDb(undefined)).toBe(double);
    expect(fromD1.resolveDb(undefined)).toBeUndefined();
  });

  it('drives a real action over the dev double: an unknown contact is answered, not unavailable', async () => {
    const double = await createChannelDb(CHANNEL_SCHEMA_SQL);
    const channel = createAuthChannel<unknown>({ ...baseConfig(), resolveDb: () => double });
    const url = new URL('https://member.example.test/login');
    const result = await channel.actions.request({
      url,
      request: new Request(url, {
        method: 'POST',
        body: new URLSearchParams({ contact: 'nobody@x.test' }),
        headers: { origin: url.origin },
      }),
      params: {},
      route: { id: '/members/login' },
      cookies: { get: () => undefined, set: () => {}, delete: () => {} },
      setHeaders: () => {},
      locals: {},
      getClientAddress: () => '203.0.113.1',
    });
    expect(result).toEqual({ outcome: 'sent' });
  });
});
