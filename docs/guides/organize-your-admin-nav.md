# Organize your admin nav

Cairn's default sidebar groups by provenance: its own screens first, then whatever your site
added. That costs nothing on a small site, six or seven items in one group. It starts costing
something once your site grows several screens of its own, because provenance is a developer's
mental model, not an editor's: the person signing in doesn't care which items shipped with cairn
and which ones you built, only what they're there to do. `navLayout` lets you declare the whole
sidebar, cairn's own screens and yours interleaved, arranged around what your editors actually do.
This guide covers the contract and the shape cairn recommends for it. It assumes [Define an
adapter and schema](./define-an-adapter-and-schema.md) and [Add a custom admin
screen](./add-a-custom-admin-screen.md) are already done, since the worked example below arranges
a custom section alongside cairn's own.

## Declare the tree

`navLayout` is a plain-data array on the adapter's `editor` group, an alternative to `adminNav`
(declaring both throws at construction). Each node is one of three kinds: an *engine reference*
places one of cairn's own screens by id, a *site entry* is the same shape `adminNav` already uses,
and a *section* groups a mix of both under one label:

```ts
import type { NavLayout } from '@glw907/cairn-cms/sveltekit';

const navLayout: NavLayout = [
  {
    label: 'Club',
    roles: ['owner'],
    children: [
      { label: 'Events', icon: 'calendar', href: '/admin/club/events' },
      { label: 'Members', icon: 'users', href: '/admin/club/members' },
    ],
  },
  {
    label: 'Content',
    children: [{ screen: 'posts' }, { screen: 'pages' }],
  },
  {
    label: 'Site',
    children: [
      { screen: 'media' },
      { screen: 'vocabulary' },
      { screen: 'settings', label: 'Site settings' },
      { screen: 'editors' },
    ],
  },
];
```

`{ screen: 'posts' }` places the `posts` concept's own list and editor, its icon and href staying
engine-owned; `{ screen: 'settings', label: 'Site settings' }` places the built-in Settings screen
under a relabel, so it never collides with a same-named screen of your own. `roles: ['owner']`
renders the Club section only for that role; swap it for whatever your own vocabulary names a
club-admin audience once you've declared one with `defineRoles` (see [Give a role its own admin
area](./give-a-role-its-own-admin-area.md)) — `roles` narrows against your declared names the same
way, through the `CairnRolesRegister` augmentation. Wire the tree onto the adapter next to your
other editor-experience knobs:

<!-- snippet-check-skip: elides the adapter's other required groups (shown in full in core.md's worked example) to focus on the editor group -->
```ts
// src/lib/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // ...content, backend, email, rendering...
  editor: { navLayout },
});
```

Every node validates when the runtime composes: an unknown screen id, a screen referenced twice, a
nested section, an empty section, an empty relabel, or a `roles` name outside your vocabulary all
throw an actionable error naming the bad node, so a typo fails at server start instead of rendering
a broken sidebar. A site entry inside the tree validates the same way an `adminNav` entry does (the
bundled icon allowlist, the built-in href collision); see [the navLayout
seam](../reference/sveltekit.md#the-navlayout-seam) for the full contract.

## The principles

`navLayout` enforces structure; it has no opinion of its own about what a good sidebar looks like.
These are cairn's:

- **Organize by what your editors do, not where the code lives.** A section named after your
  domain (Club, above) reads better to the person using it than one named after cairn's internal
  split between built-in and custom screens.
- **The primary audience's section leads.** If most sign-ins are a club committee member checking
  events and members, that section opens the sidebar, not last.
- **Routine screens before configuration.** What an editor touches daily belongs above what they
  touch rarely.
- **Settings and roster sink to a trailing group.** Configuration and who-has-access are
  infrequent, cross-cutting concerns; group them last, the way the Site section above closes on
  Settings and Editors.
- **Relabel a colliding name.** Two screens named "Settings" in one sidebar is confusing regardless
  of which one is cairn's; `{ screen: 'settings', label: 'Site settings' }` resolves it in one line.
- **Add a section header around seven items.** A flat list under that size reads fine unsectioned;
  past it, a label helps more than it costs.

No aesthetic linting enforces any of this. `validateNavLayout` catches a structural mistake; the
principles above are yours to apply.

## Omission falls back; hiding is explicit

A `navLayout` you declare doesn't have to reference every one of cairn's own screens. Anything the
tree never mentions still renders, in a trailing group after a divider, in cairn's own screen order
(each declared concept, then Library, Tags, the nav-menu editor, Settings, Editors, Help). The
worked example above never references Help, so Help lands there, in the same foot slot the
zero-config sidebar already reserves for it. This means an engine update that ships a new built-in
screen surfaces on your sidebar instead of silently vanishing because your tree predates it.

To remove a door on purpose instead, mark it `hidden: true`:

```ts
{ screen: 'vocabulary', hidden: true }
```

The route stays live; only the sidebar link disappears. That's deliberate: **nav placement is
never authorization.** Hiding a screen from the sidebar doesn't stop a signed-in editor from typing
its URL directly. Gate the route itself with `requireSession`, `requireEditor`, `requireOwner`, or
your own check, the way [Add a custom admin screen](./add-a-custom-admin-screen.md) covers. The
`roles` visibility on a `navLayout` node is the same kind of courtesy `hidden` is: it decides what
renders, not what's allowed.

## Verify it

Sign in as each role your tree gates and confirm the sidebar shows exactly the sections and items
that role should see, in the order you declared. Confirm an unreferenced screen (Help, in the
worked example) still renders in the trailing fallback group, and that a screen you mark `hidden`
disappears from the sidebar but its route still answers when you type its URL directly as an editor
who should see it.

## Related reference

[The navLayout seam](../reference/sveltekit.md#the-navlayout-seam) documents every node type,
`validateNavLayout`, and `resolveNavLayout` in full. [The custom admin-nav
seam](../reference/sveltekit.md#the-custom-admin-nav-seam) documents `AdminNavEntry` and its icon
allowlist, the shape a `navLayout` site entry reuses. [`ContentRoutesDeps`
`navFilter`](../reference/sveltekit.md#contentroutesdeps) is the per-request seam for a grant that
depends on state outside cairn's own role vocabulary, composed after every gate `navLayout` already
applies. [Give a role its own admin area](./give-a-role-its-own-admin-area.md) covers declaring a
role vocabulary with `defineRoles` in full, the prerequisite for a `roles` list naming anything
beyond `owner` and `editor`.
