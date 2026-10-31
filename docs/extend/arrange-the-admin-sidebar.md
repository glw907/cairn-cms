# Arrange the admin sidebar

The admin sidebar is one ordered tree that the admin shell's SvelteKit layout load resolves for every `/admin` page except the sign-in pages. The tree comes from a `navLayout` on the adapter's `editor` group. When the adapter declares none, the engine builds a flat default of the site's concepts followed by the engine's screens, with **Help** left to a trailing group. Because the engine resolves that default through the same functions as a declared layout, the two cannot disagree on what a role sees.

A custom admin screen renders inside the admin shell with no registration, yet the sidebar lists it only through a site entry in a `navLayout`. Until a layout groups and relabels them, an organization's editors see the engine's screens with their default labels, in engine order. Declaring a layout loses no screen. A screen the layout leaves out still renders in a trailing group after a divider.

A developer who arranges the sidebar usually wants one of the following:

- A sidebar link to a custom screen they built.
- The engine's screens grouped into sections that an organization's editors recognize, with some relabeled, re-iconed, or taken out of the sidebar.
- A sidebar that differs by role, such as a section one role never sees or a link only owners see.
- A per-request visibility check that the declared tree cannot express, such as one that reads the site's data.
- A count badge on a sidebar entry.

The steps declare a layout that groups screens into sections, relabels, re-icons, or hides engine screens, and links custom screens. They also narrow a section by role and set which sections start collapsed, then add the two per-request functions, `navFilter` and `attention`. The page also covers how startup validation refuses a malformed tree and how to check the sidebar in the running admin. It assumes familiarity with the SvelteKit routes under `src/routes/admin/`, SvelteKit's request `event`, and the site's adapter module.

`hidden`, `ownerOnly`, `roles`, and `navFilter` each hide a link and leave its route open. The access map hides an entry and refuses its route. The engine refuses the routes to its screens, and a site's route refuses once it calls `requireAccess`. With `ownerOnly` set, an action built with `createSectionAction` refuses a non-owner. On a site entry, `ownerOnly` only hides the link.

To deny a route rather than hide its link, see [Restrict admin access](restrict-admin-access.md). To build the screen a site entry links to, see [Add a custom admin screen](add-a-custom-admin-screen.md). For the public site's menu and the menu editor that `editor.nav` turns on as the `nav` screen at `/admin/nav`, see [Build the public routes](build-the-public-routes.md).

## Before you begin

The steps assume the following:

- For every step, an adapter module and a server module that calls `createCairnAdmin`. A scaffolded site keeps the server module at `src/chassis/cairn.server.ts`, and that module imports the adapter `cairn` from `#theme/cairn.config.js`. [Scaffolded site files](scaffolded-site-files.md) describes both.
- For each site entry, a route under `src/routes/admin/`. The route renders inside the admin shell with no registration. [Add a custom admin screen](add-a-custom-admin-screen.md) builds one.
- For role narrowing, the role names the adapter declares, or `owner` and `editor` when it declares none. [Declare the roles](restrict-admin-access.md#declare-the-roles) shows the declaration.

A scaffolded site's adapter already declares a `navLayout`. Its `Content` section holds posts, pages, fragments, and media. Its `Site` section holds **Tags**, the menu editor, **Settings** relabeled `Site settings`, and **Editors**. An adapter with no `navLayout` gets the engine's flat default.

## Declare the layout

A `navLayout` is an ordered array of three node kinds, rendered in declaration order. An engine reference places one of the engine's screens, and a site entry links one of the site's routes. A section groups the other two kinds under a label, one level deep.

The following table lists each node kind's members.

| Node kind | Required | Optional |
| --- | --- | --- |
| Engine reference | `screen`, a declared concept id or one of `media`, `vocabulary`, `nav`, `settings`, `editors`, and `help` | `label`, `hidden`, `icon` |
| Site entry | `label`, `icon`, `href` | `roles`, `ownerOnly` |
| Section | `label`, `children` | `roles`, `collapsed` |

An engine reference with no `label` keeps the screen's default label. A concept shows its label, and the fixed screens show **Library**, **Tags**, **Settings**, **Editors**, and **Help**. For `nav`, the default is the label the adapter's `editor.nav` declares.

The `nav` screen is the public menu editor, and the adapter's `editor.nav` turns it on. A `navLayout` that references `nav` without `editor.nav` throws at server start. [Build the public routes](build-the-public-routes.md) covers the menu editor.

To declare a layout, follow these steps:

1. In the adapter's `editor` group, declare `navLayout` as an array.

   On a scaffolded site the array exists, and this step edits it.

2. In that array, add an engine reference for each screen to show outside any section, in the order the sidebar lists them.
3. In the same array, add a section with a `label` and a `children` array.
4. In the section's `children`, add a site entry with a `label`, an `icon`, and an `href` for each custom screen.

   The `icon` is one of the 27 names that [`NavIcon`](../reference/sveltekit.md#navicon) lists. An `href` that collides with a built-in admin view throws at server start, and the error names that view.

5. On an engine reference, set `label` to relabel the screen or `icon` to change its glyph.

   A relabel leaves the screen's icon and route alone. An `icon` override is checked against the same 27 names.

The engine validates the whole tree once, when `createCairnAdmin` builds the admin. At that point, a bad icon, a colliding `href`, an unknown screen, or an undeclared role throws a `navLayout:` error before the admin serves a request. [Resolve a sidebar error](#resolve-a-sidebar-error) lists every trigger.

The following illustrative layout is for a site whose concepts are posts and pages. Screens it never names render in the trailing group that [Hide an engine screen](#hide-an-engine-screen) covers.

<!-- snippet-check-skip: elides the adapter's required content, backend, email, and rendering groups -->
```ts
// src/theme/cairn.config.ts
import { defineAdapter } from '@glw907/cairn-cms';

export const cairn = defineAdapter({
  // content, backend, email, and rendering stay as the site declares them
  editor: {
    navLayout: [
      { screen: 'posts' }, // renders as Posts, outside any section
      { screen: 'pages', label: 'Guides' }, // relabeled: renders as Guides
      {
        label: 'Team', // renders as a section header
        children: [
          { label: 'Events', icon: 'calendar', href: '/admin/team/events' }, // a site entry
          { label: 'Members', icon: 'users', href: '/admin/team/members' }, // a site entry
        ],
      },
      { screen: 'media' }, // renders under its default label, Library
      { screen: 'settings', label: 'Site settings' }, // relabeled: renders as Site settings
    ],
  },
});
```

```repro
story: nav/worked-navlayout
width: wide
alt: Reproduction of the admin sidebar the example layout resolves to, with a Team section and a trailing group below a divider.
caption: For an owner on a site with no public menu editor, Posts and Guides (the Pages concept, relabeled) render outside any section, the Team section holds Events and Members, and Library and Site settings follow. Tags, Editors, and Help sit below the divider, because the layout never names them.
```

## Hide an engine screen

A screen the layout never references still renders after a divider, in a trailing group. The group follows engine order, which puts the concepts first and then **Library**, **Tags**, the menu editor, **Settings**, **Editors**, and **Help**. The trailing group in the example layout's figure shows this rule.

To take a screen out of the sidebar, follow this step:

- In `navLayout`, add a reference to the screen with `hidden: true`.

The hidden reference counts as the screen's placement in the tree. A second reference to the same screen anywhere in the tree throws at server start.

Hiding removes the sidebar entry, and entering the screen's URL still reaches the screen. To deny the route, use the access map that [Restrict admin access](restrict-admin-access.md) declares.

A layout cannot show an engine screen that the engine's visibility check hides. **Editors** stays out of a non-owner's sidebar wherever the layout places it.

## Narrow a section by role

A section with `roles` renders its children only for an editor whose role the list names. Each child's gate still applies, and the list narrows what a role sees without ever widening it.

To narrow a section, follow this step:

- In the section, set `roles` to the role names that see it.

Each name must be one the adapter declares, or `owner` or `editor` when it declares none. Any other name makes `createCairnAdmin` throw at server start.

A section's `roles` hides its links and leaves the routes behind them live. [Restrict admin access](restrict-admin-access.md) covers denying those routes with the access map.

An engine reference takes no `roles`. To narrow one engine screen by role, place its reference in a section whose `roles` names that role. A screen in a section that an editor's role cannot see also stays out of that editor's trailing group. A section whose children all resolve away does not render.

A site entry takes `roles` too, independent of its section's. `ownerOnly: true` on a site entry hides the link from every non-owner session. Like `roles`, it gates nothing on the server. The route behind the link needs a gate from the access map in [Restrict admin access](restrict-admin-access.md).

## Set a section's starting state

A section's `collapsed: true` closes it only for a visitor with no collapse cookie. The first toggle of any section writes the cookie. From then on, the cookie's list overrides `collapsed` in both directions.

To start a section closed, follow this step:

- In the section, set `collapsed: true`.

The cookie is `cairn-admin-nav-collapsed`, a comma-separated list of URL-encoded section labels. An empty list still overrides `collapsed`. A section added to the layout after a visitor's cookie exists therefore renders open for that visitor, whatever its `collapsed` says.

## Filter the sidebar per request

On every request, after every built-in gate, a `navFilter` function passed to `createCairnAdmin` receives the arranged top-level items and `{ editor, event }`. It returns the items to render. It serves a visibility check that `roles` and `ownerOnly` cannot express, such as one that reads the site's data through `event`.

To add a filter, follow these steps:

1. In the module that calls `createCairnAdmin`, write a function that receives the items and the context and returns the items to keep.
2. In the same module, pass that function as `navFilter` in the `createCairnAdmin` config.

The following illustrative excerpt of a scaffolded site's `src/chassis/cairn.server.ts` drops the example's Team section for a session that a site check rejects. `canSeeTeam` is a stub for that check. The scaffold's imports, its `runtime`, and its `client` stay as the scaffold writes them.

<!-- snippet-check-skip: an excerpt that keeps the scaffold's imports, runtime, and tidy client out of view -->
```ts
// src/chassis/cairn.server.ts (excerpt)
import type { CairnEvent, Editor, ResolvedLayoutNode } from '@glw907/cairn-cms/sveltekit';
import { canSeeTeam } from '#lib/team-access.js'; // a site-defined check

async function navFilter(
  items: ResolvedLayoutNode[],
  { editor, event }: { editor: Editor; event: CairnEvent },
): Promise<ResolvedLayoutNode[]> {
  if (await canSeeTeam(editor, event)) return items;
  return items.filter((item) => !('children' in item && item.label === 'Team'));
}

export const admin = createCairnAdmin({ runtime, tidy: { client }, navFilter });
```

`createCairnAdmin` forwards the function unchanged, so it behaves as the `navFilter` member of `ContentRoutesConfig`. For the full config, see [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin).

The filter never receives the trailing group. To take a screen out of that group, give it a `hidden: true` reference in the layout. The filter hides links only, and a route whose link it drops still needs a server-side gate from the access map in [Restrict admin access](restrict-admin-access.md).

## Add attention badges

An `attention` function passed to `createCairnAdmin` returns count badges for sidebar entries. The engine awaits it once per admin shell load, after `navFilter`.

To add badges, follow these steps:

1. In the module that calls `createCairnAdmin`, write a function that takes `{ editor, event }` and returns an array of `AttentionItem`.
2. In the same module, pass the function as `attention` in the `createCairnAdmin` config.

If the function throws or rejects, the shell renders no badges for that request, loads normally, and logs [`admin.attention_failed`](../reference/log-events.md) with the error.

Each item carries an `href` for the entry the badge sits on, a `count`, and an optional `label` that defaults to `pending items`. The engine drops an item in each of these cases:

- Its `count` is zero or negative.
- Its `href` matches no sidebar entry the session can see.
- Its `href` repeats an earlier item's `href`.

Of items that share an `href`, the first keeps the badge.

The following illustrative excerpt badges the example's Events entry from a count that the stub `countPendingEvents` computes. Like the filter excerpt, it leaves the scaffold's imports and options out of view.

<!-- snippet-check-skip: an excerpt that keeps the scaffold's imports, runtime, and tidy client out of view -->
```ts
// src/chassis/cairn.server.ts (excerpt)
import type { AttentionItem, CairnEvent, Editor } from '@glw907/cairn-cms/sveltekit';
import { countPendingEvents } from '#lib/team-events.js'; // a site-defined count

async function attention({
  editor,
  event,
}: {
  editor: Editor;
  event: CairnEvent;
}): Promise<AttentionItem[]> {
  const count = await countPendingEvents(editor, event);
  return [{ href: '/admin/team/events', count, label: 'pending events' }];
}

export const admin = createCairnAdmin({ runtime, tidy: { client }, attention });
```

For the badge's rendering, see [The attention seam](../reference/sveltekit.md#the-attention-seam).

## Verify the sidebar

The sidebar is arranged when the admin loads with no `navLayout:` error and shows the declared order to each role.

To check the sidebar, run these checks in order:

1. In the site directory, start the development server.
2. In a browser, open `/admin`.

   The admin loads with no `navLayout:` error.

3. Signed in as an owner, look at the sidebar.

   Sections and entries appear in declaration order, relabeled screens show their new labels, and unreferenced screens follow the divider.

4. In a private window, sign in to `/admin` as an owner.

   A section declared `collapsed: true` starts closed.

5. Signed in as an editor whose role a section's `roles` omits, open `/admin`.

   That section does not render.

6. Signed in as an owner, enter a hidden screen's URL directly.

   The screen opens. Hiding removed only its sidebar entry.

7. With `navFilter` configured, sign in to `/admin` as an editor whose session the site's check rejects.

   The filtered section does not render.

8. With `attention` configured, open `/admin`.

   An entry with a positive count carries a badge.

## Resolve a sidebar error

A sidebar change can fail in two ways: a tree that validation refuses at server start, or a per-request function that fails the shell load.

When the server module that calls `createCairnAdmin` fails to load with an error that starts `navLayout:`, the declared tree failed validation. The error has one of the following triggers:

- An icon outside the `NavIcon` allowlist, on a site entry or as an engine reference's override.
- A site entry `href` that collides with a built-in admin view.
- Two site entries that share an `href`.
- An unknown screen id, or a screen referenced more than once, including in a `hidden` reference.
- A reference to `nav` with no `editor.nav` on the adapter.
- A blank relabel on an engine reference.
- A blank section `label`, or two sections that share a `label`.
- A section with empty `children`, or a section nested in another section.
- A role name the adapter does not declare, on a section or a site entry.

The message names the value at fault, except for a blank section label. To clear the error, follow these steps:

1. In the adapter's `navLayout`, correct the value the message names.
2. Restart the server.

When every admin page fails to load after you add a `navFilter` function, the function threw or rejected. The shell load does not catch an error from it, so catch the error inside the function and return the items unchanged. A throw from `attention` does not fail the page: the badges disappear and the log carries `admin.attention_failed`.

For a failure outside the sidebar, see [Debug your site](debug-your-site.md).

## See also

The following pages cover the tasks and reference around the sidebar:

- [Restrict admin access](restrict-admin-access.md) denies a route that the sidebar only hides.
- [Add a custom admin screen](add-a-custom-admin-screen.md) builds the screen a site entry links to.
- [Build the public routes](build-the-public-routes.md) covers the public menu editor behind the `nav` screen.
- [The `navLayout` seam](../reference/sveltekit.md#the-navlayout-seam) defines each node type and resolved shape.
- [The attention seam](../reference/sveltekit.md#the-attention-seam) defines `AttentionItem`.
