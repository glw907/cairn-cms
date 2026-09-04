// cairn-cms: the identity salt must never reach a log record. `provisionSalt` binds the freshly
// minted 32-byte salt as a SQL parameter, so a driver whose error shape echoes its bindings would
// hand `auth.channel.salt_unavailable` the one value that deanonymizes every correlationId this
// channel has ever emitted. The fake D1 below throws exactly that error shape, which no real
// driver is contracted to avoid, and the assertion is on what survives into the record.
import { describe, it, expect, vi } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { CHANNEL_SCHEMA_VERSION } from '../../lib/auth-channel/store.js';
import type { D1Database } from '@cloudflare/workers-types';

const LOCAL_URL = 'https://localhost/logout';
const SESSION_TOKEN = 'a-live-session-token';

type TestEnv = Record<string, never>;

/**
 * A D1 stand-in for the logout teardown: the schema check passes, the session delete returns a
 * live row (so the teardown reaches the salt read at all), the salt read finds nothing, and the
 * provisioning insert throws with its own bound parameters quoted back into the message.
 */
function leakyDb(): D1Database {
  const session = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first(): Promise<unknown> {
              if (sql.includes('FROM cairn_channel_meta')) {
                return params[0] === 'schema_version' ? { value: CHANNEL_SCHEMA_VERSION } : null;
              }
              if (sql.startsWith('DELETE FROM cairn_channel_session')) {
                return { subject: 'sub-scrub', expires_at: Date.now() + 60_000 };
              }
              return null;
            },
            async run(): Promise<unknown> {
              if (sql.startsWith('INSERT OR IGNORE INTO cairn_channel_meta')) {
                throw new Error(`D1_ERROR: disk I/O error while binding ${JSON.stringify(params)}`);
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
  return { withSession: () => session } as unknown as D1Database;
}

function config(db: D1Database): AuthChannelConfig<TestEnv> {
  return {
    resolveDb: () => db,
    deliver: async () => {},
    lookup: async () => null,
    normalize: (raw) => raw,
    challenge: async () => true,
    cookie: { name: 'member_session' },
  };
}

function logoutEvent() {
  const url = new URL(LOCAL_URL);
  return {
    url,
    request: new Request(url, { method: 'POST', headers: { origin: url.origin } }),
    params: {},
    route: { id: '/members/logout' },
    // Any cookie name resolves to the token, so the test does not have to reproduce the
    // engine's own __Host- naming to reach the teardown.
    cookies: { get: () => SESSION_TOKEN, set: () => {}, delete: () => {} },
    setHeaders: () => {},
    locals: {},
    platform: { env: {} as TestEnv },
  };
}

describe('auth.channel.salt_unavailable scrubbing', () => {
  it('redacts a salt echoed back by a driver error, keeping the record safe to paste', async () => {
    const channel = createAuthChannel<TestEnv>(config(leakyDb()));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(await channel.actions.logout(logoutEvent())).toEqual({ ok: true });

      const faults = warnSpy.mock.calls
        .map((c) => c[0] as Record<string, unknown>)
        .filter((r) => r.event === 'auth.channel.salt_unavailable');
      expect(faults).toHaveLength(1);
      const message = faults[0].error as string;

      // The salt is 32 random bytes hex encoded. Nothing that long and that hex-shaped may
      // survive, and the redaction marker proves the scrub ran rather than the message simply
      // never carrying one.
      expect(message).not.toMatch(/[0-9a-fA-F]{32,}/);
      expect(message).toContain('[redacted]');
      // The rest of the message still has to be diagnosable, or the scrub has eaten the record.
      expect(message).toContain('disk I/O error');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
