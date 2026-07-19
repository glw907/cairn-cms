# Organize your admin nav

Cairn's default sidebar is flat: its own screens and whatever flat entries your site added,
one unsectioned list, no group header. That's a deliberate choice, not an unfinished one. A
label costs a reader a category decision on every visit, and a zero-config sidebar is small
enough that the decision never pays for itself. It stops being enough once your site adds
several screens of its own, because at that point the flat list needs a shape, and the
shape that serves the person signing in is what they do, not which screens shipped with cairn
and which ones you built. `navLayout` lets you declare the whole sidebar, cairn's own screens
and yours interleaved, arranged around what your editors actually do. This guide covers the
contract and the evidence behind the shape cairn recommends. It assumes [Define an adapter and
schema](./define-an-adapter-and-schema.md) and [Add a custom admin screen](./add-a-custom-admin-screen.md)
are already done, since the worked example below arranges a custom section alongside cairn's
own.

## Declare the tree

`navLayout` is a plain-data array on the adapter's `editor` group, an alternative to `adminNav`
(declaring both throws at construction). Each node is one of three kinds. An *engine reference*
places one of cairn's own screens by id. A *site entry* is the same shape `adminNav` already uses.
A *section* groups a mix of both under one label:

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
area](./give-a-role-its-own-admin-area.md)). `roles` narrows against your declared names the same
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

`roles` is a visibility hint, not enforcement: it decides what renders in the sidebar, the same
courtesy `hidden: true` is, and says nothing about what a direct URL visit is allowed to do. For a
role that should actually be refused at the route, declare [the access
map](./restrict-admin-access.md) instead (or alongside it): a site with a real multi-role
authorization story reaches for the map, and `roles` stays for the lighter case of just steering
what a role notices.

## Start a section collapsed

A section renders open by default, the same as before `navLayout` existed. Declare `collapsed:
true` to start it closed instead, for a section most editors open rarely:

```ts
{
  label: 'Site',
  collapsed: true,
  children: [{ screen: 'media' }, { screen: 'vocabulary' }, { screen: 'settings' }],
},
```

This only sets the *starting* state for a visitor who has never touched a section header. The
`cairn-admin-nav-collapsed` cookie remembers each visitor's own toggles once they touch any
header, and from then on the cookie wins entirely, in both directions, even over a declared
default. A section you add later, after a returning visitor's cookie already exists, renders open
regardless of its own `collapsed` declaration, since the cookie is authoritative from the moment
it exists. There's no way to force a section open or closed for a visitor who has already made
their own choice, by design: a declared default is a first impression, not a standing override.

## Override an engine screen's icon

Every concept shares one document icon by default, so two dated concepts (Posts and, say,
Bulletins) look identical in the sidebar at a glance. Give one an `icon` override, any name from
the bundled [`AdminNavIcon`](../reference/sveltekit.md#adminnavicon) allowlist:

```ts
{ screen: 'bulletins', icon: 'megaphone' },
```

The override replaces only the icon; the door's label and href stay engine-owned unless you also
set `label`. An unknown name throws the same allowlist error a site entry's own `icon` does.

## Badge a nav entry with pending work

A site computes its own pending-work counts, such as an unreviewed signups queue, and the shell
renders them as quiet pills on the matching nav entry. Declare an `attention` function beside your
other content-routes dependencies:

```ts
// src/lib/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from './cairn.config.js';
import { db } from './club/db.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });
export const admin = createCairnAdmin(runtime, {
  attention: async ({ editor }) => {
    const pending = await db.assetRequests.countPendingFor(editor.role);
    return [{ href: '/admin/club/assets', count: pending, label: 'pending requests' }];
  },
});
```

The engine calls this once per request, after the sidebar is already resolved and filtered, and
drops any item whose `href` doesn't match a nav entry the current session can see, so a count
never leaks to a role that can't act on it. A zero or negative `count` renders no pill at all. A
collapsed section's header shows the sum of its visible children's counts, computed live from the
same items, and that header sum disappears once the section opens, since each child's own pill is
already visible. "Once per request" means every admin load and every client-side navigation
between admin screens, so keep this function fast. A thrown error fails the whole shell load
rather than degrading quietly, so catch a transient failure inside your own callback and return
an empty array if you want the sidebar to render without its counts instead. See [the attention
seam](../reference/sveltekit.md#the-attention-seam) for the full contract, including the
accessibility shape (the count lives in the entry's accessible name, not on the pill itself).

## The principles

`navLayout` enforces structure. It has no opinion of its own about what a good sidebar looks
like. These are cairn's, each grounded in published usability research or a survey of
comparable administrator tools rather than house taste:

- **Nouns, not verbs.** Name a section after the objects it manages, such as Posts or Members,
  not the action of managing them, such as Write or Manage people. No study measures verb
  labels against noun labels for administrator tools specifically, but nothing contradicts the
  near-universal convention, and a noun-based sidebar is one less thing for a new editor to
  learn.
- **Flat until it hurts.** Skip a section header below roughly eight to ten items; a flat list
  under that size reads fine unsectioned. Splitting one list into two costs a real, measured
  category decision on every visit ([Omanson, Miller & Joseph
  2014](https://journals.sagepub.com/doi/10.1177/1541931214581318)), and no study sets a clean
  threshold for a sidebar this short. Treat "eight to ten" as where practitioner convergence and
  that measured cost start to outweigh a flat scan, not as a studied number.
- **Group by editor workflow, when you do group.** A section named after what your editors do,
  the Club section in the worked example, reads better to the person using it than one that
  mirrors your codebase or cairn's own built-in versus custom split.
- **Content first; settings, roster, and help sink last.** What an editor uses daily belongs
  before what they need only occasionally. Configuration and who-has-access are infrequent,
  cross-cutting concerns, and every comparable administrator tool trails them the same way.
- **Stable arrangement.** One tree, filtered by `roles`, never rearranged per role beyond
  subtraction. Reordering a sidebar by usage measurably slows a returning user down; a fixed
  layout that only drops items for a role performs about as well as one that never varies at
  all.
- **Don't over-hide.** `hidden: true` retires a door for good; it isn't a decluttering tool, and
  the command palette is an escape valve, never a substitute for visible nav. One controlled
  study of hidden and collapsed navigation found discoverability down more than 20% and desktop
  task completion at least 39% slower ([NN/g hidden-navigation
  study](https://www.nngroup.com/articles/hamburger-menus/)).

## Scale it to your site

Three sizes cover most sites:

- **Default scale, roughly eight items or fewer.** Stay flat. This is cairn's own zero-config
  sidebar, and it's the guide's own advice against grouping before grouping pays for itself.
- **One growing domain.** Once your site adds a real section of its own, lead the sidebar with
  it and let cairn's own screens trail behind in a second section, the shape the worked example
  earlier in this guide follows.
- **Several roles, many screens, 15 or more.** Reach for the full arrangement: sections by
  editor workflow, `roles` gating each one, settings and roster sunk to the last section, and
  every colliding name relabeled. This is the shape a large, multi-role site needs and a small
  one doesn't.

No aesthetic linting enforces any of this. `validateNavLayout` catches a structural mistake. The
preceding principles are yours to apply.

## Omission falls back; hiding is explicit

A `navLayout` you declare doesn't have to reference every one of cairn's own screens. Anything the
tree never mentions still renders, in a trailing group after a divider, in cairn's own screen order
(each declared concept, then Library, Tags, the nav-menu editor, Settings, Editors, Help). The
preceding worked example never references Help, so Help lands there, in the same foot slot the
zero-config sidebar already reserves for it. This means an engine update that ships a new built-in
screen surfaces on your sidebar instead of silently vanishing because your tree predates it.

To remove a door on purpose instead, mark it `hidden: true`:

```ts
{ screen: 'vocabulary', hidden: true }
```

The route stays live; only the sidebar link disappears. That's deliberate: **nav placement is
never authorization.** Hiding a screen from the sidebar doesn't stop a signed-in editor from typing
its URL directly. Gate the route itself with `requireAccess` (the recommended path once you've
declared [an access map](./restrict-admin-access.md)), `requireSession`, `requireEditor`,
`requireOwner`, or your own check, the way [Add a custom admin screen](./add-a-custom-admin-screen.md)
covers. The `roles` visibility on a `navLayout` node is the same kind of courtesy `hidden` is: it
decides what renders, not what's allowed.

## Verify it

Sign in as each role your tree gates and confirm the sidebar shows exactly the sections and items
that role should see, in the order you declared. Confirm an unreferenced screen (Help, in the
worked example) still renders in the trailing fallback group, and that a screen you mark `hidden`
disappears from the sidebar but its route still answers when you type its URL directly as an editor
who should see it.

## Related reference

[The navLayout seam](../reference/sveltekit.md#the-navlayout-seam) documents every node type,
`validateNavLayout`, and `resolveNavLayout` in full, including `collapsed` and the `icon` override.
[The custom admin-nav seam](../reference/sveltekit.md#the-custom-admin-nav-seam) documents
`AdminNavEntry` and its icon allowlist, the shape a `navLayout` site entry reuses.
[`ContentRoutesDeps` `navFilter`](../reference/sveltekit.md#contentroutesdeps) is the per-request
seam for a grant that depends on state outside cairn's own role vocabulary, composed after every
gate `navLayout` already applies. [The attention seam](../reference/sveltekit.md#the-attention-seam)
documents the `attention` dep and `AttentionItem` in full. [Restrict admin access by
role](./restrict-admin-access.md) covers `defineAccess` and `requireAccess`, the recommended path
for enforcement rather than the `roles` visibility hint. [Give a role its own admin
area](./give-a-role-its-own-admin-area.md) covers declaring a role vocabulary with `defineRoles`
in full, the prerequisite for a `roles` list naming anything
beyond `owner` and `editor`.
