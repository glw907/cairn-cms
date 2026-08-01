# Auth store (`@glw907/cairn-cms/auth-store`)

This subpath holds the D1 editor-provisioning functions the engine's own `editors-routes` uses to
back the [`ManageEditors`](./components.md) screen: read the allowlist, add or remove an editor,
and change a role, with the owner-count guards that keep at least one owner-capability editor on
the roster. It is server-only surface (no `svelte` export condition), for a site that provisions or
manages editors from its own server code, a setup script, or a migration, outside the admin screen.

The auth-flow functions the engine's magic-link guard uses internally, `findEditor`, `issueToken`,
`recentlyIssued`, `consumeToken`, `createSession`, `resolveSession`, and `deleteSession`, stay
unexported here. They back the login flow only; no real caller outside the engine needs them, so
they are not proven surface.

Every function takes the site's `AUTH_DB` `D1Database` binding as its first argument, the same
binding `AuthEnv` (see [core](./core.md)) types and a site's `wrangler.jsonc` declares. The engine's
own `editors-routes` calls these exact functions; a consumer script that provisions editors directly
reads and writes the same rows the `ManageEditors` screen does, so the two stay consistent.

```ts
import { listEditors, insertEditor } from '@glw907/cairn-cms/auth-store';
```

For an owner-capability row, `deleteEditor` and `setEditorRole` write unconditionally: they do not
know or enforce that at least one owner must remain. `removeOwnerIfNotLast` and
`demoteOwnerIfNotLast` carry that guard, the same invariant the `ManageEditors` screen enforces on
every removal and role change. A caller that might touch an owner row should call the guard variant
rather than `deleteEditor`/`setEditorRole` directly, to avoid stranding a site with no owner.

The TypeScript types in `src/lib/auth/store.ts` and `src/lib/auth/types.ts` are the source of truth,
and the export-coverage gate checks every name here against them.

---

## Reading the allowlist

### `listEditors`

Stability tier: Extension API.

```ts
declare function listEditors(db: D1Database): Promise<EditorRow[]>;
```

The full allowlist, sorted by email.

---

## Adding and removing editors

### `insertEditor`

Stability tier: Extension API.

```ts
declare function insertEditor(
  db: D1Database,
  email: string,
  displayName: string,
  role: Role,
  now: number,
): Promise<void>;
```

Add an editor to the allowlist. `now` is an epoch-millisecond timestamp. Fails (the underlying `D1`
constraint error propagates) when the email is already present.

### `deleteEditor`

Stability tier: Extension API.

```ts
declare function deleteEditor(db: D1Database, email: string): Promise<void>;
```

Remove an editor and cut their live access: any session and pending magic-link token for the email
go too. Writes unconditionally, with no owner-count guard; prefer `removeOwnerIfNotLast` for a row
that might be the last owner.

### `removeOwnerIfNotLast`

Stability tier: Extension API.

```ts
declare function removeOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
): Promise<boolean>;
```

Remove an owner-capability editor only when another owner-capability row remains. `ownerRoles` is
the site's owner-capability role name set (not the literal `'owner'` string), so a site with more
than one owner-level role name stays safe. The count check runs inside the same statement as the
delete, so two concurrent removals cannot both pass a separate check and strand the allowlist below
one owner. Returns `false` and writes nothing when this is the last owner-capability row; on success
the editor's session and pending token go too, the same as `deleteEditor`.

### `insertOwnerIfEmpty`

Stability tier: Extension API.

```ts
declare function insertOwnerIfEmpty(
  db: D1Database,
  email: string,
  displayName: string,
  now: number,
): Promise<boolean>;
```

Insert the `'owner'` row when the allowlist is empty, in one atomic statement, so two concurrent
bootstrap requests race safely to exactly one inserted row. Returns whether this call performed the
insert; a non-empty table writes nothing and returns `false`.

---

## Changing roles

### `setEditorRole`

Stability tier: Extension API.

```ts
declare function setEditorRole(db: D1Database, email: string, role: Role): Promise<void>;
```

Change an editor's role. Writes unconditionally, with no owner-count guard; prefer
`demoteOwnerIfNotLast` for a row that might be the last owner.

### `demoteOwnerIfNotLast`

Stability tier: Extension API.

```ts
declare function demoteOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
  newRole: string,
): Promise<boolean>;
```

Demote an owner-capability editor to `newRole` only when another owner-capability row remains, the
same atomic guard `removeOwnerIfNotLast` uses. Returns `false` and writes nothing when this is the
last owner-capability row.

---

## Types

Stability tier: Extension API.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `EditorRow` | Extension API | `type EditorRow = { email: string; displayName: string; role: Role }` | An allowlist row as the store reads it: email, displayName, and the bare role name. The store has no access to a site's declared vocabulary, so it never resolves `capability`; a caller that needs a full [`Editor`](./core.md#editor) resolves capability itself and spreads it onto this shape. |
| `Role` | Extension API | `type Role` | The role names `locals.editor.role` carries, re-exported from [core](./core.md#role) for convenience: registry-derived from `CairnRolesRegister`, defaulting to `'owner' \| 'editor'` when a site declares no vocabulary. |
