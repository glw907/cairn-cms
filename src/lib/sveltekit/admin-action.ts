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
import { csrfCookieName, tokensMatch } from '../auth/crypto.js';
import { log } from '../log/index.js';
import type { Editor } from '../auth/types.js';
import type { CookieJar, EventBase } from './types.js';
import type { AuthEnv } from '../auth/types.js';
import type { AccessMap } from '../auth/access.js';

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

/** What a site's audit sink receives: the record plus the acting editor's email. */
export type AdminActionAuditRecord = AdminActionAudit & { editor: string };

/** A site-supplied sink for `adminAction`'s audit records, wired through `event.locals.auditSink`. */
export type AdminActionAuditSink = (record: AdminActionAuditRecord) => void;

/**
 * The minimal event shape `adminAction` reads: enough to verify CSRF, the editor, and the sink.
 * Generic over the platform env so `createSectionAction`'s produced wrapper (`./section-action.js`)
 * stays assignable to a route's generated `Actions` when a site's own `App.Platform['env']` names
 * its own bindings; the default preserves every existing consumer's meaning, since `adminAction`
 * itself never reads `event.platform`. `locals.cairnAccess` mirrors what `EventBase` already
 * carries, typed here so a wrapper built on this event can read it without a cast.
 */
export interface AdminActionEvent<Env = AuthEnv> extends EventBase<Env> {
  cookies: CookieJar;
  locals: { editor?: Editor | null; auditSink?: AdminActionAuditSink; cairnAccess?: AccessMap };
}

/** What a wrapped handler receives: the verified editor and a bound audit emitter. */
export interface AdminActionContext {
  /** The verified editor; the only identity a wrapped action may act as. */
  editor: Editor;
  /** Emit one audit record. A mutating action that emits zero is a defect; see `adminAction`. */
  audit: (record: AdminActionAudit) => void;
}

/**
 * Thrown by `adminAction` for its one remaining dev-time defect signal: a handler that returned
 * normally (not `fail()`) having emitted zero `ctx.audit` records, thrown only when running under
 * `esm-env`'s `DEV` (or `deps.isDev`). It is a build-time author signal, not a production refusal:
 * in production the same condition logs `admin.action.unaudited` instead (see `adminAction`).
 * Every other refusal `adminAction` makes, a missing editor session or a CSRF mismatch, is
 * SvelteKit's own `redirect()` or `error()`, which carry their status to the browser directly and
 * need no `handleError` mapping; this class no longer stands in for one.
 */
export class AdminActionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Injectable dependencies for `adminAction`, so a test can drive both branches of the unaudited path. */
export interface AdminActionDeps {
  /** Overrides the build-time dev flag; every real caller takes the default (`esm-env`'s `DEV`). */
  isDev?: boolean;
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
 * 1. `event.locals.editor` must be populated (the engine's admin guard already resolved it); its
 *    absence means the session expired or was never established, so this redirects to
 *    `/admin/login`, matching `requireSession` (`./guard.js`) exactly: an editor whose session
 *    lapsed needs the login page, not an error page.
 * 2. The double-submit CSRF token (the cookie the engine's admin loads issue, versus the `csrf`
 *    form field) must verify, constant-time. Defense-in-depth: the guard already checked this. A
 *    mismatch here is a genuine refusal, not a session expiry, and throws SvelteKit's own
 *    `error(403, ...)`, rendered through the nearest `+error.svelte`.
 * 3. The handler runs once with a typed `ctx.audit` emitter closed over the verified editor. A
 *    handler that returns normally (its request succeeded) and emitted zero records throws a 500
 *    in dev (a loud signal an author fixes before shipping) and logs `admin.action.unaudited` in
 *    production (an unaudited state change is a defect here, but should not 500 a live site). A
 *    handler that returns an `ActionFailure` (SvelteKit's `fail()`) is exempt from this check: a
 *    rejected request mutated nothing, so it owes no audit, and requiring one only trains authors
 *    to emit a spurious record on every validation reject. The exemption assumes the handler
 *    rejects BEFORE mutating; a handler that mutates and then returns `fail()` must still emit,
 *    since nothing rolls its writes back and the wrapper cannot see them.
 * 4. `event.request.formData()` is read exactly once, here, and handed to the handler, so the
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
 * Task 2), on the same grounds as `RequestContext`'s pin (`./types.js`), not because it never
 * reads `event.platform`: its returned function is declared as taking `AdminActionEvent<AuthEnv>`
 * (the default type parameter), and a compile-only fixture
 * (`src/tests/unit/env-genericity.test.ts`) proves that assigns clean into a route's generated
 * `Actions` under a realistic compliant `App.Platform['env']`, because `CairnPlatformBindings`
 * (`./platform-bindings.js`) shares `AUTH_DB`/`EMAIL`/`PUBLIC_ORIGIN` property names with
 * `AuthEnv`, which is what keeps TypeScript's weak-type detection (TS2559) from rejecting the
 * assignment. A site whose action needs its own env bindings, plus a database binding to resolve,
 * reaches for `createSectionAction` (`./section-action.js`), which is generic over `Env` for
 * exactly that reason; note its factory requires a `resolveDb`, so a site wanting only the CSRF-
 * plus-audit contract with no database binding stays on `adminAction` itself rather than reaching
 * for that door.
 */
export function adminAction<T>(
  handler: (args: { event: AdminActionEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
  deps: AdminActionDeps = {},
): (event: AdminActionEvent) => Promise<T> {
  const dev = deps.isDev ?? DEV;
  return async (event: AdminActionEvent): Promise<T> => {
    const editor = event.locals.editor;
    if (!editor) throw redirect(303, '/admin/login');

    // Read the form once: this is both the CSRF field's source and the handler's own body, so no
    // second read (a clone or a re-parse) ever runs against the same request.
    const form = await event.request.formData();
    const cookie = event.cookies.get(csrfCookieName(event.url.protocol === 'https:'));
    const submitted = String(form.get('csrf') ?? '');
    if (!cookie || !tokensMatch(submitted, cookie)) {
      // The admin guard already validates this double-submit pair on every unsafe /admin/** POST
      // before resolve() runs, so a mismatch reaching here is defense-in-depth catching what
      // should already be impossible in production. Log the specific reason; the response never
      // gets it, since it renders to a real browser through the nearest +error.svelte.
      log.warn('admin.action.csrf_rejected', { path: event.url.pathname, editor: editor.email });
      throw error(403, 'This request could not be verified. Please refresh the page and try again.');
    }

    let emitted = 0;
    const ctx: AdminActionContext = {
      editor,
      audit(record) {
        emitted++;
        const full: AdminActionAuditRecord = { ...record, editor: editor.email };
        log.info('admin.action.audited', { ...full });
        // Fail-open, per the seam's documented promise (docs/reference/sveltekit.md): a site's
        // own hand-rolled sink is arbitrary code the engine does not control, and the mutation
        // this record describes already completed. A throw, or a rejected async return, here
        // must never turn that completed write into a failed action. `admin.action.audited`
        // above already logged the full record, so this failure log carries only the identity
        // fields and the error, never `record.detail`, which can hold arbitrary site data.
        const logSinkFailure = (error: unknown): void => {
          log.error('admin.action.audit_sink_failed', {
            path: event.url.pathname,
            action: record.action,
            entity: record.entity,
            entityId: record.entityId,
            editor: editor.email,
            error: serializeThrownError(error),
          });
        };
        try {
          const outcome = event.locals.auditSink?.(full);
          // The sink's declared type is `(record) => void`, but TypeScript's void-return
          // bivariance admits an async function with no error (docs/guides/add-a-custom-admin-
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

    const result = await handler({ event, form, ctx });
    // `isActionFailure` is SvelteKit's own runtime-safe check for a `fail()` result (an
    // `instanceof` test against its internal `ActionFailure` class, re-exported as a type guard
    // precisely so callers never need to know that class's shape); a rejected request mutated
    // nothing, so it is exempt from the unaudited check below.
    if (emitted === 0 && !isActionFailure(result)) {
      if (dev) throw new AdminActionError(500, `unaudited admin action (${event.url.pathname})`);
      log.error('admin.action.unaudited', { path: event.url.pathname, editor: editor.email });
    }
    return result;
  };
}
