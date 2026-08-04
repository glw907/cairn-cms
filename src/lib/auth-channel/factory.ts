// cairn-cms: `createAuthChannel`, the second-audience login factory (spec
// docs/superpowers/specs/2026-08-03-auth-channel-factory-design.md). Construction validates every
// clamp, every required-config check, and the cookie-name discipline, so a misconfigured site
// fails at startup rather than at the first login. `actions.request` (Task 3), `actions.confirm`,
// `actions.logout`, `resolveSubject`, and `revokeSessions` (Task 4) are all implemented against
// Task 1's store and identity functions; Task 5 layers the optional rate limit on top.
//
// The rule every later task must honor, restated because construction is where a violation would
// otherwise go unnoticed until a review round finds it: no control keyed on the victim's identity
// may deny, delay, or destroy anything. Denial keys on the requester; an identity-keyed control
// either escalates through `challenge-required` or only logs.
import { error, isHttpError, isRedirect } from '@sveltejs/kit';
import { cookieName, generateToken, hashToken } from '../auth/crypto.js';
import { originMatches } from '../sveltekit/csrf.js';
import { log } from '../log/index.js';
import {
  verifySchema,
  provisionSalt,
  mintCode,
  readCodeRow,
  incrementAndReadCode,
  consumeCode,
  pruneRequesterRows,
  createChannelSession,
  resolveChannelSession,
  destroyChannelSession,
  revokeChannelSessions,
  charge,
  refund,
} from './store.js';
import { canonicalizeCode, deriveIdentity, generateCode, requesterBucket } from './identity.js';
import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';
import type { RateLimitLike } from '../cloudflare/rate-limit.js';
import type { CookieJar } from '../sveltekit/types.js';

/** A minute and a day in milliseconds, spelled out so the Defaults table's own units read straight off the clamp calls below. The per-hour knobs (requesterCap, identityCeiling, escalationThreshold) are plain counts, not durations. */
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** The `charge`/`refund` scope for the requester bucket's hourly send cap: the sole denying control (spec, Flows step 5). */
const REQUESTER_SEND_SCOPE = 'send';

/** The `charge` scope for the identity's hourly send ceiling: a log-only observation, never a denial (spec, Flows step 6). */
const IDENTITY_CEILING_SCOPE = 'ceiling';

/**
 * The `charge`/`refund` scope for confirm's identity failure gate: charged provisionally before
 * every compare and refunded only when that compare succeeds, so a failed guess accumulates and a
 * correct one does not (spec, Flows step 5). Over the threshold this control escalates through
 * `challenge-required`; it never denies, per the rule at the top of this file.
 */
const IDENTITY_ESCALATION_SCOPE = 'escalation';

/**
 * Local development (`wrangler dev`) legitimately speaks http; a deployed host does not. Mirrors
 * `guard.ts`'s own `isLocalHost`, duplicated here rather than imported since that helper is
 * private to the admin guard and this factory serves routes outside `/admin` entirely.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Resolve Cloudflare's background-task hook off `event.platform`, bound to its owning object
 * (an unbound `ExecutionContext.waitUntil` reference loses its receiver when called through a
 * bare variable). `ctx` is read first; `context` is the adapter's deprecated alias, tried only
 * as a fallback so a dependency bump that drops it silently does not reinstate the timing oracle
 * `waitUntil` exists to avoid (spec, Delivery).
 */
function resolveWaitUntil<Env>(event: AuthChannelEvent<Env>): ((promise: Promise<unknown>) => void) | undefined {
  const ctx = event.platform?.ctx;
  if (ctx?.waitUntil) return ctx.waitUntil.bind(ctx);
  const legacyContext = event.platform?.context;
  if (legacyContext?.waitUntil) return legacyContext.waitUntil.bind(legacyContext);
  return undefined;
}

/**
 * Scrub a thrown `deliver` error for logging: strip every occurrence of the contact (a delivery
 * provider's own error can embed the recipient address or number) and cap the length, mirroring
 * `auth-routes.ts`'s `scrubSendError` for the magic-link send path.
 */
function scrubDeliverError(err: unknown, contact: string): string {
  const raw = String(err);
  const scrubbed = contact.length > 0 ? raw.split(contact).join('[redacted]') : raw;
  return scrubbed.slice(0, 300);
}

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
  /**
   * `ctx`/`context` are structural additions beyond the engine's own `PlatformContext`: a real
   * SvelteKit `RequestEvent`'s `platform` carries whichever one the deployed adapter version
   * exposes, and `resolveWaitUntil` reads both (spec, Delivery).
   */
  platform?: {
    env?: Env;
    ctx?: { waitUntil?: (promise: Promise<unknown>) => void };
    context?: { waitUntil?: (promise: Promise<unknown>) => void };
  };
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
 * Compose the rate limit's default key: the requester bucket's address half (spec, Flows step 5)
 * paired with the derived identity, the exact `${address}|${identity}` join `mintCode` stores as
 * `requester_bucket` and `pruneRequesterRows` filters on. Never the identity alone: a key keyed
 * only on identity would let a stranger who merely knows a contact deny that contact's own login
 * attempts, the defect the throttle rule (deny on the requester, escalate on the identity) exists
 * to forbid.
 */
function composeRequesterBucketKey<Env>(event: AuthChannelEvent<Env>, identity: string): string {
  return `${requesterBucket(event)}|${identity}`;
}

/**
 * Apply the optional rate limit (spec, Surface's `rateLimit?` row: back pressure only, never a
 * security control). Both actions call this after deriving the identity their default key needs
 * (`request` right after step 4's derivation, `confirm` right after step 4's row read), rather
 * than at the spec's literal step 1: the plan's Task 5 overrides that placement deliberately,
 * since a key that needs the identity cannot be computed before the identity exists (v3 died on
 * specifying a key at a step that could not compute it).
 *
 * Degrades to open on an absent binding (`auth.channel.rate_limit_absent`) or a throwing
 * `key()`/`limit()` call (`auth.channel.rate_limit_failed`), mirroring `section-action.ts`'s own
 * rate-limit branch exactly, including the one exception: a thrown SvelteKit `redirect()` or
 * `error()` from a site-supplied `key()` override rethrows untouched rather than degrading, since
 * a site relying on either as control flow must not be silently swallowed. Returns false, having
 * logged `auth.channel.rate_limited`, only when the binding itself denies
 * (`result?.success !== true`, so a malformed non-boolean response reads as blocked, not a pass).
 */
async function checkChannelRateLimit<Env>(
  rateLimit: AuthChannelConfig<Env>['rateLimit'],
  event: AuthChannelEvent<Env>,
  action: 'request' | 'confirm',
  defaultKey: string,
  correlationId: string,
): Promise<boolean> {
  if (!rateLimit) return true;
  const limiter = rateLimit.resolve(event.platform?.env);
  if (!limiter) {
    log.warn('auth.channel.rate_limit_absent', { action, correlationId });
    return true;
  }
  try {
    const key = rateLimit.key ? rateLimit.key(event) : defaultKey;
    const result = await limiter.limit({ key });
    if (result?.success !== true) {
      log.warn('auth.channel.rate_limited', { action, correlationId });
      return false;
    }
    return true;
  } catch (err) {
    if (isRedirect(err) || isHttpError(err)) throw err;
    log.warn('auth.channel.rate_limit_failed', {
      action,
      correlationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return true;
  }
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

  const cookieBase = resolveCookieBase(config.cookie);
  resolveKind(config.kind);
  const limits = resolveLimits(config.ttl);

  // Caches only a positive schema check, once per channel instance (spec, Storage): caching a
  // failure would let one transient D1 error pin an isolate into refusing every login for its
  // lifetime, but a confirmed match never needs re-querying on every request.
  let schemaVerified = false;

  /**
   * Resolve the channel's D1 binding and confirm its schema, opening one session a whole flow
   * shares. Returns null on either an absent binding or a schema mismatch, both of which the
   * caller answers with `{error: 'unavailable'}`.
   */
  async function resolveVerifiedSession(env: Env | undefined): Promise<D1DatabaseSession | null> {
    const database = config.resolveDb(env);
    if (!database) return null;
    const dbSession = database.withSession('first-primary');
    if (!schemaVerified) {
      const ok = await verifySchema(dbSession);
      if (!ok) return null;
      schemaVerified = true;
    }
    return dbSession;
  }

  /**
   * POST handler for the `contact` form field. Implements the spec's eight-step request flow
   * (Flows section): origin and scheme checks, the required `challenge`, `normalize`, `lookup`
   * plus salted identity derivation, requester suppression (the sole denying control), the
   * log-only identity ceiling, nonce reuse or minting with cooldown, and `waitUntil` delivery.
   * Every input past `challenge` writes a code row, known or decoy, so store state and timing
   * stay uniform and the response never leaks roster membership.
   */
  async function requestAction(event: AuthChannelEvent<Env>): Promise<ChannelRequestResult> {
    // Step 1: origin and scheme, unconditional and mirroring guard.ts's admin rule. Neither
    // ChannelRequestResult union carries a wire code for a forged or downgraded request, so both
    // refusals throw the framework's own error() rather than degrade the cookie or the response.
    if (!originMatches(event)) {
      throw error(403, 'cairn auth-channel: origin mismatch');
    }
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      throw error(403, 'cairn auth-channel: https required');
    }

    const form = await event.request.formData();

    // Step 2: the required challenge. A false or throwing challenge fails closed, writes no
    // row, calls no deliver, and charges nothing; identity is not yet derived here, so this
    // outcome carries no correlation id.
    let challengeOk: boolean;
    try {
      challengeOk = await config.challenge(event, form);
    } catch {
      challengeOk = false;
    }
    if (!challengeOk) {
      log.info('auth.channel.requested', { outcome: 'challenge_failed' });
      return { error: 'challenge-required' };
    }

    // Step 3: normalize. A throw or an over-length output is invalid; this outcome is not part
    // of the six-item vocabulary auth.channel.requested logs, since no identity exists yet.
    const rawContact = String(form.get('contact') ?? '');
    let contact: string;
    try {
      contact = config.normalize(rawContact);
    } catch {
      return { error: 'invalid' };
    }
    if (contact.length === 0 || contact.length > 254) {
      return { error: 'invalid' };
    }

    const session = await resolveVerifiedSession(event.platform?.env);
    if (!session) return { error: 'unavailable' };

    // Step 4: lookup, then salted identity derivation. A throwing lookup is treated as a miss
    // (a decoy row still gets written below) but logged under the distinct lookup_failed
    // outcome, so a roster outage is not indistinguishable from ordinary probing.
    let subject: string | null;
    let lookupFailed = false;
    try {
      subject = await config.lookup(contact);
    } catch {
      subject = null;
      lookupFailed = true;
    }

    // provisionSalt's own fault (a salt row absent after its insert) is the one input-independent
    // fault that surfaces this late; it fails the action closed rather than deriving an unsalted
    // identity.
    let salt: string;
    try {
      salt = await provisionSalt(session);
    } catch {
      return { error: 'unavailable' };
    }
    const identity = await deriveIdentity(salt, subject, contact);
    // The first 16 hex of the salted identity hash: long enough not to collide across a roster,
    // short enough that no record carries the full correlatable hash (spec, Logging).
    const correlationId = identity.slice(0, 16);

    const now = Date.now();
    // The requester bucket pairs the address half (requesterBucket(event)) with the derived
    // identity, joined on a literal pipe: the address half is IPv4-dotted or IPv6-colon text and
    // the identity is a lowercase hex hash, so no address ever produces a string that could be
    // mistaken for the identity half or vice versa. This exact composed string is also what
    // mintCode stores as requester_bucket and what pruneRequesterRows filters on, so eviction can
    // only ever touch rows the same address-and-identity pair created.
    const fullRequesterBucket = composeRequesterBucketKey(event, identity);

    // The optional rate limit (spec, Surface's rateLimit? row) runs here, deferred from the
    // spec's literal step 1 to right after identity derivation, since its default key is this
    // same requester bucket and cannot be computed any earlier (plan Task 5). Blocked here means
    // neither the requester send charge below nor a code row has been touched yet.
    const rateLimitOk = await checkChannelRateLimit(config.rateLimit, event, 'request', fullRequesterBucket, correlationId);
    if (!rateLimitOk) {
      return { error: 'throttled' };
    }

    // Step 5: requester suppression, the sole denying control in this flow. Charged and checked
    // before the identity ceiling, so a suppressed request never counts against it either.
    const requesterCharge = await charge(session, fullRequesterBucket, REQUESTER_SEND_SCOPE, now, limits.requesterCap);
    if (!requesterCharge.admitted) {
      log.info('auth.channel.requested', { outcome: 'suppressed', correlationId });
      return { error: 'throttled' };
    }

    // Step 6: the identity send ceiling, a charge-shaped read that never denies. Its admitted
    // flag gates nothing below; over the ceiling it only logs at error so an operator can act at
    // the edge or with the provider, per the rule that no identity-keyed control may deny, delay,
    // or destroy anything.
    const ceilingCharge = await charge(session, identity, IDENTITY_CEILING_SCOPE, now, limits.identityCeiling);
    if (!ceilingCharge.admitted) {
      log.error('auth.channel.ceiling_exceeded', { correlationId });
    }

    // Step 7: reuse the unexpired _pending cookie when present (a browser never sends back an
    // expired one), or mint a fresh nonce. mintCode's own conditional upsert is the sole
    // authority on whether a reused nonce's cooldown has elapsed.
    const secure = event.url.protocol === 'https:';
    const pendingCookieName = cookieName(`${cookieBase}_pending`, secure);
    const existingNonce = event.cookies.get(pendingCookieName);
    const nonceToken = existingNonce ?? generateToken();
    const nonceHash = await hashToken(nonceToken);
    const code = generateCode(limits.codeLength);
    const codeHash = await hashToken(code);

    const minted = await mintCode(
      session,
      nonceHash,
      identity,
      codeHash,
      subject,
      now,
      limits.codeTtlMs,
      limits.cooldownMs,
      fullRequesterBucket,
    );

    event.cookies.set(pendingCookieName, nonceToken, {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(limits.codeTtlMs / 1000),
    });

    if (!minted) {
      // The cooldown held: no row was written this call, so the requester charge above is
      // refunded, or a member tapping resend would spend their whole hourly bucket on one
      // delivered message.
      await refund(session, fullRequesterBucket, REQUESTER_SEND_SCOPE, now);
      log.info('auth.channel.requested', { outcome: 'cooldown', correlationId });
      return { sent: true };
    }

    // A fresh mint prunes the requester bucket's own oldest rows, never the identity's, so an
    // evictor (a cookie-clearing attacker minting many nonces) can only ever destroy rows it
    // created itself.
    await pruneRequesterRows(session, fullRequesterBucket, limits.liveRowCap);

    if (subject === null) {
      // One requested record per request, its outcome the request's final state: a throwing
      // lookup rides here as lookup_failed at warn (so a roster outage stays distinguishable
      // from ordinary probing) rather than as a second, earlier record that would double-count
      // the request in an operator's tallies.
      if (lookupFailed) {
        log.warn('auth.channel.requested', { outcome: 'lookup_failed', correlationId });
      } else {
        log.info('auth.channel.requested', { outcome: 'unknown', correlationId });
      }
      return { sent: true };
    }

    // Step 8: deliver, only for a known subject. .catch() is attached before the promise ever
    // reaches waitUntil, so an emulated no-op waitUntil (vite dev, vite preview) never orphans a
    // rejection. A delivery failure deletes the pending row via the same conditioned delete
    // consumeCode already provides (nonce hash and code hash both known here) and refunds the
    // send charge, so a provider outage neither strands the member behind a cooldown nor burns
    // their escalation budget.
    log.info('auth.channel.requested', { outcome: 'delivered', correlationId });
    const waitUntilFn = resolveWaitUntil(event);
    const ctx: DeliverContext<Env> = {
      env: event.platform?.env,
      waitUntil: waitUntilFn ?? (() => {}),
    };
    const deliverPromise = config.deliver(contact, code, ctx).catch(async (err: unknown) => {
      log.error('auth.channel.send_failed', { correlationId, error: scrubDeliverError(err, contact) });
      const failureNow = Date.now();
      await consumeCode(session, nonceHash, codeHash, failureNow);
      await refund(session, fullRequesterBucket, REQUESTER_SEND_SCOPE, failureNow);
    });

    if (waitUntilFn) {
      waitUntilFn(deliverPromise);
    } else {
      // No platform at all: the unit-test/no-adapter runtime. Await inline rather than orphan
      // the promise, and log so a real deployment missing its platform binding is loud.
      log.warn('auth.channel.delivery_inline', { correlationId });
      await deliverPromise;
    }

    return { sent: true };
  }

  /**
   * POST handler for the `code` form field. Implements the spec's eight-step confirm flow (Flows
   * section). The row is found by nonce hash alone: `contact` is never read and neither
   * `normalize` nor `lookup` runs, which is what keeps the roster oracle v1 shipped closed. The
   * identity failure gate (step 5) is checked before the compare and charged provisionally by the
   * same `charge` call that tests it, refunded only when the compare that follows succeeds, so a
   * failed guess accumulates toward escalation and a correct one never does.
   */
  async function confirmAction(event: AuthChannelEvent<Env>): Promise<ChannelConfirmResult> {
    // Step 1: origin and scheme, identical discipline to requestAction.
    if (!originMatches(event)) {
      throw error(403, 'cairn auth-channel: origin mismatch');
    }
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      throw error(403, 'cairn auth-channel: https required');
    }

    const form = await event.request.formData();

    // Step 2: canonicalize. Malformed touches nothing: no store access, no attempt spent.
    const rawCode = String(form.get('code') ?? '');
    const code = canonicalizeCode(rawCode, limits.codeLength);
    if (code === null) {
      return { error: 'bad-code' };
    }

    // Step 3: the pending nonce cookie. Absent is a statement about the requester's own browser,
    // answered before any store access, so a cookie-blocked or cross-browser member gets an exit
    // instead of an endless bad-code loop.
    const secure = event.url.protocol === 'https:';
    const pendingCookieNm = cookieName(`${cookieBase}_pending`, secure);
    const nonceToken = event.cookies.get(pendingCookieNm);
    if (!nonceToken) {
      return { error: 'no-pending-request' };
    }

    const session = await resolveVerifiedSession(event.platform?.env);
    if (!session) return { error: 'unavailable' };

    const now = Date.now();
    const nonceHash = await hashToken(nonceToken);

    // Step 4: the row is found by nonce hash alone. No row (absent or already expired) answers
    // expired; this is the only lookup confirm ever performs against the code table.
    const row = await readCodeRow(session, nonceHash, now);
    if (!row) {
      return { error: 'expired' };
    }
    const correlationId = row.identity.slice(0, 16);

    // The optional rate limit runs here, right after the row read supplies the derived identity
    // this nonce's mint already fixed, and before the failure gate below, so a blocked confirm
    // charges nothing and consumes no row (plan Task 5, the same deferred-from-step-1 placement
    // requestAction uses).
    const rateLimitOk = await checkChannelRateLimit(
      config.rateLimit,
      event,
      'confirm',
      composeRequesterBucketKey(event, row.identity),
      correlationId,
    );
    if (!rateLimitOk) {
      return { error: 'throttled' };
    }

    // Step 5: the identity failure gate. charge() both tests the gate and provisionally charges
    // this attempt in the same call: when the identity is already at its threshold the call adds
    // nothing (admitted is false), otherwise it adds one unit now, refunded below only if the
    // compare that follows actually succeeds. This is what makes "charged on every failed
    // compare" hold without a second store primitive.
    const gateCharge = await charge(session, row.identity, IDENTITY_ESCALATION_SCOPE, now, limits.escalationThreshold);
    if (!gateCharge.admitted) {
      let challengeOk: boolean;
      try {
        challengeOk = await config.challenge(event, form);
      } catch {
        challengeOk = false;
      }
      if (!challengeOk) {
        log.warn('auth.channel.escalated', { correlationId });
        return { error: 'challenge-required' };
      }
      // A passing challenge on this retry proceeds to the compare below, having charged nothing
      // on this call: the identity was already at its threshold, so charge() added no unit.
    }

    // Step 6: increment and read. The returned attempts is post-increment, so the cap check below
    // admits exactly `cap` real guesses. A null result means the row vanished between step 4 and
    // here (a concurrent consume winning the race); reported the same as an ordinary expiry.
    const codeHash = await hashToken(code);
    const incremented = await incrementAndReadCode(session, nonceHash, now);
    if (!incremented) {
      return { error: 'expired' };
    }

    // Step 7: over the cap, without comparing.
    if (incremented.attempts > limits.attemptCap) {
      log.warn('auth.channel.locked', { correlationId });
      return { error: 'locked' };
    }

    // Step 8: the sole authority on whether the code matched. A wrong code deletes nothing (the
    // row survives for the remaining guesses up to the cap) and this call's gate charge stands;
    // this statement is never preceded by a separate compare.
    const consumed = await consumeCode(session, nonceHash, codeHash, now);
    if (!consumed) {
      return { error: 'bad-code' };
    }

    // The code matched: refund the gate charge this call made (if any), since a successful
    // confirm must not accumulate toward the escalation threshold.
    if (gateCharge.admitted) {
      await refund(session, row.identity, IDENTITY_ESCALATION_SCOPE, now);
    }

    if (consumed.subject === '') {
      // A roster data fault, never an attacker signal: some upstream path wrote an empty string
      // rather than null. Logged at error since a developer needs to see this, but the wire
      // answer stays identical to a wrong code so the fault carries no distinguishing behavior.
      log.error('auth.channel.confirmed', { correlationId, outcome: 'empty_subject_fault' });
      return { error: 'bad-code' };
    }
    if (consumed.subject === null) {
      // A decoy row, correctly guessed: consumed, never minted, and answered exactly like a
      // wrong code so an attacker cannot distinguish "right code, decoy row" from "wrong code".
      return { error: 'bad-code' };
    }

    const subject = consumed.subject;
    log.info('auth.channel.confirmed', { correlationId });

    // Clear the nonce cookie and delete any session row named by an incoming session cookie, so
    // neither leaves an orphan.
    event.cookies.delete(pendingCookieNm, { path: '/' });
    const sessionCookieNm = cookieName(cookieBase, secure);
    const existingSessionToken = event.cookies.get(sessionCookieNm);
    if (existingSessionToken) {
      await destroyChannelSession(session, await hashToken(existingSessionToken));
    }

    const sessionToken = generateToken();
    const sessionTokenHash = await hashToken(sessionToken);
    await createChannelSession(session, sessionTokenHash, subject, now, limits.sessionTtlMs);
    log.info('auth.channel.session.created', { correlationId });
    event.cookies.set(sessionCookieNm, sessionToken, {
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: Math.floor(limits.sessionTtlMs / 1000),
    });

    return { ok: true };
  }

  /**
   * POST handler that ends the current session: origin-checked, then clears both cookies and
   * best-effort deletes the session row named by the incoming session cookie.
   */
  async function logoutAction(event: AuthChannelEvent<Env>): Promise<{ ok: true }> {
    if (!originMatches(event)) {
      throw error(403, 'cairn auth-channel: origin mismatch');
    }
    if (event.url.protocol === 'http:' && !isLocalHost(event.url.hostname)) {
      throw error(403, 'cairn auth-channel: https required');
    }

    const secure = event.url.protocol === 'https:';
    const sessionCookieNm = cookieName(cookieBase, secure);
    const pendingCookieNm = cookieName(`${cookieBase}_pending`, secure);
    const token = event.cookies.get(sessionCookieNm);
    event.cookies.delete(sessionCookieNm, { path: '/' });
    event.cookies.delete(pendingCookieNm, { path: '/' });

    if (token) {
      const session = await resolveVerifiedSession(event.platform?.env);
      if (session) {
        await destroyChannelSession(session, await hashToken(token));
      }
    }

    log.info('auth.channel.session.destroyed');
    return { ok: true };
  }

  /**
   * Read the session cookie and resolve it to a subject, or null when absent, expired, or
   * refused by `verify`. Runs `resolveChannelSession` against the bare `db` rather than a shared
   * session: this call happens on every authenticated request rather than inside one channel
   * flow, so it accepts the default consistency and any replica lag on the revocation path (spec,
   * Storage: the documented exception to the shared-session rule).
   */
  async function resolveSubject(event: AuthChannelEvent<Env>): Promise<string | null> {
    const secure = event.url.protocol === 'https:';
    const sessionCookieNm = cookieName(cookieBase, secure);
    const token = event.cookies.get(sessionCookieNm);
    if (!token) return null;

    const database = config.resolveDb(event.platform?.env);
    if (!database) return null;

    const tokenHash = await hashToken(token);
    const now = Date.now();
    const resolved = await resolveChannelSession(database, tokenHash, now);
    if (!resolved) return null;

    if (config.verify) {
      let verified: boolean | null;
      try {
        verified = await config.verify(resolved.subject);
      } catch {
        // The hook itself faulted (a roster backend outage), which is not a roster answer:
        // refuse this resolution without destroying the row, so a transient outage never
        // converts into a permanent mass revocation. Only an explicit false revokes.
        verified = null;
      }
      if (verified === null) return null;
      if (!verified) {
        await destroyChannelSession(database.withSession('first-primary'), tokenHash);
        return null;
      }
    }

    return resolved.subject;
  }

  /** Delete every session for a subject; the roster-removal exemplar calls this. */
  async function revokeSessions(db: D1Database, subject: string): Promise<void> {
    await revokeChannelSessions(db.withSession('first-primary'), subject);
  }

  return {
    actions: {
      request: requestAction,
      confirm: confirmAction,
      logout: logoutAction,
    },
    resolveSubject,
    revokeSessions,
  };
}
