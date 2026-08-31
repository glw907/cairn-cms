// cairn-cms: the public `/auth-store` barrel. A pure re-export of the D1 editor-provisioning
// functions from `../auth/store.js`, server-only surface for a site that manages its own editor
// allowlist outside the `ManageEditors` admin screen. Anything proposed here must be a D1
// editor-roster read or write, provisioning surface only; the auth-flow functions (`findEditor`,
// `issueToken`, session handling, and so on) stay unexported here, since they are engine-internal
// to the magic-link guard, not proven consumer surface, and a token or session primitive belongs
// on `/auth-crypto` instead. `insertOwnerIfEmpty` is demoted (retires pass, batch 1b): a site
// seeds its first owner declaratively via `bootstrapOwner` on `createCairnAdmin` instead, which
// already carries the same atomic race guard on the bootstrap login path.
export {
  listEditors,
  insertEditor,
  deleteEditor,
  setEditorRole,
  removeOwnerIfNotLast,
  demoteOwnerIfNotLast,
} from '../auth/store.js';
export type { EditorRow } from '../auth/store.js';
