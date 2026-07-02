// Owner-gated editor management. The editor table is the allowlist, so add and remove are
// insert and delete. The anti-lockout rule is the last remaining owner: the system refuses to
// drop below one owner (spec 7.1), enforced in the store by an atomic guarded write rather
// than a separate count, so concurrent removals cannot strand the allowlist at zero owners.
import { fail } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { requireOwner } from './guard.js';
import { requireDb } from '../env.js';
import { log } from '../log/index.js';
import {
  listEditors,
  findEditor,
  insertEditor,
  deleteEditor,
  setEditorRole,
  removeOwnerIfNotLast,
  demoteOwnerIfNotLast,
} from '../auth/store.js';
import type { Editor, Role } from '../auth/types.js';
import type { RequestContext } from './types.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseRole(value: FormDataEntryValue | null): Role {
  return value === 'owner' ? 'owner' : 'editor';
}

/**
 * A refused editor-management action: a bad input, a duplicate, or the anti-lockout rule.
 *  Module-internal: ManageEditors.svelte reads the envelope's `error` string loosely, so no
 *  other module names this type.
 */
interface EditorActionFailure {
  error: string;
}

/** Build the owner-gated editor-management routes: list, add, remove, and role-change. */
export function createEditorRoutes() {
  /**
   * Owner-only prelude every mutating action shares: authorize, resolve the D1 binding, and read
   *  the posted email (lowercased and trimmed, the store's lookup key). Each action reads any
   *  further field it needs off the returned `form` itself. `owner` is the acting owner's email,
   *  threaded through so a landed mutation can log who made it.
   */
  async function ownerAction(event: RequestContext): Promise<{ db: D1Database; form: FormData; email: string; owner: string }> {
    const owner = requireOwner(event);
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    return { db, form, email, owner: owner.email };
  }

  /** GET /admin/editors. Owner-only. Returns the allowlist and the acting owner's email. */
  async function editorsLoad(event: RequestContext): Promise<{ editors: Editor[]; self: string }> {
    const owner = requireOwner(event);
    const editors = await listEditors(requireDb(event.platform?.env ?? {}));
    return { editors, self: owner.email };
  }

  /** POST add an editor. Owner-only. */
  async function addEditorAction(event: RequestContext) {
    const { db, form, email, owner } = await ownerAction(event);
    const name = String(form.get('name') ?? '').trim();
    const role = parseRole(form.get('role'));
    if (!EMAIL_RE.test(email) || !name) {
      return fail(400, { error: 'Enter a valid email and name' } satisfies EditorActionFailure);
    }
    if (await findEditor(db, email)) {
      return fail(400, { error: 'That editor already exists' } satisfies EditorActionFailure);
    }
    await insertEditor(db, email, name, role, Date.now());
    log.info('editor.added', { owner, target: email, role });
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner, atomically. */
  async function removeEditorAction(event: RequestContext) {
    const { db, email, owner } = await ownerAction(event);
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    if (target.role === 'owner') {
      if (!(await removeOwnerIfNotLast(db, email))) {
        return fail(400, { error: 'You cannot remove the last owner' } satisfies EditorActionFailure);
      }
    } else {
      await deleteEditor(db, email);
    }
    log.info('editor.removed', { owner, target: email });
    return { ok: true as const };
  }

  /** POST change an editor's role. Owner-only. Refuses demoting the last owner, atomically. */
  async function setRoleAction(event: RequestContext) {
    const { db, form, email, owner } = await ownerAction(event);
    const role = parseRole(form.get('role'));
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    if (role === 'editor' && target.role === 'owner') {
      if (!(await demoteOwnerIfNotLast(db, email))) {
        return fail(400, { error: 'You cannot demote the last owner' } satisfies EditorActionFailure);
      }
    } else {
      await setEditorRole(db, email, role);
    }
    log.info('editor.role_changed', { owner, target: email, role });
    return { ok: true as const };
  }

  return { editorsLoad, addEditorAction, removeEditorAction, setRoleAction };
}
