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

`deleteEditor` and `setEditorRole` both take an `ownerRoles` argument (the site's owner-capability
role names) and fold the anti-lockout guard into their own atomic write: a non-owner row is
removed or changed unconditionally, and an owner-capability row is refused only when it is the
last one. Each is the one call a caller needs, "remove this editor" or "change this editor's role,"
regardless of the target's current role; neither requires a caller to look the target up first and
dispatch between a guarded and an unguarded function.

`removeOwnerIfNotLast` and `demoteOwnerIfNotLast` are the narrower, owner-only twins: their own
`WHERE` matches only an owner-capability row, so each refuses outright on a row that isn't
owner-capability at all, rather than acting on it. Reach for these when a call site specifically
wants an owner-only guard, refused rather than silently no-opping on a non-owner target.

Derive `ownerRoles` from the site's declared vocabulary with
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles) rather than writing
the names out. A hand-written list that omits a name the vocabulary maps to owner capability
undercounts the roster's owners. The guard then refuses a safe removal, or allows an unsafe one
when the omitted name sits on the row the caller removes.

Every function on this page returns a discriminated `outcome` result rather than a `boolean` or
`void`, so a caller reads the refusal reason off the type rather than re-deriving it from a
separate read. `deleteEditor` and `setEditorRole` distinguish `'not-found'` (no row matched the
email) from `'last-owner'` (the row is present and is the last owner-capability row), because
their own atomic write's `WHERE` matches any row, owner or not, so a `changes === 0` result can
only mean one or the other. `removeOwnerIfNotLast` and `demoteOwnerIfNotLast` instead report
`'not-eligible'` for both "no such row" and "present but not owner-capability": their own `WHERE`
matches only owner-capability rows, so a `changes === 0` result can't tell those two cases apart,
and the discriminant names only what the predicate knows.

The refusal predicate lives inside the same atomic statement as the write in every case (never a
preceding read), so two concurrent calls against the same last-owner row cannot both succeed: one
lands, the other's `changes === 0` classification read runs only after the write has already
resolved.

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
declare function deleteEditor(
  db: D1Database,
  email: string,
  ownerRoles: string[],
): Promise<DeleteEditorOutcome>;
```

Remove an editor and cut their live access: any session and pending magic-link token for the email
go too. `ownerRoles` (see [`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles))
is folded into the same atomic `DELETE`: a non-owner row is removed unconditionally, and an
owner-capability row is refused when it's the last one. Returns `{ outcome: 'removed' }` on
success, `{ outcome: 'last-owner' }` when the row is the last owner-capability row (writes
nothing), or `{ outcome: 'not-found' }` when no row matched the email. Pass `ownerRoles: []` for a
call site that knows the target can never be owner-capability, which removes unconditionally with
no guard.

### `removeOwnerIfNotLast`

Stability tier: Extension API.

```ts
declare function removeOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
): Promise<OwnerGuardOutcome>;
```

The narrower, owner-only twin of `deleteEditor`: removes an owner-capability editor only when
another owner-capability row remains, and refuses outright on a row that isn't owner-capability at
all rather than removing it. `ownerRoles` is the site's owner-capability role name set (not the
literal `'owner'` string), derived with
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles), so a site with more than
one owner-level role name stays safe. The count check runs inside the same statement as the delete,
so two concurrent removals cannot both pass a separate check and strand the allowlist below one
owner. Returns `{ outcome: 'ok' }` on success (the editor's session and pending token go too, the
same as `deleteEditor`), `{ outcome: 'last-owner' }` when this is the last owner-capability row, or
`{ outcome: 'not-eligible' }` when no owner-capability row matched the email; writes nothing on
either refusal.

---

## Changing roles

### `setEditorRole`

Stability tier: Extension API.

```ts
declare function setEditorRole(
  db: D1Database,
  email: string,
  role: string,
  ownerRoles: string[],
): Promise<SetEditorRoleOutcome>;
```

Change an editor's role. `ownerRoles` (see
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles)) is folded into the
same atomic `UPDATE`: the write is refused only when it would demote the last owner-capability row
out of owner capability, never for any other role change. Returns `{ outcome: 'ok' }` on success,
`{ outcome: 'last-owner' }` when the row is the last owner-capability row and `role` would demote
it (writes nothing), or `{ outcome: 'not-found' }` when no row matched the email. Pass
`ownerRoles: []` for a call site that knows the target can never be owner-capability, which changes
the role unconditionally with no guard.

### `demoteOwnerIfNotLast`

Stability tier: Extension API.

```ts
declare function demoteOwnerIfNotLast(
  db: D1Database,
  email: string,
  ownerRoles: string[],
  newRole: string,
): Promise<OwnerGuardOutcome>;
```

The narrower, owner-only twin of `setEditorRole`: demotes an owner-capability editor to `newRole`
only when another owner-capability row remains, and refuses outright on a row that isn't
owner-capability at all rather than changing it, the same atomic guard `removeOwnerIfNotLast`
uses, over the same `ownerRoles` set from
[`resolveOwnerLevelRoles`](./core.md#resolvecapability-resolveownerlevelroles). Returns
`{ outcome: 'ok' }` on success, `{ outcome: 'last-owner' }` when this is the last owner-capability
row, or `{ outcome: 'not-eligible' }` when no owner-capability row matched the email; writes
nothing on either refusal.

---

## Types

Stability tier: Extension API.

| Name | Stability | Signature | Meaning |
| --- | --- | --- | --- |
| `EditorRow` | Extension API | `type EditorRow = { email: string; displayName: string; role: string }` | An allowlist row as the store reads it: email, displayName, and the bare role name. The store has no access to a site's declared vocabulary, so it never resolves `capability`; a caller that needs a full [`Editor`](./core.md#editor) resolves capability itself and spreads it onto this shape. |
| `DeleteEditorOutcome` | Extension API | `type DeleteEditorOutcome = { outcome: 'removed' } \| { outcome: 'last-owner' } \| { outcome: 'not-found' }` | What [`deleteEditor`](#deleteeditor) returns; see its own description for each arm. |
| `SetEditorRoleOutcome` | Extension API | `type SetEditorRoleOutcome = { outcome: 'ok' } \| { outcome: 'last-owner' } \| { outcome: 'not-found' }` | What [`setEditorRole`](#seteditorrole) returns; see its own description for each arm. |
| `OwnerGuardOutcome` | Extension API | `type OwnerGuardOutcome = { outcome: 'ok' } \| { outcome: 'last-owner' } \| { outcome: 'not-eligible' }` | What [`removeOwnerIfNotLast`](#removeownerifnotlast) and [`demoteOwnerIfNotLast`](#demoteownerifnotlast) return; see either function's own description for each arm. |
