# Arrange the admin sidebar

The admin sidebar is one ordered tree that the server resolves on each request.
When the adapter declares no layout, that tree is a flat list of the site's concepts followed by the engine's fixed screens, with Help left to a trailing group.
The engine builds this default through the same primitives as a declared layout, so the two cannot disagree on what a role sees.
A custom screen renders inside the admin shell with no registration, but the default lists only concepts and engine screens.
A screen the site builds therefore reaches the sidebar through a site entry in a `navLayout` on the adapter's `editor` group.
Declaring a layout drops no screen.
A screen the layout never references still renders, in engine order, in a trailing group after a divider.

One developer arrives needing a sidebar link to a screen they built.
Another wants to regroup and relabel the engine's screens for an organization's editors, whether the adapter already declares a layout, as a scaffolded site's does, or declares none.
Others want the sidebar to follow the site's roles, or need a per-request visibility check or a count badge on an entry.
The steps that follow declare a layout that groups screens into sections, relabels, re-icons, or hides engine screens, and links the site's screens.
They then narrow a section by role, set which sections start collapsed, and add the two per-request functions, `navFilter` and `attention`.
The page also covers the startup validation that refuses a malformed tree, and it ends with a check in the running admin.

`hidden`, `ownerOnly`, `roles`, and `navFilter` each hide a link and leave its route open.
The access map that [Restrict admin access](restrict-admin-access.md) declares is the one control that both hides an entry and refuses its route.
An action built with [`createSectionAction`](../reference/sveltekit.md#createsectionaction) refuses a non-owner when its `ownerOnly` option is set, but `ownerOnly` on a site entry only hides the link.
The steps assume you can edit the site's TypeScript adapter module and the server module that calls `createCairnAdmin`.
They also assume familiarity with the SvelteKit routes a custom screen adds under `src/routes/admin/`.

To deny a route rather than hide its link, see [Restrict admin access](restrict-admin-access.md).
To build the screen a site entry links to, see [Add a custom admin screen](add-a-custom-admin-screen.md).
For the public site's own menu, see [Build the public routes](build-the-public-routes.md).

## Before you begin

The steps edit the site's adapter module, which sits at `src/theme/cairn.config.ts` on a scaffolded site and at `src/lib/cairn.config.ts` on the add-cairn tutorial's site.
The steps assume the following:

- For every step, an adapter module from the setup command, as [Scaffolded site files](scaffolded-site-files.md) lists, or from [Add cairn to a SvelteKit app](add-cairn-to-a-sveltekit-app.md).
- For each site entry, a route under `src/routes/admin/` that [Add a custom admin screen](add-a-custom-admin-screen.md) builds.
- For role narrowing, role names the adapter declares, as [Declare the roles](restrict-admin-access.md#declare-the-roles) shows.

On a scaffolded site, the adapter already declares a `navLayout` with a `Content` section and a `Site` section, and the steps edit that tree.
The tutorial's adapter declares none, so its sidebar starts as the flat default.
The next section declares the tree.

## Declare the layout

A `navLayout` is an ordered array of three node kinds, rendered in declaration order.
An engine reference places one of cairn's screens, and a site entry links one of the site's routes.
A section groups both kinds under a label, one level deep.

The following table names each node kind's members.

| Node kind | Required | Optional |
| --- | --- | --- |
| Engine reference | `screen`, naming a declared concept or one of `media`, `vocabulary`, `nav`, `settings`, `editors`, or `help` | `label`, `hidden`, `icon` |
| Site entry | `label`, `icon`, `href` | `roles`, `ownerOnly` |
| Section | `label`, `children` | `roles`, `collapsed` |

The `nav` screen is the public menu editor, and the adapter's `editor.nav` turns it on.
A `navLayout` that references `nav` without `editor.nav` throws at server start.
[Build the public routes](build-the-public-routes.md) covers the menu editor.

To declare a layout, follow these steps:

1. In the adapter's `editor` group, declare `navLayout` as an array.

   On a scaffolded site the array exists, and this step edits it.

2. In that array, add an engine reference for each screen to show outside a section, in sidebar order.
3. In the same array, add a section with a `label` and a `children` array.
4. In the section's `children`, add a site entry with a `label`, an `icon`, and an `href` for each custom screen.

   The icon must be one of the 27 names that [`NavIcon`](../reference/sveltekit.md#navicon) lists.
   An `href` that collides with a built-in admin view throws at startup, and the error names that view.

5. On an engine reference, set `label` to relabel the screen or `icon` to change its glyph.

   A relabel leaves the screen's icon and `href` alone, and an `icon` override must also come from the allowlist.

The engine validates the whole tree once, when the runtime composes.
A bad icon, a colliding `href`, an unknown screen, or an undeclared role fails at server start with a `navLayout:` message.
[Resolve a sidebar error](#resolve-a-sidebar-error) lists every trigger.

The following layout produces the sidebar the figure shows.
The layout assumes a site whose concepts are posts and pages.
The screens it never names land in the trailing group the next section covers.

<!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, and rendering stay as the site declares them
  editor: {
    navLayout: [
      { screen: 'posts' }, // renders as Posts, outside any section
      { screen: 'pages' }, // renders as Pages
      {
        label: 'Team', // renders as a section header
        children: [
          { label: 'Events', icon: 'calendar', href: '/admin/team/events' }, // a site entry
          { label: 'Members', icon: 'users', href: '/admin/team/members' }, // a site entry
        ],
      },
      { screen: 'media', label: 'Library' }, // keeps its default label, Library
      { screen: 'settings', label: 'Site settings' }, // relabeled: renders as Site settings
    ],
  },
});
```

```repro
story: nav/worked-navlayout
width: wide
alt: Reproduction of the admin sidebar the example layout resolves to, with a Team section and three unreferenced screens below a divider.
caption: Posts and Pages render outside any section, then the Team section holds Events and Members, then Library, which keeps its default label, and Site settings, which shows its new label. Tags, Editors, and Help follow the divider, because the layout never references them.
```

The next section covers the screens a layout leaves out.

## Hide an engine screen

A screen the layout never references still renders, in engine order, in a trailing group after a divider.
Taking a screen out of the sidebar therefore takes a reference with `hidden: true`.
The figure's trailing group is this rule at work.

To hide a screen, follow this step:

- In `navLayout`, add a reference to the screen with `hidden: true`.

That reference is the screen's one placement, and referencing the screen again anywhere in the tree fails at server start.
Hiding removes the sidebar entry and leaves the route live, so it is never authorization.
Denying the route takes the access map that [Restrict admin access](restrict-admin-access.md) declares.
The next section narrows a section to named roles.

## Narrow a section by role

A section's `roles` list renders its children only for an editor whose role it names, on top of each child's own gate.
It narrows what a role sees and never widens it.

To narrow a section, follow this step:

- In the section, set `roles` to the role names that should see it.

Each name must be one the adapter declares, or the server fails to start.
A section's `roles` hides its links only, and the routes behind them stay live.
Denying those routes is the access map's job, in [Restrict admin access](restrict-admin-access.md).

A site entry carries its own `roles`, independent of any section's.
`ownerOnly: true` on a site entry hides it from every non-owner session.
Like a section's `roles`, it gates nothing on the server, and its route needs a separate gate from [Restrict admin access](restrict-admin-access.md).
An engine reference takes only `label`, `hidden`, and `icon`.
Narrowing one engine screen by role therefore means placing its reference in a section whose `roles` name that role.
The next section sets how a section first appears.

## Set a section's starting state

A section's `collapsed: true` closes it only for a visitor with no collapse cookie.
The first toggle writes the cookie, and from then on the cookie's set wins in both directions.

To start a section closed, follow this step:

- In the section, set `collapsed: true`.

The cookie is `cairn-admin-nav-collapsed`, a comma-separated list of URL-encoded section labels.
Once it exists, its set wins even when empty.
A section added to the layout later therefore renders open for that visitor, whatever its `collapsed` says.
The next two sections add the sidebar's per-request functions.

## Filter the sidebar per request

A `navFilter` function passed to `createCairnAdmin` receives the arranged top-level items and `{ editor, event }` on every request.
It runs after every built-in gate and returns the items to render.
It serves a visibility check that `roles` and `ownerOnly` cannot express, such as one that reads the site's data through `event`.

To add a filter, follow these steps:

1. In the module that calls `createCairnAdmin`, write a function that takes the items and `{ editor, event }` and returns the items to keep.

   On a scaffolded site, that module is `cairn.server.ts` in `src/chassis/`.

2. In the same module, pass that function as `navFilter` in the `createCairnAdmin` config.

The following illustrative filter drops the example's Team section for a session that the site's check rejects.
`canSeeTeam` stands in for that check.

```ts
// src/chassis/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import type { CairnEvent, Editor, ResolvedLayoutNode } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '#theme/cairn.config.js';
import { canSeeTeam } from '#lib/team-access.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

async function navFilter(
  items: ResolvedLayoutNode[],
  { editor, event }: { editor: Editor; event: CairnEvent },
): Promise<ResolvedLayoutNode[]> {
  // The engine has already applied roles and ownerOnly; this check is the site's.
  if (await canSeeTeam(editor, event)) return items;
  return items.filter((item) => !('children' in item && item.label === 'Team'));
}

// Keep the scaffold's other options, such as tidy, beside navFilter.
export const admin = createCairnAdmin({ runtime, navFilter });
```

`createCairnAdmin` forwards the function unchanged, so it behaves as [`ContentRoutesConfig.navFilter`](../reference/sveltekit.md#contentroutesconfig) does.
The filter never receives the trailing group.
A screen there takes `hidden: true` in the layout instead.
The filter hides links only, and a route it hides still needs a server-side gate from the access map in [Restrict admin access](restrict-admin-access.md).
The next section adds count badges to the entries a session sees.

## Add attention badges

An `attention` function passed to `createCairnAdmin` returns count badges for nav entries.
The engine awaits it once per admin shell load, after `navFilter`.

To add badges, follow these steps:

1. In the module that calls `createCairnAdmin`, write an async function that takes `{ editor, event }` and returns an array of `AttentionItem`.
2. In that function, catch any error and return an empty array.

   A throw from the function fails the whole admin shell load, and the catch keeps one failed count from breaking every screen.

3. In the same module, pass the function as `attention` in the `createCairnAdmin` config.

Each item carries an `href` for the nav entry the badge sits on, a `count`, and an optional `label`.
The `label` defaults to `'pending items'`.
The engine drops an item in any of these cases:

- Its count is zero or negative.
- Its `href` matches no nav entry the session can see.
- Its `href` repeats an earlier item's, and the first item wins.

The following illustrative function badges the example's Events entry from a count the site computes.

```ts
// src/chassis/cairn.server.ts
import { composeRuntime } from '@glw907/cairn-cms';
import { createCairnAdmin } from '@glw907/cairn-cms/sveltekit';
import type { AttentionItem, CairnEvent, Editor } from '@glw907/cairn-cms/sveltekit';
import { cairn, siteConfig } from '#theme/cairn.config.js';
import { countPendingEvents } from '#lib/team-events.js';

export const runtime = composeRuntime({ adapter: cairn, siteConfig });

async function attention({
  editor,
  event,
}: {
  editor: Editor;
  event: CairnEvent;
}): Promise<AttentionItem[]> {
  try {
    const count = await countPendingEvents(editor, event);
    return [{ href: '/admin/team/events', count, label: 'pending events' }];
  } catch {
    // A failed count drops the badge instead of failing every admin screen.
    return [];
  }
}

// Keep navFilter and the scaffold's other options beside attention.
export const admin = createCairnAdmin({ runtime, attention });
```

For the badge's accessible label and how the shell renders it, see [the attention seam](../reference/sveltekit.md#the-attention-seam).
The next section checks the result in the running admin.

## Verify the sidebar

The sidebar is arranged when the server starts with no `navLayout:` error and the admin shows the declared order.

To check the sidebar, follow these steps:

1. In the site directory, start the development server.

   The server starts with no `navLayout:` error.

2. Signed in as an owner, open `/admin`.

   Sections and entries appear in declaration order, relabeled screens show their new labels, and unreferenced screens follow the divider.

3. In a private window, sign in as an owner and open `/admin`.

   A section declared `collapsed: true` starts closed.

4. Signed in as an editor whose role a section's `roles` omits, open `/admin`.

   That section does not render.

5. Signed in as an owner, enter a hidden screen's URL directly.

   The screen opens, because hiding removed only its sidebar entry.

6. With `navFilter` configured, sign in as a session the site's check rejects and open `/admin`.

   The filtered section does not render.

7. With `attention` configured, open `/admin`.

   An entry with a positive count carries a badge.

The next section resolves the errors these checks can surface.

## Resolve a sidebar error

A `navLayout:` error at server start means the tree failed validation, and the message names what to fix.
The error has one of these causes:

- An icon outside the allowlist.
- A site entry `href` that collides with a built-in admin view.
- An unknown screen id.
- A role name the adapter does not declare.
- A reference to `nav` with no `editor.nav` on the adapter.
- A blank section `label`, or two sections that share a `label`.
- A section with empty `children`, or a section nested in another section.
- Two site entries that share an `href`.
- A screen referenced more than once, a `hidden` reference included.
- A blank relabel on an engine reference.

An admin that fails to load every screen after you add `attention` means the function threw.
The catch in [Add attention badges](#add-attention-badges) keeps the error from reaching the shell.

## See also

The following pages cover the tasks around the sidebar:

- [Restrict admin access](restrict-admin-access.md) denies a route and decides which sidebar entries the access map shows.
- [Add a custom admin screen](add-a-custom-admin-screen.md) builds the screen a site entry links to.
- [Build the public routes](build-the-public-routes.md) turns on the public menu editor behind the `nav` screen.
- [The navLayout seam](../reference/sveltekit.md#the-navlayout-seam) defines every node type and resolved shape.
- [The attention seam](../reference/sveltekit.md#the-attention-seam) defines `AttentionItem` and the badge rendering.
