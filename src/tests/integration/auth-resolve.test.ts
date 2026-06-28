// src/tests/integration/auth-resolve.test.ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createSession } from '../../lib/auth/store.js';
import { resolvePrincipal } from '../../lib/auth/resolve.js';
import { seedEditor } from './_auth-harness.js';

const now = Date.now();

describe('resolvePrincipal', () => {
  it('grants admin scopes for an admin-tier allowlisted session', async () => {
    await seedEditor('owner@x.io', 'O', 'owner');
    await createSession(env.AUTH_DB, 'a1', 'owner@x.io', 'admin', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'a1', now);
    expect(p).toMatchObject({ email: 'owner@x.io', tier: 'admin', scopes: ['admin:owner', 'admin:editor'] });
  });
  it('withholds admin scopes from a member-tier session even if allowlisted', async () => {
    await seedEditor('dual@x.io', 'D', 'editor');
    await createSession(env.AUTH_DB, 'm1', 'dual@x.io', 'member', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'm1', now);
    expect(p?.scopes).toEqual([]);
    expect(p?.tier).toBe('member');
  });
  it('adds custom scopes from the authorize callback', async () => {
    await createSession(env.AUTH_DB, 'm2', 'fan@x.io', 'member', now + 1000, now);
    const authorize = ({ email }: { email: string }) => (email === 'fan@x.io' ? ['member'] : []);
    const p = await resolvePrincipal({ db: env.AUTH_DB, authorize, platform: undefined }, 'm2', now);
    expect(p).toMatchObject({ email: 'fan@x.io', tier: 'member', scopes: ['member'] });
  });
  it('returns a scopeless principal for an unentitled verified email', async () => {
    await createSession(env.AUTH_DB, 'm3', 'new@x.io', 'member', now + 1000, now);
    const p = await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'm3', now);
    expect(p).toEqual({ email: 'new@x.io', displayName: 'new@x.io', scopes: [], tier: 'member' });
  });
  it('returns null for an unknown session id', async () => {
    expect(await resolvePrincipal({ db: env.AUTH_DB, platform: undefined }, 'nope', now)).toBeNull();
  });
});
