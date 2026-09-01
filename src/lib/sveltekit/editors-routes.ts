// Owner-gated editor management. The editor table is the allowlist, so add and remove are
// insert and delete. The anti-lockout rule is the last remaining owner: the system refuses to
// drop below one owner (spec 7.1), enforced in the store by an atomic guarded write rather
// than a separate count, so concurrent removals cannot strand the allowlist at zero owners.
import { fail, type ActionFailure } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { requireOwner } from './guard.js';
import { requireDb } from '../env.js';
import { log } from '../log/index.js';
import { listEditors, findEditor, insertEditor, deleteEditor, setEditorRole } from '../auth/store.js';
import { resolveCapability, resolveOwnerLevelRoles, DEFAULT_ROLES } from '../auth/roles.js';
import type { Capability, RolesDeclaration } from '../auth/roles.js';
import type { Editor } from '../auth/types.js';
import type { CairnEvent } from './types.js';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * A refused editor-management action: a bad input, a duplicate, or the anti-lockout rule.
 *  Module-exported (never barrel-published; see the internal-sibling comment on `EditorRoutes`
 *  below) only because the declared `EditorRoutes` contract names it in three return positions
 *  and TypeScript's declaration emit needs an exported name to reference: ManageEditors.svelte
 *  itself still reads the envelope's `error` string loosely, so no other module names this type.
 */
export interface EditorActionFailure {
  error: string;
}

/**
 * The editors screen's data (`editorsLoad`): the allowlist (each row carrying its resolved
 * capability), the acting owner's email, and the declared role vocabulary paired with each
 * role's capability.
 */
export interface EditorsData {
  editors: Editor[];
  self: string;
  vocabulary: { role: string; capability: Capability }[];
}

/** Configuration for `createEditorRoutes`: the site's declared role vocabulary. */
export interface EditorRoutesConfig {
  /**
   * The site's declared role vocabulary (see `defineRoles`); omitted, the routes validate and
   *  resolve against the implicit owner/editor pair, so a zero-config site sees no behavior change.
   */
  roles?: RolesDeclaration;
}

/** Build the owner-gated editor-management routes: list, add, remove, and role-change. */
export function createEditorRoutes(config: EditorRoutesConfig = {}): EditorRoutes {
  const vocabulary: RolesDeclaration = config.roles ?? DEFAULT_ROLES;
  const ownerRoles = resolveOwnerLevelRoles(vocabulary);

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
  async function ownerAction(event: CairnEvent): Promise<{ db: D1Database; form: FormData; email: string; owner: string }> {
    const owner = requireOwner(event);
    const db = requireDb(event.platform?.env ?? {});
    const form = await event.request.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    return { db, form, email, owner: owner.email };
  }

  /**
   * GET /admin/editors. Owner-only. Returns the allowlist (each row carrying its resolved
   *  capability), the acting owner's email, and the declared vocabulary (each role name paired
   *  with its capability, for the role control). Every editor-management refusal answers through
   *  `fail()`, so this load carries no `?error=` slot.
   */
  async function editorsLoad(event: CairnEvent): Promise<EditorsData> {
    const owner = requireOwner(event);
    const rows = await listEditors(requireDb(event.platform?.env ?? {}));
    const editors = rows.map((row) => ({ ...row, capability: resolveCapability(vocabulary, row.role) }));
    const vocabularyList = Object.keys(vocabulary).map((role) => ({
      role,
      capability: resolveCapability(vocabulary, role),
    }));
    return { editors, self: owner.email, vocabulary: vocabularyList };
  }

  /** POST add an editor. Owner-only. Rejects a role outside the declared vocabulary. */
  async function editorAddAction(event: CairnEvent) {
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
    // Validated against the vocabulary above; role names are open (`string`), so the store's
    // signature takes it directly, with no cast.
    await insertEditor(db, email, name, role, Date.now());
    log.info('editor.added', { owner, target: email, role, capability: resolveCapability(vocabulary, role) });
    return { ok: true as const };
  }

  /** POST remove an editor. Owner-only. Refuses the last owner-capability row, atomically. */
  async function editorRemoveAction(event: CairnEvent) {
    const { db, email, owner } = await ownerAction(event);
    const result = await deleteEditor(db, email, ownerRoles);
    if (result.outcome === 'not-found') {
      return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    }
    if (result.outcome === 'last-owner') {
      return fail(400, { error: 'You cannot remove the last owner' } satisfies EditorActionFailure);
    }
    log.info('editor.removed', { owner, target: email });
    return { ok: true as const };
  }

  /**
   * POST change an editor's role. Owner-only. Rejects a role outside the declared vocabulary and
   *  refuses demoting the last owner-capability row, atomically.
   */
  async function editorSetRoleAction(event: CairnEvent) {
    const { db, form, email, owner } = await ownerAction(event);
    const role = parseRole(form.get('role'));
    if (!role) return fail(400, { error: 'Choose a valid role' } satisfies EditorActionFailure);
    // Validated against the vocabulary above; see the same open-role note in editorAddAction.
    const result = await setEditorRole(db, email, role, ownerRoles);
    if (result.outcome === 'not-found') {
      return fail(400, { error: 'No such editor' } satisfies EditorActionFailure);
    }
    if (result.outcome === 'last-owner') {
      return fail(400, { error: 'You cannot demote the last owner' } satisfies EditorActionFailure);
    }
    log.info('editor.role_changed', { owner, target: email, role, capability: resolveCapability(vocabulary, role) });
    return { ok: true as const };
  }

  return { editorsLoad, editorAddAction, editorRemoveAction, editorSetRoleAction };
}

/**
 * What `createEditorRoutes` returns: the owner-gated editor-management load and actions. Names
 *  `EditorActionFailure` in three return positions; that type is exported from this module (for
 *  the declaration emit this contract requires) but never re-exported from the `/sveltekit`
 *  barrel, since `ManageEditors.svelte` reads its `error` field loosely and no other module has a
 *  reason to import the name directly (`convention-internal-sibling-comment`).
 */
export interface EditorRoutes {
  editorsLoad: (event: CairnEvent) => Promise<EditorsData>;
  editorAddAction: (event: CairnEvent) => Promise<{ ok: true } | ActionFailure<EditorActionFailure>>;
  editorRemoveAction: (event: CairnEvent) => Promise<{ ok: true } | ActionFailure<EditorActionFailure>>;
  editorSetRoleAction: (event: CairnEvent) => Promise<{ ok: true } | ActionFailure<EditorActionFailure>>;
}
