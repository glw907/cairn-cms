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
import { resolveCapability, ownerLevelRoles, DEFAULT_ROLES } from '../auth/roles.js';
import type { Capability, RolesDeclaration } from '../auth/roles.js';
import type { Editor, Role } from '../auth/types.js';
import type { RequestContext } from './types.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * A refused editor-management action: a bad input, a duplicate, or the anti-lockout rule.
 *  Module-internal: ManageEditors.svelte reads the envelope's `error` string loosely, so no
 *  other module names this type.
 */
interface EditorActionFailure {
  error: string;
}

/**
 * Build the owner-gated editor-management routes: list, add, remove, and role-change.
 * `opts.roles` is the site's declared role vocabulary (see `defineRoles`); omitted, the routes
 * validate and resolve against the implicit owner/editor pair, so a zero-config site sees no
 * behavior change.
 */
export function createEditorRoutes(opts: { roles?: RolesDeclaration } = {}) {
  const vocabulary: RolesDeclaration = opts.roles ?? DEFAULT_ROLES;
  const ownerRoles = ownerLevelRoles(vocabulary);

  /** A posted role, trimmed and checked against the vocabulary; null when blank or unknown. */
  function parseRole(value: FormDataEntryValue | null): string | null {
    const role = typeof value === 'string' ? value.trim() : '';
    return role && Object.hasOwn(vocabulary, role) ? role : null;
  }

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

  /**
   * GET /admin/editors. Owner-only. Returns the allowlist (each row carrying its resolved
   *  capability), the acting owner's email, the declared vocabulary (each role name paired with
   *  its capability, for the role control), and any `?error=` an unexpected action failure
   *  bounced back with (the same redirect convention `list`, `edit`, `nav`, and `settings`
   *  already carry their own errors through).
   */
  async function editorsLoad(event: RequestContext): Promise<{
    editors: Editor[];
    self: string;
    error: string | null;
    vocabulary: { role: string; capability: Capability }[];
  }> {
    const owner = requireOwner(event);
    const rows = await listEditors(requireDb(event.platform?.env ?? {}));
    const editors = rows.map((row) => ({ ...row, capability: resolveCapability(vocabulary, row.role) }));
    const vocabularyList = Object.keys(vocabulary).map((role) => ({
      role,
      capability: resolveCapability(vocabulary, role),
    }));
    return { editors, self: owner.email, error: event.url.searchParams.get('error'), vocabulary: vocabularyList };
  }

  /** POST add an editor. Owner-only. Rejects a role outside the declared vocabulary. */
  async function addEditorAction(event: RequestContext) {
    const { db, form, email, owner } = await ownerAction(event);
    const name = String(form.get('name') ?? '').trim();
    const role = parseRole(form.get('role'));
    if (!EMAIL_RE.test(email) || !name) {
      return fail(400, { error: 'Enter a valid email and name' } satisfies EditorActionFailure);
    }
    if (!role) {
      return fail(400, { error: 'Choose a valid role' } satisfies EditorActionFailure);
    }
    if (await findEditor(db, email)) {
      return fail(400, { error: 'That editor already exists' } satisfies EditorActionFailure);
    }
    // Validated against the vocabulary above; Role stays the engine's typed read-side, so the
    // store's stable signature keeps a guarded cast here rather than widening to a bare string.
    await insertEditor(db, email, name, role as Role, Date.now());
    log.info('editor.added', { owner, target: email, role, capability: resolveCapability(vocabulary, role) });
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner-capability row, atomically. */
  async function removeEditorAction(event: RequestContext) {
    const { db, email, owner } = await ownerAction(event);
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    if (resolveCapability(vocabulary, target.role) === 'owner') {
      if (!(await removeOwnerIfNotLast(db, email, ownerRoles))) {
        return fail(400, { error: 'You cannot remove the last owner' } satisfies EditorActionFailure);
      }
    } else {
      await deleteEditor(db, email);
    }
    log.info('editor.removed', { owner, target: email });
    return { ok: true as const };
  }

  /**
   * POST change an editor's role. Owner-only. Rejects a role outside the declared vocabulary and
   *  refuses demoting the last owner-capability row, atomically.
   */
  async function setRoleAction(event: RequestContext) {
    const { db, form, email, owner } = await ownerAction(event);
    const role = parseRole(form.get('role'));
    if (!role) return fail(400, { error: 'Choose a valid role' } satisfies EditorActionFailure);
    const target = await findEditor(db, email);
    if (!target) return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    const wasOwner = resolveCapability(vocabulary, target.role) === 'owner';
    const willBeOwner = resolveCapability(vocabulary, role) === 'owner';
    if (wasOwner && !willBeOwner) {
      if (!(await demoteOwnerIfNotLast(db, email, ownerRoles, role))) {
        return fail(400, { error: 'You cannot demote the last owner' } satisfies EditorActionFailure);
      }
    } else {
      // Validated against the vocabulary above; see the same guarded-cast note in addEditorAction.
      await setEditorRole(db, email, role as Role);
    }
    log.info('editor.role_changed', { owner, target: email, role, capability: resolveCapability(vocabulary, role) });
    return { ok: true as const };
  }

  return { editorsLoad, addEditorAction, removeEditorAction, setRoleAction };
}
