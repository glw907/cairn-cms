// Owner-gated editor management. The editor table is the allowlist, so add and remove are
// insert and delete. The anti-lockout rule is the last remaining owner: the system refuses to
// drop below one owner (spec 7.1), counting owners rather than comparing against the acting user.
import { fail } from '@sveltejs/kit';
import { requireOwner } from './guard.js';
import {
  listEditors,
  findEditor,
  insertEditor,
  deleteEditor,
  setEditorRole,
  countOwners,
} from '../auth/store.js';
import type { Editor, Role } from '../auth/types.js';
import type { RequestContext } from './types.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseRole(value: FormDataEntryValue | null): Role {
  return value === 'owner' ? 'owner' : 'editor';
}

export function createEditorRoutes() {
  /** GET /admin/editors. Owner-only. Returns the allowlist and the acting owner's email. */
  async function editorsLoad(event: RequestContext): Promise<{ editors: Editor[]; self: string }> {
    const owner = requireOwner(event);
    const editors = await listEditors(event.platform!.env!.AUTH_DB!);
    return { editors, self: owner.email };
  }

  /** POST add an editor. Owner-only. */
  async function addEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const name = String(form.get('name') ?? '').trim();
    const role = parseRole(form.get('role'));
    if (!EMAIL_RE.test(email) || !name) return fail(400, { error: 'Enter a valid email and name' });
    if (await findEditor(db, email)) return fail(400, { error: 'That editor already exists' });
    await insertEditor(db, email, name, role, Date.now());
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner. */
  async function removeEditorAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (target.role === 'owner' && (await countOwners(db)) <= 1) {
      return fail(400, { error: 'You cannot remove the last owner' });
    }
    await deleteEditor(db, email);
    return { ok: true as const };
  }

  /** POST change an editor's role. Owner-only. Refuses demoting the last owner. */
  async function setRoleAction(event: RequestContext) {
    requireOwner(event);
    const db = event.platform!.env!.AUTH_DB!;
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const role = parseRole(form.get('role'));
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' });
    if (role === 'editor' && target.role === 'owner' && (await countOwners(db)) <= 1) {
      return fail(400, { error: 'You cannot demote the last owner' });
    }
    await setEditorRole(db, email, role);
    return { ok: true as const };
  }

  return { editorsLoad, addEditorAction, removeEditorAction, setRoleAction };
}
