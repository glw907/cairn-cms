// cairn-cms: the admin-scoped action wrapper (Part C item 3 of the phase-2 design suite). A site
// building its own `/admin/` screen needs the same editor + CSRF + audit contract every engine
// action honors; this wraps a custom form action with that contract instead of a site
// hand-rolling it.
//
// SCAFFOLD FINDING (the reference stand-in that shaped this, aksailingclub-org's club-admin-scaffold):
// `createAuthGuard` (guard.ts) already verifies the double-submit CSRF token on every unsafe POST
// under `/admin/**`, custom routes included, before any route's own load or action runs. The
// check below is therefore defense-in-depth, not the sole gate; this wrapper's real value is
// resolving the signed-in editor as a typed `ctx.editor` and requiring an audit emit for a
// mutating action, which the engine has no other hook for.
import { error, isActionFailure, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { DEV } from 'esm-env';
import { csrfCookieName } from '../auth/crypto.js';
import { csrfHeaderVerdict, csrfFieldVerdict, csrfSecure } from './csrf.js';
import { canReach, hasAccessRule } from '../auth/access.js';
import { log } from '../log/index.js';
import type { AccessMap } from '../auth/access.js';
import type { Editor } from '../auth/types.js';
import type { CairnEvent } from './types.js';

/** One audit-log record a mutating admin action must emit through `ctx.audit`. */
export interface AdminActionAudit {
  /** The verb, imperative, lowercase: `"approve"`, `"rollover-season"`, `"update-event"`. */
  action: string;
  /** The domain entity the action mutated: `"event"`, `"member"`, `"assignment"`. */
  entity: string;
  /** The mutated row's id, when the action names one. */
  entityId?: string | number;
  /** A compact human-readable detail. Never a secret, a token, or a full record. */
  detail?: string;
}

/**
 * What a site's audit sink receives. `adminAction` and `createSectionAction` set `actor` to the
 * verified editor's email. A site may also call a sink directly to record its own domain events,
 * `createD1AuditSink` included. `actor` then holds whatever identity that event names, and need
 * not be a cairn editor.
 */
export type AdminActionAuditRecord = AdminActionAudit & { actor: string };

/** A site-supplied sink for `adminAction`'s audit records, wired through `event.locals.cairnAuditSink`. */
export type AdminActionAuditSink = (record: AdminActionAuditRecord) => void;

/** What a wrapped handler receives: the verified editor and a bound audit emitter. */
export interface AdminActionContext {
  /** The verified editor; the only identity a wrapped action may act as. */
  editor: Editor;
  /** Emit one audit record. A mutating action that emits zero is a defect; see `adminAction`. */
  audit: (record: AdminActionAudit) => void;
}

/**
 * Thrown by `adminAction` for exactly one meaning: a handler that returned normally (not
 * `fail()`) having emitted zero `ctx.audit` records, thrown only when running under `esm-env`'s
 * `DEV` (or `deps.isDev`). It is a build-time author signal, not a production refusal: in
 * production the same condition logs `admin.action.unaudited` instead (see `adminAction`).
 * `adminAction`'s own authorization refusals, a missing editor session or a CSRF mismatch, throw
 * SvelteKit's own `redirect()` or `error()` instead, which carry their status to the browser
 * directly and need no `handleError` mapping; this class carries no production status and never
 * stood for one.
 */
export class UnauditedActionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Injectable dependencies for `adminAction`, so a test can drive both branches of the unaudited path. */
export interface AdminActionOptions {
  /** Overrides the build-time dev flag; every real caller takes the default (`esm-env`'s `DEV`). */
  isDev?: boolean;
  /**
   * Opt in to the access-map authorization `createSectionAction` performs, checked against
   * `target` (an access-map key, never a request pathname) with `ownerOnly` stacking on top of
   * the map check rather than standing in for it. Omitted, `adminAction` authorizes nothing, its
   * behavior for every existing caller. Present, a refused session is audited through
   * `ctx.audit` and then thrown as `error(403, ...)`.
   */
  access?: { target: string; ownerOnly?: boolean };
}

/**
 * What {@link authorizeAdminTarget} answers: admitted, or which of the three gates refused. The
 * caller owns the refusal channel, so the grammar names only the finding.
 */
export type AdminTargetAuthorization =
  | { outcome: 'allowed' }
  | { outcome: 'no-rule' }
  | { outcome: 'not-admitted' }
  | { outcome: 'not-owner' };

/**
 * The audit `detail` each refusal records, one string per refusing gate. Shared so `adminAction`
 * and `createSectionAction` record a denial identically, whatever channel each refuses through.
 */
export const ADMIN_DENIAL_DETAIL: Record<Exclude<AdminTargetAuthorization['outcome'], 'allowed'>, string> = {
  'no-rule': 'rejected: no access rule',
  'not-admitted': 'rejected: role not admitted',
  'not-owner': 'rejected: not owner',
};

/** The 403 copy every authorization refusal carries; a refusal must name no gate to the browser. */
export const DENIED_MESSAGE = 'You do not have access to this action.';

/**
 * Decide whether `editor` may act on `target`, the one authorization sequence both admin action
 * wrappers run. All three checks, in this order: `hasAccessRule` never collapses into `canReach`,
 * whose permissive reading of an unmapped target is nav semantics rather than an authorization
 * floor a POST can rely on, and `ownerOnly` stacks on the map check rather than replacing it. An
 * absent map (the guard never ran on this route) has no rule for any target, so it refuses.
 *
 * Internal to the engine, and deliberately not exported from `/sveltekit`: the two wrappers are
 * the supported surface, and a site reaching for the predicate directly wants
 * [`requireAccess`](./guard.js) instead, which owns its own refusal channel.
 */
export function authorizeAdminTarget(
  access: AccessMap | undefined,
  editor: Editor,
  opts: { target: string; ownerOnly?: boolean },
): AdminTargetAuthorization {
  if (!hasAccessRule(access, opts.target)) return { outcome: 'no-rule' };
  if (!canReach(access, editor, opts.target)) return { outcome: 'not-admitted' };
  if (opts.ownerOnly && editor.capability !== 'owner') return { outcome: 'not-owner' };
  return { outcome: 'allowed' };
}

/**
 * Turn an arbitrary thrown or rejected value into a diagnostic string for a log record. Bare
 * `String()` renders a plain object as `"[object Object]"`, which is not diagnostic; this falls
 * back to `JSON.stringify` for anything that is not already an `Error` or a string.
 */
function serializeThrownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Wrap a custom admin action's handler. In order, fail-closed at every step:
 *
 * 1. `event.locals.cairnEditor` must be populated (the engine's admin guard already resolved it); its
 *    absence means the session expired or was never established, so this logs
 *    `admin.action.session_absent` and redirects to `/admin/login`, matching `requireSession`
 *    (`./guard.js`) exactly: an editor whose session lapsed needs the login page, not an error
 *    page.
 * 2. The double-submit CSRF token must verify, constant-time, checked the same way the guard
 *    checks it (`./guard.js`): a header witness that was sent at all decides outright, matching or
 *    not, and the cookie-against-`csrf`-form-field check runs only when no `X-Cairn-CSRF` header
 *    was sent. Defense-in-depth: the guard already checked this on every unsafe `/admin/**` POST.
 *    A mismatch here is a genuine refusal, not a session expiry, and throws SvelteKit's own
 *    `error(403, ...)`, rendered through the nearest `+error.svelte`.
 * 3. With `deps.access` set, and only then, the site's access map must admit the session for the
 *    declared target (see {@link authorizeAdminTarget}); a refusal audits through `ctx.audit`,
 *    logs `auth.access.denied`, and throws `error(403, ...)`. Omitted, this step does not run at
 *    all, which is the behavior every caller had before the option existed.
 * 4. The handler runs once with a typed `ctx.audit` emitter closed over the verified editor. A
 *    handler that returns normally (its request succeeded) and emitted zero records throws a 500
 *    in dev (a loud signal an author fixes before shipping) and logs `admin.action.unaudited` in
 *    production (an unaudited state change is a defect here, but should not 500 a live site). A
 *    handler that returns an `ActionFailure` (SvelteKit's `fail()`) is exempt from this check: a
 *    rejected request mutated nothing, so it owes no audit, and requiring one only trains authors
 *    to emit a spurious record on every validation reject. The exemption assumes the handler
 *    rejects BEFORE mutating; a handler that mutates and then returns `fail()` must still emit,
 *    since nothing rolls its writes back and the wrapper cannot see them.
 * 5. `event.request.formData()` is read exactly once, here, and handed to the handler, so the
 *    handler never re-reads an already-consumed body.
 *
 * ```ts
 * // src/routes/admin/club/events/[id]/+page.server.ts
 * export const actions = {
 *   approve: adminAction(async ({ form, ctx }) => {
 *     const id = String(form.get('id'));
 *     await db.signups.approve(id);
 *     ctx.audit({ action: 'approve', entity: 'signup', entityId: id });
 *     return { ok: true };
 *   }),
 * };
 * ```
 *
 * `adminAction` itself stays non-generic over `Env` by design (env-genericity sweep, pre-beta C1
 * Task 2), on the same grounds as {@link CairnEvent}'s own default, not because it never reads
 * `event.platform`: its returned function is declared as taking `CairnEvent<CairnEnv>` (the
 * default type parameter), and a compile-only fixture (`src/tests/unit/env-genericity.test.ts`)
 * proves that assigns clean into a route's generated `Actions` under a realistic compliant
 * `App.Platform['env']`, because `CairnPlatformBindings` (`./platform-bindings.js`) shares
 * `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN` property names with `CairnEnv`, which is what keeps
 * TypeScript's weak-type detection (TS2559) from rejecting the assignment. A site whose action
 * needs its own env bindings, plus a database binding to resolve, reaches for
 * `createSectionAction` (`./section-action.js`), which is generic over `Env` for exactly that
 * reason; note its factory requires a `resolveDb`, so a site wanting only the CSRF-plus-audit
 * contract with no database binding stays on `adminAction` itself rather than reaching for that
 * door.
 *
 * Posture: fail-closed once `deps.access` opts in. An unmapped target then refuses through
 * {@link authorizeAdminTarget} rather than falling back to `canReach`'s own permissive nav
 * reading, since a site-authored POST needs an authorization floor it can rely on absolutely.
 */
export function adminAction<T>(
  handler: (args: { event: CairnEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
  deps: AdminActionOptions = {},
): (event: CairnEvent) => Promise<T> {
  const dev = deps.isDev ?? DEV;
  return async (event: CairnEvent): Promise<T> => {
    const editor = event.locals.cairnEditor;
    if (!editor) {
      log.warn('admin.action.session_absent', { path: event.url.pathname });
      throw redirect(303, '/admin/login');
    }

    // Read the form once: this is both the CSRF field's source and the handler's own body, so no
    // second read (a clone or a re-parse) ever runs against the same request.
    const form = await event.request.formData();
    // The header witness decides outright when it was sent at all, mirroring the guard's own
    // precedence (./guard.js): a valid X-Cairn-CSRF header clears the request outright, and a
    // header that was sent but wrong rejects on its own verdict rather than falling through to the
    // field path. Only with NO header sent at all does the form-field compare run, so a fetch-based
    // custom action that sets the header and posts FormData with no csrf field still passes this
    // inner check the same way it already passes the guard's outer one.
    const headerSent = event.request.headers.get('x-cairn-csrf') !== null;
    const verdict = headerSent
      ? csrfHeaderVerdict({
          url: event.url,
          request: event.request,
          cookies: event.cookies,
          platform: event.platform,
        })
      : csrfFieldVerdict(
          event.cookies.get(csrfCookieName(csrfSecure({ url: event.url, platform: event.platform }))),
          form,
        );
    if (!verdict.ok) {
      // The admin guard already validates this double-submit pair on every unsafe /admin/** POST
      // before resolve() runs, so a mismatch reaching here is defense-in-depth catching what
      // should already be impossible in production. Log the specific reason and which witness
      // produced it; the response never gets either, since it renders to a real browser through
      // the nearest +error.svelte. No hasSession field here (unlike the guard's own record): this
      // wrapper only ever runs with a resolved editor, so a session is always known to be present.
      log.warn('admin.action.csrf_rejected', {
        path: event.url.pathname,
        editor: editor.email,
        detail: verdict.detail,
        witness: headerSent ? 'header' : 'field',
      });
      throw error(403, 'This request could not be verified. Please refresh the page and try again.');
    }

    let emitted = 0;
    const ctx: AdminActionContext = {
      editor,
      audit(record) {
        emitted++;
        const full: AdminActionAuditRecord = { ...record, actor: editor.email };
        log.info('admin.action.audited', { ...full });
        // Fail-open, per the seam's documented promise (docs/reference/sveltekit.md): a site's
        // own hand-rolled sink is arbitrary code the engine does not control, and the mutation
        // this record describes already completed. A throw, or a rejected async return, here
        // must never turn that completed write into a failed action. `admin.action.audited`
        // above already logged the full record, so this failure log carries only the identity
        // fields and the error, never `record.detail`, which can hold arbitrary site data.
        const logSinkFailure = (error: unknown): void => {
          log.error('admin.action.sink_threw', {
            path: event.url.pathname,
            action: record.action,
            entity: record.entity,
            entityId: record.entityId,
            editor: editor.email,
            error: serializeThrownError(error),
          });
        };
        try {
          const outcome = event.locals.cairnAuditSink?.(full);
          // The sink's declared type is `(record) => void`, but TypeScript's void-return
          // bivariance admits an async function with no error (docs/extend/add-a-custom-admin-
          // screen.md's own `waitUntil` advice is exactly the pressure that writes one). The
          // call above is never awaited, since the seam is synchronous by contract; attach a
          // rejection handler instead, fire-and-forget, so a rejecting async sink still logs.
          if (outcome != null && typeof (outcome as { then?: unknown }).then === 'function') {
            Promise.resolve(outcome as PromiseLike<unknown>).catch(logSinkFailure);
          }
        } catch (error) {
          // SvelteKit's own redirect()/error() are plain classes, not Error instances, and a
          // sink built on those (a hand-rolled auth check, say) must not be swallowed into a log
          // line the site never sees. Rethrow SvelteKit's own control-flow shapes untouched; only
          // a genuine sink failure is caught and logged here.
          if (isRedirect(error) || isHttpError(error)) throw error;
          logSinkFailure(error);
        }
      },
    };

    // Opt-in authorization, after the CSRF gate and before the handler. Absent `deps.access`,
    // nothing runs here, which is every existing caller's behavior: the zero-config guard
    // attaches an EMPTY access map rather than none, and an empty map has no rule for any target,
    // so enforcing by default would 403 every consumer of the documented DB-less default instead
    // of hardening anything. A refusal audits first, through the same sink a site already reads,
    // and then throws error(403): authorization refusals are adminAction's own channel, so the
    // wrapper's return type stays the handler's own T.
    if (deps.access) {
      const authorization = authorizeAdminTarget(event.locals.cairnAccess, editor, deps.access);
      if (authorization.outcome !== 'allowed') {
        ctx.audit({ action: 'deny', entity: 'admin-action', detail: ADMIN_DENIAL_DETAIL[authorization.outcome] });
        log.warn('auth.access.denied', { email: editor.email, role: editor.role, target: deps.access.target });
        throw error(403, DENIED_MESSAGE);
      }
    }

    const result = await handler({ event, form, ctx });
    // `isActionFailure` is SvelteKit's own runtime-safe check for a `fail()` result (an
    // `instanceof` test against its internal `ActionFailure` class, re-exported as a type guard
    // precisely so callers never need to know that class's shape); a rejected request mutated
    // nothing, so it is exempt from the unaudited check below.
    if (emitted === 0 && !isActionFailure(result)) {
      if (dev) throw new UnauditedActionError(500, `unaudited admin action (${event.url.pathname})`);
      log.error('admin.action.unaudited', { path: event.url.pathname, editor: editor.email });
    }
    return result;
  };
}
