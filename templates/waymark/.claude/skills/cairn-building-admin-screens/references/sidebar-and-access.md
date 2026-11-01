# Sidebar and access

## Contents

- [Two separate systems](#two-separate-systems)
- [Declare roles and the access map](#declare-roles-and-the-access-map)
- [Declare the sidebar](#declare-the-sidebar)
- [Narrow by role](#narrow-by-role)
- [navFilter and attention](#navfilter-and-attention)
- [Errors and verification](#errors-and-verification)

## Two separate systems

The **access map** (adapter `access`) decides who reaches a route and who sees its sidebar link.
The **nav layout** (adapter `editor.navLayout`) decides where links sit and can hide them, but
never refuses a route. Use the map to deny; use the layout to arrange.

| Mechanism | Hides the link | Refuses the route | Owner bypass |
|---|---|---|---|
| Access-map rule plus `requireAccess` in the route's `load` and every action through `createSectionAction` | yes, for roles the rule leaves out | yes (a form action runs without the `load`, so the wrapper must gate it) | yes: the owner reaches every ruled route |
| `roles` on a section or site entry | yes, for roles not listed | no | **no**: an owner whose role is not listed loses the link |
| `ownerOnly` on a site entry | yes, for non-owners | no | yes |
| `hidden: true` on an engine reference | yes, for everyone | no | n/a |
| `navFilter` | what it drops | no | what the function decides |

Two traps follow from this table:

- **A `roles` list that leaves out `owner` hides the link from owners.** Either list `owner`, or
  put no `roles` on the section and let the access-map rule hide the entry: a site entry whose
  `href` matches a rule shows only to the roles the rule admits and to an owner, and a section
  whose children all drop out does not render.
- **`requireAccess` is fail-closed.** With no rule for the route, or no `access` member at all,
  it refuses every session with a 403, the owner included. The sidebar is the opposite: an entry
  whose `href` matches no rule stays visible to every session. A link can show while its route
  refuses.

For a role-limited screen, the access map alone does both jobs: one rule, `requireAccess` in the
route's `load` and every form action wrapped in `createSectionAction` (an action runs without the
`load`, so the load's check never guards it), and a site entry with no `roles`.

## Declare roles and the access map

```ts
// src/theme/cairn.config.ts (the two members, beside the adapter's others)
import { defineAccess, defineRoles } from '@glw907/cairn-cms';

export const roles = defineRoles({
  owner: 'owner',
  editor: 'editor',
  treasurer: { capability: 'none', home: '/admin/finance/reports' },
});

export const access = defineAccess(roles, {
  '/admin/finance/reports': ['treasurer'],
});
// Then pass both on the adapter: defineAdapter({ ..., roles, access }).
```

- `defineRoles` requires `owner: 'owner'`. Keep `editor`: a role the roster still holds that
  drops out of the vocabulary resolves to `none` and loses the content screens.
- Capability decides the floor. `editor` capability reaches the content screens; `none` signs in
  but reaches only routes whose rule names its role, and `/admin` shows it a welcome view unless
  the role declares a `home`.
- Pass `roles` as `defineAccess`'s first argument. With `undefined` it validates against the
  default owner and editor pair, so naming any other role throws.
- A key is a concept id, one of `media`, `vocabulary`, `nav`, `settings`, or an `/admin` route
  path (no query, hash, or trailing slash). Write an owner-only rule as `['owner']`; an empty
  list throws.
- A route key governs its path and every path beneath it by the deepest whole-segment prefix:
  `/admin/money` covers `/admin/money/refunds` and never `/admin/moneyx`. `requireAccess` reads
  `event.route.id` (route groups dropped, `[id]` kept), never the URL. A route whose next segment
  is a parameter, under a key that also has a deeper key, resolves to no rule: pass the governing
  key as `requireAccess`'s second argument and as `target` on each section action.
- An unmapped engine screen stays open to every editor-capability role.
- A deployed site needs `0001_roles.sql` in the auth database before a role beyond owner and
  editor can be assigned. A scaffold ships it; a hand-built site copies it from
  `node_modules/@glw907/cairn-cms/migrations/` and applies it with `npx wrangler d1 migrations apply`.
  An owner then assigns the role on `/admin/editors`.

**Declaring roles makes `src/content/.cairn/site-facts.json` stale, and a stale file fails the
build and the dev server's start.** Regenerate it with the scaffold's `cairn:manifest` script
(the `cairn-manifest` bin), and commit the file with the role change.

## Declare the sidebar

`editor.navLayout` is an ordered array of three node kinds, one level of nesting:

| Node | Required | Optional |
|---|---|---|
| Engine reference | `screen`: a concept id, `media`, `vocabulary`, `nav`, `settings`, `editors`, or `help` | `label`, `icon`, `hidden` |
| Site entry | `label`, `icon`, `href` | `roles`, `ownerOnly` |
| Section | `label`, `children` | `roles`, `collapsed` |

```ts
import type { NavLayout } from '@glw907/cairn-cms';

// Pass it on the adapter: defineAdapter({ ..., editor: { navLayout } }).
export const navLayout: NavLayout = [
  { label: 'Content', children: [{ screen: 'posts' }, { screen: 'pages' }, { screen: 'media' }] },
  {
    label: 'Finance',
    children: [{ label: 'Reports', icon: 'table', href: '/admin/finance/reports' }],
  },
  { screen: 'settings', label: 'Site settings' },
];
```

- Listing a screen is the only way a custom route gets a link. The route renders with or without
  one.
- An engine screen the layout never names still renders, after a divider, in a trailing group.
  To take one out, reference it with `hidden: true`. `navFilter` never sees that group.
- `icon` is a `NavIcon` name; the type lists the allowed names.
- `editors` stays out of a non-owner's sidebar wherever it is placed, and `nav` needs the
  adapter's `editor.nav`.
- `collapsed: true` applies only until a visitor's first toggle; from then on the
  `cairn-admin-nav-collapsed` cookie wins in both directions, so a section added later renders
  open for that visitor.
- With no `navLayout`, the engine builds a flat default: concepts, then the engine screens, with
  Help in the trailing group.

## Narrow by role

- An engine reference takes no `roles`. To narrow one engine screen, place it in a section whose
  `roles` names the roles that see it; a screen in a section a role cannot see also stays out of
  that role's trailing group.
- A site entry's `roles` is independent of its section's. Both only narrow; neither widens.
- Every role name in a `roles` list must be declared, or server start throws.

## navFilter and attention

Pass both to `createCairnAdmin` in `src/chassis/cairn.server.ts`.

- `navFilter(items, { editor, event })` runs on every request after the built-in gates and
  returns the top-level items to keep. **A throw from it fails every admin page**: catch inside
  it and return `items` unchanged.
- `attention({ editor, event })` returns `AttentionItem[]` (`href`, `count`, optional `label`,
  default "pending items"). It runs on every shell load, client-side navigations included, after
  `navFilter`, so keep it fast. A throw renders no badges and logs `admin.attention_failed`.
  The engine drops an item whose `count` is zero or less, whose `href` matches no entry the
  session sees, or that repeats an earlier `href`.
- The shell caps a badge at `99+`, shows a collapsed section's header with the sum of its
  visible children's counts, and puts the count in the link's accessible name; the badge span
  itself is `aria-hidden`.

## Errors and verification

A server start that throws `navLayout:` names the value at fault (except a blank section
label). The triggers: an icon outside `NavIcon`; a site `href` that collides with a built-in
view, or two entries sharing an `href`; an unknown screen id, or a screen referenced twice
(a `hidden` reference counts); `nav` without `editor.nav`; a blank relabel; a blank or duplicate
section label; empty `children` or a nested section; an undeclared role name. A `defineAccess:`
or `access:` error names the bad key or role.

Verify on a preview build or the deployed site, since the dev backend always signs in an owner:

1. As an owner, the sections render in declaration order, and the role-limited section shows.
2. As an editor the rule leaves out, the section is gone, typing the route's URL returns the
   admin's 403 page, and posting one of its actions returns the wrapper's 403.
3. As the new role, the section shows and the route opens.
