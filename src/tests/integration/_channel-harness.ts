// Test-only helpers for the auth-channel factory's integration suites. The channel schema is not
// applied through the wrangler migrations directory (that machinery is AUTH_DB's own, engine-owned
// migration story): a site runs CHANNEL_SCHEMA_SQL itself, so the harness replays it directly
// against the CHANNEL_DB test binding.
//
// The event, cookie-jar, config, and seeding helpers live here rather than per suite so the four
// suites cannot drift apart on the shape of the thing they claim to prove: a jar that records
// different mutations, or an event carrying a different origin header, would quietly change what a
// suite tests without changing a single assertion.
import { env } from 'cloudflare:test';
import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';
import { CHANNEL_SCHEMA_SQL, mintCode, provisionSalt } from '../../lib/auth-channel/store.js';
import { deriveIdentity, generateCode } from '../../lib/auth-channel/identity.js';
import type { AuthChannelConfig } from '../../lib/auth-channel/index.js';
import { cookieName, hashToken } from '../../lib/auth/crypto.js';
import type { CookieJar, CookieSetOptions } from '../../lib/sveltekit/types.js';

/** The platform env a channel suite's events carry: the channel's own binding, never AUTH_DB. */
export type ChannelTestEnv = { CHANNEL_DB: D1Database };

const db = env.CHANNEL_DB;

/** The cookie base every suite constructs its channel with; the cookie-name constants derive from it. */
const COOKIE_BASE = 'member_session';

/** The pending-nonce and session cookie names, in their https (`__Host-` prefixed) and http forms. */
export const PENDING_HTTPS = cookieName(`${COOKIE_BASE}_pending`, true);
export const PENDING_HTTP = cookieName(`${COOKIE_BASE}_pending`, false);
export const SESSION_HTTPS = cookieName(COOKIE_BASE, true);
export const SESSION_HTTP = cookieName(COOKIE_BASE, false);

/** Apply the auth-channel factory's schema to the CHANNEL_DB binding, statement by statement. */
export async function applyChannelSchema(): Promise<void> {
  const statements = CHANNEL_SCHEMA_SQL.split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

/** Empty every channel table, for a clean slate between tests within one file. */
export async function resetChannelDb(): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM cairn_channel_code'),
    db.prepare('DELETE FROM cairn_channel_session'),
    db.prepare('DELETE FROM cairn_channel_budget'),
    db.prepare("DELETE FROM cairn_channel_meta WHERE key != 'schema_version'"),
  ]);
}

/** Open a channel session against the test binding, the way every factory flow opens its own. */
export function channelSession(): D1DatabaseSession {
  return db.withSession('first-primary');
}

/** One recorded delete() call: the cookie name and the options it was cleared with. */
export interface RecordedDelete {
  name: string;
  opts: { path: string };
}

/** An in-memory cookie jar that also records every set() and delete() call, for attribute assertions. */
export interface RecordingCookieJar extends CookieJar {
  sets: { name: string; value: string; opts: CookieSetOptions }[];
  deletes: RecordedDelete[];
}

/** Build a recording cookie jar, optionally pre-loaded with the cookies a browser would send. */
export function makeCookies(initial: Record<string, string> = {}): RecordingCookieJar {
  const jar = new Map(Object.entries(initial));
  const sets: { name: string; value: string; opts: CookieSetOptions }[] = [];
  const deletes: RecordedDelete[] = [];
  return {
    sets,
    deletes,
    get: (name) => jar.get(name),
    set: (name, value, opts) => {
      jar.set(name, value);
      sets.push({ name, value, opts });
    },
    delete: (name, opts) => {
      jar.delete(name);
      deletes.push({ name, opts });
    },
  };
}

/** Everything a suite can vary about a channel action's event; every field has a working default. */
export interface ChannelEventInput {
  url?: string;
  address?: string;
  /** Omitted matches the URL's own origin; `null` sends no origin header at all. */
  origin?: string | null;
  contact?: string;
  code?: string;
  challengeToken?: string;
  cookies?: RecordingCookieJar;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Build an event for any of the three actions. Origin defaults to the URL's own so ordinary tests
 * never trip the unconditional origin check; pass `origin: null` or a mismatched value to test it.
 * Only the form fields a test names are set, so an action's own absent-field handling stays
 * provable, and `platform.ctx` appears only when a test supplies a `waitUntil`.
 */
export function makeEvent(input: ChannelEventInput = {}) {
  const url = new URL(input.url ?? 'https://member.example.test/login');
  const headers: Record<string, string> = {};
  const origin = input.origin === undefined ? url.origin : input.origin;
  if (origin !== null) headers.origin = origin;
  const body = new URLSearchParams();
  if (input.contact !== undefined) body.set('contact', input.contact);
  if (input.code !== undefined) body.set('code', input.code);
  if (input.challengeToken !== undefined) body.set('challenge-token', input.challengeToken);
  return {
    url,
    request: new Request(url, { method: 'POST', body, headers }),
    cookies: input.cookies ?? makeCookies(),
    getClientAddress: () => input.address ?? '203.0.113.1',
    platform: {
      env: { CHANNEL_DB: db },
      ...(input.waitUntil ? { ctx: { waitUntil: input.waitUntil } } : {}),
    },
  };
}

/** One recorded `deliver` call. */
export interface DeliveredCode {
  contact: string;
  code: string;
}

/**
 * A minimal, valid config: identity-shaped normalize, an always-passing challenge, and a deliver
 * spy recording every call. Any field is overridable per test, including `challenge` for a suite
 * that needs a real gate rather than a trivial pass.
 */
export function makeChannelConfig(overrides: Partial<AuthChannelConfig<ChannelTestEnv>> = {}): {
  config: AuthChannelConfig<ChannelTestEnv>;
  sent: DeliveredCode[];
} {
  const sent: DeliveredCode[] = [];
  const config: AuthChannelConfig<ChannelTestEnv> = {
    resolveDb: (e) => e?.CHANNEL_DB,
    deliver: async (contact, code) => {
      sent.push({ contact, code });
    },
    lookup: async () => null,
    normalize: (raw) => raw.trim().toLowerCase(),
    challenge: async () => true,
    cookie: { name: COOKIE_BASE },
    ...overrides,
  };
  return { config, sent };
}

/**
 * Mint a code row directly against the store, bypassing the request action entirely, so a test
 * controls the nonce, code, subject, and requester bucket precisely.
 */
export async function seedCode(opts: {
  contact: string;
  subject: string | null;
  now?: number;
  ttlMs?: number;
  requesterBucket?: string;
}): Promise<{ nonceToken: string; nonceHash: string; code: string; identity: string }> {
  const nonceToken = crypto.randomUUID();
  const nonceHash = await hashToken(nonceToken);
  const salt = await provisionSalt(channelSession());
  const identity = await deriveIdentity(salt, opts.subject, opts.contact);
  const code = generateCode(8);
  const codeHash = await hashToken(code);
  await mintCode(
    channelSession(),
    nonceHash,
    identity,
    codeHash,
    opts.subject,
    opts.now ?? Date.now(),
    opts.ttlMs ?? 10 * 60_000,
    60_000,
    opts.requesterBucket ?? `bucket-${nonceToken}`,
  );
  return { nonceToken, nonceHash, code, identity };
}

/** Live code rows across every bucket. */
export async function codeRowCount(): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cairn_channel_code').first<{ n: number }>();
  return row?.n ?? 0;
}

/** Live session rows across every subject. */
export async function sessionRowCount(): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cairn_channel_session').first<{ n: number }>();
  return row?.n ?? 0;
}

/** A code row's attempt counter, or null once the row is gone. */
export async function attemptsFor(nonceHash: string): Promise<number | null> {
  const row = await db
    .prepare('SELECT attempts FROM cairn_channel_code WHERE nonce_hash = ?1')
    .bind(nonceHash)
    .first<{ attempts: number }>();
  return row?.attempts ?? null;
}

/** The total charged against one budget scope, summed across every bucket in that scope. */
export async function budgetSum(scope: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(SUM(count), 0) AS n FROM cairn_channel_budget WHERE scope = ?1')
    .bind(scope)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Read a budget row directly for assertions. Mirrors `store.ts`'s private bucket-and-scope key
 * composition (`${scope}:${bucket}`); this is a test-only convenience, not a claim on the
 * store's internal format.
 */
export async function readBudgetRow(
  bucket: string,
  scope: string,
): Promise<{ count: number; windowStart: number; prevCount: number } | null> {
  const row = await db
    .prepare('SELECT count, window_start, prev_count FROM cairn_channel_budget WHERE bucket = ?1')
    .bind(`${scope}:${bucket}`)
    .first<{ count: number; window_start: number; prev_count: number }>();
  return row ? { count: row.count, windowStart: row.window_start, prevCount: row.prev_count } : null;
}
