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
// `key()`/`limit()` call, never blocks) and its `fail(429)` branch emits no `ctx.audit` (back
// pressure is not a domain-state change). Every other refusal audits through `ctx.audit`
// (adminAction's own contract). Every user-facing message stays deliberately generic (both 403s
// share one string, both 500s share another) so a session learns no deployment or gating detail
// from a refusal; the branch identity lives in the audit `detail` and the structured log.
import { fail } from '@sveltejs/kit';
import { adminAction } from './admin-action.js';
import { canReach, hasAccessRule } from '../auth/access.js';
import { log } from '../log/index.js';
import type { AdminActionContext, AdminActionEvent } from './admin-action.js';
import type { AccessMap } from '../auth/access.js';
import type { ActionFailure } from '@sveltejs/kit';

/** The structural slice of a Workers RateLimit binding the wrapper calls; any conforming limiter serves. */
export interface RateLimitLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

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
   * The authorization target the access map matches; defaults to `event.url.pathname`. A route
   * serving more than one section, or any route with a rest parameter, must declare it:
   * SvelteKit dispatches actions by `?/name` while the map matches paths, and on a catch-all
   * route the pathname is attacker-chosen.
   */
  target?: string;
  /** Require owner capability on top of the map check, never instead of it. */
  ownerOnly?: boolean;
  /** Overrides the shared 403 copy; the shared 500 copy is never overridable (it names no gate). */
  deniedMessage?: string;
}

/** What a wrapped handler receives: adminAction's context plus the resolved binding. */
export type SectionActionContext<Db> = AdminActionContext & { db: NonNullable<Db> };

const DENIED_MESSAGE = 'You do not have access to this action.';
const UNAVAILABLE_MESSAGE = 'This section is not available.';

/**
 * Build a section's form-action wrapper. The returned function takes `(handler, opts)` per call
 * site and produces a SvelteKit action, checked in order, fail-closed throughout:
 *
 * 1. `adminAction` composes underneath: editor resolution, CSRF, the single form read, the audit
 *    contract. A refusal it throws (`AdminActionError`) propagates untouched; a site maps it in
 *    `handleError`.
 * 2. Rate limit, when configured: an unresolved binding, or a `key()`/`limit()` call that throws,
 *    degrades to open (never blocks) and logs `admin.action.rate_limit_absent` (unresolved
 *    binding) or `admin.action.rate_limit_failed` (a throwing call), so a forgotten
 *    `[[ratelimits]]` block or a transient binding error is observable, not a silent bypass or a
 *    500 the hand-rolled code never produced. A present binding over its limit logs
 *    `admin.action.rate_limited` and returns `fail(429)`. No `ctx.audit` on this branch: a
 *    limiter denial is back-pressure, not a domain-state change.
 * 3. `event.locals.cairnAccess` absent audits `'rejected: access map not attached'`, logs
 *    `admin.action.misconfigured`, and returns `fail(500)`: the guard never ran on this route (a
 *    zero-config site attaches an empty map instead, per the guard's own contract). This check
 *    runs before authorization out of necessity, since a map cannot authorize against itself; it
 *    leaks nothing per-editor, since it is identical for every session.
 * 4. `hasAccessRule` false audits `'rejected: no access rule'` and returns `fail(403)`, mirroring
 *    `requireAccess` exactly, owner included: a POST must never be admitted where the load fails
 *    closed.
 * 5. `canReach` false, or `opts.ownerOnly` set against a non-owner session, audits
 *    `'rejected: role not admitted'` / `'rejected: not owner'` and returns `fail(403)`.
 * 6. `resolveDb` returning null or undefined audits `'rejected: database not bound'`, logs
 *    `admin.action.misconfigured`, and returns `fail(500)`: a deployment misconfiguration, not a
 *    denial. This runs last, after authorization, so a session the access map refuses learns
 *    nothing about whether the section's binding is deployed.
 * 7. The handler runs once with `ctx: { ...ctx, db }`.
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
 *     ctx.audit({ action: 'approve', entity: 'event', entityId: id });
 *     return { ok: true };
 *   }, { action: 'approve', entity: 'event' }),
 * };
 * ```
 */
export function createSectionAction<Env, Db>(config: SectionActionConfig<Env, Db>) {
  return function wrap<T>(
    handler: (args: {
      event: AdminActionEvent<Env>;
      form: FormData;
      ctx: SectionActionContext<Db>;
    }) => Promise<T>,
    opts: SectionActionOptions,
  ): (event: AdminActionEvent<Env>) => Promise<T | ActionFailure<{ error: string }>> {
    return adminAction<T | ActionFailure<{ error: string }>>(async ({ event, form, ctx }) => {
      // adminAction's own declared event type is pinned to AuthEnv; it never reads
      // event.platform, so relabeling to this factory's own Env here is a type-level
      // correction, never a runtime behavior change (the underlying object is exactly what
      // this wrapper's caller passed in). Env is unconstrained (a site's own binding env
      // shares no property names with AuthEnv, which TypeScript's weak-type check would
      // otherwise reject as a likely mistake), so the relabeling goes through `unknown`.
      const siteEvent = event as unknown as AdminActionEvent<Env>;
      const path = siteEvent.url.pathname;
      const target = opts.target ?? path;

      if (config.rateLimit) {
        const limiter = config.rateLimit.resolve(siteEvent.platform?.env);
        if (!limiter) {
          log.warn('admin.action.rate_limit_absent', { path, action: opts.action, entity: opts.entity });
        } else {
          let blocked = false;
          try {
            const result = await limiter.limit({ key: config.rateLimit.key(ctx) });
            blocked = !result.success;
          } catch (err) {
            // Both a throwing key() and a throwing limit() land here (key() is evaluated as an
            // argument to limit(), inside this same try); either way the limit was never
            // actually checked, which is distinct from rate_limit_absent's "no binding at all".
            log.warn('admin.action.rate_limit_failed', {
              path,
              action: opts.action,
              entity: opts.entity,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          if (blocked) {
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
        }
      }

      // The access map's absence is checked before authorization, out of necessity (nothing can
      // authorize against a map that was never attached), never before the rate limit above.
      const access: AccessMap | undefined = siteEvent.locals.cairnAccess;
      if (access === undefined) {
        ctx.audit({ action: opts.action, entity: opts.entity, detail: 'rejected: access map not attached' });
        log.error('admin.action.misconfigured', { path, reason: 'access_map_not_attached' });
        return fail(500, { error: UNAVAILABLE_MESSAGE });
      }

      if (!hasAccessRule(access, target)) {
        ctx.audit({ action: opts.action, entity: opts.entity, detail: 'rejected: no access rule' });
        log.warn('auth.access.denied', { email: ctx.editor.email, role: ctx.editor.role, target });
        return fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE });
      }

      if (!canReach(access, ctx.editor, target)) {
        ctx.audit({ action: opts.action, entity: opts.entity, detail: 'rejected: role not admitted' });
        log.warn('auth.access.denied', { email: ctx.editor.email, role: ctx.editor.role, target });
        return fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE });
      }

      if (opts.ownerOnly && ctx.editor.capability !== 'owner') {
        ctx.audit({ action: opts.action, entity: opts.entity, detail: 'rejected: not owner' });
        log.warn('auth.access.denied', { email: ctx.editor.email, role: ctx.editor.role, target });
        return fail(403, { error: opts.deniedMessage ?? DENIED_MESSAGE });
      }

      // resolveDb runs last, after every authorization check, so a session the access map
      // refuses learns nothing about whether the section's binding is deployed: its refusal
      // audits as a denial, never a config fault.
      const db = config.resolveDb(siteEvent.platform?.env);
      if (db == null) {
        ctx.audit({ action: opts.action, entity: opts.entity, detail: 'rejected: database not bound' });
        log.error('admin.action.misconfigured', { path, reason: 'db_not_bound' });
        return fail(500, { error: UNAVAILABLE_MESSAGE });
      }

      // db excludes null and undefined by the check above; NonNullable<Db> also strips a null a
      // caller's own explicit Db argument might otherwise admit, so the check order above is what
      // a handler's ctx.db can rely on, never a type argument alone.
      const resolvedDb = db as NonNullable<Db>;
      return handler({ event: siteEvent, form, ctx: { ...ctx, db: resolvedDb } });
    }) as unknown as (event: AdminActionEvent<Env>) => Promise<T | ActionFailure<{ error: string }>>;
  };
}

