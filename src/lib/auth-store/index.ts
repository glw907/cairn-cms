// cairn-cms: the public `/auth-store` barrel. A pure re-export of the D1 editor-provisioning
// functions from `../auth/store.js`, server-only surface for a site that manages its own editor
// allowlist outside the `ManageEditors` admin screen. The auth-flow functions (`findEditor`,
// `issueToken`, session handling, and so on) stay unexported here; they are engine-internal to the
// magic-link guard, not proven consumer surface.
export {
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  removeOwnerIfNotLast,
  insertOwnerIfEmpty,
  demoteOwnerIfNotLast,
} from '../auth/store.js';
export type { EditorRow } from '../auth/store.js';
export type { Role } from '../auth/types.js';
