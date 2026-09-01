// cairn-cms: a compile-only fixture for the `/auth-channel` fold (conventions pass, Task 8),
// mirroring the one production consumer's actual wiring rather than an invented one. It is modelled
// on xcathletes-org's member login (`src/lib/server/auth/channel.ts`), post-migration: a
// module-scope channel per binding, a D1-backed `lookup` that now reads its binding off the
// callback context instead of a `WeakMap` keyed on the binding, a session helper whose PUBLIC
// signature names the event type, a roster-archive path that revokes with a bare `db` and no
// event, and a single-knob session-lifetime override.
//
// The claims here are about TYPES, not behavior: `npm run check` is the gate that reads them, so
// the fixture proves its claim by compiling, and if the fold ever makes one of these five shapes
// awkward, this file is where that shows up as a type error rather than in a consumer's repository
// after a release. The collaborator bodies are stand-ins, since the channel is constructed at module
// scope the way the consumer constructs it.
import { describe, it, expect } from 'vitest';
import { createAuthChannel } from '../../lib/auth-channel/index.js';
import type { AuthChannel, CairnEvent, DeliverContext } from '../../lib/auth-channel/index.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';

// The one runtime assertion, since vitest fails a `.test.ts` that declares no suite. The
// assignability claims are the compile-only declarations below it.
describe('the auth-channel consumer fixture', () => {
  it('builds the consumer-shaped channel this file type-checks', () => {
    expect(typeof memberChannel.resolveSubject).toBe('function');
    expect(typeof memberChannel.revokeSessions).toBe('function');
  });
});

/** The consumer's own platform env: its member database plus its challenge secret. */
interface SiteEnv {
  PLATFORM_DB?: D1Database;
  TURNSTILE_SECRET?: string;
}

/** The consumer's generated route event once its `app.d.ts` declares `Platform['env']: SiteEnv`. */
type SiteRequestEvent = Omit<RequestEvent, 'platform'> & { platform: Readonly<{ env: SiteEnv }> | undefined };

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

// The consumer's own five collaborators, as stand-in bodies rather than `declare function`: the
// channel below is built at module scope, the way the consumer builds it, so the construction runs
// and the declarations would have no runtime binding. Only the SIGNATURES matter to this fixture.
async function sendCode(_contact: string, _code: string, _ctx: DeliverContext<SiteEnv>): Promise<void> {}
function normalizeContact(raw: string): string {
  return raw.trim().toLowerCase();
}
async function verifyTurnstile(_token: string, _secret: string): Promise<boolean> {
  return true;
}
async function personIdForContact(_db: D1Database, _contact: string): Promise<string | null> {
  return null;
}
async function hasActiveMembership(_db: D1Database, _personId: string): Promise<boolean> {
  return true;
}

/**
 * The consumer's channel, built once at module scope. `lookup` and `verify` read the binding off
 * their own context, which is the whole point of the narrow `{ env }`: before it, the consumer kept
 * a module-level `WeakMap<D1Database, AuthChannel<Env>>` so each binding got its own channel whose
 * callbacks could close over a captured `db`.
 */
const memberChannel: AuthChannel<SiteEnv> = createAuthChannel<SiteEnv>({
  resolveDb: (env) => env?.PLATFORM_DB,
  deliver: sendCode,
  lookup: async (contact, ctx) => {
    const db = ctx.env?.PLATFORM_DB;
    if (!db) return null;
    return personIdForContact(db, contact);
  },
  normalize: normalizeContact,
  challenge: async (event, form) =>
    verifyTurnstile(String(form.get('cf-turnstile-response') ?? ''), event.platform?.env?.TURNSTILE_SECRET ?? ''),
  verify: async (subject, ctx) => {
    const db = ctx.env?.PLATFORM_DB;
    if (!db) throw new Error('membership check ran with no binding');
    return hasActiveMembership(db, subject);
  },
  // A base without cairn's reserved prefix, which construction still rejects.
  cookie: { name: 'xcathletes_member' },
  // The one knob this consumer overrides. A single-knob override names one knob and nothing else.
  limits: { session: { ttlMs: NINETY_DAYS } },
});

/**
 * The consumer's session helper, whose parameter type is part of ITS public signature. This is the
 * shape that made the `AuthChannelEvent` retirement a breaking change: the name is imported, and
 * structural compatibility does not save a named import.
 */
export async function sessionPerson(event: CairnEvent<SiteEnv>): Promise<string | null> {
  return memberChannel.resolveSubject(event);
}

/**
 * The roster-archive path: a bare binding and a subject, with no event anywhere in reach. This is
 * the recorded reason `revokeSessions` keeps its event-free signature while its four siblings take
 * an event.
 */
export async function revokeMemberSessions(db: D1Database, personId: string): Promise<void> {
  await memberChannel.revokeSessions(db, personId);
}

/** The consumer's login route actions, passing its real kit event straight through, uncast. */
export const loginActions = {
  request: (event: SiteRequestEvent) => memberChannel.actions.request(event),
  confirm: (event: SiteRequestEvent) => memberChannel.actions.confirm(event),
  logout: (event: SiteRequestEvent) => memberChannel.actions.logout(event),
};
