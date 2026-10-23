---
page: Arrange the admin sidebar
type: task guide
exemplar: extenders/directus-create-extension
---

# Arrange the admin sidebar

:::reader
**Who reads it.** A Svelte-fluent web developer building an organization's site on cairn, who edits the site's TypeScript adapter module and the server module that calls `createCairnAdmin`. They arrive for different reasons, and the introduction names each reason so a reader learns early whether the page answers it.

**Why they arrive:**
- They built a custom admin screen and want a sidebar link to it. A custom screen renders inside the admin shell with no registration, but the sidebar lists a screen of the site's own only through a site entry in a `navLayout`. :fact[brfitv] :fact[ys1iq1]
- They want the engine's screens grouped into sections an organization's editors recognize, with some relabeled, re-iconed, or taken out of the sidebar. :fact[nvpcmk] :fact[rwefuj]
- They want the sidebar to follow the site's roles: a section one role never sees, or a link only owners see. :fact[qzbfrd] :fact[zyjzeg]
- They need a per-request visibility check the declared tree cannot express, such as one that reads the site's own data, or a count badge on an entry. :fact[rx9v6d] :fact[rshs6k]

**What they already know.** SvelteKit routes under `src/routes/admin/` as a custom screen uses them, the site's adapter module, and SvelteKit's request `event`. The page explains no basic SvelteKit or TypeScript.

**What the page does for them.** The introduction opens on the sidebar itself: one ordered tree the server resolves on every request, from a `navLayout` on the adapter's `editor` group, or, when the adapter declares none, from a flat default of the site's concepts and then the engine's screens, built through the same primitives a declared layout uses. :fact[ys1iq1] :fact[18d9so]
It then says why a layout exists: a site's own screen reaches the sidebar only through a site entry, and an organization's editors see the engine's labels and order until a layout groups and relabels them. It adds that declaring a layout loses no screen, since a screen the layout leaves out still renders in a trailing group after a divider. :fact[brfitv] :fact[yf1rrr]
The contract sentence follows: the steps declare a layout that groups screens into sections, relabels, re-icons, or hides engine screens, links the site's own screens, narrows a section by role, and sets which sections start collapsed, then add the two per-request functions, `navFilter` and `attention`. The page also covers the startup validation that refuses a malformed tree and a check in the running admin. :fact[ld6xam]
It then draws the line the page holds throughout: `hidden`, `ownerOnly`, `roles`, and `navFilter` each hide a link and leave its route open. The access map is the control that both hides an entry and refuses its route, and Restrict admin access owns it. :fact[bvfs3e] :fact[zyjzeg] :fact[qzbfrd] :fact[rx9v6d] :fact[altcjp]
One clause warns the reader who knows `createSectionAction`: its `ownerOnly` option refuses a non-owner, while `ownerOnly` on a site entry only hides the link. :fact[smbsa6] :fact[zyjzeg]

**What it leaves to other pages:**
- Denying a route rather than hiding its link, which belongs to Restrict admin access, named in the introduction.
- Building the screen a site entry links to, which belongs to Add a custom admin screen, named in the introduction.
- The public site's menu, and the menu editor that `editor.nav` turns on as the `nav` screen at `/admin/nav`, which belong to Build the public routes, named in the introduction.
:::

:::constraints
- Name the adapter module and the module that calls `createCairnAdmin` by their roles. Give `src/theme/cairn.config.ts` and `src/chassis/cairn.server.ts` as where a scaffolded site keeps them, and give no path for any other site. :fact[jfuzxf]
- State the hide-not-deny limit of `hidden`, `roles`, `ownerOnly`, and `navFilter` in the section that introduces each, in one sentence that links Restrict admin access, and explain none of the access map's mechanics. :fact[bvfs3e] :fact[qzbfrd] :fact[zyjzeg] :fact[rx9v6d]
- Keep every site-owned check in a snippet a named stub, so a snippet claims nothing about a site's data, and frame each snippet as illustrative.
- Say nothing about the public menu editor beyond the one pointer in Declare the layout.
:::

## Before you begin

*Name what the steps assume and where a scaffolded site's starting tree already stands.*

- The steps assume the following:
- An adapter module whose `editor` group the steps edit, and a server module that calls `createCairnAdmin`. A scaffolded site keeps them at `src/theme/cairn.config.ts` and `src/chassis/cairn.server.ts`. :fact[jfuzxf] :fact[ys1iq1]
- See [Scaffolded site files](scaffolded-site-files.md).
- For each site entry, a route under `src/routes/admin/`, which renders inside the admin shell with no registration. :fact[brfitv]
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- For role narrowing, the role names the adapter declares, or `owner` and `editor` when it declares none. :fact[ld6xam]
- See [Declare the roles](restrict-admin-access.md#declare-the-roles).
- A scaffolded site's adapter already declares a `navLayout`: a `Content` section holding posts, pages, fragments, and media, and a `Site` section holding Tags, the menu editor, Settings relabeled `Site settings`, and Editors. The steps edit that tree. :fact[tycp7k] :fact[a6ez6i]
- An adapter that declares no `navLayout` gets the flat default: the site's concepts, then the engine's screens, with Help in the trailing group. :fact[ys1iq1] :fact[18d9so]

## Declare the layout

*Give the node kinds and their members before any step, walk the reader through declaring a tree, and show one layout beside the sidebar it produces.*

- A `navLayout` is an ordered array of three node kinds, rendered in declaration order. An engine reference places one of cairn's screens, a site entry links one of the site's own routes, and a section groups the other two under a label, one level deep. :fact[nvpcmk] :fact[rwefuj]
- A table, introduced by a sentence that says it names each node kind's members, gives three rows. An engine reference requires `screen`, a declared concept id or one of `media`, `vocabulary`, `nav`, `settings`, `editors`, and `help`, and takes optional `label`, `hidden`, and `icon`. :fact[jsig0m] :fact[rwefuj]
- The table's second row: a site entry requires `label`, `icon`, and `href`, and takes optional `roles` and `ownerOnly`. Its third row: a section requires `label` and `children`, and takes optional `roles` and `collapsed`. :fact[78xri7] :fact[qzbfrd] :fact[zyjzeg] :fact[542r4m]
- An engine reference with no `label` keeps the screen's default label: a concept's own label; Library, Tags, Settings, Editors, and Help for the fixed screens; and, for `nav`, the label the adapter's `editor.nav` declares. :fact[a6ez6i]
- The `nav` screen is the public menu editor, which the adapter's `editor.nav` turns on. A `navLayout` that references `nav` without `editor.nav` throws at server start. :fact[rnwver] :fact[h9hjxc]
- See [Build the public routes](build-the-public-routes.md).
- To declare a layout, follow these steps:
1. In the adapter's `editor` group, declare `navLayout` as an array. On a scaffolded site the array exists, and this step edits it. :fact[ys1iq1] :fact[tycp7k]
2. In that array, add an engine reference for each screen to show outside any section, in the order the sidebar shows them. :fact[rwefuj]
3. In the same array, add a section with a `label` and a `children` array. :fact[78xri7]
4. In the section's `children`, add a site entry with a `label`, an `icon`, and an `href` for each custom screen. :fact[78xri7]
- The `icon` is one of the 27 names that `NavIcon` lists, and an `href` that collides with a built-in admin view throws at startup, naming that view. :fact[seum1o] :fact[bc27j9]
- See [`NavIcon`](../reference/sveltekit.md#navicon).
5. On an engine reference, set `label` to relabel the screen or `icon` to change its glyph. :fact[rwefuj]
- A relabel leaves the screen's icon and route alone, and an `icon` override is checked against the same 27 names. :fact[rwefuj] :fact[seum1o]
- The engine validates the whole tree once, when `createCairnAdmin` builds the admin. A bad icon, a colliding `href`, an unknown screen, or an undeclared role throws a `navLayout:` error then, before the admin serves a request. :fact[ld6xam] :fact[jfuzxf]
- See [Resolve a sidebar error](#resolve-a-sidebar-error).
- The layout that follows is written for a site whose concepts are posts and pages, and the screens it never names land in the trailing group the next section covers. :fact[yf1rrr]
- Code: an illustrative `editor` group inside `defineAdapter`, with the adapter's other groups elided, that matches the figure's sidebar node for node. A short comment on each node names what it renders. :fact[nvpcmk] :fact[rwefuj] :fact[78xri7] :fact[a6ez6i] :fact[1tgtoi] :source[/templates/waymark/src/theme/cairn.config.ts]

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
      { screen: 'media' }, // renders under its default label, Library
      { screen: 'settings', label: 'Site settings' }, // relabeled: renders as Site settings
    ],
  },
});
```

- Figure: a live reproduction of the sidebar this layout resolves to for an owner on a site with no public menu editor. Posts and Pages sit outside any section, the Team section holds Events and Members, and Library and Site settings follow. Below the divider sit Tags, Editors, and Help, which the layout never names. The figure's caption carries what it shows, and its alt text names it a reproduction of the sidebar with a trailing group. :fact[yf1rrr] :fact[a6ez6i] :fact[odqcvh] :source[/src/lib/reproductions/fixtures.ts#fixtureNavLayout]

## Hide an engine screen

*Explain the trailing group the figure shows, then give the one step that takes a screen out of the sidebar and the limit of that step.*

- A screen the layout never references still renders, in a trailing group after a divider, in engine order: the concepts, then Library, Tags, the menu editor, Settings, Editors, and Help. The figure's trailing group is this rule at work. :fact[yf1rrr] :fact[a6ez6i]
- To take a screen out of the sidebar, follow this step:
- In `navLayout`, add a reference to the screen with `hidden: true`. :fact[yf1rrr] :fact[rwefuj]
- The hidden reference is the screen's placement in the tree, so a second reference to the same screen anywhere in the tree throws at server start. :fact[78xri7]
- Hiding removes the sidebar entry and leaves the route live, so a reader who enters the screen's URL still reaches it. Denying the route takes the access map. :fact[bvfs3e] :fact[yf1rrr]
- See [Restrict admin access](restrict-admin-access.md).
- The opposite move doesn't work: a layout cannot show an engine screen the engine's own visibility check hides, so Editors stays out of a non-owner's sidebar wherever the layout places it. :fact[odqcvh]

## Narrow a section by role

*Give the step that limits a section to named roles, the limit of that gate, and the per-entry and per-screen forms.*

- A section's `roles` renders its children only for an editor whose role it names, on top of each child's own gate, so it narrows what a role sees and never widens it. :fact[qzbfrd]
- To narrow a section, follow this step:
- In the section, set `roles` to the role names that see it. :fact[qzbfrd]
- Each name must be one the adapter declares, or `owner` or `editor` when it declares none, or `createCairnAdmin` throws at server start. :fact[ld6xam] :fact[h9hjxc]
- A section's `roles` hides its links and leaves the routes behind them live. Denying those routes is the access map's job. :fact[qzbfrd] :fact[bvfs3e]
- See [Restrict admin access](restrict-admin-access.md).
- An engine reference takes no `roles`. To narrow one engine screen by role, place its reference in a section whose `roles` names that role. :fact[rwefuj] :fact[qzbfrd]
- A screen in a section an editor's role can't see stays out of that editor's trailing group too, and a section whose children all resolve away doesn't render. :fact[gsb1bv]
- A site entry carries its own `roles`, independent of its section's. :fact[qzbfrd]
- `ownerOnly: true` on a site entry hides the link from every non-owner session and, like `roles`, gates nothing on the server, so the route needs its own gate from the access map. :fact[zyjzeg] :fact[bvfs3e]
- See [Restrict admin access](restrict-admin-access.md).

## Set a section's starting state

*Give the step that starts a section closed, and the cookie that overrides it once a visitor toggles a section.*

- A section's `collapsed: true` closes it only for a visitor with no collapse cookie. The first toggle of any section writes the cookie, and from then on the cookie's set wins in both directions. :fact[542r4m] :fact[pgwmi4]
- To start a section closed, follow this step:
- In the section, set `collapsed: true`. :fact[542r4m]
- The cookie is `cairn-admin-nav-collapsed`, a comma-separated list of URL-encoded section labels. Once it exists, its set wins even when empty. :fact[pgwmi4]
- A section added to the layout after a visitor's cookie exists therefore renders open for that visitor, whatever its `collapsed` says. :fact[pgwmi4] :fact[542r4m]

## Filter the sidebar per request

*Give the reader a per-request filter for a visibility check the declared tree can't express, and the limits of that filter.*

- A `navFilter` function passed to `createCairnAdmin` receives the arranged top-level items and `{ editor, event }` on every request, after every built-in gate, and returns the items to render. :fact[rx9v6d] :fact[u844pc]
- It serves a visibility check that `roles` and `ownerOnly` can't express, such as one that reads the site's own data through `event`. :fact[rx9v6d]
- To add a filter, follow these steps:
1. In the module that calls `createCairnAdmin`, write a function that takes the items and `{ editor, event }` and returns the items to keep. :fact[rx9v6d] :fact[jfuzxf]
2. In the same module, pass that function as `navFilter` in the `createCairnAdmin` config. :fact[u844pc]
- Code: an illustrative excerpt of a scaffolded site's `src/chassis/cairn.server.ts` that drops the example's Team section for a session a site-owned check rejects. `canSeeTeam` is a named stub, and the excerpt keeps the scaffold's imports, its `runtime` and `client`, and the `tidy` option on the `createCairnAdmin` call. :fact[rx9v6d] :fact[u844pc] :fact[jfuzxf] :fact[1tgtoi] :source[/templates/waymark/src/chassis/cairn.server.ts]

```ts
// src/chassis/cairn.server.ts (excerpt)
import type { CairnEvent, Editor, ResolvedLayoutNode } from '@glw907/cairn-cms/sveltekit';
import { canSeeTeam } from '#lib/team-access.js'; // the site's own check

async function navFilter(
  items: ResolvedLayoutNode[],
  { editor, event }: { editor: Editor; event: CairnEvent },
): Promise<ResolvedLayoutNode[]> {
  if (await canSeeTeam(editor, event)) return items;
  return items.filter((item) => !('children' in item && item.label === 'Team'));
}

export const admin = createCairnAdmin({ runtime, tidy: { client }, navFilter });
```

- `createCairnAdmin` forwards the function unchanged, so it behaves as the `navFilter` member of `ContentRoutesConfig`. :fact[u844pc]
- See [`createCairnAdmin`](../reference/sveltekit.md#createcairnadmin).
- The filter never receives the trailing group. To take a screen out of that group, give it a `hidden: true` reference in the layout. :fact[rx9v6d] :fact[yf1rrr]
- The filter hides links only, so a route it hides still needs a server-side gate from the access map. :fact[rx9v6d] :fact[bvfs3e]
- See [Restrict admin access](restrict-admin-access.md).

## Add attention badges

*Walk the reader through a badge function that can't take down the admin, and say which badges the engine drops.*

- An `attention` function passed to `createCairnAdmin` returns count badges for sidebar entries. The engine awaits it once per admin shell load, after `navFilter`. :fact[rshs6k] :fact[u844pc]
- To add badges, follow these steps:
1. In the module that calls `createCairnAdmin`, write a function that takes `{ editor, event }` and returns an array of `AttentionItem`. :fact[rshs6k] :fact[1tgtoi]
2. In that function, catch any error and return an empty array. :fact[rshs6k] :fact[m9fx01]
- A throw from the function fails the whole admin shell load, so the catch keeps one failed count from breaking every admin page. :fact[rshs6k] :fact[m9fx01]
3. In the same module, pass the function as `attention` in the `createCairnAdmin` config. :fact[u844pc]
- Each item carries an `href` for the entry the badge sits on, a `count`, and an optional `label` that defaults to `pending items`. :fact[rshs6k]
- The engine drops an item in each of these cases: :fact[rshs6k]
- Its `count` is zero or negative. :fact[rshs6k]
- Its `href` matches no sidebar entry the session can see. :fact[rshs6k]
- Its `href` repeats an earlier item's, and the first item wins. :fact[rshs6k]
- Code: an illustrative excerpt of `src/chassis/cairn.server.ts` that badges the example's Events entry from a count a named stub computes, with the `try` and `catch` from step 2, keeping the scaffold's imports and options as the filter excerpt does. :fact[rshs6k] :fact[u844pc] :fact[1tgtoi] :source[/templates/waymark/src/chassis/cairn.server.ts]

```ts
// src/chassis/cairn.server.ts (excerpt)
import type { AttentionItem, CairnEvent, Editor } from '@glw907/cairn-cms/sveltekit';
import { countPendingEvents } from '#lib/team-events.js'; // the site's own count

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
    // A failed count drops the badge instead of failing every admin page.
    return [];
  }
}

export const admin = createCairnAdmin({ runtime, tidy: { client }, attention });
```

- See [The attention seam](../reference/sveltekit.md#the-attention-seam).

## Verify the sidebar

*Have the reader check each part of the arrangement in the running admin, the hidden screen's live route included.*

- To check the sidebar, run these checks in order:
1. In the site directory, start the development server and open `/admin`. The admin loads with no `navLayout:` error. :fact[ld6xam] :fact[jfuzxf]
2. Signed in as an owner, look at the sidebar. Sections and entries appear in declaration order, relabeled screens show their new labels, and unreferenced screens follow the divider. :fact[rwefuj] :fact[yf1rrr]
3. In a private window, sign in as an owner and open `/admin`. A section declared `collapsed: true` starts closed. :fact[542r4m] :fact[pgwmi4]
4. Signed in as an editor whose role a section's `roles` omits, open `/admin`. That section doesn't render. :fact[qzbfrd]
5. Signed in as an owner, enter a hidden screen's URL directly. The screen opens, because hiding removed only its sidebar entry. :fact[bvfs3e] :fact[odqcvh]
6. With `navFilter` configured, sign in as a session the site's check rejects and open `/admin`. The filtered section doesn't render. :fact[rx9v6d]
7. With `attention` configured, open `/admin`. An entry with a positive count carries a badge. :fact[rshs6k]

## Resolve a sidebar error

*Map the two failures a reader can hit, a refused tree and a failed shell load, to their causes and fixes.*

:::row
**Symptom.** The server module that calls `createCairnAdmin` fails to load, with an error that starts `navLayout:`.
**Cause.** The declared tree failed validation, and the message names the node at fault. :fact[ld6xam] :fact[h9hjxc]
**Fix.** Correct the node the message names, using the triggers that follow, then restart the server. :fact[h9hjxc]
:::

- The error has one of these triggers:
- An icon outside the `NavIcon` allowlist, on a site entry or as an engine reference's override. :fact[seum1o] :fact[h9hjxc]
- A site entry `href` that collides with a built-in admin view. :fact[bc27j9] :fact[h9hjxc]
- Two site entries that share an `href`. :fact[78xri7] :fact[h9hjxc]
- An unknown screen id, or a screen referenced more than once, a `hidden` reference included. :fact[78xri7] :fact[h9hjxc]
- A reference to `nav` with no `editor.nav` on the adapter. :fact[rnwver] :fact[h9hjxc]
- A blank relabel on an engine reference. :fact[78xri7] :fact[h9hjxc]
- A blank section `label`, or two sections that share a `label`. :fact[78xri7] :fact[h9hjxc]
- A section with empty `children`, or a section nested in another section. :fact[78xri7] :fact[h9hjxc]
- A role name the adapter doesn't declare, on a section or a site entry. :fact[ld6xam] :fact[h9hjxc]

:::row
**Symptom.** Every admin page fails to load after you add a `navFilter` or an `attention` function.
**Cause.** The function threw or rejected, and the shell load runs both functions with no catch of its own. :fact[m9fx01] :fact[rshs6k]
**Fix.** Catch the error inside the function and return a fallback, as step 2 of Add attention badges does. :fact[m9fx01]
:::

- See [Add attention badges](#add-attention-badges).

## See also

*Point the reader to the pages around the sidebar.*

- The following pages cover the tasks and reference around the sidebar:
- See [Restrict admin access](restrict-admin-access.md).
- See [Add a custom admin screen](add-a-custom-admin-screen.md).
- See [Build the public routes](build-the-public-routes.md).
- See [The navLayout seam](../reference/sveltekit.md#the-navlayout-seam).
- See [The attention seam](../reference/sveltekit.md#the-attention-seam).
