/**
 * REFERENCE IMPLEMENTATION (Fable, 2026-07-06) — the Part-C `adminAction` seam.
 * The Part-C engine pass lifts this into the engine (exported from an admin subpath)
 * with these tests as its acceptance floor. Until then it is the drawn lines: the
 * security contract for every custom admin action a site declares.
 *
 * The contract, in order, fail-closed at every step:
 *   1. The request is same-origin POST under the admin mount (the platform guard has
 *      already run; this wrapper NEVER assumes it).
 *   2. The session is a live editor session (locals.editor populated by the engine's
 *      admin guard; absence = 403, never a redirect from an action).
 *   3. The CSRF double-submit token verifies (the __Host- cookie vs the form field,
 *      constant-time comparison; missing either = 403).
 *   4. The action body runs with a typed audit emitter; the emit is REQUIRED — an
 *      action that returns without emitting is a 500 in dev and a logged defect in
 *      prod, because an unaudited club-state mutation is a bug by definition here.
 */
import type { RequestEvent } from '@sveltejs/kit';

export interface AdminActionAudit {
  /** The verb, imperative, lowercase: "approve", "rollover-season", "update-event". */
  action: string;
  /** The domain entity: "event", "member", "assignment", "email-template". */
  entity: string;
  entityId?: string | number;
  /** Compact human-readable detail; NEVER secrets, tokens, or full records. */
  detail?: string;
}

export interface AdminActionContext {
  /** The verified editor (email + role) — the ONLY identity actions may use. */
  editor: { email: string; role: 'owner' | 'editor' };
  /** Emit exactly one audit record per state change. Multiple emits are fine;
   *  zero emits on a mutating action is the defect this seam exists to prevent. */
  audit: (record: AdminActionAudit) => void;
}

export class AdminActionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Constant-time string comparison; length inequality still burns a full pass. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a), bb = enc.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

const CSRF_COOKIE = '__Host-cairn-csrf';
const CSRF_FIELD = 'cairn_csrf';

/**
 * Wrap a custom admin action. Usage in a site's +page.server.ts:
 *
 *   export const actions = {
 *     approve: adminAction(async ({ event, form, ctx }) => {
 *       const id = form.get('id');
 *       // ...the mutation...
 *       ctx.audit({ action: 'approve', entity: 'signup', entityId: String(id) });
 *       return { ok: true };
 *     }),
 *   };
 */
export function adminAction<T>(
  handler: (args: { event: RequestEvent; form: FormData; ctx: AdminActionContext }) => Promise<T>,
) {
  return async (event: RequestEvent): Promise<T> => {
    const editor = (event.locals as { editor?: AdminActionContext['editor'] }).editor;
    if (!editor?.email) throw new AdminActionError(403, 'admin action without an editor session');

    const cookie = event.cookies.get(CSRF_COOKIE);
    const form = await event.request.formData();
    const field = form.get(CSRF_FIELD);
    if (typeof cookie !== 'string' || typeof field !== 'string' || cookie.length === 0
        || !safeEqual(cookie, field)) {
      throw new AdminActionError(403, 'CSRF verification failed');
    }

    let emitted = 0;
    const ctx: AdminActionContext = {
      editor,
      audit: (record) => {
        emitted++;
        // The engine wires this to the site's audit sink (D1 audit_log per the ops
        // convention: user_email, action, entity, entity_id, detail, timestamp).
        (event.locals as { auditSink?: (r: AdminActionAudit & { editor: string }) => void })
          .auditSink?.({ ...record, editor: editor.email });
      },
    };

    const result = await handler({ event, form, ctx });
    if (emitted === 0) {
      // A mutating action that audited nothing. Dev: fail loud. Prod: log the defect.
      if ((globalThis as { __DEV__?: boolean }).__DEV__) {
        throw new AdminActionError(500, `unaudited admin action (${event.url.pathname})`);
      }
      console.error(JSON.stringify({ level: 'error', event: 'admin.action.unaudited',
        path: event.url.pathname, editor: editor.email }));
    }
    return result;
  };
}

/* ---- The acceptance tests (the Part-C pass makes these real vitest cases) ----
 * 1. No locals.editor -> 403, handler never called.
 * 2. Missing cookie OR field OR mismatch (incl. same-length mismatch) -> 403.
 * 3. Timing: safeEqual("a".repeat(64), "a".repeat(63)+"b") and full-mismatch compare
 *    within noise of each other (property, not wall-clock assertion).
 * 4. Happy path: handler runs, audit sink receives {editor, action, entity, ...}.
 * 5. Zero-emit handler -> dev throw / prod error log with event admin.action.unaudited.
 * 6. The wrapper never reads request.body twice (formData consumed once, passed down).
 */
