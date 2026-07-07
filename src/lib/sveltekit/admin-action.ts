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
import { isActionFailure } from '@sveltejs/kit';
import { DEV } from 'esm-env';
import { csrfCookieName } from '../auth/crypto.js';
import { tokensMatch } from './csrf.js';
import { log } from '../log/index.js';
import type { Editor } from '../auth/types.js';
import type { CookieJar, EventBase } from './types.js';
import type { AuthEnv } from '../auth/types.js';

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

/** The minimal event shape `adminAction` reads: enough to verify CSRF, the editor, and the sink. */
export interface AdminActionEvent extends EventBase<AuthEnv> {
  cookies: CookieJar;
  locals: { editor?: Editor | null; auditSink?: AdminActionAuditSink };
}

/** What a wrapped handler receives: the verified editor and a bound audit emitter. */
export interface AdminActionContext {
  /** The verified editor; the only identity a wrapped action may act as. */
  editor: Editor;
  /** Emit one audit record. A mutating action that emits zero is a defect; see `adminAction`. */
  audit: (record: AdminActionAudit) => void;
}

/** Thrown by `adminAction` on a failed guard; a site's error boundary renders it as its `status`. */
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
 * Wrap a custom admin action's handler. In order, fail-closed at every step:
 *
 * 1. `event.locals.editor` must be populated (the engine's admin guard already resolved it); its
 *    absence throws a 403, never a redirect, since an action is not a page navigation.
 * 2. The double-submit CSRF token (the cookie the engine's admin loads issue, versus the `csrf`
 *    form field) must verify, constant-time. Defense-in-depth: the guard already checked this.
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
 */
export function adminAction<T>(
  handler: (args: { event: AdminActionEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
  deps: AdminActionDeps = {},
): (event: AdminActionEvent) => Promise<T> {
  const dev = deps.isDev ?? DEV;
  return async (event: AdminActionEvent): Promise<T> => {
    const editor = event.locals.editor;
    if (!editor) throw new AdminActionError(403, 'admin action without an editor session');

    // Read the form once: this is both the CSRF field's source and the handler's own body, so no
    // second read (a clone or a re-parse) ever runs against the same request.
    const form = await event.request.formData();
    const cookie = event.cookies.get(csrfCookieName(event.url.protocol === 'https:'));
    const submitted = String(form.get('csrf') ?? '');
    if (!cookie || !tokensMatch(submitted, cookie)) {
      throw new AdminActionError(403, 'CSRF verification failed');
    }

    let emitted = 0;
    const ctx: AdminActionContext = {
      editor,
      audit(record) {
        emitted++;
        const full: AdminActionAuditRecord = { ...record, editor: editor.email };
        log.info('admin.action.audited', { ...full });
        event.locals.auditSink?.(full);
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
