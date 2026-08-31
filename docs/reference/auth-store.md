# Auth store (`@glw907/cairn-cms/auth-store`)

This subpath holds the D1 editor-provisioning functions the engine's own `editors-routes` uses to
back the [`ManageEditors`](./components.md) screen: read the allowlist, add or remove an editor,
and change a role, with the owner-count guards that keep at least one owner-capability editor on
the roster. It is server-only surface (no `svelte` export condition), for a site that provisions or
manages editors from its own server code, a setup script, or a migration, outside the admin screen.

This subpath carries D1 editor-roster reads and writes, provisioning surface only. The auth-flow
functions the engine's magic-link guard uses internally, `findEditor`, `issueToken`,
`recentlyIssued`, `consumeToken`, `createSession`, `resolveSession`, and `deleteSession`, stay
unexported here. They back the login flow only; no real caller outside the engine needs them, so
they are not proven surface. A token or session primitive lives on
[`/auth-crypto`](./auth-crypto.md) instead, even one this store's own rows carry a hash of.

Every function takes the site's `AUTH_DB` `D1Database` binding as its first argument, the same
binding `CairnEnv` (see [core](./core.md)) types and a site's `wrangler.jsonc` declares. The engine's
own `editors-routes` calls these exact functions, over the same rows, so a consumer script and the
`ManageEditors` screen stay consistent.

```ts
import { listEditors, insertEditor } from '@glw907/cairn-cms/auth-store';
```

The TypeScript types in `src/lib/auth/store.ts` and `src/lib/auth/types.ts` are the source of truth,
and the export-coverage gate checks every name here against them.

## Normalized email addresses

The store trims and lowercases every email argument before it matches or writes a row. Pass an
address as a user typed it. `Backup@Site.com` and `backup@site.com` are the same editor to every
function on this page, and the rows the store returns carry the lowercased form.

The normalization is part of the contract, not a convenience. An editor's email is their identity:
the `editor` table's primary key, the login form's lookup key, and the column sessions and
magic-link tokens join on. That column is case-sensitive. A row written under one case would be
unreachable to a lookup under another, leaving a site with an editor who can never sign in but who
still counts toward the owner-count guards below.

Compare an address the store returns against an address from elsewhere, such as a user record in the
site's own database, only after lowercasing both sides.

## Owner-count guards

For an owner-capability row, `deleteEditor` and `setEditorRole` write unconditionally: they do not
know or enforce that at least one owner must remain. `removeOwnerIfNotLast` and
`demoteOwnerIfNotLast` carry that guard, the same invariant the `ManageEditors` screen enforces on
every removal and role change. A caller that might act on an owner row should call the guard variant
rather than `deleteEditor`/`setEditorRole` directly, to avoid stranding a site with no owner.

Both guards take an `ownerRoles` argument, the site's owner-capability role names. Derive it from
the site's declared vocabulary with [`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles)
rather than writing the names out. A hand-written list that omits a name the vocabulary maps to owner
capability undercounts the roster's owners. The guard then refuses a safe removal, or allows an
unsafe one when the omitted name sits on the row the caller removes.

Both guards return `false` for two outcomes: the row is the last owner-capability row, or no
owner-capability row matched the email. Neither outcome writes anything. To tell them apart, read the
roster with `listEditors` first.

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
  role: string,
  now: number,
): Promise<void>;
```

Add an editor to the allowlist. `now` is an epoch-millisecond timestamp. Rejects with the underlying
`D1` primary-key constraint error when the email is already on the allowlist, including under a
different case: the store normalizes first, so `Backup@Site.com` collides with an existing
`backup@site.com` row rather than adding a second one.

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
the site's owner-capability role name set (not the literal `'owner'` string), derived with
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles), so a site with more than
one owner-level role name stays safe. The count check runs inside the same statement as the delete,
so two concurrent removals cannot both pass a separate check and strand the allowlist below one
owner. Returns `false` and writes nothing when this is the last owner-capability row or when no
owner-capability row matched the email; on success the editor's session and pending token go too,
the same as `deleteEditor`.

---

## Changing roles

### `setEditorRole`

Stability tier: Extension API.

```ts
declare function setEditorRole(db: D1Database, email: string, role: string): Promise<void>;
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
same atomic guard `removeOwnerIfNotLast` uses, over the same `ownerRoles` set from
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles). Returns `false` and writes
nothing when this is the last owner-capability row or when no owner-capability row matched the
email.

---

## Types

Stability tier: Extension API.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `EditorRow` | Extension API | `type EditorRow = { email: string; displayName: string; role: string }` | An allowlist row as the store reads it: email, displayName, and the bare role name. The store has no access to a site's declared vocabulary, so it never resolves `capability`; a caller that needs a full [`Editor`](./core.md#editor) resolves capability itself and spreads it onto this shape. |
