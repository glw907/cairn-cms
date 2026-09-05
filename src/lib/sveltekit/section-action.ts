// cairn-cms: the guarded form-action factory a site-built admin section otherwise hand-rolls,
// because SvelteKit dispatches a matched action directly and never re-runs an ancestor layout's
// `load`, so a section's own POST cannot lean on its page's authorization check.
// `createSectionAction` composes onto `adminAction` (editor identity, CSRF, the single form
// read, the audit contract) and adds only what the engine cannot know: the site's DB-binding
// resolver and an optional rate limit. It deliberately does no schema validation and no domain
// work; those stay the handler's job.
//
// The check order below runs every authorization check before the binding-resolution failure
// (a session the access map refuses learns nothing about whether the section's own database is
// deployed) and mirrors `requireAccess` (guard.ts) exactly: `hasAccessRule` runs before
// `canReach`, never `canReach` alone, whose permissive unmapped-target reading is nav semantics,
// not an authorization floor a POST can rely on. It is fail-closed at every step but two,
// deliberately: the rate limit degrades to open (an unresolved binding, or a throwing
// `key()`/`limit()` call, never blocks, except SvelteKit's own `redirect()`/`error()`, which
// propagate untouched rather than degrading) and its `fail(429)` branch emits no `ctx.audit` (back
// pressure is not a domain-state change). Every other refusal audits through `ctx.audit`
// (adminAction's own contract). Every user-facing message stays deliberately generic (every 403
// shares one string, both 500s share another) so a session learns no deployment or gating detail
// from a refusal; the branch identity lives in the audit `detail` and the structured log. The
// local `deny` and `misconfigured` helpers below are what make that uniformity structural, rather
// than a convention five separate branches each have to keep.
import { fail, isHttpError, isRedirect } from '@sveltejs/kit';
import { adminAction, authorizeAdminTarget, ADMIN_DENIAL_DETAIL, DENIED_MESSAGE } from './admin-action.js';
import { targetFromRouteId } from '../auth/access.js';
import { log } from '../log/index.js';
import { resolveRateLimit } from '../cloudflare/rate-limit.js';
import type { AdminActionContext } from './admin-action.js';
import type { CairnEvent } from './types.js';
import type { AccessMap } from '../auth/access.js';
import type { ActionFailure } from '@sveltejs/kit';
import type { RateLimitLike } from '../cloudflare/rate-limit.js';

export type { RateLimitLike };

/** Site-fixed configuration for one `createSectionAction` factory: only what the engine cannot know. */
export interface SectionActionConfig<Env, Db> {
  /** Resolve the section's database binding off the platform env; undefined or null fails the action closed (500). */
  resolveDb: (env: Env | undefined) => Db | undefined;
  /** Optional per-action rate limit, degrade-to-open: an unresolved binding never blocks. */
  rateLimit?: {
    resolve: (env: Env | undefined) => RateLimitLike | undefined;
    key: (ctx: AdminActionContext) => string;
    message?: string;
  };
}

/** Per-call-site options for one wrapped handler: the audit verbs, reused verbatim for denials. */
export interface SectionActionOptions {
  /** The verb, imperative, lowercase: reused as the audit `action` on every denial too. */
  action: string;
  /** The domain entity the action mutates: reused as the audit `entity` on every denial too. */
  entity: string;
  /**
   * The authorization target the access map matches; defaults to `event.route.id`, never
   * `event.url.pathname`. A route serving more than one section, or any route with a rest
   * parameter, must declare it: SvelteKit dispatches actions by `?/name` while the map matches
   * routes, and on a catch-all route the pathname is attacker-chosen while the route id is not.
   * On a parameterized route, `event.route.id` is the bracket form (`/admin/posts/[id]`), never
   * the concrete pathname a request carries; an access map keyed by concrete path stops matching.
   * The derived default drops route-group segments (`/admin/(app)/roster` reads as
   * `/admin/roster`), so a map stays keyed by URL shape; a declared target is used verbatim.
   */
  target?: string;
  /** Require owner capability on top of the map check, never instead of it. */
  ownerOnly?: boolean;
  /** Overrides the shared 403 copy; the shared 500 copy is never overridable (it names no gate). */
  deniedMessage?: string;
}

/**
 * One audit record a `createSectionAction`-wrapped handler emits through `ctx.audit`. `action`
 * and `entity` default from the call site's own `SectionActionOptions`, so the common call names
 * only what the options declaration does not already say; a handler touching more than one
 * entity (the confirmed two-row-touch case) still overrides either field.
 */
export interface SectionActionAudit {
  /** Overrides `opts.action`; omit to reuse the call site's own declared verb. */
  action?: string;
  /** Overrides `opts.entity`; omit to reuse the call site's own declared entity. */
  entity?: string;
  /** The mutated row's id, when the action names one. */
  entityId?: string | number;
  /** A compact human-readable detail. Never a secret, a token, or a full record. */
  detail?: string;
}

/** What a wrapped handler receives: adminAction's context, its own defaulting `audit`, plus the resolved binding. */
export type SectionActionContext<Db> = Omit<AdminActionContext, 'audit'> & {
  /** Emit one audit record; `action`/`entity` default from the call site's `SectionActionOptions`. */
  audit: (record: SectionActionAudit) => void;
  db: NonNullable<Db>;
};

const UNAVAILABLE_MESSAGE = 'This section is not available.';

/**
 * What `createSectionAction` returns: the per-call-site wrapper, curried over the handler's own
 *  success type `T` (declared as a generic function type rather than named per call site, since
 *  each `wrap(handler, opts)` call fixes a different `T`).
 */
export type SectionAction<Env, Db> = <T>(
  handler: (args: {
    event: CairnEvent<Env>;
    form: FormData;
    ctx: SectionActionContext<Db>;
  }) => Promise<T>,
  opts: SectionActionOptions,
) => (event: CairnEvent<Env>) => Promise<T | ActionFailure<{ error: string }>>;

/**
 * Build a section's form-action wrapper. The returned function takes `(handler, opts)` per call
 * site and produces a SvelteKit action, checked in order, fail-closed throughout:
 *
 * 1. `adminAction` composes underneath: editor resolution, CSRF, the single form read, the audit
 *    contract. A missing-editor session redirects to `/admin/login`; a CSRF mismatch throws
 *    SvelteKit's own `error(403, ...)`. Both propagate untouched, and both need no site
 *    `handleError` mapping: they are SvelteKit's own framework-native refusal channels.
 * 2. Rate limit, when configured: an unresolved binding, or a `key()`/`limit()` call that throws,
 *    degrades to open (never blocks) and logs `admin.action.rate_limit_absent` (unresolved
 *    binding) or `admin.action.rate_limit_failed` (a throwing call), so a forgotten
 *    `[[ratelimits]]` block or a transient binding error is observable, not a silent bypass or a
 *    500 the hand-rolled code never produced. A `key()`/`limit()` call that throws SvelteKit's own
 *    `redirect()`/`error()` is the one exception: those propagate untouched rather than degrading,
 *    the same rethrow `adminAction`'s own audit-sink guard applies. A present binding over its
 *    limit logs `admin.action.rate_limited` and returns `fail(429)`. No `ctx.audit` on this
 *    branch: a limiter denial is back-pressure, not a domain-state change.
 * 3. `event.locals.cairnAccess` absent audits `'rejected: access map not attached'`, logs
 *    `admin.action.misconfigured`, and returns `fail(500)`: the guard never ran on this route (a
 *    zero-config site attaches an empty map instead, per the guard's own contract). This check
 *    runs before authorization out of necessity, since a map cannot authorize against itself; it
 *    leaks nothing per-editor, since it is identical for every session.
 * 4. `hasAccessRule` false audits `'rejected: no access rule'` and returns `fail(403)`, mirroring
 *    `requireAccess` exactly, owner included: a POST must never be admitted where the load fails
 *    closed. Steps 4 and 5 run through `authorizeAdminTarget` (`./admin-action.js`), the one
 *    sequence `adminAction`'s opt-in `access` option also runs; only the refusal channel differs.
 * 5. `canReach` false, or `opts.ownerOnly` set against a non-owner session, audits
 *    `'rejected: role not admitted'` / `'rejected: not owner'` and returns `fail(403)`.
 * 6. `resolveDb` returning null or undefined audits `'rejected: database not bound'`, logs
 *    `admin.action.misconfigured`, and returns `fail(500)`: a deployment misconfiguration, not a
 *    denial. This runs last, after authorization, so a session the access map refuses learns
 *    nothing about whether the section's binding is deployed.
 * 7. The handler runs once with `ctx: { ...ctx, db }`, `ctx.audit` seeded to default `action` and
 *    `entity` from `opts` (a handler may still override either, for the confirmed two-row-touch
 *    case that mutates more than one entity in one call).
 *
 * `Env` does not infer from `resolveDb`'s parameter alone; annotate it (as below) or pass
 * explicit type arguments, else it collapses to `{}` and every downstream binding read stops
 * typechecking usefully.
 *
 * ```ts
 * // src/routes/admin/club/events/[id]/+page.server.ts
 * const sectionAction = createSectionAction<App.Platform['env'], D1Database>({
 *   resolveDb: (env: App.Platform['env'] | undefined) => env?.SECTION_DB,
 * });
 * export const actions = {
 *   approve: sectionAction(async ({ form, ctx }) => {
 *     const id = String(form.get('id'));
 *     await ctx.db.prepare('update event set approved = 1 where id = ?').bind(id).run();
 *     ctx.audit({ entityId: id }); // action/entity default to 'approve'/'event' below
 *     return { ok: true };
 *   }, { action: 'approve', entity: 'event' }),
 * };
 * ```
 *
 * Posture: fail-closed on every call, unconditionally, unlike `adminAction`'s own opt-in `access`
 * option: a target the map has no rule for refuses through {@link authorizeAdminTarget}, never the
 * permissive reading `canReach` gives an engine screen's own unmapped route.
 */
export function createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>): SectionAction<Env, Db> {
  return function wrap<T>(
    handler: (args: {
      event: CairnEvent<Env>;
      form: FormData;
      ctx: SectionActionContext<Db>;
    }) => Promise<T>,
    opts: SectionActionOptions,
  ): (event: CairnEvent<Env>) => Promise<T | ActionFailure<{ error: string }>> {
    const guarded = adminAction<T | ActionFailure<{ error: string }>>(async ({ event, form, ctx }) => {
      // adminAction's own declared event type is pinned to CairnEnv; it never reads
      // event.platform, so relabeling to this factory's own Env here is a type-level
      // correction, never a runtime behavior change (the underlying object is exactly what
      // this wrapper's caller passed in). A direct `as` assertion suffices, with no `unknown`
      // bridge: TypeScript's comparability check for an `as` cast treats the unconstrained
      // `Env` permissively regardless of which concrete env it is relabeled from. An earlier
      // version of this cast carried an `as unknown as` double hop here, on the stated grounds
      // that AuthEnv and Env shared no property names and would trip TypeScript's weak-type
      // check; that reasoning did not hold up on re-verification (dropping the `unknown` bridge
      // still compiles clean under the renamed CairnEnv), so the bridge came out as unneeded
      // ceremony, unrelated to the EmailSender/CairnPlatformBindings fix elsewhere in this file.
      // The cast itself stays: removing
      // it entirely reproduces a real TS2345 (`Env` is a fully unconstrained generic type
      // parameter, so `CairnEnv` is not assignable to it in either direction).
      const siteEvent = event as CairnEvent<Env>;
      const path = siteEvent.url.pathname;
      // event.route.id, never url.pathname: on a catch-all route the pathname is
      // attacker-chosen and the route id is not. A matched form action never actually sees a
      // null route id (only an unmatched request, an unreachable case here, does), but the
      // fallback stays a fixed non-matching constant, never the pathname, so a null id fails
      // closed rather than reintroducing the attacker-chosen value this derivation removes.
      // The derived id drops its route-group segments (targetFromRouteId), the one place a route
      // id and its URL disagree on a correctly configured site; an explicit opts.target is the
      // caller's own exact string and is never normalized.
      const target = opts.target ?? targetFromRouteId(siteEvent.route.id);

      /** Seeds `action`/`entity` from `opts` unless the caller overrides either. */
      function sectionAudit(record: SectionActionAudit): void {
        ctx.audit({
          action: record.action ?? opts.action,
          entity: record.entity ?? opts.entity,
          entityId: record.entityId,
          detail: record.detail,
        });
      }

      /** One refused-authorization exit: the audit carries which gate refused, the response never does. */
      function deny(detail: string): ActionFailure<{ error: string }> {
        ctx.audit({ action: opts.action, entity: opts.entity, detail });
        log.warn('auth.access.denied', { email: ctx.editor.email, role: ctx.editor.role, target });
        return fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE });
      }

      /** One deployment-fault exit: a 500 the site's operator reads in the log, not in the response. */
      function misconfigured(detail: string, reason: string): ActionFailure<{ error: string }> {
        ctx.audit({ action: opts.action, entity: opts.entity, detail });
        log.error('admin.action.misconfigured', { path, reason });
        return fail(500, { error: UNAVAILABLE_MESSAGE });
      }

      if (config.rateLimit) {
        const limiter = config.rateLimit.resolve(siteEvent.platform?.env);
        if (!limiter) {
          log.warn('admin.action.rate_limit_absent', { path, action: opts.action, entity: opts.entity });
        } else {
          // The site-supplied key() runs in its own try/catch, separate from resolveRateLimit's
          // own limit() call: SvelteKit's own redirect()/error(), thrown from key(), are plain
          // classes, not Error instances, and a site relying on either as control flow (a
          // hand-rolled auth check inside key(), say) must not be swallowed into a degrade-to-open
          // pass, mirroring adminAction's own audit-sink guard (./admin-action.js) exactly:
          // rethrow both untouched before logging. resolveRateLimit captures a throwing limit()
          // into its own 'failed' arm, so this catch only ever fires for a throwing key(); the
          // same rethrow for a throwing limit() rides that arm below.
          let key: string | undefined;
          try {
            key = config.rateLimit.key(ctx);
          } catch (err) {
            if (isRedirect(err) || isHttpError(err)) throw err;
            log.warn('admin.action.rate_limit_failed', {
              path,
              action: opts.action,
              entity: opts.entity,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          if (key !== undefined) {
            const result = await resolveRateLimit(limiter, key);
            if (result.outcome === 'failed') {
              // The same control-flow carve-out the key() catch above applies, on the arm
              // resolveRateLimit captures a throwing limit() into. resolveRateLimit stays
              // kit-agnostic by design (it lives under ../cloudflare and imports no kit
              // symbol), so the rethrow has to happen here, at the one call site that knows
              // about kit: a limiter that throws redirect() or error() is a site's own hard
              // stop, and degrading it to open would run the handler the site meant to refuse.
              if (isRedirect(result.error) || isHttpError(result.error)) throw result.error;
              log.warn('admin.action.rate_limit_failed', {
                path,
                action: opts.action,
                entity: opts.entity,
                error: result.error instanceof Error ? result.error.message : String(result.error),
              });
            } else if (result.outcome === 'limited') {
              log.warn('admin.action.rate_limited', {
                path,
                action: opts.action,
                entity: opts.entity,
                editor: ctx.editor.email,
              });
              return fail(429, {
                error: config.rateLimit.message ?? 'Too many requests. Wait a moment and try again.',
              });
            }
            // 'allowed' falls through to the authorization checks below.
          }
        }
      }

      // The access map's absence is checked before authorization, out of necessity (nothing can
      // authorize against a map that was never attached), never before the rate limit above.
      const access: AccessMap | undefined = siteEvent.locals.cairnAccess;
      if (access === undefined) {
        return misconfigured('rejected: access map not attached', 'access_map_not_attached');
      }

      // All three checks, in order, through the shared sequence adminAction's opt-in access
      // option also runs (authorizeAdminTarget, ./admin-action.js). This wrapper keeps its own
      // refusal channel: each refusing outcome audits and returns fail(403), where adminAction
      // audits and throws.
      const authorization = authorizeAdminTarget(access, ctx.editor, { target, ownerOnly: opts.ownerOnly });
      if (authorization.outcome !== 'allowed') return deny(ADMIN_DENIAL_DETAIL[authorization.outcome]);

      // resolveDb runs last, after every authorization check, so a session the access map
      // refuses learns nothing about whether the section's binding is deployed: its refusal
      // audits as a denial, never a config fault.
      const db = config.resolveDb(siteEvent.platform?.env);
      if (db == null) return misconfigured('rejected: database not bound', 'db_not_bound');

      // db excludes null and undefined by the check above; NonNullable<Db> also strips a null a
      // caller's own explicit Db argument might otherwise admit, so the check order above is what
      // a handler's ctx.db can rely on, never a type argument alone.
      const resolvedDb = db as NonNullable<Db>;
      return handler({ event: siteEvent, form, ctx: { ...ctx, audit: sectionAudit, db: resolvedDb } });
    });

    // The same relabeling as the `siteEvent` cast above, applied on the way out: adminAction
    // hands back an action typed against its own CairnEnv-pinned event, while this wrapper's
    // contract is the site's Env. Type-level only; see that cast's comment for why a direct
    // assertion, with no `unknown` bridge, is now enough.
    return guarded as (event: CairnEvent<Env>) => Promise<T | ActionFailure<{ error: string }>>;
  };
}

