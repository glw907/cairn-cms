// Owner-gated editor management. The editor table is the allowlist, so add and remove are
// insert and delete. The anti-lockout rule is the last remaining owner: the system refuses to
// drop below one owner (spec 7.1), enforced in the store by an atomic guarded write rather
// than a separate count, so concurrent removals cannot strand the allowlist at zero owners.
import { fail } from '@sveltejs/kit';
import { requireOwner } from './guard.js';
import { requireDb } from '../env.js';
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
 *
 */
export function createEditorRoutes() {
  /** GET /admin/editors. Owner-only. Returns the allowlist and the acting owner's email. */
  async function editorsLoad(event: RequestContext): Promise<{ editors: Editor[]; self: string }> {
    const owner = requireOwner(event);
    const editors = await listEditors(requireDb(event.platform?.env ?? {}));
    return { editors, self: owner.email };
  }

  /** POST add an editor. Owner-only. */
  async function addEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const name = String(form.get('name') ?? '').trim();
    const role = parseRole(form.get('role'));
    if (!EMAIL_RE.test(email) || !name) return fail(400, { error: 'Enter a valid email and name' });
    if (await findEditor(db, email)) return fail(400, { error: 'That editor already exists' });
    await insertEditor(db, email, name, role, Date.now());
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner, atomically. */
  async function removeEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (target.role === 'owner') {
      if (!(await removeOwnerIfNotLast(db, email))) return fail(400, { error: 'You cannot remove the last owner' });
    } else {
      await deleteEditor(db, email);
    }
    return { ok: true as const };
  }

  /** POST change an editor's role. Owner-only. Refuses demoting the last owner, atomically. */
  async function setRoleAction(event: RequestContext) {
    requireOwner(event);
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const role = parseRole(form.get('role'));
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (role === 'editor' && target.role === 'owner') {
      if (!(await demoteOwnerIfNotLast(db, email))) return fail(400, { error: 'You cannot demote the last owner' });
    } else {
      await setEditorRole(db, email, role);
    }
    return { ok: true as const };
  }

  return { editorsLoad, addEditorAction, removeEditorAction, setRoleAction };
}
