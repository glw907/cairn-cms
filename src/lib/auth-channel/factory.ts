// cairn-cms: `createAuthChannel`, the second-audience login factory (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md). This file is construction
// only for now: every clamp, every required-config check, and the cookie-name discipline run
// here, so a misconfigured site fails at startup rather than at the first login. The three
// actions, `resolveSubject`, and `revokeSessions` are stubbed to throw until Tasks 3 and 4 fill
// them in against Task 1's store and identity functions.
//
// The rule every later task must honor, restated because construction is where a violation would
// otherwise go unnoticed until a review round finds it: no control keyed on the victim's identity
// may deny, delay, or destroy anything. Denial keys on the requester; an identity-keyed control
// either escalates through `challenge-required` or only logs.
import { cookieName } from '../auth/crypto.js';
import type { D1Database } from '@cloudflare/workers-types';
import type { RateLimitLike } from '../cloudflare/rate-limit.js';
import type { CookieJar } from '../sveltekit/types.js';

/** A minute and a day in milliseconds, spelled out so the Defaults table's own units read straight off the clamp calls below. The per-hour knobs (requesterCap, identityCeiling, escalationThreshold) are plain counts, not durations. */
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * The event shape every `createAuthChannel` action and `challenge` callback reads: a SvelteKit
 * `RequestEvent`'s cookie jar, URL, request, platform env, and client address. Kept local rather
 * than reused from `CairnEvent` (`../sveltekit/types.js`), since that type's `locals` shape names
 * the engine's own admin concepts (`cairnEditor`, `cairnAccess`) that have no bearing on a second
 * audience's login channel; a real SvelteKit `RequestEvent` satisfies both structurally.
 */
interface AuthChannelEvent<Env> {
  url: URL;
  request: Request;
  cookies: CookieJar;
  platform?: { env?: Env };
  getClientAddress(): string;
}

/**
 * The context `deliver` and `devDelivery` receive alongside the contact and code: the resolved
 * platform env (provider credentials, or in `devDelivery`'s case the dev-backend flag) and
 * Cloudflare's background-task hook. A `deliver` implementation attaches `.catch()` before
 * anything reaches `waitUntil`, matching the factory's own delivery call (spec, Delivery).
 */
export interface DeliverContext<Env> {
  /** The resolved platform env, or undefined on a runtime with no platform (the unit-test case). */
  env: Env | undefined;
  /** Cloudflare's background-task hook; `platform.ctx?.waitUntil` with `platform.context?.waitUntil` as the legacy fallback. */
  waitUntil: (promise: Promise<unknown>) => void;
}

/** `request`'s result: `sent` even for an unknown contact, so the response never leaks roster membership. */
export type ChannelRequestResult =
  | { sent: true }
  | { error: 'invalid' | 'throttled' | 'challenge-required' | 'unavailable' };

/** `confirm`'s result. `challenge-required` is a retry invitation, never a hard failure. */
export type ChannelConfirmResult =
  | { ok: true }
  | { error: 'bad-code' | 'expired' | 'locked' | 'throttled' | 'challenge-required' | 'no-pending-request' | 'unavailable' };

/**
 * Construction-time configuration for `createAuthChannel`. Every function here is awaited even
 * where a compliant implementation can resolve synchronously (`SendMagicLink`'s own convention),
 * except `resolveDb` and `normalize`, which are plain synchronous reads and pure string
 * transforms respectively and carry no I/O.
 */
export interface AuthChannelConfig<Env> {
  /** The channel's own D1 binding, never `AUTH_DB` (spec, decision 1: physical separation). Absent fails an action closed with `{error: 'unavailable'}`. */
  resolveDb: (env: Env | undefined) => D1Database | undefined;
  /**
   * Send the code to `contact`. A throw is scrubbed, logged, deletes the pending row, and refunds
   * the send charge; called only for a known subject.
   */
  deliver: (contact: string, code: string, ctx: DeliverContext<Env>) => Promise<void>;
  /** Normalized contact to subject id, or null for an unknown contact. A throw is caught, logged as `lookup_failed`, and treated as a miss. */
  lookup: (contact: string) => Promise<string | null>;
  /**
   * Identifier shape: must be idempotent and canonical per identity, and injective across
   * distinct people. Output over 254 characters is invalid; a throw is caught and treated as
   * invalid. Pure and synchronous, unlike the I/O-bound config functions above.
   */
  normalize: (raw: string) => string;
  /**
   * The bot challenge, the most load-bearing of the three correctness obligations this factory
   * cannot itself verify. Required: cairn runs on Cloudflare, where Turnstile is free and native.
   * Awaited before any mint on `request`, and on an escalated `confirm`; false or a throw answers
   * `challenge-required` without ever hard-failing, so a member always has a retry path.
   */
  challenge: (event: AuthChannelEvent<Env>, form: FormData) => Promise<boolean>;
  /** The session cookie's base name, through `cookieName`; also names the `_pending` nonce cookie. A `cairn_`-prefixed base is rejected (it would collide with the engine's own admin cookies). */
  cookie: { name: string };
  /** Consulted by `resolveSubject` on every resolution; false revokes on the next request. */
  verify?: (subject: string) => Promise<boolean>;
  /** Reserved for a future authenticator kind (ROADMAP: passkeys layered on the session model). Only `'code'` is implemented; any other value rejects at construction. */
  kind?: 'code';
  /**
   * Clamped overrides for the Defaults table (spec, Defaults and clamps). Every field is optional
   * and independently clamped; an out-of-range override rejects at construction on whichever
   * bound the table states for that row.
   */
  ttl?: {
    /** Digits per code. Default 8, clamped 8 to 10. */
    codeLength?: number;
    /** Code lifetime in ms. Default 10 minutes, clamped to at most 15 minutes. */
    codeTtlMs?: number;
    /** Wrong-guess cap per code row. Default 5, clamped to at most 10. */
    attemptCap?: number;
    /** Resend cooldown per nonce, in ms; UX only. Default 60 seconds, clamped to at least 30 seconds. */
    cooldownMs?: number;
    /** Requester sends per hour, keyed on the address-and-identity bucket. Default 20, clamped 5 to 100. */
    requesterCap?: number;
    /** Identity send ceiling per hour; logs `auth.channel.ceiling_exceeded` only, never denies. Default 30, clamped to at least 10. */
    identityCeiling?: number;
    /** Identity failure escalation threshold per hour, past which confirm answers `challenge-required`. Default 20, clamped to at least 10. */
    escalationThreshold?: number;
    /** Live code rows kept per requester bucket; a re-mint prunes the requester's own oldest rows past this. Default 5, clamped to at most 20. */
    liveRowCap?: number;
    /** Session lifetime in ms. Default 30 days, clamped to at most 1 year. */
    sessionTtlMs?: number;
  };
  /**
   * Optional back pressure on `request` and `confirm`, never a security control (spec,
   * Residual risks: the Cloudflare binding is per-colo and eventually consistent). An unresolved
   * binding degrades to open.
   */
  rateLimit?: {
    /** Resolve the Workers RateLimit binding off the platform env; absent degrades to open. */
    resolve: (env: Env | undefined) => RateLimitLike | undefined;
    /** Overrides the limiter key, which otherwise defaults to the derived requester bucket, never the identity alone. */
    key?: (event: AuthChannelEvent<Env>) => string;
  };
}

/** What `createAuthChannel` returns: the three form actions, session resolution, and roster-removal revocation. */
export interface AuthChannel<Env> {
  actions: {
    /** POST handler for the `contact` form field; mints and delivers a code. */
    request: (event: AuthChannelEvent<Env>) => Promise<ChannelRequestResult>;
    /** POST handler for the `code` form field; consumes the nonce-bound code and mints a session. */
    confirm: (event: AuthChannelEvent<Env>) => Promise<ChannelConfirmResult>;
    /** POST handler that deletes the current session and clears both cookies. */
    logout: (event: AuthChannelEvent<Env>) => Promise<{ ok: true }>;
  };
  /** Read the session cookie and return the resolved subject, or null when absent, expired, or refused by `verify`. */
  resolveSubject: (event: AuthChannelEvent<Env>) => Promise<string | null>;
  /** Delete every session for a subject; the roster-removal exemplar calls this. */
  revokeSessions: (db: D1Database, subject: string) => Promise<void>;
}

/** Throws when `value` is not a function, naming the config field that construction requires. */
function requireFn(field: string, value: unknown): void {
  if (typeof value !== 'function') {
    throw new Error(`createAuthChannel: config.${field} is required and must be a function`);
  }
}

/**
 * Validate the session cookie's base name and, by extension, the `_pending` nonce cookie's name
 * derived from it: both go through `cookieName`'s RFC 6265 token-set and prefix-conflict checks,
 * and a `cairn_`-prefixed base is rejected here even though `cookieName` itself permits it, since
 * it would collide with the engine's own admin cookies.
 */
function resolveCookieBase(cookie: { name: string } | undefined): string {
  if (!cookie || typeof cookie.name !== 'string' || cookie.name.length === 0) {
    throw new Error('createAuthChannel: config.cookie.name is required');
  }
  const base = cookie.name;
  if (base.toLowerCase().startsWith('cairn_')) {
    throw new Error(
      `createAuthChannel: config.cookie.name "${base}" starts with the engine's reserved "cairn_" prefix, which collides with cairn's own admin cookies; choose a site-specific base`,
    );
  }
  cookieName(base, false);
  cookieName(`${base}_pending`, false);
  return base;
}

/** Validate `kind`, defaulting to `'code'`; any other value rejects, since only `'code'` is implemented. */
function resolveKind(kind: 'code' | undefined): 'code' {
  if (kind !== undefined && kind !== 'code') {
    throw new Error(`createAuthChannel: config.kind "${String(kind)}" is not supported; only "code" is implemented`);
  }
  return 'code';
}

/** One clamp: an inclusive floor and/or ceiling, either side omittable when the Defaults table states only one. */
interface ClampRule {
  min?: number;
  max?: number;
}

/** Resolve one `config.ttl.<field>` override against its default and clamp, rejecting a non-finite, non-integer, or out-of-range value. */
function resolveLimit(field: string, value: number | undefined, fallback: number, rule: ClampRule): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || !Number.isInteger(resolved)) {
    throw new Error(`createAuthChannel: config.ttl.${field} must be an integer, got ${String(resolved)}`);
  }
  // Rows whose clamp states only a ceiling would otherwise admit zero and negative overrides,
  // and each such value is a live defect, not a tight setting: a non-positive attemptCap locks
  // every code before its first guess, a non-positive codeTtlMs expires codes at mint, and a
  // non-positive liveRowCap makes pruning delete every row the requester holds.
  if (resolved <= 0) {
    throw new Error(`createAuthChannel: config.ttl.${field} must be positive, got ${resolved}`);
  }
  if (rule.min !== undefined && resolved < rule.min) {
    throw new Error(`createAuthChannel: config.ttl.${field} must be at least ${rule.min}, got ${resolved}`);
  }
  if (rule.max !== undefined && resolved > rule.max) {
    throw new Error(`createAuthChannel: config.ttl.${field} must be at most ${rule.max}, got ${resolved}`);
  }
  return resolved;
}

/** Every numeric knob the spec's Defaults table exposes, resolved against `config.ttl` and clamped. */
interface ResolvedLimits {
  codeLength: number;
  codeTtlMs: number;
  attemptCap: number;
  cooldownMs: number;
  requesterCap: number;
  identityCeiling: number;
  escalationThreshold: number;
  liveRowCap: number;
  sessionTtlMs: number;
}

function resolveLimits(ttl: AuthChannelConfig<unknown>['ttl']): ResolvedLimits {
  const overrides = ttl ?? {};
  return {
    codeLength: resolveLimit('codeLength', overrides.codeLength, 8, { min: 8, max: 10 }),
    codeTtlMs: resolveLimit('codeTtlMs', overrides.codeTtlMs, 10 * MINUTE_MS, { max: 15 * MINUTE_MS }),
    attemptCap: resolveLimit('attemptCap', overrides.attemptCap, 5, { max: 10 }),
    cooldownMs: resolveLimit('cooldownMs', overrides.cooldownMs, 60 * 1000, { min: 30 * 1000 }),
    requesterCap: resolveLimit('requesterCap', overrides.requesterCap, 20, { min: 5, max: 100 }),
    identityCeiling: resolveLimit('identityCeiling', overrides.identityCeiling, 30, { min: 10 }),
    escalationThreshold: resolveLimit('escalationThreshold', overrides.escalationThreshold, 20, { min: 10 }),
    liveRowCap: resolveLimit('liveRowCap', overrides.liveRowCap, 5, { max: 20 }),
    sessionTtlMs: resolveLimit('sessionTtlMs', overrides.sessionTtlMs, 30 * DAY_MS, { max: 365 * DAY_MS }),
  };
}

/**
 * Build a second-audience login channel: magic-code request, confirm, logout, session
 * resolution, and revocation, all backed by a site-owned D1 binding. Construction is where
 * misconfiguration dies: every clamp in the Defaults table, the required `challenge`, the `kind`
 * restriction, and the cookie-name discipline are all checked here, before a single request is
 * ever served.
 *
 * `Env` does not infer from `resolveDb`'s parameter alone; annotate it explicitly (as in the
 * example) or it collapses to `{}` and every downstream binding read stops typechecking usefully.
 *
 * ```ts
 * const channel = createAuthChannel<App.Platform['env']>({
 *   resolveDb: (env) => env?.MEMBER_DB,
 *   deliver: sendOtp,
 *   lookup: contactToPersonId,
 *   normalize: normalizeContact,
 *   challenge: verifyTurnstile,
 *   cookie: { name: 'member_session' },
 * });
 * ```
 *
 * The three actions, `resolveSubject`, and `revokeSessions` all throw `not implemented` in this
 * pass; Tasks 3 and 4 fill them in.
 * @throws Error on any misconfiguration: a missing required function, an unsupported `kind`, a
 * `cairn_`-prefixed cookie base, an invalid cookie-name token, or a `config.ttl` override outside
 * its clamp.
 */
export function createAuthChannel<Env>(config: AuthChannelConfig<Env>): AuthChannel<Env> {
  requireFn('resolveDb', config.resolveDb);
  requireFn('deliver', config.deliver);
  requireFn('lookup', config.lookup);
  requireFn('normalize', config.normalize);
  requireFn('challenge', config.challenge);
  if (config.verify !== undefined) requireFn('verify', config.verify);

  resolveCookieBase(config.cookie);
  resolveKind(config.kind);
  resolveLimits(config.ttl);

  function notImplemented(name: string): never {
    throw new Error(`createAuthChannel: ${name} is not implemented yet`);
  }

  return {
    actions: {
      request: async () => notImplemented('actions.request'),
      confirm: async () => notImplemented('actions.confirm'),
      logout: async () => notImplemented('actions.logout'),
    },
    resolveSubject: async () => notImplemented('resolveSubject'),
    revokeSessions: async () => notImplemented('revokeSessions'),
  };
}
