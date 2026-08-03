// cairn-cms: the public `/auth-store` barrel. A pure re-export of the D1 editor-provisioning
// functions from `../auth/store.js`, server-only surface for a site that manages its own editor
// allowlist outside the `ManageEditors` admin screen. Anything proposed here must be a D1
// editor-roster read or write, provisioning surface only; the auth-flow functions (`findEditor`,
// `issueToken`, session handling, and so on) stay unexported here, since they are engine-internal
// to the magic-link guard, not proven consumer surface, and a token or session primitive belongs
// on `/auth-crypto` instead.
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
